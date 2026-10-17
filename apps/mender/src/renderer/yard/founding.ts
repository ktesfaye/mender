/**
 * Founding a project: what the campfire is for.
 *
 * A checkout can arrive three ways — one already on disk, one that only
 * exists somewhere else and has to be cloned, or one that does not exist yet
 * anywhere. The native folder picker has always covered the first. This is
 * the signboard that offers all three: hung on two cords over the island the
 * way the new-session sign is, one tile for each way in, and turned over to
 * one box to write in when the way picked needs an address or a name.
 */

import { cutOf, sprite } from './sprite';
import { ask } from './standing';

export interface FoundingDoings {
  /** The plain, pre-existing folder picker. */
  folder(): void;
  /** Clone a URL. What happens after is said the same way founding a folder is. */
  clone(url: string): void;
  /** Make a fresh repository and clone it straight back down. */
  create(name: string, isPrivate: boolean): void;
  closed(): void;
}

export interface Founding {
  escaped(): void;
  holds(event: KeyboardEvent): boolean;
  close(): void;
}

const ON = { bg: '#e0b56a', fg: '#482510', bd: '#482510', sh: '3px 3px 0 rgba(0,0,0,.45)' };
const OFF = { bg: '#3a2712', fg: '#d9c49a', bd: '#3a2712', sh: 'none' };

const FOLDER = 'props/TX Village Props - Crate 01 A.png';
const CLONE = 'props/TX Village Props - Cart 01 E.png';
const CREATE = 'props/TX Village Props - Flower Pot 03.png';

export function openFounding(does: FoundingDoings): Founding {
  const scrim = el('div', {
    position: 'fixed',
    inset: '0',
    zIndex: '50',
    background: 'rgba(12,8,4,.62)',
    fontFamily: "'Josefin Sans', sans-serif",
  });
  const hang = el('div', {
    position: 'absolute',
    left: '50%',
    top: '40px',
    transform: 'translateX(-50%)',
    width: '560px',
    maxWidth: 'calc(100vw - 32px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  });
  hang.setAttribute('role', 'dialog');
  hang.setAttribute('aria-modal', 'true');
  const cords = el('div', { display: 'flex', justifyContent: 'space-between', width: '340px' });
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
  const title = text('span', '', {
    fontSize: '22px',
    letterSpacing: '.28em',
    textTransform: 'uppercase',
    fontWeight: '600',
  });
  const under = text('span', '', { fontSize: '14px', color: '#d9c49a' });
  head.append(title, under);
  const body = el('div', { display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' });
  const foot = el('div', {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    padding: '14px 20px',
    borderTop: '2px solid #3a2712',
    background: '#241810',
  });
  board.append(head, body, foot);
  hang.append(cords, board);
  scrim.append(hang);

  let downOutside = false;
  scrim.addEventListener('pointerdown', (event) => {
    downOutside = event.target === scrim || event.target === hang;
  });
  scrim.addEventListener('click', (event) => {
    if (downOutside && (event.target === scrim || event.target === hang)) close();
    downOutside = false;
  });

  document.body.appendChild(scrim);
  scrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
  hang.animate(
    [
      { transform: 'translate(-50%, -24px)', opacity: 0 },
      { transform: 'translate(-50%, 0)', opacity: 1 },
    ],
    { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' }
  );

  /* What is asked: the three ways in, or one of the two questions a choice
     opened. Kept as a tag rather than three booleans so drawing it is one
     switch instead of a pile of ifs. */
  type Asking = { kind: 'which' } | { kind: 'clone' } | { kind: 'create'; private: boolean };
  let asking: Asking = { kind: 'which' };

  const tile = (file: string, words: string, on: boolean, does: () => void) => {
    const look = on ? ON : OFF;
    const face = el('div', {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      padding: '14px 8px 12px',
      textAlign: 'center',
      cursor: 'pointer',
      border: `2px solid ${look.bd}`,
      background: look.bg,
      color: look.fg,
      boxShadow: look.sh,
    });
    const well = el('div', {
      width: '96px',
      height: '56px',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
    });
    /* The kit's props are drawn at their own sizes, a cart several crates
       long, so each is scaled by whole pixels to fit the same well. */
    const cut = cutOf(file);
    const fit = cut ? Math.floor(Math.min(56 / cut.h, 96 / cut.w)) : 1;
    well.append(sprite(file, Math.max(1, Math.min(4, fit)) as 1 | 2 | 3 | 4));
    face.append(well, text('span', words, { fontSize: '14px', lineHeight: '1.3' }));
    face.addEventListener('mouseenter', () => {
      if (!on) face.style.borderColor = '#6b5a40';
    });
    face.addEventListener('mouseleave', () => {
      if (!on) face.style.borderColor = look.bd;
    });
    face.addEventListener('click', does);
    return face;
  };

  const plank = (words: string, gold: boolean, does: () => void): HTMLElement => {
    const made = text('span', words, {
      cursor: 'pointer',
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: gold ? '600' : '400',
      color: gold ? '#482510' : '#d9c49a',
      border: `2px solid ${gold ? '#482510' : '#3a2712'}`,
      background: gold ? '#e0b56a' : '#5a3a1c',
      boxShadow: gold ? '3px 3px 0 rgba(0,0,0,.45)' : 'none',
    });
    if (gold) {
      made.addEventListener('pointerdown', () => {
        made.style.transform = 'translate(2px,2px)';
        made.style.boxShadow = '1px 1px 0 rgba(0,0,0,.45)';
      });
      const lift = (): void => {
        made.style.transform = '';
        made.style.boxShadow = '3px 3px 0 rgba(0,0,0,.45)';
      };
      made.addEventListener('pointerup', lift);
      made.addEventListener('pointerleave', lift);
    }
    made.addEventListener('click', does);
    return made;
  };

  const field = (placeholder: string, value: string): HTMLInputElement => {
    const input = document.createElement('input');
    input.spellcheck = false;
    input.placeholder = placeholder;
    input.value = value;
    Object.assign(input.style, {
      fontFamily: "'Josefin Sans', sans-serif",
      fontSize: '15px',
      lineHeight: '1.5',
      padding: '12px',
      background: '#1d1811',
      color: '#f4e3c0',
      border: '2px solid #3a2712',
      boxShadow: 'inset 0 4px 0 #120e09',
      outline: 'none',
    } satisfies Partial<CSSStyleDeclaration>);
    return input;
  };

  /* What Return means on the page showing: nothing while it is asking which
     of three, and making it once it is asking for an address or a name. */
  let yes: (() => void) | null = null;

  const goBack = (): void => {
    asking = { kind: 'which' };
    draw();
  };

  function drawWhich(): void {
    title.textContent = 'Found a project';
    under.textContent = 'where does its checkout come from?';
    const tiles = el('div', {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
      gap: '8px',
    });
    tiles.append(
      tile(FOLDER, 'a folder on disk', false, () => {
        does.folder();
        close();
      }),
      tile(CLONE, 'clone a repository', false, () => {
        asking = { kind: 'clone' };
        draw();
      }),
      tile(CREATE, 'start a new one', false, () => {
        asking = { kind: 'create', private: true };
        draw();
      })
    );
    body.replaceChildren(tiles);
    foot.replaceChildren(plank('cancel', false, () => close()));
    yes = null;
  }

  function asked(label: string, input: HTMLInputElement): HTMLElement {
    const wrap = el('div', { display: 'flex', flexDirection: 'column', gap: '6px' });
    wrap.append(text('span', label, { fontSize: '15px', color: '#d9c49a' }), input);
    return wrap;
  }

  let written = '';

  function drawClone(): void {
    title.textContent = 'Clone a repository';
    under.textContent = 'it is copied down and moves in';
    const input = field('git@github.com:owner/repo.git', written);
    const go = (): void => {
      if (!input.value.trim()) return input.focus();
      does.clone(input.value.trim());
      close();
    };
    input.addEventListener('input', () => (written = input.value));
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        go();
      }
    });
    body.replaceChildren(asked('where is it?', input));
    foot.replaceChildren(plank('back', false, goBack), plank('clone it', true, go));
    yes = go;
    input.focus();
  }

  function drawCreate(): void {
    if (asking.kind !== 'create') return;
    const state = asking;
    title.textContent = 'Start a new one';
    under.textContent = 'made on GitHub, then cloned straight back down';
    const input = field('owner/repo, or just a name', written);
    const go = (): void => {
      if (!input.value.trim()) return input.focus();
      does.create(input.value.trim(), state.private);
      close();
    };
    input.addEventListener('input', () => (written = input.value));
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        go();
      }
    });
    const flip = (to: boolean) => () => {
      asking = { kind: 'create', private: to };
      draw();
    };
    const sides = el('div', {
      display: 'grid',
      gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
      gap: '8px',
    });
    sides.append(
      side('private', 'only you can see it', state.private, flip(true)),
      side('public', 'anyone can see it', !state.private, flip(false))
    );
    body.replaceChildren(asked('what is it called?', input), sides);
    foot.replaceChildren(plank('back', false, goBack), plank('start it', true, go));
    yes = go;
    input.focus();
  }

  function side(name: string, about: string, on: boolean, does: () => void): HTMLElement {
    const look = on ? ON : OFF;
    const face = el('div', {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      padding: '10px 12px',
      cursor: 'pointer',
      border: `2px solid ${look.bd}`,
      background: look.bg,
      color: look.fg,
      boxShadow: look.sh,
    });
    face.append(
      text('span', name, { fontSize: '14px', fontWeight: '600' }),
      text('span', about, { fontSize: '12px', opacity: '.8' })
    );
    face.addEventListener('click', does);
    return face;
  }

  function draw(): void {
    if (asking.kind === 'which') drawWhich();
    else if (asking.kind === 'clone') drawClone();
    else drawCreate();
  }

  draw();

  const escaped = (): void => {
    if (asking.kind !== 'which') return goBack();
    close();
  };
  /* Kept after each answer, since Escape on an inner page only steps back to
     the first one and the board is still asking. */
  const unask = ask({ yes: () => yes?.(), no: escaped, at: scrim, keep: true });

  let open = true;
  function close(): void {
    if (!open) return;
    open = false;
    unask();
    scrim.remove();
    does.closed();
  }

  return {
    escaped,
    holds: (event) => open && scrim.contains(event.target as Node),
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
