import { createReadStream } from 'node:fs';
import { cp, open, readdir, rm, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { createInterface } from 'node:readline';

/**
 * One of Claude Code CLI's own past terminal sessions for a checkout, read
 * straight off its own on-disk transcript under `~/.claude/projects/` —
 * nothing Mender stores itself, and nothing this file writes to.
 */
export interface ClaudeCliSession {
  /** Matches the file's own name and the `sessionId` field inside it. */
  id: string;
  gitBranch: string | null;
  mtimeMs: number;
  size: number;
  /** What the CLI itself called it: the name Claude Code gives a session
      as it goes and appends to the transcript, newest wins. Failing that,
      the first real thing typed, truncated, or a plain fallback. */
  title: string;
  /** The first real thing typed, whole, up to a paragraph. */
  said: string | null;
  /** Where it was had, when that is some other folder than the one being
      asked about: the folder by name, and the CLI's own directory it is
      kept under, which is what it is read and brought over from. */
  elsewhere: { folder: string; dir: string } | null;
}

const TITLE_CAP = 80;
const SAID_CAP = 600;
/** Claude Code appends its name for a session near the live end of the
    file, again every so often, so the last stretch is where to look. */
const TAIL_BYTES = 256 * 1024;
const NO_TITLE = '(a past session with nothing typed yet)';
/** How many of a project's sessions this ever offers, newest first — a
    long-lived checkout can have hundreds, and nobody is scrolling that far
    to pick one up again. */
const HISTORY_CAP = 30;
/** Every other folder's sessions together, newest first. */
const ELSEWHERE_CAP = 60;
/** How far into one file this ever reads. Every field this cares about
    (`sessionId`, `gitBranch`, the first real turn) sits well inside a
    file's first few dozen lines in every session inspected on this
    machine; nothing here needs the whole transcript. */
const READ_LINE_CAP = 400;

/**
 * Claude Code CLI's own encoding of an absolute checkout path into the
 * directory name it keeps that checkout's sessions under.
 *
 * Confirmed against this machine's own `~/.claude/projects/`: every `/`
 * becomes a `-`, and a segment that already had a literal `-` in it is left
 * alone rather than collapsed or escaped. No real directory on this machine
 * contains a literal `.` or `_`, which only holds together if every
 * non-alphanumeric character is folded, not only `/` — that is the rule
 * here. Worth one manual check against a real `claude` run in a scratch
 * directory whose path has a `.` or `_` before trusting this further.
 */
export function claudeProjectDirName(absolutePath: string): string {
  return absolutePath.replace(/[^a-zA-Z0-9]/g, '-');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * What one `.jsonl` line at a time says about `sessionId`, `gitBranch`, and
 * the first real thing a person typed — pulled out so it can be tested
 * against fixture lines directly, without touching a filesystem.
 *
 * A `type: 'user'` entry is not necessarily something a person typed: the
 * same role carries tool results back (content is an array, not a string),
 * subagent turns (`isSidechain: true`), and the CLI's own synthetic context
 * (always opening with a tag no hand-typed line starts with). All three are
 * skipped in favour of the first turn that is none of them.
 */
export function parseClaudeSessionLines(lines: readonly string[]): {
  sessionId: string | null;
  gitBranch: string | null;
  title: string | null;
  said: string | null;
  cwd: string | null;
} {
  let cwd: string | null = null;
  let sessionId: string | null = null;
  let gitBranch: string | null = null;
  let title: string | null = null;
  let said: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let obj: Record<string, unknown>;
    try {
      obj = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      continue;
    }
    if (!sessionId && typeof obj.sessionId === 'string') sessionId = obj.sessionId;
    if (!cwd && typeof obj.cwd === 'string' && obj.cwd) cwd = obj.cwd;
    if (typeof obj.gitBranch === 'string' && obj.gitBranch) gitBranch = obj.gitBranch;
    if (!title) {
      const typed = typedTurn(obj);
      if (typed) {
        title = typed.length > TITLE_CAP ? `${typed.slice(0, TITLE_CAP).trimEnd()}…` : typed;
        said = typed.length > SAID_CAP ? `${typed.slice(0, SAID_CAP).trimEnd()}…` : typed;
      }
    }
  }

  return { sessionId, gitBranch, title, said, cwd };
}

/** What a person actually typed, when this line is that, and nothing when
    it is a tool result, a subagent's turn or the CLI's own context. */
function typedTurn(obj: Record<string, unknown>): string | null {
  if (obj.type !== 'user' || obj.isSidechain === true || !isPlainObject(obj.message)) return null;
  const content = obj.message.content;
  const typed = unpasted(spoken(content).trim());
  return typed && !typed.startsWith('<') && !typed.startsWith('[Request interrupted')
    ? typed
    : null;
}

/** A terminal writes what was typed as one string; a session spoken to over
    ACP, which is every one the village starts, writes it as blocks, its
    words in text blocks beside any picture. A turn carrying a tool result
    is the CLI answering itself, never something typed. */
function spoken(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  if (content.some((part) => isPlainObject(part) && part.type === 'tool_result')) return '';
  return content
    .filter(
      (part): part is { type: 'text'; text: string } =>
        isPlainObject(part) && part.type === 'text' && typeof part.text === 'string'
    )
    .map((part) => part.text.trim())
    .filter(Boolean)
    .join('\n');
}

/** A turn that opens with something pasted is still typed: what was written
    around the paste is the person's own words, and the paste when that is
    all there is. */
function unpasted(typed: string): string {
  const pasted = /<pasted_content\b[^>]*>([\s\S]*?)<\/pasted_content\b[^>]*>/g;
  if (!typed.startsWith('<pasted_content')) return typed;
  const around = typed.replace(pasted, ' ').trim();
  if (around) return around;
  return [...typed.matchAll(pasted)]
    .map((one) => one[1]!.trim())
    .join('\n')
    .trim();
}

/** The last name Claude Code gave the session among these lines. */
export function lastAiTitle(lines: readonly string[]): string | null {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!;
    if (!line.includes('"ai-title"')) continue;
    try {
      const obj = JSON.parse(line) as Record<string, unknown>;
      if (obj.type === 'ai-title' && typeof obj.aiTitle === 'string' && obj.aiTitle.trim()) {
        return obj.aiTitle.trim();
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function readTail(path: string, size: number): Promise<string[]> {
  const handle = await open(path, 'r');
  try {
    const length = Math.min(size, TAIL_BYTES);
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, size - length);
    return buffer.toString('utf8').split('\n');
  } finally {
    await handle.close();
  }
}

async function readSessionMeta(path: string): Promise<ReturnType<typeof parseClaudeSessionLines>> {
  const lines: string[] = [];
  const stream = createReadStream(path, { encoding: 'utf8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    lines.push(line);
    if (lines.length >= READ_LINE_CAP) break;
  }
  rl.close();
  stream.close();
  return parseClaudeSessionLines(lines);
}

function projectsDir(): string {
  return join(homedir(), '.claude', 'projects');
}

async function readSessionsIn(dirName: string, elsewhere: boolean): Promise<ClaudeCliSession[]> {
  const dir = join(projectsDir(), dirName);
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  const found = await Promise.all(
    names
      .filter((name) => name.endsWith('.jsonl'))
      .map(async (name): Promise<ClaudeCliSession | null> => {
        const path = join(dir, name);
        let stats;
        try {
          stats = await stat(path);
        } catch {
          return null;
        }
        const meta = await readSessionMeta(path);
        if (elsewhere && !meta.title) return null;
        const named = await readTail(path, stats.size)
          .then(lastAiTitle)
          .catch(() => null);
        return {
          id: meta.sessionId ?? name.slice(0, -'.jsonl'.length),
          gitBranch: meta.gitBranch,
          mtimeMs: stats.mtimeMs,
          size: stats.size,
          title: named ?? meta.title ?? NO_TITLE,
          said: meta.said,
          elsewhere: elsewhere
            ? { folder: basename(meta.cwd ?? dirName) || dirName, dir: dirName }
            : null,
        };
      })
  );
  return found.filter((session): session is ClaudeCliSession => session !== null);
}

const newestFirst = (a: ClaudeCliSession, b: ClaudeCliSession): number => b.mtimeMs - a.mtimeMs;

/**
 * Every past terminal session the Claude Code CLI has kept for this
 * checkout's own path — not any worktree cut from it, the checkout's real
 * root, since that is where the CLI itself was ever actually run. Newest
 * first, capped. A checkout the CLI has never touched, or one whose
 * `~/.claude/projects/` folder is simply gone, comes back empty rather than
 * failing.
 */
export async function listClaudeSessions(projectPath: string): Promise<ClaudeCliSession[]> {
  return (await readSessionsIn(claudeProjectDirName(projectPath), false))
    .sort(newestFirst)
    .slice(0, HISTORY_CAP);
}

/** A folder the CLI keeps sessions for that nobody would go back to: a
    scratch directory under the system's temp space. */
function isScratch(dirName: string): boolean {
  return /^-(private-)?(tmp|var)-/.test(dirName);
}

/**
 * Every session had in any other folder on this machine, newest first:
 * a conversation is picked up by what it was about, and that is often not
 * the folder it happened to be started in. Sessions nothing was ever typed
 * in, and scratch folders, are left out.
 */
export async function listClaudeSessionsElsewhere(
  projectPath: string
): Promise<ClaudeCliSession[]> {
  const own = claudeProjectDirName(projectPath);
  let dirs: string[];
  try {
    dirs = await readdir(projectsDir());
  } catch {
    return [];
  }
  const found = await Promise.all(
    dirs
      .filter((dirName) => dirName !== own && !isScratch(dirName))
      .map((dirName) => readSessionsIn(dirName, true))
  );
  return found.flat().sort(newestFirst).slice(0, ELSEWHERE_CAP);
}

/**
 * Brings a session had in another folder over into this one, so the CLI,
 * which only ever looks for a session under the folder it is run in, finds
 * it here. A copy: the original stays where it was, whole.
 */
export async function adoptClaudeSession(
  projectPath: string,
  fromDir: string,
  id: string
): Promise<void> {
  if (fromDir.includes('/') || id.includes('/') || fromDir.startsWith('.')) {
    throw new Error('not a session');
  }
  const from = join(projectsDir(), fromDir);
  const to = join(projectsDir(), claudeProjectDirName(projectPath));
  await cp(join(from, `${id}.jsonl`), join(to, `${id}.jsonl`), { force: false });
  await cp(join(from, id), join(to, id), { recursive: true, force: false }).catch(() => undefined);
}

/**
 * Takes every trace of one session off this machine: its transcript in
 * whichever folder it was had, the helpers' transcripts and tool output
 * beside it, the copies of files it edited kept for rewinding, and its
 * shell environment. Looked for in every folder rather than worked out from
 * the checkout, so a session resumed from somewhere else goes too.
 */
export async function forgetClaudeSession(id: string): Promise<void> {
  if (!/^[0-9a-f-]{8,}$/i.test(id)) return;
  await wipeClaudeSession(id);
  /* The CLI writes a last few lines as it exits, the last thing said among
     them, and that can land just after the transcript has gone, so it is
     looked for again once it has surely finished. */
  for (const after of AFTERWARDS_MS) {
    await new Promise((settle) => setTimeout(settle, after));
    await wipeClaudeSession(id);
  }
}

const AFTERWARDS_MS = [2_000, 10_000];

async function wipeClaudeSession(id: string): Promise<void> {
  const home = join(homedir(), '.claude');
  const folders = await readdir(projectsDir(), { withFileTypes: true }).catch(() => []);
  const gone = (path: string) => rm(path, { recursive: true, force: true }).catch(() => undefined);
  await Promise.all([
    ...folders
      .filter((folder) => folder.isDirectory())
      .flatMap((folder) => [
        gone(join(projectsDir(), folder.name, `${id}.jsonl`)),
        gone(join(projectsDir(), folder.name, id)),
      ]),
    gone(join(home, 'file-history', id)),
    gone(join(home, 'session-env', id)),
  ]);
}

/** Everything in one past session that says what it came to: every typed
    turn and the last few things the agent said back in words. */
export interface ClaudeStory {
  turns: number;
  asked: string[];
  answered: string[];
}

const ANSWERS_KEPT = 4;

/** One pass over a transcript, keeping only what a person would call the
    conversation. Lines are sifted by what they contain before any is
    parsed, since the tool traffic in a long session runs to hundreds of
    megabytes and none of it is wanted here. */
export async function readClaudeStory(dirName: string, id: string): Promise<ClaudeStory> {
  const path = join(projectsDir(), dirName, `${id}.jsonl`);
  const asked: string[] = [];
  const answered: string[] = [];
  const stream = createReadStream(path, { encoding: 'utf8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    const user = line.includes('"role":"user","content":"');
    const agent = !user && line.includes('"type":"assistant"') && line.includes('"type":"text"');
    if (!user && !agent) continue;
    let obj: Record<string, unknown>;
    try {
      obj = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue;
    }
    if (user) {
      const typed = typedTurn(obj);
      if (typed) asked.push(typed);
      continue;
    }
    if (obj.isSidechain === true || !isPlainObject(obj.message)) continue;
    const content = obj.message.content;
    if (!Array.isArray(content)) continue;
    const words = content
      .filter(
        (part): part is { type: 'text'; text: string } =>
          isPlainObject(part) && part.type === 'text' && typeof part.text === 'string'
      )
      .map((part) => part.text.trim())
      .filter(Boolean)
      .join('\n');
    if (!words) continue;
    answered.push(words);
    if (answered.length > ANSWERS_KEPT) answered.shift();
  }
  return { turns: asked.length, asked, answered };
}
