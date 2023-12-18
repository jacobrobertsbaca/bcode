"use server";

import createServer from "@/provider/server";
import { revalidatePath } from "next/cache";

function failure(httpCode: number, message: string) {
  return {
    result: null,
    error: {
      status: httpCode,
      message,
    },
  };
}

function success<T>(result?: T) {
  return {
    result: result ?? "Success",
    error: null,
  };
}

export async function deleteRoom(code: string) {
  const supabase = createServer();

  /* Ensure user is logged in */
  const owner = (await supabase.auth.getUser()).data?.user?.id;
  if (!owner) return failure(404, "Unauthorized");

  /* Verify that room owned by this user exists */
  let { data, error } = await supabase.from("rooms").select("code").eq("owner", owner).eq("code", code).maybeSingle();
  if (error) return failure(500, "Error retrieving room");
  if (!data) return success();

  /* Delete the associated room row and code */
  const [{ error: roomError }, { error: codeError }] = await Promise.all([
    supabase.from("rooms").delete().eq("code", code),
    supabase.from("diffs").delete().like("channel", `${code}-_`),
  ]);

  if (roomError || codeError) return failure(500, "Error deleting room data");

  revalidatePath("/rooms");
  return success();
}
