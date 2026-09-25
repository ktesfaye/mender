import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { createJsonFileKeyValueStore } from '@emdash/core/primitives/kv/node';
import { pluginRegistry } from '@emdash/plugins/agents';
import { app } from 'electron';
import type { Schedule, ScheduleHand, ScheduleWhen } from '@shared/schedules';
import type { Agents } from './agents';
import type { Projects } from './projects';
import type { Tasks } from './tasks';

const ran = promisify(execFile);

/** Held on disk beside a schedule, never sent to the village: when it last
    ran, and — for a `push` schedule — the base ref it last saw. */
interface Stored extends Schedule {
  lastDay?: string;
  lastRef?: string | null;
}

const KEY = 'schedules';

/** How often the clock is checked. Coarse enough to be cheap, fine enough
    that "due a minute out" actually reads as a minute. */
const TICK_MS = 15_000;

export interface Schedules {
  list(project: string): Promise<Schedule[]>;
  agents(): ScheduleHand[];
  add(
    project: string,
    what: string,
    agent: string,
    kind: 'chat' | 'terminal' | undefined,
    when: ScheduleWhen
  ): Promise<Schedule[]>;
  remove(id: string): Promise<Schedule[]>;
  dispose(): void;
}

export function createSchedules(tasks: Tasks, agents: Agents, projects: Projects): Schedules {
  const store = createJsonFileKeyValueStore({ path: join(userDataDir(), 'schedules.json') });

  const stored = async (): Promise<Stored[]> => {
    const loaded = await store.get(KEY);
    return loaded.success && Array.isArray(loaded.data) ? (loaded.data as unknown as Stored[]) : [];
  };

  const save = async (rows: Stored[]): Promise<Schedule[]> => {
    await store.set(KEY, rows as unknown as never);
    return outward(rows);
  };

  const outward = (rows: Stored[]): Schedule[] =>
    rows.map(({ lastDay: _lastDay, lastRef: _lastRef, ...row }) => row);

  /** The clock's own reading of "HH:MM", in this machine's own timezone. */
  const clockNow = (): { hhmm: string; day: string } => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return { hhmm: `${hh}:${mm}`, day: now.toDateString() };
  };

  /** The base branch's own ref, read straight off the checkout — no fetch,
      so this only ever notices what has already arrived. */
  const baseRef = async (path: string): Promise<string | null> => {
    try {
      const { stdout } = await ran('git', ['rev-parse', 'HEAD'], { cwd: path });
      return stdout.trim();
    } catch {
      return null;
    }
  };

  const due = async (row: Stored): Promise<boolean> => {
    if (row.when.kind === 'daily') {
      const { hhmm, day } = clockNow();
      return hhmm === row.when.time && row.lastDay !== day;
    }
    if (row.when.kind === 'hours') {
      const last = row.lastRun ? new Date(row.lastRun).getTime() : 0;
      return Date.now() - last >= row.when.n * 3_600_000;
    }
    // push: fires when the base ref has moved from the one last seen. The
    // baseline is captured, never fired, the first time a schedule is seen —
    // otherwise every schedule would fire the moment it was made.
    const project = (await projects.list()).find((one) => one.id === row.project);
    if (!project) return false;
    const now = await baseRef(project.path);
    if (now === null) return false;
    if (row.lastRef === undefined) {
      row.lastRef = now;
      return false;
    }
    return row.lastRef !== now;
  };

  const fire = async (row: Stored): Promise<void> => {
    const made = await tasks.begin(row.project, row.what, null, row.kind);
    if (!made.success) return;
    if (row.agent) await tasks.rehand(made.data.id, row.agent);
    if (row.kind !== 'terminal') await agents.tell(made.data.id, row.what);
  };

  const tick = async (): Promise<void> => {
    const rows = await stored();
    if (!rows.length) return;
    let changed = false;
    for (const row of rows) {
      if (!(await due(row))) continue;
      await fire(row);
      const { day } = clockNow();
      row.lastRun = new Date().toISOString();
      row.lastDay = day;
      if (row.when.kind === 'push') {
        const project = (await projects.list()).find((one) => one.id === row.project);
        row.lastRef = project ? await baseRef(project.path) : row.lastRef;
      }
      changed = true;
    }
    if (changed) await store.set(KEY, rows as unknown as never);
  };

  const timer = setInterval(() => void tick(), TICK_MS);

  return {
    async list(project) {
      return outward((await stored()).filter((row) => row.project === project));
    },
    agents() {
      return pluginRegistry
        .getAll()
        .filter((plugin) => plugin.capabilities.acp.kind === 'supported')
        .map((plugin) => ({ id: plugin.metadata.id, name: plugin.metadata.name }));
    },
    async add(project, what, agent, kind, when) {
      const rows = await stored();
      const row: Stored = {
        id: crypto.randomUUID(),
        project,
        what,
        agent,
        kind,
        when,
        lastRun: null,
      };
      /* A push schedule's baseline is captured right away, so it never fires
         on whatever the branch already was the moment it was made. */
      if (when.kind === 'push') {
        const found = (await projects.list()).find((one) => one.id === project);
        row.lastRef = found ? await baseRef(found.path) : null;
      }
      return save([...rows, row]);
    },
    async remove(id) {
      return save((await stored()).filter((row) => row.id !== id));
    },
    dispose() {
      clearInterval(timer);
    },
  };
}

function userDataDir(): string {
  return process.env.MENDER_DATA_DIR ?? app.getPath('userData');
}
