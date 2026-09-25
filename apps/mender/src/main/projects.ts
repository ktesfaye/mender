import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';
import { createJsonFileKeyValueStore } from '@emdash/core/primitives/kv/node';
import { parseNativeAbsolute } from '@emdash/core/primitives/path/api';
import { COMMON, createPlan, type DistrictSpec } from '@mender/village';
import { app, dialog } from 'electron';
import { keep, picturesIn, shown, type Picture } from './pictures';
import type { MenderRuntimes } from './runtimes';

const ran = promisify(execFile);

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
  /** Where its own picture was taken from, if it has one. The rack's prop if not. */
  readonly picture?: string;
  /** That picture, ready for the page. Never stored: read off the kept copy. */
  readonly icon?: string;
  /** Who a session's commits go out as, when this project says otherwise. */
  readonly gitName?: string;
  readonly gitEmail?: string;
}

/** Where a project's picture is to come from. */
export type PictureFrom = { kind: 'in'; path: string } | { kind: 'own' } | { kind: 'none' };

export type PictureError =
  | { kind: 'cancelled' }
  | { kind: 'unreadable'; path: string }
  | { kind: 'no-such-project' };

/**
 * What a new session in this project takes with it.
 *
 * A worktree is cut from what git knows, so everything git is told to ignore
 * is missing from it: the `.env`, the local keys, the installed dependencies.
 * These are the ones in the checkout that could go along, and which do.
 */
export interface Carrying {
  /** Where new sessions are cut from. */
  base: string | null;
  carries: { path: string; on: boolean; folder: boolean }[];
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
  /** Called something else on the island. The folder keeps its name. */
  rename(id: string, name: string): Promise<Project[]>;
  /** The pictures in its checkout, likeliest to be its own logo first. */
  pictures(id: string, many: number): Promise<{ pictures: Picture[]; more: number }>;
  /** Give it a face, or take it back to the rack's own. */
  picture(
    id: string,
    from: PictureFrom
  ): Promise<{ success: true; data: Project } | { success: false; error: PictureError }>;
  carrying(id: string): Promise<Carrying>;
  /** Send something along into every new session, or stop sending it. */
  carry(id: string, path: string, on: boolean): Promise<Carrying>;
  /** Set or clear who this project's sessions commit as. Blank clears it. */
  identity(id: string, name: string, email: string): Promise<Project[]>;
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

  const stored = async (): Promise<Project[]> => {
    const loaded = await store.get(KEY);
    if (!loaded.success || !Array.isArray(loaded.data)) return [];
    /* A project founded before the growth model went says `plot` and carries a
       stage. The id is the same id, so it keeps its district; the stage is
       dropped, because a district is either his or it is sea and there was
       never anything in between. */
    return (loaded.data as unknown as (Project & { plot?: string; stage?: number })[]).map(
      ({ stage: _stage, plot, icon: _icon, ...project }) => ({
        ...project,
        district: project.district ?? plot ?? '',
      })
    );
  };

  const list = async (): Promise<Project[]> =>
    Promise.all(
      (await stored()).map(async (project) => {
        const icon = project.picture ? await shown(iconPath(project.id)) : undefined;
        return icon ? { ...project, icon } : project;
      })
    );

  const save = async (projects: Project[]): Promise<Project[]> => {
    await store.set(
      KEY,
      projects.map(({ icon: _icon, ...project }) => project) as unknown as never
    );
    return list();
  };

  const find = async (id: string): Promise<Project | undefined> =>
    (await stored()).find((project) => project.id === id);

  /* The registry keeps what a project's worktrees carry, against the
     checkout's own record, which is registered under the project's id. Doing
     it again is free: the same id at the same path is a no-op. */
  const registered = async (project: Project): Promise<string | null> => {
    const made = await runtimes.workspaces.createWorkspace({
      workspaceId: project.id,
      path: project.path,
    });
    return made.success ? project.id : null;
  };

  const carryingIn = async (project: Project): Promise<Carrying> => {
    const workspace = await registered(project);
    const config = workspace
      ? await runtimes.workspaces.getProjectConfig({ workspaceId: workspace })
      : null;
    const on = new Set(config?.success ? config.data.resolved.preservePatterns.value : []);
    const left = await ignoredIn(project.path);
    const carries = [
      ...left.map((path) => ({
        path: path.replace(/\/$/, ''),
        on: on.has(path.replace(/\/$/, '')),
        folder: path.endsWith('/'),
      })),
      /* Anything already carried that is not in the checkout right now is
         still carried, and still has to be possible to stop. */
      ...[...on]
        .filter((path) => !left.some((one) => one.replace(/\/$/, '') === path))
        .map((path) => ({ path, on: true, folder: false })),
    ];
    const parsed = parseNativeAbsolute(project.path);
    const asked = parsed.success
      ? await runtimes.git.repository.getDefaultBranch({
          repository: parsed.data,
          remote: 'origin',
        })
      : null;
    return { base: (asked?.success && asked.data.branch) || null, carries };
  };

  const standingIn = (projects: readonly Project[]): string[] => [
    ...COMMON,
    ...projects.map((project) => project.district),
  ];

  return {
    list,
    standing: async () => standingIn(await list()),

    async found() {
      const projects = await stored();
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

    async rename(id, name) {
      const written = name.trim();
      const projects = await stored();
      if (!written) return list();
      return save(
        projects.map((project) => (project.id === id ? { ...project, name: written } : project))
      );
    },

    async pictures(id, many) {
      const project = await find(id);
      return project ? picturesIn(project.path, many) : { pictures: [], more: 0 };
    },

    async picture(id, from) {
      const projects = await stored();
      const project = projects.find((one) => one.id === id);
      if (!project) return { success: false, error: { kind: 'no-such-project' } };

      if (from.kind === 'none') {
        await rm(iconPath(id), { force: true });
        const { picture: _picture, ...bare } = project;
        const saved = await save(projects.map((one) => (one.id === id ? bare : one)));
        return { success: true, data: saved.find((one) => one.id === id) ?? bare };
      }

      let path = from.kind === 'in' ? from.path : '';
      if (from.kind === 'own') {
        const chosen = await dialog.showOpenDialog({
          title: `A picture for ${project.name}`,
          message: 'Which picture stands for it on the rack?',
          properties: ['openFile'],
          filters: [
            {
              name: 'Pictures',
              extensions: ['png', 'jpg', 'jpeg', 'svg', 'icns', 'ico', 'webp', 'gif'],
            },
          ],
          buttonLabel: 'Use this',
        });
        const picked = chosen.filePaths[0];
        if (chosen.canceled || !picked) return { success: false, error: { kind: 'cancelled' } };
        path = picked;
      }

      if (!(await keep(path, project.path, iconPath(id)))) {
        return { success: false, error: { kind: 'unreadable', path } };
      }
      const saved = await save(
        projects.map((one) => (one.id === id ? { ...one, picture: path } : one))
      );
      const now = saved.find((one) => one.id === id);
      return now
        ? { success: true, data: now }
        : { success: false, error: { kind: 'no-such-project' } };
    },

    async carrying(id) {
      const project = await find(id);
      return project ? carryingIn(project) : { base: null, carries: [] };
    },

    async carry(id, path, on) {
      const project = await find(id);
      if (!project) return { base: null, carries: [] };
      const workspace = await registered(project);
      if (workspace) {
        const config = await runtimes.workspaces.getProjectConfig({ workspaceId: workspace });
        const had = config.success ? config.data.resolved.preservePatterns.value : [];
        const next = on ? [...new Set([...had, path])] : had.filter((one) => one !== path);
        await runtimes.workspaces.patchPersonalProjectConfig({
          workspaceId: workspace,
          patch: { preservePatterns: next },
        });
      }
      return carryingIn(project);
    },

    async identity(id, name, email) {
      const projects = await stored();
      const written = { name: name.trim(), email: email.trim() };
      return save(
        projects.map((project) => {
          if (project.id !== id) return project;
          const { gitName: _n, gitEmail: _e, ...bare } = project;
          return {
            ...bare,
            ...(written.name ? { gitName: written.name } : {}),
            ...(written.email ? { gitEmail: written.email } : {}),
          };
        })
      );
    },

    async abandon(id) {
      const projects = await stored();
      /* Whoever is working in there goes home first. A project forgotten with
         its sessions still cut leaves worktrees on the disk that nothing in
         the village can reach any more, which is the worst of both. */
      await sweeping?.(id);
      await rm(iconPath(id), { force: true });
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

/** Where a project's picture is kept once it has been given one. */
function iconPath(id: string): string {
  return join(userDataDir(), 'icons', `${id}.png`);
}

/**
 * What git ignores in a checkout that a new session might want.
 *
 * The top of the checkout, whole folders folded up the way git folds them, and
 * anything that looks like somebody's local settings anywhere a few folders
 * down. Not what a build makes: nobody wants yesterday's `dist` in a fresh
 * worktree, and offering it only makes the real ones harder to find.
 */
async function ignoredIn(checkout: string): Promise<string[]> {
  try {
    const { stdout } = await ran(
      'git',
      ['ls-files', '-o', '-i', '--exclude-standard', '--directory', '--no-empty-directory'],
      { cwd: checkout, maxBuffer: 16 * 1024 * 1024 }
    );
    return stdout
      .split('\n')
      .filter(Boolean)
      .filter((path) => {
        const bare = path.replace(/\/$/, '');
        const name = bare.split('/').at(-1) ?? bare;
        if (MADE.test(name) || name === '.DS_Store') return false;
        if (!bare.includes('/')) return true;
        return bare.split('/').length <= 4 && LOCAL.test(name);
      })
      .slice(0, 40);
  } catch {
    return [];
  }
}

const MADE =
  /^(dist|build|out|release|target|coverage|\.next|\.nuxt|\.turbo|\.cache|\.nx|\.gradle|\.dart_tool|__pycache__|\.pytest_cache|tmp|logs?|.*\.log)$/;
const LOCAL =
  /^\.env|\.local$|\.local\.|secret|credential|\.pem$|\.key$|_key$|local\.properties$|node_modules$/i;

/** Where Mender keeps its own state on this machine. */
function userDataDir(): string {
  return process.env.MENDER_DATA_DIR ?? app.getPath('userData');
}
