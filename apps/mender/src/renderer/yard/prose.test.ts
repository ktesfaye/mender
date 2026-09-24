import { describe, expect, it } from 'vitest';
import { blocksOf, runsOf } from './prose';

describe('prose', () => {
  it('keeps underscores inside names and strips emphasis marks', () => {
    expect(runsOf('mcp__chrome__click is **big** and `x`')).toEqual([
      { text: 'mcp__chrome__click is ' },
      { text: 'big', className: 'prose-heavy' },
      { text: ' and ' },
      { text: 'x', className: 'prose-code' },
    ]);
  });

  it('reads a table with its divider dropped and numbers leaning right', () => {
    const [table] = blocksOf('| Name | Tokens |\n|---|---|\n| a | 2.2k |\n| b | 33 |');
    expect(table).toEqual({
      kind: 'table',
      rows: [
        ['Name', 'Tokens'],
        ['a', '2.2k'],
        ['b', '33'],
      ],
      right: [false, true],
    });
  });
});
