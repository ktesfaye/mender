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
import { RAIL } from './rail';

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

/** What a row does when it is pressed, if it does anything. */
type Pick = { pick?: string };

export type Row = (
  | { kind: 'title'; text: string }
  /** Being written now, with the cursor after it. */
  | { kind: 'typed'; text: string }
  | { kind: 'line'; text: string; tone?: Tone; keep?: Keep }
  /** A mark in the margin and the thing itself after it, columns lining up. */
  | { kind: 'entry'; mark: string; text: string; tone?: Tone; keep?: Keep }
  /** Something somebody said, wrapped to the wood rather than cut off at it. */
  | { kind: 'prose'; text: string; tone?: Tone; mark?: string }
  | { kind: 'heading'; text: string }
  | { kind: 'gap' }
) &
  Pick;

export interface BoardArt {
  planks: string;
  /** The same timber with its plank ends cut off, for the rail to run on. */
  rail: string;
  width: number;
  height: number;
  /** Offsets, within one tile, where two planks meet. */
  seams: number[];
}

/** About how much of the window the board covers, which is what decides how
    many times over it is magnified. The board is the thing you are reading and
    the village is what is going on behind it, so it takes the greater half. */
const SHARE = 0.6;
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
  /** The lit plank under whichever row the keyboard is standing on. */
  private readonly standing = new Graphics();
  private scroll = 0;
  private reach = 0;
  /** Where each row you can press ended up, so a press can find it again. */
  private hits: { from: number; to: number; pick: string }[] = [];
  /** Which of them the keyboard is on, remembered by what it is rather than
      by where it was: a board that rewrites under you must not move it. */
  private marked: string | null = null;
  private picked: ((pick: string) => void) | null = null;
  /** Whether the bottom of the board stays under you as it is written on. */
  private follow = false;

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
    this.writing.addChild(this.standing, this.cursor);
    this.view.addChild(this.shadow, this.planks, this.writing, this.clip);
    this.writing.mask = this.clip;
    this.view.eventMode = 'static';
    this.view.visible = false;

    // The board swallows the pointer. Without this a drag that starts on the
    // wood pans the island behind it, which reads as the board being a picture
    // of a board rather than a board.
    this.view.on('pointerdown', (event: FederatedPointerEvent) => event.stopPropagation());
    this.view.on('pointertap', (event: FederatedPointerEvent) => {
      const y = (event.global.y - this.view.y) / this.times - this.writing.y;
      const hit = this.hits.find((row) => y >= row.from && y < row.to);
      if (!hit) return;
      // A press also puts the keyboard where the hand was, so the two are
      // never standing in different places.
      this.marked = hit.pick;
      this.picked?.(hit.pick);
    });
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

  /**
   * Put something on the board.
   *
   * `at` is which end it opens on. A notice opens at the top because that is
   * where it begins; a board with something still happening on it opens at the
   * bottom, because the bottom is now.
   */
  show(rows: Row[], at: 'top' | 'now' = 'top'): void {
    this.rows = rows;
    this.open = true;
    this.follow = at === 'now';
    this.view.visible = true;
    // A new thing on the board is a new thing: the keyboard steps off whatever
    // it was standing on rather than landing somewhere arbitrary.
    this.marked = null;
    this.write();
    this.scroll = this.follow ? this.reach : 0;
    this.writing.y = PAD_Y - Math.round(this.scroll);
  }

  /** Whoever wants to know which line was pressed. */
  onPick(picked: (pick: string) => void): void {
    this.picked = picked;
  }

  /**
   * Reading a long board without a pointer on it.
   *
   * Nothing in here listens for keys itself. One place in the app decides what
   * a key means and calls this last, after everything with a better claim on it
   * has passed, so a board can never quietly answer a key something else is
   * already using.
   */
  scrolled(key: string): boolean {
    if (!this.open) return false;
    const page = this.planks.height - LINE * 2;
    const by =
      key === 'ArrowDown'
        ? LINE
        : key === 'ArrowUp'
          ? -LINE
          : key === 'PageDown'
            ? page
            : key === 'PageUp'
              ? -page
              : 0;
    if (!by) return false;
    this.scrollBy(by);
    return true;
  }

  /** Whether there is anything on this board to stand on. */
  get pickable(): boolean {
    return this.open && this.hits.length > 0;
  }

  /**
   * Walk the keyboard down the board, one pressable line at a time.
   *
   * Every board is a list of things you can press, so every board is walkable:
   * the roster, the card, the finder. Nothing on the wood is reachable by hand
   * and not by key.
   */
  walk(by: number): boolean {
    if (!this.pickable) return false;
    const was = this.hits.findIndex((hit) => hit.pick === this.marked);
    const many = this.hits.length;
    // Stepping onto a board you were not standing on starts at whichever end
    // you came in from, rather than jumping to the middle.
    const next = was < 0 ? (by > 0 ? 0 : many - 1) : (was + by + many) % many;
    this.marked = this.hits[next]?.pick ?? null;
    this.look();
    this.write();
    return true;
  }

  /** What the keyboard is standing on, if anything. */
  chosen(): string | null {
    return this.pickable ? this.marked : null;
  }

  /** Stand on something by name, or on nothing. */
  stand(pick: string | null): void {
    this.marked = pick;
    this.look();
    this.write();
  }

  /* Keep whatever is marked on the wood you can actually see. */
  private look(): void {
    const hit = this.hits.find((row) => row.pick === this.marked);
    if (!hit) return;
    const shown = this.planks.height - PAD_Y * 2;
    if (hit.from < this.scroll) this.scrollBy(hit.from - this.scroll);
    else if (hit.to > this.scroll + shown) this.scrollBy(hit.to - shown - this.scroll);
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
    // Reading back through what happened lets go of the live edge; coming back
    // down to the bottom takes hold of it again.
    this.follow = this.scroll >= this.reach - 1;
    if (this.scroll !== was) this.writing.y = PAD_Y - Math.round(this.scroll);
  }

  /* The wood is magnified a whole number of times, never a fraction of one, the
     same rule the island is drawn under. Which number is whichever puts the
     board at about its share of the window. */
  private lay(): void {
    this.times = Math.max(2, Math.min(4, Math.round((window.innerWidth * SHARE) / this.art.width)));
    this.view.scale.set(this.times);

    // The rail is nailed along the bottom, and the board stands on the floor
    // it leaves rather than behind it.
    const room = Math.floor(window.innerHeight / this.times) - RAIL - AIR * 2;
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
    this.view.y = Math.round((window.innerHeight - (height + RAIL) * this.times) / 2);
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
      if (old !== this.cursor && old !== this.standing) old.destroy({ children: true });
    }
    this.writing.addChild(this.standing, this.cursor);
    this.cursor.visible = false;
    this.standing.clear();
    const room = this.art.width - PAD_X * 2;
    this.hits = [];
    let y = 0;
    for (const row of this.rows) {
      const from = y;
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
        case 'prose': {
          const gutter = row.mark ? GUTTER : 0;
          const lines = wrapped(row.text, Math.floor(room / ADVANCE) - gutter);
          if (row.mark) {
            const mark = words(row.mark, TONES[row.tone ?? 'ink']);
            mark.position.set(PAD_X, y);
            this.writing.addChild(mark);
          }
          for (const line of lines) {
            const written = words(line, TONES[row.tone ?? 'ink']);
            written.position.set(PAD_X + gutter * ADVANCE, y);
            this.writing.addChild(written);
            y += LINE;
          }
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
      if (row.pick) {
        this.hits.push({ from, to: y, pick: row.pick });
        /* Standing on a line is a plank catching the light, not a box drawn
           round it: the wood is the thing, and a rectangle on top of it reads
           as a widget that wandered in from another app. */
        if (row.pick === this.marked) {
          this.standing
            .rect(PAD_X - 5, from - 1, this.art.width - (PAD_X - 5) * 2, y - from)
            .fill({ color: 0xffffff, alpha: 0.16 });
        }
      }
    }
    // Something that is no longer on the board is not somewhere to stand.
    if (this.marked && !this.hits.some((hit) => hit.pick === this.marked)) this.marked = null;
    this.reach = Math.max(0, y - (this.planks.height - PAD_Y * 2));
    this.scroll = this.follow ? this.reach : Math.min(this.scroll, this.reach);
    this.writing.y = PAD_Y - Math.round(this.scroll);
  }
}

/**
 * Prose, broken to the width of the wood.
 *
 * Words, not characters: a line cut mid-word reads as damage. A word longer
 * than the board is cut, because the alternative is a word that runs off it.
 */
function wrapped(text: string, columns: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      let piece = word;
      /* Something with no spaces in it that is wider than the board — a path,
         a url — is carried on to the next line rather than having its end cut
         off, because the end is usually the part that says which one it is. */
      while (piece.length > columns) {
        if (line) {
          lines.push(line);
          line = '';
        }
        lines.push(piece.slice(0, columns));
        piece = piece.slice(columns);
      }
      if (!line) line = piece;
      else if (line.length + 1 + piece.length <= columns) line += ` ${piece}`;
      else {
        lines.push(line);
        line = piece;
      }
    }
    lines.push(line);
  }
  // A trailing blank paragraph is the writer breathing, not a line.
  while (lines.length > 1 && !lines[lines.length - 1]) lines.pop();
  return lines.length ? lines : [''];
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
