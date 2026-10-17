import { createController, type Controller } from '@emdash/wire/rpc';
import { expose } from '@emdash/wire/state';
import { tasksContract } from '@shared/tasks';
import type { ClaudeCliSession } from './claude-cli-history';
import type { Tasks } from './tasks';

/** The tasks domain, as the village asks about it. A past session the
    village is still holding is listed under the name it has here, not
    whatever Claude Code called it, since that is the name he knows it by. */
export function createTasksController(
  tasks: Tasks,
  claudeSessions: () => { task: string; session: string }[]
): Controller {
  const named = async (sessions: ClaudeCliSession[]): Promise<ClaudeCliSession[]> => {
    const held = claudeSessions();
    if (!held.length) return sessions;
    const titles = new Map((await tasks.list()).map((task) => [task.id, task.title]));
    const byId = new Map<string, string>();
    for (const { task, session } of held) {
      const title = titles.get(task);
      if (title && title !== 'claude') byId.set(session, title);
    }
    return sessions.map((one) => {
      const title = byId.get(one.id);
      return title ? { ...one, title } : one;
    });
  };
  return createController(tasksContract, {
    all: expose(tasksContract.all, { list: () => tasks.watch() }),
    list: ({ project }) => tasks.list(project),
    begin: ({ project, name, slot, kind, branch, isolated, workspace }) =>
      tasks.begin(project, name, slot, kind, branch, isolated, workspace),
    workspaces: expose(tasksContract.workspaces, { list: () => tasks.watchWorkspaces() }),
    cutWorkspace: ({ project, name }) => tasks.cutWorkspace(project, name),
    dropCost: ({ id }) => tasks.dropCost(id),
    dropWorkspace: ({ id }) => tasks.dropWorkspace(id),
    renameWorkspace: ({ id, name }) => tasks.renameWorkspace(id, name),
    branches: ({ project }) => tasks.branches(project),
    claudeHistory: async ({ project }) => await named(await tasks.claudeHistory(project)),
    claudeTold: ({ project, id, mtimeMs, dir }) => tasks.claudeTold(project, id, mtimeMs, dir),
    claudeElsewhere: async ({ project }) => await named(await tasks.claudeElsewhere(project)),
    claudeAdopt: ({ project, dir, id }) => tasks.claudeAdopt(project, dir, id),
    setupFailure: ({ id }) => tasks.setupFailure(id),
    retrySetup: ({ id }) => tasks.retrySetup(id),
    linkPull: ({ id, url }) => tasks.linkPull(id, url),
    unlinkPull: ({ id }) => tasks.unlinkPull(id),
    files: ({ id, like }) => tasks.files(id, like),
    rename: ({ id, title }) => tasks.rename(id, title),
    retool: ({ id }) => tasks.retool(id),
    abandon: ({ id, unoffered }) => tasks.abandon(id, unoffered),
    revivable: ({ project }) => tasks.revivable(project),
    revive: ({ project }) => tasks.revive(project),
    history: ({ project }) => tasks.history(project),
    fork: ({ id }) => tasks.fork(id),
  });
}
