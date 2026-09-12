/* The terrain and path brushes.

   WORKED GROUND IS SUBTRACTIVE. Dirt is a full field underneath (sorting order
   -8) and grass is painted on top (-7), so a road, a yard or a tilled plot is a
   HOLE CUT IN THE GRASS, never dirt drawn over it. That is what gives the demo
   its ragged organic edges -- the grass tileset's own fringe tiles overhang the
   dirt beneath. Painting dirt on top instead produces a 32px staircase at every
   boundary, which is the clearest single sign a scene was generated rather than
   placed. So the path brush ERASES grass and the meadow brush restores it.

   A cell's sprite is a function of its neighbours, so cells cannot be committed
   one at a time. Every stroke therefore runs the same three steps:

     1. compute the TARGET cell sets (land, grass) after the stroke
     2. re-resolve every touched cell and the one-cell ring around it, against
        those target sets -- never against the half-applied document
     3. diff the result against the tiles on disk and emit ONE edit

   Doing it against a half-applied document is the bug that produces a seam
   along the edge of every stroke, because the fringe resolves against a shape
   that never existed. */

import { legaliseOutline, snapToTread, TREAD } from './compose';
import { around, dressCoast, fillIn } from './weave';

/** How far past its own cells a stroke's outline reaches. The stroke's cells
    are the LAND it laid; the coast it caused sits a ring or two beyond them and
    is exactly what the snap has to answer for. Built from `touched` alone the
    scope missed 1,960 rim cells and the pass moved 55 tiles instead of 400. */
const RIM_REACH = 3;

import type { Document, VTile } from '../doc/document';
import {
  cellHash,
  covers,
  faceSprite,
  grassCovers,
  grassSprite,
  interiorFill,
  lipSprite,
  rng,
  standable,
  type Has,
} from '../scene/terrain';
import { mendGrass } from './meadow';
import type { Atlas } from './redress';
import { legaliseCut } from './wear';

const DIRT_LAYER = 'Dirt';
const DIRT_ORDER = -8;

/* THE VILLAGE IS TERRACED, AND EVERY TERRACE IS BUILT THE SAME WAY.

   Layer 01 is not the surface; it is the LOWEST surface. 3,659 of the demo's
   6,110 grass tiles sit on Layer 02, 03 or 04 -- the raised ground -- and each
   of those layers carries exactly what Layer 01 carries: meadow from
   `terrain-grass/` and cliff edges from `terrain-tiles/`.

   Treating Layer 01 as the only surface is what made the path, meadow, clear
   and vegetation brushes look broken on high ground. They were not refusing --
   they were writing meadow onto Layer 01, underneath a plateau, where it is
   invisible. The cursor went green, the stroke recorded an edit, and nothing
   changed on screen.

   Worked ground needs no layer of its own: a road on a plateau is bare Dirt
   with the grass gone from whatever terrace carried it, which is byte for byte
   how a road at sea level is stored. 416 of the artist's 824 bare-dirt cells
   sit against raised grass, so this is his own construction, not an
   extrapolation of it. */
const SURFACES = [
  { layer: 'Layer 01', order: -7 },
  { layer: 'Layer 02', order: -5 },
  { layer: 'Layer 03', order: -3 },
  { layer: 'Layer 04', order: -1 },
];
/* Tiles sit at z=10 so the shadow tilemaps (z=0) interleave correctly between
   terrain layers. Depth is y+z, so getting this wrong does not look broken --
   it quietly sorts the terrain shadows out of their layers. */
const TILE_Z = 10;

const key = (x: number, y: number) => x + ',' + y;

/* The variant a cell resolves to is a function of WHERE THE CELL IS, never of
   when it was drawn.

   With a sequential RNG, re-resolving a cell whose shape had not changed still
   handed it a different tile from the pool, so every stroke visibly reshuffled
   the fringe of everything near it -- the reported "it overrides the previous
   paths". A per-cell hash makes re-resolution idempotent: same shape, same
   tile, no change recorded, nothing to see. */
const variantOf = (x: number, y: number) => cellHash(x, y) / 0x7fffffff;

/** The 8-neighbour signature a cell resolves against, as a byte. */
function signature(filled: Has, x: number, y: number) {
  let s = 0,
    bit = 1;
  for (let dy = 1; dy >= -1; dy--) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (filled(x + dx, y + dy)) s |= bit;
      bit <<= 1;
    }
  }
  return s;
}
const unkey = (k: string) => k.split(',').map(Number) as [number, number];

const RING4: [number, number][] = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
];
/** The eight, for the coast. A boundary drawn on four neighbours turns every
    corner as a right angle, because the cell that touches land only at the
    diagonal is never asked. */
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

/** How much of the outward ring a stroke takes in -- see `roughen`.

    Measured against two things at once. Below this the shore straightens out;
    above it the run-length distribution stops improving (0.25, 0.35 and 0.5 all
    give the artist's median of 2-3) while the wider cut orphans more of his
    hand-placed cliffs: 4 extra per wide drag at 0.35, 7 at 0.5. */
const ROUGH = 0.35;

/** Plain dirt only, weighted as the demo weights it. Ids 16 and up carry
    cobbles and pebbles; the artist places those by hand and never scatters
    them, so a brush that reaches for one announces itself immediately. */
const PLAIN_DIRT = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
];

export type Cells = Iterable<[number, number]>;

export class Ground {
  private dirtTi = new Map<string, number>();
  /* ONE index per surface layer, not one per kind. Measured on the demo: its
     coast-rim tiles and its grass tiles share a layer and never once share a
     cell. A surface cell is therefore grass OR rim, never both, and indexing
     only the grass ones makes every rim cell invisible to the brush -- which is
     how a stroke ends up writing meadow over a cliff edge. */
  private surfTi = SURFACES.map(() => new Map<string, number>());
  /* A tile record is only reusable if it is actually a 32px terrain slot.

     29 placements in the demo are BLANK SPACERS: `file: null` with
     `size_px: [1024, 1024]`, referencing sprites the kit ships without because
     they are genuinely empty. The brush writes a new file into whatever record
     it finds at a cell, so writing a coast tile into one of those draws it at
     1024x1024 -- a single slab covering 32x32 cells, in 29 places scattered
     across the map, each one a hard-edged block over whatever was there. They
     are indexed out here instead, and the brush appends a fresh 32px tile at
     those cells. */
  private static reusable(t: VTile) {
    return t.size_px[0] === 32 && t.size_px[1] === 32;
  }
  /** The live cell model, the thing the brushes actually reason about. */
  land = new Set<string>();
  /** Meadow, on whatever terrace carries it. */
  grass = new Set<string>();
  /** Which terrace that meadow is on, 1-based. The highest, where a cell has
      two -- 427 do, and the one that matters is the one you can see. */
  grassLv = new Map<string, number>();
  /** A cliff edge, on whatever terrace carries it. */
  rim = new Set<string>();
  /** The cliff edges that are FLAT GRASS -- the top of a terrace rather than
      the face of one. Somewhere you could stand. See `FLAT_RIM`. */
  flat = new Set<string>();
  /** Meadow drawn with a SHAPED tile, so the dirt beneath shows through. See
      `isTrodden`. */
  thin = new Set<string>();
  /* PLATEAU TOPS ARE GROUND, AND 1,217 OF THEM LIVE NOWHERE ELSE.

     The village is not flat. 1,217 of its 7,623 occupied cells carry their
     surface on Layer 02, 03 or 04 with NOTHING on Dirt or Layer 01 beneath --
     the raised ground the demo runs half its paths across. A model that only
     indexes the base layers calls every one of them open water, so an erase up
     there punched hard-edged squares with no shore at all: the cells around the
     hole were "not ground", so no coast ring formed and no grass fringe
     resolved. The shadow tilemaps are excluded -- a shadow is not a surface. */
  upper = new Set<string>();

  /** The sprite atlas, handed in once at startup so a stroke can dress its own
      shore the way the composer does. Null until then; the brush still works,
      it just leaves the coast in the autotile tables' vocabulary. */
  atlas: Atlas | null = null;

  constructor(private doc: Document) {
    this.reindex();
  }

  reindex() {
    this.dirtTi.clear();
    this.surfTi.forEach((m) => m.clear());
    this.land.clear();
    this.grass.clear();
    this.rim.clear();
    this.flat.clear();
    this.upper.clear();
    this.grassLv.clear();
    this.thin.clear();
    const covered = new Set<string>();
    /* THE TOP OF THE STACK IS WHAT YOU STAND ON, and `flat` is the one index
       where that distinction bites. A cliff top is standable and a boulder is
       not, and 5 cells of the artist's own map carry a boulder (`Terrain_134`)
       on Layer 02 over a grass lip (`Terrain_81`) on Layer 01. Taking any tile
       in the stack as the answer put all five in `flat`, so `nav.walkable`
       published cells with a rock drawn on them and the critic's N4 -- which
       reads the visible tile, as the eye does -- called them villagers standing
       where there is no ground. Recorded here and applied after the sweep,
       because the tiles arrive in document order and the top one is not known
       until the cell's whole stack has been seen. */
    const topSurface = new Map<string, { li: number; file: string }>();
    this.doc.layout.tiles.forEach((t, i) => {
      const k = key(t.cell[0], t.cell[1]);
      if (t.layer === DIRT_LAYER) {
        if (t.file) this.land.add(k);
        /* TWELVE OF THE ARTIST'S MEADOW TILES ARE ON THE DIRT LAYER, and every
           model here classified a tile by the layer it sits on rather than by
           what it is. So those twelve cells read as bare ground: not meadow to
           the brushes, and -- because the base field is where `seal` lays its
           floor -- a slot `seal` would write dirt straight over, wiping his
           grass and shifting the signature of every neighbour that was drawn
           against it. Eight cells of one composed map scored "a grass piece the
           artist never used here" for exactly that, and the swap that caused it
           was invisible: the cell count does not move. */
        if (t.file?.startsWith('terrain-grass/')) {
          this.grass.add(k);
          this.grassLv.set(k, Math.max(this.grassLv.get(k) ?? 0, 1));
          if (grassCovers(t.file)) covered.add(k);
          topSurface.set(k, { li: 0, file: t.file });
          /* STILL INDEXED AS THE CELL'S BASE SLOT, or the brush appends a
             second Dirt tile beside it and the cell ends up with two tiles on
             one layer -- which is a layout that cannot say what it draws, and
             the critic's T4. What must not happen is a WRITE into it, and that
             is `seal`'s business, below. */
        }
        if (Ground.reusable(t)) this.dirtTi.set(k, i);
        return;
      }
      const li = SURFACES.findIndex((s) => s.layer === t.layer);
      if (li < 0) return; // a shadow tilemap: not a surface
      if (Ground.reusable(t)) this.surfTi[li].set(k, i);
      if (!t.file) return;
      if (li > 0) this.upper.add(k);
      const was = topSurface.get(k);
      if (!was || li >= was.li) topSurface.set(k, { li, file: t.file });
      if (t.file.startsWith('terrain-grass/')) {
        this.grass.add(k);
        this.grassLv.set(k, Math.max(this.grassLv.get(k) ?? 0, li + 1));
        // 427 cells carry two grass tiles; one opaque one covers the cell.
        if (grassCovers(t.file)) covered.add(k);
      } else if (t.file.startsWith('terrain-tiles/')) {
        this.rim.add(k);
        if (standable(t.file)) this.flat.add(k);
      }
    });
    for (const k of this.grass) if (!covered.has(k)) this.thin.add(k);
    for (const k of this.flat) {
      const t = topSurface.get(k);
      if (t && !standable(t.file)) this.flat.delete(k);
    }
  }

  /** Which terrace a cell's meadow belongs to. Worked ground carries no grass
      at all -- none of the artist's 824 bare-dirt cells has any, on any layer --
      so restoring meadow means asking the neighbours which terrace they stand
      on. Returns 0 when none of them knows either. */
  private levelNear(k: string, lv: Map<string, number>) {
    const [x, y] = unkey(k);
    let best = 0;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (dx || dy) best = Math.max(best, lv.get(key(x + dx, y + dy)) ?? 0);
      }
    return best;
  }

  isLand(x: number, y: number) {
    return this.land.has(key(x, y));
  }
  /** Anything you could stand on, at any height. */
  hasGround(x: number, y: number) {
    const k = key(x, y);
    return this.land.has(k) || this.grass.has(k) || this.upper.has(k);
  }
  isGrass(x: number, y: number) {
    return this.grass.has(key(x, y));
  }
  isRim(x: number, y: number) {
    return this.rim.has(key(x, y));
  }
  /** A cliff edge you could stand on: the flat grass top of a terrace, as
      against the rock face of one. What joins the levels of the village. */
  isFlatRim(x: number, y: number) {
    return this.flat.has(key(x, y));
  }
  /** Worked ground is bare dirt: not meadow, and not a cliff edge either. */
  isWorked(x: number, y: number) {
    return this.isLand(x, y) && !this.isGrass(x, y) && !this.isRim(x, y);
  }

  /** Ground you can SEE the dirt of — bare, or under grass thin enough to show
      it through. What `isWorked` asks, plus the fringe.

      A NARROW TRAIL HAS NO BARE CELL. The demo's paths are holes in the grass,
      and the grass tileset's shaped tiles overhang the hole from both sides, so
      a one- or two-cell trail is drawn entirely out of fringe: dirt underneath,
      a partly-transparent grass tile over every cell of it, and not one cell
      that `isWorked` will admit to. 95 of the map's 104 narrow trails are like
      this, which is why a fence walked straight over the small paths and gated
      only the big ones.

      Not `isLand` alone, which was the tempting shortcut: dirt runs as much as
      eight cells past anything you can see, under 2,812 cells of ordinary
      meadow, so that would have put gateways out in open field. What the eye
      goes by is whether the tile drawn there covers its cell, and that is
      measured — `OPAQUE_GRASS`, 34 sprites at 100% against 32 that stop at
      91%, with nothing in between to argue about. */
  isTrodden(x: number, y: number) {
    const k = key(x, y);
    return this.land.has(k) && !this.rim.has(k) && (!this.grass.has(k) || this.thin.has(k));
  }

  /* ── what each brush can actually do here ───────────────────────────────

     These live next to the code that acts, because the cursor and the brush
     MUST NOT be able to disagree, and they did: the cursor asked "is there
     dirt?" while `cut` asked "is there grass?". Measured on the demo those two
     questions barely overlap -- 1,451 cells carry grass with no dirt, so the
     brush would have cut them and the cursor showed red; and 3,135 carry dirt
     with no grass, so the cursor showed green over every pre-built path, where
     cutting does nothing at all.

     The result reads exactly as reported: the path brush appears to work only
     where a path already is. It was the cursor that was wrong, not the brush,
     and the fix is to stop asking a second question. */

  /* Each answers "can this brush ever act on a cell like this" -- a question
     about the KIND of cell, cheap enough to run over the whole brush footprint
     on every pointer move.

     Deliberately not "would this exact stroke change something". Both terrain
     passes absorb changes the tileset cannot draw -- a one-cell hole, a one-cell
     patch of meadow in a road -- and predicting that means running the commit,
     which is far too much work for a cursor. So the rule stays: RED means
     impossible, and a stroke that turns out to be a no-op is not a refusal.
     Reddening no-ops is what made an existing path look locked.

     What must never happen is red over a cell the brush would change. The drive
     suite asserts that direction strictly, over a 714-cell sample of the real
     map, and reports the other direction without failing on it. */

  /** A cut takes the grass away; where there is none there is nothing to cut.

      AND NOT AGAINST A CLIFF. A road cut flush to a cliff edge draws as a dead
      straight brown-against-green line, because bare dirt has no tile at all and
      the cliff tile beside it is opaque to its own edge -- there is no fringe on
      either side to overhang the join. It is the same 32px staircase, arriving
      from the one direction the fringe rules cannot reach.

      The artist keeps a grass verge, and the numbers are not close: cliff tiles
      are all over his map, touching 1,974 of his 5,683 grass cells (35%), and
      yet only 16 of his 825 worked cells (2%) sit against one. Refusing the cut
      is what keeps the verge there. */
  canCut(x: number, y: number) {
    return this.isGrass(x, y) && !this.nextToCliff(x, y);
  }

  private nextToCliff(x: number, y: number) {
    return RING4.some(([dx, dy]) => this.rim.has(key(x + dx, y + dy)));
  }

  /** Meadow grows over worked ground -- a road, a yard, a plot.

      NOT over a cliff, even one standing on dirt. `commit` refuses to touch a
      rim cell unless the stroke moved the coastline, so the four cells in the
      sample where a cliff has ground beneath it went green, recorded an edit
      and changed nothing. Meadow over the top of a cliff face would be wrong
      anyway: that is the edge of the island, not a field. */
  canGrow(x: number, y: number) {
    return this.isWorked(x, y);
  }

  /** Land is added only where the island is not, at ANY height. Testing the
      base field alone let the brush lay sea-level meadow underneath a plateau,
      where it is both invisible and wrong -- 240 cells of the demo. */
  canAddLand(x: number, y: number) {
    return !this.hasGround(x, y);
  }

  /** Erase takes anything standing, at any height, coast included. */
  canErase(x: number, y: number) {
    return this.hasGround(x, y) || this.isRim(x, y);
  }

  /** Clear wipes a patch back to meadow. Objects are the editor's business. */
  canClear(x: number, y: number) {
    return this.canGrow(x, y);
  }

  // ── the three brushes ──────────────────────────────────────────────────

  /* The cell model a stroke works against. All three sets are COPIES.
     `rim` used to be handed over by reference to save an allocation, and that
     is not a saving: `commit` ends in `reindex()`, which rebuilds `this.rim`,
     so the set a stroke was reasoning about changed identity underneath it. */
  private snapshot() {
    return {
      land: new Set(this.land),
      grass: new Set(this.grass),
      rim: new Set(this.rim),
      upper: new Set(this.upper),
      grassLv: new Map(this.grassLv),
    };
  }

  /* Cut worked ground: a road, a yard, a tilled plot.

     A cut needs GRASS, not dirt. Requiring a Dirt tile sounds like the safe rule
     and is the wrong one -- only 4,135 of the island's cells have one, so the
     brush silently refused most of the map, including every plateau surface the
     demo itself runs roads across. What actually matters is that something
     opaque lies under the hole afterwards, and `commit` guarantees that by
     laying the base field beneath any cell that is about to show it. Water is
     still safe: a cell with no grass is not cuttable at all. */
  cut(cells: Cells) {
    const target = this.snapshot();
    const touched = new Set<string>();
    for (const [x, y] of cells) {
      const k = key(x, y);
      if (!target.grass.has(k) || this.nextToCliff(x, y)) continue;
      target.grass.delete(k);
      target.grassLv.delete(k);
      target.land.add(k); // it keeps its ground; the grass is what goes
      touched.add(k);
    }
    if (!this.shaping) {
      this.openStroke();
      for (const k of touched) this.strokeCuts.add(k);
    }
    return this.commit(target, touched, 'cut path', false);
  }

  /** Restore meadow over worked ground, on the terrace it belongs to. */
  grow(cells: Cells) {
    const target = this.snapshot();
    const touched = new Set<string>();
    for (const [x, y] of cells) {
      const k = key(x, y);
      if (!target.land.has(k) || target.grass.has(k) || target.rim.has(k)) continue;
      target.grass.add(k);
      touched.add(k);
    }
    /* Spread the terrace inwards from the edge of the patch, because a wide
       road on a plateau has cells in the middle with no grass neighbour at all
       -- and those would default to sea level, laying Layer 01 meadow under the
       hillside where it cannot be seen. That is the whole bug this fixes; doing
       it in one pass just moves it from the whole road to the middle of it. */
    for (let pass = 0; pass < 16; pass++) {
      let settled = 0;
      for (const k of touched) {
        if (target.grassLv.has(k)) continue;
        const lv = this.levelNear(k, target.grassLv);
        if (lv) {
          target.grassLv.set(k, lv);
          settled++;
        }
      }
      if (!settled) break;
    }
    // Nothing anywhere near knows: it is ground at sea level.
    for (const k of touched) if (!target.grassLv.has(k)) target.grassLv.set(k, 1);
    this.sown = new Set(touched);
    const n = this.commit(target, touched, 'grow meadow', false);
    this.sown = null;
    return n;
  }

  /** Extend the land itself, arriving as meadow. New land is only ever added by
      this brush -- a path stroke can never do it. */
  /** @param smooth Take the cells exactly as given, without roughening.

      ROUGHENING IS FOR A HAND, NOT FOR AN OUTLINE. A brush stroke has exactly
      one straight run -- the whole stroke -- so a cut shore comes out as a
      dead-straight line and a right angle, and `roughen` is what makes it
      wander. The composer arrives with a coastline it has already shaped, and
      roughening that is not adding character to a ruler, it is putting the
      staircase back: measured on one composed map the outline went from 97
      convex corners to 163 in this one call, and a convex corner is exactly a
      cell that can only be dressed with an outer-corner piece. That count is
      what the critic scores as E8. */
  addLand(cells: Cells, smooth = false) {
    if (!this.shaping) {
      this.openStroke();
      for (const [x, y] of cells) this.strokeAdds.add(key(x, y));
    }
    const target = this.snapshot();
    const touched = new Set<string>();
    // Same roughening: a headland the brush grows has the same right angles a
    // bite does, and the same coastline rules apply to it.
    for (const [x, y] of smooth
      ? [...cells]
      : this.roughen(cells, (x, y) => this.canAddLand(x, y))) {
      const k = key(x, y);
      // Any height, not just the base field: laying sea-level meadow under a
      // plateau is invisible and puts two surfaces on one cell.
      /* Anywhere the island already stands, at any height. Testing the base
         field alone let the brush lay sea-level meadow underneath a plateau
         (240 cells), and testing dirt alone let it re-add ground under the
         1,451 grass cells that have none -- a change with nothing to show for
         it. A coast cell is fair game: growing onto one is how a headland
         forms. */
      if (target.land.has(k) || target.grass.has(k) || target.upper.has(k)) continue;
      target.land.add(k);
      target.grass.add(k);
      target.grassLv.set(k, 1); // new land arrives at sea level, out of the water
      // Land swallowing the old shoreline: that cell is meadow now, not a cliff.
      target.rim.delete(k);
      touched.add(k);
    }
    return this.commit(target, touched, 'add land', true);
  }

  /* A COASTLINE IS NOT A RULER, AND THE BRUSH IS.

     Measured on the artist's 768 shore cells, his boundary steps in or out
     every 9 to 13 cells of its length, and its straight stretches run a median
     of 2-3 cells, three quarters of them under 5, none past 15. A brush stroke
     has exactly one straight run: the whole stroke. So a cut shore came out as
     a dead-straight line for fifteen cells and then a right angle, which is the
     silhouette of a rectangle however good the tiles on it are.

     So the requested footprint is roughened before it is cut: a cell just
     outside it joins in when its block says so. Two-cell blocks rather than
     per-cell noise, because independent cells give a fringe of one-cell warts
     rather than a coast, and because a 2x2 block is the smallest bump the tile
     tables can dress anyway.

     OUTWARD ONLY, and computed from the REQUESTED cells rather than from the
     hole as it stands. Both matter. Nibbling inward as well leaves one-cell
     peninsulas poking into the new water; and jittering against the current
     shore would eat another ring every time the pointer passed back over the
     same ground, so a slow drag would chew outward without limit. Off the
     request, it is a pure function of where the stroke was, and dragging the
     same path twice lands on the same coast. */
  private roughen(cells: Cells, seed: (x: number, y: number) => boolean, keep?: Set<string>) {
    /* SEEDED ONLY BY CELLS THE STROKE IS REALLY TAKING. Spreading from the
       whole footprint let a dab aimed entirely at open water chew a bite out of
       the shore beside it -- the cursor said red on every cell of it, correctly,
       and the brush acted anyway. Thirteen such cells in a 714-cell sample. */
    const want = new Set<string>();
    const from: string[] = [];
    for (const [x, y] of cells) {
      const k = key(x, y);
      want.add(k);
      if (seed(x, y)) from.push(k);
    }
    if (!from.length) return [...want].map(unkey);
    const out = [...want];
    // Over the snapshot, never over `want` -- a Set hands back what you add to
    // it while iterating, and the ring would eat outward one cell per pass.
    for (const k of from) {
      const [x, y] = unkey(k);
      for (const [dx, dy] of RING4) {
        const nx = x + dx,
          ny = y + dy,
          nk = key(nx, ny);
        if (want.has(nk) || keep?.has(nk)) continue;
        if (cellHash(nx >> 1, ny >> 1) / 0x7fffffff >= ROUGH) continue;
        want.add(nk); // so the ring is only ever one cell deep
        out.push(nk);
      }
    }
    return out.map(unkey);
  }

  /** Take a bite out of the island: surface, ground and everything stacked on
      the cell go, and the water comes back.

      This is the operation the handoff's model forbade outright -- it froze the
      land so that a hole could not be expressed. That constraint existed to stop
      an automatic reflow inventing coastline, which is a different problem from
      a person deliberately cutting one. The rules still hold at the edges: what
      survives re-resolves its fringe, and the new shore gets a rim wherever the
      table has an authored answer for the shape. */
  /** @param keep Ground the cut must not touch, whatever the rules would
      otherwise do to it.

      A hand-drawn erase wants none of this: a person dragging a brush owns the
      whole map and the cut should wander, round its corners and take unsupported
      stone with it. COMPOSITION does not. There, one settlement is being taken
      off the map and the others are not, and every widening rule in here reaches
      past the cells it was given -- `roughen` steps a cell outside the footprint
      so a coast is not a ruler, and the stranded sweep looks two rings further
      for stone whose ground has gone.

      Without a keep set that reach crosses a border. Taking the crop farm off
      the map ate 9 cells of the camp beside it, and taking every project off ate
      all 52 -- the camp is a raised terrace, and once nothing around it was left
      the passes took the plateau too. The camp is a common: it is what stands
      before any project does, so it cannot be collateral. */
  /** @param smooth see `addLand`. */
  erase(cells: Cells, keep?: Set<string>, anchors?: Set<string>, smooth = false) {
    if (!this.shaping) {
      this.openStroke();
      for (const [x, y] of cells) {
        const k = key(x, y);
        if (!keep?.has(k)) this.strokeDels.add(k);
      }
    }
    this.anchors = anchors ?? null;
    const target = this.snapshot();
    const touched = new Set<string>();
    for (const [x, y] of smooth
      ? [...cells]
      : this.roughen(cells, (x, y) => this.canErase(x, y), keep)) {
      const k = key(x, y);
      if (keep?.has(k)) continue;
      if (!target.land.has(k) && !target.grass.has(k) && !target.rim.has(k) && !target.upper.has(k))
        continue;
      target.land.delete(k);
      target.grass.delete(k);
      target.grassLv.delete(k);
      target.upper.delete(k); // the plateau surface goes with the rest
      /* AND the rim. This one line is the whole reason erasing along the coast
         left a ragged bite instead of a new shoreline.

         `footprint` -- the mask the rim ring resolves against -- counts a rim
         cell as land, because a cliff top IS the island's edge. So an erased
         cell that already carried a cliff tile still read as land, was skipped
         when the new ring was worked out, and then had its tile wiped by the
         clear pass anyway: gone from the picture and invisible to the rule that
         would have replaced it. Every cell where a stroke crossed the existing
         coast came out blunt, which is exactly where a person aims when they
         widen a bay. */
      target.rim.delete(k);
      touched.add(k);
    }
    /* A COPY. `touched` keeps growing inside `commit` -- the sliver pass adds
       the grass cells it absorbs -- and aliasing the two sets meant those cells
       were treated as erased too, wiping the ground out from under ordinary
       worked ground at the edge of the bite. */
    this.cleared = new Set(touched);
    this.keep = keep ?? null;
    const n = this.commit(target, touched, 'erase to water', true);
    this.cleared = null;
    this.keep = null;
    this.anchors = null;
    return n;
  }

  /** Ground the current stroke is forbidden to take. Null for every hand-drawn
      stroke; set only while composing. Read by the passes in `commit` that
      widen beyond the stroke's own cells. */
  private keep: Set<string> | null = null;
  /** Ground that makes a piece of land worth keeping at any size -- a cell with
      a building on it. Only the speck sweep reads it. */
  private anchors: Set<string> | null = null;

  /** Re-resolve the surfaces and the coast over a set of cells, without adding
      or taking away any ground.

      For composition. Moving a settlement leaves its art intact but puts it
      beside different neighbours, and everything about a cell's appearance is a
      function of its neighbourhood: the grass fringe, which cliff piece the
      shore gets, whether there is a shore there at all. So after a move the
      cells along every new seam have to be asked again, and this is that
      question with nothing else attached to it. */
  redress(cells: Iterable<[number, number]>) {
    const target = this.snapshot();
    const touched = new Set<string>();
    for (const [x, y] of cells) touched.add(key(x, y));
    if (!touched.size) return 0;
    return this.commit(target, touched, 'redress', true);
  }

  /** THE ONE QUESTION NO OTHER PASS IN HERE ASKS: can you see the sea through
      the floor?

      Every check in this file, and every check in the composer, is written
      against the cell model -- `hasGround`, `isLand`, `isRim`. All of them
      answer "is there a surface on this cell", and NONE of them answers "does
      anything on this cell hide what is behind it". The two come apart because
      the tileset is built out of shaped pieces: the grass fringe overhangs, the
      cliff stands in front of open water, and both are drawn with sprites that
      are deliberately part-transparent. A cell can carry two tiles, satisfy
      every check, and still show the backdrop straight through.

      Which is exactly correct on a shoreline and is a hole anywhere else, and
      the artist settles the difference himself: on his map, EVERY cell that
      shows water has open sea within a cell of it. All 755 of them, and not one
      exception. So this is not a tolerance to tune, it is an invariant to
      restore -- a cell showing water with no sea beside it is a hole.

      THE SEA IS WHERE THERE IS NOTHING, not where you can see through. That
      distinction is the whole of this pass and getting it wrong is subtle:
      flooding over "shows water" instead lets the flood run down a chain of
      part-transparent cells, and the southern lip of a terrace is exactly such
      a chain -- five, ten, twenty cells of hillside edge in a row, each 80%
      opaque, the last of them out at the coast. The flood walks the whole ridge
      in from the sea, pronounces every cell of it open water, and leaves a thin
      blue line running across the middle of the map. Eighty-five cells of it on
      one composed layout, all of them inland, none of them visible to a check
      that had already decided they were sea.

      Dirt is what covers it. It is the base field, it sits under everything at
      order -8, and it is invisible the moment anything opaque is laid over it
      -- so filling a cell that is already covered would cost a draw for
      nothing, and filling one that is not is the whole repair.

      THE BARE HALF IS NOT SEPARABLE BY WHICH BRUSH RAN, AND THAT WAS TRIED.
      `seal` closes two holes: a cell whose art does not cover it, and a cell
      with no tile at all that the sea cannot reach. Skipping the second on an
      ERASE looks obviously right -- the eraser's job is to open water. It is
      the wrong axis. It opened SEVEN undressed square holes in the plateau
      (`drive`, 25 cells taken becoming 32), because a plateau surface is
      authored rather than autotiled and nothing will dress the pond it leaves;
      meanwhile it did nothing for a pocket the LAND brush closed by ringing
      water, which is the same fault from the other direction.

      What separates them is not the brush, it is whether anything drew the
      pocket a shore -- see the loop below. A hole nobody meant is bounded by
      opaque interiors and is still paved. A pond somebody drew is bounded by
      coast pieces and overhanging meadow and is left alone, and the erase that
      opened it takes, which for most of this brush's life it did not.

      @returns how many cells had to be sealed. */
  seal() {
    const shows = new Set<string>();
    const cellsWith = new Map<string, number[]>();
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;
    /* A RECORD IS NOT A TILE. `erase` blanks a tile and leaves its 32px slot in
       place, so the open sea is full of records that draw nothing -- and a cell
       counted as occupied because it holds one is a cell the flood cannot enter.
       Missing this filled the entire north-west ocean with dirt in one pass: the
       sea was never reached from the border, so every shore cell looked inland
       and every one of them was sealed. Only a record with a FILE is a tile. */
    this.doc.layout.tiles.forEach((t, i) => {
      if (!t.file) return;
      if (t.layer !== DIRT_LAYER && !SURFACES.some((s) => s.layer === t.layer)) return;
      const k = key(t.cell[0], t.cell[1]);
      const at = cellsWith.get(k);
      if (at) at.push(i);
      else cellsWith.set(k, [i]);
      x0 = Math.min(x0, t.cell[0]);
      x1 = Math.max(x1, t.cell[0]);
      y0 = Math.min(y0, t.cell[1]);
      y1 = Math.max(y1, t.cell[1]);
    });
    if (!Number.isFinite(x0)) return 0;
    x0 -= 2;
    y0 -= 2;
    x1 += 2;
    y1 += 2;
    for (const [k, at] of cellsWith) {
      if (!at.some((i) => covers(this.doc.layout.tiles[i].file))) shows.add(k);
    }
    /* Open sea: a cell carrying no ground tile at all, reached from beyond the
       edge. Not "a cell you can see water through" -- see above. */
    const open = (x: number, y: number) =>
      x >= x0 && x <= x1 && y >= y0 && y <= y1 && !cellsWith.has(key(x, y));

    const sea = new Set<string>([key(x0, y0)]);
    const stack: [number, number][] = [[x0, y0]];
    while (stack.length) {
      const [x, y] = stack.pop()!;
      for (const [dx, dy] of RING4) {
        const nx = x + dx,
          ny = y + dy,
          k = key(nx, ny);
        if (sea.has(k) || !open(nx, ny)) continue;
        sea.add(k);
        stack.push([nx, ny]);
      }
    }

    /* A bare cell the sea never reached is a hole too -- UNLESS SOMETHING DREW
       IT A SHORE, in which case it is a pond and a pond is a legitimate thing
       to draw.

       This was a blanket fill and it should not have been. Ring open water with
       the land brush and the water you ringed came back paved: the hole you
       meant was gone and a hard-edged patch of bare dirt stood in the middle of
       the meadow instead. Worse than the fault it guards against, and it is the
       GUARD that is wrong, not the idea.

       So the guard asks the question this pass is actually for, in this pass's
       own words: *a hole with no shore on it*. Every ground cell along the
       pocket's edge either shows water into it -- which is what a dressed shore
       does, the fringe overhanging, the rock face standing in front -- or it is
       an opaque interior, which is a wall of grass sheared off at the cell
       boundary with the water plane behind it. One of those is a lake and the
       other is the thing this whole model exists to prevent, and nothing else
       has to be guessed at: not the size of the pocket, not which brush opened
       it, not whether anybody meant it.

       It subsumes the case that made the blanket fill look necessary. A plateau
       surface is authored rather than autotiled -- `finishStroke` skips `upper`
       by design -- so a hole punched in one is bounded by undressed cells and
       is filled, which is `drive`'s seven square holes closing for the reason
       they were square rather than because this pass was told about plateaux. */
    const bare = new Set<string>();
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        const k = key(x, y);
        if (!cellsWith.has(k) && !sea.has(k)) bare.add(k);
      }
    }
    const seen = new Set<string>();
    for (const start of bare) {
      if (seen.has(start)) continue;
      const pocket: string[] = [],
        q = [start];
      seen.add(start);
      let shored = true;
      while (q.length) {
        const k = q.pop()!;
        pocket.push(k);
        const [x, y] = unkey(k);
        for (const [dx, dy] of RING8) {
          const nk = key(x + dx, y + dy);
          if (bare.has(nk)) {
            if (!seen.has(nk)) {
              seen.add(nk);
              q.push(nk);
            }
          } /* A COAST TILE IS THE SHORE; showing water is not the test, and
             getting that wrong paved every lake anyway. A dressed shore cell
             keeps the dirt floor underneath it, and the floor covers -- so
             asking "does this cell show water" answers no for exactly the cells
             that prove the pocket is fine. `rim` is where a coast piece was
             actually drawn. */ else if (
            cellsWith.has(nk) &&
            /* AND AN AUTHORED SURFACE IS NEVER A SHORE, however it is dressed.
               A terrace lip IS a `rim` cell, so the coast test above passes a
               hole punched in a plateau on the strength of art that was drawn
               against the sea on the far side of the hill. Nothing autotiles
               `upper` -- `finishStroke` skips it by design -- so a pocket with
               one of them on its edge has an edge nobody will ever draw.
               `drive`, "erasing a plateau leaves a coast, not a square hole":
               7 bare cells, which is this line. */
            !this.rim.has(nk)
          )
            shored = false;
        }
      }
      /* AND A LAKE COUNTS AS WATER FOR EVERYTHING BELOW.

         The rule that keeps a shore from being paved is the artist's own: a
         cell may show water as long as there is open water within one cell of
         it. Leave the pond out of `sea` and every cell round it fails that test
         and gets a dirt floor written under its shore piece -- which shows
         through the gaps in the sprite as a bare rim following the waterline
         all the way round. It reads exactly like what it is: the hole was
         filled and then the water punched back out of the middle of it. The
         pond is water; say so once, here, and the rest of the pass is right. */
      if (shored) for (const k of pocket) sea.add(k);
      else for (const k of pocket) shows.add(k);
    }

    const changes: { ti: number; file: string | null }[] = [];
    const added: VTile[] = [];
    for (const k of shows) {
      /* BESIDE THE SEA IS A SHORE; anywhere else is a hole. The eight, because
         a coast tile is drawn against a diagonal as readily as a cardinal --
         the outer-corner pieces exist for exactly that -- and asking only the
         four would call every headland's corner an inland leak and pave it. */
      const [x, y] = unkey(k);
      if (RING8.some(([dx, dy]) => sea.has(key(x + dx, y + dy)))) continue;
      const r = rng(cellHash(x, y));
      const file = `terrain-dirt/TX Tileset Dirt_${PLAIN_DIRT[(r() * PLAIN_DIRT.length) | 0]}.png`;
      const dti = this.dirtTi.get(k);
      /* AND NEVER OVER SOMETHING THAT IS NOT DIRT. Twelve of the artist's own
         meadow tiles sit on the Dirt layer, so the base slot of those cells
         holds his grass -- writing a floor into it deletes the meadow, and the
         signature of every neighbour drawn against it moves. A cell that already
         has artwork in its base slot is a cell somebody meant something by; a
         floor goes beside it, not through it. */
      const held = dti !== undefined ? this.doc.layout.tiles[dti].file : null;
      if (dti === undefined) {
        added.push(this.newTile(DIRT_LAYER, DIRT_ORDER, x, y, file));
      } else if (!held || held.startsWith('terrain-dirt/')) {
        changes.push({ ti: dti, file });
      } else {
        /* THE BASE SLOT IS TAKEN, AND BY SOMETHING SOMEBODY MEANT. Twelve of
           the artist's own meadow tiles sit on the Dirt layer, and a cell needs
           a floor exactly when what is drawn on it does not cover it -- so
           these are the cells where both are true at once. Writing the floor
           over the grass loses artwork and moves the signature of every
           neighbour drawn against it; refusing to write leaves a hole in the
           map, which is the one thing `seal` exists to prevent. Both were
           measured, one cell each way.

           So the grass moves up a layer and the floor goes underneath it, which
           is where each of them belongs anyway: Layer 01 is the surface, Dirt is
           the field beneath. Only when Layer 01 is free -- if something is
           already drawn there, that is what the cell shows and the base slot is
           just the wrong place for it. */
        const si = this.surfTi[0].get(k);
        if (si !== undefined && !this.doc.layout.tiles[si].file) {
          changes.push({ ti: si, file: held });
          changes.push({ ti: dti, file });
        } else if (si === undefined) {
          added.push(this.newTile(SURFACES[0].layer, SURFACES[0].order, x, y, held));
          changes.push({ ti: dti, file });
        }
      }
    }
    if (!changes.length && !added.length) return 0;
    this.doc.applyTileEdit(changes, added, 'seal the floor');
    this.reindex();
    return changes.length + added.length;
  }

  /** Cells this stroke is emptying, so `commit` clears them rather than leaving
      whatever the rim table had no answer for. */
  private cleared: Set<string> | null = null;
  /* EVERY CLIFF THIS EDITOR HAS DRAWN, AND WHY IT HAS TO BE REMEMBERED.

     A stranded cliff is one whose ground has gone out from under it, and the
     rule that removes it deliberately spares the artist's: he has 30 cells of
     stone standing two and three cells clear of anything, hand-placed, and a
     sweep that took every unbacked cliff would eat those the moment a stroke
     passed nearby. "Was it backed before this commit" is the test, and it works
     for one commit and not for a drag: a pointer sample writes a lip, three
     samples later another one takes away the ground behind it, and by then the
     cell was already unbacked at the start of that commit so nothing touches
     it. Twenty cells of cliff left standing in the sea in a neat row.

     Ours are ours to take back at any time, so they are remembered by name. */
  private authored = new Set<string>();
  /** And every cell it has emptied. A dimple -- one bare cell with the coast
      ring round three sides -- is always one of these, and it only becomes a
      dimple once the third side is dressed, which can be several commits and
      several cells later than the one that emptied it. Rings around a stroke
      cannot reach that; this set can. */
  private blanked = new Set<string>();
  /** Cells this stroke is deliberately sowing with meadow, so the sliver pass
      completes them into a shape the blob set can draw instead of eating them
      as strays. */
  private sown: Set<string> | null = null;

  // ── resolve and diff ───────────────────────────────────────────────────

  /** The gesture's own cells, and the ground as it stood before it started. */
  private strokeAdds = new Set<string>();
  private strokeDels = new Set<string>();
  /* A CUT IS A THIRD GESTURE, and it was in no stroke at all.

     `addLand` and `erase` register their cells so `finishStroke` can shape and
     redraw the gesture's own footprint. `cut` registered nothing, so
     `finishStroke` returned on its first line for every path a hand ever drew
     and not one of its passes has ever run on this family.

     What that cost is measurable and is the fault in the screenshot: cutting a
     path re-dresses the meadow beside it, an opaque fill becomes a part-
     transparent FRINGE, and with no floor beneath it the water backdrop shows
     straight through. `T2` 5 on a nineteen-cell scuff, against the artist's 0
     over his whole village. `seal` is the pass that answers exactly that
     question and it sits at the end of `finishStroke`, unreachable. */
  private strokeCuts = new Set<string>();
  private strokeBefore: Set<string> | null = null;
  /** The COAST as it stood before the gesture, kept apart from the ground.

      `finishStroke` redraws its own footprint from scratch, so it has to know
      which art is its own -- and a coast cell is in none of the ground sets, so
      measured against `strokeBefore` alone EVERY shore within reach of the dab
      read as the gesture's own work. It was cut, and nothing put it back: a
      two-cell dab five cells off a little island deleted seven tiles of that
      island's cliff face and left it standing on nothing. That is the "it ate
      the land next to it" fault, and it is why this set is separate rather than
      folded into `strokeBefore` -- `want` is built from `strokeBefore`, and a
      coast ring dropped into the outline would be shaped and dressed as though
      it were ground. */
  private strokeRim: Set<string> | null = null;
  private shaping = false;
  /* Set for the length of an ERASE gesture's redraw. `finishStroke` lays its
     shaped outline back down with `addLand`, which is the label `commit` seals
     and fills on -- so without this the eraser's own repair pass floors the
     hole it just opened, and a bite taken out of the middle of a blob comes
     back solid with more tiles in it than before the stroke. The gesture's job
     decides, not the call the repair happens to make.

     IT GATES `fillIn` AND NOT `seal`, and the difference was measured both
     ways -- see the note on `seal`. Closing a cut seam is worth nothing on a
     stroke whose job is to open water (it took the wandering erase from 23
     pieces of ground to 31); flooring a hole that has no shore on it is worth
     a great deal, whichever direction the stroke was going. */
  private erasing = false;

  /** A gesture is starting. Anything left over from a compose -- which paints
      through this same brush and never ends a stroke -- is not this gesture's
      history and must not be its baseline. */
  beginStroke() {
    this.strokeAdds.clear();
    this.strokeDels.clear();
    this.strokeCuts.clear();
    this.strokeBefore = null;
    this.strokeRim = null;
  }

  private openStroke() {
    if (this.strokeBefore) return;
    const b = new Set<string>();
    for (const k of this.land) b.add(k);
    for (const k of this.grass) b.add(k);
    for (const k of this.upper) b.add(k);
    this.strokeBefore = b;
    this.strokeRim = new Set(this.rim);
  }

  /** Shape the gesture's outline the way the composer shapes its own, then let
      the ordinary dressing draw the result.

      THIS IS THE PASS THE BRUSH NEVER HAD, and its absence is the whole of what
      a hand-drawn coast looked like. Before it lets a single tile be chosen the
      composer shapes the land twice: `snapToTread` puts every straight run at
      two cells or more, because his median run is two and a convex corner is a
      cell that can ONLY be dressed with an outer-corner slab; `legaliseOutline`
      then refuses any cell whose 8-neighbourhood is one the vocabulary has no
      answer for. The brush handed the raw dab shape to the autotiler and then
      asked it for a tile that does not exist.

      Measured on a freehand spiral drawn on blank water -- the thing a person
      actually does with this tool, and the case nothing here covered, because
      `brushcoast` anchors every stroke on his existing shore and so is handed
      the neighbourhood for free:

                     E1   E2    E3    E4    E5    E6   E7    E8
        raw stroke   24   18   294   232   382   137   21   446
        shaped        0    0    85   171     0     7    0   214
        the artist    0    0     7     7     0    19    0   125

      `E5` -- a grass piece he never used at that neighbourhood -- is not a
      dressing fault at all. There is no right tile for a shape he never drew,
      and the dresser was being asked for one on hundreds of cells.

      SHAPE THE RAW CELLS AND THEN DRAW; DO NOT DRAW AND THEN REPAIR. Feeding
      the drawn result back in instead -- ground plus the coast ring the
      dressing hung on it, after the sliver pass and the roughening have had
      their say -- is answering a question about a shape nobody drew, and scores
      `E5 429` against 0 for the same stroke shaped first.

      ONCE PER GESTURE, NOT ONCE PER DAB. It is not idempotent: `legaliseOutline`
      moves cells off the block grid and the next snap fills their blocks, so a
      420-dab spiral grew from 12,192 tiles to 19,062 and its arms merged.

      IT MAY TRIM ITS OWN STROKE AND NEVER EAT INTO OLD LAND. The snap deletes
      from a sparse block as readily as it fills a crowded one, and turned loose
      it would re-cut the artist's coastline either side of wherever you drew.

      @returns how many tiles moved. */
  finishStroke(forbid?: Set<string>, anchors?: Set<string>) {
    this.forbid = forbid ?? null;
    this.finishAnchors = anchors ?? null;
    const n = this.reshape();
    this.forbid = null;
    this.finishAnchors = null;
    this.strokeAdds = new Set();
    this.strokeDels = new Set();
    this.strokeBefore = null;
    this.strokeRim = null;
    this.strokeCuts = new Set();
    return n;
  }

  /** The same pass, run WHILE THE POINTER IS STILL DOWN, leaving the gesture's
      record intact so the next dab reshapes from the same raw intent.

      It exists because of the honest version of a fair complaint: the brush was
      painting a raw stroke, and then on pointer-up erasing the whole thing and
      laying it again shaped. Everything you saw while you dragged was thrown
      away, so the result jumped the moment you let go and the tool could not be
      aimed. Running the pass live makes what you see what you get.

      SAFE TO RUN REPEATEDLY, and that is not the same claim as the warning on
      `finishStroke` about it not being idempotent. That warning is about
      feeding it the DRAWN state: shape a drawn result, draw that, shape it
      again and the shape grows -- 12,192 tiles to 19,062 on a spiral. This
      recomputes `want` from `before + adds - dels` every time, which are the
      raw cells the pointer asked for and never the output, so the fixed point
      is reached on the first call and every later one lands on the same shape.

      Throttled by the caller rather than here: the cost is a redraw of the
      gesture's footprint, which grows with the stroke, and the right cadence is
      a question about frames rather than about ground. */
  previewStroke() {
    return this.reshape();
  }

  /** Cells the shaping may never make land: the sea round the artist's own
      island, when a headless caller cuts INSIDE it. `snapToTread` completes
      a half-filled block, and a block on his shoreline is half sea, so the
      shore grew a cell wherever a cut ended near it. */
  private forbid: Set<string> | null = null;
  /* Ground the finish's own redraw may not sweep as debris. The composer
     passes everything that stood before the gesture: two districts adding
     land at once put the debris box over the artist's whole islet, whose
     ground is split by rocks into pieces smaller than his smallest island,
     and every piece went. */
  private finishAnchors: Set<string> | null = null;

  private reshape() {
    const adds = this.strokeAdds,
      dels = this.strokeDels,
      before = this.strokeBefore;
    const wasRim = this.strokeRim ?? new Set<string>();
    const cuts = this.strokeCuts;
    if (this.shaping || !this.atlas || !before) return 0;

    /* A PATH GESTURE, WHICH MOVES NO LAND. Cutting takes the grass and leaves
       the ground, so `want` -- built from the land sets -- is unchanged by it,
       and running the outline passes over it would shape a shore nobody drew
       while the actual footprint went untouched. So the cut is finished on its
       own terms and returns before them.

       `seal` is the whole of it for now, and it is not a new predicate: it is
       the one pass in this file that asks whether you can SEE THROUGH the
       floor, which is precisely what a cut breaks when it turns an opaque
       neighbour into a fringe piece. Sealing is right for this gesture in a way
       it is not for an erase -- an eraser's job is to open water and `seal`
       fights it, while a cut must never open anything. */
    if (!adds.size && !dels.size) {
      if (!cuts.size) return 0;
      /* AND THE FOOTPRINT IS LEGALISED FIRST -- the shape, before any tile.

         Two shaping passes were tried before this one and both were reverted:
         growing or shrinking the boundary could only ever GROW (a two-cell
         track has nothing with five neighbours to drop and everything flanking
         it has three to add), and shifting each slice sideways carried the
         width over correctly but took `E5` 1 -> 8. Both were guesses at what
         the shape should be. This one is not a guess: it is the 47
         neighbourhoods the artist actually cut, derived by `atlas.py` into
         `atlas.json` under `paths.fringe` and read here and by `critic.py`.

         The critic named the fault in words and it went unheard for a day --
         "he drew nothing at this signature, THE SHAPE OF THE GROUND HERE IS
         THE FAULT". A dragged disc leaves long straight edges and he never cut
         one. See `wear.ts`. */
      let n = 0;
      if (this.atlas && !(globalThis as any).__noLegalise) {
        /* THE UNION OF `facing` OVER HIS GRASS SPRITES -- 48 signatures --
           which is the vocabulary E5 judges against. `paths.fringe` is keyed
           the other way round and using it found nothing at all. */
        const legal = new Set<number>();
        for (const [f, rec] of Object.entries(this.atlas!.tiles)) {
          if (f.startsWith('terrain-grass/')) for (const m of rec.facing ?? []) legal.add(m);
        }
        /* The grass blob with this gesture undone: what the cells were before
           it cut them, so a candidate footprint can be scored against the map
           as it would be if that footprint were the one drawn. */
        const base = (x: number, y: number) => {
          const k = key(x, y);
          return cuts.has(k) || this.isGrass(x, y) || this.rim.has(k) || this.upper.has(k);
        };
        const want = legaliseCut(cuts, (x, y) => this.canCut(x, y), legal, base);
        const back: [number, number][] = [],
          more: [number, number][] = [];
        for (const k of cuts) if (!want.has(k)) back.push(unkey(k));
        for (const k of want) if (!cuts.has(k)) more.push(unkey(k));
        if (back.length || more.length) {
          this.shaping = true;
          try {
            if (back.length) n += this.grow(back);
            if (more.length) n += this.cut(more);
          } finally {
            this.shaping = false;
          }
        }
      }
      n += this.seal();
      if (n) this.reindex();
      return n;
    }

    /* THE SNAP MAY TRIM YOUR STROKE; IT MAY NOT THROW ALL OF IT AWAY.

       `snapToTread` keeps a 2x2 block only when half of it is filled, which is
       the run-length work this pass is here for and is right for a stroke of
       any size. It is also, for a single-cell click, one cell in an empty block
       -- deleted, redrawn as nothing, and the brush silently ignores you. At
       brush size 1 the only thing it ever did was nothing.

       So the trim runs first, unheld, exactly as it did; and only if it has
       left NOTHING of what the pointer was actually over does it run again with
       those cells held, which completes their blocks instead of emptying them.
       Conditional rather than always, because holding every painted cell is not
       free: measured on the freehand spiral it costs E3 103 -> 111, E4 165 ->
       178 and E6 25 -> 31, since the held blocks put the ragged one-cell fringe
       back along the whole length of the stroke. A gesture big enough to have a
       fringe is a gesture with something left after the trim. */
    const shape = (held: Set<string>) => {
      const w = new Set(before);
      for (const k of adds) w.add(k);
      for (const k of dels) w.delete(k);
      for (let pass = 0; pass < 2; pass++) {
        snapToTread(w, held, false);
        legaliseOutline(w, this.atlas!);
      }
      return w;
    };
    let want = shape(new Set());
    if (adds.size && ![...adds].some((k) => want.has(k))) want = shape(adds);
    if (this.forbid) for (const k of this.forbid) want.delete(k);

    /* The blocks the gesture had a say over, plus a ring for the legalise step
       and the coast that hangs off them. Tied to TREAD rather than to a radius:
       the question is which BLOCKS the gesture touched. */
    const scope = new Set<string>();
    for (const set of [adds, dels]) {
      for (const k of set) {
        const [x, y] = unkey(k);
        for (let dx = -RIM_REACH; dx <= RIM_REACH; dx++) {
          for (let dy = -RIM_REACH; dy <= RIM_REACH; dy++) {
            const bx = Math.floor((x + dx) / TREAD) * TREAD;
            const by = Math.floor((y + dy) / TREAD) * TREAD;
            for (let a = -1; a <= TREAD; a++) {
              for (let b = -1; b <= TREAD; b++) scope.add(key(bx + a, by + b));
            }
          }
        }
      }
    }

    /* IT REDRAWS ITS OWN FOOTPRINT; IT DOES NOT PATCH IT.

       420 dabs leave 420 dabs' worth of state -- a cell drawn on dab 3 against
       neighbours it no longer has, dirt where a later dab took the grass, a rim
       grown and regrown. None of that is reachable by re-dressing: a full-map
       `redress` after the shaping moved 7,229 tiles and took `E5` from 211 to
       194, while the same outline DRAWN ONCE scores 0. So every cell this
       gesture created is taken back to water and laid again from the shaped
       outline, in one call, exactly as the composer lays its own.

       ONLY ITS OWN. A cell that had ground before the gesture keeps its art --
       its path, its worked ground, its authored fringe -- and is never redrawn
       for having been painted near. */
    const put: [number, number][] = [],
      cut: [number, number][] = [];
    for (const k of scope) {
      const [x, y] = unkey(k);
      if (this.upper.has(k)) continue; // a plateau is authored, not autotiled
      const has = this.hasGround(x, y),
        rim = this.rim.has(k);
      /* MINE MEANS THIS GESTURE DREW IT, and the coast has to be asked
         separately: it is in none of the ground sets, so `before` alone says
         every shore in reach belongs to the stroke. See `strokeRim`. */
      const mine = (!before.has(k) && !wasRim.has(k)) || dels.has(k);
      if ((has || rim) && mine) cut.push([x, y]);
      if (want.has(k) && (!has || mine)) put.push([x, y]);
    }
    this.shaping = true;
    /* AN ERASE GESTURE DOES NOT SEAL, and the reason it has to be said HERE as
       well as in `commit` is that the redraw below calls `addLand`. A bite
       rubbed out of the middle of a blob is a pocket the sea cannot reach, so
       `seal` floors it -- the hole closed up and the map came back with 3,495
       tiles where the untouched blob had 3,362. The whole point of the eraser
       is to open water. It does NOT hold for `seal`, which still runs: see the
       note there, and the `lake` case in `tools/mouse.mjs` for what that
       costs. */
    this.erasing = !adds.size;
    let n = 0;
    try {
      if (cut.length) n += this.erase(cut, undefined, this.finishAnchors ?? undefined, true);
      if (put.length) n += this.addLand(put, true);
      /* AND EVERY CELL THE GESTURE TOUCHED IS ASKED AGAIN.

         `commit` only re-resolves a cell whose own signature changed, which is
         right for one dab and wrong for a gesture: a cell drawn on dab 3 keeps
         the sprite it was given against the neighbours it had then, and by dab
         300 those neighbours are different. Left alone that is 346 grass cells
         sitting at signatures the artist never drew, on an outline that is now
         perfectly legal -- the shape was fixed and the art was not. */
      /* And seal, the same as every other land stroke: the redraw opens the
         shape up again and overlapping ground can close a pocket the sea
         cannot reach. */
      this.seal();
      this.reindex();
    } finally {
      this.shaping = false;
      this.erasing = false;
    }
    return n;
  }

  private commit(
    target: {
      land: Set<string>;
      grass: Set<string>;
      rim: Set<string>;
      upper: Set<string>;
      grassLv: Map<string, number>;
    },
    touched: Set<string>,
    label: string,
    landChanged: boolean
  ) {
    if (!touched.size) return 0;

    /* What the grass blob is bounded BY, evaluated against the TARGET sets. Not
       "cells that are grass" -- measured against the 999 grass cells the artist
       baked by hand, that model reproduces his choice only 27% of the time,
       because it treats water, the ground under a plateau and the cliff rim as
       holes when he did not. Grass runs under all three and stops ONLY at
       worked ground. Counting them as filled lifts agreement to 64%. */
    const filled: Has = (x, y) => {
      const k = key(x, y);
      return !(target.land.has(k) && !target.grass.has(k) && !target.rim.has(k));
    };
    /* The SAME predicate over the pre-stroke sets. A cell only needs a new tile
       if its shape actually changed; comparing the two signatures is how that is
       known.

       Without this, every cell in the ring was re-resolved whether or not
       anything about it had moved -- and since the tables agree with the artist
       only 64% of the time, a stroke quietly replaced his hand-chosen fringes
       with the table's nearest guess for a cell that had not changed at all.
       That is the reported "drawing near an existing path overrides it". */
    const wasFilled: Has = (x, y) => {
      const k = key(x, y);
      return !(this.land.has(k) && !this.grass.has(k) && !this.rim.has(k));
    };

    // Every touched cell, plus the ring whose signature it changed.
    const region = new Set<string>();
    for (const k of touched) {
      const [x, y] = unkey(k);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          region.add(key(x + dx, y + dy));
        }
    }

    /* Absorb slivers left behind by the stroke.

       The blob set has no tile for a one- or two-cell island: with no filled
       cardinal on any side there is no signature to resolve, so it falls through
       to a plain interior tile and draws as a HARD RECTANGLE in the middle of
       the cut -- the clearest possible sign the ground was generated rather than
       placed. It is also the reported "rectangle that doesn't fit at the end".

       A cell with one filled cardinal or none is therefore taken into the cut
       with the rest, repeatedly, until nothing more qualifies. A long one-cell
       strip is safe: its cells each have two filled neighbours along the run, so
       a deliberately narrow verge survives while a stray fragment does not. */
    for (let pass = 0; pass < 3; pass++) {
      const doomed: string[] = [];
      const sown: string[] = [];
      for (const k of region) {
        if (!target.grass.has(k)) continue;
        const [x, y] = unkey(k);
        // Absorbing turns the cell into road, and a road does not go against a
        // cliff -- see `canCut`. The verge survives as a verge.
        if (this.nextToCliff(x, y)) continue;
        const n =
          (filled(x, y + 1) ? 1 : 0) +
          (filled(x + 1, y) ? 1 : 0) +
          (filled(x, y - 1) ? 1 : 0) +
          (filled(x - 1, y) ? 1 : 0);
        if (n > 1) continue;
        /* A PATCH THE STROKE JUST SOWED GROWS; A SLIVER IT LEFT BEHIND IS
           ABSORBED. Same shape, opposite intent, and telling them apart is what
           lets the smallest brush sow meadow at all.

           The blob set has no tile for a one- or two-cell patch either -- under
           two filled cardinals `grassSprite` falls through to a plain interior
           tile, which draws as a hard square in the middle of the road. So a
           stray left over by a cut is taken into the cut with the rest, while a
           cell the meadow brush deliberately put there is completed to a 2x2,
           whose four cells are outer corners and round off properly. Absorbing
           both is what made a size-1 meadow dab a no-op on 48 cells in 72. */
        if (this.sown?.has(k)) sown.push(k);
        else doomed.push(k);
      }
      for (const k of sown) {
        const [x, y] = unkey(k);
        let best: string[] | null = null;
        for (const [ox, oy] of [
          [0, 0],
          [-1, 0],
          [0, -1],
          [-1, -1],
        ]) {
          const need: string[] = [];
          let ok = true;
          for (let j = 0; j < 4 && ok; j++) {
            const bk = key(x + ox + (j & 1), y + oy + (j >> 1));
            if (target.grass.has(bk)) continue;
            // Meadow only goes where there is already ground to put it on.
            if (!target.land.has(bk) || target.rim.has(bk)) ok = false;
            else need.push(bk);
          }
          if (ok && (!best || need.length < best.length)) best = need;
        }
        if (!best) {
          doomed.push(k);
          continue;
        }
        for (const bk of best) {
          target.grass.add(bk);
          target.grassLv.set(bk, target.grassLv.get(k) ?? 1);
          this.sown!.add(bk);
          touched.add(bk);
          const [bx, by] = unkey(bk);
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
              region.add(key(bx + dx, by + dy));
            }
        }
      }
      if (!doomed.length && !sown.length) break;
      /* THE SLIVER LOSES ITS GRASS, NOT ITS GROUND -- the same rule `cut` runs
         on. 1,451 of the map's cells carry grass with no Dirt beneath, so
         deleting the grass alone leaves nothing at all there and the cell
         quietly becomes open water: a hole one row OUTSIDE the stroke, which
         the brush was never asked to make. An erase along the meadow left a
         birch standing in the sea that way -- its trunk cell was not erased,
         it was absorbed. */
      for (const k of doomed) {
        target.grass.delete(k);
        target.grassLv.delete(k);
        target.land.add(k);
        touched.add(k);
      }
    }

    /* THE COAST RESOLVES AGAINST THE GROUND, AND IT IS TWO CELLS DEEP TO THE
       SOUTH.

       Two separate questions, and answering both with one mask is what produced
       every coastline fault so far.

       WHICH CELLS ARE COAST. The non-ground cells cardinally touching ground --
       the LIP ring -- plus, below any lip whose ground is to the north, one more
       cell for the cliff FACE. Measured on the artist's 842 coast tiles, every
       one of his 160 north-of-ground lips has a face beneath it and none of the
       other three directions has anything: where the land is north you are
       looking at the front of the cliff, and everywhere else you only see its
       edge. Emitting one row for all four sides is what made an erased shore end
       in bare stone with the grass stopping dead against it.

       Note what does NOT count as support: another coast tile. A cliff is the
       edge of the island, not more island, so a cell whose only neighbour is
       rim stays open water. Counting rim as support made each pointer sample
       treat the ring the previous sample laid as fresh shoreline and build
       another inside it -- a drag came out with two parallel cliff walls and a
       channel of water between them, marching inward a row per commit.

       WHICH TILE EACH GETS. Keyed on the 8-neighbour GROUND signature, because
       what a coast tile depicts is where the land is. A dirt-only mask scores 0%
       against the artist -- 820 of his 842 coast cells have no dirt beneath, and
       neither do 2,271 grass cells, so it calls most of the island water. */
    const isGround = (k: string) =>
      target.land.has(k) || target.grass.has(k) || target.upper.has(k);
    /** Bare ground after the stroke: a road, a yard, a plot. Against the TARGET
        sets, so a cell the stroke is cutting right now already counts. */
    const isWorked = (k: string) =>
      target.land.has(k) && !target.grass.has(k) && !target.rim.has(k);
    const ground: Has = (x, y) => isGround(key(x, y));

    /** Where the ground is, before and after, for telling whether a cell's
        coastal shape actually moved. Ground only: a coast tile is the edge, and
        including it here would make the shape look changed wherever the ring
        merely moved. */
    const wasGround: Has = (x, y) => {
      const k = key(x, y);
      return this.land.has(k) || this.grass.has(k) || this.upper.has(k);
    };

    const supports: Has = (x, y) => isGround(key(x, y)) && !target.rim.has(key(x, y));
    const wasSupport: Has = (x, y) => wasGround(x, y) && !this.rim.has(key(x, y));

    const lip = new Set<string>();
    const face = new Set<string>();
    const buildLip = () => {
      lip.clear();
      for (const k of region) {
        if (isGround(k)) continue;
        const [x, y] = unkey(k);
        /* Beside any ground, INCLUDING the 22 cliff cells that stand on the
           dirt field. Excluding those is the tidier rule and it costs 25 bare
           shore cells per session: the lip is what dresses the boundary, and a
           cell refused one is a hard 32px edge, which is worse than a cliff the
           backing check grumbles about.

           AND BESIDE IT DIAGONALLY, which is the whole of the reported hard
           right angle. Four-adjacency draws the ring along the flats and stops
           at every corner: the cell that touches a headland's tip at the corner
           alone is left bare, so the tip comes out as a green square with two
           straight sides meeting at 90 degrees and no stone on either. The
           artist has no such corners -- 1,431 of his 1,684 coast tiles sit
           beside land, and 125 of those touch it only at a diagonal, drawn with
           the outer-corner pieces (33, 35, 97, 99 and their variants) that a
           four-neighbour ring can never ask for. See `LIP` in terrain.ts, which
           is keyed on the same eight. */
        if (RING8.some(([dx, dy]) => isGround(key(x + dx, y + dy)))) lip.add(k);
      }
    };

    /* A HOLE THE ART CANNOT DRESS GROWS UNTIL IT CAN BE.

       The artist never made a pocket of water narrower than two cells, so there
       is no tile for one: the coast tables answer for every shape with ground on
       one or two adjacent sides, and for a three-sided notch open to the SOUTH,
       and for nothing else. Ground on all four, or on three sides open any other
       way, returns null -- and a null left the cell as a bare square of water
       with a hard 90-degree grass edge.

       The first answer to that was to hand the ground back, and it is the wrong
       one twice over. It made the smallest brush do nothing at all: a one-cell
       erase asks for exactly the shape with no tile, so it was refused
       everywhere except a straight south-facing shore -- which is the reported
       "the smallest one doesn't even work", and, because that one direction DID
       work, the reported "it isn't consistent" as well. And on a big stroke it
       is what left the shore lumpy: cell by cell, whichever cells happened to
       land on an undrawable shape were pushed back out into the bite while their
       neighbours were not.

       So the cut GROWS instead, to the smallest hole that is actually water,
       and there are two conditions on that, both found by looking:

       EVERY CLEARED CELL NEEDS A TILE. A cell takes in the cheapest 2x2 block
       it belongs to -- cheapest meaning the one asking for the least new water,
       so a bite at the shore reaches for the sea rather than for the village.
       Each of a 2x2's cells has ground on exactly two adjacent sides, which is
       an inner corner, which is a shape the tables answer.

       AND THE HOLE HAS TO SHOW WATER, which the tables do not say and the
       render does. A 2x2 satisfies every lookup and comes out as a lump of rock
       with a sliver of blue in it: four inner corners are four pieces drawn for
       the concave corner of a big shore, and butted together they depict
       nothing.

       ASK THE PICTURE, NOT THE GEOMETRY. This used to look for a cell with no
       ground on any side and settle for a 3x3, whose middle cell has exactly
       that -- and a 3x3 comes back paved. The cliff FACE hangs one cell BELOW
       every lip whose ground is to the north, so in a hole three across the
       middle cell is under the top row's face and gets a tile like all the
       rest. Nine cells of stone in the meadow, not a drop of blue in it, from
       one tap of the smallest brush: the reported "the erase is completely
       broken", and the reason it looked broken everywhere rather than at one
       size, since roughening makes most small cuts all shoreline too.

       So the test is whether any cell comes out with NOTHING on it, lip and
       face both, and the hole grows until one does. At the shore that costs
       nothing, because the sea beside it already shows.

       It ends. Every pass either finishes or takes at least one more cell, the
       budget caps how many, and anything still stuck when the budget runs out
       falls back to the old behaviour and keeps its ground. */
    /** Cells this stroke opened as water on purpose — see the growth below. */
    const opened = new Set<string>();
    if (landChanged && this.cleared) {
      const cutCell = (k: string) => {
        target.land.delete(k);
        target.grass.delete(k);
        target.grassLv.delete(k);
        target.upper.delete(k);
        target.rim.delete(k);
        this.cleared!.add(k);
        touched.add(k);
        const [x, y] = unkey(k);
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            region.add(key(x + dx, y + dy));
          }
      };
      const undressable = () => {
        buildLip();
        return [...lip].filter((k) => {
          if (!this.cleared!.has(k)) return false;
          const [x, y] = unkey(k);
          return lipSprite(ground, x, y, variantOf(x, y)) === null;
        });
      };
      /** Open water: a cell the coast pass will leave bare. Nothing beside it,
          so it takes no lip, and nothing above it holding a cliff front over
          it, so it takes no face either. */
      /* WRITTEN OUT RATHER THAN APPROXIMATED, and that is what it cost to leave
         it approximated. This predicts which cells the coast pass will leave
         bare, and the coast pass places exactly two things: a lip on any
         non-ground cell beside ground, and a face one cell below any lip whose
         ground is to the north. So the honest test is those two rules, run
         forwards, over the same eight neighbours `buildLip` uses.

         The version it replaces guessed at the second rule with "is there
         ground two cells up, with ground beside the cell between" -- true of a
         face under a straight shore and wrong the moment the lip ring learned
         about diagonals, because a lip is no longer only found beside ground.
         The two disagreed and the growth loop stopped early: a size-3 tap on the
         plateau came back as fourteen cells of stone with not a drop of blue in
         it, believing it had opened a pond. */
      const isLip = (g: Has) => (x: number, y: number) =>
        !g(x, y) && RING8.some(([dx, dy]) => g(x + dx, y + dy));
      const waterUnder = (g: Has) => (k: string) => {
        const [x, y] = unkey(k);
        if (g(x, y)) return false;
        const lipAt = isLip(g);
        if (lipAt(x, y)) return false; // it takes a lip
        if (lipAt(x, y + 1) && g(x, y + 2)) return false; // a face falls here
        return true;
      };
      const showsWater = waterUnder(ground);
      /** WATER IN THE PICTURE, NOT IN THE MODEL, and the difference is the
          second half of the fault.

          A cell just outside a cut is usually neither ground nor water: it is
          the artist's own coast, and the shoreline band is two cells of stone
          deep -- the lip, then the front hanging under it. Geometry calls both
          of those open sea, so a cut that started four rows inland could reach
          the coast by turning four rows of meadow into four rows of MORE COAST
          and pronounce itself finished. What it drew was a gully of rock
          running down to the sea with nothing in it, from one tap.

          A cell only counts if it will come out with no tile at all: this
          stroke is emptying it, or nothing was ever on it. */
      const bare = (k: string) =>
        !this.land.has(k) && !this.grass.has(k) && !this.upper.has(k) && !this.rim.has(k);
      const opensOut = () => {
        for (const k of this.cleared!) {
          const [x, y] = unkey(k);
          for (const [dx, dy] of [[0, 0], ...RING4]) {
            const nk = key(x + dx, y + dy);
            if ((this.cleared!.has(nk) || bare(nk)) && showsWater(nk)) return true;
          }
        }
        return false;
      };
      /** What it would cost to leave this cell showing water.

          THREE ACROSS AND FOUR DEEP, with the cell itself on the third row.
          Three across or the sides are its own shore; four deep because the
          cliff front hangs a cell BELOW the top row and would otherwise floor
          the hole. Twelve cells, and that is the smallest hole in this tileset
          with any blue in it -- the artist drew none smaller, and for a smaller
          one there is simply no art.

          A block rather than the cross of cells that satisfies the same three
          rules for nine: the cross has one-cell tips, and a cut one cell wide
          draws as a dark seam and not as water, which is the same complaint in
          a thinner shape.

          Cells already water, or already going, are free, so a cut at the shore
          pays for almost none of this -- and the cheapest offset is picked, so
          the hole reaches for the sea rather than for the village. */
      const openUp = (k: string) => {
        const [x, y] = unkey(k);
        let best: string[] | null = null;
        for (const ox of [-1, 0, -2]) {
          // centred first, so ties do not drift
          const need: string[] = [];
          for (let dy = 2; dy >= -1; dy--)
            for (let c = 0; c < 3; c++) {
              const nk = key(x + ox + c, y + dy);
              if (this.cleared!.has(nk) || !isGround(nk)) continue;
              need.push(nk);
            }
          if (!best || need.length < best.length) best = need;
        }
        return best ?? [];
      };
      /** The cheapest n x n block containing this cell, as the list of cells it
          would newly take. Cheapest = fewest, so a cut at the shore grows into
          the sea it already touches rather than into the village behind it.

          Ties go to the block CENTRED on the cell. Scanning the offsets in the
          obvious order instead breaks every tie the same way -- down and left --
          and in open ground, where every block costs the same, that is every
          tie: a click put its pond a cell down-left of the cursor, every time.
          Same anchoring as `brushCells` for an even n, which has no centre. */
      const block = (k: string, n: number) => {
        const [x, y] = unkey(k);
        const offs: number[] = [];
        for (let o = -(n - 1); o <= 0; o++) offs.push(o);
        offs.sort((a, b) => Math.abs(a + (n - 1) / 2) - Math.abs(b + (n - 1) / 2) || b - a);
        let best: string[] | null = null;
        for (const oy of offs)
          for (const ox of offs) {
            const need: string[] = [];
            for (let j = 0; j < n * n; j++) {
              const bk = key(x + ox + (j % n), y + oy + ((j / n) | 0));
              // Already water, or already going: free.
              if (this.cleared!.has(bk) || !isGround(bk)) continue;
              need.push(bk);
            }
            if (!best || need.length < best.length) best = need;
          }
        return best ?? [];
      };
      /* Bounded by the stroke's own size. A cut that spreads further than this
         is not completing a shape any more, it is eating the map, and the
         hand-back below is the safer end for it. */
      let budget = this.cleared.size * 3 + 12;
      /** The cells the growth below paid to leave bare, and ONLY those. */
      const wanted = new Set<string>();
      const growToFit = () => {
        for (let pass = 0; pass < 8 && budget > 0; pass++) {
          // Dressability first: an open hole with a cell the tables cannot
          // answer is still a bare square of water.
          const stuck = undressable();
          let grew = false;
          if (stuck.length) {
            for (const k of stuck) {
              if (budget <= 0) break;
              const need = block(k, 2);
              if (!need.length) continue;
              budget -= need.length;
              need.forEach(cutCell);
              grew = true;
            }
          } else if (!opensOut()) {
            /* The cheapest cell to open, which at the shore is the one nearest
               the sea and inland is the one the cursor was on -- `cleared` is
               in stroke order and ties keep the first. */
            let best: string[] | null = null,
              at = '';
            for (const k of this.cleared!) {
              const need = openUp(k);
              if (!best || need.length < best.length) {
                best = need;
                at = k;
              }
            }
            if (!best?.length) return;
            budget -= best.length;
            best.forEach(cutCell);
            wanted.add(at);
            grew = true;
          }
          if (!grew) return;
        }
      };
      growToFit();

      /* NO SPURS AND NO NECKS EITHER.

         Roughening cuts a bump here and not there, and where two bumps sit
         either side of a cell that stayed, what is left is a finger of meadow
         two cells wide poking out into the new water. The tables dress it
         perfectly and it still reads as an artifact, because the artist's land
         does not do that. Of his 6,816 ground cells, TEN have one cardinal
         neighbour or none, FOUR sit in a strip one cell wide, and EIGHT in a
         strip two wide. Twenty-two cells, a third of one percent.

         So a cell the stroke has just left on a spur or in a neck goes into the
         cut with the rest. Only cells the stroke made coastal -- his eighteen
         are hand-placed and a stroke passing nearby must not eat them. */
      const thin = (k: string) => {
        const [x, y] = unkey(k);
        let n = 0;
        for (const [dx, dy] of RING4) if (isGround(key(x + dx, y + dy))) n++;
        if (n <= 1) return true;
        const w = (a: number, b: number) => !isGround(key(a, b));
        // One wide: two neighbours, and they are OPPOSITE each other. An outer
        // corner has two as well and there are 109 of those, so the test has to
        // be which two rather than how many.
        if ((w(x - 1, y) && w(x + 1, y)) || (w(x, y - 1) && w(x, y + 1))) return true;
        return (
          (w(x - 1, y) && w(x + 2, y) && isGround(key(x + 1, y))) ||
          (w(x + 1, y) && w(x - 2, y) && isGround(key(x - 1, y))) ||
          (w(x, y - 1) && w(x, y + 2) && isGround(key(x, y + 1))) ||
          (w(x, y + 1) && w(x, y - 2) && isGround(key(x, y - 1)))
        );
      };
      for (let pass = 0; pass < 3; pass++) {
        const spurs = [...region].filter(
          (k) =>
            isGround(k) &&
            !this.cleared!.has(k) &&
            RING4.some(([dx, dy]) => {
              const [x, y] = unkey(k);
              return this.cleared!.has(key(x + dx, y + dy));
            }) &&
            thin(k)
        );
        if (!spurs.length) break;
        spurs.forEach(cutCell);
      }

      /* AND NO PUDDLES, which is the same rule pointing the other way.

         The artist has ZERO enclosed water: flood-filled inside the island's
         own bounding box, all four of his water components run off the edge of
         it. Every drop of water in the demo is the sea.

         A stroke makes them anyway. Roughening the footprint pushes a bump of
         water a cell further in, the hand-back above then returns ground to a
         cell in the middle of it, and what is left is a four-cell rectangle of
         blue marooned in the meadow with hard right angles on two sides -- the
         thing that looks least like terrain of anything the brush can produce.

         The floor is the tileset's rather than the artist's, since he never
         drew one at all: a pocket has to contain a cell with no land on any
         side, which is what a cliff stands over. A 3x3 is the smallest hole
         that manages it, which is exactly what a one-cell erase inland grows
         to, so a deliberate little pond survives this and a four-cell
         rectangle of blue does not. */
      const pond = [...this.cleared];
      if (pond.length) {
        let px0 = Infinity,
          px1 = -Infinity,
          py0 = Infinity,
          py1 = -Infinity;
        for (const k of pond) {
          const [x, y] = unkey(k);
          px0 = Math.min(px0, x);
          px1 = Math.max(px1, x);
          py0 = Math.min(py0, y);
          py1 = Math.max(py1, y);
        }
        const M = 2;
        px0 -= M;
        px1 += M;
        py0 -= M;
        py1 += M;
        const inBox = (x: number, y: number) => x >= px0 && x <= px1 && y >= py0 && y <= py1;
        const seen = new Set<string>();
        for (const k of pond) {
          if (seen.has(k) || isGround(k)) continue;
          const part: string[] = [];
          const stack = [unkey(k)];
          seen.add(k);
          let escaped = false;
          while (stack.length) {
            const [x, y] = stack.pop()!;
            part.push(key(x, y));
            for (const [dx, dy] of RING4) {
              const nx = x + dx,
                ny = y + dy,
                nk = key(nx, ny);
              if (isGround(nk)) continue;
              if (!inBox(nx, ny)) {
                escaped = true;
                continue;
              }
              if (seen.has(nk)) continue;
              seen.add(nk);
              stack.push([nx, ny]);
            }
            if (escaped) break;
          }
          /* KEPT IF IT DEPICTS WATER, not if it is big enough. A raw cell
             count is the obvious rule and it is wrong in both directions: it
             threw away perfectly good eight-cell bays, which is how a size-1
             erase came to do nothing at all on 46 of the 714 cells it showed
             green -- roughening made the hole an odd shape, growing dressed it,
             and this pass then swallowed the lot. What matters is whether
             anything in the pocket has no land on any side. That is the cell a
             cliff stands over; without one the pocket is all shoreline and
             depicts nothing. */
          const open = part.some((pk) => {
            const [x, y] = unkey(pk);
            return !RING4.some(([dx, dy]) => isGround(key(x + dx, y + dy)));
          });
          if (escaped || open) continue;
          for (const pk of part) {
            if (!this.cleared.has(pk)) continue; // never ours to give back
            if (this.land.has(pk)) target.land.add(pk);
            if (this.grass.has(pk)) {
              target.grass.add(pk);
              target.grassLv.set(pk, this.grassLv.get(pk) ?? 1);
            }
            if (this.upper.has(pk)) target.upper.add(pk);
            if (this.rim.has(pk)) target.rim.add(pk);
            this.cleared.delete(pk);
            touched.delete(pk);
          }
        }
      }

      /* NO SPECKS. A bite out of the island can pinch a scrap of ground off the
         mainland, and the pass above makes that likelier rather than less: it
         hands ground back to any cell it cannot give a shoreline, so a stroke
         that sweeps around a spot leaves the cells it could not dress standing
         in open water. A five-cell plus of grass floating in the middle of a
         new lake, with fragments of cliff stuck to it.

         The demo settles what counts as too small without any judgement being
         needed. It has exactly TWO pieces of ground: the mainland at 6,513
         cells and one island at 83. There is nothing else -- no specks, no
         two-cell rocks. Anything this stroke cuts off that is smaller than the
         smallest thing the artist ever drew was not intended.

         Bounded by the stroke, so the cost is the stroke's own size and so a
         piece connected to anything outside it is left alone: the fill gives up
         the moment it escapes, which is the cheap way of saying "still attached
         to the mainland". */
      const cells = [...this.cleared];
      if (cells.length) {
        let x0 = Infinity,
          x1 = -Infinity,
          y0 = Infinity,
          y1 = -Infinity;
        for (const k of cells) {
          const [x, y] = unkey(k);
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
          y0 = Math.min(y0, y);
          y1 = Math.max(y1, y);
        }
        const M = 2;
        x0 -= M;
        x1 += M;
        y0 -= M;
        y1 += M;
        const inBox = (x: number, y: number) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
        const seen = new Set<string>();
        for (const k of cells) {
          const [cx, cy] = unkey(k);
          for (const [dx, dy] of RING4) {
            const sx = cx + dx,
              sy = cy + dy,
              sk = key(sx, sy);
            if (seen.has(sk) || !isGround(sk) || !inBox(sx, sy)) continue;
            const part: string[] = [];
            const stack = [[sx, sy] as [number, number]];
            seen.add(sk);
            let escaped = false;
            while (stack.length) {
              const [x, y] = stack.pop()!;
              part.push(key(x, y));
              for (const [ex, ey] of RING4) {
                const nx = x + ex,
                  ny = y + ey,
                  nk = key(nx, ny);
                if (!isGround(nk)) continue;
                if (!inBox(nx, ny)) {
                  escaped = true;
                  continue;
                }
                if (seen.has(nk)) continue;
                seen.add(nk);
                stack.push([nx, ny]);
              }
              if (escaped) break;
            }
            if (escaped || part.length >= 83) continue;
            /* UNLESS SOMETHING IS DELIBERATELY STANDING THERE.

               "Smaller than the smallest thing the artist drew" is the right
               test for debris a bite pinched off the mainland, and the wrong one
               for the camp -- 52 cells, and a place, which becomes an island the
               moment the projects around it go away.

               `keep` is the wrong test for this: it says "not yours to cut",
               which is true of a neighbour's whole territory including the
               10-cell splinter a cut just sheared off its edge. That splinter IS
               debris and should go. `anchors` is the narrower claim -- ground
               with a building standing on it -- and a piece of land with a
               building on it is a place at any size. */
            if (this.anchors && part.some((pk) => this.anchors!.has(pk))) continue;
            for (const pk of part) {
              target.land.delete(pk);
              target.grass.delete(pk);
              target.grassLv.delete(pk);
              target.upper.delete(pk);
              target.rim.delete(pk);
              this.cleared.add(pk);
              touched.add(pk);
              region.add(pk);
            }
          }
        }
      }

      /* LAST, NOT FIRST. Whatever none of the passes above could dress keeps
         its ground rather than leaving a bare square of water.

         It has to run after ALL of them. It used to sit directly after the
         growth loop, and every shape pass that followed -- spurs, puddles,
         specks -- cut cells afterwards without anyone asking again whether the
         result could be drawn. One cell per big stroke came out as a flat blue
         square with two right angles in the middle of an otherwise organic
         shore: handed back by this pass, then taken again by the next one. */
      /* One more go at growing first. The shape passes above cut cells of their
         own, and a cell they take can leave a neighbour on a shape the tables
         cannot answer -- at which point handing ground straight back unravels
         the hole one cell at a time, and a size-1 erase came out a no-op on 46
         of the 714 cells it showed green. Growing is what fixes those; the
         hand-back is only for what growing cannot reach. */
      growToFit();
      for (let pass = 0; pass < 4; pass++) {
        const doomed = undressable();
        if (!doomed.length) break;
        for (const k of doomed) {
          if (this.land.has(k)) target.land.add(k);
          if (this.grass.has(k)) {
            target.grass.add(k);
            target.grassLv.set(k, this.grassLv.get(k) ?? 1);
          }
          if (this.upper.has(k)) target.upper.add(k);
          if (this.rim.has(k)) target.rim.add(k);
          this.cleared.delete(k);
          touched.delete(k);
        }
      }
      /* The water the growth went to the trouble of opening. The dimple passes
         below cannot tell a square hole punched in a shore from the middle of a
         pool this stroke deliberately made -- both are a bare cell with coast
         around it -- and paving these over is what put nine cells of stone in a
         meadow with no blue at all.

         EVERY CELL THE COAST PASS WILL LEAVE BARE, not only the ones the growth
         paid for. That distinction was a hedge against an approximate
         `showsWater`: it used to be a guess at where a face would fall, so
         trusting it everywhere left the one-cell channels of blue between two
         cliffs that the dimple rule exists to fill, and the growth's own cells
         were the subset it was safe about. `showsWater` runs the two coast rules
         forwards now, so the hedge costs more than it saves -- the dimple pass
         reaches three cells into a hole once the lip ring counts diagonals, and
         a size-3 tap came back as fourteen cells of stone with the water it had
         correctly opened paved over one pass later. A cell the coast pass is
         going to leave bare is water, however it came to be bare. */
      for (const k of this.cleared) if (showsWater(k)) opened.add(k);
    }

    if (landChanged) {
      buildLip();
      for (const k of lip) {
        const [x, y] = unkey(k);
        if (!isGround(key(x, y + 1))) continue; // the cliff front only
        const below = key(x, y - 1);
        if (isGround(below) || lip.has(below)) continue;
        face.add(below);
        region.add(below); // it can sit outside the touched ring, so admit it
      }
    }
    const coastTile = (k: string, x: number, y: number, r: number) =>
      lip.has(k) ? lipSprite(ground, x, y, r) : face.has(k) ? faceSprite(ground, x, y, r) : null;

    /* Coast the stroke stranded.

       A cliff is held up by the ground behind it. Erase that ground and the
       artist's own cliff row is left standing on open water with nothing
       against it -- five cells of floating stone along the edge of every bite
       taken out of an existing shore, which reads as damage rather than as
       terrain.

       Only cells THIS stroke stranded are cleared. The demo has 14 cliff cells
       that are unbacked by this rule on purpose -- the deeper plateau
       structures, which are hand-placed and stand two or three cells out -- and
       a sweep that simply deleted everything unbacked would eat those the
       moment a stroke passed near one. */
    /* TWO DIFFERENT QUESTIONS, and answering both with one predicate is what
       left cliffs floating.

       BESIDE ground, a cliff cell is the shore and belongs there, whatever the
       ground is -- that is the same test `buildLip` uses, so anything stricter
       here deletes coast the very next stroke has to draw again.

       HANGING BELOW one, it is the cliff FRONT, and it is held up by the lip
       above it. That lip has to be standing on real ground: a rim propped
       against another rim is not support, however far the chain runs, and
       `isGround` says otherwise for the 22 cliff cells that happen to have dirt
       beneath them. A whole row of stone read as backed all the way out to sea
       through that one gap. */
    const backed = (k: string, g: Has, hold: Has, rim: (k: string) => boolean) => {
      const [x, y] = unkey(k);
      /* RING8 AGAIN, and for the same reason as `buildLip`: an outer-corner
         piece touches its land only at the diagonal. On four neighbours the
         sweep calls all 125 of the artist's own corner cells unsupported and
         takes them away the moment a stroke passes near one -- rounding off
         every headland the tables had just learnt to draw. */
      if (RING8.some(([dx, dy]) => g(x + dx, y + dy))) return true;
      const above = key(x, y + 1);
      const [ax, ay] = unkey(above);
      return rim(above) && RING4.some(([dx, dy]) => hold(ax + dx, ay + dy));
    };
    /* WHAT HOLDS A CLIFF UP IS GROUND, AND ANOTHER CLIFF IS NOT GROUND.
       `backed` says so in its own comment and then asked `isGround`, which
       counts a rim cell whenever that cell also happens to carry dirt or a
       terrace beneath it. So a row of stone propped against the next row along
       read as supported all the way out to sea, and the sweep left it there:
       nine cells of floating cliff per wide bite, every one of them reported as
       backed. */

    let scanned = new Set<string>();

    const stranded = new Set<string>();
    if (landChanged) {
      const strandable = (k: string) => {
        // Composition's protected ground: not this stroke's to take, however
        // unsupported the rules find it. See `erase`'s `keep`.
        if (this.keep?.has(k)) return false;
        if (!target.rim.has(k) || lip.has(k) || face.has(k) || isGround(k)) return false;
        if (backed(k, ground, supports, (kk) => target.rim.has(kk) || lip.has(kk))) return false;
        return this.authored.has(k) || backed(k, wasGround, wasSupport, (kk) => this.rim.has(kk));
      };
      /* TWO RINGS WIDER THAN THE STROKE. The artist's cliffs stand two and
         three cells out from the ground that holds them up, so taking one cell
         of meadow can orphan stone the re-resolved region never reaches.
         `strandable` is conservative enough to widen safely: it only takes a
         cell that WAS backed and now is not, so his deliberately unbacked ones
         are still left alone however far the scan sees. */
      const reach = new Set(region);
      for (let ring = 0; ring < 2; ring++) {
        for (const k of [...reach]) {
          const [x, y] = unkey(k);
          for (const [dx, dy] of RING4) reach.add(key(x + dx, y + dy));
        }
      }
      for (const k of reach)
        if (strandable(k)) {
          stranded.add(k);
          region.add(k);
        }
      /* AND EVERY CLIFF THIS EDITOR EVER DREW, wherever it is.

         Widening the scan by rings is chasing the wrong thing: on a drag, the
         sample that writes a lip and the sample that takes away the ground
         behind it can be six cells and four commits apart, and no fixed radius
         covers that. The authored set is small and it is exactly the cells that
         are safe to re-examine at any distance, so it is simply swept whole. */
      for (const k of this.authored) {
        if (this.keep?.has(k)) continue;
        if (stranded.has(k) || isGround(k) || lip.has(k) || face.has(k)) continue;
        if (!target.rim.has(k)) continue;
        /* PLAIN GROUND HERE, not `supports`. This sweep is unbounded, so it has
           to be the conservative test: a cliff resting against a cliff that
           does have ground under it is still doing a job, and stranding those
           at any distance took away six cells of perfectly good shore for every
           bite. The strict test belongs where the scan is bounded and the cell
           has to have been backed a moment ago. */
        if (backed(k, ground, supports, (kk) => target.rim.has(kk) || lip.has(kk))) continue;
        stranded.add(k);
        region.add(k);
      }
      /* AND THE FACE HANGING UNDER IT.

         A cliff is two cells on its south side: a lip with the grass spilling
         over, and a face below it. The face is held up by the LIP, not by the
         ground -- which means when a stroke takes the lip away, the face is
         orphaned by a cell that is itself outside the region the stroke
         re-resolved, so nobody ever looked at it. Twenty cells of cliff front
         left standing in open water along the south edge of one wide bite, in a
         neat row, one below where the shore used to be. */
      for (let pass = 0; pass < 2; pass++) {
        const more: string[] = [];
        for (const k of stranded) {
          const [x, y] = unkey(k);
          const below = key(x, y - 1);
          if (stranded.has(below) || isGround(below)) continue;
          if (!target.rim.has(below) || lip.has(below) || face.has(below)) continue;
          if (backed(below, ground, supports, (kk) => target.rim.has(kk) || lip.has(kk))) continue;
          more.push(below);
        }
        if (!more.length) break;
        for (const k of more) {
          stranded.add(k);
          region.add(k);
        }
      }
    }

    /* NO DIMPLES IN THE RING.

       THE EDGE YOU SEE IS THE TILED RING, NOT THE GROUND. A coast tile is grass
       or cliff to look at, so a cell of bare water with the ring wrapped round
       three of its sides reads as a square hole punched in the shore -- one
       flat blue cell with two 90-degree corners, in the middle of an otherwise
       organic boundary. It is invisible to every check that asks "is this cell
       beside ground", because it is not: its neighbours are lip and face tiles,
       which are not ground either.

       The artist has exactly ONE cell like that on the whole map. Six erase
       strokes were adding nine. They get the cliff face, which is what the ring
       around them already is, and `FACE` answers for a blank signature.

       AFTER the stranded sweep, not before. That sweep takes away the artist's
       own cliff cells once the stroke has removed the ground holding them up,
       so a cell can be perfectly ringed until it runs and a hole afterwards. */
    if (landChanged) {
      /* `lip` and `face` only cover the stroke's own region, so a coast tile
         the ARTIST placed just outside it is invisible to them -- and a dimple
         backing onto one of his is the same square hole. His rim set answers
         for those, minus whatever this stroke is taking away. */
      const ringed = (k: string) =>
        isGround(k) ||
        lip.has(k) ||
        face.has(k) ||
        (this.rim.has(k) && !this.cleared?.has(k) && !stranded.has(k));
      /* One ring wider than `region`, because a dimple is only a dimple once
         the THIRD side of it is dressed, and that can happen on the next
         pointer sample -- by which time the cell itself is a step outside the
         stroke and nobody looks at it again. */
      scanned = new Set(region);
      const scan = scanned;
      for (const k of region) {
        const [x, y] = unkey(k);
        for (const [dx, dy] of RING4) scan.add(key(x + dx, y + dy));
      }
      /* AND EVERY CELL THIS EDITOR'S OWN COAST TOUCHES, wherever it is. Rings
         around the stroke are not enough: a dimple only becomes one when the
         THIRD side of it is dressed, and on a drag that side can be written
         four commits later, by which time the cell is well outside any region.
         A dimple is by definition surrounded by coast, so sweeping what our own
         coast touches always sees it. */
      for (const k of this.blanked) scan.add(k);
      for (let pass = 0; pass < 3; pass++) {
        const dimples: string[] = [];
        for (const k of scan) {
          if (ringed(k) || opened.has(k)) continue;
          const [x, y] = unkey(k);
          if (RING4.filter(([dx, dy]) => ringed(key(x + dx, y + dy))).length >= 3) {
            dimples.push(k);
          }
        }
        if (!dimples.length) break;
        dimples.forEach((k) => {
          face.add(k);
          region.add(k);
        });
      }
    }

    const changes: { ti: number; file: string | null }[] = [];
    const added: VTile[] = [];
    const rd = rng(7);

    for (const k of region) {
      const [x, y] = unkey(k);
      const wantLand = target.land.has(k);
      const wantGrass = target.grass.has(k);
      const r = variantOf(x, y);

      /* Untouched, and its neighbourhood resolves the same as before: leave the
         tile exactly as the artist left it.

         TWO shapes have to be compared, not one. `filled` is the GRASS blob's
         mask, and it deliberately counts water and meadow alike -- grass runs
         under the water line and stops only at worked ground. So growing the
         island out into the sea does not move that signature by a single bit:
         the cell was "filled" as water and is "filled" as lawn.

         Which meant every new stretch of coast was skipped right here, before
         the rim ever got a look at it, and the land brush produced beaches with
         no cliff -- while destroying the 20 authored rims it had grown over.
         The coastline is a second, independent shape, and a stroke that moves
         it has to say so. */
      const coastSame =
        !landChanged ||
        (!lip.has(k) &&
          !face.has(k) &&
          !stranded.has(k) &&
          ground(x, y) === wasGround(x, y) &&
          signature(ground, x, y) === signature(wasGround, x, y));
      if (
        !touched.has(k) &&
        wantLand === this.land.has(k) &&
        wantGrass === this.grass.has(k) &&
        coastSame &&
        signature(filled, x, y) === signature(wasFilled, x, y)
      )
        continue;

      /* Dirt: the land field.

         Added for new land, and ALSO under any cell that is about to be handed
         a fringe tile without having ground beneath it. A fringe is deliberately
         part-transparent -- that overhang is what makes the boundary ragged
         instead of a 32px staircase -- so on a cell with nothing under it the
         transparency shows open water. 2,271 Layer 01 cells have no Dirt tile,
         and cutting a path beside one turned it from an opaque interior tile
         into a fringe and punched a blue rectangle through the island.

         This is the same trap the source notes describe: shaped tiles land
         60%-opaque pieces where the mask says solid. Filling the base field
         underneath is the honest fix -- the cell already reads as land, and the
         dirt is invisible until the fringe needs something to overhang. */
      /* AN EMPTY RECORD IS NOT GROUND, and reading it as one is what put the
         puddles in the middle of the fields.

         A tile is never deleted here -- `erase` blanks it, `file: null`, and
         leaves the 32px record in place so the next stroke has something to
         write into. So a cell the sea took and the land later took back still
         carries a Dirt record, and asking `dirtTi` alone whether the cell has
         ground gets "yes" for a record that draws nothing. Every one of those
         cells then took its fringe with no field beneath it and the backdrop
         came up through the grass: 1,975 blanked Dirt records on a composed
         map against ZERO in the demo, and a scattering of blue puddles in open
         meadow that no `hasGround` check can see, because in the model the
         cell is perfectly good land.

         So the test is the FILE, and a blank record is filled in place rather
         than appended beside -- two Dirt tiles on one cell would be one wasted
         draw per cell for the life of the map. */
      const dti = this.dirtTi.get(k);
      const hasDirt = dti !== undefined && !!this.doc.layout.tiles[dti].file;
      const laid = new Set<string>();
      const layGround = () => {
        if (hasDirt || laid.has(k)) return;
        laid.add(k);
        const file = `terrain-dirt/TX Tileset Dirt_${PLAIN_DIRT[(rd() * PLAIN_DIRT.length) | 0]}.png`;
        if (dti !== undefined) changes.push({ ti: dti, file });
        else added.push(this.newTile(DIRT_LAYER, DIRT_ORDER, x, y, file));
      };
      if (wantLand) layGround();

      /* Layer 01 -- and the surprise that governs it:

           842 rim tiles in the demo, and 820 of them sit on cells with NO DIRT
           beneath.

         The rim is not a fringe drawn on the edge of the dirt field. It IS the
         shoreline, standing just outside it: an opaque cliff-top sprite that
         needs no ground under it, which is exactly why the coast reads as land
         standing above water rather than as a lawn that stops. So the rim
         belongs on the RING of non-land cells around the dirt, never on the
         land's own edge cells.

         Getting this backwards cleared 14 authored rims and drew none, because
         every one of them looked like "a water cell, so it holds nothing".

         `rimSprite` returns null for shapes the artist never authored -- an
         isthmus, a speck, or a cell now fully enclosed by land -- and there the
         cell is left exactly as it was rather than being given an invented
         tile. */
      /* GRASS IS NOT GATED ON DIRT. 2,271 of the demo's Layer 01 cells carry
         grass with no Dirt tile beneath them, and treating "has dirt" as "is
         ground" meant every one of those was skipped here — so a cut beside
         them left their fringe stale, and a stale fringe is a plain interior
         tile, which draws as a hard square block.

         That is the reported rectangle at the end of a stroke. The dirt field
         decides whether a cell can be CUT (cutting where nothing lies beneath
         would open a hole to the water); it does not decide whether a cell has
         a surface. */
      const wasRim = this.rim.has(k);
      /* WHICH TERRACE THIS CELL'S SURFACE IS WRITTEN TO. Meadow goes back on
         the layer it belongs to; worked ground and coastline are settled on
         Layer 01, which is where a cut exposes the Dirt field beneath
         everything.

         Coastline on Layer 01 even when it is the edge of a raised terrace,
         and that IS wrong -- the artist keeps each terrace's cliffs on its own
         layer, 631 of them on Layer 02 -- but writing them there is not the fix
         on its own. Tried: it changes which cells count as rim, which changes
         what the pinch pass absorbs, and a bite out of raised ground came back
         with a bigger blocky island in it than before. The layer is not the
         whole story and the rest of the story is not known yet. */
      const li = wantGrass ? (target.grassLv.get(k) ?? 1) - 1 : 0;
      const gti = this.surfTi[li].get(k);
      let file: string | null = null;

      if (wantGrass) {
        /* Meadow. NEVER a rim.

           The rim table resolves against the LAND mask and answers "what cliff
           face stands here, outside the land". Asking it about a cell that IS
           land gets an answer anyway -- an inner-corner cliff whenever one
           diagonal happens to be water -- so running it over every cell of a
           new landmass tiled stone faces across the whole thing in rows. Rims
           are emitted in one place only: the non-land ring, below. */
        file = grassSprite(filled, x, y, r) ?? interiorFill(x, y);
        /* Any grass cell needs ground under it. Not "any FRINGE cell" -- the
           pools overlap, so membership in INTERIOR is not a test of opacity.
           Tile 81 is in INTERIOR *and* in EDGE.N, and when it was picked as an
           edge the interior test said "opaque, needs nothing" and left a
           part-transparent tile over open water: one blue rectangle punched
           through the island per stroke.

           Ground under an interior tile is invisible and costs one tile, so
           there is nothing to be gained by being clever about which cells get
           it.

           ON A RAISED TERRACE, ONLY BESIDE A ROAD -- and that is the artist's
           own rule rather than a compromise. Of his grass cells bordering
           worked ground, 100% at sea level and 99% on raised ground have Dirt
           beneath; of those bordering none, only 38% and 59% do. He fills the
           ground in exactly where a fringe would otherwise have nothing to
           overhang, and leaves it out in the middle of a field where the tile
           is opaque anyway.

           Filling a raised terrace unconditionally is not free: what shows
           through up there is the terrace BELOW, so sea-level dirt under the
           middle of a plateau paints brown over lower ground the artist meant
           to show. Skipping it altogether is worse -- a road cut across a
           plateau fringes its banks with nothing underneath, and the water
           backdrop comes up through the island in blue rectangles. */
        const besideRoad = RING4.some(([dx, dy]) => isWorked(key(x + dx, y + dy)));
        if (li === 0 || besideRoad) layGround();

        /* AND THE TERRACE BELOW HAS TO GET OUT OF THE WAY.

           A fringe is part-transparent -- that overhang is the entire reason
           the artist's boundaries look organic instead of like a 32px
           staircase. Leave an opaque interior tile from a lower terrace sitting
           behind one and the overhang shows GRASS rather than the road, and the
           boundary comes out as a razor-straight rectangle. That is what a road
           cut across the terrace-3 plateau looked like: the correct edge tiles
           were written on Layer 03 and the Layer 02 tile 12 underneath filled
           every one of their transparent pixels back in.

           The artist is unambiguous here. Of his 562 raised grass cells that
           border worked ground, exactly ZERO carry grass on a lower terrace;
           under a fringe tile in general it is 1-11%, against 15-60% under an
           opaque one. He clears what is underneath precisely where it would
           show. */
        if (besideRoad) {
          for (let i = 0; i < li; i++) {
            const ti = this.surfTi[i].get(k);
            if (ti !== undefined && this.doc.layout.tiles[ti].file?.startsWith('terrain-grass/'))
              changes.push({ ti, file: null });
          }
        }
      } else if (wantLand) {
        file = null; // worked ground: the dirt shows through
        /* And it has to show through EVERY terrace. Nulling Layer 01 alone left
           a plateau path with its meadow still drawn one layer up: the cut
           recorded an edit and changed nothing you could see, which is exactly
           how the path brush looked on high ground. */
        for (let i = 1; i < this.surfTi.length; i++) {
          const ti = this.surfTi[i].get(k);
          if (ti !== undefined && this.doc.layout.tiles[ti].file?.startsWith('terrain-grass/'))
            changes.push({ ti, file: null });
        }
      } else if (this.cleared?.has(k)) {
        /* Emptied on purpose: every layer on the cell goes -- the ground, the
           plateau surface stacked over it, the lot. A cell that ends up on the
           new shoreline gets a cliff face like any other coast; one deep inside
           the hole gets open water.

           EXCEPT the surface layer, which is left for the write below to settle.
           Blanket-clearing it here and relying on that write to put a rim back
           is a trap: the write only fires when the tile would CHANGE, and a
           cell's variant is a pure function of its coordinates, so a drag that
           passes over the same shore cell twice re-derives the identical tile,
           the write is skipped as a no-op -- and the clear, which was not,
           stands. The cliff deletes itself on the second pointer sample.

           That is why a single erase() looked perfect in a test and a real drag
           came out ragged: the bug needs two commits to show up, and only the
           long straight edges of a stroke get touched twice. */
        for (const ti of this.stackAt(k)) if (ti !== gti) changes.push({ ti, file: null });
        file = coastTile(k, x, y, r);
      } else if (landChanged) {
        // Outside the land. Only a stroke that MOVED the coastline may write
        // here; a path or meadow stroke leaves the shore alone, since its ring
        // reaches the water often and the artist's rims must not be re-guessed
        // on ground whose shape never changed.
        file = coastTile(k, x, y, r);
        // No answer and not stranded: leave the cell exactly as it was.
        if (!file && !stranded.has(k)) continue;
      } else {
        continue;
      }
      if (!landChanged && wasRim) continue;
      if (file?.startsWith('terrain-tiles/')) this.authored.add(k);
      else this.authored.delete(k);
      if (gti !== undefined) {
        if (this.doc.layout.tiles[gti].file !== file) changes.push({ ti: gti, file });
      } else if (file) {
        added.push(this.newTile(SURFACES[li].layer, SURFACES[li].order, x, y, file));
      }
    }

    /* What had a surface going in, so that what has none coming out can be
       named. Captured here because `reindex` refills these very sets. */
    const hadSomething = [...region].filter(
      (k) => this.land.has(k) || this.grass.has(k) || this.upper.has(k) || this.rim.has(k)
    );

    /* THE LAST WORD ON SQUARE HOLES, and it MEASURES rather than predicts.

       The dimple pass above runs on what this commit intends, and one cell in
       nine slipped through it: a cliff the stranded sweep was taking away kept
       its tile after all, so a neighbour that had been counted as open water
       turned out to be dressed, and the bare cell between them became a hole
       nobody had asked about. Chasing that through the passes is guesswork --
       they run in an order, and each one's output is the next one's input.

       So this runs after every decision is made, against the tiles that are
       actually about to be written, and asks the only question that matters:
       will any cell come out bare with the coast ring round three of its sides?
       Whatever does gets a tile -- a lip where it has land beside it, the cliff
       face otherwise. */
    if (landChanged && (changes.length || added.length)) {
      const willHave = new Set<string>();
      for (const t of this.doc.layout.tiles) if (t.file) willHave.add(key(t.cell[0], t.cell[1]));
      for (const c of changes) {
        const t = this.doc.layout.tiles[c.ti];
        const k = key(t.cell[0], t.cell[1]);
        if (c.file) willHave.add(k);
        // Only if nothing else on the cell survives.
        else if (
          !this.stackAt(k).some((i) => i !== c.ti && !changes.some((o) => o.ti === i && !o.file))
        ) {
          willHave.delete(k);
        }
      }
      for (const t of added) willHave.add(key(t.cell[0], t.cell[1]));

      const dressed = (k: string) => isGround(k) || willHave.has(k);
      for (let pass = 0; pass < 3; pass++) {
        let filled = 0;
        for (const k of scanned) {
          if (dressed(k) || opened.has(k)) continue;
          const [x, y] = unkey(k);
          if (RING4.filter(([dx, dy]) => dressed(key(x + dx, y + dy))).length < 3) continue;
          const r = variantOf(x, y);
          const file = lipSprite(ground, x, y, r) ?? faceSprite(ground, x, y, r);
          if (!file) continue;
          const gti = this.surfTi[0].get(k);
          if (gti !== undefined) changes.push({ ti: gti, file });
          else added.push(this.newTile(SURFACES[0].layer, SURFACES[0].order, x, y, file));
          willHave.add(k);
          filled++;
        }
        if (!filled) break;
      }
    }

    if (!changes.length && !added.length) return 0;
    this.doc.applyTileEdit(changes, added, label);
    this.reindex();
    /* AND THE SHORE, SOLVED AS A CHAIN, AFTER EVERY STROKE.

       The autotile tables above choose each cell from its own 8-neighbour
       signature, which is right about the SHAPE of a piece and silent about
       whether it is one the artist ever stood beside the piece next to it. On
       a composed map that left 69% of the vertical joins as pairs he never
       drew and a west-facing shore dressed with 5 sprites where he uses 19 --
       and none of it is visible to any per-cell rule.

       So the land brush runs the same pass the composer does. Without this the
       two disagree: paint a headland by hand and it comes out in the old
       vocabulary while everything the composer laid is in the new one, which
       is the drift this codebase exists to avoid. It is scoped to the stroke's
       own region for speed; `dressCoast` only ever rewrites the sprite on a
       cell that already carries a coast tile, plus the second half of a bonded
       pair. */
    if (this.atlas) {
      dressCoast(this.doc, this.atlas, around(touched));
      /* AND THE MEADOW'S OWN JOINS, for the same reason and from the same kind
         of table. A cut re-resolves the row beside it correctly and leaves the
         row beyond it holding the piece that meshed with the OLD one -- eight
         straight 32px lines on his own map, E3 3 -> 10. See `mendGrass`. */
      mendGrass(this.doc, this.atlas, around(touched));
      this.reindex();
    }
    /* AND SEAL, WHICH THE BRUSH HAS NEVER DONE.

       `seal` is the only thing in this file that asks whether you can SEE
       through the floor, and the composer has always called it while a brush
       stroke never did. Painting a coastline by hand with overlapping dabs
       leaves pockets of open water enclosed by land -- three of them in a
       sixty-dab scribble, drawn as rectangles of sea in the middle of a
       meadow, which is what "it is still quite broken" was pointing at. The
       coast pass adds a fourth by moving a cell, so it runs first and this
       runs after it, the same order the composer uses and for the same
       reason. */
    /* AND ONLY WHERE LAND ARRIVED. Sealing after an ERASE fights the stroke:
       the eraser's whole job is to open water, and `seal` answers a pocket the
       sea cannot reach by flooring it with dirt -- 22 small pieces of ground
       became 29 on a forty-step wandering erase, each one a plug left standing
       in the water the stroke had just opened. Adding land is the case that
       needs it, because overlapping dabs are what close a pocket in the first
       place. */
    /* ONCE PER GESTURE, NOT ONCE PER DAB, when a hand is on the pointer.

       A pocket is only a hole while nothing has drawn its shore, and halfway
       through a gesture NOTHING HAS: the ring you are drawing round a piece of
       water is not closed yet, its inner edge is raw land, and the test below
       correctly calls it an undressed hole and paves it. Paved is permanent --
       `seal` lays floors and never lifts them -- so the lake was gone before
       the stroke that drew it had finished. `finishStroke` seals at the end,
       after the redraw and after the coast, which is the only moment the
       question can be answered. A compose has no stroke open and is unaffected;
       so is every harness that drives `applyBrushAt` directly. */
    if (label === 'add land' && (this.shaping || !this.strokeBefore)) {
      this.seal();
      this.reindex();
    }
    /* AND THE FILLERS LAST OF ALL, after `seal` has had the slot it wants --
       see `fillIn`. Scoped like the dressing, so a stroke pays for its own
       cells and not the map's, and gated on ADD for the same reason `seal` is:
       run on an erase it took the wandering-erase check from 23 pieces of
       ground to 31. Closing a seam is worth nothing on a stroke whose whole
       job is to open water. */
    if (this.atlas && label === 'add land' && !this.erasing) {
      fillIn(this.doc, this.atlas, around(touched));
      this.reindex();
    }
    this.emptied = hadSomething.filter(
      (k) => !this.land.has(k) && !this.grass.has(k) && !this.upper.has(k) && !this.rim.has(k)
    );
    for (const k of region) {
      if (!this.land.has(k) && !this.grass.has(k) && !this.upper.has(k) && !this.rim.has(k)) {
        this.blanked.add(k);
      } else this.blanked.delete(k);
    }
    return touched.size;
  }

  /** Cells this stroke left with nothing on them at all -- open water.

      NOT the same as the cells the brush was pointed at, and that difference
      strands things. A stroke also empties cells it never covered: a cliff row
      whose ground went out from under it, and grass fragments the blob pass
      absorbed. A birch was left standing in the sea a full row outside an
      erase, on the cliff top the sweep had just correctly taken away -- and an
      object over open water is the most obviously broken thing a brush can
      leave behind. The editor sweeps objects standing on these too. */
  emptied: string[] = [];

  /** Every tile index stacked on a cell, whatever layer it sits on. Erasing has
      to take the plateau surfaces and their shadows too, or the ground goes and
      a slab of hillside is left hanging over the water. */
  private stackAt(k: string): number[] {
    /* INDEXED, because a scan of every tile per erased cell is the whole cost
       of an erase: 7,000 cells against 12,000 tiles was six seconds, all of it
       here. The index is built once per tile-list length and filtered on
       `file` live, so a record blanked since it was built is not returned. */
    const tiles = this.doc.layout.tiles;
    if (!this.stackIdx || this.stackLen !== tiles.length) {
      this.stackIdx = new Map();
      tiles.forEach((t, i) => {
        const kk = key(t.cell[0], t.cell[1]);
        const a = this.stackIdx!.get(kk);
        if (a) a.push(i);
        else this.stackIdx!.set(kk, [i]);
      });
      this.stackLen = tiles.length;
    }
    return (this.stackIdx.get(k) ?? []).filter((i) => tiles[i].file);
  }
  private stackIdx: Map<string, number[]> | null = null;
  private stackLen = -1;

  private newTile(layer: string, order: number, cx: number, cy: number, file: string): VTile {
    return {
      layer,
      sorting_order: order,
      blend: 'normal',
      cell: [cx, cy],
      pos: [cx + 0.5, cy + 0.5, TILE_Z],
      file,
      size_px: [32, 32],
      pivot: [0.5, 0.5],
    };
  }
}

/** The cells a round brush covers, centred on a cell.

    SIZE IS THE WIDTH IN CELLS, NOT A RADIUS. Size 1 is one cell -- exactly the
    cell under the cursor and nothing else -- size 2 is a 2x2, size 5 a 21-cell
    disc. A radius reads as a size to nobody: it made the smallest offered brush
    3 cells across, and the number on the slider matched neither the square the
    cursor drew nor the hole it left.

    Even widths have no centre cell, so they are anchored down-and-left of the
    cursor, which is what every pixel editor does with an even brush. */
export function brushCells(cx: number, cy: number, size: number): [number, number][] {
  const s = Math.max(1, Math.round(size));
  const lo = -((s - 1) >> 1),
    hi = lo + s - 1;
  const mid = (lo + hi) / 2,
    r2 = (s * s) / 4;
  const out: [number, number][] = [];
  for (let dy = lo; dy <= hi; dy++) {
    for (let dx = lo; dx <= hi; dx++) {
      if ((dx - mid) ** 2 + (dy - mid) ** 2 <= r2) out.push([cx + dx, cy + dy]);
    }
  }
  return out;
}
