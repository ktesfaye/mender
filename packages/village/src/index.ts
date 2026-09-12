/* The village: a world that can be drawn at any state of itself.

   Lifted out of `../a-cozy-agents-village`, where it grew. Everything here is
   transport-agnostic and draws nothing — no Pixi, no DOM, no Electron — so the
   map for a state can be composed wherever it is cheapest to compose it. The
   drawing sits in the app, on top of `Document.items()`. */

export { composeState, type ComposedVillage, type VillageWorld } from './compose-state';
export {
  boundsOf,
  campfireOf,
  districtsOf,
  extentOf,
  groundCells,
  type District,
} from './districts';
export { CELL } from './scene/resolve';
export { shorePass, type ShorePassOptions } from './shore';
export {
  ABSENT,
  available,
  CAMP,
  cellsOf,
  effective,
  filterLayout,
  landOf,
  MAX_STAGE,
  newOf,
  ORDER,
  PARENT,
  parseState,
  PLOTS,
  plotAt,
  stateKey,
  toCells,
  visible,
  type Cell,
  type CellRun,
  type PlotId,
  type PlotRecord,
  type Plots,
  type Stages,
} from './state';
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
