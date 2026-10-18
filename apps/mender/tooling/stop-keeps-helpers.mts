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
const adapter = process.env.ADAPTER ?? require.resolve('@agentclientprotocol/claude-agent-acp/dist/index.js');
const claude = execFileSync('which', ['claude'], { encoding: 'utf8' }).trim();

const state = { helperOpen: false, helperClosed: false };

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    if (!req.url?.startsWith('/v1/messages') || req.url.includes('count_tokens')) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(req.url?.includes('count_tokens') ? '{"input_tokens":1}' : '{}');
      return;
    }
    let json: any = {};
    try { json = JSON.parse(body); } catch {}
    const names: string[] = (json.tools ?? []).map((t: any) => t.name);
    const hasTool = (json.messages ?? []).some((m: any) => JSON.stringify(m.content).includes('tool_result'));
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    const send = (event: string, data: object) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    send('message_start', { type: 'message_start', message: { id: 'm' + Math.random(), type: 'message', role: 'assistant', model: json.model ?? 'x', content: [], stop_reason: null, usage: { input_tokens: 1, output_tokens: 1 } } });
    const text = (t: string) => {
      send('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } });
      send('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: t } });
      send('content_block_stop', { type: 'content_block_stop', index: 0 });
    };
    const end = (reason: string) => {
      send('message_delta', { type: 'message_delta', delta: { stop_reason: reason }, usage: { output_tokens: 1 } });
      send('message_stop', { type: 'message_stop' });
      res.end();
    };
    const main = names.includes('Agent') || names.includes('Task');
    if (!names.length) { text('ok'); return end('end_turn'); }
    if (!main) {
      state.helperOpen = true;
      res.on('close', () => { if (!res.writableEnded) state.helperClosed = true; });
      text('working');
      const tick = setInterval(() => res.write(': ping\n\n'), 1000);
      res.on('close', () => clearInterval(tick));
      return;
    }
    if (hasTool) { text('launched'); return end('end_turn'); }
    send('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 'toolu_bg1', name: names.includes('Agent') ? 'Agent' : 'Task', input: {} } });
    send('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: JSON.stringify({ description: 'bg helper', prompt: 'do a long job', subagent_type: 'general-purpose', run_in_background: true }) } });
    send('content_block_stop', { type: 'content_block_stop', index: 0 });
    end('tool_use');
  });
});
await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
const port = (server.address() as { port: number }).port;

const dir = mkdtempSync(join(tmpdir(), 'mender-stop-'));
execFileSync('git', ['init', '-q'], { cwd: dir });
writeFileSync(join(dir, 'README.md'), 'x\n');
const env = { ...process.env };
delete env.CLAUDE_CODE_OAUTH_TOKEN;
delete env.ANTHROPIC_AUTH_TOKEN;
const child = spawn(process.execPath, [adapter], {
  cwd: dir,
  env: { ...env, ANTHROPIC_BASE_URL: `http://127.0.0.1:${port}`, ANTHROPIC_API_KEY: 'sk-ant-x', CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1', CLAUDE_CODE_EXECUTABLE: claude, CLAUDE_CONFIG_DIR: mkdtempSync(join(tmpdir(), 'mender-cfg-')) },
  stdio: ['pipe', 'pipe', 'ignore'],
});
const seen: string[] = [];
const connection = new ClientSideConnection(
  () => ({
    sessionUpdate: async (n) => {
      const u = n.update as any;
      if (u.sessionUpdate === 'tool_call' || u.sessionUpdate === 'tool_call_update')
        seen.push(`${u.sessionUpdate}:${u.toolCallId}:${u.status ?? ''}:${JSON.stringify(u.content ?? u.rawOutput ?? '').slice(0, 250)}`);
    },
    requestPermission: async (p) => ({ outcome: { outcome: 'selected', optionId: p.options[0].optionId } }),
    createElicitation: async () => ({ action: 'cancel' }),
    readTextFile: async () => ({ content: '' }),
    writeTextFile: async () => ({}),
  }),
  ndJsonStream(Writable.toWeb(child.stdin) as WritableStream<Uint8Array>, Readable.toWeb(child.stdout) as unknown as ReadableStream<Uint8Array>)
);
await connection.initialize({ protocolVersion: 1, clientInfo: { name: 'emdash', version: '1' }, clientCapabilities: clientCapabilities(true) });
const session = await connection.newSession({ cwd: dir, mcpServers: [] });
const turn = connection.prompt({ sessionId: session.sessionId, prompt: [{ type: 'text', text: 'go' }] }).then((r) => r.stopReason, (e) => 'error ' + e);
const wait = async (ms: number, f: () => boolean) => { const e = Date.now() + ms; while (Date.now() < e && !f()) await new Promise((r) => setTimeout(r, 200)); return f(); };
const up = await wait(30000, () => state.helperOpen);
console.log('helper running:', up);
await new Promise((r) => setTimeout(r, 2000));
if (process.env.STEER) void connection.prompt({ sessionId: session.sessionId, prompt: [{ type: 'text', text: 'also this' }] }).catch(() => {});
else await connection.cancel({ sessionId: session.sessionId });
console.log('turn ended with:', await Promise.race([turn, new Promise((r) => setTimeout(() => r('still open'), 8000))]));
await new Promise((r) => setTimeout(r, 3000));
console.log('helper killed by the stop:', state.helperClosed);
console.log('updates:', seen.join(' | '));
child.kill('SIGKILL');
server.close();
rmSync(dir, { recursive: true, force: true });
process.exit(0);
