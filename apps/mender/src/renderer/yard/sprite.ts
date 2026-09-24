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
  return cuts.size;
}

const FOLK = './folk/';

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
  pot: 'props/TX Village Props - Pot 03.png',
  table: 'props/TX Village Props - Table 01 H A.png',
  /* Ours, not the kit's. See the note on loadCuts. */
  facingYou: 'folk/front-0',
  facingAway: 'folk/back-0',
  breathing: 'folk/front-1',
  walking: 'folk/back-1',
} as const;
