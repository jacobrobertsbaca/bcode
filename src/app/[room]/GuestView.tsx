"use client";

import FormikTextField from "@/components/FormikTextField";
import RoomEditor from "@/components/code/RoomEditor";
import EditorFrame from "@/components/code/EditorFrame";
import EditorOnline from "@/components/code/EditorOnline";
import { OverlayAlert, OverlayBlur } from "@/components/code/EditorOverlay";
import { RoomState, useRoom, useRoomState } from "@/state/room";
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
  SxProps,
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
import { random } from "lodash";
import { RoomTitle } from "@/components/RoomTitle";

/**
 * Available colors for guests to use.
 * Taken from: http://medialab.github.io/iwanthue/
 */
const guestColors = ["#ca5070", "#57aa60", "#bf55ba", "#a29940", "#6b68cd", "#ca6b3d", "#49a5cf", "#ab7ebb"];

function getNextColor(users: RoomState["users"]): string {
  const usedColors = Object.values(users ?? {})
    .flatMap((u) => u)
    .map((u) => u.color);
  const colorFreq: Record<string, number> = {};
  guestColors.forEach((c) => (colorFreq[c] = 0));
  usedColors.forEach((c) => c in colorFreq && colorFreq[c]++);
  const minFreq = Math.min(...Object.values(colorFreq));
  const minUsed = [...Object.entries(colorFreq)].filter((e) => e[1] === minFreq).map((e) => e[0]);
  return minUsed[random(0, minUsed.length - 1)];
}

enum GuestViewStatus {
  Name = "name",
  Room = "room",
}

type ChooseNameViewProps = {
  onNameSelected: () => void;
};

function ChooseNameView({ onNameSelected }: ChooseNameViewProps) {
  const userState = useUserState();
  const users = useRoomState((state) => state.users);

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
        userState.updateUser({
          name: values.name,
          color: getNextColor(users),
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

function ChooseGroupView({ room }: { room: Room }) {
  const roomStatus = useRoomState((state) => state.status);
  const updateUser = useUserState((state) => state.updateUser);

  if (roomStatus === ConnectionStatus.Disconnected || roomStatus === ConnectionStatus.DisconnectedError)
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

  function cellSx(index: number): SxProps {
    if (index !== room!.groups.length - 1) return {};
    return { borderBottom: "unset" };
  }

  return (
    <EditorFrame sx={{ minHeight: "unset" }}>
      <Table sx={{ width: 1 }}>
        <TableBody>
          {room.groups.map((group, index) => (
            <TableRow key={group.no} sx={{ height: 75 }}>
              <TableCell sx={cellSx(index)}>{group.name}</TableCell>
              <TableCell sx={cellSx(index)}>
                <Stack direction="row" alignContent="center" justifyContent="end" spacing={2}>
                  <EditorOnline group={group.no} alignItems="center" />
                  <Box>
                    <Button
                      onClick={() => updateUser({ group: group.no })}
                      variant="contained"
                      sx={{ backgroundColor: "background.contrast" }}
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
  room: Room;
  view: GuestViewStatus;
  setView: (view: GuestViewStatus) => void;
};

function GuestViewSelector({ room, view, setView }: GuestViewSelectorProps) {
  const group = useUserState((state) => state.user.group);
  const updateUser = useUserState((state) => state.updateUser);

  if (view === GuestViewStatus.Name) return <ChooseNameView onNameSelected={() => setView(GuestViewStatus.Room)} />;
  if (view === GuestViewStatus.Room) {
    if (group === 0) return <ChooseGroupView room={room} />;
    return (
      <RoomEditor
        room={room}
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
      <RoomTitle
        room={room}
        host={false}
        display="inline"
        variant="inherit"
        fontWeight={view === GuestViewStatus.Name ? 500 : undefined}
      />
    </Typography>
  );
}

/**
 * The guest view renders on the client
 * and displays the current coding editor for the selected room/group.
 */
export default function GuestView({ room }: { room: Room }) {
  const [view, setView] = useState(GuestViewStatus.Name);
  useRoom(room);

  return (
    <Stack spacing={2}>
      <GuestViewTitle room={room} view={view} />
      <GuestViewSelector room={room} view={view} setView={setView} />
    </Stack>
  );
}
