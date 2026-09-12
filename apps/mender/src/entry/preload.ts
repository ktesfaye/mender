import { requestWirePort, type WindowLike } from '@emdash/wire/rpc';
import { contextBridge, ipcRenderer } from 'electron';
import { MENDER_WIRE_CHANNEL } from '../shared/channels';

// Typechecked as node (no DOM lib) but runs in the renderer; declare `window`
// with the structural type wire needs.
declare const window: WindowLike;

contextBridge.exposeInMainWorld('mender', {
  requestWirePort: () => requestWirePort({ ipcRenderer, window }, { channel: MENDER_WIRE_CHANNEL }),
});
