import {
  Assets,
  Container,
  Graphics,
  Rectangle,
  TilingSprite,
  type Application,
  type FederatedPointerEvent,
  type Texture,
} from 'pixi.js';
import { ADVANCE, fitted, GLYPH, LINE, words } from './lettering';

/**
 * The board.
 *
 * One wooden board, and only ever one. Opening a district slides its land to
 * the left and brings this in from the right; everything the app has to say
 * about that district is written on it. There is no tab strip above it, no
 * second board beside it, and no panel anywhere else on the screen — when the
 * board has to show something different it is the same board, rewritten.
 *
 * The village keeps living behind it. It is not a screen: the island is still
 * there, still drawn, still moving, and the board is a thing standing in front
 * of it.
 */

/** The ink: near enough the kit's own outline colour, which is what every
    line in the village is drawn with. */
const INK = 0x3a1d0c;
/** Written and then weathered, for the things that are context, not content. */
const FADED = 0x5c3d24;
const KEEN = 0x2f4a26;
const SORE = 0x71301c;

const PAD_X = 15;
const PAD_Y = 14;
/** Sea above and below it, so it reads as a board and not as a wall. */
const AIR = 26;
/** The margin an entry's mark sits in, in characters. */
const GUTTER = 4;

export type Tone = 'ink' | 'faded' | 'keen' | 'sore';

const TONES: Record<Tone, number> = { ink: INK, faded: FADED, keen: KEEN, sore: SORE };

/** Which end of a line survives when it is too long for the board. */
type Keep = 'front' | 'tail';

export type Row =
  | { kind: 'title'; text: string }
  /** Being written now, with the cursor after it. */
  | { kind: 'typed'; text: string }
  | { kind: 'line'; text: string; tone?: Tone; keep?: Keep }
  /** A mark in the margin and the thing itself after it, columns lining up. */
  | { kind: 'entry'; mark: string; text: string; tone?: Tone; keep?: Keep }
  | { kind: 'heading'; text: string }
  | { kind: 'gap' };

export interface BoardArt {
  planks: string;
  width: number;
  height: number;
  /** Offsets, within one tile, where two planks meet. */
  seams: number[];
}

/** About how much of the window the board covers, which is what decides how
    many times over it is magnified. */
const SHARE = 0.4;
/** How long it takes to arrive. Long enough to see it come in from somewhere. */
const SLIDE_MS = 300;

export class Board {
  readonly view = new Container();

  private readonly planks: TilingSprite;
  private readonly shadow = new Graphics();
  private readonly writing = new Container();
  private readonly clip = new Graphics();
  private rows: Row[] = [];
  private readonly cursor = new Graphics();
  private scroll = 0;
  private reach = 0;

  /** How many times over the wood is magnified. Always a whole number. */
  private times = 2;
  private open = false;
  private at = 0;

  constructor(
    private readonly pixi: Application,
    private readonly art: BoardArt,
    texture: Texture
  ) {
    this.planks = new TilingSprite({ texture, width: art.width, height: art.height });
    this.writing.addChild(this.cursor);
    this.view.addChild(this.shadow, this.planks, this.writing, this.clip);
    this.writing.mask = this.clip;
    this.view.eventMode = 'static';
    this.view.visible = false;

    // The board swallows the pointer. Without this a drag that starts on the
    // wood pans the island behind it, which reads as the board being a picture
    // of a board rather than a board.
    this.view.on('pointerdown', (event: FederatedPointerEvent) => event.stopPropagation());
    /* The wheel is taken before anything else sees it. The camera does not read
       wheels through the scene graph — it puts its own listener on the canvas —
       so a wheel over the board would scroll the board AND zoom the village
       underneath it. Catching it on the way down, at the window, is the only
       place that is in front of both. */
    window.addEventListener(
      'wheel',
      (event: WheelEvent) => {
        if (!this.open || !this.over(event.clientX)) return;
        event.stopPropagation();
        event.preventDefault();
        this.scrollBy(event.deltaY / this.times);
      },
      { capture: true, passive: false }
    );

    // And the keys, for the same reason the wheel is here: reading a long
    // board should not need a pointer on it.
    window.addEventListener('keydown', (event: KeyboardEvent) => {
      if (!this.open) return;
      const page = this.planks.height - LINE * 2;
      const by =
        event.key === 'ArrowDown'
          ? LINE
          : event.key === 'ArrowUp'
            ? -LINE
            : event.key === 'PageDown'
              ? page
              : event.key === 'PageUp'
                ? -page
                : 0;
      if (!by) return;
      event.preventDefault();
      this.scrollBy(by);
    });

    this.at = window.innerWidth;
    this.lay();
    window.addEventListener('resize', () => this.lay());
    pixi.ticker.add(() => {
      this.slide();
      // The cursor blinks, which is the one thing on the board that says it is
      // waiting for you rather than telling you something.
      this.cursor.alpha = this.cursor.visible && performance.now() % 1060 < 620 ? 1 : 0;
    });
  }

  show(rows: Row[]): void {
    this.rows = rows;
    this.scroll = 0;
    this.open = true;
    this.view.visible = true;
    this.write();
  }

  /** Rewrite what is on it without moving it: the same board, a new notice. */
  update(rows: Row[]): void {
    if (!this.open) return;
    this.rows = rows;
    this.write();
  }

  hide(): void {
    this.open = false;
  }

  get showing(): boolean {
    return this.open;
  }

  /** How much of the window's width the board takes when it is in, in screen
      pixels. What is left is where the island has to fit. */
  get inset(): number {
    return (this.art.width + PAD_X) * this.times;
  }

  /** Whether a point in the window is on the board rather than on the world. */
  over(screenX: number): boolean {
    return this.open && screenX >= this.at;
  }

  private scrollBy(by: number): void {
    const was = this.scroll;
    this.scroll = Math.max(0, Math.min(this.reach, this.scroll + by));
    if (this.scroll !== was) this.writing.y = PAD_Y - Math.round(this.scroll);
  }

  /* The wood is magnified a whole number of times, never a fraction of one, the
     same rule the island is drawn under. Which number is whichever puts the
     board at about its share of the window. */
  private lay(): void {
    this.times = Math.max(2, Math.min(4, Math.round((window.innerWidth * SHARE) / this.art.width)));
    this.view.scale.set(this.times);

    const room = Math.floor(window.innerHeight / this.times) - AIR * 2;
    // It has to end where two planks meet. A board that stops halfway down a
    // plank is a board somebody sawed through.
    const tiles = Math.max(1, Math.floor(room / this.art.height));
    const over = room - tiles * this.art.height;
    const seam = [...this.art.seams].reverse().find((offset) => offset <= over) ?? 0;
    const height = tiles * this.art.height + seam;

    this.planks.height = height;
    // The board is a solid object, not a hole with planks drawn behind it: it
    // has to be hit before the island is, or the wheel zooms the village and a
    // drag across the wood pans it.
    this.view.hitArea = new Rectangle(0, 0, this.art.width, height);
    this.shadow.clear().rect(2, 3, this.art.width, height).fill({ color: 0x000000, alpha: 0.3 });
    this.clip
      .clear()
      .rect(0, PAD_Y - 3, this.art.width, height - (PAD_Y - 3) * 2)
      .fill(0xffffff);
    this.view.y = Math.round((window.innerHeight - height * this.times) / 2);
    if (!this.open) this.at = window.innerWidth;
    this.write();
  }

  private slide(): void {
    const want = this.open ? window.innerWidth - this.inset : window.innerWidth;
    if (this.at === want) return;
    this.at += (want - this.at) * (1 - Math.exp((-3 * this.pixi.ticker.deltaMS) / SLIDE_MS));
    if (Math.abs(want - this.at) < 0.5) {
      this.at = want;
      if (!this.open) this.view.visible = false;
    }
    this.view.x = Math.round(this.at);
  }

  private write(): void {
    for (const old of this.writing.removeChildren()) {
      if (old !== this.cursor) old.destroy({ children: true });
    }
    this.writing.addChild(this.cursor);
    this.cursor.visible = false;
    const room = this.art.width - PAD_X * 2;
    let y = 0;
    for (const row of this.rows) {
      switch (row.kind) {
        case 'gap':
          y += Math.round(LINE / 2);
          break;
        case 'title': {
          const written = words(fitted(row.text, room / 2), INK);
          written.scale.set(2);
          written.position.set(PAD_X, y);
          this.writing.addChild(written);
          y += LINE * 2;
          break;
        }
        case 'heading': {
          const written = words(fitted(row.text, room), FADED);
          written.position.set(PAD_X, y);
          this.writing.addChild(written);
          y += LINE;
          break;
        }
        case 'typed': {
          const shown = fitted(row.text, room - ADVANCE * 2, 'tail');
          const written = words(shown, INK);
          written.position.set(PAD_X, y);
          this.writing.addChild(written);
          this.cursor.clear().rect(PAD_X + shown.length * ADVANCE, y + 1, ADVANCE - 1, GLYPH - 2);
          this.cursor.fill(INK);
          this.cursor.visible = true;
          y += LINE;
          break;
        }
        case 'entry': {
          const mark = words(row.mark, TONES[row.tone ?? 'faded']);
          mark.position.set(PAD_X, y);
          const text = words(fitted(row.text, room - GUTTER * ADVANCE, row.keep), INK);
          text.position.set(PAD_X + GUTTER * ADVANCE, y);
          this.writing.addChild(mark, text);
          y += LINE;
          break;
        }
        default: {
          const written = words(fitted(row.text, room, row.keep), TONES[row.tone ?? 'ink']);
          written.position.set(PAD_X, y);
          this.writing.addChild(written);
          y += LINE;
        }
      }
    }
    this.reach = Math.max(0, y - (this.planks.height - PAD_Y * 2));
    this.scroll = Math.min(this.scroll, this.reach);
    this.writing.y = PAD_Y - Math.round(this.scroll);
  }
}

/** Take the board out of storage. Its timber is cut by `tools/make-board.py`. */
export async function makeBoard(pixi: Application): Promise<Board> {
  const art = (await Assets.load<BoardArt>('/board/board.json')) as BoardArt;
  const texture = await Assets.load<Texture>('/board/' + art.planks);
  texture.source.scaleMode = 'nearest';
  const board = new Board(pixi, art, texture);
  pixi.stage.addChild(board.view);
  return board;
}
