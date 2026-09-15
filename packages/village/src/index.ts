/* The village: the artist's map, with any set of his districts standing.

   Lifted out of `../a-cozy-agents-village`, where it grew. Everything here is
   transport-agnostic and draws nothing — no Pixi, no DOM, no Electron — so the
   map for a state can be composed wherever it is cheapest to compose it. The
   drawing sits in the app, on top of `Document.items()`.

   THE ARTIST DRAWS EVERY DISTRICT AND NOTHING HERE DRAWS ANY OF THEM. There is
   no growth model in this package: a district is on the map exactly as he laid
   it, or it is open sea. What this composes is which of the thirteen are
   standing, where the coast between them runs, and where the islet is moored. */

export {
  boundsOf,
  campfireOf,
  districtsOf,
  extentOf,
  groundCells,
  type District,
} from './districts';
export {
  CAMP,
  COMMON,
  createPlan,
  createVillage,
  DISTRICTS,
  type Cell,
  type CellRun,
  type Composed,
  type DistrictId,
  type DistrictSpec,
  type Plan,
  type Village,
  type VillageWorld,
} from './his';
export { CELL } from './scene/resolve';
export { shorePass, type ShorePassOptions } from './shore';
export {
  compareItems,
  Document,
  type Layout,
  type Linked,
  type VObject,
  type VTile,
} from './doc/document';
export { parseLayout, stringifyLayout } from './doc/json';
export type { DrawItem } from './scene/types';
export type { Atlas } from './brush/redress';
