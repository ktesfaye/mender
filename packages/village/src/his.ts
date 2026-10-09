/* His village, district by district: nothing composed, nothing grown.

   THE WHOLE IDEA. `base-layout.json` is the artist's map and it is never
   touched. `districts.json` says which of his 7,622 cells and which of his
   2,329 objects belong to each of his thirteen districts — his own partition,
   read rather than invented, with no unassigned wilderness in it. A STATE here
   is just a set of those thirteen switched on. The land of the state is the
   union of their cells; everything else of his is erased to open sea and the
   coastline that exposes is dressed by the editor's own brush.

   WHAT IT IS NOT. No stages, no growth arcs, no trails, no meadow repaint, no
   `new` land. A district that is ON is exactly the shape he drew it, tile for
   tile; a district that is OFF is water. The only thing that moves is the cut
   edge between a district that is on and one that is off — and the shore pass
   holds every cell whose whole neighbourhood is asked for, and every cell that
   was already on his own shoreline, so his coast stays his coast.

   Ported from `world/his.py` in the village repo, which is where it was worked
   out and which gates it. The rules are that file's; keep the two in step if
   either moves. */

import type { Atlas } from './brush/redress';
import type { Layout, VObject, VTile } from './doc/document';
import { shorePass } from './shore';

/** His thirteen. D01 is ours and lives in another layout; it is not one of these. */
export const DISTRICTS = [
  'CAMP',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'ISLAND',
  'J',
  'K',
] as const;
export type DistrictId = (typeof DISTRICTS)[number];

/* THE COMMON GROUND. The camp and the islet are not projects and are never
   switched off: the fire is where the village starts and the islet is the other
   place that is simply there. Everything else is a district that has to be
   reached. The two commons may stand apart — his islet is across water until
   the south houses bring the bridge back, and an island across water is a map,
   not a composition that came apart. */
export const COMMON: DistrictId[] = ['CAMP', 'ISLAND'];
/** The fire, which is where the village starts and where every walk out of it
    begins. Nothing is ever on the map without a way back to here. */
export const CAMP: DistrictId = 'CAMP';
/** The islet, which moors itself rather than standing where it is put. It is
    always on the map, but unlike the camp somebody may live on it: a project
    that does stands on whatever coast the islet is moored to. */
export const ISLET: DistrictId = 'ISLAND';

/** A run of cells in one column: `[x, y0, y1]`, both ends inclusive. */
export type CellRun = readonly [number, number, number];
export type Cell = readonly [number, number];

/** One of his thirteen, as `districts.json` carries it. */
export interface DistrictSpec {
  readonly id: DistrictId;
  /** What it is called out loud: "Crop farm", "Camp". */
  readonly name: string;
  readonly cells: readonly CellRun[];
  /** Indexes into his object list, never ids: 116 of his ids do not survive a
      browser. */
  readonly objects: readonly number[];
}

/**
 * A piece of one of his districts, as `subdistricts.json` carries it: land a
 * district gives up to a project once all eleven are taken. In the order they
 * are handed out.
 */
export interface SubdistrictSpec {
  readonly id: string;
  /** The district it is cut out of. */
  readonly of: DistrictId;
  readonly name: string;
  readonly cells: readonly CellRun[];
}

/** Everything a village needs to draw any state of itself. Loaded once. */
export interface VillageWorld {
  /** `base-layout.json`: his scene, exactly as he drew it. */
  readonly base: Layout;
  /** `districts.json`: his own partition of it. */
  readonly districts: readonly DistrictSpec[];
  /** `atlas.json`: what every terrain tile is, which the brush picks against. */
  readonly atlas: Atlas;
}

const key = (x: number, y: number): string => `${x},${y}`;
const unkey = (k: string): Cell => {
  const cut = k.indexOf(',');
  return [Number(k.slice(0, cut)), Number(k.slice(cut + 1))];
};

/** Python's `%`, which is what the wobble's hash was measured with. A negative
    coordinate through JavaScript's own gives a negative remainder and erodes a
    different third of the coast. */
const mod = (n: number, m: number): number => ((n % m) + m) % m;

function cellsIn(runs: readonly CellRun[]): Set<string> {
  const out = new Set<string>();
  for (const [x, y0, y1] of runs) for (let y = y0; y <= y1; y++) out.add(key(x, y));
  return out;
}

const cellOf = (object: VObject): Cell => [Math.floor(object.pos[0]), Math.floor(object.pos[1])];

/** The water backdrop, which belongs to no district and is always drawn. */
const WATER = 'PF Top Down Pixel Water';

/**
 * The geography, which is all you need to know what may stand where.
 *
 * Measured off the partition alone — sixteen kilobytes of it — so the part of
 * the app that hands out districts never has to load eight megabytes of his
 * scene to find out which one is next.
 */
export interface Plan {
  readonly spec: (id: string) => DistrictSpec;
  /** Two districts are neighbours when their cells touch. */
  readonly neighbours: Readonly<Record<string, readonly DistrictId[]>>;
  /** The districts that may be switched on next: off, and touching something on. */
  reachable(present: Iterable<string>): DistrictId[];
  /** Whether the camp stands where he drew it, or has had to sail to the land. */
  campHome(present: Iterable<string>): boolean;
  /** The districts that actually hang off the common ground. */
  connected(present: Iterable<string>): Set<DistrictId>;
  /** The districts grouped into the islands they make. */
  pieces(present: Iterable<string>): DistrictId[][];
  /** The order districts come on in. */
  order(): DistrictId[];
  /** The name of a state: his districts in his order, or `none`. */
  stateKey(present: Iterable<string>): string;
  /** One district's cells, keyed. The partition read the way the pass wants it. */
  cellsOf(id: string): Set<string>;
}

/** The geography, and his scene to draw it with. */
export interface Village extends Plan {
  readonly world: VillageWorld;
  /** His layout with only these districts standing. */
  compose(present: Iterable<string>): Composed;
}

export interface Composed {
  /** The map, ready to draw. */
  readonly layout: Layout;
  /** Which districts are actually standing, his order. */
  readonly on: DistrictId[];
  /** How far the islet had to sail from where he moored it. */
  readonly moored: Cell;
  /** How far the camp had to sail to reach land nobody drew it beside. */
  readonly camped: Cell;
  /** The shore pass's own counts, for when the coast comes out wrong. */
  readonly shore: Record<string, number>;
  /** Every cell that was asked for as land, after the bridge and the wobble. */
  readonly asked: readonly Cell[];
}

export function createVillage(world: VillageWorld): Village {
  const plan = createPlan(world.districts);
  /* His bridge, and the islet it carries, which are one drawn thing and move
     as one. Found once: it is the only thing compose needs from his scene that
     the partition does not already say. */
  const span = bridgeOf(world);
  const unit = new Set<string>([...span, ...plan.cellsOf('ISLAND')]);
  const index: Index = { ...plan, span, unit };
  return {
    ...plan,
    world,
    compose: (present) => compose(world, index, present),
  };
}

/**
 * His one bridge, as the cells it is drawn across.
 *
 * A span is one object drawn across open water, read off the atlas's own
 * `bridge-arch` rather than a list typed here. With only one of its two ends on
 * the map it is a stub hanging over the sea, which is what the islet came out
 * as the first time this ran, so the islet and the span travel together and the
 * span is never on its own. His map has exactly one, from the south houses to
 * the islet.
 */
function bridgeOf(world: VillageWorld): Set<string> {
  const tiles = (world.atlas as unknown as { tiles: Record<string, { kind?: string }> }).tiles;
  const left = new Set<string>();
  for (const tile of world.base.tiles) {
    if (tile.file && tiles[tile.file]?.kind === 'bridge-arch') {
      left.add(key(tile.cell[0], tile.cell[1]));
    }
  }
  const blobs: Set<string>[] = [];
  while (left.size) {
    const seed = left.values().next().value as string;
    left.delete(seed);
    const blob = new Set([seed]);
    const edge = [seed];
    while (edge.length) {
      const [x, y] = unkey(edge.pop() as string);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const k = key(x + dx, y + dy);
          if (left.has(k)) {
            left.delete(k);
            blob.add(k);
            edge.push(k);
          }
        }
      }
    }
    blobs.push(blob);
  }
  return blobs[0] ?? new Set<string>();
}

export function createPlan(specs: readonly DistrictSpec[]): Plan {
  const world = { districts: specs };
  const byId = new Map<string, DistrictSpec>();
  for (const spec of world.districts) byId.set(spec.id, spec);
  const spec = (id: string): DistrictSpec => {
    const found = byId.get(id);
    if (!found) throw new Error(`not one of his districts: ${id}`);
    return found;
  };

  const cells = new Map<string, Set<string>>();
  for (const district of world.districts) cells.set(district.id, cellsIn(district.cells));
  const cellsOf = (id: string): Set<string> => cells.get(id) ?? new Set();

  /* WHOSE EVERY CELL IS, which is the whole partition in one map. */
  const owner = new Map<string, DistrictId>();
  for (const district of world.districts) {
    for (const k of cellsOf(district.id)) owner.set(k, district.id);
  }

  /* Measured off the partition, never typed: two districts are neighbours when
     their cells touch at a side. The camp touches only the crop farm; the islet
     touches only the south houses, by the bridge. */
  const neighbours: Record<string, DistrictId[]> = {};
  for (const id of DISTRICTS) neighbours[id] = [];
  {
    const near = new Map<string, Set<DistrictId>>();
    for (const id of DISTRICTS) near.set(id, new Set());
    for (const [k, mine] of owner) {
      const [x, y] = unkey(k);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const theirs = owner.get(key(x + dx, y + dy));
        if (theirs && theirs !== mine) {
          near.get(mine)?.add(theirs);
          near.get(theirs)?.add(mine);
        }
      }
    }
    for (const id of DISTRICTS) neighbours[id] = [...(near.get(id) ?? [])].sort();
  }

  /* THE CAMP GOES WHERE THE VILLAGE IS. He drew it beside the crop farm, and
     while anything of his that touches it is standing it stays exactly there.
     But one project on the port with the crop farm empty is a village too, and
     the fire is only where every walk begins, not a place anybody chose: so
     with none of its own neighbours on, the camp sails to the biggest piece of
     land there is, the way the islet sails to whatever coast there is. */
  const campHome = (present: Iterable<string>): boolean => {
    const on = new Set(present);
    const others = [...on].filter((d) => d !== CAMP && d !== ISLET);
    return !others.length || neighbours[CAMP].some((n) => on.has(n));
  };

  /** The piece of land the camp sails to when it is not at home. */
  const landing = (on: Set<string>): Set<DistrictId> => {
    const left = new Set([...on].filter((d) => d !== CAMP && d !== ISLET) as DistrictId[]);
    let best: DistrictId[] = [];
    let most = -1;
    for (const seed of DISTRICTS.filter((d) => left.has(d))) {
      if (!left.has(seed)) continue;
      const blob: DistrictId[] = [seed];
      left.delete(seed);
      for (let i = 0; i < blob.length; i++) {
        for (const n of neighbours[blob[i]]) {
          if (left.has(n)) {
            left.delete(n);
            blob.push(n);
          }
        }
      }
      const size = blob.reduce((sum, d) => sum + cellsOf(d).size, 0);
      if (size > most) {
        most = size;
        best = blob;
      }
    }
    return new Set(best);
  };

  const reachable = (present: Iterable<string>): DistrictId[] => {
    const on = new Set(present);
    if (on.has(CAMP) && !campHome(on)) on.delete(CAMP);
    on.delete(ISLET);
    /* The islet does not count as something to build from — it is moored
       wherever the coast happens to be, so it cannot hold up a district that
       belongs beside the south houses. */
    return DISTRICTS.filter(
      (d) => !on.has(d) && d !== ISLET && neighbours[d].some((n) => on.has(n))
    );
  };

  /**
   * The districts that actually hang off the common ground.
   *
   * A district is only ever on if you can walk to it from the fire, and
   * switching one off takes with it anything that was reached through it, so
   * nothing is ever left floating in the sea on its own. The islet is always
   * on and does not have to be reached.
   */
  const connected = (present: Iterable<string>): Set<DistrictId> => {
    const on = new Set([...present, ...COMMON]);
    on.delete(ISLET);
    if (!campHome(on)) return new Set<DistrictId>([CAMP, ...landing(on), ISLET]);
    const keep = new Set<DistrictId>([CAMP]);
    const edge: DistrictId[] = [CAMP];
    while (edge.length) {
      const d = edge.pop() as DistrictId;
      for (const n of neighbours[d]) {
        if (on.has(n) && !keep.has(n) && n !== ISLET) {
          keep.add(n);
          edge.push(n);
        }
      }
    }
    keep.add(ISLET);
    return keep;
  };

  const pieces = (present: Iterable<string>): DistrictId[][] => {
    const on = new Set(present);
    const hasIslet = on.has(ISLET);
    on.delete(ISLET);
    const out: DistrictId[][] = [];
    while (on.size) {
      const seed = on.values().next().value as DistrictId;
      const blob = new Set<DistrictId>([seed]);
      const edge: DistrictId[] = [seed];
      while (edge.length) {
        const d = edge.pop() as DistrictId;
        for (const n of neighbours[d]) {
          if (on.has(n) && !blob.has(n)) {
            blob.add(n);
            edge.push(n);
          }
        }
      }
      for (const d of blob) on.delete(d);
      out.push([...blob].sort(byHisOrder));
    }
    if (out.length && hasIslet) out[0] = [...out[0], ISLET].sort(byHisOrder);
    return out;
  };

  /**
   * How far from a disc a state's land is.
   *
   * The mean distance of its cells from their own middle, over the square root
   * of how many there are, so the number says nothing about how big the island
   * is and everything about what shape it is. A perfect disc is 0.376 and it
   * climbs from there: his whole village is 0.44, a long east-west bar of it
   * is 0.58. The islet is left out, since it is moored to whatever coast there
   * is rather than sitting anywhere of its own.
   */
  const sprawlCache = new Map<string, number>();
  const sprawl = (on: Set<string>): number => {
    const k = [...on].sort().join('-');
    const had = sprawlCache.get(k);
    if (had !== undefined) return had;
    const land: Cell[] = [];
    for (const d of on) {
      if (d === ISLET) continue;
      for (const c of cellsOf(d)) land.push(unkey(c));
    }
    const n = land.length;
    let cx = 0;
    let cy = 0;
    for (const [x, y] of land) {
      cx += x;
      cy += y;
    }
    cx /= n;
    cy /= n;
    let sum = 0;
    for (const [x, y] of land) sum += Math.hypot(x - cx, y - cy);
    const out = sum / n / Math.sqrt(n);
    sprawlCache.set(k, out);
    return out;
  };

  /**
   * The order districts come on in, which is his geography and then his shape.
   *
   * Every state has to be one piece of land, and from the fire that leaves no
   * choice at all to begin with: the camp touches only the crop farm. After
   * that there are four or five places the village could go next, and the one
   * it takes is the one that leaves the island roundest — not that one state
   * alone, but every state from there to the end of it added up, over all the
   * walks the adjacency allows. Shape is the whole of what the island says from
   * out on the water: a village that grows along one arm reads as a sandbar,
   * and the camera has to pull back to hold it, so everything on it gets
   * smaller.
   */
  let walked: DistrictId[] | null = null;
  const walk = (
    on: Set<string>,
    memo: Map<string, [number, DistrictId[]]>
  ): [number, DistrictId[]] => {
    const k = [...on].sort().join('-');
    const had = memo.get(k);
    if (had) return had;
    let best: [number, DistrictId[]] | null = null;
    for (const d of reachable(on).sort()) {
      const after = new Set(on);
      after.add(d);
      const [cost, tail] = walk(after, memo);
      const total = sprawl(after) + cost;
      if (!best || total < best[0]) best = [total, [d, ...tail]];
    }
    const out: [number, DistrictId[]] = best ?? [0, []];
    memo.set(k, out);
    return out;
  };
  const order = (): DistrictId[] => {
    if (!walked) walked = [...COMMON, ...walk(new Set(COMMON), new Map())[1]];
    return [...walked];
  };

  const stateKey = (present: Iterable<string>): string => {
    const on = new Set(present);
    return DISTRICTS.filter((d) => on.has(d)).join('-') || 'none';
  };

  return {
    spec,
    neighbours,
    reachable,
    campHome,
    connected,
    pieces,
    order,
    stateKey,
    cellsOf,
  };
}

function byHisOrder(a: DistrictId, b: DistrictId): number {
  return DISTRICTS.indexOf(a) - DISTRICTS.indexOf(b);
}

/** The plan, plus the one thing compose needs from his scene. */
interface Index extends Plan {
  /** The cells his bridge is drawn across. */
  readonly span: Set<string>;
  /** Those cells and the islet's, which move as one piece. */
  readonly unit: Set<string>;
}

/* His coast, measured off his own island: for every side of every boundary cell
   that faces water, how far that side runs before it turns. Median 3, a quarter
   of them 5 or more, longest 12. A cut edge longer than this is the partition
   line showing through, and the partition was never drawn to be a coastline. */
const HIS_RUN = 4;

/* The kinds of tile the wobble may take. Anything else — a cliff, a boulder, a
   stair, a bridge, a terrace lip — is structure he drew and is never eroded. */
const SOFT = ['grass', 'dirt'];

/** The top ground tile of every cell, which is what says what a cell is. */
function topGround(layout: Layout): Map<string, string> {
  const level: Record<string, number> = {
    Dirt: 0,
    'Layer 01': 1,
    'Layer 02': 2,
    'Layer 03': 3,
    'Layer 04': 4,
  };
  const top = new Map<string, [number, string]>();
  for (const tile of layout.tiles) {
    if (!tile.file || !(tile.layer in level)) continue;
    const k = key(tile.cell[0], tile.cell[1]);
    const lv = level[tile.layer];
    const had = top.get(k);
    if (!had || lv >= had[0]) top.set(k, [lv, tile.file]);
  }
  const out = new Map<string, string>();
  for (const [k, [, file]] of top) out.set(k, file);
  return out;
}

/**
 * Cells the wobble is allowed to take.
 *
 * Plain meadow or bare dirt, with nothing of his standing on or beside them. A
 * cell with a fence post, a bush or a tree within one is left alone, so the
 * erosion can only ever take empty ground at the water's edge.
 */
function soft(layout: Layout, atlas: Atlas, land: Set<string>): Set<string> {
  const tiles = (atlas as unknown as { tiles: Record<string, { kind?: string }> }).tiles;
  const top = topGround(layout);
  const busy = new Set<string>();
  for (const object of layout.objects) {
    if (object.prefab === WATER) continue;
    const [x, y] = cellOf(object);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) busy.add(key(x + dx, y + dy));
  }
  const out = new Set<string>();
  for (const k of land) {
    if (busy.has(k)) continue;
    const file = top.get(k);
    if (!file) continue;
    const kind = tiles[file]?.kind ?? '';
    if (SOFT.some((s) => kind.startsWith(s))) out.add(k);
  }
  return out;
}

/** Every cell of `land` sorted the way his.py sorts a set of tuples. */
function sortedCells(land: Set<string>): Cell[] {
  const out = [...land].map(unkey);
  out.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return out;
}

/**
 * Break the partition's straight lines into his own run lengths.
 *
 * A district line runs where the partition put it, which is often ruler
 * straight through open meadow — and a coastline that runs straight for seven
 * cells is the one thing in a render that says a rectangle was cut out of a
 * map. His own coast turns every two or three cells. So a boundary cell sitting
 * in a run longer than his gets eroded, on a hash of its own coordinates so the
 * same state always comes out the same way.
 *
 * It only ever REMOVES, only bare meadow with nothing of his within one cell,
 * and never a cell in `keep` — the shore he already had. Nothing he drew can
 * move; the land just stops a cell earlier in places.
 */
function wobble(
  layout: Layout,
  atlas: Atlas,
  land: Set<string>,
  keep: Set<string>
): { land: Set<string>; moved: number } {
  const canTake = soft(layout, atlas, land);
  for (const k of keep) canTake.delete(k);
  let moved = 0;
  for (let round = 0; round < 2; round++) {
    const runs = new Map<string, number>();
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ]) {
      const seen = new Set<string>();
      const [px, py] = dy ? [1, 0] : [0, 1];
      for (const [x, y] of sortedCells(land)) {
        const here = key(x, y);
        if (land.has(key(x + dx, y + dy)) || seen.has(here)) continue;
        const run: string[] = [];
        let qx = x;
        let qy = y;
        while (land.has(key(qx, qy)) && !land.has(key(qx + dx, qy + dy))) {
          seen.add(key(qx, qy));
          run.push(key(qx, qy));
          qx += px;
          qy += py;
        }
        for (const k of run) runs.set(k, Math.max(runs.get(k) ?? 0, run.length));
      }
    }
    const take = new Set<string>();
    for (const [k, n] of runs) {
      if (n <= HIS_RUN || !canTake.has(k)) continue;
      const [x, y] = unkey(k);
      /* Two of every three cells of a long run stay: the run comes out at two
         or three, which is his. */
      if (mod(x * 7 + y * 13, 3) === 0) take.add(k);
    }
    if (!take.size) break;
    for (const k of take) land.delete(k);
    moved += take.size;
    /* And no spit left behind: a cell with one neighbour of land is a one-wide
       tab, which the dresser answers with a pillar on nothing. */
    for (;;) {
      const thin = new Set<string>();
      for (const k of land) {
        if (!canTake.has(k)) continue;
        const [x, y] = unkey(k);
        let n = 0;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          if (land.has(key(x + dx, y + dy))) n++;
        }
        if (n <= 1) thin.add(k);
      }
      if (!thin.size) break;
      for (const k of thin) land.delete(k);
      moved += thin.size;
    }
  }
  return { land, moved };
}

/**
 * Where the islet sits in this state, as an offset from where he drew it.
 *
 * THE ISLET IS MOORED, NOT ANCHORED. It is common ground — always on the map —
 * and it is joined to the rest by his one bridge, so it cannot stay at the
 * coordinates he gave it while the coast it reaches is somewhere else: with
 * only the camp standing, his bridge ended in open water forty cells from
 * anything. So the islet and the span move together, as one piece, until the
 * west end of the bridge lands on the shore that is actually there, and they
 * move again every time that shore moves.
 */
function moor(
  layout: Layout,
  atlas: Atlas,
  index: Index,
  main: Set<string>,
  hisLand: Set<string>
): Cell {
  const { span, unit } = index;
  /* THE DECK IS THE ROW YOU WALK ON, and it is the only one that has to reach
     the shore: the rows below it are the arch, which he draws standing in the
     water. Which row that is comes off the kit's own terrain classes, not from
     counting. Moored on the west column instead, the islet was joined by a
     bridge nobody could cross, and requiring all three rows to land found no
     berth on the camp at all, because his coast there steps the wrong way. */
  const tiles = (
    atlas as unknown as {
      tiles: Record<string, { kit?: { kind?: string } }>;
    }
  ).tiles;
  const at = new Map<string, string[]>();
  for (const tile of layout.tiles) {
    const k = key(tile.cell[0], tile.cell[1]);
    if (tile.file && span.has(k)) at.set(k, [...(at.get(k) ?? []), tile.file]);
  }
  const rows = [...new Set([...span].map((k) => unkey(k)[1]))].sort((a, b) => a - b);
  let deck = rows[0];
  let most = -1;
  for (const y of rows) {
    let n = 0;
    for (const [k, files] of at) {
      if (unkey(k)[1] !== y) continue;
      for (const f of files) if (tiles[f]?.kit?.kind === 'grass_flat') n++;
    }
    if (n > most) {
      most = n;
      deck = y;
    }
  }
  const lands: Cell[] = rows.map((y) => [
    Math.min(
      ...[...span]
        .map(unkey)
        .filter((c) => c[1] === y)
        .map((c) => c[0])
    ) - 1,
    y,
  ]);
  const home = lands.find((l) => l[1] === deck) as Cell;

  /* Which of his bridge's cells SHOW the water: the ones he drew with open sea
     beside them. His foot tiles are solid and buried in the bank, and asking
     those for water too found no berth anywhere. */
  const wet: Cell[] = [];
  for (const k of span) {
    const [x, y] = unkey(k);
    let open = false;
    for (let dx = -1; dx <= 1 && !open; dx++) {
      for (let dy = -1; dy <= 1 && !open; dy++) {
        if (!hisLand.has(key(x + dx, y + dy))) open = true;
      }
    }
    if (open) wet.push([x, y]);
  }

  const clear = (off: Cell): boolean => {
    for (const k of unit) {
      const [x, y] = unkey(k);
      if (main.has(key(x + off[0], y + off[1]))) return false;
    }
    for (const k of unit) {
      if (span.has(k)) continue; // the islet floats clear
      const [x, y] = unkey(k);
      for (let ex = -2; ex <= 2; ex++) {
        for (let ey = -2; ey <= 2; ey++) {
          if (main.has(key(x + off[0] + ex, y + off[1] + ey))) return false;
        }
      }
    }
    return true;
  };

  /* AND THE STRAIT UNDER THE ARCH STAYS OPEN TO THE SEA. His bridge tiles draw
     the water you see through the arch, so those cells need open water beside
     them; berth the islet somewhere the bank and the two shores close the gap
     in and the pass seals it as a pocket, and the arch is then drawn over solid
     ground with a hole of sea in the middle of it. Measured as a flood from
     outside the whole map, on the land as it will finally stand. */
  const openWater = (off: Cell, quay: Set<string>): boolean => {
    const here = new Set<string>(main);
    for (const k of quay) here.add(k);
    for (const k of unit) {
      const [x, y] = unkey(k);
      here.add(key(x + off[0], y + off[1]));
    }
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const k of here) {
      const [x, y] = unkey(k);
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    const lo: Cell = [x0 - 2, y0 - 2];
    const hi: Cell = [x1 + 2, y1 + 2];
    const sea = new Set<string>([key(lo[0], lo[1])]);
    const edge: Cell[] = [lo];
    while (edge.length) {
      const [x, y] = edge.pop() as Cell;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        const k = key(nx, ny);
        if (nx < lo[0] || nx > hi[0] || ny < lo[1] || ny > hi[1]) continue;
        if (here.has(k) || sea.has(k)) continue;
        sea.add(k);
        edge.push([nx, ny]);
      }
    }
    for (const [wx, wy] of wet) {
      const cx = wx + off[0];
      const cy = wy + off[1];
      let beside = false;
      for (let dx = -1; dx <= 1 && !beside; dx++) {
        for (let dy = -1; dy <= 1 && !beside; dy++) {
          if (sea.has(key(cx + dx, cy + dy))) beside = true;
        }
      }
      if (!beside) return false;
    }
    return true;
  };

  /* A berth is scored on how much of the bridge's west end comes ashore — all
     three rows is how he drew it — and then on how little the islet has to
     travel. With his whole village standing, the berth he drew wins with
     nothing to beat and the offset is nothing at all. */
  const ranked: { rank: [number, number]; off: Cell }[] = [];
  for (const k of main) {
    const [ax, ay] = unkey(k);
    if (main.has(key(ax + 1, ay))) continue; // not an east-facing shore
    const off: Cell = [ax - home[0], ay - home[1]];
    let onShore = false;
    for (const sk of span) {
      const [x, y] = unkey(sk);
      if (main.has(key(x + off[0], y + off[1]))) {
        onShore = true;
        break;
      }
    }
    if (onShore) continue; // the deck would sit on the shore
    let ashore = 0;
    for (const l of lands) if (main.has(key(l[0] + off[0], l[1] + off[1]))) ashore++;
    if (!ashore) continue;
    ranked.push({ rank: [-ashore, off[0] * off[0] + off[1] * off[1]], off });
  }
  ranked.sort(
    (a, b) =>
      a.rank[0] - b.rank[0] || a.rank[1] - b.rank[1] || a.off[0] - b.off[0] || a.off[1] - b.off[1]
  );
  for (const { off } of ranked) {
    if (clear(off) && openWater(off, berth(index, main, off))) return off;
  }
  return [0, 0];
}

/**
 * Where the camp sits when none of the land he drew it beside is standing.
 *
 * Its joint is every side of a camp cell that met his land rather than the
 * sea: that is the side drawn to run on into a district, and it is the side
 * that has to come ashore. Every other side of it is his coast and should
 * stay facing water, so a berth is scored on how much of the joint lands,
 * less how much of the camp's own shore it presses against something, and
 * then on how little it travelled. It never lands on land, and never on or
 * beside the islet where he drew it, which it would otherwise carry off when
 * that sails.
 */
function pitch(index: Index, main: Set<string>, hisOwn: Set<string>): Cell {
  const camp = [...index.cellsOf(CAMP)].map(unkey);
  const own = index.cellsOf(CAMP);
  const sides: [number, number][] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  const joint: [Cell, [number, number]][] = [];
  const jointCells = new Set<string>();
  for (const [x, y] of camp) {
    for (const d of sides) {
      const k = key(x + d[0], y + d[1]);
      if (!own.has(k) && hisOwn.has(k)) {
        joint.push([[x, y], d]);
        jointCells.add(key(x, y));
      }
    }
  }
  const offs = new Set<string>();
  for (const m of main) {
    const [mx, my] = unkey(m);
    for (const [[x, y], [dx, dy]] of joint) offs.add(key(mx - x - dx, my - y - dy));
  }
  let best: Cell = [0, 0];
  let bestRank: [number, number] | null = null;
  for (const o of offs) {
    const [ox, oy] = unkey(o);
    let bad = false;
    let stray = 0;
    for (const [x, y] of camp) {
      const cx = x + ox;
      const cy = y + oy;
      if (main.has(key(cx, cy))) {
        bad = true;
        break;
      }
      for (let ex = -1; ex <= 1 && !bad; ex++) {
        for (let ey = -1; ey <= 1; ey++) {
          if (index.unit.has(key(cx + ex, cy + ey))) {
            bad = true;
            break;
          }
        }
      }
      if (bad) break;
      if (jointCells.has(key(x, y))) continue;
      let near = false;
      for (let ex = -1; ex <= 1 && !near; ex++) {
        for (let ey = -1; ey <= 1 && !near; ey++) {
          if (main.has(key(cx + ex, cy + ey))) near = true;
        }
      }
      if (near) stray++;
    }
    if (bad) continue;
    let ashore = 0;
    for (const [[x, y], [dx, dy]] of joint) if (main.has(key(x + ox + dx, y + oy + dy))) ashore++;
    const rank: [number, number] = [ashore - 3 * stray, -(ox * ox + oy * oy)];
    if (
      !bestRank ||
      rank[0] > bestRank[0] ||
      (rank[0] === bestRank[0] && rank[1] > bestRank[1])
    ) {
      bestRank = rank;
      best = [ox, oy];
    }
  }
  return best;
}

/**
 * The bank his bridge's west end needs and the shore has not got.
 *
 * Look at how he lands it: the bridge comes out of a WIDE piece of ground, with
 * land two cells above its top row and two below its bottom one, and a proper
 * face row under that. Its two west cap tiles are two thirds grass because they
 * are drawn to sit half buried in that bank. Land them on a two-cell tab and
 * they read as a green rectangle with two ruler-straight sides.
 *
 * So the bank is a headland: the water cells that are close to the foot of the
 * bridge AND close to the shore, which makes a rounded isthmus rather than a
 * shelf. They are asked for as NEW land, the one thing the shore pass may make.
 */
function berth(index: Index, main: Set<string>, off: Cell): Set<string> {
  const { span } = index;
  const spanCells = [...span].map(unkey);
  const rows = [...new Set(spanCells.map((c) => c[1]))].sort((a, b) => a - b);
  const westmost = Math.min(...spanCells.map((c) => c[0]));
  const foot = new Set<string>();
  const moved = new Set<string>();
  for (const [x, y] of spanCells) {
    moved.add(key(x + off[0], y + off[1]));
    if (x <= westmost + 1) foot.add(key(x + off[0], y + off[1]));
  }
  const footCells = [...foot].map(unkey);
  const near = (c: Cell, s: Set<string>, r: number): boolean => {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) if (s.has(key(c[0] + dx, c[1] + dy))) return true;
    }
    return false;
  };
  const out = new Set<string>();
  const fx0 = Math.min(...footCells.map((c) => c[0]));
  const fx1 = Math.max(...footCells.map((c) => c[0]));
  for (let x = fx0 - 4; x <= fx1; x++) {
    for (let y = rows[0] + off[1] - 2; y <= rows[rows.length - 1] + off[1] + 2; y++) {
      const k = key(x, y);
      if (main.has(k) || moved.has(k)) continue;
      if (near([x, y], foot, 2) && near([x, y], main, 3)) out.add(k);
    }
  }
  return out;
}

/**
 * Move every tile and object standing on `cells` by `off`, in place.
 *
 * A tile carries its cell and its world position; an object only a world
 * position, and `pos_px` is both of them at thirty-two to the unit.
 */
function shift(layout: Layout, cells: Set<string>, off: Cell): void {
  const [dx, dy] = off;
  if (!dx && !dy) return;
  for (const tile of layout.tiles) {
    if (!cells.has(key(tile.cell[0], tile.cell[1]))) continue;
    tile.cell = [tile.cell[0] + dx, tile.cell[1] + dy];
    tile.pos = [tile.pos[0] + dx, tile.pos[1] + dy, tile.pos[2]];
  }
  for (const object of layout.objects) {
    const [cx, cy] = cellOf(object);
    if (!cells.has(key(cx, cy))) continue;
    object.pos = [object.pos[0] + dx, object.pos[1] + dy, object.pos[2]];
    if (object.pos_px) object.pos_px = [object.pos[0] * 32, object.pos[1] * 32];
  }
}

/**
 * His layout with only these districts standing, the rest erased to sea and the
 * exposed coast dressed.
 */
function compose(world: VillageWorld, index: Index, present: Iterable<string>): Composed {
  const { spec, cellsOf, span, unit } = index;
  const on = index.connected(new Set([...present, ...COMMON]));
  for (const d of on) spec(d); // the same refusal his.py gives an unknown id

  const layout = structuredClone(world.base) as Layout;

  const home = index.campHome(on);
  const main = new Set<string>();
  for (const d of on) if (home || d !== CAMP) for (const k of cellsOf(d)) main.add(k);
  for (const k of unit) main.delete(k);

  /* Only what is standing, before anything moves: the object filter runs on
     INDEXES into his list, so nothing may be added or dropped before it. */
  const ownerOf = new Map<number, string>();
  for (const district of world.districts) {
    for (const i of district.objects) ownerOf.set(i, district.id);
  }
  const standing: VObject[] = [];
  layout.objects.forEach((o: VObject, i: number) => {
    const who = ownerOf.get(i);
    if (o.prefab === WATER) {
      standing.push(o);
      return;
    }
    if (!who || !on.has(who as DistrictId)) return;
    /* And each one carries whose it is from here on: the index it was found by
       does not survive the filter, and the renderer wants to group a district's
       buildings without carrying the partition too. */
    o.district = who;
    standing.push(o);
  });
  layout.objects = standing;

  /* His own land, in his own coordinates, for telling his shoreline from the
     cut. */
  const hisOwn = new Set<string>();
  for (const d of DISTRICTS) for (const k of cellsOf(d)) hisOwn.add(k);

  /* The camp sails first, when it has to, since the islet moors to whatever
     coast there is and the camp is part of that coast once it has landed. */
  const camp = cellsOf(CAMP);
  const camped: Cell = home ? [0, 0] : pitch(index, main, hisOwn);
  const campNow = new Set<string>();
  for (const k of camp) {
    const [x, y] = unkey(k);
    campNow.add(key(x + camped[0], y + camped[1]));
  }
  if (!home) {
    const gone = new Set([...campNow].filter((k) => !camp.has(k)));
    layout.tiles = layout.tiles.filter((t: VTile) => !gone.has(key(t.cell[0], t.cell[1])));
    layout.objects = layout.objects.filter((o: VObject) => {
      if (o.district === CAMP) return true;
      const [x, y] = cellOf(o);
      return !gone.has(key(x, y));
    });
    const [dx, dy] = camped;
    for (const tile of layout.tiles) {
      if (!camp.has(key(tile.cell[0], tile.cell[1]))) continue;
      tile.cell = [tile.cell[0] + dx, tile.cell[1] + dy];
      tile.pos = [tile.pos[0] + dx, tile.pos[1] + dy, tile.pos[2]];
    }
    for (const object of layout.objects) {
      if (object.district !== CAMP) continue;
      object.pos = [object.pos[0] + dx, object.pos[1] + dy, object.pos[2]];
      if (object.pos_px) object.pos_px = [object.pos[0] * 32, object.pos[1] * 32];
    }
    for (const k of campNow) main.add(k);
  }

  /* The islet sails to the shore that is actually there, and whatever of his
     was lying in the water it is sailing to is cleared out of the way first —
     otherwise the islet's tiles land on top of them and every one of those
     cells carries two. */
  const off: Cell = main.size ? moor(layout, world.atlas, index, main, hisOwn) : [0, 0];
  if (off[0] || off[1]) {
    const dest = new Set<string>();
    for (const k of unit) {
      const [x, y] = unkey(k);
      dest.add(key(x + off[0], y + off[1]));
    }
    const gone = new Set([...dest].filter((k) => !unit.has(k)));
    layout.tiles = layout.tiles.filter((t: VTile) => !gone.has(key(t.cell[0], t.cell[1])));
    layout.objects = layout.objects.filter((o: VObject) => {
      const [x, y] = cellOf(o);
      return !gone.has(key(x, y));
    });
    shift(layout, unit, off);
  }
  const quay = off[0] || off[1] ? berth(index, main, off) : new Set<string>();

  const land = new Set<string>(main);
  for (const k of quay) land.add(k);

  /* WHERE THE CAMP COMES ALONGSIDE, THE JOIN IS DRESSED AFRESH. Both sides of
     it are his drawing, but not drawn against each other: the coast it parks
     against still has his cliff and foam facing a sea that is now the camp,
     and the side of the camp that used to run on into the crop farm is bare
     meadow that now stops at the water. Left as they were the two show a
     line of sea between them and a square tab with no edge. So those cells
     are given back to the pass as ground to lay, and it dresses them the way
     the brush dresses any coast it makes. */
  const joint = new Set<string>();
  if (!home) {
    const sides: [number, number][] = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    /* Only where meadow meets meadow: the camp's cliff and the coast below it
       are his faces already, and asking the pass to lay ground beside a face
       grows a stray terrace in the water. */
    const meadow = new Set<string>();
    for (const t of layout.tiles as VTile[]) {
      if (t.file && /Grass|Dirt/.test(t.file)) meadow.add(key(t.cell[0], t.cell[1]));
    }
    for (const k of land) {
      if (campNow.has(k) || quay.has(k)) continue;
      const [x, y] = unkey(k);
      if (sides.some(([dx, dy]) => meadow.has(key(x + dx, y + dy)) && campNow.has(key(x + dx, y + dy))))
        joint.add(k);
    }
    for (const k of campNow) {
      const [x, y] = unkey(k);
      const [hx, hy] = [x - camped[0], y - camped[1]];
      for (const [dx, dy] of sides) {
        const was = key(hx + dx, hy + dy);
        if (camp.has(was) || !hisOwn.has(was)) continue;
        if (!land.has(key(x + dx, y + dy))) joint.add(k);
      }
    }
    const ground = new Set(['Layer 01', 'Layer 02', 'Layer 03', 'Layer 04']);
    layout.tiles = layout.tiles.filter(
      (t: VTile) => !(ground.has(t.layer) && joint.has(key(t.cell[0], t.cell[1])))
    );
  }
  for (const k of unit) {
    const [x, y] = unkey(k);
    land.add(key(x + off[0], y + off[1]));
  }

  /* His own shoreline is already his shape and never moves; only the line
     between a district that is on and one that is off is the wobble's. The
     islet's own coast travels with it, so it counts as his wherever it is. */
  const hisLand = new Set<string>();
  for (const k of hisOwn) if (!unit.has(k) && (home || !camp.has(k))) hisLand.add(k);
  if (!home) for (const k of campNow) hisLand.add(k);
  for (const k of unit) {
    const [x, y] = unkey(k);
    hisLand.add(key(x + off[0], y + off[1]));
  }
  const keep = new Set<string>();
  for (const k of land) {
    const [x, y] = unkey(k);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      if (!hisLand.has(key(x + dx, y + dy))) {
        keep.add(k);
        break;
      }
    }
  }
  const wobbled = wobble(layout, world.atlas, land, keep);

  const movedSpan = new Set<string>();
  const movedUnit = new Set<string>();
  for (const k of unit) {
    const [x, y] = unkey(k);
    const moved = key(x + off[0], y + off[1]);
    movedUnit.add(moved);
    if (span.has(k)) movedSpan.add(moved);
  }

  /* The only ground it may make is the bridge's bank; and the islet brings its
     own sea with it — every cell round it that was water in his map stays water
     here, or the finish puts the crop field it is berthed over back and the
     arch is drawn on solid ground. */
  const wet: Cell[] = [];
  if (off[0] || off[1]) {
    const round = new Set<string>();
    for (const k of movedSpan) {
      const [x, y] = unkey(k);
      for (let dx = -2; dx <= 2; dx++)
        for (let dy = -2; dy <= 2; dy++) round.add(key(x + dx, y + dy));
    }
    for (const k of [...round].sort()) {
      const [x, y] = unkey(k);
      if (wobbled.land.has(k) || quay.has(k)) continue;
      if (!hisOwn.has(key(x - off[0], y - off[1]))) wet.push([x, y]);
    }
  }

  /* `rawShape`: take his outline exactly. `noRing`: his partition already gives
     every district its own shore stone, so the pass must not reach across the
     cut for the neighbour's.

     `redress 'none'`: AND THE COAST IS SOLVED AS A CHAIN, NOT RE-PICKED PER
     CELL. The finish already runs the pass that asks which piece the artist
     ever stood BESIDE the piece next to it; redressing then went over the top
     of it one cell at a time with an argmax that never ties, so every cell with
     the same signature got the same answer and a straight run came out as one
     sprite stamped fourteen times, against his longest four. */
  /* His tiles as they stand going in, because the pass writes over them. The
     islet comes back off this rather than off his file: the cells it sailed
     onto still carry whatever of his was lying there in the original, and
     restoring from that would put a crop field back under the bridge. */
  const going = structuredClone(layout.tiles) as VTile[];

  const shore = shorePass(layout, {
    land: [...wobbled.land].map(unkey),
    newLand: [...quay, ...joint].map(unkey),
    wet,
    atlas: world.atlas,
    redressMode: 'none',
    rawShape: true,
    noRing: true,
  });

  /* THE ISLET AND ITS BRIDGE ARE ONE DRAWN THING and they moved as one, so they
     come back exactly as he laid them.

     His bridge always: it is ONE object drawn across twenty-two cells, and to
     the pass a deck is not land, so the final prune called the middle of the
     span stray stone and took it.

     The islet, cell by cell, wherever its NEIGHBOURHOOD did not move. A piece is
     chosen against the eight cells round it; where those eight are land and sea
     exactly as they were in his map the cell has no question to answer and
     re-picking it can only lose his answer. Where they did move — the few cells
     his bridge's landing now meets a different shore at — the dresser's answer
     is the right one, and restoring his there put six cells of his own art
     against a neighbour that had changed and left them showing the sea
     through. */
  const back = new Set<string>(movedSpan);
  for (const k of movedUnit) {
    if (movedSpan.has(k)) continue;
    const [x, y] = unkey(k);
    const wx = x - off[0];
    const wy = y - off[1];
    let same = true;
    for (let dx = -1; dx <= 1 && same; dx++) {
      for (let dy = -1; dy <= 1 && same; dy++) {
        if (hisOwn.has(key(wx + dx, wy + dy)) !== wobbled.land.has(key(x + dx, y + dy)))
          same = false;
      }
    }
    if (same) back.add(k);
  }
  const kept = going.filter((t: VTile) => back.has(key(t.cell[0], t.cell[1])));
  layout.tiles = layout.tiles.filter((t: VTile) => !back.has(key(t.cell[0], t.cell[1])));
  layout.tiles.push(...kept);

  return {
    layout,
    on: [...on].sort(byHisOrder),
    moored: off,
    camped,
    shore: { ...shore, wobbled: wobbled.moved, his_kept: back.size },
    asked: [...wobbled.land].map(unkey),
  };
}
