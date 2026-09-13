import { ReplicaState } from '@emdash/wire/live';
import type { Ask, Carried, Kit, Line, Step, Waiting, WorkingState } from '@shared/agents';
import type { Task } from '@shared/tasks';
import type { MenderClient } from '../wire';
import type { Row } from './board';
import { openCheckout, type LiveBoard } from './district';
import { Naming } from './naming';
import { Palette } from './palette';
import { saying } from './writing';

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
  /** What the slash on the line has opened, if there is one. */
  readonly slash: Palette;
  /** What the @ on the line has opened, if there is one. */
  readonly names: Naming;
  /** The question at the door, if there is one. */
  asked(): Ask | null;
  /** Whether somebody in there is busy, and so could be called off. */
  working(): boolean;
  /** Open or close what is underneath one line of the transcript. */
  fold(id: string): void;
  /** What has been picked up off the wood and not yet handed over. */
  carrying(): readonly Carried[];
  /** Pick a picture up. What comes back is what went wrong, or nothing. */
  pickUp(file: File): Promise<string | null>;
  /** Put one down again. */
  putDown(id: string): void;
  /** Everything carried went with what was just said. */
  handed(): void;
}

/** What a line with something under it wears, closed and open. */
const SHUT = '↓';
const OPEN = '↑';
/** How wide the room bar is drawn, in characters. */
const ROOM = 20;
/** Below this much room left, it stops being a footnote. */
const TIGHT = 0.15;
/** How far one level of nesting moves a line in, in characters. */
const IN = 2;

const QUIET: WorkingState = {
  mood: 'empty',
  doing: 'nobody is working in here.',
  lines: [],
  asking: null,
  plan: [],
  queued: [],
  room: null,
};

export async function openWork(
  client: MenderClient,
  task: Task,
  changed: (rows: Row[]) => void
): Promise<LiveWork> {
  let work = QUIET;
  let written = '';
  const slash = new Palette();
  /* The board does not exist yet when the @ is built, and an answer from the
     checkout can land at any moment after it does. */
  let redraw = (): void => {};
  const names = new Naming(
    (like) => client.tasks.files({ id: task.id, like }),
    () => redraw()
  );
  /* What you have opened up. Held by what it is rather than where it was, so a
     thing you opened while it was still running stays open as it finishes. */
  const opened = new Set<string>();
  /* Pictures dropped on the wood, waiting by the line for you to say something.
     They live here rather than in the main process because until you say
     something they are not part of the conversation, only of your hands. */
  let held: Carried[] = [];

  // The checkout first, so the session — which can speak the moment it is
  // subscribed to — always has a board to be written on.
  const checkout = await openCheckout(
    client,
    {
      // What it is called now, which is the agent's own name for it unless he
      // has written one himself. The name it was cut under is the branch.
      name: task.title,
      path: task.path,
      // Only what was done in here. The project's whole history came with the
      // worktree and none of it happened in this session.
      since: task.base ?? null,
      // The name at the top turns the board over to what the session works
      // with, the same as writing /agent on it.
      turn: 'card',
      // No extra lines above the tree: the branch is the first thing the
      // checkout itself says, and a task's branch is its name said twice.
      tail: () => tail(work, written, slash, names, held, opened),
    },
    changed
  );

  redraw = () => changed(checkout.rows());

  const kit = new ReplicaState<Kit>(client.agents.kit.state({ task: task.id }, 'state'), {
    onChange: (value) => {
      slash.told(value);
      if (written.startsWith('/')) changed(checkout.rows());
    },
  });
  await kit.ready;
  slash.told(kit.current() ?? null);

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
    slash,
    names,
    rows: () => checkout.rows(),
    changed: () => checkout.changed(),
    written: () => written,
    wrote: (text) => {
      written = text;
      slash.typed(text);
      names.typed(text);
      changed(checkout.rows());
    },
    asked: () => work.asking,
    working: () => work.mood === 'working',
    fold: (id) => {
      if (!opened.delete(id)) opened.add(id);
      changed(checkout.rows());
    },
    carrying: () => held,
    pickUp: async (file) => {
      const picked = await client.agents.carry(
        { task: task.id },
        // Spelled out rather than handed over whole: what the wire wants a file
        // to call its kind is not what the browser calls it.
        {
          name: file.name,
          mimeType: file.type,
          size: file.size,
          lastModified: file.lastModified,
          source: file.stream(),
        },
        { timeoutMs: 0 }
      );
      if (!picked.success) {
        return picked.error.kind === 'refused' ? picked.error.because : 'that would not go.';
      }
      held = [...held, picked.data];
      changed(checkout.rows());
      return null;
    },
    putDown: (id) => {
      held = held.filter((each) => each.id !== id);
      changed(checkout.rows());
      void client.agents.putDown({ task: task.id, id });
    },
    handed: () => {
      held = [];
      changed(checkout.rows());
    },
    close: async () => {
      await Promise.all([replica.dispose(), kit.dispose(), checkout.close()]);
    },
  };
}

/** Everything that has happened in the building, and the line you answer on. */
function tail(
  work: WorkingState,
  written: string,
  slash: Palette,
  names: Naming,
  held: readonly Carried[],
  opened: ReadonlySet<string>
): Row[] {
  const rows: Row[] = [{ kind: 'gap' }];
  // The heading only earns its line when there is something under it: the line
  // above the cursor already says what is going on in there.
  if (work.lines.length) rows.push({ kind: 'heading', text: 'in here' });
  for (const line of work.lines) {
    if (line.kind === 'deed' || line.kind === 'thought') {
      const has = Boolean(line.id && line.body?.length);
      const out = Boolean(line.id && opened.has(line.id));
      rows.push({
        kind: 'entry',
        // Work done inside other work is written inside it, so you can see
        // whose it was without having to be told.
        mark: has ? (line.tone === 'sore' ? line.mark : out ? OPEN : SHUT) : line.mark,
        text: ' '.repeat((line.depth ?? 0) * IN) + line.text,
        tone: line.tone,
        keep: line.keep ?? 'tail',
        ...(has ? { pick: `fold:${line.id}` } : {}),
      });
      if (has && out) rows.push(...under(line, (line.depth ?? 0) + 1));
    } else if (line.kind === 'note') {
      rows.push({ kind: 'line', text: line.text, tone: line.tone });
    } else {
      rows.push({ kind: 'gap' });
      rows.push(...saying(line.text, line.mark || undefined, line.tone));
    }
  }

  rows.push(...planning(work.plan));

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
  if (work.room !== null) rows.push(roomLeft(work.room));
  // Nothing written and somebody working is the one case where an empty line
  // means something: it is how you call them off without a button to press.
  if (work.mood === 'working' && !written) {
    rows.push({ kind: 'line', text: 'return on an empty line stops it.', tone: 'faded' });
  }
  rows.push(...still(work.queued));
  rows.push(...holding(held));
  rows.push({ kind: 'typed', text: written });
  // Whatever the slash on that line could mean, written under it. Nothing
  // floats in this app, so a picker is only ever more lines on the wood.
  rows.push(...slash.rows());
  // An @ and a slash cannot both be open: one is the start of the line and the
  // other is somewhere in the middle of it.
  rows.push(...names.rows());
  return rows;
}

/**
 * What it says it is going to do.
 *
 * The agent's own plan, not the village's, and it is written where a plan
 * belongs: under everything that has happened and above the line you write on,
 * because it is about what comes next.
 */
function planning(plan: readonly Step[]): Row[] {
  if (!plan.length) return [];
  const rows: Row[] = [{ kind: 'gap' }, { kind: 'heading', text: 'the plan' }];
  for (const step of plan) {
    rows.push({
      kind: 'entry',
      mark: step.state === 'done' ? '✓' : step.state === 'doing' ? '…' : '·',
      text: step.text,
      tone: step.state === 'doing' ? 'ink' : 'faded',
      keep: 'front',
    });
  }
  return rows;
}

/**
 * How much room is left to think in.
 *
 * Nothing tells an agent it is running out; the conversation just starts
 * quietly losing its own beginning. So the board says it, filled for what is
 * left, and stops being a footnote when there is barely any.
 */
function roomLeft(room: number): Row {
  const full = Math.round(room * ROOM);
  const bar = '■'.repeat(full) + '─'.repeat(ROOM - full);
  return {
    kind: 'line',
    text: room < TIGHT ? `room to think ${bar} nearly gone.` : `room to think ${bar}`,
    tone: room < TIGHT ? 'sore' : 'faded',
  };
}

/**
 * What you said while it was busy and it has not heard yet.
 *
 * It goes just above the line you are writing on, because that is where it
 * came from and where it is going. Pressing one takes it back.
 */
function still(queued: readonly Waiting[]): Row[] {
  if (!queued.length) return [];
  const rows: Row[] = [
    { kind: 'gap' },
    { kind: 'heading', text: 'still to say, press to take one back' },
  ];
  for (const waiting of queued) {
    rows.push({
      kind: 'entry',
      mark: '·',
      text: waiting.text,
      tone: 'ink',
      keep: 'front',
      pick: `unsay:${waiting.id}`,
    });
  }
  rows.push({ kind: 'gap' });
  return rows;
}

/**
 * What you are carrying and have not handed over.
 *
 * A picture cannot be written on the wood, so what the board says is that you
 * have it: it sits by the line you are writing on until you say something, and
 * goes with whatever you say. Pressing one puts it down.
 */
function holding(held: readonly Carried[]): Row[] {
  if (!held.length) return [];
  const rows: Row[] = [
    { kind: 'gap' },
    { kind: 'heading', text: 'carrying, press to put one down' },
  ];
  for (const each of held) {
    rows.push({
      kind: 'entry',
      mark: '■',
      text: each.name,
      tone: 'ink',
      keep: 'tail',
      pick: `putdown:${each.id}`,
    });
  }
  rows.push({ kind: 'gap' });
  return rows;
}

/**
 * What is written under a line you have opened.
 *
 * A command's output is what it printed; an edit is the lines that actually
 * changed, and nothing else, because the part of the file that stayed the same
 * is not the edit. Added and removed lean on the same two tones the working
 * tree already uses, so a change reads the same wherever you meet it.
 */
function under(line: Line, depth: number): Row[] {
  const pad = ' '.repeat(depth * IN);
  const rows: Row[] = (line.body ?? []).map((text): Row => {
    if (line.bodyKind !== 'diff') {
      return { kind: 'line', text: pad + text, tone: 'faded', keep: 'front' };
    }
    return {
      kind: 'line',
      text: pad + text,
      tone: text.startsWith('+') ? 'keen' : 'sore',
      keep: 'front',
    };
  });
  if (line.more) {
    rows.push({ kind: 'line', text: `${pad}and ${line.more} more lines.`, tone: 'faded' });
  }
  return rows;
}

/** Which option a keystroke picks, or nothing if it picks none. */
export function answerFor(ask: Ask, key: string): string | undefined {
  const at = ANSWERS.indexOf(key);
  return at === -1 ? undefined : ask.options[at]?.optionId;
}
