import { BrowserWindow, ipcMain, screen, systemPreferences, type IpcMainEvent } from 'electron';
import { MENDER_GRIP_CHANNEL, type Grip } from '../shared/channels';

/**
 * Holding the window by its top, the way every other Mac window is held.
 *
 * The cursor is read here rather than trusted from the page, so the window
 * follows the real pointer across displays. A double-click does whatever the
 * Mac is set to do on a title bar: zoom by default, minimise, or nothing.
 */
export function installGrip(): void {
  let from: { cursor: Electron.Point; window: number[] } | null = null;

  ipcMain.on(MENDER_GRIP_CHANNEL, (event: IpcMainEvent, grip: Grip) => {
    const held = BrowserWindow.fromWebContents(event.sender);
    if (!held) return;
    if (grip === 'start') {
      from = { cursor: screen.getCursorScreenPoint(), window: held.getPosition() };
      return;
    }
    if (grip === 'move') {
      if (!from || held.isFullScreen()) return;
      const now = screen.getCursorScreenPoint();
      const [x = 0, y = 0] = from.window;
      held.setPosition(x + now.x - from.cursor.x, y + now.y - from.cursor.y);
      return;
    }
    from = null;
    const action =
      process.platform === 'darwin'
        ? systemPreferences.getUserDefault('AppleActionOnDoubleClick', 'string')
        : 'Maximize';
    if (action === 'None') return;
    if (action === 'Minimize') {
      held.minimize();
      return;
    }
    if (held.isMaximized()) held.unmaximize();
    else held.maximize();
  });
}
