import type { Row } from './row';

/**
 * A merge that stopped on a conflict, on the wood.
 *
 * The one moment the app most needs an escape hatch: the files it could not
 * settle, listed rather than merely counted, and two ways out — hand the
 * whole thing to whoever is working in here, or give up and go back to how
 * the checkout stood before the merge was tried.
 */
export function conflict(base: string, files: readonly string[], asked: boolean): Row[] {
  const rows: Row[] = [
    { kind: 'title', text: 'a conflict' },
    {
      kind: 'line',
      text: `bringing in ${base} stopped; it could not settle these on its own.`,
      tone: 'sore',
    },
    { kind: 'gap' },
  ];
  for (const path of files) {
    rows.push({ kind: 'entry', mark: '✗', text: path, tone: 'warn', keep: 'tail' });
  }
  rows.push(
    { kind: 'gap' },
    { kind: 'entry', mark: '→', text: 'hand this to it', pick: 'hand-conflict' }
  );
  if (asked) {
    rows.push({
      kind: 'entry',
      mark: '✗',
      text: 'press again and the merge is undone',
      tone: 'sore',
      pick: 'abort-merge!',
      armed: true,
    });
  } else {
    rows.push({
      kind: 'entry',
      mark: '✗',
      text: 'give up, put it back the way it was',
      tone: 'faded',
      pick: 'abort-merge',
    });
  }
  return rows;
}

/** What goes on the gatepost when a conflict is handed to whoever is working. */
export function conflictMessage(base: string, files: readonly string[]): string {
  const said = files.map((path) => `- ${path}`).join('\n');
  return `bringing in ${base} left these files conflicted. settle them:\n${said}`;
}
