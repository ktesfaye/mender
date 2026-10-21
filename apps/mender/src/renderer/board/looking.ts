import { chip, cursor, dirOf, dom, h, head, nameOf, pressable, sign } from '../glass/read';
import type { Row } from './row';

/**
 * Looking for something in a checkout.
 *
 * Two questions, and they are genuinely different ones: where is the file
 * called this, and where is this written. The village asks them on the same
 * board and the same line, because the answer to both is a list of files you
 * press, and a board that made you choose a mode before you had typed anything
 * would be asking you to know which question you had.
 *
 * So you type, and it looks for names. One line switches to looking inside the
 * files instead, and what you have already typed goes with you.
 */
export interface Hunt {
  /** What is being looked for right now. */
  written: string;
  /** Names, or what is written inside them. */
  inside: boolean;
  /** Where the checkout is, said once at the top. */
  name: string;
  found: Found[];
  /** Set while the answer to what is on the line has not arrived. */
  asking: boolean;
  /** Set when the index has not finished reading the checkout yet. */
  unread: boolean;
}

/** One file that matched, and the lines of it that did. */
export interface Found {
  path: string;
  lines?: { at: number; text: string }[];
}

/** How many lines of one file are worth showing before it is just the file. */
const SHOWN = 4;

export function hunting(hunt: Hunt): Row[] {
  const lines = hunt.found.reduce((all, file) => all + (file.lines?.length ?? 0), 0);
  const count = hunt.inside
    ? `${lines === 1 ? '1 line' : `${lines} lines`} in ${hunt.found.length === 1 ? '1 file' : `${hunt.found.length} files`}`
    : hunt.found.length === 1
      ? '1 file'
      : `${hunt.found.length} files`;
  const rows: Row[] = [
    dom(
      head({
        title: hunt.inside ? 'where is it written' : 'where is it called',
        sub: [hunt.name],
        right: hunt.written && hunt.found.length ? [chip(count, '#9bd28a')] : [],
      })
    ),
  ];

  const q = h('div', 'gr-tools');
  const seg = h('div', 'gr-seg');
  const byName = h('span', hunt.inside ? '' : 'gr-on', 'by name');
  const byText = h('span', hunt.inside ? 'gr-on' : '', "by what's written");
  pressable(hunt.inside ? byName : byText, 'flip');
  seg.append(byName, byText);
  const field = h('div', 'gr-input');
  field.style.cssText = 'flex:1;margin-top:0';
  const said = h('span', '');
  if (hunt.written) said.textContent = hunt.written;
  else {
    said.className = 'ph';
    said.textContent = hunt.inside ? 'what is written in it' : 'what it is called';
  }
  said.appendChild(cursor());
  field.append(sign('find', '#f2c66d', 16), said);
  q.append(seg, field);
  rows.push(dom(q), { kind: 'gap' });

  if (!hunt.written) return rows;
  if (hunt.asking && !hunt.found.length) {
    rows.push({ kind: 'line', text: 'looking…', tone: 'faded' });
  } else if (hunt.unread) {
    /* An empty answer from an index that has not read the checkout yet is not
       the same as nothing matching, and saying it is would be a lie. */
    rows.push({ kind: 'line', text: 'still reading the checkout…', tone: 'faded' });
  } else if (!hunt.found.length) {
    rows.push({ kind: 'line', text: 'nothing in here is.', tone: 'faded' });
  } else if (!hunt.inside) {
    const list = h('div', 'gr-list');
    for (const file of hunt.found) {
      const el = h('div', 'gr-fl2');
      const n = h('span', 'n');
      n.appendChild(marked(nameOf(file.path), hunt.written));
      const d = h('span', 'd g-mono', dirOf(file.path) || './');
      el.append(sign('file', '#f2c66d', 16), n, d);
      list.appendChild(pressable(el, `open:${file.path}`, { drag: file.path }));
    }
    rows.push(dom(list));
  } else {
    const all = h('div');
    for (const file of hunt.found) {
      const g = h('div', 'gr-hit');
      const top = h('div', 'gr-hit-h');
      const n = h('span', 'n', nameOf(file.path));
      top.append(sign('file', '#f2c66d', 15), n, h('span', 'p', dirOf(file.path) || './'));
      if (file.lines?.length) top.appendChild(chip(String(file.lines.length), undefined, 'ct'));
      g.appendChild(pressable(top, `open:${file.path}`));
      for (const line of (file.lines ?? []).slice(0, SHOWN)) {
        const el = h('div', 'gr-ln');
        const text = h('span');
        text.appendChild(marked(line.text.trim(), hunt.written));
        el.append(h('span', 'no', String(line.at)), text);
        g.appendChild(pressable(el, `open:${file.path}`));
      }
      const over = (file.lines?.length ?? 0) - SHOWN;
      if (over > 0) g.appendChild(h('div', 'gr-more', `and ${over} more in it`));
      all.appendChild(g);
    }
    rows.push(dom(all));
  }
  return rows;
}

/** Text with whatever was looked for lit up in it. */
function marked(text: string, needle: string): DocumentFragment {
  const out = document.createDocumentFragment();
  const low = text.toLowerCase();
  const find = needle.toLowerCase();
  let at = 0;
  while (find) {
    const hit = low.indexOf(find, at);
    if (hit === -1) break;
    if (hit > at) out.appendChild(document.createTextNode(text.slice(at, hit)));
    out.appendChild(h('mark', '', text.slice(hit, hit + find.length)));
    at = hit + find.length;
  }
  if (at < text.length) out.appendChild(document.createTextNode(text.slice(at)));
  return out;
}
