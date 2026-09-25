/**
 * The rule behind quitting with the fire still lit, with no Electron in it.
 *
 * `installQuitGuard` (in `quit.ts`) is all wiring — `app.on('before-quit')`,
 * the window's own close box, the IPC round trip for a pressed line — and
 * none of it is worth pinning down with a test. This is: whether a given
 * attempt should be let through outright, asked about, or counted as the
 * second press landing on top of the first. A bug in this looks completely
 * ordinary on screen — a quit that silently drops a running session, or one
 * that asks every single time — so it is the one part of this feature worth
 * a test.
 */

export type Attempt = 'allow' | 'ask';

export interface QuitGate {
  /** A quit was attempted right now. What should happen to it. */
  attempt(now: number, workingCount: number): Attempt;
  /** The line itself was pressed right now: does it still count? */
  press(now: number): boolean;
}

/** How long the second press has to land after the first. */
export const STAND_MS = 4000;

export function createQuitGate(): QuitGate {
  let confirmedOnce = false;
  let pendingUntil = 0;

  return {
    attempt(now, workingCount) {
      if (confirmedOnce) return 'allow';
      if (workingCount === 0) return 'allow';
      if (now < pendingUntil) {
        confirmedOnce = true;
        return 'allow';
      }
      pendingUntil = now + STAND_MS;
      return 'ask';
    },
    press(now) {
      if (now >= pendingUntil) return false;
      confirmedOnce = true;
      return true;
    },
  };
}
