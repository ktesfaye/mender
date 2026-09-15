import { filesContract } from '@emdash/core/runtimes/files/api';
import { gitContract } from '@emdash/core/runtimes/git/api';
import { terminalsContract } from '@emdash/core/runtimes/terminals/api';
import { defineContract } from '@emdash/wire/rpc';
import { agentsContract } from './agents';
import { changesContract } from './changes';
import { findingContract } from './finding';
import { projectsContract } from './projects';
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
  changes: changesContract,
  files: filesContract,
  finding: findingContract,
  git: gitContract,
  projects: projectsContract,
  tasks: tasksContract,
  terminals: terminalsContract,
  village: villageContract,
} as const;

export const menderWireContract = defineContract(menderDomainContracts);

export type MenderWireContract = typeof menderWireContract;
