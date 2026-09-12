import { createController, type Controller } from '@emdash/wire/rpc';
import { tasksContract } from '@shared/tasks';
import type { Tasks } from './tasks';

/** The tasks domain, as the village asks about it. */
export function createTasksController(tasks: Tasks): Controller {
  return createController(tasksContract, {
    list: ({ project }) => tasks.list(project),
    begin: ({ project, name, slot }) => tasks.begin(project, name, slot),
    abandon: ({ id }) => tasks.abandon(id),
  });
}
