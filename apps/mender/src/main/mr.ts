import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { log } from '@emdash/shared/logger';
import type { MergeRequest } from '../shared/crew';
import type { MenderRuntimes } from './runtimes';

const ran = promisify(execFile);

/**
 * Where a session's branch stands at the other end: the merge request open
 * for it, what the machines say, and what is still to be answered.
 *
 * Read off the same pull-request cache the checkout board reads, so it says
 * what that board would. Where nothing can be known (no remote, no sign-in,
 * the other end not answering) it says why rather than saying "none", since a
 * lead told there is no merge request when there is one would act on it.
 */

const KEEP_MS = 30_000;
const kept = new Map<string, { at: number; got: MergeRequest }>();
const registered = new Set<string>();

const git = async (cwd: string, ...args: string[]): Promise<string | null> => {
  try {
    const { stdout } = await ran('git', args, { cwd, timeout: 10_000 });
    return stdout.trim() || null;
  } catch {
    return null;
  }
};

export async function mergeRequestOf(
  runtimes: MenderRuntimes,
  path: string,
  linked?: string
): Promise<MergeRequest> {
  const remote = await git(path, 'remote', 'get-url', 'origin');
  const branch = await git(path, 'rev-parse', '--abbrev-ref', 'HEAD');
  if (remote && branch && branch !== 'HEAD' && !/github\.com/i.test(remote)) {
    const key = `${remote}#${branch}`;
    const had = kept.get(key);
    if (had && Date.now() - had.at < KEEP_MS) return had.got;
    return remember(key, await gitlabRequest(remote, branch));
  }
  return githubRequest(runtimes, path, linked);
}

async function githubRequest(
  runtimes: MenderRuntimes,
  path: string,
  linked?: string
): Promise<MergeRequest> {
  const branch = await git(path, 'rev-parse', '--abbrev-ref', 'HEAD');
  const remote = await git(path, 'remote', 'get-url', 'origin');
  if (!branch || branch === 'HEAD') return unknown('the checkout is not on a branch.');
  if (!remote) return unknown('this checkout has no remote to send anything to.');
  const key = `${remote}#${branch}`;
  const had = kept.get(key);
  if (had && Date.now() - had.at < KEEP_MS) return had.got;

  try {
    if (!registered.has(remote)) {
      const reg = await runtimes.pulls.registerRepository({ repositoryUrl: remote });
      if (!reg.success)
        return unknown(`GitHub would not register the repository (${reg.error.type}).`);
      await runtimes.pulls.sync({ repositoryUrl: remote });
      registered.add(remote);
    }
    const found = await runtimes.pulls.getPullRequestsForHead({
      repositoryUrl: remote,
      headRepositoryUrl: remote,
      headRefName: branch,
    });
    if (!found.success) return unknown(`GitHub would not say (${found.error.type}).`);
    let pull = found.data.prs[0];
    if (!pull && linked) {
      const byUrl = await runtimes.pulls.getPullRequestByUrl({
        repositoryUrl: remote,
        url: linked,
      });
      if (byUrl.success && byUrl.data.pr) pull = byUrl.data.pr;
    }
    if (!pull) return remember(key, { state: 'none', ci: 'none', failedChecks: [], unresolved: 0 });

    const failedChecks = pull.checks
      .filter((one) =>
        ['failure', 'timed_out', 'cancelled', 'startup_failure'].includes(one.conclusion ?? '')
      )
      .map((one) => one.name);
    const running = pull.checks.some((one) => one.status !== 'completed');
    const number = /\/(\d+)(?:$|[?#])/.exec(pull.url)?.[1];
    let unresolved = 0;
    if (number) {
      const comments = await runtimes.pulls.getPullRequestComments({
        repositoryUrl: remote,
        number: Number(number),
      });
      if (comments.success) {
        unresolved = comments.data.comments.filter(
          (one) => !one.isResolved && !one.isOutdated
        ).length;
      }
    }
    return remember(key, {
      provider: 'github',
      ...(number ? { number: Number(number) } : {}),
      url: pull.url,
      title: pull.title,
      state: pull.status === 'open' ? (pull.isDraft ? 'draft' : 'open') : pull.status,
      ci: failedChecks.length
        ? 'failed'
        : running
          ? 'running'
          : pull.checks.length
            ? 'passed'
            : 'none',
      failedChecks,
      ...(pull.reviewDecision
        ? { review: pull.reviewDecision.toLowerCase().replaceAll('_', ' ') }
        : {}),
      unresolved,
      ...(pull.changedFiles !== null
        ? {
            changed: {
              files: pull.changedFiles,
              added: pull.additions ?? 0,
              removed: pull.deletions ?? 0,
            },
          }
        : {}),
    });
  } catch (caught) {
    log.warn('mr: lookup failed', { area: 'crew', path, error: String(caught) });
    return unknown(`reading the merge request failed (${String(caught)}).`);
  }
}

/* ---- GitLab -----------------------------------------------------------------
   The host the work laptop uses. Asked over its REST API with a token the
   machine already holds (an environment variable, or what `glab` stored), the
   same way Jira is; nothing is stored here. No token means the state is
   unknown and says so, never "no merge request". */

interface GitLabMr {
  iid: number;
  web_url: string;
  title: string;
  state: string;
  draft?: boolean;
  work_in_progress?: boolean;
  detailed_merge_status?: string;
  changes_count?: string | null;
  head_pipeline?: { id: number; status: string } | null;
  pipeline?: { id: number; status: string } | null;
}

/** Where a remote lives: its host and its path on that host. */
export function gitlabPlace(remote: string): { host: string; path: string } | null {
  const scp = /^[\w.-]+@([^:/]+):(.+?)(?:\.git)?\/?$/.exec(remote);
  if (scp) return { host: scp[1]!, path: scp[2]! };
  try {
    const url = new URL(remote);
    return { host: url.host, path: url.pathname.replace(/^\/|\.git$|\/$/g, '') };
  } catch {
    return null;
  }
}

function gitlabToken(host: string): string | undefined {
  for (const name of ['GITLAB_TOKEN', 'GITLAB_PRIVATE_TOKEN', 'GL_TOKEN']) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  try {
    const config = readFileSync(
      join(process.env.HOME ?? '', '.config/glab-cli/config.yml'),
      'utf8'
    );
    const block = new RegExp(`${host.replace(/\./g, '\\.')}:\\s*\\n((?:[ \\t]+.*\\n?)+)`).exec(
      config
    )?.[1];
    return /token:\s*!!null\s+(\S+)|token:\s*(\S+)/
      .exec(block ?? '')
      ?.slice(1)
      .find(Boolean);
  } catch {
    return undefined;
  }
}

/** What GitLab's separate answers add up to, in the words the rest of the village uses. */
export function mapGitlab(input: {
  mr: GitLabMr;
  failedJobs: string[];
  approvals?: { approvals_required?: number; approvals_left?: number };
  unresolved: number;
}): MergeRequest {
  const { mr } = input;
  const pipeline = mr.head_pipeline ?? mr.pipeline;
  const status = pipeline?.status ?? '';
  const ci: MergeRequest['ci'] = ['failed', 'canceled', 'cancelled'].includes(status)
    ? 'failed'
    : ['running', 'pending', 'created', 'preparing', 'waiting_for_resource', 'scheduled'].includes(
          status
        )
      ? 'running'
      : status === 'success' || status === 'passed' || status === 'manual'
        ? 'passed'
        : 'none';
  const need = input.approvals?.approvals_required ?? 0;
  const left = input.approvals?.approvals_left ?? 0;
  return {
    provider: 'gitlab',
    number: mr.iid,
    url: mr.web_url,
    title: mr.title,
    state:
      mr.state === 'merged'
        ? 'merged'
        : mr.state === 'closed'
          ? 'closed'
          : mr.draft || mr.work_in_progress
            ? 'draft'
            : 'open',
    ci,
    failedChecks: ci === 'failed' ? input.failedJobs : [],
    ...(mr.detailed_merge_status ? { review: mr.detailed_merge_status.replaceAll('_', ' ') } : {}),
    ...(need ? { approvals: { have: Math.max(0, need - left), need } } : {}),
    unresolved: input.unresolved,
    ...(mr.changes_count
      ? { changed: { files: Number.parseInt(mr.changes_count, 10) || 0, added: 0, removed: 0 } }
      : {}),
  };
}

async function gitlabRequest(remote: string, branch: string): Promise<MergeRequest> {
  const place = gitlabPlace(remote);
  if (!place) return unknown(`cannot read where ${remote} is.`);
  const token = gitlabToken(place.host);
  if (!token) {
    return unknown(
      `no GitLab token on this machine for ${place.host} (set GITLAB_TOKEN, or sign in with glab), so the merge request's state cannot be read.`
    );
  }
  const base = process.env.MENDER_GITLAB_API ?? `https://${place.host}/api/v4`;
  const ask = async <T>(path: string): Promise<T> => {
    const response = await fetch(`${base}${path}`, {
      headers: { 'PRIVATE-TOKEN': token },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok)
      throw new Error(`${place.host} said ${response.status} to ${path.split('?')[0]}`);
    return (await response.json()) as T;
  };
  try {
    const project = `/projects/${encodeURIComponent(place.path)}`;
    const listed = await ask<GitLabMr[]>(
      `${project}/merge_requests?source_branch=${encodeURIComponent(branch)}&order_by=updated_at&per_page=5`
    );
    const head = listed.find((one) => one.state === 'opened') ?? listed[0];
    if (!head)
      return { provider: 'gitlab', state: 'none', ci: 'none', failedChecks: [], unresolved: 0 };
    const mr = await ask<GitLabMr>(`${project}/merge_requests/${head.iid}`);
    const [approvals, discussions, jobs] = await Promise.all([
      ask<{ approvals_required?: number; approvals_left?: number }>(
        `${project}/merge_requests/${head.iid}/approvals`
      ).catch(() => undefined),
      ask<{ notes?: { resolvable?: boolean; resolved?: boolean }[] }[]>(
        `${project}/merge_requests/${head.iid}/discussions?per_page=100`
      ).catch(() => []),
      mr.head_pipeline?.status === 'failed'
        ? ask<{ name: string }[]>(
            `${project}/pipelines/${mr.head_pipeline.id}/jobs?scope[]=failed`
          ).catch(() => [])
        : Promise.resolve([]),
    ]);
    const unresolved = discussions.filter((one) =>
      one.notes?.some((note) => note.resolvable && !note.resolved)
    ).length;
    return mapGitlab({ mr, failedJobs: jobs.map((one) => one.name), approvals, unresolved });
  } catch (caught) {
    log.warn('mr: gitlab lookup failed', { area: 'crew', remote, error: String(caught) });
    return unknown(
      `GitLab would not say (${String(caught instanceof Error ? caught.message : caught)}).`
    );
  }
}

const unknown = (why: string): MergeRequest => ({
  state: 'none',
  ci: 'none',
  failedChecks: [],
  unresolved: 0,
  unknown: why,
});

const remember = (key: string, got: MergeRequest): MergeRequest => {
  kept.set(key, { at: Date.now(), got });
  return got;
};

/** One line of it, for a lead to read. */
export function mergeRequestSaid(mr: MergeRequest): string {
  if (mr.unknown) return `unknown (${mr.unknown})`;
  if (mr.state === 'none') return 'no merge request open for its branch yet';
  const parts = [`#${mr.number ?? '?'} ${mr.state}`];
  parts.push(
    mr.ci === 'failed'
      ? `CI failed (${mr.failedChecks.join(', ')})`
      : mr.ci === 'running'
        ? 'CI running'
        : mr.ci === 'passed'
          ? 'CI passed'
          : 'no CI'
  );
  if (mr.approvals) parts.push(`${mr.approvals.have} of ${mr.approvals.need} approvals`);
  if (mr.review) parts.push(`review: ${mr.review}`);
  if (mr.unresolved)
    parts.push(`${mr.unresolved} comment${mr.unresolved === 1 ? '' : 's'} to answer`);
  if (mr.changed) {
    parts.push(
      mr.provider === 'gitlab'
        ? `${mr.changed.files} files changed`
        : `${mr.changed.files} files, +${mr.changed.added} −${mr.changed.removed}`
    );
  }
  return parts.join(', ');
}
