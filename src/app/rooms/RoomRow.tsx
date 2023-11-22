"use client";

import { courier } from "@/components/ThemeRegistry/fonts";
import { Room } from "@/types/Room";
import { TableCell, TableRow, Typography } from "@mui/material";
import { useRouter } from "next/navigation";

function formatDateString(iso8601: string) {
  const date = new Date(iso8601);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type RoomRowProps = {
  room: Room;
};

export default function RoomRow({ room }: RoomRowProps) {
  const router = useRouter();
  return (
    <TableRow hover key={room.code} onClick={() => router.push(`/rooms/${room.code}`)} sx={{ cursor: "pointer" }}>
      <TableCell>{room.name}</TableCell>
      <TableCell>
        <Typography variant="inherit" fontFamily={courier.style.fontFamily}>
          {room.code}
        </Typography>
      </TableCell>
      <TableCell>{formatDateString(room.created)}</TableCell>
    </TableRow>
  );
}
