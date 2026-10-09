import { CELL, type Layout } from '@mender/village';
import { Container, Sprite, type Texture } from 'pixi.js';
import { folkTexture } from './folk';
import { SHADOW_TINT, type Building } from './scene';
import type { Lamp } from './crowd';
import type { Paths, Spot } from './walkers';

/**
 * What is out on the water: the sea's own traffic, nobody's errand.
 *
 * Sloops come in round the island and tie up beside a pier, a rowing boat
 * pulls from one dock to another, a log raft is poled along under a patched
 * square sail, a fisher sits at anchor off the coast with a rod out, and now
 * and then a two-masted ship goes by well out, too deep to come in. Buoys bob
 * off the piers, a barrel or a log drifts past, ducks paddle along the shore.
 * Everything that moves leaves rings behind it and has the water lapping at
 * its hull, and after dark the boats carry a lantern and the buoys blink.
 *
 * A boat lands only at a dock the artist drew, on a district somebody lives
 * on: nothing ever runs aground on a beach. Tied up, whoever came on it gets
 * off, walks the pier and goes into the village, and townsfolk come down from
 * their doors, walk out along the pier and climb aboard before it casts off.
 * A push loads one at that district's dock and it sails.
 *
 * The way round the island is found on the sea's own grid, a cell a step,
 * keeping off the coast by however much water that boat draws, and pulled
 * straight wherever the water allows so a boat sails rather than staggers.
 * The coast is the one the foam is measured against, the ground as it is
 * drawn, so a cliff face standing out over the map's sea is land to a boat.
 *
 * Every boat is drawn at sixteen headings and comes about at its own pace
 * towards wherever it is going, a ship slowly and a rowing boat quickly, and
 * lies along a pier when it is tied up rather than across it.
 */

type Kind = 'ship' | 'sloop' | 'row' | 'raft' | 'fisher';
type Facing = 'N' | 'E' | 'S' | 'W';

/** World pixels a second. */
const SPEED: Record<Kind, number> = { ship: 9, sloop: 15, row: 11, raft: 6, fisher: 9 };
/** How many cells of water a boat keeps between itself and the coast. */
const CLEAR: Record<Kind, number> = { ship: 7, sloop: 3, row: 2, raft: 2, fisher: 2 };
/** How long each is and how broad, as it is modelled, in world pixels. */
const LENGTH: Record<Kind, number> = { ship: 118, sloop: 58, row: 32, raft: 40, fisher: 34 };
const BEAM: Record<Kind, number> = { ship: 34, sloop: 20, row: 13, raft: 27, fisher: 13 };
/** How fast it comes about, radians a second. */
const TURN: Record<Kind, number> = { ship: 0.3, sloop: 0.8, row: 1.4, raft: 0.5, fisher: 1.1 };
/** How many headings each is drawn at, a turn divided evenly from east. */
const HEADINGS = 16;
/** How each one's frames go: how many, and how long each is held. */
const FRAMES: Record<Kind, [number, number]> = {
  ship: [2, 900],
  sloop: [2, 700],
  row: [4, 260],
  raft: [2, 800],
  fisher: [2, 1400],
};
/** Where its lantern hangs: how far along the keel from the middle, and how high. */
const LANTERN: Record<Kind, [number, number]> = {
  ship: [-62, 28],
  sloop: [-29, 12],
  row: [-13, 6],
  raft: [4, 22],
  fisher: [-14, 6],
};
/** How far past the island the sea's grid runs, in cells. */
const MARGIN = 14;
/** Walking pace on a pier and ashore, world pixels a second. */
const STROLL = 12;
const TOWNSFOLK = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

interface Dock {
  district: string;
  facing: Facing;
  /** The box the pier is drawn in. */
  box: { x: number; y: number; width: number; height: number };
  /** The end of the pier on land, walkable. */
  shore: Spot;
  /** The end of the pier out over the water, where people step aboard. */
  tip: Spot;
  /** Who is tied up here, if anybody. */
  taken: Vessel | null;
}

interface Vessel {
  kind: Kind;
  view: Container;
  body: Sprite;
  /** Which texture it is showing, so it is only swapped when that changes. */
  shown: string;
  x: number;
  y: number;
  path: Spot[];
  /** Which way its bow points, radians clockwise from east. */
  heading: number;
  frame: number;
  frameAt: number;
  /** Sailing somewhere, tied up at a dock, or lying at anchor. */
  state: 'sailing' | 'moored' | 'anchored';
  /** Where it is headed next once it gets there. */
  dock: Dock | null;
  /** Whether the end of its path is the edge of the sea, where it goes. */
  outbound: boolean;
  waitUntil: number;
  /** Tied up, when it stops waiting for anybody still walking out to it. */
  giveUp: number;
  /** Who is still aboard to get off, and who is still walking out to board. */
  aboard: number;
  boarding: number;
  ringAt: number;
  lamp: Lamp;
  gone: boolean;
  lane: Container | null;
}

interface Walker {
  look: string;
  view: Container;
  body: Sprite;
  x: number;
  y: number;
  path: Spot[];
  dir: 'down' | 'up' | 'side';
  flip: boolean;
  frame: number;
  frameAt: number;
  fading: boolean;
  /** Once it has walked the whole way: board, or just go indoors. */
  boards: Vessel | null;
  gone: boolean;
  lane: Container | null;
}

interface Floater {
  kind: 'buoy' | 'barrel' | 'drift' | 'duck';
  sprite: Sprite;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  life: number;
  /** A duck paddles to a spot, then another. */
  target: Spot | null;
  lamp: Lamp | null;
  ringAt: number;
  lane: Container | null;
}

interface Ring {
  sprite: Sprite;
  age: number;
  life: number;
}

export class Fleet {
  /** The rings wakes leave, under everything that floats. */
  readonly wakes = new Container();
  private readonly vessels: Vessel[] = [];
  private readonly walkers: Walker[] = [];
  private readonly floaters: Floater[] = [];
  private readonly rings: Ring[] = [];
  private readonly docks: Dock[] = [];
  private readonly doors = new Map<string, Spot[]>();
  /** The sea's grid: cells of clearance from the coast, nought on land. */
  private readonly clear: Uint8Array;
  private readonly x0: number;
  private readonly y0: number;
  private readonly cols: number;
  private readonly rows: number;
  private nextSail = 2;
  private nextFloat = 4;
  private night = false;
  private scale = 1;
  private sorted = 0;
  private view = { x: -Infinity, y: -Infinity, width: Infinity, height: Infinity };

  constructor(
    private readonly paths: Paths,
    private readonly laneAt: (y: number) => Container,
    layout: Layout,
    buildings: readonly Building[],
    private readonly wet: (x: number, y: number) => boolean,
    extent: { x: number; y: number; width: number; height: number }
  ) {
    this.wakes.eventMode = 'none';
    this.x0 = Math.floor(extent.x / CELL) - MARGIN;
    this.y0 = Math.floor(extent.y / CELL) - MARGIN;
    this.cols = Math.ceil(extent.width / CELL) + MARGIN * 2;
    this.rows = Math.ceil(extent.height / CELL) + MARGIN * 2;
    const solid = new Uint8Array(this.cols * this.rows);
    // A cell with any ground drawn in it at all is not sea.
    const probe = CELL / 4;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const left = (this.x0 + c) * CELL;
        const top = (this.y0 + r) * CELL;
        dry: for (let py = probe / 2; py < CELL; py += probe) {
          for (let px = probe / 2; px < CELL; px += probe) {
            if (!wet(left + px, top + py)) {
              solid[r * this.cols + c] = 1;
              break dry;
            }
          }
        }
      }
    }
    for (const building of buildings) {
      const prefab = layout.objects[building.object]?.prefab ?? '';
      if (building.district) {
        const door = paths.doorOf(building);
        if (door && !/Dock|Wall/.test(prefab)) {
          const list = this.doors.get(building.district) ?? [];
          list.push(door);
          this.doors.set(building.district, list);
        }
      }
      const facing = /Dock \d+ ([NESW])/.exec(prefab)?.[1] as Facing | undefined;
      if (!facing) continue;
      const dock = this.dockOf(building, facing, layout);
      if (dock) this.docks.push(dock);
      // A pier is not open water: nothing sails through one.
      for (let y = building.y; y < building.y + building.height; y += CELL / 2) {
        for (let x = building.x; x < building.x + building.width; x += CELL / 2) {
          const i = this.cellIndex({ x, y });
          if (i >= 0) solid[i] = 1;
        }
      }
    }
    this.clear = clearance(solid, this.cols, this.rows);
    /* A pier the island has grown round, its end over grass now rather than
       water, one with no room alongside it for a boat, or one no boat can get
       to from the open sea, is not a dock. */
    const usable = this.docks.filter((dock) => {
      if (!wet(dock.tip.x, dock.tip.y)) return false;
      const berth = this.berthFor(dock, 'row');
      return (
        !!berth &&
        this.clearAt(berth) >= 1 &&
        [0, 1, 2, 3].some((side) => !!this.route(this.edge(side).at, berth, 1))
      );
    });
    this.docks.splice(0, this.docks.length, ...usable);
    this.seed();
  }

  /** Every lantern on the water right now, for the night to light. */
  *lit(): IterableIterator<Lamp> {
    if (!this.night) return;
    for (const one of this.vessels) if (one.view.alpha > 0.3) yield one.lamp;
    for (const one of this.floaters) if (one.lamp && Math.sin(one.phase * 2.2) > 0.6) yield one.lamp;
  }

  /** Something was pushed: a sloop is loaded at that district's dock and sails. */
  depart(district: string): void {
    const fits = (one: Dock): boolean => !one.taken && !!this.berthFor(one, 'sloop');
    const dock =
      this.docks.find((one) => one.district === district && fits(one)) ?? this.docks.find(fits);
    const berth = dock && this.berthFor(dock, 'sloop');
    if (!dock || !berth) return;
    const vessel = this.make('sloop', berth, berth.heading);
    vessel.view.alpha = 0;
    this.moor(vessel, dock, performance.now(), 0);
    this.board(vessel, dock, 1 + Math.floor(Math.random() * 2));
  }

  tick(
    now: number,
    seconds: number,
    night: boolean,
    view: { x: number; y: number; width: number; height: number }
  ): void {
    this.night = night;
    this.view = view;
    const zoom = window.innerWidth / view.width;
    this.scale = Math.min(1.5, Math.max(1, 0.45 / zoom));
    this.traffic(seconds);
    const resort = now - this.sorted > 400;
    if (resort) this.sorted = now;
    for (let i = this.vessels.length - 1; i >= 0; i--) {
      const one = this.vessels[i]!;
      if (one.gone) {
        if (one.dock?.taken === one) one.dock.taken = null;
        one.view.destroy({ children: true });
        this.vessels.splice(i, 1);
        continue;
      }
      this.sail(one, now, seconds);
      if (!one.lane || resort) one.lane = this.relane(one.view, one.y, one.lane);
    }
    for (let i = this.walkers.length - 1; i >= 0; i--) {
      const one = this.walkers[i]!;
      if (one.gone) {
        one.view.destroy({ children: true });
        this.walkers.splice(i, 1);
        continue;
      }
      this.walk(one, now, seconds);
      if (!one.lane || resort) one.lane = this.relane(one.view, one.y, one.lane);
    }
    this.float(now, seconds, resort);
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i]!;
      ring.age += seconds;
      if (ring.age >= ring.life) {
        ring.sprite.destroy();
        this.rings.splice(i, 1);
        continue;
      }
      const t = ring.age / ring.life;
      const texture = folkTexture(`ring-${Math.min(3, Math.floor(t * 4))}`);
      if (texture) ring.sprite.texture = texture;
      ring.sprite.alpha = 0.55 * (1 - t);
    }
  }

  destroy(): void {
    for (const one of this.vessels) one.view.destroy({ children: true });
    for (const one of this.walkers) one.view.destroy({ children: true });
    for (const one of this.floaters) one.sprite.destroy();
    this.wakes.destroy({ children: true });
    this.vessels.length = 0;
    this.walkers.length = 0;
    this.floaters.length = 0;
    this.rings.length = 0;
  }

  /* ── the docks ─────────────────────────────────────────────────────── */

  /**
   * Where a pier runs, read off the box it is drawn in and which way it
   * faces: from the land end out to the tip, and the berth alongside the tip
   * on whichever side the picture shows, so a boat tied up there is seen.
   */
  private dockOf(building: Building, facing: Facing, layout: Layout): Dock | null {
    const object = layout.objects[building.object];
    if (!object) return null;
    const px = object.pos[0] * CELL;
    const { x, y, width, height } = building;
    let shore: Spot;
    let tip: Spot;
    if (facing === 'N') {
      shore = { x: px, y: y + height - 6 };
      tip = { x: px, y: y + 22 };
    } else if (facing === 'S') {
      shore = { x: px, y: y + 6 };
      tip = { x: px, y: y + height - 24 };
    } else if (facing === 'E') {
      const deck = y + height * 0.42;
      shore = { x: x + 4, y: deck };
      tip = { x: x + width - 26, y: deck };
    } else {
      const deck = y + height * 0.42;
      shore = { x: x + width - 4, y: deck };
      tip = { x: x + 26, y: deck };
    }
    const ashore = this.paths.walkableNear(shore, 8);
    if (!ashore) return null;
    return {
      district: building.district,
      facing,
      box: { x, y, width, height },
      shore: ashore,
      tip,
      taken: null,
    };
  }

  /**
   * Where a boat of this kind lies tied up at a pier, and which way: along
   * its side, bow out to sea, the side the picture shows, so the hull is seen
   * against the timber. Slid further out along the pier until the whole hull
   * is on water as it is drawn, or nowhere if it never is.
   */
  private berthFor(dock: Dock, kind: Kind): (Spot & { heading: number }) | null {
    const { box, tip, facing } = dock;
    const length = LENGTH[kind];
    const beam = BEAM[kind];
    for (let out = 0; out <= length * 1.5; out += 8) {
      let at: Spot & { heading: number };
      if (facing === 'N') {
        at = { x: box.x + box.width + beam / 2 + 2, y: tip.y + length / 2 - 10 - out, heading: -Math.PI / 2 };
      } else if (facing === 'S') {
        at = { x: box.x + box.width + beam / 2 + 2, y: tip.y - length / 2 + 10 + out, heading: Math.PI / 2 };
      } else if (facing === 'E') {
        at = { x: tip.x - length / 2 + 14 + out, y: box.y + box.height + beam / 2 + 1, heading: 0 };
      } else {
        at = { x: tip.x + length / 2 - 14 - out, y: box.y + box.height + beam / 2 + 1, heading: Math.PI };
      }
      if (this.afloat(at, at.heading, length, beam)) return at;
    }
    return null;
  }

  /** Whether a hull this long and broad, lying this way, is on water all round. */
  private afloat(at: Spot, heading: number, length: number, beam: number): boolean {
    const c = Math.cos(heading);
    const s = Math.sin(heading);
    for (let u = -length / 2; u <= length / 2; u += 6) {
      for (const v of [-beam / 2, 0, beam / 2]) {
        if (!this.wet(at.x + u * c - v * s, at.y + u * s + v * c)) return false;
      }
    }
    return true;
  }

  /* ── who is out ────────────────────────────────────────────────────── */

  /** The sea as it is the moment the island is drawn: already busy, not filling up. */
  private seed(): void {
    for (const kind of ['sloop', 'sloop', 'raft', 'ship'] as Kind[]) {
      const vessel = this.through(kind);
      if (!vessel) continue;
      const skip = Math.floor(vessel.path.length * (0.2 + Math.random() * 0.5));
      const at = vessel.path[skip];
      if (at) {
        vessel.path.splice(0, skip);
        vessel.x = at.x;
        vessel.y = at.y;
        vessel.view.alpha = 1;
      }
    }
    for (let i = 0; i < 2; i++) this.anchor(true);
    const free = this.docks.filter((one) => !one.taken);
    const tied = free[Math.floor(Math.random() * free.length)];
    const kind: Kind = Math.random() < 0.5 ? 'row' : 'sloop';
    const berth = tied && this.berthFor(tied, kind);
    if (tied && berth) {
      const vessel = this.make(kind, berth, berth.heading);
      vessel.view.alpha = 1;
      this.moor(vessel, tied, performance.now(), 0);
    }
    for (const dock of this.docks) {
      const berth = this.berthFor(dock, 'row');
      if (!berth) continue;
      for (const side of [-1, 1]) {
        const at = this.waterNear(
          {
            x: berth.x + side * 70 + (dock.facing === 'E' ? 80 : dock.facing === 'W' ? -80 : 0),
            y: berth.y + (dock.facing === 'N' ? -60 : 50),
          },
          2
        );
        if (at) this.floater('buoy', at);
      }
    }
    for (let i = 0; i < 2; i++) {
      const at = this.someWater(1, 2);
      if (at) for (let d = 0; d < 3; d++) this.floater('duck', { x: at.x + d * 10, y: at.y + (d % 2) * 6 });
    }
    for (let i = 0; i < 2; i++) {
      const at = this.someWater(3, 9);
      if (at) this.floater(Math.random() < 0.5 ? 'barrel' : 'drift', at);
    }
  }

  /** Keep the numbers up: a boat sets out every so often, fewer after dark. */
  private traffic(seconds: number): void {
    this.nextSail -= seconds;
    if (this.nextSail > 0) return;
    this.nextSail = this.night ? 14 + Math.random() * 16 : 6 + Math.random() * 10;
    const count = (kind: Kind): number => this.vessels.filter((one) => one.kind === kind).length;
    const scale = this.night ? 0.5 : 1;
    const want: [Kind, number][] = [
      ['sloop', Math.round(5 * scale)],
      ['row', this.docks.length ? Math.max(1, Math.round(2 * scale)) : 0],
      ['fisher', Math.round(2 * scale)],
      ['raft', 1],
      ['ship', Math.random() < 0.35 ? 1 : 0],
    ];
    const short = want.filter(([kind, n]) => count(kind) < n);
    const pick = short[Math.floor(Math.random() * short.length)];
    if (!pick) return;
    const [kind] = pick;
    if (kind === 'fisher') this.anchor(false);
    else if (kind === 'row') this.row();
    else if (kind === 'ship') this.through('ship');
    else if (Math.random() < 0.6 && this.docks.some((one) => !one.taken)) this.callAt(kind);
    else this.through(kind);
  }

  /** In from the open sea on one side and out on another, past the island. */
  private through(kind: Kind): Vessel | null {
    for (let tries = 0; tries < 6; tries++) {
      const from = this.edge(-1);
      const to = this.edge(from.side);
      // Past the island, close enough in to be seen from it, not round the rim of the sea.
      const by = this.someWater(CLEAR[kind] + 2, CLEAR[kind] + 6);
      if (!by) continue;
      const first = this.route(from.at, by, CLEAR[kind]);
      const second = first && this.route(by, to.at, CLEAR[kind]);
      if (!first || !second) continue;
      const path = [...first, ...second];
      const vessel = this.make(kind, from.at);
      vessel.path = path;
      vessel.outbound = true;
      return vessel;
    }
    return null;
  }

  /** In from the open sea to tie up at a dock. */
  private callAt(kind: Kind): void {
    const free = this.docks.filter((one) => !one.taken && !!this.berthFor(one, kind));
    const dock = free[Math.floor(Math.random() * free.length)];
    const berth = dock && this.berthFor(dock, kind);
    if (!dock || !berth) return;
    const from = this.edge(-1);
    const path = this.route(from.at, berth, CLEAR[kind]);
    if (!path) return;
    const vessel = this.make(kind, from.at);
    vessel.path = path;
    vessel.dock = dock;
    vessel.aboard = Math.floor(Math.random() * 3) + (kind === 'raft' ? 0 : 1);
    dock.taken = vessel;
  }

  /** A rowing boat pulls out from one dock for another, or in from the sea. */
  private row(): void {
    const free = this.docks.filter((one) => !one.taken);
    const to = free[Math.floor(Math.random() * free.length)];
    const end = to && this.berthFor(to, 'row');
    if (!to || !end) return;
    const others = this.docks.filter((one) => one !== to);
    const fromDock = others[Math.floor(Math.random() * others.length)];
    const leaving = fromDock ? this.berthFor(fromDock, 'row') : null;
    const start = leaving ?? this.edge(-1).at;
    const path = this.route(start, end, CLEAR.row);
    if (!path) return;
    const vessel = leaving ? this.make('row', start, leaving.heading) : this.make('row', start);
    vessel.path = path;
    vessel.dock = to;
    vessel.aboard = 1 + Math.floor(Math.random() * 2);
    to.taken = vessel;
  }

  /** A fisher rows out to a spot off the coast and drops anchor there. */
  private anchor(already: boolean): void {
    const spot = this.someWater(2, 5);
    if (!spot) return;
    if (already) {
      const vessel = this.make('fisher', spot);
      vessel.view.alpha = 1;
      vessel.state = 'anchored';
      vessel.waitUntil = performance.now() + 40_000 + Math.random() * 80_000;
      return;
    }
    const from = this.edge(-1);
    const path = this.route(from.at, spot, CLEAR.fisher);
    if (!path) return;
    const vessel = this.make('fisher', from.at);
    vessel.path = path;
  }

  /* ── one boat ──────────────────────────────────────────────────────── */

  private make(kind: Kind, at: Spot, heading = Math.random() * Math.PI * 2): Vessel {
    const view = new Container();
    const body = new Sprite();
    view.addChild(body);
    view.position.set(Math.round(at.x), Math.round(at.y));
    view.alpha = 0;
    const vessel: Vessel = {
      kind,
      view,
      body,
      shown: '',
      x: at.x,
      y: at.y,
      path: [],
      heading,
      frame: 0,
      frameAt: 0,
      state: 'sailing',
      dock: null,
      outbound: false,
      waitUntil: 0,
      giveUp: 0,
      aboard: 0,
      boarding: 0,
      ringAt: 0,
      lamp: { x: at.x, y: at.y, lamp: true },
      gone: false,
      lane: null,
    };
    this.vessels.push(vessel);
    return vessel;
  }

  private sail(one: Vessel, now: number, seconds: number): void {
    const moving = one.state === 'sailing' && one.path.length > 0;
    if (moving) {
      const next = one.path[0]!;
      const dx = next.x - one.x;
      const dy = next.y - one.y;
      const far = Math.hypot(dx, dy);
      // Slowing in to a berth, rather than hitting the pier at full sail.
      const berthing = one.dock && one.path.length === 1 ? Math.min(1, 0.45 + far / 90) : 1;
      const go = SPEED[one.kind] * seconds * berthing;
      if (far <= go) {
        one.x = next.x;
        one.y = next.y;
        one.path.shift();
      } else {
        one.x += (dx / far) * go;
        one.y += (dy / far) * go;
      }
      if (far > 1) this.steer(one, Math.atan2(dy, dx), seconds);
      if (now - one.ringAt > (one.kind === 'ship' ? 260 : 380)) {
        one.ringAt = now;
        const stern = (LENGTH[one.kind] * one.view.scale.y) / 2;
        this.ring(
          one.x - Math.cos(one.heading) * stern,
          one.y - Math.sin(one.heading) * stern,
          one.kind === 'ship' ? 2.5 : 1.6
        );
      }
      if (!one.path.length) this.arrive(one, now);
    } else if (one.state === 'moored') {
      const berth = one.dock && this.berthFor(one.dock, one.kind);
      if (berth) this.steer(one, berth.heading, seconds);
      this.tied(one, now, seconds);
    } else if (one.state === 'anchored' && now > one.waitUntil) {
      const to = this.edge(-1);
      one.path = this.route(one, to.at, CLEAR[one.kind]) ?? [to.at];
      one.outbound = true;
      one.state = 'sailing';
    }

    // In and out of sight at the edge of the sea, rather than appearing.
    const left = one.outbound ? this.remaining(one) : Infinity;
    const want = left < 160 ? left / 160 : 1;
    if (one.view.alpha < want) one.view.alpha = Math.min(want, one.view.alpha + seconds * 0.5);
    else one.view.alpha = want;
    if (one.outbound && !one.path.length) one.gone = true;

    const [frames, hold] = FRAMES[one.kind];
    if (now - one.frameAt > hold) {
      one.frameAt = now;
      one.frame++;
    }
    const still = !moving && one.kind === 'row';
    const turn = (Math.PI * 2) / HEADINGS;
    const facing = (((Math.round(one.heading / turn) % HEADINGS) + HEADINGS) % HEADINGS) as number;
    const name = `${one.kind}-${facing}-${still ? 0 : one.frame % frames}`;
    if (name !== one.shown) {
      const texture = folkTexture(name);
      if (texture) {
        one.body.texture = texture;
        one.body.anchor.copyFrom(texture.defaultAnchor ?? { x: 0.5, y: 1 });
        one.shown = name;
      }
    }
    // Grown as the camera rises so it still reads, and itself again near a pier.
    const nearDock = one.dock ? Math.hypot(one.dock.tip.x - one.x, one.dock.tip.y - one.y) : 1e9;
    const grow = Math.min(1, Math.max(0, (nearDock - 120) / 300));
    const size = 1 + (this.scale - 1) * grow;
    one.view.scale.set(size);
    const bob = Math.round(Math.sin(now / 900 + one.x) * 0.6);
    one.view.position.set(Math.round(one.x), Math.round(one.y) + bob);
    const [lu, lw] = LANTERN[one.kind];
    one.lamp.x = one.x + Math.cos(one.heading) * lu * size;
    one.lamp.y = one.y + Math.sin(one.heading) * lu * size - lw * size;
  }

  /** Come about towards a heading, no faster than this boat can. */
  private steer(one: Vessel, aim: number, seconds: number): void {
    let delta = aim - one.heading;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    const most = TURN[one.kind] * seconds;
    one.heading += Math.max(-most, Math.min(most, delta));
  }

  /** How far a boat still has to go along its path. */
  private remaining(one: Vessel): number {
    let total = 0;
    let at: Spot = one;
    for (const next of one.path) {
      total += Math.hypot(next.x - at.x, next.y - at.y);
      at = next;
      if (total > 200) break;
    }
    return total;
  }

  private arrive(one: Vessel, now: number): void {
    if (one.outbound) return;
    if (one.dock) {
      this.moor(one, one.dock, now, one.aboard);
      return;
    }
    one.state = 'anchored';
    one.waitUntil = now + 40_000 + Math.random() * 80_000;
  }

  /** Tied up: whoever was aboard gets off, and townsfolk come down to board. */
  private moor(one: Vessel, dock: Dock, now: number, aboard: number): void {
    one.state = 'moored';
    one.dock = dock;
    dock.taken = one;
    const berth = this.berthFor(dock, one.kind);
    if (berth) {
      one.x = berth.x;
      one.y = berth.y;
    }
    one.aboard = aboard;
    one.waitUntil = now + 14_000 + Math.random() * 20_000;
    one.giveUp = one.waitUntil + 60_000;
    const boarders = this.night ? 0 : Math.floor(Math.random() * 3);
    if (boarders) this.board(one, dock, boarders);
  }

  /** Townsfolk leave their doors for the pier and the boat tied up at it. */
  private board(one: Vessel, dock: Dock, count: number): void {
    const doors = this.doors.get(dock.district) ?? [];
    for (let i = 0; i < count; i++) {
      const door = doors[Math.floor(Math.random() * doors.length)];
      if (!door || !this.paths.sameLevel(door, dock.shore)) continue;
      const ashore = this.paths.route(door, dock.shore, 6000);
      if (!ashore) continue;
      const walker = this.walker(door, [...ashore, ...pier(dock.shore, dock.tip)]);
      walker.boards = one;
      walker.frameAt = performance.now() + i * 1500;
      one.boarding++;
    }
  }

  private tied(one: Vessel, now: number, seconds: number): void {
    const dock = one.dock!;
    if (one.aboard > 0 && Math.random() < seconds * 0.7) {
      one.aboard--;
      const walker = this.walker(dock.tip, pier(dock.tip, dock.shore));
      const doors = (this.doors.get(dock.district) ?? []).filter((door) =>
        this.paths.sameLevel(door, dock.shore)
      );
      const door = doors[Math.floor(Math.random() * doors.length)];
      const inland = door ? this.paths.route(dock.shore, door, 6000) : null;
      if (inland) walker.path.push(...inland);
    }
    const ready = one.aboard === 0 && one.boarding === 0;
    if (!(ready && now > one.waitUntil) && now < one.giveUp) return;
    const leave = this.edge(-1);
    one.path = this.route(one, leave.at, CLEAR[one.kind]) ?? [leave.at];
    one.outbound = true;
    one.state = 'sailing';
    dock.taken = null;
    one.dock = null;
  }

  /* ── people on the piers ───────────────────────────────────────────── */

  private walker(at: Spot, path: Spot[]): Walker {
    const view = new Container();
    const shade = new Sprite(folkTexture('shadow'));
    shade.anchor.set(0.5, 0.7);
    shade.blendMode = 'multiply';
    shade.tint = SHADOW_TINT;
    const body = new Sprite();
    body.anchor.set(0.5, 1);
    view.addChild(shade, body);
    view.alpha = 0;
    view.position.set(Math.round(at.x), Math.round(at.y));
    const walker: Walker = {
      look: `town-${TOWNSFOLK[Math.floor(Math.random() * TOWNSFOLK.length)]}-`,
      view,
      body,
      x: at.x,
      y: at.y,
      path,
      dir: 'down',
      flip: false,
      frame: 0,
      frameAt: 0,
      fading: false,
      boards: null,
      gone: false,
      lane: null,
    };
    this.walkers.push(walker);
    return walker;
  }

  private walk(one: Walker, now: number, seconds: number): void {
    // Waiting their turn at the door before setting out.
    if (now < one.frameAt - 200) return;
    if (one.fading) {
      one.view.alpha -= seconds * 2.5;
      if (one.view.alpha <= 0) {
        one.gone = true;
        const boat = one.boards;
        if (boat) boat.boarding = Math.max(0, boat.boarding - 1);
      }
      return;
    }
    if (one.view.alpha < 1) one.view.alpha = Math.min(1, one.view.alpha + seconds * 2);
    const next = one.path[0];
    if (!next) {
      one.fading = true;
      return;
    }
    const dx = next.x - one.x;
    const dy = next.y - one.y;
    const far = Math.hypot(dx, dy);
    const go = STROLL * seconds;
    if (far <= go) {
      one.x = next.x;
      one.y = next.y;
      one.path.shift();
    } else {
      one.x += (dx / far) * go;
      one.y += (dy / far) * go;
    }
    if (Math.abs(dx) > Math.abs(dy) * 1.2) {
      one.dir = 'side';
      one.flip = dx < 0;
    } else if (Math.abs(dy) > 0.01) {
      one.dir = dy < 0 ? 'up' : 'down';
    }
    if (now - one.frameAt > 160) {
      one.frameAt = now;
      one.frame++;
      const texture: Texture | undefined =
        folkTexture(`${one.look}walk-${one.dir}-${one.frame % 4}`) ?? folkTexture('front-0');
      if (texture) one.body.texture = texture;
      one.body.scale.x = one.dir === 'side' && one.flip ? -1 : 1;
    }
    one.view.position.set(Math.round(one.x), Math.round(one.y));
  }

  /* ── what floats ───────────────────────────────────────────────────── */

  private floater(kind: Floater['kind'], at: Spot): void {
    const sprite = new Sprite(folkTexture(kind === 'duck' ? 'duck-swim-0' : `${kind}-0`));
    sprite.anchor.set(0.5, 1);
    sprite.position.set(Math.round(at.x), Math.round(at.y));
    const drifting = kind === 'barrel' || kind === 'drift';
    const angle = Math.random() * Math.PI * 2;
    this.floaters.push({
      kind,
      sprite,
      x: at.x,
      y: at.y,
      vx: drifting ? Math.cos(angle) * 2.5 : 0,
      vy: drifting ? Math.sin(angle) * 1.5 : 0,
      phase: Math.random() * 10,
      life: drifting ? 90 + Math.random() * 60 : Infinity,
      target: null,
      lamp: kind === 'buoy' ? { x: at.x, y: at.y - 9, lamp: true } : null,
      ringAt: 0,
      lane: null,
    });
    sprite.alpha = drifting ? 0 : 1;
    sprite.scale.x = Math.random() < 0.5 ? -1 : 1;
  }

  private float(now: number, seconds: number, resort: boolean): void {
    this.nextFloat -= seconds;
    if (this.nextFloat <= 0) {
      this.nextFloat = 20 + Math.random() * 30;
      const drifting = this.floaters.filter((one) => one.kind === 'barrel' || one.kind === 'drift');
      if (drifting.length < 3) {
        const at = this.someWater(3, 9);
        if (at) this.floater(Math.random() < 0.5 ? 'barrel' : 'drift', at);
      }
    }
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const one = this.floaters[i]!;
      one.phase += seconds;
      one.life -= seconds;
      if (one.kind === 'duck') this.paddle(one, now, seconds);
      else if (one.vx || one.vy) {
        const nx = one.x + one.vx * seconds;
        const ny = one.y + one.vy * seconds;
        if (this.clearAt({ x: nx, y: ny }) >= 2) {
          one.x = nx;
          one.y = ny;
        } else {
          one.vx = -one.vx;
          one.vy = -one.vy;
        }
        one.sprite.alpha =
          one.life < 4 ? Math.max(0, one.life / 4) : Math.min(1, one.sprite.alpha + seconds * 0.3);
        if (one.life <= 0) {
          one.sprite.destroy();
          this.floaters.splice(i, 1);
          continue;
        }
      }
      const frame = Math.floor(one.phase / (one.kind === 'buoy' ? 1.1 : 1.6)) % 2;
      const name = one.kind === 'duck' ? `duck-swim-${frame}` : `${one.kind}-${frame}`;
      const texture = folkTexture(name);
      if (texture) one.sprite.texture = texture;
      const bob = Math.round(Math.sin(one.phase * 1.7) * 0.6);
      one.sprite.position.set(Math.round(one.x), Math.round(one.y) + bob);
      if (one.lamp) {
        one.lamp.x = one.x;
        one.lamp.y = one.y - 9;
      }
      if (!one.lane || resort) one.lane = this.relane(one.sprite, one.y, one.lane);
    }
  }

  /** Ducks paddle along the shore a little way at a time, leaving rings. */
  private paddle(one: Floater, now: number, seconds: number): void {
    if (!one.target || Math.random() < 0.002) {
      const spot = { x: one.x + (Math.random() * 2 - 1) * 60, y: one.y + (Math.random() * 2 - 1) * 30 };
      const clear = this.clearAt(spot);
      one.target = clear >= 1 && clear <= 3 ? spot : null;
      return;
    }
    const dx = one.target.x - one.x;
    const dy = one.target.y - one.y;
    const far = Math.hypot(dx, dy);
    if (far < 1) {
      if (Math.random() < 0.01) one.target = null;
      return;
    }
    const go = 4 * seconds;
    one.x += (dx / far) * Math.min(go, far);
    one.y += (dy / far) * Math.min(go, far);
    if (Math.abs(dx) > 1) one.sprite.scale.x = dx < 0 ? -1 : 1;
    if (now - one.ringAt > 900) {
      one.ringAt = now;
      this.ring(one.x - Math.sign(dx) * 4, one.y - 1);
    }
  }

  private ring(x: number, y: number, size = 1): void {
    if (this.rings.length > 80) return;
    const v = this.view;
    if (x < v.x - 40 || x > v.x + v.width + 40 || y < v.y - 40 || y > v.y + v.height + 40) return;
    const sprite = new Sprite(folkTexture('ring-0'));
    sprite.anchor.set(0.5);
    sprite.position.set(Math.round(x), Math.round(y));
    sprite.scale.set(size);
    this.wakes.addChild(sprite);
    this.rings.push({ sprite, age: 0, life: 1.6 });
  }

  private relane(view: Container, y: number, was: Container | null): Container {
    const lane = this.laneAt(y);
    if (lane !== was) lane.addChild(view);
    return lane;
  }

  /* ── the sea's grid ────────────────────────────────────────────────── */

  private cellIndex(spot: Spot): number {
    const c = Math.floor(spot.x / CELL) - this.x0;
    const r = Math.floor(spot.y / CELL) - this.y0;
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return -1;
    return r * this.cols + c;
  }

  /** Cells of water between a spot and the coast; past the grid it is open sea. */
  private clearAt(spot: Spot): number {
    const i = this.cellIndex(spot);
    return i < 0 ? 255 : (this.clear[i] ?? 0);
  }

  private centre(i: number): Spot {
    return {
      x: (this.x0 + (i % this.cols)) * CELL + CELL / 2,
      y: (this.y0 + Math.floor(i / this.cols)) * CELL + CELL / 2,
    };
  }

  /** A point on the open sea at the edge of the grid, on a side other than `not`. */
  private edge(not: number): { at: Spot; side: number } {
    let last = { at: { x: 0, y: 0 }, side: 0 };
    for (let tries = 0; tries < 20; tries++) {
      let side = Math.floor(Math.random() * 4);
      if (side === not) side = (side + 1 + Math.floor(Math.random() * 3)) % 4;
      const t = 0.1 + Math.random() * 0.8;
      const left = (this.x0 + 1) * CELL;
      const top = (this.y0 + 1) * CELL;
      const right = (this.x0 + this.cols - 1) * CELL;
      const bottom = (this.y0 + this.rows - 1) * CELL;
      const at =
        side === 0
          ? { x: left + (right - left) * t, y: top }
          : side === 1
            ? { x: right, y: top + (bottom - top) * t }
            : side === 2
              ? { x: left + (right - left) * t, y: bottom }
              : { x: left, y: top + (bottom - top) * t };
      last = { at, side };
      // Something moored out past the island can stand on the edge itself.
      if (this.clearAt(at) >= 6) break;
    }
    return last;
  }

  /** Somewhere on the water with between `low` and `high` cells of it to the coast. */
  private someWater(low: number, high: number): Spot | null {
    for (let tries = 0; tries < 400; tries++) {
      const i = Math.floor(Math.random() * this.clear.length);
      const clear = this.clear[i] ?? 0;
      if (clear >= low && clear <= high) {
        const at = this.centre(i);
        return { x: at.x + (Math.random() - 0.5) * CELL * 0.6, y: at.y + (Math.random() - 0.5) * CELL * 0.6 };
      }
    }
    return null;
  }

  private waterNear(spot: Spot, low: number): Spot | null {
    for (let r = 0; r < 4; r++) {
      for (let tries = 0; tries < 8; tries++) {
        const at = {
          x: spot.x + (Math.random() * 2 - 1) * r * CELL,
          y: spot.y + (Math.random() * 2 - 1) * r * CELL,
        };
        if (this.clearAt(at) >= low) return at;
      }
    }
    return null;
  }

  /**
   * The way across the water from one spot to another, as world points, or
   * null. A* on the sea's grid, keeping `keep` cells off the coast except
   * right at either end, where a berth or an anchorage is close in by
   * nature, and then pulled straight wherever there is water enough.
   */
  private route(from: Spot, to: Spot, keep: number): Spot[] | null {
    const start = this.cellIndex(from);
    const goal = this.cellIndex(to);
    if (start < 0 || goal < 0) return null;
    const cols = this.cols;
    const ends = [this.centre(start), this.centre(goal)];
    const nearEnd = (i: number): boolean => {
      const at = this.centre(i);
      return ends.some((end) => Math.hypot(end.x - at.x, end.y - at.y) < (keep + 2.5) * CELL);
    };
    const ok = (i: number): boolean => {
      const clear = this.clear[i] ?? 0;
      return clear >= keep || (clear >= 1 && nearEnd(i));
    };
    const gx = goal % cols;
    const gy = Math.floor(goal / cols);
    const cost = new Float32Array(this.clear.length).fill(Infinity);
    const came = new Int32Array(this.clear.length).fill(-1);
    const open = new MinHeap();
    cost[start] = 0;
    open.push(start, 0);
    let seen = 0;
    while (open.size) {
      const i = open.pop();
      if (i === goal) break;
      if (++seen > 40_000) return null;
      const x = i % cols;
      const y = Math.floor(i / cols);
      for (const [dx, dy] of EIGHT) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= this.rows) continue;
        const n = ny * cols + nx;
        if (!ok(n) && n !== goal) continue;
        if (dx && dy && (!ok(y * cols + nx) || !ok(ny * cols + x))) continue;
        const clear = this.clear[n] ?? 0;
        // Out where the water is open rather than hugging the coast.
        const step = (dx && dy ? 1.414 : 1) * (1 + Math.max(0, keep + 3 - clear) * 0.25);
        const total = (cost[i] ?? 0) + step;
        if (total >= (cost[n] ?? Infinity)) continue;
        cost[n] = total;
        came[n] = i;
        open.push(n, total + Math.hypot(gx - nx, gy - ny));
      }
    }
    if (came[goal] === -1 && goal !== start) return null;
    const cells: number[] = [];
    for (let at = goal; at !== -1 && at !== start; at = came[at] ?? -1) cells.push(at);
    cells.push(start);
    cells.reverse();
    const points = cells.map((i) => this.centre(i));
    points[0] = { x: from.x, y: from.y };
    points[points.length - 1] = { x: to.x, y: to.y };
    // Pulled straight: from each point, as far ahead as the water allows.
    const out: Spot[] = [];
    let at = 0;
    while (at < points.length - 1) {
      let far = at + 1;
      for (let j = points.length - 1; j > at + 1; j--) {
        if (this.open(points[at]!, points[j]!, keep, nearEnd)) {
          far = j;
          break;
        }
      }
      out.push(points[far]!);
      at = far;
    }
    return out;
  }

  private open(a: Spot, b: Spot, keep: number, nearEnd: (i: number) => boolean): boolean {
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.ceil(length / (CELL / 3));
    for (let s = 1; s < steps; s++) {
      const at = { x: a.x + ((b.x - a.x) * s) / steps, y: a.y + ((b.y - a.y) * s) / steps };
      const i = this.cellIndex(at);
      if (i < 0) continue;
      const clear = this.clear[i] ?? 0;
      if (clear < keep && !(clear >= 1 && nearEnd(i))) return false;
    }
    return true;
  }
}

/** The steps along a pier, a few pixels apart so the walk is even. */
function pier(from: Spot, to: Spot): Spot[] {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(length / 8));
  const out: Spot[] = [];
  for (let s = 1; s <= steps; s++) {
    out.push({ x: from.x + ((to.x - from.x) * s) / steps, y: from.y + ((to.y - from.y) * s) / steps });
  }
  return out;
}

const EIGHT = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
] as const;

/** Cells to the nearest solid one, eight ways, capped at 255; solid is nought. */
function clearance(solid: Uint8Array, cols: number, rows: number): Uint8Array {
  const out = new Uint8Array(solid.length).fill(255);
  const queue: number[] = [];
  for (let i = 0; i < solid.length; i++) {
    if (solid[i]) {
      out[i] = 0;
      queue.push(i);
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head]!;
    const x = i % cols;
    const y = Math.floor(i / cols);
    const d = out[i]!;
    for (const [dx, dy] of EIGHT) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const n = ny * cols + nx;
      if (out[n]! > d + 1) {
        out[n] = d + 1;
        queue.push(n);
      }
    }
  }
  return out;
}

class MinHeap {
  private readonly keys: number[] = [];
  private readonly scores: number[] = [];

  get size(): number {
    return this.keys.length;
  }

  push(key: number, score: number): void {
    const keys = this.keys;
    const scores = this.scores;
    keys.push(key);
    scores.push(score);
    let i = keys.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (scores[parent]! <= score) break;
      keys[i] = keys[parent]!;
      scores[i] = scores[parent]!;
      i = parent;
    }
    keys[i] = key;
    scores[i] = score;
  }

  pop(): number {
    const keys = this.keys;
    const scores = this.scores;
    const top = keys[0]!;
    const lastKey = keys.pop()!;
    const lastScore = scores.pop()!;
    if (keys.length) {
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        let best = lastScore;
        if (l < keys.length && scores[l]! < best) {
          m = l;
          best = scores[l]!;
        }
        if (r < keys.length && scores[r]! < best) m = r;
        if (m === i) break;
        keys[i] = keys[m]!;
        scores[i] = scores[m]!;
        i = m;
      }
      keys[i] = lastKey;
      scores[i] = lastScore;
    }
    return top;
  }
}
