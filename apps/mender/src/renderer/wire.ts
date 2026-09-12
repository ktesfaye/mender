import {
  awaitWirePort,
  client,
  connect,
  domPortTransport,
  type ContractClient,
  type DomPortLike,
} from '@emdash/wire/rpc';
import { MENDER_WIRE_CHANNEL } from '@shared/channels';
import { menderDomainContracts, menderWireContract } from '@shared/contract';

declare global {
  interface Window {
    mender: { requestWirePort: () => Promise<void>; launchedFrom: string };
  }
}

type MenderClient = ContractClient<typeof menderDomainContracts>;

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
