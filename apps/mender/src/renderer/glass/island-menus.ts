/**
 * The two menus the island offers, in lantern glass: a right-click on the
 * water, and a right-click on a project's board on the rack. The DOM lives
 * here so main.ts only says what each line does.
 */

import type { Sky } from '../village/sky';
import { clock, keepOnScreen, skySlab } from '../village/sky-slab';
import { glaze } from './glass';
import { ISLAND_LOOK } from './island-look';
import './island.css';
import { px } from './px';

/** A line of a menu: a sign in a small well, a name, what it does, and its state. */
export function menuRow(
  sign: string,
  name: string,
  about: string,
  does: () => void,
  options: { end?: string; on?: boolean } = {}
): HTMLElement {
  const row = document.createElement('div');
  row.className = options.on ? 'i-row i-on' : 'i-row';
  const well = document.createElement('span');
  well.className = 'i-ic';
  well.appendChild(px(sign, '#f2c66d', 18));
  const words = document.createElement('div');
  const top = document.createElement('div');
  top.className = 'i-nm';
  top.textContent = name;
  const under = document.createElement('div');
  under.className = 'i-ds';
  under.textContent = about;
  words.append(top, under);
  row.append(well, words);
  if (options.end) {
    const end = document.createElement('span');
    end.className = 'i-end';
    end.textContent = options.end;
    row.appendChild(end);
  }
  /* A press never takes the keyboard off the line being written on. */
  row.addEventListener('mousedown', (event) => event.preventDefault());
  row.addEventListener('click', does);
  return row;
}

function shell(): HTMLDivElement {
  const slab = document.createElement('div');
  slab.className = 'i-pane i-menu';
  glaze(slab, ISLAND_LOOK);
  slab.addEventListener('contextmenu', (event) => event.preventDefault());
  return slab;
}

function place(slab: HTMLElement, x: number, y: number): void {
  slab.style.left = `${Math.max(12, Math.min(x, window.innerWidth - slab.offsetWidth - 12))}px`;
  slab.style.top = `${Math.max(12, Math.min(y, window.innerHeight - slab.offsetHeight - 12))}px`;
}

export interface WaterMenu {
  sky: Sky;
  x: number;
  y: number;
  parent: HTMLElement;
  /** Rearranging the districts was picked. */
  edit(): void;
  /** The menu turned into the sky panel; this is what is on the island now. */
  opened(sky: HTMLElement): void;
}

/** Right-click on the water: edit the districts, or take the sky in hand. */
export function waterMenu(options: WaterMenu): HTMLElement {
  const { sky } = options;
  const slab = shell();

  const head = document.createElement('div');
  head.className = 'i-hd';
  const label = document.createElement('span');
  label.className = 'g-pix';
  label.textContent = 'the water';
  const now = document.createElement('span');
  now.className = 'g-chip';
  const dot = document.createElement('span');
  dot.className = 'g-dot';
  dot.style.background = 'var(--g-moss)';
  const hour = sky.chosen.time === 'real' ? new Date() : null;
  const shown = hour ? hour.getHours() + hour.getMinutes() / 60 : (sky.chosen.time as number) % 24;
  now.append(dot, document.createTextNode(clock(shown)));
  head.append(label, now);

  const own = sky.chosen.time !== 'real' || sky.chosen.weather !== 'real';
  slab.append(
    head,
    menuRow('flag', 'edit districts', 'pick one up, put it down elsewhere', options.edit, {
      on: true,
    }),
    menuRow(
      'sun_i',
      'the sky',
      'the hour and the weather',
      () => {
        const opened = skySlab(sky);
        options.parent.appendChild(opened);
        opened.style.left = slab.style.left;
        opened.style.top = slab.style.top;
        slab.remove();
        options.opened(opened);
        keepOnScreen(opened);
      },
      { end: own ? 'your own' : 'outside' }
    )
  );
  options.parent.appendChild(slab);
  place(slab, options.x, options.y);
  return slab;
}

export interface RackMenu {
  name: string;
  away: boolean;
  x: number;
  y: number;
  parent: HTMLElement;
  /** Put away, or put back on the island. */
  does(): void;
}

/** Right-click on a project's board on the rack. */
export function rackMenuPane(options: RackMenu): HTMLElement {
  const slab = shell();
  slab.style.width = '268px';
  const head = document.createElement('div');
  head.className = 'i-hd';
  const name = document.createElement('b');
  name.textContent = options.name;
  head.appendChild(name);
  if (options.away) {
    const chip = document.createElement('span');
    chip.className = 'g-chip';
    const dot = document.createElement('span');
    dot.className = 'g-dot';
    dot.style.background = 'var(--g-ink-3)';
    chip.append(dot, document.createTextNode('put away'));
    head.appendChild(chip);
  }
  const foot = document.createElement('div');
  foot.className = 'i-foot';
  foot.textContent = 'sessions are kept';
  slab.append(
    head,
    options.away
      ? menuRow('up', 'put it back', 'it moves in at the next free place', options.does, {
          on: true,
        })
      : menuRow('down', 'put it away', 'its district goes back to sea', options.does, {
          on: true,
        }),
    foot
  );
  options.parent.appendChild(slab);
  place(slab, options.x, options.y);
  return slab;
}
