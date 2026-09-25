import { describe, expect, it } from 'vitest';
import { attentionsFrom } from './attend';

describe('attentionsFrom', () => {
  it('rings once when a session starts asking', () => {
    expect(attentionsFrom({ a: 'working' }, { a: 'asking' })).toEqual(['a']);
  });

  it('rings when a session breaks', () => {
    expect(attentionsFrom({ a: 'working' }, { a: 'hurt' })).toEqual(['a']);
  });

  it('rings when a turn finishes', () => {
    expect(attentionsFrom({ a: 'working' }, { a: 'resting' })).toEqual(['a']);
  });

  it('does not ring again while still asking', () => {
    expect(attentionsFrom({ a: 'asking' }, { a: 'asking' })).toEqual([]);
  });

  it('does not ring for a session already resting when the app opens', () => {
    expect(attentionsFrom({ a: 'resting' }, { a: 'resting' })).toEqual([]);
  });

  it('does not ring when a session merely starts working', () => {
    expect(attentionsFrom({ a: 'arriving' }, { a: 'working' })).toEqual([]);
  });

  it('does not ring when a session settles to empty', () => {
    expect(attentionsFrom({ a: 'asking' }, {})).toEqual([]);
  });
});
