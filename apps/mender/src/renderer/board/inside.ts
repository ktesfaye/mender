import { DEFAULT_WATCHER_EXCLUDE } from '@emdash/core/primitives/exclusion-policy/api';
import { parseNativeAbsolute, type HostAbsolutePath } from '@emdash/core/primitives/path/api';
import type { FileEntry, FileTreeModel } from '@emdash/core/runtimes/files/api';
import { ReplicaState } from '@emdash/wire/live';
import type { MenderClient } from '../wire';
import type { Row } from './row';

/**
 * What is in a checkout, one folder at a time.
 *
 * A tree drawn as a tree is a thing you scroll past to find the thing you
 * wanted, and the board is a piece of wood. So it is a place you are standing
 * instead: one folder on the wood, its folders and then its files, and
 * pressing a folder walks into it the same way pressing a district walks into
 * a project. Escape walks back up, and out.
 *
 * The model underneath is live, so a file an agent writes while you are
 * looking at the folder appears in it.
 */
export interface LiveTree {
  /** Where you are standing, as a checkout-relative path. '' is the top. */
  at(): string;
  rows(): Row[];
  /** Start, change or abandon naming something new in this folder. */
  name(written: string | undefined): void;
  /** What is being named right now, if anything. */
  naming(): string | undefined;
  /** Walk into a folder, or back up. Returns false at the top. */
  walk(into: string): Promise<void>;
  up(): Promise<boolean>;
  close(): Promise<void>;
}

/** How many things one folder will name before it stops. */
const MANY = 300;

export async function openTree(
  client: MenderClient,
  checkout: string,
  name: string,
  changed: (rows: Row[]) => void
): Promise<LiveTree | null> {
  const parsed = parseNativeAbsolute(checkout);
  if (!parsed.success) return null;
  const root: HostAbsolutePath = parsed.data;

  let here = '';
  let tree: FileTreeModel | undefined;
  /** What is being named, when something new is being made in here. */
  let making: string | undefined;

  const model = client.files.tree.model;
  /* The same exclusions the watcher uses. A checkout is mostly things nobody
     put there, and reading them is what makes walking into one slow. */
  const key = {
    root,
    sessionId: `village:${checkout}`,
    exclusions: [...DEFAULT_WATCHER_EXCLUDE],
  };
  const replica = new ReplicaState(model.state(key, 'tree'), {
    onChange: (value) => {
      tree = value;
      changed(build());
    },
  });
  await replica.ready;
  tree = replica.current();

  async function open(path: string): Promise<void> {
    await model.mutate('expand', { key, input: { path: path as never } });
  }

  await open('');

  function build(): Row[] {
    const entry = tree?.entries[here];
    const rows: Row[] = [
      { kind: 'title', text: here ? lastOf(here) : name },
      { kind: 'line', text: here ? here : checkout, tone: 'faded', keep: 'tail' },
      { kind: 'gap' },
      // Walking to a file you can already name is the long way round.
      { kind: 'entry', mark: '→', text: 'look for something in here', tone: 'faded', pick: 'hunt' },
    ];
    /* Making something is a thing you do to the folder you are standing in,
       so it is offered by the folder and nowhere else. A name ending in a
       slash is a folder, which is the only way to say which you meant. */
    if (making === undefined) {
      rows.push({
        kind: 'entry',
        mark: '+',
        text: 'put something new in here',
        tone: 'faded',
        pick: 'make',
      });
      rows.push({ kind: 'gap' });
    } else {
      rows.push(
        { kind: 'line', text: 'name it. a slash at the end makes a folder.', tone: 'faded' },
        { kind: 'typed', text: making },
        { kind: 'gap' }
      );
    }
    if (!entry) {
      rows.push({ kind: 'line', text: 'reading it…', tone: 'faded' });
      return rows;
    }
    if (!entry.childrenLoaded) {
      rows.push({ kind: 'line', text: 'reading it…', tone: 'faded' });
      return rows;
    }

    const children = entry.children
      .map((path) => tree?.entries[path])
      .filter((child): child is FileEntry => Boolean(child));
    /* Folders first and then files, each in its own alphabet. A folder is a
       place and a file is a thing, and mixing them means reading the marks
       rather than the names. */
    const folders = children.filter(isFolder).sort(byName);
    const files = children.filter((child) => !isFolder(child)).sort(byName);

    if (!folders.length && !files.length) {
      rows.push({ kind: 'line', text: 'nothing in here.', tone: 'faded' });
      return rows;
    }

    for (const folder of folders.slice(0, MANY)) {
      rows.push({
        kind: 'entry',
        mark: '→',
        text: folder.name,
        keep: 'tail',
        pick: `into:${folder.path}`,
      });
    }
    for (const file of files.slice(0, MANY)) {
      rows.push({
        kind: 'entry',
        mark: file.kind === 'symlink' ? '·' : ' ',
        text: file.name,
        keep: 'tail',
        pick: `open:${file.path}`,
      });
    }
    const over = folders.length + files.length - MANY * 2;
    if (over > 0) {
      rows.push({ kind: 'gap' }, { kind: 'line', text: `and ${over} more.`, tone: 'faded' });
    }
    return rows;
  }

  return {
    at: () => here,
    rows: build,
    name: (written) => {
      making = written;
      changed(build());
    },
    naming: () => making,
    walk: async (into) => {
      making = undefined;
      here = into;
      changed(build());
      await open(into);
    },
    up: async () => {
      making = undefined;
      if (!here) return false;
      const cut = here.lastIndexOf('/');
      here = cut === -1 ? '' : here.slice(0, cut);
      changed(build());
      await open(here);
      return true;
    },
    close: async () => {
      await replica.dispose();
    },
  };
}

function isFolder(entry: FileEntry): boolean {
  return entry.kind === 'directory' || entry.symlinkTargetKind === 'directory';
}

function byName(one: FileEntry, other: FileEntry): number {
  return one.name.localeCompare(other.name);
}

function lastOf(path: string): string {
  const cut = path.lastIndexOf('/');
  return cut === -1 ? path : path.slice(cut + 1);
}
