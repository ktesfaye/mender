import { describe, expect, it } from 'vitest';
import { describeMissed } from './missed';

describe('describeMissed', () => {
  it('names what happened to each session', () => {
    expect(
      describeMissed(
        [
          ['a', 'asking'],
          ['b', 'hurt'],
          ['c', 'resting'],
        ],
        (task) => ({ a: 'lighthouse', b: 'garden', c: 'mill' })[task]
      )
    ).toEqual(['lighthouse asked', 'garden broke', 'mill finished']);
  });

  it('drops a session whose title is gone', () => {
    expect(describeMissed([['a', 'asking']], () => undefined)).toEqual([]);
  });

  it('folds anything past the cap into one more line', () => {
    const entries: [string, 'asking'][] = [
      ['a', 'asking'],
      ['b', 'asking'],
      ['c', 'asking'],
      ['d', 'asking'],
      ['e', 'asking'],
      ['f', 'asking'],
    ];
    expect(describeMissed(entries, (task) => task)).toEqual([
      'a asked',
      'b asked',
      'c asked',
      'd asked',
      '2 more',
    ]);
  });
});
