"use client";

import { Room, RoomSchema, RoomSchemaNew, groupsForCount } from "@/types/Room";
import { Box, Divider, Drawer, IconButton, Stack, SvgIcon, Typography, styled } from "@mui/material";
import { Formik } from "formik";
import React, { Ref, forwardRef, useState } from "react";

import PlusIcon from "@heroicons/react/24/outline/PlusCircleIcon";
import XMarkIcon from "@heroicons/react/24/solid/XMarkIcon";
import { toFormikValidationSchema } from "zod-formik-adapter";
import RoomSidebarInput from "./RoomSidebarInput";
import { enqueueSnackbar } from "notistack";
import { useRouter } from "@/components/navigation/AppProgressBar";
import { upsertRoom } from "../actions";
import { SupportedLanguages } from "@/types/Room";

import SimpleBarCore from "simplebar-core";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";

const StyledSimpleBar = styled(SimpleBar)(({ theme }) => ({
  ".simplebar-scrollbar::before": {
    backgroundColor: theme.palette.background.contrast,
  },
}));

const Form = styled("form")({
  display: "flex",
  flexDirection: "column",
  height: "100%",
});

const Scrollbar = forwardRef(({ children }: { children: React.ReactNode }, ref: Ref<SimpleBarCore | null>) => (
  <Box sx={{ width: "100%", flexGrow: 1, overflow: "hidden" }}>
    <StyledSimpleBar sx={{ maxHeight: "100%" }} ref={ref}>
      {children}
    </StyledSimpleBar>
  </Box>
));

type RoomSidebarProps = {
  room: Room;
  open: boolean;
  setOpen: (open: boolean) => void;
};

export default function RoomSidebar({ room, open, setOpen }: RoomSidebarProps) {
  const exists = !!room.code;
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  /* Show a shadow on header when user scrolls */
  function onScrollMounted(bar: SimpleBarCore | null) {
    const scrollEl = bar?.getScrollElement();
    const scrollHandler = () => setScrolled((scrollEl?.scrollTop ?? 0) > 15);
    scrollEl?.addEventListener("scroll", scrollHandler);
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={() => setOpen(false)}
      sx={{ zIndex: 1050 }}
      PaperProps={{
        sx: { width: { xs: 1, sm: 650 }, border: "none", overflow: "hidden" },
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

            try {
              const { error } = await upsertRoom(room);
              if (error) throw new Error(error.message);
              if (exists) {
                router.refresh();
                setOpen(false);
              } else {
                router.push(`/rooms/${room.code}`);
              }
            } catch (error: any) {
              enqueueSnackbar(`Couldn't save room: ${error?.message}`);
              return actions.setSubmitting(false);
            }
          })();
        }}
      >
        {(props) => (
          <Form onSubmit={props.handleSubmit}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{
                px: 1,
                py: 2,
                transition: "box-shadow 250ms",
                boxShadow: scrolled ? "0 2px 6px rgba(0, 0, 0, 0.20)" : undefined,
              }}
            >
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
            <Scrollbar ref={onScrollMounted}>
              <RoomSidebarInput />
            </Scrollbar>
          </Form>
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
        room={{
          code: "",
          name: "",
          language: SupportedLanguages[0].name,
          starter_code: "",
          groups: groupsForCount(1),
          created: new Date().toISOString(),
        }}
      />
      <IconButton onClick={() => setOpen(true)}>
        <SvgIcon>
          <PlusIcon />
        </SvgIcon>
      </IconButton>
    </>
  );
}
