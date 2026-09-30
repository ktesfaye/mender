import { readdir, readFile, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** Something said in a Claude conversation, and when Claude itself wrote it down. */
export interface Dated {
  who: 'you' | 'it';
  /** The start of what was said, folded so the two sides can be compared. */
  key: string;
  at: number;
}

const KEY_LENGTH = 60;

function keyOf(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase().slice(0, KEY_LENGTH);
}

/**
 * Every line said in a Claude Code transcript, oldest first, with its time.
 *
 * The protocol the village hears a conversation over carries no clock, but
 * Claude writes every turn to its own transcript with one, so that is where
 * the time of anything said before the village was looking comes from.
 * Subagents, tool results and the CLI's own synthetic turns are left out:
 * none of them is on the gatepost or the answer column.
 */
export function datedOf(lines: readonly string[]): Dated[] {
  const out: Dated[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    let one: {
      type?: string;
      timestamp?: string;
      isSidechain?: boolean;
      isMeta?: boolean;
      message?: { content?: unknown };
    };
    try {
      one = JSON.parse(line);
    } catch {
      continue;
    }
    if ((one.type !== 'user' && one.type !== 'assistant') || one.isSidechain || one.isMeta)
      continue;
    const at = one.timestamp ? Date.parse(one.timestamp) : NaN;
    if (!Number.isFinite(at)) continue;
    const content = one.message?.content;
    const texts =
      typeof content === 'string'
        ? [content]
        : Array.isArray(content)
          ? content
              .filter((part) => part?.type === 'text' && typeof part.text === 'string')
              .map((part) => part.text as string)
          : [];
    for (const text of texts) {
      const key = keyOf(text);
      if (key && !key.startsWith('<')) out.push({ who: one.type === 'user' ? 'you' : 'it', key, at });
    }
  }
  return out;
}

/**
 * When each thing on the board was said, read in the board's own order.
 *
 * The same words can be said twice ("go on"), so this walks the transcript
 * forward alongside the board: each match starts the search for the next one
 * just past it, and something with no match takes no time and moves nothing.
 */
export function clockOf(dated: readonly Dated[]): (who: 'you' | 'it', text: string) => number {
  let from = 0;
  return (who, text) => {
    const key = keyOf(text);
    if (!key) return 0;
    for (let i = from; i < dated.length; i += 1) {
      const one = dated[i];
      if (one.who !== who) continue;
      if (one.key === key || key.startsWith(one.key) || one.key.startsWith(key)) {
        from = i + 1;
        return one.at;
      }
    }
    return 0;
  };
}

const found = new Map<string, string>();

/** Where Claude keeps this conversation, whichever checkout it was started in. */
async function fileOf(session: string): Promise<string | null> {
  const known = found.get(session);
  if (known) return known;
  const root = join(homedir(), '.claude', 'projects');
  let dirs: string[];
  try {
    dirs = await readdir(root);
  } catch {
    return null;
  }
  for (const dir of dirs) {
    const path = join(root, dir, `${session}.jsonl`);
    try {
      await stat(path);
      found.set(session, path);
      return path;
    } catch {
      /* not in this one */
    }
  }
  return null;
}

/** Claude's own record of this conversation, or null when it has none. */
export async function readDated(
  session: string
): Promise<{ size: number; dated: Dated[] } | null> {
  const path = await fileOf(session);
  if (!path) return null;
  try {
    const { size } = await stat(path);
    return { size, dated: datedOf((await readFile(path, 'utf8')).split('\n')) };
  } catch {
    return null;
  }
}

/** How big Claude's record of this conversation is now, to know whether to read it again. */
export async function sizeOf(session: string): Promise<number | null> {
  const path = await fileOf(session);
  if (!path) return null;
  try {
    return (await stat(path)).size;
  } catch {
    return null;
  }
}
