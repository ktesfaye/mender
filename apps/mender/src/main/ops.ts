import { AsyncLocalStorage } from 'node:async_hooks';
import {
  describeOpError,
  log as rootLogger,
  startOp,
  type LogFields,
  type Logger,
  type Op as SharedOp,
} from '@emdash/shared/logger';

/**
 * The app's layer over the shared op tracker: the same op start / still going
 * / end lines, plus what only the app can add. Ops nest by async context, so
 * whatever starts inside another names it as `parentOpId` and a wire call, the
 * task it begins and the worktree it cuts read as one flow; anything that
 * starts unattached just after the machine woke hangs off the wake; a Result
 * that says it failed is a failed op even though nothing threw; and an op
 * still in flight after five minutes is called out as stalled.
 */

export interface Op {
  readonly id: string;
  /** Times one named step inside this op. */
  stage<T>(name: string, fn: () => Promise<T>): Promise<T>;
  /** Fields added to the op's end line. */
  set(fields: LogFields): void;
}

export interface TrackOptions {
  /** Say nothing at start, and nothing at the end unless slow or failed. */
  quiet?: boolean;
}

interface Running {
  name: string;
  startedAt: number;
  log: Logger;
  fields: LogFields;
  said: number;
}

const SLOW_MS = 2000;
const STALLED_MS = 5 * 60_000;

const running = new Map<string, Running>();
const context = new AsyncLocalStorage<string>();
let wake: { id: string; at: number } | undefined;
const WAKE_WINDOW_MS = 3 * 60_000;
let watchdog: ReturnType<typeof setInterval> | undefined;

/** The machine just woke, unlocked or came back to the window: whatever starts
    unattached in the next few minutes is read as part of getting going again. */
export function beginWake(): string {
  wake = { id: crypto.randomUUID(), at: Date.now() };
  return wake.id;
}

function startWatchdog(): void {
  if (watchdog) return;
  watchdog = setInterval(() => {
    const now = Date.now();
    for (const [opId, one] of running) {
      const elapsedMs = now - one.startedAt;
      if (elapsedMs < STALLED_MS || now - one.said < STALLED_MS - 1000) continue;
      one.said = now;
      one.log.warn('op stalled', { ...one.fields, op: one.name, opId, elapsedMs });
    }
  }, 60_000);
  watchdog.unref();
}

/** A Result that says it failed is a failure even though nothing threw. */
function failureIn(value: unknown): { kind: string } | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const result = value as { success?: unknown; error?: unknown };
  if (result.success !== false) return undefined;
  const error = result.error as { kind?: unknown } | undefined;
  return { kind: typeof error?.kind === 'string' ? error.kind : 'failed' };
}

export function trackOp<T>(
  log: Logger,
  name: string,
  fields: LogFields,
  fn: (op: Op) => Promise<T>,
  options: TrackOptions = {}
): Promise<T> {
  startWatchdog();
  const startedAt = Date.now();
  const inherited = context.getStore();
  const afterWake = !inherited && wake && startedAt - wake.at < WAKE_WINDOW_MS ? wake : undefined;
  const parentOpId = inherited ?? afterWake?.id;
  const extra: LogFields = {};
  const base: LogFields = {
    ...fields,
    ...(parentOpId ? { parentOpId } : {}),
    ...(afterWake ? { afterMs: startedAt - afterWake.at } : {}),
  };
  const shared: SharedOp = startOp(log, name, base, {
    quiet: options.quiet,
    slowMs: SLOW_MS,
  });
  running.set(shared.opId, { name, startedAt, log, fields: base, said: startedAt });

  const op: Op = {
    id: shared.opId,
    set: (more) => Object.assign(extra, more),
    stage: async (stage, step) => {
      const began = Date.now();
      shared.stage(stage);
      try {
        const value = await step();
        const failed = failureIn(value);
        log.info('op stage done', {
          ...base,
          op: name,
          opId: shared.opId,
          stage,
          durationMs: Date.now() - began,
          outcome: failed ? 'failed' : 'ok',
          ...(failed ? { errorKind: failed.kind } : {}),
        });
        return value;
      } catch (error) {
        log.warn('op stage done', {
          ...base,
          op: name,
          opId: shared.opId,
          stage,
          durationMs: Date.now() - began,
          outcome: 'failed',
          ...describeOpError(error),
        });
        throw error;
      }
    },
  };

  return context.run(shared.opId, async () => {
    try {
      const value = await fn(op);
      const failed = failureIn(value);
      if (failed) shared.end({ ...extra, outcome: 'failed', errorKind: failed.kind });
      else shared.end(extra);
      return value;
    } catch (error) {
      shared.fail(error, extra);
      throw error;
    } finally {
      running.delete(shared.opId);
    }
  });
}

/**
 * For a failure that is let go rather than raised: written down instead of
 * vanishing. `where` is a short fixed name for the place, never a value.
 */
export function swallow(log: Logger, where: string, level: 'warn' | 'info' = 'warn') {
  return (error: unknown): undefined => {
    try {
      log[level]('swallowed error', {
        op: 'swallowed',
        stage: where,
        parentOpId: context.getStore(),
        ...describeOpError(error),
      });
    } catch {
      // Saying it must never be the new failure.
    }
    return undefined;
  };
}

const caughtAt = new Map<string, { n: number; since: number }>();
const QUIET_CODES = new Set(['ENOENT', 'ENOTDIR', 'EEXIST', 'ABORT_ERR']);

/**
 * A catch that carries on: written down with where (a fixed file:line, never
 * a value) and what kind of failure. An expected miss, such as a file that is
 * not there, is debug; anything else is a warning. A site that fires in a
 * loop says so five times a minute and then goes quiet, so one hot catch can
 * never bury the log.
 */
export function noteCaught(where: string, error: unknown): void {
  try {
    const now = Date.now();
    const seen = caughtAt.get(where);
    if (!seen || now - seen.since > 60_000) caughtAt.set(where, { n: 1, since: now });
    else if (++seen.n > 5) return;
    const code = (error as { code?: unknown } | null)?.code;
    const expected = typeof code === 'string' && QUIET_CODES.has(code);
    (expected ? rootLogger.debug : rootLogger.warn).call(rootLogger, 'caught and carried on', {
      op: 'caught',
      stage: where,
      parentOpId: context.getStore(),
      ...describeOpError(error),
    });
  } catch {
    // Saying it must never be the new failure.
  }
}

export function lost(where: string): (error: unknown) => undefined {
  return (error) => {
    noteCaught(where, error);
    return undefined;
  };
}
