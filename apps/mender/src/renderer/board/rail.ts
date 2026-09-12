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
import type { BoardArt } from './board';
import { ADVANCE, fitted, GLYPH, LINE, words } from './lettering';

/**
 * The rail.
 *
 * A plank nailed along the bottom of the window with everything you are
 * running pinned to it: a peg for each project on the left, and after them the
 * sessions of whichever district you are standing in, each under the name it
 * has given itself. It is the one place in the app that shows you work you are
 * not currently looking at.
 *
 * It is not the board and it never becomes the board. The board is the thing
 * you read; the rail is how you get to another one, and it carries a line of
 * text and a mark per session and nothing else.
 */

/** How tall the plank is, in board pixels. It ends where two planks meet. */
export const RAIL = 28;

const INK = 0x3a1d0c;
const FADED = 0x5c3d24;
const KEEN = 0x2f4a26;
const SORE = 0x71301c;

/** The gap either side of a tag's writing. */
const PAD = 6;
/** As much of a session's name as a tag carries. */
const NAME = 20;

/** What one thing pinned to the rail is. */
export interface Tag {
  /** Anything, as long as the same thing means the same tag between draws. */
  readonly id: string;
  readonly text: string;
  /** The mark before it: what that session is doing, or nothing. */
  readonly mark?: string;
  readonly tone?: 'ink' | 'faded' | 'keen' | 'sore';
  /** Drawn as the one you are inside. */
  readonly here?: boolean;
}

const TONES = { ink: INK, faded: FADED, keen: KEEN, sore: SORE };

export class Rail {
  readonly view = new Container();

  private readonly planks: TilingSprite;
  private readonly writing = new Container();
  private readonly under = new Graphics();
  private times = 2;
  /** Where each tag ended up, so a click can be turned back into one. */
  private hits: { from: number; to: number; id: string }[] = [];
  private tags: Tag[] = [];
  private picked: ((id: string) => void) | null = null;

  constructor(
    private readonly art: BoardArt,
    texture: Texture
  ) {
    this.planks = new TilingSprite({ texture, width: art.width, height: RAIL });
    this.view.addChild(this.planks, this.under, this.writing);
    this.view.eventMode = 'static';

    // The rail is a solid thing standing in front of the sea, like the board:
    // a drag that starts on it must not pan the island behind it.
    this.view.on('pointerdown', (event: FederatedPointerEvent) => event.stopPropagation());
    this.view.on('pointertap', (event: FederatedPointerEvent) => {
      const x = (event.global.x - this.view.x) / this.times;
      const hit = this.hits.find((tag) => x >= tag.from && x < tag.to);
      if (hit) this.picked?.(hit.id);
    });

    this.lay();
    window.addEventListener('resize', () => this.lay());
  }

  /** Told what is running. The same list twice is the same rail twice. */
  show(tags: Tag[]): void {
    this.tags = tags;
    this.write();
  }

  /** Whoever wants to know which tag was pressed. */
  onPick(picked: (id: string) => void): void {
    this.picked = picked;
  }

  /** How much of the bottom of the window the rail has taken, in screen pixels. */
  get height(): number {
    return RAIL * this.times;
  }

  /** Whether a point in the window is on the rail rather than on the world. */
  over(screenY: number): boolean {
    return screenY >= this.view.y;
  }

  /* Magnified by the same whole number as the board, so the two are the same
     wood seen at the same distance rather than two pieces of scenery. */
  private lay(): void {
    this.times = Math.max(2, Math.min(4, Math.round((window.innerWidth * 0.6) / this.art.width)));
    this.view.scale.set(this.times);
    this.planks.width = Math.ceil(window.innerWidth / this.times);
    this.view.x = 0;
    this.view.y = window.innerHeight - RAIL * this.times;
    this.view.hitArea = new Rectangle(0, 0, this.planks.width, RAIL);
    this.write();
  }

  private write(): void {
    for (const old of this.writing.removeChildren()) old.destroy({ children: true });
    this.under.clear();
    this.hits = [];

    const baseline = Math.round((RAIL - LINE) / 2) + Math.round((LINE - GLYPH) / 2);
    let x = PAD;
    for (const tag of this.tags) {
      const mark = tag.mark ? `${tag.mark} ` : '';
      const text = mark + fitted(tag.text, NAME * ADVANCE);
      const width = text.length * ADVANCE + PAD * 2;
      if (x + width > this.planks.width) break;

      const written = words(text, TONES[tag.tone ?? (tag.here ? 'ink' : 'faded')]);
      written.position.set(x + PAD, baseline);
      this.writing.addChild(written);
      // The one you are inside is underlined in its own wood rather than
      // boxed: there is no panel anywhere in this app and a tag is not one.
      if (tag.here) {
        this.under.rect(x + PAD, RAIL - 4, width - PAD * 2, 1).fill({ color: INK, alpha: 0.55 });
      }
      this.hits.push({ from: x, to: x + width, id: tag.id });
      x += width;
    }
  }
}

/** Nail the rail up. Its timber is the board's, cut by `tools/make-board.py`. */
export async function makeRail(pixi: Application): Promise<Rail> {
  const art = (await Assets.load<BoardArt>('/board/board.json')) as BoardArt;
  const texture = await Assets.load<Texture>('/board/' + art.rail);
  texture.source.scaleMode = 'nearest';
  const rail = new Rail(art, texture);
  pixi.stage.addChild(rail.view);
  return rail;
}
