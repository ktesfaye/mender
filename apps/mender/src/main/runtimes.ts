import { join } from 'node:path';
import { DEFAULT_WATCHER_EXCLUDE } from '@emdash/core/primitives/exclusion-policy/api';
import { createJsonFileKeyValueStore } from '@emdash/core/primitives/kv/node';
import { acpApiContract } from '@emdash/core/runtimes/acp/api';
import { acpWorkerSpec } from '@emdash/core/runtimes/acp/node';
import { agentConfigContract } from '@emdash/core/runtimes/agent-config/api';
import { agentConfigWorkerSpec } from '@emdash/core/runtimes/agent-config/node';
import { conversationsContract } from '@emdash/core/runtimes/conversations/api';
import { conversationsWorkerSpec } from '@emdash/core/runtimes/conversations/node';
import { fileSearchContract } from '@emdash/core/runtimes/file-search/api';
import { fileSearchWorkerSpec } from '@emdash/core/runtimes/file-search/node';
import { filesContract } from '@emdash/core/runtimes/files/api';
import { filesWorkerSpec } from '@emdash/core/runtimes/files/node';
import { gitContract } from '@emdash/core/runtimes/git/api';
import { gitWorkerSpec } from '@emdash/core/runtimes/git/node';
import { hostSettingsWorkerSpec } from '@emdash/core/runtimes/host-settings/node';
import { resourceUsageContract } from '@emdash/core/runtimes/resource-usage/api';
import { resourceUsageComponent } from '@emdash/core/runtimes/resource-usage/node';
import { scriptsWorkerSpec } from '@emdash/core/runtimes/scripts/node';
import { terminalsContract } from '@emdash/core/runtimes/terminals/api';
import { terminalsWorkerSpec } from '@emdash/core/runtimes/terminals/node';
import { tuiAgentsContract } from '@emdash/core/runtimes/tui-agents/api';
import { tuiAgentsWorkerSpec } from '@emdash/core/runtimes/tui-agents/node';
import { workspaceRegistryContract } from '@emdash/core/runtimes/workspace-registry/api';
import { workspaceRegistryWorkerSpec } from '@emdash/core/runtimes/workspace-registry/node';
import { buildDescriptorFromProvider } from '@emdash/core/services/agent-plugins/api/plugins';
import { NodeExecutionContext } from '@emdash/core/services/exec/api';
import { fsWatchWorkerSpec } from '@emdash/core/services/fs-watch/node';
import { hostDependenciesContract } from '@emdash/core/services/host-dependencies/api';
import {
  CORE_DEPENDENCIES,
  createHostDependenciesComponent,
} from '@emdash/core/services/host-dependencies/node';
import {
  createShellEnvManager,
  createUserShellEnvController,
  type ShellEnvManager,
} from '@emdash/core/services/shell-env/node';
import { pluginRegistry } from '@emdash/plugins/agents';
import type { Scope } from '@emdash/shared/concurrency';
import {
  createController,
  forwardContractImpl,
  queuedClient,
  type Controller,
} from '@emdash/wire/rpc';
import { createWireWorkerHost } from '@emdash/wire/worker';
import { childProcessSpawner } from '@emdash/wire/worker/node';
import { pullRequestsContract } from '@upstream/services/pull-requests/api/contract';
import { pullRequestsComponent } from '@upstream/services/pull-requests/node';
import { app } from 'electron';
import { createGitHubAuth } from './github';
import { menderWorkerPath } from './worker-paths';

/**
 * Starts the core runtime workers Mender needs.
 *
 * Each runtime is the same subprocess emdash runs: the component specs and
 * entry files live in @emdash/core, so this is wiring, not a reimplementation.
 *
 * The shape of it is a dependency chain, and the workspace registry is at the
 * end of it — it is the one that cuts worktrees, and it will not start until
 * the session runtimes it has to be able to sweep are up, because tearing a
 * workspace down means killing whatever was running inside it.
 */
export interface MenderRuntimes {
  /** Wire controllers, keyed by the domain name the renderer-facing contract uses. */
  controllers: Record<string, Controller>;
  /** The git runtime, for main-process code that needs to ask it something. */
  git: ReturnType<typeof gitClient>;
  /** What is in a checkout, by name, so a file can be named on the line. */
  files: ReturnType<typeof filesClient>;
  /** The files themselves: what is in a folder, and what is in a file. */
  disk: ReturnType<typeof diskClient>;
  /** Real shells, which outlive the window they were opened from. */
  terminals: ReturnType<typeof terminalsClient>;
  /** Provider CLIs running raw in a real terminal, as their own kind of session. */
  tuiAgents: ReturnType<typeof tuiAgentsClient>;
  /** What is open against the other end, and what its checks think of it. */
  pulls: ReturnType<typeof pullsClient>;
  /** The workspace registry: the thing that makes a worktree exist. */
  workspaces: ReturnType<typeof workspacesClient>;
  /** The host's index of conversations: who has ever been asked to do what. */
  conversations: ReturnType<typeof conversationsClient>;
  /** The agent sessions themselves. What a villager actually is. */
  acp: ReturnType<typeof acpClient>;
  /** What each agent is configured with: its servers and what it has been taught. */
  agentConfig: ReturnType<typeof agentConfigClient>;
  /** What is installed on this machine, which says who can work at all. */
  host: HostDependencies;
  /**
   * The resolved login-shell environment, for the handful of places Mender
   * spawns `git` or `gh` itself rather than through a worker. A window opened
   * from the Dock or Finder starts from launchd's bare environment, with none
   * of the PATH a real shell would have built up, and `process.env` alone is
   * not enough to fix that: it only carries what this happens to have been
   * patched to by the time something asks.
   */
  env: Pick<ShellEnvManager, 'current'>;
}

/** The in-process host-dependency component's own client. */
type HostDependencies = ReturnType<
  ReturnType<typeof createHostDependenciesComponent>['create']
>['client'];

function gitClient(ready: Promise<unknown>) {
  return queuedClient(gitContract, () => ready as Promise<never>);
}

function workspacesClient(ready: Promise<unknown>) {
  return queuedClient(workspaceRegistryContract, () => ready as Promise<never>);
}

function filesClient(ready: Promise<unknown>) {
  return queuedClient(fileSearchContract, () => ready as Promise<never>);
}

function terminalsClient(ready: Promise<unknown>) {
  return queuedClient(terminalsContract, () => ready as Promise<never>);
}

function tuiAgentsClient(ready: Promise<unknown>) {
  return queuedClient(tuiAgentsContract, () => ready as Promise<never>);
}

function pullsClient(ready: Promise<unknown>) {
  return queuedClient(pullRequestsContract, () => ready as Promise<never>);
}

function diskClient(ready: Promise<unknown>) {
  return queuedClient(filesContract, () => ready as Promise<never>);
}

function conversationsClient(ready: Promise<unknown>) {
  return queuedClient(conversationsContract, () => ready as Promise<never>);
}

function acpClient(ready: Promise<unknown>) {
  return queuedClient(acpApiContract, () => ready as Promise<never>);
}

function agentConfigClient(ready: Promise<unknown>) {
  return queuedClient(agentConfigContract, () => ready as Promise<never>);
}

export function startRuntimes(scope: Scope): MenderRuntimes {
  const workerScope = scope.child('runtimes');
  const host = createWireWorkerHost({
    scope: workerScope,
    processSpawner: childProcessSpawner(),
  });
  const data = (name: string): string => join(userDataDir(), name);

  const shellEnv = createShellEnvManager();
  const userEnv = createUserShellEnvController(() => shellEnv.current());

  // Not a worker: what is installed on this machine is asked for in-process,
  // and every runtime that has to find a binary is handed this resolver.
  const hostDependencies = createHostDependenciesComponent({
    store: createJsonFileKeyValueStore({ path: data('host-dependencies.json') }),
    exec: new NodeExecutionContext({
      // A window opened from the Finder starts on launchd's bare PATH, so
      // nothing is looked for until the login shell's own PATH has landed:
      // a session woken in that first second otherwise finds no claude.
      env: async () => {
        await shellEnv.current();
        return process.env;
      },
      refreshShellEnv: () => shellEnv.refresh(),
    }),
  }).create({
    scope: workerScope,
    dependencies: {},
    config: {
      hostId: 'local',
      definitions: [
        ...CORE_DEPENDENCIES,
        ...pluginRegistry.getAll().map(buildDescriptorFromProvider),
      ],
    },
  });
  const resolver = hostDependencies.client.resolver;

  // What this machine is spending: CPU, memory and disk, sampled on demand
  // rather than a worker of its own — the sample is a few syscalls, not
  // something worth a subprocess.
  const resourceUsage = resourceUsageComponent.create({
    scope: workerScope,
    dependencies: {},
    config: {},
  });

  const watcherReady = observed(
    host
      .create(...fsWatchWorkerSpec({ executable: menderWorkerPath('fs-watch'), env: process.env }))
      .ready()
  );

  const conversationsReady = observed(
    host
      .create(
        ...conversationsWorkerSpec({
          executable: menderWorkerPath('conversations'),
          env: process.env,
          databasePath: data('conversations.db'),
        })
      )
      .ready()
  );

  const terminalsReady = observed(
    host
      .create(
        ...terminalsWorkerSpec({
          executable: menderWorkerPath('terminals'),
          env: process.env,
          userEnv,
          // A terminal in the village outlives whoever is looking at it: the
          // building it belongs to is still standing when you walk away.
          lifecycle: { terminal: { kind: 'always' } },
        })
      )
      .ready()
  );

  const scriptsReady = observed(
    host
      .create(
        ...scriptsWorkerSpec({
          executable: menderWorkerPath('scripts'),
          env: process.env,
          userEnv,
        })
      )
      .ready()
  );

  const hostSettingsReady = observed(
    host
      .create(
        ...hostSettingsWorkerSpec({
          executable: menderWorkerPath('host-settings'),
          env: process.env,
          settingsPath: data('host-settings.json'),
        })
      )
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
          dependencies: { watcher, hostDependencies: resolver, userEnv },
        })
      );
      return await worker.ready();
    })
  );

  // The index of what is in a checkout. It takes the watcher for the same
  // reason git does: a worktree somebody is working in changes under it.
  const filesReady = observed(
    watcherReady.then(async (watcher) => {
      const worker = host.create(
        ...fileSearchWorkerSpec({
          executable: menderWorkerPath('file-search'),
          env: process.env,
          dependencies: { watcher, userEnv },
          databasePath: data('file-search.db'),
        })
      );
      return await worker.ready();
    })
  );

  // Reading and writing the files themselves, which is a different question
  // from finding them by name and answered by a different runtime.
  const diskReady = observed(
    watcherReady.then(async (watcher) => {
      const worker = host.create(
        ...filesWorkerSpec({
          executable: menderWorkerPath('files'),
          env: process.env,
          dependencies: { watcher },
          /* Watching a checkout recursively means watching everything in it,
             and what is in a checkout is mostly node_modules and git's object
             store. Left in, the first walk into a project hangs. */
          watchIgnore: [...DEFAULT_WATCHER_EXCLUDE],
        })
      );
      return await worker.ready();
    })
  );

  /* Pull requests. Who the village is to GitHub is answered in-process by
     asking the `gh` on this machine for the token it already holds, rather
     than by keeping a second place to be signed in. */
  const pullsReady = observed(
    host
      .create(pullRequestsComponent, {
        name: 'pull-requests',
        executable: menderWorkerPath('pull-requests'),
        env: process.env,
        dependencies: { githubAuth: createGitHubAuth(shellEnv) },
        config: { databasePath: data('pull-requests.db'), incrementalIntervalMs: 60_000 },
      })
      .ready()
  );

  const acpReady = observed(
    conversationsReady.then(async (conversations) => {
      const worker = host.create(
        ...acpWorkerSpec({
          pluginRegistry,
          executable: menderWorkerPath('acp'),
          env: process.env,
          dependencies: { hostDependencies: resolver, conversations, userEnv },
          attachmentsDir: data('acp-attachments'),
          intentsFilePath: data('acp-intents.json'),
        })
      );
      return await worker.ready();
    })
  );

  const agentConfigReady = observed(
    host
      .create(
        ...agentConfigWorkerSpec({
          pluginRegistry,
          executable: menderWorkerPath('agent-config'),
          env: process.env,
          dependencies: { hostDependencies: resolver, userEnv },
        })
      )
      .ready()
  );

  const tuiAgentsReady = observed(
    conversationsReady.then(async (conversations) => {
      const worker = host.create(
        ...tuiAgentsWorkerSpec({
          pluginRegistry,
          executable: menderWorkerPath('tui-agents'),
          env: process.env,
          dependencies: { hostDependencies: resolver, conversations, userEnv },
          intentsFilePath: data('tui-agent-intents.json'),
        })
      );
      return await worker.ready();
    })
  );

  const workspacesReady = observed(
    Promise.all([
      watcherReady,
      acpReady,
      terminalsReady,
      tuiAgentsReady,
      scriptsReady,
      hostSettingsReady,
    ]).then(async ([watcher, acp, terminals, tuiAgents, scripts, hostSettings]) => {
      const worker = host.create(
        ...workspaceRegistryWorkerSpec({
          executable: menderWorkerPath('workspace-registry'),
          env: process.env,
          dependencies: { watcher, acp, terminals, tuiAgents, scripts, hostSettings, userEnv },
          databasePath: data('workspaces.db'),
        })
      );
      return await worker.ready();
    })
  );

  // Queued clients accept calls before their worker finishes booting, so the
  // window opens and talks to git without waiting on a readiness gate.
  const git = gitClient(gitReady);
  const workspaces = workspacesClient(workspacesReady);
  const disk = diskClient(diskReady);
  const terminals = terminalsClient(terminalsReady);
  const tuiAgents = tuiAgentsClient(tuiAgentsReady);
  const pulls = pullsClient(pullsReady);
  return {
    controllers: {
      git: createController(gitContract, forwardContractImpl(gitContract, git)),
      files: createController(filesContract, forwardContractImpl(filesContract, disk)),
      terminals: createController(
        terminalsContract,
        forwardContractImpl(terminalsContract, terminals)
      ),
      tuiAgents: createController(
        tuiAgentsContract,
        forwardContractImpl(tuiAgentsContract, tuiAgents)
      ),
      pulls: createController(
        pullRequestsContract,
        forwardContractImpl(pullRequestsContract, pulls)
      ),
      workspaces: createController(
        workspaceRegistryContract,
        forwardContractImpl(workspaceRegistryContract, workspaces)
      ),
      resourceUsage: createController(
        resourceUsageContract,
        forwardContractImpl(resourceUsageContract, resourceUsage.client)
      ),
      host: createController(
        hostDependenciesContract,
        forwardContractImpl(hostDependenciesContract, hostDependencies.client)
      ),
    },
    git,
    files: filesClient(filesReady),
    disk,
    terminals,
    tuiAgents,
    pulls,
    workspaces,
    conversations: conversationsClient(conversationsReady),
    acp: acpClient(acpReady),
    agentConfig: agentConfigClient(agentConfigReady),
    host: hostDependencies.client,
    env: shellEnv,
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
