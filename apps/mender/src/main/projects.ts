import { basename, join } from 'node:path';
import { createJsonFileKeyValueStore } from '@emdash/core/primitives/kv/node';
import { parseNativeAbsolute } from '@emdash/core/primitives/path/api';
import { available, type Stages } from '@mender/village';
import { app, dialog } from 'electron';
import type { MenderRuntimes } from './runtimes';

/**
 * The projects, which are the districts.
 *
 * This is ours, not upstream's. Emdash keeps projects in a SQLite schema with
 * worktree roots, remotes, per-host settings and a migration chain behind it;
 * what the island needs to know is which checkouts exist, where each one stands
 * and how far it has grown. When a project needs more than that it can grow a
 * record, but it will not inherit one.
 */
export interface Project {
  readonly id: string;
  /** What it is called on the island. The folder's name, until renamed. */
  readonly name: string;
  /** The checkout, as the filesystem spells it. */
  readonly path: string;
  /** Which plot it took. Plots are handed out from the camp outward. */
  readonly plot: string;
  /** How far the district has grown, 0..5. */
  readonly stage: number;
  readonly foundedAt: string;
}

export type FoundError =
  | { kind: 'cancelled' }
  | { kind: 'not-a-repository'; path: string }
  | { kind: 'already-founded'; path: string }
  | { kind: 'island-full' };

export interface Projects {
  list(): Promise<Project[]>;
  /** Ask for a folder and put a district on it. */
  found(): Promise<{ success: true; data: Project } | { success: false; error: FoundError }>;
  abandon(id: string): Promise<Project[]>;
  /** Who takes a project's sessions down when the project is forgotten. */
  sweeps(sweep: (project: string) => Promise<void>): void;
  /** The village state these projects make: plot -> stage. */
  stages(): Promise<Stages>;
}

const KEY = 'projects';

/**
 * The stage every district stands at.
 *
 * The stages in between are the artist's work in progress: nought is a wild
 * lane, and the top of the range is a settlement so full it leaves a district
 * no room to say anything about itself. Four is the last one that is finished
 * and still has ground to spare. Nothing grows through the others until they
 * are drawn, so a district is simply built when it is founded.
 */
const SETTLED = 4;

export function createProjects(runtimes: MenderRuntimes): Projects {
  let sweeping: ((project: string) => Promise<void>) | null = null;
  const store = createJsonFileKeyValueStore({ path: join(userDataDir(), 'projects.json') });

  const list = async (): Promise<Project[]> => {
    const loaded = await store.get(KEY);
    if (!loaded.success || !Array.isArray(loaded.data)) return [];
    // Everything that is on the island is on it at the stage that is drawn.
    return (loaded.data as unknown as Project[]).map((project) =>
      project.stage === SETTLED ? project : { ...project, stage: SETTLED }
    );
  };

  const save = async (projects: Project[]): Promise<Project[]> => {
    await store.set(KEY, projects as unknown as never);
    return projects;
  };

  const stagesOf = (projects: readonly Project[]): Stages =>
    Object.fromEntries(projects.map((project) => [project.plot, project.stage]));

  return {
    list,
    stages: async () => stagesOf(await list()),

    async found() {
      const projects = await list();
      const free = available(stagesOf(projects));
      // Twelve plots, and the last one is an island of its own across the water.
      if (!free.length) return { success: false, error: { kind: 'island-full' } };

      const chosen = await dialog.showOpenDialog({
        title: 'Found a project',
        message: 'Which checkout is moving in?',
        properties: ['openDirectory', 'createDirectory'],
        buttonLabel: 'Found',
      });
      const path = chosen.filePaths[0];
      if (chosen.canceled || !path) return { success: false, error: { kind: 'cancelled' } };

      if (projects.some((project) => project.path === path)) {
        return { success: false, error: { kind: 'already-founded', path } };
      }

      // A district stands on a checkout. Asking git rather than looking for a
      // `.git` directory is what makes a worktree, a submodule and a bare repo
      // answer correctly.
      const parsed = parseNativeAbsolute(path);
      if (!parsed.success) return { success: false, error: { kind: 'not-a-repository', path } };
      const inspection = await runtimes.git.inspectPath({ path: parsed.data });
      if (!inspection.success || inspection.data.kind !== 'repository') {
        return { success: false, error: { kind: 'not-a-repository', path } };
      }

      const project: Project = {
        id: crypto.randomUUID(),
        name: basename(path),
        path,
        plot: free[0],
        stage: SETTLED,
        foundedAt: new Date().toISOString(),
      };
      await save([...projects, project]);
      return { success: true, data: project };
    },

    async abandon(id) {
      const projects = await list();
      /* Whoever is working in there goes home first. A project forgotten with
         its sessions still cut leaves worktrees on the disk that nothing in
         the village can reach any more, which is the worst of both. */
      await sweeping?.(id);
      return await save(projects.filter((project) => project.id !== id));
    },

    /* Who takes the sessions down. Set after construction because the tasks
       need the projects to exist and the projects need this: one of the two
       has to be told about the other afterwards, and it is this one. */
    sweeps(sweep) {
      sweeping = sweep;
    },
  };
}

/** Where Mender keeps its own state on this machine. */
function userDataDir(): string {
  return process.env.MENDER_DATA_DIR ?? app.getPath('userData');
}
