import { courier } from "@/components/ThemeRegistry/fonts";
import createServer from "@/provider/server";
import { getRooms } from "@/types/Room";
import { Button, Stack, Typography } from "@mui/material";
import { notFound } from "next/navigation";
import HostView from "./HostView";
import ShowMore from "./ShowMore";
import Link from "next/link";
import { QrCodeRounded } from "@mui/icons-material";

export default async function HostRoomPage({ params }: { params: { room: string } }) {
  const supabase = createServer();
  const rooms = await getRooms(supabase, params.room);
  if (rooms.length === 0) return notFound();
  const room = rooms[0];

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="start" spacing={2}>
        <Stack>
          <Typography variant="h4">{room.name}</Typography>
          <Typography fontFamily={courier.style.fontFamily} variant="subtitle1">
            {room.code}
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Button startIcon={<QrCodeRounded />} variant="outlined" disableElevation>
            Code
          </Button>
          <Button
            LinkComponent={Link}
            href={`/${room.code}`}
            target="_blank"
            variant="contained"
            sx={{ backgroundColor: "black" }}
            disableElevation
          >
            Visit
          </Button>
          <ShowMore room={room} />
        </Stack>
      </Stack>
      <HostView room={room} />
    </Stack>
  );
}
