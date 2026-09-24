/**
 * The projects, on a shelf.
 *
 * The plank along the bottom used to carry one tag per project. The designs
 * give that plank to the sessions of whatever project you are in, so the
 * projects needed somewhere else, and a rack of tools on the wall is what they
 * got: one slot each, a prop from the kit standing in it, no names.
 *
 * It sits over everything, the island and the yard alike, so it is the one
 * thing in this app that is always within reach. Hovering a slot says which
 * project it is; pressing one goes there; the one you are in is the filled
 * slot. It folds away and comes back.
 *
 * This is the only place in the village where a pressable thing is a box
 * rather than a line of gold writing, and that is deliberate: it is an
 * inventory rack out of a game, not a piece of the board. Everything else on
 * the wood follows the rule.
 */

import { cutOf, KIT_NAMES, sprite } from './sprite';
import { box } from './write';

/**
 * What a project can be, in order.
 *
 * Handed out rather than chosen, so founding a project never stops to ask you
 * what it looks like. The order is fixed and the shelf runs through it, so a
 * project keeps the same tool for as long as it exists.
 */
const TOOLS = [
  KIT_NAMES.anvil,
  KIT_NAMES.sign,
  KIT_NAMES.barrel,
  KIT_NAMES.sack,
  KIT_NAMES.bucket,
  KIT_NAMES.crate,
  KIT_NAMES.pot,
  KIT_NAMES.rack,
  KIT_NAMES.roadSign,
  KIT_NAMES.table,
  KIT_NAMES.lanternOn,
  KIT_NAMES.cart,
] as const;

const SLOT = 44;
const PAD = 6;

export interface OnShelf {
  id: string;
  name: string;
  /** Which tool stands for it, by where it came in the island's own order. */
  at: number;
  here: boolean;
}

export interface Shelf {
  show(projects: OnShelf[]): void;
  /** Fold it away, or bring it back. */
  fold(away?: boolean): void;
  close(): void;
}

export function makeShelf(at: HTMLElement, open: (id: string) => void): Shelf {
  const root = box({ right: 0, top: 0 }, RACK);
  at.appendChild(root);

  let away = false;
  let last: OnShelf[] = [];

  function show(projects: OnShelf[]): void {
    last = projects;
    root.replaceChildren();

    /* The label is also the handle. Pressing it folds the rack away, which is
       the only thing on this shelf that is not a project. */
    /* The label doubles as where a name appears when you are over a slot, so
       nothing has to be drawn under the rack and nothing collides with the
       two facts the header keeps in that corner. */
    const label = document.createElement('div');
    label.style.cssText = LABEL;
    const resting = away ? `projects · ${projects.length}` : 'projects';
    label.textContent = resting;
    label.dataset.shelf = 'fold';
    label.addEventListener('click', () => fold(!away));
    root.appendChild(label);

    if (away) return;

    for (const project of projects) {
      const slot = document.createElement('div');
      slot.style.cssText = project.here ? SLOT_HERE : SLOT_EMPTY;
      slot.dataset.project = project.id;
      slot.title = project.name;
      slot.addEventListener('pointerenter', () => {
        label.textContent = project.name;
        label.style.color = '#f4e3c0';
      });
      slot.addEventListener('pointerleave', () => {
        label.textContent = resting;
        label.style.color = '#c4b186';
      });
      slot.addEventListener('click', () => open(project.id));

      const tool = TOOLS[project.at % TOOLS.length] ?? TOOLS[0];
      const cut = cutOf(tool);
      /* Whole multiples only, and the biggest one that still fits the slot, so
         a small prop is not lost in the middle of it. */
      const times = cut
        ? (Math.max(1, Math.min(3, Math.floor((SLOT - 10) / Math.max(cut.w, cut.h)))) as 1 | 2 | 3)
        : 1;
      const prop = sprite(tool, times);
      prop.style.position = 'relative';
      prop.style.margin = 'auto';
      slot.appendChild(prop);
      root.appendChild(slot);
    }
  }

  function fold(shut = true): void {
    away = shut;
    show(last);
  }

  return {
    show,
    fold,
    close: () => root.remove(),
  };
}

const RACK = [
  'display:flex',
  'align-items:center',
  `gap:${PAD}px`,
  `padding:${PAD}px ${PAD * 2}px`,
  'background:#54391e',
  'border:2px solid #482510',
  'border-top:none',
  'border-right:none',
  'box-shadow:0 4px 0 rgba(72,37,16,.55)',
  'pointer-events:auto',
].join(';');

const LABEL = [
  "font-family:'Josefin Sans',sans-serif",
  'font-size:11px',
  'letter-spacing:.24em',
  'text-transform:uppercase',
  'color:#c4b186',
  'text-shadow:1px 1px 0 #120d07',
  'white-space:nowrap',
  `padding-right:${PAD}px`,
  'cursor:default',
].join(';');

const SLOT_EMPTY = [
  `width:${SLOT}px`,
  `height:${SLOT}px`,
  'display:flex',
  'background:#a48961',
  'border:2px solid #482510',
  'box-sizing:border-box',
  'cursor:default',
].join(';');

/* The project you are in is the filled slot, in the same thatch gold the
   keyboard's own mark uses, because they mean the same thing: you are here. */
const SLOT_HERE = SLOT_EMPTY.replace('background:#a48961', 'background:#e0b56a');
