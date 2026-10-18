/**
 * A picture in an answer, held up big.
 *
 * Pressing a picture the agent put in what it said lays it over the whole
 * window at the largest size that fits, its caption under it. The wheel goes
 * in closer where the pointer is and a drag moves it, since a picture worth
 * opening big is usually one with small writing on it. Escape or a press that
 * did not drag puts it back down. It hangs off the document rather than the
 * answer, because the answer is written again whenever the board changes.
 */

const MIN_SCALE = 1;
const MAX_SCALE = 8;

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

  const wash = document.createElement('div');
  wash.className = 'picture-view';
  const stage = document.createElement('div');
  stage.className = 'picture-view-stage';
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
  wash.appendChild(stage);
  const said = document.createElement('div');
  said.className = 'picture-view-name';
  const words = (label: string): void => {
    const place = all.length ? `${index + 1} / ${all.length}` : '';
    said.textContent = [label, place].filter(Boolean).join('  ·  ');
    said.hidden = !said.textContent;
  };
  words(name);
  wash.appendChild(said);

  let scale = 1;
  let x = 0;
  let y = 0;
  const apply = (): void => {
    picture.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    stage.style.cursor = scale > 1 ? 'grab' : 'zoom-out';
  };
  apply();

  wash.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      const left = picture.offsetLeft + stage.getBoundingClientRect().left;
      const top = picture.offsetTop + stage.getBoundingClientRect().top;
      const before = scale;
      scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * Math.exp(-event.deltaY * 0.0025)));
      if (scale === MIN_SCALE) {
        x = 0;
        y = 0;
      } else {
        /* The point under the pointer stays under it. */
        x = event.clientX - left - ((event.clientX - left - x) / before) * scale;
        y = event.clientY - top - ((event.clientY - top - y) / before) * scale;
      }
      apply();
    },
    { passive: false }
  );

  let down: { x: number; y: number } | null = null;
  let moved = false;
  wash.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
    down = { x: event.clientX, y: event.clientY };
    moved = false;
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
      stage.style.cursor = 'grabbing';
      apply();
    }
    down = { x: event.clientX, y: event.clientY };
  });
  wash.addEventListener('pointerup', (event) => {
    event.stopPropagation();
    const was = down;
    down = null;
    if (was && !moved) close();
    else apply();
  });
  wash.addEventListener('click', (event) => event.stopPropagation());
  wash.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  const keys = (event: KeyboardEvent): void => {
    if (event.metaKey && event.key !== 'Escape') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.key === 'Escape') close();
    else if (all.length && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      index = (index + (event.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length;
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
  };
  window.addEventListener('keydown', keys, true);

  function close(): void {
    if (open !== close) return;
    open = null;
    window.removeEventListener('keydown', keys, true);
    wash.classList.add('picture-view-going');
    setTimeout(() => wash.remove(), 160);
  }
  open = close;
  document.body.appendChild(wash);
}
