import { describe, expect, it } from 'vitest';
import { hiddenCount, revealMore, windowStart } from './window';

describe('windowStart', () => {
  it('shows everything when the list is shorter than the window', () => {
    expect(windowStart(10, 60)).toBe(0);
  });

  it('starts short of the end by exactly what is shown', () => {
    expect(windowStart(500, 60)).toBe(440);
  });

  it('never starts past the end of the list', () => {
    expect(windowStart(10, 0)).toBe(10);
  });
});

describe('hiddenCount', () => {
  it('adds what the server already dropped to what the window is hiding', () => {
    expect(hiddenCount(500, 60, 100)).toBe(540);
  });

  it('is zero when nothing is hidden either way', () => {
    expect(hiddenCount(40, 60, 0)).toBe(0);
  });
});

describe('revealMore', () => {
  it('grows by the chunk', () => {
    expect(revealMore(500, 60, 80)).toBe(140);
  });

  it('stops at the whole list rather than overshooting it', () => {
    expect(revealMore(100, 60, 80)).toBe(100);
  });
});
