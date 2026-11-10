import { swallowed, soft } from '../watch/caught';
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
 * runs one strip of the village's own: whose Jira it is, the epics pinned
 * there, whichever ticket is open with "launch" beside it, how many are
 * picked with "launch these", and the way out. Launching never takes the
 * window away: each ticket is set up in the background, its card or row
 * counting while it is, and the strip says when it is ready to walk into.
 *
 * The page is made once and kept, hidden, so opening it again is instant and
 * finds it where it was left.
 */

export interface JiraHands {
  wire: Wire;
  /** What launching needs to know of a ticket, read where the token is kept. */
  look(site: string, key: string): Promise<Ticket | null>;
  /** Out of to-do, into whichever status is under way. */
  start(site: string, key: string): Promise<void>;
  close(): void;
  /** Each its own workspace, set up in the background while you stay on the board. */
  launch(site: string, keys: string[]): void;
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
  /** What is being set up in the background: since when, or null while it waits its turn. */
  setting(map: Record<string, { since: number | null }>): void;
  /** Says on the strip that one launched in the background is ready, with the way in. */
  ready(key: string, task: string, name: string): void;
  /** Says on the strip that one would not launch. */
  failed(text: string): void;
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
  } catch (caught) { swallowed('surface.96', caught);
    return null;
  }
}

/** Whether an address is a Jira site itself rather than a page on the way to one. */
export function onJira(url: string): boolean {
  try {
    const { protocol, host } = new URL(url);
    return protocol === 'https:' && host.endsWith('.atlassian.net') && host !== 'id.atlassian.net';
  } catch (caught) { swallowed('surface.106', caught);
    return false;
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
  } catch (caught) { swallowed('surface.120', caught);
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
  const pins = h('div', 'jr-strip-pins');
  const open = h('div', 'jr-strip-open');
  const picks = h('div', 'jr-strip-picks');
  const said = h('div', 'jr-strip-said');
  const x = h('button', 'jr-x', '×');
  x.title = 'put it away';
  x.addEventListener('click', () => hands.close());
  const strip = h('div', 'jr-strip', h('div', 'jr-here', where), pins, open, picks, said, h('div', 'jr-gap'), x);
  const stage = h('div', 'jr-stage');
  root.append(strip, stage);

  let up = false;
  let project = '';
  let link: JiraLink | null = null;
  let site = '';
  let lit: Record<string, Lit> = {};
  let setting: Record<string, { since: number | null }> = {};
  /** Whether the open ticket is an epic, asked of Jira once per ticket. */
  const epics = new Map<string, { epic: boolean; summary: string }>();
  let picked: string[] = [];
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
    const key = ticketOf();
    const kind = key ? epics.get(key) : undefined;
    const epic = key && kind?.epic ? { key, pinned: Boolean(link?.pins?.some((one) => one.key === key)) } : null;
    void view.executeJavaScript(`window.__mender && window.__mender.set(${JSON.stringify({ lit, setting, epic })})`).catch(soft('surface.188', undefined));
  };

  const ticketOf = (): string | null => (view && ready ? ticketOfUrl(view.getURL()) : null);

  /** Asks Jira whether the open ticket is an epic, so it can be pinned. */
  const learn = (key: string | null): void => {
    if (!key || epics.has(key) || !site) return;
    epics.set(key, { epic: false, summary: '' });
    void makeJira(hands.wire, site)
      .get<RawIssue & { fields: { issuetype?: { hierarchyLevel?: number } } }>(
        `/rest/api/3/issue/${enc(key)}?fields=summary,issuetype`
      )
      .then(
        (got) => {
          epics.set(key, {
            epic: (got.fields.issuetype?.hierarchyLevel ?? 0) >= 1,
            summary: (got.fields.summary as string) ?? '',
          });
          push();
        },
        () => epics.delete(key)
      );
  };

  const pinToggle = (key: string): void => {
    if (!link || link.site !== site) return;
    const had = link.pins ?? [];
    const summary = epics.get(key)?.summary ?? '';
    const next = had.some((one) => one.key === key)
      ? had.filter((one) => one.key !== key)
      : [...had, { key, summary }];
    link = { ...link, pins: next };
    void hands.link(link);
    paintStrip();
    push();
  };

  const launch = (keys: string[]): void => {
    const fresh = keys.filter((key) => !lit[key] && !setting[key]);
    if (!fresh.length) return;
    hands.launch(site, fresh);
    void view?.executeJavaScript('window.__mender && window.__mender.clear()').catch(soft('surface.launch', undefined));
  };

  const paintStrip = (): void => {
    where.textContent = `${project}’s jira`;
    pins.replaceChildren();
    const pinned = link?.site === site ? (link?.pins ?? []) : [];
    for (const one of pinned) {
      const to = gold(one.summary ? `${one.key} ${one.summary}` : one.key, () =>
        void view?.loadURL(`https://${site}/browse/${enc(one.key)}`)
      );
      to.title = 'open this epic';
      pins.append(to);
    }
    const key = ticketOf();
    learn(key);
    open.replaceChildren();
    if (key) {
      const on = lit[key];
      const wait = setting[key];
      open.append(
        h('span', 'k', key),
        on
          ? gold(`${on.name}, walk in`, () => hands.go(on.task))
          : wait
            ? h('span', 'k', 'setting up…')
            : gold('launch it', () => void launch([key]))
      );
    }
    picks.replaceChildren();
    if (picked.length)
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
      /* Only Jira itself is retinted and laid into: a sign-in page on the
         way, Atlassian's own or a company's, is shown exactly as it is. */
      if (onJira(el.getURL())) {
        void el.insertCSS(PAGE_CSS);
        void el.executeJavaScript(PAGE_JS).then(push, () => undefined);
      }
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
      let what: { launch?: string[]; picked?: string[]; go?: string; escape?: boolean; pin?: string };
      try {
        what = JSON.parse(message.slice(PAGE_SAYS.length));
      } catch (caught) { swallowed('surface.277', caught);
        return;
      }
      if (what.launch) launch(what.launch);
      else if (what.pin) pinToggle(what.pin);
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
        void view?.executeJavaScript('window.__mender && window.__mender.clear()').catch(soft('surface.333', undefined));
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
    setting: (map) => {
      if (JSON.stringify(map) === JSON.stringify(setting)) return;
      const was = setting;
      setting = map;
      push();
      if (up) paintStrip();
      /* Jira's board doesn't hear about moves made over its API until it is
         read again, so once the last one is through it is read again. */
      if (Object.keys(was).length && !Object.keys(map).length && up && view && ready && boardOfUrl(view.getURL()))
        (view as WebView & { reload(): void }).reload();
    },
    ready: (key, task, name) => {
      if (!up) return;
      window.clearTimeout(saidTimer);
      said.classList.remove('sore');
      said.replaceChildren(h('span', 'k', `${key} is ready`), gold(`${name}, walk in`, () => hands.go(task)));
      saidTimer = window.setTimeout(() => said.replaceChildren(), 15_000);
    },
    failed: (text) => tell(text, true),
    ticket: (at, key) => hands.look(at, key),
    start: (at, key) => hands.start(at, key),
  };
}
