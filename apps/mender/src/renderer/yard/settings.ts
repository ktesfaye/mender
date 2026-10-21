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
 * It is lantern glass: the island or the yard shows through it, bent at the rim.
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
import '../glass/settings.css';
import { glaze, TINT_ISLAND } from '../glass/glass';
import { px } from '../glass/px';
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

const PAGES: { page: Page; said: string; icon: string }[] = [
  { page: 'general', said: 'General', icon: 'gem' },
  { page: 'sessions', said: 'Sessions', icon: 'flame' },
  { page: 'worktrees', said: 'Own copies', icon: 'merge' },
  { page: 'timetable', said: 'Timetable', icon: 'spark' },
  { page: 'git', said: 'Git', icon: 'ring' },
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

  const back = el('div', 'st-back');
  const panel = glaze(el('div', 'st-win'), { tint: overIsland() ? TINT_ISLAND : undefined });
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

  // ── the rail's head: its face, its name, how many are in it ─────────────
  const face = el('div', 'st-me-ic');
  const me = el('div', 'st-me');
  const who = el('div', '');
  who.style.minWidth = '0';
  const meName = el('b', '');
  const meSub = el('span', '');
  who.append(meName, meSub);
  me.append(face, who);

  // ── the name, where it lives ─────────────────────────────────────────────
  const name = document.createElement('input');
  name.className = 'st-input st-name';
  name.spellcheck = false;
  name.setAttribute('aria-label', 'Project name');
  const path = el('span', 'st-mono');
  const finder = button('Show in Finder', 'st-link', () => does.show());
  const editor = button('Open in editor', 'st-link', () => does.openEditor());
  const whereLine = el('div', 'st-f-v st-line');
  whereLine.append(path, finder, editor);
  const nameCard = el('div', 'st-card');
  nameCard.append(
    formRowSub('Name', 'on the rack and its flag', name),
    formRowSub('Where it lives', 'the checkout', whereLine)
  );

  const heading = el('h2', '');
  const lead = el('p', 'st-lead');
  const head = el('div', 'st-head');
  head.append(heading, lead);
  const shut = button('×', 'g-x', () => close());
  shut.setAttribute('aria-label', 'Close');
  const mark = savedMark(panel);

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
  const rail = el('nav', 'st-rail');
  const main = el('div', 'st-main');
  const body = el('div', 'st-body g-scroll');
  main.append(head, body, mark, shut);
  panel.append(rail, main);
  rail.appendChild(me);

  const welcome = el('p', 'st-welcome');
  const faces = section('Its face · found in the checkout');
  const excludes = section('Left out of search');
  const danger = section('');
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
    general: pageOf([welcome, faces.root, nameCard, excludes.root, danger.root]),
    sessions: pageOf([ending.root, history.root, environment.root]),
    worktrees: pageOf([sessions.root, scripts.root]),
    timetable: pageOf([timetable.root, addTimed.root]),
    git: pageOf([identity.root, github.root]),
  };
  body.append(...Object.values(pageRoots));

  const tabs = new Map<Page, { root: HTMLButtonElement; sub: HTMLElement }>();
  for (const one of PAGES) {
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
    const here = PAGES.find((one) => one.page === page);
    heading.textContent = here?.said ?? '';
    lead.textContent = LEADS[page].replace('{name}', now.project.name);
    body.scrollTop = 0;
  }

  function drawRail(): void {
    const sub = (one: Page, text: string): void => {
      const tab = tabs.get(one);
      if (tab) tab.sub.textContent = text;
    };
    sub('general', 'its face, its name');
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
    const dot = tabs.get('worktrees')?.root;
    if (dot) {
      dot.querySelector('.g-dot')?.remove();
      if (bits.length) {
        const d = el('span', 'g-dot');
        d.style.background = '#9bd28a';
        dot.appendChild(d);
      }
    }
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
  const past = el('div', 'st-page');
  past.style.display = 'none';
  past.style.gap = '0';
  const pastBack = button('‹ back to sessions', 'st-link', () => showBody());
  pastBack.style.alignSelf = 'flex-start';
  const pastTitle = el('div', 'st-past-title');
  const pastBranch = el('div', 'st-past-branch');
  const pastTurns = el('div', 'st-past-turns');
  past.append(pastBack, pastTitle, pastBranch, pastTurns);
  body.append(past);

  function showBody(): void {
    past.style.display = 'none';
    showPage();
  }

  // ── general ──────────────────────────────────────────────────────────────
  function drawFaces(): void {
    const grid = el('div', 'st-thumbs');
    const stage = el('div', 'st-stage');
    const plank = el('div', 'st-plank');
    const caption = el('div', 'st-stage-cap');
    stage.append(plank, caption);
    const own = now.project.picture;
    const chosen: { said: string }[] = [];
    plank.appendChild(
      slot(
        {
          tool: toolFor(now.at),
          ...(now.project.icon ? { icon: now.project.icon } : {}),
        },
        false,
        70
      )
    );

    const add = (
      said: string,
      short: string,
      here: boolean,
      look: { icon?: string; tool: string },
      from: PictureFrom | null
    ): void => {
      const one = el('button', here ? 'st-th on' : 'st-th');
      one.type = 'button';
      one.appendChild(slot(look, false, 52));
      const label = el('small', '');
      label.textContent = short;
      one.appendChild(label);
      one.title = said;
      one.setAttribute('aria-pressed', String(here));
      if (here) chosen.push({ said });
      const pick = (): void => {
        if (!from || here) return;
        trouble = null;
        void does.face(from).then((wrong) => {
          trouble = wrong;
          drawFaces();
        });
      };
      one.addEventListener('click', pick);
      grid.appendChild(one);
    };

    add('The default', 'default', !own, { tool: toolFor(now.at) }, { kind: 'none' });
    const inside = (relative: string): boolean =>
      own === relative || own === `${now.project.path.replace(/\/+$/, '')}/${relative}`;
    /* What it wears now is always on show, even when it came from outside
       the checkout, so the chosen one is never missing from the choices. */
    if (own && now.project.icon && !now.pictures?.some((one) => inside(one.path))) {
      const file = own.split('/').at(-1) ?? own;
      add(file, file, true, { icon: now.project.icon, tool: '' }, null);
    }
    for (const picture of now.pictures ?? []) {
      add(
        `${picture.path}  ·  ${picture.wide}×${picture.tall}`,
        picture.path.split('/').at(-1) ?? picture.path,
        inside(picture.path),
        { icon: picture.src, tool: '' },
        { kind: 'in', path: picture.path }
      );
    }
    const custom = el('button', 'st-th add');
    custom.type = 'button';
    custom.innerHTML = '<div><em>+</em>from<br>anywhere</div>';
    custom.addEventListener('click', () => {
      trouble = null;
      void does.face({ kind: 'own' }).then((wrong) => {
        trouble = wrong;
        drawFaces();
      });
    });
    grid.appendChild(custom);
    caption.textContent = chosen[0]?.said ?? 'its flag and its board, as they’ll look';

    const right = el('div', '');
    right.style.cssText = 'display:flex;flex-direction:column;gap:12px;min-width:0';
    right.appendChild(grid);
    if (now.pictures === null)
      right.appendChild(hintLine('Looking through the project for images…'));
    else if (!now.pictures.length) {
      right.appendChild(hintLine('There are no images in this project.'));
    }
    if (now.more > 0) {
      const actions = el('div', 'st-actions');
      actions.appendChild(button(`Show ${now.more} more`, 'st-ghost', () => does.more()));
      right.appendChild(actions);
    }
    const hero = el('div', 'st-hero');
    hero.append(stage, right);
    const children: HTMLElement[] = [hero];
    if (trouble) children.push(troubleLine(trouble));
    faces.fill(children);
  }

  function drawExcludes(): void {
    const field = area(now.project.excludes ?? '', '*.log\ndist/', 3, async (text) => {
      await does.excludes(text);
      excludes.saved();
    });
    excludes.fill([formRowSub('Globs', 'one a line, on top of node_modules and the usual', field)]);
  }

  function drawDanger(): void {
    const cost = !now.sessions
      ? 'The folder stays exactly where it is.'
      : now.sessions === 1
        ? 'Its one session comes down with it. The folder stays exactly where it is.'
        : `Its ${now.sessions} sessions come down with it. The folder stays exactly where it is.`;
    const said = armed !== undefined ? 'Click again to remove it' : 'Remove…';
    const remove = button(said, armed !== undefined ? 'st-link sore' : 'st-link', () => {
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
    if (armed !== undefined) stand(() => remove.click(), remove);
    const strip = el('div', armed !== undefined ? 'st-danger armed' : 'st-danger');
    const text = el('div', 'st-danger-t');
    const t = el('b', '');
    t.textContent = 'Take it off the island';
    const d = el('span', '');
    d.textContent = cost;
    text.append(t, d);
    strip.append(px('spark', '#f08a72', 16), text, remove);
    danger.fill([strip]);
  }

  // ── sessions ─────────────────────────────────────────────────────────────
  function drawEnding(): void {
    const keeps = now.project.keepsTranscripts === true;
    const choices = el('div', 'st-seg');
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
    const list = el('div', 'st-rows');
    for (const entry of entries) {
      const row = el('button', 'st-row');
      row.type = 'button';
      const title = el('span', 'st-row-main');
      title.textContent = entry.title;
      const ago = el('span', 'st-row-side');
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
      const line = el('p', `st-past-turn st-past-turn-${turn.who}`);
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
    const list = el('div', 'st-card');
    for (const one of carrying.carries) {
      const line = document.createElement('label');
      line.className = 'st-check';
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = one.on;
      box.addEventListener('change', () => does.carry(one.path, box.checked));
      const said = el('span', '');
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
    const list: HTMLElement[] = [];
    for (const row of SCRIPT_ROWS) {
      const field = input(held[row.which], row.example, async (value) => {
        await does.script(row.which, value);
        scripts.saved();
      });
      list.push(formRowSub(row.said, row.hint, field));
    }
    scripts.fill([...list, hintLine('One line of shell each. Blank runs nothing.')]);
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
    const list = el('div', 'st-rows');
    for (const one of now.schedules) {
      const row = el('div', 'st-row');
      const main = el('span', 'st-row-main');
      const what = el('span', 'st-row-title');
      what.textContent = one.what;
      const hand = now.scheduleHands.find((h) => h.id === one.agent)?.name ?? one.agent;
      const meta = el('span', 'st-row-meta');
      meta.textContent = `${hand}${one.kind === 'terminal' ? ' in a terminal' : ''} · ${whenSaid(one.when)}${
        one.lastRun ? ` · last ran ${agoOf(Date.now() - Date.parse(one.lastRun))}` : ''
      }`;
      main.append(what, meta);
      const gone = removing.has(one.id);
      const remove = button(gone ? 'click again to remove' : 'remove', 'st-link', () => {
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
        remove.classList.add('sore');
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
    what.className = 'st-area';
    what.rows = 2;
    what.placeholder = 'Look through the open issues and fix the easiest one.';
    what.spellcheck = false;
    what.value = draftWhat;
    what.addEventListener('input', () => (draftWhat = what.value));

    const who = el('div', 'st-seg');
    if (!hands.length) who.appendChild(hintLine('No agent is installed on this machine yet.'));
    for (const hand of hands) {
      who.appendChild(
        chip(hand.name, hand.id === draftHand, () => {
          draftHand = hand.id;
          drawAddTimed();
        })
      );
    }

    const how = el('div', 'st-seg');
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

    const when = el('div', 'st-seg');
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
    const detail = el('div', 'st-when');
    if (draftKind === 'daily') {
      const at = el('span', 'st-inline');
      at.textContent = 'at';
      const time = document.createElement('input');
      time.type = 'time';
      time.className = 'st-input st-small';
      time.value = draftTime;
      time.addEventListener('input', () => (draftTime = time.value));
      detail.append(at, time);
    } else if (draftKind === 'hours') {
      const every = el('span', 'st-inline');
      every.textContent = 'every';
      const hours = document.createElement('input');
      hours.type = 'number';
      hours.min = '1';
      hours.className = 'st-input st-small';
      hours.value = String(draftHours);
      hours.addEventListener('input', () => (draftHours = Math.max(1, Number(hours.value) || 1)));
      const unit = el('span', 'st-inline');
      unit.textContent = 'hours';
      detail.append(every, hours, unit);
    } else {
      const said = el('span', 'st-inline');
      said.textContent = 'whenever the base branch moves';
      detail.appendChild(said);
    }

    const add = button('Add to the timetable', 'st-ghost', () => {
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
    const actions = el('div', 'st-actions');
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
      field.className = 'st-input st-sans';
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
    identity.fill([
      formRowSub('Name', 'on its commits', gitName),
      formRowSub('Email', 'on its commits', gitEmail),
      hintLine(
        'Only for commits made in this project. Leave blank to use your usual git identity.'
      ),
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
      const actions = el('div', 'st-actions');
      actions.appendChild(
        button('Sign in…', 'st-ghost', () => {
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
        46
      )
    );
    meName.textContent = now.project.name;
    meSub.textContent = now.sessions
      ? `${now.sessions} session${now.sessions === 1 ? '' : 's'}`
      : 'no sessions yet';
    if (document.activeElement !== name) name.value = now.project.name;
    path.textContent = now.project.path.replace(/^\/Users\/[^/]+/, '~');
    path.title = now.project.path;
    lead.textContent = LEADS[page].replace('{name}', now.project.name);
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

const LEADS: Record<Page, string> = {
  general: 'How {name} looks from the water and on the rack.',
  sessions: 'What happens to what was said once a session ends.',
  worktrees:
    'Sessions work right in the project folder. These only apply to one started in its own copy, on its own branch.',
  timetable:
    'Sessions that start on their own, as if you had said the first thing yourself. Only while Mender is open.',
  git: 'Who its commits go out as, and who the village is to GitHub.',
};

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
  const root = el('div', 'st-page');
  root.append(...children);
  return root;
}

export function intro(text: string): HTMLElement {
  const said = el('p', 'st-hint');
  said.textContent = text;
  return said;
}

export function hintLine(text: string): HTMLElement {
  const said = el('p', 'st-hint');
  said.textContent = text;
  return said;
}

export function troubleLine(text: string): HTMLElement {
  const said = el('p', 'st-trouble');
  said.textContent = text;
  return said;
}

/** One of a few answers, the picked one framed in gold. */
export function chip(said: string, picked: boolean, does: () => void): HTMLButtonElement {
  const made = button(said, 'st-chip', () => {
    if (!picked) does();
  });
  made.setAttribute('aria-pressed', String(picked));
  if (picked) made.classList.add('picked');
  return made;
}

export function formRow(label: string, ...fields: HTMLElement[]): HTMLElement {
  return formRowSub(label, '', ...fields);
}

/** A label with a quiet line under it, and what it sets beside. Neighbours
    stand together in one soft card. */
export function formRowSub(label: string, sub: string, ...fields: HTMLElement[]): HTMLElement {
  const row = el('div', 'st-f');
  const said = el('div', 'st-f-k');
  const b = el('b', '');
  b.textContent = label;
  said.appendChild(b);
  if (sub) {
    const s = el('span', '');
    s.textContent = sub;
    said.appendChild(s);
  }
  const right = el('div', 'st-f-v');
  right.append(...fields);
  row.append(said, right);
  return row;
}

/** The "saved" beside a window's heading, lit by whichever section says it took. */
export function savedMark(within: HTMLElement): HTMLElement {
  const mark = el('div', 'st-headsaved');
  let timer: number | undefined;
  within.addEventListener('st-saved', (event) => {
    mark.textContent = String((event as CustomEvent).detail ?? 'saved');
    mark.classList.add('shown');
    window.clearTimeout(timer);
    timer = window.setTimeout(() => mark.classList.remove('shown'), SAVED_MS);
  });
  return mark;
}

/** Whether a window opening now stands over the island rather than a yard. */
export function overIsland(): boolean {
  const canvas = document.body.querySelector<HTMLElement>(':scope > canvas');
  const filter = canvas?.style.filter ?? '';
  return !filter.includes('brightness');
}

/** Runs of form rows share one card; anything else stands as it is. */
export function grouped(children: HTMLElement[]): HTMLElement[] {
  const out: HTMLElement[] = [];
  let card: HTMLElement | null = null;
  for (const child of children) {
    if (child.classList.contains('st-f')) {
      if (!card) {
        card = el('div', 'st-card');
        out.push(card);
      }
      card.appendChild(child);
    } else {
      card = null;
      out.push(child);
    }
  }
  return out;
}

/** A one-line field that writes itself on return or on leaving it. */
export function input(value: string, placeholder: string, save: (value: string) => Promise<void>) {
  const field = document.createElement('input');
  field.className = 'st-input';
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
  field.className = 'st-area';
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
  const root = el('section', 'st-section');
  const heading = el('h3', 'st-label');
  const words = el('span', '');
  words.textContent = title;
  const note = el('span', 'st-saved');
  heading.append(words, note);
  const inner = el('div', 'st-inner');
  root.append(...(title ? [heading] : []), inner);
  return {
    root,
    fill: (children) => inner.replaceChildren(...grouped(children)),
    saved(said = 'saved') {
      note.textContent = said;
      root.dispatchEvent(new CustomEvent('st-saved', { bubbles: true, detail: said }));
    },
  };
}
