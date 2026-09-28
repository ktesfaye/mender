import { readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { setRootLogger } from '@emdash/shared/logger';
import {
  createFileTransport,
  createPinoLogger,
  installAsyncLogContext,
} from '@emdash/shared/logger/node';
import { app, type WebContents } from 'electron';
import type { Logger } from '@emdash/shared/logger';

/**
 * Everything the village and its workers say about themselves, on disk.
 *
 * Not for him: this is so that when something goes wrong, whoever is fixing
 * it can go and read what happened instead of guessing. One file a day under
 * `<userData>/logs`, a month of them kept. The workers inherit the level
 * through the environment and write pino lines to stderr, which the worker
 * host forwards into this same logger, so one file holds the whole story.
 */

const KEEP_DAYS = 30;
const MAX_BYTES_PER_FILE = 50 * 1024 * 1024;
const ROTATED_PER_DAY = 4;

let root: Logger | undefined;

export function logsDir(): string {
  return join(app.getPath('userData'), 'logs');
}

function todaysFile(): string {
  const now = new Date();
  const day = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  return join(logsDir(), `mender-${day}.log`);
}

function sweepOldLogs(): void {
  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  let names: string[] = [];
  try {
    names = readdirSync(logsDir());
  } catch {
    return;
  }
  for (const name of names) {
    if (!name.startsWith('mender-')) continue;
    const path = join(logsDir(), name);
    try {
      if (statSync(path).mtimeMs < cutoff) unlinkSync(path);
    } catch {
      // Gone already, or not ours to remove.
    }
  }
}

/**
 * Must run before anything creates a scope: a scope binds its logger the
 * moment it is made, so one made first would log into nothing forever.
 * Needs userData settled, so it runs after the app's name and data dir are.
 */
export function startLogging(): Logger {
  if (root) return root;
  process.env.EMDASH_LOG_LEVEL ??= 'info';
  const transport = createFileTransport({
    path: todaysFile,
    maxBytes: MAX_BYTES_PER_FILE,
    retainedFiles: ROTATED_PER_DAY,
  });
  root = createPinoLogger({
    envLevel: process.env.EMDASH_LOG_LEVEL,
    bindings: { proc: 'main', pid: process.pid },
    destination: transport.asDestination(),
  });
  installAsyncLogContext();
  setRootLogger(root);

  sweepOldLogs();
  setInterval(sweepOldLogs, 6 * 60 * 60 * 1000).unref();

  const log = root.child({ area: 'process' });
  log.info('mender starting', {
    version: app.getVersion(),
    packaged: app.isPackaged,
    electron: process.versions.electron,
    node: process.versions.node,
    platform: `${process.platform} ${process.arch}`,
  });
  process.on('uncaughtException', (error) => log.error('uncaught exception', { error }));
  process.on('unhandledRejection', (reason) => log.error('unhandled rejection', { reason }));
  process.on('warning', (warning) => log.warn('process warning', { warning }));
  app.on('child-process-gone', (_event, details) => log.error('child process gone', { details }));
  app.on('render-process-gone', (_event, _contents, details) =>
    log.error('render process gone', { details })
  );
  app.on('will-quit', () => log.info('mender quitting'));
  return root;
}

export function logger(area: string): Logger {
  return (root ?? startLogging()).child({ area });
}

/** The window's own console, crashes and hangs, into the same file. */
export function logWindow(contents: WebContents): void {
  const log = logger('renderer');
  contents.on('console-message', (event) => {
    const { level, message, lineNumber, sourceId } = event;
    const at = { source: `${sourceId}:${lineNumber}` };
    if (level === 'error') log.error(message, at);
    else if (level === 'warning') log.warn(message, at);
    else log.info(message, at);
  });
  contents.on('unresponsive', () => log.warn('window unresponsive'));
  contents.on('responsive', () => log.info('window responsive again'));
  contents.on('did-fail-load', (_event, code, description, url) =>
    log.error('window failed to load', { code, description, url })
  );
  contents.on('preload-error', (_event, path, error) =>
    log.error('preload failed', { path, error })
  );
}
