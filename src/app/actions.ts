"use server";

import createServer from "@/provider/server";
import { revalidatePath } from "next/cache";

function failure(httpCode: number, message: string) {
  return {
    data: null,
    error: {
      status: httpCode,
      message,
    },
  };
}

function success<T>(result?: T) {
  return {
    data: result ?? "Success",
    error: null,
  };
}

export async function deleteRoom(code: string) {
  const supabase = createServer();

  /* Ensure user is logged in */
  const owner = (await supabase.auth.getUser()).data?.user?.id;
  if (!owner) return failure(401, "Unauthorized");

  throw new Error("hahah");
  
  /* Verify that room owned by this user exists */
  let { data } = await supabase
    .from("rooms")
    .select("code")
    .eq("owner", owner)
    .eq("code", code)
    .maybeSingle()
    .throwOnError();
  if (!data) return success();


  /* Delete the associated room row and code */
  await Promise.all([
    supabase.from("rooms").delete().eq("code", code).throwOnError(),
    supabase.from("diffs").delete().like("channel", `${code}-_`).throwOnError(),
  ]);

  revalidatePath("/rooms");
  return success();
}
