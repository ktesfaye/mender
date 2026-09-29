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

/** How a fresh checkout gets made, until a project says otherwise: the
    branch a session's name becomes, and where a new project or worktree
    lands absent anywhere better. */
export const checkoutSettingsSchema = z.object({
  /** Under one prefix, so every branch the village made is obvious in `git
      branch`. Blank falls back to `mender`. */
  branchPrefix: z.string(),
  /** A short random tail on every branch name, so two sessions named the
      same thing never collide. */
  randomSuffix: z.boolean(),
  /** Blank falls back to `~/mender/projects`. */
  projectsDir: z.string(),
  /** Blank falls back to `~/mender/worktrees`. */
  worktreeDir: z.string(),
});

export type CheckoutSettings = z.infer<typeof checkoutSettingsSchema>;

/** How a shell looks and what it starts as, until a project says otherwise.
    Blank fields fall back to whatever xterm and the host's own `$SHELL`
    already gave. */
export const terminalSettingsSchema = z.object({
  /** In pixels. 0 falls back to the board's own default. */
  fontSize: z.number().int(),
  /** A shell executable's path, e.g. `/bin/zsh`. Blank falls back to the
      host's own `$SHELL`. */
  defaultShell: z.string(),
});

export type TerminalSettings = z.infer<typeof terminalSettingsSchema>;

/** Whether a villager who wants him reaches him with a real macOS
    notification while the window is out of sight. On until he says
    otherwise. */
export const notificationSettingsSchema = z.object({
  enabled: z.boolean(),
});

export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;

/** A chord rebound away from the table's own default, keyed by the doing's
    own `pick`. Absent for anything nobody has touched. */
export const keybindingsSchema = z.record(z.string(), z.string());

export type Keybindings = z.infer<typeof keybindingsSchema>;

export const appSettingsContract = defineContract({
  checkoutSettings: procedure({ input: z.object({}), output: checkoutSettingsSchema }),
  setBranchPrefix: procedure({
    input: z.object({ prefix: z.string() }),
    output: checkoutSettingsSchema,
  }),
  setRandomSuffix: procedure({
    input: z.object({ on: z.boolean() }),
    output: checkoutSettingsSchema,
  }),
  setProjectsDir: procedure({ input: z.object({ dir: z.string() }), output: checkoutSettingsSchema }),
  setWorktreeDir: procedure({ input: z.object({ dir: z.string() }), output: checkoutSettingsSchema }),
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
  terminalSettings: procedure({ input: z.object({}), output: terminalSettingsSchema }),
  setTerminalFontSize: procedure({
    input: z.object({ fontSize: z.number().int() }),
    output: terminalSettingsSchema,
  }),
  setDefaultShell: procedure({
    input: z.object({ shell: z.string() }),
    output: terminalSettingsSchema,
  }),
  notificationSettings: procedure({ input: z.object({}), output: notificationSettingsSchema }),
  setNotificationsEnabled: procedure({
    input: z.object({ on: z.boolean() }),
    output: notificationSettingsSchema,
  }),
  keybindings: procedure({ input: z.object({}), output: keybindingsSchema }),
  /** Rebind one doing's chord. Conflicts are the windmill's own to say
      plainly before it ever calls this — this just stores what it is told. */
  setKeybinding: procedure({
    input: z.object({ pick: z.string(), chord: z.string() }),
    output: keybindingsSchema,
  }),
  /** Back to the table's own default for that one doing. */
  clearKeybinding: procedure({
    input: z.object({ pick: z.string() }),
    output: keybindingsSchema,
  }),
});

export type AppSettingsContract = typeof appSettingsContract;
