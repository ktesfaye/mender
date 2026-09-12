/**
 * Runtime worker entries, by id. Each is a component runtime from
 * @emdash/core that runs in its own subprocess; the build turns each into
 * `out/main/<id>.js` and main spawns it from there.
 *
 * No electron import: the vite config reads this to shape its build inputs.
 */
export const menderWorkers = {
  'fs-watch': '../../packages/core/src/services/fs-watch/node/runtime-entry.ts',
  git: '../../packages/core/src/runtimes/git/node/runtime-entry.ts',
} as const;

export type MenderWorkerId = keyof typeof menderWorkers;
