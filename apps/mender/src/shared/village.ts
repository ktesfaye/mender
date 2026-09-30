import { defineContract, procedure } from '@emdash/wire/rpc';
import type { District, Layout } from '@mender/village';
import { z } from 'zod';

/**
 * A state of the village: which of his districts are standing.
 *
 * There is nothing else to say about one. A district is on the map exactly as
 * the artist drew it, or it is open sea where it stood; there is no half-built,
 * no stage and no growth. The camp and the islet are always in here whatever
 * the caller asks for, and a project may live on the islet.
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
      /** How many cells the islet sailed from where he drew it, `[x, y]`, y up. */
      moored: z.tuple([z.number(), z.number()]),
    }),
  }),
  /** Every place a project could stand, standing or not: his eleven and the
      pieces the big ones give up, and the islet where it is moored today. What
      rearranging the island is drawn on. */
  places: procedure({
    input: z.object({}),
    output: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        /** The district a piece is cut out of. */
        of: z.string().nullable(),
        cells: z.custom<readonly (readonly [number, number, number])[]>(() => true),
      })
    ),
  }),
});

export type VillageContract = typeof villageContract;
