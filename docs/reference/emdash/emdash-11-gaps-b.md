# Gaps found, part two

Slice: `core/features/{preview-servers,projects,repository,search,settings,skills,source-control,tasks,telemetry,terminals,updates,workbench,workspaces}`, `core/primitives/`, `packages/ui/src/`, `packages/chat-ui/src/`. A script pulled JSX text and label/title/description/placeholder/aria-label/tooltip/message/error-string attributes from 1,388 non-test files: 1,726 usable strings after stripping type-signature noise. 836 (~48%) already have a literal match somewhere in the nine existing catalog files; 890 did not. Most of those 890 are internal-only (thrown assertions in `primitives/mementos`, `view-scopes`, `palette`, `navigation`, `modals`, node-side `Workspace ${id} was not found` errors) rather than user-visible gaps — the write-up below covers the genuinely uncovered user-facing surface.

## Global commands & command palette

### Global command catalog (workbench)
`Cmd+K`-style command palette entries not previously catalogued, defined in `workbench/contributions/commands.ts`: Open Settings ("Open application settings"), Add Project ("Add a new local or SSH project"), New Task ("Create a new task in this project"), Send Feedback ("Send feedback to the emdash team"), Toggle Theme ("Switch between light and dark themes"), Navigate Back/Forward ("Navigate to the previous/next location"), Open Command Palette, Open in Editor ("Open the project in the default editor"), Confirm ("Confirm the current action"), Close Modal, tab commands (Next/Previous Tab, Close Tab, Reopen Closed Tab, Rename Tab, Move Tab to Right Pane), "Switch to tab ${index}" (numbered tab jump), Save File, Save All, Search Terminal, Toggle Left Sidebar. Source: `apps/emdash-desktop/src/core/features/workbench/contributions/commands.ts:8-221`.

### Task-scoped command catalog
A second command set, active only while a task is open, defined in `tasks/contributions/commands.ts` — not previously catalogued as a full list: New Conversation (`Mod+T`), New Conversation in Right Split (`Mod+D`), View Changes/Conversations/Files sidebar panels (`Mod+Shift+1/3/2`), Search File Contents (`Mod+Shift+F`, works even while a terminal has focus), View Terminals, Toggle Terminal Drawer (`Mod+J`), Toggle Right Sidebar (`Mod+.`), New Terminal (`Mod+Shift+\``), Open Browser (`Mod+Shift+B`) plus Browser Back/Forward/Reload/Focus URL/Open Externally/Copy URL (`Mod+Shift+C`), Git Fetch/Pull/Push, Pin Task, Archive Task (`Mod+Shift+E`, ignored while an editor has focus), Convert to Regular Task ("Detach this task from its automation run"), Next/Previous Task (`Mod+Alt+ArrowDown/Up`), Delete Selected Tasks (`Mod+Backspace`, ignored while a text input has focus). Source: `apps/emdash-desktop/src/core/features/tasks/contributions/commands.ts:4-256`.

### Command palette input modes
Typing `/` in the command palette search box switches into a filtered command mode; a pill reading "Clear ${keyword} mode" lets you back out. Placeholder text is "Search tasks, projects, actions…". Source: `apps/emdash-desktop/src/core/features/workbench/browser/command-palette/command-palette-modal.tsx:145,168`.

## Home screen and project creation

### Home view entry points
Before any project exists, the home view offers four ways in, each with its own description: "Create a project from an existing local directory"; "Create a project and repository on GitHub"; Clone from GitHub — "Clone a GitHub repository to work on locally"; Add remote project — "Create a project on a remote SSH server". Source: `apps/emdash-desktop/src/core/features/workbench/browser/home-view.tsx:17-35`.

### Drag-and-drop project add
Dragging a folder onto the left sidebar shows "Drop to add project" as a drop target; on drop it inspects the path and either adds it as a project or fails with "Could not inspect ${basename}: ${error}" / "Failed to add ${basename} as a project." Source: `apps/emdash-desktop/src/core/features/workbench/browser/sidebar/{left-sidebar.tsx:55,use-sidebar-drop.ts:65,88}`.

### External link and quit dialogs
Clicking a link that isn't clearly in-app opens a chooser: "Open link?" / "Choose where to open this link." (options to open in the in-app browser or the system browser). Quitting with an unsaved editor file shows "Save changes before quitting?" Source: `apps/emdash-desktop/src/core/features/workbench/browser/{external-link-choice-dialog.tsx:44-47,quit-unsaved-changes-dialog.tsx:18}`.

### Feedback modal
Reached from the command palette / help menu. Fields: a required "What do you like? How can we improve?" textarea, an optional email placeholder "productive@example.com (optional)", an "Attach image" button plus a "Drop image here" drop zone, a toggle "Include diagnostic logs" with an info affordance "More information about diagnostic logs", a fallback link "Open Github Issue instead", and a submit state "Sending...". Source: `apps/emdash-desktop/src/core/features/workbench/browser/feedback-modal/feedback-modal.tsx:135-290`.

## MCP server catalog (one-click install directory)

Settings → MCP servers offers a curated, bundled directory of ~46 well-known MCP servers a user can add to an agent with one click, in addition to typing a server manually or pulling from the live MCP registry (`registry.modelcontextprotocol.io`, cached 1 hour) and from skill.sh. Each catalog entry carries a display name, a one-line description, a docs URL, and any required credential keys, e.g.: Playwright — "Browser automation with Playwright"; Context7 — "Fetch up-to-date documentation and code examples"; Supabase — "Manage databases, authentication, and storage"; Vercel, Sentry, Stripe, Figma, Linear, Slack, Cloudflare Developer Platform, Netlify, Chrome DevTools, Atlassian (Jira & Confluence), Clerk, PlanetScale, Neon, Google Cloud BigQuery, Hugging Face, Exa, OpenRouter, Resend, PostHog, Honeycomb, Apollo GraphOS, Sanity, Amplitude, Asana, ClickUp, Microsoft Learn, Jam, Webflow, Cloudinary, WordPress, Canva, Miro, Intercom, Make, AWS Marketplace, MotherDuck, Magic Patterns, Wix, DevRev, Prisma, Railway, MongoDB, monday.com, Shopify Dev, Graphite, Axiom, Azure MCP Server, and a generic multi-protocol gateway entry. Per-agent MCP config is also shown per agent card: "${server.name} (${server.transport})", with "Remove ${server.name} from this agent" and an empty state "No MCP servers configured for this agent yet." Source: `apps/emdash-desktop/src/core/primitives/mcp/api/catalog.ts:16-591`; usage in `apps/emdash-desktop/src/core/features/catalog/node/catalog-service.ts`; per-agent panel in `apps/emdash-desktop/src/core/features/settings/browser/agents-page/AgentMcpSection.tsx:24-55`.

## Open-in / open-with app directory

Settings and the checkout page's "Open in" menu let the user launch the project or a file in one of many detected external apps, each with a display label, an icon, and platform-specific detection (bundle IDs, `which`, `mdfind`, or `vswhere.exe` on Windows). Beyond the editors already catalogued, the uncovered names present in the directory are: VSCodium, Xcode, Kaku, Alacritty, Warp, iTerm2, Ghostty, Termy, Athas, Trae Solo, IntelliJ IDEA, Android Studio (and an "Android Studio Canary" variant distinguished only by an `mdfind` query since both share a bundle ID), PhpStorm, WebStorm, PyCharm, RubyMine, RustRover, and Visual Studio (Windows only, launched via `vswhere -latest -property productPath` since `devenv.exe` is rarely on PATH). Source: `apps/emdash-desktop/src/core/primitives/open-in-apps/api/open-in-apps.ts:33-782`.

## Settings pages

### Settings search index
`settings/browser/search/settings-search.ts` is a searchable index of every settings page/card, each with its own one-line description surfaced when searching settings: app updates ("App version and updates."), telemetry ("Help improve Emdash by sending anonymous usage data."), permission skipping ("Skip permission prompts for supported agents when creating new tasks."), From-Branch tasks ("Start new From Branch tasks in a dedicated task branch and worktree."), issue-in-prompt ("Add the selected issue to the initial agent prompt."), system banners ("Show system banners when agents need attention or finish."), account/GitHub OAuth ("Create an Emdash account to automatically connect GitHub using OAuth2."), agents page, MCP servers page, skills page, integrations page ("Connect issue trackers and source control providers."), machines page ("Reusable remote hosts for SSH projects."), branch prefix ("Leave empty to create branches without a prefix."), auto-push-on-create ("Push the new branch to the selected project remote and set upstream."), worktree cleanup ("Review task worktree usage and remove stale task worktrees."), conversation history ("Every conversation record on this machine, including unlinked ones."), prompts library ("Manage reusable prompts for tasks and conversations."), resource monitor ("Review local resource utilization and system dependencies." / "Track CPU and memory usage for running agents."), tray icon ("Keep quick access to Emdash while agents run in the background."), theme ("Choose how Emdash looks."), sidebar line-count metadata, sidebar PR status icons, keyboard shortcuts ("Rebind, reset, or remove app keyboard shortcuts."), CORS bypass for localhost, browser profiles, and browsing-data clearing. Source: `apps/emdash-desktop/src/core/features/settings/browser/search/settings-search.ts:35-358`.

### Sidebar metadata toggles
Two independent left-sidebar display toggles under Settings, each with default-off / configurable state: "Show left sidebar line changes" ("Show added and removed line counts for tasks in the left sidebar.") and "Show left sidebar PR status" ("Show GitHub PR merge and status icons for tasks in the left sidebar."), plus "Show left sidebar timestamps". Source: `apps/emdash-desktop/src/core/features/settings/browser/components/SidebarMetadataSettingsCard.tsx:28-81`.

### Repository / branch settings card
"Append random branch suffix" toggle and "Enable automatic push on create" toggle, the latter described as "Push the new branch to the selected project remote and set upstream after creation." Source: `apps/emdash-desktop/src/core/features/settings/browser/components/RepositorySettingsCard.tsx:69-89`.

### Terminal font settings
A font picker defaulting to "Default (${DEFAULT_FONT_FAMILY})" with a "Search custom font" field, plus separate increase/decrease buttons for terminal font size showing the size in `px`. Source: `apps/emdash-desktop/src/core/features/settings/browser/components/TerminalSettingsCard.tsx:47-322`.

### Integration accounts (multi-account)
Settings supports multiple accounts per integration (e.g. multiple GitHub accounts). Removing one warns contextually: if no project pins that account, "Projects without an explicit account use ${accountLabel} now."; if a project does pin it, "This account is used by ${projectLabel}. Removing it will disable ${integration} features for those projects until another account is assigned." Confirm dialog: "Remove ${accountLabel}?" with a toast on completion "Removed ${accountLabel}." Row actions: "Reconnect account", "Remove account", "Add ${integration} account", "Connect another account…". Source: `apps/emdash-desktop/src/core/features/settings/browser/components/IntegrationAccountsSection.tsx:44-192`; `projects/browser/components/settings-view/sections/integration-accounts-section.tsx:196`.

### Theme settings
Three theme-selection controls, each independently labelled for accessibility: "Set theme to system preference", "Set theme to Emdash Light", "Set theme to Emdash Dark". Source: `apps/emdash-desktop/src/core/features/settings/browser/components/ThemeCard.tsx:14-16`.

### File watcher exclusions
Files settings card: a glob-pattern field described as "Exclude matching files or folders from file and content search." and a separate "watched folders" field described as "Folders the file watcher skips for the editor, Git status, and workspace tracking. Watching dependency or build folders can use tens of thousands of native watches. Changes apply after restart." Source: `apps/emdash-desktop/src/core/features/settings/browser/components/FilesSettingsCard.tsx:59-70`.

### Telemetry card
"Enable anonymous telemetry" toggle with a trailing "for details." link. Source: `apps/emdash-desktop/src/core/features/settings/browser/components/TelemetryCard.tsx:34-47`.

### Notifications
"Preview sound" button next to a sound picker described as "Select an audio file to play for agent events." Source: `apps/emdash-desktop/src/core/features/settings/browser/components/NotificationSettingsCard.tsx:40-88`.

### Interface: context trigger
"Hide the on-screen context trigger. The keyboard shortcut still works." — a toggle to hide a visible UI affordance while keeping its keybinding functional. Source: `apps/emdash-desktop/src/core/features/settings/browser/components/InterfaceSettingsCard.tsx:25`.

### In-app browser profiles
A full profile manager under Settings → Browser: add a profile (name field, "New browser profile name", Save/Cancel), rename a profile in place (Save/Cancel with per-action aria-labels "Save ${profile} browser profile name" / "Cancel renaming ${profile} browser profile"), and delete a profile ("Delete ${profile} browser profile?" — clears its storage first and reassigns tabs to a replacement profile; if storage can't be cleared the profile is kept and a toast reads "The profile storage could not be cleared, so the profile was kept."). Each profile keeps its own cookies/logins, described as "Each profile keeps its own cookies and logins, shared across tasks." A CORS-bypass toggle: "Allows pages opened from localhost in Emdash browser tabs to call APIs that do not send matching CORS headers." Browsing-data clearing is broken into three categories — Cookies, Site data, Cached images and files — each with its own confirm dialog (e.g. "Delete cookies?" / "This deletes cookies for every in-app browser profile. Open browser tabs will be signed out.") plus a single "Clear all browsing data?" that clears all three at once and reloads every open browser session. Source: `apps/emdash-desktop/src/core/features/settings/browser/components/BrowserSettingsCard.tsx:75-490`.

### Agent CLI dependency detection & source override
Settings → Agents shows, per detected CLI dependency, a status line — "Found ${version} installed using ${label}", "Checking…", "Not found — install below", or "Uninstalled" — plus a "…" menu with "Installation options" / "Select source" that lets the user override which of several installed copies (from different package managers, a version manager, a manual path, or a pinned realpath) Emdash uses, each row showing its provenance label ("Manual", "Version manager", "Unknown", or the humanized install method) and a shortened path. A manual override can be a raw filesystem path ("Path Override") or a CLI command. There's also a top-level "Refresh agent detection" action. Source: `apps/emdash-desktop/src/core/features/settings/browser/agents-page/{installation-sources.ts:91-201,DependencyInstallationStatusCard.tsx:90-130,AgentsToolbar.tsx:33}`.

### Per-agent extra CLI flags and env vars
The installed-agent detail page lets a user append raw extra flags to the launch command, with a placeholder example "e.g. --enable-all-github-mcp-tools" and helper text "Extra flags appended to the command (e.g. --enable-all-github-mcp-tools)", plus a free-form environment-variable entry list ("envEntries"). Source: `apps/emdash-desktop/src/core/features/settings/browser/agents-page/InstalledAgentContent.tsx:151-171`.

### Keyboard shortcuts: unbind warning
Unbinding a shortcut in Settings → Keyboard shows a toast "${command.title} no longer has a key binding." Source: `apps/emdash-desktop/src/core/features/settings/browser/components/KeyboardSettingsCard.tsx:201`.

## Tasks / workbench UI

### Context-window usage indicator ("context limit reached" analogue)
The chat composer shows a small donut gauge of context-window usage. Below 90% used it renders in the normal progress colour; at or above 90% used (`fraction >= 0.9`) both the donut ring and the linear bar in its popover switch to a warning style (`donutProgressWarn` / `usageBarFillWarn`). The trigger's accessible name is "Context window: ${pct}% used"; the popover title is "Context usage", showing "${pct}%" beside "${used} / ${size} Tokens" (values abbreviated, e.g. "128k", "1.2M") and, when cost data is present, "Cost: ${formatted currency}". Source: `packages/ui/src/react/components/chat-composer/context-usage-indicator.tsx:37-108`.

### Add-context popover and prompt editor
`@`-mention and `/`-slash pickers in the task composer: empty state "No context found", search placeholder "Search...", action "Add context" / "Add to input". Removing a picked item shows "Remove /${name}" (slash command pill) or "Remove @${name}" (mention pill). Attaching a saved prompt: empty state "No saved Prompts", composer placeholder "Describe what the agent should do, or use / to select a saved Prompt…", "Add files to this Prompt", and a count of files that failed to resolve: "${n} unavailable file resources". Source: `apps/emdash-desktop/src/core/features/tasks/browser/context-bar/add-context-popover.tsx:84-241`; `packages/ui/src/react/patterns/create-task-modal/create-task-prompt.tsx:224-302`; `packages/ui/src/react/components/prompt-editor/{slash-command-pill.tsx:40,mention-pill.tsx:87}`.

### Create Task modal (shared package)
Additional catalogued surface beyond what's in emdash-03: "New worktree mode" and "Source branch" fields, "Create a new branch from PR", "Workspace Settings: ${label}", "Workspace presets", a "Resolving destination…" loading state, "Retry Task name generation" button, and an "Auto-approve" summary line reflecting the run's approval kind. Source: `packages/ui/src/react/patterns/create-task-modal/{workspace-settings-detail.tsx:245-251,workspace-settings-picker.tsx:24-124,create-task-modal.tsx:219-292}`.

### PR sidebar filters and task list
PR list view (right sidebar / project PR tab): search placeholders "Search ${label}…" / "Search by title, branch, or number...", a "Label" filter with "Search labels…", removable filter chips ("Remove ${label} filter"), an "Assignee" column, sync states "Sync failed" / "Sync complete", and "Open PR on GitHub". Task list (project task view): search "Search tasks…", "Task status" column, "Unread first" sort option, "Select task" row checkbox, "Clear selection". Source: `apps/emdash-desktop/src/core/features/projects/browser/components/pr-view/*`, `.../task-view/*`.

## Source control / diff review

### PR review comments (inline thread on diff)
The diff viewer supports adding, editing, and deleting inline PR review comments directly on a line: a comment input with "Submit comment" / "Cancel comment", an existing comment's controls "Cancel edit comment" / "Save comment" (with hint "Save (Cmd/Ctrl+Enter)") / "Delete comment", and a placeholder "Update the note..." while editing. The PR comments list shows "Unable to load comments" on failure. Source: `apps/emdash-desktop/src/core/features/source-control/browser/diff-view/comments/{comment-input.tsx:55-67,comment-widget.tsx:70-132}`; `.../changes-panel/components/pr-entry/comments-list.tsx:102-118`.

### Merge-readiness state on a PR
Beyond simple pass/fail, the changes panel surfaces a distinct "unstable" merge state: "Checks passing, but PR is unstable" (i.e. required checks pass but the PR is not cleanly mergeable). Also: "Skip push and open a PR from the current remote state" (create-PR flow option that bypasses pushing local commits first), "Open ${check.name} check details" per-check link, "No commits available" empty state. Source: `apps/emdash-desktop/src/core/features/source-control/browser/diff-view/changes-panel/components/pr-entry/{merge-ui-state.ts:125,create-pr-modal.tsx:334,commits-list.tsx:26,checks-list.tsx:71}`.

### Staged/unstaged sections and no-git state
Staging area empty hint: "Stage files above to include them in a commit." "Stage all changes" bulk action. Discard-all confirm: "Are you sure you want to discard all changes? This can not be undone." A folder with no `.git`: "This folder is not a Git repository" / "Initialize Git to enable changes, commits, branches, and worktree-based tasks." Per-line change stats read "${additions} lines added, ${deletions} lines removed". Empty diff state: "Select or make changes to files to see diffs." Source: `apps/emdash-desktop/src/core/features/source-control/browser/diff-view/changes-panel/{staged-section.tsx:122,unstaged-section.tsx:127-206}`; `.../contributions/browser/changes-panel.tsx:133-134`; `.../changes-panel/components/changes-list-item.tsx:74`; `.../main-panel/stacked-diff-view.tsx:131`.

## Workspace / worktree lifecycle

### Stale-worktree cleanup page
A dedicated page (reached from the Settings worktree-cleanup entry) lists every workspace/worktree for a project with per-row and bulk actions: "Delete ${group.project.name} workspaces?" (bulk), "Clean artifacts for ${item.name}?" (frees build output without deleting the worktree), "Delete ${item.name}?" (single). Toasts: "No deletable workspaces" / "Removal already pending", "Deleted ${n} workspaces", "${n - failed} deleted, ${failed} failed", "Queued artifact cleanup for ${item.name}". Source: `apps/emdash-desktop/src/core/features/workspaces/contributions/browser/workspace-detail-page.tsx:237-361`.

### Removal-needs-attention recovery
When a worktree/workspace deletion is stopped by a terminal failure (a durable "removal stop", per ADR 0006), a card appears offering "Retry" (re-runs the removal in the background; toast "Removal retrying" / "The removal runs again in the background.") or "Untrack anyway" (drops Emdash's record without touching files on disk; toast "Workspace untracked" / "Emdash dropped the pending removal without deleting files on the host."). Renders nothing once every pending removal converges on its own. Source: `apps/emdash-desktop/src/core/features/workspaces/contributions/browser/removal-attention-panel.tsx:23-58`.

## Terminals

### Drag-and-drop / paste file attachments
Terminal sessions accept dropped or pasted files as attachments to the agent, with explicit limits: "Attach between 1 and ${MAX_ATTACHMENT_FILES} files at a time." and "Attachment exceeds the 50 MB upload limit." A failed image conversion reads "The image could not be converted." A failed drop reads "Could not read the dropped files." Source: `apps/emdash-desktop/src/core/features/terminals/api/browser/pty/terminal-attachment-target.ts:57-105`; `.../contributions/browser/pty/pty-pane.tsx:372`.

### Shell picker for new terminals
The terminal drawer's "+" control offers "New terminal with shell" as a submenu of available shells, not just a single default. Source: `apps/emdash-desktop/src/core/features/terminals/browser/task-terminal/terminal-drawer-tab-bar.tsx:247`.

## Skills

### Skill creation and catalog refresh
Settings → Skills has a "Refresh catalog" action, a create-skill modal with a "What does this skill do?" description field and body placeholder "Write the skill instructions here. The YAML frontmatter (name and description) will be added automatically." (frontmatter is generated, not hand-written), and a detail modal loading state "Loading skill details". Failure toast: "Failed to create skill". Source: `apps/emdash-desktop/src/core/features/skills/browser/components/{SkillsToolbar.tsx:38,CreateSkillModal.tsx:56-107,SkillDetailModal.tsx:177}`.

## Shared UI patterns (packages/ui) — interaction behaviours

- **Directory selector / picker** (used by project creation, worktree root, etc.): sortable by "Date Added", inline "New folder name" creation, empty states "Empty folder" / "No matches", a visible "Current directory path" field. Source: `packages/ui/src/react/components/directory-selector/directory-selector.tsx:132-294`.
- **File tree**: inline rename ("New name"), "Empty folder" state. Source: `packages/ui/src/react/components/file-tree/file-tree.tsx:305-378`.
- **Image viewer**: "Fit to view" zoom action, expand affordance "Expand image", failure state "Image content unavailable." Source: `packages/ui/src/react/components/image-viewer/*`.
- **Mermaid diagrams** (in markdown/chat output): render failure shows "Couldn't render diagram." with an "Expand Mermaid diagram" / "Expand Mermaid diagram preview" affordance to view it larger. Source: `packages/ui/src/react/components/markdown/mermaid-block.tsx:65-80`; `packages/ui/src/react/components/mermaid-viewer/index.tsx:24`.
- **Markdown image loading state**: "Loading image..." placeholder while an inline image resolves. Source: `packages/ui/src/react/components/markdown/markdown.tsx:101`.
- **Queued prompts band** (composer): a queued/edited prompt shows "Save queued prompt" and "Cancel edit" controls, letting a user edit a message queued behind a running agent before it's sent. Source: `packages/ui/src/react/components/chat-composer/queued-prompts-band.tsx:175-188`.
- **Search input**: a clear button with accessible label "Clear search". Source: `packages/ui/src/react/primitives/search-input/index.tsx:87`.
- **Split button**: overflow trigger labelled "More options". Source: `packages/ui/src/react/primitives/split-button/index.tsx:137`.
- **Virtualized list view**: "Loading more…" footer while paging; list/collection empty state "No items". Source: `packages/ui/src/react/patterns/list-view/virtual-list.tsx:218`; `packages/ui/src/react/patterns/collection-view/collection-view.tsx:123`.
- **Directory field primitive**: generic "Select a directory" button, reused across the add-project flow and elsewhere. Source: `packages/ui/src/react/primitives/directory-field/index.tsx:22`.

## chat-ui additions

- "Scroll to top" transcript command. Source: `packages/chat-ui/src/commands.ts:22`.
- "Copy message" row action on an assistant message. Source: `packages/chat-ui/src/components/rows/message/message.def.tsx:137`.
- Two bundled syntax-highlight themes purpose-built for the app's light/dark modes, named `em-light` / `em-dark` (not a stock Shiki theme name). Source: `packages/chat-ui/src/core/highlight/bundled-themes.ts:11,126`.
- Inline math rendering in markdown output (KaTeX-style), test-labelled "∑ math". Source: `packages/chat-ui/src/core/markdown/parse.ts:186`.
- Mermaid diagram failure inside the chat transcript itself (separate from the packages/ui viewer above): "Couldn't render diagram". Source: `packages/chat-ui/src/components/rows/markdown/mermaid/Mermaid.tsx:96`.

## Corrections to other sections

- **emdash-03-tasks-workbench.md** (if it states the terminal drawer only supports a single default shell): the "+" control's "New terminal with shell" submenu (`terminal-drawer-tab-bar.tsx:247`) shows terminals can be opened against a chosen shell, not just the default.
- **emdash-05-git-github-issues.md / emdash-06** (if either implies PR review is read-only in-app): PR diffs support writing, editing, and deleting inline review comments directly in the diff viewer (`comment-input.tsx`, `comment-widget.tsx`), not just viewing existing GitHub comments.
- **emdash-07-settings-config.md**: worth confirming it already covers the in-app browser's per-profile storage isolation and the three-way (cookies/site data/cache) granular clearing in `BrowserSettingsCard.tsx` — if it only mentions a single "clear browsing data" action, the category-level split above is the more accurate behaviour.

## Coverage note

1,726 candidate strings extracted from this slice; 836 (~48%) matched existing catalog text verbatim or near-verbatim. The remaining 890 were reviewed; the large majority were internal-only (framework assertions in `primitives/mementos`, `view-scopes`, `palette`, `keybindings`, `navigation`, `modals`, and node-side "X was not found" wire errors never rendered as such to a user) and are not written up as features. The genuinely user-facing gaps are grouped above into ~30 features/areas; MCP catalog and open-in-apps directory account for the largest raw string counts (curated lists of third-party names) but are each a single feature entry.
