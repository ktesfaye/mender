import { z } from 'zod';

/**
 * The five hours: the subscription's rolling window, and who is spending it.
 *
 * Claude's own usage limit is one meter for the whole account, read off the
 * headers every answer comes back with; which session is eating it is read
 * off each session's own transcript. Both are here so the board can say in
 * one line how full the window is, and the windmill can say who did it.
 */

export const usageWindowSchema = z.object({
  /** How much of it is spent, nought to one. */
  utilization: z.number(),
  /** When it rolls over, epoch milliseconds. */
  resetsAt: z.number(),
});
export type UsageWindow = z.infer<typeof usageWindowSchema>;

export const windowReadingSchema = z.object({
  fiveHour: usageWindowSchema.nullable(),
  sevenDay: usageWindowSchema.nullable(),
  /** When this was read, so a stale reading can say so. */
  at: z.number(),
});
export type WindowReading = z.infer<typeof windowReadingSchema>;

/** One session's share of the window so far. */
export const sessionShareSchema = z.object({
  /** Claude's own id for it. */
  id: z.string(),
  title: z.string(),
  /** The village's own session, when it is one; a terminal Claude has none. */
  task: z.string().nullable(),
  /** The checkout it was run in, by its last name. */
  where: z.string().nullable(),
  /** Its part of everything spent in the window, nought to one. */
  share: z.number(),
  calls: z.number().int(),
  /** What one call re-reads, on average: the whole conversation so far. */
  context: z.number().int(),
  /** Pictures it was handed, each one re-read on every call after. */
  screenshots: z.number().int(),
  lastAt: z.number(),
});
export type SessionShare = z.infer<typeof sessionShareSchema>;

export const fiveHoursSchema = z.object({
  reading: windowReadingSchema.nullable(),
  /** The window's start as the shares were counted from. */
  since: z.number(),
  sessions: z.array(sessionShareSchema),
  /** How the last stretch compares with the window's whole pace: two is twice
      as fast lately, a half is slowing. Null until there is enough to say. */
  lately: z.number().nullable(),
});
export type FiveHours = z.infer<typeof fiveHoursSchema>;

export const FIVE_HOURS_MS = 5 * 60 * 60_000;
export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60_000;

/** Nothing is projected off the first few minutes, or off next to nothing. */
const TOO_EARLY_MS = 10 * 60_000;
const TOO_LITTLE = 0.05;

/**
 * Where the window runs out at its pace so far, or null when it is too early
 * to say. `lately` scales the pace by how the last stretch compares.
 */
export function runsOut(
  window: UsageWindow,
  now: number,
  span = FIVE_HOURS_MS,
  lately: number | null = null
): { start: number; at: number | null } {
  const start = window.resetsAt - span;
  const elapsed = now - start;
  if (window.utilization >= 1) return { start, at: now };
  if (elapsed < TOO_EARLY_MS || window.utilization < TOO_LITTLE) return { start, at: null };
  const left = 1 - window.utilization;
  const pace = (window.utilization / elapsed) * (lately && lately > 0 ? lately : 1);
  return { start, at: now + left / pace };
}

/** "1h50", "35m", "2d 3h". */
export function spanOf(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h${String(minutes % 60).padStart(2, '0')}`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

/** The hour in his own clock, "4:14pm", with the day when it is not today. */
export function clockOf(at: number, now = Date.now()): string {
  const when = new Date(at);
  const today = new Date(now);
  const time = when
    .toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    .replace(/\s/g, '')
    .toLowerCase();
  const sameDay =
    when.getFullYear() === today.getFullYear() &&
    when.getMonth() === today.getMonth() &&
    when.getDate() === today.getDate();
  if (sameDay) return time;
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (
    when.getFullYear() === tomorrow.getFullYear() &&
    when.getMonth() === tomorrow.getMonth() &&
    when.getDate() === tomorrow.getDate()
  )
    return `${time} tomorrow`;
  return `${when.toLocaleDateString(undefined, { weekday: 'short' })} ${time}`;
}

/** "213k", "1.2m". */
export function tokensOf(count: number): string {
  if (count < 1000) return String(count);
  if (count < 1_000_000) return `${Math.round(count / 1000)}k`;
  return `${(count / 1_000_000).toFixed(1)}m`;
}

/**
 * The one line the board says about the window: how full, how far in, and
 * where that pace lands against the reset. `tone` is what ink it earns.
 */
export function windowLine(
  five: FiveHours,
  now = Date.now(),
  /** The board's own line is short, since it shares a row with the branch. */
  short = false
): { said: string; tone: 'quiet' | 'warn' | 'wrong' } | null {
  const window = five.reading?.fiveHour;
  if (!window) return null;
  const used = Math.round(window.utilization * 100);
  const { start, at } = runsOut(window, now, FIVE_HOURS_MS, five.lately);
  const into = spanOf(now - start);
  const reset = clockOf(window.resetsAt, now);
  if (window.utilization >= 1)
    return { said: `five hours: used up, back at ${reset}`, tone: 'wrong' };
  const head = short ? `five hours ${used}% used` : `five hours: ${used}% used after ${into}`;
  if (at === null) return { said: `${head} · resets ${reset}`, tone: 'quiet' };
  if (at < window.resetsAt) {
    const early = spanOf(window.resetsAt - at);
    const tone = window.utilization >= 0.85 ? 'wrong' : 'warn';
    if (short)
      return { said: `${head} · runs out ~${clockOf(at, now)} at this pace, resets ${reset}`, tone };
    return {
      said: `${head} · at this pace it runs out around ${clockOf(at, now)}, ${early} before it resets at ${reset}`,
      tone,
    };
  }
  if (short) return { said: `${head} · lasts to the reset at ${reset}`, tone: 'quiet' };
  return { said: `${head} · at this pace it lasts to the reset at ${reset}`, tone: 'quiet' };
}

/**
 * The board's one line about the five hours: how much of it this session has
 * had, against how full the window is and when it resets.
 */
export function sessionLine(
  five: FiveHours,
  task: string,
  now = Date.now()
): { said: string; tone: 'quiet' | 'warn' | 'wrong' } | null {
  const window = five.reading?.fiveHour;
  if (!window) return null;
  const used = Math.round(window.utilization * 100);
  const reset = clockOf(window.resetsAt, now);
  const mine = five.sessions.find((one) => one.task === task);
  const had = mine ? mine.share * window.utilization : 0;
  const tail = `of your five hours · ${used}% used, resets ${reset}`;
  if (!mine) return { said: `this session: none ${tail}`, tone: 'quiet' };
  if (had < 0.01) return { said: `this session: under 1% ${tail}`, tone: 'quiet' };
  return {
    said: `this session: ${Math.round(had * 100)}% ${tail}`,
    tone: had >= 0.4 ? 'wrong' : had >= 0.2 ? 'warn' : 'quiet',
  };
}

