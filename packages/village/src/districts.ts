/* What you can point at.

   The island is one picture, so pointing at a district is not hitting a sprite:
   a tree on the crop farm's edge is the farm, the ground under it is the farm,
   and the gap between two of its buildings is still the farm. It is the LAND
   that is pointed at, cell by cell, which is also why this is worth sending to
   the renderer rather than asking over the wire per pointer move. */

import type { Layout } from './doc/document';
import { CELL } from './scene/resolve';
import type { CellRun, Plots, Stages } from './state';

export interface District {
  /** Plot id, or CAMP. */
  readonly id: string;
  /** What it is called out loud: "Crop farm", "Camp". */
  readonly name: string;
  /** The cell the approach lane arrives at, and where the camera looks. */
  readonly core: readonly [number, number];
  /** Its land in this state, as runs of cells: `[y, x0, x1]`, ends inclusive. */
  readonly cells: readonly CellRun[];
  /** Whether a project stands here, or it is common ground. */
  readonly kind: 'project' | 'common';
  /** How far it has grown, 0..5. The camp has no stage. */
  readonly stage?: number;
}

/** Every district standing in this state, the camp included. */
export function districtsOf(plots: Plots, stages: Stages): District[] {
  const out: District[] = [];
  const camp = plots.camp as Plots['camp'] & { name?: string; core?: [number, number] };
  out.push({
    id: camp.id,
    name: camp.name ?? 'Camp',
    core: camp.core ?? [0, 0],
    cells: camp.cells,
    kind: 'common',
  });
  for (const rec of plots.plots) {
    const stage = stages[rec.id];
    if (stage === undefined) continue;
    const plot = rec as typeof rec & { name?: string; core?: [number, number] };
    out.push({
      id: rec.id,
      name: plot.name ?? rec.id,
      core: plot.core ?? [0, 0],
      // Its land at the stage it is at, not every cell it will ever claim: a
      // young district should not be clickable out in the water it has not
      // grown into yet.
      cells: rec.land[String(stage)] ?? [],
      kind: 'project',
      stage,
    });
  }
  return out;
}

/** A district's extent in world pixels, as the renderer places things. */
export function boundsOf(district: District): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const [y, a, b] of district.cells) {
    if (a < x0) x0 = a;
    if (b > x1) x1 = b;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  if (!Number.isFinite(x0)) return { x: 0, y: 0, width: 0, height: 0 };
  return {
    x: x0 * CELL,
    y: y0 * CELL,
    width: (x1 - x0 + 1) * CELL,
    height: (y1 - y0 + 1) * CELL,
  };
}

/* Which layers of a tilemap are the ground itself, and how high each one
   stacks. A cell's ground is whatever its topmost one of these draws. */
const GROUND_LAYERS: Record<string, number> = {
  Dirt: 0,
  'Layer 01': 1,
  'Layer 02': 2,
  'Layer 03': 3,
  'Layer 04': 4,
};

/**
 * The cells you stand on: the ones whose topmost ground tile is meadow or
 * worked earth rather than stone.
 *
 * This is the shore pass's own definition of land, and it is the difference
 * between light that falls on a field and light that climbs the cliff face at
 * its edge. A cell with a lip drawn over it is a coast, not a place.
 */
export function standingGround(layout: Layout): Set<string> {
  const top = new Map<string, [number, string]>();
  for (const tile of layout.tiles) {
    const level = GROUND_LAYERS[tile.layer];
    if (!tile.file || level === undefined) continue;
    const key = `${tile.cell[0]},${tile.cell[1]}`;
    const held = top.get(key);
    if (!held || level >= held[0]) top.set(key, [level, tile.file]);
  }
  const out = new Set<string>();
  for (const [key, [, file]] of top) {
    if (!file.startsWith('terrain-tiles/')) out.add(key);
  }
  return out;
}

/**
 * How much sea the island takes up, in the pixels the renderer places in.
 *
 * Measured off the tiles rather than off what is drawn: a scene graph's own
 * bounds also carry whatever empty containers are hanging in it at the origin,
 * and the island sits a long way from the origin, so the camera framed itself
 * on a rectangle stretching back to a point where nothing is.
 */
export function extentOf(layout: Layout): { x: number; y: number; width: number; height: number } {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const tile of layout.tiles) {
    if (!tile.file) continue;
    const [x, y] = tile.cell;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  if (!Number.isFinite(x0)) return { x: 0, y: 0, width: 0, height: 0 };
  // Screen y runs down and the world's runs up, so the top of the island is its
  // highest cell.
  return {
    x: x0 * CELL,
    y: -(y1 + 1) * CELL,
    width: (x1 - x0 + 1) * CELL,
    height: (y1 - y0 + 1) * CELL,
  };
}

/** The prefab the camp is built around. There is exactly one on the island. */
const CAMPFIRE = 'PF Village Props - Campfire 01';

/**
 * Where the fire is, in the pixels the renderer places in.
 *
 * The camp owns a stretch of ground, but the camp is not what you point at: the
 * fire is. A plot-shaped wash over the middle of the island says nothing about
 * what would happen if you clicked it, and the fire says exactly what it is.
 */
export function campfireOf(layout: Layout): { x: number; y: number } | null {
  for (const object of layout.objects) {
    if (object.prefab !== CAMPFIRE) continue;
    return { x: object.pos[0] * CELL, y: -object.pos[1] * CELL };
  }
  return null;
}
