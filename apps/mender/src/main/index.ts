import { join } from 'node:path';
import { createScope } from '@emdash/shared/concurrency';
import { peek } from '@emdash/wire/state';
import { app, BrowserWindow } from 'electron';
import { MENDER_WATCH_CHANNEL, type Watching } from '../shared/channels';
import { createAgents } from './agents';
import { createAgentsController } from './agents-controller';
import { createAppSettings } from './app-settings';
import { createAppSettingsController } from './app-settings-controller';
import { watchForAttention } from './attend';
import { watchStayingAwake } from './awake';
import { watchDockBadge } from './badge';
import { createBoard } from './board';
import { createBoardController } from './board-controller';
import { createChanges } from './changes';
import { createChangesController } from './changes-controller';
import { installDragOut } from './drag';
import { createFinding } from './finding';
import { createFindingController } from './finding-controller';
import { createGitHubStatus } from './github';
import { installGrip } from './grip';
import { logWindow } from './logging';
import { installAppMenu } from './menu';
import { watchMissed } from './missed';
import { createProjects } from './projects';
import { createProjectsController } from './projects-controller';
import { createPromptsController } from './prompts';
import { installQuitGuard } from './quit';
import { startRuntimes } from './runtimes';
import { createSchedules } from './schedules';
import { createSchedulesController } from './schedules-controller';
import { createSessionUsageReader } from './session-usage';
import { createSkyController } from './sky';
import { createTasks } from './tasks';
import { createTasksController } from './tasks-controller';
import { createTuiSessions, mergedMoods } from './tui-sessions';
import { createVillageController } from './village';
import { restoredBounds, watchWindowBounds } from './window-state';
import { installWire } from './wire';

export async function main(): Promise<void> {
  const scope = createScope({ label: 'mender' });
  /* A way to look at the village without standing in front of it.
     Verifying a change here means driving the real window and reading real
     pixels, and doing that through the mouse means taking over the screen of
     whoever is sitting at it. With this on, the window can be clicked and
     photographed over the debug port while it sits in the background. Off
     unless asked for. */
  const debugPort = process.env.MENDER_DEBUG_PORT;
  if (debugPort) {
    app.commandLine.appendSwitch('remote-debugging-port', debugPort);
    /* AND THE APP ITSELF DOES NOT COME TO THE FRONT. Showing the window
       without focus is not enough on macOS: launching an app activates the
       PROCESS, so every restart pulled the whole desktop over to the village
       whatever the window did. As an accessory it has no dock tile and never
       becomes the active app, so a run that restarts it a dozen times to
       photograph a dozen states goes by without him noticing. */
    if (process.platform === 'darwin') app.setActivationPolicy('accessory');
  }

  const runtimes = startRuntimes(scope);
  const appSettings = createAppSettings(runtimes);
  const projects = createProjects(runtimes, appSettings);
  const tasks = createTasks(runtimes, projects, appSettings);
  /* Forgetting a project sends everybody in it home, which means the projects
     have to be able to reach the tasks and the tasks already reach back. */
  projects.sweeps((project) => tasks.sweep(project));
  const agents = createAgents(runtimes, tasks, appSettings);
  // Same reason as `projects.sweeps` just above: the two need each other, so
  // one has to be told about the other after both exist.
  tasks.onGone((task, forget) => void agents.evict(task, forget));
  const tuiSessions = createTuiSessions(runtimes, appSettings, tasks, projects);
  const moods = mergedMoods(scope, agents.moods(), tuiSessions.moods());
  watchForAttention({
    scope,
    agents,
    tasks,
    appSettings,
    tuiDoing: (task) => tuiSessions.doing(task),
  });
  watchDockBadge({ scope, agents, moods });
  watchStayingAwake({ scope, agents, moods });
  const changes = createChanges(runtimes);
  const finding = createFinding(runtimes, projects);
  const sessionUsage = createSessionUsageReader(runtimes, tasks);
  const schedules = createSchedules(tasks, agents, projects);
  scope.add(() => agents.dispose());
  scope.add(() => tasks.dispose());
  scope.add(() => tuiSessions.dispose());
  scope.add(() => schedules.dispose());
  installWire(scope, {
    ...runtimes.controllers,
    agents: createAgentsController(agents, moods, tuiSessions),
    appSettings: createAppSettingsController(appSettings, sessionUsage),
    board: createBoardController(createBoard(runtimes)),
    changes: createChangesController(changes),
    finding: createFindingController(finding),
    github: createGitHubStatus(),
    projects: createProjectsController(projects),
    prompts: createPromptsController(),
    schedules: createSchedulesController(schedules),
    sky: createSkyController(projects, tasks),
    tasks: createTasksController(tasks),
    village: createVillageController({ state: () => projects.standing() }),
  });

  await app.whenReady();
  installAppMenu();
  const window = await openVillageWindow();
  watchMissed(window, { scope, agents, tasks, moods });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void openVillageWindow();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  installQuitGuard(app, {
    window: () => window,
    workingCount: () =>
      Object.values(peek(agents.moods())).filter((mood) => mood === 'working').length,
    dispose: () => {
      agents.closing();
      return scope.dispose();
    },
  });

  installDragOut(app);
  installGrip();
}

async function openVillageWindow(): Promise<BrowserWindow> {
  // Where it was last left, if that spot still lands on a real display —
  // otherwise the one scale this art is drawn for, room for the island at
  // one screen pixel per world pixel.
  const remembered = await restoredBounds();
  const window = new BrowserWindow({
    ...(remembered ?? { width: 1480, height: 1020 }),
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
      // The one place a session's own dev server is shown, in its own <webview>
      // rather than the village's window navigating anywhere. contextIsolation
      // and nodeIntegration stay at their (on/off) defaults for it; the page in
      // there is somebody else's, not this app's.
      webviewTag: true,
    },
  });
  watchWindowBounds(window);

  window.once('ready-to-show', () => {
    /* WITH THE DEBUG PORT OPEN THE WINDOW IS NEVER ON HIS SCREEN AT ALL.
       Somebody is driving this from outside while working in another app, and
       a village that lands on top of what they are doing every time it
       restarts is worse than no village.

       Not focus. `showInactive` leaves it unfocused and still drawn over
       everything, and neither does moving it away help: macOS clamps a window
       back until part of it is on a display, so it always leaves a strip. What
       does work is drawing it at nothing and refusing the mouse, because the
       screenshots and the clicks go over the port and never through the glass.
       The page composites exactly as it would in front of him. */
    if (process.env.MENDER_DEBUG_PORT) {
      window.setOpacity(0);
      window.setIgnoreMouseEvents(true);
      window.showInactive();
      return;
    }
    window.show();
    window.focus();
  });

  tellItWhoIsLooking(window);

  // Renderer failures are invisible otherwise: electron-vite's dev output only
  // carries the build, so surface the village's own console in the terminal.
  window.webContents.on('console-message', (_event, _level, message, line, source) => {
    process.stdout.write(`[renderer] ${message} (${source}:${line})\n`);
  });
  logWindow(window.webContents);
  window.webContents.on('render-process-gone', (_event, details) => {
    process.stdout.write(`[renderer] gone: ${details.reason}\n`);
  });

  const devServer = process.env.ELECTRON_RENDERER_URL;
  if (devServer) await window.loadURL(devServer);
  else await window.loadFile(join(app.getAppPath(), 'out', 'renderer', 'index.html'));

  return window;
}

/**
 * Tell the village whether anybody can actually see it.
 *
 * It draws itself at a rate worth the moment, and the biggest saving by far is
 * the one where the answer is nobody: he does not close this app, he leaves it
 * behind a terminal for a day at a time, and an island being drawn sixty times
 * a second into a window that is not on the screen is pure battery.
 *
 * The page is not allowed to work this out on its own. Background throttling is
 * off for this window on purpose — the wire underneath has to keep its own time
 * when the window is away, or a move already under way finishes minutes later in
 * the corner of your eye — and the price of that switch is a page which believes
 * it is visible forever. So the window itself says, because the window knows.
 *
 * Behind freezes the village the same as gone does, because he asked that it
 * cost nothing while he is working in something else. It stays glanceable all
 * the same: the page wakes for a moment to repaint a house whose session
 * changed state, then stops again.
 */
function tellItWhoIsLooking(window: BrowserWindow): void {
  let said: Watching | null = null;
  const say = (now: Watching): void => {
    if (now === said || window.isDestroyed()) return;
    said = now;
    window.webContents.send(MENDER_WATCH_CHANNEL, now);
  };
  const look = (): void => {
    if (!window.isVisible() || window.isMinimized()) return say('gone');
    say(window.isFocused() ? 'front' : 'behind');
  };
  window.on('focus', look);
  window.on('blur', look);
  window.on('show', look);
  window.on('hide', look);
  window.on('minimize', look);
  window.on('restore', look);
  /* And once the page is there to hear it, because everything above is an
     edge and the renderer misses every one that fired before it loaded. */
  window.webContents.on('did-finish-load', () => {
    said = null;
    look();
  });
}
