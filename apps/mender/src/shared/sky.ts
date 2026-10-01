import { defineContract, procedure } from '@emdash/wire/rpc';
import { z } from 'zod';

/**
 * The weather where he actually is, as the island needs it.
 *
 * Not a forecast and not a reading to show anybody: the island has no
 * numbers on it. These are the handful of things the sky over it is drawn
 * from, already reduced to what they look like.
 */
export const realWeatherSchema = z.object({
  /** How much of the sky is cloud, nought to one. */
  cloud: z.number(),
  /** Rain falling right now, nought to one, one being a downpour. */
  rain: z.number(),
  /** Snow falling right now, nought to one. */
  snow: z.number(),
  /** Mist, nought to one. */
  fog: z.number(),
  /** Wind, nought to one, one being a gale. */
  wind: z.number(),
  /** Whether the sky is throwing lightning. */
  thunder: z.boolean(),
  /** Today's sunrise and sunset there, in milliseconds since the epoch. */
  sunrise: z.number(),
  sunset: z.number(),
  /** When this was true, so a stale one can be told from a fresh one. */
  at: z.number(),
});
export type RealWeather = z.infer<typeof realWeatherSchema>;

export const bustleSchema = z.object({
  /** The newest commit on any of its own branches, milliseconds since the epoch. */
  last: z.number(),
  /** Commits on its own branches in the last day, and in the last week. */
  today: z.number(),
  week: z.number(),
  /** How many commits the checked-out branch is ahead of where it pushes to;
      dropping to none is a push going out. */
  ahead: z.number(),
});
export type Bustle = z.infer<typeof bustleSchema>;

export const skyContract = defineContract({
  /** Null when the machine is offline or nobody answered; the sky then
      falls back to the clock alone. */
  weather: procedure({
    input: z.object({}),
    output: realWeatherSchema.nullable(),
  }),
  /** When each project was last committed to, on any of its own branches,
      in milliseconds since the epoch: what the moss on a district grows from.
      A project git can't answer for is left out. */
  aging: procedure({
    input: z.object({}),
    output: z.record(z.string(), z.number()),
  }),
  /** How busy each project has been lately, read off git: what the crowd in
      its district grows from. */
  bustle: procedure({
    input: z.object({}),
    output: z.record(z.string(), bustleSchema),
  }),
});

export type SkyContract = typeof skyContract;
