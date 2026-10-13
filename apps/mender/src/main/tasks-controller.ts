import { createController, type Controller } from '@emdash/wire/rpc';
import { expose } from '@emdash/wire/state';
import { tasksContract } from '@shared/tasks';
import type { Tasks } from './tasks';

/** The tasks domain, as the village asks about it. */
export function createTasksController(tasks: Tasks): Controller {
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
    claudeHistory: ({ project }) => tasks.claudeHistory(project),
    claudeTold: ({ project, id, mtimeMs, dir }) => tasks.claudeTold(project, id, mtimeMs, dir),
    claudeElsewhere: ({ project }) => tasks.claudeElsewhere(project),
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
