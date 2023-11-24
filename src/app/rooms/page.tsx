import { Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { AddRoomButton } from "./RoomSidebar";
import createServer from "@/provider/server";
import { Room, getRooms } from "@/types/Room";
import RoomRow from "./RoomRow";

export default async function RoomsLayout() {
  const supabase = createServer();
  const rooms = await getRooms(supabase);

  return (
    <Stack>
      <Stack direction="row" alignContent="center">
        <Typography variant="h5">Your Rooms</Typography>
        <AddRoomButton />
      </Stack>

      <Table sx={{ width: 1 }}>
        <TableHead>
          <TableRow
            sx={{
              th: { pb: "8px" },
            }}
          >
            <TableCell>Room</TableCell>
            <TableCell>Code</TableCell>
            <TableCell>Created</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rooms.map((r) => (
            <RoomRow room={r} />
          ))}
        </TableBody>
      </Table>
    </Stack>
  );
}
