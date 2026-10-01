import { UPDATE_PRIORITY, type Application, type Ticker } from 'pixi.js';
import type { Watching } from '@shared/channels';

/**
 * How often the village is drawn.
 *
 * The island is a still picture nearly all the time. A fire breathing over most
 * of a second, somebody at a door taking a breath, a cursor blinking twice: not
 * one of those needs sixty drawings a second, and drawing the whole island sixty
 * times a second anyway is a warm laptop and an hour off the battery for a
 * picture that did not change. It was doing it whether or not the window was
 * even on screen, which is the part that actually costs him something: he does
 * not close this app, he leaves it behind a terminal all day.
 *
 * So the village draws at whatever the moment is worth. While something is
 * really moving — a camera flying, the board coming in, a hand on the trackpad —
 * it draws as fast as the screen will take it, because that is the only time
 * smoothness is something anyone can see. A moment after the movement stops it
 * falls back to a handful of frames a second, which is still more than a
 * nine-hundred-millisecond breath has any use for. Behind another window it
 * falls further, and with the window put away it stops dead.
 *
 * **What is throttled is the drawing, not the thinking.** The tick itself still
 * runs every frame and still gets the real time since the last one, so an ease
 * and a camera flight take exactly as long as they always did; they are simply
 * photographed less often while nothing is looking closely. Capping the ticker
 * instead — which is the obvious way and the wrong one — makes everything on a
 * clock run six times slow, because a ticker that skips a frame throws that
 * frame's elapsed time away with it.
 */

/** Frames a second while nothing is moving and the window is in front of you. */
const RESTING = 10;
/** And while the village is sitting behind whatever you are working in. */
const BEHIND = 5;

/**
 * How long after the last movement the village keeps drawing at full rate.
 *
 * Long enough to cover the gap between a wheel event and the deceleration it
 * starts, which is the one place a short tail shows: the flick ends, nothing
 * stirs for a frame, and the glide out of it starts at ten frames a second.
 */
const TAIL_MS = 500;

/** While weather is falling and somebody can see it: rain at ten frames a
    second is a slideshow of lines, and twenty is still a fifth of what the
    screen could take. */
const FALLING = 20;

let ticker: Ticker | null = null;
let falling = false;
let watch: Watching = 'front';
let until = 0;
let last = 0;

/**
 * Something moved: draw properly for a moment.
 *
 * Cheap enough to call from anywhere, including from inside a tick that runs
 * every frame — it writes one number.
 */
export function stir(): void {
  until = performance.now() + TAIL_MS;
}

/** Rain or snow is coming down: draw often enough for it to read as falling. */
export function setFalling(now: boolean): void {
  falling = now;
}

/**
 * Whether the picture is about to be drawn this frame.
 *
 * Everything that only changes what is on screen — weather, smoke, people
 * walking — asks this and does its work only then, carrying the time across
 * the frames it skipped. Working it out sixty times a second for a picture
 * taken ten times a second is the battery spent on nothing.
 */
export function drawingNow(): boolean {
  if (watch === 'gone') return false;
  const now = performance.now();
  return now < until || now - last >= everyMs();
}

function everyMs(): number {
  if (watch === 'behind') return 1000 / BEHIND;
  return 1000 / (falling ? FALLING : RESTING);
}

/** Whether anybody is looking, which the main process is the one to know. */
export function watched(now: Watching): void {
  if (now === watch) return;
  watch = now;
  if (!ticker) return;
  if (watch === 'gone') {
    ticker.stop();
    return;
  }
  /* Coming back is a real moment even though nothing about the world changed
     while it was away: the fire is mid-breath somewhere it was not, so draw it
     at once rather than up to a tenth of a second later. */
  ticker.start();
  stir();
}

/**
 * Take the drawing off the ticker and put it on this.
 *
 * Pixi renders from a ticker listener of its own, added when the application is
 * built. Removing it is how the render stops being automatic; everything else
 * on the ticker carries on untouched, which is the whole point.
 */
export function setPace(pixi: Application): void {
  ticker = pixi.ticker;
  pixi.ticker.remove(pixi.render, pixi);
  pixi.ticker.add(
    () => {
      const now = performance.now();
      if (now < until) {
        last = now;
        pixi.render();
        return;
      }
      if (now - last < everyMs()) return;
      last = now;
      pixi.render();
    },
    null,
    UPDATE_PRIORITY.LOW
  );

  /* Anything a hand does is movement, including a hand that has not decided
     what it is doing yet. These are on the window rather than the stage because
     the stage only hears a pointer that is over something it owns, and a drag
     across the sea is still a drag. */
  for (const kind of ['pointermove', 'pointerdown', 'pointerup', 'wheel', 'keydown', 'resize']) {
    window.addEventListener(kind, stir, { capture: true, passive: true });
  }

  /* The main process says whether the window is in front, behind, or put away.
     Chromium's own answer to that is not usable here: the window is built with
     background throttling off, which leaves the page believing it is visible
     forever, and that is deliberate — the wire underneath must not be wound
     down just because nobody is looking. */
  window.mender?.watching?.(watched);
}
