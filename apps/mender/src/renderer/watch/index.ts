import { emit, newId, topFrame } from './emit';
import { watchReturns } from './return';
import { tally } from './tally';
import { openWaits } from './waiting';
import { callsOpen, watchCalls } from './wire';

export { waiting, timed, waitOn, untilPainted } from './waiting';
export { fellBack, soft, swallowed } from './caught';
export { act, lantern, where } from './events';
export { noteDrawn } from './return';
export { wireWatch } from './wire';

const HEARTBEAT_MS = 5 * 60_000;
const JANK_MS = 10_000;
const NAME = /^[A-Za-z0-9_.:-]{1,64}$/;

const nameOf = (error: unknown): string =>
  error instanceof Error && NAME.test(error.name) ? error.name : 'Error';

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : typeof error === 'string' ? error : '';

let started = false;

function catchEverything(): void {
  window.addEventListener(
    'error',
    (event) => {
      /* A picture or script that would not load: the element, never the address. */
      const target = event.target;
      if (target instanceof Element) {
        tally.errors++;
        emit('warn', { msg: 'resource failed', kind: target.tagName.toLowerCase() });
        return;
      }
      tally.errors++;
      emit('error', {
        msg: 'window error',
        errorName: nameOf(event.error),
        errorMessage: event.message || messageOf(event.error),
        at: topFrame(event.error instanceof Error ? event.error.stack : undefined),
      });
    },
    true
  );
  window.addEventListener('unhandledrejection', (event) => {
    tally.errors++;
    const why = event.reason;
    emit('error', {
      msg: 'unhandled rejection',
      errorName: nameOf(why),
      errorMessage: messageOf(why),
      at: topFrame(why instanceof Error ? why.stack : undefined),
    });
  });
}

/** The app's own console.error and console.warn, counted and reported, a few per ten seconds. */
function wrapConsole(): void {
  const budget = { error: 5, warn: 5 };
  setInterval(() => {
    budget.error = 5;
    budget.warn = 5;
  }, JANK_MS);
  for (const level of ['error', 'warn'] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]): void => {
      original(...args);
      const first = args[0];
      if (typeof first === 'string' && /^(mender|flight):/.test(first)) return;
      if (level === 'error') tally.consoleErrors++;
      else tally.consoleWarns++;
      if (budget[level]-- <= 0) return;
      emit(level, {
        msg: `console ${level}`,
        errorName: first instanceof Error ? nameOf(first) : undefined,
        errorMessage: messageOf(first).slice(0, 100),
        at: first instanceof Error ? topFrame(first.stack) : undefined,
      });
    };
  }
}

type Frame = PerformanceEntry & {
  scripts?: Array<{ sourceFunctionName?: string; duration?: number }>;
};

/** Long frames and busy stretches, summed up every ten seconds rather than said one by one. */
function watchJank(): void {
  let count = 0;
  let total = 0;
  let worst = 0;
  let at: string | undefined;
  const take = (entry: Frame): void => {
    count++;
    total += entry.duration;
    tally.longFrames++;
    if (entry.duration > worst) {
      worst = entry.duration;
      const script = [...(entry.scripts ?? [])].sort(
        (a, b) => (b.duration ?? 0) - (a.duration ?? 0)
      )[0];
      const name = script?.sourceFunctionName;
      at = name && /^[A-Za-z_$][\w$.]{0,60}$/.test(name) ? name : undefined;
    }
  };
  let watching = false;
  for (const [type, floor] of [
    ['long-animation-frame', 100],
    ['longtask', 100],
  ] as const) {
    if (watching) break;
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) if (entry.duration >= floor) take(entry as Frame);
      }).observe({ type, buffered: false });
      watching = true;
    } catch {
      // This Chromium does not report it; the next kind is tried.
    }
  }
  setInterval(() => {
    if (!count) return;
    emit(worst > 1000 ? 'warn' : 'info', {
      msg: 'long frames',
      count,
      frameMs: worst,
      lagMs: total,
      elapsedMs: JANK_MS,
      at,
    });
    count = 0;
    total = 0;
    worst = 0;
    at = undefined;
  }, JANK_MS);
}

function heartbeat(): void {
  const launched = performance.now();
  setInterval(() => {
    const lines: Array<[string, number]> = [
      ['wire.ok', tally.callsOk],
      ['wire.failed', tally.callsFailed],
      ['wire.slow', tally.callsSlow],
      ['wire.open', callsOpen()],
      ['frames.long', tally.longFrames],
      ['errors', tally.errors],
      ['console.error', tally.consoleErrors],
      ['console.warn', tally.consoleWarns],
      ['waits.open', openWaits()],
      ['waits.slow', tally.slowWaits],
      ['caught', tally.swallowed],
    ];
    const id = newId();
    for (const [kind, count] of lines) {
      emit('info', {
        msg: 'heartbeat',
        op: 'window.heartbeat',
        opId: id,
        kind,
        count,
        elapsedMs: HEARTBEAT_MS,
        durationMs: performance.now() - launched,
      });
    }
    Object.assign(tally, {
      callsOk: 0,
      callsFailed: 0,
      callsSlow: 0,
      longFrames: 0,
      errors: 0,
      consoleErrors: 0,
      consoleWarns: 0,
      slowWaits: 0,
      swallowed: 0,
    });
  }, HEARTBEAT_MS);
}

/** Start reporting. Listeners and slow clocks only; nothing here draws. */
export function startWatch(): void {
  if (started) return;
  started = true;
  catchEverything();
  wrapConsole();
  watchJank();
  watchCalls();
  watchReturns();
  heartbeat();
  emit('info', {
    msg: 'window up',
    op: 'window.start',
    kind: document.hidden ? 'hidden' : 'shown',
  });
}
