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

  it('keeps a web link as its words and its address, and drops any other kind', () => {
    expect(runsOf('see [the docs](https://example.com/a) or [this](/local)')).toEqual([
      { text: 'see ' },
      { text: 'the docs', href: 'https://example.com/a' },
      { text: ' or ' },
      { text: 'this' },
    ]);
  });

  it('links a bare address without the punctuation after it', () => {
    expect(runsOf('go to https://example.com/a?b=1. or <https://x.io>')).toEqual([
      { text: 'go to ' },
      { text: 'https://example.com/a?b=1', href: 'https://example.com/a?b=1' },
      { text: '. or ' },
      { text: 'https://x.io', href: 'https://x.io' },
    ]);
  });

  it('reads a mermaid fence as a diagram block and any other fence as code', () => {
    expect(blocksOf('```mermaid\ngraph TD\n  A --> B\n```')).toEqual([
      { kind: 'mermaid', text: 'graph TD\n  A --> B' },
    ]);
    expect(blocksOf('```js\nconst a = 1\n```')).toEqual([{ kind: 'code', text: 'const a = 1' }]);
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
