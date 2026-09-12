import { gitContract } from '@emdash/core/runtimes/git/api';
import { defineContract } from '@emdash/wire/rpc';

/**
 * Mender's renderer-facing contract.
 *
 * Wave 0 is the seam proof: one real runtime domain reaching the village
 * renderer over wire. Domains are added here as each wave needs them; the
 * runtime ones are forwarded straight through from @emdash/core, and the
 * village's own domains (projects, tasks, plots) land alongside them.
 */
export const menderDomainContracts = {
  git: gitContract,
} as const;

export const menderWireContract = defineContract(menderDomainContracts);

export type MenderWireContract = typeof menderWireContract;
