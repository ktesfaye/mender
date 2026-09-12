import type { Layout, Linked } from '@mender/village';
import { Container, Sprite } from 'pixi.js';
import { texture } from './kit';

/**
 * A composed map, as Pixi objects.
 *
 * Every one of the kit's five rules maps onto a Pixi primitive, which is why
 * this stack was chosen:
 *
 *     32px grid ................ world units are pixels; nothing to do
 *     integer scale, no filter . texture scaleMode 'nearest'
 *     pivot = ground point ..... sprite.anchor, with the y axis inverted
 *     depth = (order, y+z) ..... insertion order into a plain Container
 *     shadows MULTIPLY ......... blendMode 'multiply' on a whitened mask + tint
 */

/* MT Shadow: Blend DstColor Zero, tint (0.830, 0.728, 0.654).
 *
 *     dst = dst * lerp(white, tint, shadow_alpha)
 *
 * Alpha-compositing a shadow instead turns it into a flat brown sticker, which
 * is the single most visible way to get this scene wrong. The kit's shadow
 * sprites are a pure mask — one flat colour at a uniform alpha — so their RGB
 * carries no information and is whitened when the kit is packed; multiplying
 * the file's own colour would darken by the outline rather than the material.
 */
export const SHADOW_TINT = 0xd4baa7;

/**
 * How far out from a building's foot somebody standing at it stands.
 *
 * Far enough to be on the ground in front of the door rather than inside the
 * wall, and to clear whatever the artist put against it — every one of these
 * houses has a planter or a barrel up against the front.
 */
export const DOORSTEP = 9;

/**
 * One building, and the space it takes up on screen.
 *
 * A building is several sprites — walls, roof, chimney, the shadow under it —
 * so its extent is the union of them, measured while they are being made
 * rather than asked for afterwards: a thousand sprites is a thousand bounds
 * calculations, and this costs four numbers per sprite as it goes past.
 */
export interface Building {
  /** The plot it stands on, which is the district it belongs to. */
  plot: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /**
   * The middle of its front, which is about where its door is.
   *
   * Not the middle of the box: a house is a main block plus lean-tos, awnings
   * and a chimney, and the middle of all of that lands a person against a side
   * wall. The southernmost piece of a building is its front, so its middle is
   * the closest thing to a doorway the map actually says.
   */
  doorX: number;
  /**
   * Where anything standing at this building goes.
   *
   * A villager at the door has to draw over its own building and under the
   * ones south of it, and the scene is depth-sorted by insertion order alone —
   * so the place in that order is claimed while the map is being built, and
   * never moves again.
   */
  stand: Container;
}

export interface BuiltScene {
  root: Container;
  /** Every building on the map, in a stable order per plot. */
  buildings: Building[];
  drawn: number;
  /** Items whose sprite the kit does not have. Always expect zero. */
  missing: string[];
  /**
   * The child index where the ground stops and things standing on it begin.
   *
   * Anything that belongs to the LAND rather than to the picture as a whole goes
   * in here: light on a district laid over the top of the trees reads as a sheet
   * of coloured glass over the app, and the same light slipped under them reads
   * as the sun coming out on that field.
   */
  groundTop: number;
}

/**
 * Children are added in the order `Document.items()` decided and the container
 * is left unsorted, so Pixi draws them in exactly that order. zIndex plus
 * sortableChildren would re-sort every frame on a key Pixi cannot express
 * anyway: the real key is (sorting_order, y+z descending, placement), and y+z
 * descending runs the opposite way to zIndex.
 */
export function buildScene(items: readonly Linked[], layout: Layout): BuiltScene {
  const root = new Container();
  const missing: string[] = [];
  const boxes = new Map<number, Box>();
  /* Where each child meets the ground, in the order they were added. The list
     is what decides who draws over whom, and within the things standing on the
     land it runs north to south — so it can be searched rather than sorted. */
  const feet: number[] = [];
  let drawn = 0;
  let groundTop = 0;

  for (const item of items) {
    const sprite = makeSprite(item);
    if (!sprite) {
      missing.push(item.file);
      continue;
    }
    root.addChild(sprite);
    feet.push(sprite.y);
    drawn++;
    // Terrain runs at a negative sorting order so it stays under everything an
    // object draws at zero; that boundary is where the ground ends.
    if (item.order < 0) groundTop = drawn;
    if (item.origin.kind === 'object' && !item.multiply) {
      const object = layout.objects[item.origin.oi];
      if (object?.group === 'Building') grow(boxes, object.plot ?? '', item, sprite);
    }
  }
  return { root, buildings: buildingsOf(root, boxes, feet, groundTop), drawn, missing, groundTop };
}

interface Box {
  plot: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
  /** The horizontal middle of the southernmost piece seen so far. */
  frontX: number;
}

/* The shadow under a building is not part of it: it is cast onto the ground
   beside it, and counting it makes the building's footprint reach several cells
   further than anything you would point at. */
function grow(boxes: Map<number, Box>, plot: string, item: Linked, sprite: Sprite): void {
  if (item.origin.kind !== 'object') return;
  const left = sprite.x - item.pivotX * item.w;
  const top = sprite.y - (1 - item.pivotY) * item.h;
  const bottom = top + item.h;
  const held = boxes.get(item.origin.oi);
  if (!held) {
    boxes.set(item.origin.oi, {
      plot,
      left,
      top,
      right: left + item.w,
      bottom,
      frontX: left + item.w / 2,
    });
    return;
  }
  if (bottom >= held.bottom) held.frontX = left + item.w / 2;
  held.left = Math.min(held.left, left);
  held.top = Math.min(held.top, top);
  held.right = Math.max(held.right, left + item.w);
  held.bottom = Math.max(held.bottom, bottom);
}

/** The first place in the draw order that is south of a ground point. */
function placeFor(feet: readonly number[], from: number, at: number): number {
  let low = from;
  let high = feet.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if ((feet[mid] ?? 0) <= at) low = mid + 1;
    else high = mid;
  }
  return low;
}

/* Sorted north to south, then west to east: the order the map reads in, and
   the same order every time, because it is what decides which building a task
   ends up standing in. */
function buildingsOf(
  root: Container,
  boxes: Map<number, Box>,
  feet: readonly number[],
  groundTop: number
): Building[] {
  const found = [...boxes.values()];
  /* Each building gets an empty container at the place in the draw order its
     doorstep belongs: after everything standing further north, including the
     barrels and planters the artist put against its own front wall, and before
     everything further south. Inserted back to front so an index still to be
     used never moves. */
  const places = new Map<Box, number>();
  for (const box of found) places.set(box, placeFor(feet, groundTop, box.bottom + DOORSTEP));
  const stands = new Map<Box, Container>();
  for (const box of [...found].sort((a, b) => (places.get(b) ?? 0) - (places.get(a) ?? 0))) {
    const stand = new Container();
    root.addChildAt(stand, Math.min(places.get(box) ?? root.children.length, root.children.length));
    stands.set(box, stand);
  }
  return found
    .sort((a, b) => a.top - b.top || a.left - b.left)
    .map((box) => ({
      plot: box.plot,
      x: box.left,
      y: box.top,
      width: box.right - box.left,
      height: box.bottom - box.top,
      doorX: box.frontX,
      stand: stands.get(box) as Container,
    }));
}

function makeSprite(item: Linked): Sprite | null {
  const tex = texture(item.file);
  if (!tex) return null;
  const sprite = new Sprite(tex);

  /* The pivot is the ground-contact point, normalised from the sprite's BOTTOM
     LEFT with y up. Pixi's anchor is normalised from the top left with y down,
     and the world's +y is north while the screen's +y is south. Both inversions
     are the same one: place at -y, and flip the anchor's y. */
  sprite.anchor.set(item.pivotX, 1 - item.pivotY);
  sprite.position.set(item.x, -item.y);
  sprite.setSize(item.w, item.h);

  /* Rotation, on four objects in the whole world, all scarecrows. The reference
     renderer turns the bitmap about its centre and lets the canvas expand, then
     anchors the pivot against that larger box — so a rotated sprite shifts
     slightly as well as turning. Turning about the pivot instead leaves it a
     few pixels off. */
  if (item.rotation) {
    const rad = (item.rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    const width = Math.round(item.w * cos + item.h * sin);
    const height = Math.round(item.w * sin + item.h * cos);
    sprite.anchor.set(0.5, 0.5);
    sprite.position.set(
      item.x - item.pivotX * width + width / 2,
      -item.y - (1 - item.pivotY) * height + height / 2
    );
    // Screen y runs the other way, so a counter-clockwise world turn is a
    // clockwise screen turn.
    sprite.rotation = -rad;
  }

  if (item.flip) sprite.scale.x = -Math.abs(sprite.scale.x);
  if (item.multiply) {
    sprite.blendMode = 'multiply';
    sprite.tint = SHADOW_TINT;
  }
  return sprite;
}
