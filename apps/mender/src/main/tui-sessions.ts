import type { TuiAgentState, TuiSessionState } from '@emdash/core/runtimes/tui-agents/api';
import { ReplicaState } from '@emdash/wire/live';
import { cell, observe, peek, type Cell } from '@emdash/wire/state';
import type { Scope } from '@emdash/shared/concurrency';
import type { Mood } from '@shared/agents';
import type { AppSettings } from './app-settings';
import type { MenderRuntimes } from './runtimes';
import type { Tasks } from './tasks';

/**
 * A session that is not a transcript, but a real terminal: the agent's own
 * CLI, running raw, wired straight to emdash's TUI-agent runtime rather than
 * projected turn by turn the way `agents.ts` reads an ACP session.
 *
 * Everything the yard needs to treat this like any other villager — a mood
 * for the lantern, a line for a notification — is read off the same two live
 * models the runtime already keeps: the PTY's own `sessions` (is it running
 * at all) and the provider hook stream's `agentStates` (is it thinking, is it
 * waiting on you, did it break).
 */
export interface TuiSessions {
  /** Start (or reattach to) the agent's own CLI in this task's checkout. */
  open(task: string): Promise<{ success: true } | { success: false; because: string }>;
  /** Mood for every session running as its own terminal — merged onto the
      island beside the ordinary chat ones. */
  moods(): Cell<Record<string, Mood>>;
  /** The one line a notification says for a session running this way. */
  doing(task: string): string;
  dispose(): Promise<void>;
}

/** The shape a TUI session starts at, before the board has laid it out. */
const COLS = 120;
const ROWS = 40;

export function createTuiSessions(
  runtimes: MenderRuntimes,
  settings: AppSettings,
  tasks: Tasks
): TuiSessions {
  const island = cell<Record<string, Mood>>({}, { name: 'tui:island' });
  let sessions: Record<string, TuiSessionState> = {};
  let agentStates: Record<string, TuiAgentState> = {};

  const refresh = (): void => {
    const next: Record<string, Mood> = {};
    for (const [conversation, session] of Object.entries(sessions)) {
      next[conversation] = moodOf(session, agentStates[conversation]);
    }
    island.set(next);
  };

  const sessionsState = new ReplicaState(runtimes.tuiAgents.sessions.state(undefined, 'list'), {
    onChange: (value) => {
      sessions = value;
      refresh();
    },
  });
  const agentStatesState = new ReplicaState(
    runtimes.tuiAgents.agentStates.state(undefined, 'list'),
    {
      onChange: (value) => {
        agentStates = value;
        refresh();
      },
    }
  );

  return {
    async open(taskId) {
      const record = (await tasks.list()).find((candidate) => candidate.id === taskId);
      if (!record) return { success: false, because: 'that building is gone.' };
      const hand = record.agent ?? (await settings.defaultHand());
      const started = await runtimes.tuiAgents.start(
        {
          conversationId: record.id,
          providerId: hand,
          cwd: record.path,
          sessionId: null,
          model: record.model ?? null,
          cols: COLS,
          rows: ROWS,
          // A tmux identity of its own is what makes this a place rather
          // than a window: the CLI is still running in it after the app
          // closes, the same way the plain shell's own tmux wrapper does.
          tmux: { identity: `mender-tui-${record.id}` },
        },
        { timeoutMs: 0 }
      );
      if (!started.success) return { success: false, because: saidOf(started.error) };
      return { success: true };
    },

    moods: () => island,

    doing(task) {
      const state = agentStates[task];
      if (state?.status === 'awaiting-input') return state.message ?? 'waiting on you.';
      if (state?.status === 'completed') return 'done, and waiting for you to say something.';
      if (state?.status === 'error') return state.message ?? 'it broke.';
      if (state?.status === 'working') return state.message ?? 'working.';
      return 'working.';
    },

    async dispose() {
      await sessionsState.dispose();
      await agentStatesState.dispose();
    },
  };
}

function moodOf(session: TuiSessionState, state: TuiAgentState | undefined): Mood {
  if (session.status === 'starting') return 'arriving';
  if (state?.status === 'error') return 'hurt';
  if (state?.status === 'awaiting-input') return 'asking';
  if (state?.status === 'working') return 'working';
  // Exited, idle, or completed: somebody who has stopped, not a building
  // nobody was ever told to work in.
  return 'resting';
}

function saidOf(error: { type: string; message?: string } | undefined): string {
  if (!error) return 'nothing said what went wrong.';
  if (error.message) return error.message;
  return error.type.replaceAll('-', ' ');
}

/**
 * The rail, the rack, `Cmd+U` and the dock all read one mood map. A session
 * running as its own terminal is a second source of moods, not a second
 * island, so this is the one place the two are folded into one map — kept
 * live rather than read once, because either side can change first.
 */
export function mergedMoods(
  scope: Scope,
  a: Cell<Record<string, Mood>>,
  b: Cell<Record<string, Mood>>
): Cell<Record<string, Mood>> {
  const merged = cell<Record<string, Mood>>(
    { ...peek(a), ...peek(b) },
    { name: 'moods:merged' }
  );
  const recompute = (): void => {
    merged.set({ ...peek(a), ...peek(b) });
  };
  observe(a, recompute, { scope });
  observe(b, recompute, { scope });
  return merged;
}
