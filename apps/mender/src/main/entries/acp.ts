import { createAcpComponent } from '@emdash/core/runtimes/acp/node';
import { pluginRegistry } from '@emdash/plugins/agents';
import { runWireComponentWorker } from '@emdash/wire/worker';
import { initWorkerProcessLogging } from '@emdash/wire/worker/node';

/**
 * The ACP session runtime, in its own process.
 *
 * It needs an entry of our own only because core stays plugin-free: which
 * agent CLIs exist is the app's to say, and this is where Mender says it.
 */
const logger = initWorkerProcessLogging('acp-runtime');
void runWireComponentWorker(createAcpComponent({ pluginRegistry }), { logger });
