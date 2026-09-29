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
  let zoomedFrom: Electron.Rectangle | null = null;

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
    /* Zoom is a toggle back to wherever it was, remembered here rather than
       asked of `isMaximized`, which on macOS says no to a window it has just
       filled whenever the frame lands a pixel off the display's work area. */
    const bounds = held.getBounds();
    const area = screen.getDisplayMatching(bounds).workArea;
    const filled =
      held.isMaximized() ||
      (Math.abs(bounds.width - area.width) <= 2 && Math.abs(bounds.height - area.height) <= 2);
    if (filled && zoomedFrom) {
      held.setBounds(zoomedFrom, true);
      zoomedFrom = null;
    } else if (filled) {
      // Filled before this launch, so there is nowhere remembered to go back
      // to: the size it first opens at, in the middle of the display.
      const width = Math.min(1480, area.width - 80);
      const height = Math.min(1020, area.height - 60);
      held.setBounds(
        {
          x: Math.round(area.x + (area.width - width) / 2),
          y: Math.round(area.y + (area.height - height) / 2),
          width,
          height,
        },
        true
      );
    } else {
      zoomedFrom = bounds;
      held.maximize();
    }
  });
}
