/* What a state of the village is, and what of the world is visible in it.

   A state names the plots that have a project and the stage each is at. A plot
   not named is ABSENT: no project, no district, open sea where it stood. Stage
   0 is not a project either; it is a wild lane, and a plot only stands at 0
   because a district further out has to be reached through it (`effective`).

   A tile or object with no `plot` is base and is always shown. One with a plot
   is shown when `from <= stage < to` for that plot's stage. The land of a state
   is the common ground plus each present plot's footprint at its stage, and the
   shore pass erases everything outside it to the sea.

   Ported from `world/state.py` in the village repo. The rules are that file's;
   keep the two in step if either moves. */

import type { Layout, VObject, VTile } from './doc/document';

export const PLOTS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'ISLAND'] as const;
export type PlotId = (typeof PLOTS)[number];

export const MAX_STAGE = 5;
/** The stage an absent plot reads as: below 0, which is a lane. */
export const ABSENT = -1;

export const CAMP = 'CAMP';

/* The island grows outward from the camp. A plot's parent is the plot its land
   is reached through; when a plot is present its parent is at least a lane. New
   projects are offered plots whose parent is already there, in ORDER, so the
   island stays one piece. */
export const PARENT: Record<string, string> = {
  A: CAMP,
  E: 'A',
  D: 'A',
  B: 'A',
  I: 'E',
  F: 'E',
  K: 'D',
  C: 'B',
  G: 'F',
  J: 'K',
  H: 'G',
  ISLAND: 'D',
};

export const ORDER: PlotId[] = ['A', 'E', 'D', 'B', 'I', 'F', 'K', 'C', 'G', 'J', 'H', 'ISLAND'];

/** Plot id -> stage. A plot absent from the map has no project. */
export type Stages = Readonly<Record<string, number>>;

/** The state as drawn: every ancestor of a present plot is present, at 0 if it
    has no project of its own. */
export function effective(stages: Stages): Record<string, number> {
  const out: Record<string, number> = { ...stages };
  for (const p of Object.keys(stages)) {
    let q = PARENT[p];
    while (q && q !== CAMP) {
      if (!(q in out)) out[q] = 0;
      q = PARENT[q];
    }
  }
  return out;
}

/** Plots a new project may take: free, and reachable from what is there. */
export function available(stages: Stages): PlotId[] {
  return ORDER.filter((p) => (stages[p] ?? 0) === 0 && (PARENT[p] === CAMP || PARENT[p] in stages));
}

type Ranged = {
  when?: Record<string, [number, number]>;
  plot?: string;
  from?: number;
  to?: number;
};

/** `when` is the general form: every plot named must be inside its range.
    `plot`/`from`/`to` is the one-plot shorthand. A tile on a plot line depends
    on both plots and carries `when`.

    An absent plot reads as ABSENT, below 0: his meadow and his wild trees are
    tagged from ABSENT and show whatever the plot is doing; a lane dug at 0 shows
    only once the plot is on the map. */
export function visible(el: Ranged, stages: Stages): boolean {
  if (el.when) {
    for (const [p, [lo, hi]] of Object.entries(el.when)) {
      const s = stages[p] ?? ABSENT;
      if (!(lo <= s && s < hi)) return false;
    }
    return true;
  }
  if (el.plot === undefined) return true;
  const s = stages[el.plot] ?? ABSENT;
  return (el.from ?? 1) <= s && s < (el.to ?? MAX_STAGE + 1);
}

const WATER_PREFAB = 'PF Top Down Pixel Water';

/** The world filtered to one state, deep-copied.

    The copy is not optional: the shore pass rewrites tiles in place, and the
    world it filtered is held in memory and composed again for the next state. */
export function filterLayout(world: Layout, stages: Stages, land?: ReadonlySet<string>): Layout {
  const tiles = world.tiles.filter((t) => visible(t as VTile & Ranged, stages));
  let objects = world.objects.filter((o) => visible(o as VObject & Ranged, stages));
  if (land) {
    objects = objects.filter(
      (o) =>
        o.prefab === WATER_PREFAB || land.has(`${Math.floor(o.pos[0])},${Math.floor(o.pos[1])}`)
    );
  }
  return structuredClone({ ...world, tiles, objects });
}

/* ── the land ────────────────────────────────────────────────────────────── */

/** A run of cells on one row: `[y, x0, x1]`, both ends inclusive. */
export type CellRun = [y: number, x0: number, x1: number];

export interface PlotRecord {
  id: string;
  /** Land footprint per stage, keyed by the stage as a string. */
  land: Record<string, CellRun[]>;
  /** Of that, the cells beyond his own shore. */
  new?: Record<string, CellRun[]>;
  /** Every cell the plot claims, at any stage — what a click on it hits. */
  cells: CellRun[];
}

export interface Plots {
  common: CellRun[];
  common_new?: CellRun[];
  plots: PlotRecord[];
  camp: PlotRecord;
}

export type Cell = [x: number, y: number];

export function cellsOf(rows: readonly CellRun[]): Cell[] {
  const out: Cell[] = [];
  for (const [y, x0, x1] of rows) for (let x = x0; x <= x1; x++) out.push([x, y]);
  return out;
}

function addRuns(into: Set<string>, rows: readonly CellRun[] | undefined): void {
  if (!rows) return;
  for (const [y, x0, x1] of rows) for (let x = x0; x <= x1; x++) into.add(`${x},${y}`);
}

const parse = (k: string): Cell => {
  const i = k.indexOf(',');
  return [Number(k.slice(0, i)), Number(k.slice(i + 1))];
};

/** Every cell that is land in this state, as "x,y" keys. */
export function landOf(plots: Plots, stages: Stages): Set<string> {
  const land = new Set<string>();
  addRuns(land, plots.common);
  for (const rec of plots.plots) {
    const s = stages[rec.id];
    if (s !== undefined) addRuns(land, rec.land[String(s)]);
  }
  return land;
}

/** The cells of that land he never had: the only place the shore pass may make
    ground where there was none. */
export function newOf(plots: Plots, stages: Stages): Set<string> {
  const fresh = new Set<string>();
  addRuns(fresh, plots.common_new);
  for (const rec of plots.plots) {
    const s = stages[rec.id];
    if (s !== undefined) addRuns(fresh, rec.new?.[String(s)]);
  }
  return fresh;
}

export function toCells(keys: ReadonlySet<string>): Cell[] {
  return [...keys].map(parse);
}

/** The plot a cell belongs to, or null for common ground and open sea. */
export function plotAt(plots: Plots, cell: Cell): string | null {
  const [x, y] = cell;
  for (const rec of [...plots.plots, plots.camp]) {
    for (const [ry, x0, x1] of rec.cells) {
      if (ry === y && x0 <= x && x <= x1) return rec.id;
    }
  }
  return null;
}

/* ── the state as a string ───────────────────────────────────────────────── */

const TOKEN = /([A-Z]+)([0-5])/g;

export function parseState(s: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of (s || '').matchAll(TOKEN)) out[m[1]] = Number(m[2]);
  return out;
}

export function stateKey(stages: Stages): string {
  const parts = PLOTS.filter((p) => p in stages).map((p) => `${p}${stages[p]}`);
  return parts.join('') || 'none';
}
