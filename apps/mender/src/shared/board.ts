import { terminalKeySchema } from '@emdash/core/runtimes/terminals/api';
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

/** One version of a checkout and what went into it. Null is the commits since
    the last one. */
export const boardVersionSchema = z.object({
  version: z.string().nullable(),
  lines: z.array(z.string()),
});

export type BoardVersion = z.infer<typeof boardVersionSchema>;

export const boardContract = defineContract({
  /** A file's own pixels, sized to fit a board of the given width. Null for
      anything the machine cannot decode as a picture. */
  picture: procedure({
    input: z.object({ path: z.string(), width: z.number() }),
    output: z.object({ picture: boardPictureSchema.nullable() }),
  }),
  /** What a shell would actually lose, so ending it can say so rather than
      asking blind. Null when there is nothing under the shell itself. */
  runningIn: procedure({
    input: z.object({ key: terminalKeySchema }),
    output: z.object({ name: z.string().nullable() }),
  }),
  /** A checkout's history by version, newest first, read off whichever commits
      moved the version in its own manifest. */
  versions: procedure({
    input: z.object({ path: z.string() }),
    output: z.object({ versions: z.array(boardVersionSchema) }),
  }),
});

export type BoardContract = typeof boardContract;
