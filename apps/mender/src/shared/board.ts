import { defineContract, procedure } from '@emdash/wire/rpc';
import { z } from 'zod';

/**
 * What the board itself needs from the main process that no runtime already
 * answers.
 *
 * A picture is the one case: reading a file's actual pixels is Electron's own
 * job (`nativeImage`), not the files runtime's, which only ever hands back
 * `binary` for anything that is not text. `pictures.ts` already does this
 * decoding for a project's own face; this is the same call, aimed at
 * whichever file is open on a board instead of a checkout's likeliest logo.
 */
export const boardPictureSchema = z.object({
  src: z.string(),
  wide: z.number(),
  tall: z.number(),
});

export type BoardPicture = z.infer<typeof boardPictureSchema>;

export const boardContract = defineContract({
  /** A file's own pixels, sized to fit a board of the given width. Null for
      anything the machine cannot decode as a picture. */
  picture: procedure({
    input: z.object({ path: z.string(), width: z.number() }),
    output: z.object({ picture: boardPictureSchema.nullable() }),
  }),
});

export type BoardContract = typeof boardContract;
