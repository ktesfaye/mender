/**
 * Founding a project: what the campfire is for.
 *
 * A checkout can arrive three ways — one already on disk, one that only
 * exists somewhere else and has to be cloned, or one that does not exist yet
 * anywhere. The native folder picker has always covered the first. This is
 * the small board that offers the other two: one question, answered by
 * pressing a line or typing on one, over the island the way settings are,
 * because founding is not about any yard either.
 */

import { pressing } from './press';

export interface FoundingDoings {
  /** The plain, pre-existing folder picker. */
  folder(): void;
  /** Clone a URL. What happens after is said the same way founding a folder is. */
  clone(url: string): void;
  /** Make a fresh repository and clone it straight back down. */
  create(name: string, isPrivate: boolean): void;
  closed(): void;
}

export interface Founding {
  escaped(): void;
  holds(event: KeyboardEvent): boolean;
  close(): void;
}

export function openFounding(does: FoundingDoings): Founding {
  const back = el('div', 'settings-back');
  const panel = el('div', 'settings founding');
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
  const title = el('div', 'settings-who');
  const heading = el('div', 'settings-name founding-heading');
  heading.textContent = 'Found a project';
  title.appendChild(heading);
  const shut = button('×', 'settings-close', () => close());
  shut.setAttribute('aria-label', 'Close');
  head.append(title, shut);

  const body = el('div', 'settings-body founding-body');
  panel.append(head, body);

  document.body.appendChild(back);
  back.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
  panel.animate(
    [
      { opacity: 0, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)' }
  );

  /* What is asked: the three ways in, or one of the two questions a choice
     opened. Kept as a tag rather than three booleans so drawing it is one
     switch instead of a pile of ifs. */
  type Asking = { kind: 'which' } | { kind: 'clone' } | { kind: 'create'; private: boolean };
  let asking: Asking = { kind: 'which' };

  function drawWhich(): void {
    const list = el('div', 'founding-list');
    const folder = pressing('pick a folder', () => {
      does.folder();
      close();
    });
    const clone = pressing('clone a repository', () => {
      asking = { kind: 'clone' };
      draw();
    });
    const create = pressing('start a new one', () => {
      asking = { kind: 'create', private: true };
      draw();
    });
    list.append(line(folder), line(clone), line(create));
    body.replaceChildren(list);
  }

  function drawClone(): void {
    const hint = el('p', 'settings-hint');
    hint.textContent = 'Where is it?';
    const input = document.createElement('input');
    input.className = 'settings-identity-field founding-field';
    input.placeholder = 'git@github.com:owner/repo.git';
    input.spellcheck = false;
    const go = pressing('clone it', () => {
      does.clone(input.value);
      close();
    });
    const back2 = pressing('back', () => {
      asking = { kind: 'which' };
      draw();
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        go.click();
      }
    });
    const actions = el('div', 'founding-list');
    actions.append(line(go), line(back2));
    body.replaceChildren(hint, input, actions);
    input.focus();
  }

  function drawCreate(): void {
    if (asking.kind !== 'create') return;
    const state = asking;
    const hint = el('p', 'settings-hint');
    hint.textContent = 'What is it called?';
    const input = document.createElement('input');
    input.className = 'settings-identity-field founding-field';
    input.placeholder = 'owner/repo, or just a name';
    input.spellcheck = false;
    const visibility = pressing(state.private ? 'private' : 'public', () => {
      if (asking.kind === 'create') asking = { ...asking, private: !asking.private };
      draw();
    });
    const go = pressing('start it', () => {
      does.create(input.value, state.private);
      close();
    });
    const back2 = pressing('back', () => {
      asking = { kind: 'which' };
      draw();
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        go.click();
      }
    });
    const actions = el('div', 'founding-list');
    actions.append(line(visibility), line(go), line(back2));
    body.replaceChildren(hint, input, actions);
    input.focus();
  }

  function draw(): void {
    heading.textContent =
      asking.kind === 'which'
        ? 'Found a project'
        : asking.kind === 'clone'
          ? 'Clone a repository'
          : 'Start a new one';
    if (asking.kind === 'which') drawWhich();
    else if (asking.kind === 'clone') drawClone();
    else drawCreate();
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
    escaped() {
      if (asking.kind !== 'which') {
        asking = { kind: 'which' };
        draw();
        return;
      }
      close();
    },
    holds: (event) => open && (panel.contains(event.target as Node) || event.target === back),
    close,
  };
}

function line(pressed: HTMLElement): HTMLDivElement {
  const row = el('div', 'founding-row');
  row.appendChild(pressed);
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
