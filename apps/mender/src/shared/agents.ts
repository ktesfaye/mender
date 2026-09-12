import { defineContract, fallible, liveModel, liveState } from '@emdash/wire/rpc';
import { z } from 'zod';

/**
 * The agents, which are the villagers.
 *
 * What crosses this wire is not an ACP session. It is what somebody working in
 * a building looks like from outside it: what mood they are in, what they are
 * doing, what they have done, and whether they are standing at the door waiting
 * to ask you something. The session underneath is emdash's and stays in the
 * main process, where the ACP vocabulary belongs.
 */

/**
 * What a villager is doing, at the distance the island is read from.
 *
 * `empty` is a building nobody has moved into: the worktree is cut and the
 * lights are off. Everything else means somebody is in there.
 */
export const moodSchema = z.enum(['empty', 'arriving', 'working', 'asking', 'resting', 'hurt']);
export type Mood = z.infer<typeof moodSchema>;

export const toneSchema = z.enum(['ink', 'faded', 'keen', 'sore']);

/**
 * One line of what happened in there.
 *
 * `said` is prose and wraps; `deed` is one thing done, with a mark in the
 * margin; `note` is the village talking rather than the agent.
 */
export const lineSchema = z.object({
  kind: z.enum(['said', 'deed', 'note']),
  mark: z.string(),
  text: z.string(),
  tone: toneSchema,
  /** Which end survives when the board is narrower than the line. */
  keep: z.enum(['front', 'tail']).optional(),
});
export type Line = z.infer<typeof lineSchema>;

/** A villager standing at the door with a question, and the ways to answer it. */
export const askSchema = z.object({
  requestId: z.string(),
  text: z.string(),
  options: z.array(z.object({ optionId: z.string(), name: z.string() })),
});
export type Ask = z.infer<typeof askSchema>;

export const workingStateSchema = z.object({
  mood: moodSchema,
  /** One line for what is happening right now. */
  doing: z.string(),
  lines: z.array(lineSchema),
  asking: askSchema.nullable(),
});
export type WorkingState = z.infer<typeof workingStateSchema>;

export const agentErrorSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('no-such-task') }),
  /** Nothing was said. */
  z.object({ kind: z.literal('nothing') }),
  /** The runtime refused, and this is what it said. */
  z.object({ kind: z.literal('refused'), because: z.string() }),
]);
export type AgentError = z.infer<typeof agentErrorSchema>;

export const agentsContract = defineContract({
  /** What is going on in one building, as it goes on. */
  work: liveModel({
    key: z.object({ task: z.string() }),
    states: {
      state: liveState({ data: workingStateSchema }),
    },
  }),
  /** Say something to whoever is in there, moving somebody in if nobody is. */
  tell: fallible({
    input: z.object({ task: z.string(), text: z.string() }),
    data: z.void(),
    error: agentErrorSchema,
  }),
  /** Answer the question it came to the door with. */
  answer: fallible({
    input: z.object({ task: z.string(), requestId: z.string(), optionId: z.string() }),
    data: z.void(),
    error: agentErrorSchema,
  }),
  /** Tell it to stop what it is doing. */
  hush: fallible({
    input: z.object({ task: z.string() }),
    data: z.void(),
    error: agentErrorSchema,
  }),
  /**
   * The mood of every building with somebody in it.
   *
   * The island reads this one and the board reads `work`: from out on the water
   * you can see which houses are lit and which villager is standing at a door,
   * and you only get the detail by going in.
   */
  island: liveModel({
    key: z.void().optional(),
    states: {
      moods: liveState({ data: z.record(z.string(), moodSchema) }),
    },
  }),
});

export type AgentsContract = typeof agentsContract;
