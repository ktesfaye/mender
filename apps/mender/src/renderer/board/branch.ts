import type { FileChange } from '@emdash/core/runtimes/git/api';
import { card, dirOf, dom, h, head, label, sign } from '../glass/read';
import { fileRow } from './made';
import type { Row } from './row';

/**
 * Everything a session's branch changed, on the wood.
 *
 * Not what is uncommitted and not one commit: the whole branch, read against
 * the base it grew out of, the same way a pull request would show it — every
 * file it touched, listed once, each pressable into the same diff reading a
 * working change or a commit already uses.
 */
export function branchMade(base: string, files: readonly FileChange[] | undefined): Row[] {
  const sub = h('span', 'g-mute', 'since it left');
  const branch = h('span', 'gr-branch');
  branch.append(sign('merge', '#9bd28a', 13), document.createTextNode(base));
  const rows: Row[] = [
    dom(
      head({
        title: 'everything this session changed',
        sub: [sub, branch, h('span', 'g-faint', 'the whole branch, read against it')],
      })
    ),
    { kind: 'gap' },
  ];

  if (!files) {
    rows.push({ kind: 'line', text: 'reading what it touched…', tone: 'faded' });
    return rows;
  }
  if (!files.length) {
    rows.push({ kind: 'line', text: 'it has touched nothing yet.', tone: 'faded' });
    return rows;
  }

  const added = files.reduce((all, file) => all + file.additions, 0);
  const taken = files.reduce((all, file) => all + file.deletions, 0);

  const cols = h('div', 'gr-cols');
  const left = h('div');
  left.appendChild(label(files.length === 1 ? '1 file' : `${files.length} files`));
  const list = card('gr-files');
  const byDir = new Map<string, FileChange[]>();
  for (const file of files) {
    const dir = dirOf(file.path) || './';
    byDir.set(dir, [...(byDir.get(dir) ?? []), file]);
  }
  for (const [dir, here] of byDir) {
    const g = h('div', 'gr-dir');
    g.append(sign('folder', 'rgba(246,236,219,.42)', 13), document.createTextNode(dir));
    list.appendChild(g);
    for (const file of here) list.appendChild(fileRow(file, false, `branch-file:${file.path}`));
  }
  left.appendChild(list);

  const right = h('div');
  right.appendChild(label('how much'));
  const stat = card('gr-stat');
  for (const [n, what, cls] of [
    [added ? `+${added}` : '0', 'went in', added ? 'gr-add' : ''],
    [taken ? `−${taken}` : '0', 'came out', taken ? 'gr-del' : ''],
    [String(files.length), files.length === 1 ? 'file' : 'files', ''],
  ] as const) {
    const cell = h('div');
    cell.append(h('b', cls, n), h('span', '', what));
    stat.appendChild(cell);
  }
  right.appendChild(stat);
  cols.append(left, right);
  rows.push(dom(cols));
  return rows;
}

/** While git is still being asked what changed. */
export function unbranchMade(): Row[] {
  return [
    dom(head({ title: 'everything this session changed' })),
    { kind: 'gap' },
    { kind: 'line', text: 'reading it…', tone: 'faded' },
  ];
}

/** When git would not say. */
export function branchUnmade(because: string): Row[] {
  return [
    dom(head({ title: 'everything this session changed' })),
    { kind: 'gap' },
    { kind: 'line', text: because, tone: 'sore' },
  ];
}
