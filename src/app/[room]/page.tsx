import GuestView from "./GuestView";
import { getPageRoom } from "../actions";

export default async function GuestRoomPage({ params }: { params: { room: string } }) {
  const room = await getPageRoom(params.room);
  return <GuestView room={room} />;
}

export async function generateMetadata({ params }: { params: { room: string } }) {
  const room = await getPageRoom(params.room);
  return {
    title: room.name,
  };
}
