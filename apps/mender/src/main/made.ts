import { existsSync } from 'node:fs';
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
const BUILT = /(?:^|[\s'"`(=:])((?:~|\/)[^\s'"`()<>]*?\.(?:apk|aab|dmg|app|pkg|pdf))(?=$|[\s'"`),.;:])/g;

/** A page published to claude.ai, with the words it was linked under when it was. */
const PAGE =
  /(?:\[([^\]\n]{1,80})\]\()?((?:https?:\/\/)?claude\.ai\/(?:code\/)?artifacts?\/[A-Za-z0-9-]+)/g;

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
  const pages = (text: string, at: number): void => {
    for (const match of text.matchAll(PAGE)) {
      const address = match[2]!;
      const url = address.startsWith('http') ? address : `https://${address}`;
      const words = match[1]?.trim();
      const name = words && !/claude\.ai/.test(words) ? words : 'a published page';
      found.push({ id: url, kind: 'page', name, url, at });
    }
  };
  const walk = (node: ToolNode, over: boolean): void => {
    if (node.kind === 'tool-group') {
      for (const child of node.children) walk(child, over);
      return;
    }
    const at = stamp(node.id, over);
    if (node.kind === 'create-file-tool-call' && node.status === 'done') file(node.path, at);
    else if (node.kind === 'execute-tool-call' && node.status === 'done') {
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
 * something never takes it off the list. A name that says something beats
 * one that does not.
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
    const name = had.name === 'a published page' ? one.name : had.name;
    by.set(one.id, { ...had, at, name });
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
