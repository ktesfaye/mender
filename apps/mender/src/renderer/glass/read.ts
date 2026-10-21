/**
 * The pieces a read board is built from: the head, a card, a chip, a pressable
 * thing. Every board that is drawn rather than written (a change, a commit, a
 * file, a folder, a helper) is made of these, and hands the scrim a `dom` row.
 */

import './read.css';
import type { Row } from '../board/row';
import { astop } from '../yard/walk';
import { px } from './px';

/* The yard's own modules touch the window the moment they load, which the
   plain logic tests that reach this file through a board never have. They are
   always loaded long before anything is pressed. */
type Stand = (yes: () => void, at?: Element) => () => void;
type Prose = (into: HTMLElement, id: string, text: string, fresh: boolean) => void;
let stand: Stand = () => () => undefined;
let prose: Prose = () => undefined;
if (typeof window !== 'undefined') {
  void import('../yard/standing').then((m) => (stand = m.stand));
  void import('../yard/prose').then((m) => (prose = m.prose));
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls = '',
  text?: string
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
}

export const dom = (el: HTMLElement): Row => {
  el.classList.add('gr');
  return { kind: 'dom', el };
};

/** A nine-by-nine sign, in a box that keeps its place beside words. */
export function sign(name: string, color = 'currentColor', size = 16): HTMLElement {
  const el = h('i', 'gr-sign');
  el.appendChild(px(name, color, size));
  return el;
}

export interface Pressing {
  /** A first press already made: Return is the second. */
  armed?: boolean;
  /** Not a stop for the keyboard's walk. */
  loose?: boolean;
  /** A real file the pointer can carry out to the Finder. */
  drag?: string;
}

/** Make an element press as the row with this pick would. */
export function pressable<T extends HTMLElement>(el: T, pick: string, how: Pressing = {}): T {
  el.dataset.pick = pick;
  el.classList.add('gr-p');
  el.addEventListener('mousedown', (event) => event.preventDefault());
  if (!how.loose) astop(el, pick);
  if (how.armed) stand(() => el.click(), el);
  if (how.drag) {
    const path = how.drag;
    el.draggable = true;
    el.addEventListener('dragstart', (event) => {
      event.preventDefault();
      window.mender.startDrag(path);
    });
  }
  return el;
}

export function chip(text: string, dot?: string, cls = ''): HTMLElement {
  const el = h('span', `g-chip ${cls}`.trim());
  if (dot) {
    const d = h('span', 'g-dot');
    d.style.background = dot;
    el.appendChild(d);
  }
  el.appendChild(document.createTextNode(text));
  return el;
}

export function card(cls = ''): HTMLElement {
  return h('div', `g-card ${cls}`.trim());
}

/** A small caps label over a card. */
export function label(text: string, cls = ''): HTMLElement {
  return h('div', `g-pix gr-label ${cls}`.trim(), text);
}

/** A pill-shaped ghost button with a sign in front. */
export function ghost(text: string, icon?: string, color?: string): HTMLElement {
  const el = h('span', 'g-ghost');
  if (icon) el.appendChild(sign(icon, color ?? 'var(--g-gold)', 15));
  el.appendChild(document.createTextNode(text));
  return el;
}

/** The title block every read board opens with. */
export function head(opts: {
  title: string;
  sub?: (HTMLElement | string)[];
  right?: HTMLElement[];
  lead?: HTMLElement;
}): HTMLElement {
  const top = h('div', 'gr-head');
  const left = h('div', 'gr-head-l');
  if (opts.lead) top.appendChild(opts.lead);
  left.appendChild(h('div', 'g-serif gr-h1', opts.title));
  if (opts.sub?.length) {
    const sub = h('div', 'gr-sub');
    for (const part of opts.sub) {
      sub.appendChild(typeof part === 'string' ? h('span', 'g-mono g-faint gr-path', part) : part);
    }
    left.appendChild(sub);
  }
  top.appendChild(left);
  if (opts.right?.length) top.appendChild(h('div', 'gr-state')).append(...opts.right);
  return top;
}

/** The folder part of a path, with its slash, or nothing at the top. */
export function dirOf(path: string): string {
  const cut = path.lastIndexOf('/');
  return cut === -1 ? '' : path.slice(0, cut + 1);
}

export function nameOf(path: string): string {
  const cut = path.lastIndexOf('/');
  return cut === -1 ? path : path.slice(cut + 1);
}

/** A danger strip: what would be lost, and the one button that does it. */
export function danger(opts: {
  icon: string;
  title: string;
  said: string;
  button: string;
  pick: string;
  armed?: boolean;
  quiet?: string;
}): HTMLElement {
  const el = h('div', 'gr-danger');
  el.appendChild(sign(opts.icon, 'var(--g-sore)', 18));
  const t = h('div', 'gr-danger-t');
  t.append(h('b', '', opts.title), document.createTextNode(` · ${opts.said}`));
  el.appendChild(t);
  const b = h('span', 'g-ghost gr-sore', opts.button);
  pressable(b, opts.pick, { armed: opts.armed });
  el.appendChild(b);
  return el;
}

/** The cursor a line being written carries. */
export const cursor = (): HTMLElement => h('i', 'gr-cursor');

const WORDS = new Set(
  (
    'export const let var function return import from if else await async type interface class new ' +
    'for while of in default throw try catch switch case break continue extends implements public private ' +
    'static readonly as typeof void null true false def fn pub use mod struct enum impl'
  ).split(' ')
);
const TOKEN =
  /(\/\/.*$|#.*$)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)|(\b\d[\d_.]*\b)|([A-Za-z_]\w*)/g;

/** A line of code, with its keywords, strings, numbers and comments tinted. */
export function code(text: string): DocumentFragment {
  const out = document.createDocumentFragment();
  let at = 0;
  const plain = (to: number): void => {
    if (to > at) out.appendChild(document.createTextNode(text.slice(at, to)));
  };
  for (const hit of text.matchAll(TOKEN)) {
    const from = hit.index ?? 0;
    let cls = '';
    if (hit[1] !== undefined) cls = 'cm';
    else if (hit[2] !== undefined) cls = 'st';
    else if (hit[3] !== undefined) cls = 'nu';
    else if (hit[4] !== undefined && WORDS.has(hit[4])) cls = 'k';
    if (!cls) continue;
    plain(from);
    out.appendChild(h('span', `gr-t-${cls}`, hit[0]));
    at = from + hit[0].length;
  }
  plain(text.length);
  return out;
}

/** A ratio as five small cells: what went in, what came out, what is left. */
export function meter(added: number, taken: number): HTMLElement {
  const bar = h('span', 'gr-bar');
  const all = added + taken;
  const a = all ? Math.round((added / all) * 5) : 0;
  const d = all ? Math.max(taken ? 1 : 0, 5 - a) : 0;
  for (let i = 0; i < 5; i++) bar.appendChild(h('i', i < a ? 'a' : i < a + d ? 'd' : ''));
  return bar;
}

/** `+3 −1`, in their two tones. */
export function counts(added: number, taken: number): HTMLElement {
  const el = h('span', 'ct');
  if (added) el.appendChild(h('span', 'gr-add', `+${added}`));
  if (added && taken) el.appendChild(document.createTextNode(' '));
  if (taken) el.appendChild(h('span', 'gr-del', `−${taken}`));
  return el;
}

let written = 0;

/** Writing set the way an agent's own words are: headings, lists, tables, code, a drawn diagram. */
export function writing(text: string, cls = ''): HTMLElement {
  const box = h('div', `gr-prose ${cls}`.trim());
  prose(box, `gr-${written++}`, text, false);
  return box;
}
