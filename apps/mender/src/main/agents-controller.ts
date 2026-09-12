import { createController, type Controller } from '@emdash/wire/rpc';
import { expose } from '@emdash/wire/state';
import { agentsContract } from '@shared/agents';
import type { Agents } from './agents';

/** The agents domain: what the village can see of whoever is working. */
export function createAgentsController(agents: Agents): Controller {
  return createController(agentsContract, {
    work: expose(agentsContract.work, { state: (key) => agents.working(key.task) }),
    kit: expose(agentsContract.kit, { state: (key) => agents.kit(key.task) }),
    island: expose(agentsContract.island, { moods: () => agents.moods() }),
    wake: ({ task }) => agents.wake(task),
    tell: ({ task, text }) => agents.tell(task, text),
    answer: ({ task, requestId, optionId }) => agents.answer(task, requestId, optionId),
    hush: ({ task }) => agents.hush(task),
    choose: ({ task, what, id }) => agents.choose(task, what, id),
    tool: ({ task, name, on }) => agents.tool(task, name, on),
  });
}
