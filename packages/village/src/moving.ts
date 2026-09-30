/* Rearranging who stands where.

   A district is a place of his and a project is who lives there, so moving a
   project is only ever a change of address: the land never moves. What a new
   arrangement has to keep true is what founding already keeps true, that
   every place somebody lives can be walked to from the fire, because anything
   that cannot is simply not drawn. */

import { landOf } from './districts';
import { CAMP, COMMON, ISLET, type Plan, type SubdistrictSpec } from './his';

/** Where each project stands: project id to place id. */
export type Arrangement = ReadonlyMap<string, string>;

/** Somewhere else to stand, or nowhere on the map at all. */
export type Move = { kind: 'to'; place: string } | { kind: 'off' };

/**
 * The arrangement after one project moves.
 *
 * Onto somebody else's place is a swap: they take the one being left. Off the
 * map is the project leaving the arrangement entirely. And whoever stood on a
 * piece of a district that is left with nobody on the rest of it takes the
 * whole district, since the piece was only ever cut out for them to share it.
 */
export function moved(
  arrangement: Arrangement,
  who: string,
  move: Move,
  subdistricts: readonly SubdistrictSpec[] = []
): Map<string, string> {
  const out = new Map(arrangement);
  const from = arrangement.get(who);
  if (move.kind === 'off') {
    out.delete(who);
  } else {
    for (const [other, place] of arrangement) {
      if (other !== who && place === move.place && from !== undefined) out.set(other, from);
    }
    out.set(who, move.place);
  }
  const places = new Set(out.values());
  for (const [other, place] of out) {
    const of = subdistricts.find((one) => one.id === place)?.of;
    if (!of || places.has(of)) continue;
    out.set(other, of);
    places.delete(place);
    places.add(of);
  }
  return out;
}

/**
 * What is wrong with an arrangement, or null when nothing is.
 *
 * Two things can be. A piece of a district needs somebody on the rest of it,
 * or the rest stands lit with nobody home. And every place somebody lives has
 * to reach the fire; the answer names who would be left out at sea.
 */
export function faultIn(
  plan: Plan,
  subdistricts: readonly SubdistrictSpec[],
  arrangement: Arrangement,
  nameOf: (who: string) => string
): string | null {
  const places = new Set(arrangement.values());
  for (const piece of subdistricts) {
    if (!places.has(piece.id) || places.has(piece.of)) continue;
    return `nobody would be left on the rest of the ${plan.spec(piece.of).name.toLowerCase()}`;
  }
  const land = new Set<string>([...COMMON, ...[...places].map((id) => landOf(id, subdistricts))]);
  const reached = plan.connected(land);
  for (const [who, place] of arrangement) {
    if ((reached as ReadonlySet<string>).has(landOf(place, subdistricts))) continue;
    return `${nameOf(who)} would be left out at sea`;
  }
  return null;
}

/** Who in an arrangement cannot walk to the fire. */
export function stranded(
  plan: Plan,
  subdistricts: readonly SubdistrictSpec[],
  arrangement: Arrangement
): string[] {
  const land = new Set<string>([
    ...COMMON,
    ...[...arrangement.values()].map((id) => landOf(id, subdistricts)),
  ]);
  const reached = plan.connected(land) as ReadonlySet<string>;
  return [...arrangement]
    .filter(([, place]) => !reached.has(landOf(place, subdistricts)))
    .map(([who]) => who);
}

/**
 * The arrangement after a project leaves, with nobody left out at sea.
 *
 * Taking a project off the map can cut whoever stood beyond it off from the
 * fire, and a place that cannot reach the fire is not drawn, so they would
 * vanish. Instead each of them moves in to the nearest place that brings
 * somebody back: the gap the leaver left first, then his order, the islet last.
 */
export function leaving(
  plan: Plan,
  subdistricts: readonly SubdistrictSpec[],
  arrangement: Arrangement,
  who: string
): Map<string, string> {
  let out = moved(arrangement, who, { kind: 'off' }, subdistricts);
  const gap = arrangement.get(who);
  const places = [
    ...(gap ? [landOf(gap, subdistricts)] : []),
    ...plan.order().filter((one) => one !== CAMP && one !== ISLET),
    ISLET,
  ];
  let lost = stranded(plan, subdistricts, out);
  while (lost.length) {
    let better: Map<string, string> | null = null;
    for (const one of lost) {
      const taken = new Set(out.values());
      for (const place of places) {
        if (taken.has(place)) continue;
        const tried = moved(out, one, { kind: 'to', place }, subdistricts);
        if (stranded(plan, subdistricts, tried).length < lost.length) {
          better = tried;
          break;
        }
      }
      if (better) break;
    }
    if (!better) break;
    out = better;
    lost = stranded(plan, subdistricts, out);
  }
  return out;
}
