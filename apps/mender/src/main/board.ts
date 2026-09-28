import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { formatAbsolute } from '@emdash/core/primitives/path/api';
import type { TerminalKey, TerminalSessionList } from '@emdash/core/runtimes/terminals/api';
import { ReplicaState } from '@emdash/wire/live';
import type { LiveClientHandle } from '@emdash/wire/rpc';
import { load } from './pictures';
import type { MenderRuntimes } from './runtimes';
import { versionsOf, type Version } from './versions';

const ran = promisify(execFile);

/**
 * What the board asks of the main process directly.
 *
 * A file's own pixels, when it has any — `pictures.ts`'s own decoder, aimed
 * at whatever is open rather than a checkout's likeliest logo. And what a
 * shell is actually running right now, so ending it can name what it would
 * cost rather than asking blind.
 */
export interface Board {
  picture(path: string, width: number): Promise<{ src: string; wide: number; tall: number } | null>;
  /** The nearest thing to "what this shell is doing" a machine can answer
      without a real process-supervision protocol: its own pid's most
      recent child, if that child is not just another shell. */
  runningIn(key: TerminalKey): Promise<string | null>;
  /** A checkout's history by version, newest first. */
  versions(path: string): Promise<Version[]>;
}

/** Shell binaries themselves say nothing about what somebody is doing. */
const SHELLLIKE = /^(-?)(ba|z|fi|d)?sh$|^tmux/;

export function createBoard(runtimes: MenderRuntimes): Board {
  return {
    versions: (path) => versionsOf(path),
    async picture(path, width) {
      const image = await load(path, Math.max(1, Math.round(width)));
      if (!image) return null;
      const { width: wide, height: tall } = image.getSize();
      return { src: image.toDataURL(), wide, tall };
    },
    async runningIn(key) {
      const sessions = await oneShot<TerminalSessionList>(
        runtimes.terminals.sessions.state(undefined, 'list')
      );
      // A parsed absolute path is a structured value, not a string — two
      // reads of the same checkout are never `===`, only ever equal once
      // formatted back the same way.
      const wanted = formatAbsolute(key.workspace.path);
      const found = Object.values(sessions).find(
        (one) =>
          one.key.id === key.id &&
          one.key.workspace.host.id === key.workspace.host.id &&
          formatAbsolute(one.key.workspace.path) === wanted
      );
      const pid = found?.pid;
      if (!pid) return null;
      try {
        // Under tmux (the ordinary case — see `talking.ts`), the pid this
        // runtime tracks is the client attaching to it, not the pane: the
        // actual shell runs under tmux's own server, a separate process tree
        // entirely. That client's own command line names the exact session
        // it is attaching to, so asking tmux for that session's one pane's
        // pid is the direct route to the real shell, rather than guessing
        // from the checkout's path, which two shells in one checkout share.
        const attaching = await ran('ps', ['-o', 'command=', '-p', String(pid)]).catch(() => null);
        const session = attaching?.stdout.match(/attach-session\s+-t\s+=?(\S+)/)?.[1];
        const shellPid = session ? await panePid(session) : pid;
        if (!shellPid) return null;
        const kids = await ran('pgrep', ['-P', String(shellPid)]);
        const childPids = kids.stdout
          .trim()
          .split('\n')
          .filter(Boolean)
          .map(Number);
        if (!childPids.length) return null;
        // The most recently forked child is the nearest guess at what is in
        // the foreground — a shell forks its own pipeline left to right.
        const last = childPids.at(-1);
        if (!last) return null;
        const { stdout } = await ran('ps', ['-o', 'comm=', '-p', String(last)]);
        const name = stdout.trim().split('/').at(-1) ?? '';
        if (!name || SHELLLIKE.test(name)) return null;
        return name;
      } catch {
        // No children, or the process is already gone — either way, there is
        // nothing under the shell itself to name.
        return null;
      }
    },
  };
}

/** The one pane a session mender ever opens has, its own pid, straight from
    tmux itself. */
async function panePid(session: string): Promise<number | null> {
  try {
    const { stdout } = await ran('tmux', ['list-panes', '-t', session, '-F', '#{pane_pid}']);
    const pid = Number(stdout.trim().split('\n')[0]);
    return pid || null;
  } catch {
    return null;
  }
}

async function oneShot<T>(source: LiveClientHandle<T>): Promise<T> {
  const replica = new ReplicaState<T>(source, { onChange: () => {} });
  await replica.ready;
  const value = replica.current();
  await replica.dispose();
  return value;
}
