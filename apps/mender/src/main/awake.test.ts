import { describe, expect, it } from 'vitest';
import { anyWorking } from './awake';

describe('anyWorking', () => {
  it('is false with nobody working', () => {
    expect(anyWorking({})).toBe(false);
  });

  it('is false while everyone is asking, resting or hurt', () => {
    expect(anyWorking({ a: 'asking', b: 'resting', c: 'hurt' })).toBe(false);
  });

  it('is true if anybody is working', () => {
    expect(anyWorking({ a: 'resting', b: 'working' })).toBe(true);
  });
});
