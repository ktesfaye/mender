import { defineContract, fallible } from '@emdash/wire/rpc';
import { z } from 'zod';

/**
 * Looking for something in a checkout.
 *
 * Both questions come back the same shape — a list of files, each with the
 * lines of it that matched when there are any — because the board asks them on
 * the same line and shows the answer the same way.
 */
export const foundSchema = z.object({
  path: z.string(),
  lines: z.array(z.object({ at: z.number().int().positive(), text: z.string() })).optional(),
});

export type Found = z.infer<typeof foundSchema>;

export const findingErrorSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('not-a-checkout') }),
  /** The index is still being built, which the next keystroke usually fixes. */
  z.object({ kind: z.literal('still-reading') }),
  z.object({ kind: z.literal('no-way-to-look'), because: z.string() }),
]);

export type FindingError = z.infer<typeof findingErrorSchema>;

export const findingContract = defineContract({
  named: fallible({
    input: z.object({ checkout: z.string(), like: z.string() }),
    data: z.object({ found: z.array(foundSchema) }),
    error: findingErrorSchema,
  }),
  written: fallible({
    input: z.object({ checkout: z.string(), like: z.string() }),
    data: z.object({ found: z.array(foundSchema) }),
    error: findingErrorSchema,
  }),
});

export type FindingContract = typeof findingContract;
