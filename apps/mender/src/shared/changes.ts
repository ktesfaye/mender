import { defineContract, fallible } from '@emdash/wire/rpc';
import { z } from 'zod';

/**
 * One file's change, as it is read on a board.
 *
 * The lines arrive already marked and already cut down to the parts worth
 * looking at: a board is a piece of wood, not a review tool, and a change is
 * something you read rather than something you operate.
 */
export const changeSchema = z.object({
  path: z.string(),
  /** What happened to the file itself, before any of its lines are read. */
  kind: z.enum(['changed', 'new', 'gone', 'binary', 'same']),
  added: z.number().int().nonnegative(),
  taken: z.number().int().nonnegative(),
  /** Marked lines: a leading '+', '-' or ' ', or a '…' saying what was skipped. */
  lines: z.array(z.string()),
  /** How many marked lines there were beyond what is here. */
  more: z.number().int().positive().optional(),
});

export type Change = z.infer<typeof changeSchema>;

export const changeErrorSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('not-a-checkout') }),
  z.object({ kind: z.literal('not-in-the-checkout') }),
  /** Git or the disk said no, in its own words. */
  z.object({ kind: z.literal('unreadable'), because: z.string() }),
]);

export type ChangeError = z.infer<typeof changeErrorSchema>;

export const changesContract = defineContract({
  file: fallible({
    input: z.object({ checkout: z.string(), path: z.string() }),
    data: changeSchema,
    error: changeErrorSchema,
  }),
});

export type ChangesContract = typeof changesContract;
