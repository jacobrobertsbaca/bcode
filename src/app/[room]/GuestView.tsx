"use client";

import FormikTextField from "@/components/FormikTextField";
import Editor from "@/components/code/Editor";
import EditorFrame from "@/components/code/EditorFrame";
import EditorOnline from "@/components/code/EditorOnline";
import { OverlayAlert, OverlayBlur } from "@/components/code/EditorOverlay";
import { useRoom, useRoomState } from "@/state/room";
import { useUserState } from "@/state/user";
import { Room } from "@/types/Room";
import { ArrowRightRounded, DoorBackOutlined } from "@mui/icons-material";
import XMarkIcon from "@heroicons/react/24/solid/XMarkIcon";
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Stack,
  SvgIcon,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { Formik } from "formik";
import { useState } from "react";
import { z } from "zod";
import { toFormikValidationSchema } from "zod-formik-adapter";
import { ConnectionStatus } from "@/types/Connection";

enum GuestViewStatus {
  Name = "name",
  Room = "room",
}

type ChooseNameViewProps = {
  onNameSelected: () => void;
};

function ChooseNameView({ onNameSelected }: ChooseNameViewProps) {
  const updateUser = useUserState((state) => state.updateUser);

  return (
    <Formik
      initialValues={{
        name: "",
      }}
      validationSchema={toFormikValidationSchema(
        z.object({
          name: z.string().trim().min(1, "Required").max(30),
        })
      )}
      onSubmit={(values) => {
        updateUser({
          name: values.name,
          isHost: false,
          group: 0,
        });
        onNameSelected();
      }}
    >
      {(props) => (
        <form onSubmit={props.handleSubmit}>
          <FormikTextField
            name="name"
            label="Name"
            placeholder="What is your name?"
            max={30}
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => props.submitForm()}>
                    <ArrowRightRounded />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </form>
      )}
    </Formik>
  );
}

function ChooseGroupView() {
  const roomStatus = useRoomState((state) => state.status);
  const room = useRoomState((state) => state.room);
  const updateUser = useUserState((state) => state.updateUser);

  if (room === null)
    return (
      <EditorFrame>
        <OverlayBlur>
          <OverlayAlert icon={<DoorBackOutlined />} final={roomStatus === ConnectionStatus.Disconnected}>
            {roomStatus === ConnectionStatus.DisconnectedError
              ? "It looks like you lost connection to the room."
              : "It looks like the host closed this room."}
          </OverlayAlert>
        </OverlayBlur>
      </EditorFrame>
    );

  return (
    <EditorFrame sx={{ minHeight: "unset" }}>
      <Table sx={{ width: 1 }}>
        <TableBody>
          {room.groups.map((group) => (
            <TableRow key={group.no} sx={{ height: 75 }}>
              <TableCell>{group.name}</TableCell>
              <TableCell>
                <Stack direction="row" alignContent="center" justifyContent="end" spacing={2}>
                  <EditorOnline group={group.no} alignItems="center" />
                  <Box>
                    <Button
                      onClick={() => updateUser({ group: group.no })}
                      variant="contained"
                      sx={{ backgroundColor: "black" }}
                      disableElevation
                    >
                      Join
                    </Button>
                  </Box>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </EditorFrame>
  );
}

type GuestViewSelectorProps = {
  view: GuestViewStatus;
  setView: (view: GuestViewStatus) => void;
};

function GuestViewSelector({ view, setView }: GuestViewSelectorProps) {
  const group = useUserState((state) => state.user.group);
  const updateUser = useUserState((state) => state.updateUser);
  if (view === GuestViewStatus.Name) return <ChooseNameView onNameSelected={() => setView(GuestViewStatus.Room)} />;
  if (view === GuestViewStatus.Room) {
    if (group === 0) return <ChooseGroupView />;
    return (
      <Editor
        group={group}
        action={
          <Tooltip title="Leave group" arrow>
            <IconButton size="small" onClick={() => updateUser({ group: 0 })}>
              <SvgIcon>
                <XMarkIcon />
              </SvgIcon>
            </IconButton>
          </Tooltip>
        }
      />
    );
  }
  return null;
}

function GuestViewTitle({ room, view }: { room: Room; view: GuestViewStatus }) {
  const group = useUserState((state) => state.user.group);
  return (
    <Typography variant="h5">
      {view === GuestViewStatus.Name && "Join "}
      <Typography display="inline" variant="inherit" fontWeight={view === GuestViewStatus.Name ? 500 : undefined}>
        {room.name}
      </Typography>
    </Typography>
  );
}

/**
 * The guest view renders on the client
 * and displays the current coding editor for the selected room/group.
 */
export default function GuestView({ room }: { room: Room }) {
  const [view, setView] = useState(GuestViewStatus.Name);
  const localRoom = useRoom(room, false);
  if (localRoom != null) room = localRoom;

  return (
    <Stack spacing={2}>
      <GuestViewTitle room={room} view={view} />
      <GuestViewSelector view={view} setView={setView} />
    </Stack>
  );
}
