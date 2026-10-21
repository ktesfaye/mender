import './f.css';
import type { Row } from '../board/row';
import { astop } from '../yard/walk';
import { px } from './px';

/**
 * The small pieces the /agent card, the checkout board and the boards that
 * grow out of it are built from: an element with a class, and the few things
 * that are pressable among them.
 */

type Kid = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls = '',
  ...kids: Kid[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  for (const kid of kids) if (kid) el.append(kid);
  return el;
}

/** A sign from the village's own pixel kit. */
export function sign(name: string, color: string, size = 14): SVGSVGElement {
  return px(name, color, size);
}

/** Pressing this is pressing the line that carries `pick`, and the keyboard can stand on it. */
export function pressable<T extends HTMLElement>(el: T, pick: string, walk = true): T {
  el.dataset.pick = pick;
  el.classList.add('f-press');
  el.addEventListener('mousedown', (event) => event.preventDefault());
  if (walk) astop(el, pick);
  return el;
}

export function dom(el: HTMLElement): Row {
  return { kind: 'dom', el };
}

export function chip(text: string, dot?: string, cls = ''): HTMLElement {
  const el = h('span', `g-chip ${cls}`.trim());
  if (dot) {
    const d = h('span', 'g-dot');
    d.style.background = dot;
    el.append(d);
  }
  el.append(text);
  return el;
}

/** A small label in pixel capitals, with an optional quiet note at the far end. */
export function label(text: string, note?: string): HTMLElement {
  return h('div', 'f-label', h('span', 'g-pix', text), note ? h('em', '', note) : null);
}

/** A tile: a sign in a dark chip, a gold name, and what it would do. */
export function tile(
  icon: string,
  name: string,
  about: string,
  opts: { hot?: boolean; sore?: boolean; off?: boolean; pick?: string; wide?: boolean } = {}
): HTMLElement {
  const color = opts.sore ? '#f08a72' : '#f2c66d';
  const el = h(
    'div',
    `f-tile${opts.hot ? ' f-hot' : ''}${opts.sore ? ' f-sore' : ''}${opts.off ? ' f-off' : ''}${opts.wide ? ' f-wide' : ''}`,
    h('div', 'f-ic', sign(icon, color, 16)),
    h('div', 'f-tx', h('b', '', name), h('span', '', about))
  );
  if (opts.pick && !opts.off) pressable(el, opts.pick);
  return el;
}

/** A file's git letters as a small badge. */
export function badge(mark: string): HTMLElement {
  const m = mark.trim()[0] ?? '?';
  const kind = m === 'A' || m === '?' ? 'new' : m === 'D' || m === 'U' ? 'bad' : 'mod';
  const letter = m === '?' ? 'N' : m === 'A' ? 'N' : m;
  return h('span', `f-badge f-${kind}`, letter);
}
