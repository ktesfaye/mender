/* Re-dress the coastline from the atlas, once the map is finished.

   THE COMPOSER ASKS ONE QUESTION AND A SHORELINE HAS TWO. `terrain.ts` picks a
   coast tile from a pool keyed on the neighbourhood, which decides the piece's
   SHAPE and says nothing about what it is made of at the seam. A tile can be the
   correct answer for its signature and still be transparent along the side it
   shares with a meadow -- and then grass meets open water and the boundary reads
   as scissors. Measured on the render with vegetation stripped out, the artist
   lets grass touch water on 43 cells of his whole village; a composed map did it
   on 177.

   `atlas.json` is the first thing in this project that knows both facts: which
   signatures the artist used a piece for, and what each of its four edges is
   made of. So a choice can satisfy the shape AND the seam. It is the same file
   `atlas.py` writes and `review.py` reads -- not a second classification that
   can drift.

   IT ONLY EVER REPLACES. The shape of the land is the composer's business and is
   not touched: this rewrites which sprite is drawn on a cell that already holds
   a coast tile. It cannot open a hole, strand a cliff or move the shore, which
   is what makes it safe to run last -- and last is the only place it works, since
   the neighbourhood it reads has to be the final one. */

import type { Document } from '../doc/document';
import { cellHash, interiorFill, standable } from '../scene/terrain';

const VOID = '.',
  GRASS = 'g',
  DIRT = 'd',
  STONE = 's';
const LAYERS = ['Dirt', 'Layer 01', 'Layer 02', 'Layer 03', 'Layer 04'];
const LEVEL = new Map(LAYERS.map((n, i) => [n, i]));
const SIDES: [string, number, number][] = [
  ['N', 0, 1],
  ['E', 1, 0],
  ['S', 0, -1],
  ['W', -1, 0],
];
const SIG: [number, number, number][] = [
  [0, 1, 1],
  [1, 0, 2],
  [0, -1, 4],
  [-1, 0, 8],
  [1, 1, 16],
  [1, -1, 32],
  [-1, -1, 64],
  [-1, 1, 128],
];
const COAST = new Set(['cliff-outer', 'cliff-inner', 'cliff-side', 'ledge', 'boulders']);
/** A STAIR IS NOT A SHORELINE, and it is not interchangeable with one either.
    It is a structure that joins two heights, so no piece in the coast pool is a
    substitute for it -- but it can be left behind exactly as a cliff can, and
    then it is a flight of steps in the middle of a meadow with nothing above or
    below it. These are never swapped; they are only ever removed, and only when
    the neighbourhood is one the artist never put a stair in. */
const CLIMB = new Set(['stair', 'stair-water', 'bridge-arch', 'bridge-vertical']);

/** Of all the signatures in the artist's village none has eight land
    neighbours and only two have seven. Past that a cell is not a shoreline. */
const LAND_MAX = 6;
/** The rule's own thresholds, from `review.py`. Scoring a repair on anything
    else optimises for a quantity nobody is measuring. */
const GRASSY = 0.15,
  BARE = 0.5,
  OPEN = 0.3;
const OPPOSITE: Record<string, string> = { N: 'S', E: 'W', S: 'N', W: 'E' };

export interface AtlasTile {
  kind: string;
  /** The front of a cliff. May only be drawn with a lip standing on top of it:
      a face alone is a wall with nothing behind it. */
  face?: boolean;
  facing: number[];
  facing_from: string | null;
  covers: number;
  used: number;
  edges: Record<string, { stone: number; grass: number; open: number }>;
  /** What the outermost two rows of pixels are made of, 32 characters a side,
      indexed so position `i` on one tile's east seam is the pixel touching
      position `i` on its neighbour's west seam. `s` stone, `g` grass, `d` bare
      ground, `.` nothing drawn at all. */
  seam?: Record<string, string>;
}
export interface Atlas {
  tiles: Record<string, AtlasTile>;
  /** Which grass piece he used at each 8-neighbour signature, WITH HIS COUNTS.
      `facing` is the same fact deduped, so reading a weight off it gives every
      candidate a 1 and throws his hand away -- the mistake `coast.joins`
      already records. `resurface` breaks its ties on this. */
  grass?: { pools?: Record<string, Record<string, number>> };
}

const key = (x: number, y: number) => x + ',' + y;

/** One tile's own strip laid over whatever is beneath it: the first character
    that draws anything wins, which is what the renderer does down a stack. */
function over(own: string | undefined, under: string): string {
  if (!own) return under;
  let out = '';
  for (let i = 0; i < 32; i++) out += own[i] !== VOID ? own[i] : under[i];
  return out;
}

/* ONLY WHAT COULD HAVE CHANGED. These four passes run in a loop until the map
   settles, and after the first round almost nothing has moved: 2,000 of a
   composition's 2,400 changes happen in the first two rounds, and the rest are
   a handful of cells a round. Re-reading fifteen thousand tiles to find them
   cost four seconds a composition. So a round hands the next one the cells it
   touched, widened by three -- one for the signature, one for the seam, one for
   the two-cell window `relegalise` scores over -- and the next round looks only
   there. `scope` undefined means the whole map, which is what the first round
   wants and what a single call outside the loop gets. */
export const REACH = 3;
function mark(into: Set<string> | undefined, x: number, y: number) {
  if (!into) return;
  for (let dx = -REACH; dx <= REACH; dx++) {
    for (let dy = -REACH; dy <= REACH; dy++) into.add(x + dx + ',' + (y + dy));
  }
}

/** @returns how many cells were re-dressed. */
export function redress(
  doc: Document,
  atlas: Atlas,
  passes = 3,
  scope?: Set<string>,
  touched?: Set<string>
): number {
  const tiles = atlas.tiles;

  /* Every coast sprite the artist actually used, by the signatures he used it
     for. Only his placements: a piece he never put at a signature is not
     evidence about that signature, and inventing one is how a shoreline ends up
     running through the middle of a hillside. */
  const bySig = new Map<number, string[]>();
  for (const [rel, rec] of Object.entries(tiles)) {
    if (!COAST.has(rec.kind) || rec.facing_from !== 'artist') continue;
    for (const s of rec.facing) {
      const a = bySig.get(s);
      if (a) a.push(rel);
      else bySig.set(s, [rel]);
    }
  }
  if (!bySig.size) return 0;

  let changed = 0;
  for (let pass = 0; pass < passes; pass++) {
    // The visible tile of each cell, and where its record lives.
    const topAt = new Map<string, number>();
    doc.layout.tiles.forEach((t, i) => {
      const lv = LEVEL.get(t.layer);
      if (lv === undefined || !t.file) return;
      const k = key(t.cell[0], t.cell[1]);
      const cur = topAt.get(k);
      if (cur === undefined || lv > (LEVEL.get(doc.layout.tiles[cur].layer) ?? -1)) {
        topAt.set(k, i);
      }
    });
    const fileAt = (k: string) => {
      const i = topAt.get(k);
      return i === undefined ? '' : (doc.layout.tiles[i].file ?? '');
    };
    /* THE WHOLE STACK, for the pixels where two cells meet. A cell is not one
       tile -- dirt under a cliff under a fringe -- and the strip that decides
       whether the map stops dead on a straight line is the composite. */
    const stack = new Map<string, Map<number, number>>();
    doc.layout.tiles.forEach((t, i) => {
      const l = LEVEL.get(t.layer);
      if (l === undefined || !t.file) return;
      const k = key(t.cell[0], t.cell[1]);
      let m = stack.get(k);
      if (!m) {
        m = new Map();
        stack.set(k, m);
      }
      m.set(l, i);
    });
    const seamOf = (k: string, d: string, swap?: { lv: number; file: string }) => {
      const m = stack.get(k);
      if (!m) return VOID.repeat(32);
      const levels = [...m.keys()].sort((a, b) => b - a);
      const strips: string[] = [];
      for (const l of levels) {
        const f = swap && swap.lv === l ? swap.file : doc.layout.tiles[m.get(l)!].file!;
        const st = tiles[f]?.seam?.[d];
        if (st) strips.push(st);
      }
      if (!strips.length) return VOID.repeat(32);
      let out = '';
      for (let i2 = 0; i2 < 32; i2++) {
        let ch = VOID;
        for (const st of strips)
          if (st[i2] !== VOID) {
            ch = st[i2];
            break;
          }
        out += ch;
      }
      return out;
    };
    const voidCut = (a: string, b: string) => {
      let n = 0;
      for (let i2 = 0; i2 < 32; i2++) if ((a[i2] === VOID) !== (b[i2] === VOID)) n++;
      return n;
    };
    const land = new Set<string>(),
      covers = new Set<string>();
    for (const [k, i] of topAt) {
      if (!doc.layout.tiles[i].file!.startsWith('terrain-tiles/')) land.add(k);
    }
    /* COVERED MEANS ANY TILE IN THE STACK IS OPAQUE, not just the visible one.
       A shaped coast piece over a full grass tile hides the sea behind it, and
       asking only the top of the stack calls that cell see-through -- which
       makes the seam score chase faults that are not there. */
    for (const t of doc.layout.tiles) {
      if (!t.file || !LEVEL.has(t.layer)) continue;
      if ((tiles[t.file]?.covers ?? 0) >= 1) covers.add(key(t.cell[0], t.cell[1]));
    }
    const mask = (x: number, y: number) => {
      let s = 0;
      for (const [dx, dy, bit] of SIG) if (land.has(key(x + dx, y + dy))) s |= bit;
      return s;
    };
    let did = 0;
    for (const [k, i] of topAt) {
      if (scope && !scope.has(k)) continue;
      const f = doc.layout.tiles[i].file!;
      const rec = tiles[f];
      if (!rec || (!COAST.has(rec.kind) && !CLIMB.has(rec.kind))) continue;
      const c = k.indexOf(',');
      const x = Number(k.slice(0, c)),
        y = Number(k.slice(c + 1));
      const sig = mask(x, y);

      /* A COAST TILE SURROUNDED BY LAND IS NOT A COAST. This is what a
         settlement leaves behind when the one beside it goes: the boundary
         cliff survives, the water it faced becomes meadow, and a wall is left
         standing in a field. No tile choice fixes it -- the shape is one the
         artist never drew -- so it stops being shoreline and becomes ground. */
      let bits = 0;
      for (let b = sig; b; b >>= 1) bits += b & 1;

      /* A FLIGHT OF STEPS THAT CLIMBS NOTHING. Same reading as the cliff above
         and a different repair: there is no other stair to reach for, because a
         stair's `facing` is where the artist put THAT stair, so the only honest
         answers are leave it or take it away. Taken away when the shape around
         it is one he never built one in and there is no open water in sight --
         which on screen is a stone step in the middle of a field, and is what a
         settlement leaves when the terrace it climbed to went with the one next
         door. Never swapped: a stair is the one thing on this map that is there
         because you can walk up it. */
      if (CLIMB.has(rec.kind)) {
        /* ONLY WHERE HE TELLS US WHERE IT GOES. The 28 vertical-bridge sprites
           are the one block in the kit the artist never placed, so their
           `facing` is empty and every neighbourhood would read as wrong. An
           empty list is "nobody knows", not "he never did this here". */
        if (
          rec.facing.length &&
          !rec.facing.includes(sig) &&
          SIG.every(([dx, dy]) => topAt.has(key(x + dx, y + dy)))
        ) {
          doc.layout.tiles[i].file = interiorFill(x, y);
          mark(touched, x, y);
          did++;
        }
        continue;
      }

      if (bits > LAND_MAX) {
        doc.layout.tiles[i].file = interiorFill(x, y);
        mark(touched, x, y);
        did++;
        continue;
      }

      let pool = bySig.get(sig);
      if (!pool) {
        /* A SHAPE HE NEVER DREW, AND NOWHERE NEAR THE SEA.

           There is no piece to reach for -- `facing` is his own placements and
           this neighbourhood is not among them -- so leaving the tile is
           leaving a cliff drawn for ground that is no longer there. Measured on
           one composed map, 22 of the 25 remaining "does not belong" cells were
           this, every one of them INLAND: a terrace edge of the artist's whose
           surroundings the cut or the slide rearranged.

           Inland, the honest reading is that there is no cliff here any more,
           so it becomes meadow -- the same move the rule above makes for a
           coast tile ringed by land, one step earlier. At the shore it is left
           alone: out there the shape is the composer's own outline and a
           missing signature is a fault to fix in the LAND, not a tile to
           paper over. */
        /* ONE LAND NEIGHBOUR IS ENOUGH TO CALL IT INLAND DEBRIS. The test that
           matters is the one above -- every cell of the eight has something
           drawn on it, so there is no sea here and this is not a shoreline. How
           much of that eight is meadow rather than more rock only says how deep
           into the hillside the cell sits, and a piece the artist never drew is
           just as wrong at two as at three. */
        const inland = SIG.every(([dx, dy]) => topAt.has(key(x + dx, y + dy)));
        if (inland && bits >= 1) {
          doc.layout.tiles[i].file = interiorFill(x, y);
          mark(touched, x, y);
          did++;
        }
        continue;
      }

      /* A FACE NEEDS SOMETHING ABOVE IT. Signature 0 -- no land in any of the
         eight -- is exactly what a cliff front sits in, so the pool for it is
         full of faces; picked for a cell with open sky above, each one is a wall
         standing on its own. Choosing them freely turned 2 floating faces into
         26 in a single pass. */
      if (!topAt.has(key(x, y + 1))) {
        const ok = pool.filter((r) => !tiles[r].face);
        if (!ok.length) continue;
        pool = ok;
      }

      /* HOW MANY SIDES THIS PIECE WOULD LEAVE GRASS HANGING OVER WATER -- the
         fault itself, asked of a candidate before it is placed rather than of
         the map afterwards.

         BOTH SIDES OF THE SEAM COUNT. Scoring only the cell's own edges lets a
         see-through piece sit beside a meadow and open the very seam the pass
         is closing; 43 of 57 remaining faults were a neighbour's grass hanging
         over a boulder that had a perfectly good opaque variant. The composer
         reaches for boulders on 38% of its shoreline where the artist uses them
         on 19%, so this is not a rare shape. */
      const offends = (rel: string) => {
        const r = tiles[rel];
        let n_bad = 0;
        for (const [d, dx, dy] of SIDES) {
          const n = key(x + dx, y + dy);
          const other = tiles[fileAt(n)];
          const e = r.edges[d];
          const back = other?.edges ? other.edges[OPPOSITE[d]] : null;
          if (e.grass >= GRASSY && e.stone <= BARE && !covers.has(n)) {
            if ((back ? back.open : 1) >= OPEN) {
              n_bad++;
              continue;
            }
          }
          if (!back || e.open < OPEN || (r.covers ?? 0) >= 1) continue;
          if (back.grass >= GRASSY && back.stone <= BARE) n_bad++;
        }
        return n_bad;
      };

      /* THE SEAM IS THE POINT. Where the neighbour is real ground, a piece open
         along that side lets the water show between them; where it faces water,
         stone is what makes the boundary read as a shore. */
      /* AND THE PIXELS WHERE IT MEETS ITS NEIGHBOUR. `edges` is a fraction per
         side and cannot say WHERE a sprite gives way, so two pieces can both
         read as three-quarters closed and still leave a 32-pixel slot of open
         water between them. `seam` says it pixel by pixel, and this is the
         quantity the critic counts as E1 and E2. Weighted under `offends`,
         which is grass hanging over water and the reason this pass exists, and
         over every tie-break below it. */
      const lvHere = LEVEL.get(doc.layout.tiles[i].layer) ?? 1;
      /* The stack under this cell's own tile, and the neighbour's composite:
         both fixed whichever candidate is tried. See `resurface` for why they
         are hoisted out of the loop. */
      const sides = SIDES.map(([d, dx, dy]) => {
        const nk = key(x + dx, y + dy);
        const ni = topAt.get(nk);
        /* Every seam the neighbour could show back, if it is a coast cell this
           pass will visit too. Read once per side; see `mateable`. */
        let pool2: string[] | null = null;
        if (ni !== undefined) {
          const nfile = doc.layout.tiles[ni].file ?? '';
          const nrec = tiles[nfile];
          const cands = nrec && COAST.has(nrec.kind) ? bySig.get(mask(x + dx, y + dy)) : undefined;
          if (cands) {
            const lv2 = LEVEL.get(doc.layout.tiles[ni].layer) ?? 1;
            const u2 = seamOf(nk, OPPOSITE[d], { lv: lv2, file: '' });
            pool2 = cands.map((r) => over(tiles[r]?.seam?.[OPPOSITE[d]], u2));
          }
        }
        return {
          d,
          dx,
          dy,
          nk,
          pool: pool2,
          under: seamOf(k, d, { lv: lvHere, file: '' }),
          other: ni !== undefined ? seamOf(nk, OPPOSITE[d]) : null,
        };
      });
      /* WHAT THIS PIECE WOULD COST AT ITS FOUR JOINS, and what the neighbour
         could still do about it.

         A join is scored on the pixels: three quarters of the strip drawn on
         one side and empty on the other is a seam cut clean through, ten to
         twenty-three is a notch. But a coast cell is chosen ALONE and a pair
         sometimes has to agree -- an isolated stack of rock kept a 32-pixel
         hole in its side on three villages out of thirty, because every piece
         that closed it lost on some other count while the piece in place was
         tied and stayed. So a bad join whose NEIGHBOUR still has a piece that
         would close it is charged less than one nothing can save: enough to
         break the tie and pick the half of the pair that has a partner, not
         enough to pretend the join is clean.

         Charging it nothing was tried -- scoring a candidate on what the
         neighbour COULD become -- and it is worse in both directions, because
         nothing then obliges the neighbour to become it: seams cut clean
         through appeared where there had been none. */
      const cutOf = (rel: string) => {
        let n = 0;
        const own = tiles[rel]?.seam;
        for (const sd of sides) {
          if (!sd.other) continue; // open sea: nothing to meet
          const mine = over(own?.[sd.d], sd.under);
          const cut = voidCut(mine, sd.other);
          if (cut < CUT_NOTCH) continue;
          let saveable = false;
          if (sd.pool) {
            for (const alt of sd.pool) {
              if (voidCut(mine, alt) < CUT_NOTCH) {
                saveable = true;
                break;
              }
            }
          }
          if (cut >= CUT_THROUGH) n += saveable ? 4 : 10;
          else n += saveable ? 0.4 : 1;
        }
        return n;
      };

      const scoreOf = (rel: string) => {
        const r = tiles[rel];
        let seam = 0,
          stone = 0;
        for (const [d, dx, dy] of SIDES) {
          const n = key(x + dx, y + dy);
          const e = r.edges[d];
          if (land.has(n)) seam += 1 - e.open;
          else if (!covers.has(n)) stone += e.stone;
        }
        /* WEIGHTED BY WHAT THE ARTIST ALLOWS HIMSELF. A notch in a seam is
           something he never draws -- his worst is 9 pixels of 32 -- while
           meadow meeting open water he does 19 times, which is why one is a
           budget of 0 and the other a budget of 19. So a notch outweighs any
           number of grass edges over water -- twenty of them is still inside
           what he allows himself, and one notch is not -- and a seam cut clean
           through outweighs ten notches. Scored the other way round, an isolated two-cell stack of rock
           in the sea kept a 15-pixel slot of water between its halves on every
           composed map, because every piece that closed it had a grassy top. */
        return (
          -cutOf(rel) * 1e7 -
          offends(rel) * 5e5 +
          seam * 1000 +
          stone * 100 +
          (r.kind === rec.kind ? 10 : 0) +
          Math.min(r.used, 9) / 10
        );
      };
      /* AND NEVER TRADE AN OPAQUE TILE FOR A SEE-THROUGH ONE. A shaped piece
         with nothing behind it shows the backdrop, which inland is a hole; two
         appeared the first time this pass was allowed to choose freely.

         This guard is necessary and NOT sufficient, and the gap is worth
         stating: `covers` is a FRACTION and cannot say WHERE the gap is.
         Swapping Terrain_130 (81% opaque) for Terrain_138 (92%) passes any test
         phrased in coverage and still grew a hole from 158px to 416px, because
         138 carries its gap along the bottom edge and that edge faced open
         water. The project's oldest trap -- "is there a surface here" is not
         "can you see through it" -- and no amount of scalar arithmetic closes
         it. `Ground.seal()` runs AFTER this pass for exactly that reason;
         holes are settled on the render, not in the model. */
      /* AND IT MAY NOT CHANGE WHERE YOU CAN WALK. Re-dressing is a claim about
         how the shore LOOKS, and the routes were planned before it ran: swap a
         standable lip for a rock face and a road that was already published
         steps into a wall. Three of the harness's route checks failed exactly
         that way. Cells that were never standable are free to change.

         BOTH GUARDS GIVE WAY TO A PIECE THAT DOES NOT BELONG, and in that
         order. A tile whose neighbourhood is not in its own `facing` list is a
         cliff drawn for ground that is somewhere else -- it is the fault, not a
         thing worth protecting -- and where the guards leave nothing to choose
         from they were protecting exactly that. Opacity yields first because
         `Ground.seal()` runs after this and lays a floor under whatever shows
         through; walkability yields last, because nothing runs after it and a
         published route walking into a wall is worse than a hole. When the tile
         in place IS legal the guards are absolute, which is what keeps this
         from churning a shoreline that is already right. */
      const legalNow = rec.facing.includes(sig);
      const full = pool;
      const solidOnly = (rs: string[]) =>
        (rec.covers ?? 0) >= 1 ? rs.filter((r) => (tiles[r].covers ?? 0) >= 1) : rs;
      const walkOnly = (rs: string[]) => (standable(f) ? rs.filter((r) => standable(r)) : rs);
      pool = walkOnly(solidOnly(full));
      if (!pool.length) {
        if (legalNow) continue;
        pool = walkOnly(full);
        if (!pool.length) pool = full;
      }

      let best = pool[0];
      for (const rel of pool) if (scoreOf(rel) > scoreOf(best)) best = rel;
      if (k === '-59,17' || k === '-59,16') {
        const per = (rel: string) =>
          sides
            .map((sd) => {
              if (!sd.other) return sd.d + ':sea';
              return sd.d + ':' + voidCut(over(tiles[rel]?.seam?.[sd.d], sd.under), sd.other);
            })
            .join(',');
        console.log(
          `[dbg] ${k} f=${f.split('_').pop()} sig=${sig} best=${best.split('_').pop()} ` +
            pool.map((r) => `${r.split('_').pop()}[${per(r)}]`).join(' ')
        );
      }

      if (best === f) continue;

      /* The piece in place keeps it only if it is a legal answer here AND
         nothing scores better. Being the right shape comes first.

         DECLINING THE SWAP ON UNBACKED CELLS WAS TRIED AND IS WRONG, which is
         worth recording because it is the intuitive move: a sprite with nothing
         opaque beneath leaks the sea through whatever it does not cover, so
         leaving a legal one alone sounds safe. It is not -- almost all the
         shoreline worth fixing is unbacked, grass-on-water went 23 -> 95, and
         holes over a quarter cell went 1 -> 4. This pass CLOSES more holes than
         it opens; the one it leaves is cheaper than the four it prevents. */
      if (legalNow && scoreOf(best) <= scoreOf(f)) continue;
      doc.layout.tiles[i].file = best;
      mark(touched, x, y);
      did++;
    }
    changed += did;
    if (!did) break;
  }
  return changed;
}

/* ---- the meadow, re-surfaced on the finished map ------------------------

   THE SAME MOVE AS `redress`, ONE FAMILY ALONG. The composer picks a grass tile
   from a pool keyed on four neighbours, which is a claim about the SHAPE of the
   boundary and says nothing about the strip of pixels where the piece actually
   meets the one beside it. So a fringe can be the right answer for its
   signature, sit next to a piece drawn for a different one, and leave a
   razor-straight 32-pixel line between them. That line is the single most
   recognisable mark of generated content in this art, and it is what the critic
   scores as E1-E4.

   IT IS SCORED ON THE FAULT ITSELF, not on a proxy for it. `atlas.json` carries
   every terrain sprite's `seam` -- 32 characters a side, indexed so position `i`
   on one tile's east seam touches position `i` on its neighbour's west -- and
   the critic composites those top-down and counts the pixels where one side
   draws and the other does not. This pass composites the same strips the same
   way and counts the same pixels, so a swap that scores better here IS a swap
   that scores better there. The project has been caught the other way round
   before: `redress`'s first version scored "closed against land", a different
   quantity from the one being counted, and left 21 cells a piece already in the
   pool would have closed.

   LEGALITY FIRST, THEN THE SEAM. A candidate is only considered if the artist
   himself put that sprite at this exact 8-neighbour signature (`facing`, and
   only where he taught it -- `facing_from === 'artist'`). Where he drew nothing
   at all the cell is left alone: that is a signature he never made, so the fault
   is the SHAPE of the ground and no tile choice can answer it.

   AND IT ONLY EVER REPLACES, for the same reason `redress` does. Grass for
   grass, in the record already there, so it cannot move the shoreline, strand a
   cliff or change where anyone can walk -- `standable` is a question about
   `terrain-tiles/` and every candidate here is `terrain-grass/`. It can open a
   cell that used to be opaque, which is why `Ground.seal()` runs after it. */

/** The critic's own thresholds. Anything else optimises for a quantity nobody
    is measuring. */
const CUT_THROUGH = 24,
  CUT_NOTCH = 10,
  CUT_HALF = 16;
const BLANK = VOID.repeat(32);
/** What it costs to give up an opaque tile for a shaped one. Below the cheapest
    finding (E4, 150) so a real fault always buys the swap, and far above the
    tie-break terms so nothing trades opacity for a couple of pixels. Showing
    the dirt through the grass is how this project's own model reads WORKED
    GROUND, and churning solid meadow into fringe grew `nav.roads` into a rash
    of patches leading nowhere. */
const OPENING_COST = 120;

/** @returns how many cells were re-surfaced. */
export function resurface(
  doc: Document,
  atlas: Atlas,
  passes = 4,
  scope?: Set<string>,
  touched?: Set<string>
): number {
  const tiles = atlas.tiles;
  const weights = atlas.grass?.pools;

  /* Every grass sprite by the signatures the artist used it at, ranked by how
     often he reached for it -- a piece he placed two hundred times is a safer
     answer than one he placed twice. */
  const bySig = new Map<number, string[]>();
  for (const [rel, rec] of Object.entries(tiles)) {
    if (!rel.startsWith('terrain-grass/') || rec.facing_from !== 'artist') continue;
    if (!rec.seam) continue;
    for (const s of rec.facing) {
      const a = bySig.get(s);
      if (a) a.push(rel);
      else bySig.set(s, [rel]);
    }
  }
  if (!bySig.size) return 0;
  for (const pool of bySig.values()) {
    pool.sort((a, b) => (tiles[b].used ?? 0) - (tiles[a].used ?? 0));
  }

  let changed = 0;
  for (let pass = 0; pass < passes; pass++) {
    /* The stack of each cell: one tile index per level, the LAST in document
       order, which is the one the renderer draws. */
    const stack = new Map<string, Map<number, number>>();
    doc.layout.tiles.forEach((t, i) => {
      const lv = LEVEL.get(t.layer);
      if (lv === undefined || !t.file) return;
      const k = key(t.cell[0], t.cell[1]);
      let m = stack.get(k);
      if (!m) {
        m = new Map();
        stack.set(k, m);
      }
      m.set(lv, i);
    });
    const top = new Map<string, string>();
    for (const [k, m] of stack) {
      let hi = -1;
      for (const lv of m.keys()) if (lv > hi) hi = lv;
      top.set(k, doc.layout.tiles[m.get(hi)!].file!);
    }

    /* THE REGION `facing` WAS LEARNT AGAINST, character for character, or the
       signature means something else here than it did there. Grass is an
       overlay on dirt, so the blob it autotiles against is "every cell whose top
       tile is not bare dirt" -- it runs on under the cliffs and out beneath the
       water line, and only a road, a yard or a plot stops it. */
    const blob = new Set<string>();
    for (const [k, f] of top) if (!f.startsWith('terrain-dirt/')) blob.add(k);

    const mask8 = (x: number, y: number) => {
      let s = 0;
      for (const [dx, dy, bit] of SIG) if (blob.has(key(x + dx, y + dy))) s |= bit;
      return s;
    };

    /** One side of a cell, composited top-down: the first layer that draws
        anything at that pixel wins, which is what the renderer does. `swap`
        substitutes a candidate for the tile at `lv` without writing it. */
    const seamOf = (k: string, d: string, swap?: { lv: number; file: string }) => {
      const m = stack.get(k);
      if (!m) return BLANK;
      const levels = [...m.keys()].sort((a, b) => b - a);
      const strips: string[] = [];
      for (const lv of levels) {
        const f = swap && swap.lv === lv ? swap.file : doc.layout.tiles[m.get(lv)!].file!;
        const s = tiles[f]?.seam?.[d];
        if (s) strips.push(s);
      }
      if (!strips.length) return BLANK;
      let out = '';
      for (let i = 0; i < 32; i++) {
        let ch = VOID;
        for (const s of strips)
          if (s[i] !== VOID) {
            ch = s[i];
            break;
          }
        out += ch;
      }
      return out;
    };

    /** What this join costs, by the critic's own count. */
    const penalty = (a: string, b: string, hard: boolean) => {
      let voidCut = 0,
        grassCut = 0;
      let stony = false;
      for (let i = 0; i < 32; i++) {
        const ca = a[i],
          cb = b[i];
        if ((ca === VOID) !== (cb === VOID)) voidCut++;
        if ((ca === GRASS && cb === DIRT) || (ca === DIRT && cb === GRASS)) grassCut++;
        if (ca === STONE || cb === STONE) stony = true;
      }
      let p = 0;
      if (voidCut >= CUT_THROUGH)
        p += 1000; // E1
      else if (voidCut >= CUT_NOTCH) p += 300; // E2
      /* SOFT SEAMS ONLY, and that restriction is what makes this the path rule
         rather than a rule against hillsides. A meadow meeting a cliff top IS a
         hard line: the artist draws 93 of them and the kit has no piece that
         would soften it, because rock does not taper into grass. */
      if (!hard && !stony) {
        if (grassCut >= CUT_THROUGH)
          p += 500; // E3
        else if (grassCut >= CUT_HALF) p += 150; // E4
      }
      /* Below the thresholds a smaller cut is still a straighter line, so it
         breaks ties toward the piece that tapers -- without ever outweighing a
         finding, which is what the numbers above are for. */
      return p + voidCut + grassCut;
    };

    let did = 0;
    for (const [k, m] of stack) {
      if (scope && !scope.has(k)) continue;
      const c = k.indexOf(',');
      const x = Number(k.slice(0, c)),
        y = Number(k.slice(c + 1));
      let hi = -1;
      for (const lv of m.keys()) if (lv > hi) hi = lv;
      const ti = m.get(hi)!;
      const f = doc.layout.tiles[ti].file!;
      if (!f.startsWith('terrain-grass/')) continue;

      const sig = mask8(x, y);
      const pool = bySig.get(sig);
      if (!pool || !pool.length) continue;

      /* AN OPAQUE TILE IS GIVEN UP RELUCTANTLY, NOT REFUSED, and this is the
         one guard that had to be argued rather than copied.

         A shaped grass tile lets the dirt beneath show, and showing the dirt is
         exactly what this project's own model reads as WORKED GROUND -- 95 of
         the demo's 104 narrow trails have no bare cell in them at all, just
         fringe over dirt. So trading solid fills for shaped ones on cells that
         were already right grew `nav.roads` into a rash of little patches
         touching no door, gate or route: P3 went 5 to 25.
         BUT REFUSING THE TRADE OUTRIGHT PROTECTS THE FAULT, because "an
         interior block used where an edge piece belongs" IS the E3 fault, and
         the piece that fixes it is see-through by definition -- E3 went 28 back
         up to 51 and E5 35 to 65 under a blanket guard. Nor does "is the tile
         in place legal here" separate them: `grass 46` is a solid fill the
         artist really did use at signature 110, and it still draws a
         razor-straight line for eight cells where the meadow above a terrace
         meets bare ground. LEGAL BY NEIGHBOURHOOD IS NOT RIGHT BY SEAM -- that
         gap is the entire reason this pass exists.

         So the cost is priced instead of forbidden: opening a solid cell costs
         less than any finding and more than any tie-break, which buys the fix
         wherever there is a fault to fix and refuses the churn everywhere
         else. */
      const solidNow = (tiles[f]?.covers ?? 0) >= 1;

      /* The four joins this cell has, and what is on the other side of each.
         Only the neighbour's own composite is needed -- it does not change.

         AND WHAT LIES UNDER THIS CELL'S OWN TOP TILE, once. A candidate only
         replaces the topmost record, so everything below it composites the same
         way whichever piece is tried: computed here, the seam of a candidate is
         its own 32 characters laid over that, instead of a rebuild of the whole
         stack per candidate per side. Twenty-two candidates times four sides
         times a rebuild is what took one composition to two minutes. */
      const joins = SIDES.map(([d, dx, dy]) => {
        const n = key(x + dx, y + dy);
        const nf = top.get(n);
        return {
          d,
          under: seamOf(k, d, { lv: hi, file: '' }),
          other: nf ? seamOf(n, OPPOSITE[d]) : BLANK,
          /* A cliff on either side makes the join a hard line by design. */
          hard: !!nf && nf.startsWith('terrain-tiles/'),
        };
      });

      const scoreOf = (rel: string) => {
        let p = 0;
        const own = tiles[rel]?.seam;
        for (const j of joins) p += penalty(over(own?.[j.d], j.under), j.other, j.hard);
        if (solidNow && (tiles[rel].covers ?? 0) < 1) p += OPENING_COST;
        return p;
      };

      /* A PIECE HE NEVER USED HERE LOSES ON SIGHT. The seam score decides
         between LEGAL candidates; it is not a licence to keep an illegal one
         because its pixels happen to line up. The critic scores that as E5, and
         a solid fill with a tidy seam beat a proper fringe on 12 cells of one
         composed map until the current tile stopped being allowed to compete
         when it is not in the pool at all. */
      const legalNow = pool.includes(f);

      /* TIES GO TO HIS OWN HAND, AND THIS IS THE FAULT `redress` ALREADY HAD.
         That note reads: *the argmax never ties, so every cell with the same
         signature got the same answer -- his west-facing shore uses 19 pieces
         with the commonest on 21%, and that pass drew it with 5 on 92%.* It was
         fixed for the coast and left here, in a pass whose own heading says it
         is the same move one family along.

         The mechanism was the sort above: `pool` is ranked by a sprite's GLOBAL
         `used` count and the scan keeps the first minimum, so wherever the seam
         has nothing to say -- which is every interior cell, and most of a
         meadow -- the answer was the sprite he used most often ANYWHERE. A
         composed map came out 68.0% one tile against his 52.5%, and `G2` is the
         rule that counts it.

         A TIE IS EXACTLY WHERE A PREFERENCE IS FREE. `penalty` folds its own
         tie-break into the score it returns, so two candidates that score the
         same cut the same number of pixels, notch the same number and cross the
         same thresholds: E1-E4 cannot move whichever of them is taken, and E5
         cannot either because every candidate is in his pool for this exact
         signature. What is left over is his frequency, and that is what the
         draw uses.

         POSITIONAL, so a cell's piece is a fact about where it is rather than
         about which pass reached it -- and so the second pass over an unchanged
         neighbourhood lands on the same answer and the loop still settles. */
      const scored = pool.map((rel) => ({ rel, s: scoreOf(rel) }));
      let bestScore = legalNow ? scoreOf(f) : Infinity;
      for (const c of scored) if (c.s < bestScore) bestScore = c.s;
      const tied = scored.filter((c) => c.s === bestScore).map((c) => c.rel);
      let best = f;
      if (tied.length) {
        const w = weights?.[String(sig)];
        let total = 0;
        for (const rel of tied) total += Math.max(1, w?.[rel] ?? 1);
        let u = (cellHash(x, y) / 0x80000000) * total;
        best = tied[tied.length - 1];
        for (const rel of tied) {
          u -= Math.max(1, w?.[rel] ?? 1);
          if (u < 0) {
            best = rel;
            break;
          }
        }
      }
      if (best === f) continue;
      doc.layout.tiles[ti].file = best;
      top.set(k, best);
      mark(touched, x, y);
      did++;
    }
    changed += did;
    if (!did) break;
  }
  return changed;
}

/* ---- the verge, where worked ground runs up against a meadow it cannot cut

   THE SEAM WITH ONLY ONE FIXABLE SIDE. Almost every meadow-against-bare-ground
   join is settled by `resurface`: the grass side takes a fringe piece that
   opens toward the path and the boundary tapers. A few cannot be, and they are
   all the same shape -- the meadow is standing on a TERRACE LIP.

   A lip is a `terrain-tiles/` sprite with grass along its northern two pixels
   and stone below (`Terrain_197` and its 20-odd siblings), fully opaque, and it
   sits UNDER the meadow tile on Layer 01. Swap the grass above it for the most
   ragged fringe in the kit and the composite is unchanged: where the fringe
   gives way, the lip's own grass shows through. There is no piece in the
   tileset that opens that cell, so no re-dressing can soften that join.

   The artist's answer is not a different tile, it is a different LAYOUT: over
   his 814 meadow-against-bare-ground seams, exactly FIVE have a solid grass
   tile facing the bare side. He does not run a plot up to the top of a cliff.
   A composed map does, because the slide parks a settlement's tilled field
   against the terrace of the settlement that landed beside it -- neither piece
   is wrong and the join between them is.

   So the bare cell gives way instead: it is handed a meadow tile, the boundary
   moves one cell into the plot, and there it stands on plain dirt where a
   fringe can be drawn. `resurface` shapes it afterwards, which is why this runs
   between the two.

   ONLY WHERE THE GRASS SIDE REALLY CANNOT BE OPENED. Every candidate the artist
   ever used at that neighbourhood is tried first, and if any of them softens
   the join the cell is left alone for `resurface` to settle. Otherwise this
   would eat a row off every field on the map. */

const LAYER_ORDER: Record<string, number> = {
  Dirt: -8,
  'Layer 01': -7,
  'Layer 02': -5,
  'Layer 03': -3,
  'Layer 04': -1,
};
const TILE_Z = 10;

/** @returns how many bare cells were given a verge. */
export function verge(
  doc: Document,
  atlas: Atlas,
  passes = 2,
  scope?: Set<string>,
  touched?: Set<string>
): number {
  const tiles = atlas.tiles;
  const bySig = new Map<number, string[]>();
  for (const [rel, rec] of Object.entries(tiles)) {
    if (!rel.startsWith('terrain-grass/') || rec.facing_from !== 'artist') continue;
    if (!rec.seam) continue;
    for (const s of rec.facing) {
      const a = bySig.get(s);
      if (a) a.push(rel);
      else bySig.set(s, [rel]);
    }
  }
  if (!bySig.size) return 0;

  let laid = 0;
  for (let pass = 0; pass < passes; pass++) {
    const stack = new Map<string, Map<number, number>>();
    doc.layout.tiles.forEach((t, i) => {
      const lv = LEVEL.get(t.layer);
      if (lv === undefined || !t.file) return;
      const k = key(t.cell[0], t.cell[1]);
      let m = stack.get(k);
      if (!m) {
        m = new Map();
        stack.set(k, m);
      }
      m.set(lv, i);
    });
    const topLv = new Map<string, number>();
    const top = new Map<string, string>();
    for (const [k, m] of stack) {
      let hi = -1;
      for (const lv of m.keys()) if (lv > hi) hi = lv;
      topLv.set(k, hi);
      top.set(k, doc.layout.tiles[m.get(hi)!].file!);
    }
    const blob = new Set<string>();
    for (const [k, f] of top) if (!f.startsWith('terrain-dirt/')) blob.add(k);
    const mask8 = (x: number, y: number) => {
      let s = 0;
      for (const [dx, dy, bit] of SIG) if (blob.has(key(x + dx, y + dy))) s |= bit;
      return s;
    };
    const seamOf = (k: string, d: string, swap?: { lv: number; file: string }) => {
      const m = stack.get(k);
      if (!m) return BLANK;
      const levels = [...m.keys()].sort((a, b) => b - a);
      const strips: string[] = [];
      for (const lv of levels) {
        const f = swap && swap.lv === lv ? swap.file : doc.layout.tiles[m.get(lv)!].file!;
        const s = tiles[f]?.seam?.[d];
        if (s) strips.push(s);
      }
      if (!strips.length) return BLANK;
      let out = '';
      for (let i = 0; i < 32; i++) {
        let ch = VOID;
        for (const s of strips)
          if (s[i] !== VOID) {
            ch = s[i];
            break;
          }
        out += ch;
      }
      return out;
    };
    const cut = (a: string, b: string) => {
      let n = 0;
      for (let i = 0; i < 32; i++) {
        if ((a[i] === GRASS && b[i] === DIRT) || (a[i] === DIRT && b[i] === GRASS)) n++;
      }
      return n;
    };

    const want = new Map<string, number>(); // cell -> the level to lay meadow on
    for (const [k, f] of top) {
      if (scope && !scope.has(k)) continue;
      if (!f.startsWith('terrain-dirt/')) continue;
      const c = k.indexOf(',');
      const x = Number(k.slice(0, c)),
        y = Number(k.slice(c + 1));
      for (const [d, dx, dy] of SIDES) {
        const n = key(x + dx, y + dy);
        const nf = top.get(n);
        if (!nf || !nf.startsWith('terrain-grass/')) continue;
        const mine = seamOf(k, d);
        if (cut(seamOf(n, OPPOSITE[d]), mine) < CUT_HALF) continue;

        // Can the grass side be opened at all? Every piece he used there.
        /* NEVER ON THE DIRT LAYER. `Dirt` is the base field, the one layer the
           renderer puts under everything, and a grass tile written there is a
           record `seal()` will later write bare dirt over -- the cell drops out
           of the meadow, its neighbours' signatures shift by a bit, and every
           piece chosen against them is suddenly one the artist never used.
           Three cells of one composed map, and the reason `resurface` and the
           critic disagreed about a signature by exactly one bit. */
        const nlv = Math.max(1, topLv.get(n)!);
        const pool = bySig.get(mask8(x + dx, y + dy)) ?? [];
        let fixable = false;
        for (const rel of pool) {
          if (cut(seamOf(n, OPPOSITE[d], { lv: nlv, file: rel }), mine) < CUT_HALF) {
            fixable = true;
            break;
          }
        }
        if (fixable) continue;
        want.set(k, nlv);
        break;
      }
    }
    if (!want.size) break;

    for (const [k, lv] of want) {
      const c = k.indexOf(',');
      const x = Number(k.slice(0, c)),
        y = Number(k.slice(c + 1));
      const layer = LAYERS[lv] ?? 'Layer 01';
      const m = stack.get(k)!;
      const held = m.get(lv);
      const g = interiorFill(x, y);
      if (held !== undefined) doc.layout.tiles[held].file = g;
      else {
        doc.layout.tiles.push({
          layer,
          sorting_order: LAYER_ORDER[layer] ?? -7,
          blend: 'normal',
          cell: [x, y],
          pos: [x + 0.5, y + 0.5, TILE_Z],
          file: g,
          size_px: [32, 32],
          pivot: [0.5, 0.5],
        });
      }
      mark(touched, x, y);
      laid++;
    }
  }
  return laid;
}

/* ---- the shapes he never drew -------------------------------------------

   THE LAST FAULT NO TILE CHOICE CAN ANSWER. `facing` is the artist's own
   placements, so a cell whose eight neighbours form a pattern that appears
   nowhere in his village has an EMPTY pool: there is no piece to reach for,
   `resurface` leaves it alone, and the critic scores it as E5, a grass piece he
   never used here. Measured on one composed map, 12 of the 22 remaining E5
   cells were this rather than a bad choice among candidates -- and the critic's
   own note for them says so: "he drew nothing at this signature -- the shape of
   the ground here is the fault".

   The shape here is the boundary between meadow and worked ground, which the
   composer draws itself when it cuts a road: a track that steps diagonally, or
   turns twice in two cells, makes neighbourhoods he never had to draw. Only 50
   distinct signatures appear in his whole village.

   So the repair is a cell of meadow, not a different sprite. Each bad cell is
   offered the eight one-cell flips around it -- bare ground given grass -- and
   takes whichever leaves the fewest bad shapes within two cells. Adding only:
   taking meadow away is how a road gets wider every time this runs. */

/** @returns how many cells were given meadow to legalise a shape. */
export function relegalise(
  doc: Document,
  atlas: Atlas,
  passes = 3,
  scope?: Set<string>,
  touched?: Set<string>,
  hold?: Set<string>
): number {
  const tiles = atlas.tiles;
  const legal = new Set<number>();
  for (const [rel, rec] of Object.entries(tiles)) {
    if (!rel.startsWith('terrain-grass/') || rec.facing_from !== 'artist') continue;
    for (const s of rec.facing) legal.add(s);
  }
  if (!legal.size) return 0;

  let laid = 0;
  for (let pass = 0; pass < passes; pass++) {
    const stack = new Map<string, Map<number, number>>();
    doc.layout.tiles.forEach((t, i) => {
      const lv = LEVEL.get(t.layer);
      if (lv === undefined || !t.file) return;
      const k = key(t.cell[0], t.cell[1]);
      let m = stack.get(k);
      if (!m) {
        m = new Map();
        stack.set(k, m);
      }
      m.set(lv, i);
    });
    const top = new Map<string, string>();
    const topLv = new Map<string, number>();
    for (const [k, m] of stack) {
      let hi = -1;
      for (const lv of m.keys()) if (lv > hi) hi = lv;
      topLv.set(k, hi);
      top.set(k, doc.layout.tiles[m.get(hi)!].file!);
    }
    const blob = new Set<string>();
    for (const [k, f] of top) if (!f.startsWith('terrain-dirt/')) blob.add(k);
    const sigAt = (x: number, y: number) => {
      let s = 0;
      for (const [dx, dy, bit] of SIG) if (blob.has(key(x + dx, y + dy))) s |= bit;
      return s;
    };
    const isBad = (k: string) => {
      const f = top.get(k);
      if (!f || !f.startsWith('terrain-grass/')) return false;
      const c = k.indexOf(',');
      return !legal.has(sigAt(Number(k.slice(0, c)), Number(k.slice(c + 1))));
    };
    const badAround = (x: number, y: number) => {
      let n = 0;
      for (let dx = -2; dx <= 2; dx++)
        for (let dy = -2; dy <= 2; dy++) {
          if (isBad(key(x + dx, y + dy))) n++;
        }
      return n;
    };

    const bad: string[] = [];
    for (const k of blob) if ((!scope || scope.has(k)) && isBad(k)) bad.push(k);
    if (!bad.length) break;

    let did = 0;
    for (const k of bad) {
      if (!isBad(k)) continue;
      const c = k.indexOf(',');
      const x = Number(k.slice(0, c)),
        y = Number(k.slice(c + 1));
      /* ACCEPTED WHEN THIS CELL COMES RIGHT AND NOTHING ELSE GETS WORSE, not
         only when the count strictly drops. Laying a cell of meadow fixes the
         shape here and hands the new cell a shape of its own, which is often
         one he never drew either -- so the count comes out level, a greedy that
         demands an improvement refuses every flip, and the fault sits there
         with a one-cell repair available. The next pass picks up whatever this
         one created, and the whole thing terminates because meadow is only ever
         added. */
      const before = badAround(x, y);
      let best: string | null = null,
        bestN = before + 1;
      for (const [dx, dy] of SIG) {
        const n = key(x + dx, y + dy);
        const nf = top.get(n);
        if (!nf || !nf.startsWith('terrain-dirt/')) continue;
        /* Bare ground that is AUTHORED -- a yard, a lane an agent walks --
           is not a flip on offer, whatever shape stands beside it. */
        if (hold && hold.has(n)) continue;
        blob.add(n);
        const after = badAround(x, y);
        const fixed = legal.has(sigAt(x, y));
        blob.delete(n);
        if (after < bestN || (fixed && after <= before && after < bestN + 1)) {
          if (after <= before) {
            bestN = after;
            best = n;
          }
        }
      }
      if (!best) continue;
      /* Meadow goes on the layer the cell that needed it carries its own on, so
         a repair beside a terrace lands on the terrace rather than under it. */
      const lv = Math.max(1, topLv.get(k) ?? 1); // never the Dirt layer: see `verge`
      const m = stack.get(best)!;
      const held = m.get(lv);
      const bc = best.indexOf(',');
      const bx = Number(best.slice(0, bc)),
        by = Number(best.slice(bc + 1));
      /* The cell being laid is `best`, not the one that asked for it. */
      const g = interiorFill(bx, by);
      if (held !== undefined) doc.layout.tiles[held].file = g;
      else {
        const layer = LAYERS[lv] ?? 'Layer 01';
        doc.layout.tiles.push({
          layer,
          sorting_order: LAYER_ORDER[layer] ?? -7,
          blend: 'normal',
          cell: [bx, by],
          pos: [bx + 0.5, by + 0.5, TILE_Z],
          file: g,
          size_px: [32, 32],
          pivot: [0.5, 0.5],
        });
        m.set(lv, doc.layout.tiles.length - 1);
      }
      blob.add(best);
      mark(touched, x, y);
      top.set(best, g);
      topLv.set(best, Math.max(topLv.get(best) ?? 0, lv));
      did++;
    }
    laid += did;
    if (!did) break;
  }
  return laid;
}
