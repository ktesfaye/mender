import { parseNativeAbsolute } from '@emdash/core/primitives/path/api';
import type { CheckoutHeadState } from '@emdash/core/runtimes/git/api';
import { ReplicaState } from '@emdash/wire/live';
import type { Kit, Told } from '@shared/agents';
import { MCP_CATALOG } from '@shared/mcp-catalog';
import type { Task } from '@shared/tasks';
import type { MenderClient } from '../wire';
import type { Row } from './row';

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
  /** Show, or fold away, everyone who could work here but is not installed. */
  show(showing: boolean): void;
  showing(): boolean;
  /** What the export line says right now, in place of its own offer. */
  setExported(said: { text: string; path?: string } | null): void;
  /** What a pressed line means, or nothing if it was only a heading. */
  meant(pick: string): Meant | null;
  close(): Promise<void>;
}

export type Meant =
  | { does: 'choose'; what: 'hand' | 'model' | 'mode' | 'effort' | 'collab'; id: string }
  | { does: 'tool'; name: string; on: boolean }
  /** Open the real shell here, with the agent's own sign-in line ready to run. */
  | { does: 'signin'; command: string }
  | { does: 'browse' }
  | { does: 'addcat'; key: string }
  | { does: 'addcustom' }
  /** Arm or fire the two-press removal of one server. */
  | { does: 'rmtool'; name: string; asked: boolean }
  /** Fold the catalogue of installable skills open or shut. */
  | { does: 'browseknacks' }
  /** Install one from the catalogue. */
  | { does: 'addknack'; id: string }
  /** Write one of your own: a name, then what it is for. */
  | { does: 'addcustomknack' }
  /** Read, or stop reading, one it already knows. */
  | { does: 'knack'; name: string; from: 'everywhere' | 'here' }
  /** Arm or fire the two-press removal of one it already knows. */
  | { does: 'rmknack'; name: string; from: 'everywhere' | 'here'; asked: boolean }
  /** Write the transcript out as a markdown file, outside any checkout. */
  | { does: 'export' }
  /** The just-written transcript, shown where it actually landed. */
  | { does: 'show-export'; path: string };

interface KnackUi {
  catalogShowing: boolean;
  catalog: { id: string; name: string; about: string }[] | null;
  removing: { name: string; from: 'everywhere' | 'here' } | null;
  reading: { name: string; from: 'everywhere' | 'here'; text: string | null } | null;
}

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
  /** Whether the agents who are not on this machine are folded open. */
  let showing = false;
  /** Whether the catalogue of suggested servers is folded open. */
  let catalogShowing = false;
  /** The server armed for a second press to throw it away, if any. */
  let removing: string | null = null;
  /** What the export line says while its own result is sitting on it. */
  let exported: { text: string; path?: string } | null = null;
  /** The catalogue of skills, what it is reading, and what it is about to
      throw away — all folded together since none of it is a fact the kit
      itself carries. */
  let knackUi: KnackUi = { catalogShowing: false, catalog: null, removing: null, reading: null };

  const redraw = (): void => {
    changed(written(task, kit, ending, showing, catalogShowing, removing, exported, knackUi));
  };

  const replica = new ReplicaState<Kit>(client.agents.kit.state({ task: task.id }, 'state'), {
    onChange: (value) => {
      kit = value;
      redraw();
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
            redraw();
          },
        }
      )
    : null;
  const head = checkout
    ? new ReplicaState<CheckoutHeadState>(model.state({ checkout }, 'head'), {
        onChange: (value) => {
          ending = { ...ending, unsent: unsentIn(value) };
          redraw();
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
    rows: () => written(task, kit, ending, showing, catalogShowing, removing, exported, knackUi),
    setExported: (said) => {
      exported = said;
    },
    show: (open) => {
      showing = open;
      /* Turned back to the transcript is backing out of the card, and the
         offer to take the session down does not survive that — an accidental
         second press the next time the card is turned over must land on
         "send everybody home", not on "press again and it is gone". */
      if (!open && ending.asked) ending = { ...ending, asked: false };
    },
    showing: () => showing,
    ending: () => ending,
    ask: (asked) => {
      ending = { ...ending, asked };
    },
    meant: (pick) => {
      const meant = read(pick, kit);
      /* Arming or firing removal is the card's own state, tracked here rather
         than asked of the caller twice. */
      if (meant?.does === 'rmtool') {
        if (removing === meant.name) {
          removing = null;
          return { ...meant, asked: true };
        }
        removing = meant.name;
        return { ...meant, asked: false };
      }
      if (meant?.does === 'browse') catalogShowing = !catalogShowing;
      if (meant?.does === 'browseknacks') {
        knackUi = { ...knackUi, catalogShowing: !knackUi.catalogShowing };
        if (knackUi.catalogShowing && !knackUi.catalog) {
          void client.agents.skillsCatalogue().then((list) => {
            knackUi = { ...knackUi, catalog: list };
            redraw();
          });
        }
      }
      if (meant?.does === 'rmknack') {
        if (knackUi.removing?.name === meant.name && knackUi.removing.from === meant.from) {
          knackUi = { ...knackUi, removing: null };
          return { ...meant, asked: true };
        }
        knackUi = { ...knackUi, removing: { name: meant.name, from: meant.from } };
        return { ...meant, asked: false };
      }
      if (meant?.does === 'knack') {
        if (knackUi.reading?.name === meant.name && knackUi.reading.from === meant.from) {
          knackUi = { ...knackUi, reading: null };
        } else {
          knackUi = { ...knackUi, reading: { name: meant.name, from: meant.from, text: null } };
          const asked = meant;
          void client.agents
            .knackText({ task: task.id, name: asked.name, from: asked.from })
            .then((got) => {
              if (knackUi.reading?.name !== asked.name || knackUi.reading.from !== asked.from) return;
              knackUi = {
                ...knackUi,
                reading: {
                  name: asked.name,
                  from: asked.from,
                  text: got.success
                    ? got.data.content
                    : `could not read it${got.error.kind === 'refused' ? `: ${got.error.because}` : '.'}`,
                },
              };
              redraw();
            });
        }
      }
      return meant;
    },
    close: async () => {
      await Promise.all([replica.dispose(), status?.dispose(), head?.dispose()]);
    },
  };
}

/** `kind:id`, so a pressed line says what it was without a lookup table. */
function read(pick: string, kit: Kit | null): Meant | null {
  if (pick === 'signin') {
    return kit?.signIn ? { does: 'signin', command: kit.signIn.command } : null;
  }
  if (pick === 'browse') return { does: 'browse' };
  if (pick === 'addcustom') return { does: 'addcustom' };
  if (pick.startsWith('addcat:')) return { does: 'addcat', key: pick.slice(7) };
  if (pick.startsWith('rmtool:')) return { does: 'rmtool', name: pick.slice(7), asked: false };
  if (pick === 'export') return { does: 'export' };
  if (pick.startsWith('show-export:')) return { does: 'show-export', path: pick.slice(12) };
  if (pick === 'browseknacks') return { does: 'browseknacks' };
  if (pick === 'addcustomknack') return { does: 'addcustomknack' };
  if (pick.startsWith('addknack:')) return { does: 'addknack', id: pick.slice(9) };
  if (pick.startsWith('rmknack:')) {
    const [, from, name] = pick.split(':');
    return { does: 'rmknack', name, from: from as 'everywhere' | 'here', asked: false };
  }
  if (pick.startsWith('knack:')) {
    const [, from, name] = pick.split(':');
    return { does: 'knack', name, from: from as 'everywhere' | 'here' };
  }
  const cut = pick.indexOf(':');
  if (cut === -1) return null;
  const kind = pick.slice(0, cut);
  const id = pick.slice(cut + 1);
  if (
    kind === 'hand' ||
    kind === 'model' ||
    kind === 'mode' ||
    kind === 'effort' ||
    kind === 'collab'
  ) {
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

function written(
  task: Task,
  kit: Kit | null,
  ending?: Ending,
  showing?: boolean,
  catalogShowing?: boolean,
  removing?: string | null,
  exported?: { text: string; path?: string } | null,
  knackUi?: KnackUi
): Row[] {
  const rows: Row[] = [
    { kind: 'title', text: task.title, pick: 'card' },
    { kind: 'line', text: task.branch, tone: 'faded', keep: 'tail' },
  ];
  if (!kit) {
    rows.push({ kind: 'gap' }, { kind: 'line', text: 'looking…', tone: 'faded' });
    return [...rows, ...over(ending, false)];
  }

  rows.push({ kind: 'gap' }, { kind: 'heading', text: 'who works here' });
  // Only the ones you could actually pick. Two dozen agents you have never
  // installed is not a choice, it is a list.
  const could = kit.hands.filter((hand) => hand.here || hand.id === kit.hand);
  for (const hand of could) {
    rows.push({
      kind: 'entry',
      mark: hand.id === kit.hand ? ON : OFF,
      text: hand.signedIn === false ? `${hand.name}, not signed in` : hand.name,
      tone: hand.id === kit.hand ? 'ink' : 'faded',
      pick: `hand:${hand.id}`,
    });
  }
  /* Only the one working here says how, because that is the one thing about
     to fail without it. */
  if (kit.signIn) {
    rows.push({
      kind: 'entry',
      mark: '→',
      text: `${kit.signIn.agent} needs you to sign in`,
      pick: 'signin',
    });
  }
  /* Everyone who speaks the protocol and is not on this machine. Folded away
     until asked for, because two dozen agents you have never installed is a
     list rather than a choice; opened, each one offers to be put here. */
  const away = kit.hands.filter((hand) => !hand.here && hand.id !== kit.hand);
  if (showing) {
    for (const hand of away) {
      rows.push({
        kind: 'entry',
        mark: '+',
        text: `${hand.name}, not here yet`,
        tone: 'faded',
        pick: `bring:${hand.id}`,
      });
    }
  }
  const elsewhere = showing ? 0 : away.length;
  if (elsewhere) {
    /* Not a list, a fact you can act on: everyone who speaks the protocol and
       is not here yet, each offering to be put on the machine. */
    rows.push({
      kind: 'entry',
      mark: '+',
      text: `${elsewhere} more speak the protocol. press to bring one here`,
      tone: 'faded',
      pick: 'elsewhere',
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
    /* A finished conversation is exactly the one worth taking a copy of, so
       the export line stands even while nobody is awake to be configured. */
    rows.push({ kind: 'gap' }, exportRow(exported));
    /* A sleeping session still ends, and a session nobody has spoken to is
       exactly the one you are most likely to want rid of. */
    return [...rows, ...over(ending, false)];
  }

  choices(rows, 'thinking with', 'model', kit.model, kit.models);
  choices(rows, 'how it works', 'mode', kit.mode, kit.modes);
  choices(rows, 'how hard it thinks', 'effort', kit.effort, kit.efforts);
  choices(rows, 'how it goes about it', 'collab', kit.collab, kit.collabs);

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
    rows.push({
      kind: 'entry',
      mark: '✗',
      text: removing === tool.name ? `press again and ${tool.name} is gone` : `throw it away`,
      tone: removing === tool.name ? 'sore' : 'faded',
      pick: `rmtool:${tool.name}`,
    });
  }
  if (kit.tools.length) {
    rows.push({
      kind: 'prose',
      text: 'a server turned on or off here is on or off for this agent everywhere, and it takes hold next time a session starts.',
      tone: 'faded',
    });
  }

  const has = new Set(kit.tools.map((tool) => tool.name));
  if (catalogShowing) {
    for (const entry of MCP_CATALOG.filter((each) => !has.has(each.name.toLowerCase()))) {
      rows.push({
        kind: 'line',
        text: `${entry.name} · ${entry.description}`,
        pick: `addcat:${entry.key}`,
      });
    }
    rows.push({ kind: 'line', text: 'fold the catalogue away', pick: 'browse' });
  } else {
    rows.push({ kind: 'line', text: 'add a server from the catalogue', pick: 'browse' });
  }
  rows.push({ kind: 'line', text: 'add a server of your own', pick: 'addcustom' });

  rows.push({ kind: 'gap' }, { kind: 'heading', text: 'what it has been taught' });
  if (!kit.knacksSupported) {
    rows.push({ kind: 'line', text: 'this agent keeps none.', tone: 'faded' });
  } else {
    if (!kit.knacks.length) {
      rows.push({ kind: 'line', text: 'nothing yet.', tone: 'faded' });
    }
    for (const knack of kit.knacks) {
      const open =
        knackUi?.reading?.name === knack.name && knackUi.reading.from === knack.from;
      rows.push({
        kind: 'entry',
        mark: knack.from === 'here' ? '■' : OFF,
        text: knack.about ? `${knack.name} · ${knack.about}` : knack.name,
        tone: 'ink',
        pick: `knack:${knack.from}:${knack.name}`,
      });
      if (open) {
        rows.push({
          kind: 'prose',
          text: knackUi?.reading?.text ?? 'reading…',
          tone: 'faded',
        });
        const asking = knackUi?.removing?.name === knack.name && knackUi.removing.from === knack.from;
        rows.push({
          kind: 'entry',
          mark: '✗',
          text: asking ? `press again and ${knack.name} is gone` : 'throw it away',
          tone: asking ? 'sore' : 'faded',
          pick: `rmknack:${knack.from}:${knack.name}`,
        });
      }
    }
    if (knackUi?.catalogShowing) {
      const has = new Set(kit.knacks.map((knack) => knack.name));
      for (const entry of (knackUi.catalog ?? []).filter((one) => !has.has(one.id))) {
        rows.push({
          kind: 'line',
          text: `${entry.name} · ${entry.about}`,
          pick: `addknack:${entry.id}`,
        });
      }
      rows.push({ kind: 'line', text: 'fold the catalogue away', pick: 'browseknacks' });
    } else {
      rows.push({ kind: 'line', text: 'teach it one from the catalogue', pick: 'browseknacks' });
    }
    rows.push({ kind: 'line', text: 'teach it one of your own', pick: 'addcustomknack' });
  }
  rows.push({ kind: 'gap' }, exportRow(exported));
  return [...rows, ...over(ending, kit.awake)];
}

/** The one thing the card does to the conversation rather than to who has it. */
function exportRow(exported: { text: string; path?: string } | null | undefined): Row {
  return {
    kind: 'entry',
    mark: '→',
    text: exported?.text ?? 'export the transcript as markdown',
    tone: exported ? 'keen' : 'faded',
    pick: exported ? (exported.path ? `show-export:${exported.path}` : undefined) : 'export',
  };
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

/**
 * Sending whoever is working home without touching the worktree.
 *
 * One press, not two, because nothing here is thrown away: the branch, the
 * transcript and the worktree all stay exactly as they are, and opening this
 * session again — or just saying something to it — wakes the same one back
 * up. Only offered while somebody is actually here to send home.
 */
function homeward(awake: boolean): Row[] {
  if (!awake) return [];
  return [
    { kind: 'gap' },
    {
      kind: 'entry',
      mark: '○',
      text: 'send them home for the night',
      tone: 'faded',
      pick: 'rest',
    },
    {
      kind: 'prose',
      text: 'the worktree and everything said stay. opening this again wakes the same one back up.',
      tone: 'faded',
    },
  ];
}

function over(ending: Ending | undefined, awake: boolean): Row[] {
  if (!ending) return homeward(awake);
  const rows: Row[] = [
    ...homeward(awake),
    { kind: 'gap' },
    { kind: 'heading', text: 'when it is over' },
  ];

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

export function counted(many: number, thing: string): string {
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
export function unsentIn(head: CheckoutHeadState | undefined): number | null {
  if (!head || head.kind === 'detached' || head.kind === 'unborn') return 0;
  if (head.upstream.kind === 'none') return null;
  const tracking = head.upstream.tracking;
  return tracking.kind === 'resolved' ? tracking.ahead : 0;
}

/**
 * The whole conversation, oldest first, as a plain markdown document.
 *
 * `notes` arrive newest first and `thoughts` oldest first, so this reads the
 * notes backwards and pairs each with whatever it answered by turn, which is
 * the only thing that already ties the two together.
 */
export function transcriptMarkdown(task: Task, told: Told): string {
  const lines: string[] = [`# ${task.title}`, '', `_${task.branch}_`];
  const notes = [...told.notes].reverse();
  for (const note of notes) {
    lines.push('', '## you', '', note.said);
    for (const thought of told.thoughts) {
      if (thought.turn !== note.turn) continue;
      lines.push('', '## agent', '', thought.said);
    }
  }
  return `${lines.join('\n')}\n`;
}
