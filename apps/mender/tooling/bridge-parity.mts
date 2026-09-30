/**
 * What does a session in the village get that a terminal Claude Code would not,
 * and the other way round?
 *
 * Claude's ACP bridge quietly withholds whatever the client does not claim it
 * can do (AskUserQuestion went missing for months that way). This starts both
 * for real, a terminal `claude` in a pty and the bridge driven with exactly the
 * capabilities Mender advertises, points them at a fake Anthropic API on
 * localhost that records every request and answers "ok", and compares:
 *
 *   - the tools each one actually sends the model,
 *   - the slash commands each one offers,
 *   - every capability switch the installed bridge checks, against what we
 *     advertise and the decision recorded here for it.
 *
 * Nothing reaches Anthropic and nothing costs anything. Run it after every
 * bridge or Claude Code upgrade: `pnpm --filter @mender/app check:bridge`.
 * Exits non-zero when the bridge is missing a tool the terminal has, or checks
 * a switch nobody has decided about yet.
 */
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
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
const adapterDist = dirname(adapter);

/**
 * Every switch the bridge checks, and what we decided about it. A switch the
 * bridge starts checking that is not in here fails the run until somebody
 * decides.
 */
const DECIDED: Record<string, { on: boolean; why: string }> = {
  'fs.readTextFile': { on: true, why: 'the agent reads through us' },
  'fs.writeTextFile': { on: true, why: 'the agent writes through us' },
  terminal: { on: true, why: 'commands run in our terminals' },
  'elicitation.form': { on: true, why: 'questions with answers are drawn at the gate' },
  'elicitation.url': {
    on: false,
    why: 'browser sign-in for MCP servers handed over by the client; Mender hands over none, Claude reads its own',
  },
  'air.sessionFailure': { on: true, why: 'limits and outages bank the fire' },
  'air.nativeSubagentSessions': {
    on: false,
    why: 'helpers are already read off the transcript; this moves them to separate sessions',
  },
  'air.asyncTasks': { on: false, why: 'background command lifecycle; see STATE.md' },
  'air.agentFileChangeReport': {
    on: false,
    why: 'spends a hidden extra model turn to list changed files; git already knows',
  },
  'meta.terminal_output': {
    on: false,
    why: 'the same finished output in another envelope; the bridge never streams it live',
  },
  'meta.subagent-transcript': { on: false, why: 'same as nativeSubagentSessions' },
  'meta.terminal-auth': { on: false, why: 'sign-in already offered from the /agent card' },
  'auth.terminal': { on: false, why: 'sign-in already offered from the /agent card' },
  'auth._meta.gateway': { on: false, why: 'no gateway' },
  'session.configOptions.boolean': {
    on: false,
    why: 'fast mode then comes as a two-way choice, which the card already draws',
  },
};

/** Tools the bridge leaves out on purpose, with why. */
const BRIDGE_MAY_LACK: Record<string, string> = {
  WaitForMcpServers:
    'only offered while MCP servers are still connecting, which the terminal is at its first message',
};

/** Terminal commands the bridge leaves out on purpose: they work the terminal's own screen. */
const COMMANDS_MAY_DROP: Record<string, string> = {
  clear: 'a new session from the hook',
  color: 'the terminal colour scheme',
  focus: 'the terminal focus view',
  doctor: 'checks the terminal install',
  'reload-plugins': 'a new session picks plugins up',
};

type Recorded = { tools: string[]; system: string };

function fakeApi(): Promise<{ port: number; requests: Recorded[]; close: () => void }> {
  const requests: Recorded[] = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      if (!req.url?.startsWith('/v1/messages') || req.url.includes('count_tokens')) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(req.url?.includes('count_tokens') ? '{"input_tokens":1}' : '{}');
        return;
      }
      let json: { tools?: { name: string }[]; system?: unknown; model?: string } = {};
      try {
        json = JSON.parse(body);
      } catch {}
      requests.push({
        tools: (json.tools ?? []).map((tool) => tool.name),
        system: JSON.stringify(json.system ?? ''),
      });
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      const send = (event: string, data: object) =>
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      send('message_start', {
        type: 'message_start',
        message: {
          id: 'msg_parity',
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
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as { port: number }).port;
      resolve({ port, requests, close: () => server.close() });
    })
  );
}

/** The request the main loop made: the one carrying the most tools. */
function mainTools(requests: Recorded[]): string[] {
  return [...requests].sort((a, b) => b.tools.length - a.tools.length)[0]?.tools ?? [];
}

async function until(test: () => boolean, ms: number): Promise<boolean> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (test()) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return test();
}

function environment(port: number): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.CLAUDE_CODE_OAUTH_TOKEN;
  delete env.ANTHROPIC_AUTH_TOKEN;
  return {
    ...env,
    ANTHROPIC_BASE_URL: `http://127.0.0.1:${port}`,
    ANTHROPIC_API_KEY: 'sk-ant-parity-check',
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
  };
}

function scratchRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'mender-parity-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  writeFileSync(join(dir, 'README.md'), 'parity\n');
  return dir;
}

/** A real interactive `claude` in a pty, answering its first-run questions. */
async function terminal(claude: string): Promise<{ tools: string[]; commands: string[] }> {
  const api = await fakeApi();
  const dir = scratchRepo();
  const drive = `
import os, pty, re, select, sys, time
pid, fd = pty.fork()
if pid == 0:
    os.execvp(sys.argv[1], [sys.argv[1], 'say ok'])
end = time.time() + 60
seen = b''
while time.time() < end:
    r, _, _ = select.select([fd], [], [], 0.3)
    if not r:
        continue
    try:
        chunk = os.read(fd, 65536)
    except OSError:
        break
    seen = (seen + chunk)[-4000:]
    flat = re.sub(rb'\\x1b\\[[0-9;?>]*[a-zA-Z]', b'', seen).lower().replace(b' ', b'')
    if b'trustthisfolder' in flat or b'thisapikey' in flat:
        seen = b''
        time.sleep(0.5)
        os.write(fd, b'\\x1b[A' if b'thisapikey' in flat else b'\\x1b[B')
        time.sleep(0.3)
        os.write(fd, b'\\r')
    elif b'entertoconfirm' in flat or b'pressenter' in flat:
        seen = b''
        time.sleep(0.5)
        os.write(fd, b'\\r')
`;
  const child = spawn('python3', ['-c', drive, claude], {
    cwd: dir,
    env: environment(api.port),
    stdio: 'ignore',
  });
  await until(() => api.requests.some((r) => r.tools.length > 0), 60_000);
  await new Promise((r) => setTimeout(r, 2000));
  child.kill('SIGKILL');
  api.close();

  /* The interactive screen does not list its commands anywhere readable, so
     the one-shot mode's list stands in for them: same binary, same config. */
  const oneShot = await fakeApi();
  const out = await new Promise<string>((resolve) => {
    const run = spawn(claude, ['-p', 'say ok', '--output-format', 'stream-json', '--verbose'], {
      cwd: dir,
      env: environment(oneShot.port),
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    let text = '';
    run.stdout.on('data', (chunk) => (text += chunk));
    const timer = setTimeout(() => run.kill('SIGKILL'), 60_000);
    run.on('close', () => {
      clearTimeout(timer);
      resolve(text);
    });
  });
  oneShot.close();
  const init = out
    .split('\n')
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .find((msg) => msg?.type === 'system' && msg.subtype === 'init');
  rmSync(dir, { recursive: true, force: true });
  return { tools: mainTools(api.requests), commands: init?.slash_commands ?? [] };
}

/** The bridge, spoken to exactly the way Mender speaks to it. */
async function bridge(claude: string): Promise<{ tools: string[]; commands: string[] }> {
  const api = await fakeApi();
  const dir = scratchRepo();
  const child = spawn(process.execPath, [adapter], {
    cwd: dir,
    env: { ...environment(api.port), CLAUDE_CODE_EXECUTABLE: claude },
    stdio: ['pipe', 'pipe', 'ignore'],
  });
  const commands: string[] = [];
  const stream = ndJsonStream(
    Writable.toWeb(child.stdin) as WritableStream<Uint8Array>,
    Readable.toWeb(child.stdout) as unknown as ReadableStream<Uint8Array>
  );
  const connection = new ClientSideConnection(
    () => ({
      sessionUpdate: async (note) => {
        const update = note.update as {
          sessionUpdate: string;
          availableCommands?: { name: string }[];
        };
        if (update.sessionUpdate === 'available_commands_update') {
          commands.splice(
            0,
            commands.length,
            ...(update.availableCommands ?? []).map((c) => c.name)
          );
        }
      },
      requestPermission: async () => ({ outcome: { outcome: 'cancelled' } }),
      createElicitation: async () => ({ action: 'cancel' }),
      readTextFile: async ({ path }) => ({ content: readFileSync(path, 'utf8') }),
      writeTextFile: async () => ({}),
    }),
    stream
  );
  await connection.initialize({
    protocolVersion: 1,
    clientInfo: { name: 'emdash', version: '1' },
    clientCapabilities: clientCapabilities(true),
  });
  const session = await connection.newSession({ cwd: dir, mcpServers: [] });
  await connection.prompt({
    sessionId: session.sessionId,
    prompt: [{ type: 'text', text: 'say ok' }],
  });
  await until(() => commands.length > 0, 5000);
  child.kill('SIGKILL');
  api.close();
  rmSync(dir, { recursive: true, force: true });
  return { tools: mainTools(api.requests), commands };
}

/** Every capability switch the installed bridge reads, by the name DECIDED uses. */
function switches(): string[] {
  const found = new Set<string>();
  const constants = new Map<string, string>();
  for (const file of readdirSync(adapterDist).filter((f) => f.endsWith('.js'))) {
    const code = readFileSync(join(adapterDist, file), 'utf8');
    for (const [, name, value] of code.matchAll(/(\w+_CAPABILITY)\s*=\s*"([^"]+)"/g))
      constants.set(name, value);
    for (const [, path] of code.matchAll(/[cC]lientCapabilities\?\.((?:[\w]+\??\.?)+)/g)) {
      const clean = path.replace(/\?/g, '').replace(/\.$/, '');
      if (clean === '_meta' || clean.startsWith('_meta.')) continue;
      found.add(clean);
    }
    for (const [, key] of code.matchAll(/clientCapabilities\?\._meta\?\.\["([^"]+)"\]/g))
      found.add(`meta.${key}`);
    for (const [, key] of code.matchAll(/capabilities\?\._meta\?\.\[(\w+)\]/g))
      found.add(`meta:${key}`);
  }
  for (const code of readdirSync(adapterDist)
    .filter((f) => f.endsWith('.js'))
    .map((f) => readFileSync(join(adapterDist, f), 'utf8'))) {
    for (const [, name] of code.matchAll(/clientSupportsAirCapability\([^,]+,\s*(\w+)\)/g))
      if (constants.has(name)) found.add(`air.${constants.get(name)}`);
  }
  return [...found]
    .map((name) =>
      name.startsWith('meta:') ? `meta.${constants.get(name.slice(5)) ?? name.slice(5)}` : name
    )
    .filter((name) => !['elicitation', 'auth', 'session', 'fs', 'auth._meta'].includes(name))
    .sort();
}

function advertised(name: string): boolean {
  const caps = clientCapabilities(true) as Record<string, unknown>;
  if (name.startsWith('air.')) {
    const air = (caps._meta as { jetbrains?: { air?: { capabilities?: string[] } } })?.jetbrains
      ?.air;
    return air?.capabilities?.includes(name.slice(4)) ?? false;
  }
  if (name.startsWith('meta.'))
    return (caps._meta as Record<string, unknown>)?.[name.slice(5)] === true;
  let at: unknown = caps;
  for (const part of name.split('.')) at = (at as Record<string, unknown> | undefined)?.[part];
  return at !== undefined && at !== null && at !== false;
}

const claude = execFileSync('which', ['claude'], { encoding: 'utf8' }).trim();
const version = execFileSync(claude, ['--version'], { encoding: 'utf8' }).trim();
const bridgeVersion = JSON.parse(
  readFileSync(join(adapterDist, '../package.json'), 'utf8')
).version;
console.log(`claude ${version}, bridge ${bridgeVersion}\n`);

let failed = false;

console.log('switches the bridge checks');
for (const name of switches()) {
  const decided = DECIDED[name];
  const on = advertised(name);
  if (!decided) {
    failed = true;
    console.log(`  NEW   ${name} (${on ? 'on' : 'off'}): nobody has decided about this one`);
  } else if (decided.on !== on) {
    failed = true;
    console.log(
      `  DRIFT ${name}: decided ${decided.on ? 'on' : 'off'}, advertised ${on ? 'on' : 'off'}`
    );
  } else console.log(`  ${on ? 'on ' : 'off'}   ${name}: ${decided.why}`);
}

const [term, bridged] = await Promise.all([terminal(claude), bridge(claude)]);

if (process.env.PARITY_DUMP)
  console.log(
    JSON.stringify({
      term: term.tools,
      bridged: bridged.tools.filter((t) => !t.startsWith('mcp__')),
    })
  );
const missing = term.tools.filter((t) => !bridged.tools.includes(t));
const extra = bridged.tools.filter((t) => !term.tools.includes(t));
console.log(`\ntools: terminal ${term.tools.length}, bridge ${bridged.tools.length}`);
if (!term.tools.length || !bridged.tools.length) {
  failed = true;
  console.log('  one side never reached the model; nothing to compare');
}
for (const tool of missing) {
  const why = BRIDGE_MAY_LACK[tool];
  if (!why) failed = true;
  console.log(`  bridge lacks ${tool}${why ? ` (on purpose: ${why})` : ''}`);
}
/* The terminal's first message goes out before its MCP servers finish connecting. */
const extraOwn = extra.filter((t) => !t.startsWith('mcp__'));
for (const tool of extraOwn) console.log(`  bridge adds ${tool}`);
if (extra.length > extraOwn.length)
  console.log(
    `  bridge also has ${extra.length - extraOwn.length} MCP tools the terminal had not connected yet`
  );

const slash = (list: string[]) => list.map((c) => c.replace(/^\//, ''));
const termCommands = slash(term.commands);
const bridgeCommands = slash(bridged.commands).map((c) => c.replace(/^mcp:/, ''));
const lostCommands = termCommands.filter(
  (c) => !bridgeCommands.includes(c) && !bridgeCommands.includes(c.replace(/ \(MCP\)$/, ''))
);
console.log(`\ncommands: terminal ${termCommands.length}, bridge ${bridgeCommands.length}`);
const addedCommands = bridgeCommands.filter((c) => !termCommands.includes(c));
/* A skill whose folder and own name differ is listed under one by the terminal
   and the other by the bridge, so an unexplained drop only counts once every
   bridge-only name has been used up pairing with one. */
const unexplained = lostCommands.filter((c) => !COMMANDS_MAY_DROP[c]);
for (const c of lostCommands.filter((c) => COMMANDS_MAY_DROP[c]))
  console.log(`  bridge drops ${c} (on purpose: ${COMMANDS_MAY_DROP[c]})`);
if (unexplained.length > addedCommands.length) {
  failed = true;
  console.log(`  bridge drops ${unexplained.join(', ')}`);
} else if (unexplained.length)
  console.log(`  named differently: ${unexplained.join(', ')} / ${addedCommands.join(', ')}`);

console.log(failed ? '\nsomething needs deciding.' : '\nnothing is missing that was not decided.');
process.exit(failed ? 1 : 0);
