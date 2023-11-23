import { courier } from "@/components/ThemeRegistry/fonts";
import createServer from "@/provider/server";
import { getRooms } from "@/types/Room";
import { Box, Stack, Typography } from "@mui/material";
import { notFound } from "next/navigation";
import HostView from "./HostView";
import ShowMore from "./ShowMore";

export default async function HostRoomPage({ params }: { params: { room: string } }) {
  const supabase = createServer();
  const rooms = await getRooms(supabase, params.room);
  if (rooms.length === 0) return notFound();
  const room = rooms[0];

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack>
          <Typography variant="h4">{room.name}</Typography>
          <Typography fontFamily={courier.style.fontFamily} variant="subtitle1">
            {room.code}
          </Typography>
        </Stack>
        <Box>
          <ShowMore room={room} />
        </Box>
      </Stack>
      <HostView room={room} />
    </Stack>
  );
}
