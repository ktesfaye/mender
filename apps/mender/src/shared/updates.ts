import { defineContract, procedure } from '@emdash/wire/rpc';
import { z } from 'zod';

/**
 * Where this copy of Mender stands against the newest one published.
 *
 * `none` is the answer after asking and finding nothing newer; `ready` is a
 * newer one already fetched and waiting to be swapped in at the next quit;
 * `cannot` is a build that never updates itself, a dev instance or one run
 * from somewhere it could not be replaced.
 */
export const updateStateSchema = z.object({
  version: z.string(),
  phase: z.enum(['idle', 'checking', 'none', 'fetching', 'ready', 'failed', 'cannot']),
  /** The newer version, once one has been seen. */
  latest: z.string().nullable(),
  /** Why, when it failed or cannot. */
  said: z.string().nullable(),
});

export type UpdateState = z.infer<typeof updateStateSchema>;

export const updatesContract = defineContract({
  state: procedure({ input: z.object({}), output: updateStateSchema }),
  check: procedure({ input: z.object({}), output: updateStateSchema }),
  /** Quit, swap the waiting one in and open it again. */
  restart: procedure({ input: z.object({}), output: z.boolean() }),
});

export type UpdatesContract = typeof updatesContract;

/** Whether version `a` is later than `b`, both plain x.y.z. */
export function newer(a: string, b: string): boolean {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  }
  return false;
}
