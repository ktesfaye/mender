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
 * a list, a heading is a label, code is set in the type,
 * and a table is a table, with its columns lined up and its numbers to the
 * right. It is deliberately not the whole of markdown: nothing here needs
 * footnotes or HTML, and anything it does not know it leaves as writing.
 */

import { mermaidSVG } from '../diagram';
import { makeDiagramView } from '../diagram-view';
import { inkRuns, type InkRun } from './motion';
import { beside, figure, hangPictures, pictured } from './pictures';

/** A name in code that is a file the board reads well, so pressing it reads it here. */
const READABLE = /^(?:~\/|\/|\.\/)?[^\s`:*?"<>|]+\.(?:md|markdown|csv)$/i;
export const FILE_SCHEME = 'mender-file:';

const FENCE = /^\s*(```|~~~)(\s*\S*)?/;
const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const RULED = /^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/;
const QUOTE = /^\s{0,3}>\s?(.*)$/;
const BULLET = /^(\s*)[-*+]\s+(.*)$/;
const NUMBERED = /^(\s*)(\d{1,3})[.)]\s+(.*)$/;
const TABLE = /^\s*\|.*\|\s*$/;
const DIVIDER = /^:?-{2,}:?$/;

type Block =
  | { kind: 'para'; text: string }
  | { kind: 'heading'; text: string; level: number }
  | { kind: 'item'; mark: string; depth: number; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'code'; text: string; lang: string }
  | { kind: 'mermaid'; text: string }
  | { kind: 'table'; rows: string[][]; right: boolean[] }
  | { kind: 'rule' };

/** Read markdown into the blocks it is made of. */
export function blocksOf(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  for (let at = 0; at < lines.length; at++) {
    const line = lines[at] ?? '';
    if (!line.trim()) continue;

    const fenced = FENCE.exec(line);
    if (fenced) {
      const lang = (fenced[2] ?? '').trim().toLowerCase();
      const code: string[] = [];
      at++;
      while (at < lines.length && !FENCE.test(lines[at] ?? '')) code.push(lines[at++] ?? '');
      const body = code.join('\n');
      blocks.push(
        lang === 'mermaid' ? { kind: 'mermaid', text: body } : { kind: 'code', text: body, lang }
      );
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({ kind: 'heading', text: heading[2] ?? '', level: (heading[1] ?? '#').length });
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
 * its address both: it is the one mark here worth pressing. An address
 * written out bare is a link too, since that is how most of them arrive.
 */
export function runsOf(text: string): InkRun[] {
  const runs: InkRun[] = [];
  /* Underscores only count at a word's edge: `mcp__server__tool` is a name,
     not a name with a bold word in the middle of it. */
  const pattern =
    /`([^`]+)`|\*\*([^*]+)\*\*|(?<![\w])__([^_]+)__(?![\w])|(?<![\w*])\*([^*\s][^*]*)\*(?![\w*])|\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)|<(https?:\/\/[^>\s]+)>|(https?:\/\/[^\s<>]*[^\s<>.,;:!?'")\]])/g;
  let from = 0;
  for (const found of text.matchAll(pattern)) {
    const at = found.index ?? 0;
    if (at > from) runs.push({ text: text.slice(from, at) });
    if (found[1] !== undefined) {
      runs.push({
        text: found[1],
        className: 'prose-code',
        ...(READABLE.test(found[1]) ? { href: `${FILE_SCHEME}${found[1]}` } : {}),
      });
    }
    else if (found[2] !== undefined || found[3] !== undefined) {
      runs.push({ text: found[2] ?? found[3] ?? '', className: 'prose-heavy' });
    } else if (found[4] !== undefined) runs.push({ text: found[4], className: 'prose-lean' });
    else if (found[6] !== undefined && /^https?:\/\//.test(found[6])) {
      runs.push({ text: found[5] ?? '', href: found[6] });
    } else if (found[5] !== undefined) runs.push({ text: found[5] });
    else {
      const url = found[7] ?? found[8] ?? '';
      runs.push({ text: url, href: url });
    }
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
 * `link` hears about a link being pressed. Nothing else in it is pressed:
 * what is said is read, and dragged across to be taken.
 */
export function prose(
  into: HTMLElement,
  id: string,
  text: string,
  fresh: boolean,
  link?: (url: string) => void
): void {
  into.replaceChildren();
  into.classList.add('prose');
  if (link && !into.dataset.linked) {
    into.dataset.linked = '1';
    into.addEventListener('click', (event) => {
      const anchor = (event.target as HTMLElement).closest('a');
      if (anchor && !window.getSelection()?.toString()) link(anchor.href);
    });
  }
  blocksOf(text).forEach((block, i) => {
    const part = `${id}#${i}`;
    switch (block.kind) {
      case 'para': {
        const { text: words, pictures } = pictured(block.text);
        if (!words) hangPictures(into, pictures);
        else {
          const para = written('p', part, words, fresh);
          into.appendChild(pictures.length ? beside(para, pictures) : para);
        }
        return;
      }
      case 'heading':
        into.appendChild(
          written('h', part, block.text, fresh, `prose-heading prose-h${Math.min(3, block.level)}`)
        );
        return;
      case 'quote':
        into.appendChild(written('q', part, block.text, fresh, 'prose-quote'));
        return;
      case 'item': {
        const item = document.createElement('div');
        item.className = 'prose-item';
        item.style.marginLeft = `${block.depth * 1.1}em`;
        const mark = document.createElement('span');
        mark.className = block.mark === '·' ? 'prose-mark prose-bullet' : 'prose-mark prose-number';
        mark.textContent = block.mark;
        const { text: words, pictures } = pictured(block.text);
        if (!words) {
          hangPictures(into, pictures);
          return;
        }
        const said = written('span', part, words, fresh);
        item.append(mark, pictures.length ? beside(said, pictures) : said);
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
        into.appendChild(codeCard(block.text, block.lang));
        return;
      }
      case 'mermaid': {
        into.appendChild(mermaidBlock(block.text));
        return;
      }
      case 'table':
        into.appendChild(table(block));
    }
  });
}

/**
 * Code, on a slate of its own with what language it is in over it, when it
 * says. A fence with no language that holds no drawing, nothing lined up in
 * columns, is a passage someone wants copied whole, a prompt or a message,
 * so its lines wrap rather than running off the slate.
 */
function codeCard(text: string, lang: string): HTMLElement {
  const card = document.createElement('div');
  card.className = 'prose-code-card';
  const head = document.createElement('div');
  head.className = 'prose-code-head';
  const named = document.createElement('span');
  named.textContent = lang;
  head.appendChild(named);
  const copy = document.createElement('span');
  copy.className = 'press';
  copy.textContent = 'copy';
  copy.addEventListener('mousedown', (event) => event.preventDefault());
  copy.addEventListener('click', () => {
    window.mender.keep(text);
    copy.textContent = 'copied';
    window.setTimeout(() => (copy.textContent = 'copy'), 2000);
  });
  head.appendChild(copy);
  card.appendChild(head);
  const code = document.createElement('pre');
  code.className = 'prose-block';
  if (!lang && !DRAWN.test(text)) code.classList.add('prose-block-wraps');
  code.textContent = text;
  card.appendChild(code);
  return card;
}

/** Box drawing, or a gap of spaces inside a line holding something in a column. */
const DRAWN = /[\u2500-\u257f\u2580-\u259f]|\S {2,}\S/;

/** A diagram, drawn — or, when it will not parse, its own fenced text back. */
function mermaidBlock(text: string): HTMLElement {
  const svg = mermaidSVG(text);
  if (!svg) {
    const code = document.createElement('pre');
    code.className = 'prose-block';
    code.textContent = text;
    return code;
  }
  const wrap = document.createElement('div');
  wrap.className = 'prose-mermaid';
  wrap.appendChild(makeDiagramView(svg));
  return wrap;
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
      const { text, pictures } = pictured(cells[c] ?? '');
      for (const one of pictures) cell.appendChild(figure(one));
      for (const run of runsOf(text)) {
        if (run.href) {
          const anchor = Object.assign(document.createElement('a'), {
            className: 'press',
            href: run.href,
            textContent: run.text,
          });
          anchor.addEventListener('click', (event) => event.preventDefault());
          cell.appendChild(anchor);
        } else if (run.className) {
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
