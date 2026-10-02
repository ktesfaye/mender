import { mermaidSVG } from '../diagram';
import type { Row, Run, Tone } from './row';

/**
 * Writing, read the way it was written.
 *
 * Agents write in markdown whether or not anybody asked them to, so a board
 * that draws it literally shows you asterisks and backticks and hashes instead
 * of the shape the writing was meant to have. This reads that shape and gives
 * the board rows back.
 *
 * It is deliberately not a markdown renderer. The board has one typeface at one
 * size and no second weight, so there is nothing to make bold with; what there
 * is instead is the gutter, the indent, the gap and the tone, and those turn
 * out to carry headings, lists, quotes and code perfectly well. Emphasis loses
 * its marks and keeps its words, which is the right way round: nobody ever
 * needed to see the asterisks.
 */

/** What a fenced block of code is edged with down its left side. */
const EDGE = '│ ';
/** How far one level of a list moves in, in characters. */
const IN = 2;
/** How wide a rule is drawn. Short of the board, so it reads as a pause. */
const RULE = 24;

const FENCE = /^\s*(```|~~~)(\s*\S*)?/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const RULED = /^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/;
const QUOTE = /^\s{0,3}>\s?(.*)$/;
const BULLET = /^(\s*)[-*+]\s+(.*)$/;
const NUMBERED = /^(\s*)(\d{1,3})[.)]\s+(.*)$/;
const TABLE = /^\s*\|.*\|\s*$/;

/**
 * One thing somebody said, as rows.
 *
 * The mark goes in the gutter of the first row only: it says who is talking,
 * and they do not start talking again every paragraph.
 */
export function saying(text: string, mark: string | undefined, tone?: Tone): Row[] {
  const rows: Row[] = [];
  const lines = text.split('\n');

  for (let at = 0; at < lines.length; at++) {
    const line = lines[at] ?? '';

    const fenced = FENCE.exec(line);
    if (fenced) {
      const lang = (fenced[2] ?? '').trim().toLowerCase();
      at++;
      const block: string[] = [];
      while (at < lines.length && !FENCE.test(lines[at] ?? '')) {
        block.push(lines[at] ?? '');
        at++;
      }
      const body = block.join('\n');
      const drawn = lang === 'mermaid' ? diagramRow(body) : null;
      if (drawn) {
        rows.push(drawn);
        continue;
      }
      for (const written of block) {
        rows.push({ kind: 'line', text: EDGE + written, tone: 'faded', keep: 'front', face: 'type' });
      }
      continue;
    }

    if (!line.trim()) {
      // One blank line between two paragraphs is a breath, not a hole: several
      // in a row are the writer hitting return, and they collapse into one.
      if (rows.length && rows[rows.length - 1]?.kind !== 'gap') rows.push({ kind: 'gap' });
      continue;
    }

    if (RULED.test(line)) {
      rows.push({ kind: 'line', text: '─'.repeat(RULE), tone: 'faded', face: 'type' });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      /* There is no heavier weight to set a heading in, so it is set in
         capitals with air above it, which is what a heading was before
         anybody had two weights to choose between. */
      if (rows.length && rows[rows.length - 1]?.kind !== 'gap') rows.push({ kind: 'gap' });
      rows.push({ kind: 'line', text: plainly(heading[2] ?? '').toUpperCase(), tone: 'ink' });
      continue;
    }

    if (TABLE.test(line)) {
      const block: string[] = [];
      while (at < lines.length && TABLE.test(lines[at] ?? '')) {
        block.push(lines[at] ?? '');
        at++;
      }
      at--;
      rows.push(...tabled(block));
      continue;
    }

    const quoted = QUOTE.exec(line);
    if (quoted) {
      rows.push({
        kind: 'prose',
        text: '',
        mark: '│',
        tone: 'faded',
        runs: runsOf(quoted[1] ?? ''),
      });
      continue;
    }

    const bullet = BULLET.exec(line);
    if (bullet) {
      rows.push(listed('·', bullet[1] ?? '', bullet[2] ?? '', tone));
      continue;
    }

    const numbered = NUMBERED.exec(line);
    if (numbered) {
      rows.push(listed(`${numbered[2]}.`, numbered[1] ?? '', numbered[3] ?? '', tone));
      continue;
    }

    /* An ordinary paragraph, gathered up to its blank line. Markdown breaks a
       paragraph wherever the writer's editor happened to wrap, and the board
       has its own width to wrap to. */
    const said: string[] = [line.trim()];
    while (at + 1 < lines.length && plain(lines[at + 1] ?? '')) {
      at++;
      said.push((lines[at] ?? '').trim());
    }
    rows.push({ kind: 'prose', text: '', tone, runs: runsOf(said.join(' ')) });
  }

  while (rows.length && rows[rows.length - 1]?.kind === 'gap') rows.pop();
  if (!rows.length) return [{ kind: 'prose', text, tone, ...(mark ? { mark } : {}) }];

  const first = rows[0];
  if (mark && first?.kind === 'prose') first.mark = mark;
  else if (mark) rows.unshift({ kind: 'prose', text: '', mark, tone, runs: [] });
  return rows;
}

/** Whether a line is just more of the paragraph above it. */
function plain(line: string): boolean {
  if (!line.trim()) return false;
  return !(
    FENCE.test(line) ||
    HEADING.test(line) ||
    RULED.test(line) ||
    QUOTE.test(line) ||
    BULLET.test(line) ||
    NUMBERED.test(line) ||
    TABLE.test(line)
  );
}

/**
 * A table, set out in columns.
 *
 * Markdown tables are written by hand and almost never line up in the source,
 * so leaving one as it came gives you a column of pipes in the wrong places.
 * Measured and padded it is a table rather than a row of punctuation — and it
 * is one of the few things on this board set in the type rather than the hand,
 * because the padding is only worth anything if every character is a column.
 */
function tabled(block: readonly string[]): Row[] {
  const grid = block
    .map((line) =>
      line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => plainly(cell.trim()))
    )
    // The row of dashes under the heading is how markdown says "that was the
    // heading"; the board says it with a rule instead.
    .filter((cells) => !cells.every((cell) => /^:?-{2,}:?$/.test(cell)));
  return columned(grid);
}

/**
 * A grid of cells, measured and padded into real columns.
 *
 * The shared part of `tabled`, for anything else that is a grid of cells
 * before it is anything else — a CSV file, mainly, whose columns are a comma
 * apart in the source but ought to line up on the board the way a spreadsheet
 * would show them.
 */
export function columned(grid: readonly string[][]): Row[] {
  if (!grid.length) return [];

  const across = Math.max(...grid.map((cells) => cells.length));
  const wide: number[] = [];
  for (let column = 0; column < across; column++) {
    wide[column] = Math.max(...grid.map((cells) => (cells[column] ?? '').length));
  }
  const laid = grid.map((cells) =>
    Array.from({ length: across }, (_, column) => (cells[column] ?? '').padEnd(wide[column] ?? 0))
      .join(' │ ')
      .trimEnd()
  );

  const rows: Row[] = [];
  const head = laid[0] ?? '';
  rows.push({ kind: 'line', text: head, tone: 'ink', keep: 'front', face: 'type' });
  rows.push({
    kind: 'line',
    text: '─'.repeat(head.length),
    tone: 'faded',
    keep: 'front',
    face: 'type',
  });
  for (const line of laid.slice(1)) {
    rows.push({ kind: 'line', text: line, tone: 'ink', keep: 'front', face: 'type' });
  }
  return rows;
}

function listed(mark: string, lead: string, text: string, tone?: Tone): Row {
  const deep = Math.min(3, Math.floor(lead.replace(/\t/g, '  ').length / 2));
  return {
    kind: 'prose',
    text: '',
    mark,
    tone,
    runs: runsOf(text),
    ...(deep ? { in: deep * IN } : {}),
  };
}

/* `code`, **bold**, *italic*, [text](url). Underscores are left alone on
   purpose: in this of all places a word with one in the middle is a name, not
   somebody leaning on a word. */
const QUOTING = /`([^`]+)`/;
const LINK = /!?\[([^\]]*)\]\(([^)]*)\)/;
const BOLD = /\*\*([^*]+)\*\*/;
const LEANT = /(^|[^*\w])\*([^*\s][^*]*)\*(?![*\w])/;

/**
 * One line of writing, cut where the way it is written changes.
 *
 * Only one thing actually changes: something quoted exactly — a name, a path,
 * a flag — is written cool against the wood so it reads as a thing rather than
 * a word. Everything else loses its marks and keeps its words.
 */
export function runsOf(text: string): Run[] {
  const runs: Run[] = [];
  let rest = plainly(text);
  for (;;) {
    const found = QUOTING.exec(rest);
    if (!found || found.index === undefined) break;
    if (found.index > 0) runs.push({ text: rest.slice(0, found.index) });
    runs.push({ text: found[1] ?? '', tone: 'quoted' });
    rest = rest.slice(found.index + found[0].length);
  }
  if (rest) runs.push({ text: rest });
  return runs.length ? runs : [{ text: '' }];
}

/** The same writing with its marks taken off and nothing else changed. */
function plainly(text: string): string {
  let out = text;
  for (;;) {
    const link = LINK.exec(out);
    if (!link) break;
    out =
      out.slice(0, link.index) +
      (link[1] || link[2] || '') +
      out.slice(link.index + link[0].length);
  }
  for (;;) {
    const bold = BOLD.exec(out);
    if (!bold) break;
    out = out.slice(0, bold.index) + (bold[1] ?? '') + out.slice(bold.index + bold[0].length);
  }
  for (;;) {
    const leant = LEANT.exec(out);
    if (!leant) break;
    out =
      out.slice(0, leant.index) +
      (leant[1] ?? '') +
      (leant[2] ?? '') +
      out.slice(leant.index + leant[0].length);
  }
  return out;
}

/** A `mermaid` fence, drawn and pannable — or null when it will not parse. */
function diagramRow(text: string): Row | null {
  const svg = mermaidSVG(text);
  return svg ? { kind: 'diagram', svg } : null;
}
