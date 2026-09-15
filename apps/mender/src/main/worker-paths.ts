import { join } from 'node:path';
import { app } from 'electron';
import type { MenderWorkerId } from '@shared/workers';

/**
 * Resolves a built worker's file.
 *
 * `app.getAppPath()` rather than `import.meta.url`: code splitting can move
 * this module into a chunks/ subdirectory, where a relative path would miss
 * the sibling runtime files.
 *
 * Packaged, this is a path inside the archive, and that is correct: Electron
 * teaches its own node to read one, so a worker spawned from in there loads
 * and resolves exactly as it does in development. What must not happen is the
 * opposite — pulling a package out of the archive and leaving the things it
 * imports inside it, which is a package that resolves to half of itself.
 */
export function menderWorkerPath(id: MenderWorkerId): string {
  const appPath = typeof app?.getAppPath === 'function' ? app.getAppPath() : process.cwd();
  return join(appPath, 'out', 'main', `${id}.js`);
}
