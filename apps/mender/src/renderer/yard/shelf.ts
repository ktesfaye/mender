/**
 * The projects, on a shelf.
 *
 * The plank along the bottom used to carry one tag per project. The designs
 * give that plank to the sessions of whatever project you are in, so the
 * projects needed somewhere else, and a rack of tools on the wall is what they
 * got: one slot each, its own picture or a prop from the kit standing in it,
 * no names.
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

import { slot, toolFor } from './face';
import { box } from './write';

const PAD = 6;

export interface OnShelf {
  id: string;
  name: string;
  /** Which tool stands for it, by where it came in the island's own order. */
  at: number;
  /** Its own picture, which outranks the tool whenever it has one. */
  icon?: string;
  here: boolean;
  /** Whether somebody in this project is asking or hurt, worst first. */
  wants?: 'asking' | 'hurt';
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
    /* Folded shut, the rack is only this label, so it carries the same
       question the open slots would answer: does anywhere else want him.
       Worst first, the same way a house's own light would read it. */
    if (away) {
      const worst = projects.some((project) => project.wants === 'hurt')
        ? 'hurt'
        : projects.some((project) => project.wants === 'asking')
          ? 'asking'
          : undefined;
      label.style.transition = 'color 520ms cubic-bezier(.2,.8,.2,1),text-shadow 520ms';
      if (worst) {
        label.style.color = worst === 'hurt' ? '#ff7a52' : '#ffc46a';
        label.style.textShadow = `0 0 10px ${worst === 'hurt' ? '#ff7a52aa' : '#ffc46aaa'}`;
      }
    }
    root.appendChild(label);

    if (away) return;

    for (const project of projects) {
      const one = slot(
        {
          tool: toolFor(project.at),
          ...(project.icon ? { icon: project.icon } : {}),
          ...(project.wants ? { wants: project.wants } : {}),
        },
        project.here
      );
      one.dataset.project = project.id;
      one.title = project.name;
      one.addEventListener('pointerenter', () => {
        label.textContent = project.name;
        label.style.color = '#f4e3c0';
      });
      one.addEventListener('pointerleave', () => {
        label.textContent = resting;
        label.style.color = '#c4b186';
      });
      one.addEventListener('click', () => open(project.id));
      root.appendChild(one);
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
