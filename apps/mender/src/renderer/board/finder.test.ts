import { describe, expect, it } from 'vitest';
import { chordFor } from './finder';

describe('chordFor', () => {
  it('a rebound chord answers to the new key and not the old one', () => {
    expect(chordFor('r', 'district', 0, { new: 'r' })).toBe('new');
    expect(chordFor('t', 'district', 0, { new: 'r' })).toBeNull();
  });

  it('falls back to the table default for anything not rebound', () => {
    expect(chordFor('i', 'session', 0, { new: 'r' })).toBe('card');
  });
});
