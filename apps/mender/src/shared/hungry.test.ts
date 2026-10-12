import { describe, expect, it } from 'vitest';
import { cheaperThan, isHungry } from './hungry';

describe('isHungry', () => {
  it('needs several times normal and a real piece of the window, or a huge piece alone', () => {
    expect(isHungry(0.1, 4)).toBe(true);
    expect(isHungry(0.1, 2)).toBe(false);
    expect(isHungry(0.03, 10)).toBe(false);
    expect(isHungry(0.25, null)).toBe(true);
  });
});

describe('cheaperThan', () => {
  it('offers only cheaper families, dearest first', () => {
    const offered = [
      { id: 'haiku', name: 'Haiku 4.5' },
      { id: 'opus', name: 'Opus 5.5' },
      { id: 'default', name: 'Default (recommended)' },
      { id: 'sonnet', name: 'Sonnet 5.5' },
      { id: 'fable', name: 'Fable 5.1' },
    ];
    expect(cheaperThan('Fable 5.1', offered).map((one) => one.id)).toEqual([
      'opus',
      'sonnet',
      'haiku',
    ]);
    expect(cheaperThan('Haiku 4.5', offered)).toEqual([]);
  });
});
