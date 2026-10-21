import type { Commit, FileChange } from '@emdash/core/runtimes/git/api';
import {
  card,
  chip,
  counts,
  cursor,
  danger,
  dirOf,
  dom,
  ghost,
  h,
  head,
  label,
  meter,
  nameOf,
  pressable,
  sign,
} from '../glass/read';
import type { Row } from './row';

/**
 * One commit, on the wood.
 *
 * A commit is the smallest finished thing in a checkout, so it reads like one:
 * what it was for at the top, then whatever else was written about it, then who
 * did it and when, and then the files it touched. Every one of those is
 * pressable, because the question you have after reading a commit message is
 * almost always which file it actually happened in.
 */
export function made(
  commit: Commit,
  files: readonly FileChange[] | undefined,
  offer?: { isHead: boolean; reverting?: 'offered' | 'asked' }
): Row[] {
  /* The subject is a sentence rather than a name, so it is set as the title
     and left to wrap. */
  const state = [
    chip(commit.isPushed ? 'sent up' : 'not sent up', commit.isPushed ? '#9bd28a' : '#7aaaff'),
    ...(files ? [chip(files.length === 1 ? '1 file' : `${files.length} files`)] : []),
  ];
  const top = h('div', 'gr-head');
  const left = h('div', 'gr-head-l');
  const meta = h('div', 'gr-when');
  meta.style.marginTop = '14px';
  meta.append(
    sign('commit', '#7aaaff', 16),
    h('span', 'gr-hash', commit.hash.slice(0, 7)),
    h('span', 'g-faint', '·'),
    h('span', 'g-mute', stamp(commit.date))
  );
  const title = h('div', 'g-serif gr-h1', saying(commit.subject));
  title.style.marginTop = '10px';
  left.append(meta, title);
  const flags = h('div', 'gr-state');
  flags.append(...state);
  top.append(left, flags);

  const rows: Row[] = [dom(top)];

  const grid = h('div', 'gr-two');
  const paragraphs = why(commit.body);
  if (paragraphs.length) {
    const c = card('gr-p16');
    c.append(label('what it was for', 'gr-flush'));
    for (const paragraph of paragraphs) c.appendChild(h('div', 'gr-v', paragraph));
    grid.appendChild(c);
  } else {
    grid.style.gridTemplateColumns = '1fr';
  }
  const who = card('gr-p16');
  who.appendChild(label('who, and where it stands', 'gr-flush'));
  const line = h('div', 'gr-who');
  const av = h('div', 'gr-av');
  const initial = h('span', 'g-serif', commit.author.slice(0, 1).toLowerCase());
  initial.style.cssText = 'font-size:20px;color:#f2c66d';
  av.appendChild(initial);
  const t = h('div', 'gr-v');
  t.style.lineHeight = '1.35';
  const b = h('b', '', commit.author);
  const sub = h(
    'span',
    'g-faint',
    [commit.isPushed ? 'sent up' : 'still only here', ...commit.tags].join(' · ')
  );
  sub.style.fontSize = '13px';
  t.append(
    b,
    document.createTextNode(` · ${clock(commit.date)}`),
    document.createElement('br'),
    sub
  );
  line.append(av, t);
  who.appendChild(line);
  grid.appendChild(who);
  rows.push(dom(grid));

  if (!files) {
    rows.push({ kind: 'gap' }, { kind: 'line', text: 'reading what it touched…', tone: 'faded' });
    return rows;
  }
  if (!files.length) {
    rows.push({ kind: 'gap' }, { kind: 'line', text: 'it touched nothing.', tone: 'faded' });
  } else {
    rows.push(dom(label('what it moved')));
    const list = card('gr-files');
    for (const file of files) list.appendChild(fileRow(file, true));
    rows.push(dom(list));
  }

  if (offer) rows.push(dom(undoing(offer)));
  return rows;
}

/** One file a commit or a branch moved: its letter, its name, how much. */
export function fileRow(file: FileChange, withDir: boolean, pick = `in:${file.path}`): HTMLElement {
  const tone = file.status === 'deleted' ? 'del' : file.status === 'added' ? 'new' : 'mod';
  const el = h('div', 'gr-f');
  const name = h('span');
  if (withDir) name.appendChild(h('span', 'dir', dirOf(file.path) || './'));
  name.appendChild(h('span', 'nm', nameOf(file.path)));
  const ct = counts(file.additions, file.deletions);
  ct.className = 'ct';
  el.append(
    h('span', `gr-badge ${tone}`, mark(file.status)),
    name,
    ct,
    meter(file.additions, file.deletions)
  );
  return pressable(el, pick);
}

/**
 * What can still be done about a commit once it is read.
 *
 * Only the most recent commit can be said differently or taken back — an
 * older one is history other commits now stand on, so the only way to change
 * what it did is a new commit that undoes it, which is why "it went in
 * wrong" always has an answer here whichever commit that turns out to be.
 */
function undoing(offer: { isHead: boolean; reverting?: 'offered' | 'asked' }): HTMLElement {
  const wrap = h('div');
  if (offer.isHead) {
    const tools = h('div', 'gr-tools');
    tools.append(
      pressable(ghost('say it differently', 'edit'), 'amend'),
      pressable(ghost('take it back, keep what it wrote', 'undo_y'), 'uncommit')
    );
    wrap.appendChild(tools);
  }
  const asked = offer.reverting === 'asked';
  wrap.appendChild(
    danger({
      icon: 'undo_y',
      title: asked ? 'a commit undoing this goes in' : 'undo it with a new commit',
      said: asked ? 'nothing is lost, the history keeps both.' : 'the history keeps both.',
      button: asked ? 'yes, undo it' : 'undo it',
      pick: asked ? 'revert-made!' : 'revert-made',
      armed: asked,
    })
  );
  return wrap;
}

/** Saying a commit differently: the same write-line a new one is said on. */
export function amending(written: string): Row[] {
  const field = h('div', 'gr-input');
  const said = h('span', '', written);
  said.appendChild(cursor());
  field.append(sign('edit', '#f2c66d', 16), said);
  return [dom(head({ title: 'say it differently' })), dom(field)];
}

/** While git is still being asked what the commit was. */
export function unread(): Row[] {
  return [{ kind: 'line', text: 'reading it…', tone: 'faded' }];
}

/** When git would not say what the commit was. */
export function unmade(because: string): Row[] {
  return [{ kind: 'line', text: because, tone: 'sore' }];
}

/** A run of `Name: value` lines, which is how git carries a footnote. */
const TRAILER = /^[A-Za-z][A-Za-z-]*:\s/;

/** `type(scope): ` at the front of a subject, which is filing, not saying. */
const FILED = /^[a-z]+(\([^)]*\))?!?:\s+/;

/**
 * The subject without the bookkeeping somebody's commit convention put on it.
 *
 * `feat(scope):` is filing, the same as the trailers at the bottom, and it
 * costs a third of the line everywhere a commit is written. What is left is
 * the sentence somebody actually wrote about what they did.
 */
export function saying(subject: string): string {
  const plain = subject.replace(FILED, '');
  return plain || subject;
}

/**
 * What was written under the subject, in paragraphs.
 *
 * Two things are taken off it. The last block is usually trailers — who else
 * was on it, which issue it closes, who signed it off — and that is filing
 * rather than writing. And the hard breaks inside a paragraph are git's own
 * wrapping at seventy-odd columns, not where the writer meant to stop, so they
 * are undone: wrapping writing that is already wrapped gives you every other
 * line half empty, which is exactly as bad as it sounds.
 */
function why(body: string): string[] {
  const lines = body.trimEnd().split('\n');
  while (
    lines.length &&
    (TRAILER.test(lines[lines.length - 1] ?? '') || !lines[lines.length - 1])
  ) {
    lines.pop();
  }
  const said: string[] = [];
  let paragraph: string[] = [];
  const done = (): void => {
    if (paragraph.length) said.push(paragraph.join(' '));
    paragraph = [];
  };
  for (const line of lines) {
    // A line that is indented or bulleted was laid out on purpose; leave it be.
    if (!line.trim()) done();
    else if (/^\s|^[-*+·]\s|^\d+[.)]\s/.test(line)) {
      done();
      said.push(line);
    } else paragraph.push(line.trim());
  }
  done();
  return said;
}

/** A date somebody would say out loud, not one git would print. */
function when(at: number): string {
  const days = (Date.now() - at) / 86400000;
  const day = new Date(at);
  if (days < 1) {
    return day.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  }
  if (days < 7) return day.toLocaleDateString(undefined, { weekday: 'long' }).toLowerCase();
  const short = day.toLocaleDateString(undefined, { day: 'numeric', month: 'long' }).toLowerCase();
  return days < 300 ? short : `${short} ${day.getFullYear()}`;
}

/** Git's own letter for what happened to the file, the same one a status uses. */
function mark(status: FileChange['status']): string {
  switch (status) {
    case 'added':
      return 'A';
    case 'deleted':
      return 'D';
    case 'renamed':
      return 'R';
    case 'conflicted':
      return 'U';
    default:
      return 'M';
  }
}

function clock(at: number): string {
  return new Date(at)
    .toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    .toLowerCase();
}

/** `today, 11:15 am`, or the day it was. */
function stamp(at: number): string {
  const days = (Date.now() - at) / 86400000;
  return days < 1 ? `today, ${clock(at)}` : when(at);
}
