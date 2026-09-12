/* The map's partition into settlements.

   A settlement is a PROJECT in the ADE. Every land cell belongs to exactly one,
   plus a few commons that belong to the village itself and stand before any
   project does.

   THIS IS A SIDECAR, not part of the layout. `settlements.json` sits beside
   `village.json` and is saved separately, so `render.py`, `village.py` and
   `base-layout.json` are all untouched by a partition edit -- the partition is
   metadata about the map, not a thing the map draws.

   Ownership is per CELL rather than a polygon, because the coastline moves. The
   brushes cut and grow land; a traced boundary would disagree with the shore the
   moment it was edited, while a cell that stops being land simply stops being
   owned. Built by `assets/village-base/settlements.py`, which also explains the
   two fixes applied to the original trace. */

export interface Settlement {
  id: string;
  name: string;
  /** `project` is a slot a project settles into. `common` is village-owned and
      exists at level 0, before any project. */
  kind: 'project' | 'common';
  color: string;
}

interface Doc {
  version: number;
  /** Who wrote it last. `settlements.py` refuses to rebuild over an `editor`
      file without `--force`, so a border drawn with the brush is not quietly
      thrown away by a regeneration that knows nothing about it. */
  source?: string;
  note?: string;
  settlements: (Settlement & { cells?: number })[];
  /** id -> [cy, x0, x1] inclusive horizontal runs. */
  cells: Record<string, [number, number, number][]>;
}

export const FILE = 'settlements.json';
const key = (cx: number, cy: number) => cx + ',' + cy;

/** One stroke's worth of changes: cell -> the owner it had BEFORE. `null` means
    it had none, which undo has to be able to restore as distinct from "unknown". */
type Patch = Map<string, string | null>;

export class Settlements {
  readonly list: Settlement[];
  private owner = new Map<string, string>();
  private note: string;
  dirty = false;

  private undoStack: Patch[] = [];
  private redoStack: Patch[] = [];
  private open: Patch | null = null;

  private constructor(doc: Doc) {
    this.list = doc.settlements.map((s) => ({
      id: s.id,
      name: s.name,
      kind: s.kind,
      color: s.color,
    }));
    this.note = doc.note ?? '';
    for (const [id, runs] of Object.entries(doc.cells)) {
      for (const [cy, x0, x1] of runs) {
        for (let cx = x0; cx <= x1; cx++) this.owner.set(key(cx, cy), id);
      }
    }
  }

  at(cx: number, cy: number): string | undefined {
    return this.owner.get(key(cx, cy));
  }

  /** Every owned cell as `"cx,cy" -> id`. The composer walks all of them. */
  entries(): IterableIterator<[string, string]> {
    return this.owner.entries();
  }

  /** One settlement's cells, as coordinates. */
  cellsOf(id: string): [number, number][] {
    const out: [number, number][] = [];
    for (const [k, v] of this.owner) {
      if (v !== id) continue;
      const c = k.indexOf(',');
      out.push([Number(k.slice(0, c)), Number(k.slice(c + 1))]);
    }
    return out;
  }

  byId(id: string): Settlement | undefined {
    return this.list.find((s) => s.id === id);
  }

  counts(): Map<string, number> {
    const out = new Map<string, number>();
    for (const id of this.owner.values()) out.set(id, (out.get(id) ?? 0) + 1);
    return out;
  }

  // ── editing ──────────────────────────────────────────────────────────

  beginStroke() {
    this.open = new Map();
  }

  /** Give cells to a settlement. Returns how many actually changed hands, so a
      stroke over ground that already belongs there does not mark the file dirty
      and does not push an empty entry onto the undo stack. */
  paint(cells: [number, number][], id: string): number {
    let n = 0;
    for (const [cx, cy] of cells) {
      const k = key(cx, cy);
      const was = this.owner.get(k);
      if (was === id) continue;
      if (this.open && !this.open.has(k)) this.open.set(k, was ?? null);
      this.owner.set(k, id);
      n++;
    }
    if (n) this.dirty = true;
    return n;
  }

  endStroke() {
    if (this.open?.size) {
      this.undoStack.push(this.open);
      this.redoStack.length = 0;
    }
    this.open = null;
  }

  private apply(p: Patch): Patch {
    const inverse: Patch = new Map();
    for (const [k, was] of p) {
      inverse.set(k, this.owner.get(k) ?? null);
      if (was === null) this.owner.delete(k);
      else this.owner.set(k, was);
    }
    return inverse;
  }

  get canUndo() {
    return this.undoStack.length > 0;
  }
  get canRedo() {
    return this.redoStack.length > 0;
  }

  undo(): boolean {
    const p = this.undoStack.pop();
    if (!p) return false;
    this.redoStack.push(this.apply(p));
    this.dirty = true;
    return true;
  }

  redo(): boolean {
    const p = this.redoStack.pop();
    if (!p) return false;
    this.undoStack.push(this.apply(p));
    this.dirty = true;
    return true;
  }

  // ── drawing and saving ───────────────────────────────────────────────

  /** [cy, x0, x1] inclusive runs per settlement. Both the overlay and the file
      want the same shape: hundreds of rectangles instead of 4,123. */
  runs(): Map<string, [number, number, number][]> {
    const rows = new Map<string, Map<number, number[]>>();
    for (const [k, id] of this.owner) {
      const c = k.indexOf(',');
      const cx = Number(k.slice(0, c)),
        cy = Number(k.slice(c + 1));
      let byRow = rows.get(id);
      if (!byRow) rows.set(id, (byRow = new Map()));
      const xs = byRow.get(cy);
      if (xs) xs.push(cx);
      else byRow.set(cy, [cx]);
    }
    const out = new Map<string, [number, number, number][]>();
    for (const [id, byRow] of rows) {
      const runs: [number, number, number][] = [];
      for (const cy of [...byRow.keys()].sort((a, b) => a - b)) {
        const xs = byRow.get(cy)!.sort((a, b) => a - b);
        let start = xs[0],
          prev = xs[0];
        for (let i = 1; i < xs.length; i++) {
          if (xs[i] === prev + 1) {
            prev = xs[i];
            continue;
          }
          runs.push([cy, start, prev]);
          start = prev = xs[i];
        }
        runs.push([cy, start, prev]);
      }
      out.set(id, runs);
    }
    return out;
  }
}
