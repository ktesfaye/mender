import { Application } from 'pixi.js';
import { makeBoard, type Row } from './board/board';
import { readOut } from './board/changed';
import { dropOf, LINE, loadLettering, stepOf } from './board/lettering';
import { makeRail } from './board/rail';
import { saying } from './board/writing';
import { setPace } from './pace';

/**
 * The board, on its own, with nothing running behind it.
 *
 * Everything the board can draw needs an agent, a checkout and a running
 * session to see, which means the only way to look at a change to the page was
 * to start the app, find a project, open a district, open a session and wait
 * for somebody to say something — and then it is whatever that session happens
 * to contain rather than every kind of row at once. So this is the page with a
 * canned board on it: every row kind, both hands, the longest line and the
 * shortest, opened in a browser at `/look.html` off the dev server.
 *
 * It is not built and never ships: `electron-vite` builds `index.html` and
 * this is not it. It exists so a change to the wood, the paper, the rhythm or
 * either face can be LOOKED at, which is the only thing that has ever caught
 * anything here.
 */

const CODE = [
  'function wrapped(runs, room, face) {',
  '  const lines = [];',
  '  let width = 0;',
  '  return lines;',
  '}',
].join('\n');

const SAID = `Right, found it. The board measured every line in characters and
the hand is not monospaced, so \`mmm\` and \`iii\` wrapped at the same place
and one of them hung three characters off the edge.

## What it needed

- a width table per face, read off the font Pixi actually built
- wrapping in pixels
- and the marks left in the type, because the hand has no bullet in it

Here is the wrap itself:

\`\`\`
${CODE}
\`\`\`

| face | size | what it is for |
| --- | --- | --- |
| hand | 16 | anything anybody says |
| type | 11 | anything whose columns mean something |

---

Done, and waiting for you to say something.`;

const ROWS: Row[] = [
  { kind: 'title', text: 'Say hello' },
  {
    kind: 'line',
    text: '…el/mender/worktrees/aurio/mender-teach-the-fire-to-spread',
    tone: 'faded',
    keep: 'tail',
  },
  { kind: 'gap' },
  { kind: 'line', text: 'on mender/teach-the-fire-to-spread' },
  { kind: 'entry', mark: '↑', text: 'send this branch up', pick: 'send' },
  { kind: 'entry', mark: '→', text: 'open a shell in here', pick: 'shell' },
  { kind: 'entry', mark: '→', text: 'what is open for this branch', pick: 'open' },
  { kind: 'gap' },
  { kind: 'heading', text: 'uncommitted' },
  { kind: 'line', text: 'nothing, the tree is clean.', tone: 'faded' },
  { kind: 'gap' },
  { kind: 'heading', text: 'what it thinks with' },
  {
    kind: 'entry',
    mark: '●',
    text: 'Opus 5 · the one that thinks hardest',
    tone: 'ink',
    pick: 'm1',
  },
  {
    kind: 'entry',
    mark: '·',
    text: 'Sonnet 5 · quicker, and nearly as good',
    tone: 'faded',
    pick: 'm2',
  },
  { kind: 'gap' },
  ...saying(SAID, '·'),
  { kind: 'gap' },
  { kind: 'line', text: 'room to think ██████████████████████████─', tone: 'faded' },
  { kind: 'typed', text: 'try the wrap on a really long word: supercalifragilistic' },
];

const CHANGE: Row[] = readOut({
  path: 'apps/mender/src/renderer/board/lettering.ts',
  lines: [
    '…  22 lines',
    " export function widthOf(text: string, hand: Hand = 'hand'): number {",
    '-  return text.length * ADVANCE;',
    '+  const table = WIDE[hand];',
    '+  let wide = 0;',
    '+  for (const letter of text) wide += table.get(letter) ?? blank;',
    '+  return wide;',
    ' }',
  ],
  more: 0,
} as never);

async function boot(): Promise<void> {
  const pixi = new Application();
  await pixi.init({
    background: '#2d5d6b',
    resizeTo: window,
    antialias: false,
    roundPixels: true,
    resolution: window.devicePixelRatio,
    autoDensity: true,
    sharedTicker: true,
  });
  setPace(pixi);
  document.body.appendChild(pixi.canvas);

  await loadLettering();
  const shown = globalThis as unknown as Record<string, unknown>;
  shown.rhythm = { line: LINE, hand: dropOf('hand'), type: dropOf('type'), m: stepOf('type') };
  const board = await makeBoard(pixi);
  const rail = await makeRail(pixi);
  rail.show([
    { id: 'm', mark: 'M', name: 'mender', here: true },
    { id: 'a', mark: 'A', name: 'aurio' },
    { id: 'e', mark: 'E', name: 'emdash' },
  ]);

  const boards = [ROWS, CHANGE];
  let at = 0;
  board.show(boards[0] as Row[]);
  board.onPick((pick) => console.log('pressed', pick));

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      at = (at + 1) % boards.length;
      board.show(boards[at] as Row[]);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      board.walk(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    board.scrolled(event.key);
  });
}

void boot();
