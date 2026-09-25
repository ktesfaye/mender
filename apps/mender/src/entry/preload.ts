import { requestWirePort, type WindowLike } from '@emdash/wire/rpc';
import { clipboard, contextBridge, ipcRenderer, shell, webUtils } from 'electron';
import {
  MENDER_ATTEND_CHANNEL,
  MENDER_CONFIRM_QUIT_CHANNEL,
  MENDER_MENU_CHANNEL,
  MENDER_QUIT_COST_CHANNEL,
  MENDER_WATCH_CHANNEL,
  MENDER_WIRE_CHANNEL,
  type MenuCommand,
  type Watching,
} from '../shared/channels';

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

/* Whichever session a clicked notification named, before the page has asked. */
let attended: ((task: string) => void) | null = null;
let heldAttend: string | null = null;
ipcRenderer.on(MENDER_ATTEND_CHANNEL, (_event, task: string) => {
  if (attended) attended(task);
  else heldAttend = task;
});

/* How many villagers are still lit, named before a quit actually happens. */
let quitCost: ((n: number) => void) | null = null;
ipcRenderer.on(MENDER_QUIT_COST_CHANNEL, (_event, n: number) => {
  quitCost?.(n);
});

/* What the native app menu asked for, before the page has asked. */
let menued: ((command: MenuCommand) => void) | null = null;
let heldMenu: MenuCommand | null = null;
ipcRenderer.on(MENDER_MENU_CHANNEL, (_event, command: MenuCommand) => {
  if (menued) menued(command);
  else heldMenu = command;
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
  /* Which session a clicked notification wants him standing in. */
  attend: (to: (task: string) => void) => {
    attended = to;
    if (heldAttend) {
      to(heldAttend);
      heldAttend = null;
    }
  },
  /* Quitting with the fire still lit: what it costs, and the second press. */
  quitCost: (to: (n: number) => void) => {
    quitCost = to;
  },
  confirmQuit: () => ipcRenderer.send(MENDER_CONFIRM_QUIT_CHANNEL),
  /* What the native app menu asked for. */
  menu: (to: (command: MenuCommand) => void) => {
    menued = to;
    if (heldMenu) {
      to(heldMenu);
      heldMenu = null;
    }
  },
  /* Taking something off the board. The host's own clipboard rather than the
     browser's, because the browser's needs a secure page and a packaged
     village is loaded off the disk. */
  keep: (text: string) => clipboard.writeText(text),
  /* Out to the real world. A checkout is a folder on this machine and some of
     what you want to do with one is not this app's job: opening it in whatever
     the machine opens folders with, or showing it where it actually is. */
  openIt: (path: string) => void shell.openPath(path),
  showIt: (path: string) => shell.showItemInFolder(path),
});
