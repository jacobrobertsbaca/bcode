import { create } from "zustand";
import { Room } from "../types/Room";
import { RealtimeChannel } from "@supabase/realtime-js";
import createClient from "../provider/client";
import debug from "debug";
import { ConnectionStatus } from "../types/Connection";
import { LiveUser, useUserState } from "./user";

interface RoomMethods {
  join: (room: Room) => Promise<void>;
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

function emptyUsersForRoom(room: Room): RoomStateConnected["users"] {
  const users: RoomStateConnected["users"] = {};
  room.groups.forEach(g => users[g.no] = []);
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

  leave() {
    const self = get();
    if (self.status === ConnectionStatus.Disconnected || self.status === ConnectionStatus.DisconnectedError)
      throw new Error("You must be connected to a room to leave.");
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
