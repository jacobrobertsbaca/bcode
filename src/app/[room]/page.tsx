import { courier } from "@/components/ThemeRegistry/fonts";
import createServer from "@/provider/server";
import { getRooms } from "@/types/Room";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import { notFound } from "next/navigation";
import GuestView from "./GuestView";
import { CloseRounded } from "@mui/icons-material";

export default async function GuestRoomPage({ params }: { params: { room: string } }) {
  const supabase = createServer();
  const rooms = await getRooms(supabase, params.room);
  if (rooms.length === 0) return notFound();
  const room = rooms[0];
  return <GuestView room={room} />
}
