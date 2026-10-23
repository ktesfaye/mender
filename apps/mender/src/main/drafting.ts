import { readFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createController, type Controller } from '@emdash/wire/rpc';
import { BOARD_FILE, draftBoardSchema, draftingContract } from '@shared/drafting';

/**
 * The drafting table off disk: a checkout's own `design/board.json`, read
 * whenever it has been written since the window last looked.
 */
export function createDraftingController(): Controller {
  return createController(draftingContract, {
    read: async ({ path, stamp }) => {
      const file = join(path, BOARD_FILE);
      const root = dirname(file);
      const when = await stat(file).then(
        (s) => s.mtimeMs,
        () => 0
      );
      if (!when) return { board: null, stamp: 0, root, trouble: null, same: stamp === 0 };
      if (stamp === when) return { board: null, stamp: when, root, trouble: null, same: true };
      try {
        const raw: unknown = JSON.parse(await readFile(file, 'utf8'));
        const parsed = draftBoardSchema.safeParse(raw);
        if (!parsed.success) {
          const first = parsed.error.issues[0];
          return {
            board: null,
            stamp: when,
            root,
            trouble: `the board's file is not in shape at ${first?.path.join('.') || 'the top'}: ${first?.message ?? 'unknown'}`,
            same: false,
          };
        }
        return { board: parsed.data, stamp: when, root, trouble: null, same: false };
      } catch (error) {
        return {
          board: null,
          stamp: when,
          root,
          trouble: `the board's file would not read: ${String((error as Error).message ?? error)}`,
          same: false,
        };
      }
    },
  });
}
