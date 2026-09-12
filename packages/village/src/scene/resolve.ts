/* Scene -> draw list.

   Ported from the handoff's `village-scene.js`. Two things here look like they
   could be simplified and must not be.

   1. THE GRASS BOUNDARY IS NOT "CELLS THAT ARE GRASS". Measured against the 999
      grass cells the artist baked by hand, that model reproduces his tile only
      27% of the time, because it treats three things as holes that he did not:
      open water (the coast rim already makes that transition), the ground
      beneath a plateau, and the cliff rim itself. Grass runs under all three and
      stops only at WORKED ground. Counting them as filled lifts agreement to
      64%, and the errors left are the artist choosing a fringe tile where the
      geometry alone says interior -- a judgement the blob rule cannot express.

        grass cells only ............ 27%
        + ground beneath a plateau .. 31%
        + open water ................ 55%
        + cliff rim ................. 62%
        + coast rim tiles ........... 64%

   2. A BAKED TILE IS KEPT WHILE ITS NEIGHBOURHOOD IS UNCHANGED. Re-resolving
      every cell from the rules would throw away the artist's 36% of hand
      judgements on a scene nobody has edited yet. A cell only goes through the
      table once its own 8-neighbourhood stops matching what it was baked
      against. */

import { grassSprite, interiorGrass, rng } from './terrain';
import type { DrawItem, Scene, TileRow } from './types';

export const CELL = 32;

/** An object's x,y is the CENTRE of its cell: a cell at column c spans
    [c*32, c*32+32) and its objects sit at c*32+16. Rounding lands one column
    over, which is how 205 fence segments came to belong to a cell their
    settlement did not own. Always floor. */
export function cellOf(v: number) {
  return Math.floor(v / CELL);
}

const RING8: [number, number][] = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
  [1, 1],
  [1, -1],
  [-1, -1],
  [-1, 1],
];

export interface Resolved {
  items: DrawItem[];
  counts: { ground: number; terrain: number; object: number; total: number };
}

export function resolve(scene: Scene): Resolved {
  const items: DrawItem[] = [];
  let seq = 0;
  const HALF = CELL / 2;

  /* ---- the cell sets ---------------------------------------------------- */
  const dirt = new Set<string>();
  const grass = new Set<string>();
  const blob = new Set<string>();
  const dirtVar = new Map<string, number>();
  const grassVar = new Map<string, [number, number, number]>();
  const wasGrass = new Set<string>();

  for (const c of scene.ground) {
    const k = c[0] + ',' + c[1];
    if (c[3]) wasGrass.add(k);
    if (c[2]) {
      dirt.add(k);
      dirtVar.set(k, c[6] ?? -1);
    }
    if (c[3]) {
      grass.add(k);
      grassVar.set(k, [c[7] ?? -1, c[0], c[1]]);
    }
    // Water and meadow both count as "filled" for the blob; only worked ground
    // is a hole. See note 1 above.
    if (!c[2] || c[3]) blob.add(k);
  }
  // A plateau surface and a coast rim are both land the grass runs under.
  for (const t of scene.terrace) blob.add(Math.floor(t[1] / CELL) + ',' + Math.floor(t[2] / CELL));
  for (const e of scene.edges) blob.add(Math.floor(e[1] / CELL) + ',' + Math.floor(e[2] / CELL));

  const has = (x: number, y: number) => blob.has(x + ',' + y);
  const had = (x: number, y: number) => wasGrass.has(x + ',' + y);
  const r = rng(11);

  /* ---- ground: dirt beneath, grass painted on top ----------------------- */

  /* Plain dirt only, weighted as the demo weights it. Ids 16 and up carry
     cobbles and pebbles and are placed by hand, never scattered. */
  const PLAIN = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

  for (const k of dirt) {
    const [cx, cy] = k.split(',').map(Number);
    let v = dirtVar.get(k);
    if (v === undefined || v < 0) v = PLAIN[(r() * PLAIN.length) | 0];
    items.push({
      file: `terrain-dirt/TX Tileset Dirt_${v}.png`,
      kind: 'ground',
      cell: k,
      x: cx * CELL + HALF,
      y: cy * CELL + HALF,
      z: 0,
      w: CELL,
      h: CELL,
      pivotX: 0.5,
      pivotY: 0.5,
      order: -8,
      multiply: false,
      flip: false,
      seq: seq++,
    });
  }

  for (const k of grass) {
    const [cx, cy] = k.split(',').map(Number);
    const v = grassVar.get(k);
    let file: string | null = null;
    if (v && v[0] >= 0) {
      // Keep the artist's tile while its neighbourhood still matches. See note 2.
      let same = true;
      for (const [dx, dy] of RING8) {
        if (has(cx + dx, cy + dy) !== had(v[1] + dx, v[2] + dy)) {
          same = false;
          break;
        }
      }
      if (same) file = `terrain-grass/TX Tileset Grass_${v[0]}.png`;
    }
    items.push({
      file: file ?? grassSprite(has, cx, cy, r()),
      kind: 'ground',
      cell: k,
      x: cx * CELL + HALF,
      y: cy * CELL + HALF,
      z: 0,
      w: CELL,
      h: CELL,
      pivotX: 0.5,
      pivotY: 0.5,
      order: -7,
      multiply: false,
      flip: false,
      seq: seq++,
    });
  }

  /* ---- baked terrain: coast rims and the bridge, then the terraces -------
     Edges go in before terraces so that at equal sorting order they land on top
     of the autotiled grass rather than under it. */
  const bake = (t: TileRow, kind: 'terrain') => {
    items.push({
      file: scene.files[t[0]],
      kind,
      cell: Math.round((t[1] - HALF) / CELL) + ',' + Math.round((t[2] - HALF) / CELL),
      x: t[1],
      y: t[2],
      z: 0,
      w: CELL,
      h: CELL,
      pivotX: 0.5,
      pivotY: 0.5,
      order: t[3],
      multiply: !!t[4],
      flip: false,
      seq: seq++,
    });
  };
  for (const e of scene.edges) bake(e, 'terrain');
  for (const t of scene.terrace) bake(t, 'terrain');

  /* ---- objects ---------------------------------------------------------- */
  for (const ob of scene.objects) {
    const cell = cellOf(ob.x) + ',' + cellOf(ob.y);
    for (const d of ob.d) {
      items.push({
        file: scene.files[d[0]],
        kind: 'object',
        cell,
        object: ob,
        x: d[1],
        y: d[2],
        z: d[3],
        w: d[4],
        h: d[5],
        pivotX: d[6],
        pivotY: d[7],
        order: d[8],
        multiply: !!(d[9] & 1),
        flip: !!(d[9] & 2),
        seq: seq++,
      });
    }
  }

  /* ---- the sort ---------------------------------------------------------
     sorting_order ascending, then (y + z) DESCENDING, then placement order.

     Depth is y+z, not z. The URP 2D renderer overrides GraphicsSettings with
     TransparencySortMode 3 (CustomAxis) on axis (0,1,1), so larger y+z is
     farther away and draws first. Sorting by z alone is the obvious misreading
     -- every instance overrides m_LocalPosition.z -- and misplaces 217,729
     pixels. sorting_order outranks both: terrain runs -8..-1 so it stays under
     everything at 0, and it is also what interleaves the shadow tilemaps (z=0)
     between terrain layers (z=10), which depth alone would sort wrongly. */
  items.sort((a, b) => a.order - b.order || b.y + b.z - (a.y + a.z) || a.seq - b.seq);

  const counts = { ground: 0, terrain: 0, object: 0, total: items.length };
  for (const it of items) counts[it.kind]++;
  return { items, counts };
}

/** Every sprite the scene can reach, for the preloader. */
export function spritesUsed(scene: Scene, items: DrawItem[]): string[] {
  const out = new Set<string>(scene.files);
  for (const it of items) out.add(it.file);
  // Variants the tables can reach even if this scene never used them.
  for (let i = 0; i < 32; i++) out.add(`terrain-dirt/TX Tileset Dirt_${i}.png`);
  out.add(interiorGrass(0, 0));
  return [...out].filter(Boolean);
}
