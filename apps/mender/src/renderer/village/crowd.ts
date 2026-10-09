import { CELL, type District, type Layout } from '@mender/village';
import { Container, Sprite, type Texture } from 'pixi.js';
import { Fleet } from './fleet';
import { folkTexture } from './folk';
import { SHADOW_TINT, type Building } from './scene';
import type { Paths, Spot } from './walkers';

/**
 * Everybody on the island who is not a session: the life a district has
 * because work is going on in it.
 *
 * A district is as lively as its project. How busy it has been is read off git
 * and off the sessions open in it, and how long since anybody committed to it
 * thins it out again, the same clock the moss grows on. A project being worked
 * hard is full: townsfolk of every sort going about, chickens and sheep and a
 * dog round the farms, and a runner out of a session's door for every single
 * thing its agent does, a scroll to the signpost for something read, a crate
 * to the storehouse for something written, a hammer to the forge for something
 * run. A commit wheels a cart down to the storehouse; a push loads a boat at
 * the dock and it sails, which is the fleet's to do, along with everything
 * else out on the water. Two busy districts send people along the road between
 * them. A quiet one has somebody about, and that is all. A forgotten one
 * empties out and gets crows.
 *
 * And on the roads, what still reads once the camera is up over the whole
 * island and a villager is a speck: covered wagons with a carter on the box
 * and riders on horseback, going from one lived-in district to another along
 * the artist's paths, more of them the busier the island is, and horses
 * grazing on the farms.
 *
 * None of it costs anything it does not have to. It moves only on frames that
 * are drawn, a path is found once per walk and only a few a frame, and the
 * whole crowd is capped well under what would ever be felt.
 */

type Kind =
  | 'town'
  | 'runner'
  | 'traveller'
  | 'animal'
  | 'crow'
  | 'cart'
  | 'wagon'
  | 'rider';
type Dir = 'down' | 'up' | 'side';

const TOWNSFOLK = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const FARM_ANIMALS = ['chicken', 'hen', 'sheep', 'cow', 'pig', 'horse', 'chicken', 'hen'];
const TOWN_ANIMALS = ['dog', 'cat', 'chicken', 'hen', 'duck'];
/** What an animal does standing still, by kind. */
const IDLE: Record<string, string> = {
  chicken: 'chicken-peck',
  hen: 'hen-peck',
  sheep: 'sheep-graze',
  cow: 'cow-graze',
  horse: 'horse-graze',
  pig: 'pig-idle',
  duck: 'duck-idle',
  dog: 'dog-sit',
  cat: 'cat-0',
};
/** World pixels a second. */
const PACE: Record<Kind, number> = {
  town: 12,
  runner: 30,
  traveller: 18,
  animal: 9,
  crow: 14,
  cart: 16,
  wagon: 15,
  rider: 26,
};
/** Never more than this on the island at once, whatever is going on. */
const CAP = 170;
/** Wagons and riders on the island at most, however busy it gets. */
const ROAD_CAP = { wagon: 14, rider: 16 };
/** How hard a wagon keeps to the road, and how far it will look for one. */
const WAGON_OFF_ROAD = 3;
const LONG_ROUTE = 30000;
/** Paths found per frame at most, so a burst of work never costs a frame. */
const ROUTES_PER_FRAME = 4;

/** What a tool's work is carried as, and where it is carried to. */
const ERRAND: Record<string, { item: string; to: 'sign' | 'store' | 'smith' | 'any' }> = {
  read: { item: 'carry-scroll', to: 'sign' },
  search: { item: 'carry-scroll', to: 'sign' },
  fetch: { item: 'carry-letter', to: 'sign' },
  edit: { item: 'carry-crate', to: 'store' },
  write: { item: 'carry-crate', to: 'store' },
  delete: { item: 'carry-basket', to: 'store' },
  move: { item: 'carry-basket', to: 'store' },
  execute: { item: 'carry-hammer', to: 'smith' },
  think: { item: 'carry-flask', to: 'any' },
};

interface Mover {
  kind: Kind;
  /** The frame names' prefix: `town-a-`, `` for a plain villager, `sheep` ... */
  look: string;
  view: Container;
  body: Sprite;
  carry: Sprite | null;
  pusher: Sprite | null;
  x: number;
  y: number;
  path: Spot[];
  waitUntil: number;
  dir: Dir;
  flip: boolean;
  frame: number;
  frameAt: number;
  district: string;
  /** Where it goes when it is done, and whether it is on its way there. */
  home: Spot | null;
  leaving: boolean;
  gone: boolean;
  /** For runners and travellers: where it is going, then whether it is coming back. */
  target: Spot | null;
  back: boolean;
  lane: Container | null;
  /** When a wagon or rider last turned, so a diagonal road does not flicker it. */
  turnedAt: number;
  /** A wagon's lanterns, where they hang right now. */
  lamps: Lamp[];
}

/** A lantern hung on something, rather than carried in a hand. */
export interface Lamp {
  x: number;
  y: number;
  lamp: true;
}

interface Place {
  district: District;
  doors: Spot[];
  store: Spot[];
  smith: Spot[];
  sign: Spot[];
  farm: Spot[];
  docks: Spot[];
  roads: Spot[];
}

/** How lively a district is right now. */
export interface Life {
  /** How much work: sessions open and working, commits lately. */
  busy: number;
  /** How long it has been left, nought to one, the moss's own clock. */
  age: number;
}

export class Crowd {
  /** Everything out on the water. */
  readonly fleet: Fleet;
  private readonly movers: Mover[] = [];
  private readonly places = new Map<string, Place>();
  private readonly want = new Map<string, { town: number; animals: number; crows: number }>();
  private routes = 0;
  private nextTraveller = 15;
  private nextOnRoad = 3;
  private night = false;
  private counted = 0;
  private sorted = 0;
  /**
   * How much bigger what travels the roads is drawn than it really is. Pulled
   * right back over the island a wagon is a fleck, so it grows as the camera
   * rises, up to not quite twice its size, and is itself again close in.
   */
  private roadScale = 1;
  /** The part of the world on screen, with a margin: nobody outside it is drawn. */
  private view = { x: -Infinity, y: -Infinity, width: Infinity, height: Infinity };

  constructor(
    private readonly paths: Paths,
    private readonly laneAt: (y: number) => Container,
    layout: Layout,
    districts: readonly District[],
    buildings: readonly Building[],
    land: ReadonlySet<string>,
    extent: { x: number; y: number; width: number; height: number }
  ) {
    this.fleet = new Fleet(paths, laneAt, layout, buildings, land, extent);
    for (const district of districts) {
      if (district.kind === 'common') continue;
      this.places.set(district.id, {
        district,
        doors: [],
        store: [],
        smith: [],
        sign: [],
        farm: [],
        docks: [],
        roads: paths.roadsIn(district),
      });
    }
    for (const building of buildings) {
      const place = this.places.get(building.district);
      const door = paths.doorOf(building);
      if (!place || !door) continue;
      const prefab = layout.objects[building.object]?.prefab ?? '';
      if (/Dock|Wall/.test(prefab)) continue;
      place.doors.push(door);
      if (/Warehouse|Barn|Shed|Stall/.test(prefab)) place.store.push(door);
      if (/Blacksmith/.test(prefab)) place.smith.push(door);
      if (/Well|Shrine|Chapel/.test(prefab)) place.sign.push(door);
    }
    for (const object of layout.objects) {
      const place = object.district ? this.places.get(object.district) : undefined;
      if (!place) continue;
      const at = { x: object.pos[0] * CELL, y: -object.pos[1] * CELL };
      const name = object.prefab;
      if (/Dock/.test(name)) place.docks.push(at);
      else if (/Road Sign|Sign 0|Billboard|Well/.test(name)) {
        const spot = paths.walkableNear({ x: at.x, y: at.y + 8 }, 3);
        if (spot) place.sign.push(spot);
      } else if (/Anvil/.test(name)) {
        const spot = paths.walkableNear({ x: at.x, y: at.y + 8 }, 3);
        if (spot) place.smith.push(spot);
      } else if (/Wheat|Scarecrow|Hay|Cabbage|Pumpkin|Carrot/.test(name)) {
        const spot = paths.walkableNear(at, 4);
        if (spot) place.farm.push(spot);
      }
    }
  }

  /** How lively every district is: the crowd grows or thins toward it. */
  setLife(lives: ReadonlyMap<string, Life>): void {
    this.want.clear();
    for (const [id, place] of this.places) {
      const life = lives.get(id);
      if (!life) {
        this.want.set(id, { town: 0, animals: 0, crows: 0 });
        continue;
      }
      const kept = Math.max(0, 1 - life.age);
      const score = life.busy * kept;
      const town = life.age >= 0.8 ? 0 : life.age > 0.5 ? 1 : Math.min(7, 1 + Math.round(score));
      const farming = place.farm.length > 2 ? 2 : 0;
      const animals = life.age > 0.6 ? 0 : Math.min(7, Math.round(score * 0.7 + farming * kept));
      const crows = life.age > 0.3 ? Math.round(life.age * 4) : 0;
      this.want.set(id, { town, animals, crows });
    }
  }

  /** A session's agent has started on something: a runner goes out with it. */
  errand(districtId: string, from: Building | null, tool: string): void {
    const place = this.places.get(districtId);
    if (!place || this.movers.length >= CAP) return;
    if (
      this.movers.filter((one) => one.kind === 'runner' && one.district === districtId).length >= 8
    ) {
      return;
    }
    const door = (from && this.paths.doorOf(from)) ?? pick(place.doors);
    if (!door) return;
    const job = ERRAND[tool] ?? { item: 'carry-letter', to: 'any' as const };
    const target = this.destination(place, door, job.to === 'any' ? 'doors' : job.to);
    if (!target) return;
    const mover = this.make('runner', '', door, districtId);
    mover.target = target;
    mover.home = door;
    mover.carry = this.item(mover, job.item);
  }

  /** Something was committed: a cart goes down to the storehouse. */
  cart(districtId: string, from: Building | null): void {
    const place = this.places.get(districtId);
    if (!place) return;
    const door = (from && this.paths.doorOf(from)) ?? pick(place.doors);
    const target = door && this.destination(place, door, 'store');
    if (!door || !target) return;
    const mover = this.make('cart', 'cart', door, districtId);
    mover.target = target;
    mover.home = door;
    const pusher = new Sprite(folkTexture('walk-side-0') ?? undefined);
    pusher.anchor.set(0.5, 1);
    mover.view.addChildAt(pusher, 1);
    mover.pusher = pusher;
  }

  /** Something was pushed: a boat is loaded at the district's dock and sails. */
  boat(districtId: string): void {
    this.fleet.depart(districtId);
  }

  /**
   * Where an errand from a door goes: a place of the kind it wants if one is
   * on the same level of ground, any other door that is, or failing both a
   * spot down the road, so an errand is always a walk and never a vanishing.
   */
  private destination(
    place: Place,
    door: Spot,
    want: 'sign' | 'store' | 'smith' | 'doors'
  ): Spot | null {
    const reachable = (list: readonly Spot[]): Spot[] =>
      list.filter(
        (spot) =>
          Math.hypot(spot.x - door.x, spot.y - door.y) > 24 && this.paths.sameLevel(door, spot)
      );
    return (
      pick(reachable(place[want])) ??
      pick(reachable(place.doors)) ??
      this.paths.near(door, place.district, 7 * CELL) ??
      this.paths.near(door, null, 7 * CELL)
    );
  }

  /** Every walker that would carry a lantern after dark. */
  *lit(): IterableIterator<Spot> {
    // The wagons' lanterns first, so the cap on lights never leaves a wagon dark.
    for (const one of this.movers) if (one.kind === 'wagon') yield* one.lamps;
    yield* this.fleet.lit();
    for (const one of this.movers) if (isPerson(one.kind) || one.kind === 'rider') yield one;
  }

  get count(): number {
    return this.movers.length;
  }

  tick(
    now: number,
    seconds: number,
    night: boolean,
    view?: { x: number; y: number; width: number; height: number }
  ): void {
    this.night = night;
    this.routes = 0;
    if (view) {
      this.view = view;
      const zoom = window.innerWidth / view.width;
      this.roadScale = Math.min(1.8, Math.max(1, 0.5 / zoom));
    }
    // Counting heads is a once-a-second job, not a once-a-frame one.
    if (now - this.counted > 1000) {
      this.counted = now;
      this.populate();
    }
    this.travel(seconds);
    this.roadTraffic(seconds);
    this.fleet.tick(now, seconds, night, this.view);
    const resort = now - this.sorted > 400;
    if (resort) this.sorted = now;
    for (let i = this.movers.length - 1; i >= 0; i--) {
      const mover = this.movers[i]!;
      if (mover.gone) {
        mover.view.destroy({ children: true });
        this.movers.splice(i, 1);
        continue;
      }
      this.step(mover, now, seconds);
      /* Into its place in the draw order. Moving a sprite there makes the
         renderer rebuild the whole island's list of what to draw, so it is
         done for everybody together a few times a second, never per frame;
         a newcomer is placed at once. */
      if (!mover.lane || resort) {
        const lane = this.laneAt(mover.y);
        if (lane !== mover.lane) {
          lane.addChild(mover.view);
          mover.lane = lane;
        }
      }
    }
  }

  destroy(): void {
    this.fleet.destroy();
    for (const mover of this.movers) mover.view.destroy({ children: true });
    this.movers.length = 0;
  }

  /* ── keeping the numbers ───────────────────────────────────────────── */

  private populate(): void {
    for (const [id, want] of this.want) {
      const place = this.places.get(id);
      if (!place) continue;
      // After dark most people are indoors; the animals settle where they are.
      const town = this.night ? Math.ceil(want.town / 3) : want.town;
      this.balance(id, 'town', town, () => {
        const door = pick(place.doors);
        if (!door) return;
        this.make('town', `town-${pick(TOWNSFOLK)}-`, door, id).home = door;
      });
      this.balance(id, 'animal', want.animals, () => {
        const farming = place.farm.length > 2;
        const kind = pick(farming ? FARM_ANIMALS : TOWN_ANIMALS) ?? 'chicken';
        const at = pick(farming ? place.farm : place.doors);
        if (!at) return;
        this.make('animal', kind, at, id);
      });
      this.balance(id, 'crow', want.crows, () => {
        const at = pick(place.doors) ?? pick(place.farm);
        if (!at) return;
        this.make('crow', 'crow', { x: at.x + rand(-40, 40), y: at.y + rand(-20, 30) }, id);
      });
    }
  }

  /** Grow toward a number by one at a time, or send the extras home. */
  private balance(id: string, kind: Kind, want: number, spawn: () => void): void {
    const here = this.movers.filter(
      (one) => one.kind === kind && one.district === id && !one.leaving
    );
    if (here.length < want && this.movers.length < CAP) {
      // One at a time, every second or so, so a district fills up rather than appears full.
      if (Math.random() < 0.6) spawn();
      return;
    }
    for (const extra of here.slice(want)) {
      extra.leaving = true;
      extra.waitUntil = 0;
      extra.path = [];
    }
  }

  /** Now and then somebody walks the road from one busy district to another. */
  private travel(seconds: number): void {
    this.nextTraveller -= seconds;
    if (this.nextTraveller > 0) return;
    this.nextTraveller = rand(12, 30);
    const busy = [...this.want.entries()].filter(([, want]) => want.town >= 3).map(([id]) => id);
    if (busy.length < 2 || this.movers.length >= CAP) return;
    const from = this.places.get(pick(busy)!);
    const to = this.places.get(pick(busy.filter((id) => id !== from?.district.id))!);
    const start = from && pick(from.doors);
    const end = to && pick(to.doors);
    if (!start || !end || !this.paths.sameLevel(start, end)) return;
    const path = this.paths.route(start, end, 16000);
    if (!path?.length) return;
    const mover = this.make('traveller', `town-${pick(TOWNSFOLK)}-`, start, from.district.id);
    mover.path = path;
    mover.target = end;
    mover.back = true;
    mover.carry = this.item(mover, pick(['carry-basket', 'carry-letter', 'carry-crate'])!);
  }

  /**
   * Wagons and riders. However many the island's life calls for, a few
   * seconds apart: each leaves from a road in a lived-in district for a road
   * in another one on the same level, or failing that the far end of its own,
   * and comes back again before it is gone.
   */
  private roadTraffic(seconds: number): void {
    this.nextOnRoad -= seconds;
    if (this.nextOnRoad > 0) return;
    this.nextOnRoad = rand(1, 2.5);
    const lived = [...this.want.entries()]
      .filter(([id, want]) => want.town > 0 && (this.places.get(id)?.roads.length ?? 0) > 6)
      .map(([id, want]) => ({ id, town: this.night ? Math.ceil(want.town / 3) : want.town }));
    if (!lived.length || this.movers.length >= CAP) return;
    const bustle = lived.reduce((sum, one) => sum + one.town, 0);
    const want = {
      wagon: Math.min(ROAD_CAP.wagon, Math.max(3, lived.length + Math.round(bustle / 3))),
      rider: Math.min(ROAD_CAP.rider, Math.max(3, lived.length + Math.round(bustle / 2.5))),
    };
    const out = (kind: Kind) => this.movers.filter((one) => one.kind === kind).length;
    // Whichever is furthest short of its number goes next, so they come out mixed.
    const shortWagon = 1 - out('wagon') / want.wagon;
    const shortRider = want.rider ? 1 - out('rider') / want.rider : 0;
    if (shortWagon <= 0 && shortRider <= 0) return;
    const kind: Kind = shortRider > shortWagon ? 'rider' : 'wagon';
    // Busier districts send more of them.
    let roll = Math.random() * bustle;
    const from = lived.find((one) => (roll -= one.town) < 0) ?? lived[0]!;
    const place = this.places.get(from.id)!;
    const start = pick(place.roads)!;
    const others = lived
      .filter((one) => one.id !== from.id)
      .map((one) => pick(this.places.get(one.id)!.roads)!)
      .filter((spot) => this.paths.sameLevel(start, spot));
    const offRoad = kind === 'wagon' ? WAGON_OFF_ROAD : 1.5;
    let path: Spot[] | null = null;
    let end: Spot | undefined = pick(others);
    if (end) path = this.paths.route(start, end, LONG_ROUTE, offRoad);
    if (!path?.length) {
      // Nowhere else to go: the far end of its own roads.
      end = [...place.roads]
        .filter((spot) => this.paths.sameLevel(start, spot))
        .sort((a, b) => far(b, start) - far(a, start))[Math.floor(Math.random() * 4)];
      path = end ? this.paths.route(start, end, LONG_ROUTE, offRoad) : null;
    }
    if (!end || !path || path.length < 12) return;
    // Never two setting off from the same spot, one on top of the other.
    if (
      this.movers.some(
        (one) => (one.kind === 'wagon' || one.kind === 'rider') && far(one, start) < 80
      )
    ) {
      return;
    }
    const mover = this.make(kind, kind, start, from.id);
    mover.path = path;
    mover.target = end;
    mover.home = start;
    mover.back = true;
  }

  /* ── one of them ───────────────────────────────────────────────────── */

  private make(kind: Kind, look: string, at: Spot, district: string): Mover {
    const view = new Container();
    const shade = new Sprite(folkTexture('shadow') ?? undefined);
    shade.anchor.set(0.5, 0.7);
    shade.blendMode = 'multiply';
    shade.tint = SHADOW_TINT;
    const body = new Sprite();
    body.anchor.set(0.5, 1);
    if (kind === 'animal' || kind === 'crow') shade.scale.set(0.6);
    if (kind === 'wagon') shade.scale.set(3, 1.6);
    if (kind === 'rider') shade.scale.set(1.8, 1.1);
    view.addChild(shade, body);
    view.position.set(Math.round(at.x), Math.round(at.y));
    const mover: Mover = {
      kind,
      look,
      view,
      body,
      carry: null,
      pusher: null,
      x: at.x,
      y: at.y,
      path: [],
      waitUntil: performance.now() + rand(0, 800),
      dir: 'down',
      flip: Math.random() < 0.5,
      frame: 0,
      frameAt: 0,
      district,
      home: null,
      leaving: false,
      gone: false,
      target: null,
      back: false,
      lane: null,
      turnedAt: 0,
      lamps:
        kind === 'wagon'
          ? [
              { x: at.x, y: at.y, lamp: true },
              { x: at.x, y: at.y, lamp: true },
            ]
          : [],
    };
    // Coming out of a door, they fade in rather than appear.
    view.alpha = 0;
    this.movers.push(mover);
    this.draw(mover, false);
    return mover;
  }

  private item(mover: Mover, name: string): Sprite | null {
    const texture = folkTexture(name);
    if (!texture) return null;
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5, 1);
    sprite.position.set(0, -8);
    mover.view.addChild(sprite);
    return sprite;
  }

  private step(mover: Mover, now: number, seconds: number): void {
    if (mover.view.alpha < 1 && !mover.leaving) {
      mover.view.alpha = Math.min(1, mover.view.alpha + seconds * 2);
    }
    let walking = false;
    if (mover.path.length && this.blocked(mover)) {
      // Held up behind another on the same road: stand, horse and all.
    } else if (mover.path.length) {
      const next = mover.path[0]!;
      const dx = next.x - mover.x;
      const dy = next.y - mover.y;
      const far = Math.hypot(dx, dy);
      const go = PACE[mover.kind] * seconds;
      if (far <= go) {
        mover.x = next.x;
        mover.y = next.y;
        mover.path.shift();
      } else {
        mover.x += (dx / far) * go;
        mover.y += (dy / far) * go;
      }
      if (mover.kind === 'wagon' || mover.kind === 'rider') this.steer(mover, now);
      else if (Math.abs(dx) > Math.abs(dy) * 1.2) {
        mover.dir = 'side';
        mover.flip = dx < 0;
      } else if (Math.abs(dy) > 0.01) {
        mover.dir = dy < 0 ? 'up' : 'down';
      }
      walking = true;
      if (!mover.path.length) mover.waitUntil = now + this.pause(mover);
    } else if (now >= mover.waitUntil) {
      this.decide(mover, now);
    }
    if (mover.leaving && !mover.path.length && now >= mover.waitUntil) {
      mover.view.alpha -= seconds * 2.5;
      if (mover.view.alpha <= 0) mover.gone = true;
    }
    const pace = walking ? WALK_FRAME[mover.kind] ?? 160 : 700;
    let changed = walking;
    if (now - mover.frameAt > pace) {
      mover.frameAt = now;
      mover.frame++;
      changed = true;
    }
    const v = this.view;
    const margin = mover.kind === 'wagon' ? 80 : 40;
    const seen =
      mover.x > v.x - margin &&
      mover.x < v.x + v.width + margin &&
      mover.y > v.y - margin &&
      mover.y < v.y + v.height + margin;
    if (changed && seen) this.draw(mover, walking);
  }

  private pause(mover: Mover): number {
    switch (mover.kind) {
      case 'runner':
        return rand(300, 900);
      case 'animal':
        return rand(1500, 6000);
      case 'crow':
        return rand(800, 3000);
      case 'cart':
        return 1200;
      case 'wagon':
        return rand(3000, 7000);
      case 'rider':
        return rand(1500, 4000);
      default:
        return rand(1200, 5000);
    }
  }

  /** What to do next, once it has arrived and waited. */
  private decide(mover: Mover, now: number): void {
    if (this.routes >= ROUTES_PER_FRAME) {
      mover.waitUntil = now + rand(50, 200);
      return;
    }
    const place = this.places.get(mover.district);
    // Somewhere to be, and then home, and then gone.
    if (
      mover.kind === 'runner' ||
      mover.kind === 'cart' ||
      mover.kind === 'traveller' ||
      mover.kind === 'wagon' ||
      mover.kind === 'rider'
    ) {
      if (mover.target && !mover.back) {
        mover.back = true;
        this.goTo(mover, mover.target);
        if (!mover.path.length) mover.leaving = true;
        return;
      }
      if (mover.kind !== 'traveller' && mover.home && mover.target) {
        mover.target = null;
        this.goTo(mover, mover.home);
        if (mover.carry) mover.carry.visible = false;
        if (!mover.path.length) mover.leaving = true;
        return;
      }
      mover.leaving = true;
      return;
    }
    if (mover.leaving) {
      if (mover.home && Math.hypot(mover.home.x - mover.x, mover.home.y - mover.y) > 4) {
        this.goTo(mover, mover.home);
        if (mover.path.length) return;
      }
      mover.waitUntil = 0;
      return;
    }
    if (mover.kind === 'crow') {
      // Crows hop about a patch, and now and then flap off a short way.
      const spot = this.paths.near(mover, null, Math.random() < 0.2 ? 120 : 30);
      if (spot) mover.path = [spot];
      mover.waitUntil = now + this.pause(mover);
      return;
    }
    // Townsfolk and animals: wander their own district, animals a small patch,
    // mostly along the roads.
    const reach = mover.kind === 'animal' ? 3 * CELL : 9 * CELL;
    const spot = this.paths.near(mover, place?.district ?? null, reach);
    if (spot) this.goTo(mover, spot);
    mover.waitUntil = now + this.pause(mover);
  }

  private goTo(mover: Mover, to: Spot): void {
    this.routes++;
    const path =
      mover.kind === 'wagon' || mover.kind === 'rider'
        ? this.paths.route(mover, to, LONG_ROUTE, mover.kind === 'wagon' ? WAGON_OFF_ROAD : 1.5)
        : this.paths.route(mover, to, mover.kind === 'traveller' ? 16000 : 3000);
    mover.path = path ?? [];
  }

  /**
   * Whether a wagon or rider has another right in front of it on the road.
   * Two going the same way would otherwise drive on through each other, one
   * canvas laid over the other; the one behind waits for a gap instead.
   */
  private blocked(mover: Mover): boolean {
    if (mover.kind !== 'wagon' && mover.kind !== 'rider') return false;
    const next = mover.path[Math.min(mover.path.length - 1, 2)]!;
    const hx = next.x - mover.x;
    const hy = next.y - mover.y;
    const length = Math.hypot(hx, hy) || 1;
    for (const other of this.movers) {
      if (other === mover || (other.kind !== 'wagon' && other.kind !== 'rider')) continue;
      const dx = other.x - mover.x;
      const dy = other.y - mover.y;
      const ahead = (dx * hx + dy * hy) / length;
      const aside = Math.abs(dx * hy - dy * hx) / length;
      if (!(ahead > 0 && ahead < 46 * this.roadScale && aside < 14)) continue;
      // Coming the other way they pass; only one going the same way holds it up.
      const its = other.path[Math.min(other.path.length - 1, 2)];
      if (its && (its.x - other.x) * hx + (its.y - other.y) * hy < 0) continue;
      return true;
    }
    return false;
  }

  /**
   * Which way a wagon or rider faces, read off the road a few steps ahead
   * rather than the next one, and held a moment once turned: a diagonal road
   * is a staircase of steps, and something this big flicking between its
   * side and its front on every one of them is the first thing anybody sees.
   */
  private steer(mover: Mover, now: number): void {
    const ahead = mover.path[Math.min(mover.path.length - 1, 4)];
    if (!ahead) return;
    const dx = ahead.x - mover.x;
    const dy = ahead.y - mover.y;
    let dir: Dir = mover.dir;
    if (Math.abs(dx) > Math.abs(dy) * 1.4) dir = 'side';
    else if (Math.abs(dy) > Math.abs(dx) * 1.4) dir = dy < 0 ? 'up' : 'down';
    const flip = dir === 'side' ? dx < 0 : mover.flip;
    if (dir === mover.dir && flip === mover.flip) return;
    if (now - mover.turnedAt < 500) return;
    mover.dir = dir;
    mover.flip = flip;
    mover.turnedAt = now;
  }

  private draw(mover: Mover, walking: boolean): void {
    const name = this.frameName(mover, walking);
    const texture: Texture | undefined =
      folkTexture(name) ??
      folkTexture(mover.kind === 'animal' ? `${mover.look}-walk-0` : 'front-0');
    if (texture && mover.body.texture !== texture) mover.body.texture = texture;
    const facesAll = !isPerson(mover.kind) && mover.kind !== 'wagon' && mover.kind !== 'rider';
    const flip = mover.flip && (mover.dir === 'side' || facesAll) ? -1 : 1;
    mover.body.scale.x = flip;
    if (mover.pusher) {
      const frame = folkTexture(`walk-side-${mover.frame % 4}`);
      if (frame) mover.pusher.texture = frame;
      mover.pusher.scale.x = flip;
      mover.pusher.position.set(-flip * 15, 0);
    }
    if (mover.carry) {
      mover.carry.position.set(mover.dir === 'side' ? flip * 6 : 0, mover.dir === 'up' ? -12 : -8);
      // Held in front, so behind the body when walking away.
      mover.view.setChildIndex(
        mover.carry,
        mover.dir === 'up' ? 1 : mover.view.children.length - 1
      );
    }
    mover.view.position.set(Math.round(mover.x), Math.round(mover.y));
    if (mover.kind === 'wagon' || mover.kind === 'rider') mover.view.scale.set(this.roadScale);
    WAGON_LAMPS[mover.dir].forEach(([dx, dy], i) => {
      const lamp = mover.lamps[i];
      if (!lamp) return;
      lamp.x = mover.view.x + dx * flip * this.roadScale;
      lamp.y = mover.view.y + dy * this.roadScale;
    });
  }

  private frameName(mover: Mover, walking: boolean): string {
    const f = mover.frame;
    switch (mover.kind) {
      case 'animal': {
        if (walking) return `${mover.look}-walk-${f % (mover.look === 'horse' ? 4 : 2)}`;
        return IDLE[mover.look] ?? `${mover.look}-walk-0`;
      }
      case 'crow':
        return walking ? `crow-hop-${f % 2}` : 'crow-hop-0';
      case 'cart':
        return `cart-${f % 2}`;
      case 'wagon':
      case 'rider':
        return `${mover.look}-${mover.dir}-${walking ? f % 4 : 1}`;
      default: {
        const prefix = mover.look;
        if (walking) return `${prefix}walk-${mover.dir}-${f % 4}`;
        const facing = mover.dir === 'up' ? 'back' : mover.dir === 'side' ? 'side' : 'front';
        return `${prefix}${facing}-${f % 2}`;
      }
    }
  }
}

/**
 * Where a wagon's two lanterns hang on its sprite, from the foot of it, for
 * each way it can face: the corners of the box behind the carter side on,
 * the front corners coming down the screen and the back ones going up.
 */
const WAGON_LAMPS: Record<Dir, [number, number][]> = {
  side: [
    [-26, -18],
    [-1, -18],
  ],
  down: [
    [-10, -25],
    [10, -25],
  ],
  up: [
    [-9, -14],
    [9, -14],
  ],
};

/** How long each frame of a walk is held, by what is walking. */
const WALK_FRAME: Partial<Record<Kind, number>> = { runner: 110, wagon: 170, rider: 130 };

function far(a: Spot, b: Spot): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isPerson(kind: Kind): boolean {
  return kind === 'town' || kind === 'runner' || kind === 'traveller';
}

function pick<T>(list: readonly T[]): T | undefined {
  return list[Math.floor(Math.random() * list.length)];
}

function rand(low: number, high: number): number {
  return low + Math.random() * (high - low);
}
