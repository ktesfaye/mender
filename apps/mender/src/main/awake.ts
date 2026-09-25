import type { Scope } from '@emdash/shared/concurrency';
import { observe, type Cell } from '@emdash/wire/state';
import { powerSaveBlocker } from 'electron';
import type { Mood } from '@shared/agents';
import type { Agents } from './agents';

/**
 * Keeping the Mac awake for exactly as long as a fire is actually lit.
 *
 * A long turn that runs through the machine going to sleep does not pause —
 * the spawned process is suspended, not merely the window — so this holds the
 * lid open the whole time anything anywhere is `working`, and lets go the
 * moment the last one banks, finishes or breaks. Nothing to look at and
 * nothing to press: it just stops being possible for the Mac to sleep out
 * from under a working agent.
 */
export interface AwakeOptions {
  scope: Scope;
  agents: Agents;
  /** The island's real mood map. Defaults to `agents.moods()`. */
  moods?: Cell<Record<string, Mood>>;
}

export function watchStayingAwake(options: AwakeOptions): void {
  let blocker: number | null = null;

  observe(
    options.moods ?? options.agents.moods(),
    (snapshot) => {
      const working = anyWorking(snapshot.value);
      if (working && blocker === null) {
        blocker = powerSaveBlocker.start('prevent-app-suspension');
      } else if (!working && blocker !== null) {
        powerSaveBlocker.stop(blocker);
        blocker = null;
      }
    },
    { scope: options.scope }
  );

  options.scope.add(() => {
    if (blocker !== null) powerSaveBlocker.stop(blocker);
  });
}

export function anyWorking(moods: Record<string, Mood>): boolean {
  return Object.values(moods).some((mood) => mood === 'working');
}
