import { courier } from "@/components/ThemeRegistry/fonts";
import { IconButton, SvgIcon, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import RoomSidebarButton from "./RoomSidebar";


const rooms = [
  { id: 1, room: "hello", code: "hello-room" },
  { id: 2, room: "Recursive Subsequences", code: "rec-subseq" },
  { id: 3, room: "Big bad", code: "big-bad" },
  { id: 4, room: "Week 9", code: "aut23-wk9" },
];

export default function RoomsLayout() {
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
        </TableRow>
      </TableHead>
      <TableBody>
        {rooms.map((r) => (
          <TableRow hover key={r.id}>
            <TableCell>{r.room}</TableCell>
            <TableCell>
              <Typography variant="inherit" fontFamily={courier.style.fontFamily}>
                {r.code}
              </Typography>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
