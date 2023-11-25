"use client";

import Editor from "@/components/code/Editor";
import { useRoom } from "@/state/room";
import { Room } from "@/types/Room";
import { Stack } from "@mui/material";

/**
 * The host view renders on the client,
 * and displays a sequence of coding editors for each of the associated groups.
 */
export default function HostView({ room }: { room: Room }) {
  useRoom(room, true);
  return (
    <Stack spacing={4}>
      {room.groups.map((group) => (
        <Editor key={group.no} group={group.no} />
      ))}
    </Stack>
  );
}
