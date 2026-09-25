import { createController, type Controller } from '@emdash/wire/rpc';
import { boardContract } from '@shared/board';
import type { Board } from './board';

/** The board's own asks, as the village makes them. */
export function createBoardController(board: Board): Controller {
  return createController(boardContract, {
    picture: async ({ path, width }) => ({ picture: await board.picture(path, width) }),
    runningIn: async ({ key }) => ({ name: await board.runningIn(key) }),
  });
}
