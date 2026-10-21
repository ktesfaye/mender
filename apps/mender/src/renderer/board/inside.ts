import { DEFAULT_WATCHER_EXCLUDE } from '@emdash/core/primitives/exclusion-policy/api';
import { parseNativeAbsolute, type HostAbsolutePath } from '@emdash/core/primitives/path/api';
import {
  isExpandableFileEntry,
  type FileEntry,
  type FileTreeModel,
} from '@emdash/core/runtimes/files/api';
import { ReplicaState } from '@emdash/wire/live';
import { cursor, dom, h, head, label, pressable, sign } from '../glass/read';
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

  /* Walking back into a checkout you already hold open resubscribes to the
     same server-side tree session (it is kept warm rather than torn down),
     so the snapshot this replica seeds from can already have the folder
     loaded. Asking the server to expand it again then waits on a revision
     the reused session will never re-announce to this new subscriber, which
     is what left the board reading "reading it…" forever. Skipping the
     mutation when the entry we asked for is already loaded avoids that wait
     entirely rather than trying to out-race it. */
  async function open(path: string): Promise<void> {
    const entry = tree?.entries[path];
    if (entry && isExpandableFileEntry(entry) && entry.childrenLoaded) return;
    await model.mutate('expand', { key, input: { path: path as never } });
  }

  await open('');

  function build(): Row[] {
    const entry = tree?.entries[here];
    const trail = h('div', 'gr-trail');
    const crumb = (text: string, to: string, current: boolean): HTMLElement => {
      const el = h('span', current ? 's cur' : 's', text);
      return current ? el : pressable(el, `into:${to}`, { loose: true });
    };
    trail.appendChild(crumb(name, '', !here));
    const parts = here ? here.split('/') : [];
    parts.forEach((part, i) => {
      trail.appendChild(h('span', 'g-faint', '/'));
      trail.appendChild(crumb(part, parts.slice(0, i + 1).join('/'), i === parts.length - 1));
    });
    const where = h('span', 'g-mono g-faint', here ? `${checkout}/${here}` : checkout);
    where.style.cssText = 'margin-left:10px;font-size:12px;overflow-wrap:anywhere';
    trail.appendChild(where);

    const rows: Row[] = [dom(head({ title: here ? lastOf(here) : name })), dom(trail)];

    const acts = h('div', 'gr-acts');
    acts.appendChild(
      pressable(
        tile('find', 'look in here', "by name, or by what's written", making === undefined),
        'hunt'
      )
    );
    /* Making something is a thing you do to the folder you are standing in,
       so it is offered by the folder and nowhere else. A name ending in a
       slash is a folder, which is the only way to say which you meant. */
    acts.appendChild(
      making === undefined
        ? pressable(tile('plus', 'put something new', 'a slash makes a folder'), 'make')
        : tile('plus', 'putting something new', 'a slash makes a folder', true)
    );
    rows.push(dom(acts));
    if (making !== undefined) {
      const field = h('div', 'gr-input');
      const said = h('span', '', making);
      said.appendChild(cursor());
      const plus = sign('plus', '#9bd28a', 16);
      field.append(plus, said);
      field.appendChild(
        h('span', 'hint', making.endsWith('/') ? 'a folder, since it ends in a slash' : 'name it')
      );
      rows.push(dom(field));
    }
    if (!entry || !entry.childrenLoaded) {
      rows.push({ kind: 'gap' }, { kind: 'line', text: 'reading it…', tone: 'faded' });
      return rows;
    }

    const children = entry.children
      .map((path) => tree?.entries[path])
      .filter((child): child is FileEntry => Boolean(child));
    /* Folders first and then files, each in its own alphabet. */
    const folders = children.filter(isFolder).sort(byName);
    const files = children.filter((child) => !isFolder(child)).sort(byName);

    if (!folders.length && !files.length) {
      rows.push({ kind: 'gap' }, { kind: 'line', text: 'nothing in here.', tone: 'faded' });
      return rows;
    }

    const lists = h('div', 'gr-lists');
    if (!folders.length) lists.style.gridTemplateColumns = '1fr';
    if (folders.length) {
      const col = h('div');
      col.appendChild(label('folders'));
      const list = h('div', 'gr-list');
      for (const folder of folders.slice(0, MANY)) {
        const el = h('div', 'gr-fol');
        const ic = h('span', 'gr-ic2');
        ic.appendChild(sign('folder', '#f2c66d', 16));
        const kids = folder.childrenLoaded ? folder.children.length : undefined;
        el.append(
          ic,
          h('span', 'n', folder.name),
          h('span', 'c', kids === undefined ? '' : kids === 1 ? '1 thing' : `${kids} things`)
        );
        list.appendChild(pressable(el, `into:${folder.path}`));
      }
      col.appendChild(list);
      lists.appendChild(col);
    }
    if (files.length) {
      const col = h('div');
      col.appendChild(label('files'));
      const list = h('div', 'gr-list');
      for (const file of files.slice(0, MANY)) {
        const el = h('div', 'gr-fl2');
        el.append(
          sign('file', '#f2c66d', 16),
          h('span', 'n', file.name),
          h('span', 'd', describe(file))
        );
        list.appendChild(pressable(el, `open:${file.path}`, { drag: file.path }));
      }
      col.appendChild(list);
      lists.appendChild(col);
    }
    rows.push(dom(lists));
    const over = folders.length + files.length - MANY * 2;
    if (over > 0)
      rows.push({ kind: 'gap' }, { kind: 'line', text: `and ${over} more.`, tone: 'faded' });
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

function tile(icon: string, title: string, about: string, hot = false): HTMLElement {
  const el = h('div', hot ? 'gr-tile hot' : 'gr-tile');
  const ic = h('div', 'ic');
  ic.appendChild(sign(icon, '#f2c66d', 18));
  const t = h('div');
  t.append(h('b', '', title), h('span', 'd', about));
  el.append(ic, t);
  return el;
}

const PICTURE = /\.(png|jpe?g|gif|webp|svg)$/i;

/** What kind of thing it is and how big, the way you would say it. */
function describe(file: FileEntry): string {
  const kind = PICTURE.test(file.name) ? 'picture' : /\.csv$/i.test(file.name) ? 'table' : '';
  const size = file.size === undefined ? '' : sized(file.size);
  return [kind, size].filter(Boolean).join(' · ');
}

function sized(bytes: number): string {
  if (bytes < 1024) return `${bytes} b`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} kb`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} mb`;
}
