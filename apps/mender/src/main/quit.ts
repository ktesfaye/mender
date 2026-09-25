import { ipcMain, type App, type BrowserWindow } from 'electron';
import { MENDER_CONFIRM_QUIT_CHANNEL, MENDER_QUIT_COST_CHANNEL } from '@shared/channels';
import { createQuitGate } from './quit-gate';

/**
 * Quitting with the fire still lit, named before it happens.
 *
 * `app.on('before-quit')` fires whether the person picked "Quit Mender", hit
 * `Cmd+Q`, or closed the window (this file also routes the window's own close
 * box through it, so there is one gate rather than two). The rest of the app
 * hears the same thing MENDER.md already says about anything that cannot be
 * taken back: the first press only names the cost, and only a second press,
 * landing before it withdraws, actually lets it happen. With nobody working
 * it stays the one press it always was. The timing rule itself lives in
 * `quit-gate.ts`; this file is only the wiring onto Electron.
 */

export interface QuitGuardOptions {
  window: () => BrowserWindow | undefined;
  /** How many villagers are lit right now, on the whole island. */
  workingCount: () => number;
  /** Whatever else has to stop before the process actually goes. */
  dispose: () => Promise<void>;
}

export function installQuitGuard(app: App, options: QuitGuardOptions): void {
  const gate = createQuitGate();
  let quitting = false;

  app.on('before-quit', (event) => {
    if (quitting) return;
    const decision = gate.attempt(Date.now(), options.workingCount());
    if (decision === 'allow') {
      quitting = true;
      void options.dispose();
      return;
    }
    event.preventDefault();
    options.window()?.webContents.send(MENDER_QUIT_COST_CHANNEL, options.workingCount());
  });

  // Pressing the cost line itself is the same second press as the chord
  // again — it only counts inside the window the first press opened, so a
  // stale click after the line has already withdrawn does nothing.
  ipcMain.on(MENDER_CONFIRM_QUIT_CHANNEL, () => {
    if (gate.press(Date.now())) app.quit();
  });

  options.window()?.on('close', (event) => {
    if (quitting) return;
    event.preventDefault();
    app.quit();
  });
}
