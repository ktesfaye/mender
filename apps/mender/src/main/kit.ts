import { readdir, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { McpServer } from '@emdash/core/primitives/mcp/api';
import type { SessionConfigState, SessionMcpServer } from '@emdash/core/runtimes/acp/api';
import { pluginRegistry } from '@emdash/plugins/agents';
import { ReplicaState } from '@emdash/wire/live';
import { cell, type Cell } from '@emdash/wire/state';
import type { Choice, Hand, Kit, Knack, Tool } from '@shared/agents';
import type { MenderRuntimes } from './runtimes';
import type { Tasks } from './tasks';

/**
 * What a session works with.
 *
 * Who is doing the work, what they are thinking with, what they can reach out
 * in the world, and what they have been taught. All four are real settings on
 * a real agent process, and all four are read back from the thing itself
 * rather than from anything the village remembers.
 *
 * The models and the modes only exist once the agent is awake: they are what
 * the CLI itself says it offers over the protocol when it starts, not a list
 * anybody here keeps. So a session nobody has spoken to yet has a name and a
 * face and nothing else, and the card says so.
 */

/** What an empty card says while there is nothing to put on it. */
const NOTHING: Kit = {
  hand: 'claude',
  hands: [],
  model: null,
  models: [],
  mode: null,
  modes: [],
  effort: null,
  efforts: [],
  tools: [],
  knacks: [],
  orders: [],
  awake: false,
};

export interface Kits {
  /** One session's card, for the board to subscribe to. */
  kit(task: string): Cell<Kit>;
  /** The conversation a session is holding, once it has one. */
  settle(task: string, conversation: string): Promise<void>;
  choose(task: string, what: 'hand' | 'model' | 'mode' | 'effort', id: string): Promise<Wrong>;
  tool(task: string, name: string, on: boolean): Promise<Wrong>;
  forget(task: string): Promise<void>;
  dispose(): Promise<void>;
}

type Wrong =
  | { success: true; data: void }
  | { success: false; error: { kind: 'refused'; because: string } };

const fine = { success: true as const, data: undefined };
const refused = (because: string): Wrong => ({
  success: false,
  error: { kind: 'refused', because },
});

export function createKits(
  runtimes: MenderRuntimes,
  tasks: Tasks,
  /** Called when who works here changes, because that is a different villager. */
  moveOut: (task: string) => Promise<void>
): Kits {
  const cards = new Map<string, Card>();
  /** Which agents are on this machine, kept current by the host itself. */
  let installed: Record<string, boolean> = {};
  const machine = new ReplicaState(runtimes.host.snapshot.state(undefined, 'current'), {
    onChange: (value) => {
      installed = Object.fromEntries(
        Object.entries(value.dependencies).map(([id, view]) => [id, view.status === 'available'])
      );
      for (const card of cards.values()) card.redraw();
    },
  });

  const cardOf = (task: string): Card => {
    let card = cards.get(task);
    if (!card) {
      card = new Card(task, runtimes, tasks, () => installed);
      cards.set(task, card);
      void card.redraw();
    }
    return card;
  };

  return {
    kit: (task) => cardOf(task).state,
    settle: (task, conversation) => cardOf(task).settle(conversation),

    async choose(task, what, id) {
      const card = cardOf(task);
      if (what === 'hand') {
        // Who works here is not a setting on a running session, it is a
        // different person. The one who was here leaves, and the next thing
        // said starts the new one in the same checkout.
        await tasks.rehand(task, id);
        await moveOut(task);
        await card.redraw();
        return fine;
      }
      const conversation = card.conversation;
      if (!conversation || !card.awake) return refused('nobody is working in here yet.');
      const done = await runtimes.acp.setOption({
        conversationId: conversation,
        key: what === 'model' ? 'model' : what === 'mode' ? 'mode' : 'effort',
        value: id,
      });
      if (!done.success) return refused(said(done.error));
      /* Remembered so the session starts on it again. The id is the live one
         the agent itself advertised, which is the only kind `launch` will
         take: the static list a plugin carries is spelled differently and is
         dropped on the floor without a word. */
      if (what === 'model') await tasks.remodel(task, id);
      return fine;
    },

    async tool(task, name, on) {
      const card = cardOf(task);
      const hand = await card.hand();
      const listed = await runtimes.agentConfig.listMcpForAgent({ providerId: hand });
      if (!listed.success) return refused(said(listed.error));
      const server = listed.data.servers.find((each) => each.name === name);
      if (!server) return refused(`${name} is not one of ${hand}'s.`);
      const saved = await runtimes.agentConfig.saveMcpServer({
        server: { ...server, enabled: on } as McpServer,
      });
      if (!saved.success) return refused(said(saved.error));
      await card.redraw();
      return fine;
    },

    async forget(task) {
      await cards.get(task)?.dispose();
      cards.delete(task);
    },

    async dispose() {
      await Promise.all([...cards.values()].map((card) => card.dispose()));
      cards.clear();
      await machine.dispose();
    },
  };
}

/** One session's card. */
class Card {
  readonly state: Cell<Kit>;
  conversation: string | undefined;

  private config: SessionConfigState | undefined;
  private servers: SessionMcpServer[] = [];
  private replicas: ReplicaState<unknown>[] = [];

  constructor(
    private readonly task: string,
    private readonly runtimes: MenderRuntimes,
    private readonly tasks: Tasks,
    private readonly installed: () => Record<string, boolean>
  ) {
    this.state = cell<Kit>(NOTHING, { name: `kit:${task}` });
  }

  get awake(): boolean {
    return Boolean(this.config?.modelOptions ?? this.config?.modeOptions);
  }

  async hand(): Promise<string> {
    const record = (await this.tasks.list()).find((each) => each.id === this.task);
    return record?.agent ?? 'claude';
  }

  async settle(conversation: string): Promise<void> {
    if (this.conversation === conversation) return;
    this.conversation = conversation;
    const model = this.runtimes.acp.session;
    const config = new ReplicaState<SessionConfigState>(
      model.state({ conversationId: conversation }, 'config'),
      {
        onChange: (value) => {
          this.config = value;
          void this.redraw();
        },
      }
    );
    const servers = new ReplicaState<SessionMcpServer[]>(
      model.state({ conversationId: conversation }, 'mcpServers'),
      {
        onChange: (value) => {
          this.servers = value;
          void this.redraw();
        },
      }
    );
    this.replicas = [config as ReplicaState<unknown>, servers as ReplicaState<unknown>];
    await Promise.all([config.ready, servers.ready]);
    this.config = config.current();
    this.servers = servers.current() ?? [];
    await this.redraw();
  }

  /** Put the card together out of everything that says something about it. */
  async redraw(): Promise<void> {
    const record = (await this.tasks.list()).find((each) => each.id === this.task);
    const hand = record?.agent ?? 'claude';
    const here = this.installed();

    const hands: Hand[] = pluginRegistry
      .getAll()
      .filter((plugin) => plugin.capabilities.acp.kind === 'supported')
      .map((plugin) => ({
        id: plugin.metadata.id,
        name: plugin.metadata.name,
        here: here[plugin.metadata.id] ?? false,
      }))
      .sort((a, b) => Number(b.here) - Number(a.here) || a.name.localeCompare(b.name));

    const [tools, knacks] = await Promise.all([this.toolsOf(hand), knacksFor(record?.path)]);
    const awake = Boolean(this.config?.modelOptions ?? this.config?.modeOptions);

    this.state.set({
      hand,
      hands,
      model: this.config?.modelOptions?.selected ?? null,
      models: choicesOf(this.config?.modelOptions?.available),
      mode: this.config?.modeOptions?.selected ?? null,
      modes: choicesOf(this.config?.modeOptions?.available),
      effort: this.config?.efforts?.selected ?? null,
      efforts: choicesOf(this.config?.efforts?.available),
      tools,
      knacks,
      orders: (this.config?.availableCommands ?? []).map((command) => ({
        name: command.name,
        about: command.description,
        ...(command.inputHint ? { takes: command.inputHint } : {}),
      })),
      awake,
    });
  }

  /**
   * What this agent can reach out in the world.
   *
   * Two sources, and they are answering different questions: the agent's own
   * config file says which servers it is allowed to use, and the live session
   * says which ones actually came up. A server that is on and missing from the
   * session, or on with an error, is a server that is broken, and that is the
   * thing worth saying out loud.
   */
  private async toolsOf(hand: string): Promise<Tool[]> {
    const listed = await this.runtimes.agentConfig.listMcpForAgent({ providerId: hand });
    if (!listed.success) return [];
    const running = new Map(this.servers.map((each) => [each.name, each]));
    return listed.data.servers.map((server) => ({
      name: server.name,
      on: server.enabled !== false,
      trouble: running.get(server.name)?.startupError ?? null,
    }));
  }

  async dispose(): Promise<void> {
    const going = this.replicas;
    this.replicas = [];
    await Promise.all(going.map((replica) => replica.dispose()));
  }
}

function choicesOf(available: { id: string; name: string; description?: string }[] | undefined) {
  return (available ?? []).map(
    (option): Choice => ({ id: option.id, name: option.name, about: option.description })
  );
}

/**
 * What the agent has been taught.
 *
 * Read from where the agent actually looks rather than from anywhere of ours:
 * a folder per skill with a `SKILL.md` in it, kept either in the home
 * directory, where it is true of every checkout, or in this one, where it is
 * true only here. Emdash keeps its own shelf of these somewhere else entirely
 * and nothing on this machine reads it, so the village does not pretend to.
 */
async function knacksFor(worktree: string | undefined): Promise<Knack[]> {
  const found = await Promise.all([
    shelf(join(homedir(), '.claude', 'skills'), 'everywhere'),
    worktree ? shelf(join(worktree, '.claude', 'skills'), 'here') : Promise.resolve([]),
  ]);
  return found.flat().sort((a, b) => a.name.localeCompare(b.name));
}

async function shelf(path: string, from: 'everywhere' | 'here'): Promise<Knack[]> {
  const entries = await readdir(path, { withFileTypes: true }).catch(() => []);
  const found = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry): Promise<Knack> => {
        const wrote = await readFile(join(path, entry.name, 'SKILL.md'), 'utf8').catch(() => '');
        return { name: entry.name, about: described(wrote), from };
      })
  );
  return found;
}

/** The one line out of a skill's front matter that says what it is for. */
function described(text: string): string {
  const line = /^description:\s*(.+)$/m.exec(text.slice(0, 2000));
  return line?.[1]?.replace(/^["']|["']$/g, '').trim() ?? '';
}

function said(error: { type?: string; message?: string }): string {
  return error.message ?? error.type ?? 'it was refused.';
}
