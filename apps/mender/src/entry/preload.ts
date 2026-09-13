import { requestWirePort, type WindowLike } from '@emdash/wire/rpc';
import { clipboard, contextBridge, ipcRenderer, webUtils } from 'electron';
import { MENDER_WIRE_CHANNEL } from '../shared/channels';

// Typechecked as node (no DOM lib) but runs in the renderer; declare `window`
// with the structural type wire needs.
declare const window: WindowLike;

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
  /* Taking something off the board. The host's own clipboard rather than the
     browser's, because the browser's needs a secure page and a packaged
     village is loaded off the disk. */
  keep: (text: string) => clipboard.writeText(text),
});
