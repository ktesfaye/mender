/**
 * Lantern glass: the one surface every popup in the village is drawn on.
 *
 * Not a frosted rectangle. What is behind a pane, the island or the yard and
 * its writing alike, is blurred, and then bent at the rim the way a thick lens
 * bends it, each colour a little differently so the edge splits faintly into a
 * rainbow, with a highlight only where the light catches the corners. The
 * world behind is never dimmed for it; the glass is what sets a popup apart.
 *
 * It is the browser's own backdrop filter run through an SVG lens, so it bends
 * whatever is really there, canvas and DOM both, and costs nothing while
 * nothing behind it moves. The lens is a displacement map worked out once per
 * size and radius and shared by every pane that size.
 */

import './glass.css';

const NS = 'http://www.w3.org/2000/svg';

export interface GlassLook {
  /** What the glass is tinted, as rgba. Smoky night grey, never brown. */
  tint?: string;
  /** How soft what is behind it goes, in px of gaussian deviation. */
  blur?: number;
  /** How far in from the edge the lens reaches. Never more than the radius. */
  thick?: number;
  /** How hard the rim bends what is behind it, in px at the very edge. */
  bend?: number;
  /** How far the colours split at the rim, as a share of the bend. */
  spread?: number;
  /** How much richer the colour behind gets through it. */
  sat?: number;
}

export const TINT_YARD = 'rgba(14, 15, 18, 0.42)';
export const TINT_ISLAND = 'rgba(16, 18, 22, 0.6)';

const DEFAULT: Required<GlassLook> = {
  tint: TINT_YARD,
  blur: 10,
  thick: 28,
  bend: 70,
  spread: 0.18,
  sat: 1.25,
};

let defs: SVGDefsElement | null = null;
const filters = new Map<string, { id: string; used: number }>();
let next = 0;

function sdf(px: number, py: number, w: number, h: number, r: number): number {
  const qx = Math.abs(px - w / 2) - (w / 2 - r);
  const qy = Math.abs(py - h / 2) - (h / 2 - r);
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(ox, oy) - r;
}

/** The lens, as a picture: red is how far across to look, green how far down. */
function lensMap(w: number, h: number, r: number, t: number): string {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  if (!x) return '';
  x.fillStyle = 'rgb(128,128,128)';
  x.fillRect(0, 0, w, h);
  const im = x.getImageData(0, 0, w, h);
  const d = im.data;
  const rim = (i: number, j: number): void => {
    const px = i + 0.5;
    const py = j + 0.5;
    const depth = -sdf(px, py, w, h, r);
    if (depth < 0 || depth >= t) return;
    const gx = sdf(px + 0.5, py, w, h, r) - sdf(px - 0.5, py, w, h, r);
    const gy = sdf(px, py + 0.5, w, h, r) - sdf(px, py - 0.5, w, h, r);
    const gl = Math.hypot(gx, gy) || 1;
    const k = 1 - depth / t;
    const m = 1 - Math.sqrt(1 - k * k);
    const o = (j * w + i) * 4;
    d[o] = 128 - (gx / gl) * m * 127;
    d[o + 1] = 128 - (gy / gl) * m * 127;
  };
  const band = Math.ceil(Math.max(t, r)) + 1;
  for (let j = 0; j < h; j++) {
    const edgeRow = j < band || j >= h - band;
    for (let i = 0; i < w; i++) {
      if (!edgeRow && i >= band && i < w - band) {
        i = w - band - 1;
        continue;
      }
      rim(i, j);
    }
  }
  x.putImageData(im, 0, 0);
  return c.toDataURL();
}

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>,
  kids: Element[] = [],
): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  kids.forEach((c) => e.appendChild(c));
  return e;
}

function lensFor(w: number, h: number, r: number, look: Required<GlassLook>): string {
  const key = [w, h, r, look.thick, look.bend, look.spread, look.blur, look.sat].join(':');
  const had = filters.get(key);
  if (had) {
    had.used = ++next;
    return had.id;
  }
  if (!defs) {
    const root = svg('svg', { width: 0, height: 0, 'aria-hidden': 'true' });
    root.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    defs = svg('defs', {});
    root.appendChild(defs);
    document.body.appendChild(root);
  }
  const id = `lantern-glass-${++next}`;
  const map = lensMap(w, h, r, Math.min(look.thick, r));
  const keep = (ch: 'r' | 'g' | 'b'): string =>
    ch === 'r'
      ? '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'
      : ch === 'g'
        ? '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0'
        : '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0';
  const one = (scale: number, ch: 'r' | 'g' | 'b'): Element[] => [
    svg('feDisplacementMap', {
      in: 'soft',
      in2: 'map',
      scale,
      xChannelSelector: 'R',
      yChannelSelector: 'G',
      result: `d${ch}`,
    }),
    svg('feColorMatrix', { in: `d${ch}`, type: 'matrix', values: keep(ch), result: `c${ch}` }),
  ];
  const f = svg(
    'filter',
    {
      id,
      x: 0,
      y: 0,
      width: w,
      height: h,
      filterUnits: 'userSpaceOnUse',
      'color-interpolation-filters': 'sRGB',
    },
    [
      svg('feGaussianBlur', {
        in: 'SourceGraphic',
        stdDeviation: look.blur,
        edgeMode: 'duplicate',
        result: 'blur',
      }),
      svg('feColorMatrix', { in: 'blur', type: 'saturate', values: look.sat, result: 'soft' }),
      svg('feImage', {
        href: map,
        x: 0,
        y: 0,
        width: w,
        height: h,
        preserveAspectRatio: 'none',
        result: 'map',
      }),
      ...one(look.bend * (1 + look.spread), 'r'),
      ...one(look.bend, 'g'),
      ...one(look.bend * (1 - look.spread), 'b'),
      svg('feBlend', { in: 'cr', in2: 'cg', mode: 'screen', result: 'rg' }),
      svg('feBlend', { in: 'rg', in2: 'cb', mode: 'screen' }),
    ],
  );
  defs.appendChild(f);
  filters.set(key, { id, used: next });
  if (filters.size > 48) {
    const oldest = [...filters.entries()].sort((a, b) => a[1].used - b[1].used).slice(0, 16);
    for (const [k, v] of oldest) {
      filters.delete(k);
      document.getElementById(v.id)?.remove();
    }
  }
  return id;
}

const looks = new WeakMap<HTMLElement, Required<GlassLook>>();
const sized = new WeakMap<HTMLElement, string>();

function refit(el: HTMLElement): void {
  const look = looks.get(el);
  if (!look) return;
  const w = Math.round(el.offsetWidth);
  const h = Math.round(el.offsetHeight);
  if (w < 8 || h < 8) return;
  const r = Math.round(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 28);
  const key = `${w}x${h}x${r}`;
  if (sized.get(el) === key) return;
  sized.set(el, key);
  const id = lensFor(w, h, r, look);
  el.style.backdropFilter = `url(#${id})`;
}

let watcher: ResizeObserver | null = null;

/**
 * Makes a pane glass. Safe to call again on the same pane with a new look; the
 * lens follows the pane's size and radius on its own from then on.
 */
export function glaze<T extends HTMLElement>(el: T, look: GlassLook = {}): T {
  const full = { ...DEFAULT, ...look };
  looks.set(el, full);
  sized.delete(el);
  el.classList.add('g-glass');
  el.style.backgroundColor = full.tint;
  watcher ??= new ResizeObserver((all) => all.forEach((e) => refit(e.target as HTMLElement)));
  watcher.observe(el);
  requestAnimationFrame(() => refit(el));
  return el;
}

/** A pane of glass of its own, with whatever classes and text are wanted. */
export function pane(cls = '', look: GlassLook = {}): HTMLDivElement {
  const d = document.createElement('div');
  if (cls) d.className = cls;
  return glaze(d, look);
}
