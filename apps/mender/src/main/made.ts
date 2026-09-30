import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename } from 'node:path';
import type { ToolNode, TranscriptTurn } from '@emdash/core/runtimes/acp/api';
import type { Made } from '@shared/agents';

/**
 * What a session made, as opposed to what it changed.
 *
 * A coding agent rewrites source all day and none of that is a thing handed
 * over: it is what it did. What it made is what you would go and look at
 * afterwards. A page it published, a document or a picture it wrote out, an
 * app or a package it built. Those are recognised by what they are rather
 * than by which tool made them, because the same page can arrive by a write,
 * a shell heredoc or a publish.
 */

/** Written files that are for reading or looking at rather than for running. */
const LOOKED_AT = new Set([
  'md',
  'markdown',
  'html',
  'htm',
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'svg',
  'csv',
  'mp4',
  'mov',
  'mp3',
  'wav',
  'docx',
  'pptx',
  'xlsx',
]);

/** What a build leaves behind that you would open or install. */
const BUILT =
  /(?:^|[\s'"`(=:])((?:~|\/)[^\s'"`()<>]*?\.(?:apk|aab|dmg|app|pkg|pdf))(?=$|[\s'"`),.;:])/g;

/** A page published to claude.ai, with the words it was linked under when it was. */
const PAGE =
  /(?:\[([^\]\n]{1,80})\]\()?((?:https?:\/\/)?claude\.ai\/(?:code\/)?artifacts?\/[A-Za-z0-9-]+)/g;

/** What a publish says back: the file it sent and where it went. */
const PUBLISHED =
  /Published (\/\S+) at ((?:https?:\/\/)?claude\.ai\/(?:code\/)?artifacts?\/[A-Za-z0-9-]+)/g;

/** What any page is called by whoever wrote it. */
const TITLE = /<title[^>]*>([^<]{1,120})<\/title>/i;

const UNNAMED = 'a published page';

/** Titles already read off disk, since the list is worked out on every token. */
const titles = new Map<string, string>();

function titleOnDisk(path: string): string | undefined {
  const had = titles.get(path);
  if (had) return had;
  try {
    const found = TITLE.exec(readFileSync(path, 'utf8'))?.[1]?.trim();
    if (found) titles.set(path, found);
    return found || undefined;
  } catch {
    return undefined;
  }
}

/** The page's own title, from disk or from however it was written this session. */
function titleOf(path: string, written: ReadonlyMap<string, string>): string | undefined {
  const stem = (one: string): string => one.replace(/\.tpl(?=\.[^.]+$)/, '');
  const writ = written.get(path) ?? [...written].find(([one]) => stem(one) === stem(path))?.[1];
  return titleOnDisk(path) ?? (writ ? TITLE.exec(writ)?.[1]?.trim() : undefined);
}

/**
 * What a bare address in prose was called: the few words of its own clause
 * just before it, as in "food is at" or "and activities at". Anything longer
 * is a sentence about the page rather than its name, and is left alone.
 */
function calledIn(text: string, index: number): string | undefined {
  const before = text.slice(Math.max(0, index - 120), index);
  const clause = before.split(/[.!?;,:(\n]|\s(?:and|or)\s/).pop() ?? '';
  const name = clause
    .replace(/\s+(?:is|are|lives?|sits?|went up|goes|now)?\s*(?:at|here|on)?\s*$/i, '')
    .trim();
  const words = name.split(/\s+/).filter(Boolean);
  if (!words.length || words.length > 4 || /claude\.ai|https?:/i.test(name)) return undefined;
  return name;
}

/** Places a file is only ever passing through, or is the agent's own bookkeeping. */
function incidental(path: string): boolean {
  return (
    /^\/(private\/)?(tmp|var\/folders)\//.test(path) ||
    /\/(node_modules|\.git|\.claude|\.codex|\.cursor)\//.test(path) ||
    /\/(CLAUDE|AGENTS|MEMORY)\.md$/i.test(path)
  );
}

function extension(path: string): string {
  const name = basename(path);
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

function expand(path: string): string {
  return path.startsWith('~/') ? `${homedir()}${path.slice(1)}` : path;
}

/** Everything the transcript says was made, oldest first. */
export function madeIn(
  turns: readonly TranscriptTurn[],
  stamp: (id: string, over: boolean) => number
): Made[] {
  const found: Made[] = [];
  const file = (path: string, at: number): void => {
    if (!path.startsWith('/') || incidental(path)) return;
    if (!LOOKED_AT.has(extension(path))) return;
    found.push({ id: path, kind: 'file', name: basename(path), path, at });
  };
  const builds = (text: string | undefined, at: number): void => {
    for (const match of (text ?? '').matchAll(BUILT)) {
      const path = expand(match[1]!.replace(/\/+$/, ''));
      if (!path.startsWith('/') || incidental(path)) continue;
      found.push({ id: path, kind: 'build', name: basename(path), path, at });
    }
  };
  const written = new Map<string, string>();
  const pages = (text: string, at: number): void => {
    for (const match of text.matchAll(PAGE)) {
      const address = match[2]!;
      const url = address.startsWith('http') ? address : `https://${address}`;
      const words = match[1]?.trim();
      const name =
        (words && !/claude\.ai/.test(words) ? words : calledIn(text, match.index)) ?? UNNAMED;
      found.push({ id: url, kind: 'page', name, url, at });
    }
  };
  /* A publish names the file it sent, and a page names itself, so a page
     whose publish was seen is called what it says at the top. */
  const published = (text: string | undefined, summary: string | undefined, at: number): void => {
    for (const match of (text ?? '').matchAll(PUBLISHED)) {
      const address = match[2]!;
      const url = address.startsWith('http') ? address : `https://${address}`;
      const described = summary?.split(/[,.;:\u2014(]/)[0]?.trim();
      const titled = titleOf(match[1]!, written);
      const name = titled ?? (described && described.length <= 60 ? described : undefined);
      found.push({
        id: url,
        kind: 'page',
        name: name ?? UNNAMED,
        url,
        at,
        ...(name ? { sure: true } : {}),
      });
    }
  };
  const walk = (node: ToolNode, over: boolean): void => {
    if (node.kind === 'tool-group') {
      for (const child of node.children) walk(child, over);
      return;
    }
    const at = stamp(node.id, over);
    if (node.kind === 'create-file-tool-call' && node.status === 'done') {
      written.set(node.path, node.content);
      file(node.path, at);
    } else if (
      (node.kind === 'unknown-tool-call' || node.kind === 'mcp-tool-call') &&
      node.status === 'done'
    ) {
      published(node.outputText, node.inputSummary, at);
    } else if (node.kind === 'execute-tool-call' && node.status === 'done') {
      builds(node.outputText, at);
    }
    for (const child of node.children ?? []) walk(child, over);
  };

  for (const turn of turns) {
    const over = turn.outcome !== undefined;
    for (const item of turn.items) {
      if (item.kind === 'message') {
        /* A reply still being written can stop halfway through an address,
           so what it said is only read once the turn is over. */
        if (item.role === 'user' || !over) continue;
        const at = stamp(item.id, over);
        pages(item.text, at);
        builds(item.text, at);
      } else if (item.kind !== 'thinking') walk(item, over);
    }
  }
  return found;
}

/**
 * What was already kept with what was just found, newest first.
 *
 * The first time something was seen is when it was made, so a later sighting
 * of the same thing never moves it, and a resumed transcript that forgot
 * something never takes it off the list. A name the page gave itself beats
 * one read out of prose, and either beats none.
 */
export function kept(before: readonly Made[], found: readonly Made[]): Made[] {
  const by = new Map<string, Made>();
  for (const one of [...before, ...found]) {
    const had = by.get(one.id);
    if (!had) {
      by.set(one.id, one);
      continue;
    }
    const at = had.at && one.at ? Math.min(had.at, one.at) : had.at || one.at;
    const better = (one.sure && !had.sure) || (had.name === UNNAMED && !had.sure);
    const name = better && one.name !== UNNAMED ? one.name : had.name;
    const sure = had.sure || (better && one.sure);
    by.set(one.id, { ...had, at, name, ...(sure ? { sure: true } : {}) });
  }
  return [...by.values()].sort((a, b) => b.at - a.at);
}

/** How long a look at the disk is trusted for, since the list is read on every token. */
const LOOKED_FOR = 5_000;
const looked = new Map<string, { at: number }>();

/**
 * Only what is still there to be looked at. A page on the web always is.
 *
 * Only finding it is trusted for a while. Not finding it is asked again every
 * time, because nothing reads this list again once a session goes quiet, and
 * a file missed once would stay missing until something else happened.
 */
export function stillThere(made: readonly Made[]): Made[] {
  const now = Date.now();
  return made.filter((one) => {
    if (!one.path) return true;
    const last = looked.get(one.path);
    if (last && now - last.at < LOOKED_FOR) return true;
    const there = existsSync(one.path);
    if (there) looked.set(one.path, { at: now });
    else looked.delete(one.path);
    return there;
  });
}
