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
}

const KEY = 'app';
const FALLBACK = 'claude';
const NO_KIT: LastKit = { model: null, mode: null };

interface Stored {
  defaultHand?: string;
  perAgent?: Record<string, { model?: string | null; mode?: string | null }>;
}

export function createAppSettings(runtimes: MenderRuntimes): AppSettings {
  const store = createJsonFileKeyValueStore({ path: join(userDataDir(), 'app-settings.json') });

  const stored = async (): Promise<Stored> => {
    const loaded = await store.get(KEY);
    return loaded.success && loaded.data && typeof loaded.data === 'object'
      ? (loaded.data as Stored)
      : {};
  };

  const rememberKit = async (agent: string, patch: { model?: string; mode?: string }): Promise<void> => {
    const now = await stored();
    const perAgent = { ...now.perAgent };
    perAgent[agent] = { ...perAgent[agent], ...patch };
    await store.set(KEY, { ...now, perAgent } as unknown as never);
  };

  return {
    async defaultHand() {
      return (await stored()).defaultHand ?? FALLBACK;
    },

    async setDefaultHand(id) {
      const now = await stored();
      await store.set(KEY, { ...now, defaultHand: id } as unknown as never);
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
