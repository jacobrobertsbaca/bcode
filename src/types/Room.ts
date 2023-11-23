import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export const RoomGroupSchema = z.object({
  no: z.number().int().positive(),
  name: z.string().trim().min(1, "Can't be empty").max(30, "Can't be more than 30 characters"),
});

export const RoomSchema = z.object({
  code: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/, "Only alphanumeric characters and -_")
    .max(30, "Can't be more than 30 characters"),
  name: z.string().trim().min(1, "Can't be empty").max(60, "Can't be more than 60 characters"),
  groups: RoomGroupSchema.array()
    .min(1, "You must have at least one group!")
    .max(8, "For performance reasons, you can't have more than 8 groups")
    .refine((arr) => new Set(arr.map((g) => g.no)).size === arr.length, "Can't have duplicate group numbers"),
  created: z.string().datetime(),
});

export type RoomGroup = z.infer<typeof RoomGroupSchema>;
export type Room = z.infer<typeof RoomSchema>;

export async function getRooms(supabase: SupabaseClient, code?: string): Promise<Room[]> {
  /* Get current user */
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const owner = userData.user.id;

  /* Get rooms */
  let query = supabase.from("rooms").select("code, name, groups, created").eq("owner", owner);

  if (code !== undefined) query = query.eq("code", code);
  else query = query.order("created", { ascending: false }); 
  query = query.throwOnError();

  const { data } = await query;
  return data?.map(d => ({ ...d, created: (new Date(d.created)).toISOString() })) as Room[];
}
