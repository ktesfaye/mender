import { openPastSession, type PastSession, type PastTold } from './past-session';
import { cutOf, KIT_NAMES, sprite } from './sprite';

/**
 * The board a new session is asked for on: a timber signboard hung on two
 * cords over the village, the one place in the app with a box you write in
 * rather than the line.
 *
 * Three things can be said about where it starts and nothing else: in its
 * own isolated workspace rather than the project's folder, from a past
 * session rather than blank, and in a plain terminal rather than to the
 * agent. Isolated and terminal are tiles that are on or off and go
 * together; the past-session tile turns the sign over to the board a past
 * one is picked from, and resuming there starts it with whatever the other
 * two say.
 */

export type { PastSession };

export interface NewSessionAsk {
  text: string;
  isolated: boolean;
  terminal: boolean;
  past: PastSession | null;
}

export interface NewSessionHooks {
  /** Where it is, said under the title: "on the crop farm". */
  where: string;
  /** Who a conversation would be put to work with. */
  hand: string;
  /** The folder it works in when it is not isolated. */
  among?: string;
  /** Open straight onto the board a past session is picked from. */
  past?: boolean;
  /** Start with its own isolated workspace already on, the box naming it. */
  isolated?: boolean;
  history(): Promise<PastSession[]>;
  elsewhere(): Promise<PastSession[]>;
  told(session: PastSession): Promise<PastTold>;
  /** Brings a session had in another folder over into this one. */
  adopt(session: PastSession): Promise<void>;
  submit(ask: NewSessionAsk): void;
  cancel(): void;
  revive(): void;
}

export interface NewSessionSign {
  /** The last one taken down here, offered back above the box. */
  revivable(title: string | null): void;
  close(): void;
}

const ON = { bg: '#e0b56a', fg: '#482510', bd: '#482510', sh: '3px 3px 0 rgba(0,0,0,.45)' };
const OFF = { bg: '#3a2712', fg: '#d9c49a', bd: '#3a2712', sh: 'none' };

export function openNewSession(hooks: NewSessionHooks): NewSessionSign {
  let isolated = Boolean(hooks.isolated);
  let terminal = false;
  let revivable: string | null = null;
  let closed = false;

  const scrim = el('div', {
    position: 'fixed',
    inset: '0',
    zIndex: '900',
    background: 'rgba(72,37,16,.62)',
    fontFamily: "'Josefin Sans', sans-serif",
  });
  scrim.dataset.newSession = '';

  const hang = el('div', {
    position: 'absolute',
    left: '50%',
    top: '40px',
    transform: 'translateX(-50%)',
    width: '600px',
    maxWidth: 'calc(100vw - 32px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  });
  const cords = el('div', { display: 'flex', justifyContent: 'space-between', width: '360px' });
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
    text('span', 'A new session', {
      fontSize: '22px',
      letterSpacing: '.28em',
      textTransform: 'uppercase',
      fontWeight: '600',
    }),
    text('span', hooks.where, { fontSize: '14px', color: '#d9c49a' })
  );

  const body = el('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '20px',
  });

  const asked = el('div', { display: 'flex', flexDirection: 'column', gap: '6px' });
  const label = el('span', { fontSize: '15px', alignSelf: 'flex-start' });
  const box = document.createElement('textarea');
  box.rows = 2;
  box.spellcheck = false;
  Object.assign(box.style, {
    fontFamily: "'Josefin Sans', sans-serif",
    fontSize: '15px',
    lineHeight: '1.5',
    padding: '12px',
    background: '#1d1811',
    color: '#f4e3c0',
    border: '2px solid #3a2712',
    boxShadow: 'inset 0 4px 0 #120e09',
    outline: 'none',
    resize: 'none',
  } satisfies Partial<CSSStyleDeclaration>);
  asked.append(label, box);

  const tiles = el('div', {
    display: 'grid',
    gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
    gap: '8px',
  });
  const tile = (file: string, height: number, words: string, flip: () => void) => {
    const face = el('div', {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      padding: '14px 8px 12px',
      textAlign: 'center',
      cursor: 'pointer',
      borderWidth: '2px',
      borderStyle: 'solid',
    });
    const well = el('div', {
      position: 'relative',
      width: '64px',
      height: '48px',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
    });
    const cut = cutOf(file);
    const times = Math.max(1, Math.min(4, Math.round(height / (cut?.h ?? height)))) as
      | 1
      | 2
      | 3
      | 4;
    const art = sprite(file, times);
    art.style.position = 'relative';
    well.append(art);
    face.append(well, text('span', words, { fontSize: '13px', lineHeight: '1.3' }));
    face.addEventListener('click', () => {
      flip();
      paint();
    });
    tiles.append(face);
    return face;
  };
  const isoTile = tile(KIT_NAMES.crate, 32, 'in its own isolated workspace', () => {
    isolated = !isolated;
  });
  const pastTile = tile(KIT_NAMES.lanternOn, 40, 'start from a past session', () => {
    openPast();
  });
  const termTile = tile(KIT_NAMES.anvil, 32, 'open in a terminal', () => {
    terminal = !terminal;
  });

  const summary = el('span', {
    fontFamily: "'Courier Prime', monospace",
    fontSize: '12px',
    color: '#bfa476',
  });
  body.append(asked, tiles, summary);

  const foot = el('div', {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    padding: '14px 20px',
    borderTop: '2px solid #3a2712',
    background: '#241810',
  });
  const cancel = text('span', 'cancel', {
    cursor: 'pointer',
    padding: '8px 14px',
    fontSize: '14px',
    color: '#d9c49a',
    border: '2px solid #3a2712',
    background: '#5a3a1c',
  });
  const go = text('span', '', {
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
  foot.append(cancel, go);

  board.append(head, body, foot);
  hang.append(cords, board);
  scrim.append(hang);

  /** The sign turns over to the past-session board and back again. */
  let pastBoard: { close(): void } | null = null;
  const openPast = (): void => {
    scrim.style.display = 'none';
    pastBoard = openPastSession({
      history: hooks.history,
      elsewhere: hooks.elsewhere,
      told: hooks.told,
      resume: (session) => {
        if (!session.elsewhere) return submit(session);
        void hooks
          .adopt(session)
          .then(() => submit(session))
          .catch(() => submit(session));
      },
      back: () => {
        pastBoard = null;
        if (closed) return;
        scrim.style.display = '';
        box.focus();
      },
    });
  };

  const paint = (): void => {
    for (const [face, on] of [
      [isoTile, isolated],
      [pastTile, false],
      [termTile, terminal],
    ] as const) {
      const look = on ? ON : OFF;
      face.style.background = look.bg;
      face.style.color = look.fg;
      face.style.borderColor = look.bd;
      face.style.boxShadow = look.sh;
    }
    const folder = hooks.among ?? "the project's own folder";
    const home = isolated ? 'its own isolated workspace' : folder;
    box.placeholder = terminal
      ? isolated
        ? 'a plain terminal in its own isolated workspace. say what to call the workspace.'
        : `a plain terminal in ${home}. type a command, or leave it empty.`
      : isolated
        ? "say what you want doing. it works in its own isolated workspace, out of everyone's way."
        : `say what you want doing. it works right in ${folder}, alongside anyone else in there.`;
    if (revivable && !terminal && !isolated) {
      label.textContent = `put ${revivable} back up?`;
      label.style.color = '#e0b56a';
      label.style.cursor = 'pointer';
    } else {
      label.textContent = terminal
        ? isolated
          ? 'what to call it?'
          : 'what to run first?'
        : 'what is it for?';
      label.style.color = '#d9c49a';
      label.style.cursor = 'default';
    }
    summary.textContent = [
      isolated ? 'isolated workspace' : (hooks.among ?? 'project folder'),
      'blank start',
      terminal ? 'terminal' : hooks.hand,
    ].join(' · ');
    go.textContent = terminal ? 'open terminal' : `put ${hooks.hand} to work`;
  };

  const submit = (past: PastSession | null = null): void => {
    if (closed) return;
    const ask: NewSessionAsk = {
      text: box.value.trim(),
      isolated,
      terminal,
      past,
    };
    close();
    hooks.submit(ask);
  };
  const dismiss = (): void => {
    if (closed) return;
    close();
    hooks.cancel();
  };

  go.addEventListener('click', () => submit());
  cancel.addEventListener('click', dismiss);
  label.addEventListener('click', () => {
    if (label.style.cursor !== 'pointer') return;
    close();
    hooks.revive();
  });

  /* Everything that happens on the sign is the sign's: the app's one keydown
     listener and its pointer handling sit on the window, under this. */
  for (const kind of ['keydown', 'keyup', 'pointerdown', 'pointerup', 'click', 'wheel'] as const) {
    scrim.addEventListener(kind, (event) => event.stopPropagation());
  }
  scrim.addEventListener('pointerdown', (event) => {
    if (event.target === scrim) dismiss();
  });
  scrim.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      dismiss();
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  });

  const close = (): void => {
    closed = true;
    pastBoard?.close();
    pastBoard = null;
    scrim.remove();
  };

  paint();
  document.body.append(scrim);
  box.focus();
  if (hooks.past) openPast();

  return {
    revivable(title) {
      revivable = title;
      if (!closed) paint();
    },
    close,
  };
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
