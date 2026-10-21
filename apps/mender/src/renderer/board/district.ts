import { parseNativeAbsolute } from '@emdash/core/primitives/path/api';
import { shortName, type CheckoutHeadState } from '@emdash/core/runtimes/git/api';
import { ReplicaState } from '@emdash/wire/live';
import type { MissingDep } from '@shared/app-settings';
import { badge, chip, dom, h, label, pressable, sign, tile } from '../glass/f';
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
  /** Extra rows to lay in after the branch's own standing, read fresh on
      every rewrite — a session's offer to bring its base in or land itself. */
  tail?: () => Row[];
  /** What this checkout's own shell has noticed listening, most recent first. */
  servers?: () => string[];
}

/** How a session's branch stands against the base it forked from. */
export interface Landing {
  base: string;
  ahead: number;
  behind: number;
  landed: boolean;
}

/**
 * What can still be done about landing this session's work, if this is a
 * session at all. A branch nobody has caught up with is brought in; one
 * that has not gone anywhere yet is offered a local landing right here.
 */
/** The one press that has the session write down what an agent should know about this checkout. */
export function guideLines(missing: boolean): Row[] {
  if (!missing) return [];
  return [
    dom(
      tile('page', 'Write a CLAUDE.md for it', 'so whoever works here starts knowing what this is', {
        pick: 'init',
      })
    ),
  ];
}

export function landingLines(on: Landing | null): Row[] {
  if (!on) return [];
  const rows: Row[] = [];
  if (on.behind) {
    rows.push(
      dom(
        tile('down', `Bring ${on.base} in`, `it moved ${counted(on.behind, 'commit')} since`, {
          pick: 'bring-base',
        })
      )
    );
  }
  if (on.landed) {
    rows.push({ kind: 'line', text: `it has gone into ${on.base}.`, tone: 'faded' });
  } else {
    rows.push(
      dom(
        tile('land', `Land it on ${on.base}`, 'right here on disk, no remote', {
          pick: 'land-here',
        })
      )
    );
  }
  if (on.ahead) {
    rows.push(
      dom(
        tile('diff', 'Everything it changed', 'the whole branch, file by file', {
          pick: 'branch-changed',
        })
      )
    );
  }
  return rows;
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
  /** Of what Mender itself leans on — git, gh, ripgrep, tmux, node — whatever
   *  this machine doesn't have. Asked once on opening rather than kept live:
   *  it only changes when he goes and installs one, and pressing the line
   *  that offers to run that rereads it. */
  let missing: MissingDep[] = [];
  const readMissing = async (): Promise<void> => {
    missing = await client.appSettings.missingCoreDeps({});
    changed(build(place, head, status, lately, missing));
  };
  void readMissing();

  const model = client.git.checkout.model;
  const headReplica = new ReplicaState(model.state({ checkout }, 'head'), {
    onChange: (value) => {
      head = value;
      changed(build(place, head, status, lately, missing));
      // A new commit moves the head, and what was done here just changed.
      void readLog();
    },
  });
  const statusReplica = new ReplicaState(model.state({ checkout }, 'status'), {
    onChange: (value) => {
      status = value as StatusState;
      changed(build(place, head, status, lately, missing));
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
      changed(build(place, head, status, lately, missing));
    }
  }

  return {
    rows: () => build(place, head, status, lately, missing),
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
  lately: Commits['commits'],
  missing: MissingDep[]
): Row[] {
  const tail = place.tail?.() ?? [];
  const tiles = tail.filter((row): row is Extract<Row, { kind: 'dom' }> => row.kind === 'dom');
  const notes = tail.filter((row) => row.kind !== 'dom' && row.kind !== 'gap');
  const entries = Object.entries(status?.entries ?? {});
  const files = changedIn(status);
  const tracking =
    head && head.kind !== 'detached' && head.kind !== 'unborn' && head.upstream.kind !== 'none'
      ? head.upstream.tracking
      : undefined;
  const ahead = tracking?.kind === 'resolved' ? tracking.ahead : 0;

  const root = h('div', 'f-root');

  const state = h('div', 'f-state');
  if (entries.length) state.append(chip(`${entries.length} uncommitted`, '#f2c66d'));
  if (head && head.kind !== 'detached' && head.kind !== 'unborn') {
    if (head.upstream.kind === 'none') state.append(chip('nobody has seen it', '#7aaaff'));
    else if (ahead) state.append(chip(`${ahead} not sent up`, '#7aaaff'));
    if (tracking?.kind === 'resolved' && tracking.behind) {
      state.append(chip(`${tracking.behind} behind`, '#ff9a4a'));
    }
  }
  const branch = h('span', 'f-branch', sign('merge', '#9bd28a', 13), branchName(head));
  const where = h('div', 'f-sub', branch, h('span', 'g-mono', place.path));
  root.append(h('div', 'f-top', h('div', '', h('h1', '', place.name), where), state));

  for (const dep of missing) {
    const strip = h(
      'div',
      'f-strip f-sorest',
      sign('warn', '#f08a72', 18),
      h('span', 'f-t', h('b', '', dep.name), ' is missing here')
    );
    if (dep.command) {
      pressable(strip, `installdep:${dep.id}\u0000${dep.command}`);
      strip.append(
        h('span', 'g-ghost', sign('term', '#f2c66d', 13), 'write the line that fetches it')
      );
    }
    root.append(strip);
  }

  const grid = h('div', 'f-grid');
  const sendTile = sending(head);
  if (sendTile) grid.append(sendTile);
  for (const one of tiles) grid.append(one.el);
  /* However many there are fill the row, so one lone action is never a
     quarter-width tile beside an empty three quarters. */
  if (grid.childElementCount) {
    grid.style.gridTemplateColumns = `repeat(${Math.min(4, grid.childElementCount)}, 1fr)`;
    if (grid.childElementCount === 1) grid.firstElementChild?.classList.add('f-wide');
    root.append(grid);
  }
  const ways = h('div', 'f-grid f-compact');
  ways.append(
    tile('shell', 'Open a shell', 'a real one, in here', { pick: 'shell', wide: true }),
    tile('shell', 'A second shell', 'its own, beside the first', { pick: 'shell2', wide: true }),
    tile('find', 'Find a file', 'by name or by what is in it', { pick: 'hunt', wide: true }),
    tile('pr', 'What is open for it', 'the pull request, the machines', {
      pick: 'sent',
      wide: true,
    }),
    tile('page', 'Walk the folder', 'what is in it', { pick: 'inside', wide: true })
  );
  root.append(ways);

  for (const note of notes) {
    const line = h('div', 'f-note');
    if (note.kind === 'line' || note.kind === 'entry' || note.kind === 'prose') {
      line.textContent = note.text;
      if (note.tone === 'sore') line.style.color = 'var(--g-sore)';
      if (note.pick) {
        line.style.color = 'var(--g-gold)';
        pressable(line, note.pick);
      }
    }
    root.append(line);
  }

  const urls = place.servers?.() ?? [];
  if (urls.length) {
    const chips = h('div', 'f-chips');
    for (const url of urls) {
      const one = h(
        'span',
        'f-cp',
        sign('globe', '#ff9a4a', 12),
        `listening on ${shortAddress(url)}`
      );
      chips.append(pressable(one, `page:${url}`));
    }
    root.append(h('div', 'f-sec', label('running here'), chips));
  }

  const left = h('div', '', label('uncommitted'));
  const card = h('div', 'f-card');
  if (status?.kind === 'error') {
    card.append(h('div', 'f-note', status.message ?? 'git would not say.'));
  } else if (status?.kind === 'too-many-files') {
    card.append(h('div', 'f-note', 'more than this board can hold.'));
  } else if (!entries.length) {
    card.append(h('div', 'f-note', 'nothing. the tree is clean.'));
  } else {
    for (const file of files.slice(0, CHANGES)) {
      const cut = file.path.lastIndexOf('/');
      const name = h('span', 'f-f f-ltr', file.path.slice(cut + 1));
      const dir = cut > 0 ? h('span', 'f-d g-mono', file.path.slice(0, cut)) : h('span', 'f-d', '');
      const line = h('div', 'f-line', badge(file.mark), name, dir);
      card.append(pressable(line, `change:${file.path}`));
    }
    if (entries.length > CHANGES) {
      card.append(h('div', 'f-note', `and ${entries.length - CHANGES} more.`));
    }
    const commit = h('span', 'g-pill', sign('pen', '#2a1b09', 14), 'Write a commit');
    card.append(h('div', 'f-foot', pressable(commit, 'commit')));
  }
  left.append(card);

  const right = h('div');
  if (lately.length) {
    right.append(label(place.since === undefined ? 'lately' : 'committed here'));
    const line = h('div', 'f-card f-tl');
    lately.forEach((commit, at) => {
      const one = h(
        'div',
        `f-c${at < ahead ? ' f-ahead' : ''}`,
        h('div', 'f-cs', saying(commit.subject)),
        h('div', 'f-w', `${ago(commit.date)}${at < ahead ? ' · not sent up' : ''}`)
      );
      line.append(pressable(one, `made:${commit.hash}`));
    });
    right.append(line);
  }
  root.append(h('div', lately.length ? 'f-two' : 'f-sec', left, right));
  return [dom(root)];
}

function branchName(head: CheckoutHeadState | undefined): string {
  if (!head) return 'reading the checkout…';
  if (head.kind === 'detached') return `adrift at ${head.shortHash}`;
  return shortName(head.ref);
}

/** How long ago, in words. */
function ago(at: number): string {
  const minutes = Math.max(0, (Date.now() - at) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60)
    return `${Math.floor(minutes)} minute${Math.floor(minutes) === 1 ? '' : 's'} ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)} hour${Math.floor(hours) === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 60) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30.4);
  return months < 12 ? `${months} months ago` : `${Math.floor(days / 365)} years ago`;
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

/**
 * What you can do about where the checkout stands, if anything.
 *
 * A branch nobody else has seen is published; one that has run ahead is sent
 * up; one that has fallen behind is brought down. Nothing is offered that is
 * not actually possible right now, which is why these are lines that come and
 * go rather than buttons that grey out.
 */
function sending(head: CheckoutHeadState | undefined): HTMLElement | null {
  if (!head || head.kind === 'detached' || head.kind === 'unborn') return null;
  if (head.upstream.kind === 'none') {
    return tile('up', 'Send it up', 'nobody has seen this branch yet', {
      hot: true,
      pick: 'publish',
    });
  }
  const tracking = head.upstream.tracking;
  if (tracking.kind !== 'resolved') return null;
  /* Always offered, because nothing here goes and asks the other end what it
     has: behind is only ever as true as the last time somebody looked, and
     bringing it down is what looking is. */
  if (tracking.ahead) {
    return tile(
      'up',
      `Send ${tracking.ahead === 1 ? 'the one commit' : `all ${tracking.ahead} commits`} up`,
      'to where it is going',
      {
        hot: true,
        pick: 'push',
      }
    );
  }
  return tile(
    'down',
    tracking.behind ? 'Bring them down' : 'Bring down anything new',
    tracking.behind
      ? `${tracking.behind === 1 ? 'one commit' : `${tracking.behind} commits`} waiting`
      : 'looking is how you find out',
    { pick: 'pull' }
  );
}

function counted(many: number, thing: string): string {
  return many === 1 ? `one ${thing}` : `${many} ${thing}s`;
}

function shortAddress(url: string): string {
  try {
    const at = new URL(url);
    const path = at.pathname === '/' ? '' : at.pathname;
    return `:${at.port || (at.protocol === 'https:' ? '443' : '80')}${path}`;
  } catch {
    return url;
  }
}
