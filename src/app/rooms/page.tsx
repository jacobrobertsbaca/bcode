import { courier } from "@/components/ThemeRegistry/fonts";
import { Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import RoomSidebarButton from "./RoomSidebar";
import createServer from "@/provider/server";
import { Room } from "@/types/Room";

function formatDateString(iso8601: string) {
  const date = new Date(iso8601);
  return date.toLocaleDateString('en-US', {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

export default async function RoomsLayout() {
  const supabase = createServer();
  const { data: { user }, error } = await supabase.auth.getUser();
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
        <TableRow sx={{
          "th": { pb: "8px" }
        }}>
          <TableCell>
            Room <RoomSidebarButton />
          </TableCell>
          <TableCell>Code</TableCell>
          <TableCell>Created</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rooms.map((r) => (
          <TableRow hover key={r.code}>
            <TableCell>{r.name}</TableCell>
            <TableCell>
              <Typography variant="inherit" fontFamily={courier.style.fontFamily}>
                {r.code}
              </Typography>
            </TableCell>
            <TableCell>{formatDateString(r.created)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
