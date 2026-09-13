import type { Change } from '@shared/changes';
import type { Row } from './board';

/**
 * One file's change, on the wood.
 *
 * The same marks and the same two tones the transcript already uses for an
 * edit an agent made, because a change is a change wherever you meet it: what
 * went in reads warm, what came out reads sore, and everything around it is
 * there to tell you where you are rather than to be read.
 */
export function readOut(change: Change): Row[] {
  const rows: Row[] = [
    { kind: 'title', text: name(change.path) },
    ...where(change.path),
    { kind: 'line', text: what(change), tone: 'faded' },
    { kind: 'gap' },
  ];

  for (const line of change.lines) {
    if (line.startsWith('…')) {
      // What went by unchanged, said rather than scrolled through.
      rows.push({ kind: 'gap' }, { kind: 'line', text: line, tone: 'faded' }, { kind: 'gap' });
      continue;
    }
    const mark = line[0];
    rows.push({
      kind: 'line',
      text: line,
      tone: mark === '+' ? 'keen' : mark === '-' ? 'sore' : 'faded',
      keep: 'front',
    });
  }
  if (change.more) {
    rows.push(
      { kind: 'gap' },
      { kind: 'line', text: `and ${change.more} more lines.`, tone: 'faded' }
    );
  }
  return rows;
}

/** While git is still being asked. */
export function opening(path: string): Row[] {
  return [
    { kind: 'title', text: name(path) },
    ...where(path),
    { kind: 'line', text: 'reading it…', tone: 'faded' },
  ];
}

/** When it could not be read at all. */
export function unreadable(path: string, because: string): Row[] {
  return [
    { kind: 'title', text: name(path) },
    ...where(path),
    { kind: 'line', text: because, tone: 'sore' },
  ];
}

/**
 * Which folder it is in, when there is one.
 *
 * A file at the top of the checkout is its own whole path, and writing it
 * twice says nothing the second time.
 */
function where(path: string): Row[] {
  const cut = path.lastIndexOf('/');
  if (cut === -1) return [{ kind: 'gap' }];
  return [
    { kind: 'line', text: path.slice(0, cut), tone: 'faded', keep: 'front' },
    { kind: 'gap' },
  ];
}

/** The one line that says what happened to the file itself. */
function what(change: Change): string {
  const counted = [
    change.added ? `${change.added} in` : '',
    change.taken ? `${change.taken} out` : '',
  ].filter(Boolean);
  switch (change.kind) {
    case 'new':
      return counted.length ? `new, ${counted.join(' and ')}` : 'new and empty';
    case 'gone':
      return `gone, ${change.taken} lines with it`;
    case 'binary':
      return 'not writing, so there is nothing to read here';
    case 'same':
      return 'nothing in it changed';
    default:
      return counted.join(' and ');
  }
}

/** The name of the file, since the whole path is written under it anyway. */
function name(path: string): string {
  const cut = path.lastIndexOf('/');
  return cut === -1 ? path : path.slice(cut + 1);
}
