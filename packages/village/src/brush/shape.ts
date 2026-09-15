/* The two passes that shape a piece of land into a shape the artist drew.

   Lifted out of the village editor's composer, which is the growth engine and
   is not in this repo: nothing here grows anything. These are the passes the
   shore pass runs before it dresses a coast, and they are what stop a cut edge
   coming out as a staircase of one-cell steps when his own coast never does. */

import type { Atlas } from './redress';

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
