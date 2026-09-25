import { filesContract } from '@emdash/core/runtimes/files/api';
import { gitContract } from '@emdash/core/runtimes/git/api';
import { terminalsContract } from '@emdash/core/runtimes/terminals/api';
import { tuiAgentsContract } from '@emdash/core/runtimes/tui-agents/api';
import { defineContract } from '@emdash/wire/rpc';
import { pullRequestsContract } from '@upstream/services/pull-requests/api/contract';
import { agentsContract } from './agents';
import { appSettingsContract } from './app-settings';
import { boardContract } from './board';
import { changesContract } from './changes';
import { findingContract } from './finding';
import { githubContract } from './github';
import { projectsContract } from './projects';
import { promptsContract } from './prompts';
import { tasksContract } from './tasks';
import { villageContract } from './village';

/**
 * Mender's renderer-facing contract.
 *
 * Two kinds of domain sit here and always will. The runtime ones are emdash's,
 * forwarded straight through from @emdash/core to the subprocess that serves
 * them. The village's own — what is on the island and what state it is in —
 * are ours, and nothing upstream has an opinion about them.
 */
export const menderDomainContracts = {
  agents: agentsContract,
  appSettings: appSettingsContract,
  board: boardContract,
  changes: changesContract,
  files: filesContract,
  finding: findingContract,
  git: gitContract,
  github: githubContract,
  projects: projectsContract,
  prompts: promptsContract,
  pulls: pullRequestsContract,
  tasks: tasksContract,
  terminals: terminalsContract,
  tuiAgents: tuiAgentsContract,
  village: villageContract,
} as const;

export const menderWireContract = defineContract(menderDomainContracts);

export type MenderWireContract = typeof menderWireContract;
