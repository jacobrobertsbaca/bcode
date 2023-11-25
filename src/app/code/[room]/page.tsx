import createServer from "@/provider/server";
import { getRoom } from "@/types/Room";
import RoomCode from "./RoomCode";

export default async function CodePage({ params }: { params: { room: string } }) {
  const room = await getRoom(createServer(), params.room);
  return <RoomCode room={room} />
}

export async function generateMetadata({ params }: { params: { room: string }}) {
  const room = await getRoom(createServer(), params.room);
  return {
    title: `QR Code | ${room.name}`
  };
}
