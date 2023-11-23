"use client";

import { Box, CardHeader } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { jakarta } from "../ThemeRegistry/fonts";
import createClient from "@/provider/client";
import * as Y from "yjs";
import { SupabaseProvider, SupabaseProviderEvents } from "@/provider";
import { useRoomState } from "@/state/room";
import { EditorView, basicSetup } from "codemirror";
import { cpp } from "@codemirror/lang-cpp";
import { yCollab } from "y-codemirror.next";
import { ayuLight } from "thememirror";
import EditorFrame from "./EditorFrame";
import { ConnectionStatus } from "@/types/Connection";
import EditorOverlay from "./EditorOverlay";
import { LiveUser, useUserState } from "@/state/user";

const kEditorViewId = "code-view";

function updateProviderUser(provider: SupabaseProvider, user: LiveUser) {
  provider.awareness.setLocalStateField("user", {
    name: user.name,
    color: user.color,
    colorLight: user.lightColor,
  });
}

type EditorProps = {
  group: number;
}

export default function Editor({ group }: EditorProps) {
  /** Room state */
  const room = useRoomState(room => room.room);
  const roomStatus = useRoomState(room => room.status);

  /** Editor state */
  const user = useUserState(state => state.user);
  const provider = useRef<SupabaseProvider>();
  const [providerStatus, setProviderStatus] = useState<ConnectionStatus>(ConnectionStatus.Connecting);
  const editorId = `${kEditorViewId}-${group}`;

  /* Setup code editor on mount */
  useEffect(() => {
    // Get parent and clear its children in case of re-renders
    const parentElem = document.getElementById(editorId)!;
    parentElem.replaceChildren();

    // If we're not connected to a room, we can't load the editor
    if (roomStatus !== ConnectionStatus.Connected) return;
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

    provider.current.on(SupabaseProviderEvents.Status, (instance: SupabaseProvider, status: ConnectionStatus) => {
      setProviderStatus(status);
      if (status === ConnectionStatus.Connected) updateProviderUser(instance, user);
    });

    new EditorView({
      extensions: [basicSetup, cpp(), ayuLight, yCollab(ytext, provider.current.awareness, { undoManager })],
      parent: parentElem,
    });

    return () => {
      provider.current?.destroy();
    };
  }, [roomStatus]);

  /* Update the awareness user other people see (cursor color, name, etc.) if it changes */
  useEffect(() => {
    if (!provider.current) return;
    if (provider.current.status !== ConnectionStatus.Connected) return;
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
      <EditorOverlay editorStatus={providerStatus} />
    </EditorFrame>
  );
}
