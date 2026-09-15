/* What you can point at.

   The island is one picture, so pointing at a district is not hitting a sprite:
   a tree on the crop farm's edge is the farm, the ground under it is the farm,
   and the gap between two of its buildings is still the farm. It is the LAND
   that is pointed at, cell by cell, which is also why this is worth sending to
   the renderer rather than asking over the wire per pointer move. */

import type { Layout } from './doc/document';
import { COMMON, type CellRun, type DistrictId, type VillageWorld } from './his';
import { CELL } from './scene/resolve';

export interface District {
  /** One of his thirteen. */
  readonly id: DistrictId;
  /** What it is called out loud: "Crop farm", "Camp". */
  readonly name: string;
  /** The middle of its own land, which is where the camera looks. */
  readonly core: readonly [number, number];
  /** Its land, as runs of cells: `[x, y0, y1]`, ends inclusive. */
  readonly cells: readonly CellRun[];
  /** Whether a checkout stands here, or it is common ground. */
  readonly kind: 'project' | 'common';
}

/**
 * Every district standing in this state.
 *
 * A district that is on is exactly the shape he drew it, so its land is the
 * same land at every state it appears in; the only thing that changes is
 * whether it is there at all. The islet is the exception and moves with its
 * mooring, which is why the offset comes in here.
 */
export function districtsOf(
  world: VillageWorld,
  on: Iterable<string>,
  moored: readonly [number, number] = [0, 0]
): District[] {
  const present = new Set(on);
  const out: District[] = [];
  for (const spec of world.districts) {
    if (!present.has(spec.id)) continue;
    const common = COMMON.includes(spec.id);
    /* Only the islet sails; everything else of his stands where he put it. */
    const shifted =
      spec.id === 'ISLAND' && (moored[0] || moored[1])
        ? spec.cells.map(
            ([x, y0, y1]) => [x + moored[0], y0 + moored[1], y1 + moored[1]] as CellRun
          )
        : spec.cells;
    out.push({
      id: spec.id,
      name: spec.name,
      core: middleOf(shifted),
      cells: shifted,
      kind: common ? 'common' : 'project',
    });
  }
  return out;
}

/**
 * The middle of a district's own land, in cells.
 *
 * Not the middle of its bounding box: his crop farm reaches a long arm north
 * around the hay farm, and the box's middle sits out in a field nobody built
 * on. The mean of the cells themselves lands where the district actually is.
 */
function middleOf(cells: readonly CellRun[]): [number, number] {
  let n = 0;
  let sx = 0;
  let sy = 0;
  for (const [x, y0, y1] of cells) {
    const rows = y1 - y0 + 1;
    n += rows;
    sx += x * rows;
    sy += ((y0 + y1) / 2) * rows;
  }
  if (!n) return [0, 0];
  return [Math.round(sx / n), Math.round(sy / n)];
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
  for (const [x, a, b] of district.cells) {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (a < y0) y0 = a;
    if (b > y1) y1 = b;
  }
  if (!Number.isFinite(x0)) return { x: 0, y: 0, width: 0, height: 0 };
  // Screen y runs down and the world's runs up.
  return {
    x: x0 * CELL,
    y: -(y1 + 1) * CELL,
    width: (x1 - x0 + 1) * CELL,
    height: (y1 - y0 + 1) * CELL,
  };
}

/* Which layers of a tilemap are the ground itself. Everything else in a scene
   stands on these; a cell with none of them is open sea. */
const GROUND_LAYERS = new Set(['Dirt', 'Layer 01', 'Layer 02', 'Layer 03', 'Layer 04']);

/** Every cell the island is made of, coast and cliff top included. */
export function groundCells(layout: Layout): Set<string> {
  const out = new Set<string>();
  for (const tile of layout.tiles) {
    if (!tile.file || !GROUND_LAYERS.has(tile.layer)) continue;
    out.add(`${tile.cell[0]},${tile.cell[1]}`);
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
 * fire is. A district-shaped wash over the middle of the island says nothing
 * about what would happen if you clicked it, and the fire says exactly what it
 * is.
 */
export function campfireOf(layout: Layout): { x: number; y: number } | null {
  for (const object of layout.objects) {
    if (object.prefab !== CAMPFIRE) continue;
    return { x: object.pos[0] * CELL, y: -object.pos[1] * CELL };
  }
  return null;
}
