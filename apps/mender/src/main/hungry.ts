import type { Scope } from '@emdash/shared/concurrency';
import { log } from '@emdash/shared/logger';
import { cell, peek, type Cell } from '@emdash/wire/state';
import { BrowserWindow, Notification } from 'electron';
import { MENDER_ATTEND_CHANNEL } from '@shared/channels';
import { FIVE_HOURS_MS } from '@shared/five-hours';
import {
  cheaperThan,
  isHungry,
  STRETCH_MS,
  type Hungry,
  type HungryChoice,
} from '@shared/hungry';
import type { Agents } from './agents';
import type { ClaudeUsage } from './claude-usage';
import type { FiveHoursReader } from './five-hours';
import type { Tasks } from './tasks';

/**
 * Who is eating the five hours, caught while they do it.
 *
 * Every half minute, while anybody is working, each working Claude session's
 * last stretch is read off its own transcript and put against the window: how
 * much of it that stretch took, and how many times what a session here
 * normally takes in one. The meter itself says how much of the window a
 * token is worth right now, since how much was spent and how full it is are
 * both known. A session that is well out of the ordinary is stopped where it
 * is and asked about: carry on, carry on with something cheaper, or leave it
 * stopped. Carrying on picks it back up from exactly where it was. Once it
 * has been answered it is only asked about again after it has taken another
 * real piece of the window, so a session he has said yes to is not stopped
 * every half minute for the same thing.
 */
export interface HungryWatch {
  all(): Cell<Record<string, Hungry>>;
  answer(task: string, choice: HungryChoice): Promise<void>;
}

const EVERY_MS = 30_000;
/** Answered once, it is only asked about again after taking this much more. */
const AGAIN_AFTER = 0.1;

export function watchHungry(options: {
  scope: Scope;
  agents: Agents;
  tasks: Tasks;
  usage: ClaudeUsage;
  fiveHours: FiveHoursReader;
}): HungryWatch {
  const { agents, tasks, usage, fiveHours } = options;
  const state = cell<Record<string, Hungry>>({}, { name: 'hungry' });
  /** What each session had taken of the window when he last answered, by window. */
  const answered = new Map<string, { resetsAt: number; taken: number }>();
  let ticking = false;

  async function tick(): Promise<void> {
    const moods = peek(agents.moods());
    const working = Object.entries(moods)
      .filter(([, mood]) => mood === 'working')
      .map(([task]) => task);
    if (!working.length) return;
    const mine = agents.claudeSessions().filter((one) => working.includes(one.task));
    if (!mine.length) return;

    const reading = await fiveHours.reading();
    const window = reading?.fiveHour;
    if (!window) return;
    const now = Date.now();
    const start = window.resetsAt - FIVE_HOURS_MS;
    const [whole, recent, usual] = await Promise.all([
      usage.since(start, now),
      usage.since(now - STRETCH_MS, now),
      usage.usualStretch(STRETCH_MS),
    ]);
    const total = whole.reduce((sum, one) => sum + one.weighted, 0);
    if (total <= 0 || window.utilization <= 0) return;
    /* How much of the window one unit of spend is worth, right now. */
    const unit = window.utilization / total;
    const titles = new Map(peek(tasks.watch()).map((task) => [task.id, task.title]));

    for (const { task, session } of mine) {
      if (peek(state)[task]?.paused) continue;
      const spent = recent.find((one) => one.session === session);
      const sofar = whole.find((one) => one.session === session);
      if (!spent || !sofar) continue;
      const share = spent.weighted * unit;
      const windowShare = sofar.weighted * unit;
      const times = usual ? spent.weighted / usual : null;
      const before = answered.get(task);
      if (before && before.resetsAt === window.resetsAt && windowShare - before.taken < AGAIN_AFTER)
        continue;
      /* A dev instance can be told to call anything over a tiny share hungry,
         so the question can be driven without burning a real window. */
      const forced = Number(process.env.MENDER_HUNGRY_AT);
      if (!(forced > 0 ? share >= forced : isHungry(share, times))) continue;

      const pace = share / STRETCH_MS;
      const out = now + (1 - window.utilization) / pace;
      const model = nameOf(spent.model);
      const kit = peek(agents.kit(task));
      const flagged: Hungry = {
        task,
        title: titles.get(task) ?? 'a session',
        model,
        share,
        over: Math.round(STRETCH_MS / 60_000),
        usual: times,
        windowShare,
        runsOutAt: out < window.resetsAt ? out : null,
        resetsAt: window.resetsAt,
        used: window.utilization,
        paused: true,
        at: now,
        cheaper: cheaperThan(model, kit.models),
      };
      log.warn('hungry: stopping a session to ask', {
        area: 'hungry',
        task,
        share,
        usual: times,
        windowShare,
        model: spent.model,
      });
      const stopped = await agents.hush(task, false, true);
      if (!stopped.success) flagged.paused = false;
      state.update((all) => ({ ...all, [task]: flagged }));
      notify(flagged);
    }
  }

  const timer = setInterval(() => {
    if (ticking) return;
    ticking = true;
    void tick()
      .catch((error: unknown) =>
        log.warn('hungry: check failed', { area: 'hungry', error: String(error) })
      )
      .finally(() => {
        ticking = false;
      });
  }, EVERY_MS);
  options.scope.add(() => clearInterval(timer));

  return {
    all: () => state,
    async answer(task, choice) {
      const flagged = peek(state)[task];
      state.update((all) => {
        const next = { ...all };
        delete next[task];
        return next;
      });
      if (flagged)
        answered.set(task, { resetsAt: flagged.resetsAt, taken: flagged.windowShare });
      log.info('hungry: answered', { area: 'hungry', task, choice: choice.kind });
      if (choice.kind === 'stop') return;
      if (choice.kind === 'switch') await agents.choose(task, 'model', choice.model);
      if (flagged?.paused) await agents.retryFailure(task);
    },
  };
}

/** "claude-fable-5-1" as people say it, "Fable 5.1". */
export function nameOf(model: string): string | null {
  const bare = model.replace(/^claude-/, '').replace(/-\d{8}$/, '');
  const match = /^([a-z]+)-(\d+)(?:-(\d+))?/.exec(bare);
  if (!match) return model || null;
  const family = match[1]!.charAt(0).toUpperCase() + match[1]!.slice(1);
  return `${family} ${match[2]}${match[3] ? `.${match[3]}` : ''}`;
}

function notify(flagged: Hungry): void {
  const window = BrowserWindow.getAllWindows()[0];
  if (window && !window.isDestroyed() && window.isFocused()) return;
  if (!Notification.isSupported()) return;
  const notice = new Notification({
    title: `${flagged.title} is eating your five hours`,
    body: `${Math.round(flagged.share * 100)}% of the window in ${flagged.over} minutes${
      flagged.paused ? '. Stopped it to ask you.' : '.'
    }`,
  });
  notice.on('click', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win || win.isDestroyed()) return;
    win.show();
    win.focus();
    win.webContents.send(MENDER_ATTEND_CHANNEL, flagged.task);
  });
  notice.show();
}
