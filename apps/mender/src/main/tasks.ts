import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';
import { createJsonFileKeyValueStore } from '@emdash/core/primitives/kv/node';
import { parseNativeAbsolute } from '@emdash/core/primitives/path/api';
import type { ActiveRootStatus } from '@emdash/core/runtimes/file-search/api';
import { shortName } from '@emdash/core/runtimes/git/api';
import type { WorkspaceRecord } from '@emdash/core/runtimes/workspace-registry/api';
import { ReplicaState } from '@emdash/wire/live';
import { cell, type Cell } from '@emdash/wire/state';
import { app } from 'electron';
import type { AppSettings } from './app-settings';
import { listClaudeSessions, type ClaudeCliSession } from './claude-cli-history';
import type { Project, Projects } from './projects';
import type { MenderRuntimes } from './runtimes';

/**
 * The tasks, which are the sessions.
 *
 * A task works in the project's own folder, alongside every other session in
 * that project, the way several Claude Code terminals opened in one checkout
 * do. The agents are left to stay out of each other's way. A task can instead
 * be a checkout of its own, its own branch and its own worktree, when that is
 * asked for on purpose; that is the only time anything is cut.
 *
 * It may also stand in one of its district's buildings, and when it does the
 * island lights up for it. That is decoration. A project can have more
 * sessions than its district has houses, and a session without one is in no
 * way lesser.
 *
 * Cutting the worktree is emdash's, not ours. Its registry owns the pipeline
 * that inspects the repository, resolves the base, adds the worktree under an
 * exclusive claim and verifies it, and owns tearing it down again with whatever
 * was running inside it. We name the thing and say where it goes.
 */
export interface Task {
  readonly id: string;
  /** The project whose district it stands in. */
  readonly project: string;
  /** What it was cut as, which is what the branch is made of. */
  readonly name: string;
  /** What it is called now: the agent's own name for it, or his. */
  readonly title: string;
  /** Set once he has named it himself, so nothing renames it back. */
  readonly named?: boolean;
  /** Who works in here. Whoever it was when it started, until he says otherwise. */
  readonly agent?: string;
  /** What they think with. Handed to the session when it starts. */
  readonly model?: string | null;
  readonly branch: string;
  /** What it was cut from. The board measures what was done in here from it. */
  readonly base?: string | null;
  /** Which of the district's buildings it stands in, if it got one. */
  readonly slot: number | null;
  /** The worktree, as the filesystem spells it. */
  readonly path: string;
  readonly startedAt: string;
  /** `terminal` for a session whose board is the agent's own CLI in a real
      terminal. Unset means the ordinary chat yard. */
  readonly kind?: 'chat' | 'terminal';
  /** A pull request picked by hand, in place of matching this session's
      branch. */
  readonly pull?: string;
  /** Works in the project's own folder alongside everybody else, rather than
      a worktree of its own. There is nothing to cut and nothing to tear
      down: taking it off the rail leaves every file exactly where it is. */
  readonly shared?: boolean;
  /** The isolated workspace it works in. Every session in one shares its
      worktree and its branch, and taking one of them down leaves the
      worktree standing for the rest. */
  readonly workspace?: string;
}

/**
 * An isolated workspace: the project cut into a worktree of its own, on a
 * branch of its own, holding whatever sessions are working in it, none
 * included. The worktree is the registry's, under this same id, and it lives
 * until the workspace is taken down on purpose, not when its last session
 * goes.
 */
export interface Workspace {
  readonly id: string;
  readonly project: string;
  /** What its signboard says. */
  readonly name: string;
  readonly branch: string;
  readonly base?: string | null;
  readonly path: string;
  readonly startedAt: string;
}

/**
 * A session that has been taken down, remembered for the ledger.
 *
 * The worktree is gone and the task record with it, so this is what is left
 * to say about it: what it was called, what branch it was, and when. Its
 * conversation is not stored here — it is still sitting wherever `agents.ts`
 * left it, keyed by this same `id`, since taking a session down never asks
 * the conversation to leave.
 */
export interface HistoryEntry {
  readonly id: string;
  readonly project: string;
  readonly title: string;
  readonly branch: string;
  readonly endedAt: string;
}

export type TaskError =
  | { kind: 'no-such-project' }
  | { kind: 'nameless' }
  | { kind: 'already-here'; name: string }
  | { kind: 'taken' }
  /** The one being forked from is gone. */
  | { kind: 'no-such-task' }
  /** The registry refused, and this is what it said. */
  | { kind: 'refused'; because: string };

export interface Tasks {
  list(project?: string): Promise<Task[]>;
  /** Every session, as it changes, for whoever is showing them. */
  watch(): Cell<Task[]>;
  begin(
    project: string,
    name: string,
    slot: number | null,
    kind?: 'chat' | 'terminal',
    /** An existing branch to stand the session on, instead of cutting a
        fresh one out of the name. `createWorktree` reuses it rather than
        cutting from a base ref when it finds one already there. */
    branch?: string,
    /** Its own worktree on its own branch. Without it, and without a
        branch to stand on, the session works in the project's own folder. */
    isolated?: boolean,
    /** An isolated workspace already standing, to work in beside whoever
        else is in there. Outranks both of the above. */
    workspace?: string
  ): Promise<{ success: true; data: Task } | { success: false; error: TaskError }>;
  /** Every isolated workspace, as it changes. */
  watchWorkspaces(): Cell<Workspace[]>;
  workspaces(project?: string): Promise<Workspace[]>;
  /** A new isolated workspace with nobody in it yet. */
  cutWorkspace(
    project: string
  ): Promise<{ success: true; data: Workspace } | { success: false; error: TaskError }>;
  /** Takes a workspace's worktree down and every session in it. The branch
      outlives it, the same as it outlives a session. */
  dropWorkspace(id: string): Promise<void>;
  /** The branches this project's checkout already knows about, for the
      naming step to offer alongside a fresh one. */
  branches(project: string): Promise<string[]>;
  /** Every past session the Claude Code CLI has kept for this project's own
      checkout path, for the naming step to offer as a thing to pick up
      instead of starting blank. */
  claudeHistory(project: string): Promise<ClaudeCliSession[]>;
  /** The script that failed setting this task's worktree up, if any is still
      unresolved — read off the workspace registry's own record, never
      guessed. */
  setupFailure(id: string): Promise<{ script: string; message: string } | null>;
  /** Runs that script again. Its own failure lands back on `setupFailure`
      the next time it is read; this never fails the call itself, the same
      way the registry never fails activation over a script. */
  retrySetup(id: string): Promise<void>;
  /** Picks a pull request for this session by hand. */
  linkPull(id: string, url: string): Promise<Task[]>;
  unlinkPull(id: string): Promise<Task[]>;
  /**
   * What is in that checkout, by name, nearest first.
   *
   * For naming a file on the line you write on rather than typing the whole
   * way to it from memory.
   */
  files(id: string, like: string): Promise<string[]>;
  /** Called something else by him, and it sticks. */
  rename(id: string, title: string): Promise<Task[]>;
  /** Called something else by whoever is working in it, which his name outranks. */
  retitle(id: string, title: string): Promise<void>;
  /** Somebody else works here now. */
  rehand(id: string, agent: string): Promise<Task[]>;
  /** Turns a session nobody has spoken to yet into its own terminal — the
      agent's raw CLI rather than a chat. A no-op once it is awake. */
  retool(id: string): Promise<Task[]>;
  /** What whoever is in here thinks with, next time they start. */
  remodel(id: string, model: string | null): Promise<Task[]>;
  abandon(id: string): Promise<Task[]>;
  /**
   * The one just taken down in this project, if putting it back up is still
   * on offer — kept for the rest of this sitting, on disk nowhere.
   */
  revivable(project: string): { title: string } | null;
  /** Every session taken down in this project, newest first. */
  history(project: string): Promise<HistoryEntry[]>;
  /** Cuts a fresh worktree from that same branch and stands it back up. */
  revive(
    project: string
  ): Promise<{ success: true; data: Task } | { success: false; error: TaskError }>;
  /**
   * A new session, its own worktree cut from the branch as it stands.
   *
   * The original is left alone — this only ever adds a lantern, never takes
   * one away. What it was carrying in when it was cut is somebody else's to
   * say, once the worktree is real.
   */
  fork(id: string): Promise<{ success: true; data: Task } | { success: false; error: TaskError }>;
  /** Take down every session in one project, for when the project is forgotten. */
  sweep(project: string): Promise<void>;
  /** Whoever is lodging in a session's building when it comes down, taken
   *  down or swept alike, so nothing goes on answering for a place that no
   *  longer exists. Set after construction, same reason as `Projects.sweeps`:
   *  the two need each other and one has to be told second. */
  onGone(hook: (task: string) => void): void;
  dispose(): Promise<void>;
}

/** How many names a checkout offers up at once. */
const NAMES = 12;

const KEY = 'tasks';
const WORKSPACES_KEY = 'workspaces';
const HISTORY_KEY = 'history';
/** How many ended sessions the ledger keeps before the oldest fall off. */
const HISTORY_KEPT = 200;

export function createTasks(
  runtimes: MenderRuntimes,
  projects: Projects,
  appSettings: AppSettings
): Tasks {
  const store = createJsonFileKeyValueStore({ path: join(userDataDir(), 'tasks.json') });
  const historyStore = createJsonFileKeyValueStore({ path: join(userDataDir(), 'history.json') });

  const allHistory = async (): Promise<HistoryEntry[]> => {
    const loaded = await historyStore.get(HISTORY_KEY);
    if (!loaded.success || !Array.isArray(loaded.data)) return [];
    return loaded.data as unknown as HistoryEntry[];
  };

  /** Remembers a session that just came down, newest first, capped. */
  const remember = async (entry: HistoryEntry): Promise<void> => {
    const kept = [entry, ...(await allHistory())].slice(0, HISTORY_KEPT);
    await historyStore.set(HISTORY_KEY, kept as unknown as never);
  };
  const standing = cell<Task[]>([], { name: 'tasks:all' });
  /* Which checkouts have had their contents read. Holding one of these open is
     what keeps that worktree's index alive and watched. */
  const indexed = new Map<string, ReplicaState<ActiveRootStatus>>();
  /* The one session just taken down in each project, for the rest of this
     sitting — not written to disk, so a restart forgets it the same way the
     agent itself is not woken back up by a restart either. */
  const lastTakenDown = new Map<string, Task>();
  /** Told once a session's building is gone, so its lodger can be let go too. */
  let gone: ((task: string) => void) | undefined;

  const raw = async (): Promise<Task[]> => {
    const loaded = await store.get(KEY);
    if (!loaded.success || !Array.isArray(loaded.data)) return [];
    // Tasks written before a session had a name of its own still answer to
    // the one they were cut under.
    return (loaded.data as unknown as Task[]).map((task) => ({
      ...task,
      title: task.title || task.name,
      slot: task.slot ?? null,
    }));
  };

  const rawWorkspaces = async (): Promise<Workspace[]> => {
    const loaded = await store.get(WORKSPACES_KEY);
    if (!loaded.success || !Array.isArray(loaded.data)) return [];
    return loaded.data as unknown as Workspace[];
  };

  /* A session cut into its own worktree before a worktree could hold more
     than one session was its own workspace all along, under its own id, so
     that is what it becomes: the same worktree, a signboard of its own, and
     the session standing in it. Done once, the first time anything asks. */
  let settled: Promise<void> | undefined;
  const settle = (): Promise<void> =>
    (settled ??= (async () => {
      const tasks = await raw();
      const lone = tasks.filter((task) => !task.shared && !task.workspace);
      if (!lone.length) return;
      const had = await rawWorkspaces();
      const made: Workspace[] = lone
        .filter((task) => !had.some((each) => each.id === task.id))
        .map((task) => ({
          id: task.id,
          project: task.project,
          name: signboardFor(task.branch),
          branch: task.branch,
          base: task.base ?? null,
          path: task.path,
          startedAt: task.startedAt,
        }));
      await store.set(WORKSPACES_KEY, [...had, ...made] as unknown as never);
      await store.set(
        KEY,
        tasks.map((task) =>
          !task.shared && !task.workspace ? { ...task, workspace: task.id } : task
        ) as unknown as never
      );
    })());

  const all = async (): Promise<Task[]> => {
    await settle();
    return await raw();
  };

  const standingWorkspaces = cell<Workspace[]>([], { name: 'tasks:workspaces' });

  /** Every workspace whose worktree is still on disk. One cleared from under
      the village, by hand or from the windmill, is simply not there any more. */
  const allWorkspaces = async (): Promise<Workspace[]> => {
    await settle();
    return (await rawWorkspaces()).filter((each) => existsSync(each.path));
  };

  const saveWorkspaces = async (list: Workspace[]): Promise<Workspace[]> => {
    await store.set(WORKSPACES_KEY, list as unknown as never);
    standingWorkspaces.set(list.filter((each) => existsSync(each.path)));
    return list;
  };

  /**
   * Cuts a worktree for a new workspace and writes it down.
   *
   * From the branch the project calls home unless told otherwise, onto
   * `branch`, which `createWorktree` reuses rather than cutting from the base
   * when it already exists.
   */
  const cut = async (
    found: Project,
    name: string,
    branch: string,
    from?: string | null
  ): Promise<{ success: true; data: Workspace } | { success: false; error: TaskError }> => {
    const repository = await repositoryOf(runtimes, found);
    if (!repository.success) return repository;

    const parsed = parseNativeAbsolute(found.path);
    if (!parsed.success) return fail({ kind: 'refused', because: 'that checkout has moved.' });
    // A task starts from the branch the project calls home, not from whatever
    // happens to be checked out. A repository made with `git init` and pushed
    // up rather than cloned has no remote HEAD pointer to ask, so the next
    // fallback is the branch the project's own checkout is actually on, and
    // only a detached checkout falls all the way back to HEAD itself.
    let baseRef = from;
    if (!baseRef) {
      const asked = await runtimes.git.repository.getDefaultBranch({
        repository: parsed.data,
        remote: 'origin',
      });
      baseRef =
        (asked.success && asked.data.branch) ||
        (await currentBranch(runtimes, parsed.data)) ||
        'HEAD';
    }

    /* Under the folder's own name, not the project's: a project renamed on
       the island is not a reason for its next worktree to live somewhere
       else from its last. */
    const path = join(
      await worktreeRoot(appSettings),
      basename(found.path),
      branch.replaceAll('/', '-')
    );
    const made = await runtimes.workspaces.createWorktree(
      {
        workspaceId: crypto.randomUUID(),
        repositoryId: repository.data,
        branch,
        baseRef,
        path,
        preservePatterns: [],
      },
      // Cutting a worktree copies a repository's whole working tree and then
      // runs whatever that project does to make a checkout usable. On a big
      // one that is minutes, not seconds.
      { timeoutMs: 0 }
    );
    if (!made.success) return fail({ kind: 'refused', because: whatItSaid(made.error) });

    // A project that says who its commits go out as writes that into the
    // worktree's own git config, not the machine's — so it holds only here,
    // and never leaks into a session cut from a different project.
    if (found.gitName || found.gitEmail) {
      await identityIn(runtimes, made.data.path, found.gitName, found.gitEmail);
    }

    // Whatever the project says runs on a fresh worktree runs now: prepare
    // gates on completing (the registry's own session-gating point), setup
    // and run keep going after. A script failure is a notice on the
    // registry's own record, never a reason this session fails to start —
    // an agent staring at a checkout that never ran `npm install` is still
    // better than no session at all.
    try {
      await runtimes.workspaces.activateWorkspace({ workspaceId: made.data.id }, { timeoutMs: 0 });
    } catch {
      // Nothing this call can do about a registry that would not answer.
    }

    const workspace: Workspace = {
      id: made.data.id,
      project: found.id,
      name,
      branch,
      base: baseRef === 'HEAD' ? null : baseRef,
      path: made.data.path,
      startedAt: new Date().toISOString(),
    };
    await saveWorkspaces([...(await rawWorkspaces()), workspace]);
    return { success: true as const, data: workspace };
  };

  /** A session standing in a workspace, beside whoever else is in there. */
  const into = (
    workspace: Workspace,
    rest: Omit<Task, 'id' | 'project' | 'branch' | 'base' | 'path' | 'startedAt' | 'workspace'>
  ): Task => ({
    ...rest,
    id: crypto.randomUUID(),
    project: workspace.project,
    branch: workspace.branch,
    base: workspace.base ?? null,
    path: workspace.path,
    startedAt: new Date().toISOString(),
    workspace: workspace.id,
  });

  /** Lets go of everything held for a session that has just come down. */
  const letGo = (id: string): void => {
    indexed.get(id)?.dispose();
    indexed.delete(id);
    gone?.(id);
  };

  const save = async (tasks: Task[]): Promise<Task[]> => {
    await store.set(KEY, tasks as unknown as never);
    standing.set(tasks);
    return tasks;
  };

  // What is on disk, published once, so anyone watching starts out right
  // rather than empty until the first thing changes.
  void all().then((tasks) => standing.set(tasks));
  void allWorkspaces().then((list) => standingWorkspaces.set(list));

  /** A session in the project's own folder, on whatever branch it is on. */
  const sharedIn = async (
    found: Project,
    rest: Omit<Task, 'id' | 'branch' | 'base' | 'path' | 'startedAt' | 'shared'>
  ): Promise<Task | null> => {
    const parsed = parseNativeAbsolute(found.path);
    if (!parsed.success) return null;
    return {
      ...rest,
      id: crypto.randomUUID(),
      branch: (await currentBranch(runtimes, parsed.data)) ?? 'HEAD',
      base: null,
      path: found.path,
      startedAt: new Date().toISOString(),
      shared: true,
    };
  };

  /** The branches this project's checkout already knows about. */
  const branchesOf = async (project: string): Promise<string[]> => {
    const found = (await projects.list()).find((candidate) => candidate.id === project);
    if (!found) return [];
    try {
      const env = await runtimes.env.current();
      const listed = await ran(
        'git',
        ['for-each-ref', '--format=%(refname:short)', 'refs/heads/'],
        { cwd: found.path, env }
      );
      return listed.stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  };

  return {
    watch: () => standing,
    watchWorkspaces: () => standingWorkspaces,

    async workspaces(project) {
      const list = await allWorkspaces();
      return project ? list.filter((each) => each.project === project) : list;
    },

    async cutWorkspace(project) {
      const found = (await projects.list()).find((candidate) => candidate.id === project);
      if (!found) return fail({ kind: 'no-such-project' });
      const here = (await rawWorkspaces()).filter((each) => each.project === project);
      const settings = await appSettings.checkoutSettings();
      const branches = new Set([
        ...(await branchesOf(project)),
        ...here.map((each) => each.branch),
      ]);
      /* Named the way a second copy of a folder is, counting on from the
         project's own folder, which is the first. */
      const folder = basename(found.path);
      for (let n = 2; ; n += 1) {
        const name = `${folder}-${n}`;
        const branch = branchFor(name, settings);
        if (here.some((each) => each.name === name) || branches.has(branch)) continue;
        return await cut(found, name, branch);
      }
    },

    async dropWorkspace(id) {
      const workspace = (await rawWorkspaces()).find((each) => each.id === id);
      if (!workspace) return;
      await runtimes.workspaces.deleteWorktree(
        { workspaceId: id, deleteBranch: false },
        { timeoutMs: 0 }
      );
      const tasks = await all();
      const going = tasks.filter((task) => task.workspace === id);
      for (const task of going) {
        await remember({
          id: task.id,
          project: task.project,
          title: task.title,
          branch: task.branch,
          endedAt: new Date().toISOString(),
        });
        letGo(task.id);
      }
      await save(tasks.filter((task) => task.workspace !== id));
      await saveWorkspaces((await rawWorkspaces()).filter((each) => each.id !== id));
    },

    async list(project) {
      const tasks = await all();
      return project ? tasks.filter((task) => task.project === project) : tasks;
    },

    branches: branchesOf,

    async claudeHistory(project) {
      const found = (await projects.list()).find((candidate) => candidate.id === project);
      if (!found) return [];
      return await listClaudeSessions(found.path);
    },

    async setupFailure(id) {
      const records = await workspaceRecords(runtimes);
      const task = (await all()).find((each) => each.id === id);
      const notice = records[task?.workspace ?? id]?.runtime?.notices?.find(
        (each) => each.kind === 'script-failed' && each.script !== 'teardown'
      );
      return notice && notice.kind === 'script-failed'
        ? { script: notice.script, message: notice.message }
        : null;
    },

    async retrySetup(id) {
      const records = await workspaceRecords(runtimes);
      const workspace = (await all()).find((each) => each.id === id)?.workspace ?? id;
      const notice = records[workspace]?.runtime?.notices?.find(
        (each) => each.kind === 'script-failed' && each.script !== 'teardown'
      );
      const script = notice && notice.kind === 'script-failed' ? notice.script : 'setup';
      try {
        await runtimes.workspaces.runScript(
          { workspaceId: workspace, script, provenance: 'retry' },
          { timeoutMs: 0 }
        );
      } catch {
        // A run that would not even start is the same as one that failed:
        // the notice stays, and the board says so next time it is read.
      }
    },

    async begin(project, name, slot, kind, branch, isolated, workspace) {
      const written = name.trim();
      if (!written) return fail({ kind: 'nameless' });

      const tasks = await all();
      const found = (await projects.list()).find((candidate) => candidate.id === project);
      if (!found) return fail({ kind: 'no-such-project' });
      if (slot !== null && tasks.some((task) => task.project === project && task.slot === slot)) {
        return fail({ kind: 'taken' });
      }
      const rest = {
        name: written,
        title: written,
        slot,
        ...(kind === 'terminal' ? { kind: 'terminal' as const } : {}),
      };

      if (workspace) {
        const standing = (await allWorkspaces()).find((each) => each.id === workspace);
        if (!standing) return fail({ kind: 'refused', because: 'that workspace is gone.' });
        const task = into(standing, rest);
        await save([...tasks, task]);
        return { success: true as const, data: task };
      }

      if (!isolated && !branch?.trim()) {
        const task = await sharedIn(found, { project, ...rest });
        if (!task) return fail({ kind: 'refused', because: 'that checkout has moved.' });
        await save([...tasks, task]);
        return { success: true as const, data: task };
      }

      const settings = await appSettings.checkoutSettings();
      const standingOn = branch?.trim();
      const onto = standingOn || branchFor(written, settings);
      /* A branch that already has a workspace standing on it is that
         workspace: starting from it walks in beside whoever is there. */
      const already = (await allWorkspaces()).find(
        (each) => each.project === project && each.branch === onto
      );
      if (already) {
        if (!standingOn) return fail({ kind: 'already-here', name: written });
        const task = into(already, rest);
        await save([...tasks, task]);
        return { success: true as const, data: task };
      }

      const made = await cut(found, standingOn ?? signboardFor(onto), onto);
      if (!made.success) return made;
      const task = into(made.data, rest);
      await save([...(await all()), task]);
      return { success: true as const, data: task };
    },

    async files(id, like) {
      const tasks = await all();
      const task = tasks.find((candidate) => candidate.id === id);
      if (!task) return [];
      const parsed = parseNativeAbsolute(task.path);
      if (!parsed.success) return [];
      const root = parsed.data;

      /* Asking is what builds the index, and building it takes a moment, so
         the root is held open from the first question onwards: the answer to
         the second keystroke has to arrive before the third. */
      let held = indexed.get(id);
      if (!held) {
        held = new ReplicaState<ActiveRootStatus>(
          runtimes.files.activeRoot.state({ root }, 'status'),
          { onChange: () => {} }
        );
        indexed.set(id, held);
        await held.ready;
      }

      const found = await runtimes.files.searchPaths({
        root,
        query: like,
        kinds: ['file'],
        limit: NAMES,
      });
      // A checkout still being read is not an error worth saying out loud; the
      // next letter typed asks again, and by then it usually knows.
      return found.success ? found.data.hits.map((hit) => hit.path) : [];
    },

    async rename(id, title) {
      const written = title.trim();
      const tasks = await all();
      if (!written) return tasks;
      return await save(
        tasks.map((task) => (task.id === id ? { ...task, title: written, named: true } : task))
      );
    },

    /* What the agent calls the session. It only ever lands on a task he has
       not named himself: his name for a thing is the last word on it. */
    async retitle(id, title) {
      const written = title.trim();
      if (!written) return;
      const tasks = await all();
      const task = tasks.find((candidate) => candidate.id === id);
      if (!task || task.named || task.title === written) return;
      await save(tasks.map((each) => (each.id === id ? { ...each, title: written } : each)));
    },

    async retool(id) {
      const tasks = await all();
      // Only ever a not-yet-awake session's to do: once an ACP conversation
      // exists there is a transcript to lose, and the board it opens is
      // decided at open time, purely off this field.
      return await save(
        tasks.map((task) => (task.id === id && !task.kind ? { ...task, kind: 'terminal' } : task))
      );
    },

    async linkPull(id, url) {
      const tasks = await all();
      return await save(tasks.map((task) => (task.id === id ? { ...task, pull: url } : task)));
    },

    async unlinkPull(id) {
      const tasks = await all();
      return await save(
        tasks.map((task) => {
          if (task.id !== id) return task;
          const { pull: _pull, ...rest } = task;
          return rest;
        })
      );
    },

    async rehand(id, agent) {
      const tasks = await all();
      // A different agent has a different list of models, so the old choice
      // means nothing to them.
      return await save(
        tasks.map((task) => (task.id === id ? { ...task, agent, model: null } : task))
      );
    },

    async remodel(id, model) {
      const tasks = await all();
      return await save(tasks.map((task) => (task.id === id ? { ...task, model } : task)));
    },

    async abandon(id) {
      const tasks = await all();
      const going = tasks.find((task) => task.id === id);
      if (going) {
        // The branch outlives the building. Abandoning a task takes down the
        // place the work was done, not the work. A shared session never had
        // a place of its own: the folder is the project's. Nor does one in a
        // workspace: the worktree is the workspace's, and it stays standing
        // for whoever else is in there, or nobody, until it is taken down.
        if (!going.shared && !going.workspace) {
          await runtimes.workspaces.deleteWorktree(
            { workspaceId: id, deleteBranch: false },
            { timeoutMs: 0 }
          );
        }
        // The empty hook remembers this one, in case letting go of it was a
        // slip on the second press.
        lastTakenDown.set(going.project, going);
        // And the ledger remembers it too, past the end of this sitting —
        // its conversation is untouched by any of this, so there is still
        // something to read back once it is off the hook.
        await remember({
          id: going.id,
          project: going.project,
          title: going.title,
          branch: going.branch,
          endedAt: new Date().toISOString(),
        });
      }
      letGo(id);
      return await save(tasks.filter((task) => task.id !== id));
    },

    revivable(project) {
      const held = lastTakenDown.get(project);
      return held ? { title: held.title } : null;
    },

    async history(project) {
      const all = await allHistory();
      return all.filter((entry) => entry.project === project);
    },

    async revive(project) {
      const stash = lastTakenDown.get(project);
      if (!stash) return fail({ kind: 'no-such-project' });
      const found = (await projects.list()).find((candidate) => candidate.id === project);
      if (!found) return fail({ kind: 'no-such-project' });
      const rest = {
        name: stash.name,
        title: stash.title,
        named: stash.named,
        agent: stash.agent,
        model: stash.model,
        slot: stash.slot,
        kind: stash.kind,
      };

      if (stash.shared) {
        const task = await sharedIn(found, { project, ...rest });
        if (!task) return fail({ kind: 'refused', because: 'that checkout has moved.' });
        lastTakenDown.delete(project);
        await save([...(await all()), task]);
        return { success: true as const, data: task };
      }

      /* Back into the workspace it came down out of, while that is still
         standing; otherwise the branch outlived it, so a workspace is cut
         again on that same branch, not a new one. */
      let workspace = (await allWorkspaces()).find(
        (each) =>
          each.id === stash.workspace || (each.project === project && each.branch === stash.branch)
      );
      if (!workspace) {
        const made = await cut(
          found,
          signboardFor(stash.branch),
          stash.branch,
          stash.base ?? stash.branch
        );
        if (!made.success) return made;
        workspace = made.data;
      }
      lastTakenDown.delete(project);
      const task = into(workspace, rest);
      await save([...(await all()), task]);
      return { success: true as const, data: task };
    },

    async fork(id) {
      const tasks = await all();
      const original = tasks.find((task) => task.id === id);
      if (!original) return fail({ kind: 'no-such-task' });
      const found = (await projects.list()).find((candidate) => candidate.id === original.project);
      if (!found) return fail({ kind: 'no-such-project' });
      const rest = {
        name: `${original.name}-carry-on`,
        title: `${original.title} · carried on`,
        agent: original.agent,
        slot: null,
        kind: original.kind,
      };

      if (original.shared) {
        const task = await sharedIn(found, { project: original.project, ...rest });
        if (!task) return fail({ kind: 'refused', because: 'that checkout has moved.' });
        await save([...tasks, task]);
        return { success: true as const, data: task };
      }

      // Cut from the branch as it stands, into a workspace of its own: there
      // is no per-turn commit kept anywhere to cut from instead, so this is
      // the tip, not the moment the line being carried on from was actually
      // said.
      const naming = await appSettings.checkoutSettings();
      const taken = new Set((await allWorkspaces()).map((each) => each.branch));
      let branch = branchFor(rest.name, naming);
      if (taken.has(branch)) {
        branch = branchFor(`${rest.name}-${Date.now().toString(36)}`, naming);
      }
      const made = await cut(found, signboardFor(branch), branch, original.branch);
      if (!made.success) return made;
      const task = into(made.data, rest);
      await save([...(await all()), task]);
      return { success: true as const, data: task };
    },

    /** Take down every session in one project, worktrees and all. */
    async sweep(project) {
      const tasks = await all();
      const going = tasks.filter((task) => task.project === project);
      for (const task of going) {
        if (!task.shared && !task.workspace) {
          await runtimes.workspaces.deleteWorktree(
            { workspaceId: task.id, deleteBranch: false },
            { timeoutMs: 0 }
          );
        }
        letGo(task.id);
      }
      if (going.length) await save(tasks.filter((task) => task.project !== project));
      const standing = await rawWorkspaces();
      for (const each of standing.filter((one) => one.project === project)) {
        await runtimes.workspaces.deleteWorktree(
          { workspaceId: each.id, deleteBranch: false },
          { timeoutMs: 0 }
        );
      }
      await saveWorkspaces(standing.filter((one) => one.project !== project));
      lastTakenDown.delete(project);
    },

    onGone(hook) {
      gone = hook;
    },

    async dispose() {
      await Promise.all([...indexed.values()].map((held) => held.dispose()));
      indexed.clear();
    },
  };
}

function fail(error: TaskError): { success: false; error: TaskError } {
  return { success: false, error };
}

/**
 * The registry's id for the project's repository, registering it if this is the
 * first task on it.
 *
 * Registering the same path under the same id twice is a no-op success, so this
 * is safe to run every time rather than remembering whether it has been done.
 * If the project's own checkout is a worktree, the repository is its parent —
 * a worktree cannot be the thing new worktrees are cut from.
 */
async function repositoryOf(
  runtimes: MenderRuntimes,
  project: Project
): Promise<{ success: true; data: string } | { success: false; error: TaskError }> {
  const registered = await runtimes.workspaces.createWorkspace({
    workspaceId: project.id,
    path: project.path,
  });
  if (!registered.success) return fail({ kind: 'refused', because: whatItSaid(registered.error) });
  return { success: true as const, data: registered.data.parentId ?? registered.data.id };
}

/** The workspace registry's own records, read once and let go of — the
 *  board that shows them resamples on its own rewrite rather than staying
 *  subscribed here. */
async function workspaceRecords(
  runtimes: MenderRuntimes
): Promise<Record<string, WorkspaceRecord>> {
  const replica = new ReplicaState(runtimes.workspaces.records.state(undefined, 'list'), {
    onChange: () => {},
  });
  await replica.ready;
  const value = replica.current();
  await replica.dispose();
  return value;
}

/**
 * The branch the project's own checkout is actually on, when there is no
 * remote to ask instead: a repository made with `git init` and pushed up
 * rather than cloned never gets a remote HEAD pointer, so a session cut in
 * one recorded no base and its board said nothing about its history. A
 * detached checkout has no branch to give, so it comes back empty like the
 * remote lookup this backs up.
 */
async function currentBranch(
  runtimes: MenderRuntimes,
  root: Parameters<MenderRuntimes['git']['checkout']['model']['state']>[0]['checkout']
): Promise<string | null> {
  try {
    const head = await runtimes.git.checkout.model.state({ checkout: root }, 'head').snapshot();
    return head.data.kind === 'detached' ? null : shortName(head.data.ref);
  } catch {
    return null;
  }
}

/** What the registry actually said, in a sentence rather than a type name. */
function whatItSaid(error: { type: string; message?: string; path?: string }): string {
  if (error.message) return error.message;
  if (error.type === 'path-conflict') return `there is already something at ${error.path}.`;
  if (error.type === 'path-not-found') return `there is nothing at ${error.path}.`;
  if (error.type === 'repository-not-found') return 'that checkout is not a repository.';
  return error.type;
}

/**
 * The branch a task's name becomes.
 *
 * Under one prefix, so every branch a village made is obvious in `git branch`
 * and none of them collide with a branch somebody made by hand. The prefix
 * and whether a random tail rides along are both the windmill's own to set;
 * blank prefix falls back to `mender`.
 */
export function branchFor(
  name: string,
  config: { branchPrefix: string; randomSuffix: boolean } = {
    branchPrefix: '',
    randomSuffix: false,
  }
): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  const prefix = config.branchPrefix.trim().replace(/^\/+|\/+$/g, '') || 'mender';
  const tail = config.randomSuffix ? `-${randomTail()}` : '';
  return `${prefix}/${slug || 'work'}${tail}`;
}

/** What a workspace's signboard says for a branch the village cut: the name
 *  without the prefix every one of them shares. */
function signboardFor(branch: string): string {
  const cut = branch.indexOf('/');
  return cut > 0 ? branch.slice(cut + 1) : branch;
}

/** A short, unguessable tail — base-36, six characters wide. */
function randomTail(): string {
  return Math.random().toString(36).slice(2, 8).padEnd(6, '0');
}

/** Where worktrees are cut. Out of the repository, so nothing appears inside
 *  it. `MENDER_WORKTREE_ROOT` is a dev/test override and always wins; next
 *  is the windmill's own "default worktree dir" setting; last is the
 *  built-in fallback. */
async function worktreeRoot(appSettings: AppSettings): Promise<string> {
  if (process.env.MENDER_WORKTREE_ROOT) return process.env.MENDER_WORKTREE_ROOT;
  const set = (await appSettings.checkoutSettings()).worktreeDir;
  return set || join(homedir(), 'mender', 'worktrees');
}

const ran = promisify(execFile);

/** Sets a worktree's own git identity, local to that checkout alone. */
async function identityIn(
  runtimes: MenderRuntimes,
  path: string,
  name?: string,
  email?: string
): Promise<void> {
  try {
    const env = await runtimes.env.current();
    if (name) await ran('git', ['config', 'user.name', name], { cwd: path, env });
    if (email) await ran('git', ['config', 'user.email', email], { cwd: path, env });
  } catch {
    // A worktree that refuses a local config write still works; it just
    // commits under whatever git would have used anyway.
  }
}

/** Where Mender keeps its own state on this machine. */
function userDataDir(): string {
  return process.env.MENDER_DATA_DIR ?? app.getPath('userData');
}
