import { defineContract, procedure } from '@emdash/wire/rpc';
import { z } from 'zod';

/**
 * A session on a timetable.
 *
 * Cut exactly like the empty hook cuts one — the same worktree, the same
 * first-thing-said — except nothing pressed the hook. Only while the app is
 * running: there is no OS-level cron entry and no hook installed on the
 * checkout, so a schedule due while Mender is closed simply waits for the
 * next tick after it opens again.
 */
export const scheduleWhenSchema = z.discriminatedUnion('kind', [
  /** Every morning (or any time of day) at a fixed local clock time. */
  z.object({ kind: z.literal('daily'), time: z.string() }),
  /** Every N hours, counted from whenever it last ran (or was made). */
  z.object({ kind: z.literal('hours'), n: z.number().int().positive() }),
  /** Watched: the base branch's own ref moving is the trigger, no hooks. */
  z.object({ kind: z.literal('push') }),
]);

export type ScheduleWhen = z.infer<typeof scheduleWhenSchema>;

export const scheduleSchema = z.object({
  id: z.string(),
  project: z.string(),
  /** The first thing said in the session it cuts. */
  what: z.string(),
  /** Which agent works in the session it cuts. */
  agent: z.string(),
  kind: z.enum(['chat', 'terminal']).optional(),
  when: scheduleWhenSchema,
  lastRun: z.string().nullable(),
});

export type Schedule = z.infer<typeof scheduleSchema>;

export const scheduleHandSchema = z.object({ id: z.string(), name: z.string() });
export type ScheduleHand = z.infer<typeof scheduleHandSchema>;

export const schedulesContract = defineContract({
  list: procedure({ input: z.object({ project: z.string() }), output: z.array(scheduleSchema) }),
  /** Who could work a schedule's session — every ACP-capable agent this
      machine knows about, whether or not it is installed yet. */
  agents: procedure({ input: z.object({}), output: z.array(scheduleHandSchema) }),
  add: procedure({
    input: z.object({
      project: z.string(),
      what: z.string(),
      agent: z.string(),
      kind: z.enum(['chat', 'terminal']).optional(),
      when: scheduleWhenSchema,
    }),
    output: z.array(scheduleSchema),
  }),
  remove: procedure({
    input: z.object({ id: z.string() }),
    output: z.array(scheduleSchema),
  }),
});

export type SchedulesContract = typeof schedulesContract;
