import { open, readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, join } from 'node:path';

/**
 * What every Claude session on this machine has spent, read straight off
 * Claude Code's own transcripts under `~/.claude/projects/`.
 *
 * The subscription's five-hour window is one meter for the whole account, so
 * which session is eating it cannot be learnt from the meter: it has to be
 * read off what each session actually sent. Every assistant message in a
 * transcript carries its own token counts, and a helper's transcript sits in
 * a `subagents/` folder under its session's id, so the whole of what a
 * session cost, helpers included, is on disk. Nothing here writes anything.
 *
 * Files only ever grow, so each is read once from where it was last left off
 * rather than whole every time; a session that is a few dozen megabytes
 * long is read in full once and then by the line.
 */

export interface UsageEvent {
  at: number;
  /** Claude's own id for the session, which a helper's spend rolls up into. */
  session: string;
  /** The directory Claude keeps it under, which names the checkout. */
  dir: string;
  model: string;
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
  /** Pictures handed in with this message, which are the dear thing a
      context carries and re-reads on every call after. */
  images: number;
}

export interface SessionSpend {
  session: string;
  dir: string;
  /** What Claude itself called it, when it has; else the first thing said. */
  title: string | null;
  cwd: string | null;
  calls: number;
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
  images: number;
  firstAt: number;
  lastAt: number;
  /** The model its newest call went to, as Claude names it. */
  model: string;
  /** Roughly what it cost, in the units the window is likeliest spent in:
      output dearest, a fresh read of context next, a cached read cheapest. */
  weighted: number;
  /** The same over only the last stretch, for whether it is speeding up. */
  recent: number;
}

/** Output is the dear thing, a cached read nearly free: the ratios are the
    API's own list prices, which is the nearest public thing to how a window
    is spent. */
export function weigh(one: {
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
}): number {
  return one.input + one.cacheWrite * 1.25 + one.cacheRead * 0.1 + one.output * 5;
}

export const RECENT_MS = 20 * 60_000;

interface Parsed {
  events: UsageEvent[];
  title: string | null;
  said: string | null;
  cwd: string | null;
}

/**
 * Reads the usage out of whole transcript lines. Claude writes one line per
 * content block, each carrying the same message id and the same counts, so a
 * message is only ever counted once, by id, across every line and file.
 */
export function tallyLines(
  lines: readonly string[],
  session: string,
  dir: string,
  seen: Set<string>
): Parsed {
  const out: Parsed = { events: [], title: null, said: null, cwd: null };
  for (const line of lines) {
    if (!line) continue;
    const quick =
      line.includes('"usage"') || line.includes('"image"') || line.includes('"ai-title"');
    if (!quick && out.cwd && out.said) continue;
    let one: Record<string, unknown>;
    try {
      one = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue;
    }
    if (one.type === 'ai-title' && typeof one.aiTitle === 'string') {
      out.title = one.aiTitle.trim() || out.title;
      continue;
    }
    if (!out.cwd && typeof one.cwd === 'string') out.cwd = one.cwd;
    const at = typeof one.timestamp === 'string' ? Date.parse(one.timestamp) : NaN;
    const message = one.message as
      | { id?: string; model?: string; usage?: Record<string, unknown>; content?: unknown }
      | undefined;
    if (one.type === 'user' && message) {
      const content = message.content;
      if (!out.said && typeof content === 'string' && !content.startsWith('<')) {
        out.said = content.slice(0, 80).replace(/\s+/g, ' ');
      }
      const images = countImages(content);
      if (images && Number.isFinite(at)) {
        out.events.push({
          at,
          session,
          dir,
          model: '',
          input: 0,
          output: 0,
          cacheWrite: 0,
          cacheRead: 0,
          images,
        });
      }
      continue;
    }
    if (one.type !== 'assistant' || !message?.usage || !Number.isFinite(at)) continue;
    const id = message.id ?? `${session}:${at}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const usage = message.usage;
    const count = (key: string): number => {
      const value = usage[key];
      return typeof value === 'number' ? value : 0;
    };
    out.events.push({
      at,
      session,
      dir,
      model: typeof message.model === 'string' ? message.model : '',
      input: count('input_tokens'),
      output: count('output_tokens'),
      cacheWrite: count('cache_creation_input_tokens'),
      cacheRead: count('cache_read_input_tokens'),
      images: 0,
    });
  }
  return out;
}

function countImages(content: unknown): number {
  if (!Array.isArray(content)) return 0;
  let images = 0;
  for (const block of content as { type?: string; content?: unknown }[]) {
    if (block?.type === 'image') images += 1;
    else if (block?.type === 'tool_result' && Array.isArray(block.content)) {
      for (const inner of block.content as { type?: string }[]) {
        if (inner?.type === 'image') images += 1;
      }
    }
  }
  return images;
}

/** Everything spent since `start`, rolled up by session, dearest first. */
export function spendOf(
  events: readonly UsageEvent[],
  meta: ReadonlyMap<string, { title: string | null; said: string | null; cwd: string | null }>,
  start: number,
  end: number
): SessionSpend[] {
  const by = new Map<string, SessionSpend>();
  for (const one of events) {
    if (one.at < start || one.at > end) continue;
    let spend = by.get(one.session);
    if (!spend) {
      const known = meta.get(one.session);
      spend = {
        session: one.session,
        dir: one.dir,
        title: known?.title ?? known?.said ?? null,
        cwd: known?.cwd ?? null,
        calls: 0,
        input: 0,
        output: 0,
        cacheWrite: 0,
        cacheRead: 0,
        images: 0,
        firstAt: one.at,
        lastAt: one.at,
        model: '',
        weighted: 0,
        recent: 0,
      };
      by.set(one.session, spend);
    }
    if (one.images) {
      spend.images += one.images;
      continue;
    }
    spend.calls += 1;
    spend.input += one.input;
    spend.output += one.output;
    spend.cacheWrite += one.cacheWrite;
    spend.cacheRead += one.cacheRead;
    spend.firstAt = Math.min(spend.firstAt, one.at);
    if (one.at >= spend.lastAt && one.model && !one.model.startsWith('<')) spend.model = one.model;
    spend.lastAt = Math.max(spend.lastAt, one.at);
    const cost = weigh(one);
    spend.weighted += cost;
    if (one.at >= end - RECENT_MS) spend.recent += cost;
  }
  return [...by.values()].sort((a, b) => b.weighted - a.weighted);
}

interface Cursor {
  offset: number;
  tail: string;
}

export interface ClaudeUsage {
  /** Everything spent between the two moments, by session. */
  since(start: number, end?: number): Promise<SessionSpend[]>;
  /** What one session normally spends in a stretch this long while it is
      actually working, read off the last week: the middle of every stretch
      any session spent anything real in. Null with too little to go on. */
  usualStretch(ms: number): Promise<number | null>;
}

/** The middle of what sessions spent per stretch, counting only stretches
    with real work in them, so a session idling at the gate does not drag
    what is normal down to nothing. */
export function usualOf(events: readonly UsageEvent[], ms: number): number | null {
  const buckets = new Map<string, { cost: number; calls: number }>();
  for (const one of events) {
    if (one.images) continue;
    const key = `${one.session}:${Math.floor(one.at / ms)}`;
    const bucket = buckets.get(key) ?? { cost: 0, calls: 0 };
    bucket.cost += weigh(one);
    bucket.calls += 1;
    buckets.set(key, bucket);
  }
  const costs = [...buckets.values()]
    .filter((one) => one.calls >= 3)
    .map((one) => one.cost)
    .sort((a, b) => a - b);
  if (costs.length < 12) return null;
  return costs[Math.floor(costs.length / 2)] ?? null;
}

/** Past this a transcript is left alone; what is in it cannot be in any window asked about. */
const STALE_MS = 8 * 24 * 60 * 60_000;

export function createClaudeUsage(root = join(homedir(), '.claude', 'projects')): ClaudeUsage {
  const cursors = new Map<string, Cursor>();
  const seen = new Set<string>();
  const events: UsageEvent[] = [];
  const meta = new Map<string, { title: string | null; said: string | null; cwd: string | null }>();
  let reading: Promise<void> | null = null;

  async function files(): Promise<{ path: string; session: string; dir: string; size: number }[]> {
    const found: { path: string; session: string; dir: string; size: number }[] = [];
    let dirs: string[];
    try {
      dirs = await readdir(root);
    } catch {
      return found;
    }
    const cutoff = Date.now() - STALE_MS;
    for (const dir of dirs) {
      let names: string[];
      try {
        names = await readdir(join(root, dir));
      } catch {
        continue;
      }
      for (const name of names) {
        const path = join(root, dir, name);
        if (name.endsWith('.jsonl')) {
          const info = await stat(path).catch(() => null);
          if (!info || info.mtimeMs < cutoff) continue;
          found.push({ path, session: name.slice(0, -6), dir, size: info.size });
          continue;
        }
        /* A session's helpers write beside it, under its own id. */
        const helpers = join(path, 'subagents');
        let inner: string[];
        try {
          inner = await readdir(helpers);
        } catch {
          continue;
        }
        for (const helper of inner) {
          if (!helper.endsWith('.jsonl')) continue;
          const one = join(helpers, helper);
          const info = await stat(one).catch(() => null);
          if (!info || info.mtimeMs < cutoff) continue;
          found.push({ path: one, session: name, dir, size: info.size });
        }
      }
    }
    return found;
  }

  async function readOn(file: { path: string; session: string; dir: string; size: number }) {
    const cursor = cursors.get(file.path) ?? { offset: 0, tail: '' };
    if (file.size <= cursor.offset) return;
    const handle = await open(file.path, 'r');
    try {
      const length = file.size - cursor.offset;
      const buffer = Buffer.alloc(length);
      await handle.read(buffer, 0, length, cursor.offset);
      const text = cursor.tail + buffer.toString('utf8');
      const lines = text.split('\n');
      /* The last piece may be half a line still being written. */
      cursor.tail = lines.pop() ?? '';
      cursor.offset = file.size;
      cursors.set(file.path, cursor);
      const parsed = tallyLines(lines, file.session, file.dir, seen);
      events.push(...parsed.events);
      /* A helper's transcript carries no title for the session; only the
         session's own does, and the newest title wins. */
      const own = basename(dirname(file.path)) !== 'subagents';
      if (own) {
        const known = meta.get(file.session);
        meta.set(file.session, {
          title: parsed.title ?? known?.title ?? null,
          said: known?.said ?? parsed.said,
          cwd: known?.cwd ?? parsed.cwd,
        });
      }
    } finally {
      await handle.close();
    }
  }

  async function refresh(): Promise<void> {
    const found = await files();
    for (const file of found) {
      try {
        await readOn(file);
      } catch {
        /* Half-written or gone; next time. */
      }
    }
    const cutoff = Date.now() - STALE_MS;
    let keep = 0;
    for (const one of events) if (one.at >= cutoff) events[keep++] = one;
    events.length = keep;
  }

  return {
    async since(start, end = Date.now()) {
      reading ??= refresh().finally(() => {
        reading = null;
      });
      await reading;
      return spendOf(events, meta, start, end);
    },
    async usualStretch(ms) {
      reading ??= refresh().finally(() => {
        reading = null;
      });
      await reading;
      return usualOf(events, ms);
    },
  };
}
