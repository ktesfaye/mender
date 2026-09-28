/**
 * How the yard moves.
 *
 * The yard is rewritten whole every time anything in it changes, which is the
 * right way to keep it true and the wrong way to make it feel like a place: a
 * board that is thrown away and written again on every word an agent says has
 * nothing in it that can move, so everything teleports. A note you sent was
 * simply at the top of the post; the thought it pushed down was simply lower.
 *
 * So anything on the yard that is the same thing from one rewrite to the next
 * carries a key, and this remembers where each key was drawn before the
 * rewrite and slides it from there to where it is drawn now. Something with a
 * key nobody has seen before arrives rather than appearing. That is the whole
 * trick, and it is the standard one: measure, rewrite, measure again, play the
 * difference backwards.
 *
 * Words move smoothly here, and that is a deliberate break from the stepped
 * motion of the sprites. The sprites are pixel art and flip between frames;
 * writing is not, and writing that jumps is what made the yard feel broken.
 */

/** Where something keyed was, the moment before the yard was rewritten. */
interface Was {
  rect: DOMRect;
  opacity: number;
}

export type Before = Map<string, Was>;

/** How long a thing takes to get where it is going. */
const MOVE_MS = 380;
/** And how long something new takes to arrive. */
const ARRIVE_MS = 460;
/** An ease that leaves quickly and settles, which is how a thing set down moves. */
export const SETTLE = 'cubic-bezier(.2,.8,.2,1)';

/** Mark an element as the same thing across rewrites. */
export function keyed<T extends HTMLElement>(el: T, key: string): T {
  el.dataset.key = key;
  return el;
}

/** Everything keyed under `root`, where it is drawn right now. */
export function measure(root: HTMLElement): Before {
  const was: Before = new Map();
  for (const el of root.querySelectorAll<HTMLElement>('[data-key]')) {
    const rect = el.getBoundingClientRect();
    if (!rect.width && !rect.height) continue;
    was.set(el.dataset.key!, { rect, opacity: Number(getComputedStyle(el).opacity) });
  }
  return was;
}

export interface Playing {
  /** Keys that should arrive from somewhere in particular rather than fade up. */
  from?: Map<string, DOMRect>;
  /** Keys that should simply be there, because something else carried them in. */
  quiet?: Set<string>;
  /** Everything arrives, in order, as when you walk into a place. */
  entering?: boolean;
  /** Only these move on their own; the rest are carried by something else. */
  only?: (el: HTMLElement) => boolean;
}

/**
 * Slide everything keyed from where it was to where it is, and bring in
 * whatever is new.
 */
export function play(root: HTMLElement, was: Before, how: Playing = {}): void {
  if (reduced()) return;
  let arriving = 0;
  for (const el of root.querySelectorAll<HTMLElement>('[data-key]')) {
    if (how.only && !how.only(el)) continue;
    const key = el.dataset.key!;
    const now = el.getBoundingClientRect();
    if (!now.width && !now.height) continue;
    const from = how.from?.get(key);
    if (from) {
      flyFrom(el, from, now);
      continue;
    }
    if (how.quiet?.has(key)) continue;
    const before = was.get(key);
    if (!before) {
      const delay = how.entering ? Math.min(arriving++ * 28, 420) : 0;
      arrive(el, delay, how.entering ? 10 : 8);
      continue;
    }
    const dx = before.rect.left - now.left;
    const dy = before.rect.top - now.top;
    const fading = before.opacity < 0.99;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && !fading) continue;
    slide(el, `translate(${dx}px,${dy}px)`, MOVE_MS);
    if (fading) fade(el, before.opacity, MOVE_MS);
  }
}

/* Movement is added on top of whatever the element already carries, so a
   note pinned crooked stays crooked while it slides. Opacity cannot be added
   the same way (one plus nothing is still one), so it is its own animation. */
function slide(el: HTMLElement, from: string, ms: number, delay = 0): void {
  el.animate([{ transform: from }, { transform: 'translate(0,0)' }], {
    duration: ms,
    delay,
    easing: SETTLE,
    fill: 'backwards',
    composite: 'add',
  });
}

function fade(el: HTMLElement, from: number, ms: number, delay = 0): void {
  el.animate([{ opacity: from }, { opacity: 1 }], {
    duration: ms,
    delay,
    easing: 'ease-out',
    fill: 'backwards',
  });
}

/** Something new arriving: up from a little below, out of nothing. */
export function arrive(el: HTMLElement, delay = 0, rise = 8): void {
  if (reduced()) return;
  slide(el, `translateY(${rise}px)`, ARRIVE_MS, delay);
  fade(el, 0, ARRIVE_MS, delay);
}

/** Something leaving: down a little, into nothing. Resolves when it has gone. */
export function leave(el: HTMLElement, ms = 180): Promise<void> {
  if (reduced()) return Promise.resolve();
  const going = el.animate(
    [
      { transform: 'translateY(0)', opacity: 1 },
      { transform: 'translateY(6px)', opacity: 0 },
    ],
    { duration: ms, easing: 'ease-in', fill: 'forwards' }
  );
  return going.finished.then(
    () => going.cancel(),
    () => {}
  );
}

/** Carry an element from one box on the screen to where it actually is. */
function flyFrom(el: HTMLElement, from: DOMRect, to: DOMRect): void {
  const sx = to.width ? from.width / to.width : 1;
  const sy = to.height ? from.height / to.height : 1;
  const was = el.style.transformOrigin;
  el.style.transformOrigin = 'top left';
  const flight = el.animate(
    [
      {
        transform: `translate(${from.left - to.left}px,${from.top - to.top}px) scale(${sx},${sy})`,
      },
      { transform: 'translate(0,0) scale(1,1)' },
    ],
    { duration: 520, easing: SETTLE, composite: 'add' }
  );
  fade(el, 0.85, 520);
  void flight.finished.then(
    () => (el.style.transformOrigin = was),
    () => {}
  );
}

/**
 * Going from one session to its neighbour.
 *
 * A switch used to be three cuts in a row: the whole yard blanked, rail and
 * all, a fire sat alone in the dark, and then it blanked again and faded up.
 * Nothing about it said you had moved sideways along the rail. Now what was
 * there steps off the way you came from, and what is there now sweeps in from
 * the side you pressed, the column nearest that side first, while everything
 * that belongs to the place and not the session stands still under it.
 */
const SWITCH_OUT_MS = 230;
const SWITCH_IN_MS = 520;
const SWITCH_TRAVEL = 72;

/** The session you left, stepping off. Removes it when it has gone. */
export function steppingOff(ghost: HTMLElement, way: number): void {
  if (reduced()) {
    ghost.remove();
    return;
  }
  /* It gathers speed as it goes, but its light goes first: two sessions'
     words on the same spot at once is the one thing this must never show. */
  ghost.animate(
    [
      { transform: 'translate(0,0)' },
      { transform: way ? `translateX(${-way * SWITCH_TRAVEL * 0.6}px)` : 'translateY(-6px)' },
    ],
    { duration: SWITCH_OUT_MS, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }
  );
  const going = ghost.animate(
    [
      { opacity: 1, filter: 'blur(0)' },
      { opacity: 0, filter: 'blur(2px)' },
    ],
    { duration: SWITCH_OUT_MS, easing: 'cubic-bezier(0,0,.3,1)', fill: 'forwards' }
  );
  void going.finished.then(
    () => ghost.remove(),
    () => ghost.remove()
  );
}

/**
 * The same leaving, done where it stands, for when the next session is not
 * ready to be drawn yet: pressing a lantern answers at once either way.
 */
export function leavingInPlace(movers: readonly HTMLElement[], way: number): void {
  if (reduced()) return;
  for (const el of movers) {
    el.animate(
      [
        { transform: 'translate(0,0)' },
        { transform: way ? `translateX(${-way * SWITCH_TRAVEL * 0.6}px)` : 'translateY(-6px)' },
      ],
      {
        duration: SWITCH_OUT_MS,
        easing: 'cubic-bezier(.4,0,1,1)',
        fill: 'forwards',
        composite: 'add',
      }
    );
    el.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: SWITCH_OUT_MS,
      easing: 'cubic-bezier(0,0,.3,1)',
      fill: 'forwards',
    });
  }
}

/** The session you went to, sweeping in from the side it hangs on. */
export function sweepingIn(movers: readonly HTMLElement[], way: number, gone = false): void {
  if (reduced()) return;
  const wide = window.innerWidth || 1;
  for (const el of movers) {
    const at = el.getBoundingClientRect();
    if (!at.width && !at.height) continue;
    const middle = Math.min(1, Math.max(0, (at.left + at.width / 2) / wide));
    /* The column nearest the side it comes from lands first, so the board
       reads as one thing arriving from over there rather than all at once. */
    const lead = way > 0 ? 1 - middle : middle;
    const delay = Math.round((gone ? 0 : SWITCH_OUT_MS * 0.55) + lead * 140);
    slide(
      el,
      way ? `translateX(${way * SWITCH_TRAVEL}px)` : 'translateY(10px)',
      SWITCH_IN_MS,
      delay
    );
    fade(el, 0, SWITCH_IN_MS * 0.7, delay);
  }
}

/**
 * A lantern taken off the beam in your hand: it catches, brighter than it
 * will burn, and settles. The hop is stepped, because a lantern is a sprite.
 */
export function catching(lamp: HTMLElement, settled: string): void {
  if (reduced()) return;
  lamp.animate(
    [
      { filter: 'brightness(.75)' },
      { filter: 'brightness(1.9) saturate(1.2)', offset: 0.3 },
      { filter: settled || 'brightness(1)' },
    ],
    { duration: 640, easing: 'ease-out' }
  );
  lamp.animate(
    [
      { transform: 'translateY(0)' },
      { transform: 'translateY(-4px)' },
      { transform: 'translateY(0)' },
    ],
    { duration: 300, easing: 'steps(3,end)', composite: 'add' }
  );
}

/** And the one you let go of, turning down to where the others are. */
export function lettingGo(lamp: HTMLElement, settled: string): void {
  if (reduced()) return;
  lamp.animate([{ filter: 'brightness(1)' }, { filter: settled }], {
    duration: 420,
    easing: 'ease-out',
  });
}

function reduced(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * Writing that arrives a little at a time.
 *
 * An agent answers in pieces, and a piece that lands whole in the middle of a
 * sentence is a jolt every half-second. So each new piece is inked in rather
 * than stamped, and a piece still being inked when the next one lands carries
 * on from where it was rather than starting over.
 */
const INK_MS = 520;
const inked = new Map<string, { text: string; pieces: { end: number; at: number }[] }>();

/**
 * Write `text` into `into`, fading in whatever of it was not there last time.
 *
 * `fresh` says whether the whole of it is new, which is true of an answer that
 * started while you were watching and false of one that was already there when
 * you walked in.
 */
export function ink(into: HTMLElement, id: string, text: string, fresh: boolean): void {
  inkRuns(into, id, [{ text }], fresh);
}

/** A piece of writing with a look of its own, for `inkRuns`. */
export type InkRun = { text: string; className?: string; href?: string };

/**
 * `ink`, for writing that is not all one look: a sentence with a bit of code
 * in it, or a word set heavier. What arrives still fades in wherever it lands,
 * across however many looks it crosses.
 */
export function inkRuns(
  into: HTMLElement,
  id: string,
  runs: readonly InkRun[],
  fresh: boolean
): void {
  const text = runs.map((run) => run.text).join('');
  const now = performance.now();
  let was = inked.get(id);
  if (!was || !text.startsWith(was.text)) {
    was = { text: '', pieces: fresh ? [] : [{ end: text.length, at: -Infinity }] };
    if (!fresh) was.text = text;
    inked.set(id, was);
  }
  if (text.length > was.text.length) {
    was.pieces.push({ end: text.length, at: now });
    was.text = text;
  }
  /* Whatever has finished inking is one plain run, and only the pieces still
     arriving are wrapped, so a long answer is not a thousand spans. */
  was.pieces = was.pieces.filter((piece, i, all) => {
    const next = all[i + 1];
    return !next || now - next.at < INK_MS;
  });

  /* Where each piece ends and when it arrived, so any stretch of the text can
     be asked how old it is. Past the last piece is as old as it gets. */
  const ends = was.pieces.map((piece) => piece.end);
  const ages = was.pieces.map((piece) => now - piece.at);
  const ageAt = (offset: number): number => {
    const i = ends.findIndex((end) => offset < end);
    return i === -1 ? Infinity : (ages[i] ?? Infinity);
  };

  into.replaceChildren();
  let offset = 0;
  for (const run of runs) {
    /* A link is an anchor rather than a span, so pressing it is exactly the
       gold press every other pressable thing in the village already is,
       intercepted one level up rather than let navigate this page away. */
    const holder: HTMLElement | DocumentFragment = run.href
      ? Object.assign(document.createElement('a'), {
          className: 'press',
          href: run.href,
        })
      : run.className
        ? Object.assign(document.createElement('span'), { className: run.className })
        : document.createDocumentFragment();
    /* Never let the page itself navigate; the click still reaches whoever is
       listening one level up, where it means "open in the real world". */
    if (holder instanceof HTMLAnchorElement) {
      holder.addEventListener('click', (event) => event.preventDefault());
    }
    let from = 0;
    while (from < run.text.length) {
      const at = offset + from;
      const age = ageAt(at);
      const i = ends.findIndex((end) => at < end);
      const stop = i === -1 ? run.text.length : Math.min(run.text.length, (ends[i] ?? 0) - offset);
      const piece = run.text.slice(from, stop);
      from = stop;
      if (age >= INK_MS || reduced()) {
        holder.appendChild(document.createTextNode(piece));
        continue;
      }
      const span = document.createElement('span');
      span.textContent = piece;
      span.style.animation = `yard-ink ${INK_MS}ms ease-out both`;
      span.style.animationDelay = `-${Math.round(age)}ms`;
      holder.appendChild(span);
    }
    offset += run.text.length;
    into.appendChild(holder);
  }
}

/** Forget what was inked for a thing that is no longer on the board. */
export function forgetInk(keep: Set<string>): void {
  /* A thing written in parts inks each part under its own name, `thing#part`,
     and goes when the thing does. */
  for (const id of inked.keys()) {
    if (!keep.has(id) && !keep.has(id.split('#')[0] ?? id)) inked.delete(id);
  }
}
