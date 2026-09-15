import type { FileContentModel } from '@emdash/core/runtimes/files/api';
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
  return rows;
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
