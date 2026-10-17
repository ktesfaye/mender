import type { Commit, FileChange } from '@emdash/core/runtimes/git/api';
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
  /* The subject is a sentence rather than a name, and a board's title is
     written twice the size, so it is read out rather than titled: a sentence
     that has to be cut off to be a heading is worse than one that is simply
     read. */
  const rows: Row[] = [{ kind: 'prose', text: saying(commit.subject) }];

  for (const paragraph of why(commit.body)) {
    rows.push({ kind: 'gap' }, { kind: 'prose', text: paragraph, tone: 'faded' });
  }

  rows.push({ kind: 'gap' }, { kind: 'line', text: by(commit), tone: 'faded' }, { kind: 'gap' });

  if (!files) {
    rows.push({ kind: 'line', text: 'reading what it touched…', tone: 'faded' });
    return rows;
  }
  if (!files.length) {
    rows.push({ kind: 'line', text: 'it touched nothing.', tone: 'faded' });
    return rows;
  }

  rows.push({ kind: 'heading', text: counted(files) });
  for (const file of files) {
    rows.push({
      kind: 'entry',
      mark: mark(file.status),
      text: file.path,
      tone: file.status === 'deleted' ? 'sore' : file.status === 'added' ? 'keen' : 'faded',
      keep: 'tail',
      pick: `in:${file.path}`,
    });
  }

  if (offer) rows.push({ kind: 'gap' }, ...undoing(offer));
  return rows;
}

/**
 * What can still be done about a commit once it is read.
 *
 * Only the most recent commit can be said differently or taken back — an
 * older one is history other commits now stand on, so the only way to change
 * what it did is a new commit that undoes it, which is why "it went in
 * wrong" always has an answer here whichever commit that turns out to be.
 */
function undoing(offer: { isHead: boolean; reverting?: 'offered' | 'asked' }): Row[] {
  const rows: Row[] = [];
  if (offer.isHead) {
    rows.push(
      { kind: 'entry', mark: '✎', text: 'say it differently', tone: 'faded', pick: 'amend' },
      {
        kind: 'entry',
        mark: '✗',
        text: 'take it back, keep what it wrote',
        tone: 'faded',
        pick: 'uncommit',
      }
    );
  }
  if (offer.reverting === 'asked') {
    rows.push({
      kind: 'entry',
      mark: '✗',
      text: 'press again and a commit undoing this goes in',
      tone: 'sore',
      pick: 'revert-made!',
      armed: true,
    });
  } else {
    rows.push({
      kind: 'entry',
      mark: '✗',
      text: 'undo it with a new commit',
      tone: 'faded',
      pick: 'revert-made',
    });
  }
  return rows;
}

/** Saying a commit differently: the same write-line a new one is said on. */
export function amending(written: string): Row[] {
  return [
    { kind: 'title', text: 'say it differently' },
    { kind: 'gap' },
    { kind: 'line', text: 'return writes it.', tone: 'faded' },
    { kind: 'typed', text: written },
  ];
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

/**
 * Who made it, when, and whether anybody else has it yet.
 *
 * Whether it has been pushed is the one thing about a commit that changes
 * what you can still do to it, so it goes in the same breath as the date.
 */
function by(commit: Commit): string {
  const said = [`${commit.author}, ${when(commit.date)}`];
  if (!commit.isPushed) said.push('still only here');
  if (commit.tags.length) said.push(commit.tags.join(', '));
  return said.join(' · ');
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

/** How much of the checkout it moved, as a heading over the list. */
function counted(files: readonly FileChange[]): string {
  const added = files.reduce((all, file) => all + file.additions, 0);
  const taken = files.reduce((all, file) => all + file.deletions, 0);
  const many = files.length === 1 ? 'one file' : `${files.length} files`;
  const moved = [added ? `${added} in` : '', taken ? `${taken} out` : ''].filter(Boolean);
  return moved.length ? `${many}, ${moved.join(' and ')}` : many;
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
