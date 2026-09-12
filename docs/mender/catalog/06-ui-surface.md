## Overview and how to read this

Emdash is a single-window Electron desktop app. The renderer shell
(`apps/emdash-desktop/src/renderer/App.tsx`) mounts exactly one of three
top-level modes — `onboarding`, `welcome`, `workspace` — and once in
`workspace` mode, all further navigation happens inside a five-item **view
catalog** (`apps/emdash-desktop/src/core/manifests/browser/view-catalog.ts`):
`home`, `project`, `task`, `automations`, `settings`. Every "screen" below is
one of those five views, a wrapper mode around them, or a modal/popover/panel
that floats on top of them. Everything is grounded in code that was read
directly; anything not directly confirmed is marked INFERRED.

Note on scope: the actual screen implementations live under
`apps/emdash-desktop/src/core/features/**` (aliased `@core`), not under
`src/renderer/` as the brief's directory list implies — `src/renderer` is a
thin shell (routing between onboarding/welcome/workspace, keybinding
mounting, boot lifecycle) that pulls in `@core` features for everything a
user actually sees. This catalog follows that trail into `@core` because the
brief's own goal ("every place a user can be") is not answerable from
`src/renderer` alone.

## SCREEN MAP

### Boot splash
A static HTML splash baked into `index.html` (not a React component) shows
immediately on process start, before any bundle executes, painted in the
theme-matching background color chosen by the main process
(`apps/emdash-desktop/src/main/host/window.ts`). Controlled by
`apps/emdash-desktop/src/renderer/lib/boot/boot-splash.ts`. If boot hangs, a
watchdog in the main process reveals an "escape hatch" with two buttons:
**Restart** and **Open Recovery** (`requestBootEscape('restart' |
'open-recovery')`). Dismissed (faded out and removed from DOM) once the app
queries settle (`reportAppQueriesSettled`).

### Recovery window
A **separate native BrowserWindow**, entirely outside the normal view
catalog, shown by `apps/emdash-desktop/src/main/host/recovery/recovery-window.ts`
when the main boot sequence fails fatally. Renders a standalone HTML page
(`recovery.html`) injected with a JSON state blob (error message, app
version, updater status/progress). Lets the user see the crash reason, the
log file, and drive the auto-updater (check/download/quit-and-install) even
though the main app never came up. Reached only via boot failure, never by
user navigation.

### Onboarding
First-run flow, shown when `localStorage['emdash:has-seen-onboarding:v1']`
is unset (`apps/emdash-desktop/src/renderer/App.tsx`). Full-screen, frameless
overlay (`Onboarding` / `OnboardingShell`,
`@core/features/workbench/browser/onboarding/`). Steps are computed once
from what's actually needed and then frozen for the session:
- **Sign in** step — shown if the user has no account session
  (`useAccountSession`).
- **Import** step — shown only if a legacy Emdash data source is detected on
  disk and hasn't been ported yet (`useLegacyPortStatus`); drives an import
  progress UI (`import-progress.tsx`), an import-source selector, and a
  project-conflicts resolution screen (`project-conflicts.tsx`).
Completing onboarding sets the localStorage flag and transitions to
`welcome`.

### Welcome screen
A full-screen, opaque, animated splash (`app/welcome.tsx`) shown once, after
onboarding, before the first real workspace paint. Shows the Emdash logo
(shimmer animation) over a background banner image, and one **"Start
shipping"** button (with its bound keyboard shortcut shown inline, default
`Mod+Enter`). Clicking it (or the shortcut) reloads the page into
`workspace` mode. Purely decorative/first-impression; carries no data.

### Home view (`home`)
The default landing view of the workspace once no project/task is being
viewed (`@core/features/workbench/browser/home-view.tsx`). Centered panel
with the Emdash logo and four arrow-key-navigable actions, each opening the
**Add Project modal** with different initial args:
- **Open project** — pick an existing local directory.
- **Create repository** — create a new project + GitHub repo.
- **Clone from GitHub** — clone a GitHub repo locally.
- **Add remote project** — create a project on a remote SSH host.
Reached via the sidebar logo/back navigation, or automatically when a
project/task view fails to resolve (redirect target for missing projects).

### Project view (`project`)
Shown for a specific `projectId`
(`@core/features/projects/browser/components/main-panel/`). Structure:
- **Project header** (`project-header.tsx`) — project icon + name, a link to
  the remote repository (GitHub icon + external-link if it's a GitHub URL,
  globe icon otherwise), an **"Open in…"** menu (open in external
  editor/terminal/file manager), and a **"⋯" actions menu**: Rename Project,
  Remove Project.
- **Section pill-tabs** (`ActiveProject` in `active-project.tsx`), four tabs:
  - **Tasks** — `TaskList`, the list of tasks/conversations under this
    project.
  - **Pull Requests** — `PullRequestView`, a synced list of the repo's open
    PRs with filters and a sync-status card.
  - **Workspaces** — `ProjectWorkspacesView`, the git worktrees/workspaces
    backing this project's tasks.
  - **Settings** — `SettingsPanel`, project-scoped settings distinct from
    the app-level Settings view: base project settings and a "shareable"
    settings section that can be written into the repo (via
    `shareProjectConfigModal` / `projectConfigImportModal`) so teammates get
    the same config.
Also handles non-ready states with dedicated panels: creating (unregistered
project spinner + stage label), hydrating, and a context-error panel with
Retry/Remove actions.

### Task view (`task`)
The core, most complex screen — one running "task" (an agent session bound
to a git worktree/workspace) inside a project. Reached from a project's task
list, the sidebar, or the command palette. Two vertically composed regions
under a shared **Task titlebar**:

**Task titlebar** (`task-titlebar.tsx`):
- Breadcrumb: project name (click → back to Project view) `/` task name
  popover. The popover shows the task name, current git branch, and
  Fetch / Pull (with behind-count badge) / Push (with ahead-count badge) or
  Publish (if branch unpublished) buttons, plus an issue-linking combobox.
- A connection-status dot next to the task name (workspace connectivity).
- A pin toggle (pin/unpin this task in the sidebar).
- An automation-run pill, shown only for tasks spawned by an automation.
- Right side: an **activity badge** (workspace lifecycle popover, see
  Ambient section), **preview-server pills** (running dev-server URLs),
  an **"Open in…" menu**, a **terminal-drawer toggle**, and a three-way
  **sidebar tab toggle**: Changes (with live +added/-deleted line counts),
  Files, Conversations.

**Task main column** (`view/task-main-column.tsx`) — a VS-Code-style
workbench:
  - A **split-pane tab area**: any number of horizontally resizable panes,
    each with its own tab strip. Tabs can be dragged to reorder within a
    pane, dragged onto a pane's edges to split, and dragged between panes.
    Tab kinds (`@core/manifests/browser/task-tab-contributions.ts`):
    - **Conversation** — a chat thread with the coding agent (native
      Emdash conversation protocol).
    - **ACP chat** — a chat thread using the external Agent Client
      Protocol (for agents that speak ACP rather than Emdash's own).
    - **File** — a Monaco-based code editor tab for one file.
    - **Diff** — a source-control diff view tab.
    - **Terminal** — a PTY-backed terminal tab.
    - **Browser** — an embedded `<webview>` browser pane (its own
      back/forward/reload/URL-bar commands: `task.browserGoBack`,
      `task.browserGoForward`, `task.browserReload`,
      `task.browserFocusUrl`, `task.browserOpenExternal`,
      `task.browserCopyUrl`).
    Each pane's trailing slot has a **"new conversation" button**, and an
    empty pane shows a placeholder empty state.
  - A collapsible **bottom terminal drawer** (`TerminalsPanel`) holding one
    or more terminal sessions with a tab bar and a shell-selection menu;
    terminal tabs can be dragged out of the drawer into a pane (and back),
    and the drawer itself can be resized or dragged closed.

**Task sidebar** (`view/task-sidebar.tsx`) — a collapsible, resizable right
panel with three mutually-exclusive bodies, selected by the titlebar's
toggle group:
  - **Conversations** (`SidebarConversationsList`) — list of this task's
    chat threads/tabs.
  - **Changes** (`ChangesPanel`) — the git diff/changes list for the task's
    workspace, including a "create pull request" entry point
    (`createPrModal`).
  - **Files** (`EditorFileTree`) — a file tree for the task's worktree,
    with its own command set (rename/cut/copy/paste/delete, all bound to
    `Mod`-chord shortcuts) and drag-and-drop of files into chat as context.

**Chat composer** (bottom of a conversation/ACP-chat tab; packages/ui
`chat-composer`) — beyond the plain text input:
  - **@ mentions** — inline pills for files, issues, symbols, dropped in via
    `@`.
  - **/ slash commands** — inline command pills triggered by `/`.
  - **Add-context popover** (`Mod+Shift+A`) — attach a linked issue, a
    file's draft PR line-comments, or a saved prompt as context.
  - **Permission band** — appears above the input when the agent (via ACP)
    asks for a tool permission; renders a split-button of allow/reject-style
    options, with a "1 of N" counter if more requests are queued.
  - **Queued-prompts band** — shows messages queued while the agent is busy;
    each is drag-reorderable, editable inline, individually deletable, or
    can be force-sent immediately.
  - **Context-usage indicator** — a popover showing tokens used / context
    window size, and an optional cost figure.

**Non-ready states**: the task view also renders dedicated full-panel states
for `creating`, `create-error`, `project-hydrating`, `provisioning`
(workspace-creation stage labels: inspecting repo, resolving/fetching base
branch, creating worktree, verifying), `provision-error` (with Retry),
`missing`/`unprovisioned` workspace (Re-provision / Remove-and-re-provision),
and `teardown`/`teardown-error`.

### Automations view (`automations`)
Reached from the sidebar's **Automations** button (bottom of the project
list). A `CollectionView`/`CollectionToolbar` list of scheduled automations
(`AutomationsView` in `@core/features/automations/browser/components/`):
- Each row (`AutomationRow`) shows name, enabled toggle, and can be clicked
  to open a **detail Sheet** (`AutomationDetailView`) with settings fields
  (cron schedule via a `CronPicker`), a **run history** list
  (`RunHistory`/`AutomationRunRow`, each with a status badge and a "next run"
  banner), and a delete action (confirmed via `confirmActionModal`).
- **Create automation** — opens the same Sheet in create mode, either blank
  or seeded from a **template rail** (`AutomationTemplateRail` /
  `AutomationTemplateCard`) of built-in automation templates shown in the
  empty state when no automations exist yet.
- A breadcrumb (`AutomationsBreadcrumb`) sits in the titlebar.

### Settings view (`settings`)
Reached from the sidebar's **Settings** button (`Mod+,`), or from clicking
"Update" in the sidebar footer (jumps to the General tab). Full-page
`PageLayout` with a persistent left nav and a scrollable content pane
(`SettingsPage` in `@core/features/settings/browser/components/`):
- **Search box** (`Mod+F` or `/`) filters the nav to matching pages and
  badges each with a match count.
- **Sidebar nav**, two sections:
  - *Local*: General, Integrations, Interface, Browser, Repository,
    Prompts, System, Workspaces (local), Conversations, CLIs & Models
    (agent installs/sign-in), MCP, Skills.
  - *Remote*: Connections (SSH hosts).
  - A pinned "View Docs" footer link (opens `docs.emdash.sh` externally).
- **Breadcrumb-driven detail drill-down**: some pages (e.g. a specific SSH
  connection, a specific agent) push a nested "detail" segment onto the URL
  params and show a `Breadcrumbs` trail back up.
- Notable pages: **CLIs & Models** (`AgentsSettingsPage`) — a toolbar +
  list of installed/available CLI coding agents, each with an install-status
  card, sign-in modal, MCP-section, and a detail sheet
  (`AgentDetailSheet`); **Skills** — create/detail modals for reusable agent
  skills; **Prompts** (Library) — a saved-prompt modal; **Integrations** —
  a setup modal per third-party integration (e.g. GitHub device-flow
  connect); **Interface** — theme card, sidebar-metadata card; **Terminal**
  settings card, **Notifications** card, **Telemetry** card, **Update**
  card, **Keyboard** shortcuts card, **Hidden tools** card.

## NAVIGATION MODEL

- **A single, typed "view" router**, not a browser-style URL bar or a
  freeform stack of screens. `@core/primitives/navigation` defines a
  `navigate(viewDef(params))` API; each of the five views in the catalog
  owns its own params schema (zod), and `useCurrentViewParams` /
  `useViewParams` read/write them reactively.
- **Back/forward, browser-style** — `NavButtons` (`app/nav-buttons.tsx`) in
  the top-left of the sidebar, backed by a real navigation-history stack
  (`getNavigationHistory()`), bound to `app.navigateBack` /
  `app.navigateForward` (`Mod+[` / `Mod+]`). Each nav is reported for
  telemetry (`*_viewed` events per view def).
- **Sidebar tree for projects/tasks** — the persistent left sidebar
  (`LeftSidebar`) is the primary way to move between projects and their
  tasks: a virtualized, expandable list of projects, each expandable to
  show its tasks; a **pinned-tasks strip** above it for tasks pinned across
  projects; drag-and-drop reordering; a project-level "+" to open the
  create-task modal; per-task context menu (rename, archive, delete).
- **Tabs for multi-session work inside a task** — within a single Task
  view, multiple chat/file/diff/terminal/browser sessions are tabs in a
  split-pane workbench (see Task view above), independent of the
  project/task-level sidebar navigation. So navigation is two-level: the
  sidebar/back-forward moves between *tasks* (each a whole workspace); tabs
  and panes move between *views onto one task's workspace*.
- **Command palette as a navigation shortcut** — `Mod+K` opens a fuzzy
  searcher over projects, tasks, workbench commands, conversations, and
  files; selecting a project/task result navigates directly to it.
- **Deep linking within the app, not from the OS**: task tabs carry a
  `tabId`-scoped `location` (per-view "location" params distinct from the
  main params), so a URL-shaped in-app reference can restore not just which
  task but which tab was open. No OS-level custom URL scheme
  (`emdash://…`) was found registered anywhere in the main process — deep
  links from outside the app are not supported (checked
  `setAsDefaultProtocolClient`/`open-url`; absent). **INFERRED absent.**
- **Redirects**: opening a `task`/`project` view for an id that no longer
  exists redirects to the parent (`project`) or to `home`, rather than
  erroring.

## GLOBAL AFFORDANCES

### Command palette
`Mod+K` (also reachable via the sidebar's "Search…" row, and the native
View menu's "Command Palette…"). A `cmdk`-based modal
(`command-palette-modal.tsx`) with keyword-scoped modes (typing a
provider's keyword narrows to just that provider, shown as a removable chip
in the input) over five source types: workbench commands, tasks,
conversations, files (in the current task's workspace), and projects.
Footer hints: ↑↓ Navigate, Enter Select, Esc Close.

### Keyboard shortcuts
User-remappable (Settings → Keyboard), with defaults defined per-command
across the app (`@core/features/*/contributions/commands.ts`). Notable
defaults: `Mod+,` Settings, `Mod+Shift+N` New Project, `Mod+N` New Task,
`Mod+K` Command Palette, `Mod+O` Open in Editor, `Mod+Enter` Confirm,
`Esc` Close Modal, `Mod+Alt+←/→` Prev/Next Tab, `Mod+W` Close Tab,
`Mod+Shift+T` Reopen Closed Tab, `Mod+Shift+R` Rename Tab,
`Mod+\` Split Pane, `Ctrl+Tab`/`Ctrl+Shift+Tab` Cycle Tabs (even while a
terminal has focus), `Mod+S`/`Mod+Shift+S` Save/Save All,
`Mod+B` Toggle Left Sidebar, `Ctrl+Z` Zen Mode, `Mod+1`…`Mod+9` jump to tab
N; task-scoped: `Mod+T` New Conversation, `Mod+D` New Conversation (split
right), `Mod+Shift+1/2/3` sidebar Changes/Files/Conversations,
`Mod+Shift+F` search file contents, `Mod+J` toggle terminal drawer,
`Mod+.` toggle right sidebar, `` Mod+Shift+` `` new terminal,
`Mod+Shift+B` open browser tab, `Mod+Shift+C` copy browser URL,
`Mod+Alt+↑/↓` prev/next task, `Mod+Backspace` delete selected tasks,
`Mod+Shift+E` archive task, `Mod+Shift+A` add context to composer.

### Native application menu (macOS/Windows/Linux menu bar)
Built in the main process (`apps/emdash-desktop/src/main/host/menu.ts`),
accelerators kept in sync with the user's remapped shortcuts:
- **App menu** (macOS only): About, Settings…, Check for Updates…,
  Services, Hide/Hide Others/Unhide, Quit.
- **File**: (non-mac) Settings…; Close Tab (mac) or Quit (non-mac).
- **Edit**: Undo/Redo (routed to the app, not native), Cut/Copy/Paste/
  Paste-and-Match-Style/Delete/Select All.
- **View**: Reload, Force Reload, Toggle DevTools, Command Palette…,
  Reset/In/Out Zoom, Toggle Fullscreen.
- **Window**: native OS window menu.
- **Help**: (non-mac) Check for Updates…; Docs, Changelog, Troubleshooting
  submenu (Report Issue…, Copy Installation ID — copies version/instance
  id/platform/Electron version to clipboard), Give Feedback.

### System tray
`apps/emdash-desktop/src/main/host/tray.ts` — a persistent tray/menu-bar
icon (template image on macOS for light/dark auto-tinting). Context menu:
**Open Emdash**, **Quit Emdash**. Clicking the icon itself (non-macOS) also
shows the main window. Closing the main window hides it to the tray rather
than quitting (`window.ts`'s `close` handler), so the app keeps running in
the background unless the user explicitly quits or the app is mid-shutdown.

### Window management
- macOS: native `hiddenInset` title bar with traffic lights repositioned
  to (10,10); `acceptFirstMouse` so a background-window click both focuses
  and acts.
- Linux: fully frameless (`frame: false`); the renderer draws its own
  title bar strip with custom **Minimize / Maximize-Restore / Close**
  buttons (`WindowControls`), kept in sync with real OS maximize state via
  an IPC event (`window-maximize-changed`); rendered as a floating overlay
  even over full-screen views like onboarding/welcome that don't mount the
  normal titlebar (`FramelessTitlebarOverlay`).
- Windows: native frame (default Electron chrome).
- Single-instance lock: a second launch focuses/shows the existing window
  instead of opening a second process (`second-instance` handler).
- `app.activate` (macOS dock click) and tray click both call
  `showMainWindow()`, which restores from minimized and force-focuses.

### Drag and drop
- **OS folder → sidebar**: dragging a folder from the Finder/Explorer onto
  the left sidebar shows a full-panel "Drop to add project" overlay; on
  drop, each valid directory is inspected and added as a new project (with
  a toast on error, e.g. "not a folder"), and the first one added is
  navigated to.
- **Workspace file → chat composer / editor tree**: files dragged from the
  task's file tree carry a custom MIME type
  (`application/x-emdash-workspace-file`) plus a same-window in-memory
  fallback store (worked around because Electron/Chromium can mangle
  custom-MIME payloads on drop), used to attach file context to a
  conversation or to move/copy within the file tree.
- **Tab drag-and-drop**: tabs can be dragged to reorder within a pane, or
  dropped on a pane's split zones to create a new split (via `@dnd-kit`),
  with a floating drag preview (`TabDragPreview`).
- **Terminal drag-and-drop**: a terminal tab can be dragged out of the
  bottom drawer into a pane (or between panes/drawer), with its own drag
  preview.

### System notifications
`apps/emdash-desktop/src/main/host/notifications/system-notification-sink.ts`
— native OS notification banners (silent, i.e. no notification sound),
one active per "group key" (a new one in the same group replaces the old).
Clicking a notification focuses/shows the main window and dispatches an
`open`-with-target event back into the app so it can navigate to whatever
the notification was about (e.g. a finished task). Delivery is behind a
generic `NotificationSink` port, so notifications are logically modeled in
`@core/services/notifications` independent of this OS-specific sink.

### Deep links
No custom URL scheme registration (`setAsDefaultProtocolClient` / `open-url`)
was found in the main process. **INFERRED: not supported** — external
deep-linking into a specific project/task is not currently a capability to
preserve, only in-app "location"-scoped navigation (see Navigation Model).

### Toasts
A single `Toaster` mounted at the `Workspace` root
(`packages/ui` primitives `toast`) surfaces transient success/error
messages app-wide (e.g. "Cannot add project", "Projects added",
"Could not delete automation", "Could not re-provision workspace").

### The full modal catalog
Every modal in the app (`apps/emdash-desktop/src/core/manifests/browser/modal-catalog.ts`
aggregates 30 modal defs across features), each opened via
`useOpenModal('<id>')` from wherever it's relevant:
- **commandPaletteModal** — see Command palette above.
- **confirmActionModal** — generic Yes/No confirmation (used by delete
  flows across features).
- **confirmExternalLinkModal** — "you're about to leave the app" gate
  before opening an untrusted external URL.
- **quitUnsavedChangesModal** / **unsavedChangesModal** — block quitting or
  switching away while unsaved editor changes exist.
- **feedbackModal** — in-app feedback form (schema-validated), reachable
  from the sidebar footer and the Help menu.
- **taskModal** (Create Task) — project picker, task name, initial prompt,
  link to an issue/PR/branch, new-worktree vs existing-workspace vs
  checkout-PR panel, workspace preset picker.
- **renameTaskModal**, **deleteTaskModal** (with worktree/branch/
  conversation deletion options), **addRemoteModal**.
- **addProjectModal** — the four home-screen strategies (open/create/clone/
  ssh), plus a directory picker.
- **renameProjectModal**, **relinkProjectModal** (re-point a project at a
  different path/remote), **shareProjectConfigModal** /
  **projectConfigImportModal** (write/import project settings as repo
  config), **directorySelectorModal**.
- **createConversationModal** — start a new chat thread/tab.
- **createSkillModal**, **skillDetailModal** — agent Skills management.
- **createPrModal** — open a pull request from the current branch.
- **conflictDialog** — merge-conflict resolution prompt in the file editor.
- **addMachineModal**, **linkConversationModal** — SSH/remote host
  management.
- **integrationSetupModal** — per-integration connect flow.
- **githubConnectModal**, **githubDeviceFlowModal**, **agentSignInModal** —
  OAuth/device-flow sign-in surfaces for GitHub and CLI agents.
- **promptModal** — create/edit a saved prompt (Library).
- **devProcessPanelModal** — internal dev-only process inspector.

## AMBIENT INDICATORS

### Agent status dots
`AgentStatus` (packages/ui `components/agent-status`) — a 3×3 braille-style
animated dot cluster with 5 states: `working`, `awaiting-input`, `error`,
`completed`, `idle` (idle renders nothing). Shown per task in the sidebar
task row (`task-sidebar-agent-status.tsx`) so the whole project tree
communicates, at a glance, which background agent sessions are running,
stuck waiting on the user, errored, or just finished — without opening the
task.

### Activity badge (workspace lifecycle)
In the task titlebar (`components/activity-badge.tsx`) — one badge that
replaces older separate pills, showing a spinner while any lifecycle step
(prepare/setup/run/teardown, plus adopt-worktree/fetch-branch etc.) is
running, error emphasis if one failed, and a quiet badge once everything
has settled. Clicking it opens a popover listing every recorded step with
status icon and a relative timestamp — the log of what the workspace's
setup scripts did.

### Diff stats and PR badges
Sidebar task rows show live `+added/-deleted` line counts
(`TaskGitDiffStats`) and a PR badge (`PrBadge`) when the task's branch has
an associated pull request; the same +/- counts appear as an animated
reveal on the task titlebar's Changes toggle.

### Preview-server pills
`PreviewServerPills` in the task titlebar — one pill per detected running
dev server for the task's workspace, presumably linking to open it (in the
in-app browser tab or externally). 

### Connection status dot
`ConnectionStatusDot` — small colored dot next to a project/task/workspace
name showing SSH/remote connectivity state (`connecting`,
`connected`/`ready`, `disconnected`), used in the sidebar project row and
the task titlebar.

### Update indicator
Sidebar footer (`update-section.tsx`) — shows the current version number
quietly (e.g. "v1.2.3") when up to date; swaps to an **Update** button when
an update is available, which navigates to Settings → General and starts
the download.

### Context-usage indicator
In the chat composer — a small meter/popover showing tokens used out of the
model's context window, and an optional running cost figure, formatted with
locale-aware currency and k/M suffixes.

### Toasts
See Global Affordances — the only mechanism for one-shot "something just
happened while you were looking elsewhere" messages that aren't tied to a
specific badge.

### Boot/crash telemetry (not user-facing)
`app_window_focused`/`app_window_unfocused` and daily-active-user telemetry
fire on window focus/blur; not shown in UI but noted since it's the only
other "the app is watching what's happening" mechanism in this area.
