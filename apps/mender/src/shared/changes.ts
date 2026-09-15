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

/**
 * Which two versions of the file are being compared.
 *
 * Left out, it is the committed one against the one on the disk, which is what
 * "changed" means while you are working. Given a commit, it is that commit
 * against the one before it, which is what "changed" meant when it was made.
 * The parent comes from the caller because the caller already read the commit
 * and a root commit genuinely has none.
 */
export const atSchema = z.object({ sha: z.string(), from: z.string().nullable() });

export type At = z.infer<typeof atSchema>;

export const changesContract = defineContract({
  file: fallible({
    input: z.object({ checkout: z.string(), path: z.string(), at: atSchema.optional() }),
    data: changeSchema,
    error: changeErrorSchema,
  }),
});

export type ChangesContract = typeof changesContract;
