import './jira.css';
import { adfToMarkdown } from '@shared/jira-adf';
import type { JiraBoardPick, JiraLink } from '@shared/jira';
import { boardView, noFilters, type Filters, type Lit } from './board-view';
import { createView } from './create-view';
import { categoryOf, makeJira, type Board, type Jira, type RawIssue, type Wire } from './data';
import { button, h, icon, JIRA_MARK, menu } from './dom';
import { issueView } from './issue-view';

export type { Lit } from './board-view';

/**
 * Jira, over the village, drawn the way Jira draws itself.
 *
 * The board is Jira's: its columns, its sprint, its quick filters, every card
 * with its epic, type, priority, points and assignee, and the full issue view
 * with every field down the right, each one changed in place. What the village
 * adds sits on top of that rather than instead of it: "take it on" on a card
 * and on a ticket, and the light of whichever session is working on one.
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
  for (const kind of ['keydown', 'keyup', 'pointerdown', 'pointerup', 'mousedown', 'click', 'wheel', 'dblclick', 'contextmenu'] as const)
    root.addEventListener(kind, (event) => event.stopPropagation());
  document.body.append(root);

  const top = h('div', 'jr-top');
  const body = h('div', 'jr-main');
  root.append(top, body);

  let up = false;
  let project = '';
  let link: JiraLink | null = null;
  let jira: Jira | null = null;
  let board: Board | null = null;
  let lit: Record<string, Lit> = {};
  let filters: Filters = noFilters();
  let modal: { el: HTMLElement; refresh?: () => void; key?: string } | null = null;
  let loading = 0;
  let me: string | undefined;
  const progress = h('div', 'jr-progress');

  const busy = (on: boolean): void => {
    if (on) root.append(progress);
    else progress.remove();
  };

  const toast = (said: string, sore = false): void => {
    const t = h('div', `jr-toast${sore ? ' sore' : ''}`, said);
    root.append(t);
    setTimeout(() => t.remove(), sore ? 6000 : 2400);
  };

  const failed = (cause: unknown): string =>
    cause instanceof Error ? cause.message : 'Jira did not answer.';

  // ── top bar ─────────────────────────────────────────────────────────────
  const paintTop = (): void => {
    const logo = h('div', 'jr-logo');
    logo.innerHTML = JIRA_MARK;
    logo.append(`${project}’s Jira`);
    const back = button('‹ Mender', 'subtle', () => hands.close());
    back.title = 'Back to the village (Esc)';
    const items: (HTMLElement | null)[] = [back, logo, h('div', 'jr-spacer')];
    if (jira) {
      const find = h('input', 'jr-search');
      find.placeholder = 'Search Jira';
      const j = jira;
      let closeMenu: (() => void) | null = null;
      find.addEventListener('focus', () => {
        closeMenu?.();
        closeMenu = menu(root, find, async (q) => {
          const text = (find.value || q).trim().replace(/"/g, '');
          if (!text) return [];
          const jql = /^[A-Z][A-Z0-9_]+-\d+$/i.test(text)
            ? `key = "${text.toUpperCase()}"`
            : `text ~ "${text}*" ORDER BY updated DESC`;
          const got = await j.send<{ issues: RawIssue[] }>('POST', '/rest/api/3/search/jql', {
            jql,
            fields: ['summary', 'issuetype', 'status'],
            maxResults: 20,
          });
          return got.issues.map((one) => ({
            label: h(
              'span',
              '',
              icon(j, one.fields.issuetype?.iconUrl, ''),
              ` `,
              h('b', '', one.key),
              ` ${one.fields.summary ?? ''}`
            ),
            text: one.key,
            pick: () => {
              find.value = '';
              find.blur();
              openIssue(one.key);
            },
          }));
        }, false);
      });
      find.addEventListener('input', () => {
        find.dispatchEvent(new Event('focus'));
      });
      items.push(find);
    }
    if (board) {
      const change = button('Change board', 'subtle', () => showPicker());
      change.title = `Tie ${project} to another Jira board`;
      items.push(change);
      items.push(button('Create', 'primary', () => openCreate(0)));
    }
    items.push(
      button('Open in Jira ↗', 'subtle', () =>
        hands.outside(
          link?.board !== undefined
            ? `https://${link.site}/jira/software/c/projects/${link.key}/boards/${link.board}`
            : link
              ? `https://${link.site}/browse/${link.key}`
              : 'https://start.atlassian.com/'
        )
      )
    );
    top.replaceChildren(...items.filter((x): x is HTMLElement => Boolean(x)));
  };

  // ── board ─────────────────────────────────────────────────────────────
  const loadBoard = async (quiet = false): Promise<void> => {
    if (!jira || !link) return;
    const mine = ++loading;
    if (!quiet) busy(true);
    try {
      const got =
        link.board === undefined
          ? await jira.projectBoard(link.key)
          : await jira.board(link.board, [...filters.quick]);
      if (mine !== loading) return;
      board = got;
      me = got.me;
      paintTop();
      paintBoard();
    } catch (cause) {
      if (mine !== loading) return;
      if (!quiet) {
        body.replaceChildren(
          h(
            'div',
            'jr-note',
            h('h2', '', 'Jira would not hand this board over'),
            h('div', 'sore', failed(cause)),
            h('div', 'jr-row-actions', button('Try again', 'primary', () => void loadBoard()), button('Pick another board', '', () => showPicker()))
          )
        );
      }
    } finally {
      if (mine === loading) busy(false);
    }
  };

  const paintBoard = (): void => {
    if (!jira || !board) return;
    const b = board;
    const j = jira;
    body.replaceChildren(
      boardView(
        j,
        b,
        lit,
        filters,
        {
          open: (key) => openIssue(key),
          take: (key) => hands.take(j.site, key),
          move: (key, column, before, after) => void moveCard(key, column, before, after),
          create: (column) => openCreate(column),
          quick: () => void loadBoard(),
          changed: () => paintBoard(),
        },
        root
      )
    );
  };

  const moveCard = async (key: string, column: number, before?: string, after?: string): Promise<void> => {
    const j = jira;
    const b = board;
    const to = b?.columns[column];
    const card = b?.cards.find((one) => one.key === key);
    if (!j || !b || !to || !card) return;
    const moving = !to.statuses.includes(card.statusId);
    /* It goes where it was let go at once; Jira catches up. */
    const was = { statusId: card.statusId, category: card.category, at: b.cards.indexOf(card) };
    b.cards.splice(was.at, 1);
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
    busy(true);
    try {
      if (moving && !(await j.move(key, to.statuses))) {
        toast(`Jira's workflow won't let ${key} go straight to ${to.name}.`, true);
      } else if ((before || after) && b.rank) await j.rank(key, before, before ? undefined : after);
    } catch (cause) {
      toast(failed(cause), true);
    }
    await loadBoard(true);
    busy(false);
  };

  // ── modals ────────────────────────────────────────────────────────────
  const closeModal = (): void => {
    modal?.el.remove();
    modal = null;
    root.focus();
  };

  const openIssue = (key: string): void => {
    const j = jira;
    if (!j) return;
    closeModal();
    const view = issueView(
      j,
      key,
      { ...(board ? { board } : {}), ...(me ? { me } : {}), lit: () => lit, overlay: root },
      {
        take: (k) => hands.take(j.site, k),
        go: (task) => hands.go(task),
        close: closeModal,
        changed: () => void loadBoard(true),
        open: (k) => openIssue(k),
        outside: hands.outside,
        toast,
      }
    );
    modal = { el: view.el, refresh: view.refresh, key };
    root.append(view.el);
  };

  const openCreate = (column: number): void => {
    const j = jira;
    const b = board;
    if (!j || !b) return;
    closeModal();
    const el = createView(j, b, column, { overlay: root, ...(me ? { me } : {}) }, {
      close: closeModal,
      made: (key) => {
        closeModal();
        void loadBoard(true).then(() => openIssue(key));
      },
      toast,
    });
    modal = { el };
    root.append(el);
  };

  // ── no board yet ─────────────────────────────────────────────────────
  const showPicker = (): void => {
    closeModal();
    board = null;
    paintTop();
    const search = h('input', 'jr-input');
    search.placeholder = 'Board or project name, or paste a board’s link';
    search.style.maxWidth = '480px';
    const list = h('div', 'jr-picks', h('div', 'jr-hint', 'Asking Jira…'));
    let asked = 0;
    let wait: number | undefined;
    const find = async (): Promise<void> => {
      const mine = ++asked;
      const got = await hands.boards(search.value.trim());
      if (mine !== asked) return;
      if (typeof got === 'string') {
        list.replaceChildren(h('div', 'jr-note sore', got));
        return;
      }
      if (!got.length) {
        list.replaceChildren(h('div', 'jr-hint', search.value.trim() ? 'No board by that name.' : 'None of your tickets are on a board yet. Search for one.'));
        return;
      }
      list.replaceChildren(
        ...got.map((one) => {
          const row = h(
            'div',
            'jr-pick',
            h('div', '', h('div', '', one.name), h('div', 'sub', `${one.project} · ${one.key} · ${one.site.replace('.atlassian.net', '')}`))
          );
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
        void find().then(() => (list.querySelector('.jr-pick') as HTMLElement | null)?.click());
      }
    });
    body.replaceChildren(
      h(
        'div',
        'jr-note',
        h('h2', '', `Which board is ${project}’s?`),
        h('div', '', 'The boards your tickets are on. Search for any other, or paste its link.'),
        h('div', '', search),
        list,
        link ? button('Keep the one it has', 'subtle', () => void loadBoard()) : null
      )
    );
    search.focus();
    void find();
  };

  const choose = async (to: JiraLink): Promise<void> => {
    await hands.link(to);
    link = to;
    jira = makeJira(hands.wire, to.site);
    filters = noFilters();
    await loadBoard();
  };

  const start = async (): Promise<void> => {
    body.replaceChildren(h('div', 'jr-loading', 'Opening Jira…'));
    const sites = await hands.sites();
    if (!sites.length) {
      jira = null;
      board = null;
      paintTop();
      body.replaceChildren(
        h(
          'div',
          'jr-note',
          h('h2', '', 'Connect Jira first'),
          h('div', '', 'Nothing on this Mac is connected to a Jira site yet. It takes your site, your email and an API token.'),
          h('div', 'jr-row-actions', button('Connect a Jira site', 'primary', () => hands.connect()))
        )
      );
      return;
    }
    if (!link) {
      jira = makeJira(hands.wire, sites[0]!.site);
      showPicker();
      return;
    }
    if (!sites.some((one) => one.site === link?.site)) {
      paintTop();
      body.replaceChildren(
        h(
          'div',
          'jr-note',
          h('h2', '', `${link.site} isn’t connected on this Mac`),
          h('div', 'jr-row-actions', button('Connect it', 'primary', () => hands.connect()), button('Pick another board', '', () => showPicker()))
        )
      );
      return;
    }
    jira = makeJira(hands.wire, link.site);
    paintTop();
    await loadBoard();
  };

  // ── keys ──────────────────────────────────────────────────────────────
  root.addEventListener('keydown', (event) => {
    const typing = (event.target as HTMLElement).closest('input,textarea,select,[contenteditable]');
    if (event.key === 'Escape') {
      event.preventDefault();
      if (typing) (typing as HTMLElement).blur();
      else if (modal) closeModal();
      else hands.close();
      return;
    }
    if (event.metaKey && event.key.toLowerCase() === 'w') {
      event.preventDefault();
      hands.close();
      return;
    }
    if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'c' && board && !modal) {
      event.preventDefault();
      openCreate(0);
    } else if (event.key === '/') {
      event.preventDefault();
      (top.querySelector('.jr-search') as HTMLElement | null)?.focus();
    }
  });

  /* It is everybody's board: a teammate moving a ticket moves it here too. */
  window.setInterval(() => {
    if (!up || !board || document.hidden) return;
    if (root.querySelector('.jr-menu, .jr-card.dragging')) return;
    void loadBoard(true);
    modal?.refresh?.();
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
      root.style.display = 'flex';
      root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 140, easing: 'ease-out' });
      root.focus();
      if (same) {
        void loadBoard(true);
        return;
      }
      filters = noFilters();
      board = null;
      closeModal();
      void start();
    },
    close: () => {
      if (!up) return;
      up = false;
      closeModal();
      root.style.display = 'none';
      (document.activeElement as HTMLElement | null)?.blur();
    },
    lit: (map) => {
      if (JSON.stringify(map) === JSON.stringify(lit)) return;
      lit = map;
      if (up && board && !root.querySelector('.jr-card.dragging')) paintBoard();
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
      const working = board?.columns.find((column) => column.category === 'indeterminate');
      if (working) {
        await j.move(key, working.statuses).catch(() => false);
      } else {
        const got = await j
          .get<{ transitions: { id: string; to?: { statusCategory?: { key?: string } } }[] }>(
            `/rest/api/3/issue/${enc(key)}/transitions`
          )
          .catch(() => null);
        const step = got?.transitions.find((one) => one.to?.statusCategory?.key === 'indeterminate');
        if (step)
          await j.send('POST', `/rest/api/3/issue/${enc(key)}/transitions`, { transition: { id: step.id } }).catch(() => undefined);
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
