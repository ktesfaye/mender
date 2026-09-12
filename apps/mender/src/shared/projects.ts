import { defineContract, fallible, procedure } from '@emdash/wire/rpc';
import { z } from 'zod';

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  plot: z.string(),
  stage: z.number().int().min(0).max(5),
  foundedAt: z.string(),
});

export type Project = z.infer<typeof projectSchema>;

export const foundErrorSchema = z.discriminatedUnion('kind', [
  /** The folder picker was dismissed. Not a failure, just nothing to do. */
  z.object({ kind: z.literal('cancelled') }),
  z.object({ kind: z.literal('not-a-repository'), path: z.string() }),
  z.object({ kind: z.literal('already-founded'), path: z.string() }),
  /** Twelve plots, and every one of them taken. */
  z.object({ kind: z.literal('island-full') }),
]);

export const projectsContract = defineContract({
  list: procedure({ input: z.object({}), output: z.array(projectSchema) }),
  /** Ask for a folder and put a district on it. */
  found: fallible({ input: z.object({}), data: projectSchema, error: foundErrorSchema }),
  abandon: procedure({ input: z.object({ id: z.string() }), output: z.array(projectSchema) }),
});

export type ProjectsContract = typeof projectsContract;
