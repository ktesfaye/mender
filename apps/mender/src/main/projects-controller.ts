import { createController, type Controller } from '@emdash/wire/rpc';
import { projectsContract } from '@shared/projects';
import type { Projects } from './projects';

/** The projects domain, as the village asks about it. */
export function createProjectsController(projects: Projects): Controller {
  return createController(projectsContract, {
    list: () => projects.list(),
    found: () => projects.found(),
    abandon: ({ id }) => projects.abandon(id),
  });
}
