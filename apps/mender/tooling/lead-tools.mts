/**
 * A lead must be unable to touch code, and that has to be true of what the
 * model is actually handed, not of what a prompt asks.
 *
 * Starts the real Claude bridge three times against a fake Anthropic API,
 * exactly the way the village starts a session (same `_meta`, the village's
 * own tool server with the role in its environment), and reads the tools the
 * model was sent: a lead, crew under one, and a plain session. Nothing
 * reaches Anthropic and nothing costs anything.
 *
 *   pnpm --filter @emdash/mender check:lead
 */
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { Readable, Writable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { ClientSideConnection, ndJsonStream } from '@agentclientprotocol/sdk';
import { clientCapabilities } from '../../../packages/core/src/runtimes/acp/node/connection/client-capabilities.ts';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, '../../../packages/plugins/package.json'));
const adapter = require.resolve('@agentclientprotocol/claude-agent-acp/dist/index.js');
const tools = join(here, '../assets/tools');
const claude = execFileSync('which', ['claude'], { encoding: 'utf8' }).trim();

const LEAD_META = {
  claudeCode: {
    options: {
      tools: ['AskUserQuestion'],
      disallowedTools: [
        'Bash',
        'Edit',
        'Write',
        'Read',
        'Glob',
        'Grep',
        'WebFetch',
        'WebSearch',
        'Task',
        'Agent',
        'TodoWrite',
        'Skill',
      ],
      strictMcpConfig: true,
    },
  },
};

function fakeApi(): Promise<{ port: number; tools: () => string[]; close: () => void }> {
  const seen: string[][] = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      if (!req.url?.startsWith('/v1/messages') || req.url.includes('count_tokens')) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(req.url?.includes('count_tokens') ? '{"input_tokens":1}' : '{}');
        return;
      }
      let json: { tools?: { name: string }[]; model?: string } = {};
      try {
        json = JSON.parse(body);
      } catch {}
      seen.push((json.tools ?? []).map((tool) => tool.name));
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      const send = (event: string, data: object) =>
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      send('message_start', {
        type: 'message_start',
        message: {
          id: 'm',
          type: 'message',
          role: 'assistant',
          model: json.model ?? 'x',
          content: [],
          stop_reason: null,
          usage: { input_tokens: 1, output_tokens: 1 },
        },
      });
      send('content_block_start', {
        type: 'content_block_start',
        index: 0,
        content_block: { type: 'text', text: '' },
      });
      send('content_block_delta', {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text: 'ok' },
      });
      send('content_block_stop', { type: 'content_block_stop', index: 0 });
      send('message_delta', {
        type: 'message_delta',
        delta: { stop_reason: 'end_turn' },
        usage: { output_tokens: 1 },
      });
      send('message_stop', { type: 'message_stop' });
      res.end();
    });
  });
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () =>
      resolve({
        port: (server.address() as { port: number }).port,
        tools: () => [...seen].sort((a, b) => b.length - a.length)[0] ?? [],
        close: () => server.close(),
      })
    )
  );
}

async function sessionTools(
  role: '' | 'lead' | 'crew',
  meta: Record<string, unknown>
): Promise<string[]> {
  const api = await fakeApi();
  const dir = mkdtempSync(join(tmpdir(), 'mender-lead-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  writeFileSync(join(dir, 'README.md'), 'x\n');
  const env = { ...process.env };
  delete env.CLAUDE_CODE_OAUTH_TOKEN;
  delete env.ANTHROPIC_AUTH_TOKEN;
  const child = spawn(process.execPath, [adapter], {
    cwd: dir,
    env: {
      ...env,
      ANTHROPIC_BASE_URL: `http://127.0.0.1:${api.port}`,
      ANTHROPIC_API_KEY: 'sk-ant-lead-check',
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
      CLAUDE_CODE_EXECUTABLE: claude,
    },
    stdio: ['pipe', 'pipe', 'ignore'],
  });
  const stream = ndJsonStream(
    Writable.toWeb(child.stdin) as WritableStream<Uint8Array>,
    Readable.toWeb(child.stdout) as unknown as ReadableStream<Uint8Array>
  );
  const connection = new ClientSideConnection(
    () => ({
      sessionUpdate: async () => {},
      requestPermission: async () => ({ outcome: { outcome: 'cancelled' } }),
      createElicitation: async () => ({ action: 'cancel' }),
      readTextFile: async () => ({ content: '' }),
      writeTextFile: async () => ({}),
    }),
    stream
  );
  await connection.initialize({
    protocolVersion: 1,
    clientInfo: { name: 'emdash', version: '1' },
    clientCapabilities: clientCapabilities(true),
  });
  const session = await connection.newSession({
    cwd: dir,
    mcpServers: [
      {
        name: 'mender',
        command: 'node',
        args: [join(tools, 'mender-mcp.mjs')],
        env: [
          { name: 'MENDER_DOOR', value: '/nonexistent' },
          { name: 'MENDER_CWD', value: dir },
          { name: 'MENDER_CONVERSATION', value: 'x' },
          { name: 'MENDER_ROLE', value: role },
        ],
      },
    ],
    _meta: meta,
  });
  await connection.prompt({
    sessionId: session.sessionId,
    prompt: [{ type: 'text', text: 'say ok' }],
  });
  const got = api.tools();
  child.kill('SIGKILL');
  api.close();
  rmSync(dir, { recursive: true, force: true });
  return got;
}

/** What the village's tool server itself offers a role, asked the way an agent asks. */
async function offered(role: '' | 'lead' | 'crew'): Promise<string[]> {
  const child = spawn('node', [join(tools, 'mender-mcp.mjs')], {
    env: { ...process.env, MENDER_ROLE: role },
    stdio: ['pipe', 'pipe', 'ignore'],
  });
  const answer = new Promise<string[]>((resolve) => {
    let text = '';
    child.stdout.on('data', (chunk) => {
      text += chunk;
      for (const line of text.split('\n')) {
        try {
          const msg = JSON.parse(line);
          if (msg.id === 2) resolve(msg.result.tools.map((tool: { name: string }) => tool.name));
        } catch {}
      }
    });
  });
  child.stdin.write(
    JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }) + '\n'
  );
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) + '\n');
  const got = await answer;
  child.kill('SIGKILL');
  return got;
}

const [lead, crewOffer, plainOffer] = await Promise.all([
  sessionTools('lead', LEAD_META),
  offered('crew'),
  offered(''),
]);
const crew = crewOffer;
const plain = plainOffer;

const CODE = [
  'Bash',
  'Edit',
  'Write',
  'Read',
  'Glob',
  'Grep',
  'NotebookEdit',
  'WebFetch',
  'WebSearch',
  'Task',
  'Agent',
];
const failures: string[] = [];
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failures.push(what);
};

console.log(`lead got: ${lead.join(', ')}\n`);
check(lead.length > 0, 'the lead was started and sent the model something');
check(
  CODE.every((name) => !lead.includes(name)),
  'a lead is handed no tool that reads, edits, runs or browses'
);
check(
  lead.every(
    (name) =>
      name === 'AskUserQuestion' ||
      name === 'DeferredToolPlaceholder' ||
      name.startsWith('mcp__mender__')
  ),
  "a lead has only AskUserQuestion and the village's own tools"
);
for (const name of [
  'launch_tickets',
  'crew_status',
  'session_report',
  'tell_session',
  'stop_session',
  'answer_session',
  'restart_session',
  'send_home',
  'set_session_model',
  'escalate_to_person',
  'list_sessions',
]) {
  check(lead.includes(`mcp__mender__${name}`), `a lead has ${name}`);
}
check(
  !lead.includes('mcp__mender__pin_pass') && !lead.includes('mcp__mender__ask_lead'),
  'a lead has no design tools and no ask_lead'
);
check(
  crew.includes('ask_lead') && !crew.includes('launch_tickets') && crew.includes('pin_pass'),
  'crew is offered ask_lead and not launch_tickets, and keeps the rest'
);
check(
  !plain.includes('ask_lead') && plain.includes('launch_tickets') && plain.includes('pin_pass'),
  'a plain session is offered everything but ask_lead'
);

if (failures.length) {
  console.log(`\n${failures.length} failed`);
  process.exit(1);
}
console.log('\nall held');
