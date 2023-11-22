import { Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import RoomSidebarButton from "./RoomSidebar";
import createServer from "@/provider/server";
import { Room } from "@/types/Room";
import RoomRow from "./RoomRow";

export default async function RoomsLayout() {
  const supabase = createServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || user === null) throw new Error("No user found");
  const { data } = await supabase
    .from("rooms")
    .select("code, name, groups, created")
    .eq("owner", user.id)
    .order("created", { ascending: false })
    .throwOnError();

  const rooms = data as Room[];

  return (
    <Table sx={{ width: 1 }}>
      <TableHead>
        <TableRow
          sx={{
            th: { pb: "8px" },
          }}
        >
          <TableCell>
            Room <RoomSidebarButton />
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
