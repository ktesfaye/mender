import type { TranscriptTurn } from '@emdash/core/runtimes/acp/api';
import { describe, expect, it } from 'vitest';
import { kept, madeIn } from './made';

const turn = (items: unknown[]): TranscriptTurn =>
  ({ id: 't', items, outcome: { kind: 'done' } }) as unknown as TranscriptTurn;
const clock = () => 5;

describe('madeIn', () => {
  it('keeps written documents and skips written source and bookkeeping', () => {
    const made = madeIn(
      [
        turn([
          {
            kind: 'create-file-tool-call',
            id: 'a',
            path: '/r/docs/plan.md',
            content: '',
            status: 'done',
          },
          {
            kind: 'create-file-tool-call',
            id: 'b',
            path: '/r/src/x.ts',
            content: '',
            status: 'done',
          },
          {
            kind: 'create-file-tool-call',
            id: 'c',
            path: '/r/CLAUDE.md',
            content: '',
            status: 'done',
          },
          {
            kind: 'create-file-tool-call',
            id: 'd',
            path: '/tmp/x/page.html',
            content: '',
            status: 'done',
          },
        ]),
      ],
      clock
    );
    expect(made.map((one) => one.id)).toEqual(['/r/docs/plan.md']);
  });

  it('finds published pages and built apps in what it said', () => {
    const made = madeIn(
      [
        turn([
          {
            kind: 'message',
            role: 'assistant',
            id: 'm',
            text: 'Published [Trip plan](https://claude.ai/code/artifact/ab-12). Installed /Applications/Mender.app, not /Applications/Xcode.app/Contents.',
          },
        ]),
      ],
      clock
    );
    expect(made.map((one) => [one.kind, one.name])).toEqual([
      ['page', 'Trip plan'],
      ['build', 'Mender.app'],
    ]);
  });

  it('names a published page after its own title, or the words just before a bare address', () => {
    const made = madeIn(
      [
        turn([
          {
            kind: 'create-file-tool-call',
            id: 'w',
            path: '/s/acts.tpl.html',
            content: '<title>Second Lines</title>',
            status: 'done',
          },
          {
            kind: 'unknown-tool-call',
            id: 'p',
            name: 'Artifact',
            status: 'done',
            outputText: 'Published /s/acts.html at https://claude.ai/artifact/X1 (Version 1)',
          },
          {
            kind: 'message',
            role: 'assistant',
            id: 'm',
            text: 'Still there. Food is at https://claude.ai/artifact/F2 and activities at https://claude.ai/artifact/X1.',
          },
        ]),
      ],
      clock
    );
    expect(
      kept([], made)
        .filter((one) => one.kind === 'page')
        .map((one) => [one.id, one.name])
    ).toEqual([
      ['https://claude.ai/artifact/X1', 'Second Lines'],
      ['https://claude.ai/artifact/F2', 'Food'],
    ]);
  });
});

describe('kept', () => {
  it('never loses what was kept and keeps the first time it was seen', () => {
    const before = [{ id: '/a.md', kind: 'file' as const, name: 'a.md', path: '/a.md', at: 3 }];
    const found = [
      { id: '/a.md', kind: 'file' as const, name: 'a.md', path: '/a.md', at: 9 },
      { id: '/b.md', kind: 'file' as const, name: 'b.md', path: '/b.md', at: 7 },
    ];
    expect(kept(before, found).map((one) => [one.id, one.at])).toEqual([
      ['/b.md', 7],
      ['/a.md', 3],
    ]);
    expect(kept(before, []).map((one) => one.id)).toEqual(['/a.md']);
  });
});
