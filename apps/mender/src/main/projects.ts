import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';
import { createJsonFileKeyValueStore } from '@emdash/core/primitives/kv/node';
import { parseNativeAbsolute } from '@emdash/core/primitives/path/api';
import { gitContract } from '@emdash/core/runtimes/git/api';
import { LiveJobFailedError, createLiveJobReplicaCache } from '@emdash/wire/live';
import {
  CAMP,
  createPlan,
  ISLET,
  faultIn,
  landOf,
  moved,
  type DistrictSpec,
  type Move,
} from '@mender/village';
import { app, dialog } from 'electron';
import type { AppSettings } from './app-settings';
import { keep, picturesIn, shown, type Picture } from './pictures';
import type { MenderRuntimes } from './runtimes';
import { loadSubdistricts } from './village';

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
  /** What every session here carries into its spawn beyond git — `NAME=value`
      lines. */
  readonly env?: string;
  /** What search and file watching leave out here, beyond the default
      policy — one glob a line. */
  readonly excludes?: string;
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

/** What runs at each point in a worktree's life. Blank means nothing does. */
export interface Scripts {
  prepare: string;
  setup: string;
  run: string;
  teardown: string;
}

export type ScriptKind = keyof Scripts;

export type FoundError =
  | { kind: 'cancelled' }
  | { kind: 'not-a-repository'; path: string }
  | { kind: 'already-founded'; path: string }
  | { kind: 'island-full' }
  | { kind: 'clone-failed'; said: string }
  | { kind: 'create-failed'; said: string };

export type RelinkError =
  | { kind: 'cancelled' }
  | { kind: 'not-a-repository'; path: string }
  | { kind: 'no-such-project' };

/** How a checkout is meant to arrive: already on disk, cloned, or made fresh. */
export type FoundFrom =
  | { kind: 'folder' }
  | { kind: 'clone'; url: string }
  | { kind: 'create'; name: string; private: boolean }
  /** A folder dragged straight off the Finder: the path is already known. */
  | { kind: 'path'; path: string };

export interface Projects {
  list(): Promise<Project[]>;
  /** Put a district on a checkout: pick a folder, clone one, or make one new. */
  found(
    from?: FoundFrom
  ): Promise<{ success: true; data: Project } | { success: false; error: FoundError }>;
  abandon(id: string): Promise<Project[]>;
  /** Called something else on the island. The folder keeps its name. */
  rename(id: string, name: string): Promise<Project[]>;
  /** Stand them on the rack in this order; anybody left out keeps to the end. */
  reorder(ids: string[]): Promise<Project[]>;
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
  /** What every session here carries into its spawn beyond git — `NAME=value`
      lines. Blank clears it. */
  setEnv(id: string, text: string): Promise<Project[]>;
  /** What search and file watching leave out here, beyond the default
      policy — one glob a line. Blank clears it. */
  setExcludes(id: string, text: string): Promise<Project[]>;
  /** What runs when a worktree is cut: prepare, setup, run, teardown. */
  scripts(id: string): Promise<Scripts>;
  /** Blank clears that script, back to nothing running for it. */
  script(id: string, which: ScriptKind, value: string): Promise<Scripts>;
  /** Points a project whose own folder has gone missing at one that is
      actually there. */
  relink(
    id: string
  ): Promise<{ success: true; data: Project } | { success: false; error: RelinkError }>;
  /** Who takes a project's sessions down when the project is forgotten. */
  sweeps(sweep: (project: string) => Promise<void>): void;
  /** The state these projects make: the districts that are standing. */
  standing(): Promise<string[]>;
  /** Every place this project could go instead, and what is wrong with the
      ones it can't: null is a place it can. `off` is taking it off the map. */
  moves(id: string): Promise<{ places: Record<string, string | null>; off: string | null }>;
  /** Stand it somewhere else. Onto somebody's place swaps the two of them. */
  move(
    id: string,
    to: string
  ): Promise<{ success: true; data: Project[] } | { success: false; error: string }>;
}

const KEY = 'projects';

/**
 * Which districts a checkout can stand on.
 *
 * Anywhere but the camp, which is where the village starts and nobody's own.
 * The islet is on the map from the first moment with or without anybody on it,
 * but a project may live there too; everything else is one of his eleven, and
 * a project takes one whole.
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

export function createProjects(runtimes: MenderRuntimes, appSettings: AppSettings): Projects {
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
        const available = existsSync(project.path);
        return { ...project, ...(icon ? { icon } : {}), available };
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

  const scriptsIn = async (project: Project): Promise<Scripts> => {
    const workspace = await registered(project);
    const config = workspace
      ? await runtimes.workspaces.getProjectConfig({ workspaceId: workspace })
      : null;
    const resolved = config?.success ? config.data.resolved : null;
    return {
      prepare: resolved?.prepare?.value ?? '',
      setup: resolved?.setup?.value ?? '',
      run: resolved?.run?.value ?? '',
      teardown: resolved?.teardown?.value ?? '',
    };
  };

  const carryingIn = async (project: Project): Promise<Carrying> => {
    const workspace = await registered(project);
    const config = workspace
      ? await runtimes.workspaces.getProjectConfig({ workspaceId: workspace })
      : null;
    const on = new Set(config?.success ? config.data.resolved.preservePatterns.value : []);
    const left = await ignoredIn(runtimes, project.path);
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
    CAMP,
    ...projects.map((project) => project.district),
  ];

  /* Where everybody stands, and what one move would do to it. */
  const arranged = (projects: readonly Project[]): Map<string, string> =>
    new Map(projects.map((project) => [project.id, project.district]));
  const faultAfter = (projects: readonly Project[], id: string, move: Move): string | null =>
    faultIn(
      plan(),
      loadSubdistricts(),
      moved(arranged(projects), id, move),
      (who) => projects.find((project) => project.id === who)?.name ?? 'somebody'
    );

  return {
    list,
    standing: async () => standingIn(await list()),

    async moves(id) {
      const projects = await stored();
      const places: Record<string, string | null> = {};
      for (const place of [
        ...plan()
          .order()
          .filter((one) => one !== CAMP),
        ...loadSubdistricts().map((one) => one.id),
      ]) {
        places[place] = faultAfter(projects, id, { kind: 'to', place });
      }
      return { places, off: faultAfter(projects, id, { kind: 'off' }) };
    },

    async move(id, to) {
      const projects = await stored();
      const project = projects.find((one) => one.id === id);
      if (!project) return { success: false, error: 'that project is gone' };
      const whole = plan().order() as readonly string[];
      const known = whole.includes(to) || loadSubdistricts().some((one) => one.id === to);
      if (!known || to === CAMP)
        return { success: false, error: 'nobody can live there' };
      const fault = faultAfter(projects, id, { kind: 'to', place: to });
      if (fault) return { success: false, error: fault };
      const after = moved(arranged(projects), id, { kind: 'to', place: to });
      return {
        success: true,
        data: await save(
          projects.map((one) => ({ ...one, district: after.get(one.id) ?? one.district }))
        ),
      };
    },

    async found(from = { kind: 'folder' }) {
      const projects = await stored();
      /* The next district is the first one his growth order offers that nobody
         is on and that can be walked to from what is already there. The order
         is measured off his own partition, so the island fills out round the
         middle rather than growing an arm. */
      const taken = new Set(projects.map((project) => project.district));
      const subdistricts = loadSubdistricts();
      const here = new Set(standingIn(projects).map((id) => landOf(id, subdistricts)));
      const free: string[] = plan()
        .order()
        .filter(
          (district) =>
            district !== CAMP &&
            !taken.has(district) &&
            plan().reachable(here).includes(district)
        );
      /* The islet is moored to whatever coast there is, so it is never out of
         reach; it is simply the last of his to be lived on. */
      if (!free.length && !taken.has(ISLET)) free.push(ISLET);
      /* Only once all twelve of his are taken does a big district give up a
         piece, and in the order the pieces are listed. */
      if (!free.length) {
        free.push(...subdistricts.map((one) => one.id).filter((id) => !taken.has(id)));
      }
      // Every district and every piece taken. Checked before a clone or a
      // fresh repository spends any time, since neither would have anywhere
      // to stand.
      if (!free.length) return { success: false, error: { kind: 'island-full' } };

      const path =
        from.kind === 'folder'
          ? await pickFolder()
          : from.kind === 'path'
            ? ({ success: true, data: from.path } as Landed)
            : from.kind === 'clone'
              ? await cloneInto(runtimes, appSettings, from.url)
              : await createInto(runtimes, appSettings, from.name, from.private);
      if (!path.success) return path;

      if (projects.some((project) => project.path === path.data)) {
        return { success: false, error: { kind: 'already-founded', path: path.data } };
      }

      // A district stands on a checkout. Asking git rather than looking for a
      // `.git` directory is what makes a worktree, a submodule and a bare repo
      // answer correctly. A clone or a fresh repository is already known-good,
      // but asked again anyway: the cost is one more `git` call, and never
      // trusting a path we did not just inspect ourselves is worth that.
      const parsed = parseNativeAbsolute(path.data);
      if (!parsed.success) {
        return { success: false, error: { kind: 'not-a-repository', path: path.data } };
      }
      const inspection = await runtimes.git.inspectPath({ path: parsed.data });
      if (!inspection.success || inspection.data.kind !== 'repository') {
        return { success: false, error: { kind: 'not-a-repository', path: path.data } };
      }

      const project: Project = {
        id: crypto.randomUUID(),
        name: basename(path.data),
        path: path.data,
        district: free[0],
        foundedAt: new Date().toISOString(),
      };
      await save([...projects, project]);
      return { success: true, data: project };
    },

    async reorder(ids) {
      const projects = await stored();
      const place = (id: string): number => {
        const at = ids.indexOf(id);
        return at === -1 ? ids.length : at;
      };
      return save([...projects].sort((a, b) => place(a.id) - place(b.id)));
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
      return project ? picturesIn(project.path, many, runtimes.env) : { pictures: [], more: 0 };
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

    async setEnv(id, text) {
      const projects = await stored();
      const written = text.trim();
      return save(
        projects.map((project) => {
          if (project.id !== id) return project;
          const { env: _e, ...bare } = project;
          return written ? { ...bare, env: written } : bare;
        })
      );
    },

    async setExcludes(id, text) {
      const projects = await stored();
      const written = text.trim();
      return save(
        projects.map((project) => {
          if (project.id !== id) return project;
          const { excludes: _x, ...bare } = project;
          return written ? { ...bare, excludes: written } : bare;
        })
      );
    },

    async scripts(id) {
      const project = await find(id);
      return project ? scriptsIn(project) : { prepare: '', setup: '', run: '', teardown: '' };
    },

    async script(id, which, value) {
      const project = await find(id);
      if (!project) return { prepare: '', setup: '', run: '', teardown: '' };
      const workspace = await registered(project);
      if (workspace) {
        await runtimes.workspaces.patchPersonalProjectConfig({
          workspaceId: workspace,
          patch: { scripts: { [which]: value.trim() || null } },
        });
      }
      return scriptsIn(project);
    },

    async relink(id) {
      const projects = await stored();
      const project = projects.find((each) => each.id === id);
      if (!project) return { success: false, error: { kind: 'no-such-project' } };
      const picked = await pickFolder();
      if (!picked.success) return { success: false, error: { kind: 'cancelled' } };
      const parsed = parseNativeAbsolute(picked.data);
      if (!parsed.success) {
        return { success: false, error: { kind: 'not-a-repository', path: picked.data } };
      }
      const inspection = await runtimes.git.inspectPath({ path: parsed.data });
      if (!inspection.success || inspection.data.kind !== 'repository') {
        return { success: false, error: { kind: 'not-a-repository', path: picked.data } };
      }
      const relinked = { ...project, path: picked.data };
      await save(projects.map((each) => (each.id === id ? relinked : each)));
      return { success: true, data: { ...relinked, available: true } };
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

type Landed = { success: true; data: string } | { success: false; error: FoundError };

/** The native folder picker: the one path here that was always a dialog. */
async function pickFolder(): Promise<Landed> {
  const chosen = await dialog.showOpenDialog({
    title: 'Found a project',
    message: 'Which checkout is moving in?',
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Found',
  });
  const path = chosen.filePaths[0];
  if (chosen.canceled || !path) return { success: false, error: { kind: 'cancelled' } };
  return { success: true, data: path };
}

/** Where a cloned or freshly made checkout lands, absent anywhere better.
 *  `MENDER_PROJECTS_ROOT` is a dev/test override and always wins; next is
 *  the windmill's own "default projects dir" setting; last is the built-in
 *  fallback. */
async function projectsRoot(appSettings: AppSettings): Promise<string> {
  if (process.env.MENDER_PROJECTS_ROOT) return process.env.MENDER_PROJECTS_ROOT;
  const set = (await appSettings.checkoutSettings()).projectsDir;
  return set || join(homedir(), 'mender', 'projects');
}

/** A folder name out of a clone URL: the last path segment, `.git` dropped. */
function repoNameFrom(url: string): string {
  const bare = url.replace(/\/+$/, '').replace(/\.git$/, '');
  const last = bare.split(/[/:]/).at(-1) ?? 'project';
  return last.replace(/[^a-zA-Z0-9._-]/g, '-') || 'project';
}

/** A folder that does not exist yet, trying the plain name before numbering it. */
function freeTarget(root: string, name: string): string {
  let candidate = join(root, name);
  let n = 2;
  while (existsSync(candidate)) candidate = join(root, `${name}-${n++}`);
  return candidate;
}

async function cloneInto(
  runtimes: MenderRuntimes,
  appSettings: AppSettings,
  url: string
): Promise<Landed> {
  const written = url.trim();
  if (!written) return { success: false, error: { kind: 'clone-failed', said: 'no address.' } };
  const root = await projectsRoot(appSettings);
  await mkdir(root, { recursive: true });
  const target = freeTarget(root, repoNameFrom(written));
  const parsed = parseNativeAbsolute(target);
  if (!parsed.success) {
    return { success: false, error: { kind: 'clone-failed', said: 'that path will not do.' } };
  }
  const jobs = createLiveJobReplicaCache(gitContract.cloneRepository, runtimes.git.cloneRepository);
  const lease = await jobs.start({ repositoryUrl: written, targetPath: parsed.data });
  try {
    const job = await lease.ready();
    await job.result;
    return { success: true, data: target };
  } catch (error) {
    const said = error instanceof LiveJobFailedError ? whatCloneSaid(error.error) : String(error);
    return { success: false, error: { kind: 'clone-failed', said } };
  } finally {
    await lease.release();
    await jobs.dispose();
  }
}

function whatCloneSaid(error: { type: string; message?: string; stderr?: string }): string {
  switch (error.type) {
    case 'target_exists':
      return 'something is already there.';
    case 'auth_required':
    case 'auth_failed':
      return 'that needs signing in first.';
    case 'network_error':
      return 'the network would not answer.';
    case 'remote_not_found':
      return 'nothing answers at that address.';
    default:
      return error.message ?? 'the clone did not take.';
  }
}

/** A repository made fresh on GitHub, through whatever `gh` this machine has. */
async function createInto(
  runtimes: MenderRuntimes,
  appSettings: AppSettings,
  name: string,
  isPrivate: boolean
): Promise<Landed> {
  const written = name.trim();
  if (!written) return { success: false, error: { kind: 'create-failed', said: 'no name.' } };
  const root = await projectsRoot(appSettings);
  await mkdir(root, { recursive: true });
  // `gh --clone` always lands the checkout at `<cwd>/<bare repo name>`, so the
  // target it will use has to be worked out the same way rather than chosen.
  const bare = written.split('/').at(-1) ?? written;
  const target = join(root, bare);
  if (existsSync(target)) {
    return {
      success: false,
      error: { kind: 'create-failed', said: `${bare} is already on disk here.` },
    };
  }
  try {
    await ran(
      'gh',
      ['repo', 'create', written, isPrivate ? '--private' : '--public', '--clone', '--add-readme'],
      { cwd: root, env: await runtimes.env.current() }
    );
    return { success: true, data: target };
  } catch (error) {
    const said =
      error && typeof error === 'object' && 'stderr' in error
        ? String((error as { stderr: unknown }).stderr)
            .trim()
            .split('\n')
            .at(-1)
        : undefined;
    return {
      success: false,
      error: { kind: 'create-failed', said: said || 'gh would not make it.' },
    };
  }
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
async function ignoredIn(runtimes: MenderRuntimes, checkout: string): Promise<string[]> {
  try {
    const { stdout } = await ran(
      'git',
      ['ls-files', '-o', '-i', '--exclude-standard', '--directory', '--no-empty-directory'],
      { cwd: checkout, maxBuffer: 16 * 1024 * 1024, env: await runtimes.env.current() }
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
