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
 * way a good article is. Left as a suggestion it got skipped the moment the
 * first page it tried had no obvious <img>, so a recommendation of real
 * things is made a rule, and the share image every commercial page carries
 * (og:image) is named as where to look first, since a grep for img tags on a
 * script-built site finds nothing. A picture has to be real: a search hands
 * back no picture addresses and a guessed one is dead more often than not.
 */
const BOARD = [
  'Your replies are shown in Mender, which renders markdown images, from the web or from a path on',
  'this machine. Be visual: whenever a picture would help the person, show one, right where you talk',
  'about that thing, the way a good article or a friend who had been there would. Whenever you',
  'recommend or compare specific real things (places, tours, restaurants, products, people,',
  'animals, buildings), each one you name gets a picture of it; pictures cost the person no reading,',
  'so a short-answer style is no reason to leave them out. A picture written inside a paragraph or',
  'list item is drawn beside that text; one on a line of its own is drawn there. Only use images',
  'you have actually found: search results carry no image URLs, so fetch the pages that do have',
  'them (curl shows the raw HTML; WebFetch summaries drop image URLs). The quickest real picture of',
  'almost any business or product is its page\'s share image: curl -sL -A "Mozilla/5.0" the page and',
  'read <meta property="og:image"> (or twitter:image); failing that, Wikimedia Commons or the',
  'Wikipedia article\'s image. If one source has nothing, try the next before giving up. Never',
  'invent an image URL. The board also draws markdown tables, fenced code blocks and fenced',
  'mermaid diagrams, so anything with a shape should be given its shape instead of a paragraph: a',
  'hierarchy as a fenced tree, a comparison as a table, moving parts or a flow as a mermaid',
  'diagram, a sequence as numbered steps. A wall of text is the one thing never wanted. When there',
  'is a lot to take in, a design, a plan, a wide comparison, build it as a file instead, an HTML',
  'page, a document or a rendered picture, written to disk outside the checkout; what you write',
  'is listed on the board as something made and opens with a press, so the reply can be two lines',
  'and the thing.',
].join(' ');

void runWireComponentWorker(
  createAcpComponent({
    pluginRegistry,
    sessionMeta: () => ({ systemPrompt: { append: BOARD } }),
  }),
  { logger }
);
