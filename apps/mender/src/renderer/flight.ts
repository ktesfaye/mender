import type { WireInstrumentation } from '@emdash/wire/rpc';
import { lookingNow } from './pace';

/**
 * The page's flight recorder.
 *
 * When something goes wrong in the window the only witness is the window, and
 * the host's log file only hears what the window says out loud. So this says,
 * out loud, everything that would have explained it afterwards: a stretch where
 * the page could not draw or answer, a call to the host that never came back,
 * the wire to the host dropping, the graphics card losing its context, memory
 * climbing, the machine waking from sleep. Each line starts `flight:` and
 * carries one JSON object, so `grep flight:` in the day's log is the whole
 * story, in order, next to what the host said at the same moment.
 *
 * Nothing here records what was said or read, only that something was, and how
 * long it took. A line is written when something is wrong or when a send
 * happens, never on a timer, so a good day costs the log nothing.
 */

type Level = 'info' | 'warn' | 'error';

/** The last few things said, attached to every complaint so it reads in context. */
const lately: Array<{ what: string; at: number }> = [];
const LATELY = 10;

function recent(): string[] {
  const now = performance.now();
  return lately.map((one) => `${one.what} ${Math.round((now - one.at) / 1000)}s ago`);
}

function say(level: Level, what: string, data: Record<string, unknown> = {}): void {
  const line = `flight: ${what} ${JSON.stringify(data)}`;
  const before = recent();
  lately.push({ what, at: performance.now() });
  if (lately.length > LATELY) lately.shift();
  if (level === 'info') console.info(line);
  else if (level === 'warn') console.warn(`${line} lately=${JSON.stringify(before)}`);
  else console.error(`${line} lately=${JSON.stringify(before)}`);
}

/** Something that happened and was fine, worth being able to line up with the host. */
export function note(what: string, data?: Record<string, unknown>): void {
  say('info', what, { looking: lookingNow(), ...data });
}

/** Something that was not fine. */
export function trouble(what: string, data?: Record<string, unknown>): void {
  say('warn', what, { looking: lookingNow(), ...data });
}

type Waiting = { path: string; at: number; flagged: number };
const waiting = new Map<string, Waiting>();

/** Calls whose start is worth a line, because they are something he did. */
const SAID_ALOUD = /^(agents|tasks|projects)\./;
/** Said on every keystroke or on a clock, so only ever a complaint. */
const QUIET = /^agents\.setDraft$/;

function oldest(): { path: string; ms: number } | null {
  let worst: { path: string; ms: number } | null = null;
  const now = performance.now();
  for (const call of waiting.values()) {
    const ms = Math.round(now - call.at);
    if (!worst || ms > worst.ms) worst = { path: call.path, ms };
  }
  return worst;
}

/**
 * What the wire to the host reports about itself. Handed to `connect`, so every
 * call is seen at the moment it is issued and the moment it settles, by the same
 * id the host logs it under: a send in this window and the host receiving it
 * line up by `callId`, and one that appears here and never there is a send the
 * host never got.
 */
export const wireFlight: WireInstrumentation = {
  callStart: ({ callId, path }) => {
    waiting.set(callId, { path, at: performance.now(), flagged: 0 });
    if (SAID_ALOUD.test(path) && !QUIET.test(path)) note('call issued', { callId, path });
  },
  callEnd: ({ callId, path, durationMs, ok, errorCode, errorMessage }) => {
    waiting.delete(callId);
    const ms = Math.round(durationMs);
    if (!ok) {
      trouble('call failed', { callId, path, ms, errorCode, errorMessage });
    } else if (ms > 2000) {
      trouble('call was slow', { callId, path, ms });
    } else if (SAID_ALOUD.test(path) && !QUIET.test(path)) {
      note('call answered', { callId, path, ms });
    }
  },
  transport: ({ event }) => {
    if (event === 'disconnect') trouble('wire disconnected');
    else if (event === 'reconnect') trouble('wire reconnected');
  },
  resync: (event) => trouble('wire resync', { ...event }),
  resyncFailed: (event) =>
    trouble('wire resync failed', {
      topic: event.topic,
      attempt: event.attempt,
      error: `${event.error}`,
    }),
  cursorTranslationTimeout: (event) => trouble('wire cursor timed out', { model: event.model }),
  batchDropped: (event) => trouble('wire batch dropped', { error: `${event.error}` }),
  snapshot: ({ topic, durationMs, ok, errorCode }) => {
    if (!ok || durationMs > 3000) {
      trouble('wire snapshot ' + (ok ? 'was slow' : 'failed'), {
        topic,
        ms: Math.round(durationMs),
        errorCode,
      });
    }
  },
};

type FrameEntry = PerformanceEntry & {
  blockingDuration?: number;
  scripts?: Array<{
    sourceURL?: string;
    sourceFunctionName?: string;
    invoker?: string;
    duration?: number;
  }>;
};

function observe(type: string, floor: number, what: string): void {
  try {
    const watcher = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as FrameEntry[]) {
        if (entry.duration < floor) continue;
        const scripts = (entry.scripts ?? []).slice(0, 3).map((script) => ({
          from: (script.sourceURL ?? '').split('/').pop(),
          fn: script.sourceFunctionName || script.invoker,
          ms: Math.round(script.duration ?? 0),
        }));
        trouble(what, {
          ms: Math.round(entry.duration),
          blockedMs: Math.round(entry.blockingDuration ?? 0),
          scripts,
        });
      }
    });
    watcher.observe({ type, buffered: false });
  } catch {
    // This Chromium does not report it; the lag clock below still will.
  }
}

type WithMemory = Performance & { memory?: { usedJSHeapSize: number } };

let started = false;

/**
 * Start recording. Everything here is a listener or a slow clock; none of it
 * draws, so it costs nothing while the village is frozen behind another window.
 */
export function startFlight(): void {
  if (started) return;
  started = true;
  note('window up', {
    hidden: document.hidden,
    heap: (performance as WithMemory).memory?.usedJSHeapSize,
  });

  window.addEventListener('error', (event) => {
    console.error(
      `flight: page error ${JSON.stringify({
        message: event.message,
        at: `${(event.filename ?? '').split('/').pop()}:${event.lineno}:${event.colno}`,
        stack: event.error instanceof Error ? event.error.stack : undefined,
      })}`
    );
  });
  window.addEventListener('unhandledrejection', (event) => {
    const why = event.reason;
    console.error(
      `flight: unhandled rejection ${JSON.stringify({
        message: why instanceof Error ? why.message : `${why}`,
        stack: why instanceof Error ? why.stack : undefined,
      })}`
    );
  });

  /* The graphics card taking the picture away, which is what a laptop waking
     from a long sleep does to a page that was drawing on it. Non-bubbling, so
     it is heard on the way down. */
  window.addEventListener('webglcontextlost', () => trouble('graphics context lost'), true);
  window.addEventListener('webglcontextrestored', () => note('graphics context restored'), true);

  document.addEventListener('visibilitychange', () =>
    note('page visibility', { hidden: document.hidden })
  );
  document.addEventListener('freeze', () => trouble('page frozen by the browser'));
  document.addEventListener('resume', () => note('page resumed by the browser'));
  window.addEventListener('online', () => note('network online'));
  window.addEventListener('offline', () => trouble('network offline'));

  /* A stretch where the page could not draw, and what script was running in it. */
  observe('long-animation-frame', 300, 'page could not draw');
  observe('longtask', 500, 'page was busy');

  /* The page's own clock against the real one. A timer that fires far later
     than it asked means the page was not running at all: asleep, or stuck. */
  let expected = performance.now() + 1000;
  let wall = Date.now() + 1000;
  setInterval(() => {
    const now = performance.now();
    const late = now - expected;
    const wallLate = Date.now() - wall;
    expected = now + 1000;
    wall = Date.now() + 1000;
    /* Whether it was the machine asleep or the page stuck is the host's to
       say: its power lines sit right beside this one in the log. */
    if (late > 1500) {
      trouble('page stalled', {
        lateMs: Math.round(late),
        wallLateMs: wallLate,
        inflight: waiting.size,
      });
    }
  }, 1000);

  /* Calls that never came back. The wire's own deadline is thirty seconds, and
     a send waits on none at all, so without this a message can sit unanswered
     for as long as the window is open and nothing says so. */
  setInterval(() => {
    const now = performance.now();
    for (const [callId, call] of waiting) {
      const ms = now - call.at;
      const stage = ms > 60_000 ? 3 : ms > 15_000 ? 2 : ms > 4000 ? 1 : 0;
      if (stage <= call.flagged) continue;
      call.flagged = stage;
      trouble('call still waiting', {
        callId,
        path: call.path,
        ms: Math.round(ms),
        inflight: waiting.size,
      });
    }
  }, 2000);

  /* A slide that never finished leaves a column parked a few pixels off where
     it belongs, with its text clipped, and nothing says so. An animation that
     is paused, or still going long after it should have ended, is that. */
  let stuckSaid = -Infinity;
  setInterval(() => {
    const now = performance.now();
    if (now - stuckSaid < 30_000) return;
    const stuck = document.getAnimations().filter((one) => {
      const timing = one.effect?.getComputedTiming();
      if (!timing || !Number.isFinite(timing.endTime)) return false;
      const time = Number(one.currentTime ?? 0);
      if (one.playState === 'paused') return true;
      return one.playState === 'running' && time > Number(timing.endTime) + 2000;
    });
    if (!stuck.length) return;
    stuckSaid = now;
    trouble('animations stuck', {
      count: stuck.length,
      which: stuck.slice(0, 4).map((one) => {
        const target = (one.effect as KeyframeEffect | null)?.target as Element | null;
        return {
          on: target
            ? `${target.tagName.toLowerCase()}.${String(target.className).slice(0, 40)}`
            : null,
          state: one.playState,
          at: Math.round(Number(one.currentTime ?? 0)),
        };
      }),
    });
  }, 5000);

  /* Telling the host it is alive, with the numbers that explain a slow death:
     a heap or a document that only grows, and a call that has been waiting. */
  setInterval(() => {
    try {
      window.mender?.vitals?.({
        at: Date.now(),
        looking: lookingNow(),
        heap: (performance as WithMemory).memory?.usedJSHeapSize ?? 0,
        nodes: document.getElementsByTagName('*').length,
        waiting: waiting.size,
        oldest: oldest(),
      });
    } catch {
      // The host going away is not the page's problem to report.
    }
  }, 5000);
}
