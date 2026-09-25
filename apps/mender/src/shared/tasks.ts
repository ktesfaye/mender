import { defineContract, fallible, liveModel, liveState, procedure } from '@emdash/wire/rpc';
import { z } from 'zod';

export const taskSchema = z.object({
  id: z.string(),
  project: z.string(),
  /** What it was called when it was cut, which is what the branch is made of. */
  name: z.string(),
  /** What it is called now: the agent's own name for it, or yours. */
  title: z.string(),
  /** Set once you have named it yourself, so nothing renames it back. */
  named: z.boolean().optional(),
  /** Who works in here. */
  agent: z.string().optional(),
  /** What they think with, when they next start. */
  model: z.string().nullable().optional(),
  branch: z.string(),
  /** The branch it was cut from, so the board can say what was done in here. */
  base: z.string().nullable().optional(),
  /** Which of the district's buildings it stands in, if it got one. */
  slot: z.number().int().nonnegative().nullable(),
  path: z.string(),
  startedAt: z.string(),
});

export type Task = z.infer<typeof taskSchema>;

export const taskErrorSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('no-such-project') }),
  /** Nothing was written on the board. */
  z.object({ kind: z.literal('nameless') }),
  z.object({ kind: z.literal('already-here'), name: z.string() }),
  /** Something is already standing in that building. */
  z.object({ kind: z.literal('taken') }),
  /** The workspace registry refused, and this is what it said. */
  z.object({ kind: z.literal('refused'), because: z.string() }),
]);

export const tasksContract = defineContract({
  /** Every session there is, as it changes. */
  all: liveModel({
    key: z.void().optional(),
    states: { list: liveState({ data: z.array(taskSchema) }) },
  }),
  list: procedure({
    input: z.object({ project: z.string().optional() }),
    output: z.array(taskSchema),
  }),
  /** Cut a worktree and start a session in it. */
  begin: fallible({
    input: z.object({
      project: z.string(),
      name: z.string(),
      /** Which building to stand it in. Null when the district has no room. */
      slot: z.number().int().nonnegative().nullable(),
    }),
    data: taskSchema,
    error: taskErrorSchema,
  }),
  /**
   * What is in that checkout, by name.
   *
   * An @ on the line you write on is how a file is named to whoever is working
   * in there, and this is what that @ is asking.
   */
  files: procedure({
    input: z.object({ id: z.string(), like: z.string() }),
    output: z.array(z.string()),
  }),
  /** Call it something else, and mean it. */
  rename: procedure({
    input: z.object({ id: z.string(), title: z.string() }),
    output: z.array(taskSchema),
  }),
  abandon: procedure({ input: z.object({ id: z.string() }), output: z.array(taskSchema) }),
  /**
   * The last session taken down in this project this sitting, if putting it
   * back up is still on offer. Gone once revived, once another is taken down
   * in its place, or once the app restarts — it is not written down anywhere.
   */
  revivable: procedure({
    input: z.object({ project: z.string() }),
    output: z.object({ title: z.string() }).nullable(),
  }),
  /** Cuts a fresh worktree from the same branch and stands it back up. */
  revive: fallible({
    input: z.object({ project: z.string() }),
    data: taskSchema,
    error: taskErrorSchema,
  }),
});

export type TasksContract = typeof tasksContract;
