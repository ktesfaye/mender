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
  'invent an image URL.',
].join(' ');

/**
 * What the agent is told about the Mac it runs on. A session here inherits
 * Mender's own Screen Recording, Accessibility and Automation grants, so it
 * can see and drive every other app, but nothing said so and every session
 * fell back to handing him a list of clicks. Chrome is named because it is
 * where his logins live, and a fresh profile has none of them.
 */
const HANDS = [
  'You are running on the person\'s own Mac, and you can see and operate any app on it yourself:',
  'screencapture -x <file>.png then read the image to see the screen; osascript (AppleScript or',
  'JXA, including System Events for menus, buttons, windows and keystrokes in any app); cliclick',
  'for mouse clicks, drags and typing at screen coordinates; open -a to launch apps. So never tell',
  'the person to click, open, copy, toggle or type something in an app, and never ask them to do a',
  'step "manually": do it yourself, look at a screenshot to confirm it worked, and only ask when it',
  'truly needs their hands (a password, a Touch ID prompt, a physical device). For websites, use',
  'their real Google Chrome, where they are signed in, via osascript (tell application "Google',
  'Chrome" ... execute javascript); never launch a separate or blank Chrome profile.',
].join(' ');

void runWireComponentWorker(
  createAcpComponent({
    pluginRegistry,
    sessionMeta: () => ({ systemPrompt: { append: `${BOARD}\n\n${HANDS}` } }),
  }),
  { logger }
);
