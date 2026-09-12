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
  /* Where each session's checkout is, so a path written on the board can be
     the path inside it rather than the whole way from the root of the disk. */
  const wheres = new Map<string, string>();
  const learn = async (): Promise<void> => {
    for (const record of await tasks.list()) wheres.set(record.id, record.path);
  };
  void learn();
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
      house = new House(
        task,
        runtimes,
        () => {
          island.set(moodsOf(houses));
        },
        () => wheres.get(task)
      );
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
    private readonly moved: () => void,
    /** Where this session's checkout is, when anybody has said. */
    private readonly where: () => string | undefined
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
    const lines = linesOf(turns, this.where()).slice(-KEPT);
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

function runningIn(node: ToolNode, root?: string): string | undefined {
  if (node.kind === 'tool-group') {
    for (const child of [...node.children].reverse()) {
      const found = runningIn(child, root);
      if (found) return found;
    }
    return undefined;
  }
  return node.status === 'running' ? deedOf(node, root) : undefined;
}

function askOf(request: AcpPermissionRequest | undefined): Ask | null {
  if (!request) return null;
  return {
    requestId: request.requestId,
    text: deedOf(request.toolCall, undefined),
    options: request.options.map((option) => ({
      optionId: option.optionId,
      name: option.name.toLowerCase(),
    })),
  };
}

/**
 * Every turn, written out as the lines a board can hold.
 *
 * Not flattened: what an agent sends is a tree of work with real content
 * hanging off it, and the board gets all of it. What a command printed, what an
 * edit changed, what it was thinking on the way, and which piece of work was
 * done inside which other piece. The board decides how much of that to show;
 * this only decides what there is.
 */
function linesOf(turns: readonly TranscriptTurn[], root: string | undefined): Line[] {
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
      } else if (item.kind === 'thinking') {
        const thought = thoughtOf(item);
        if (thought) lines.push(thought);
      } else {
        pushDeeds(lines, item, 0, root);
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

/** As many lines of a tool's own output as are worth carrying to a board. */
const SPOKE = 40;
/** A thought is long and is not the thing you came to read. */
const MUSED = 60;

function markFor(status: string): string {
  return status === 'running' ? '…' : status === 'error' ? '✗' : '·';
}

function pushDeeds(lines: Line[], node: ToolNode, depth: number, root: string | undefined): void {
  if (node.kind === 'tool-group') {
    // A group is a thing in its own right, and its children happened inside it.
    lines.push({
      kind: 'deed',
      mark: markFor(node.status),
      text: node.label,
      tone: node.status === 'error' ? 'sore' : 'faded',
      depth,
    });
    for (const child of node.children) pushDeeds(lines, child, depth + 1, root);
    return;
  }
  const shown = bodyOf(node);
  lines.push({
    kind: 'deed',
    mark: markFor(node.status),
    text: deedOf(node, root),
    tone: node.status === 'error' ? 'sore' : 'faded',
    // A command says what it is at its front; a path says what it is at its end.
    keep: node.kind === 'execute-tool-call' ? 'front' : 'tail',
    depth,
    ...(shown ? { id: node.id, ...shown } : {}),
  });
  // An agent sent off to do something has its own work under it, at its depth.
  for (const child of node.children ?? []) pushDeeds(lines, child, depth + 1, root);
}

/** What a tool actually produced, if it produced anything worth reading. */
function bodyOf(
  node: Exclude<ToolNode, { kind: 'tool-group' }>
): Pick<Line, 'body' | 'bodyKind' | 'more'> | null {
  if (node.kind === 'execute-tool-call') return plainly(node.outputText);
  if (node.kind === 'create-file-tool-call') return plainly(node.content);
  if (node.kind === 'modify-file-tool-call') {
    const changed = changes(node.oldText, node.newText);
    if (!changed.length) return null;
    return {
      body: changed.slice(0, SPOKE),
      bodyKind: 'diff',
      ...(changed.length > SPOKE ? { more: changed.length - SPOKE } : {}),
    };
  }
  return null;
}

function plainly(text: string | undefined): Pick<Line, 'body' | 'bodyKind' | 'more'> | null {
  const written = (text ?? '').replaceAll('\r\n', '\n').replace(/\s+$/, '');
  if (!written) return null;
  const all = written.split('\n');
  return {
    body: all.slice(0, SPOKE),
    bodyKind: 'plain',
    ...(all.length > SPOKE ? { more: all.length - SPOKE } : {}),
  };
}

/**
 * What changed between two versions of a file, as marked lines.
 *
 * The common head and tail are dropped because they are the part that did not
 * change, and a diff that shows you the whole file is not showing you the edit.
 * No cleverness beyond that: this is a board, not a review tool.
 */
function changes(before: string, after: string): string[] {
  const was = before.replaceAll('\r\n', '\n').split('\n');
  const now = after.replaceAll('\r\n', '\n').split('\n');
  let head = 0;
  while (head < was.length && head < now.length && was[head] === now[head]) head += 1;
  let tail = 0;
  while (
    tail < was.length - head &&
    tail < now.length - head &&
    was[was.length - 1 - tail] === now[now.length - 1 - tail]
  ) {
    tail += 1;
  }
  const gone = was.slice(head, was.length - tail);
  const came = now.slice(head, now.length - tail);
  return [...gone.map((line) => `-${line}`), ...came.map((line) => `+${line}`)];
}

/**
 * What it was thinking, which until now was thrown away entirely.
 *
 * It arrives as a stream of reasoning nobody asked to read in full, so the line
 * says how long it went on for and the reasoning itself is underneath it.
 */
function thoughtOf(item: {
  id: string;
  text: string;
  status: string;
  startedAt: number;
  durationMs?: number;
}): Line | null {
  const text = item.text.trim();
  if (!text) return null;
  const spent = item.durationMs ?? Math.max(0, Date.now() - item.startedAt);
  const all = text.split('\n');
  return {
    kind: 'thought',
    mark: item.status === 'done' ? '·' : '…',
    text: item.status === 'done' ? `thought for ${clock(spent)}` : 'thinking',
    tone: 'faded',
    id: item.id,
    body: all.slice(0, MUSED),
    bodyKind: 'plain',
    ...(all.length > MUSED ? { more: all.length - MUSED } : {}),
  };
}

function clock(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

/** One thing done, said the way you would say it out loud. */
function deedOf(node: Exclude<ToolNode, { kind: 'tool-group' }>, root?: string): string {
  switch (node.kind) {
    case 'execute-tool-call':
      return node.command ?? node.title;
    case 'read-tool-call':
      return `read ${inside(where(node.locations) ?? node.title, root)}`;
    case 'create-file-tool-call':
      return `wrote ${inside(node.path, root)}`;
    case 'modify-file-tool-call':
      return `changed ${inside(node.path, root)}`;
    case 'delete-file-tool-call':
      return `removed ${inside(node.path, root)}`;
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

/**
 * A path said the way somebody working in that checkout would say it.
 *
 * The whole way from the root of the disk is the same for every file in a
 * session and so tells you nothing, and on a board this narrow it pushes the
 * part that does tell you something off the end.
 */
function inside(path: string, root: string | undefined): string {
  if (root && path.startsWith(root)) {
    const rest = path.slice(root.length).replace(/^[/\\]+/, '');
    if (rest) return rest;
  }
  return path;
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
