import type { Scope } from '@emdash/shared/concurrency';
import { observe, peek } from '@emdash/wire/state';
import { BrowserWindow, Notification } from 'electron';
import { MENDER_ATTEND_CHANNEL } from '@shared/channels';
import type { Mood } from '@shared/agents';
import type { Agents } from './agents';
import type { Tasks } from './tasks';

/**
 * Reaching him once the window itself is out of sight.
 *
 * The village already knows a villager's mood the moment it changes — that is
 * what lights a lantern — but a lit lantern only reaches somebody looking at
 * the island. This is the same mood map read a second time, from the main
 * process, for the one moment it is not enough to be lit: when the window is
 * not the frontmost thing on his screen.
 */

/** The moods that mean somebody is standing at the door wanting him. */
function wants(mood: Mood | undefined): boolean {
  return mood === 'asking' || mood === 'hurt';
}

/**
 * Which tasks just started wanting him, between one mood map and the next.
 *
 * A pure rule and nothing else, so it is the one part of this worth pinning
 * down with a test: a session that was already asking does not ring twice, a
 * session finishing a turn (working or arriving, settling to resting) counts
 * once, and a session going quiet again is not a reason to say anything.
 */
export function attentionsFrom(
  before: Record<string, Mood>,
  after: Record<string, Mood>
): string[] {
  const rung: string[] = [];
  for (const [task, mood] of Object.entries(after)) {
    const was = before[task];
    if (was === mood) continue;
    if (wants(mood) && !wants(was)) rung.push(task);
    else if (mood === 'resting' && (was === 'working' || was === 'arriving')) rung.push(task);
  }
  return rung;
}

export interface AttendOptions {
  scope: Scope;
  agents: Agents;
  tasks: Tasks;
  /** A session running as its own terminal has no transcript to read a
      notification's body off; this is where that line comes from instead. */
  tuiDoing?: (task: string) => string;
}

/**
 * Sound a system notification when a villager starts wanting him and the
 * window is not the frontmost thing on screen, and route a click on it back
 * to that session's yard — the same door the finder's own jump-to-waiting
 * chord walks through, over `MENDER_ATTEND_CHANNEL`.
 */
export function watchForAttention(options: AttendOptions): void {
  let previous: Record<string, Mood> | null = null;

  observe(
    options.agents.moods(),
    (snapshot) => {
      const now = snapshot.value;
      // The first reading seeds where things already stood; it never rings on
      // its own, or every session already asking when the app opens would
      // ring the moment it started up.
      if (previous === null) {
        previous = now;
        return;
      }
      const rung = attentionsFrom(previous, now);
      previous = now;
      for (const task of rung) void ring(task, now[task], options);
    },
    { scope: options.scope }
  );
}

async function ring(task: string, mood: Mood, options: AttendOptions): Promise<void> {
  const window = BrowserWindow.getAllWindows()[0];
  // Already looking at it: a banner would only double a lantern he is looking
  // straight at.
  if (window && !window.isDestroyed() && window.isFocused()) return;
  if (!Notification.isSupported()) return;

  const record = (await options.tasks.list()).find((candidate) => candidate.id === task);
  if (!record) return;
  const doing =
    record.kind === 'terminal' && options.tuiDoing
      ? options.tuiDoing(task)
      : peek(options.agents.working(task)).doing;

  const notice = new Notification({
    title: `${record.title} · mender`,
    body: doing,
  });
  notice.on('click', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win || win.isDestroyed()) return;
    win.show();
    win.focus();
    win.webContents.send(MENDER_ATTEND_CHANNEL, task);
  });
  notice.show();

  if (process.env.MENDER_DEBUG_PORT) {
    process.stdout.write(`[attend] ${mood}: ${record.title} — ${doing}\n`);
  }
}
