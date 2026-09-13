import type { Row } from './board';
import { toneOf, type Changed } from './district';

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

  const rows: Row[] = [{ kind: 'title', text: state.name }, { kind: 'gap' }];

  if (going.length) {
    rows.push({ kind: 'heading', text: 'going in, press to hold one back' });
    for (const file of going) {
      rows.push({
        kind: 'entry',
        mark: file.mark,
        text: file.path,
        tone: toneOf(file.mark),
        keep: 'tail',
        pick: `hold:${file.path}`,
      });
    }
  } else {
    rows.push({ kind: 'line', text: 'nothing is going in.', tone: 'sore' });
  }

  if (held.length) {
    rows.push({ kind: 'gap' }, { kind: 'heading', text: 'held back, press to put one in' });
    for (const file of held) {
      rows.push({
        kind: 'entry',
        mark: file.mark,
        text: file.path,
        tone: 'faded',
        keep: 'tail',
        pick: `putin:${file.path}`,
      });
    }
  }

  rows.push(
    { kind: 'gap' },
    { kind: 'line', text: 'say what this does. return commits it.', tone: 'faded' },
    { kind: 'typed', text: state.written }
  );
  return rows;
}
