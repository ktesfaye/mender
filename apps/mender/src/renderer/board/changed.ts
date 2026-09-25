import type { Change } from '@shared/changes';
import type { Row } from './row';

/** A note being written right now, against one line of the diff. */
export interface Noting {
  at: number;
  text: string;
}

/** Notes already pinned to a line, keyed by that line's position in
    `change.lines`. */
export type Pinned = ReadonlyMap<number, { id: string; text: string }>;

/**
 * One file's change, on the wood.
 *
 * The same marks and the same two tones the transcript already uses for an
 * edit an agent made, because a change is a change wherever you meet it: what
 * went in reads warm, what came out reads sore, and everything around it is
 * there to tell you where you are rather than to be read.
 */
export function readOut(
  change: Change,
  undoing?: 'offered' | 'asked',
  notes?: { noting?: Noting; pinned?: Pinned }
): Row[] {
  const rows: Row[] = [
    { kind: 'title', text: name(change.path) },
    ...where(change.path),
    { kind: 'line', text: what(change), tone: 'faded' },
    { kind: 'gap' },
  ];

  const pinned = notes?.pinned;
  const noting = notes?.noting;

  change.lines.forEach((line, at) => {
    if (line.startsWith('…')) {
      // What went by unchanged, said rather than scrolled through.
      rows.push({ kind: 'gap' }, { kind: 'line', text: line, tone: 'faded' }, { kind: 'gap' });
      return;
    }
    const mark = line[0];
    /* A diff is columns: what went in has to sit directly above what came out
       or it is not a diff, it is two paragraphs. So it is set in the type. */
    rows.push({
      kind: 'line',
      text: line,
      tone: mark === '+' ? 'keen' : mark === '-' ? 'sore' : 'faded',
      keep: 'front',
      face: 'type',
      // A line already being written on, or already noted, is not a second
      // way to open the same note — pressing the pinned note itself is.
      ...(noting?.at === at || pinned?.has(at) ? {} : { pick: `note:${at}` }),
    });
    if (noting?.at === at) {
      rows.push(
        { kind: 'line', text: 'say what is wrong with it. return pins it.', tone: 'faded' },
        { kind: 'typed', text: noting.text }
      );
      return;
    }
    const said = pinned?.get(at);
    if (said !== undefined) {
      rows.push({
        kind: 'entry',
        mark: '✎',
        text: said.text,
        tone: 'warn',
        pick: `note-off:${said.id}`,
      });
    }
  });
  if (change.more) {
    rows.push(
      { kind: 'gap' },
      { kind: 'line', text: `and ${change.more} more lines.`, tone: 'faded' }
    );
  }
  if (undoing) rows.push({ kind: 'gap' }, undo(change, undoing));
  return rows;
}

/**
 * Which line of the file a diff line at `at` is really talking about.
 *
 * The board only ever carries marked lines, never the file's own numbering,
 * so this walks back through them the same way git itself would: a kept or
 * added line moves the count on, a removed one does not, and a skipped
 * stretch moves it on by however many lines it said it was.
 */
export function lineNumberOf(change: Change, at: number): number {
  let line = 1;
  for (let i = 0; i < at; i++) {
    const text = change.lines[i] ?? '';
    if (text.startsWith('…')) {
      line += Number(/(\d+)/.exec(text)?.[1] ?? 0);
      continue;
    }
    if (text[0] !== '-') line += 1;
  }
  return line;
}

/**
 * Undoing it, which takes two presses.
 *
 * There is no undoing the undo: git keeps nothing it was never given, so what
 * this throws away is gone off the machine. Everything else in the village
 * happens on one press because everything else in the village can be pressed
 * again; this asks twice, and the second line says plainly what is about to
 * stop existing rather than asking whether you are sure.
 */
function undo(change: Change, undoing: 'offered' | 'asked'): Row {
  const away = change.kind === 'new';
  if (undoing === 'offered') {
    return {
      kind: 'entry',
      mark: '✗',
      text: away ? 'throw this file away' : 'put this file back the way it was',
      tone: 'faded',
      pick: 'undo',
    };
  }
  return {
    kind: 'entry',
    mark: '✗',
    text: away ? 'press again and this file is gone' : `press again and ${counted(change)} gone`,
    tone: 'sore',
    pick: 'undo!',
  };
}

function counted(change: Change): string {
  const many = change.added + change.taken;
  return many === 1 ? 'that one line is' : `those ${many} lines are`;
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
