import { Viewport } from 'pixi-viewport';
import type { Application, Container } from 'pixi.js';

/**
 * The camera over the world.
 *
 * Pan and zoom only, for now. The move that matters — zooming into a district
 * and sliding it aside for the board — is a camera transition this does not
 * have yet, and it goes here when it arrives rather than into whatever opens
 * the board.
 */

/* THE ZOOM COMES TO REST ON A WHOLE PIXEL.
 *
 * This art is drawn at one scale, and at any zoom that is not a whole number of
 * screen pixels per world pixel some rows of a sprite come out one pixel tall
 * and some two. It does not blur — the kit is filtered nearest and nothing will
 * change that — but the tent's stripes go uneven and the coast crawls. Moving
 * between two rungs is fine and should stay smooth; coming to rest between them
 * is not. Below 1:1 the rungs are the reciprocals, which is the same rule seen
 * from the other side. */
const RUNGS = [1 / 4, 1 / 3, 1 / 2, 1, 2, 3, 4, 6, 8];

/* A trackpad emits a stream of wheel events, and pixi-viewport calls every gap
   in that stream the end of a zoom. Snapping on each one puts the snap in a
   fight with the next event of the same gesture: the two move the camera at
   once and it walks off in whatever direction it was already going. So the rest
   has to be a real rest — this long with nothing arriving. */
const SETTLE_MS = 220;

export function createCamera(pixi: Application): Viewport {
  const viewport = new Viewport({
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    worldWidth: 6000,
    worldHeight: 4000,
    events: pixi.renderer.events,
  });
  pixi.stage.addChild(viewport);
  viewport.drag().pinch().wheel({ smooth: 3 }).decelerate({ friction: 0.9 });
  viewport.clampZoom({ minScale: RUNGS[0], maxScale: RUNGS[RUNGS.length - 1] });

  let settle: ReturnType<typeof setTimeout> | undefined;
  viewport.on('zoomed', () => {
    clearTimeout(settle);
    settle = setTimeout(() => snapToRung(viewport), SETTLE_MS);
  });

  window.addEventListener('resize', () => viewport.resize(window.innerWidth, window.innerHeight));
  return viewport;
}

function snapToRung(viewport: Viewport): void {
  const scale = viewport.scale.x;
  const rung = nearestRung(scale);
  if (rung === scale) return;
  // snapZoom is told a world width to fit, not a scale.
  viewport.snapZoom({
    width: viewport.screenWidth / rung,
    time: 140,
    removeOnComplete: true,
    forceStart: true,
    noMove: true,
  });
}

function nearestRung(scale: number): number {
  // Compared in the log, because the rungs are a ratio ladder: halfway between
  // 1 and 2 is 1.41, not 1.5.
  return RUNGS.reduce((best, rung) =>
    Math.abs(Math.log(rung / scale)) < Math.abs(Math.log(best / scale)) ? rung : best
  );
}

/**
 * The opening shot: the island, as big as the window will take it.
 *
 * On the nearest rung, not the largest one that fits inside the window. There
 * is nothing between 1:1 and half, so insisting the whole coast be visible on a
 * window a little too short drops the world to half size and leaves it sitting
 * in the middle of an empty sea. A few rows of shore running off the bottom
 * edge is the better picture, and you can pan.
 */
export function frame(viewport: Viewport, world: Container, padding = 48): void {
  const bounds = world.getLocalBounds();
  if (!bounds.width || !bounds.height) return;
  const fit = Math.min(
    (window.innerWidth - padding * 2) / bounds.width,
    (window.innerHeight - padding * 2) / bounds.height
  );
  viewport.setZoom(nearestRung(fit), true);
  viewport.moveCenter(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
}
