"use client";

import { Room, RoomSchema } from "@/types/Room";
import { Divider, Drawer, IconButton, Stack, SvgIcon, Typography } from "@mui/material";
import { Formik } from "formik";
import React from "react";

import PlusIcon from "@heroicons/react/24/outline/PlusCircleIcon";
import XMarkIcon from "@heroicons/react/24/solid/XMarkIcon";
import { toFormikValidationSchema } from "zod-formik-adapter";
import RoomSidebarInput from "./RoomSidebarInput";
import supabase from "@/provider/supabase";
import { enqueueSnackbar } from "notistack";
import { useRouter } from "next/navigation";

type RoomSidebarProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

function RoomSidebar({ open, setOpen }: RoomSidebarProps) {
  const router = useRouter();
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
        initialValues={
          {
            code: "",
            name: "",
            groups: [],
            created: new Date().toISOString()
          } as Room
        }
        validationSchema={toFormikValidationSchema(RoomSchema)}
        onSubmit={async (room, actions) => {
          const { error } = await supabase.from("rooms").insert(room).select();
          if (error) enqueueSnackbar(`Couldn't save room: ${error.message}`, { variant: "error" });
          else router.push(`/rooms/${room.code}`);       
        }}
      >
        {(props) => (
          <form onSubmit={props.handleSubmit}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1, py: 2 }}>
              <Typography variant="subtitle1" sx={{ ml: 1 }}>
                Create Room
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

export default function RoomSidebarButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <RoomSidebar open={open} setOpen={setOpen} />
      <IconButton onClick={() => setOpen(true)}>
        <SvgIcon>
          <PlusIcon />
        </SvgIcon>
      </IconButton>
    </>
  );
}
