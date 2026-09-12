/* The scene as it sits on disk.

   This is the handoff's `scene.json` shape, read as-is. It is not the shape the
   editor will keep -- see NOTES.md -- but it is the shape the only working
   scene exists in today, and the renderer is proved against it before anything
   is migrated. Read it, do not assume it: the derivation that produced it was
   not shipped with the handoff, so this file is currently the ONLY record of
   what those columns mean. */

/** One 32px cell. Positions elsewhere are in pixels; these are cell indices. */
export type GroundRow = [
  cx: number,
  cy: number,
  /** 1 = this cell is land. */
  dirt: 0 | 1,
  /** 1 = meadow. 0 with dirt set = worked ground: road, yard, tilled soil. */
  grass: 0 | 1,
  /** Settlement that owns it, or -1 for unclaimed. */
  ownStrict: number,
  /** Fallback owner, used when ownStrict is -1. */
  ownNearest: number,
  /** The artist's baked tile choice, or -1 to resolve from the rules. */
  dirtVar: number,
  grassVar: number,
  /** Set by an edit that reverted this cell to meadow. Absent on disk. */
  wild?: 0 | 1,
];

/** A baked tile: elevation terraces and the coast rims. */
export type TileRow = [
  file: number,
  x: number,
  y: number,
  sortingOrder: number,
  multiply: 0 | 1,
  a: number,
  b: number,
];

/** One drawn sprite of an object, flattened. Indices into `scene.files`. */
export type SpriteRow = [
  file: number,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  /** Pivot, normalised from the sprite's BOTTOM-LEFT. */
  pivotX: number,
  pivotY: number,
  sortingOrder: number,
  /** bit 0 = multiply blend, bit 1 = flip x. */
  flags: number,
];

export interface SceneObject {
  i: number;
  /** Building | Props | Plant | Grass | SCENE */
  g: string;
  /** Prefab name, without the "PF Village ..." prefix. */
  p: string;
  x: number;
  y: number;
  o: number;
  /** Owning settlement, strict. -1 when unclaimed. */
  s: number;
  /** Owning settlement, nearest. */
  m: number;
  d: SpriteRow[];
}

export interface Region {
  id: string;
  color: string;
  poly: [number, number][];
}

export interface Scene {
  kitBase: string;
  files: string[];
  ground: GroundRow[];
  terrace: TileRow[];
  edges: TileRow[];
  objects: SceneObject[];
  regions: Region[];
}

/** One item in the composed draw list, already resolved to a sprite. */
export interface DrawItem {
  /** Resolved sprite path, relative to the kit root. */
  file: string;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  pivotX: number;
  pivotY: number;
  /** Primary sort key. Terrain runs -8..-1 so it stays under objects at 0. */
  order: number;
  multiply: boolean;
  flip: boolean;
  /** Stable tiebreak: placement order. */
  seq: number;
  /** Degrees, counter-clockwise. Non-zero on 4 objects in the whole demo. */
  rotation?: number;
  kind: 'ground' | 'terrain' | 'object';
  /** "cx,cy" of the cell this belongs to, for picking. */
  cell: string;
  object?: SceneObject;
}
