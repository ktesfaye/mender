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

/**
 * What the agent is told about the board it is read on: that a picture it
 * puts in its answer is drawn there, so a place it suggests can come with a
 * look at it. Guessed image addresses are dead more often than not, which is
 * why only ones it has actually seen count.
 */
const BOARD = [
  'Your replies are shown in Mender, a desktop app that renders markdown, including images:',
  '![caption](https://...) is drawn inline as a picture, several in a row side by side.',
  'When you suggest or describe things a person would want to see (restaurants, dishes, places,',
  'hotels, attractions, products), include a picture of each with a short caption when you have',
  'a real image URL for it, one you actually saw in a page you fetched or a search result.',
  'Never guess or construct an image URL; if you have none, leave the picture out.',
].join(' ');

void runWireComponentWorker(
  createAcpComponent({
    pluginRegistry,
    sessionMeta: () => ({ systemPrompt: { append: BOARD } }),
  }),
  { logger }
);
