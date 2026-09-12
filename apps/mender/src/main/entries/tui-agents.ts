import { createTuiAgentsComponent } from '@emdash/core/runtimes/tui-agents/node';
import { pluginRegistry } from '@emdash/plugins/agents';
import { runWireComponentWorker } from '@emdash/wire/worker';
import { initWorkerProcessLogging } from '@emdash/wire/worker/node';

/** The TUI agent runtime, in its own process. Ours for the same reason as ACP:
    the plugin registry is the app's, not core's. */
const logger = initWorkerProcessLogging('tui-agents-runtime');
void runWireComponentWorker(createTuiAgentsComponent({ pluginRegistry }), { logger });
