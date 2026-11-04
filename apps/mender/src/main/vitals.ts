import { freemem } from 'node:os';
import { app, ipcMain, powerMonitor, type BrowserWindow, type IpcMainEvent } from 'electron';
import { MENDER_VITALS_CHANNEL, type Vitals } from '../shared/channels';
import { logger } from './logging';

/**
 * The host's side of the window's flight recorder.
 *
 * A page that is stuck cannot say so, and neither can one that was put to sleep
 * with the laptop and never came back right, so the only place either can be
 * noticed is from outside. The page says it is alive every few seconds; this
 * keeps the clock on that, writes down what the machine and the window were
 * doing around every sleep, lock and wake, and every few minutes writes the
 * numbers that explain a slow death (memory, document size, how long the oldest
 * call has been waiting) so the log shows the climb and not only the end.
 *
 * It writes when something happens or something is wrong, plus one line of
 * numbers every five minutes. A quiet day is a short log.
 */

/** A page that has not said so for this long, with its window on screen, is stuck. */
const MISSED_AFTER_MS = 20_000;
/** How often the host looks. */
const LOOK_EVERY_MS = 5000;
/** One line of numbers this often. */
const NUMBERS_EVERY_MS = 5 * 60_000;
/** A heap or document past this is said at once rather than waiting for the next line of numbers. */
const HEAP_WARN_BYTES = 900 * 1024 * 1024;
const NODES_WARN = 60_000;

const mb = (bytes: number): number => Math.round(bytes / (1024 * 1024));

/** Every process the app is running, and what each is costing right now. */
function processes(): Array<{ type: string; pid: number; mb: number; cpu: number }> {
  return app.getAppMetrics().map((one) => ({
    type: one.name ?? one.type,
    pid: one.pid,
    mb: mb(one.memory.workingSetSize * 1024),
    cpu: Math.round(one.cpu.percentCPUUsage * 10) / 10,
  }));
}

function windowState(window: BrowserWindow): Record<string, unknown> {
  if (window.isDestroyed()) return { destroyed: true };
  const contents = window.webContents;
  return {
    visible: window.isVisible(),
    minimized: window.isMinimized(),
    focused: window.isFocused(),
    loading: contents.isLoading(),
    crashed: contents.isCrashed(),
  };
}

export function watchVitals(window: BrowserWindow): void {
  const log = logger('vitals');
  let last: { at: number; beat: Vitals } | null = null;
  let outage: number | null = null;
  let warnedHeap = false;
  let warnedNodes = false;
  let tickedAt = Date.now();
  let wokeAt: number | null = null;

  ipcMain.on(MENDER_VITALS_CHANNEL, (event: IpcMainEvent, beat: Vitals) => {
    if (event.sender !== window.webContents) return;
    const now = Date.now();
    if (outage !== null) {
      log.info('page answered again', {
        silentForMs: now - outage,
        afterWake: wokeAt !== null ? now - wokeAt : null,
        ...windowState(window),
      });
      outage = null;
    }
    last = { at: now, beat };
    if (beat.heap > HEAP_WARN_BYTES && !warnedHeap) {
      warnedHeap = true;
      log.warn('page heap is large', {
        heapMb: mb(beat.heap),
        nodes: beat.nodes,
        processes: processes(),
      });
    }
    if (beat.nodes > NODES_WARN && !warnedNodes) {
      warnedNodes = true;
      log.warn('page document is large', { nodes: beat.nodes, heapMb: mb(beat.heap) });
    }
  });

  const look = setInterval(() => {
    const now = Date.now();
    const late = now - tickedAt - LOOK_EVERY_MS;
    tickedAt = now;
    /* This clock stopped too: the machine was asleep, and the silence says
       nothing about the page. Start counting again from the wake. */
    if (late > 10_000) {
      if (last) last.at = now;
      return;
    }
    if (window.isDestroyed() || !last || outage !== null) return;
    if (!window.isVisible() || window.isMinimized()) return;
    const silent = now - last.at;
    if (silent < MISSED_AFTER_MS) return;
    outage = last.at;
    log.warn('page stopped answering', {
      silentMs: silent,
      lastBeat: last.beat,
      ...windowState(window),
      processes: processes(),
    });
  }, LOOK_EVERY_MS);

  const numbers = setInterval(() => {
    if (window.isDestroyed()) return;
    log.info('numbers', {
      page: last
        ? {
            ageMs: Date.now() - last.at,
            heapMb: mb(last.beat.heap),
            nodes: last.beat.nodes,
            waiting: last.beat.waiting,
            oldest: last.beat.oldest,
            looking: last.beat.looking,
          }
        : null,
      processes: processes(),
      freeMemMb: mb(freemem()),
      upMin: Math.round(process.uptime() / 60),
    });
  }, NUMBERS_EVERY_MS);

  /* Sleep, lock and wake, each with where the window stood, then a look at
     whether the page is really answering a few seconds and a few more after.
     A wake that leaves the page silent is the whole of "frozen after sleep". */
  const power = (what: string) => (): void => {
    if (window.isDestroyed()) return;
    log.info(`machine: ${what}`, {
      ...windowState(window),
      onBattery: powerMonitor.isOnBatteryPower(),
    });
  };
  const afterWake = (what: string) => (): void => {
    if (window.isDestroyed()) return;
    wokeAt = Date.now();
    power(what)();
    for (const after of [3000, 10_000, 30_000]) {
      setTimeout(() => {
        if (window.isDestroyed() || !wokeAt) return;
        const age = last ? Date.now() - last.at : null;
        const fine = age !== null && age < 8000;
        const state = {
          afterMs: after,
          lastBeatAgeMs: age,
          ...windowState(window),
        };
        if (fine) log.info('after wake: page is answering', state);
        else log.warn('after wake: page is NOT answering', { ...state, processes: processes() });
      }, after).unref();
    }
  };
  powerMonitor.on('suspend', power('going to sleep'));
  powerMonitor.on('resume', afterWake('woke'));
  powerMonitor.on('lock-screen', power('screen locked'));
  powerMonitor.on('unlock-screen', afterWake('screen unlocked'));
  powerMonitor.on('shutdown', power('shutting down'));

  const edge = (what: string) => (): void => {
    if (!window.isDestroyed()) log.info(`window: ${what}`, windowState(window));
  };
  window.on('focus', edge('focus'));
  window.on('blur', edge('blur'));
  window.on('show', edge('show'));
  window.on('hide', edge('hide'));
  window.on('minimize', edge('minimize'));
  window.on('restore', edge('restore'));

  window.on('closed', () => {
    clearInterval(look);
    clearInterval(numbers);
    ipcMain.removeAllListeners(MENDER_VITALS_CHANNEL);
  });
}
