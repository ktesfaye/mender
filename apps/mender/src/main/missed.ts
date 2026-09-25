import type { Scope } from '@emdash/shared/concurrency';
import { observe } from '@emdash/wire/state';
import type { BrowserWindow } from 'electron';
import { MENDER_MISSED_CHANNEL } from '@shared/channels';
import type { Mood } from '@shared/agents';
import { attentionsFrom } from './attend';
import type { Agents } from './agents';
import type { Tasks } from './tasks';

/**
 * What happened while he was somewhere else, said once when he comes back.
 *
 * A system notification (`attend.ts`) answers the moment something starts
 * wanting him, but only if he is looking at his screen to see it, or hears
 * it, right then — a banner missed is a banner gone. This is the other half:
 * whatever rang, or would have rung, while the window itself was not the
 * frontmost thing, held until he is actually looking at the village again and
 * said once, plainly, rather than left for him to discover lantern by lantern.
 *
 * The same pure rule `attend.ts` already has for "who just started wanting
 * him" is what decides who gets named here — a session that finished, asked,
 * or broke while he was away. It only speaks up if he was gone long enough
 * that this is worth saying rather than a glance he'd have caught anyway.
 */

/** Long enough away that a summary beats him just noticing on his own. */
const AWAY_MS = 30_000;

/** At most this many named, so a bad morning doesn't read like a ledger. */
const MOST = 4;

function said(mood: Mood): string {
  if (mood === 'hurt') return 'broke';
  if (mood === 'asking') return 'asked';
  return 'finished';
}

/**
 * The lines actually worth saying, capped so a bad morning with a dozen
 * sessions doesn't read like a ledger — the rest folded into one "n more".
 */
export function describeMissed(
  entries: [task: string, mood: Mood][],
  titleOf: (task: string) => string | undefined
): string[] {
  const capped = entries.slice(0, MOST);
  const lines = capped
    .map(([task, mood]) => {
      const title = titleOf(task);
      return title ? `${title} ${said(mood)}` : null;
    })
    .filter((line): line is string => line !== null);
  const more = entries.length - capped.length;
  if (more > 0) lines.push(`${more} more`);
  return lines;
}

export interface MissedOptions {
  scope: Scope;
  agents: Agents;
  tasks: Tasks;
}

export function watchMissed(window: BrowserWindow, options: MissedOptions): void {
  let previous: Record<string, Mood> | null = null;
  let away = false;
  let sinceBlur: number | null = null;
  const held = new Map<string, Mood>();

  observe(
    options.agents.moods(),
    (snapshot) => {
      const now = snapshot.value;
      if (previous === null) {
        previous = now;
        return;
      }
      const rung = attentionsFrom(previous, now);
      previous = now;
      if (!away) return;
      for (const task of rung) held.set(task, now[task]);
    },
    { scope: options.scope }
  );

  window.on('blur', () => {
    away = true;
    sinceBlur = Date.now();
  });

  window.on('focus', () => {
    away = false;
    const awayFor = sinceBlur === null ? 0 : Date.now() - sinceBlur;
    sinceBlur = null;
    if (held.size === 0 || awayFor < AWAY_MS) {
      held.clear();
      return;
    }
    void tell(held, options, window);
    held.clear();
  });
}

async function tell(
  held: Map<string, Mood>,
  options: MissedOptions,
  window: BrowserWindow
): Promise<void> {
  if (window.isDestroyed()) return;
  const records = await options.tasks.list();
  const lines = describeMissed(
    [...held.entries()],
    (task) => records.find((candidate) => candidate.id === task)?.title
  );
  if (lines.length === 0 || window.isDestroyed()) return;
  window.webContents.send(MENDER_MISSED_CHANNEL, lines);
}
