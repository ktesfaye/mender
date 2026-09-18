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
import { widthOf, words } from './lettering';

/**
 * The rail.
 *
 * A plank nailed along the bottom of the window with one carved peg for every
 * project, and nothing else on it. It is how you get from the village you are
 * standing in to another one without going back out to sea.
 *
 * No session names live here. A session belongs to a project and you get at it
 * through the project's own board, where there is room to say what it is called
 * and what it is doing. The rail is the shortest thing in the app on purpose.
 */

/** How tall the plank is, in board pixels. It ends where two planks meet. */
export const RAIL = 28;

const INK = 0x3a1d0c;
const FADED = 0x5c3d24;
const KEEN = 0x2f4a26;
const SORE = 0x71301c;

/** One carved peg: a square of darker wood with a letter cut into it. */
const PEG = 20;
/** The gap between pegs, and the gap at the end of the rail. */
const GAP = 5;
/** How tall a carved letter stands, for centring it in its peg. */
const CARVE = 11;

/** What one project on the rail is. */
export interface Peg {
  readonly id: string;
  /** What is carved on it. One or two characters, no more. */
  readonly mark: string;
  /** What it is, for whoever cannot read a single letter. */
  readonly name: string;
  readonly tone?: 'ink' | 'faded' | 'keen' | 'sore';
  /** Drawn as the one you are standing in. */
  readonly here?: boolean;
}

const TONES = { ink: INK, faded: FADED, keen: KEEN, sore: SORE };

export class Rail {
  readonly view = new Container();

  private readonly planks: TilingSprite;
  private readonly carving = new Container();
  private readonly cut = new Graphics();
  private times = 2;
  /** Where each peg ended up, so a press can be turned back into one. */
  private hits: { from: number; to: number; id: string }[] = [];
  private pegs: Peg[] = [];
  private picked: ((id: string) => void) | null = null;

  constructor(
    private readonly art: BoardArt,
    texture: Texture
  ) {
    this.planks = new TilingSprite({ texture, width: art.width, height: RAIL });
    this.view.addChild(this.planks, this.cut, this.carving);
    this.view.eventMode = 'static';

    // The rail is a solid thing standing in front of the sea, like the board:
    // a drag that starts on it must not pan the island behind it.
    this.view.on('pointerdown', (event: FederatedPointerEvent) => event.stopPropagation());
    this.view.on('pointertap', (event: FederatedPointerEvent) => {
      const x = (event.global.x - this.view.x) / this.times;
      const hit = this.hits.find((peg) => x >= peg.from && x < peg.to);
      if (hit) this.picked?.(hit.id);
    });

    this.lay();
    window.addEventListener('resize', () => this.lay());
  }

  /** Told what there is. The same list twice is the same rail twice. */
  show(pegs: Peg[]): void {
    this.pegs = pegs;
    this.write();
  }

  /** Whoever wants to know which peg was pressed. */
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
    for (const old of this.carving.removeChildren()) old.destroy({ children: true });
    this.cut.clear();
    this.hits = [];

    const top = Math.round((RAIL - PEG) / 2);
    let x = GAP;
    for (const peg of this.pegs) {
      if (x + PEG + GAP > this.planks.width) break;
      /* A peg is a tag nailed to the plank, not a hole in it: a lighter
         square of the same wood with a nail in each top corner, and the one
         you are standing in lifted brighter with a shadow under it. */
      this.cut
        .rect(x, top, PEG, PEG)
        .fill({ color: 0xffffff, alpha: peg.here ? 0.2 : 0.08 })
        .rect(x, top, PEG, PEG)
        .stroke({ color: INK, width: 1, alpha: peg.here ? 0.6 : 0.3, alignment: 0 });
      if (peg.here) {
        this.cut.rect(x + 1, top + PEG, PEG, 1).fill({ color: 0x000000, alpha: 0.25 });
      }
      for (const nail of [x + 3, x + PEG - 4]) {
        this.cut.rect(nail, top + 3, 1, 1).fill({ color: INK, alpha: 0.5 });
      }

      /* Carved into the plank, so it is the type rather than the hand: the
         rail is timber and a peg is a tag somebody cut a letter into, not a
         note somebody wrote. */
      const mark = peg.mark.slice(0, 2);
      const carved = words(mark, TONES[peg.tone ?? (peg.here ? 'ink' : 'faded')], 'type');
      carved.position.set(
        x + Math.round((PEG - widthOf(mark, 'type')) / 2),
        top + Math.round((PEG - CARVE) / 2) - 1
      );
      this.carving.addChild(carved);

      this.hits.push({ from: x - GAP / 2, to: x + PEG + GAP / 2, id: peg.id });
      x += PEG + GAP;
    }
  }
}

/** Nail the rail up. Its timber is cut by `tools/make-scroll.py`. */
export async function makeRail(pixi: Application): Promise<Rail> {
  const art = (await Assets.load<BoardArt>('./board/board.json')) as BoardArt;
  const texture = await Assets.load<Texture>('./board/' + art.rail);
  texture.source.scaleMode = 'nearest';
  const rail = new Rail(art, texture);
  pixi.stage.addChild(rail.view);
  return rail;
}
