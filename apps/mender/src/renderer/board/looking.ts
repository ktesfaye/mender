import type { Row } from './board';

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
  const rows: Row[] = [
    { kind: 'title', text: hunt.name },
    { kind: 'gap' },
    {
      kind: 'entry',
      mark: '→',
      text: hunt.inside
        ? 'looking inside them. press to look for names'
        : 'looking for names. press to look inside them',
      tone: 'faded',
      pick: 'flip',
    },
    { kind: 'gap' },
  ];

  if (!hunt.written) {
    rows.push({
      kind: 'line',
      text: hunt.inside ? 'say what is written in it.' : 'say what it is called.',
      tone: 'faded',
    });
  } else if (hunt.asking && !hunt.found.length) {
    rows.push({ kind: 'line', text: 'looking…', tone: 'faded' });
  } else if (hunt.unread) {
    /* An empty answer from an index that has not read the checkout yet is not
       the same as nothing matching, and saying it is would be a lie. */
    rows.push({ kind: 'line', text: 'still reading the checkout…', tone: 'faded' });
  } else if (!hunt.found.length) {
    rows.push({ kind: 'line', text: 'nothing in here is.', tone: 'faded' });
  } else {
    for (const file of hunt.found) {
      rows.push({
        kind: 'entry',
        mark: ' ',
        text: file.path,
        keep: 'tail',
        pick: `open:${file.path}`,
      });
      for (const line of (file.lines ?? []).slice(0, SHOWN)) {
        rows.push({
          kind: 'line',
          text: `    ${line.text.trim()}`,
          tone: 'faded',
          // A line of code reads from its start; cutting the front hides it.
          keep: 'front',
          pick: `open:${file.path}`,
        });
      }
      const over = (file.lines?.length ?? 0) - SHOWN;
      if (over > 0) {
        rows.push({ kind: 'line', text: `    and ${over} more in it`, tone: 'faded' });
      }
    }
  }

  return [...rows, { kind: 'gap' }, { kind: 'typed', text: hunt.written }];
}
