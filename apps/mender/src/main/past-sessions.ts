import { join } from 'node:path';
import { createJsonFileKeyValueStore } from '@emdash/core/primitives/kv/node';
import type { ShellEnvManager } from '@emdash/core/services/shell-env/node';
import { log } from '@emdash/shared/logger';
import { app } from 'electron';
import { readClaudeStory } from './claude-cli-history';
import { tellPast } from './titler';

export interface PastTold {
  turns: number;
  /** What it did, in a sentence or two, or null when it could not be said. */
  did: string | null;
}

/** A session still being worked in is told again only once it has moved on
    by this much, not on every look at the board. */
const STALE_MS = 20 * 60_000;
const WARM_AT_ONCE = 3;

/** Raised whenever what a line is asked to say changes, so lines written
    to the old question are written again. */
const TOLD_VERSION = 2;

interface Kept extends PastTold {
  mtimeMs: number;
  v?: number;
}

/**
 * What each past Claude Code session came to, worked out once and kept.
 *
 * A transcript can run to hundreds of megabytes and saying what it did is a
 * call to a small model, so neither happens twice for the same session
 * unless it has been worked in since. Kept on this machine beside
 * everything else Mender keeps, keyed by the CLI's own session id.
 */
export function createPastSessions(env: Pick<ShellEnvManager, 'current'>): {
  told(dir: string, id: string, mtimeMs: number): Promise<PastTold>;
  /** Works through a list in the background, a few at a time, so the board
      has them ready by the time they are looked at. */
  warm(dir: string, sessions: readonly { id: string; mtimeMs: number }[]): void;
  /** Lets go of what was worked out about a session whose transcript is gone. */
  forget(id: string): Promise<void>;
} {
  const store = createJsonFileKeyValueStore({
    path: join(process.env.MENDER_DATA_DIR ?? app.getPath('userData'), 'past-sessions.json'),
  });
  const working = new Map<string, Promise<PastTold>>();

  const work = async (dir: string, id: string, mtimeMs: number): Promise<PastTold> => {
    const loaded = await store.get(id);
    const kept = loaded.success && loaded.data ? (loaded.data as unknown as Kept) : null;
    if (kept?.did && kept.v === TOLD_VERSION && kept.mtimeMs >= mtimeMs - STALE_MS) return { turns: kept.turns, did: kept.did };
    const story = await readClaudeStory(dir, id).catch(() => null);
    if (!story) return { turns: kept?.turns ?? 0, did: kept?.did ?? null };
    const did = await tellPast(env, story);
    if (did) {
      const put = await store.set(id, { mtimeMs, turns: story.turns, did, v: TOLD_VERSION } as unknown as never);
      if (!put.success) log.warn('past-sessions: could not keep', { area: 'past', id });
    }
    return { turns: story.turns, did: did ?? kept?.did ?? null };
  };

  const told = (dir: string, id: string, mtimeMs: number): Promise<PastTold> => {
    const going = working.get(id);
    if (going) return going;
    const made = work(dir, id, mtimeMs).finally(() => working.delete(id));
    working.set(id, made);
    return made;
  };

  let warming: { dir: string; id: string; mtimeMs: number }[] = [];
  let running = 0;
  const next = (): void => {
    while (running < WARM_AT_ONCE && warming.length) {
      const one = warming.shift()!;
      running++;
      void told(one.dir, one.id, one.mtimeMs).finally(() => {
        running--;
        next();
      });
    }
  };

  return {
    told,
    warm(dir, sessions) {
      warming = sessions.map((one) => ({ dir, id: one.id, mtimeMs: one.mtimeMs }));
      next();
    },
    async forget(id) {
      await store.delete(id);
    },
  };
}
