"use client";

import {
  Box,
  Card,
  IconButton,
  InputAdornment,
  SvgIcon,
  TextField,
} from "@mui/material";
import GoIcon from "@heroicons/react/24/solid/ArrowRightIcon";
import React, { useEffect } from "react";
import { useRoomState } from "@/state";
import { EditorView, basicSetup } from "codemirror";
import { cpp } from "@codemirror/lang-cpp";
import { ayuLight } from "thememirror";
import * as Y from "yjs";
import { SupabaseProvider } from "@/provider";
import { createClient } from "@supabase/supabase-js";

import { yCollab } from "y-codemirror.next";
import { jakarta } from "@/components/ThemeRegistry/theme";

function NameView() {
  const name = useRoomState((room) => room.name);
  const setName = useRoomState((room) => room.setName);
  const join = useRoomState((room) => room.join);

  const onSubmit = React.useCallback(
    (event: React.FormEvent) => {
      join();
      event.preventDefault();
    },
    [join]
  );

  return (
    <form style={{ width: "100%" }} onSubmit={onSubmit}>
      <TextField
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        fullWidth
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton size="small">
                <SvgIcon>
                  <GoIcon />
                </SvgIcon>
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
    </form>
  );
}

const EditorViewId = "code-view";

function CodeView() {
  const name = useRoomState((room) => room.name);

  useEffect(() => {
    const parent = document.getElementById(EditorViewId)!;
    if (parent.hasChildNodes()) return;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const doc = new Y.Doc();
    const provider = new SupabaseProvider(doc, supabase, {
      channel: "test",
      diffTable: "diffs",
      diffView: "diffsview",
    });
    const ytext = doc.getText("codemirror");
    const undoManager = new Y.UndoManager(ytext);

    provider.awareness.setLocalStateField("user", {
      name,
      color: "#03b1fc",
      colorLight: "#8bdafc",
    });

    new EditorView({
      extensions: [
        basicSetup,
        cpp(),
        ayuLight,
        yCollab(ytext, provider.awareness, { undoManager }),
      ],
      parent,
    });
  }, []);

  return (
    <Card sx={{ width: 1, border: "1px solid #0001", m: 6 }} elevation={0}>
      <Box id={EditorViewId} sx={{
        ".cm-content, .cm-gutter": { minHeight: "400px" },
        ".cm-lineNumbers > .cm-gutterElement": { pl: "20px" },
        ".cm-ySelectionInfo": { fontFamily: jakarta.style.fontFamily }
      }}
      />
    </Card>
  );
}

export default function RoomPage() {
  const view = useRoomState((room) => room.view);
  if (view === "name") return <NameView />;
  if (view === "code") return <CodeView />;
  return null;
}
