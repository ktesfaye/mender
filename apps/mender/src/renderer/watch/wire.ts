import type { WireInstrumentation } from '@emdash/wire/rpc';
import { emit, procedureOf } from './emit';
import { noteWireOk } from './return';
import { tally } from './tally';

const SLOW_MS = 2000;
const STILL_MS = 30_000;
const NEVER_MS = 120_000;

type Call = { procedure: string; at: number; still: number; never: boolean };
const inflight = new Map<string, Call>();

export function callsOpen(): number {
  return inflight.size;
}

/** A call that came back fine but said no: the kind of the refusal, never its words. */
function refusal(result: unknown): string | undefined {
  if (typeof result !== 'object' || result === null) return undefined;
  const one = result as { success?: unknown; error?: unknown };
  if (one.success !== false) return undefined;
  const error = one.error as { kind?: unknown; code?: unknown } | undefined;
  const kind =
    typeof error?.kind === 'string'
      ? error.kind
      : typeof error?.code === 'string'
        ? error.code
        : 'unknown';
  return errorKind(kind) ?? 'unknown';
}

let disconnectedAt: number | null = null;

/** The topic's family (`projectConfig`), never the topic itself, which can carry an id. */
function family(topic: string | undefined): string | undefined {
  const head = /^[A-Za-z][A-Za-z0-9_-]{0,30}/.exec(topic ?? '')?.[0];
  return head;
}

function errorKind(code: string | undefined): string | undefined {
  return code && /^[A-Za-z0-9_.:-]{1,64}$/.test(code) ? code : undefined;
}

/**
 * What the wire reports about itself, turned into the window's structured
 * report: a call's outcome and how long it took, a call still out after thirty
 * seconds and one that never came back, and the live models going quiet or
 * being rebuilt.
 */
export const wireWatch: WireInstrumentation = {
  callStart: ({ callId, path }) => {
    inflight.set(callId, {
      procedure: procedureOf(path),
      at: performance.now(),
      still: 0,
      never: false,
    });
  },
  callEnd: ({ callId, path, durationMs, ok, errorCode, errorMessage, result }) => {
    const call = inflight.get(callId);
    inflight.delete(callId);
    const procedure = call?.procedure ?? procedureOf(path);
    if (!ok) {
      tally.callsFailed++;
      emit('error', {
        msg: 'wire call failed',
        procedure,
        durationMs: durationMs,
        outcome: 'failed',
        errorKind: errorKind(errorCode),
        errorMessage: errorMessage?.slice(0, 100),
      });
      return;
    }
    tally.callsOk++;
    const refused = refusal(result);
    if (refused) {
      emit('warn', {
        msg: 'wire call refused',
        procedure,
        durationMs,
        outcome: 'refused',
        errorKind: refused,
      });
    }
    noteWireOk();
    if (durationMs > SLOW_MS) {
      tally.callsSlow++;
      emit('warn', { msg: 'wire call slow', procedure, durationMs, outcome: 'ok' });
    }
  },
  transport: ({ event }) => {
    if (event === 'disconnect') {
      disconnectedAt = performance.now();
      emit('error', { msg: 'wire closed', kind: 'wire.transport', stage: 'disconnect' });
    } else if (event === 'reconnect') {
      emit('warn', {
        msg: 'wire reconnected',
        kind: 'wire.transport',
        stage: 'reconnect',
        elapsedMs: disconnectedAt === null ? undefined : performance.now() - disconnectedAt,
      });
      disconnectedAt = null;
    }
  },
  snapshot: ({ topic, durationMs, ok, errorCode }) => {
    if (!ok || durationMs > 3000) {
      emit(ok ? 'warn' : 'error', {
        msg: ok ? 'subscription snapshot slow' : 'subscription snapshot failed',
        kind: family(topic),
        durationMs,
        errorKind: errorKind(errorCode),
      });
    }
  },
  resync: ({ topic, reason }) =>
    emit('warn', { msg: 'subscription resync', kind: family(topic), stage: reason }),
  resyncFailed: ({ topic, attempt, willRetry, error }) =>
    emit('error', {
      msg: 'subscription resync failed',
      kind: family(topic),
      count: attempt,
      stage: willRetry ? 'retrying' : 'gave-up',
      errorName: error instanceof Error ? error.name : undefined,
      errorMessage: error instanceof Error ? error.message.slice(0, 100) : undefined,
    }),
  cursorTranslationTimeout: ({ model }) =>
    emit('error', { msg: 'subscription cursor timed out', kind: family(model) }),
  batchDropped: ({ error }) =>
    emit('error', {
      msg: 'subscription batch dropped',
      errorName: error instanceof Error ? error.name : undefined,
      errorMessage: error instanceof Error ? error.message.slice(0, 100) : undefined,
    }),
  scopeCleanupError: ({ error }) =>
    emit('warn', {
      msg: 'subscription cleanup failed',
      errorName: error instanceof Error ? error.name : undefined,
    }),
};

/** Calls that have not come back, said at thirty seconds and every thirty after, and given up on at two minutes. */
export function watchCalls(): void {
  setInterval(() => {
    const now = performance.now();
    for (const call of inflight.values()) {
      const waited = now - call.at;
      if (waited > NEVER_MS && !call.never) {
        call.never = true;
        emit('error', {
          msg: 'wire call never returned',
          procedure: call.procedure,
          waitMs: waited,
          count: inflight.size,
        });
      } else if (waited > STILL_MS * (call.still + 1)) {
        call.still = Math.floor(waited / STILL_MS);
        emit('warn', {
          msg: 'wire call still waiting',
          procedure: call.procedure,
          waitMs: waited,
          count: inflight.size,
        });
      }
    }
  }, 5000);
}
