import { createController, type Controller } from '@emdash/wire/rpc';
import { BrowserWindow, type NativeImage } from 'electron';
import { buildingContract, type Drew, type Look } from '@shared/building';

/** The size a page is drawn at, which is a laptop's window and not the yard's. */
const PAGE = { width: 1440, height: 900 } as const;
/** And the size the picture of it comes back at: enough for the opened view's strip and the column. */
const SHOWN = 960;
/** The grid a change is looked for on. Coarse on purpose: a caret blinking is not a change. */
const GRID = 72;
/** How long to let a page animate in before it is drawn, unless told otherwise. */
const SETTLE_MS = 1_400;
/** A page that has not loaded in this long is not going to. */
const GIVE_UP_MS = 15_000;
/** Nobody has asked after a page in this long, so nobody is watching it. */
const IDLE_MS = 10 * 60_000;

interface Watched {
  window: BrowserWindow;
  url: string;
  /** What it last looked like, on the grid. */
  grid?: { data: Buffer; width: number; height: number };
  /** The newest frame the page painted, for when capturing it comes back empty. */
  painted?: NativeImage;
  asked: number;
  /** One look at a time per page; the next waits on this one. */
  busy: Promise<unknown>;
}

/**
 * Only a page on this machine is drawn here: a file the agent wrote, or a
 * server running on this machine. Never the open web.
 */
export function drawable(url: string): boolean {
  try {
    const at = new URL(url);
    if (at.protocol === 'file:') return /\.html?$/i.test(at.pathname);
    return (
      (at.protocol === 'http:' || at.protocol === 'https:') &&
      (at.hostname === 'localhost' || at.hostname === '127.0.0.1' || at.hostname === '0.0.0.0')
    );
  } catch {
    return false;
  }
}

export function createBuildingController(): Controller {
  const watched = new Map<string, Watched>();

  const forget = (key: string): void => {
    const one = watched.get(key);
    if (!one) return;
    watched.delete(key);
    if (!one.window.isDestroyed()) one.window.destroy();
  };

  const sweeping = setInterval(() => {
    for (const [key, one] of watched) if (Date.now() - one.asked > IDLE_MS) forget(key);
  }, 60_000);
  sweeping.unref?.();

  const open = (key: string, url: string): Watched => {
    const had = watched.get(key);
    if (had && !had.window.isDestroyed()) return had;
    /* Drawn offscreen: never on his screen, never in the dock, and no sound out
       of whatever video the page plays. Nothing of this app reaches it. */
    const window = new BrowserWindow({
      ...PAGE,
      show: false,
      webPreferences: {
        offscreen: true,
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        partition: 'mender-building',
        backgroundThrottling: false,
      },
    });
    window.webContents.setAudioMuted(true);
    window.webContents.setFrameRate(15);
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    const one: Watched = { window, url, asked: Date.now(), busy: Promise.resolve() };
    window.webContents.on('paint', (_event, _dirty, image) => {
      one.painted = image;
    });
    watched.set(key, one);
    return one;
  };

  const load = async (one: Watched, url: string): Promise<boolean> => {
    const contents = one.window.webContents;
    const loaded = new Promise<boolean>((resolve) => {
      const done = (ok: boolean): void => {
        clearTimeout(timer);
        contents.off('did-finish-load', finished);
        contents.off('did-fail-load', failed);
        resolve(ok);
      };
      const finished = (): void => done(true);
      const failed = (
        _event: unknown,
        code: number,
        _said: string,
        _url: string,
        main: boolean
      ): void => {
        /* -3 is a navigation the page itself cut short, which still loads. */
        if (main && code !== -3) done(false);
      };
      const timer = setTimeout(() => done(false), GIVE_UP_MS);
      contents.on('did-finish-load', finished);
      contents.on('did-fail-load', failed);
    });
    if (one.url === url && contents.getURL()) contents.reloadIgnoringCache();
    else {
      one.url = url;
      contents.loadURL(url).catch(() => {});
    }
    return loaded;
  };

  const capture = async (one: Watched): Promise<NativeImage | null> => {
    one.window.webContents.invalidate();
    await new Promise((resolve) => setTimeout(resolve, 120));
    const taken = await one.window.webContents.capturePage().catch(() => null);
    const image = taken && !taken.isEmpty() ? taken : one.painted;
    return image && !image.isEmpty() ? image : null;
  };

  const look = async (one: Watched, url: string, settle: number): Promise<Look | null> => {
    if (!(await load(one, url))) return null;
    await new Promise((resolve) => setTimeout(resolve, settle));
    if (one.window.isDestroyed()) return null;
    const image = await capture(one);
    if (!image) return null;

    const small = image.resize({ width: GRID, quality: 'good' });
    const size = small.getSize();
    const grid = { data: small.toBitmap(), width: size.width, height: size.height };
    const before = one.grid;
    one.grid = grid;
    const change = before ? changed(before, grid) : undefined;
    return {
      image: image.resize({ width: SHOWN, quality: 'good' }).toJPEG(82).toString('base64'),
      ...(change?.drew ? { drew: change.drew } : {}),
      moved: before ? Boolean(change) : true,
    };
  };

  return createController(buildingContract, {
    async look({ key, url, settle }) {
      if (!drawable(url)) return null;
      const one = open(key, url);
      one.asked = Date.now();
      const mine = one.busy
        .catch(() => {})
        .then(() => look(one, url, settle ?? SETTLE_MS))
        .then((seen) => (seen ? { ...seen, image: `data:image/jpeg;base64,${seen.image}` } : null))
        .catch(() => null);
      one.busy = mine;
      return mine;
    },
    async forget({ key }) {
      forget(key);
    },
  });
}

/**
 * Where two looks at a page differ, on the coarse grid.
 *
 * Nothing at all is no change. A change over nearly all of it is the page
 * redrawn rather than a part of it drawn, which has nowhere to point at.
 */
function changed(
  before: { data: Buffer; width: number; height: number },
  after: { data: Buffer; width: number; height: number }
): { drew?: Drew } | undefined {
  if (before.width !== after.width || before.height !== after.height) return {};
  const { width, height } = after;
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  let many = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const d =
        Math.abs(before.data[i]! - after.data[i]!) +
        Math.abs(before.data[i + 1]! - after.data[i + 1]!) +
        Math.abs(before.data[i + 2]! - after.data[i + 2]!);
      if (d < 48) continue;
      many += 1;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  if (!many) return undefined;
  const w = (right - left + 1) / width;
  const h = (bottom - top + 1) / height;
  if (w * h > 0.8) return {};
  return { drew: { x: left / width, y: top / height, w, h } };
}
