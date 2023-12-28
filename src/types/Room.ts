import { roomExists } from "@/app/actions";
import { z } from "zod";

export type LanguageInfo = {
  /** The internal name of the language as it appears in the database. */
  name: string,

  /** Must match the CodeMirror `name` property.
   * See [this file](https://github.com/codemirror/language-data/blob/main/src/language-data.ts) for a
   * list of supported languages. */
  cm: string,

  /**
   * The name of the language as it appears in the UI. If undefined, will use {@link cm} instead.
   */
  label?: string
}

/**
 * Languages supported by the app. Syntax highlighting for languages will be dynamically 
 * loaded to conserve on bundle size. 
 * 
 * @remarks The first language listed will be the default selection when creating a room.
 */
export const SupportedLanguages: readonly LanguageInfo[] = Object.freeze([
  {
    name: "cpp",
    cm: "C++",
  },
  {
    name: "python",
    cm: "Python",
  },
]);

/**
 * These can't be used as codes because existing routes would shadow them
 */
const DisallowedCodes = Object.freeze(["rooms"]);

/**
 * Maximum allowed length of starter code in characters
 */
export const MaxStarterCodeLength = 1000;

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
  language: z.enum(SupportedLanguages.map((l) => l.name) as [string]),
  starter_code: z
    .string()
    .max(MaxStarterCodeLength, `Can't be more than ${MaxStarterCodeLength} characters`)
    .optional()
    .transform((s) => s ?? ""),  // Necessary to allow Formik to have empty string
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

export function channelString(room: Room | string, group: RoomGroup | number) {
  if (typeof room === "object") room = room.code;
  if (typeof group === "object") group = group.no;
  return `${room}:${group}`;
}