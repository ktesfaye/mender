import { randomBytes } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, join, sep } from 'node:path';
import { pluginRegistry } from '@emdash/plugins/agents';
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

  const server = createServer((request, response) => {
    const done = (code: number, payload: unknown) => {
      response.writeHead(code, { 'content-type': 'application/json' });
      response.end(JSON.stringify(payload));
    };
    if (request.method !== 'POST' || (request.url !== '/start' && request.url !== '/table' && request.url !== '/model'))
      return done(404, {});
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
      (request.url === '/table'
        ? table(body as Table)
        : request.url === '/model'
          ? model(body as { conversation?: string; model?: string })
          : start(body as Start)
      ).then(
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
