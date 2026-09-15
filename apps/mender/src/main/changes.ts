import { readFile, stat } from 'node:fs/promises';
import {
  formatAbsolute,
  joinAbsolute,
  parseNativeAbsolute,
  parsePortableRelativePath,
} from '@emdash/core/primitives/path/api';
import type { GitFileSource } from '@emdash/core/runtimes/git/api';
import type { At, Change, ChangeError } from '@shared/changes';
import { changedLines, type Edit } from './diff';
import type { MenderRuntimes } from './runtimes';

/**
 * What is different about one file, ready to be read on a board.
 *
 * Two sides. Ordinarily what git has committed and what is on the disk now,
 * which is what changed means while you are still working; git serves the
 * first out of its object store and the second is simply the file, so this is
 * the one place in the village that reads a working tree directly. Name a
 * commit instead and both sides come out of the object store: that commit and
 * the one before it, which is what changed meant when it was made.
 */
export interface Changes {
  file(checkout: string, path: string, at?: At): Promise<Read>;
}

type Read = { success: true; data: Change } | { success: false; error: ChangeError };

/** How much unchanged writing is kept either side of a change. */
const AROUND = 3;
/** A stretch longer than this is skipped rather than read past. */
const SKIP = AROUND * 2 + 1;
/** How many marked lines one board will carry. */
const LINES = 800;
/** Past this a file is not something anybody reads on a board. */
const HUGE = 4 * 1024 * 1024;

export function createChanges(runtimes: MenderRuntimes): Changes {
  return {
    async file(checkout, path, at) {
      const root = parseNativeAbsolute(checkout);
      if (!root.success) return { success: false, error: { kind: 'not-a-checkout' } };
      const relative = parsePortableRelativePath(path);
      if (!relative.success) return { success: false, error: { kind: 'not-in-the-checkout' } };
      const whole = joinAbsolute(root.data, relative.data);
      if (!whole.success) return { success: false, error: { kind: 'not-in-the-checkout' } };

      /* A file that is not in the older side at all comes back as nothing,
         which is the same answer as an empty file and has to be told apart
         from it: null means the file is new. */
      const version = async (source: GitFileSource): Promise<string | null | Wrong> => {
        const got = await runtimes.git.checkout.getFile({
          checkout: root.data,
          path: relative.data,
          source,
        });
        if (!got.success) return { because: said(got.error) };
        return got.data.content;
      };

      /* A commit with no parent is a root commit: there was nothing before it,
         so every line in it went in. */
      const older =
        at && !at.from ? null : await version(at ? outOf(at.from ?? '') : { kind: 'head' });
      if (wrong(older)) {
        return { success: false, error: { kind: 'unreadable', because: older.because } };
      }
      const before = older;

      const newer = at ? await version(outOf(at.sha)) : undefined;
      if (wrong(newer)) {
        return { success: false, error: { kind: 'unreadable', because: newer.because } };
      }
      const after: OnDisk =
        newer === undefined
          ? await onDisk(formatAbsolute(whole.data))
          : newer === null
            ? { kind: 'gone' }
            : binary(newer)
              ? { kind: 'binary' }
              : { kind: 'text', text: newer };
      if (after.kind === 'trouble') {
        return { success: false, error: { kind: 'unreadable', because: after.because } };
      }

      if (before === null && after.kind === 'gone') {
        return { success: false, error: { kind: 'unreadable', because: 'there is no such file.' } };
      }
      if (binary(before) || after.kind === 'binary') {
        return {
          success: true,
          data: { path, kind: 'binary', added: 0, taken: 0, lines: [] },
        };
      }

      const was = before === null ? [] : lines(before);
      const now = after.kind === 'gone' ? [] : lines(after.text);
      const edits = changedLines(was, now);
      const added = edits.filter((edit) => edit.mark === '+').length;
      const taken = edits.filter((edit) => edit.mark === '-').length;
      const kind: Change['kind'] =
        before === null
          ? 'new'
          : after.kind === 'gone'
            ? 'gone'
            : added || taken
              ? 'changed'
              : 'same';

      // Nothing changed: the lines of a file nobody changed are not a change.
      const marked = kind === 'same' ? [] : worth(edits);
      return {
        success: true,
        data: {
          path,
          kind,
          added,
          taken,
          lines: marked.slice(0, LINES),
          ...(marked.length > LINES ? { more: marked.length - LINES } : {}),
        },
      };
    },
  };
}

/** Something git would not hand over, carried back rather than thrown. */
interface Wrong {
  because: string;
}

function wrong(got: string | null | Wrong | undefined): got is Wrong {
  return typeof got === 'object' && got !== null;
}

/** One commit, as git names a thing to read a file out of. */
function outOf(sha: string): GitFileSource {
  return { kind: 'revision', revision: { kind: 'commit', sha } };
}

type OnDisk =
  | { kind: 'text'; text: string }
  | { kind: 'gone' }
  | { kind: 'binary' }
  | { kind: 'trouble'; because: string };

/** The file as it is right now, if it can be read as writing at all. */
async function onDisk(path: string): Promise<OnDisk> {
  let size: number;
  try {
    size = (await stat(path)).size;
  } catch (error) {
    // A file git knows about and the disk does not is a deletion, not a fault.
    if (missing(error)) return { kind: 'gone' };
    return { kind: 'trouble', because: why(error) };
  }
  if (size > HUGE) return { kind: 'binary' };
  try {
    const text = await readFile(path, 'utf8');
    return binary(text) ? { kind: 'binary' } : { kind: 'text', text };
  } catch (error) {
    return missing(error) ? { kind: 'gone' } : { kind: 'trouble', because: why(error) };
  }
}

function missing(error: unknown): boolean {
  return (error as { code?: string }).code === 'ENOENT';
}

function why(error: unknown): string {
  const said = error instanceof Error ? error.message : String(error);
  return said || 'the disk would not say.';
}

/** What the runtime actually said, in a sentence rather than a type name. */
function said(error: { type?: string; message?: string }): string {
  if (error.message) return error.message;
  return error.type ? `${error.type.replaceAll('_', ' ')}.` : 'git would not say.';
}

/** Writing with a hole in it is not writing: nothing here can draw it. */
function binary(text: string | null): boolean {
  return text !== null && text.includes('\0');
}

function lines(text: string): string[] {
  const written = text.replaceAll('\r\n', '\n');
  const all = written.split('\n');
  // A file that ends in a newline does not have an empty last line in it.
  if (all.length > 1 && all[all.length - 1] === '') all.pop();
  return all;
}

/**
 * The parts worth reading, with the long unchanged stretches taken out.
 *
 * A few lines either side of a change is what makes it legible; a hundred
 * unchanged lines between two changes is the rest of the file, and the board
 * says how much of it went by rather than carrying it.
 */
function worth(edits: readonly Edit[]): string[] {
  const keep = new Array<boolean>(edits.length).fill(false);
  for (let at = 0; at < edits.length; at++) {
    if (edits[at]?.mark === ' ') continue;
    for (
      let near = Math.max(0, at - AROUND);
      near <= Math.min(edits.length - 1, at + AROUND);
      near++
    ) {
      keep[near] = true;
    }
  }

  const read: string[] = [];
  let skipped = 0;
  for (let at = 0; at < edits.length; at++) {
    const edit = edits[at];
    if (!edit) continue;
    if (keep[at]) {
      if (skipped) {
        // Nothing is said about a gap of one or two: the gap is the saying.
        if (skipped > SKIP) read.push(`… ${skipped} lines`);
        else for (const passed of edits.slice(at - skipped, at)) read.push(` ${passed.text}`);
        skipped = 0;
      }
      read.push(`${edit.mark}${edit.text}`);
      continue;
    }
    skipped += 1;
  }
  if (skipped && skipped <= SKIP) {
    for (const passed of edits.slice(edits.length - skipped)) read.push(` ${passed.text}`);
  }
  return read;
}
