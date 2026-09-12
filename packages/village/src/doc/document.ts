/* The editable document.

   THE DOCUMENT IS base-layout SHAPE. Not a private editor format, not the
   handoff's scene.json. That is a deliberate choice and it is the whole reason
   this editor is worth building: `render.py --input village.json` renders it,
   `village.py` reads and writes it, and Claude edits it with the same tools the
   repo already has. One file, two editors, no conversion step and nothing to
   keep in sync.

   `base-layout.json` is ground truth and is never written -- `village.py`
   refuses to save over it and so does the dev server. Edits branch to
   `village.json`, exactly as `village.py init` does, and every change appends to
   the same `edits` log so a session is legible afterwards. */

import type { DrawItem } from '../scene/types';
import { parseLayout, stringifyLayout } from './json';

const PPU = 32;

const round6 = (v: number) => Math.round(v * 1e6) / 1e6;
const round3 = (v: number) => Math.round(v * 1e3) / 1e3;

function moveTo(o: VObject, dx: number, dy: number) {
  o.pos[0] = round6(o.pos[0] + dx);
  o.pos[1] = round6(o.pos[1] + dy);
  o.pos_px = [round3(o.pos[0] * PPU), round3(o.pos[1] * PPU)];
}

export interface Sprite {
  part?: string;
  offset: [number, number, number];
  scale?: [number, number, number];
  backdrop?: boolean;
  material?: string;
  blend: string;
  fill?: string | null;
  sorting_order: number;
  flip_x: boolean;
  flip_y: boolean;
  active: boolean;
  sprite?: string;
  file: string | null;
  size_px: [number, number];
  pivot: [number, number];
}

export interface VObject {
  /** A string when the source id is too large to survive as a double -- see
      json.ts. Compared, never used in arithmetic. */
  id?: number | string;
  prefab: string;
  prefab_guid?: string;
  name?: string;
  group: string;
  /** The plot this belongs to, when it belongs to one. Absent on base scenery,
      which is there at every state. See `state.ts` for the ranges beside it. */
  plot?: string;
  pos: [number, number, number];
  /** Kept in step with `pos`. `village.py` writes it and `analyze.py` reads it,
      so a stale copy is a silently wrong answer rather than an error. */
  pos_px?: [number, number];
  root_order: number;
  rotation_deg: number;
  added?: boolean;
  sprites: Sprite[];
}

export interface VTile {
  layer: string;
  sorting_order: number;
  blend: string;
  cell: [number, number];
  pos: [number, number, number];
  file: string | null;
  size_px: [number, number];
  pivot: [number, number];
}

export interface Edit {
  op: string;
  [k: string]: unknown;
}

export interface Layout {
  $comment?: string;
  units?: unknown;
  sort?: unknown;
  shadow?: unknown;
  camera_background?: unknown;
  bounds_units?: unknown;
  counts?: Record<string, number>;
  layers?: unknown;
  tiles: VTile[];
  objects: VObject[];
  edits?: Edit[];
  source?: unknown;
  /** Where the places are and how to walk between them. Written by the composer,
      read by whatever moves an NPC; `render.py` ignores keys it does not know,
      so carrying it costs the picture nothing. See `app/nav.ts`. */
  nav?: unknown;
}

/** Where a draw item came from, so an edit can find its sprites again. */
export type Origin = { kind: 'object'; oi: number; si: number } | { kind: 'tile'; ti: number };

export type Linked = DrawItem & { origin: Origin };

/* ── the draw item for one sprite ─────────────────────────────────────────
   Positions are scaled to pixels INCLUDING z, because the sort compares y + z
   and both terms must share a unit. Scaling both by 32 leaves the ordering
   identical to render.py's, which sorts in world units. */

export function itemOfSprite(o: VObject, s: Sprite, oi: number, si: number): Linked | null {
  if (s.active === false || !s.file) return null;
  const [ox, oy, oz] = o.pos;
  const [dx, dy, dz] = s.offset;
  return {
    file: s.file,
    x: (ox + dx) * PPU,
    y: (oy + dy) * PPU,
    z: (oz + dz) * PPU,
    w: s.size_px[0],
    h: s.size_px[1],
    pivotX: s.pivot[0],
    pivotY: s.pivot[1],
    order: s.sorting_order ?? 0,
    multiply: s.blend === 'multiply',
    flip: !!s.flip_x,
    seq: o.root_order,
    rotation: o.rotation_deg || 0,
    kind: 'object',
    cell: Math.floor(ox) + ',' + Math.floor(oy),
    origin: { kind: 'object', oi, si },
  };
}

export function itemOfTile(t: VTile, ti: number): Linked | null {
  if (!t.file) return null;
  return {
    file: t.file,
    x: t.pos[0] * PPU,
    y: t.pos[1] * PPU,
    z: t.pos[2] * PPU,
    w: t.size_px[0],
    h: t.size_px[1],
    pivotX: t.pivot[0],
    pivotY: t.pivot[1],
    order: t.sorting_order,
    multiply: t.blend === 'multiply',
    flip: false,
    seq: 0,
    kind: 'terrain',
    cell: t.cell[0] + ',' + t.cell[1],
    origin: { kind: 'tile', ti },
  };
}

/** The draw order, in full. Every term is load-bearing -- see baseLayout.ts. */
export function compareItems(a: DrawItem, b: DrawItem) {
  return a.order - b.order || b.y + b.z - (a.y + a.z) || a.seq - b.seq;
}

/* ── undo ────────────────────────────────────────────────────────────────
   Each entry carries the inverse of what was done, plus the selection at the
   time. Restoring the selection is not a nicety: without it the outline sits
   where the thing it described no longer is, and an undo reads as having done
   nothing at all. */
export interface UndoEntry {
  label: string;
  undo: () => void;
  redo: () => void;
  selection: number[];
}

export class Document {
  layout: Layout;
  /** What this document was opened from. A document opened on ground truth has
      no save target until it is explicitly duplicated. */
  openedFrom = '';
  /** Objects added this session get ids below this, so they never collide. */
  private nextRootOrder: number;
  private nextId: number;
  private undoStack: UndoEntry[] = [];
  private redoStack: UndoEntry[] = [];
  dirty = false;
  /** Bumped on every mutation, so views can tell they are stale. */
  revision = 0;

  constructor(layout: Layout) {
    this.layout = layout;
    this.layout.edits ??= [];
    this.nextRootOrder =
      1 + this.layout.objects.reduce((m, o) => Math.max(m, o.root_order ?? 0), 0);
    /* Editor-added objects get DESCENDING NEGATIVE ids.

       `village.py` uses max(id)+1, which is fine in Python. In JS it is not:
       the demo's ids are Unity instance ids and the largest is
       9,184,538,994,280,546,318 -- past 2^53, where +1 is a no-op and two
       placed objects silently share an id. `village.py diff` keys on id, so the
       corruption would surface as objects mysteriously missing from a diff.
       Unity ids are positive, so negatives cannot collide, and they say plainly
       which objects were added here. */
    this.nextId =
      Math.min(0, ...this.layout.objects.map((o) => (typeof o.id === 'number' ? o.id : 0))) - 1;
  }

  /** Throw the document away and start again from another layout.

      For composition: the map for a given set of settlement states is DERIVED
      from a pristine base rather than edited into being, so recomposing means
      going back to the base and deriving again. See compose.ts for why that is
      not the incremental build.

      History goes with it. An undo stack whose entries describe a document that
      no longer exists is worse than no undo at all -- it would apply inverses to
      cells that have moved. */
  resetTo(layout: Layout) {
    this.layout = layout;
    this.layout.edits ??= [];
    this.nextRootOrder =
      1 + this.layout.objects.reduce((m, o) => Math.max(m, o.root_order ?? 0), 0);
    this.nextId =
      Math.min(0, ...this.layout.objects.map((o) => (typeof o.id === 'number' ? o.id : 0))) - 1;
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.revision++;
  }

  /** One tile per cell per layer, and the one you can actually see.

      A TILEMAP HOLDS ONE TILE PER CELL PER LAYER. Two on the same slot is not a
      stacking trick, it is a layout that cannot say what it draws: `render.py`
      gives both an identical sort key, so which one you see falls out of a
      stable sort, and every reader that builds its own cell model breaks the tie
      its own way. The artist's map has ZERO of these across all eight layers; a
      composed one had up to 601.

      They come from the SLIDE. Moving a settlement translates its tiles onto
      cells that already carry tiles, and nothing merged them -- so the ground a
      settlement landed on kept its own Dirt and Layer 01 records underneath the
      ones that arrived. Invisible on screen, because the renderer draws them in
      document order and the last one wins.

      WHICH IS ALSO THE RULE FOR WHICH ONE SURVIVES: the last record carrying a
      file, because that is the one being drawn and this pass must not change the
      picture. A blank record draws nothing and cannot hide what is under it, so
      it never wins over a record with a file -- keeping the last one outright
      would erase artwork that is currently visible.

      Returns how many were dropped. Callers must `reindex()` after: every tile
      index in the world is invalidated by this. */
  collapseTiles(): number {
    const keep = new Map<string, number>();
    this.layout.tiles.forEach((t, i) => {
      const k = t.layer + '|' + t.cell[0] + ',' + t.cell[1];
      const held = keep.get(k);
      if (held === undefined) {
        keep.set(k, i);
        return;
      }
      // Later beats earlier, and drawn beats blank.
      if (t.file || !this.layout.tiles[held].file) keep.set(k, i);
    });
    if (keep.size === this.layout.tiles.length) return 0;
    const alive = new Set(keep.values());
    const before = this.layout.tiles.length;
    this.layout.tiles = this.layout.tiles.filter((_t, i) => alive.has(i));
    this.revision++;
    return before - this.layout.tiles.length;
  }

  /** Every drawable, linked back to its source and sorted. */
  items(): Linked[] {
    const out: Linked[] = [];
    this.layout.tiles.forEach((t, ti) => {
      const it = itemOfTile(t, ti);
      if (it) out.push(it);
    });
    this.layout.objects.forEach((o, oi) => {
      o.sprites.forEach((s, si) => {
        const it = itemOfSprite(o, s, oi, si);
        if (it) out.push(it);
      });
    });
    out.sort(compareItems);
    return out;
  }

  itemsOfObject(oi: number): Linked[] {
    const o = this.layout.objects[oi];
    if (!o) return [];
    return o.sprites.map((s, si) => itemOfSprite(o, s, oi, si)).filter((v): v is Linked => !!v);
  }

  // ── mutations ──────────────────────────────────────────────────────────

  /** Place a prefab. The sprite list is copied wholesale from the catalog, so
      the object arrives with its shadow and every sub-part already at the right
      offset -- which is why composing from `building-parts` is never necessary
      and why placement is exact by construction.

      The object shape matches `village.py place()` field for field, including
      `pos_px` and `id`. That is not cosmetic: `village.py diff` keys objects by
      `id` and raises KeyError on any object that lacks one, so an editor-placed
      object without it breaks the repo's own tooling. */
  place(
    prefab: string,
    group: string,
    sprites: Sprite[],
    x: number,
    y: number,
    z = 0,
    guid = ''
  ): number {
    const o: VObject = {
      id: this.nextId--,
      prefab,
      prefab_guid: guid,
      name: prefab,
      group,
      pos: [round6(x), round6(y), round6(z)],
      pos_px: [round3(x * PPU), round3(y * PPU)],
      root_order: this.nextRootOrder++,
      rotation_deg: 0,
      added: true,
      sprites: structuredClone(sprites),
    };
    const oi = this.layout.objects.length;
    this.layout.objects.push(o);
    this.log({ op: 'place', prefab, x, y, z });
    this.pushUndo({
      label: `place ${prefab}`,
      undo: () => {
        this.layout.objects.splice(oi, 1);
      },
      redo: () => {
        this.layout.objects.splice(oi, 0, o);
      },
      selection: [oi],
    });
    return oi;
  }

  /** Remove objects. Indices are deleted high-to-low so the earlier ones do not
      shift under the later ones mid-loop. */
  remove(indices: number[]) {
    const sorted = [...new Set(indices)].sort((a, b) => b - a);
    const saved = sorted.map((i) => [i, this.layout.objects[i]] as const).filter((e) => e[1]);
    if (!saved.length) return;
    for (const [i] of saved) this.layout.objects.splice(i, 1);
    this.log({ op: 'remove', count: saved.length });
    this.pushUndo({
      label: `remove ${saved.length}`,
      undo: () => {
        for (const [i, o] of [...saved].reverse()) this.layout.objects.splice(i, 0, o);
      },
      redo: () => {
        for (const [i] of saved) this.layout.objects.splice(i, 1);
      },
      selection: [],
    });
  }

  /** Nudge objects. Whole world units keep everything on the lattice the demo
      uses -- 89.3% of its objects sit on whole pixels and props cluster on a
      1-unit grid, so free positioning is how a scene stops looking placed. */
  nudge(indices: number[], dx: number, dy: number) {
    if (!dx && !dy) return;
    const before = indices.map((i) => [i, ...this.layout.objects[i].pos] as const);
    for (const i of indices) moveTo(this.layout.objects[i], dx, dy);
    this.log({ op: 'nudge', count: indices.length, dx, dy });
    this.pushUndo({
      label: `move ${indices.length}`,
      undo: () => {
        for (const [i, x, y, z] of before) {
          const o = this.layout.objects[i];
          o.pos = [x, y, z];
          o.pos_px = [round3(x * PPU), round3(y * PPU)];
        }
      },
      redo: () => {
        for (const i of indices) moveTo(this.layout.objects[i], dx, dy);
      },
      selection: indices,
    });
  }

  /** One terrain stroke: file swaps on existing tiles, plus appended tiles.

      A stroke is a single undo step because it is a single act -- and because
      the cells in it are not independent. A cell's sprite is a function of its
      neighbours, so undoing half a stroke would leave a fringe resolved against
      a shape that no longer exists. Appended tiles are always a suffix, so
      undoing them is a truncation. */
  applyTileEdit(changes: { ti: number; file: string | null }[], added: VTile[], label: string) {
    const before = changes.map((c) => ({ ti: c.ti, file: this.layout.tiles[c.ti].file }));
    const firstAdded = this.layout.tiles.length;
    for (const c of changes) this.layout.tiles[c.ti].file = c.file;
    this.layout.tiles.push(...added);

    /* A drag is ONE act, so it is one undo step. Without this a stroke across
       forty cells left forty entries and undo had to be pressed forty times to
       take back a single gesture. The stroke accumulates: earlier writes to the
       same tile keep their ORIGINAL `before` value, so undoing the whole stroke
       returns to where the gesture started rather than to its second frame. */
    if (this.stroke) {
      for (const b of before)
        if (!this.stroke.before.has(b.ti)) this.stroke.before.set(b.ti, b.file);
      this.stroke.added.push(...added);
      this.stroke.touched += changes.length;
      this.dirty = true;
      this.revision++;
      return;
    }

    this.log({ op: 'terrain', label, changed: changes.length, added: added.length });
    this.pushUndo({
      label,
      undo: () => {
        for (const b of before) this.layout.tiles[b.ti].file = b.file;
        this.layout.tiles.length = firstAdded;
      },
      redo: () => {
        for (const c of changes) this.layout.tiles[c.ti].file = c.file;
        this.layout.tiles.length = firstAdded;
        this.layout.tiles.push(...added);
      },
      selection: [],
    });
  }

  private stroke: {
    label: string;
    before: Map<number, string | null>;
    added: VTile[];
    firstAdded: number;
    touched: number;
  } | null = null;

  /** Open a stroke. Every tile edit until `endStroke` folds into one step. */
  beginStroke(label: string) {
    if (this.stroke) return;
    this.stroke = {
      label,
      before: new Map(),
      added: [],
      firstAdded: this.layout.tiles.length,
      touched: 0,
    };
  }

  endStroke() {
    const s = this.stroke;
    this.stroke = null;
    if (!s || (!s.before.size && !s.added.length)) return;
    /* Only tiles that existed BEFORE the stroke can be restored by file swap.
       A stroke often appends a tile and then edits it again on a later frame,
       so `before` can hold indices that undo is about to truncate away --
       writing to those threw "Cannot set properties of undefined". Truncation
       already takes care of them. */
    const before = [...s.before].filter(([ti]) => ti < s.firstAdded);
    const after = before.map(([ti]) => [ti, this.layout.tiles[ti].file] as const);
    const added = s.added;
    const firstAdded = s.firstAdded;
    this.log({ op: 'terrain', label: s.label, changed: s.touched, added: added.length });
    this.pushUndo({
      label: s.label,
      undo: () => {
        for (const [ti, file] of before) this.layout.tiles[ti].file = file;
        this.layout.tiles.length = firstAdded;
      },
      redo: () => {
        for (const [ti, file] of after) this.layout.tiles[ti].file = file;
        this.layout.tiles.length = firstAdded;
        this.layout.tiles.push(...added);
      },
      selection: [],
    });
  }

  /** Objects whose ground point is in this cell. Floor, never round. */
  objectsAt(cx: number, cy: number): number[] {
    const out: number[] = [];
    this.layout.objects.forEach((o, i) => {
      if (Math.floor(o.pos[0]) === cx && Math.floor(o.pos[1]) === cy) out.push(i);
    });
    return out;
  }

  // ── history ────────────────────────────────────────────────────────────

  private pushUndo(e: UndoEntry) {
    this.undoStack.push(e);
    if (this.undoStack.length > 200) this.undoStack.shift();
    this.redoStack.length = 0;
    this.dirty = true;
    this.revision++;
  }

  private log(e: Edit) {
    this.layout.edits!.push(e);
  }

  canUndo() {
    return this.undoStack.length > 0;
  }
  canRedo() {
    return this.redoStack.length > 0;
  }

  undo(): UndoEntry | null {
    const e = this.undoStack.pop();
    if (!e) return null;
    e.undo();
    this.redoStack.push(e);
    this.layout.edits!.push({ op: 'undo', of: e.label });
    this.dirty = true;
    this.revision++;
    return e;
  }

  redo(): UndoEntry | null {
    const e = this.redoStack.pop();
    if (!e) return null;
    e.redo();
    this.undoStack.push(e);
    this.layout.edits!.push({ op: 'redo', of: e.label });
    this.dirty = true;
    this.revision++;
    return e;
  }

  // ── persistence ────────────────────────────────────────────────────────

  /** Ground truth is read-only, and the editor will not quietly branch off it.

      `village.py init` makes the copy deliberately, as its own act, and the
      editor does the same: opening base-layout.json gives a document with
      nowhere to save until Duplicate is pressed. An editor that silently
      invents a working file the first time you press Save is one keystroke away
      from a scene nobody meant to create. */
  get readOnly() {
    return this.openedFrom === 'base-layout.json' && !this.workingCopy;
  }
  workingCopy = '';

  /* SAVE WRITES BACK TO THE FILE IT WAS OPENED FROM. It used to default to
     `village.json` whatever was on screen, which is invisible while the only
     two things you can open ARE village.json and ground truth -- and silently
     wrong the moment a district is openable: edit `districts/K/district.json`,
     press Save, and the work lands in the working copy of his whole village
     while the district on disk is untouched and looks exactly like a save that
     did not happen. Every pre-existing case is unmoved: no `?src` opens
     village.json, and base-layout.json is read-only until Duplicate sets
     `workingCopy`, which still outranks this. */
  async save(name = this.workingCopy || this.openedFrom || 'village.json') {
    if (this.readOnly) throw new Error('open on base-layout.json — press Duplicate first');
    // Keep the counts honest; render.py and analyze.py both read them.
    this.layout.counts = {
      ...(this.layout.counts ?? {}),
      objects: this.layout.objects.length,
      tiles: this.layout.tiles.length,
      object_sprites: this.layout.objects.reduce((n, o) => n + o.sprites.length, 0),
    };
    // Encoded for the same reason the read is -- see the note in `openLayout`.
    const res = await fetch('/save/' + encodeURIComponent(name), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: stringifyLayout(this.layout),
    });
    if (!res.ok) throw new Error(`save failed: ${res.status} ${await res.text()}`);
    this.dirty = false;
    return res.json() as Promise<{ ok: boolean; bytes: number; sha: string }>;
  }
}

export async function loadDocument(src: string): Promise<Document> {
  // Encoded for the same reason as `openLayout` -- see the note there.
  const layout = parseLayout<Layout>(
    await (await fetch('/data/' + encodeURIComponent(src))).text()
  );
  return new Document(layout);
}
