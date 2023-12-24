"use client";

import { Box, CardHeader, Stack, alpha, useTheme } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { jakarta } from "../ThemeRegistry/fonts";
import createClient from "@/provider/client";
import * as Y from "yjs";
import { SupabaseProvider, SupabaseProviderEvents } from "@/provider";
import { useRoomState } from "@/state/room";
import { EditorView } from "codemirror";
import { yCollab } from "y-codemirror.next";
import EditorFrame from "./EditorFrame";
import { ConnectionStatus } from "@/types/Connection";
import EditorOverlay from "./EditorOverlay";
import { LiveUser, useUserState } from "@/state/user";
import EditorOnline from "./EditorOnline";
import { Compartment, EditorState } from "@codemirror/state";
import { languages } from "@codemirror/language-data";
import { light } from "./theme/light";
import { dark } from "./theme/dark";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { loadDocument, saveDocument } from "@/app/actions";
import type { Room } from "@/types/Room";
import { SupportedLanguages } from "./languages";
import { basicSetup } from "./setup";

const kEditorViewId = "code-view";
const EditorTheme = new Compartment();
const EditorLanguage = new Compartment();

function updateProviderUser(provider: SupabaseProvider, user: LiveUser) {
  provider.awareness.setLocalStateField("user", {
    name: user.name,
    color: user.color,
    colorLight: alpha(user.color, 0.2),
  });
}

type EditorProps = {
  room: Room;
  group: number;
  action?: React.ReactNode;
};

export default function Editor({ room, group, action }: EditorProps) {
  /** Room state */
  const roomStatus = useRoomState((state) => state.status);

  /** Editor state */
  const user = useUserState((state) => state.user);
  const provider = useRef<SupabaseProvider>();
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [providerStatus, setProviderStatus] = useState<ConnectionStatus>(ConnectionStatus.Connecting);
  const editorId = `${kEditorViewId}-${group}`;

  /* Theme */
  const theme = useTheme();
  const editorTheme = theme.palette.mode === "light" ? light : dark;

  /* Setup code editor on mount */
  useEffect(() => {
    // Get parent and clear its children in case of re-renders
    const parentElem = document.getElementById(editorId)!;
    parentElem.replaceChildren();

    // If we're not connected to a room, we can't load the editor
    if (roomStatus !== ConnectionStatus.Connected) return;

    // Setup ydoc and connection to Supabase
    const channel = `${room.code}:${group}`;
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

    const editor = new EditorView({
      extensions: [
        basicSetup,
        keymap.of([indentWithTab]),
        EditorTheme.of(editorTheme),
        EditorLanguage.of([]),
        // EditorState.readOnly.of(true),
        yCollab(ytext, provider.current.awareness, { undoManager }),
      ],
      parent: parentElem,
    });

    setEditorView(editor);

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

  /* Update the editor theme when the MUI theme changes */
  useEffect(() => {
    if (!editorView) return;
    editorView.dispatch({
      effects: EditorTheme.reconfigure(editorTheme),
    });
  }, [theme.palette.mode]);

  /* Update editor language when room language changes or editor loads in */
  const languageVersion = useRef(0);
  useEffect(() => {
    if (!editorView) return;
    const version = ++languageVersion.current;
    const cmName = SupportedLanguages.find((info) => info.name === room.language)?.cm;
    const cmLanguage = languages.find((info) => info.name === cmName);
    if (!cmLanguage) return console.log(`Couldn't find language: '${room.language}'`);
    cmLanguage.load().then((ls) => {
      if (languageVersion.current !== version) return; // Optimistic lock language loading
      editorView.dispatch({
        effects: EditorLanguage.reconfigure([ls]),
      });
    });
  }, [editorView, room.language]);

  return (
    <EditorFrame>
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
      <Box
        id={editorId}
        sx={{
          ".cm-content": { paddingTop: "22px" },
          ".cm-content, .cm-gutter": { minHeight: "400px" },
          ".cm-gutters": { borderRight: `1px solid ${theme.palette.divider}` },
          ".cm-lineNumbers > .cm-gutterElement": { pl: "20px" },
          ".cm-ySelectionInfo": { fontFamily: jakarta.style.fontFamily },
          ".cm-focused": { outline: "none" },
        }}
      />
      <EditorOverlay editorStatus={providerStatus} />
    </EditorFrame>
  );
}
