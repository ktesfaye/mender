# Tasks, workspaces and the workbench

Covers the create-task modal, task list/sidebar, task lifecycle and states, workspace
(worktree) lifecycle as seen by users, and the workbench task view: tabs, panes, splits,
titlebar, right sidebar, terminal drawer, and keyboard navigation. Source root is
`apps/emdash-desktop/src/core/features/{tasks,workspaces,workbench}/` plus the tab
contributions each aggregates (`conversations`, `editor`, `source-control`, `terminals`,
`browser`).

## Create Task modal

### Opening the modal
- Reached via the command palette / `app.newTask` command (`Mod+N`), the sidebar "Add
  Project"-adjacent task affordances, or programmatically (e.g. "Open in Task" from the
  workspaces list, which pre-fills `initialWorkspaceId`).
- Dialog title: **"Create Task"**. Footer confirm button label: **"Create"**.
- If no project is selected, Create is disabled with reason **"Select a Project."**
  surfaced as both the button `title` and a screen-reader label ("Create. Select a
  Project.").
- If the project's live host action is unavailable, Create is disabled with the
  project's live-action-disabled reason (from `projectAvailabilityUi`).
- Source: `tasks/browser/create-task-modal/create-task-modal.tsx`.

### Task name field
- Label: **"Task name"**. Plain text input, autofocused, large text (`text-lg`).
- Placeholder is the live auto-generated name (see Name generation) shown greyed while
  the user hasn't typed; if no generated name yet, placeholder falls back to
  **"Task name..."**.
- Live-transforms typed input: lowercases (unless "preserve capitalization" setting is
  on), turns whitespace into hyphens, strips anything not `[a-zA-Z0-9-]`, collapses
  repeated hyphens, truncates to 64 characters (`MAX_TASK_NAME_LENGTH`).
- If the user typed characters that got dropped (matched by `/[^a-z0-9\s-]/i` against the
  raw input), a hint appears: **"Task names only allow letters, numbers, and hyphens."**
- Source: `tasks/browser/create-task-modal/task-name-field.tsx`,
  `tasks/api/browser/create-task-modal/use-task-name.ts`,
  `tasks/api/browser/taskNames.ts`.

### Name generation (auto-naming)
- Controlled by the `tasks.autoGenerateName` setting (default **on**).
- If the initial prompt/issue title is present, the name is derived from it via the
  `nbranch` `generateBranchName` algorithm (hyphenated, ≤64 chars, no random suffix),
  then sanitized (lowercase, `[a-z0-9-]` only, collapsed/trimmed hyphens).
- If there is no title/description to derive from, a random two/three-word name is
  generated via the `human-id` package (hyphen-separated, not capitalized), e.g.
  `swift-tiger-run`-style names.
- Source: `tasks/node/name-generation/generateTaskName.ts`.

### Linked entity toggle ("Based on")
- A bordered panel headed **"Based on"** with a two-option `ToggleGroup`: **"Issue"** and
  **"Pull Request"**.
- "Issue" is disabled unless the project has any connected issue-tracker integration;
  "Pull Request" is disabled unless the repository has PR support (a resolvable PR
  repository URL). Selecting either shows the matching combobox; toggling the same value
  off clears the linked type.
- Default linked type: if the modal was opened with an explicit strategy
  (`from-issue`/`from-pull-request`) that wins; otherwise it prefers issue integration if
  present, else PR support if present, else none. Computed once on mount.
- Source: `tasks/browser/create-task-modal/linked-entity-section.tsx`.

#### Issue combobox
- Placeholder row (no selection): **"Select a `<IntegrationName>` issue"** (provider logo
  shown when a provider is known), else **"Select a issue"**-shaped text with the generic
  word "issue" (the sentence is built as "Select a" + optional provider name + "issue").
- Selected issue renders via `SelectedIssueValue` (title, identifier, provider logo).
- Source: `tasks/browser/create-task-modal/issue-combobox-field.tsx`,
  `tasks/browser/components/issue-selector/issue-selector.tsx`,
  `tasks/browser/components/issue-selector/useIssueSearch.ts`.

#### PR combobox
- Source: `tasks/browser/create-task-modal/pr-combobox-field.tsx` (component exists;
  mirrors the issue combobox pattern using `PullRequest` data).

### Tabs inside the modal: Initial Conversation / Workspace Settings
- Two tabs, `TaskConfigPanel`: **"Initial Conversation"** (`ConversationField`) and
  **"Workspace Settings"** (`WorkspaceSettingsSection`, expanded by default only when
  `initialWorkspaceId` was passed in).
- Source: `tasks/contributions/browser/task-config/task-config-panel.tsx` (aggregator),
  `create-task-modal.tsx`.

#### Initial Conversation tab
- Agent picker (`AgentSelector`) — lists agents available on the project's host
  (local or the project's SSH connection). If a required-prompt-delivery constraint
  applies and an agent can't receive one, its disabled reason is
  **"Doesn't support automation prompts"**.
- **"Auto-approve permissions"** switch — shown only if the selected agent supports
  auto-approve; state persisted in `localStorage` under
  `initial-conversation:auto-approve-enabled`, seeded from the `tasks.autoApproveByDefault`
  setting (default **off**). Disabled if no agent selected.
- **"Use chat UI"** switch — shown only if the selected agent supports ACP; persisted in
  `localStorage` under `initial-conversation:chat-ui-enabled` (default **off**).
- Prompt composer (`ChatComposer`) placeholder: **"Describe what the agent should do, or
  use / to select a prompt..."**. Supports `/` for the saved prompt library (section
  header **"Prompts"**) and model selection when the agent exposes selectable models.
  Supports drag-and-drop / paste of files into the prompt (local files disabled for SSH
  projects).
- If the agent/mode can't deliver an initial prompt at all, a `Field.Description` explains
  why: **"`<Agent>` doesn't support initial prompts in terminal mode. Enable Chat UI to
  send an initial prompt."** (when Chat UI would fix it) or **"`<Agent>` doesn't support
  initial prompts."** (falls back to "This agent" if no name).
- Linking an issue auto-injects an `@`-mention of the issue into the prompt when
  `includeIssueContextByDefault` is true (task setting, default **on**); removing the
  mention from the text clears the injected issue context.
- Switching project or provider resets prompt/model/issue-context state (except when
  `resetPromptOnProjectChange` is explicitly disabled by the caller).
- Source: `tasks/contributions/browser/task-config/initial-conversation-section.tsx`,
  `tasks/contributions/browser/task-config/conversation-field.tsx`.

#### Workspace Settings tab — workspace preset picker
- A `Select` with a two-line trigger: icon + preset label on the first line, a short
  description (or the disabled reason, if disabled) on the second. Placeholder when
  nothing is selected: **"Select workspace…"**.
- Presets (from `WORKSPACE_PRESETS`), each with a Lucide icon:
  - **"Create new worktree"** (`GitBranch` icon) — *"Create an isolated worktree on a
    branch"*. Requires the repo to have commits.
  - **"Use the repository directory"** (`FolderGit2`) — *"Work directly in the project
    directory (no worktree)"*. No settings panel (disabled collapsible).
  - **"Reuse an existing workspace"** (`Layers`) — *"Reuse an existing worktree or
    repository workspace"*. Disabled if the project has no reusable existing workspaces.
  - **"Checkout PR in worktree"** (`GitPullRequest`) — *"Fetch and review a pull request
    in its own worktree"*. Only shown/enabled when a PR is linked.
  - **"Create a new branch from a PR in worktree"** (`GitPullRequestArrow`) — *"Creates a
    new branch on top of the PR head for your changes"*. Only shown/enabled when a PR is
    linked.
- Disabled reasons surface directly in place of the description: **"Folder is not a Git
  repository"** or **"Repository has no commits yet"** when worktree creation needs
  commits and the repo is unborn/not a repo.
- Source: `tasks/browser/task-config/workspace-preset-picker.tsx`,
  `primitives/workspaces/api/workspace-presets.ts`.

#### "Settings" collapsible (per preset)
- Header row: **"Settings"** with a chevron that rotates open; disabled (greyed,
  not-allowed cursor) for presets with nothing to configure (`repo-root`).
- For **new-worktree**, a `Tabs` control sits beside the header: **"Checkout branch"** /
  **"Create new branch"**, toggling `createBranchAndWorktree`.
- **New-worktree panel**: a branch combobox (`ProjectBranchSelector`) labelled **"From
  branch"** (when creating a new branch) or **"Branch"** (when checking out), with a
  `GitBranch` icon and placeholder **"Select a branch"**. If the chosen branch is already
  checked out elsewhere, a warning box appears: *"**`<branch>`** is already checked out
  in task **`<taskName>`**"* (or *"an existing workspace"* if no task name) followed by
  *". A new isolated worktree cannot be created for a branch that is already in use."*,
  with a **"Reuse existing workspace"** button (switches the preset to `use-existing` and
  pre-selects the conflicting workspace).
  - When creating a new branch (and the repo isn't unborn), a `BranchNameField` appears.
- **Branch name field**: header **"Branch name"**; if `autoBranchName` setting is on,
  shows italic **"Branch name will be auto-generated"** instead of an input. Otherwise a
  plain input, placeholder **"branch-name"**. If the typed name already exists, hint:
  **"This branch already exists — the task will check it out instead of creating a new
  one."** Below it, a **"Push branch to remote"** switch (only rendered where the caller
  wires push state, e.g. new-worktree and pr-new-branch panels).
- **Use-existing panel**: `ExistingWorkspacePicker` — searchable combobox.
  - Loading state: **"Loading workspaces…"**.
  - Empty state: **"No existing workspaces found for this project."**
  - Trigger placeholder: **"Select a workspace…"**; search input placeholder: **"Search
    workspaces…"**; empty search result: **"No workspaces found"**.
  - Each row shows a folder/branch icon, a name (repo root → **"Repository root"**,
    otherwise the worktree's last path segment or branch name), added/removed line counts
    (`+N`/`−N`) when known, and a link icon + count of associated tasks when
    `linkedTaskCount > 0` with tooltip **"1 associated task"** / **"`<N>` associated
    tasks"**. Secondary line shows the disabled reason or the path.
- **Checkout-PR panel**: static note — *"The PR branch will be fetched and checked out in
  a dedicated worktree. No new branch will be created."* — plus the setup-step preview.
- **PR-new-branch panel**: branch name field, a **"Push branch to remote"** switch, and
  the setup-step preview.
- Source: `tasks/browser/task-config/{new-worktree-panel,use-existing-panel,
  checkout-pr-panel,pr-new-branch-panel,branch-name-field,existing-workspace-picker}.tsx`.

#### Setup steps preview
- A collapsed-by-default disclosure: **"Setup steps (`<N>`)"** with a terminal icon;
  expands into a numbered list of the exact lifecycle steps that will run
  (`fetch-branch`, `create-worktree`, `configure-branch`, `copy-artifacts`,
  `push-branch`), each with a bold title (from the shared `LIFECYCLE_STEP_TITLES` map —
  see Activity badge below) and a one-line description composed from the actual compiled
  git plan (e.g. *"Create a worktree on new branch `feature-x` based on `main`"*, *"Set
  `feature-x` to track `feature-x` on `origin`"*, *"Copy preserved project files into the
  worktree"*, *"Push `feature-x` to `origin` and set upstream tracking"*). This is the
  exact same vocabulary and derivation the running Activity badge later uses, guaranteed
  not to drift (same compiled plan object feeds both).
- Source: `tasks/browser/task-config/setup-step-preview.tsx`,
  `primitives/workspaces/api/{lifecycle-step-titles,describe-worktree-git-plan}.ts`.

#### Worktree destination preview
- Below the settings collapsible (new-worktree preset only): a small line with a
  `FolderGit2` icon, **"Worktree:"**, and the resolved absolute worktree path in
  monospace (also the `title` for overflow).
- If the project's configured `worktreeRoot` setting is invalid/unusable, an extra
  warning line: *"The configured worktree root '`<staleValue>`' is not usable — falling
  back to `<fallbackValue>`."*
- If path compilation throws for another reason, shows that error message in warning
  text instead of the path line.
- Source: `tasks/browser/task-config/worktree-destination-preview.tsx`.

### Modal context bar (bottom of the initial-conversation composer)
- A row of quick-insert prompt actions (`PromptActionsMenu`) plus, when an issue is
  linked and a "linked-issue" context action exists, a pill button showing the provider
  logo and **"`<issue identifier>` `<issue title>`"** with an up-arrow icon; while adding
  it, the pill reads **"Adding issue context..."** with a spinning loader, and its
  tooltip is **"Adding issue context to the initial message"** / **"Add issue context to
  the initial message"**. The prompt-actions trigger's disabled tooltip is **"Prompt
  unavailable"**; its action tooltip is **"Add a prompt to the initial message"**.
- Source: `tasks/browser/create-task-modal/modal-context-bar.tsx`.

## Task list / sidebar

### Left sidebar structure
- Projects are grouped rows in the left sidebar (`sidebar-store.ts`): a **"Projects"**
  header row with a sort control and an **"Add Project"** button
  (`app.newProject`, `Mod+Shift+N`).
- Sort control: dropdown labelled **"Sort by"** with two radio options — **"Created at"**
  and **"Last used"**. Changing the sort clears all manual per-project task orders so the
  list fully re-sorts (`applySort`).
- A separate **"Pinned"** group appears above/alongside the project tree only when at
  least one task anywhere is pinned; lists pinned tasks flat, sorted by the same sort
  key, tightly padded (`rowVariant="pinned"`).
- Under an expanded project, tasks are listed in either the manual drag order (if the
  user has reordered) or the sort-by order; pinned tasks are excluded from this list
  (they live in the Pinned group instead). Archived tasks and automation-run tasks are
  excluded from both lists (`isVisibleRegularTask`).
- Source: `workbench/browser/sidebar/{sidebar-store,projects-group-label,
  pinned-task-list,left-sidebar,sidebar-navigation}.tsx`.

### Task row (sidebar item)
- Click opens the task (navigates to the task view). Row shows the task name (dimmed to
  40% opacity while the task is bootstrapping), and a trailing cluster of: optional
  git added/removed line-change stats, an optional compact PR status badge, and a
  trailing "slot" that is one of:
  - **Bootstrapping**: a wave-pattern braille spinner with tooltip **"Creating task
    workspace..."**, shown after a 500ms delay (to avoid flicker on fast creates).
  - **Active agent status**: the shared `AgentStatus` indicator/tooltip when the task's
    conversation has a non-idle status (this indicator itself, including any "context
    limit" wording, belongs to the conversations feature and is out of this document's
    scope).
  - **Relative timestamp**: e.g. "3m", based on either `createdAt` or
    `lastInteractedAt`/`updatedAt` depending on the active sort, shown only if the
    `interface.showLeftSidebarTimestamps` setting is on (default on).
- Line-change stats and PR badge visibility are gated by
  `interface.showLeftSidebarLineChanges` and `interface.showLeftSidebarPrStatus`
  (both default **on**).
- Source: `workbench/browser/sidebar/task-item.tsx`,
  `workbench/browser/sidebar/task-sidebar-agent-status.tsx`.

### Task row context menu (right-click)
- **"Pin task"** / **"Unpin task"** (only if `canPin`, i.e. the task is not
  `unregistered`).
- **"Rename"** — opens the rename modal.
- **"Reconnect"** — only shown when the row provides a reconnect handler (workspace has a
  connection state, e.g. an SSH workspace that's disconnected).
- **"Convert to regular task"** — only for tasks with an automation-run association.
- **"Archive"** — hidden once archived; can carry a disabled reason surfaced via
  `aria-describedby` to a visually-hidden span.
- **"Restore"** — only shown for archived rows with a restore handler.
- **"Copy branch name"** — only if the task has a resolved branch name; copies to
  clipboard via `navigator.clipboard`, toasts **"Branch name copied"** on success or
  **"Copy failed"** with description *"The branch name could not be copied to the
  clipboard."* on failure.
- Separator, then **"Delete"** (destructive/red variant).
- Source: `tasks/contributions/browser/task-context-menu.tsx`.

### Rename task
- Modal title **"Rename task"**, single field **"Task name"**, max length 64, Enter
  submits.
- Validation messages: **"A task with this name already exists in this project."**
  (duplicate, case-insensitive/normalized against sibling task names) or **"Task name
  cannot be empty."** The Confirm button (**"Rename"**, or **"Renaming..."** while
  submitting) is disabled while invalid, unchanged, or empty.
- On a not-found race, shows **"Task not found."**; on any other thrown error, shows the
  error's message or **"Failed to rename task"**.
- Whether renamed names keep their typed capitalization is controlled by the
  `tasks.preserveNameCapitalization` setting (default **off** — names are lowercased).
- Source: `tasks/browser/rename-task-modal.tsx`.

### Delete task(s)
- Modal title: **"Delete task"** (single) or **"Delete `<N>` tasks"** (bulk, opened e.g.
  via `Mod+Backspace` on a multi-selection in the task list).
- Description: **`"`<name>`" will be permanently deleted. This action cannot be
  undone.`"** (single) or **"`<N>` tasks will be permanently deleted. This action cannot
  be undone."** (bulk).
- **"Delete worktree(s)"** checkbox — checked by default; only shown if any selected task
  actually has a worktree. Label reads **"Delete worktree"** (single) or **"Delete
  worktrees (`<M>` of `<N>` tasks)"** (bulk).
  - If the target host is unreachable, the checkbox is force-unchecked and disabled, with
    a warning box: *"`<disabled reason>` The worktree cannot be deleted right now. The
    task record will be removed; delete the worktree later from the workspaces view."*
  - If deleting the worktree(s) would discard uncommitted work, a warning box appears:
    *"`"`<name>`" has uncommitted changes (+`<added>` −`<deleted>`) that will be
    lost.`"* (single) or *"`<N>` `<tasks have|task has>` uncommitted changes that will
    be lost: `<comma-joined quoted names>`"* (bulk).
  - If deleting would discard unpushed commits: *"`"`<name>`" has `<N>` unpushed
    `<commit|commits>`.`"* (single) or *"`<N>` `<tasks have|task has>` unpushed
    commits."* (bulk).
- **"Delete branch(es)"** checkbox — defaults from the `tasks.deleteBranchByDefault`
  setting (default **off**), only enabled while "Delete worktree" is checked. Label:
  **"Delete branch"** (single) or **"Delete branches (`<M>` of `<N>` tasks)"** (bulk).
- If the host action itself is disabled entirely, a status box reads: *"`<reason>` The
  Task record can still be deleted without removing workspace artifacts."*
- **"Delete conversations"** checkbox — checked by default; disabled together with the
  host-action-disabled state.
- Footer: **"Cancel"** and a destructive confirm button reading **"Delete"** /
  **"Delete `<N>` tasks"** (bulk) / **"Loading..."** while the deletion preflight query is
  still running.
- Source: `tasks/browser/delete-task-modal.tsx`,
  `tasks/node/operations/getDeletePreflight.ts`.

### Archive / restore / pin
- Archive removes a task from the visible sidebar tree (see `isVisibleRegularTask`); if
  the archived task was the active view, navigation falls back to the project view.
  Shortcut: `Mod+Shift+E` (`task.archive`, ignored while an editor is focused).
- Pin/unpin: available to any registered task; pinned tasks move into the dedicated
  Pinned group and show a filled pin icon in the task titlebar.
- Source: `tasks/node/operations/{archiveTask,restoreTask,setTaskPinned}.ts`.

### Drag / reorder and bulk selection
- Tasks can be manually dragged into a custom order per project
  (`use-sidebar-drop.ts` → `sidebar-store.setTaskOrder`); new tasks not yet present in
  a manual order are sorted by the active sort key and prepended above the manually
  ordered ones.
- `deleteSelectedTasks` supports acting on a multi-selection tracked by the project's
  task view store (`taskView.selectedIds`), triggered by `Mod+Backspace`.
- Source: `workbench/browser/sidebar/use-sidebar-drop.ts`,
  `tasks/api/browser/delete-selected-tasks.ts`.

## Task states and lifecycle

### `TaskViewKind` (drives what the main panel/titlebar render)
`missing | project-hydrating | project-error | creating | create-error | provisioning |
provision-error | teardown | teardown-error | idle | ready`
— derived by `taskViewKind()` from the project store's context state and the task's own
`state`/`phase`. Source: `tasks/api/browser/task-state/task-selectors.ts`.

- **creating**: task is registered but its record hasn't finished creating. Main panel
  shows a centered spinner labelled **"Creating task"**.
- **create-error**: task creation failed. Main panel shows **"Error creating task"** in
  destructive red, with the stored error message (or a generic fallback) beneath.
- **project-hydrating**: the owning project itself hasn't finished loading. Main panel:
  spinner labelled **"Loading project…"**.
- **provisioning**: workspace is being provisioned. See "Provisioning loader" below.
- **provision-error**: workspace provisioning failed. Same loader component in error
  mode.
- **teardown / teardown-error**: workspace is being (or failed being) torn down. `idle`
  loader label **"Setting up workspace…"** covers `idle`/`teardown` together; a distinct
  **"Failed to tear down workspace"** panel (destructive) covers `teardown-error`.
- **idle** (with host actions disabled): shows the "Workspace is unavailable" missing
  state (see below) instead of the generic idle spinner.
- **project-error**: **"Failed to set up workspace"** (destructive) plus the task's error
  message.
- **missing** (task or project not found, or workspace observed missing): the
  "Workspace is missing" panel (see below).
- **ready**: normal `ReadyTaskMainPanel` with tab panes + sidebar.
- Source: `tasks/browser/main-panel.tsx`.

### Provisioning loader (`TaskProvisionLoader`)
- Delayed by 300ms before showing (avoids flicker on instant provisions); error states
  show immediately (0ms delay).
- Headline while working: **"Creating workspace…"** (if a `workspaceCreation` record is
  present) or **"Activating workspace…"** otherwise.
- Sub-label while a creation record is streaming: one of the human stage labels —
  **"Inspecting the repository…"**, **"Resolving the base branch…"**, **"Fetching the
  base branch…"**, **"Creating the worktree…"**, **"Verifying the worktree…"** (falls
  back to the raw stage id if unmapped).
- Error headline: **"Workspace creation failed"** (if the creation outcome itself
  failed) or **"Workspace activation failed"** otherwise.
- Error body: joins the failed stage (**"Failed at `<stage>`"**) and message with `: `,
  or falls back to the generic task error message.
- Error state adds a **"Retry"** button (ghost), which re-invokes `provisionTask`;
  disabled with the live-action-disabled reason when the host is unreachable.
- Source: `tasks/browser/main-panel.tsx` (`CREATION_STAGE_LABELS`, `TaskProvisionLoader`).

### Missing / unavailable workspace panel
- Default copy: title **"Workspace is missing"**, description **"Emdash could not
  activate this workspace. Re-provision it or remove the task."**
- Host-degraded variant (`idle` + host action disabled): title **"Workspace is
  unavailable"**, description **"The Task is still available, but its workspace needs
  live Project access."**
- Actions (when a reprovision handler exists): **"Re-provision"** button; when a
  destructive remove-and-reprovision handler also exists, a ghost **"Remove and
  re-provision"** button. Both carry the disabled reason as their `title`/`aria-label`
  when the host action is unavailable.
- "Remove and re-provision" first asks a native `window.confirm` dialog: *"Remove this
  workspace and permanently discard any uncommitted files or changes, then re-provision
  it? This cannot be undone."*
- On failure of either action, a toast: **"Could not re-provision workspace"** with the
  thrown error's message as description.
- Source: `tasks/browser/main-panel.tsx` (`MissingWorkspaceState`,
  `reprovisionWorkspace`).

### Task error messages (`taskErrorMessage`)
- Create-error fallback: **"Failed to create task"**.
- Provision-error fallback: **"Failed to set up workspace"**.
- Teardown-error fallback: **"Failed to tear down task"**.
- Source: `tasks/api/browser/task-state/task-selectors.ts`.

## Workspace lifecycle (Activity badge)

- A single titlebar badge (`ActivityBadge`) replaces any earlier separate
  background/script pills. Rendered only when the task has recorded lifecycle steps.
- Trigger button label: **"Activity"** with an `Activity` icon; shows a spinner instead
  of the icon while any step is `running`/`pending`. `data-activity-state` is
  `running | failed | settled`. When failed (and not running), the trigger tints
  destructive (red background/text).
- Popover lists every recorded, non-`skipped` step (the durable `fetch-refs` step is
  always hidden even if present) with:
  - The shared `ScriptStatus` icon per step status: `pending`→waiting,
    `running`→in-progress, `succeeded`→success, `failed`→error, `cancelled`→cancelled.
  - Step title from `LIFECYCLE_STEP_TITLES`: **Adopt worktree, Fetch branch, Fetch
    remote base, Create worktree, Configure branch, Copy artifacts, Push branch, Fetch
    refs, Prepare, Setup, Run, Teardown**.
  - A relative timestamp (**"just now"**, **"`<N>`m ago"**, **"`<N>`h ago"**,
    **"`<N>`d ago"**) — for the `run` step this is when it *started* (since it may still
    be running); every other step shows when it *finished*.
  - A generated one-line description per step id, e.g. *"Fetching `<source>` into
    `<branch>`"*, *"Configuring upstream tracking for `<branch>`"*, *"Adding worktree at
    `<path>` using newly created/existing branch `<branch>`"*, *"Copying `<N>` artifacts
    defined in preservePatterns"*, *"Pushing `<branch>` to `<remote>`"*, *"Running
    prepare/setup scripts"*, *"Starting run scripts"*, *"Running teardown scripts"*.
  - On failure, the failure message in red beneath; on cancellation, the message in
    muted grey.
- The four script steps (**prepare, setup, run, teardown**) are clickable — opens that
  script's output in the bottom terminal drawer (tooltip/title **"Open script output"**).
  A failed script step also gets an inline **"Retry"** button (with a spinning
  `RotateCcw` icon while retrying) that starts a fresh manual run tagged `provenance:
  'retry'`. On failure to retry, toast: **"Could not retry the `<script>` script"** with
  the error message.
- The `push-branch` step, when failed, similarly gets a **"Retry"** button that calls the
  workspace registry's `retryStep` verb; on failure, toast **"Could not push the
  branch"**.
- Source: `tasks/browser/components/activity-badge.tsx`,
  `primitives/workspaces/api/lifecycle-step-titles.ts`,
  `primitives/workspaces/api/describe-worktree-git-plan.ts`.

## Workspaces list (project workspace/worktree management)

Shared component used from both the project view and settings pages, listing every
worktree/workspace under a project's repository.

### List states
- Loading: spinner + **"Loading workspaces"** (customizable label).
- Query error: **"Could not load workspaces."** (customizable title) plus the error
  message.
- Offline/unavailable (host not observed): a Wi-Fi-off icon with title
  **"Machine offline"** by default, or **"Workspace data unavailable"** when live actions
  are enabled but nothing has streamed yet; description varies: *"Workspace data has not
  been loaded from the Local runtime yet."* (local), *"`<Machine>` has not provided
  workspace data yet."* (remote, live actions enabled), *"`<Machine>` has not provided a
  workspace observation yet."* or *"Workspace data will appear after live Project access
  returns."* (live actions disabled).
- Empty: generic **"`<message>`"** centered text, e.g. **"Workspace not found."**,
  **"No worktrees found."**, **"No worktrees match your search."** (when a search filter
  yields nothing).
- Stale banner: when the mirrored observation is stale, a warning bar: *"Showing the
  last observed workspace data. `<live-action-disabled reason>`"*
- Source: `workspaces/contributions/browser/{workspace-states,workspace-detail-page}.tsx`.

### Repository header + worktree table
- `RepositoryHeader` shows the root repo row (icon/status, usage, git stats, warnings,
  a project-wide **Delete** action) — see `repository-header.tsx`.
- `WorkspaceRemovalAttentionPanel` — a list of cards for pending deletions that stalled on
  a terminal failure (spec ADR 0006): title **"Couldn't remove `<worktree label>`"**, the
  stop reason and a relative time, with **"Retry"** and **"Untrack anyway"** buttons.
  - Retry success toast: **"Removal retrying"** / *"The removal runs again in the
    background."* Failure toast: **"Could not retry removal"**.
  - Untrack success toast: **"Workspace untracked"** / *"Emdash dropped the pending
    removal without deleting files on the host."* Failure toast: **"Could not untrack
    workspace"**.
- Worktree table columns: icon+status, name (with pending-removal/path-issue/script-issue
  chips) + path, branch + git stats, storage size (**"Loading..."** / **"Scanning
  artifacts"** while measuring, else formatted bytes + **"`<bytes>` artifacts"**), and
  linked/active task counts (**"`<N>` Linked task(s)"** / **"`<N>` task(s) active"**).
- Search box placeholder: **"Search worktrees…"**, matches name/path/branch.
- Per-row `⋯` actions menu (**"Actions for `<name>`"**): **"Open in Task"** (disabled with
  a reason when not applicable, e.g. no workspace id), **"Clean Artifacts"** (disabled if
  `!canCleanArtifacts`), destructive **"Delete"** (disabled if `!canDelete`).
- Source: `workspaces/contributions/browser/workspace-detail-page.tsx`.

### Status/warning pills
- **Removal pill**: while pending, shows a pulsing amber **"Removing…"** pill, or if the
  removal needs attention, a destructive **"Removal failed"** pill with tooltip
  (the stop message, or *"The removal stopped after a failure that needs your
  decision."*).
- **Path issue chip**: **"Stale git record"** (amber, git reports the worktree as
  prunable) or **"Missing"** (red, directory not found), tooltip with the specific
  message (*"Git reports this worktree as prunable."* / *"Directory not found at
  `<path>`."* / custom reason).
- **Script issue chip**: uppercase small pill, e.g. **"PREPARE FAILED"**, **"SETUP
  FAILED"**, **"RUN FAILED"** (or "TIMED OUT" variants), tooltip with relative time and
  message. One durable failure per script; a live-overlay notice only adds a chip when
  no durable failure is recorded yet for that script.
- **Aggregate pills** (project-wide): removal summary — *"`<N>` removal(s) pending"* or,
  if any need attention, *"`<N>` removal(s) need attention"*; path-issue summary — for one
  row: *"`<name>` has a stale git record"* / *"`<name>` missing"*; for several: *"`<N>`
  worktrees need attention"*.
- Source: `workspaces/contributions/browser/workspace-pills.tsx`.

### Bulk / single delete and clean-artifacts flows
- Project-wide **Delete**: if nothing is deletable, a toast reads **"Removal already
  pending"** (*"These workspaces are already being removed."*) or **"No deletable
  workspaces"** (*"Repository roots cannot be deleted from this view."*). Otherwise a
  confirm dialog: title **"Delete `<project>` workspaces?"**, description *"This deletes
  linked task worktrees for this repository where supported. Repository roots are
  preserved."*, confirm label **"Delete"** (destructive), with an unchecked-by-default
  checkbox **"Delete their conversations too"**. On partial failure, toast **"`<N>`
  deleted, `<M>` failed"** with the first failure's message; on full success, toast
  **"Deleted `<N>` workspaces"**.
- Per-row **Delete**: confirm dialog title **"Delete `<name>`?"**, description depends on
  active sessions — *"This removes the workspace and its linked tasks. Active sessions
  will be stopped."* or *"This removes the workspace. Linked tasks are deleted with their
  owned worktrees."* — with the same **"Delete their conversations too"** checkbox
  (unchecked by default). Success toast **"Deleted `<name>`"**; failure toast **"Could
  not delete workspace"**.
- Per-row **Clean Artifacts**: confirm dialog title **"Clean artifacts for `<name>`?"**,
  description depends on active sessions — *"This stops active sessions, runs teardown
  scripts, and removes gitignored artifacts. Tasks remain restorable, but dependencies
  may need to be restored."* or *"This runs teardown scripts and removes gitignored
  dependencies, build output, and caches. The worktree and its tasks stay intact."*,
  confirm label **"Clean Artifacts"**. Success toast: **"Queued artifact cleanup for
  `<name>`"**; failure toast **"Could not clean artifacts"**.
- Source: `workspaces/contributions/browser/workspace-detail-page.tsx`,
  `workspaces/api/browser/use-workspace-groups.ts`.

## The workbench (task view layout)

### Overall structure
- Titlebar (project breadcrumb + task name/status + right-side controls) → main split
  area (resizable tab panes, optionally split multiple ways) → optional bottom terminal
  drawer → optional right sidebar (Changes / Files / Conversations).
- Before the view's memento space finishes hydrating (persisted layout/tab state), the
  whole view renders only a full-height spinner (no chrome painted early), so
  reopening a task never flashes a stale/default layout before snapping to the saved
  one.
- Source: `tasks/browser/view.tsx`, `tasks/browser/main-panel.tsx`.

### Titlebar (pending task)
- While the task isn't `ready` yet: a minimal titlebar with just
  **"`<Project>` / `<Task name>`"** (project name is a clickable link back to the
  project view).
- Source: `tasks/browser/task-titlebar.tsx` (`PendingTaskTitlebar`).

### Titlebar (ready task)
- Left: **`<Project>` /** breadcrumb, then the task name (popover trigger) with a
  connection-status dot, tooltip **"Link to issue"**. The popover shows:
  - **"Task"** micro-label + the task name.
  - A bordered git box: branch name (`GitBranch` icon) and, depending on publish state:
    - **Published**: **"Fetch"** (spinner label **"Fetching..."**), **"Pull"** with a
      behind-count badge (disabled + **"Pulling..."** while pulling, disabled entirely
      when behind-count is 0 with tooltip **"Nothing to pull"**), **"Push"** with an
      ahead-count badge (**"Pushing..."**, tooltip **"Nothing to push"** when
      ahead-count is 0).
    - **Unpublished**: **"Publish"** button (**"Publishing..."** while running; tooltip
      **"Create an initial commit first"** if HEAD is unborn, else **"Publish branch"**).
  - The `IssueSelector` to link/unlink an issue from the task.
  - A linked-issue badge (provider logo + identifier, or the issue title if no
    identifier) opens the issue URL externally when clicked; tooltip shows the full
    title/identifier.
  - A pin toggle icon (filled when pinned) for regular tasks.
  - An `AutomationRunPill` when the task originated from an automation run (see below).
- Right: `ActivityBadge`, `PreviewServerPills`, an **"Open in…"** menu
  (`OpenInMenu` — external editor/terminal), a vertical separator, a terminal-drawer
  toggle (tooltip **"Toggle terminal `<Mod+J>`"**), another separator, and a
  three-way `ToggleGroup` for the right sidebar tab:
  - **"Changes"** (`FileDiff` icon; shows an animated `+N`/`-N` diff-stat chip when there
    are changes) — shortcut `Mod+Shift+1`.
  - **"Files"** (`FolderOpen` icon) — shortcut `Mod+Shift+2`.
  - **"Conversations"** (`Clock` icon) — shortcut `Mod+Shift+3`.
  - Deselecting the active tab collapses the sidebar; `Mod+.` also toggles the whole
    sidebar (`task.toggleRightSidebar`).
- Source: `tasks/browser/task-titlebar.tsx`.

### Automation run pill
- A small pill (`Clock` icon) reading the automation run's name and a relative
  timestamp; opens a popover with **"Automation"** name, **"Run date"**
  (localized date+time), and — if the task hasn't been converted yet — a note *"Convert
  to a regular task to manage it independently."* with a **"Convert to task"** button
  (**"Converting…"** while running).
- Source: `tasks/browser/components/automation-run-pill.tsx`.

### Main split area (panes, splitting, drag-and-drop)
- Tabs live in one or more horizontally-arranged, independently resizable panes
  (`Resizable.Group` "task-main-split"); pane sizes persist per composition via the
  shared layout memento (`taskPanelLayoutsMemento`) and default to an even share of
  width for a newly created split.
- Dragging a tab (via `dnd-kit`) into a pane's split-drop zone creates a new pane;
  `canSplit` requires the source pane to have ≥2 tabs and the layout to allow another
  pane (`paneLayout.canInsertPane`).
- Terminal tabs can also be dragged out of the bottom drawer directly into a pane
  (recognized via `TerminalDrawerDragData`), opening a `terminal` tab there.
- A drag overlay shows a preview: the dragged tab's `TabDragPreview`, or, for a
  terminal being dragged out of the drawer, a pill with the terminal's label.
- Each pane hosts a tab strip + content region (`PaneContent`); a **"+"** button after
  the last tab (`NewConversationTabButton`, tooltip **"New Conversation `<Mod+T>`"**)
  opens the create-conversation modal targeted at that pane.
- Source: `tasks/browser/view/task-main-column.tsx`, `tasks/browser/
  new-conversation-tab-button.tsx`.

### Terminal drawer
- A collapsible bottom panel (`Resizable.Group` "task-main-vertical") hosting
  `TerminalsPanel`. Toggle via the titlebar terminal icon or `Mod+J`
  (`task.toggleTerminalDrawer`); dragging it down past ~10% of the column height snaps it
  to fully closed (`TERMINAL_DRAWER_CLOSE_THRESHOLD`), while every larger height the user
  settles on persists as a normal resize.
- Terminal PTY sessions survive drawer close/open because the xterm DOM is reparented to
  an off-screen host rather than disposed.
- Source: `tasks/browser/view/task-main-column.tsx`.

### Right sidebar (Changes / Files / Conversations)
- Only mounted while expanded; switching tabs fully remounts the active body (file tree
  expansion persists via a separate memento; changes-panel section sizes persist via the
  shared layout storage; nothing keeps a live Monaco instance across tabs).
- Body per tab: **Conversations** → `SidebarConversationsList`; **Changes** →
  `ChangesPanel`; **Files** → `EditorFileTree` (these three panels' own internal content
  belongs to the conversations/source-control/editor features, out of this document's
  scope).
- Dragging the sidebar's resize handle past ~8% of the group width closes it
  (`SIDEBAR_CLOSE_THRESHOLD`); the resize floor while open is 280px
  (`SIDEBAR_MIN_SIZE`), matching the previous fixed-width UI so no persisted width
  becomes an accidental close.
- Hidden entirely while Zen mode is active (`workbench.zenMode`, `Control+Z`).
- Source: `tasks/browser/view/task-sidebar.tsx`, `tasks/browser/main-panel.tsx`
  (`ReadyTaskMainPanel`).

### Empty pane state
- Centered Emdash logo (dimmed) with two keyboard-navigable action rows:
  - **"New conversation"** (`MessageSquare` icon, bound shortcut for
    `task.newConversation`) — opens the create-conversation modal, then opens the result
    as an `acp-chat` or `conversation` tab in this pane.
  - **"Open file"** (`FileSearch` icon, bound shortcut for `app.commandPalette`) — opens
    the command palette.
  - Arrow-key navigation moves a highlighted selection between the two rows; Enter (via
    the shared arrow-key-navigation hook) activates the selected one.
- Source: `tasks/browser/pane-empty-state.tsx`.

## Tab types (task-tab-contributions)

Registered by `src/core/manifests/browser/task-tab-contributions.ts`, aggregating each
slice's `contributions/tabs.ts`:

| kind | provider | feature |
|---|---|---|
| `conversation` | `conversationTabProvider` | conversations |
| `acp-chat` | `acpChatTabProvider` | conversations |
| `file` | `fileTabProvider` | editor |
| `diff` | `diffTabProvider` | source-control |
| `terminal` | `terminalTabProvider` | terminals |
| `browser` | `browserTabProvider` | browser |

Full tab-content behavior for `conversation`/`acp-chat` (chat rendering, agent status
inside the transcript, rename affordance) belongs to the conversations feature and is out
of this document's scope; only the tab-shell mechanics are covered here.

### Conversation / ACP-chat tabs
- `mount: 'single'` (one resource instance per conversation id); resource key is the
  conversation id.
- Rename command exists on the tab (`commands.rename`, label **"Rename"**), invoked from
  the tab bar's rename affordance / `workbench.tabRename` (`Mod+Shift+R`).
- If the underlying conversation can't be found when the tab initializes, the tab
  auto-closes on the next tick (no user-visible content, just a disappearing tab).
- Source: `conversations/browser/{conversation-tab-provider,acp/acp-chat-tab-provider}.tsx`.

### File tabs
- `mount: 'single'`, keyed by absolute file path. Path is resolved relative to the
  workspace when opened with a relative path, and mapped to a host file reference
  (local or the task's SSH connection).
- Toolbar (`FileContentToolbar`) plus, when the project's live host action is disabled,
  a note bar showing that disabled reason beneath the toolbar.
- Content states: normal Monaco source view; a **Preview** mode for file types that
  define one (toggle available only when the type is both editable and previewable);
  a blocked placeholder (`FileStatusPlaceholder`) whenever the file's content status
  isn't `ready` (loading, error, orphaned); or, if blocked specifically because live
  actions are disabled, an `EmptyState` labelled **"File unavailable"** with the disabled
  reason as description.
- Closing a dirty file: if live actions are disabled, the tab stays open and a toast
  reads **"Unsaved file kept open"** with the disabled reason. Otherwise it opens the
  shared unsaved-changes modal (naming the file); choosing **discard** reloads from disk
  and closes; choosing **save** saves and closes unless a save conflict is hit, in which
  case a conflict dialog offers to reload from disk or overwrite.
- Source: `editor/browser/task-editor/file-tab-provider.tsx`.

### Diff tabs
- `mount: 'single'`; resource key combines file path, diff group, and (for `git`-group
  diffs) the original/modified refs, so different diffs of the same file are distinct
  tabs.
- Diff group suffixes shown in the tab/label: **"(Working Tree)"** (`disk`), **"(Index)"**
  (`staged`), **"(PR)"** (`pr`), **"(Git)"** (`git`).
- Source: `source-control/browser/diff-view/diff-tab-provider.tsx`.

### Terminal tabs
- `mount: 'single'`, keyed by terminal id; tab bar label falls back to **"Terminal"** if
  the terminal record has no name yet.
- If the owning terminal manager isn't found at all when opening, the tab silently
  auto-closes (`force: true`) on the next tick.
- If a terminal is later removed from the drawer/manager while its tab is open, the tab
  auto-closes once the manager reports loaded-but-missing.
- Empty-state copy inside the content area: **"Terminal unavailable"** /
  *"This terminal was removed from the drawer."* (manager loaded, terminal gone) or
  **"Loading terminal"** / *"Restoring terminal session."* (manager still loading).
- Unavailable-state (host action disabled) copy: **"Terminal unavailable"** with the
  live-action-disabled reason (or a generic *"Live actions are unavailable."* fallback)
  as description.
- Activating a disconnected terminal session (while live actions are enabled)
  reconnects it automatically.
- Source: `terminals/browser/task-terminal/terminal-tab-provider.tsx`.

### Browser tabs
- No `mount` restriction — every "Open Browser" creates a fresh browser session/tab
  (`browserSessionStore.createSession`), seeded from the app's default browser profile
  setting. Only the active browser tab's pane is visible (others hidden + `inert`);
  switching away clears the active-browser selection at the client level.
- Source: `browser/browser-tab-provider.tsx` (not read in full; behavior inferred from
  the tab provider registration and effect in the aggregated dump).

## Keyboard shortcuts (tasks + workbench commands)

All from `tasks/contributions/commands.ts` and `workbench/contributions/commands.ts`;
default bindings shown, all rebindable via Settings → Keyboard (`keybinding.settings`):

- **New Conversation** — `Mod+T`
- **New Conversation in Right Split** — `Mod+D`
- **View Changes** (right sidebar) — `Mod+Shift+1`
- **View Files** — `Mod+Shift+2`
- **View Conversations** — `Mod+Shift+3`
- **Search File Contents** — `Mod+Shift+F` (allowed while terminal focused)
- **Toggle Terminal Drawer** — `Mod+J`
- **Toggle Right Sidebar** — `Mod+.`
- **New Terminal** — `` Mod+Shift+` ``
- **Open Browser** — `Mod+Shift+B`
- **Copy Browser URL** — `Mod+Shift+C`
- **Archive Task** — `Mod+Shift+E` (ignored while an editor is focused)
- **Next Task / Previous Task** — `Mod+Alt+ArrowDown` / `Mod+Alt+ArrowUp` (ignored
  while an editor is focused)
- **Delete Selected Tasks** — `Mod+Backspace` (ignored while a text input is focused)
- **New Project** — `Mod+Shift+N`
- **New Task** — `Mod+N`
- **Open Settings** — `Mod+,`
- **Command Palette** — `Mod+K`
- **Open in Editor** — `Mod+O`
- **Confirm** — `Mod+Enter`
- **Close Modal** — `Escape` (fixed)
- **Toggle Left Sidebar** — `Mod+B`
- **Zen Mode** (hide both sidebars) — `Control+Z` (ignored while editor or browser
  focused)
- **Next/Previous Tab** — `Mod+Alt+ArrowRight` / `Mod+Alt+ArrowLeft`
- **Close Tab** — `Mod+W`
- **Reopen Closed Tab** — `Mod+Shift+T`
- **Rename Tab** — `Mod+Shift+R`
- **Split Pane** — `Mod+\`
- **Cycle to Next/Previous Tab** — `Control+Tab` / `Control+Shift+Tab` (fixed, allowed
  while terminal focused)
- **Open Tab 1–9** — `Mod+1`…`Mod+9` (fixed)
- **Save File** — `Mod+S` (fixed, ignored while the in-app browser is focused)
- **Save All Files** — `Mod+Shift+S` (fixed, same guard)
- **Find in Terminal** — `Mod+F` (fixed, allowed while terminal focused)
- **Close Terminal Search** — `Escape` (fixed)
- Git Fetch/Pull/Push and the four browser navigation commands (Back/Forward/
  Reload/Focus URL) and "Open Browser URL Externally" and "Pin Task"/"Convert to
  Regular Task" are registered commands with no default keybinding (invoked only from
  UI or the command palette).

## Settings that affect this scope

### Tasks settings (`tasks` key)
| Setting | Default | Effect |
|---|---|---|
| `autoGenerateName` | `true` | Whether the task-name field auto-generates a name from the prompt/issue (vs. requiring manual entry). |
| `autoApproveByDefault` | `false` | Seeds the "Auto-approve permissions" switch in the initial-conversation composer. |
| `autoTrustWorktrees` | `true` | (Not directly UI-visible in this scope; feeds worktree trust behavior.) |
| `createBranchAndWorktree` | `true` | Default state of the "Create new branch" vs. "Checkout branch" toggle in the new-worktree panel. |
| `deleteBranchByDefault` | `false` | Seeds the "Delete branch" checkbox in the delete-task modal. |
| `preserveNameCapitalization` | `false` | Whether typed task/branch names keep their case instead of being lowercased. |
| `includeIssueContextByDefault` | `true` | Whether linking an issue auto-injects its context into the initial prompt. |

### Interface settings (`interface` key, workbench)
| Setting | Default | Effect |
|---|---|---|
| `showTrayIcon` | `true` | System tray icon (outside this scope). |
| `taskHoverAction` | `'delete'` | Which quick action a hovered task row exposes (`delete` or `archive`) — enum only confirmed in schema; exact hover-button UI not directly inspected in this pass. |
| `autoRightSidebarBehavior` | `false` | Whether the right sidebar auto-opens/behaves automatically (exact trigger not directly inspected). |
| `showLeftSidebarLineChanges` | `true` | Shows/hides the added/removed line-count stat on sidebar task rows. |
| `showLeftSidebarPrStatus` | `true` | Shows/hides the compact PR badge on sidebar task rows. |
| `showLeftSidebarTimestamps` | `true` | Shows/hides the relative-time trailing slot on sidebar task rows. |
| `hideContextBar` | `false` | Hides the context bar (exact surface not directly inspected in this pass). |

### Other
- `openIn` settings (`default`, `hidden`) drive the titlebar's **"Open in…"** menu
  options; default `'terminal'`.
- `keyboard` settings hold per-command rebind overrides keyed by each command's
  `settingsKey`.
- `theme` (`emlight`/`emdark`/null) is app-wide, not task-specific.

## Task lifecycle notes / edge cases observed

- A task's worktree can be "missing" even when the task record is healthy
  (`workspaceObservedStatus === 'missing'`), which routes to the same "Workspace is
  missing" panel as a `missing` view kind — distinguishing "never provisioned" from
  "was provisioned, now gone" is not exposed differently in copy.
- Deleting a task's worktree when the target host is unreachable does not block the
  task-record delete; it only skips the worktree/branch removal and says so explicitly
  in the delete-modal warning box.
- Removing a workspace whose deletion previously stalled on a failure requires an
  explicit choice between "Retry" and "Untrack anyway" (the latter drops it from tracking
  without touching files on the host) — Emdash will not silently retry forever nor
  silently give up.
- A conversation tab or terminal tab whose backing resource vanished underneath it
  (conversation deleted, terminal manager unloaded) self-closes on the next tick rather
  than showing a broken tab.
- Task creation, provisioning and workspace lifecycle steps all share one vocabulary
  (`LIFECYCLE_STEP_TITLES`) between the create-modal's "what will happen" preview and the
  live Activity badge's "what is happening" — the code comments are explicit that this is
  deliberate so the two surfaces cannot drift apart.

## Unverified / unclear

- The exact hover-quick-action UI driven by `interface.taskHoverAction` (`delete` vs
  `archive`) was found only as a settings schema entry; the row-hover button itself
  (icon, position, tooltip) was not located in this pass.
- `interface.autoRightSidebarBehavior` and `interface.hideContextBar` — schema confirms
  they exist with defaults, but the exact behavior/surface they gate was not traced to
  a concrete component in this pass.
- The `browser` tab provider (in-app browser tab) was read only from a partial dump
  (icon/session-creation logic); its tab-bar label/icon component
  (`browser-tab-item.tsx`) and full in-tab UI (URL bar, nav buttons, etc.) were not
  read in full — the associated commands (`task.browserGoBack/Forward/Reload/
  FocusUrl/OpenExternal/CopyUrl`) confirm the feature set exists.
- No "multi-agent" or "best-of-N" task-creation mode was found anywhere in
  `tasks/`, `workspaces/`, or `workbench/` for this version (v1.2.6) — the create-task
  modal creates exactly one task with one agent. This may not match expectations set by
  the task brief; flagging rather than assuming it exists elsewhere unseen.
- `AgentStatus`/context-limit wording (the "context limit reached" example given as the
  target level of detail) lives in the conversations feature
  (`conversations/api/browser/conversation-selectors.ts` and the `AgentStatus` UI
  component), which is out of this document's assigned scope (tasks/workspaces/workbench
  only) — not catalogued here to avoid duplicating another slice's audit.
- Drag/reorder mechanics for the sidebar task list (`use-sidebar-drop.ts`) were located
  and referenced but not read line-by-line; exact drop-zone visuals not confirmed.

## Coverage note

This pass read essentially every file directly under `tasks/browser/`,
`tasks/contributions/browser/`, `tasks/api/browser/create-task-modal/`,
`workbench/browser/sidebar/`, `workbench/contributions/{commands,settings}.ts`,
`workspaces/contributions/browser/`, and all five `*-tab-provider.tsx` files, plus the
relevant `primitives/workspaces/api/*` copy sources. Not read in full: the workspace
node-side operations/services (`tasks/node/operations/*`, `workspaces/node/**`) beyond
what user-visible copy they produce; the `browser` (in-app web browser) tab's full
content UI; `command-palette-modal.tsx` and `file-palette-provider.tsx` (command
palette surfaces reachable from this scope but arguably belong to a "command palette"
audit); and the settings pages that edit `tasks`/`interface`/`keyboard` values (this
document covers what the settings *do*, not the settings-page UI that edits them, which
likely belongs to a "settings" audit).
