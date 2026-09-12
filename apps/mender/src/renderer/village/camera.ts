import { Viewport } from 'pixi-viewport';
import type { Application } from 'pixi.js';
import type { DistrictBounds } from './ground';

/**
 * The camera over the world.
 *
 * It pans, it zooms, and it flies to a district when you pick one. A district
 * you have picked goes up into the top-left corner of the window and the board
 * takes everything to the right of it, so the two never stand on each other.
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

/** How long the camera takes to go somewhere. Long enough to see where you
    came from, short enough that it is not a cutscene you sit through. */
const FLIGHT_MS = 520;

/** A rectangle in the world, as the renderer places things. */
export interface Extent {
  x: number;
  y: number;
  width: number;
  height: number;
}

/* FITTING IS NOT THE SAME PROBLEM ABOVE AND BELOW 1:1.
 *
 * Scaling this art UP by a fraction is the thing it must never do — half the
 * rows come out one pixel tall and half two, and the whole island crawls — so a
 * view that wants more than 1:1 takes a whole number and lets a little of the
 * shore run off the edge. Scaling DOWN is the opposite trade: there is no whole
 * number to land on between a half and one, and the alternative to a slightly
 * uneven island is an island you cannot see all of. So below 1:1 it fits
 * exactly and takes the unevenness. */
function fitScale(viewport: Viewport, box: Extent, padding: number, inset = 0): number {
  const fit = Math.min(
    (viewport.screenWidth - inset - padding * 2) / box.width,
    (viewport.screenHeight - padding * 2) / box.height
  );
  return fit >= 1 ? nearestRung(fit) : fit;
}

/**
 * Fly until the district is up in the corner and the board has the rest.
 *
 * It does not centre. The district is pinned to the top-left of the window and
 * the board comes in over everything to the right of it — which is what
 * "slides the district aside" is: the land does not move, the camera does, and
 * the board arrives in the space that opens. `inset` is how much of the right
 * of the window the board has taken, and it only decides how close in the
 * camera can get, not where the land ends up.
 */
export function flyTo(
  viewport: Viewport,
  district: DistrictBounds,
  { padding = 48, inset = 0 }: { padding?: number; inset?: number } = {}
): void {
  // Never further away than the art is drawn for. Opening a district is
  // walking up to it, and a district you have walked up to and still cannot
  // see the detail of is not open, it is just selected.
  const scale = Math.max(1, fitScale(viewport, district, padding, inset));
  viewport.animate({
    position: {
      x: district.x + (viewport.screenWidth / 2 - padding) / scale,
      y: district.y + (viewport.screenHeight / 2 - padding) / scale,
    },
    scale,
    time: FLIGHT_MS,
    ease: 'easeInOutSine',
    removeOnInterrupt: true,
  });
}

/** Fly back out until the whole island is in front of you again. */
export function flyOut(viewport: Viewport, island: Extent, padding = 48): void {
  if (!island.width || !island.height) return;
  viewport.animate({
    position: { x: island.x + island.width / 2, y: island.y + island.height / 2 },
    scale: fitScale(viewport, island, padding),
    time: FLIGHT_MS,
    ease: 'easeInOutSine',
    removeOnInterrupt: true,
  });
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
export function frame(viewport: Viewport, island: Extent, padding = 48): void {
  if (!island.width || !island.height) return;
  viewport.setZoom(fitScale(viewport, island, padding), true);
  viewport.moveCenter(island.x + island.width / 2, island.y + island.height / 2);
}
