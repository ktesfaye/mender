import '../glass/slabs.css';
import { glaze, TINT_YARD } from '../glass/glass';
import { px } from '../glass/px';
import { openPastSession, type PastSession, type PastTold } from './past-session';
import { cutOf, KIT_NAMES, sprite } from './sprite';
import { ask } from './standing';

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

export function openNewSession(hooks: NewSessionHooks): NewSessionSign {
  let isolated = Boolean(hooks.isolated);
  /* Command-N hangs the sign with isolation already on, which is a guess
     about a conversation. Only a press on the tile itself says a terminal
     wants a copy of its own. */
  let isolatedByHand = false;
  let terminal = false;
  let revivable: string | null = null;
  let closed = false;

  const scrim = h('div', 'gs-over');
  scrim.dataset.newSession = '';
  const win = glaze(h('div', 'gs-win'), { tint: TINT_YARD, blur: 26 });
  win.style.width = '720px';
  scrim.append(win);

  const shut = h('div', 'g-x');
  shut.append(px('close', '#f6ecdb', 11));
  const crumbs = h('div', 'g-crumbs');
  crumbs.append(
    h('span', 'g-gold', 'yard'),
    h('span', 'g-faint', '\u203a'),
    h('span', 'g-mute', 'a new session')
  );
  const title = h('h1', 'gs-h1 g-serif', 'A new session');
  const sub = h('div', 'gs-sub');
  const chip = (icon: string, color: string, words: string): HTMLElement => {
    const c = h('span', 'g-chip');
    c.append(px(icon, color, 12), document.createTextNode(words));
    return c;
  };
  const chipWhere = chip('flag', '#f2c66d', hooks.where);
  const chipHand = chip('spark', '#ffb896', hooks.hand);
  const chipHome = h('span', 'g-chip');
  const homeDot = h('span', 'g-dot');
  const homeText = document.createTextNode('');
  chipHome.append(homeDot, homeText);
  sub.append(chipWhere, chipHand, chipHome);

  const asked = h('div', 'gs-sec');
  const labelRow = h('div', 'gs-labelrow');
  const label = h('div', 'g-pix g-label');
  const revive = h('span', 'gs-revive');
  labelRow.append(label, revive);
  const field = h('div', 'gs-ta');
  const box = document.createElement('textarea');
  box.spellcheck = false;
  const cnt = h('span', 'gs-cnt', 'optional');
  field.append(box, cnt);
  box.addEventListener('input', () => {
    cnt.style.display = box.value ? 'none' : '';
  });
  asked.append(labelRow, field);

  const tilesWrap = h('div', 'gs-sec');
  tilesWrap.append(h('div', 'g-pix g-label', 'where it works'));
  const tiles = h('div', 'gs-tiles');
  tilesWrap.append(tiles);
  const tile = (
    file: string,
    height: number,
    name: string,
    words: string,
    flip: () => void
  ): { face: HTMLElement; tag: HTMLElement } => {
    const face = h('div', 'gs-tile g-card');
    const tag = h('span', 'gs-tag');
    tag.append(px('check', '#f2c66d', 11), document.createTextNode('chosen'));
    const well = h('div', 'gs-art');
    const cut = cutOf(file);
    const times = Math.max(1, Math.min(4, Math.round(height / (cut?.h ?? height)))) as
      | 1
      | 2
      | 3
      | 4;
    well.append(sprite(file, times));
    face.append(tag, well, h('b', '', name), h('span', 'gs-d', words));
    face.addEventListener('click', () => {
      flip();
      paint();
    });
    tiles.append(face);
    return { face, tag };
  };
  const iso = tile(
    KIT_NAMES.crate,
    32,
    'In a copy of its own',
    'an isolated workspace on a fresh branch. nothing it does touches the folder.',
    () => {
      isolated = !isolated;
      isolatedByHand = true;
    }
  );
  const past = tile(
    KIT_NAMES.lanternOn,
    40,
    'Start from a past one',
    'pick up a conversation already had, with all it said.',
    () => {
      openPast();
    }
  );
  /* A terminal is opened, not configured: one press and it is up, in the
     folder you are standing in, running whatever is in the box. */
  const term = tile(
    KIT_NAMES.anvil,
    32,
    'Open a terminal',
    'a plain shell in the folder. what you type is run first.',
    () => {
      terminal = true;
      if (!isolatedByHand) isolated = false;
      submit();
    }
  );

  const plan = h('div', 'gs-plan g-card');

  const bar = h('div', 'gs-bar');
  const cancel = h('span', 'g-ghost g-plain gs-end', 'cancel');
  const go = h('span', 'g-pill');
  bar.append(cancel, go);

  win.append(shut, crumbs, title, sub, asked, tilesWrap, plan, bar);

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
    for (const [t, on] of [
      [iso, isolated],
      [past, false],
      [term, terminal],
    ] as const) {
      t.face.classList.toggle('g-on', on);
      t.tag.style.display = on ? 'flex' : 'none';
    }
    const folder = hooks.among ?? "the project's own folder";
    box.placeholder = terminal
      ? isolated
        ? 'name the workspace. the terminal in it opens with nothing run.'
        : `type a command to run first, or leave it empty.`
      : isolated
        ? 'name the workspace. the session in it starts with nothing said.'
        : `say what you want doing. it works right in ${folder}, alongside anyone else in there.`;
    if (revivable && !terminal && !isolated) {
      revive.textContent = `put ${revivable} back up?`;
      revive.style.display = '';
    } else {
      revive.style.display = 'none';
    }
    label.textContent = isolated
      ? 'what to call it'
      : terminal
        ? 'what to run first'
        : 'what is it for';
    homeDot.style.background = isolated ? '#7aaaff' : '#9bd28a';
    homeText.textContent = isolated ? 'a copy of its own' : (hooks.among ?? 'the project folder');
    const step = (icon: string, color: string, big: string, small: string): HTMLElement => {
      const p = h('div', 'gs-p');
      const words = h('div');
      words.append(h('b', '', big), h('small', '', small));
      p.append(px(icon, color, 18), words);
      return p;
    };
    plan.replaceChildren();
    if (isolated) {
      plan.append(
        step('branch', '#7aaaff', 'a fresh branch', 'named from what you write'),
        h('span', 'gs-div'),
        step('house', '#9bd28a', 'joins the beam', 'as its own board'),
        h('span', 'gs-div'),
        step('clock', '#ff9a4a', 'a moment to set up', 'its setup script runs first')
      );
    } else {
      plan.append(
        step('house', '#9bd28a', 'works in the folder', `${folder}, beside anyone else there`),
        h('span', 'gs-div'),
        step(
          terminal ? 'term' : 'spark',
          '#ffb896',
          terminal ? 'a plain shell' : hooks.hand,
          terminal ? 'what you type is run first' : 'starts right away'
        )
      );
    }
    go.replaceChildren(
      px(terminal ? 'term' : 'flame', '#2a1b09', 15),
      document.createTextNode(terminal ? 'open terminal' : `put ${hooks.hand} to work`)
    );
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
  shut.addEventListener('click', dismiss);
  revive.addEventListener('click', () => {
    close();
    hooks.revive();
  });

  /* Everything that happens on the sign is the sign's: the app's one keydown
     listener and its pointer handling sit on the window, under this. */
  for (const kind of ['keydown', 'keyup', 'pointerdown', 'pointerup', 'click', 'wheel'] as const) {
    scrim.addEventListener(kind, (event) => event.stopPropagation());
  }
  scrim.addEventListener('pointerdown', (event) => {
    if (!win.contains(event.target as Node)) dismiss();
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
  /* Heard wherever the keyboard is, so a press that took it off the box does
     not leave Return and Escape answering nothing. */
  ask({ yes: () => submit(), no: dismiss, at: scrim });
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

function h(tag: string, cls = '', words = ''): HTMLElement {
  const made = document.createElement(tag);
  if (cls) made.className = cls;
  if (words) made.textContent = words;
  return made;
}
