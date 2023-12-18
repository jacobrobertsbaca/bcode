"use client";

import { Room } from "@/types/Room";
import { DeleteOutlineRounded, EditOutlined, MoreVert } from "@mui/icons-material";
import { Fade, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from "@mui/material";
import React from "react";
import RoomSidebar from "../RoomSidebar";
import { DeleteDialog } from "@/components/DeleteDialog";
import createClient from "@/provider/client";
import { useRoomState } from "@/state/room";
import { useRouter } from "@/components/navigation/AppProgressBar";
import { revalidateRooms } from "@/provider/revalidate";
import { deleteRoom } from "@/app/actions";

export default function ShowMore({ room }: { room: Room }) {
  const [editing, setEditing] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const updatePeers = useRoomState((state) => state.update);
  const router = useRouter();
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
        title={
          <>
            Delete room{" "}
            <Typography variant="inherit" fontWeight={600} display="inline">
              {room.name}
            </Typography>
            ?
          </>
        }
        desc={
          "This will permanently delete this room and any code that has been written for it. All participants in the room will be disconnected."
        }
        onClose={() => setDeleting(false)}
        onDelete={async () => {
          const { error } = await deleteRoom(room.code);
          if (error) throw new Error(error.message);
          await updatePeers(null);
          router.replace("/rooms");
        }}
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
          width: "200px",
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
      </Menu>
    </>
  );
}
