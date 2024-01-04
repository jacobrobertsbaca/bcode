import { Stack, SvgIcon, Tooltip, Typography, type TypographyProps } from "@mui/material";
import LockClosed from "@heroicons/react/20/solid/LockClosedIcon";
import { type Room } from "@/types/Room";

export type RoomTitleProps = TypographyProps & {
  room: Room;
  host: boolean;
};

export function RoomTitle({ room, host, ...rest }: RoomTitleProps) {
  return (
    <Typography component="div" {...rest}>
      <Stack direction="row" spacing={1} alignItems="center" display="inline-flex">
        <Typography variant="inherit" fontWeight="inherit">
          {room.name}
        </Typography>
        {room.locked && (
          <Tooltip
            arrow
            placement="right"
            title={`This room is locked${host ? ". Only you can edit it" : " and can't be modified"}`}
          >
            <SvgIcon sx={{ fontSize: "0.5em" }}>
              <LockClosed />
            </SvgIcon>
          </Tooltip>
        )}
      </Stack>
    </Typography>
  );
}
