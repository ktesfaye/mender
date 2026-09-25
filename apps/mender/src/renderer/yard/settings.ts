/**
 * A project's settings, in a window of their own.
 *
 * Everything else in the village is laid over the yard, because everything
 * else is about the work. Settings are not: they are about the place, they
 * are visited rarely and left quickly, and they have nothing to do with
 * whoever is talking in the session underneath. So this is a window that pops
 * up over everything, with a close mark, and it goes away when you click
 * anywhere outside it, press Escape, or press the mark. Nothing under it moves.
 *
 * It is drawn in the rack's timber rather than on the wash, because what it
 * mostly sets is what the project looks like on the rack.
 */

import type {
  Carrying,
  Picture,
  PictureFrom,
  Project,
  ScriptKind,
  Scripts,
} from '@shared/projects';
import { slot, toolFor } from './face';

export interface SettingsState {
  project: Project;
  /** Where it came in the island's order, which is what its stand-in is. */
  at: number;
  /** Null while its checkout is still being looked through. */
  pictures: Picture[] | null;
  more: number;
  carrying: Carrying | null;
  /** What runs when a worktree is cut. Null while it is still being read. */
  scripts: Scripts | null;
  /** How many sessions it has, which is what removing it costs. */
  sessions: number;
  /** Just moved in, so this is the first thing it is asked. */
  fresh?: boolean;
}

export interface SettingsDoings {
  /** Give it a face. Resolves to what went wrong, if anything did. */
  face(from: PictureFrom): Promise<string | null>;
  more(): void;
  rename(name: string): Promise<void>;
  carry(path: string, on: boolean): void;
  /** Who this project's sessions commit as. Blank clears an override. */
  identity(name: string, email: string): Promise<void>;
  /** Blank clears that script, back to nothing running for it. */
  script(which: ScriptKind, value: string): Promise<void>;
  show(): void;
  forget(): Promise<void>;
  closed(): void;
}

export interface Settings {
  update(state: SettingsState): void;
  /** Escape, from the one keyboard listener. Steps back one thing. */
  escaped(): void;
  /** Whether a key belongs to this window rather than to the app under it. */
  holds(event: KeyboardEvent): boolean;
  close(): void;
}

/** How many images are laid out before it offers to show more. */
export const FACES = 11;

/** How long an offer to remove the project stands before it withdraws. */
const STANDS_MS = 4000;

export function openSettings(state: SettingsState, does: SettingsDoings): Settings {
  let now = state;
  let trouble: string | null = null;
  let armed: number | undefined;

  const back = el('div', 'settings-back');
  const panel = el('div', 'settings');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  back.appendChild(panel);

  /* Outside the window is a way out. Only a press that starts and ends out
     there, so dragging a selection out of the name field does not shut it. */
  let downOutside = false;
  back.addEventListener('pointerdown', (event) => {
    downOutside = event.target === back;
  });
  back.addEventListener('click', (event) => {
    if (downOutside && event.target === back) close();
    downOutside = false;
  });

  // ── the head: its face, its name, where it is ───────────────────────────
  const head = el('div', 'settings-head');
  const face = el('div', 'settings-face');
  const who = el('div', 'settings-who');
  const name = document.createElement('input');
  name.className = 'settings-name';
  name.spellcheck = false;
  name.setAttribute('aria-label', 'Project name');
  const where = el('div', 'settings-where');
  const path = el('span', 'settings-path');
  const finder = button('Show in Finder', 'settings-link', () => does.show());
  where.append(path, finder);
  who.append(name, where);
  const shut = button('×', 'settings-close', () => close());
  shut.setAttribute('aria-label', 'Close');
  head.append(face, who, shut);

  const keep = async (): Promise<void> => {
    const written = name.value.trim();
    if (!written || written === now.project.name) {
      name.value = now.project.name;
      return;
    }
    await does.rename(written);
  };
  name.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      name.blur();
    }
  });
  name.addEventListener('blur', () => void keep());

  // ── the body ─────────────────────────────────────────────────────────────
  const body = el('div', 'settings-body');
  const welcome = el('p', 'settings-welcome');
  const faces = section('Icon');
  const sessions = section('New sessions');
  const scripts = section('What runs when a worktree is cut');
  const identity = section('Commits go out as');
  const danger = el('div', 'settings-danger');
  body.append(welcome, faces.root, sessions.root, scripts.root, identity.root, danger);
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

  function drawHead(): void {
    face.replaceChildren(
      slot(
        {
          tool: toolFor(now.at),
          ...(now.project.icon ? { icon: now.project.icon } : {}),
        },
        false,
        64
      )
    );
    if (document.activeElement !== name) name.value = now.project.name;
    path.textContent = now.project.path.replace(/^\/Users\/[^/]+/, '~');
    path.title = now.project.path;
  }

  function drawFaces(): void {
    const grid = el('div', 'settings-grid');
    const caption = el('div', 'settings-caption');
    const own = now.project.picture;
    const chosen: { said: string }[] = [];

    const add = (
      said: string,
      here: boolean,
      look: { icon?: string; tool: string },
      from: PictureFrom | null
    ): void => {
      const one = slot(look, here, 52);
      one.classList.add('settings-choice');
      one.tabIndex = 0;
      one.title = said;
      one.setAttribute('role', 'button');
      one.setAttribute('aria-pressed', String(here));
      if (here) chosen.push({ said });
      one.addEventListener('pointerenter', () => (caption.textContent = said));
      one.addEventListener('pointerleave', () => (caption.textContent = chosen[0]?.said ?? ''));
      const pick = (): void => {
        if (!from || here) return;
        trouble = null;
        void does.face(from).then((wrong) => {
          trouble = wrong;
          drawFaces();
        });
      };
      one.addEventListener('click', pick);
      one.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          pick();
        }
      });
      grid.appendChild(one);
    };

    add('The default', !own, { tool: toolFor(now.at) }, { kind: 'none' });
    const inside = (relative: string): boolean =>
      own === relative || own === `${now.project.path.replace(/\/+$/, '')}/${relative}`;
    /* What it wears now is always on show, even when it came from outside
       the checkout, so the chosen one is never missing from the choices. */
    if (own && now.project.icon && !now.pictures?.some((one) => inside(one.path))) {
      add(own.split('/').at(-1) ?? own, true, { icon: now.project.icon, tool: '' }, null);
    }
    for (const picture of now.pictures ?? []) {
      add(
        `${picture.path}  ·  ${picture.wide}×${picture.tall}`,
        inside(picture.path),
        { icon: picture.src, tool: '' },
        { kind: 'in', path: picture.path }
      );
    }
    caption.textContent = chosen[0]?.said ?? '';

    const note =
      now.pictures === null
        ? 'Looking through the project for images…'
        : now.pictures.length
          ? 'Found in the project, likeliest first.'
          : 'There are no images in this project.';
    const hint = el('p', 'settings-hint');
    hint.textContent = note;

    const actions = el('div', 'settings-actions');
    actions.appendChild(
      button('Choose a file…', 'settings-button', () => {
        trouble = null;
        void does.face({ kind: 'own' }).then((wrong) => {
          trouble = wrong;
          drawFaces();
        });
      })
    );
    if (now.more > 0) {
      actions.appendChild(button(`Show ${now.more} more`, 'settings-button', () => does.more()));
    }
    const children: HTMLElement[] = [hint, grid, caption, actions];
    if (trouble) {
      const wrong = el('p', 'settings-trouble');
      wrong.textContent = trouble;
      children.push(wrong);
    }
    faces.fill(children);
  }

  function drawSessions(): void {
    const carrying = now.carrying;
    const hint = el('p', 'settings-hint');
    if (!carrying) {
      hint.textContent = 'Reading the project…';
      sessions.fill([hint]);
      return;
    }
    hint.textContent = `Each session gets a fresh worktree ${
      carrying.base ? `cut from ${carrying.base}` : 'of this project'
    }. Files git ignores are left behind unless they are ticked here.`;
    const list = el('div', 'settings-list');
    if (!carrying.carries.length) {
      const none = el('p', 'settings-hint');
      none.textContent = 'Nothing in this project is ignored by git.';
      list.appendChild(none);
    }
    for (const one of carrying.carries) {
      const line = document.createElement('label');
      line.className = 'settings-check';
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = one.on;
      box.addEventListener('change', () => does.carry(one.path, box.checked));
      const said = el('span', 'settings-check-path');
      said.textContent = one.folder ? `${one.path}/` : one.path;
      line.append(box, said);
      list.appendChild(line);
    }
    sessions.fill([hint, list]);
  }

  const SCRIPT_ROWS: { which: ScriptKind; said: string; hint: string }[] = [
    { which: 'prepare', said: 'prepare', hint: 'runs first; a session waits for it' },
    { which: 'setup', said: 'setup', hint: 'runs after, alongside the session' },
    { which: 'run', said: 'run', hint: 'a dev server, say — waits on setup' },
    { which: 'teardown', said: 'teardown', hint: 'runs when the session comes down' },
  ];

  function drawScripts(): void {
    const now2 = now.scripts;
    if (!now2) {
      const hint = el('p', 'settings-hint');
      hint.textContent = 'Reading the project…';
      scripts.fill([hint]);
      return;
    }
    const list = el('div', 'settings-scripts-list');
    for (const row of SCRIPT_ROWS) {
      const line = el('div', 'settings-script-row');
      const label = el('span', 'settings-script-label');
      label.textContent = row.said;
      label.title = row.hint;
      const field = document.createElement('input');
      field.className = 'settings-identity-field';
      field.placeholder = 'nothing';
      field.spellcheck = false;
      field.value = now2[row.which];
      const keep = async (): Promise<void> => {
        if (field.value.trim() === now2[row.which]) return;
        await does.script(row.which, field.value);
      };
      field.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          field.blur();
        }
      });
      field.addEventListener('blur', () => void keep());
      line.append(label, field);
      list.appendChild(line);
    }
    scripts.fill([list]);
  }

  function drawIdentity(): void {
    const hint = el('p', 'settings-hint');
    hint.textContent = 'Blank means whatever git would use anyway.';
    const gitName = document.createElement('input');
    gitName.className = 'settings-identity-field';
    gitName.placeholder = 'name';
    gitName.spellcheck = false;
    gitName.value = now.project.gitName ?? '';
    const gitEmail = document.createElement('input');
    gitEmail.className = 'settings-identity-field';
    gitEmail.placeholder = 'email';
    gitEmail.spellcheck = false;
    gitEmail.value = now.project.gitEmail ?? '';
    const keep = async (): Promise<void> => {
      if (
        gitName.value.trim() === (now.project.gitName ?? '') &&
        gitEmail.value.trim() === (now.project.gitEmail ?? '')
      )
        return;
      await does.identity(gitName.value, gitEmail.value);
    };
    for (const field of [gitName, gitEmail]) {
      field.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          field.blur();
        }
      });
      field.addEventListener('blur', () => void keep());
    }
    const row = el('div', 'settings-identity-row');
    row.append(gitName, gitEmail);
    identity.fill([hint, row]);
  }

  function drawDanger(): void {
    const cost = !now.sessions
      ? 'the folder stays where it is'
      : now.sessions === 1
        ? 'its one session is taken down, the folder stays'
        : `its ${now.sessions} sessions are taken down, the folder stays`;
    const said = armed !== undefined ? `Click again to remove · ${cost}` : 'Remove from Mender';
    const remove = button(said, 'settings-button settings-remove', () => {
      if (armed === undefined) {
        armed = window.setTimeout(() => {
          armed = undefined;
          if (back.isConnected) drawDanger();
        }, STANDS_MS);
        drawDanger();
        return;
      }
      window.clearTimeout(armed);
      armed = undefined;
      close();
      void does.forget();
    });
    if (armed !== undefined) remove.classList.add('armed');
    danger.replaceChildren(remove);
  }

  function draw(): void {
    drawHead();
    welcome.textContent = now.fresh
      ? `${now.project.name} has moved in. Pick the icon it wears on the rack, or keep the default.`
      : '';
    welcome.style.display = now.fresh ? '' : 'none';
    drawFaces();
    drawSessions();
    if (document.activeElement?.closest('.settings-scripts-list') == null) drawScripts();
    if (document.activeElement?.closest('.settings-identity-row') == null) drawIdentity();
    drawDanger();
  }

  let open = true;
  function close(): void {
    if (!open) return;
    open = false;
    if (armed !== undefined) window.clearTimeout(armed);
    back.remove();
    does.closed();
  }

  draw();
  /* The keyboard comes with it, off the line under it, so typing lands in
     this window or nowhere rather than in the session behind it. */
  shut.focus({ preventScroll: true });

  return {
    update(next) {
      now = next;
      draw();
    },
    escaped() {
      if (document.activeElement === name) {
        name.value = now.project.name;
        name.blur();
        return;
      }
      if (armed !== undefined) {
        window.clearTimeout(armed);
        armed = undefined;
        drawDanger();
        return;
      }
      close();
    },
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
  const heading = el('h3', 'settings-label');
  heading.textContent = title;
  const inner = el('div', 'settings-inner');
  root.append(heading, inner);
  return { root, fill: (children) => inner.replaceChildren(...children) };
}
