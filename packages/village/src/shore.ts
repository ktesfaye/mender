import { redress, verge, relegalise, resurface, type Atlas } from './brush/redress';
import { snapToTread } from './brush/shape';
import { Ground } from './brush/terrainBrush';
/* The shore pass: take a layout and the set of cells that are LAND, erase every
   other cell to open water, and dress the shoreline that exposes with the
   village editor's own brush code — the same `Ground.erase`, the same orphan
   sweep, the same pocket fill, the same band-pinned `redress` with the bonds
   held. Nothing here is a second implementation of the coast.

   Objects are the caller's business: the layout handed in should already hold
   only the objects that stand on that land, because the sliver pass reads what
   is standing where. */
import { Document, type Layout } from './doc/document';
import { setInteriorPool } from './scene/terrain';

export interface ShorePassOptions {
  /** Every cell that is land in this state. */
  readonly land: readonly (readonly [number, number])[];
  /** Of that land, the cells his island never had — the only place the pass
      may make ground where there was none. */
  readonly newLand?: readonly (readonly [number, number])[];
  readonly atlas: Atlas;
  /** How wide the dressing reaches. 'band' is what the app uses. */
  readonly redressMode?: 'band' | 'all' | 'none';
  /** Skip the tread snap. Only the shore tests want this. */
  readonly rawShape?: boolean;
  /** Do not reach across the cut for a neighbour's shore stone.

      A footprint drawn on the meadow has no stone of its own and needs his
      ring; his own partition gives every one of his cells to exactly one
      district, the shore ring included, so claiming a neighbour's stone here
      does not rescue his coast — it drags in the face of the terrace next
      door, which then stands at the water with nothing behind it. */
  readonly noRing?: boolean;
  /** Water the caller says must stay water.

      A thing that moves brings its own sea with it: the islet's bridge is
      drawn with the strait showing through its arch, and berthed over ground
      that used to be a crop field the finish put that ground back, so the arch
      was drawn over solid land with a hole of sea in the middle of it. These
      cells are refused to every pass that can lay land. */
  readonly wet?: readonly (readonly [number, number])[];
  /** Cells to trace through every lap, for debugging the pass. */
  readonly watch?: readonly (readonly [number, number])[];
}

/** Erase every cell outside `land` to open water and dress the coast that
    exposes, in place. Returns the pass's own counts. */
export function shorePass(layout: Layout, opts: ShorePassOptions): Record<string, number> {
  const landIn = opts.land as [number, number][];
  const newIn = (opts.newLand ?? []) as [number, number][];
  const atlas = opts.atlas;
  const mode = opts.redressMode ?? 'band';
  const WATCH = (opts.watch ?? []) as [number, number][];
  const shapeOf = (file: string) => ((atlas as any).tiles[file]?.shape ?? '') as string;

  const orig = new Set<string>();
  for (const t of layout.tiles) if (t.file) orig.add(t.cell[0] + ',' + t.cell[1] + '|' + t.file);
  const doc = new Document(layout);
  setInteriorPool(atlas as any);
  const g = new Ground(doc);
  g.atlas = atlas;
  const K = (x: number, y: number) => x + ',' + y;
  const asked = new Set(landIn.map((c) => K(c[0], c[1])));
  const out: Record<string, number> = {};

  /* THE SHAPE FIRST. A footprint drawn as discs and rectangles is a staircase
   of one-cell steps and ruler-straight runs, and his coast is neither: it
   moves in two-cell treads and every south face is two rows tall. The brush
   runs the same two passes over every stroke before it dresses one; the
   isolation never needed them because his own partition lines were already
   his own shapes. Cells his island already has WELL INSIDE the footprint are
   held so the snap trims only the new edge. */
  /* His island is where he laid GROUND: a cell with only a shadow on it, or
   a blank spacer record, is sea, and treating it as land made the brush
   draw a cell of meadow in the water on a map nobody had cut. */
  const GROUND_LAYERS = new Set(['Dirt', 'Layer 01', 'Layer 02', 'Layer 03', 'Layer 04']);
  const island = new Set<string>();
  for (const t of layout.tiles)
    if (t.file && GROUND_LAYERS.has(t.layer)) island.add(K(t.cell[0], t.cell[1]));
  /* HIS RING COMES WITH HIS LAND. A footprint is drawn in ground cells --
   the partition, a disc on the meadow -- and his shoreline is the stone
   ring OUTSIDE those cells: the lip beside the last grass, the face under
   it. Asked for the ground alone, the pass erased his own ring and drew a
   new one: 311 cells of his coast re-picked on an island nobody had cut.
   So any stone of his that touches asked land is asked too, and the row
   under it. */
  const stoneTop = new Set<string>();
  {
    const LV0: Record<string, number> = {
      Dirt: 0,
      'Layer 01': 1,
      'Layer 02': 2,
      'Layer 03': 3,
      'Layer 04': 4,
    };
    const top = new Map<string, [number, string]>();
    for (const t of layout.tiles) {
      if (!t.file || !(t.layer in LV0)) continue;
      const k = K(t.cell[0], t.cell[1]),
        lv = LV0[t.layer];
      const cur = top.get(k);
      if (!cur || lv >= cur[0]) top.set(k, [lv, t.file]);
    }
    for (const [k, [, f]] of top) if (f.startsWith('terrain-tiles/')) stoneTop.add(k);
    /* Beside asked LAND, not beside asked stone: measured the other way it
     walked along a neighbour plot's terrace face and claimed it, and the
     face came out as two bare squares with nothing above them. */
    let grown = 0;
    const ring1 = new Set<string>();
    for (const k of opts.noRing ? [] : asked) {
      if (stoneTop.has(k) || !top.has(k)) continue;
      const [x, y] = k.split(',').map(Number);
      // At a side, never a diagonal: a diagonal reaches the lip of the land
      // BEYOND, and his corners sit under a side lip, which the face row
      // step below then claims.
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const kk = K(x + dx, y + dy);
        if (!asked.has(kk) && stoneTop.has(kk)) ring1.add(kk);
      }
    }
    for (const k of ring1) {
      asked.add(k);
      grown++;
    }
    for (const k of ring1) {
      const [x, y] = k.split(',').map(Number);
      const kk = K(x, y - 1);
      if (!asked.has(kk) && stoneTop.has(kk)) {
        asked.add(kk);
        grown++;
      }
    }
    out.ring = grown;
  }
  const held = new Set<string>();
  for (const k of asked) {
    const [x, y] = k.split(',').map(Number);
    let inside = true,
      hisShore = false;
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) {
        const kk = K(x + dx, y + dy);
        if (!asked.has(kk)) inside = false;
        if (!island.has(kk)) hisShore = true;
      }
    /* Held: the interior, and HIS OWN SHORELINE -- a footprint edge that is
     his coast is already his shape. Only the cut through his land moves. */
    if (inside || hisShore) held.add(k);
  }
  const keep = new Set(asked);
  /* NO TABS AND NO NOTCHES, BUT NOT HERE. A cell of land with one neighbour
   of land is a one-wide spit and a cell of water with three neighbours is a
   one-wide inlet; his coast has neither, and the dresser answers both with a
   stone pillar standing on nothing. Run on the asked outline it cut a channel
   through the common meadow's neck, so the tidy that fixes them runs on the
   land that came OUT of the stroke instead -- see `spits`, below. */
  /* THE SNAP, AND ONLY THE SNAP, BEFORE THE CUT. A footprint drawn as discs
   is a staircase of one-cell steps, and a step that is his own ground is
   not the stroke's to move: the finish only ever puts back cells the erase
   took. So the asked outline is put on the two-cell grid first -- a block
   half in stays whole, a block with one cell in goes -- with his interior
   and his own shoreline held. The tidy and the legaliser were run here too
   and cut a channel through the common meadow's neck; the finish runs the
   legaliser itself, on the gesture, where it belongs. */
  if (!opts.rawShape) {
    {
      snapToTread(keep, held, false);
      for (const k of held) keep.add(k);
      /* A block the snap completes may reach his stone: the lip of a terrace
       whose land is the next plot's. Kept, it is a cliff with nothing above
       it; pruned later, it is two bare squares. Stone is only ever claimed
       through the ring rule above, never by a block. */
      for (const k of [...keep]) if (!asked.has(k) && stoneTop.has(k)) keep.delete(k);
    }
    /* AND THE LAST WORD IS THE GRID. The legaliser and the tidy each put
     one-cell steps back where they disagree, and every remaining fault at
     full size was one of those: a face row breaking at a single-cell
     offset, a lip ending one cell short of its corner. His coast moves in
     two-cell treads; so does this one, and the blocks are completed rather
     than trimmed so the footprint is not eaten. */
    /* AND NEVER INTO HIS SEA. Completing a block at his own shoreline puts
     the missing quarter of the block in the water, and the brush would then
     draw land there: run over his whole island untouched, this pass added
     a second ring of lips round the first, 7,127 tiles of it. Beyond his
     island only what was ASKED for (`new`) may stand. */
    for (const k of [...keep]) if (!island.has(k) && !asked.has(k)) keep.delete(k);
  }
  out.asked = asked.size;
  out.shaped = keep.size;
  const T0 = Date.now();
  const lap = (n: string) => {
    out['t_' + n] = Date.now() - T0;
    if (WATCH.length) {
      const top = topFileNow();
      console.error(
        n.padEnd(8),
        WATCH.map(
          ([x, y]) =>
            `${x},${y}=` +
            (top.get(K(x, y))?.[1]?.split('_').pop()?.replace('.png', '') ?? '~') +
            (g.land.has(K(x, y)) ? 'L' : '') +
            (g.rim.has(K(x, y)) ? 'R' : '')
        ).join('  ')
      );
    }
  };
  const topFileNow = () => {
    const top = new Map<string, [number, string]>();
    const LVx: Record<string, number> = {
      Dirt: 0,
      'Layer 01': 1,
      'Layer 02': 2,
      'Layer 03': 3,
      'Layer 04': 4,
    };
    for (const t of doc.layout.tiles) {
      if (!t.file || !(t.layer in LVx)) continue;
      const k = K(t.cell[0], t.cell[1]),
        lv = LVx[t.layer];
      const cur = top.get(k);
      if (!cur || lv >= cur[0]) top.set(k, [lv, t.file]);
    }
    return top;
  };

  const maskOf = (x: number, y: number) => {
    let m = 0,
      b = 1;
    for (let dy = 1; dy >= -1; dy--)
      for (let dx = -1; dx <= 1; dx++) {
        if (dx || dy) {
          if (g.hasGround(x + dx, y + dy) || g.isRim(x + dx, y + dy)) m |= b;
          b <<= 1;
        }
      }
    return m;
  };
  const was = new Map<string, number>();
  for (const t of doc.layout.tiles) {
    if (!t.file) continue;
    const k = K(t.cell[0], t.cell[1]);
    if (!was.has(k)) was.set(k, maskOf(t.cell[0], t.cell[1]));
  }
  /* HIS STONE, AS HE LAID IT. A bridge deck is land AND rim to the brush --
   walkable, and a shore -- so the finish's redraw beside it lays dirt over
   it and the meadow pass grows grass on the dirt: the islet's bridge landed
   as meadow with a cliff face under it, on a map where nothing near it had
   been cut. Every stone cell's ground tiles are kept here, and put back at
   the end wherever the cell was not cut and its neighbourhood did not move
   -- a face at a real cut is the dresser's, a bridge in a bay is his. */
  const stoneStart = new Map<string, any[]>();
  for (const t of doc.layout.tiles) {
    if (!t.file || !GROUND_LAYERS.has(t.layer)) continue;
    const k = K(t.cell[0], t.cell[1]);
    if (!stoneTop.has(k)) continue;
    let a = stoneStart.get(k);
    if (!a) {
      a = [];
      stoneStart.set(k, a);
    }
    a.push(JSON.parse(JSON.stringify(t)));
  }
  /* THE NEIGHBOURHOOD, AS FILES. A grass piece is chosen against the pieces
   beside it, so the only cells that can need re-picking are the ones whose
   eight neighbours are not the eight they had. Everything else is his, or
   was already answered, and re-picking it can only move it. */
  const topFile = () => {
    const top = new Map<string, [number, string]>();
    const LVx: Record<string, number> = {
      Dirt: 0,
      'Layer 01': 1,
      'Layer 02': 2,
      'Layer 03': 3,
      'Layer 04': 4,
    };
    for (const t of doc.layout.tiles) {
      if (!t.file || !(t.layer in LVx)) continue;
      const k = K(t.cell[0], t.cell[1]),
        lv = LVx[t.layer];
      const cur = top.get(k);
      if (!cur || lv >= cur[0]) top.set(k, [lv, t.file]);
    }
    return top;
  };
  const sigOf = (top: Map<string, [number, string]>, x: number, y: number) => {
    let s = '';
    for (let dy = 1; dy >= -1; dy--)
      for (let dx = -1; dx <= 1; dx++) s += (top.get(K(x + dx, y + dy))?.[1] ?? '~') + ';';
    return s;
  };
  const top0 = topFile();

  // 2 · erase everything that is not land. keep AND anchors: every cell of the
  // land is deliberately standing there.
  const gone = new Set<string>();
  for (const t of doc.layout.tiles) {
    if (!t.file) continue;
    const [cx, cy] = t.cell,
      k = K(cx, cy);
    if (keep.has(k) || gone.has(k)) continue;
    if (g.hasGround(cx, cy) || g.isRim(cx, cy)) gone.add(k);
  }
  /* A TERRACE CELL IS STONE OVER DIRT, and the dirt is what the model calls
   ground: erase the stone and the cell reads as land, the ring redresses
   it as a lip, and the plot next door's terrace face stands on. Every
   layer of a stone cell that is not kept goes first, so the cell is sea to
   the model before the erase looks. */
  let stripped = 0;
  for (const t of doc.layout.tiles) {
    if (!t.file || !GROUND_LAYERS.has(t.layer)) continue;
    const k = K(t.cell[0], t.cell[1]);
    if (!keep.has(k) && stoneTop.has(k)) {
      t.file = null as any;
      stripped++;
    }
  }
  if (stripped) g.reindex();
  out.stripped = stripped;
  const del = [...gone].map((k) => k.split(',').map(Number) as [number, number]);
  /* ONE GESTURE, FINISHED. `erase` alone is the autotiler with its passes;
   `finishStroke` is what the brush does on pointer-up: it shapes the
   gesture's raw cells (tread, legal outline) and redraws its own footprint
   in one call, never eating old land. `freehand`, `mouse` and `dab` score
   that route; nothing scored the raw one on a cut like this, and the raw
   one left one-cell steps at every junction. */
  /* LAND IS WHAT YOU STAND ON: the cell's TOP tile is grass or dirt. The
   ground model's `land` counts a cell with dirt under a lip, which is the
   coast, and measured that way a spit of one grass cell has two neighbours
   and stays. */
  const LV: Record<string, number> = {
    Dirt: 0,
    'Layer 01': 1,
    'Layer 02': 2,
    'Layer 03': 3,
    'Layer 04': 4,
  };
  const topLand = () => {
    const top = new Map<string, [number, string]>();
    for (const t of doc.layout.tiles) {
      if (!t.file || !(t.layer in LV)) continue;
      const k = K(t.cell[0], t.cell[1]),
        lv = LV[t.layer];
      const cur = top.get(k);
      if (!cur || lv >= cur[0]) top.set(k, [lv, t.file]);
    }
    const land = new Set<string>();
    for (const [k, [, f]] of top) if (!f.startsWith('terrain-tiles/')) land.add(k);
    return land;
  };
  const landAtStart = topLand();
  lap('start');
  g.beginStroke();
  g.erase(del, keep, keep, true);
  g.reindex();
  out.erased = del.length;
  lap('erase');

  // 2b · land the footprint claims that his island never had: cells in `keep`
  // with nothing on them at all become ground, drawn by the same brush a hand
  // would use to grow a district past his shore.
  const claimed = new Set(newIn.map((c) => K(c[0], c[1])));
  const fresh: [number, number][] = [];
  for (const k of keep) {
    const [x, y] = k.split(',').map(Number);
    if (claimed.has(k) && !g.hasGround(x, y) && !g.isRim(x, y)) fresh.push([x, y]);
  }
  if (fresh.length) {
    g.addLand(fresh, true);
    g.reindex();
  }
  out.added = fresh.length;
  /* And his sea stays sea: every cell of the shaping's reach that is neither
   his island nor claimed new land is forbidden. */
  /* Watched cell by cell: the finish turned his lip at (-39,-19) into meadow
   and hung a new lip beyond it, on a map where that shore was never cut.
   The shaping may keep or drop cells of the gesture; it may not make land
   of anything that was not land going in, except what was claimed new. */
  const forbid = new Set<string>();
  for (const k of [...gone, ...keep]) {
    const [x, y] = k.split(',').map(Number);
    for (let dx = -3; dx <= 3; dx++)
      for (let dy = -3; dy <= 3; dy++) {
        const kk = K(x + dx, y + dy);
        if (!landAtStart.has(kk) && !claimed.has(kk)) forbid.add(kk);
      }
  }
  /* AND NEVER ON HIS STONE. The finish completes its blocks the way the
   snap does, and a block half full of land beside a bridge deck, a boulder
   or a lip he drew fills the stone cell with meadow: the islet's bridge
   landed as grass with a cliff face under it. Stone that stands where it
   stood is not land the gesture may lay. */
  for (const k of stoneTop) if (!gone.has(k)) forbid.add(k);
  /* AND THE CALLER'S OWN WATER STAYS WATER. Emptied here, before the finish
   rather than after it: the finish, the regrow and the seal all read the
   ground as it stands, and a cell taken back to water afterwards leaves the
   grass beside it holding the piece it chose for a neighbour that is no
   longer there. */
  const staysWet = new Set<string>((opts.wet ?? []).map(([x, y]) => K(x, y)));
  for (const k of staysWet) forbid.add(k);
  {
    let n = 0;
    for (const t of doc.layout.tiles) {
      if (t.file && staysWet.has(K(t.cell[0], t.cell[1]))) {
        t.file = null;
        n++;
      }
    }
    if (n) g.reindex();
    out.kept_wet = staysWet.size;
  }
  out.finished = g.finishStroke(forbid, keep);
  g.reindex();
  /* WHAT THE FINISH PUT BACK IS LAID AGAIN AS LAND. Completing a block, the
   finish returns a cell the erase took -- and returns it as it found it
   after the erase: a lip drawn on dirt, land and rim at once, which the
   prune then strips to a bare square. Every returned cell is emptied and
   added as land by the autotiler, so it arrives as meadow with a ring. */
  {
    const back: [number, number][] = [];
    for (const k of [...g.land, ...g.upper])
      if (gone.has(k) && !keep.has(k)) back.push(k.split(',').map(Number) as [number, number]);
    if (back.length) {
      const bk = new Set(back.map(([x, y]) => K(x, y)));
      for (const t of doc.layout.tiles)
        if (t.file && GROUND_LAYERS.has(t.layer) && bk.has(K(t.cell[0], t.cell[1])))
          t.file = null as any;
      g.reindex();
      g.addLand(back, true);
      g.reindex();
    }
    out.back = back.length;
  }
  lap('finished');
  /* AND NO TABS IN THE LAND THAT CAME OUT. The stroke's own reshaping puts a
   one-cell spit back where the snap and the legaliser disagree, and every
   one-cell spit is dressed as a lip with a face under it that hangs off
   nothing: erased again until the outline holds still. His own shore is
   held; a spit he drew is his. */
  let spits = 0;
  for (let round = 0; round < 4; round++) {
    const land = topLand();
    const gone2: [number, number][] = [];
    for (const k of land) {
      /* Held, or his and not cut: the tidy answers the stroke, never him. */
      if (held.has(k) || (island.has(k) && !gone.has(k))) continue;
      const [x, y] = k.split(',').map(Number);
      let n = 0;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ])
        if (land.has(K(x + dx, y + dy))) n++;
      if (n <= 1) gone2.push([x, y]);
    }
    /* And no notches: a cell that is not land with land on three sides is a
     one-wide inlet, and the dresser answers it with a corner bottom in the
     middle of a lip column. It becomes land, laid by the autotiler. */
    const notch: [number, number][] = [];
    const seen = new Set<string>();
    for (const k of land) {
      const [x, y] = k.split(',').map(Number);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx,
          ny = y + dy,
          kk = K(nx, ny);
        if (land.has(kk) || seen.has(kk) || held.has(kk) || forbid.has(kk)) continue;
        /* His stone standing where it stood -- a bridge deck, a boulder in a
         bay -- has land on three sides by his own hand and is not an inlet. */
        if (island.has(kk) && !gone.has(kk)) continue;
        seen.add(kk);
        let n = 0;
        for (const [ex, ey] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ])
          if (land.has(K(nx + ex, ny + ey))) n++;
        if (n >= 3) notch.push([nx, ny]);
      }
    }
    if (!gone2.length && !notch.length) break;
    if (gone2.length) {
      g.erase(gone2, undefined, undefined, true);
      g.reindex();
    }
    if (notch.length) {
      const nk = new Set(notch.map(([x, y]) => K(x, y)));
      for (const t of doc.layout.tiles)
        if (t.file && GROUND_LAYERS.has(t.layer) && nk.has(K(t.cell[0], t.cell[1])))
          t.file = null as any;
      g.reindex();
      g.addLand(notch, true);
      g.reindex();
    }
    spits += gone2.length + notch.length;
  }
  out.spits = spits;
  /* AND THE MEADOW BACK ON EVERY CUT CELL THAT HAD IT. The finish completes a
   block with cells the erase had taken, and on a terrace the redraw skips
   them ("a plateau is authored, not autotiled"): they come back as bare
   dirt, two brown squares on the farm's north edge. `grow` is the brush's
   own restore-meadow-on-its-terrace. */
  {
    const top1 = topFileNow();
    const bald: [number, number][] = [];
    for (const k of [...g.land, ...g.upper]) {
      if (g.grass.has(k) || g.rim.has(k)) continue;
      /* Bald: no grass on top now, and not his worked ground -- a cell that
       was dirt going in is a yard or a lane and stays bare; one that was
       grass, or stone the cut took the lip off, wants its meadow. */
      const was = top0.get(k)?.[1],
        now = top1.get(k)?.[1];
      if (!now?.startsWith('terrain-grass/') && !was?.startsWith('terrain-dirt/'))
        bald.push(k.split(',').map(Number) as [number, number]);
    }
    if (bald.length) {
      g.grow(bald);
      g.reindex();
    }
    out.regrown = bald.length;
  }
  lap('finish');

  // 3 · coast with nothing behind it -- and a face with nothing above it.
  // A partition line runs through his terraces: the face row of a step is
  // this plot's and the lip and the land above it are the next plot's. With
  // the next plot gone the face stands under open water. It goes, before the
  // dressing, so the ring forms on the land below it instead.
  let orphans = 0;
  for (let pass = 0; pass < 4; pass++) {
    const loose: [number, number][] = [];
    const top2 = topFileNow();
    for (const t of doc.layout.tiles) {
      const [cx, cy] = t.cell;
      if (!t.file || !t.file.startsWith('terrain-tiles/')) continue;
      const sh = shapeOf(t.file);
      if ((sh === 'edge-S' || sh.startsWith('inner-S')) && !top2.has(K(cx, cy + 1))) {
        loose.push([cx, cy]);
        continue;
      }
    }
    for (const t of doc.layout.tiles) {
      const [cx, cy] = t.cell;
      if (!t.file || keep.has(K(cx, cy))) continue;
      if (g.hasGround(cx, cy) || !g.isRim(cx, cy)) continue;
      let backed = false;
      for (let dx = -2; dx <= 2 && !backed; dx++)
        for (let dy = -2; dy <= 2 && !backed; dy++)
          if (g.hasGround(cx + dx, cy + dy)) backed = true;
      if (!backed) loose.push([cx, cy]);
    }
    if (!loose.length) break;
    g.erase(loose, undefined, undefined, true);
    g.reindex();
    orphans += loose.length;
  }
  out.orphan_coast = orphans;
  lap('orphans');

  // 4 · pockets the sea cannot reach
  const occ = new Set(doc.layout.tiles.filter((t) => t.file).map((t) => K(t.cell[0], t.cell[1])));
  let bx0 = 1e9,
    by0 = 1e9,
    bx1 = -1e9,
    by1 = -1e9;
  for (const k of occ) {
    const [x, y] = k.split(',').map(Number);
    bx0 = Math.min(bx0, x);
    bx1 = Math.max(bx1, x);
    by0 = Math.min(by0, y);
    by1 = Math.max(by1, y);
  }
  bx0 -= 2;
  by0 -= 2;
  bx1 += 2;
  by1 += 2;
  const wet = new Set([K(bx0, by0)]),
    st: [number, number][] = [[bx0, by0]];
  while (st.length) {
    const [x, y] = st.pop()!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        ny = y + dy,
        k = K(nx, ny);
      if (nx < bx0 || nx > bx1 || ny < by0 || ny > by1 || wet.has(k) || occ.has(k)) continue;
      wet.add(k);
      st.push([nx, ny]);
    }
  }
  const pockets: [number, number][] = [];
  for (let y = by0; y <= by1; y++)
    for (let x = bx0; x <= bx1; x++) {
      const k = K(x, y);
      if (!occ.has(k) && !wet.has(k)) pockets.push([x, y]);
    }
  if (pockets.length) {
    g.addLand(pockets, true);
    g.reindex();
  }
  out.pockets = pockets.length;
  g.seal();
  g.reindex();
  lap('seal');
  const landBefore = topLand();

  // 5 · dress the new shore: redress pinned to the band whose mask moved, bonds
  // held; the meadow passes cascade from the margin round the cut.
  const MARGIN = 6;
  let scope = new Set<string>();
  const band = new Set<string>();
  for (const t of doc.layout.tiles) {
    if (!t.file) continue;
    const [x, y] = t.cell,
      k = K(x, y);
    if (band.has(k)) continue;
    if (was.get(k) !== maskOf(x, y)) band.add(k);
  }
  {
    const top1 = topFile();
    const cand = new Set<string>();
    for (const k of gone) {
      const [x, y] = k.split(',').map(Number);
      for (let dx = -MARGIN; dx <= MARGIN; dx++)
        for (let dy = -MARGIN; dy <= MARGIN; dy++) cand.add(K(x + dx, y + dy));
    }
    for (const k of cand) {
      const [x, y] = k.split(',').map(Number);
      if (sigOf(top0, x, y) !== sigOf(top1, x, y)) scope.add(k);
    }
  }
  const bondHalf = new Set<string>();
  for (const [top, bot] of Object.entries((atlas as any).coast.bonds as Record<string, number>)) {
    bondHalf.add(`terrain-tiles/TX Tileset Terrain_${top}.png`);
    bondHalf.add(`terrain-tiles/TX Tileset Terrain_${bot}.png`);
  }
  let heldBonds = 0;
  for (const t of doc.layout.tiles)
    if (t.file && bondHalf.has(t.file) && band.delete(K(t.cell[0], t.cell[1]))) heldBonds++;
  out.band = band.size;
  out.bonds_held = heldBonds;
  /* THE CASCADE IS BOUNDED. Each round hands the next the cells it moved,
   which is right on a composed map and runs away on his: a first round
   that touches two cells at the cut re-picks their neighbours, and theirs,
   until it has re-picked a thousand of his tiles a whole island away from
   anything that changed. Nothing outside the margin round the cut is ever
   asked. */
  const reach = new Set<string>();
  for (const k of gone) {
    const [x, y] = k.split(',').map(Number);
    for (let dx = -MARGIN; dx <= MARGIN; dx++)
      for (let dy = -MARGIN; dy <= MARGIN; dy++) reach.add(K(x + dx, y + dy));
  }
  /* WORKED GROUND IS AUTHORED. `verge` and `relegalise` answer a shape he
   never drew by laying meadow over a bare cell, which is right for a road
   the composer cut and wrong here: a yard, a lane, a dug trail an agent
   walks is bare on purpose, and paved it is a path with a hole in it. A
   cell that was dirt going in is never theirs. */
  const bareStart = new Set<string>();
  for (const [k, v] of top0) if (v[1]?.startsWith('terrain-dirt/')) bareStart.add(k);
  let rounds = 0,
    moved = 0;
  for (let i = 0; i < 16; i++) {
    const hit = new Set<string>();
    const meadowScope = new Set([...scope].filter((k) => !bareStart.has(k)));
    let did = mode === 'none' ? 0 : redress(doc, atlas, 1, mode === 'all' ? undefined : band, hit);
    if (WATCH.length) lap('  redress');
    did += verge(doc, atlas, 1, meadowScope, hit);
    if (WATCH.length) lap('  verge');
    did += relegalise(doc, atlas, 1, meadowScope, hit, bareStart);
    if (WATCH.length) lap('  relegalise');
    did += resurface(doc, atlas, 1, scope, hit);
    if (WATCH.length) lap('  resurface');
    scope = new Set([...hit].filter((k) => reach.has(k)));
    rounds++;
    moved += did;
    if (!did || !scope.size) break;
  }
  g.reindex();
  g.seal();
  g.reindex();
  out.rounds = rounds;
  out.dressed = moved;
  lap('dress');

  // 5a · HIS STRUCTURE, ENFORCED, ONCE, AFTER EVERYTHING.
  //
  // Measured on his map: outside the land there is the ring (every cell that
  // touches land, at a side or a diagonal) and under a ring cell one row of
  // face, and nothing else, ever. The dressing passes do not know that: the
  // grass repairs grow a lone grass cell BELOW the face row when a signature
  // has no answer, and the ring then dresses round it -- a tab of meadow in
  // the sea with its own lip and face. So the land is fixed as it stood before
  // the dressing, and anything that has strayed past its ring and face row is
  // taken back to water. No re-pick afterwards: a re-pick is how the strays
  // got there.
  const L0 = new Set<string>(landBefore);
  const adj8 = (x: number, y: number) => {
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) if ((dx || dy) && L0.has(K(x + dx, y + dy))) return true;
    return false;
  };
  const adj4 = (x: number, y: number) =>
    L0.has(K(x + 1, y)) || L0.has(K(x - 1, y)) || L0.has(K(x, y + 1)) || L0.has(K(x, y - 1));
  const stone = new Set<string>();
  for (const t of doc.layout.tiles)
    if (t.file?.startsWith('terrain-tiles/')) stone.add(K(t.cell[0], t.cell[1]));
  const nearGone = (x: number, y: number) => {
    for (let dx = -2; dx <= 2; dx++)
      for (let dy = -2; dy <= 2; dy++) if (gone.has(K(x + dx, y + dy))) return true;
    return false;
  };
  const legal = (x: number, y: number, file: string) => {
    const k = K(x, y);
    if (L0.has(k)) return true;
    if (file.startsWith('terrain-grass/')) return adj4(x, y);
    if (!file.startsWith('terrain-tiles/')) return true;
    if (adj4(x, y)) return true; // the ring, beside land
    if (adj8(x, y)) {
      // the ring, at a diagonal:
      // an outer corner, and it continues a lip line -- his corner pieces
      // always have a side-ring stone above or beside them
      for (const [dx, dy] of [
        [0, 1],
        [1, 0],
        [-1, 0],
      ]) {
        const kk = K(x + dx, y + dy);
        if (!L0.has(kk) && adj4(x + dx, y + dy) && stone.has(kk)) return true;
      }
      return false;
    }
    if (adj8(x, y + 1) && !L0.has(K(x, y + 1))) {
      // the face row
      // and not the third stone in a column under land: his south shore is
      // two rows, 156 columns of 158
      return !L0.has(K(x, y + 2)) || true;
    }
    return false;
  };
  const pruned = new Set<string>();
  const prunedWhat: string[] = [];
  for (const t of doc.layout.tiles) {
    if (!t.file) continue;
    const [x, y] = t.cell,
      k = K(x, y);
    /* His, and nowhere near the cut: never. His terraces stack stone three
     deep and the rule below is about the sea. */
    if (orig.has(k + '|' + t.file) && (adj8(x, y) || !nearGone(x, y))) continue;
    if (legal(x, y, t.file)) continue;
    prunedWhat.push(k + ' ' + t.layer + ' ' + t.file.split('/').pop());
    t.file = null as any;
    pruned.add(k);
  }
  void prunedWhat;
  out.pruned = pruned.size;
  if (pruned.size) {
    g.reindex();
    g.seal();
    g.reindex();
  }
  lap('pruned');

  // 5a1 · A BOND IS ONE OBJECT ON TWO CELLS. `redress` with the bonds held
  // still re-picks a lip whose face was cut, and the face under it is then
  // the bottom of some other piece: 194 over 229 where he had 46 over 78.
  // The atlas names every pair; a top with the wrong bottom under it gets
  // its own bottom, on a cell that is face row and nothing else.
  {
    const bonds: Record<string, number> = (atlas as any).coast.bonds;
    const topOf = new Map<string, string>();
    const botOf = new Map<string, string>();
    const F = (n: string | number) => `terrain-tiles/TX Tileset Terrain_${n}.png`;
    for (const [t, b] of Object.entries(bonds)) {
      topOf.set(F(t), F(b));
      botOf.set(F(b), F(t));
    }
    const at = new Map<string, any>();
    for (const t of doc.layout.tiles)
      if (t.file?.startsWith('terrain-tiles/')) at.set(K(t.cell[0], t.cell[1]), t);
    let mended = 0;
    for (const [k, t] of at) {
      const want = topOf.get(t.file);
      if (!want) continue;
      const [x, y] = k.split(',').map(Number);
      const below = at.get(K(x, y - 1));
      if (!below || below.file === want || L0.has(K(x, y - 1))) continue;
      if (orig.has(K(x, y - 1) + '|' + below.file)) continue;
      below.file = want;
      mended++;
    }
    out.mended = mended;
    if (mended) g.reindex();
  }

  // 5a1b · HIS STONE STANDS. See `stoneStart`. Rounds, because putting one
  // cell back is what makes its neighbour's neighbourhood his again.
  for (let round = 0; round < 4; round++) {
    let restored = 0;
    const cur = new Map<string, number[]>();
    doc.layout.tiles.forEach((t, i) => {
      if (!t.file || !GROUND_LAYERS.has(t.layer)) return;
      const k = K(t.cell[0], t.cell[1]);
      if (!stoneStart.has(k)) return;
      let a = cur.get(k);
      if (!a) {
        a = [];
        cur.set(k, a);
      }
      a.push(i);
    });
    const drop = new Set<number>();
    for (const [k, orig] of stoneStart) {
      if (gone.has(k)) continue;
      const [x, y] = k.split(',').map(Number);
      if (was.get(k) !== maskOf(x, y)) continue;
      const now = (cur.get(k) ?? []).map((i) => doc.layout.tiles[i]);
      const same =
        now.length === orig.length &&
        orig.every((o) => now.some((t) => t.layer === o.layer && t.file === o.file));
      if (same) continue;
      for (const i of cur.get(k) ?? []) drop.add(i);
      for (const o of orig) doc.layout.tiles.push(JSON.parse(JSON.stringify(o)));
      restored++;
    }
    if (drop.size) doc.layout.tiles = doc.layout.tiles.filter((_, i) => !drop.has(i));
    if (restored) g.reindex();
    out.stone_restored = (out.stone_restored ?? 0) + restored;
    if (!restored) break;
  }

  // 5a2 · AND NOTHING STANDS WHERE THE GROUND WENT. The caller keeps the
  // objects that stand on the asked land; the shaping then trims that land
  // by a cell here and there, and a birch was left standing in the sea off
  // the empty island. An object whose cell had ground going in and has none
  // coming out goes with the ground. A jetty over water never had ground.
  {
    // A birch of his stood on a lip cell, so "had ground" is "had a tile":
    // stone counts, a jetty's open water does not.
    const tiledEnd = new Set<string>();
    for (const t of doc.layout.tiles)
      if (t.file && GROUND_LAYERS.has(t.layer)) tiledEnd.add(K(t.cell[0], t.cell[1]));
    const n0 = doc.layout.objects.length;
    doc.layout.objects = doc.layout.objects.filter((o) => {
      if (o.prefab === 'PF Top Down Pixel Water') return true;
      const k = K(Math.floor(o.pos[0]), Math.floor(o.pos[1]));
      if (!island.has(k)) return true;
      return tiledEnd.has(k);
    });
    out.swept_objects = n0 - doc.layout.objects.length;
  }

  // 5b · records that draw nothing, and shadows with nothing left to shade
  const lit = new Set<string>();
  for (const t of doc.layout.tiles)
    if (t.file && !t.layer.endsWith('- Shadow')) lit.add(K(t.cell[0], t.cell[1]));
  const tiles0 = doc.layout.tiles.length;
  doc.layout.tiles = doc.layout.tiles.filter(
    (t) => t.file && (!t.layer.endsWith('- Shadow') || lit.has(K(t.cell[0], t.cell[1])))
  );
  out.swept_tiles = tiles0 - doc.layout.tiles.length;

  const land = new Set<string>();
  for (const t of doc.layout.tiles) land.add(K(t.cell[0], t.cell[1]));
  out.land = land.size;
  let lost = 0;
  for (const k of keep) if (!land.has(k)) lost++;
  out.lost = lost;
  delete (doc.layout as any).nav;

  return out;
}
