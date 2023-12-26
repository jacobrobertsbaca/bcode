import { roomExists } from "@/app/actions";
import { SupportedLanguages } from "@/components/code/languages";
import { z } from "zod";

/**
 * These can't be used as codes because existing routes would shadow them
 */
const DisallowedCodes = ["rooms"];

export const RoomGroupSchema = z.object({
  no: z.number().int().positive(),
  name: z.string().trim().min(1, "Can't be empty").max(30, "Can't be more than 30 characters"),
});

const CodeSchema = z
  .string()
  .regex(/^[a-zA-Z0-9-]+$/, "Only alphanumeric characters and hyphens")
  .toLowerCase()
  .min(1, "Can't be empty")
  .max(30, "Can't be more than 30 characters")
  .refine((code) => !DisallowedCodes.includes(code.toLocaleLowerCase()), "This room name is not allowed");

export const RoomSchema = z.object({
  code: CodeSchema,
  name: z.string().trim().min(1, "Can't be empty").max(60, "Can't be more than 60 characters"),
  language: z.enum(SupportedLanguages.map((l) => l.name) as [(typeof SupportedLanguages)[number]["name"]]),
  groups: RoomGroupSchema.array()
    .min(1, "You must have at least one group!")
    .max(8, "For performance reasons, you can't have more than 8 groups")
    .refine((arr) => new Set(arr.map((g) => g.no)).size === arr.length, "Can't have duplicate group numbers"),
  created: z.string().datetime(),
});

export const RoomSchemaNew = RoomSchema.extend({
  code: CodeSchema.refine(async (code) => {
    const { data } = await roomExists(code);
    return !data;
  }, "There is already a room with this code!"),
});

export type RoomGroup = z.infer<typeof RoomGroupSchema>;
export type Room = z.infer<typeof RoomSchema>;

export function groupsForCount(count: number): RoomGroup[] {
  return Array.from(Array(count).keys()).map((g) => ({
    no: g + 1,
    name: `Group ${g + 1}`,
  }));
}
