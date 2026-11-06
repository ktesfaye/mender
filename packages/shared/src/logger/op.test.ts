import { describe, expect, it, vi } from 'vitest';
import { trackOp } from './op';
import type { LogFields, Logger } from './types';

function recorder() {
  const lines: Array<{ level: string; message: string; fields: LogFields }> = [];
  const make = (): Logger => ({
    level: 'debug',
    debug: (message, fields = {}) => lines.push({ level: 'debug', message, fields }),
    info: (message, fields = {}) => lines.push({ level: 'info', message, fields }),
    warn: (message, fields = {}) => lines.push({ level: 'warn', message, fields }),
    error: (message, fields = {}) => lines.push({ level: 'error', message, fields }),
    child: make,
  });
  return { log: make(), lines };
}

describe('trackOp', () => {
  it('logs start, heartbeat and a failed end with the error', async () => {
    vi.useFakeTimers();
    const { log, lines } = recorder();
    const pending = trackOp(
      log,
      'demo',
      { procedure: 'a.b' },
      () => new Promise((_, reject) => setTimeout(() => reject(new TypeError('boom')), 150)),
      { heartbeatMs: 100 }
    );
    const settled = pending.catch(() => undefined);
    await vi.advanceTimersByTimeAsync(200);
    await settled;
    vi.useRealTimers();
    expect(lines.map((l) => l.message)).toEqual(['op start', 'op still going', 'op end']);
    expect(lines[2]).toMatchObject({
      level: 'warn',
      fields: { op: 'demo', procedure: 'a.b', outcome: 'failed', errorKind: 'TypeError' },
    });
    expect(lines[2]!.fields.opId).toBe(lines[0]!.fields.opId);
  });
});
