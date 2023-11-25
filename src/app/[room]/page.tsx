import createServer from "@/provider/server";
import { getRoom } from "@/types/Room";
import GuestView from "./GuestView";

export default async function GuestRoomPage({ params }: { params: { room: string } }) {
  const room = await getRoom(createServer(), params.room);
  return <GuestView room={room} />
}

export async function generateMetadata({ params }: { params: { room: string }}) {
  const room = await getRoom(createServer(), params.room);
  return {
    title: room.name
  };
}
