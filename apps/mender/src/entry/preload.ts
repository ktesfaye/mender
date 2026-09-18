import { requestWirePort, type WindowLike } from '@emdash/wire/rpc';
import { clipboard, contextBridge, ipcRenderer, webUtils } from 'electron';
import { MENDER_WATCH_CHANNEL, MENDER_WIRE_CHANNEL, type Watching } from '../shared/channels';

// Typechecked as node (no DOM lib) but runs in the renderer; declare `window`
// with the structural type wire needs.
declare const window: WindowLike;

/* The host starts saying whether anybody is looking before the page has
   finished loading enough to care, so the answer is caught here, at the edge,
   and replayed to the village whenever it gets round to asking. Missing one
   would leave it drawing a window nobody can see. */
let looking: Watching = 'front';
let told: ((now: Watching) => void) | null = null;
ipcRenderer.on(MENDER_WATCH_CHANNEL, (_event, now: Watching) => {
  looking = now;
  told?.(now);
});

contextBridge.exposeInMainWorld('mender', {
  requestWirePort: () => requestWirePort({ ipcRenderer, window }, { channel: MENDER_WIRE_CHANNEL }),
  /* Where a dropped file came from. The browser hands the renderer bytes and a
     name and deliberately not a path; a file on this machine that somebody
     dragged in from the Finder has one, and it is the only thing worth saying
     about a file nobody can look at. */
  pathOf: (file: File) => {
    try {
      return webUtils.getPathForFile(file);
    } catch {
      return '';
    }
  },
  /* Whether anybody can see the village. Only the main process knows: this
     window is built with background throttling off so that the wire underneath
     keeps running when it is put away, and the side effect of that is a page
     which thinks it is on screen forever. */
  watching: (to: (now: Watching) => void) => {
    told = to;
    to(looking);
  },
  /* Taking something off the board. The host's own clipboard rather than the
     browser's, because the browser's needs a secure page and a packaged
     village is loaded off the disk. */
  keep: (text: string) => clipboard.writeText(text),
});
