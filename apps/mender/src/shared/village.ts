import { defineContract, procedure } from '@emdash/wire/rpc';
import type { Layout } from '@mender/village';
import { z } from 'zod';

/** Plot id -> stage, 0..5. A plot not named has no project and is open sea. */
export const stagesSchema = z.record(z.string(), z.number().int().min(0).max(5));

/**
 * The composed map is our own composer's output, ~350kb of tile and object
 * records, and it crosses the wire on every state change. Validating its shape
 * field by field would cost more than composing it and would protect nothing:
 * nobody outside this app can put a layout on this channel.
 */
const layoutSchema = z.custom<Layout>(() => true);

export const villageContract = defineContract({
  map: procedure({
    /** Omit `stages` for the state the app is actually in. Naming them is for
        looking at a state the village has not reached. */
    input: z.object({ stages: stagesSchema.optional() }),
    output: z.object({
      layout: layoutSchema,
      /** The state as drawn, with every ancestor lane filled in. */
      stages: stagesSchema,
      /** The shore pass's own counts, for when the coast comes out wrong. */
      shore: z.record(z.string(), z.number()),
    }),
  }),
});

export type VillageContract = typeof villageContract;
