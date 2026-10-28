import { randomBytes } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, join, sep } from 'node:path';
import { pluginRegistry } from '@emdash/plugins/agents';
import { peek } from '@emdash/wire/state';
import { app, BrowserWindow } from 'electron';
import { MENDER_ATTEND_CHANNEL, MENDER_TABLE_CHANNEL } from '@shared/channels';
import type { Agents } from './agents';
import type { Projects } from './projects';
import type { Tasks } from './tasks';

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

export function openSessionDoor(tasks: Tasks, agents: Agents, projects: Projects): SessionDoor {
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

  const start = async (body: Start): Promise<{ ok: boolean; text: string }> => {
    const what = String(body.what ?? '').trim();
    if (!what) return { ok: false, text: 'say what the new session is for.' };
    const here = await whereIs(String(body.cwd ?? ''));
    if (!here) return { ok: false, text: 'that folder is not one of the village’s projects.' };

    const made = await tasks.begin(
      here.project,
      what,
      null,
      body.terminal ? 'shell' : undefined,
      undefined,
      body.isolated ? true : undefined,
      body.isolated ? undefined : here.workspace
    );
    if (!made.success) {
      return { ok: false, text: `could not start it: ${JSON.stringify(made.error)}` };
    }
    const id = made.data.id;
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
      text: `started "${made.data.title}" in ${body.isolated ? 'its own copy' : here.workspace ? 'this workspace' : 'the project folder'}; its lantern is on the rail.`,
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
    const hits = exact.length ? exact : near.all.filter((each) => each.title.toLowerCase().includes(want));
    if (hits.length === 1) return { task: hits[0] };
    if (!hits.length) return { text: `no session like "${which}" in this project.` };
    return { text: `"${which}" matches more than one: ${hits.map((each) => each.title).join(', ')}.` };
  };

  const sessions = async (body: { cwd?: string; conversation?: string }) => {
    const near = await neighbours(body);
    if (!near) return { ok: false, text: 'that folder is not one of the village’s projects.' };
    const lines = near.all.map((each) => {
      const state = peek(agents.working(each.id));
      const mood = state?.mood ?? 'empty';
      return `${each.id === near.me ? '(you) ' : ''}${each.title} [${each.id}] ${mood}${state?.doing ? `: ${state.doing}` : ''}`;
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

  const tell = async (body: { cwd?: string; conversation?: string; session?: string; text?: string }) => {
    const text = String(body.text ?? '').trim();
    if (!text) return { ok: false, text: 'say what to tell it.' };
    const found = await resolve(body);
    if ('text' in found) return { ok: false, text: found.text };
    const from = found.me?.title ?? 'another session';
    const told = await agents.tell(found.task.id, `From the session "${from}": ${text}`);
    if (!told.success) return { ok: false, text: `it would not take that: ${JSON.stringify(told.error)}` };
    return { ok: true, text: `told "${found.task.title}". It reads it at its next pause, or now if it is idle; use read_session to see what comes of it.` };
  };

  const read = async (body: { cwd?: string; conversation?: string; session?: string; last?: number }) => {
    const found = await resolve(body);
    if ('text' in found) return { ok: false, text: found.text };
    const state = peek(agents.working(found.task.id));
    if (!state) return { ok: true, text: `"${found.task.title}" has nobody in it yet.` };
    const count = Math.max(1, Math.min(20, Math.floor(Number(body.last) || 4)));
    const said = state.lines.filter((each) => each.kind === 'said').slice(-count);
    const doing = state.doing.replace(/\.$/, '');
    const head = `"${found.task.title}" is ${state.mood}${doing ? `: ${doing}` : ''}${state.asking ? `. It is asking: ${state.asking.text}` : ''}.`;
    const body_ = said.map((each) => each.text).join('\n\n');
    return { ok: true, text: body_ ? `${head}\n\n${body_.slice(-6000)}` : head };
  };

  const stop = async (body: { cwd?: string; conversation?: string; session?: string }) => {
    const found = await resolve(body);
    if ('text' in found) return { ok: false, text: found.text };
    const done = await agents.hush(found.task.id, false, true);
    if (!done.success) return { ok: false, text: `it would not stop: ${JSON.stringify(done.error)}` };
    return { ok: true, text: `stopped "${found.task.title}". It keeps its place; tell it something to carry on.` };
  };

  const close = async (body: { cwd?: string; conversation?: string; session?: string; force?: boolean }) => {
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

  const setModel = async (body: { cwd?: string; conversation?: string; session?: string; model?: string }) => {
    const found = await resolve(body);
    if ('text' in found) return { ok: false, text: found.text };
    const conversation = agents.conversationOf(found.task.id);
    if (!conversation) return { ok: false, text: `"${found.task.title}" has no agent awake to switch.` };
    return agents.switchModel(conversation, String(body.model ?? ''));
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
      } catch {
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
      .catch(() => undefined);
  });

  return {
    dispose() {
      server.close();
      void rm(file, { force: true });
    },
  };
}
