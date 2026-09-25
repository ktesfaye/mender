import { defineContract, procedure } from '@emdash/wire/rpc';
import { z } from 'zod';

/** The app's own settings — the windmill. Not any one project's. */
export const handSchema = z.object({ id: z.string(), name: z.string(), here: z.boolean() });

export type Hand = z.infer<typeof handSchema>;

/** What this machine hands an agent's own CLI beyond its ordinary command:
    extra arguments and environment set only for it, read into its next
    terminal session. */
export const providerConfigSchema = z.object({
  extraArgs: z.array(z.string()),
  env: z.record(z.string(), z.string()),
});

export type ProviderConfig = z.infer<typeof providerConfigSchema>;

/** One process running for a session, in the plain words the windmill
    already speaks in. */
export const processShareSchema = z.object({
  label: z.string(),
  cpuPercent: z.number(),
  memBytes: z.number(),
});

/** One open session's own share of this machine. */
export const sessionUsageSchema = z.object({
  task: z.string(),
  title: z.string(),
  shares: z.array(processShareSchema),
  devServers: z.number().int(),
});

export type SessionUsage = z.infer<typeof sessionUsageSchema>;

/** One of the machine's own tools Mender leans on, missing, and the line
 *  that would put it there — homebrew's, on the one platform this runs on. */
export const missingDepSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Null on a platform, or for a dependency, with no known brew line. */
  command: z.string().nullable(),
});

export type MissingDep = z.infer<typeof missingDepSchema>;

export const appSettingsContract = defineContract({
  defaultHand: procedure({ input: z.object({}), output: z.string() }),
  setDefaultHand: procedure({ input: z.object({ id: z.string() }), output: z.string() }),
  hands: procedure({ input: z.object({}), output: z.array(handSchema) }),
  /** Which of git, gh, ripgrep, tmux and node this machine doesn't have. */
  missingCoreDeps: procedure({ input: z.object({}), output: z.array(missingDepSchema) }),
  providerConfig: procedure({ input: z.object({ agent: z.string() }), output: providerConfigSchema }),
  setExtraArgs: procedure({
    input: z.object({ agent: z.string(), extraArgs: z.string() }),
    output: providerConfigSchema,
  }),
  setEnvVar: procedure({
    input: z.object({ agent: z.string(), key: z.string(), value: z.string() }),
    output: providerConfigSchema,
  }),
  removeEnvVar: procedure({
    input: z.object({ agent: z.string(), key: z.string() }),
    output: providerConfigSchema,
  }),
  sessionUsage: procedure({ input: z.object({}), output: z.array(sessionUsageSchema) }),
});

export type AppSettingsContract = typeof appSettingsContract;
