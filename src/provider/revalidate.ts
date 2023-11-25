"use server";

import { revalidatePath } from "next/cache";

export async function revalidateRooms() {
  revalidatePath("/rooms");
}