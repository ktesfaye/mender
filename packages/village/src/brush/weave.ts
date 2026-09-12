/* Dress a shoreline as a CHAIN, not as a bag of independent cells.

   WHAT THIS REPLACES AND WHY. Every stage before it asked "what belongs on
   THIS cell": the autotile tables key on one cell's 8-neighbour signature, and
   `redress` re-scored one cell at a time and kept the highest. Measured
   against the artist that is the wrong question. On his own coast, knowing the
   tile ABOVE fixes the tile below to within 1.17 bits of the 6.09 a tile
   carries alone -- his shoreline is drawn from a vocabulary of 246 vertical
   and 309 horizontal joins. On a composed map 83% of the vertical joins were
   pairs he never drew, while every single piece was legal for its own cell.
   That is a fault no per-cell rule can see and no per-cell rule can fix, which
   is why all 27 critic rules came back green on a coast that was obviously
   wrong in a screenshot.

   And an argmax over a continuous score dresses a whole coastline in one
   sprite: `redress` ended in `seam * 1000 + stone * 100 + used / 10`, none of
   which ever ties, so every cell with the same signature and the same
   neighbours got the same answer -- and a signature is the same all the way
   along a straight run. His west-facing shore uses 19 pieces with the
   commonest on 21% of it; that pass drew it with 5, the commonest on 92%.

   THE VOCABULARY IS NOT IN THIS FILE. `atlas.py` derives it off the artist and
   writes it into `atlas.json` under `coast`; this reads it, and so does
   `critic.py`. One table, two readers, no third copy -- which is the rule this
   codebase exists to keep after arriving at three ideas of "walkable".

     joins  which piece may stand on which side of which, all eight
     bonds  the 23 pieces that come in pairs -- 97 is the top half of 129
     kinds  which kinds are shoreline at all

   Everything here is a FILTER, never a ranking. Ranking on the seam, and again
   on stone-at-the-waterline, was tried: both made the ARTIST'S OWN map worse
   (E1 0 -> 2, E6 19 -> 21) because a few aligned pixels is not what the critic
   measures and chasing it pulls the choice away from the piece that belongs.
   A filter that removes offending candidates and yields when it would remove
   them all cannot do that.                                                   */

import type { Document } from '../doc/document';
import { cellHash, interiorFill, standable } from '../scene/terrain';
import type { Atlas } from './redress';

const LAYERS = ['Dirt', 'Layer 01', 'Layer 02', 'Layer 03', 'Layer 04'];
const LEVEL = new Map(LAYERS.map((n, i) => [n, i]));
/** Every tile on a layer carries that layer's order and no other -- and
    `sorting_order` OUTRANKS depth, so a tile written to a lower layer with the
    order it was copied from does not sit under anything. It ties, and which
    one you see is then whose tie-break you ask. */
const ORDER = [-8, -7, -5, -3, -1];
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
/** ALL EIGHT, AND THE DIAGONALS ARE THE HALF THAT WAS MISSING. A coast turns
    at a diagonal: at every step in the outline the next piece along the shore
    is the one at the corner, not the one beside it. Constrained on four
    neighbours the joins came back 2-7% wrong on the cardinals and 12-19% wrong
    on the diagonals -- which is exactly where every remaining fault was. */
const SIDES: [string, number, number][] = [
  ['N', 0, 1],
  ['E', 1, 0],
  ['S', 0, -1],
  ['W', -1, 0],
  ['NE', 1, 1],
  ['SE', 1, -1],
  ['SW', -1, -1],
  ['NW', -1, 1],
];
const OPPOSITE: Record<string, string> = {
  N: 'S',
  E: 'W',
  S: 'N',
  W: 'E',
  NE: 'SW',
  SE: 'NW',
  SW: 'NE',
  NW: 'SE',
};
const CLIMB = new Set(['stair', 'stair-water', 'bridge-arch', 'bridge-vertical']);
/** Of the artist's signatures none has eight land neighbours; two have seven
    and both are his, deliberately. `redress` sets this at 6, which on HIS OWN
    map converts those two and leaves their neighbour holding a piece that no
    longer belongs. His maximum is the budget, so the bar is seven. */
const LAND_MAX = 7;
const TILE = (n: number) => `terrain-tiles/TX Tileset Terrain_${n}.png`;
const LAND = 'L',
  SEA = 'S';
/** `review.py`'s own thresholds: an edge is grassy at 0.15 and not stony below
    0.5. Scoring a repair on anything else optimises for a quantity nobody is
    measuring. */
const GRASSY = 0.15,
  BARE = 0.5;
/** E2's own threshold. Below ten pixels the join is clean and there is nothing
    to prefer; above it there is, and only then does the seam get a say. */
const NOTCH = 10;
const WALK_GUARD = true;
/** E1's own threshold: a seam cut clean through. */
const CUT = 24;

const num = (f: string) => Number(f.match(/_(\d+)\.png$/)?.[1]);
const key = (x: number, y: number) => x + ',' + y;

export interface CoastTables {
  joins: Record<string, Record<string, Record<string, number>>>;
  /** How often he reached for each piece at each signature. NOT the same as
      `facing`, which is a deduped list of the neighbourhoods a sprite was used
      at -- reading a weight off that gives every candidate a 1 and throws his
      hand away, which is exactly what this file did until the derived solver
      and the editor were diffed and disagreed on 485 cells of his own map. */
  at: Record<string, Record<string, number>>;
  bonds: Record<string, number>;
  /** What he lays UNDER a seam he has cut. Keyed `a|d|b`; `cell` says which of
      the two cells the extra tile goes in. See `fillIn`. */
  fillers: Record<string, { cell: string; file: string; n: number; cut: number }>;
  kinds: string[];
}

/** @param scope cells this call may re-choose; everything outside is fixed and
      reads as a neighbour. Undefined means the whole map, which is what a
      compose wants. THE BRUSH CANNOT AFFORD THE WHOLE MAP: a stroke is applied
      on every pointer move, and the full solve is 106ms on top of a 359ms
      commit -- unusable to paint with. A shoreline is a chain but it is a
      LOCAL one, so a stroke solves its own cells against fixed neighbours and
      gets the same answer for a tenth of the work.
    @returns how many cells were dressed. */
export function weave(doc: Document, atlas: Atlas, scope?: Set<string>): number {
  const coast = (atlas as unknown as { coast?: CoastTables }).coast;
  if (!coast?.joins) return 0;
  const tiles = atlas.tiles;
  const KINDS = new Set(coast.kinds);
  const bond = coast.bonds;

  // The visible tile of every cell, which is what the shore actually is.
  const top = new Map<string, number>();
  doc.layout.tiles.forEach((t, i) => {
    const lv = LEVEL.get(t.layer);
    if (lv === undefined || !t.file) return;
    const k = key(t.cell[0], t.cell[1]);
    const cur = top.get(k);
    if (cur === undefined || lv >= (LEVEL.get(doc.layout.tiles[cur].layer) ?? -1)) {
      top.set(k, i);
    }
  });
  const land = new Set<string>(),
    rim = new Map<string, number>();
  for (const [k, i] of top) {
    const f = doc.layout.tiles[i].file!;
    if (f.startsWith('terrain-tiles/')) rim.set(k, num(f));
    else land.add(k);
  }
  const kindOf = (n: number | undefined) => (n === undefined ? undefined : tiles[TILE(n)]?.kind);
  const sig = (x: number, y: number) => {
    let s = 0;
    for (const [dx, dy, bit] of SIG8) if (land.has(key(x + dx, y + dy))) s |= bit;
    return s;
  };
  const token = (k: string): string | number => (land.has(k) ? LAND : (rim.get(k) ?? SEA));

  // Which pieces he drew at each signature, and HOW OFTEN, straight from the
  // atlas -- his hand, not a flat list.
  const facing = new Map<number, Map<number, number>>();
  for (const [s, m] of Object.entries(coast.at ?? {})) {
    const w = new Map<number, number>();
    for (const [n, k] of Object.entries(m)) w.set(Number(n), k);
    facing.set(Number(s), w);
  }
  const allows = (n: number, d: string, other: string | number) =>
    coast.joins[String(n)]?.[d]?.[String(other)] !== undefined;
  /* THE SEAM DOES NOT GET A VOTE IN THE PROPAGATION, AND THAT IS MEASURED.

     Some of his pairs are licensed only by the STACK: he puts 134 under 33
     twice and both times an `81` on the layer beneath closes the gap, while
     the two sprites alone leave 31 of 32 pixels meeting nothing. Two ways of
     acting on that were tried and BOTH make his own map worse -- dropping such
     pairs from the learnt table takes 50 of them out and gives him E2 2 and
     C3 3; striking a candidate whose neighbour could never meet it reaches
     through the bonded pairs and gives him C3 3 again. The seam gets a filter
     among the candidates that already satisfy every join, and a repair pass
     once every neighbour is decided, and no say before that. */
  // ---- the cells this pass owns ------------------------------------------
  const cells: [number, number][] = [];
  const cellset = new Set<string>();
  const toGrass: string[] = [];
  for (const [k, n] of rim) {
    const c = k.indexOf(',');
    const x = Number(k.slice(0, c)),
      y = Number(k.slice(c + 1));
    const kind = kindOf(n);
    const s = sig(x, y);
    if (!kind) continue;
    if (!KINDS.has(kind)) {
      /* A LONE STAIR IS NOT A STAIR. Of the artist's 62 stair, bridge and
         stepping-stone tiles, ZERO stand alone -- every one has another beside
         it in the eight, because a flight is a structure and a structure is
         more than one tile. A single one on a bare shore is a slab of dressed
         brick in the surf. One in a flight is left alone even where a coast
         piece would fit. */
      if (!CLIMB.has(kind) || !facing.get(s)) continue;
      const alone = !SIDES.some(([, dx, dy]) =>
        CLIMB.has(kindOf(rim.get(key(x + dx, y + dy))) ?? '')
      );
      if (!alone && (tiles[TILE(n)]?.facing ?? []).includes(s)) continue;
    }
    /* A COAST TILE RINGED BY LAND IS NOT A COAST. This is what hiding a
       settlement leaves behind: the boundary cliff survives, the water it
       faced becomes meadow, and a wall is left standing in a field. */
    let bits = 0;
    for (let b = s; b; b >>= 1) bits += b & 1;
    if (bits > LAND_MAX) {
      if (!scope || scope.has(k)) toGrass.push(k);
      continue;
    }
    if (scope && !scope.has(k)) continue;
    /* A SHAPE HE NEVER DREW, AND NOWHERE NEAR THE SEA. There is no piece to
       reach for -- `facing` is his own placements and this neighbourhood is
       not among them -- so leaving the tile is leaving a cliff drawn for
       ground that is somewhere else. Inland the honest reading is that there
       is no cliff here any more; at the shore it is left alone, because out
       there the shape is the composer's own outline and a missing signature is
       a fault to fix in the LAND, not a tile to paper over. `redress` has had
       this rule all along and seven of its cells came back the moment this
       pass took over from it. */
    if (!facing.get(s)) {
      const inland = SIDES.every(([, dx, dy]) => top.has(key(x + dx, y + dy)));
      if (inland && bits >= 1) {
        toGrass.push(k);
        continue;
      }
    }
    cells.push([x, y]);
    cellset.add(k);
  }

  /* THE CONVERSIONS HAPPEN FIRST, NOT LAST. A cell that stops being coast and
     becomes meadow changes the LAND set, and therefore the signature of every
     neighbour -- so choosing first and converting afterwards leaves those
     neighbours holding a piece picked for a neighbourhood that no longer
     exists. That is E7, and it is what took 36 of the 37 states over the
     artist's budget the first time this pass was wired in. */
  for (const k of toGrass) {
    rim.delete(k);
    land.add(k);
  }
  for (let i = cells.length - 1; i >= 0; i--) {
    const k = key(cells[i][0], cells[i][1]);
    if (!facing.get(sig(cells[i][0], cells[i][1]))) {
      let bits = 0;
      for (let b = sig(cells[i][0], cells[i][1]); b; b >>= 1) bits += b & 1;
      const inland = SIDES.every(([, dx, dy]) => top.has(key(cells[i][0] + dx, cells[i][1] + dy)));
      if (inland && bits >= 1) {
        toGrass.push(k);
        rim.delete(k);
        land.add(k);
        cells.splice(i, 1);
        cellset.delete(k);
      }
    }
  }

  // ---- domains, then arc consistency -------------------------------------
  const dom = new Map<string, Set<number>>();
  for (const [x, y] of cells) {
    const m = facing.get(sig(x, y));
    dom.set(key(x, y), m ? new Set(m.keys()) : new Set([rim.get(key(x, y))!]));
  }
  const fixedToken = (k: string) => (cellset.has(k) ? null : token(k));
  for (let pass = 0; pass < 12; pass++) {
    let changed = false;
    for (const [x, y] of cells) {
      const k = key(x, y),
        d0 = dom.get(k)!;
      const keep = new Set<number>();
      for (const n of d0) {
        let ok = true;
        for (const [d, dx, dy] of SIDES) {
          const nk = key(x + dx, y + dy);
          const t = fixedToken(nk);
          /* AND NOT THE SEAM, WHICH WAS TRIED HERE AND IS WORSE. Striking a
             candidate because every piece the neighbour could still take cuts
             through it sounds like the right generalisation of the notch
             filter, and it takes HIS OWN map to C3 3: the pruning reaches
             through the bonded pairs and leaves partners with nothing to be.
             The seam gets a say among the candidates that survive, and a
             repair pass after the solve, and no vote here. */
          if (t !== null) {
            if (!allows(n, d, t)) {
              ok = false;
              break;
            }
          } else if (![...dom.get(nk)!].some((m) => allows(n, d, m))) {
            ok = false;
            break;
          }
        }
        if (ok) keep.add(n);
      }
      const use = keep.size
        ? keep
        : facing.get(sig(x, y))
          ? new Set(facing.get(sig(x, y))!.keys())
          : d0;
      if (use.size !== d0.size) {
        dom.set(k, use);
        changed = true;
      }
    }
    if (!changed) break;
  }

  // ---- assign, most-constrained first ------------------------------------
  const order = [...cells].sort(
    (a, b) =>
      dom.get(key(a[0], a[1]))!.size - dom.get(key(b[0], b[1]))!.size || b[1] - a[1] || a[0] - b[0]
  );
  const chosen = new Map<string, number>();
  for (const [x, y] of order) {
    const k = key(x, y);
    if (chosen.has(k)) continue; // already set as half of a pair
    /* THE OTHER HALF, IF THE CELL ABOVE ALREADY CLAIMED THIS ONE. */
    const up = chosen.get(key(x, y + 1));
    const half = up === undefined ? undefined : bond[String(up)];
    /* AND ONLY IF THE HALF BELONGS HERE. The bond and the signature are both
       absolute on his map and never disagree; where our outline makes them
       disagree, taking the bond anyway drops a piece on a neighbourhood he
       never drew it at. Four of the six E7 findings this pass introduced came
       through this one line, and they took 36 of the 37 states over budget. */
    if (half !== undefined && (facing.get(sig(x, y))?.has(half) ?? false)) {
      chosen.set(k, half);
      continue;
    }
    let cand: number[] = [];
    for (const n of [...dom.get(k)!].sort((a, b) => a - b)) {
      let ok = true;
      for (const [d, dx, dy] of SIDES) {
        const nk = key(x + dx, y + dy);
        const t = chosen.get(nk) ?? fixedToken(nk);
        if (t !== null && t !== undefined && !allows(n, d, t)) {
          ok = false;
          break;
        }
      }
      if (ok) cand.push(n);
    }
    if (!cand.length) {
      /* EVERY JOIN CANNOT BE SATISFIED AT ONCE -- the outline has made a
         neighbourhood whose vocabulary runs out. Take the piece that breaks
         the fewest, and among those the one whose PIXELS line up best, since
         a join that is going to be wrong may as well not also be a hole. The
         first version broke the tie arbitrarily and two of the remaining `E1`
         findings were relaxations that had a better option sitting next to
         them. Counted by the critic afterwards, never hidden here. */
      const score = [...dom.get(k)!].map((n) => {
        let bad = 0,
          cut = 0,
          worst = 0;
        for (const [d, dx, dy] of SIDES) {
          const nk = key(x + dx, y + dy);
          const t = chosen.get(nk) ?? fixedToken(nk);
          if (t === null || t === undefined) continue;
          if (!allows(n, d, t)) bad++;
          if (d.length > 1 || typeof t !== 'number') continue;
          const a = tiles[TILE(n)]?.seam?.[d],
            b2 = tiles[TILE(t)]?.seam?.[OPPOSITE[d]];
          if (!a || !b2) continue;
          let side = 0;
          for (let i = 0; i < 32; i++) if ((a[i] === '.') !== (b2[i] === '.')) side++;
          cut += side;
          if (side > worst) worst = side;
        }
        return { n, bad, cut, worst };
      });
      /* AND THE FEWEST BROKEN JOINS COMES FIRST, WHICH WAS TESTED THE OTHER
         WAY ROUND AND IS MUCH WORSE.

         Every one of the 22 remaining `E1` on a six-state sample was a
         relaxation whose seam cut clean through, so dropping the cutting
         candidates FIRST and minimising broken joins among the rest looks
         exactly right, and it passes both gates that can see it: the artist's
         own map is untouched (he has no relaxations at all) and the composed
         village came back `E1 1`. Across 37 states it is a rout --
         `C1 0 -> 68`, `E1 80 -> 139`, `E2 28 -> 72`. A relaxation is a cell
         whose vocabulary has run out, and the piece that keeps its NEIGHBOURS
         answerable is worth more than the piece that closes its own seam:
         take the seam first and the damage moves one cell along and compounds,
         which is what 68 cliff faces with nothing above them are.

         `worst` is kept because it is the number that made the case look good,
         and the next person will otherwise make it again. */
      const pool2 = score;
      let best = pool2[0].n,
        bestBad = Infinity,
        bestCut = Infinity;
      for (const v of pool2) {
        if (v.bad < bestBad || (v.bad === bestBad && v.cut < bestCut)) {
          bestBad = v.bad;
          bestCut = v.cut;
          best = v.n;
        }
      }
      chosen.set(k, best);
      continue;
    }
    /* AND THE PIXELS, AS A FILTER. The join table says which pieces he stood
       beside each other; it cannot say whether the two outermost pixel columns
       line up. `seam` answers that exactly. Ten is E2's own threshold. */
    const notch = (n: number) => {
      let bad = 0;
      for (const [d, dx, dy] of SIDES) {
        if (d.length > 1) continue;
        const nk = key(x + dx, y + dy);
        const t = chosen.get(nk) ?? fixedToken(nk);
        if (typeof t !== 'number') continue;
        const a = tiles[TILE(n)]?.seam?.[d],
          b = tiles[TILE(t)]?.seam?.[OPPOSITE[d]];
        if (!a || !b) continue;
        for (let i = 0; i < 32; i++) if ((a[i] === '.') !== (b[i] === '.')) bad++;
      }
      return bad;
    };
    const clean = cand.filter((n) => notch(n) < NOTCH);
    if (clean.length) cand = clean;
    /* AND NEVER LEAVE GRASS HANGING OVER OPEN WATER when a piece that does not
       is available. */
    const offends = (n: number) => {
      const e = tiles[TILE(n)]?.edges;
      if (!e) return false;
      for (const [d, dx, dy] of SIDES) {
        if (d.length > 1) continue;
        const nk = key(x + dx, y + dy);
        if (land.has(nk) || rim.has(nk)) continue;
        const q = e[d];
        if (q && q.grass >= GRASSY && q.stone <= BARE) return true;
      }
      return false;
    };
    const dry = cand.filter((n) => !offends(n));
    if (dry.length) cand = dry;
    /* AND DO NOT SAY THE SAME THING TWICE. Along a straight stretch he uses a
       different piece almost every cell -- 0.93 distinct per cell down a
       vertical run, 0.89 along a horizontal one. A weighted draw with no
       memory lands at 0.80, because a long edge is the same question asked
       eight times. The three cells already laid behind this one, each way, are
       struck off. */
    const prev: number[] = [];
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ]) {
      for (let k2 = 1; k2 <= 3; k2++) {
        const q = chosen.get(key(x + dx * k2, y + dy * k2));
        if (q !== undefined) prev.push(q);
      }
    }
    const fresh = cand.filter((n) => !prev.includes(n));
    if (fresh.length) cand = fresh;
    /* A PIECE THAT COMES IN A PAIR MAY ONLY BE PICKED IF ITS OTHER HALF CAN GO
       UNDER IT: either this pass fills the cell below, or it is already the
       right piece. */
    /* AND IT MAY NOT CHANGE WHERE YOU CAN WALK. Dressing is a claim about how
       the shore LOOKS, and the routes were planned before it ran: swap a
       standable lip for a rock face and a road that was already published
       steps into a wall. Wired in without this guard, the composed village
       came back with P1 2 and N2 1 -- two routes crossing ground that had
       stopped being ground. Cells that were never standable are free. */
    if (WALK_GUARD && standable(TILE(rim.get(k)!))) {
      const walk = cand.filter((n) => standable(TILE(n)));
      if (walk.length) cand = walk;
    }
    /* A PAIRED PIECE MAY ONLY BE PICKED WHERE ITS OTHER HALF IS ALSO LEGAL.
       The bond and the signature are both absolute on his map and they never
       disagree there. Where our outline makes them disagree the outline is the
       thing that is wrong, and forcing the pair anyway put ten pieces on
       neighbourhoods he never drew them at (E7 0 -> 10). So a bonded lip is
       simply not chosen unless the face under it is legal for the cell it
       would go in -- there is always another piece for the lip, and there is
       no other piece for the face. */
    const pairable = cand.filter((n) => {
      const other = bond[String(n)];
      if (other === undefined) return true;
      const bk = key(x, y - 1);
      if (rim.get(bk) === other) return true;
      if (!cellset.has(bk)) return false;
      return facing.get(sig(x, y - 1))?.has(other) ?? false;
    });
    if (pairable.length) cand = pairable;
    else {
      /* EVERY CANDIDATE HERE IS HALF OF A PAIR AND NONE OF THEM CAN BE PAIRED.
         Forcing one gives E7 -- a piece on a neighbourhood he never drew it at
         -- and not forcing it gives C3, a cliff sawn off in mid-air. Both are
         the same six cells and both are wrong. So the filters above give way
         instead: any piece legal for this cell that is NOT half of a pair,
         even one the notch and grass filters had struck off. A slightly worse
         seam is a smaller lie than a cliff that stops in the air. */
      const solo = [...dom.get(k)!].filter((n) => bond[String(n)] === undefined);
      if (solo.length) cand = solo;
    }

    // His frequency at this signature, drawn against the cell's own hash.
    const w = facing.get(sig(x, y));
    const weights = cand.map((n) => Math.max(w?.get(n) ?? 0, 1));
    let t = (cellHash(x, y) / 0x7fffffff) * weights.reduce((a, b) => a + b, 0);
    let pick = cand[cand.length - 1];
    for (let j = 0; j < cand.length; j++) {
      t -= weights[j];
      if (t < 0) {
        pick = cand[j];
        break;
      }
    }
    chosen.set(k, pick);
    const other = bond[String(pick)];
    if (
      other !== undefined &&
      cellset.has(key(x, y - 1)) &&
      (facing.get(sig(x, y - 1))?.has(other) ?? false)
    ) {
      chosen.set(key(x, y - 1), other);
    }
  }

  /* A BROKEN JOIN IS USUALLY TWO CELLS, AND ONE OF THEM CAN STILL MOVE.

     The assignment is greedy: a cell picked early can leave a later one with
     nothing that fits, and it then takes the piece that breaks the fewest
     joins. Three of the five seam faults on a composed state were exactly that
     -- pairs the artist NEVER draws (67 east of 33, 481 over 130, 130 over
     138), chosen because by the time that cell came up there was no other
     answer. Re-picking the cell alone cannot help, because the piece that
     would fit it no longer fits its neighbour; re-picking THE PAIR can. So
     every broken join gets one pass where both ends are searched together,
     against everything else already decided. */
  for (let pass = 0; pass < 3; pass++) {
    let mended = 0;
    for (const [k, v] of [...chosen]) {
      const c = k.indexOf(',');
      const x = Number(k.slice(0, c)),
        y = Number(k.slice(c + 1));
      for (const [d, dx, dy] of SIDES) {
        const nk = key(x + dx, y + dy);
        const t = chosen.get(nk) ?? fixedToken(nk);
        if (t === null || t === undefined || allows(v, d, t)) continue;
        if (!cellset.has(nk)) continue; // the neighbour is not ours
        const fitsElse = (cx: number, cy: number, n: number, skip: string) =>
          SIDES.every(([d2, ex, ey]) => {
            if (d2 === skip) return true;
            const q = key(cx + ex, cy + ey);
            const u = chosen.get(q) ?? fixedToken(q);
            return u === null || u === undefined || allows(n, d2, u);
          });
        let done = false;
        for (const n of dom.get(k) ?? []) {
          if (!fitsElse(x, y, n, d)) continue;
          for (const m of dom.get(nk) ?? []) {
            if (!allows(n, d, m)) continue;
            if (!fitsElse(x + dx, y + dy, m, OPPOSITE[d])) continue;
            chosen.set(k, n);
            chosen.set(nk, m);
            mended++;
            done = true;
            break;
          }
          if (done) break;
        }
        if (done) break;
      }
    }
    if (!mended) break;
  }

  /* AND ONE LOOK BACK OVER THE PIXELS, NOW THAT EVERY NEIGHBOUR IS DECIDED.

     The seam filter during the solve can only see the cells already chosen --
     a cell decided early is picked blind, and its neighbour arrives later. So
     the joins that come out cut clean through are usually not relaxations at
     all, they are cells that had no information when their turn came. This
     re-picks any cell holding a join of 24 pixels or worse, from its own
     domain, keeping every constraint that held before. Anything it cannot
     improve it leaves, and the critic reports it. */
  const cutAt = (x: number, y: number, n: number) => {
    let worst = 0;
    for (const [d, dx, dy] of SIDES) {
      if (d.length > 1) continue;
      const t = chosen.get(key(x + dx, y + dy)) ?? fixedToken(key(x + dx, y + dy));
      if (typeof t !== 'number') continue;
      const a = tiles[TILE(n)]?.seam?.[d],
        b2 = tiles[TILE(t)]?.seam?.[OPPOSITE[d]];
      if (!a || !b2) continue;
      let c2 = 0;
      for (let i = 0; i < 32; i++) if ((a[i] === '.') !== (b2[i] === '.')) c2++;
      worst = Math.max(worst, c2);
    }
    return worst;
  };
  for (let pass = 0; pass < 3; pass++) {
    let mended = 0;
    for (const [k, v] of [...chosen]) {
      const c = k.indexOf(',');
      const x = Number(k.slice(0, c)),
        y = Number(k.slice(c + 1));
      if (cutAt(x, y, v) < CUT) continue;
      let best = v,
        bestCut = cutAt(x, y, v);
      for (const n of dom.get(k) ?? []) {
        if (n === v) continue;
        const ok = SIDES.every(([d, dx, dy]) => {
          const t = chosen.get(key(x + dx, y + dy)) ?? fixedToken(key(x + dx, y + dy));
          return t === null || t === undefined || allows(n, d, t);
        });
        if (!ok) continue;
        const cu = cutAt(x, y, n);
        if (cu < bestCut) {
          bestCut = cu;
          best = n;
        }
      }
      if (best !== v) {
        chosen.set(k, best);
        mended++;
      }
    }
    if (!mended) break;
  }

  /* THE PAIR IS SETTLED LAST, AND IF IT CANNOT BE MADE THE LIP GIVES WAY.

     A bonded lip has three possible ends and only one of them is acceptable.
     Force the face where it does not belong and you get `E7`, a piece on a
     neighbourhood he never drew it at. Leave the lip bonded with nothing under
     it and you get `C3`, a cliff sawn off in mid-air -- eight of them on one
     state. Both are inventions. The third is to stop using that lip: there is
     always another piece for the top of a cliff and there is never another
     piece for its face, so the lip is the half that yields.

     Done here rather than during the assignment because a lip and its face are
     reached in whichever order most-constrained-first happens to take them,
     and the filters upstream can only see the half in front of them. */
  for (let pass = 0; pass < 3; pass++) {
    let fixed = 0;
    for (const [k, v] of [...chosen]) {
      const other = bond[String(v)];
      if (other === undefined) continue;
      const c = k.indexOf(',');
      const x = Number(k.slice(0, c)),
        y = Number(k.slice(c + 1));
      const bk = key(x, y - 1);
      if (chosen.get(bk) === other || rim.get(bk) === other) continue;
      if (cellset.has(bk) && (facing.get(sig(x, y - 1))?.has(other) ?? false)) {
        chosen.set(bk, other);
        fixed++;
        continue;
      }
      // The pair cannot be made here. Take a piece that does not need one,
      // preferring the ones that still satisfy every join.
      const solo = [...(dom.get(k) ?? [])].filter((n) => bond[String(n)] === undefined);
      if (!solo.length) continue;
      const fits = solo.filter((n) =>
        SIDES.every(([d, dx, dy]) => {
          const t = chosen.get(key(x + dx, y + dy)) ?? fixedToken(key(x + dx, y + dy));
          return t === null || t === undefined || allows(n, d, t);
        })
      );
      const pool = fits.length ? fits : solo;
      chosen.set(k, pool[cellHash(x, y) % pool.length]);
      fixed++;
    }
    if (!fixed) break;
  }

  let n = 0;
  for (const [k, v] of chosen) {
    const i = top.get(k)!;
    if (doc.layout.tiles[i].file === TILE(v)) continue;
    doc.layout.tiles[i].file = TILE(v);
    n++;
  }
  for (const k of toGrass) {
    const i = top.get(k)!;
    const c = k.indexOf(',');
    /* Not one constant tile: the solid meadow he would have laid here. Every
       candidate covers the cell, so this cannot open a hole where a coast
       piece used to be. See `interiorFill`. */
    const g = interiorFill(Number(k.slice(0, c)), Number(k.slice(c + 1)));
    if (doc.layout.tiles[i].file === g) continue;
    doc.layout.tiles[i].file = g;
    n++;
  }
  return n;
}

/** Give a lip the rock that hangs under it, where the ring never made room.

    `97` is the top half of a corner and `129` is the rock beneath; they are
    the same column of the same 3x4 block on his sheet. Twenty-three sprites
    are like this, and on his map every one of the 290 placements is paired.
    `buildLip` adds a face only where the lip has GROUND directly above it, and
    at a corner the cell above is another lip -- so at every step the face was
    skipped and the cliff stopped in mid-air against the sea, on both sides of
    the map. Run before `weave`, and again after it, until neither moves.

    @returns how many halves were placed. */
export function pairUp(doc: Document, atlas: Atlas, scope?: Set<string>): number {
  const coast = (atlas as unknown as { coast?: CoastTables }).coast;
  if (!coast?.bonds) return 0;
  const top = new Map<string, number>();
  doc.layout.tiles.forEach((t, i) => {
    const lv = LEVEL.get(t.layer);
    if (lv === undefined || !t.file) return;
    const k = key(t.cell[0], t.cell[1]);
    const cur = top.get(k);
    if (cur === undefined || lv >= (LEVEL.get(doc.layout.tiles[cur].layer) ?? -1)) {
      top.set(k, i);
    }
  });
  // The land, so a face is only placed where its own neighbourhood allows it.
  const land = new Set<string>();
  for (const [k, i] of top) {
    if (!doc.layout.tiles[i].file!.startsWith('terrain-tiles/')) land.add(k);
  }
  const legalAt = (n: number, x: number, y: number) => {
    let s = 0;
    for (const [dx, dy, bit] of SIG8) if (land.has(key(x + dx, y + dy))) s |= bit;
    return (atlas.tiles[TILE(n)]?.facing ?? []).includes(s);
  };
  let added = 0;
  for (const [k, i] of [...top]) {
    const f = doc.layout.tiles[i].file!;
    if (!f.startsWith('terrain-tiles/')) continue;
    const want = coast.bonds[String(num(f))];
    if (want === undefined) continue;
    if (scope && !scope.has(k)) continue;
    const c = k.indexOf(',');
    const x = Number(k.slice(0, c)),
      y = Number(k.slice(c + 1));
    const bk = key(x, y - 1);
    if (top.has(bk)) continue;
    /* AND ONLY WHERE THE FACE BELONGS. The bond and the signature are both
       absolute on his map and never disagree; where our outline makes them
       disagree, dropping the face in anyway puts a piece on a neighbourhood he
       never drew it at, which the critic scores as E7. */
    if (!legalAt(want, x, y - 1)) continue;
    /* AND NOT A NOTCH GUARD HERE, WHICH WAS TRIED AND IS WORSE.

       `drive` has a check that an erase must not punch a square hole in its
       own shore -- a bare cell with no ground in its four and three or more
       dressed neighbours. Laying a face can push a neighbour from two dressed
       sides to three, and a forty-cell erase came back with one more of them
       than the untouched map has: 77 -> 78. Refusing such a face fixes that
       one cell and starves lips of the rock they need everywhere else: E6 went
       19 -> 20 on the composed village and 11 states picked it up, with E2 on
       17 of them. It was derived from ONE cell on ONE erase and applied to
       every caller including the composer, which is the whole mistake. The
       drive check stays red at 90/91 and the cause is written down. */
    const src = doc.layout.tiles[i];
    /* AND NO FLOOR UNDER IT. A cliff face is drawn to stand IN the water --
       145 of the artist's 159 face cells have nothing beneath them at all.
       Laying dirt under a new one puts a band of bare ground along the
       waterline, which is the thing the face is supposed to be standing in. */
    doc.layout.tiles.push({
      ...JSON.parse(JSON.stringify(src)),
      cell: [x, y - 1],
      pos: [x + 0.5, y - 0.5, src.pos?.[2] ?? 10],
      pos_px: [Math.round((x + 0.5) * 32), Math.round((y - 0.5) * 32)],
      file: TILE(want),
      sprite: `TX Tileset Terrain_${want}`,
      tile_asset: `TX Tileset Terrain_${want}`,
    } as typeof src);
    top.set(bk, doc.layout.tiles.length - 1);
    added++;
  }
  return added;
}

/** Close a cut seam the way he closes it: with a tile UNDERNEATH.

    THE FAULT THIS FIXES WAS MISREAD FOR A LONG TIME, AND THE MISREADING IS
    THE POINT. `33` over `134` leaves 31 of its 32 pixels meeting nothing, so
    the pair looked like one the artist must be avoiding, and five separate
    attempts were made to strike it and its 43 siblings out of the join table.
    All five made HIS OWN map worse, because a table can only forbid: take the
    candidate away and the solver relaxes onto the same tile with a broken join
    as well as a broken seam.

    He is not avoiding them. He draws all 44, and in 42 there is a second tile
    on the layer beneath -- unanimously the same sprite each time he draws that
    pair -- closing exactly the gap the two shapes leave. What he licensed was
    never the pair, it was the STACK, and reproducing it needs a dresser that
    can lay a second tile in a cell rather than a threshold that refuses the
    first.

    Not the top of the stack, so this cannot change what anything stands on or
    what any other rule reads; and never into a slot that is taken, because two
    tiles on one cell and one layer is `T4` and a layout that has them cannot
    say what it draws.

    RUN IT AFTER `Ground.seal()`, WHICH IS NOT A DETAIL. `seal` lays an opaque
    floor under any cell that shows water the sea cannot reach, and on this map
    the coast sits on `Layer 01`, so the only slot beneath it is `Dirt` and the
    two passes want the same one. Called first, this squats there: a cell that
    would have got `Dirt_15` -- fully opaque, covers 1.0 -- gets `Terrain_81`
    at 0.97 instead, and `T2` opens on eleven states where there was none. The
    right order is not a preference, it is that `seal` answers a hole and this
    answers a seam: where `seal` has already floored a cell there IS no seam
    left to close, and where it has declined -- a shoreline cell with open sea
    beside it, which is where every `E1` actually is -- the slot is free and
    this is the only pass that wants it. So the callers run it last, and
    nothing here re-derives which cells `seal` would have taken; that would be
    a second implementation of the one question `seal` exists to answer.

    @returns how many fillers were laid. */
export function fillIn(doc: Document, atlas: Atlas, scope?: Set<string>): number {
  const coast = (atlas as unknown as { coast?: CoastTables }).coast;
  if (!coast?.fillers) return 0;
  const at = new Map<string, Map<number, number>>();
  doc.layout.tiles.forEach((t, i) => {
    const lv = LEVEL.get(t.layer);
    if (lv === undefined || !t.file) return;
    const k = key(t.cell[0], t.cell[1]);
    let m = at.get(k);
    if (!m) at.set(k, (m = new Map()));
    m.set(lv, i);
  });
  const topOf = (k: string) => {
    const m = at.get(k);
    if (!m) return undefined;
    let best = -1;
    for (const lv of m.keys()) if (lv > best) best = lv;
    return best < 0 ? undefined : { lv: best, i: m.get(best)! };
  };
  let laid = 0;
  for (const k of [...at.keys()]) {
    const t0 = topOf(k)!;
    const f = doc.layout.tiles[t0.i].file!;
    if (!f.startsWith('terrain-tiles/')) continue;
    const c = k.indexOf(',');
    const x = Number(k.slice(0, c)),
      y = Number(k.slice(c + 1));
    for (const [d, dx, dy] of SIDES.slice(0, 4)) {
      const ok = key(x + dx, y + dy);
      const t1 = topOf(ok);
      if (!t1) continue;
      const g = doc.layout.tiles[t1.i].file!;
      if (!g.startsWith('terrain-tiles/')) continue;
      const rec = coast.fillers[`${num(f)}|${d}|${num(g)}`];
      if (!rec) continue;
      // Whichever cell he put it in, and only if we may touch that one.
      const tk = rec.cell === 'c' ? k : ok;
      const tt = rec.cell === 'c' ? t0 : t1;
      if (scope && !scope.has(tk)) continue;
      /* NEVER `Dirt`, AND THAT IS THE WHOLE ORDERING PROBLEM SETTLED.

         Slot 0 is the floor, and the floor belongs to `Ground.seal()`. Our
         coast sits on `Layer 01`, so the only slot beneath it is that floor,
         and a filler written there is a 0.97-covering rock standing in for a
         fully opaque one: `T2` opened on eleven states the first time this
         took it. Sequencing the two passes does not fix it either, because the
         land brush runs one of them mid-compose.

         The artist does not stack downward here, he stacks UPWARD: at (36,19)
         his `81` is on `Layer 01` and the `134` it closes is on `Layer 02`,
         and across his map these filler sprites are drawn on Layer 01 or above
         1,326 times against 8 on Dirt. So the coast tile moves up and the
         filler takes the layer it vacated -- the floor is never touched, and
         the two passes stop wanting the same slot at all. */
      const up = tt.lv + 1;
      if (up >= LAYERS.length || at.get(tk)!.has(up)) continue;
      const slot = tt.lv;
      const moved = doc.layout.tiles[tt.i];
      moved.layer = LAYERS[up];
      (moved as { sorting_order?: number }).sorting_order = ORDER[up];
      at.get(tk)!.delete(slot);
      at.get(tk)!.set(up, tt.i);
      tt.lv = up;
      const tx = rec.cell === 'c' ? x : x + dx;
      const ty = rec.cell === 'c' ? y : y + dy;
      const src = doc.layout.tiles[tt.i];
      const name = rec.file.replace(/^.*\//, '').replace(/\.png$/, '');
      doc.layout.tiles.push({
        ...JSON.parse(JSON.stringify(src)),
        layer: LAYERS[slot],
        sorting_order: ORDER[slot],
        cell: [tx, ty],
        pos: [tx + 0.5, ty + 0.5, src.pos?.[2] ?? 10],
        pos_px: [Math.round((tx + 0.5) * 32), Math.round((ty + 0.5) * 32)],
        file: rec.file,
        sprite: name,
        tile_asset: name,
      } as typeof src);
      at.get(tk)!.set(slot, doc.layout.tiles.length - 1);
      laid++;
    }
  }
  return laid;
}

/** The whole shoreline pass: pair up, weave, pair up again, weave again.

    A lip chosen by the weave can need a half the pair-up has not placed yet,
    and a half placed by the pair-up changes the neighbourhood the weave is
    solving. Two rounds settles it; the second is cheap because almost nothing
    moves. */
export function dressCoast(doc: Document, atlas: Atlas, scope?: Set<string>): number {
  let n = 0;
  for (let round = 0; round < 3; round++) {
    n += pairUp(doc, atlas, scope);
    n += weave(doc, atlas, scope);
  }
  // `fillIn` is NOT called here -- see its own note. It has to follow
  // `Ground.seal()`, which lives on the caller, not on this pass.
  return n;
}

/** The cells a stroke touched, widened enough that the chain sees its own
    context: one for the signature, one for the join, one for the pair below,
    and one spare. Narrower than this and a piece is chosen against a neighbour
    the pass is about to change. */
export const REACH = 4;
export function around(cells: Iterable<string>): Set<string> {
  const out = new Set<string>();
  for (const k of cells) {
    const c = k.indexOf(',');
    const x = Number(k.slice(0, c)),
      y = Number(k.slice(c + 1));
    for (let dx = -REACH; dx <= REACH; dx++) {
      for (let dy = -REACH; dy <= REACH; dy++) out.add(x + dx + ',' + (y + dy));
    }
  }
  return out;
}
