import { join } from 'node:path';
import { createJsonFileKeyValueStore } from '@emdash/core/primitives/kv/node';
import { app, BrowserWindow } from 'electron';

/**
 * How large everything written is, ⌘+ and ⌘− the way a browser does it.
 *
 * It is the page's own zoom, so every board, column and slab grows together and
 * rewraps to the window. The island does not: the village counts its canvas in
 * the screen's own pixels rather than the page's, so the art stays at the scale
 * it was drawn for whatever size the writing is. Kept across a restart, since
 * the eyes reading it do not change between launches.
 */

const KEY = 'level';
/** Half a Chromium level a press, about a tenth bigger or smaller each time. */
const STEP = 0.5;
const LEAST = -3;
const MOST = 5;

function store() {
  return createJsonFileKeyValueStore({ path: join(app.getPath('userData'), 'text-size.json') });
}

let level = 0;

/** Put the remembered size back on the window every time its page loads. */
export async function restoreTextSize(window: BrowserWindow): Promise<void> {
  const held = await store().get(KEY);
  if (held.success && typeof held.data === 'number') level = held.data;
  window.webContents.on('did-finish-load', () => window.webContents.setZoomLevel(level));
}

/** Bigger, smaller, or back to as drawn (0). */
export function changeTextSize(direction: -1 | 0 | 1): void {
  level = direction === 0 ? 0 : Math.min(MOST, Math.max(LEAST, level + direction * STEP));
  for (const window of BrowserWindow.getAllWindows()) window.webContents.setZoomLevel(level);
  void store().set(KEY, level as never);
}
