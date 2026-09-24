/**
 * Putting words on the layer.
 *
 * Small on purpose. Every piece of the yard is an absolutely positioned box
 * with a face, a size and a colour, and writing that out longhand a hundred
 * times is how a file becomes unreadable. These are the four or five shapes
 * that actually recur.
 */

import { KIT_NAMES, sprite } from './sprite';

export interface Place {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  width?: number;
  height?: number;
}

/** A box on the layer, placed. Nothing about what is in it. */
export function box(where: Place, style = ''): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = `position:absolute;${placed(where)};${style}`;
  return el;
}

function placed(where: Place): string {
  const parts: string[] = [];
  for (const side of ['left', 'right', 'top', 'bottom', 'width', 'height'] as const) {
    const at = where[side];
    if (at !== undefined) parts.push(`${side}:${at}px`);
  }
  return parts.join(';');
}

/**
 * A label: the small capitals that name a part of the board.
 *
 * Stone, never gold. Gold is what you can press and the labels are not
 * pressable, and the designs' own rules sheet is explicit that gold means one
 * thing only. The oldest turn of the session screen still draws them gold; the
 * rules came later and they win.
 */
export function label(text: string, where: Place): HTMLDivElement {
  const el = box(where, LABEL);
  el.textContent = text;
  return el;
}

const LABEL = [
  "font-family:'Josefin Sans',sans-serif",
  'font-size:11px',
  'letter-spacing:.24em',
  'text-transform:uppercase',
  'color:#a89272',
  'text-shadow:1px 1px 0 #120d07',
  'white-space:nowrap',
].join(';');

/** The smaller capitals that say when something happened, or who said it. */
export function said(text: string, tone = '#9c8a68'): HTMLSpanElement {
  const el = document.createElement('span');
  el.style.cssText = [
    "font-family:'Josefin Sans',sans-serif",
    'font-size:10px',
    'letter-spacing:.18em',
    'text-transform:uppercase',
    `color:${tone}`,
  ].join(';');
  el.textContent = text;
  return el;
}

/** A name, a status, a path, a command: anything quoted exactly. */
export function exact(text: string, size = 12, tone = '#bfa476'): HTMLSpanElement {
  const el = document.createElement('span');
  el.style.cssText = [
    "font-family:'Courier Prime',monospace",
    `font-size:${size}px`,
    `color:${tone}`,
    'text-shadow:1px 1px 0 #120d07',
    'white-space:nowrap',
  ].join(';');
  el.textContent = text;
  return el;
}

/** One of the hairlines that separates a column, or a part of one. */
export function rule(where: Place, strong = false): HTMLDivElement {
  return box(
    { height: 1, ...where },
    `background:rgba(244,227,192,${strong ? '.18' : '.14'})`
  );
}

/** A column of things with an even gap down it. */
export function stack(where: Place, gap: number): HTMLDivElement {
  return box(where, `display:flex;flex-direction:column;gap:${gap}px`);
}

/** A row of things, on one line, that never wraps. */
export function row(gap: number): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = `display:flex;align-items:center;gap:${gap}px;white-space:nowrap`;
  return el;
}

/**
 * Take things off the top of a stack until what is left fits.
 *
 * Everything on this board is a list with a live end: the newest note, the
 * latest thought, the step running right now. When there is not room for all of
 * it, what goes is the beginning, and the board says how much went rather than
 * quietly dropping it. Measured rather than guessed, because a row with a crate
 * in it is twice the height of a row with a signpost, and guessing at that is
 * how two columns end up written over each other.
 *
 * `keep` is anything at the head of the stack that is not a candidate: the
 * count line itself, which has to stay to be able to say the count.
 */
export function trim(stack: HTMLElement, room: number, keep = 0): number {
  if (stack.scrollHeight <= room) return 0;
  let dropped = 0;
  while (stack.scrollHeight > room && stack.children.length > keep + 1) {
    stack.children[keep]?.remove();
    dropped++;
  }
  return dropped;
}

/** A pool of firelight. Never a flat wash: light in this village is radial. */
export function firelight(where: Place, strength: number, round = true): HTMLDivElement {
  const shape = round ? 'circle at 50% 50%' : 'ellipse at 50% 50%';
  return box(
    where,
    `background:radial-gradient(${shape},rgba(255,168,60,${strength}),rgba(0,0,0,0) 62%);pointer-events:none`
  );
}

/** One of ours, standing somewhere, at a whole multiple of its own size. */
export function folk(facing: 'front' | 'back', where: Place, style = ''): HTMLDivElement {
  const el = sprite(facing === 'front' ? KIT_NAMES.facingYou : KIT_NAMES.facingAway, 2);
  el.style.cssText += `;${placed(where)};${style}`;
  return el;
}
