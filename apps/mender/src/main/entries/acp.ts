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
 * What the agent is told about the board it is read on: that pictures are
 * drawn there, and so to be visual wherever seeing a thing would help, the
 * way a good article is. How and where is left to it. The one thing said
 * firmly is that a picture has to be real, because a search hands back no
 * picture addresses and a guessed one is dead more often than not.
 */
const BOARD = [
  'Your replies are shown in Mender, which renders markdown images, from the web or from a path on',
  'this machine. Be visual: whenever a picture would help the person, show one, right where you talk',
  'about that thing, the way a good article or a friend who had been there would. A picture written',
  'inside a paragraph or list item is drawn beside that text; one on a line of its own is drawn there.',
  'Only use images you have actually found: search results carry no image URLs, so fetch the pages',
  'that do have them (curl shows the raw HTML; WebFetch summaries drop image URLs). Never invent one.',
].join(' ');

void runWireComponentWorker(
  createAcpComponent({
    pluginRegistry,
    sessionMeta: () => ({ systemPrompt: { append: BOARD } }),
  }),
  { logger }
);
