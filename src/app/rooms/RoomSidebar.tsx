"use client";

import { Room, RoomSchema, RoomSchemaNew, groupsForCount } from "@/types/Room";
import { Divider, Drawer, IconButton, Stack, SvgIcon, Typography } from "@mui/material";
import { Formik } from "formik";
import React from "react";

import PlusIcon from "@heroicons/react/24/outline/PlusCircleIcon";
import XMarkIcon from "@heroicons/react/24/solid/XMarkIcon";
import { toFormikValidationSchema } from "zod-formik-adapter";
import RoomSidebarInput from "./RoomSidebarInput";
import createClient from "@/provider/client";
import { enqueueSnackbar } from "notistack";
import { useRouter } from "next-nprogress-bar";
import { useRoomState } from "@/state/room";

type RoomSidebarProps = {
  room: Room;
  open: boolean;
  setOpen: (open: boolean) => void;
};

export default function RoomSidebar({ room, open, setOpen }: RoomSidebarProps) {
  const exists = !!room.code;
  const supabase = createClient();
  const router = useRouter();
  const updatePeers = useRoomState((state) => state.update);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={() => setOpen(false)}
      sx={{ zIndex: 1050 }}
      PaperProps={{
        sx: { width: { xs: 1, sm: 600 }, border: "none", overflow: "hidden" },
      }}
    >
      <Formik
        initialValues={room}
        validationSchema={toFormikValidationSchema(exists ? RoomSchema : RoomSchemaNew)}
        validateOnChange={false}
        validateOnBlur={false}
        onSubmit={(room, actions) => {
          /* Wrap inside internal async function to keep button in
           * a submit state while the new page loads. */
          (async () => {
            actions.setSubmitting(true);

            const owner = (await supabase.auth.getUser()).data?.user?.id;
            if (!owner) {
              enqueueSnackbar(`Couldn't get current user. Are you connected?`, { variant: "error" });
              return actions.setSubmitting(false);
            }

            try {
              if (exists) {
                await Promise.all([
                  supabase
                    .from("rooms")
                    .update({ owner, ...room })
                    .eq("code", room.code)
                    .throwOnError(),
                  updatePeers(room),
                ]);
              } else {
                await supabase
                  .from("rooms")
                  .insert({ owner, ...room })
                  .throwOnError();
              }
            } catch (error: any) {
              enqueueSnackbar(`Couldn't save room: ${error?.message}`, { variant: "error" });
              return actions.setSubmitting(false);
            }

            if (exists) {
              router.refresh();
              setOpen(false);
            } else router.push(`/rooms/${room.code}`);
          })();
        }}
      >
        {(props) => (
          <form onSubmit={props.handleSubmit}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1, py: 2 }}>
              <Typography variant="subtitle1" sx={{ ml: 1 }}>
                {exists ? "Edit Room" : "Create Room"}
              </Typography>
              <IconButton onClick={() => setOpen(false)}>
                <SvgIcon>
                  <XMarkIcon />
                </SvgIcon>
              </IconButton>
            </Stack>
            <Divider />
            <RoomSidebarInput />
          </form>
        )}
      </Formik>
    </Drawer>
  );
}

export function AddRoomButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <RoomSidebar
        open={open}
        setOpen={setOpen}
        room={
          {
            code: "",
            name: "",
            groups: groupsForCount(1),
            created: new Date().toISOString(),
          } as Room
        }
      />
      <IconButton onClick={() => setOpen(true)}>
        <SvgIcon>
          <PlusIcon />
        </SvgIcon>
      </IconButton>
    </>
  );
}
