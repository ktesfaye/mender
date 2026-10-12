import { z } from 'zod';

/**
 * A session eating the five hours far faster than a session normally does.
 *
 * The subscription's window is one meter for the whole account, so a meter on
 * its own never says who to stop. This is the village saying who: one
 * session, how much of the window it has just taken, how that compares with
 * what a session here normally takes in the same stretch, what it is thinking
 * with, and, because it was stopped to ask, whether it is waiting on you.
 */
export const hungrySchema = z.object({
  task: z.string(),
  title: z.string(),
  /** What it is thinking with, as the agent names it. */
  model: z.string().nullable(),
  /** How much of the five hours it took over the last stretch, nought to one. */
  share: z.number(),
  /** How long that stretch was, in minutes. */
  over: z.number(),
  /** How many times what a session here normally takes in that stretch.
      Null when there is not enough history to say. */
  usual: z.number().nullable(),
  /** How much of the five hours it has taken since the window began. */
  windowShare: z.number(),
  /** When it alone would run the window out at that pace, if before the reset. */
  runsOutAt: z.number().nullable(),
  resetsAt: z.number(),
  /** How full the window is now. */
  used: z.number(),
  /** It was stopped to ask, and is waiting on an answer. */
  paused: z.boolean(),
  at: z.number(),
  /** The cheaper models this agent offers, to carry on with instead. */
  cheaper: z.array(z.object({ id: z.string(), name: z.string() })),
});
export type Hungry = z.infer<typeof hungrySchema>;

export const hungryChoiceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('carry-on') }),
  z.object({ kind: z.literal('switch'), model: z.string() }),
  z.object({ kind: z.literal('stop') }),
]);
export type HungryChoice = z.infer<typeof hungryChoiceSchema>;

/**
 * Whether what a session is thinking with is Fable, the dearest model there
 * is, which spends a window far faster than anything else and so has to be
 * plain on sight. The chosen model's name says so, or for the agent's own
 * default, what it says the default currently is.
 */
export function isDear(kit: {
  model: string | null;
  models: readonly { id: string; name: string; about?: string | undefined }[];
}): boolean {
  const chosen = kit.models.find((one) => one.id === kit.model);
  const said = chosen ? `${chosen.id} ${chosen.name} ${chosen.about ?? ''}` : (kit.model ?? '');
  return /fable|mythos/i.test(said);
}

/** A stretch is this long. */
export const STRETCH_MS = 15 * 60_000;

/**
 * Whether a stretch is out of the ordinary: several times what a session here
 * normally takes in one, and enough of the window to matter, or so much of the
 * window that what is normal does not come into it.
 */
export function isHungry(share: number, usual: number | null): boolean {
  if (share >= 0.2) return true;
  return share >= 0.07 && usual !== null && usual >= 3;
}

/**
 * The model names this agent offers that are cheaper than the one it is on,
 * dearest first: Fable, then Opus, then Sonnet, then Haiku. A model whose
 * name says none of them is left out, since there is no saying.
 */
export function cheaperThan(
  current: string | null,
  offered: readonly { id: string; name: string }[]
): { id: string; name: string }[] {
  const rank = (name: string): number => {
    const lower = name.toLowerCase();
    if (/fable|mythos/.test(lower)) return 4;
    if (/opus/.test(lower)) return 3;
    if (/sonnet/.test(lower)) return 2;
    if (/haiku/.test(lower)) return 1;
    return 0;
  };
  const here = current ? rank(current) : 0;
  if (!here) return [];
  const seen = new Set<number>();
  return offered
    .filter((one) => {
      const r = rank(`${one.name} ${one.id}`);
      return r > 0 && r < here;
    })
    .sort(
      (a, b) =>
        rank(`${b.name} ${b.id}`) - rank(`${a.name} ${a.id}`) ||
        b.name.localeCompare(a.name, undefined, { numeric: true })
    )
    .filter((one) => {
      const r = rank(`${one.name} ${one.id}`);
      if (seen.has(r)) return false;
      seen.add(r);
      return true;
    });
}
