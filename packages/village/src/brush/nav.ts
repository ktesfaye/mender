/* Where everything is, and how to walk to it.

   THE MAP HAS TO BE LEGIBLE TO SOMETHING THAT IS NOT LOOKING AT IT. Agents live
   in this village as NPCs: they have to know which settlement is which, where
   its buildings stand, and how to get from one to another on foot without
   walking through a wall, off a headland, or across open water. None of that is
   recoverable from a layout after the fact -- a layout is 14,000 tiles and 2,300
   sprites with no notion of a place or a route in it -- so it is worked out here,
   while the composer still knows which cells belong to whom, and written into
   the document as `nav`.

   THREE THINGS, AND THEY ARE NOT THE SAME THING:

     walkable   every cell an NPC may stand on. Ground, at any height, with
                nothing solid on it.
     roads      the worked ground -- the artist's yards and trails plus the
                routes cut between settlements. A hint about where to walk,
                never a constraint: the village is walkable off the road too.
     routes     the actual cell-by-cell path laid between one settlement and
                the next, so a mover has something to follow without pathing
                the whole map.

   A ROAD IS NOT A ROUTE AND CONFLATING THEM IS THE TRAP. A path in this tileset
   is a hole cut in the grass, and a hole can only be cut in sea-level meadow --
   on a terrace there is no dirt beneath and cutting one opens a hole to the
   water. So a route that has to climb crosses ground no road can be drawn on.
   Refusing those routes leaves settlements unreachable; drawing them anyway
   punches holes in the map. Both were tried. What is true is that the route
   exists and the road does not, and saying so is the whole fix: the walk is
   planned over `walkable`, and the cut is applied to whichever of its cells can
   take one. */

import type { Document, VObject } from '../doc/document';
import type { Ground } from './terrainBrush';

const PPU = 32;
const RING4: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const key = (x: number, y: number) => x + ',' + y;
const unkey = (k: string): [number, number] => {
  const c = k.indexOf(',');
  return [Number(k.slice(0, c)), Number(k.slice(c + 1))];
};

/** A settlement as the router sees it. */
export interface Place {
  id: string;
  name: string;
  kind: string;
  /** The cells it holds, already at their composed position. */
  cells: Set<string>;
}

export interface Route {
  from: string;
  to: string;
  cells: [number, number][];
}

/* ── WHAT STANDS IN THE WAY ────────────────────────────────────────────────

   A BUILDING IS ITS WHOLE SPRITE, not the cell under its pivot. The pivot is
   the ground-contact point at the bottom-centre, so a house occupies the cells
   ABOVE it -- ten of them for `House 03` -- and blocking one cell leaves an NPC
   free to stroll through the wall and out of the roof. Seen from directly above,
   which is the camera this game has, the roof IS the building.

   Plants are not obstacles and that is deliberate. A canopy is drawn many cells
   tall and its trunk touches the ground at one; treating the sprite as solid
   would wall off every wood on the map. A path through scrub is a path.

   Shadows are excluded -- a shadow is cast ON the ground, not standing on it.
   They are the multiply-blended children of the very sprites already counted,
   so including them would block a second copy of every building, offset.

   A GATE IS A WAY THROUGH. The three `Fence Gate`, two `Gate 01` and two
   `Wall 01 H Gate` in the demo are the openings its fences were built with, and
   counting them as barriers seals every yard they stand in -- which is not a
   subtlety, it is the difference between a village of ten places and a village
   of thirty-four pens. An NPC opens a gate.

   AND A CELL IS ONLY BLOCKED IF THE SPRITE REALLY COVERS IT. Rounding the box
   outward blocks a cell a sprite touches by a pixel, and the fence rails are
   exactly that shape: `Fence 01 H X1` is 40px wide on a 32px grid, so every
   segment of every run spilled into the column beside it and a fence came out
   two cells thick. Runs that the artist drew with gaps in them closed up, and
   yards that are open on one side became sealed. Half the cell is the test --
   except for decking, below, where the opposite mistake is the expensive one. */

/** The cells one object's body really covers, at the given share of a cell.

    HALF THE CELL MEANS HALF ITS AREA, and it used to mean half of each side --
    which is a quarter of the cell, and blocks a ring of cells no sprite really
    fills. `critic.py` measures the same thing as an area (`ox * oy >= 0.5`) and
    records what the looser reading cost it: 68 findings against the ones really
    in the way. Two readings of one rule is the drift this project keeps paying
    for, and here it cost a yard: the router would not pass between two fence
    posts the critic walked straight through, so four cells of road behind them
    came out as worked ground nobody could reach. */
function cover(o: VObject, into: Set<string>, COVER = 0.5) {
  for (const s of o.sprites) {
    if (!s.file || s.active === false || s.blend === 'multiply') continue;
    const w = s.size_px[0] / PPU,
      h = s.size_px[1] / PPU;
    const x0 = o.pos[0] + s.offset[0] - s.pivot[0] * w;
    const y0 = o.pos[1] + s.offset[1] - s.pivot[1] * h;
    for (let cx = Math.floor(x0); cx < Math.ceil(x0 + w); cx++) {
      const ox = Math.min(cx + 1, x0 + w) - Math.max(cx, x0);
      if (ox <= 0) continue;
      for (let cy = Math.floor(y0); cy < Math.ceil(y0 + h); cy++) {
        const oy = Math.min(cy + 1, y0 + h) - Math.max(cy, y0);
        if (oy > 0 && ox * oy >= COVER) into.add(key(cx, cy));
      }
    }
  }
}

/** Doors, gateways and decking: the parts of the built village you walk THROUGH
    or ON rather than round.

    A dock is a floor. It is filed under `Building` because it is a structure,
    and taking that at face value blocks the one thing on the map whose entire
    purpose is to be stood on -- the port's own quay came out as a wall with its
    warehouse behind it. Same for a gate, which is a hole in a fence with a door
    hung in it.

    AND `Door` IS ON THE LIST, which it was not. The artist's garden gateway is
    named `Fence 02 Door`: it matched `Fence`, missed this exclusion, and came
    out as a wall across its own doorway. One yard of his -- ten cells of worked
    ground at -22,-19 -- was sealed by it into a 30-cell island of walkable
    ground that no route could reach, which is exactly what the critic's P3
    reports as a road leading nowhere.

    `atlas.py`'s `obstructs` is the same rule and had this same bug, recorded
    there in the same words; it was fixed on that side months before this one.
    TWO IMPLEMENTATIONS OF ONE RULE IS THE DRIFT ITSELF, and the only reason
    this copy survives is that the composer runs in the browser and the atlas is
    Python. They are kept letter for letter, and `npm run rubric` is what fails
    if they part company. */
const WALK_THROUGH = /Gate|Door|Dock|Bridge|Pier|Stair/i;

export function solidCells(objects: VObject[]): Set<string> {
  const out = new Set<string>();
  for (const o of objects) {
    if (WALK_THROUGH.test(o.prefab)) continue;
    if (o.group !== 'Building' && !/Fence|Wall/i.test(o.prefab)) continue;
    cover(o, out);
  }
  return out;
}

/* A DOCK IS NOT A FLOOR, AND THIS IS WHERE THAT WAS LEARNT.

   There was a `deckCells` here that made every cell of a dock, bridge or pier
   sprite standable on the reasoning that a quay exists to be stood on. It is
   the wrong reasoning, because a sprite is not a plan view: `Dock 01 S` is
   70x143px -- two cells wide and four and a half TALL -- and most of that height
   is the side of the jetty drawn above the waterline, not deck you could put a
   foot on. Marking the box walkable put six cells of open water on the map as
   good ground, and villagers duly walked out and stood in the lake.

   Nothing distinguishes deck from elevation inside the sprite, so there is no
   version of this rule that is safe. What is safe is the tiles: a villager may
   stand where the terrain says there is ground and nowhere else. The cost is
   that nobody walks out along a pier, which is a feature not had rather than a
   feature lost -- and `nav.piece` already reports a dock's doorstep as being on
   its own side of the water, so a mover still knows.

   Docks are still not SOLID -- they are transparent to the walk, so a villager
   crosses the cell under a quay if the ground there is real. */

/** Ground an NPC may stand on: a surface at any height with nothing solid on it.

    A CLIFF EDGE COUNTS IF IT IS THE TOP OF THE CLIFF. `isRim` is one answer for
    two different things -- the flat grass along the lip, which is a field, and
    the rock face below it, which is a wall -- and refusing both walls every
    terrace off from the next. The artist's own village falls into 23 pieces
    under that rule with barely half its ground in the largest, which reads as a
    map that cannot be crossed and is really a model that cannot tell a hilltop
    from a hillside. See `FLAT_RIM` in terrain.ts. */
export function walkableAt(ground: Ground, solid: Set<string>) {
  return (x: number, y: number) =>
    !solid.has(key(x, y)) &&
    ground.hasGround(x, y) &&
    (!ground.isRim(x, y) || ground.isFlatRim(x, y));
}

/** What a cell IS, in the words the picture uses. The villagers log it as they
    walk, which is the only way to find out that "walkable" and "ground" had come
    apart -- a check that compares a walker against the same set that placed it
    agrees with itself forever. */
export type Surface = 'road' | 'grass' | 'terrace' | 'dirt' | 'cliff' | 'water';

export function surfaceAt(ground: Ground) {
  return (x: number, y: number): Surface => {
    if (!ground.hasGround(x, y)) return ground.isRim(x, y) ? 'cliff' : 'water';
    if (ground.isRim(x, y)) return ground.isFlatRim(x, y) ? 'terrace' : 'cliff';
    if (ground.isTrodden(x, y)) return 'road';
    if (ground.isGrass(x, y)) return 'grass';
    return ground.isLand(x, y) ? 'dirt' : 'water';
  };
}

/** Every connected piece of walkable ground, biggest first, as a lookup from
    cell to piece number.

    THE VILLAGE IS NOT ONE ROOM. Fences make yards, walls make courtyards, and a
    building with its back to a cliff makes a pocket -- all of them perfectly
    good map and none of them somewhere a route may start. Anchoring a
    settlement at "the walkable cell nearest its middle" put five of ten inside
    an enclosure, and a route out of a sealed yard cannot be found however good
    the router is, so five settlements came back unreachable and the village came
    apart into thirty-four pieces. Which piece a cell is in is the thing the
    router needs to know first. */
export function components(
  walk: (x: number, y: number) => boolean,
  box: [number, number, number, number]
) {
  const [x0, y0, x1, y1] = box;
  const at = new Map<string, number>();
  const parts: string[][] = [];
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      const k = key(x, y);
      if (at.has(k) || !walk(x, y)) continue;
      const part: string[] = [];
      const st: [number, number][] = [[x, y]];
      at.set(k, parts.length);
      while (st.length) {
        const [cx, cy] = st.pop()!;
        part.push(key(cx, cy));
        for (const [dx, dy] of RING4) {
          const nk = key(cx + dx, cy + dy);
          if (at.has(nk) || !walk(cx + dx, cy + dy)) continue;
          at.set(nk, parts.length);
          st.push([cx + dx, cy + dy]);
        }
      }
      parts.push(part);
    }
  }
  const order = parts.map((p, i) => [i, p.length] as [number, number]).sort((a, b) => b[1] - a[1]);
  const rank = new Map(order.map(([i], r) => [i, r]));
  const ranked = new Map<string, number>();
  for (const [k, i] of at) ranked.set(k, rank.get(i)!);
  return { at: ranked, sizes: order.map(([, n]) => n) };
}

/* ── THE WALK ──────────────────────────────────────────────────────────────

   A* with a Manhattan heuristic, which is admissible on a 4-connected grid, so
   the first route found is the shortest one. Best-first alone -- which is what
   this was -- is not: it returns a path, and the path it returns wanders,
   because nothing ever weighs how far it has already come. That is visible as a
   road: the artist's roads run, and a greedy one meanders around every bush it
   met on the way.

   WORKED GROUND IS CHEAPER THAN MEADOW, so a route joins the roads that already
   exist instead of laying a second one beside them. Weight 1 against 3 -- enough
   that a road three cells out of the way is still worth taking, not so much that
   a route crosses the map to find one. */
export function router(
  walk: (x: number, y: number) => boolean,
  trodden: (x: number, y: number) => boolean
) {
  return (from: [number, number], to: [number, number], limit = 200_000): [number, number][] => {
    if (!walk(from[0], from[1]) || !walk(to[0], to[1])) return [];
    const cameFrom = new Map<string, string>();
    const g = new Map<string, number>();
    const start = key(from[0], from[1]),
      goal = key(to[0], to[1]);
    g.set(start, 0);
    cameFrom.set(start, '');
    /* A bucketed queue rather than a heap: costs here are small integers, the
       map is a few thousand cells, and a binary heap is a page of code to save
       nothing measurable. */
    const open: string[][] = [];
    const push = (k: string, f: number) => {
      (open[f] ??= []).push(k);
    };
    push(start, Math.abs(from[0] - to[0]) + Math.abs(from[1] - to[1]));
    let steps = 0;
    for (let f = 0; f < open.length && steps < limit; f++) {
      const bucket = open[f];
      if (!bucket) continue;
      while (bucket.length) {
        const k = bucket.pop()!;
        const [x, y] = unkey(k);
        const cost = g.get(k)!;
        if (cost + Math.abs(x - to[0]) + Math.abs(y - to[1]) < f) continue; // stale
        if (k === goal) {
          const path: [number, number][] = [];
          let cur = k;
          while (cur) {
            path.push(unkey(cur));
            cur = cameFrom.get(cur) ?? '';
          }
          return path.reverse();
        }
        for (const [dx, dy] of RING4) {
          const nx = x + dx,
            ny = y + dy;
          if (!walk(nx, ny)) continue;
          const nk = key(nx, ny);
          const step = trodden(nx, ny) ? 1 : 3;
          const nc = cost + step;
          if ((g.get(nk) ?? Infinity) <= nc) continue;
          g.set(nk, nc);
          cameFrom.set(nk, k);
          push(nk, nc + Math.abs(nx - to[0]) + Math.abs(ny - to[1]));
          steps++;
        }
      }
    }
    return [];
  };
}

/* ── JOINING EVERY SETTLEMENT TO EVERY OTHER ───────────────────────────────

   A MINIMUM SPANNING TREE OVER ROUTES THAT ACTUALLY EXIST, grown one settlement
   at a time from whichever is already connected. Not "each settlement to its
   nearest neighbour", which is what this was: that is a nearest-neighbour graph,
   it is not connected in general, and it fails in exactly the case that matters
   -- two clusters whose members are each nearer to each other than to anything
   in the other cluster get two separate road networks and no link between them.

   And the length is the ROUTE's, not the straight line's. Two settlements a
   dozen cells apart across a bay are neighbours by ruler and a long walk on
   foot, so a tree built on distance connects the wrong pairs and lays its roads
   round the long way. */
export function joinAll(
  places: Place[],
  anchor: Map<string, [number, number]>,
  route: (a: [number, number], b: [number, number]) => [number, number][]
) {
  const ids = places.map((p) => p.id).filter((id) => anchor.has(id));
  const routes: Route[] = [];
  if (ids.length < 2) return { routes, unreachable: [] as string[] };

  const inTree = new Set<string>([ids[0]]);
  const rest = new Set(ids.slice(1));
  const unreachable: string[] = [];
  /* Memoised, because a settlement that loses a round is asked again next round
     and the answer cannot have changed -- the tree only ever grows. */
  const cache = new Map<string, [number, number][]>();
  const between = (a: string, b: string) => {
    const kk = a < b ? a + '>' + b : b + '>' + a;
    let r = cache.get(kk);
    if (!r) {
      r = route(anchor.get(a)!, anchor.get(b)!);
      cache.set(kk, r);
    }
    return r;
  };

  while (rest.size) {
    let best: { from: string; to: string; cells: [number, number][] } | null = null;
    for (const b of rest) {
      for (const a of inTree) {
        const cells = between(a, b);
        if (!cells.length) continue;
        if (!best || cells.length < best.cells.length) best = { from: a, to: b, cells };
      }
    }
    if (!best) {
      /* Nothing left can be walked to. Recorded rather than silently dropped:
         an island with no bridge is a legitimate map and a settlement stranded
         by a composition bug is not, and only the caller can tell them apart. */
      for (const b of rest) unreachable.push(b);
      break;
    }
    routes.push(best);
    inTree.add(best.to);
    rest.delete(best.to);
  }
  return { routes, unreachable };
}

/** Run-length rows, the shape `settlements.json` already uses: `[y, x0, x1]`. */
export function runs(cells: Iterable<string>): [number, number, number][] {
  const by = new Map<number, number[]>();
  for (const k of cells) {
    const [x, y] = unkey(k);
    const row = by.get(y);
    if (row) row.push(x);
    else by.set(y, [x]);
  }
  const out: [number, number, number][] = [];
  for (const y of [...by.keys()].sort((a, b) => a - b)) {
    const xs = by.get(y)!.sort((a, b) => a - b);
    let s = xs[0],
      p = xs[0];
    for (const x of xs.slice(1)) {
      if (x === p + 1) {
        p = x;
        continue;
      }
      out.push([y, s, p]);
      s = p = x;
    }
    out.push([y, s, p]);
  }
  return out;
}

export interface NavBuilding {
  prefab: string;
  pos: [number, number];
  /** The cell to walk to in order to arrive at it: the nearest standable cell
      to the building's own ground-contact point. */
  door: [number, number] | null;
  /** Which connected piece of walkable ground that doorstep is on. 0 is the
      village proper; anything else is behind a fence, on a dock, or over the
      water, and a mover should not set off expecting to arrive. */
  piece: number | null;
}

export interface Nav {
  $comment: string;
  cell_units: number;
  settlements: {
    id: string;
    name: string;
    kind: string;
    centre: [number, number];
    gate: [number, number] | null;
    /** The walkable piece its gate stands on. 0 is the village proper; anything
        else is a place you cannot walk to, which on this map means across the
        water. Written rather than inferred, because "unreachable" and "across a
        strait" are the same fact and only one of them is a bug. */
    piece: number | null;
    cells: [number, number, number][];
    buildings: NavBuilding[];
  }[];
  /** How many connected pieces the walkable ground falls into, biggest first. */
  pieces: number[];
  walkable: [number, number, number][];
  roads: [number, number, number][];
  routes: { from: string; to: string; cells: [number, number][] }[];
  unreachable: string[];
}

/** Everything an NPC needs, measured off the finished map rather than off what
    each pass intended -- the roads run last and the seal after them, so the map
    an agent walks is the one this reads. */
export function describe(
  doc: Document,
  ground: Ground,
  places: Place[],
  anchor: Map<string, [number, number]>,
  routes: Route[],
  unreachable: string[]
): Nav {
  const solid = solidCells(doc.layout.objects);
  const walk = walkableAt(ground, solid);

  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const t of doc.layout.tiles) {
    if (!t.file) continue;
    x0 = Math.min(x0, t.cell[0]);
    x1 = Math.max(x1, t.cell[0]);
    y0 = Math.min(y0, t.cell[1]);
    y1 = Math.max(y1, t.cell[1]);
  }
  const walkable = new Set<string>(),
    roads = new Set<string>();
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      if (!walk(x, y)) continue;
      walkable.add(key(x, y));
      if (ground.isTrodden(x, y)) roads.add(key(x, y));
    }
  }
  const parts = components(walk, [x0, y0, x1, y1]);

  /* WHICH SETTLEMENT A BUILDING BELONGS TO IS DECIDED BY THE CELL IT STANDS ON,
     and by nothing cleverer. Its pivot is its ground contact, the composer has
     already moved both the building and the ground it stands on by the same
     offset, so the cell under a building is its settlement's cell or nobody's.
     Nobody's means a dock over the water, and a dock belongs to whoever owns the
     shore behind it -- so the search widens by a ring at a time rather than
     guessing. */
  const owner = new Map<string, string>();
  for (const p of places) for (const k of p.cells) owner.set(k, p.id);
  const ownerNear = (x: number, y: number) => {
    for (let r = 0; r <= 4; r++) {
      let best: string | undefined,
        bestD = Infinity;
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const id = owner.get(key(x + dx, y + dy));
          if (!id) continue;
          const d = dx * dx + dy * dy;
          if (d < bestD) {
            bestD = d;
            best = id;
          }
        }
      }
      if (best) return best;
    }
    return undefined;
  };

  /** @param home the walkable piece this building's own settlement is on.

      A DOORSTEP HAS TO BE SOMEWHERE YOU CAN GET TO. The nearest standable cell
      is the obvious answer and it is wrong at exactly the buildings that most
      need one: the east dock's nearest is a cell of open quay on the far side of
      the water, three cells away and on a different piece of map, so an NPC
      told to go there sets off for a place with no way in. Nearness comes
      second; being on the same network as the rest of the settlement comes
      first. */
  const doorOf = (x: number, y: number, home?: number): [number, number] | null => {
    const on = (dx: number, dy: number) => {
      if (!walk(x + dx, y + dy)) return false;
      if (home === undefined) return true;
      return parts.at.get(key(x + dx, y + dy)) === home;
    };
    for (const pass of home === undefined ? [true] : [true, false]) {
      const ok = pass ? on : (dx: number, dy: number) => walk(x + dx, y + dy);
      /* Straight down first. A prefab's pivot is its bottom-centre, so the cell
         below it is the doorstep on every building the artist drew that has a
         door at all -- and preferring it keeps NPCs arriving at the front rather
         than materialising round the back because the search happened to sweep
         west. */
      for (const [dx, dy] of [
        [0, -1],
        [0, 0],
        [-1, -1],
        [1, -1],
        [-1, 0],
        [1, 0],
        [0, 1],
      ]) {
        if (ok(dx, dy)) return [x + dx, y + dy];
      }
      for (let r = 2; r <= 6; r++) {
        for (let dx = -r; dx <= r; dx++) {
          for (let dy = -r; dy <= r; dy++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
            if (ok(dx, dy)) return [x + dx, y + dy];
          }
        }
      }
    }
    return null;
  };

  const byPlace = new Map<string, NavBuilding[]>();
  for (const o of doc.layout.objects) {
    if (o.group !== 'Building') continue;
    const cx = Math.floor(o.pos[0]),
      cy = Math.floor(o.pos[1]);
    const id = ownerNear(cx, cy);
    if (!id) continue;
    const arr = byPlace.get(id) ?? [];
    const gate = anchor.get(id);
    const door = doorOf(cx, cy, gate ? parts.at.get(key(gate[0], gate[1])) : undefined);
    arr.push({
      prefab: o.prefab,
      pos: [o.pos[0], o.pos[1]],
      door,
      piece: door ? (parts.at.get(key(door[0], door[1])) ?? null) : null,
    });
    byPlace.set(id, arr);
  }

  return {
    $comment: 'where the places are and how to walk between them -- see nav.ts',
    cell_units: 1,
    settlements: places.map((p) => {
      const cs = [...p.cells].map(unkey);
      const n = cs.length || 1;
      return {
        id: p.id,
        name: p.name,
        kind: p.kind,
        centre: [
          Math.round(cs.reduce((a, c) => a + c[0], 0) / n),
          Math.round(cs.reduce((a, c) => a + c[1], 0) / n),
        ] as [number, number],
        gate: anchor.get(p.id) ?? null,
        piece: anchor.has(p.id)
          ? (parts.at.get(key(anchor.get(p.id)![0], anchor.get(p.id)![1])) ?? null)
          : null,
        cells: runs(p.cells),
        buildings: byPlace.get(p.id) ?? [],
      };
    }),
    pieces: parts.sizes,
    walkable: runs(walkable),
    roads: runs(roads),
    routes: routes.map((r) => ({ from: r.from, to: r.to, cells: r.cells })),
    unreachable,
  };
}
