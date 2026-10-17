/**
 * Does a turn still settle when several messages are slipped into it while it
 * runs? Drives the bridge against a fake Anthropic API on localhost, the way
 * check:bridge does, and exits non-zero if the turn never comes back.
 * `SCENARIO=compact|normal STEERS=n pnpm exec tsx tooling/steer-repro.mts`
 */
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
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
const DELAY = Number(process.env.DELAY ?? 3000);

function fakeApi(): Promise<{ port: number; close: () => void; count: () => number }> {
  let n = 0;
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      if (!req.url?.startsWith('/v1/messages') || req.url.includes('count_tokens')) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(req.url?.includes('count_tokens') ? '{"input_tokens":1}' : '{}');
        return;
      }
      n++;
      let model = 'x';
      try {
        model = JSON.parse(body).model ?? 'x';
      } catch {}
      setTimeout(() => {
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        const send = (event: string, data: object) =>
          res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        send('message_start', {
          type: 'message_start',
          message: {
            id: `msg_${n}`,
            type: 'message',
            role: 'assistant',
            model,
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
      }, DELAY);
    });
  });
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () =>
      resolve({
        port: (server.address() as { port: number }).port,
        close: () => server.close(),
        count: () => n,
      })
    )
  );
}

const claude = execFileSync('which', ['claude'], { encoding: 'utf8' }).trim();
const api = await fakeApi();
const dir = mkdtempSync(join(tmpdir(), 'mender-steer-'));
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
    ANTHROPIC_API_KEY: 'sk-ant-repro',
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    CLAUDE_CODE_EXECUTABLE: claude,
  },
  stdio: ['pipe', 'pipe', process.env.STDERR ? 'inherit' : 'ignore'],
});
const t0 = Date.now();
const at = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`;
const connection = new ClientSideConnection(
  () => ({
    sessionUpdate: async (note) => {
      const u = note.update as { sessionUpdate: string };
      if (process.env.UPDATES) console.log(at(), 'update', u.sessionUpdate);
    },
    requestPermission: async () => ({ outcome: { outcome: 'cancelled' } }),
    createElicitation: async () => ({ action: 'cancel' }),
    readTextFile: async () => ({ content: '' }),
    writeTextFile: async () => ({}),
  }),
  ndJsonStream(
    Writable.toWeb(child.stdin) as WritableStream<Uint8Array>,
    Readable.toWeb(child.stdout) as unknown as ReadableStream<Uint8Array>
  )
);
await connection.initialize({
  protocolVersion: 1,
  clientInfo: { name: 'emdash', version: '1' },
  clientCapabilities: clientCapabilities(true),
});
const { sessionId } = await connection.newSession({ cwd: dir, mcpServers: [] });
const prompt = (text: string) => connection.prompt({ sessionId, prompt: [{ type: 'text', text }] });
const steer = (text: string) =>
  connection.extMethod('_session/steering', {
    sessionId,
    prompt: [{ type: 'text', text }],
    _meta: { steering: { idleBehavior: 'promptRequired' } },
  });

console.log(at(), 'first', (await prompt('say ok')).stopReason);
const scenario = process.env.SCENARIO ?? 'compact';
const first = scenario === 'compact' ? '/compact' : 'say ok again';
const turn = prompt(first).then((r) => {
  console.log(at(), 'turn settled', r.stopReason);
  return r;
});
const steers = Number(process.env.STEERS ?? 2);
for (let i = 0; i < steers; i++) {
  await new Promise((r) => setTimeout(r, Number(process.env.GAP ?? 1500)));
  console.log(at(), 'steer', i, JSON.stringify(await steer(`also ${i}`).catch((e) => String(e))));
}
const settled = await Promise.race([
  turn.then(() => true),
  new Promise<boolean>((r) => setTimeout(() => r(false), 40_000)),
]);
console.log(at(), settled ? 'SETTLED' : 'HUNG', 'requests', api.count());
if (!settled && process.env.CANCEL) {
  const c0 = Date.now();
  await connection.cancel({ sessionId });
  await Promise.race([turn, new Promise((r) => setTimeout(r, 40_000))]);
  console.log('cancel took', Date.now() - c0, 'ms');
}
child.kill('SIGKILL');
api.close();
rmSync(dir, { recursive: true, force: true });
process.exit(settled ? 0 : 1);
