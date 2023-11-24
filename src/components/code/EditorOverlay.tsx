"use client";

import { useRoomState } from "@/state/room";
import { useUserState } from "@/state/user";
import { ConnectionStatus, mergeStatuses } from "@/types/Connection";
import { DoorBackOutlined } from "@mui/icons-material";
import ErrorOutline from "@mui/icons-material/ErrorOutline";
import WifiOff from "@mui/icons-material/WifiOff";
import { Box, CircularProgress, Link, Stack, Typography } from "@mui/material";
import React from "react";

export function OverlayBlur({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        backdropFilter: "blur(3px)",
        alignItems: "center",
        display: "flex",
        justifyContent: "center",
      }}
    >
      {children}
    </Box>
  );
}

type OverlayAlertProps = {
  icon?: React.ReactNode;
  children: React.ReactNode;

  /**
   * If true, refreshing will not be displayed as an option.
   */
  final?: boolean;
};

export function OverlayAlert({ icon, children, final }: OverlayAlertProps) {
  return (
    <Stack direction="row" alignItems="center" spacing={2} mx={8}>
      {icon}
      <Typography variant="subtitle1" display="inline">
        {children}
        {!final && (
          <>
            {" "}
            <Link display="inline" onClick={() => window.location.reload()}>
              Reload page?
            </Link>
          </>
        )}
      </Typography>
    </Stack>
  );
}

type EditorOverlayProps = {
  editorStatus: ConnectionStatus;
};

export default function EditorOverlay({ editorStatus }: EditorOverlayProps) {
  const user = useUserState((state) => state.user);
  const roomStatus = useRoomState((room) => room.status);

  const content = (() => {
    const status = mergeStatuses(editorStatus, roomStatus);
    if (status === ConnectionStatus.Connecting) return <CircularProgress size={24} />;
    if (status === ConnectionStatus.DisconnectedError)
      return <OverlayAlert icon={<ErrorOutline />}>An error occured.</OverlayAlert>;
    if (roomStatus === ConnectionStatus.Disconnected)
      return (
        <OverlayAlert icon={<DoorBackOutlined />} final={!user.isHost}>
          {user.isHost ? "It looks like you lost connection to the room." : "It looks like the host closed this room."}
        </OverlayAlert>
      );
    if (status === ConnectionStatus.Disconnected)
      return <OverlayAlert icon={<WifiOff />}>It looks like you were disconnected from the group.</OverlayAlert>;
    return null;
  })();

  if (content === null) return null;
  return <OverlayBlur>{content}</OverlayBlur>;
}
