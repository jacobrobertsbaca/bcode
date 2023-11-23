"use client";

import { useRoomState } from "@/state/room";
import { ConnectionStatus } from "@/types/Connection";
import { Avatar, Stack, StackProps, Tooltip, alpha } from "@mui/material";

function getInitials(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

type EditorOnlineProps = StackProps & {
  group: number;
};

/**
 * Displays avatars for each of the users connected to a group in the current room.
 * Renders nothing if not connected to a room, if the given group number doesn't exist in the room,
 * or if there are no users in the room.
 */
export default function EditorOnline({ group, ...rest }: EditorOnlineProps) {
  const roomStatus = useRoomState((room) => room.status);
  const usersMap = useRoomState((room) => room.users);
  if (roomStatus != ConnectionStatus.Connected) return null;
  if (!usersMap || !(group in usersMap)) return null;
  const users = usersMap[group];

  return (
    <Stack direction="row" spacing={-0.4} {...rest}>
      {users.map((u) => (
        <Tooltip title={u.name} arrow key={u.id}>
          <Avatar
            sx={{
              bgcolor: u.color,
              width: 28,
              height: 28,
              outline: (theme) => `2px solid ${theme.palette.editor.main}`,
            }}
          >
            {getInitials(u.name)}
          </Avatar>
        </Tooltip>
      ))}
    </Stack>
  );
}
