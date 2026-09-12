/* base-layout.json -> draw list.

   This reads the extractor's output directly, which `scene.json` does not
   losslessly represent: the derivation that produced scene.json dropped the
   object-level z, zeroing it on all 95 objects (4.1%) that use one. Those 95
   are precisely the things that stand ON other things -- bottles and plates on
   tables, chimneys on roofs -- because z is the manual nudge that pulls them in
   front of the surface they rest on. Without it a tabletop sorts behind its own
   table and the items vanish under it.

   base-layout.json is ground truth and is never written. It is also what
   preview.png was rendered from, which makes this path the one that can be
   diffed against a trusted picture. */

import type { DrawItem } from './types';

const PPU = 32;

interface RawSprite {
  file: string | null;
  fill?: string | null;
  part?: string;
  offset: [number, number, number];
  pivot: [number, number];
  size_px: [number, number];
  sorting_order: number;
  blend: string;
  flip_x: boolean;
  flip_y: boolean;
  active: boolean;
  backdrop: boolean;
  scale?: [number, number, number];
}

interface RawObject {
  prefab: string;
  group: string;
  pos: [number, number, number];
  root_order: number;
  rotation_deg: number;
  sprites: RawSprite[];
}

interface RawTile {
  layer: string;
  sorting_order: number;
  blend: string;
  cell: [number, number];
  pos: [number, number, number];
  file: string;
  size_px: [number, number];
  pivot: [number, number];
}

export interface BaseLayout {
  objects: RawObject[];
  tiles: RawTile[];
  counts: Record<string, number>;
}

export interface Built {
  items: DrawItem[];
  counts: { tile: number; object: number; total: number; skippedFill: number; blankTiles: number };
}

export function fromBaseLayout(layout: BaseLayout): Built {
  const items: DrawItem[] = [];
  let skippedFill = 0;
  let blankTiles = 0;

  /* Everything is scaled to pixels, INCLUDING z. The sort compares y + z, so
     both terms have to be in the same unit or the ordering changes; scaling
     both by 32 leaves the ordering identical to render.py's, which sorts in
     world units. */
  /* 29 tile placements carry no file. They reference 7 sprites the kit ships
     without because they are genuinely blank -- 0 opaque pixels, verified by
     extract/verify_missing_tiles.py. Dropping them is correct and is what
     render.py does. They are counted separately so that a real missing sprite
     can never hide inside a "29 skipped" that everyone has learned to ignore. */
  for (const t of layout.tiles) {
    if (!t.file) {
      blankTiles++;
      continue;
    }
    items.push({
      file: t.file,
      x: t.pos[0] * PPU,
      y: t.pos[1] * PPU,
      z: t.pos[2] * PPU,
      w: t.size_px[0],
      h: t.size_px[1],
      pivotX: t.pivot[0],
      pivotY: t.pivot[1],
      order: t.sorting_order,
      multiply: t.blend === 'multiply',
      flip: false,
      // Tiles sort against root_order 0, as in render.py.
      seq: 0,
      kind: 'terrain',
      cell: t.cell[0] + ',' + t.cell[1],
    });
  }

  for (const o of layout.objects) {
    const [ox, oy, oz] = o.pos;
    for (const s of o.sprites) {
      if (s.active === false) continue;
      if (!s.file) {
        if (s.fill) skippedFill++;
        continue;
      }
      const [dx, dy, dz] = s.offset;
      items.push({
        file: s.file,
        x: (ox + dx) * PPU,
        y: (oy + dy) * PPU,
        z: (oz + dz) * PPU,
        w: s.size_px[0],
        h: s.size_px[1],
        pivotX: s.pivot[0],
        pivotY: s.pivot[1],
        order: s.sorting_order ?? 0,
        multiply: s.blend === 'multiply',
        flip: !!s.flip_x,
        seq: o.root_order,
        rotation: o.rotation_deg || 0,
        kind: 'object',
        cell: Math.floor(ox) + ',' + Math.floor(oy),
      });
    }
  }

  /* The full key, and every part of it is load-bearing:

       sorting_order ascending   terrain runs -8..-1 so it stays under objects
                                 at 0, and it is what interleaves the shadow
                                 tilemaps (z=0) between terrain layers (z=10)
       (y + z) DESCENDING        URP 2D CustomAxis (0,1,1): larger is farther
                                 away and draws first. Sorting by z alone is
                                 the obvious misreading and misplaces 217,729
                                 pixels
       root_order ascending      the Unity sibling index -- the artist's own
                                 tiebreak between two things at one depth */
  items.sort((a, b) => a.order - b.order || b.y + b.z - (a.y + a.z) || a.seq - b.seq);

  let tile = 0,
    object = 0;
  for (const it of items) {
    if (it.kind === 'terrain') tile++;
    else object++;
  }
  return { items, counts: { tile, object, total: items.length, skippedFill, blankTiles } };
}

/** Every sprite file the layout references. */
export function spritesOf(items: DrawItem[]): string[] {
  return [...new Set(items.map((i) => i.file))].filter(Boolean);
}
