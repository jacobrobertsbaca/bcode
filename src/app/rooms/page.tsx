import { courier } from "@/components/ThemeRegistry/fonts";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";

const rooms = [
  { id: 1, room: "hello", code: "hello-room" },
  { id: 2, room: "Recursive Subsequences", code: "rec-subseq" },
  { id: 3, room: "Big bad", code: "big-bad" },
  { id: 4, room: "Week 9", code: "aut23-wk9" },
];

export default function RoomsLayout() {
  return (
      <Table sx={{ width: 1, position: "relative", top: ['48px', '56px', '64px'] }}>
        <TableHead>
          <TableRow>
            <TableCell>Room</TableCell>
            <TableCell>Code</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rooms.map((r) => (
            <TableRow key={r.id}>
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
