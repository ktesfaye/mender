# Settings, MCP, skills, automations and updates

Covers every page and control under Settings, plus Account, Automations, Skills, MCP,
Updates, Telemetry, dev-perf and legacy-port. Source is Emdash v1.2.6, paths are
repo-relative to `apps/emdash-desktop/` unless noted as `packages/...`.

## Settings shell

The Settings view (`src/core/features/settings/browser/settings-view.tsx`,
`components/SettingsPage.tsx`) is a two-pane page: a left `PageLayout.SidebarMenu` with a
search box (placeholder **"Search settings"**, shortcuts `Mod+F` and bare `/` when no text
input is focused) and a right content pane. Sidebar sections, top to bottom: General,
Integrations, Interface, Browser, Repository, Prompts, then a **"Local"** section divider
(System, Workspaces, Conversations, Agents, MCP, Skills), then a **"Remote"** section
divider (Connections). The sidebar footer is a button **"View Docs"** (external-link icon)
that opens `https://docs.emdash.sh`.

Typing a query filters the visible pages to ones with matches and shows a numeric badge per
page of how many settings matched (`search/settings-search.ts`); if the current tab isn't
in the filtered set, the first matching page is auto-selected. Sidebar is draggable
(reorderable). Deep links support a nested "detail" path (breadcrumbs shown above content)
used by sub-pages such as an agent's install detail.

Only pages actually implemented under `features/settings/` are catalogued in full below
(General, Integrations, Interface, Browser, Repository, Agents/"clis-models"). Prompts,
System, Workspaces, Conversations, and Connections are contributed by other feature slices
(`library`, `machines`) and are out of this audit's scope — noted only as sidebar entries.

Source: `src/core/features/settings/contributions/settings-pages.ts`,
`contributions/views.ts` (tab enum), `browser/components/SettingsPage.tsx`,
`browser/search/settings-search.ts`.

## General page

Header: **"General"** / *"Manage your account, app updates, and task preferences."*
(`browser/pages/general-settings-page.tsx`)

### Account (Emdash account)
`browser/components/AccountTab.tsx`. States:
- **Loading**: spinner + *"Loading account..."*
- **Signed out, no prior account**: *"Emdash Account"* / *"Create an Emdash account to
  automatically connect GitHub using OAuth2."* Button **"Create Account"** (label becomes
  *"Creating account..."* while pending).
- **Signed out, had an account (session expired)**: *"Session expired"* /
  *"Sign in again to reconnect your Emdash account."* Button **"Sign In"** (→ *"Signing
  in..."* while pending).
- **Signed in**: avatar (or a generic user-icon placeholder) + display name + email, button
  **"Sign Out"**. Clicking Sign Out opens a confirm modal: title *"Sign out of Emdash?"*,
  description *"You will need to sign in again to reconnect your Emdash account."*, confirm
  label **"Sign Out"**.
- **Server unavailable** (health check fails): instead of the sign-in button, an inline
  banner: *"{Emdash|Emdash Canary} server is currently unavailable. Please try again
  later."* (`components/ServerUnavailableMessage.tsx`).
- Errors from a failed sign-in render inline in red and as a toast **"Sign in failed"** with
  the error description.
- On success: toast **"Signed in to Emdash"**, description *"Connected as {name}"*.
- Store: server-side session (`account/node/services/account-session-store.ts`), not an
  app-settings field. Sign-in triggers a GitHub OAuth2 device/browser flow via
  `account-oauth-client.ts`; on success a GitHub provider token is optionally dispatched to
  connect GitHub automatically (`provider-token-dispatcher.ts`).

### App
- **UpdateCard** — see "Updates" section below.
- **Privacy & Telemetry** row (`TelemetryCard.tsx`): title *"Privacy & Telemetry"*,
  description *"Help improve {Emdash|Emdash Canary} by sending anonymous usage data."* plus
  a link **"Telemetry information"** (→ `https://docs.emdash.sh/telemetry`) *"for
  details."* Control: a `Switch`, default **on**. Disabled when telemetry is
  environment-disabled (`envDisabled`, e.g. `TELEMETRY_ENABLED=false`); when the build has
  no PostHog key/host configured a small caption reads *"Inactive in this build (no PostHog
  keys)"* and the switch still shows but has no effect. Toggling fires telemetry event
  `setting_changed` with `{setting: 'telemetry'}` before disabling itself.
  - Store: server-computed status (`envDisabled`, `userOptOut`, `hasKeyAndHost`) via the
    telemetry wire contract; user toggle is `setEnabled({enabled})`
    (`core/features/telemetry/node/wire-controller.ts`).

### Notifications
`NotificationSettingsCard.tsx`, app-settings key `notifications`. All rows share one
`ResetToDefaultButton` (a rotate-ccw icon, visible only when the field differs from
default; tooltip *"Reset to default: {label}"*).
| Setting | Description | Control | Default |
|---|---|---|---|
| Notifications | *"Get notified when agents need your attention."* | Switch | on |
| Sound | *"Play audio cues for agent events."* Has a play-button preview (▶) when no custom sound is set. | Switch | on |
| Custom sound | *"Use an audio file instead of the built-in cue."* Button **"Choose file…"** opens a native "Choose custom sound" file dialog; once set shows the filename with a preview button and full path as tooltip. | file picker | none (built-in cue) |
| Sound timing | *"When to play sounds."* | Select: **Always** / **Only when unfocused** | Always |
| OS notifications | *"Show system banners when agents need attention or finish (while Emdash is unfocused)."* | Switch | on |

All of Sound/Custom sound/Sound timing/OS notifications are dimmed (`opacity-33`,
`pointer-events-none`) and disabled when the top Notifications switch is off.
Store: `app-settings` key `notifications` (`{enabled, sound, customSoundPath,
osNotifications, soundFocusMode}`).

### Preferences (task defaults)
`components/TaskSettingsRows.tsx`, app-settings key `tasks`; every row has the same
reset-to-default affordance.
| Setting | Description | Default |
|---|---|---|
| Auto-generate task names | *"Automatically suggests a task name when creating a new task."* | on |
| Auto-approve by default | *"Skip permission prompts for supported agents when creating new tasks and conversations."* | off |
| Auto-trust worktree directories (with an info tooltip *"For agents that support workspace trust, Emdash writes trust entries before launching."*) | *"Skip the folder trust prompt in supported CLIs for new tasks."* | on |
| Create branch and worktree by default | *"Start new From Branch tasks in a dedicated task branch and worktree unless changed in the task modal."* | on |
| Delete branch by default | *"Preselect the delete branch option when deleting tasks with a deletable task branch."* | off |
| Preserve task name capitalization | *"Keep uppercase letters in generated and manually entered task names. Defaults to lowercase."* | off |
| Include issue context by default | *"Add the selected issue to the initial agent prompt when creating a task from an issue."* | on |
| Enable tmux | *"Run agent sessions and terminals in tmux sessions by default."* On Windows, disabled with text *"tmux is unavailable for Windows sessions. Your stored preference is preserved."* | off; forced off (and non-interactive) on Windows |

Store: `app-settings.tasks` for the first six; `app-settings.project.tmuxByDefault` for
tmux.

## Integrations page

Header: **"Integrations"** / *"Connect external services and tools."*
(`browser/pages/integrations-settings-page.tsx`, `components/IntegrationsCard.tsx`).

Issue-provider integrations (e.g. GitHub, Linear, Jira — from
`integrations` feature metadata) render as a **"Connected"** section (only shown once
something is connected) and an **"Available"** section, each a responsive card grid
(`IntegrationGridCard.tsx`). Each card: icon, name, one-line description, and — if the
integration has a connection error — a red `CircleAlert` badge in the corner whose tooltip
shows the error text. Clicking a card opens a right-side `Sheet` detail
(`IntegrationDetailSidebar.tsx`):
- Header: icon, name, one capability badge per feature (from `ISSUE_FEATURE_LABELS`),
  description.
- **Account / Accounts** section (singular vs plural label picked by count): loading state
  *"Loading accounts…"*, error state *"Unable to load accounts. {message}"*, then one row
  per connected account (`IntegrationAccountsSection.tsx`):
  - Avatar (or provider icon fallback), display name, a **Default** badge when this is the
    default account and there is more than one (tooltip: *"Projects without an explicit
    account use this one."*), and a badge for the credential source
    (`providerCredentialSourceLabel`).
  - Detail line, e.g. *"Connected"*.
  - Set-default control (circle/circle-check icon button) when >1 account, tooltip *"Set as
    default"* / *"Default account"*; changing it toasts *"Default {Provider} account
    updated"* / *"Projects without an explicit account use {name} now."*
  - Reconnect button (only for providers that support reconnect) — reopens the integration
    setup modal pre-filled with that account.
  - Remove button (X): confirm dialog title *"Remove {account}?"*, and if the account is
    used by N projects, description warns *"This account is used by {N} project(s).
    Removing it will disable {Provider} features for those projects until another account
    is assigned."* Otherwise *"This removes the saved {Provider} credentials for this
    account."* On success toast *"{Provider} account removed"*.
- **"Add {Provider} account"** dashed card (or **"Add another {Provider} account"** once
  one exists) opens the integration setup modal; shows a spinner while a connect mutation
  is in flight.

### GitHub device-flow modal
`browser/github-device-flow-modal.tsx` (used by the GitHub integration's connect flow).
States:
- Waiting for a code: *"Waiting for GitHub..."* spinner in the code box.
- Code received: a large monospace one-time code (auto-copied to clipboard, toast **"✓ Code
  copied"** *"Paste it in GitHub to authorize"*), two numbered steps (*"Paste the code in
  GitHub. The code has already been copied."*, *"Authorize Emdash."*), and after 3 seconds
  auto-opens the browser to GitHub's device page (countdown shown: *"Opening GitHub in {n}s..."*).
  Footer shows *"Waiting for authorization"*, a live countdown *"Code expires in
  {mm:ss}"* (starts at 15:00), and a link **"Having trouble?"** to the Emdash GitHub issues
  URL.
- Success: title **"GitHub connected"**, *"You're connected to GitHub"* with avatar and
  `@login`; auto-dismisses after 1s.
- Error: title **"Authentication failed"**, red panel *"GitHub authorization failed"* with
  the error message; also a toast **"Authentication Failed"**.
- Keyboard: `Cmd/Ctrl+C` copies the code, `Enter` or `Cmd/Ctrl+R` opens GitHub in the
  browser. Closing the modal before success cancels the device flow (toast **"GitHub
  connection unsuccessful"** *"Device flow was canceled"*).
- Code expiring (900s countdown hits 0) sets error *"Code expired. Please try again."*

## Interface page

Header: **"Interface"** / *"Customize the appearance and behavior of the app."*

### Color mode
`ThemeCard.tsx`. Three selectable tiles: **System** (monitor icon), **Emdash Light** (sun
icon), **Emdash Dark** (moon icon). Selecting fires telemetry `setting_changed` /
`{setting:'theme'}`. Store: theme primitive (`null` = system, `'emlight'`, `'emdark'`).

### Application icon
`TrayIconSettingsRow.tsx`. Title *"Show Emdash in the {menu bar|system tray}"* (label
switches by OS), description *"Quick access to Emdash from the {menu bar|system tray}."*
Switch, default **on**. Store: `app-settings.interface.showTrayIcon`.

### Terminal
`TerminalSettingsCard.tsx`, app-settings key `terminal`.
| Setting | Description | Control | Default |
|---|---|---|---|
| Default terminal shell | *"Used for new local terminals. Remote terminals use the remote system shell."* | Select, populated from detected local shells; unavailable entries disabled with a reason tooltip | `system` |
| Terminal font | *"Choose the font family for the terminal."* | Combobox grouped **Popular** (Menlo, SF Mono, JetBrains Mono, Fira Code, Cascadia Code, Iosevka, Source Code Pro, MesloLGS NF — only ones actually installed show) and **Installed** (remaining installed fonts); free text also accepted (Enter). Shows *"Loading fonts..."* while probing, *"No fonts found."* when empty. | Combobox | Default (Menlo) |
| Terminal font size | *"Adjust the font size used by terminal sessions and CLI agents."* | +/- stepper, px, clamped to `[TERMINAL_FONT_SIZE_MIN, TERMINAL_FONT_SIZE_MAX]` | `TERMINAL_FONT_SIZE_DEFAULT` |
| Auto-copy selected text | *"Automatically copy text to clipboard when you select it in the terminal."* | Switch | off |
| Use Option as Meta key (macOS only) | *"Treat the Option key as the Meta key in the terminal."* | Switch | off |

Font/size/auto-copy/option-meta changes also dispatch `window` CustomEvents
(`terminal-font-changed`, `terminal-auto-copy-changed`, `terminal-mac-option-is-meta-changed`)
so live terminal instances pick them up without a restart.

### Files
`FilesSettingsCard.tsx`, app-settings key `files`. Three multi-line textareas (one pattern
per line, committed on blur, normalized via `normalizeExclusionPatterns`):
- **File tree exclusions** — *"Hide matching files or folders from the editor file tree."*
- **Search exclusions** — *"Exclude matching files or folders from file and content
  search."*
- **Watcher exclusions** — *"Folders the file watcher skips for the editor, Git status, and
  workspace tracking. Watching dependency or build folders can use tens of thousands of
  native watches. Changes apply after restart."*
Each has its own reset-to-defaults button; placeholder *"One pattern per line"*.

### Sidebar
`SidebarMetadataSettingsCard.tsx`, app-settings key `interface`. Three switches, all
default **on**:
- **Left sidebar line changes** — *"Show added and removed line counts for tasks in the
  left sidebar."*
- **Left sidebar PR status** — *"Show GitHub PR merge and status icons for tasks in the
  left sidebar."*
- **Left sidebar timestamps** — *"Show the relative task timestamp in the left sidebar."*

### (unlabeled interface card)
`InterfaceSettingsCard.tsx` — **Context bar**: *"Hide the on-screen context trigger. The
keyboard shortcut still works."* Switch, default off (context bar shown). Store:
`app-settings.interface.hideContextBar`.

### Keyboard shortcuts
`KeyboardSettingsCard.tsx`. Grouped by category (from `SCOPE_CATALOG`/`COMMAND_CATALOG`);
each row shows the command title/description and its current key-cap chord (clicking opens
capture mode). While capturing: button text **"Press keys..."** (pulsing) plus a
**"Cancel"** button. On a captured chord:
- If it conflicts with a **reserved** system binding or another **error**-severity command,
  it's rejected: toast **"Shortcut is reserved"** or **"Shortcut conflict"**, description
  *"Conflicts with "{title}". Choose a different shortcut."*
- Otherwise saved; toast **"Shortcut updated"**, description *"{command} is now {keys}."*
  — if it merely shadows another binding in some context, appends *" It shadows {other
  command} in some contexts."*
Per-row hover actions: **Reset to default** (rotate icon; only if overridden — toast
**"Shortcut reset"**, *"{command} reset to default."*) and **Remove shortcut** (X icon;
clears the binding entirely — toast **"Shortcut removed"**, *"{command} no longer has a key
binding."*). On macOS, `Cmd+H` (Hide Emdash) is treated as an extra reserved system binding
that user shortcuts cannot be assigned to.

### Tools
`HiddenToolsSettingsCard.tsx` — one row per "open in" external app (from `OPEN_IN_APPS`,
e.g. Finder/Explorer, VS Code, Terminal, etc.), sorted detected-first then alphabetically.
Each row: icon, name, a small colored dot + **"Detected"**/**"Not detected"** label, and a
Switch to show/hide it from the app's "open in" menu (disabled and tooltip *"Install this
tool to show it in menu"* when not detected; otherwise tooltip *"Hide from menu"* /
**"Show in menu"**). Store: `app-settings.openIn.hidden` (list of hidden app ids).

## Browser page

Header: **"Browser"** / *"Manage browser profiles and their stored logins."*
(`BrowserSettingsCard.tsx`, app-settings key `browser`.)

- **Default browser profile** — *"New browser tabs open with this profile. You can switch
  an individual tab's profile from its toolbar menu."* Select of named profiles plus
  **"Isolated per task"**.
- **Disable CORS for localhost** — *"Allows pages opened from localhost in Emdash browser
  tabs to call APIs that do not send matching CORS headers."* Switch, default off.
- **Browser profiles** section: *"Each profile keeps its own cookies and logins, shared
  across tasks. Profiles do not import anything from your system browser."* List of
  profiles, each with inline rename (Enter/Escape) and a `⋯` menu: **Rename**, **Clear
  storage** (confirm: *"Clear {name} browser storage?"* / *"This clears cookies, local
  storage, IndexedDB, and cache for this profile. Browser tabs using it will be signed
  out."*), **Delete** (disabled if it's the only profile; confirm: *"Delete {name} browser
  profile?"* / *"This removes the profile and clears its cookies, local storage, IndexedDB,
  and cache."*). **"+ Add profile"** button with inline name input.
- **Browsing data** section: *"Clear cookies, cached files, and site data from the in-app
  browser."* **"Clear all browsing data"** button plus an expandable chevron listing
  individual categories — **Cookies** (*"Delete cookies"*), **Site data** (*"Delete site
  data"*), **Cached images and files** (*"Delete cached images and files"*) — each with its
  own confirm dialog and its own destructive-styled confirm button; success toasts read
  *"{Category} cleared"*; failure toasts read *"Could not clear browsing data"*.

## Repository page

Header: **"Repository"** / *"Configure repository and branch settings."*
(`RepositorySettingsCard.tsx`, app-settings key `project`.)
- **Branch prefix** text input (placeholder *"Branch prefix"*, default **"emdash"**,
  normalized on blur via `normalizeBranchPrefix`); helper text *"Leave empty to create
  branches without a prefix."*
- **Random branch suffix** — *"Add a random suffix to branch names."* Switch, default on.
- **Auto-push on create** — *"Push the new branch to the selected project remote and set
  upstream after creation."* Switch, default on.

## Agents page ("clis-models")

Header: **"Agents"** / *"Manage agents and model configurations."*
(`agents-page/AgentsSettingsPage.tsx` → `AgentsPanel.tsx`). A searchable, grouped list of
every agent provider Emdash knows about (installed and not), toolbar has search
(*"Search agents…"*) and a refresh button (spinning while probing). Row: icon, name, an
**"Update available"** badge (amber) when applicable, and capability icons (e.g. whether
the agent supports the chat UI/ACP). Empty states: *"No agents"* / *"Agents appear here
once they can be detected on this machine."* or, while filtered, *"No agents match your
search"* / *"Try a different agent name."*

Clicking a row opens a right **Agent Settings** (installed) / **Install Agent**
(not-installed) sheet (`AgentDetailSheet.tsx`):
- Header: icon, name, **"View Website"** external link if known, and *"Supports:
  Prompts{, Sessions}"* caption.
- **Installation** section (`InstallSection.tsx` /
  `DependencyInstallationStatusCard.tsx`) — a status row that reads one of:
  - **Found** `v{version}` **installed using {source}** (green check icon)
  - **Checking…** (spinner)
  - **Not found — install below**
  - **Uninstalled**
  A `⋯` menu offers **Change source** (submenu listing every discovered install: package
  managers, PATH binary, manual path/CLI override, each tagged **Recommended** and/or
  **Installed** and/or **Used**), **Refresh** (toast sequence *"Refreshing
  installations..."* → *"Installations refreshed"*/*"Failed to refresh installations"*),
  **Check for updates** (*"Checking for updates..."* → *"Checked for
  updates"*/*"Failed to check for updates"*), and — when the agent supports it —
  **Uninstall** (destructive; toast *"Uninstalling {name}..."* →
  *"{name} successfully uninstalled"*/*"Failed to uninstall {name}"*). A caption *"Automatic
  updates are not available for this installation."* appears when the used install can't be
  auto-managed.
  - **Update available** card (amber icon) shows old→new version and a command row with an
    **"Update"** button; failures surface a `SudoRetryPanel` (elevated-permission retry).
  - **Install** card lists one command row per install method with an **"Install"** button
    each; same sudo-retry pattern on failure.
  - Manual override card (path or CLI-name): text input, a warning alert — *"Using an
    absolute path to the agent binary overrides auto-resolution and disables emdash's
    ability to update the agent."* (or the CLI-name equivalent) — and a **"Validate"**
    button; on success, toast **"Executable override saved"**.
  - An *"Installation guide"* external link appears when the agent provides install docs.
- **Hooks** field (only for agents that support hooks): *"Hooks let Emdash track agent
  status, deliver notifications, and capture session IDs for reliable resume."* (info
  tooltip). States: *"Configured · {~/path}"* (green check) or *"Configured on first
  session"* (clock icon) while pending.
- **Workspace Trust** field (only for agents that support it): *"Skip the folder trust
  prompt in supported CLIs for new tasks."* Shows **Enabled**/**Disabled** reflecting the
  global `autoTrustWorktrees` setting, with a **"Manage in Settings"** link back to General.
- **MCP Servers** field: pill per synced server (name + transport icon, hover reveals an X
  to remove it from this agent only — *"Remove {server} from this agent"*), empty state *"No
  MCP servers configured for this agent yet."*, **"Manage in Settings"** link to the MCP
  page (or, in a remote/connection context, closes this sheet and opens the connection's
  MCP panel instead).
- **Advanced settings** (installed agents only, collapsible, in a footer panel):
  **Additional parameters** text input (placeholder e.g. *"--enable-all-github-mcp-tools"*,
  tooltip *"Extra flags appended to the command..."*) and **Environment variables**
  key/value editor (tooltip *"Environment variables set when running the agent"*). Commits
  on blur/change; when both are empty it resets to defaults rather than storing an empty
  override. A warning strip *"Custom configuration is applied"* shows when overridden, with
  a **"Reset to defaults"** button next to the section header.
- **Default agent** row (list-level, `DefaultAgentSelector.tsx`): *"Selected by default when
  creating a new task."* — an `AgentSelector` bound to `app-settings.defaultAgent`.
- **Sign-in modal** (`AgentSignInModal.tsx`) — for agents whose auth is an interactive CLI
  login: a live xterm.js terminal running the agent's own login flow (title *"Sign in to
  {Provider}"*, subtitle *"on {machine}"* for remote hosts); auto-closes on
  authentication success; login URLs the CLI prints are opened via a confirm-before-open
  flow.

## MCP page

Header: **"MCP"** / *"Connect your agents with external data sources and tools"*
(`mcp/browser/components/McpView.tsx` → `McpPanel.tsx`). Toolbar: search (*"Search
servers…"*), refresh button (spinner while probing providers), **"+ Custom MCP"** primary
button.

Two card-grid sections: **"Added"** (installed servers) and **"Recommended"** (unmatched
catalog entries). Each card shows name, a small `{stdio|http}` transport badge with an
icon, description, and up to 5 agent icons the server is synced to (a **"+N"** overflow
counter beyond that); hover reveals a docs-link button (when the catalog entry has one) and
an edit/add button. Empty state: *"No servers match your search."* / *"No servers
available."*

Add/Edit drawer (`McpDrawer.tsx`), title **"Add {name}"** / **"Add Custom MCP Server"** /
**"Edit MCP Server"**:
- **Server Name** (locked for catalog/edit).
- **Transport** select `stdio`/`http` (locked for catalog entries).
- stdio: **Command** (placeholder *"npx"*) + **Arguments (one per line)**.
- http: **URL** (placeholder *"https://mcp.example.com"*).
- **Environment Variables** key/value list (**"+ Add env var"**); pasting `KEY=VALUE` lines
  into a key field auto-splits into multiple rows. Catalog-declared credential keys get a
  placeholder of **"Required"**/**"Optional"** and a warning highlight while empty.
- (http only) **Headers** key/value list (**"+ Add header"**).
- **Sync to agents**: chips for each synced agent (hover reveals a remove ✕; removing
  drops that agent from the pill list), an agent picker to add more, and a link **"Sync to
  all installed agents"** (disabled if none installed).
- Footer: **Remove** (edit mode only, destructive, prompts a global confirm — *"Remove MCP
  server?"* / *"This will remove "{name}" from all agents. This action cannot be undone."*)
  and **Add**/**Save** (disabled until name, provider selection, and command/URL are all
  filled; label switches to *"Adding..."*/*"Saving..."* while pending).
- Save/remove errors surface via `toast.error` with `agentConfigErrorMessage`
  (`message` or *"Unknown provider: {id}"*).

Sync is per-provider (a server can be assigned to a subset of installed agents); the
provider list itself is derived from installed-agent detection, so an agent must be
detected as installed before it can be a sync target. Telemetry: `mcp_server_added`
(`{source:'catalog'|'custom'}`), `mcp_server_removed`.

## Skills page

Header: **"Skills"** / *"Extend your agents with reusable skill modules"*
(`skills/browser/components/SkillsView.tsx` → `SkillsPanel.tsx`). Toolbar: search
(*"Search skills…"*), refresh, **"+ New Skill"** primary button.

Three card-grid sections, in order: **"Installed"**, **"Recommended"** (uninstalled catalog
entries), and, while a search of 2+ characters is in flight, **"Searching Skills.sh..."**
(loading title) / **"Skills.sh"** (results) for live results from skills.sh. Card: icon,
display name, one-line description; hover reveals a Plus (install) or Trash (uninstall)
icon button.

Clicking a card opens **Skill Detail** modal: icon, display name, and (for non-local
skills) a *"From {OpenAI|Anthropic|Skills.sh} skill library"* byline with the source's
icon. Body: an **"Example prompt"** block if the skill defines one, then the skill's own
markdown body (frontmatter stripped) rendered compact, or a shimmer placeholder while
loading. Footer: if installed, **"Uninstall"** (destructive; confirms via
*"Uninstall skill?"* / *"This will uninstall "{name}" from all agents. This action cannot
be undone."*) and, if a local path is known, **"Open"** (opens the skill folder in a
terminal); if not installed, **"Install"** (label *"Installing..."* while pending).

**New Skill** modal (`CreateSkillModal.tsx`): **Name** (placeholder *"my-skill"*, helper
*"Lowercase letters, numbers, and hyphens"*, validated 2–64 chars lowercase/digits/hyphens
via `isValidSkillName`), **Description** (required), **Instructions** (multi-line, helper
*"Define what this skill does and how agents should use it"*, placeholder notes the YAML
frontmatter is auto-added). Errors: *"Name must be lowercase letters, numbers, and hyphens
(2-64 chars)."*, *"Description is required."*, or the server's message. Success closes the
modal and invalidates the skills catalog cache; telemetry `skill_created`.

An info box (`skills-info-box.tsx`, used elsewhere in onboarding/discovery) credits skills
"from the OpenAI and Anthropic catalogs... follow the open Agent Skills standard" with
links to `github.com/openai/skills`, `github.com/anthropics/skills`, and
`agentskills.io`, and invites feedback for other libraries via the feedback modal.

Install/uninstall toast on success: **"Skill installed"** *"{skillId} is now available
across your agents"* / **"Skill removed"** *"Skill has been uninstalled"*; failures toast
**"Install failed"**/**"Uninstall failed"** with the server message. Telemetry:
`skill_installed` (`{source}`), `skill_uninstalled`.

`CatalogSkill.source` is one of `openai | anthropic | skillssh | local`
(`packages/core/src/primitives/skills/api/types.ts`).

## Automations

Automations are a separate top-level view (not under Settings), reached via its own
navigation route (`automations` view). *"Run agents on a schedule across your projects."*

### List view
`automations/browser/components/AutomationsView.tsx`. Header **"Automations"** /
*"Run agents on a schedule across your projects"*. With zero automations, the page shows a
template gallery instead of an empty list: *"Start with a template"* / *"Choose a template
and adjust it before creating your first automation"*, a 3-column grid of built-in
templates. Once ≥1 automation exists, a searchable list (*"Search automations…"*) replaces
it, each row a two-line summary: name (dimmed if disabled) + live agent-status indicator +
cron description (via `cronstrue`) + project chip; second line shows the latest run's
status icon/time/trigger-kind or *"No runs"*, and on the right either *"Next run scheduled
{time}"* or *"Disabled"*. An enable/disable `Switch` sits at the row's left (disabled with
a tooltip explaining why when the automation's remote runtime is unavailable). Error slot:
*"Could not load automations."* Empty-search slot: *"No automations match your search."*
**"+ New Automation"** button always available in the toolbar once automations exist.

### Built-in templates (`browser/builtin-catalog.ts`)
Six templates, each with a category, icon, a default weekly cron trigger (UTC) and a
default prompt:
1. **Find critical bugs** (Code quality) — weekly Mon 10:00 UTC.
2. **Summarize changes daily** (Status reports) — weekly Mon 09:00 UTC (despite the name,
   the default trigger is weekly, not daily).
3. **Scan for vulnerabilities** (Security) — weekly Mon 11:00 UTC.
4. **Add test coverage** (Code quality) — weekly Tue 10:00 UTC.
5. **Fix reported bugs** (Incidents & triage) — weekly Mon 10:00 UTC.
6. **Generate docs** (Documentation) — weekly Fri 14:00 UTC.
Each has its own long default prompt (see source for exact wording); selecting one in the
create sheet fills name/cron/prompt, still editable before saving.

### Create automation
Right-side sheet, header **"Create automation"**. Fields: **Name** (large inline input,
placeholder *"Daily Pull Request Review"*), then `AutomationSettingsFields` (Project
selector, Schedule via `CronPicker`, then a task-config panel with **Prompt** and
**Workspace Settings** tabs — reuses the regular new-task prompt/workspace UI, including
provider/model selection and workspace preset). A collapsible **"Use a template"** panel at
the bottom shows the template rail (collapse state persisted in `localStorage` key
`emdash-automation-template-section-collapsed`). If the target project/workspace can't run
automations right now, a warning strip shows the `availability.reason`. **Create** button
disabled until the form is valid (name/prompt/provider/cron) and the target is available;
label *"Saving…"* while pending. On success: toast **"Automation created"**,
*""{name}" is ready to go."*

### CronPicker
`browser/CronPicker/CronPicker.tsx` — a sentence-style schedule builder: **"Every [minute |
hour | day | week | month | year] ..."** with conditional clauses — *"in {month}"* (year),
*"on the {1st..31st}"* (month/year), *"on {weekday}"* (week), *"at {HH:MM}"* (day/week/
month/year, spinner-style hour/minute segments — type, arrow keys, or mouse wheel while
focused, values wrap within range), or *"at minute {0-59}"* (hourly). If the underlying
cron expression can't be parsed, shows *"Could not parse the cron expression. Showing
defaults — saving will overwrite it."* and falls back to a default state.

### Automation detail
Right-side sheet, header **"Automation details"**. Inline-editable name (saved on blur),
an enable `Switch`, and a `⋯` menu with **"Delete automation"** (destructive) — deleting
closes the sheet first, then (after the sheet finishes its close animation) opens a confirm
dialog: *"Delete automation"* / *""{name}" and its run history will be permanently
deleted."*, confirm label **"Delete"**; declining explicitly re-opens the sheet. A **Next
run scheduled {time}** banner (clock icon, info-blue) shows when a run is queued. Two tabs:
- **Runs** (default) — a run-history list with a **Play** icon button to *"Run now"* (its
  tooltip explains exactly why it's disabled: no project assigned, runtime unavailable,
  automation disabled, or automation not fully configured).
- **Settings** — the same `AutomationSettingsFields` as create, but **auto-saving**: every
  field change (cron, workspace config, provider) patches the automation immediately (no
  explicit Save button); prompt saves on blur; name saves on blur. Save errors surface
  inline under the fields.

All settings-field edits go through `useAutomationSettingsAutoSave.ts`, which silently
no-ops (does not save) while the automation is not editable, e.g. remote runtime
unavailable, or required fields (name/prompt/valid cron) are missing.

### Run history
`RunHistory.tsx` — filter tabs **All / Done / Failed / Skipped / Cancelled**, each with a
live count; **"Load more"** pagination (page size 25); *"Connect to the remote automation
runtime to load its runs."* when the runtime is unreachable; *"No runs yet."* empty state.
Each run row (`AutomationRunRow.tsx`) shows the adopted task's name/agent-status/diff
stats if a task exists yet, else a placeholder *"Creating task…"* (or the run's generated
name); clicking an interactive row opens the underlying task (adopting the run into a task
first if it isn't one yet — spinner state while adopting). A run whose deadline was missed
renders its name in destructive red.

**Run status badges** (`RunStatusBadge.tsx`):
| Status | Badge text | Style |
|---|---|---|
| `done` | "Agent started" | green, check icon |
| `failed` | "Failed" | red, X icon; tooltip shows `formatRunError` |
| `queued` | "Queued" | blue, clock icon |
| `skipped` | "Skipped" | gray, minus-circle |
| `cancelled` | "Cancelled" | gray, minus-circle |
| `provisioning_workspace` | "Preparing workspace" | gray, spinning loader |
| `starting_session` | "Starting agent" | gray, spinning loader |
| `scheduled` | *(no badge shown)* | — |

Run error text (`automation-run-format.ts`):
- `deadline_exceeded` → *"Skipped because it waited in the queue for too long"*
- `manually_stopped` → *"Manually stopped"*
- step `provision_workspace` → server message or *"Could not prepare the automation
  workspace"*
- step `start_session` → server message or *"Could not start the agent session"*
- otherwise → server message or *"{step}:{code}"*

Trigger-kind labels: `cron` → *"Triggered by schedule"*, `manual` → *"Triggered
manually"*.

### Automation-level error strings (`formatAutomationError`)
`name_required` → "Give the automation a name"; `automation_not_configured` → "Finish
configuring the automation before saving"; `conversation_config_prompt_required` → "Add a
prompt before saving"; `cron_invalid` → "Enter a valid schedule"; plus typed errors for
project-not-found, automation-not-found/conflict, workspace-not-found/not-supported,
deployment-stale, no-project-attached, run-not-found/not-adoptable, and
adoption/runtime-unavailable (server message passed through).

Telemetry events: `automations_viewed`, `automation_created`
(`{enabled, trigger_kind:'cron', provider, has_initial_prompt}`),
`automation_enabled_changed`, `automation_run_started`, `automation_run_completed`.

## Updates

### UpdateCard (General page)
UI states (`packages/ui/.../update-card.tsx`, wired via `settings/browser/components/
UpdateCard.tsx` + `updates/browser/update-store.tsx`):
| State | Title | Description | Action |
|---|---|---|---|
| checking | "Checking for updates" | "Current {app} version v{x}" | button disabled, "Checking…" |
| up-to-date | "You're up to date" | "Current {app} version v{x} is up to date" | "Check for updates" |
| up-to-date + error | "Could not check for updates" | "Current {app} version v{x}" | "Check for updates" |
| update-download-available | "An update is available" | "Version v{x} is available. Download and restart {app} to use the new version" | "Download" (or "Retry download" after an error) |
| update-downloading | "Downloading update" | "Downloading version v{x}. You can keep using {app} while it downloads." | disabled button "Downloading…" or "Downloading… {pct}%" |
| update-install-available (downloaded) | "Update ready to install" | "Restart {app} to use the new version" | "Restart" |
| update-installing | "Restarting to install update" | "{app} will reopen with the new version" | disabled "Restarting…" |

Status icon: success (green) when up-to-date, error (red) on failure, warning (amber)
otherwise. Error panel shows the message, a collapsible **Details** section (raw
diagnostic text) when it differs from the summary, and a **"Copy details"** button (turns
into a check + "Copied", or *"Could not copy. Select the text to copy it manually."* if the
clipboard write fails).

Also: a toast fires when a new version becomes available while the app is running —
**"Update Available"**, *"Version {x} is available to download and install."*, action
button **"Update"** (navigates to Settings → General and starts the download). This toast
is snoozed per-version for 6 hours (`localStorage` key `emdash:update:lastNotified`) so it
doesn't repeat every check.

### Update mechanics (`src/main/host/updates/update-service.ts`)
- Backed by `electron-updater`; disabled entirely in dev builds (`import.meta.env.DEV`).
- `autoDownload = false`, `autoInstallOnAppQuit = true`, `autoRunAppAfterInstall = true`,
  `allowDowngrade = false`.
- Two channels: `IS_CANARY` (product name **"Emdash Canary"**) sets `allowPrerelease =
  true` and channel id `v1-canary`; the stable build (**"Emdash"**) uses `v1-stable` and
  never installs prereleases.
- Checks every **60 minutes**; first check is delayed **30 s** after launch; a check also
  fires from the app menu's "Check for Updates" item.
- OS-level notifications are also published on `available`/`downloaded`/`error` events
  (`update-notifications.ts`) in addition to the in-app toast.

## Telemetry

Wire contract: `capture`, `getStatus`, `setEnabled`, `getFeatureFlags`
(`core/features/telemetry/node/wire-controller.ts`). Consent state
(`useTelemetryConsent.ts`) tracks: `prefEnabled` (user pref AND not env-disabled),
`envDisabled` (from `TELEMETRY_ENABLED=false` or missing keys/host), `hasKeyAndHost`
(whether the build even has PostHog wired up). Events cover app lifecycle (`app_started`,
`app_closed`, `boot_watchdog_triggered`), navigation/focus tracking (`focus_changed`,
`*_viewed` per view), automations, MCP add/remove, skill install/uninstall, and a generic
`setting_changed` (used at least for theme and telemetry toggles) —
see `core/primitives/telemetry/api/telemetry.ts` for the full property schema (large; not
fully enumerated here as none of it is settings UI).

### Feature flags
`getFeatureFlags()` returns a `Record<string, boolean>` sourced from PostHog remote config
(`src/main/lib/telemetry.ts`); `useFeatureFlag(flag)` reads it in the renderer and defaults
to `false` while loading or if telemetry isn't configured. In dev builds, `FLAG_<name>` env
vars in `.env.local` (hyphens → underscores) override a flag and are read by the main
process and passed over IPC, never baked into the bundle. **As of this version no code path
calls `useFeatureFlag`** — the plumbing exists but nothing in the current app is gated by a
named feature flag.

## Dev-perf (developer-only)

Not reachable through Settings; opened via command palette (**"Open Process Panel"**,
**"Capture Performance Trace"**, category *Developer*) or a debug hotkey.
`DevProcessPanelModal.tsx`:
- Live-polled process table (PID, CPU %, formatted memory, indented by process-tree depth),
  with a totals footer row *"Total ({n} processes)"*. Shows *"Loading…"* while the first
  snapshot is pending, and *"Process snapshots are not supported on this platform."* when
  unsupported.
- **"Capture trace (10 s)"** button → while running shows *"Recording trace (10 s)…"*; on
  success *"Trace written to {path}"*; on failure *"Trace capture failed: {message}"*.
- **Verbose spawn logging** switch, toggles a main-process debug flag live.

## Legacy-port (first-run only)

Not a settings page — this is the onboarding "import your old data" step
(`workbench/browser/onboarding/import-step.tsx`), shown once when a previous Emdash
installation's data (`v0` and/or `v1-beta` database) is detected on first launch.
- Single-source case: title *"Import your Emdash {v0|v1-beta} data"*, description *"Found
  {n} project(s) and {n} task(s) from your previous Emdash installation"*.
- Multi-source case: *"Do you want to import projects and tasks from other Emdash
  versions?"* / *"Select one or more sources."*, with a card per source
  (`ImportSourceSelector.tsx`) showing project/task counts and a checkmark when selected.
- While scanning: *"Scanning existing Emdash data..."*
- If both v0 and v1-beta are selected and have colliding identities, a **conflicts** step
  (`ProjectConflicts.tsx`) lets the user choose which source wins per conflicting project
  (defaults to `v1-beta`).
- Buttons: **"Import data"** (label *"Importing..."* while running; a progress UI shows
  during the import) and **"Start fresh"** (skips import entirely — an explicit empty
  `sources: []` import). Failures render inline in red under the buttons.

## Unverified / unclear

- Whether `useFeatureFlag`'s PostHog-backed flags are actually populated with any live
  flags server-side at Anthropic/Emdash's PostHog project — the client plumbing is real but
  no in-app consumer exists in this checkout to confirm end-to-end behavior.
- Exact wording of every install-option command string and every agent's specific install
  docs/website URLs — these come from per-agent plugin metadata
  (`packages/plugins/src/agents/impl/`) which was not individually enumerated here (dozens
  of agents); the *mechanism* by which they render is fully covered above.
- Whether there is a hard cap on the number of automations per project — no such limit was
  found in `automations/node/creation-admission.ts` or `deployment-builder.ts` in this
  pass; only workspace/branch placement-conflict admission checks were found.
- The System / Workspaces / Conversations / Connections / Prompts settings pages are
  contributed by other feature slices (`machines`, `library`) outside this audit's assigned
  paths and are intentionally not catalogued here beyond their sidebar presence.

## Coverage note

Every file under `settings/`, `account/`, `automations/`, `skills/`, `mcp/`, `updates/`,
`telemetry/`, `dev-perf/`, and `legacy-port/` in the given scope was either read directly or
covered via its immediate caller/callee (e.g. `AutomationTemplateCard`/`Rail`,
`live-model-hooks`, `runtime-adapter` glue, and node-side `repo.ts`/`automations-service.ts`
CRUD plumbing were skimmed for behavior but not verbatim-quoted since they carry no
user-visible strings). Per-agent plugin install metadata
(`packages/plugins/src/agents/impl/*`) was intentionally not enumerated agent-by-agent —
the UI mechanism that renders it is fully documented instead.
