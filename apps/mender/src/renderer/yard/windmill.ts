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
import type { UpdateState } from '@shared/updates';
import { counted } from '../board/card';
import { chordLabel, chordOf, rebindableDoings } from '../board/finder';
import { chip, formRow, hintLine, input, intro, pageOf, section } from './settings';

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
  closed(): void;
}

export interface Windmill {
  update(state: WindmillState): void;
  escaped(): void;
  holds(event: KeyboardEvent): boolean;
  close(): void;
}

/** The pages down the window's left side, in the order they hang there. */
type Page = 'general' | 'checkouts' | 'terminal' | 'keys' | 'agents' | 'disk' | 'machine';

const PAGES: { page: Page; said: string }[] = [
  { page: 'general', said: 'General' },
  { page: 'checkouts', said: 'Checkouts' },
  { page: 'terminal', said: 'Terminal' },
  { page: 'keys', said: 'Keys' },
  { page: 'agents', said: 'Agents' },
  { page: 'disk', said: 'On disk' },
  { page: 'machine', said: 'This machine' },
];

/** Whichever page was open last, so coming back to the windmill lands there. */
let lastPage: Page = 'general';

/** Whichever agent the Agents page was last showing. */
let lastAgent: string | null = null;

/** How long an armed second press stands before it withdraws. */
const STANDS_MS = 4000;

export function openWindmill(state: WindmillState, does: WindmillDoings): Windmill {
  let now = state;
  let page: Page = lastPage;

  const back = el('div', 'settings-back');
  const panel = el('div', 'settings paged windmill');
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

  // ── the head ─────────────────────────────────────────────────────────────
  const head = el('div', 'settings-head');
  const who = el('div', 'settings-who');
  const heading = el('div', 'settings-name windmill-title');
  heading.textContent = 'The windmill';
  const where = el('div', 'settings-where');
  where.textContent = 'How Mender itself behaves on this machine, in every project.';
  who.append(heading, where);
  const shut = button('×', 'settings-close', () => close());
  shut.setAttribute('aria-label', 'Close');
  head.append(who, shut);

  // ── the pages ────────────────────────────────────────────────────────────
  const middle = el('div', 'settings-middle');
  const rail = el('nav', 'settings-rail');
  const body = el('div', 'settings-body');
  middle.append(rail, body);
  panel.append(head, middle);

  const starts = section('A fresh session starts with');
  const notify = section('Notifications');
  const branches = section('Branches');
  const landing = section('Where new things land');
  const shellLook = section('How a shell looks');
  const shellIs = section('What a shell starts as');
  const keys = section('Chords');
  const agentPick = section('Agent');
  const agentArgs = section('Extra arguments');
  const agentEnv = section('Environment');
  const agentInstall = section('Which install');
  const worktrees = section('Worktrees Mender has cut');
  const spend = section('Right now');
  const five = section('The five hours');
  const shares = section('Each session’s share');

  const pageRoots: Record<Page, HTMLElement> = {
    general: pageOf([starts.root, notify.root]),
    checkouts: pageOf([intro(CHECKOUTS), branches.root, landing.root]),
    terminal: pageOf([intro(TERMINAL), shellLook.root, shellIs.root]),
    keys: pageOf([intro(KEYS), keys.root]),
    agents: pageOf([
      intro(AGENTS),
      agentPick.root,
      agentArgs.root,
      agentEnv.root,
      agentInstall.root,
    ]),
    disk: pageOf([intro(DISK), worktrees.root]),
    machine: pageOf([spend.root, five.root, shares.root]),
  };
  body.append(...Object.values(pageRoots));

  const tabs = new Map<Page, { root: HTMLButtonElement; sub: HTMLElement }>();
  for (const one of PAGES) {
    const tab = el('button', 'settings-tab');
    tab.type = 'button';
    const said = el('span', 'settings-tab-name');
    said.textContent = one.said;
    const sub = el('span', 'settings-tab-sub');
    tab.append(said, sub);
    tab.addEventListener('click', () => go(one.page));
    rail.appendChild(tab);
    tabs.set(one.page, { root: tab, sub });
  }
  // Which Mender this is, and the way to a newer one, at the foot of the rail.
  const version = el('div', 'windmill-version');
  rail.appendChild(version);
  let upToDateTimer = 0;
  let sayUpToDate = false;

  function drawVersion(): void {
    const up = now.update;
    const name = el('span', 'windmill-version-name');
    name.textContent = up ? `Mender ${up.version}` : 'Mender';
    const parts: HTMLElement[] = [name];
    const quiet = (text: string, sore = false): void => {
      const line = el('span', sore ? 'windmill-version-said sore' : 'windmill-version-said');
      line.textContent = text;
      parts.push(line);
    };
    const check = (said: string): void => {
      parts.push(
        button(said, 'settings-link windmill-version-act', () => {
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
        button(`restart into ${up.latest}`, 'settings-link windmill-version-act', () => {
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
    const choices = el('div', 'settings-choices');
    for (const hand of here) {
      choices.appendChild(
        chip(hand.name, hand.id === now.hand, () => {
          void does.choose(hand.id).then(() => took(starts));
        })
      );
    }
    const children: HTMLElement[] = [
      hintLine('Whoever a new session starts with, until you say otherwise on the board.'),
    ];
    if (here.length) children.push(choices);
    else children.push(hintLine('No agent is installed on this machine yet.'));
    if (away) {
      children.push(
        hintLine(
          `${counted(away, 'other agent')} could work here once installed. A session’s /agent card brings them in.`
        )
      );
    }
    starts.fill(children);
  }

  function drawNotify(): void {
    const held = now.notifications;
    if (!held) {
      notify.fill([hintLine('Reading it…')]);
      return;
    }
    const choices = el('div', 'settings-choices');
    const set = (on: boolean) => () =>
      void does.setNotificationsEnabled(on).then(() => took(notify));
    choices.append(
      chip('Tell me', held.enabled, set(true)),
      chip('Stay quiet', !held.enabled, set(false))
    );
    notify.fill([
      hintLine(
        'When somebody asks you something, finishes or breaks while Mender is not the window in front.'
      ),
      choices,
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
    const tail = el('div', 'settings-choices');
    const set = (on: boolean) => () => void does.setRandomSuffix(on).then(() => took(branches));
    tail.append(
      chip('Just the name', !held.randomSuffix, set(false)),
      chip('A short random tail', held.randomSuffix, set(true))
    );
    const example = `${held.branchPrefix || 'mender'}/fix-the-login${held.randomSuffix ? '-k3q9' : ''}`;
    branches.fill([
      formRow('Prefix', prefix),
      formRow('After the name', tail),
      hintLine(`A session called “fix the login” gets ${example}.`),
    ]);
  }

  function drawLanding(): void {
    const held = now.checkout;
    if (!held) {
      landing.fill([hintLine('Reading it…')]);
      return;
    }
    const projects = input(held.projectsDir, '~/mender/projects', async (value) => {
      await does.setProjectsDir(value.trim());
      took(landing);
    });
    const trees = input(held.worktreeDir, '~/mender/worktrees', async (value) => {
      await does.setWorktreeDir(value.trim());
      took(landing);
    });
    landing.fill([
      formRow('New projects', projects),
      formRow('Own copies', trees),
      hintLine('A cloned or freshly started project, and a session’s own copy, go here.'),
    ]);
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
    size.classList.add('settings-small-field');
    const px = el('span', 'settings-hint-inline');
    px.textContent = 'pixels';
    const line = el('div', 'settings-when-detail');
    line.append(size, px);
    shellLook.fill([formRow('Font size', line)]);
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
      formRow('Default shell', shell),
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
    const list = el('div', 'settings-rows');
    for (const doing of rebindableDoings()) {
      const chord = chordOf(doing.pick, bound) ?? '';
      const row = el('div', 'settings-row settings-row-still');
      const name = el('span', 'settings-row-main');
      const title = el('span', 'settings-row-title');
      title.textContent = doing.name;
      name.append(title);
      row.append(name);
      if (bound[doing.pick] !== undefined && arming !== doing.pick) {
        row.append(
          button('default', 'settings-link windmill-key-reset', () => {
            void does.unbind(doing.pick).then(() => {
              drawKeys();
              keys.saved();
            });
          })
        );
      }
      const waiting = arming === doing.pick;
      const said = waiting ? (armed ?? 'press a key…') : chord ? chordLabel(chord) : 'unset';
      const key = button(said, 'windmill-key', () => arm(doing.pick));
      if (waiting) key.classList.add(armed ? 'sore' : 'waiting');
      row.append(key);
      list.appendChild(row);
    }
    keys.fill([list]);
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
    const choices = el('div', 'settings-choices');
    for (const hand of here) {
      choices.appendChild(
        chip(hand.name, hand.id === picked?.id, () => {
          lastAgent = hand.id;
          drawAgents(true);
        })
      );
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
      hintLine(`Put after ${hand.name}’s own command every time it is started.`),
      field,
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
    const children: HTMLElement[] = [
      hintLine(`Set for ${hand.name} in every project, under whatever a project sets itself.`),
    ];
    const set = Object.entries(config.env);
    if (set.length) {
      const list = el('div', 'settings-rows');
      for (const [key, value] of set) {
        const row = el('div', 'settings-row settings-row-still');
        const main = el('span', 'settings-row-main windmill-env');
        main.textContent = `${key}=${value}`;
        main.title = `${key}=${value}`;
        const remove = button('remove', 'settings-link', () => {
          void does.removeEnvVar(hand.id, key).then(() => {
            drawAgentEnv(hand);
            agentEnv.saved('removed');
          });
        });
        row.append(main, remove);
        list.appendChild(row);
      }
      children.push(list);
    }
    const name = document.createElement('input');
    name.className = 'settings-identity-field windmill-env-key';
    name.placeholder = 'NAME';
    name.spellcheck = false;
    name.value = envKey;
    name.addEventListener('input', () => (envKey = name.value));
    const value = document.createElement('input');
    value.className = 'settings-identity-field';
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
    const line = el('div', 'settings-identity-row windmill-env-add');
    line.append(name, value, button('Add', 'settings-button', add));
    children.push(line);
    agentEnv.fill(children);
  }

  function drawAgentInstall(hand: Hand): void {
    const install = now.installs[hand.id];
    if (!install || install.candidates.length < 2) {
      agentInstall.root.style.display = 'none';
      return;
    }
    agentInstall.root.style.display = '';
    const list = el('div', 'settings-rows');
    for (const candidate of install.candidates) {
      const picked =
        install.selection?.kind === 'path'
          ? install.selection.path === candidate.path
          : install.resolved?.path === candidate.path && !install.selection;
      const row = el('button', 'settings-row windmill-install');
      row.type = 'button';
      const main = el('span', 'settings-row-main');
      main.textContent = candidate.path;
      row.append(main);
      if (picked) {
        row.classList.add('picked');
        const side = el('span', 'settings-row-side');
        side.textContent = 'in use';
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
    agentInstall.fill([
      hintLine(`This machine has more than one ${hand.name}. Pick which one runs.`),
      list,
    ]);
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
    const list = el('div', 'settings-rows');
    for (const one of now.worktrees) {
      const row = el('div', 'settings-row settings-row-still windmill-tree');
      const main = el('span', 'settings-row-main');
      const title = el('span', 'settings-row-title');
      title.textContent = one.branch ?? one.path.split('/').at(-1) ?? one.path;
      const meta = el('span', 'settings-row-meta');
      meta.textContent = one.path.replace(/^\/Users\/[^/]+/, '~');
      meta.title = one.path;
      main.append(title, meta);
      if (clearing === one.id) {
        const cost = el('span', 'windmill-tree-cost');
        cost.textContent = costOf(one);
        main.append(cost);
      }
      const side = el('span', 'windmill-tree-side');
      const size = el('span', 'settings-row-side');
      size.textContent = one.bytes === null ? 'measuring' : sized(one.bytes);
      side.append(size);
      if (one.stale) {
        const tag = el('span', 'windmill-tree-stale');
        tag.textContent = 'stale';
        side.append(tag);
      }
      const armedHere = clearing === one.id;
      const clear = button(armedHere ? 'press again' : 'clear', 'settings-link', () => {
        if (!armedHere) {
          armClear(one.id);
          return;
        }
        armClear(null);
        void does.clear(one).then(() => drawWorktrees());
      });
      if (armedHere) clear.classList.add('settings-link-sore');
      side.append(clear);
      row.append(main, side);
      list.appendChild(row);
    }
    children.push(list);
    if (stale.length >= 2) {
      const all = button(
        clearingAll
          ? `Press again and all ${stale.length} stale ones go`
          : `Clear every stale one (${stale.length})`,
        'settings-button',
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
      if (clearingAll) all.classList.add('settings-remove', 'armed');
      const actions = el('div', 'settings-actions');
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
    const meters = el('div', 'windmill-meters');
    meters.append(
      meter('CPU', one.cpuPercent / 100, `${Math.round(one.cpuPercent)}%`),
      meter(
        'Memory',
        one.memTotalBytes ? one.memUsedBytes / one.memTotalBytes : 0,
        `${sized(one.memUsedBytes)} of ${sized(one.memTotalBytes)}`,
        false
      ),
      meter(
        'Disk',
        one.diskTotalBytes ? one.diskUsedBytes / one.diskTotalBytes : 0,
        `${sized(one.diskUsedBytes)} of ${sized(one.diskTotalBytes)}`
      )
    );
    spend.fill([meters]);
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
    const list = el('div', 'settings-rows');
    for (const session of now.sessions) list.appendChild(drawSessionUsage(session));
    shares.fill([list]);
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
    out.push(drawWindow(window, at, FIVE_HOURS_MS, five.lately));
    const line = windowLine(five, at);
    if (line) {
      const said = hintLine(line.said.replace(/^five hours: /, ''));
      if (line.tone !== 'quiet') said.classList.add(`windmill-five-${line.tone}`);
      out.push(said);
    }
    if (five.lately !== null && (five.lately > 1.5 || five.lately < 0.5)) {
      out.push(
        hintLine(
          five.lately > 1.5
            ? `The last twenty minutes have run ${five.lately.toFixed(1)}× the window's own pace.`
            : 'The last twenty minutes have been quieter than the window as a whole.'
        )
      );
    }
    const week = five.reading?.sevenDay;
    if (week) {
      const weekly = drawWindow(week, at, SEVEN_DAYS_MS, null);
      weekly.classList.add('windmill-five-week');
      out.push(weekly);
      out.push(
        hintLine(
          `The week: ${Math.round(week.utilization * 100)}% used, resets ${clockOf(week.resetsAt, at)}.`
        )
      );
    }
    if (five.reading && at - five.reading.at > 10 * 60_000) {
      out.push(hintLine(`Last read ${spanOf(at - five.reading.at)} ago.`));
    }
    if (five.sessions.length) {
      out.push(hintLine('Who spent it, this window:'));
      const most = Math.max(...five.sessions.map((one) => one.share));
      const list = el('div', 'settings-rows');
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
    const strip = el('div', 'windmill-five-strip');
    const cells = 40;
    const start = window.resetsAt - span;
    const through = Math.min(1, Math.max(0, (at - start) / span));
    const { at: out } = runsOut(window, at, span, lately);
    const spent = Math.min(1, Math.max(0, window.utilization));
    const outAt = out === null ? null : Math.min(1, Math.max(0, (out - start) / span));
    for (let i = 0; i < cells; i += 1) {
      const cell = el('div', 'windmill-five-cell');
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
    const row = el('div', 'settings-row settings-row-still windmill-share');
    const main = el('span', 'settings-row-main');
    const title = el('span', 'settings-row-title');
    title.textContent = session.where ? `${session.title} · ${session.where}` : session.title;
    const bar = el('div', 'windmill-five-bar');
    const fill = el('div', 'windmill-five-fill');
    fill.style.width = `${Math.round((most > 0 ? session.share / most : 0) * 100)}%`;
    bar.append(fill);
    const meta = el('span', 'settings-row-meta');
    meta.textContent = [
      `${counted(session.calls, 'call')}`,
      `${tokensOf(session.context)} re-read each call`,
      ...(session.screenshots ? [`${counted(session.screenshots, 'picture')}`] : []),
      `last ${spanOf(at - session.lastAt)} ago`,
    ].join(' · ');
    main.append(title, bar, meta);
    if (session.context >= 150_000) {
      const heavy = el('span', 'settings-row-meta windmill-five-warn');
      heavy.textContent =
        'Heavy: every call re-reads the whole conversation, and this one is long.';
      main.append(heavy);
    }
    const side = el('span', 'settings-row-side');
    side.textContent = `${Math.round(session.share * 100)}%`;
    row.append(main, side);
    return row;
  }

  function drawSessionUsage(session: SessionUsage): HTMLElement {
    const row = el('div', 'settings-row settings-row-still');
    const main = el('span', 'settings-row-main');
    const title = el('span', 'settings-row-title');
    title.textContent = session.title;
    main.append(title);
    const parts = session.shares.map(
      (share) => `${share.label}: cpu ${Math.round(share.cpuPercent)}%, ${sized(share.memBytes)}`
    );
    if (session.devServers) parts.push(`${counted(session.devServers, 'dev server')} listening`);
    const meta = el('span', 'settings-row-meta');
    meta.textContent = parts.length ? parts.join(' · ') : 'nothing this machine could measure';
    main.append(meta);
    row.append(main);
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

const CHECKOUTS = 'How a session’s own copy is named and where new things are put.';

const TERMINAL = 'Every real shell the board opens next, in any project.';

const KEYS =
  'Every doing held with command. Press a chord, then press the key it should be instead.';

const AGENTS =
  'What this machine hands each agent’s own CLI beyond its ordinary command, in every project.';

const DISK =
  'Every own copy Mender has cut on this machine that no session is standing in. Stale means its branch is already upstream, or nothing points at it any more.';

/** One of this machine's figures as a bar, so how full it is reads at a look.
    Memory never warns: macOS keeps it nearly full with cache on purpose. */
function meter(label: string, full: number, said: string, warns = true): HTMLElement {
  const row = el('div', 'windmill-meter');
  const name = el('span', 'windmill-meter-name');
  name.textContent = label;
  const bar = el('div', 'windmill-meter-bar');
  const fill = el('div', 'windmill-meter-fill');
  const part = Math.min(1, Math.max(0, full));
  fill.style.width = `${Math.round(part * 100)}%`;
  if (warns && part > 0.9) fill.classList.add('sore');
  bar.append(fill);
  const value = el('span', 'windmill-meter-said');
  value.textContent = said;
  row.append(name, bar, value);
  return row;
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

/** How much room something takes, in plain words. */
function sized(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}kb`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}mb`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}gb`;
}
