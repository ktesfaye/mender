import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
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
  /** There is no stored title anywhere in the file — the CLI's own
      `/resume` picker fabricates one live at render time. This is the
      first real thing typed, truncated, or a plain fallback. */
  title: string;
}

const TITLE_CAP = 80;
const NO_TITLE = '(a past session with nothing typed yet)';
/** How many of a project's sessions this ever offers, newest first — a
    long-lived checkout can have hundreds, and nobody is scrolling that far
    to pick one up again. */
const HISTORY_CAP = 30;
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
} {
  let sessionId: string | null = null;
  let gitBranch: string | null = null;
  let title: string | null = null;

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
    if (typeof obj.gitBranch === 'string' && obj.gitBranch) gitBranch = obj.gitBranch;
    if (!title && obj.type === 'user' && obj.isSidechain !== true && isPlainObject(obj.message)) {
      const content = (obj.message as Record<string, unknown>).content;
      if (typeof content === 'string') {
        const said = content.trim();
        if (said && !said.startsWith('<')) {
          title = said.length > TITLE_CAP ? `${said.slice(0, TITLE_CAP).trimEnd()}…` : said;
        }
      }
    }
  }

  return { sessionId, gitBranch, title };
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

/**
 * Every past terminal session the Claude Code CLI has kept for this
 * checkout's own path — not any worktree cut from it, the checkout's real
 * root, since that is where the CLI itself was ever actually run. Newest
 * first, capped. A checkout the CLI has never touched, or one whose
 * `~/.claude/projects/` folder is simply gone, comes back empty rather than
 * failing.
 */
export async function listClaudeSessions(projectPath: string): Promise<ClaudeCliSession[]> {
  const dir = join(homedir(), '.claude', 'projects', claudeProjectDirName(projectPath));
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
        return {
          id: meta.sessionId ?? name.slice(0, -'.jsonl'.length),
          gitBranch: meta.gitBranch,
          mtimeMs: stats.mtimeMs,
          size: stats.size,
          title: meta.title ?? NO_TITLE,
        };
      })
  );

  return found
    .filter((session): session is ClaudeCliSession => session !== null)
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .slice(0, HISTORY_CAP);
}
