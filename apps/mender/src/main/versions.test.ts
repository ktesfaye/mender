import { describe, expect, it } from 'vitest';
import { byVersion } from './versions';

describe('byVersion', () => {
  it('puts each commit in the version of the nearest bump at or above it', () => {
    const commits = ['e', 'd', 'c', 'b', 'a'].map((hash) => ({ hash, subject: `feat(x): ${hash}` }));
    const bumps = new Map([
      ['d', '0.3.0'],
      ['b', '0.2.1'],
    ]);
    expect(byVersion(commits, bumps)).toEqual([
      { version: null, lines: ['e'] },
      { version: '0.3.0', lines: ['d', 'c'] },
      { version: '0.2.1', lines: ['b', 'a'] },
    ]);
  });
});
