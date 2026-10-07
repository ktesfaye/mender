import { describe, expect, it } from 'vitest';
import { resetFrom } from './limit-clock';

describe('resetFrom', () => {
  it('reads the clock in the named zone as the next one after the limit was hit', () => {
    const hit = Date.parse('2026-10-07T15:41:03Z');
    const said = "You've hit your session limit · resets 11:20am (America/Los_Angeles)";
    expect(resetFrom(said, hit)).toBe(Date.parse('2026-10-07T18:20:00Z'));
    expect(resetFrom(said, Date.parse('2026-10-07T19:00:00Z'))).toBe(
      Date.parse('2026-10-08T18:20:00Z')
    );
  });

  it('reads a dated reset', () => {
    const hit = Date.parse('2026-10-07T15:41:03Z');
    expect(resetFrom("You've hit your weekly limit · resets Oct 9, 5pm (Europe/London)", hit)).toBe(
      Date.parse('2026-10-09T16:00:00Z')
    );
  });

  it('reads a duration', () => {
    expect(resetFrom('limit reached, resets in 45 minutes', 1000)).toBe(1000 + 45 * 60_000);
  });
});
