/**
 * What it did, said the way you would say it.
 *
 * Most of what an agent does is looking: reading a file, grepping, checking
 * git, taking a screenshot. None of that is worth a line each; together it is
 * "it looked around". What is worth a line is what changed something: a file
 * written or changed, the app built, installed, tested, a commit, a push. And
 * a command is the least readable thing there is, a run of variables and temp
 * paths before anything that says what it was for, so the line says what it
 * was for instead, in words, worked out from the command itself, because the
 * agent has mostly stopped saying.
 */

export interface Plain {
  /** Worth its own line, or folded into the looking around it. */
  kind: 'act' | 'look';
  /** What it was, in words, when it is an act. */
  said?: string;
  /** What sort of looking, for counting. */
  looked?: 'file' | 'picture' | 'search' | 'check';
}

const PICTURE = /\.(png|jpe?g|gif|webp|heic)\b/i;

/** Whatever a command actually runs, past the variables and the `cd`s. */
function parts(command: string): string[][] {
  return command
    .split(/\s*(?:&&|\|\||;|\n)\s*/)
    .map((one) => one.split('|')[0]!.trim())
    .filter(Boolean)
    .map((one) =>
      one.replace(/^(?:[A-Z_][A-Z0-9_]*=(?:"[^"]*"|'[^']*'|\$\([^)]*\)|\S*)\s+)+/, '').split(/\s+/)
    )
    .filter((words) => words[0] && !/^[A-Z_][A-Z0-9_]*=/.test(words[0]) && words[0] !== 'cd');
}

/** The message a commit went in with, first line only. */
function message(command: string): string | undefined {
  /* Only what comes after the commit itself is its message: a command that
     writes a file out of a heredoc first and commits after would otherwise
     read that file's first line as what the commit was for. */
  const at = command.search(/\bgit\b[^\n]*?\bcommit\b/);
  const tail = at === -1 ? command : command.slice(at);
  /* A message written out long comes in a heredoc, and then the first line
     of that is the message, whatever the `-m` around it says. */
  const long = /<<-?\s*'?"?([A-Z]+)'?"?\s*\n\s*([^\n]+)/.exec(tail)?.[2];
  const quoted = /(?:^|\s)-[a-zA-Z]*m\s+(?:"([^"$]+)"|'([^']+)')/.exec(tail);
  const text = long ?? quoted?.[1] ?? quoted?.[2];
  if (!text) return undefined;
  const line = text
    .split('\n')[0]!
    .replace(/^[a-z]+(\([^)]*\))?!?:\s+/, '')
    .trim();
  return line || undefined;
}

/** What one command did, in words, or that it only looked. */
export function plainCommand(command: string): Plain {
  const all = parts(command);
  const has = (test: (words: string[]) => boolean): boolean => all.some(test);
  const git = (verb: string): boolean =>
    has((w) => w[0] === 'git' && w.slice(1).some((one) => one === verb));

  if (git('commit')) {
    const said = message(command);
    return { kind: 'act', said: said ? `committed “${said}”` : 'committed' };
  }
  if (git('push')) return { kind: 'act', said: 'pushed' };
  if (git('merge') || git('rebase') || git('pull'))
    return { kind: 'act', said: 'brought in changes from another branch' };
  if (git('checkout') || git('switch')) return { kind: 'act', said: 'switched branch' };
  if (git('stash')) return { kind: 'act', said: 'stashed changes' };
  if (git('reset') || git('restore')) return { kind: 'act', said: 'put files back' };

  if (
    has(
      (w) =>
        (w[0] === 'flutter' && w[1] === 'test') ||
        /^(vitest|jest|pytest)$/.test(w[0]!) ||
        (/^(pnpm|npm|yarn|bun|npx)$/.test(w[0]!) && w.includes('test')) ||
        (w[0] === 'cargo' && w[1] === 'test') ||
        (w[0] === 'go' && w[1] === 'test')
    )
  )
    return { kind: 'act', said: 'ran the tests' };
  if (
    has(
      (w) => (w[0] === 'adb' && w.includes('install')) || (w[0] === 'flutter' && w[1] === 'install')
    )
  )
    return { kind: 'act', said: 'installed it on the phone' };
  if (has((w) => /^(ditto|cp)$/.test(w[0]!) && w.some((one) => one.startsWith('/Applications'))))
    return { kind: 'act', said: 'installed it on the Mac' };
  if (
    has(
      (w) =>
        (w[0] === 'flutter' && w[1] === 'build') ||
        /^(xcodebuild|gradle|\.\/gradlew)$/.test(w[0]!) ||
        (w[0] === 'cargo' && w[1] === 'build') ||
        (/^(pnpm|npm|yarn|bun)$/.test(w[0]!) && w.some((one) => /^(build|package|dist)$/.test(one)))
    )
  )
    return { kind: 'act', said: 'built the app' };
  if (
    has(
      (w) =>
        /^(pnpm|npm|yarn|bun|pip3?|brew|cargo)$/.test(w[0]!) && /^(add|install|i)$/.test(w[1] ?? '')
    )
  )
    return { kind: 'act', said: 'installed packages' };
  if (has((w) => w[0] === 'gh' && w[1] === 'pr' && w[2] === 'create'))
    return { kind: 'act', said: 'opened a pull request' };

  if (has((w) => /^(screencapture|screencap)$/.test(w[0]!) || w.includes('screencap')))
    return { kind: 'look', looked: 'picture' };
  if (has((w) => /^(grep|rg|find|fd|ag)$/.test(w[0]!))) return { kind: 'look', looked: 'search' };
  if (has((w) => /^(cat|sed|head|tail|less|bat|wc)$/.test(w[0]!)))
    return { kind: 'look', looked: 'file' };
  return { kind: 'look', looked: 'check' };
}

/** What a read was of, which is a picture if it is one. */
export function plainRead(what: string): Plain {
  return { kind: 'look', looked: PICTURE.test(what) ? 'picture' : 'file' };
}

/** A run of looking, said as one line: "read 4 files and looked at 2 pictures". */
export function lookedAround(looks: Plain['looked'][]): string {
  const count = (kind: Plain['looked']): number => looks.filter((one) => one === kind).length;
  const said = [
    words(count('file'), 'read a file', 'read', 'files'),
    words(count('picture'), 'looked at a picture', 'looked at', 'pictures'),
    words(count('search'), 'searched once', 'searched', 'times'),
    words(count('check'), 'ran a check', 'ran', 'checks'),
  ].filter(Boolean) as string[];
  if (said.length <= 1) return said[0] ?? 'looked around';
  return `${said.slice(0, -1).join(', ')} and ${said.at(-1)}`;
}

function words(many: number, one: string, verb: string, things: string): string | undefined {
  if (!many) return undefined;
  return many === 1 ? one : `${verb} ${many} ${things}`;
}

/**
 * The step it is in the middle of, said on the fire's line in the present
 * tense, naming the one thing that makes it worth reading: the file, the
 * page, what the command is for in the agent's own words.
 *
 * It used to say only the kind of thing, "reading", "running something",
 * which told you something was happening and nothing about what.
 */
export function doingNow(deed: { tool: string; did: string; why?: string }): string {
  switch (deed.tool) {
    case 'execute-tool-call': {
      if (deed.why) return presentOf(deed.why);
      const said = plainCommand(deed.did).said;
      if (said?.startsWith('committed')) return 'committing';
      return said ? presentOf(said) : 'running a command';
    }
    case 'read-tool-call': {
      const name = nameOf(after(deed.did, 'read '));
      /* Before the file arrives the step is named after the tool, "Read File". */
      if (!name || /^read\b/i.test(name)) return 'reading';
      return PICTURE.test(name) ? `looking at ${name}` : `reading ${name}`;
    }
    case 'web-fetch-tool-call': {
      const what = after(deed.did, 'read ');
      if (!what) return 'reading a page';
      const host = /^https?:\/\/([^/]+)/.exec(what)?.[1]?.replace(/^www\./, '');
      return host ? `reading a page on ${host}` : `reading ${what}`;
    }
    case 'create-file-tool-call': {
      const name = nameOf(after(deed.did, 'wrote '));
      return name ? `writing ${name}` : 'writing';
    }
    case 'modify-file-tool-call': {
      const name = nameOf(after(deed.did, 'changed '));
      return name ? `changing ${name}` : 'changing things';
    }
    case 'delete-file-tool-call': {
      const name = nameOf(after(deed.did, 'removed '));
      return name ? `removing ${name}` : 'clearing something away';
    }
    case 'search-tool-call': {
      const query = after(deed.did, 'looked for ')?.trim();
      return query && query.length <= 32 && /^[\w .'-]+$/.test(query)
        ? `looking for “${query}”`
        : 'looking around';
    }
    case 'spawn-subagent-tool-call':
      return deed.did.startsWith('sent ') ? presentOf(deed.did) : 'sending somebody out';
    case 'create-plan-tool-call':
      return 'making a plan';
    default:
      return 'working';
  }
}

function after(did: string, verb: string): string | undefined {
  return did.startsWith(verb) ? did.slice(verb.length).trim() || undefined : undefined;
}

/** The last part of a path, which is the part anybody would call it by. */
function nameOf(path: string | undefined): string | undefined {
  return path?.split(/[/\\]/).filter(Boolean).at(-1);
}

const PAST: Record<string, string> = {
  ran: 'running',
  built: 'building',
  installed: 'installing',
  opened: 'opening',
  pushed: 'pushing',
  brought: 'bringing',
  switched: 'switching',
  stashed: 'stashing',
  put: 'putting',
  sent: 'sending',
};

const DOUBLED: Record<string, string> = {
  commit: 'committing',
  submit: 'submitting',
  admit: 'admitting',
  refer: 'referring',
};

/**
 * A line said as something being done: "run the tests" and "ran the tests"
 * both come out "running the tests". Claude writes what a command is for as
 * an order, and the village writes what was done in the past; the fire speaks
 * in the present.
 */
export function presentOf(line: string): string {
  const [first = '', ...rest] = line.trim().split(/\s+/);
  const word = first.toLowerCase();
  const tail = rest.length ? ` ${rest.join(' ')}` : '';
  if (PAST[word]) return `${PAST[word]}${tail}`;
  if (!/^[a-z]+(-[a-z]+)?$/.test(word) || /(ing|ed)$/.test(word)) return line.trim();
  const dash = word.lastIndexOf('-');
  return `${word.slice(0, dash + 1)}${ing(word.slice(dash + 1))}${tail}`;
}

function ing(verb: string): string {
  let word = verb;
  if (/[^su]s$/.test(word) && word.length > 3) word = word.slice(0, -1);
  if (DOUBLED[word]) return DOUBLED[word];
  if (word.endsWith('ie')) return `${word.slice(0, -2)}ying`;
  if (/[^aeiou]e$/.test(word) && word.length > 2) return `${word.slice(0, -1)}ing`;
  if (/^[^aeiou]*[aeiou][bdgmnprt]$/.test(word)) return `${word}${word.at(-1)}ing`;
  return `${word}ing`;
}
