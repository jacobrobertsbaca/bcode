"use client";

import { Box, CardHeader, CircularProgress, Link, Stack, SvgIcon, Typography } from "@mui/material";
import { useEffect, useReducer, useRef, useState } from "react";
import { jakarta } from "../ThemeRegistry/fonts";
import createClient from "@/provider/client";
import * as Y from "yjs";
import { SupabaseProvider, SupabaseProviderEvents, SupabaseProviderStatus } from "@/provider";
import { LiveUser, RoomStatus, useRoomState, useUserState } from "@/state";
import { EditorView, basicSetup } from "codemirror";
import { cpp } from "@codemirror/lang-cpp";
import { yCollab } from "y-codemirror.next";
import { ayuLight } from "thememirror";
import WifiOff from "@mui/icons-material/WifiOff";
import ErrorOutline from "@mui/icons-material/ErrorOutline";
import EditorFrame from "./EditorFrame";
import { DoorBackOutlined } from "@mui/icons-material";

const kEditorViewId = "code-view";

function updateProviderUser(provider: SupabaseProvider, user: LiveUser) {
  provider.awareness.setLocalStateField("user", {
    name: user.name,
    color: user.color,
    colorLight: user.lightColor,
  });
}

enum EditorStatus { NoRoom = "room" };
type OverlayStatus = SupabaseProviderStatus | EditorStatus;

function combineStatus(provider: SupabaseProviderStatus, room: RoomStatus): OverlayStatus {
  if (provider === SupabaseProviderStatus.DisconnectedError || room === RoomStatus.DisconnectedError)
    return SupabaseProviderStatus.DisconnectedError;
  if (provider === SupabaseProviderStatus.Connecting || room === RoomStatus.Connecting)
    return SupabaseProviderStatus.Connecting;
  if (provider === SupabaseProviderStatus.Disconnected || room === RoomStatus.Disconnected)
    return SupabaseProviderStatus.DisconnectedError;
  return SupabaseProviderStatus.Connected;
}

type EditorOverlayProps = {
  status: OverlayStatus;
  reload: () => void;
}

function EditorOverlay({ status, reload }: EditorOverlayProps) {
  if (status === SupabaseProviderStatus.Connected) return null;
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
      {status === SupabaseProviderStatus.Connecting ? (
        <CircularProgress size={24} />
      ) : (
          <Stack direction="row" alignItems="center" spacing={1}>
            {status === SupabaseProviderStatus.Disconnected && <WifiOff />}
            {status === SupabaseProviderStatus.DisconnectedError && <ErrorOutline />}
            {status === EditorStatus.NoRoom && <DoorBackOutlined />}
            <Typography variant="subtitle1">
              {status === SupabaseProviderStatus.Disconnected && "You were disconnected from the group!"}
              {status === SupabaseProviderStatus.DisconnectedError && "An error occurred."}
              {status === EditorStatus.NoRoom && "It looks like the host closed this room."}
            </Typography>
          {status === SupabaseProviderStatus.DisconnectedError && (
            <Link component="button" onClick={reload}>
              Reload?
            </Link>
          )}
          </Stack>
      )}
    </Box>
  );
}

type EditorProps = {
  group: number;
}

export default function Editor({ group }: EditorProps) {
  /** Room state */
  const room = useRoomState(room => room.room);
  const roomStatus = useRoomState(room => room.status);

  /** Editor state */
  const user = useUserState();
  const provider = useRef<SupabaseProvider>();
  const [reloadCounter, reload] = useReducer((s) => s + 1, 0);
  const [providerStatus, setProviderStatus] = useState<SupabaseProviderStatus>(SupabaseProviderStatus.Connecting);
  const editorId = `${kEditorViewId}-${group}`;

  /* Setup code editor on mount */
  useEffect(() => {
    // Get parent and clear its children in case of re-renders
    const parentElem = document.getElementById(editorId)!;
    parentElem.replaceChildren();

    // Render a no room overlay if we aren't connected to a room
    setProviderStatus(SupabaseProviderStatus.Connecting);
    if (roomStatus !== RoomStatus.Connected) return;
    const channel = `${room!.code}-${group}`;

    // Setup ydoc and connection to Supabase
    const supabase = createClient();
    const ydoc = new Y.Doc();
    provider.current = new SupabaseProvider(ydoc, supabase, {
      channel,
      diffTable: "diffs",
      diffView: "diffsview",
    });

    const ytext = ydoc.getText("codemirror");
    const undoManager = new Y.UndoManager(ytext);

    provider.current.on(SupabaseProviderEvents.Status, (instance: SupabaseProvider, status: SupabaseProviderStatus) => {
      setProviderStatus(status);
      if (status === SupabaseProviderStatus.Connected) updateProviderUser(instance, user);
    });

    new EditorView({
      extensions: [basicSetup, cpp(), ayuLight, yCollab(ytext, provider.current.awareness, { undoManager })],
      parent: parentElem,
    });

    return () => {
      provider.current?.destroy();
    };
  }, [reloadCounter, roomStatus]);

  /* Update the awareness user other people see (cursor color, name, etc.) if it changes */
  useEffect(() => {
    if (!provider.current) return;
    if (provider.current.status !== SupabaseProviderStatus.Connected) return;
    updateProviderUser(provider.current, user);
  }, [user]);

  return (
    <EditorFrame>
      <CardHeader title={room?.groups.find(g => g.no === group)?.name ?? ""} />
      <Box
        id={editorId}
        sx={{
          ".cm-content, .cm-gutter": { minHeight: "400px" },
          ".cm-lineNumbers > .cm-gutterElement": { pl: "20px" },
          ".cm-ySelectionInfo": { fontFamily: jakarta.style.fontFamily },
          ".cm-focused": { outline: "none" }
        }}
      />
      <EditorOverlay status={combineStatus(providerStatus, roomStatus)} reload={reload} />
    </EditorFrame>
  );
}
