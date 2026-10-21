import { BrowserWindow, dialog, ipcMain } from 'electron';
import { MENDER_PICK_FOLDER_CHANNEL } from '../shared/channels';

/**
 * The native folder picker for a setting that just wants a path written into
 * it, where founding a project has a picker of its own that founds one.
 */
export function installFolderPicker(): void {
  ipcMain.handle(MENDER_PICK_FOLDER_CHANNEL, async (event, title: unknown) => {
    const over = BrowserWindow.fromWebContents(event.sender) ?? undefined;
    const options: Electron.OpenDialogOptions = {
      title: typeof title === 'string' && title ? title : 'Choose a folder',
      properties: ['openDirectory', 'createDirectory'],
      buttonLabel: 'Choose',
    };
    const chosen = over
      ? await dialog.showOpenDialog(over, options)
      : await dialog.showOpenDialog(options);
    const path = chosen.filePaths[0];
    return chosen.canceled || !path ? null : path;
  });
}
