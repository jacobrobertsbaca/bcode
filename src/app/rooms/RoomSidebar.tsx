"use client";

import { Room } from "@/types/Room";
import { Drawer, IconButton, SvgIcon } from "@mui/material";
import { Formik } from "formik";
import React from "react";
import PlusIcon from "@heroicons/react/24/outline/PlusCircleIcon";

type RoomSidebarProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

function RoomSidebar({ open, setOpen }: RoomSidebarProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={() => setOpen(false)}
      PaperProps={{
        sx: { width: { xs: 1, sm: 800 }, border: "none", overflow: "hidden" },
      }}
    >
      <Formik
        initialValues={
          {
            code: "",
            name: "",
            groups: [],
          } as Room
        }
        onSubmit={(values, actions) => {}}
      >
        {(props) => <form onSubmit={props.handleSubmit}></form>}
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
