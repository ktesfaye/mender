import { defineContract, fallible, liveModel, liveState, procedure } from '@emdash/wire/rpc';
import { z } from 'zod';

export const taskSchema = z.object({
  id: z.string(),
  project: z.string(),
  /** What it was called when it was cut, which is what the branch is made of. */
  name: z.string(),
  /** What it is called now: the agent's own name for it, or yours. */
  title: z.string(),
  /** Set once you have named it yourself, so nothing renames it back. */
  named: z.boolean().optional(),
  /** Who works in here. */
  agent: z.string().optional(),
  /** What they think with, when they next start. */
  model: z.string().nullable().optional(),
  branch: z.string(),
  /** The branch it was cut from, so the board can say what was done in here. */
  base: z.string().nullable().optional(),
  /** Which of the district's buildings it stands in, if it got one. */
  slot: z.number().int().nonnegative().nullable(),
  path: z.string(),
  startedAt: z.string(),
  /**
   * `terminal` means this session's board is the agent's own CLI, running
   * raw in a real terminal, rather than the yard's parsed transcript. Unset
   * (or `chat`) is every session there has ever been until now.
   */
  kind: z.enum(['chat', 'terminal']).optional(),
  /** A pull request picked by hand rather than found by matching this
      session's branch — set when its own branch isn't what went up, or the
      match never found it. */
  pull: z.string().optional(),
  /** Works in the project's own folder rather than a worktree of its own. */
  shared: z.boolean().optional(),
  /** The isolated workspace it works in, when it is not the project's own
      folder. Every session in one shares its worktree and its branch. */
  workspace: z.string().optional(),
});

export type Task = z.infer<typeof taskSchema>;

/**
 * An isolated workspace: a worktree of the project on a branch of its own,
 * holding however many sessions are working in it, none included. It is the
 * workspace registry's own worktree, under the registry's own id.
 */
export const workspaceSchema = z.object({
  id: z.string(),
  project: z.string(),
  /** What its signboard says. */
  name: z.string(),
  branch: z.string(),
  base: z.string().nullable().optional(),
  path: z.string(),
  startedAt: z.string(),
});

export type Workspace = z.infer<typeof workspaceSchema>;

/** A session taken down, as the ledger of ended sessions remembers it. */
export const historyEntrySchema = z.object({
  id: z.string(),
  project: z.string(),
  title: z.string(),
  branch: z.string(),
  endedAt: z.string(),
});

export type HistoryEntry = z.infer<typeof historyEntrySchema>;

/** One of the Claude Code CLI's own past terminal sessions for this
    project's checkout — entirely separate from `historyEntrySchema` above,
    which is Mender's own ledger of tasks it took down itself. */
export const claudeCliSessionSchema = z.object({
  id: z.string(),
  gitBranch: z.string().nullable(),
  mtimeMs: z.number(),
  size: z.number(),
  title: z.string(),
});

export type ClaudeCliSession = z.infer<typeof claudeCliSessionSchema>;

export const taskErrorSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('no-such-project') }),
  /** Nothing was written on the board. */
  z.object({ kind: z.literal('nameless') }),
  z.object({ kind: z.literal('already-here'), name: z.string() }),
  /** Something is already standing in that building. */
  z.object({ kind: z.literal('taken') }),
  /** The one being forked from is gone. */
  z.object({ kind: z.literal('no-such-task') }),
  /** The workspace registry refused, and this is what it said. */
  z.object({ kind: z.literal('refused'), because: z.string() }),
]);

export const tasksContract = defineContract({
  /** Every session there is, as it changes. */
  all: liveModel({
    key: z.void().optional(),
    states: { list: liveState({ data: z.array(taskSchema) }) },
  }),
  list: procedure({
    input: z.object({ project: z.string().optional() }),
    output: z.array(taskSchema),
  }),
  /** Every isolated workspace there is, as it changes. */
  workspaces: liveModel({
    key: z.void().optional(),
    states: { list: liveState({ data: z.array(workspaceSchema) }) },
  }),
  /** A new isolated workspace, nobody in it yet: its own worktree on its own
      branch, cut from wherever the project calls home. */
  cutWorkspace: fallible({
    input: z.object({ project: z.string() }),
    data: workspaceSchema,
    error: taskErrorSchema,
  }),
  /** Takes the worktree down and every session in it. The branch stays. */
  dropWorkspace: procedure({ input: z.object({ id: z.string() }), output: z.void() }),
  /** Start a session, in the project's own folder or a worktree cut for it. */
  begin: fallible({
    input: z.object({
      project: z.string(),
      name: z.string(),
      /** Which building to stand it in. Null when the district has no room. */
      slot: z.number().int().nonnegative().nullable(),
      /** `terminal` for a session that is the agent's own CLI in a real
          terminal rather than the yard's chat board. Omitted means `chat`. */
      kind: z.enum(['chat', 'terminal']).optional(),
      /** An existing branch to stand the session on, in place of cutting a
          fresh one from the name. */
      branch: z.string().optional(),
      /** Its own worktree on its own branch, rather than the project's own
          folder. */
      isolated: z.boolean().optional(),
      /** An isolated workspace already standing, to work in beside whoever
          else is in there. */
      workspace: z.string().optional(),
    }),
    data: taskSchema,
    error: taskErrorSchema,
  }),
  /** The branches this project's checkout already knows about, for the
      naming step to offer alongside a fresh one. */
  branches: procedure({ input: z.object({ project: z.string() }), output: z.array(z.string()) }),
  /** Every past session the Claude Code CLI itself has kept for this
      project's own checkout path — offered when starting a new session, as
      a thing to pick up rather than start blank. */
  claudeHistory: procedure({
    input: z.object({ project: z.string() }),
    output: z.array(claudeCliSessionSchema),
  }),
  /** The script that failed setting this task's worktree up, if any is
      still unresolved. */
  setupFailure: procedure({
    input: z.object({ id: z.string() }),
    output: z.object({ script: z.string(), message: z.string() }).nullable(),
  }),
  /** Runs that script again. */
  retrySetup: procedure({ input: z.object({ id: z.string() }), output: z.void() }),
  /** Picks a pull request for this session by hand, in place of matching its
      branch. */
  linkPull: procedure({
    input: z.object({ id: z.string(), url: z.string() }),
    output: z.array(taskSchema),
  }),
  unlinkPull: procedure({ input: z.object({ id: z.string() }), output: z.array(taskSchema) }),
  /**
   * What is in that checkout, by name.
   *
   * An @ on the line you write on is how a file is named to whoever is working
   * in there, and this is what that @ is asking.
   */
  files: procedure({
    input: z.object({ id: z.string(), like: z.string() }),
    output: z.array(z.string()),
  }),
  /** Call it something else, and mean it. */
  rename: procedure({
    input: z.object({ id: z.string(), title: z.string() }),
    output: z.array(taskSchema),
  }),
  /** Turns a session nobody has spoken to yet into its own terminal. */
  retool: procedure({ input: z.object({ id: z.string() }), output: z.array(taskSchema) }),
  abandon: procedure({ input: z.object({ id: z.string() }), output: z.array(taskSchema) }),
  /**
   * The last session taken down in this project this sitting, if putting it
   * back up is still on offer. Gone once revived, once another is taken down
   * in its place, or once the app restarts — it is not written down anywhere.
   */
  revivable: procedure({
    input: z.object({ project: z.string() }),
    output: z.object({ title: z.string() }).nullable(),
  }),
  /** Cuts a fresh worktree from the same branch and stands it back up. */
  revive: fallible({
    input: z.object({ project: z.string() }),
    data: taskSchema,
    error: taskErrorSchema,
  }),
  /** Every session taken down in this project, newest first. */
  history: procedure({
    input: z.object({ project: z.string() }),
    output: z.array(historyEntrySchema),
  }),
  /** A new session, its own worktree cut from the branch as it stands. The
      original is left exactly as it was. */
  fork: fallible({
    input: z.object({ id: z.string() }),
    data: taskSchema,
    error: taskErrorSchema,
  }),
});

export type TasksContract = typeof tasksContract;
