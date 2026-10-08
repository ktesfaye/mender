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

  it('command-N founds a project on the island and cuts a workspace inside one', () => {
    expect(chordFor('n', 'island', 0)).toBe('do:found');
    expect(chordFor('n', 'session', 0)).toBe('do:workspace');
  });

  it('shift makes a chord of its own and falls back to the plain letter when unbound', () => {
    expect(chordFor('T', 'session', 0)).toBe('do:revive');
    expect(chordFor('t', 'session', 0)).toBe('new');
    expect(chordFor('I', 'session', 0)).toBe('card');
  });
});
