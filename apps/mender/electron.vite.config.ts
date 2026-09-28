import { cp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig } from 'electron-vite';
import { menderWorkers } from './src/shared/workers';

// Workspace packages must be bundled rather than externalized in the main and
// preload builds: an externalized module is resolved by Node at runtime, where
// the `development` export condition is off, so dev runs would load stale dists.
const workspacePackages = [
  '@emdash/core',
  '@emdash/plugins',
  '@emdash/shared',
  '@emdash/wire',
  '@mender/village',
];

/**
 * The two adapters the village spawns, carried beside the main process.
 *
 * An agent that speaks the protocol is not a library this app calls; it is a
 * program it starts, and the thing it starts has to be a real file on the disk
 * that a plain node can read. The plugins package already builds each one into
 * a single self-contained file, so they are copied next to the main bundle and
 * left out of the archive, and the runtime finds them there before it ever
 * goes looking through node_modules.
 *
 * Without this the app runs out of the checkout perfectly and cannot start a
 * single agent once it is installed, which is the kind of break that only ever
 * shows up in the Applications folder. So a one-off build with nothing to
 * carry fails outright rather than making an app that cannot start an agent;
 * only a watching dev build, which falls back to node_modules, lets it go.
 */
function carryTheAdapters(): {
  name: string;
  closeBundle: (this: { meta: { watchMode: boolean } }) => Promise<void>;
} {
  return {
    name: 'mender-carry-adapters',
    async closeBundle(): Promise<void> {
      const from = resolve('../../packages/plugins/dist/adapters');
      const to = resolve('out/main/adapters');
      try {
        await rm(to, { recursive: true, force: true });
        await cp(from, to, { recursive: true });
      } catch (trouble) {
        const missing = trouble instanceof Error && 'code' in trouble && trouble.code === 'ENOENT';
        if (missing && this.meta.watchMode) return;
        if (missing) {
          throw new Error(
            `no agent adapters at ${from}: build @emdash/plugins first, or the app cannot start an agent`
          );
        }
        throw trouble;
      }
    },
  };
}

function workerBuildInputs(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(menderWorkers).map(([id, entry]) => [id, resolve(entry)])
  );
}

export default defineConfig({
  main: {
    root: 'src/main',
    envDir: resolve('.'),
    plugins: [carryTheAdapters()],
    build: {
      externalizeDeps: { exclude: workspacePackages },
      rollupOptions: {
        input: { index: resolve('src/entry/main.ts'), ...workerBuildInputs() },
        output: { entryFileNames: '[name].js' },
      },
    },
    resolve: {
      alias: {
        '@main': resolve('src/main'),
        '@shared': resolve('src/shared'),
        // Emdash's portable services. We keep its back end; some of it lives
        // in its app rather than in a package, and this says which parts.
        '@upstream': resolve('../emdash-desktop/src/core'),
        // Upstream's own alias, so its internal imports resolve from here.
        '@core': resolve('../emdash-desktop/src/core'),
      },
    },
  },
  preload: {
    root: 'src/entry',
    build: {
      externalizeDeps: { exclude: workspacePackages },
      rollupOptions: { input: { index: resolve('src/entry/preload.ts') } },
    },
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
        '@upstream': resolve('../emdash-desktop/src/core'),
        '@core': resolve('../emdash-desktop/src/core'),
      },
    },
  },
  renderer: {
    root: 'src/renderer',
    /* Packaged, the page is loaded off the disk rather than served, so every
       url it emits has to be relative to itself. */
    base: './',
    // The packed sprite kit and the world files are the app's own data, not
    // renderer source: `assets/` is served at the root in dev and copied beside
    // the renderer on build, so `/kit/kit.json` means the same thing in both.
    publicDir: resolve('assets'),
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer'),
        '@shared': resolve('src/shared'),
        '@upstream': resolve('../emdash-desktop/src/core'),
        '@core': resolve('../emdash-desktop/src/core'),
      },
    },
    server: { port: 3100 },
  },
});
