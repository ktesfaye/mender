import { readdir, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { McpServer } from '@emdash/core/primitives/mcp/api';
import type { SessionConfigState, SessionMcpServer } from '@emdash/core/runtimes/acp/api';
import type { AgentConfigList } from '@emdash/core/runtimes/agent-config/api';
import { pluginRegistry } from '@emdash/plugins/agents';
import { ReplicaState } from '@emdash/wire/live';
import { cell, type Cell } from '@emdash/wire/state';
import type { Choice, Hand, Kit, Knack, Tool } from '@shared/agents';
import type { AppSettings } from './app-settings';
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
  collab: null,
  collabs: [],
  tools: [],
  knacks: [],
  knacksSupported: true,
  orders: [],
  awake: false,
  signIn: null,
};

export interface Kits {
  /** One session's card, for the board to subscribe to. */
  kit(task: string): Cell<Kit>;
  /** The conversation a session is holding, once it has one. */
  settle(task: string, conversation: string): Promise<void>;
  choose(
    task: string,
    what: 'hand' | 'model' | 'mode' | 'effort' | 'collab',
    id: string
  ): Promise<Wrong>;
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
  moveOut: (task: string) => Promise<void>,
  /** The windmill's own memory: who starts fresh, and what they last thought with. */
  settings: AppSettings
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
      card = new Card(task, runtimes, tasks, () => installed, () => settings.defaultHand());
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
        key:
          what === 'model'
            ? 'model'
            : what === 'mode'
              ? 'mode'
              : what === 'collab'
                ? 'collaborationMode'
                : 'effort',
        value: id,
      });
      if (!done.success) return refused(said(done.error));
      /* Remembered so the session starts on it again. The id is the live one
         the agent itself advertised, which is the only kind `launch` will
         take: the static list a plugin carries is spelled differently and is
         dropped on the floor without a word. */
      if (what === 'model') await tasks.remodel(task, id);
      /* Also remembered against the agent itself, not just this task, so the
         next fresh session with the same hand starts on it too. */
      if (what === 'model') await settings.rememberModel(await card.hand(), id);
      if (what === 'mode') await settings.rememberMode(await card.hand(), id);
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
  /** Every agent's sign-in state on this machine, read back from the host's
   *  own auth check rather than kept here. */
  private auth: AgentConfigList = {};
  private authReplica: ReplicaState<AgentConfigList> | undefined;

  constructor(
    private readonly task: string,
    private readonly runtimes: MenderRuntimes,
    private readonly tasks: Tasks,
    private readonly installed: () => Record<string, boolean>,
    /** Whoever the windmill says a fresh session starts with. */
    private readonly defaultHand: () => Promise<string>
  ) {
    this.state = cell<Kit>(NOTHING, { name: `kit:${task}` });
    this.authReplica = new ReplicaState<AgentConfigList>(
      this.runtimes.agentConfig.agents.state(undefined, 'list'),
      {
        onChange: (value) => {
          this.auth = value;
          void this.redraw();
        },
      }
    );
  }

  get awake(): boolean {
    return Boolean(this.config?.modelOptions ?? this.config?.modeOptions);
  }

  async hand(): Promise<string> {
    const record = (await this.tasks.list()).find((each) => each.id === this.task);
    return record?.agent ?? (await this.defaultHand());
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
    const hand = record?.agent ?? (await this.defaultHand());
    const here = this.installed();

    const hands: Hand[] = pluginRegistry
      .getAll()
      .filter((plugin) => plugin.capabilities.acp.kind === 'supported')
      .map((plugin) => ({
        id: plugin.metadata.id,
        name: plugin.metadata.name,
        here: here[plugin.metadata.id] ?? false,
        signedIn: signedInOf(this.auth[plugin.metadata.id]),
      }))
      .sort((a, b) => Number(b.here) - Number(a.here) || a.name.localeCompare(b.name));

    const [tools, taught] = await Promise.all([this.toolsOf(hand), knacksFor(hand, record?.path)]);
    const awake = Boolean(this.config?.modelOptions ?? this.config?.modeOptions);
    const working = hands.find((one) => one.id === hand);
    const signIn = working?.signedIn === false ? signInFor(hand, working.name) : null;

    this.state.set({
      hand,
      hands,
      model: this.config?.modelOptions?.selected ?? null,
      models: choicesOf(this.config?.modelOptions?.available),
      mode: this.config?.modeOptions?.selected ?? null,
      modes: choicesOf(this.config?.modeOptions?.available),
      effort: this.config?.efforts?.selected ?? null,
      efforts: choicesOf(this.config?.efforts?.available),
      collab: this.config?.collaborationModeOptions?.selected ?? null,
      collabs: choicesOf(this.config?.collaborationModeOptions?.available),
      tools,
      knacks: taught.knacks,
      knacksSupported: taught.supported,
      orders: (this.config?.availableCommands ?? []).map((command) => ({
        name: command.name,
        about: command.description,
        ...(command.inputHint ? { takes: command.inputHint } : {}),
      })),
      awake,
      signIn,
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
    const auth = this.authReplica;
    this.authReplica = undefined;
    await Promise.all([...going.map((replica) => replica.dispose()), auth?.dispose()]);
  }
}

/** Whether this agent is signed in, read back from the host's own auth
 *  check. Absent from the list entirely means it has no notion of it. */
function signedInOf(entry: AgentConfigList[string] | undefined): boolean | null {
  if (!entry) return null;
  if (entry.auth.status.kind === 'authenticated') return true;
  if (entry.auth.status.kind === 'unauthenticated') return false;
  return null;
}

/**
 * The line that signs an agent in, in its own words: the CLI's own login
 * command when it has one, or an `export` ready for a pasted key otherwise.
 * Opened in the real shell rather than run for you, because a real shell is
 * what this is to begin with.
 */
function signInFor(providerId: string, name: string): { agent: string; command: string } | null {
  const auth = pluginRegistry.get(providerId)?.capabilities.auth;
  if (!auth || auth.kind !== 'supported') return null;
  const login = auth.methods.find((method) => method.kind === 'cli-login');
  if (login) return { agent: name, command: `${providerId} ${login.args.join(' ')}` };
  const key = auth.methods.find((method) => method.kind === 'api-key');
  if (key) return { agent: name, command: `export ${key.envVars[0].name}=` };
  return null;
}

function choicesOf(available: { id: string; name: string; description?: string }[] | undefined) {
  return (available ?? []).map(
    (option): Choice => ({ id: option.id, name: option.name, about: option.description })
  );
}

/**
 * Where each agent keeps a taught skill, verified against its own docs
 * rather than assumed from Claude's: a folder per skill with a `SKILL.md` in
 * it, under a personal path true of every checkout and a project path true
 * only of this one. An agent missing from this table has no such notion at
 * all — asking it for skills is asking a question it has no word for, which
 * reads differently on the card from an agent that has the notion and
 * simply hasn't been taught anything yet.
 */
const SKILLS_HOME: Partial<Record<string, { personal: string[]; project: string[] }>> = {
  claude: { personal: ['.claude', 'skills'], project: ['.claude', 'skills'] },
  qwen: { personal: ['.qwen', 'skills'], project: ['.qwen', 'skills'] },
  hermes: { personal: ['.hermes', 'skills'], project: ['.hermes', 'skills'] },
  codex: { personal: ['.codex', 'skills'], project: ['.codex', 'skills'] },
  // OpenCode also reads Claude- and agents.md-compatible skill folders; its
  // own is the one worth naming here.
  opencode: { personal: ['.config', 'opencode', 'skills'], project: ['.opencode', 'skills'] },
};

/**
 * What the agent has been taught.
 *
 * Read from where that particular agent actually looks rather than from
 * anywhere of ours. Emdash keeps its own shelf of these somewhere else
 * entirely and nothing on this machine reads it, so the village does not
 * pretend to.
 */
export async function knacksFor(
  hand: string,
  worktree: string | undefined
): Promise<{ supported: boolean; knacks: Knack[] }> {
  const home = SKILLS_HOME[hand];
  if (!home) return { supported: false, knacks: [] };
  const found = await Promise.all([
    shelf(join(homedir(), ...home.personal), 'everywhere'),
    worktree ? shelf(join(worktree, ...home.project), 'here') : Promise.resolve([]),
  ]);
  return { supported: true, knacks: found.flat().sort((a, b) => a.name.localeCompare(b.name)) };
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
