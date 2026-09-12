import { join } from 'node:path';
import { createJsonFileKeyValueStore } from '@emdash/core/primitives/kv/node';
import { gitContract } from '@emdash/core/runtimes/git/api';
import { gitWorkerSpec } from '@emdash/core/runtimes/git/node';
import { NodeExecutionContext } from '@emdash/core/services/exec/api';
import { fsWatchWorkerSpec } from '@emdash/core/services/fs-watch/node';
import {
  CORE_DEPENDENCIES,
  createHostDependenciesComponent,
} from '@emdash/core/services/host-dependencies/node';
import {
  createShellEnvManager,
  createUserShellEnvController,
} from '@emdash/core/services/shell-env/node';
import type { Scope } from '@emdash/shared/concurrency';
import {
  createController,
  forwardContractImpl,
  queuedClient,
  type Controller,
} from '@emdash/wire/rpc';
import { createWireWorkerHost } from '@emdash/wire/worker';
import { childProcessSpawner } from '@emdash/wire/worker/node';
import { app } from 'electron';
import { menderWorkerPath } from './worker-paths';

/**
 * Starts the core runtime workers Mender needs.
 *
 * Each runtime is the same subprocess emdash runs: the component specs and
 * entry files live in @emdash/core, so this is wiring, not a reimplementation.
 * Wave 0 starts the two the village needs to prove the seam (fs-watch backs
 * git's working-tree watches); the rest slot in beside them the same way.
 */
export interface MenderRuntimes {
  /** Wire controllers, keyed by the domain name the renderer-facing contract uses. */
  controllers: Record<string, Controller>;
  /** The git runtime, for main-process code that needs to ask it something. */
  git: ReturnType<typeof gitClient>;
}

function gitClient(ready: Promise<unknown>) {
  return queuedClient(gitContract, () => ready as Promise<never>);
}

export function startRuntimes(scope: Scope): MenderRuntimes {
  const workerScope = scope.child('runtimes');
  const host = createWireWorkerHost({
    scope: workerScope,
    processSpawner: childProcessSpawner(),
  });

  const shellEnv = createShellEnvManager();
  const userEnv = createUserShellEnvController(() => shellEnv.current());

  const hostDependencies = createHostDependenciesComponent({
    store: createJsonFileKeyValueStore({
      path: join(userDataDir(), 'host-dependencies.json'),
    }),
    exec: new NodeExecutionContext({
      env: process.env,
      refreshShellEnv: () => shellEnv.refresh(),
    }),
  }).create({
    scope: workerScope,
    dependencies: {},
    config: { hostId: 'local', definitions: [...CORE_DEPENDENCIES] },
  });

  const watcherReady = observed(
    host
      .create(...fsWatchWorkerSpec({ executable: menderWorkerPath('fs-watch'), env: process.env }))
      .ready()
  );

  // Git takes the watcher as a dependency, so it is created once the watcher's
  // client exists rather than at the same moment.
  const gitReady = observed(
    watcherReady.then(async (watcher) => {
      const worker = host.create(
        ...gitWorkerSpec({
          executable: menderWorkerPath('git'),
          env: process.env,
          dependencies: { watcher, hostDependencies: hostDependencies.client.resolver, userEnv },
        })
      );
      return await worker.ready();
    })
  );

  // Queued clients accept calls before their worker finishes booting, so the
  // window opens and talks to git without waiting on a readiness gate.
  const git = gitClient(gitReady);
  return {
    controllers: { git: createController(gitContract, forwardContractImpl(gitContract, git)) },
    git,
  };
}

/**
 * Keeps a readiness failure from surfacing as an unhandled rejection. Callers
 * still see the failure: every queued call against that client rejects.
 */
function observed<T>(ready: Promise<T>): Promise<T> {
  ready.catch((error: unknown) => {
    process.stderr.write(`[runtimes] worker readiness failed: ${String(error)}\n`);
  });
  return ready;
}

/** Where Mender keeps its own state on this machine. */
function userDataDir(): string {
  return process.env.MENDER_DATA_DIR ?? app.getPath('userData');
}
