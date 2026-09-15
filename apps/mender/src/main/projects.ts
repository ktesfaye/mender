import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { createJsonFileKeyValueStore } from '@emdash/core/primitives/kv/node';
import { parseNativeAbsolute } from '@emdash/core/primitives/path/api';
import { COMMON, createPlan, type DistrictSpec } from '@mender/village';
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
  /** Which of his districts it took. They are handed out from the fire outward. */
  readonly district: string;
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
  /** The state these projects make: the districts that are standing. */
  standing(): Promise<string[]>;
}

const KEY = 'projects';

/**
 * Which districts a checkout can stand on.
 *
 * Not the camp and not the islet: those are common ground and are on the map
 * from the first moment, with or without a project. Everything else is one of
 * his eleven, and a project takes one whole.
 */
function plan(): ReturnType<typeof createPlan> {
  cached ??= createPlan(
    (
      JSON.parse(readFileSync(join(assetsDir(), 'districts.json'), 'utf8')) as {
        districts: DistrictSpec[];
      }
    ).districts
  );
  return cached;
}
let cached: ReturnType<typeof createPlan> | undefined;

export function createProjects(runtimes: MenderRuntimes): Projects {
  let sweeping: ((project: string) => Promise<void>) | null = null;
  const store = createJsonFileKeyValueStore({ path: join(userDataDir(), 'projects.json') });

  const list = async (): Promise<Project[]> => {
    const loaded = await store.get(KEY);
    if (!loaded.success || !Array.isArray(loaded.data)) return [];
    /* A project founded before the growth model went says `plot` and carries a
       stage. The id is the same id, so it keeps its district; the stage is
       dropped, because a district is either his or it is sea and there was
       never anything in between. */
    return (loaded.data as unknown as (Project & { plot?: string; stage?: number })[]).map(
      ({ stage: _stage, plot, ...project }) => ({
        ...project,
        district: project.district ?? plot ?? '',
      })
    );
  };

  const save = async (projects: Project[]): Promise<Project[]> => {
    await store.set(KEY, projects as unknown as never);
    return projects;
  };

  const standingIn = (projects: readonly Project[]): string[] => [
    ...COMMON,
    ...projects.map((project) => project.district),
  ];

  return {
    list,
    standing: async () => standingIn(await list()),

    async found() {
      const projects = await list();
      /* The next district is the first one his growth order offers that nobody
         is on and that can be walked to from what is already there. The order
         is measured off his own partition, so the island fills out round the
         middle rather than growing an arm. */
      const taken = new Set(projects.map((project) => project.district));
      const here = new Set(standingIn(projects));
      const free = plan()
        .order()
        .filter(
          (district) =>
            !COMMON.includes(district) &&
            !taken.has(district) &&
            plan().reachable(here).includes(district)
        );
      // Eleven districts, and every one of them taken.
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
        district: free[0],
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

/** Where the artist's map and his partition are kept. */
function assetsDir(): string {
  return join(app.getAppPath(), 'assets', 'village');
}

/** Where Mender keeps its own state on this machine. */
function userDataDir(): string {
  return process.env.MENDER_DATA_DIR ?? app.getPath('userData');
}
