import { z } from 'zod';

/** Claude Code's own settings, the ones a terminal's /config used to print. Kept in Claude's
    files, so a terminal session sees exactly what is set here. */
export const claudeStyleSchema = z.object({ id: z.string(), name: z.string(), about: z.string() });
export type ClaudeStyle = z.infer<typeof claudeStyleSchema>;

export const claudeHookSchema = z.object({
  event: z.string(),
  matcher: z.string(),
  command: z.string(),
  /** Which group and which hook inside it, so one can be taken out. */
  at: z.string(),
  /** Mender's own plumbing, not something a person wrote. */
  ours: z.boolean(),
});
export type ClaudeHook = z.infer<typeof claudeHookSchema>;

export const claudePluginSchema = z.object({
  id: z.string(),
  name: z.string(),
  market: z.string(),
  on: z.boolean(),
  version: z.string(),
  here: z.boolean(),
});
export type ClaudePlugin = z.infer<typeof claudePluginSchema>;

export const claudeConfigSchema = z.object({
  outputStyle: z.string(),
  styles: z.array(claudeStyleSchema),
  autoCompact: z.boolean(),
  /** How full before it packs, as a percentage; null is Claude's own. */
  compactPct: z.number().nullable(),
  cleanupDays: z.number(),
  switchOnFlag: z.boolean(),
  mode: z.string(),
  allow: z.array(z.string()),
  ask: z.array(z.string()),
  deny: z.array(z.string()),
  hooks: z.array(claudeHookSchema),
  plugins: z.array(claudePluginSchema),
  marketplaces: z.array(z.string()),
});
export type ClaudeConfig = z.infer<typeof claudeConfigSchema>;

export type Bucket = 'allow' | 'ask' | 'deny';

export const claudeEditSchema = z.discriminatedUnion('what', [
  z.object({ what: z.literal('style'), style: z.string() }),
  z.object({ what: z.literal('autoCompact'), on: z.boolean() }),
  z.object({ what: z.literal('compactPct'), pct: z.number().nullable() }),
  z.object({ what: z.literal('cleanup'), days: z.number() }),
  z.object({ what: z.literal('flag'), on: z.boolean() }),
  z.object({ what: z.literal('mode'), mode: z.string() }),
  z.object({
    what: z.literal('rule'),
    bucket: z.enum(['allow', 'ask', 'deny']),
    rule: z.string(),
    add: z.boolean(),
  }),
  z.object({ what: z.literal('plugin'), id: z.string(), on: z.boolean() }),
  z.object({ what: z.literal('market'), repo: z.string(), add: z.boolean() }),
  z.object({
    what: z.literal('hook'),
    event: z.string(),
    add: z.boolean(),
    matcher: z.string().optional(),
    command: z.string().optional().default(''),
    at: z.string().optional(),
  }),
]);
export type ClaudeEdit = z.infer<typeof claudeEditSchema>;
