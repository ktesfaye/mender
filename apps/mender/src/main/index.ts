import { join } from 'node:path';
import { createScope } from '@emdash/shared/concurrency';
import { app, BrowserWindow } from 'electron';
import { createAgents } from './agents';
import { createAgentsController } from './agents-controller';
import { createProjects } from './projects';
import { createProjectsController } from './projects-controller';
import { startRuntimes } from './runtimes';
import { createTasks } from './tasks';
import { createTasksController } from './tasks-controller';
import { createVillageController } from './village';
import { installWire } from './wire';

const scope = createScope({ label: 'mender' });

export async function main(): Promise<void> {
  // Before anything asks for a path: userData is derived from the app's name,
  // and the package is called @emdash/mender, which would put his village under
  // a scoped folder named after the thing we forked.
  app.setName('Mender');

  /* A way to look at the village without standing in front of it.
     Verifying a change here means driving the real window and reading real
     pixels, and doing that through the mouse means taking over the screen of
     whoever is sitting at it. With this on, the window can be clicked and
     photographed over the debug port while it sits in the background. Off
     unless asked for. */
  const debugPort = process.env.MENDER_DEBUG_PORT;
  if (debugPort) app.commandLine.appendSwitch('remote-debugging-port', debugPort);

  const runtimes = startRuntimes(scope);
  const projects = createProjects(runtimes);
  const tasks = createTasks(runtimes, projects);
  const agents = createAgents(runtimes, tasks);
  scope.add(() => agents.dispose());
  installWire(scope, {
    ...runtimes.controllers,
    agents: createAgentsController(agents),
    projects: createProjectsController(projects),
    tasks: createTasksController(tasks),
    village: createVillageController({ state: () => projects.stages() }),
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
      // The village does not stop when you look away. Chromium winds a window's
      // frame loop right down as soon as it is not the one in front, which here
      // means the fire stops breathing and any move already under way crawls to
      // a halt and finishes minutes later, in the corner of your eye.
      backgroundThrottling: false,
    },
  });

  window.once('ready-to-show', () => {
    // With the debug port open somebody is driving this window from outside
    // while working in another one, and a village that jumps in front of them
    // every time the app restarts is worse than no village. So it comes up
    // where it is and stays behind.
    if (process.env.MENDER_DEBUG_PORT) {
      window.showInactive();
      return;
    }
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
