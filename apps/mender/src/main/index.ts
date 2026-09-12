import { join } from 'node:path';
import { createScope } from '@emdash/shared/concurrency';
import { app, BrowserWindow } from 'electron';
import { createIslandState } from './island';
import { startRuntimes } from './runtimes';
import { createVillageController } from './village';
import { installWire } from './wire';

const scope = createScope({ label: 'mender' });

export async function main(): Promise<void> {
  const runtimes = startRuntimes(scope);
  installWire(scope, {
    ...runtimes.controllers,
    village: createVillageController({ state: createIslandState(runtimes.git) }),
  });

  await app.whenReady();
  await openVillageWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void openVillageWindow();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', () => {
    void scope.dispose();
  });
}

async function openVillageWindow(): Promise<void> {
  const window = new BrowserWindow({
    // Room for the island at one screen pixel per world pixel, which is the
    // only scale this art is drawn for.
    width: 1480,
    height: 1020,
    // The village is the whole interface, so the frame carries no app chrome
    // of its own; on macOS the traffic lights float over the world.
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#2d5d6b',
    show: false,
    webPreferences: {
      preload: join(app.getAppPath(), 'out', 'preload', 'index.mjs'),
      sandbox: false,
    },
  });

  window.once('ready-to-show', () => {
    window.show();
    window.focus();
  });

  // Renderer failures are invisible otherwise: electron-vite's dev output only
  // carries the build, so surface the village's own console in the terminal.
  window.webContents.on('console-message', (_event, _level, message, line, source) => {
    process.stdout.write(`[renderer] ${message} (${source}:${line})\n`);
  });
  window.webContents.on('render-process-gone', (_event, details) => {
    process.stdout.write(`[renderer] gone: ${details.reason}\n`);
  });

  const devServer = process.env.ELECTRON_RENDERER_URL;
  if (devServer) await window.loadURL(devServer);
  else await window.loadFile(join(app.getAppPath(), 'out', 'renderer', 'index.html'));
}
