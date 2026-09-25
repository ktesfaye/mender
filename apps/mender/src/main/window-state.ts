import { join } from 'node:path';
import { createJsonFileKeyValueStore } from '@emdash/core/primitives/kv/node';
import { app, screen, type BrowserWindow } from 'electron';

/**
 * Where the window was, remembered across a restart.
 *
 * The village sits parked beside whatever he is really working in — that is
 * this app's whole case for existing — so its size and position are chosen
 * once and should stay chosen. Nothing here is a setting: the window simply
 * reopens exactly where and at whatever size he last left it, the same way a
 * session's own board comes back exactly as he left it.
 */

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const KEY = 'window';
/** How long after the last move or resize before it is worth writing down. */
const SETTLE_MS = 400;

function store() {
  return createJsonFileKeyValueStore({ path: join(app.getPath('userData'), 'window-state.json') });
}

export async function loadWindowBounds(): Promise<Bounds | null> {
  const held = await store().get(KEY);
  if (!held.success || !held.data || typeof held.data !== 'object') return null;
  const bounds = held.data as unknown as Bounds;
  if (
    typeof bounds.x !== 'number' ||
    typeof bounds.y !== 'number' ||
    typeof bounds.width !== 'number' ||
    typeof bounds.height !== 'number'
  ) {
    return null;
  }
  return bounds;
}

/**
 * Whether a rectangle lands anywhere a screen actually is.
 *
 * A window remembered from a bigger monitor that has since been unplugged is
 * not "restored," it is gone off the edge of the world — so this is checked
 * against whatever displays exist right now, not trusted blindly. Pure and
 * exported on its own because the bug it guards against (a window nobody can
 * find or reach) looks completely ordinary on screen otherwise: the app would
 * seem to hang or open invisibly, with no error anywhere.
 */
export function fitsSomeDisplay(bounds: Bounds, displays: readonly Bounds[]): boolean {
  return displays.some((display) => overlaps(bounds, display));
}

function overlaps(a: Bounds, b: Bounds): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** The bounds to actually open at: remembered, if they still land somewhere real. */
export async function restoredBounds(): Promise<Bounds | null> {
  const remembered = await loadWindowBounds();
  if (!remembered) return null;
  const displays = screen.getAllDisplays().map((display) => display.workArea);
  return fitsSomeDisplay(remembered, displays) ? remembered : null;
}

/** Write down where the window is now, a moment after it stops moving. */
export function watchWindowBounds(window: BrowserWindow): void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const settled = (): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      if (window.isDestroyed() || window.isMinimized() || window.isFullScreen()) return;
      void store().set(KEY, window.getBounds() as unknown as never);
    }, SETTLE_MS);
  };
  window.on('resize', settled);
  window.on('move', settled);
}
