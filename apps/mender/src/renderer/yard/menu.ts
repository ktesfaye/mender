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
import { glaze } from '../glass/glass';
import { px } from '../glass/px';
import '../glass/menu.css';
import { astop } from './walk';

export interface Menu {
  readonly root: HTMLElement;
  /** Write what is on offer, or nothing to close it. */
  write(offers: Offer[], typed?: string): void;
  /** Stand it on the line, its left edge at `x`, its foot at `bottom` above the window's. */
  place(x: number, bottom: number, room: number): void;
}

/** How far the name is in from the glass's edge, so the slash lines up with the one typed. */
export const MENU_INSET = 44;

/** A heading with the key hint a setting's list carries cut off; the keys are not the content. */
function plain(section: string): string {
  return section.replace(/,\s*shift-return.*$/i, '');
}

export function makeMenu(
  at: HTMLElement,
  press: (pick: string) => void,
  hover: (pick: string) => void
): Menu {
  const root = document.createElement('div');
  root.className = 'gmenu';
  root.style.display = 'none';
  glaze(root, { tint: 'rgba(14, 15, 18, 0.62)', blur: 22, thick: 22, bend: 60 });
  at.appendChild(root);

  const top = document.createElement('div');
  top.className = 'gm-q';
  root.appendChild(top);

  const list = document.createElement('div');
  list.className = 'menu-list gm-list';
  root.appendChild(list);

  const foot = document.createElement('div');
  foot.className = 'gm-foot';
  root.appendChild(foot);

  return {
    root,
    write(offers, typed = '') {
      list.replaceChildren();
      top.replaceChildren();
      foot.replaceChildren();
      root.style.display = offers.length ? '' : 'none';
      if (!offers.length) return;

      /* Wide enough for the longest name here and no wider, so the reasons all
         start at the same place and read as a column. */
      const longest = Math.max(...offers.map((one) => one.name.length));
      root.style.setProperty('--gm-name', `${Math.min(Math.max(longest, 8), 22) + 3}ch`);

      const counted = new Map<string, number>();
      for (const one of offers) {
        const section = one.section ?? '';
        counted.set(section, (counted.get(section) ?? 0) + 1);
      }
      const only = counted.size === 1 ? [...counted.keys()][0] : '';
      const chosen = /^slash:(\/[\w-]+):/.exec(offers[0]?.pick ?? '')?.[1];
      const models = chosen === '/model' || chosen === '/default-model';
      if (chosen && only) {
        const sign = document.createElement('span');
        sign.className = 'gm-sign';
        sign.append(px(models ? 'gem' : 'flame', '#f2c66d', 16));
        const cmd = document.createElement('span');
        cmd.className = 'gm-cmd';
        cmd.textContent = chosen;
        const what = document.createElement('span');
        what.className = 'gm-what';
        what.textContent = plain(only);
        top.append(sign, cmd, what);
      } else if (typed) {
        const cmd = document.createElement('span');
        cmd.className = 'gm-cmd typed';
        cmd.textContent = typed;
        top.appendChild(cmd);
      }
      const n = document.createElement('span');
      n.className = 'gm-n';
      n.textContent = only ? `${offers.length} of them` : `${offers.length} match`;
      top.appendChild(n);

      /* A model list is grouped the way a person reads it: the agent's own
         pick, the newest of each family, then the older ones. Only while it is
         whole; once something is typed the order is the ranking's. */
      const grouped = models && !offers.some((one) => one.hit);
      const families = new Set<string>();
      let last: string | undefined;
      let group: string | undefined;
      for (const offer of offers) {
        const section = offer.section ?? '';
        if (grouped) {
          const mine = defaultish(offer)
            ? 'its own pick'
            : families.has(familyOf(offer))
              ? 'older ones'
              : 'this family';
          families.add(familyOf(offer));
          if (mine !== group) {
            const head = document.createElement('div');
            head.className = 'gm-head';
            head.textContent = mine;
            list.appendChild(head);
            group = mine;
          }
        } else if (section !== last && section && !only) {
          const head = document.createElement('div');
          head.className = 'gm-head';
          head.textContent = plain(section);
          list.appendChild(head);
        }
        last = section;
        list.appendChild(line(offer, press, hover, models));
      }

      if (offers.some((one) => one.on)) {
        const use = document.createElement('span');
        use.className = 'gm-use';
        const dot = document.createElement('i');
        use.append(dot, 'in use');
        foot.appendChild(use);
      }
    },
    place(x, bottom, room) {
      const wide = Math.min(860, Math.max(360, window.innerWidth - 32));
      const left = Math.max(16, Math.min(x - MENU_INSET, window.innerWidth - wide - 16));
      root.style.left = `${Math.round(left)}px`;
      root.style.bottom = `${Math.round(bottom)}px`;
      root.style.width = `${wide}px`;
      list.style.maxHeight = `${Math.max(120, Math.min(420, room - 60))}px`;
    },
  };
}

/** A whole model list without the older models: the agent's own pick and the newest of each family. */
export function newestModels(offers: Offer[]): Offer[] {
  const chosen = /^slash:(\/[\w-]+):/.exec(offers[0]?.pick ?? '')?.[1];
  if (chosen !== '/model' && chosen !== '/default-model') return offers;
  if (offers.some((one) => one.hit)) return offers;
  const families = new Set<string>();
  return offers.filter((offer) => {
    if (defaultish(offer)) {
      families.add(familyOf(offer));
      return true;
    }
    const older = families.has(familyOf(offer));
    families.add(familyOf(offer));
    return !older || !!offer.on;
  });
}

function familyOf(offer: Offer): string {
  return offer.name.trim().split(/[\s-]/)[0]?.toLowerCase() ?? '';
}

function defaultish(offer: Offer): boolean {
  return offer.pick.endsWith(':default') || /^default\b/i.test(offer.name);
}

/** How dear a family is, one to four, the same scale the agent card uses. */
function cost(offer: Offer): number {
  const family = familyOf(offer);
  if (family === 'haiku') return 1;
  if (family === 'sonnet') return 2;
  if (family === 'opus') return 3;
  if (family === 'fable' || family === 'mythos') return 4;
  return 0;
}

function signFor(offer: Offer): SVGSVGElement | null {
  if (offer.dear) return px('gem', '#a780ff', 16);
  if (defaultish(offer) && offer.pick.split(':').length > 2) return px('spark', '#f2c66d', 16);
  if (offer.dear) return px('gem', '#a780ff', 16);
  if (offer.on) return px('check', '#9bd28a', 12);
  const parts = offer.pick.split(':');
  if (parts[0] === 'slash' && parts.length > 2) return null;
  if (parts[0] !== 'slash') return px('page', '#f2c66d', 16);
  if (/^\/?(model|default-model)$/.test(offer.name)) return px('gem', '#f2c66d', 16);
  if (/^\/?(mode|effort|collaboration|default-effort)$/.test(offer.name)) {
    return px('flame', '#f2c66d', 16);
  }
  return px('spark', '#f2c66d', 16);
}

function line(
  offer: Offer,
  press: (pick: string) => void,
  hover: (pick: string) => void,
  models = false
): HTMLElement {
  const row = document.createElement('div');
  row.className = offer.sore ? 'gm-row sore' : offer.dear ? 'gm-row dear' : 'gm-row';

  const mark = document.createElement('span');
  mark.className = offer.on && !offer.dear ? 'gm-ic cur' : 'gm-ic';
  const sign = signFor(offer);
  if (sign) mark.appendChild(sign);

  const name = document.createElement('span');
  name.className = 'gm-name';
  const label = document.createElement('span');
  label.className = 'gm-label';
  name.appendChild(label);
  const hit = offer.hit;
  if (hit && hit[1] > hit[0]) {
    label.classList.add('has-hit');
    label.append(offer.name.slice(0, hit[0]));
    const found = document.createElement('span');
    found.className = 'gm-hit';
    found.textContent = offer.name.slice(hit[0], hit[1]);
    label.append(found, offer.name.slice(hit[1]));
  } else {
    label.textContent =
      models && defaultish(offer)
        ? offer.name.replace(/\s*\([^)]*\)\s*$/, '').toLowerCase()
        : offer.name;
  }
  if (offer.dear) {
    const dear = document.createElement('span');
    dear.className = 'gm-dear';
    dear.textContent = 'dearest';
    name.appendChild(dear);
  }
  if (offer.starts) {
    const starts = document.createElement('span');
    starts.className = 'gm-starts';
    starts.textContent = 'default';
    name.appendChild(starts);
  }
  if (offer.takes) {
    const takes = document.createElement('span');
    takes.className = 'gm-takes';
    takes.textContent = ` ${offer.takes}`;
    label.appendChild(takes);
  }

  const about = document.createElement('span');
  about.className = 'gm-about';
  about.textContent = (offer.about ?? '').replace(/\s+/g, ' ').trim();

  row.append(mark, name, about);
  if (models && cost(offer)) {
    const bars = document.createElement('span');
    bars.className = offer.dear ? 'gm-cost dear' : 'gm-cost';
    for (let n = 1; n <= 4; n += 1)
      bars.appendChild(document.createElement('i')).className = n <= cost(offer) ? 'f' : '';
    row.appendChild(bars);
  } else if (offer.now) {
    const now = document.createElement('span');
    now.className = 'gm-now';
    now.textContent = offer.now;
    row.appendChild(now);
  }
  row.title = offer.about ?? '';
  row.addEventListener('mousedown', (event) => event.preventDefault());
  row.addEventListener('click', () => press(offer.pick));
  row.addEventListener('pointermove', () => {
    if (!row.classList.contains('picked')) hover(offer.pick);
  });
  return astop(row, offer.pick);
}
