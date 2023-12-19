"use server";

import createServer from "@/provider/server";
import { Room, RoomSchema } from "@/types/Room";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

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
 * Gets the rooms owned by the current user.
 * @param code If defined, returns a single room with the given code. 
 * If undefined, returns all rooms owned by the current user and must be authorized.
 * @returns An array of {@link Room} objects.
 */
export async function getRooms(code?: string) {
  try {
    const supabase = createServer();
    let query = supabase.from("rooms").select("code, name, groups, created").throwOnError();
    if (code !== undefined) query = query.eq("code", code);
    else {
      /* Get current user */
      const owner = (await supabase.auth.getUser()).data.user?.id;
      if (!owner) return failure(401, "Unauthorized");
      query = query.order("created", { ascending: false }).eq("owner", owner);
    }

    const { data } = await query;
    return success(data!.map((d) => ({ ...d, created: new Date(d.created).toISOString() })) as Room[]);
  } catch (err: any) {
    return failure(500, err.message);
  }
}

/**
 * Gets a single room by code.
 * @param code The room code. If no room exists with that code, triggers a 404 response.
 * @returns The {@link Room} with this code.
 */
export async function getRoom(code: string) {
  const result = await getRooms(code);
  if (result.error) return result;
  if (result.data.length === 0) return notFound();
  return success(result.data[0]);
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
