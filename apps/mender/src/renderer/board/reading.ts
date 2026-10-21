import type { FileContentModel } from '@emdash/core/runtimes/files/api';
import type { BlameHunk } from '@emdash/core/runtimes/git/api';
import {
  chip,
  code,
  cursor,
  danger,
  dom,
  ghost,
  h,
  head,
  pressable,
  sign,
  writing,
} from '../glass/read';
import { makeRows } from '../yard/rows';
import { parseCSV } from './csv';
import type { Row } from './row';
import { columned } from './writing';

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
  /** The file's own pixels, for a picture. Undefined until asked for; null if
      the machine could not make a picture out of it after all. */
  picture?: { src: string; wide: number; tall: number } | null;
  /** A markdown file read as prose. Press the line at the bottom to read the
      writing itself instead. */
  raw?: boolean;
}

export function read(state: Read): Row[] {
  const content = state.content;
  const rows: Row[] = [];
  const top = (extra: HTMLElement[] = []): void => {
    rows.push(dom(head({ title: name(state.path), sub: [state.path, ...extra] })));
  };

  switch (content.kind) {
    case 'binary':
      if (state.picture) {
        top([chip('picture')]);
        rows.push(dom(tools(state, { kind: 'picture' })));
        const box = h('div', 'gr-pic');
        const img = h('img');
        img.src = state.picture.src;
        img.width = state.picture.wide;
        img.height = state.picture.tall;
        img.style.imageRendering =
          Math.max(state.picture.wide, state.picture.tall) <= 256 ? 'pixelated' : 'auto';
        box.append(img, h('span', 'g-faint', sized(content.byteSize)));
        rows.push(dom(box));
        return rows;
      }
      top([chip(sized(content.byteSize))]);
      rows.push(dom(tools(state, { kind: 'other' })), { kind: 'gap' });
      rows.push({ kind: 'line', text: notWriting(content.byteSize), tone: 'faded' });
      return rows;
    case 'too-large':
      top([chip(sized(content.byteSize))]);
      rows.push(dom(tools(state, { kind: 'other' })), { kind: 'gap' });
      rows.push({
        kind: 'line',
        text: `${sized(content.byteSize)}, which is more than a board will hold.`,
        tone: 'faded',
      });
      return rows;
    case 'unavailable':
      top();
      rows.push({ kind: 'gap' }, { kind: 'line', text: missing(content.code), tone: 'sore' });
      return rows;
  }

  const lines = content.content.split('\n');
  // A file ending in a newline has no empty last line; it has an end.
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  const readonly = content.readonly;
  const kind = isMarkdown(state.path) ? 'md' : isCSV(state.path) ? 'csv' : 'text';

  top([
    chip(languageOf(state.path)),
    chip(lines.length === 1 ? '1 line' : `${lines.length} lines`),
    ...(readonly ? [chip('nothing here can change it')] : []),
  ]);
  rows.push(dom(tools(state, { kind, readonly })));

  if (state.renaming !== undefined) {
    const field = h('div', 'gr-input gr-field');
    const said = h('span', '', state.renaming);
    said.appendChild(cursor());
    field.append(sign('edit', '#f2c66d', 16), said, h('span', 'hint', 'a new name for it'));
    rows.push(dom(field));
  }

  if (state.blame) {
    rows.push(dom(whose(state.blame, lines)));
    return rows;
  }

  /* A markdown file read plain shows the marks rather than the shape they are
     for — read it the way an agent's own words already are. */
  if (kind === 'md' && !state.raw) {
    rows.push(dom(writing(content.content)));
    return [...rows, ...over(state, readonly)];
  }
  /* A CSV reads as a table, the same padded columns markdown's own tables
     get, because a spreadsheet's columns are the whole point of looking at one. */
  if (kind === 'csv' && !state.raw) {
    rows.push(dom(prose(columned(parseCSV(content.content)))));
    return [...rows, ...over(state, readonly)];
  }

  const file = h('div', 'gr-file');
  const code$ = h('div', 'gr-code');
  for (let at = 0; at < Math.min(lines.length, LINES); at++) {
    const el = h('div', 'gr-fl');
    el.append(h('span', 'n', String(at + 1)));
    if (state.fixing?.at === at) {
      el.classList.add('edit');
      const c = h('span', 'c', state.fixing.written);
      c.appendChild(cursor());
      el.appendChild(c);
    } else {
      const c = h('span', 'c');
      c.appendChild(code(lines[at] ?? ''));
      el.appendChild(c);
      if (!readonly) pressable(el, `line:${at}`);
    }
    code$.appendChild(el);
  }
  if (lines.length > LINES) {
    code$.appendChild(h('div', 'gr-more', `and ${lines.length - LINES} more lines`));
  }
  file.appendChild(code$);
  rows.push(dom(file));
  return [...rows, ...over(state, readonly)];
}

/** What the file's own kind lets you do to how it is shown, and to the file. */
function tools(
  state: Read,
  how: { kind: 'text' | 'md' | 'csv' | 'picture' | 'other'; readonly?: boolean }
): HTMLElement {
  const bar = h('div', 'gr-tools');
  const writing = how.kind === 'text' || how.kind === 'md' || how.kind === 'csv';
  if (how.kind === 'md' || how.kind === 'csv') {
    const seg = h('div', 'gr-seg');
    const first = h('span', state.raw ? '' : 'gr-on');
    first.append(
      sign(how.kind === 'md' ? 'page' : 'layout', '#f2c66d', 13),
      document.createTextNode(how.kind === 'md' ? 'as writing' : 'as a table')
    );
    const second = h('span', state.raw ? 'gr-on' : '');
    second.append(sign('file', '#f2c66d', 13), document.createTextNode('the raw text'));
    if (state.raw) pressable(first, 'raw');
    else pressable(second, 'raw');
    seg.append(first, second);
    bar.appendChild(seg);
  } else if (how.kind === 'text') {
    const seg = h('div', 'gr-seg');
    const first = h('span', state.blame ? '' : 'gr-on');
    first.append(sign('file', '#f2c66d', 13), document.createTextNode('read'));
    const second = h('span', state.blame ? 'gr-on' : '');
    second.append(sign('blame', '#f2c66d', 13), document.createTextNode('who wrote it'));
    if (!state.blame) pressable(second, 'blame');
    seg.append(first, second);
    bar.appendChild(seg);
  }
  bar.appendChild(h('span', 'gr-fill'));
  if (writing && (how.kind === 'md' || how.kind === 'csv') && !state.blame) {
    bar.appendChild(pressable(ghost('who wrote it', 'blame'), 'blame'));
  }
  if (!state.blame) {
    bar.appendChild(pressable(ghost('open in editor', 'editor'), 'open-editor'));
    bar.appendChild(pressable(ghost('open properly', 'up'), 'open-it'));
    if (writing && !how.readonly)
      bar.appendChild(pressable(ghost('call it something else', 'edit'), 'rename'));
  }
  return bar;
}

/** Rows written into a card, which is how a markdown file or a table reads. */
function prose(rows: Row[]): HTMLElement {
  const box = h('div', 'gr-prose');
  makeRows(box, () => undefined).write(rows);
  return box;
}

/**
 * The thing you can do to a file rather than to its writing, at the bottom,
 * under everything the file says. Throwing one away asks twice like
 * everything else that cannot be pressed again.
 */
function over(state: Read, readonly: boolean): Row[] {
  if (readonly || state.blame || state.renaming !== undefined) return [];
  return [
    dom(
      danger({
        icon: 'trash_y',
        title: state.asked ? 'throw it away?' : 'throw this file away',
        said: state.asked
          ? 'nothing brings it back from here.'
          : 'if it is in a commit, git can bring it back.',
        button: state.asked ? 'yes, throw it away' : 'throw it away',
        pick: state.asked ? 'bin!' : 'bin',
        armed: state.asked,
      })
    ),
  ];
}

/**
 * Who last touched each run of lines.
 *
 * Writing is done in runs, so it says it once beside the run, with who, how
 * long ago and what they were doing, rather than stamping a name on every line.
 */
function whose(hunks: readonly BlameHunk[], lines: readonly string[]): HTMLElement {
  const file = h('div', 'gr-file');
  if (!hunks.length) {
    file.appendChild(h('div', 'gr-more', 'nobody: it is not committed.'));
    return file;
  }
  const authors = [...new Set(hunks.map((hunk) => hunk.author))];
  for (const hunk of hunks) {
    const from = Math.max(0, hunk.startLine - 1);
    const grid = h('div', 'gr-gw');
    const run = h('div', 'gr-bl');
    const inner = h('div', 'gr-run');
    inner.style.borderColor = TINTS[authors.indexOf(hunk.author) % TINTS.length] ?? '#f2c66d';
    inner.style.minHeight = `${hunk.lineCount * 24}px`;
    inner.append(
      h('b', '', `${hunk.author} · ${ago(hunk.date)}`),
      document.createTextNode(hunk.summary.trim())
    );
    run.appendChild(inner);
    const code$ = h('div', 'gr-code');
    lines.slice(from, from + hunk.lineCount).forEach((line, i) => {
      const el = h('div', 'gr-fl');
      el.appendChild(h('span', 'n', String(from + i + 1)));
      const c = h('span', 'c');
      c.appendChild(code(line));
      el.appendChild(c);
      code$.appendChild(el);
    });
    grid.append(run, code$);
    file.appendChild(grid);
  }
  return file;
}

const TINTS = ['#7aaaff', '#f2c66d', '#9bd28a', '#c9b2ff', '#f08a72'];

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

const LANGUAGES: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  json: 'json',
  md: 'markdown',
  mdx: 'markdown',
  css: 'css',
  html: 'html',
  py: 'python',
  rs: 'rust',
  go: 'go',
  rb: 'ruby',
  swift: 'swift',
  kt: 'kotlin',
  java: 'java',
  dart: 'dart',
  sh: 'shell',
  yml: 'yaml',
  yaml: 'yaml',
  toml: 'toml',
  csv: 'table',
  txt: 'text',
  sql: 'sql',
};

function languageOf(path: string): string {
  const ext = /\.([A-Za-z0-9]+)$/.exec(path)?.[1]?.toLowerCase();
  return (ext && LANGUAGES[ext]) || 'text';
}

/** While the file is still being fetched. */
export function unopened(path: string): Row[] {
  return [
    dom(head({ title: name(path), sub: [path] })),
    { kind: 'gap' },
    { kind: 'line', text: 'opening it…', tone: 'faded' },
  ];
}

const MARKDOWN = /\.mdx?$/i;
const CSV = /\.csv$/i;

function isMarkdown(path: string): boolean {
  return MARKDOWN.test(path);
}

function isCSV(path: string): boolean {
  return CSV.test(path);
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

function name(path: string): string {
  const cut = path.lastIndexOf('/');
  return cut === -1 ? path : path.slice(cut + 1);
}
