import { describe, expect, it } from 'vitest';
import { fitsSomeDisplay } from './window-state';

describe('fitsSomeDisplay', () => {
  it('accepts a rectangle overlapping a current display', () => {
    expect(
      fitsSomeDisplay(
        { x: 100, y: 100, width: 400, height: 300 },
        [{ x: 0, y: 0, width: 1920, height: 1080 }]
      )
    ).toBe(true);
  });

  it('rejects a rectangle off every current display', () => {
    expect(
      fitsSomeDisplay(
        { x: 5000, y: 5000, width: 400, height: 300 },
        [{ x: 0, y: 0, width: 1920, height: 1080 }]
      )
    ).toBe(false);
  });
});
