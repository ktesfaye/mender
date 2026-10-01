/**
 * The kit, reachable from the writing layer.
 *
 * The village draws its sprites through Pixi, which is right for a scene of
 * three thousand of them. The yard needs perhaps a dozen — a fire, a signboard,
 * a cart, a lantern lit and unlit, a figure facing you and a figure facing away
 * — and they sit in among the writing rather than in the scene. Those are
 * cheaper and simpler as ordinary pictures than as a second scene graph laid
 * over the first.
 *
 * They come off the same packed sheets the village uses, by the same
 * kit-relative names, so there is still exactly one copy of the art and nothing
 * here needs cutting out by hand.
 */

const KIT = './kit/';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Sheet {
  frames: Record<string, { frame: Rect }>;
  meta: { image: string; size: { w: number; h: number } };
}

interface Cut extends Rect {
  /** Which sheet it was packed into, and how big that sheet is. */
  sheet: string;
  sheetWide: number;
  sheetTall: number;
}

const cuts = new Map<string, Cut>();

/**
 * Read the sheets' indexes. The pictures themselves the browser fetches.
 *
 * Two sheets, not one. The kit is the artist's, and the folk are ours: the
 * kit's own four "character" files are an unfinished template, a featureless
 * slab with cat ears that stands taller than the doors of the houses it would
 * be standing at, and it appears nowhere in his own demo. The designs used it
 * because it was what came in the box. We have finished villagers that fit the
 * doorways, so those are who stands in the yard.
 */
export async function loadCuts(): Promise<number> {
  if (cuts.size) return cuts.size;
  const index = (await (await fetch(KIT + 'kit.json')).json()) as { sheets: string[] };
  for (const name of index.sheets) await take(KIT + name, (file) => file);
  await take(FOLK + 'folk.json', (file) => 'folk/' + file);
  await take(WHEEL + 'wheel.json', (file) => 'wheel/' + file);
  await take(RACK + 'rack.json', (file) => 'rack/' + file);
  return cuts.size;
}

const FOLK = './folk/';
const WHEEL = './wheel/';
const RACK = './rack/';

async function take(where: string, name: (file: string) => string): Promise<void> {
  const sheet = (await (await fetch(where)).json()) as Sheet;
  const beside = where.slice(0, where.lastIndexOf('/') + 1);
  for (const [file, { frame }] of Object.entries(sheet.frames)) {
    cuts.set(name(file), {
      ...frame,
      sheet: beside + sheet.meta.image,
      sheetWide: sheet.meta.size.w,
      sheetTall: sheet.meta.size.h,
    });
  }
}

/** What one sprite is, at its own size. */
export function cutOf(file: string): Cut | undefined {
  return cuts.get(file);
}

/**
 * One sprite as an element, drawn at a whole multiple of its own size.
 *
 * Never at a fraction of it: the kit is keylined a pixel wide and anything but
 * whole-number scaling turns that line into a smear, which reads instantly as
 * art from somewhere else.
 */
export function sprite(file: string, times: 1 | 2 | 3 | 4 = 1): HTMLDivElement {
  const el = document.createElement('div');
  const cut = cuts.get(file);
  if (!cut) {
    // A name the kit has never had is a mistake in our code, not a missing
    // asset, so it leaves a visible hole rather than nothing at all.
    el.style.cssText = 'width:16px;height:16px;outline:1px solid #e0735a';
    el.title = file;
    return el;
  }
  el.style.cssText = [
    'position:absolute',
    `width:${cut.w * times}px`,
    `height:${cut.h * times}px`,
    `background-image:url(${cut.sheet})`,
    `background-position:${-cut.x * times}px ${-cut.y * times}px`,
    `background-size:${cut.sheetWide * times}px ${cut.sheetTall * times}px`,
    'image-rendering:pixelated',
  ].join(';');
  return el;
}

/**
 * The lit lantern with green in its glass rather than amber, for something
 * finished you have not been in to see.
 *
 * The kit only has the one lit lantern, so this is cut from it: every pixel
 * the lit one lights that the unlit one doesn't, and that is bright enough to
 * be glass rather than a strap, turned round the colour wheel to the yard's
 * own done green. Made once, the first time it is asked for.
 */
export function greenLantern(times: 1 | 2 | 3 | 4 = 1): HTMLDivElement {
  const el = sprite(KIT_NAMES.lanternOn, times);
  const on = cuts.get(KIT_NAMES.lanternOn);
  if (!on) return el;
  const wear = (url: string): void => {
    el.style.backgroundImage = `url(${url})`;
    el.style.backgroundPosition = '0 0';
    el.style.backgroundSize = `${on.w * times}px ${on.h * times}px`;
  };
  if (greened) wear(greened);
  else void greening().then((url) => url && wear(url));
  return el;
}

let greened: string | null = null;
let greenWork: Promise<string | null> | null = null;

function greening(): Promise<string | null> {
  greenWork ??= (async () => {
    const on = cuts.get(KIT_NAMES.lanternOn);
    const off = cuts.get(KIT_NAMES.lanternOff);
    if (!on || !off) return null;
    const pixels = async (cut: Cut): Promise<ImageData> => {
      const image = new Image();
      image.src = cut.sheet;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = cut.w;
      canvas.height = cut.h;
      const pen = canvas.getContext('2d')!;
      pen.drawImage(image, cut.x, cut.y, cut.w, cut.h, 0, 0, cut.w, cut.h);
      return pen.getImageData(0, 0, cut.w, cut.h);
    };
    const [lit, dark] = await Promise.all([pixels(on), pixels(off)]);
    const d = lit.data;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const same =
        d[i] === dark.data[i] && d[i + 1] === dark.data[i + 1] && d[i + 2] === dark.data[i + 2];
      if (same) continue;
      const [r, g, b] = greener(d[i]!, d[i + 1]!, d[i + 2]!);
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
    }
    const canvas = document.createElement('canvas');
    canvas.width = on.w;
    canvas.height = on.h;
    canvas.getContext('2d')!.putImageData(lit, 0, 0);
    greened = canvas.toDataURL();
    return greened;
  })();
  return greenWork;
}

/** Amber glass to done green: the hue moved on, a little of the heat taken out. */
function greener(r: number, g: number, b: number): [number, number, number] {
  const v = Math.max(r, g, b) / 255;
  if (v < 0.5) return [r, g, b];
  const lo = Math.min(r, g, b) / 255;
  const s = v ? (v - lo) / v : 0;
  const c = v - lo;
  let h = 0;
  if (c) {
    const [R, G, B] = [r / 255, g / 255, b / 255];
    if (v === R) h = ((G - B) / c + 6) % 6;
    else if (v === G) h = (B - R) / c + 2;
    else h = (R - G) / c + 4;
    h *= 60;
  }
  h = (h + 46) % 360;
  const s2 = s * 0.8;
  const k = (n: number): number => {
    const m = (n + h / 60) % 6;
    return v - v * s2 * Math.max(0, Math.min(m, 4 - m, 1));
  };
  return [Math.round(k(5) * 255), Math.round(k(3) * 255), Math.round(k(1) * 255)];
}

/** The handful the yard actually asks for, by the names the kit packs them as. */
export const KIT_NAMES = {
  fire: 'props/TX Village Props - Campfire 01 Lit.png',
  fireOut: 'props/TX Village Props - Campfire 01.png',
  lanternOn: 'props/TX Village Props - Lantern 01 On.png',
  lanternOff: 'props/TX Village Props - Lantern 01 Off.png',
  billboard: 'props/TX Village Props - Billboard 01.png',
  cart: 'props/TX Village Props - Cart 01 E.png',
  crate: 'props/TX Village Props - Crate 01 A.png',
  sign: 'props/TX Village Props - Sign 01.png',
  roadSign: 'props/TX Village Props - Road Sign 01.png',
  anvil: 'props/TX Village Props - Anvil 01.png',
  barrel: 'props/TX Village Props - Barrel 01.png',
  sack: 'props/TX Village Props - Sack 01.png',
  bucket: 'props/TX Village Props - Bucket 01 Water.png',
  table: 'props/TX Village Props - Table 01 H A.png',
  /* The windmill has no sprite of its own yet. The kit's own wheel is drawn
     side-on, the angle a wheel sits on a cart, not the angle that reads as a
     wheel in a slot, so this one is ours: front-on, the kit's own outline
     and wood, made by tools/make-wheel.py. */
  wheel: 'wheel/wheel',
  /* A command set running is something on the boil, and the kit's cauldron is
     too tall to sit in a line of writing, so it is the washtub over the fire.
     Nothing in the margin is taller than the crate the designs already use. */
  pot: 'props/TX Village Props - Washtub 01.png',
  rack: 'props/TX Village Props - Weapon Rack 01.png',
  /* Ours, not the kit's. See the note on loadCuts. */
  facingYou: 'folk/front-0',
  facingAway: 'folk/back-0',
  breathing: 'folk/front-1',
  walking: 'folk/back-1',
} as const;
