/** IPC channel the renderer uses to request its wire port from main. */
export const MENDER_WIRE_CHANNEL = 'mender:wire';

/**
 * Channel the main process tells the renderer whether anybody is looking on.
 *
 * The page cannot work this out for itself. The window is built with Chromium's
 * background throttling turned off — deliberately, so the wire underneath keeps
 * its own time when nobody is watching — and the cost of that is a page which
 * believes it is visible forever, minimised or not.
 */
export const MENDER_WATCH_CHANNEL = 'mender:watch';

/** In front of you, behind something else, or put away. */
export type Watching = 'front' | 'behind' | 'gone';

/**
 * Channel the main process uses to say which session wants him, on a click.
 *
 * A system notification is answered outside the page entirely — through the
 * OS, on a window that may not even be showing — so the click has to reach
 * back in over IPC rather than through anything on the wood. It carries the
 * id of the task to stand in, which is the one thing a village-voiced banner
 * cannot say for itself.
 */
export const MENDER_ATTEND_CHANNEL = 'mender:attend';

/**
 * Channels for naming the cost of quitting before it happens.
 *
 * Main tells the renderer how many villagers are still lit, over
 * `MENDER_QUIT_COST_CHANNEL`, instead of quitting outright; the renderer's
 * own line says so, and pressing that line again sends
 * `MENDER_CONFIRM_QUIT_CHANNEL` back, which is the second press.
 */
export const MENDER_QUIT_COST_CHANNEL = 'mender:quit-cost';
export const MENDER_CONFIRM_QUIT_CHANNEL = 'mender:confirm-quit';

/**
 * Channel the native app menu uses to ask the page for something only the
 * page can do — there is nowhere else "open the windmill" lives.
 */
export const MENDER_MENU_CHANNEL = 'mender:menu';
export type MenuCommand = 'settings';

/**
 * Channel the main process uses to say what happened while he was away, once,
 * when the window regains focus after being gone a while. Carries a short
 * list of already-composed lines, oldest first.
 */
export const MENDER_MISSED_CHANNEL = 'mender:missed';

/**
 * Channel the renderer uses to carry a file out of the board and onto the
 * Mac — dropped on the Finder, another app, anywhere outside the window. The
 * browser has no such gesture of its own; only the main process can start an
 * OS-level drag, so the renderer just names the path.
 */
export const MENDER_START_DRAG_CHANNEL = 'mender:start-drag';

/**
 * Channel the renderer asks on for a folder to be picked, with the native
 * dialog, for a setting that wants a path. Answers the path, or null when the
 * dialog was dismissed.
 */
export const MENDER_PICK_FOLDER_CHANNEL = 'mender:pick-folder';

/**
 * Channel the renderer uses to move the window by its top edge. The title bar
 * is hidden and the top of the window is canvas, so there is no native strip
 * to hold; the page says when a grab starts and moves, and when the top
 * is double-clicked, and the main process does what macOS would.
 */
export const MENDER_GRIP_CHANNEL = 'mender:grip';
export type Grip = 'start' | 'move' | 'double';
