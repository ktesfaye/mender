import { readdir, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * What somebody a session sent out actually did, read off Claude's own record
 * of them.
 *
 * The protocol only carries a helper's steps while they are happening: a
 * session resumed after a restart comes back with the helper's launch and its
 * outcome and nothing between. Claude keeps every helper's whole conversation
 * beside the session's own, under `<session>/subagents/`, with a small
 * `.meta.json` naming the tool call that sent them, which is the one thing
 * the village already knows them by.
 */
export interface HelperTrail {
  /** What they were told, in full. */
  prompt?: string;
  /** Said the way a session's own deeds are, so the board words them the same. */
  steps: { id: string; did: string; why?: string; tool: string; wrong?: boolean }[];
  /** The last thing they said, which is what they came back with. */
  answer?: string;
}

const PROJECTS = join(homedir(), '.claude', 'projects');

export async function helperTrail(
  session: string,
  call: string,
  root: string | undefined
): Promise<HelperTrail | null> {
  const file = await find(session, call);
  if (!file) return null;
  return read(await readFile(file, 'utf8'), root);
}

async function find(session: string, call: string): Promise<string | null> {
  let places: string[];
  try {
    places = await readdir(PROJECTS);
  } catch {
    return null;
  }
  for (const place of places) {
    const dir = join(PROJECTS, place, session, 'subagents');
    let names: string[];
    try {
      names = await readdir(dir);
    } catch {
      continue;
    }
    for (const name of names) {
      if (!name.endsWith('.meta.json')) continue;
      try {
        const meta = JSON.parse(await readFile(join(dir, name), 'utf8')) as { toolUseId?: unknown };
        if (meta.toolUseId === call) return join(dir, name.replace(/\.meta\.json$/, '.jsonl'));
      } catch {
        continue;
      }
    }
  }
  return null;
}

type Block = {
  type?: string;
  text?: string;
  name?: string;
  id?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  is_error?: boolean;
};

export function read(jsonl: string, root: string | undefined): HelperTrail {
  const trail: HelperTrail = { steps: [] };
  const byCall = new Map<string, HelperTrail['steps'][number]>();
  for (const line of jsonl.split('\n')) {
    if (!line.trim()) continue;
    let entry: { type?: string; message?: { content?: unknown } };
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    const content = entry.message?.content;
    if (entry.type === 'user' && typeof content === 'string') {
      trail.prompt ??= content;
      continue;
    }
    if (!Array.isArray(content)) continue;
    for (const block of content as Block[]) {
      if (entry.type === 'assistant' && block.type === 'text' && block.text?.trim()) {
        trail.answer = block.text.trim();
      } else if (entry.type === 'assistant' && block.name === 'SubagentHandback') {
        /* Newer Claude hands its answer back through a tool rather than as
           the last thing it says, and that is not a step, it is the answer. */
        const message = block.input?.message;
        if (typeof message === 'string' && message.trim()) trail.answer = message.trim();
      } else if (entry.type === 'assistant' && block.type === 'tool_use' && block.name) {
        const step = {
          id: block.id ?? `step-${trail.steps.length}`,
          ...deedOf(block.name, block.input ?? {}, root),
        };
        trail.steps.push(step);
        if (block.id) byCall.set(block.id, step);
      } else if (block.type === 'tool_result' && block.is_error && block.tool_use_id) {
        const step = byCall.get(block.tool_use_id);
        if (step) step.wrong = true;
      } else if (entry.type === 'user' && block.type === 'text' && block.text?.trim()) {
        trail.prompt ??= block.text.trim();
      }
    }
  }
  return trail;
}

function deedOf(
  tool: string,
  input: Record<string, unknown>,
  root: string | undefined
): { did: string; why?: string; tool: string } {
  const said = (key: string): string =>
    typeof input[key] === 'string' ? (input[key] as string) : '';
  const at = (path: string): string => {
    if (root && path.startsWith(`${root}/`)) return path.slice(root.length + 1);
    const home = homedir();
    return home && path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path;
  };
  switch (tool) {
    case 'Bash': {
      const command = said('command');
      const why = said('description');
      return {
        did: root ? command.replaceAll(`${root}/`, '') : command,
        ...(why ? { why: lower(why) } : {}),
        tool: 'execute-tool-call',
      };
    }
    case 'Read':
      return { did: `read ${at(said('file_path'))}`, tool: 'read-tool-call' };
    case 'Write':
      return { did: `wrote ${at(said('file_path'))}`, tool: 'create-file-tool-call' };
    case 'Edit':
    case 'MultiEdit':
      return { did: `changed ${at(said('file_path'))}`, tool: 'modify-file-tool-call' };
    case 'Grep':
    case 'Glob':
      return { did: `looked for ${said('pattern')}`, tool: 'search-tool-call' };
    case 'WebFetch':
      return { did: `read ${said('url')}`, tool: 'web-fetch-tool-call' };
    case 'WebSearch':
      return { did: `searched for ${said('query')}`, tool: 'search-tool-call' };
    case 'Agent':
    case 'Task':
      return {
        did: `sent somebody off to ${lower(said('description'))}`,
        tool: 'spawn-subagent-tool-call',
      };
    default:
      return {
        did: tool.startsWith('mcp__') ? tool.split('__').slice(1).join(': ') : lower(tool),
        tool: 'unknown-tool-call',
      };
  }
}

function lower(said: string): string {
  return said.charAt(0).toLowerCase() + said.slice(1);
}
