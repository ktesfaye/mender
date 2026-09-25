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
import type { Hand, ProviderConfig } from '@shared/app-settings';
import { counted } from '../board/card';

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
  /** What this machine hands each agent's own CLI beyond its ordinary
      command, keyed by agent id. Filled in as each one is asked about. */
  providers: Record<string, ProviderConfig>;
  /** Which install of each agent's CLI this machine actually runs, and what
      else it found, keyed by agent id. */
  installs: Record<string, HostDependencyView>;
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
  const agentsSection = section('Agents');
  const worktrees = section('What is on disk');
  const machine = section('This machine');
  body.append(general.root, agentsSection.root, worktrees.root, machine.root);
  panel.append(head, body);

  /** The worktree armed for a second press to clear it, if any. */
  let clearing: string | null = null;

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
    machine.fill(lines.map((text) => hintLine(text)));
  }

  function draw(): void {
    drawGeneral();
    drawAgents();
    drawWorktrees();
    drawMachine();
  }

  draw();
  shut.focus({ preventScroll: true });

  let open = true;
  function close(): void {
    if (!open) return;
    open = false;
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
