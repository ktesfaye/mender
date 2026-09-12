import {
  boundsOf,
  campfireOf,
  CAMP,
  CELL,
  standingGround,
  type District,
  type Layout,
} from '@mender/village';
import { Container, Graphics, type Ticker } from 'pixi.js';

/**
 * What the pointer is over, and showing it.
 *
 * Pointing at a district is not hitting a sprite. A tree on the crop farm's
 * edge is the farm, the ground under it is the farm, and the gap between two of
 * its buildings is still the farm — so the hit test is against the land, cell by
 * cell, and it is a map lookup rather than a walk down a scene graph.
 *
 * The camp is the exception, and deliberately. It owns a stretch of ground like
 * any plot, but what you point at there is the FIRE: founding a project is what
 * the camp is for, and a plot-shaped wash across the middle of an empty island
 * tells you nothing about what clicking it would do.
 */

/** Where a district sits in the world, in the pixels the renderer places in. */
export interface DistrictBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  /** The middle of it on screen, which is where the camera looks. */
  centerX: number;
  centerY: number;
}

/** How far from the fire still counts as the fire. */
const FIRE_REACH = CELL * 2.2;
const FIRE_GLOW = CELL * 3.4;

export class Ground {
  /** The light on the land. Belongs under the things standing on it. */
  readonly overlay = new Container();

  private readonly owner = new Map<string, District>();
  private readonly standing: ReadonlySet<string>;
  private readonly highlight = new Graphics();
  private readonly firelight = new Graphics();
  private readonly fire: { x: number; y: number } | null;
  private readonly camp: District | null;
  private over: District | null = null;
  private warmth = 0;

  constructor(districts: readonly District[], layout: Layout) {
    for (const district of districts) {
      if (district.id === CAMP) continue;
      for (const [y, x0, x1] of district.cells) {
        for (let x = x0; x <= x1; x++) this.owner.set(`${x},${y}`, district);
      }
    }
    this.camp = districts.find((district) => district.id === CAMP) ?? null;
    this.fire = campfireOf(layout);
    this.standing = standingGround(layout);
    this.overlay.addChild(this.firelight, this.highlight);
    this.overlay.eventMode = 'none';
    this.drawFirelight();
  }

  /** The district under a point in world coordinates, or null for open sea. */
  at(worldX: number, worldY: number): District | null {
    if (this.fire && this.camp) {
      const reach = Math.hypot(worldX - this.fire.x, worldY - this.fire.y);
      if (reach <= FIRE_REACH) return this.camp;
    }
    // Screen y runs down and the world's runs up, so the world point handed in
    // by the viewport is already negated; put it back before asking the grid.
    const cx = Math.floor(worldX / CELL);
    const cy = Math.floor(-worldY / CELL);
    return this.owner.get(`${cx},${cy}`) ?? null;
  }

  get hovered(): District | null {
    return this.over;
  }

  /**
   * Light on whatever is under the pointer.
   *
   * A warm wash, not an outline and not a tint: an outline is a selection box
   * from a different kind of app, and tinting would mean touching every sprite
   * standing on the ground. This is one shape underneath them, and it reads as
   * the sun coming out on that part of the island. Over the fire it is the
   * fire's own light, which is there anyway and simply reaches further when you
   * are about to use it.
   */
  hover(district: District | null): void {
    if (district === this.over) return;
    this.over = district;
    this.highlight.clear();
    if (!district || district.id === CAMP) return;
    // The footprint includes the stone ring that holds it up, and light laid
    // over a cliff face is a bright square hanging in the sea. Only the ground
    // you could walk on takes it.
    for (const [y, x0, x1] of district.cells) {
      for (let x = x0; x <= x1; x++) {
        if (!this.standing.has(`${x},${y}`)) continue;
        this.highlight.rect(x * CELL, -(y + 1) * CELL, CELL, CELL);
      }
    }
    this.highlight.fill({ color: 0xffe9b0, alpha: 0.16 });
  }

  /**
   * The fire breathes.
   *
   * Slow, and barely there: an island with one thing alive on it should not be
   * a still picture, and this is the only thing on an empty one. It is also how
   * you can tell the app is running before anything else has happened.
   */
  tick(ticker: Ticker): void {
    const lit = this.over?.id === CAMP ? 1 : 0;
    const breath = 0.5 + 0.5 * Math.sin(performance.now() / 900);
    const want = 0.13 + breath * 0.04 + lit * 0.2;
    // Ease toward it so hovering in and out is a change of light, not a switch.
    this.warmth += (want - this.warmth) * Math.min(1, ticker.deltaTime * 0.12);
    this.firelight.alpha = this.warmth;
  }

  private drawFirelight(): void {
    if (!this.fire) return;
    /* Soft by stacking, not by blurring. A blur is the one thing the kit forbids
       everywhere else, and a handful of circles reads as a handful of circles,
       so the falloff is built out of enough of them that the banding lands below
       what you notice: each ring adds a little and the alpha compounds inward. */
    const RINGS = 18;
    for (let i = 0; i < RINGS; i++) {
      const radius = FIRE_GLOW * (1 - i / RINGS);
      this.firelight.circle(this.fire.x, this.fire.y, radius).fill({
        color: 0xffb763,
        alpha: 0.1,
      });
    }
    this.firelight.alpha = 0.1;
  }
}

export function districtBounds(district: District): DistrictBounds {
  const box = boundsOf(district);
  return {
    x: box.x,
    y: -(box.y + box.height),
    width: box.width,
    height: box.height,
    centerX: box.x + box.width / 2,
    centerY: -(box.y + box.height / 2),
  };
}
