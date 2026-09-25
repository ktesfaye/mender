import {
  awaitWirePort,
  client,
  connect,
  domPortTransport,
  type ContractClient,
  type DomPortLike,
} from '@emdash/wire/rpc';
import { MENDER_WIRE_CHANNEL, type MenuCommand, type Watching } from '@shared/channels';
import { menderWireContract, type menderDomainContracts } from '@shared/contract';

declare global {
  interface Window {
    mender: {
      requestWirePort: () => Promise<void>;
      /** Where a dropped file came from on this machine, or '' if nowhere. */
      pathOf: (file: File) => string;
      /** Put something on this machine's clipboard. */
      keep: (text: string) => void;
      /** Whether anybody can see the village, which only the host knows. */
      watching: (to: (now: Watching) => void) => void;
      /** Which session a clicked notification wants him standing in. */
      attend: (to: (task: string) => void) => void;
      /** How many villagers are still lit, named before a quit happens. */
      quitCost: (to: (n: number) => void) => void;
      /** The second press: quit anyway. */
      confirmQuit: () => void;
      /** What the native app menu asked for. */
      menu: (to: (command: MenuCommand) => void) => void;
      /** What happened while he was away, said once when he comes back. */
      missed: (to: (lines: string[]) => void) => void;
      /** Open a folder in whatever this machine opens folders with. */
      openIt: (path: string) => void;
      /** Show it where it actually is, which is a different question. */
      showIt: (path: string) => void;
    };
  }
}

export type MenderClient = ContractClient<typeof menderDomainContracts>;

let cached: Promise<MenderClient> | null = null;

/**
 * The village's one piece of host-owned wire code: acquire the port over the
 * preload bridge, then hand back the typed client everything else calls.
 */
export function wire(): Promise<MenderClient> {
  cached ??= (async () => {
    const portPromise = awaitWirePort(window, { channel: MENDER_WIRE_CHANNEL });
    await window.mender.requestWirePort();
    const connection = connect(domPortTransport((await portPromise) as DomPortLike));
    return client(menderWireContract, connection);
  })();
  return cached;
}
