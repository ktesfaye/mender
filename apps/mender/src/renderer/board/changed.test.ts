import { describe, expect, it } from 'vitest';
import type { Change } from '@shared/changes';
import { lineNumberOf } from './changed';

const change: Change = {
  path: 'src/a.ts',
  kind: 'changed',
  added: 1,
  taken: 1,
  lines: ['… 5 lines', ' unchanged', '-old', '+new', ' after'],
};

describe('lineNumberOf', () => {
  it('carries a skipped stretch forward by however many lines it says', () => {
    expect(lineNumberOf(change, 1)).toBe(6);
  });

  it('does not move on for a removed line', () => {
    expect(lineNumberOf(change, 2)).toBe(7);
    expect(lineNumberOf(change, 3)).toBe(7);
  });

  it('moves on again once the added line is behind it', () => {
    expect(lineNumberOf(change, 4)).toBe(8);
  });
});
