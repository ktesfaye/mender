import type { LogFields, Logger } from './types';

const HEARTBEAT_MS = 60_000;
const WARN_MS = 10_000;
const QUIET_SLOW_MS = 1_000;
const MAX_ERROR_MESSAGE = 500;

export type OpOptions = {
  /** Log start and a fast successful end at debug; only slow or failed ops reach info/warn. */
  quiet?: boolean;
  heartbeatMs?: number;
  /** For quiet ops, the duration above which a successful end is logged at info. */
  slowMs?: number;
};

export type OpEndFields = LogFields & { outcome?: 'ok' | 'failed' };

export type Op = {
  readonly opId: string;
  readonly name: string;
  elapsedMs(): number;
  /** Log a named stage of this op with its elapsed time. */
  stage(stage: string, fields?: LogFields): void;
  end(fields?: OpEndFields): void;
  fail(error: unknown, fields?: LogFields): void;
};

let counter = 0;

function newOpId(): string {
  counter = (counter + 1) % 0xffffff;
  return `${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

export function describeOpError(error: unknown): { errorKind: string; errorMessage: string } {
  const kind = error instanceof Error ? error.name || 'Error' : typeof error;
  const raw = error instanceof Error ? error.message : String(error);
  return {
    errorKind: (error as { code?: unknown } | null)?.code
      ? `${kind}:${String((error as { code: unknown }).code)}`
      : kind,
    errorMessage: raw.length > MAX_ERROR_MESSAGE ? `${raw.slice(0, MAX_ERROR_MESSAGE)}...` : raw,
  };
}

export function startOp(
  log: Logger,
  name: string,
  fields: LogFields = {},
  options: OpOptions = {}
): Op {
  const opId = newOpId();
  const startedAt = now();
  const quiet = options.quiet === true;
  const slowMs = options.slowMs ?? QUIET_SLOW_MS;
  const base = { op: name, opId, ...fields };
  let finished = false;
  let reportedLong = false;
  let currentStage: string | undefined;
  const elapsed = (): number => Math.round(now() - startedAt);

  log[quiet ? 'debug' : 'info']('op start', base);

  const timer = setInterval(() => {
    reportedLong = true;
    log.info('op still going', {
      ...base,
      ...(currentStage ? { stage: currentStage } : {}),
      elapsedMs: elapsed(),
    });
  }, options.heartbeatMs ?? HEARTBEAT_MS);
  (timer as { unref?: () => void }).unref?.();

  const finish = (extra: OpEndFields, error?: unknown): void => {
    if (finished) return;
    finished = true;
    clearInterval(timer);
    const durationMs = elapsed();
    const failed = error !== undefined || extra.outcome === 'failed';
    const { outcome: _outcome, ...rest } = extra;
    const payload = {
      ...base,
      ...(currentStage ? { stage: currentStage } : {}),
      ...(error !== undefined ? describeOpError(error) : {}),
      ...rest,
      durationMs,
      outcome: failed ? 'failed' : 'ok',
    };
    if (failed || durationMs > WARN_MS) log.warn('op end', payload);
    else if (quiet && durationMs <= slowMs && !reportedLong) log.debug('op end', payload);
    else log.info('op end', payload);
  };

  return {
    opId,
    name,
    elapsedMs: elapsed,
    stage(stage, stageFields) {
      if (finished) return;
      currentStage = stage;
      log[quiet ? 'debug' : 'info']('op stage', {
        ...base,
        ...stageFields,
        stage,
        elapsedMs: elapsed(),
      });
    },
    end: (endFields = {}) => finish(endFields),
    fail: (error, failFields = {}) => finish(failFields, error),
  };
}

export async function trackOp<T>(
  log: Logger,
  name: string,
  fields: LogFields,
  fn: (op: Op) => Promise<T> | T,
  options?: OpOptions
): Promise<T> {
  const op = startOp(log, name, fields, options);
  try {
    const value = await fn(op);
    op.end();
    return value;
  } catch (error) {
    op.fail(error);
    throw error;
  }
}
