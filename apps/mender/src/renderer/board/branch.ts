import type { FileChange } from '@emdash/core/runtimes/git/api';
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
  const rows: Row[] = [
    { kind: 'title', text: 'everything this session changed' },
    { kind: 'line', text: `against ${base}`, tone: 'faded' },
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

  rows.push({ kind: 'heading', text: counted(files) });
  for (const file of files) {
    rows.push({
      kind: 'entry',
      mark: mark(file.status),
      text: file.path,
      tone: file.status === 'deleted' ? 'sore' : file.status === 'added' ? 'keen' : 'faded',
      keep: 'tail',
      pick: `branch-file:${file.path}`,
    });
  }
  return rows;
}

/** While git is still being asked what changed. */
export function unbranchMade(): Row[] {
  return [
    { kind: 'title', text: 'everything this session changed' },
    { kind: 'gap' },
    { kind: 'line', text: 'reading it…', tone: 'faded' },
  ];
}

/** When git would not say. */
export function branchUnmade(because: string): Row[] {
  return [
    { kind: 'title', text: 'everything this session changed' },
    { kind: 'gap' },
    { kind: 'line', text: because, tone: 'sore' },
  ];
}

/** How much of the checkout it moved, as a heading over the list. */
function counted(files: readonly FileChange[]): string {
  const added = files.reduce((all, file) => all + file.additions, 0);
  const taken = files.reduce((all, file) => all + file.deletions, 0);
  const many = files.length === 1 ? 'one file' : `${files.length} files`;
  const moved = [added ? `${added} in` : '', taken ? `${taken} out` : ''].filter(Boolean);
  return moved.length ? `${many}, ${moved.join(' and ')}` : many;
}

/** Git's own letter for what happened to the file, the same one a status and
    a commit's own file list use. */
function mark(status: FileChange['status']): string {
  switch (status) {
    case 'added':
      return 'A';
    case 'deleted':
      return 'D';
    case 'renamed':
      return 'R';
    case 'conflicted':
      return 'U';
    default:
      return 'M';
  }
}
