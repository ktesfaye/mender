import { Assets, type Spritesheet, type Texture } from 'pixi.js';

/**
 * The sprite kit, as packed spritesheets.
 *
 * The kit ships as a thousand loose PNGs and the village editor loaded it that
 * way: a thousand requests at startup and, worse, a thousand GPU textures on a
 * depth-sorted scene, so Pixi flushed its batch between almost every draw.
 * `tools/pack-kit.py` packs the lot into one sheet keyed by the same
 * kit-relative paths the layout's `file` fields use.
 */

const KIT = '/kit/';

const textures = new Map<string, Texture>();

interface KitIndex {
  sheets: string[];
  count: number;
}

export async function loadKit(): Promise<number> {
  if (textures.size) return textures.size;
  const index = (await Assets.load<KitIndex>(KIT + 'kit.json')) as KitIndex;
  for (const name of index.sheets) {
    const sheet = await Assets.load<Spritesheet>(KIT + name);
    // Nearest-neighbour, always. The kit forbids bilinear scaling anywhere, and
    // a single filtered sprite reads as pasted in from another game.
    sheet.textureSource.scaleMode = 'nearest';
    for (const [file, texture] of Object.entries(sheet.textures)) textures.set(file, texture);
  }
  return textures.size;
}

/** One sprite by kit-relative path, or undefined if the kit never had it. */
export function texture(file: string): Texture | undefined {
  return textures.get(file);
}
