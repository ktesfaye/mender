import { basename, join } from 'node:path';
import { createJsonFileKeyValueStore } from '@emdash/core/primitives/kv/node';
import { parseNativeAbsolute } from '@emdash/core/primitives/path/api';
import { available, MAX_STAGE, type Stages } from '@mender/village';
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
  /** The village state these projects make: plot -> stage. */
  stages(): Promise<Stages>;
}

const KEY = 'projects';

export function createProjects(runtimes: MenderRuntimes): Projects {
  const store = createJsonFileKeyValueStore({ path: join(userDataDir(), 'projects.json') });

  const list = async (): Promise<Project[]> => {
    const loaded = await store.get(KEY);
    if (!loaded.success || !Array.isArray(loaded.data)) return [];
    // Everything that is on the island is on it at the stage that is drawn.
    return (loaded.data as unknown as Project[]).map((project) =>
      project.stage === MAX_STAGE ? project : { ...project, stage: MAX_STAGE }
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
        /* Straight to the finished settlement.
           The stages in between are the artist's work in progress: nought is a
           wild lane and five is a settlement he has actually finished, and one
           through four are sketches that do not yet stand up next to it. A
           district appears built until those are drawn. */
        stage: MAX_STAGE,
        foundedAt: new Date().toISOString(),
      };
      await save([...projects, project]);
      return { success: true, data: project };
    },

    async abandon(id) {
      const projects = await list();
      return await save(projects.filter((project) => project.id !== id));
    },
  };
}

/** Where Mender keeps its own state on this machine. */
function userDataDir(): string {
  return process.env.MENDER_DATA_DIR ?? app.getPath('userData');
}
