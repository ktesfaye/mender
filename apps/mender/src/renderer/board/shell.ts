import type { Row } from './row';

/**
 * A real shell, on the wood.
 *
 * The grid itself — everything the shell has drawn, and the keyboard while
 * it is what is open — is a real terminal (`board/terminal.ts`), mounted
 * beside these rows rather than written as one of them. This is only ever
 * the title above it and, while it is not yet a place you can type into, the
 * word saying so.
 */

export interface Shell {
  /** What the checkout is called, said once at the top. */
  name: string;
  /** Set once the shell has actually started. */
  running: boolean;
  /** Set when it would not start, or has stopped. */
  stopped?: string;
  /** The second shell in this checkout, alive beside the first one's own
      tmux rather than in place of it. */
  second?: boolean;
  /** Armed for the second press, and what that press would end — null once
      asked and found to be nothing but the shell itself. */
  ending?: { armed: boolean; what: string | null } | null;
}

export function shell(state: Shell): Row[] {
  const rows: Row[] = [
    { kind: 'title', text: state.second ? `${state.name} — second shell` : state.name },
    { kind: 'line', text: 'a real shell, in this checkout — ctrl+] steps back out', tone: 'faded' },
  ];

  if (state.stopped) {
    rows.push({ kind: 'gap' }, { kind: 'line', text: state.stopped, tone: 'sore' });
    return rows;
  }
  if (!state.running) {
    rows.push({ kind: 'gap' }, { kind: 'line', text: 'starting it…', tone: 'faded' });
    return rows;
  }
  const said = state.ending?.armed
    ? state.ending.what
      ? `ends ${state.ending.what}. click again to end it.`
      : 'click again to end it.'
    : 'end this shell';
  rows.push(
    { kind: 'gap' },
    {
      kind: 'entry',
      mark: '→',
      text: said,
      tone: state.ending?.armed ? 'sore' : 'faded',
      pick: 'shell-end',
      armed: !!state.ending?.armed,
    }
  );
  return rows;
}
