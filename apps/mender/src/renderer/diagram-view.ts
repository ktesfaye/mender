/**
 * A diagram you can pan and zoom.
 *
 * A mermaid diagram is drawn at its own size rather than shrunk to fit the
 * column, because shrinking away the width throws away the one thing worth
 * reading on it: its text. So it draws inside a clipped window and the wheel
 * and a drag move it, the way any map does, instead of the page moving
 * around a picture that has already lost its detail.
 *
 * Pressing "open it" holds the same diagram up in a glass window of its own,
 * as big as the window allows, with the zoom written under it.
 */

import { glaze } from './glass/glass';
import { h, ghost, sign } from './glass/read';

const MIN_SCALE = 0.2;
const MAX_SCALE = 5;
const SVG_SIZE = /width="([\d.]+)"\s+height="([\d.]+)"/;

interface View {
  root: HTMLElement;
  zoom(by: number): void;
  fit(): void;
  readonly scale: number;
  onScale?: (scale: number) => void;
}

/** A pannable, zoomable window onto one drawn SVG. */
function view(svg: string, wide: number, tall: number, start: 'fit' | number): View {
  const root = h('div', 'gr-dia');
  const inner = h('div', 'gr-dia-in');
  inner.innerHTML = svg;
  root.appendChild(inner);

  let scale = 1;
  let x = 0;
  let y = 0;

  const out: View = {
    root,
    get scale() {
      return scale;
    },
    zoom(by) {
      const rect = root.getBoundingClientRect();
      around(rect.width / 2, rect.height / 2, by);
    },
    fit() {
      const rect = root.getBoundingClientRect();
      const room = { w: rect.width || wide, h: rect.height || tall };
      scale = Math.min(1.6, (room.w - 80) / wide, (room.h - 80) / tall);
      x = (room.w - wide * scale) / 2;
      y = (room.h - tall * scale) / 2;
      apply();
    },
  };

  function apply(): void {
    inner.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    out.onScale?.(scale);
  }
  function around(px: number, py: number, factor: number): void {
    const before = scale;
    scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
    /* The point under the pointer stays under it, which is what makes a
       zoom read as looking closer rather than as the diagram jumping. */
    x = px - ((px - x) / before) * scale;
    y = py - ((py - y) / before) * scale;
    apply();
  }

  if (start === 'fit') {
    scale = 1;
    /* Sized once it is on the page. */
    requestAnimationFrame(() => out.fit());
  } else {
    scale = start;
    apply();
  }

  root.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      const rect = root.getBoundingClientRect();
      around(event.clientX - rect.left, event.clientY - rect.top, Math.exp(-event.deltaY * 0.0015));
    },
    { passive: false }
  );

  let dragging = false;
  let last = { x: 0, y: 0 };
  root.addEventListener('pointerdown', (event) => {
    if ((event.target as HTMLElement).closest('[data-nodrag]')) return;
    dragging = true;
    last = { x: event.clientX, y: event.clientY };
    root.setPointerCapture(event.pointerId);
    root.style.cursor = 'grabbing';
  });
  root.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    x += event.clientX - last.x;
    y += event.clientY - last.y;
    last = { x: event.clientX, y: event.clientY };
    apply();
  });
  const stop = (): void => {
    dragging = false;
    root.style.cursor = 'grab';
  };
  root.addEventListener('pointerup', stop);
  root.addEventListener('pointerleave', stop);
  return out;
}

/** The diagram inline: a clipped window onto it, and a way to open it big.
    `capWide`/`capTall` bound the window itself, not the diagram. */
export function makeDiagramView(svg: string, capWide = 640, capTall = 420): HTMLElement {
  const size = SVG_SIZE.exec(svg);
  const wide = size ? Number(size[1]) : capWide;
  const tall = size ? Number(size[2]) : capTall;
  const v = view(svg, wide, tall, Math.min(1, capWide / wide, capTall / tall));
  v.root.style.width = `${Math.min(wide, capWide)}px`;
  v.root.style.height = `${Math.min(tall, capTall)}px`;
  const open = ghost('open it', 'fit');
  open.dataset.nodrag = 'yes';
  open.classList.add('gr-dia-open');
  open.addEventListener('click', (event) => {
    event.stopPropagation();
    hold(svg, wide, tall);
  });
  v.root.appendChild(open);
  return v.root;
}

let held: (() => void) | null = null;

/** The diagram held up in a window of glass, as big as the window allows. */
function hold(svg: string, wide: number, tall: number): void {
  held?.();
  const wash = h('div', 'gr-dia-wash');
  const win = h('div', 'gr-dia-win');
  glaze(win);
  const v = view(svg, wide, tall, 'fit');
  v.root.classList.add('gr-dia-big');

  const way = h('div', 'g-crumbs gr-dia-way');
  way.append(
    h('span', 'g-gold', 'yard'),
    h('span', 'g-faint', '›'),
    h('span', 'g-mute', 'a diagram')
  );
  const shut = h('div', 'g-x', '×');

  const zoom = h('div', 'gr-dia-zoom');
  zoom.dataset.nodrag = 'yes';
  const minus = h('b');
  minus.appendChild(sign('minus', '#f2c66d', 16));
  const plus = h('b');
  plus.appendChild(sign('plus', '#f2c66d', 16));
  const pct = h('span', '', '100%');
  zoom.append(minus, pct, plus);
  const fit = ghost('fit to the window', 'fit');
  fit.dataset.nodrag = 'yes';
  const bar = h('div', 'gr-dia-bar');
  bar.append(zoom, fit);

  v.onScale = (scale) => (pct.textContent = `${Math.round(scale * 100)}%`);
  minus.addEventListener('click', () => v.zoom(1 / 1.25));
  plus.addEventListener('click', () => v.zoom(1.25));
  fit.addEventListener('click', () => v.fit());

  win.append(v.root, way, shut, bar);
  wash.appendChild(win);
  wash.addEventListener('click', (event) => {
    if (event.target === wash) close();
  });
  shut.addEventListener('click', close);
  const keys = (event: KeyboardEvent): void => {
    if (event.metaKey) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.key === 'Escape') close();
  };
  window.addEventListener('keydown', keys, true);
  function close(): void {
    if (held !== close) return;
    held = null;
    window.removeEventListener('keydown', keys, true);
    wash.remove();
  }
  held = close;
  document.body.appendChild(wash);
  requestAnimationFrame(() => requestAnimationFrame(() => v.fit()));
}
