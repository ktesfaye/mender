import type { Deed } from '../shared/agents';

/**
 * Whether a working session is going nowhere, read only off what the village
 * already knows: the steps it has taken, which of them failed, which changed a
 * file, how its plan stands and how long since anything moved.
 *
 * A session that is merely slow is not stuck, and a long command running in
 * the foreground is a step in progress, not silence. So there are exactly
 * three things worth interrupting a lead for, each with its evidence:
 *
 *  - circling: the same command failing again and again with nothing changed
 *    between the failures (a file edited between two runs is an attempt, not
 *    a loop), or failing the same way five times however many edits went by;
 *  - silent: working, yet not one step, word or plan change for a long while
 *    and nothing out that could be the reason;
 *  - idle hands: working a long time, doing plenty, and still no file changed,
 *    no commit made and no plan step ticked off.
 *
 * Pure on purpose: a wrong answer here looks completely normal on screen.
 */

export type Stuck =
  | { kind: 'circling'; command: string; times: number; edits: boolean }
  | { kind: 'silent'; quietMs: number }
  | { kind: 'idle-hands'; ms: number; steps: number };

export interface Pulse {
  /** The turn's steps, oldest first. */
  deeds: readonly Pick<Deed, 'id' | 'did' | 'tool' | 'wrong' | 'running' | 'background'>[];
  /** Steps that were still running a foreground command, with when each began. */
  startedAt: (id: string) => number | undefined;
  /** How many steps of its plan are done now. */
  planDone: number;
  /** When anything at all last moved: a step, a word, a plan tick. */
  movedAt: number;
  /** When a file last changed, a commit was made or a plan step was ticked. */
  progressAt: number;
  /** When this turn began. */
  since: number;
  /** Helpers or background commands out, which are a reason for quiet. */
  outStanding: number;
  now: number;
}

const MIN = 60_000;
export const SILENT_MS = 8 * MIN;
export const LONG_STEP_MS = 20 * MIN;
export const IDLE_HANDS_MS = 25 * MIN;
export const CIRCLE_RUN = 3;
export const CIRCLE_TOTAL = 5;

const EDITS = new Set(['create-file-tool-call', 'modify-file-tool-call', 'delete-file-tool-call']);

/** The same command said the same way: digits and hashes and timings differ run to run. */
export const sameCommand = (said: string): string =>
  said
    .toLowerCase()
    .replace(/\b[0-9a-f]{7,40}\b/g, '#')
    .replace(/\d+(\.\d+)?\s?(ms|s|m)\b/g, '#')
    .replace(/\s+/g, ' ')
    .trim();

export function stuckOf(pulse: Pulse): Stuck | null {
  const { deeds } = pulse;

  /* A failing command repeated with no change to anything between the runs. */
  let run = 0;
  let key = '';
  let edits = false;
  for (let i = deeds.length - 1; i >= 0; i -= 1) {
    const deed = deeds[i]!;
    if (EDITS.has(deed.tool)) break;
    if (deed.tool !== 'execute-tool-call') continue;
    if (!deed.wrong) {
      if (deed.running) continue;
      break;
    }
    const said = sameCommand(deed.did);
    if (!key) key = said;
    if (said !== key) break;
    run += 1;
  }
  if (run >= CIRCLE_RUN) return { kind: 'circling', command: key, times: run, edits };

  /* The same failing command over and over though files changed in between. */
  const recent = deeds.slice(-16).filter((deed) => deed.tool === 'execute-tool-call' && deed.wrong);
  const counts = new Map<string, number>();
  for (const deed of recent) {
    const said = sameCommand(deed.did);
    counts.set(said, (counts.get(said) ?? 0) + 1);
  }
  for (const [said, times] of counts) {
    if (times >= CIRCLE_TOTAL) {
      edits = deeds.slice(-16).some((deed) => EDITS.has(deed.tool));
      return { kind: 'circling', command: said, times, edits };
    }
  }

  /* A foreground step that has simply never come back. */
  const hung = deeds.find((deed) => {
    if (!deed.running || deed.background) return false;
    const began = pulse.startedAt(deed.id);
    return began !== undefined && pulse.now - began >= LONG_STEP_MS;
  });
  if (hung) return { kind: 'silent', quietMs: pulse.now - (pulse.startedAt(hung.id) ?? pulse.now) };

  /* Nothing moved at all, and nothing out there that could be why. */
  const quiet = pulse.now - pulse.movedAt;
  const running = deeds.some((deed) => deed.running);
  if (quiet >= SILENT_MS && !running && pulse.outStanding === 0) {
    return { kind: 'silent', quietMs: quiet };
  }

  /* Busy for a long time and nothing to show for it. */
  const long = pulse.now - Math.max(pulse.since, pulse.progressAt);
  if (long >= IDLE_HANDS_MS && deeds.length >= 10) {
    return { kind: 'idle-hands', ms: long, steps: deeds.length };
  }
  return null;
}

/** What a stuck reading says, for whoever supervises. */
export function stuckSaid(stuck: Stuck): string {
  switch (stuck.kind) {
    case 'circling':
      return stuck.edits
        ? `the same command has failed ${stuck.times} times (${stuck.command}), though it edited files between runs`
        : `the same command has failed ${stuck.times} times in a row (${stuck.command}) with nothing changed between the runs`;
    case 'silent':
      return `nothing has moved for ${Math.round(stuck.quietMs / MIN)} minutes and nothing it has out explains why`;
    case 'idle-hands':
      return `${Math.round(stuck.ms / MIN)} minutes and ${stuck.steps} steps in, and still no file changed, no commit and no plan step ticked off`;
  }
}
