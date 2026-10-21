/**
 * How full its head is, and the one thing to do about it: make room now.
 *
 * What /context printed and /compact did, drawn: the room as a strip of cells, whether it makes
 * room by itself, and a gold line that has it pack the start of the talk down right away, with an
 * optional line saying what to keep an eye on. The packing itself is drawn by the board, the same
 * way it is when Claude does it unasked.
 */

import { glaze } from '../glass/glass';
import { ISLAND_LOOK } from '../glass/island-look';
import '../glass/island.css';
import '../glass/settings.css';
import { px } from '../glass/px';

export interface Head {
  /** How much room is left, from one down to nothing. */
  room: number;
  model?: string;
  /** Whether it makes room by itself, and how full before it does. Null while it is still being read. */
  auto: { on: boolean; window: number | null } | null;
}

export interface HeadDoings {
  /** Pack the start of the talk down now, keeping an eye on whatever was written. */
  make(focus: string): void;
  /** Open where the switch for doing it by itself lives. */
  settings(): void;
}

export function showHead(head: Head, does: HeadDoings): void {
  if (document.querySelector('.head-room')) return;
  const used = Math.round((1 - head.room) * 100);
  const tight = used >= 90;

  const scrim = document.createElement('div');
  scrim.className = 'head-room i-quit-scrim';
  const card = glaze(document.createElement('div'), ISLAND_LOOK);
  card.className += ' i-quit';

  const label = document.createElement('div');
  label.className = 'g-pix';
  label.style.marginBottom = '8px';
  label.textContent = head.model ? `its head · ${head.model}` : 'its head';
  const title = document.createElement('h1');
  title.className = 'g-serif';
  title.textContent = `${used}% full`;
  const top = document.createElement('div');
  top.className = 'i-top';
  const words = document.createElement('div');
  words.append(label, title);
  top.appendChild(words);

  const cells = document.createElement('div');
  cells.className = tight ? 'st-cells sore' : 'st-cells';
  const lit = Math.round((used / 100) * 40);
  for (let i = 0; i < 40; i += 1) {
    const cell = document.createElement('i');
    if (i < lit) cell.className = 'f';
    cells.appendChild(cell);
  }

  const note = document.createElement('p');
  note.className = 'st-hint';
  note.style.margin = '12px 0 0';
  const auto = head.auto;
  note.textContent =
    auto === null
      ? 'Once it fills, it starts losing the beginning of the talk.'
      : auto.on
        ? `It makes room by itself ${auto.window === null ? 'when it fills' : `once the talk reaches ${auto.window >= 1_000_000 ? '1m' : `${auto.window / 1000}k`} tokens`}.`
        : 'It will not make room by itself, so once it fills it starts losing the beginning of the talk.';
  if (auto && !auto.on) note.style.color = 'var(--g-sore)';

  const focus = document.createElement('input');
  focus.className = 'st-input';
  focus.placeholder = 'keep an eye on… (optional)';
  focus.spellcheck = false;
  focus.style.marginTop = '14px';

  const change = document.createElement('span');
  change.className = 'g-ghost';
  change.textContent = 'when it does it';
  const make = document.createElement('span');
  make.className = 'g-pill';
  make.append(px('flame', '#2b1a05', 13), document.createTextNode('make room now'));
  const buttons = document.createElement('div');
  buttons.className = 'i-btns';
  buttons.append(change, make);

  card.append(top, cells, note, focus, buttons);
  scrim.appendChild(card);
  document.body.appendChild(scrim);
  focus.focus();

  let done = false;
  const withdraw = (): void => {
    if (done) return;
    done = true;
    window.removeEventListener('keydown', onKey, true);
    scrim.remove();
  };
  function onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      withdraw();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      const said = focus.value.trim();
      withdraw();
      does.make(said);
    }
  }
  window.addEventListener('keydown', onKey, true);
  make.addEventListener('click', () => {
    const said = focus.value.trim();
    withdraw();
    does.make(said);
  });
  change.addEventListener('click', () => {
    withdraw();
    does.settings();
  });
  let downOutside = false;
  scrim.addEventListener('pointerdown', (event) => {
    downOutside = event.target === scrim;
  });
  scrim.addEventListener('click', (event) => {
    if (downOutside && event.target === scrim) withdraw();
  });
}
