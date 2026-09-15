import type { FileContentModel } from '@emdash/core/runtimes/files/api';
import type { BlameHunk } from '@emdash/core/runtimes/git/api';
import type { Row } from './board';

/**
 * A file, on the wood.
 *
 * The same writing the agents write in and the same writing a change is read
 * in, without the marks: a file is the plainest thing in here. Every line is
 * pressable, because the village has one place you write and it is the bottom
 * of the board, so changing a line means taking that line down to it.
 *
 * Nothing here scrolls past a size: a board that will not draw a large file is
 * worse than one that says the file is large, so the end of a long one is cut
 * off and said rather than silently missing.
 */

/** How many lines of one file a board will carry. */
const LINES = 2000;

export interface Read {
  path: string;
  content: FileContentModel;
  /** Which line is being rewritten, if one is, and what it says so far. */
  fixing?: { at: number; written: string };
  /** What it would be called instead, while it is being renamed. */
  renaming?: string;
  /** Set once it has been offered to throw the file away and asked twice. */
  asked?: boolean;
  /** Who last touched each run of lines, when that is what is being read. */
  blame?: readonly BlameHunk[];
}

export function read(state: Read): Row[] {
  const rows: Row[] = [{ kind: 'title', text: name(state.path) }, ...where(state.path)];
  const content = state.content;

  switch (content.kind) {
    case 'binary':
      rows.push({ kind: 'line', text: notWriting(content.byteSize), tone: 'faded' });
      return rows;
    case 'too-large':
      rows.push({
        kind: 'line',
        text: `${sized(content.byteSize)}, which is more than a board will hold.`,
        tone: 'faded',
      });
      return rows;
    case 'unavailable':
      rows.push({ kind: 'line', text: missing(content.code), tone: 'sore' });
      return rows;
  }

  const lines = content.content.split('\n');
  // A file ending in a newline has no empty last line; it has an end.
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();

  if (state.blame) return [...rows, ...whose(state.blame, lines)];

  rows.push({ kind: 'line', text: how(lines.length, content.readonly), tone: 'faded' });
  rows.push({ kind: 'gap' });

  for (let at = 0; at < Math.min(lines.length, LINES); at++) {
    if (state.fixing?.at === at) {
      rows.push({ kind: 'typed', text: state.fixing.written });
      continue;
    }
    rows.push({
      kind: 'line',
      text: lines[at] ?? '',
      tone: 'faded',
      keep: 'front',
      ...(content.readonly ? {} : { pick: `line:${at}` }),
    });
  }
  if (lines.length > LINES) {
    rows.push(
      { kind: 'gap' },
      { kind: 'line', text: `and ${lines.length - LINES} more lines.`, tone: 'faded' }
    );
  }
  return [...rows, ...over(state, content.readonly)];
}

/**
 * The two things you can do to a file rather than to its writing.
 *
 * At the bottom, under everything the file says, because you came here to read
 * it. Throwing one away asks twice like everything else that cannot be pressed
 * again; renaming does not, because a name is put back by typing the old one.
 */
function over(state: Read, readonly: boolean): Row[] {
  if (readonly || state.blame) return [];
  const rows: Row[] = [{ kind: 'gap' }];
  if (state.renaming !== undefined) {
    rows.push(
      { kind: 'line', text: 'call it something else. return does it.', tone: 'faded' },
      { kind: 'typed', text: state.renaming }
    );
    return rows;
  }
  rows.push({
    kind: 'entry',
    mark: '→',
    text: 'who last touched it',
    tone: 'faded',
    pick: 'blame',
  });
  rows.push({
    kind: 'entry',
    mark: '→',
    text: 'call it something else',
    tone: 'faded',
    pick: 'rename',
  });
  rows.push(
    state.asked
      ? {
          kind: 'entry',
          mark: '✗',
          text: 'press again and this file is gone',
          tone: 'sore',
          pick: 'bin!',
        }
      : { kind: 'entry', mark: '✗', text: 'throw this file away', tone: 'faded', pick: 'bin' }
  );
  return rows;
}

/**
 * Who last touched each run of lines.
 *
 * Not a name in the margin of every line. Writing is done in runs — twelve
 * lines somebody put in on a Tuesday, then four somebody else changed since —
 * and saying it once over the run is both the truth and far easier to read
 * than the same name stamped twelve times down the side of a board.
 */
function whose(hunks: readonly BlameHunk[], lines: readonly string[]): Row[] {
  const rows: Row[] = [
    { kind: 'line', text: 'who last touched it. escape goes back to reading it.', tone: 'faded' },
  ];
  if (!hunks.length) {
    rows.push(
      { kind: 'gap' },
      { kind: 'line', text: 'nobody: it is not committed.', tone: 'faded' }
    );
    return rows;
  }
  for (const hunk of hunks) {
    rows.push({ kind: 'gap' }, { kind: 'heading', text: by(hunk) });
    const from = Math.max(0, hunk.startLine - 1);
    for (const line of lines.slice(from, from + hunk.lineCount)) {
      rows.push({ kind: 'line', text: line, tone: 'faded', keep: 'front' });
    }
  }
  return rows;
}

function by(hunk: BlameHunk): string {
  const said = [`${hunk.author}, ${ago(hunk.date)}`];
  if (hunk.summary.trim()) said.push(hunk.summary.trim());
  return said.join(' · ');
}

/** How long ago, as somebody would say it rather than as a date. */
function ago(at: number): string {
  const days = (Date.now() - at) / 86400000;
  if (days < 1) return 'today';
  if (days < 2) return 'yesterday';
  if (days < 14) return `${Math.floor(days)} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 730) return `${Math.floor(days / 30.4)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

/** While the file is still being fetched. */
export function unopened(path: string): Row[] {
  return [
    { kind: 'title', text: name(path) },
    ...where(path),
    { kind: 'line', text: 'opening it…', tone: 'faded' },
  ];
}

/**
 * The one line saying what kind of file you are standing in front of.
 *
 * It says the lines can be rewritten because nothing else on the board would:
 * a line of writing does not look pressable, and this is the only place in the
 * village where pressing something changes what is on the disk.
 */
function how(lines: number, readonly: boolean): string {
  const many = lines === 1 ? 'one line' : `${lines} lines`;
  return readonly ? `${many}, and nothing here can change it` : `${many}. press one to rewrite it`;
}

function notWriting(bytes: number): string {
  return `${sized(bytes)} of something that is not writing, so there is nothing to read here`;
}

function missing(code: 'not-found' | 'no-permissions' | 'unavailable'): string {
  switch (code) {
    case 'not-found':
      return 'there is no such file.';
    case 'no-permissions':
      return 'this machine will not let anybody read it.';
    default:
      return 'it could not be read.';
  }
}

function sized(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}k`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}mb`;
}

function where(path: string): Row[] {
  const cut = path.lastIndexOf('/');
  if (cut === -1) return [{ kind: 'gap' }];
  return [
    { kind: 'line', text: path.slice(0, cut), tone: 'faded', keep: 'front' },
    { kind: 'gap' },
  ];
}

function name(path: string): string {
  const cut = path.lastIndexOf('/');
  return cut === -1 ? path : path.slice(cut + 1);
}
