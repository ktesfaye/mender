import { defineContract, procedure } from '@emdash/wire/rpc';
import { z } from 'zod';

/**
 * Watching a page while an agent builds it.
 *
 * A session writing a page, or standing a dev server up, is building something
 * that can be looked at, and reading the code scroll past is not looking at it.
 * So every time it changes, the page is drawn somewhere nobody sees and a
 * picture of it comes back: that picture is what the yard shows, and a row of
 * them is the page coming together.
 */

/** Where on the page the last change landed, as fractions of its width and height. */
export const drewSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});
export type Drew = z.infer<typeof drewSchema>;

export const lookSchema = z.object({
  /** The page as it stands, a jpeg data url. */
  image: z.string(),
  /** What changed since the last look at the same page, when anything did and not all of it. */
  drew: drewSchema.optional(),
  /** Whether anything at all changed since the last look. */
  moved: z.boolean(),
});
export type Look = z.infer<typeof lookSchema>;

export const buildingContract = defineContract({
  /** Draw the page and say what it looks like. Null when it would not load. */
  look: procedure({
    input: z.object({
      /** Whose page this is, so its last look is what a change is measured against. */
      key: z.string(),
      url: z.string(),
      /** How long to let it settle after it loads, for whatever it animates in with. */
      settle: z.number().optional(),
    }),
    output: lookSchema.nullable(),
  }),
  /** Nobody is watching this one any more. */
  forget: procedure({
    input: z.object({ key: z.string() }),
    output: z.void(),
  }),
});
