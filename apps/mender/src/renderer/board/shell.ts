import type { Row } from './row';

/**
 * A real shell, on the wood.
 *
 * Everything else on a board is something the village wrote. This is the one
 * place where another program is writing, and it writes onto a grid it can
 * move a cursor around: that grid is kept in `screen.ts`, and what arrives
 * here is what it would have left on a screen, already read down to lines.
 *
 * Colour and every other way of making a character look different are gone,
 * because the board has one typeface and two tones. What a program actually
 * did with the cursor is not, so a progress bar rewriting its line, a pager
 * painting a page and tmux repainting a corner all come out right.
 */

/** How much of the scrollback one board will carry. */
const LINES = 1200;

export interface Shell {
  /** What the checkout is called, said once at the top. */
  name: string;
  /** What the shell has left on its screen, oldest line first. */
  lines: readonly string[];
  /** What you are typing at it, which it has not been given yet. */
  written: string;
  /** Set once the shell has actually started. */
  running: boolean;
  /** Set when it would not start, or has stopped. */
  stopped?: string;
}

export function shell(state: Shell): Row[] {
  const rows: Row[] = [
    { kind: 'title', text: state.name },
    { kind: 'line', text: 'a shell, in this checkout', tone: 'faded' },
    { kind: 'gap' },
  ];

  if (state.stopped) {
    rows.push({ kind: 'line', text: state.stopped, tone: 'sore' });
    return rows;
  }
  if (!state.running) {
    rows.push({ kind: 'line', text: 'starting it…', tone: 'faded' });
    return rows;
  }

  /* A terminal is a grid somebody wrote on. Everything it says means what it
     means because of which column it is in, so the whole screen and the line
     you answer it on are the type. */
  for (const line of state.lines.slice(-LINES)) {
    rows.push({ kind: 'line', text: line, tone: 'faded', keep: 'front', face: 'type' });
  }
  return [...rows, { kind: 'typed', text: state.written, face: 'type' }];
}
