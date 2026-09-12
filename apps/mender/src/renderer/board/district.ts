import { parseNativeAbsolute } from '@emdash/core/primitives/path/api';
import { shortName, type CheckoutHeadState } from '@emdash/core/runtimes/git/api';
import { ReplicaState } from '@emdash/wire/live';
import type { MenderClient } from '../wire';
import type { Row, Tone } from './board';

/**
 * What a board says about a checkout.
 *
 * A district is a checkout and so is a task, so the same board serves both:
 * which branch it is on, what is uncommitted in it, what was done in it last.
 * The working tree comes off git's live model rather than a read, so the board
 * changes while you are looking at it — save a file in your editor and the line
 * appears. That is the whole reason it is a board in a living village and not a
 * report.
 */

/** Git's own two-letter shorthand, which is what a checkout is read in. */
const MARKS: Record<string, string> = {
  modified: 'M',
  added: 'A',
  deleted: 'D',
  renamed: 'R',
  copied: 'C',
  'type-changed': 'T',
  untracked: '?',
  unmerged: 'U',
  ignored: '!',
  unmodified: ' ',
};

const TONE: Record<string, Tone> = {
  A: 'keen',
  '?': 'keen',
  D: 'sore',
  U: 'sore',
};

type StatusState = {
  kind: string;
  entries?: Record<string, { index: string; worktree: string }>;
  summary?: { staged: number; unstaged: number; conflicted: number; untracked: number };
  message?: string;
};

type Commits = { commits: { subject: string; date: number }[] };

/** How many changed files and how many commits the board has room to name. */
const CHANGES = 40;
const LATELY = 24;

/** A place with a checkout under it: a district, or a task standing on one. */
export interface Place {
  name: string;
  path: string;
  /** Whatever this particular place has to say above its working tree. */
  lines?: Row[];
}

export interface LiveBoard {
  rows(): Row[];
  close(): Promise<void>;
}

/**
 * Open the board for one project and keep it current until it is closed.
 *
 * `changed` is called whenever anything on it moved, which is the renderer's
 * cue to rewrite the wood. Nothing here draws.
 */
export async function openCheckout(
  client: MenderClient,
  place: Place,
  changed: (rows: Row[]) => void
): Promise<LiveBoard> {
  const parsed = parseNativeAbsolute(place.path);
  if (!parsed.success) {
    return {
      rows: () => [
        { kind: 'title', text: place.name },
        { kind: 'line', text: place.path, tone: 'faded', keep: 'tail' },
        { kind: 'gap' },
        { kind: 'line', text: 'this checkout is not where it was.', tone: 'sore' },
      ],
      close: async () => {},
    };
  }
  const checkout = parsed.data;

  let head: CheckoutHeadState | undefined;
  let status: StatusState | undefined;
  let lately: Commits['commits'] = [];

  const model = client.git.checkout.model;
  const headReplica = new ReplicaState(model.state({ checkout }, 'head'), {
    onChange: (value) => {
      head = value;
      changed(build(place, head, status, lately));
    },
  });
  const statusReplica = new ReplicaState(model.state({ checkout }, 'status'), {
    onChange: (value) => {
      status = value as StatusState;
      changed(build(place, head, status, lately));
    },
  });

  await Promise.all([headReplica.ready, statusReplica.ready]);
  head = headReplica.current();
  status = statusReplica.current() as StatusState;

  const log = await client.git.checkout.getLog({ checkout, options: { limit: LATELY } });
  if (log.success && log.data) {
    lately = log.data.commits;
    changed(build(place, head, status, lately));
  }

  return {
    rows: () => build(place, head, status, lately),
    close: async () => {
      await Promise.all([headReplica.dispose(), statusReplica.dispose()]);
    },
  };
}

function build(
  place: Place,
  head: CheckoutHeadState | undefined,
  status: StatusState | undefined,
  lately: Commits['commits']
): Row[] {
  const rows: Row[] = [
    { kind: 'title', text: place.name },
    { kind: 'line', text: place.path, tone: 'faded', keep: 'tail' },
    { kind: 'gap' },
    { kind: 'line', text: standing(head) },
    ...(place.lines ?? []),
    { kind: 'gap' },
  ];

  rows.push({ kind: 'heading', text: 'uncommitted' });
  const entries = Object.entries(status?.entries ?? {});
  if (status?.kind === 'error') {
    rows.push({ kind: 'line', text: status.message ?? 'git would not say.', tone: 'sore' });
  } else if (status?.kind === 'too-many-files') {
    rows.push({ kind: 'line', text: 'more than this board can hold.', tone: 'faded' });
  } else if (!entries.length) {
    rows.push({ kind: 'line', text: 'nothing. the tree is clean.', tone: 'faded' });
  } else {
    for (const [path, file] of entries.slice(0, CHANGES)) {
      const mark = `${MARKS[file.index] ?? ' '}${MARKS[file.worktree] ?? ' '}`.trimEnd();
      rows.push({
        kind: 'entry',
        mark,
        text: path,
        tone: TONE[mark.trim()[0] ?? ''] ?? 'faded',
        keep: 'tail',
      });
    }
    if (entries.length > CHANGES) {
      rows.push({ kind: 'line', text: `and ${entries.length - CHANGES} more.`, tone: 'faded' });
    }
  }

  if (lately.length) {
    rows.push({ kind: 'gap' }, { kind: 'heading', text: 'lately' });
    for (const commit of lately) {
      rows.push({ kind: 'entry', mark: since(commit.date), text: commit.subject });
    }
  }
  return rows;
}

/** How long ago, in the width of the margin: two characters and a space. */
function since(at: number): string {
  const minutes = Math.max(0, (Date.now() - at) / 60000);
  if (minutes < 60) return 'now';
  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)}h`;
  const days = hours / 24;
  if (days < 7) return `${Math.floor(days)}d`;
  const weeks = days / 7;
  if (weeks < 9) return `${Math.floor(weeks)}w`;
  const months = days / 30.4;
  return months < 12 ? `${Math.floor(months)}mo` : `${Math.floor(days / 365)}y`;
}

/** The one line that says where the checkout stands. */
function standing(head: CheckoutHeadState | undefined): string {
  if (!head) return 'reading the checkout…';
  if (head.kind === 'detached') return `adrift at ${head.shortHash}`;
  const branch = shortName(head.ref);
  if (head.kind === 'unborn') return `on ${branch}, nothing committed yet`;
  const tracking = head.upstream.kind === 'none' ? undefined : head.upstream.tracking;
  if (!tracking || tracking.kind !== 'resolved') return `on ${branch}`;
  const drift = [
    tracking.ahead ? `${tracking.ahead} ahead` : '',
    tracking.behind ? `${tracking.behind} behind` : '',
  ].filter(Boolean);
  return drift.length ? `on ${branch}, ${drift.join(' and ')}` : `on ${branch}`;
}
