/**
 * How the yard is arranged, as its reader left it.
 *
 * Every part of a session's board but the middle can be put away, and every
 * rule between two parts can be dragged, the thing on either side taking the
 * room. None of that is a fact about any one session or project: it is a way
 * of reading, so it is one arrangement for the whole village, kept on this
 * machine and put back the next time it opens.
 */

/** The parts that can be put away. The middle is never one of them. */
export type Part = 'asked' | 'changelog' | 'now' | 'did';

/** What each part is called when it is offered back. */
export const PART_NAME: Record<Part, string> = {
  asked: 'what you asked',
  changelog: 'the changelog',
  now: 'the plan',
  did: 'what it did',
};

export interface Arrangement {
  hidden: Part[];
  /** How wide the left column is, when it has been dragged. */
  asked?: number;
  /** How wide the right column is, when it has been dragged. */
  made?: number;
  /** How tall the changelog is, when its rule has been dragged. */
  changelog?: number;
  /** How tall the plan is, when the rule under it has been dragged. */
  now?: number;
}

const KEY = 'mender.yard.arrangement';

let now: Arrangement = load();

function load(): Arrangement {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Arrangement>;
    return {
      hidden: Array.isArray(raw.hidden) ? raw.hidden.filter((one) => one in PART_NAME) : [],
      ...(typeof raw.asked === 'number' ? { asked: raw.asked } : {}),
      ...(typeof raw.made === 'number' ? { made: raw.made } : {}),
      ...(typeof raw.changelog === 'number' ? { changelog: raw.changelog } : {}),
      ...(typeof raw.now === 'number' ? { now: raw.now } : {}),
    };
  } catch {
    return { hidden: [] };
  }
}

export function arrangement(): Arrangement {
  return now;
}

/** Change it. `keep` is false while a rule is still being dragged. */
export function arrange(patch: Partial<Arrangement>, keep = true): void {
  now = { ...now, ...patch };
  if (keep) save();
}

export function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(now));
  } catch {
    // Only a convenience; the arrangement still holds for this sitting.
  }
}

export function hidden(part: Part): boolean {
  return now.hidden.includes(part);
}

export function putAway(part: Part): void {
  if (!hidden(part)) arrange({ hidden: [...now.hidden, part] });
}

export function bringBack(part: Part): void {
  arrange({ hidden: now.hidden.filter((one) => one !== part) });
}

/** Whether anything has been dragged away from where it starts. */
export function moved(): boolean {
  return (
    now.asked !== undefined ||
    now.made !== undefined ||
    now.changelog !== undefined ||
    now.now !== undefined
  );
}

/** Every rule back where it started. What is put away stays put away. */
export function unmove(): void {
  now = { hidden: now.hidden };
  save();
}
