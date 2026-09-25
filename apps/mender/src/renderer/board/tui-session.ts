import type { Row } from './row';

/**
 * A villager working in its own terminal, on the wood.
 *
 * Not the yard's transcript board: this session's whole conversation is
 * whatever the agent's own CLI draws, so the grid — a real terminal
 * (`board/terminal.ts`), mounted beside these rows — is the entire board.
 * This is only the title above it, the same way `shell.ts` is only the
 * title above a plain shell's own grid.
 */
export interface TuiSession {
  /** The session's own title, said once at the top. */
  name: string;
  /** Who is sitting at it. */
  hand: string;
  /** Set once the agent's own CLI has actually started. */
  running: boolean;
  /** Set when it would not start, or has stopped. */
  stopped?: string;
}

export function tuiSession(state: TuiSession): Row[] {
  const rows: Row[] = [
    { kind: 'title', text: state.name },
    {
      kind: 'line',
      text: `${state.hand}'s own terminal, in this checkout — ctrl+] steps back out`,
      tone: 'faded',
    },
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
