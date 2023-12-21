import RoomCode from "./RoomCode";
import { getPageRoom } from "@/app/actions";

export default async function CodePage({ params }: { params: { room: string } }) {
  const room = await getPageRoom(params.room);
  return <RoomCode room={room} />;
}

export async function generateMetadata({ params }: { params: { room: string } }) {
  const room = await getPageRoom(params.room);
  return {
    title: `QR Code | ${room.name}`,
  };
}
