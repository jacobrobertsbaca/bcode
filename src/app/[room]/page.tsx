"use client";

import {
  Box,
  Container,
  IconButton,
  InputAdornment,
  SvgIcon,
  TextField,
} from "@mui/material";
import GoIcon from "@heroicons/react/24/solid/ArrowRightIcon";
import React from "react";
import { useRoomState } from "@/state";

function NameView() {
  const name = useRoomState((room) => room.name);
  const setName = useRoomState((room) => room.setName);
  const join = useRoomState((room) => room.join);

  const onSubmit = React.useCallback((event: React.FormEvent) => {
    join();
    event.preventDefault();
  }, [join]);

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

function CodeView() {
  return "Your code goes here!";
};

export default function RoomPage() {
  const view = useRoomState(room => room.view);
  if (view === "name") return <NameView />
  if (view === "code") return <CodeView />
  return null;
}
