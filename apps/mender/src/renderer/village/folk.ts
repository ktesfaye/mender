import {
  Assets,
  Container,
  Sprite,
  type Graphics,
  type Spritesheet,
  type Texture,
  type Ticker,
} from 'pixi.js';
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
  const sheet = await Assets.load<Spritesheet>('./folk/folk.json');
  sheet.textureSource.scaleMode = 'nearest';
  for (const [name, texture] of Object.entries(sheet.textures)) folk.set(name, texture);
  return folk.size;
}

/** One of the villagers' frames, or the critters' and the fire's drawn beside them. */
export function folkTexture(name: string): Texture | undefined {
  return folk.get(name);
}

/** How long a breath is. Slow: a person standing still, not a person panting. */
const BREATH = 900;

/**
 * What a house says from out on the water, which is what its lantern on the
 * rail says: the same handful of states, in the same colours.
 *
 * `empty` is nobody moved in; `idle` is somebody who has stopped with nothing
 * you have not seen, and both are dark, because a light is a reason to go and
 * look and there is none.
 */
export type Look =
  | 'empty'
  | 'arriving'
  | 'working'
  | 'wants'
  | 'done'
  | 'idle'
  | 'waiting'
  | 'broken';

/**
 * Light in the windows, by what is going on behind them.
 *
 * Per ring, and the rings stack, so what lands on the grass is a good deal
 * more than the number on the page. Working is lamplight breathing slowly;
 * wanting you is orange and the only quick thing on the island; something
 * finished you have not seen is a steady green; a limit is a faint red ember
 * and broken a strong red with a slow throb. `pace` is how slow the beat is.
 */
const LIGHT: Record<Look, { color: number; alpha: number; beat: number; pace: number }> = {
  empty: { color: 0xffdf9e, alpha: 0, beat: 0, pace: 420 },
  idle: { color: 0xffdf9e, alpha: 0, beat: 0, pace: 420 },
  arriving: { color: 0xffdf9e, alpha: 0.018, beat: 0, pace: 420 },
  working: { color: 0xffdf9e, alpha: 0.036, beat: 0.012, pace: 1100 },
  wants: { color: 0xff691e, alpha: 0.06, beat: 0.035, pace: 240 },
  done: { color: 0x84dc68, alpha: 0.034, beat: 0, pace: 420 },
  waiting: { color: 0xff6e5a, alpha: 0.022, beat: 0, pace: 420 },
  broken: { color: 0xff5a46, alpha: 0.05, beat: 0.02, pace: 700 },
};

/* The same soft-by-stacking rule the ground's own light is built under: a blur
   is the one thing the kit forbids everywhere, so the falloff is enough rings
   that the banding lands under what you would notice. */
const RINGS = 20;

/* How much a light has to move before the wash is worth cutting again. Well
   under one step of the twenty it is stacked out of, so nothing visible is ever
   sat on; far enough above nothing that an ease which has arrived stops asking. */
const STEP = 0.0004;

/** Who is standing where, and what they are doing. */
export interface Standing {
  /** The task, which is what makes two villagers different people. */
  id: string;
  building: Building;
  look: Look;
}

class Person {
  readonly view = new Container();

  private readonly body = new Sprite();
  private readonly shade = new Sprite();
  private frame = 0;
  private lit = 0;
  /** What this one's light was worth the last time the shape was cut. */
  private cut = -1;

  constructor(
    building: Building,
    public mood: Look
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
    /* Whoever works here walks the island now rather than standing at the
       door; what stays at the house is its light. */
    this.view.visible = false;
    this.turn();
  }

  /** Says whether this actually changed anything, because the colour of the
      light is the mood and a colour is not something an ease can notice. */
  set(mood: Look): boolean {
    if (mood === this.mood) return false;
    this.mood = mood;
    this.turn();
    return true;
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

  /**
   * Ease this one's light on, and say whether it moved far enough to see.
   *
   * The easing has to run every frame or a house lighting up would take as long
   * as the frames are apart. Whether the SHAPE gets cut again is a different
   * question, and mostly the answer is no: a house that has finished arriving at
   * its own brightness sits there, and the only light in the village that never
   * settles is the one belonging to somebody who wants you.
   */
  glow(now: number, by: number): boolean {
    const light = LIGHT[this.mood];
    const want = light.alpha + light.beat * (0.5 + 0.5 * Math.sin(now / light.pace));
    this.lit += (want - this.lit) * by;
    return Math.abs(this.lit - this.cut) > STEP;
  }

  /** The light as it is about to be cut, remembered so the next frame can tell. */
  settled(): { color: number; alpha: number } {
    this.cut = this.lit;
    return { color: LIGHT[this.mood].color, alpha: this.lit };
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
  /** Somebody arrived or left, so the wash has to be laid out again regardless. */
  private recut = true;

  /** `windows` is the ground's own lit layer: light belongs under the trees. */
  constructor(private readonly windows: Graphics) {}

  /** Who is standing where now. Anyone not named has gone. */
  set(standing: readonly Standing[]): void {
    const here = new Set<string>();
    for (const one of standing) {
      here.add(one.id);
      const had = this.people.get(one.id);
      if (had) {
        if (had.set(one.look)) this.recut = true;
        continue;
      }
      const person = new Person(one.building, one.look);
      one.building.stand.addChild(person.view);
      this.people.set(one.id, person);
      this.boxes.set(one.id, one.building);
      this.recut = true;
    }
    for (const [id, person] of this.people) {
      if (here.has(id)) continue;
      person.view.destroy({ children: true });
      this.people.delete(id);
      this.boxes.delete(id);
      this.recut = true;
    }
  }

  /**
   * The light out of the windows, re-cut only when it has actually changed.
   *
   * Twenty stacked ellipses per lit house, and this used to tear all of them
   * down and lay them out again on every single frame — a whole new piece of
   * geometry, sixty times a second, to arrive back at exactly the picture that
   * was already on the screen. An island where nobody is working rebuilt an
   * empty shape forever. The eases still run every frame, because a house
   * lighting up should not wait for anything; the cutting does not.
   */
  tick(ticker: Ticker): void {
    const now = performance.now();
    const by = Math.min(1, ticker.deltaTime * 0.08);
    let moved = this.recut;
    for (const person of this.people.values()) {
      person.tick(now);
      if (person.glow(now, by)) moved = true;
    }
    if (!moved) return;
    this.recut = false;
    this.windows.clear();
    for (const [id, person] of this.people) {
      const box = this.boxes.get(id);
      const light = person.settled();
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
