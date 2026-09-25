import { LOCAL_HOST_REF } from '@emdash/core/primitives/host/api';
import { parseNativeAbsolute } from '@emdash/core/primitives/path/api';
import type { TerminalKey } from '@emdash/core/runtimes/terminals/api';
import type { MenderClient } from '../wire';
import { COLS, makeTerminal, ROWS, type LiveTerminal } from './terminal';

/**
 * A real shell running in a checkout, mounted straight onto the board.
 *
 * The shell itself lives in emdash's terminals runtime, in its own process,
 * wrapped in tmux. That is what makes it a shell in the village rather than a
 * shell in a window: the building is still standing when you walk away from
 * it, and what was running in there is still running when you come back, app
 * restart included.
 *
 * What arrives here is the whole scrollback rather than the pieces of it. The
 * runtime pushes when there is something new and this asks what there is now,
 * which costs a little more than stitching the pieces together and cannot
 * drift out of step with the shell, and a shell that has quietly stopped
 * agreeing with its own output is worse than one that is a bit chatty.
 */
export interface LiveShell {
  key: TerminalKey;
  readonly el: HTMLElement;
  focus(): void;
  close(): Promise<void>;
}

export async function openShell(
  client: MenderClient,
  checkout: string,
  /** `ctrl+]` was pressed — step back out to the board behind this one. */
  steppedOut: () => void
): Promise<LiveShell | null> {
  const parsed = parseNativeAbsolute(checkout);
  if (!parsed.success) return null;

  /* One shell per checkout, named after it. Opening the same checkout's shell
     twice is the same shell, which is the whole point: it is a place. */
  const key: TerminalKey = {
    workspace: { host: LOCAL_HOST_REF, path: parsed.data },
    id: 'village',
  };

  const term: LiveTerminal = makeTerminal({
    onData: (data) => void client.terminals.sendInput({ key, data }),
    onResize: ({ cols, rows }) => void client.terminals.resize({ key, cols, rows }),
    onStepOut: steppedOut,
  });

  const started = await client.terminals.start({
    key,
    spec: {
      cwd: checkout,
      env: {},
      /* Without tmux the shell dies with the app, which is the one thing a
         shell in a village must not do. Where tmux is not installed the
         runtime runs it plainly and it is simply not there next time. */
      tmux: true,
      cols: COLS,
      rows: ROWS,
    },
  });
  if (!started.success) {
    term.dispose();
    return null;
  }

  const handle = client.terminals.output.handle(key);
  let written = 0;
  let asking = false;
  let again = false;

  /**
   * Ask what the whole thing says now and write the part this terminal has
   * not seen yet, straight onto its grid.
   *
   * The log is a window over the shell's output with an offset, so what is
   * new is whatever sits past the last byte handed to the grid. If the
   * window has slid past that — a long silence, an enormous build — the grid
   * starts over from what is left, because half a redraw painted onto a
   * stale screen is worse than a clean start.
   */
  const catchUp = async (): Promise<void> => {
    if (asking) {
      again = true;
      return;
    }
    asking = true;
    try {
      do {
        again = false;
        const snap = (await handle.snapshot()).data;
        const from = written - snap.baseOffset;
        if (from < 0 || from > snap.text.length) {
          term.reset();
          term.write(snap.text);
        } else if (from < snap.text.length) {
          term.write(snap.text.slice(from));
        }
        written = snap.baseOffset + snap.text.length;
      } while (again);
    } finally {
      asking = false;
    }
  };

  await catchUp();
  const off = await handle.attach(() => void catchUp());

  return {
    key,
    el: term.el,
    focus: () => term.focus(),
    close: async () => {
      await off();
      term.dispose();
    },
  };
}
