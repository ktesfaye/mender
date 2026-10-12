import { describe, expect, it } from 'vitest';
import { byVersion, releases } from './versions';

describe('byVersion', () => {
  it('puts each commit in the version of the nearest bump at or above it', () => {
    const commits = ['f', 'e', 'd', 'c', 'b', 'a'].map((hash) => ({
      hash,
      subject: `feat(x): ${hash}`,
    }));
    const bumps = new Map([['e', '0.3.0']]);
    expect(byVersion(commits, bumps)).toEqual([
      { version: null, lines: ['f'], more: 0 },
      { version: '0.3.0', lines: ['e', 'd', 'c'], more: 2 },
    ]);
  });
});

describe('releases', () => {
  it('folds platform tags into one version per release, newest first', () => {
    expect(
      releases(['1.9.0-android', '1.10.0-ios', 'v1.10.0-android', '1.10.1-beta.2', 'nightly'])
    ).toEqual([
      { version: '1.10.0', tags: ['1.10.0-ios', 'v1.10.0-android'] },
      { version: '1.9.0', tags: ['1.9.0-android'] },
    ]);
  });
});
