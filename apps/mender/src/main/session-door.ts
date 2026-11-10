import { randomBytes } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, join, sep } from 'node:path';
import { pluginRegistry } from '@emdash/plugins/agents';
import { log } from '@emdash/shared/logger';
import { peek } from '@emdash/wire/state';
import { app, BrowserWindow } from 'electron';
import { MENDER_ATTEND_CHANNEL, MENDER_TABLE_CHANNEL } from '@shared/channels';
import type { WorkingState } from '../shared/agents';
import type { Agents } from './agents';
import type { Crew } from './crew';
import type { JiraHands } from './jira';
import type { JiraLaunch } from './jira-launch';
import { mergeRequestSaid } from './mr';
import { noteCaught, lost } from './ops';
import type { Projects } from './projects';
import type { MenderRuntimes } from './runtimes';
import { STAGE_WORDS } from './stages';
import type { Tasks, Workspace } from './tasks';

/**
 * How a session starts another, in the village where he can watch it.
 *
 * Every chat session is handed a small MCP server (`assets/tools/mender-mcp.mjs`)
 * that does nothing but knock here, on a loopback port, with a token that lives
 * in a file only this user can read. The request is the same one a schedule
 * makes when it comes due: the same `tasks.begin`, so the new lantern hangs on
 * the rail and the villager walks to its house, and then the window is walked
 * into it, unless the one asking said not to. Nothing here clicks anything.
 */

interface Start {
  cwd: string;
  what: string;
  agent?: string;
  isolated?: boolean;
  terminal?: boolean;
  show?: boolean;
  /** A workspace by name or id to start in, or "project" for the project's
      own folder. Without it the new session starts where the asker stands. */
  workspace?: string;
  /** Make it a lead: it supervises and may not touch code. */
  lead?: boolean;
  conversation?: string;
}

/** What the door needs besides the sessions themselves. */
export interface DoorDeps {
  crew: Crew;
  jira: JiraHands;
  launch: JiraLaunch;
  runtimes: MenderRuntimes;
}

/** Which part of the drafting table to lay over the village. `path` is the
    checkout the board sits in, which may be a session's own copy. */
interface Table {
  path: string;
  room?: string;
  pass?: string;
  page?: string;
}

export interface SessionDoor {
  dispose(): void;
}

export function doorFile(): string {
  return join(process.env.MENDER_DATA_DIR ?? app.getPath('userData'), 'door.json');
}

export function openSessionDoor(
  tasks: Tasks,
  agents: Agents,
  projects: Projects,
  deps: DoorDeps
): SessionDoor {
  const { crew, jira, launch } = deps;
  const token = randomBytes(24).toString('hex');

  /** Which project and, if it is inside an isolated copy, which workspace a
      folder belongs to. The deepest match wins, so a copy cut under the
      project's own folder is the copy and not the project. */
  const whereIs = async (cwd: string) => {
    const inside = (root: string) => cwd === root || cwd.startsWith(root + sep);
    let best: { project: string; workspace?: string; depth: number } | null = null;
    for (const project of await projects.list()) {
      if (inside(project.path) && (!best || project.path.length > best.depth)) {
        best = { project: project.id, depth: project.path.length };
      }
      for (const workspace of await tasks.workspaces(project.id)) {
        if (inside(workspace.path) && (!best || workspace.path.length > best.depth)) {
          best = { project: project.id, workspace: workspace.id, depth: workspace.path.length };
        }
      }
    }
    return best;
  };

  /** A workspace of one project, by name, id or the front of either. */
  const findWorkspace = async (
    project: string,
    which: string
  ): Promise<{ workspace: Workspace } | { text: string }> => {
    const want = which.trim().toLowerCase();
    if (!want) return { text: 'say which workspace.' };
    const all = await tasks.workspaces(project);
    const exact = all.filter(
      (each) => each.id === which || each.id.startsWith(which) || each.name.toLowerCase() === want
    );
    const hits = exact.length
      ? exact
      : all.filter((each) => each.name.toLowerCase().includes(want));
    if (hits.length === 1) return { workspace: hits[0] };
    if (!hits.length) return { text: `no workspace like "${which}" in this project.` };
    return {
      text: `"${which}" matches more than one: ${hits.map((each) => each.name).join(', ')}.`,
    };
  };

  const start = async (body: Start): Promise<{ ok: boolean; text: string }> => {
    const what = String(body.what ?? '').trim();
    if (!what) return { ok: false, text: 'say what the new session is for.' };
    const here = await whereIs(String(body.cwd ?? ''));
    if (!here) return { ok: false, text: 'that folder is not one of the village’s projects.' };

    let into = here.workspace;
    if (body.workspace !== undefined) {
      if (body.workspace.trim().toLowerCase() === 'project') {
        into = undefined;
      } else {
        const found = await findWorkspace(here.project, body.workspace);
        if ('text' in found) return { ok: false, text: found.text };
        into = found.workspace.id;
      }
    }
    const asker = agents.taskOf(String(body.conversation ?? ''));
    const lead = Boolean(body.lead);
    if (lead && body.terminal) return { ok: false, text: 'a lead is a chat session, not a shell.' };
    if (lead) into = undefined;
    const made = await tasks.begin(
      here.project,
      what,
      null,
      body.terminal ? 'shell' : undefined,
      undefined,
      !lead && body.isolated ? true : undefined,
      lead || body.isolated ? undefined : into
    );
    if (!made.success) {
      return { ok: false, text: `could not start it: ${JSON.stringify(made.error)}` };
    }
    const id = made.data.id;
    /* Said before anybody is started in it, since what a session may use is
       fixed when its agent starts. */
    if (lead) await crew.makeLead(id);
    const supervisor = asker && crew.isLead(asker) ? asker : undefined;
    if (supervisor && !lead && !body.terminal) await crew.adopt(id, supervisor);
    if (body.agent) {
      const known = pluginRegistry
        .getAll()
        .some(
          (plugin) =>
            plugin.metadata.id === body.agent && plugin.capabilities.acp.kind === 'supported'
        );
      if (!known) return { ok: false, text: `no agent called ${body.agent} is here.` };
      await tasks.rehand(id, body.agent);
    }
    if (!body.terminal) await agents.tell(id, what);

    if (body.show !== false) {
      setTimeout(() => {
        const win = BrowserWindow.getAllWindows()[0];
        if (!win || win.isDestroyed()) return;
        win.webContents.send(MENDER_ATTEND_CHANNEL, id, body.terminal ? what : undefined);
      }, 500);
    }
    return {
      ok: true,
      text: `started ${lead ? 'the lead ' : ''}"${made.data.title}" [${id}] in ${lead ? 'the project folder, kept from touching code' : body.isolated ? 'its own copy' : into ? 'the workspace' : 'the project folder'}; its lantern is on the rail.${supervisor && !lead ? ' It is crew under you: you will hear when it asks, breaks, hits a limit, finishes or gets stuck.' : ''}`,
    };
  };

  const table = async (body: Table): Promise<{ ok: boolean; text: string }> => {
    const path = String(body.path ?? '');
    const here = await whereIs(path);
    if (!here) return { ok: false, text: 'that folder is not one of the village’s projects.' };
    const win = BrowserWindow.getAllWindows()[0];
    if (!win || win.isDestroyed()) return { ok: false, text: 'the village has no window open.' };
    win.webContents.send(MENDER_TABLE_CHANNEL, {
      project: here.project,
      path,
      room: body.room,
      pass: body.pass,
      page: body.page,
    });
    return { ok: true, text: 'it is up on the drafting table in Mender, in front of him.' };
  };

  const model = async (body: { conversation?: string; model?: string }) =>
    agents.switchModel(String(body.conversation ?? ''), String(body.model ?? ''));

  /** The sessions in the project the asker stands in, and which of them is
      the asker. Reaching further than its own project is not a thing a
      session can do to another. */
  const neighbours = async (body: { cwd?: string; conversation?: string }) => {
    const here = await whereIs(String(body.cwd ?? ''));
    if (!here) return null;
    const me = agents.taskOf(String(body.conversation ?? ''));
    return { me, project: here.project, all: await tasks.list(here.project) };
  };

  const pick = (
    near: NonNullable<Awaited<ReturnType<typeof neighbours>>>,
    which: string
  ): { task: (typeof near.all)[number] } | { text: string } => {
    const want = which.trim().toLowerCase();
    if (!want) return { text: 'say which session.' };
    const exact = near.all.filter(
      (each) => each.id === which || each.id.startsWith(which) || each.title.toLowerCase() === want
    );
    const hits = exact.length
      ? exact
      : near.all.filter((each) => each.title.toLowerCase().includes(want));
    if (hits.length === 1) return { task: hits[0] };
    if (!hits.length) return { text: `no session like "${which}" in this project.` };
    return {
      text: `"${which}" matches more than one: ${hits.map((each) => each.title).join(', ')}.`,
    };
  };

  const clock = (ms: number): string => {
    const minutes = Math.max(0, Math.round(ms / 60_000));
    return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
  };
  const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

  /** What a session is, in the words a supervisor needs: idle, asking, broken or on a limit are different things. */
  const moodWord = (state: WorkingState | undefined): string => {
    if (!state || state.mood === 'empty') return 'not started';
    if (state.mood === 'resting' && state.failure?.bankable) {
      return `waiting out a limit or outage (${state.failure.doing.replace(/\.$/, '')})`;
    }
    if (state.mood === 'resting') {
      const how = state.told.ended;
      return how === 'stopped'
        ? 'idle, its last turn was stopped'
        : state.told.turns
          ? 'idle, its last turn finished'
          : 'idle, nothing asked of it yet';
    }
    if (state.mood === 'hurt') return `broken (${state.doing.replace(/\.$/, '')})`;
    if (state.mood === 'asking')
      return state.asking ? 'asking a question' : 'its answer ended on a question';
    if (state.mood === 'arriving') return 'starting up';
    return 'working';
  };

  /** Waits, briefly, for a session to be in a state, so what is said about it is what happened. */
  const settle = async (
    task: string,
    ok: (state: WorkingState) => boolean,
    ms: number
  ): Promise<WorkingState> => {
    const until = Date.now() + ms;
    for (;;) {
      const state = peek(agents.working(task));
      if (ok(state) || Date.now() >= until) return state;
      await sleep(100);
    }
  };
  /**
   * A stop that sticks. Notes from other sessions waiting their turn would
   * start a new turn the moment this one is called off, so they go first (the
   * person's own queued words are never touched). Says how many went.
   */
  const dropSessionNotes = async (task: string): Promise<number> => {
    let dropped = 0;
    for (const note of peek(agents.working(task)).queued) {
      /* Notes from sessions are hidden context with no words of their own
         in the queue, which is what tells them from the person's. */
      if (note.text.trim()) continue;
      const done = await agents.unsay(task, note.id);
      if (done.success) dropped += 1;
      else trace('could not drop a waiting note', { task, error: done.error });
    }
    trace('waiting notes', {
      task,
      queued: peek(agents.working(task)).queued.map((note) => note.text.slice(0, 60)),
      dropped,
    });
    return dropped;
  };
  const quiet = (state: WorkingState) => state.mood !== 'working' && state.mood !== 'arriving';
  const busy = (state: WorkingState) => state.mood === 'working' || state.mood === 'arriving';

  const sessions = async (body: { cwd?: string; conversation?: string }) => {
    const near = await neighbours(body);
    if (!near) return { ok: false, text: 'that folder is not one of the village’s projects.' };
    const names = new Map(
      (await tasks.workspaces(near.project)).map((each) => [each.id, each.name])
    );
    const lines = near.all.map((each) => {
      const state = peek(agents.working(each.id));
      const where = each.workspace
        ? (names.get(each.workspace) ?? 'a workspace')
        : 'project folder';
      const role = each.lead
        ? ' [lead]'
        : each.under
          ? ` [crew of ${near.all.find((one) => one.id === each.under)?.title ?? 'a lead'}]`
          : '';
      const doing =
        state?.doing && state.mood === 'working' ? `: ${state.doing.replace(/\.$/, '')}` : '';
      return `${each.id === near.me ? '(you) ' : ''}${each.title} [${each.id}]${role} in ${where}, ${moodWord(state)}${doing}`;
    });
    return { ok: true, text: lines.length ? lines.join('\n') : 'no sessions in this project.' };
  };

  const resolve = async (body: { cwd?: string; conversation?: string; session?: string }) => {
    const near = await neighbours(body);
    if (!near) return { text: 'that folder is not one of the village’s projects.' };
    const found = pick(near, String(body.session ?? ''));
    if ('text' in found) return found;
    if (found.task.id === near.me) return { text: 'that is you.' };
    return { task: found.task, me: near.all.find((each) => each.id === near.me) };
  };

  const trace = (what: string, fields: Record<string, unknown>) =>
    log.info(`door: ${what}`, { area: 'door', ...fields });

  /**
   * Says something to another session, and says what became of it.
   *
   * `queue` leaves it for the session's next pause, or reads it now if it is
   * idle; `interrupt` stops what it is doing first and says this instead.
   * Either way the answer reports the state it found, what was done and what
   * the session is doing now, so the caller never has to go and look.
   */
  const deliver = async (
    found: {
      task: Awaited<ReturnType<typeof tasks.list>>[number];
      me?: { id: string; title: string };
    },
    text: string,
    mode: 'queue' | 'interrupt'
  ): Promise<{ ok: boolean; text: string }> => {
    const target = found.task;
    const from = found.me?.title ?? 'another session';
    const before = peek(agents.working(target.id));
    const parts: string[] = [];
    if (mode === 'interrupt' && (before.mood === 'working' || before.mood === 'asking')) {
      crew.stopping(target.id);
      const dropped = await dropSessionNotes(target.id);
      if (dropped)
        parts.push(
          `dropped ${dropped} earlier note${dropped === 1 ? '' : 's'} still waiting for it`
        );
      const stopped = await agents.hush(target.id, false, true);
      if (!stopped.success) {
        trace('interrupt refused', { task: target.id, error: stopped.error });
        return {
          ok: false,
          text: `it would not stop (${JSON.stringify(stopped.error)}), so nothing was said.`,
        };
      }
      const after = await settle(target.id, quiet, 8000);
      parts.push(
        quiet(after)
          ? `interrupted it (it was ${before.mood === 'asking' ? 'waiting on a question' : `working: ${before.doing.replace(/\.$/, '')}`})`
          : 'asked it to stop, but it was still working after 8 seconds; the note will be read at its next pause'
      );
    }
    const wasBusy = mode === 'queue' && busy(before);
    const lead = mode === 'interrupt' ? 'STOP what you were doing. New instruction from' : 'From';
    const told = await agents.tell(
      target.id,
      '',
      undefined,
      `[mender, for the agent only: ${lead} the session "${from}": ${text}]`
    );
    if (!told.success) {
      trace('tell refused', { task: target.id, error: told.error });
      return { ok: false, text: `it would not take that: ${JSON.stringify(told.error)}` };
    }
    if (wasBusy) {
      const now = peek(agents.working(target.id));
      parts.push(
        `it was working (${before.doing.replace(/\.$/, '')}), so the note is queued and it reads it at its next pause between steps${
          now.queued.length ? ` (${now.queued.length} waiting)` : ''
        }`
      );
    } else {
      const now = await settle(target.id, busy, 5000);
      if (busy(now))
        parts.push(
          `${parts.length ? 'told it' : 'it was ' + moodWord(before) + '; told it'}, and it is working on it now`
        );
      else if (now.mood === 'hurt')
        parts.push(
          `delivered, but it is broken (${now.doing.replace(/\.$/, '')}); use restart_session`
        );
      else if (now.mood === 'asking' && now.asking)
        parts.push(
          'delivered, but it is waiting on a question that a note does not answer; use answer_session'
        );
      else parts.push(`delivered; it has not started on it yet (${moodWord(now)})`);
    }
    trace('tell', { task: target.id, from, mode, was: before.mood, chars: text.length });
    return { ok: true, text: `"${target.title}": ${parts.join('; ')}.` };
  };

  const tell = async (body: {
    cwd?: string;
    conversation?: string;
    session?: string;
    text?: string;
    mode?: string;
  }) => {
    const text = String(body.text ?? '').trim();
    if (!text) return { ok: false, text: 'say what to tell it.' };
    const found = await resolve(body);
    if ('text' in found) return { ok: false, text: found.text };
    const mode = body.mode === 'interrupt' ? 'interrupt' : 'queue';
    const out = await deliver(found, text, mode);
    if (out.ok && found.me && found.task.under === found.me.id) {
      crew.noted(found.task.id, 'nudge', text);
    }
    return out;
  };

  const read = async (body: {
    cwd?: string;
    conversation?: string;
    session?: string;
    last?: number;
  }) => {
    const found = await resolve(body);
    if ('text' in found) return { ok: false, text: found.text };
    const state = peek(agents.working(found.task.id));
    if (!state) return { ok: true, text: `"${found.task.title}" has nobody in it yet.` };
    const count = Math.max(1, Math.min(20, Math.floor(Number(body.last) || 4)));
    const said = state.lines.filter((each) => each.kind === 'said').slice(-count);
    const doing = state.doing.replace(/\.$/, '');
    const head = `"${found.task.title}" is ${moodWord(state)}${state.mood === 'working' && doing ? `: ${doing}` : ''}${state.asking ? `. It is asking: ${state.asking.text}` : ''}.`;
    const body_ = said.map((each) => each.text).join('\n\n');
    return { ok: true, text: body_ ? `${head}\n\n${body_.slice(-6000)}` : head };
  };

  const stop = async (body: {
    cwd?: string;
    conversation?: string;
    session?: string;
    then?: string;
  }) => {
    const found = await resolve(body);
    if ('text' in found) return { ok: false, text: found.text };
    if (body.then?.trim()) return deliver(found, body.then.trim(), 'interrupt');
    const before = peek(agents.working(found.task.id));
    if (before.mood !== 'working' && before.mood !== 'asking' && before.mood !== 'arriving') {
      return {
        ok: true,
        text: `"${found.task.title}" was not working (${moodWord(before)}); nothing to stop.`,
      };
    }
    crew.stopping(found.task.id);
    const dropped = await dropSessionNotes(found.task.id);
    const done = await agents.hush(found.task.id, false, true);
    if (!done.success) {
      trace('stop refused', { task: found.task.id, error: done.error });
      return { ok: false, text: `it would not stop: ${JSON.stringify(done.error)}` };
    }
    const after = await settle(found.task.id, quiet, 8000);
    trace('stop', { task: found.task.id, was: before.mood, now: after.mood });
    return {
      ok: true,
      text: quiet(after)
        ? `stopped "${found.task.title}" (it was ${before.mood === 'asking' ? 'waiting on a question' : `working: ${before.doing.replace(/\.$/, '')}`})${dropped ? `, and dropped ${dropped} note${dropped === 1 ? '' : 's'} of yours still waiting for it` : ''}. It keeps its place; tell it something to carry on.`
        : `asked "${found.task.title}" to stop but it was still working after 8 seconds. Say so again or interrupt it with tell_session mode "interrupt".`,
    };
  };

  /** Answers what a session is asking, on its behalf, and says what it did next. */
  const answer = async (body: {
    cwd?: string;
    conversation?: string;
    session?: string;
    choice?: string | number;
    choices?: (string | number)[];
    text?: string;
    talk?: boolean;
  }) => {
    const found = await resolve(body);
    if ('text' in found) return { ok: false, text: found.text };
    const target = found.task;
    const first = peek(agents.working(target.id));
    if (first.mood !== 'asking') {
      return { ok: false, text: `"${target.title}" is not asking anything (${moodWord(first)}).` };
    }
    if (!first.asking) {
      /* Its answer ended on a question: the answer is simply the next thing said. */
      const said = String(body.text ?? body.choice ?? '').trim();
      if (!said)
        return {
          ok: false,
          text: `its answer ended on a question and it is waiting for words: pass text.`,
        };
      const out = await deliver(found, said, 'queue');
      if (out.ok) crew.noted(target.id, 'answer', said);
      return out;
    }
    const answers: (string | number)[] = body.talk
      ? ['talk']
      : body.choices?.length
        ? body.choices
        : body.choice !== undefined
          ? [body.choice]
          : [];
    const written = String(body.text ?? '').trim();
    const given: string[] = [];
    if (!answers.length && !written) {
      const options = first.asking.options
        .filter((one) => !one.kind)
        .map((one, n) => `${n + 1}. ${one.name}`);
      return {
        ok: false,
        text: `say how to answer: choice (a number or part of a name) or text. It asks "${first.asking.text}"${options.length ? ` Options: ${options.join(' | ')}` : ''}`,
      };
    }
    for (const want of answers) {
      const ask = peek(agents.working(target.id)).asking;
      if (!ask) break;
      const real = ask.options.filter((one) => !one.kind);
      const talk = ask.options.find((one) => one.kind === 'talk');
      let option = want === 'talk' ? talk : undefined;
      if (want !== 'talk') {
        const n = Number(want);
        option =
          Number.isInteger(n) && n >= 1 && n <= real.length
            ? real[n - 1]
            : real.filter((one) => one.name.toLowerCase().includes(String(want).toLowerCase()))[0];
      }
      if (!option) {
        return {
          ok: false,
          text: `no option like "${want}" for "${ask.text}". Options: ${real.map((one, n) => `${n + 1}. ${one.name}`).join(' | ')}${given.length ? ` (already answered: ${given.join('; ')})` : ''}`,
        };
      }
      const sent = await agents.answer(
        target.id,
        option.requestId ?? ask.requestId,
        option.optionId
      );
      if (!sent.success)
        return { ok: false, text: `it would not take that answer: ${JSON.stringify(sent.error)}` };
      given.push(`"${ask.text}" → ${option.name}`);
      await sleep(150);
    }
    const rest = peek(agents.working(target.id));
    if (rest.mood === 'asking' && rest.asking?.multi) {
      const fin = await agents.finishAsking(target.id);
      if (!fin.success)
        return { ok: false, text: `marked, but sending failed: ${JSON.stringify(fin.error)}` };
    }
    if (written) {
      const sent = await agents.tell(target.id, written);
      if (!sent.success)
        return { ok: false, text: `it would not take that: ${JSON.stringify(sent.error)}` };
      given.push(`written: ${written.slice(0, 120)}`);
    }
    const now = await settle(
      target.id,
      (state) => state.mood !== 'asking' || state.asking?.requestId !== first.asking?.requestId,
      4000
    );
    crew.noted(target.id, 'answer', given.join('; '));
    trace('answer', { task: target.id, given });
    const more =
      now.mood === 'asking' && now.asking
        ? ` It is now asking another thing: "${now.asking.text}".`
        : '';
    return {
      ok: true,
      text: `answered "${target.title}": ${given.join('; ')}. It is now ${moodWord(now)}.${more}`,
    };
  };

  /** Brings a broken or stopped session back, and says whether it held. */
  const restart = async (body: {
    cwd?: string;
    conversation?: string;
    session?: string;
    how?: string;
    note?: string;
    what?: string;
    force?: boolean;
  }) => {
    const found = await resolve(body);
    if ('text' in found) return { ok: false, text: found.text };
    const target = found.task;
    const before = peek(agents.working(target.id));
    if (before.mood === 'working' && !body.force) {
      return {
        ok: false,
        text: `"${target.title}" is working (${before.doing.replace(/\.$/, '')}); a restart would cut it off. Stop or interrupt it instead, or pass force.`,
      };
    }
    const fresh = body.how === 'fresh';
    if (fresh) {
      const brief = String(body.what ?? '').trim();
      if (!brief)
        return {
          ok: false,
          text: 'a fresh start forgets the whole conversation, so say what it is to do now in `what`.',
        };
      if (!body.force)
        return {
          ok: false,
          text: `a fresh start throws away everything "${target.title}" has been told and done in this conversation (its files and branch stay). Pass force to do it.`,
        };
      await agents.startOver(target.id);
      const told = await agents.tell(target.id, brief);
      if (!told.success)
        return {
          ok: false,
          text: `started over but it would not take the brief: ${JSON.stringify(told.error)}`,
        };
      crew.noted(target.id, 'restart');
      const now = await settle(
        target.id,
        (state) => state.mood === 'working' || state.mood === 'hurt',
        15_000
      );
      trace('restart fresh', { task: target.id, was: before.mood, now: now.mood });
      return {
        ok: now.mood !== 'hurt',
        text: `"${target.title}" started over on a new conversation: it is ${moodWord(now)}.`,
      };
    }
    const note = String(body.note ?? '').trim();
    await agents.rest(target.id);
    const told = await agents.tell(
      target.id,
      '',
      undefined,
      `[mender, for the agent only: the village restarted you after "${before.doing.replace(/\.$/, '')}". Carry on from where you were.${note ? ` ${found.me?.title ?? 'Your lead'} adds: ${note}` : ''}]`
    );
    if (!told.success)
      return { ok: false, text: `it would not start again: ${JSON.stringify(told.error)}` };
    crew.noted(target.id, 'restart');
    const now = await settle(
      target.id,
      (state) => state.mood === 'working' || state.mood === 'hurt',
      15_000
    );
    trace('restart', { task: target.id, was: before.mood, now: now.mood });
    if (now.mood === 'hurt') {
      return {
        ok: false,
        text: `restarted "${target.title}" but it broke again straight away: ${now.doing.replace(/\.$/, '')}. This is a second failure; escalate rather than retrying.`,
      };
    }
    if (now.mood === 'working')
      return {
        ok: true,
        text: `restarted "${target.title}" (it was ${moodWord(before)}); it is working again.`,
      };
    return {
      ok: true,
      text: `restarted "${target.title}"; it is ${moodWord(now)} (it has not started working yet).`,
    };
  };

  const home = async (body: { cwd?: string; conversation?: string; session?: string }) => {
    const found = await resolve(body);
    if ('text' in found) return { ok: false, text: found.text };
    const before = peek(agents.working(found.task.id));
    const done = await agents.rest(found.task.id);
    if (!done.success)
      return { ok: false, text: `it would not go home: ${JSON.stringify(done.error)}` };
    trace('home', { task: found.task.id, was: before.mood });
    return {
      ok: true,
      text: `sent "${found.task.title}" home (it was ${moodWord(before)}): its process is stopped; its workspace, branch and conversation all stay. Telling it anything wakes it again.`,
    };
  };

  /** The lead's overview: who needs the person, who needs the lead, who is fine, who is done. */
  const crewStatus = async (body: { cwd?: string; conversation?: string }) => {
    const near = await neighbours(body);
    if (!near) return { ok: false, text: 'that folder is not one of the village’s projects.' };
    if (!near.me) return { ok: false, text: 'only a session can ask for its crew.' };
    const rows = crew.crewOf(near.me).flatMap((one) => crew.row(one.id) ?? []);
    const launching = peek(crew.rows(near.me)).filter((one) => one.launching);
    if (!rows.length && !launching.length)
      return {
        ok: true,
        text: 'you have no crew yet. launch_tickets or start_session makes some.',
      };
    const group = (row: NonNullable<(typeof rows)[number]>): number => {
      if (row.escalated || (row.mood === 'hurt' && row.restarts >= 2)) return 0;
      if (row.mood === 'asking' || row.stuck || row.mood === 'hurt') return 1;
      if (row.mood === 'working' || row.mood === 'arriving') return 3;
      if (row.failure?.bankable) return 4;
      return 5;
    };
    const names = [
      'WITH THE PERSON',
      'NEEDS YOU',
      '',
      'WORKING',
      'WAITING OUT A LIMIT',
      'IDLE OR FINISHED',
    ];
    const sorted = [...rows].sort((a, b) => group(a) - group(b));
    const out: string[] = [];
    let last = -1;
    for (const row of sorted) {
      const g = group(row);
      if (g !== last) {
        out.push(`${last >= 0 ? '\n' : ''}${names[g]}:`);
        last = g;
      }
      const flags = [
        row.escalated && 'escalated to the person',
        row.stuck && `STUCK: ${row.stuck.said}`,
        row.asked && `asking: "${row.asked.text.slice(0, 160)}"`,
        row.mood === 'hurt' && row.failure && `broken: ${row.failure.doing.replace(/\.$/, '')}`,
        row.restarts && `restarted ${row.restarts}×`,
        row.failure?.bankable &&
          row.failure.resetAt &&
          `back ${new Date(row.failure.resetAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`,
      ].filter(Boolean);
      const plan = row.plan.total
        ? `step ${Math.min(row.plan.done + 1, row.plan.total)}/${row.plan.total}${row.plan.now ? ` "${row.plan.now}"` : ''}`
        : '';
      const since = row.since && row.mood === 'working' ? `${clock(Date.now() - row.since)}` : '';
      const where = STAGE_WORDS[row.stage] + (row.stageOnItsWord ? ' (its own word)' : '');
      const offPath =
        row.mood === 'working' || row.mood === 'resting' || row.mood === 'arriving'
          ? ''
          : ` (${row.mood})`;
      const shots = row.shots.length ? ` | ${row.shots.length} screenshots` : '';
      const mr =
        row.mr && !row.mr.unknown && row.mr.state !== 'none'
          ? ` | MR ${mergeRequestSaid(row.mr)}`
          : '';
      out.push(
        `- ${row.ticket ? `${row.ticket.key} ` : ''}"${row.title}" [${row.task}] ${where}${offPath}${since ? ` ${since}` : ''}${plan ? `, ${plan}` : ''}${flags.length ? ` | ${flags.join(' | ')}` : ''}${shots}${mr}`
      );
    }
    for (const row of launching)
      out.push(
        `- ${row.title} being set up (${clock(Date.now() - (row.launching?.at ?? Date.now()))})`
      );
    return { ok: true, text: out.join('\n') };
  };

  const report = async (body: { cwd?: string; conversation?: string; session?: string }) => {
    const found = await resolve(body);
    if ('text' in found) return { ok: false, text: found.text };
    const looked = await crew.look(found.task.id);
    if (!looked) return { ok: false, text: 'it has gone.' };
    return { ok: true, text: looked.text };
  };

  const escalate = async (body: {
    cwd?: string;
    conversation?: string;
    session?: string;
    question?: string;
  }) => {
    const found = await resolve(body);
    if ('text' in found) return { ok: false, text: found.text };
    const question = String(body.question ?? '').trim();
    if (!question) return { ok: false, text: 'say what the person has to decide.' };
    if (!found.me) return { ok: false, text: 'only a session can escalate.' };
    await crew.escalate(found.me.id, found.task.id, question);
    return {
      ok: true,
      text: `recorded: "${found.task.title}" is waiting on the person for "${question}". Now put it to them yourself, plainly, as a choice with AskUserQuestion; the crew session keeps waiting or carries on with other work. When they answer, pass it on with tell_session (or answer_session if it is asking), which clears the escalation.`,
    };
  };

  /** A crew session asking its lead, rather than stopping for the person. */
  const askLead = async (body: {
    cwd?: string;
    conversation?: string;
    question?: string;
    options?: string[];
  }) => {
    const near = await neighbours(body);
    if (!near?.me) return { ok: false, text: 'only a session can ask its lead.' };
    const me = near.all.find((one) => one.id === near.me);
    if (!me?.under) return { ok: false, text: 'you have no lead; ask the person directly.' };
    if (!near.all.some((one) => one.id === me.under))
      return { ok: false, text: 'your lead has gone; ask the person directly.' };
    const question = String(body.question ?? '').trim();
    if (!question) return { ok: false, text: 'say what you need decided.' };
    const options = (body.options ?? []).map(String).filter(Boolean);
    crew.question(me.id, question);
    crew.push(me.under, {
      task: me.id,
      kind: 'asked',
      at: Date.now(),
      said: `${me.title} [${me.id}] asks you directly: "${question}"${options.length ? ` Its options: ${options.map((one, n) => `${n + 1}. ${one}`).join(' | ')}.` : ''} Answer with tell_session if the ticket decides it; otherwise escalate it to the person.`,
    });
    trace('ask lead', { crew: me.id, lead: me.under });
    return {
      ok: true,
      text: 'asked your lead. Its answer arrives as a note from it. Carry on with whatever you can do without it, or finish your turn here and wait; do not poll.',
    };
  };

  const launchTickets = async (body: {
    cwd?: string;
    conversation?: string;
    keys?: string[];
    site?: string;
  }) => {
    const here = await whereIs(String(body.cwd ?? ''));
    if (!here) return { ok: false, text: 'that folder is not one of the village’s projects.' };
    const me = agents.taskOf(String(body.conversation ?? ''));
    if (!me) return { ok: false, text: 'only a session can launch tickets.' };
    const keys = [
      ...new Set((body.keys ?? []).map((one) => String(one).trim().toUpperCase()).filter(Boolean)),
    ];
    if (!keys.length) return { ok: false, text: 'say which tickets (keys like INV-123).' };
    const where = await launch.siteFor(here.project, body.site);
    if ('said' in where) return { ok: false, text: where.said };
    const taken = await jira.taken();
    const mine = new Set(crew.crewOf(me).map((one) => one.id));
    const have = keys.filter((key) => taken.some((one) => one.key === key && mine.has(one.task)));
    const todo = keys.filter((key) => !have.includes(key));
    if (!todo.length)
      return {
        ok: true,
        text: `${have.join(', ')} ${have.length === 1 ? 'is' : 'are'} already launched under you; nothing to do.`,
      };
    for (const key of todo) crew.launching(me, key, true);
    log.info('door: launching tickets', { area: 'door', lead: me, keys: todo, site: where.site });
    void (async () => {
      for (const key of todo) {
        let done;
        try {
          done = await launch.one(here.project, where.site, key, (task) =>
            crew.adopt(task.id, me, { site: where.site, key })
          );
        } catch (caught) {
          noteCaught('session-door.ts:launch', caught);
          done = {
            key,
            ok: false,
            text: `${key}: launching failed (${String((caught as Error)?.message ?? caught)})`,
          };
        }
        crew.launching(me, key, false);
        crew.push(me, {
          task: done.task ?? key,
          kind: done.ok ? 'launched' : 'launch-failed',
          at: Date.now(),
          said: done.ok
            ? `${done.text} It is crew under you: you will hear when it asks, breaks, hits a limit, finishes or gets stuck.`
            : `${done.text} Nothing is running for it; launch it again or tell the person.`,
        });
      }
    })();
    return {
      ok: true,
      text: `launching ${todo.join(', ')} in the background, one after another (each cuts its own workspace, moves its ticket out of to-do and starts a session with the windmill's recipe)${have.length ? `; ${have.join(', ')} already launched` : ''}. Each reports into your conversation as it comes up; do not wait for them.`,
    };
  };

  const supervise = async (body: {
    cwd?: string;
    conversation?: string;
    session?: string;
    release?: boolean;
  }) => {
    const found = await resolve(body);
    if ('text' in found) return { ok: false, text: found.text };
    if (!found.me) return { ok: false, text: 'only a session can supervise.' };
    if (found.task.lead) return { ok: false, text: 'that is a lead; a lead is not crew.' };
    if (body.release) {
      await crew.release(found.task.id);
      return { ok: true, text: `"${found.task.title}" is no longer crew under you.` };
    }
    await crew.adopt(found.task.id, found.me.id);
    return {
      ok: true,
      text: `"${found.task.title}" is now crew under you: you will hear when it asks, breaks, hits a limit, finishes or gets stuck. Its tools were fixed when it started, so it will not have ask_lead until it is next started afresh.`,
    };
  };

  const close = async (body: {
    cwd?: string;
    conversation?: string;
    session?: string;
    force?: boolean;
  }) => {
    const found = await resolve(body);
    if ('text' in found) return { ok: false, text: found.text };
    const mood = peek(agents.working(found.task.id))?.mood;
    if ((mood === 'working' || mood === 'asking') && !body.force) {
      return {
        ok: false,
        text: `"${found.task.title}" is still ${mood}. Stop it first, or close it with force if you mean to cut it off.`,
      };
    }
    await tasks.abandon(found.task.id);
    return {
      ok: true,
      text: `closed "${found.task.title}". Its files stay where they are; the person can bring it back with command-shift-T until the app restarts.`,
    };
  };

  const setModel = async (body: {
    cwd?: string;
    conversation?: string;
    session?: string;
    model?: string;
  }) => {
    const found = await resolve(body);
    if ('text' in found) return { ok: false, text: found.text };
    const conversation = agents.conversationOf(found.task.id);
    if (!conversation)
      return { ok: false, text: `"${found.task.title}" has no agent awake to switch.` };
    const before = peek(agents.working(found.task.id));
    const now = peek(agents.kit(found.task.id));
    const was = now.models.find((one) => one.id === now.model)?.name ?? now.model ?? 'its default';
    const out = await agents.switchModel(conversation, String(body.model ?? ''));
    if (!out.ok) return out;
    trace('model', { task: found.task.id, was, to: body.model });
    return {
      ok: true,
      text: `"${found.task.title}" was on ${was}. ${out.text}${busy(before) ? ' It is mid-turn, so the current turn finishes on the old one.' : ''}`,
    };
  };

  const workspacesOf = async (body: { cwd?: string; conversation?: string }) => {
    const near = await neighbours(body);
    if (!near) return null;
    return { ...near, here: await whereIs(String(body.cwd ?? '')) };
  };

  const moodsIn = (all: Awaited<ReturnType<typeof tasks.list>>) =>
    all.map((each) => {
      const state = peek(agents.working(each.id));
      return { task: each, mood: state?.mood ?? 'empty', doing: state?.doing ?? '' };
    });

  const listWorkspaces = async (body: { cwd?: string; conversation?: string }) => {
    const near = await workspacesOf(body);
    if (!near) return { ok: false, text: 'that folder is not one of the village’s projects.' };
    const standing = await tasks.workspaces(near.project);
    const blocks: string[] = [];
    const describe = async (name: string, id: string | null, branch: string, mine: boolean) => {
      const inside = moodsIn(
        near.all.filter((each) => (id ? each.workspace === id : !each.workspace))
      );
      const cost = id ? await tasks.dropCost(id) : null;
      const lines = [
        `${mine ? '(you are here) ' : ''}${name}${id ? ` [${id}]` : ''}${branch ? ` on ${branch}` : ''}`,
      ];
      if (cost) {
        lines.push(
          `  ${cost.uncommitted} uncommitted file${cost.uncommitted === 1 ? '' : 's'}, ${cost.unshared} commit${cost.unshared === 1 ? '' : 's'} not pushed anywhere`
        );
      }
      if (!inside.length) lines.push('  nobody in it');
      for (const each of inside) {
        lines.push(
          `  ${each.task.title} [${each.task.id}] ${each.mood}${each.doing ? `: ${each.doing.replace(/\.$/, '')}` : ''}`
        );
      }
      blocks.push(lines.join('\n'));
    };
    await describe('the project folder', null, '', !near.here?.workspace);
    for (const each of standing) {
      await describe(each.name, each.id, each.branch, near.here?.workspace === each.id);
    }
    return { ok: true, text: blocks.join('\n\n') };
  };

  const makeWorkspace = async (body: { cwd?: string; conversation?: string; name?: string }) => {
    const near = await workspacesOf(body);
    if (!near) return { ok: false, text: 'that folder is not one of the village’s projects.' };
    const made = await tasks.cutWorkspace(near.project, body.name);
    if (!made.success) {
      return {
        ok: false,
        text:
          made.error.kind === 'already-here'
            ? `there is already a workspace called "${made.error.name}".`
            : `could not cut it: ${JSON.stringify(made.error)}`,
      };
    }
    return {
      ok: true,
      text: `cut the workspace "${made.data.name}" [${made.data.id}] on ${made.data.branch}, with nobody in it. Start sessions in it with start_session and workspace set to its name.`,
    };
  };

  const renameWorkspace = async (body: {
    cwd?: string;
    conversation?: string;
    workspace?: string;
    name?: string;
  }) => {
    const near = await workspacesOf(body);
    if (!near) return { ok: false, text: 'that folder is not one of the village’s projects.' };
    const written = String(body.name ?? '').trim();
    if (!written) return { ok: false, text: 'say what to call it.' };
    const found = await findWorkspace(near.project, String(body.workspace ?? ''));
    if ('text' in found) return { ok: false, text: found.text };
    const clash = (await tasks.workspaces(near.project)).find(
      (each) => each.id !== found.workspace.id && each.name === written
    );
    if (clash) return { ok: false, text: `there is already a workspace called "${written}".` };
    await tasks.renameWorkspace(found.workspace.id, written);
    return {
      ok: true,
      text: `"${found.workspace.name}" is now "${written}". Its branch keeps its name.`,
    };
  };

  const deleteWorkspace = async (body: {
    cwd?: string;
    conversation?: string;
    workspace?: string;
    force?: boolean;
  }) => {
    const near = await workspacesOf(body);
    if (!near) return { ok: false, text: 'that folder is not one of the village’s projects.' };
    const found = await findWorkspace(near.project, String(body.workspace ?? ''));
    if ('text' in found) return { ok: false, text: found.text };
    const { workspace } = found;
    if (near.here?.workspace === workspace.id) {
      return {
        ok: false,
        text: 'you are standing in that workspace; it cannot be deleted from inside.',
      };
    }
    const cost = await tasks.dropCost(workspace.id);
    const busy = moodsIn(near.all.filter((each) => each.workspace === workspace.id)).filter(
      (each) => each.mood === 'working' || each.mood === 'asking'
    );
    const risks: string[] = [];
    if (busy.length)
      risks.push(
        `${busy.map((each) => `"${each.task.title}"`).join(', ')} still working or asking`
      );
    if (cost.uncommitted)
      risks.push(`${cost.uncommitted} uncommitted file${cost.uncommitted === 1 ? '' : 's'}`);
    if (cost.unshared)
      risks.push(
        `${cost.unshared} commit${cost.unshared === 1 ? '' : 's'} that exist nowhere else`
      );
    if (risks.length && !body.force) {
      return {
        ok: false,
        text: `not deleted. "${workspace.name}" has ${risks.join(', ')}. Deleting takes its folder, its branch and every session in it. Commit or merge what matters and stop whoever is working, or delete with force if you mean to lose it.`,
      };
    }
    await tasks.dropWorkspace(workspace.id);
    return {
      ok: true,
      text: `deleted "${workspace.name}": its folder, its branch ${workspace.branch} and ${cost.sessions} session${cost.sessions === 1 ? '' : 's'}.`,
    };
  };

  const routes: Record<string, (body: never) => Promise<{ ok: boolean; text: string }>> = {
    '/start': start as never,
    '/table': table as never,
    '/model': model as never,
    '/sessions': sessions as never,
    '/tell': tell as never,
    '/read': read as never,
    '/stop': stop as never,
    '/close': close as never,
    '/model-of': setModel as never,
    '/answer': answer as never,
    '/restart': restart as never,
    '/home': home as never,
    '/crew': crewStatus as never,
    '/report': report as never,
    '/escalate': escalate as never,
    '/ask-lead': askLead as never,
    '/launch': launchTickets as never,
    '/supervise': supervise as never,
    '/workspaces': listWorkspaces as never,
    '/workspace-new': makeWorkspace as never,
    '/workspace-rename': renameWorkspace as never,
    '/workspace-delete': deleteWorkspace as never,
  };

  const server = createServer((request, response) => {
    const done = (code: number, payload: unknown) => {
      response.writeHead(code, { 'content-type': 'application/json' });
      response.end(JSON.stringify(payload));
    };
    const route = request.url ? routes[request.url] : undefined;
    if (request.method !== 'POST' || !route) return done(404, {});
    if (request.headers.authorization !== `Bearer ${token}`) return done(401, {});
    let raw = '';
    request.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 100_000) request.destroy();
    });
    request.on('end', () => {
      let body: unknown;
      try {
        body = JSON.parse(raw);
      } catch (caught) {
        noteCaught('session-door.ts:432', caught);
        return done(400, { ok: false, text: 'not json.' });
      }
      route(body as never).then(
        (result) => done(200, result),
        (error) => done(500, { ok: false, text: String(error?.message ?? error) })
      );
    });
  });

  const file = doorFile();
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    if (!address || typeof address === 'string') return;
    void mkdir(dirname(file), { recursive: true })
      .then(() => writeFile(file, JSON.stringify({ port: address.port, token }), { mode: 0o600 }))
      .catch(lost('session-door.ts:448'));
  });

  return {
    dispose() {
      server.close();
      void rm(file, { force: true });
    },
  };
}
