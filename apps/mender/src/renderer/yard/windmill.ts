/**
 * The windmill: the app's own settings, an island of their own.
 *
 * Not a project's — nothing here is about any one checkout. There is no
 * windmill sprite in the kit yet, so this is reached the village's other
 * way: a chord (⌘,) and a line in the finder, same as any other doing. It
 * opens the same kind of window a project's own settings already use, over
 * everything, closing the same three ways.
 *
 * Laid out the way a project's own settings are: pages down a rail on the
 * left, each saying under its name what is set there, so it never becomes one
 * long scroll of everything, and whatever is written says "saved" beside its
 * heading once it is.
 */

import type { HostDependencyView } from '@emdash/core/primitives/host-dependencies/api';
import type {
  CheckoutSettings,
  Hand,
  Keybindings,
  NotificationSettings,
  ProviderConfig,
  SessionUsage,
  TerminalSettings,
} from '@shared/app-settings';
import {
  clockOf,
  FIVE_HOURS_MS,
  runsOut,
  SEVEN_DAYS_MS,
  spanOf,
  tokensOf,
  windowLine,
  type FiveHours,
  type SessionShare,
  type UsageWindow,
} from '@shared/five-hours';
import type { JiraLink, JiraSite } from '@shared/jira';
import type { UpdateState } from '@shared/updates';
import { counted } from '../board/card';
import { chordLabel, chordOf, rebindableDoings } from '../board/finder';
import '../glass/settings.css';
import { glaze, TINT_ISLAND } from '../glass/glass';
import { px } from '../glass/px';
import {
  area,
  chip,
  formRow,
  formRowSub,
  hintLine,
  input,
  overIsland,
  pageOf,
  savedMark,
  section,
} from './settings';
import { stand } from './standing';

/** One worktree Mender cut, as the windmill reads it: what's on disk for it,
 *  and whether anything still uses it. */
export interface WorktreeRow {
  id: string;
  branch: string | null;
  path: string;
  /** Disk bytes, or null while it is still being measured. */
  bytes: number | null;
  /** Branch merged upstream, or nothing here still points at it. */
  stale: boolean;
  /** How many files in there git has never committed, or null while that is
   *  still being read. */
  uncommitted: number | null;
  /** How far its branch has run ahead of whatever it follows — null means
   *  nowhere else has ever seen it, which is the same "keep the branch" case
   *  as a positive count, and 0 means it is already upstream. */
  unsent: number | null;
}

/** What this machine is spending, the last time it was asked. */
export interface MachineSample {
  cpuPercent: number;
  memUsedBytes: number;
  memTotalBytes: number;
  diskUsedBytes: number;
  diskTotalBytes: number;
}

export interface WindmillState {
  hand: string | null;
  hands: Hand[] | null;
  /** null while the registry's first answer hasn't arrived yet. */
  worktrees: WorktreeRow[] | null;
  /** null until the first sample answers. */
  machine: MachineSample | null;
  /** Each open session's own share of this machine, resampled alongside it.
      null until the first sample answers. */
  sessions: SessionUsage[] | null;
  /** The subscription's five-hour window and who is spending it. Null until
      the first answer. */
  fiveHours: FiveHours | null;
  /** What this machine hands each agent's own CLI beyond its ordinary
      command, keyed by agent id. Filled in as each one is asked about. */
  providers: Record<string, ProviderConfig>;
  /** Which install of each agent's CLI this machine actually runs, and what
      else it found, keyed by agent id. */
  installs: Record<string, HostDependencyView>;
  /** How a fresh checkout gets made: branch naming, and where a new project
      or worktree lands. Null while the first answer hasn't arrived yet. */
  checkout: CheckoutSettings | null;
  /** How a shell looks and what it starts as. Null while the first answer
      hasn't arrived yet. */
  terminal: TerminalSettings | null;
  /** Whether a villager who wants him reaches him with a real macOS
      notification. Null while the first answer hasn't arrived yet. */
  notifications: NotificationSettings | null;
  /** Every chord rebound away from the table's own default. Null while the
      first answer hasn't arrived yet. */
  keybindings: Keybindings | null;
  /** Where this copy of Mender stands against the newest published one.
      Null while the first answer hasn't arrived yet. */
  update: UpdateState | null;
}

export interface WindmillDoings {
  choose(id: string): Promise<void>;
  /** Deactivate, remove the worktree, and unregister it. Only takes the
   *  branch down with it when nothing on the branch is unique — the caller
   *  decides that from the same row this board just showed. */
  clear(row: WorktreeRow): Promise<void>;
  setExtraArgs(agent: string, extraArgs: string): Promise<void>;
  setEnvVar(agent: string, key: string, value: string): Promise<void>;
  removeEnvVar(agent: string, key: string): Promise<void>;
  selectInstall(agent: string, path: string): Promise<void>;
  setBranchPrefix(prefix: string): Promise<void>;
  setRandomSuffix(on: boolean): Promise<void>;
  setProjectsDir(dir: string): Promise<void>;
  setWorktreeDir(dir: string): Promise<void>;
  setTerminalFontSize(fontSize: number): Promise<void>;
  setDefaultShell(shell: string): Promise<void>;
  setNotificationsEnabled(on: boolean): Promise<void>;
  /** Rebind one doing's chord. The caller has already checked it against
      nothing else this doing could conflict with. */
  rebind(pick: string, chord: string): Promise<void>;
  /** Back to the table's own default for that one doing. */
  unbind(pick: string): Promise<void>;
  /** Ask GitHub now rather than waiting for the next look. */
  checkUpdate(): Promise<void>;
  /** Quit, swap the waiting one in, open it again. */
  restartToUpdate(): Promise<void>;
  /** Jira, read and written straight through rather than held in the
      window's state, since nothing else in the windmill ever needs it. */
  jira: {
    status(): Promise<{ sites: JiraSite[]; recipe: string }>;
    /** Null when it took, or what Jira said when it didn't. */
    connect(site: string, email: string, token: string): Promise<string | null>;
    forget(site: string): Promise<void>;
    setRecipe(recipe: string): Promise<void>;
    /** Every project in the village, for a board link each. */
    projects(): { id: string; name: string }[];
    links(): Promise<Record<string, JiraLink>>;
    /** Null when it took, or what went wrong. An empty link unties it. */
    setBoard(project: string, url: string): Promise<string | null>;
  };
  closed(): void;
}

export interface Windmill {
  update(state: WindmillState): void;
  escaped(): void;
  holds(event: KeyboardEvent): boolean;
  close(): void;
}

const LEAD_GENERAL = 'Who a fresh session starts with, until you say otherwise on the board.';

const LEAD_MACHINE = 'What it is spending right now. Counting back up every few seconds.';

const CHECKOUTS = 'How a session’s own copy is named and where new things are put.';

const TERMINAL = 'Every real shell the board opens next, in any project.';

const KEYS =
  'Every doing held with command. Press a chord, then press the key it should be instead.';

const AGENTS =
  'What this machine hands each agent’s own CLI beyond its ordinary command, in every project.';

const JIRA =
  'The Jira sites this Mac is connected to, each with its own email and API token. Each project picks its own board from them, off the blue token on the rack.';

const DISK =
  'Every own copy Mender has cut on this machine that no session is standing in. Stale means its branch is already upstream, or nothing points at it any more.';

/** The pages down the window's left side, in the order they hang there. */
type Page = 'general' | 'checkouts' | 'terminal' | 'keys' | 'agents' | 'jira' | 'disk' | 'machine';

const PAGES: { page: Page; said: string; icon: string; lead: string }[] = [
  { page: 'general', said: 'General', icon: 'sun', lead: LEAD_GENERAL },
  { page: 'checkouts', said: 'Checkouts', icon: 'merge', lead: CHECKOUTS },
  { page: 'disk', said: 'On disk', icon: 'box', lead: DISK },
  { page: 'terminal', said: 'Terminal', icon: 'term', lead: TERMINAL },
  { page: 'keys', said: 'Keys', icon: 'key', lead: KEYS },
  { page: 'agents', said: 'Agents', icon: 'spark', lead: AGENTS },
  { page: 'machine', said: 'This machine', icon: 'ring', lead: LEAD_MACHINE },
  { page: 'jira', said: 'Jira', icon: 'gem', lead: JIRA },
];

/** Whichever page was open last, so coming back to the windmill lands there. */
let lastPage: Page = 'general';

/** Opens the windmill on its Jira page next time, for the board's own way in. */
export function windmillOnJira(): void {
  lastPage = 'jira';
}

/** Whichever agent the Agents page was last showing. */
let lastAgent: string | null = null;

/** How long an armed second press stands before it withdraws. */
const STANDS_MS = 4000;

export function openWindmill(state: WindmillState, does: WindmillDoings): Windmill {
  let now = state;
  let page: Page = lastPage;

  const back = el('div', 'st-back');
  const panel = glaze(el('div', 'st-win st-tall'), {
    tint: overIsland() ? TINT_ISLAND : undefined,
  });
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  back.appendChild(panel);

  let downOutside = false;
  back.addEventListener('pointerdown', (event) => {
    downOutside = event.target === back;
  });
  back.addEventListener('click', (event) => {
    if (downOutside && event.target === back) close();
    downOutside = false;
  });

  // ── the rail's head ──────────────────────────────────────────────────────
  const me = el('div', 'st-me');
  const meIcon = el('div', 'st-me-ic');
  meIcon.appendChild(px('sun', '#f2c66d', 28));
  const meText = el('div', '');
  const meName = el('b', '');
  meName.textContent = 'the windmill';
  const meSub = el('span', '');
  meSub.textContent = 'every project';
  meText.append(meName, meSub);
  me.append(meIcon, meText);

  const heading = el('h2', '');
  const lead = el('p', 'st-lead');
  const head = el('div', 'st-head');
  head.append(heading, lead);
  const shut = button('×', 'g-x', () => close());
  shut.setAttribute('aria-label', 'Close');
  const mark = savedMark(panel);

  // ── the pages ────────────────────────────────────────────────────────────
  const rail = el('nav', 'st-rail');
  const main = el('div', 'st-main');
  const body = el('div', 'st-body g-scroll');
  main.append(head, body, mark, shut);
  panel.append(rail, main);
  rail.appendChild(me);

  const starts = section('A fresh session starts with');
  const notify = section('Notifications');
  const branches = section('A session’s branch');
  const landing = section('Where new things land');
  const shellLook = section('As it will draw');
  const shellIs = section('What a shell starts as');
  const keys = section('Chords');
  const agentPick = section('');
  const agentArgs = section('');
  const agentEnv = section('');
  const agentInstall = section('Which install it runs');
  const jiraSites = section('Sites');
  const jiraAdd = section('Connect a site');
  const jiraBoards = section("Each project's board");
  const jiraRecipe = section('Taking a ticket on');
  const worktrees = section('');
  const spend = section('');
  const five = section('');
  const shares = section('Every open session');

  const pageRoots: Record<Page, HTMLElement> = {
    general: pageOf([starts.root, notify.root]),
    checkouts: pageOf([branches.root, landing.root]),
    terminal: pageOf([shellLook.root, shellIs.root]),
    keys: pageOf([keys.root]),
    agents: pageOf([agentPick.root, agentArgs.root, agentEnv.root, agentInstall.root]),
    jira: pageOf([jiraSites.root, jiraBoards.root, jiraAdd.root, jiraRecipe.root]),
    disk: pageOf([worktrees.root]),
    machine: pageOf([spend.root, five.root, shares.root]),
  };
  body.append(...Object.values(pageRoots));

  const tabs = new Map<Page, { root: HTMLButtonElement; sub: HTMLElement }>();
  for (const one of PAGES) {
    if (one.page === 'jira') rail.appendChild(el('div', 'st-sep'));
    const tab = el('button', 'st-tab');
    tab.type = 'button';
    const icon = el('span', 'st-tab-i');
    icon.appendChild(px(one.icon, '#f2c66d', 16));
    const text = el('span', 'st-tab-t');
    const said = el('span', 'st-tab-name');
    said.textContent = one.said;
    const sub = el('span', 'st-tab-sub');
    text.append(said, sub);
    tab.append(icon, text);
    tab.addEventListener('click', () => go(one.page));
    rail.appendChild(tab);
    tabs.set(one.page, { root: tab, sub });
  }
  // Which Mender this is, and the way to a newer one, at the foot of the rail.
  const version = el('div', 'st-foot');
  rail.appendChild(version);
  let upToDateTimer = 0;
  let sayUpToDate = false;

  function drawVersion(): void {
    const up = now.update;
    const name = el('span', 'st-foot-name');
    name.textContent = up ? `Mender ${up.version}` : 'Mender';
    const parts: HTMLElement[] = [name];
    const quiet = (text: string, sore = false): void => {
      const line = el('span', sore ? 'st-foot-said sore' : 'st-foot-said');
      line.textContent = text;
      parts.push(line);
    };
    const check = (said: string): void => {
      parts.push(
        button(said, 'st-foot-act', () => {
          sayUpToDate = true;
          void does.checkUpdate();
        })
      );
    };
    if (!up) {
      // nothing yet
    } else if (up.phase === 'cannot') {
      quiet(up.said ?? '');
    } else if (up.phase === 'checking') {
      quiet('looking…');
    } else if (up.phase === 'fetching') {
      quiet(`fetching ${up.latest ?? 'the new one'}…`);
    } else if (up.phase === 'ready') {
      parts.push(
        button(`restart into ${up.latest}`, 'st-foot-act', () => {
          void does.restartToUpdate();
        })
      );
      quiet('or it swaps itself in next time you quit');
    } else if (up.phase === 'failed') {
      quiet(up.said ?? 'could not look', true);
      check('try again');
    } else if (up.phase === 'none' && sayUpToDate) {
      quiet('up to date');
      if (!upToDateTimer) {
        upToDateTimer = window.setTimeout(() => {
          sayUpToDate = false;
          upToDateTimer = 0;
          if (back.isConnected) drawVersion();
        }, 3000);
      }
    } else {
      check('check for updates');
    }
    version.replaceChildren(...parts);
  }

  rail.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const at = PAGES.findIndex((one) => one.page === page);
    const next = PAGES[(at + (event.key === 'ArrowDown' ? 1 : PAGES.length - 1)) % PAGES.length];
    if (!next) return;
    go(next.page);
    tabs.get(next.page)?.root.focus();
  });

  function go(to: Page): void {
    if (to !== 'keys') stopArming();
    page = to;
    lastPage = to;
    showPage();
    draw();
  }

  function showPage(): void {
    for (const [one, root] of Object.entries(pageRoots) as [Page, HTMLElement][]) {
      root.style.display = one === page ? '' : 'none';
    }
    for (const [one, tab] of tabs) {
      tab.root.classList.toggle('here', one === page);
      tab.root.setAttribute('aria-current', String(one === page));
    }
    const here = PAGES.find((one) => one.page === page);
    heading.textContent = here?.said ?? '';
    lead.textContent = here?.lead ?? '';
    body.scrollTop = 0;
  }

  function drawRail(): void {
    const sub = (one: Page, text: string): void => {
      const tab = tabs.get(one);
      if (tab) tab.sub.textContent = text;
    };
    const hand = now.hands?.find((one) => one.id === now.hand)?.name;
    const told = now.notifications ? (now.notifications.enabled ? 'notifies' : 'quiet') : '';
    sub('general', [hand, told].filter(Boolean).join(' · '));
    const checkout = now.checkout;
    sub(
      'checkouts',
      checkout
        ? `${checkout.branchPrefix || 'mender'}/…${checkout.randomSuffix ? ' + a tail' : ''}`
        : ''
    );
    const term = now.terminal;
    sub(
      'terminal',
      term ? `${term.fontSize || 13}px · ${(term.defaultShell || '$SHELL').split('/').at(-1)}` : ''
    );
    const rebound = now.keybindings ? Object.keys(now.keybindings).length : null;
    sub('keys', rebound === null ? '' : rebound ? `${rebound} rebound` : 'as they come');
    const installed = now.hands?.filter((one) => one.here).length;
    sub('agents', installed === undefined ? '' : `${installed} on this machine`);
    const trees = now.worktrees;
    const stale = trees?.filter((one) => one.stale).length ?? 0;
    sub(
      'disk',
      trees
        ? trees.length
          ? `${counted(trees.length, 'worktree')}${stale ? ` · ${stale} stale` : ''}`
          : 'nothing left over'
        : ''
    );
    const machine = now.machine;
    sub(
      'machine',
      machine
        ? `cpu ${Math.round(machine.cpuPercent)}% · ${sized(machine.memUsedBytes)} in use`
        : ''
    );
  }

  // ── general ──────────────────────────────────────────────────────────────
  function drawStarts(): void {
    if (!now.hands) {
      starts.fill([hintLine('Reading it…')]);
      return;
    }
    const here = now.hands.filter((one) => one.here);
    const away = now.hands.length - here.length;
    const cards = el('div', 'st-hands');
    for (const hand of here) {
      const picked = hand.id === now.hand;
      const card = el('div', picked ? 'st-hand picked' : 'st-hand');
      const art = el('div', 'st-hand-art');
      art.appendChild(
        px(picked ? 'flame' : 'hood', picked ? '#f2c66d' : 'rgba(246,236,219,.5)', 28)
      );
      const title = el('b', '');
      title.textContent = hand.name;
      const sub = el('span', 'st-hand-sub');
      sub.textContent = 'on this machine';
      card.append(art, title, sub);
      if (picked) {
        const badge = el('span', 'st-badge');
        badge.textContent = 'starts here';
        card.appendChild(badge);
        const act = el('span', 'st-hand-act here');
        act.textContent = 'remembered from last time';
        card.appendChild(act);
      } else {
        const act = button('start here instead', 'st-foot-act', () => {
          void does.choose(hand.id).then(() => took(starts));
        });
        card.appendChild(act);
      }
      cards.appendChild(card);
    }
    const children: HTMLElement[] = [];
    if (here.length) children.push(cards);
    else children.push(hintLine('No agent is installed on this machine yet.'));
    if (away) {
      const card = el('div', 'st-hand off');
      const art = el('div', 'st-hand-art');
      art.appendChild(px('plus', 'rgba(246,236,219,.5)', 28));
      const title = el('b', '');
      title.textContent = counted(away, 'other');
      const sub = el('span', 'st-hand-sub');
      sub.textContent = 'could work here once installed. A session’s /agent card brings them in.';
      card.append(art, title, sub);
      cards.appendChild(card);
    }
    starts.fill(children);
  }

  function drawNotify(): void {
    const held = now.notifications;
    if (!held) {
      notify.fill([hintLine('Reading it…')]);
      return;
    }
    const choices = el('div', 'st-seg');
    const set = (on: boolean) => () =>
      void does.setNotificationsEnabled(on).then(() => took(notify));
    choices.append(
      chip('Tell me', held.enabled, set(true)),
      chip('Stay quiet', !held.enabled, set(false))
    );
    notify.fill([
      formRowSub('A banner', 'when somebody asks, finishes or breaks', choices),
      hintLine('Only while Mender is not the window in front.'),
    ]);
  }

  // ── checkouts ────────────────────────────────────────────────────────────
  function drawBranches(): void {
    const held = now.checkout;
    if (!held) {
      branches.fill([hintLine('Reading it…')]);
      return;
    }
    const prefix = input(held.branchPrefix, 'mender', async (value) => {
      await does.setBranchPrefix(value.trim());
      took(branches);
    });
    const tail = el('button', held.randomSuffix ? 'st-toggle on' : 'st-toggle');
    tail.type = 'button';
    tail.setAttribute('role', 'switch');
    tail.setAttribute('aria-checked', String(held.randomSuffix));
    tail.addEventListener(
      'click',
      () => void does.setRandomSuffix(!held.randomSuffix).then(() => took(branches))
    );
    const example = `${held.branchPrefix || 'mender'}/fix-the-login${held.randomSuffix ? '-k3q9' : ''}`;
    const sign = el('div', 'st-sign');
    const cords = el('div', 'st-cords');
    cords.append(el('i', ''), el('i', ''));
    const board = el('div', 'st-board');
    board.textContent = example;
    const cap = el('small', '');
    cap.textContent = 'what a session called “fix the login” gets';
    sign.append(cords, board, cap);
    const forms = el('div', 'st-forms');
    forms.append(
      formRowSub('Prefix', 'absent anywhere else', prefix),
      formRowSub('Random tail', 'so two named the same never collide', tail)
    );
    forms.style.cssText = 'display:flex;flex-direction:column;justify-content:center';
    const card = el('div', 'st-card st-branch');
    card.append(sign, forms);
    branches.fill([card]);
  }

  function drawLanding(): void {
    const held = now.checkout;
    if (!held) {
      landing.fill([hintLine('Reading it…')]);
      return;
    }
    const folder = (
      value: string,
      example: string,
      title: string,
      save: (path: string) => Promise<void>
    ): HTMLElement => {
      const field = input(value, example, async (typed) => {
        await save(typed.trim());
        took(landing);
      });
      const choose = button('choose…', 'st-link', () => {
        void window.mender.pickFolder(title).then(async (picked) => {
          if (!picked) return;
          field.value = picked;
          await save(picked);
          took(landing);
        });
      });
      const line = el('div', 'st-when');
      field.style.flex = '1';
      line.append(field, choose);
      return line;
    };
    const projects = folder(held.projectsDir, '~/mender/projects', 'Where new projects land', (p) =>
      does.setProjectsDir(p)
    );
    const trees = folder(held.worktreeDir, '~/mender/worktrees', 'Where own copies are cut', (p) =>
      does.setWorktreeDir(p)
    );
    landing.fill([
      formRowSub('New projects', 'cloned or freshly started', projects),
      formRowSub('Own copies', 'each is a folder of its own', trees),
      hintLine('Changing this never moves what is already cut.'),
    ]);
  }

  // ── jira ─────────────────────────────────────────────────────────────────
  let jiraFailed = '';
  let jiraTrying = false;
  let jiraForgetting: string | null = null;
  let jiraDrawn = false;
  /** What went wrong setting each project's board, kept until it next takes. */
  const jiraBoardFailed: Record<string, string> = {};
  /** The empty form for one more site, folded away once one is connected. */
  let jiraAdding = false;
  async function drawJira(): Promise<void> {
    if (!jiraDrawn) jiraSites.fill([hintLine('Reading it…')]);
    const held = await does.jira.status();
    jiraDrawn = true;
    const tab = tabs.get('jira');
    if (tab)
      tab.sub.textContent = held.sites.length
        ? held.sites.map((one) => one.site.replace('.atlassian.net', '')).join(' · ')
        : 'not connected';
    if (busy(jiraAdd) || busy(jiraRecipe)) return;
    const value = (text: string): HTMLElement => {
      const said = el('span', 'st-val');
      said.textContent = text;
      return said;
    };
    const another = button('connect another site', 'st-link', () => {
      jiraAdding = true;
      void drawJira();
    });
    jiraSites.fill(
      held.sites.length
        ? [
            ...held.sites.map((one) => {
              const card = el('div', 'st-site');
              const armed = jiraForgetting === one.site;
              const forget = button(
                armed ? 'forget it: press again' : 'forget this site',
                'st-link',
                () => {
                  if (!armed) {
                    jiraForgetting = one.site;
                    void drawJira();
                    window.setTimeout(() => {
                      if (jiraForgetting !== one.site) return;
                      jiraForgetting = null;
                      void drawJira();
                    }, STANDS_MS);
                    return;
                  }
                  jiraForgetting = null;
                  void does.jira.forget(one.site).then(() => drawJira());
                }
              );
              if (armed) stand(() => forget.click(), forget);
              card.append(
                formRow('Site', value(one.site)),
                formRow('Email', value(one.email)),
                formRow('API token', value('saved, kept sealed on this Mac')),
                formRow('Signed in as', value(one.who)),
                forget
              );
              return card;
            }),
            ...(jiraAdding ? [] : [another]),
          ]
        : [hintLine('Nothing on this Mac is connected to Jira yet.')]
    );
    jiraAdd.root.style.display = !held.sites.length || jiraAdding ? '' : 'none';

    const site = input('', 'yourteam.atlassian.net', async () => undefined);
    const email = input('', 'you@example.com', async () => undefined);
    const token = input('', 'API token', async () => undefined);
    token.type = 'password';
    const go = button(jiraTrying ? 'checking it…' : 'connect', 'st-link', () => {
      if (jiraTrying) return;
      jiraTrying = true;
      jiraFailed = '';
      void drawJiraAdd();
      void does.jira.connect(site.value, email.value, token.value).then((said) => {
        jiraTrying = false;
        jiraFailed = said ?? '';
        took(jiraAdd, said ? undefined : 'connected');
        if (!said) {
          jiraAdding = false;
          site.value = '';
          email.value = '';
          token.value = '';
        }
        void drawJira();
      });
    });
    const tokenPage = button('make a token', 'st-link', () => {
      window.mender.openLink('https://id.atlassian.com/manage-profile/security/api-tokens');
    });
    const drawJiraAdd = (): void => {
      go.textContent = jiraTrying ? 'checking it…' : 'connect';
      jiraAdd.fill([
        formRow('Site', site),
        formRow('Email', email),
        formRow('API token', token),
        ...(jiraFailed ? [troubled(jiraFailed)] : []),
        (() => {
          const line = el('div', 'st-when');
          line.style.gap = '24px';
          line.append(go, tokenPage);
          return line;
        })(),
      ]);
    };
    drawJiraAdd();

    jiraBoards.root.style.display = held.sites.length ? '' : 'none';
    if (held.sites.length && !busy(jiraBoards)) {
      const links = await does.jira.links();
      jiraBoards.fill([
        hintLine(
          'Open the board in your browser, copy the address bar, and paste it here. Return saves it; clearing it lets the project pick again.'
        ),
        ...does.jira.projects().map((one) => {
          const link = links[one.id];
          const field = input(
            link?.url ?? '',
            'https://yourteam.atlassian.net/jira/software/projects/KEY/boards/12',
            async (url) => {
              if (url.trim() === (link?.url ?? '')) return;
              const said = await does.jira.setBoard(one.id, url);
              jiraBoardFailed[one.id] = said ?? '';
              took(jiraBoards, said ? undefined : 'saved');
              void drawJira();
            }
          );
          const now = el('span', 'st-inline');
          now.textContent = link
            ? `showing ${link.name ?? `the ${link.key} board`} · ${link.site.replace('.atlassian.net', '')}`
            : 'no board picked yet';
          const failed = jiraBoardFailed[one.id];
          return formRow(one.name, field, now, ...(failed ? [troubled(failed)] : []));
        }),
      ]);
    }

    const recipe = area(held.recipe, 'Work on {key}: {summary}', 6, async (text) => {
      await does.jira.setRecipe(text);
      took(jiraRecipe);
    });
    jiraRecipe.fill([
      recipe,
      hintLine(
        'What a session taking a ticket on is told first. {key}, {summary}, {url} and {description} are filled in from the ticket.'
      ),
    ]);
  }

  function troubled(text: string): HTMLElement {
    const said = el('p', 'st-trouble');
    said.textContent = text;
    return said;
  }

  // ── terminal ─────────────────────────────────────────────────────────────
  function drawShellLook(): void {
    const held = now.terminal;
    if (!held) {
      shellLook.fill([hintLine('Reading it…')]);
      return;
    }
    const size = input(held.fontSize ? String(held.fontSize) : '', '13', async (value) => {
      const parsed = Number.parseInt(value, 10);
      await does.setTerminalFontSize(Number.isFinite(parsed) && parsed > 0 ? parsed : 0);
      took(shellLook);
    });
    size.inputMode = 'numeric';
    const shown = held.fontSize || 13;
    const step = (by: number): void => {
      void does
        .setTerminalFontSize(Math.min(40, Math.max(8, shown + by)))
        .then(() => took(shellLook));
    };
    const stepper = el('div', 'st-stepper');
    stepper.append(
      button('−', '', () => step(-1)),
      size,
      button('+', '', () => step(1))
    );
    const unit = el('span', 'st-inline');
    unit.textContent = 'px · what the grid actually draws at';
    const line = el('div', 'st-when');
    line.append(stepper, unit);

    const term = el('div', 'st-term');
    const bar = el('div', 'st-term-bar');
    bar.append(el('i', ''), el('i', ''), el('i', ''));
    const barName = el('span', '');
    barName.textContent = (held.defaultShell || '$SHELL').split('/').at(-1) ?? 'shell';
    bar.appendChild(barName);
    const sample = el('pre', '');
    sample.style.fontSize = `${shown}px`;
    sample.innerHTML =
      '<span class="g">you@mac</span> <span class="b">repo</span> % git status -sb\n' +
      '## main...origin/main [ahead 2]\n' +
      ' <span class="r">M</span> src/gate.ts\n' +
      '<span class="g">you@mac</span> <span class="b">repo</span> % ▍';
    term.append(bar, sample);
    shellLook.fill([term, formRowSub('Font size', 'every shell opened next', line)]);
  }

  function drawShellIs(): void {
    const held = now.terminal;
    if (!held) {
      shellIs.fill([hintLine('Reading it…')]);
      return;
    }
    const shell = input(held.defaultShell, '/bin/zsh', async (value) => {
      await does.setDefaultShell(value.trim());
      took(shellIs);
    });
    shellIs.fill([
      formRowSub('Default shell', 'what ps on the spawned process shows', shell),
      hintLine('Blank starts whatever $SHELL already says.'),
    ]);
  }

  // ── keys ─────────────────────────────────────────────────────────────────
  /** The doing armed for a key press, if any, and what came of the last one
      tried — a conflict is said right where the key would have gone, not as
      a toast, since that is the one line anyone rebinding a key is actually
      looking at. */
  let arming: string | null = null;
  let armed: string | null = null;
  let armKey: ((event: KeyboardEvent) => void) | null = null;

  /** Only lets go of the listener — `arming` stays put so a conflict can
      still be shown against the row that was being rebound. */
  function detach(): void {
    if (armKey) document.removeEventListener('keydown', armKey, true);
    armKey = null;
  }

  function stopArming(): void {
    detach();
    arming = null;
    armed = null;
  }

  function arm(pick: string): void {
    stopArming();
    arming = pick;
    drawKeys();
    const onKey = (event: KeyboardEvent): void => {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'Escape') {
        stopArming();
        drawKeys();
        return;
      }
      const letter =
        event.key.length === 1
          ? event.shiftKey && /^[a-z]$/i.test(event.key)
            ? event.key.toUpperCase()
            : event.key.toLowerCase()
          : '';
      if (!/^[a-zA-Z[\],]$/.test(letter)) return; // not a chord this table speaks in — keep waiting.
      const bound = now.keybindings ?? {};
      const mine = rebindableDoings().find((each) => each.pick === pick);
      const conflict = rebindableDoings().find(
        (each) =>
          each.pick !== pick &&
          chordOf(each.pick, bound) === letter &&
          each.where.some((place) => mine?.where.includes(place) ?? true)
      );
      detach();
      if (conflict) {
        armed = `${chordLabel(letter)} is already ${conflict.name}'s`;
        drawKeys();
        return;
      }
      arming = null;
      void does.rebind(pick, letter).then(() => {
        drawKeys();
        keys.saved();
      });
    };
    armKey = onKey;
    document.addEventListener('keydown', onKey, true);
  }

  function drawKeys(): void {
    if (!now.keybindings) {
      keys.fill([hintLine('Reading it…')]);
      return;
    }
    const bound = now.keybindings;
    const all = rebindableDoings();
    const half = Math.ceil(all.length / 2);
    const columns = [el('div', 'st-keycol'), el('div', 'st-keycol')];
    all.forEach((doing, at) => {
      const chord = chordOf(doing.pick, bound) ?? '';
      const waiting = arming === doing.pick;
      const rebound = bound[doing.pick] !== undefined;
      const row = el(
        'div',
        `st-key-row${waiting ? (armed ? ' clash' : ' waiting') : rebound ? ' rebound' : ''}`
      );
      const top = el('div', 'st-key-top');
      const name = el('span', 'st-key-name');
      name.textContent = doing.name;
      top.append(name);
      if (rebound && !waiting) {
        top.append(
          button('default', 'st-link', () => {
            void does.unbind(doing.pick).then(() => {
              drawKeys();
              keys.saved();
            });
          })
        );
      }
      const caps = el('button', 'st-key-caps');
      caps.type = 'button';
      caps.addEventListener('click', () => arm(doing.pick));
      if (waiting && !armed) {
        const wait = el('span', 'st-key-wait');
        const dot = el('span', 'g-dot');
        dot.style.background = '#f2c66d';
        const said = el('span', '');
        said.textContent = 'press the new key…';
        wait.append(dot, said);
        caps.appendChild(wait);
      } else if (chord) {
        for (const part of capsOf(chordLabel(chord))) {
          const cap = el('span', 'g-kc');
          cap.textContent = part;
          caps.appendChild(cap);
        }
      } else {
        const said = el('span', 'st-inline');
        said.textContent = 'unset';
        caps.appendChild(said);
      }
      top.append(caps);
      row.append(top);
      if (waiting && armed) {
        const clash = el('div', 'st-key-clash');
        clash.append(px('warn', '#f08a72', 14));
        const said = el('span', '');
        said.textContent = `${armed}. left as it was.`;
        clash.append(said);
        row.append(clash);
      }
      columns[at < half ? 0 : 1]?.appendChild(row);
    });
    const legend = el('div', 'st-legend');
    for (const [color, said] of [
      ['#f2c66d', 'waiting for a key'],
      ['#f08a72', 'clash, left as it was'],
      ['#9bd28a', 'rebound, “default” puts it back'],
    ] as const) {
      const one = el('span', '');
      const dot = el('span', 'g-dot');
      dot.style.background = color;
      const t = el('span', '');
      t.textContent = said;
      one.append(dot, t);
      legend.appendChild(one);
    }
    const grid = el('div', 'st-keys');
    grid.append(...columns);
    keys.fill([grid, legend]);
  }

  // ── agents ───────────────────────────────────────────────────────────────
  function agentHere(): Hand | null {
    const here = now.hands?.filter((one) => one.here) ?? [];
    const kept = here.find((one) => one.id === lastAgent);
    const picked = kept ?? here.find((one) => one.id === now.hand) ?? here[0] ?? null;
    lastAgent = picked?.id ?? null;
    return picked;
  }

  function drawAgentPick(): void {
    if (!now.hands) {
      agentPick.fill([hintLine('Reading it…')]);
      return;
    }
    const here = now.hands.filter((one) => one.here);
    if (!here.length) {
      agentPick.fill([hintLine('No agent is installed on this machine yet.')]);
      return;
    }
    const picked = agentHere();
    const choices = el('div', 'st-tabsrow');
    for (const hand of here) {
      const on = hand.id === picked?.id;
      const tab = el('button', on ? 'st-hand-tab picked' : 'st-hand-tab');
      tab.type = 'button';
      tab.appendChild(px(on ? 'flame' : 'hood', on ? '#f2c66d' : 'rgba(246,236,219,.5)', 18));
      const said = el('span', '');
      said.textContent = hand.name;
      tab.appendChild(said);
      const installs = now.installs[hand.id]?.candidates.length ?? 0;
      if (installs > 1) {
        const tag = el('span', 'st-tag');
        tag.textContent = `${installs} installs`;
        tab.appendChild(tag);
      }
      tab.addEventListener('click', () => {
        if (on) return;
        lastAgent = hand.id;
        drawAgents(true);
      });
      choices.appendChild(tab);
    }
    agentPick.fill([choices]);
  }

  function drawAgentArgs(hand: Hand): void {
    const config = now.providers[hand.id];
    if (!config) {
      agentArgs.fill([hintLine('Reading it…')]);
      return;
    }
    const field = input(config.extraArgs.join(' '), 'none', async (value) => {
      await does.setExtraArgs(hand.id, value);
      took(agentArgs);
    });
    agentArgs.fill([
      formRowSub('Extra arguments', `after ${hand.name}’s ordinary command, every time`, field),
    ]);
  }

  let envKey = '';
  let envValue = '';

  function drawAgentEnv(hand: Hand): void {
    const config = now.providers[hand.id];
    if (!config) {
      agentEnv.fill([hintLine('Reading it…')]);
      return;
    }
    const lines: HTMLElement[] = [];
    for (const [key, value] of Object.entries(config.env)) {
      const row = el('div', 'st-env');
      const k = el('span', 'st-env-k');
      k.textContent = key;
      const eq = el('span', 'st-inline');
      eq.textContent = '=';
      const v = el('span', 'st-env-v');
      v.textContent = value;
      v.title = `${key}=${value}`;
      const remove = button('remove', 'st-link', () => {
        void does.removeEnvVar(hand.id, key).then(() => {
          drawAgentEnv(hand);
          agentEnv.saved('removed');
        });
      });
      row.append(k, eq, v, remove);
      lines.push(row);
    }
    const name = document.createElement('input');
    name.className = 'st-input st-key';
    name.placeholder = 'NAME';
    name.spellcheck = false;
    name.value = envKey;
    name.addEventListener('input', () => (envKey = name.value));
    const value = document.createElement('input');
    value.className = 'st-input';
    value.placeholder = 'value';
    value.spellcheck = false;
    value.value = envValue;
    value.addEventListener('input', () => (envValue = value.value));
    const add = (): void => {
      const key = envKey.trim();
      if (!key) {
        name.focus();
        return;
      }
      void does.setEnvVar(hand.id, key, envValue).then(() => {
        envKey = '';
        envValue = '';
        drawAgentEnv(hand);
        agentEnv.saved('added');
      });
    };
    for (const field of [name, value]) {
      field.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          add();
        }
      });
    }
    const line = el('div', 'st-env');
    const eq = el('span', 'st-inline');
    eq.textContent = '=';
    line.append(name, eq, value, button('add', 'st-link', add));
    lines.push(line);
    agentEnv.fill([
      formRowSub('Environment', `added to ${hand.name}’s spawn, by name`, ...lines),
      hintLine('Under whatever a project sets itself.'),
    ]);
  }

  function drawAgentInstall(hand: Hand): void {
    const install = now.installs[hand.id];
    if (!install || install.candidates.length < 2) {
      agentInstall.root.style.display = 'none';
      return;
    }
    agentInstall.root.style.display = '';
    const list = el('div', 'st-rows');
    for (const candidate of install.candidates) {
      const picked =
        install.selection?.kind === 'path'
          ? install.selection.path === candidate.path
          : install.resolved?.path === candidate.path && !install.selection;
      const row = el('button', 'st-row');
      row.type = 'button';
      const radio = el('span', 'st-radio');
      const main = el('span', 'st-row-main');
      const path = el('span', 'st-row-title');
      path.style.fontFamily = 'var(--g-mono)';
      path.style.fontSize = '14px';
      path.textContent = candidate.path;
      main.append(path);
      row.append(radio, main);
      if (picked) {
        row.classList.add('picked');
        const side = el('span', 'st-tag moss');
        side.textContent = 'in use';
        row.append(side);
      } else {
        const side = el('span', 'st-link');
        side.textContent = 'use this one';
        row.append(side);
      }
      row.addEventListener('click', () => {
        if (picked) return;
        void does.selectInstall(hand.id, candidate.path).then(() => {
          drawAgentInstall(hand);
          agentInstall.saved();
        });
      });
      list.appendChild(row);
    }
    agentInstall.fill([list]);
  }

  function drawAgents(switched = false): void {
    if (switched) {
      envKey = '';
      envValue = '';
    }
    drawAgentPick();
    const hand = agentHere();
    for (const part of [agentArgs, agentEnv, agentInstall]) {
      part.root.style.display = hand ? '' : 'none';
    }
    if (!hand) return;
    if (switched || !busy(agentArgs)) drawAgentArgs(hand);
    if (switched || !busy(agentEnv)) drawAgentEnv(hand);
    drawAgentInstall(hand);
  }

  // ── on disk ──────────────────────────────────────────────────────────────
  /** The worktree armed for a second press to clear it, if any. */
  let clearing: string | null = null;
  let clearingTimer: number | undefined;
  /** Clearing every stale worktree at once, armed for a second press. */
  let clearingAll = false;

  function armClear(id: string | 'all' | null): void {
    window.clearTimeout(clearingTimer);
    clearing = id === 'all' ? null : id;
    clearingAll = id === 'all';
    if (id) {
      clearingTimer = window.setTimeout(() => {
        clearing = null;
        clearingAll = false;
        if (back.isConnected) drawWorktrees();
      }, STANDS_MS);
    }
    drawWorktrees();
  }

  function drawWorktrees(): void {
    if (!now.worktrees) {
      worktrees.fill([hintLine('Reading it…')]);
      return;
    }
    if (!now.worktrees.length) {
      worktrees.fill([
        hintLine('Every worktree Mender ever cut is either in use or already gone.'),
      ]);
      return;
    }
    const children: HTMLElement[] = [];
    const stale = now.worktrees.filter((one) => one.stale);
    const total = now.worktrees.reduce((sum, one) => sum + (one.bytes ?? 0), 0);
    const dirty = now.worktrees.filter((one) => one.uncommitted).length;
    const largest = Math.max(1, ...now.worktrees.map((one) => one.bytes ?? 0));

    const summary = el('div', 'st-card st-stat');
    const stat = (value: string, said: string, tone = ''): HTMLElement => {
      const one = el('div', '');
      const big = el('b', tone);
      big.textContent = value;
      const small = el('span', '');
      small.textContent = said;
      one.append(big, small);
      return one;
    };
    summary.append(
      stat(
        sized(total),
        `in ${counted(now.worktrees.length, 'own copy').replace('copys', 'copies')}`
      ),
      stat(String(stale.length), 'stale, safe to clear', 'moss'),
      stat(String(dirty), 'has uncommitted work', dirty ? 'ember' : '')
    );
    children.push(summary);

    const list = el('div', 'st-rows');
    for (const one of now.worktrees) {
      const armedHere = clearing === one.id;
      const row = el('div', armedHere ? 'st-tree armed' : 'st-tree');
      const top = el('div', 'st-tree-top');
      const title = el('span', 'st-tree-name');
      title.textContent = one.branch ?? one.path.split('/').at(-1) ?? one.path;
      title.title = title.textContent;
      const meta = el('span', 'st-tree-path');
      meta.textContent = one.path.replace(/^\/Users\/[^/]+/, '~');
      meta.title = one.path;
      top.append(title, meta);
      if (one.stale) {
        const tag = el('span', 'st-tag moss');
        tag.textContent = 'stale';
        top.append(tag);
      }
      const size = el('span', 'st-tree-size');
      size.textContent = one.bytes === null ? 'measuring' : sized(one.bytes);
      top.append(size);
      const clear = button(armedHere ? 'clear it' : 'clear', 'st-link', () => {
        if (!armedHere) {
          armClear(one.id);
          return;
        }
        armClear(null);
        void does.clear(one).then(() => drawWorktrees());
      });
      if (armedHere) {
        clear.classList.add('sore');
        stand(() => clear.click(), clear);
      } else {
        top.append(clear);
      }
      const bar = el('div', 'st-bar');
      const fill = el('i', '');
      fill.style.width = `${Math.round(((one.bytes ?? 0) / largest) * 100)}%`;
      bar.append(fill);
      row.append(top, bar);
      if (armedHere) {
        const cost = el('div', 'st-cost');
        cost.append(px('warn', '#f08a72', 18));
        const text = el('div', '');
        const head = el('b', '');
        head.textContent = 'this is what would go';
        const said = el('span', '');
        said.textContent = costOf(one).replace(/^press again — /, '');
        text.append(head, said);
        const acts = el('div', 'st-cost-acts');
        const keep = button('no, keep it', 'st-link', () => armClear(null));
        keep.style.color = 'var(--g-ink-3)';
        acts.append(clear, keep);
        cost.append(text, acts);
        row.append(cost);
      }
      list.appendChild(row);
    }
    children.push(list);
    if (stale.length >= 2) {
      const all = button(
        clearingAll
          ? `Press again and all ${stale.length} stale ones go`
          : `Clear every stale one (${stale.length})`,
        clearingAll ? 'st-pill sore' : 'st-ghost',
        () => {
          if (!clearingAll) {
            armClear('all');
            return;
          }
          armClear(null);
          void (async () => {
            for (const one of stale) await does.clear(one);
            drawWorktrees();
          })();
        }
      );
      if (clearingAll) stand(() => all.click(), all);
      const actions = el('div', 'st-actions');
      actions.appendChild(all);
      children.push(actions);
    }
    worktrees.fill(children);
  }

  // ── this machine ─────────────────────────────────────────────────────────
  function drawSpend(): void {
    if (!now.machine) {
      spend.fill([hintLine('Reading it…')]);
      return;
    }
    const one = now.machine;
    const dials = el('div', 'st-dials');
    dials.append(
      dial('CPU', `${Math.round(one.cpuPercent)}`, '%', one.cpuPercent / 100, 'moss', true),
      dial(
        'Memory',
        gbOf(one.memUsedBytes),
        `gb of ${gbOf(one.memTotalBytes)}`,
        one.memTotalBytes ? one.memUsedBytes / one.memTotalBytes : 0,
        '',
        false
      ),
      dial(
        'Disk',
        gbOf(one.diskUsedBytes),
        `gb of ${gbOf(one.diskTotalBytes)}`,
        one.diskTotalBytes ? one.diskUsedBytes / one.diskTotalBytes : 0,
        'pale',
        true
      )
    );
    spend.fill([dials]);
  }

  function drawFive(): void {
    if (!now.fiveHours) {
      five.fill([hintLine('Reading it…')]);
      return;
    }
    five.fill(drawFiveHours(now.fiveHours));
  }

  function drawShares(): void {
    if (!now.sessions) {
      shares.fill([hintLine('Reading it…')]);
      return;
    }
    if (!now.sessions.length) {
      shares.fill([hintLine('No session is open.')]);
      return;
    }
    const card = el('div', 'st-card');
    const headRow = el('div', 'st-share st-th-row');
    for (const said of ['session', 'cpu', 'mem', 'dev']) {
      const cell = el('span', said === 'session' ? '' : 'num');
      cell.textContent = said;
      if (said === 'session') headRow.append(cell, el('span', ''), el('span', ''));
      else headRow.append(cell);
    }
    headRow.style.gridTemplateColumns = '1fr 190px 52px 60px 64px 34px';
    card.append(...now.sessions.map(drawSessionUsage));
    shares.fill([card]);
  }

  /* The five hours: the subscription's own window, drawn as the strip of
     cells a limit's wait already is, with where its pace lands said beside
     it, the week under that, and then who spent it, dearest first, each as
     a bar against the hungriest. */
  function drawFiveHours(five: FiveHours): HTMLElement[] {
    const out: HTMLElement[] = [];
    const window = five.reading?.fiveHour;
    if (!window) {
      out.push(hintLine('Not read yet. Nobody has heard back from Claude this sitting.'));
      return out;
    }
    const at = Date.now();
    const twin = el('div', 'st-twin');
    const card = el('div', 'st-win-card');
    const top = el('div', 'st-win-top');
    const lab = el('span', 'g-pix');
    lab.textContent = 'the five hours';
    top.appendChild(lab);
    const line = windowLine(five, at);
    if (five.lately !== null && five.lately > 1.5) {
      const tag = el('span', 'st-tag ember');
      tag.textContent = `${five.lately.toFixed(1)}× its pace`;
      top.appendChild(tag);
    }
    const foot = el('div', 'st-win-foot');
    if (line) {
      foot.textContent = line.said.replace(/^five hours: /, '');
      if (line.tone !== 'quiet') foot.classList.add('warn');
    }
    card.append(top, drawWindow(window, at, FIVE_HOURS_MS, five.lately), foot);
    twin.appendChild(card);
    const week = five.reading?.sevenDay;
    if (week) {
      const weekCard = el('div', 'st-win-card');
      const weekTop = el('div', 'st-win-top');
      const weekLab = el('span', 'g-pix');
      weekLab.textContent = 'the week';
      weekTop.appendChild(weekLab);
      const weekly = drawWindow(week, at, SEVEN_DAYS_MS, null);
      weekly.classList.add('week');
      const weekFoot = el('div', 'st-win-foot');
      const used = el('span', '');
      used.innerHTML = `<b>${Math.round(week.utilization * 100)}%</b> used`;
      const resets = el('span', '');
      resets.textContent = `resets ${clockOf(week.resetsAt, at)}`;
      weekFoot.append(used, resets);
      weekCard.append(weekTop, weekly, weekFoot);
      twin.appendChild(weekCard);
    }
    out.push(twin);
    if (five.reading && at - five.reading.at > 10 * 60_000) {
      out.push(hintLine(`Last read ${spanOf(at - five.reading.at)} ago.`));
    }
    if (five.sessions.length) {
      const most = Math.max(...five.sessions.map((one) => one.share));
      const list = el('div', 'st-card');
      const heads = el('div', 'st-share st-th-row');
      heads.style.gridTemplateColumns = '1fr 190px 52px';
      for (const said of ['who spent this window', '', 'share']) {
        const cell = el('span', said === 'share' ? 'num' : '');
        cell.textContent = said;
        heads.appendChild(cell);
      }
      list.appendChild(heads);
      for (const session of five.sessions.slice(0, 12)) {
        list.appendChild(drawShare(session, most, at));
      }
      out.push(list);
    }
    return out;
  }

  function drawWindow(
    window: UsageWindow,
    at: number,
    span: number,
    lately: number | null
  ): HTMLElement {
    const strip = el('div', 'st-strip');
    const cells = 40;
    const start = window.resetsAt - span;
    const through = Math.min(1, Math.max(0, (at - start) / span));
    const { at: out } = runsOut(window, at, span, lately);
    const spent = Math.min(1, Math.max(0, window.utilization));
    const outAt = out === null ? null : Math.min(1, Math.max(0, (out - start) / span));
    for (let i = 0; i < cells; i += 1) {
      const cell = el('i', '');
      const from = i / cells;
      if (from < spent) cell.classList.add('spent');
      if (from < through && from + 1 / cells >= through) cell.classList.add('now');
      if (outAt !== null && outAt < 1 && from < outAt && from + 1 / cells >= outAt)
        cell.classList.add('out');
      strip.appendChild(cell);
    }
    strip.title = `${Math.round(spent * 100)}% spent, ${Math.round(through * 100)}% of the way through`;
    return strip;
  }

  function drawShare(session: SessionShare, most: number, at: number): HTMLElement {
    const row = el('div', 'st-share');
    row.style.gridTemplateColumns = '1fr 190px 52px';
    const name = el('div', 'st-share-name');
    const title = el('b', '');
    title.textContent = session.where ? `${session.title} · ${session.where}` : session.title;
    const meta = el('span', '');
    meta.textContent = [
      `${counted(session.calls, 'call')}`,
      `${tokensOf(session.context)} re-read each call`,
      ...(session.screenshots ? [`${counted(session.screenshots, 'picture')}`] : []),
      `last ${spanOf(at - session.lastAt)} ago`,
    ].join(' · ');
    name.append(title, meta);
    if (session.context >= 150_000) {
      const heavy = el('span', '');
      heavy.style.color = 'var(--g-sore)';
      heavy.textContent =
        'Heavy: every call re-reads the whole conversation, and this one is long.';
      name.append(heavy);
    }
    const bar = el('div', 'st-cells');
    bar.style.marginTop = '0';
    const lit = Math.round((most > 0 ? session.share / most : 0) * 20);
    for (let i = 0; i < 20; i += 1) bar.appendChild(el('i', i < lit ? 'f' : ''));
    const side = el('span', 'num');
    side.textContent = `${Math.round(session.share * 100)}%`;
    row.append(name, bar, side);
    return row;
  }

  function drawSessionUsage(session: SessionUsage): HTMLElement {
    const row = el('div', 'st-share');
    row.style.gridTemplateColumns = '1fr 64px 80px 40px';
    const name = el('div', 'st-share-name');
    const title = el('b', '');
    title.textContent = session.title;
    const meta = el('span', '');
    meta.textContent = session.shares.length
      ? session.shares.map((share) => share.label).join(' · ')
      : 'nothing this machine could measure';
    name.append(title, meta);
    const cpu = session.shares.reduce((sum, share) => sum + share.cpuPercent, 0);
    const mem = session.shares.reduce((sum, share) => sum + share.memBytes, 0);
    const cpuCell = el('span', 'num');
    cpuCell.textContent = session.shares.length ? `${Math.round(cpu)}%` : '—';
    const memCell = el('span', 'num');
    memCell.textContent = session.shares.length ? sized(mem) : '—';
    const devCell = el('span', 'num');
    devCell.textContent = session.devServers ? String(session.devServers) : '—';
    row.append(name, cpuCell, memCell, devCell);
    return row;
  }

  // ── drawing ──────────────────────────────────────────────────────────────
  /** Says it took beside the heading, after drawing what it now is. */
  function took(part: { saved(said?: string): void }, said?: string): void {
    draw();
    part.saved(said);
  }

  /** Whether someone is writing in it, in which case it is left alone. */
  const busy = (part: { root: HTMLElement }): boolean => part.root.contains(document.activeElement);

  function draw(): void {
    drawRail();
    drawVersion();
    if (page === 'general') {
      drawStarts();
      drawNotify();
    } else if (page === 'checkouts') {
      if (!busy(branches)) drawBranches();
      if (!busy(landing)) drawLanding();
    } else if (page === 'terminal') {
      if (!busy(shellLook)) drawShellLook();
      if (!busy(shellIs)) drawShellIs();
    } else if (page === 'keys') {
      drawKeys();
    } else if (page === 'agents') {
      drawAgents();
    } else if (page === 'jira') {
      if (!busy(jiraAdd) && !busy(jiraRecipe)) void drawJira();
    } else if (page === 'disk') {
      drawWorktrees();
    } else {
      drawSpend();
      drawFive();
      drawShares();
    }
  }

  document.body.appendChild(back);
  back.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
  panel.animate(
    [
      { opacity: 0, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)' }
  );

  draw();
  showPage();
  panel.tabIndex = -1;
  panel.focus({ preventScroll: true });

  let open = true;
  function close(): void {
    if (!open) return;
    open = false;
    stopArming();
    window.clearTimeout(clearingTimer);
    window.clearTimeout(upToDateTimer);
    back.remove();
    does.closed();
  }

  return {
    update(next) {
      now = next;
      draw();
    },
    escaped() {
      if (clearing || clearingAll) {
        armClear(null);
        return;
      }
      const active = document.activeElement;
      if (active instanceof HTMLInputElement && panel.contains(active)) {
        active.blur();
        return;
      }
      close();
    },
    holds: (event) => open && (panel.contains(event.target as Node) || event.target === back),
    close,
  };
}

/** One of this machine's figures as a big number over a strip of cells. */
function dial(
  label: string,
  value: string,
  unit: string,
  full: number,
  tone: string,
  warns: boolean
): HTMLElement {
  const card = el('div', 'st-dial');
  const name = el('span', 'g-pix');
  name.textContent = label;
  const big = el('div', 'st-big');
  big.textContent = value;
  const small = el('small', '');
  small.textContent = unit;
  big.appendChild(small);
  const part = Math.min(1, Math.max(0, full));
  const cells = el('div', `st-cells${warns && part > 0.9 ? ' sore' : tone ? ` ${tone}` : ''}`);
  const lit = Math.round(part * 14);
  for (let i = 0; i < 14; i += 1) cells.appendChild(el('i', i < lit ? 'f' : ''));
  card.append(name, big, cells);
  return card;
}

function gbOf(bytes: number): string {
  return (bytes / (1024 * 1024 * 1024)).toFixed(1);
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string
): HTMLElementTagNameMap[K] {
  const made = document.createElement(tag);
  made.className = className;
  return made;
}

function button(said: string, className: string, does: () => void): HTMLButtonElement {
  const made = el('button', className);
  made.type = 'button';
  made.textContent = said;
  made.addEventListener('click', does);
  return made;
}

/** Whether a second press keeps the branch — the same question `clear`
 *  answers when it actually runs, asked first so the line can say it. */
export function keepsBranch(one: Pick<WorktreeRow, 'unsent'>): boolean {
  return one.unsent === null || one.unsent > 0;
}

/** What a second press would actually cost, said before it happens — the
 *  same two facts a session's own takedown names before it goes. */
function costOf(one: WorktreeRow): string {
  const size = one.bytes === null ? 'an unmeasured amount' : sized(one.bytes);
  const losing = one.uncommitted
    ? `${counted(one.uncommitted, 'file')} in there nobody has committed`
    : '';
  if (keepsBranch(one)) {
    const branch =
      one.unsent === null
        ? 'nowhere else has ever seen it'
        : `it has ${counted(one.unsent, 'commit')} nowhere else has`;
    const also = losing ? `, loses ${losing},` : '';
    return `press again — frees ${size}${also} and keeps the branch — ${branch}`;
  }
  const also = losing ? `, and loses ${losing}` : '';
  return `press again — frees ${size}${also}, and the branch that is already upstream`;
}

/** A chord as one cap per key: ⇧⌘K is shift, command and K. */
function capsOf(label: string): string[] {
  return label.split('');
}

/** How much room something takes, in plain words. */
function sized(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}kb`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}mb`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}gb`;
}
