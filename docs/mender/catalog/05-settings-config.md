# Emdash settings, config, MCP, skills, automations & accounts — full catalog

Grounded in a read-only checkout at
`.../scratchpad/emdash-upstream`. All paths below are relative to that repo
root unless marked otherwise. Anything not directly read from code is marked
**INFERRED**.

## How settings are stored and surfaced (read this first)

- **Global app settings** are one Zod schema per named key, aggregated in
  `apps/emdash-desktop/src/core/manifests/shared/settings-contributions.ts`
  into a single `AppSettings` type (15 top-level keys, catalogued below).
  Each key is contributed by its owning feature via
  `defineSettingsContribution({ key, schema, defaults })` — schema is
  environment-neutral (shared between renderer and main), defaults sometimes
  need Node APIs (home dir, `process.env`) and are overlaid by a matching
  `.../node/settings.ts` file (`localProject`, `remoteMachine`).
- **Storage**: SQLite (`better-sqlite3` + Drizzle) via `OverrideSettings<T>`
  (`apps/emdash-desktop/src/core/services/settings/node/override-settings.ts`).
  One row per settings key in the `app_settings` table, value = JSON blob of
  **field-level overrides only** (deep-merged onto the code default at read
  time). "Reset to default" = delete that one field from the override blob —
  this is why almost every setting row in the UI has a `ResetToDefaultButton`
  that appears only when the field differs from default (`isFieldOverridden`).
- **Secrets** (tokens, PATs, OAuth credentials) never go in that table. They
  go in a separate `app_secrets` table, values encrypted with Electron's
  `safeStorage` (OS keychain-backed: macOS Keychain, Windows DPAPI, Linux
  libsecret) — `apps/emdash-desktop/src/main/host/secrets/encrypted-app-secrets-store.ts`.
  **State**: `safeStorage.isEncryptionAvailable()` false, or on Linux a
  `basic_text` backend (no real keyring running) → every secret read/write
  throws `"Secure secret storage is unavailable..."`.
- **Provider/integration accounts** (GitHub, Linear, Jira, …) are metadata
  rows in a `provider_accounts` table (`providerId`, `accountId`,
  `credentialRef`, `isDefault`, `meta`) with the actual secret stored at
  `credentialRef` in the encrypted store above —
  `apps/emdash-desktop/src/main/core/provider-accounts/provider-account-registry.ts`.
  At most one default account per provider (partial unique index); deleting
  the default self-heals to the oldest remaining account.
- **Per-project settings** are a separate system (below, its own section) —
  not part of the 15-key `AppSettings` schema at all.
- **`.emdash.json`** is the one config file this app reads from a repo
  checkout itself (`packages/core/src/primitives/emdash-config/api/emdash-config.ts`).
- The settings **UI** is a set of "pages" contributed independently
  (`apps/emdash-desktop/src/core/manifests/browser/settings-page-contributions.ts`),
  listed in **Settings UI structure** below.

---

## Settings UI structure (13 pages)

Contributed as `{id, label, icon, component}` and optionally a `detail` view
(for master/detail pages like Machines). Order below is the order they render
in the sidebar.

| id | label | what it holds |
|---|---|---|
| `general` | General | Account (sign-in), app updates, telemetry, notifications, task-creation prefs |
| `integrations` | Integrations | Issue-tracker connections: GitHub, Linear, Jira, GitLab, Plane, Plain, Forgejo, Featurebase, Asana, Monday, Notion, Trello |
| `interface` | Interface | Theme, terminal, files, sidebar, context bar, keyboard shortcuts, hidden "open in" tools |
| `browser` | Browser | In-app browser profiles, cookie/cache management, CORS relaxation |
| `repository` | Repository | Branch prefix, random suffix, auto-push-on-create (global defaults; overridden per-project) |
| `prompts` | Prompts | Reusable prompt library |
| `system` | System | Diagnostics / process info (not user-editable settings — **INFERRED** mostly read-only) |
| `workspaces-local` | Workspaces | Local project list, each with a detail page |
| `conversations` | Conversations | **INFERRED** — conversation history/management view, not clearly a settings surface |
| `clis-models` | Agents | Installed agent CLIs, default agent, per-agent overrides, sign-in |
| `mcp` | MCP | MCP server configuration (catalog + custom, per-agent sync) |
| `skills` | Skills | Skill catalog install/create |
| `connections` | Machines | SSH remote machine connections, with per-machine and per-workspace detail pages |

---

## Global app settings — the 15-key `AppSettings` schema

Source of truth:
`apps/emdash-desktop/src/core/manifests/shared/settings-contributions.ts`
aggregating one `defineSettingsContribution` per feature. Every field below
was read directly out of its Zod schema.

### `tasks` — task-creation defaults

File: `apps/emdash-desktop/src/core/features/tasks/contributions/settings.ts`

| field | type | default |
|---|---|---|
| `autoGenerateName` | boolean | `true` |
| `autoApproveByDefault` | boolean | `false` |
| `autoTrustWorktrees` | boolean | `true` |
| `createBranchAndWorktree` | boolean | `true` |
| `deleteBranchByDefault` | boolean | `false` |
| `preserveNameCapitalization` | boolean | `false` |
| `includeIssueContextByDefault` | boolean | `true` |

UI: General page → "Preferences" section, one `Switch` row per field via
`TaskSettingsRows.tsx`. Each row: description, `ResetToDefaultButton`
(visible only when overridden), `Switch`.

### `project` — repository/branch defaults

File: `apps/emdash-desktop/src/core/features/projects/contributions/settings.ts`

| field | type | default |
|---|---|---|
| `pushOnCreate` | boolean | `true` |
| `branchPrefix` | string (normalized via `normalizeBranchPrefix`) | `'emdash'` |
| `appendRandomBranchSuffix` | boolean | `true` |
| `tmuxByDefault` | boolean | `false` |

UI: Repository settings page → `RepositorySettingsCard.tsx` (branch prefix
text input + two switches). `tmuxByDefault` is edited from the General page
via `EnableTmuxRow` instead — disabled with a note on Windows
(`detectPlatformContext().os !== 'windows'` gate; tmux unsupported there,
stored preference is preserved but ignored).

### `localProject` — local filesystem defaults (schema-only in shared manifest; defaults computed in Node)

Schema: `apps/emdash-desktop/src/core/features/projects/contributions/settings.ts`
Defaults: `apps/emdash-desktop/src/core/features/projects/node/settings.ts`

| field | type | default |
|---|---|---|
| `defaultProjectsDirectory` | string | `~/emdash/repositories` |
| `defaultWorktreeDirectory` | string | computed by `getDefaultLocalWorktreeDirectory()` |

**No dedicated UI row found for these two** — they read as machine-wide
fallbacks used when adding a project / creating a worktree, editable
indirectly through file-picker flows rather than a settings text field.
**INFERRED**: likely surfaced in the "add project" flow, not in Settings.

### `defaultAgent` — default agent CLI

File: `apps/emdash-desktop/src/core/features/agents/contributions/settings.ts`

- Type: single `AgentProviderId` string (validated against the plugin
  registry via `asAgentProviderId`).
- Default: `'claude'`.
- UI: Agents settings page → `DefaultAgentSelector.tsx`, a single select row
  ("Default agent — Selected by default when creating a new task"),
  validated live against agents actually installed/detected on the local
  host (`useAgents(LOCAL_HOST_REF)`); falls back to `null` (shown as
  unselected) if the stored value isn't in that list.

### `keyboard` — keybinding overrides

File: `apps/emdash-desktop/src/core/features/workbench/contributions/settings.ts`

- Type: `Record<settingsKey, string | null | undefined>` — dynamically
  built from every command in `COMMAND_CATALOG` whose `keybinding.kind ===
  'settings'`. Default: `{}` (empty — all commands use their code default
  chord until overridden).
- Semantics (from `apps/emdash-desktop/src/core/primitives/keybindings/README.md`):
  missing key ⇒ use the default chord; string value ⇒ that chord; `null` ⇒
  explicitly unbound. Only `keybinding.settings(...)`-declared commands are
  overridable; `keybinding.fixed(...)` commands (e.g. `Escape` to close a
  modal) are never shown as editable and can't collide with a user's choice
  ("reserved" conflict severity).
- UI: Interface page → `KeyboardSettingsCard.tsx`. Full list of rebindable
  commands, grouped by category, each row: title, description, current
  chord (`Shortcut` keycap display), a "record a new chord" interaction
  (click → `Press keys...` capture state), Reset-to-default and
  Remove-shortcut (set to `null`) icon buttons. Conflict detection on
  record: `reserved` (blocks — collides with a fixed binding) or same-group
  `error` (blocks) vs cross-group `shadowing` (warns but allows, shown as a
  toast).
- **See the full command/keybinding catalog** in its own section below.

### `notifications`

File: `apps/emdash-desktop/src/core/services/notifications/contributions/settings.ts`

| field | type | default |
|---|---|---|
| `enabled` | boolean | `true` |
| `sound` | boolean | `true` |
| `customSoundPath` | string (path to an audio file) | `''` (built-in cue) |
| `osNotifications` | boolean | `true` |
| `soundFocusMode` | enum `'always' \| 'unfocused'` | `'always'` |

UI: General page → `NotificationSettingsCard.tsx`. Master `enabled` switch
dims/disables the rest (`pointer-events-none opacity-33` when off). Sub-rows:
Sound (switch + inline preview-play button when no custom sound is set),
Custom sound (native "choose file" dialog via host client
`openSelectAudioFileDialog`, shows filename, preview button, reset to
built-in), Sound timing (`Select`: Always / Only when unfocused), OS
notifications (switch — "Show system banners... while Emdash is
unfocused").

### `theme`

File: `apps/emdash-desktop/src/core/features/workbench/contributions/settings.ts`

- Type: `z.enum(['emlight', 'emdark']).nullable().catch(null)`.
- Default: `null` (⇒ follow OS/system preference).
- UI: Interface page → `ThemeCard.tsx`. Three `SelectableCard` tiles: System
  (Monitor icon), Emdash Light (Sun), Emdash Dark (Moon). Fires
  `captureTelemetry('setting_changed', {setting:'theme'})` on change.
- **Note**: the underlying `packages/theme` package defines **4** themes
  (`light`, `dark`, `solarized-light`, `solarized-dark` —
  `packages/theme/src/themes/registry.ts`) and **2** UI densities
  (`comfortable`, `compact` — `packages/theme/src/densities/registry.ts`,
  `compact` scales spacing ×0.875 and radius ×0.85). **Neither Solarized nor
  density is wired to any settings UI or app code** (no references outside
  the theme package itself) — these are latent/unshipped capabilities, not
  live user settings. Worth deciding whether the rebuild exposes them.

### `openIn` — "open in" external tool visibility + default

File: `apps/emdash-desktop/src/core/features/workbench/contributions/settings.ts`

| field | type | default |
|---|---|---|
| `default` | `OpenInAppId` enum | `'terminal'` |
| `hidden` | `OpenInAppId[]` | `[]` |

- `OPEN_IN_APPS` catalog (`apps/emdash-desktop/src/core/primitives/open-in-apps/api/open-in-apps.ts`)
  lists ~29 external tools detected on the host: Finder, Terminal, editors
  (Cursor, VS Code, VSCodium, Windsurf, Xcode, Zed, Athas, Kiro,
  Antigravity, Trae, Trae Solo), terminal emulators (Kaku, Alacritty, Hyper,
  Warp, iTerm2, Ghostty, Kitty, Termy), and JetBrains IDEs (IntelliJ IDEA,
  Rider, Android Studio + Canary, PhpStorm, WebStorm, PyCharm, RubyMine,
  RustRover).
- UI: Interface page → `HiddenToolsSettingsCard.tsx` (`IntegrationRow` per
  app, sorted detected-first-then-alphabetical, each with a Switch to
  show/hide it from the "Open in" menu; switch disabled when not detected on
  this machine). "Default" isn't editable from this card directly —
  **INFERRED** it's set by picking a tool from the "Open in" menu itself.

### `interface` — misc UI behavior toggles

File: `apps/emdash-desktop/src/core/features/workbench/contributions/settings.ts`

| field | type | default |
|---|---|---|
| `taskHoverAction` | enum `'delete' \| 'archive'` | `'delete'` |
| `autoRightSidebarBehavior` | boolean | `false` |
| `showLeftSidebarLineChanges` | boolean | `true` |
| `showLeftSidebarPrStatus` | boolean | `true` |
| `showLeftSidebarTimestamps` | boolean | `true` |
| `hideContextBar` | boolean | `false` |

UI split across two cards on the Interface page:
- `SidebarMetadataSettingsCard.tsx`: the three `showLeftSidebar*` switches
  ("Left sidebar line changes / PR status / timestamps").
- `InterfaceSettingsCard.tsx`: `hideContextBar` switch ("Context bar — Hide
  the on-screen context trigger. The keyboard shortcut still works.").
- **`taskHoverAction` and `autoRightSidebarBehavior` have no settings-card
  UI found** in the files read — likely set contextually elsewhere in the
  app (hover-menu / sidebar behavior), not from a Settings page.
  **INFERRED**.

### `terminal`

File: `apps/emdash-desktop/src/core/features/terminals/contributions/settings.ts`

| field | type | default |
|---|---|---|
| `fontFamily` | string, optional | unset ⇒ "Menlo" shown as placeholder |
| `fontSize` | number, `TERMINAL_FONT_SIZE_MIN..MAX` | `TERMINAL_FONT_SIZE_DEFAULT` |
| `autoCopyOnSelection` | boolean | `false` |
| `macOptionIsMeta` | boolean | `false` |
| `defaultShell` | enum `TERMINAL_SHELL_IDS` | `'system'` |

`TERMINAL_SHELL_IDS` (`packages/core/src/primitives/terminal-shell/api/shell-ids.ts`):
`system, bash, cmd, fish, powershell, pwsh, wsl, zsh`.

UI: Interface page → `TerminalSettingsCard.tsx`. Rows: Default terminal
shell (`Select`, greys out shells not available on this host, shows a
reason tooltip); Terminal font (searchable `Combobox` grouped Popular vs
Installed fonts, reads installed fonts live via `useInstalledFonts`, free
text entry accepted on Enter); Terminal font size (stepper, clamped,
min/max buttons disable at bounds); Auto-copy selected text (switch);
Use Option as Meta key (switch, **macOS only** — row hidden entirely on
other platforms). Font/size/auto-copy/meta changes also dispatch
`window` `CustomEvent`s so live terminal instances pick them up without
reload.

### `browserPreview`

File: `apps/emdash-desktop/src/core/features/browser/contributions/settings.ts`

- `{ enabled: boolean }`, default `{ enabled: true }`.
- **No settings-card UI found** for this specific toggle — **INFERRED**
  it's an internal feature flag for the in-app browser preview panel rather
  than a user-facing switch, or is exposed inline in the browser panel UI
  itself.

### `browser` — in-app browser profiles

File: `apps/emdash-desktop/src/core/features/browser/contributions/settings.ts`

| field | type | default |
|---|---|---|
| `defaultProfileId` | string (profile id) or the literal `'isolated-per-task'` | `'default'` |
| `relaxCorsForLocalhost` | boolean | `false` |
| `profiles` | array of `{id, name}`, min 1, ids unique, name 1–40 chars | `[{id:'default', name:'Default'}]` |

Schema also enforces `defaultProfileId` is either the isolated sentinel or
one of `profiles[].id`.

UI: Browser settings page → `BrowserSettingsCard.tsx`. Profile list
(add/rename/delete — delete blocked if it's the last profile; deleting the
default reassigns default to the next profile), per-profile "Clear Storage"
(cookies/localStorage/IndexedDB/cache, confirmation modal, signs out any
open tabs on that profile), a page-level "Clear browsing data" section with
per-kind confirmations (`BrowsingDataKind`: all / cookies / site data /
cached images & files — each its own confirm dialog with distinct copy),
and a `relaxCorsForLocalhost` switch. A separate special profile,
`isolated-per-task` (`BROWSER_ISOLATED_PROFILE_ID`), is a reserved id (not
a real stored profile — can be selected as default but never created,
renamed, or deleted as a normal profile).

### `changesViewMode` — source control panel display mode

File: `apps/emdash-desktop/src/core/features/source-control/contributions/settings.ts`

| field | type | default |
|---|---|---|
| `unstaged` | enum `'flat' \| 'tree'` | `'flat'` |
| `staged` | enum `'flat' \| 'tree'` | `'flat'` |
| `pr` | enum `'flat' \| 'tree'` | `'flat'` |

**No dedicated settings-card found** — **INFERRED** this is a view toggle
set from the Changes panel's own toolbar (a flat/tree switcher icon on each
of the three file lists), persisted as a setting rather than local UI state,
not something a user visits the Settings app for.

### `remoteMachine` — host install source (schema-only in shared manifest)

Schema: `apps/emdash-desktop/src/core/services/hosts/contributions/settings.ts`
Defaults: `apps/emdash-desktop/src/core/services/hosts/node/settings.ts`

- `{ installBaseUrl: string }`.
- Default: `process.env.EMDASH_WORKSPACE_SERVER_ARTIFACTS_URL` or
  `'https://releases.emdash.sh/workspace-server'`.
- Persisted key name is deliberately kept as `remoteMachine` for storage
  compatibility even though the concept is "workspace-server artifact
  source", per the code comment. **No user-facing UI found** — build/ops
  configuration, not something surfaced to end users. **INFERRED**
  developer/ops-only.

---

## Per-agent-provider config (separate override store, not in the 15-key schema)

File: `apps/emdash-desktop/src/core/services/settings/node/provider-settings-service.ts`
+ schema `apps/emdash-desktop/src/core/services/settings/node/provider-config-schema.ts`

Its own `OverrideSettings` instance keyed by agent provider id (`claude`,
`codex`, etc.) rather than a single value — table key `providerConfigs`.

| field | type | notes |
|---|---|---|
| `extraArgs` | string, optional | raw extra CLI flags, e.g. `--enable-all-github-mcp-tools` |
| `env` | `Record<string,string>`, optional | extra env vars for that agent's process |

UI: Agents settings page → per-agent detail sheet, "Additional parameters"
field (`InstalledAgentContent.tsx`) plus an env-var key/value editor.
Resetting to default clears both when the form is at defaults
(`extraArgs` empty and no env keys).

### Per-agent executable override (separate concept, same page)

`InstallationOverrideCard.tsx` — lets a user pin an agent CLI to either an
absolute `path` or a `command` name resolved on `PATH`, instead of Emdash's
auto-detected binary. Explicitly **disables Emdash's ability to auto-update
that agent** (shown as an `Alert`). Has a "Validate" step before saving
(resolves + records the selection) and surfaces a validation error inline.
Stored via a `HostDependencyInstallation` view-model — **INFERRED** backed
by the `host-dependencies` primitive (not read in depth this pass).

---

## MCP servers

Schema: `packages/core/src/primitives/mcp/api/schemas.ts`
UI: `apps/emdash-desktop/src/core/features/mcp/browser/components/*`

### Per-server config (`McpServer`)

| field | type | notes |
|---|---|---|
| `name` | string | required |
| `transport` | enum `'stdio' \| 'http'` | picked in the form, derived on import from `type`/`url` presence |
| `command` | string, optional | stdio only |
| `args` | string[], optional | stdio only, entered "one per line" |
| `url` | string, optional | http only |
| `headers` | `Record<string,string>`, optional | http only |
| `env` | `Record<string,string>`, optional | both transports |
| `enabled` | boolean, optional | |
| `cwd` | string, optional | |
| `timeout` | number, optional | |
| `oauth` | object or literal `false`, optional | OAuth config blob, or explicitly disabled |
| `providers` | string[] | **which agent CLIs this server is synced to** — see below |

### Catalog vs custom

`McpCatalogEntry` = `{key, name, description, docsUrl, defaultConfig,
credentialKeys[], _meta?}` — a curated list of known servers with
placeholder/required credential keys. The settings page shows "Connected"
(installed) and "Available" (catalog, not yet added) grids
(`McpCard.tsx`); clicking a catalog card opens the add form pre-filled from
`defaultConfig`; clicking an installed card opens it for editing (with a
Remove action). Env-var/header key/value editors highlight fields that
match a catalog entry's declared `credentialKeys` (`KeyValueSection.tsx`,
not read in full — **INFERRED** styling/validation hint only).

### "Sync to agents" (`SyncToAgentsSection.tsx`)

Per MCP server, an explicit set of agent CLIs (`providers: string[]`) it
should be registered with — chip list of already-synced agents (each
removable), an agent picker to add more, and a "Sync to all installed
agents" shortcut. Registration format conversion for plugin agents is in
`packages/core/src/primitives/mcp/api/registration.ts`
(`registrationToMcpServer` / `mcpServerToRegistration`).

---

## Skills

Types: `packages/core/src/primitives/skills/api/types.ts`
UI: `apps/emdash-desktop/src/core/features/skills/browser/components/*`

### `CatalogSkill`

| field | type |
|---|---|
| `id`, `displayName`, `description` | string |
| `source` | enum `'openai' \| 'anthropic' \| 'skillssh' \| 'local'` |
| `sourceUrl`, `iconUrl`, `brandColor`, `defaultPrompt`, `sourceRef`, `catalogSkillId`, `skillShPath`, `skillMdContent`, `localPath` | optional string fields |
| `installs` | number, optional |
| `installed` | boolean |
| `frontmatter` | `{name, description, license?, compatibility?, metadata?, 'allowed-tools'?}` — the skill's own SKILL.md YAML frontmatter |

### UI surface

- Toolbar: search, Refresh catalog, "New Skill".
- Grid of cards (installed + browsable catalog across the 4 sources).
- Detail modal: description, frontmatter, Install button (states: idle,
  "Installing…", installed).
- `CreateSkillModal.tsx`: author a **local custom skill** — name
  (`my-skill`), description (`What does this skill do?`), and the skill
  body/instructions (frontmatter name+description auto-added).
- No per-agent "sync" toggle was found on skills (unlike MCP) — installing a
  skill appears to make it available globally rather than per-CLI.
  **INFERRED**.

---

## Automations (scheduled/cron agent runs)

Schema: `apps/emdash-desktop/src/core/primitives/automations/api/{automation,config}.ts`
Contract: `apps/emdash-desktop/src/core/features/automations/api/contract.ts`
UI: `apps/emdash-desktop/src/core/features/automations/browser/*`

Per-project feature (`projectId` required on create), not a global settings
page. Each automation:

| field | type | notes |
|---|---|---|
| `name` | string | required |
| `enabled` | boolean | |
| `triggerConfig.expr` | string | cron expression (`CronPicker` component builds it) |
| `triggerConfig.tz` | string, optional | timezone |
| `conversationConfig.prompt` | string | required |
| `conversationConfig.provider` | string | which agent CLI runs it |
| `conversationConfig.title` | string, optional | |
| `conversationConfig.autoApprove` | boolean | |
| `conversationConfig.model` | string, optional | agent model override |
| `conversationConfig.type` | enum `'pty' \| 'acp'`, optional | transport: raw terminal vs structured chat |
| `taskConfig` / `workspaceConfig` | versioned nested config | how the task/worktree for each run is set up |
| `revision` | number | optimistic-concurrency guard (`deployment-stale` error when stale) |

### States / errors

`automationDefinitionErrorSchema` (discriminated union):
`project-not-found`, `automation-not-found`, `automation-conflict`,
`invalid-definition` (reasons: `name_required`, `automation_not_configured`,
`conversation_config_prompt_required`, `cron_invalid`), `workspace-not-found`,
`workspace-not-supported`, `deployment-stale` (expected vs actual revision),
`runtime-unavailable`.

Run status (`AutomationRunStatus`): `scheduled, queued,
provisioning_workspace, starting_session, done, failed, skipped,
cancelled`. Trigger kind: `cron | manual`. `getTargetAvailability` procedure
checks whether a project even supports automations before showing the
create flow.

Includes a builtin template catalog (`builtin-catalog.ts`,
`AutomationTemplateCard.tsx` / `AutomationTemplateRail.tsx`) — not read in
depth this pass.

---

## Per-project settings (separate from global `AppSettings`)

This is a large, independent system: **project-level configuration that
overrides app defaults**, resolved through an explicit provenance model so
the UI can show *why* a value is what it is.

### The four provenance kinds

`apps/emdash-desktop/src/core/primitives/project-settings/api/effective-settings.ts`

```
type Provenance =
  | { kind: 'set' }                                  // user explicitly chose this
  | { kind: 'inferred'; from: string }                // derived (e.g. from git remotes)
  | { kind: 'broken-setting'; staleValue: string }     // stored value no longer valid; degraded, not blocking
  | { kind: 'unresolvable' }                           // dangling/host-mismatched pin — fails closed
```

Every resolved field in the per-project settings UI carries a
`ProvenanceBadge`, and explicit values get a `ResetProvenanceButton`
("reset to inferred"). `unresolvable` (e.g. a pinned GitHub account that got
disconnected) shows a destructive `Alert` and pauses the dependent feature
(GitHub calls) until re-picked.

### "Base" project settings (`BaseProjectSettingsSection.tsx`)

| field | UI control | notes |
|---|---|---|
| GitHub account | `Select` (accounts + "No GitHub account" + "Connect…") | per-project pin; `{kind:'account', accountId}` or `{kind:'none'}`; absent = infer from git remote |
| Worktree root | text input + native folder Browse (local projects only) | shows the derived worktree pool path live |
| Default branch | `ProjectBranchSelector` | `{remote: string\|null, branch}` |
| Base remote | `RemoteSelector` | used for fetch/base-branch/PR target |
| Push remote | `RemoteSelector` | used for publishing task branches |
| Agent git credentials | `Select`: Effective account / System / None | see **git credential modes** below |
| Enable tmux | `Switch` | inherits host default → app default; unsupported on local Windows |

### `agentGitCredentialsSettingSchema` — git credential modes (per project)

`packages/core/src/primitives/git-credentials/api/*` +
`apps/emdash-desktop/src/core/primitives/project-settings/api/project-settings.ts`

- `'effective-account'` (**default**) — agent/terminal sessions authenticate
  as the project's resolved GitHub account via a per-session loopback
  credential-helper channel (port + nonce env vars,
  `EMDASH_GIT_CREDENTIAL_PORT` / `EMDASH_GIT_CREDENTIAL_NONCE`); raw tokens
  never enter session env/argv/logs.
- `'system'` — leaves the environment untouched; native git credential
  behavior on the host.
- `'none'` — actively scrubs `GIT_ASKPASS`/`SSH_ASKPASS`/`credential.helper`
  from the session so no credential prompting or injection happens at all.
- Emdash's **own** git operations always use the effective account
  regardless of this per-project setting (only affects agent/terminal PTY
  sessions).

### "Shareable" project settings (`ShareableSettingsSection.tsx`) — written to `.emdash.json`

These are the fields that round-trip to the checked-in `.emdash.json` file
(schema: `packages/core/src/primitives/emdash-config/api/emdash-config.ts`):

| field | type | notes |
|---|---|---|
| `preservePatterns` | string[] (gitignore-style, one per line) | gitignored files deliberately carried into new worktrees |
| `shellSetup` | string | shell init snippet — **retired from the per-project DB field**; comment notes it's now per-host defaults overridden by workspace `.emdash.json` |
| `scripts.prepare` | string (shell) | runs before task startup; blocks it |
| `scripts.setup` | string (shell) | runs once workspace is ready; has its own auto-run toggle |
| `scripts.run` | string (shell) | runs once workspace is ready, waits for setup if both auto-run; has its own auto-run toggle |
| `scripts.teardown` | string (shell) | |
| `autoRunSetupScriptOnTaskCreation` | boolean | per-project override of the auto-run behavior for `scripts.setup` |
| `autoRunRunScriptOnTaskCreation` | boolean | same for `scripts.run` |

Each field shows override sources (`getOverrideSources`) — i.e. it can be
set at multiple scopes (project / task / workspace) and the UI surfaces
where a currently-effective value is actually coming from
(`ShareableSettingTitle`). A stale key (`excludePatterns`) is silently
stripped on parse — non-strict schema for forward/back compatibility.

**Config migration**: a "Import from other tools" flow reads existing
config from **Conductor, Superset, Paseo, and Codex** project files and
offers to migrate specific fields into Emdash's `.emdash.json`/DB
(`ProjectConfigMigrationProvider`, `sharing/*-config-migration.ts`), with a
destination choice of `'local'` (DB only) vs `'shared'` (written to
`.emdash.json`).

### Per-project environment variables (host-local, NOT written to `.emdash.json`)

`EnvironmentVariableInputs` — key/value list added to new terminals,
lifecycle scripts, and agent processes for a project. Explicitly **stays on
the local machine** (not shared/checked in), passed literally (no shell
expansion — "use absolute paths").

### Write targets

`ProjectSettingsWriteTarget` = project-level / a specific task / a specific
workspace — the shareable fields above can be written at any of those three
granularities (`WriteProjectConfigRequest`).

---

## Accounts, integrations & auth — states

### Emdash account (`AccountTab.tsx`)

States, in the order the component checks them:
1. **Loading** — spinner.
2. **Signed in** (`session.isSignedIn && user`) — avatar/initials, name,
   email, "Sign Out" (confirmation modal first).
3. **Session expired** (`hasAccount && !isSignedIn`) — "Sign in again to
   reconnect", Sign In button, or a server-unavailable message.
4. **No account** — "Create an Emdash account to automatically connect
   GitHub using OAuth2", Create Account button, or server-unavailable
   message.
- **Server unavailable** (`useAccountHealth` false) replaces the action
  button with `ServerUnavailableMessage` in both the expired and
  no-account states.

### GitHub accounts (multi-account)

`GitHubAccountsSection.tsx` (Integrations page detail) + provider-account
registry backing it. Per account: avatar/login, default badge
(`GitHubDefaultAccountBadge`), credential-source badge
(`GitHubCredentialSourceBadge` — **INFERRED** distinguishes OAuth-via-Emdash
vs `gh` CLI import vs device-flow PAT), "Set as default", "Remove" (with a
usage-count warning: "used by N projects... GitHub features disabled for
those projects until reassigned").

**Three ways to connect GitHub** (`github-connect-modal.tsx`):
1. **OAuth via Emdash account** — only path if the user has/creates an
   Emdash account; button label varies by `isSignedIn`/`hasAccount`.
2. **Import from GitHub CLI** — reads an existing local `gh auth` session.
3. **Device flow** — manual OAuth device-code flow
   (`github-device-flow-modal.tsx`), shown only when there's no Emdash
   account (`showDeviceFlowMethod = !hasAccount`).

### Other issue-tracker integrations

`IssueProviderType` (`packages/core/src/primitives/linked-issues/api/linked-issue.ts`):
`github, linear, jira, gitlab, plane, plain, forgejo, featurebase, asana,
monday, notion, trello` — 12 providers, each with a plugin implementation
under `packages/plugins/src/issues/impl/`.

- Connected via a generic `SetupFormShell` (provider-specific form fields
  not read in depth this pass — **INFERRED** typically an API token/URL
  pair per provider) → `connectIntegration(providerId, input)`.
- Legacy secret-key migration table shows most of these were previously
  single-account, string-keyed secrets (`emdash-linear-token`,
  `emdash-jira-token`, etc.) now migrated into the unified
  `provider_accounts` registry.
- `ConnectionStatus` per provider: `{connected, displayName?, displayDetail?,
  error?, capabilities: {requiresRepositoryUrl, supportsIssueContext}}`.
- Issue-linking error states (`IssueAccountError`): `account_unavailable`
  (with `provenance` + whether any accounts are connected at all —
  distinguishes "you set none explicitly" from "inference found nothing"),
  `account_not_found`, `account_host_mismatch` (pinned account's host ≠
  repo's host), `token_missing`, `auth_required`.
- UI: Integrations page — "Connected" / "Available" grids
  (`IntegrationsCard.tsx`), each opens a detail sidebar
  (`IntegrationDetailSidebar.tsx`) or the setup modal; disconnect asks for
  confirmation naming the specific credential being deleted.

### SSH machine connections ("Machines")

Form schema: `apps/emdash-desktop/src/core/features/machines/browser/machine-form-schema.ts`

| field | type | notes |
|---|---|---|
| `name` | string, required | connection display name |
| `host` | string, required | hostname/IP, or blank if using an SSH config alias |
| `port` | number 1–65535 | |
| `username` | string | required unless `sshConfigAlias` set |
| `authType` | enum `'password' \| 'key' \| 'agent'` | |
| `password` | string | required if `authType==='password'` and not editing |
| `privateKeyPath` | string | required if `authType==='key'` and no alias |
| `passphrase` | string | for the private key |
| `sshConfigAlias` | string | reads host/user from the user's `~/.ssh/config`; validated against an alias pattern |
| `forwardAgent` | boolean | SSH agent forwarding |
| `proxyJump` | string | `ProxyJump` target |
| `proxyCommand` | string | raw `ProxyCommand` |

Validation: no leading/trailing whitespace on name/host/username/key
path/alias/proxyJump; host format validated unless an alias is given;
alias format validated against a stricter pattern. UI:
`add-machine-modal.tsx` (Add/Edit SSH Connection), machine list with detail
pages showing per-machine workspaces (`machine-details-page`,
`MachineWorkspaceDetailPage`).

---

## Keybindings — full catalog and mechanics

Primitive: `apps/emdash-desktop/src/core/primitives/keybindings/` (README
is the best single source — quoted above). Every command is defined with
`defineCommand({..., keybinding})` where `keybinding` is either:
- `keybinding.fixed(chord, options?)` — **not user-editable**, cannot
  conflict with a user rebind (severity `reserved` if someone tries).
- `keybinding.settings(settingsKey, defaultChord, options?)` — **user
  editable**, stored at `AppSettings.keyboard[settingsKey]`.

`KeybindingOptions`: `ignoreWhenTextInputFocused`, `ignoreWhenEditorFocused`,
`ignoreWhenBrowserFocused`, `allowWhenTerminalFocused`, `allowRepeat`.

Chord grammar: tinykeys + a `$mod` alias (Cmd on mac, Ctrl elsewhere);
character tokens (`Mod+K`) vs positional code tokens (`code(['Mod'],
'BracketLeft')`) for punctuation/nav keys that shift under Option on macOS.
Sequences not supported. Conflict severities: `reserved` (vs a fixed
binding, blocks), `error` (same-scope collision, blocks), `shadowing`
(cross-scope, warns only).

### User-editable commands (`keybinding.settings`, default chord)

**App** (`apps/emdash-desktop/src/core/features/workbench/contributions/commands.ts`):
Open Settings `Mod+,` · New Project `Mod+Shift+N` · New Task `Mod+N` ·
Go Back `Mod+[` · Go Forward `Mod+]` · Command Palette `Mod+K` ·
Open in Editor `Mod+O` · Confirm `Mod+Enter` · Toggle Left Sidebar `Mod+B` ·
Zen Mode `Control+Z`.

**Tab navigation**: Next Tab `Mod+Alt+→` · Previous Tab `Mod+Alt+←` ·
Close Tab `Mod+W` · Reopen Closed Tab `Mod+Shift+T` · Rename Tab
`Mod+Shift+R` · Split Pane `Mod+\`.

**Conversations/Task** (`.../features/tasks/contributions/commands.ts`):
New Conversation `Mod+T` · New Conversation Split Right `Mod+D` ·
View Changes `Mod+Shift+1` · View Conversations `Mod+Shift+3` ·
View Files `Mod+Shift+2` · Search File Contents `Mod+Shift+F` ·
Toggle Terminal Drawer `Mod+J` · Toggle Right Sidebar `Mod+.` ·
New Terminal `Mod+Shift+\`` · Open Browser `Mod+Shift+B` ·
Copy Browser URL `Mod+Shift+C` · Archive Task `Mod+Shift+E` ·
Next Task `Mod+Alt+↓` · Previous Task `Mod+Alt+↑` ·
Delete Selected Tasks `Mod+Backspace`.

**File tree** (`.../features/editor/contributions/commands.ts`): Rename
`Mod+Shift+R` · Cut `Mod+X` · Copy `Mod+C` · Paste `Mod+V` ·
Delete `Mod+Backspace`.

### Fixed (non-editable) commands

Close Settings/Modal `Escape` · Cycle Next/Prev Tab `Control+Tab` /
`Control+Shift+Tab` · Save File `Mod+S` · Save All Files `Mod+Shift+S` ·
Find in Terminal `Mod+F` · Close Terminal Search `Escape` ·
Tab 1–9 `Mod+1`…`Mod+9`.

### No default chord (invoked only via menu/command palette)

View Terminals · Browser Go Back/Forward/Reload/Focus URL/Open External ·
Git Fetch/Pull/Push · Pin Task · Convert Automation to Regular Task ·
Give Feedback · Toggle Theme · macOS `Mod+H` (system Hide, reserved
against user rebinds specifically on mac).

### Developer-only commands (no keybinding at all, not user-settable)

Open Process Panel, Capture Performance Trace
(`.../features/dev-perf/contributions/commands.ts`).

---

## App-level: updates, telemetry

### Updates (`UpdateCard.tsx` + `getUpdateStore()`)

Not a persisted setting — a live status display + action:
- States: `up-to-date`, `update-download-available` (with version, a
  Download button, progress callback), `update-install-available`
  (downloaded/installing — Install & Restart), `error` (falls back to
  showing a download-available card for the last known available version,
  or up-to-date if none).
- "Check for Updates" button always available.

### Telemetry (`useTelemetryConsent.ts` + `TelemetryCard.tsx`)

- Persisted preference (`userOptOut`, stored via a KV/opaque status flag,
  not one of the 15 `AppSettings` keys — read via a dedicated
  `getTelemetryClient().getStatus()/setEnabled()` RPC pair).
- States: `loading`; `envDisabled` (build-time flag — switch permanently
  disabled, no explanation shown beyond disabling the control); `!hasKeyAndHost`
  ("Inactive in this build (no PostHog keys)" — switch still shown but
  effectively inert); normal on/off (`prefEnabled`).
- Fires `captureTelemetry('setting_changed', {setting:'telemetry'})` itself
  on toggle (meta — logging the settings change to telemetry).

---

## `.emdash.json` — the one per-repo config file the app reads/writes

`packages/core/src/primitives/emdash-config/api/emdash-config.ts`

```ts
{
  preservePatterns?: string[]   // never includes '.emdash.json' itself (filtered)
  shellSetup?: string
  scripts?: {
    prepare?: string
    setup?: string
    run?: string
    teardown?: string
  }
}
```

Non-strict Zod parse: unknown/retired keys (e.g. legacy `excludePatterns`)
are silently dropped so old files keep loading. `parseEmdashConfig` never
throws — returns `{success:false, data: defaults, error}` on bad JSON so a
broken file degrades instead of blocking the app (see `ConfigModel` /
`readConfigFile` in `packages/core/src/services/config-model` — the generic
lenient-read machinery this and the Node settings store both use). File is
watched for external changes via `watchConfigFile` (debounced directory
watch, since the file may not exist yet).

---

## Open questions / likely gaps for the rebuild

- `taskHoverAction`, `autoRightSidebarBehavior` (`interface` key),
  `browserPreview.enabled`, `changesViewMode`, `remoteMachine.installBaseUrl`,
  and `localProject.*` have schemas + defaults but **no settings-card UI
  was found** reading/writing them directly — either they're set from
  in-context controls elsewhere in the app, or they're currently
  orphaned/dev-only. Needs a targeted UI grep per key if the rebuild wants
  a 1:1 UI mapping.
- Solarized themes and the `compact` density exist in `packages/theme` but
  are wired nowhere — a decision point, not a bug to reproduce.
- Per-provider MCP `credentialKeys` UI treatment (`KeyValueSection.tsx`)
  and the Skills catalog's exact install/sync mechanics into each agent's
  own config file were not traced end-to-end (time-boxed) — flag for a
  follow-up pass if the game-world "skills shelf" needs exact parity.
- `system` and `conversations` settings pages' actual content was not
  opened — likely read-only diagnostics / history rather than "settings" in
  the configurable sense, but not confirmed.
