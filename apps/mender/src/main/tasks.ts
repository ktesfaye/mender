import { execFile } from 'node:child_process';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';
import { createJsonFileKeyValueStore } from '@emdash/core/primitives/kv/node';
import { parseNativeAbsolute } from '@emdash/core/primitives/path/api';
import type { ActiveRootStatus } from '@emdash/core/runtimes/file-search/api';
import { shortName } from '@emdash/core/runtimes/git/api';
import { ReplicaState } from '@emdash/wire/live';
import { cell, type Cell } from '@emdash/wire/state';
import { app } from 'electron';
import type { Project, Projects } from './projects';
import type { MenderRuntimes } from './runtimes';

/**
 * The tasks, which are the sessions.
 *
 * A task is a checkout of its own: its own branch, its own worktree, its own
 * working tree to leave in a mess without touching anyone else's. That is the
 * whole reason it is a task and not just a conversation — two agents loose in
 * one working tree trample each other, and nothing in the village is worth
 * that.
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
    kind?: 'chat' | 'terminal'
  ): Promise<{ success: true; data: Task } | { success: false; error: TaskError }>;
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
  revive(project: string): Promise<{ success: true; data: Task } | { success: false; error: TaskError }>;
  /** Take down every session in one project, for when the project is forgotten. */
  sweep(project: string): Promise<void>;
  dispose(): Promise<void>;
}

/** How many names a checkout offers up at once. */
const NAMES = 12;

const KEY = 'tasks';
const HISTORY_KEY = 'history';
/** How many ended sessions the ledger keeps before the oldest fall off. */
const HISTORY_KEPT = 200;

export function createTasks(runtimes: MenderRuntimes, projects: Projects): Tasks {
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

  const all = async (): Promise<Task[]> => {
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

  const save = async (tasks: Task[]): Promise<Task[]> => {
    await store.set(KEY, tasks as unknown as never);
    standing.set(tasks);
    return tasks;
  };

  // What is on disk, published once, so anyone watching starts out right
  // rather than empty until the first thing changes.
  void all().then((tasks) => standing.set(tasks));

  return {
    watch: () => standing,

    async list(project) {
      const tasks = await all();
      return project ? tasks.filter((task) => task.project === project) : tasks;
    },

    async begin(project, name, slot, kind) {
      const written = name.trim();
      if (!written) return fail({ kind: 'nameless' });

      const tasks = await all();
      const found = (await projects.list()).find((candidate) => candidate.id === project);
      if (!found) return fail({ kind: 'no-such-project' });

      const branch = branchFor(written);
      const here = tasks.filter((task) => task.project === project);
      if (here.some((task) => task.branch === branch)) {
        return fail({ kind: 'already-here', name: written });
      }
      if (slot !== null && here.some((task) => task.slot === slot)) return fail({ kind: 'taken' });

      const repository = await repositoryOf(runtimes, found);
      if (!repository.success) return repository;

      const parsed = parseNativeAbsolute(found.path);
      if (!parsed.success) return fail({ kind: 'refused', because: 'that checkout has moved.' });
      // A task starts from the branch the project calls home, not from whatever
      // happens to be checked out. A repository made with `git init` and pushed
      // up rather than cloned has no remote HEAD pointer to ask, so the next
      // fallback is the branch the project's own checkout is actually on, and
      // only a detached checkout falls all the way back to HEAD itself.
      const asked = await runtimes.git.repository.getDefaultBranch({
        repository: parsed.data,
        remote: 'origin',
      });
      const baseRef =
        (asked.success && asked.data.branch) || (await currentBranch(runtimes, parsed.data)) || 'HEAD';

      /* Under the folder's own name, not the project's: a project renamed on
         the island is not a reason for its next worktree to live somewhere
         else from its last. */
      const path = join(worktreeRoot(), basename(found.path), branch.replaceAll('/', '-'));
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
      if (!made.success) {
        return fail({ kind: 'refused', because: whatItSaid(made.error) });
      }

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
        await runtimes.workspaces.activateWorkspace(
          { workspaceId: made.data.id },
          { timeoutMs: 0 }
        );
      } catch {
        // Nothing this call can do about a registry that would not answer.
      }

      const task: Task = {
        id: made.data.id,
        project,
        name: written,
        title: written,
        branch,
        base: baseRef === 'HEAD' ? null : baseRef,
        slot,
        path: made.data.path,
        startedAt: new Date().toISOString(),
        kind: kind === 'terminal' ? 'terminal' : undefined,
      };
      await save([...tasks, task]);
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
        // place the work was done, not the work.
        await runtimes.workspaces.deleteWorktree(
          { workspaceId: id, deleteBranch: false },
          { timeoutMs: 0 }
        );
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
      indexed.get(id)?.dispose();
      indexed.delete(id);
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

      const repository = await repositoryOf(runtimes, found);
      if (!repository.success) return repository;

      const parsed = parseNativeAbsolute(found.path);
      if (!parsed.success) return fail({ kind: 'refused', because: 'that checkout has moved.' });

      // The branch outlived the building, so this is the same branch, not a
      // new one — `createWorktree` reuses an existing `refs/heads/<branch>`
      // rather than cutting from `baseRef` when it finds one already there.
      const path = join(worktreeRoot(), basename(found.path), stash.branch.replaceAll('/', '-'));
      const made = await runtimes.workspaces.createWorktree(
        {
          workspaceId: crypto.randomUUID(),
          repositoryId: repository.data,
          branch: stash.branch,
          baseRef: stash.base ?? stash.branch,
          path,
          preservePatterns: [],
        },
        { timeoutMs: 0 }
      );
      if (!made.success) return fail({ kind: 'refused', because: whatItSaid(made.error) });

      if (found.gitName || found.gitEmail) {
        await identityIn(runtimes, made.data.path, found.gitName, found.gitEmail);
      }
      try {
        await runtimes.workspaces.activateWorkspace(
          { workspaceId: made.data.id },
          { timeoutMs: 0 }
        );
      } catch {
        // Nothing this call can do about a registry that would not answer.
      }

      lastTakenDown.delete(project);
      const task: Task = {
        id: made.data.id,
        project,
        name: stash.name,
        title: stash.title,
        named: stash.named,
        agent: stash.agent,
        model: stash.model,
        branch: stash.branch,
        base: stash.base,
        slot: stash.slot,
        path: made.data.path,
        startedAt: new Date().toISOString(),
      };
      await save([...(await all()), task]);
      return { success: true as const, data: task };
    },

    /** Take down every session in one project, worktrees and all. */
    async sweep(project) {
      const tasks = await all();
      const going = tasks.filter((task) => task.project === project);
      for (const task of going) {
        await runtimes.workspaces.deleteWorktree(
          { workspaceId: task.id, deleteBranch: false },
          { timeoutMs: 0 }
        );
        indexed.get(task.id)?.dispose();
        indexed.delete(task.id);
      }
      if (going.length) await save(tasks.filter((task) => task.project !== project));
      lastTakenDown.delete(project);
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
 * and none of them collide with a branch somebody made by hand.
 */
export function branchFor(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `mender/${slug || 'work'}`;
}

/** Where worktrees are cut. Out of the repository, so nothing appears inside it. */
function worktreeRoot(): string {
  return process.env.MENDER_WORKTREE_ROOT ?? join(homedir(), 'mender', 'worktrees');
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
