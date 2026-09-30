import '@xterm/xterm/css/xterm.css';
import { Terminal as Xterm } from '@xterm/xterm';
import { pastedPaths } from './dropped-paths';

/**
 * A real terminal, in the board's own faces and tones.
 *
 * `screen.ts` used to redraw the shell as lines of plain text, which is why
 * full-screen programs — `vim`, `htop`, `less`, an agent's own CLI — drew
 * correctly but could never be driven: there was nowhere to move a keyboard's
 * own cursor to but the one line at the foot of the board. This is xterm.js
 * instead, the same terminal emulator Emdash already carries, mounted as a
 * real DOM element inside the wash rather than a list of rows. Keyboard,
 * scrollback, copy and paste, and cursor-addressed input are all its own.
 *
 * Escape is not this terminal's to take: it is a real key a real program
 * needs (vim leaves insert mode on it), so it is written straight through to
 * whatever is running. The one chord that is this terminal's own is
 * `ctrl+]`, which steps back out to the board behind it — the same bracket
 * the app already answers `ctrl+[`/`ctrl+]` with for stepping through boards,
 * used here for stepping out of one.
 *
 * A file dropped or pasted on it lands as its own path, on the input line,
 * unsent — see `dropped-paths.ts`.
 */

/** The shape the shell is started at, before the board has laid it out. */
export const COLS = 120;
export const ROWS = 40;

export interface LiveTerminal {
  readonly el: HTMLElement;
  readonly cols: number;
  readonly rows: number;
  /** Bytes the program wrote, straight onto the grid. */
  write(data: string, done?: () => void): void;
  /** The offset this terminal and the runtime's own log agreed on has gone
      stale — start the grid over rather than paint half a redraw onto it. */
  reset(): void;
  focus(): void;
  dispose(): void;
}

export interface TerminalHooks {
  /** Keys typed at it, to hand to the PTY. */
  onData(data: string): void;
  /** The grid changed shape, because the board around it did. */
  onResize(size: { cols: number; rows: number }): void;
  /** `ctrl+]`: leave the terminal for the board behind it. */
  onStepOut(): void;
}

export function makeTerminal(
  hooks: TerminalHooks,
  fontSize = 14,
  /** Terminal.app's own look — SF Mono and the Basic profile's ink —
      rather than the board's, for a session that is nothing but a shell. */
  plain = false
): LiveTerminal {
  const container = document.createElement('div');
  container.style.cssText = 'width:100%;height:100%';
  if (plain) container.style.background = MAC.background;

  const term = new Xterm({
    cols: COLS,
    rows: ROWS,
    scrollback: 5000,
    fontFamily: plain
      ? "ui-monospace, 'SF Mono', Menlo, monospace"
      : "'Courier Prime', ui-monospace, monospace",
    fontSize,
    lineHeight: plain ? 1.0 : 1.3,
    cursorBlink: !plain,
    allowProposedApi: true,
    // The runtime owns line discipline; rewriting a bare \n corrupts anything
    // running in raw mode (tmux, an agent's own TUI) that uses it to mean
    // "down one row, same column" rather than "down and back to the left".
    convertEol: false,
    theme: plain ? MAC : theme(),
  });

  term.open(container);
  const el = term.element;
  if (el) {
    el.style.width = '100%';
    el.style.height = '100%';
    el.style.padding = '4px 6px';
    el.style.boxSizing = 'border-box';
  }

  term.onData(hooks.onData);

  /* xterm sees the key first — this only ever fires for the one chord this
     terminal claims for itself, and blocks it from reaching the program. */
  term.attachCustomKeyEventHandler((event) => {
    if (railChord(event)) return false;
    if (
      event.type === 'keydown' &&
      event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      event.key === ']'
    ) {
      event.preventDefault();
      event.stopPropagation();
      hooks.onStepOut();
      return false;
    }
    return true;
  });

  /* Every other key stops here, once xterm's own handling has had it. The
     app's whole keyboard runs through one listener on the window, and while
     this terminal is what is open, every key belongs to whatever is running
     in it — none of it is this app's to also act on. */
  container.addEventListener('keydown', (event) => {
    if (!railChord(event)) event.stopPropagation();
  });

  /* A file dropped or pasted here is the shell's, not the write line's —
     caught on the way down, ahead of xterm's own drop/paste handling and the
     app's, so it lands once, as the paths themselves rather than as
     something carried to an agent. A picture is a path here too: a shell
     cannot be shown one, so there is nothing special about it the way there
     is on the write line. */
  container.addEventListener('dragover', (event) => event.preventDefault(), { capture: true });
  container.addEventListener(
    'drop',
    (event) => {
      const files = [...(event.dataTransfer?.files ?? [])];
      if (!files.length) return;
      event.preventDefault();
      event.stopPropagation();
      void dropped(files);
    },
    { capture: true }
  );
  container.addEventListener(
    'paste',
    (event) => {
      const files = [...(event.clipboardData?.files ?? [])];
      // Plain text still goes to xterm's own paste handling, untouched.
      if (!files.length) return;
      event.preventDefault();
      event.stopPropagation();
      void dropped(files);
    },
    { capture: true }
  );
  const dropped = (files: File[]): void => {
    const paths = files.map((file) => window.mender.pathOf(file)).filter((path) => path.length > 0);
    if (paths.length) hooks.onData(pastedPaths(paths));
  };

  let known: { width: number; height: number } | null = null;
  const fit = (): void => {
    const cell = known ?? cellSize(term);
    if (!cell) return;
    known = cell;
    const cols = Math.max(20, Math.floor(container.clientWidth / cell.width));
    const rows = Math.max(6, Math.floor(container.clientHeight / cell.height));
    if (!cols || !rows) return;
    if (cols === term.cols && rows === term.rows) return;
    term.resize(cols, rows);
    hooks.onResize({ cols, rows });
  };
  const watch = new ResizeObserver(() => fit());
  watch.observe(container);

  return {
    el: container,
    get cols() {
      return term.cols;
    },
    get rows() {
      return term.rows;
    },
    write: (data, done) => term.write(data, done),
    reset: () => term.reset(),
    focus: () => term.focus(),
    dispose: () => {
      watch.disconnect();
      term.dispose();
    },
  };
}

/** xterm's own cell metrics, once it has actually measured a font. */
interface WithCore {
  _core?: {
    _renderService?: { dimensions?: { css?: { cell?: { width: number; height: number } } } };
  };
}

function cellSize(term: Xterm): { width: number; height: number } | null {
  const core = (term as unknown as WithCore)._core;
  const cell = core?._renderService?.dimensions?.css?.cell;
  if (!cell?.width || !cell?.height) return null;
  return { width: cell.width, height: cell.height };
}

/** Terminal.app's Basic profile in dark mode, and its standard ANSI colours. */
const MAC = {
  background: '#1e1e1e',
  foreground: '#dddddd',
  cursor: '#a5a5a5',
  cursorAccent: '#1e1e1e',
  selectionBackground: 'rgba(95,134,190,.55)',
  black: '#000000',
  red: '#990000',
  green: '#00a600',
  yellow: '#999900',
  blue: '#0000b2',
  magenta: '#b200b2',
  cyan: '#00a6b2',
  white: '#bfbfbf',
  brightBlack: '#666666',
  brightRed: '#e50000',
  brightGreen: '#00d900',
  brightYellow: '#e5e500',
  brightBlue: '#0000ff',
  brightMagenta: '#e500e5',
  brightCyan: '#00e5e5',
  brightWhite: '#e5e5e5',
};

/** The board's own ink, lifted onto the grid. */
function theme() {
  const read = (name: string, fallback: string): string => {
    const said = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return said || fallback;
  };
  return {
    background: read('--yard-night', '#1d1811'),
    foreground: read('--yard-ink-body', '#dcc8a0'),
    cursor: read('--yard-ink-bright', '#f4e3c0'),
    cursorAccent: read('--yard-night', '#1d1811'),
    selectionBackground: 'rgba(224,181,106,.35)',
    black: '#2a2117',
    brightBlack: read('--yard-ink-dim', '#a89272'),
  };
}

/** Command and a number walks the rail, even from inside a terminal. It means
    nothing to the program running there, since command never reaches a pty,
    and a session that is its own terminal is still a lantern on that rail. */
function railChord(event: KeyboardEvent): boolean {
  return event.metaKey && !event.ctrlKey && !event.altKey && /^[1-9]$/.test(event.key);
}
