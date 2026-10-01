import { CELL, type District } from '@mender/village';
import { Viewport } from 'pixi-viewport';
import type { Application } from 'pixi.js';
import { stir } from '../pace';
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

  /* A camera that is going somewhere is the one thing in the village that has
     to be drawn every frame, and it keeps going long after the hand comes off
     the trackpad — a flick decelerates, a pick flies. So the movement says so
     itself rather than being guessed at from the input that started it. */
  viewport.on('moved', stir);

  let settle: ReturnType<typeof setTimeout> | undefined;
  viewport.on('zoomed', () => {
    stir();
    clearTimeout(settle);
    settle = setTimeout(() => snapToRung(viewport), SETTLE_MS);
  });

  window.addEventListener('resize', () => viewport.resize(window.innerWidth, window.innerHeight));
  return viewport;
}

const HANDS = ['drag', 'pinch', 'wheel', 'decelerate'] as const;

/**
 * Take the camera out of his hands while `still` says so.
 *
 * Standing in a yard, the village behind is scenery: a scroll meant for the
 * writing that slipped into a gap between two columns used to drag the whole
 * island off under it. The camera still flies, since a switch between two
 * projects is the village moving, not him. It is asked at the moment of each
 * touch rather than kept in step with the yard, so nothing can leave it stale:
 * the capture phase comes ahead of pixi-viewport's own listeners, pixi's for a
 * press and the window's for a wheel.
 */
export function holdStill(pixi: Application, viewport: Viewport, still: () => boolean): void {
  let held = false;
  const sync = (): void => {
    const hold = still();
    /* Only on a change, because editing districts pauses the drag itself while
       the pointer is over something it can pick up. */
    if (hold === held) return;
    held = hold;
    for (const hand of HANDS) {
      if (hold) viewport.plugins.pause(hand);
      else viewport.plugins.resume(hand);
    }
  };
  pixi.stage.on('pointerdowncapture', sync);
  window.addEventListener('wheel', sync, { capture: true, passive: true });
}

/** The furthest out the camera goes: the whole island, a little sea round it. */
let floor = RUNGS[0] as number;

function snapToRung(viewport: Viewport): void {
  const scale = viewport.scale.x;
  const rung = nearestRung(scale);
  if (rung === scale) return;
  // Never past the floor: the island is as far out as it goes.
  if (rung < floor - 1e-6) return;
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

/**
 * Bring one district into focus without walking into it: centred, and as close
 * as a whole rung lets the whole of it stay on screen.
 */
export function flyToDistrict(viewport: Viewport, district: DistrictBounds, padding = 64): void {
  viewport.animate({
    position: { x: district.centerX, y: district.centerY },
    scale: fitScale(viewport, district, padding),
    time: FLIGHT_MS,
    ease: 'easeInOutSine',
    removeOnInterrupt: true,
  });
}

/**
 * Keep the camera on the island.
 *
 * Zooming out stops once the whole island and a margin of sea fit the window,
 * and panning stops before the island can leave it: past either, the view was
 * open water with nothing to look at and no way to tell where the land went.
 */
export function holdToIsland(viewport: Viewport, island: Extent): void {
  if (!island.width || !island.height) return;
  const fit = Math.min(
    viewport.screenWidth / (island.width * 1.15),
    viewport.screenHeight / (island.height * 1.15)
  );
  floor = Math.min(1, fit);
  viewport.clampZoom({ minScale: floor, maxScale: RUNGS[RUNGS.length - 1] });
  const margin = 160;
  viewport.clamp({
    left: island.x - margin,
    right: island.x + island.width + margin,
    top: island.y - margin,
    bottom: island.y + island.height + margin,
    underflow: 'center',
  });
  if (viewport.scale.x < floor) viewport.setZoom(floor, true);
}

/**
 * The two-finger double tap: in close on wherever the fingers were, or, if
 * already in close, back out to the whole island. The way a Mac does it in
 * every app that reads it.
 */
export function smartZoom(viewport: Viewport, island: Extent, at: { x: number; y: number }): void {
  const close = viewport.scale.x >= 1;
  if (close) {
    flyOut(viewport, island);
    return;
  }
  const point = viewport.toWorld(at.x, at.y);
  viewport.animate({
    position: { x: point.x, y: point.y },
    scale: 2,
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

/* WHAT THE YARD STANDS ON.
 *
 * A district is a shape of land, and its bounding box is not that shape: the
 * harbour reaches one arm along a coast and its box is nine parts water. Framing
 * the box put the whole yard on open sea, which in the dark reads as a black
 * screen with some writing on it, and that is exactly what it looked like.
 *
 * So the yard is not framed on the box. It is framed on the densest window of
 * LAND the district has, close enough in that the ground fills the picture the
 * way the designs' own crop does. The writing sits over the whole window, so
 * every part of that window has to be worth having behind writing.
 */

/** How much of the window has to be land before it is a place and not a sea. */
const ENOUGH_LAND = 0.9;

/** How close the yard is allowed to stand. Whole rungs only; the art is drawn
    at one scale and anything between two rungs crawls. */
const YARD_RUNGS = [1, 2, 3] as const;

/**
 * Fly in until the district's ground fills the window.
 *
 * Slides a window over the district's own cells and stands where the most land
 * is, pulling closer a rung at a time until the view is land rather than coast.
 * A small district ends up close in, which is right: a yard is somewhere you
 * are standing, not a region you are surveying.
 */
export function flyToYard(viewport: Viewport, district: District): void {
  const stand = yardStand(viewport, district);
  if (!stand) return;
  viewport.animate({
    position: { x: stand.x, y: stand.y },
    scale: stand.scale,
    time: FLIGHT_MS,
    ease: 'easeInOutSine',
    removeOnInterrupt: true,
  });
}

/** The same place, arrived at without the flight. */
export function standInYard(viewport: Viewport, district: District): void {
  const stand = yardStand(viewport, district);
  if (!stand) return;
  viewport.setZoom(stand.scale, true);
  viewport.moveCenter(stand.x, stand.y);
}

/** Where the camera stands for a yard, and how close. */
function yardStand(
  viewport: Viewport,
  district: District
): { x: number; y: number; scale: number } | null {
  const land = new Set<string>();
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const [x, a, b] of district.cells) {
    for (let y = a; y <= b; y++) land.add(`${x},${y}`);
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (a < y0) y0 = a;
    if (b > y1) y1 = b;
  }
  if (!land.size || !Number.isFinite(x0)) return null;

  let best: { x: number; y: number; scale: number; share: number } | null = null;
  for (const scale of YARD_RUNGS) {
    /* How many cells the window holds at this rung. One short of the true
       count on each side, so the frame is land right to its edges rather than
       land up to a coast that happens to fall on the last row. */
    const wide = Math.max(1, Math.floor(viewport.screenWidth / scale / CELL));
    const tall = Math.max(1, Math.floor(viewport.screenHeight / scale / CELL));
    const spot = densest(land, { x0, x1, y0, y1 }, wide, tall);
    const stand = {
      /* Cell corner to world pixel, and the world's y runs the other way. */
      x: (spot.x + wide / 2) * CELL,
      y: -(spot.y + tall / 2) * CELL,
      scale,
      share: spot.share,
    };
    if (!best || stand.share > best.share) best = stand;
    if (stand.share >= ENOUGH_LAND) return stand;
  }
  return best;
}

/** The corner of the `wide`×`tall` window of cells holding the most land. */
function densest(
  land: ReadonlySet<string>,
  box: { x0: number; x1: number; y0: number; y1: number },
  wide: number,
  tall: number
): { x: number; y: number; share: number } {
  /* A summed-area table over the district's box, so every candidate window is
     four lookups rather than a sweep. The districts are small, but this runs on
     every open and the whole point of the move is that it feels instant. */
  const w = box.x1 - box.x0 + 1;
  const h = box.y1 - box.y0 + 1;
  const sum = new Int32Array((w + 1) * (h + 1));
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const here = land.has(`${box.x0 + i},${box.y0 + j}`) ? 1 : 0;
      sum[(j + 1) * (w + 1) + i + 1] =
        here + sum[j * (w + 1) + i + 1]! + sum[(j + 1) * (w + 1) + i]! - sum[j * (w + 1) + i]!;
    }
  }
  const at = (i: number, j: number): number =>
    sum[Math.min(Math.max(j, 0), h) * (w + 1) + Math.min(Math.max(i, 0), w)]!;

  let best = { x: box.x0, y: box.y0, share: 0 };
  /* The window may be wider than the district, and often is once it is close
     in, so it is allowed to hang off either side: standing half in the sea at
     the edge of a small district is better than never reaching its middle. */
  const from = Math.min(0, w - wide);
  const to = Math.max(0, w - wide);
  const up = Math.min(0, h - tall);
  const down = Math.max(0, h - tall);
  for (let j = up; j <= down; j++) {
    for (let i = from; i <= to; i++) {
      const held = at(i + wide, j + tall) - at(i, j + tall) - at(i + wide, j) + at(i, j);
      const share = held / (wide * tall);
      if (share > best.share) best = { x: box.x0 + i, y: box.y0 + j, share };
    }
  }
  return best;
}
