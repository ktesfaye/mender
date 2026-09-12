import { parseNativeAbsolute } from '@emdash/core/primitives/path/api';
import type { Stages } from '@mender/village';
import type { MenderRuntimes } from './runtimes';

/**
 * What is standing on the island.
 *
 * A project is a district, and a district's stage is how far that project has
 * grown. Mender does not have a project model yet, so there is exactly one
 * project it can honestly claim: the checkout it was launched from, if that is
 * a checkout at all. It takes the first plot out of the camp, at stage one.
 *
 * When projects become real this reads them instead, and nothing above it
 * changes: the village already only ever asks what is on the island.
 */
export function createIslandState(git: MenderRuntimes['git']) {
  return async function state(): Promise<Stages> {
    const path = parseNativeAbsolute(process.cwd());
    if (!path.success) return {};
    const inspection = await git.inspectPath({ path: path.data });
    // Nothing to show is not an error: an island with no projects on it is a
    // camp and a fire, which is exactly what the empty state should look like.
    if (!inspection.success || inspection.data.kind !== 'repository') return {};
    return { A: 1 };
  };
}
