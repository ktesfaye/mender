import {
  boundsOf,
  campfireOf,
  CAMP,
  CELL,
  groundCells,
  type District,
  type Layout,
} from '@mender/village';
import { Container, Graphics, type Ticker } from 'pixi.js';
import type { Building } from './scene';

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
 *
 * Buildings are the other exception, and for the opposite reason. A building IS
 * a thing rather than a stretch of land, it is where a task stands, and it sits
 * on top of the ground it belongs to — so it is hit first and hit as a shape.
 */

/**
 * What the pointer is on, which is a district and only ever a district.
 *
 * Houses used to be aimed at in their own right and they are not things you
 * point at: a district was then one place with a handful of smaller places cut
 * out of it, and the grass between two houses answered differently from the
 * roofs either side of it. One district, all of it.
 */
export type Aim = { kind: 'district'; district: District };

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

/* Soft by stacking, not by blurring: a blur is the one thing the kit forbids
   everywhere else, and a handful of circles reads as a handful of circles, so
   the falloff is built out of enough of them that the banding lands below what
   you would notice. */
const RINGS = 18;

/** How far from the fire still counts as the fire. */
const FIRE_REACH = CELL * 2.2;
const FIRE_GLOW = CELL * 3.4;

/** How many cells in from a district's edge its light takes to come up full. */
const GLOW_DEPTH = 6;
/** The light in the middle of a pointed-at district. */
const GLOW_ALPHA = 0.22;
/** How much of it is left at the edge, so the border with the next one shows. */
const GLOW_RIM = 0.35;
const NEIGHBOURS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

export class Ground {
  /** The light on the land. Belongs under the things standing on it. */
  readonly overlay = new Container();

  private readonly owner = new Map<string, District>();
  private readonly highlight = new Graphics({ blendMode: 'add' });
  /** Light out of the buildings somebody is working in. Drawn into by the folk. */
  readonly windows = new Graphics({ blendMode: 'add' });
  /* The island's own outline, as a hole light is allowed through. Light that
     falls past the coast is a haze sitting on the water, and the sea is the one
     surface in the picture nothing is standing on.

     Two of them, because a mask belongs to exactly one thing: handing the same
     Graphics to both lit layers leaves whichever asked second unmasked, or
     unmasked and invisible, depending on which way Pixi resolves it. */
  private readonly onlyLand = new Graphics();
  private readonly alsoLand = new Graphics();
  private readonly firelight = new Graphics();
  private readonly fire: { x: number; y: number } | null;
  private readonly camp: District | null;
  /** The buildings of each district, in the order the map reads. */
  private readonly standing = new Map<string, Building[]>();
  private over: Aim | null = null;
  private warmth = 0;

  constructor(districts: readonly District[], layout: Layout, buildings: readonly Building[]) {
    for (const district of districts) {
      if (district.id === CAMP) continue;
      for (const [x, y0, y1] of district.cells) {
        for (let y = y0; y <= y1; y++) this.owner.set(`${x},${y}`, district);
      }
    }
    this.camp = districts.find((district) => district.id === CAMP) ?? null;
    this.fire = campfireOf(layout);
    for (const building of buildings) {
      if (!building.district || building.district === CAMP) continue;
      const held = this.standing.get(building.district);
      if (held) held.push(building);
      else this.standing.set(building.district, [building]);
    }
    for (const key of groundCells(layout)) {
      const [x, y] = key.split(',').map(Number);
      this.onlyLand.rect(x * CELL, -(y + 1) * CELL, CELL, CELL);
      this.alsoLand.rect(x * CELL, -(y + 1) * CELL, CELL, CELL);
    }
    this.onlyLand.fill(0xffffff);
    this.alsoLand.fill(0xffffff);
    this.windows.mask = this.alsoLand;
    this.highlight.mask = this.onlyLand;
    this.overlay.addChild(
      this.firelight,
      this.windows,
      this.alsoLand,
      this.highlight,
      this.onlyLand
    );
    this.overlay.eventMode = 'none';
    this.drawFirelight();
  }

  /** What is under a point in world coordinates, or null for open sea. */
  at(worldX: number, worldY: number): Aim | null {
    if (this.fire && this.camp) {
      const reach = Math.hypot(worldX - this.fire.x, worldY - this.fire.y);
      if (reach <= FIRE_REACH) return { kind: 'district', district: this.camp };
    }
    /* A HOUSE IS NOT A THING YOU POINT AT.
     *
     * It was hit first and hit as a shape, so a district was one place with a
     * handful of smaller places cut out of it and the ground between them read
     * differently from the roof. It is one district: the land, the houses on
     * it, the trees between them, all of it. A house still lights up with
     * somebody in it and still has a villager at its door, which is what
     * houses are for here. */
    const district = this.districtAt(worldX, worldY);
    return district ? { kind: 'district', district } : null;
  }

  /** How many buildings a district has, which is how many tasks fit on it. */
  room(district: District): number {
    return this.standing.get(district.id)?.length ?? 0;
  }

  /** Where one of a district's buildings is, for the camera to fly to. */
  buildingAt(district: District, slot: number): Building | undefined {
    return this.standing.get(district.id)?.[slot];
  }

  get hovered(): Aim | null {
    return this.over;
  }

  private districtAt(worldX: number, worldY: number): District | null {
    // Screen y runs down and the world's runs up, so the world point handed in
    // by the viewport is already negated; put it back before asking the grid.
    const cx = Math.floor(worldX / CELL);
    const cy = Math.floor(-worldY / CELL);
    return this.owner.get(`${cx},${cy}`) ?? null;
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
  hover(aim: Aim | null): void {
    if (same(aim, this.over)) return;
    this.over = aim;
    this.highlight.clear();
    if (!aim || aim.district.id === CAMP) return;
    /* Light over a whole district, and only that district.
       A flat lift over all of it is an enormous pale slab rather than a thing
       being pointed at, so it is brightest in the middle of its own ground and
       thins toward where it meets the next one. It was an ellipse over the
       district's box once, and a box is not a district: with the island full,
       half of that light landed on the neighbours, and nothing said which
       place a click would open. */
    this.glow(aim.district);
  }

  private glow(district: District): void {
    const land = new Set<string>();
    for (const [x, y0, y1] of district.cells) {
      for (let y = y0; y <= y1; y++) land.add(`${x},${y}`);
    }
    // How far in from its own edge each cell is, walked inward from the rim.
    const depth = new Map<string, number>();
    let rim: string[] = [];
    for (const key of land) {
      const [x, y] = key.split(',').map(Number);
      const edge = NEIGHBOURS.some(([dx, dy]) => !land.has(`${x + dx},${y + dy}`));
      if (edge) {
        depth.set(key, 1);
        rim.push(key);
      }
    }
    for (let level = 2; rim.length && level <= GLOW_DEPTH; level++) {
      const next: string[] = [];
      for (const key of rim) {
        const [x, y] = key.split(',').map(Number);
        for (const [dx, dy] of NEIGHBOURS) {
          const near = `${x + dx},${y + dy}`;
          if (!land.has(near) || depth.has(near)) continue;
          depth.set(near, level);
          next.push(near);
        }
      }
      rim = next;
    }
    // A thin district never gets far from its edge, so full is as deep as it goes.
    const full = Math.max(1, ...depth.values());
    for (let level = 1; level <= GLOW_DEPTH; level++) {
      let any = false;
      for (const key of land) {
        if (Math.min(depth.get(key) ?? GLOW_DEPTH, full) !== level) continue;
        const [x, y] = key.split(',').map(Number);
        this.highlight.rect(x * CELL, -(y + 1) * CELL, CELL, CELL);
        any = true;
      }
      if (!any) continue;
      const lift = level / Math.min(full, GLOW_DEPTH);
      this.highlight.fill({
        color: 0xffdf9e,
        alpha: GLOW_ALPHA * (GLOW_RIM + (1 - GLOW_RIM) * lift),
      });
    }
  }

  /**
   * The fire breathes.
   *
   * Slow, and barely there: an island with one thing alive on it should not be
   * a still picture, and this is the only thing on an empty one. It is also how
   * you can tell the app is running before anything else has happened.
   */
  tick(ticker: Ticker): void {
    const lit = this.over?.district.id === CAMP ? 1 : 0;
    const breath = 0.5 + 0.5 * Math.sin(performance.now() / 900);
    const want = 0.13 + breath * 0.04 + lit * 0.2;
    // Ease toward it so hovering in and out is a change of light, not a switch.
    this.warmth += (want - this.warmth) * Math.min(1, ticker.deltaTime * 0.12);
    this.firelight.alpha = this.warmth;
  }

  private drawFirelight(): void {
    if (!this.fire) return;
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
  // Already in screen space: boundsOf turns the world's y over itself.
  return {
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    centerX: box.x + box.width / 2,
    centerY: box.y + box.height / 2,
  };
}

function same(a: Aim | null, b: Aim | null): boolean {
  if (!a || !b) return a === b;
  return a.district === b.district;
}
