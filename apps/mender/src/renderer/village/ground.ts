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
 * What the pointer is on.
 *
 * A building always comes with the district it stands in, because pointing at
 * a building is also pointing at that project; `slot` is which of the
 * district's buildings it is, counted in the order the map reads.
 */
export type Aim =
  | { kind: 'district'; district: District }
  | { kind: 'building'; district: District; slot: number };

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

export class Ground {
  /** The light on the land. Belongs under the things standing on it. */
  readonly overlay = new Container();

  private readonly owner = new Map<string, District>();
  private readonly highlight = new Graphics({ blendMode: 'add' });
  /* The island's own outline, as a hole light is allowed through. Light that
     falls past the coast is a haze sitting on the water, and the sea is the one
     surface in the picture nothing is standing on. */
  private readonly onlyLand = new Graphics();
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
      for (const [y, x0, x1] of district.cells) {
        for (let x = x0; x <= x1; x++) this.owner.set(`${x},${y}`, district);
      }
    }
    this.camp = districts.find((district) => district.id === CAMP) ?? null;
    this.fire = campfireOf(layout);
    for (const building of buildings) {
      if (!building.plot || building.plot === CAMP) continue;
      const held = this.standing.get(building.plot);
      if (held) held.push(building);
      else this.standing.set(building.plot, [building]);
    }
    for (const key of groundCells(layout)) {
      const [x, y] = key.split(',').map(Number);
      this.onlyLand.rect(x * CELL, -(y + 1) * CELL, CELL, CELL);
    }
    this.onlyLand.fill(0xffffff);
    this.highlight.mask = this.onlyLand;
    this.overlay.addChild(this.firelight, this.highlight, this.onlyLand);
    this.overlay.eventMode = 'none';
    this.drawFirelight();
  }

  /** What is under a point in world coordinates, or null for open sea. */
  at(worldX: number, worldY: number): Aim | null {
    if (this.fire && this.camp) {
      const reach = Math.hypot(worldX - this.fire.x, worldY - this.fire.y);
      if (reach <= FIRE_REACH) return { kind: 'district', district: this.camp };
    }
    const district = this.districtAt(worldX, worldY);
    if (!district) return null;
    const buildings = this.standing.get(district.id) ?? [];
    for (let slot = 0; slot < buildings.length; slot++) {
      const box = buildings[slot];
      if (
        worldX >= box.x &&
        worldX < box.x + box.width &&
        worldY >= box.y &&
        worldY < box.y + box.height
      ) {
        return { kind: 'building', district, slot };
      }
    }
    return { kind: 'district', district };
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
    if (aim.kind === 'building') {
      const box = this.buildingAt(aim.district, aim.slot);
      if (box)
        this.glow(box.x + box.width / 2, box.y + box.height / 2, box.width, box.height, 0.03);
      return;
    }
    /* The same light the fire gives, over a whole district.
       Filling its cells was the obvious thing and it was wrong twice over: a
       district is a third of the island, so a flat lift over all of it is an
       enormous pale rectangle rather than a thing being pointed at, and a
       tile-shaped edge on light reads as a selection box from a different kind
       of app. Light has no edges. This falls off. */
    const box = boundsOf(aim.district);
    this.glow(box.x + box.width / 2, -(box.y + box.height / 2), box.width, box.height, 0.015);
  }

  private glow(cx: number, cy: number, width: number, height: number, alpha: number): void {
    const rx = (width / 2) * 1.35;
    const ry = (height / 2) * 1.35;
    for (let i = 0; i < RINGS; i++) {
      const at = 1 - i / RINGS;
      this.highlight.ellipse(cx, cy, rx * at, ry * at).fill({ color: 0xffdf9e, alpha });
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
  return {
    x: box.x,
    y: -(box.y + box.height),
    width: box.width,
    height: box.height,
    centerX: box.x + box.width / 2,
    centerY: -(box.y + box.height / 2),
  };
}

function same(a: Aim | null, b: Aim | null): boolean {
  if (!a || !b) return a === b;
  if (a.district !== b.district || a.kind !== b.kind) return false;
  return a.kind !== 'building' || a.slot === (b as { slot: number }).slot;
}
