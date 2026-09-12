import { createAgentConfigComponent } from '@emdash/core/runtimes/agent-config/node';
import { pluginRegistry } from '@emdash/plugins/agents';
import { runWireComponentWorker } from '@emdash/wire/worker';
import { initWorkerProcessLogging } from '@emdash/wire/worker/node';

/**
 * What each agent is configured with, in its own process.
 *
 * It owns the agents' own config files — which servers out in the world an
 * agent is allowed to reach, and what it has been taught — so it needs to know
 * which agents exist, which core deliberately does not.
 */
const logger = initWorkerProcessLogging('agent-config-runtime');
void runWireComponentWorker(createAgentConfigComponent({ pluginRegistry }), { logger });
