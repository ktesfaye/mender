import { defineContract, procedure } from '@emdash/wire/rpc';
import type { District, Layout } from '@mender/village';
import { z } from 'zod';

/**
 * A state of the village: which of his districts are standing.
 *
 * There is nothing else to say about one. A district is on the map exactly as
 * the artist drew it, or it is open sea where it stood; there is no half-built,
 * no stage and no growth. The camp and the islet are always in here whatever
 * the caller asks for.
 */
export const stateSchema = z.array(z.string());

/**
 * The composed map is our own composer's output, ~350kb of tile and object
 * records, and it crosses the wire on every state change. Validating its shape
 * field by field would cost more than composing it and would protect nothing:
 * nobody outside this app can put a layout on this channel.
 */
const layoutSchema = z.custom<Layout>(() => true);
const districtsSchema = z.custom<readonly District[]>(() => true);

export const villageContract = defineContract({
  map: procedure({
    /** Omit `on` for the state the app is actually in. Naming the districts is
        for looking at a state the village has not reached. */
    input: z.object({ on: stateSchema.optional() }),
    output: z.object({
      layout: layoutSchema,
      /** Which districts are actually standing, the two commons included. */
      on: stateSchema,
      /** The shore pass's own counts, for when the coast comes out wrong. */
      shore: z.record(z.string(), z.number()),
      /** What is standing on the island, and which cells each one owns. */
      districts: districtsSchema,
    }),
  }),
});

export type VillageContract = typeof villageContract;
