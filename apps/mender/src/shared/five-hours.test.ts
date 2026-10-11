import { describe, expect, it } from 'vitest';
import { FIVE_HOURS_MS, runsOut, windowLine } from './five-hours';

const resetsAt = Date.parse('2026-10-12T01:20:00Z');
const start = resetsAt - FIVE_HOURS_MS;

describe('runsOut', () => {
  it('lands the pace so far on the clock', () => {
    const now = start + 2 * 60 * 60_000;
    expect(runsOut({ utilization: 0.5, resetsAt }, now).at).toBe(start + 4 * 60 * 60_000);
  });

  it('says nothing off the first minutes or off next to nothing', () => {
    expect(runsOut({ utilization: 0.5, resetsAt }, start + 60_000).at).toBeNull();
    expect(runsOut({ utilization: 0.01, resetsAt }, start + 60 * 60_000).at).toBeNull();
  });

  it('scales by how the last stretch has gone', () => {
    const now = start + 2 * 60 * 60_000;
    expect(runsOut({ utilization: 0.5, resetsAt }, now, FIVE_HOURS_MS, 2).at).toBe(
      now + 60 * 60_000
    );
  });
});

describe('windowLine', () => {
  const five = (utilization: number, lately: number | null = null) => ({
    reading: { fiveHour: { utilization, resetsAt }, sevenDay: null, at: 0 },
    since: start,
    sessions: [],
    lately,
  });

  it('warns when the pace runs out before the reset, and not when it lasts', () => {
    const now = start + 2 * 60 * 60_000;
    expect(windowLine(five(0.6), now)).toMatchObject({ tone: 'warn' });
    expect(windowLine(five(0.3), now)).toMatchObject({ tone: 'quiet' });
    expect(windowLine(five(0.3), now)?.said).toContain('lasts to the reset');
  });

  it('says used up at the top', () => {
    expect(windowLine(five(1), start + 60 * 60_000)).toMatchObject({ tone: 'wrong' });
  });
});
