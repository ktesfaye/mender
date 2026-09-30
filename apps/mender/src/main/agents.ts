import { homedir } from 'node:os';
import { join } from 'node:path';
import { createJsonFileKeyValueStore } from '@emdash/core/primitives/kv/node';
import type {
  AcpPermissionRequest,
  PlanState,
  SessionFailure,
  SessionState,
  SessionUsage,
  ToolNode,
  TranscriptThinking,
  TranscriptTurn,
} from '@emdash/core/runtimes/acp/api';
import type { ConversationRecords } from '@emdash/core/runtimes/conversations/api';
import { hostDependenciesContract } from '@emdash/core/services/host-dependencies/api';
import { pluginRegistry } from '@emdash/plugins/agents';
import { log } from '@emdash/shared/logger';
import { createLiveJobReplicaCache, LiveJobFailedError, ReplicaState } from '@emdash/wire/live';
import type { WireFile } from '@emdash/wire/rpc';
import { cell, peek, type Cell } from '@emdash/wire/state';
import { app } from 'electron';
import type {
  Ask,
  Carried,
  Deed,
  Errand,
  Failure,
  Glance,
  Kit,
  Line,
  Made,
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
import { clockOf, readDated, sizeOf, type Dated } from './claude-clock';
import { helperTrail, type HelperTrail } from './helper-trail';
import { kept, madeIn, stillThere } from './made';

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

/** What came of asking to read a taught skill. */
type KnackRead =
  | { success: true; data: { content: string } }
  | { success: false; error: { kind: 'refused'; because: string } };

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

/** What came of asking an agent already here to bring itself up to date, or
 *  of asking it to go. Nothing to run at all is the one case `fetch` and
 *  `remove` can hit that this can't — there is nothing to update about an
 *  agent that was never here — so this drops it. */
type Changed =
  | { success: true; data: { here: boolean } }
  | { success: false; error: { kind: 'no-such-agent' } | { kind: 'refused'; because: string } };
import type { AppSettings } from './app-settings';
import { createKits } from './kit';
import type { MenderRuntimes } from './runtimes';
import type { Tasks } from './tasks';
import { createTitler } from './titler';

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

/** How much of what happened the board keeps behind it. */
const KEPT = 400;
/** How many turns to ask the session for when we first look in. */
const BACKWARD = 50;
/** How long a resting session sits untouched before the village sends it
    home on its own, the process gone but the worktree and transcript kept. */
const IDLE_MS = 30 * 60 * 1000;
/** How often the sweep looks for one that has gone that long. */
const IDLE_SWEEP_MS = 60 * 1000;

export interface Agents {
  /** The live state of one building, for the board to subscribe to. */
  working(task: string): Cell<WorkingState>;
  /** What that session works with, for the card. */
  kit(task: string): Cell<Kit>;
  choose(
    task: string,
    what: 'hand' | 'model' | 'mode' | 'effort' | 'collab',
    id: string
  ): Promise<Told>;
  tool(task: string, name: string, on: boolean): Promise<Told>;
  /** Add one from the catalogue of suggested servers. */
  addTool(task: string, key: string): Promise<Told>;
  /** Add one of your own: a name, then its command or URL. */
  addCustomTool(task: string, name: string, command: string): Promise<Told>;
  /** Throw one away, for this agent only. */
  removeTool(task: string, name: string): Promise<Told>;
  /** The catalogue of skills Emdash ships, to install one from. */
  skillsCatalogue(): { id: string; name: string; about: string }[];
  /** Install one from the catalogue, for this agent everywhere. */
  addKnack(task: string, id: string): Promise<Told>;
  /** Write one of your own: a name, then what it is for. */
  addCustomKnack(task: string, name: string, about: string): Promise<Told>;
  /** Throw one away. */
  removeKnack(task: string, name: string, from: 'everywhere' | 'here'): Promise<Told>;
  /** What it actually says, read on demand. */
  knackText(task: string, name: string, from: 'everywhere' | 'here'): Promise<KnackRead>;
  /** Put an agent's CLI on this machine, so somebody else could work here. */
  fetch(hand: string): Promise<Fetched>;
  /** Bring an agent already here up to date, the plugin's own way. */
  update(hand: string): Promise<Changed>;
  /** Take an agent's CLI off this machine again. */
  remove(hand: string): Promise<Changed>;
  /** Every building with somebody in it, for the island. */
  moods(): Cell<Record<string, Mood>>;
  /** What each lantern says beyond its mood: which work, since when, what wait. */
  glances(): Cell<Record<string, Glance>>;
  /** Start whoever lives in there, so they can say what they work with. */
  wake(task: string): Promise<Told>;
  tell(task: string, text: string, carrying?: readonly Carried[]): Promise<Told>;
  /** Start a brand-new conversation already pointed at a foreign session
      id — see `doTell` for the ordinary path this is a stripped-down
      sibling of. */
  resume(task: string, providerSessionId: string): Promise<Told>;
  /** Pick a picture up off the wood, into the session's own store. */
  carry(
    task: string,
    file: WireFile
  ): Promise<{ success: true; data: Carried } | { success: false; error: TellError }>;
  /** Put one down again, before it goes anywhere. */
  putDown(task: string, id: string): Promise<Told>;
  answer(task: string, requestId: string, optionId: string): Promise<Told>;
  /** Sends every mark a multi-select question has picked up, at once. */
  finishAsking(task: string): Promise<Told>;
  /** Take back something said while it was busy, before it is heard. */
  unsay(task: string, id: string): Promise<Told>;
  hush(task: string): Promise<Told>;
  /** Stop one helper it sent out, leaving the session and the turn alone. */
  recall(
    task: string,
    call: string
  ): Promise<{ success: true; data: { stopped: boolean } } | { success: false; error: TellError }>;
  /** What a helper did and said, read off Claude's own record of them. */
  helperTrail(
    task: string,
    call: string
  ): Promise<{ success: true; data: HelperTrail | null } | { success: false; error: TellError }>;
  /** Say the last thing said to this session again. */
  retryFailure(task: string): Promise<Told>;
  /** Schedule the last thing said to go out again on its own, once a typed
   *  failure's reset time comes. */
  waitOutFailure(task: string): Promise<Told>;
  /** Disarm a scheduled continue. */
  stopWaiting(task: string): Promise<Told>;
  /** Leave this conversation behind and start a fresh one in its place. */
  startOver(task: string): Promise<Told>;
  /** Whoever is in there moves out with the building. */
  evict(task: string): Promise<void>;
  /** Sends them home for the night: the process stops, everything else stays. */
  rest(task: string): Promise<Told>;
  /** What was half-written on this session's line, so it survives a restart. */
  draft(task: string): Promise<string>;
  setDraft(task: string, text: string): Promise<void>;
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
  made: [],
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
  cost: null,
  failure: null,
  carryOn: null,
};

const KEY = 'agents';
const DRAFTS_KEY = 'drafts';
const MADE_KEY = 'made';

export function createAgents(
  runtimes: MenderRuntimes,
  tasks: Tasks,
  /** The windmill's own memory: who starts fresh, and what they last thought with. */
  settings: AppSettings
): Agents {
  const store = createJsonFileKeyValueStore({ path: join(userDataDir(), 'agents.json') });
  /** Which conversation lives in which building. */
  let lodgers: Record<string, string> = {};
  /** What was half-written on a session's line, keyed by task, so it is
      still there after the app itself restarts. */
  let drafts: Record<string, string> = {};
  /** Everything each session has made, keyed by task, because a resumed
      conversation does not always bring its own history back whole. */
  let madeBy: Record<string, Made[]> = {};
  let madeLoaded = false;
  const loaded = (async () => {
    const held = await store.get(KEY);
    if (held.success && held.data && typeof held.data === 'object') {
      lodgers = held.data as unknown as Record<string, string>;
    }
    const heldDrafts = await store.get(DRAFTS_KEY);
    if (heldDrafts.success && heldDrafts.data && typeof heldDrafts.data === 'object') {
      drafts = heldDrafts.data as unknown as Record<string, string>;
    }
    const heldMade = await store.get(MADE_KEY);
    if (heldMade.success && heldMade.data && typeof heldMade.data === 'object') {
      madeBy = heldMade.data as unknown as Record<string, Made[]>;
    }
    madeLoaded = true;
  })();

  const houses = new Map<string, House>();
  /** One scheduled "carry on when it lifts" continue per task, at most. */
  const carryOnTimers = new Map<string, ReturnType<typeof setTimeout>>();
  /* Where each session's checkout is, so a path written on the board can be
     the path inside it rather than the whole way from the root of the disk. */
  const wheres = new Map<string, string>();
  /* When each house last had anything happen in it, so the sweep below knows
     how long one has sat quiet. Touched on every mood change, which is also
     touched the moment a turn settles into resting — the idle clock starts
     counting from exactly the point there is nothing left to wait for. */
  const lastActive = new Map<string, number>();
  const learn = async (): Promise<void> => {
    for (const record of await tasks.list()) wheres.set(record.id, record.path);
  };
  void learn();
  const island = cell<Record<string, Mood>>({}, { name: 'agents:island' });
  /* Set on every publish, which is every streamed word, so only when it
     actually says something different: otherwise every rail on the island
     is redrawn for each word one agent says. */
  const glances = cell<Record<string, Glance>>({}, { name: 'agents:glances' });
  let glanced = '{}';
  const reglance = (): void => {
    const next = glancesOf(houses);
    const said = JSON.stringify(next);
    if (said === glanced) return;
    glanced = said;
    glances.set(next);
  };
  /* Changing who works in a building empties it: a different agent is a
     different villager, not the same one with a new hat. */
  const kits = createKits(runtimes, tasks, (task) => evict(task), settings);

  /* The host's conversation index, held open for the life of the app. It is
     where the provider's own session id lands when a session starts, which is
     the handle that lets a village reopened tomorrow pick up where it was. */
  let records: ConversationRecords = {};
  /* A past session being picked back up, by task, from the moment it is
     picked until the agent has it. Opening the board wakes the session at
     the same time, and whichever launch lands first is the session it gets,
     so every launch in that window has to ask for the same past one. */
  const resuming = new Map<string, string>();
  const sessionFor = (task: string, conversation: string): string | null =>
    resuming.get(task) ?? records[conversation]?.providerSessionId ?? null;
  const index = new ReplicaState(runtimes.conversations.records.state(undefined, 'list'), {
    onChange: (value) => {
      records = value;
    },
  });

  /* What the session is about, worked out from the whole of it rather than
     taken from the adapter, whose title is the first line said, tidied. It is
     worked out once as soon as the first thing is said, again as each of the
     first few turns settles, and then every third, so a session that wanders
     off into something else is renamed for what it is now. His own name for it
     wins; `retitle` is the one that knows that. */
  const titler = createTitler(runtimes.env);
  /** Where each session stood when it was last named: how much had been
      said, and whether that turn had settled. */
  const titledAt = new Map<string, { said: number; settled: boolean }>();
  /** Sessions seen at work since the app opened. Only those are named: one
      that has merely woken up with its history is not news, and its history
      arrives after it first reports resting, so it would read as brand new. */
  const worked = new Set<string>();
  const titling = new Set<string>();
  /** Sessions that moved on while being named, to look at again after. */
  const again = new Set<string>();
  const retitleFromWork = (task: string, house: House): void => {
    const state = peek(house.state);
    const said = state.told.notes.length;
    if (state.mood === 'working') worked.add(task);
    if (!worked.has(task) || !said) return;
    if (titling.has(task)) {
      again.add(task);
      return;
    }
    const settled = state.mood === 'resting';
    const last = titledAt.get(task);
    const due = settled
      ? !last || ((last.said !== said || !last.settled) && (said <= 3 || said - last.said >= 3))
      : !last;
    if (!due) return;
    titledAt.set(task, { said, settled });
    titling.add(task);
    void titler
      .title(state.told)
      .then((title) => (title ? tasks.retitle(task, title) : undefined))
      .finally(() => {
        titling.delete(task);
        const here = houses.get(task);
        if (again.delete(task) && here) retitleFromWork(task, here);
      });
  };
  /** Named off the history it already has, for a session picked up from a
      conversation started elsewhere: nothing new is going to be said to
      prompt it, and until then it is called by its first line, cut short.
      Tried again as the history finishes arriving. */
  const nameFromHistory = (task: string): void => {
    worked.add(task);
    for (const wait of [1500, 5000, 12000]) {
      setTimeout(() => {
        const here = houses.get(task);
        if (here && !titledAt.has(task)) retitleFromWork(task, here);
      }, wait);
    }
  };

  /* A house whose villager went home, kept rather than thrown away: whoever
     is watching the yard is still holding its state, and a new house would
     publish to nobody. Waking the session moves it straight back in. */
  const asleep = new Map<string, House>();

  /* Whatever a session is seen to have made goes into the ledger the first
     time it is seen and never comes out of it, so the list is the union of
     every sighting rather than whatever the transcript happens to hold now. */
  const keepMade = (task: string, found: readonly Made[]): Made[] => {
    const before = madeBy[task] ?? [];
    const next = kept(before, found);
    if (!madeLoaded) return next;
    if (JSON.stringify(next) !== JSON.stringify(before)) {
      madeBy = { ...madeBy, [task]: next };
      void store.set(MADE_KEY, madeBy as unknown as never);
    }
    return next;
  };

  const houseOf = (task: string): House => {
    let house = houses.get(task);
    const sleeping = house ? undefined : asleep.get(task);
    if (sleeping) {
      asleep.delete(task);
      houses.set(task, sleeping);
      house = sleeping;
      void loaded.then(async () => {
        const conversation = lodgers[task];
        if (!conversation) return;
        await Promise.all([sleeping.settle(conversation), kits.settle(task, conversation)]);
      });
    }
    if (!house) {
      house = new House(
        task,
        runtimes,
        () => {
          lastActive.set(task, Date.now());
          island.set(moodsOf(houses));
          const here = houses.get(task);
          if (here) retitleFromWork(task, here);
        },
        () => wheres.get(task),
        (found) => keepMade(task, found),
        reglance,
        () => {
          const conversation = lodgers[task];
          return conversation && records[conversation]?.provider === 'claude'
            ? sessionFor(task, conversation)
            : null;
        }
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
     would be empty until you happened to open the right building.

     A building taken down while the app was shut can still be in `lodgers` —
     nothing prunes it on the way out, only on the way in — so this checks
     each one against the buildings that actually still stand and forgets any
     that don't, rather than waking a villager who has no house any more. */
  void Promise.all([loaded, tasks.list()]).then(async ([, standing]) => {
    const alive = new Set(standing.map((task) => task.id));
    const orphaned = Object.keys(lodgers).filter((task) => !alive.has(task));
    if (orphaned.length) {
      lodgers = Object.fromEntries(Object.entries(lodgers).filter(([task]) => alive.has(task)));
      await store.set(KEY, lodgers as unknown as never);
    }
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
    if (already) {
      /* Going home throws the house and the card away but keeps the
         conversation, so saying something to a session that went home has
         to hang them back on it, or the agent answers and the yard never
         hears. Both are no-ops when they are already on it. */
      await Promise.all([houseOf(task).settle(already), kits.settle(task, already)]);
      return { success: true as const, data: already };
    }
    const conversation = crypto.randomUUID();
    const made = await runtimes.conversations.create({
      conversationId: conversation,
      provider: record.agent ?? (await settings.defaultHand()),
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

  /** Unhooks a house from its conversation and keeps it for the next one. */
  const putToBed = async (task: string): Promise<void> => {
    const house = houses.get(task);
    if (!house) return;
    houses.delete(task);
    await house.dispose();
    asleep.set(task, house);
  };

  const refusal = (because: string) => ({
    success: false as const,
    error: { kind: 'refused' as const, because },
  });
  const refused = (because: string): Told => refusal(because);

  const evict = async (task: string): Promise<void> => {
    await loaded;
    const conversation = lodgers[task];
    await putToBed(task);
    island.set(moodsOf(houses));
    reglance();
    if (!conversation) return;
    await runtimes.acp.terminate({ conversationId: conversation });
    await runtimes.conversations.delete({ conversationId: conversation });
    const { [task]: _gone, ...remaining } = lodgers;
    lodgers = remaining;
    await store.set(KEY, lodgers as unknown as never);
  };

  /**
   * Sends whoever is working home without taking anything down.
   *
   * The same first half as `evict` — the process actually stops — but nothing
   * after it: the conversation stays in `lodgers`, so the next thing said in
   * here, or simply opening the yard again, resumes the very same session the
   * same way the whole app does when it starts back up. Distinct from taking
   * a session down, which also throws the worktree away.
   */
  const rest = async (task: string): Promise<Told> => {
    await loaded;
    const conversation = lodgers[task];
    stopWaiting(task);
    await putToBed(task);
    await kits.forget(task);
    lastActive.delete(task);
    island.set(moodsOf(houses));
    reglance();
    if (conversation) await runtimes.acp.terminate({ conversationId: conversation });
    return { success: true, data: undefined };
  };

  /**
   * A villager left standing at the gate too long goes home on their own.
   *
   * Only a house that is genuinely idle — done with its turn and nobody
   * asked anything, not working and not waiting on you — is ever swept, and
   * only once it has sat that way longer than `IDLE_MS`. Checked on a slow
   * clock because nothing here needs to be prompt: worst case a session
   * that could have gone home sooner keeps its process a few minutes longer.
   */
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [task, house] of houses) {
      if (peek(house.state).mood !== 'resting') continue;
      const since = lastActive.get(task) ?? now;
      if (now - since >= IDLE_MS) void rest(task);
    }
  }, IDLE_SWEEP_MS);
  sweep.unref?.();

  /** Disarms a scheduled "carry on when it lifts" continue, if one is armed. */
  const stopWaiting = (task: string): void => {
    const timer = carryOnTimers.get(task);
    if (timer) clearTimeout(timer);
    carryOnTimers.delete(task);
    houses.get(task)?.carryOn(null);
  };

  /**
   * Say something to whoever is in there, moving somebody in if nobody is.
   *
   * Pulled out of the `tell` RPC so "try again" and a scheduled continue can
   * say the same thing again without going back out through the wire.
   */
  const doTell = async (
    task: string,
    text: string,
    carrying?: readonly Carried[]
  ): Promise<Told> => {
    const said = text.trim();
    // A picture handed over without a word is still something said.
    if (!said && !carrying?.length) return { success: false, error: { kind: 'nothing' } };
    await loaded;
    const record = (await tasks.list()).find((candidate) => candidate.id === task);
    if (!record) return { success: false, error: { kind: 'no-such-task' } };

    const house = houseOf(task);
    const moved = await moveIn(task, record);
    if (!moved.success) {
      log.warn('agents: tell could not move in', { area: 'agents', task, error: moved.error });
      return moved;
    }
    const conversation = moved.data;
    log.info('agents: tell', {
      area: 'agents',
      task,
      conversation,
      chars: said.length,
      carrying: carrying?.length ?? 0,
    });

    /* Anything said fresh — by hand or by a scheduled continue — is this
       session's own "retry" from here on, and stops any continue still armed
       from an earlier limit. */
    stopWaiting(task);
    house.sent(said);
    /* Named off what was just said, once it has landed in the transcript —
       which for a fresh agent is after it has finished starting — rather than
       left as "claude" for however long the first turn takes. */
    worked.add(task);
    for (const wait of [3000, 8000, 15000, 25000]) {
      setTimeout(() => {
        const here = houses.get(task);
        if (here && !titledAt.has(task)) retitleFromWork(task, here);
      }, wait);
    }

    /* From here on the village is watching: you said something, so anything
       that turns up after it is happening in front of you and can honestly
       be dated. Everything before it might be a week old. */
    house.watched();
    house.arriving();
    const hand = record.agent ?? (await settings.defaultHand());
    /* A session with a choice of its own keeps it; one that has never said
       either starts on whatever this agent was last asked for anywhere. */
    const remembered = await settings.lastKit(hand);
    // No deadline on either: starting an agent means spawning its CLI and
    // waiting for it to say hello, and a prompt is open for as long as the
    // work takes.
    const started = await runtimes.acp.launch(
      {
        conversationId: conversation,
        providerId: hand,
        cwd: record.path,
        sessionId: sessionFor(task, conversation),
        model: record.model ?? remembered.model,
        modeId: remembered.mode,
      },
      { timeoutMs: 0 }
    );
    if (!started.success) {
      log.error('agents: launch failed', { area: 'agents', task, error: started.error });
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
      log.error('agents: prompt refused', { area: 'agents', task, error: sent.error });
      house.broke(whatItSaid(sent.error));
      return refused(whatItSaid(sent.error));
    }
    log.info('agents: tell landed', { area: 'agents', task, queued: sent.data?.queued });
    return { success: true, data: undefined };
  };

  /**
   * `doTell` without a prompt to send: creates the conversation if none
   * exists yet, same as always, then launches it with the caller's own
   * chosen `sessionId` instead of whatever this conversation last
   * remembered (which, for a conversation this new, is nothing at all).
   * Resuming that history *is* the first thing said, so nothing else goes
   * out after the launch succeeds.
   */
  const resumeInto = async (task: string, providerSessionId: string): Promise<Told> => {
    // Before the first await: the wake that opening the board sends is
    // already on its way, and it has to find this.
    resuming.set(task, providerSessionId);
    try {
      await loaded;
      const record = (await tasks.list()).find((candidate) => candidate.id === task);
      if (!record) return { success: false, error: { kind: 'no-such-task' } };

      const house = houseOf(task);
      const moved = await moveIn(task, record);
      if (!moved.success) return moved;
      const conversation = moved.data;

      /* Not `watched()`: nothing has been said yet, and everything the agent
         sends back now is its old history, the same as waking a session the
         app last saw yesterday. Watching would date all of it to now and read
         its last unfinished turn as somebody working. */
      house.arriving();
      const hand = record.agent ?? (await settings.defaultHand());
      const remembered = await settings.lastKit(hand);
      const started = await runtimes.acp.launch(
        {
          conversationId: conversation,
          providerId: hand,
          cwd: record.path,
          sessionId: providerSessionId,
          model: record.model ?? remembered.model,
          modeId: remembered.mode,
        },
        { timeoutMs: 0 }
      );
      if (!started.success) {
        house.broke(whatItSaid(started.error));
        return refused(whatItSaid(started.error));
      }
      await house.readBack();
      nameFromHistory(task);
      return { success: true, data: undefined };
    } finally {
      resuming.delete(task);
    }
  };

  const wake = async (task: string): Promise<Told> => {
    await loaded;
    const conversation = lodgers[task];
    if (!conversation) return { success: false, error: { kind: 'no-such-task' } };
    const record = (await tasks.list()).find((candidate) => candidate.id === task);
    if (!record) return { success: false, error: { kind: 'no-such-task' } };
    const house = houseOf(task);
    await Promise.all([house.settle(conversation), kits.settle(task, conversation)]);
    /* Waking somebody who is already up has nothing to load, so only a
       sleeping session says it is waking. */
    const sleeping = !house.awake();
    if (sleeping) house.waking(true);
    try {
      const hand = record.agent ?? (await settings.defaultHand());
      const remembered = await settings.lastKit(hand);
      const started = await runtimes.acp.launch(
        {
          conversationId: conversation,
          providerId: hand,
          cwd: record.path,
          sessionId: sessionFor(task, conversation),
          model: record.model ?? remembered.model,
          modeId: remembered.mode,
        },
        { timeoutMs: 0 }
      );
      if (!started.success) {
        house.broke(whatItSaid(started.error));
        return refused(whatItSaid(started.error));
      }
      /* The launch is back once the history has been read in, but the
         session's own word that it is ready can trail it by a beat. */
      if (sleeping) await house.pastStarting(1500);
      if (sleeping) await house.readBack();
      /* A title cut short with an ellipsis is somebody's first line, never
         a name: the namer's are short enough to need no cutting. One picked
         up before anything named it is named now, off what it holds. */
      if (!record.named && record.title.endsWith('…')) nameFromHistory(task);
      return { success: true, data: undefined };
    } finally {
      if (sleeping) house.waking(false);
    }
  };

  return {
    working: (task) => houseOf(task).state,
    kit: (task) => kits.kit(task),
    moods: () => island,
    glances: () => glances,

    async choose(task, what, id) {
      /* A session that went home still lists what it thinks with, so picking
         one wakes it first, the same as saying something to it does. */
      if (what !== 'hand' && !kits.awake(task)) {
        await loaded;
        if (lodgers[task]) {
          const woke = await wake(task);
          if (!woke.success) return woke;
        }
      }
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

    /**
     * Bring an agent already on this machine up to date.
     *
     * The plugin's own self-update command wins when it has one — running the
     * CLI itself is the surest way to end up on what it calls its own latest —
     * and only falls back to the platform's per-method update command when it
     * doesn't.
     */
    async update(hand) {
      const plugin = pluginRegistry.getAll().find((each) => each.metadata.id === hand);
      if (!plugin) return { success: false, error: { kind: 'no-such-agent' } };
      const id = plugin.metadata.id;

      const selfJobs = createLiveJobReplicaCache(
        hostDependenciesContract.runSelfUpdateCommand,
        runtimes.host.runSelfUpdateCommand
      );
      const selfLease = await selfJobs.start({ id });
      try {
        const job = await selfLease.ready();
        const view = await job.result;
        await runtimes.host.snapshot.mutate('refresh', { key: undefined, input: { id } });
        return { success: true, data: { here: view.status === 'available' } };
      } catch (error) {
        if (!(error instanceof LiveJobFailedError)) throw error;
        const because = error.error as { type?: string; message?: string };
        if (because.type !== 'no-update-command') {
          return {
            success: false,
            error: { kind: 'refused', because: because.message ?? 'it would not update.' },
          };
        }
      } finally {
        await selfLease.release();
        await selfJobs.dispose();
      }

      const jobs = createLiveJobReplicaCache(
        hostDependenciesContract.runInstallCommand,
        runtimes.host.runInstallCommand
      );
      const lease = await jobs.start({ id, commandKind: 'update' });
      try {
        const job = await lease.ready();
        const view = await job.result;
        await runtimes.host.snapshot.mutate('refresh', { key: undefined, input: { id } });
        return { success: true, data: { here: view.status === 'available' } };
      } catch (error) {
        if (error instanceof LiveJobFailedError) {
          const because = error.error as { message?: string };
          return {
            success: false,
            error: { kind: 'refused', because: because.message ?? 'it would not update.' },
          };
        }
        throw error;
      } finally {
        await lease.release();
        await jobs.dispose();
      }
    },

    /** Take an agent's CLI back off this machine, the plugin's own way. */
    async remove(hand) {
      const plugin = pluginRegistry.getAll().find((each) => each.metadata.id === hand);
      if (!plugin) return { success: false, error: { kind: 'no-such-agent' } };
      const id = plugin.metadata.id;

      const jobs = createLiveJobReplicaCache(
        hostDependenciesContract.runInstallCommand,
        runtimes.host.runInstallCommand
      );
      const lease = await jobs.start({ id, commandKind: 'uninstall' });
      try {
        const job = await lease.ready();
        const view = await job.result;
        await runtimes.host.snapshot.mutate('refresh', { key: undefined, input: { id } });
        return { success: true, data: { here: view.status === 'available' } };
      } catch (error) {
        if (error instanceof LiveJobFailedError) {
          const because = error.error as { message?: string };
          return {
            success: false,
            error: { kind: 'refused', because: because.message ?? 'it would not remove.' },
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

    async addTool(task, key) {
      const done = await kits.addTool(task, key);
      return done.success ? { success: true, data: undefined } : done;
    },

    async addCustomTool(task, name, command) {
      const done = await kits.addCustomTool(task, name, command);
      return done.success ? { success: true, data: undefined } : done;
    },

    async removeTool(task, name) {
      const done = await kits.removeTool(task, name);
      return done.success ? { success: true, data: undefined } : done;
    },

    skillsCatalogue: () => kits.catalogueSkills(),

    async addKnack(task, id) {
      const done = await kits.addKnack(task, id);
      return done.success ? { success: true, data: undefined } : done;
    },

    async addCustomKnack(task, name, about) {
      const done = await kits.addCustomKnack(task, name, about);
      return done.success ? { success: true, data: undefined } : done;
    },

    async removeKnack(task, name, from) {
      const done = await kits.removeKnack(task, name, from);
      return done.success ? { success: true, data: undefined } : done;
    },

    async knackText(task, name, from) {
      return await kits.knackText(task, name, from);
    },

    wake,

    tell: doTell,
    resume: resumeInto,

    async retryFailure(task) {
      const text = houseOf(task).retryText();
      if (!text) return { success: false, error: { kind: 'nothing' } };
      return doTell(task, text);
    },

    /**
     * Arms a continue that sends itself once the failure's own reset time
     * comes: the village's own take on Claude Code's "continuing
     * automatically at 5pm". Needs both a reset time to aim for and
     * something to say again; either missing means nothing to schedule.
     */
    async waitOutFailure(task) {
      const house = houseOf(task);
      const text = house.retryText();
      const resetAt = house.currentResetAt();
      if (!text || !resetAt) return { success: false, error: { kind: 'nothing' } };
      stopWaiting(task);
      house.carryOn(resetAt);
      carryOnTimers.set(
        task,
        setTimeout(
          () => {
            carryOnTimers.delete(task);
            void doTell(task, text);
          },
          Math.max(0, resetAt - Date.now())
        )
      );
      return { success: true, data: undefined };
    },

    async stopWaiting(task) {
      stopWaiting(task);
      return { success: true, data: undefined };
    },

    /** Leaves this conversation behind — its transcript included — and starts
     *  a fresh one the next time something is said. The worktree and branch
     *  are untouched; only the conversation this building is lodging is. */
    async startOver(task) {
      stopWaiting(task);
      await evict(task);
      return { success: true, data: undefined };
    },

    async answer(task, requestId, optionId) {
      await loaded;
      const conversation = lodgers[task];
      if (!conversation) return { success: false, error: { kind: 'no-such-task' } };
      const house = houseOf(task);
      /* Several things asking at once only get marked here; they go out
         together when `finishAsking` is pressed. */
      if (peek(house.state).asking?.multi) {
        house.mark(requestId, optionId);
        return { success: true, data: undefined };
      }
      const done = await runtimes.acp.resolvePermission({
        conversationId: conversation,
        requestId,
        optionId,
      });
      return done.success ? { success: true, data: undefined } : refused(whatItSaid(done.error));
    },

    async finishAsking(task) {
      await loaded;
      const conversation = lodgers[task];
      if (!conversation) return { success: false, error: { kind: 'no-such-task' } };
      const house = houseOf(task);
      const picks = house.picks();
      house.clearPicks();
      for (const { requestId, optionId } of picks) {
        const done = await runtimes.acp.resolvePermission({
          conversationId: conversation,
          requestId,
          optionId,
        });
        if (!done.success) return refused(whatItSaid(done.error));
      }
      return { success: true, data: undefined };
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
      const house = houses.get(task);
      house?.hushing(true);
      const done = await runtimes.acp.cancelTurn({ conversationId: conversation });
      if (!done.success) house?.hushing(false);
      return done.success ? { success: true, data: undefined } : refused(whatItSaid(done.error));
    },

    async recall(task, call) {
      await loaded;
      const conversation = lodgers[task];
      if (!conversation) return { success: false, error: { kind: 'no-such-task' } };
      const done = await runtimes.acp.stopSubagent({
        conversationId: conversation,
        toolCallId: call,
      });
      log.info('agents: recall', {
        area: 'agents',
        task,
        call,
        stopped: done.success && done.data.stopped,
      });
      return done.success
        ? { success: true, data: done.data }
        : { success: false, error: { kind: 'refused', because: whatItSaid(done.error) } };
    },

    async helperTrail(task, call) {
      await loaded;
      const conversation = lodgers[task];
      if (!conversation) return { success: false, error: { kind: 'no-such-task' } };
      const session = sessionFor(task, conversation);
      if (!session) return { success: true, data: null };
      return { success: true, data: await helperTrail(session, call, wheres.get(task)) };
    },

    evict,
    rest,

    async draft(task) {
      await loaded;
      return drafts[task] ?? '';
    },

    async setDraft(task, text) {
      await loaded;
      if (text) drafts = { ...drafts, [task]: text };
      else {
        drafts = { ...drafts };
        delete drafts[task];
      }
      await store.set(DRAFTS_KEY, drafts as unknown as never);
    },

    async dispose() {
      clearInterval(sweep);
      await Promise.all([...houses.values()].map((house) => house.dispose()));
      houses.clear();
      await Promise.all([index.dispose(), kits.dispose()]);
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
  /** The turn that was called off, until it says it has stopped. */
  private hushed: string | undefined;
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
  /**
   * Everything said in here with the time Claude itself wrote it down, read
   * off Claude's own transcript. It is the only clock anything said before
   * the village was looking can have, and it survives a restart, which the
   * village's own `seen` does not.
   */
  private dated: Dated[] = [];
  private datedSize = -1;
  private dating = false;
  /* Whether the village has watched this conversation move. */
  private watching = false;
  /* Whether a wake is reading this session's history back in right now. */
  private wakingUp = false;
  /* Whoever is waiting to hear the session has got past starting. */
  private past = new Set<() => void>();
  /** The last thing said to this session, for "try again" and the scheduled
   *  continue to say again. */
  private lastSent: string | undefined;
  /** When a continue is scheduled to send itself, or null. */
  private carryOnAt: number | null = null;
  private carryOnTimer: ReturnType<typeof setTimeout> | undefined;
  /** Marks on a multi-select question, one pick per pending request, kept
   *  until `finishAsking` sends them or the question itself moves on. */
  private marked = new Map<string, string>();

  constructor(
    private readonly task: string,
    private readonly runtimes: MenderRuntimes,
    private readonly moved: () => void,
    /** Where this session's checkout is, when anybody has said. */
    private readonly where: () => string | undefined,
    /** Everything it has ever made, with whatever was just found folded in. */
    private readonly keep: (found: readonly Made[]) => Made[],
    /** Anything at all moved, which is when its lantern might say otherwise. */
    private readonly touched: () => void = () => {},
    /** Claude's own id for this conversation, when it is a Claude one. */
    private readonly claude: () => string | null = () => null
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
          if (this.started()) for (const hear of [...this.past]) hear();
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
    await this.readBack();
    await this.redate();
  }

  /** Reads Claude's own record of this conversation again, if it has grown. */
  private async redate(): Promise<void> {
    const session = this.claude();
    if (!session || this.dating) return;
    this.dating = true;
    try {
      if ((await sizeOf(session)) === this.datedSize) return;
      const read = await readDated(session);
      if (!read) return;
      this.dated = read.dated;
      this.datedSize = read.size;
      this.publish();
    } finally {
      this.dating = false;
    }
  }

  /**
   * Everything said in here before the village was looking, read whole.
   *
   * A suspended session has none to give — its history lives with the running
   * process — so this is best effort, and a wake calls it again once the agent
   * has read its past back in. It has to: that replay goes by in a burst, and
   * the active turn is only ever glimpsed on the way past, usually the moment
   * your line opened it and before any of the answer arrived. The committed
   * turn is the whole of it, so it replaces whatever glimpse was kept.
   */
  async readBack(): Promise<void> {
    const conversation = this.conversation;
    if (!conversation) return;
    const back = await this.runtimes.acp.loadHistory({
      conversationId: conversation,
      limit: BACKWARD,
    });
    if (this.conversation !== conversation) return;
    if (!back.success || !back.data || back.data.unavailable || !back.data.turns.length) return;
    const whole = new Map(back.data.turns.map((turn) => [turn.id, turn]));
    const live = this.live?.id;
    this.before = [
      ...back.data.turns.filter((turn) => turn.id !== live),
      ...this.before.filter((had) => !whole.has(had.id)),
    ]
      .sort((a, b) => a.seq - b.seq)
      .slice(-BACKWARD);
    this.seedSeen();
    this.publish();
    void this.redate();
  }

  /**
   * Marks whatever is already on the turns as seen, without dating it.
   *
   * Called right before the first time a batch of turns is published, so that
   * `read()`'s own stamping only ever dates items that are genuinely new from
   * here on — the ones that arrive while somebody is watching.
   */
  private seedSeen(): void {
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
   * The protocol carries no clock, so the only time anything here has is when
   * the village noticed it. That is the truth for something happening while
   * you watch and a lie for everything else: a session comes back with its
   * whole history, and stamping that now would have a week-old conversation
   * say it was this minute, which is worse than saying nothing.
   *
   * So nothing is dated until you have said something. An agent picking up
   * where it left off sends its whole transcript back the moment you walk in,
   * on turns it never marks finished, so neither "was it already over" nor
   * "had we published yet" can tell that from something happening. What can is
   * you: once you have spoken to it, everything after that is in front of you.
   * A turn that was already finished when this house first saw it is history
   * either way. Nought is the honest answer to when, and the board says so in
   * words rather than putting a time on it.
   */
  private time(id: string, over: boolean): number {
    const had = this.seen.get(id);
    if (had !== undefined) return had;
    const at = this.watching && !over ? Date.now() : 0;
    this.seen.set(id, at);
    return at;
  }

  /** You said something, so from here on this house is watching time pass. */
  watched(): void {
    this.watching = true;
  }

  /** Whether an agent is already running in here. */
  awake(): boolean {
    const now = this.lifecycle;
    return Boolean(now && !now.suspended && now.lifecycle !== 'closed');
  }

  /** A wake has started reading this session back in, or has finished. */
  waking(on: boolean): void {
    if (this.wakingUp === on) return;
    this.wakingUp = on;
    this.publish();
  }

  private started(): boolean {
    const now = this.lifecycle?.lifecycle;
    return now !== undefined && now !== 'starting' && now !== 'replaying' && now !== 'closed';
  }

  /** Resolves once the session says it is past starting, or after `ms` regardless. */
  pastStarting(ms: number): Promise<void> {
    if (this.started()) return Promise.resolve();
    return new Promise((done) => {
      const hear = (): void => {
        clearTimeout(timer);
        this.past.delete(hear);
        done();
      };
      const timer = setTimeout(hear, ms);
      this.past.add(hear);
    });
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
    log.warn('agents: broke', { area: 'agents', task: this.task, because });
    this.trouble = because;
    this.publish();
  }

  /** The last thing said to this session, for "try again" and a scheduled
   *  continue to say again — set every time something actually goes out. */
  sent(text: string): void {
    this.lastSent = text;
  }

  retryText(): string | undefined {
    return this.lastSent;
  }

  currentResetAt(): number | undefined {
    return this.lifecycle?.failure?.resetAt;
  }

  /** Called off, and waiting for the turn to say it has stopped. */
  hushing(on: boolean): void {
    const turn = on && this.live && !this.live.outcome ? this.live.id : undefined;
    if (this.hushed === turn) return;
    this.hushed = turn;
    this.publish();
  }

  /** Arms or disarms the scheduled continue; the board reads this back as
   *  `WorkingState.carryOn`. */
  carryOn(at: number | null): void {
    if (this.carryOnAt === at) return;
    this.carryOnAt = at;
    this.publish();
  }

  async dispose(): Promise<void> {
    const going = this.replicas;
    this.replicas = [];
    this.seen.clear();
    // So settling on a conversation again, even the same one, hooks back up.
    this.conversation = undefined;
    await Promise.all(going.map((replica) => replica.dispose()));
  }

  private turned(turn: TranscriptTurn | null | undefined): void {
    const now = turn ?? null;
    // A turn that settled and was replaced moves behind the one in flight; the
    // active state only ever carries the latest.
    if (this.live && (!now || now.id !== this.live.id)) {
      this.before = [...this.before, this.live].slice(-BACKWARD);
      void this.redate();
      /* The copy held here is the last one seen in flight, and the turn only
         learns how it ended as it is committed, so it is read back settled:
         without this a turn you stopped looked no different from one that
         finished, and the note it answered never read as answered. */
      void this.readBack();
    }
    this.live = now;
  }

  private publish(): void {
    const was = peek(this.state);
    const next = this.read();
    this.state.set(next);
    if (was.mood !== next.mood) {
      log.info('agents: mood', {
        area: 'agents',
        task: this.task,
        conversation: this.conversation,
        from: was.mood,
        to: next.mood,
        doing: next.doing,
        lifecycle: this.lifecycle?.lifecycle,
        generating: this.lifecycle?.isGenerating,
        failure: this.lifecycle?.failure ?? undefined,
        queued: this.lifecycle?.queuedPrompts?.length,
      });
      this.moved();
    }
    this.touched();
  }

  /** What its lantern says beyond its mood. */
  glance(): Glance {
    const state = peek(this.state);
    const glance: Glance = {};
    if (state.mood === 'working') {
      const began = state.told.notes[0]?.at;
      if (began) glance.since = began;
      const deeds = state.told.deeds;
      for (let i = deeds.length - 1; i >= 0; i--) {
        const deed = deeds[i]!;
        if (deed.running) {
          glance.tool = deed.tool;
          break;
        }
      }
    }
    const failure = this.lifecycle?.failure;
    if (failure && state.mood === 'resting' && bankable(failure.category)) {
      glance.waiting = {
        kind: failure.category as 'limit' | 'service' | 'connection',
        ...(failure.resetAt !== undefined ? { resetAt: failure.resetAt } : {}),
      };
    }
    if (failure && state.mood === 'hurt' && failure.category === 'access') glance.signIn = true;
    return glance;
  }

  /** Mark, or unmark, a pick on a multi-select question. */
  mark(requestId: string, optionId: string): void {
    if (this.marked.get(requestId) === optionId) this.marked.delete(requestId);
    else this.marked.set(requestId, optionId);
    this.publish();
  }

  /** Every mark on the question right now, one per pending request. */
  picks(): { requestId: string; optionId: string }[] {
    return [...this.marked.entries()].map(([requestId, optionId]) => ({ requestId, optionId }));
  }

  clearPicks(): void {
    this.marked.clear();
  }

  private read(): WorkingState {
    if (!this.conversation) return EMPTY;
    const turns = this.live ? [...this.before, this.live] : this.before;
    const lines = linesOf(turns, this.where()).slice(-KEPT);
    const pending = this.lifecycle?.pendingPermissions ?? [];
    /* A mark against a question that has moved on — answered elsewhere,
       cancelled, the turn replaced — is stale and never sent. */
    for (const requestId of this.marked.keys()) {
      if (!pending.some((request) => request.requestId === requestId))
        this.marked.delete(requestId);
    }
    const asking = askOf(pending, this.where(), this.marked);
    const failure = this.lifecycle?.failure ?? null;
    const mood = moodOf(this.lifecycle, asking, this.trouble, failure);
    return {
      mood,
      doing: this.trouble ?? (failure ? failureDoing(failure) : doingOf(mood, this.live)),
      lines,
      told: {
        ...toldOf(turns, this.where(), (id, over) => this.time(id, over), clockOf(this.dated)),
        ...(this.hushed && this.live?.id === this.hushed && !this.live.outcome
          ? { stopping: true }
          : {}),
        made: madeOf(
          this.keep(madeIn(turns, (id, over) => this.time(id, over), this.live?.id)),
          this.where()
        ),
      },
      asking,
      plan: stepsOf(this.plan),
      queued: waitingOf(this.lifecycle),
      room: roomOf(this.usage),
      cost: costOf(this.usage),
      /* Mid-retry it is a line on the fire, not a board of ways out of it. */
      failure:
        !this.trouble && failure && mood !== 'working'
          ? failureViewOf(failure, bankable(failure.category))
          : null,
      carryOn: this.carryOnAt,
      ...(this.wakingUp ? { waking: true as const } : {}),
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

function glancesOf(houses: Map<string, House>): Record<string, Glance> {
  const glances: Record<string, Glance> = {};
  for (const [task, house] of houses) {
    const glance = house.glance();
    if (Object.keys(glance).length) glances[task] = glance;
  }
  return glances;
}

function moodOf(
  lifecycle: SessionState | undefined,
  asking: Ask | null,
  trouble: string | undefined,
  failure: SessionFailure | null
): Mood {
  if (trouble) return 'hurt';
  if (!lifecycle) return 'arriving';
  /* A limit, an overload, or a lost connection is somebody who has stopped
     and is standing at the gate — the fire banked, not out — because there is
     a real next move (wait, retry, start again) rather than something broken
     to go and fix. Sign-in and a request the agent flatly would not make are
     the ones that stay sore. */
  /* A warning mid-turn is the agent retrying under its own steam; it is still
     working, and banking the fire over it invites a second copy of the prompt. */
  const retrying = failure?.severity === 'warning' && lifecycle.isGenerating;
  if (failure && !retrying) return bankable(failure.category) ? 'resting' : 'hurt';
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

/** A typed failure that has somewhere to go once it lifts — a wait, a retry, a
 *  new session — rather than something that needs fixing before anything can
 *  go on. */
function bankable(category: SessionFailure['category']): boolean {
  return category === 'limit' || category === 'service' || category === 'connection';
}

/** The doing-line for a typed session failure, said the way the fire itself
 *  would say it — what kind of wait it is, and when it lifts, in local time. */
function failureDoing(failure: SessionFailure): string {
  const resets = failure.resetAt ? ` · resets ${localClock(failure.resetAt)}` : '';
  if (failure.severity === 'warning' && failure.category === 'connection')
    return 'the line to the agent dropped, and it is trying again.';
  if (failure.severity === 'warning' && failure.category === 'service')
    return `a rough patch at the other end, and it is trying again${resets}`;
  switch (failure.category) {
    case 'limit':
      return `waiting out a limit${resets}`;
    case 'service':
      return `waiting out a rough patch at the other end${resets}`;
    case 'connection':
      return `lost its way back to the agent${resets}`;
    case 'access':
      return 'it cannot go on until you sign it in.';
    default:
      return sentence(failure.title);
  }
}

/**
 * What the board offers about a typed failure, over the wire.
 *
 * `canRetry` is Mender's own read of whether an immediate try-again is worth
 * offering, not a copy of the AIR extension's action list: a plain usage
 * limit carries no actions at all, since retrying it immediately would only
 * fail again the same way, so a limit only ever offers the scheduled
 * "carry on when it lifts" (when a reset time is known) and starting over —
 * never an immediate retry.
 */
function failureViewOf(failure: SessionFailure, bankable: boolean): Failure {
  return {
    bankable,
    doing: failureDoing(failure),
    canRetry: bankable && (failure.category === 'service' || failure.category === 'connection'),
    ...(failure.resetAt !== undefined ? { resetAt: failure.resetAt } : {}),
  };
}

/** A clock time in this machine's own zone, said the way the village talks:
 *  lower case, no leading zero, no space before am/pm. */
function localClock(at: number): string {
  return new Date(at)
    .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    .toLowerCase()
    .replace(/\s+/g, '');
}

/** The agent's own words, read as a sentence rather than a heading. */
function sentence(said: string): string {
  const trimmed = said.trim();
  const lower = /^[A-Z][a-z]/.test(trimmed)
    ? `${trimmed[0]?.toLowerCase()}${trimmed.slice(1)}`
    : trimmed;
  return /[.!?]$/.test(lower) ? lower : `${lower}.`;
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

/** What it has cost so far, straight off the provider's own report. */
function costOf(usage: SessionUsage | null): { amount: number; currency: string } | null {
  return usage?.cost ?? null;
}

function askOf(
  requests: readonly AcpPermissionRequest[],
  root: string | undefined,
  marked: ReadonlyMap<string, string>
): Ask | null {
  if (requests.length === 0) return null;
  if (requests.length === 1) {
    const request = requests[0];
    return {
      requestId: request.requestId,
      text: deedOf(request.toolCall, root),
      options: request.options.map((option) => ({
        optionId: option.optionId,
        name: option.name.toLowerCase(),
      })),
    };
  }
  /* Several things are asking at once: every option says which question it
     answers, and whether it is marked, so the board can hold them all open
     until "that's everything" sends them together. */
  return {
    requestId: requests[0].requestId,
    text: `${requests.length} things are asking.`,
    multi: true,
    options: requests.flatMap((request) =>
      request.options.map((option) => ({
        optionId: option.optionId,
        name: `${deedOf(request.toolCall, root)} — ${option.name.toLowerCase()}`,
        requestId: request.requestId,
        picked: marked.get(request.requestId) === option.optionId,
      }))
    ),
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
  stamp: (id: string, over: boolean) => number,
  /** When Claude's own transcript says something was said, or 0. */
  dated: (who: 'you' | 'it', text: string) => number = () => 0
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
    if (item.kind === 'said' || item.kind === 'ended') saidSince = true;
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
      /* Asked of the transcript even when the village has its own time, so
         the walk through it stays in step with the board. */
      const known = dated('you', item.text);
      const at = stamp(item.id, item.hasOutcome) || known;
      earliest(at);
      notes.push({
        id: item.id,
        said: item.text,
        at,
        answered: answered[i],
        turn: item.turn,
        ...(item.pictures ? { pictures: item.pictures } : {}),
      });
    } else if (item.kind === 'said') {
      const known = dated('it', item.text);
      const at = stamp(item.id, item.hasOutcome) || known;
      earliest(at);
      /* The last thing said in a turn that broke is the agent saying why, and
         a limit is said in so many words whether or not the turn noticed. */
      const last = flat[i + 1]?.turn !== item.turn;
      const trouble =
        limited(item.text) || (last && item.broke)
          ? 'wrong'
          : aside(item.text.trim())
            ? 'aside'
            : undefined;
      thoughts.push({
        id: item.id,
        said: item.text,
        at,
        turn: item.turn,
        ...(trouble ? { trouble } : {}),
      });
    } else if (item.kind === 'ended') {
      thoughts.push({
        id: item.id,
        said: item.said,
        at: stamp(item.id, true),
        turn: item.turn,
        trouble: item.trouble,
      });
    } else if (item.kind === 'thinking') {
      earliest(item.item.startedAt);
      thoughts.push({
        id: item.item.id,
        said: item.item.text.trim(),
        at: item.item.startedAt,
        turn: item.turn,
        quiet: true,
        ...(item.item.status === 'thinking' ? { since: item.item.startedAt } : {}),
      });
    } else {
      toldFrom(item.node, item.hasOutcome, root, stamp, earliest, deeds, errands, written);
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
    made: [],
    turns: turns.length,
    began,
    ...endedOf(turns.at(-1)?.outcome, flat.at(-1)),
  };
}

/** How the newest turn came to rest, in the three ways the board says it. */
function endedOf(
  outcome: TranscriptTurn['outcome'],
  last: Flat | undefined
): { ended?: 'done' | 'stopped' | 'broke' } {
  /* History read back never says how a turn ended, but a stop it wrote
     down as words still does. */
  if (!outcome)
    return last?.kind === 'ended' && last.trouble === 'stopped' ? { ended: 'stopped' } : {};
  if (outcome.kind === 'done') return { ended: 'done' };
  if (outcome.kind === 'cancelled') return { ended: 'stopped' };
  if (outcome.kind === 'interrupted' && outcome.reason === 'replaced') return { ended: 'stopped' };
  return { ended: 'broke' };
}

/** One chronological item, flattened out of the turn/message/tool tree. */
type Flat = (
  | { kind: 'note'; id: string; text: string; hasOutcome: boolean; pictures: number }
  | { kind: 'said'; id: string; text: string; hasOutcome: boolean; broke: boolean }
  | { kind: 'thinking'; item: TranscriptThinking }
  | { kind: 'tool'; node: ToolNode; hasOutcome: boolean }
  /** A turn that ended badly without the agent saying why, said for it. */
  | { kind: 'ended'; id: string; said: string; trouble: 'wrong' | 'warn' | 'stopped' }
) & { turn: number };

/** How Claude's own transcript writes down a turn you stopped. */
const INTERRUPTED = /^\[Request interrupted by user[^\]]*\]$/;

function flatten(turns: readonly TranscriptTurn[]): Flat[] {
  const flat: Flat[] = [];
  turns.forEach((turn, at) => {
    const hasOutcome = turn.outcome !== undefined;
    const broke = turn.outcome?.kind === 'error';
    let saidLast = false;
    for (const item of turn.items) {
      if (item.kind === 'message') {
        const text = item.text.trim();
        const pictures = item.role === 'user' ? (item.attachments?.length ?? 0) : 0;
        if (!text && !pictures) continue;
        /* Claude's own transcript writes a stop down as if you had said it,
           and the next resume answers it; read back, that is you stopped
           it there, said over what you had asked, and nothing else. */
        if (item.role === 'user' && INTERRUPTED.test(text)) {
          const since = flat.length - [...flat].reverse().findIndex((one) => one.kind === 'note');
          const asked = flat[since - 1];
          const spoke =
            since <= flat.length && flat.slice(since).some((one) => one.kind === 'said');
          flat.push({
            kind: 'ended',
            id: `${item.id}:stopped`,
            said: spoke
              ? 'Partway through what it was saying.'
              : 'Before it had said anything back.',
            trouble: 'stopped',
            turn: asked?.turn ?? at,
          });
          continue;
        }
        if (item.role !== 'user' && text === 'No response requested.') continue;
        flat.push(
          item.role === 'user'
            ? { kind: 'note', id: item.id, text, hasOutcome, pictures, turn: at }
            : { kind: 'said', id: item.id, text, hasOutcome, broke, turn: at }
        );
        saidLast = item.role !== 'user';
      } else if (item.kind === 'thinking') {
        if (item.text.trim()) flat.push({ kind: 'thinking', item, turn: at });
        saidLast = false;
      } else {
        flat.push({ kind: 'tool', node: item, hasOutcome, turn: at });
        saidLast = false;
      }
    }
    const ended = endedBadly(turn.outcome);
    if (ended && !(broke && saidLast)) {
      flat.push({ kind: 'ended', id: `${turn.id}:ended`, ...ended, turn: at });
    }
    /* Called off before it said a word back, there is no answer for the
       heading to say so over, so it is said on its own. */
    const answered = turn.items.some(
      (item) => item.kind === 'message' && item.role !== 'user' && item.text.trim()
    );
    if (turn.outcome?.kind === 'cancelled' && !answered) {
      flat.push({
        kind: 'ended',
        id: `${turn.id}:stopped`,
        said: 'Before it had said anything back.',
        trouble: 'stopped',
        turn: at,
      });
    }
  });
  return flat;
}

/**
 * What the Claude CLI says, word for word, when the account has run out.
 *
 * Copied from the Agent SDK's own list, which is how the ACP adapter tells a
 * limit from an answer. Without the session-failure capability the adapter
 * hands it over as ordinary talk, so this is the only way it reads as trouble.
 */
const LIMITS = [
  "You've hit your",
  "You've reached your",
  "You're out of usage credits",
  'Your org is out of usage · add funds to continue',
  'Your org is out of usage · contact your admin',
  "Your seat type doesn't include usage credits",
  "Your seat type doesn't include usage",
  'Your usage allocation has been disabled by your admin',
  "Your group's usage limit is set to $0",
  'Fable 5 requires usage credits',
  "You're out of extra usage",
  "Your seat type doesn't include extra usage",
];

function limited(text: string): boolean {
  return text.length < 400 && LIMITS.some((one) => text.startsWith(one));
}

/**
 * What Claude's adapter says in its own voice rather than the agent's: a mode
 * or a model it could not give you, a task somebody stopped. It arrives as an
 * ordinary message with a stressed lead, so this is the only way it reads as a
 * warning rather than as the answer.
 */
const ASIDES = [
  '**Auto mode unavailable:**',
  '**Model fallback:**',
  '**Fast mode turned off:**',
  '**Task stopped by user:**',
];

function aside(text: string): boolean {
  return text.length < 600 && ASIDES.some((one) => text.startsWith(one));
}

/** A turn's ending, when it is one worth saying on the board. */
function endedBadly(
  outcome: TranscriptTurn['outcome']
): { said: string; trouble: 'wrong' | 'warn' } | null {
  if (!outcome) return null;
  if (outcome.kind === 'error') {
    switch (outcome.reason) {
      case 'process_closed':
        return { said: 'The agent went away in the middle of it.', trouble: 'wrong' };
      case 'spawn_failed':
      case 'initialize_failed':
      case 'new_session_failed':
      case 'load_session_failed':
        return { said: 'The agent would not start.', trouble: 'wrong' };
      default:
        return { said: 'It broke off without saying why.', trouble: 'wrong' };
    }
  }
  if (outcome.kind === 'done' && outcome.reason === 'refusal') {
    return { said: 'It would not do that.', trouble: 'wrong' };
  }
  if (outcome.kind === 'done' && outcome.reason === 'max_tokens') {
    return { said: 'It ran out of room to answer and stopped short.', trouble: 'warn' };
  }
  if (outcome.kind === 'done' && outcome.reason === 'max_turn_requests') {
    return {
      said: 'It reached how far it is allowed to go in one turn and stopped.',
      trouble: 'warn',
    };
  }
  if (outcome.kind === 'interrupted' && outcome.reason === 'process_closed') {
    return { said: 'The agent went away in the middle of it.', trouble: 'wrong' };
  }
  return null;
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
  over: boolean,
  root: string | undefined,
  stamp: (id: string, over: boolean) => number,
  earliest: (at: number) => void,
  deeds: Deed[],
  errands: Errand[],
  written: Wrote[]
): void {
  if (node.kind === 'tool-group') {
    for (const child of node.children)
      toldFrom(child, over, root, stamp, earliest, deeds, errands, written);
    return;
  }

  const at = stamp(node.id, over);
  earliest(at);

  if (node.kind === 'spawn-subagent-tool-call') {
    /* What they did out there is theirs, not this session's, so it is folded
       into their own list and nowhere else. The cart is still the session's:
       a file a helper wrote is a file this session wrote. */
    const steps: Deed[] = [];
    for (const child of node.children ?? [])
      toldFrom(child, over, root, stamp, earliest, steps, errands, written);
    errands.push({
      id: node.id,
      errand: node.inputSummary ?? node.name,
      running: node.status === 'running',
      ...(at ? { since: at } : {}),
      call: node.toolCallId,
      ...(node.background ? { background: true } : {}),
      ...(node.status === 'error' ? { wrong: true } : {}),
      steps: steps.slice(-KEPT),
    });
    return;
  }

  let note: string | undefined;
  let diff: string[] | undefined;
  let diffMore: number | undefined;
  let path: string | undefined;
  if (node.kind === 'create-file-tool-call') {
    const added = node.content ? node.content.split('\n').length : 0;
    if (added) note = `${added} line${added === 1 ? '' : 's'}`;
    written.push({ path: node.path, at, added, gone: 0 });
    path = inCheckout(node.path, root);
    const lines = (node.content ?? '').split('\n').map((line) => `+${line}`);
    if (lines.length) {
      diff = lines.slice(0, STEP_DIFF);
      if (lines.length > STEP_DIFF) diffMore = lines.length - STEP_DIFF;
    }
  } else if (node.kind === 'modify-file-tool-call') {
    const changed = changes(node.oldText, node.newText);
    const added = changed.filter((line) => line.startsWith('+')).length;
    const gone = changed.filter((line) => line.startsWith('-')).length;
    if (added || gone) note = `+${added} −${gone}`;
    written.push({ path: node.path, at, added, gone });
    path = inCheckout(node.path, root);
    if (changed.length) {
      diff = changed.slice(0, STEP_DIFF);
      if (changed.length > STEP_DIFF) diffMore = changed.length - STEP_DIFF;
    }
  } else if (node.kind === 'search-tool-call' && node.matchCount !== undefined) {
    note = `${node.matchCount} match${node.matchCount === 1 ? '' : 'es'}`;
  }

  deeds.push({
    id: node.id,
    did: deedOf(node, root),
    ...(node.kind === 'execute-tool-call' && node.inputSummary?.trim()
      ? { why: lower(node.inputSummary.trim()) }
      : {}),
    note,
    tool: node.kind,
    running: node.status === 'running',
    ...(node.status === 'error' ? { wrong: true } : {}),
    ...(path ? { path } : {}),
    ...(diff ? { diff } : {}),
    ...(diffMore ? { diffMore } : {}),
  });

  for (const child of node.children ?? []) {
    toldFrom(child, over, root, stamp, earliest, deeds, errands, written);
  }
}

function lower(said: string): string {
  return said.charAt(0).toLowerCase() + said.slice(1);
}

/** What it made that is still there, with where each is inside the checkout. */
function madeOf(made: readonly Made[], root: string | undefined): Made[] {
  return stillThere(made).map((one) => {
    const at = one.path ? inCheckout(one.path, root) : undefined;
    return at ? { ...one, inside: at } : one;
  });
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
/** As many marked lines of a file edit as belong right under the step itself. */
const STEP_DIFF = 6;

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
  /* Outside the checkout, a scratch file the agent's own tooling wrote is a
     long run of temp folders and ids ending in the one name that says
     anything, and a file under home reads the way anybody would say it. */
  if (/^\/(private\/)?(tmp|var\/folders)\//.test(path)) return path.split('/').at(-1) || path;
  const home = homedir();
  if (home && path.startsWith(`${home}/`)) return `~${path.slice(home.length)}`;
  return path;
}

/**
 * A file's path, relative to the checkout, for the one thing that has to send
 * a path back across the wire rather than just say it: opening the change
 * itself needs the same root-relative shape the checkout board's own files
 * use, and an absolute path is never in the checkout as far as that board is
 * concerned, so a step outside a known root offers no such open at all.
 */
function inCheckout(path: string, root: string | undefined): string | undefined {
  if (!root || !path.startsWith(root)) return undefined;
  const rest = path.slice(root.length).replace(/^[/\\]+/, '');
  return rest || undefined;
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
