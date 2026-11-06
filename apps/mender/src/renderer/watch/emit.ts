/**
 * The window's structured report to the host.
 *
 * One line per event, `mender:` and one JSON object, through the console the
 * host already captures. Only the fields listed here ever go out, and nothing
 * here takes content: no paths, names, prompts, answers or addresses. A caller
 * passes numbers, short identifiers and the name of the thing that went wrong.
 */

export type Fields = {
  msg: string;
  op?: string;
  opId?: string;
  parentOpId?: string;
  stage?: string;
  durationMs?: number;
  elapsedMs?: number;
  outcome?: string;
  procedure?: string;
  surface?: string;
  waitMs?: number;
  frameMs?: number;
  lagMs?: number;
  kind?: string;
  count?: number;
  errorKind?: string;
  errorName?: string;
  errorMessage?: string;
  at?: string;
  task?: string;
};

export type Level = 'info' | 'warn' | 'error';

const ALLOWED = new Set([
  'msg',
  'op',
  'opId',
  'parentOpId',
  'stage',
  'durationMs',
  'elapsedMs',
  'outcome',
  'procedure',
  'surface',
  'waitMs',
  'frameMs',
  'lagMs',
  'kind',
  'count',
  'errorKind',
  'errorName',
  'errorMessage',
  'at',
  'task',
]);

/* The real console, taken before anything wraps it, so reporting is never
   itself counted as the app complaining. */
const real = {
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};
export const realConsole = real;

export function newId(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** The wake the last stretch of events belongs to, for a minute after it. */
let returning: { id: string; until: number } | null = null;

export function tagReturn(id: string, forMs: number): void {
  returning = { id, until: performance.now() + forMs };
}

export function returnId(): string | null {
  if (returning && performance.now() > returning.until) returning = null;
  return returning?.id ?? null;
}

const counts = { events: 0 };

export function emit(level: Level, fields: Fields): void {
  try {
    const out: Record<string, unknown> = {};
    const tag = returnId();
    if (tag) out.parentOpId = tag;
    for (const [key, value] of Object.entries(fields)) {
      if (!ALLOWED.has(key) || value === undefined || value === null) continue;
      if (typeof value === 'number') {
        if (Number.isFinite(value)) out[key] = Math.round(value * 100) / 100;
      } else if (typeof value === 'string') {
        const bare =
          key === 'errorMessage'
            ? value.replace(/(?:~|\.{0,2})(?:\/[^\s/:;,)'"]+)+\/?/g, '<path>')
            : value;
        out[key] = bare.length > 160 ? `${bare.slice(0, 160)}…` : bare;
      }
    }
    counts.events++;
    real[level](`mender:${JSON.stringify(out)}`);
  } catch {
    // Reporting must never be what breaks the page.
  }
}

/** A wire path as a procedure name that carries no data: `git.checkout.compareRef` is `git.checkoutCompareRef`. */
export function procedureOf(path: string): string {
  const [head, ...rest] = path.split('.');
  const tail = rest.map((part, i) => (i ? part.charAt(0).toUpperCase() + part.slice(1) : part));
  return tail.length ? `${head}.${tail.join('')}` : head;
}

/** The name of a function and nothing else, off the top of a stack. */
export function topFrame(stack: string | undefined): string | undefined {
  if (!stack) return undefined;
  for (const line of stack.split('\n').slice(1, 6)) {
    const match = /^\s*at\s+(?:async\s+)?([A-Za-z_$][\w$.]*)\s+\(/.exec(line);
    if (match) return match[1].slice(0, 60);
  }
  return undefined;
}
