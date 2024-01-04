import { create } from "zustand";
import type { Room } from "../types/Room";
import type { RealtimeChannel } from "@supabase/realtime-js";
import createClient from "../provider/client";
import debug from "debug";
import { ConnectionStatus } from "../types/Connection";
import { type LiveUser, useUserState } from "./user";
import { enqueueSnackbar } from "notistack";
import { useEffect, useRef } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { ChannelEvents } from "../provider/events";
import { useRouter } from "@/components/navigation/AppProgressBar";
import { prod } from "@/app/util";

interface RoomMethods {
  join: (room: Room, router: AppRouterInstance) => Promise<void>;
  track: () => Promise<void>;
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

const logger = debug("[ROOM]");
logger.enabled = !prod();

export const useRoomState = create<RoomState>((set, get) => ({
  users: null,
  channel: null,
  status: ConnectionStatus.Disconnected,

  async join(room: Room, router: AppRouterInstance) {
    const self = get();
    const status = self.status;

    if (status === ConnectionStatus.Connecting || status === ConnectionStatus.Connected) {
      if (self.channel?.subTopic !== room.code) {
        logger(`Joining a different room than the current one (${self.channel?.subTopic}). Leaving...`);
        self.leave();
      } else {
        logger(`Joining ${room.code}. Already connected.`);
      }
      return;
    }

    const supabase = createClient();
    const channel = supabase.channel(room.code, {
      config: {
        presence: {
          key: useUserState.getState().user.id,
        },
      },
    });

    logger(`Connecting to room ${room.code}...`);
    set({ status: ConnectionStatus.Connecting, channel, users: {} });

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
            set({ status: ConnectionStatus.Connected });
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

  async track() {
    const self = get();
    if (!self.channel) return;
    const user = useUserState.getState().user;
    if (user.isHost) return; // Don't track host user
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

export function useRoom(room: Room) {
  const router = useRouter();
  const roomState = useRoomState();
  const userState = useUserState();

  /* Connect to room on mount, disconnect on unmount */
  useEffect(() => {
    roomState.join(room, router);
    return () => roomState.leave();
  }, []);

  /* Notify others of user changes */
  useEffect(() => {
    roomState.track();
  }, [userState.user]);

  /* If room changes and guest is no longer in the room, leave the room */
  useEffect(() => {
    if (userState.user.group > 0 && !room.groups.some((g) => g.no === userState.user.group)) {
      userState.updateUser({ group: 0 });
      enqueueSnackbar("The host closed your group");
    }
  }, [room, userState]);

  /* Notify guests when host locks the room */
  const wasLocked = useRef(room.locked);
  useEffect(() => {
    if (room.locked === wasLocked.current) return;
    wasLocked.current = room.locked;
    if (!userState.user.isHost && room.locked) enqueueSnackbar("The host locked the room");
  }, [room.locked]);

  /* Attempt to reconnect on document becoming visible */
  useEffect(() => {
    function onVisibilityChanged() {
      if (document.visibilityState !== "visible") return;
      if (roomState.status === ConnectionStatus.Connecting || roomState.status === ConnectionStatus.Connected) return;
      logger("Reconnecting to room after disconnecting...");
      router.refresh();
      roomState.join(room, router);
    }

    document.addEventListener("visibilitychange", onVisibilityChanged);
    return () => document.removeEventListener("visibilitychange", onVisibilityChanged);
  }, [roomState.status]);
}
