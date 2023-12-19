import RoomCode from "./RoomCode";
import { getRoom } from "@/app/actions";

export default async function CodePage({ params }: { params: { room: string } }) {
  const { data: room, error } = await getRoom(params.room);
  if (error) throw new Error(error.message);
  return <RoomCode room={room} />;
}

export async function generateMetadata({ params }: { params: { room: string } }) {
  const { data: room, error } = await getRoom(params.room);
  if (error) throw new Error(error.message);
  return {
    title: `QR Code | ${room.name}`,
  };
}
