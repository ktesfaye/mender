import { execFile, spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { requestWirePort, type WindowLike } from '@emdash/wire/rpc';
import { clipboard, contextBridge, ipcRenderer, shell, webFrame, webUtils } from 'electron';
import {
  MENDER_ATTEND_CHANNEL,
  MENDER_CONFIRM_QUIT_CHANNEL,
  MENDER_GRIP_CHANNEL,
  MENDER_MENU_CHANNEL,
  MENDER_MISSED_CHANNEL,
  MENDER_QUIT_COST_CHANNEL,
  MENDER_PICK_FOLDER_CHANNEL,
  MENDER_START_DRAG_CHANNEL,
  MENDER_TABLE_CHANNEL,
  MENDER_WATCH_CHANNEL,
  MENDER_WIRE_CHANNEL,
  type Grip,
  type MenuCommand,
  type TableAsk,
  type Watching,
} from '../shared/channels';

// Typechecked as node (no DOM lib) but runs in the renderer; declare `window`
// with the structural type wire needs.
declare const window: WindowLike;

/**
 * Opening something in the owner's own editor, next to "show in Finder".
 *
 * `$VISUAL`/`$EDITOR` wins when it names a GUI editor's own CLI — a terminal
 * editor set there (vim, nano) is not something this app can hand a window
 * to. Failing that, the first of Cursor, VS Code or Zed that is actually
 * installed opens it, in that order, since that is the order most of this
 * codebase's own commits were written in.
 */
const GUI_EDITOR_COMMANDS = ['code', 'cursor', 'zed', 'subl', 'idea', 'webstorm'];
const FALLBACK_EDITORS = ['Cursor', 'Visual Studio Code', 'Zed'];

function guiEditorCommand(): string | null {
  const said = process.env.VISUAL || process.env.EDITOR || '';
  const first = said.trim().split(/\s+/)[0];
  if (!first) return null;
  const base = first.split('/').pop() ?? first;
  return GUI_EDITOR_COMMANDS.includes(base) ? said.trim() : null;
}

async function firstInstalledApp(): Promise<string | null> {
  const { access } = await import('node:fs/promises');
  const { constants } = await import('node:fs');
  for (const name of FALLBACK_EDITORS) {
    for (const root of [`/Applications/${name}.app`, `${homedir()}/Applications/${name}.app`]) {
      try {
        await access(root, constants.F_OK);
        return name;
      } catch {
        // Not there; try the next place, then the next editor.
      }
    }
  }
  return null;
}

async function openInEditor(path: string): Promise<void> {
  const said = guiEditorCommand();
  if (said) {
    const parts = said.split(/\s+/);
    const cmd = parts[0] as string;
    spawn(cmd, [...parts.slice(1), path], { detached: true, stdio: 'ignore' }).unref();
    return;
  }
  const app = await firstInstalledApp();
  if (!app) return;
  execFile('open', ['-a', app, path], () => {
    // Nothing to do with a failure here: there is no line on the board that
    // reports it, the same as "open it properly" reports nothing either.
  });
}

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
let attended: ((task: string, first?: string) => void) | null = null;
let heldAttend: [string, string | undefined] | null = null;
ipcRenderer.on(MENDER_ATTEND_CHANNEL, (_event, task: string, first?: string) => {
  if (attended) attended(task, first);
  else heldAttend = [task, first];
});

/* A design a session wants laid on the drafting table. */
let tabled: ((ask: TableAsk) => void) | null = null;
let heldTable: TableAsk | null = null;
ipcRenderer.on(MENDER_TABLE_CHANNEL, (_event, ask: TableAsk) => {
  if (tabled) tabled(ask);
  else heldTable = ask;
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

/* What happened while he was away, before the page has asked. */
let missed: ((lines: string[]) => void) | null = null;
let heldMissed: string[] | null = null;
ipcRenderer.on(MENDER_MISSED_CHANNEL, (_event, lines: string[]) => {
  if (missed) missed(lines);
  else heldMissed = lines;
});

contextBridge.exposeInMainWorld('mender', {
  requestWirePort: () => requestWirePort({ ipcRenderer, window }, { channel: MENDER_WIRE_CHANNEL }),
  /* How many screen points one of the page's pixels is, ⌘+ and ⌘− having moved it. */
  zoom: () => webFrame.getZoomFactor(),
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
  attend: (to: (task: string, first?: string) => void) => {
    attended = to;
    if (heldAttend) {
      to(...heldAttend);
      heldAttend = null;
    }
  },
  /* A design a session wants laid on the drafting table. */
  table: (to: (ask: TableAsk) => void) => {
    tabled = to;
    if (heldTable) {
      to(heldTable);
      heldTable = null;
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
  /* What happened while he was away. */
  missed: (to: (lines: string[]) => void) => {
    missed = to;
    if (heldMissed) {
      to(heldMissed);
      heldMissed = null;
    }
  },
  /* Taking something off the board. The host's own clipboard rather than the
     browser's, because the browser's needs a secure page and a packaged
     village is loaded off the disk. */
  keep: (text: string) => clipboard.writeText(text),
  /* Out to the real world. A checkout is a folder on this machine and some of
     what you want to do with one is not this app's job: opening it in whatever
     the machine opens folders with, or showing it where it actually is. */
  home: homedir(),
  openIt: (path: string) => void shell.openPath(path),
  showIt: (path: string) => shell.showItemInFolder(path),
  openInEditor: (path: string) => void openInEditor(path),
  /* Carrying a file out of the board and onto the Mac. Only the main process
     can start an OS-level drag, so this just names the path. */
  startDrag: (path: string) => ipcRenderer.send(MENDER_START_DRAG_CHANNEL, path),
  /* A folder, picked with the native dialog, for a setting that wants a path. */
  pickFolder: (title: string): Promise<string | null> =>
    ipcRenderer.invoke(MENDER_PICK_FOLDER_CHANNEL, title),
  /* Holding the window by its top, since the title bar it would have had is hidden. */
  grip: (grip: Grip) => ipcRenderer.send(MENDER_GRIP_CHANNEL, grip),
  /* A link an agent wrote, out to whatever the machine reads the web with. */
  openLink: (url: string) => void shell.openExternal(url),
  /* The one file this app writes unasked, always outside any checkout so it
     never lands as an uncommitted file on a branch nobody meant to touch.
     `MENDER_EXPORT_DIR` overrides it for a dev copy; the real app has no such
     variable set, so it always lands in the real Downloads folder. */
  saveExport: async (name: string, content: string): Promise<string> => {
    const override = process.env.MENDER_EXPORT_DIR;
    const dir = override
      ? isAbsolute(override)
        ? override
        : join(process.cwd(), override)
      : join(homedir(), 'Downloads');
    await mkdir(dir, { recursive: true });
    const path = join(dir, name);
    await writeFile(path, content, 'utf8');
    return path;
  },
});
