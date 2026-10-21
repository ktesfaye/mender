import type { PullRequest, PullRequestComment } from '@upstream/services/pull-requests/api/schemas';
import { chip, dom, h, label, pressable, sign, tile } from '../glass/f';
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
  /** What has been said about it — read here rather than in a browser. */
  comments?: PullRequestComment[];
  /** What the branch is called, for when there is not one yet. */
  branch: string;
  /** What it would be called, being written, when one is being opened. */
  written?: string;
  /** Set while the other end is being asked or told something. */
  waiting?: string;
  /** The repository's own open pull requests, offered as something to link
      by hand instead of opening a fresh one; `null` means never asked. */
  linkable?: PullRequest[] | null;
  /** Whether the linkable list is what is on the board right now. */
  linking?: boolean;
}

export function sent(state: Sent): Row[] {
  const root = h('div', 'f-root');
  const title = (text: string): HTMLElement => h('h1', '', text);

  if (state.waiting) {
    root.append(h('div', 'f-top', h('div', '', title(state.name))));
    root.append(h('div', 'f-note', state.waiting));
    return [dom(root)];
  }
  if (!state.pull) return [dom(opening(state, root))];

  const pull = state.pull;
  const sub = h(
    'div',
    'f-sub',
    h('span', 'f-branch', sign('merge', '#9bd28a', 12), pull.headRefName),
    sign('jump', '#f6ecdb', 13),
    h('span', 'f-branch', pull.baseRefName)
  );
  const number = numberOf(pull.url);
  const opened = ago(pull.createdAt);
  const said = [number ? `#${number}` : '', opened ? `opened ${opened}` : ''].filter(Boolean);
  if (said.length) sub.append(h('span', 'g-faint', said.join(' · ')));
  const chips = h('div', 'f-state');
  chips.append(
    pull.status === 'merged'
      ? chip('merged', '#a780ff')
      : pull.status === 'closed'
        ? chip('closed', '#f08a72')
        : pull.isDraft
          ? chip('draft', 'rgba(255,240,215,.3)')
          : chip('open', '#9bd28a')
  );
  const decision = reviewChip(pull);
  if (decision) chips.append(decision);
  root.append(h('div', 'f-top', h('div', '', title(pull.title), sub), chips));

  const cols = h('div', 'f-two');
  const left = h('div', '', label('what the machines think'), machines(pull));
  const open = comments(state.comments ?? []);
  if (open) {
    left.append(h('div', 'f-sec'), label('what was said'), open);
  }
  const right = h('div', '');
  const text = (pull.description ?? '').trim();
  const forCard = h('div', 'f-card f-pad');
  if (text) forCard.append(h('div', 'f-prose', text.split('\n').slice(0, 12).join('\n')));
  const facts = h('div', '');
  facts.style.cssText = `display:flex;gap:8px;flex-wrap:wrap;${text ? 'margin-top:12px' : ''}`;
  if (pull.commitCount !== null) {
    facts.append(chip(pull.commitCount === 1 ? '1 commit' : `${pull.commitCount} commits`));
  }
  if (pull.changedFiles !== null) {
    facts.append(chip(pull.changedFiles === 1 ? '1 file' : `${pull.changedFiles} files`));
  }
  if (pull.additions !== null && pull.deletions !== null) {
    const diff = chip('');
    diff.append(
      h('span', 'f-add', `+${pull.additions}`),
      ' ',
      h('span', 'f-del', `−${pull.deletions}`)
    );
    facts.append(diff);
  }
  if (facts.childElementCount) forCard.append(facts);
  right.append(label('what it is for'), forCard, h('div', 'f-sec'), ...landing(pull));
  cols.append(left, right);
  root.append(cols);
  return [dom(root)];
}

function reviewChip(pull: PullRequest): HTMLElement | null {
  if (pull.status !== 'open' || pull.isDraft) return null;
  switch (pull.reviewDecision) {
    case 'APPROVED':
      return chip('approved', '#9bd28a');
    case 'CHANGES_REQUESTED':
      return chip('changes asked for', '#f08a72');
    case 'REVIEW_REQUIRED':
      return chip('needs a look', '#f2c66d');
    default:
      return null;
  }
}

/** How long ago, in words, or nothing when the clock is unreadable. */
function ago(at: string): string {
  const then = Date.parse(at);
  if (!Number.isFinite(then)) return '';
  const minutes = Math.max(0, (Date.now() - then) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${Math.floor(minutes)}m ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * What was actually said, each one pressable to hand it to the agent.
 *
 * Not every comment: a resolved one is a conversation that is already over,
 * so it is left out the same way a happy check is folded into a count rather
 * than read out.
 */
function comments(said: PullRequestComment[]): HTMLElement | null {
  const open = said.filter((one) => !one.isResolved);
  if (!open.length) return null;
  const card = h('div', 'f-card');
  for (const one of open) {
    const where_ = one.path ? `${one.path}${one.line ? `:${one.line}` : ''} · open` : 'open';
    const line = h(
      'div',
      'f-cm',
      h(
        'div',
        'f-w',
        sign('chat', '#f2c66d', 13),
        h('b', '', one.author?.userName ?? 'somebody'),
        h('span', '', where_)
      ),
      h('div', 'f-t', one.body.trim().replaceAll('\n', ' ').slice(0, 140)),
      h('div', 'f-a', 'to the gatepost')
    );
    card.append(pressable(line, `hand-comment:${one.id}`));
  }
  return card;
}

/** What handing one comment to the agent actually says. */
export function toHand(comment: PullRequestComment): string {
  const where_ = comment.path ? `${comment.path}${comment.line ? `:${comment.line}` : ''} — ` : '';
  return `${where_}${comment.body.trim()}`;
}

/** What handing one failed check to the agent actually says. */
export function toHandCheck(check: PullRequest['checks'][number]): string {
  const said = check.conclusion ? `, ${check.conclusion.toLowerCase().replaceAll('_', ' ')}` : '';
  return `the "${check.name}" check failed${said}.`;
}

/** When the branch has never been sent anywhere. */
function opening(state: Sent, root: HTMLElement): HTMLElement {
  if (state.linking) return linking(state.linkable ?? null, root);
  root.append(
    h(
      'div',
      'f-top',
      h(
        'div',
        '',
        h('h1', '', state.name),
        h(
          'div',
          'f-sub',
          h('span', 'f-branch', sign('merge', '#9bd28a', 12), state.branch),
          `nothing is open for it`
        )
      )
    )
  );
  if (state.written === undefined) {
    const grid = h('div', 'f-grid f-3');
    grid.append(
      tile('pr', 'Open one', 'say what it is for and send it', {
        hot: true,
        pick: 'open-pull',
        wide: true,
      }),
      tile('jump', 'Link an existing one', 'one already open under another branch', {
        pick: 'link-pull-toggle',
        wide: true,
      })
    );
    root.append(grid);
    return root;
  }
  const field = h('div', 'g-field');
  field.style.cssText = 'margin-top:26px;font-size:16px';
  field.append(state.written, h('span', 'f-caret'));
  root.append(h('div', 'f-sec', label('what it is for'), field));
  return root;
}

/** The board turned over to the repository's own open pull requests, for
    picking one by hand rather than matching this session's branch. */
function linking(prs: PullRequest[] | null, root: HTMLElement): HTMLElement {
  root.append(
    h(
      'div',
      'f-top',
      h(
        'div',
        '',
        h('h1', '', 'an open pull request'),
        h('div', 'f-sub', 'picking one links it to this session')
      )
    )
  );
  if (prs === null) {
    root.append(h('div', 'f-note', 'asking github…'));
    return root;
  }
  if (!prs.length) {
    root.append(h('div', 'f-note', 'nothing open there.'));
    return root;
  }
  const card = h('div', 'f-card f-list');
  card.style.marginTop = '26px';
  for (const pr of prs) {
    const line = h(
      'div',
      'f-line',
      sign('pr', '#f2c66d', 14),
      h('span', 'f-f f-ltr', pr.title),
      h('span', 'f-d g-mono', `#${numberOf(pr.url) ?? '?'}`)
    );
    card.append(pressable(line, `link-pull:${pr.url}`));
  }
  root.append(card);
  return root;
}

/** The PR number out of its own URL — GitHub's number is the URL's last
    segment, and nothing here keeps a second copy of it. */
function numberOf(url: string): number | undefined {
  const match = /\/(\d+)$/.exec(url);
  return match ? Number(match[1]) : undefined;
}

/**
 * What the checks think, said as a count rather than a list of names.
 *
 * Twenty green checks is one fact. The ones that failed are the ones you came
 * to read, so those get a line each and the rest get a number.
 */
function machines(pull: PullRequest): HTMLElement {
  const card = h('div', 'f-card f-pad');
  if (!pull.checks.length) {
    card.append(h('div', 'g-faint', 'nothing ran.'));
    return card;
  }
  const bad = pull.checks.filter((check) => failed(check.conclusion));
  const running = pull.checks.filter((check) => check.status !== 'completed');
  const good = pull.checks.length - bad.length - running.length;

  card.append(
    h(
      'div',
      '',
      h('span', 'g-serif f-big', String(good)),
      h(
        'span',
        'g-mute',
        ` of ${pull.checks.length} check${pull.checks.length === 1 ? '' : 's'} passed`
      )
    )
  );
  const bar = h('div', 'f-bar');
  for (const check of pull.checks) {
    bar.append(h('s', failed(check.conclusion) ? 'f' : check.status !== 'completed' ? 'r' : 'p'));
  }
  card.append(bar);
  const dot = (color: string): HTMLElement => {
    const d = h('span', 'g-dot');
    d.style.background = color;
    return d;
  };
  const counts = h('div', 'f-cnt', h('span', '', dot('var(--g-moss)'), `${good} passed`));
  if (bad.length) counts.append(h('span', '', dot('var(--g-sore)'), `${bad.length} failed`));
  if (running.length)
    counts.append(h('span', '', dot('var(--g-ember)'), `${running.length} running`));
  card.append(counts);
  for (const check of bad) {
    const line = h(
      'div',
      'f-fail',
      sign('cross', '#f08a72', 14),
      h('span', 'f-n', check.name),
      h('span', 'f-a', 'to the gatepost')
    );
    card.append(pressable(line, `hand-check:${check.id}`));
  }
  return card;
}

function failed(conclusion: string | null): boolean {
  if (!conclusion) return false;
  const said = conclusion.toLowerCase();
  return said === 'failure' || said === 'timed_out' || said === 'action_required';
}

/**
 * Whether it will go in, and the ways it can.
 *
 * Only ever offered when it is actually possible right now, the same rule the
 * checkout board follows: a tile that comes and goes says more than a button
 * that greys out.
 */
function landing(pull: PullRequest): HTMLElement[] {
  const note = (text: string, sore = false): HTMLElement => {
    const el = h('div', 'f-note', text);
    if (sore) el.style.color = 'var(--g-sore)';
    return el;
  };
  if (pull.status === 'merged') return [note('it went in.')];
  if (pull.status === 'closed') return [note('it was closed without going in.')];
  if (pull.isDraft) {
    const grid = h('div', 'f-ways');
    grid.append(
      tile('check', 'Say it is ready', 'nobody is being asked to look at it yet', {
        hot: true,
        pick: 'ready-pull',
        wide: true,
      })
    );
    return [label('ways it can go in'), grid];
  }
  const rows: HTMLElement[] = [label('ways it can go in'), note(review(pull))];
  if (pull.mergeableStatus === 'CONFLICTING') {
    rows.push(note('it and the other end have both moved.', true));
    return rows;
  }
  const grid = h('div', 'f-ways');
  grid.append(
    tile('merge', 'Merge it', `one merge commit on ${pull.baseRefName}`, {
      hot: true,
      pick: 'merge-pull:merge',
      wide: true,
    }),
    tile('land', 'Squash it', 'all of it as one commit', { pick: 'merge-pull:squash', wide: true }),
    tile('down', 'Rebase it', 'each commit on top of the other end', {
      pick: 'merge-pull:rebase',
      wide: true,
    })
  );
  rows.push(grid);
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
