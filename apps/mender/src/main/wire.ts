import type { Scope } from '@emdash/shared/concurrency';
import { exposeWireToWindows, type Controller } from '@emdash/wire/rpc';
import { ipcMain, MessageChannelMain } from 'electron';
import { MENDER_WIRE_CHANNEL } from '@shared/channels';

/** Serves the renderer's wire port, routing `domain.procedure` to its controller. */
export function installWire(scope: Scope, controllers: Record<string, Controller>): void {
  scope.add(
    exposeWireToWindows({ ipcMain, createMessageChannel }, createRoutingController(controllers), {
      channel: MENDER_WIRE_CHANNEL,
    })
  );
}

function createMessageChannel() {
  const channel = new MessageChannelMain();
  return { port1: channel.port1, port2: channel.port2 };
}

function createRoutingController(controllers: Record<string, Controller>): Controller {
  const route = (path: string) => {
    const separator = path.indexOf('.');
    const domain = separator === -1 ? path : path.slice(0, separator);
    const controller = controllers[domain];
    if (!controller) throw new Error(`Unknown wire domain '${domain}'`);
    return { controller, path: separator === -1 ? path : path.slice(separator + 1) };
  };

  return {
    async call(path, input, meta) {
      const routed = route(path);
      return await routed.controller.call(routed.path, input, meta);
    },
    resolveLive(topic) {
      const routed = route(topic);
      return routed.controller.resolveLive(routed.path);
    },
    acquireLive(topic) {
      const routed = route(topic);
      return routed.controller.acquireLive(routed.path);
    },
  };
}
