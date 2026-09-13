import { createLiveJobReplicaCache, LiveJobFailedError } from '@emdash/wire/live';
import type {
  JobError,
  JobInput,
  JobResult,
  LiveJobClientHandle,
  LiveJobEndpointDef,
} from '@emdash/wire/rpc';

/**
 * Running something that takes a while and can fail, and waiting for it.
 *
 * Pushing and pulling are jobs rather than calls because they talk to another
 * machine: they report as they go and they can be given up on. The village has
 * nowhere to draw a progress bar and no wish for one, so what it wants is the
 * end of it, and that is all this returns.
 */
export async function ran<Def extends LiveJobEndpointDef>(
  definition: Def,
  handle: LiveJobClientHandle<Def>,
  input: JobInput<Def>
): Promise<
  { success: true; data: JobResult<Def> } | { success: false; error: JobError<Def> | undefined }
> {
  const jobs = createLiveJobReplicaCache(definition, handle);
  const lease = await jobs.start(input);
  try {
    const job = await lease.ready();
    try {
      return { success: true, data: await job.result };
    } catch (error) {
      if (error instanceof LiveJobFailedError) {
        return { success: false, error: error.error as JobError<Def> };
      }
      throw error;
    }
  } finally {
    await lease.release();
    await jobs.dispose();
  }
}
