import { Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { AddRoomButton } from "./RoomSidebar";
import createServer from "@/provider/server";
import { Room, getRooms } from "@/types/Room";
import RoomRow from "./RoomRow";

export default async function RoomsLayout() {
  const supabase = createServer();
  const rooms = await getRooms(supabase);

  return (
    <Table sx={{ width: 1 }}>
      <TableHead>
        <TableRow
          sx={{
            th: { pb: "8px" },
          }}
        >
          <TableCell>
            Room <AddRoomButton />
          </TableCell>
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
  );
}
