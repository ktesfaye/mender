/**
 * Does a turn with a message slipped into it still settle after an earlier one
 * was called off before the CLI answered? That cancel leaves the bridge owing
 * an idle nobody pays, which used to eat the one a steered turn settles on.
 * Same fake API as steer-repro; exits non-zero if a turn never comes back.
 * `STEPS="kind:text|tools;..." pnpm exec tsx tooling/steer-after-cancel.mts`, kind being plain,
 * cancel, steer or wait
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
const adapter = process.env.ADAPTER ?? require.resolve('@agentclientprotocol/claude-agent-acp/dist/index.js');
const DELAY = Number(process.env.DELAY ?? 3000);

function fakeApi(): Promise<{ port: number; close: () => void; count: () => number }> {
  let n = 0;
  const rounds = new Map<string, number>();
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
      let useTool = false;
      let tool = 'read';
      try {
        const parsed = JSON.parse(body);
        model = parsed.model ?? 'x';
        const last = parsed.messages?.at(-1);
        const parts = Array.isArray(last?.content) ? last.content : [{ type: 'text', text: String(last?.content) }];
        const hasResult = parts.some((p: { type: string }) => p.type === 'tool_result');
        const said = JSON.stringify(parsed.messages ?? []);
        const main = parsed.tools?.some((t: { name?: string }) => t.name === 'Read');
        const marks = [...said.matchAll(/\[tools:([a-z0-9,]+)#(\d+)\]/g)];
        const mark = marks.at(-1);
        if (main && mark) {
          const key = mark[2];
          const steps = mark[1].split(',');
          const done = rounds.get(key) ?? 0;
          if (done < steps.length) {
            useTool = true;
            tool = steps[done];
            rounds.set(key, done + 1);
          }
        }
      } catch {}
      if (process.env.UPDATES)
        console.log('api', n, useTool ? tool : 'text',);
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
        if (useTool) {
          send('content_block_start', {
            type: 'content_block_start',
            index: 0,
            content_block: {
              type: 'tool_use',
              id: `toolu_${n}`,
              name: tool === 'ask' ? 'AskUserQuestion' : tool === 'bg' || tool.startsWith('sleep') ? 'Bash' : 'Read',
              input: {},
            },
          });
          const input =
            tool === 'ask'
              ? {
                  questions: [
                    {
                      question: 'Which?',
                      header: 'Pick',
                      multiSelect: false,
                      options: [
                        { label: 'A', description: 'a' },
                        { label: 'B', description: 'b' },
                      ],
                    },
                  ],
                }
              : tool === 'bg'
                ? { command: 'sleep 4; echo done', run_in_background: true, description: 'wait' }
                : tool.startsWith('sleep')
                ? { command: `sleep ${tool.slice(5)}; echo slept`, description: 'sleep' }
                : { file_path: readme };
          send('content_block_delta', {
            type: 'content_block_delta',
            index: 0,
            delta: { type: 'input_json_delta', partial_json: JSON.stringify(input) },
          });
        } else {
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
        }
        send('content_block_stop', { type: 'content_block_stop', index: 0 });
        send('message_delta', {
          type: 'message_delta',
          delta: { stop_reason: useTool ? 'tool_use' : 'end_turn' },
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
const dir = mkdtempSync(join(tmpdir(), 'mender-steer-'));
const readme = join(dir, 'README.md');
const api = await fakeApi();
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
let asked = 0;
const at = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`;
const connection = new ClientSideConnection(
  () => ({
    sessionUpdate: async (note) => {
      const u = note.update as { sessionUpdate: string };
      if (process.env.UPDATES) console.log(at(), 'update', u.sessionUpdate);
    },
    requestPermission: async (req) => {
      const allow = req.options.find((o) => o.kind === 'allow_once') ?? req.options[0];
      return { outcome: { outcome: 'selected', optionId: allow.optionId } };
    },
    createElicitation: async (req) => {
      asked++;
      const wait = asked === 1 ? 500 : Number(process.env.ANSWER_AFTER ?? 10_000);
      console.log(at(), 'asked', asked, JSON.stringify(req).slice(0, 300));
      await new Promise((r) => setTimeout(r, wait));
      const props = (req as { requestedSchema?: { properties?: Record<string, unknown> } })
        .requestedSchema?.properties ?? {};
      const content = Object.fromEntries(Object.keys(props).map((k) => [k, 'A']));
      console.log(at(), 'answered', asked, JSON.stringify(content));
      return { action: 'accept', content };
    },
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
let marks = 0;
const prompt = (text: string, tools?: string) =>
  connection.prompt({
    sessionId,
    prompt: [{ type: 'text', text: tools ? `${text} [tools:${tools}#${++marks}]` : text }],
  });
const steer = (text: string) =>
  connection.extMethod('_session/steering', {
    sessionId,
    prompt: [{ type: 'text', text }],
    _meta: { steering: { idleBehavior: 'promptRequired' } },
  });

const steps = (process.env.STEPS ?? 'say ok;cancel:say ok slowly|sleep5;steer:use a tool|read,read,read').split(';');
let settled = true;
for (const step of steps) {
  const [kind, rest] = step.includes(':') ? [step.slice(0, step.indexOf(':')), step.slice(step.indexOf(':') + 1)] : ['plain', step];
  const [text, tools] = rest.split('|');
  if (kind === 'wait') {
    await new Promise((r) => setTimeout(r, Number(text) || 8000));
    continue;
  }
  const turn = prompt(text, tools).then((r) => (console.log(at(), kind, text, '->', r.stopReason), r));
  if (kind === 'cancel') {
    await new Promise((r) => setTimeout(r, Number(process.env.CANCEL_AFTER ?? 4500)));
    await connection.cancel({ sessionId });
  }
  if (kind === 'steer') {
    await new Promise((r) => setTimeout(r, Number(process.env.GAP ?? DELAY + 1500)));
    console.log(at(), 'steer', JSON.stringify(await steer('also this').catch((e) => String(e))));
  }
  const ok = await Promise.race([
    turn.then(() => true),
    new Promise<boolean>((r) => setTimeout(() => r(false), 40_000)),
  ]);
  if (!ok) {
    console.log(at(), 'HUNG on', step);
    settled = false;
    break;
  }
}
console.log(at(), settled ? 'SETTLED' : 'HUNG', 'requests', api.count());
child.kill('SIGKILL');
api.close();
rmSync(dir, { recursive: true, force: true });
process.exit(settled ? 0 : 1);
