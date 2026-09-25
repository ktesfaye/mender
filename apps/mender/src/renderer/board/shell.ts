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
}

export function shell(state: Shell): Row[] {
  const rows: Row[] = [
    { kind: 'title', text: state.name },
    { kind: 'line', text: 'a real shell, in this checkout — ctrl+] steps back out', tone: 'faded' },
  ];

  if (state.stopped) {
    rows.push({ kind: 'gap' }, { kind: 'line', text: state.stopped, tone: 'sore' });
    return rows;
  }
  if (!state.running) {
    rows.push({ kind: 'gap' }, { kind: 'line', text: 'starting it…', tone: 'faded' });
  }
  return rows;
}
