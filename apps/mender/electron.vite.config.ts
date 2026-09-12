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

function workerBuildInputs(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(menderWorkers).map(([id, entry]) => [id, resolve(entry)])
  );
}

export default defineConfig({
  main: {
    root: 'src/main',
    envDir: resolve('.'),
    build: {
      externalizeDeps: { exclude: workspacePackages },
      rollupOptions: {
        input: { index: resolve('src/entry/main.ts'), ...workerBuildInputs() },
        output: { entryFileNames: '[name].js' },
      },
    },
    resolve: {
      alias: { '@main': resolve('src/main'), '@shared': resolve('src/shared') },
    },
  },
  preload: {
    root: 'src/entry',
    build: {
      externalizeDeps: { exclude: workspacePackages },
      rollupOptions: { input: { index: resolve('src/entry/preload.ts') } },
    },
    resolve: { alias: { '@shared': resolve('src/shared') } },
  },
  renderer: {
    root: 'src/renderer',
    // The packed sprite kit and the world files are the app's own data, not
    // renderer source: `assets/` is served at the root in dev and copied beside
    // the renderer on build, so `/kit/kit.json` means the same thing in both.
    publicDir: resolve('assets'),
    resolve: {
      alias: { '@renderer': resolve('src/renderer'), '@shared': resolve('src/shared') },
    },
    server: { port: 3100 },
  },
});
