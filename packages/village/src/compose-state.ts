/* The map for one state: the world filtered, the land outside the footprints
   erased to the sea, the new shore dressed.

   Ported from `world/scene.py`, which shelled out to node for the shore pass.
   Here both halves are the same language and the same process, so composing a
   state is a function call rather than a subprocess and a pair of temp files. */

import type { Atlas } from './brush/redress';
import { districtsOf, type District } from './districts';
import type { Layout } from './doc/document';
import { shorePass } from './shore';
import { effective, filterLayout, landOf, newOf, toCells, type Plots, type Stages } from './state';

/** Everything a village needs to draw any state of itself. Loaded once. */
export interface VillageWorld {
  /** `world.json`: the base layout with every tile and object tagged by plot. */
  readonly world: Layout;
  /** `plots.json`: each plot's land footprint per stage, and the common ground. */
  readonly plots: Plots;
  /** `atlas.json`: what every terrain tile is, which the brush picks against. */
  readonly atlas: Atlas;
}

export interface ComposedVillage {
  /** The map, ready to draw. */
  readonly layout: Layout;
  /** The state as drawn, with every ancestor lane filled in. */
  readonly stages: Record<string, number>;
  /** The shore pass's own counts, for when the coast comes out wrong. */
  readonly shore: Record<string, number>;
  /** What is standing on it, and which cells each one owns. */
  readonly districts: readonly District[];
}

export function composeState(village: VillageWorld, stages: Stages): ComposedVillage {
  const drawn = effective(stages);
  const land = landOf(village.plots, drawn);
  const layout = filterLayout(village.world, drawn, land);
  const shore = shorePass(layout, {
    land: toCells(land),
    newLand: toCells(newOf(village.plots, drawn)),
    atlas: village.atlas,
  });
  return { layout, stages: drawn, shore, districts: districtsOf(village.plots, drawn) };
}
