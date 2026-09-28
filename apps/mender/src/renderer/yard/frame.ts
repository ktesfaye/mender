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

import { arrangement, hidden } from './arrange';

/** The width every position in the designs is measured against. */
export const DRAWN_WIDE = 1440;
/** And the height. A window shorter than this is the normal case, not an edge. */
export const DRAWN_TALL = 1104;

/** The air around everything, on all four sides. */
export const MARGIN = 40;

/**
 * The widest the writing ever gets, however wide the window is.
 *
 * Past this the columns stop growing and the page centres instead, because a
 * line of a serif nine hundred pixels long is not reading, it is scanning, and
 * the point of the middle column is that you read it. What the surplus buys is
 * more village either side, which is not a consolation prize in this app.
 */
export const WIDEST = 1560;

/**
 * How wide the three columns are when the window is exactly as wide as the
 * designs are. Every other width is worked out from these.
 */
export const COLUMN = { asked: 360, thinking: 500, made: 380 } as const;

/** The gap between two columns, which is also where the rule between them goes. */
export const GUTTER = (DRAWN_WIDE - MARGIN * 2 - COLUMN.asked - COLUMN.thinking - COLUMN.made) / 2;

/** How narrow and how wide a side column can be dragged. */
const SIDE_LEAST = 220;
const SIDE_MOST = 640;
/** And the least the middle is ever left with. */
const MIDDLE_LEAST = 380;

function clamp(value: number, least: number, most: number): number {
  return Math.min(most, Math.max(least, value));
}

export interface Layer {
  /** Where everything is written. Absolutely positioned children, in pixels. */
  readonly root: HTMLDivElement;
  /** How much room there actually is, after the margins and the widest measure. */
  size(): { wide: number; tall: number };
  /** Where the writing starts and stops across the window. */
  edge(): number;
  /** Where each column starts and how wide it is, at the window's real size. */
  columns(): { asked: Span; thinking: Span; made: Span };
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
      wide: Math.max(0, Math.min(window.innerWidth - MARGIN * 2, WIDEST)),
      tall: Math.max(0, window.innerHeight - MARGIN * 2),
    };
  }

  /** The left edge of the writing, which is the margin until the page centres. */
  function edge(): number {
    return Math.max(MARGIN, Math.round((window.innerWidth - WIDEST) / 2));
  }

  function columns(): { asked: Span; thinking: Span; made: Span } {
    const { wide } = size();
    /* The three columns keep their proportions rather than their widths. A
       window wider than the designs gives the surplus to the middle, because
       the middle is the one you are reading and the other two are a glance
       each; a narrower one squeezes all three together, which gets tight but
       never pushes a column off the edge, and the type never changes size.

       Unless the reader has had their say: a side column dragged wider or
       narrower keeps the width it was left at, and one with everything in it
       put away is gone, its gutter with it, and the middle has the room. */
    const drawn = DRAWN_WIDE - MARGIN * 2;
    const shrink = Math.min(1, wide / drawn);
    const gutter = Math.round(GUTTER * shrink);
    const left = !(hidden('asked') && hidden('changelog'));
    const right = !(hidden('now') && hidden('did'));
    const set = arrangement();
    let asked = left ? Math.round(set.asked ?? COLUMN.asked * shrink) : 0;
    let made = right ? Math.round(set.made ?? COLUMN.made * shrink) : 0;
    asked = left ? clamp(asked, SIDE_LEAST, SIDE_MOST) : 0;
    made = right ? clamp(made, SIDE_LEAST, SIDE_MOST) : 0;
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
