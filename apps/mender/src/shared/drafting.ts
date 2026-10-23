import { defineContract, procedure } from '@emdash/wire/rpc';
import { z } from 'zod';

/**
 * The drafting table: every design a project's sessions have drawn, kept in
 * the project's own `design/board.json` and committed with it, so it is the
 * project's and not the village's, and outlives any one session.
 *
 * A project is rooms (a screen, a place, a thing being designed). Each room
 * has the plan, which is what gets built, put together a part at a time from
 * whichever pass drew that part best; and the questions that were worked
 * through to get there, each with every pass drawn for it, which ones were
 * picked, and every variant of each kept. What he said goes up as notes,
 * what he turned down for good goes on the never list, and the brief is what
 * whoever draws next is told. The flow is the finished thing walked through
 * from end to end.
 *
 * Pictures are paths relative to the `design/` folder the board sits in.
 */

const said = z.string().optional();

export const draftVariantSchema = z.object({
  name: z.string(),
  image: z.string(),
});

export const draftPassSchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  image: z.string(),
  /** Other looks at the same pass: its states, its draft before review, a close-up. */
  variants: z.array(draftVariantSchema).default([]),
  /** A line on what this pass tried, or what he said about it. */
  said,
  /** The live page it was rendered from, when there is one. */
  page: z.string().optional(),
  at: z.string().optional(),
});

export const draftQuestionSchema = z.object({
  ask: z.string(),
  state: z.enum(['open', 'settled', 'dropped']).default('open'),
  /** Pass ids taken from this question. More than one is fine. */
  picked: z.array(z.string()).default([]),
  passes: z.array(draftPassSchema).default([]),
});

export const draftPartSchema = z.object({
  /** What part of the thing it is: "the book", "pausing". */
  part: z.string(),
  caption: z.string().default(''),
  /** Which pass it comes from. Its picture is that pass's unless `image` says otherwise. */
  pass: z.string().optional(),
  image: z.string().optional(),
  /** The states it has, each its own picture or just its name. */
  states: z.array(z.object({ name: z.string(), image: z.string().optional() })).default([]),
  /** Still being drawn. */
  open: z.boolean().default(false),
});

export const draftNoteSchema = z.object({
  said: z.string(),
  /** A pass id or a question it is about; unattached notes go up beside the board. */
  on: z.string().optional(),
  at: z.string().optional(),
});

export const draftRoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  about: z.string().default(''),
  state: z.enum(['drawing', 'settled', 'waiting']).default('drawing'),
  plan: z.array(draftPartSchema).default([]),
  questions: z.array(draftQuestionSchema).default([]),
  never: z.array(z.string()).default([]),
  notes: z.array(draftNoteSchema).default([]),
  brief: z.string().default(''),
});

export const draftStepSchema = z.object({
  room: z.string().optional(),
  image: z.string(),
  caption: z.string(),
  says: z.string().default(''),
});

export const draftBoardSchema = z.object({
  title: z.string().default(''),
  about: z.string().default(''),
  /** The finished thing, walked through from end to end. */
  flow: z.array(draftStepSchema).default([]),
  /** A picture of how the rooms sit together, when there is one. */
  map: z.string().optional(),
  rooms: z.array(draftRoomSchema).default([]),
});

export type DraftVariant = z.infer<typeof draftVariantSchema>;
export type DraftPass = z.infer<typeof draftPassSchema>;
export type DraftQuestion = z.infer<typeof draftQuestionSchema>;
export type DraftPart = z.infer<typeof draftPartSchema>;
export type DraftNote = z.infer<typeof draftNoteSchema>;
export type DraftRoom = z.infer<typeof draftRoomSchema>;
export type DraftStep = z.infer<typeof draftStepSchema>;
export type DraftBoard = z.infer<typeof draftBoardSchema>;

/** Where a board lives, relative to the checkout. */
export const BOARD_FILE = 'design/board.json';

/** The pass a part or a pick names, wherever in the room it was drawn. */
export function passIn(room: DraftRoom, id: string): DraftPass | undefined {
  for (const question of room.questions) {
    const found = question.passes.find((pass) => pass.id === id);
    if (found) return found;
  }
  return undefined;
}

/** A part's picture: its own, or the pass it came from. */
export function partImage(room: DraftRoom, part: DraftPart): string | undefined {
  return part.image ?? (part.pass ? passIn(room, part.pass)?.image : undefined);
}

export const draftingContract = defineContract({
  /** A checkout's board, if it has one. `stamp` is when it was last written;
      pass the one you have and nothing comes back unless it has changed. */
  read: procedure({
    input: z.object({ path: z.string(), stamp: z.number().optional() }),
    output: z.object({
      board: draftBoardSchema.nullable(),
      stamp: z.number(),
      /** The `design/` folder pictures are relative to. */
      root: z.string(),
      /** Whatever made the file unreadable, in words. */
      trouble: z.string().nullable(),
      same: z.boolean(),
    }),
  }),
});

export type DraftingContract = typeof draftingContract;
