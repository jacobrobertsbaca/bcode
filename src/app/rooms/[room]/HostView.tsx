"use client";

import RoomEditor from "@/components/code/RoomEditor";
import { useRoom } from "@/state/room";
import { useUserState } from "@/state/user";
import { Room } from "@/types/Room";
import { Stack } from "@mui/material";
import { useEffect } from "react";

/**
 * The host view renders on the client,
 * and displays a sequence of coding editors for each of the associated groups.
 */
export default function HostView({ room }: { room: Room }) {
  const updateUser = useUserState((state) => state.updateUser);
  useRoom(room);

  useEffect(() => {
    updateUser({ isHost: true, name: "Host", color: "#515151" });
  }, []);

  return (
    <Stack spacing={4}>
      {room.groups.map((group) => (
        <RoomEditor key={group.no} room={room} group={group.no} />
      ))}
    </Stack>
  );
}
