import { Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { AddRoomButton } from "./RoomSidebar";
import RoomRow from "./RoomRow";
import { Metadata } from "next";
import { getRooms } from "../actions";

export const metadata: Metadata = {
  title: "Rooms",
};

export default async function RoomsLayout() {
  const { data: rooms, error } = await getRooms();
  if (error) throw new Error(error.message);

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
            <RoomRow room={r} key={r.code} />
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
