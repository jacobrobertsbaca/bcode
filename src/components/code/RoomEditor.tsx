"use client";

import { CardHeader, Stack, Typography, alpha, useTheme } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { channelString, type RoomGroup, type Room } from "@/types/Room";
import { EditorStyles, useEditor } from "./EditorBase";
import { closeSnackbar, enqueueSnackbar } from "notistack";
import { useRoomState } from "@/state/room";

/*
 * ============================================================================
 *  Constants
 * ============================================================================
 */

/**
 * Maximum allowed characters to be typed in the editor.
 * This prevents excessively large documents.
 */
const kEditorMaxChars = 2000;

/**
 * Prefix for editor DOM ids.
 */
const kEditorViewId = "code-view";

/**
 * Minimum height of the editor in pixels.
 */
const kEditorHeightPx = 400;

/**
 * Height of the editor header.
 */
const kEditorHeaderHeightPx = 64;

/**
 * How long to wait while reloading the editor after starter code has changed in milliseconds.
 */
const kReloadWaitMs = 2500;

/**
 * How long to show that the document has been saved in the UI in milliseconds.
 */
const kSavedDisplayMs = 2000;

/*
 * ============================================================================
 *  Utility Functions
 * ============================================================================
 */

type Timer = ReturnType<typeof setTimeout>;

function useSaved() {
  /*
   * To keep track of the document save status and display this to the user, we keep track of several
   * values.
   *
   *    - `true` if the provider is saving to the database
   *    - `false` if the provider has saved and we are showing this in the UI temporarily.
   *    - `undefined` if the provider has saved.
   *
   */
  const [saving, setSaving] = useState<boolean>();
  const savedTimer = useRef<Timer>();
  const onSaveChanged = useCallback((value: boolean, showSaved: boolean) => {
    clearTimeout(savedTimer.current);
    if (value) return setSaving(true);
    if (!showSaved) return setSaving(undefined);
    savedTimer.current = setTimeout(() => setSaving(undefined), kSavedDisplayMs);
    setSaving(false);
  }, []);

  return [saving, onSaveChanged] as const;
}

function updateProviderUser(provider: SupabaseProvider, user: LiveUser) {
  provider.awareness.setLocalStateField("user", {
    name: user.name,
    color: user.color,
    colorLight: alpha(user.color, 0.2),
  });
}

/*
 * ============================================================================
 *  Editor Components
 * ============================================================================
 */

function EditorTitle({ group, saving }: { group?: RoomGroup; saving?: boolean }) {
  const theme = useTheme();
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Typography variant="inherit">{group?.name}</Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          transition: "opacity 300ms",
          opacity: saving !== undefined ? 1 : 0,
        }}
      >
        {saving === true ? "Saving..." : "Saved"}
      </Typography>
    </Stack>
  );
}

type RoomEditorProps = EditorFrameProps & {
  room: Room;
  group: number;
  action?: React.ReactNode;
};

export default function RoomEditor({ room, group, action }: RoomEditorProps) {
  /* Global State */
  const user = useUserState((state) => state.user);
  const roomStatus = useRoomState((state) => state.status);

  /* Editor State */
  const provider = useRef<SupabaseProvider>();
  const [providerStatus, setProviderStatus] = useState<ConnectionStatus>(ConnectionStatus.Connecting);
  const [refreshTimeout, setRefreshTimeout] = useState<Timer>();
  const [saving, setSaving] = useSaved();

  const channel = channelString(room, group);
  const editorId = `${kEditorViewId}-${channel}`;

  useEditor({
    language: room.language,
    max: kEditorMaxChars,

    onCreate: useCallback(() => {
      // If we are waiting to reload the editor, do nothing.
      if (refreshTimeout) return;

      // If we aren't connected to the room, do nothing.
      if (roomStatus !== ConnectionStatus.Connected) return;

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

      setSaving(false, false);
      provider.current.on(SupabaseProviderEvents.Saving, (instance: SupabaseProvider, saving: boolean) => {
        setSaving(saving, true);
      });

      return {
        parent: document.getElementById(editorId)!,
        extensions: yCollab(ytext, provider.current.awareness, { undoManager }),
      };
    }, [roomStatus, refreshTimeout, channel]),

    async onDestroy() {
      await provider.current?.destroy();
      setProviderStatus(ConnectionStatus.Connecting);
      setSaving(false, false);
    },
  });

  /* Update the awareness user other people see (cursor color, name, etc.) if it changes */
  useEffect(() => {
    if (!provider.current) return;
    if (provider.current.status !== ConnectionStatus.Connected) return;
    updateProviderUser(provider.current, user);
  }, [user]);

  /* Update the document state to the starter code when the starter code changes
   *
   * When the starter code is changed, we must update the document state for everyone.
   * The easiest way to do this is to reload the editor. However, if we reload the editor
   * right away, there is a chance that a client will resync the **old** document state with
   * one of their peers upon reload, causing the editor to have both the old and new code.
   * To remedy this, we wait to reload the editor for a few seconds to ensure that all clients
   * have dropped the old state.
   */
  const starterCode = useRef(room.starter_code);
  useEffect(() => {
    if (room.starter_code === starterCode.current) return;
    starterCode.current = room.starter_code;
    const snackbar = !user.isHost && enqueueSnackbar("The host updated the starter code.");
    clearTimeout(refreshTimeout);
    setRefreshTimeout(
      setTimeout(() => {
        setRefreshTimeout(undefined);
        if (snackbar) closeSnackbar(snackbar);
      }, kReloadWaitMs)
    );

    /* Disable document saving and resyncing while reloading so we don't push stale updates */
    if (provider.current) {
      provider.current.config.save = false;
      provider.current.config.resync = false;
    }
  }, [room.starter_code]);

  /* When user navigates away from tab, warn user about unsaved changes */
  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!provider.current) return;
      if (!provider.current.saving) return;
      event.returnValue = "You have unsaved changes";
      event.preventDefault();
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  return (
    <EditorFrame sx={{ minHeight: kEditorHeightPx }}>
      <CardHeader
        title={<EditorTitle group={room?.groups.find((g) => g.no === group)} saving={saving} />}
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
