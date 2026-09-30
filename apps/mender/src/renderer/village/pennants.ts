import type { Viewport } from 'pixi-viewport';
import { Container, Sprite, Texture } from 'pixi.js';
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
 * the map like everything else on it, all the way in.
 *
 * The logo is the one part that is not pixel art. It is somebody's picture at
 * whatever resolution they made it, and pushed through the flag's own pixel
 * grid it came out as a blocky smudge, so it is its own sprite at full
 * resolution, smoothed, laid on the cloth.
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
const WIDE = 49;
const TALL = 32;
const FLAG = { x: 2, y: -30, w: 26, h: 22 };
const TAIL = 7;
/** The widest a logo's cloth gets before the tail, which is what was measured. */
const WIDEST = 28;
/** The tag sits this far past the tail, and is as tall as the cloth. */
const GAP = 4;
const TAG = FLAG.h;

const OUTLINE = '#482510';
const TIMBER = '#573723';

/**
 * The eleven in his order, then the pieces the big ones give up: a place keeps
 * its colour for as long as it stands.
 */
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
  B2: '#c7a24e',
  A2: '#d9a94a',
  D2: '#9d5f86',
  D3: '#c98fae',
  J2: '#c9845a',
  E2: '#7a6bb0',
  E3: '#a797d4',
  ISLAND: '#e07a8a',
};

/** The islet sails to whatever coast there is, and its post goes with it. Its
    spot is kept where he drew it and moved to wherever it is moored. */
const ISLET = 'ISLAND';
const CELL_PX = 32;
type Moored = readonly [number, number];
const sailed = (district: string, foot: Foot, moored: Moored, way: 1 | -1): Foot =>
  district === ISLET
    ? { x: foot.x + way * moored[0] * CELL_PX, y: foot.y - way * moored[1] * CELL_PX }
    : foot;

export interface Flown {
  /** The district it stands on. */
  district: string;
  name: string;
  icon?: string;
}

/** Where a post was moved to by hand, by district, kept on this machine. */
const MOVED = 'mender.village.flags';

function moved(): Record<string, [number, number]> {
  try {
    const raw = JSON.parse(localStorage.getItem(MOVED) ?? '{}') as unknown;
    return raw && typeof raw === 'object' ? (raw as Record<string, [number, number]>) : {};
  } catch {
    return {};
  }
}

/** Stand a district's post somewhere else from now on. */
export function plantFlag(district: string, at: Foot, moored: Moored = [0, 0]): void {
  const foot = sailed(district, at, moored, -1);
  try {
    localStorage.setItem(
      MOVED,
      JSON.stringify({ ...moved(), [district]: [Math.round(foot.x), Math.round(foot.y)] })
    );
  } catch {
    // Only a convenience; the measured spot is still a good one.
  }
}

/**
 * Where every district's post stands: measured once and shipped, unless it
 * has been picked up and put somewhere else by hand, which wins.
 */
export async function loadFeet(moored: Moored = [0, 0]): Promise<Map<string, Foot>> {
  let feet: Record<string, [number, number]> = {};
  try {
    const read = (await (await fetch('./village/pennants.json')).json()) as {
      feet: Record<string, [number, number]>;
    };
    feet = read.feet;
  } catch {
    // No measured spots; only moved ones stand.
  }
  const all = { ...feet, ...moved() };
  return new Map(
    Object.entries(all)
      .filter(([, at]) => Array.isArray(at) && at.every((n) => Number.isFinite(n)))
      .map(([id, [x, y]]) => [id, sailed(id, { x, y }, moored, 1)])
  );
}

interface Post {
  foot: Foot;
  stand: Container;
  /** The shade, the flag and the logo, standing at the foot, scaled as one. */
  group: Container | null;
  /** Where its tail ends, in its own pixels: a logo's cloth is the logo's shape. */
  reach: number;
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
      if (stand)
        this.posts.set(district, {
          foot,
          stand,
          group: null,
          reach: FLAG.x + FLAG.w + TAIL,
          painted: '',
        });
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
      post.group?.destroy({ children: true, texture: true, textureSource: true });
      post.group = null;
      if (!one) continue;
      void paint(COLOURS[district] ?? COLOURS.A, one).then(({ texture, reach, logo }) => {
        if (post.painted !== key) {
          texture.destroy(true);
          return;
        }
        const group = new Container();
        const under = new Sprite(shade());
        under.blendMode = 'multiply';
        under.tint = SHADOW_TINT;
        const flag = new Sprite(texture);
        for (const one of [under, flag]) one.position.set(LEFT, TOP);
        group.addChild(under, flag);
        if (logo) {
          const picture = Texture.from(logo.image);
          picture.source.scaleMode = 'linear';
          picture.source.autoGenerateMipmaps = true;
          picture.source.updateMipmaps();
          const face = new Sprite(picture);
          face.position.set(logo.x, logo.y);
          face.setSize(logo.w, logo.h);
          group.addChild(face);
        }
        group.position.set(post.foot.x, post.foot.y);
        group.scale.set(this.across());
        post.stand.addChild(group);
        post.group = group;
        post.reach = reach;
        if (this.shown === district) this.follow();
      });
    }
    if (this.shown && !this.flying.has(this.shown)) this.show(null);
  }

  /** Whose flag is under a point on screen, if anybody's. */
  at(x: number, y: number): string | null {
    const across = this.across();
    for (const [district, post] of this.posts) {
      if (!post.group) continue;
      /* Asked of the post rather than of its bounds, for the same reason the
         tag is: the island's own offset in the camera throws the bounds off. */
      const from = post.stand.toGlobal({
        x: post.foot.x + LEFT * across,
        y: post.foot.y + TOP * across,
      });
      const to = post.stand.toGlobal({
        x: post.foot.x + post.reach * across,
        y: post.foot.y + 2 * across,
      });
      if (x >= from.x && x <= to.x && y >= from.y && y <= to.y) return district;
    }
    return null;
  }

  /**
   * Pick a flag up to stand it somewhere else. It comes off its own place in
   * the draw order and goes over everything while it is in the hand, since
   * where it lands decides what stands in front of it.
   */
  lift(district: string, x: number, y: number): boolean {
    const post = this.posts.get(district);
    const group = post?.group;
    const root = post?.stand.parent;
    if (!post || !group || !root) return false;
    const at = root.toLocal({ x, y });
    this.held = { district, grabbed: { x: at.x - post.foot.x, y: at.y - post.foot.y } };
    root.addChild(group);
    this.show(null);
    return true;
  }

  /** Where the held flag's foot is now, following the pointer. */
  carry(x: number, y: number, fits: boolean): Foot | null {
    const held = this.held;
    const post = held && this.posts.get(held.district);
    const group = post?.group;
    const root = post?.stand.parent;
    if (!held || !group || !root) return null;
    const at = root.toLocal({ x, y });
    const foot = {
      x: Math.round(at.x - held.grabbed.x),
      y: Math.round(at.y - held.grabbed.y),
    };
    group.position.set(foot.x, foot.y);
    group.tint = fits ? 0xffffff : 0xf2665a;
    return foot;
  }

  /** Put the held flag back where it stood, if it was not planted. */
  putBack(): void {
    const post = this.held && this.posts.get(this.held.district);
    this.held = null;
    if (!post?.group) return;
    post.group.tint = 0xffffff;
    post.group.position.set(post.foot.x, post.foot.y);
    post.stand.addChild(post.group);
  }

  private held: { district: string; grabbed: Foot } | null = null;

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
    return Math.max(1, this.camera.scale.x);
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
    for (const post of this.posts.values()) post.group?.scale.set(scale);
    this.follow();
  }

  /* The tag rides the flag's tail at the flag's own size on screen, rounded
     to a whole number so its pixels stay whole. */
  private readonly follow = (): void => {
    const post = this.shown ? this.posts.get(this.shown) : undefined;
    if (!post) return;
    // Up to three: past that the flag keeps growing with the map, but a name
    // written the size of a house is not easier to read than a normal one.
    const scale = Math.min(3, Math.round(this.onScreen()));
    const across = this.across();
    /* Asked of the post itself rather than of the camera: the island sits
       inside the camera at an offset of its own, and the camera's answer is
       off by exactly that, times the zoom. */
    const tail = post.stand.toGlobal({
      x: post.foot.x + (post.reach + GAP) * across,
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

/**
 * The flag, a pixel at a time.
 *
 * A project with a logo flies the logo: it covers the whole cloth, tail and
 * all, and the notch cuts into its right edge rather than the cloth showing
 * round it, so the flag is the logo and nothing else. A project without one
 * flies its district's colour with its first letter on it.
 */
async function paint(
  colour: string,
  one: Flown
): Promise<{
  texture: Texture;
  reach: number;
  logo: { image: HTMLCanvasElement; x: number; y: number; w: number; h: number } | null;
}> {
  const [canvas, pen] = sheet();
  const at = pencil(pen);
  const face = one.icon ? await picture(one.icon) : null;
  const logo = face ? trimmed(face) : null;

  const inner = FLAG.h - 4;
  // Square, like most logos, so a letter flag and a logo flag are one size.
  let wide = inner + 2;
  if (logo) wide = Math.min(WIDEST, Math.max(wide, Math.round(inner * logo.aspect) + 2));

  at(-2, TOP, 4, -TOP, TIMBER);
  at(-2, TOP, 1, -TOP, OUTLINE);
  at(1, TOP, 1, -TOP, OUTLINE);

  /* The cloth's drop, cut solid on its own sheet and laid down at half, so the
     keyline and the fill under it do not stack into two shades of shadow. */
  const [drop, dropPen] = sheet();
  cloth(pencil(dropPen), wide, 2, 2, OUTLINE, OUTLINE);
  pen.globalAlpha = 0.5;
  pen.drawImage(drop, 0, 0);
  pen.globalAlpha = 1;
  cloth(at, wide, 0, 0, OUTLINE, logo ? logo.edge : colour);

  if (!logo) {
    /* Silkscreen at twice its own 8px, so every stroke is two whole pixels
       and the letter sits in the cloth about as big as a logo's own mark
       does: at the design's 9px it landed between pixels and read as a
       smudge, and at three times it was fatter than the flag. */
    await document.fonts.load("16px 'Silkscreen'").catch(() => undefined);
    const [letter, letterPen] = sheet();
    const initial = (one.name.trim()[0] ?? '?').toUpperCase();
    letterPen.font = "16px 'Silkscreen'";
    letterPen.textBaseline = 'alphabetic';
    letterPen.fillStyle = OUTLINE;
    // Its advance carries two pixels of spacing after the glyph, not before.
    const glyph = letterPen.measureText(initial).width - 2;
    letterPen.fillText(
      initial,
      Math.round(FLAG.x + 2 + (wide - 2 - glyph) / 2) - LEFT,
      FLAG.y + FLAG.h - 6 - TOP
    );
    crisp(letterPen);
    pen.drawImage(letter, 0, 0);
  }

  const texture = Texture.from(canvas);
  texture.source.scaleMode = 'nearest';
  return {
    texture,
    reach: FLAG.x + wide + TAIL,
    // Laid on by the caller at full resolution; the cloth is its background.
    logo: logo ? { ...fitted(logo.image, wide), x: FLAG.x + 2, y: FLAG.y + 2 } : null,
  };
}

/**
 * A logo with its see-through margin cut away, its shape, and its tile's colour.
 *
 * Icons carry padding, an app icon most of all, and padding on a flag this
 * small is most of the flag. The tile colour is the commonest solid colour a
 * little way in from the edge, past a rim and a rounded corner's soft edge, so
 * an icon with a thin bright border still reads as the dark tile it mostly is.
 */
function trimmed(
  image: HTMLImageElement
): { image: HTMLCanvasElement; aspect: number; edge: string } | null {
  const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight, 1));
  const w = Math.max(1, Math.round(image.naturalWidth * scale));
  const h = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const pen = canvas.getContext('2d', { willReadFrequently: true });
  if (!pen) return null;
  pen.drawImage(image, 0, 0, w, h);
  let data: Uint8ClampedArray;
  try {
    data = pen.getImageData(0, 0, w, h).data;
  } catch {
    return { image: canvas, aspect: w / h, edge: OUTLINE };
  }
  const solid = (x: number, y: number): boolean => (data[(y * w + x) * 4 + 3] ?? 0) > 24;
  let left = w;
  let right = -1;
  let top = h;
  let bottom = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!solid(x, y)) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < 0) return null;

  const extent = Math.max(right - left, bottom - top) + 1;
  const inset = Math.max(1, Math.round(extent * 0.06));
  const band = Math.max(1, Math.round(extent * 0.06));
  const buckets = new Map<number, [number, number, number, number]>();
  const count = (x: number, y: number): void => {
    if (!solid(x, y)) return;
    const i = (y * w + x) * 4;
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const sum = buckets.get(key) ?? [0, 0, 0, 0];
    sum[0] += r;
    sum[1] += g;
    sum[2] += b;
    sum[3] += 1;
    buckets.set(key, sum);
  };
  for (let d = inset; d < inset + band; d++) {
    for (let x = left + d; x <= right - d; x++) {
      count(x, top + d);
      count(x, bottom - d);
    }
    for (let y = top + d; y <= bottom - d; y++) {
      count(left + d, y);
      count(right - d, y);
    }
  }
  let best: [number, number, number, number] | null = null;
  for (const sum of buckets.values()) if (!best || sum[3] > best[3]) best = sum;
  const tone = best ? [best[0] / best[3], best[1] / best[3], best[2] / best[3]] : [0, 0, 0];
  const edge = best ? `rgb(${tone.map(Math.round).join(',')})` : OUTLINE;

  /* And the mark on it. An app icon is mostly a tile of one colour with the
     mark small in the middle, and on a flag the tile is the flag already: the
     mark is what should fill it. The mark is whatever inside the rim is not
     the tile's colour; a gradient tile is all mark, and is left whole. */
  // Where the tile's own rim and rounded corners end, once cut to its mark.
  let inside = { left, right, top, bottom };
  if (best) {
    let l = right;
    let r2 = left;
    let t = bottom;
    let b2 = top;
    for (let y = top + inset; y <= bottom - inset; y++) {
      for (let x = left + inset; x <= right - inset; x++) {
        if (!solid(x, y)) continue;
        const i = (y * w + x) * 4;
        const d =
          Math.abs((data[i] ?? 0) - (tone[0] ?? 0)) +
          Math.abs((data[i + 1] ?? 0) - (tone[1] ?? 0)) +
          Math.abs((data[i + 2] ?? 0) - (tone[2] ?? 0));
        if (d < 60) continue;
        l = Math.min(l, x);
        r2 = Math.max(r2, x);
        t = Math.min(t, y);
        b2 = Math.max(b2, y);
      }
    }
    // Some breathing room round the mark, as a square, so it is not cropped
    // tight into a letterbox.
    const side = Math.max(r2 - l, b2 - t) + 1;
    const pad = Math.round(side * 0.14);
    const half = side / 2 + pad;
    if (r2 >= l && side > 4 && half * 2 < extent - 2 * inset) {
      inside = {
        left: left + inset,
        right: right - inset,
        top: top + inset,
        bottom: bottom - inset,
      };
      const cx = (l + r2) / 2;
      const cy = (t + b2) / 2;
      left = Math.round(cx - half);
      right = Math.round(cx + half);
      top = Math.round(cy - half);
      bottom = Math.round(cy + half);
    }
  }

  const out = document.createElement('canvas');
  out.width = right - left + 1;
  out.height = bottom - top + 1;
  const outPen = out.getContext('2d');
  if (outPen) {
    // Anything see-through in it, a rounded corner or past the icon's own
    // edge, is its tile, so no flag colour shows through round the logo.
    outPen.fillStyle = edge;
    outPen.fillRect(0, 0, out.width, out.height);
    // The mark's square can reach the icon's rim; only what is inside it comes.
    const x0 = Math.max(left, inside.left);
    const y0 = Math.max(top, inside.top);
    const x1 = Math.min(right, inside.right);
    const y1 = Math.min(bottom, inside.bottom);
    const [cw, ch] = [x1 - x0 + 1, y1 - y0 + 1];
    outPen.drawImage(canvas, x0, y0, cw, ch, x0 - left, y0 - top, cw, ch);
  }
  return { image: out, aspect: out.width / out.height, edge };
}

/**
 * The logo cut to the cloth, tail and all.
 *
 * It covers everything inside the keyline, the swallowtail's two teeth
 * included, so there is no strip of flag colour round it anywhere: scaled up
 * until nothing is left uncovered, whatever overhangs cut away, and the notch
 * cut out of it the same stepped way the cloth's is.
 */
function fitted(
  logo: HTMLCanvasElement,
  wide: number
): { image: HTMLCanvasElement; w: number; h: number } {
  const { h } = FLAG;
  const half = h / 2;
  const rows: number[] = [];
  for (let row = 2; row < h - 2; row++) {
    const out = row < half ? row : h - 1 - row;
    const reach = Math.round(TAIL * (1 - out / half));
    rows.push(wide - 2 + Math.max(0, reach - 2));
  }
  const w = Math.max(...rows);
  const high = rows.length;
  const SCALE = 16;
  const image = document.createElement('canvas');
  image.width = w * SCALE;
  image.height = high * SCALE;
  const pen = image.getContext('2d');
  if (!pen) return { image, w, h: high };
  const cover = Math.max(image.width / logo.width, image.height / logo.height);
  const dw = logo.width * cover;
  const dh = logo.height * cover;
  pen.imageSmoothingQuality = 'high';
  // Centred on the square before the tail, so the notch eats its right edge
  // rather than pushing the mark off-centre on the cloth.
  const centre = ((wide - 2) * SCALE) / 2;
  const x = Math.min(0, Math.max(image.width - dw, centre - dw / 2));
  pen.drawImage(logo, x, (image.height - dh) / 2, dw, dh);
  pen.globalCompositeOperation = 'destination-in';
  pen.fillStyle = '#000';
  pen.beginPath();
  rows.forEach((across, row) => pen.rect(0, row * SCALE, across * SCALE, SCALE));
  pen.fill();
  return { image, w, h: high };
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
function cloth(at: Pencil, w: number, dx: number, dy: number, line: string, fill: string): void {
  const { x, y, h } = FLAG;
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
