"use server";

import createServer from "@/provider/server";
import { Room, RoomSchema } from "@/types/Room";
import { SupabaseClient } from "@supabase/supabase-js";
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

function success<T = string>(result?: T) {
  return {
    data: (result ?? "Success") as T,
    error: null,
  };
}

/**
 * Returns whether the room with a given code exists.
 * @param code The code of the room to check.
 * @param owner If defined, will only return true if the existing room was created by this user.
 * @returns `true` if the room exists, `false` otherwise.
 */
export async function roomExists(code: string, owner?: string) {
  try {
    const supabase = createServer();
    let query = supabase.from("rooms").select("*", { count: "exact", head: true }).eq("code", code).throwOnError();
    if (owner) query = query.eq("owner", owner);
    const { count } = await query;
    return success(count! > 0);
  } catch (err: any) {
    return failure(500, err.message);
  }
}

export async function upsertRoom(room: Room) {
  try {
    /* Validate provided room against schema */
    const result = await RoomSchema.safeParseAsync(room);
    if (result.success) room = result.data;
    else return failure(400, result.error.message);

    /* Ensure user is logged in */
    const supabase = createServer();
    const owner = (await supabase.auth.getUser()).data?.user?.id;
    if (!owner) return failure(401, "Unauthorized");

    /* Get existing room with this code, if any */
    const { data: existing } = await supabase
      .from("rooms")
      .select("owner, groups")
      .eq("code", room.code)
      .maybeSingle()
      .throwOnError();

    /* If room exists but is not owned by this user, abort */
    if (existing && existing.owner != owner) return failure(401, "Unauthorized");

    /* Upsert room to database */
    await supabase
      .from("rooms")
      .upsert({ owner, ...room })
      .throwOnError();
      
    revalidatePath("/rooms");
    revalidatePath(`/rooms/${room.code}`);
    return success();
  } catch (err: any) {
    return failure(500, err.message);
  }
}

export async function deleteRoom(code: string) {
  try {
    const supabase = createServer();

    /* Ensure user is logged in */
    const owner = (await supabase.auth.getUser()).data?.user?.id;
    if (!owner) return failure(401, "Unauthorized");

    /* Verify that room owned by this user exists */
    const { data, error } = await roomExists(code, owner);
    if (error) throw new Error(error.message);
    if (!data) return success();

    /* Delete the associated room row and code */
    await Promise.all([
      supabase.from("rooms").delete().eq("code", code).throwOnError(),
      supabase.from("diffs").delete().like("channel", `${code}-_`).throwOnError(),
    ]);

    revalidatePath("/rooms");
    return success();
  } catch (err: any) {
    return failure(500, err.message);
  }
}
