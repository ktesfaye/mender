/**
 * The board a past session is picked up from: the same timber signboard a
 * new session is asked for on, wider, with the sessions down the left and
 * the one under the pointer read out on the right: what it did, the first
 * thing said in it, and where and when it was left.
 *
 * What it did is not in the transcript. It is worked out the first time a
 * session is looked at here and kept, so the wait is once per session.
 *
 * The list is this folder's own. What is written on the search line looks
 * further, through every folder on this machine, since a conversation is
 * remembered by what it was about and not where it happened to be had;
 * those come after this folder's, under their own heading.
 */

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
  /** Every other folder's, for the search line. */
  elsewhere(): Promise<PastSession[]>;
  told(session: PastSession): Promise<PastTold>;
  resume(session: PastSession): void;
  back(): void;
}

export interface PastSessionBoard {
  close(): void;
}

const NO_TITLE = '(a past session with nothing typed yet)';
const MONO = "'Courier Prime', monospace";

export function openPastSession(hooks: PastSessionHooks): PastSessionBoard {
  let sessions: PastSession[] | null = null;
  let others: PastSession[] = [];
  let shown: PastSession[] = [];
  let chosen: PastSession | null = null;
  let closed = false;
  const told = new Map<string, PastTold | 'waiting'>();
  const since = new Map<string, number>();
  let tick: ReturnType<typeof setInterval> | null = null;

  const scrim = el('div', {
    position: 'fixed',
    inset: '0',
    zIndex: '901',
    background: 'rgba(72,37,16,.62)',
    fontFamily: "'Josefin Sans', sans-serif",
  });
  scrim.dataset.pastSession = '';

  const hang = el('div', {
    position: 'absolute',
    left: '50%',
    top: '40px',
    transform: 'translateX(-50%)',
    width: '800px',
    maxWidth: 'calc(100vw - 32px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  });
  const cords = el('div', {
    display: 'flex',
    justifyContent: 'space-between',
    width: '440px',
    maxWidth: '60%',
  });
  for (let i = 0; i < 2; i++) {
    cords.append(el('span', { width: '4px', height: '28px', background: '#6b5a40' }));
  }
  const board = el('div', {
    alignSelf: 'stretch',
    background: '#2e1f10',
    border: '2px solid #482510',
    boxShadow: '6px 6px 0 rgba(0,0,0,.45)',
    color: '#f4e3c0',
  });

  const head = el('div', {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '18px 20px 16px',
    background: '#5a3a1c',
    borderBottom: '2px solid #3a2712',
    boxShadow: 'inset 0 -4px 0 #3a2712',
  });
  head.append(
    text('span', 'A past session', {
      fontSize: '22px',
      letterSpacing: '.28em',
      textTransform: 'uppercase',
      fontWeight: '600',
    }),
    text('span', 'picking one resumes it. nothing typed here is sent.', {
      fontSize: '14px',
      color: '#d9c49a',
    })
  );

  const finding = el('div', { padding: '14px 16px', borderBottom: '2px solid #3a2712' });
  const search = document.createElement('input');
  search.placeholder = 'find a session';
  search.spellcheck = false;
  Object.assign(search.style, {
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: "'Josefin Sans', sans-serif",
    fontSize: '15px',
    padding: '10px 12px',
    background: '#1d1811',
    color: '#f4e3c0',
    border: '2px solid #3a2712',
    boxShadow: 'inset 0 4px 0 #120e09',
    outline: 'none',
  } satisfies Partial<CSSStyleDeclaration>);
  finding.append(search);

  const split = el('div', {
    display: 'grid',
    gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
    height: 'min(400px, calc(100vh - 330px))',
    minHeight: '200px',
  });
  const list = el('div', {
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    borderRight: '2px solid #3a2712',
  });
  const preview = el('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    padding: '20px',
    background: '#1d1811',
    overflowY: 'auto',
    minHeight: '0',
  });
  split.append(list, preview);

  const foot = el('div', {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 20px',
    borderTop: '2px solid #3a2712',
    background: '#241810',
  });
  const count = el('span', { flex: '1', fontFamily: MONO, fontSize: '12px', color: '#bfa476' });
  const back = text('span', 'back', {
    cursor: 'pointer',
    padding: '8px 14px',
    fontSize: '14px',
    color: '#d9c49a',
    border: '2px solid #3a2712',
    background: '#5a3a1c',
  });
  const go = text('span', 'resume', {
    cursor: 'pointer',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#482510',
    border: '2px solid #482510',
    background: '#e0b56a',
    boxShadow: '3px 3px 0 rgba(0,0,0,.45)',
  });
  go.addEventListener('pointerdown', () => {
    go.style.transform = 'translate(2px,2px)';
    go.style.boxShadow = '1px 1px 0 rgba(0,0,0,.45)';
  });
  const lift = (): void => {
    go.style.transform = '';
    go.style.boxShadow = '3px 3px 0 rgba(0,0,0,.45)';
  };
  go.addEventListener('pointerup', lift);
  go.addEventListener('pointerleave', lift);
  foot.append(count, back, go);

  board.append(head, finding, split, foot);
  hang.append(cords, board);
  scrim.append(hang);

  const rows = new Map<string, HTMLElement>();

  const paintList = (): void => {
    const scrolled = list.scrollTop;
    list.replaceChildren();
    rows.clear();
    const quiet = (words: string) =>
      list.append(text('div', words, { padding: '12px 16px', fontSize: '14px', color: '#bfa476' }));
    if (sessions === null) return quiet('reading its own history…');
    if (!shown.length) {
      return quiet(
        search.value.trim()
          ? 'nothing called that, here or anywhere else.'
          : 'nothing had in this folder yet. write above to look in the others.'
      );
    }
    let headed = false;
    for (const session of shown) {
      if (session.elsewhere && !headed) {
        headed = true;
        list.append(
          text('div', 'in other folders', {
            padding: '14px 16px 8px',
            fontSize: '11px',
            letterSpacing: '.2em',
            textTransform: 'uppercase',
            color: '#bfa476',
            flexShrink: '0',
          })
        );
      }
      const empty = session.title === NO_TITLE;
      const row = el('div', {
        cursor: 'pointer',
        display: 'flex',
        gap: '10px',
        alignItems: 'baseline',
        padding: '12px 16px',
        borderBottom: '2px solid #241810',
        flexShrink: '0',
      });
      const arrow = text('span', '·', { fontFamily: MONO, fontSize: '12px', color: '#bfa476' });
      const words = el('div', {
        flex: '1',
        minWidth: '0',
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
      });
      const line = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
      const known = told.get(session.id);
      words.append(
        text('span', empty ? NO_TITLE : session.title, {
          ...line,
          fontSize: '14px',
          fontStyle: empty ? 'italic' : 'normal',
          color: empty ? '#bfa476' : '#f4e3c0',
        })
      );
      const under = [
        session.elsewhere ? `in ${session.elsewhere.folder}` : '',
        known && known !== 'waiting' ? (known.did ?? '') : '',
      ]
        .filter(Boolean)
        .join(' · ');
      if (under) {
        words.append(text('span', under, { ...line, fontSize: '12px', color: '#bfa476' }));
      }
      row.append(
        arrow,
        words,
        text('span', ago(session.mtimeMs), {
          fontFamily: MONO,
          fontSize: '11px',
          color: '#bfa476',
          whiteSpace: 'nowrap',
        })
      );
      row.addEventListener('pointerenter', () => {
        if (chosen?.id !== session.id) row.style.background = '#2a1d10';
      });
      row.addEventListener('pointerleave', () => {
        if (chosen?.id !== session.id) row.style.background = 'transparent';
      });
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
    for (const [id, row] of rows) {
      const mine = chosen?.id === id;
      row.style.background = mine ? '#3a2712' : 'transparent';
      (row.firstChild as HTMLElement).textContent = mine ? '→' : '·';
    }
  };

  const heading = (words: string) =>
    text('span', words, {
      fontSize: '11px',
      letterSpacing: '.2em',
      textTransform: 'uppercase',
      color: '#bfa476',
    });

  const paintPreview = (): void => {
    preview.replaceChildren();
    if (!chosen) return;
    const said = chosen.said ?? (chosen.title === NO_TITLE ? null : chosen.title);
    const known = told.get(chosen.id);
    const did = el('span', { fontSize: '16px', lineHeight: '1.5' });
    if (known && known !== 'waiting' && known.did) {
      did.textContent = known.did;
      did.style.color = '#f4e3c0';
    } else if (known && known !== 'waiting') {
      did.textContent = said ? 'it would not say.' : 'nothing was done in it yet.';
      did.style.color = '#bfa476';
      did.style.fontStyle = 'italic';
    } else {
      const seconds = Math.floor((Date.now() - (since.get(chosen.id) ?? Date.now())) / 1000);
      did.textContent = seconds >= 1 ? `reading it back… ${seconds}s` : '';
      did.style.color = '#bfa476';
      did.style.fontFamily = MONO;
      did.style.fontSize = '13px';
    }
    preview.append(heading('What it did'), did);
    preview.append(
      heading('First thing said'),
      text(
        'span',
        said ?? 'Nothing was typed in this session yet. Resuming it opens it where it was left.',
        {
          fontSize: '14px',
          lineHeight: '1.5',
          color: said ? '#d9c49a' : '#bfa476',
          fontStyle: said ? 'normal' : 'italic',
          display: '-webkit-box',
          webkitLineClamp: '6',
          webkitBoxOrient: 'vertical',
          overflow: 'hidden',
        } as Partial<CSSStyleDeclaration>
      )
    );
    const meta = el('div', {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      marginTop: 'auto',
      fontFamily: MONO,
      fontSize: '12px',
      color: '#bfa476',
    });
    const turns = known && known !== 'waiting' ? String(known.turns) : '';
    if (chosen.elsewhere) {
      meta.append(text('span', `had in · ${chosen.elsewhere.folder}, brought here to resume`, {}));
    }
    meta.append(
      text('span', `branch · ${chosen.gitBranch ?? 'no branch'}`, {}),
      text('span', `last active · ${ago(chosen.mtimeMs)}`, {}),
      text('span', `turns · ${turns}`, {})
    );
    preview.append(meta);
  };

  const paintFoot = (): void => {
    const here = shown.filter((one) => !one.elsewhere).length;
    const away = shown.length - here;
    const plural = (n: number) => `${n} session${n === 1 ? '' : 's'}`;
    count.textContent =
      sessions === null
        ? ''
        : search.value.trim()
          ? `${here} here, ${away} elsewhere`
          : plural(sessions.length);
    go.style.opacity = chosen ? '1' : '.5';
    go.style.cursor = chosen ? 'pointer' : 'default';
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
    shown = q ? [...(sessions ?? []).filter(matches), ...others.filter(matches)] : [...(sessions ?? [])];
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
  search.addEventListener('input', filter);

  for (const kind of ['keydown', 'keyup', 'pointerdown', 'pointerup', 'click', 'wheel'] as const) {
    scrim.addEventListener(kind, (event) => event.stopPropagation());
  }
  scrim.addEventListener('pointerdown', (event) => {
    if (event.target === scrim) leave();
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
          if (search.value.trim()) filter();
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

function el(tag: string, style: Partial<CSSStyleDeclaration>): HTMLElement {
  const made = document.createElement(tag);
  Object.assign(made.style, style);
  return made;
}

function text(tag: string, words: string, style: Partial<CSSStyleDeclaration>): HTMLElement {
  const made = el(tag, style);
  made.textContent = words;
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
