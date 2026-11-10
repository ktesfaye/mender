import { join } from 'node:path';
import { createJsonFileKeyValueStore } from '@emdash/core/primitives/kv/node';
import { log } from '@emdash/shared/logger';
import { cell, peek, type Cell } from '@emdash/wire/state';
import { app } from 'electron';
import type { WorkingState } from '../shared/agents';
import type { CrewRow, MergeRequest } from '../shared/crew';
import type { Agents } from './agents';
import { mergeRequestOf, mergeRequestSaid } from './mr';
import { writeRole } from './roles';
import type { MenderRuntimes } from './runtimes';
import {
  evidenceOf,
  patternsFrom,
  realShots,
  shotsFoundIn,
  shotsNamedIn,
  stageOf,
  STAGE_WORDS,
  type Evidence,
  type Stage,
} from './stages';
import { stuckOf, stuckSaid, type Stuck } from './stuck';
import type { Task, Tasks } from './tasks';

/**
 * A lead and its crew.
 *
 * A lead is a session that hands out work and supervises it and never touches
 * code. The crew are the sessions it launched. Polling a crew session to find
 * out what came of something told to it is slow and burns the lead's turns,
 * so the village does the watching and pushes: when a session the lead is
 * responsible for asks something, breaks, hits a limit, finishes, is stopped
 * by the person, or works a long time getting nowhere, that is put into the
 * lead's conversation as a note only it reads, and wakes it if it was idle.
 *
 * Everything the village knows about a crew session is read from what it
 * already tracks (its state, its steps, its plan); nothing here reads the
 * code or the transcript. Each push, hold-back and decision is logged, so a
 * lead that did nothing can be explained afterwards.
 */

const KEY = 'crew';
const SWEEP_MS = 30_000;
/** Events arriving this close together go to the lead as one note. */
const QUIET_MS = 2_500;
const MOST_MS = 8_000;
/** A lead that is not taking notes (a limit, broken) is tried again this often. */
const RETRY_MS = 30_000;
const RETRIES = 6;
const STILL_MS = 10 * 60_000;
const STILL_MAX = 3;

type Kind =
  | 'asked'
  | 'broke'
  | 'limit'
  | 'finished'
  | 'stopped'
  | 'stuck'
  | 'stuck-still'
  | 'launched'
  | 'launch-failed'
  | 'stage'
  | 'mr';

export interface CrewEvent {
  task: string;
  kind: Kind;
  /** Said already, in the sentence the lead will read. */
  said: string;
  at: number;
}

interface Escalation {
  crew: string;
  lead: string;
  question: string;
  at: number;
}

interface Stored {
  escalations?: Escalation[];
  nudges?: Record<string, { count: number; at?: number; said?: string }>;
  tickets?: Record<string, { site: string; key: string }>;
}

/** What is remembered about one crew session between changes of state. */
interface Mem {
  state: WorkingState;
  mood: WorkingState['mood'];
  signature: string;
  movedAt: number;
  progressAt: number;
  planDone: number;
  turnSince: number;
  seen: Set<string>;
  startedAt: Map<string, number>;
  askKey?: string;
  failKey?: string;
  finishedTurn?: number;
  stuck?: { kind: Stuck['kind']; said: string; since: number; pushedAt: number; pushes: number };
  restarts: number;
  /** Steps already read for what they are evidence of (read once finished, since a failed run is no evidence). */
  classified: Set<string>;
  last: Evidence | null;
  stage: Stage;
  stageSince: number;
  onItsWord: boolean;
  openedByWord: boolean;
  testingSince?: number;
  /** Pictures its commands said they were writing, to be checked against the disk. */
  shotPaths: string[];
  shots: string[];
  mr?: MergeRequest;
  mrKey?: string;
  mrPollAt: number;
}

const EDITS = new Set(['create-file-tool-call', 'modify-file-tool-call', 'delete-file-tool-call']);
const COMMIT = /\bgit commit\b|^committed\b/i;

export interface Crew {
  isLead(task: string): boolean;
  leadOf(task: string): string | undefined;
  /** Make `crew` responsible to `lead`, and say which ticket it took, if it took one. */
  adopt(crew: string, lead: string, ticket?: { site: string; key: string }): Promise<void>;
  release(crew: string): Promise<void>;
  /** Make a fresh session a lead: only possible before anybody has been started in it. */
  makeLead(task: string): Promise<void>;
  /** Written where the worker will look, the moment a conversation is made. */
  claim(task: string, conversation: string): Promise<void>;
  /** Put something into the lead's conversation, as the village's own note. */
  push(lead: string, event: CrewEvent): void;
  /** The lead said or did something to a crew session. */
  noted(crew: string, what: 'nudge' | 'restart' | 'answer', said?: string): void;
  escalate(lead: string, crew: string, question: string): Promise<void>;
  /** The lead is about to stop this session itself, so the stop is not news. */
  stopping(crew: string): void;
  /** A crew session put a question straight to its lead, which stands until the lead answers. */
  question(crew: string, text: string): void;
  /** Everything about one session, as structured data. */
  row(task: string): CrewRow | null;
  rows(lead: string): Cell<CrewRow[]>;
  /** The same, in the lead's own words, with its merge request read fresh. */
  look(task: string): Promise<{ row: CrewRow; mr: MergeRequest; text: string } | null>;
  launching(lead: string, key: string, on: boolean): void;
  /** The crew a lead is responsible for. */
  crewOf(lead: string): Task[];
  dispose(): void;
}

export function createCrew(
  agents: Agents,
  tasks: Tasks,
  runtimes: MenderRuntimes,
  /** Where the kind of each conversation is written for the worker to read. */
  roles: string
): Crew {
  const store = createJsonFileKeyValueStore({
    path: join(process.env.MENDER_DATA_DIR ?? app.getPath('userData'), 'crew.json'),
  });
  let kept: Stored = {};
  const loaded = store.get(KEY).then((got) => {
    if (got.success && got.data && typeof got.data === 'object') kept = got.data as Stored;
  });
  const save = (): void => void store.set(KEY, kept as unknown as never);

  const mems = new Map<string, Mem>();
  const pending = new Map<string, CrewEvent[]>();
  const timers = new Map<string, { quiet?: ReturnType<typeof setTimeout>; first: number }>();
  const retries = new Map<string, number>();
  const cells = new Map<string, Cell<CrewRow[]>>();
  const setting = new Map<string, Map<string, number>>();
  const direct = new Map<string, { text: string; at: number }>();
  const stoppedByLead = new Map<string, number>();

  const taskOf = (id: string): Task | undefined => peek(tasks.watch()).find((one) => one.id === id);
  const crewOf = (lead: string): Task[] => peek(tasks.watch()).filter((one) => one.under === lead);

  const labelOf = (task: Task): string => {
    const ticket = kept.tickets?.[task.id];
    return `${ticket ? `${ticket.key} ` : ''}"${task.title}" [${task.id}]`;
  };

  /* ---- the row: everything the village knows, in one place ------------------- */

  const modelName = (task: string): string | null => {
    const kit = peek(agents.kit(task));
    return kit.models.find((one) => one.id === kit.model)?.name ?? kit.model;
  };

  const lastSaid = (state: WorkingState): string | undefined => {
    for (let i = state.lines.length - 1; i >= 0; i -= 1) {
      const line = state.lines[i]!;
      if (line.kind === 'said' && line.text.trim()) return line.text.trim().replace(/\s+/g, ' ');
    }
    return undefined;
  };

  const pulseOf = (m: Mem, now: number) => ({
    deeds: m.state.told.deeds,
    startedAt: (id: string) => m.startedAt.get(id),
    planDone: m.planDone,
    movedAt: m.movedAt,
    progressAt: m.progressAt,
    since: m.turnSince,
    outStanding:
      m.state.told.errands.filter((one) => one.running).length +
      m.state.told.deeds.filter((one) => one.background && one.running).length,
    now,
  });

  const row = (id: string): CrewRow | null => {
    const task = taskOf(id);
    if (!task) return null;
    const state = peek(agents.working(id));
    const m = mems.get(id);
    const steps = state.plan;
    const doing = steps.find((one) => one.state === 'doing');
    const asked = state.mood === 'asking' ? state.asking : null;
    const nudge = kept.nudges?.[id];
    const escalated = (kept.escalations ?? []).find((one) => one.crew === id);
    const ticket = kept.tickets?.[id];
    const failure = state.failure;
    const lastSays = lastSaid(state);
    return {
      task: id,
      title: task.title,
      ...(ticket ? { ticket } : {}),
      branch: task.branch,
      mood: state.mood,
      stage: m?.stage ?? 'picked-up',
      ...(m?.onItsWord ? { stageOnItsWord: true } : {}),
      stageSince: m?.stageSince ?? Date.now(),
      shots: m?.shots ?? [],
      ...(m?.mr ? { mr: m.mr } : {}),
      doing: state.doing,
      ...(peek(agents.glances())[id]?.since ? { since: peek(agents.glances())[id]!.since } : {}),
      ...(state.told.began ? { began: state.told.began } : {}),
      model: modelName(id),
      plan: {
        done: steps.filter((one) => one.state === 'done').length,
        total: steps.length,
        ...(doing ? { now: doing.text } : {}),
      },
      ...(m?.stuck
        ? { stuck: { kind: m.stuck.kind, said: m.stuck.said, since: m.stuck.since } }
        : {}),
      ...(asked
        ? {
            asked: {
              text: asked.text,
              options: asked.options.filter((o) => !o.kind).map((o) => o.name),
              requestId: asked.requestId,
            },
          }
        : state.mood === 'asking' && lastSays
          ? { asked: { text: lastSays.slice(-600), options: [] } }
          : direct.get(id)
            ? { asked: { text: direct.get(id)!.text, options: [] } }
            : {}),
      ...(failure
        ? {
            failure: {
              doing: failure.doing,
              ...(failure.kind ? { kind: failure.kind } : {}),
              ...(failure.resetAt ? { resetAt: failure.resetAt } : {}),
              bankable: failure.bankable,
            },
          }
        : state.mood === 'hurt'
          ? { failure: { doing: state.doing, bankable: false } }
          : {}),
      restarts: m?.restarts ?? 0,
      nudges: {
        count: nudge?.count ?? 0,
        ...(nudge?.at ? { at: nudge.at } : {}),
        ...(nudge?.said ? { said: nudge.said } : {}),
      },
      ...(escalated ? { escalated: { question: escalated.question, at: escalated.at } } : {}),
      helpers: state.told.errands.filter((one) => one.running).length,
      background: state.told.deeds.filter((one) => one.background && one.running).length,
      queued: state.queued.length,
      ...(lastSays ? { last: lastSays.slice(-400) } : {}),
    };
  };

  const rowsOf = (lead: string): CrewRow[] => {
    const out: CrewRow[] = [];
    for (const key of setting.get(lead)?.keys() ?? []) {
      const at = setting.get(lead)!.get(key)!;
      out.push({
        task: `launching:${key}`,
        title: key,
        branch: '',
        mood: 'arriving',
        stage: 'picked-up',
        stageSince: at,
        shots: [],
        doing: 'setting up the workspace.',
        since: at,
        model: null,
        plan: { done: 0, total: 0 },
        restarts: 0,
        nudges: { count: 0 },
        launching: { at },
        helpers: 0,
        background: 0,
        queued: 0,
      });
    }
    for (const one of crewOf(lead)) {
      const made = row(one.id);
      if (made) out.push(made);
    }
    return out;
  };

  const cellOf = (lead: string): Cell<CrewRow[]> => {
    let have = cells.get(lead);
    if (!have) {
      have = cell<CrewRow[]>(rowsOf(lead), { name: `crew:${lead}` });
      cells.set(lead, have);
    }
    return have;
  };

  let dirty = new Set<string>();
  let publishing: ReturnType<typeof setTimeout> | undefined;
  const publishSoon = (lead: string): void => {
    if (!cells.has(lead)) return;
    dirty.add(lead);
    publishing ??= setTimeout(() => {
      publishing = undefined;
      const now = dirty;
      dirty = new Set();
      for (const one of now) cells.get(one)?.set(rowsOf(one));
    }, 250);
  };

  /* ---- delivering to the lead ---------------------------------------------- */

  const flush = async (lead: string): Promise<void> => {
    const timer = timers.get(lead);
    if (timer?.quiet) clearTimeout(timer.quiet);
    timers.delete(lead);
    const events = pending.get(lead) ?? [];
    if (!events.length) return;
    pending.delete(lead);
    const head = taskOf(lead);
    if (!head) {
      log.warn('crew: lead is gone, dropping its events', {
        area: 'crew',
        lead,
        dropped: events.length,
      });
      return;
    }
    const body = [
      `crew update from the village (${events.length} thing${events.length === 1 ? '' : 's'}):`,
      ...events.map((one) => `- ${one.said}`),
      "These came to you on their own; do not poll for them. Act on what you can decide from the tickets and the crew's own words, and put to the person only what you cannot.",
    ].join('\n');
    const told = await agents.tell(lead, '', undefined, `[mender, for the agent only: ${body}]`);
    if (told.success) {
      retries.delete(lead);
      log.info('crew: pushed to lead', {
        area: 'crew',
        lead,
        events: events.map((one) => `${one.kind}:${one.task}`),
      });
      return;
    }
    const tries = (retries.get(lead) ?? 0) + 1;
    retries.set(lead, tries);
    log.warn('crew: lead would not take the note', {
      area: 'crew',
      lead,
      error: told.error,
      attempt: tries,
    });
    if (tries > RETRIES) {
      log.error('crew: giving up on a note to the lead', {
        area: 'crew',
        lead,
        lost: events.length,
      });
      retries.delete(lead);
      return;
    }
    pending.set(lead, [...events, ...(pending.get(lead) ?? [])]);
    timers.set(lead, { first: Date.now(), quiet: setTimeout(() => void flush(lead), RETRY_MS) });
  };

  const push = (lead: string, event: CrewEvent): void => {
    const list = pending.get(lead) ?? [];
    list.push(event);
    pending.set(lead, list);
    const timer = timers.get(lead) ?? { first: Date.now() };
    if (timer.quiet) clearTimeout(timer.quiet);
    const wait = Math.max(0, Math.min(QUIET_MS, timer.first + MOST_MS - Date.now()));
    timer.quiet = setTimeout(() => void flush(lead), wait);
    timers.set(lead, timer);
    log.info('crew: event', { area: 'crew', lead, task: event.task, kind: event.kind });
  };

  /* ---- reading a crew session's state as it changes -------------------------- */

  /* ---- stages ---------------------------------------------------------------
     Where the ticket stands, from what the session did and what the host says
     about its merge request. See stages.ts for what counts as evidence. */

  const patterns = patternsFrom(process.env.MENDER_DATA_DIR ?? app.getPath('userData'));

  /** Reads every finished step not yet read for what it is evidence of. */
  const readEvidence = (task: Task, m: Mem, now: number): void => {
    for (const deed of m.state.told.deeds) {
      if (deed.running || m.classified.has(deed.id)) continue;
      m.classified.add(deed.id);
      const found = evidenceOf(deed, patterns);
      if (!found) continue;
      m.last = found;
      if (found === 'device') {
        m.testingSince ??= now;
        m.shotPaths.push(...shotsNamedIn(deed.did, task.path));
      }
      if (found === 'mr-command') {
        m.openedByWord = true;
        m.mrPollAt = now + 3_000;
        setTimeout(() => void pollMr(task.id), 3_500);
      }
    }
    if (m.classified.size > 3000) m.classified = new Set(m.state.told.deeds.map((one) => one.id));
  };

  /** The pictures from the testing that is ending, found on the disk and not just named. */
  const gatherShots = (task: Task, m: Mem): string[] => {
    const since = m.testingSince ?? m.stageSince;
    const named = realShots(m.shotPaths, since);
    const found = shotsFoundIn(task.path, since);
    return [...new Set([...named, ...found])].slice(-12);
  };

  const mrSaid = (mr: MergeRequest | undefined): string => (mr ? mergeRequestSaid(mr) : 'unknown');

  /** Works out the stage again and tells the lead about the changes that matter. */
  const recompute = (task: Task, m: Mem, now: number, quiet = false): void => {
    const lead = task.under;
    const next = stageOf({
      last: m.last,
      ...(m.mr ? { mr: m.mr } : {}),
      openedByItsOwnWord: m.openedByWord,
    });
    m.onItsWord = Boolean(next.onItsWord);
    if (next.stage === m.stage) return;
    const was = m.stage;
    m.stage = next.stage;
    m.stageSince = now;
    log.info('crew: stage', {
      area: 'crew',
      task: task.id,
      lead,
      from: was,
      to: next.stage,
      quiet,
    });
    if (quiet || !lead) return;
    const label = labelOf(task);
    if (was === 'testing') {
      m.shots = gatherShots(task, m);
      m.testingSince = undefined;
      m.shotPaths = [];
    }
    const shots =
      was === 'testing' && m.shots.length
        ? ` Screenshots from the run (${m.shots.length}): ${m.shots.join(', ')}.`
        : was === 'testing'
          ? ' It left no screenshots that I can find on disk.'
          : '';
    let said: string | null = null;
    if (next.stage === 'testing') {
      said = `${label} has started testing on the device.`;
    } else if (was === 'testing' && next.stage === 'developing') {
      said = `${label} finished testing and went back to developing (it edited after the test run).${shots}`;
    } else if (next.stage === 'opening-mr') {
      said = `${label} is opening the merge request${was === 'testing' ? ` (testing is done).${shots}` : '.'}`;
    } else if (next.stage === 'in-review') {
      said = `${label} has its merge request in review${m.mr?.url ? `: ${m.mr.url}` : ''}${next.onItsWord ? ' (on its own word: the host could not be asked)' : `: ${mrSaid(m.mr)}`}.${shots}`;
    } else if (next.stage === 'merged') {
      said = `${label} is merged${m.mr?.url ? `: ${m.mr.url}` : ''}. Nothing more for it to do; send_home when you are ready.`;
    }
    if (said) push(lead, { task: task.id, kind: 'stage', at: now, said });
  };

  /** Asks the host about a session's merge request, and tells the lead when it changed. */
  const pollMr = async (id: string): Promise<void> => {
    const task = taskOf(id);
    const m = mems.get(id);
    if (!task || !m || !task.under) return;
    const now = Date.now();
    m.mrPollAt = now + (m.stage === 'in-review' ? 60_000 : 20_000);
    let got: MergeRequest;
    try {
      got = await mergeRequestOf(runtimes, task.path, task.pull);
    } catch (caught) {
      log.warn('crew: merge request poll failed', {
        area: 'crew',
        task: id,
        error: String(caught),
      });
      return;
    }
    const had = m.mr;
    m.mr = got;
    if (got.state === 'merged' || got.state === 'closed') m.mrPollAt = now + 5 * 60_000;
    recompute(task, m, now);
    const key = [
      got.state,
      got.ci,
      got.approvals ? `${got.approvals.have}/${got.approvals.need}` : '',
      got.unresolved,
      got.review ?? '',
    ].join('|');
    if (
      had &&
      !had.unknown &&
      had.state !== 'none' &&
      !got.unknown &&
      m.mrKey !== key &&
      got.state !== 'none' &&
      m.stage === 'in-review'
    ) {
      push(task.under, {
        task: id,
        kind: 'mr',
        at: now,
        said: `${labelOf(task)}: merge request changed: ${mrSaid(got)}.${got.ci === 'failed' ? ' CI failed; tell it to read the failing job and fix it.' : ''}${got.unresolved ? ` ${got.unresolved} comment${got.unresolved === 1 ? '' : 's'} to answer; tell it to answer them.` : ''}`,
      });
    }
    m.mrKey = key;
    publishSoon(task.under);
  };

  const evaluate = (task: Task, m: Mem, now: number): void => {
    const lead = task.under;
    if (!lead) return;
    if (m.mood !== 'working') {
      m.stuck = undefined;
      return;
    }
    const found = stuckOf(pulseOf(m, now));
    if (!found) {
      if (m.stuck)
        log.info('crew: no longer stuck', { area: 'crew', task: task.id, was: m.stuck.kind });
      m.stuck = undefined;
      return;
    }
    const said = stuckSaid(found);
    if (!m.stuck || m.stuck.kind !== found.kind) {
      m.stuck = { kind: found.kind, said, since: now, pushedAt: now, pushes: 1 };
      log.info('crew: stuck', { area: 'crew', task: task.id, lead, kind: found.kind, said });
      push(lead, {
        task: task.id,
        kind: 'stuck',
        at: now,
        said: `${labelOf(task)} looks stuck: ${said}. Look at it with session_report, then nudge it, interrupt it, or escalate.`,
      });
      return;
    }
    m.stuck.said = said;
    if (now - m.stuck.pushedAt >= STILL_MS && m.stuck.pushes < STILL_MAX) {
      m.stuck.pushedAt = now;
      m.stuck.pushes += 1;
      push(lead, {
        task: task.id,
        kind: 'stuck-still',
        at: now,
        said: `${labelOf(task)} is still stuck ${Math.round((now - m.stuck.since) / 60_000)} minutes on: ${said}. A nudge has not been enough; interrupt it with new instructions, restart it, or escalate.`,
      });
    }
  };

  const onState = (id: string, state: WorkingState): void => {
    const task = taskOf(id);
    if (!task?.under) return;
    const lead = task.under;
    const now = Date.now();
    const planDone = state.plan.filter((one) => one.state === 'done').length;
    const signature = [
      state.told.deeds.length,
      state.told.deeds.at(-1)?.id,
      state.told.deeds.at(-1)?.running,
      planDone,
      state.lines.length,
      state.lines.at(-1)?.text.length,
      state.told.notes.length,
    ].join(':');

    let m = mems.get(id);
    const first = !m;
    if (!m) {
      m = {
        state,
        mood: state.mood,
        signature,
        movedAt: now,
        progressAt: now,
        planDone,
        turnSince: now,
        seen: new Set(state.told.deeds.map((one) => one.id)),
        startedAt: new Map(),
        restarts: 0,
        classified: new Set(),
        last: null,
        stage: 'picked-up',
        stageSince: now,
        onItsWord: false,
        openedByWord: false,
        shotPaths: [],
        shots: [],
        mrPollAt: 0,
      };
      mems.set(id, m);
    }
    const was = first ? undefined : m.mood;

    if (was !== 'working' && state.mood === 'working') {
      m.turnSince = now;
      m.progressAt = now;
      m.movedAt = now;
    }
    if (signature !== m.signature) {
      m.movedAt = now;
      m.signature = signature;
    }
    for (const deed of state.told.deeds) {
      if (m.seen.has(deed.id)) {
        continue;
      }
      m.seen.add(deed.id);
      m.startedAt.set(deed.id, now);
      if (EDITS.has(deed.tool) || COMMIT.test(deed.did)) m.progressAt = now;
    }
    if (m.seen.size > 3000) {
      m.seen = new Set(state.told.deeds.map((one) => one.id));
      m.startedAt = new Map([...m.startedAt].filter(([key]) => m.seen.has(key)));
    }
    if (planDone > m.planDone) m.progressAt = now;
    m.planDone = planDone;
    m.state = state;
    m.mood = state.mood;
    readEvidence(task, m, now);
    recompute(task, m, now, first);

    const label = labelOf(task);

    if (state.mood === 'asking') {
      const key = state.asking?.requestId ?? `ended:${state.told.turns}`;
      if (m.askKey !== key) {
        m.askKey = key;
        const said = state.asking
          ? `"${state.asking.text}"${
              state.asking.options.filter((one) => !one.kind).length
                ? ` Its options: ${state.asking.options
                    .filter((one) => !one.kind)
                    .map((one, n) => `${n + 1}. ${one.name}`)
                    .join(' | ')}.`
                : ''
            }`
          : `its answer ended on a question for the person: "${(lastSaid(state) ?? '').slice(-500)}"`;
        push(lead, {
          task: id,
          kind: 'asked',
          at: now,
          said: `${label} is asking: ${said} Answer it with answer_session (or tell_session) if the ticket decides it; otherwise escalate it to the person.`,
        });
      }
    } else m.askKey = undefined;

    if (state.mood === 'hurt' && was !== 'hurt') {
      push(lead, {
        task: id,
        kind: 'broke',
        at: now,
        said: `${label} broke: ${state.doing} (restarted ${m.restarts} time${m.restarts === 1 ? '' : 's'} so far). restart_session can try again; if it has failed twice the same way, escalate.`,
      });
    }

    const failure = state.failure;
    if (state.mood === 'resting' && failure?.bankable) {
      const key = `${failure.kind ?? 'wait'}:${failure.since ?? ''}`;
      if (m.failKey !== key) {
        m.failKey = key;
        push(lead, {
          task: id,
          kind: 'limit',
          at: now,
          said: `${label} is waiting out a limit: ${failure.doing}${
            failure.resetAt
              ? ` (back about ${new Date(failure.resetAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })})`
              : ''
          }. It carries on by itself; nothing needed unless you want to switch its model.`,
        });
      }
    } else if (!failure) m.failKey = undefined;

    if (was === 'working' && state.mood === 'resting' && !failure) {
      const ended = state.told.ended;
      const turn = state.told.turns;
      if (m.finishedTurn !== turn) {
        m.finishedTurn = turn;
        if (ended === 'stopped' && now - (stoppedByLead.get(id) ?? 0) < 30_000) {
          log.info("crew: stop was the lead's own, not reported", { area: 'crew', task: id, lead });
        } else if (ended === 'stopped') {
          push(lead, {
            task: id,
            kind: 'stopped',
            at: now,
            said: `${label} was stopped (by the person, not by you). It has not been told to carry on.`,
          });
        } else if (ended !== 'broke' && ended !== 'cut' && ended !== 'closed') {
          m.restarts = 0;
          push(lead, {
            task: id,
            kind: 'finished',
            at: now,
            said: `${label} finished its turn (stage: ${STAGE_WORDS[m.stage]})${lastSaid(state) ? `: "${lastSaid(state)!.slice(-400)}"` : '.'}${
              m.stage === 'testing'
                ? ` Its testing run is over; screenshots: ${(m.shots = gatherShots(task, m)).join(', ') || 'none found on disk'}.`
                : ''
            } Check session_report for its branch and merge request before calling it done.`,
          });
        }
      }
    }

    evaluate(task, m, now);
    publishSoon(lead);
  };

  const stop = agents.observe(onState);
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [id, m] of mems) {
      const task = taskOf(id);
      if (!task?.under) continue;
      evaluate(task, m, now);
      if ((m.openedByWord || m.mr) && now >= m.mrPollAt) void pollMr(id);
      if (m.mood === 'working') publishSoon(task.under);
    }
  }, SWEEP_MS);

  /* ---- the rest of what a lead may do -------------------------------------- */

  const claim: Crew['claim'] = async (id, conversation) => {
    await loaded;
    const task = taskOf(id) ?? (await tasks.list()).find((one) => one.id === id);
    if (task?.lead) await writeRole(roles, conversation, { role: 'lead' });
    else if (task?.under) await writeRole(roles, conversation, { role: 'crew', lead: task.under });
    else await writeRole(roles, conversation, null);
    if (task?.lead || task?.under) {
      log.info('crew: role written', {
        area: 'crew',
        task: id,
        conversation,
        lead: task.lead,
        under: task.under,
      });
    }
  };

  const adopt: Crew['adopt'] = async (crew, lead, ticket) => {
    await loaded;
    await tasks.setRole(crew, { under: lead });
    if (ticket) kept = { ...kept, tickets: { ...(kept.tickets ?? {}), [crew]: ticket } };
    save();
    const conversation = agents.conversationOf(crew);
    if (conversation) await writeRole(roles, conversation, { role: 'crew', lead });
    log.info('crew: adopted', { area: 'crew', crew, lead, ticket: ticket?.key });
    publishSoon(lead);
  };

  const release: Crew['release'] = async (crew) => {
    const lead = taskOf(crew)?.under;
    await tasks.setRole(crew, { under: null });
    mems.delete(crew);
    const conversation = agents.conversationOf(crew);
    if (conversation) await writeRole(roles, conversation, null);
    log.info('crew: released', { area: 'crew', crew, lead });
    if (lead) publishSoon(lead);
  };

  const makeLead: Crew['makeLead'] = async (id) => {
    if (agents.conversationOf(id)) {
      throw new Error(
        'a lead has to be made before anybody has been started in the session; its tools are fixed when its agent starts.'
      );
    }
    await tasks.setRole(id, { lead: true });
    log.info('crew: lead made', { area: 'crew', task: id });
  };

  const noted: Crew['noted'] = (crew, what, said) => {
    const lead = taskOf(crew)?.under;
    const was = kept.nudges?.[crew] ?? { count: 0 };
    direct.delete(crew);
    if (what === 'nudge' || what === 'answer') {
      kept = {
        ...kept,
        nudges: {
          ...(kept.nudges ?? {}),
          [crew]: {
            count: was.count + 1,
            at: Date.now(),
            ...(said ? { said: said.slice(0, 200) } : {}),
          },
        },
      };
    }
    if (what === 'restart') {
      const m = mems.get(crew);
      if (m) m.restarts += 1;
    }
    /* The lead acted on it, so a standing escalation of this one is answered. */
    if (what === 'answer') {
      kept = { ...kept, escalations: (kept.escalations ?? []).filter((one) => one.crew !== crew) };
    }
    const m = mems.get(crew);
    if (m?.stuck) m.stuck.pushedAt = Date.now();
    save();
    if (lead) publishSoon(lead);
  };

  const escalate: Crew['escalate'] = async (lead, crew, question) => {
    await loaded;
    kept = {
      ...kept,
      escalations: [
        ...(kept.escalations ?? []).filter((one) => one.crew !== crew),
        { crew, lead, question, at: Date.now() },
      ].slice(-100),
    };
    save();
    log.info('crew: escalated to the person', {
      area: 'crew',
      lead,
      crew,
      question: question.slice(0, 300),
    });
    publishSoon(lead);
  };

  const look: Crew['look'] = async (id) => {
    const made = row(id);
    const task = taskOf(id);
    if (!made || !task) return null;
    const state = peek(agents.working(id));
    const cost = task.workspace ? await tasks.dropCost(task.workspace).catch(() => null) : null;
    const mr = await mergeRequestOf(runtimes, task.path, task.pull);
    const clock = (ms: number) => {
      const minutes = Math.max(0, Math.round(ms / 60_000));
      return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
    };
    const lines: string[] = [];
    lines.push(
      `${made.ticket ? `${made.ticket.key} ` : ''}"${made.title}" [${id}] is ${made.mood}${
        made.model ? ` on ${made.model}` : ''
      }: ${made.doing.replace(/\.$/, '')}`
    );
    lines.push(
      `Stage: ${STAGE_WORDS[made.stage]}${made.stageOnItsWord ? ' (on its own word: the host could not be asked)' : ''}, for ${clock(Date.now() - made.stageSince)}.${
        made.shots.length
          ? ` Screenshots from its last test run (${made.shots.length}): ${made.shots.join(', ')}.`
          : ''
      }`
    );
    const times: string[] = [];
    if (made.since && made.mood === 'working')
      times.push(`this turn ${clock(Date.now() - made.since)}`);
    if (made.began) times.push(`session ${clock(Date.now() - made.began)} old`);
    if (times.length) lines.push(times.join(', '));
    if (made.plan.total) {
      lines.push(
        `Plan: ${made.plan.done} of ${made.plan.total} steps done${made.plan.now ? `, on "${made.plan.now}"` : ''}.`
      );
    } else lines.push('No plan stated.');
    const mem = mems.get(id);
    if (made.stuck)
      lines.push(
        `GOING NOWHERE: ${made.stuck.said} (since ${clock(Date.now() - made.stuck.since)} ago).`
      );
    else if (made.mood === 'working') {
      const last = mem ? Date.now() - mem.movedAt : 0;
      lines.push(
        `Moving: its last step, word or plan change was ${Math.max(1, Math.round(last / 1000))}s ago.`
      );
    }
    const commits = state.told.deeds.filter((one) => COMMIT.test(one.did)).length;
    lines.push(
      `Branch ${task.branch}${task.workspace ? ' in its own workspace' : ' in the project folder'}${
        cost
          ? `: ${cost.uncommitted} uncommitted file${cost.uncommitted === 1 ? '' : 's'}, ${cost.unshared} commit${cost.unshared === 1 ? '' : 's'} not pushed anywhere`
          : ''
      }${commits ? `; it has made ${commits} commit${commits === 1 ? '' : 's'} this conversation` : ''}.`
    );
    lines.push(`Merge request: ${mergeRequestSaid(mr)}.`);
    if (made.asked) {
      lines.push(
        `ASKING: "${made.asked.text}"${made.asked.options.length ? ` Options: ${made.asked.options.map((one, n) => `${n + 1}. ${one}`).join(' | ')}` : ''}`
      );
    }
    if (made.failure)
      lines.push(`${made.failure.bankable ? 'Waiting' : 'Broken'}: ${made.failure.doing}`);
    if (made.restarts)
      lines.push(
        `You have restarted it ${made.restarts} time${made.restarts === 1 ? '' : 's'} since it last finished something.`
      );
    if (made.nudges.count) {
      lines.push(
        `You have told it ${made.nudges.count} time${made.nudges.count === 1 ? '' : 's'}${made.nudges.at ? `, last ${clock(Date.now() - made.nudges.at)} ago` : ''}${made.nudges.said ? `: "${made.nudges.said}"` : ''}.`
      );
    }
    if (made.escalated) lines.push(`Escalated to the person: "${made.escalated.question}"`);
    const out = [
      made.helpers && `${made.helpers} helper${made.helpers === 1 ? '' : 's'} out`,
      made.background &&
        `${made.background} command${made.background === 1 ? '' : 's'} running in the background`,
      made.queued && `${made.queued} note${made.queued === 1 ? '' : 's'} of yours not read yet`,
    ].filter(Boolean);
    if (out.length) lines.push(`${out.join(', ')}.`);
    if (made.last) lines.push(`It last said: "${made.last.slice(-300)}"`);
    return { row: made, mr, text: lines.join('\n') };
  };

  void loaded.then(() => {
    for (const lead of new Set(
      peek(tasks.watch()).flatMap((one) => (one.under ? [one.under] : []))
    )) {
      cellOf(lead);
    }
  });

  return {
    isLead: (task) => Boolean(taskOf(task)?.lead),
    leadOf: (task) => taskOf(task)?.under,
    adopt,
    release,
    makeLead,
    claim,
    push,
    noted,
    escalate,
    stopping: (crew) => void stoppedByLead.set(crew, Date.now()),
    question: (crew, text) => {
      direct.set(crew, { text, at: Date.now() });
      const lead = taskOf(crew)?.under;
      if (lead) publishSoon(lead);
    },
    row,
    rows: (lead) => {
      const have = cellOf(lead);
      have.set(rowsOf(lead));
      return have;
    },
    look,
    launching: (lead, key, on) => {
      const mine = setting.get(lead) ?? new Map<string, number>();
      if (on) mine.set(key, Date.now());
      else mine.delete(key);
      setting.set(lead, mine);
      publishSoon(lead);
    },
    crewOf,
    dispose() {
      stop();
      clearInterval(sweep);
      for (const timer of timers.values()) if (timer.quiet) clearTimeout(timer.quiet);
      if (publishing) clearTimeout(publishing);
    },
  };
}
