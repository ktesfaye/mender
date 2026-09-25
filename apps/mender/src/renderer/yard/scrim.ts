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
  /**
   * A real terminal, mounted under the rows rather than written as one of
   * them — a shell or an agent's own CLI, drawing its own screen. Kept in
   * the DOM across a rewrite of the same reading, so a live grid is never
   * torn down and rebuilt out from under whatever is running in it.
   */
  terminal?: HTMLElement;
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

  const head = box({}, HEAD);
  head.style.position = 'relative';
  head.style.padding = '20px 32px 0';
  root.appendChild(head);
  const way = box({}, 'position:relative');
  const meta = box({}, 'position:relative');
  head.append(way, meta);
  const across = rule({ left: 32, right: 32, height: 2 });
  across.style.position = 'relative';
  across.style.margin = '12px 0 0';
  root.appendChild(across);

  /* The writing scrolls and the chrome above it does not, which is why they
     are two boxes rather than one. */
  const under = box(
    {},
    'display:flex;flex-direction:column;overflow-y:auto;position:relative;padding:20px 32px 24px;min-height:0'
  );
  root.appendChild(under);
  const sheet = makeRows(under, press);
  /* A real terminal wants the whole room this board has, not the height of
     its own writing — so it is a flex item that fills what is left under the
     title, rather than another line the wash sizes itself around. */
  const termHost = box({}, 'display:none;flex:1;min-height:240px;width:100%;margin-top:8px');
  under.appendChild(termHost);

  /* Held so a terminal reading can give the wash a real height to shrink its
     writing against — without this the wash sizes itself to its own content
     as usual, `under`'s flex-shrink has nothing definite to shrink from, and
     a 600-line grid collapses the whole board to a sliver. Everything else
     keeps hugging its own content exactly as before. */
  let room = '';
  let inTerminal = false;

  let showing = false;

  return {
    get up() {
      return showing;
    },
    sheet,
    /* The wash is as tall as what is written on it and no taller.
       A question with four lines in it does not get two thirds of the window
       of flat brown under it: that reads as a panel that failed to load, and
       it was the first thing anybody said about this screen. Anything long
       enough fills the room it is given and scrolls inside it. */
    place: (left, right, top, bottom) => {
      root.style.left = `${left}px`;
      root.style.right = `${right}px`;
      root.style.top = `${top}px`;
      root.style.bottom = 'auto';
      room = `${Math.max(120, window.innerHeight - top - bottom)}px`;
      root.style.maxHeight = room;
      if (inTerminal) root.style.height = room;
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
        root.animate(
          [
            { opacity: 0, transform: 'translateY(10px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
          { duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)' }
        );
      } else {
        /* A change of what is on it settles in rather than cutting, so going
           from a folder into a file reads as going somewhere. */
        under.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
      }
      way.replaceChildren(trailOf(reading.trail));
      meta.replaceChildren(reading.meta ? exact(reading.meta, 12, '#a89272') : '');
      sheet.write(reading.rows);
      inTerminal = Boolean(reading.terminal);
      root.style.height = inTerminal ? room : '';
      if (reading.terminal) {
        termHost.style.display = '';
        /* Mounted once and left alone after that — replacing it would tear
           down a live grid every time this board's title rewrites. */
        if (termHost.firstElementChild !== reading.terminal) {
          termHost.replaceChildren(reading.terminal);
        }
      } else {
        termHost.style.display = 'none';
        termHost.replaceChildren();
      }
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
  'display:flex',
  'flex-direction:column',
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
