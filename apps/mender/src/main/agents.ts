import { open } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createJsonFileKeyValueStore } from '@emdash/core/primitives/kv/node';
import type {
  AcpPermissionRequest,
  PlanState,
  RateLimit,
  SessionFailure,
  SessionState,
  SessionUsage,
  ToolNode,
  TranscriptThinking,
  TranscriptTurn,
  AttachmentRef,
} from '@emdash/core/runtimes/acp/api';
import type { ConversationRecords } from '@emdash/core/runtimes/conversations/api';
import { hostDependenciesContract } from '@emdash/core/services/host-dependencies/api';
import { pluginRegistry } from '@emdash/plugins/agents';
import { log } from '@emdash/shared/logger';
import { createLiveJobReplicaCache, LiveJobFailedError, ReplicaState } from '@emdash/wire/live';
import type { WireFile } from '@emdash/wire/rpc';
import { cell, observe, peek, type Cell } from '@emdash/wire/state';
import { createScope } from '@emdash/shared/concurrency';
import { isDear } from '@shared/hungry';
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
import { carried, packExpect, piecesOf, USUAL_PACK } from '@shared/packing';
import { wantsAnswer } from './asked-you';
import { forgetClaudeSession } from './claude-cli-history';
import { clockOf, readDated, sizeOf, type Dated } from './claude-clock';
import { goingIn, pickUpNote, PICK_UP_SAID, type CutOff } from './cut-off';
import { questionsOf, type FormQuestion, type FormValue } from './form';
import {
  helperTrail,
  holdAway,
  isAway,
  sendAway,
  ranOf,
  tokensOf,
  type HelperTrail,
} from './helper-trail';
import { keptFailure } from './kept-failure';
import { resetFrom } from './limit-clock';
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
  tell(task: string, text: string, carrying?: readonly Carried[], hidden?: string): Promise<Told>;
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
  /** `untouched` calls it off only when nothing has come of what it was asked,
   *  and otherwise leaves it working and says so with `going`. */
  hush(
    task: string,
    untouched?: boolean,
    /** Stop it without handing what it was asked back to the line, so it can
     *  be told to carry on with the same thing. */
    keep?: boolean
  ): Promise<
    | { success: true; data: { back?: string; pictures?: Returned[]; going?: boolean } }
    | { success: false; error: TellError }
  >;
  /** Stop one helper it sent out, leaving the session and the turn alone. */
  recall(
    task: string,
    call: string
  ): Promise<{ success: true; data: { stopped: boolean } } | { success: false; error: TellError }>;
  /** Stop a helper if they are still out, and take them off the yard for good. */
  sendAway(
    task: string,
    call: string
  ): Promise<{ success: true; data: void } | { success: false; error: TellError }>;
  /** The last of what a background command has printed, read off its own output file. */
  commandTail(
    task: string,
    call: string
  ): Promise<{ success: true; data: string | null } | { success: false; error: TellError }>;
  /** What a helper did and said, read off Claude's own record of them. */
  helperTrail(
    task: string,
    call: string
  ): Promise<{ success: true; data: HelperTrail | null } | { success: false; error: TellError }>;
  /** Have it go again at the last thing said, without saying it again: on
   *  where it was cut off, or afresh at one it already answered. */
  retryFailure(task: string): Promise<Told>;
  /** Schedule that same go-again to send itself once a typed failure's
   *  reset time comes. */
  waitOutFailure(task: string): Promise<Told>;
  /** Disarm a scheduled continue. */
  stopWaiting(task: string): Promise<Told>;
  /** Leave this conversation behind and start a fresh one in its place. */
  startOver(task: string): Promise<Told>;
  /** Whoever is in there moves out with the building, and when `forget`,
      everything that was said in there goes with them. */
  evict(task: string, forget?: boolean): Promise<void>;
  /** Sends them home for the night: the process stops, everything else stays. */
  rest(task: string): Promise<Told>;
  /** Every building with a Claude in it, by Claude's own id for the conversation. */
  claudeSessions(): { task: string; session: string }[];
  /** What was half-written on this session's line, so it survives a restart. */
  draft(task: string): Promise<string>;
  setDraft(task: string, text: string): Promise<void>;
  /** The app is going: what is still going stays written down as it stands
      now, for the next sitting to pick back up, rather than as the shutdown
      leaves it. */
  closing(): void;
  dispose(): Promise<void>;
}

type TellError =
  | { kind: 'no-such-task' }
  | { kind: 'nothing' }
  | { kind: 'refused'; because: string };

type Told = { success: true; data: void } | { success: false; error: TellError };

type MovedIn = { success: true; data: string } | { success: false; error: TellError };

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
const RECAPS_KEY = 'recaps';
const TITLED_KEY = 'titledAt';
const AWAY_KEY = 'helpersAway';
const CUT_OFF_KEY = 'cutOff';
const CARRY_ON_KEY = 'carryOn';
const LIMITS_HIT_KEY = 'limitsHit';
const TAKEN_BACK_KEY = 'takenBack';

export function createAgents(
  runtimes: MenderRuntimes,
  tasks: Tasks,
  /** The windmill's own memory: who starts fresh, and what they last thought with. */
  settings: AppSettings,
  /** Where the subscription's meter goes when a session hears it in its answer. */
  windows: { report(limit: RateLimit): void } = { report: () => {} }
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
  /** The last recap each session was given, and the answer it was written under. */
  let recaps: Record<string, { said: string; after: string }> = {};
  /** Where each session stood when it was last named: how much had been
      said, and whether that turn had settled.
      Kept across a restart: forgotten, every session woken by the next
      sitting would be named afresh the moment it did anything, and the namer
      seldom says the same thing twice. */
  const titledAt = new Map<string, { said: number; settled: boolean }>();
  /** Woken with a name from a sitting before where it was named was kept:
      wherever it stands when it next works is taken as where it was named,
      so waking it is not on its own a reason to name it again. */
  const namedBefore = new Set<string>();
  const keepTitled = (): void =>
    void store.set(TITLED_KEY, Object.fromEntries(titledAt) as unknown as never);
  /** What was still going in each session when the last sitting ended. */
  let leftGoing: Record<string, CutOff> = {};
  /** Continues armed to send themselves once a limit lifts, so a restart
      does not quietly disarm them. */
  let carryOns: Record<string, { at: number }> = {};
  /** When each failure was first seen, by its id, so a limit read back after
      a restart still knows which morning it was hit on. */
  let limitsHit: Record<string, number> = {};
  let hitLoaded = false;
  /** What was said and called off before anything came of it, by task. It
      went back on the line, so the post never shows it, restart included. */
  let takenBack: Record<string, string[]> = {};
  const loaded = (async () => {
    const held = await store.get(KEY);
    if (held.success && held.data && typeof held.data === 'object') {
      lodgers = held.data as unknown as Record<string, string>;
    }
    const heldAway = await store.get(AWAY_KEY);
    holdAway(
      heldAway.success && Array.isArray(heldAway.data) ? (heldAway.data as string[]) : [],
      (calls) => void store.set(AWAY_KEY, calls as unknown as never)
    );
    const heldDrafts = await store.get(DRAFTS_KEY);
    if (heldDrafts.success && heldDrafts.data && typeof heldDrafts.data === 'object') {
      drafts = heldDrafts.data as unknown as Record<string, string>;
    }
    const heldMade = await store.get(MADE_KEY);
    if (heldMade.success && heldMade.data && typeof heldMade.data === 'object') {
      madeBy = heldMade.data as unknown as Record<string, Made[]>;
    }
    madeLoaded = true;
    const heldRecaps = await store.get(RECAPS_KEY);
    if (heldRecaps.success && heldRecaps.data && typeof heldRecaps.data === 'object') {
      recaps = heldRecaps.data as unknown as Record<string, { said: string; after: string }>;
    }
    const heldTitled = await store.get(TITLED_KEY);
    if (heldTitled.success && heldTitled.data && typeof heldTitled.data === 'object') {
      const each = heldTitled.data as unknown as Record<string, { said: number; settled: boolean }>;
      for (const [task, at] of Object.entries(each)) if (!titledAt.has(task)) titledAt.set(task, at);
    }
    const heldCut = await store.get(CUT_OFF_KEY);
    if (heldCut.success && heldCut.data && typeof heldCut.data === 'object') {
      leftGoing = heldCut.data as unknown as Record<string, CutOff>;
    }
    const heldBack = await store.get(TAKEN_BACK_KEY);
    if (heldBack.success && heldBack.data && typeof heldBack.data === 'object') {
      takenBack = heldBack.data as unknown as Record<string, string[]>;
    }
    const heldCarry = await store.get(CARRY_ON_KEY);
    if (heldCarry.success && heldCarry.data && typeof heldCarry.data === 'object') {
      carryOns = heldCarry.data as unknown as Record<string, { at: number }>;
    }
    const heldHit = await store.get(LIMITS_HIT_KEY);
    if (heldHit.success && heldHit.data && typeof heldHit.data === 'object') {
      limitsHit = heldHit.data as unknown as Record<string, number>;
    }
    hitLoaded = true;
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
  /* Finished a turn and nobody has opened it or said anything since: its
     lantern is green for exactly that, so it is not idle and stays up. */
  const unlooked = new Set<string>();
  const was = new Map<string, Mood>();
  /** Whether each session had a failure standing at its last change. */
  const failed = new Map<string, boolean>();
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
  /* What is going right now, written down on every change so that a close,
     or a crash, leaves it behind. Off until startup has read what the last
     sitting left, and off again once the app is closing, since the shutdown
     stopping everybody is exactly what it must not record. */
  let recording = false;
  /** Sessions being put back to work, kept written down until they are. */
  const pickingUp = new Map<string, CutOff>();
  let noted = '';
  const noteGoing = (): void => {
    if (!recording) return;
    const going: Record<string, CutOff> = Object.fromEntries(pickingUp);
    for (const [task, house] of houses) {
      if (!house.awake()) continue;
      const cut = goingIn(peek(house.state));
      if (cut) going[task] = cut;
    }
    const said = JSON.stringify(going);
    if (said === noted) return;
    noted = said;
    void store.set(CUT_OFF_KEY, going as unknown as never);
  };
  const reglance = (): void => {
    noteGoing();
    const next = glancesOf(houses);
    for (const task of houses.keys()) {
      if (!isDear(peek(kits.kit(task)))) continue;
      next[task] = { ...next[task], dear: true };
    }
    const said = JSON.stringify(next);
    if (said === glanced) return;
    glanced = said;
    glances.set(next);
  };
  /* Changing who works in a building empties it: a different agent is a
     different villager, not the same one with a new hat. */
  const kits = createKits(
    runtimes,
    tasks,
    async (task) => evict(task, await tasks.forgets(task)),
    settings
  );
  const kitScope = createScope();
  const kitWatched = new Set<string>();

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
    if (namedBefore.delete(task) && !titledAt.has(task)) {
      titledAt.set(task, { said, settled: state.mood === 'resting' });
      keepTitled();
      return;
    }
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
    keepTitled();
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
  /* Where it stands, for whoever comes back to it, written once each turn
     has finished. Only for a turn watched finishing this sitting, and only for
     one that did something: a two-line answer is its own recap. */
  const recapping = new Set<string>();
  const recappedDeeds = new Map<string, string>();
  const recapFromWork = (task: string, house: House): void => {
    const state = peek(house.state);
    /* What it had already done when this turn began, so only what it does in
       the turn counts as having done something. */
    if (state.mood === 'working' && !recappedDeeds.has(task))
      recappedDeeds.set(task, state.told.deeds.at(-1)?.id ?? '');
    if (!settled(state) || state.told.ended !== 'done' || !worked.has(task)) return;
    const answer = state.told.thoughts.filter((one) => !one.quiet).at(-1);
    if (!answer || recaps[task]?.after === answer.id || recapping.has(task)) return;
    /* Whether it did anything since the last one was looked at, which a
       short answer to a question does not. */
    const did = state.told.deeds.at(-1)?.id ?? '';
    const busy = (recappedDeeds.get(task) ?? '') !== did;
    recappedDeeds.set(task, did);
    if (!busy && answer.said.length < 400) return;
    recapping.add(task);
    void titler
      .recap(state.told)
      .then((said) => {
        if (!said) return log.warn('agents: recap came back empty', { area: 'agents', task });
        log.info('agents: recap', { area: 'agents', task, chars: said.length });
        recaps = { ...recaps, [task]: { said, after: answer.id } };
        void store.set(RECAPS_KEY, recaps as unknown as never);
        houses.get(task)?.refresh();
      })
      .finally(() => recapping.delete(task));
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
    /* What it thinks with is on its lantern, so a change of model is a
       change of glance. */
    if (!kitWatched.has(task)) {
      kitWatched.add(task);
      observe(kits.kit(task), () => reglance(), { scope: kitScope });
    }
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
          const mood = here ? peek(here.state).mood : undefined;
          const before = was.get(task);
          if (mood) was.set(task, mood);
          if (mood === 'resting' && (before === 'working' || before === 'asking'))
            unlooked.add(task);
          /* A limit that cleared, by a real answer after it, has nothing
             left for a continue armed against it to carry on from. */
          const failing = here?.failing() ?? false;
          if (failed.get(task) && !failing) stopWaiting(task);
          failed.set(task, failing);
          if (here) retitleFromWork(task, here);
        },
        () => wheres.get(task),
        (found) => keepMade(task, found),
        /* How a turn ended is written down a moment after the fire goes out,
           so the recap is looked for on every change rather than only then. */
        () => {
          reglance();
          const here = houses.get(task);
          if (here) recapFromWork(task, here);
        },
        () => {
          const conversation = lodgers[task];
          return conversation && records[conversation]?.provider === 'claude'
            ? sessionFor(task, conversation)
            : null;
        },
        () => recaps[task],
        (failure, live, written) => {
          const known = limitsHit[failure.id];
          const now = Date.now();
          /* A limit read back before its transcript has been, or before the
             store has, is not dated yet: saying now would stick. */
          if (!hitLoaded || (!live && written === undefined)) return known ?? now;
          /* Kept as the moment the village first saw it, before it read
             transcripts; the transcript is the truer clock. */
          if (known !== undefined && (written === undefined || written >= known - 60_000))
            return known;
          const at = written ?? now;
          limitsHit = Object.fromEntries(
            [...Object.entries(limitsHit), [failure.id, at] as const].slice(-60)
          );
          void store.set(LIMITS_HIT_KEY, limitsHit as unknown as never);
          /* A limit that cut a turn off carries on by itself once it lifts,
             the way Claude Code's own "continuing automatically at 11:20"
             does, without anybody having to ask for it. One read back after
             a restart does too, if it is from today rather than last week. */
          const recent = live || now - at < 12 * 3_600_000;
          if (recent && failure.category === 'limit' && failure.severity === 'error') {
            const lifts = failure.resetAt ?? resetFrom(liftText(failure), at);
            if (lifts !== undefined) {
              setTimeout(() => {
                /* A little past the minute it named, which is all Claude says. */
                /* A correction replaces whatever the wrong date armed. */
                const armed = carryOnTimers.get(task);
                if (armed && known === undefined) return;
                if (armed) clearTimeout(armed);
                armCarryOn(task, Math.max(lifts + 30_000, Date.now() + 60_000));
              }, 0);
            }
          }
          return at;
        },
        () => takenBack[task] ?? [],
        (limit) => windows.report(limit)
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

    /* Whoever was cut off by the last close goes back to work, and anything
       armed to carry on once a limit lifts is armed again. */
    for (const [task, cut] of Object.entries(leftGoing)) {
      if (alive.has(task) && lodgers[task]) pickingUp.set(task, cut);
    }
    recording = true;
    noteGoing();
    /* Which of Claude's own conversations each session is, or the pick-up
       starts a new one with none of what came before. */
    if (pickingUp.size) {
      await index.ready;
      records = index.current();
    }
    for (const [task, cut] of pickingUp) {
      log.info('agents: picking back up', {
        area: 'agents',
        task,
        mood: cut.mood,
        helpers: cut.helpers.length,
        unread: cut.unread.length,
      });
      /* A launch can fall over in the first seconds of a sitting for reasons
         that are gone a moment later, so a failed pick-up tries again rather
         than leaving the work stopped for him to find. Something said by
         hand in between ends it: the session has been told by then. */
      const pickUp = async (): Promise<void> => {
        for (const wait of [0, 3000, 10_000, 30_000]) {
          if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
          if (wait && peek(houseOf(task).state).mood !== 'hurt') return;
          const told = await doTell(task, PICK_UP_SAID, undefined, pickUpNote(cut));
          if (told.success) return;
          log.warn('agents: pick-up failed', { area: 'agents', task, attempt: wait });
        }
      };
      void pickUp().finally(() => {
        pickingUp.delete(task);
        noteGoing();
      });
    }
    for (const [task, { at }] of Object.entries(carryOns)) {
      if (alive.has(task)) armCarryOn(task, at);
      else forgetCarryOn(task);
    }
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
  /* Opening a board wakes a session at the same moment the first line or a
     resume can reach for it, and each finding nobody lodged would make its own
     conversation. So there is only ever one moving in per task. */
  const movingIn = new Map<string, Promise<MovedIn>>();
  const moveIn = (
    task: string,
    record: { agent?: string; path: string; title: string }
  ): Promise<MovedIn> => {
    const going = movingIn.get(task);
    if (going) return going;
    const it = moveInOnce(task, record).finally(() => movingIn.delete(task));
    movingIn.set(task, it);
    return it;
  };
  const moveInOnce = async (
    task: string,
    record: { agent?: string; path: string; title: string }
  ): Promise<MovedIn> => {
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
  const ok = (): Told => ({ success: true, data: undefined });
  /** A form whose last question is answered goes back to the agent whole. */
  const sendForm = async (
    conversationId: string,
    filled: { requestId: string; content: Record<string, FormValue> }
  ): Promise<Told> => {
    const done = await runtimes.acp.resolveElicitation({
      conversationId,
      requestId: filled.requestId,
      action: 'accept',
      content: filled.content,
    });
    return done.success ? ok() : refused(whatItSaid(done.error));
  };

  const evict = async (task: string, forget = false): Promise<void> => {
    await loaded;
    const conversation = lodgers[task];
    const session = conversation ? sessionFor(task, conversation) : null;
    await putToBed(task);
    island.set(moodsOf(houses));
    reglance();
    if (forget) {
      asleep.delete(task);
      resuming.delete(task);
      const { [task]: _draft, ...draftsLeft } = drafts;
      const { [task]: _made, ...madeLeft } = madeBy;
      const { [task]: _recap, ...recapsLeft } = recaps;
      const { [task]: _back, ...backLeft } = takenBack;
      takenBack = backLeft;
      await store.set(TAKEN_BACK_KEY, takenBack as unknown as never);
      drafts = draftsLeft;
      madeBy = madeLeft;
      recaps = recapsLeft;
      if (titledAt.delete(task)) keepTitled();
      await store.set(DRAFTS_KEY, drafts as unknown as never);
      await store.set(MADE_KEY, madeBy as unknown as never);
      await store.set(RECAPS_KEY, recaps as unknown as never);
    }
    if (!conversation) return;
    /* Held to be put back up, by the empty hook or command-shift-T, so what
       was said in it waits to be forgotten until it falls off that pile. */
    const held = session ? tasks.holds(task, session) : false;
    /* Purging rather than only stopping it also takes the pictures dropped
       on it, which nothing could ever show again once it is gone. */
    await runtimes.acp.purgeConversationData({ conversationId: conversation });
    await runtimes.conversations.delete({ conversationId: conversation });
    const { [task]: _gone, ...remaining } = lodgers;
    lodgers = remaining;
    await store.set(KEY, lodgers as unknown as never);
    /* Once the agent's own process has been told to stop. Not waited on:
       it keeps looking for a while in case the CLI writes on its way out. */
    if (forget && session && !held) {
      await tasks.forgetPast(session);
      void forgetClaudeSession(session).then(
        () => log.info('agents: forgot what was said', { area: 'agents', task }),
        (error: unknown) =>
          log.warn('agents: could not forget a transcript', { area: 'agents', task, error })
      );
    }
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
      if (!house.idle() || unlooked.has(task)) continue;
      const since = lastActive.get(task) ?? now;
      if (now - since >= IDLE_MS) void rest(task);
    }
  }, IDLE_SWEEP_MS);
  sweep.unref?.();

  const forgetCarryOn = (task: string): void => {
    if (!(task in carryOns)) return;
    const { [task]: _gone, ...rest } = carryOns;
    carryOns = rest;
    void store.set(CARRY_ON_KEY, carryOns as unknown as never);
  };

  /** Disarms a scheduled "carry on when it lifts" continue, if one is armed. */
  const stopWaiting = (task: string): void => {
    const timer = carryOnTimers.get(task);
    if (timer) clearTimeout(timer);
    carryOnTimers.delete(task);
    houses.get(task)?.carryOn(null);
    forgetCarryOn(task);
  };

  /** Goes again on its own at `at`, and keeps it armed across a restart. */
  const armCarryOn = (task: string, at: number): void => {
    houseOf(task).carryOn(at);
    carryOns = { ...carryOns, [task]: { at } };
    void store.set(CARRY_ON_KEY, carryOns as unknown as never);
    carryOnTimers.set(
      task,
      setTimeout(
        () => {
          carryOnTimers.delete(task);
          forgetCarryOn(task);
          void goAgain(task);
        },
        Math.max(0, at - Date.now())
      )
    );
  };

  /**
   * Say something to whoever is in there, moving somebody in if nobody is.
   *
   * Pulled out of the `tell` RPC so "try again", a scheduled continue and
   * the pick-up after a restart can speak without going back out through
   * the wire. With only `hidden` and no text, it is said to the agent and
   * never reaches the gatepost.
   */
  const doTell = async (
    task: string,
    text: string,
    carrying?: readonly Carried[],
    hidden?: string
  ): Promise<Told> => {
    const said = text.trim();
    // A picture handed over without a word is still something said.
    if (!said && !carrying?.length && !hidden?.trim())
      return { success: false, error: { kind: 'nothing' } };
    await loaded;
    const record = (await tasks.list()).find((candidate) => candidate.id === task);
    if (!record) return { success: false, error: { kind: 'no-such-task' } };

    const house = houseOf(task);
    /* A form standing at the gate takes what is written as its answer rather
       than as something new said: its own "write your own". */
    const standing = lodgers[task];
    if (standing && said && !carrying?.length && !hidden) {
      const filled = house.fill({ written: said });
      if (filled !== 'no-form') return filled === 'more' ? ok() : sendForm(standing, filled);
    }
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

    /* Anything said, by hand or by a scheduled continue, stops any continue
       still armed from an earlier limit. */
    stopWaiting(task);
    unlooked.delete(task);
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
          ...(hidden ? { hiddenContext: hidden } : {}),
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
   * Has it go again at what was last said, without saying it a second time:
   * Claude keeps what you said in its conversation even when the turn dies on
   * a limit, so sending it again would be the same request twice in a row,
   * and one cut off halfway would start the whole job over. A word only the
   * agent reads is enough, and nothing new goes up on the gatepost.
   */
  const goAgain = (task: string): Promise<Told> =>
    doTell(task, '', undefined, houseOf(task).cutShort() ? CARRY_ON_ASIDE : REDO_ASIDE);

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
    unlooked.delete(task);
    const record = (await tasks.list()).find((candidate) => candidate.id === task);
    if (!record) return { success: false, error: { kind: 'no-such-task' } };
    /* A session nobody has spoken to yet has no conversation, and the card
       and the head are only true once an agent is up to say what it offers,
       so opening one moves somebody in rather than waiting for the first line. */
    const fresh = !lodgers[task];
    const moved = await moveIn(task, record);
    if (!moved.success) return moved;
    const conversation = moved.data;
    const house = houseOf(task);
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
      if (sleeping && !fresh) await house.readBack();
      /* A title cut short with an ellipsis is somebody's first line, never
         a name: the namer's are short enough to need no cutting. One picked
         up before anything named it is named now, off what it holds. */
      if (!record.named && record.title.endsWith('…')) nameFromHistory(task);
      else if (sleeping && !fresh && !titledAt.has(task)) namedBefore.add(task);
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

    retryFailure: goAgain,

    /**
     * Arms a continue that sends itself once the failure's own reset time
     * comes: the village's own take on Claude Code's "continuing
     * automatically at 5pm". Needs both a reset time to aim for and
     * something already said to go again at.
     */
    async waitOutFailure(task) {
      const house = houseOf(task);
      const resetAt = house.currentResetAt();
      if (!house.everSaid() || !resetAt) return { success: false, error: { kind: 'nothing' } };
      stopWaiting(task);
      armCarryOn(task, resetAt);
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
      await evict(task, await tasks.forgets(task));
      return { success: true, data: undefined };
    },

    async answer(task, requestId, optionId) {
      await loaded;
      const conversation = lodgers[task];
      if (!conversation) return { success: false, error: { kind: 'no-such-task' } };
      const house = houseOf(task);
      const filled = house.fill({ pick: optionId });
      if (filled !== 'no-form') return filled === 'more' ? ok() : sendForm(conversation, filled);
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
      const filled = house.fill({ enough: true });
      if (filled !== 'no-form') return filled === 'more' ? ok() : sendForm(conversation, filled);
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
      if (held.data.targetPath) carriedTo.set(held.data.id, held.data.targetPath);
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

    async hush(task, untouched, keep) {
      await loaded;
      const conversation = lodgers[task];
      if (!conversation) return { success: false, error: { kind: 'no-such-task' } };
      const house = houses.get(task);
      if (untouched && !house?.untouched()) return { success: true, data: { going: true } };
      /* Called off before anything came of it, the way Claude Code's own
         Escape does it: what was asked goes back on the line to be said
         again, rather than sitting on the post as one more thing stopped. */
      const asked = keep ? undefined : house?.untouched();
      house?.hushing(true);
      const done = await runtimes.acp.cancelTurn({ conversationId: conversation });
      if (!done.success) {
        house?.hushing(false);
        return refusal(whatItSaid(done.error));
      }
      if (!asked) return { success: true, data: {} };
      const key = backKey(asked);
      takenBack = { ...takenBack, [task]: [...(takenBack[task] ?? []), key].slice(-20) };
      void store.set(TAKEN_BACK_KEY, takenBack as unknown as never);
      house?.again();
      const pictures = asked.pictures.flatMap((one): Returned[] => {
        const mime = pictured(one.mimeType);
        if (!mime) return [];
        const path = one.targetPath ?? carriedTo.get(one.id);
        return [{ id: one.id, name: one.name, mime, ...(path ? { path } : {}) }];
      });
      return {
        success: true,
        data: {
          ...(asked.text ? { back: asked.text } : {}),
          ...(pictures.length ? { pictures } : {}),
        },
      };
    },

    async recall(task, call) {
      await loaded;
      const conversation = lodgers[task];
      if (!conversation) return { success: false, error: { kind: 'no-such-task' } };
      const done = await runtimes.acp.stopSubagent({
        conversationId: conversation,
        toolCallId: jobOf(houses.get(task), call) ?? call,
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

    async sendAway(task, call) {
      await loaded;
      const house = houses.get(task);
      const told = house ? peek(house.state).told : undefined;
      const out =
        told?.errands.find((one) => one.call === call && one.running) ??
        told?.deeds.find((one) => one.job?.call === call && one.running);
      const conversation = lodgers[task];
      if (out && conversation)
        await runtimes.acp
          .stopSubagent({
            conversationId: conversation,
            toolCallId: jobOf(house, call) ?? call,
          })
          .catch(() => undefined);
      sendAway(call);
      log.info('agents: sent a helper away', { area: 'agents', task, call, wasOut: !!out });
      house?.again();
      return { success: true, data: undefined };
    },

    async commandTail(task, call) {
      await loaded;
      const house = houses.get(task);
      const output = house
        ? peek(house.state).told.deeds.find((one) => one.job?.call === call)?.job?.output
        : undefined;
      return { success: true, data: output ? await tailOf(output) : null };
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

    claudeSessions() {
      const out: { task: string; session: string }[] = [];
      for (const [task, conversation] of Object.entries(lodgers)) {
        if (records[conversation]?.provider !== 'claude') continue;
        const session = sessionFor(task, conversation);
        if (session) out.push({ task, session });
      }
      return out;
    },

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

    closing() {
      recording = false;
    },

    async dispose() {
      recording = false;
      await kitScope.dispose();
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
  /** What it last stopped on, held through the runtime suspending it. */
  private kept: SessionFailure | null = null;
  private plan: PlanState | null = null;
  /** The turn that was called off, until it says it has stopped. */
  private hushed: string | undefined;
  private usage: SessionUsage | null = null;
  /** The biggest room it has ever been said to have, since a resumed
      conversation is told the small one again until a turn has finished. */
  private widest = 0;
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
  /** How long each packing down of this conversation took, off Claude's own record. */
  private packTook: number[] = [];
  /** How full it was before each packing and after, as the village saw it. */
  private packSizes = new Map<string, { from?: number; to?: number }>();
  private datedSize = -1;
  private dating = false;
  /* Whether the village has watched this conversation move. */
  private watching = false;
  /* Whether a wake is reading this session's history back in right now. */
  private wakingUp = false;
  /* What the yard was showing when a wake began, held while the agent reads
     its past back in. That replay goes by in pieces and every piece is a
     rewrite, but this house already kept the whole conversation while it
     slept, so whoever walks in reads it straight away instead of a fire
     saying it is waking, and the real state takes over once the wake is
     done. Only held when there was something to hold. */
  private held: WorkingState | null = null;
  /* Whoever is waiting to hear the session has got past starting. */
  private past = new Set<() => void>();
  /** When a continue is scheduled to send itself, or null. */
  private carryOnAt: number | null = null;
  private carryOnTimer: ReturnType<typeof setTimeout> | undefined;
  /** Marks on a multi-select question, one pick per pending request, kept
   *  until `finishAsking` sends them or the question itself moves on. */
  private marked = new Map<string, string>();
  /** How far through a standing form the answering has got, and what has been said so far. */
  private filling: {
    requestId: string;
    at: number;
    content: Record<string, FormValue>;
    /** Gone back to one question from the check before it goes, so answering returns there. */
    back?: boolean;
  } | null = null;

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
    private readonly claude: () => string | null = () => null,
    /** The last recap written for it, and the answer it was written under. */
    private readonly recapped: () => { said: string; after: string } | undefined = () => undefined,
    /** When a failure was first seen, which the first sighting of a live one
     *  also arms a carry-on from. */
    private readonly banked: (
      failure: SessionFailure,
      live: boolean,
      written?: number
    ) => number = () => Date.now(),
    /** What was asked here and handed back to the line before anything came of it. */
    private readonly takenBack: () => readonly string[] = () => [],
    /** The subscription's meter, heard in its own answer. */
    private readonly limited: (limit: RateLimit) => void = () => {}
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
          this.take(value);
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
          this.widest = Math.max(this.widest, value?.contextSize ?? 0);
          if (value?.rateLimit) this.limited(value.rateLimit);
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
    this.take(lifecycle.current());
    this.turned(turn.current());
    this.plan = plan.current() ?? null;
    this.usage = usage.current() ?? null;
    this.widest = Math.max(this.widest, this.usage?.contextSize ?? 0);
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
      this.packTook = read.took;
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

  /** Stopped with nothing at all going on: no limit or retry being waited
   *  out, no continue armed, nobody sent out still out, no command left
   *  running in the background and nothing queued to be said. */
  idle(): boolean {
    const state = peek(this.state);
    return (
      settled(state) &&
      !this.standing() &&
      this.carryOnAt === null &&
      !this.lifecycle?.queuedPrompts?.length &&
      !state.told.errands.some((one) => one.running) &&
      !state.told.deeds.some((one) => one.running)
    );
  }

  /** A wake has started reading this session back in, or has finished. */
  waking(on: boolean): void {
    if (this.wakingUp === on) return;
    this.wakingUp = on;
    const now = peek(this.state);
    this.held = on && now.told.notes.length ? now : null;
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

  /** Whether anything has been said here for a go-again to go again at. */
  everSaid(): boolean {
    return [...this.before, ...(this.live ? [this.live] : [])].some((turn) =>
      turn.items.some((item) => item.kind === 'message' && item.role === 'user')
    );
  }

  /** Whether the last turn stopped before it was done: broken off, called
   *  off, or settled on a limit that only says so beside an ordinary finish. */
  cutShort(): boolean {
    if (this.standing()) return true;
    const last = this.live ?? this.before.at(-1);
    const outcome = last?.outcome;
    if (!outcome) return false;
    return outcome.kind !== 'done' || outcome.reason !== 'end_turn';
  }

  failing(): boolean {
    return !!this.standing();
  }

  /**
   * The failure that still stands, through the runtime putting the session
   * to sleep.
   *
   * A session that has sat quiet a while is suspended by the runtime, and a
   * suspended session reports no failure at all, so a limit being waited out
   * vanished with it and the lantern fell back to "done". What it stopped on
   * is kept until the session is awake again and says otherwise.
   */
  private standing(): SessionFailure | null {
    return this.lifecycle?.failure ?? this.kept;
  }

  private take(value: SessionState | undefined): void {
    this.lifecycle = value;
    this.kept = keptFailure(this.kept, value);
  }

  currentResetAt(): number | undefined {
    return this.failureNow()?.resetAt;
  }

  /** The failure standing, with when it was hit, and when it lifts where
   *  Claude only said so in its headline. */
  private failureNow(): (SessionFailure & { since: number }) | null {
    const failure = this.standing();
    if (!failure) return null;
    const live = this.lifecycle?.lifecycle !== 'replaying';
    /* One read back rather than watched happening was hit whenever Claude
       wrote it down, not whenever the village happened to open on it. */
    const since = this.banked(failure, live, live ? undefined : this.limitWrittenAt(failure));
    const resetAt = failure.resetAt ?? resetFrom(liftText(failure), since);
    return { ...failure, since, ...(resetAt !== undefined ? { resetAt } : {}) };
  }

  /** When Claude's own transcript says this very limit was hit, matched on
   *  its own words, since a session read back can surface an older limit
   *  than the latest one. */
  private limitWrittenAt(failure: SessionFailure): number | undefined {
    const said = failure.title.replace(/\s+/g, ' ').trim().toLowerCase();
    for (let i = this.dated.length - 1; i >= 0; i -= 1) {
      const one = this.dated[i]!;
      if (one.who === 'it' && LIMIT_KEY.test(one.key) && said.startsWith(one.key)) return one.at;
    }
    return undefined;
  }

  /**
   * What the turn in flight was asked, while nothing has come of it yet: no
   * word back and nothing done, only thinking at most.
   */
  untouched(): Asked | undefined {
    const turn = this.live;
    if (!turn || turn.outcome) return undefined;
    return askedOnly(turn, true);
  }

  /** The turns as the post shows them, without any that went back on the line. */
  private shown(turns: TranscriptTurn[]): TranscriptTurn[] {
    const back = this.takenBack();
    if (!back.length) return turns;
    const out: TranscriptTurn[] = [];
    let dropped = false;
    for (const whole of turns) {
      /* Claude writes the stop down as though you had said it, at the head of
         whatever comes next, and it went with the note it stopped. */
      const turn = dropped ? withoutStops(whole) : whole;
      if (turn !== whole && !turn.items.some(spoken)) continue;
      const asked = askedOnly(turn, true);
      dropped = asked !== undefined && back.includes(backKey(asked));
      if (!dropped) out.push(turn);
    }
    return out;
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

  /** Something kept outside the conversation changed, so say it again. */
  refresh(): void {
    if (this.conversation) this.publish();
  }

  /** Say it all again, for something that changed outside the transcript. */
  again(): void {
    this.publish();
  }

  private publish(): void {
    const was = peek(this.state);
    const next = this.held ? { ...this.held, waking: true as const } : this.read();
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
    const failure = this.failureNow();
    if (failure && state.mood === 'resting' && bankable(failure.category)) {
      glance.waiting = {
        kind: failure.category as 'limit' | 'service' | 'connection',
        ...(failure.resetAt !== undefined ? { resetAt: failure.resetAt } : {}),
        since: failure.since,
        ...(this.carryOnAt !== null ? { carryOn: this.carryOnAt } : {}),
      };
    }
    if (failure && state.mood === 'hurt' && failure.category === 'access') glance.signIn = true;
    if (state.mood === 'asking' && !state.asking) glance.asked = true;
    const out = state.told.errands.filter((one) => one.running).length;
    if (out) glance.helpers = out;
    const behind = state.told.deeds.filter((one) => one.background && one.running).length;
    if (behind) glance.background = behind;
    return glance;
  }

  /** Mark, or unmark, a pick on a multi-select question. */
  mark(requestId: string, optionId: string): void {
    if (this.marked.get(requestId) === optionId) this.marked.delete(requestId);
    else this.marked.set(requestId, optionId);
    this.publish();
  }

  /** The form standing at the gate, if what is asking is one, and its questions. */
  private standingForm(): { request: AcpPermissionRequest; questions: FormQuestion[] } | null {
    const request = (this.lifecycle?.pendingPermissions ?? []).find((each) => each.form);
    if (!request?.form) return null;
    const questions = questionsOf(request.form.message, request.form.schema);
    return questions.length ? { request, questions } : null;
  }

  private filled(requestId: string): NonNullable<typeof this.filling> {
    if (this.filling?.requestId !== requestId) this.filling = { requestId, at: 0, content: {} };
    return this.filling;
  }

  /**
   * Answers whichever question of a standing form is up: a number picked, a
   * pick toggled on a question that takes several, "that's my answer", a
   * question gone back to from the check before it goes, talking it over
   * instead, or something written on the line. Moves on, and hands back the
   * whole form once it is sent. `'no-form'` when what is asking is not a form.
   */
  fill(
    answer: { pick: string } | { enough: true } | { written: string }
  ): 'no-form' | 'more' | { requestId: string; content: Record<string, FormValue> } {
    const standing = this.standingForm();
    if (!standing) return 'no-form';
    const { request, questions } = standing;
    const filled = this.filled(request.requestId);
    const done = (): { requestId: string; content: Record<string, FormValue> } => {
      this.filling = null;
      return { requestId: request.requestId, content: filled.content };
    };
    /* On to the next question, or to the check before it goes once there is
       more than one to check, or straight back there if that is where this
       question was gone back to from. */
    const onward = (): 'more' | ReturnType<typeof done> => {
      if (filled.back) {
        filled.back = false;
        filled.at = questions.length;
      } else filled.at += 1;
      if (filled.at >= questions.length && questions.length === 1) return done();
      this.publish();
      return 'more';
    };
    const pick = 'pick' in answer ? answer.pick : 'enough' in answer ? SUBMIT_FORM : undefined;
    if (pick === TALK_FORM) {
      for (const question of questions) {
        if (question.written) filled.content[question.written] = TALK_IT_OVER;
      }
      return done();
    }
    if (filled.at >= questions.length) {
      if (pick === SUBMIT_FORM) return done();
      const back = pick?.startsWith('q:') ? Number(pick.slice(2)) : NaN;
      if (questions[back]) {
        filled.at = back;
        filled.back = true;
        this.publish();
      }
      return 'more';
    }
    const question = questions[filled.at];
    if ('written' in answer) {
      if (!question.written) return 'more';
      filled.content[question.written] = answer.written;
      if (question.several) delete filled.content[question.key];
      return onward();
    }
    if (pick === SUBMIT_FORM) return onward();
    const option = question.options[Number(pick)];
    if (!option) return 'more';
    if (question.written) delete filled.content[question.written];
    if (question.several) {
      const had = (filled.content[question.key] as string[] | undefined) ?? [];
      const label = String(option.value);
      filled.content[question.key] = had.includes(label)
        ? had.filter((each) => each !== label)
        : [...had, label];
      this.publish();
      return 'more';
    }
    filled.content[question.key] = option.value;
    return onward();
  }

  /** The question up on a standing form, or the check before it goes, as the board asks it. */
  private formAsk(): Ask | null {
    const standing = this.standingForm();
    if (!standing) return null;
    const { request, questions } = standing;
    const filled = this.filled(request.requestId);
    const talk = { optionId: TALK_FORM, name: 'talk it over instead', kind: 'talk' as const };
    if (filled.at >= questions.length) {
      return {
        requestId: request.requestId,
        text: 'Is that everything right?',
        header: 'before it goes',
        submit: SUBMIT_FORM,
        options: [
          ...questions.map((question, index) => ({
            optionId: `q:${index}`,
            name: question.header ?? question.text,
            about: answeredAs(question, filled.content) ?? 'not answered',
          })),
          { optionId: SUBMIT_FORM, name: 'send it', kind: 'submit' as const },
          talk,
        ],
      };
    }
    const question = questions[filled.at];
    const chosen = (filled.content[question.key] as string[] | undefined) ?? [];
    const own = question.written ? filled.content[question.written] : undefined;
    return {
      requestId: request.requestId,
      text: question.text,
      ...(question.header && question.header !== question.text ? { header: question.header } : {}),
      ...(questions.length > 1 ? { step: `${filled.at + 1} of ${questions.length}` } : {}),
      ...(question.written ? { writable: true } : {}),
      ...(question.several ? { submit: SUBMIT_FORM } : {}),
      options: [
        ...question.options.map((option, index) => ({
          optionId: String(index),
          name: option.label,
          ...(option.about ? { about: option.about } : {}),
          ...(question.several ? { picked: chosen.includes(String(option.value)) } : {}),
        })),
        ...(question.written
          ? [
              {
                optionId: OTHER_FORM,
                name: typeof own === 'string' ? own : 'something else',
                ...(typeof own === 'string' ? { picked: true } : {}),
                kind: 'other' as const,
              },
            ]
          : []),
        ...(question.several
          ? [{ optionId: SUBMIT_FORM, name: "that's my answer", kind: 'submit' as const }]
          : []),
        talk,
      ],
    };
  }

  /** Every mark on the question right now, one per pending request. */
  picks(): { requestId: string; optionId: string }[] {
    return [...this.marked.entries()].map(([requestId, optionId]) => ({ requestId, optionId }));
  }

  clearPicks(): void {
    this.marked.clear();
  }

  /**
   * Every packing down, with how full it was on either side of it.
   *
   * The only measure of that is the running usage, so it is caught as it goes
   * by: whatever it was holding when the packing was first seen, and the first
   * real figure after it finished that is smaller.
   */
  private sized(told: ToldState): ToldState {
    if (!told.thoughts.some((one) => one.pack)) return told;
    const usage = this.usage;
    const took = [...this.packTook].sort((a, b) => a - b);
    const usual = took.length ? took[Math.floor(took.length / 2)] : USUAL_PACK;
    const thoughts = told.thoughts.map((one) => {
      if (!one.pack) return one;
      let known = this.packSizes.get(one.id);
      if (!known) {
        known = {};
        this.packSizes.set(one.id, known);
        if (one.pack.began && one.pack.state === 'packing' && usage?.contextUsed)
          known.from = usage.contextUsed;
      }
      if (
        known.from !== undefined &&
        one.pack.state === 'packed' &&
        usage &&
        usage.contextUsed < known.from &&
        !known.to
      )
        known.to = usage.contextUsed;
      return {
        ...one,
        pack: {
          ...one.pack,
          ...known,
          ...(usage && usage.contextSize > 0 ? { size: usage.contextSize } : {}),
          /* Its own history already carries its size; only the machine's
             usual needs scaling to this one. */
          expect: took.length ? usual : packExpect(usual, known.from),
        },
      };
    });
    return { ...told, thoughts };
  }

  private read(): WorkingState {
    if (!this.conversation) return EMPTY;
    const turns = this.shown(this.live ? [...this.before, this.live] : this.before);
    const lines = linesOf(turns, this.where()).slice(-KEPT);
    const pending = this.lifecycle?.pendingPermissions ?? [];
    /* A mark against a question that has moved on — answered elsewhere,
       cancelled, the turn replaced — is stale and never sent. */
    for (const requestId of this.marked.keys()) {
      if (!pending.some((request) => request.requestId === requestId))
        this.marked.delete(requestId);
    }
    const asking =
      this.formAsk() ??
      askOf(
        pending.filter((request) => !request.form),
        this.where(),
        this.marked
      );
    const failure = this.failureNow();
    const told = helpersIn(
      this.sized(
        toldOf(turns, this.where(), (id, over) => this.time(id, over), clockOf(this.dated))
      ),
      this.claude()
    );
    const mood = moodOf(this.lifecycle, asking, this.trouble, failure, wantsAnswer(told));
    const packing = mood === 'working' && told.thoughts.at(-1)?.pack?.state === 'packing';
    return {
      mood,
      doing:
        this.trouble ??
        (failure
          ? failureDoing(failure, this.carryOnAt)
          : packing
            ? 'packing the conversation down.'
            : doingOf(mood, this.live)),
      lines,
      told: {
        ...told,
        ...(this.hushed && this.live?.id === this.hushed && !this.live.outcome
          ? { stopping: true }
          : {}),
        made: madeOf(
          this.keep(madeIn(turns, (id, over) => this.time(id, over), this.live?.id)),
          this.where()
        ),
        ...(this.recapped() ? { recap: this.recapped() } : {}),
      },
      asking,
      plan: stepsOf(this.plan),
      queued: waitingOf(this.lifecycle),
      room: roomOf(this.usage, this.widest),
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
  failure: SessionFailure | null,
  /** Its last word, with the turn over, was a question for him. */
  asked = false
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
  /* An answer that ends by asking him something is somebody standing at the
     gate waiting for his word, whatever the protocol calls the turn: finished
     reads as idle from across the room, and he closed one on exactly that. */
  if (asked) return 'asking';
  /* A closed or suspended session is somebody who is not at work this second,
     not an empty building: the village was shut and everyone went home, and
     saying a word in there brings them back to the same conversation. Only a
     building nobody has ever been told to work in is empty, and that one never
     reaches here. */
  return 'resting';
}

/** Nobody working in here this second: finished, or finished on a question
 *  for him, which is the same turn over as far as the process goes. */
function settled(state: WorkingState): boolean {
  return state.mood === 'resting' || (state.mood === 'asking' && !state.asking);
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

/** How a limit begins in Claude's own transcript, folded to lower case. */
const LIMIT_KEY =
  /^you(?:'ve| have) (?:hit|reached) your|^you're out of (?:usage|extra usage)|usage limit/;

/** Everything Claude said about a failure, where a reset time might be. */
function liftText(failure: SessionFailure): string {
  return `${failure.title} ${failure.details ?? ''}`;
}

/** The doing-line for a typed session failure, said the way the fire itself
 *  would say it — what kind of wait it is, and when it lifts, in local time. */
function failureDoing(failure: SessionFailure, carryOn?: number | null): string {
  if (failure.category === 'limit' && failure.severity !== 'warning') {
    if (carryOn) return `out of usage, carrying on by itself at ${localClock(carryOn)}.`;
    if (failure.resetAt && failure.resetAt <= Date.now()) return 'the limit has lifted.';
    if (failure.resetAt) return `out of usage until ${localClock(failure.resetAt)}.`;
    return 'out of usage.';
  }
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
function failureViewOf(failure: SessionFailure & { since?: number }, bankable: boolean): Failure {
  return {
    bankable,
    ...(failure.since !== undefined ? { since: failure.since } : {}),
    ...(bankable ? { kind: failure.category as 'limit' | 'service' | 'connection' } : {}),
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
 *
 * Claude's bridge only learns how big the room is once a turn finishes, and
 * until then guesses the small one. A conversation already holding more than
 * that is plainly in the big one, so a guess it has outgrown is not believed.
 */
function roomOf(usage: SessionUsage | null, widest = 0): number | null {
  if (!usage || usage.contextSize <= 0) return null;
  let size = Math.max(usage.contextSize, widest);
  if (usage.contextUsed > size) size = Math.max(size, BIG_ROOM);
  const left = 1 - usage.contextUsed / size;
  return Math.min(1, Math.max(0, left));
}

/** The long-context window every current Claude model that has one offers. */
const BIG_ROOM = 1_000_000;

/** What it has cost so far, straight off the provider's own report. */
function costOf(usage: SessionUsage | null): { amount: number; currency: string } | null {
  return usage?.cost ?? null;
}

/** The lines a form adds under a question's own answers, by what they do. */
const SUBMIT_FORM = '__submit__';
const TALK_FORM = '__talk__';
const OTHER_FORM = '__other__';
/* What every question is answered with when you would rather talk it over:
   the agent reads it as the answer and comes back to talk, instead of being
   stopped mid-turn as calling it off would. */
const TALK_IT_OVER = 'I would rather talk this over with you before choosing. Ask me about it.';

/** What a form's question has been answered with so far, in words. */
function answeredAs(
  question: FormQuestion,
  content: Record<string, FormValue>
): string | undefined {
  const own = question.written ? content[question.written] : undefined;
  if (typeof own === 'string' && own) return own;
  const value = content[question.key];
  const values = Array.isArray(value) ? value : value === undefined ? [] : [value];
  const labels = values.map(
    (one) => question.options.find((option) => option.value === one)?.label ?? String(one)
  );
  return labels.length ? labels.join(', ') : undefined;
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
        /* What the village said to the agent alongside what you said is never
           read back as yours. */
        const text = item.text.replace(ASIDE_TO_AGENT, '').trim();
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
  /* Something said while it worked is handed into the running turn, and the
     agent only reads it at its next pause. Until anything at all comes after
     it, it has not been heard, whatever the transcript says. */
  const unread = new Array<boolean>(flat.length).fill(false);
  let saidSince = false;
  let anythingSince = false;
  for (let i = flat.length - 1; i >= 0; i -= 1) {
    const item = flat[i];
    if (item.kind === 'said' || item.kind === 'ended') saidSince = true;
    if (item.kind === 'note') {
      answered[i] = item.hasOutcome || saidSince;
      unread[i] = !anythingSince && STEERED.test(item.id);
    } else anythingSince = true;
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
    const before = thoughts.length;
    const deedsBefore = deeds.length;
    told(item, i);
    for (let n = before; n < thoughts.length; n += 1) thoughts[n]!.seq = i;
    for (let n = deedsBefore; n < deeds.length; n += 1) deeds[n]!.seq = i;
  });

  function told(item: Flat, i: number): void {
    /* What Claude carries across a packing is its own summary, handed back in
       as though you had said it. You did not, so it is where the packing was
       rather than a note on the post. */
    if (item.kind === 'note' && carried(item.text)) {
      thoughts.push({
        id: item.id,
        said: 'Packed the conversation down.',
        at: stamp(item.id, true),
        turn: item.turn,
        pack: { state: 'packed', began: 0, expect: USUAL_PACK },
      });
      return;
    }
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
        ...(item.seen.length ? { seen: item.seen } : {}),
        ...(unread[i] ? { unread: true } : {}),
      });
    } else if (item.kind === 'said') {
      const known = dated('it', item.text);
      const at = stamp(item.id, item.hasOutcome) || known;
      earliest(at);
      /* The last thing said in a turn that broke is the agent saying why, and
         a limit is said in so many words whether or not the turn noticed. */
      const last = flat[i + 1]?.turn !== item.turn;
      /* Packing the conversation down is announced in the answer itself, and
         comes out of it as its own thing, before or after whatever else was
         said in the same breath. */
      piecesOf(item.text).forEach((piece, n) => {
        const id = n === 0 ? item.id : `${item.id}:${n}`;
        if (piece.kind === 'pack') {
          const began = stamp(`${id}:began`, false);
          const ended = piece.state === 'packing' ? undefined : stamp(`${id}:ended`, false);
          thoughts.push({
            id,
            said:
              piece.state === 'failed'
                ? `Couldn't pack the conversation down${piece.why ? `: ${piece.why}` : '.'}`
                : piece.state === 'packed'
                  ? 'Packed the conversation down.'
                  : 'Packing the conversation down.',
            at: at || began,
            turn: item.turn,
            pack: {
              state: piece.state,
              ...(piece.why ? { why: piece.why } : {}),
              began,
              ...(ended !== undefined ? { ended } : {}),
              expect: USUAL_PACK,
            },
            ...(piece.state === 'failed' ? { trouble: 'wrong' as const } : {}),
          });
          return;
        }
        const trouble =
          limited(piece.text) || (last && item.broke)
            ? 'wrong'
            : aside(piece.text.trim())
              ? 'aside'
              : undefined;
        thoughts.push({
          id,
          said: piece.text,
          at,
          turn: item.turn,
          ...(trouble ? { trouble } : {}),
        });
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
  }

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
): { ended?: 'done' | 'stopped' | 'closed' | 'broke' } {
  /* History read back never says how a turn ended, but a stop it wrote
     down as words still does. */
  if (!outcome)
    return last?.kind === 'ended' && (last.trouble === 'stopped' || last.trouble === 'closed')
      ? { ended: last.trouble }
      : {};
  if (outcome.kind === 'done') return { ended: 'done' };
  if (outcome.kind === 'cancelled') return { ended: 'stopped' };
  if (outcome.kind === 'interrupted' && outcome.reason === 'replaced') return { ended: 'stopped' };
  return { ended: 'broke' };
}

/** What the note the village sends on opening again tells the agent, word for word. */
const PICK_UP_ASIDE = 'the app was closed while you were in the middle of this';

/**
 * Whether the stop Claude wrote down at `id` was the village closing rather
 * than you: the next thing anybody said after it is the note the village
 * sends when it opens again on work it cut off.
 */
function closedUnder(turns: readonly TranscriptTurn[], from: number, id: string): boolean {
  let past = false;
  for (const turn of turns.slice(from)) {
    for (const item of turn.items) {
      if (!past) {
        past = item.kind === 'message' && item.id === id;
        continue;
      }
      if (item.kind !== 'message' || item.role !== 'user') continue;
      const text = item.text.trim();
      if (INTERRUPTED.test(text)) continue;
      return text.startsWith(PICK_UP_SAID) || text.includes(PICK_UP_ASIDE);
    }
  }
  return false;
}

/** One chronological item, flattened out of the turn/message/tool tree. */
type Flat = (
  | {
      kind: 'note';
      id: string;
      text: string;
      hasOutcome: boolean;
      pictures: number;
      seen: string[];
    }
  | { kind: 'said'; id: string; text: string; hasOutcome: boolean; broke: boolean }
  | { kind: 'thinking'; item: TranscriptThinking }
  | { kind: 'tool'; node: ToolNode; hasOutcome: boolean }
  /** A turn that ended badly without the agent saying why, said for it. */
  | { kind: 'ended'; id: string; said: string; trouble: 'wrong' | 'warn' | 'stopped' | 'closed' }
) & { turn: number };

/** What a turn was asked: its words, and the pictures that went with them. */
type Asked = { text: string; pictures: readonly AttachmentRef[] };

/** A picture handed back to the line, with where it is on this machine. */
type Returned = Carried & { path?: string };

/** How Claude's own transcript writes down a turn you stopped. */
const INTERRUPTED = /^\[Request interrupted by user[^\]]*\]$/;

/** A note the village rides alongside what you said, marked so it can come back off. */
/** Said to a session whose last turn was cut off, in place of saying it all again. */
const CARRY_ON_ASIDE =
  '[mender, for the agent only: your last turn was cut off before you finished. Carry on ' +
  'with my last message from exactly where you stopped, without redoing anything already done.]';

/** Said to one that finished, when the newest note's loop is pressed. */
const REDO_ASIDE =
  '[mender, for the agent only: I asked you to have another go at my last message. Take a ' +
  'fresh look at it rather than repeating your last answer.]';

const ASIDE_TO_AGENT = /\s*\[mender, for the agent only:[\s\S]*?\]\s*$/;

/**
 * The one thing a turn was asked, when nothing came of it: no word back and
 * nothing done. A stop written down as though you said it is let through
 * when `stopped` says the turn may have ended that way.
 */
function askedOnly(turn: TranscriptTurn, stopped = false): Asked | undefined {
  let asked: Asked | undefined;
  for (const item of turn.items) {
    if (item.kind === 'thinking') continue;
    if (item.kind !== 'message') return undefined;
    const text = item.text.replace(ASIDE_TO_AGENT, '').trim();
    if (item.role === 'assistant') {
      if (text && text !== 'No response requested.') return undefined;
      continue;
    }
    if (stopped && INTERRUPTED.test(text)) continue;
    const pictures = item.attachments ?? [];
    if (asked !== undefined || (!text && !pictures.length) || carried(text)) return undefined;
    asked = { text, pictures };
  }
  return asked;
}

/** What a note taken back is known by on the post, a restart included, when
 *  a picture read back from Claude's transcript no longer has its own id. */
function backKey(asked: Asked): string {
  return asked.pictures.length ? `${asked.text}\u0000${asked.pictures.length}` : asked.text;
}

/** Whether an item of a turn is anything anybody said or did. */
function spoken(item: TranscriptTurn['items'][number]): boolean {
  if (item.kind === 'thinking') return false;
  if (item.kind !== 'message') return true;
  return Boolean(item.text.trim() || item.attachments?.length);
}

/** A turn without the stops Claude wrote down at its head as if you said them. */
function withoutStops(turn: TranscriptTurn): TranscriptTurn {
  let leading = true;
  const items = turn.items.filter((item) => {
    if (!leading) return true;
    if (item.kind === 'message' && item.role === 'user' && INTERRUPTED.test(item.text.trim()))
      return false;
    if (item.kind === 'thinking' || (item.kind === 'message' && !item.text.trim())) return true;
    leading = false;
    return true;
  });
  return items.length === turn.items.length ? turn : { ...turn, items };
}

/** How the runtime names a message it handed into a turn already running. */
const STEERED = /-steer-/;

/** The helpers still on the yard, each with how many tokens they are working with. */
function helpersIn<T extends { errands: Errand[]; deeds: Deed[] }>(
  told: T,
  session: string | null
): T {
  return {
    ...told,
    deeds: told.deeds.map((one) =>
      one.job && isAway(one.job.call) ? { ...one, job: { ...one.job, away: true } } : one
    ),
    errands: told.errands
      .filter((one) => !isAway(one.call))
      .map((one) => {
        const tokens = tokensOf(session, one.call);
        const ran = one.running ? undefined : ranOf(session, one.call);
        return {
          ...one,
          ...(tokens === undefined ? {} : { tokens }),
          ...(ran === undefined ? {} : { ran }),
        };
      }),
  };
}

/** Where each picture handed over this run was kept, by the id it went with. */
const carriedTo = new Map<string, string>();

function flatten(turns: readonly TranscriptTurn[]): Flat[] {
  const flat: Flat[] = [];
  turns.forEach((turn, at) => {
    const hasOutcome = turn.outcome !== undefined;
    const broke = turn.outcome?.kind === 'error';
    let saidLast = false;
    for (const item of turn.items) {
      if (item.kind === 'message') {
        const text = item.text.replace(ASIDE_TO_AGENT, '').trim();
        const pictures = item.role === 'user' ? (item.attachments?.length ?? 0) : 0;
        const seen =
          item.role === 'user'
            ? (item.attachments ?? []).flatMap((one) => {
                const path = one.targetPath ?? carriedTo.get(one.id);
                return path ? [path] : [];
              })
            : [];
        if (!text && !pictures) continue;
        /* Claude's own transcript writes a stop down as if you had said it,
           and the next resume answers it; read back, that is you stopped
           it there, said over what you had asked, and nothing else. */
        if (item.role === 'user' && INTERRUPTED.test(text)) {
          const since = flat.length - [...flat].reverse().findIndex((one) => one.kind === 'note');
          const asked = flat[since - 1];
          const spoke =
            since <= flat.length && flat.slice(since).some((one) => one.kind === 'said');
          /* The village closing kills the CLI, and Claude writes that down
             the same as a stop; the note the village sends on opening again
             is how it is told apart. */
          const closed = closedUnder(turns, at, item.id);
          /* Stops one straight after another with nothing between them are
             one stop: the app opened and closed again before anything came. */
          const before = flat.at(-1);
          if (
            before?.kind === 'ended' &&
            (before.trouble === 'stopped' || before.trouble === 'closed')
          ) {
            if (closed) before.trouble = 'closed';
            continue;
          }
          flat.push({
            kind: 'ended',
            id: `${item.id}:stopped`,
            said: spoke
              ? 'Partway through what it was saying.'
              : 'Before it had said anything back.',
            trouble: closed ? 'closed' : 'stopped',
            turn: asked?.turn ?? at,
          });
          continue;
        }
        if (item.role !== 'user' && text === 'No response requested.') continue;
        flat.push(
          item.role === 'user'
            ? { kind: 'note', id: item.id, text, hasOutcome, pictures, seen, turn: at }
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
    for (const child of node.children ?? []) {
      /* How a helper hands its answer back is plumbing, not something it did. */
      if ('name' in child && child.name === 'SubagentHandback') continue;
      if (child.kind !== 'tool-group' && child.title === 'SubagentHandback') continue;
      toldFrom(child, over, root, stamp, earliest, steps, errands, written);
    }
    errands.push({
      id: node.id,
      errand: node.inputSummary ?? node.name,
      running: node.status === 'running',
      ...(at ? { since: at } : {}),
      call: node.toolCallId,
      ...(node.background ? { background: true } : {}),
      ...(node.status === 'error' ? { wrong: true } : {}),
      steps: steps.filter((step) => !/subagenthandback/i.test(step.did)).slice(-KEPT),
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
    ...(node.kind === 'execute-tool-call' && node.background
      ? { background: true, job: jobFrom(node.toolCallId, node.outputText, at) }
      : {}),
    ...(node.status === 'error' ? { wrong: true } : {}),
    ...(path ? { path } : {}),
    ...(diff ? { diff } : {}),
    ...(diffMore ? { diffMore } : {}),
  });

  for (const child of node.children ?? []) {
    toldFrom(child, over, root, stamp, earliest, deeds, errands, written);
  }
}

/**
 * Claude's own id for a command it left running, and the file it is writing
 * to, both read off what the command said back when it went: "Command running
 * in background with ID: b1x2. Output is being written to: /tmp/…/b1x2.output".
 */
function jobFrom(call: string, said: string | undefined, at: number): NonNullable<Deed['job']> {
  const id = said?.match(/in background with ID: ([\w-]+)/)?.[1];
  const output = said?.match(/Output is being written to: (\S+?\.output)\b/)?.[1];
  return {
    call,
    ...(id ? { id } : {}),
    ...(output ? { output } : {}),
    ...(at ? { since: at } : {}),
  };
}

/** What stopping a background command names: Claude's id for it, when there is one. */
function jobOf(house: House | undefined, call: string): string | undefined {
  return house
    ? peek(house.state).told.deeds.find((one) => one.job?.call === call)?.job?.id
    : undefined;
}

/** How much of a command's output its board shows, so the newest is always in view. */
const TAIL_LINES = 30;

/** The last of a command's output, said plainly: no colour codes, no carriage-return redraws. */
async function tailOf(file: string): Promise<string | null> {
  try {
    const handle = await open(file, 'r');
    try {
      const { size } = await handle.stat();
      const length = Math.min(size, 16_000);
      const buffer = Buffer.alloc(length);
      await handle.read(buffer, 0, length, size - length);
      return buffer
        .toString('utf8')
        .replace(/\u001b\[[0-9;?]*[A-Za-z]/g, '')
        .split('\n')
        .map((line) => line.split('\r').filter(Boolean).at(-1) ?? '')
        .slice(size > length ? 1 : 0)
        .slice(-TAIL_LINES)
        .join('\n')
        .trimEnd();
    } finally {
      await handle.close();
    }
  } catch {
    return null;
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
const STEP_DIFF = 80;

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
  /* A few of the lines it left alone either side, so the change is read
     where it sits rather than as lines floating free of their code. */
  const above = now.slice(Math.max(0, head - DIFF_AROUND), head);
  const below = now.slice(now.length - tail, now.length - tail + DIFF_AROUND);
  return [
    ...above.map((line) => ` ${line}`),
    ...gone.map((line) => `-${line}`),
    ...came.map((line) => `+${line}`),
    ...below.map((line) => ` ${line}`),
  ];
}

/** How many unchanged lines stand either side of an edit. */
const DIFF_AROUND = 2;

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
