/**
 * Runtime worker entries, by id. Each is a component runtime from
 * @emdash/core that runs in its own subprocess; the build turns each into
 * `out/main/<id>.js` and main spawns it from there.
 *
 * Two of them are ours rather than core's, and only barely: core stays
 * plugin-free, so which agent CLIs exist has to be said by the app.
 *
 * No electron import: the vite config reads this to shape its build inputs.
 */
const core = '../../packages/core/src';

export const menderWorkers = {
  'fs-watch': `${core}/services/fs-watch/node/runtime-entry.ts`,
  git: `${core}/runtimes/git/node/runtime-entry.ts`,
  conversations: `${core}/runtimes/conversations/node/runtime-entry.ts`,
  terminals: `${core}/runtimes/terminals/node/runtime-entry.ts`,
  scripts: `${core}/runtimes/scripts/node/runtime-entry.ts`,
  'host-settings': `${core}/runtimes/host-settings/node/runtime-entry.ts`,
  'workspace-registry': `${core}/runtimes/workspace-registry/node/runtime-entry.ts`,
  acp: 'src/main/entries/acp.ts',
  'agent-config': 'src/main/entries/agent-config.ts',
  'tui-agents': 'src/main/entries/tui-agents.ts',
} as const;

export type MenderWorkerId = keyof typeof menderWorkers;
