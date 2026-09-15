import { LOCAL_HOST_REF } from '@emdash/core/primitives/host/api';
import { parseNativeAbsolute } from '@emdash/core/primitives/path/api';
import type { TerminalKey } from '@emdash/core/runtimes/terminals/api';
import type { MenderClient } from '../wire';
import { Screen } from './screen';

/**
 * A real shell running in a checkout, and everything it has said.
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
  /** What it has left on its screen, oldest line first. */
  lines(): readonly string[];
  say(what: string): Promise<void>;
  close(): Promise<void>;
}

/** The shape of the screen the shell writes on. */
const COLS = 120;
const ROWS = 40;

export async function openShell(
  client: MenderClient,
  checkout: string,
  changed: () => void
): Promise<LiveShell | null> {
  const parsed = parseNativeAbsolute(checkout);
  if (!parsed.success) return null;

  /* One shell per checkout, named after it. Opening the same checkout's shell
     twice is the same shell, which is the whole point: it is a place. */
  const key: TerminalKey = {
    workspace: { host: LOCAL_HOST_REF, path: parsed.data },
    id: 'village',
  };

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
  if (!started.success) return null;

  const handle = client.terminals.output.handle(key);
  /* The same shape the shell was started at. A screen the shell thinks is one
     size and the village draws at another puts the wrapping in the wrong
     place, which is the sort of wrong that looks like nothing at all. */
  const screen = new Screen(COLS, ROWS);
  let lines: readonly string[] = [];
  let written = 0;
  let asking = false;
  let again = false;

  /**
   * Ask what the whole thing says now and feed it the part we have not seen.
   *
   * The log is a window over the shell's output with an offset, so what is
   * new is whatever sits past the last byte handed to the screen. If the
   * window has slid past that — a long silence, an enormous build — the
   * screen is started again from what is left, because half a redraw painted
   * onto a stale grid is worse than a clean start.
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
          screen.write(snap.text);
        } else if (from < snap.text.length) {
          screen.write(snap.text.slice(from));
        }
        written = snap.baseOffset + snap.text.length;
        lines = screen.written();
        changed();
      } while (again);
    } finally {
      asking = false;
    }
  };

  await catchUp();
  const off = await handle.attach(() => void catchUp());

  return {
    key,
    lines: () => lines,
    say: async (what) => {
      await client.terminals.sendInput({ key, data: what });
    },
    close: async () => {
      await off();
    },
  };
}
