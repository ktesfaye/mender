import { join } from 'node:path';
import { ipcMain, nativeImage, type App, type IpcMainEvent } from 'electron';
import { MENDER_START_DRAG_CHANNEL } from '../shared/channels';

/**
 * Carrying a file off the board and onto the Mac.
 *
 * The browser side of a drag can only move bytes it already holds; handing
 * the OS a real path so it can drop into the Finder, another app, or a mail
 * compose window needs `webContents.startDrag`, which only the main process
 * can call. The renderer just names the path on `dragstart`; this is the
 * whole of the wiring onto Electron.
 */
// A bare, opaque pixel — the fallback icon a drag still needs even if the
// app's own artwork cannot be found (`startDrag` refuses an empty image).
const BLANK_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

export function installDragOut(app: App): void {
  const fromArt = nativeImage
    .createFromPath(join(app.getAppPath(), 'build/icon-source.png'))
    .resize({ width: 32, height: 32 });
  const icon = fromArt.isEmpty() ? nativeImage.createFromDataURL(BLANK_PIXEL) : fromArt;
  ipcMain.on(MENDER_START_DRAG_CHANNEL, (event: IpcMainEvent, path: string) => {
    if (typeof path !== 'string' || !path) return;
    event.sender.startDrag({ file: path, icon });
  });
}
