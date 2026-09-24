import { join } from 'node:path';
import { createJsonFileKeyValueStore } from '@emdash/core/primitives/kv/node';
import type {
  AcpPermissionRequest,
  PlanState,
  SessionState,
  SessionUsage,
  ToolNode,
  TranscriptThinking,
  TranscriptTurn,
} from '@emdash/core/runtimes/acp/api';
import type { ConversationRecords } from '@emdash/core/runtimes/conversations/api';
import { hostDependenciesContract } from '@emdash/core/services/host-dependencies/api';
import { pluginRegistry } from '@emdash/plugins/agents';
import { createLiveJobReplicaCache, LiveJobFailedError, ReplicaState } from '@emdash/wire/live';
import type { WireFile } from '@emdash/wire/rpc';
import { cell, peek, type Cell } from '@emdash/wire/state';
import { app } from 'electron';
import type {
  Ask,
  Carried,
  Deed,
  Errand,
  Kit,
  Line,
  Mood,
  Mused,
  Noted,
  Step,
  // Renamed on the way in: this file already has its own `Told`, the yes/no
  // result of an RPC, and the shared `Told` is the yard's whole conversation.
  // Same word, unrelated shapes.
  Told as ToldState,
  Waiting,
  WorkingState,
  Wrote,
} from '@shared/agents';

/**
 * Why an install left them not here, in its own words.
 *
 * A shrug is the least useful thing a failed install can say, and the host
 * already knows: a command that exited badly, a path nobody may write to, or
 * nothing to run at all on this machine.
 */
function said(error: { type?: string; message?: string; exitCode?: number | null } | undefined) {
  if (!error) return 'nothing said what went wrong.';
  if (error.type === 'permission-denied') {
    return `it is not allowed to write where that goes${error.message ? `: ${error.message}` : '.'}`;
  }
  if (error.message) return error.message;
  return error.type ? error.type.replaceAll('-', ' ') : 'nothing said what went wrong.';
}

/** What came of putting an agent on this machine. */
type Fetched =
  | { success: true; data: { here: boolean } }
  | {
      success: false;
      error:
        | { kind: 'no-such-agent' }
        | { kind: 'nothing-to-run' }
        | { kind: 'refused'; because: string };
    };
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
  /** Put an agent's CLI on this machine, so somebody else could work here. */
  fetch(hand: string): Promise<Fetched>;
  /** Every building with somebody in it, for the island. */
  moods(): Cell<Record<string, Mood>>;
  /** Start whoever lives in there, so they can say what they work with. */
  wake(task: string): Promise<Told>;
  tell(task: string, text: string, carrying?: readonly Carried[]): Promise<Told>;
  /** Pick a picture up off the wood, into the session's own store. */
  carry(
    task: string,
    file: WireFile
  ): Promise<{ success: true; data: Carried } | { success: false; error: TellError }>;
  /** Put one down again, before it goes anywhere. */
  putDown(task: string, id: string): Promise<Told>;
  answer(task: string, requestId: string, optionId: string): Promise<Told>;
  /** Take back something said while it was busy, before it is heard. */
  unsay(task: string, id: string): Promise<Told>;
  hush(task: string): Promise<Told>;
  /** Whoever is in there moves out with the building. */
  evict(task: string): Promise<void>;
  dispose(): Promise<void>;
}

type TellError =
  | { kind: 'no-such-task' }
  | { kind: 'nothing' }
  | { kind: 'refused'; because: string };

type Told = { success: true; data: void } | { success: false; error: TellError };

const EMPTY_TOLD: ToldState = {
  notes: [],
  thoughts: [],
  deeds: [],
  errands: [],
  wrote: [],
  turns: 0,
  began: null,
};

const EMPTY: WorkingState = {
  mood: 'empty',
  doing: 'nobody is working in here.',
  lines: [],
  told: EMPTY_TOLD,
  asking: null,
  plan: [],
  queued: [],
  room: null,
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

  /**
   * The conversation living in a building, starting one if none is.
   *
   * A conversation is the thing a session's transcript, its settings and its
   * attachments all hang off, so anything that hands something to a building
   * needs one to exist first, not only saying something.
   */
  const moveIn = async (
    task: string,
    record: { agent?: string; path: string; title: string }
  ): Promise<{ success: true; data: string } | { success: false; error: TellError }> => {
    const already = lodgers[task];
    if (already) return { success: true as const, data: already };
    const conversation = crypto.randomUUID();
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
    if (!made.success) return refusal(whatItSaid(made.error));
    await put(task, conversation);
    await Promise.all([houseOf(task).settle(conversation), kits.settle(task, conversation)]);
    return { success: true as const, data: conversation };
  };

  const refusal = (because: string) => ({
    success: false as const,
    error: { kind: 'refused' as const, because },
  });
  const refused = (because: string): Told => refusal(because);

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

    /**
     * Bring an agent onto the machine.
     *
     * The install command is the plugin's own, resolved by the same host
     * dependency service that decides whether it is here at all, so this is
     * running what that agent says installs it rather than a recipe the village
     * keeps. Nothing is chosen for you afterwards: the card lists whoever is
     * here, and who works in a building is still a press.
     */
    async fetch(hand) {
      const plugin = pluginRegistry.getAll().find((each) => each.metadata.id === hand);
      if (!plugin) return { success: false, error: { kind: 'no-such-agent' } };
      /* The dependency the host tracks is keyed by the plugin's own id, which
         is also how the card decides whether it is here. */
      const id = plugin.metadata.id;

      const jobs = createLiveJobReplicaCache(
        hostDependenciesContract.runInstallCommand,
        runtimes.host.runInstallCommand
      );
      const lease = await jobs.start({ id, commandKind: 'install' });
      try {
        const job = await lease.ready();
        const view = await job.result;
        // A refresh is what makes the card's "not installed here" go away.
        await runtimes.host.snapshot.mutate('refresh', { key: undefined, input: { id } });
        const here = view.status === 'available';
        /* An install that ran and left them not here is the interesting case,
           and the only thing that helps is what it actually said. */
        return {
          success: true,
          data: here ? { here } : { here, because: said(view.error) },
        };
      } catch (error) {
        if (error instanceof LiveJobFailedError) {
          const said = error.error as { message?: string };
          return {
            success: false,
            error: { kind: 'refused', because: said.message ?? 'it would not install.' },
          };
        }
        throw error;
      } finally {
        await lease.release();
        await jobs.dispose();
      }
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

    async tell(task, text, carrying) {
      const said = text.trim();
      // A picture handed over without a word is still something said.
      if (!said && !carrying?.length) return { success: false, error: { kind: 'nothing' } };
      await loaded;
      const record = (await tasks.list()).find((candidate) => candidate.id === task);
      if (!record) return { success: false, error: { kind: 'no-such-task' } };

      const house = houseOf(task);
      const moved = await moveIn(task, record);
      if (!moved.success) return moved;
      const conversation = moved.data;

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
        {
          conversationId: conversation,
          promptId: crypto.randomUUID(),
          prompt: {
            text: said,
            ...(carrying?.length
              ? {
                  attachments: carrying.map((each) => ({
                    type: 'attachment' as const,
                    id: each.id,
                    mimeType: each.mime,
                    name: each.name,
                  })),
                }
              : {}),
          },
        },
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

    async carry(task, file) {
      await loaded;
      const record = (await tasks.list()).find((candidate) => candidate.id === task);
      if (!record) return { success: false, error: { kind: 'no-such-task' } };
      // A picture belongs to the conversation it was handed to, so there has
      // to be one: dropping something on an empty building moves somebody in.
      const moved = await moveIn(task, record);
      if (!moved.success) return moved;
      const held = await runtimes.acp.uploadAttachment(
        { conversationId: moved.data },
        file,
        // A picture off a phone is not small, and none of this is on a deadline.
        { timeoutMs: 0 }
      );
      if (!held.success) return refusal(whatItSaid(held.error));
      const mime = pictured(held.data.mimeType);
      if (!mime) return refusal('the village only carries pictures.');
      return { success: true as const, data: { id: held.data.id, name: held.data.name, mime } };
    },

    async putDown(task, id) {
      await loaded;
      const conversation = lodgers[task];
      if (!conversation) return { success: false, error: { kind: 'no-such-task' } };
      const gone = await runtimes.acp.deleteAttachment({
        conversationId: conversation,
        attachmentId: id,
      });
      return gone.success ? { success: true, data: undefined } : refused(whatItSaid(gone.error));
    },

    async unsay(task, id) {
      await loaded;
      const conversation = lodgers[task];
      if (!conversation) return { success: false, error: { kind: 'no-such-task' } };
      const done = await runtimes.acp.deleteQueuedPrompt({ conversationId: conversation, id });
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
  private plan: PlanState | null = null;
  private usage: SessionUsage | null = null;
  private live: TranscriptTurn | null = null;
  private before: TranscriptTurn[] = [];
  private replicas: ReplicaState<unknown>[] = [];
  private trouble: string | undefined;
  /**
   * When this session first saw each message and tool call, keyed by the
   * item's own id.
   *
   * The protocol keeps no clock on either, so the only honest time is the one
   * this process happened to be looking when the item arrived. Whatever is
   * already on the turns a house is settled with — replayed history, or a
   * turn already in flight on reconnect — is stamped 0 instead of `Date.now()`
   * for that same reason: claiming those happened "now" would be a precision
   * we do not have. Cleared with the house.
   */
  private seen = new Map<string, number>();
  /* Whether anybody was watching yet. Until the first batch of turns has been
     published, everything on them is history rather than something happening,
     and history that was read off the disk has no honest clock on it. */
  private settled = false;

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
    /* What it says it is going to do, and how much room it has left to think
       in. Both are slices of the session rather than things that happened in
       it, which is why neither is in the transcript: a plan is replaced whole
       every time it changes, and the room only ever means right now. */
    const plan = new ReplicaState<PlanState | null>(
      model.state({ conversationId: conversation }, 'plan'),
      {
        onChange: (value) => {
          this.plan = value;
          this.publish();
        },
      }
    );
    const usage = new ReplicaState<SessionUsage | null>(
      model.state({ conversationId: conversation }, 'usage'),
      {
        onChange: (value) => {
          this.usage = value;
          this.publish();
        },
      }
    );
    this.replicas = [
      lifecycle as ReplicaState<unknown>,
      turn as ReplicaState<unknown>,
      plan as ReplicaState<unknown>,
      usage as ReplicaState<unknown>,
    ];

    await Promise.all([lifecycle.ready, turn.ready, plan.ready, usage.ready]);
    this.lifecycle = lifecycle.current();
    this.turned(turn.current());
    this.plan = plan.current() ?? null;
    this.usage = usage.current() ?? null;
    this.seedSeen();
    this.publish();
    this.settled = true;

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
      this.seedSeen();
      this.publish();
      this.settled = true;
    }
  }

  /**
   * Marks whatever is already on the turns as seen, without dating it.
   *
   * Called right before the first time a batch of turns is published, so that
   * `read()`'s own stamping only ever dates items that are genuinely new from
   * here on — the ones that arrive while somebody is watching.
   */
  private seedSeen(): void {
    this.settled = false;
    for (const turn of this.live ? [...this.before, this.live] : this.before) {
      for (const item of turn.items) {
        if (item.kind === 'thinking') continue; // it carries its own clock.
        for (const id of idsOf(item)) if (!this.seen.has(id)) this.seen.set(id, 0);
      }
    }
  }

  /**
   * The wall-clock time this house first saw an item, stamping it if new.
   *
   * Nothing is dated until the first batch has gone out, because until then
   * every item on the turns is something that already happened, possibly days
   * ago, and stamping it now would have the board say a week-old conversation
   * was this minute. Nought is the honest answer to when, and the board says
   * so in words rather than putting a time on it.
   */
  private time(id: string): number {
    const had = this.seen.get(id);
    if (had !== undefined) return had;
    const now = this.settled ? Date.now() : 0;
    this.seen.set(id, now);
    return now;
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
    this.seen.clear();
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
    const asking = askOf(this.lifecycle?.pendingPermissions?.[0], this.where());
    const mood = moodOf(this.lifecycle, asking, this.trouble);
    return {
      mood,
      doing: this.trouble ?? doingOf(mood, this.live),
      lines,
      told: toldOf(turns, this.where(), (id) => this.time(id)),
      asking,
      plan: stepsOf(this.plan),
      queued: waitingOf(this.lifecycle),
      room: roomOf(this.usage),
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

/**
 * What it says it is going to do.
 *
 * The agent's own plan, and it replaces the whole thing every time it changes,
 * so there is nothing to merge and nothing to keep: what is here is what it
 * thinks now.
 */
/** Whether a kind of file is one the agent can actually be shown. */
function pictured(mime: string): Carried['mime'] | null {
  return mime === 'image/png' ||
    mime === 'image/jpeg' ||
    mime === 'image/gif' ||
    mime === 'image/webp'
    ? mime
    : null;
}

function stepsOf(plan: PlanState | null): Step[] {
  if (!plan) return [];
  return plan.entries.map((entry) => ({
    text: entry.content,
    state:
      entry.status === 'completed' ? 'done' : entry.status === 'in_progress' ? 'doing' : 'ahead',
  }));
}

/** What was said to it while it was busy, in the order it will be heard. */
function waitingOf(lifecycle: SessionState | undefined): Waiting[] {
  if (!lifecycle) return [];
  return lifecycle.queuedPrompts.map((prompt) => ({ id: prompt.id, text: prompt.text }));
}

/**
 * How much room is left to think in.
 *
 * An agent holds a fixed amount in mind at once and gets no warning of its own
 * when that fills: the conversation quietly starts losing its beginning. So it
 * is worth being able to see it coming, and it is one number between a full
 * room and none.
 */
function roomOf(usage: SessionUsage | null): number | null {
  if (!usage || usage.contextSize <= 0) return null;
  const left = 1 - usage.contextUsed / usage.contextSize;
  return Math.min(1, Math.max(0, left));
}

function askOf(request: AcpPermissionRequest | undefined, root: string | undefined): Ask | null {
  if (!request) return null;
  return {
    requestId: request.requestId,
    text: deedOf(request.toolCall, root),
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
    /* Whether the thing just written was somebody talking, so the next piece
       of the same speech joins it rather than starting again. */
    let said = false;
    for (const item of turn.items) {
      if (item.kind === 'message') {
        const text = item.text.trim();
        /* What was handed over with it. A picture cannot be written on the
           wood, so what stays in the transcript is that you gave them one. */
        const handed = item.attachments?.length
          ? item.attachments.map((each) => each.name).join(', ')
          : null;
        if (!text && !handed) continue;
        if (handed) {
          if (text) {
            lines.push({ kind: 'said', mark: '>', text, tone: 'faded' });
          }
          lines.push({ kind: 'note', mark: '', text: `you handed over ${handed}.`, tone: 'faded' });
          said = false;
          continue;
        }
        const mark = item.role === 'user' ? '>' : '';
        /* One person talking without stopping is one thing said. The protocol
           breaks a reply into as many pieces as it likes, and each piece drawn
           as its own block puts a hole in the middle of a sentence. */
        const before = lines[lines.length - 1];
        if (said && before?.kind === 'said' && before.mark === mark) {
          before.text = `${before.text} ${text}`;
          continue;
        }
        lines.push(
          item.role === 'user'
            ? { kind: 'said', mark, text, tone: 'faded' }
            : { kind: 'said', mark, text, tone: 'ink' }
        );
        said = true;
        continue;
      }
      said = false;
      if (item.kind === 'thinking') {
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

/**
 * The same turns, told as a place instead of a list.
 *
 * `linesOf` walks the turns once for a board that reads top to bottom; this
 * walks them again for a yard that reads left to right, up, and out — your
 * notes, its thinking, what it did, who it sent, and what it made are five
 * different things about the one conversation, and the yard wants them apart
 * rather than folded into one column. `stamp` is the house's own memory of
 * when it first saw an item, since the protocol keeps no clock of its own on
 * anything but reasoning.
 */
function toldOf(
  turns: readonly TranscriptTurn[],
  root: string | undefined,
  stamp: (id: string) => number
): ToldState {
  const flat = flatten(turns);

  /* A note is answered once the exchange it opened has settled, or the agent
     has already said something back — either in the same turn or a later
     one. That can only be known by looking ahead, so this walks backward
     first and remembers whether anything answered has been seen yet. */
  const answered = new Array<boolean>(flat.length).fill(false);
  let saidSince = false;
  for (let i = flat.length - 1; i >= 0; i -= 1) {
    const item = flat[i];
    if (item.kind === 'said') saidSince = true;
    if (item.kind === 'note') answered[i] = item.hasOutcome || saidSince;
  }

  const notes: Noted[] = [];
  const thoughts: Mused[] = [];
  const deeds: Deed[] = [];
  const errands: Errand[] = [];
  const written: Wrote[] = [];
  let began: number | null = null;
  /* Nought means nobody knows when, so it is not a candidate for the earliest
     thing: a session whose history was read off the disk would otherwise say
     it had been going since 1970. */
  const earliest = (at: number): void => {
    if (!at) return;
    if (began === null || at < began) began = at;
  };

  flat.forEach((item, i) => {
    if (item.kind === 'note') {
      const at = stamp(item.id);
      earliest(at);
      notes.push({ id: item.id, said: item.text, at, answered: answered[i] });
    } else if (item.kind === 'said') {
      const at = stamp(item.id);
      earliest(at);
      thoughts.push({ id: item.id, said: item.text, at });
    } else if (item.kind === 'thinking') {
      earliest(item.item.startedAt);
      thoughts.push({
        id: item.item.id,
        said: item.item.text.trim(),
        at: item.item.startedAt,
        quiet: true,
        ...(item.item.status === 'thinking' ? { since: item.item.startedAt } : {}),
      });
    } else {
      toldFrom(item.node, root, stamp, earliest, deeds, errands, written);
    }
  });

  return {
    notes: notes.reverse(),
    /* A session that has run a while can carry thousands of tool calls and a
       reasoning stream to match, and the yard only ever reads the live edge
       of either — the fire and the far end of the errands. Notes are what
       you actually came back to reread, and there are never many of them, so
       they are the one list here that is never trimmed. */
    thoughts: thoughts.slice(-KEPT),
    deeds: deeds.slice(-KEPT),
    errands,
    wrote: newestByPath(written),
    turns: turns.length,
    began,
  };
}

/** One chronological item, flattened out of the turn/message/tool tree. */
type Flat =
  | { kind: 'note'; id: string; text: string; hasOutcome: boolean }
  | { kind: 'said'; id: string; text: string }
  | { kind: 'thinking'; item: TranscriptThinking }
  | { kind: 'tool'; node: ToolNode };

function flatten(turns: readonly TranscriptTurn[]): Flat[] {
  const flat: Flat[] = [];
  for (const turn of turns) {
    const hasOutcome = turn.outcome !== undefined;
    for (const item of turn.items) {
      if (item.kind === 'message') {
        const text = item.text.trim();
        if (!text) continue;
        flat.push(
          item.role === 'user'
            ? { kind: 'note', id: item.id, text, hasOutcome }
            : { kind: 'said', id: item.id, text }
        );
      } else if (item.kind === 'thinking') {
        if (item.text.trim()) flat.push({ kind: 'thinking', item });
      } else {
        flat.push({ kind: 'tool', node: item });
      }
    }
  }
  return flat;
}

/**
 * One tool call, folded into the yard's deeds, errands and cart.
 *
 * A tool group is a container the board draws a heading for and the yard
 * does not, so it disappears here and only its children come through. A
 * subagent is the opposite: it is the one thing that does NOT flatten, since
 * what it went and did belongs to its own errand and not to this session's
 * deeds.
 */
function toldFrom(
  node: ToolNode,
  root: string | undefined,
  stamp: (id: string) => number,
  earliest: (at: number) => void,
  deeds: Deed[],
  errands: Errand[],
  written: Wrote[]
): void {
  if (node.kind === 'tool-group') {
    for (const child of node.children)
      toldFrom(child, root, stamp, earliest, deeds, errands, written);
    return;
  }

  const at = stamp(node.id);
  earliest(at);

  if (node.kind === 'spawn-subagent-tool-call') {
    errands.push({
      id: node.id,
      errand: node.inputSummary ?? node.name,
      running: node.status === 'running',
      since: at,
    });
    return;
  }

  let note: string | undefined;
  if (node.kind === 'create-file-tool-call') {
    const added = node.content ? node.content.split('\n').length : 0;
    if (added) note = `${added} line${added === 1 ? '' : 's'}`;
    written.push({ path: node.path, at, added, gone: 0 });
  } else if (node.kind === 'modify-file-tool-call') {
    const changed = changes(node.oldText, node.newText);
    const added = changed.filter((line) => line.startsWith('+')).length;
    const gone = changed.filter((line) => line.startsWith('-')).length;
    if (added || gone) note = `+${added} −${gone}`;
    written.push({ path: node.path, at, added, gone });
  } else if (node.kind === 'search-tool-call' && node.matchCount !== undefined) {
    note = `${node.matchCount} match${node.matchCount === 1 ? '' : 'es'}`;
  }

  deeds.push({
    id: node.id,
    did: deedOf(node, root),
    note,
    tool: node.kind,
    running: node.status === 'running',
    ...(node.status === 'error' ? { wrong: true } : {}),
  });

  for (const child of node.children ?? []) {
    toldFrom(child, root, stamp, earliest, deeds, errands, written);
  }
}

/** Every file written, newest first, one entry per path. */
function newestByPath(written: readonly Wrote[]): Wrote[] {
  const had = new Set<string>();
  const kept: Wrote[] = [];
  for (let i = written.length - 1; i >= 0; i -= 1) {
    const entry = written[i];
    if (had.has(entry.path)) continue;
    had.add(entry.path);
    kept.push(entry);
  }
  return kept;
}

/** Every id under an item, so a house can mark what it has already dated. */
function idsOf(item: { id: string; children?: ToolNode[] }): string[] {
  const ids = [item.id];
  for (const child of item.children ?? []) ids.push(...idsOf(child));
  return ids;
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
      return standing(node.command ?? node.title, root);
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
      return sent(node.name, node.inputSummary);
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
/**
 * A command, said from inside the checkout it was run in.
 *
 * An agent writes absolute paths because that is what it was handed, and on the
 * wood they are mostly the same forty characters over and over, pushing the
 * part you wanted off the end of the line.
 */
function standing(command: string, root: string | undefined): string {
  if (!root) return command;
  return command.replaceAll(`${root}/`, '').replaceAll(root, '.');
}

/**
 * Somebody sent off to do one thing.
 *
 * The name is the tool's, not a person's — it is `Agent` every time — so what
 * is worth saying is the errand, which the agent writes out itself.
 */
function sent(name: string, errand: string | undefined): string {
  const who = name === 'Agent' || name === 'Task' ? 'somebody' : name;
  if (!errand) return `sent ${who} off`;
  return `sent ${who} off to ${errand.charAt(0).toLowerCase()}${errand.slice(1)}`;
}

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
