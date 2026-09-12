import { gitContract } from '@emdash/core/runtimes/git/api';
import { defineContract } from '@emdash/wire/rpc';
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
  git: gitContract,
  village: villageContract,
} as const;

export const menderWireContract = defineContract(menderDomainContracts);

export type MenderWireContract = typeof menderWireContract;
