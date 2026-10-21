/**
 * The board a past session is picked up from: the same timber signboard a
 * new session is asked for on, wider, with the sessions down the left and
 * the one under the pointer read out on the right: what it did, the first
 * thing said in it, and where and when it was left.
 *
 * What it did is not in the transcript. It is worked out the first time a
 * session is looked at here and kept, so the wait is once per session.
 *
 * This folder's own come first, then every other folder's on this machine
 * under their own heading, since a conversation is remembered by what it was
 * about and not where it happened to be had. The search line looks through
 * both.
 */

import '../glass/slabs.css';
import { glaze } from '../glass/glass';
import { px } from '../glass/px';
import { ask } from './standing';

export interface PastSession {
  id: string;
  title: string;
  said?: string | null;
  gitBranch: string | null;
  mtimeMs: number;
  /** Had in some other folder: which, by name. */
  elsewhere?: { folder: string; dir: string } | null;
}

export interface PastTold {
  turns: number;
  did: string | null;
}

export interface PastSessionHooks {
  history(): Promise<PastSession[]>;
  /** Every other folder's, listed after this one's. */
  elsewhere(): Promise<PastSession[]>;
  told(session: PastSession): Promise<PastTold>;
  resume(session: PastSession): void;
  back(): void;
}

export interface PastSessionBoard {
  close(): void;
}

const NO_TITLE = '(a past session with nothing typed yet)';

export function openPastSession(hooks: PastSessionHooks): PastSessionBoard {
  let sessions: PastSession[] | null = null;
  let others: PastSession[] = [];
  let shown: PastSession[] = [];
  let chosen: PastSession | null = null;
  let closed = false;
  let thisFolderOnly = false;
  const told = new Map<string, PastTold | 'waiting'>();
  const since = new Map<string, number>();
  let tick: ReturnType<typeof setInterval> | null = null;

  const scrim = h('div', 'gs-over');
  scrim.style.zIndex = '901';
  scrim.dataset.pastSession = '';
  const win = glaze(h('div', 'gs-win'), { tint: 'rgba(14, 15, 18, 0.62)', blur: 30 });
  win.style.width = '1180px';
  win.style.height = 'min(820px, calc(100vh - 32px))';
  scrim.append(win);

  const shut = h('div', 'g-x');
  shut.append(px('close', '#f6ecdb', 11));
  const crumbs = h('div', 'g-crumbs');
  const way = h('span', 'g-gold', 'a new session');
  crumbs.append(way, h('span', 'g-faint', '\u203a'), h('span', 'g-mute', 'a past one'));
  const title = h('h1', 'gs-h1 g-serif', 'Pick up where it stopped');
  title.style.fontSize = '32px';

  const top = h('div', 'gs-top');
  const finding = h('div', 'g-field gs-find');
  const search = document.createElement('input');
  search.placeholder = 'find one by what it was about';
  search.spellcheck = false;
  finding.append(px('find', '#f6ecdb', 16), search);
  const seg = h('div', 'g-seg');
  const segAll = h('span', 'g-on', 'everywhere');
  const segHere = h('span', '', 'this folder');
  seg.append(segAll, segHere);
  top.append(finding, seg);

  const cols = h('div', 'gs-cols');
  const list = h('div', 'gs-list g-scroll');
  const preview = h('div', 'gs-read g-card g-scroll');
  cols.append(list, preview);

  const bar = h('div', 'gs-bar');
  const count = h('span', 'gs-count');
  const back = h('span', 'g-ghost g-plain gs-end');
  back.append(px('left', '#f2c66d', 13), document.createTextNode('back'));
  const go = h('span', 'g-pill');
  go.append(px('right', '#2a1b09', 15), document.createTextNode('resume this one'));
  bar.append(count, back, go);

  win.append(shut, crumbs, title, top, cols, bar);

  const setScope = (here: boolean): void => {
    thisFolderOnly = here;
    segAll.classList.toggle('g-on', !here);
    segHere.classList.toggle('g-on', here);
    filter();
  };
  segAll.addEventListener('click', () => setScope(false));
  segHere.addEventListener('click', () => setScope(true));

  const rows = new Map<string, HTMLElement>();

  const paintList = (): void => {
    const scrolled = list.scrollTop;
    list.replaceChildren();
    rows.clear();
    const quiet = (words: string) => list.append(h('div', 'gs-quiet', words));
    if (sessions === null) return quiet('reading its own history\u2026');
    if (!shown.length) {
      return quiet(
        search.value.trim()
          ? 'nothing called that, here or anywhere else.'
          : 'nothing had on this machine yet.'
      );
    }
    const query = search.value.trim();
    const hereCount = shown.filter((one) => !one.elsewhere).length;
    const head = (icon: string, color: string, words: string, n: string): void => {
      const g = h('div', 'gs-gh');
      g.append(px(icon, color, 13), h('span', 'g-pix', words), h('span', 'gs-ct', n));
      list.append(g);
    };
    if (!thisFolderOnly || hereCount) {
      head(
        'home',
        '#9bd28a',
        'in this folder',
        hereCount || query ? String(hereCount) : 'nothing yet'
      );
    }
    let headed = false;
    for (const session of shown) {
      if (session.elsewhere && !headed) {
        headed = true;
        head(
          'folder',
          'rgba(246,236,219,.5)',
          'in other folders',
          String(shown.length - hereCount)
        );
      }
      const empty = session.title === NO_TITLE;
      const row = h('div', 'gs-s');
      const known = told.get(session.id);
      row.append(
        h('b', empty ? 'gs-none' : '', empty ? NO_TITLE : session.title),
        h('span', 'gs-when', ago(session.mtimeMs))
      );
      const did = known && known !== 'waiting' ? (known.did ?? '') : '';
      if (session.elsewhere || did) {
        const where = h('span', 'gs-where');
        if (session.elsewhere) {
          where.append(
            px('folder', 'rgba(246,236,219,.4)', 11),
            h('span', 'gs-f', session.elsewhere.folder)
          );
        }
        if (did) where.append(h('span', '', did));
        row.append(where);
      }
      row.addEventListener('click', () => choose(session));
      row.addEventListener('dblclick', () => {
        chosen = session;
        resume();
      });
      rows.set(session.id, row);
      list.append(row);
    }
    list.scrollTop = scrolled;
    paintChosen();
  };

  const paintChosen = (): void => {
    for (const [id, row] of rows) row.classList.toggle('gs-on', chosen?.id === id);
  };

  const chip = (icon: string, words: string, color = '#f6ecdb'): HTMLElement => {
    const c = h('span', 'g-chip');
    c.append(px(icon, color, 12), document.createTextNode(words));
    return c;
  };

  const paintPreview = (): void => {
    preview.replaceChildren();
    if (!chosen) return;
    const said = chosen.said ?? (chosen.title === NO_TITLE ? null : chosen.title);
    const known = told.get(chosen.id);
    const turns = known && known !== 'waiting' ? known.turns : null;
    preview.append(h('div', 'g-pix', 'the one under the arrow'));
    preview.append(h('h2', 'g-serif', chosen.title === NO_TITLE ? NO_TITLE : chosen.title));
    const meta = h('div', 'gs-meta');
    meta.append(
      chip('branch', chosen.gitBranch ?? 'no branch', '#7aaaff'),
      chip('clock', `last worked in ${ago(chosen.mtimeMs)}`)
    );
    if (turns !== null) meta.append(chip('page', `${turns} turn${turns === 1 ? '' : 's'}`));
    if (chosen.elsewhere) meta.append(chip('folder', chosen.elsewhere.folder));
    preview.append(meta);

    const did = h('div', 'gs-did');
    did.append(h('div', 'g-pix', 'what it did'));
    if (known && known !== 'waiting' && known.did) {
      did.append(h('p', '', known.did));
    } else if (known && known !== 'waiting') {
      did.append(h('p', 'g-faint', said ? 'it would not say.' : 'nothing was done in it yet.'));
    } else {
      const seconds = Math.floor((Date.now() - (since.get(chosen.id) ?? Date.now())) / 1000);
      did.append(h('p', 'gs-wait', seconds >= 1 ? `reading it back\u2026 ${seconds}s` : ''));
    }
    preview.append(did);

    const first = h('div', 'gs-said');
    first.append(
      h('div', 'g-pix', 'first thing said'),
      h(
        'p',
        '',
        said ?? 'Nothing was typed in this session yet. Resuming it opens it where it was left.'
      )
    );
    if (!said) first.querySelector('p')?.classList.add('g-faint');
    preview.append(first);

    if (chosen.elsewhere) {
      const bring = h('div', 'gs-bring');
      const words = h('span', '', 'this one was had in ');
      words.append(
        h('b', '', chosen.elsewhere.folder),
        document.createTextNode(
          '. resuming brings a copy of it over to this folder first, since claude only looks under the folder it runs in.'
        )
      );
      bring.append(px('down', '#9bd28a', 16), words);
      preview.append(bring);
    }
  };

  const paintFoot = (): void => {
    const here = shown.filter((one) => !one.elsewhere).length;
    const away = shown.length - here;
    const plural = (n: number) => `${n} session${n === 1 ? '' : 's'}`;
    count.textContent =
      sessions === null ? '' : away ? `${here} here, ${away} elsewhere` : plural(here);
    go.classList.toggle('gs-pill-off', !chosen);
  };

  const tell = (session: PastSession): Promise<void> => {
    if (told.has(session.id)) return Promise.resolve();
    told.set(session.id, 'waiting');
    since.set(session.id, Date.now());
    tick ??= setInterval(() => {
      if (chosen && told.get(chosen.id) === 'waiting') paintPreview();
    }, 1000);
    return hooks
      .told(session)
      .catch(() => ({ turns: 0, did: null }))
      .then((answer) => {
        if (closed) return;
        told.set(session.id, answer);
        if (chosen?.id === session.id) paintPreview();
        if (answer.did && rows.has(session.id)) paintList();
      });
  };

  const choose = (session: PastSession | null): void => {
    chosen = session;
    if (session) {
      void tell(session);
      rows.get(session.id)?.scrollIntoView({ block: 'nearest' });
    }
    paintChosen();
    paintPreview();
    paintFoot();
  };

  const didOf = (one: PastSession): string => {
    const known = told.get(one.id);
    return known && known !== 'waiting' ? (known.did ?? '') : '';
  };

  const filter = (): void => {
    const q = search.value.trim().toLowerCase();
    const matches = (one: PastSession): boolean =>
      one.title.toLowerCase().includes(q) ||
      (one.said ?? '').toLowerCase().includes(q) ||
      didOf(one).toLowerCase().includes(q) ||
      (one.gitBranch ?? '').toLowerCase().includes(q) ||
      (one.elsewhere?.folder ?? '').toLowerCase().includes(q);
    const all = [...(sessions ?? []), ...(thisFolderOnly ? [] : others)];
    shown = q ? all.filter(matches) : all;
    paintList();
    if (!chosen || !shown.some((one) => one.id === chosen?.id)) choose(shown[0] ?? null);
    else paintFoot();
  };

  const resume = (): void => {
    if (closed || !chosen) return;
    const session = chosen;
    close();
    hooks.resume(session);
  };
  const leave = (): void => {
    if (closed) return;
    close();
    hooks.back();
  };

  go.addEventListener('click', resume);
  back.addEventListener('click', leave);
  shut.addEventListener('click', leave);
  way.addEventListener('click', leave);
  search.addEventListener('input', filter);

  for (const kind of ['keydown', 'keyup', 'pointerdown', 'pointerup', 'click', 'wheel'] as const) {
    scrim.addEventListener(kind, (event) => event.stopPropagation());
  }
  scrim.addEventListener('pointerdown', (event) => {
    if (!win.contains(event.target as Node)) leave();
  });
  scrim.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      leave();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      resume();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!shown.length) return;
      const at = shown.findIndex((one) => one.id === chosen?.id);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      choose(shown[Math.max(0, Math.min(shown.length - 1, at + step))] ?? null);
    }
  });

  const close = (): void => {
    closed = true;
    if (tick) clearInterval(tick);
    scrim.remove();
  };

  paintList();
  paintFoot();
  document.body.append(scrim);
  /* Return resumes and Escape goes back wherever the keyboard is, not only
     while something inside the board has it. */
  ask({ yes: resume, no: leave, at: scrim });
  search.focus();
  void hooks
    .history()
    .catch(() => [])
    .then((found) => {
      if (closed) return;
      sessions = found;
      filter();
      void hooks
        .elsewhere()
        .catch(() => [])
        .then((away) => {
          if (closed) return;
          others = away;
          filter();
        });
      void (async () => {
        for (const one of found) {
          if (closed) return;
          await tell(one);
        }
      })();
    });

  return { close };
}

function h(tag: string, cls = '', words = ''): HTMLElement {
  const made = document.createElement(tag);
  if (cls) made.className = cls;
  if (words) made.textContent = words;
  return made;
}

function ago(ms: number): string {
  const minutes = Math.round((Date.now() - ms) / 60000);
  if (minutes < 60) return minutes <= 1 ? 'just now' : `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days}d ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
