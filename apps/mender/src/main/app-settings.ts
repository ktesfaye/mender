import { join } from 'node:path';
import { createJsonFileKeyValueStore } from '@emdash/core/primitives/kv/node';
import { pluginRegistry } from '@emdash/plugins/agents';
import { ReplicaState } from '@emdash/wire/live';
import { app } from 'electron';
import type { MenderRuntimes } from './runtimes';

/**
 * The app's own settings — the windmill. Not a project's: what agent a fresh
 * session starts with by default, and anything else that is about this
 * install of Mender rather than any one checkout.
 *
 * Small on purpose, and meant to grow the way projects.ts did: this is ours,
 * not a port of Emdash's thirteen settings pages.
 */
export interface Hand {
  id: string;
  name: string;
  here: boolean;
}

/** What an agent was last asked to think with, on whatever session asked. */
export interface LastKit {
  model: string | null;
  mode: string | null;
}

/** What this machine hands an agent's own CLI beyond its ordinary command:
    extra arguments split the plain way a shell would, and environment
    variables set only for it. Read into a session's own terminal — the one
    runtime that actually takes a built command apart — so `ps` on that
    process shows exactly what is set here. */
export interface ProviderConfig {
  extraArgs: string[];
  env: Record<string, string>;
}

const NO_PROVIDER_CONFIG: ProviderConfig = { extraArgs: [], env: {} };

export interface AppSettings {
  /** Whoever a fresh session starts with. Falls back to Claude Code. */
  defaultHand(): Promise<string>;
  setDefaultHand(id: string): Promise<string>;
  /** Every agent Mender knows how to speak to, and whether it is installed. */
  hands(): Promise<Hand[]>;
  /** The model and mode a fresh session with this agent starts on. */
  lastKit(agent: string): Promise<LastKit>;
  rememberModel(agent: string, model: string): Promise<void>;
  rememberMode(agent: string, mode: string): Promise<void>;
  /** What this machine hands that agent's own CLI beyond its ordinary
      command, for its next terminal session. */
  providerConfig(agent: string): Promise<ProviderConfig>;
  setExtraArgs(agent: string, extraArgs: string): Promise<ProviderConfig>;
  setEnvVar(agent: string, key: string, value: string): Promise<ProviderConfig>;
  removeEnvVar(agent: string, key: string): Promise<ProviderConfig>;
}

const KEY = 'app';
const FALLBACK = 'claude';
const NO_KIT: LastKit = { model: null, mode: null };

interface Stored {
  defaultHand?: string;
  perAgent?: Record<string, { model?: string | null; mode?: string | null }>;
  providers?: Record<string, { extraArgs?: string; env?: Record<string, string> }>;
}

export function createAppSettings(runtimes: MenderRuntimes): AppSettings {
  const store = createJsonFileKeyValueStore({ path: join(userDataDir(), 'app-settings.json') });

  const stored = async (): Promise<Stored> => {
    const loaded = await store.get(KEY);
    return loaded.success && loaded.data && typeof loaded.data === 'object'
      ? (loaded.data as Stored)
      : {};
  };

  /* Every write here is read-modify-write on one JSON file, and the windmill
     can fire two of them in the same breath — an extra argument saved on
     blur and an environment variable added a moment later. Queued onto the
     same chain, so the second write always starts from what the first one
     actually landed rather than from underneath it. */
  let queue: Promise<unknown> = Promise.resolve();
  const mutate = async (patch: (now: Stored) => Stored): Promise<Stored> => {
    const next = queue.then(async () => {
      const now = await stored();
      const patched = patch(now);
      await store.set(KEY, patched as unknown as never);
      return patched;
    });
    queue = next.catch(() => {});
    return next;
  };

  const rememberKit = async (agent: string, patch: { model?: string; mode?: string }): Promise<void> => {
    await mutate((now) => {
      const perAgent = { ...now.perAgent };
      perAgent[agent] = { ...perAgent[agent], ...patch };
      return { ...now, perAgent };
    });
  };

  const providerConfigOf = async (agent: string): Promise<ProviderConfig> => {
    const held = (await stored()).providers?.[agent];
    if (!held) return NO_PROVIDER_CONFIG;
    return {
      extraArgs: held.extraArgs?.trim() ? held.extraArgs.trim().split(/\s+/) : [],
      env: held.env ?? {},
    };
  };

  return {
    async defaultHand() {
      return (await stored()).defaultHand ?? FALLBACK;
    },

    async setDefaultHand(id) {
      await mutate((now) => ({ ...now, defaultHand: id }));
      return id;
    },

    async lastKit(agent) {
      const held = (await stored()).perAgent?.[agent];
      if (!held) return NO_KIT;
      return { model: held.model ?? null, mode: held.mode ?? null };
    },

    async rememberModel(agent, model) {
      await rememberKit(agent, { model });
    },

    async rememberMode(agent, mode) {
      await rememberKit(agent, { mode });
    },

    providerConfig: providerConfigOf,

    async setExtraArgs(agent, extraArgs) {
      await mutate((now) => {
        const providers = { ...now.providers };
        providers[agent] = { ...providers[agent], extraArgs: extraArgs.trim() };
        return { ...now, providers };
      });
      return providerConfigOf(agent);
    },

    async setEnvVar(agent, key, value) {
      await mutate((now) => {
        const providers = { ...now.providers };
        const env = { ...providers[agent]?.env, [key]: value };
        providers[agent] = { ...providers[agent], env };
        return { ...now, providers };
      });
      return providerConfigOf(agent);
    },

    async removeEnvVar(agent, key) {
      await mutate((now) => {
        const providers = { ...now.providers };
        const env = { ...providers[agent]?.env };
        delete env[key];
        providers[agent] = { ...providers[agent], env };
        return { ...now, providers };
      });
      return providerConfigOf(agent);
    },

    async hands() {
      const state = new ReplicaState(runtimes.host.snapshot.state(undefined, 'current'), {
        onChange: () => {},
      });
      await state.ready;
      const value = state.current();
      await state.dispose();
      const here = Object.fromEntries(
        Object.entries(value.dependencies).map(([id, view]) => [id, view.status === 'available'])
      );
      return pluginRegistry
        .getAll()
        .filter((plugin) => plugin.capabilities.acp.kind === 'supported')
        .map((plugin) => ({
          id: plugin.metadata.id,
          name: plugin.metadata.name,
          here: here[plugin.metadata.id] ?? false,
        }))
        .sort((a, b) => Number(b.here) - Number(a.here) || a.name.localeCompare(b.name));
    },
  };
}

/** Where Mender keeps its own state on this machine. */
function userDataDir(): string {
  return process.env.MENDER_DATA_DIR ?? app.getPath('userData');
}
