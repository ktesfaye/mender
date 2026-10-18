import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Scope } from '@emdash/shared/concurrency';
import { observe, type Cell } from '@emdash/wire/state';
import { app, nativeImage, powerMonitor, type NativeImage } from 'electron';
import type { Mood } from '@shared/agents';
import type { Agents } from './agents';
import { anyWorking } from './awake';

/**
 * The dock tile is the fire, and the fire says whether anybody is working.
 *
 * Lit, swaying in a wind that keeps turning and throwing sparks, while any
 * session anywhere is `working`; the moment the last one stops it goes out,
 * cold stones under the stars with bursts of smoke coming off the logs, and
 * a couple of minutes later it has stopped smoking and is simply cold. That
 * last part is the battery: handing the dock a frame every tick costs a few
 * percent of a core between this process and the Dock, which is fine beside
 * an agent that is working and not fine all day beside nobody. Both loops
 * are baked frame by frame by `tools/make-icon.py` into `assets/dock/`. The
 * still icon in the bundle is the first lit frame, which is what the dock
 * shows once the app has quit.
 *
 * It also stops while the screen is locked or the Mac is asleep, since
 * nobody can see a dock then; the badge is the dock's own and sits over
 * whichever frame.
 */
export interface DockFireOptions {
  scope: Scope;
  agents: Agents;
  /** The island's real mood map. Defaults to `agents.moods()`. */
  moods?: Cell<Record<string, Mood>>;
}

const FRAME_MS = 90;
const SMOULDER_MS = 2 * 60_000;

export function watchDockFire(options: DockFireOptions): void {
  if (process.platform !== 'darwin' || !app.dock) return;

  const dock = join(app.getAppPath(), 'assets', 'dock');
  /* Decoding a frame costs more than handing it over, so the loop on show is
     held decoded; the other one is dropped, since a loop is a few megabytes. */
  let held: { name: 'lit' | 'smoke'; images: NativeImage[] } | null = null;
  const frames = (name: 'lit' | 'smoke'): NativeImage[] => {
    if (held?.name !== name) {
      const dir = join(dock, name);
      const images = readdirSync(dir)
        .filter((file) => file.endsWith('.png'))
        .sort()
        .map((file) => nativeImage.createFromBuffer(readFileSync(join(dir, file))));
      held = { name, images };
    }
    return held.images;
  };

  let cold: NativeImage;
  try {
    cold = nativeImage.createFromPath(join(dock, 'cold.png'));
    frames('smoke');
  } catch {
    return;
  }

  let lit = false;
  let outSince = Date.now();
  let asleep = false;
  let tick = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  const stop = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };
  const draw = () => {
    if (!lit && Date.now() - outSince > SMOULDER_MS) {
      app.dock?.setIcon(cold);
      held = null;
      stop();
      return;
    }
    const loop = frames(lit ? 'lit' : 'smoke');
    if (loop.length === 0) return;
    app.dock?.setIcon(loop[tick % loop.length]);
    tick += 1;
  };
  const start = () => {
    if (timer || asleep) return;
    draw();
    if (lit || Date.now() - outSince <= SMOULDER_MS) timer = setInterval(draw, FRAME_MS);
  };

  observe(
    options.moods ?? options.agents.moods(),
    (snapshot) => {
      const now = anyWorking(snapshot.value);
      if (now === lit) return;
      lit = now;
      if (!lit) outSince = Date.now();
      start();
    },
    { scope: options.scope }
  );

  const sleep = () => {
    asleep = true;
    stop();
  };
  const wake = () => {
    asleep = false;
    start();
  };
  powerMonitor.on('lock-screen', sleep);
  powerMonitor.on('suspend', sleep);
  powerMonitor.on('unlock-screen', wake);
  powerMonitor.on('resume', wake);
  start();

  options.scope.add(() => {
    stop();
    powerMonitor.off('lock-screen', sleep);
    powerMonitor.off('suspend', sleep);
    powerMonitor.off('unlock-screen', wake);
    powerMonitor.off('resume', wake);
  });
}
