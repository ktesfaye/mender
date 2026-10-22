/**
 * A picture in an answer, held up big.
 *
 * Pressing a picture the agent put in what it said lays it over the whole
 * window at the largest size that fits, with a bar of its own underneath
 * (caption, the other pictures, zoom) so nothing ever sits on the picture.
 * The wheel, a pinch, + and - go in closer where the pointer is, a double
 * press jumps between fitted and real size, and a drag moves it, since a
 * picture worth opening big is usually one with small writing on it. Escape
 * or a press beside the picture puts it back down. It hangs off the document rather than the
 * answer, because the answer is written again whenever the board changes.
 */

import { h, sign } from '../glass/read';

const MIN_SCALE = 1;

let open: (() => void) | null = null;

/** Another picture in the same session, for the arrows to step to. */
export interface Sibling {
  src: string;
  name: string;
  sharper?: () => Promise<string | null> | undefined;
}

export function holdUp(
  src: string,
  name: string,
  sharper?: Promise<string | null>,
  siblings: readonly Sibling[] = [],
  at = 0
): void {
  open?.();
  const all: Sibling[] = siblings.length > 1 ? [...siblings] : [];
  let index = at;

  const wash = h('div', 'gr-pv');
  const stage = h('div', 'gr-pv-stage');
  const picture = document.createElement('img');
  picture.src = src;
  picture.alt = name;
  picture.draggable = false;
  picture.referrerPolicy = 'no-referrer';
  const better = (later?: Promise<string | null>): void => {
    const shown = picture.alt;
    void later?.then((sharp) => {
      if (sharp && picture.alt === shown) picture.src = sharp;
    });
  };
  better(sharper);
  stage.appendChild(picture);
  const shut = h('div', 'g-x gr-pv-x', '×');
  shut.style.background = 'rgba(14,15,18,.6)';
  const thumbs = h('div', 'gr-pv-th');
  const bar = h('div', 'gr-pv-bar');
  const press = (el: HTMLElement, then: () => void): HTMLElement => {
    el.addEventListener('pointerup', (event) => event.stopPropagation());
    el.addEventListener('click', (event) => {
      event.stopPropagation();
      then();
    });
    return el;
  };
  const percent = h('b', '', '100%');
  const zoomBar = h('div', 'gr-pv-zoom');
  zoomBar.append(
    press(h('div', 'gr-pv-z', '−'), () => zoomBy(1 / 1.5)),
    percent,
    press(h('div', 'gr-pv-z', '+'), () => zoomBy(1.5)),
    press(h('div', 'gr-pv-z w', 'fit'), () => zoomTo(1)),
    press(h('div', 'gr-pv-z w', '1:1'), () => zoomTo(actual()))
  );
  const nav = (way: 1 | -1): HTMLElement => {
    const el = h('div', `gr-pv-nav ${way > 0 ? 'r' : 'l'}`);
    el.appendChild(sign(way > 0 ? 'right' : 'left', '#f2c66d', 18));
    el.addEventListener('pointerup', (event) => event.stopPropagation());
    el.addEventListener('click', (event) => {
      event.stopPropagation();
      step(way);
    });
    return el;
  };
  const said = h('div', 'gr-pv-cap');
  const title = h('div', 'g-serif gr-pv-t');
  const sub = h('div', 'g-faint gr-pv-s');
  said.append(title, sub);
  const words = (label: string): void => {
    const place = all.length ? `${index + 1} of ${all.length}` : '';
    title.textContent = label;
    sub.textContent = [place, size()].filter(Boolean).join(' · ');
    said.style.visibility = label ? '' : 'hidden';
    [...thumbs.children].forEach((el, i) => {
      el.classList.toggle('on', i === index);
      if (i === index) (el as HTMLElement).scrollIntoView({ inline: 'center', block: 'nearest' });
    });
  };
  const size = (): string =>
    picture.naturalWidth ? `${picture.naturalWidth} × ${picture.naturalHeight}` : '';
  picture.addEventListener('load', () => words(picture.alt));
  all.forEach((one, i) => {
    const t = h('i');
    t.style.backgroundImage = `url("${one.src}")`;
    t.addEventListener('pointerup', (event) => event.stopPropagation());
    t.addEventListener('click', (event) => {
      event.stopPropagation();
      go(i);
    });
    thumbs.appendChild(t);
  });
  const left = all.length ? nav(-1) : null;
  const right = all.length ? nav(1) : null;
  stage.append(shut, ...(left && right ? [left, right] : []));
  edges();
  bar.append(said, thumbs, zoomBar);
  wash.append(stage, bar);
  words(name);

  let scale = 1;
  let x = 0;
  let y = 0;
  /** The scale at which one picture pixel is one screen pixel. */
  const actual = (): number =>
    picture.naturalWidth && picture.clientWidth
      ? Math.max(1, picture.naturalWidth / picture.clientWidth)
      : 2;
  const limit = (): number => Math.max(8, actual() * 4);
  const apply = (): void => {
    picture.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    stage.style.cursor = 'default';
    picture.style.cursor = scale > 1.01 ? 'zoom-out' : 'zoom-in';
    const fitted = picture.naturalWidth ? picture.clientWidth / picture.naturalWidth : 1;
    percent.textContent = `${Math.round(scale * fitted * 100)}%`;
  };
  apply();
  picture.addEventListener('load', apply);
  window.addEventListener('resize', apply);

  /** Zoom to `next`, keeping the point at (cx, cy) on the screen where it is. */
  function zoomTo(next: number, cx?: number, cy?: number, animate = true): void {
    const box = stage.getBoundingClientRect();
    const px = cx ?? box.left + box.width / 2;
    const py = cy ?? box.top + box.height / 2;
    const left = picture.offsetLeft + box.left;
    const top = picture.offsetTop + box.top;
    const before = scale;
    scale = Math.min(limit(), Math.max(MIN_SCALE, next));
    if (scale === MIN_SCALE) {
      x = 0;
      y = 0;
    } else {
      /* The point under the pointer stays under it. */
      x = px - left - ((px - left - x) / before) * scale;
      y = py - top - ((py - top - y) / before) * scale;
    }
    picture.style.transition = animate ? 'transform 140ms ease-out' : 'none';
    apply();
  }
  function zoomBy(factor: number): void {
    zoomTo(scale * factor);
  }

  wash.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      if ((event.target as HTMLElement).closest('.gr-pv-bar')) return;
      /* A pinch arrives as a wheel with ctrl held and tiny steps. */
      const rate = event.ctrlKey ? 0.01 : 0.0025;
      zoomTo(scale * Math.exp(-event.deltaY * rate), event.clientX, event.clientY, false);
    },
    { passive: false }
  );

  let down: { x: number; y: number } | null = null;
  let moved = false;
  let onPicture = false;
  wash.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
    if ((event.target as HTMLElement).closest('.gr-pv-nav, .gr-pv-bar, .gr-pv-x')) return;
    down = { x: event.clientX, y: event.clientY };
    moved = false;
    onPicture = event.target === picture;
    wash.setPointerCapture(event.pointerId);
  });
  wash.addEventListener('pointermove', (event) => {
    if (!down) return;
    const dx = event.clientX - down.x;
    const dy = event.clientY - down.y;
    if (!moved && Math.hypot(dx, dy) < 4) return;
    moved = true;
    if (scale > 1) {
      x += dx;
      y += dy;
      picture.style.transition = 'none';
      apply();
    }
    down = { x: event.clientX, y: event.clientY };
  });
  wash.addEventListener('pointerup', (event) => {
    event.stopPropagation();
    if ((event.target as HTMLElement).closest('.gr-pv-nav, .gr-pv-bar, .gr-pv-x')) return;
    const was = down;
    down = null;
    if (was && !moved && !onPicture) close();
    else if (was && !moved) {
      zoomTo(scale > 1.01 ? 1 : actual() > 1.2 ? actual() : 2.5, event.clientX, event.clientY);
    } else apply();
  });
  wash.addEventListener('click', (event) => event.stopPropagation());
  wash.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  function go(to: number): void {
    index = to;
    edges();
    const next = all[index]!;
    picture.alt = next.name;
    picture.src = next.src;
    scale = 1;
    x = 0;
    y = 0;
    apply();
    words(next.name);
    better(next.sharper?.());
  }
  function edges(): void {
    left?.classList.toggle('gr-pv-off', index === 0);
    right?.classList.toggle('gr-pv-off', index === all.length - 1);
  }
  function step(way: 1 | -1): void {
    const to = index + way;
    if (to >= 0 && to < all.length) go(to);
  }

  const keys = (event: KeyboardEvent): void => {
    if (event.metaKey && event.key !== 'Escape') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.key === 'Escape') close();
    else if (event.key === 'ArrowLeft') step(-1);
    else if (event.key === 'ArrowRight') step(1);
    else if (event.key === '+' || event.key === '=') zoomBy(1.5);
    else if (event.key === '-' || event.key === '_') zoomBy(1 / 1.5);
    else if (event.key === '0') zoomTo(1);
    else if (event.key === '1') zoomTo(actual());
  };
  window.addEventListener('keydown', keys, true);

  function close(): void {
    if (open !== close) return;
    open = null;
    window.removeEventListener('keydown', keys, true);
    window.removeEventListener('resize', apply);
    wash.classList.add('gr-pv-going');
    setTimeout(() => wash.remove(), 160);
  }
  open = close;
  document.body.appendChild(wash);
}
