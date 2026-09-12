/* MEND THE GRASS JOINS -- the half of the meadow's grammar a per-cell rule
   cannot see, and the fault a hand-cut path leaves on his own map.

   THE OBSERVATION. Cut a six-cell path beside one of the artist's own paths
   and the row of meadow alongside re-resolves. That is correct: its north
   neighbour really did just become bare ground, so pieces that open SOUTH
   (`33 36 49 52`) are replaced by pieces that open NORTH (`81 84 1 82`), and
   every one of the new pieces is legal for its own cell. The row BELOW did not
   change, so nothing re-resolved it -- and its pieces had been drawn to mesh
   with a south-opening neighbour. Eight seams that had been organic became
   eight razor-straight 32px lines. `critic.py` says E3 3 -> 10 in that window;
   the screenshot says the path "pushed the existing one away and left green
   land around it", which is the same fact in a person's words.

   WHY NOTHING COULD SEE IT. `grassSprite` resolves one cell against a mask of
   where the grass blob is. "My neighbour's art opens toward me" is not in that
   mask -- the cell below is ordinary meadow either way -- so no per-cell rule
   can name the fault and no per-cell fix can repair it. It is exactly the
   shape of the coast's problem before `coast.joins` existed: 83% of a composed
   map's vertical joins were pairs he never drew while all 27 rules were green.

   SO THE UNIT IS THE PAIR. `atlas.py` derives `grass.joins` off his own map --
   3,170 ordered pairs over 17,936 placements, cardinals only, because E3 and
   E4 are seam rules and a seam is a shared edge. This pass reads it, finds the
   joins a stroke has just made that he never drew, and mends them.

   IT MENDS, IT DOES NOT RANK. The candidate has to be a piece the artist used
   at that cell's own neighbourhood -- `grass.pools`, the inverse of `facing`
   with his counts kept -- and a swap is taken only when it strictly reduces
   the number of broken joins around it. That is the rule the coast arrived at
   after ranking on the seam and on stone-at-the-waterline both made HIS OWN
   map worse: filter, never rank, and yield rather than invent.

   AND IT MAY MOVE A CELL THE STROKE NEVER TOUCHED, which is the point. The
   cell holding the wrong half of the pair is usually the one that did not
   change. Refusing to touch it is what left the row of straight lines. */

import type { Document } from '../doc/document';

export interface GrassTables {
  pools?: Record<string, Record<string, number>>;
  joins?: Record<string, Record<string, Record<string, number>>>;
}

const key = (x: number, y: number) => x + ',' + y;
const CARD: [string, number, number][] = [
  ['N', 0, 1],
  ['E', 1, 0],
  ['S', 0, -1],
  ['W', -1, 0],
];
const OPP: Record<string, string> = { N: 'S', E: 'W', S: 'N', W: 'E' };
/** `atlas.json`'s bit order, which is NOT `terrainBrush.signature`'s raster
    order. Both are self-consistent and they are different numbers. */
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
const GRASS = 'terrain-grass/';
const LEVEL = new Map([
  ['Dirt', 0],
  ['Layer 01', 1],
  ['Layer 02', 2],
  ['Layer 03', 3],
  ['Layer 04', 4],
]);

/** Mend every grass join inside `scope` that the artist never drew.
    Returns the number of tiles rewritten. */
export function mendGrass(doc: Document, atlas: unknown, scope?: Set<string>): number {
  if ((globalThis as { __noMend?: boolean }).__noMend) return 0;
  const g = (atlas as { grass?: GrassTables } | null)?.grass;
  if (!g?.joins || !g?.pools) return 0;

  /* The visible tile per cell, and where its record lives. A stack is resolved
     top-down exactly as `render.py` does it -- the LAST record at the highest
     layer is what you see, and reading any other one is how three readers of
     this codebase came to disagree about what a cell draws. */
  const topFile = new Map<string, string>();
  const topAt = new Map<string, number>();
  const topLv = new Map<string, number>();
  doc.layout.tiles.forEach((t, i) => {
    const lv = LEVEL.get(t.layer);
    if (lv === undefined || !t.file) return;
    const k = key(t.cell[0], t.cell[1]);
    const was = topLv.get(k);
    if (was !== undefined && lv < was) return;
    topLv.set(k, lv);
    topFile.set(k, t.file);
    topAt.set(k, i);
  });

  const isGrass = (k: string) => (topFile.get(k) ?? '').startsWith(GRASS);
  /* The blob `atlas.py` measured `facing` against and `critic.py` scores E5
     against: a cell counts as filled when it carries a tile that is not bare
     dirt. Verified to agree with the artist's own map on all 4,987 of his
     grass cells -- every one resolves to a signature the table holds, and the
     piece he used is in that pool. */
  const inBlob = (k: string) => {
    const f = topFile.get(k);
    return !!f && !f.startsWith('terrain-dirt/');
  };
  const sigOf = (x: number, y: number) => {
    let s = 0;
    for (const [dx, dy, bit] of SIG8) if (inBlob(key(x + dx, y + dy))) s |= bit;
    return s;
  };
  const drew = (a: string, dir: string, b: string) => (g.joins![dir]?.[a]?.[b] ?? 0) > 0;

  /** How many of a cell's cardinal grass joins are pairs he never drew. */
  const broken = (x: number, y: number, at: (k: string) => string | undefined) => {
    const me = at(key(x, y));
    if (!me?.startsWith(GRASS)) return 0;
    let n = 0;
    for (const [d, dx, dy] of CARD) {
      const nb = at(key(x + dx, y + dy));
      if (!nb?.startsWith(GRASS)) continue;
      if (!drew(me, d, nb) && !drew(nb, OPP[d], me)) n++;
    }
    return n;
  };

  const cells = (scope ? [...scope] : [...topFile.keys()]).filter(isGrass);
  const live = new Map<string, string>();
  const at = (k: string) => live.get(k) ?? topFile.get(k);

  /* A SINGLE-CELL HILL CLIMB CANNOT DO THIS, and the number that says so is
     249 of 257: every cell with a broken join had a pool and not one of them
     had a swap that strictly reduced the count, because mending the seam above
     breaks the seam below. The repair moves TWO cells, which is the same thing
     the coast learnt -- `redress`'s argmax was replaced by a chain, not tuned.

     So the cells that are wrong are decided TOGETHER. While a neighbour is
     still undecided it is treated as FREE: the join counts as satisfiable if
     ANY piece in that neighbour's own pool would join with the candidate, and
     the neighbour is then held to it when its own turn comes. That is the
     look-ahead a greedy pass has to have to leave a run of boundary in a state
     it can finish. */
  const poolOf = (k: string) => {
    const [x, y] = k.split(',').map(Number);
    return g.pools![String(sigOf(x, y))];
  };
  const rawBroken = (
    x: number,
    y: number,
    get: (k: string) => string | undefined,
    free: Set<string>
  ) => {
    const me = get(key(x, y));
    if (!me?.startsWith(GRASS)) return 0;
    let n = 0;
    for (const [d, dx, dy] of CARD) {
      const nk = key(x + dx, y + dy);
      const nb = get(nk);
      if (!nb?.startsWith(GRASS)) continue;
      if (drew(me, d, nb) || drew(nb, OPP[d], me)) continue;
      if (free.has(nk)) {
        // Undecided: satisfiable if anything he used there would join.
        const pool = poolOf(nk);
        if (pool && Object.keys(pool).some((c) => drew(me, d, c) || drew(c, OPP[d], me))) continue;
      }
      n++;
    }
    return n;
  };

  for (let round = 0; round < 3; round++) {
    const free = new Set(
      cells.filter((k) => {
        const [x, y] = k.split(',').map(Number);
        return broken(x, y, at) > 0;
      })
    );
    if (!free.size) break;
    let changed = 0;
    /* Nearest the fault first. A run mends from one end, and starting in the
       middle decides the hardest cell against two free neighbours and then has
       to honour it. */
    const order = [...free].sort();
    for (const k of order) {
      const [x, y] = k.split(',').map(Number);
      free.delete(k);
      const cost = (get: (kk: string) => string | undefined) => {
        let n = rawBroken(x, y, get, free);
        for (const [, dx, dy] of CARD) n += rawBroken(x + dx, y + dy, get, free);
        return n;
      };
      const before = cost(at);
      const pool = poolOf(k);
      if (!before || !pool) continue;
      const now = at(k);
      let best: string | null = null,
        bestN = before;
      // His own order: most-used first, so a tie keeps the piece he reached for.
      for (const cand of Object.keys(pool)) {
        if (cand === now) continue;
        const n = cost((kk) => (kk === k ? cand : at(kk)));
        if (n < bestN) {
          bestN = n;
          best = cand;
        }
      }
      if (!best) continue;
      live.set(k, best);
      changed++;
    }
    if (!changed) break;
  }

  let moved = 0;
  for (const [k, file] of live) {
    const ti = topAt.get(k);
    if (ti === undefined || doc.layout.tiles[ti].file === file) continue;
    doc.layout.tiles[ti].file = file;
    moved++;
  }
  return moved;
}
