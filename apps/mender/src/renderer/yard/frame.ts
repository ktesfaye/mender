/**
 * The layer the yard is written on.
 *
 * Everything in this app used to be drawn into the picture: one bitmap face at
 * one size, laid out glyph by glyph in Pixi, because that is all you can
 * reasonably do inside a canvas. The yard is not that. It is four proportional
 * faces at a dozen sizes, a handwritten note on a tilted piece of parchment, a
 * serif that gets brighter and larger the more recent the thought is, and all
 * of it sitting directly on a village that is dimmed almost to nothing behind
 * it. None of that is worth drawing by hand.
 *
 * So the words come off the canvas. The village stays in Pixi, where it
 * belongs, and the writing goes on a layer over the top of it. That is the same
 * arrangement as words over a photograph, and it is both closer to what was
 * designed and a great deal less code than laying out type by hand was.
 *
 * This file owns that layer and nothing else: where it sits, how big it is, and
 * how the village behind it is dimmed while it is up. What goes on it is the
 * yard's business.
 */

import { arrangement } from './arrange';

/** The width every position in the designs is measured against. */
export const DRAWN_WIDE = 1440;
/** And the height. A window shorter than this is the normal case, not an edge. */
export const DRAWN_TALL = 1104;

/** The air around everything, on all four sides. */
export const MARGIN = 40;

/**
 * How wide the three columns are when the window is exactly as wide as the
 * designs are. Every other width is worked out from these.
 */
export const COLUMN = { asked: 360, thinking: 500, made: 380 } as const;

/** The gap between two columns, which is also where the rule between them goes. */
export const GUTTER = (DRAWN_WIDE - MARGIN * 2 - COLUMN.asked - COLUMN.thinking - COLUMN.made) / 2;

/** How narrow a side column can be dragged, and the most of the page it can take. */
const SIDE_LEAST = 220;
const SIDE_MOST = 0.42;
/** The right column's share of the page before anybody drags it: a glance down the side. */
const MADE_SHARE = 0.2;
/** And the least the middle is ever left with. */
const MIDDLE_LEAST = 380;

function clamp(value: number, least: number, most: number): number {
  return Math.min(most, Math.max(least, value));
}

export interface Layer {
  /** Where everything is written. Absolutely positioned children, in pixels. */
  readonly root: HTMLDivElement;
  /** How much room there actually is, after the margins. */
  size(): { wide: number; tall: number };
  /** Where the writing starts and stops across the window. */
  edge(): number;
  /**
   * Where each column starts and how wide it is, at the window's real size.
   * `rightEmpty` is the right column having nothing to show even with parts
   * of it still out, which gives its room to the middle the same as putting
   * them away would, and `leftEmpty` the same for the left.
   */
  columns(rightEmpty?: boolean, leftEmpty?: boolean): { asked: Span; thinking: Span; made: Span };
  /** Whether the window is short enough that some of it has to give way. */
  cramped(): boolean;
  /** Called whenever the window changed shape, after the sizes are new. */
  onResize(run: () => void): void;
  /** Take the layer down and stop listening. */
  close(): void;
}

export interface Span {
  x: number;
  wide: number;
}

/**
 * Put the writing layer over the village.
 *
 * It covers the whole window and passes every pointer through by default, so
 * the island underneath stays as reachable as it was; only the things that are
 * actually pressable take a pointer back.
 */
export function makeLayer(): Layer {
  const root = document.createElement('div');
  root.className = 'yard';
  root.style.cssText = [
    'position:fixed',
    'inset:0',
    'pointer-events:none',
    'overflow:hidden',
    'user-select:none',
    'z-index:10',
  ].join(';');
  document.body.appendChild(root);

  const listeners: (() => void)[] = [];
  const onWindowResize = (): void => {
    for (const run of listeners) run();
  };
  window.addEventListener('resize', onWindowResize);

  function size(): { wide: number; tall: number } {
    return {
      wide: Math.max(0, window.innerWidth - MARGIN * 2),
      tall: Math.max(0, window.innerHeight - MARGIN * 2),
    };
  }

  /** The left edge of the writing. */
  function edge(): number {
    return MARGIN;
  }

  function columns(
    rightEmpty = false,
    leftEmpty = false
  ): { asked: Span; thinking: Span; made: Span } {
    const { wide } = size();
    /* Every column is a share of the window, not a width, so the whole board
       breathes with it: a window pulled wider widens all three and the
       writing in each of them rewraps to fill it; a narrower one squeezes
       them together, and the type never changes size.

       The reader has their say too: a side column dragged is kept as the
       share of the page it was left at, so it keeps its proportion when the
       window changes rather than a width it was dragged to in some other
       window; and one with everything in it put away is gone, its gutter
       with it, and the middle has the room. */
    const drawn = DRAWN_WIDE - MARGIN * 2;
    const shrink = Math.min(1, wide / drawn);
    const gutter = Math.round(GUTTER * shrink);
    const left = !leftEmpty;
    const right = !rightEmpty;
    const set = arrangement();
    const most = Math.max(SIDE_LEAST, Math.round(wide * SIDE_MOST));
    let asked = left ? Math.round(wide * (set.asked ?? COLUMN.asked / drawn)) : 0;
    let made = right ? Math.round(wide * (set.made ?? MADE_SHARE)) : 0;
    asked = left ? clamp(asked, SIDE_LEAST, most) : 0;
    made = right ? clamp(made, SIDE_LEAST, most) : 0;
    const gutters = (left ? gutter : 0) + (right ? gutter : 0);
    /* The middle never goes under what a paragraph needs; the sides give
       way first, the wider of them the most. */
    const short = MIDDLE_LEAST - (wide - asked - made - gutters);
    if (short > 0) {
      const give = asked + made || 1;
      asked = Math.max(left ? SIDE_LEAST : 0, asked - Math.round((short * asked) / give));
      made = Math.max(right ? SIDE_LEAST : 0, made - Math.round((short * made) / give));
    }
    const thinking = Math.max(240, wide - asked - made - gutters);
    const x = edge();
    const middle = x + asked + (left ? gutter : 0);
    return {
      asked: { x, wide: asked },
      thinking: { x: middle, wide: thinking },
      made: { x: middle + thinking + (right ? gutter : 0), wide: made },
    };
  }

  /**
   * Whether the window is short enough that the board has to give something up.
   *
   * The designs' own answer: the gatepost collapses to its newest note and the
   * rail to bare lanterns. Not a smaller layout, a shorter one.
   */
  function cramped(): boolean {
    return window.innerHeight < 760;
  }

  return {
    root,
    size,
    edge,
    columns,
    cramped,
    onResize: (run) => listeners.push(run),
    close: () => {
      window.removeEventListener('resize', onWindowResize);
      listeners.length = 0;
      root.remove();
    },
  };
}

/**
 * How dim the village is behind whatever you are doing.
 *
 * Open on a project and it is a place at night that you can still read: dark
 * enough for the writing to carry, light enough that you can see where you are
 * standing. Open something to read and it drops further still, to silhouettes,
 * because at that point the village is not what you are looking at.
 *
 * Applied to the Pixi canvas rather than to anything inside the scene, because
 * the whole picture dims together and a filter on one container would leave the
 * rest of it bright.
 */
export type Dimness = 'island' | 'yard' | 'reading' | 'stale';

const DIM: Record<Dimness, string> = {
  island: 'none',
  yard: 'brightness(.22) saturate(.5)',
  reading: 'brightness(.12) saturate(.4)',
  stale: 'brightness(.14) saturate(.3)',
};

export function dim(canvas: HTMLCanvasElement, how: Dimness): void {
  /* Eased, not stepped. The designs asked for two hard steps, and walking into
     a place and having the whole world behind it cut to black was one of the
     things that made the app feel like it was flicking between screens. */
  canvas.style.transition = 'filter 520ms cubic-bezier(.2,.8,.2,1)';
  canvas.style.filter = DIM[how];
}
