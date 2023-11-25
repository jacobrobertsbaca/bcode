import { create } from "zustand";
import { Room } from "../types/Room";
import { RealtimeChannel } from "@supabase/realtime-js";
import createClient from "../provider/client";
import debug from "debug";
import { ConnectionStatus } from "../types/Connection";
import { LiveUser, useUserState } from "./user";
import { enqueueSnackbar } from "notistack";
import { useEffect } from "react";
import { random } from "lodash";

interface RoomMethods {
  join: (room: Room) => Promise<void>;
  track: () => Promise<void>;
  update: (room: Room | null) => Promise<void>;
  leave: () => void;
}

interface RoomStateDisconnected {
  room: null;
  users: null;
  channel: null;
  status: ConnectionStatus;
}

interface RoomStateConnected {
  room: Room;
  users: Record<number, LiveUser[]>;
  channel: RealtimeChannel;
  status: ConnectionStatus;
}

type RoomState = RoomMethods & (RoomStateConnected | RoomStateDisconnected);

enum ChannelEvents {
  Update = "update",
}

function emptyUsersForRoom(room: Room): RoomStateConnected["users"] {
  const users: RoomStateConnected["users"] = {};
  room.groups.forEach((g) => (users[g.no] = []));
  users[0] = [];    // Always include bucket for "waiting group"
  return users;
}

const logger = debug("[ROOM]");
logger.enabled = true;

export const useRoomState = create<RoomState>((set, get) => ({
  room: null,
  users: null,
  channel: null,
  status: ConnectionStatus.Disconnected,

  async join(room: Room) {
    if (get().room) throw new Error(`Already connected to room ${get().room?.code}`);
    logger(`Connecting to room ${room.code}...`);
    set({ status: ConnectionStatus.Connecting });
    const supabase = createClient();
    const channel = supabase.channel(room.code, {
      config: {
        presence: {
          key: useUserState.getState().user.id,
        },
        broadcast: {
          self: true,
          ack: true,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        /** When presence changes, we need to rebuild all users across all rooms. */
        const self = get();
        if (!self.room) return;
        const users = emptyUsersForRoom(self.room);
        const state = channel.presenceState<LiveUser>();
        for (const presences of Object.values(state)) {
          if (presences.length === 0) continue;
          const user = presences[0];
          if (!(user.group in users)) continue; // A user in a room we're not aware of
          users[user.group].push(user);
        }

        set({ users });
      })
      .on("broadcast", { event: ChannelEvents.Update }, ({ payload }) => {
        const self = get();
        if (!self.room) return;
        logger("Received update to current room:", payload);
        const room = payload.room as Room;

        // The host has closed the room. Must disconnect from the room.
        if (!room) {
          self.leave();
          return;
        }

        // The host has modified the room. Check if we are currently in a group
        // that got removed, and move them to the waiting room
        const userState = useUserState.getState();
        if (userState.user.group !== 0 && !room.groups.find((g) => g.no === userState.user.group)) {
          userState.updateUser({ group: 0 });
          enqueueSnackbar("The host closed your group.");
        }
        set({ room });
      })
      .subscribe((status, err) => {
        switch (status) {
          case "SUBSCRIBED":
            /* Until we have synced, there are no users in any of the rooms */
            const self = get();
            if (self.status !== ConnectionStatus.Connecting) return;
            const users = emptyUsersForRoom(room);
            set({ room, users, channel, status: ConnectionStatus.Connected });
            logger(`Connection to room ${room.code} successful.`);
            break;

          case "CHANNEL_ERROR":
          case "TIMED_OUT":
            if (err) console.log(err);
            logger(`Error ${status} occurred in channel for room ${room.code}. Disconnecting.`);
            set({
              room: null,
              users: null,
              channel: null,
              status: ConnectionStatus.DisconnectedError,
            });
            break;
        }
      });
  },

  async update(room: Room | null) {
    const self = get();
    if (!self.room) return;
    logger("Sending room update to participants: ", room);
    const response = await self.channel!.send({
      type: "broadcast",
      event: ChannelEvents.Update,
      payload: { room },
    });
    if (response !== "ok") throw new Error("Failed to notify participants");
  },

  async track() {
    const self = get();
    if (self.status !== ConnectionStatus.Connected) return;
    const user = useUserState.getState().user;
    await self.channel!.track(user);
  },

  leave() {
    const self = get();
    if (self.status === ConnectionStatus.Disconnected || self.status === ConnectionStatus.DisconnectedError) return;
    if (!self.room) logger("Leaving room before connection could be established. Disconnecting from channel.");
    else logger(`Leaving room ${self.room?.code} and disconnecting from channel.`);
    const channel = self.channel;
    set({
      room: null,
      users: null,
      channel: null,
      status: ConnectionStatus.Disconnected,
    });
    channel?.unsubscribe();
  },
}));

const guestColors = [
  { color: "#30bced", light: "#30bced33" },
  { color: "#6eeb83", light: "#6eeb8333" },
  { color: "#ffbc42", light: "#ffbc4233" },
  { color: "#ecd444", light: "#ecd44433" },
  { color: "#ee6352", light: "#ee635233" },
  { color: "#9ac2c9", light: "#9ac2c933" },
  { color: "#8acb88", light: "#8acb8833" },
  { color: "#1be7ff", light: "#1be7ff33" },
];

export function useRoom(room: Room, host: boolean) {
  const user = useUserState((state) => state.user);
  const updateUser = useUserState((state) => state.updateUser);
  const join = useRoomState((state) => state.join);
  const track = useRoomState((state) => state.track);
  const leave = useRoomState((state) => state.leave);
  const localRoom = useRoomState((state) => state.room);

  /* Connect to room on mount, disconnect on unmount */
  useEffect(() => {
    /* Update this user depending on whether they are the host or not */
    if (host) {
      updateUser({ isHost: true, name: "Host", color: "#000000", lightColor: "#00000033" });
    } else {
      const guestColor = guestColors[random(0, guestColors.length - 1)];
      updateUser({ isHost: false, color: guestColor.color, lightColor: guestColor.light });
    }

    join(room);
    return () => leave();
  }, []);

  /* If we are not the host, notify others of user changes */
  useEffect(() => {
    if (!host) track();
  }, [user]);

  return localRoom;
}
