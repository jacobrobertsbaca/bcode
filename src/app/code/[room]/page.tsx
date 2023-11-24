import createServer from "@/provider/server";
import { getRooms } from "@/types/Room";
import { notFound } from "next/navigation";
import { Stack, Typography } from "@mui/material";
import QRCode from "react-qr-code";
import { courier } from "@/components/ThemeRegistry/fonts";
import EditorFrame from "@/components/code/EditorFrame";

export default async function CodePage({ params }: { params: { room: string } }) {
  const supabase = createServer();
  const rooms = await getRooms(supabase, params.room);
  if (rooms.length === 0) return notFound();
  const room = rooms[0];

  return (
    <Stack spacing={8} alignItems="center" direction={{
      sm: "column",
      md: "row"
    }}>
      <EditorFrame sx={{ minHeight: "unset", p: 4, flexGrow: 1 }}>
        <QRCode
          value={`https://${process.env.NEXT_PUBLIC_SITE_URL}/${room.code}`}
          fgColor="black"
          bgColor="transparent"
          style={{ width: "100%", height: "100%" }}
        />
      </EditorFrame>
      <Stack flexGrow={2} spacing={2}>
        <Typography variant="h3" fontWeight={600} color="black">
          {room.name}
        </Typography>
        <Typography variant="h4" fontFamily={courier.style.fontFamily} color="black" sx={{ wordWrap: "anywhere" }}>
          {process.env.NEXT_PUBLIC_SITE_URL}/{room.code}
        </Typography>
      </Stack>
    </Stack>
  );
}
