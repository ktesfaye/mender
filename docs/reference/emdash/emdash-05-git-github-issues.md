# Source control, pull requests and issues

Covers the Changes panel (staging, discarding, committing), the diff viewer and its line-comment
notes to the agent, branch/remote/publish/sync actions, pull request creation, status, checks,
comments and merging, GitHub account connection, and every issue-tracker/CRM integration Emdash
can link a task to. Source read from `apps/emdash-desktop/src/core/features/source-control/`,
`.../github/`, `.../issues/`, `.../integrations/`, `.../services/pull-requests/`, and the
`packages/plugins/src/{issues,integrations}/impl/*` provider definitions they drive.

## Changes panel (Staged / Changed / Pull Requests)

### Section layout
The Changes panel is a vertical stack of three collapsible, resizable sections: **Staged**,
**Changed** (unstaged), and **Pull Requests** (or **Branch Commits** when there is no PR yet).
Each header shows the section label, a count badge, and a chevron that rotates 90° when
collapsed/expanded (`ChevronDown`, `rotate-0` expanded / `-rotate-90` collapsed, 200ms
ease-in-out). A checkbox on the Staged/Changed headers selects/deselects all files in that
section, tri-state (checked = all selected, indeterminate = some selected).
- Source: `browser/diff-view/changes-panel/components/section-header.tsx`,
  `staged-section.tsx`, `unstaged-section.tsx`, `pr-section.tsx`.

### Flat/tree toggle
Each of the three sections has its own list/tree view toggle (`AlignJustify` = flat list,
`ListTree` = tree by folder). Tooltip reads "Switch to tree view" / "Switch to flat list",
appended with the section name for the aria-label, e.g. "Switch to tree view (Staged)". The
tooltip stays open through the click so the changed label is visible. Persisted per section
(`unstaged`, `staged`, `pr`) via the `changesViewMode` app setting, default `flat` for all three.
- Source: `changes-panel/components/changes-view-mode-toggle.tsx`,
  `contributions/settings.ts`.

### Changed-file row
Each row shows a file-type icon, filename, parent directory (muted, truncated), a per-line
add/remove count (`+N` in `text-foreground-diff-added`, `-N` in `text-foreground-diff-deleted`,
hidden when both are zero, numbers formatted/abbreviated via `formatDiffLineCount`), and a
status icon that swaps for a checkbox on hover/selection:
- `added` → green `SquarePlus`
- `modified` → `SquareDot` (modified color)
- `deleted` → red `SquareMinus`
- `renamed` → gray `SquareArrowRight`
- `conflicted` → `SquareX` in conflict color
Clicking a row opens the diff as a preview tab; double-click opens it pinned. Hovering
prefetches the diff model.
- Source: `changes-panel/components/changes-list-item.tsx`.

### Selecting files / action card
Selecting one or more files (via checkbox) replaces the section's default actions with a small
elevated card reading "**N file(s) selected**" (singular when N=1) or "**All files**" when
nothing is selected, with selection-scoped buttons on the right:
- Unstaged: **Discard** (destructive link-styled, `Undo2` icon, title "Discard selected files")
  and **Stage** (`Plus` icon, title "Stage selected files"); when nothing is selected:
  **Discard all** / **Stage all** (disabled if there are no changes).
- Staged: **Unstage** (title "Unstage selected files"); when nothing is selected:
  **Unstage all** (title "Unstage all files").
- Source: `components/action-card.tsx`, `unstaged-section.tsx`, `staged-section.tsx`.

### Empty states
- Nothing staged: label **"Nothing staged"**, description **"Stage files above to include them
  in a commit."**
- Nothing unstaged: label **"Working tree clean"**, description **"No uncommitted file changes."**

### Discard confirmation
Discarding selected files or "Discard all" opens a destructive confirm modal:
- Selected files — title **"Discard Files Changes"**, description **"Are you sure you want to
  discard the changes to the selected files? This can not be undone."**
- All files — title **"Discard All Changes"**, description **"Are you sure you want to discard
  all changes? This can not be undone."**
On cancel, nothing happens. On confirm, a failed discard toasts
`Failed to discard changes: <error>`.
- Source: `unstaged-section.tsx` (`handleDiscardSelection`, `handleDiscardAll`).

### Stage/unstage/discard failures
All four operations (stage, unstage, discard selection/all) toast on failure with the pattern
`Failed to <verb> changes: <formatted error>` (verb is "stage", "unstage", or "discard"); success
is silent (the list just updates).

## Commit composer

A commit card sits at the bottom of the Staged section (or the Changed section, in "auto-stage"
mode, when there's nothing already staged) — an elevated card with a **Commit message** input, a
**Description** textarea, and a split "Commit" action button.
- Source: `changes-panel/components/commit-card.tsx`.

### Commit action options
The split button offers:
1. **Commit** — commits currently staged files (or all files, auto-staging first, when reached
   from the Changed section with nothing staged).
2. **Commit & Push** — commits, waits ~1s, then pushes.
3. **Commit & Create PR** — commits, then opens the Create PR modal — only offered when a
   `repositoryUrl` is known, a branch name exists, and there is no already-open PR for the
   branch (`canCreatePr`).
The chosen action is remembered per task (`diffView.effectiveCommitAction`); if it was
"Commit & Create PR" but a PR can no longer be created, it silently falls back to "Commit & Push".
The commit message input and description are disabled while any commit action is in flight.

### Commit phases and their exact copy
State machine: `idle → committing → (commit-only-done | committed → pushing → pushed |
opening-pr) → idle`.
- `committing` → spinner + **"Committing…"**
- `commit-only-done` / `committed` → green check + **"Committed"**
- `pushing` → spinner + **"Pushing…"**
- `pushed` → green check + **"Pushed"**
- `opening-pr` → spinner + **"Opening PR…"**
After a plain commit or a commit+push, the status row shows for 3 seconds, then the phase resets
to idle and inputs clear. On commit+create-PR, it waits ~0.5s on "Opening PR…" then opens the
Create PR modal (with the branch name prefilled) and resets immediately.
- Failures at any stage toast: `Failed to commit changes: <error>` or
  `Failed to push: <formatted push error>`, and the phase resets to `idle` without clearing the
  typed message/description (so the user can retry).
- After a successful commit (not auto-staging), the Changed section auto-expands and Staged
  collapses (`setExpanded({ unstaged: true, staged: false, pullRequests: <unchanged> })`).

**No AI-generated commit message feature exists in this build** — the commit message and
description are always typed by hand (see Unverified/coverage note).

## Diff viewer

### Toolbar
A 41px toolbar above every open diff shows a source label pill (**Staged**, **Changed**, **PR**,
or **Git**, matching the diff's group) on the left. On the right: a Diff/Preview toggle (only for
text files with a preview renderer, e.g. Markdown/HTML), and — only while in Diff mode — a
Unified/Split toggle (`AlignJustify` = Unified, `Columns2` = Split), aria-labelled "Unified diff"
/ "Split diff". This is a Monaco diff editor (`StickyDiffEditor`); there is **no separate
word-diff or ignore-whitespace toggle** in this build (see Unverified/coverage note).
- Source: `browser/diff-view/main-panel/diff-toolbar.tsx`, `diff-view.tsx`.

### Renderer kinds and their states
- **Binary file** → centered text: **"Binary file — no diff available"**.
- **Image file** → side-by-side Original/Modified panels, each independently loaded:
  - `loading` → **"Loading…"**
  - `missing` → **"File added"** (original side) or **"File deleted"** (modified side)
  - `unavailable` (too-large) → **"Preview unavailable — file is too large"**
  - `unavailable` (lfs-pointer) → **"Preview unavailable — Git LFS smudge filter not applied"**
  - `unavailable` (git-error) → **"Preview unavailable"**
  - `error` → generic **"Failed to load image"**, or if the `<img>` itself fails to decode,
    **"Failed to decode image"**
  - `ready` → the image plus its file size (`formatBytes`)
  - The "modified" side retries transiently on error/`git-error` up to 3 times with 120ms/300ms/
    600ms backoff (covers a race right after a commit/checkout).
  - Source: `main-panel/image-diff-view.tsx`.
- **Text file, Preview mode** (Markdown/HTML files only, toggled from the toolbar):
  - Deleted file → **"Deleted file — no preview available"**.
  - Loading → spinner + **"Loading file..."**.
  - Load error → **"File too large to display in the editor"** or **"Could not load file"**.
  - Orphaned (deleted on disk) → **"File was deleted on disk"**.
  - Ready → renders full Markdown (with resolvable relative images) or sandboxed HTML.
  - Source: `main-panel/diff-file-renderer.tsx`.

### Diff sources (what's compared)
- **Changed** (disk): index vs. the live editable buffer.
- **Staged**: HEAD vs. index.
- **Git** (a specific commit) / **PR**: two git snapshots at explicit refs.
- Source: `browser/diff-view/stores/diff-facets.ts`.

### Diff tabs
Each open diff is its own tab; the tab label is the filename plus a group suffix shown in the
tooltip/label: **"(Working Tree)"**, **"(Index)"**, **"(PR)"**, **"(Git)"**. The tab shows the
file-type icon and (on hover-out) the git change-status icon.
- Source: `browser/diff-view/diff-tab-item.tsx`.

## Line comments ("notes for the agent")

Hovering a diff line shows a small **+** button (`AddCommentButton`) to pin a comment to that
line. This is **not** a GitHub PR review comment — it's a local, per-task scratch note that gets
folded into the agent's next prompt.
- **Add comment**: opens a 140px card titled **"Add comment (Line N)"** with a textarea
  (placeholder **"Add a note about this line..."**), Cancel (X, tooltip "Cancel (Esc)") and
  Submit (check, tooltip "Submit (Cmd/Ctrl+Enter)", disabled until non-empty). Escape cancels;
  Cmd/Ctrl+Enter submits.
- **Existing comment**: read-only textarea; double-click to edit. Actions: Edit (pencil), Delete
  (trash, destructive color). While editing: title becomes **"Edit comment"**, Cancel/Save (check)
  replace Edit/Delete; Cmd/Ctrl+Enter saves, Escape cancels back to the original text.
- Comments are capped at **200 per task** (`MAX_COMMENTS_PER_TASK`); past the cap, adding a
  comment silently no-ops (logged to console, not surfaced to the user).
- Comments target one of three identities so they stay attached across refreshes: a working-tree
  file+group, a specific PR's base/head OIDs, or a specific commit pair.
- When consumed (sent with the next message to the agent), they are serialized as XML and
  wrapped: `The user has left the following comments on the code changes:\n\n<user_comments>...`
  with one `<target kind="working-tree|pr|commit" ...>` block per file/commit/PR and one
  `<comment line="N">text</comment>` per note (XML-escaped). Consuming clears the store.
- Source: `browser/diff-view/comments/*.tsx`,
  `api/browser/diff-view/stores/draft-comments-store.ts`,
  `primitives/line-comments/api/line-comments.ts`.

## Branch / remote status and sync

### Status row
A footer row under the changes panel shows the current branch name (`GitBranch` icon, truncated)
with a tooltip: the branch name itself normally, **"Detached HEAD at <ref>"** when detached, or
**"Create an initial commit first"** when the repo has no commits yet (`unborn` HEAD).
- Source: `git-status-section.tsx`, `git-status-tooltips.ts`.

### Fetch / Pull / Push (published branch)
Once the branch is published (has an upstream) and not detached, three icon buttons appear:
- **Fetch** (`RefreshCcw`): tooltip **"Fetch changes"**, or **"Fetching..."** while running.
- **Pull** (`ArrowDown`): disabled when nothing to pull; tooltip **"Pull changes"**,
  **"Pulling..."**, or **"Nothing to pull"**.
- **Push** (`ArrowUp`): disabled when nothing to push; tooltip **"Push changes"**,
  **"Pushing..."**, or **"Nothing to push"**.
Ahead/behind counts drive the disabled state (0 ahead disables Push, 0 behind disables Pull).

### Publish (unpublished branch)
When the branch has no upstream (and isn't detached), a single **Publish** button appears
(`ArrowUp` icon). Its label and enabled state depend on state:
- No remotes exist at all → label reads **"Add Remote"** instead of "Publish"; clicking opens the
  **Add Remote** modal instead of publishing. Tooltip: **"Create or link a remote, then publish
  this branch"**.
- Publishing in progress → label **"Publishing..."**, tooltip **"Publishing..."**.
- Detached HEAD → tooltip **"Cannot publish: HEAD is detached"** (button not shown at all in this
  case — the whole publish/sync cluster is hidden).
- Unborn (no commits) or no branch name → tooltip **"Create an initial commit first"**, button
  disabled.
- Normal case → tooltip **"Publish branch"**.
- Source: `git-status-section.tsx`, `git-status-tooltips.ts` (`getPublishTooltipText`).

### Host-disabled state
Every fetch/pull/push/publish/refresh action can additionally be blocked when the project's host
is unavailable; in that case the action shows `aria-disabled` with the reason text from
`projectAvailabilityUi.getLiveActionDisabledReason`, or, if the project context itself isn't
available yet, **"Unavailable until access to this Project is restored."**

### Failure messages (exact text)
Centralized in `api/git-error-messages.ts`; toasted as `Failed to <fetch/pull/push>...: <detail>`:
- `auth_required` → **"Git is not authenticated<suffix>."** (suffix `" on the remote"` for SSH
  projects, else empty)
- `auth_failed` → **"Git authentication failed<suffix>."**
- `network_error` → **"Cannot reach the repository from the remote."** (SSH) or
  **"Cannot reach the repository."** (local)
- `remote_not_found` → **"Repository not found or inaccessible."**
- fetch `no_remote` → **"No Git remote is configured."**
- fetch generic `git_error` → **"Git fetch failed."**
- push `no_remote` → **"No Git remote is configured."**
- push `no_upstream` → **"No upstream branch is configured."**
- pull `no_upstream` → **"No upstream branch is configured."**
- pull `conflict` → **"Pull has merge conflicts."**
- pull `diverged` → **"Local and remote branches have diverged."**
- clone `target_exists` → **"Clone destination is not empty: <path>"**

### Add Remote modal
Two tabs: **Create Repository** (name, owner picker sourced from the acting GitHub account,
Private/Public radio, default Private) and **Link Existing** (a remote URL field, placeholder
`https://git.example.com/owner/repo.git`). Footer button reads **"Create & Publish"** /
**"Link & Publish"** (or **"Adding..."** while in flight). On submit it creates/links the remote,
fetches it, then publishes the current branch there. A push rejection because the remote already
has commits surfaces as: **"Remote already has commits. Linking succeeded, but integrating
histories must be resolved manually."** A GitHub account is required to *create* a repository
(fail-closed); *linking* an existing URL can proceed on system git credentials without an
account.
- Source: `apps/emdash-desktop/src/core/features/tasks/browser/add-remote-modal.tsx`.

### Branch selector
A combobox with **Local**/**Remote** tabs (each showing a count badge; a tab with 0 branches is
disabled), a search input, and a refresh button (spinning `RefreshCw` while refreshing, tooltip
falls back to a disabled-reason if given, else **"Refresh branches"**). If the branch list is
stale, a banner reads **"Showing previously observed branches"**. Empty state:
**"Branches unavailable"** (host observation gap), **"no branches exist"**, or **"no results"**
(search yields nothing). Reserved branches (`_reserve*` prefix) appear disabled in the list. When
scoped to a specific remote, a footer row lets you switch which remote's branches are listed.
- Source: `browser/components/branch-selector.tsx`.

## Pull requests

### Section header and states
Header label switches between **"Pull Requests"** and **"Branch Commits"** depending on whether
there's an associated PR yet. Actions: a split **Create PR** / **Create draft PR** button
(`Plus` icon; disabled while an open PR already exists, tooltip then reads **"A pull request is
already open"**; if there's no known repo URL, tooltip reads **"Pull requests unavailable"**), and
a **Refresh** button (`RefreshCw`, spins while refreshing, tooltip **"Refresh pull requests"**,
force-syncs from GitHub).
- If pull-request data is stale, a banner reads **"Showing previously observed pull requests"**.
- Section body empty states, in priority order:
  1. Provider repo data never observed → **"Repository details unavailable"** /
     "Provider repository data has not been observed for this Project yet."
  2. No GitHub remote → **"Pull requests unavailable"** /
     "Pull requests are currently available only for configured GitHub remotes."
  3. PR data never observed → **"Pull requests unavailable"** /
     "Pull request data has not been observed for this Project yet."
  4. No PRs and a sync error just happened → **"Could not load pull requests"** / `<error text>`.
  5. No PRs, no error → **"No pull requests"** / "Push your branch and create a PR to start a
     review."
- When there's no PR but the branch is ahead of the default branch, the section instead shows a
  **Branch Commits** list of the ahead commits (empty state **"No commits"** /
  "No commits ahead of the base branch.").
- Source: `changes-panel/pr-section.tsx`.

### Create PR modal
Title: **"Create Draft PR"** or **"Create Pull Request"**. Body: a read-only **Head Branch**
display; if the repo has multiple remotes pointing at the same host, a **Target** remote picker;
a **Base Branch** combobox (remote branches only, placeholder **"Select a base branch"**); a
**Title** input (prefilled with the branch name) and a **Description** textarea; a GitHub
identity strip (**"Creating as"**) to pick which connected account files the PR; and an error
alert titled **"Failed to create pull request"** on failure.
- If no GitHub remote is detected: **"No GitHub remote detected. Configure a GitHub remote to
  create pull requests."**
- If the resolved base-remote setting is a stale/broken setting, a `BrokenSettingNotice` explains
  the mismatch.
- Footer is a split button when the branch still needs pushing: **"Push & Create Draft"/"Push &
  Create PR"** (default) vs. **"Create Draft"/"Create PR"** ("Skip push and open a PR from the
  current remote state"); once published with nothing to push, it's a single confirm button
  labelled **"Create Draft"/"Create PR"** (or **"Creating..."**).
- Validation: requires a title, a base branch, a resolvable target repo, and a resolved GitHub
  identity (fail-closed — the primary action stays disabled while identity resolution is
  pending or ambiguous). If the base is missing at submit: **"Select a base branch before
  creating the pull request."**
- Source: `changes-panel/components/pr-entry/create-pr-modal.tsx`.

### PR entry card
Shows: status icon + title (click anywhere on the row opens the PR on github.com; hover reveals an
external-link glyph), a PR-number badge (`#123`) that fades out on hover in favor of the
external-link cue, a copy-URL button, and a merge summary line ("`<author>` `<wants to merge |
merged | was closed without merging>`" plus `head → base` branch badges). A checkout-drift line
appears when the workspace and the PR's cached head might differ (see below). Below that, a
Files / Commits / Checks tab strip (Files disabled once the PR is closed/merged).
- Status icon meanings (with tooltip): merged → `GitMerge`, merged color, "Merged". closed →
  `GitPullRequestClosed`, error color, "Closed". open+draft → `GitPullRequestDraft`, muted,
  "Draft". open → `GitPullRequestArrow`, success color, "Open".
- Source: `changes-panel/components/pr-entry/pr-entry.tsx`,
  `services/pull-requests/browser/components/pr-status-icon.tsx`,
  `.../pr-merge-line.tsx`, `.../pr-number-badge.tsx`, `.../pr-url-copy-button.tsx`.

### Checkout drift line
Compares the workspace's observed HEAD against the PR's last-synced head OID:
- unknown → nothing shown (never claims false sync).
- in-sync → **"Checkout in sync with PR head"**.
- drifted → **"Checkout differs from PR head"**, with parenthetical detail when known:
  `(PR head moved)`, `(local commits ahead)`, or both, comma-joined. A trailing note reads
  `· as of last sync <relative time>` when a sync timestamp is known. A drifted state shows an
  **"Update now"** button (**"Updating…"** while running) that fast-forwards the worktree to the
  PR head via the registry, with these possible refusals surfaced as plain error text under a
  **"Could not update the checkout"** toast:
  - `worktree-dirty` → **"The checkout has uncommitted changes — commit or stash them first."**
  - `workspace-active` → **"The workspace has active sessions — stop them before updating."**
  - `diverged` → **"The checkout has local commits the PR head lacks — resolve manually."**
  - workspace missing/not-a-worktree → **"The workspace is not an updatable worktree."**
- Source: `changes-panel/components/pr-entry/checkout-drift-line.tsx`,
  `services/pull-requests/api/checkout-drift.ts`, `api/browser/stores/pr-store.ts`.

### Files / Commits / Checks tabs
- **Files**: the PR's changed files as a flat/tree list (view mode remembered as `pr` in the
  `changesViewMode` setting), diffed base→head.
- **Commits**: a virtualized, infinite-scroll commit list (43px rows, 4px gaps, "Load more" button
  — **"Loading..."** while fetching). Each commit row shows subject, author, relative time, short
  hash, and expands (chevron) to show that commit's changed files (**"Loading files..."**,
  **"Unable to load files"**, **"No file changes"** states).
- **Checks**: two stacked lists.
  - Checks: bucketed **pass** (green check), **fail** (red X), **pending** (spinning amber
    loader), **skipping**/**cancel** (muted dash-circle). Each row shows the check name, its app
    logo if any, its workflow/app name as a subtitle, a formatted duration (`"<1m"`, `"Nm Ss"`,
    `"Nh Nm"`), and (on hover) an external-link button to the check's details page. Empty:
    **"No checks available"**.
  - Comments: PR conversation comments (issue + review comments), each with avatar (square for
    bots, round for people), author, relative time, `Resolved` marker when applicable, a
    `path:line` location for review comments, rendered Markdown body, and an external-link button
    to open on GitHub. Empty/loading/error text: **"Loading comments..."**, **"Unable to load
    comments"**, **"No comments available"**.
  - If there are no checks and no conversation items at all: **"No checks or comments"** /
    "Nothing available yet".
- Source: `changes-panel/components/pr-entry/{commits-list,checks-list,comments-list}.tsx`.

### Merge
A merge footer appears only for open PRs, showing a severity icon + status title, and either a
**Mark ready** button (for drafts, **"Marking ready..."** while pending) or a split **Merge**
button offering **Merge pull request** / **Squash and merge** / **Rebase and merge**, each with a
one-line description of what it does. Merge status → icon/severity/title/detail:
- draft → neutral `HelpCircle`, **"Draft pull request"** / "Mark ready for review to enable
  merging."
- `CLEAN` → success `CheckCircle2`, **"Ready to merge"** / "No conflicts or required reviews."
- `DIRTY` → error `XCircle`, **"Merge conflicts"** / "Resolve conflicts before merging."
- `BEHIND` → warning `AlertTriangle`, **"Branch is out-of-date"** / "Update the branch, or merge
  without waiting if your account can bypass rules." (bypass allowed)
- `BLOCKED` / `HAS_HOOKS` → error, **"Merging is blocked"** / "Required reviews, checks, or branch
  rules are not satisfied." (bypass allowed)
- `UNSTABLE` → warning, one of: **"Checks still running"** / "Waiting for GitHub checks to
  finish."; **"Checks not passing"** / "Review failing checks before merging."; **"Checks
  passing, but PR is unstable"** / "GitHub still reports the branch as unstable. Review branch
  rules before merging."; **"Checks pending or not passing"** / "Review GitHub checks before
  merging." (bypass allowed in all UNSTABLE cases)
- Unknown/non-open → neutral, **"Merge status unknown"** / "Refresh PR status and try again." (or
  "Refresh to try again.")
When the PR can't merge outright but the account can bypass branch protection, a red checkbox
appears: **"Merge without waiting for requirements to be met (bypass rules)"**. Checking it
retitles the status line to **"Bypass requirements enabled"** and relabels the merge actions to
**"Bypass rules and merge"** / **"Squash without waiting"** / **"Rebase without waiting"** with
matching bypass descriptions, and the split button shows **"Merging..."** while in flight.
- Merge failure toasts: **"Failed to merge without waiting"** (bypass) or **"Failed to merge pull
  request"**, with the server error as the toast description.
- Mark-ready failure toasts: **"Failed to mark pull request ready"** / "Refresh PR status and try
  again."
- Source: `changes-panel/components/pr-entry/{merge-footer.tsx,merge-ui-state.ts}`,
  `pr-entry.tsx`.

### PR file fetch fallback
Fetching a PR's changed files first tries a local merge-base diff; if that returns nothing (or an
implausible number of files vs. what GitHub reported), it fetches the remote and refetches the
PR ref before retrying, falling back to an empty list if a base remote can't be determined.
Files also refresh on a 60s poll (paused when hidden) and on HEAD/branch changes (debounced
500ms).
- Source: `api/browser/stores/pr-store.ts`.

### PR error vocabulary (server-reported, surfaced verbatim as toast/alert descriptions)
`invalid_repository`, `remote_not_ready`, `cross_host_pr`, `host_unreachable`,
`github_auth_required` (hint defaults to "Connect GitHub from account settings."),
`github_disabled`, `ghes_auth_required` (hint `Run: gh auth login --hostname <host>`),
`github_account_not_found` (**"Selected GitHub account is no longer connected: <id>."**),
`github_account_host_mismatch` (**"Selected GitHub account <id> is for <accountHost>, but this
repository uses <host>."**), `github_token_missing` (**"Selected GitHub account <id> is missing a
saved token."**), `github_not_found_or_no_access` (**"Repository <owner/repo> was not found or is
not accessible"**), `github_sso_required` (SAML SSO challenge, carries an `ssoUrl` when GitHub's
response includes one), `github_rate_limited` (carries a `resetAt` parsed from the
`x-ratelimit-reset` header when present), `github_forbidden`, plus generic `list_failed`,
`sync_failed`, `refresh_failed`, `create_failed`, `merge_failed`, `mark_ready_failed`,
`files_failed`, `checks_failed`, `comments_failed`.
- Source: `services/pull-requests/api/errors.ts`, `node/engine/errors.ts`,
  `node/services/github-api-auth-errors.ts`.

### PR background sync
An incremental sync of all registered repositories' PRs runs every **60 seconds**
(`incrementalIntervalMs: 60_000`, `src/main/gateway/desktop-workers.ts`). Per repository, at most
**300** PRs are actively synced (`DEFAULT_MAX_SYNC_COUNT`), and PRs untouched for **6 months** are
archived out of active sync (`DEFAULT_ARCHIVE_AGE_MONTHS`).
- Source: `services/pull-requests/node/pull-request-service.ts`.

### Linking a task to a PR at creation
The "New Task" modal's **Based on** toggle can link the initial task either to an **Issue** or to
an existing **Pull Request** (disabled if the provider has no PR support / no issue integration
respectively). Linking to an already-open, non-draft PR sets the new task's initial lifecycle
status to `review`.
- Source: `apps/emdash-desktop/src/core/features/tasks/browser/create-task-modal/
  {linked-entity-section.tsx,build-create-task-params.ts}`.

## GitHub account connection

### Connect methods (in the "Connect GitHub" dialog)
Up to three cards, each with an icon, title, description, and a loading state that swaps the
trailing arrow for a spinner:
1. **OAuth** (`Github` icon) — copy depends on current session state:
   - Not signed in at all → **"Sign in to Emdash"** / "Create or sign into your Emdash account
     with GitHub" / button **"Continue"** / loading **"Continuing..."**
   - Has an Emdash account, not signed in → **"Sign in with GitHub"** / "Sign into your Emdash
     account" / **"Sign In"** / **"Signing in..."**
   - Already signed in → **"Link GitHub account"** / "Add another GitHub account to your Emdash
     account" / **"Link"** / **"Linking..."**
   - Success toast: **"GitHub account already connected"** (`@login was already connected.`) if
     the provider account already existed, else **"Connected to GitHub"** (`Linked @login.`).
2. **Import from GitHub CLI** (`Terminal` icon) — "Use accounts already authenticated with GitHub
   CLI". Failure: **"No GitHub CLI session found. Run gh auth login first."** if the import found
   zero accounts, otherwise the raw import error. Success toast: **"GitHub CLI accounts
   imported"** with **"1 account is available in Emdash."** or **"N accounts are available in
   Emdash."**
3. **Use device flow** (`KeyRound` icon, only offered when there's no Emdash account yet) —
   "Connect GitHub on this device with a one-time code".
- Source: `github/browser/github-integration-auth.tsx`.

### Device flow modal
Title switches: **"Authorize GitHub"** → **"GitHub connected"** (success) / **"Authentication
failed"** (error).
- Waiting state: **"Enter this one-time code in GitHub to authorize Emdash."**, a large
  monospace tappable code block (click to copy; shows **"Waiting for GitHub..."** with a spinner
  before the code arrives), two numbered steps ("Paste the code in GitHub. The code has already
  been copied." / "Authorize Emdash."), a **"Waiting for authorization"** row with **"Code
  expires in M:SS"** counting down from **15:00** (900s), and a **"Having trouble?"** link that
  opens the Emdash issues page.
  - The code auto-copies to the clipboard on arrival (toast **"✓ Code copied"** / "Paste it in
    GitHub to authorize" only for manual copies, not the automatic one).
  - The browser auto-opens to the verification URL 3 seconds after the code arrives, with a
    **"Opening GitHub in Ns..."** countdown banner shown during that delay.
  - Keyboard: Cmd/Ctrl+C copies the code, Enter or Cmd/Ctrl+R opens GitHub.
  - If the 900s timer expires: **"Code expired. Please try again."**
- Success: green check, **"You're connected to GitHub"**, the connected user's avatar and
  **"@login"**; auto-closes the modal after 1s.
- Error: **"GitHub authorization failed"** with the server's message; toast **"Authentication
  Failed"**.
- Dismissing the modal before success cancels the device-flow auth on the backend and toasts
  **"GitHub connection unsuccessful"** / "Device flow was canceled".
- Footer buttons while waiting: **Cancel**, **Copy code** (→ **"Copied"** with a check for 2s),
  **Open GitHub** (disabled while the browser-open countdown is running). While
  success/error: single **Close** button.
- Source: `settings/browser/github-device-flow-modal.tsx`.

### GitHub auth error copy (node-side, surfaces via the errors above)
- github.com: **"GitHub authentication required. Connect GitHub from account settings."**
- GitHub Enterprise: **"GitHub Enterprise authentication required for <host>. Run: gh auth login
  --hostname <host>"**
- Missing token: **"Selected GitHub account <id> is missing a saved token."**
- Source: `github/node/services/github-api-auth-errors.ts`.

### Acting-account identity strip
Used in the Create PR modal and Add Remote modal to show/change which connected GitHub account
performs the action. States: a colored provenance dot (blue = explicitly set, gray = inferred,
amber = broken/stale setting, red = unresolvable) plus **"<Action label> <account>"**; a
**Change** popover listing every connected account under **"Act as"**, with either a **"Remember
for this project"** checkbox (per-action persistence) or a note **"Selections apply to this
project."** (project-wide persistence); zero-account state offers a **Connect** button with
provider-specific empty copy; unresolvable state offers **"Pick account"**.
- Source: `integrations/contributions/browser/provider-identity-strip.tsx`.

## Issue trackers and other integrations

### Connect flow (generic)
Opened from **Configure integrations** (issue picker empty state) or a project's integration
settings. Dialog title: **"Connect <Provider>"** or **"Reconnect <Provider>"** when reconnecting
an existing account. Each provider exposes one or more of:
- `oauth` / `oauth-device` / `cli-import` (GitHub only, see above).
- `form` — a small field list rendered as plain/password inputs (secret fields render as
  `type="password"`), each with a placeholder built from its label plus `" *"` when required, an
  optional account-name field (**"Account name *"**, help text "A name to distinguish this
  account, such as your team or workspace.") when the provider requires a display name, and an
  optional inline help line + external "setup guide" link.
- Submit button reads **"Connect"** (or **"Reconnect"** when reconnecting), disabled until
  required fields are filled; spinner while in flight. Success toast: **"Integration connected"**
  / "Integration set up successfully."; failure shows the server error as inline red text.
- Reconnecting with a method that can't reconnect shows: **"This connection method cannot
  reconnect a selected account."**
- Source: `integrations/browser/{integration-setup-modal.tsx,SetupFormShell.tsx}`.

### Every issue/integration provider and its connect fields (verbatim)
| Provider | Auth kind | Fields | Help text |
|---|---|---|---|
| GitHub | oauth / oauth-device / cli-import | — | (see GitHub section above) |
| Linear | form | API key (secret) | "Create a personal API key in Linear under Account > Security & Access > Personal API keys." |
| Jira | form | Site URL, Email, API token (secret) | "Create an API token from your Atlassian account security settings." |
| GitLab | form | Instance URL, Personal access token (secret) | "Create a personal access token with read_api scope in GitLab settings." |
| Monday.com | form | API token (secret) | "Generate a token from Monday.com Admin API settings." |
| Plain | form | API key (secret) | "Create an API key from Plain settings." |
| Notion | form | Integration token (secret, placeholder `ntn_…`) | "Create a Notion internal integration token or personal access token, then share each page or database you want Emdash to access with that integration." |
| Featurebase | form | API key (secret) | "Create an API key in Featurebase dashboard settings." |
| Plane | form | API base URL (defaults to Plane Cloud), Workspace slug, API key (secret) | "For Plane Cloud, use the default API base URL. For self-hosted Plane, enter your instance API base URL." |
| Trello | form | API key, API token (secret) | "Create a Power-Up at trello.com/power-ups/admin to get an API key, then generate a token from the API key page." |
| Forgejo | form | Instance URL, API token (secret) | "Create an API token in your Forgejo user settings under Applications." |
| Asana | form | Personal access token (secret) | "Open Asana and got to My Settings > Apps, click on Developer Apps and create a new Personal Access Token." [sic — verbatim typo "got to"] |
- Source: `packages/plugins/src/integrations/impl/<provider>/index.ts` (field/label copy),
  `packages/plugins/src/issues/impl/<provider>/` (issue behavior per provider: github, linear,
  jira, gitlab, monday, plain, notion, featurebase, plane, trello, forgejo, asana).

### Provider account states (shown wherever an integration's data is needed but not ready)
- `disabled` (an explicit project setting turns the provider off) → **"<Provider> is disabled for
  this project."**
- `connect` (never configured, no accounts connected) → **"Connect a <Provider> account to get
  started."** with a **"Connect <Provider>"** button.
- `unresolvable` (a previously-set account/setting no longer resolves) → **"The selected
  <Provider> account is no longer connected."**, red text, with an **"Open project settings"**
  button (when a project context is known).
- `silent` (inferred and working) → nothing shown.
- Source: `integrations/api/account-reporting.ts`,
  `integrations/contributions/browser/account-state.tsx`.

### Issue picker (linking an issue to a task)
A combobox with a provider-logo left-addon (a `<Select>` to switch providers when more than one
is connected), search input (placeholder **"Search <Provider>..."** or "Search issues..." with no
provider selected), and a loading spinner while results load. Each result row shows a status dot
(mapped from the provider's raw status string), title, an "already linked" indicator (`Link`
icon, tooltip **"Already linked to task: <task name>"**) if another task already references that
issue, and the issue's display identifier (e.g. `ENG-123`, `#42`) right-aligned. Selected-issue
display shows title, status dot, provider logo + identifier, an external-link button, and a
one-line description preview (Markdown-stripped). Placeholder when nothing selected: **"Click to
link an issue"**.
- No connected issue integrations at all → an empty-state row with stacked provider logos and a
  **"Configure integrations"** link (navigates to Settings → Integrations tab).
- Source: `tasks/browser/components/issue-selector/issue-selector.tsx`.

### What gets sent to the agent
Linking an issue at task creation folds the issue's fetched context (title/body/comments,
provider-specific) into the initial prompt as hidden context ahead of what the user typed:
`buildFinalPrompt(issueContext, userPrompt)` joins them with a blank line for legacy/PTY-style
initial prompts, or attaches it as `hiddenContext` on the first queued message for ACP/chat-style
conversations. The issue's `branchName` (when the provider supplies one, e.g. Linear/GitHub) seeds
the new task's default name/branch.
- Source: `tasks/browser/create-task-modal/{initial-conversation-text.ts,
  build-create-task-params.ts,issue-task-name.ts}`,
  `tasks/browser/issue-context/refresh-linked-issue-context.ts`.

## Unverified / unclear

- **No AI-generated commit message feature was found.** The scope brief mentions this as an
  expected capability; a repo-wide search for "generate"/"Generate" under source-control,
  github, issues, and integrations returned nothing, and `commit-card.tsx` only has free-typed
  message/description fields. Marking absent-in-this-version rather than assuming it exists
  elsewhere.
- **No word-diff or ignore-whitespace toggle was found** in the diff toolbar or in
  `contributions/settings.ts`; only Unified/Split and Diff/Preview toggles exist. The diff is a
  Monaco diff editor, which does its own internal word-level highlighting, but there's no
  user-facing setting for it.
- **No stash UI was found.** `stash`/`Stash` only appears as an unrelated substring match in
  `pr-store.ts` (in words like "dispatch") and an MCP catalog entry; there is no stash
  create/apply/list surface in source-control.
- **`checkout.blame` exists as a Wire procedure** (`node/wire-controller.ts`,
  `api/contract.ts`) but no browser component calls it — it appears to be backend-only /
  unused in the current UI, not a user-reachable feature. Listed for completeness, not as a
  confirmed feature.
- **Per-hunk stage/unstage** was in scope per the brief, but no hunk-level UI was found — staging
  actions in this codebase operate at the whole-file level only (`stageFiles`/`unstageFiles` take
  file paths, not hunks). Likely simply not implemented in this version.
- Exact keyboard shortcuts for the Changes panel itself (e.g. a global "commit" hotkey) were not
  found; the only keyboard interactions confirmed are Cmd/Ctrl+Enter (submit/save a line comment)
  and Escape (cancel), plus the device-flow modal's Cmd/Ctrl+C / Cmd/Ctrl+R / Enter.
- The exact wording GitHub's SSO-required and rate-limit toasts show to the user (beyond the raw
  `message`/`resetAt` fields) wasn't traced further into a renderer-side formatter — only the
  node-side error shape was confirmed.

## Coverage note

Read every file under `source-control/`, `github/`, `issues/`, and `integrations/` that renders
UI or produces user-visible strings, plus the closely-coupled `services/pull-requests/` (PR
engine, store, browser components) and `tasks/browser/{add-remote-modal.tsx, create-task-modal/*,
components/issue-selector/*}` since the brief explicitly asked for PR/issue linking at task
creation. Did not exhaustively read every `*.test.ts` (used them only to confirm behavior where a
component's own source was ambiguous), the full `packages/plugins/src/issues/impl/*` per-provider
query/mapper internals (read only their connect-method metadata, which is what's user-facing), or
the git-credential-server/octokit-provider internals beyond confirming they don't add their own
user-facing copy beyond what's cataloged under GitHub auth errors.
