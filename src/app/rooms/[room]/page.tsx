import { courier } from "@/components/ThemeRegistry/fonts";
import { Button, Stack, SvgIcon, Typography } from "@mui/material";
import HostView from "./HostView";
import ShowMore from "./ShowMore";
import Link from "next/link";
import SquaresIcon from "@heroicons/react/24/outline/Squares2X2Icon";
import EditorOnline from "@/components/code/EditorOnline";
import { getPageRoom } from "@/app/actions";
import { RoomTitle } from "@/components/RoomTitle";

export async function generateMetadata({ params }: { params: { room: string } }) {
  const room = await getPageRoom(params.room);
  return {
    title: room.name,
  };
}

export default async function HostRoomPage({ params }: { params: { room: string } }) {
  const room = await getPageRoom(params.room);
  return (
    <Stack spacing={2}>
      <Stack spacing={1}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems="start" spacing={1}>
          <Stack spacing={1}>
            <RoomTitle room={room} host={true} variant="h4" />
            <Typography fontFamily={courier.style.fontFamily} variant="h5">
              {room.code}
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Button
              startIcon={
                <SvgIcon>
                  <SquaresIcon />
                </SvgIcon>
              }
              href={`/code/${room.code}`}
              target="_blank"
              variant="outlined"
              disableElevation
            >
              Code
            </Button>
            <Button
              LinkComponent={Link}
              href={`/${room.code}`}
              target="_blank"
              variant="contained"
              sx={{ backgroundColor: "background.contrast" }}
              disableElevation
            >
              Visit
            </Button>
            <ShowMore room={room} />
          </Stack>
        </Stack>
        <EditorOnline />
      </Stack>
      <HostView room={room} />
    </Stack>
  );
}
