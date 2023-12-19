import GuestView from "./GuestView";
import { getRoom } from "../actions";

export default async function GuestRoomPage({ params }: { params: { room: string } }) {
  const { data: room, error } = await getRoom(params.room);
  if (error) throw new Error(error.message);
  return <GuestView room={room} />;
}

export async function generateMetadata({ params }: { params: { room: string } }) {
  const { data: room, error } = await getRoom(params.room);
  if (error) throw new Error(error.message);
  return {
    title: room.name,
  };
}
