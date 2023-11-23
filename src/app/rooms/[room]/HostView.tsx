"use client";

import Editor from "@/components/code/Editor";
import EditorFrame from "@/components/code/EditorFrame";
import { Room } from "@/types/Room";
import { Box, CardHeader, Stack, Typography } from "@mui/material";

/**
 * The host view renders on the client,
 * and displays a sequence of coding editors for each of the associated groups.
 */
export default function HostView({ room }: { room: Room }) {
  return (
    <Stack spacing={4}>
      {room.groups.map((group) => (
        <Editor title={group.name} channel={`${room.code}-${group.no}`} />
      ))}
    </Stack>
  );
}
