import './jira.css';
import { adfToMarkdown } from '@shared/jira-adf';
import { JIRA_PARTITION, type JiraLink } from '@shared/jira';
import { categoryOf, makeJira, type RawIssue, type Wire } from './data';
import { PAGE_CSS, PAGE_JS, PAGE_SAYS } from './page';

/**
 * Jira's own board, in a window over the village.
 *
 * Not drawn by us any more: it is the real site, signed in with the token the
 * windmill holds, with its own navigation taken off so all that is left is
 * the board and its tickets (see page.ts). The window is the same one a
 * project's settings open in, the village dimmed behind it, and over the page
 * runs one strip of the village's own: whose Jira it is, whichever ticket is
 * open with "launch" beside it, how many are picked with "launch these", and
 * the way out.
 *
 * The page is made once and kept, hidden, so opening it again is instant and
 * finds it where it was left.
 */

export interface JiraHands {
  wire: Wire;
  close(): void;
  /** One ticket: its own workspace, and you standing in it. */
  take(site: string, key: string): void;
  /** Several: each its own workspace, launched one after another, while you stay on the board. */
  takeMany(site: string, keys: string[], progress: (said: string) => void): Promise<void>;
  go(task: string): void;
  connect(): void;
  sites(): Promise<{ site: string; who: string }[]>;
  link(to: JiraLink | null): Promise<void>;
  /** The village dimmed behind it, everything but the rack put away, and back. */
  backdrop(on: boolean): void;
}

export interface Lit {
  task: string;
  name: string;
  mood: string;
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
  /** Out of to-do and into the first status that is under way. */
  start(site: string, key: string): Promise<void>;
}

type WebView = HTMLElement & {
  src: string;
  getURL(): string;
  loadURL(url: string): Promise<void>;
  insertCSS(css: string): Promise<string>;
  executeJavaScript(code: string): Promise<unknown>;
  focus(): void;
};

const enc = encodeURIComponent;

const h = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls = '',
  ...children: (Node | string | null | undefined)[]
): HTMLElementTagNameMap[K] => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  for (const child of children) if (child) el.append(child);
  return el;
};

const gold = (text: string, act: () => void): HTMLSpanElement => {
  const el = h('span', 'gold', text);
  el.addEventListener('click', (event) => {
    event.stopPropagation();
    act();
  });
  return el;
};

/** Which board a Jira address is, if it is one. */
export function boardOfUrl(url: string): { site: string; key: string; board: number } | null {
  try {
    const at = new URL(url);
    const got = at.pathname.match(/\/jira\/software\/(?:c\/)?projects\/([^/]+)\/boards\/(\d+)/);
    return got ? { site: at.host, key: got[1]!, board: Number(got[2]) } : null;
  } catch {
    return null;
  }
}

/** Which ticket a Jira address has open, if any. */
export function ticketOfUrl(url: string): string | null {
  try {
    const at = new URL(url);
    return (
      at.searchParams.get('selectedIssue') ??
      at.pathname.match(/\/browse\/([A-Z][A-Z0-9_]*-\d+)/)?.[1] ??
      null
    );
  } catch {
    return null;
  }
}

export function makeJiraSurface(hands: JiraHands): JiraSurface {
  const shade = h('div', 'jr');
  shade.style.display = 'none';
  const root = h('div', 'jr-win jr-web');
  root.tabIndex = -1;
  shade.append(root);
  for (const kind of ['keydown', 'keyup', 'pointerdown', 'pointerup', 'mousedown', 'click', 'wheel', 'dblclick', 'contextmenu'] as const)
    shade.addEventListener(kind, (event) => event.stopPropagation());
  let downOff = false;
  shade.addEventListener('pointerdown', (event) => {
    downOff = event.target === shade;
  });
  shade.addEventListener('click', (event) => {
    if (downOff && event.target === shade) hands.close();
    downOff = false;
  });
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' || (event.metaKey && event.key.toLowerCase() === 'w')) {
      event.preventDefault();
      hands.close();
    }
  });
  document.body.append(shade);

  const where = h('span', 'where');
  const open = h('div', 'jr-strip-open');
  const picks = h('div', 'jr-strip-picks');
  const said = h('div', 'jr-strip-said');
  const x = h('button', 'jr-x', '×');
  x.title = 'put it away';
  x.addEventListener('click', () => hands.close());
  const strip = h('div', 'jr-strip', h('div', 'jr-here', where), open, picks, said, h('div', 'jr-gap'), x);
  const stage = h('div', 'jr-stage');
  root.append(strip, stage);

  let up = false;
  let project = '';
  let link: JiraLink | null = null;
  let site = '';
  let lit: Record<string, Lit> = {};
  let picked: string[] = [];
  let launching = false;
  let view: WebView | null = null;
  let ready = false;
  let saidTimer: number | undefined;

  const tell = (text: string, sore = false, stay = false): void => {
    window.clearTimeout(saidTimer);
    said.textContent = text;
    said.classList.toggle('sore', sore);
    if (!stay) saidTimer = window.setTimeout(() => (said.textContent = ''), sore ? 12_000 : 4000);
  };

  const urlOf = (): string => {
    if (link?.url && boardOfUrl(link.url)?.site === site) return link.url;
    if (link && link.site === site && link.board !== undefined)
      return `https://${site}/jira/software/projects/${enc(link.key)}/boards/${link.board}`;
    if (link && link.site === site) return `https://${site}/jira/software/projects/${enc(link.key)}/boards`;
    return `https://${site}/jira/projects`;
  };

  const push = (): void => {
    if (!view || !ready) return;
    void view.executeJavaScript(`window.__mender && window.__mender.set(${JSON.stringify({ lit })})`).catch(() => undefined);
  };

  const launch = async (keys: string[]): Promise<void> => {
    if (!keys.length || launching) return;
    if (keys.length === 1) {
      hands.take(site, keys[0]!);
      return;
    }
    launching = true;
    paintStrip();
    try {
      await hands.takeMany(site, keys, (text) => tell(text, false, true));
      tell(`launched ${keys.length}, each in its own workspace`);
    } finally {
      launching = false;
      /* Jira's board doesn't hear about moves made over its API until it is read again. */
      (view as (WebView & { reload(): void }) | null)?.reload();
      paintStrip();
    }
  };

  const paintStrip = (): void => {
    where.textContent = `${project}’s jira`;
    const current = view && ready ? view.getURL() : '';
    const key = current ? ticketOfUrl(current) : null;
    open.replaceChildren();
    if (key) {
      const on = lit[key];
      open.append(
        h('span', 'k', key),
        on
          ? gold(`${on.name}, walk in`, () => hands.go(on.task))
          : gold('launch it', () => void launch([key]))
      );
    }
    picks.replaceChildren();
    if (picked.length && !launching)
      picks.append(
        h('span', 'k', `${picked.length} picked`),
        gold(picked.length === 1 ? 'launch it' : 'launch these', () => void launch([...picked])),
        gold('let go', () => void view?.executeJavaScript('window.__mender && window.__mender.clear()'))
      );
  };

  const remember = (url: string): void => {
    const board = boardOfUrl(url);
    if (!board) return;
    const clean = new URL(url);
    clean.search = '';
    const to: JiraLink = { site: board.site, key: board.key, board: board.board, url: clean.toString() };
    if (link && link.site === to.site && link.board === to.board && link.url === to.url) return;
    link = { ...link, ...to };
    void hands.link(link);
  };

  const make = (): WebView => {
    const el = document.createElement('webview') as WebView;
    el.setAttribute('partition', JIRA_PARTITION);
    el.setAttribute('allowpopups', '');
    el.className = 'jr-page';
    el.addEventListener('dom-ready', () => {
      ready = true;
      picked = [];
      void el.insertCSS(PAGE_CSS);
      void el.executeJavaScript(PAGE_JS).then(push, () => undefined);
      paintStrip();
    });
    const moved = (): void => {
      if (!ready) return;
      remember(el.getURL());
      paintStrip();
    };
    el.addEventListener('did-navigate', moved);
    el.addEventListener('did-navigate-in-page', moved);
    el.addEventListener('did-fail-load', (event) => {
      const failed = event as unknown as { errorCode: number; isMainFrame: boolean; errorDescription: string };
      if (failed.isMainFrame && failed.errorCode !== -3) tell(`Jira didn’t load: ${failed.errorDescription}`, true, true);
    });
    el.addEventListener('console-message', (event) => {
      const message = (event as unknown as { message: string }).message;
      if (!message.startsWith(PAGE_SAYS)) return;
      let what: { launch?: string[]; picked?: string[]; go?: string; escape?: boolean };
      try {
        what = JSON.parse(message.slice(PAGE_SAYS.length));
      } catch {
        return;
      }
      if (what.launch) void launch(what.launch);
      else if (what.picked) {
        picked = what.picked;
        paintStrip();
      } else if (what.go) hands.go(what.go);
      else if (what.escape) hands.close();
    });
    return el;
  };

  const show = async (): Promise<void> => {
    const sites = await hands.sites();
    if (!up) return;
    const wanted = link?.site && sites.some((one) => one.site === link?.site) ? link.site : sites[0]?.site;
    if (!wanted) {
      view?.remove();
      view = null;
      ready = false;
      stage.replaceChildren(
        h(
          'div',
          'jr-quiet sh',
          'Nothing on this Mac is connected to a Jira site yet. It takes the site, your email and an API token, kept in the windmill.',
          h('div', 'acts', gold('connect a jira site', () => hands.connect()))
        )
      );
      return;
    }
    const goTo = wanted !== site || !view;
    site = wanted;
    if (!view) {
      view = make();
      stage.replaceChildren(view);
    } else if (!stage.contains(view)) stage.replaceChildren(view);
    if (goTo) {
      ready = false;
      view.src = urlOf();
    } else {
      const now = boardOfUrl(view.getURL());
      const want = link?.board;
      if (want !== undefined && now && (now.board !== want || now.key !== link?.key)) void view.loadURL(urlOf());
      push();
    }
    view.focus();
  };

  return {
    get up() {
      return up;
    },
    open: (at) => {
      if (at.project !== project) {
        picked = [];
        void view?.executeJavaScript('window.__mender && window.__mender.clear()').catch(() => undefined);
      }
      project = at.project;
      link = at.link;
      up = true;
      hands.backdrop(true);
      shade.style.display = 'flex';
      shade.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
      root.animate([{ transform: 'translateY(8px) scale(0.99)' }, { transform: 'none' }], { duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)' });
      paintStrip();
      void show();
    },
    close: () => {
      if (!up) return;
      up = false;
      shade.style.display = 'none';
      hands.backdrop(false);
      (document.activeElement as HTMLElement | null)?.blur();
    },
    lit: (map) => {
      if (JSON.stringify(map) === JSON.stringify(lit)) return;
      lit = map;
      push();
      if (up) paintStrip();
    },
    ticket: async (at, key) => {
      try {
        const got = await makeJira(hands.wire, at).get<RawIssue>(`/rest/api/3/issue/${enc(key)}?fields=summary,status,description`);
        return {
          summary: (got.fields.summary as string) ?? '',
          description: adfToMarkdown(got.fields.description),
          category: categoryOf(got.fields.status?.statusCategory?.key),
        };
      } catch {
        return null;
      }
    },
    start: async (at, key) => {
      const j = makeJira(hands.wire, at);
      const got = await j
        .get<{ transitions: { id: string; name?: string; to?: { name?: string; statusCategory?: { key?: string } } }[] }>(
          `/rest/api/3/issue/${enc(key)}/transitions`
        )
        .catch(() => null);
      const step = got?.transitions.find(
        (one) => one.to?.statusCategory?.key === 'indeterminate' && !/block|review/i.test(one.to?.name ?? '')
      );
      if (step) await j.send('POST', `/rest/api/3/issue/${enc(key)}/transitions`, { transition: { id: step.id } }).catch(() => undefined);
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
