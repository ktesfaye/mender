import { ReplicaState } from '@emdash/wire/live';
import type { Ask, WorkingState } from '@shared/agents';
import type { Task } from '@shared/tasks';
import type { MenderClient } from '../wire';
import type { Row } from './board';
import { openCheckout, type LiveBoard } from './district';

/**
 * A task's board: the checkout, and whoever is working in it.
 *
 * The bottom of this board is now. Above the last line is everything that has
 * happened in the building, above that is the state of its working tree, and
 * at the very bottom is the line you write on — so opening a task puts you at
 * the live edge of it and scrolling up walks backwards.
 *
 * The village never shows a text field. The last line of the wood IS the text
 * field, and while a villager is standing at the door with a question it is
 * replaced by the question, because that is what you are being asked for.
 */

/** The keys an answer is given on: there is no pointer target to click. */
const ANSWERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export interface LiveWork extends LiveBoard {
  /** What is being written to whoever is in there. */
  written(): string;
  wrote(text: string): void;
  /** The question at the door, if there is one. */
  asked(): Ask | null;
  /** Whether somebody in there is busy, and so could be called off. */
  working(): boolean;
}

const QUIET: WorkingState = {
  mood: 'empty',
  doing: 'nobody is working in here.',
  lines: [],
  asking: null,
};

export async function openWork(
  client: MenderClient,
  task: Task,
  changed: (rows: Row[]) => void
): Promise<LiveWork> {
  let work = QUIET;
  let written = '';

  // The checkout first, so the session — which can speak the moment it is
  // subscribed to — always has a board to be written on.
  const checkout = await openCheckout(
    client,
    {
      name: task.name,
      path: task.path,
      // Only what was done in here. The project's whole history came with the
      // worktree and none of it happened in this session.
      since: task.base ?? null,
      // No extra lines above the tree: the branch is the first thing the
      // checkout itself says, and a task's branch is its name said twice.
      tail: () => tail(work, written),
    },
    changed
  );

  const replica = new ReplicaState<WorkingState>(
    client.agents.work.state({ task: task.id }, 'state'),
    {
      onChange: (value) => {
        work = value;
        changed(checkout.rows());
      },
    }
  );
  await replica.ready;
  work = replica.current() ?? QUIET;
  changed(checkout.rows());

  return {
    rows: () => checkout.rows(),
    written: () => written,
    wrote: (text) => {
      written = text;
      changed(checkout.rows());
    },
    asked: () => work.asking,
    working: () => work.mood === 'working',
    close: async () => {
      await Promise.all([replica.dispose(), checkout.close()]);
    },
  };
}

/** Everything that has happened in the building, and the line you answer on. */
function tail(work: WorkingState, written: string): Row[] {
  const rows: Row[] = [{ kind: 'gap' }];
  // The heading only earns its line when there is something under it: the line
  // above the cursor already says what is going on in there.
  if (work.lines.length) rows.push({ kind: 'heading', text: 'in here' });
  for (const line of work.lines) {
    if (line.kind === 'deed') {
      rows.push({
        kind: 'entry',
        mark: line.mark,
        text: line.text,
        tone: line.tone,
        keep: line.keep ?? 'tail',
      });
    } else if (line.kind === 'note') {
      rows.push({ kind: 'line', text: line.text, tone: line.tone });
    } else {
      rows.push({ kind: 'gap' });
      rows.push({ kind: 'prose', text: line.text, tone: line.tone, mark: line.mark || undefined });
    }
  }

  rows.push({ kind: 'gap' });
  const asking = work.asking;
  if (asking) {
    rows.push({ kind: 'line', text: 'it is at the door, asking:', tone: 'faded' });
    rows.push({ kind: 'prose', text: asking.text });
    rows.push({ kind: 'gap' });
    asking.options.forEach((option, at) => {
      const key = ANSWERS[at];
      if (key) rows.push({ kind: 'entry', mark: key, text: option.name, tone: 'keen' });
    });
    return rows;
  }

  rows.push({ kind: 'line', text: work.doing, tone: work.mood === 'hurt' ? 'sore' : 'faded' });
  // Nothing written and somebody working is the one case where an empty line
  // means something: it is how you call them off without a button to press.
  if (work.mood === 'working' && !written) {
    rows.push({ kind: 'line', text: 'return on an empty line stops it.', tone: 'faded' });
  }
  rows.push({ kind: 'typed', text: written });
  return rows;
}

/** Which option a keystroke picks, or nothing if it picks none. */
export function answerFor(ask: Ask, key: string): string | undefined {
  const at = ANSWERS.indexOf(key);
  return at === -1 ? undefined : ask.options[at]?.optionId;
}
