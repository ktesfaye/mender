/**
 * Founding a project: what the campfire is for.
 *
 * A checkout can arrive three ways — one already on disk, one that only
 * exists somewhere else and has to be cloned, or one that does not exist yet
 * anywhere. The native folder picker has always covered the first. This is
 * the glass that offers all three, laid over the island: one tile for each
 * way in, and one box to write in when the way picked needs an address or a name.
 */

import { glaze } from '../glass/glass';
import { ISLAND_LOOK } from '../glass/island-look';
import '../glass/island.css';
import { px } from '../glass/px';
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

const FOLDER = 'props/TX Village Props - Crate 01 A.png';
const CLONE = 'props/TX Village Props - Cart 01 E.png';
const CREATE = 'props/TX Village Props - Flower Pot 03.png';

export function openFounding(does: FoundingDoings): Founding {
  const scrim = el('div', {});
  scrim.className = 'i-found-scrim';
  const board = el('div', {});
  board.className = 'i-found';
  board.setAttribute('role', 'dialog');
  board.setAttribute('aria-modal', 'true');
  glaze(board, ISLAND_LOOK);
  scrim.append(board);

  let downOutside = false;
  scrim.addEventListener('pointerdown', (event) => {
    downOutside = event.target === scrim;
  });
  scrim.addEventListener('click', (event) => {
    if (downOutside && event.target === scrim) close();
    downOutside = false;
  });

  document.body.appendChild(scrim);
  board.animate(
    [
      { transform: 'translate(-50%, -14px)', opacity: 0 },
      { transform: 'translate(-50%, 0)', opacity: 1 },
    ],
    { duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)' }
  );

  /* What is asked: the three ways in, or the one a choice opened. Kept as a
     tag rather than booleans so drawing it is one switch. */
  type Asking = { kind: 'which' } | { kind: 'clone' } | { kind: 'create'; private: boolean };
  let asking: Asking = { kind: 'which' };
  let written = '';

  /* What Return means on the page showing: nothing while it is asking which
     of three, and making it once it is asking for an address or a name. */
  let yes: (() => void) | null = null;

  const tile = (file: string, name: string, about: string, hot: boolean, press: () => void) => {
    const face = el('div', {});
    face.className = hot ? 'i-bigtile i-hot' : 'i-bigtile';
    const art = el('div', {});
    art.className = 'i-art';
    /* The kit's props are drawn at their own sizes, a cart several crates
       long, so each is scaled by whole pixels to fit the same well. */
    const cut = cutOf(file);
    const fit = cut ? Math.floor(Math.min(56 / cut.h, 120 / cut.w)) : 1;
    const times = Math.max(1, Math.min(4, fit)) as 1 | 2 | 3 | 4;
    const holder = el('div', {
      width: `${(cut?.w ?? 16) * times}px`,
      height: `${(cut?.h ?? 16) * times}px`,
    });
    holder.append(sprite(file, times));
    art.append(holder);
    face.append(art, text('b', name), text('span', about));
    face.addEventListener('click', press);
    return face;
  };

  const ghost = (words: string, press: () => void): HTMLElement => {
    const made = text('span', words);
    made.className = 'g-ghost';
    made.addEventListener('mousedown', (event) => event.preventDefault());
    made.addEventListener('click', press);
    return made;
  };

  const pill = (sign: string, words: string, press: () => void): HTMLElement => {
    const made = el('span', {});
    made.className = 'g-pill';
    made.append(px(sign, '#2a1b09', 14), document.createTextNode(words));
    made.addEventListener('mousedown', (event) => event.preventDefault());
    made.addEventListener('click', press);
    return made;
  };

  const field = (placeholder: string, value: string): HTMLInputElement => {
    const input = document.createElement('input');
    input.className = 'i-line';
    input.spellcheck = false;
    input.placeholder = placeholder;
    input.value = value;
    return input;
  };

  const asked = (label: string, input: HTMLElement): HTMLElement => {
    const wrap = el('div', {});
    const words = text('div', label);
    words.className = 'g-pix i-lab';
    wrap.append(words, input);
    return wrap;
  };

  const chip = (sign: string, tint: string, words: string): HTMLElement => {
    const made = el('span', {});
    made.className = 'g-chip';
    made.append(px(sign, tint, 12), document.createTextNode(words));
    return made;
  };

  const goBack = (): void => {
    asking = { kind: 'which' };
    draw();
  };

  function draw(): void {
    const close_ = el('div', {});
    close_.className = 'g-x';
    close_.textContent = '×';
    close_.addEventListener('click', () => close());
    const crumbs = el('div', {});
    crumbs.className = 'g-crumbs';
    crumbs.append(
      Object.assign(el('span', {}), { className: 'g-gold', textContent: 'the island' }),
      Object.assign(el('span', {}), { className: 'g-faint', textContent: '›' }),
      Object.assign(el('span', {}), { className: 'g-mute', textContent: 'the campfire' })
    );
    crumbs.firstElementChild?.addEventListener('click', () => close());
    const title = text('h1', 'where does its checkout come from?');
    title.className = 'g-serif';
    const sub = text(
      'div',
      'three ways in. whichever it is, it lands as a fresh district with its settings open.'
    );
    sub.className = 'i-sub';

    const grid = el('div', {});
    grid.className = 'i-grid';
    grid.append(
      tile(FOLDER, 'a folder on disk', 'pick one you already have', false, () => {
        does.folder();
        close();
      }),
      tile(CLONE, 'clone one', 'bring it down from an address', asking.kind === 'clone', () => {
        asking = { kind: 'clone' };
        draw();
      }),
      tile(
        CREATE,
        'start a new one',
        'made for real, then cloned back down',
        asking.kind === 'create',
        () => {
          asking = { kind: 'create', private: true };
          draw();
        }
      )
    );

    const parts: HTMLElement[] = [close_, crumbs, title, sub, grid];
    const foot = el('div', {});
    foot.className = 'i-fnd-ft';
    yes = null;
    let focus: HTMLInputElement | null = null;

    if (asking.kind === 'clone') {
      const input = field('git@github.com:owner/repo.git', written);
      const go = (): void => {
        if (!input.value.trim()) return input.focus();
        does.clone(input.value.trim());
        close();
      };
      wire(input, go);
      const form = el('div', {});
      form.className = 'g-card i-form';
      const row = el('div', {});
      row.className = 'i-f1 i-one';
      row.append(asked('where is it?', input));
      form.append(row);
      parts.push(form);
      foot.append(ghost('back', goBack), pill('plus', 'clone it', go));
      yes = go;
      focus = input;
    } else if (asking.kind === 'create') {
      const state = asking;
      const input = field('owner/repo, or just a name', written);
      const go = (): void => {
        if (!input.value.trim()) return input.focus();
        does.create(input.value.trim(), state.private);
        close();
      };
      wire(input, go);
      const flip = (to: boolean) => () => {
        asking = { kind: 'create', private: to };
        draw();
      };
      const side = (on: boolean, sign: string, name: string, press: () => void): HTMLElement => {
        const made = el('div', {});
        made.className = on ? 'i-segon' : '';
        made.append(px(sign, on ? '#2a1b09' : '#f2c66d', 14), document.createTextNode(name));
        if (!on) made.addEventListener('click', press);
        return made;
      };
      const seg = el('div', {});
      seg.className = 'i-seg';
      seg.append(
        side(state.private, 'lock', 'private', flip(true)),
        side(!state.private, 'globe', 'public', flip(false))
      );
      const form = el('div', {});
      form.className = 'g-card i-form';
      const row = el('div', {});
      row.className = 'i-f1';
      row.append(asked('its name', input), asked('who can see it', seg));
      const how = el('div', {});
      how.className = 'i-how';
      how.append(chip('merge', '#7aaaff', 'made on github, then cloned back down'));
      form.append(row, how);
      parts.push(form);
      foot.append(ghost('back', goBack), pill('plus', 'start it', go));
      yes = go;
      focus = input;
    } else {
      foot.append(ghost('cancel', () => close()));
    }
    parts.push(foot);
    board.replaceChildren(...parts);
    focus?.focus();
  }

  function wire(input: HTMLInputElement, go: () => void): void {
    input.addEventListener('input', () => (written = input.value));
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        go();
      }
    });
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

function text(tag: string, words: string): HTMLElement {
  const made = el(tag, {});
  made.textContent = words;
  return made;
}
