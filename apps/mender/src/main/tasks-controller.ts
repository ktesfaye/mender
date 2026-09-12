import { createController, type Controller } from '@emdash/wire/rpc';
import { expose } from '@emdash/wire/state';
import { tasksContract } from '@shared/tasks';
import type { Tasks } from './tasks';

/** The tasks domain, as the village asks about it. */
export function createTasksController(tasks: Tasks): Controller {
  return createController(tasksContract, {
    all: expose(tasksContract.all, { list: () => tasks.watch() }),
    list: ({ project }) => tasks.list(project),
    begin: ({ project, name, slot }) => tasks.begin(project, name, slot),
    rename: ({ id, title }) => tasks.rename(id, title),
    abandon: ({ id }) => tasks.abandon(id),
  });
}
