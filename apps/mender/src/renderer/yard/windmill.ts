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

import type { Hand } from '@shared/app-settings';

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
  /** How far its branch has run ahead of whatever it follows, for the cost
   *  line a removal shows before it happens. */
  ahead: number | null;
}

export interface WindmillState {
  hand: string | null;
  hands: Hand[] | null;
  /** null while the registry's first answer hasn't arrived yet. */
  worktrees: WorktreeRow[] | null;
}

export interface WindmillDoings {
  choose(id: string): Promise<void>;
  /** Deactivate, remove the worktree and its branch, and unregister it. */
  clear(id: string): Promise<void>;
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
  const worktrees = section('What is on disk');
  body.append(general.root, worktrees.root);
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
            void does.clear(one.id).then(() => drawWorktrees());
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

  function draw(): void {
    drawGeneral();
    drawWorktrees();
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

/** What a second press would actually cost, said before it happens. */
function costOf(one: WorktreeRow): string {
  const size = one.bytes === null ? 'an unmeasured amount' : sized(one.bytes);
  const branch =
    one.ahead === null || one.ahead === 0
      ? 'its branch is already upstream'
      : `its branch has ${one.ahead === 1 ? 'one commit' : `${one.ahead} commits`} nowhere else has`;
  return `press again — frees ${size}, and ${branch}`;
}

/** How much room something takes, in plain words. */
function sized(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}kb`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}mb`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}gb`;
}
