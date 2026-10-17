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

import type { GitHubStatus } from '@shared/github';
import type {
  Carrying,
  Picture,
  PictureFrom,
  Project,
  ScriptKind,
  Scripts,
} from '@shared/projects';
import type { Schedule, ScheduleHand, ScheduleWhen } from '@shared/schedules';
import type { HistoryEntry } from '@shared/tasks';
import { slot, toolFor } from './face';
import { agoOf } from './from';
import { stand } from './standing';

/** A session's transcript, read back once it has ended. */
export interface HistoryRead {
  title: string;
  branch: string;
  /** Oldest first. */
  turns: { who: 'you' | 'agent'; text: string }[];
}

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
  /** Whether this machine is signed in to GitHub, and as whom. A machine
      fact, not a project one — every project acts as the same one. Null
      while it is still being read. */
  github: GitHubStatus | null;
  /** How many sessions it has, which is what removing it costs. */
  sessions: number;
  /** Every session taken down in this project, newest first. Null while it is
      still being read. */
  history: HistoryEntry[] | null;
  /** Sessions this project cuts on its own. Null while still being read. */
  schedules: Schedule[] | null;
  /** Who could work one, whether or not it is installed here yet. */
  scheduleHands: ScheduleHand[];
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
  /** What every session here carries into its spawn, `NAME=value` a line.
      Blank clears it. */
  env(text: string): Promise<void>;
  /** What search and file watching leave out here, one glob a line, on top
      of the default policy. Blank clears it. */
  excludes(text: string): Promise<void>;
  /** Whether what was said in a session here outlives it. */
  keepTranscripts(keeps: boolean): Promise<void>;
  /** Blank clears that script, back to nothing running for it. */
  script(which: ScriptKind, value: string): Promise<void>;
  /** A session cut on its own, without you pressing the hook. */
  addSchedule(what: string, agent: string, terminal: boolean, when: ScheduleWhen): Promise<void>;
  removeSchedule(id: string): Promise<void>;
  /** Starts GitHub's device flow. Resolves to what went wrong, if it did. */
  signIn(): Promise<{ code: string; url: string } | { wrong: string }>;
  show(): void;
  openEditor(): void;
  /** What was said in an ended session, read back without waking it. Null
      when its conversation is gone too. */
  readHistory(id: string): Promise<HistoryRead | null>;
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

/** The pages down the window's left side, in the order they hang there. */
type Page = 'general' | 'sessions' | 'worktrees' | 'timetable' | 'git';

const PAGES: { page: Page; said: string }[] = [
  { page: 'general', said: 'General' },
  { page: 'sessions', said: 'Sessions' },
  { page: 'worktrees', said: 'Own copies' },
  { page: 'timetable', said: 'Timetable' },
  { page: 'git', said: 'Git' },
];

/** Whichever page was open last, so coming back to settings lands there. */
let lastPage: Page = 'general';

/** How long "saved" sits beside a heading after something was written. */
const SAVED_MS = 2400;

export function openSettings(state: SettingsState, does: SettingsDoings): Settings {
  let now = state;
  let trouble: string | null = null;
  let armed: number | undefined;
  let page: Page = state.fresh ? 'general' : lastPage;

  const back = el('div', 'settings-back');
  const panel = el('div', 'settings paged');
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
  name.title = 'Click to rename';
  const where = el('div', 'settings-where');
  const path = el('span', 'settings-path');
  const finder = button('Show in Finder', 'settings-link', () => does.show());
  const editor = button('Open in editor', 'settings-link', () => does.openEditor());
  where.append(path, finder, editor);
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

  // ── the pages ────────────────────────────────────────────────────────────
  const middle = el('div', 'settings-middle');
  const rail = el('nav', 'settings-rail');
  const body = el('div', 'settings-body');
  middle.append(rail, body);
  panel.append(head, middle);

  const welcome = el('p', 'settings-welcome');
  const faces = section('Icon');
  const excludes = section('Left out of search');
  const danger = section('Remove');
  const ending = section('When a session ends');
  const history = section('Sessions that have ended');
  const environment = section('Environment');
  const sessions = section('Files carried into each copy');
  const scripts = section('Scripts');
  const timetable = section('Scheduled sessions');
  const addTimed = section('Add one');
  const identity = section('Commits go out as');
  const github = section('GitHub');

  const pageRoots: Record<Page, HTMLElement> = {
    general: pageOf([welcome, faces.root, excludes.root, danger.root]),
    sessions: pageOf([ending.root, history.root, environment.root]),
    worktrees: pageOf([intro(OWN_COPIES), sessions.root, scripts.root]),
    timetable: pageOf([intro(TIMETABLE), timetable.root, addTimed.root]),
    git: pageOf([identity.root, github.root]),
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
    if (past.style.display !== 'none') showBody();
    page = to;
    lastPage = to;
    showPage();
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
    sub('general', 'icon, search, remove');
    const ended = now.history?.length ?? 0;
    sub(
      'sessions',
      now.project.keepsTranscripts === true
        ? ended
          ? `kept · ${ended} ended`
          : 'kept when they end'
        : 'deleted when they end'
    );
    const carried = now.carrying?.carries.filter((one) => one.on).length ?? 0;
    const scripted = now.scripts
      ? SCRIPT_ROWS.filter((row) => now.scripts?.[row.which].trim()).length
      : 0;
    const bits = [
      carried ? `${carried} file${carried === 1 ? '' : 's'}` : '',
      scripted ? `${scripted} script${scripted === 1 ? '' : 's'}` : '',
    ].filter(Boolean);
    sub('worktrees', bits.length ? bits.join(' · ') : 'nothing set');
    const timed = now.schedules?.length ?? 0;
    sub('timetable', timed ? `${timed} scheduled` : 'nothing scheduled');
    const gh = now.github;
    sub(
      'git',
      gh?.kind === 'signed-in'
        ? `GitHub as ${gh.login}`
        : gh?.kind === 'no-gh'
          ? 'no gh here'
          : gh
            ? 'not signed in'
            : ''
    );
  }

  // ── reading one back, in place of the pages ─────────────────────────────
  const past = el('div', 'settings-past');
  past.style.display = 'none';
  const pastBack = button('‹ back to sessions', 'settings-link', () => showBody());
  const pastTitle = el('div', 'settings-past-title');
  const pastBranch = el('div', 'settings-past-branch');
  const pastTurns = el('div', 'settings-past-turns');
  past.append(pastBack, pastTitle, pastBranch, pastTurns);
  body.append(past);

  function showBody(): void {
    past.style.display = 'none';
    showPage();
  }

  // ── general ──────────────────────────────────────────────────────────────
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

    const hint = hintLine(
      now.pictures === null
        ? 'What it wears on the rack and on its flag. Looking through the project for images…'
        : now.pictures.length
          ? 'What it wears on the rack and on its flag. Images found in the project come first.'
          : 'What it wears on the rack and on its flag. There are no images in this project.'
    );

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
    if (trouble) children.push(troubleLine(trouble));
    faces.fill(children);
  }

  function drawExcludes(): void {
    const field = area(now.project.excludes ?? '', '*.log\ndist/', 3, async (text) => {
      await does.excludes(text);
      excludes.saved();
    });
    excludes.fill([
      hintLine(
        "Finding a file by name or by what's in it skips these. One glob a line, on top of what is already skipped, like node_modules."
      ),
      field,
    ]);
  }

  function drawDanger(): void {
    const cost = !now.sessions
      ? 'The folder stays exactly where it is.'
      : now.sessions === 1
        ? 'Its one session is taken down. The folder stays exactly where it is.'
        : `Its ${now.sessions} sessions are taken down. The folder stays exactly where it is.`;
    const said = armed !== undefined ? 'Click again to remove it' : 'Remove from Mender';
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
    if (armed !== undefined) {
      remove.classList.add('armed');
      stand(() => remove.click(), remove);
    }
    const actions = el('div', 'settings-actions');
    actions.appendChild(remove);
    danger.fill([hintLine(`Takes it off the island. ${cost}`), actions]);
  }

  // ── sessions ─────────────────────────────────────────────────────────────
  function drawEnding(): void {
    const keeps = now.project.keepsTranscripts === true;
    const choices = el('div', 'settings-choices');
    choices.append(
      chip('Delete what was said', !keeps, () => void does.keepTranscripts(false)),
      chip('Keep it to read back', keeps, () => void does.keepTranscripts(true))
    );
    ending.fill([
      choices,
      hintLine(
        keeps
          ? 'Its transcript stays on this machine, and shows up under "sessions that have ended" below.'
          : 'Its transcript, its helpers, the pictures handed to it and the copies of files it kept for undoing all go.'
      ),
    ]);
  }

  function drawHistory(): void {
    const keeps = now.project.keepsTranscripts === true;
    const entries = now.history;
    if (!entries) {
      history.fill([hintLine('Reading what has ended here…')]);
      return;
    }
    if (!entries.length) {
      history.fill([
        hintLine(
          keeps
            ? 'Nothing has ended here yet.'
            : 'Nothing is kept once a session ends. Choose "keep it" above to start a record.'
        ),
      ]);
      return;
    }
    const list = el('div', 'settings-rows');
    for (const entry of entries) {
      const row = el('button', 'settings-row');
      row.type = 'button';
      const title = el('span', 'settings-row-main');
      title.textContent = entry.title;
      const ago = el('span', 'settings-row-side');
      ago.textContent = agoOf(Date.now() - Date.parse(entry.endedAt));
      row.append(title, ago);
      row.addEventListener('click', () => void openPast(entry));
      list.appendChild(row);
    }
    history.fill([hintLine('Pick one to read it back. Nothing is woken.'), list]);
  }

  async function openPast(entry: HistoryEntry): Promise<void> {
    pastTitle.textContent = entry.title;
    pastBranch.textContent = 'reading…';
    pastTurns.replaceChildren();
    for (const root of Object.values(pageRoots)) root.style.display = 'none';
    past.style.display = '';
    body.scrollTop = 0;
    const read = await does.readHistory(entry.id);
    if (past.style.display === 'none') return;
    if (!read) {
      pastBranch.textContent = 'its conversation is gone too.';
      return;
    }
    pastBranch.textContent = read.branch;
    const turns: HTMLElement[] = [];
    for (const turn of read.turns) {
      const line = el('p', `settings-past-turn settings-past-turn-${turn.who}`);
      line.textContent = turn.text;
      turns.push(line);
    }
    pastTurns.replaceChildren(...turns);
  }

  function drawEnv(): void {
    const field = area(now.project.env ?? '', 'API_URL=http://localhost:3000', 4, async (text) => {
      await does.env(text);
      environment.saved();
    });
    environment.fill([
      hintLine(
        'Set for every agent and every shell started in this project. One NAME=value a line.'
      ),
      field,
    ]);
  }

  // ── own copies ───────────────────────────────────────────────────────────
  function drawCarrying(): void {
    const carrying = now.carrying;
    if (!carrying) {
      sessions.fill([hintLine('Reading the project…')]);
      return;
    }
    if (!carrying.carries.length) {
      sessions.fill([
        hintLine('Nothing in this project is ignored by git, so a copy already has everything.'),
      ]);
      return;
    }
    const list = el('div', 'settings-list');
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
    sessions.fill([
      hintLine(
        `A copy is ${carrying.base ? `cut from ${carrying.base}` : 'cut fresh from git'}, so anything git ignores is missing from it. Tick what it should bring along, like a .env.`
      ),
      list,
    ]);
  }

  function drawScripts(): void {
    const held = now.scripts;
    if (!held) {
      scripts.fill([hintLine('Reading the project…')]);
      return;
    }
    const list = el('div', 'settings-scripts-list');
    for (const row of SCRIPT_ROWS) {
      const line = el('div', 'settings-script-row');
      const label = el('div', 'settings-script-label');
      const said = el('span', 'settings-script-name');
      said.textContent = row.said;
      const when = el('span', 'settings-script-when');
      when.textContent = row.hint;
      label.append(said, when);
      const field = input(held[row.which], row.example, async (value) => {
        await does.script(row.which, value);
        scripts.saved();
      });
      line.append(label, field);
      list.appendChild(line);
    }
    scripts.fill([hintLine('One line of shell each. Blank runs nothing.'), list]);
  }

  // ── timetable ────────────────────────────────────────────────────────────
  let draftWhat = '';
  let draftHand: string | null = null;
  let draftKind: ScheduleWhen['kind'] = 'daily';
  let draftTime = soonHHMM();
  let draftHours = 6;
  let draftTerminal = false;
  let draftTrouble: string | null = null;
  const removing = new Map<string, number>();

  function whenSaid(when: ScheduleWhen): string {
    if (when.kind === 'daily') return `every day at ${when.time}`;
    if (when.kind === 'hours') return `every ${when.n} hour${when.n === 1 ? '' : 's'}`;
    return 'on every push to the base branch';
  }

  function drawTimetable(): void {
    if (now.schedules === null) {
      timetable.fill([hintLine('Reading the timetable…')]);
      return;
    }
    if (!now.schedules.length) {
      timetable.fill([hintLine('Nothing is scheduled here yet.')]);
      return;
    }
    const list = el('div', 'settings-rows');
    for (const one of now.schedules) {
      const row = el('div', 'settings-row settings-row-still');
      const main = el('span', 'settings-row-main');
      const what = el('span', 'settings-row-title');
      what.textContent = one.what;
      const hand = now.scheduleHands.find((h) => h.id === one.agent)?.name ?? one.agent;
      const meta = el('span', 'settings-row-meta');
      meta.textContent = `${hand}${one.kind === 'terminal' ? ' in a terminal' : ''} · ${whenSaid(one.when)}${
        one.lastRun ? ` · last ran ${agoOf(Date.now() - Date.parse(one.lastRun))}` : ''
      }`;
      main.append(what, meta);
      const gone = removing.has(one.id);
      const remove = button(gone ? 'click again to remove' : 'remove', 'settings-link', () => {
        if (!gone) {
          const timer = window.setTimeout(() => {
            removing.delete(one.id);
            if (back.isConnected) drawTimetable();
          }, STANDS_MS);
          removing.set(one.id, timer);
          drawTimetable();
          return;
        }
        window.clearTimeout(removing.get(one.id));
        removing.delete(one.id);
        void does.removeSchedule(one.id);
      });
      if (gone) {
        remove.classList.add('settings-link-sore');
        stand(() => remove.click(), remove);
      }
      row.append(main, remove);
      list.appendChild(row);
    }
    timetable.fill([list]);
  }

  function drawAddTimed(): void {
    /* Only who would actually start here; one not installed would cut a
       session that breaks the moment it is due. */
    const hands = now.scheduleHands.filter((one) => one.here !== false);
    if (!draftHand || !hands.some((one) => one.id === draftHand)) draftHand = hands[0]?.id ?? null;

    const what = document.createElement('textarea');
    what.className = 'settings-env-field';
    what.rows = 2;
    what.placeholder = 'Look through the open issues and fix the easiest one.';
    what.spellcheck = false;
    what.value = draftWhat;
    what.addEventListener('input', () => (draftWhat = what.value));

    const who = el('div', 'settings-choices');
    if (!hands.length) who.appendChild(hintLine('No agent is installed on this machine yet.'));
    for (const hand of hands) {
      who.appendChild(
        chip(hand.name, hand.id === draftHand, () => {
          draftHand = hand.id;
          drawAddTimed();
        })
      );
    }

    const how = el('div', 'settings-choices');
    how.append(
      chip('As a conversation', !draftTerminal, () => {
        draftTerminal = false;
        drawAddTimed();
      }),
      chip('In its own terminal', draftTerminal, () => {
        draftTerminal = true;
        drawAddTimed();
      })
    );

    const when = el('div', 'settings-choices');
    const kinds: [ScheduleWhen['kind'], string][] = [
      ['daily', 'Every day'],
      ['hours', 'Every few hours'],
      ['push', 'On every push'],
    ];
    for (const [kind, said] of kinds) {
      when.appendChild(
        chip(said, draftKind === kind, () => {
          draftKind = kind;
          drawAddTimed();
        })
      );
    }
    const detail = el('div', 'settings-when-detail');
    if (draftKind === 'daily') {
      const at = el('span', 'settings-hint-inline');
      at.textContent = 'at';
      const time = document.createElement('input');
      time.type = 'time';
      time.className = 'settings-identity-field settings-small-field';
      time.value = draftTime;
      time.addEventListener('input', () => (draftTime = time.value));
      detail.append(at, time);
    } else if (draftKind === 'hours') {
      const every = el('span', 'settings-hint-inline');
      every.textContent = 'every';
      const hours = document.createElement('input');
      hours.type = 'number';
      hours.min = '1';
      hours.className = 'settings-identity-field settings-small-field';
      hours.value = String(draftHours);
      hours.addEventListener('input', () => (draftHours = Math.max(1, Number(hours.value) || 1)));
      const unit = el('span', 'settings-hint-inline');
      unit.textContent = 'hours';
      detail.append(every, hours, unit);
    } else {
      const said = el('span', 'settings-hint-inline');
      said.textContent = 'whenever the base branch moves';
      detail.appendChild(said);
    }

    const add = button('Add to the timetable', 'settings-button', () => {
      const said = draftWhat.trim();
      if (!said) {
        draftTrouble = 'Say what it is for first.';
        drawAddTimed();
        return;
      }
      if (!draftHand) return;
      const picked: ScheduleWhen =
        draftKind === 'daily'
          ? { kind: 'daily', time: draftTime }
          : draftKind === 'hours'
            ? { kind: 'hours', n: draftHours }
            : { kind: 'push' };
      draftWhat = '';
      draftTrouble = null;
      void does.addSchedule(said, draftHand, draftTerminal, picked).then(() => {
        drawAddTimed();
        addTimed.saved('added');
      });
    });
    const actions = el('div', 'settings-actions');
    actions.appendChild(add);

    const children: HTMLElement[] = [
      formRow('What it is for', what),
      formRow('Who works it', who),
      formRow('How', how),
      formRow('When', when, detail),
      actions,
    ];
    if (draftTrouble) children.push(troubleLine(draftTrouble));
    addTimed.fill(children);
  }

  /** A minute from now, as `HH:MM` — the shape a schedule "due a minute out"
      needs to fill in the time field with. */
  function soonHHMM(): string {
    const soon = new Date(Date.now() + 60_000);
    return `${String(soon.getHours()).padStart(2, '0')}:${String(soon.getMinutes()).padStart(2, '0')}`;
  }

  // ── git ──────────────────────────────────────────────────────────────────
  function drawIdentity(): void {
    const gitName = document.createElement('input');
    const gitEmail = document.createElement('input');
    const save = async (): Promise<void> => {
      if (
        gitName.value.trim() === (now.project.gitName ?? '') &&
        gitEmail.value.trim() === (now.project.gitEmail ?? '')
      )
        return;
      await does.identity(gitName.value, gitEmail.value);
      identity.saved();
    };
    for (const [field, holder, value] of [
      [gitName, 'Name', now.project.gitName ?? ''],
      [gitEmail, 'Email', now.project.gitEmail ?? ''],
    ] as const) {
      field.className = 'settings-identity-field';
      field.placeholder = holder;
      field.spellcheck = false;
      field.value = value;
      field.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          field.blur();
        }
      });
      field.addEventListener('blur', () => void save());
    }
    const row = el('div', 'settings-identity-row');
    row.append(gitName, gitEmail);
    identity.fill([
      hintLine(
        'Only for commits made in this project. Leave blank to use your usual git identity.'
      ),
      row,
    ]);
  }

  let signingIn: { code: string; url: string } | null = null;
  let ghTrouble: string | null = null;

  function drawGitHub(): void {
    const held = now.github;
    if (!held) {
      github.fill([hintLine('Reading it…')]);
      return;
    }
    if (held.kind === 'signed-in') {
      github.fill([
        hintLine(
          `Signed in to ${held.host} as ${held.login}. Pull requests, clones and new repositories everywhere in Mender go through this account.`
        ),
      ]);
      return;
    }
    if (signingIn) {
      github.fill([
        hintLine(`Enter the code ${signingIn.code} in the browser window that just opened.`),
      ]);
      return;
    }
    const children: HTMLElement[] = [
      hintLine(
        held.kind === 'no-gh'
          ? 'This machine has no gh installed, so nothing here can sign in to GitHub.'
          : 'Not signed in. Every project acts as whoever this machine signs in as.'
      ),
    ];
    if (held.kind === 'signed-out') {
      const actions = el('div', 'settings-actions');
      actions.appendChild(
        button('Sign in…', 'settings-button', () => {
          ghTrouble = null;
          void does.signIn().then((said) => {
            if ('wrong' in said) ghTrouble = said.wrong;
            else signingIn = said;
            drawGitHub();
          });
        })
      );
      children.push(actions);
    }
    if (ghTrouble) children.push(troubleLine(ghTrouble));
    github.fill(children);
  }

  // ── drawing ──────────────────────────────────────────────────────────────
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

  /** Whether someone is writing in it, in which case it is left alone. */
  const busy = (part: { root: HTMLElement }): boolean => part.root.contains(document.activeElement);

  function draw(): void {
    drawHead();
    drawRail();
    welcome.textContent = now.fresh
      ? `${now.project.name} has moved in. Pick the icon it wears on the rack, or keep the default. Everything else here can wait.`
      : '';
    welcome.style.display = now.fresh ? '' : 'none';
    drawFaces();
    if (!busy(excludes)) drawExcludes();
    drawDanger();
    drawEnding();
    drawHistory();
    if (!busy(environment)) drawEnv();
    drawCarrying();
    if (!busy(scripts)) drawScripts();
    drawTimetable();
    if (!busy(addTimed)) drawAddTimed();
    if (!busy(identity)) drawIdentity();
    drawGitHub();
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
  showPage();
  /* The keyboard comes with it, off the line under it, so typing lands in
     this window or nowhere rather than in the session behind it. */
  panel.tabIndex = -1;
  panel.focus({ preventScroll: true });

  return {
    update(next) {
      now = next;
      draw();
    },
    escaped() {
      if (past.style.display !== 'none') {
        showBody();
        return;
      }
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

const OWN_COPIES =
  'Sessions normally work right in the project folder. These only apply to one started in its own copy, on its own branch.';

const TIMETABLE =
  'Sessions that start on their own, as if you had pressed the hook and said the first thing yourself. Only while Mender is open; one due while it is closed waits until it opens.';

const SCRIPT_ROWS: { which: ScriptKind; said: string; hint: string; example: string }[] = [
  { which: 'prepare', said: 'Prepare', hint: 'before the session starts', example: 'pnpm install' },
  { which: 'setup', said: 'Setup', hint: 'alongside it, once', example: 'cp .env.example .env' },
  { which: 'run', said: 'Run', hint: 'keeps running, after setup', example: 'pnpm dev' },
  {
    which: 'teardown',
    said: 'Teardown',
    hint: 'when the session comes down',
    example: 'docker compose down',
  },
];

export function pageOf(children: HTMLElement[]): HTMLElement {
  const root = el('div', 'settings-page');
  root.append(...children);
  return root;
}

export function intro(text: string): HTMLElement {
  const said = el('p', 'settings-intro');
  said.textContent = text;
  return said;
}

export function hintLine(text: string): HTMLElement {
  const said = el('p', 'settings-hint');
  said.textContent = text;
  return said;
}

export function troubleLine(text: string): HTMLElement {
  const said = el('p', 'settings-trouble');
  said.textContent = text;
  return said;
}

/** One of a few answers, the picked one framed in gold. */
export function chip(said: string, picked: boolean, does: () => void): HTMLButtonElement {
  const made = button(said, 'settings-chip', () => {
    if (!picked) does();
  });
  made.setAttribute('aria-pressed', String(picked));
  if (picked) made.classList.add('picked');
  return made;
}

export function formRow(label: string, ...fields: HTMLElement[]): HTMLElement {
  const row = el('div', 'settings-form-row');
  const said = el('span', 'settings-form-label');
  said.textContent = label;
  const right = el('div', 'settings-form-field');
  right.append(...fields);
  row.append(said, right);
  return row;
}

/** A one-line field that writes itself on return or on leaving it. */
export function input(value: string, placeholder: string, save: (value: string) => Promise<void>) {
  const field = document.createElement('input');
  field.className = 'settings-identity-field';
  field.placeholder = placeholder;
  field.spellcheck = false;
  field.value = value;
  field.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      field.blur();
    }
  });
  field.addEventListener('blur', () => {
    if (field.value.trim() !== value.trim()) void save(field.value);
  });
  return field;
}

/** A several-line field that writes itself on leaving it. */
export function area(
  value: string,
  placeholder: string,
  rows: number,
  save: (text: string) => Promise<void>
): HTMLTextAreaElement {
  const field = document.createElement('textarea');
  field.className = 'settings-env-field';
  field.spellcheck = false;
  field.rows = rows;
  field.placeholder = placeholder;
  field.value = value;
  field.addEventListener('blur', () => {
    if (field.value.trim() !== value.trim()) void save(field.value);
  });
  return field;
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

export function section(title: string): {
  root: HTMLElement;
  fill(children: HTMLElement[]): void;
  /** Says it took, beside the heading, for a moment. */
  saved(said?: string): void;
} {
  const root = el('section', 'settings-section');
  const heading = el('h3', 'settings-label');
  const words = el('span', '');
  words.textContent = title;
  const note = el('span', 'settings-saved');
  heading.append(words, note);
  const inner = el('div', 'settings-inner');
  root.append(heading, inner);
  let timer: number | undefined;
  return {
    root,
    fill: (children) => inner.replaceChildren(...children),
    saved(said = 'saved') {
      note.textContent = said;
      note.classList.add('shown');
      window.clearTimeout(timer);
      timer = window.setTimeout(() => note.classList.remove('shown'), SAVED_MS);
    },
  };
}
