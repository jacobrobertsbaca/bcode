import { create } from "zustand";
import { Room, RoomGroup } from "./types/Room";
import { RealtimeChannel } from "@supabase/realtime-js";
import createClient from "./provider/client";
import { v4 } from "uuid";
import { random } from "lodash";

/**
 * Keeps track of details of a connected user, such as their name and color.
 */
export interface LiveUser {
  /**
   * Unique identifier for this user.
   */
  id: string;

  /**
   * User inputted name of this user.
   */
  name: string;

  /**
   * The hexadecimal color of this user.
   */
  color: string;

  /**
   * The hexadecimal light color of this user.
   */
  lightColor: string;

  /**
   * The group that this user belongs to.
   */
  group: number;
}

/**
 * This is a unique identifier representing the current client.
 * It is unique on a per-session basis, e.g. opening a new browser tab will yield a different id.
 */
const clientId = v4();
export { clientId };

export const useUserState = create<LiveUser>(() => {
  const colors = [
    { color: '#30bced', light: '#30bced33' },
    { color: '#6eeb83', light: '#6eeb8333' },
    { color: '#ffbc42', light: '#ffbc4233' },
    { color: '#ecd444', light: '#ecd44433' },
    { color: '#ee6352', light: '#ee635233' },
    { color: '#9ac2c9', light: '#9ac2c933' },
    { color: '#8acb88', light: '#8acb8833' },
    { color: '#1be7ff', light: '#1be7ff33' }
  ];

  const color = colors[random(0, colors.length - 1)];

  return {
    id: clientId,
    name: "Host",
    color: color.color,
    lightColor: color.light,
    group: 0
  };
});

interface RoomState {
  view: "name" | "code";
  name: string;
  setName: (name: string) => void;
  join: () => void;
}

export const useRoomState = create<RoomState>((set) => ({
  name: "",
  view: "name",
  setName: (name: string) => set({ name }),
  join: () => set({ view: "code" }),
}));

interface HostMethods {
  join: (room: Room) => Promise<void>;
  leave: () => Promise<void>;
}

interface HostStateDisconnected {
  room: null;
  users: null;
  channel: null;
  status: ConnectionStatus;
}

interface HostStateConnected {
  room: Room;
  users: Record<number, LiveUser[]>;
  channel: RealtimeChannel;
  status: ConnectionStatus;
}

type HostState = HostMethods & (HostStateConnected | HostStateDisconnected);

enum ConnectionStatus {
  /**
   * Currently in the process of connecting to the room.
   * Loading UI can be displayed.
   */
  Connecting = "connecting",

  /**
   * Successfully connected to the room. All room related state should be up to date.
   */
  Connected = "connected",

  /**
   * Successfully disconnected from the room.
   */
  Disconnected = "disconnected",

  /**
   * Disconnected from the room due to an error, time out, or network issue.
   * Error UI can be displayed.
   */
  DisconnectedError = "disconnected-error",
}

function emptyUsersForRoom(room: Room): HostStateConnected["users"] {
  const users: HostStateConnected["users"] = {};
  room.groups.forEach(g => users[g.no] = []);
  return users;
}

export const useHostState = create<HostState>((set, get) => ({
  room: null,
  users: null,
  channel: null,
  status: ConnectionStatus.Disconnected,

  async join(room: Room) {
    if (get().room) throw new Error(`Already connected to room ${get().room?.code}`);
    set({ status: ConnectionStatus.Connecting });
    const supabase = createClient();
    const channel = supabase.channel(room.code, {
      config: {
        presence: {
          key: clientId,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        /** When presence changes, we need to rebuild all users across all rooms. */
        const self = get();
        if (!self.room) throw new Error("Received presence, but not connected to a room.");
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
            const users = emptyUsersForRoom(room);
            set({ room, users, channel, status: ConnectionStatus.Connected });
            break;

          case "CHANNEL_ERROR":
          case "CLOSED":
          case "TIMED_OUT":
            if (err) console.log(err);
            set({
              room: null,
              users: null,
              channel: null,
              status: status === "CLOSED" ? ConnectionStatus.Disconnected : ConnectionStatus.DisconnectedError,
            });
            break;
        }
      });
  },

  async leave() {
    const self = get();
    if (!self.channel) throw new Error("You must be connected to a room to leave.");
    await self.channel.unsubscribe(); // This should fire "CLOSED" event above
  },
}));
