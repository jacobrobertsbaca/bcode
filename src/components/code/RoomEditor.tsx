"use client";

import { CardHeader, Stack, alpha } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import createClient from "@/provider/client";
import * as Y from "yjs";
import { SupabaseProvider, SupabaseProviderEvents } from "@/provider";
import { yCollab } from "y-codemirror.next";
import EditorFrame, { EditorFrameProps } from "./EditorFrame";
import { ConnectionStatus } from "@/types/Connection";
import EditorOverlay from "./EditorOverlay";
import { LiveUser, useUserState } from "@/state/user";
import EditorOnline from "./EditorOnline";
import { loadDocument, saveDocument } from "@/app/actions";
import { channelString, type Room } from "@/types/Room";
import { EditorStyles, useEditor } from "./EditorBase";

const kEditorMaxChars = 2000;
const kEditorViewId = "code-view";
const kEditorHeightPx = 400;
const kEditorHeaderHeightPx = 64;

function updateProviderUser(provider: SupabaseProvider, user: LiveUser) {
  provider.awareness.setLocalStateField("user", {
    name: user.name,
    color: user.color,
    colorLight: alpha(user.color, 0.2),
  });
}

type RoomEditorProps = EditorFrameProps & {
  room: Room;
  group: number;
  action?: React.ReactNode;
};

export default function RoomEditor({ room, group, action }: RoomEditorProps) {
  const user = useUserState((state) => state.user);
  const provider = useRef<SupabaseProvider>();
  const [providerStatus, setProviderStatus] = useState<ConnectionStatus>(ConnectionStatus.Connecting);
  const channel = channelString(room, group);
  const editorId = `${kEditorViewId}-${channel}`;

  useEditor({
    language: room.language,
    max: kEditorMaxChars,

    onCreate() {
      // Setup ydoc and connection to Supabase
      const supabase = createClient();
      const ydoc = new Y.Doc();

      provider.current = new SupabaseProvider(ydoc, supabase, {
        channel,

        async loadDocument() {
          const state = await loadDocument(channel);
          if (!state) return null;
          return Uint8Array.from(state);
        },

        async saveDocument(diff) {
          await saveDocument(channel, Array.from(diff));
        },
      });

      const ytext = ydoc.getText("codemirror");
      const undoManager = new Y.UndoManager(ytext);

      provider.current.on(SupabaseProviderEvents.Status, (instance: SupabaseProvider, status: ConnectionStatus) => {
        setProviderStatus(status);
        if (status === ConnectionStatus.Connected) updateProviderUser(instance, user);
      });

      return {
        parent: document.getElementById(editorId)!,
        extensions: yCollab(ytext, provider.current.awareness, { undoManager }),
      };
    },

    onDestroy() {
      provider.current?.destroy();
    },
  });

  /* Update the awareness user other people see (cursor color, name, etc.) if it changes */
  useEffect(() => {
    if (!provider.current) return;
    if (provider.current.status !== ConnectionStatus.Connected) return;
    updateProviderUser(provider.current, user);
  }, [user]);

  return (
    <EditorFrame sx={{ minHeight: kEditorHeightPx }}>
      <CardHeader
        title={room?.groups.find((g) => g.no === group)?.name ?? ""}
        titleTypographyProps={{ variant: "h6", fontWeight: 400 }}
        action={
          <Stack direction="row" alignItems="center" spacing={1}>
            <EditorOnline group={group} />
            {action}
          </Stack>
        }
        sx={{
          "& .MuiCardHeader-action": { margin: 0, alignSelf: "center" },
        }}
      />
      <EditorStyles
        id={editorId}
        editorSx={{
          ".cm-content": {
            paddingTop: "22px", // So others' cursor tooltips not occluded by CM editor
          },
          ".cm-gutters": {
            minHeight: `${kEditorHeightPx - kEditorHeaderHeightPx}px !important`, // Stop layout shift on load
          },
        }}
      />
      <EditorOverlay editorStatus={providerStatus} />
    </EditorFrame>
  );
}
