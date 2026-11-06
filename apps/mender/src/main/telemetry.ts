import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { app, net } from 'electron';
import { scrub } from './telemetry-scrub';

/**
 * The app's own behaviour, sent to the developer, carrying none of the work.
 *
 * Tees the main log's destination, so worker lines forwarded into the same
 * logger are included. Every line is rebuilt by `scrub` (an allowlist) before
 * it is buffered; what is dropped is only counted. Nothing here may throw into
 * the app or log through the stream it is reading: its own trouble is counted
 * and written, occasionally, straight to the local file.
 */

declare const __MENDER_AXIOM_TOKEN__: string | undefined;
declare const __MENDER_AXIOM_DATASET__: string | undefined;

const FLUSH_EVERY_MS = 10_000;
const BATCH = 500;
const CAP = 5000;
const REQUEST_TIMEOUT_MS = 15_000;
const BACKOFF_FIRST_MS = 10_000;
const BACKOFF_MAX_MS = 5 * 60_000;
const SUMMARY_EVERY_MS = 5 * 60_000;

export interface Telemetry {
  ingest(line: string): void;
  flush(timeoutMs: number): Promise<void>;
}

export interface TelemetryOptions {
  /** Writes a raw line to the local file only. */
  local: (line: string) => void;
}

function embedded(value: string | undefined): string | undefined {
  return value && value.length > 0 ? value : undefined;
}

function installId(): string {
  const file = join(app.getPath('userData'), 'install-id');
  try {
    const kept = readFileSync(file, 'utf8').trim();
    if (/^[0-9a-f-]{36}$/.test(kept)) return kept;
  } catch {
    // First run.
  }
  const made = randomUUID();
  try {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, made);
  } catch {
    // An id that does not persist is still an id for this run.
  }
  return made;
}

export function startTelemetry(options: TelemetryOptions): Telemetry | undefined {
  const token =
    embedded(process.env.MENDER_AXIOM_TOKEN) ??
    embedded(typeof __MENDER_AXIOM_TOKEN__ === 'undefined' ? undefined : __MENDER_AXIOM_TOKEN__);
  if (!token) return undefined;
  const dataset =
    embedded(process.env.MENDER_AXIOM_DATASET) ??
    embedded(
      typeof __MENDER_AXIOM_DATASET__ === 'undefined' ? undefined : __MENDER_AXIOM_DATASET__
    ) ??
    'mender';
  const base = (process.env.MENDER_AXIOM_URL ?? 'https://us-east-1.aws.edge.axiom.co').replace(
    /\/+$/,
    ''
  );
  const url = `${base}/v1/ingest/${encodeURIComponent(dataset)}`;

  const identity = {
    installId: installId(),
    launchId: randomUUID(),
    version: app.getVersion(),
    packaged: app.isPackaged,
    electron: process.versions.electron,
    platform: `${process.platform} ${process.arch}`,
  };

  let buffer: Record<string, unknown>[] = [];
  const dropped = new Map<string, number>();
  let overflowed = 0;
  let failures = 0;
  let sent = 0;
  let sending: Promise<void> | undefined;
  let blockedUntil = 0;
  let spoke = 0;

  const note = (what: string, fields: Record<string, unknown>): void => {
    try {
      options.local(
        `${JSON.stringify({ level: 'info', time: new Date().toISOString(), proc: 'main', area: 'telemetry', msg: what, ...fields })}\n`
      );
    } catch {
      // Nowhere left to say it.
    }
  };

  const push = (event: Record<string, unknown>): void => {
    buffer.push(event);
    if (buffer.length > CAP) {
      overflowed += buffer.length - CAP;
      buffer = buffer.slice(buffer.length - CAP);
    }
  };

  const post = async (events: Record<string, unknown>[]): Promise<boolean> => {
    try {
      const response = await net.fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(events),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      await response.arrayBuffer().catch(() => undefined);
      return response.ok;
    } catch {
      return false;
    }
  };

  const drain = async (): Promise<void> => {
    await app.whenReady();
    while (buffer.length > 0 && Date.now() >= blockedUntil) {
      const batch = buffer.slice(0, BATCH);
      if (await post(batch)) {
        buffer = buffer.slice(batch.length);
        sent += batch.length;
        failures = 0;
        continue;
      }
      failures += 1;
      blockedUntil = Date.now() + Math.min(BACKOFF_MAX_MS, BACKOFF_FIRST_MS * 2 ** (failures - 1));
      if (failures === 1 || Date.now() - spoke > 10 * 60_000) {
        spoke = Date.now();
        note('telemetry: could not ship', {
          count: buffer.length,
          errorKind: 'offline-or-refused',
        });
      }
      return;
    }
  };

  const run = (): Promise<void> => {
    sending ??= drain().finally(() => {
      sending = undefined;
    });
    return sending;
  };

  const every = setInterval(() => void run(), FLUSH_EVERY_MS);
  every.unref();

  const eventOf = (msg: string, fields: Record<string, unknown>): Record<string, unknown> => {
    const time = new Date().toISOString();
    return {
      _time: time,
      time,
      level: 'info',
      proc: 'main',
      area: 'telemetry',
      msg,
      ...fields,
      ...identity,
    };
  };

  const summary = setInterval(() => {
    const total = [...dropped.values()].reduce((a, b) => a + b, 0);
    if (total === 0 && overflowed === 0) return;
    push(eventOf('telemetry: dropped', { count: total, dropped: overflowed }));
    for (const [reason, count] of dropped) push(eventOf(`telemetry: dropped ${reason}`, { count }));
    dropped.clear();
    overflowed = 0;
  }, SUMMARY_EVERY_MS);
  summary.unref();

  const flush = async (timeoutMs: number): Promise<void> => {
    blockedUntil = 0;
    await Promise.race([run(), new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))]);
  };

  app.once('will-quit', (event) => {
    if (buffer.length === 0) return;
    event.preventDefault();
    void flush(2500).finally(() => app.exit(0));
  });

  note('telemetry: shipping', { count: sent });

  return {
    ingest(line) {
      try {
        const verdict = scrub(JSON.parse(line) as Record<string, unknown>);
        if ('drop' in verdict) {
          dropped.set(verdict.drop, (dropped.get(verdict.drop) ?? 0) + 1);
          return;
        }
        push({ _time: verdict.ship.time, ...verdict.ship, ...identity });
        if (buffer.length >= BATCH) void run();
      } catch {
        dropped.set('unparsed', (dropped.get('unparsed') ?? 0) + 1);
      }
    },
    flush,
  };
}
