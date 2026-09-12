import type { DrawItem } from '@mender/village';
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

export interface BuiltScene {
  root: Container;
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
export function buildScene(items: readonly DrawItem[]): BuiltScene {
  const root = new Container();
  const missing: string[] = [];
  let drawn = 0;
  let groundTop = 0;

  for (const item of items) {
    const sprite = makeSprite(item);
    if (!sprite) {
      missing.push(item.file);
      continue;
    }
    root.addChild(sprite);
    drawn++;
    // Terrain runs at a negative sorting order so it stays under everything an
    // object draws at zero; that boundary is where the ground ends.
    if (item.order < 0) groundTop = drawn;
  }
  return { root, drawn, missing, groundTop };
}

function makeSprite(item: DrawItem): Sprite | null {
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
