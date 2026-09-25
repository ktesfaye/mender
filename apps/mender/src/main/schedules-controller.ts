import { createController, type Controller } from '@emdash/wire/rpc';
import { schedulesContract } from '@shared/schedules';
import type { Schedules } from './schedules';

/** The schedules domain, as a project's settings window asks about it. */
export function createSchedulesController(schedules: Schedules): Controller {
  return createController(schedulesContract, {
    list: ({ project }) => schedules.list(project),
    agents: () => schedules.agents(),
    add: ({ project, what, agent, kind, when }) => schedules.add(project, what, agent, kind, when),
    remove: ({ id }) => schedules.remove(id),
  });
}
