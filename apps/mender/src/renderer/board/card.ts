import { parseNativeAbsolute } from '@emdash/core/primitives/path/api';
import type { CheckoutHeadState } from '@emdash/core/runtimes/git/api';
import { ReplicaState } from '@emdash/wire/live';
import type { Kit } from '@shared/agents';
import type { Task } from '@shared/tasks';
import type { MenderClient } from '../wire';
import type { Row } from './board';

/**
 * The card: what a session works with.
 *
 * The board is the conversation and this is the same board showing the other
 * thing it has to show — who is working in here, what they are thinking with,
 * what they can reach out in the world, and what they have been taught. You
 * get to it from the rail and you leave it the same way, which is why there is
 * no tab strip: the rail is the only thing in this app that changes what the
 * board is.
 *
 * Every line on it is pressable, and pressing one is the whole interaction.
 */

export interface LiveCard {
  rows(): Row[];
  /** What would be lost if the session ended, asked for fresh each rewrite. */
  ending(): Ending | undefined;
  /** Ask, or stop asking, whether to take it down. */
  ask(asked: boolean): void;
  /** What a pressed line means, or nothing if it was only a heading. */
  meant(pick: string): Meant | null;
  close(): Promise<void>;
}

export type Meant =
  | { does: 'choose'; what: 'hand' | 'model' | 'mode' | 'effort'; id: string }
  | { does: 'tool'; name: string; on: boolean };

export async function openCard(
  client: MenderClient,
  task: Task,
  changed: (rows: Row[]) => void
): Promise<LiveCard> {
  let kit: Kit | null = null;
  /* What ending it would cost, kept current from the same live checkout the
     board reads: a preflight computed once and then gone stale is a preflight
     that lies. */
  let ending: Ending = { uncommitted: 0, unsent: 0, asked: false };

  const replica = new ReplicaState<Kit>(client.agents.kit.state({ task: task.id }, 'state'), {
    onChange: (value) => {
      kit = value;
      changed(written(task, value, ending));
    },
  });

  const parsed = parseNativeAbsolute(task.path);
  const checkout = parsed.success ? parsed.data : null;
  const model = client.git.checkout.model;
  const status = checkout
    ? new ReplicaState<{ kind: string; entries?: Record<string, unknown> }>(
        model.state({ checkout }, 'status'),
        {
          onChange: (value) => {
            ending = { ...ending, uncommitted: Object.keys(value.entries ?? {}).length };
            changed(written(task, kit, ending));
          },
        }
      )
    : null;
  const head = checkout
    ? new ReplicaState<CheckoutHeadState>(model.state({ checkout }, 'head'), {
        onChange: (value) => {
          ending = { ...ending, unsent: unsentIn(value) };
          changed(written(task, kit, ending));
        },
      })
    : null;

  await Promise.all([replica.ready, status?.ready, head?.ready]);
  kit = replica.current();
  ending = {
    uncommitted: Object.keys(status?.current()?.entries ?? {}).length,
    unsent: unsentIn(head?.current()),
    asked: false,
  };

  return {
    rows: () => written(task, kit, ending),
    ending: () => ending,
    ask: (asked) => {
      ending = { ...ending, asked };
    },
    meant: (pick) => read(pick, kit),
    close: async () => {
      await Promise.all([replica.dispose(), status?.dispose(), head?.dispose()]);
    },
  };
}

/** `kind:id`, so a pressed line says what it was without a lookup table. */
function read(pick: string, kit: Kit | null): Meant | null {
  const cut = pick.indexOf(':');
  if (cut === -1) return null;
  const kind = pick.slice(0, cut);
  const id = pick.slice(cut + 1);
  if (kind === 'hand' || kind === 'model' || kind === 'mode' || kind === 'effort') {
    return { does: 'choose', what: kind, id };
  }
  if (kind === 'tool') {
    const was = kit?.tools.find((tool) => tool.name === id);
    return { does: 'tool', name: id, on: !was?.on };
  }
  return null;
}

/** The one you are on, and the ones you are not. */
const ON = '●';
const OFF = '·';

function written(task: Task, kit: Kit | null, ending?: Ending): Row[] {
  const rows: Row[] = [
    { kind: 'title', text: task.title, pick: 'card' },
    { kind: 'line', text: task.branch, tone: 'faded', keep: 'tail' },
  ];
  if (!kit) {
    rows.push({ kind: 'gap' }, { kind: 'line', text: 'looking…', tone: 'faded' });
    return [...rows, ...over(ending)];
  }

  rows.push({ kind: 'gap' }, { kind: 'heading', text: 'who works here' });
  // Only the ones you could actually pick. Two dozen agents you have never
  // installed is not a choice, it is a list.
  const could = kit.hands.filter((hand) => hand.here || hand.id === kit.hand);
  for (const hand of could) {
    rows.push({
      kind: 'entry',
      mark: hand.id === kit.hand ? ON : OFF,
      text: hand.name,
      tone: hand.id === kit.hand ? 'ink' : 'faded',
      pick: `hand:${hand.id}`,
    });
  }
  const elsewhere = kit.hands.length - could.length;
  if (elsewhere) {
    rows.push({
      kind: 'line',
      text: `${elsewhere} more speak the protocol but are not installed here.`,
      tone: 'faded',
    });
  }
  rows.push({
    kind: 'prose',
    text: 'changing who works here sends the one who was here home. what you say next starts the new one, in the same checkout.',
    tone: 'faded',
  });

  if (!kit.awake) {
    rows.push(
      { kind: 'gap' },
      {
        kind: 'prose',
        text: 'what they think with, how they work and how hard they think are theirs to offer, not ours to guess, so they are not here until somebody has spoken to them.',
        tone: 'faded',
      }
    );
    return rows;
  }

  choices(rows, 'thinking with', 'model', kit.model, kit.models);
  choices(rows, 'how it works', 'mode', kit.mode, kit.modes);
  choices(rows, 'how hard it thinks', 'effort', kit.effort, kit.efforts);

  rows.push({ kind: 'gap' }, { kind: 'heading', text: 'what it can reach' });
  if (!kit.tools.length) {
    rows.push({ kind: 'line', text: 'nothing beyond this machine.', tone: 'faded' });
  }
  for (const tool of kit.tools) {
    rows.push({
      kind: 'entry',
      mark: tool.on ? ON : OFF,
      text: tool.trouble ? `${tool.name} · ${tool.trouble}` : tool.name,
      tone: tool.trouble ? 'sore' : tool.on ? 'ink' : 'faded',
      pick: `tool:${tool.name}`,
    });
  }
  if (kit.tools.length) {
    rows.push({
      kind: 'prose',
      text: 'a server turned on or off here is on or off for this agent everywhere, and it takes hold next time a session starts.',
      tone: 'faded',
    });
  }

  rows.push({ kind: 'gap' }, { kind: 'heading', text: 'what it has been taught' });
  if (!kit.knacks.length) {
    rows.push({ kind: 'line', text: 'nothing yet.', tone: 'faded' });
  }
  for (const knack of kit.knacks) {
    rows.push({
      kind: 'entry',
      mark: knack.from === 'here' ? '■' : OFF,
      text: knack.about ? `${knack.name} · ${knack.about}` : knack.name,
      tone: 'ink',
    });
  }
  return [...rows, ...over(ending)];
}

function choices(
  rows: Row[],
  heading: string,
  what: string,
  on: string | null,
  all: { id: string; name: string; about?: string }[]
): void {
  if (!all.length) return;
  rows.push({ kind: 'gap' }, { kind: 'heading', text: heading });
  for (const choice of all) {
    rows.push({
      kind: 'entry',
      mark: choice.id === on ? ON : OFF,
      text: choice.about ? `${choice.name} · ${choice.about}` : choice.name,
      tone: choice.id === on ? 'ink' : 'faded',
      pick: `${what}:${choice.id}`,
    });
  }
}

/**
 * What would be lost if this session were taken down, and the offer to do it.
 *
 * The branch outlives the building: taking a session down removes the place
 * the work happened, not the work. What it does remove is whatever in that
 * working tree was never committed, so that is counted and said before you are
 * asked rather than after, and it takes two presses like everything else here
 * that cannot be pressed again.
 */
export interface Ending {
  /** How many files in there are not as they were committed. */
  uncommitted: number;
  /** How many commits nowhere else has, or null when it follows nothing. */
  unsent: number | null;
  asked: boolean;
}

function over(ending: Ending | undefined): Row[] {
  if (!ending) return [];
  const rows: Row[] = [{ kind: 'gap' }, { kind: 'heading', text: 'when it is over' }];

  const losing = [
    ending.uncommitted
      ? `${counted(ending.uncommitted, 'file')} in there nobody has committed`
      : '',
    ending.unsent === null
      ? 'a branch nowhere else has ever seen'
      : ending.unsent
        ? `${counted(ending.unsent, 'commit')} nowhere else has`
        : '',
  ].filter(Boolean);
  rows.push({
    kind: 'line',
    text: losing.length
      ? `there ${losing.length === 1 ? 'is' : 'are'} ${losing.join(' and ')}.`
      : 'everything in there is committed and sent.',
    tone: losing.length ? 'sore' : 'faded',
  });

  if (!ending.asked) {
    rows.push({
      kind: 'entry',
      mark: '✗',
      text: 'send everybody home and take this down',
      tone: 'faded',
      pick: 'end',
    });
    return rows;
  }
  rows.push({
    kind: 'entry',
    mark: '✗',
    text: losing.length ? 'press again and all of that is gone' : 'press again and it is gone',
    tone: 'sore',
    pick: 'end!',
  });
  return rows;
}

function counted(many: number, thing: string): string {
  return many === 1 ? `one ${thing}` : `${many} ${thing}s`;
}

/**
 * How far the branch has run ahead of whatever it is following.
 *
 * Null when it is following nothing, which is a different fact and has to stay
 * one: a branch nobody has seen has everything on it that nowhere else has,
 * and how much that is cannot be counted from here. A number would be a guess
 * printed as a fact, which is the worst thing a preflight can do.
 */
function unsentIn(head: CheckoutHeadState | undefined): number | null {
  if (!head || head.kind === 'detached' || head.kind === 'unborn') return 0;
  if (head.upstream.kind === 'none') return null;
  const tracking = head.upstream.tracking;
  return tracking.kind === 'resolved' ? tracking.ahead : 0;
}
