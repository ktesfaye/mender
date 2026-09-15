import { parseNativeAbsolute, type HostAbsolutePath } from '@emdash/core/primitives/path/api';
import { fileSearchContract, type ActiveRootStatus } from '@emdash/core/runtimes/file-search/api';
import { createLiveJobReplicaCache, LiveJobFailedError, ReplicaState } from '@emdash/wire/live';
import type { Found, FindingError } from '@shared/finding';
import type { MenderRuntimes } from './runtimes';

/**
 * Looking for something in a checkout, by name or by what is written in it.
 *
 * Both go through emdash's search index, which has to be told a root before it
 * will answer anything about it and takes a moment to read it. Holding the
 * root open is this module's job rather than the board's: a board that had to
 * think about index lifetimes would be a board that knew what an index was.
 */
export interface Finding {
  named(checkout: string, like: string): Promise<Look>;
  written(checkout: string, like: string): Promise<Look>;
}

type Look = { success: true; data: { found: Found[] } } | { success: false; error: FindingError };

/** How many files one answer names, and how much of one file is worth showing. */
const FILES = 60;
const IN_ONE = 40;
/** How long to wait for a checkout nobody has read yet, before giving up. */
const PATIENCE = 20000;

export function createFinding(runtimes: MenderRuntimes): Finding {
  /* One replica per checkout, kept for as long as the app runs. Asking is what
     builds the index and building it takes a moment, so the answer to the
     second keystroke has to arrive before the third. */
  const held = new Map<string, ReplicaState<ActiveRootStatus>>();

  function hold(root: HostAbsolutePath, at: string): ReplicaState<ActiveRootStatus> {
    const already = held.get(at);
    if (already) return already;
    const fresh = new ReplicaState<ActiveRootStatus>(
      runtimes.files.activeRoot.state({ root }, 'status'),
      { onChange: () => {} }
    );
    held.set(at, fresh);
    return fresh;
  }

  /**
   * Wait until the index has actually read the checkout.
   *
   * The first question asked of a checkout is what starts it reading, and a
   * large one takes long enough that an honest empty answer would arrive
   * first. An empty answer is indistinguishable from "there is no such file",
   * which is a lie, so the question waits instead of being answered wrongly.
   */
  async function ready(replica: ReplicaState<ActiveRootStatus>): Promise<boolean> {
    await replica.ready;
    const until = Date.now() + PATIENCE;
    for (;;) {
      const status = replica.current();
      if (status?.phase === 'failed') return false;
      if (status?.phase === 'active' && status.availability !== 'building') {
        return status.availability === 'searchable';
      }
      if (Date.now() > until) return false;
      await new Promise((wake) => setTimeout(wake, 120));
    }
  }

  return {
    async named(checkout, like) {
      const root = parseNativeAbsolute(checkout);
      if (!root.success) return { success: false, error: { kind: 'not-a-checkout' } };
      if (!(await ready(hold(root.data, checkout)))) {
        return { success: false, error: { kind: 'still-reading' } };
      }
      const found = await runtimes.files.searchPaths({
        root: root.data,
        query: like,
        kinds: ['file'],
        limit: FILES,
      });
      if (!found.success) return { success: false, error: unlooked(found.error) };
      return { success: true, data: { found: found.data.hits.map((hit) => ({ path: hit.path })) } };
    },

    async written(checkout, like) {
      const root = parseNativeAbsolute(checkout);
      if (!root.success) return { success: false, error: { kind: 'not-a-checkout' } };
      if (!(await ready(hold(root.data, checkout)))) {
        return { success: false, error: { kind: 'still-reading' } };
      }

      const jobs = createLiveJobReplicaCache(
        fileSearchContract.searchContent,
        runtimes.files.searchContent
      );
      const lease = await jobs.start({ root: root.data, query: like, limit: 400 });
      try {
        const job = await lease.ready();
        const result = await job.result;
        return {
          success: true,
          data: {
            found: result.files.slice(0, FILES).map((file) => ({
              path: file.path,
              lines: file.matches.slice(0, IN_ONE).map((match) => ({
                at: match.lineNumber,
                text: match.previewText,
              })),
            })),
          },
        };
      } catch (error) {
        if (error instanceof LiveJobFailedError) {
          return { success: false, error: unlooked(error.error as { type?: string }) };
        }
        throw error;
      } finally {
        await lease.release();
        await jobs.dispose();
      }
    },
  };
}

/**
 * What the index said, as one of the two things a board can do about it.
 *
 * A root still being read is not a failure: the next letter typed asks again,
 * and by then it usually knows. Everything else is a reason there is no answer
 * at all, and gets said.
 */
function unlooked(error: { type?: string; message?: string }): FindingError {
  if (error.type === 'index-not-ready') return { kind: 'still-reading' };
  return {
    kind: 'no-way-to-look',
    because: error.message ?? 'the index would not say what went wrong.',
  };
}
