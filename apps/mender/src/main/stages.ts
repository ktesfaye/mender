import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, isAbsolute, join, resolve } from 'node:path';
import type { MergeRequest } from '../shared/crew';

/**
 * Which stage of a ticket a crew session is in, read only from what the
 * village already sees of it: the files it changed, the commits it made, the
 * commands it ran, and where its merge request stands at the other end.
 *
 * The stages are the ones the work actually goes through: picked up,
 * developing, testing on the device, opening the merge request, in review,
 * merged. The first four are inferred from what it did, newest evidence
 * winning (editing after a test run puts it back to developing, as it is);
 * the last two are the merge request's own state and nothing else, read from
 * the host. A session that has only said it opened one, with no way to ask
 * the host, is "in review" on its own word and the row says so.
 *
 * Pure on purpose: a wrong stage looks perfectly plausible on screen.
 */

export type Stage = 'picked-up' | 'developing' | 'testing' | 'opening-mr' | 'in-review' | 'merged';

export type Evidence = 'edit' | 'commit' | 'device' | 'mr-command';

export const STAGE_WORDS: Record<Stage, string> = {
  'picked-up': 'picked up',
  developing: 'developing',
  testing: 'testing on the device',
  'opening-mr': 'opening the merge request',
  'in-review': 'merge request in review',
  merged: 'merged',
};

/**
 * What running an app on a device or emulator looks like in a command. The
 * device-pilot skill lives on the work laptop and its own commands are not
 * visible from here, so this is the common tooling plus anything that names
 * the skill; `stages.json` beside the village's data can add patterns without
 * a rebuild.
 */
const DEVICE = [
  String.raw`\badb\b`,
  String.raw`\bemulator\b`,
  String.raw`\bxcrun\s+(simctl|devicectl)\b`,
  String.raw`\bidevice\w*\b`,
  String.raw`\bios-deploy\b`,
  String.raw`\bflutter\s+(run|drive|install|screenshot|attach)\b`,
  String.raw`\bflutter\s+test\s+integration_test\b`,
  String.raw`\bgradlew?\b.*\b(connected\w*|install\w*)\b`,
  String.raw`\bmaestro\b`,
  String.raw`\bappium\b`,
  String.raw`\bdetox\b`,
  String.raw`\bscreencap\b`,
  String.raw`\bscreencapture\b`,
  String.raw`device[-_ ]?pilot`,
];

/** Opening a merge request, on either host. */
const MR_COMMAND = [
  String.raw`\bglab\s+mr\s+(create|new)\b`,
  String.raw`\bgh\s+pr\s+create\b`,
  String.raw`merge_request\.create`,
  String.raw`/-/merge_requests/new`,
  String.raw`\bapi/v4/projects/[^\s]+/merge_requests\b.*(-X|--request)\s+POST|(-X|--request)\s+POST.*merge_requests`,
];

const COMMIT = [String.raw`\bgit\s+commit\b`, String.raw`^committed\b`];

export interface Patterns {
  device: RegExp[];
  mr: RegExp[];
  commit: RegExp[];
}

const compile = (sources: string[]): RegExp[] => sources.map((one) => new RegExp(one, 'i'));

/** The built-in patterns, plus whatever `stages.json` in the data directory adds. */
export function patternsFrom(dir?: string): Patterns {
  let extra: { device?: string[]; mr?: string[] } = {};
  if (dir) {
    try {
      extra = JSON.parse(readFileSync(join(dir, 'stages.json'), 'utf8')) as typeof extra;
    } catch {
      extra = {};
    }
  }
  const safe = (sources: string[] | undefined): string[] =>
    (sources ?? []).filter((one) => {
      try {
        new RegExp(one);
        return true;
      } catch {
        return false;
      }
    });
  return {
    device: compile([...DEVICE, ...safe(extra.device)]),
    mr: compile([...MR_COMMAND, ...safe(extra.mr)]),
    commit: compile(COMMIT),
  };
}

const FILE_TOOLS = new Set([
  'create-file-tool-call',
  'modify-file-tool-call',
  'delete-file-tool-call',
]);

/** What one step is evidence of, if anything. Looking around is evidence of nothing. */
export function evidenceOf(
  deed: { tool: string; did: string; wrong?: boolean; held?: boolean },
  patterns: Patterns
): Evidence | null {
  /* Never ran: a permission refused or a hook stopped it. */
  if (deed.held) return null;
  if (FILE_TOOLS.has(deed.tool)) return deed.wrong ? null : 'edit';
  const ran = deed.tool === 'execute-tool-call';
  if (ran && patterns.mr.some((one) => one.test(deed.did))) return deed.wrong ? null : 'mr-command';
  if (ran && patterns.commit.some((one) => one.test(deed.did))) return deed.wrong ? null : 'commit';
  if (patterns.device.some((one) => one.test(deed.did))) return 'device';
  return null;
}

export interface StageInput {
  /** The newest thing it did that says where it is, or null if it has only looked around. */
  last: Evidence | null;
  /** The merge request as the host says, when the host could be asked. */
  mr?: Pick<MergeRequest, 'state' | 'unknown'>;
  /** It has run a merge-request command that worked. Only counts when the host could not be asked. */
  openedByItsOwnWord?: boolean;
}

export function stageOf(input: StageInput): { stage: Stage; onItsWord?: boolean } {
  const state = input.mr && !input.mr.unknown ? input.mr.state : undefined;
  if (state === 'merged') return { stage: 'merged' };
  if (state === 'open' || state === 'draft') return { stage: 'in-review' };
  if (input.mr?.unknown && input.openedByItsOwnWord && input.last === 'mr-command') {
    /* No way to ask the host: it ran the command and nothing since has
       contradicted it, so it is in review on its own word. */
    return { stage: 'in-review', onItsWord: true };
  }
  if (input.last === 'mr-command') return { stage: 'opening-mr' };
  if (input.last === 'device') return { stage: 'testing' };
  if (input.last === 'edit' || input.last === 'commit') return { stage: 'developing' };
  return { stage: 'picked-up' };
}

const IMAGE = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const SHOT_IN_COMMAND = /[^\s'"`<>|;&=()]+\.(?:png|jpe?g|webp)\b/gi;

/** Pictures a command says it is writing: the ones a screenshot lands in. */
export function shotsNamedIn(command: string, root: string): string[] {
  const out: string[] = [];
  for (const raw of command.match(SHOT_IN_COMMAND) ?? []) {
    const path = raw.startsWith('~/') ? join(process.env.HOME ?? '', raw.slice(2)) : raw;
    out.push(isAbsolute(path) ? path : resolve(root, path));
  }
  return out;
}

const SKIP = new Set([
  'node_modules',
  '.git',
  'build',
  'Pods',
  '.dart_tool',
  '.gradle',
  'DerivedData',
  'dist',
]);

/**
 * Pictures that turned up in a checkout since a moment: what a skill's own
 * script writes without ever naming it in a command. Shallow and capped, since
 * it is looked at on every finished test run. Small files are icons, not
 * screenshots.
 */
export function shotsFoundIn(root: string, since: number, cap = 400): string[] {
  const found: { path: string; at: number }[] = [];
  let seen = 0;
  const walk = (dir: string, depth: number): void => {
    if (seen > cap || depth > 3) return;
    let names: string[];
    try {
      names = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of names) {
      if (seen++ > cap) return;
      if (SKIP.has(name) || name.startsWith('.')) continue;
      const path = join(dir, name);
      try {
        const info = statSync(path);
        if (info.isDirectory()) walk(path, depth + 1);
        else if (
          IMAGE.has(extname(name).toLowerCase()) &&
          info.mtimeMs >= since &&
          info.size > 5000
        ) {
          found.push({ path, at: info.mtimeMs });
        }
      } catch {
        // gone between the listing and the look
      }
    }
  };
  walk(root, 0);
  return found.sort((a, b) => a.at - b.at).map((one) => one.path);
}

/** Only the ones that exist now and are from this test run, oldest first, without repeats. */
export function realShots(paths: string[], since: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const path of paths) {
    if (seen.has(path)) continue;
    seen.add(path);
    try {
      const info = statSync(path);
      if (info.isFile() && info.mtimeMs >= since - 2000) out.push(path);
    } catch {
      // named in a command but never written
    }
  }
  return out;
}
