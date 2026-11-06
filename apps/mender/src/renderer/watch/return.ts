import { emit, newId, tagReturn } from './emit';

/**
 * The window coming back after a gap: hidden, blurred, offline or the whole
 * machine asleep. Everything reported for the next minute carries the id of
 * the return, so a slow call or a stuck wait after a wake is tied to it, and
 * the first good call and the first picture after it say how long coming back
 * took.
 */

const GAP_MS = 30_000;
const TAG_MS = 60_000;

let current: { id: string; at: number; call: boolean; frame: boolean; drawn: boolean } | null =
  null;

function back(kind: string, idleMs: number): void {
  const now = performance.now();
  if (current && now - current.at < 5000) return;
  const id = newId();
  current = { id, at: now, call: false, frame: false, drawn: false };
  tagReturn(id, TAG_MS);
  emit('info', { msg: 'window returned', op: 'window.return', opId: id, kind, elapsedMs: idleMs });
  requestAnimationFrame(() => {
    if (current?.id !== id || current.frame) return;
    current.frame = true;
    emit('info', {
      msg: 'return first frame',
      op: 'window.return',
      opId: id,
      stage: 'frame',
      durationMs: performance.now() - now,
    });
  });
}

/** A successful wire call: the first after a return is how long the host took to answer again. */
export function noteWireOk(): void {
  if (!current || current.call || performance.now() - current.at > TAG_MS) return;
  current.call = true;
  emit('info', {
    msg: 'return first wire call ok',
    op: 'window.return',
    opId: current.id,
    stage: 'wire',
    durationMs: performance.now() - current.at,
  });
}

/** The board finishing a draw: the first one after a return is the window usable again. */
export function noteDrawn(): void {
  if (!current || current.drawn || performance.now() - current.at > TAG_MS) return;
  const cur = current;
  cur.drawn = true;
  requestAnimationFrame(() =>
    emit('info', {
      msg: 'return first full draw',
      op: 'window.return',
      opId: cur.id,
      stage: 'draw',
      durationMs: performance.now() - cur.at,
    })
  );
}

export function watchReturns(): void {
  let hiddenAt: number | null = document.hidden ? Date.now() : null;
  let blurredAt: number | null = document.hasFocus() ? null : Date.now();
  let offlineAt: number | null = navigator.onLine ? null : Date.now();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hiddenAt = Date.now();
      emit('info', { msg: 'window hidden', kind: 'visibility' });
      return;
    }
    const idle = hiddenAt === null ? 0 : Date.now() - hiddenAt;
    hiddenAt = null;
    if (idle > GAP_MS) back('visible', idle);
    else emit('info', { msg: 'window shown', kind: 'visibility', elapsedMs: idle });
  });
  window.addEventListener('blur', () => {
    blurredAt = Date.now();
  });
  window.addEventListener('focus', () => {
    const idle = blurredAt === null ? 0 : Date.now() - blurredAt;
    blurredAt = null;
    if (idle > GAP_MS) back('focus', idle);
  });
  window.addEventListener('offline', () => {
    offlineAt = Date.now();
    emit('warn', { msg: 'network offline', kind: 'network' });
  });
  window.addEventListener('online', () => {
    const idle = offlineAt === null ? 0 : Date.now() - offlineAt;
    offlineAt = null;
    emit('info', { msg: 'network online', kind: 'network', elapsedMs: idle });
    back('online', idle);
  });

  /* A frame that did not come for half a minute while nobody hid the window is
     the machine asleep or the page frozen: the clock jumped and nothing ran. */
  let seen = Date.now();
  setInterval(() => {
    const now = Date.now();
    const gap = now - seen;
    seen = now;
    if (gap > GAP_MS && !document.hidden) back('slept', gap);
  }, 2000);
}
