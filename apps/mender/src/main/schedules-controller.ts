import { createController, type Controller } from '@emdash/wire/rpc';
import { schedulesContract } from '@shared/schedules';
import type { AppSettings } from './app-settings';
import type { Schedules } from './schedules';

/** The schedules domain, as a project's settings window asks about it. */
export function createSchedulesController(schedules: Schedules, settings: AppSettings): Controller {
  return createController(schedulesContract, {
    list: ({ project }) => schedules.list(project),
    /* Whoever is installed, the default first, so the window offers what
       would actually start rather than every agent ever heard of. */
    agents: async () => {
      const [hands, first] = await Promise.all([settings.hands(), settings.defaultHand()]);
      const speak = new Set(schedules.agents().map((one) => one.id));
      return hands
        .filter((hand) => speak.has(hand.id))
        .sort(
          (a, b) =>
            Number(b.here) - Number(a.here) || Number(b.id === first) - Number(a.id === first)
        );
    },
    add: ({ project, what, agent, kind, when }) => schedules.add(project, what, agent, kind, when),
    remove: ({ id }) => schedules.remove(id),
  });
}
