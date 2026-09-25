/**
 * What an agent says, set the way it was written.
 *
 * Agents write in markdown whether or not anybody asked, and the column that
 * shows what it is thinking used to set all of it as one run of text: every
 * heading, list and table poured into a single paragraph with its pipes and
 * hashes still in it. `/context` came out as a wall of punctuation you could
 * not read a number off.
 *
 * So this reads the shape and sets it. A paragraph is a paragraph, a list is
 * a list, a heading is a label, code is set in the type and pressed to keep,
 * and a table is a table, with its columns lined up and its numbers to the
 * right. It is deliberately not the whole of markdown: nothing here needs
 * footnotes or HTML, and anything it does not know it leaves as writing.
 */

import { inkRuns, type InkRun } from './motion';

const FENCE = /^\s*(```|~~~)/;
const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const RULED = /^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/;
const QUOTE = /^\s{0,3}>\s?(.*)$/;
const BULLET = /^(\s*)[-*+]\s+(.*)$/;
const NUMBERED = /^(\s*)(\d{1,3})[.)]\s+(.*)$/;
const TABLE = /^\s*\|.*\|\s*$/;
const DIVIDER = /^:?-{2,}:?$/;

type Block =
  | { kind: 'para'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'item'; mark: string; depth: number; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'table'; rows: string[][]; right: boolean[] }
  | { kind: 'rule' };

/** Read markdown into the blocks it is made of. */
export function blocksOf(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  for (let at = 0; at < lines.length; at++) {
    const line = lines[at] ?? '';
    if (!line.trim()) continue;

    if (FENCE.test(line)) {
      const code: string[] = [];
      at++;
      while (at < lines.length && !FENCE.test(lines[at] ?? '')) code.push(lines[at++] ?? '');
      blocks.push({ kind: 'code', text: code.join('\n') });
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({ kind: 'heading', text: heading[2] ?? '' });
      continue;
    }
    if (RULED.test(line)) {
      blocks.push({ kind: 'rule' });
      continue;
    }
    if (TABLE.test(line)) {
      const raw: string[] = [];
      while (at < lines.length && TABLE.test(lines[at] ?? '')) raw.push(lines[at++] ?? '');
      at--;
      blocks.push(tabled(raw));
      continue;
    }
    const quoted = QUOTE.exec(line);
    if (quoted) {
      const said = [quoted[1] ?? ''];
      while (at + 1 < lines.length && QUOTE.test(lines[at + 1] ?? '')) {
        said.push(QUOTE.exec(lines[++at] ?? '')?.[1] ?? '');
      }
      blocks.push({ kind: 'quote', text: said.join(' ') });
      continue;
    }
    const bullet = BULLET.exec(line);
    const numbered = bullet ? null : NUMBERED.exec(line);
    if (bullet || numbered) {
      const indent = (bullet?.[1] ?? numbered?.[1] ?? '').length;
      const said = [bullet?.[2] ?? numbered?.[3] ?? ''];
      /* A list item carries on onto lines indented under it. */
      while (at + 1 < lines.length && continues(lines[at + 1] ?? '', indent)) {
        said.push((lines[++at] ?? '').trim());
      }
      blocks.push({
        kind: 'item',
        mark: bullet ? '·' : `${numbered?.[2]}.`,
        depth: Math.min(4, Math.floor(indent / 2)),
        text: said.join(' '),
      });
      continue;
    }
    /* An ordinary paragraph, gathered up to its blank line. Markdown breaks a
       paragraph wherever the writer's editor wrapped, and the column has its
       own width to wrap to. */
    const said = [line.trim()];
    while (at + 1 < lines.length && plain(lines[at + 1] ?? ''))
      said.push((lines[++at] ?? '').trim());
    blocks.push({ kind: 'para', text: said.join(' ') });
  }
  return blocks;
}

function continues(line: string, indent: number): boolean {
  if (!line.trim() || !plain(line)) return false;
  return line.length - line.trimStart().length > indent;
}

function plain(line: string): boolean {
  if (!line.trim()) return false;
  return ![FENCE, HEADING, RULED, QUOTE, BULLET, NUMBERED, TABLE].some((it) => it.test(line));
}

function tabled(raw: readonly string[]): Block {
  const cells = raw.map((line) =>
    line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim())
  );
  /* The dashes under the heading are how markdown says "that was the heading",
     and the colons in them are how it says which way a column leans. */
  const divider = cells.findIndex((row) => row.length && row.every((cell) => DIVIDER.test(cell)));
  const leans = divider === -1 ? [] : (cells[divider] ?? []).map((cell) => cell.endsWith(':'));
  const rows = cells.filter((_, i) => i !== divider);
  const across = Math.max(...rows.map((row) => row.length));
  /* A column of numbers reads to the right whether or not anybody put a colon
     there, because that is where the digits line up. */
  const right = Array.from({ length: across }, (_, column) => {
    if (leans[column]) return true;
    const body = rows.slice(divider === -1 ? 0 : 1).map((row) => row[column] ?? '');
    return (
      body.length > 0 && body.every((cell) => !cell || /^[~≈<>]?[\d.,]+\s*[%kKmMbB]?$/.test(cell))
    );
  });
  return { kind: 'table', rows, right };
}

/**
 * The runs inside one line of writing: plain, code, heavy, leaning, linked.
 *
 * Emphasis keeps its words and loses its marks. A link keeps its words and
 * its address both: it is the one mark here worth pressing.
 */
export function runsOf(text: string): InkRun[] {
  const runs: InkRun[] = [];
  /* Underscores only count at a word's edge: `mcp__server__tool` is a name,
     not a name with a bold word in the middle of it. */
  const pattern =
    /`([^`]+)`|\*\*([^*]+)\*\*|(?<![\w])__([^_]+)__(?![\w])|(?<![\w*])\*([^*\s][^*]*)\*(?![\w*])|\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let from = 0;
  for (const found of text.matchAll(pattern)) {
    const at = found.index ?? 0;
    if (at > from) runs.push({ text: text.slice(from, at) });
    if (found[1] !== undefined) runs.push({ text: found[1], className: 'prose-code' });
    else if (found[2] !== undefined || found[3] !== undefined) {
      runs.push({ text: found[2] ?? found[3] ?? '', className: 'prose-heavy' });
    } else if (found[4] !== undefined) runs.push({ text: found[4], className: 'prose-lean' });
    else if (found[6] !== undefined && /^https?:\/\//.test(found[6])) {
      runs.push({ text: found[5] ?? '', href: found[6] });
    } else runs.push({ text: found[5] ?? '' });
    from = at + found[0].length;
  }
  if (from < text.length) runs.push({ text: text.slice(from) });
  return runs;
}

/**
 * Set `text` into `into`, block by block.
 *
 * `id` names it for the ink, and each block inks under its own part of that
 * name, so only the block still being written fades in as it arrives.
 * `keep` hears about a block of code being pressed, or the whole answer
 * pressed anywhere that isn't a link or a code block of its own — the same
 * way a code block already goes onto the clipboard by being pressed.
 */
export function prose(
  into: HTMLElement,
  id: string,
  text: string,
  fresh: boolean,
  keep?: (code: string) => void,
  link?: (url: string) => void
): void {
  into.replaceChildren();
  into.classList.add('prose');
  if (keep) {
    into.classList.add('prose-press');
    into.title = 'press to keep it';
    into.addEventListener('mousedown', (event) => {
      if ((event.target as HTMLElement).closest('a,.prose-block')) return;
      event.preventDefault();
    });
    into.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const anchor = target.closest('a');
      if (anchor) {
        link?.(anchor.href);
        return;
      }
      if (target.closest('.prose-block')) return;
      keep(text);
    });
  }
  blocksOf(text).forEach((block, i) => {
    const part = `${id}#${i}`;
    switch (block.kind) {
      case 'para':
        into.appendChild(written('p', part, block.text, fresh));
        return;
      case 'heading':
        into.appendChild(written('h', part, block.text, fresh, 'prose-heading'));
        return;
      case 'quote':
        into.appendChild(written('q', part, block.text, fresh, 'prose-quote'));
        return;
      case 'item': {
        const item = document.createElement('div');
        item.className = 'prose-item';
        item.style.marginLeft = `${block.depth * 1.1}em`;
        const mark = document.createElement('span');
        mark.className = 'prose-mark';
        mark.textContent = block.mark;
        item.append(mark, written('span', part, block.text, fresh));
        into.appendChild(item);
        return;
      }
      case 'rule': {
        const rule = document.createElement('div');
        rule.className = 'prose-rule';
        into.appendChild(rule);
        return;
      }
      case 'code': {
        const code = document.createElement('pre');
        code.className = keep ? 'prose-block press' : 'prose-block';
        code.textContent = block.text;
        if (keep) {
          code.title = 'press to keep it';
          code.addEventListener('mousedown', (event) => event.preventDefault());
          code.addEventListener('click', () => keep(block.text));
        }
        into.appendChild(code);
        return;
      }
      case 'table':
        into.appendChild(table(block));
    }
  });
}

function written(
  tag: 'p' | 'h' | 'q' | 'span',
  id: string,
  text: string,
  fresh: boolean,
  className?: string
): HTMLElement {
  const el = document.createElement(tag === 'span' ? 'span' : 'div');
  if (className) el.className = className;
  else if (tag === 'p') el.className = 'prose-para';
  inkRuns(el, id, runsOf(text), fresh);
  return el;
}

function table(block: Extract<Block, { kind: 'table' }>): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'prose-table';
  const grid = document.createElement('table');
  block.rows.forEach((cells, r) => {
    const row = document.createElement('tr');
    const across = block.right.length;
    for (let c = 0; c < across; c++) {
      const cell = document.createElement(r === 0 ? 'th' : 'td');
      if (block.right[c]) cell.style.textAlign = 'right';
      for (const run of runsOf(cells[c] ?? '')) {
        if (run.className) {
          const span = document.createElement('span');
          span.className = run.className;
          span.textContent = run.text;
          cell.appendChild(span);
        } else cell.append(run.text);
      }
      row.appendChild(cell);
    }
    grid.appendChild(row);
  });
  wrap.appendChild(grid);
  return wrap;
}
