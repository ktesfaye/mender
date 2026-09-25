/**
 * Writing a board's rows onto the layer.
 *
 * Everything in this app that is not the yard itself — a file, a change, a
 * commit, a folder, a search, a shell, a pull request, the finder, what a
 * slash opens — is already a list of rows, computed from live data by a
 * dozen files that know nothing about how any of it is drawn. That was true
 * when the rows went into a canvas and it is still true now they go into the
 * page, which is why none of those files had to change.
 *
 * So this is the whole of the port: one function that turns a row into an
 * element, in the yard's own faces and tones rather than in bitmap ink on
 * wood.
 */

import type { Row, Tone } from '../board/row';
import { astop } from './walk';

/** What each tone is, in the light of the yard rather than on a plank. */
const INK: Record<Tone, string> = {
  ink: '#f4e3c0',
  faded: '#a89272',
  keen: 'var(--yard-well)',
  sore: 'var(--yard-wrong)',
  warn: 'var(--yard-warn)',
  /* Something quoted exactly — a name, a path, a flag — reads cool against the
     rest so it is a thing rather than a word. */
  quoted: 'var(--yard-quoted)',
  stress: 'var(--yard-stress)',
};

/**
 * What the mark in the margin is written in.
 *
 * A pressable line is gold whatever it means, so on a list of files the one
 * place left to say what happened to each is the mark beside it: the `D` of
 * a file that went is red and the `?` of one git has never seen is green,
 * while `→` and the ages of commits stay stone.
 */
function marked(tone: Tone | undefined): string {
  return tone && tone !== 'ink' ? INK[tone] : INK.faded;
}

/** How far one level of nesting moves a line in. */
const IN = 18;
/** The margin the marks live in, which is fixed so the words line up.
    Wide enough for the longest thing written in it — a `??`, a `→`, an age
    like `11mo` — because a mark that wraps turns `now` into a `no` over a
    `w`, which reads as two different words. */
const GUTTER = 38;

export interface Written {
  readonly root: HTMLElement;
  write(rows: Row[]): void;
}

/**
 * A board of rows, written on the layer.
 *
 * `press` hears about anything pressed, by the same `pick` string the rows
 * already carry, so whatever was answering picks before can carry on answering
 * them without knowing a thing about this file.
 */
export function makeRows(at: HTMLElement, press: (pick: string) => void): Written {
  const root = document.createElement('div');
  root.style.cssText = SHEET;
  at.appendChild(root);

  return {
    root,
    write(rows) {
      root.replaceChildren();
      for (const row of rows) root.appendChild(one(row, press));
    },
  };
}

function one(row: Row, press: (pick: string) => void): HTMLElement {
  const line = document.createElement('div');
  const pick = row.pick;
  /* Where the keyboard's mark goes when it stands on this row. The mark is the
     one fill in the app, so it hugs the words rather than the row: a fill the
     width of the board is a gold stripe, not a cursor. */
  let mine: HTMLElement | undefined;
  /* Gold is pressable and pressable is gold, so a row that can be pressed is
     written in it whatever tone the board computed. The mark in the margin and
     anything said after the thing itself stay stone, which is how a list of
     files reads as a list rather than as a wall of gold. */
  /* A pressable row takes its colour from the line rather than from each
     piece of it, so hover and press move the whole thing at once. */
  const ink = (tone: Tone | undefined): string => (pick ? 'inherit' : INK[tone ?? 'ink']);

  switch (row.kind) {
    case 'gap':
      line.style.height = '14px';
      return line;

    case 'title':
      line.style.cssText = TITLE;
      line.textContent = row.text;
      break;

    case 'heading':
      line.style.cssText = HEADING;
      line.textContent = row.text;
      break;

    case 'picture': {
      line.style.cssText = 'padding:8px 0';
      const img = document.createElement('img');
      img.src = row.src;
      img.width = row.wide;
      img.height = row.tall;
      /* A small picture is almost always pixel art wearing its own pixels as
         its detail, not a photo that happens to be small; blurring those into
         a smooth image would be losing the one thing worth looking at. */
      const crisp = Math.max(row.wide, row.tall) <= 256;
      img.style.cssText = `max-width:100%;height:auto;display:block;${crisp ? 'image-rendering:pixelated' : ''}`;
      line.appendChild(img);
      return line;
    }

    case 'typed': {
      /* Something taken off a board to be rewritten is being written here
         rather than on the line at the foot of the screen, so this is the
         one place other than that line that carries a cursor: full ink, and
         blinking after the text the way the real one does. */
      line.style.cssText = `${BODY};display:flex`;
      const said = document.createElement('span');
      said.style.color = INK.ink;
      said.textContent = row.text;
      const cursor = document.createElement('span');
      cursor.style.cssText = TYPED_CURSOR;
      line.append(said, cursor);
      break;
    }

    case 'entry': {
      line.style.cssText = `${BODY};display:flex;gap:8px`;
      const mark = document.createElement('span');
      mark.style.cssText = `width:${GUTTER}px;flex:none;color:${marked(row.tone)};text-align:right;white-space:nowrap`;
      mark.textContent = row.mark;
      const said = document.createElement('span');
      said.style.color = ink(row.tone);
      said.textContent = row.text;
      mine = said;
      line.append(mark, said);
      break;
    }

    case 'prose': {
      line.style.cssText = `${BODY};display:flex;gap:8px`;
      const mark = document.createElement('span');
      mark.style.cssText = `width:${GUTTER}px;flex:none;color:${INK.faded};text-align:right;white-space:nowrap`;
      mark.textContent = row.mark ?? '';
      const said = document.createElement('span');
      said.style.marginLeft = `${(row.in ?? 0) * IN}px`;
      /* A run keeps its own tone across a line break, which is the whole
         reason prose carries runs rather than a string. */
      if (row.runs?.length) {
        for (const run of row.runs) {
          const part = document.createElement('span');
          part.style.color = pick ? 'inherit' : INK[run.tone ?? row.tone ?? 'ink'];
          part.textContent = run.text;
          said.appendChild(part);
        }
      } else {
        said.style.color = ink(row.tone);
        said.textContent = row.text;
      }
      mine = said;
      line.append(mark, said);
      break;
    }

    default:
      line.style.cssText = BODY;
      line.style.color = ink(row.tone);
      line.textContent = row.text;
  }

  if (pick) {
    line.classList.add('press');
    line.addEventListener('mousedown', (event) => event.preventDefault());
    line.addEventListener('click', () => press(pick));
    astop(mine ?? line, pick);
  }
  return line;
}

const SHEET = ["font-family:'Josefin Sans',sans-serif", 'font-size:15px', 'line-height:1.45'].join(
  ';'
);

const TITLE = [
  "font-family:'Josefin Sans',sans-serif",
  'font-size:22px',
  'font-weight:600',
  'letter-spacing:.24em',
  'text-transform:uppercase',
  'color:#f4e3c0',
  'text-shadow:2px 2px 0 #120d07',
  'padding-bottom:6px',
].join(';');

const HEADING = [
  "font-family:'Josefin Sans',sans-serif",
  'font-size:11px',
  'letter-spacing:.24em',
  'text-transform:uppercase',
  'color:#a89272',
  'padding:12px 0 4px',
].join(';');

const TYPED_CURSOR = [
  'width:2px',
  'height:16px',
  'margin-left:2px',
  'background:#f4e3c0',
  'animation:yard-blink 900ms steps(1,end) infinite',
  'flex:none',
].join(';');

const BODY = [
  "font-family:'Josefin Sans',sans-serif",
  'font-size:15px',
  'line-height:1.45',
  /* Everything wraps. A board whose lines run off the edge is a board that
     has quietly decided what you are allowed to read. */
  'overflow-wrap:anywhere',
].join(';');
