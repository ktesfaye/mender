/**
 * What a slash or an @ opens, drawn where you are writing.
 *
 * It used to be more rows on the same wash everything else is read on, a
 * brown band the width of the screen with the transcript showing through it,
 * and it was the hardest thing in the app to read. So it is its own small
 * dark slab now, standing on the line with its left edge on the slash you
 * typed, the way a completion list stands on the caret in any editor worth
 * using. The names are set in the type, because a command is a thing you
 * write and it should look like it; what each one is for sits after it in the
 * face labels use, and is cut to one line rather than wrapped into a paragraph.
 *
 * Every name is gold because every name is pressable. The one under the
 * keyboard is lifted rather than filled: a warm band, a gold edge, and its
 * words brighter. The whole list is there to scroll through; nothing is
 * hidden behind an "and ninety more".
 */

import type { Offer } from '../board/offer';
import { astop } from './walk';

export interface Menu {
  readonly root: HTMLElement;
  /** Write what is on offer, or nothing to close it. */
  write(offers: Offer[]): void;
  /** Stand it on the line, its left edge at `x`, its foot at `bottom` above the window's. */
  place(x: number, bottom: number, room: number): void;
}

/** How far the name is in from the slab's edge, so the slash lines up with the one typed. */
export const MENU_INSET = 44;

export function makeMenu(
  at: HTMLElement,
  press: (pick: string) => void,
  hover: (pick: string) => void
): Menu {
  const root = document.createElement('div');
  root.className = 'menu';
  root.dataset.narrowing = 'yes';
  root.style.display = 'none';
  at.appendChild(root);

  const list = document.createElement('div');
  list.className = 'menu-list';
  root.appendChild(list);

  return {
    root,
    write(offers) {
      list.replaceChildren();
      root.style.display = offers.length ? '' : 'none';
      if (!offers.length) return;

      /* Wide enough for the longest name here and no wider, so the reasons all
         start at the same place and read as a column. */
      const longest = Math.max(...offers.map((one) => one.name.length));
      root.style.setProperty('--menu-name', `${Math.min(Math.max(longest, 8), 30) + 1}ch`);

      const counted = new Map<string, number>();
      for (const one of offers) {
        const section = one.section ?? '';
        counted.set(section, (counted.get(section) ?? 0) + 1);
      }
      const sections = counted.size;
      let last: string | undefined;
      for (const offer of offers) {
        const section = offer.section ?? '';
        if (section !== last && section && sections > 0) {
          const head = document.createElement('div');
          head.className = 'menu-head';
          const said = document.createElement('span');
          said.textContent = section;
          const many = document.createElement('span');
          many.className = 'menu-count';
          many.textContent = String(counted.get(section) ?? '');
          head.append(said, many);
          list.appendChild(head);
        }
        last = section;
        list.appendChild(line(offer, press, hover));
      }
    },
    place(x, bottom, room) {
      const wide = Math.min(760, Math.max(360, window.innerWidth - 32));
      const left = Math.max(16, Math.min(x - MENU_INSET, window.innerWidth - wide - 16));
      root.style.left = `${Math.round(left)}px`;
      root.style.bottom = `${Math.round(bottom)}px`;
      root.style.width = `${wide}px`;
      list.style.maxHeight = `${Math.max(120, Math.min(330, room))}px`;
    },
  };
}

function line(
  offer: Offer,
  press: (pick: string) => void,
  hover: (pick: string) => void
): HTMLElement {
  const row = document.createElement('div');
  row.className = offer.sore ? 'menu-row sore' : offer.dear ? 'menu-row dear' : 'menu-row';

  const mark = document.createElement('span');
  mark.className = 'menu-mark';
  mark.textContent = offer.on ? '●' : '';

  const name = document.createElement('span');
  name.className = 'menu-name';
  const hit = offer.hit;
  if (hit && hit[1] > hit[0]) {
    name.append(offer.name.slice(0, hit[0]));
    const found = document.createElement('span');
    found.className = 'menu-hit';
    found.textContent = offer.name.slice(hit[0], hit[1]);
    name.append(found, offer.name.slice(hit[1]));
  } else {
    name.textContent = offer.name;
  }
  if (offer.takes) {
    const takes = document.createElement('span');
    takes.className = 'menu-takes';
    takes.textContent = ` ${offer.takes}`;
    name.appendChild(takes);
  }

  const about = document.createElement('span');
  about.className = 'menu-about';
  about.textContent = (offer.about ?? '').replace(/\s+/g, ' ').trim();

  row.append(mark, name, about);
  row.title = offer.about ?? '';
  row.addEventListener('mousedown', (event) => event.preventDefault());
  row.addEventListener('click', () => press(offer.pick));
  row.addEventListener('pointermove', () => {
    if (!row.classList.contains('picked')) hover(offer.pick);
  });
  return astop(row, offer.pick);
}
