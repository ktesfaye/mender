import type { MenderClient } from '../wire';
import { COLS, makeTerminal, ROWS, type LiveTerminal } from './terminal';

/**
 * The agent's own CLI, running raw in a real terminal, mounted straight onto
 * the board — the same shape `talking.ts`'s plain shell already is, wired to
 * emdash's TUI-agent runtime instead of a bare PTY, because that runtime is
 * what knows how to resume the provider's own session rather than just a
 * shell history.
 */
export interface LiveTuiTerminal {
  readonly el: HTMLElement;
  focus(): void;
  close(): Promise<void>;
}

export async function openTuiTerminal(
  client: MenderClient,
  task: string,
  /** `ctrl+]` was pressed — step back out to the board behind this one. */
  steppedOut: () => void
): Promise<LiveTuiTerminal> {
  const key = { conversationId: task };

  const term: LiveTerminal = makeTerminal({
    onData: (data) => void client.tuiAgents.sendInput({ ...key, data }),
    onResize: ({ cols, rows }) => void client.tuiAgents.resize({ ...key, cols, rows }),
    onStepOut: steppedOut,
  });

  const handle = client.tuiAgents.output.handle(key);
  let written = 0;
  let asking = false;
  let again = false;

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

  // The PTY the process runs at is fixed the moment it starts; telling it
  // this board's real shape as soon as the grid exists keeps the agent's own
  // CLI from drawing to a size it was never actually given.
  void client.tuiAgents.resize({ ...key, cols: COLS, rows: ROWS });

  return {
    el: term.el,
    focus: () => term.focus(),
    close: async () => {
      await off();
      term.dispose();
    },
  };
}
