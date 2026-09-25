import { execFile } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute, join } from 'node:path';
import { promisify } from 'node:util';
import type { ShellEnvManager } from '@emdash/core/services/shell-env/node';
import { nativeImage, type NativeImage } from 'electron';

const ran = promisify(execFile);

type EnvSource = Pick<ShellEnvManager, 'current'>;

/**
 * The pictures in a checkout, best guess at its own logo first.
 *
 * A project already has a face in almost every repository anybody works in:
 * the app icon an Android build ships, the one an Electron build packs, a
 * favicon, a logo in the readme's folder. Asking git rather than walking the
 * disk is what keeps a checkout's dependencies and build output out of it, and
 * it is also fast on a repository with a hundred thousand files in it.
 */
export interface Picture {
  /** Relative to the checkout. */
  path: string;
  /** Small enough to hand across the wire every time the board is written. */
  src: string;
  wide: number;
  tall: number;
}

const IMAGE = /\.(png|jpe?g|svg|ico|icns|webp|gif)$/i;
/** How many are looked at closely, which means opened, before any are shown. */
const SIFTED = 160;
const THUMB = 96;
/** What a project's own picture is kept at: the rack is 44 across, doubled. */
const KEPT = 256;

/** Where each candidate stands before its pixels have been looked at. */
function named(path: string): number {
  const base = basename(path, extname(path)).toLowerCase();
  const dir = dirname(path).toLowerCase();
  let score = 0;
  if (/^(app[-_ ]?)?(icon|logo)([-_@.\d]|x\d|$)/.test(base) || /^favicon/.test(base)) score += 60;
  else if (/ic_launcher(_round)?$|^appicon|^icon[-_]?\d|^logo/.test(base)) score += 55;
  else if (/logo|icon|brand|emblem|mascot|avatar/.test(base)) score += 30;
  if (/appicon\.appiconset|mipmap-|(^|\/)(icons?|logos?|brand(ing)?)(\/|$)/.test(dir)) score += 25;
  if (
    /(^|\/)(build|public|static|assets?|res|resources|web|images?|img|media|branding)(\/|$)/.test(
      dir
    )
  ) {
    score += 8;
  }
  if (
    /(^|\/)(tests?|__tests__|fixtures?|__snapshots__|snapshots?|screenshots?|examples?|samples?|vendor|third[-_]?party|node_modules)(\/|$)/.test(
      dir
    )
  ) {
    score -= 45;
  }
  if (/screenshot|screen[-_]shot|banner|background|splash|hero|preview/.test(base)) score -= 25;
  score -= Math.max(0, path.split('/').length - 4) * 3;
  return score;
}

/**
 * What a set of sizes of one picture is called, so the set shows once.
 *
 * `mipmap-hdpi/ic_launcher.png` through `mipmap-xxxhdpi/ic_launcher.png`, an
 * appiconset's twelve sizes, `icon-16.png` next to `icon-512.png`: one picture
 * each, and the largest of them is the one worth showing.
 */
function family(path: string): string {
  const dir = dirname(path);
  const base = basename(path, extname(path)).toLowerCase();
  if (/\.appiconset$/i.test(dir)) return dir;
  const mipmap = dir.replace(/mipmap-[a-z]+(-v\d+)?$/i, 'mipmap');
  return `${mipmap}/${base.replace(/[-_@]?\d+(x\d+)?(@\dx)?$/, '')}`;
}

/** Read any picture the machine can read, as small as asked and no smaller. */
export async function load(path: string, size: number): Promise<NativeImage | null> {
  let image = nativeImage.createFromPath(path);
  if (image.isEmpty()) {
    /* What Chromium's decoder will not open, Quick Look usually will: an SVG,
       an icns, a webp. It hands back a thumbnail already at the size asked. */
    try {
      image = await nativeImage.createThumbnailFromPath(path, { width: size, height: size });
    } catch {
      return null;
    }
  }
  if (image.isEmpty()) return null;
  const { width, height } = image.getSize();
  const scale = size / Math.max(width, height);
  if (scale >= 1) return image;
  return image.resize({
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    quality: 'best',
  });
}

const sized = new Map<
  string,
  { at: number; image: NativeImage | null; full: { w: number; h: number } }
>();

async function looked(path: string): Promise<{ image: NativeImage | null; w: number; h: number }> {
  const at = (await stat(path).catch(() => null))?.mtimeMs ?? 0;
  const known = sized.get(path);
  if (known && known.at === at) return { image: known.image, ...known.full };
  const whole = nativeImage.createFromPath(path);
  const full = whole.isEmpty()
    ? { w: 0, h: 0 }
    : { w: whole.getSize().width, h: whole.getSize().height };
  const image = await load(path, THUMB);
  const measured = full.w
    ? full
    : image
      ? { w: image.getSize().width, h: image.getSize().height }
      : full;
  sized.set(path, { at, image, full: measured });
  return { image, ...measured };
}

/**
 * The pictures in a checkout, as many as asked for, and how many there are.
 */
export async function picturesIn(
  checkout: string,
  many: number,
  env: EnvSource
): Promise<{ pictures: Picture[]; more: number }> {
  let listed: string[];
  try {
    const { stdout } = await ran('git', ['ls-files', '-co', '--exclude-standard', '-z'], {
      cwd: checkout,
      maxBuffer: 64 * 1024 * 1024,
      env: await env.current(),
    });
    listed = stdout.split('\0').filter((path) => IMAGE.test(path));
  } catch {
    return { pictures: [], more: 0 };
  }

  const ranked = listed
    .map((path) => ({ path, score: named(path) }))
    .sort((a, b) => b.score - a.score || a.path.length - b.path.length);

  /* Only the likeliest are opened: a game's worth of sprites is thousands of
     files, and none of them is the one being looked for. */
  const sifted: {
    path: string;
    score: number;
    named: number;
    image: NativeImage;
    w: number;
    h: number;
  }[] = [];
  const window = Math.max(SIFTED, many * 3);
  for (const one of ranked.slice(0, window)) {
    const { image, w, h } = await looked(join(checkout, one.path));
    if (!image) continue;
    let score = one.score;
    const long = Math.max(w, h);
    if (Math.abs(w - h) / long < 0.08) score += 20;
    else if (Math.abs(w - h) / long > 0.4) score -= 20;
    if (long < 32) score -= 30;
    else if (long >= 128) score += 6;
    sifted.push({ ...one, named: one.score, score, image, w, h });
  }

  /* One of each family, the largest; then one of each picture, whatever it
     was called, because the same logo is usually in the repository three
     times over. */
  const families = new Map<string, (typeof sifted)[number]>();
  for (const one of sifted) {
    const key = family(one.path);
    const had = families.get(key);
    if (!had || one.w * one.h > had.w * had.h) {
      families.set(key, had ? { ...one, score: Math.max(one.score, had.score) } : one);
    }
  }
  const seen: Print[] = [];
  const kept: typeof sifted = [];
  for (const one of [...families.values()].sort((a, b) => b.score - a.score)) {
    const print = printOf(one.image);
    if (seen.some((other) => alike(other, print))) continue;
    seen.push(print);
    kept.push(one);
  }

  /* The first look is only what is named like a face: an icon, a logo, a
     launcher. Everything else in a repository is a picture of something, and
     a play button from a media library is not what anybody is looking for.
     Asking for more is asking for all of it. */
  const faces = kept.filter((one) => one.named >= FACE);
  const chosen = many <= FIRST && faces.length ? faces.slice(0, many) : kept.slice(0, many);
  return {
    pictures: chosen.map((one) => ({
      path: one.path,
      src: one.image.toDataURL(),
      wide: one.w,
      tall: one.h,
    })),
    more: Math.max(0, kept.length - chosen.length) + Math.max(0, ranked.length - window),
  };
}

/** What a name has to score to be offered before anybody asks for more. */
const FACE = 20;
/** How many the first look asks for. */
const FIRST = 12;

/**
 * A picture reduced to a thumbnail's thumbnail, for telling the same logo at
 * two sizes, or exported twice, from two different pictures.
 */
interface Print {
  bits: Buffer;
  ratio: number;
}

function printOf(image: NativeImage): Print {
  const { width, height } = image.getSize();
  return {
    bits: image.resize({ width: PRINT, height: PRINT, quality: 'good' }).toBitmap(),
    ratio: width / height,
  };
}

const PRINT = 12;

function alike(one: Print, other: Print): boolean {
  if (Math.abs(one.ratio - other.ratio) > 0.08) return false;
  const a = one.bits;
  const b = other.bits;
  if (a.length !== b.length) return false;
  let off = 0;
  for (let i = 0; i < a.length; i += 1) off += Math.abs((a[i] ?? 0) - (b[i] ?? 0));
  return off / a.length < 14;
}

/**
 * Keep a picture as a project's own.
 *
 * Copied rather than pointed at, so a logo picked out of the Downloads folder
 * outlives the Downloads folder, and one picked out of the checkout does not
 * vanish the day a branch without it is checked out.
 */
export async function keep(from: string, checkout: string, to: string): Promise<boolean> {
  const source = isAbsolute(from) ? from : join(checkout, from);
  const image = await load(source, KEPT);
  if (!image) return false;
  await mkdir(dirname(to), { recursive: true });
  await writeFile(to, image.toPNG());
  return true;
}

/** A kept picture, ready for the page. */
export async function shown(path: string): Promise<string | undefined> {
  try {
    return `data:image/png;base64,${(await readFile(path)).toString('base64')}`;
  } catch {
    return undefined;
  }
}
