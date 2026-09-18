import { BitmapFont, BitmapText, Cache, type BitmapFont as Face } from 'pixi.js';

/**
 * Writing on the board, in two hands.
 *
 * The kit has no letters in it — the two signs that carry any are decorative
 * shapes, not an alphabet — so both of these come from outside it, and both
 * are drawn on a pixel grid so they take the same magnification as the wood.
 *
 * **The hand is Notepen** (jeti, CC BY 4.0; the credit and the licence travel
 * with it in `assets/font/`): a pixel recreation of somebody's handwriting on
 * a sixteen-pixel body. The board is a page now rather than a plank, and the
 * things written on it are things people and agents SAY. A monospaced terminal
 * face said them in the voice of a log file.
 *
 * **The type is Departure Mono** (Helena Zhang, SIL OFL), which the whole
 * board used to be set in and which is still exactly right for the half of it
 * that is not writing: a diff, a table, a block of code, a terminal's own
 * output. Those mean what they mean because their columns line up, and a
 * proportional face takes that away. So the rule the board follows is: the
 * hand is the default, and the type is for anything whose sense depends on
 * character N of one line sitting above character N of the next.
 *
 * Both are baked into one texture each at their design size and never rendered
 * at any other. Everything on the board is scaled by a whole number together,
 * so no glyph is ever resampled.
 */

/** The size each face is drawn at. Not a preference; other sizes blur. */
const SIZE = { hand: 16, type: 11 } as const;

export type Hand = keyof typeof SIZE;

const FAMILY = { hand: 'Notepen', type: 'Departure Mono' } as const;
const FILE = {
  hand: 'Notepen-Regular.woff2',
  type: 'DepartureMono-Regular.woff2',
} as const;

/**
 * One line of writing, and where its baseline sits in it.
 *
 * The rhythm is the hand's, because the hand is what most of the board is
 * written in; the type sits on the same baseline rather than on its own, which
 * is the only way a quoted path inside a sentence does not bob about.
 */
export const LINE = 17;
/** Where the baseline sits inside a line, counted from its top. */
export const BASE = 13;

/* Baked white so one texture serves every colour on the board: a tint is a
   multiply, and multiplying white is exactly the colour asked for. */
const CHARS: (string | string[])[] = [[' ', '~'], '·•…←↑→↓✓✗■●─│'];

/** How wide every character is, per hand. Monospaced for one of them and not
    for the other, so it is a table either way rather than arithmetic. */
const WIDE: Record<Hand, Map<string, number>> = { hand: new Map(), type: new Map() };
/** The same question asked of the face itself, for a character nobody asked
    the font to bake in. */
const RULER: Record<Hand, CanvasRenderingContext2D | null> = { hand: null, type: null };
/** How much of a board pixel one of the font's own units is, per hand. */
const SCALE: Record<Hand, number> = { hand: 1, type: 1 };
/** How far down from the top of a line each hand has to be put so the two of
    them sit on one baseline. Read off the faces, not guessed. */
const DROP: Record<Hand, number> = { hand: 0, type: 0 };

let ready: Promise<void> | undefined;

export function loadLettering(): Promise<void> {
  ready ??= (async () => {
    await Promise.all((Object.keys(SIZE) as Hand[]).map(install));
  })();
  return ready;
}

async function install(hand: Hand): Promise<void> {
  /* Beside the page, not at the root of a filesystem: packaged, the page is a
     file:// document and a leading slash means the disk's own root. */
  const where = new URL(`./font/${FILE[hand]}`, document.baseURI).href;
  const face = new FontFace(FAMILY[hand], `url(${where})`);
  await face.load();
  document.fonts.add(face);
  BitmapFont.install({
    name: hand,
    style: { fontFamily: FAMILY[hand], fontSize: SIZE[hand], fill: '#ffffff' },
    chars: CHARS,
    resolution: 1,
    padding: 1,
    // The one setting that matters: the glyph sheet is magnified with the rest
    // of the board, and a filtered letter next to nearest-filtered wood reads
    // as text pasted over a game rather than written on it.
    textureStyle: { scaleMode: 'nearest' },
  });

  /* What Pixi will actually do with each glyph, taken from the font it just
     built rather than measured a second way. Two readers of one question is
     how every drift in this codebase started, and a width table that disagrees
     with the renderer by a pixel a character looks like sloppy kerning.

     It measures every face at a hundred pixels whatever size you asked for and
     scales at draw time, so everything it hands back is in hundredths of a
     face rather than in board pixels. Taken as pixels, the hand's `n` is
     thirty-seven of them and every line wrapped at a third of the page.

     And a font it built itself has a `baseLineOffset` of zero, whatever the
     face is: the whole climb from the top of a line to the baseline is inside
     each glyph's own offset. Reading the baseline off that field put every
     line thirteen pixels low and the title twenty-six, which on a page with a
     big top margin looks like a design decision rather than a fault. What
     actually says where the baseline is, for a face and a size, is the
     metrics. */
  const built = Cache.get<Face>(`${hand}-bitmap`);
  const scale = SIZE[hand] / built.baseMeasurementFontSize;
  SCALE[hand] = scale;
  for (const [letter, char] of Object.entries(built.chars)) {
    WIDE[hand].set(letter, char.xAdvance * scale);
  }
  /* The same ruler Pixi measures with, at the same size it measures at, so a
     character it bakes later comes out the width this said it would. */
  const ruler = document.createElement('canvas').getContext('2d');
  if (ruler) {
    ruler.font = `${built.baseMeasurementFontSize}px "${FAMILY[hand]}"`;
    RULER[hand] = ruler;
  }
  // Whole pixels: a face put down on a half pixel is a face drawn twice, once
  // faintly, which is exactly what this board magnifies.
  DROP[hand] = Math.round(BASE - built.fontMetrics.ascent * scale);
}

/**
 * How wide a string is, in board pixels.
 *
 * A character nobody baked in is measured off the face and remembered.
 * Everything on this board that is not a letter — the block somebody draws a
 * bar out of, a box-drawing rule, an emoji in a commit subject — is a
 * character the font was never asked for, and Pixi adds those to the sheet the
 * moment it is told to draw them. So a width table that only knows what was
 * baked says a solid bar is as wide as a space, and the bar runs off the page.
 */
export function widthOf(text: string, hand: Hand = 'hand'): number {
  const table = WIDE[hand];
  let wide = 0;
  for (const letter of text) {
    let one = table.get(letter);
    if (one === undefined) {
      one = (RULER[hand]?.measureText(letter).width ?? SIZE[hand]) * SCALE[hand];
      table.set(letter, one);
    }
    wide += one;
  }
  return wide;
}

/** How wide one character is: the cursor, and anything laid out in columns. */
export function stepOf(hand: Hand = 'type'): number {
  return WIDE[hand].get('M') ?? SIZE[hand] / 2;
}

/** Where in a line this hand has to be put so both sit on one baseline. */
export function dropOf(hand: Hand): number {
  return DROP[hand];
}

/**
 * As much of `text` as fits in `room` board pixels.
 *
 * Which end goes depends on what the text is. A sentence is read from the
 * front, so the front is what is kept; a path is told apart from its
 * neighbours by its last few segments, and a column of them all beginning
 * `apps/mender/src/` says nothing at all, so a path keeps its tail.
 */
export function fitted(
  text: string,
  room: number,
  keep: 'front' | 'tail' = 'front',
  hand: Hand = 'hand'
): string {
  /* A line is one line. Anything with a break in it — a heredoc somebody ran, a
     commit subject with a body stuck to it — would otherwise draw as several
     lines in the space of one and overlap whatever is under it, which is the
     kind of thing that only shows up on the real thing at full size. */
  text = text.includes('\n') ? text.replaceAll(/\s*\n\s*/g, ' ') : text;
  if (widthOf(text, hand) <= room) return text;

  const dots = widthOf('…', hand);
  const letters = [...text];
  if (keep === 'tail') {
    let wide = dots;
    let at = letters.length;
    while (at > 0) {
      const next = wide + widthOf(letters[at - 1] ?? '', hand);
      if (next > room) break;
      wide = next;
      at -= 1;
    }
    return `…${letters.slice(at).join('')}`;
  }
  let wide = dots;
  let at = 0;
  while (at < letters.length) {
    const next = wide + widthOf(letters[at] ?? '', hand);
    if (next > room) break;
    wide = next;
    at += 1;
  }
  return `${letters.slice(0, at).join('')}…`;
}

export function words(text: string, tint: number, hand: Hand = 'hand'): BitmapText {
  const written = new BitmapText({
    text,
    style: { fontFamily: hand, fontSize: SIZE[hand] },
  });
  written.tint = tint;
  return written;
}
