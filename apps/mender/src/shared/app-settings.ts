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

export const appSettingsContract = defineContract({
  defaultHand: procedure({ input: z.object({}), output: z.string() }),
  setDefaultHand: procedure({ input: z.object({ id: z.string() }), output: z.string() }),
  hands: procedure({ input: z.object({}), output: z.array(handSchema) }),
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
});

export type AppSettingsContract = typeof appSettingsContract;
