import { parseNativeAbsolute } from '@emdash/core/primitives/path/api';
import { shortName, type CheckoutHeadState } from '@emdash/core/runtimes/git/api';
import { ReplicaState } from '@emdash/wire/live';
import type { MenderClient } from '../wire';
import { saying } from './made';
import type { Row, Tone } from './row';

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
  M: 'quoted',
  T: 'quoted',
  A: 'keen',
  '?': 'keen',
  C: 'keen',
  R: 'stress',
  D: 'sore',
  U: 'warn',
};

type StatusState = {
  kind: string;
  entries?: Record<string, { index: string; worktree: string }>;
  summary?: { staged: number; unstaged: number; conflicted: number; untracked: number };
  message?: string;
};

type Commits = { commits: { hash: string; subject: string; date: number }[] };

/** How many changed files and how many commits the board has room to name. */
const CHANGES = 40;
const LATELY = 24;
/** A project's board is about what is running on it, so its history is a
    footnote: enough to know the place is alive, not enough to read. */
const BRIEF = 5;

/** A place with a checkout under it: a district, or a task standing on one. */
export interface Place {
  name: string;
  path: string;
  /**
   * Where this place's own history starts.
   *
   * A district has none: everything ever done in the project is its history,
   * and that is what `lately` is. A session inherited all of that the moment it
   * was cut and none of it happened in there, so it measures from the branch it
   * came off instead, and a session that has committed nothing says nothing.
   * Null is a session whose base nobody wrote down.
   */
  since?: string | null;
  /** Whatever this particular place has to say above its working tree, asked
      for fresh every rewrite so it can change while you are looking at it. */
  lines?: () => Row[];
  /** What pressing the name at the top of the board means, if anything. */
  turn?: string;
  /** And whatever it has to say after it, asked for fresh every rewrite. */
  tail?: () => Row[];
}

/** One file that is not as it was committed, as the board says it. */
export interface Changed {
  path: string;
  /** Git's own two letters: what is staged, then what is not. */
  mark: string;
}

export interface LiveBoard {
  rows(): Row[];
  /** What is uncommitted in here right now, for whoever wants to act on it. */
  changed(): Changed[];
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
      changed: () => [],
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
      // A new commit moves the head, and what was done here just changed.
      void readLog();
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

  await readLog();

  async function readLog(): Promise<void> {
    // A session with no base written down has no history of its own to read.
    if (place.since === null) return;
    const log = await client.git.checkout.getLog({
      checkout,
      options: {
        limit: place.since === undefined ? BRIEF : LATELY,
        ...(place.since
          ? {
              base: {
                kind: 'branch' as const,
                branch: { type: 'local' as const, branch: place.since },
              },
            }
          : {}),
      },
    });
    if (log.success && log.data) {
      lately = log.data.commits;
      changed(build(place, head, status, lately));
    }
  }

  return {
    rows: () => build(place, head, status, lately),
    changed: () => changedIn(status),
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
    { kind: 'title', text: place.name, ...(place.turn ? { pick: place.turn } : {}) },
    // Where it is, and the way in to what is actually in there.
    { kind: 'line', text: place.path, tone: 'faded', keep: 'tail', pick: 'inside' },
    // What is happening here comes before what the checkout looks like: you
    // opened a project to get at the work in it, not to read its git status.
    ...(place.lines?.() ?? []),
    { kind: 'gap' },
    { kind: 'line', text: standing(head) },
    ...sending(head),
    { kind: 'gap' },
    // The one thing a checkout is for that git has no word for.
    { kind: 'entry', mark: '→', text: 'open a shell in here', tone: 'faded', pick: 'shell' },
    // Finding a file does not need walking to it first.
    { kind: 'entry', mark: '→', text: 'find a file', tone: 'faded', pick: 'hunt' },
    // And the way this piece of work ends, which is not in a browser.
    { kind: 'entry', mark: '→', text: 'what is open for this branch', tone: 'faded', pick: 'sent' },
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
    for (const file of changedIn(status).slice(0, CHANGES)) {
      rows.push({
        kind: 'entry',
        mark: file.mark,
        text: file.path,
        tone: toneOf(file.mark),
        keep: 'tail',
        // Pressing a file that has changed is how the change is read.
        pick: `change:${file.path}`,
      });
    }
    if (entries.length > CHANGES) {
      rows.push({ kind: 'line', text: `and ${entries.length - CHANGES} more.`, tone: 'faded' });
    }
    // And the one thing you can do with all of it at once.
    rows.push({ kind: 'entry', mark: '+', text: 'write a commit', pick: 'commit' });
  }

  if (lately.length) {
    rows.push(
      { kind: 'gap' },
      { kind: 'heading', text: place.since === undefined ? 'lately' : 'committed here' }
    );
    for (const commit of lately) {
      rows.push({
        kind: 'entry',
        mark: since(commit.date),
        text: saying(commit.subject),
        // Pressing a commit is how what was done in it is read.
        pick: `made:${commit.hash}`,
      });
    }
  }
  return [...rows, ...(place.tail?.() ?? [])];
}

/** What is not as it was committed, in the order git lists it. */
function changedIn(status: StatusState | undefined): Changed[] {
  if (!status || status.kind === 'error' || status.kind === 'too-many-files') return [];
  return Object.entries(status.entries ?? {}).map(([path, file]) => ({
    path,
    mark: `${MARKS[file.index] ?? ' '}${MARKS[file.worktree] ?? ' '}`.trimEnd(),
  }));
}

/** What a file's mark says about it: something new, something lost, or a change. */
export function toneOf(mark: string): Tone {
  return TONE[mark.trim()[0] ?? ''] ?? 'faded';
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

/**
 * What you can do about where the checkout stands, if anything.
 *
 * A branch nobody else has seen is published; one that has run ahead is sent
 * up; one that has fallen behind is brought down. Nothing is offered that is
 * not actually possible right now, which is why these are lines that come and
 * go rather than buttons that grey out.
 */
function sending(head: CheckoutHeadState | undefined): Row[] {
  if (!head || head.kind === 'detached' || head.kind === 'unborn') return [];
  if (head.upstream.kind === 'none') {
    return [{ kind: 'entry', mark: '+', text: 'send this branch up', pick: 'publish' }];
  }
  const tracking = head.upstream.tracking;
  if (tracking.kind !== 'resolved') return [];
  const rows: Row[] = [];
  if (tracking.ahead) {
    rows.push({
      kind: 'entry',
      mark: '+',
      text: `send ${counted(tracking.ahead, 'commit')} up`,
      pick: 'push',
    });
  }
  /* Always offered, because nothing here goes and asks the other end what it
     has: behind is only ever as true as the last time somebody looked, and
     bringing it down is what looking is. */
  rows.push({
    kind: 'entry',
    mark: '+',
    text: tracking.behind
      ? `bring ${counted(tracking.behind, 'commit')} down`
      : 'bring down anything new',
    pick: 'pull',
  });
  return rows;
}

function counted(many: number, thing: string): string {
  return many === 1 ? `the one ${thing}` : `all ${many} ${thing}s`;
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
