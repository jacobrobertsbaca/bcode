import { Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { AddRoomButton } from "./RoomSidebar";
import createServer from "@/provider/server";
import { getRooms } from "@/types/Room";
import RoomRow from "./RoomRow";

export const revalidate = 0;

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
          {rooms.length === 0 ? (
            <TableRow>
              <TableCell />
            </TableRow>
          ) : (
            <TableRow
              sx={{
                th: { pb: "8px" },
              }}
            >
              <TableCell>Room</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Created</TableCell>
            </TableRow>
          )}
        </TableHead>
        <TableBody>
          {rooms.map((r) => (
            <RoomRow room={r} />
          ))}
          {rooms.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} height={200} align="center">
                You haven't created any rooms. Click <AddRoomButton /> to create one.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Stack>
  );
}
