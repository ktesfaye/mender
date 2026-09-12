/* Make a cut footprint a shape the artist actually drew.

   THE CRITIC SAYS IT IN WORDS, and it took far too long to listen: on a cell
   beside a fresh path it reports

     grass 33 on signature 91, which he never drew it at
       -> he drew nothing at this signature -- THE SHAPE OF THE GROUND HERE IS
          THE FAULT

   Not the sprite. Every piece the brush picks is one he uses at that same
   neighbourhood -- measured, 0 of 1005 novel -- and the cells still come back
   wrong, because the neighbourhood itself is one that does not occur anywhere
   in his village. A dragged disc leaves long dead-straight edges, and a long
   dead-straight edge of worked ground is a thing he never cut. Signatures 222,
   91, 139 and 138 sat in one straight row at the top of a 105-cell blob and
   none of the four is among the 47 he drew.

   The damage, measured on that blob and counting ONLY cells inside the stroke:

                          in the stroke     the artist, whole village
        E3                          11                             7
        E4                           9                             7
        E5                          12                             0

   One 105-cell blob out-scores his six thousand cells. `pathdraw` missed all of
   it by counting the whole map, where his baseline swamps one stroke -- a
   harness can be green and mean nothing, which is the fault this file is the
   second instance of.

   SO THIS IS `legaliseOutline` FOR WORKED GROUND. Same idea the coast uses and
   the same table discipline: the 47 signatures live in `atlas.json` under
   `paths.fringe`, derived off his own map by `atlas.py`, and are read here and
   by `critic.py` -- never re-typed. A cell whose vocabulary is empty cannot be
   dressed by any dresser, so the shape is fixed before a tile is chosen. */

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
/** THE CRITIC'S OWN MASK, and getting it backwards cost a whole pass.

    `critic.py`'s E5 builds `blob = every cell whose top tile is NOT bare dirt`
    and masks a grass cell against THAT -- so a set bit means "my neighbour is
    still grass", not "my neighbour is path". The first version of this file
    masked the cut instead, which is the complement, compared it against a
    table keyed the other way, found zero offenders on a blob the critic scores
    12, and returned its input unchanged while looking like it worked.

    Bit order is `atlas.py`'s and `critic.py`'s: N E S W NE SE SW NW. */
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

const key = (x: number, y: number) => x + ',' + y;
const unkey = (k: string) => k.split(',').map(Number) as [number, number];

/** Legalise the shape of a cut so every grass cell beside it sits at a
    neighbourhood the artist actually drew grass at.

    @param cut   the cells this gesture took
    @param can   whether a cell may be cut -- the caller's rule
    @param legal the union of `facing` over his 66 grass sprites, 48 of them.
                 NOT `paths.fringe`: that is keyed on which neighbours are
                 worked, and E5 asks the opposite question.
    @param base  whether a cell is part of the grass blob with this gesture
                 UNDONE -- so `blob(c) = base(c) && !cut.has(c)` for any
                 candidate footprint. */
export function legaliseCut(
  cut: Set<string>,
  can: (x: number, y: number) => boolean,
  legal: Set<number>,
  base: (x: number, y: number) => boolean
): Set<string> {
  if (cut.size < 3 || !legal.size) return cut;
  const out = new Set(cut);

  const inBlob = (x: number, y: number, set: Set<string>) => base(x, y) && !set.has(key(x, y));
  const sig = (x: number, y: number, set: Set<string>) => {
    let s = 0;
    for (const [dx, dy, b] of SIG8) if (inBlob(x + dx, y + dy, set)) s |= b;
    return s;
  };
  /* Only the grass cells that TOUCH the cut can have been made wrong by it.
     A cell further out has the neighbourhood it always had, and re-judging it
     would blame this gesture for the artist's own seven. */
  const offenders = (set: Set<string>, within?: Set<string>) => {
    const bad = new Set<string>();
    const look = new Set<string>();
    for (const k of set) {
      const [x, y] = unkey(k);
      for (const [dx, dy] of RING8) {
        const p = key(x + dx, y + dy);
        if (!set.has(p) && inBlob(x + dx, y + dy, set) && (!within || within.has(p))) look.add(p);
      }
    }
    for (const k of look) {
      const [x, y] = unkey(k);
      if (!legal.has(sig(x, y, set))) bad.add(k);
    }
    return bad;
  };

  const floor = Math.max(2, Math.floor(cut.size / 2));
  for (let pass = 0; pass < 6; pass++) {
    const bad = offenders(out);
    if (!bad.size) break;
    let moved = false;
    for (const k of [...bad].sort()) {
      const [bx, by] = unkey(k);
      const win = new Set<string>();
      for (let dx = -3; dx <= 3; dx++)
        for (let dy = -3; dy <= 3; dy++) win.add(key(bx + dx, by + dy));
      const cost = (set: Set<string>) => offenders(set, win).size;
      const now = cost(out);
      let best: { k: string; add: boolean; gain: number } | null = null;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const t = key(bx + dx, by + dy);
          const [tx, ty] = [bx + dx, by + dy];
          const has = out.has(t);
          if (!has && !can(tx, ty)) continue;
          if (has && out.size <= floor) continue;
          if (has) out.delete(t);
          else out.add(t);
          const gain = now - cost(out);
          if (has) out.add(t);
          else out.delete(t);
          if (gain > 0 && (!best || gain > best.gain)) best = { k: t, add: !has, gain };
        }
      }
      if (best) {
        if (best.add) out.add(best.k);
        else out.delete(best.k);
        moved = true;
      }
    }
    if (!moved) break;
  }
  return out.size ? out : cut;
}
