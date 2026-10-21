import type { Change } from '@shared/changes';
import {
  chip,
  code,
  counts,
  cursor,
  danger,
  dirOf,
  dom,
  h,
  head,
  pressable,
  sign,
} from '../glass/read';
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
  const pinned = notes?.pinned;
  const noting = notes?.noting;
  const rows: Row[] = [
    dom(
      head({
        title: name(change.path),
        sub: [
          ...(dirOf(change.path) ? [dirOf(change.path)] : []),
          chip(label(change), dotOf(change)),
        ],
        right: [
          ...(change.added || change.taken ? [tally(change)] : []),
          ...(pinned?.size
            ? [chip(pinned.size === 1 ? '1 note pinned' : `${pinned.size} notes pinned`, '#f2c66d')]
            : []),
        ],
      })
    ),
  ];

  if (change.kind === 'binary' || change.kind === 'same' || !change.lines.length) {
    rows.push({ kind: 'gap' }, { kind: 'line', text: what(change), tone: 'faded' });
    if (undoing) rows.push(dom(undo(change, undoing)));
    return rows;
  }

  const code$ = h('div', 'gr-code gr-card-code');
  let old = 1;
  let now = 1;
  change.lines.forEach((line, at) => {
    if (line.startsWith('…')) {
      const skipped = Number(/(\d+)/.exec(line)?.[1] ?? 0);
      old += skipped;
      now += skipped;
      const fold = h('div', 'gr-fold');
      fold.append(
        sign('list', 'rgba(246,236,219,.42)', 12),
        document.createTextNode(folded(line, at))
      );
      code$.appendChild(fold);
      return;
    }
    const mark = line[0];
    const el = h('div', `gr-l ${mark === '+' ? 'a' : mark === '-' ? 'd' : ''}`);
    el.append(
      h('span', 'n', mark === '+' ? '' : String(old)),
      h('span', 'n', mark === '-' ? '' : String(now)),
      h('span', 's', mark === '+' ? '+' : mark === '-' ? '−' : ' ')
    );
    const c = h('span', 'c');
    c.appendChild(code(line.slice(1)));
    el.appendChild(c);
    if (mark !== '+') old += 1;
    if (mark !== '-') now += 1;
    // A line already being written on, or already noted, is not a second
    // way to open the same note: pressing the pinned note itself is.
    if (!(noting?.at === at || pinned?.has(at))) pressable(el, `note:${at}`);
    if (noting?.at === at) el.classList.add('sel');
    code$.appendChild(el);
    if (noting?.at === at) {
      const w = h('div', 'gr-note');
      const b = h('div', 'b write');
      b.appendChild(sign('pen', '#f2c66d', 15));
      const t = h('span', '', noting.text);
      if (!noting.text) t.appendChild(h('span', 'g-faint', 'what is wrong with this line'));
      t.appendChild(cursor());
      b.appendChild(t);
      w.appendChild(b);
      code$.appendChild(w);
      return;
    }
    const said = pinned?.get(at);
    if (said !== undefined) {
      const w = h('div', 'gr-note');
      const b = h('div', 'b');
      const body = h('div');
      body.append(
        document.createTextNode(said.text),
        h('small', '', 'pinned · goes with your next words to claude')
      );
      b.append(
        sign('note', '#f2c66d', 16),
        body,
        pressable(h('span', 'go', 'take it back'), `note-off:${said.id}`)
      );
      w.appendChild(b);
      code$.appendChild(w);
    }
  });
  if (change.more) {
    const fold = h('div', 'gr-fold');
    fold.append(
      sign('list', 'rgba(246,236,219,.42)', 12),
      document.createTextNode(`and ${change.more} more lines`)
    );
    code$.appendChild(fold);
  }
  rows.push(dom(code$));
  if (undoing) rows.push(dom(undo(change, undoing)));
  return rows;
}

function folded(line: string, at: number): string {
  const n = Number(/(\d+)/.exec(line)?.[1] ?? 0);
  if (!n) return line.replace(/^…\s*/, '');
  return `${n} line${n === 1 ? '' : 's'} the same${at === 0 ? ', above' : ''}`;
}

function tally(change: Change): HTMLElement {
  const el = chip('', undefined, 'g-mono');
  el.style.fontWeight = '700';
  el.appendChild(counts(change.added, change.taken));
  return el;
}

function label(change: Change): string {
  switch (change.kind) {
    case 'new':
      return 'new';
    case 'gone':
      return 'gone';
    case 'binary':
      return 'not writing';
    case 'same':
      return 'unchanged';
    default:
      return 'changed';
  }
}

function dotOf(change: Change): string {
  return change.kind === 'new' ? '#9bd28a' : change.kind === 'gone' ? '#f08a72' : '#f2c66d';
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
function undo(change: Change, undoing: 'offered' | 'asked'): HTMLElement {
  const away = change.kind === 'new';
  const asked = undoing === 'asked';
  return danger({
    icon: away ? 'trash_y' : 'undo_y',
    title: asked
      ? away
        ? 'this file is gone for good'
        : 'put it back?'
      : away
        ? 'throw this file away'
        : 'put it back the way it was',
    said: away
      ? 'git has never seen it, so nothing brings it back.'
      : `${counted(change)} gone, nothing is kept.`,
    button: asked ? 'yes, do it' : away ? 'throw it away' : 'put it back',
    pick: asked ? 'undo!' : 'undo',
    armed: asked,
  });
}

function counted(change: Change): string {
  const many = change.added + change.taken;
  return many === 1 ? 'that one line is' : `those ${many} lines are`;
}

/** While git is still being asked. */
export function opening(path: string): Row[] {
  return [
    dom(head({ title: name(path), sub: [...(dirOf(path) ? [dirOf(path)] : [])] })),
    { kind: 'gap' },
    { kind: 'line', text: 'reading it…', tone: 'faded' },
  ];
}

/** When it could not be read at all. */
export function unreadable(path: string, because: string): Row[] {
  return [
    dom(head({ title: name(path), sub: [...(dirOf(path) ? [dirOf(path)] : [])] })),
    { kind: 'gap' },
    { kind: 'line', text: because, tone: 'sore' },
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
