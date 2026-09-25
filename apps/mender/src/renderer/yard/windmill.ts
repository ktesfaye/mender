/**
 * The windmill: the app's own settings, an island of their own.
 *
 * Not a project's — nothing here is about any one checkout. There is no
 * windmill sprite in the kit yet, so this is reached the village's other
 * way: a chord (⌘,) and a line in the finder, same as any other doing. It
 * opens the same kind of window a project's own settings already use, over
 * everything, closing the same three ways.
 *
 * Small on purpose, and meant to grow the way the project window did: one
 * real, working thing today — who a fresh session starts with — rather than
 * a page of switches that do nothing yet.
 */

import type { Hand } from '@shared/app-settings';

export interface WindmillState {
  hand: string | null;
  hands: Hand[] | null;
}

export interface WindmillDoings {
  choose(id: string): Promise<void>;
  closed(): void;
}

export interface Windmill {
  update(state: WindmillState): void;
  escaped(): void;
  holds(event: KeyboardEvent): boolean;
  close(): void;
}

export function openWindmill(state: WindmillState, does: WindmillDoings): Windmill {
  let now = state;

  const back = el('div', 'settings-back');
  const panel = el('div', 'settings windmill');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  back.appendChild(panel);

  let downOutside = false;
  back.addEventListener('pointerdown', (event) => {
    downOutside = event.target === back;
  });
  back.addEventListener('click', (event) => {
    if (downOutside && event.target === back) close();
    downOutside = false;
  });

  const head = el('div', 'settings-head');
  const who = el('div', 'settings-who');
  const heading = el('div', 'settings-name founding-heading');
  heading.textContent = 'The windmill';
  who.appendChild(heading);
  const shut = button('×', 'settings-close', () => close());
  shut.setAttribute('aria-label', 'Close');
  head.append(who, shut);

  const body = el('div', 'settings-body');
  const general = section('General');
  body.append(general.root);
  panel.append(head, body);

  document.body.appendChild(back);
  back.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
  panel.animate(
    [
      { opacity: 0, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)' }
  );

  function drawGeneral(): void {
    const hint = el('p', 'settings-hint');
    hint.textContent = 'Who a fresh session starts with, until you say otherwise.';
    if (!now.hands) {
      const reading = el('p', 'settings-hint');
      reading.textContent = 'Reading it…';
      general.fill([hint, reading]);
      return;
    }
    const list = el('div', 'settings-grid');
    for (const hand of now.hands) {
      const one = el('div', 'windmill-hand');
      one.tabIndex = 0;
      one.setAttribute('role', 'button');
      const picked = hand.id === now.hand;
      one.setAttribute('aria-pressed', String(picked));
      if (picked) one.classList.add('picked');
      if (!hand.here) one.classList.add('away');
      one.textContent = hand.name;
      one.title = hand.here ? hand.name : `${hand.name} — not installed`;
      const pick = (): void => {
        if (picked) return;
        void does.choose(hand.id).then(() => draw());
      };
      one.addEventListener('click', pick);
      one.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          pick();
        }
      });
      list.appendChild(one);
    }
    general.fill([hint, list]);
  }

  function draw(): void {
    drawGeneral();
  }

  draw();
  shut.focus({ preventScroll: true });

  let open = true;
  function close(): void {
    if (!open) return;
    open = false;
    back.remove();
    does.closed();
  }

  return {
    update(next) {
      now = next;
      draw();
    },
    escaped: () => close(),
    holds: (event) => open && (panel.contains(event.target as Node) || event.target === back),
    close,
  };
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string
): HTMLElementTagNameMap[K] {
  const made = document.createElement(tag);
  made.className = className;
  return made;
}

function button(said: string, className: string, does: () => void): HTMLButtonElement {
  const made = el('button', className);
  made.type = 'button';
  made.textContent = said;
  made.addEventListener('click', does);
  return made;
}

function section(title: string): { root: HTMLElement; fill(children: HTMLElement[]): void } {
  const root = el('section', 'settings-section');
  const label = el('h3', 'settings-label');
  label.textContent = title;
  const inner = el('div', 'settings-inner');
  root.append(label, inner);
  return { root, fill: (children) => inner.replaceChildren(...children) };
}
