import { createController, type Controller } from '@emdash/wire/rpc';
import { changesContract } from '@shared/changes';
import type { Changes } from './changes';

/** What is different about one file, as the village asks for it. */
export function createChangesController(changes: Changes): Controller {
  return createController(changesContract, {
    file: ({ checkout, path }) => changes.file(checkout, path),
  });
}
