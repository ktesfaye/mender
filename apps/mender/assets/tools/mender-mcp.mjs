#!/usr/bin/env node
/**
 * What a session here can ask of the village itself. One tool today: start
 * another session, in the open, the way the empty hook on the rail would, so
 * the person watching sees its lantern hang and the window walk into it.
 *
 * A plain MCP server over stdio, no dependencies, like the screen-control one.
 * It knows which folder its session works in from MENDER_CWD and reaches the
 * app through the port and token in the door file the app writes at start.
 */
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';

async function knock(args) {
  const file = process.env.MENDER_DOOR;
  if (!file) throw new Error('this session was not started by Mender, so there is no village to ask.');
  let door;
  try {
    door = JSON.parse(await readFile(file, 'utf8'));
  } catch {
    throw new Error('Mender is not answering; is the app running?');
  }
  const res = await fetch(`http://127.0.0.1:${door.port}/start`, {
    method: 'POST',
    headers: { authorization: `Bearer ${door.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ ...args, cwd: process.env.MENDER_CWD ?? process.cwd() }),
  });
  const out = await res.json().catch(() => ({ ok: false, text: `Mender answered ${res.status}.` }));
  if (!out.ok) throw new Error(out.text);
  return out.text;
}

const TOOLS = [
  {
    name: 'start_session',
    description:
      'Starts a new Mender session, visibly: its lantern hangs on the rail, an agent wakes in it and is told `what`, and the person is walked into it, so they watch it work. Use this whenever you are asked to launch, open or spin up another session or another agent here, instead of clicking the lantern or running a background `claude`. It starts in the same workspace as you unless `isolated` is set.',
    inputSchema: {
      type: 'object',
      properties: {
        what: { type: 'string', description: 'The first thing said to the new session: what it is for.' },
        agent: { type: 'string', description: 'Agent id to work in it (e.g. "claude"). Defaults to the person\'s usual one.' },
        isolated: { type: 'boolean', description: 'Give it its own worktree on a branch of its own.' },
        terminal: { type: 'boolean', description: 'Open it as a plain terminal and run `what` as its first command, instead of a chat.' },
        show: { type: 'boolean', description: 'Walk the person into it. Default true; false keeps them where they are.' },
      },
      required: ['what'],
      additionalProperties: false,
    },
    run: knock,
  },
];

const send = (msg) => process.stdout.write(JSON.stringify(msg) + '\n');
const reply = (id, result) => send({ jsonrpc: '2.0', id, result });

const rl = createInterface({ input: process.stdin, terminal: false });
rl.on('line', async (line) => {
  let msg;
  try {
    msg = JSON.parse(line.trim());
  } catch {
    return;
  }
  const { id, method, params } = msg;
  if (method === 'initialize') {
    return reply(id, {
      protocolVersion: '2025-06-18',
      capabilities: { tools: {} },
      serverInfo: { name: 'mender', version: '0.1.0' },
    });
  }
  if (method?.startsWith('notifications/')) return;
  if (method === 'ping') return reply(id, {});
  if (method === 'tools/list') {
    return reply(id, { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
  }
  if (method === 'tools/call') {
    const tool = TOOLS.find((t) => t.name === params?.name);
    if (!tool) return send({ jsonrpc: '2.0', id, error: { code: -32000, message: `no such tool: ${params?.name}` } });
    try {
      reply(id, { content: [{ type: 'text', text: await tool.run(params?.arguments ?? {}) }], isError: false });
    } catch (error) {
      reply(id, { content: [{ type: 'text', text: String(error?.message ?? error) }], isError: true });
    }
    return;
  }
  if (id !== undefined) send({ jsonrpc: '2.0', id, error: { code: -32601, message: `unknown method: ${method}` } });
});
process.stdin.resume();
