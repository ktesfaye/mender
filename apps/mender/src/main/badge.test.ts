import { describe, expect, it } from 'vitest';
import { wantsHim } from './badge';

describe('wantsHim', () => {
  it('is false with nobody working', () => {
    expect(wantsHim({})).toBe(false);
  });

  it('is false while everyone is merely working or resting', () => {
    expect(wantsHim({ a: 'working', b: 'resting', c: 'arriving' })).toBe(false);
  });

  it('is true if anybody is asking', () => {
    expect(wantsHim({ a: 'working', b: 'asking' })).toBe(true);
  });

  it('is true if anybody is hurt', () => {
    expect(wantsHim({ a: 'hurt' })).toBe(true);
  });
});
