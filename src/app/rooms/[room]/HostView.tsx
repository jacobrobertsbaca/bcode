"use client";

import Editor from "@/components/code/Editor";
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
  useRoom(room, true);
  useEffect(() => {
    updateUser({ isHost: true, name: "Host", color: "#000000" });
  }, []);

  return (
    <Stack spacing={4}>
      {room.groups.map((group) => (
        <Editor key={group.no} group={group.no} />
      ))}
    </Stack>
  );
}
