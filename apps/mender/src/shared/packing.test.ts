import { describe, expect, it } from 'vitest';

import { packedBy, piecesOf } from './packing';

describe('piecesOf', () => {
  it('lifts a doubled start and its end out as one packing between what was said', () => {
    expect(
      piecesOf('Looking now.Compacting...Compacting...\n\nCompacting completed.Carrying on.')
    ).toEqual([
      { kind: 'said', text: 'Looking now.' },
      { kind: 'pack', state: 'packed' },
      { kind: 'said', text: 'Carrying on.' },
    ]);
  });

  it('keeps a packing still going and one that failed apart', () => {
    expect(piecesOf('Compacting...')).toEqual([{ kind: 'pack', state: 'packing' }]);
    expect(piecesOf('Compacting...\n\nCompacting failed: too big')).toEqual([
      { kind: 'pack', state: 'failed', why: 'too big' },
    ]);
  });

  it('leaves ordinary words alone', () => {
    expect(piecesOf('Compacting the files.')).toEqual([
      { kind: 'said', text: 'Compacting the files.' },
    ]);
  });
});

it('packedBy never claims done while it is still working', () => {
  expect(packedBy(0, 1000)).toBe(0);
  expect(packedBy(1000, 1000)).toBeGreaterThan(0.8);
  expect(packedBy(1e9, 1000)).toBeLessThan(1);
});
