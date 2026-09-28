import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const ran = promisify(execFile);

/**
 * A checkout's own history, told by version.
 *
 * Nothing here keeps a changelog. The version already lives in the project's
 * own manifest, and every commit that moved it is a line of git history, so the
 * versions are read straight off whichever commits changed that one line, and
 * the commits between two bumps are what went into the later one. A commit
 * newer than the last bump has not gone into any version yet, and says so.
 *
 * Tags are not asked. Most of these apps have never been tagged, and a version
 * that moved in the manifest without one is still the version.
 */
export interface Version {
  /** Null for the commits since the last bump. */
  version: string | null;
  /** Newest first: each commit's subject, as somebody wrote it. */
  lines: string[];
}

/** Where each kind of project keeps its version, and how that line reads. */
const MANIFESTS: { file: string; line: RegExp }[] = [
  { file: 'pubspec.yaml', line: /^version:\s*([^\s#]+)/ },
  /* Only the top-level one: a nested `version` is some pinned tool's. */
  { file: 'package.json', line: /^ {0,2}"version"\s*:\s*"([^"]+)"/ },
  { file: 'app/build.gradle.kts', line: /versionName\s*=\s*"([^"]+)"/ },
  { file: 'app/build.gradle', line: /versionName\s+"([^"]+)"/ },
  { file: 'build.gradle.kts', line: /versionName\s*=\s*"([^"]+)"/ },
  { file: 'Cargo.toml', line: /^version\s*=\s*"([^"]+)"/ },
];

/** How far back is worth reading on a board this small. */
const DEPTH = 300;

export async function versionsOf(checkout: string): Promise<Version[]> {
  const manifest = await manifestIn(checkout);
  const git = (args: string[]): Promise<string> =>
    ran('git', ['-C', checkout, ...args], { maxBuffer: 16 * 1024 * 1024 }).then(
      (out) => out.stdout,
      () => ''
    );
  const [log, bumps] = await Promise.all([
    git(['log', '--no-merges', `-n${DEPTH}`, '--format=%x1e%H%x1f%s']),
    manifest
      ? git(['log', '--no-merges', `-n${DEPTH}`, '-U0', '--format=%x1e%H', '--', manifest.file])
      : Promise.resolve(''),
  ]);
  const commits = records(log).map((one) => {
    const [hash = '', subject = ''] = one.split('\x1f');
    return { hash: hash.trim(), subject: subject.trim() };
  });
  return byVersion(commits, manifest ? bumpsIn(bumps, manifest.line) : new Map());
}

/**
 * The commits, newest first, cut into versions at every commit that moved it.
 *
 * A bump commit is the last commit of its own version, so it opens that
 * version and everything older than it belongs there too, up to the next bump
 * down. Anything newer than the newest bump is not in a version yet.
 */
export function byVersion(
  commits: { hash: string; subject: string }[],
  bumps: ReadonlyMap<string, string>
): Version[] {
  const out: Version[] = [];
  let open: Version = { version: null, lines: [] };
  for (const one of commits) {
    const bumped = bumps.get(one.hash);
    if (bumped !== undefined && bumped !== open.version) {
      if (open.lines.length) out.push(open);
      open = { version: bumped, lines: [] };
    }
    if (one.subject) open.lines.push(saying(one.subject));
  }
  if (open.lines.length) out.push(open);
  return out;
}

/** Which commits set the version, and what to. */
function bumpsIn(patches: string, line: RegExp): Map<string, string> {
  const found = new Map<string, string>();
  for (const one of records(patches)) {
    const [hash = '', ...rest] = one.split('\n');
    for (const added of rest) {
      if (!added.startsWith('+') || added.startsWith('+++')) continue;
      const version = line.exec(added.slice(1))?.[1];
      if (version) {
        /* The build number after a `+` is the machine's, not a version. */
        found.set(hash.trim(), version.replace(/\+.*$/, ''));
        break;
      }
    }
  }
  return found;
}

function records(out: string): string[] {
  return out.split('\x1e').filter((one) => one.trim());
}

async function manifestIn(checkout: string): Promise<(typeof MANIFESTS)[number] | undefined> {
  /* A monorepo keeps the app's version with the app, so the one named after
     the checkout itself counts too, after anything at the root. */
  const named = checkout.replace(/\/+$/, '').split('/').at(-1) ?? '';
  const candidates = [
    ...MANIFESTS,
    ...(named ? [{ file: `apps/${named}/package.json`, line: MANIFESTS[1]!.line }] : []),
  ];
  for (const one of candidates) {
    try {
      const text = await readFile(join(checkout, one.file), 'utf8');
      if (text.split('\n').some((line) => one.line.test(line))) return one;
    } catch {
      // Not this kind of project.
    }
  }
  return undefined;
}

/** `type(scope): ` at the front of a subject is filing, not saying. */
function saying(subject: string): string {
  const plain = subject.replace(/^[a-z]+(\([^)]*\))?!?:\s+/, '');
  return plain || subject;
}
