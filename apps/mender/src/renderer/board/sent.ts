import type { PullRequest } from '@upstream/services/pull-requests/api/schemas';
import type { Row } from './row';

/**
 * A pull request, on the wood.
 *
 * The end of a piece of work, which is the one thing the village could not do
 * without leaving it. What matters here is not the whole of GitHub: it is
 * whether this thing is going to land, which is four questions — what it is,
 * whether anybody has looked at it, whether the machines are happy, and
 * whether it will go in. Everything else is a browser's job.
 */
export interface Sent {
  name: string;
  /** The pull request, if there is one for this branch yet. */
  pull?: PullRequest;
  /** What the branch is called, for when there is not one yet. */
  branch: string;
  /** What it would be called, being written, when one is being opened. */
  written?: string;
  /** Set while the other end is being asked or told something. */
  waiting?: string;
}

export function sent(state: Sent): Row[] {
  if (state.waiting) {
    return [
      { kind: 'title', text: state.name },
      { kind: 'gap' },
      { kind: 'line', text: state.waiting, tone: 'faded' },
    ];
  }

  if (!state.pull) return opening(state);

  const pull = state.pull;
  const rows: Row[] = [
    { kind: 'prose', text: pull.title },
    { kind: 'gap' },
    { kind: 'line', text: where(pull), tone: 'faded' },
    { kind: 'gap' },
  ];

  const said = (pull.description ?? '').trim();
  if (said) {
    for (const line of said.split('\n').slice(0, 40)) {
      if (line.trim()) rows.push({ kind: 'prose', text: line.trim(), tone: 'faded' });
      else rows.push({ kind: 'gap' });
    }
    rows.push({ kind: 'gap' });
  }

  rows.push({ kind: 'heading', text: 'the machines' }, ...machines(pull));
  rows.push({ kind: 'gap' }, ...landing(pull));

  return rows;
}

/** When the branch has never been sent anywhere. */
function opening(state: Sent): Row[] {
  const rows: Row[] = [
    { kind: 'title', text: state.name },
    { kind: 'line', text: `nothing is open for ${state.branch}.`, tone: 'faded' },
    { kind: 'gap' },
  ];
  if (state.written === undefined) {
    return [...rows, { kind: 'entry', mark: '+', text: 'open one', pick: 'open-pull' }];
  }
  return [
    ...rows,
    { kind: 'line', text: 'say what this is for. return opens it.', tone: 'faded' },
    { kind: 'typed', text: state.written },
  ];
}

/** Which branch is going where, and what has happened to it. */
function where(pull: PullRequest): string {
  const said = [`${pull.headRefName} into ${pull.baseRefName}`];
  if (pull.status === 'merged') said.push('merged');
  else if (pull.status === 'closed') said.push('closed without merging');
  else if (pull.isDraft) said.push('still a draft');
  if (pull.additions !== null && pull.deletions !== null) {
    said.push(`${pull.additions} in and ${pull.deletions} out`);
  }
  return said.join(' · ');
}

/**
 * What the checks think, said as a count rather than a list of names.
 *
 * Twenty green checks is one fact. The ones that failed are the ones you came
 * to read, so those get a line each and the rest get a number.
 */
function machines(pull: PullRequest): Row[] {
  if (!pull.checks.length) {
    return [{ kind: 'line', text: 'nothing ran.', tone: 'faded' }];
  }
  const bad = pull.checks.filter((check) => failed(check.conclusion));
  const running = pull.checks.filter((check) => check.status !== 'completed');
  const good = pull.checks.length - bad.length - running.length;

  const rows: Row[] = [];
  for (const check of bad) {
    rows.push({ kind: 'entry', mark: '✗', text: check.name, tone: 'sore', keep: 'tail' });
  }
  for (const check of running) {
    rows.push({ kind: 'entry', mark: '·', text: `${check.name}, still going`, tone: 'faded' });
  }
  if (good) {
    rows.push({
      kind: 'entry',
      mark: '✓',
      text: good === 1 ? 'one is happy' : `${good} are happy`,
      tone: 'keen',
    });
  }
  return rows;
}

function failed(conclusion: string | null): boolean {
  if (!conclusion) return false;
  const said = conclusion.toLowerCase();
  return said === 'failure' || said === 'timed_out' || said === 'action_required';
}

/**
 * Whether it will go in, and the one thing you can do about it.
 *
 * Only ever offered when it is actually possible right now, the same rule the
 * checkout board follows: a line that comes and goes says more than a button
 * that greys out.
 */
function landing(pull: PullRequest): Row[] {
  if (pull.status === 'merged') return [{ kind: 'line', text: 'it went in.', tone: 'faded' }];
  if (pull.status === 'closed') {
    return [{ kind: 'line', text: 'it was closed without going in.', tone: 'faded' }];
  }
  if (pull.isDraft) {
    return [
      { kind: 'line', text: 'nobody is being asked to look at it yet.', tone: 'faded' },
      { kind: 'entry', mark: '+', text: 'say it is ready', pick: 'ready-pull' },
    ];
  }

  const rows: Row[] = [{ kind: 'line', text: review(pull), tone: 'faded' }];
  if (pull.mergeableStatus === 'CONFLICTING') {
    rows.push({ kind: 'line', text: 'it and the other end have both moved.', tone: 'sore' });
    return rows;
  }
  rows.push(
    { kind: 'entry', mark: '+', text: 'squash it in', pick: 'merge-pull:squash' },
    { kind: 'entry', mark: '+', text: 'merge it in', pick: 'merge-pull:merge' },
    { kind: 'entry', mark: '+', text: 'rebase it in', pick: 'merge-pull:rebase' }
  );
  return rows;
}

function review(pull: PullRequest): string {
  switch (pull.reviewDecision) {
    case 'APPROVED':
      return 'somebody has looked at it and is happy.';
    case 'CHANGES_REQUESTED':
      return 'somebody has looked at it and wants something changed.';
    case 'REVIEW_REQUIRED':
      return 'it needs somebody to look at it.';
    default:
      return 'nobody has said anything about it.';
  }
}
