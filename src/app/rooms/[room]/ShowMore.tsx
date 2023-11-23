"use client";

import { Room } from "@/types/Room";
import {
  CodeRounded,
  DeleteOutlineRounded,
  EditOutlined,
  InsertLinkRounded,
  MoreVert,
} from "@mui/icons-material";
import { Fade, IconButton, ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import React from "react";
import RoomSidebar from "../RoomSidebar";
import { DeleteDialog } from "@/components/DeleteDialog";

export default function ShowMore({ room }: { room: Room }) {
  const [editing, setEditing] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const open = !!anchorEl;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  function onEdit() {
    setEditing(true);
    setAnchorEl(null);
  }

  function onDelete() {
    setDeleting(true);
    setAnchorEl(null);
  }

  return (
    <>
      <IconButton
        id="room-show-more-button"
        aria-controls={open ? "basic-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        onClick={handleClick}
      >
        <MoreVert />
      </IconButton>
      <RoomSidebar open={editing} setOpen={setEditing} room={room} />
      <DeleteDialog
        open={deleting}
        title={`Delete room '${room.name}'?`}
        desc={"This will permanently delete this room and any code that has been written for it."}
        onClose={() => setDeleting(false)}
        onDelete={() => {}}
      />
      <Menu
        id="room-show-more"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          "aria-labelledby": "room-show-more-button",
          dense: true,
        }}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        TransitionComponent={Fade}
        sx={{
          width: "320px",
        }}
        slotProps={{
          paper: {
            sx: {
              width: "320px",
            },
          },
        }}
      >
        <MenuItem onClick={onEdit}>
          <ListItemIcon>
            <EditOutlined />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={onDelete}>
          <ListItemIcon>
            <DeleteOutlineRounded />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
        <MenuItem>
          <ListItemIcon>
            <InsertLinkRounded />
          </ListItemIcon>
          <ListItemText>Show Link</ListItemText>
        </MenuItem>
        <MenuItem>
          <ListItemIcon>
            <CodeRounded />
          </ListItemIcon>
          <ListItemText>Visit</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
