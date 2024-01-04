"use server";

/**
 * This file contains a variety of Next.js server actions which exclusively handle
 * interactions with the database. You can think of this file as defining the client API
 * for this project, including any authentication checks to ensure security. All accesses
 * to database should be done here.
 *
 * For more information about Next.js server actions, see
 * https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
 *
 */

import createServer from "@/provider/server";
import { ChannelEvents } from "@/provider/events";
import { Room, RoomGroup, RoomSchema, channelMask, channelString, parseChannelString } from "@/types/Room";
import { difference } from "lodash";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { decodeUpdateV2, mergeUpdatesV2, Doc, encodeStateAsUpdateV2 } from "yjs";

/**
 * Millisecond grace period when saving updates to a room that is locked.
 * See the comment in {@link saveDocument} for more information.
 */
const LockSaveGracePeriodMs = 5000;

/*
 * ============================================================================
 *  Utility Functions
 * ============================================================================
 */

/**
 * The Supabase tables used for the app.
 * Change these values if the names of any tables change.
 */
enum Tables {
  Rooms = "rooms",
  Updates = "updates",
  AggregateUpdates = "updates_agg",
}

/**
 * Returns a failure to the caller.
 * @param httpCode The [HTTP status code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status) for the error.
 * @param message An error message to return the caller of the server action.
 * @returns A failure response.
 */
function failure(httpCode: number, message: string) {
  return {
    data: null,
    error: {
      status: httpCode,
      message,
    },
  };
}

/**
 * Returns a success to the caller.
 * @param result The data to be passed back to the caller.
 * @returns A success response.
 */
function success<T = string>(result?: T) {
  return {
    data: (result !== undefined ? result : "Success") as T,
    error: null,
  };
}

/**
 * Gets the ID of the current user.
 * @returns The user ID
 */
async function getUser(): Promise<string | undefined> {
  const supabase = createServer(true);
  return (await supabase.auth.getUser()).data.user?.id;
}

/**
 * Encodes `buffer` to a `bytea` format Supabase understands.
 * @param buffer A byte buffer
 * @returns A string encoding of `buffer`
 */
function encodeBytes(buffer: Buffer): string {
  return `\\x${buffer.toString("hex")}`;
}

/**
 * Decodes a Supabase-encoded `bytea` string.
 * @param encoded A string encoding of a Postgres `bytea` value.
 * @returns The decoded buffer of the string
 */
function decodeBytes(encoded: string): Buffer {
  return Buffer.from(encoded.slice(2), "hex");
}

/**
 * Revalidates all Next.js routes associated with the given room code.
 * @param code The room code
 */
function revalidateRoomPaths(code: string) {
  revalidatePath("/rooms");
  revalidatePath(`/rooms/${code}`);
  revalidatePath(`/${code}`);
  revalidatePath(`/code/${code}`);
}

/**
 * Notifies the participants of a room that the room has been updated.
 * @param code The room code
 */
async function notifyParticipants(code: string) {
  /* Connect to channel */
  const channel = createServer().channel(code, { config: { broadcast: { ack: true } } });
  await new Promise<void>((resolve, reject) =>
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve();
      else reject(`Failed to subscribe to Supabase channel: ${status}`);
    })
  );

  /* Send update message */
  const result = await channel.send({
    type: "broadcast",
    event: ChannelEvents.Update,
  });

  if (result !== "ok") throw new Error(`Failed to update participants: ${result}`);
}

/*
 * ============================================================================
 *  Document State Actions
 * ============================================================================
 */

/**
 * Saves a YJS document update to the database.
 * @param channel The channel string for this document.
 * @param update The YJS document blob.
 */
export async function saveDocument(channel: string, update: number[]): Promise<void> {
  /* When saving to a channel, we need to ensure that the associated room exists
   * and has the specified group number.
   */

  const updateTs = new Date();
  const [code, group] = parseChannelString(channel);

  const supabase = createServer();
  const { data: room } = await supabase.from(Tables.Rooms)
    .select("groups, lock_time, owner")
    .eq("code", code)
    .maybeSingle()
    .throwOnError();

  if (!room) throw new Error("No such room");
  if (!room.groups.some((g: RoomGroup) => g.no === group)) throw new Error("No such group in room");

  /* Authorize user.
   * 
   * If the room is unlocked, always allow updates.
   * If the room is locked, always allow updates if requester is the host.
   * Otherwise, only allow updates if they are made within a grace period of the time that
   * the room was locked. This policy ensures that lingering updates made at the moment the room
   * was locked are saved to the database, but any updates thereafter are rejected.
   */
  if (room.lock_time && (await getUser()) !== room.owner) {
    const lockTs = new Date(room.lock_time);
    if (updateTs.getTime() - lockTs.getTime() > LockSaveGracePeriodMs) throw new Error("Room is locked");
  }

  /*
   * Validate YJS update by calling `decodeUpdate`. If YJS throws an error
   * while decoding a user-provided update, then we must assume that it is malformed
   * and not accept it.
   */
  const bytes = Buffer.from(update);
  decodeUpdateV2(bytes);

  await createServer()
    .from(Tables.Updates)
    .insert({ channel, update: encodeBytes(bytes) })
    .throwOnError();
}

/**
 * Loads the YJS update for a document from the database.
 * @param channel The channel string for this document.
 * @returns `null` if this document has no saved data, else its document update blob.
 */
export async function loadDocument(channel: string): Promise<number[] | null> {
  const { data } = await createServer()
    .from(Tables.AggregateUpdates)
    .select("updates")
    .eq("channel", channel)
    .maybeSingle()
    .throwOnError();

  if (!data) return null;
  const updates: string[] = data.updates;
  const merged = mergeUpdatesV2(updates.map(decodeBytes));
  return Array.from(merged);
}

/*
 * ============================================================================
 *  Room Management Actions
 * ============================================================================
 */

/**
 * Gets the rooms owned by the current user.
 * @param code If defined, returns a single room with the given code.
 * If undefined, returns all rooms owned by the current user: user must be authorized.
 * @returns An array of {@link Room} objects.
 */
export async function getRooms(code?: string) {
  try {
    const supabase = createServer();
    let query = supabase
      .from(Tables.Rooms)
      .select("code, name, language, starter_code, groups, created, lock_time")
      .throwOnError();
    if (code !== undefined) query = query.eq("code", code);
    else {
      /* Get current user */
      const owner = await getUser();
      if (!owner) return failure(401, "Unauthorized");
      query = query.order("created", { ascending: false }).eq("owner", owner);
    }

    const { data } = await query;
    return success(
      data!.map((d) => ({
        ...d,
        created: new Date(d.created).toISOString(),
        lock_time: undefined,
        locked: !!d.lock_time,
      })) as Room[]
    );
  } catch (err: any) {
    return failure(500, err.message);
  }
}

/**
 * Gets a specific room by code.
 * @param code The room code
 * @returns `null` if the room doesn't exist, or the {@link Room} object
 */
export async function getRoom(code: string) {
  const result = await getRooms(code);
  if (result.error) return result;
  if (result.data.length === 0) return success(null);
  return success(result.data[0]);
}

/**
 * Gets a specific room for a page.
 * @param code The room code
 * @returns The {@link Room} object with this code.
 *
 * This wraps {@link getRoom} to make querying rooms easier for pages.
 * Will throw errors. Redirects to 404 if room not found.
 */
export async function getPageRoom(code: string) {
  const { data, error } = await getRoom(code);
  if (error) throw new Error(error.message);
  if (!data) notFound();
  return data;
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
    let query = supabase.from(Tables.Rooms).select("*", { count: "exact", head: true }).eq("code", code).throwOnError();
    if (owner) query = query.eq("owner", owner);
    const { count } = await query;
    return success(count! > 0);
  } catch (err: any) {
    return failure(500, err.message);
  }
}

/**
 * Updates a room's starter code given the existing and new room state.
 * @param existing The existing room state
 * @param room The new room state
 */
async function updateStarterCode({ starter_code = "", groups = [] }: Partial<Room>, room: Room) {
  const changed = starter_code !== room.starter_code;

  /* Determines which groups need to be updated.
   *  - If starter code changes, all groups must be updated.
   *  - Otherwise, only the added groups need to be updated, and only if they don't already have data. */
  async function groupsNeedingUpdate(): Promise<number[]> {
    const allGroups = room.groups.map((g) => g.no);
    if (changed) return allGroups;
    const newGroups = difference(allGroups, groups.map((g) => g.no)); // prettier-ignore
    if (newGroups.length === 0) return newGroups;

    /* Determine if any of new groups have existing data. If so, exclude them */
    const supabase = createServer();
    const { data } = await supabase
      .from(Tables.AggregateUpdates)
      .select("channel")
      .like("channel", channelMask(room))
      .throwOnError();

    return difference(
      newGroups,
      data!.map(({ channel }) => parseChannelString(channel)[1])
    );
  }

  /* Clear all code for existing rooms if starter code changes */
  if (changed) {
    const supabase = createServer();
    await supabase.from(Tables.Updates).delete().like("channel", channelMask(room)).throwOnError();
  }

  /* Find which groups need an update */
  const needsUpdate = await groupsNeedingUpdate();
  if (needsUpdate.length === 0) return;

  /* Generate YJS update blob for starter code */
  const ydoc = new Doc();
  ydoc.getText("codemirror").insert(0, room.starter_code);
  const update = Array.from(encodeStateAsUpdateV2(ydoc));

  /* Save all updated groups concurrently */
  await Promise.all(needsUpdate.map((g) => saveDocument(channelString(room, g), update)));
}

/**
 * Upserts a room.
 * @param room The room object
 *
 * If no room with this code exists, creates it.
 * If the room code exists, user must own the room to modify it.
 */
export async function upsertRoom(room: Room) {
  try {
    /* Validate provided room against schema */
    const result = await RoomSchema.safeParseAsync(room);
    if (result.success) room = result.data;
    else return failure(400, result.error.message);

    /* Ensure user is logged in */
    const supabase = createServer();
    const owner = await getUser();
    if (!owner) return failure(401, "Unauthorized");

    /* Get existing room with this code, if any */
    const { data: existing } = await supabase
      .from(Tables.Rooms)
      .select("owner, starter_code, groups, lock_time")
      .eq("code", room.code)
      .maybeSingle()
      .throwOnError();

    /* If room exists but is not owned by this user, abort */
    if (existing && existing.owner != owner) return failure(401, "Unauthorized");

    /* Upsert room to database */
    const { created, locked, ...rest } = room;
    const row = {
      owner,
      lock_time: room.locked ? existing?.lock_time || new Date().toISOString() : null,
      ...rest,
    };

    if (existing) await supabase.from(Tables.Rooms).update(row).eq("code", room.code).throwOnError();
    else await supabase.from(Tables.Rooms).insert(row).throwOnError();

    /* Update room starter code */
    await updateStarterCode(existing ?? {}, room);

    /* Notify participants of room update */
    revalidateRoomPaths(room.code);
    if (existing) await notifyParticipants(room.code);

    return success();
  } catch (err: any) {
    return failure(500, err.message);
  }
}

/**
 * Deletes a room by code.
 * @param code The room code to delete.
 *
 * If the room doesn't exist, does nothing.
 * If it does, user must own the room to delete it.
 * Deleting a room will delete any code written for it as well.
 */
export async function deleteRoom(code: string) {
  try {
    const supabase = createServer();

    /* Ensure user is logged in */
    const owner = await getUser();
    if (!owner) return failure(401, "Unauthorized");

    /* Verify that room owned by this user exists */
    const { data, error } = await roomExists(code, owner);
    if (error) throw new Error(error.message);
    if (!data) return success();

    /* Delete the associated room row and code */
    await Promise.all([
      supabase.from(Tables.Rooms).delete().eq("code", code).throwOnError(),
      supabase.from(Tables.Updates).delete().like("channel", channelMask(code)).throwOnError(),
    ]);

    /* Notify participants of room delete */
    revalidateRoomPaths(code);
    await notifyParticipants(code);

    return success();
  } catch (err: any) {
    return failure(500, err.message);
  }
}
