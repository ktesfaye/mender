import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { formatAbsolute, parseNativeAbsolute } from '@emdash/core/primitives/path/api';
import type { TerminalDevServerList, TerminalSessionList } from '@emdash/core/runtimes/terminals/api';
import type { TuiSessionList } from '@emdash/core/runtimes/tui-agents/api';
import { ReplicaState } from '@emdash/wire/live';
import type { LiveClientHandle } from '@emdash/wire/rpc';
import type { MenderRuntimes } from './runtimes';
import type { Tasks } from './tasks';

const execFileAsync = promisify(execFile);

/** One process's share, in the plain words the windmill already speaks in. */
export interface ProcessShare {
  label: string;
  cpuPercent: number;
  memBytes: number;
}

/** One session's whole share: everything running for it this machine could
    actually find a process for. */
export interface SessionUsage {
  task: string;
  title: string;
  shares: ProcessShare[];
  /** Dev servers this checkout has listening, counted rather than measured:
      a port is noticed by asking it, not by a process this machine can
      always attribute cleanly to one pid. */
  devServers: number;
}

export interface SessionUsageReader {
  /** Every open session's own share, sampled fresh each time. */
  sample(): Promise<SessionUsage[]>;
}

export function createSessionUsageReader(runtimes: MenderRuntimes, tasks: Tasks): SessionUsageReader {
  return {
    async sample() {
      const [list, tui, terminals, devServers] = await Promise.all([
        tasks.list(),
        oneShot<TuiSessionList>(runtimes.tuiAgents.sessions.state(undefined, 'list')),
        oneShot<TerminalSessionList>(runtimes.terminals.sessions.state(undefined, 'list')),
        oneShot<TerminalDevServerList>(runtimes.terminals.devServers.state(undefined, 'list')),
      ]);

      const pidsByTask = new Map<string, { label: string; pid: number }[]>();
      const addPid = (path: string, label: string, pid: number | undefined): void => {
        if (!pid) return;
        const task = list.find((one) => one.path === path);
        if (!task) return;
        const held = pidsByTask.get(task.id) ?? [];
        held.push({ label, pid });
        pidsByTask.set(task.id, held);
      };

      for (const [conversationId, session] of Object.entries(tui)) {
        const task = list.find((one) => one.id === conversationId);
        if (task && session.pid) addPid(task.path, 'agent process', session.pid);
      }
      for (const session of Object.values(terminals)) {
        if (session.status !== 'running' || !session.pid) continue;
        const path = pathOf(session.key.workspace.path);
        if (path) addPid(path, 'shell', session.pid);
      }
      const devServersByTask = new Map<string, number>();
      for (const server of Object.values(devServers)) {
        const path = pathOf(server.key.workspace.path);
        const task = path ? list.find((one) => one.path === path) : undefined;
        if (task) devServersByTask.set(task.id, (devServersByTask.get(task.id) ?? 0) + 1);
      }

      const allPids = [...pidsByTask.values()].flat().map((one) => one.pid);
      const measured = await psFor(allPids);

      const out: SessionUsage[] = [];
      for (const task of list) {
        const held = pidsByTask.get(task.id);
        const devCount = devServersByTask.get(task.id) ?? 0;
        if (!held?.length && !devCount) continue;
        out.push({
          task: task.id,
          title: task.title,
          shares: (held ?? [])
            .map((one) => {
              const found = measured.get(one.pid);
              return found ? { label: one.label, cpuPercent: found.cpuPercent, memBytes: found.memBytes } : null;
            })
            .filter((one): one is ProcessShare => one !== null),
          devServers: devCount,
        });
      }
      return out;
    },
  };
}

/** Formatted the way a task's own `path` string already is, so the two can
    be compared directly. */
function pathOf(path: unknown): string | null {
  const parsed = parseNativeAbsolute(String(path));
  return parsed.success ? formatAbsolute(parsed.data) : null;
}

/** One live model, read once and let go of — the windmill already resamples
    the machine-wide numbers on its own clock, so this rides the same one
    rather than staying subscribed between samples. */
async function oneShot<T>(source: LiveClientHandle<T>): Promise<T> {
  const replica = new ReplicaState<T>(source, { onChange: () => {} });
  await replica.ready;
  const value = replica.current();
  await replica.dispose();
  return value;
}

async function psFor(pids: number[]): Promise<Map<number, { cpuPercent: number; memBytes: number }>> {
  const map = new Map<number, { cpuPercent: number; memBytes: number }>();
  const unique = [...new Set(pids)];
  if (!unique.length) return map;
  try {
    const { stdout } = await execFileAsync('ps', ['-o', 'pid=,pcpu=,rss=', '-p', unique.join(',')]);
    for (const line of stdout.trim().split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const [pid, cpu, rss] = trimmed.split(/\s+/).map(Number);
      if (pid) map.set(pid, { cpuPercent: cpu || 0, memBytes: (rss || 0) * 1024 });
    }
  } catch {
    // A process that exited between listing and measuring says nothing,
    // which just means this sample leaves it out.
  }
  return map;
}
