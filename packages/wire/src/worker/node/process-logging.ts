import { describeOpError, type Logger } from '@emdash/shared/logger';
import { initProcessLogging } from '@emdash/shared/logger/node';
import { startDevPerfInstruments } from '@emdash/shared/perf';
import { WORKER_NAME_ENV_VAR } from '../types';
import { installWorkerVitals } from './vitals';

export function initWorkerProcessLogging(fallbackName: string): Logger {
  const logger = initProcessLogging({
    name: process.env[WORKER_NAME_ENV_VAR] ?? fallbackName,
  });
  // Dev-only spawn/RSS reporting; a no-op unless debug logging is enabled.
  startDevPerfInstruments({ logger });
  // Telemetry vitals + verbose spawn logging: inert until the host sends a
  // control message; no timers or instruments are created before then.
  installWorkerVitals({ logger });
  installProcessFaultLogging(logger);
  return logger;
}

/**
 * Logs the faults that would otherwise only reach stderr as unstructured text. The
 * monitor and the rethrow keep Node's default crash behavior intact.
 */
function installProcessFaultLogging(logger: Logger): void {
  process.on('uncaughtExceptionMonitor', (error, origin) => {
    logger.error('uncaught exception', {
      op: 'process.fault',
      stage: origin,
      ...describeOpError(error),
    });
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('unhandled rejection', { op: 'process.fault', ...describeOpError(reason) });
    if (process.listenerCount('unhandledRejection') === 1) throw reason;
  });
  process.on('warning', (warning) => {
    logger.warn('process warning', {
      op: 'process.warning',
      errorKind: warning.name,
      errorMessage: warning.message.slice(0, 300),
    });
  });
}
