## Projects — adding and connecting a repository

### Add Project modal (three creation modes)
What it is: the single entry point for bringing a repository into Emdash. A modal with a project-name field, a location selector (Local machine vs. a named SSH machine), and three mutually exclusive modes selected via cards: **Pick Directory**, **Create Repository**, **Clone Repository**.
Source: `apps/emdash-desktop/src/core/features/projects/browser/components/add-project-modal/add-project-modal.tsx`, `content.tsx`, `modes.ts`, `location-selector.tsx`.

- **Pick Directory** (`PickExistingPanel`): browse/type a local (or remote-host) directory. If the directory is not a git repo, shows "This directory is not a git repository" with an **Initialize git repository** switch (can also be skipped and initialized later from the Changes view). Live-inspects the path (`inspectProjectPath`) and surfaces inspection errors inline.
- **Create Repository** (`CreateRepositoryPanel`): creates a brand-new repo on GitHub. Fields: Owner (via `OwnerSelector`, populated from the user's connected GitHub accounts/orgs), Repository name, Visibility (Private/Public dropdown), target directory, and a GitHub identity strip to pick which connected GitHub account creates it (with a "Connect GitHub" affordance if none connected).
- **Clone Repository** (`ClonePanel`): Repository URL field + target directory field.
- Every mode's directory field defaults to a resolved "default repositories root" (`getDefaultRepositoriesRoot`) which can be ensured/created (`ensureDefaultRepositoriesRoot`, `createHostDirectory`).
- Project name is auto-derived from the picked directory / repo name / URL, editable.
- Submission calls `getProjectManagerStore().startProjectCreation(...)`. If the target directory already contains an existing tracked project, the flow short-circuits to "existing" and just navigates there instead of creating a duplicate.
- On success, the modal offers a **config import prompt** if the project directory has config files it can migrate/import (see "Project config sharing" below).
- Backend: `apps/emdash-desktop/src/core/features/projects/api/wire-contract.ts` (`projectsWireContract`) — RPCs `createProject`, `inspectProjectPath`, `initializeRepository`, `getHostHomeDir`, `getDefaultRepositoriesRoot`, `ensureDefaultRepositoriesRoot`, `createHostDirectory`, `resolveRepositoryDestination`, a `creation` **liveModel** (progress states `cloning → registering → ready|error`) and a `create` **liveJob** for the clone-from-remote path.
- Node implementation: `apps/emdash-desktop/src/core/features/projects/node/operations/create-project.ts` (open-existing-directory path: stats the path, `ensureProjectRepository` git-inits or verifies it's a repo, registers a workspace, inserts a `projects` row) and `create-project-from-remote.ts` (clone path: inspects the target is empty, mints short-lived clone credentials via `GitCredentialsService.mintCloneCredentials`, runs `gitContract.cloneRepository` as a cancellable live job with progress %, then calls `createProject` to register it). Cancelling the job cleans up the partially-cloned target directory.

### Project host — local vs. SSH ("Machine")
Every project is opened against a `ProjectHostParams`: `{ type: 'local' }` or `{ type: 'ssh', connectionId }`. The Location selector lists configured SSH machine connections with live status (connecting/online/offline via `deriveConnectionMachineStatusKind`), and offers "Manage machines" which jumps to Settings → Connections. All project operations (path inspection, directory browsing, repo creation, workspace registry) are host-parameterized so the same UI works for a machine reached over SSH.
Source: `add-project-modal.tsx`, `apps/emdash-desktop/src/core/features/projects/api/wire-contract.ts` (`projectHostParamsSchema`).

### Repository inspection / errors on creation
Backend error union for repo creation/inspection (`CreateProjectResult`, `ProjectPathInspection`) — inferred from usage — covers: not-a-directory, not-a-git-repo, destination-not-empty, invalid-directory, path-already-a-registered-project, workspace registration failures (path-not-found, immutable-field-mismatch), and clone failures translated through `formatCloneErrorDetail` (auth required/failed, network error, remote not found, target exists). States surfaced to the user as inline error boxes or toasts.

### Renaming / deleting / relinking a project
- **Rename**: `renameProject` RPC (`projectsWireContract`) → `node/operations/renameProject.ts`. UI: `rename-project-modal.tsx`.
- **Delete**: `deleteProject` RPC → `node/operations/deleteProject.ts`; confirmation flow in `contributions/browser/use-confirm-delete-project.tsx`.
- **Relink** (when a project's path/host is no longer valid, e.g. a moved folder or an unreachable SSH host): `relink-project-modal.tsx` plus `project-availability-banner.tsx` — shown when a project is "unavailable" (see Availability states below).
- **Availability banner / disabled-action guard**: `project-availability-banner.tsx`, `contributions/browser/project-availability-boundary.tsx`, `contributions/browser/project-live-action-guard.tsx` — every git/task-creating action checks `taskHostActionAvailability` / `projectAvailabilityUi` and disables itself with an explanatory reason (e.g. "Live Project access is unavailable") when the host can't be reached (SSH machine offline, etc.) rather than silently failing.

### Project settings & config sharing (import/export team config)
A whole settings sub-area for a project: `browser/components/settings-view/*`.
- `project-settings-form.tsx` / `use-project-settings-form.ts`: the settings page for one project, backed by `getProjectSettingsPage` / `updateProjectSettings` RPCs and a `Resolved<T>` provenance model (each setting shows whether its value is inherited, overridden, or from a **broken setting** — see `BrokenSettingNotice` used elsewhere too).
- `base-project-settings-section.tsx`, `shareable-project-settings-section.tsx` / `shareable-project-settings-fields.ts`: settings split into device-local vs. "shareable" (team-wide, exportable) categories.
- `share-project-config-modal.tsx`: exports the project's shareable settings into a config file other teammates can import.
- `project-config-import-modal.tsx` / `config-migration-notice.tsx`: detects config files from other tools already sitting in the repo (Codex, Conductor, Paseo/"superset", legacy config) and offers to migrate them into Emdash project settings — implemented by `node/settings/sharing/{codex,conductor,paseo,superset}-config-migration.ts` plus a generic `config-migration.ts`/`config-migration-utils.ts`. This is the "shouldPromptConfigMigration" prompt shown right after creating a project (see Add Project flow above).
- `project-settings-footer.tsx`: shows the file(s) settings are being written to/read from.
- Backend settings storage: `node/settings/project-settings-service.ts`, `providers/db-project-settings-provider.ts` (per-device) and `providers/host-project-settings-provider.ts` (host/repo-local file), with a migration chain (`migrations/ancient-project-config.ts`, `legacy-shareable-marker.ts`, `legacy-stored-project-settings.ts`, `app-worktree-root.ts`) — i.e. settings format has been versioned multiple times and old shapes are read-migrated.
- **Worktree directory** setting: where new worktrees for this project are created on disk — `node/settings/worktree-directory.ts`, with its own app-level default-root migration (`node/settings/migrations/app-worktree-root.ts`, `apps/emdash-desktop/src/core/primitives/project-settings/api/worktree-root.ts`).
- **GitHub account per project**: `countProjectsUsingGithubAccount` RPC (used before disconnecting an account, to warn how many projects use it) and `updateProjectConnection` RPC (rebind a project's SSH connection).

### Project directory / file tree browsing
`directoryTree` liveModel in the projects wire contract: a lazily-expanded file tree keyed by host (`local` or `ssh`) + root path + session id, with `expand`/`reveal` mutations — powers the directory picker used throughout Add Project (`project-directory-picker.tsx`, `local-directory-selector.tsx`, `directory-selector-modal.tsx`).

---

## Starting work — tasks and workspaces

### Create Task modal
What it is: the modal that both creates a "Task" (an agent conversation/thread) and provisions the git workspace (worktree) it runs in. One modal, in one step, ties together: task name, an optional linked issue or PR, the workspace/branch strategy, and the first message to the agent.
Source: `apps/emdash-desktop/src/core/features/tasks/browser/create-task-modal/create-task-modal.tsx`, `use-create-task-state.ts`, `use-create-task-callback.ts`, `build-create-task-params.ts`.

Sections, top to bottom:
1. **Task name field** (`task-name-field.tsx`, `use-task-name.ts`) — free text, can also be auto-generated (`generateTaskName` RPC, `node/name-generation/generateTaskName.ts`).
2. **Linked entity section** (`linked-entity-section.tsx`) — link the task to an **Issue** or a **Pull Request** (mutually exclusive `LinkedType`), pre-selectable via `initialStrategy` (`from-branch` / `from-issue` / `from-pull-request`) when launched from elsewhere (e.g. clicking "Start task" on an issue or PR row).
3. **Tabs**: "Initial Conversation" (the first prompt to the agent, model choice, auto-approve, file drop for prompt attachments — `use-prompt-file-drop.ts`) and "Workspace Settings" (git/workspace configuration, collapsed by default unless an existing workspace was pre-selected).
4. Create button, disabled with a tooltip reason when the project's host is unreachable (`taskHostActionAvailability`).

### Workspace presets (the five ways to get a working directory)
`apps/emdash-desktop/src/core/primitives/workspaces/api/workspace-presets.ts` — a static, provider-agnostic catalogue rendered by `WorkspacePresetPicker` (`browser/task-config/workspace-preset-picker.tsx`):

| id | label | description | requires PR | requires commits |
|---|---|---|---|---|
| `new-worktree` | Create new worktree | isolated worktree on a branch | no | yes |
| `repo-root` | Use the repository directory | work directly in the project dir, no worktree | no | no |
| `use-existing` | Reuse an existing workspace | reuse an existing worktree/repo workspace | no | no |
| `checkout-pr` | Checkout PR in worktree | fetch + review a PR in its own worktree, no new branch | yes | yes |
| `pr-new-branch` | Create a new branch from a PR in worktree | branch on top of the PR head for the user's own changes | yes | yes |

Options requiring a PR only show when a PR is linked; options requiring commits are disabled (with reason) when the repo has no commits yet (unborn HEAD). `use-existing` is disabled when the project has no other workspaces.

Per-preset panels:
- **New worktree** (`new-worktree-panel.tsx`): branch selector (via `ProjectBranchSelector`) to pick "from branch"; a **branch-name field** for the new branch when creating one; **branch conflict** detection — if the chosen branch is already checked out by another task/workspace, shows a warning and a "Reuse existing workspace" button that flips the preset to `use-existing` and pre-selects that workspace (a new isolated worktree cannot double-checkout a branch).
- **Existing workspace picker** (`existing-workspace-picker.tsx`): a searchable combobox of the project's other workspaces (repo root or worktrees), each row showing name, path, +/− line-change counts if dirty, and a "linked task(s)" badge/tooltip when the workspace is already associated with other tasks.
- **Checkout PR panel** (`checkout-pr-panel.tsx`): informational only — "The PR branch will be fetched and checked out in a dedicated worktree. No new branch will be created," plus a **setup-step preview** (see below).
- **PR-new-branch panel** (`pr-new-branch-panel.tsx`): a new-branch-name field, a "Push branch to remote" switch, and the setup-step preview.
- **Setup step preview** (`setup-step-preview.tsx` + `describeWorktreeGitPlan` in `apps/emdash-desktop/src/core/primitives/workspaces/api/describe-worktree-git-plan.ts`): a live, ordered list of exactly what will happen — e.g. "Fetch refs/pull/42/head from origin into pr/42/feature", "Create a worktree on the fetched branch …", "Set … to track … on …", "Record the pull request association on …", "Copy preserved project files into the worktree" (only when the project has preserve-patterns configured), "Push … to origin and set upstream tracking" — computed from the *exact* compiled plan that will be executed, so the preview cannot drift from what actually runs.

### The git "plan" compiler (branch/PR provisioning logic)
`apps/emdash-desktop/src/core/primitives/workspaces/api/compile-worktree-git-plan.ts` (`compileWorktreeGitPlan`) turns the UI's `WorkspaceConfig.git` selection into a `WorktreeGitPlan`:
- `create-branch`: new branch off `fromBranch` (local or remote-tracking), optional background publish to the push remote.
- `use-branch`: reuse an existing local branch as-is.
- `pr-branch`, three sub-cases based on PR shape:
  - **pr-new-branch** (task branch on top of PR head): fetches the PR head ref, sets `followRef`, records a PR-URL "breadcrumb" git-config value, optional push.
  - **checkout-pr, fork**: fetches the PR ref into a namespaced `pr/<number>/<headBranch>` local branch (never reuses a bare same-named branch — could silently collide with an unrelated one), sets upstream to the PR ref itself (so ahead/behind is computed against the fork, since pushing back to the fork is expected to fail).
  - **checkout-pr, same-repo**: checks out the real head branch name with upstream tracking, so commit+push flow straight back onto the PR.
- Throws (refuses) rather than guessing when a PR-sourced plan needs a base remote and the repo has no remotes, or when publish is requested but there's no configured push remote.
- `WorkspaceConfig` (`workspace-config.ts`) is a **versioned schema** (v1→v2) stored per-workspace; v1's `host`-based workspace target and the retired "BYOI" (bring-your-own-instance) `kind` no longer parse and are treated as needing migration.

### Task/workspace creation execution (node side)
`apps/emdash-desktop/src/core/features/tasks/node/operations/createTask.ts`:
- Resolves the target project's attachment (must be "live"/reachable — see Project Attachment states below); computes the effective base/push remotes for the repo once and compiles the git plan.
- **Tombstone-aware creation**: refuses to create a workspace at a path/branch that has a pending deletion still being torn down elsewhere (`findWorkspaceTombstoneConflict`) rather than silently suffixing a new path — the user must wait for the sweep or explicitly "untrack anyway."
- Compiles the physical worktree path via `compileWorktreePayload` (see below), allocates a free registry path (suffixing `-2`, `-3`… only past genuine live collisions, never past a tombstoned one).
- Inserts the `tasks` row and a `workspaces` row (as a *creation intent*) inside one DB transaction; the actual filesystem worktree creation runs **in the background** afterward (`createWorktreeThroughRegistry`) — the task appears immediately with a provisioning/pending state while the worktree is built.
- If an initial conversation is configured, also registers a host-side conversation record (host-first ordering, with compensation/rollback if the local transaction then fails).

### Worktree path derivation
`packages/core/src/runtimes/workspace-registry/api/compile-worktree-payload.ts` (`compileWorktreePayload`, `deriveWorktreePoolPath`):
- Every repo gets one **pool directory** under the configured worktree root: `<root>/<repo-basename>-<sha256(repoPath)[:8]>` — stable regardless of how the repo path is spelled.
- Each worktree lives at `<pool>/<sanitized-branch-name>`.
- Branch names are sanitized differently per OS: POSIX just strips illegal filename chars; **Windows** additionally lowercases, strips reserved device names (CON/PRN/AUX/NUL/COM1-9/LPT1-9), enforces per-segment length caps (48 for the repo segment, 64 for the branch segment) and a total generated-path budget of 220 chars, hashing+truncating anything too long — refuses outright (clear error) if even the pool path leaves no room. Implements its own inline SHA-256 (no crypto import) so it's portable to the renderer for path preview.

### Worktree creation/removal execution (git operations)
`packages/core/src/runtimes/workspace-registry/node/create-worktree.ts` (`executeCreateWorktree`) — the actual foreground pipeline: **inspect → (fetch-branch) → (resolve-base/fetch-base) → add-worktree → configure-branch → verify**.
- Idempotent/replay-safe: if the worktree already exists on the right branch, most steps are skipped (used for retrying a failed provisioning attempt).
- Refuses (fails at `inspect`) if an existing directory at the target path is checked out on the *wrong* branch.
- Fetches only the single ref needed (PR head, or a stale remote-tracking base), never `--all`/`--prune`, and never writes `FETCH_HEAD` or triggers git's background maintenance.
- Transient ref/index lock collisions from concurrent worktree adds are retried with backoff rather than serialized.
- On any failure, best-effort rolls back what this attempt created (removes the worktree/branch) — leftover debris from a failed rollback is left for a later "auto-adoption" sweep rather than hidden.
- `packages/core/src/runtimes/workspace-registry/node/delete-worktree.ts` (`executeDeleteWorktree`): force-removes the worktree with **no dirty/unpushed refusal** — informed confirmation happens client-side (the Delete Task modal shows the warnings) and the host just executes what it's told; still enforces **path-safety** (only worktrees actually owned by the parent repo can be targeted) and takes a per-worktree writer lock so a concurrent probe can't observe a half-removed tree. Distinguishes `transient` (git/filesystem, safe to retry/sweep) vs `terminal` (structural refusal, e.g. path-safety) failures.
- `packages/core/src/runtimes/workspace-registry/node/worktree-path-safety.ts` (`validateWorktreePath`) is the shared guard both create and delete call through.
- `packages/core/src/runtimes/workspace-registry/node/update-worktree.ts` exists alongside (not read in depth — likely handles moving/relocating a worktree record).

### Task lifecycle actions (once created)
Backend RPCs, `apps/emdash-desktop/src/core/features/tasks/api/wire-contract.ts`:
- `taskList` liveModel with mutations: `rename`, `setStatus` (lifecycle status), `setPinned`, `setLinkedIssue`, `convertAutomation`, `archive`, `restore`.
- `getDeletePreflight` — see below.
- `deleteTask` / `deleteTasks` (bulk) with `DeleteTaskOptions { deleteWorktree?, deleteBranch?, deleteConversations? }`.
- `teardownTask` — runs the project's teardown scripts for a task without deleting it.
- `taskStats` liveModel (aggregate counts, e.g. for badges).
- UI: `rename-task-modal.tsx`, task pin/archive/status actions surfaced through `task-context-menu.tsx` and `task-row.tsx` in the project's task list (`browser/components/task-view/{task-list,task-row,task-list-model,task-list-empty-state}.tsx`), plus a command-palette style **task palette** (`browser/palette/task-palette-{provider,row,source}.ts`).
- **Activity badge** (`browser/components/activity-badge.tsx`): shows whether a task/workspace currently has running agent activity.

### Delete Task modal — informed, preflighted deletion
Source: `apps/emdash-desktop/src/core/features/tasks/browser/delete-task-modal.tsx`; preflight computed by `apps/emdash-desktop/src/core/features/tasks/node/operations/getDeletePreflight.ts`.
- Preflight is read **entirely from the local mirror** (no host round-trip needed to *show* the dialog): for each task, whether it has its own worktree (vs. sharing one with sibling tasks — shared worktrees are never silently deleted), whether it has a deletable branch (only branches Emdash itself created via `create-branch` are offered — a branch checked out from an existing branch is left alone), whether it has uncommitted changes (+/− line counts) and how many unpushed commits it has, and whether the owning host is currently reachable.
- UI: checkboxes for "Delete worktree(s)" and "Delete branch(es)" (branch checkbox disabled unless worktree deletion is also checked), each with **inline warnings**: uncommitted-changes-will-be-lost, N-unpushed-commits, and — when the host is unreachable — an explicit notice that the worktree can't be removed now and the task record alone will be deleted (deferred cleanup). A separate always-available "Delete conversations" checkbox (unchecked by default per spec — conversation history is kept unless explicitly opted out). Supports both single and bulk (multi-task) delete with pluralized copy and per-task breakdowns.
- Deleting selected tasks in the project's task list: `apps/emdash-desktop/src/core/features/tasks/api/browser/delete-selected-tasks.ts`.

---

## Workspaces view — managing worktrees on disk

### Project → Workspaces tab
What it is: a table of every workspace (the repo root + every worktree) belonging to a project (or, from Settings, every workspace on a given machine), independent of the task list — the disk-level view of "what worktrees exist." Reused for both a single project (`project-workspaces-view.tsx`) and a machine-wide settings page.
Source: `apps/emdash-desktop/src/core/features/workspaces/contributions/browser/workspace-detail-page.tsx`.

Columns (built with the generic `CollectionView`/`CollectionViewColumn`/`CollectionViewCell` patterns): status icon, name + path (with inline chips for **path issues** and **pending-removal**), branch + git stats (ahead/behind/dirty — `GitStatsCell`), disk usage (total bytes / artifact bytes, from a background scan, `formatBytes`), linked-task count + active-task count, and a row action menu.

Row actions (`RowActionsMenu`):
- **Open in Task** — opens/creates a task against that workspace (disabled with reason via `projectWorkspaceOpenInTaskDisabledReason`, e.g. already in use).
- **Clean Artifacts** — runs the project's teardown scripts and deletes gitignored build output/dependencies/caches; if the workspace has active agent sessions, first stops them (copy differs to warn about that). Task records and the worktree itself are preserved; only derived artifacts are removed. Backend: `workspaces` wire client `.archive({ projectId, workspaceId?, workspacePath, branchName })`.
- **Delete** — deletes the workspace (and, if it's a worktree, its linked tasks with it); confirmation copy differs when the workspace has active sessions ("Active sessions will be stopped"). Optional "Delete their conversations too" checkbox (unchecked by default).
- A page-level **"Delete workspaces"** bulk action deletes every deletable row for the project/machine at once (repository roots are excluded/protected from bulk delete); reports partial-failure counts via toast.

Row/page states:
- **Removal pending / needs attention** (`RemovalPill`, `WorkspaceRemovalAttentionPanel`) — a workspace mid-deletion, possibly stuck and needing the user's attention (matches the tombstone/sweep model referenced in task creation).
- **Path issue chip** (`PathIssueChip`) — e.g. the worktree's directory moved/vanished on disk out from under the registry.
- **Script issue chips** — per-lifecycle-script (`prepare`/`setup`/`run`) failed/timed-out badges, sourced from a durable overlay lifecycle record plus live overlay notices (deduped so the same failure isn't shown twice).
- Observation freshness: **loading**, **error**, **offline/unavailable** ("Workspace data unavailable" for local; "<Machine> has not provided workspace data yet" for SSH), and **stale** ("Showing the last observed workspace data" banner) — distinct empty/error/offline state components (`workspace-states.tsx`).
- Search/filter toolbar (`CollectionToolbar.Search`) over worktree name/path/branch.

---

## Git — checkout state and mutations (per-workspace)

### The checkout store (browser)
`apps/emdash-desktop/src/core/features/source-control/browser/stores/git-checkout-store.ts` — the live, observable state of one workspace's working tree, and every mutating action available on it:

**State exposed:** `fileChanges` / `stagedFileChanges` / `unstagedFileChanges`, `totalLinesAdded` / `totalLinesDeleted`, `hasData`, `isLoading`, `error`, `branchName`, `headOid`, `headKind` (`branch` | `detached` | `unborn`), `headDisplay`, `isPublished` (has an upstream), `aheadCount` / `behindCount`, `headTrackingSnapshot`; `resync()` / `retry()` for recovering from a stale/error state.

**Actions:** `stageFiles(paths)`, `stageAllFiles()`, `unstageFiles(paths)`, `unstageAllFiles()`, `discardFiles(paths)`, `discardAllFiles()`, `commit(message, options?)`, `push()`, `publishCurrentBranch()`, `pull()`.

Underlying wire contract (`packages/core/src/runtimes/git/api/checkout/contract.ts`, exposed at the app layer via `apps/emdash-desktop/src/core/features/source-control/api/contract.ts` → `sourceControlContract.checkout`):
- `model` liveModel keyed by checkout selector, states `status` + `head`, mutations `stage`/`unstage`/`stageAll`/`unstageAll`/`revert`/`revertAll`/`commit`.
- `getChangedFiles` (against a `NormalizedDiffTarget`: working-vs-head, working-vs-index, staged-vs-head, working-vs-ref, or a merge-base range — i.e. diffing against any branch/commit/tag, not just HEAD), `getFile`, `download` (binary file download from a specific git revision), `getLog` (paged commit history with optional base/head range), `getCommit`, `getCommitFiles`, `blame`.
- `push` / `publish` / `pull` are **liveJobs** (progress-reporting, cancellable), not simple RPCs — because they can be slow network operations; progress uses `transferProgressSchema` (percent, phase, detail — the same shape used for clone).
- `push`/`pull` accept optional `credentials` (`gitOperationCredentialsSchema`) and `pushOptions` (`remote?`, `force?`).

**Status model** (`packages/core/src/runtimes/git/api/checkout/states/status.ts`): per-file `index`/`worktree` status codes (`unmodified|modified|added|deleted|renamed|copied|type-changed|untracked|ignored|unmerged`), an `isConflicted` flag per file, a repo-wide `operation` in progress (`none|merge|rebase|cherry-pick|revert|bisect`), and a summary `{staged, unstaged, conflicted, untracked}` count. A **too-many-files** state and a plain **error** state are both first-class (not folded into `ok`), so the UI can show "status unavailable" distinctly from "clean."

**HEAD model** (`states/head.ts`): three kinds — `branch` (with `upstream`, itself `none|local|remote`, and a `tracking` sub-state that is either `resolved` (ref/oid/ahead/behind) or `unresolved`), `detached` (short hash), `unborn` (a branch ref that doesn't exist yet — brand-new repo with no commits).

### Git action toasts / error surfaces
`apps/emdash-desktop/src/core/features/source-control/api/browser/git-action-handlers.ts` — thin wrappers (`runGitFetch`, `runGitPull`, `runGitPush`, `runGitPublishCurrentBranch`) that show a toast with a formatted error on failure (`formatFetchErrorDetail`/`formatPullErrorDetail`/`formatPushErrorDetail`/`formatCloneErrorDetail` in `git-error-messages.ts`).

### Git error vocabulary (typed, not stringly)
`packages/core/src/runtimes/git/api/errors.ts` — every git operation returns a discriminated error union rather than a raw string, so the UI can branch on `type`: `git_error` (raw git failure, with an optional `stale_ref_update` code and captured stderr), `resolution_failed` (couldn't resolve the checkout/repo path), `auth_required` / `auth_failed`, `network_error`, `no_remote` / `remote_not_found` / `no_upstream`, `conflict` (with the list of conflicted files), `target_exists` (clone destination not empty), `not-repository` / `inspect-failed` / `init-failed` (repo-open/init flow), `nothing_to_commit` / `empty_message` / `hook_failed` (commit), `rejected` / `hook_rejected` (push), `diverged` (pull), and download-specific `missing` / `too-large` / `lfs-pointer` (Git LFS pointer files are recognized and refused as previewable content rather than shown as garbage).

### The repository store (browser) — branches, remotes, provider identity
`apps/emdash-desktop/src/core/features/source-control/api/browser/stores/git-repository-store.ts`:
**State:** `branches` / `branchRefs` / `localBranches` / `remoteBranches`, `refsObservation` / `remotesObservation` / `providerRepositoryObservation` (each with freshness — fresh/stale/unavailable), `effectiveGitSettings` (resolved base-remote/push-remote with provenance), `repoFacts`, `baseRemote` / `pushRemote` / `remotes`, `canonicalRepositoryUrl` / `canonicalPushRepositoryUrl`, `providerRepository` (e.g. resolved GitHub owner/repo), `pullRequestRepositoryUrl` / `issueRepositoryUrl` (which may differ — a repo can be issue-tracked on one host and PR'd on another remote), `defaultBranch` / `defaultBranchRef`.
**Actions:** `fetchRemote()`, `addRemote(name, url)`, `fetchPrForReview(options)` (fetches a specific PR's ref for review even when it's not the workspace's own branch — used by the standalone PR review flow), `resync()` / `retry()`.

### Repository-level wire contract (worktrees, refs, remotes, fetch)
`packages/core/src/runtimes/git/api/repository/contract.ts`:
- `model` liveModel: states `refs` (local/remote branches, tags, remote HEADs) + `remotes`; mutation `addRemote`.
- `listWorktrees` — every git worktree of the repo (path, `isMain`, HEAD summary as `branch|detached|unborn`, `locked`/`prunable`/`prunableReason`) — this is the raw git-level list the Workspaces view's rows are built from.
- `getDefaultBranch(remote)` — resolves the remote's default branch (symbolic ref or `remote show`), nullable when unknowable.
- `fetch` (liveJob, progress-reporting) and `fetchPrForReview` (liveJob — fetches one PR's head into the repo without checking anything out, error includes a typed `not_found` case for an unknown PR number).

### Branch reference model
`packages/core/src/runtimes/git/api/repository/states/refs.ts` — branches are `local` (optionally tracking a `remote`) or `remote` (tied to a `remote`); full refs are branded strings validated against `refs/heads/…` / `refs/remotes/…` / `refs/tags/…` shapes at the type level, with helpers to get a short display name and to convert between a `GitBranch` and its lightweight `GitBranchRef` (name + type + remote) used throughout the UI.

### Branch selector components
- `apps/emdash-desktop/src/core/features/source-control/browser/components/branch-selector.tsx` (`BranchSelector`) — a searchable combobox with **Local/Remote tabs** (each showing a count badge, auto-disabled when empty), text filtering that prioritizes exact matches, a refresh button (with disabled-reason + spin state), a "stale data" notice, and — when scoped to one remote — a **remote picker footer** to switch which remote's branches are listed without leaving the popover.
- `contributions/browser/project-branch-selector.tsx` (`ProjectBranchSelector`) — wraps `BranchSelector` bound to a specific project's live branch data; used by both the New Worktree panel and the Create PR modal's base-branch picker.
- `contributions/browser/remote-selector.tsx` (`RemoteSelector`) — standalone remote picker, reused inside `BranchSelector`'s footer and the Create PR modal's target-remote picker.
- `contributions/browser/branch-display.tsx` (`BranchDisplay`) — read-only branch chip (e.g. showing the PR's head branch in the Create PR modal).

---

## Diff viewer / Changes panel

### Overall structure
A task's source-control pane (`apps/emdash-desktop/src/core/features/source-control/browser/diff-view/`) is a **sidebar of change sections** (Staged / Unstaged / Pull Request) driving a **main diff panel**, plus per-file tabs.

### Staged / Unstaged sections
`changes-panel/staged-section.tsx` / `unstaged-section.tsx` (unstaged not fully read, mirrors staged) + `git-status-section.tsx`:
- Collapsible section header (`SectionHeader`) with a live count, a "select all" checkbox reflecting partial/full/none selection state, and a **List/Tree view toggle** (`ChangesViewModeToggle`) — changed files can be shown as a flat list or as a folder tree (`ChangesListOrTree`, `changes-tree-utils.ts`, `VirtualizedChangesList` / `VirtualizedChangesTree` — both virtualized for large diffs).
- Selecting one or more files surfaces a floating **ActionCard** ("N files selected" + contextual buttons) that swaps between per-selection actions (Stage/Unstage selected) and general actions (Stage all/Unstage all) depending on whether anything is selected.
- Clicking a file opens it as a **preview** diff tab; double-clicking opens it **pinned** (not replaced by the next preview) — the classic single-click-preview/double-click-pin editor pattern.
- Diff models are **prefetched** on hover (`use-prefetch-diff-models.ts`) for snappier opening.
- Empty states differ per section ("Nothing staged" vs. presumably "No changes").
- `git-status-tooltips.ts` — presumably per-status-code tooltip copy (added/modified/deleted/renamed/etc.).

### Commit card
`changes-panel/components/commit-card.tsx` (`CommitCard`) — commit message + description textarea, and a **split button** with three actions selectable as the default: **Commit**, **Commit & Push**, **Commit & Create PR** (only offered once the repo has a PR-capable remote, a branch name, and no PR already open for it). Tracks and animates through phases (`committing → committed → pushing → pushed`, or `→ opening-pr`) with inline status rows (spinner / checkmark). An `autoStage` mode exists that stages everything before committing (used when the section is collapsed/simplified). "Commit & Create PR" commits then opens the Create PR modal pre-filled.

### Diff main panel
`diff-view/main-panel/`: `diff-view.tsx` (top-level), `diff-toolbar.tsx`, `diff-file-renderer.tsx` (renders one file — presumably Monaco-based text diff), `image-diff-view.tsx` (dedicated before/after viewer for image files), `stacked-diff-view.tsx` (multiple diffs stacked, e.g. for a multi-commit/PR view), `use-diff-facets.ts` / `stores/diff-facets.ts` (view options like whitespace/word-wrap), and a **tab system** (`diff-tab-item.tsx`, `diff-tab-provider.tsx`, `stores/diff-tab-manager.ts`, `diff-tab-resource.ts`) with preview-vs-pinned tab semantics as noted above.

### Commit history / blame
- `changes-panel/components/pr-entry/commits-list.tsx`, `use-commits.ts` (`commitRangeForPullRequest`) — commit list scoped to a PR's commit range.
- `use-check-runs.ts` — CI check runs polling/state.
- Blame is exposed at the git-wire level (`checkout.blame`) — per-line hunk author/date/summary (`blameHunkSchema`).

### Draft line comments (agent-directed notes, not GitHub review comments)
A distinct feature from PR review comments: the user can click **+** in the diff gutter (`AddCommentButton`, `comments/add-comment-button.tsx`) to leave a free-text note pinned to a specific line of a specific file/diff-target (`comments/comment-widget.tsx`, `comment-card.tsx`, `comment-input.tsx`, `use-diff-editor-comments.ts`, `monaco-comment-manager.ts` for the Monaco integration).
- Backed by `DraftCommentsStore` (`api/browser/diff-view/stores/draft-comments-store.ts`): in-memory, per-task, capped at 200 comments, keyed by a `DraftCommentTarget` (file + diff side/target) and line number.
- Each comment is editable in place (double-click or pencil icon; Cmd/Ctrl+Enter to save, Esc to cancel) and deletable.
- Purpose: `formattedForAgent` / `consumeAll()` renders all pending comments into a markdown block and clears the store — these are meant to be **fed into the agent's next prompt** as reviewer feedback ("fix what I've noted"), not posted anywhere externally. This is the mechanism for "leave inline review notes for the agent to act on."

---

## Pull Requests

### PR data model & backend contract
`apps/emdash-desktop/src/core/services/pull-requests/api/schemas.ts` / `contract.ts` — provider-neutral (`provider: string`, currently GitHub via the `github` auth integration, per `github-auth-contract.ts`):
- `PullRequest`: url, provider, repositoryUrl, base/head ref names+oids, headRepositoryUrl (handles forks), identifier, title/description, `status` (open/closed/merged), `isDraft`, additions/deletions/changedFiles/commitCount, `mergeableStatus` (MERGEABLE/CONFLICTING/UNKNOWN), `mergeStateStatus` (CLEAN/DIRTY/BEHIND/BLOCKED/HAS_HOOKS/UNSTABLE/UNKNOWN), `reviewDecision`, author, labels, assignees, embedded `checks[]`.
- `PullRequestCheck`: id, name, status, conclusion, detailsUrl, timestamps, workflow/app name+logo.
- `PullRequestComment`: `kind: 'issue'|'review'` (top-level PR conversation comment vs. inline code-review comment), body, author, `path`/`line` (for review comments), `isResolved`/`isOutdated`.
- RPCs: `listPullRequests` (filtered/sorted/paged across multiple repo URLs at once, with search), `getFilterOptions` (available authors/labels/assignees for building filter UI), `getPullRequestsForBranch` (broad cache lookup) vs. `getPullRequestsForHead` (exact head-oid identity lookup — used to associate a checkout with "the" PR), `getPullRequestByUrl` (breadcrumb validation), `registerRepository`/`unregisterRepository`/`sync`/`forceFullSync`/`syncSingle`/`syncChecks`/`cancelSync` (background PR cache sync, with a `syncState` liveModel exposing phase `idle|running|error`, kind `full|incremental|single`, progress counts), `createPullRequest`, `mergePullRequest`, `markReadyForReview`, `getPullRequestFiles`, `getPullRequestComments`.

### PR list / filtering (project-level PR view)
`apps/emdash-desktop/src/core/features/projects/browser/components/pr-view/`: `pr-view.tsx`, `pr-row.tsx`, `pr-filter-items.ts`, `pr-store-provider.tsx`, `usePrViewState.ts`, `pr-sync-status-card.tsx` (shows sync progress/errors for the background PR cache).

### PR entry (the PR shown inside a task's Changes panel)
`changes-panel/components/pr-entry/pr-entry.tsx` (`PullRequestEntry`) — shown once a task's branch has an associated PR:
- Header: status icon, title (click → open externally on GitHub), PR number badge, copy-URL button.
- `PrMergeLine` (merge/mergeability summary) and `PrCheckoutDriftLine` — detects when the local checkout has drifted from the PR's current remote head and offers a manual **"Update now"** action (`updatePrCheckout`) that refuses with a plain error message for guarded cases (dirty tree, active agent sessions, diverged history) rather than forcing.
- Tabs: **Files** (`files-list.tsx`, disabled once the PR is no longer open), **Commits** (`commits-list.tsx`), **Checks** (`checks-list.tsx`, CI status list).
- **Merge footer** (`merge-footer.tsx`, `merge-ui-state.ts`): three merge strategies — **Merge**, **Squash and merge**, **Rebase and merge** — each with normal-vs-**bypass** label/description pairs ("Bypass rules and merge" etc.) shown when required checks/reviews aren't satisfied but the user has permission to bypass (`canBypassRequirements`); a "Mark ready for review" action for draft PRs (`markReadyForReview`); loading states for merging/marking-ready.
- `use-pull-request-comments.ts` — PR conversation/review comments feed (`comments-list.tsx`).

### Create PR modal
`changes-panel/components/pr-entry/create-pr-modal.tsx`:
- Shows head branch (read-only `BranchDisplay`), a **target remote selector** when the repo has more than one plausible remote, and a **base branch selector** scoped to that remote's remote-tracking branches (auto-resolved default via `resolveInitialBaseBranch` — prefers the repo's configured default branch).
- Title (defaults to branch name) + description fields.
- **GitHub identity strip** — resolves which connected GitHub account will create the PR (project-level effective setting with override), fail-closed: the primary action is blocked while identity is unresolved or ambiguous; a `BrokenSettingNotice` explains if the resolved base-remote setting is stale/broken.
- Primary action is a **split button**: "Push & Create PR" (pushes the branch first if it's unpublished or has unpushed commits, then creates) vs. "Create PR" (skip push, open a PR from whatever's already on the remote) — collapses to a single "Create PR" button when nothing needs pushing. Also supports a "draft" variant (title text changes to "Create Draft PR" / "Push & Create Draft").
- Head format automatically becomes `owner:branch` when the PR is cross-repository (fork → upstream).
- Inline error alert on failure (`pullRequestErrorMessage`).

### PR-checkout association / drift / sync coordination
- `apps/emdash-desktop/src/core/features/source-control/browser/stores/derive-pr-association.ts` / `derive-pr-checkout-drift.ts` / `checkout-changes-state.ts` — compute "which PR (if any) does this checkout correspond to" and "has it drifted."
- `apps/emdash-desktop/src/core/features/source-control/browser/stores/task-pr-sync-coordinator.ts` — coordinates keeping a task's PR state in sync (likely debounced background refresh tied to task focus/visibility).
- `apps/emdash-desktop/src/core/features/projects/browser/components/pr-view/pr-store-provider.tsx` and `api/browser/stores/pr-store.ts` / `task-pr-association-store.ts` — the observable store layer backing all of the above.

---

## Git credentials

### The credential-helper channel (how git auth actually flows to agent processes)
`packages/core/src/primitives/git-credentials/api/`:
- `protocol.ts` — implements git's own `credential fill` wire format (newline `key=value` pairs, blank line/EOF terminated) for parsing helper requests and serializing responses.
- `env.ts` — the **session-env construction** is the actual mechanism: raw provider tokens are *never* placed in a session's environment, argv, or git config. Instead, each session gets a tiny **loopback HTTP channel** (`EMDASH_GIT_CREDENTIAL_PORT` + a random per-session `EMDASH_GIT_CREDENTIAL_NONCE`) and a `credential.https://<host>.helper` git-config entry pointing at a one-line shell function (`GIT_CREDENTIAL_HELPER_COMMAND`) that curls that loopback port with the nonce as a header whenever git asks for a credential; the desktop process answers with the *currently effective* account's token at request time (so switching the linked GitHub account takes effect on the next git call, not baked in at session start). `store`/`erase` requests are no-ops; failures print nothing so git falls through to native prompting.
- Three session modes: `effective-account` (wire the emdash helper, scoped to specific hosts), `system` (leave native credential behavior untouched), and `none` (actively **scrub** any configured credential helpers — including resetting `GIT_ASKPASS`/`SSH_ASKPASS` to empty, which git treats as "no askpass" — so an agent explicitly denied git credentials truly gets none, not a fallback to whatever's on the host).
- Also used for a single **operation-scoped** credential injection (`gitCredentialOperationEnv`) — e.g. minting short-lived clone credentials for the Add Project → Clone flow (`GitCredentialsService.mintCloneCredentials`, referenced from `create-project-from-remote.ts`) without touching any session's persistent env.
- This is a fairly deep piece of infrastructure to reproduce: any rebuild needs an equivalent "don't put real tokens where an agent subprocess's env/config can leak them" mechanism if agent processes are expected to run `git push`/`git pull` themselves.

---

## File search / watch exclusions

`packages/core/src/primitives/exclusion-policy/api/exclusion-policy.ts` (`ExclusionPolicy`) — one shared policy class producing three different outputs from the same pattern list:
- `excludes(path)` — plain boolean test (used for programmatic filtering).
- `ripgrepGlobs()` — negative glob pairs formatted for ripgrep's `--glob`.
- `watchIgnoreGlobs()` — positive glob forms for a file-watcher's ignore list.
- Two kinds of patterns: **bare segment** names (e.g. `node_modules`) matched against any path segment, expanded differently per output (ripgrep needs `!**/x` and `!**/x/**`; watcher needs all four of `x`, `x/**`, `**/x`, `**/x/**`); and **glob patterns** (containing `/` or glob metacharacters) matched via `minimatch` against the path and all its ancestor prefixes.
- Case sensitivity defaults to sensitive everywhere except Windows, overridable.
- `DEFAULT_SEARCH_EXCLUDE` is a long built-in list covering VCS dirs, build outputs (`dist`, `build`, `.next`, `.nuxt`, `target`, …), caches, and — notably — **other coding agents' own directories** (`.conductor`, `.cursor`, `.claude`, `.devin`, `.amp`, `.codex`, `.aider`, `.continue`, `.cody`, `.windsurf`) plus emdash's own (`.emdash`) and worktree pool dirs (`worktrees`, `.worktrees`, `.checkouts`, `checkouts`).
- Separate smaller defaults for file-tree display (`DEFAULT_TREE_EXCLUDE`) and the live file watcher (`DEFAULT_WATCHER_EXCLUDE`).
- `normalizeExclusionPatterns` (order-preserving, for display/storage) vs. `canonicalExclusionPatterns` (sorted, for identity/fingerprint comparison) are kept as two distinct functions on purpose.

---

## Issues & Integrations (third-party trackers, GitHub, etc.)

### The plugin architecture
Two parallel, capability-based plugin systems in `packages/plugins/src/`:
- **`integrations`** — account-level connection plugins: `id`, `name`, `description`, `websiteUrl`, an `auth` capability (one or more methods: `form` (field list, e.g. API token), `oauth` (redirect through a named provider), `oauth-device` (device-code flow with a client id + scopes — GitHub uses this alongside classic OAuth and a `cli-import` from the `gh` CLI), `cliImport` (import credentials the user already has via a local CLI tool)). `verify()` checks credentials and returns a `VerifyResult`: either `connected: true` with a stable `account` identity (id/login/avatar/host — for multi-account dedupe) and display name/detail, or `connected: false` with an optional error.
- **`issues`** — per-integration issue-tracker behavior, keyed 1:1 to an `integrationId`: `listIssues`, `searchIssues`, optional `getIssue` (single-issue detail with a `context` markdown blob meant for agent prompts). Canonical `IssueData` shape is provider-neutral (identifier, optional `displayIdentifier` override, title, url, description, branchName, status, assignees, project, updatedAt) — provider-specific fields are dropped at the plugin boundary, not leaked into the UI. `requiredInputs` declares whether a provider needs a resolved `repositoryUrl` (GitHub/GitLab/Forgejo — repo-scoped) or nothing (Linear/Jira/etc. — account-scoped).
- Shared `IntegrationError` union across both: `auth_failed`, `rate_limited` (with optional `resetAt`), `not_found_or_no_access`, `sso_required` (with an `ssoUrl` to redirect to), `host_unreachable`, `unsupported_host`, `invalid_input`, `generic`.

### Registered providers (both registries, same 12)
`github`, `linear`, `jira`, `gitlab`, `plane`, `forgejo`, `trello`, `asana`, `monday`, `notion`, `featurebase`, `plain`. (Source-control operations — clone/push/pull/PRs — are implemented separately per-host, not through this plugin system; this system is specifically issue-tracker search/list and account auth/identity.)
Source: `packages/plugins/src/issues/registry.ts`, `packages/plugins/src/integrations/registry.ts`, each provider under `impl/<name>/{index,client,mapper,types,icon,error}.ts`.
GitHub's own auth descriptor (`impl/github/index.ts`): OAuth, OAuth-device (`clientId: Ov23ligC35uHWopzCeWf`, scopes `repo read:user read:org`), and CLI-import from `gh`.

### Issue linking UI
`apps/emdash-desktop/src/core/features/tasks/browser/components/issue-selector/issue-selector.tsx` (`IssueSelector`) — a combobox used both in the Create Task modal and elsewhere to attach a `LinkedIssue` to a task:
- Provider switcher inline in the input's left-addon when more than one issue-tracking integration is connected (a `Select` of provider logos when >1, a static logo when exactly 1).
- Live search-as-you-type against the selected provider (`useIssueSearch`), with a loading spinner in the input, and empty/error states — including a specific **GitHub-account-unavailable** state (`GitHubAccountStateEmpty`, driven by `githubAccountReportingState`) distinguishing "no account resolved" from "resolved account has no access" etc.
- Each result row shows a status indicator (mapped via `toIssueStatus`), title, identifier, and — if that issue is already linked to *another* task in the project — a "linked to task: X" indicator so users don't double-start work on the same issue.
- Selected-value rendering shows title, provider logo, identifier, an "open externally" link, and a markdown-rendered description snippet.
- When no issue-tracking integration is connected at all: a stacked-avatar row of every supported provider's icon plus a "Configure integrations" link straight into Settings.
- `issue-status-indicator.tsx` — maps arbitrary provider status strings into a small fixed set of visual states.
- `pr-selector.tsx` (sibling component, not read in depth) — the equivalent picker for linking a Pull Request instead of an issue.

---

## UI patterns relied on throughout this area

Generic, reusable components from `packages/ui/src/react/patterns/` that the above features are built from — relevant to know because a rebuilt UI needs equivalents:
- **`collection-view`** (`CollectionView`, `CollectionViewColumn`, `CollectionViewCell`) — the column-based virtualizable table used for the Workspaces list; supports a `toolbar` slot and an `emptySlot`.
- **`collection-toolbar`** (`CollectionToolbar.Root`, `CollectionToolbar.Search`) — the search bar attached above a `CollectionView`.
- **`list-view`** / **`tree-view`** — the flat-list vs. folder-tree renderers behind `ChangesListOrTree` for the diff panel's changed-files sections (list/tree toggle).
- **`create-task-modal`** pattern package (distinct from the feature-level `create-task-modal.tsx` above) — likely the generic modal chrome/step scaffolding it's built on (not separately inspected in depth; the feature-level implementation is the authoritative source of behavior).
- **`entity-header`** — used for things like the Workspaces view's `RepositoryHeader`.
Not exhaustively read line-by-line; behavior above is grounded in the *consumers* of these patterns (which is what determines the actual feature set to preserve), not the pattern implementations themselves.

---

## App shell (renderer entry points)

`apps/emdash-desktop/src/renderer/app/workspace.tsx` and `welcome.tsx` are thin shells, not feature logic:
- `Workspace()` — mounts theme, keybinding dispatch, the left sidebar, and a slot-based main panel/titlebar resolved via the navigation system (`useWorkspaceSlots`/`useWorkspaceViewParams`) — i.e. **all actual view content (project view, task view, settings, etc.) is registered elsewhere as "contributions" and slotted in here**, this file itself has no project/git-specific logic.
- `WelcomeScreen({ onGetStarted })` — a first-run splash (logo, "Welcome.", a "Start shipping" button bound to the app's confirm keybinding) with no project/workspace logic; purely the pre-first-project landing screen. INFERRED: this is shown before any project exists / before the main workspace UI takes over, based on the prop name and the fact it renders as a fixed full-screen overlay.

---

## Notable cross-cutting states worth preserving in a rebuild

Collected from the above, since the task asked specifically for "states a feature can be in":
- **Project availability**: live/attached vs. unavailable (host unreachable — SSH machine offline, path relinked, etc.) — gates every mutating git/task action app-wide with a consistent disabled-reason UI (`projectAvailabilityUi`), not a per-feature ad hoc check.
- **Observation freshness** (used for branches, remotes, workspace rows, provider-repository resolution): `fresh` / `stale` (last-known-good shown with a banner) / `unavailable` (nothing to show, explained).
- **Checkout HEAD**: `branch` / `detached` / `unborn` (no commits yet) — each changes what actions are even meaningful (e.g. can't create-branch-from a nonexistent base on unborn).
- **Checkout status**: `ok` (with full per-file detail) / `too-many-files` / `error` — a status read can itself fail or be truncated, distinct from "clean."
- **Git operation errors**: a large closed per-verb union (see Git error vocabulary above) rather than free-text — needed to drive different UI (reconnect prompt vs. plain retry vs. conflict-file list).
- **PR checkout drift**: local checkout vs. current PR remote head out of sync, with a manual reconcile action that can itself refuse (dirty/active-sessions/diverged).
- **PR merge gating**: normal-merge vs. bypass-required-checks (permission-gated), draft vs. ready-for-review.
- **Task deletion preflight**: per-task dirty/unpushed/has-own-worktree/deletable-branch/host-reachable, computed before the confirm dialog even renders.
- **Workspace removal**: pending / needs-attention (stuck) / path-issue, plus per-lifecycle-script (prepare/setup/run) failed/timed-out.
- **Workspace creation tombstones**: a path/branch mid-deletion refuses new creation there until the sweep finishes or the user explicitly overrides, rather than silently placing the new one at a suffixed path.
