import { createController, type Controller } from '@emdash/wire/rpc';
import { expose } from '@emdash/wire/state';
import { crewContract } from '../shared/crew';
import type { Crew } from './crew';
import { mergeRequestOf } from './mr';

/** A lead's crew, as its screen reads it. */
export function createCrewController(
  crew: Crew,
  merge: Parameters<typeof mergeRequestOf>[0],
  pathOf: (task: string) => Promise<{ path: string; pull?: string } | undefined>
): Controller {
  return createController(crewContract, {
    rows: expose(crewContract.rows, { list: (key) => crew.rows(key.lead) }),
    merge: async ({ task }) => {
      const found = await pathOf(task);
      if (!found) {
        return {
          state: 'none',
          ci: 'none',
          failedChecks: [],
          unresolved: 0,
          unknown: 'no such session.',
        };
      }
      return mergeRequestOf(merge, found.path, found.pull);
    },
  });
}
