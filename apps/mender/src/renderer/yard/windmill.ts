/**
 * The windmill: the app's own settings, an island of their own.
 *
 * Not a project's — nothing here is about any one checkout. There is no
 * windmill sprite in the kit yet, so this is reached the village's other
 * way: a chord (⌘,) and a line in the finder, same as any other doing. It
 * opens the same kind of window a project's own settings already use, over
 * everything, closing the same three ways.
 *
 * Small on purpose, and meant to grow the way the project window did: one
 * real, working thing today — who a fresh session starts with — rather than
 * a page of switches that do nothing yet.
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
import { counted } from '../board/card';
import { chordLabel, chordOf, rebindableDoings } from '../board/finder';

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
  closed(): void;
}

export interface Windmill {
  update(state: WindmillState): void;
  escaped(): void;
  holds(event: KeyboardEvent): boolean;
  close(): void;
}

export function openWindmill(state: WindmillState, does: WindmillDoings): Windmill {
  let now = state;

  const back = el('div', 'settings-back');
  const panel = el('div', 'settings windmill');
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

  const head = el('div', 'settings-head');
  const who = el('div', 'settings-who');
  const heading = el('div', 'settings-name founding-heading');
  heading.textContent = 'The windmill';
  who.appendChild(heading);
  const shut = button('×', 'settings-close', () => close());
  shut.setAttribute('aria-label', 'Close');
  head.append(who, shut);

  const body = el('div', 'settings-body');
  const general = section('General');
  const checkouts = section('Checkouts');
  const terminal = section('Terminal');
  const notifications = section('Notifications');
  const keys = section('Keys');
  const agentsSection = section('Agents');
  const worktrees = section('What is on disk');
  const machine = section('This machine');
  body.append(
    general.root,
    checkouts.root,
    terminal.root,
    notifications.root,
    keys.root,
    agentsSection.root,
    worktrees.root,
    machine.root
  );
  panel.append(head, body);

  /** The worktree armed for a second press to clear it, if any. */
  let clearing: string | null = null;
  /** Clearing every stale worktree at once, armed for a second press. */
  let clearingAll = false;

  document.body.appendChild(back);
  back.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
  panel.animate(
    [
      { opacity: 0, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)' }
  );

  function drawGeneral(): void {
    const hint = el('p', 'settings-hint');
    hint.textContent = 'Who a fresh session starts with, until you say otherwise.';
    if (!now.hands) {
      const reading = el('p', 'settings-hint');
      reading.textContent = 'Reading it…';
      general.fill([hint, reading]);
      return;
    }
    const list = el('div', 'settings-grid');
    for (const hand of now.hands) {
      const one = el('div', 'windmill-hand');
      one.tabIndex = 0;
      one.setAttribute('role', 'button');
      const picked = hand.id === now.hand;
      one.setAttribute('aria-pressed', String(picked));
      if (picked) one.classList.add('picked');
      if (!hand.here) one.classList.add('away');
      one.textContent = hand.name;
      one.title = hand.here ? hand.name : `${hand.name} — not installed`;
      const pick = (): void => {
        if (picked) return;
        void does.choose(hand.id).then(() => draw());
      };
      one.addEventListener('click', pick);
      one.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          pick();
        }
      });
      list.appendChild(one);
    }
    general.fill([hint, list]);
  }

  function drawCheckouts(): void {
    if (!now.checkout) {
      checkouts.fill([hintLine('Reading it…')]);
      return;
    }
    const held = now.checkout;
    const rows: HTMLElement[] = [];

    const prefixLine = el('div', 'windmill-agent-line');
    const prefixLabel = el('span', 'settings-hint');
    prefixLabel.textContent = 'branch prefix — ';
    const prefixInput = document.createElement('input');
    prefixInput.type = 'text';
    prefixInput.className = 'windmill-agent-input';
    prefixInput.placeholder = 'mender';
    prefixInput.value = held.branchPrefix;
    prefixInput.addEventListener('blur', () => {
      void does.setBranchPrefix(prefixInput.value).then(() => draw());
    });
    prefixInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        prefixInput.blur();
      }
    });
    prefixLine.append(prefixLabel, prefixInput);
    rows.push(prefixLine);

    const suffixRow = el('div', 'windmill-hand');
    suffixRow.tabIndex = 0;
    suffixRow.setAttribute('role', 'button');
    suffixRow.setAttribute('aria-pressed', String(held.randomSuffix));
    if (held.randomSuffix) suffixRow.classList.add('picked');
    suffixRow.textContent = held.randomSuffix
      ? 'a random tail on every branch — on'
      : 'a random tail on every branch — off';
    const toggleSuffix = (): void => {
      void does.setRandomSuffix(!held.randomSuffix).then(() => draw());
    };
    suffixRow.addEventListener('click', toggleSuffix);
    suffixRow.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleSuffix();
      }
    });
    rows.push(suffixRow);

    const projectsLine = el('div', 'windmill-agent-line');
    const projectsLabel = el('span', 'settings-hint');
    projectsLabel.textContent = 'new projects land in — ';
    const projectsInput = document.createElement('input');
    projectsInput.type = 'text';
    projectsInput.className = 'windmill-agent-input';
    projectsInput.placeholder = '~/mender/projects';
    projectsInput.value = held.projectsDir;
    projectsInput.addEventListener('blur', () => {
      void does.setProjectsDir(projectsInput.value).then(() => draw());
    });
    projectsInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        projectsInput.blur();
      }
    });
    projectsLine.append(projectsLabel, projectsInput);
    rows.push(projectsLine);

    const worktreeLine = el('div', 'windmill-agent-line');
    const worktreeLabel = el('span', 'settings-hint');
    worktreeLabel.textContent = 'new worktrees land in — ';
    const worktreeInput = document.createElement('input');
    worktreeInput.type = 'text';
    worktreeInput.className = 'windmill-agent-input';
    worktreeInput.placeholder = '~/mender/worktrees';
    worktreeInput.value = held.worktreeDir;
    worktreeInput.addEventListener('blur', () => {
      void does.setWorktreeDir(worktreeInput.value).then(() => draw());
    });
    worktreeInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        worktreeInput.blur();
      }
    });
    worktreeLine.append(worktreeLabel, worktreeInput);
    rows.push(worktreeLine);

    checkouts.fill(rows);
  }

  function drawTerminal(): void {
    if (!now.terminal) {
      terminal.fill([hintLine('Reading it…')]);
      return;
    }
    const held = now.terminal;
    const rows: HTMLElement[] = [];

    const fontLine = el('div', 'windmill-agent-line');
    const fontLabel = el('span', 'settings-hint');
    fontLabel.textContent = 'font size — ';
    const fontInput = document.createElement('input');
    fontInput.type = 'text';
    fontInput.inputMode = 'numeric';
    fontInput.className = 'windmill-agent-input';
    fontInput.placeholder = '13';
    fontInput.value = held.fontSize ? String(held.fontSize) : '';
    const keepFont = (): void => {
      const parsed = Number.parseInt(fontInput.value, 10);
      void does
        .setTerminalFontSize(Number.isFinite(parsed) && parsed > 0 ? parsed : 0)
        .then(() => draw());
    };
    fontInput.addEventListener('blur', keepFont);
    fontInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        fontInput.blur();
      }
    });
    fontLine.append(fontLabel, fontInput);
    rows.push(fontLine);

    const shellLine = el('div', 'windmill-agent-line');
    const shellLabel = el('span', 'settings-hint');
    shellLabel.textContent = 'default shell — ';
    const shellInput = document.createElement('input');
    shellInput.type = 'text';
    shellInput.className = 'windmill-agent-input';
    shellInput.placeholder = '/bin/zsh';
    shellInput.spellcheck = false;
    shellInput.value = held.defaultShell;
    shellInput.addEventListener('blur', () => {
      void does.setDefaultShell(shellInput.value).then(() => draw());
    });
    shellInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        shellInput.blur();
      }
    });
    shellLine.append(shellLabel, shellInput);
    rows.push(shellLine);

    terminal.fill(rows);
  }

  function drawNotifications(): void {
    if (!now.notifications) {
      notifications.fill([hintLine('Reading it…')]);
      return;
    }
    const held = now.notifications;
    const row = el('div', 'windmill-hand');
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.setAttribute('aria-pressed', String(held.enabled));
    if (held.enabled) row.classList.add('picked');
    row.textContent = held.enabled
      ? 'a villager who wants you, while you are looking elsewhere — on'
      : 'a villager who wants you, while you are looking elsewhere — off';
    const toggle = (): void => {
      void does.setNotificationsEnabled(!held.enabled).then(() => draw());
    };
    row.addEventListener('click', toggle);
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggle();
      }
    });
    notifications.fill([row]);
  }

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
  }

  function arm(pick: string): void {
    stopArming();
    arming = pick;
    armed = null;
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
        armed = `${chordLabel(letter)} is already ${conflict.name}'s.`;
        drawKeys();
        return;
      }
      arming = null;
      void does.rebind(pick, letter).then(() => draw());
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
    const rows: HTMLElement[] = [];
    for (const doing of rebindableDoings()) {
      const chord = chordOf(doing.pick, bound) ?? '';
      const row = el('div', 'windmill-agent-line');
      const label = el('span', 'settings-hint');
      label.textContent = `${doing.name} — `;
      const said =
        arming === doing.pick ? (armed ?? 'press a key…') : chord ? chordLabel(chord) : 'unset';
      const key = button(said, 'settings-link', () => arm(doing.pick));
      row.append(label, key);
      if (bound[doing.pick] !== undefined) {
        const reset = button(
          'default',
          'settings-link',
          () => void does.unbind(doing.pick).then(() => draw())
        );
        row.append(reset);
      }
      rows.push(row);
    }
    keys.fill(rows);
  }

  function drawAgents(): void {
    if (!now.hands) {
      agentsSection.fill([hintLine('reading it…')]);
      return;
    }
    const here = now.hands.filter((hand) => hand.here);
    if (!here.length) {
      agentsSection.fill([hintLine('nothing on this machine yet.')]);
      return;
    }
    const rows: HTMLElement[] = [];
    for (const hand of here) {
      rows.push(drawAgentRow(hand));
    }
    agentsSection.fill(rows);
  }

  function drawAgentRow(hand: Hand): HTMLElement {
    const row = el('div', 'windmill-agent');
    const title = el('div', 'windmill-agent-name');
    title.textContent = hand.name;
    row.append(title);

    const config = now.providers[hand.id];
    const argsLine = el('div', 'windmill-agent-line');
    const argsLabel = el('span', 'settings-hint');
    argsLabel.textContent = 'extra arguments — ';
    const argsInput = document.createElement('input');
    argsInput.type = 'text';
    argsInput.className = 'windmill-agent-input';
    argsInput.placeholder = 'none';
    argsInput.value = config ? config.extraArgs.join(' ') : '';
    argsInput.disabled = !config;
    const commit = (): void => {
      void does.setExtraArgs(hand.id, argsInput.value).then(() => draw());
    };
    argsInput.addEventListener('blur', commit);
    argsInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        argsInput.blur();
      }
    });
    argsLine.append(argsLabel, argsInput);
    row.append(argsLine);

    const envHeading = el('div', 'settings-hint');
    envHeading.textContent = 'environment';
    row.append(envHeading);
    if (config) {
      for (const [key, value] of Object.entries(config.env)) {
        const line = el('div', 'windmill-agent-line');
        const text = el('span', 'windmill-agent-env');
        text.textContent = `${key}=${value}`;
        const remove = button('remove', 'windmill-agent-remove', () => {
          void does.removeEnvVar(hand.id, key).then(() => draw());
        });
        line.append(text, remove);
        row.append(line);
      }
    }
    const addLine = el('div', 'windmill-agent-line');
    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.placeholder = 'KEY';
    keyInput.className = 'windmill-agent-input windmill-agent-input-key';
    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.placeholder = 'value';
    valueInput.className = 'windmill-agent-input';
    const add = button('add', 'windmill-agent-add', () => {
      const key = keyInput.value.trim();
      if (!key) return;
      void does.setEnvVar(hand.id, key, valueInput.value).then(() => draw());
    });
    addLine.append(keyInput, valueInput, add);
    row.append(addLine);

    const install = now.installs[hand.id];
    if (install && install.candidates.length > 1) {
      const installHeading = el('div', 'settings-hint');
      installHeading.textContent = 'which install';
      row.append(installHeading);
      for (const candidate of install.candidates) {
        const picked =
          install.selection?.kind === 'path'
            ? install.selection.path === candidate.path
            : install.resolved?.path === candidate.path && !install.selection;
        const line = button(
          picked ? `● ${candidate.path}` : `· ${candidate.path}`,
          'windmill-agent-install',
          () => {
            if (picked) return;
            void does.selectInstall(hand.id, candidate.path).then(() => draw());
          }
        );
        row.append(line);
      }
    }
    return row;
  }

  function drawWorktrees(): void {
    if (!now.worktrees) {
      worktrees.fill([hintLine('reading it…')]);
      return;
    }
    if (!now.worktrees.length) {
      worktrees.fill([
        hintLine('every worktree Mender ever cut is either in use or already gone.'),
      ]);
      return;
    }
    const rows: HTMLElement[] = [];
    const stale = now.worktrees.filter((one) => one.stale);
    if (stale.length >= 2) {
      const said = clearingAll
        ? `click again and all ${stale.length} are gone`
        : `clear every stale one (${stale.length})`;
      const bulk = button(said, 'windmill-worktree-clear-all', () => {
        if (!clearingAll) {
          clearingAll = true;
          drawWorktrees();
          return;
        }
        clearingAll = false;
        void (async () => {
          for (const one of stale) await does.clear(one);
          drawWorktrees();
        })();
      });
      rows.push(bulk);
    }
    for (const one of now.worktrees) {
      const row = el('div', 'windmill-worktree');
      const head = el('div', 'windmill-worktree-head');
      const name = el('span', 'windmill-worktree-branch');
      name.textContent = one.branch ?? one.path;
      const size = el('span', 'windmill-worktree-size');
      size.textContent = one.bytes === null ? 'measuring…' : sized(one.bytes);
      head.append(name, size);
      if (one.stale) {
        const stale = el('span', 'windmill-worktree-stale');
        stale.textContent = 'stale';
        head.append(stale);
      }
      row.append(head);
      const path = el('div', 'windmill-worktree-path');
      path.textContent = one.path;
      row.append(path);
      const clear = button(
        clearing === one.id ? costOf(one) : 'clear this one',
        'windmill-worktree-clear',
        () => {
          if (clearing === one.id) {
            clearing = null;
            void does.clear(one).then(() => drawWorktrees());
            return;
          }
          clearing = one.id;
          drawWorktrees();
        }
      );
      row.append(clear);
      rows.push(row);
    }
    worktrees.fill(rows);
  }

  function drawMachine(): void {
    if (!now.machine) {
      machine.fill([hintLine('reading it…')]);
      return;
    }
    const one = now.machine;
    const lines = [
      `cpu — ${Math.round(one.cpuPercent)}%`,
      `memory — ${sized(one.memUsedBytes)} of ${sized(one.memTotalBytes)}`,
      `disk — ${sized(one.diskUsedBytes)} of ${sized(one.diskTotalBytes)}`,
    ];
    const rows: HTMLElement[] = lines.map((text) => hintLine(text));
    if (now.sessions?.length) {
      const heading = el('p', 'settings-hint');
      heading.textContent = 'each session’s own share:';
      rows.push(heading);
      for (const session of now.sessions) {
        rows.push(drawSessionUsage(session));
      }
    }
    machine.fill(rows);
  }

  function drawSessionUsage(session: SessionUsage): HTMLElement {
    const row = el('div', 'windmill-session-usage');
    const title = el('div', 'windmill-agent-name');
    title.textContent = session.title;
    row.append(title);
    if (!session.shares.length && !session.devServers) {
      const nothing = el('p', 'settings-hint');
      nothing.textContent = 'nothing this machine could measure.';
      row.append(nothing);
      return row;
    }
    for (const share of session.shares) {
      const line = hintLine(
        `${share.label} — cpu ${Math.round(share.cpuPercent)}%, memory ${sized(share.memBytes)}`
      );
      row.append(line);
    }
    if (session.devServers) {
      row.append(hintLine(`${counted(session.devServers, 'dev server')} listening`));
    }
    return row;
  }

  function draw(): void {
    drawGeneral();
    drawCheckouts();
    drawTerminal();
    drawNotifications();
    drawKeys();
    drawAgents();
    drawWorktrees();
    drawMachine();
  }

  draw();
  shut.focus({ preventScroll: true });
  /* Always opens on General, at the top of the scroll, never wherever a
     stray reflow happens to land it — landing mid-page here once looked
     enough like an empty window that it read as no settings at all. */
  body.scrollTop = 0;

  let open = true;
  function close(): void {
    if (!open) return;
    open = false;
    stopArming();
    back.remove();
    does.closed();
  }

  return {
    update(next) {
      now = next;
      draw();
    },
    escaped: () => close(),
    holds: (event) => open && (panel.contains(event.target as Node) || event.target === back),
    close,
  };
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

function section(title: string): { root: HTMLElement; fill(children: HTMLElement[]): void } {
  const root = el('section', 'settings-section');
  const label = el('h3', 'settings-label');
  label.textContent = title;
  const inner = el('div', 'settings-inner');
  root.append(label, inner);
  return { root, fill: (children) => inner.replaceChildren(...children) };
}

function hintLine(text: string): HTMLElement {
  const made = el('p', 'settings-hint');
  made.textContent = text;
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
