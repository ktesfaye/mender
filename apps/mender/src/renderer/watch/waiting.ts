import { emit } from './emit';
import { tally } from './tally';

const SLOW = 3000;
const open = new Map<number, { surface: string; at: number }>();
let next = 1;

export function openWaits(): number {
  return open.size;
}

/**
 * A place the board waits. Call it when the wait begins and call what it
 * returns when it ends: the start is said, a wait that drags is said again at
 * ten seconds, thirty, and every minute after, and the end says how long it
 * was. Calling the end twice is harmless.
 */
export function waiting(surface: string): (outcome?: string) => void {
  const id = next++;
  const at = performance.now();
  open.set(id, { surface, at });
  emit('info', { msg: 'wait started', surface });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = (afterMs: number): void => {
    timer = setTimeout(() => {
      const waited = performance.now() - at;
      emit('warn', { msg: 'still waiting', surface, waitMs: waited });
      schedule(waited < 30_000 ? 30_000 - waited + 1 : 60_000);
    }, afterMs);
  };
  schedule(10_000);
  return (outcome = 'ok') => {
    if (!open.delete(id)) return;
    clearTimeout(timer);
    const waited = performance.now() - at;
    if (waited > SLOW) tally.slowWaits++;
    emit(waited > SLOW || outcome !== 'ok' ? 'warn' : 'info', {
      msg: 'wait ended',
      surface,
      waitMs: waited,
      outcome,
    });
  };
}

/** Runs an async step as a wait, ended whichever way it goes. */
export async function timed<T>(surface: string, run: () => Promise<T>): Promise<T> {
  const done = waiting(surface);
  try {
    const got = await run();
    done();
    return got;
  } catch (error) {
    done('failed');
    throw error;
  }
}

/** The same for a promise that is already in flight. */
export function waitOn(surface: string, promise: PromiseLike<unknown>): void {
  const done = waiting(surface);
  promise.then(
    () => done(),
    () => done('failed')
  );
}

/** A sync board opening: the wait ends once the browser has painted after it. */
export function untilPainted(surface: string): void {
  const done = waiting(surface);
  requestAnimationFrame(() => requestAnimationFrame(() => done()));
}
