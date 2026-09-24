import {
  Assets,
  Container,
  Graphics,
  Rectangle,
  Sprite,
  TilingSprite,
  type Application,
  type FederatedPointerEvent,
  type Texture,
} from 'pixi.js';
import { BASE, fitted, LINE, stepOf, widthOf, words, type Hand } from './lettering';
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
/** Said exactly as it was written: a name, a path, a flag. Cool against the
    wood so it reads as a thing rather than a word, without shouting. */
const QUOTED = 0x2c3b47;

const PAD_X = 15;
const PAD_Y = 14;
/** Sea above and below it, so it reads as a board and not as a wall. */
const AIR = 26;
/** The margin an entry's mark sits in, in characters. */
const GUTTER = 4;

export type Tone = 'ink' | 'faded' | 'keen' | 'sore' | 'quoted';

const TONES: Record<Tone, number> = {
  ink: INK,
  faded: FADED,
  keen: KEEN,
  sore: SORE,
  quoted: QUOTED,
};

/** A stretch of writing inside a line that is written differently from the
    rest of it. A whole line is one run; anything quoted inside it is another. */
export interface Run {
  text: string;
  tone?: Tone;
}

/** Which end of a line survives when it is too long for the board. */
type Keep = 'front' | 'tail';

/** What a row does when it is pressed, if it does anything, and which hand it
    is written in when that is not the board's default. */
type Pick = { pick?: string; face?: Hand };

export type Row = (
  | { kind: 'title'; text: string }
  /** Being written now, with the cursor after it. */
  | { kind: 'typed'; text: string }
  | { kind: 'line'; text: string; tone?: Tone; keep?: Keep }
  /** A mark in the margin and the thing itself after it, columns lining up. */
  | { kind: 'entry'; mark: string; text: string; tone?: Tone; keep?: Keep }
  /**
   * Something somebody said, wrapped to the wood rather than cut off at it.
   *
   * `runs` is for writing that changes partway along — a name quoted inside a
   * sentence. `in` moves the whole thing right, which is how a list inside a
   * list is told from the list it is inside.
   */
  | { kind: 'prose'; text: string; tone?: Tone; mark?: string; runs?: Run[]; in?: number }
  | { kind: 'heading'; text: string }
  | { kind: 'gap' }
) &
  Pick;

export interface BoardArt {
  /** The sheet, tiled to fill whatever the rods leave between them. */
  paper: string;
  /** The strip of sheet turning under the top rod, and over the bottom one. */
  under: string;
  over: string;
  /** One rod, drawn once and stood at both the top and the bottom. */
  rod: string;
  /** The same timber with its plank ends cut off, for the rail to run on. */
  rail: string;
  width: number;
  /** How tall one tile of the paper is. */
  tile: number;
  /** How tall the turning strip is, under the top rod and over the bottom. */
  curl: number;
  rodHeight: number;
  /** How far a rod juts out past the paper, each side. */
  overhang: number;
}

/** About how much of the window the board covers, which is what decides how
    many times over it is magnified. The board is the thing you are reading and
    the village is what is going on behind it, so it takes the greater half. */
const SHARE = 0.6;
/** How long it takes to arrive. Long enough to see it come in from somewhere. */
const SLIDE_MS = 300;

export class Board {
  readonly view = new Container();

  /** The sheet, tiled to whatever height the rods leave for it. */
  private readonly paper: TilingSprite;
  private readonly underCurl: Sprite;
  private readonly overCurl: Sprite;
  private readonly topRod: Sprite;
  private readonly bottomRod: Sprite;
  /** How tall the whole scroll is this layout, rods and all. Set in `lay()`. */
  private bodyHeight = 0;
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
    paper: Texture,
    rod: Texture,
    under: Texture,
    over: Texture
  ) {
    this.paper = new TilingSprite({ texture: paper, width: art.width, height: art.tile });
    this.underCurl = new Sprite(under);
    this.overCurl = new Sprite(over);
    this.topRod = new Sprite(rod);
    this.bottomRod = new Sprite(rod);
    this.topRod.position.x = this.bottomRod.position.x = -art.overhang;
    this.writing.addChild(this.standing, this.cursor);
    this.view.addChild(
      this.shadow,
      this.topRod,
      this.underCurl,
      this.paper,
      this.overCurl,
      this.bottomRod,
      this.writing,
      this.clip
    );
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
    const page = this.bodyHeight - LINE * 2;
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
    const shown = this.bodyHeight - PAD_Y * 2;
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
    // The rods are always drawn whole; it is the sheet between them that has
    // to end where one of its own tiles ends, not halfway through one.
    const fixed = this.art.rodHeight * 2 + this.art.curl * 2;
    const tiles = Math.max(1, Math.floor((room - fixed) / this.art.tile));
    const sheet = tiles * this.art.tile;
    const height = fixed + sheet;

    this.bodyHeight = height;
    this.topRod.position.y = 0;
    this.underCurl.position.y = this.art.rodHeight;
    this.paper.position.y = this.art.rodHeight + this.art.curl;
    this.paper.height = sheet;
    this.overCurl.position.y = this.paper.position.y + sheet;
    this.bottomRod.position.y = this.overCurl.position.y + this.art.curl;
    // The board is a solid object, not a hole with a sheet drawn behind it: it
    // has to be hit before the island is, or the wheel zooms the village and a
    // drag across the paper pans it.
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
          const hand = row.face ?? 'hand';
          const step = stepOf(hand);
          const shown = fitted(row.text, room - step * 2, 'tail', hand);
          const written = words(shown, INK, hand);
          written.position.set(PAD_X, y);
          this.writing.addChild(written);
          this.cursor
            .clear()
            .rect(PAD_X + widthOf(shown, hand), y + 1, step - 1, BASE - 2);
          this.cursor.fill(INK);
          this.cursor.visible = true;
          y += LINE;
          break;
        }
        case 'prose': {
          const hand = row.face ?? 'hand';
          const unit = stepOf(hand);
          const step = row.in ?? 0;
          const gutter = (row.mark ? GUTTER : 0) + step;
          const tone = TONES[row.tone ?? 'ink'];
          const lines = wrapped(
            row.runs ?? [{ text: row.text, tone: row.tone }],
            room - gutter * unit,
            hand
          );
          if (row.mark) {
            const mark = words(row.mark, tone, hand);
            mark.position.set(PAD_X + step * unit, y);
            this.writing.addChild(mark);
          }
          for (const line of lines) {
            let at = PAD_X + gutter * unit;
            for (const run of line) {
              const written = words(run.text, run.tone ? TONES[run.tone] : tone, hand);
              written.position.set(at, y);
              this.writing.addChild(written);
              at += widthOf(run.text, hand);
            }
            y += LINE;
          }
          break;
        }
        case 'entry': {
          const hand = row.face ?? 'hand';
          const unit = stepOf(hand);
          const mark = words(row.mark, TONES[row.tone ?? 'faded'], hand);
          mark.position.set(PAD_X, y);
          const text = words(fitted(row.text, room - GUTTER * unit, row.keep, hand), INK, hand);
          text.position.set(PAD_X + GUTTER * unit, y);
          this.writing.addChild(mark, text);
          y += LINE;
          break;
        }
        default: {
          const hand = row.face ?? 'hand';
          const written = words(fitted(row.text, room, row.keep, hand), TONES[row.tone ?? 'ink'], hand);
          written.position.set(PAD_X, y);
          this.writing.addChild(written);
          y += LINE;
        }
      }
      if (row.pick) {
        /* Several rows that press the same thing are one place to stand: a
           block of code is one thing, and walking the keyboard through it a
           row at a time would be walking on the spot. */
        const last = this.hits[this.hits.length - 1];
        if (last && last.pick === row.pick && last.to === from) last.to = y;
        else this.hits.push({ from, to: y, pick: row.pick });
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
    this.reach = Math.max(0, y - (this.bodyHeight - PAD_Y * 2));
    this.scroll = this.follow ? this.reach : Math.min(this.scroll, this.reach);
    this.writing.y = PAD_Y - Math.round(this.scroll);
  }
}

/**
 * Prose, broken to the width of the wood.
 *
 * Words, not characters: a line cut mid-word reads as damage. A word longer
 * than the board is carried on to the next line rather than having its end cut
 * off, because the end is usually the part that says which one it is.
 *
 * It wraps over runs rather than over one string, so a name quoted in the
 * middle of a sentence keeps its own writing across a line break instead of
 * losing it at the edge of the board.
 */
function wrapped(runs: readonly Run[], room: number, hand: Hand): Run[][] {
  const lines: Run[][] = [];
  let line: Run[] = [];
  let width = 0;
  const done = (): void => {
    lines.push(line);
    line = [];
    width = 0;
  };
  const put = (text: string, tone: Tone | undefined): void => {
    const last = line[line.length - 1];
    if (last && last.tone === tone) last.text += text;
    else line.push({ text, tone });
    width += widthOf(text, hand);
  };
  // As much of `piece` as fits in what is left of the line, at least one
  // character so a word wider than the whole board still makes progress.
  const chunk = (piece: string): [string, string] => {
    const letters = [...piece];
    let taken = 0;
    let wide = 0;
    while (taken < letters.length) {
      const next = wide + widthOf(letters[taken] ?? '', hand);
      if (next > room && taken > 0) break;
      wide = next;
      taken += 1;
    }
    return [letters.slice(0, taken).join(''), letters.slice(taken).join('')];
  };

  /* Whether the writing so far ended mid-word. Runs are cut where the writing
     changes, which is not always between words: `foo`s is one word in two
     runs, and putting a space in it would be putting a space in a name. */
  let tight = false;

  for (const run of runs) {
    const paragraphs = run.text.split('\n');
    let joined = tight && !/^\s/.test(run.text);
    tight = !/\s$/.test(run.text);
    paragraphs.forEach((paragraph, at) => {
      // A break inside a run is a break on the board, and the run picks up
      // again underneath rather than starting a new one.
      if (at > 0) {
        done();
        joined = false;
      }
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        let piece = word;
        while (widthOf(piece, hand) > room) {
          if (width) done();
          const [head, rest] = chunk(piece);
          put(head, run.tone);
          done();
          piece = rest;
          joined = false;
        }
        const glue = joined && width > 0;
        joined = false;
        if (glue) {
          if (width + widthOf(piece, hand) > room) done();
          put(piece, run.tone);
        } else if (!width) put(piece, run.tone);
        else if (width + widthOf(` ${piece}`, hand) <= room) put(` ${piece}`, run.tone);
        else {
          done();
          put(piece, run.tone);
        }
      }
    });
  }
  done();
  // A trailing blank paragraph is the writer breathing, not a line.
  while (lines.length > 1 && !lines[lines.length - 1]?.length) lines.pop();
  return lines.length ? lines : [[]];
}

/** Take the board out of storage. Its timber is cut by `tools/make-scroll.py`. */
export async function makeBoard(pixi: Application): Promise<Board> {
  const art = (await Assets.load<BoardArt>('./board/board.json')) as BoardArt;
  const [paper, rod, under, over] = await Promise.all([
    Assets.load<Texture>('./board/' + art.paper),
    Assets.load<Texture>('./board/' + art.rod),
    Assets.load<Texture>('./board/' + art.under),
    Assets.load<Texture>('./board/' + art.over),
  ]);
  for (const texture of [paper, rod, under, over]) texture.source.scaleMode = 'nearest';
  const board = new Board(pixi, art, paper, rod, under, over);
  pixi.stage.addChild(board.view);
  return board;
}
