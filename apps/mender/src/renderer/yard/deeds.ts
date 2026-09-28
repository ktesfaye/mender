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
      one
        .replace(/^(?:[A-Z_][A-Z0-9_]*=(?:"[^"]*"|'[^']*'|\$\([^)]*\)|\S*)\s+)+/, '')
        .split(/\s+/)
    )
    .filter((words) => words[0] && !/^[A-Z_][A-Z0-9_]*=/.test(words[0]) && words[0] !== 'cd');
}

/** The message a commit went in with, first line only. */
function message(command: string): string | undefined {
  const quoted = /-m\s+(?:"([^"]+)"|'([^']+)')/.exec(command);
  const text = quoted?.[1] ?? quoted?.[2] ?? /<<'?EOF'?\n([^\n]+)/.exec(command)?.[1];
  if (!text) return undefined;
  const line = text.split('\n')[0]!.replace(/^[a-z]+(\([^)]*\))?!?:\s+/, '').trim();
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
      (w) =>
        (w[0] === 'adb' && w.includes('install')) ||
        (w[0] === 'flutter' && w[1] === 'install')
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
        (/^(pnpm|npm|yarn|bun)$/.test(w[0]!) &&
          w.some((one) => /^(build|package|dist)$/.test(one)))
    )
  )
    return { kind: 'act', said: 'built the app' };
  if (has((w) => /^(pnpm|npm|yarn|bun|pip3?|brew|cargo)$/.test(w[0]!) && /^(add|install|i)$/.test(w[1] ?? '')))
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
