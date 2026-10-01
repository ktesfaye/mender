import { CELL, type District, type Layout, type Linked } from '@mender/village';
import {
  BufferImageSource,
  Container,
  Particle,
  ParticleContainer,
  Sprite,
  Texture,
  type Renderer,
} from 'pixi.js';
import { drawingNow, setFalling } from '../pace';
import { folkTexture, type Look } from './folk';
import { Grade, Lights, mossTexture, screenInWorld, type Light, type Moss } from './grade';
import { texture as kitTexture } from './kit';
import { SHADOW_TINT, type Building } from './scene';
import type { Sky, SkyLook } from './sky';
import type { Walkers } from './walkers';

/**
 * Everything on the island that is not the art standing still.
 *
 * The sky over it and the grade it puts on every pixel; the light given off by
 * the fire, the lamps, lit windows and whoever is walking about after dark
 * with a lantern; smoke out of the chimneys of houses somebody is working in;
 * the fire itself, flickering and throwing sparks; and the small life that
 * makes it a place rather than a picture: fireflies at night, gulls by day,
 * butterflies over the flowers, a fish now and then off the shore, leaves
 * coming down in autumn, and rain or snow when the sky has some.
 *
 * Most of all it is careful. It does its work only on frames the screen will
 * actually show, and only for what is near enough the view to be seen; with
 * the village dimmed behind a board the air goes still; at noon on a clear
 * day the grade comes off entirely and the art costs exactly what it did.
 */

/** Where light and smoke come out of a sprite, in that sprite's own pixels. */
interface Emitters {
  chimneys?: [number, number][];
  windows?: [number, number, number, number][];
  doors?: [number, number, number, number][];
  lamps?: [number, number][];
}

let emitters: Record<string, Emitters> | null = null;

export async function loadEmitters(): Promise<void> {
  if (emitters) return;
  try {
    emitters = (await (await fetch('./village/emitters.json')).json()) as Record<string, Emitters>;
  } catch {
    emitters = {};
  }
}

/** Where a pixel of a sprite lands in the world. */
function worldOf(item: Linked, px: number, py: number): { x: number; y: number } {
  const left = item.x - item.pivotX * item.w;
  const top = -item.y - (1 - item.pivotY) * item.h;
  const x = item.flip ? item.w - px : px;
  return { x: left + x, y: top + py };
}

/** What is going on in each house, for its windows. */
export interface Lit {
  building: Building;
  look: Look;
}

const WINDOW: Record<Look, { color: number; strength: number } | null> = {
  empty: null,
  idle: null,
  arriving: { color: 0xffd9a0, strength: 0.5 },
  working: { color: 0xffc070, strength: 1 },
  wants: { color: 0xff7a2a, strength: 1 },
  done: { color: 0x9be37a, strength: 0.85 },
  waiting: { color: 0xff6e5a, strength: 0.45 },
  broken: { color: 0xff4a3a, strength: 0.9 },
};

interface Puff {
  sprite: Sprite;
  age: number;
  life: number;
  vx: number;
  vy: number;
}

interface Chimney {
  x: number;
  y: number;
  building: number;
  /** Seconds until its next puff. */
  next: number;
}

interface Lamp {
  x: number;
  y: number;
  sprite: Light;
  /** How dark it has to get before this one is lit: they come on one by one. */
  when: number;
  on: number;
}

interface Bug {
  sprite: Sprite;
  light?: Light;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  home: { x: number; y: number };
}

interface Gull {
  sprite: Sprite;
  shadow: Sprite;
  cx: number;
  cy: number;
  r: number;
  angle: number;
  speed: number;
}

interface Leaf {
  sprite: Sprite;
  x: number;
  y: number;
  floor: number;
  vx: number;
  age: number;
}

interface Drop {
  particle: Particle;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Where on screen it lands. */
  land: number;
  splash: number;
  phase: number;
}

export interface AtmosphereInput {
  renderer: Renderer;
  /** The world container: water and land, in world pixels. */
  world: Container;
  /** A container sitting exactly on the screen, the grade's quad drawn first in it. */
  frame: Container;
  /** The camera the world hangs from. */
  camera: Container;
  /** The flags, over the world, which the night only half darkens. */
  flags: Container;
  /** The layer over the whole camera, for rain and snow in screen pixels. */
  weatherLayer: Container;
  layout: Layout;
  items: readonly Linked[];
  districts: readonly District[];
  buildings: readonly Building[];
  fire: { x: number; y: number } | null;
  laneAt: (y: number) => Container;
  land: Set<string>;
  extent: { x: number; y: number; width: number; height: number };
  /** The same, in the screen's sense of y: what the scene places things in. */
  extentPx: { x: number; y: number; width: number; height: number };
}

export class Atmosphere {
  readonly sky: Sky;
  readonly air = new Container();
  private readonly grade = new Grade();
  private readonly lights = new Lights();
  private readonly puffs: Puff[] = [];
  private readonly chimneys: Chimney[] = [];
  private readonly lamps: Lamp[] = [];
  private readonly windowSpots = new Map<number, Spot[]>();
  /** Every house with glass in it, lit or not. */
  private readonly homes: Home[] = [];
  private readonly bugs: Bug[] = [];
  private readonly butterflies: Bug[] = [];
  private readonly gulls: Gull[] = [];
  private readonly leaves: Leaf[] = [];
  private readonly trees: { x: number; y: number }[] = [];
  private readonly bushes: { x: number; y: number }[] = [];
  private readonly drops: Drop[] = [];
  private readonly rain = new ParticleContainer({
    dynamicProperties: { position: true, color: true, vertex: true, rotation: true, uvs: false },
  });
  private readonly pixel = whitePixel();
  private readonly fireLights: Light[] = [];
  private readonly flames: Sprite | null = null;
  private readonly embers: Puff[] = [];
  private readonly walkerLights = new Map<unknown, Light>();
  private readonly fish: { sprite: Sprite; age: number; x: number; y: number }[] = [];
  private nextFish = 4;
  private moss: Moss | null = null;
  private weeds: Sprite[] = [];
  private houses: Lit[] = [];
  private inhabited = new Set<string>();
  private last = performance.now();
  private quiet = false;
  private walkers: Walkers | null = null;
  private time = 0;
  private applied = false;

  constructor(
    private readonly input: AtmosphereInput,
    sky: Sky
  ) {
    this.sky = sky;
    this.air.eventMode = 'none';
    input.weatherLayer.addChild(this.rain);
    this.rain.eventMode = 'none';
    /* The glow of lit things rides on the camera just over the world, so the
       grade's night never darkens it. */
    input.camera.addChildAt(this.lights.glows, input.camera.children.indexOf(input.world) + 1);
    this.findEmitters();
    this.makeHomes();
    this.lights.setOccluders(input.extentPx, this.occluders());
    const fire = input.fire;
    if (fire) {
      this.fireLights.push(
        this.lights.add(fire.x, fire.y + 2, 180, 0xff9a40, 0.95).glowAt(fire.x, fire.y - 6, 26),
        this.lights.add(fire.x, fire.y, 70, 0xffd28a, 0.8)
      );
      const flame = folkTexture('flame-0');
      if (flame) {
        const sprite = new Sprite(flame);
        sprite.anchor.set(0.5, 1);
        sprite.position.set(Math.round(fire.x), Math.round(fire.y + 2));
        input.laneAt(fire.y + 3).addChild(sprite);
        this.flames = sprite;
      }
    }
  }

  /** Who is walking, for the lanterns they carry once it is dark. */
  follow(walkers: Walkers): void {
    this.walkers = walkers;
  }

  /** The houses somebody is in, and what they are doing in there. */
  setHouses(lit: readonly Lit[], inhabited: Set<string>): void {
    this.houses = [...lit];
    this.inhabited = inhabited;
    const moods = new Map<number, Look>();
    for (const { building, look } of lit) moods.set(building.object, look);
    for (const home of this.homes) home.mood = moods.get(home.building.object);
  }

  /**
   * Every house with glass in it gets its windows lit once it is dark: the
   * panes themselves glow and a little light spills out of each onto the
   * ground. A house somebody is in burns in that session's own colour, as
   * bright as its lantern on the rail; any other is a plain warm hearth, lit
   * one by one as the light goes like the lamps, because a village at night
   * with every window black is a ruin, not a place.
   */
  private makeHomes(): void {
    for (const building of this.input.buildings) {
      if (!building.district || building.district === 'CAMP') continue;
      const spots = this.windowSpots.get(building.object);
      if (!spots?.length) continue;
      const panes: Sprite[] = [];
      const pools: Light[] = [];
      for (const spot of spots) {
        if (!spot.door) {
          const pane = new Sprite(Texture.WHITE);
          pane.position.set(Math.round(spot.x - spot.w / 2), Math.round(spot.y));
          pane.width = spot.w;
          pane.height = spot.h;
          pane.blendMode = 'add';
          pane.alpha = 0;
          pane.visible = false;
          building.stand.addChild(pane);
          panes.push(pane);
        }
        /* Light falls out of a window onto the ground in front of the house,
           and the pane itself glows. */
        const front = building.y + building.height + 3;
        const pool = this.lights.add(spot.x, front, Math.max(40, spot.w * 3.4), 0xffb45a, 0);
        pool.height = Math.max(8, front - (spot.y + spot.h));
        if (!spot.door) pool.glowAt(spot.x, spot.y + spot.h / 2, Math.max(spot.w, spot.h) * 0.9);
        pools.push(pool);
      }
      this.homes.push({ building, panes, pools, when: 0.2 + Math.random() * 0.4, on: 0 });
    }
  }

  private tickHomes(look: SkyLook, seconds: number): void {
    const night = Math.min(1, Math.max(0, (look.dark - 0.12) / 0.5));
    for (const home of this.homes) {
      const glow = home.mood ? WINDOW[home.mood] : null;
      const hearth = look.dark > home.when;
      const want = glow ? glow.strength : hearth ? 0.75 : 0;
      home.on += (want - home.on) * Math.min(1, seconds * 1.5);
      const color = glow?.color ?? 0xffb45a;
      const flicker = 0.94 + Math.random() * 0.06;
      const pane = home.on * night * flicker;
      for (const one of home.panes) {
        one.visible = pane > 0.01;
        one.tint = color;
        one.alpha = Math.min(0.85, pane * 0.9);
      }
      for (const one of home.pools) {
        one.tint = color;
        one.alpha = home.on * 0.75 * flicker;
      }
    }
  }

  /**
   * How long since each district's project was last committed to, and so how
   * overgrown it is: nothing under a week, all of it after two months.
   */
  setAges(byDistrict: Map<string, number>): void {
    const cells = new Map<string, number>();
    const now = Date.now();
    for (const district of this.input.districts) {
      const last = byDistrict.get(district.id);
      if (last === undefined) continue;
      const days = (now - last) / 86_400_000;
      const age = Math.max(0, Math.min(1, (days - 7) / 53));
      if (age <= 0) continue;
      for (const [x, y0, y1] of district.cells) {
        for (let y = y0; y <= y1; y++) cells.set(`${x},${y}`, age);
      }
    }
    this.moss?.texture.destroy(true);
    this.moss = mossTexture(cells, CELL);
    this.overgrow(cells);
  }

  /** Whether the grade is on this frame, which the sea needs to know. */
  get graded(): boolean {
    return this.applied;
  }

  /** The village is dimmed behind a board: the air holds still. */
  setQuiet(quiet: boolean): void {
    this.quiet = quiet;
  }

  /**
   * One frame of the sky. Says whether anything moved that wants drawing.
   *
   * Cheap when it is not drawing: the sky still eases, because it is a clock,
   * but nothing that only exists to be seen is moved.
   */
  tick(screen: { width: number; height: number }): void {
    const now = performance.now();
    if (!drawingNow()) return;
    const seconds = Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    this.time += seconds;
    const look = this.sky.tick(seconds);
    const view = screenInWorld(this.input.world, screen.width, screen.height);

    this.tickFire(look, seconds, view);
    this.tickLamps(look, seconds);
    this.tickHomes(look, seconds);
    this.tickSmoke(look, seconds, view);
    this.tickWalkerLights(look);
    if (!this.quiet) {
      this.tickBugs(look, seconds, view);
      this.tickGulls(look, seconds);
      this.tickLeaves(look, seconds, view);
      this.tickFish(look, seconds, view);
    }
    this.tickWeather(look, seconds, screen);

    /* Flags are dimmed by half what everything else is, so a project's face
       still reads from out on the water at midnight. */
    const half = (v: number): number => Math.round(Math.min(1, 1 - (1 - v) * 0.5) * 255);
    this.input.flags.tint =
      (half(look.ambient[0]) << 16) | (half(look.ambient[1]) << 8) | half(look.ambient[2]);

    const needed = Grade.needed(look, !!this.moss);
    const world = this.input.world;
    if (needed) {
      if (!this.applied) {
        this.input.frame.addChildAt(this.grade.mesh, 0);
        this.applied = true;
      }
      const light = this.lights.draw(
        this.input.renderer,
        world,
        screen.width,
        screen.height,
        view,
        look
      );
      this.grade.set(look, light, screen, world.worldTransform.clone().invert(), this.moss);
      this.grade.photograph(
        this.input.renderer,
        this.input.camera,
        world,
        screen.width,
        screen.height
      );
    } else if (this.applied) {
      this.grade.off(world);
      this.applied = false;
    }
  }

  destroy(): void {
    setFalling(false);
    this.lights.destroy();
    this.rain.destroy({ children: true });
    this.air.destroy({ children: true });
    for (const weed of this.weeds) weed.destroy();
    this.moss?.texture.destroy(true);
    this.flames?.destroy();
    this.grade.off(this.input.world);
    this.grade.destroy();
  }

  /* ── where things are ──────────────────────────────────────────────── */

  /**
   * What stands on the ground and blocks light, as rectangles in world
   * pixels: the walls of every building (its lower part, the roof being over
   * them), the foot of every tree and rock and barrel, and fences, which let
   * some through.
   */
  private occluders(): { x: number; y: number; w: number; h: number; tall: number }[] {
    const out: { x: number; y: number; w: number; h: number; tall: number }[] = [];
    const { layout } = this.input;
    for (const b of this.input.buildings) {
      const prefab = layout.objects[b.object]?.prefab ?? '';
      if (/Dock/.test(prefab)) continue;
      const top = b.y + b.height * 0.5;
      // Stops short of the foot, so the doorstep is ground, not wall.
      out.push({ x: b.x + 3, y: top, w: b.width - 6, h: b.y + b.height - top - 9, tall: 96 });
    }
    for (const object of layout.objects) {
      if (object.group !== 'Props' && object.group !== 'Plant') continue;
      const name = object.prefab;
      if (/Grass|Flower|Wheat|Carrot|Cabbage|Pumpkin|Water|Lamp|Lantern|Campfire/.test(name)) {
        continue;
      }
      const sprite = object.sprites.find((one) => one.blend !== 'multiply');
      const w = sprite?.size_px[0] ?? 16;
      const x = object.pos[0] * CELL;
      const y = -object.pos[1] * CELL;
      // How tall each thing stands decides how far its shadow reaches.
      if (/Tree/.test(name)) out.push({ x: x - 5, y: y - 6, w: 10, h: 6, tall: 96 });
      else if (/Fence/.test(name)) out.push({ x: x - w / 2, y: y - 4, w, h: 4, tall: 12 });
      else if (/Bush/.test(name))
        out.push({ x: x - w * 0.3, y: y - 6, w: w * 0.6, h: 6, tall: 14 });
      else out.push({ x: x - w * 0.35, y: y - 6, w: w * 0.7, h: 6, tall: 16 });
    }
    return out;
  }

  private findEmitters(): void {
    const { items, layout } = this.input;
    const known = emitters ?? {};
    const byObject = new Map<number, Spot[]>();
    for (const item of items) {
      if (item.origin.kind !== 'object' || item.multiply) continue;
      const object = layout.objects[item.origin.oi];
      if (!object) continue;
      const name = object.prefab;
      if (/Tree/.test(name) && item.origin.si === 0) {
        this.trees.push({ x: item.x, y: -item.y });
      }
      if (/Bush|Flower/.test(name) && item.origin.si === 0) {
        this.bushes.push({ x: item.x, y: -item.y });
      }
      const marks = known[item.file];
      const isLamp = /Road Lamp|Lantern/.test(name);
      if (marks) {
        for (const [cx, cy] of marks.chimneys ?? []) {
          const at = worldOf(item, cx, cy);
          this.chimneys.push({ ...at, building: item.origin.oi, next: Math.random() * 2 });
        }
        const glass = (marks.windows ?? []).map((one) => ({ one, door: false }));
        const doors = (marks.doors ?? []).map((one) => ({ one, door: true }));
        for (const { one, door } of [...glass, ...doors]) {
          const [wx, wy, ww, wh] = one;
          // Flipped, the pane's right edge is where its left edge was.
          const at = worldOf(item, wx + (item.flip ? ww : 0), wy);
          const list = byObject.get(item.origin.oi) ?? [];
          list.push({ x: at.x + ww / 2, y: at.y, w: ww, h: wh, door });
          byObject.set(item.origin.oi, list);
        }
        for (const [lx, ly] of marks.lamps ?? []) {
          this.addLamp(worldOf(item, lx, ly), isLamp ? -item.y : null, /Campfire/.test(name));
        }
      } else if (isLamp) {
        // Not measured: the glass is near the top of a lamp post.
        this.addLamp(worldOf(item, item.w / 2, item.h * 0.18), -item.y, false);
      }
    }
    for (const [object, spots] of byObject) this.windowSpots.set(object, spots);
  }

  /**
   * A lamp: its light lands on the ground under it, where a post stands or a
   * little below a lantern hung on a wall, and its glass glows where it is.
   */
  private addLamp(at: { x: number; y: number }, foot: number | null, isFire: boolean): void {
    if (isFire) return;
    const ground = { x: at.x, y: foot ?? at.y + 18 };
    // A lantern on a wall throws its light out in front of the wall, not into it.
    for (const b of this.input.buildings) {
      const inside =
        ground.x > b.x && ground.x < b.x + b.width && ground.y > b.y && ground.y < b.y + b.height;
      if (inside) ground.y = b.y + b.height + 4;
    }
    // The kit carries a lantern's lit and unlit pieces both; one lamp is enough.
    if (this.lamps.some((lamp) => Math.hypot(lamp.x - at.x, lamp.y - at.y) < 6)) return;
    const sprite = this.lights.add(ground.x, ground.y, 130, 0xffae5c, 0).glowAt(at.x, at.y, 11);
    sprite.height = Math.max(14, ground.y - at.y);
    // Lit in no particular order as the light goes, a few at a time.
    this.lamps.push({ ...at, sprite, when: 0.25 + Math.random() * 0.35, on: 0 });
  }

  /* ── fire ──────────────────────────────────────────────────────────── */

  private tickFire(look: SkyLook, seconds: number, view: Rect): void {
    const fire = this.input.fire;
    if (!fire) return;
    const t = this.time;
    const flicker =
      0.82 + 0.1 * Math.sin(t * 7.3) + 0.06 * Math.sin(t * 13.1 + 1.3) + 0.05 * Math.random();
    const [outer, inner] = this.fireLights;
    if (outer) {
      outer.alpha = 0.9 * flicker;
      outer.radius = 180 * (0.97 + flicker * 0.05);
    }
    if (inner) inner.alpha = 0.75 * flicker;
    if (this.flames) {
      const frame = folkTexture(`flame-${Math.floor(t * 9) % 4}`);
      if (frame) this.flames.texture = frame;
      // Rain beats it down.
      this.flames.scale.set(1, 1 - look.rain * 0.3);
    }
    if (!inView(view, fire.x, fire.y, 200) || this.quiet) return;
    // Sparks going up, a handful at a time, and smoke over them.
    if (Math.random() < seconds * (9 - look.rain * 6)) {
      const ember = new Sprite(folkTexture('ember') ?? this.pixel);
      ember.position.set(fire.x + (Math.random() * 8 - 4), fire.y - 6);
      ember.tint = Math.random() < 0.5 ? 0xffd27a : 0xff8a3a;
      this.air.addChild(ember);
      this.embers.push({
        sprite: ember,
        age: 0,
        life: 0.8 + Math.random() * 1.2,
        vx: (Math.random() - 0.5) * 10 + look.wind * 20,
        vy: -(18 + Math.random() * 22),
      });
    }
    if (Math.random() < seconds * 2.2) this.puff(fire.x, fire.y - 14, 0xcfc8be, 0.9, look);
    for (let i = this.embers.length - 1; i >= 0; i--) {
      const one = this.embers[i]!;
      one.age += seconds;
      one.sprite.x += one.vx * seconds + Math.sin(one.age * 9) * 0.3;
      one.sprite.y += one.vy * seconds;
      one.sprite.alpha = Math.max(0, 1 - one.age / one.life) * (Math.random() < 0.15 ? 0.3 : 1);
      if (one.age >= one.life) {
        one.sprite.destroy();
        this.embers.splice(i, 1);
      }
    }
  }

  /* ── lamps ─────────────────────────────────────────────────────────── */

  private tickLamps(look: SkyLook, seconds: number): void {
    for (const lamp of this.lamps) {
      const want = look.dark > lamp.when ? 1 : 0;
      // A wick catching: a stutter, then up.
      lamp.on += (want - lamp.on) * Math.min(1, seconds * (want ? 1.2 : 0.6));
      const catching = lamp.on > 0.05 && lamp.on < 0.6 && Math.random() < 0.3 ? 0.4 : 1;
      lamp.sprite.alpha = lamp.on * catching * (0.92 + Math.random() * 0.08);
    }
  }

  /* ── smoke ─────────────────────────────────────────────────────────── */

  private tickSmoke(look: SkyLook, seconds: number, view: Rect): void {
    const working = new Map<number, Look>();
    for (const { building, look: mood } of this.houses) working.set(building.object, mood);
    if (!this.quiet) {
      for (const chimney of this.chimneys) {
        const mood = working.get(chimney.building);
        const district = this.input.layout.objects[chimney.building]?.district ?? '';
        const lived = this.inhabited.has(district);
        if (!mood && !lived) continue;
        if (!inView(view, chimney.x, chimney.y, 120)) continue;
        chimney.next -= seconds;
        if (chimney.next > 0) continue;
        const busy = mood === 'working' || mood === 'wants' || mood === 'arriving';
        const sore = mood === 'broken';
        // A cold evening wants a fire in every hearth.
        const hearth = look.dark > 0.4 || look.snow > 0.1;
        chimney.next = busy ? 0.35 + Math.random() * 0.3 : hearth ? 0.9 : 2.4 + Math.random() * 2;
        this.puff(chimney.x, chimney.y, sore ? 0x4b4643 : 0xe2dfd8, busy ? 0.95 : 0.7, look);
      }
    }
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const puff = this.puffs[i]!;
      puff.age += seconds;
      const life = puff.age / puff.life;
      const grown = Math.min(3, Math.floor(life * 4.5));
      const frame = folkTexture(`smoke-${grown}`);
      if (frame && puff.sprite.texture !== frame) puff.sprite.texture = frame;
      puff.sprite.x += (puff.vx + look.wind * 14 * life) * seconds;
      puff.sprite.y += puff.vy * seconds * (1 - life * 0.5);
      puff.sprite.alpha = (puff.sprite as Sprite & { base: number }).base * (1 - life) ** 1.1;
      // Whole steps of size, never a smear: a puff swells as it climbs.
      puff.sprite.scale.set(1 + Math.floor(life * 3) * 0.5);
      if (puff.age >= puff.life) {
        puff.sprite.destroy();
        this.puffs.splice(i, 1);
      }
    }
  }

  private puff(x: number, y: number, tint: number, alpha: number, look: SkyLook): void {
    if (this.puffs.length > 260) return;
    const sprite = new Sprite(folkTexture('smoke-0') ?? this.pixel) as Sprite & { base: number };
    sprite.anchor.set(0.5, 0.5);
    sprite.position.set(Math.round(x + (Math.random() * 2 - 1)), Math.round(y));
    sprite.tint = tint;
    sprite.base = alpha * (1 - look.rain * 0.4);
    sprite.alpha = sprite.base;
    this.air.addChild(sprite);
    this.puffs.push({
      sprite,
      age: 0,
      life: 3 + Math.random() * 2 - look.wind * 1.2,
      vx: (Math.random() - 0.5) * 3,
      vy: -(9 + Math.random() * 5) * (1 - look.wind * 0.4),
    });
  }

  /* ── lanterns carried ──────────────────────────────────────────────── */

  private tickWalkerLights(look: SkyLook): void {
    const seen = new Set<unknown>();
    if (this.walkers && look.dark > 0.45) {
      for (const walker of this.walkers.positions()) {
        seen.add(walker);
        let light = this.walkerLights.get(walker);
        if (!light) {
          light = this.lights.add(walker.x, walker.y, 46, 0xffc884, 0.7);
          this.walkerLights.set(walker, light);
        }
        light.position.set(walker.x + 3, walker.y + 1);
        light.glowAt(walker.x + 5, walker.y - 9, 5);
        light.alpha = 0.6 + Math.random() * 0.08;
      }
    }
    for (const [key, light] of this.walkerLights) {
      if (seen.has(key)) continue;
      light.destroy();
      this.walkerLights.delete(key);
    }
  }

  /* ── small life ────────────────────────────────────────────────────── */

  private tickBugs(look: SkyLook, seconds: number, view: Rect): void {
    // Fireflies: after dark, dry, not in snow.
    const fireflies = look.dark > 0.55 && look.rain < 0.1 && look.cover < 0.3 ? 22 : 0;
    this.keepBugs(this.bugs, fireflies, this.bushes.length ? this.bushes : this.trees, (home) => {
      const sprite = new Sprite(folkTexture('firefly') ?? this.pixel);
      sprite.tint = 0xe8ff8a;
      const light = this.lights.add(home.x, home.y, 16, 0xd8ff70, 0.8).glowAt(home.x, home.y, 4);
      return { sprite, light };
    });
    for (const bug of this.bugs) {
      bug.phase += seconds;
      bug.vx += (Math.random() - 0.5) * 30 * seconds;
      bug.vy += (Math.random() - 0.5) * 30 * seconds;
      bug.vx += (bug.home.x - bug.x) * 0.02 * seconds;
      bug.vy += (bug.home.y - 14 - bug.y) * 0.02 * seconds;
      bug.vx *= 0.98;
      bug.vy *= 0.98;
      bug.x += bug.vx * seconds;
      bug.y += bug.vy * seconds;
      const blink = Math.max(0, Math.sin(bug.phase * 1.7 + bug.home.x)) ** 3;
      bug.sprite.position.set(Math.round(bug.x), Math.round(bug.y));
      bug.sprite.alpha = 0.25 + blink * 0.75;
      if (bug.light) {
        bug.light.position.set(bug.x, bug.y + 8);
        bug.light.glowAt(bug.x, bug.y, 4);
        bug.light.alpha = blink * 0.7;
      }
    }
    // Butterflies: a bright dry day.
    const flutter =
      look.dark < 0.2 && look.rain < 0.05 && look.cloud < 0.6 && look.cover < 0.2 && !look.autumn
        ? 7
        : look.dark < 0.2 && look.rain < 0.05 && look.cloud < 0.6 && look.cover < 0.2
          ? 3
          : 0;
    this.keepBugs(this.butterflies, flutter, this.bushes, () => ({
      sprite: new Sprite(
        folkTexture(Math.random() < 0.5 ? 'butterfly-0' : 'butterfly-b-0') ?? this.pixel
      ),
    }));
    for (const bug of this.butterflies) {
      bug.phase += seconds;
      bug.vx += (Math.random() - 0.5) * 120 * seconds;
      bug.vy += (Math.random() - 0.5) * 120 * seconds;
      bug.vx += (bug.home.x - bug.x) * 0.25 * seconds;
      bug.vy += (bug.home.y - 10 - bug.y) * 0.25 * seconds;
      bug.vx *= 0.93;
      bug.vy *= 0.93;
      bug.x += (bug.vx + look.wind * 6) * seconds;
      bug.y += bug.vy * seconds;
      const which =
        (bug.sprite as Sprite & { kind?: string }).kind ??
        (bug.sprite.texture === folkTexture('butterfly-b-0') ? 'b' : 'a');
      (bug.sprite as Sprite & { kind?: string }).kind = which;
      const name = which === 'b' ? 'butterfly-b' : 'butterfly';
      const frame = folkTexture(`${name}-${Math.floor(bug.phase * 8) % 2}`);
      if (frame) bug.sprite.texture = frame;
      bug.sprite.position.set(Math.round(bug.x), Math.round(bug.y));
      if (!inView(view, bug.x, bug.y, 400)) bug.home = pick(this.bushes) ?? bug.home;
    }
  }

  private keepBugs(
    list: Bug[],
    want: number,
    homes: readonly { x: number; y: number }[],
    make: (home: { x: number; y: number }) => { sprite: Sprite; light?: Light }
  ): void {
    while (list.length > want) {
      const bug = list.pop()!;
      bug.sprite.destroy();
      bug.light?.destroy();
    }
    while (list.length < want && homes.length) {
      const home = pick(homes)!;
      const made = make(home);
      made.sprite.anchor.set(0.5);
      this.air.addChild(made.sprite);
      list.push({
        ...made,
        x: home.x + (Math.random() - 0.5) * 30,
        y: home.y - 10 - Math.random() * 10,
        vx: 0,
        vy: 0,
        phase: Math.random() * 10,
        home,
      });
    }
  }

  private tickGulls(look: SkyLook, seconds: number): void {
    const want = look.dark < 0.35 && look.rain < 0.5 && look.snow < 0.3 ? 3 : 0;
    const box = this.input.extent;
    while (this.gulls.length > want) {
      const gull = this.gulls.pop()!;
      gull.sprite.destroy();
      gull.shadow.destroy();
    }
    while (this.gulls.length < want) {
      const sprite = new Sprite(folkTexture('gull-0') ?? this.pixel);
      sprite.anchor.set(0.5);
      const shadow = new Sprite(folkTexture('gull-0') ?? this.pixel);
      shadow.anchor.set(0.5);
      shadow.tint = SHADOW_TINT;
      shadow.blendMode = 'multiply';
      this.air.addChildAt(shadow, 0);
      this.air.addChild(sprite);
      this.gulls.push({
        sprite,
        shadow,
        cx: box.x + box.width * (0.2 + Math.random() * 0.6),
        cy: box.y + box.height * (0.2 + Math.random() * 0.6),
        r: 120 + Math.random() * 260,
        angle: Math.random() * Math.PI * 2,
        speed: (0.08 + Math.random() * 0.08) * (Math.random() < 0.5 ? 1 : -1),
      });
    }
    for (const gull of this.gulls) {
      gull.angle += gull.speed * seconds * (1 + look.wind);
      gull.cx += look.wind * 8 * seconds;
      const x = gull.cx + Math.cos(gull.angle) * gull.r;
      const y = gull.cy + Math.sin(gull.angle) * gull.r * 0.6;
      // A gull flaps a few times and glides.
      const glide = Math.sin(this.time * 0.9 + gull.r) > 0.2;
      const frame = folkTexture(`gull-${glide ? 0 : Math.floor(this.time * 7) % 4}`);
      if (frame) {
        gull.sprite.texture = frame;
        gull.shadow.texture = frame;
      }
      gull.sprite.position.set(Math.round(x), Math.round(y));
      gull.sprite.scale.x = Math.sign(-Math.sin(gull.angle) * gull.speed) || 1;
      gull.shadow.position.set(Math.round(x + 26), Math.round(y + 44));
      gull.shadow.scale.x = gull.sprite.scale.x;
      gull.shadow.alpha = 0.5 * (1 - look.cloud * 0.7);
    }
  }

  private tickLeaves(look: SkyLook, seconds: number, view: Rect): void {
    if (look.autumn && this.trees.length && this.leaves.length < 40) {
      const chance = seconds * (0.8 + look.wind * 3);
      if (Math.random() < chance) {
        const near = this.trees.filter((tree) => inView(view, tree.x, tree.y, 40));
        const tree = pick(near);
        if (tree) {
          const sprite = new Sprite(folkTexture('leaf-0') ?? this.pixel);
          sprite.anchor.set(0.5);
          sprite.tint = pick([0xffffff, 0xffd08a, 0xd88a4a]) ?? 0xffffff;
          this.air.addChild(sprite);
          this.leaves.push({
            sprite,
            x: tree.x + (Math.random() - 0.5) * 40,
            y: tree.y - 30 - Math.random() * 40,
            floor: tree.y + Math.random() * 18,
            vx: (Math.random() - 0.5) * 6,
            age: 0,
          });
        }
      }
    }
    for (let i = this.leaves.length - 1; i >= 0; i--) {
      const leaf = this.leaves[i]!;
      leaf.age += seconds;
      if (leaf.y < leaf.floor) {
        leaf.x += (leaf.vx + look.wind * 22 + Math.sin(leaf.age * 3) * 8) * seconds;
        leaf.y += (7 + Math.cos(leaf.age * 3) * 3) * seconds;
        const frame = folkTexture(`leaf-${Math.floor(leaf.age * 4) % 2}`);
        if (frame) leaf.sprite.texture = frame;
      } else {
        leaf.sprite.alpha -= seconds * 0.12;
      }
      leaf.sprite.position.set(Math.round(leaf.x), Math.round(leaf.y));
      if (leaf.sprite.alpha <= 0) {
        leaf.sprite.destroy();
        this.leaves.splice(i, 1);
      }
    }
  }

  private tickFish(look: SkyLook, seconds: number, view: Rect): void {
    this.nextFish -= seconds;
    if (this.nextFish <= 0 && look.dark < 0.6 && look.cover < 0.5) {
      this.nextFish = 5 + Math.random() * 10;
      const spot = this.shoreIn(view);
      if (spot) {
        const sprite = new Sprite(folkTexture('fish-0') ?? this.pixel);
        sprite.anchor.set(0.5, 1);
        sprite.position.set(spot.x, spot.y);
        sprite.scale.x = Math.random() < 0.5 ? 1 : -1;
        this.air.addChild(sprite);
        this.fish.push({ sprite, age: 0, x: spot.x, y: spot.y });
      }
    }
    for (let i = this.fish.length - 1; i >= 0; i--) {
      const one = this.fish[i]!;
      one.age += seconds;
      const leap = Math.floor(one.age / 0.16);
      const name = leap < 3 ? `fish-${leap}` : leap < 6 ? `splash-${leap - 3}` : null;
      const frame = name ? folkTexture(name) : undefined;
      if (!frame) {
        one.sprite.destroy();
        this.fish.splice(i, 1);
        continue;
      }
      one.sprite.texture = frame;
      one.sprite.position.set(
        Math.round(one.x + (leap < 3 ? leap * 2 * one.sprite.scale.x : 6 * one.sprite.scale.x)),
        Math.round(one.y - (leap < 3 ? Math.sin((leap / 2) * Math.PI) * 6 : 0))
      );
    }
  }

  /** A patch of water just off the coast, in view. */
  private shoreIn(view: Rect): { x: number; y: number } | null {
    const land = this.input.land;
    for (let tries = 0; tries < 30; tries++) {
      const x = view.x + Math.random() * view.width;
      const y = view.y + Math.random() * view.height;
      const cx = Math.floor(x / CELL);
      const cy = Math.floor(-y / CELL);
      if (land.has(`${cx},${cy}`)) continue;
      let near = false;
      for (let dx = -3; dx <= 3 && !near; dx++) {
        for (let dy = -3; dy <= 3 && !near; dy++)
          if (land.has(`${cx + dx},${cy + dy}`)) near = true;
      }
      // Not hard up against the rock, where the foam is.
      const close = [-1, 0, 1].some((dx) =>
        [-1, 0, 1].some((dy) => land.has(`${cx + dx},${cy + dy}`))
      );
      if (near && !close) return { x: Math.round(x), y: Math.round(y) };
    }
    return null;
  }

  /* ── rain and snow ─────────────────────────────────────────────────── */

  private tickWeather(
    look: SkyLook,
    seconds: number,
    screen: { width: number; height: number }
  ): void {
    const area = screen.width * screen.height;
    const rain = look.rain > 0.02 ? Math.min(650, Math.round((area / 2600) * look.rain)) : 0;
    const snow = look.snow > 0.02 ? Math.min(520, Math.round((area / 3200) * look.snow)) : 0;
    const want = this.quiet ? 0 : rain || snow;
    const snowing = snow > rain;
    setFalling(want > 0);
    const zoom = Math.max(1, Math.round(Math.abs(this.input.world.worldTransform.a) * 1.5));
    while (this.drops.length > want) {
      const drop = this.drops.pop()!;
      this.rain.removeParticle(drop.particle);
    }
    while (this.drops.length < want) {
      const particle = new Particle({ texture: this.pixel, anchorX: 0.5, anchorY: 1 });
      this.rain.addParticle(particle);
      const drop: Drop = {
        particle,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        land: 0,
        splash: 0,
        phase: Math.random() * 10,
      };
      this.reseed(drop, screen, look, snowing, zoom, true);
      this.drops.push(drop);
    }
    if (!this.drops.length) return;
    // Rain is lit by the sky it falls through, and by the lightning.
    const [r, g, b] = look.ambient;
    const shade = (v: number): number =>
      Math.min(255, Math.round((v * 0.85 + look.flash * 0.6) * 255));
    const tint = (shade(r) << 16) | (shade(g) << 8) | shade(Math.min(1.2, b * 1.05));
    for (const drop of this.drops) {
      const p = drop.particle;
      if (drop.splash > 0) {
        drop.splash -= seconds;
        // Landed: a splash a couple of pixels wide, then gone.
        p.scaleX = zoom * 3;
        p.scaleY = zoom;
        p.alpha = 0.5;
        if (drop.splash <= 0) this.reseed(drop, screen, look, snowing, zoom, false);
        continue;
      }
      drop.phase += seconds;
      const sway = snowing ? Math.sin(drop.phase * 1.6) * 14 : 0;
      drop.x += (drop.vx + sway) * seconds;
      drop.y += drop.vy * seconds;
      if (drop.x < -20) drop.x += screen.width + 40;
      if (drop.x > screen.width + 20) drop.x -= screen.width + 40;
      p.x = Math.round(drop.x / zoom) * zoom;
      p.y = Math.round(drop.y / zoom) * zoom;
      p.tint = snowing ? 0xffffff : tint;
      if (drop.y >= drop.land) {
        if (snowing) this.reseed(drop, screen, look, snowing, zoom, false);
        else drop.splash = 0.09;
      }
    }
  }

  private reseed(
    drop: Drop,
    screen: { width: number; height: number },
    look: SkyLook,
    snowing: boolean,
    zoom: number,
    anywhere: boolean
  ): void {
    const p = drop.particle;
    const depth = Math.random();
    drop.x = Math.random() * (screen.width + 80) - 40;
    drop.y = anywhere ? Math.random() * screen.height : -20 - Math.random() * 60;
    drop.land = drop.y + 40 + Math.random() * (screen.height - drop.y + 40);
    drop.splash = 0;
    if (snowing) {
      drop.vy = (22 + depth * 26) * zoom;
      drop.vx = look.wind * 60 * zoom;
      const size = depth > 0.7 ? 2 : 1;
      p.scaleX = size * zoom;
      p.scaleY = size * zoom;
      p.rotation = 0;
      p.alpha = 0.55 + depth * 0.45;
      p.tint = 0xffffff;
    } else {
      drop.vy = (360 + depth * 260) * zoom;
      drop.vx = look.wind * 160 * zoom;
      p.scaleX = zoom;
      p.scaleY = (5 + Math.round(depth * 5)) * zoom;
      // Leaning the way it is blown.
      p.rotation = -Math.atan2(drop.vx, drop.vy);
      p.alpha = 0.18 + depth * 0.3;
    }
  }

  /* ── overgrowth ────────────────────────────────────────────────────── */

  /**
   * Weeds and brush where nobody has worked: the kit's own grass tufts and
   * bushes, more of them the longer it has been, scattered by a hash of the
   * cell so the same district grows the same way every time it is drawn.
   */
  private overgrow(cells: Map<string, number>): void {
    for (const weed of this.weeds) weed.destroy();
    this.weeds = [];
    const tufts = this.input.layout.objects
      .filter((object) => object.group === 'Grass' || /Bush 0[1-4]/.test(object.prefab))
      .map((object) => object.sprites.find((sprite) => !sprite.blend.includes('multiply'))?.file)
      .filter((file): file is string => !!file);
    const files = [...new Set(tufts)];
    if (!files.length) return;
    for (const [key, age] of cells) {
      const [cx, cy] = key.split(',').map(Number) as [number, number];
      if (!this.input.land.has(key)) continue;
      const h = hash2(cx, cy);
      if (h > age * 0.55) continue;
      const file = files[Math.floor(hash2(cy, cx) * files.length)]!;
      const texture = kitTexture(file);
      if (!texture) continue;
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5, 1);
      const x = cx * CELL + 6 + hash2(cx + 7, cy) * (CELL - 12);
      const y = -cy * CELL - hash2(cx, cy + 7) * (CELL - 8);
      sprite.position.set(Math.round(x), Math.round(y));
      // Weeds lean whichever way: the kit draws its tufts facing one way.
      if (hash2(cx + 3, cy + 5) < 0.5) sprite.scale.x = -1;
      this.input.laneAt(y).addChild(sprite);
      this.weeds.push(sprite);
    }
  }
}

type Rect = { x: number; y: number; width: number; height: number };

/** A pane of glass or a doorway, in world pixels: its middle, its top, its size. */
interface Spot {
  x: number;
  y: number;
  w: number;
  h: number;
  door: boolean;
}

interface Home {
  building: Building;
  panes: Sprite[];
  pools: Light[];
  mood?: Look;
  /** How dark it has to be before an empty house lights its hearth. */
  when: number;
  on: number;
}

function inView(view: Rect, x: number, y: number, pad: number): boolean {
  return (
    x > view.x - pad &&
    x < view.x + view.width + pad &&
    y > view.y - pad &&
    y < view.y + view.height + pad
  );
}

function pick<T>(list: readonly T[]): T | undefined {
  return list[Math.floor(Math.random() * list.length)];
}

function hash2(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** One white pixel, which rain and snow are made of. */
function whitePixel(): Texture {
  return new Texture({
    source: new BufferImageSource({
      resource: new Uint8Array([255, 255, 255, 255]),
      width: 1,
      height: 1,
      scaleMode: 'nearest',
    }),
  });
}
