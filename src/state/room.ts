import { create } from "zustand";
import { Room } from "../types/Room";
import { RealtimeChannel } from "@supabase/realtime-js";
import createClient from "../provider/client";
import debug from "debug";
import { ConnectionStatus } from "../types/Connection";
import { LiveUser, useUserState } from "./user";
import { enqueueSnackbar } from "notistack";
import { useEffect } from "react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

interface RoomMethods {
  join: (room: Room, router: AppRouterInstance) => Promise<void>;
  track: () => Promise<void>;
  update: () => Promise<void>;
  leave: () => void;
}

interface RoomStateDisconnected {
  users: null;
  channel: null;
  status: ConnectionStatus;
}

interface RoomStateConnected {
  users: Record<number, LiveUser[]>;
  channel: RealtimeChannel;
  status: ConnectionStatus;
}

export type RoomState = RoomMethods & (RoomStateConnected | RoomStateDisconnected);

enum ChannelEvents {
  Update = "update",
}

const logger = debug("[ROOM]");
logger.enabled = true;

export const useRoomState = create<RoomState>((set, get) => ({
  users: null,
  channel: null,
  status: ConnectionStatus.Disconnected,

  async join(room: Room, router: AppRouterInstance) {
    const status = get().status;
    if (status === ConnectionStatus.Connecting) throw new Error("Cannot join while connecting to a room.");
    if (status === ConnectionStatus.Connected) throw new Error("Already connected to a room.");

    logger(`Connecting to room ${room.code}...`);
    set({ status: ConnectionStatus.Connecting });

    const supabase = createClient();
    const channel = supabase.channel(room.code, {
      config: {
        presence: {
          key: useUserState.getState().user.id,
        },
        broadcast: {
          ack: true,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        /* When presence changes, we need to rebuild all users across all rooms. */
        const users: RoomStateConnected["users"] = {};
        const state = channel.presenceState<LiveUser>();
        for (const presences of Object.values(state)) {
          if (presences.length === 0) continue;
          const user = presences[0];
          if (!(user.group in users)) users[user.group] = [];
          users[user.group].push(user);
        }

        set({ users });
      })
      .on("broadcast", { event: ChannelEvents.Update }, () => {
        logger("Notified of update to current room.");
        router.refresh();
      })
      .subscribe((status, err) => {
        switch (status) {
          case "SUBSCRIBED":
            /* Until we have synced, there are no users in any of the rooms */
            const self = get();
            if (self.status !== ConnectionStatus.Connecting) return;
            set({ users: {}, channel, status: ConnectionStatus.Connected });
            logger(`Connection to room ${room.code} successful.`);
            break;

          case "CHANNEL_ERROR":
          case "TIMED_OUT":
            if (err) console.log(err);
            logger(`Error ${status} occurred in channel for room ${room.code}. Disconnecting.`);
            set({
              users: null,
              channel: null,
              status: ConnectionStatus.DisconnectedError,
            });
            break;
        }
      });
  },

  async update() {
    const self = get();
    if (!self.channel) return;
    logger("Notifying participants of room update");
    const response = await self.channel.send({
      type: "broadcast",
      event: ChannelEvents.Update,
    });
    if (response !== "ok") throw new Error("Failed to notify participants");
  },

  async track() {
    const self = get();
    if (!self.channel) return;
    const user = useUserState.getState().user;
    await self.channel.track(user);
  },

  leave() {
    const self = get();
    if (self.status === ConnectionStatus.Disconnected || self.status === ConnectionStatus.DisconnectedError) return;
    if (self.status === ConnectionStatus.Connecting)
      logger("Leaving room before connection could be established. Disconnecting from channel.");
    else logger("Leaving room and disconnecting from channel.");

    const channel = self.channel;
    set({
      users: null,
      channel: null,
      status: ConnectionStatus.Disconnected,
    });
    channel?.unsubscribe();
  },
}));

export function useRoom(room: Room, router: AppRouterInstance, host: boolean) {
  const userState = useUserState();
  const roomState = useRoomState();

  /* Connect to room on mount, disconnect on unmount */
  useEffect(() => {
    roomState.join(room, router);
    return () => roomState.leave();
  }, []);

  /* If we are not the host, notify others of user changes */
  useEffect(() => {
    if (!host) roomState.track();
  }, [userState.user]);

  /* If room changes and guest is no longer in the room, leave the room */
  useEffect(() => {
    if (host) return;
    if (userState.user.group > 0 && !room.groups.some((g) => g.no === userState.user.group)) {
      userState.updateUser({ group: 0 });
      enqueueSnackbar("The host closed your group.");
    }
  }, [room, userState]);
}
