import { defineContract, liveModel, liveState, procedure } from '@emdash/wire/rpc';
import { z } from 'zod';
import { moodSchema } from './agents';

/**
 * A lead and its crew, as the lead's screen reads them.
 *
 * One row per session a lead is responsible for: what it is, what state it is
 * in, how long, how far through its plan, whether it is going in circles,
 * whether the lead has escalated it, and what the lead has already tried. The
 * same row is what the lead's own tools say in words, so the screen and the
 * lead never disagree about a session.
 */

export const stuckViewSchema = z.object({
  kind: z.enum(['circling', 'silent', 'idle-hands']),
  /** The evidence, in a sentence. */
  said: z.string(),
  /** When the village first noticed. */
  since: z.number(),
});

export const mergeRequestSchema = z.object({
  number: z.number().optional(),
  url: z.string().optional(),
  title: z.string().optional(),
  state: z.enum(['none', 'open', 'draft', 'merged', 'closed']),
  ci: z.enum(['none', 'running', 'passed', 'failed']),
  failedChecks: z.array(z.string()),
  review: z.string().optional(),
  /** Approvals so far and how many it needs, where the host says. */
  approvals: z.object({ have: z.number(), need: z.number() }).optional(),
  provider: z.enum(['github', 'gitlab']).optional(),
  /** Review comments nobody has resolved. */
  unresolved: z.number(),
  changed: z.object({ files: z.number(), added: z.number(), removed: z.number() }).optional(),
  /** Why nothing is known, when nothing is. */
  unknown: z.string().optional(),
});
export type MergeRequest = z.infer<typeof mergeRequestSchema>;

export const stageSchema = z.enum([
  'picked-up',
  'developing',
  'testing',
  'opening-mr',
  'in-review',
  'merged',
]);

export const crewRowSchema = z.object({
  task: z.string(),
  title: z.string(),
  /** The Jira ticket it took, when it took one. */
  ticket: z.object({ site: z.string(), key: z.string() }).optional(),
  branch: z.string(),
  mood: moodSchema,
  /** Where the ticket stands, read from what it did and from the merge request. */
  stage: stageSchema,
  /** Said on its own word: it ran the command that opens a merge request and the host could not be asked. */
  stageOnItsWord: z.boolean().optional(),
  stageSince: z.number(),
  /** Pictures from its latest testing on the device that still exist on disk, oldest first. */
  shots: z.array(z.string()),
  /** The merge request as the host last said, once there is one to ask about. */
  mr: mergeRequestSchema.optional(),
  /** The one line the lantern says. */
  doing: z.string(),
  /** When the turn it is working on began. */
  since: z.number().optional(),
  /** When the session itself began. */
  began: z.number().optional(),
  model: z.string().nullable(),
  plan: z.object({ done: z.number(), total: z.number(), now: z.string().optional() }),
  stuck: stuckViewSchema.optional(),
  /** What it is asking, while it is asking something. */
  asked: z
    .object({ text: z.string(), options: z.array(z.string()), requestId: z.string().optional() })
    .optional(),
  /** Waiting out a limit, or broken, and why. */
  failure: z
    .object({
      doing: z.string(),
      kind: z.string().optional(),
      resetAt: z.number().optional(),
      bankable: z.boolean(),
    })
    .optional(),
  /** Restarted by the lead this many times since it last worked. */
  restarts: z.number(),
  nudges: z.object({ count: z.number(), at: z.number().optional(), said: z.string().optional() }),
  /** The lead could not decide this and put it to the person. */
  escalated: z.object({ question: z.string(), at: z.number() }).optional(),
  /** Being set up right now: the workspace is being cut. */
  launching: z.object({ at: z.number() }).optional(),
  helpers: z.number(),
  background: z.number(),
  /** What the lead said that it has not read yet. */
  queued: z.number(),
  /** What it last said, a line. */
  last: z.string().optional(),
});
export type CrewRow = z.infer<typeof crewRowSchema>;

export const crewContract = defineContract({
  /** Every lead's crew, keyed by the lead's task id, as it changes. */
  rows: liveModel({
    key: z.object({ lead: z.string() }),
    states: { list: liveState({ data: z.array(crewRowSchema) }) },
  }),
  /** One crew session's merge request, read when asked (it is not cheap to keep live). */
  merge: procedure({ input: z.object({ task: z.string() }), output: mergeRequestSchema }),
});
