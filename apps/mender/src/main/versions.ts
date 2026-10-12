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
 * Where the manifest never moves on this branch, a big shared repository that
 * bumps on release branches, the release tags say it instead. Those often carry
 * the platform they shipped to, `1.4.0-android` beside `1.4.0-ios`, so the
 * platform comes off and the two are one version, and each version holds what
 * it has that the one before it did not.
 */
export interface Version {
  /** Null for the commits since the last bump. */
  version: string | null;
  /** Newest first: each commit's subject, as somebody wrote it. */
  lines: string[];
  /** How many more went in than are written out. */
  more: number;
}

/** A busy repository puts hundreds of commits in a release; a few say enough. */
const SHOWN = 3;
/** And nobody reads back past this many versions in a corner this small. */
const VERSIONS = 12;

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
  const moved = manifest ? bumpsIn(bumps, manifest.line) : new Map<string, string>();
  if (!commits.some((one) => moved.has(one.hash))) {
    const tagged = await byTags(git);
    if (tagged.length) return tagged;
  }
  return byVersion(commits, moved);
}

/**
 * The release tags, platform taken off, as versions newest first, each the
 * commits it has that the version under it has not, and the commits on this
 * branch since the newest at the top.
 */
async function byTags(git: (args: string[]) => Promise<string>): Promise<Version[]> {
  const versions = releases((await git(['tag', '--list'])).split('\n')).slice(0, VERSIONS + 1);
  if (!versions.length) return [];
  const between = async (version: string | null, from: string[], not: string[]) => {
    const range = [...from, ...(not.length ? ['--not', ...not] : [])];
    const [log, count] = await Promise.all([
      git(['log', '--no-merges', `-n${SHOWN}`, '--format=%s', ...range]),
      git(['rev-list', '--no-merges', '--count', ...range]),
    ]);
    const lines = log
      .split('\n')
      .map((one) => one.trim())
      .filter(Boolean)
      .map(saying);
    return { version, lines, more: Math.max(0, (Number(count.trim()) || 0) - lines.length) };
  };
  const all = await Promise.all([
    between(null, ['HEAD'], versions[0]!.tags),
    ...versions
      .slice(0, VERSIONS)
      .map((one, at) => between(one.version, one.tags, versions[at + 1]?.tags ?? [])),
  ]);
  return all.filter((one) => one.lines.length);
}

/** Which tags name a release, grouped by version, newest version first. */
export function releases(tags: string[]): { version: string; tags: string[] }[] {
  const found = new Map<string, string[]>();
  for (const tag of tags.map((one) => one.trim())) {
    const version = RELEASE.exec(tag)?.[1];
    if (!version) continue;
    found.set(version, [...(found.get(version) ?? []), tag]);
  }
  return [...found]
    .map(([version, tags]) => ({ version, tags }))
    .sort((a, b) => newer(b.version, a.version));
}

/* `v1.4.0`, `1.4.0-android`, `ios/1.4.0`, `release-1.4.0+212`: the version is
   the numbers, and a platform either side or a build after a `+` is where and
   how it shipped. A `-beta.2` is not a platform, so it is not a release. */
const PLATFORM = '(?:android|ios|ipados|macos|mac|web|windows|linux|desktop|mobile|play|appstore)';
const RELEASE = new RegExp(
  `^(?:(?:release|${PLATFORM})[-_/@])?v?(\\d+(?:\\.\\d+){1,3})(?:\\+[\\w.]+)?(?:[-_/@]${PLATFORM})?$`,
  'i'
);

function newer(a: string, b: string): number {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let at = 0; at < Math.max(x.length, y.length); at++) {
    const d = (x[at] ?? 0) - (y[at] ?? 0);
    if (d) return d;
  }
  return 0;
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
  let open: Version = { version: null, lines: [], more: 0 };
  for (const one of commits) {
    const bumped = bumps.get(one.hash);
    if (bumped !== undefined && bumped !== open.version) {
      if (open.lines.length) out.push(open);
      open = { version: bumped, lines: [], more: 0 };
    }
    if (!one.subject) continue;
    if (open.lines.length < SHOWN) open.lines.push(saying(one.subject));
    else open.more++;
  }
  if (open.lines.length) out.push(open);
  return out.slice(0, VERSIONS + 1);
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
