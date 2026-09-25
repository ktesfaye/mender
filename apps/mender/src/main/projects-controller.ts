import { createController, type Controller } from '@emdash/wire/rpc';
import { projectsContract } from '@shared/projects';
import type { Projects } from './projects';

/** The projects domain, as the village asks about it. */
export function createProjectsController(projects: Projects): Controller {
  return createController(projectsContract, {
    list: () => projects.list(),
    found: ({ from }) => projects.found(from),
    abandon: ({ id }) => projects.abandon(id),
    rename: ({ id, name }) => projects.rename(id, name),
    pictures: ({ id, many }) => projects.pictures(id, many),
    picture: ({ id, from }) => projects.picture(id, from),
    carrying: ({ id }) => projects.carrying(id),
    carry: ({ id, path, on }) => projects.carry(id, path, on),
    identity: ({ id, name, email }) => projects.identity(id, name, email),
    scripts: ({ id }) => projects.scripts(id),
    script: ({ id, which, value }) => projects.script(id, which, value),
    relink: ({ id }) => projects.relink(id),
  });
}
