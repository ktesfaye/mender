/**
 * Reading something, without leaving the yard.
 *
 * Opening a file, a change, a commit, a folder, a shell or a pull request does
 * not navigate anywhere. The world drops to silhouettes, a flat brown wash
 * comes down over the middle and right of the screen, and what you asked for is
 * written on it. The gatepost stays exactly where it was, and so does the rail,
 * so you can still see what you asked for and which session everybody else is
 * in while you read.
 *
 * That is the whole difference between this and a panel: a panel replaces the
 * screen and this one is laid over it, in the same place, with two thirds of
 * the screen still saying what it said a moment ago.
 *
 * The way home is written across the top, one gold step per level, and Escape
 * walks the same steps one at a time.
 */

import type { Row } from '../board/row';
import { trail as trailOf } from './press';
import { makeRows, type Written } from './rows';
import { box, exact, rule } from './write';

export interface Reading {
  /** The way home, outermost first, ending in where you are. */
  trail: { said: string; go?: () => void }[];
  /** The one line on the right that says what this thing is. */
  meta?: string;
  rows: Row[];
  /** What the line at the bottom asks for while this is open. */
  asks?: string;
}

export interface Scrim {
  /** Put something on it, or take it down. */
  show(reading: Reading | null): void;
  readonly up: boolean;
  /** Where the writing is, for whatever wants to walk or scroll it. */
  readonly sheet: Written;
  place(left: number, right: number, top: number, bottom: number): void;
  /** An arrow or a page key, when nothing else claimed it. */
  scrolled(key: string): boolean;
  close(): void;
}

export function makeScrim(at: HTMLElement, press: (pick: string) => void): Scrim {
  const root = box({}, WASH);
  root.dataset.sheet = 'yes';
  root.style.display = 'none';
  at.appendChild(root);

  const head = box({ left: 32, right: 32, top: 20 }, HEAD);
  root.appendChild(head);
  const way = box({}, 'position:relative');
  const meta = box({}, 'position:relative');
  head.append(way, meta);
  root.appendChild(rule({ left: 32, right: 32, top: 48, height: 2 }));

  /* The writing scrolls and the chrome above it does not, which is why they
     are two boxes rather than one. */
  const under = box({ left: 32, right: 32, top: 72, bottom: 24 }, 'overflow-y:auto');
  root.appendChild(under);
  const sheet = makeRows(under, press);

  let showing = false;

  return {
    get up() {
      return showing;
    },
    sheet,
    place: (left, right, top, bottom) => {
      root.style.left = `${left}px`;
      root.style.right = `${right}px`;
      root.style.top = `${top}px`;
      root.style.bottom = `${bottom}px`;
    },
    show: (reading) => {
      const was = showing;
      showing = Boolean(reading);
      root.style.display = reading ? '' : 'none';
      if (!reading) return;
      /* It steps in from the top the first time it comes up, and after that a
         change of what is on it is a cut: only the trail moves, because you
         asked for the next thing and watching it wipe in again is a tax. */
      if (!was) {
        root.style.animation = 'yard-arrive 160ms steps(4,end)';
        window.setTimeout(() => (root.style.animation = ''), 200);
      }
      way.replaceChildren(trailOf(reading.trail));
      meta.replaceChildren(reading.meta ? exact(reading.meta, 12, '#a89272') : '');
      sheet.write(reading.rows);
      under.scrollTop = 0;
    },
    scrolled: (key) => {
      if (!showing) return false;
      const page = under.clientHeight - 40;
      const by =
        key === 'ArrowDown'
          ? 60
          : key === 'ArrowUp'
            ? -60
            : key === 'PageDown'
              ? page
              : key === 'PageUp'
                ? -page
                : key === 'Home'
                  ? -under.scrollHeight
                  : key === 'End'
                    ? under.scrollHeight
                    : 0;
      if (!by) return false;
      under.scrollTop += by;
      return true;
    },
    close: () => root.remove(),
  };
}

const WASH = [
  'position:absolute',
  /* Flat, not blurred. Nothing in this art is blurred, and a frosted panel
     over a pixel village reads as a screenshot of a different program. */
  'background:rgba(72,37,16,.72)',
  'pointer-events:auto',
  'overflow:hidden',
].join(';');

const HEAD = [
  'display:flex',
  'align-items:baseline',
  'justify-content:space-between',
  'gap:16px',
  'white-space:nowrap',
].join(';');
