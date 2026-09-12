import { join } from 'node:path';
import { app } from 'electron';
import type { MenderWorkerId } from '@shared/workers';

/**
 * Resolves a built worker's file. app.getAppPath() rather than import.meta.url:
 * code splitting can move this module into a chunks/ subdirectory, where a
 * relative path would miss the sibling runtime files.
 */
export function menderWorkerPath(id: MenderWorkerId): string {
  const appPath = typeof app?.getAppPath === 'function' ? app.getAppPath() : process.cwd();
  return join(appPath, 'out', 'main', `${id}.js`);
}
