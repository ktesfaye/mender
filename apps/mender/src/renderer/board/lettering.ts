import { BitmapFont, BitmapText } from 'pixi.js';

/**
 * Writing on the board.
 *
 * The kit has no letters in it — the two signs that carry any are decorative
 * shapes, not an alphabet — and the board's whole job is to carry branch names,
 * file paths and commit subjects, which have to be read rather than recognised.
 * So the writing is Departure Mono (Helena Zhang, SIL OFL; the licence travels
 * with it in `assets/font/`): a monospaced pixel face drawn on an 11-pixel body,
 * which is the same kind of drawing as the kit and lines up with it.
 *
 * It is baked into one texture at its design size and never rendered at any
 * other. Everything on the board is scaled by a whole number together, so the
 * letters take the same magnification as the wood and no glyph is ever resampled.
 */

/** The size the face is drawn at. It is not a preference; other sizes blur. */
export const GLYPH = 11;
/** One line of writing: the face's own ascent and descent, and the rhythm
    everything on the board is spaced on. */
export const LINE = 14;

const FAMILY = 'Departure Mono';
const FONT = 'board';

/* Baked white so one texture serves every colour on the board: a tint is a
   multiply, and multiplying white is exactly the colour asked for. */
const CHARS: (string | string[])[] = [[' ', '~'], '·•…←↑→↓✓✗■●─│'];

let ready: Promise<void> | undefined;

export function loadLettering(): Promise<void> {
  ready ??= (async () => {
    const face = new FontFace(FAMILY, `url(/font/DepartureMono-Regular.woff2)`);
    await face.load();
    document.fonts.add(face);
    BitmapFont.install({
      name: FONT,
      style: { fontFamily: FAMILY, fontSize: GLYPH, fill: '#ffffff' },
      chars: CHARS,
      resolution: 1,
      padding: 1,
      // The one setting that matters: the glyph sheet is magnified with the
      // rest of the board, and a filtered letter next to nearest-filtered wood
      // reads as text pasted over a game rather than written on it.
      textureStyle: { scaleMode: 'nearest' },
    });
  })();
  return ready;
}

/** How wide a string is, in board pixels. Monospaced, so it is arithmetic. */
export const ADVANCE = 7;

export function widthOf(text: string): number {
  return text.length * ADVANCE;
}

/**
 * As much of `text` as fits in `room` board pixels.
 *
 * Which end goes depends on what the text is. A sentence is read from the
 * front, so the front is what is kept; a path is told apart from its
 * neighbours by its last few segments, and a column of them all beginning
 * `apps/mender/src/` says nothing at all, so a path keeps its tail.
 */
export function fitted(text: string, room: number, keep: 'front' | 'tail' = 'front'): string {
  /* A line is one line. Anything with a break in it — a heredoc somebody ran, a
     commit subject with a body stuck to it — would otherwise draw as several
     lines in the space of one and overlap whatever is under it, which is the
     kind of thing that only shows up on the real thing at full size. */
  text = text.includes('\n') ? text.replaceAll(/\s*\n\s*/g, ' ') : text;
  const chars = Math.floor(room / ADVANCE);
  if (text.length <= chars) return text;
  if (chars <= 1) return text.slice(0, Math.max(0, chars));
  return keep === 'tail' ? `…${text.slice(-(chars - 1))}` : `${text.slice(0, chars - 1)}…`;
}

export function words(text: string, tint: number): BitmapText {
  const written = new BitmapText({ text, style: { fontFamily: FONT, fontSize: GLYPH } });
  written.tint = tint;
  return written;
}
