import { defineContract, fallible, procedure } from '@emdash/wire/rpc';
import { z } from 'zod';

export const taskSchema = z.object({
  id: z.string(),
  project: z.string(),
  name: z.string(),
  branch: z.string(),
  slot: z.number().int().nonnegative(),
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
  list: procedure({
    input: z.object({ project: z.string().optional() }),
    output: z.array(taskSchema),
  }),
  /** Cut a worktree and put a building on it. */
  begin: fallible({
    input: z.object({
      project: z.string(),
      name: z.string(),
      slot: z.number().int().nonnegative(),
    }),
    data: taskSchema,
    error: taskErrorSchema,
  }),
  abandon: procedure({ input: z.object({ id: z.string() }), output: z.array(taskSchema) }),
});

export type TasksContract = typeof tasksContract;
