import { createController, type Controller } from '@emdash/wire/rpc';
import { expose, type Cell } from '@emdash/wire/state';
import { agentsContract, type Mood } from '@shared/agents';
import type { Agents } from './agents';
import type { HungryWatch } from './hungry';
import type { TuiSessions } from './tui-sessions';

/**
 * The agents domain: what the village can see of whoever is working.
 *
 * `moods` is normally `agents.moods()`, but a session running as its own
 * terminal keeps its mood in `tui-sessions.ts` instead, so the island's real
 * mood map is whichever one the caller merged the two into — the rail does
 * not know or care which runtime a lantern's light came from.
 */
export function createAgentsController(
  agents: Agents,
  moods: Cell<Record<string, Mood>>,
  tuiSessions: TuiSessions,
  hungry: HungryWatch
): Controller {
  return createController(agentsContract, {
    work: expose(agentsContract.work, { state: (key) => agents.working(key.task) }),
    kit: expose(agentsContract.kit, { state: (key) => agents.kit(key.task) }),
    island: expose(agentsContract.island, {
      moods: () => moods,
      glances: () => agents.glances(),
      hungry: () => hungry.all(),
    }),
    answerHungry: ({ task, choice }) => hungry.answer(task, choice),
    wake: ({ task }) => agents.wake(task),
    wakeTerminal: async ({ task }) => {
      const started = await tuiSessions.open(task);
      return started.success
        ? { success: true as const, data: undefined }
        : {
            success: false as const,
            error: { kind: 'refused' as const, because: started.because },
          };
    },
    tell: ({ task, text, carrying, hidden }) => agents.tell(task, text, carrying, hidden),
    resume: ({ task, providerSessionId }) => agents.resume(task, providerSessionId),
    carry: ({ task }, file) => agents.carry(task, file),
    putDown: ({ task, id }) => agents.putDown(task, id),
    answer: ({ task, requestId, optionId }) => agents.answer(task, requestId, optionId),
    finishAsking: ({ task }) => agents.finishAsking(task),
    unsay: ({ task, id }) => agents.unsay(task, id),
    hush: ({ task, untouched, keep }) => agents.hush(task, untouched, keep),
    recall: ({ task, call }) => agents.recall(task, call),
    helperTrail: ({ task, call }) => agents.helperTrail(task, call),
    commandTail: ({ task, call }) => agents.commandTail(task, call),
    sendAway: ({ task, call }) => agents.sendAway(task, call),
    rest: ({ task }) => agents.rest(task),
    retryFailure: ({ task }) => agents.retryFailure(task),
    waitOutFailure: ({ task }) => agents.waitOutFailure(task),
    stopWaiting: ({ task }) => agents.stopWaiting(task),
    startOver: ({ task }) => agents.startOver(task),
    choose: ({ task, what, id }) => agents.choose(task, what, id),
    tool: ({ task, name, on }) => agents.tool(task, name, on),
    addTool: ({ task, key }) => agents.addTool(task, key),
    addCustomTool: ({ task, name, command }) => agents.addCustomTool(task, name, command),
    removeTool: ({ task, name }) => agents.removeTool(task, name),
    skillsCatalogue: () => agents.skillsCatalogue(),
    addKnack: ({ task, id }) => agents.addKnack(task, id),
    addCustomKnack: ({ task, name, about }) => agents.addCustomKnack(task, name, about),
    removeKnack: ({ task, name, from }) => agents.removeKnack(task, name, from),
    knackText: ({ task, name, from }) => agents.knackText(task, name, from),
    fetch: ({ hand }) => agents.fetch(hand),
    update: ({ hand }) => agents.update(hand),
    remove: ({ hand }) => agents.remove(hand),
    draft: ({ task }) => agents.draft(task),
    setDraft: ({ task, text }) => agents.setDraft(task, text),
  });
}
