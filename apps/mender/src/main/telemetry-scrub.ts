import { hostname, userInfo } from 'node:os';

/**
 * What may leave the machine, and nothing else.
 *
 * An allowlist, not a denylist: an event is rebuilt from scratch out of the
 * few fields that describe the app's own behaviour, each one checked against
 * the shape it is allowed to have. A field nobody listed is gone, so a new log
 * line that carries a path, a prompt or a branch ships none of it by default.
 * Free text (`msg`, `errorMessage`) is the only prose and is scrubbed hard.
 */

const IDENT = /^[A-Za-z0-9_.: -]{1,64}$/;
const WORD = /^[A-Za-z][A-Za-z0-9_-]{0,31}$/;
const ID = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{16,64})$/i;
const OPID = /^(?:[0-9a-z]{8,20}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;
const VERSION = /^[0-9A-Za-z.+-]{1,32}$/;
const PLATFORM = /^[a-z0-9_]{1,16}( [a-z0-9_]{1,16})?$/;
const SIGNAL = /^SIG[A-Z0-9]{1,10}$/;
const PROCEDURE = /^[a-z][A-Za-z0-9]{0,30}(?:\.[A-Za-z][A-Za-z0-9]{0,40}){1,4}$/;
const SCRIPTS = new Set(['prepare', 'setup', 'run', 'teardown']);

type Check = (value: unknown) => string | number | boolean | undefined;

const text =
  (pattern: RegExp): Check =>
  (value) =>
    typeof value === 'string' && pattern.test(value) ? value : undefined;
const num: Check = (value) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 100) / 100 : undefined;
const flag: Check = (value) => (typeof value === 'boolean' ? value : undefined);

const FIELDS: Record<string, Check> = {
  op: text(IDENT),
  opId: text(OPID),
  parentOpId: text(OPID),
  stage: text(IDENT),
  durationMs: num,
  elapsedMs: num,
  outcome: text(IDENT),
  exitCode: num,
  signal: text(SIGNAL),
  procedure: text(PROCEDURE),
  program: text(WORD),
  subcommand: text(WORD),
  errorKind: text(IDENT),
  count: num,
  bytes: num,
  script: (value) => (typeof value === 'string' && SCRIPTS.has(value) ? value : undefined),
  tier: text(IDENT),
  version: text(VERSION),
  packaged: flag,
  platform: text(PLATFORM),
  electron: text(VERSION),
  installId: text(ID),
  launchId: text(ID),
  task: text(ID),
  workspace: text(ID),
  project: text(ID),
  worker: text(WORD),
  component: text(WORD),
  wireCallId: text(ID),
  heapMb: num,
  nodes: num,
  freeMemMb: num,
  upMin: num,
  silentForMs: num,
  afterMs: num,
  lastBeatAgeMs: num,
  dropped: num,
  surface: text(IDENT),
  waitMs: num,
  frameMs: num,
  lagMs: num,
  kind: text(IDENT),
  errorName: text(IDENT),
  at: text(/^[A-Za-z_$][\w$.]{0,60}$/),
  p99Ms: num,
  rssMb: num,
  cpu: num,
  from: text(IDENT),
  to: text(IDENT),
  lifecycle: text(IDENT),
  generating: flag,
  queued: (value) =>
    typeof value === 'boolean' || typeof value === 'number' ? Number(value) : undefined,
  stopReason: text(IDENT),
  conversation: text(ID),
  conversationId: text(ID),
  promptId: text(ID),
  chars: num,
  carrying: num,
  attachments: num,
  chapters: num,
  generation: num,
};

/** Fields the app logs under another name. */
const ALIASES: Record<string, string> = { code: 'exitCode' };

const KNOWN_HOSTS = new Set(['api.anthropic.com', 'api.axiom.co', 'github.com', 'api.github.com']);

const EXTENSIONS =
  'ts|tsx|js|jsx|mjs|cjs|json|md|txt|log|py|rb|go|rs|java|kt|swift|dart|c|h|cpp|html|css|scss|yml|yaml|toml|lock|png|jpe?g|gif|webp|svg|pdf|csv|sh|zsh|env|sql|xml';

let identities: string[] | undefined;
function ownNames(): string[] {
  if (identities) return identities;
  const names = new Set<string>();
  try {
    names.add(userInfo().username);
  } catch {
    // No user to hide.
  }
  try {
    names.add(hostname().replace(/\.local$/, ''));
  } catch {
    // No host to hide.
  }
  identities = [...names].filter((name) => name.length >= 3);
  return identities;
}

const escape = (word: string): string => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function sanitize(input: string, max = 200): string {
  let out = input;
  out = out.replace(/\b[a-z][a-z0-9+.-]*:\/\/([^\s/'"<>)]+)[^\s'"<>)]*/gi, (_all, host: string) => {
    const bare = host
      .replace(/^[^@]*@/, '')
      .replace(/:\d+$/, '')
      .toLowerCase();
    return KNOWN_HOSTS.has(bare) ? `<url ${bare}>` : '<url>';
  });
  out = out.replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '<email>');
  out = out.replace(/"[^"]*"|'[^']*'|`[^`]*`/g, '<quoted>');
  out = out.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<id>');
  out = out.replace(/(?:~|\.{1,2})?(?:\/[^\s/:;,)\]}]+){2,}\/?/g, '<path>');
  out = out.replace(/(?:^|(?<=[\s(=]))~(?:\/\S*)?/g, '<path>');
  out = out.replace(/\b[A-Za-z]:\\[^\s]*/g, '<path>');
  out = out.replace(/(?<![\w/<])\/[\w.@-]{2,}/g, '<path>');
  out = out.replace(/(?<![\w/])(?:[\w.@-]+\/)+[\w.@-]+/g, '<path>');
  out = out.replace(new RegExp(`\\b[\\w.-]+\\.(?:${EXTENSIONS})\\b`, 'gi'), '<file>');
  out = out.replace(/\b[A-Z][A-Z0-9]+-\d+\b/g, '<ticket>');
  out = out.replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, '<ip>');
  out = out.replace(/\b[0-9a-f]{7,}\b/gi, '<hex>');
  out = out.replace(
    /\b(branch(?:es)?|on|onto|checkout|worktree|project|repo(?:sitory)?|workspace|folder|directory|ticket|issue|named|called)\s+[^\s,;:]+/gi,
    '$1 <x>'
  );
  for (const name of ownNames()) out = out.replace(new RegExp(escape(name), 'gi'), '<user>');
  out = out.replace(/\s+/g, ' ').trim();
  return out.length > max ? `${out.slice(0, max)}…` : out;
}

/** Areas whose lines are the work itself, whatever they say. */
const CONTENT_MESSAGES = [/agent stderr/i];

export type Verdict = { ship: Record<string, unknown> } | { drop: string };

const ALWAYS_SHIP = new Set([
  'agents: mood',
  'agents: tell',
  'agents: tell landed',
  'agents: broke',
  'SessionCell: prompt sent',
  'SessionCell: prompt settled',
  'SessionCell: prompt queued',
  'SessionCell: prompt steered',
  'worker process exited',
  'update check failed',
  'mender starting',
  'mender quitting',
  'window unresponsive',
  'window responsive again',
  'child process gone',
  'SessionMaterializer: loadSession failed, starting a new session',
  'SessionCell: session failure',
  'SessionCell: session failure cleared',
]);

function flightOf(msg: string): { msg: string; extra: Record<string, unknown> } | undefined {
  if (!msg.startsWith('flight:')) return undefined;
  const head = msg.slice(0, msg.indexOf(' {') === -1 ? msg.length : msg.indexOf(' {'));
  const path = /"path":"([^"]*)"/.exec(msg)?.[1];
  const ms = /"ms":(\d+)/.exec(msg)?.[1];
  return {
    msg: head.replace(/\s*lately=.*$/, ''),
    extra: { procedure: path, durationMs: ms === undefined ? undefined : Number(ms) },
  };
}

function errorOf(raw: Record<string, unknown>): { kind?: string; message?: string } {
  for (const key of ['error', 'err', 'reason', 'warning']) {
    const value = raw[key];
    if (typeof value === 'string') return { message: value };
    if (typeof value === 'object' && value !== null) {
      const one = value as Record<string, unknown>;
      const kind = one.code ?? one.type ?? one.name;
      return {
        kind: typeof kind === 'string' ? kind : undefined,
        message: typeof one.message === 'string' ? one.message : undefined,
      };
    }
  }
  return {};
}

function rendererPayload(msg: string): Record<string, unknown> | undefined {
  if (!msg.startsWith('mender:')) return undefined;
  try {
    const parsed: unknown = JSON.parse(msg.slice('mender:'.length));
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

export function scrub(input: Record<string, unknown>): Verdict {
  let raw = input;
  let structured = false;
  if (input.area === 'renderer' && typeof input.msg === 'string') {
    const payload = rendererPayload(input.msg);
    if (payload) {
      structured = true;
      raw = {
        ...payload,
        time: input.time,
        proc: 'renderer',
        area: 'renderer',
        level: typeof payload.level === 'string' ? payload.level : input.level,
        msg: typeof payload.msg === 'string' ? payload.msg : '',
      };
    }
  }
  const level = typeof raw.level === 'string' ? raw.level : 'info';
  const area = typeof raw.area === 'string' && WORD.test(raw.area) ? raw.area : undefined;
  const proc = typeof raw.proc === 'string' && WORD.test(raw.proc) ? raw.proc : undefined;
  let msg = typeof raw.msg === 'string' ? raw.msg : '';
  const time = typeof raw.time === 'string' ? raw.time : new Date().toISOString();
  if (!msg) return { drop: 'empty' };
  if (CONTENT_MESSAGES.some((pattern) => pattern.test(msg))) return { drop: 'content' };

  const out: Record<string, unknown> = { time, level };
  if (proc) out.proc = proc;
  if (area) out.area = area;
  const worker = typeof raw.scope === 'string' ? /worker:([a-z-]+)$/.exec(raw.scope)?.[1] : undefined;
  if (worker) out.worker = worker;

  const flight = area === 'renderer' && !structured ? flightOf(msg) : undefined;
  if (area === 'renderer' && !flight && !structured) {
    if (level !== 'warn' && level !== 'error') return { drop: 'renderer' };
    return { ship: { time, level, proc: 'renderer', area, msg: `renderer console ${level}` } };
  }
  if (flight) {
    msg = flight.msg;
    for (const [key, value] of Object.entries(flight.extra)) {
      const kept = value === undefined ? undefined : FIELDS[key]?.(value);
      if (kept !== undefined) out[key] = kept;
    }
  }

  const tracked = typeof raw.op === 'string';
  const wanted =
    tracked ||
    structured ||
    level === 'warn' ||
    level === 'error' ||
    level === 'fatal' ||
    flight !== undefined ||
    ALWAYS_SHIP.has(msg) ||
    (area === 'vitals' && !msg.startsWith('window:')) ||
    area === 'process' ||
    area === 'telemetry';
  if (!wanted) return { drop: 'chatter' };

  out.msg = sanitize(msg);
  for (const [name, value] of Object.entries(raw)) {
    const key = ALIASES[name] ?? name;
    const check = FIELDS[key];
    if (!check || key in out) continue;
    const kept = check(value);
    if (kept !== undefined) out[key] = kept;
  }
  const failure = errorOf(raw);
  if (out.errorKind === undefined && failure.kind) {
    const kind = FIELDS.errorKind?.(failure.kind);
    if (kind !== undefined) out.errorKind = kind;
  }
  const said = typeof raw.errorMessage === 'string' ? raw.errorMessage : failure.message;
  if (said) out.errorMessage = sanitize(said);
  return { ship: out };
}
