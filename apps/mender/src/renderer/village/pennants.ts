import type { Viewport } from 'pixi-viewport';
import { Sprite, Texture, type Container } from 'pixi.js';
import { SHADOW_TINT, type Foot } from './scene';

/**
 * A pennant on every district somebody lives in.
 *
 * Out on the water the island is light and posture and nothing else, which
 * says who is working but never where: every district is somebody's project
 * and none of them said whose. So each one flies a small flag in its own
 * colour with the project's face on the cloth, and pointing at the district
 * unfurls its name beside it.
 *
 * The flag is part of the picture, not laid over it. It stands where
 * `tools/place-pennants.py` measured a post would go — grass beside a path,
 * out in front of the district's main house, clear of everything the artist
 * drew — and it takes its place in the draw order like any barrel, so a tree
 * south of it still stands in front of it. It is drawn a pixel at a time, the
 * same nearest-neighbour pixels as the kit, because a vector flag on this map
 * would be the one soft thing on it.
 *
 * It never gets smaller on screen than its own pixels, one to one. Shrunk with
 * the map to the whole-island view the logo was a few screen pixels across and
 * the name tag beside it towered over the flag it belonged to; now the flag
 * holds its size as the camera pulls back and covers more of the map instead,
 * which is why `tools/place-pennants.py` measures its room at the size it
 * reaches at the whole-island view. Closer in than one to one it grows with
 * the map, up to three.
 *
 * The name is written in the page, the same height as the cloth and a whole
 * number of screen pixels per pixel of its own, pinned to the flag's tail.
 */

/* The pennant in its own pixels, from the foot of the pole, y down. The
   handoff's pennant, re-cut shorter and broader so the cloth is most of it: a
   pole 4×30, a 26×22 cloth two pixels in with an 18px face, a swallowtail 7
   deep, a 2px keyline everywhere but the cloth's own right edge and a 2px drop
   under it. Keep in step with `tools/place-pennants.py`. */
const LEFT = -10;
const TOP = -30;
const WIDE = 47;
const TALL = 32;
const FLAG = { x: 2, y: -30, w: 26, h: 22 };
const TAIL = 7;
const FACE = 18;
/** The tag sits this far past the tail, and is as tall as the cloth. */
const GAP = 4;
const TAG = FLAG.h;
/** The most screen pixels any pixel of it is ever drawn at. */
const LARGEST = 3;

const OUTLINE = '#482510';
const TIMBER = '#573723';

/** The eleven, in his order: a district keeps its colour for as long as it stands. */
const COLOURS: Record<string, string> = {
  A: '#efc64b',
  B: '#d18b2c',
  C: '#c9674f',
  D: '#b86f93',
  E: '#8f7cc0',
  F: '#5f8fc4',
  G: '#4fa3a0',
  H: '#86a84a',
  I: '#e3cf9a',
  J: '#e39b6a',
  K: '#a9b6d0',
};

export interface Flown {
  /** The district it stands on. */
  district: string;
  name: string;
  icon?: string;
}

/** Where every district's post stands, measured once and shipped. */
export async function loadFeet(): Promise<Map<string, Foot>> {
  try {
    const read = (await (await fetch('./village/pennants.json')).json()) as {
      feet: Record<string, [number, number]>;
    };
    return new Map(Object.entries(read.feet).map(([id, [x, y]]) => [id, { x, y }]));
  } catch {
    return new Map();
  }
}

interface Post {
  foot: Foot;
  stand: Container;
  sprite: Sprite | null;
  under: Sprite | null;
  /** What it was last painted with, so an unchanged project is not repainted. */
  painted: string;
}

export class Pennants {
  private readonly posts = new Map<string, Post>();
  private readonly flying = new Map<string, Flown>();
  private readonly tag: HTMLDivElement;
  private readonly words: HTMLSpanElement;
  private shown: string | null = null;

  constructor(
    feet: Map<string, Foot>,
    stands: readonly Container[],
    private readonly camera: Viewport
  ) {
    [...feet.entries()].forEach(([district, foot], at) => {
      const stand = stands[at];
      if (stand) this.posts.set(district, { foot, stand, sprite: null, under: null, painted: '' });
    });
    this.tag = document.createElement('div');
    this.tag.className = 'pennant-tag';
    this.words = document.createElement('span');
    this.tag.append(this.words);
    document.body.append(this.tag);
    this.camera.on('moved', this.follow);
    // Leaving the window is leaving the district; nothing else will say so.
    document.documentElement.addEventListener('mouseleave', this.away);
  }

  /** Who is flying a flag now. Anyone not named has taken theirs down. */
  set(flown: readonly Flown[]): void {
    this.flying.clear();
    for (const one of flown) this.flying.set(one.district, one);
    for (const [district, post] of this.posts) {
      const one = this.flying.get(district);
      const key = one ? `${one.name}\u0000${one.icon ?? ''}` : '';
      if (key === post.painted) continue;
      post.painted = key;
      post.sprite?.destroy({ texture: true, textureSource: true });
      post.under?.destroy({ texture: true, textureSource: true });
      post.sprite = null;
      post.under = null;
      if (!one) continue;
      void paint(COLOURS[district] ?? COLOURS.A, one).then((texture) => {
        if (post.painted !== key) {
          texture.destroy(true);
          return;
        }
        const sprite = new Sprite(texture);
        const under = new Sprite(shade());
        under.blendMode = 'multiply';
        under.tint = SHADOW_TINT;
        for (const one of [under, sprite]) {
          one.anchor.set(-LEFT / WIDE, -TOP / TALL);
          one.scale.set(this.across());
          one.position.set(post.foot.x, post.foot.y);
          post.stand.addChild(one);
        }
        post.sprite = sprite;
        post.under = under;
      });
    }
    if (this.shown && !this.flying.has(this.shown)) this.show(null);
  }

  /** Unfurl the name on whichever district is under the pointer, or none. */
  show(district: string | null): void {
    const one = district ? this.flying.get(district) : undefined;
    const want = one && this.posts.has(one.district) ? one.district : null;
    if (want === this.shown) return;
    this.shown = want;
    if (!want || !one) {
      this.tag.classList.remove('open');
      return;
    }
    this.words.textContent = one.name;
    this.tag.style.setProperty('--pennant', COLOURS[want] ?? COLOURS.A);
    this.follow();
    // Restart the unfurl rather than showing it already open.
    this.tag.classList.remove('open');
    void this.tag.offsetWidth;
    this.tag.classList.add('open');
  }

  destroy(): void {
    this.camera.off('moved', this.follow);
    document.documentElement.removeEventListener('mouseleave', this.away);
    this.tag.remove();
  }

  private readonly away = (): void => this.show(null);

  /** How many screen pixels a pixel of the flag is at this zoom. */
  private onScreen(): number {
    return Math.min(LARGEST, Math.max(1, this.camera.scale.x));
  }

  /** And so how many world pixels, which is what the sprite is scaled by. */
  private across(): number {
    return this.onScreen() / this.camera.scale.x;
  }

  /**
   * Keep the flags their size on screen, every frame.
   *
   * Every frame rather than on the camera's zoom event, because the camera
   * also settles onto a whole pixel after a zoom, by an animation of its own
   * that never says it changed the scale, and a flag that stopped listening
   * before that finished is the wrong size until the next wheel.
   */
  tick(): void {
    const zoom = this.camera.scale.x;
    if (zoom === this.zoom) return;
    this.zoom = zoom;
    this.resize();
  }

  private zoom = 0;

  private resize(): void {
    const scale = this.across();
    for (const post of this.posts.values()) {
      post.sprite?.scale.set(scale);
      post.under?.scale.set(scale);
    }
    this.follow();
  }

  /* The tag rides the flag's tail at the flag's own size on screen, rounded
     to a whole number so its pixels stay whole. */
  private readonly follow = (): void => {
    const post = this.shown ? this.posts.get(this.shown) : undefined;
    if (!post) return;
    const scale = Math.round(this.onScreen());
    const across = this.across();
    /* Asked of the post itself rather than of the camera: the island sits
       inside the camera at an offset of its own, and the camera's answer is
       off by exactly that, times the zoom. */
    const tail = post.stand.toGlobal({
      x: post.foot.x + (FLAG.x + FLAG.w + TAIL + GAP) * across,
      y: post.foot.y + (FLAG.y + FLAG.h / 2) * across,
    });
    this.tag.style.transform = `translate(${Math.round(tail.x)}px, ${Math.round(
      tail.y - (TAG * scale) / 2
    )}px) scale(${scale})`;
  };
}

/**
 * The shade at the pole's foot, the way the kit casts one.
 *
 * Laid down flat at a third it was a brown plate on the path. The kit's own
 * shadows are a white shape multiplied by one warm tint, so they darken the
 * ground they fall on rather than covering it, and this is one of those.
 */
function shade(): Texture {
  const [canvas, pen] = sheet();
  const at = pencil(pen);
  const rows = [10, 14, 16, 14, 10];
  rows.forEach((wide, row) => at(-wide / 2, -3 + row, wide, 1, '#fff'));
  const texture = Texture.from(canvas);
  texture.source.scaleMode = 'nearest';
  return texture;
}

/** The flag, a pixel at a time, at the design's own size. */
async function paint(colour: string, one: Flown): Promise<Texture> {
  const [canvas, pen] = sheet();
  const at = pencil(pen);

  at(-2, TOP, 4, -TOP, TIMBER);
  at(-2, TOP, 1, -TOP, OUTLINE);
  at(1, TOP, 1, -TOP, OUTLINE);

  /* The cloth's drop, cut solid on its own sheet and laid down at half, so the
     keyline and the fill under it do not stack into two shades of shadow. */
  const [drop, dropPen] = sheet();
  cloth(pencil(dropPen), 2, 2, OUTLINE, OUTLINE);
  pen.globalAlpha = 0.5;
  pen.drawImage(drop, 0, 0);
  pen.globalAlpha = 1;
  cloth(at, 0, 0, OUTLINE, colour);

  // The face: its own picture, or the first letter of its name.
  const face = one.icon ? await picture(one.icon) : null;
  if (face) {
    pen.imageSmoothingEnabled = true;
    pen.imageSmoothingQuality = 'high';
    // Inside the keyline, which is on the top, bottom and left only.
    const x = FLAG.x + 2 + (FLAG.w - 2 - FACE) / 2;
    const y = FLAG.y + (FLAG.h - FACE) / 2;
    pen.drawImage(face, x - LEFT, y - TOP, FACE, FACE);
  } else {
    /* Silkscreen at three times its own 8px, so every stroke is three whole
       pixels and the letter fills the cloth the way a face would: at the
       design's 9px it landed between pixels and read as a smudge. */
    await document.fonts.load("24px 'Silkscreen'").catch(() => undefined);
    const [letter, letterPen] = sheet();
    const initial = (one.name.trim()[0] ?? '?').toUpperCase();
    letterPen.font = "24px 'Silkscreen'";
    letterPen.textBaseline = 'alphabetic';
    letterPen.fillStyle = OUTLINE;
    // Its advance carries three pixels of spacing after the glyph, not before.
    const wide = letterPen.measureText(initial).width - 3;
    letterPen.fillText(
      initial,
      Math.round(FLAG.x + 2 + (FLAG.w - 2 - wide) / 2) - LEFT,
      FLAG.y + FLAG.h - 4 - TOP
    );
    crisp(letterPen);
    pen.drawImage(letter, 0, 0);
  }

  const texture = Texture.from(canvas);
  texture.source.scaleMode = 'nearest';
  return texture;
}

function sheet(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = WIDE;
  canvas.height = TALL;
  return [canvas, canvas.getContext('2d') as CanvasRenderingContext2D];
}

type Pencil = (x: number, y: number, w: number, h: number, fill: string) => void;

/** Fill a block given in the pennant's own coordinates, foot at the origin. */
function pencil(pen: CanvasRenderingContext2D): Pencil {
  return (x, y, w, h, fill) => {
    pen.fillStyle = fill;
    pen.fillRect(x - LEFT, y - TOP, w, h);
  };
}

/* The flag body with its keyline on three sides and the swallowtail after it.
   The notch's two teeth are stepped a row at a time: a pixel flag with a
   smooth diagonal is the one thing that gives away it was not in the kit. */
function cloth(at: Pencil, dx: number, dy: number, line: string, fill: string): void {
  const { x, y, w, h } = FLAG;
  at(x + dx, y + dy, w, h, line);
  at(x + 2 + dx, y + 2 + dy, w - 2, h - 4, fill);
  const half = h / 2;
  for (let row = 0; row < h; row++) {
    // How far each tooth reaches at this row: all the way at the top and
    // bottom edges, nothing at the middle where the notch comes to its point.
    const out = row < half ? row : h - 1 - row;
    const reach = Math.round(TAIL * (1 - out / half));
    if (reach > 0) at(x + w + dx, y + row + dy, reach, 1, line);
    // The same two pixels of keyline down the notch as round the rest of it.
    if (row < 2 || row >= h - 2 || reach <= 2) continue;
    at(x + w + dx, y + row + dy, reach - 2, 1, fill);
  }
}

/** Snap every half-covered pixel to whole or nothing, so the letter is pixels too. */
function crisp(pen: CanvasRenderingContext2D): void {
  const image = pen.getImageData(0, 0, WIDE, TALL);
  const data = image.data;
  for (let i = 3; i < data.length; i += 4) data[i] = (data[i] ?? 0) < 110 ? 0 : 255;
  pen.putImageData(image, 0, 0);
}

function picture(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}
