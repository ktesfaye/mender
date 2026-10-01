import { CELL, type District, type Layout } from '@mender/village';
import { Container, Sprite, type Texture } from 'pixi.js';
import { folkTexture, type Look } from './folk';
import { SHADOW_TINT, type Building } from './scene';

/**
 * The people on the island, walking.
 *
 * Every open session is somebody, and every helper a session has sent out is
 * somebody else, in a hood, walking from that session's door. Nobody else
 * lives here: an island with no sessions open has nobody on it but the fire.
 *
 * What they do is what the session is doing, the same handful of states its
 * lantern on the rail shows, said with a body instead of a light. Somebody
 * working is busy, back and forth on their own patch at a working pace. Asking
 * for you, or with something finished you have not seen, they go and stand at
 * their door facing you and wait. Broken, they stand at the door and do not
 * move. Idle, they amble, and after dark they wander up to the fire and sit
 * round it if they can get there. A helper walks further and quicker, and when
 * it comes back it walks home to its session's door and is gone.
 *
 * Where anybody can walk is worked out from the ground once: the art's own top
 * surfaces, grass and path, never a cliff face, never through a house, and
 * only ever on the level they started on, since the island has cliffs and
 * nobody here climbs them. Paths through it are found with A*, preferring the
 * artist's own paths, so people keep to the roads he drew rather than cutting
 * across the crops.
 *
 * Moving costs nothing it does not have to. A walker that has arrived and is
 * standing is a sprite swapping between two frames now and then; the whole
 * crowd is a few dozen sprites; and a path is found once per walk, never per
 * frame.
 */

/** The grid people walk on, in world pixels: half a cell, so a house's corner
    can be walked round rather than through. */
const STEP = CELL / 2;
/** World pixels a second. */
const PACE: Record<string, number> = { amble: 13, work: 22, errand: 30, home: 26 };

type Dir = 'down' | 'up' | 'side';

interface Plan {
  kind: 'amble' | 'work' | 'errand' | 'home';
  /** Where they are going, cell by cell, in world pixels. */
  path: { x: number; y: number }[];
}

export interface Walking {
  /** A session, or a session's helper. */
  id: string;
  look: Look;
  /** The building it lives in, or nothing when it has no house of its own. */
  building: Building | null;
  district: District | null;
  helper: boolean;
}

export class Walker {
  readonly view = new Container();
  private readonly body = new Sprite();
  private readonly shade = new Sprite();
  x = 0;
  y = 0;
  private dir: Dir = 'down';
  private flip = false;
  private plan: Plan | null = null;
  private waitUntil = 0;
  private frameAt = 0;
  private frame = 0;
  private sitting = false;
  /** Set when it has been told to go: it walks home first, then is gone. */
  leaving = false;
  gone = false;
  lane: Container | null = null;

  constructor(
    public who: Walking,
    from: { x: number; y: number }
  ) {
    const shadow = folkTexture('shadow');
    if (shadow) this.shade.texture = shadow;
    this.shade.anchor.set(0.5, 0.7);
    this.shade.blendMode = 'multiply';
    this.shade.tint = SHADOW_TINT;
    this.body.anchor.set(0.5, 1);
    this.view.addChild(this.shade, this.body);
    this.x = from.x;
    this.y = from.y;
    this.view.position.set(Math.round(this.x), Math.round(this.y));
  }

  /** The session changed what it is doing: stop and think again. */
  replan(): void {
    this.plan = null;
    this.waitUntil = 0;
  }

  /** What it is doing now, in a world that has these rules. */
  step(now: number, seconds: number, world: Paths, night: boolean, fire: Spot | null): boolean {
    let moved = false;
    const plan = this.plan;
    if (plan && plan.path.length) {
      const next = plan.path[0]!;
      const dx = next.x - this.x;
      const dy = next.y - this.y;
      const far = Math.hypot(dx, dy);
      const go = PACE[plan.kind]! * seconds;
      if (far <= go) {
        this.x = next.x;
        this.y = next.y;
        plan.path.shift();
      } else {
        this.x += (dx / far) * go;
        this.y += (dy / far) * go;
      }
      if (Math.abs(dx) > Math.abs(dy) * 1.2) {
        this.dir = 'side';
        this.flip = dx < 0;
      } else {
        this.dir = dy < 0 ? 'up' : 'down';
      }
      moved = true;
      if (!plan.path.length) {
        this.plan = null;
        this.arrived(now, plan.kind);
      }
    } else if (now >= this.waitUntil) {
      this.decide(now, world, night, fire);
    }
    const walking = !!this.plan?.path.length;
    const pace = walking ? 150 : this.who.look === 'working' ? 500 : 900;
    if (now - this.frameAt > pace) {
      this.frameAt = now;
      this.frame = (this.frame + 1) % (walking ? 4 : 2);
      moved = true;
    }
    if (moved) this.draw(walking);
    return moved;
  }

  /** Where it should be standing for what the session is doing. */
  private decide(now: number, world: Paths, night: boolean, fire: Spot | null): void {
    const look = this.who.look;
    const home = this.home(world);
    this.sitting = false;
    if (this.leaving) {
      if (home && Math.hypot(home.x - this.x, home.y - this.y) > 4) {
        this.go('home', home, world);
        if (this.plan) return;
      }
      this.gone = true;
      return;
    }
    if (this.who.helper) {
      // Helpers range: anywhere on their level, and quickly.
      const there = world.somewhere(this, 14 * CELL);
      if (there) this.go('errand', there, world);
      this.waitUntil = now + 600 + Math.random() * 2200;
      return;
    }
    if (look === 'wants' || look === 'done' || look === 'broken' || look === 'waiting') {
      if (home && Math.hypot(home.x - this.x, home.y - this.y) > 3) {
        this.go('home', home, world);
        if (this.plan) return;
      }
      this.dir = 'down';
      this.waitUntil = now + 1500;
      return;
    }
    if (look === 'arriving') {
      if (home) this.go('home', home, world);
      this.waitUntil = now + 800;
      return;
    }
    if (look === 'working') {
      // Busy: short trips about its own place and back to the door.
      const there =
        Math.random() < 0.35 && home ? home : world.near(this, this.who.district, 6 * CELL);
      if (there) this.go('work', there, world);
      this.waitUntil = now + 900 + Math.random() * 2600;
      return;
    }
    // Idle. After dark, to the fire if it can be reached.
    if (night && fire) {
      const seat = world.seatAt(fire, this.who.id);
      if (seat && Math.hypot(seat.x - this.x, seat.y - this.y) > 3) {
        this.go('amble', seat, world);
        if (this.plan) return;
      }
      if (seat && Math.hypot(seat.x - this.x, seat.y - this.y) <= 3) {
        this.sitting = true;
        this.dir = 'down';
        this.waitUntil = now + 4000;
        this.draw(false);
        return;
      }
    }
    const there = world.near(this, this.who.district, 8 * CELL);
    if (there) this.go('amble', there, world);
    this.waitUntil = now + 3000 + Math.random() * 7000;
  }

  private arrived(now: number, kind: Plan['kind']): void {
    const look = this.who.look;
    if (kind === 'home' && (look === 'wants' || look === 'done' || look === 'broken')) {
      this.dir = 'down';
    }
    this.waitUntil = Math.max(this.waitUntil, now + (kind === 'errand' ? 400 : 700));
  }

  private home(world: Paths): Spot | null {
    const building = this.who.building;
    if (building) return world.doorOf(building);
    return null;
  }

  private go(kind: Plan['kind'], to: Spot, world: Paths): void {
    const path = world.route(this, to);
    this.plan = path?.length ? { kind, path } : null;
  }

  private draw(walking: boolean): void {
    const prefix = this.who.helper ? 'helper-' : '';
    let name: string;
    if (this.sitting) name = `${prefix}sit-${this.frame % 2}`;
    else if (walking) name = `${prefix}walk-${this.dir}-${this.frame % 4}`;
    else {
      const look = this.who.look;
      // Busy is turned away; anything else that has stopped is turned to you.
      const standing: Dir = look === 'working' && this.dir === 'up' ? 'up' : this.dir;
      const facing = standing === 'up' ? 'back' : standing === 'side' ? 'side' : 'front';
      name = `${prefix}${facing}-${this.frame % 2}`;
    }
    const texture: Texture | undefined = folkTexture(name) ?? folkTexture(`${prefix}front-0`);
    if (texture) this.body.texture = texture;
    this.body.scale.x = this.dir === 'side' && this.flip ? -1 : 1;
    // Broken is greyed: somebody standing very still in the wrong colour.
    this.body.tint = this.who.look === 'broken' ? 0x9a8f8a : 0xffffff;
    this.view.position.set(Math.round(this.x), Math.round(this.y));
  }
}

export type Spot = { x: number; y: number };

/**
 * Where anybody can walk, and the ways between.
 */
export class Paths {
  /** Each walkable step of the grid, keyed `x,y`, valued by its level. */
  private readonly ground = new Map<string, number>();
  /** The artist's paths: walking these costs less, so people keep to them. */
  private readonly roads = new Set<string>();
  private readonly doors = new Map<Building, Spot>();

  constructor(layout: Layout, buildings: readonly Building[]) {
    /* What is on top in each cell: the highest ground layer that drew there,
       and whether it drew grass or path or something else — a cliff face, a
       ledge — that nobody stands on. */
    const top = new Map<string, { order: number; file: string; dirt: boolean }>();
    for (const tile of layout.tiles) {
      if (!tile.file || tile.blend === 'multiply') continue;
      const key = `${tile.cell[0]},${tile.cell[1]}`;
      const had = top.get(key);
      if (had && had.order > tile.sorting_order) continue;
      top.set(key, {
        order: tile.sorting_order,
        file: tile.file,
        dirt: tile.layer === 'Dirt' || /Dirt/.test(tile.file),
      });
    }
    const blocked = buildings.map((building) => ({
      left: building.x + 3,
      right: building.x + building.width - 3,
      /* The whole of it, roof and all: ground behind a roof is ground nobody
         looking at the island can see, and a villager walking there has
         simply vanished. */
      top: building.y + 2,
      bottom: building.y + building.height - 2,
    }));
    /* What stands on the ground and is not walked through: crops, fences,
       rocks, barrels, the foot of every tree. A crop is a whole cell of
       field; anything else is the step its foot stands on. Grass tufts and
       flowers are walked over. */
    const solid = new Set<string>();
    for (const object of layout.objects) {
      if (object.group !== 'Props' && object.group !== 'Plant' && object.group !== 'Building')
        continue;
      if (/Grass|Flower|Bush|Water/.test(object.prefab)) continue;
      const x = object.pos[0] * CELL;
      const y = -object.pos[1] * CELL;
      if (/Wheat|Carrot|Cabbage|Pumpkin|Crop/.test(object.prefab)) {
        for (const dx of [-STEP, 0, STEP]) {
          for (const dy of [-STEP, 0]) solid.add(keyOf(x + dx, y + dy));
        }
        continue;
      }
      solid.add(keyOf(x, y - 2));
    }
    for (const [key, cell] of top) {
      if (!/Grass|Dirt/.test(cell.file)) continue;
      const [cx, cy] = key.split(',').map(Number) as [number, number];
      for (let sx = 0; sx < 2; sx++) {
        for (let sy = 0; sy < 2; sy++) {
          const x = cx * CELL + sx * STEP + STEP / 2;
          const y = -(cy + 1) * CELL + sy * STEP + STEP / 2;
          if (blocked.some((b) => x > b.left && x < b.right && y > b.top && y < b.bottom)) continue;
          const at = `${Math.floor(x / STEP)},${Math.floor(y / STEP)}`;
          if (solid.has(at)) continue;
          this.ground.set(at, cell.order);
          if (cell.dirt) this.roads.add(at);
        }
      }
    }
    for (const building of buildings) {
      const door = {
        x: Math.round(building.doorX),
        y: Math.round(building.y + building.height + 6),
      };
      this.doors.set(building, this.nearestWalkable(door, 4) ?? door);
    }
  }

  doorOf(building: Building): Spot | null {
    return this.doors.get(building) ?? null;
  }

  /** Where somebody coming in first stands: by the fire, or at their door. */
  start(fire: Spot | null, building: Building | null): Spot {
    const at = (fire && this.nearestWalkable({ x: fire.x, y: fire.y + 24 }, 6)) ??
      (building && this.doorOf(building)) ?? { x: 0, y: 0 };
    return at;
  }

  /** A place round the fire for this one, always the same one. */
  seatAt(fire: Spot, id: string): Spot | null {
    const turn = (hashOf(id) % 997) / 997;
    const angle = Math.PI * (0.1 + 0.8 * turn) + (turn > 0.5 ? Math.PI : 0);
    const want = { x: fire.x + Math.cos(angle) * 30, y: fire.y + Math.sin(angle) * 18 + 6 };
    return this.nearestWalkable(want, 3);
  }

  /** Somewhere walkable within reach, on the walker's own level. */
  near(walker: Spot, district: District | null, reach: number): Spot | null {
    const level = this.levelAt(walker);
    const owned = district ? cellsOf(district) : null;
    for (let tries = 0; tries < 24; tries++) {
      const x = walker.x + (Math.random() * 2 - 1) * reach;
      const y = walker.y + (Math.random() * 2 - 1) * reach * 0.7;
      const key = keyOf(x, y);
      const here = this.ground.get(key);
      if (here === undefined || (level !== undefined && here !== level)) continue;
      if (owned && !owned.has(`${Math.floor(x / CELL)},${Math.floor(-y / CELL)}`)) continue;
      // Paths first: a walk that ends on a road is twice as likely to be kept.
      if (!this.roads.has(key) && Math.random() < 0.5) continue;
      return centreOf(key);
    }
    return null;
  }

  somewhere(walker: Spot, reach: number): Spot | null {
    return this.near(walker, null, reach);
  }

  /**
   * The way from where a walker is to a spot, as world points, or null.
   *
   * A* over the grid, eight ways, paths cheaper than grass, only on the level
   * it is on. Capped, so an unreachable spot costs a bounded search and not
   * the whole island.
   */
  route(walker: Spot, to: Spot, budget = 2600): Spot[] | null {
    const level = this.levelAt(walker);
    const start = this.nearestKey(walker, 3);
    const goal = this.nearestKey(to, 3);
    if (!start || !goal) return null;
    if (level !== undefined && this.ground.get(goal) !== level) return null;
    const [gx, gy] = goal.split(',').map(Number) as [number, number];
    const open = new Heap();
    const cost = new Map<string, number>([[start, 0]]);
    const from = new Map<string, string>();
    open.push(start, 0);
    let seen = 0;
    while (open.size) {
      const key = open.pop()!;
      if (key === goal) break;
      if (++seen > budget) return null;
      const [x, y] = key.split(',').map(Number) as [number, number];
      for (const [dx, dy] of EIGHT) {
        const nx = x + dx;
        const ny = y + dy;
        const next = `${nx},${ny}`;
        const there = this.ground.get(next);
        if (there === undefined || (level !== undefined && there !== level)) continue;
        // No cutting a corner through something solid.
        if (
          dx &&
          dy &&
          (!this.ground.has(`${x + dx},${y}`) || !this.ground.has(`${x},${y + dy}`))
        ) {
          continue;
        }
        const step = (dx && dy ? 1.414 : 1) * (this.roads.has(next) ? 0.55 : 1);
        const total = (cost.get(key) ?? 0) + step;
        if (total >= (cost.get(next) ?? Infinity)) continue;
        cost.set(next, total);
        from.set(next, key);
        open.push(next, total + Math.hypot(gx - nx, gy - ny) * 0.55);
      }
    }
    if (!from.has(goal) && goal !== start) return null;
    const path: Spot[] = [];
    for (let at: string | undefined = goal; at && at !== start; at = from.get(at)) {
      path.push(centreOf(at));
    }
    path.reverse();
    // The last step lands exactly where it was going, not a cell's middle.
    if (path.length) path[path.length - 1] = { x: to.x, y: to.y };
    return path;
  }

  /** Whether two spots stand on the same level of ground, so one can walk to the other. */
  sameLevel(a: Spot, b: Spot): boolean {
    const one = this.levelAt(a);
    return one !== undefined && one === this.levelAt(b);
  }

  /** The nearest walkable spot to one, or null. */
  walkableNear(spot: Spot, reach = 4): Spot | null {
    return this.nearestWalkable(spot, reach);
  }

  private levelAt(spot: Spot): number | undefined {
    const key = this.nearestKey(spot, 2);
    return key ? this.ground.get(key) : undefined;
  }

  private nearestKey(spot: Spot, reach: number): string | null {
    const cx = Math.floor(spot.x / STEP);
    const cy = Math.floor(spot.y / STEP);
    for (let r = 0; r <= reach; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const key = `${cx + dx},${cy + dy}`;
          if (this.ground.has(key)) return key;
        }
      }
    }
    return null;
  }

  private nearestWalkable(spot: Spot, reach: number): Spot | null {
    const key = this.nearestKey(spot, reach);
    if (!key) return null;
    // Keep the exact spot when it is itself walkable.
    return key === keyOf(spot.x, spot.y) ? spot : centreOf(key);
  }
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

function keyOf(x: number, y: number): string {
  return `${Math.floor(x / STEP)},${Math.floor(y / STEP)}`;
}

function centreOf(key: string): Spot {
  const [x, y] = key.split(',').map(Number) as [number, number];
  return { x: x * STEP + STEP / 2, y: y * STEP + STEP / 2 };
}

const owned = new WeakMap<District, Set<string>>();
function cellsOf(district: District): Set<string> {
  let cells = owned.get(district);
  if (cells) return cells;
  cells = new Set();
  for (const [x, y0, y1] of district.cells) for (let y = y0; y <= y1; y++) cells.add(`${x},${y}`);
  owned.set(district, cells);
  return cells;
}

function hashOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** A binary heap of keys by priority, smallest first. */
class Heap {
  private readonly keys: string[] = [];
  private readonly scores: number[] = [];
  get size(): number {
    return this.keys.length;
  }
  push(key: string, score: number): void {
    let i = this.keys.length;
    this.keys.push(key);
    this.scores.push(score);
    while (i > 0) {
      const up = (i - 1) >> 1;
      if (this.scores[up]! <= score) break;
      this.keys[i] = this.keys[up]!;
      this.scores[i] = this.scores[up]!;
      i = up;
    }
    this.keys[i] = key;
    this.scores[i] = score;
  }
  pop(): string | undefined {
    const top = this.keys[0];
    const lastKey = this.keys.pop()!;
    const lastScore = this.scores.pop()!;
    if (!this.keys.length) return top;
    let i = 0;
    const n = this.keys.length;
    for (;;) {
      const l = i * 2 + 1;
      const r = l + 1;
      let m = i;
      let best = lastScore;
      if (l < n && this.scores[l]! < best) {
        m = l;
        best = this.scores[l]!;
      }
      if (r < n && this.scores[r]! < best) m = r;
      if (m === i) break;
      this.keys[i] = this.keys[m]!;
      this.scores[i] = this.scores[m]!;
      i = m;
    }
    this.keys[i] = lastKey;
    this.scores[i] = lastScore;
    return top;
  }
}

/** Everybody walking, kept in step with who is open. */
export class Walkers {
  private readonly people = new Map<string, Walker>();

  constructor(
    private readonly paths: Paths,
    private readonly laneAt: (y: number) => Container,
    private readonly fire: Spot | null
  ) {}

  /** Who is about now. Anyone not named heads home and goes. */
  set(walking: readonly Walking[]): void {
    const here = new Set<string>();
    for (const who of walking) {
      here.add(who.id);
      const had = this.people.get(who.id);
      if (had) {
        const changed = had.who.look !== who.look;
        had.who = who;
        had.leaving = false;
        if (changed) had.replan();
        continue;
      }
      /* A session arrives from the fire; a helper steps out of its session's
         door, or from wherever its session happens to be standing. */
      const parent = who.helper ? this.people.get(who.id.split('#')[0]!) : undefined;
      const from = parent
        ? { x: parent.x, y: parent.y }
        : who.look === 'arriving'
          ? this.paths.start(this.fire, who.building)
          : ((who.building && this.paths.doorOf(who.building)) ??
            this.paths.start(this.fire, who.building));
      const walker = new Walker(who, from);
      this.people.set(who.id, walker);
    }
    for (const [id, walker] of this.people) {
      if (here.has(id)) continue;
      // Helpers walk home and go; a session simply goes.
      if (walker.who.helper) walker.leaving = true;
      else walker.gone = true;
    }
  }

  /** Where everybody is, for the lanterns they carry after dark. */
  positions(): IterableIterator<Walker> {
    return this.people.values();
  }

  /** Move everybody along. Says whether anybody visibly moved. */
  private sorted = 0;

  tick(now: number, seconds: number, night: boolean): boolean {
    let moved = false;
    const resort = now - this.sorted > 400;
    if (resort) this.sorted = now;
    for (const [id, walker] of this.people) {
      if (walker.gone) {
        walker.view.destroy({ children: true });
        this.people.delete(id);
        moved = true;
        continue;
      }
      if (walker.step(now, seconds, this.paths, night, this.fire)) moved = true;
      // Re-sorted a few times a second at most: each move rebuilds the island's draw list.
      if (!walker.lane || resort) {
        const lane = this.laneAt(walker.y);
        if (lane !== walker.lane) {
          lane.addChild(walker.view);
          walker.lane = lane;
        }
      }
    }
    return moved;
  }

  get count(): number {
    return this.people.size;
  }
}
