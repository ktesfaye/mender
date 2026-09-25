import { load } from './pictures';

/**
 * What the board asks of the main process directly.
 *
 * Just the one thing so far: a file's own pixels, when it has any. Reusing
 * `pictures.ts`'s own decoder rather than teaching the files runtime about
 * images, because nothing else that runtime does needs to know a PNG from a
 * `.so`.
 */
export interface Board {
  picture(path: string, width: number): Promise<{ src: string; wide: number; tall: number } | null>;
}

export function createBoard(): Board {
  return {
    async picture(path, width) {
      const image = await load(path, Math.max(1, Math.round(width)));
      if (!image) return null;
      const { width: wide, height: tall } = image.getSize();
      return { src: image.toDataURL(), wide, tall };
    },
  };
}
