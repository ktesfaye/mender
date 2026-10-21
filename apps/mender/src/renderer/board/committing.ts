import { badge, chip, dom, h, label, pressable, sign } from '../glass/f';
import type { Changed } from './district';
import type { Row } from './row';

/**
 * What you are about to commit, and the line you say what it is on.
 *
 * There is no staging area here and there is no word for one. Everything that
 * changed goes in; pressing a file holds it back, pressing it again puts it
 * in, and nothing at all happens to the checkout until you press return. The
 * index is git's business and it is written at the last moment.
 */
export interface Committing {
  name: string;
  files: readonly Changed[];
  held: ReadonlySet<string>;
  written: string;
}

export function committing(state: Committing): Row[] {
  const going = state.files.filter((file) => !state.held.has(file.path));
  const held = state.files.filter((file) => state.held.has(file.path));

  const root = h('div', 'f-root');
  const chips = h('div', 'f-state');
  chips.append(chip(`${going.length} going in`, '#9bd28a'));
  if (held.length) chips.append(chip(`${held.length} held back`, 'rgba(255,240,215,.3)'));
  root.append(
    h(
      'div',
      'f-top',
      h('div', '', h('h1', '', 'write a commit'), h('div', 'f-sub', state.name)),
      chips
    )
  );

  const left = h('div', '', label('what goes in'));
  const card = h('div', 'f-card');
  const file = (one: Changed, isHeld: boolean): HTMLElement => {
    const cut = one.path.lastIndexOf('/');
    const tick = h('span', 'f-tick', isHeld ? null : sign('check', '#9bd28a', 14));
    const name = h('span', 'f-n', one.path.slice(cut + 1));
    const line = h('div', `f-f2${isHeld ? ' f-held' : ''}`, tick, badge(one.mark), name);
    if (cut > 0) line.append(h('span', 'f-d g-mono g-faint', one.path.slice(0, cut)));
    else line.append(h('span', 'f-d'));
    if (isHeld) line.lastElementChild?.append(h('span', 'f-tag', 'held back'));
    return pressable(line, `${isHeld ? 'putin' : 'hold'}:${one.path}`);
  };
  for (const one of going) card.append(file(one, false));
  for (const one of held) card.append(file(one, true));
  if (!state.files.length) card.append(h('div', 'f-note', 'nothing is going in.'));
  left.append(card);

  const cut = state.written.indexOf('\n');
  const summary = cut === -1 ? state.written : state.written.slice(0, cut);
  const body = cut === -1 ? '' : state.written.slice(cut + 1).replace(/^\n/, '');
  const msg = h('div', 'f-msg');
  msg.append(chip('the one line', undefined, 'f-blue'));
  const sum = h('div', 'f-sum', summary);
  if (cut === -1) sum.append(h('span', 'f-caret'));
  msg.append(sum);
  const meter = h('div', 'f-meter');
  const filled = Math.min(20, Math.round((Math.min(summary.length, 50) / 50) * 20));
  for (let i = 0; i < 20; i++) meter.append(h('u', i < filled ? 'fl' : ''));
  meter.append(h('small', '', `${summary.length} of 50`));
  msg.append(meter);
  const text = h('div', 'f-body');
  if (body) {
    text.append(body);
    text.append(h('span', 'f-caret'));
  } else {
    text.append(h('span', 'g-faint', 'then, if it needs it, why. a blank line above it.'));
  }
  msg.append(text);
  const right = h('div', '', label('what it did'), msg);

  root.append(h('div', 'f-two f-even', left, right));
  const count = going.length;
  const go = h(
    'span',
    'g-pill',
    sign('pen', '#2a1b09', 14),
    count === 1 ? 'commit 1 file' : `commit ${count} files`
  );
  root.append(h('div', 'f-foot', count && summary.trim() ? pressable(go, 'commit-now') : go));
  if (!(count && summary.trim())) go.style.opacity = '0.45';
  return [dom(root)];
}
