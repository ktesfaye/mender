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
 * puts in its answer is drawn there, so anything worth seeing comes with a
 * look at it. A search hands back no picture addresses and a guessed one is
 * dead more often than not, so it is told where real ones come from.
 */
const BOARD = [
  'Your replies are shown in Mender, a desktop app that renders markdown, including images:',
  '![caption](https://...) is drawn as a picture, several in a row side by side, with the caption under it.',
  'Whenever the answer is about something a person would want to see, show pictures of it: when',
  'they ask what something looks like, and whenever you suggest, compare or describe real things',
  '(places, products, food, objects, animals, plants, buildings, artworks, people, vehicles, anything visual).',
  'Search results carry no image URLs, so before answering get real ones. For each thing, use a real',
  'page about it from your search results or a search for it (never guess a domain): its official',
  'site or product page, its Wikipedia page, or an article or review about it. Fetch it with curl,',
  "e.g. `curl -sL --max-time 8 -A 'Mozilla/5.0' <url> | grep -io '<meta[^>]*og:image[^>]*>'`, and use its og:image.",
  'If that page has none, grep its HTML for photo URLs (.jpg, .jpeg, .png, .webp) and take one that is',
  'clearly a photo of the thing, or try another page about it. For Wikipedia,',
  '`https://en.wikipedia.org/api/rest_v1/page/summary/<Title>` gives originalimage.source.',
  'WebFetch summaries drop image URLs, so use curl, fetching everything in parallel in one command,',
  'and make a second pass for the things the first pass found nothing for.',
  'Put each picture on its own line next to what it shows, captioned with its name.',
  'Skip a picture you cannot find a real URL for. Never guess or construct an image URL.',
  'Code, logs and other non-visual answers need no pictures.',
].join(' ');

void runWireComponentWorker(
  createAcpComponent({
    pluginRegistry,
    sessionMeta: () => ({ systemPrompt: { append: BOARD } }),
  }),
  { logger }
);
