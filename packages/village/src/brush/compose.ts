/* Composing the map from the state of its settlements.

   THIS IS THE GROWTH ENGINE, not a filter for looking at things. Today a
   settlement is either present or absent; tomorrow it is present at stage 1-5,
   and stage 1 is the same operation with a smaller set of cells kept. Everything
   here is written for the second case and exercised by the first.

   The one decision that matters: composition is a PURE DERIVATION from a
   pristine base, never an incremental edit to whatever is on screen.

     compose(base, states) -> map

   Mutating in place -- erase this settlement, undo to bring it back -- is the
   obvious build and it is wrong for three reasons, all of which bite the moment
   growth is real rather than a checkbox:

   1. ORDER WOULD MATTER. Erasing A then B does not leave the same coast as B
      then A: a cut runs one cell past its own footprint (see `roughen`), so
      whoever goes second inherits an edge the first one moved. Hiding two
      settlements would depend on which checkbox was clicked first.
   2. IT WOULD DRIFT. Cuts do not perfectly invert. Toggling one settlement
      twenty times must land on exactly the map you started with, or an
      afternoon of testing quietly rots the coastline.
   3. STAGES ARE NOT A SEQUENCE. A project going 3 -> 1 -> 4 is not three edits;
      it is three different maps, each derived from the same base.

   Recomposing costs a rebuild of the scene graph (~16ms) and one erase pass.
   That is affordable per toggle and it buys determinism, which is not.

   Determinism holds because the only randomness in the terrain rules is
   `cellHash(x, y)` -- positional, so the same cells always cut the same shore. */

import type { Document, Layout } from '../doc/document';
import type { Settlements } from '../doc/settlements';
import { cellHash } from '../scene/terrain';
import {
  components,
  describe as describeNav,
  joinAll,
  router,
  solidCells,
  walkableAt,
  type Place,
  type Route,
} from './nav';
import { redress, relegalise, resurface, verge, type Atlas } from './redress';
import type { Ground } from './terrainBrush';
import { dressCoast, fillIn } from './weave';

/** What a settlement currently is. `stage` is carried now and unused now: the
    composer is where it will be read, and having the shape settled means adding
    stages does not move this file's boundaries. */
export interface SettlementState {
  /** Absent: no project has settled here, so neither the ground nor anything
      standing on it is part of the map. */
  present: boolean;
  /** 1-5 once growth exists. 5 is the demo as the artist built it. */
  stage: number;
  /** Where you want it, relative to where the artist put it. The solver treats
      this as the STARTING position rather than the final one: it still slides
      the settlement back until it is as close to its neighbour as it originally
      was, so a nudge that would tear the village apart is taken as far as it can
      be and no further. Moving things about is therefore always safe -- the
      worst a nudge can do is not fully happen. */
  nudge?: [number, number];
}

export const FULL: SettlementState = { present: true, stage: 5 };

export type States = Map<string, SettlementState>;

/** How much ground a settlement holds at each stage, as a share of the ground
    it holds at 5.

    Area rather than radius, because area is what reads as size from above: a
    settlement at stage 3 should look about half the place stage 5 is, and
    halving the radius would leave it a quarter. The curve is steeper at the
    bottom so 1 is unmistakably a foothold rather than a slightly smaller
    village. */
export const STAGE_AREA = [0, 0.1, 0.24, 0.45, 0.7, 1.0];

/** Commons that stand APART from the village and keep their own ground.

    The offshore island is reached by a bridge and the camp sits out on a tail
    end of the map, and in the base neither is part of the village proper. They
    are going to carry meaning in the ADE -- the island as a settings anchor, the
    camp as the signpost that adds a project -- so they have to stay legible as
    separate places wherever the layout puts them. They travel, they keep their
    silhouette, and the map is never allowed to weld them onto the mainland. */
export const DETACHED = new Set<string>([]);

/** How much water to leave between a detached common and the village. Enough to
    read as a crossing rather than a seam, not so much that it drifts off. */
export const DETACHED_GAP = 4;

/** How deep a band of wilderness a cell can carry, in cells. The very middle of
    the demo stands 20-odd cells from any shore, and reproducing that around one
    lone settlement would drown it in woodland -- the cap is what stops a single
    project filling half a sea. */
export const DEPTH_CAP = 12;

/** How far the coastline runs before it may turn. The artist's own straight
    stretches run a median of 2-3 cells; every turn costs one outer-corner
    piece, and the count of those is what the critic scores as E8. */
export const TREAD = 2;

/** Snap an outline to whole blocks of `TREAD` cells. See the note at the call
    site: every straight run comes out at least two cells long, and the count of
    convex corners -- which is the count of cells that can only be dressed with
    an outer-corner piece -- halves by construction.

    RUN AFTER EVERYTHING THAT SHAPES THE LAND, and that is not one place. The
    stitch that joins a stray piece to the village draws a neck out of discs
    along a straight line, and a line at 45 degrees is a staircase again: ten
    settlements at their smallest are joined by one long isthmus, and every
    corner of it was a stone slab stepping out to sea. */

/** Make every shape in an outline one the artist drew.

    Extracted so the composer and anything else that stamps land run the SAME
    pass rather than two of them. A harness that shapes its own islands is
    testing its own geometry and not this one: measured on eleven hand-stamped
    blobs that skipped it, 17% of their coast cells landed on a signature that
    appears nowhere in his village, and for those there is no legal piece to
    reach for at all -- so whatever gets drawn there is a guess, and the
    shoreline reads as wrong however good the tagging is. */
export function legaliseOutline(wantLand: Set<string>, atlas: Atlas) {
  {
    const legal = new Set<number>();
    /* AND A SIGNATURE WHOSE ONLY ANSWERS COME IN PAIRS IS NOT A LEGAL SHAPE.

         23 sprites are the top half of a two-cell object: 97 is 129's top, 99
         is 131's. Where a cell's whole vocabulary is such pieces, the shore
         can only be drawn there if the cell BELOW can take the other half --
         and if it cannot, the dresser has three ends and all of them are lies:
         force the face where it does not belong (E7), leave the lip hanging
         (C3), or reach for a piece he never drew here. Two cells on one state
         ended in exactly that dead end, and the fault is the OUTLINE, not the
         tile -- so it is settled here, where the repair costs one cell of
         wilderness and cannot leave a seam. */
    const solo = new Set<number>();
    const bonds =
      (atlas as unknown as { coast?: { bonds?: Record<string, number> } }).coast?.bonds ?? {};
    const at = new Map<number, number[]>();
    const sigsOf = new Map<number, Set<number>>();
    for (const [rel, rec] of Object.entries(atlas.tiles)) {
      if (!COAST_KINDS.has(rec.kind) || rec.facing_from !== 'artist') continue;
      const nn = Number(rel.match(/_(\d+)\.png$/)?.[1]);
      sigsOf.set(nn, new Set(rec.facing));
      for (const s of rec.facing) {
        legal.add(s);
        const a = at.get(s);
        if (a) a.push(nn);
        else at.set(s, [nn]);
        if (bonds[String(nn)] === undefined) solo.add(s);
      }
    }
    /** Can this cell be dressed at all -- with a piece that needs no partner,
          or with one whose partner is legal in the cell below? */
    const dressable = (x: number, y: number) => {
      const sg = sigAt(x, y);
      if (!legal.has(sg)) return false;
      if (solo.has(sg)) return true;
      const belowSig = sigAt(x, y - 1);
      return (at.get(sg) ?? []).some((n) => sigsOf.get(bonds[String(n)])?.has(belowSig) ?? false);
    };
    const sigAt = (x: number, y: number) => {
      let s = 0;
      for (const [dx, dy, bit] of SIG8) if (wantLand.has(x + dx + ',' + (y + dy))) s |= bit;
      return s;
    };
    /* A ring cell is one the coast will be drawn on: not land itself, but with
         land somewhere in its eight. */
    const isRing = (x: number, y: number) => {
      if (wantLand.has(x + ',' + y)) return false;
      for (const [dx, dy] of SIG8) if (wantLand.has(x + dx + ',' + (y + dy))) return true;
      return false;
    };
    const badAround = (x: number, y: number, r: number) => {
      let n = 0;
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          const cx = x + dx,
            cy = y + dy;
          if (!isRing(cx, cy)) continue;
          if (!dressable(cx, cy)) n++;
        }
      }
      return n;
    };
    for (let pass = 0; pass < 10; pass++) {
      const bad: [number, number][] = [];
      const seen = new Set<string>();
      for (const k of wantLand) {
        const c = k.indexOf(',');
        const x = Number(k.slice(0, c)),
          y = Number(k.slice(c + 1));
        for (const [dx, dy] of SIG8) {
          const nx = x + dx,
            ny = y + dy,
            nk = nx + ',' + ny;
          if (seen.has(nk) || wantLand.has(nk)) continue;
          seen.add(nk);
          if (!dressable(nx, ny)) bad.push([nx, ny]);
        }
      }
      if (!bad.length) break;
      let fixed = 0;
      for (const [x, y] of bad) {
        if (wantLand.has(x + ',' + y) || dressable(x, y)) continue;
        const before = badAround(x, y, 3);
        let best: string | null = null,
          bestN = before;
        for (const [dx, dy] of [
          [0, 0],
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const k = x + dx + ',' + (y + dy);
          if (wantLand.has(k)) continue;
          wantLand.add(k);
          const after = badAround(x, y, 3);
          wantLand.delete(k);
          if (after < bestN) {
            bestN = after;
            best = k;
          }
        }
        if (best) {
          wantLand.add(best);
          fixed++;
        }
      }
      if (!fixed) break;
    }
  }
}

/** HIS LONGEST STRAIGHT STRETCH IS 15. A run longer than that is a ruler, and
    a ruler is the one thing a coastline is not.

    `snapToTread` fixes the opposite fault -- it stops the outline turning
    every cell -- and having fixed it, nothing then stops a stretch running
    twelve cells without a thought in it. This walks each over-long run and
    puts a two-cell jog in it, at a position taken from a hash of the run so
    the same land always wanders the same way.

    EIGHT, NOT FIVE, AND THE TRADE IS SCORED RATHER THAN TAKEN. Every jog costs
    an outer corner, and corners are what `E8` counts: breaking at five took a
    test island's longest run to 4 and its corner rate from 14.5% to 21.7%. A
    coast that never runs past four is as mechanical as one that runs twelve,
    it just fails in the other direction. Three points a cell of over-long edge
    against one a corner -- it will spend a corner to break a twelve and will
    not spend one to break a nine -- and every jog is rolled back if it makes a
    shape he never drew or a channel under four cells wide. */
const WANDER_OVER = 8;

export function wander(cells: Set<string>, held: Set<string>, atlas: Atlas | null) {
  if (!atlas) return;
  const legal = new Set<number>();
  for (const rec of Object.values(atlas.tiles)) {
    if (!COAST_KINDS.has(rec.kind) || rec.facing_from !== 'artist') continue;
    for (const s of rec.facing) legal.add(s);
  }
  const has = (x: number, y: number) => cells.has(x + ',' + y);
  const sigAt = (x: number, y: number) => {
    let s = 0;
    for (const [dx, dy, bit] of SIG8) if (has(x + dx, y + dy)) s |= bit;
    return s;
  };
  const score = () => {
    let bad = 0,
      over = 0,
      corner = 0,
      narrow = 0;
    const ring = new Set<string>();
    for (const k of cells) {
      const c = k.indexOf(',');
      const x = Number(k.slice(0, c)),
        y = Number(k.slice(c + 1));
      for (const [dx, dy] of SIG8) if (!has(x + dx, y + dy)) ring.add(x + dx + ',' + (y + dy));
    }
    for (const k of ring) {
      const c = k.indexOf(',');
      const x = Number(k.slice(0, c)),
        y = Number(k.slice(c + 1));
      if (!legal.has(sigAt(x, y))) bad++;
      const card = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dy]) => has(x + dx, y + dy));
      const diag = [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ].some(([dx, dy]) => has(x + dx, y + dy));
      if (!card && diag) corner++;
    }
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const along = dx ? [0, 1] : [1, 0];
      const edge = new Set<string>();
      for (const k of cells) {
        const c = k.indexOf(',');
        const x = Number(k.slice(0, c)),
          y = Number(k.slice(c + 1));
        if (!has(x + dx, y + dy)) edge.add(k);
      }
      const seen = new Set<string>();
      for (const k of edge) {
        if (seen.has(k)) continue;
        const c = k.indexOf(',');
        let x = Number(k.slice(0, c)),
          y = Number(k.slice(c + 1));
        let n = 0;
        while (edge.has(x + ',' + y)) {
          seen.add(x + ',' + y);
          n++;
          x += along[0];
          y += along[1];
        }
        over += Math.max(0, n - WANDER_OVER);
      }
    }
    /* A CHANNEL UNDER FOUR CELLS IS NOT WATER -- one cell each side becomes the
       cliff, so two cliffs meet and nothing shows between them. A bump can make
       one by reaching across a strait. */
    for (const k of cells) {
      const c = k.indexOf(',');
      const x = Number(k.slice(0, c)),
        y = Number(k.slice(c + 1));
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
      ]) {
        for (let g = 1; g < 4; g++) {
          if (
            has(x + dx * (g + 1), y + dy * (g + 1)) &&
            ![...Array(g).keys()].some((i) => has(x + dx * (i + 1), y + dy * (i + 1)))
          )
            narrow++;
        }
      }
    }
    return bad * 1000 + narrow * 1000 + corner + over * 3;
  };
  for (let round = 0; round < 6; round++) {
    let moved = 0;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const along = dx ? [0, 1] : [1, 0];
      const edge = new Set<string>();
      for (const k of cells) {
        const c = k.indexOf(',');
        const x = Number(k.slice(0, c)),
          y = Number(k.slice(c + 1));
        if (!has(x + dx, y + dy)) edge.add(k);
      }
      const seen = new Set<string>();
      for (const k of [...edge].sort()) {
        if (seen.has(k)) continue;
        const c = k.indexOf(',');
        let x = Number(k.slice(0, c)),
          y = Number(k.slice(c + 1));
        const run: [number, number][] = [];
        while (edge.has(x + ',' + y)) {
          seen.add(x + ',' + y);
          run.push([x, y]);
          x += along[0];
          y += along[1];
        }
        if (run.length <= WANDER_OVER) continue;
        const i =
          1 + (cellHash(run[0][0] * 7 + run.length, run[0][1] * 13) % Math.max(run.length - 3, 1));
        const pair = run.slice(i, i + 2);
        if (pair.length < 2 || pair.some(([px, py]) => held.has(px + ',' + py))) continue;
        const before = score();
        const out = pair.map(([px, py]) => px + dx + ',' + (py + dy));
        out.forEach((kk) => cells.add(kk));
        if (score() <= before) {
          moved++;
          continue;
        }
        out.forEach((kk) => cells.delete(kk));
      }
    }
    if (!moved) break;
  }
}

/** @param fill  whether a held cell forces its whole block to fill. TRUE for the
    composer, which is snapping a settlement's footprint and wants whole blocks.
    FALSE for the brush: a held cell there is a cell the pointer was actually
    over, and completing its block turns a one-cell click into a 2x2 stamp --
    "even a 1x1 brush creates a much bigger footprint". Held-without-fill lets
    the cell stand on its own and leaves `legaliseOutline` to pad it only if the
    shape it makes is one the vocabulary cannot draw. */
export function snapToTread(cells: Set<string>, held: Set<string>, fill = true) {
  const B = TREAD;
  const blocks = new Map<string, { n: number; keep: boolean; cells: string[] }>();
  for (const k of cells) {
    const c = k.indexOf(',');
    const x = Number(k.slice(0, c)),
      y = Number(k.slice(c + 1));
    const bk = Math.floor(x / B) + ',' + Math.floor(y / B);
    let b = blocks.get(bk);
    if (!b) {
      b = { n: 0, keep: false, cells: [] };
      blocks.set(bk, b);
    }
    b.n++;
    b.cells.push(k);
    if (held.has(k)) b.keep = true;
  }
  for (const [bk, b] of blocks) {
    const c = bk.indexOf(',');
    const bx = Number(bk.slice(0, c)) * B,
      by = Number(bk.slice(c + 1)) * B;
    if (b.n * 2 >= B * B || (b.keep && fill)) {
      for (let dx = 0; dx < B; dx++)
        for (let dy = 0; dy < B; dy++) {
          cells.add(bx + dx + ',' + (by + dy));
        }
    } else {
      for (const k of b.cells) if (!held.has(k)) cells.delete(k);
    }
  }
}

/** The eight, as (dx, dy, bit), in the order `atlas.json` records a facing. */
const SIG8: [number, number, number][] = [
  [0, 1, 1],
  [1, 0, 2],
  [0, -1, 4],
  [-1, 0, 8],
  [1, 1, 16],
  [1, -1, 32],
  [-1, -1, 64],
  [-1, 1, 128],
];
const COAST_KINDS = new Set(['cliff-outer', 'cliff-inner', 'cliff-side', 'ledge', 'boulders']);

/** The cells a settlement holds at a given stage: the ones nearest its heart,
    grown outward until the area is right.

    BREADTH-FIRST FROM THE HEART, not "keep everything within a radius". A
    settlement is not a disc -- it runs along a shore or up a valley -- and
    taking a circle out of it would cut it into pieces and leave the far half
    floating. Growing outward from one cell guarantees whatever survives is a
    single connected place, whatever shape the original was.

    The heart is where its buildings are, so shrinking retreats toward the built
    part and growing spreads back out over the fields, which is the way a real
    settlement contracts. Distance breaks ties so the edge stays round rather
    than following the order cells happen to be stored in. */
export function stageCells(
  all: [number, number][],
  heart: [number, number],
  stage: number
): Set<string> {
  const want = Math.max(1, Math.round(all.length * (STAGE_AREA[stage] ?? 1)));
  if (want >= all.length) return new Set(all.map(([x, y]) => x + ',' + y));

  const pool = new Set(all.map(([x, y]) => x + ',' + y));
  const kept = new Set<string>();
  const d2 = (k: string) => {
    const c = k.indexOf(',');
    const dx = Number(k.slice(0, c)) - heart[0],
      dy = Number(k.slice(c + 1)) - heart[1];
    return dx * dx + dy * dy;
  };
  /* Start at the pool cell closest to the heart -- the heart itself can sit on
     a cell the settlement does not own, since a building's pivot is its
     ground-contact point and can be a cell over. */
  let seed = '';
  let best = Infinity;
  for (const k of pool) {
    const d = d2(k);
    if (d < best) {
      best = d;
      seed = k;
    }
  }

  const frontier = new Map<string, number>([[seed, d2(seed)]]);
  while (kept.size < want && frontier.size) {
    let pick = '',
      pd = Infinity;
    for (const [k, d] of frontier)
      if (d < pd) {
        pd = d;
        pick = k;
      }
    frontier.delete(pick);
    kept.add(pick);
    const c = pick.indexOf(',');
    const x = Number(pick.slice(0, c)),
      y = Number(pick.slice(c + 1));
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const n = x + dx + ',' + (y + dy);
      if (pool.has(n) && !kept.has(n) && !frontier.has(n)) frontier.set(n, d2(n));
    }
  }
  return kept;
}

/** A deep copy of the layout, taken once at load. Everything composes from
    this, so it must never be handed out by reference. */
export function pristine(layout: Layout): Layout {
  return structuredClone(layout);
}

/** Which settlement an object belongs to.

    The cell under its pivot if that is owned; otherwise the nearest owned cell,
    searched outward. The search is what catches the things that stand off the
    edge of the land on purpose -- docks, piers, the jetty planks -- which have
    no owner underneath them at all. 4 cells is past the longest of them and
    short enough that it cannot reach across a strait to the wrong village. */
const REACH = 4;

export function ownerNear(s: Settlements, x: number, y: number): string | undefined {
  const cx = Math.floor(x),
    cy = Math.floor(y);
  const here = s.at(cx, cy);
  if (here) return here;
  for (let r = 1; r <= REACH; r++) {
    let best: string | undefined;
    let bestD = Infinity;
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const id = s.at(cx + dx, cy + dy);
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
}

/** Who touches whom, from the artist's own arrangement. */
export function adjacency(settlements: Settlements): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const [k, id] of settlements.entries()) {
    const c = k.indexOf(',');
    const x = Number(k.slice(0, c)),
      y = Number(k.slice(c + 1));
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const n = settlements.at(x + dx, y + dy);
      if (!n || n === id) continue;
      if (!out.has(id)) out.set(id, new Set());
      out.get(id)!.add(n);
    }
  }
  return out;
}

/** Slide every settlement back into contact with its neighbour.

    THIS IS WHAT MAKES THE MAP ELASTIC. A settlement that shrinks pulls its edge
    away from whoever it was touching, and without this the map is left with a
    channel of sea where the two used to meet -- worse, anything that reached the
    rest of the village THROUGH it becomes an island. Taking the hay farm from
    stage 5 to 4 set the fishing hamlet adrift, 327 cells of it floating off the
    north-west coast, because the hamlet only ever reached the mainland across
    the farm's fields.

    The rule is deliberately the simplest one that cannot make a mess:

    * ONE ANCHOR STAYS PUT -- the largest settlement. Something has to, or the
      whole village drifts and every stage change is a camera move.
    * EVERY OTHER FOLLOWS ITS PARENT along the spanning tree of who touched whom,
      nearest-first. Directions are preserved because each settlement slides
      along the line to its parent, never sideways: the village keeps the shape
      the artist gave it and only the spacing changes.
    * A CHILD CARRIES ITS OWN CHILDREN. Sliding a settlement that something else
      hangs off has to take that with it, or closing one gap opens another
      further out.

    It slides in whole cells, one at a time, and stops the moment it is touching
    -- so it closes the gap exactly and never overlaps. */
export function solveOffsets(
  settlements: Settlements,
  held: Map<string, Set<string>>,
  isGround: (x: number, y: number) => boolean = () => true,
  /** Hand-placed starting offsets, before any sliding. */
  nudges: Map<string, [number, number]> = new Map(),
  /** The ground as it was BEFORE this composition cut anything, used only to
      measure the gap each pair is supposed to end up with. Measuring that on
      what survives makes the target equal to the gap that already exists, so
      nothing ever moves -- twice now. */
  wasGround: (x: number, y: number) => boolean = isGround
): Map<string, [number, number]> {
  const offs = new Map<string, [number, number]>();
  for (const s of settlements.list) offs.set(s.id, [0, 0]);

  /* CONTACT IS GROUND MEETING GROUND, not territory meeting territory.
     A settlement owns its coast rim as well as its fields, and a rim cell is a
     cliff edge rather than somewhere you can walk. Sliding until the OWNED sets
     touch parks two settlements rim to rim with the sea still between them --
     which looks joined on the partition and leaves the map in two pieces. */
  const solid = new Map<string, Set<string>>();
  for (const s of settlements.list) {
    const out = new Set<string>();
    for (const k of held.get(s.id) ?? []) {
      const c = k.indexOf(',');
      if (isGround(Number(k.slice(0, c)), Number(k.slice(c + 1)))) out.add(k);
    }
    solid.set(s.id, out);
  }

  const live = settlements.list.filter((s) => (solid.get(s.id)?.size ?? 0) > 0);
  if (live.length < 2) return offs;

  const adj = adjacency(settlements);
  const anchor = live.reduce((a, b) => (solid.get(a.id)!.size >= solid.get(b.id)!.size ? a : b)).id;

  const centre = (id: string, off: [number, number]): [number, number] => {
    const cells = solid.get(id)!;
    let sx = 0,
      sy = 0;
    for (const k of cells) {
      const c = k.indexOf(',');
      sx += Number(k.slice(0, c));
      sy += Number(k.slice(c + 1));
    }
    return [sx / cells.size + off[0], sy / cells.size + off[1]];
  };

  /* Placed ground, as a set, so contact is a cheap lookup. Grown as the tree is
     walked: a child slides until it meets what has already been placed, which
     is how a chain of settlements ends up packed rather than each one closing
     its own gap and leaving the next one stranded. */
  const placed = new Set<string>();
  const shift = (id: string, off: [number, number]) => {
    for (const k of solid.get(id)!) {
      const c = k.indexOf(',');
      placed.add(Number(k.slice(0, c)) + off[0] + ',' + (Number(k.slice(c + 1)) + off[1]));
    }
  };

  /** How far apart two sets of cells are, in cells, capped so the search stays
      cheap. 0 means touching, -1 means overlapping.

      MANHATTAN, NOT CHEBYSHEV. Ground is 4-connected -- that is what decides
      whether the island is one piece -- so two cells meeting corner to corner
      are not joined. Measuring in squares called a diagonal touch "gap 0", the
      solver stopped there satisfied, and the map stayed in two pieces with the
      fishing hamlet a cell away from the shore it was supposed to be part of. */
  const MAXGAP = 10;
  const gapTo = (cells: Set<string>, off: [number, number], other: Set<string>) => {
    let best = MAXGAP + 1;
    for (const k of cells) {
      const c = k.indexOf(',');
      const x = Number(k.slice(0, c)) + off[0],
        y = Number(k.slice(c + 1)) + off[1];
      if (other.has(x + ',' + y)) return -1;
      for (let r = 1; r <= Math.min(best, MAXGAP); r++) {
        let hit = false;
        for (let dx = -r; dx <= r && !hit; dx++) {
          const dy = r - Math.abs(dx);
          if (other.has(x + dx + ',' + (y + dy))) hit = true;
          else if (dy && other.has(x + dx + ',' + (y - dy))) hit = true;
        }
        if (hit) {
          best = Math.min(best, r - 1);
          break;
        }
      }
    }
    return best;
  };

  /* THE TREE IS BUILT OVER WHAT IS PRESENT, BY NEARNESS -- not over who touched
     whom in the demo.

     The artist's adjacency is the right thing to preserve while everyone is
     here. It falls apart the moment a project is hidden: with only the hay farm
     and the fortified quarter left, the two are not neighbours and the path
     between them ran through settlements that no longer exist, so neither had
     anything to slide towards and the map came out as separate blobs in the sea.

     So the tree is grown by taking, each step, the present settlement nearest to
     anything already placed. It is the artist's arrangement when everyone is
     here, because then the nearest settlement IS the neighbour, and it still
     joins the village up when most of it is gone. */
  const children = new Map<string, string[]>();
  const seen = new Set([anchor]);
  const order: string[] = [anchor];
  const centreOf = new Map<string, [number, number]>();
  for (const s of live) centreOf.set(s.id, centre(s.id, [0, 0]));
  while (order.length < live.length) {
    let best: string | null = null,
      parent = anchor,
      bestD = Infinity;
    for (const s of live) {
      if (seen.has(s.id)) continue;
      const a = centreOf.get(s.id)!;
      for (const p of order) {
        const b = centreOf.get(p)!;
        const d = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
        if (d < bestD) {
          bestD = d;
          best = s.id;
          parent = p;
        }
      }
    }
    if (!best) break;
    seen.add(best);
    children.set(parent, [...(children.get(parent) ?? []), best]);
    order.push(best);
  }

  /* Whether a pair ever met on land decides whether they should now. Two
     settlements the artist put side by side close right up; one he left across
     water keeps a strait, so the offshore island stays an island however few
     projects are left -- but it is brought NEAR rather than left in the distance,
     because a lone blob half a map away is not a village. */
  const ISLAND_GAP = 3;

  /* THE GAP THE ARTIST LEFT, not the tightest packing.
     Sliding until two settlements touch is wrong for the one pair that is not
     supposed to touch: the offshore island is reached by a bridge, and packing
     it against the mainland beaches it and the strait disappears. So what is
     restored is the ORIGINAL distance between each pair -- zero for neighbours
     that met across a field, and the width of the water for the island. */
  /* Measured on the FULL settlements, not the shrunken ones. Taking it from
     what is held right now makes the target equal to the gap that already
     exists, so nothing ever moves -- the bug that made this look like it was
     working and doing nothing. */
  const full = new Map<string, Set<string>>();
  for (const s of settlements.list) {
    const out = new Set<string>();
    for (const [x, y] of settlements.cellsOf(s.id)) if (wasGround(x, y)) out.add(x + ',' + y);
    full.set(s.id, out);
  }
  const want = new Map<string, number>();
  for (const id of order) {
    if (id === anchor) continue;
    const parent = [...children].find(([, ks]) => ks.includes(id))![0];
    const originally = adj.get(id)?.has(parent) ?? false;
    const g0 = gapTo(full.get(id)!, [0, 0], full.get(parent)!);
    /* Neighbours in the demo keep exactly the gap they had. A pair that never
       met keeps a strait only if this settlement never met ANYONE -- otherwise
       it is simply one the map has to close up. */
    const neverTouched = ![...(adj.get(id) ?? [])].some((n) => (full.get(n)?.size ?? 0) > 0);
    /* A detached common keeps its water whoever it ends up beside. The camp
       touches the crop farm on the artist's map, so by the ordinary rule it
       would be pulled flush against whatever survives and stop being the place
       apart that it is. */
    /* The camp and the island are PART OF THE VILLAGE, just its outlying part.
       Holding them off at a fixed distance left them as two blobs alone in the
       sea with the village a screen away -- apart from it in the sense of
       abandoned rather than in the sense of outlying. The island keeps exactly
       the strait it had, because that is the span its bridge was drawn for; the
       camp closes right up, because on the artist's map it touches. */
    want.set(id, originally ? Math.max(0, g0) : neverTouched ? ISLAND_GAP : 0);
  }

  shift(anchor, [0, 0]);
  const MAX_SLIDE = 60;
  for (const id of order) {
    if (id === anchor) continue;
    const parent = [...children].find(([, ks]) => ks.includes(id))![0];
    const nudge = nudges.get(id) ?? [0, 0];
    const parentOff = offs.get(parent)!;
    const base: [number, number] = [parentOff[0] + nudge[0], parentOff[1] + nudge[1]];
    /* AIM AT THE NEAREST PLACED GROUND, not at the parent's middle. A shrinking
       settlement retreats toward its own heart, which is usually AWAY from the
       neighbour that has been left behind -- so a child aimed at its parent's
       centre walks toward where the parent used to be and never arrives. The
       nearest placed cell is where the land actually is now. */
    const me = centre(id, base);
    let aim: [number, number] = centre(parent, base);
    let near = Infinity;
    for (const k of placed) {
      const c = k.indexOf(',');
      const x = Number(k.slice(0, c)),
        y = Number(k.slice(c + 1));
      const d = (x - me[0]) ** 2 + (y - me[1]) ** 2;
      if (d < near) {
        near = d;
        aim = [x, y];
      }
    }
    const dx = aim[0] - me[0],
      dy = aim[1] - me[1];
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len,
      uy = dy / len;
    const target = want.get(id) ?? 0;

    /* PULL IF APART, PUSH IF OVERLAPPING.

       Sliding together is only half a solver. It stops when the next step would
       overlap, which is enough while every settlement starts where the artist
       left it -- but a settlement asked to stand somewhere else can START
       overlapping, and nothing here would ever have moved it out again. Scrambled
       positions put up to 735 cells of two settlements' ground on the same cells,
       stacked and drawn over each other.

       Growth is the same case: a settlement that gets bigger grows INTO its
       neighbour, and the neighbour has to be pushed out. */
    let best: [number, number] = [...base] as [number, number];
    if (gapTo(solid.get(id)!, base, placed) < 0) {
      for (let step = 1; step <= MAX_SLIDE; step++) {
        const t: [number, number] = [
          Math.round(base[0] - ux * step),
          Math.round(base[1] - uy * step),
        ];
        best = t;
        if (gapTo(solid.get(id)!, t, placed) >= 0) break; // clear of it now
      }
    } else {
      for (let step = 0; step <= MAX_SLIDE; step++) {
        const t: [number, number] = [
          Math.round(base[0] + ux * step),
          Math.round(base[1] + uy * step),
        ];
        const g = gapTo(solid.get(id)!, t, placed);
        if (g < 0) break; // would overlap: the last good one stands
        best = t;
        if (g <= target) break; // as close as it ever was
      }
    }
    offs.set(id, best);
    shift(id, best);
  }

  /* THE REPAIR PASS, because touching your parent is not the same as being part
     of the village.

     The tree pass guarantees each settlement meets the ONE neighbour it hangs
     off. That is enough when a single settlement shrinks and everything else
     holds still. It is not enough when they all shrink at once: a settlement
     slides toward its parent and away from a second neighbour it also needed,
     and the mainland comes apart. Every project at stage 2 broke the island into
     five pieces of 803, 777, 278 and 67 cells.

     So afterwards, anything cut off from the body that was NOT meant to be an
     island -- want of zero, meaning it originally met its neighbour on land --
     is slid further until it rejoins. The island's want is the width of its
     strait, so it is never dragged in. */
  const own = new Map<string, Set<string>>();
  for (const id of order) {
    const set = new Set<string>();
    const o = offs.get(id)!;
    for (const k of solid.get(id)!) {
      const c = k.indexOf(',');
      set.add(Number(k.slice(0, c)) + o[0] + ',' + (Number(k.slice(c + 1)) + o[1]));
    }
    own.set(id, set);
  }
  const meets = (a: string, b: string) => {
    for (const k of own.get(a)!) {
      const c = k.indexOf(',');
      const x = Number(k.slice(0, c)),
        y = Number(k.slice(c + 1));
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        if (own.get(b)!.has(x + dx + ',' + (y + dy))) return true;
      }
    }
    return false;
  };
  for (let pass = 0; pass < 4; pass++) {
    const body = new Set([anchor]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const id of order) {
        if (body.has(id)) continue;
        for (const b of body)
          if (meets(id, b)) {
            body.add(id);
            grew = true;
            break;
          }
      }
    }
    /* Adrift means FURTHER FROM THE VILLAGE THAN IT WAS, not "was touching".
       The forge met its neighbour across a cell of coast rather than a shared
       field, so its original gap was one rather than zero -- and a repair that
       only rescued the zeroes left it 67 cells adrift in the eastern sea. What
       has to be restored is each settlement's own relationship to the village,
       whatever that was: the forge's one cell, the island's whole strait. */
    const adrift = order.filter((id) => {
      if (body.has(id)) return false;
      const rest = new Set<string>();
      for (const other of order) if (other !== id) for (const k of own.get(other)!) rest.add(k);
      return gapTo(solid.get(id)!, offs.get(id)!, rest) > (want.get(id) ?? 0);
    });
    if (!adrift.length) break;
    for (const id of adrift) {
      const rest = new Set<string>();
      for (const other of order) if (other !== id) for (const k of own.get(other)!) rest.add(k);
      const me = centre(id, offs.get(id)!);
      let aim: [number, number] = me;
      let near = Infinity;
      for (const k of rest) {
        const c = k.indexOf(',');
        const x = Number(k.slice(0, c)),
          y = Number(k.slice(c + 1));
        const d = (x - me[0]) ** 2 + (y - me[1]) ** 2;
        if (d < near) {
          near = d;
          aim = [x, y];
        }
      }
      const base = offs.get(id)!;
      const ux = (aim[0] - me[0]) / (Math.hypot(aim[0] - me[0], aim[1] - me[1]) || 1);
      const uy = (aim[1] - me[1]) / (Math.hypot(aim[0] - me[0], aim[1] - me[1]) || 1);
      let best = base;
      for (let step = 1; step <= MAX_SLIDE; step++) {
        const t: [number, number] = [
          Math.round(base[0] + ux * step),
          Math.round(base[1] + uy * step),
        ];
        const g = gapTo(solid.get(id)!, t, rest);
        if (g < 0) break;
        best = t;
        if (g <= (want.get(id) ?? 0)) break;
      }
      offs.set(id, best);
      const set = new Set<string>();
      for (const k of solid.get(id)!) {
        const c = k.indexOf(',');
        set.add(Number(k.slice(0, c)) + best[0] + ',' + (Number(k.slice(c + 1)) + best[1]));
      }
      own.set(id, set);
    }
  }
  /* NOTHING MAY SIT ON TOP OF ANYTHING, and one push is not enough to promise
     it: shoving a settlement clear of the neighbour it landed on can shove it
     into a different one. So the whole arrangement is swept until no two
     settlements share a cell, each offender stepping directly away from whatever
     it is lying on. Bounded, and it reports by leaving the overlap in place
     rather than looping for ever -- a scramble that cannot be resolved is worth
     seeing rather than hiding behind a spin. */
  for (let pass = 0; pass < 12; pass++) {
    const at = new Map<string, string>();
    let clash: [string, string] | null = null;
    for (const id of order) {
      for (const k of own.get(id)!) {
        const other = at.get(k);
        if (other && other !== id) {
          clash = [id, other];
          break;
        }
        at.set(k, id);
      }
      if (clash) break;
    }
    if (!clash) break;
    const [id, other] = clash;
    if (id === anchor) continue;
    const me = centre(id, offs.get(id)!),
      you = centre(other, offs.get(other)!);
    const dx = me[0] - you[0],
      dy = me[1] - you[1];
    const len = Math.hypot(dx, dy) || 1;
    const ux2 = dx / len,
      uy2 = dy / len;
    const base2 = offs.get(id)!;
    const rest = new Set<string>();
    for (const o2 of order) if (o2 !== id) for (const k of own.get(o2)!) rest.add(k);
    let out: [number, number] = base2;
    for (let step = 1; step <= MAX_SLIDE; step++) {
      out = [Math.round(base2[0] + ux2 * step), Math.round(base2[1] + uy2 * step)];
      if (gapTo(solid.get(id)!, out, rest) >= 0) break;
    }
    offs.set(id, out);
    const set = new Set<string>();
    for (const k of solid.get(id)!) {
      const c = k.indexOf(',');
      set.add(Number(k.slice(0, c)) + out[0] + ',' + (Number(k.slice(c + 1)) + out[1]));
    }
    own.set(id, set);
  }

  /* THE ISLAND SITS JUST OFF THE VILLAGE'S EDGE, on the outside.

     It needs water round it to be an island, and water inside the outline is
     forbidden everywhere else on the map -- so its strait has to open to the
     sea, which means it cannot sit in a bay. Left to the ordinary rule it landed
     in one on six of ten layouts and its strait was read, correctly, as a pond.

     Exiling it clear of the bounding box also worked and put it half a screen
     away, which is not "reached by a bridge". So: find the village's own edge
     nearest to where it lies, and place it just beyond that, pointing out to
     sea. Close enough to cross, outside enough that the water is open. */
  {
    const villageCells = new Set<string>();
    let vx = 0,
      vy = 0,
      vn = 0;
    for (const id of order) {
      if (DETACHED.has(id)) continue;
      for (const k of own.get(id)!) {
        villageCells.add(k);
        const c = k.indexOf(',');
        vx += Number(k.slice(0, c));
        vy += Number(k.slice(c + 1));
        vn++;
      }
    }
    if (vn) {
      vx /= vn;
      vy /= vn;
      for (const id of order) {
        if (!DETACHED.has(id) || !solid.get(id)?.size) continue;
        const mine = centre(id, offs.get(id)!);
        /* The village's edge cell closest to it, and the way OUT from there. */
        let edge: [number, number] | null = null;
        let bestD = Infinity;
        for (const k of villageCells) {
          const c = k.indexOf(',');
          const x = Number(k.slice(0, c)),
            y = Number(k.slice(c + 1));
          let onEdge = false;
          for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ]) {
            if (!villageCells.has(x + dx + ',' + (y + dy))) {
              onEdge = true;
              break;
            }
          }
          if (!onEdge) continue;
          const d = (x - mine[0]) ** 2 + (y - mine[1]) ** 2;
          if (d < bestD) {
            bestD = d;
            edge = [x, y];
          }
        }
        if (!edge) continue;
        let ux = edge[0] - vx,
          uy = edge[1] - vy;
        const len = Math.hypot(ux, uy) || 1;
        ux /= len;
        uy /= len;
        /* Its own half-span plus the strait, measured from the village's edge. */
        let rad = 0;
        const c0 = centre(id, [0, 0]);
        for (const k of solid.get(id)!) {
          const c = k.indexOf(',');
          rad = Math.max(
            rad,
            Math.hypot(Number(k.slice(0, c)) - c0[0], Number(k.slice(c + 1)) - c0[1])
          );
        }
        /* RIGHT AGAINST THE VILLAGE, one strait away, and no further.

           Pushing it out until its water reached open sea is what set it adrift
           in the middle of the ocean with the village a screen off. It belongs
           just off the shore -- close enough that its bridge is a crossing you
           would walk, which is the whole point of it. Where that strait ends up
           enclosed, the fill closes it and the island becomes a headland; that
           is the better of the two failures and it is chosen deliberately. */
        const tx = edge[0] + ux * (rad + DETACHED_GAP);
        const ty = edge[1] + uy * (rad + DETACHED_GAP);
        const off: [number, number] = [Math.round(tx - c0[0]), Math.round(ty - c0[1])];
        offs.set(id, off);
        const set = new Set<string>();
        for (const k of solid.get(id)!) {
          const c = k.indexOf(',');
          set.add(Number(k.slice(0, c)) + off[0] + ',' + (Number(k.slice(c + 1)) + off[1]));
        }
        own.set(id, set);
      }
    }
  }

  return offs;
}

export interface ComposeResult {
  /** Cells taken off the map. */
  removed: number;
  /** Objects taken with them. */
  objects: number;
  absent: string[];
  /** How many settlements slid to close a gap. */
  moved?: number;
  /** Where each settlement ended up, relative to where the artist put it. The
      overlay needs this: the partition describes the map as DRAWN, so after a
      move it tints the ground each settlement used to stand on. */
  offsets?: Map<string, [number, number]>;
  /** Settlements the road network could not reach. Empty is the requirement;
      anything in here is a village an NPC cannot cross. */
  unreachable?: string[];
  /** Routes laid between settlements. */
  routes?: number;
}

/* A ROAD BETWEEN EVERY SETTLEMENT, AND A MAP THAT SAYS SO.

   The village has to be walkable end to end: agents will move between
   settlements as NPCs, so every one of them must be reachable on foot from
   every other, must know where the others ARE, and must have something to
   follow to get there. The artist's own roads stop at the borders he drew, and
   once settlements move, shrink or vanish there is nothing joining what is
   left.

   A path here is what a path is in this tileset -- worked ground, a hole cut in
   the grass -- so the grass's own fringe tiles ravel its edges and it looks laid
   rather than drawn. Cut BEFORE the wilderness is sown, so the planting sees
   worked ground and keeps off it: sowing first would put trees in the road and
   then the road through the trees.

   WHAT IS ROUTED IS THE WALK, NOT THE ROAD, and that distinction is the whole of
   the last fix. Only sea-level meadow may be cut -- on a terrace there is no
   dirt beneath, so cutting one empties the cell and opens a hole to the water --
   and a router that will only cross cuttable ground refuses to climb at all,
   which leaves anything up a hill unreachable. So the route is planned over
   ground an NPC can stand on, at any height, and the cut is applied to whichever
   of its cells will take one. Where it climbs there is a way and no road, which
   is true, and `nav.routes` says where it goes.

   @param cut Lay the roads as well as finding them. False on the untouched
   demo, which the composer is required to hand back exactly as the artist left
   it -- its roads are already his, and it still needs a map of them. */
/* A SPUR TO EVERY YARD, so no worked ground is left leading nowhere.

   The tree joins settlement to settlement, which is the map's spine; it says
   nothing about the threshing floor behind the barn. The artist's own worked
   ground is 41 separate patches with 84% of it off the biggest one, so being a
   separate patch is emphatically NOT the fault -- his yards are meant to be
   islands of dirt. What is a fault is a patch nobody can walk to, which is what
   a road left behind by a removed settlement looks like, and it is the critic's
   P3.

   So each patch of four cells or more that no route, gate or door comes within
   two cells of is given one. It is planned by the same router over the same
   walkable ground, so a spur is a real path or it is not laid at all -- and a
   patch the router cannot reach is left alone rather than joined by something
   that only looks like a road.

   IT RUNS TWICE, and the second time is the one that counts. Worked ground is
   not a fact about the plan, it is a fact about the finished picture: a cell
   reads as trodden when the meadow drawn on it lets the dirt show through, so
   the re-dressing at the end of a composition creates and destroys yards after
   the roads are laid. The first pass cuts tracks while there is still meadow to
   cut; the second only publishes routes, which is honest -- a route is a claim
   about a walk, and on a terrace there is no dirt to expose anyway. */

/* AND EVERY SHAPE ALONG THE SHORE IS A SHAPE HE DREW.

   The same argument as the meadow's (`relegalise` in `redress.ts`), one family
   along and on the other side of the map's own boundary. `facing` is the
   artist's own placements, so a coast cell whose eight neighbours form a
   pattern that appears nowhere in his village has no pool at all: `redress`
   leaves whatever the autotile tables guessed and the critic scores it as E7.

   IT HAS TO BE ASKED OF THE MAP, NOT OF THE PLAN. The intended outline is legal
   by the time it is applied -- measured, zero bad shapes -- and the 28 that the
   finished map has are made afterwards, because `land` here means "not drawn
   with a cliff tile" and the terraces the artist left inside the village count
   as coast. So this runs on the tiles that are actually down, right after the
   outline is laid and while `addLand` can still re-dress what it changes.

   Adding only, and never a cell a settlement stands on. */
function legaliseCoast(doc: Document, ground: Ground, atlas: Atlas, passes = 3) {
  const legal = new Set<number>();
  for (const rec of Object.values(atlas.tiles)) {
    if (!COAST_KINDS.has(rec.kind) || rec.facing_from !== 'artist') continue;
    for (const s of rec.facing) legal.add(s);
  }
  const L: Record<string, number> = {
    Dirt: 0,
    'Layer 01': 1,
    'Layer 02': 2,
    'Layer 03': 3,
    'Layer 04': 4,
  };
  for (let pass = 0; pass < passes; pass++) {
    const lv = new Map<string, number>(),
      top = new Map<string, string>();
    for (const t of doc.layout.tiles) {
      const l = L[t.layer];
      if (l === undefined || !t.file) continue;
      const k = t.cell[0] + ',' + t.cell[1];
      if ((lv.get(k) ?? -1) <= l) {
        lv.set(k, l);
        top.set(k, t.file);
      }
    }
    const land = new Set<string>();
    for (const [k, f] of top) if (!f.startsWith('terrain-tiles/')) land.add(k);
    const sigAt = (x: number, y: number) => {
      let s = 0;
      for (const [dx, dy, bit] of SIG8) if (land.has(x + dx + ',' + (y + dy))) s |= bit;
      return s;
    };
    const isBad = (x: number, y: number) => {
      const k = x + ',' + y;
      if (land.has(k)) return false;
      let touches = false;
      for (const [dx, dy] of SIG8)
        if (land.has(x + dx + ',' + (y + dy))) {
          touches = true;
          break;
        }
      return touches && !legal.has(sigAt(x, y));
    };
    const badAround = (x: number, y: number) => {
      let n = 0;
      for (let dx = -2; dx <= 2; dx++)
        for (let dy = -2; dy <= 2; dy++) {
          if (isBad(x + dx, y + dy)) n++;
        }
      return n;
    };
    const bad: [number, number][] = [];
    const seen = new Set<string>();
    for (const k of land) {
      const c = k.indexOf(',');
      const x = Number(k.slice(0, c)),
        y = Number(k.slice(c + 1));
      for (const [dx, dy] of SIG8) {
        const nx = x + dx,
          ny = y + dy,
          nk = nx + ',' + ny;
        if (seen.has(nk) || land.has(nk)) continue;
        seen.add(nk);
        if (isBad(nx, ny)) bad.push([nx, ny]);
      }
    }
    if (!bad.length) return;
    const fixes: [number, number][] = [];
    for (const [x, y] of bad) {
      if (!isBad(x, y)) continue;
      const before = badAround(x, y);
      let best: [number, number] | null = null,
        bestN = before;
      for (const [dx, dy] of [
        [0, 0],
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const k = x + dx + ',' + (y + dy);
        if (land.has(k)) continue;
        land.add(k);
        const after = badAround(x, y);
        land.delete(k);
        if (after < bestN) {
          bestN = after;
          best = [x + dx, y + dy];
        }
      }
      if (best) {
        fixes.push(best);
        land.add(best[0] + ',' + best[1]);
      }
    }
    if (!fixes.length) return;
    ground.addLand(fixes, true);
  }
}

function spurRoutes(
  doc: Document,
  ground: Ground,
  walk: (x: number, y: number) => boolean,
  route: (a: [number, number], b: [number, number]) => [number, number][],
  places: Place[],
  anchors: Map<string, [number, number]>,
  routes: Route[],
  bounds: [number, number, number, number]
): [number, number][] {
  const [bx0, by0, bx1, by1] = bounds;
  const laid: [number, number][] = [];
  const parts = components(walk, bounds);
  const near = new Set<string>();
  const mark = (x: number, y: number) => {
    for (let dx = -2; dx <= 2; dx++)
      for (let dy = -2; dy <= 2; dy++) near.add(x + dx + ',' + (y + dy));
  };
  for (const r of routes) for (const [x, y] of r.cells) mark(x, y);
  for (const a of anchors.values()) mark(a[0], a[1]);
  const netCells: [number, number][] = [];
  for (const r of routes) for (const c of r.cells) netCells.push(c);
  for (const a of anchors.values()) netCells.push(a);
  /* Every doorstep as well: the cell a building's pivot stands on, and the
       walkable cells around it. */
  const targets: [number, number][] = [...netCells];
  for (const o of doc.layout.objects) {
    if (o.group !== 'Building') continue;
    const px = Math.floor(o.pos[0]),
      py = Math.floor(o.pos[1]);
    /* THREE CELLS, NOT ONE. A pivot is the bottom-centre of the artwork, so
         a building's doorstep is often on the far side of a wall from its own
         yard, and `describe` picks it with a search of its own. Widened until
         the walled yard at -22,-19 -- ten cells of the artist's worked ground
         with House 11 standing over it -- has a target it can actually reach. */
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -3; dy <= 3; dy++) {
        if (walk(px + dx, py + dy)) targets.push([px + dx, py + dy]);
      }
    }
  }

  const seen = new Set<string>();
  const worked: string[] = [];
  for (let y = by0; y <= by1; y++) {
    /* WALKABLE WORKED GROUND, which is what `nav.roads` publishes and so what
         the critic reads back. Collecting every trodden cell instead merges two
         patches through a cell nobody can stand on, and then a yard that really
         is stranded looks joined. */
    for (let x = bx0; x <= bx1; x++) {
      if (walk(x, y) && ground.isTrodden(x, y)) worked.push(x + ',' + y);
    }
  }
  const isWorked = new Set(worked);
  for (const k of worked) {
    if (seen.has(k)) continue;
    const patch: [number, number][] = [];
    const stack = [k];
    seen.add(k);
    while (stack.length) {
      const q = stack.pop()!;
      const c = q.indexOf(',');
      const x = Number(q.slice(0, c)),
        y = Number(q.slice(c + 1));
      patch.push([x, y]);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const n = x + dx + ',' + (y + dy);
          if (isWorked.has(n) && !seen.has(n)) {
            seen.add(n);
            stack.push(n);
          }
        }
      }
    }
    if (patch.length < 4) continue;
    if (patch.some(([x, y]) => near.has(x + ',' + y))) continue;

    /* NEAREST FIRST, AND KEEP TRYING. A yard can be walled: the ten cells at
         -22,-19 sit inside House 11's own pen, which no road on the map can
         enter. The network is not the only thing worth reaching -- a doorstep
         is a place somebody walks to as well, and P3 counts it -- so the
         targets are the routes, the gates AND every building's doorstep, tried
         in order of distance until one of them is actually reachable. Eight
         attempts, because a patch that fails eight is walled off from all of
         them and joining it is not this pass's business. */
    const tries: [number, number, [number, number], [number, number]][] = [];
    for (const [x, y] of patch) {
      if (!walk(x, y)) continue;
      const p = parts.at.get(x + ',' + y);
      for (const t of targets) {
        /* SAME PIECE ONLY. A walled yard's own doorstep is further away in a
             straight line than the road on the other side of the fence, so a
             nearest-first search spends every attempt on targets it can never
             reach. Which connected piece of walkable ground a cell is on is the
             one question that settles it before the router is asked. */
        if (parts.at.get(t[0] + ',' + t[1]) !== p) continue;
        tries.push([(x - t[0]) ** 2 + (y - t[1]) ** 2, tries.length, [x, y], t]);
      }
    }
    /* AND IF NOTHING ON ITS OWN PIECE ANSWERS, TRY THE REST. The piece test
         is a shortcut, not a truth: `components` is built from the walkable
         model and the router has its own idea of what it can cross, so a patch
         can have no target on its piece and still be perfectly reachable. Four
         cells of road on one village in sixty were left leading nowhere for
         exactly that. The router is the authority -- it either finds a path or
         it does not. */
    if (!tries.length) {
      for (const [x, y] of patch) {
        if (!walk(x, y)) continue;
        for (const t of targets) {
          tries.push([(x - t[0]) ** 2 + (y - t[1]) ** 2, tries.length, [x, y], t]);
        }
      }
    }
    tries.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    let from: [number, number] | null = null;
    let cells: [number, number][] = [];
    for (const t of tries.slice(0, 12)) {
      const got = route(t[2], t[3]);
      if (got.length) {
        from = t[2];
        cells = got;
        break;
      }
    }
    if (!from || !cells.length) continue;
    const to = cells[cells.length - 1];
    let owner = '';
    for (const [id, a] of anchors) {
      if (a[0] === to[0] && a[1] === to[1]) {
        owner = id;
        break;
      }
    }
    if (!owner) {
      owner = places.find((p) => p.cells.has(from![0] + ',' + from![1]))?.id ?? places[0]?.id ?? '';
    }
    routes.push({ from: owner, to: owner, cells });
    laid.push(...cells);
    for (const [x, y] of cells) mark(x, y);
    netCells.push(...cells);
  }

  /* AND A ROAD TO EVERY DOOR THAT IS OUT IN A FIELD.

       A villager walks home along the network and then leaves it for the last
       stretch; how long that stretch is, is the critic's N5, and the number is
       calibrated on this composer at its best -- 29 of 44 doors directly on the
       network and the furthest 8 cells off it. A scrambled village puts two of
       them fourteen cells out, which is a house nobody has a way to.

       Eight cells is the line, not twelve: the rule measures to the LARGEST
       path network and a spur has to arrive with room to spare. Same router,
       same ground, and a door it cannot reach is left alone -- that is N3's
       business and a different fault. */
  const FAR = 8;
  /* MEASURED AGAINST THE MAIN NETWORK, not against any cell of road anywhere.
       N5 asks how far a door is from the LARGEST connected path network, and a
       nine-cell island of yard beside the house satisfies "near a road" while
       leaving the villager exactly as stranded. Two doors of one scrambled
       village read as joined for that reason and were fourteen cells from
       anything that goes anywhere. */
  const net = new Set<string>();
  for (const [x, y] of netCells) if (walk(x, y)) net.add(x + ',' + y);
  let main = new Set<string>();
  {
    const seen2 = new Set<string>();
    for (const k of net) {
      if (seen2.has(k)) continue;
      const comp = new Set<string>([k]);
      const st: string[] = [k];
      seen2.add(k);
      while (st.length) {
        const q = st.pop()!;
        const c = q.indexOf(',');
        const qx = Number(q.slice(0, c)),
          qy = Number(q.slice(c + 1));
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const n = qx + dx + ',' + (qy + dy);
          if (net.has(n) && !seen2.has(n)) {
            seen2.add(n);
            comp.add(n);
            st.push(n);
          }
        }
      }
      if (comp.size > main.size) main = comp;
    }
  }
  const mainCells: [number, number][] = [...main].map((k) => {
    const c = k.indexOf(',');
    return [Number(k.slice(0, c)), Number(k.slice(c + 1))] as [number, number];
  });
  for (const o of doc.layout.objects) {
    if (o.group !== 'Building') continue;
    const px = Math.floor(o.pos[0]),
      py = Math.floor(o.pos[1]);
    let step: [number, number] | null = null;
    let bestD = Infinity;
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -3; dy <= 3; dy++) {
        if (!walk(px + dx, py + dy)) continue;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          step = [px + dx, py + dy];
        }
      }
    }
    if (!step) continue;
    let near = Infinity,
      to: [number, number] | null = null;
    for (const [nx, ny] of mainCells) {
      const d = Math.max(Math.abs(step[0] - nx), Math.abs(step[1] - ny));
      if (d < near) {
        near = d;
        to = [nx, ny];
      }
    }
    if (!to || near <= FAR) continue;
    if (parts.at.get(step[0] + ',' + step[1]) !== parts.at.get(to[0] + ',' + to[1])) continue;
    const cells = route(step, to);
    if (!cells.length) continue;
    const who =
      places.find((p) => p.cells.has(step![0] + ',' + step![1]))?.id ?? places[0]?.id ?? '';
    routes.push({ from: who, to: who, cells });
    laid.push(...cells);
    netCells.push(...cells);
  }

  return laid;
}

function planRoads(
  doc: Document,
  ground: Ground,
  settlements: Settlements,
  states: States,
  held: Map<string, Set<string>>,
  offs: Map<string, [number, number]>,
  cut: boolean
) {
  const solid = solidCells(doc.layout.objects);
  const walk = walkableAt(ground, solid);
  const route = router(walk, (x, y) => ground.isTrodden(x, y));

  let bx0 = Infinity,
    by0 = Infinity,
    bx1 = -Infinity,
    by1 = -Infinity;
  for (const t of doc.layout.tiles) {
    if (!t.file) continue;
    bx0 = Math.min(bx0, t.cell[0]);
    bx1 = Math.max(bx1, t.cell[0]);
    by0 = Math.min(by0, t.cell[1]);
    by1 = Math.max(by1, t.cell[1]);
  }
  const piece = components(walk, [bx0, by0, bx1, by1]).at;

  const places: Place[] = [];
  const anchors = new Map<string, [number, number]>();
  for (const s2 of settlements.list) {
    if (states.get(s2.id)?.present === false) continue;
    const [ox, oy] = offs.get(s2.id) ?? [0, 0];
    const mine = new Set<string>();
    for (const k of held.get(s2.id) ?? []) {
      const c = k.indexOf(',');
      const x = Number(k.slice(0, c)) + ox,
        y = Number(k.slice(c + 1)) + oy;
      if (ground.hasGround(x, y)) mine.add(x + ',' + y);
    }
    if (!mine.size) continue;
    places.push({ id: s2.id, name: s2.name, kind: s2.kind, cells: mine });

    /* THE GATE IS WHERE THE ROAD MEETS THE PLACE, and it has to be somewhere a
       person could stand AND could leave from. An anchor on the cell under a
       house is a route that starts inside a wall; an anchor in a fenced yard
       is a route that starts in a pen. So the cells are ranked by which
       connected piece of the map they belong to first -- the biggest piece any
       of them touches is the one the rest of the village is on -- and only
       then by nearness to the middle, with its own worked ground preferred so
       the new route joins what the artist already laid instead of running
       beside it. */
    let cx = 0,
      cy = 0;
    for (const k of mine) {
      const c = k.indexOf(',');
      cx += Number(k.slice(0, c));
      cy += Number(k.slice(c + 1));
    }
    cx /= mine.size;
    cy /= mine.size;
    let best: [number, number] | null = null;
    let bestP = Infinity,
      bestD = Infinity;
    for (const k of mine) {
      const c = k.indexOf(',');
      const x = Number(k.slice(0, c)),
        y = Number(k.slice(c + 1));
      if (!walk(x, y)) continue;
      const p = piece.get(k) ?? Infinity;
      const d = (x - cx) ** 2 + (y - cy) ** 2 - (ground.isTrodden(x, y) ? 400 : 0);
      if (p < bestP || (p === bestP && d < bestD)) {
        bestP = p;
        bestD = d;
        best = [x, y];
      }
    }
    if (best) anchors.set(s2.id, best);
  }

  const { routes, unreachable } = joinAll(places, anchors, route);

  spurRoutes(doc, ground, walk, route, places, anchors, routes, [bx0, by0, bx1, by1]);

  /* ONLY SEA-LEVEL MEADOW MAY BE CUT.

     A path is grass taken away to show the dirt underneath -- and on the
     terraces there IS no dirt underneath, so cutting there empties the cell
     and the map gets a hole in it. That is what a road across a plateau did:
     42 cells of trapped water on one layout, and 24 of 28 states failing,
     while the roads themselves looked perfectly fine.

     `canCut` allows it, because for a person with a brush cutting a plateau
     is a legitimate thing to ask for and the brush handles the consequences.
     A route may not, so it cuts what it can and walks the rest. */
  const cuttable = (x: number, y: number) =>
    ground.canCut(x, y) && ground.isLand(x, y) && ground.isGrass(x, y);

  /* ---- AND THE ROUTE IS NO LONGER CUT AT ALL -----------------------------

     THIS FUNCTION USED TO CUT EVERY ROUTE CELL, PLUS THE CELL BESIDE IT, and
     that is the single loudest thing in every render this project has made: a
     branching two-wide track network crossing the whole map. `map-verdict` has
     named it in prose since it was written -- *a straight two-wide road
     crossing the whole map is not a thing he ever draws, and it is what every
     district ends up hanging off* -- and `atlas.json/paths` has had the
     measurement for as long: **he has no road network.** 826 worked cells in
     41 components, 84% of them off the largest, and the largest is a farm plot.

     Measured on a composed map, with the road cut and without:

                              cells   patches   largest
         the artist             826        41       16%
         cutting the routes     729        33       37%   <- one mega-network
         not cutting them       427        34       23%

     AND NOTHING DEPENDED ON IT, which is the part worth writing down because
     it is what made this a two-line change instead of a redesign. A route is a
     fact about `nav`, not about terrain: `N2` is satisfied by routes plus
     roads, `P1` and `P2` walk the route cells themselves, and `N3` and `N5`
     ask about doors. All thirty rules score identically with the cut removed --
     E1 1 and nothing else over him, exactly as before. `CLAUDE.md` already said
     so and nobody had tried it: *roads ALONE is the wrong test.*

     WHAT REPLACES IT IS WEAR, WHICH IS WHAT HE ACTUALLY DRAWS. `paths.classes`
     splits his worked ground in two and the numbers are his:

         scuff   439 cells   52 patches   median run 2   3.47 cells from a building
         plot    387 cells    8 patches   median run 6   6.98 cells from a building

     52 patches over 53 buildings is one apiece, and 439 over 52 is eight cells
     each. So each building gets a scuff of eight cells at its feet, taken
     nearest-first from the ground it stands on, and `legaliseCut` shapes the
     footprint against the 47 neighbourhoods he cut -- the same pass the brush
     runs, not a second one. The plots are his own and survive in the base;
     nothing here invents a field. */
  const cells: [number, number][] = [];
  const SCUFF = 8;
  for (const o of doc.layout.objects) {
    if (o.group !== 'Building') continue;
    const bx = Math.floor(o.pos[0]),
      by = Math.floor(o.pos[1]);
    const near: [number, number, number][] = [];
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -3; dy <= 3; dy++) {
        const x = bx + dx,
          y = by + dy;
        if (!cuttable(x, y)) continue;
        near.push([dx * dx + dy * dy, x, y]);
      }
    }
    near.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
    for (const [, x, y] of near.slice(0, SCUFF)) cells.push([x, y]);
  }

  /* ---- AND THE LANE, WHICH WAS TRIED THREE WAYS AND IS NOT HERE ---------

     THE FENCE AND THE LANE ARE ONE STRUCTURE IN HIS MAP. Put his render beside
     a composed one at the same crop -- the same two houses, `study/plan/
     compose.py` -- and the difference is not the buildings and not the
     dressing. His has a worn lane running between them with a gate arch at each
     end and a continuous fence line either side of it. Ours has worn patches at
     the doors and fence fragments lying about. **Nothing in ours is bounded.**

     Three ways of cutting that lane were built and measured, and the best of
     them is worse than not cutting one at all:

                                       cells  patches  largest  median to a building
         the artist                      826       41      16%                 4.49
         wear at the buildings only      709       35      21%                 -
         + route cells inside a place    970       29      37%                 -
         + route cells within 6 of one   852       31      33%                 2.45

     `plan.py`'s gate is a largest component of 25% and only the first passes
     it. The reason every lane variant fails it is the same: near a building the
     routes CONVERGE, so the lane merges with the scuffs and with the next
     building's lane, and the network re-forms. His 16% is a farm plot, and his
     lanes are genuinely broken into pieces.

     WHAT BREAKS THEM IN HIS MAP IS THE THING WE HAVE NOT BUILT. His lanes are
     bounded by fenced yards -- lots, in `TownGeneratorOS` terms, which
     `study/plan/parcel.py` names as the piece it deliberately does not do and
     `study/PLAN.md` schedules after the placer. A lane is the gap between two
     lots; it is short because a lot is small; it is fenced because a lot has an
     edge. Sweeping a distance threshold cannot produce that and three sweeps
     are enough to say so.

     So the wear stands alone until the lot layer exists, and these three rows
     are here so nobody re-derives them. */
  if (cut && cells.length) ground.cut(cells);
  return { places, anchors, routes, unreachable };
}

/** Rebuild the document from the base for the given settlement states.

    The caller owns the scene graph and rebuilds it afterwards -- this touches
    the document and the ground model only, so it can be driven headlessly. */
export function compose(
  doc: Document,
  ground: Ground,
  settlements: Settlements,
  base: Layout,
  states: States,
  /** Sows the wild land. Optional so the composer can still be driven headless
      without one. */
  scatter?: { plant(cells: [number, number][], size: number, seed: number): number[] },
  /** The sprite atlas, for the final re-dressing of the coast. Optional: without
      it the map still composes, it just keeps whatever the autotile tables chose
      and scores worse on `grass touching open water`. */
  atlas?: Atlas
): ComposeResult {
  const absent = settlements.list
    .filter((s) => states.get(s.id)?.present === false)
    .map((s) => s.id);
  const shrunk = settlements.list.filter(
    (s) => states.get(s.id)?.present !== false && (states.get(s.id)?.stage ?? 5) < 5
  );

  doc.resetTo(pristine(base));
  ground.reindex();

  /* Which objects were ALREADY standing over water before anything happened --
      the four docks, the bridge, the backdrop. They are allowed to; the sweep at
      the end has to be able to tell them from things a composition stranded. */
  const bornOverWater = new Set<string>();
  for (const o of doc.layout.objects) {
    const cx = Math.floor(o.pos[0]),
      cy = Math.floor(o.pos[1]);
    if (!ground.hasGround(cx, cy) && !ground.isRim(cx, cy)) {
      bornOverWater.add(o.prefab + '@' + o.pos[0] + ',' + o.pos[1]);
    }
  }

  /* The island as the artist left it, captured before anything is cut. */
  const wasGround = new Set<string>();
  for (const [k] of settlements.entries()) {
    const c = k.indexOf(',');
    if (ground.hasGround(Number(k.slice(0, c)), Number(k.slice(c + 1)))) wasGround.add(k);
  }

  /* A nudge is a reason to compose all on its own. Without this the early exit
     fired on a map where nothing was absent and nothing had shrunk -- every
     settlement merely asked to stand somewhere else -- and the whole scramble
     came back byte-identical to the demo, which reads exactly like a solver
     that works perfectly. */
  const nudged = settlements.list.some((s) => states.get(s.id)?.nudge);
  if (!absent.length && !shrunk.length && !nudged) {
    /* THE DEMO STILL NEEDS A MAP OF ITSELF. Handing it back untouched is the
       point of this exit -- nothing has been asked for, so nothing may change,
       and a re-derivation that came back one pixel different would rot the
       parity check. But `nav` is not a change to the picture: it is a
       description of it, and an agent standing in the unmodified village needs
       to know where the chapel is exactly as much as one standing in a composed
       one. So the routes are found and written, and NOT cut -- the artist's own
       roads already join his village, and cutting more would be the very edit
       this exit exists to avoid. */
    const whole = new Map<string, Set<string>>();
    const none = new Map<string, [number, number]>();
    for (const s of settlements.list) {
      whole.set(s.id, new Set(settlements.cellsOf(s.id).map((c) => c[0] + ',' + c[1])));
      none.set(s.id, [0, 0]);
    }
    const plan = planRoads(doc, ground, settlements, states, whole, none, false);
    doc.layout.nav = describeNav(
      doc,
      ground,
      plan.places,
      plan.anchors,
      plan.routes,
      plan.unreachable
    );
    return {
      removed: 0,
      objects: 0,
      absent,
      moved: 0,
      unreachable: plan.unreachable,
      routes: plan.routes.length,
    };
  }

  /* ONE erase over the union, not one per settlement. Two calls would let the
     first cut's roughened edge feed into the second's mask, which is exactly the
     order-dependence this file exists to avoid. */
  const gone = new Set(absent);

  /* Where each settlement's heart is: the middle of its buildings, or of its
     ground if it has none. Shrinking retreats toward this and growing spreads
     back out from it. */
  const heart = new Map<string, [number, number]>();
  {
    const sum = new Map<string, [number, number, number]>();
    for (const o of doc.layout.objects) {
      if (o.group !== 'Building') continue;
      const id = ownerNear(settlements, o.pos[0], o.pos[1]);
      if (!id) continue;
      const s = sum.get(id) ?? [0, 0, 0];
      sum.set(id, [s[0] + o.pos[0], s[1] + o.pos[1], s[2] + 1]);
    }
    for (const s of settlements.list) {
      const b = sum.get(s.id);
      if (b) {
        heart.set(s.id, [b[0] / b[2], b[1] / b[2]]);
        continue;
      }
      const cs = settlements.cellsOf(s.id);
      const n = cs.length || 1;
      heart.set(s.id, [cs.reduce((a, c) => a + c[0], 0) / n, cs.reduce((a, c) => a + c[1], 0) / n]);
    }
  }

  /* A SHRINKING SETTLEMENT IS THE SAME OPERATION AS AN ABSENT ONE, applied to
     part of it. Cells it no longer holds at this stage are cut exactly as if
     they had never been settled -- so the coast that appears where a village
     pulled back is dressed by the same rules that dress the coast where one
     was never there. Stage 0 is simply every cell going. */
  const cells: [number, number][] = [];
  const keep = new Set<string>();
  const held = new Map<string, Set<string>>();
  for (const s of settlements.list) {
    const mine = settlements.cellsOf(s.id);
    if (gone.has(s.id)) {
      held.set(s.id, new Set());
      continue;
    }
    const stage = states.get(s.id)?.stage ?? 5;
    held.set(s.id, stageCells(mine, heart.get(s.id)!, stage));
  }
  for (const [k, id] of settlements.entries()) {
    if (held.get(id)!.has(k)) {
      keep.add(k);
      continue;
    }
    const c = k.indexOf(',');
    cells.push([Number(k.slice(0, c)), Number(k.slice(c + 1))]);
  }

  /* AN OBJECT BELONGS TO A SETTLEMENT, NOT TO THE CELL IT HAPPENS TO STAND ON.

     Sweeping by cell looks equivalent and is not: a dock is anchored OVER THE
     WATER, so the cell beneath it is owned by nobody, and taking the port off
     the map left its wooden walkway standing alone in the sea. Anything within
     reach of a departing settlement's ground and not within reach of one that is
     staying goes with it. */
  const objs = new Set<number>();
  doc.layout.objects.forEach((o, i) => {
    const owner = ownerNear(settlements, o.pos[0], o.pos[1]);
    if (!owner) return;
    if (gone.has(owner)) {
      objs.add(i);
      return;
    }
    // Standing on ground its settlement no longer holds at this stage.
    const k = Math.floor(o.pos[0]) + ',' + Math.floor(o.pos[1]);
    if (!held.get(owner)!.has(k)) objs.add(i);
  });

  /* Ground that survives the speck sweep at any size: a cell a building stands
     on. A piece of land with a building on it is a place -- the camp is 52
     cells and becomes an island once the projects around it go -- while a
     10-cell splinter sheared off a neighbour's edge is debris and should go with
     the rest. Taken AFTER the objects are chosen, so a departing settlement's
     buildings do not anchor ground that is about to be water. */
  const anchors = new Set<string>();
  doc.layout.objects.forEach((o, i) => {
    if (objs.has(i) || o.group !== 'Building') return;
    anchors.add(Math.floor(o.pos[0]) + ',' + Math.floor(o.pos[1]));
  });

  const removed = ground.erase(cells, keep, anchors);

  /* The cut runs past its own footprint, so objects standing on the cells it
     took in passing go too -- otherwise a barrel is left floating over open
     water at the new shoreline. */
  for (const k of ground.emptied) {
    const c = k.indexOf(',');
    for (const oi of doc.objectsAt(Number(k.slice(0, c)), Number(k.slice(c + 1)))) objs.add(oi);
  }

  if (objs.size) doc.remove([...objs].sort((a, b) => b - a));

  /* SOLVED ON THE GROUND THAT SURVIVED, not on the cells that were asked for.
     A cut wanders: `roughen` takes a cell past its own footprint so the coast is
     not a ruler, so what is left is a ring smaller than what was requested.
     Planning the slide against the requested sets aims for contact and lands a
     cell or two short every time -- the fishing hamlet ended up one cell off the
     shore, which looks identical to not having moved at all. */
  const nudges = new Map<string, [number, number]>();
  for (const [id, st] of states) if (st.nudge) nudges.set(id, st.nudge);
  const offs = solveOffsets(
    settlements,
    held,
    (x, y) => ground.hasGround(x, y),
    nudges,
    (x, y) => wasGround.has(x + ',' + y)
  );
  const moving = settlements.list.filter((s) => {
    const o = offs.get(s.id)!;
    return (o[0] || o[1]) && held.get(s.id)!.size;
  });

  /* THE MOVE ITSELF, after the cut so the indices the cut used are still valid
     while it runs. Terrain and objects are translated together -- a settlement
     is its ground AND what stands on it, and moving one without the other is
     how you get a house in the sea beside an empty field. */
  if (moving.length) {
    const by = new Map(moving.map((s) => [s.id, offs.get(s.id)!]));
    const seam: [number, number][] = [];
    for (const t of doc.layout.tiles) {
      const id = settlements.at(t.cell[0], t.cell[1]);
      const d = id ? by.get(id) : undefined;
      if (!d) continue;
      t.cell = [t.cell[0] + d[0], t.cell[1] + d[1]];
      t.pos = [t.pos[0] + d[0], t.pos[1] + d[1], ...t.pos.slice(2)] as typeof t.pos;
    }
    for (const o of doc.layout.objects) {
      const id = ownerNear(settlements, o.pos[0], o.pos[1]);
      const d = id ? by.get(id) : undefined;
      if (!d) continue;
      o.pos = [o.pos[0] + d[0], o.pos[1] + d[1], o.pos[2]];
    }
    /* A MOVE LANDS TILES ON CELLS THAT ALREADY HAVE TILES, and two tiles on one
       slot is a document that cannot say what it draws. Collapsed here, the
       moment it happens and before anything indexes the result -- `Ground` keeps
       one tile index per cell per layer, so with a duplicate present half the
       model is reasoning about a record the renderer never shows. */
    doc.collapseTiles();
    ground.reindex();
    /* Every cell a moved settlement now touches, plus a ring. A cell's whole
       appearance is a function of its neighbours, so the seams are exactly
       where the artist's tiles are now beside something they were not drawn
       against. */
    for (const s of moving) {
      const d = by.get(s.id)!;
      for (const k of held.get(s.id)!) {
        const c = k.indexOf(',');
        const x = Number(k.slice(0, c)) + d[0],
          y = Number(k.slice(c + 1)) + d[1];
        for (let ex = -2; ex <= 2; ex++)
          for (let ey = -2; ey <= 2; ey++) {
            seam.push([x + ex, y + ey]);
          }
      }
    }
    ground.redress(seam);
  }

  /* THE LAND IS ONE SURFACE, NOT A SET OF SLABS.

     This replaces stitching, pinch-filling and orphan-sweeping, all three of
     which existed to paper over the same mistake: settlements owned their own
     stretch of shoreline, so moving them slid hand-drawn edges up against other
     hand-drawn edges and the gaps between became lagoons. 934 of the partition's
     cells are coast or sit on it, and every one of them looks the way it does
     because of what the artist put on the other side. The demo contains ZERO
     enclosed water; composing was making up to 87 cells of it.

     So the shape of the land is decided ONCE, for the whole map, and the coast
     is drawn around that. A settlement contributes where it wants ground, not
     what its edge looks like.

     The shape is a morphological CLOSING of everything the settlements want --
     grown by `REACH` cells and then shrunk by the same. Growing merges anything
     within 2*REACH into one body and swallows every channel and lagoon narrower
     than that; shrinking gives back the bulk, leaving an outline that follows
     the settlements without the gaps between them. It is one operation and it
     cannot leave a hole, which is the whole point: no seam to patch because
     there is no seam. */
  const placedLand = new Set<string>();
  for (const s of settlements.list) {
    const [ox, oy] = offs.get(s.id) ?? [0, 0];
    for (const k of held.get(s.id) ?? []) {
      const c = k.indexOf(',');
      const x = Number(k.slice(0, c)),
        y = Number(k.slice(c + 1));
      // Interior only. A settlement's own coast is not a claim about where the
      // land ends any more -- the closing decides that.
      if (!wasGround.has(k)) continue;
      placedLand.add(x + ox + ',' + (y + oy));
    }
  }

  /* HOW MUCH LAND BELONGS AROUND A CELL IS SOMETHING THE ARTIST ALREADY DECIDED.

     A uniform band is why the map came out as a rounded blob with an even edge:
     every settlement got the same wilderness whether it was a port or a
     farmstead, so no arrangement could ever produce a coast town. And the demo
     is not even -- some of it runs to open shore, some sits behind fifteen cells
     of woodland, and that variation IS the silhouette.

     So the band is measured off the base map instead of invented. Every cell
     knows how far it stood from the water when the artist drew it; the composed
     map gives it back exactly that much room. A quay cell had zero and stays on
     the waterfront. A cell deep in the fields had twelve and keeps its woods.
     Move the port anywhere and it is still a port, because the property that
     made it one travelled with it.

     Capped, because the very middle of the demo is 20-odd cells from any shore
     and reproducing that around a lone settlement would drown it in wilderness
     -- the cap is what stops one project filling half a sea. */
  /* Distance to open water in the BASE map, breadth-first from the sea. */
  const depth = new Map<string, number>();
  {
    const frontier: [number, number][] = [];
    for (const k of wasGround) {
      const c = k.indexOf(',');
      const x = Number(k.slice(0, c)),
        y = Number(k.slice(c + 1));
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        if (!wasGround.has(x + dx + ',' + (y + dy))) {
          depth.set(k, 0);
          frontier.push([x, y]);
          break;
        }
      }
    }
    for (let i = 0; i < frontier.length; i++) {
      const [x, y] = frontier[i];
      const d = depth.get(x + ',' + y)!;
      if (d >= DEPTH_CAP) continue;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const k = x + dx + ',' + (y + dy);
        if (!wasGround.has(k) || depth.has(k)) continue;
        depth.set(k, d + 1);
        frontier.push([x + dx, y + dy]);
      }
    }
  }

  /* Built in two, because a detached common has to be able to push the village
     back off it. Anywhere the two bands overlapped, the shared cells stayed land
     and quietly bridged the strait -- the island welded itself to the mainland
     in two of six states while every gap looked correctly carved. */
  const spread = (ids: string[], withBand = true) => {
    const out = new Set<string>();
    for (const id of ids) {
      const [ox, oy] = offs.get(id) ?? [0, 0];
      for (const k of held.get(id) ?? []) {
        if (!wasGround.has(k)) continue;
        const c = k.indexOf(',');
        const x = Number(k.slice(0, c)) + ox,
          y = Number(k.slice(c + 1)) + oy;
        out.add(x + ',' + y);
        if (!withBand) continue;
        const m = Math.min(depth.get(k) ?? 0, DEPTH_CAP);
        for (let dx = -m; dx <= m; dx++) {
          for (let dy = -m; dy <= m; dy++) {
            if (dx * dx + dy * dy <= m * m + m) out.add(x + dx + ',' + (y + dy));
          }
        }
      }
    }
    return out;
  };
  const ids = settlements.list.map((s2) => s2.id);
  /* The island keeps EXACTLY the ground it has and no band of wilderness. Give
     it one and the band reaches across the strait, the village's band reaches
     back, and the two weld together -- the island's house ended up inland with
     its bridge going nowhere. Its shape is its own; the water around it is what
     makes it an island. */
  const theirs = spread(
    ids.filter((id) => DETACHED.has(id)),
    false
  );
  const village = spread(
    ids.filter((id) => !DETACHED.has(id)),
    true
  );

  /* And the village is held off it by the width of the strait the artist drew,
     which is the span his bridge was built for. */
  /* NO STRAIT. Carving water round the island and keeping it open failed three
     different ways -- welded shut by the wilderness bands, filled as a pond when
     it landed in a bay, and leaving 2-to-6 cell crumbs with trapped water behind
     them when the smoothing was told to leave it alone. Each fix broke a state
     the last one had fixed.

     So it joins the shore like anywhere else, keeping its own ground and its own
     shape. The crossing is the thing given up, and it is the right thing to give
     up: a coherent map with no holes in it was the requirement, and a bridge
     over grass was never going to satisfy it either. Worth returning to when the
     island's strait can be part of its authored shape rather than carved out of
     the map around it. */
  const moat = new Set<string>();

  const wantLand = new Set<string>(theirs);
  for (const k of village) if (!moat.has(k)) wantLand.add(k);

  /* NOTE: smoothing the outline with a morphological closing was tried here to
     remove the bays that bite into the map, and it has to be done some other
     way. A closing seals a bay at its MOUTH, which turns the water behind it
     into a lagoon -- trapped water on 24 of 28 states, the very fault it was
     added to fix. Whatever removes the bays has to work on the water rather than
     on the land: find the inlets and fill them from the inside out. */

  /* A COASTLINE IS NOT A COMPASS ROSE, AND A UNION OF DISCS IS.

     The band above is grown with `dx*dx + dy*dy <= m*m`. Union enough discs and
     the outline is a smooth curve, and a smooth curve drawn on a 32px grid is
     the one silhouette this tileset cannot dress: long dead-straight runs where
     it is near an axis, and a perfect 45-degree staircase everywhere else. Two
     dozen cells of green cut on the diagonal with a right angle at every step,
     which is exactly what the eye reads as scissors.

     The artist's own boundary is measured in `terrainBrush.ts`: it steps in or
     out every 9 to 13 cells of its length and its straight stretches run a
     median of 2-3 cells. His coast wanders a boulder at a time. Nothing about
     the settlements decides that -- it is a property of a shoreline -- so it is
     put back here, on the shape, while the shape is still a set of cells with
     no art on it and a bump costs nothing.

     THE NOISE IS POSITIONAL, not random, so the same map composes the same way
     every time; and it is taken over 2x2 BLOCKS, because per-cell noise gives a
     fringe of one-cell warts rather than a coast, and a 2x2 is the smallest
     bump the tile tables have a piece for. Same reasoning, and the same block
     size, as `roughen`.

     IT ONLY EVER ADDS. Jittering both ways was tried and measures worse on the
     artist's own statistic: taking cells away as well cut the median straight
     stretch to 1 cell against his 2, which is not a wandering coast, it is a
     serrated one -- and every extra shore cell is another shaped tile with the
     sea behind it to keep sealed. Growing alone still breaks the diagonal, and
     it fills the concave right angles -- the square-cornered inlets bitten out
     between two settlements -- which are the corners that actually look cut. */
  {
    const JITTER = 0.34;
    const noise = (x: number, y: number, salt: number) =>
      cellHash((x >> 1) * 3 + salt, (y >> 1) * 5 + salt) / 0x7fffffff;
    for (let pass = 0; pass < 2; pass++) {
      const add: string[] = [];
      for (const k of wantLand) {
        const c = k.indexOf(',');
        const x = Number(k.slice(0, c)),
          y = Number(k.slice(c + 1));
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const n = x + dx + ',' + (y + dy);
          if (!wantLand.has(n) && noise(x + dx, y + dy, pass) < JITTER) add.push(n);
        }
      }
      for (const k of add) wantLand.add(k);
    }

    /* AND THE TREAD IS TWO CELLS, WHICH IS THE WHOLE OF THE STAIRCASE FAULT.

       A convex corner in the outline puts one cell diagonally outside it, and
       that cell can only ever be dressed with an outer-corner piece -- a stone
       slab facing the sea on two sides. The artist spends 125 of those on
       headlands, 7.4% of his shoreline; a composed coast ran to 13.1%, and on
       screen it is a chain of slabs stepping diagonally out to sea, each one
       individually legal. So the count of these IS the count of convex corners,
       and the corners come from the tread: a 45-degree staircase turns every
       cell, and every turn is a corner.

       NO LOCAL REPAIR CAN FIX IT, and four were measured before this. Filling
       the corner cell, filling the cardinal between two diagonal neighbours,
       eroding the tip, a 3x3 majority filter -- a 45-degree staircase is a
       FIXED POINT of all of them, because it is scale-invariant: smooth it and
       you get the same staircase one cell over. The majority filter drifts the
       artist's own outline by 57 cells and does not move his corner count at
       all. What actually decides the count is how far the boundary runs before
       it turns, and his median straight stretch is 2.

       So the outline is snapped to 2x2 blocks, which is the smallest bump the
       tile tables have a piece for and the same block the jitter is taken over.
       Every run comes out even and at least two long, and the corner density
       halves by construction rather than by tuning.

       IT MAY ADD LAND BUT IT MAY NOT TAKE A SETTLEMENT'S OWN GROUND. A block
       holding placed ground is filled, never cleared: the shape of a settlement
       is the artist's and is not this pass's to round off. Only wilderness --
       the band this composer grew itself -- is thinned. */
    snapToTread(wantLand, placedLand);

    /* AND NO CHANNEL THIS TILESET CANNOT DRAW.

       A one-cell strip of water with land on both sides has no art. The coast
       tables answer for a shore, and a shore is land on ONE side; asked about a
       cell with land north and south they hand back a north piece and the south
       piece is never drawn, so the strip comes out as a straight blue band with
       a hard green edge on each side, running for a dozen cells. Two of those
       cut through one composed map.

       There is a pass for this further down and by the time it runs it cannot
       fire: it skips any cell that is already a rim, and every cell of a
       one-wide channel has been given a rim by then, because it is beside land.
       Here the shape is still a set of cells with no art on it at all, which is
       the only place the question is easy.

       Up to two cells wide, which is where the artist stops as well: the
       narrowest water he ever drew with land facing itself across it is three,
       and the erase brush is already built to grow a hole to twelve cells for
       the same reason. Anything wider is a strait and is left alone -- those the
       tileset can draw, and those are where a bridge belongs. */
    const NARROW = 2;
    for (let pass = 0; pass < 2; pass++) {
      const close: string[] = [];
      for (const k of wantLand) {
        const c = k.indexOf(',');
        const x = Number(k.slice(0, c)),
          y = Number(k.slice(c + 1));
        for (const [dx, dy] of [
          [1, 0],
          [0, 1],
        ]) {
          for (let n = 1; n <= NARROW; n++) {
            let gap = true;
            for (let i = 1; i <= n; i++) {
              if (wantLand.has(x + dx * i + ',' + (y + dy * i))) {
                gap = false;
                break;
              }
            }
            // Land again on the far side: the water between is a channel.
            if (!gap || !wantLand.has(x + dx * (n + 1) + ',' + (y + dy * (n + 1)))) continue;
            for (let i = 1; i <= n; i++) close.push(x + dx * i + ',' + (y + dy * i));
            break;
          }
        }
      }
      if (!close.length) break;
      for (const k of close) wantLand.add(k);
    }
  }

  /* Anything the outline encloses is land, full stop. A closing cannot leave a
     lagoon, but the settlements' own ground can still ring one, so the inside is
     flooded from beyond the edge and whatever the flood never reaches is filled.
     The artist drew no enclosed water anywhere and neither will this. */
  {
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;
    for (const k of wantLand) {
      const c = k.indexOf(',');
      const x = Number(k.slice(0, c)),
        y = Number(k.slice(c + 1));
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
    x0 -= 2;
    y0 -= 2;
    x1 += 2;
    y1 += 2;
    const outside = new Set<string>([x0 + ',' + y0]);
    const stack: [number, number][] = [[x0, y0]];
    while (stack.length) {
      const [x, y] = stack.pop()!;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx,
          ny = y + dy,
          k = nx + ',' + ny;
        if (nx < x0 || nx > x1 || ny < y0 || ny > y1) continue;
        if (outside.has(k) || wantLand.has(k)) continue;
        outside.add(k);
        stack.push([nx, ny]);
      }
    }
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        const k = x + ',' + y;
        if (!wantLand.has(k) && !outside.has(k)) wantLand.add(k);
      }
    }
  }

  /* AND THE SHAPE MUST BE ONE PIECE, guaranteed here rather than hoped for.

     The solver slides settlements into contact and the band around them usually
     merges the lot, but at stage 1 the footprints are small and the bands can
     fall short: ten projects at their smallest left a 434-cell lump of village
     across open water. Chasing that back through the slide is chasing a target
     that moves with every stage.

     This is the cheapest possible place to fix it -- the shape is still just a
     set of cells, with no coast drawn and no art in it, so widening a link costs
     nothing and cannot leave a seam. Whatever is still adrift gets a neck to the
     nearest land, and the coast is drawn afterwards around the result.

     The island is left alone: it is meant to be across the water, and it is
     recognised by having been given a gap on purpose. */
  {
    /* Meant to be across water: a settlement whose ground never met anyone
       else's on the artist's map. Measured here rather than taken from the
       solver, which keeps its own reasons private. */
    const islandKeys = new Set<string>();
    for (const s of settlements.list) {
      if (!DETACHED.has(s.id)) continue;
      const [ox, oy] = offs.get(s.id) ?? [0, 0];
      for (const k of held.get(s.id) ?? []) {
        const c = k.indexOf(',');
        islandKeys.add(Number(k.slice(0, c)) + ox + ',' + (Number(k.slice(c + 1)) + oy));
      }
    }
    for (let pass = 0; pass < 6; pass++) {
      const seenC = new Set<string>();
      const groups: string[][] = [];
      for (const k of wantLand) {
        if (seenC.has(k)) continue;
        const part: string[] = [];
        const st = [k];
        seenC.add(k);
        while (st.length) {
          const c = st.pop()!;
          part.push(c);
          const i = c.indexOf(',');
          const x = Number(c.slice(0, i)),
            y = Number(c.slice(i + 1));
          for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ]) {
            const q = x + dx + ',' + (y + dy);
            if (wantLand.has(q) && !seenC.has(q)) {
              seenC.add(q);
              st.push(q);
            }
          }
        }
        groups.push(part);
      }
      groups.sort((a, b) => b.length - a.length);
      const stray = groups.slice(1).filter((g) => !g.some((k) => islandKeys.has(k)));
      if (!stray.length) break;
      const main = new Set(groups[0]);
      for (const g of stray) {
        let from: [number, number] | null = null,
          to: [number, number] | null = null;
        let best = Infinity;
        for (const k of g) {
          const i = k.indexOf(',');
          const x = Number(k.slice(0, i)),
            y = Number(k.slice(i + 1));
          for (const m of main) {
            const j = m.indexOf(',');
            const mx = Number(m.slice(0, j)),
              my = Number(m.slice(j + 1));
            const d = (x - mx) ** 2 + (y - my) ** 2;
            if (d < best) {
              best = d;
              from = [x, y];
              to = [mx, my];
            }
          }
        }
        if (!from || !to) continue;
        const steps = Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1]));
        for (let i = 0; i <= steps; i++) {
          const x = Math.round(from[0] + ((to[0] - from[0]) * i) / steps);
          const y = Math.round(from[1] + ((to[1] - from[1]) * i) / steps);
          // Wide enough to read as an isthmus rather than as a repair, and wide
          // enough for the coast tables to have an answer on both sides of it.
          for (let dx = -3; dx <= 3; dx++) {
            for (let dy = -3; dy <= 3; dy++) {
              if (dx * dx + dy * dy <= 9) wantLand.add(x + dx + ',' + (y + dy));
            }
          }
        }
      }
    }
  }

  /* AND THE TREAD AGAIN, over whatever the stitch drew. */
  snapToTread(wantLand, placedLand);
  /* NOT `wander` HERE, AND THAT IS A MEASUREMENT NOT AN OVERSIGHT. It exists
     for an authored block, where a typed rectangle runs twelve cells without a
     thought in it. The COMPOSER's outline comes from settlement shapes and the
     tread snap and is already at his profile -- median run 2 against his 2,
     p75 4 against his 5, and 19 stretches over eight cells against his 24. It
     is if anything more restless than he is. Run here it shortened 5 of those
     and cost E1 3 -> 5 and E2 1 -> 2, which is paying for a fault this map
     does not have. */

  /* AND EVERY SHAPE IN IT IS A SHAPE HE DREW.

     `atlas.json` records, for every coast sprite, the 8-neighbour signatures the
     artist actually placed it at. Where the composed outline lands on a
     signature that appears nowhere in his village there is no piece to reach
     for at all -- `redress` sees an empty pool and leaves whatever the autotile
     tables guessed, and the critic scores it as E7, a piece that does not
     belong. Measured on one composed map, 23 of the 25 remaining E7 cells were
     this and not a bad choice among candidates.

     So it is settled here, on the shape, where the repair costs one cell of
     wilderness and cannot leave a seam -- rather than on the art, where there is
     no answer. A bad cell is offered the five one-cell flips that could change
     its neighbourhood (itself, or any of its four cardinal neighbours) and takes
     whichever leaves the fewest illegal shapes within two cells. Greedy, applied
     as it goes, and capped: a repair that cannot better its neighbourhood is
     left alone rather than churned.

     ONLY EVER ADDING. Taking cells away can strand what stood on them, and the
     one thing every pass here has to promise is that a settlement's own ground
     survives. */
  if (atlas) legaliseOutline(wantLand, atlas);

  /* Now make the map match the shape: take away ground that is outside it, and
     put ground where it is short. `addLand` dresses the new coast as it goes,
     which is the same code that has always drawn the artist's shoreline -- it
     just gets one whole outline to draw instead of a patch between two slabs. */
  const outsideNow: [number, number][] = [];
  for (const t of doc.layout.tiles) {
    const k = t.cell[0] + ',' + t.cell[1];
    if (!t.file || wantLand.has(k)) continue;
    if (ground.hasGround(t.cell[0], t.cell[1]) || ground.isRim(t.cell[0], t.cell[1])) {
      outsideNow.push([t.cell[0], t.cell[1]]);
    }
  }
  if (outsideNow.length) ground.erase(outsideNow, undefined, undefined, true);

  const missing: [number, number][] = [];
  for (const k of wantLand) {
    const c = k.indexOf(',');
    const x = Number(k.slice(0, c)),
      y = Number(k.slice(c + 1));
    if (!ground.hasGround(x, y)) missing.push([x, y]);
  }
  if (missing.length) ground.addLand(missing, true);
  if (atlas) legaliseCoast(doc, ground, atlas);
  {
    const now = new Set<string>();
    for (const k of wantLand) {
      const c = k.indexOf(',');
      if (ground.hasGround(Number(k.slice(0, c)), Number(k.slice(c + 1)))) now.add(k);
    }
    for (const t of doc.layout.tiles) {
      if (!t.file) continue;
      const k = t.cell[0] + ',' + t.cell[1];
      if (ground.hasGround(t.cell[0], t.cell[1])) now.add(k);
    }
  }

  /* THE LAST SWEEP, against the map that actually came out.

     Everything above decides what to keep by ASKING WHO OWNS WHAT, and ownership
     is a near-enough answer for an object standing over water: its pivot cell
     belongs to nobody, so it is given to whoever is nearest, and at a boundary
     that can be a different settlement from the one whose ground is under it.
     Then one moves and the other does not, and a bush is left in the sea. Five
     of them, with every project at stage 4.

     Chasing that through the ownership rules is chasing a special case. Looking
     at the finished map is not: anything over open water that was not over water
     to begin with was stranded by this composition, whatever the reason, and it
     goes. The artist's own docks and bridge are on the ledger from the start. */
  /* AND THE COAST WITH NOTHING BEHIND IT.

     A rim cell is a cliff edge, and the sweep that removes cliffs whose ground
     has gone cannot touch these: they belong to a settlement that is staying, so
     `keep` protects them -- which is exactly right at a border and exactly wrong
     once the ground they edged has moved away. They are invisible to every check
     here too, because those count `hasGround` and a rim cell is not ground. Only
     the picture shows them: three specks of stone in the western sea at stage 1,
     30 of them with every project shrunk.

     Ask the finished map again. Coast with no ground within two cells is not
     edging anything. */
  /* NO `keep` HERE, and that is the point. `keep` is what stops a cut crossing
     into a settlement that is staying, and these cells BELONG to one -- which is
     why the ordinary sweep cannot touch them and why passing it here left 7 of
     the 30 behind. An orphan is three cells clear of any ground by definition,
     and a cut spreads at most one, so there is nothing for it to reach.

     Looped, because taking one away can leave the next one unbacked. */
  for (let pass = 0; pass < 3; pass++) {
    const orphanCoast: [number, number][] = [];
    for (const t of doc.layout.tiles) {
      const [cx, cy] = t.cell;
      if (!t.file || ground.hasGround(cx, cy) || !ground.isRim(cx, cy)) continue;
      let backed = false;
      for (let dx = -2; dx <= 2 && !backed; dx++) {
        for (let dy = -2; dy <= 2 && !backed; dy++)
          if (ground.hasGround(cx + dx, cy + dy)) backed = true;
      }
      if (!backed) orphanCoast.push([cx, cy]);
    }
    if (!orphanCoast.length) break;
    ground.erase(orphanCoast, undefined, undefined, true);
  }

  /* A LAST LOOK AT THE SHORE.

     A cell's coast tile is chosen from its neighbourhood, and by now the
     neighbourhood has been cut, moved, stitched and swept. Cells whose shape
     changed after they were last resolved can be left bare -- water touching
     grass with no cliff on it, which draws as a 32px straight edge and reads as
     scissors. Six of them at stage 3. Asking those cells again is cheap and
     costs nothing where the answer has not changed. */
  /* CLOSE THE PINCHES FIRST, because they cannot be drawn at all.

     Two settlements sliding almost together leave a channel of water one cell
     wide with land on both sides. Every one of the five cells left undressed at
     stage 3 was this shape -- cardinal mask 5 or 13, water with ground north AND
     south -- and the coast tables have no entry for any of them, because the
     artist drew ZERO enclosed water in the whole village. There is no tile for
     it; asking the shore again can never fix it.

     So the gap is closed instead. A single cell of sea between two parts of the
     same village is a seam, not a strait, and the village is better joined than
     pinched. Wider channels are left alone -- those the tileset can draw, and
     those are where a bridge belongs. */
  const pinch: [number, number][] = [];
  for (const t of doc.layout.tiles) {
    const [cx, cy] = t.cell;
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) {
        const x = cx + dx,
          y = cy + dy;
        if (ground.hasGround(x, y) || ground.isRim(x, y)) continue;
        const ns = ground.hasGround(x, y + 1) && ground.hasGround(x, y - 1);
        const ew = ground.hasGround(x + 1, y) && ground.hasGround(x - 1, y);
        if (ns || ew) pinch.push([x, y]);
      }
  }
  if (pinch.length) ground.addLand(pinch, true);

  /* NO WATER INSIDE THE COAST, checked on what actually came out.

     The shape asked for has no lagoons in it -- the fill above sees to that --
     but asking for a shape and getting it are different things: `addLand`
     roughens its own edge, refuses cells it cannot dress, and the erase before
     it takes a cell past its footprint. Between them they left 713 cells of
     enclosed water on one scrambled layout while the intended outline had none.

     So the real map is flooded from beyond its edge and anything the sea never
     reaches becomes land. The artist drew no enclosed water in the whole village
     and this is the only way to promise the same. */
  for (let pass = 0; pass < 4; pass++) {
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;
    for (const t of doc.layout.tiles) {
      if (!t.file) continue;
      const [cx, cy] = t.cell;
      x0 = Math.min(x0, cx);
      x1 = Math.max(x1, cx);
      y0 = Math.min(y0, cy);
      y1 = Math.max(y1, cy);
    }
    if (!Number.isFinite(x0)) break;
    x0 -= 2;
    y0 -= 2;
    x1 += 2;
    y1 += 2;
    const wet = (x: number, y: number) => !ground.hasGround(x, y) && !ground.isRim(x, y);
    const sea = new Set<string>([x0 + ',' + y0]);
    const stack: [number, number][] = [[x0, y0]];
    while (stack.length) {
      const [x, y] = stack.pop()!;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx,
          ny = y + dy,
          k = nx + ',' + ny;
        if (nx < x0 || nx > x1 || ny < y0 || ny > y1 || sea.has(k) || !wet(nx, ny)) continue;
        sea.add(k);
        stack.push([nx, ny]);
      }
    }
    const lagoon: [number, number][] = [];
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        /* The island's strait is NOT exempt here, and that is a decision rather
           than an oversight. It is kept open wherever it reaches the sea, which
           is nearly always -- but where the village curls round and would leave
           it as a pond, the pond is the worse of the two outcomes and the island
           simply joins the shore. A hole in the middle of the map is the thing
           this whole model exists to prevent; an island that occasionally
           becomes a headland is not. */
        if (wet(x, y) && !sea.has(x + ',' + y)) lagoon.push([x, y]);
      }
    }
    if (!lagoon.length) break;
    ground.addLand(lagoon, true);
  }

  /* SOW THE WILD LAND.

     Everything the band and the closing added is bare meadow, and bare meadow
     over a third of the map is what makes a composed village read as a lawn
     rather than a place. The demo runs about 17.5 objects per 100 cells; empty
     ground here ran zero.

     Only ground nobody has settled, so a settlement's own yards, fields and
     paths are never sown over. `Scatter` picks species from what is already
     growing nearby, so the new planting takes its cue from the artist's own
     woods where it meets them. */
  if (scatter) {
    const settled = new Set<string>();
    for (const s of settlements.list) {
      const [ox, oy] = offs.get(s.id) ?? [0, 0];
      for (const k of held.get(s.id) ?? []) {
        const c = k.indexOf(',');
        settled.add(Number(k.slice(0, c)) + ox + ',' + (Number(k.slice(c + 1)) + oy));
      }
    }
    const wild: [number, number][] = [];
    for (const k of wantLand) {
      if (settled.has(k)) continue;
      const c = k.indexOf(',');
      const x = Number(k.slice(0, c)),
        y = Number(k.slice(c + 1));
      if (ground.isGrass(x, y)) wild.push([x, y]);
    }
    /* Sown in blocks with a positional seed rather than in one call: `Scatter`
       spaces what it sows against what is already there, and handing it four
       thousand cells at once makes one enormous evenly-spread thicket. Blocks
       let it vary, and the seed keeps it the same map every time. */
    const BLOCK = 24;
    const blocks = new Map<string, [number, number][]>();
    for (const [x, y] of wild) {
      const k = Math.floor(x / BLOCK) + ',' + Math.floor(y / BLOCK);
      const arr = blocks.get(k);
      if (arr) arr.push([x, y]);
      else blocks.set(k, [[x, y]]);
    }
    /* A DIFFERENT BRUSH IN EVERY BLOCK. The vegetation brush's size chooses WHAT
       grows, not just how much -- big sizes reach the canopy trees, small ones
       lay flowers and grass tufts. Sowing everything at one size gave the whole
       map the same wood: thousands of identical trees and nothing else.

       So each block draws its own size from its position. Most land comes out
       middling, some is deep wood, some is open flowery meadow, and the seams
       between them read as clearings rather than as a change of setting. */
    for (const [k, cells] of blocks) {
      const c = k.indexOf(',');
      const bx = Number(k.slice(0, c)),
        by = Number(k.slice(c + 1));
      const h = cellHash(bx, by) / 0x7fffffff;
      /* WOODED BY DEFAULT, WITH CLEARINGS -- not the other way round. Weighting
         the draw toward small brushes gave a map of flowers and bare grass,
         which is thinner than the one-size version it replaced. The demo's
         wilderness is trees with meadow between them, so the weighting runs the
         other way: mostly canopy, occasionally open. */
      const size = 12 - Math.round(h * h * 8);
      scatter.plant(cells, size, cellHash(bx * 7 + 1, by * 13 + 5));
    }
  }

  const shore: [number, number][] = [];
  let lastBare = Infinity;
  for (let pass = 0; pass < 4; pass++) {
    shore.length = 0;
    for (const t of doc.layout.tiles) {
      const [cx, cy] = t.cell;
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++) {
          const x = cx + dx,
            y = cy + dy;
          if (ground.hasGround(x, y) || ground.isRim(x, y)) continue;
          if (
            ground.hasGround(x, y + 1) ||
            ground.hasGround(x + 1, y) ||
            ground.hasGround(x, y - 1) ||
            ground.hasGround(x - 1, y)
          )
            shore.push([x, y]);
        }
    }
    if (!shore.length) break;
    /* Compared across PASSES, not within one. Measuring the array against a
       length taken from the same array is always equal, so this loop ran once
       and called it converged -- fine until the necks got longer and left
       shapes that take a second look to settle. */
    if (shore.length >= lastBare) break;
    lastBare = shore.length;
    ground.redress(shore);
  }

  const nav = planRoads(doc, ground, settlements, states, held, offs, true);

  /* AND ONE LAST LOOK FOR WATER INSIDE THE COAST, because the roads run after
     everything else and a cut can still pinch a single cell off. One cell of
     lagoon is invisible in a screenshot and is exactly the class of fault that
     accumulates, so it is swept here rather than argued about. */
  {
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
    if (Number.isFinite(x0)) {
      x0 -= 2;
      y0 -= 2;
      x1 += 2;
      y1 += 2;
      const wet = (x: number, y: number) => !ground.hasGround(x, y) && !ground.isRim(x, y);
      const sea = new Set<string>([x0 + ',' + y0]);
      const st: [number, number][] = [[x0, y0]];
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
            k = nx + ',' + ny;
          if (nx < x0 || nx > x1 || ny < y0 || ny > y1 || sea.has(k) || !wet(nx, ny)) continue;
          sea.add(k);
          st.push([nx, ny]);
        }
      }
      const left: [number, number][] = [];
      for (let x = x0; x <= x1; x++) {
        for (let y = y0; y <= y1; y++) if (wet(x, y) && !sea.has(x + ',' + y)) left.push([x, y]);
      }
      /* Widened by a ring before filling. `addLand` roughens what it is given
         and declines what it cannot dress, and a single cell ringed by land is
         precisely the shape the coast tables have no answer for -- so asked for
         one cell it does nothing at all, and the hole survives every pass.
         Given its neighbours too, there is a shape it can draw. */
      if (left.length) {
        const wide = new Set<string>();
        for (const [x, y] of left) {
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) wide.add(x + dx + ',' + (y + dy));
          }
        }
        ground.addLand(
          [...wide].map((k) => {
            const c = k.indexOf(',');
            return [Number(k.slice(0, c)), Number(k.slice(c + 1))] as [number, number];
          }),
          true
        );
      }
    }
  }

  /* AND NO LIGHT THROUGH THE FLOOR.

     Every pass above reasons in the cell model, and the cell model cannot see
     this fault: a cell is perfectly good land in `hasGround` and still shows the
     backdrop, because the tile drawn on it is one of the shaped ones and there
     is nothing behind it. That is the scattering of blue puddles in open meadow
     -- 15,000 pixels of them on one composed map, none of it anywhere the
     checks were looking.

     Last, because it measures the map that actually came out rather than the
     one each pass intended, and because the roads run late enough to open new
     ones. See `Ground.seal`. */
  ground.seal();

  const stranded: number[] = [];
  doc.layout.objects.forEach((o, i) => {
    if (o.group === 'SCENE') return;
    const cx = Math.floor(o.pos[0]),
      cy = Math.floor(o.pos[1]);
    if (ground.hasGround(cx, cy) || ground.isRim(cx, cy)) return;
    if (bornOverWater.has(o.prefab + '@' + o.pos[0] + ',' + o.pos[1])) return;
    stranded.push(i);
  });
  if (stranded.length) doc.remove(stranded.sort((a, b) => b - a));

  /* AND WRITE DOWN WHERE EVERYTHING IS, against the map that actually came out.

     Taken here rather than beside the routing, because between the two the
     stranded sweep removes objects, the seal lays ground and the last lagoon
     pass can add some -- so a walkability map built earlier would describe a
     village that no longer exists. `nav` is the only part of the document an
     agent can read without re-deriving the whole composition, so it has to be
     the finished map or it is worse than nothing. */
  /* AND DRESS THE SHORE PROPERLY, last of all.

     The autotile tables choose a piece by its SHAPE and know nothing about what
     it is made of at the seam, which is why a composed coast could be correct
     cell by cell and still show grass meeting open water. `redress` reads the
     atlas -- the same file the Python reviewer reads -- and re-picks each coast
     tile to satisfy the seam as well as the shape. It only ever replaces a tile
     already there, so it cannot move the shoreline this late. */
  if (atlas) {
    /* THE DRESSING, ROUND AND ROUND UNTIL IT SETTLES.

       Four passes, each answering for something the others change:

         `redress`    the coast: which piece belongs at this neighbourhood
         `verge`      a bare cell gives way where the meadow beside it cannot
         `relegalise` a shape the artist never drew, repaired with a cell of grass
         `resurface`  the meadow: which piece lines up with the one beside it

       They are not independent. Laying a cell of meadow to legalise a shape
       turns the coast tile beside it into a cliff standing in a field, which is
       `redress`'s business; re-dressing that cell changes the seam its meadow
       neighbour was chosen against, which is `resurface`'s. Run once through,
       a composed map keeps 18 coast pieces that do not belong and 12 meadow
       pieces the artist never used at that neighbourhood; run to a fixed point,
       10 and 12. So it loops until a round changes nothing, and the cap is
       there because a cycle between two of them would otherwise spin. */
    let n = 0;
    let scope: Set<string> | undefined;
    for (let round = 0; round < 16; round++) {
      /* ONE PASS EACH, and the round is what iterates. Every one of these has
         a loop of its own -- it has to, when it is called on its own -- and
         nesting them multiplies the work: eight rounds of three, two, three and
         four internal passes is ninety-six sweeps of fifteen thousand tiles,
         which took a composition from three seconds to twenty. Run singly they
         reach the same fixed point, because the round re-runs whatever still
         has something to do. */
      /* AND ONLY WHERE SOMETHING MOVED. Each pass reports the cells it changed,
         widened by three, and the next round looks nowhere else -- see `REACH`
         in `redress.ts`. The first round sees the whole map, which is where all
         but a couple of hundred of the changes happen. */
      const hit = new Set<string>();
      const did =
        redress(doc, atlas, 1, scope, hit) +
        verge(doc, atlas, 1, scope, hit) +
        relegalise(doc, atlas, 1, scope, hit) +
        resurface(doc, atlas, 1, scope, hit);
      scope = hit;
      n += did;
      /* STOP WHEN IT STOPS GETTING BETTER. Measured, a composition does 2,000
         of its 2,400 changes in the first two rounds, is down to single figures
         by the fourth, and then cycles: three coast cells swapping back and
         forth between two pieces that score within a hair of each other. The
         cycle is harmless and endless, and running it to the cap cost four
         seconds a composition for nothing. */
      if (!did) break;
    }
    /* AND THE SHORE HAS THE LAST WORD. `resurface` is the last pass in the
       round, so anything it changes about a meadow beside the sea goes
       unanswered if the loop stops there -- and it stops there whenever the cap
       is reached. Three coast pieces that do not belong, on one composed map,
       were made by the final round and outlived it. */
    /* THE SETTLING, AND IT ALWAYS ENDS WITH THE SHORE.

       Two things alternate here and each undoes a little of the other. The
       dressing decides which piece is drawn on a cell; `seal()` decides where a
       floor is needed, and it lays GROUND -- which changes what every coast
       tile beside it is standing next to. A neighbourhood the artist never drew
       has no piece to reach for, so a coast cell left facing one after the last
       re-dressing simply stays wrong: three of one composed map's remaining
       "does not belong" cells were made by a seal that ran after everything
       else had finished.

       So it alternates to a close: dress, seal, dress, seal, dress. It is
       unconditional rather than guarded on whether the last step changed
       anything, because the guard was the bug -- a seal that lays one cell of
       dirt does not report itself to the pass that needs to know. The cost is
       two sweeps of a map that is nearly settled, which the scope machinery
       above makes cheap. */
    /* THE SETTLING, AND IT ALWAYS ENDS WITH THE SHORE.

       Two things alternate here and each undoes a little of the other. The
       dressing decides which piece is drawn on a cell; `seal()` decides where a
       floor is needed, and it lays GROUND -- which changes what every coast
       tile beside it is standing next to. A neighbourhood the artist never drew
       has no piece to reach for, so a coast cell left facing one after the last
       re-dressing simply stays wrong.

       And the cascade runs both ways: `redress` turns a coast tile ringed by
       land into meadow, which puts a meadow piece at a neighbourhood nobody has
       re-picked, and `resurface` opens a meadow cell, which is a hole for
       `seal` to floor and a new neighbour for `redress` to answer. Every one of
       these was a real finding on a real state -- the last one, a single cell
       of a scrambled village, is why this is a loop and not a sequence.

       So it runs to a standstill: dress, seal, dress, seal, until a round
       changes nothing, and then the shore has the last word. Unconditional
       rather than guarded on whether the previous step reported a change,
       because the guard was the bug -- a seal that lays one cell of dirt does
       not report itself to the pass that needs to know. The scope machinery
       above makes each of these sweeps cheap on a map that is nearly settled. */
    n += redress(doc, atlas, 3);
    ground.reindex();
    ground.seal();
    ground.reindex();
    for (let round = 0; round < 8; round++) {
      const did = redress(doc, atlas, 30) + resurface(doc, atlas, 3) + relegalise(doc, atlas, 2);
      ground.reindex();
      if (!did) break;
      ground.seal();
      ground.reindex();
    }
    /* A conversion late in a sweep leaves a neighbour only the next sweep can
       see, so this one runs until a sweep changes nothing: eight passes still
       ended mid-cascade, with a piece that was legal at the neighbourhood it
       had when the sweep started and illegal by the time it finished. */
    redress(doc, atlas, 30);
    ground.reindex();

    /* AND THE SHORE, SOLVED AS A CHAIN, WITH THE LAST WORD.

       Everything above chooses one cell at a time. `dressCoast` chooses the
       whole coastline at once against the artist's own join table -- which
       pieces he ever stood beside each other, on all eight sides -- and gives
       a lip the rock that hangs under it where the ring never made room. On a
       composed map the passes above left 69% of the vertical joins as pairs he
       never drew, and dressed a west-facing shore with 5 sprites where he uses
       19. Neither is visible to any per-cell rule; both are obvious on screen.

       It runs LAST because the neighbourhood it solves has to be the final
       one, and because it only ever rewrites which sprite is drawn on a cell
       that already holds a coast tile -- plus the second half of a bonded
       pair, which is the one thing it adds. `seal` follows it for the reason
       it follows everything else. */
    dressCoast(doc, atlas);
    ground.reindex();
    ground.seal();
    ground.reindex();
    /* AND ONLY NOW THE FILLERS, BECAUSE THEY AND `seal` WANT THE SAME SLOT.
       The coast sits on `Layer 01`, so the one layer beneath it is `Dirt`.
       `seal` floors a cell that shows water the sea cannot reach; `fillIn`
       closes a seam two shapes leave open. Where `seal` has acted there is no
       seam left, and where it has declined -- the shoreline proper -- the slot
       is free. Run the other way round this squats on eleven of `seal`'s cells
       and opens `T2` on eleven states. */
    fillIn(doc, atlas);
    ground.reindex();
  }

  /* AND ONE LAST LOOK FOR A YARD NOBODY CAN REACH. See `spurRoutes`: which
     cells read as worked ground is decided by the picture, and the picture is
     only finished here -- the re-dressing above opens and closes fringe cells
     after the roads were laid. Publishing only, no cutting: by this point the
     shore has been settled and a fresh cut would need the whole dressing pass
     run again. */
  {
    const solid2 = solidCells(doc.layout.objects);
    const walk2 = walkableAt(ground, solid2);
    const route2 = router(walk2, (x, y) => ground.isTrodden(x, y));
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
    /* AND RE-PLAN ANY ROUTE THE SHORE PASS WALKED OUT FROM UNDER.

       The routes are laid before the coast is dressed, and dressing changes
       which cells you can stand on -- a lip that was a grass shelf becomes a
       rock face. `weave` will not make that trade where it has any choice, but
       a bonded pair has no choice: 129 goes under 97 whatever was there. Wired
       in without this, the composed village came back with two routes crossing
       ground that had stopped being ground (P1 2) and a settlement cut off
       (N2 1). Re-planned here, on the ground as it finally is, which is the
       same discipline as `spurRoutes` just below and for the same reason. */
    for (const rt of nav.routes) {
      const cells = rt.cells as [number, number][];
      if (!cells.length || cells.every(([x, y]) => walk2(x, y))) continue;
      const again = route2(cells[0], cells[cells.length - 1]);
      if (again.length) rt.cells = again;
    }
    if (Number.isFinite(x0)) {
      spurRoutes(doc, ground, walk2, route2, nav.places, nav.anchors, nav.routes, [x0, y0, x1, y1]);
    }
  }

  doc.layout.nav = describeNav(doc, ground, nav.places, nav.anchors, nav.routes, nav.unreachable);

  return {
    removed,
    objects: objs.size + stranded.length,
    absent,
    moved: moving.length,
    offsets: offs,
    unreachable: nav.unreachable,
    routes: nav.routes.length,
  };
}
