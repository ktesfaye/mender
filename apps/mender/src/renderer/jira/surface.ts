import './jira.css';
import { adfToMarkdown } from '@shared/jira-adf';
import type { JiraBoardPick, JiraLink } from '@shared/jira';
import { boardView, noFilters, readLook, type BoardHands, type Filters, type Lit, type Look } from './board-view';
import { categoryOf, makeJira, type Board, type Jira, type RawIssue, type Wire } from './data';
import { closeSlabs, gold, h, saidBack, slabsUp } from './dom';
import { issueView } from './issue-view';

export type { Lit } from './board-view';

/**
 * Jira, written into the yard at night.
 *
 * Everything Jira's own board does is here: its columns and limits, its
 * sprint, filters and grouping, every card's epic, type, priority, points,
 * due date, subtasks and flag, dragging to move and rank, and every field of
 * a ticket changed in place. It is drawn the village's way rather than
 * Jira's: tickets are notes pinned to posts in the answer's own face, done
 * work is weathered slips, epics are tape and beams, every menu a slab, and
 * the village stays dimmed behind it with the rack still up. What the village
 * adds sits on top: "take it on", and the lantern of whichever session is
 * working on a ticket.
 */

export interface JiraHands {
  wire: Wire;
  close(): void;
  take(site: string, key: string): void;
  go(task: string): void;
  outside(url: string): void;
  connect(): void;
  sites(): Promise<{ site: string; who: string }[]>;
  boards(query: string): Promise<JiraBoardPick[] | string>;
  link(to: JiraLink | null): Promise<void>;
  /** The village dimmed behind it, everything but the rack put away, and back. */
  backdrop(on: boolean): void;
}

export interface Ticket {
  summary: string;
  description: string;
  category: string;
}

export interface JiraSurface {
  readonly up: boolean;
  open(at: { project: string; link: JiraLink | null }): void;
  close(): void;
  lit(map: Record<string, Lit>): void;
  ticket(site: string, key: string): Promise<Ticket | null>;
  /** Out of to-do and into the board's first column that is under way. */
  start(site: string, key: string): Promise<void>;
}

const enc = encodeURIComponent;

export function makeJiraSurface(hands: JiraHands): JiraSurface {
  const root = h('div', 'jr');
  root.tabIndex = -1;
  root.style.display = 'none';
  /* Everything on Jira is Jira's: the village's own keys and pointer sit on
     the window, under this. */
  const pop = h('div', 'jr-pop');
  pop.tabIndex = -1;
  /* A ticket is a window over the board, the way a project's settings are,
     and the board stays where it was under it. */
  const popBack = h('div', 'jr-popback', pop);
  popBack.style.display = 'none';
  for (const el of [root, popBack])
    for (const kind of ['keydown', 'keyup', 'pointerdown', 'pointerup', 'mousedown', 'click', 'wheel', 'dblclick', 'contextmenu'] as const)
      el.addEventListener(kind, (event) => event.stopPropagation());
  let downOutside = false;
  popBack.addEventListener('pointerdown', (event) => {
    downOutside = event.target === popBack;
  });
  popBack.addEventListener('click', (event) => {
    if (downOutside && event.target === popBack && !slabsUp()) shut();
    downOutside = false;
  });
  document.body.append(root, popBack);

  /** Where the yard leaves room for it: under the yard's own heading, over its rail. */
  const room = (): void => {
    const yard = document.querySelector('.yard');
    const head = yard?.querySelector('[data-stays="rule:head"]')?.getBoundingClientRect();
    const signs = yard?.querySelector('[data-stays="signs"]')?.getBoundingClientRect();
    const rail = yard?.querySelector('[data-stays="rail"]')?.getBoundingClientRect();
    const top = Math.max(head?.bottom ?? 120, signs?.height ? signs.bottom : 0) + 16;
    const bottom = rail?.height ? window.innerHeight - rail.top + 8 : 40;
    root.style.top = `${top}px`;
    root.style.bottom = `${bottom}px`;
    root.style.left = `${head?.width ? head.left : 40}px`;
    root.style.right = `${head?.width ? window.innerWidth - head.right : 40}px`;
  };
  window.addEventListener('resize', () => {
    if (up) room();
  });

  let up = false;
  let project = '';
  let link: JiraLink | null = null;
  let jira: Jira | null = null;
  let board: Board | null = null;
  let lit: Record<string, Lit> = {};
  let filters: Filters = noFilters();
  const look: Look = readLook();
  let loading = 0;
  let me: string | undefined;
  /** What is open over the board, the newest last; Escape walks back down it. */
  let trail: { key: string; view: ReturnType<typeof issueView> }[] = [];
  let shown: ReturnType<typeof boardView> | null = null;
  const recent = new Map<string, { statusId: string; at: number }>();
  /** The board picker is up; nothing read in the meantime is drawn over it. */
  let picking = false;

  const said = (text: string, sore = false): void => saidBack(trail.length ? popBack : root, text, sore);
  const failed = (cause: unknown): string => (cause instanceof Error ? cause.message : 'Jira did not answer.');

  /** A page of its own over the village with only a few words on it. */
  const quiet = (title: string, ...lines: (Node | string | null)[]): void => {
    shut();
    shown = null;
    const top = h('div', 'jr-top', h('div', 'jr-here sh', h('span', 'where', `${project}’s jira`), h('span', 'jr-sub', title)));
    const body = h('div', 'jr-body', h('div', 'jr-quiet sh', ...lines));
    root.replaceChildren(top, body);
  };

  // ── the board ───────────────────────────────────────────────────────────
  const loadBoard = async (quietly = false): Promise<void> => {
    if (!jira || !link) return;
    const mine = ++loading;
    if (!quietly && !board) quiet('reading the board…');
    try {
      const got =
        link.board === undefined
          ? await jira.projectBoard(link.key)
          : await jira.board(link.board, [...filters.quick], filters.jql);
      if (mine !== loading) return;
      /* Jira's board feed lags a move by a few seconds; what was just moved
         here stays where it was put until the feed agrees. */
      const now = Date.now();
      for (const [key, was] of recent) {
        const card = got.cards.find((one) => one.key === key);
        if (now - was.at > 60_000 || !card || card.statusId === was.statusId) recent.delete(key);
        else {
          card.statusId = was.statusId;
          card.category = got.columns.find((column) => column.statuses.includes(was.statusId))?.category ?? card.category;
        }
      }
      board = got;
      me = got.me;
      paintBoard();
    } catch (cause) {
      if (mine !== loading) return;
      if (filters.jql && board) {
        said(`that jql: ${failed(cause)}`, true);
        filters.jql = '';
        return;
      }
      if (!quietly)
        quiet(
          'Jira would not hand this board over',
          h('div', 'sore', failed(cause)),
          h('div', 'acts', gold('try again', () => void loadBoard()), gold('pick another board', () => showPicker()))
        );
    }
  };

  const boardHands: BoardHands = {
    open: (key) => openIssue(key),
    go: (task) => hands.go(task),
    take: (key) => jira && hands.take(jira.site, key),
    move: (key, column, before, after) => moveCard(key, column, before, after),
    reload: (quietly) => loadBoard(quietly),
    moved: (key, statusId) => recent.set(key, { statusId, at: Date.now() }),
    pickBoard: () => showPicker(),
    outside: hands.outside,
    said,
  };

  const paintBoard = (): void => {
    if (!jira || !board || picking) return;
    const keep = root.querySelector<HTMLInputElement>('.jr-find');
    const typing = keep && document.activeElement === keep;
    const at = typing ? keep.selectionStart : null;
    shown = boardView(jira, board, () => lit, filters, look, root, boardHands);
    root.replaceChildren(shown.top, shown.body);
    if (typing) {
      const find = root.querySelector<HTMLInputElement>('.jr-find');
      find?.focus();
      if (find && at !== null) find.setSelectionRange(at, at);
    }
  };

  const moveCard = async (key: string, column: number, before?: string, after?: string): Promise<void> => {
    const j = jira;
    const b = board;
    const to = b?.columns[column];
    const card = b?.cards.find((one) => one.key === key);
    if (!j || !b || !to || !card) return;
    const moving = !to.statuses.includes(card.statusId);
    /* It goes where it was let go at once; Jira catches up. */
    b.cards.splice(b.cards.indexOf(card), 1);
    if (moving) {
      card.statusId = to.statuses[0] ?? card.statusId;
      card.category = to.category;
    }
    const at = before ? b.cards.findIndex((one) => one.key === before) : -1;
    if (at >= 0) b.cards.splice(at, 0, card);
    else {
      const last = after ? b.cards.findIndex((one) => one.key === after) : -1;
      b.cards.splice(last >= 0 ? last + 1 : b.cards.length, 0, card);
    }
    paintBoard();
    try {
      const went = moving ? await j.move(key, to.statuses) : null;
      if (went === false) said(`Jira's workflow won't let ${key} go straight to ${to.name.toLowerCase()}`, true);
      else {
        if (went) recent.set(key, { statusId: went, at: Date.now() });
        if ((before || after) && b.rank) await j.rank(key, before, before ? undefined : after);
        if (moving) said(`${key} is ${to.name.toLowerCase()} now`);
      }
    } catch (cause) {
      said(failed(cause), true);
    }
    await loadBoard(true);
  };

  // ── a ticket over it ────────────────────────────────────────────────────
  const openIssue = (key: string): void => {
    const j = jira;
    if (!j) return;
    closeSlabs();
    const view = issueView(
      j,
      key,
      { ...(board ? { board } : {}), ...(me ? { me } : {}), lit: () => lit, host: popBack, ...(trail.length ? { from: trail[trail.length - 1]!.key } : {}) },
      {
        take: (k) => hands.take(j.site, k),
        go: (task) => hands.go(task),
        back: () => back(),
        changed: () => void loadBoard(true),
        open: (k) => openIssue(k),
        only: (epic) => {
          filters.epics = new Set([epic]);
          shut();
          paintBoard();
        },
        close: () => shut(),
        outside: hands.outside,
        said,
      }
    );
    trail = trail.filter((one) => one.key !== key);
    trail.push({ key, view });
    const opening = popBack.style.display === 'none';
    pop.replaceChildren(view.top, view.body);
    popBack.style.display = 'flex';
    if (opening) {
      popBack.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
      pop.animate([{ transform: 'translateY(8px) scale(0.99)' }, { transform: 'none' }], { duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
    pop.focus();
  };

  /** One step back: to the ticket before, or off the board's window altogether. */
  const back = (): void => {
    closeSlabs();
    trail.pop();
    const last = trail[trail.length - 1];
    if (last) {
      pop.replaceChildren(last.view.top, last.view.body);
      last.view.refresh();
      pop.focus();
    } else shut();
  };

  /** The ticket window put away, the board as it was under it. */
  function shut(): void {
    if (popBack.style.display === 'none') return;
    closeSlabs();
    trail = [];
    popBack.style.display = 'none';
    pop.replaceChildren();
    root.focus();
  }

  // ── no board yet ────────────────────────────────────────────────────────
  const showPicker = (): void => {
    closeSlabs();
    picking = true;
    const search = h('input', 'jr-find');
    search.placeholder = 'a board or project, or paste its link…';
    search.style.width = '420px';
    const list = h('div', 'jr-picks', h('div', 'jr-wait', 'asking Jira…'));
    let asked = 0;
    let wait: number | undefined;
    const find = async (): Promise<void> => {
      const mine = ++asked;
      const got = await hands.boards(search.value.trim());
      if (mine !== asked) return;
      if (typeof got === 'string') {
        list.replaceChildren(h('div', 'sore', got));
        return;
      }
      if (!got.length) {
        list.replaceChildren(h('div', 'jr-wait', search.value.trim() ? 'no board by that name' : 'none of your tickets are on a board yet. look one up.'));
        return;
      }
      list.replaceChildren(
        ...got.map((one) => {
          const row = h('div', 'pick', h('b', '', one.name), h('small', '', `${one.project} · ${one.key} · ${one.site.replace('.atlassian.net', '')}`));
          row.addEventListener('click', () => void choose({ site: one.site, key: one.key, board: one.board, name: one.name }));
          return row;
        })
      );
    };
    search.addEventListener('input', () => {
      window.clearTimeout(wait);
      wait = window.setTimeout(() => void find(), 300);
    });
    search.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        window.clearTimeout(wait);
        void find().then(() => (list.querySelector('.pick') as HTMLElement | null)?.click());
      }
    });
    quiet(
      `which board is ${project}’s?`,
      h('div', 'big', 'the boards your tickets are on'),
      search,
      list,
      link && board
        ? gold('keep the one it has', () => {
            picking = false;
            paintBoard();
          })
        : null
    );
    search.focus();
    void find();
  };

  const choose = async (to: JiraLink): Promise<void> => {
    picking = false;
    await hands.link(to);
    link = to;
    jira = makeJira(hands.wire, to.site);
    filters = noFilters();
    board = null;
    await loadBoard();
  };

  const start = async (): Promise<void> => {
    quiet('opening Jira…');
    const sites = await hands.sites();
    if (!sites.length) {
      jira = null;
      board = null;
      quiet(
        'connect Jira first',
        'Nothing on this Mac is connected to a Jira site yet. It takes the site, your email and an API token, kept in the windmill.',
        h('div', 'acts', gold('connect a jira site', () => hands.connect()))
      );
      return;
    }
    if (!link) {
      jira = makeJira(hands.wire, sites[0]!.site);
      showPicker();
      return;
    }
    if (!sites.some((one) => one.site === link?.site)) {
      quiet(
        `${link.site} isn’t connected on this Mac`,
        h('div', 'acts', gold('connect it', () => hands.connect()), gold('pick another board', () => showPicker()))
      );
      return;
    }
    jira = makeJira(hands.wire, link.site);
    await loadBoard();
  };

  // ── keys ────────────────────────────────────────────────────────────────
  const keys = (event: KeyboardEvent): void => {
    const typing = (event.target as HTMLElement).closest('input,textarea,select,[contenteditable]');
    if (event.key === 'Escape') {
      event.preventDefault();
      if (typing && (typing as HTMLInputElement).value) return;
      if (typing) (typing as HTMLElement).blur();
      else if (trail.length) back();
      else hands.close();
      return;
    }
    if (event.metaKey && event.key.toLowerCase() === 'w') {
      event.preventDefault();
      hands.close();
      return;
    }
    if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === '/' || (event.key === 'f' && !trail.length)) {
      event.preventDefault();
      (trail.length ? pop : root).querySelector<HTMLElement>('.jr-find, .jr-line input')?.focus();
    } else if (event.key === 'r' && trail.length) {
      event.preventDefault();
      pop.querySelector<HTMLElement>('.jr-line input')?.focus();
    }
  };
  root.addEventListener('keydown', keys);
  pop.addEventListener('keydown', keys);

  /* It is everybody's board: a teammate moving a ticket moves it here too. */
  window.setInterval(() => {
    if (!up || !board || document.hidden || slabsUp()) return;
    if (document.querySelector('.jr .dragging, .jr .jr-note.blank, .jr-pop .jr-row input, .jr-pop .jr-row textarea, .jr-pop .jr-ask textarea, .jr-pop .jr-said textarea, .jr-pop .jr-here input')) return;
    void loadBoard(true);
    trail[trail.length - 1]?.view.refresh();
  }, 30_000);

  return {
    get up() {
      return up;
    },
    open: (at) => {
      const same = at.project === project && JSON.stringify(at.link) === JSON.stringify(link) && board;
      project = at.project;
      link = at.link;
      up = true;
      hands.backdrop(true);
      root.style.display = 'flex';
      room();
      root.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)' });
      root.focus();
      if (same) {
        void loadBoard(true);
        return;
      }
      filters = noFilters();
      board = null;
      shut();
      picking = false;
      void start();
    },
    close: () => {
      if (!up) return;
      up = false;
      shut();
      closeSlabs();
      root.style.display = 'none';
      hands.backdrop(false);
      (document.activeElement as HTMLElement | null)?.blur();
    },
    lit: (map) => {
      if (JSON.stringify(map) === JSON.stringify(lit)) return;
      lit = map;
      if (up && board) shown?.paint();
    },
    ticket: async (site, key) => {
      const j = jira?.site === site ? jira : makeJira(hands.wire, site);
      try {
        const got = await j.get<RawIssue>(`/rest/api/3/issue/${key}?fields=summary,status,description`);
        return {
          summary: (got.fields.summary as string) ?? '',
          description: adfToMarkdown(got.fields.description),
          category: categoryOf(got.fields.status?.statusCategory?.key),
        };
      } catch {
        return null;
      }
    },
    start: async (site, key) => {
      const j = jira?.site === site ? jira : makeJira(hands.wire, site);
      const working = board?.columns.find((column) => column.category === 'indeterminate' && !/block/i.test(column.name));
      if (working) {
        await j.move(key, working.statuses).catch(() => false);
      } else {
        const got = await j
          .get<{ transitions: { id: string; to?: { statusCategory?: { key?: string } } }[] }>(`/rest/api/3/issue/${enc(key)}/transitions`)
          .catch(() => null);
        const step = got?.transitions.find((one) => one.to?.statusCategory?.key === 'indeterminate');
        if (step) await j.send('POST', `/rest/api/3/issue/${enc(key)}/transitions`, { transition: { id: step.id } }).catch(() => undefined);
      }
      void loadBoard(true);
    },
  };
}

/** What a session taking a ticket on is told first, by the windmill's recipe. */
export function briefOf(
  recipe: string,
  t: { key: string; summary: string; url: string; description: string }
): string {
  return recipe
    .replaceAll('{key}', t.key)
    .replaceAll('{summary}', t.summary)
    .replaceAll('{url}', t.url)
    .replaceAll('{description}', t.description || '(no description)')
    .trim();
}
