import { describe, expect, it } from 'vitest';
import { branchFor } from './tasks';

describe('branchFor', () => {
  it('falls back to the built-in prefix when none is set', () => {
    expect(branchFor('Fix the thing')).toBe('mender/fix-the-thing');
  });

  it('uses a configured prefix', () => {
    expect(branchFor('Fix the thing', { branchPrefix: 'kx', randomSuffix: false })).toBe(
      'kx/fix-the-thing'
    );
  });

  it('strips slashes off a configured prefix', () => {
    expect(branchFor('work', { branchPrefix: '/kx/', randomSuffix: false })).toBe('kx/work');
  });

  it('adds a random tail only when asked', () => {
    const plain = branchFor('work', { branchPrefix: 'kx', randomSuffix: false });
    const tailed = branchFor('work', { branchPrefix: 'kx', randomSuffix: true });
    expect(plain).toBe('kx/work');
    expect(tailed).toMatch(/^kx\/work-[a-z0-9]{6}$/);
  });

  it('slugifies punctuation and collapses to "work" when nothing is left', () => {
    expect(branchFor('!!!')).toBe('mender/work');
  });
});
