import { join } from 'node:path';
import { createJsonFileKeyValueStore } from '@emdash/core/primitives/kv/node';
import type {
  AcpPermissionRequest,
  SessionState,
  ToolNode,
  TranscriptTurn,
} from '@emdash/core/runtimes/acp/api';
import type { ConversationRecords } from '@emdash/core/runtimes/conversations/api';
import { ReplicaState } from '@emdash/wire/live';
import { cell, peek, type Cell } from '@emdash/wire/state';
import { app } from 'electron';
import type { Ask, Kit, Line, Mood, WorkingState } from '@shared/agents';
import { createKits } from './kit';
import type { MenderRuntimes } from './runtimes';
import type { Tasks } from './tasks';

/**
 * The agents, which are the villagers.
 *
 * A task is a building and this is what moves into it. Everything below the
 * projection is emdash's ACP runtime, unchanged: it spawns the agent's own CLI
 * over the agent client protocol, keeps the session, replays it after a
 * restart, and streams every message, thought, tool call and permission
 * request back as typed state. None of that vocabulary leaves this file.
 *
 * What leaves is what somebody outside the building can see: a mood, a line
 * about what is happening, what has been done, and whether there is a villager
 * at the door with a question. The island reads the mood and the board reads
 * the rest.
 */

/** Who moves in when nobody has said otherwise. */
const PROVIDER = 'claude';

/** How much of what happened the board keeps behind it. */
const KEPT = 400;
/** How many turns to ask the session for when we first look in. */
const BACKWARD = 12;

export interface Agents {
  /** The live state of one building, for the board to subscribe to. */
  working(task: string): Cell<WorkingState>;
  /** What that session works with, for the card. */
  kit(task: string): Cell<Kit>;
  choose(task: string, what: 'hand' | 'model' | 'mode' | 'effort', id: string): Promise<Told>;
  tool(task: string, name: string, on: boolean): Promise<Told>;
  /** Every building with somebody in it, for the island. */
  moods(): Cell<Record<string, Mood>>;
  /** Start whoever lives in there, so they can say what they work with. */
  wake(task: string): Promise<Told>;
  tell(task: string, text: string): Promise<Told>;
  answer(task: string, requestId: string, optionId: string): Promise<Told>;
  hush(task: string): Promise<Told>;
  /** Whoever is in there moves out with the building. */
  evict(task: string): Promise<void>;
  dispose(): Promise<void>;
}

type Told =
  | { success: true; data: void }
  | {
      success: false;
      error: { kind: 'no-such-task' } | { kind: 'nothing' } | { kind: 'refused'; because: string };
    };

const EMPTY: WorkingState = {
  mood: 'empty',
  doing: 'nobody is working in here.',
  lines: [],
  asking: null,
};

const KEY = 'agents';

export function createAgents(runtimes: MenderRuntimes, tasks: Tasks): Agents {
  const store = createJsonFileKeyValueStore({ path: join(userDataDir(), 'agents.json') });
  /** Which conversation lives in which building. */
  let lodgers: Record<string, string> = {};
  const loaded = (async () => {
    const held = await store.get(KEY);
    if (held.success && held.data && typeof held.data === 'object') {
      lodgers = held.data as unknown as Record<string, string>;
    }
  })();

  const houses = new Map<string, House>();
  const island = cell<Record<string, Mood>>({}, { name: 'agents:island' });
  /* Changing who works in a building empties it: a different agent is a
     different villager, not the same one with a new hat. */
  const kits = createKits(runtimes, tasks, (task) => evict(task));

  /* The host's conversation index, held open for the life of the app. It is
     where the provider's own session id lands when a session starts, which is
     the handle that lets a village reopened tomorrow pick up where it was. */
  let records: ConversationRecords = {};
  const index = new ReplicaState(runtimes.conversations.records.state(undefined, 'list'), {
    onChange: (value) => {
      records = value;
    },
  });

  /* What the agent decided the session is about. Claude's own adapter sends a
     title over the protocol once it knows one, and that is a better name for a
     session than the line that happened to start it. His own name for it wins;
     `retitle` is the one that knows that. */
  const named = new ReplicaState(runtimes.acp.sessions.state(undefined, 'list'), {
    onChange: (value) => {
      for (const [conversation, session] of Object.entries(value)) {
        if (!session.title) continue;
        const task = Object.keys(lodgers).find((key) => lodgers[key] === conversation);
        if (task) void tasks.retitle(task, session.title);
      }
    },
  });

  const houseOf = (task: string): House => {
    let house = houses.get(task);
    if (!house) {
      house = new House(task, runtimes, () => {
        island.set(moodsOf(houses));
      });
      houses.set(task, house);
      void loaded.then(async () => {
        const conversation = lodgers[task];
        if (!conversation) return;
        await Promise.all([house?.settle(conversation), kits.settle(task, conversation)]);
      });
    }
    return house;
  };

  /* Everyone who was already living here. The ACP runtime brings its own
     sessions back by itself when the app starts, so without this the island
     would be empty until you happened to open the right building. */
  void loaded.then(() => {
    for (const task of Object.keys(lodgers)) houseOf(task);
  });

  const put = async (task: string, conversation: string): Promise<void> => {
    lodgers = { ...lodgers, [task]: conversation };
    await store.set(KEY, lodgers as unknown as never);
  };

  const refused = (because: string): Told => ({
    success: false,
    error: { kind: 'refused', because },
  });

  const evict = async (task: string): Promise<void> => {
    await loaded;
    const conversation = lodgers[task];
    await houses.get(task)?.dispose();
    houses.delete(task);
    island.set(moodsOf(houses));
    if (!conversation) return;
    await runtimes.acp.terminate({ conversationId: conversation });
    await runtimes.conversations.delete({ conversationId: conversation });
    const { [task]: _gone, ...rest } = lodgers;
    lodgers = rest;
    await store.set(KEY, lodgers as unknown as never);
  };

  return {
    working: (task) => houseOf(task).state,
    kit: (task) => kits.kit(task),
    moods: () => island,

    async choose(task, what, id) {
      const done = await kits.choose(task, what, id);
      return done.success ? { success: true, data: undefined } : done;
    },

    async tool(task, name, on) {
      const done = await kits.tool(task, name, on);
      return done.success ? { success: true, data: undefined } : done;
    },

    async wake(task) {
      await loaded;
      const conversation = lodgers[task];
      if (!conversation) return { success: false, error: { kind: 'no-such-task' } };
      const record = (await tasks.list()).find((candidate) => candidate.id === task);
      if (!record) return { success: false, error: { kind: 'no-such-task' } };
      const house = houseOf(task);
      await Promise.all([house.settle(conversation), kits.settle(task, conversation)]);
      const started = await runtimes.acp.launch(
        {
          conversationId: conversation,
          providerId: record.agent ?? PROVIDER,
          cwd: record.path,
          sessionId: records[conversation]?.providerSessionId ?? null,
          model: record.model ?? null,
        },
        { timeoutMs: 0 }
      );
      if (!started.success) {
        house.broke(whatItSaid(started.error));
        return refused(whatItSaid(started.error));
      }
      return { success: true, data: undefined };
    },

    async tell(task, text) {
      const said = text.trim();
      if (!said) return { success: false, error: { kind: 'nothing' } };
      await loaded;
      const record = (await tasks.list()).find((candidate) => candidate.id === task);
      if (!record) return { success: false, error: { kind: 'no-such-task' } };

      const house = houseOf(task);
      let conversation = lodgers[task];
      if (!conversation) {
        conversation = crypto.randomUUID();
        const made = await runtimes.conversations.create({
          conversationId: conversation,
          provider: record.agent ?? PROVIDER,
          type: 'acp',
          cwd: record.path,
          workspacePath: record.path,
          // The agent's own CLI mints the session id; ours is only the record.
          idRegime: 'provider-minted',
          createdAt: Date.now(),
          title: record.title,
          config: { version: '1', type: 'acp' },
        });
        if (!made.success) return refused(whatItSaid(made.error));
        await put(task, conversation);
        await house.settle(conversation);
        await kits.settle(task, conversation);
      }

      house.arriving();
      // No deadline on either: starting an agent means spawning its CLI and
      // waiting for it to say hello, and a prompt is open for as long as the
      // work takes.
      const started = await runtimes.acp.launch(
        {
          conversationId: conversation,
          providerId: record.agent ?? PROVIDER,
          cwd: record.path,
          sessionId: records[conversation]?.providerSessionId ?? null,
          model: record.model ?? null,
        },
        { timeoutMs: 0 }
      );
      if (!started.success) {
        house.broke(whatItSaid(started.error));
        return refused(whatItSaid(started.error));
      }

      const sent = await runtimes.acp.sendPrompt(
        { conversationId: conversation, promptId: crypto.randomUUID(), prompt: { text: said } },
        { timeoutMs: 0 }
      );
      if (!sent.success) {
        house.broke(whatItSaid(sent.error));
        return refused(whatItSaid(sent.error));
      }
      return { success: true, data: undefined };
    },

    async answer(task, requestId, optionId) {
      await loaded;
      const conversation = lodgers[task];
      if (!conversation) return { success: false, error: { kind: 'no-such-task' } };
      const done = await runtimes.acp.resolvePermission({
        conversationId: conversation,
        requestId,
        optionId,
      });
      return done.success ? { success: true, data: undefined } : refused(whatItSaid(done.error));
    },

    async hush(task) {
      await loaded;
      const conversation = lodgers[task];
      if (!conversation) return { success: false, error: { kind: 'no-such-task' } };
      const done = await runtimes.acp.cancelTurn({ conversationId: conversation });
      return done.success ? { success: true, data: undefined } : refused(whatItSaid(done.error));
    },

    evict,

    async dispose() {
      await Promise.all([...houses.values()].map((house) => house.dispose()));
      houses.clear();
      await Promise.all([index.dispose(), named.dispose(), kits.dispose()]);
    },
  };
}

/**
 * One building with somebody in it.
 *
 * It holds the two live states the ACP session publishes — what the session is
 * doing, and the turn in flight — and folds both into the one shape the village
 * reads. History is asked for once when the house is settled; after that
 * everything arrives on its own.
 */
class House {
  readonly state: Cell<WorkingState>;

  private conversation: string | undefined;
  private lifecycle: SessionState | undefined;
  private live: TranscriptTurn | null = null;
  private before: TranscriptTurn[] = [];
  private replicas: ReplicaState<unknown>[] = [];
  private trouble: string | undefined;

  constructor(
    private readonly task: string,
    private readonly runtimes: MenderRuntimes,
    private readonly moved: () => void
  ) {
    this.state = cell<WorkingState>(EMPTY, { name: `agent:${task}` });
  }

  /** Somebody is in here after all, and this is their conversation. */
  async settle(conversation: string | undefined): Promise<void> {
    if (!conversation || this.conversation === conversation) return;
    this.conversation = conversation;

    const model = this.runtimes.acp.session;
    const lifecycle = new ReplicaState<SessionState>(
      model.state({ conversationId: conversation }, 'state'),
      {
        onChange: (value) => {
          this.lifecycle = value;
          this.publish();
        },
      }
    );
    const turn = new ReplicaState<TranscriptTurn | null>(
      model.state({ conversationId: conversation }, 'activeTurn'),
      {
        onChange: (value) => {
          this.turned(value);
          this.publish();
        },
      }
    );
    this.replicas = [lifecycle as ReplicaState<unknown>, turn as ReplicaState<unknown>];

    await Promise.all([lifecycle.ready, turn.ready]);
    this.lifecycle = lifecycle.current();
    this.turned(turn.current());
    this.publish();

    /* Everything said in here before the village was looking. A suspended
       session has none to give — its history lives with the running process —
       so this is best effort and the board says so rather than pretending the
       building was always empty. */
    const back = await this.runtimes.acp.loadHistory({
      conversationId: conversation,
      limit: BACKWARD,
    });
    if (back.success && back.data && !back.data.unavailable && back.data.turns.length) {
      const known = new Set(this.before.map((had) => had.id));
      this.before = [...back.data.turns.filter((had) => !known.has(had.id)), ...this.before];
      this.publish();
    }
  }

  /** Somebody is on their way in, before the session says anything itself. */
  arriving(): void {
    this.trouble = undefined;
    if (peek(this.state).mood === 'empty') {
      this.state.set({ ...EMPTY, mood: 'arriving', doing: 'someone is on their way.' });
      this.moved();
    }
  }

  broke(because: string): void {
    this.trouble = because;
    this.publish();
  }

  async dispose(): Promise<void> {
    const going = this.replicas;
    this.replicas = [];
    await Promise.all(going.map((replica) => replica.dispose()));
  }

  private turned(turn: TranscriptTurn | null | undefined): void {
    const now = turn ?? null;
    // A turn that settled and was replaced moves behind the one in flight; the
    // active state only ever carries the latest.
    if (this.live && (!now || now.id !== this.live.id)) {
      this.before = [...this.before, this.live].slice(-BACKWARD);
    }
    this.live = now;
  }

  private publish(): void {
    const was = peek(this.state);
    const next = this.read();
    this.state.set(next);
    if (was.mood !== next.mood) this.moved();
  }

  private read(): WorkingState {
    if (!this.conversation) return EMPTY;
    const turns = this.live ? [...this.before, this.live] : this.before;
    const lines = linesOf(turns).slice(-KEPT);
    const asking = askOf(this.lifecycle?.pendingPermissions?.[0]);
    const mood = moodOf(this.lifecycle, asking, this.trouble);
    return {
      mood,
      doing: this.trouble ?? doingOf(mood, this.live),
      lines,
      asking,
    };
  }
}

function moodsOf(houses: Map<string, House>): Record<string, Mood> {
  const moods: Record<string, Mood> = {};
  for (const [task, house] of houses) {
    const mood = peek(house.state).mood;
    if (mood !== 'empty') moods[task] = mood;
  }
  return moods;
}

function moodOf(
  lifecycle: SessionState | undefined,
  asking: Ask | null,
  trouble: string | undefined
): Mood {
  if (trouble) return 'hurt';
  if (!lifecycle) return 'arriving';
  if (asking) return 'asking';
  if (lifecycle.lifecycle === 'starting' || lifecycle.lifecycle === 'replaying') return 'arriving';
  if (lifecycle.isGenerating) return 'working';
  if (lifecycle.lastTurnErrored) return 'hurt';
  /* A closed or suspended session is somebody who is not at work this second,
     not an empty building: the village was shut and everyone went home, and
     saying a word in there brings them back to the same conversation. Only a
     building nobody has ever been told to work in is empty, and that one never
     reaches here. */
  return 'resting';
}

/** The one line at the top of the board, in the village's words. */
function doingOf(mood: Mood, live: TranscriptTurn | null): string {
  if (mood === 'asking') return 'waiting on you.';
  if (mood === 'arriving') return 'someone is on their way.';
  if (mood === 'resting') return 'done, and waiting for you to say something.';
  if (mood === 'empty') return 'nobody is working in here.';
  const last = live ? lastMove(live) : undefined;
  return last ?? 'working.';
}

/** Whatever is actually happening this second, if it can be named. */
function lastMove(turn: TranscriptTurn): string | undefined {
  let move: string | undefined;
  for (const item of turn.items) {
    if (item.kind === 'thinking') move = item.status === 'thinking' ? 'thinking.' : move;
    else if (item.kind !== 'message') {
      const running = runningIn(item);
      if (running) move = `${running}…`;
    }
  }
  return move;
}

function runningIn(node: ToolNode): string | undefined {
  if (node.kind === 'tool-group') {
    for (const child of [...node.children].reverse()) {
      const found = runningIn(child);
      if (found) return found;
    }
    return undefined;
  }
  return node.status === 'running' ? deedOf(node) : undefined;
}

function askOf(request: AcpPermissionRequest | undefined): Ask | null {
  if (!request) return null;
  return {
    requestId: request.requestId,
    text: deedOf(request.toolCall),
    options: request.options.map((option) => ({
      optionId: option.optionId,
      name: option.name.toLowerCase(),
    })),
  };
}

/** Every turn, flattened into the lines a board can hold. */
function linesOf(turns: readonly TranscriptTurn[]): Line[] {
  const lines: Line[] = [];
  for (const turn of turns) {
    for (const item of turn.items) {
      if (item.kind === 'message') {
        const text = item.text.trim();
        if (!text) continue;
        lines.push(
          item.role === 'user'
            ? { kind: 'said', mark: '>', text, tone: 'faded' }
            : { kind: 'said', mark: '', text, tone: 'ink' }
        );
      } else if (item.kind !== 'thinking') {
        pushDeeds(lines, item);
      }
    }
    const outcome = turn.outcome;
    if (outcome?.kind === 'cancelled') {
      lines.push({ kind: 'note', mark: '', text: 'you stopped it there.', tone: 'faded' });
    } else if (outcome?.kind === 'error') {
      lines.push({
        kind: 'note',
        mark: '',
        text: outcome.reason ? spelt(outcome.reason) : 'it broke off.',
        tone: 'sore',
      });
    }
  }
  return lines;
}

function pushDeeds(lines: Line[], node: ToolNode): void {
  if (node.kind === 'tool-group') {
    for (const child of node.children) pushDeeds(lines, child);
    return;
  }
  lines.push({
    kind: 'deed',
    mark: node.status === 'running' ? '…' : node.status === 'error' ? '×' : '·',
    text: deedOf(node),
    tone: node.status === 'error' ? 'sore' : 'faded',
    // A command says what it is at its front; a path says what it is at its end.
    keep: node.kind === 'execute-tool-call' ? 'front' : 'tail',
  });
}

/** One thing done, said the way you would say it out loud. */
function deedOf(node: Exclude<ToolNode, { kind: 'tool-group' }>): string {
  switch (node.kind) {
    case 'execute-tool-call':
      return node.command ?? node.title;
    case 'read-tool-call':
      return `read ${where(node.locations) ?? node.title}`;
    case 'create-file-tool-call':
      return `wrote ${node.path}`;
    case 'modify-file-tool-call':
      return `changed ${node.path}`;
    case 'delete-file-tool-call':
      return `removed ${node.path}`;
    case 'search-tool-call':
      return `looked for ${node.query}`;
    case 'web-fetch-tool-call':
      return `read ${node.pageTitle ?? node.url}`;
    case 'spawn-subagent-tool-call':
      return `sent ${node.name} off`;
    case 'create-plan-tool-call':
      return 'made a plan';
    case 'mcp-tool-call':
      return node.server ? `${node.server}: ${node.tool}` : node.tool;
    default:
      return node.title;
  }
}

function where(locations: { path: string }[] | undefined): string | undefined {
  return locations?.[0]?.path;
}

/** A runtime's reason, as a sentence rather than a symbol. */
function spelt(reason: string): string {
  return `${reason.replaceAll('_', ' ')}.`;
}

/** What the runtime actually said, in a sentence rather than a type name. */
function whatItSaid(error: { type?: string; message?: string }): string {
  if (error.message) return error.message;
  return error.type ? spelt(error.type) : 'it would not say.';
}

/** Where Mender keeps its own state on this machine. */
function userDataDir(): string {
  return process.env.MENDER_DATA_DIR ?? app.getPath('userData');
}
