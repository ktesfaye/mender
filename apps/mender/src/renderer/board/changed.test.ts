import type { Change } from '@shared/changes';
import { describe, expect, it } from 'vitest';
import { lineNumberOf, readOut } from './changed';

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

describe('readOut', () => {
  it('offers a note on every marked line but the one already noted or pinned', () => {
    const rows = readOut(change, undefined, {
      noting: { at: 3, text: 'why replace this' },
      pinned: new Map([[4, { id: 'n1', text: 'stray blank line' }]]),
    });
    const picks = rows.map((row) => ('pick' in row ? row.pick : undefined));
    expect(picks).toContain('note:1');
    expect(picks).toContain('note:2');
    expect(picks).not.toContain('note:3');
    expect(picks).not.toContain('note:4');
    expect(picks).toContain('note-off:n1');
  });
});
