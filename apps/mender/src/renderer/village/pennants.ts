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
 * south of it still stands in front of it. It is drawn a pixel at a time at the
 * design's own size and then doubled, the same nearest-neighbour pixels as the
 * kit, because a vector flag on this map would be the one soft thing on it.
 *
 * The name is not part of the picture. At the whole-island view the flag is a
 * few screen pixels tall and any writing at its scale is a smudge, so the tag
 * is written in the page, at a whole number of screen pixels per pixel of its
 * own, pinned to the flag's tail.
 */

/** Keep in step with `tools/place-pennants.py`, which measured the room. */
const SIZE = 2;

/* The pennant in the design's own pixels, from the foot of the pole, y down.
   `Pennant Handoff`: pole 4×40, flag 24×18 two pixels in, a swallowtail 8
   deep, a 2px keyline everywhere but the flag's own right edge, a 2px drop
   under the cloth, and a 20×8 shadow at the foot. */
const LEFT = -10;
const TOP = -40;
const WIDE = 46;
const TALL = 42;
const FLAG = { x: 2, y: -40, w: 24, h: 18 };
const TAIL = 8;
/** The tag sits this far past the tail, and is this tall, before scaling. */
const GAP = 4;
const TAG = 18;

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
    this.camera.on('zoomed', this.follow);
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
          one.scale.set(SIZE);
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
    this.camera.off('zoomed', this.follow);
    document.documentElement.removeEventListener('mouseleave', this.away);
    this.tag.remove();
  }

  private readonly away = (): void => this.show(null);

  /* The tag rides the flag's tail, a whole number of its own pixels to every
     screen pixel: as close to the flag's size on screen as that allows, and
     never smaller than the design's own, or the name would not read. */
  private readonly follow = (): void => {
    const post = this.shown ? this.posts.get(this.shown) : undefined;
    if (!post) return;
    const zoom = this.camera.scale.x;
    const scale = Math.min(3, Math.max(1, Math.round(SIZE * zoom)));
    /* Asked of the post itself rather than of the camera: the island sits
       inside the camera at an offset of its own, and the camera's answer is
       off by exactly that, times the zoom. */
    const tail = post.stand.toGlobal({
      x: post.foot.x + (FLAG.x + FLAG.w + TAIL + GAP) * SIZE,
      y: post.foot.y + (FLAG.y + FLAG.h / 2) * SIZE,
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
  const rows = [12, 18, 20, 20, 18, 12];
  rows.forEach((wide, row) => at(-wide / 2, -4 + row, wide, 1, '#fff'));
  const texture = Texture.from(canvas);
  texture.source.scaleMode = 'nearest';
  return texture;
}

/** The flag, a pixel at a time, at the design's own size. */
async function paint(colour: string, one: Flown): Promise<Texture> {
  const [canvas, pen] = sheet();
  const at = pencil(pen);

  at(-2, -40, 4, 40, TIMBER);
  at(-2, -40, 1, 40, OUTLINE);
  at(1, -40, 1, 40, OUTLINE);

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
    pen.drawImage(face, FLAG.x + 5 - LEFT, FLAG.y + 2 - TOP, 14, 14);
  } else {
    /* Silkscreen at twice its own 8px, so every stroke is two whole pixels
       and the letter fills the cloth: at the design's 9px it lands between
       pixels and reads as a smudge the moment the island is small. */
    await document.fonts.load("16px 'Silkscreen'").catch(() => undefined);
    const [letter, letterPen] = sheet();
    const initial = (one.name.trim()[0] ?? '?').toUpperCase();
    letterPen.font = "16px 'Silkscreen'";
    letterPen.textBaseline = 'alphabetic';
    letterPen.fillStyle = OUTLINE;
    // Its advance carries two pixels of spacing after the glyph, not before.
    const wide = letterPen.measureText(initial).width - 2;
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
