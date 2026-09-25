import { describe, expect, it } from 'vitest';
import { decodeAirSessionFailure, resetAtFrom } from './air-session-failure';

function meta(payload: Record<string, unknown>) {
  return { jetbrains: { air: { version: 1, sessionFailure: payload } } };
}

describe('decodeAirSessionFailure', () => {
  it('decodes a well-formed payload', () => {
    const failure = decodeAirSessionFailure(
      meta({
        id: 'abc',
        category: 'limit',
        severity: 'error',
        title: "you've hit your usage limit",
        details: 'resets 9pm',
        actions: ['retry', 'new_session', 'bogus'],
      })
    );
    expect(failure).toEqual({
      id: 'abc',
      category: 'limit',
      severity: 'error',
      title: "you've hit your usage limit",
      details: 'resets 9pm',
      actions: ['retry', 'new_session'],
      resetAt: expect.any(Number),
    });
  });

  it('returns null when no AIR extension version is present', () => {
    expect(decodeAirSessionFailure({ jetbrains: { air: { sessionFailure: { id: 'x' } } } })).toBe(
      null
    );
  });

  it('returns null when there is no sessionFailure payload', () => {
    expect(decodeAirSessionFailure(meta({}))).toBe(null);
    expect(decodeAirSessionFailure(undefined)).toBe(null);
    expect(decodeAirSessionFailure(null)).toBe(null);
  });

  it('falls back to unknown category and error severity', () => {
    const failure = decodeAirSessionFailure(meta({ id: 'x', title: 't' }));
    expect(failure?.category).toBe('unknown');
    expect(failure?.severity).toBe('error');
    expect(failure?.actions).toEqual([]);
  });
});

describe('resetAtFrom', () => {
  const now = new Date('2026-09-24T17:00:00').getTime();

  it('reads a later clock time today', () => {
    expect(resetAtFrom('resets 9pm', now)).toBe(new Date('2026-09-24T21:00:00').getTime());
  });

  it('rolls a passed clock time to tomorrow', () => {
    expect(resetAtFrom('resets 9am', now)).toBe(new Date('2026-09-25T09:00:00').getTime());
  });

  it('reads minutes with an explicit time', () => {
    expect(resetAtFrom('resets at 5:30pm', now)).toBe(new Date('2026-09-24T17:30:00').getTime());
  });

  it('reads a duration', () => {
    expect(resetAtFrom('resets in 45 minutes', now)).toBe(now + 45 * 60_000);
  });

  it('returns undefined when nothing matches', () => {
    expect(resetAtFrom('your account is out of usage credits', now)).toBeUndefined();
  });
});
