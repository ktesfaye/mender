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
