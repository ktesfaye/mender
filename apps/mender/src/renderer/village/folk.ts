import {
  Assets,
  Container,
  Sprite,
  type Graphics,
  type Spritesheet,
  type Texture,
  type Ticker,
} from 'pixi.js';
import type { Mood } from '@shared/agents';
import type { Building } from './scene';
import { DOORSTEP, SHADOW_TINT } from './scene';

/**
 * The villagers.
 *
 * An agent working in a task is somebody standing at that building, and what
 * they are doing is the only status this app has. There is no badge, no spinner
 * and no coloured dot anywhere: from out on the water you see which houses have
 * their lights on, and whether the person outside one is turned away and busy
 * or turned towards you and waiting.
 *
 * Two sprites and a wash of light, which is all the character art there is —
 * the kit's four placeholder people, never used in the artist's own demo, with
 * no walk cycle and nothing animated. So nobody walks anywhere yet. They stand
 * at their door, they breathe, and they turn round when they want you.
 */

/**
 * The villagers' own art, which is ours.
 *
 * The kit's four "character" files are an unfinished template — a featureless
 * slab with cat ears, taller than the doors of the houses it would stand at,
 * and never used in the artist's own demo. `tools/make-folk.py` draws these
 * instead: the kit's outline colour, a height that fits its doorways, a front
 * and a back and two frames of breath each.
 */
const folk = new Map<string, Texture>();

export async function loadFolk(): Promise<number> {
  if (folk.size) return folk.size;
  const sheet = await Assets.load<Spritesheet>('/folk/folk.json');
  sheet.textureSource.scaleMode = 'nearest';
  for (const [name, texture] of Object.entries(sheet.textures)) folk.set(name, texture);
  return folk.size;
}

/** How long a breath is. Slow: a person standing still, not a person panting. */
const BREATH = 900;

/**
 * Light in the windows, by what is going on behind them.
 *
 * Per ring, and the rings stack, so what lands on the grass is a good deal
 * more than the number on the page. Lamplight through a window at dusk,
 * not a searchlight: a house nobody is busy in should be something you notice
 * on the second look, and the one that wants you should be the only thing on
 * the island that moves.
 */
const LIGHT: Record<Mood, { color: number; alpha: number; beat: number }> = {
  empty: { color: 0xffdf9e, alpha: 0, beat: 0 },
  arriving: { color: 0xffdf9e, alpha: 0.018, beat: 0 },
  working: { color: 0xffdf9e, alpha: 0.042, beat: 0.008 },
  asking: { color: 0xffc46a, alpha: 0.055, beat: 0.022 },
  resting: { color: 0xffdf9e, alpha: 0.03, beat: 0 },
  hurt: { color: 0xff7a52, alpha: 0.048, beat: 0 },
};

/* The same soft-by-stacking rule the ground's own light is built under: a blur
   is the one thing the kit forbids everywhere, so the falloff is enough rings
   that the banding lands under what you would notice. */
const RINGS = 20;

/** Who is standing where, and what they are doing. */
export interface Standing {
  /** The task, which is what makes two villagers different people. */
  id: string;
  building: Building;
  mood: Mood;
}

class Person {
  readonly view = new Container();

  private readonly body = new Sprite();
  private readonly shade = new Sprite();
  private frame = 0;
  private lit = 0;

  constructor(
    building: Building,
    public mood: Mood
  ) {
    const shadow = folk.get('shadow');
    if (shadow) this.shade.texture = shadow;
    this.shade.anchor.set(0.5, 0.7);
    this.shade.blendMode = 'multiply';
    this.shade.tint = SHADOW_TINT;
    this.body.anchor.set(0.5, 1);

    /* On the doorstep: the middle of the south face, out far enough to be
       standing on the ground rather than sunk into the wall. The same offset
       the scene used to claim this one's place in the draw order. */
    this.view.x = Math.round(building.doorX);
    this.view.y = Math.round(building.y + building.height + DOORSTEP);
    this.view.addChild(this.shade, this.body);
    this.turn();
  }

  set(mood: Mood): void {
    if (mood === this.mood) return;
    this.mood = mood;
    this.turn();
  }

  /**
   * Breathing, and the one thing that ever moves.
   *
   * Two drawn frames rather than a sprite nudged up and down: moving the whole
   * body is a hop, and half a pixel of it is the sprite going soft, which is
   * what nearest filtering everywhere else exists to prevent. Somebody working
   * breathes faster than somebody standing about.
   */
  tick(now: number): void {
    const pace = this.mood === 'working' ? BREATH * 0.55 : BREATH;
    const frame = Math.floor(now / pace) % 2;
    if (frame === this.frame) return;
    this.frame = frame;
    this.turn();
  }

  /** How much light this one is throwing right now, eased. */
  glow(now: number, by: number): { color: number; alpha: number } {
    const light = LIGHT[this.mood];
    const want = light.alpha + light.beat * (0.5 + 0.5 * Math.sin(now / 420));
    this.lit += (want - this.lit) * by;
    return { color: light.color, alpha: this.lit };
  }

  private turn(): void {
    // Busy means turned away from you. Anything else means turned towards you,
    // because anything else is a person who has stopped.
    const facing = this.mood === 'working' ? 'back' : 'front';
    const art = folk.get(`${facing}-${this.frame}`);
    if (art) this.body.texture = art;
    this.body.visible = this.mood !== 'empty';
    this.shade.visible = this.mood !== 'empty';
  }
}

export class Folk {
  private readonly people = new Map<string, Person>();
  private readonly boxes = new Map<string, Building>();

  /** `windows` is the ground's own lit layer: light belongs under the trees. */
  constructor(private readonly windows: Graphics) {}

  /** Who is standing where now. Anyone not named has gone. */
  set(standing: readonly Standing[]): void {
    const here = new Set<string>();
    for (const one of standing) {
      here.add(one.id);
      const had = this.people.get(one.id);
      if (had) {
        had.set(one.mood);
        continue;
      }
      const person = new Person(one.building, one.mood);
      one.building.stand.addChild(person.view);
      this.people.set(one.id, person);
      this.boxes.set(one.id, one.building);
    }
    for (const [id, person] of this.people) {
      if (here.has(id)) continue;
      person.view.destroy({ children: true });
      this.people.delete(id);
      this.boxes.delete(id);
    }
  }

  tick(ticker: Ticker): void {
    const now = performance.now();
    const by = Math.min(1, ticker.deltaTime * 0.08);
    this.windows.clear();
    for (const [id, person] of this.people) {
      person.tick(now);
      const box = this.boxes.get(id);
      const light = person.glow(now, by);
      if (!box || light.alpha <= 0.001) continue;
      this.spill(box, light.color, light.alpha);
    }
  }

  /** Light out of one building, falling on the ground around it. */
  private spill(box: Building, color: number, alpha: number): void {
    const cx = box.doorX;
    const cy = box.y + box.height * 0.78;
    const rx = box.width * 0.72;
    const ry = box.height * 0.5;
    for (let i = 0; i < RINGS; i++) {
      const at = 1 - i / RINGS;
      this.windows.ellipse(cx, cy, rx * at, ry * at).fill({ color, alpha });
    }
  }
}
