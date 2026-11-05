import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Logger } from '@emdash/shared/logger';

const run = promisify(execFile);

/**
 * Taking down what a finished session left running.
 *
 * A Claude session that starts a dev server, a dev copy of the village or a
 * watcher and then ends without stopping it leaves that process to launchd,
 * windowless and forgotten, holding its memory for days while nothing on the
 * island says it is there. Anything that is orphaned like that, was started
 * from inside Claude Code, and has been up for longer than a session would
 * reasonably leave something running between two of its own steps is taken
 * down here, with everything under it.
 */
const GRACE_MS = 60 * 60 * 1000;
const EVERY_MS = 15 * 60 * 1000;

export interface Proc {
  pid: number;
  ppid: number;
  uid: number;
  ageMs: number;
  command: string;
  fromClaude: boolean;
}

export function watchStrays(log: Logger): () => void {
  const first = setTimeout(() => void sweep(log), 60 * 1000);
  const every = setInterval(() => void sweep(log), EVERY_MS);
  every.unref();
  return () => {
    clearTimeout(first);
    clearInterval(every);
  };
}

export async function sweep(log: Logger): Promise<void> {
  try {
    const procs = await list();
    const doomed = strays(procs, process.getuid?.() ?? -1, process.pid);
    if (doomed.length === 0) return;
    const byPid = new Map(procs.map((p) => [p.pid, p]));
    for (const pid of doomed) {
      const p = byPid.get(pid);
      log.info('strays: taking down', {
        pid,
        ageMin: p ? Math.round(p.ageMs / 60000) : null,
        command: p?.command.slice(0, 160),
      });
      signal(pid, 'SIGTERM');
    }
    setTimeout(() => doomed.forEach((pid) => signal(pid, 'SIGKILL')), 5000).unref();
  } catch (error) {
    log.warn('strays: sweep failed', { error: String(error) });
  }
}

/** Every pid to take down: each stray root and everything under it. */
export function strays(procs: Proc[], uid: number, self: number): number[] {
  const children = new Map<number, number[]>();
  for (const p of procs) children.set(p.ppid, [...(children.get(p.ppid) ?? []), p.pid]);
  const tree = (pid: number): number[] => [...(children.get(pid) ?? []).flatMap(tree), pid];
  const byPid = new Map(procs.map((p) => [p.pid, p]));
  return procs
    .filter(
      (p) =>
        p.ppid === 1 && p.uid === uid && p.pid !== self && p.ageMs >= GRACE_MS && !kept(p.command)
    )
    .map((p) => tree(p.pid))
    .filter((pids) => pids.some((pid) => byPid.get(pid)?.fromClaude))
    .flat();
}

/**
 * An app a session opened for him, a shell he lives in, the phone's adb, or an
 * agent: never ours to sweep. An Electron out of `node_modules` is a dev copy
 * and a Python inside its framework is a script, not an app.
 */
function kept(command: string): boolean {
  return (
    (command.includes('.app/Contents/MacOS/') && !/\/node_modules\/|\.framework\//.test(command)) ||
    /^(\S*\/)?adb\b/.test(command) ||
    /(^|\/)tmux\b/.test(command) ||
    /(^|\/)claude(\s|$)/.test(command.split(' ')[0] ?? '')
  );
}

async function list(): Promise<Proc[]> {
  const fields = ['-axww', '-o', 'pid=,ppid=,uid=,etime=,command='];
  const [plain, withEnv] = await Promise.all([
    run('ps', fields, { maxBuffer: 64 * 1024 * 1024 }),
    run('ps', ['-E', ...fields], { maxBuffer: 64 * 1024 * 1024 }),
  ]);
  const claude = new Set<number>();
  for (const line of withEnv.stdout.split('\n')) {
    if (line.includes(' CLAUDECODE=1')) claude.add(Number(line.trim().split(/\s+/)[0]));
  }
  const procs: Proc[] = [];
  for (const line of plain.stdout.split('\n')) {
    const m = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/.exec(line);
    if (!m) continue;
    const pid = Number(m[1]);
    procs.push({
      pid,
      ppid: Number(m[2]),
      uid: Number(m[3]),
      ageMs: elapsed(m[4]!),
      command: m[5]!,
      fromClaude: claude.has(pid),
    });
  }
  return procs;
}

/** `ps`'s `[[dd-]hh:]mm:ss`. */
export function elapsed(etime: string): number {
  const [days, clock] = etime.includes('-') ? etime.split('-') : ['0', etime];
  const parts = clock!.split(':').map(Number).reverse();
  const seconds = (parts[0] ?? 0) + (parts[1] ?? 0) * 60 + (parts[2] ?? 0) * 3600;
  return (Number(days) * 86400 + seconds) * 1000;
}

function signal(pid: number, sig: NodeJS.Signals): void {
  try {
    process.kill(pid, sig);
  } catch {
    /* already gone */
  }
}
