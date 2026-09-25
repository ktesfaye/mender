import { describe, expect, it } from 'vitest';
import { createQuitGate, STAND_MS } from './quit-gate';

describe('createQuitGate', () => {
  it('allows a quit outright when nobody is working', () => {
    const gate = createQuitGate();
    expect(gate.attempt(0, 0)).toBe('allow');
  });

  it('asks the first time somebody is working', () => {
    const gate = createQuitGate();
    expect(gate.attempt(0, 2)).toBe('ask');
  });

  it('allows a second attempt that lands inside the stand time', () => {
    const gate = createQuitGate();
    gate.attempt(0, 1);
    expect(gate.attempt(STAND_MS - 1, 1)).toBe('allow');
  });

  it('asks again if the second attempt lands after the stand time', () => {
    const gate = createQuitGate();
    gate.attempt(0, 1);
    expect(gate.attempt(STAND_MS + 1, 1)).toBe('ask');
  });

  it('lets a press of the line confirm inside the stand time', () => {
    const gate = createQuitGate();
    gate.attempt(0, 1);
    expect(gate.press(STAND_MS - 1)).toBe(true);
  });

  it('refuses a press of the line after it has withdrawn', () => {
    const gate = createQuitGate();
    gate.attempt(0, 1);
    expect(gate.press(STAND_MS + 1)).toBe(false);
  });

  it('allows every attempt after one has been confirmed', () => {
    const gate = createQuitGate();
    gate.attempt(0, 1);
    gate.press(1000);
    expect(gate.attempt(2000, 1)).toBe('allow');
  });
});
