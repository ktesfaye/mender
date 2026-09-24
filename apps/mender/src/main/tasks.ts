import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { createJsonFileKeyValueStore } from '@emdash/core/primitives/kv/node';
import { parseNativeAbsolute } from '@emdash/core/primitives/path/api';
import type { ActiveRootStatus } from '@emdash/core/runtimes/file-search/api';
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
    slot: number | null
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
  /** Take down every session in one project, for when the project is forgotten. */
  sweep(project: string): Promise<void>;
  dispose(): Promise<void>;
}

/** How many names a checkout offers up at once. */
const NAMES = 12;

const KEY = 'tasks';

export function createTasks(runtimes: MenderRuntimes, projects: Projects): Tasks {
  const store = createJsonFileKeyValueStore({ path: join(userDataDir(), 'tasks.json') });
  const standing = cell<Task[]>([], { name: 'tasks:all' });
  /* Which checkouts have had their contents read. Holding one of these open is
     what keeps that worktree's index alive and watched. */
  const indexed = new Map<string, ReplicaState<ActiveRootStatus>>();

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

    async begin(project, name, slot) {
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
      // happens to be checked out; HEAD is the fallback for a checkout with no
      // remote to ask.
      const asked = await runtimes.git.repository.getDefaultBranch({
        repository: parsed.data,
        remote: 'origin',
      });
      const baseRef = (asked.success && asked.data.branch) || 'HEAD';

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
      }
      indexed.get(id)?.dispose();
      indexed.delete(id);
      return await save(tasks.filter((task) => task.id !== id));
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

/** Where Mender keeps its own state on this machine. */
function userDataDir(): string {
  return process.env.MENDER_DATA_DIR ?? app.getPath('userData');
}
