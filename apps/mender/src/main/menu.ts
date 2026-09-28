import { app, BrowserWindow, Menu, type MenuItemConstructorOptions } from 'electron';
import { MENDER_MENU_CHANNEL } from '@shared/channels';

/**
 * The native menu bar, cut down to what Mender actually does.
 *
 * A menu bar is OS chrome, not the wood, so it carries none of the village's
 * own voice — but left unset, Electron falls back to its stock default menu,
 * which is a stray piece of dev-only chrome in a finished app: a visible
 * "Reload" that would drop him out of whatever board he had open, a raw
 * DevTools entry, and an About panel that says "Electron." This replaces it
 * with the two or three items macOS actually requires: About, Settings
 * (which only the page can open, so it is asked for over
 * `MENDER_MENU_CHANNEL`), Quit, and the standard Edit roles the write line
 * needs for cut/copy/paste. No File, View, or Help menu — there is nothing
 * under any of them.
 */
export function installAppMenu(): void {
  if (process.platform === 'darwin') {
    app.setAboutPanelOptions({ applicationName: 'Mender', applicationVersion: app.getVersion() });
  }

  const askPage = (command: 'settings'): void => {
    const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    window?.webContents.send(MENDER_MENU_CHANNEL, command);
  };

  const appMenu: MenuItemConstructorOptions = {
    label: 'Mender',
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      {
        label: 'Settings…',
        accelerator: 'CmdOrCtrl+,',
        click: () => askPage('settings'),
      },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideOthers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' },
    ],
  };

  const editMenu: MenuItemConstructorOptions = {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' },
    ],
  };

  const windowMenu: MenuItemConstructorOptions = {
    label: 'Window',
    // Close keeps its place but not its key: ⌘W is the village's, and closes
    // the session you are in the way it closes a tab, never the window.
    submenu: [
      { role: 'minimize' },
      { role: 'zoom' },
      { role: 'close', accelerator: 'CmdOrCtrl+Shift+W' },
    ],
  };

  const template: MenuItemConstructorOptions[] =
    process.platform === 'darwin' ? [appMenu, editMenu, windowMenu] : [editMenu, windowMenu];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
