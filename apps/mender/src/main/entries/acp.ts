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
  "Wikipedia article's image. If one source has nothing, try the next before giving up. Never",
  'invent an image URL. Opening an image file yourself (Read, a screenshot) shows it to you and',
  'nobody else: anything you made or rendered that the person should look at, designs, mockups,',
  'screenshots, has to be written into your reply as a markdown image with its path, each one',
  'before you ask them anything about it. Never put a choice about pictures to them (AskUserQuestion',
  'included) until the pictures are in your reply.',
].join(' ');

/**
 * What the agent is told about putting a choice to him. The question tool is
 * drawn here as a proper choice, but left to itself a session would as often
 * write the options out as a numbered list in prose and stop, which reads as
 * one more answer and can only be replied to by typing.
 */
const ASKING = [
  'When you need the person to choose between options (two or more ways forward, a yes or no with',
  'consequences, which of several things), ask with the AskUserQuestion tool, which Mender draws as',
  'a proper choice they answer with a key. Never write the options out as a list in your reply and',
  'stop to wait for an answer.',
].join(' ');

/**
 * What the agent is told about the Mac it runs on. A session here inherits
 * Mender's own Screen Recording, Accessibility and Automation grants, so it
 * can see and drive every other app, but nothing said so and every session
 * fell back to handing him a list of clicks. Chrome is named because it is
 * where his logins live, and a fresh profile has none of them.
 */
const HANDS = [
  "You are running on the person's own Mac, and you can see and operate any app on it yourself:",
  'screencapture -x <file>.png then read the image to see the screen; osascript (AppleScript or',
  'JXA, including System Events for menus, buttons, windows and keystrokes in any app); cliclick',
  'for mouse clicks, drags and typing at screen coordinates; open -a to launch apps. So never tell',
  'the person to click, open, copy, toggle or type something in an app, and never ask them to do a',
  'step "manually": do it yourself, look at a screenshot to confirm it worked, and only ask when it',
  'truly needs their hands (a password, a Touch ID prompt, a physical device). For websites, use',
  'their real Google Chrome, where they are signed in, via osascript (tell application "Google',
  'Chrome" ... execute javascript); never launch a separate or blank Chrome profile.',
].join(' ');

/**
 * What the agent is told about being talked to while it works. Something said
 * mid-turn is only read at the agent's next pause between steps, so a step
 * that sits blocked (a build lock, a sleep, a poll loop, a long test run)
 * leaves the person talking to a wall until they stop it. Waits are made
 * the agent's to keep short, so the pause arrives.
 */
const WAITING = [
  'The person can talk to you while you work, but anything they say is only read between your',
  'steps, never during one. So never sit inside one long blocking step: no sleep or polling loop,',
  'no waiting on a lock, a build, a deploy, another session or a background agent in one command.',
  'Start slow things in the background (run_in_background) and check on them in short steps, a few',
  'seconds each, so you get a pause to read what they have said and can answer them right away.',
].join(' ');

/**
 * The village's own tool, handed to every chat session beside whatever the
 * agent's config already lists. Left out when the app did not say where it
 * lives, which is only ever a worker started by hand.
 */
function villageTools(cwd: string) {
  const door = process.env.MENDER_DOOR;
  const tools = process.env.MENDER_TOOLS_DIR;
  if (!door || !tools) return [];
  return [
    {
      name: 'mender',
      transport: 'stdio' as const,
      command: 'node',
      args: [`${tools}/mender-mcp.mjs`],
      env: { MENDER_DOOR: door, MENDER_CWD: cwd },
    },
  ];
}

const STARTING = [
  'You can start another Mender session yourself with the start_session tool of the mender',
  'server. Whenever you are asked to launch, open or spin up a new session or agent here, use it:',
  'it hangs a lantern on the rail and walks the person into the new session so they watch it work.',
  'Never click the lantern, drive the window, or run a background claude for that.',
].join(' ');

const DRAFTING = [
  'Whenever you design anything here (a mockup, a concept, a redesign, an iteration on a visual),',
  "it goes on the project's drafting table, the pinned sheet on Mender's rack, through the mender",
  'server: read drafting_table first, then pin_pass every pass you render the moment you have looked',
  'at it (options drawn side by side share one question), pick the moment he takes one, note what he',
  'says about it in his words (and anything he never wants back), and set_plan once a part is settled.',
  'When the whole thing can be walked through, set_flow. Never overwrite a pass; a change is a new one.',
].join(' ');

void runWireComponentWorker(
  createAcpComponent({
    pluginRegistry,
    sessionMeta: () => ({
      systemPrompt: {
        append: `${BOARD}\n\n${ASKING}\n\n${HANDS}\n\n${WAITING}\n\n${STARTING}\n\n${DRAFTING}`,
      },
    }),
    extraMcpServers: (_provider, cwd) => villageTools(cwd),
  }),
  { logger }
);
