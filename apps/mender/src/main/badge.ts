import type { Scope } from '@emdash/shared/concurrency';
import { observe } from '@emdash/wire/state';
import { app } from 'electron';
import type { Mood } from '@shared/agents';
import type { Agents } from './agents';

/**
 * A mark on the dock icon, for whenever the village itself is not on screen
 * at all — behind everything, or on another Space — and even a banner
 * already come and gone leaves nothing to look at.
 *
 * Not a count. A count is a UI convention this app otherwise avoids
 * everywhere else — no badges, no dots, gold-only-pressable — so the one
 * mark it does carry answers a single question, "does anything want me,"
 * the same way a single dot would. It comes on the moment anything anywhere
 * is asking or hurt and it goes the moment nothing is: standing in a yard
 * and answering what it wanted is what clears it, not a separate "seen" of
 * its own.
 */
export interface BadgeOptions {
  scope: Scope;
  agents: Agents;
}

export function watchDockBadge(options: BadgeOptions): void {
  if (process.platform !== 'darwin' || !app.dock) return;

  let wanted: boolean | null = null;
  observe(
    options.agents.moods(),
    (snapshot) => {
      const now = wantsHim(snapshot.value);
      if (now === wanted) return;
      wanted = now;
      app.dock?.setBadge(now ? '•' : '');
    },
    { scope: options.scope }
  );
}

export function wantsHim(moods: Record<string, Mood>): boolean {
  return Object.values(moods).some((mood) => mood === 'asking' || mood === 'hurt');
}
