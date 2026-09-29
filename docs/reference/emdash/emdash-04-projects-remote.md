# Projects, machines and remote development

Covers everything under `src/core/features/projects/`, `src/core/features/repository/`,
`src/core/features/machines/`, `src/core/services/ssh/`, `packages/core/src/runtimes/host-settings/`,
and the user-visible surface of `apps/workspace-server/`. Source: Emdash v1.2.6, commit `95838289f`.

## Adding a project

### Add Project modal

One modal (`Add Project`) handles all three creation modes and both locations. Reached from the
"+"/empty-state affordance that opens `addProjectModal`.

- **Name field**: bare text input at top-left, autofocused, placeholder is the name auto-derived
  from the chosen path/repo/URL ("Project name" if nothing typed yet). Typed name always wins over
  the derived one.
- **Location selector** (top-right, next to name): a dropdown with two entries:
  - `Local` — "Add a project from this computer."
  - `Remote` (a submenu) — "Add a project from a remote machine.", shows a filterable list
    (`Filter machines...`) of saved SSH machines with a live `MachineStatus` dot per row (idle /
    initializing / successful / error), and a `No machines found.` empty line. Trailing item:
    "Manage machines" (navigates to Settings → Connections and dismisses the modal). Choosing a
    machine sets strategy to `ssh`.
  - Trigger button shows "Local" (home icon) or the selected machine's name with its status dot,
    default label "Remote" until one is picked.
- **Mode cards** (three, equal width, icon + label, `SelectableCard`):
  - `Pick Directory` (folder-open icon)
  - `Create Repository` (plus icon)
  - `Clone Repository` (download icon)
- Footer: `Create` button (primary), reads `Creating...` while submitting; `Dialog` close button
  hidden while submitting (`submitState === 'creating'` blocks accidental dismiss).
- Submitting calls `startProjectCreation`; on success for an *existing* project match it just
  navigates there; otherwise it dismisses the modal immediately and navigates to the new (pending)
  project while creation continues in the background — see "Pending project" below. A thrown error
  (before the async job starts) surfaces as a toast: **"Failed to check project"** with the error
  text as description.
- After creation succeeds, if the target repo has an external project-config file recognized by
  Emdash's migration detector, a **config-import prompt** opens automatically (see below) and, if
  accepted, shows a toast `"<Provider> config imported"` with description `"<files> was imported
  successfully."`.

#### Pick Directory panel

- `Directory` field: opens either the native OS folder picker (local) or the in-app remote
  directory browser modal (SSH) — see "Directory picker" below. Native dialog title/message:
  "Select a local project" / "Select a project directory to open".
- If the chosen path fails inspection (host error): a red-bordered box — header
  "Could not inspect this directory." over the raw error message.
- If the path is a real, readable directory but **not a git repo**: a box reading "This directory
  is not a git repository." with a switch **"Initialize git repository"** and helper text "You can
  also open this folder now and initialize Git later from the changes view." Toggling the path
  resets this switch off.
- Submit is blocked while the git-repo check is pending, while there's an inspection error, or
  (if initializing git) while GitHub accounts are still loading.

#### Create Repository panel

- `Owner / Repository name` row: owner is a combobox (`Choose owner`) populated from the connected
  GitHub account's orgs/user, with a `GitHub` account picker inline at the top of its popover
  (`Choose` label) and a `Search owners...` filter; empty state `No owners found.`. Repository name
  is a plain autofocused input, placeholder "Enter a repository name".
- **Visibility** row (`SettingsRow`): "Choose visibility" / "Choose who can see and commit to this
  repository", a `Private`/`Public` select (default **Private**).
- **Directory** field: label is "Project Directory" (local) or "Remote Directory" (ssh); same
  picker as above.
- **GitHub identity strip** ("Creating as ..."): shows the resolved default GitHub account, or, if
  none:
  - `connect`: "Connect a GitHub account to continue."
  - `unavailable`: "Choose a GitHub account to continue."
  - `noMatch`: "No connected account matches this repository."
  Has a "Connect" action that opens GitHub integration setup.

#### Clone Repository panel

- `Repository URL` input, placeholder "Enter a repository URL", autofocused; repo name is
  extracted from the URL (strips trailing `.git`, takes last path segment) to seed the project name
  and directory.
- Same Directory field as above ("Project Directory" / "Remote Directory").

### Directory picker (remote / general browse)

A two-part control: a text `Input` showing the current path plus a Browse-style click target
(`DirectoryFieldPrimitive`) that is disabled when strategy is `ssh` and no machine is selected yet.

- **Local**: opens the native OS "Select a local project" dialog directly.
- **SSH**: opens `directorySelectorModal` ("Select Remote Directory", size `lg`): a full folder
  tree browser (`ProjectDirectoryPicker`) plus a manually-editable `Path` field
  (placeholder `/home/user/project`). Back/forward history buttons, a location/address bar with a
  `Go` button (invalid absolute paths show a toast "Invalid absolute path"), and inline
  folder-creation (the `+` affordance in `DirectorySelector`) — new-folder errors surface as toasts
  ("Invalid folder name", "Could not create folder", "Could not select folder").
  - While the remote home directory is still resolving, or (when opened to prefill a default
    "repositories root" directory) while that root is being ensured, shows "Preparing folder
    browser..." instead of the tree.
  - The remote file tree comes up over a live subscription; if it doesn't become ready within
    **30 seconds** the picker shows: *"The folder browser did not become ready within 30 seconds.
    The home directory may be too large to monitor."* Any other sync error surfaces verbatim.
  - Folders that contain a `.git` child are shown with a distinct "repository" icon/kind instead of
    a plain folder icon, and symlinked directories render as directories.
  - `Select` is disabled until a non-empty path is chosen.

### Pending project / creation progress

While a project is being created (any mode), the project view shows a `SteppedLoader` instead of
the normal project chrome:

- Steps by mode:
  - `pick` → **Registering project**
  - `clone` → **Cloning repository** → **Registering project**
  - `create` → **Creating repository** → **Cloning repository** → **Registering project**
- The active step can carry a progress bar: left label is a stage-specific progress message (or the
  stage name), right label is `NN%` (rounded, clamped 0–100).
- On failure: loader turns to error state, and the failure message is shown below it in red (the
  stored `creation.message`, or "Project creation failed" as a fallback). A **Dismiss** button
  removes the unregistered project and navigates home.
- While still cloning (not yet at the registering stage) a **Cancel** button is available instead
  of Dismiss.

## Project view chrome

### Project header

Icon reflects type: folder-open for local, folder-input ("into") for SSH. Title is the project's
display name (editable via the actions menu, see Rename below). If the repo has a recognized
remote, a pill button before the actions menu shows the repo (GitHub icon + `owner/repo`, or a
globe icon + bare host URL for non-GitHub remotes) and opens it in the external browser on click.
An "Open in" menu (editor/terminal/Finder-equivalent) sits next to it. The `⋯` actions menu has:

- **Rename Project** → opens `renameProjectModal` (see below).
- **Remove Project** (destructive, separated) → runs the delete-project confirmation flow.

### Rename project modal

Small dialog, title "Rename project", single field "Project name". Validation: empty name shows
"Project name cannot be empty." inline; unchanged name simply disables Save. Submitting shows
"Renaming..." on the button; a thrown error is shown inline in red under the field (verbatim
message, or "Failed to rename project" as fallback). Enter key submits.

### Delete/remove project confirmation

Confirm dialog, title "Delete project". Description text depends on whether the project has
attached automations:
- No automations: `"<name>" will be deleted. The project folder and worktrees will stay on the
  filesystem.`
- With automations: same first line, plus "This automation will be detached..." / "These
  automations will be detached from the project and will not run until attached to another
  project:" followed by a scrollable list of the automation names.
Confirm label: **Delete**. Deleting does not touch the filesystem — only Emdash's registration of
the project (and running worktrees continue to exist on disk).

### Project sections (tabs)

Pill-tab bar under the header: **Tasks**, **Pull Requests**, **Workspaces**, **Settings**.
(Task creation empty-state, PR view and Tasks view are catalogued by the tasks/PR sweep; only the
Workspaces and Settings tabs are in this document's scope.)

#### Empty task list actions (create-task entry points, in scope as project-level affordances)

Shown when a project has no tasks yet — three rows, arrow-key navigable, Enter activates the
highlighted one:
- **Create a Task from a Branch** — "Create a task from an existing branch"
- **Create from Issue** — "Link and create a task from an issue", or if no issue integration is
  connected: "Configure issue integrations" (label swaps to navigating to Settings → Integrations)
- **Create from Pull Request** — "Create a task from a pull request"; disabled with reason
  "No remote repository connected" if the repo has no PR-capable remote.
Each row can also be disabled by the project's own live-availability gate; the disabled reason is
then shown as the row's description and read out via `aria-label`.

## Project settings (Settings tab)

The tab is a single scrolling form with a sticky footer (`Save settings` / `Reset changes` /
`Share with team`). It composes two form sections over one underlying settings domain model.

### Loading / error states

- While settings are loading: a centered spinner.
- If the initial page load fails: **"Could not load project settings"** plus the raw error message
  and a **Retry** button (reads "Retrying…" while a retry is in flight).
- While the project's host (local runtime or SSH machine) is reachable but its settings snapshot is
  "stale" (cached, not confirmed fresh): a small status line above the form — "Repository-backed
  settings may be out of date while the local runtime is unavailable." (local) or "...while this
  Project's Machine is unavailable." (SSH).
- While the host is fully "unavailable": the whole Base-settings section collapses to a note
  ("Worktree placement is unavailable until the local runtime is ready." / "...until this Project's
  Machine is ready.") and the entire Shareable-settings section is replaced by one line:
  "Repository-backed settings are unavailable until the local runtime is ready." / "...until this
  Project's Machine is ready."
- Whenever any host/live action is disabled for another reason (project attachment not live), a
  status line appears: "Worktree placement is `{reason, lowercased}`." / "Repository-backed
  settings are `{reason}`." and the corresponding fields are wrapped in a disabled `<fieldset>`.

### Base settings section

- **Accounts** (only shown if at least one integration has connectable accounts): one row per
  integration (e.g. GitHub) with a provenance badge (Set / Inferred·"Inherited" / Broken /
  Unavailable) and account picker. Loading/error states in the select trigger: "Loading accounts…",
  "Unable to load accounts", "Unavailable {name} account", "No {name} account". Below an
  unresolvable row: "The {integration} account set for this project is no longer connected or does
  not match this repository's host. {integration} stays paused until you pick an account or reset."
  Options list: each connected account, "No {name} account", separator, "Connect another
  account…" (opens integration setup).
- **Worktree root** — "Where task worktrees are created." Provenance badge flavor **Inherited**
  (label "Inherited" not "Inferred"). Text input, placeholder is the effective/inherited value;
  local projects get a **Browse** button (native "Select worktree root" / "Choose the directory
  where worktrees should be created." dialog). Below the field, when resolvable: "Worktrees for
  this repository go in `<derived pool path>`". A `Reset to inherited` button appears once the field
  has an explicit override.
  - Precedence: stored project override > host default (`shellSetup`/`worktreeRoot`/`tmux` chain)
    > built-in `<host-home>/emdash/worktrees`.
- **Default branch** — "The branch new tasks are created from by default." A branch-ref selector;
  Reset-to-inferred button when explicit. Precedence: valid stored branch > remote HEAD > a
  well-known remote branch > a well-known local branch > unavailable.
- **Base remote** — "Used for fetching remote branches, choosing task base branches and targeting
  pull requests." Remote-name selector. Precedence: valid stored remote > `origin` > sole remote >
  first remote alphabetically > unavailable.
- **Push remote** — "Used when publishing task branches and pushing commits." Precedence: valid
  stored remote > effective base remote > unavailable.
- Provenance badges for all of the above: **Set** (blue/info), **Inferred/Inherited** (neutral
  outline), **Broken** (warning) with an inline warning banner reading `Set to '<stale value>' —
  not found, and no fallback could be inferred.` or `...— not found, using '<effective value>'.`,
  and **Unavailable** (error) when nothing can be resolved. An inferred value also prints a small
  "from ___" source line, e.g. "from remote HEAD", "from the origin remote", "from the only
  remote", "from the first remote", "from the default account", "from the only matching account",
  "no account matches this repository", "from the host default", "from the built-in default".
- **Agent git credentials** — select of **Effective account** (default) / **System** / **None**,
  described as: "Which git credentials agent and terminal sessions use in this project. Effective
  account wires the account above, system keeps your machine's credentials, none disables
  credential helpers in sessions."
- **Enable tmux** — switch, described "Run the agent session inside a tmux session." (or, if the
  inherited value can't be resolved yet: "The inherited tmux value is unavailable. Choose a value
  to set a Project override.") Unsupported on local Windows sessions: switch forced off, disabled,
  text: "tmux is unavailable for local Windows sessions. Your stored preference is preserved."
  Precedence: stored project override > host default > app default (`project.tmuxByDefault`).

### Shareable (team-syncable) settings section

Every field here can live in host-local **personal** config or in a committed **`.emdash.json`**
team file; fields show a "Personal" badge (tooltip: "Personal — stored on this machine, not shared
with your team and not synced to other machines.") plus a restore-to-team-settings icon button when
a personal value is set, and an "Overriding" badge (tooltip: "This overrides team settings in
`<N>` working director{y,ies}.") when the value diverges from what other working copies of the same
`.emdash.json` resolve to.

- **Environment variables** — key/value list editor. Description: "Host-local variables added to
  new terminals, lifecycle scripts, and agent processes for this Project. Values remain on this
  Machine, are not written to .emdash.json, and are passed literally—use absolute paths for config
  directories."
- **Preserve patterns** — multiline textarea (5 rows), placeholder `.env\n.env.local`. Description:
  "Gitignored and untracked files matching these glob patterns are copied from the main repo into
  each worktree. One pattern per line."
- **Lifecycle scripts** (Prepare / Setup / Run / Teardown), each a 3-row textarea:
  - Prepare — placeholder `python -m venv .venv\nmise install`, description: "Commands run after
    workspace creation. Task sessions start after these commands exit."
  - Setup — placeholder `npm install\ncp .env.example .env`
  - Run — placeholder `npm run dev`
  - Teardown — placeholder `docker compose down`
  - Shared blurb above them all: "Shell commands run at each stage of the worktree lifecycle.
    Prepare blocks task startup; Setup and Run start after the workspace is ready. When both are
    set to auto-run, Run waits for Setup to complete." plus a "docs ↗" link to
    `https://www.emdash.sh/docs/project-config`.
  - Setup and Run each get an **"Auto-run on task creation"** toggle above their textarea, with its
    own Reset button once overridden. Precedence for `autoRunSetup`: host-local personal > built-in
    `true`. For `autoRunRun`: host-local personal > built-in `false`.
- **Detected external project config** notice (only if Emdash finds a recognized other tool's
  config, e.g. Conductor): "Detected external project config. **Import into Emdash**" link opens
  the import modal.

### Import external project config modal

Title "Import project config". If exactly one migration candidate: "Found configuration file from
`<Provider>` that can be imported into Emdash." If several: "Found configuration files that can be
imported into Emdash." plus a select to choose among them (`<label> (<files>)`). Lists the settings
fields that will be imported. Destination radio: **Personal settings** ("stored only on this
machine") or **`.emdash.json`** ("commit to share with team"). Footer button cycles
Import → "Importing..." → "Imported" (check icon); errors show inline in red, defaulting to
"Failed to import project config." if unstructured.

### Share settings with team modal

Title "Share settings with your team". Blurb: "This copies the selected personal settings from
this machine to .emdash.json in the chosen working directory. Commit that file so teammates get the
same project defaults after pulling." Fields: **Write to** (a searchable combobox of working
copies — project repo root, individual tasks, workspaces — "Search working copies..."), **Settings
to share** (checkbox grid of the shareable fields, pre-checked to whichever fields currently hold
personal values). Footer button cycles Write → "Writing..." → "Wrote .emdash.json" (check icon);
errors default to "Failed to write config."

### Settings footer

Sticky bar: **Share with team** button (hidden entirely if there's nothing shareable and no
disabled reason; tooltip either explains the disabled reason or repeats the "commit .emdash.json"
blurb), a **Reset changes** icon button (disabled unless the form is dirty), and **Save settings**
(disabled unless dirty; cycles "Saving…" → "Saved" with a check icon that reverts once the form is
dirtied again).

## Relink project modal

Used for SSH projects that lost their host binding. Title "Relink Project", description "Choose
the Machine that hosts this Project's repository." A machine combobox (placeholder "Select a
Machine…", search placeholder "Search Machines…"); if there are no saved machines at all: "Add a
Machine before relinking this Project." (plain status text, no combobox). Confirm button label
"Relink" / "Relinking…"; failure toasts "Failed to relink Project" with the raw message.

## Project availability banner

A persistent status strip shown whenever a project is not in the fully-ready state (either as an
inline banner above the content, or — inside the bottom workbench bar — a compact one-line variant
with the detail text screen-reader-only and exposed via `title` on hover). Icon: spinning loader
while a recovery/connect is in progress, cloud-off icon otherwise. Severity colouring: warning tone
for "offline"/recovering states, plain neutral background for informational "connecting/preparing"
states. Exact copy by situation (local vs. SSH shown as `{X}` = "local runtime" / "`<Machine
name>`"):

| Situation | Title | Detail |
|---|---|---|
| Reconnecting (SSH, automatic recovery, mid-attempt) | "Reconnecting to `<Machine>`" | "Your work stays open. Live features resume when the connection returns." — actions: **Retry now**, **Open Machines** |
| connecting | "Preparing local runtime" / "Connecting to `<Machine>`" | "...local services start." / "...SSH connection is established." |
| checking | "Checking connection" | "The Project stays open while the current connection is validated." |
| provisioning / handshaking | "Preparing local runtime" / "Preparing `<Machine>`" | "...local services start." / "Preparing workspace access. Your work stays open." |
| attaching | "Opening Project locally" / "Opening Project on `<Machine>`" | "The local runtime is ready..." / "The Machine is ready. Live Project features will be available shortly." |
| offline / suspended | "Local runtime is unavailable" / "`<Machine>` is offline" | "Project data remains available. Live features will resume when access returns." — action: **Retry** (local) or **Connect** (SSH) |
| recovering (no issue) | "Recovering local runtime" / "Reconnecting to `<Machine>`" | "Automatic recovery is in progress. Project data remains available." |
| generic attention (no issue) | "Local runtime needs attention" / "`<Machine>` needs attention" | "Project data remains available. Correct the problem, then retry." |

When there **is** a specific attachment issue, the title/detail come from a semantic table
(`offline`, `connection-failed`, `daemon-start-failed`, `artifact-download-failed`,
`install-failed`, `unsupported-platform`, `protocol-upgrade-client`, `protocol-upgrade-server`,
`runtime-unavailable`, `not-configured`, `host-identity-lost`, `repository-missing`,
`repository-unavailable`, `unexpected`), each with its own title/detail and corrective actions
(**Retry**/**Retry now**, **Open Diagnostics**/**Open Machines**, **Update Emdash**, **Configure
Runtime**/**Configure Machine**, **Relink Project**, **Remove Project**). Selected verbatim
strings:
- `unsupported-platform`: "This platform is not supported" / "`<Machine>` is not supported" —
  "Review system details before moving this Project to a supported computer." / "...Machine
  details...supported Machine."
- `protocol-upgrade-client`: "Update Emdash to use this Project" — "Install the latest Emdash
  version to restore Project access."
- `protocol-upgrade-server`: "Update the local runtime" / "Update `<Machine>`'s workspace server" —
  "Update the workspace server, then retry Project access."
- `host-identity-lost`: "This Project lost its local runtime link" / "This Project is no longer
  linked to a Machine" — "Relink this Project to a local runtime or remove it from Emdash." /
  "...to a Machine or remove it from Emdash." Corrective actions: **Relink Project**, **Remove
  Project**.
- `repository-missing`: "Repository is missing" — "Restore the repository or relink the Project,
  then retry."
- If automatic recovery is still cycling: detail becomes "Automatic recovery will continue. Project
  data remains available." If automatic recovery exhausted (six attempts) and fell back to manual:
  "Automatic recovery stopped after six attempts. Retry when access is available."
- An "Error details" popover (only shown if there's a raw message) reveals the redacted raw error
  text in a scrollable `<pre>` block.
- Live actions elsewhere in the app are disabled with the reason string: "Live actions are
  unavailable while this Project is unavailable on this device." (local) or "Live actions are
  unavailable while `<Machine>` is offline." (offline SSH) or "Live actions are unavailable.
  `<banner title>`." otherwise.

## Machines (SSH connections)

### Machines settings page (list)

Title "Machines", description "Manage reusable machines for remote projects." Search box
("Search machines…"), grouped list (recently-used group vs. the rest; "recently used" = connected,
connecting, or reconnecting). Each row: status icon (idle/initializing/successful/error), name,
endpoint (`user@host[:port]`, port omitted if 22), and a status word on the right: **Connected**,
**Connecting…**, **Connection issue**, **Not connected**. Empty state: "No machines" / "Add a
machine to create and manage remote projects." (or, when a search matches nothing: "No machines
match your search" / "Try a different name, host, or username."). **Add machine** primary button.

### Add/Edit SSH Connection modal

Title "Add SSH Connection" or "Edit SSH Connection"; a back-arrow replaces the close button when
opened from a flow that should return (e.g. from the Add Project modal), plain close button
otherwise.

- **Connection name** field (bare, autofocus), placeholder falls back to the host/alias if left
  blank; a duplicate-name error shows inline: **"An SSH connection with this name already exists.
  Choose a different name."**
- Source toggle: **SSH config** vs **Manual**.
  - *SSH config* mode: a host combobox seeded from `~/.ssh/config` entries (autocomplete on alias,
    shows resolved `user@hostname` under each suggestion); empty-list copy: "No saved hosts match.
    You can still resolve this hostname." Field description: "Choose a host from your SSH config,
    or enter a hostname. OpenSSH will resolve its connection settings." Resolving a target shows
    "Resolving connection settings…" (spinner) or, on failure, the raw resolver error. Once
    resolved, a read-only details panel shows Host / Port (default 22) / Username ("Not
    specified" if blank) / Jump host / Proxy command (click-to-copy, with a "Copied"/error live
    region) / Forward SSH agent ("On"/"Off"). If SSH-config suggestions themselves fail to load:
    "SSH config suggestions could not be loaded. You can still enter a hostname."
  - *Manual* mode: Host (placeholder `203.0.113.10`) + Port; Username (placeholder `ubuntu`); an
    "Advanced settings" disclosure reveals Jump host (info tooltip: "Optional bastion host to
    connect through, for example user@bastion:2222.") and a Forward SSH agent switch (info
    tooltip: "Forward your local SSH agent to the remote server. Enable only for trusted hosts.").
- **Authentication** select: **SSH Key** / **Agent** / **Password**.
  - Key: Private key path (placeholder `~/.ssh/id_ed25519`; when an SSH-config identity file is
    inherited, shows "Custom key" or "Enter a private key path" plus a "Reset to SSH config"
    button) and optional Passphrase (placeholder "Leave blank to reuse if verified" when a stored
    passphrase can be reused, else "Optional").
  - Password: placeholder "Leave blank to keep existing" when editing a saved connection whose
    password can be reused.
  - Agent: static line "Uses keys available in your SSH agent."
- **Validation** (zod, on submit): required host / port range 1–65535 / no leading-trailing
  whitespace on name, host, username, private-key path, SSH-config alias, or ProxyJump / invalid
  SSH-config alias pattern / invalid hostname pattern for manual host / username required unless
  using an SSH-config alias / password required unless one can be reused / private-key path
  required for key auth without an SSH-config alias.
- **Test Connection** button (only once the source resolves): "Testing…" while running; result
  line shows a spinner, then either a green check + "Connected (`<latency>`ms)" or a red X + the
  failure message (or "Connection failed" if none given), with a "Logs" toggle that reveals raw
  debug log lines when the backend returned any.
- **Submit button** label cascades: "Resolving…" while the SSH-config target is resolving → "Retry"
  if resolution failed → "Resolve" if not yet attempted → once resolved: "Save" (editing) or "Add
  host" (new) → "Saving…" while the save request is in flight.
- Save-level errors: "Could not save connection: `<message>`" (duplicate-name collisions get the
  same friendly text as above; IPC method-name noise is stripped from other messages).

### Machine details page

Header: connection-state icon, editable title (click name via the `⋯` menu's **Rename**; Enter
commits, Escape reverts), `⋯` menu with **Rename** and **Delete** (label flips to "Deleting…"
while in flight).

- **Delete** flow: first checks whether any projects still use this connection. If so: a blocking
  dialog "Cannot delete SSH connection" — "This SSH connection is still used by at least one
  project. Change those projects to another connection before deleting it." (Close only, no
  delete). If unused: confirm dialog "Delete SSH connection" — `This will remove "<name>" and its
  saved credentials from this device.`, destructive **Delete**. A failed delete toasts "Failed to
  delete SSH connection" with the error.
- Section tabs: **System**, **Workspaces**, **Conversations**, **Agents**, **MCP**, **Skills**.
  - System tab always shows: connection row (name + status pill + `host · username · auth label`,
    with **Connect**/**Retry** and **Disconnect** buttons as applicable, plus an edit-settings
    gear), the Workspace Runtime row (see badges below), and a Resource Utilization row (CPU /
    Memory / Disk cards — "—" and "Unavailable" placeholders when no metrics yet). If the
    workspace server isn't "usable" yet, Host Settings and System Dependencies cards are replaced
    by: "Host settings and system dependency detection are available when the workspace server is
    healthy."
  - Workspaces / Agents / MCP / Skills tabs show the equivalent unavailable notices ("Agent
    detection is available when the workspace server is healthy.", "MCP servers are available
    when the workspace server is healthy.", "Skills are available when the workspace server is
    healthy.") until the server is usable.
  - Conversations tab always works (reads the local cached registry regardless of host
    reachability) — see below.

### Connection status badges

- **MachineBadge** (SSH transport state): Connected (green dot), Connecting/Reconnecting (blue
  dot, pulsing), Error (red dot), Disconnected (neutral, no pulse).
- **WorkspaceServerBadge** (runtime status): Not found / Stopped / Booting (pulsing) / Shutting
  Down (pulsing) / Healthy / Error, green for healthy, blue+pulsing for booting/shutting-down, red
  for failed, neutral otherwise. If status is "healthy" but an error is still attached, the label
  becomes "Running" instead of "Healthy". A second pill can appear alongside for specific error
  codes: `protocol-upgrade-client` → "App update required", `protocol-upgrade-server` →
  "Incompatible runtime", anything else → "Error" (tooltip shows the raw message).
- Auth-type label text: "Password", "SSH key `<path>`" (or bare "SSH key" if no path stored), "SSH
  agent".

### Workspace runtime row (per-machine and System settings page)

Label "Workspace Runtime" with a status pill next to it:
- While reconnecting/still-preparing: **Reconnecting**.
- If nominally "healthy" but availability hasn't confirmed readiness yet: **Checking** (during
  "preparing") or **Unverified** otherwise.
- Else the `WorkspaceServerBadge` described above.
Description text: "Connect to this machine to inspect its workspace runtime." (not connected);
"Checking workspace runtime…" (spinner, loading); once loaded: "Runtime v`<version>`" · "Started
`<localized timestamp>`" · optional detail string, plus any error message in red. When
"reconnecting", the description is instead: "Restoring workspace access. Last observed runtime
details remain available."

Action button/split-button by status:
- `not-installed` → **Install** (download icon)
- `stopped` → **Start** (play icon)
- `healthy` / `failed` / `booting` / `shutting-down` → split button **Restart** (default) /
  **Shutdown**, both disabled while transitioning (booting/shutting-down).

An `UpdateCard` (app name "workspace server") appears once a version is known, offering an update
when `state.updateAvailable` is true and the error isn't a protocol-upgrade-client mismatch;
otherwise reports up to date. "Check for updates" re-triggers `refresh`.

### Host Settings card (per-machine and local System settings page)

Title "Host defaults". Description: "Machine-level defaults applied to workspaces on this host.
Stored in the host's emdash data directory; edits made to the file directly show up here live." If
the on-disk file fails to parse: "The host settings file could not be parsed; defaults are in
effect until it is fixed." (red).

- **Shell setup** — textarea (placeholder `nvm use\nsource .envrc`), commits on blur. "Shell
  commands prepended to every lifecycle script and terminal session on this host (nvm, mise, …). A
  workspace's .emdash.json shellSetup overrides this."
- **Worktree root** — text input (placeholder `~/emdash/worktrees`), commits on blur/Enter.
  "Default directory new worktrees are created under on this host. Project settings can override it
  per project."
- **Enable tmux by default** — switch. "Default tmux preference for sessions on this host. Project
  settings can override it per project." Disabled + "tmux is unavailable for Windows sessions. Your
  stored preference is preserved." on Windows hosts (unless it's a remote/non-Windows machine).
- **Sync local settings** (remote machines only) — switch. "Mirror this machine's local settings to
  this host (currently watcher exclusions). While on, the host's values follow this machine's; the
  last synced values remain when turned off."
- **Watcher exclusions** — multiline, one glob per line, placeholder "One pattern per line
  (defaults apply when empty)". Description toggles between "Synced from this machine's local
  settings. Changes apply the next time the workspace server restarts." (when sync is on, read-only)
  and the full explanation: "Folders the file watcher skips on this host for the editor, Git status,
  and workspace tracking, one pattern per line. Leave empty to use the default exclusions; watching
  dependency or build folders can use tens of thousands of native watches. Changes apply the next
  time the workspace server restarts."
- Any save failure toasts: "Failed to save host settings" (or "Failed to update sync setting" for
  the sync toggle) with the underlying message.
- Precedence, per the settings-ownership doc: `shellSetup`/`worktreeRoot`/`watcherExclude` are
  team `.emdash.json` or host-JSON (whichever the surface is editing) over unset/defaults;
  `tmux` is stored project override > host default > app default.

### System dependencies card (per-machine and local System settings page)

Title "System dependencies", description "Host tools used by Emdash and coding-agent workflows.".
An **Install all** button (spinner while running) is enabled only when at least one installable
dependency is missing. Two sub-lists: **Required** and **Recommended** (each shows "No
required/recommended dependencies." if empty while loaded). Per-dependency row: name, a green
check if available, an **Install** button (spinner while installing) if an install method exists,
or "Not found" text if not installable from here. Failed installs show a `SudoRetryPanel` (retry
with elevation, dismiss). Loading: "Checking system dependencies...". Load failure: "Failed to
load system dependencies: `<message>`".

### Resource Utilization row

Three cards — CPU / Memory / Disk — each showing a rounded percentage ("—" if no sample yet) and a
secondary line (byte counts for memory/disk, "Unavailable" if no sample).

### Workspaces tab (per machine, and the standalone "Local Workspaces" settings page)

One row per project on that host: icon (workspace-kind + status), name/path, worktree count +
linked-task count, last-activity relative time ("Never" if none) + active-task count. Toolbar:
search ("Search workspaces…") and an **Add Project** button (pre-filled to clone onto this machine,
or pick locally). Empty states: "No workspaces match your search." / "No workspaces found."; load
error: "Could not load workspaces." + message. If the machine scope isn't yet enabled (server not
usable): "Workspaces load when the machine reconnects and its workspace server is healthy."
The Local Workspaces settings page description: "Review local project workspaces and remove stale
task worktrees."

### Conversations tab (per machine, and the standalone "Conversations" settings page)

Lists every cached ACP/TUI conversation record for the host — including ones no longer linked to a
task — sourced from this device's local registry cache, so it keeps working even when the host is
offline (a banner reads "Offline — showing cached records" with a wifi-off icon in that case).
Columns: icon, title ("Untitled" if blank) + `provider · workspace path` (or "-"), status pill(s),
and a per-row actions menu.

- Status pills: **Not linked** (warning, no task association) or, if linked, a pill with the task
  name/id and a link icon; **Missing on host** (destructive) if the workspace no longer exists on
  the host; **Workspace removed** (warning) if the workspace path is now unknown but not flagged
  missing; **Removal pending…** (pulsing warning) while a delete is being applied to an
  unreachable host.
- Row actions: **Link to a task…** / **Link to another task…** (opens Link Conversation modal),
  and destructive **Delete…**.
- Delete confirm: "Delete conversation?" — `This permanently deletes "<title>" from its machine. If
  the machine is offline, the deletion runs when it reconnects.` Confirm label **Delete**.
- Errors: "Could not link conversation" / "Could not delete conversation" toasts with the message.
- Toolbar: search ("Search conversations, tasks, workspaces…"), a live count ("`<n>` conversation" /
  "conversations"). Empty: "No conversations match the current search." / "No conversations on this
  machine."; load error: "Could not load conversations." + message.
- Standalone Conversations settings page description: "Every conversation record on this machine,
  including ones no longer linked to a task."

### Link Conversation modal

Title "Link conversation to a task". Body: `Choose the task that "<title>" should appear under.
Linking only annotates this device's registry; the conversation itself stays on its machine.`
Two comboboxes — Project ("Loading projects…" / "Select a project…") then Task ("Select a project
first" until one is chosen, "Loading tasks…", "Select a task…"). **Link** disabled until both are
picked.

### System settings page (local machine)

Title "System", description "Monitor local host resources and required system dependencies."
Composes Resource Utilization, Host Settings, and System Dependencies for the local machine (no
machine id).

## SSH connection lifecycle (backend behaviour visible through the UI above)

- States: `disconnected` (default) → `connecting` → `connected`; `reconnecting` on a dropped
  physical link that's being re-established; `error` on failure.
- A physical connection attempt has a default **20-second** ready-timeout
  (`SshTimeoutError: "SSH connection timed out"`) unless the resolved SSH config specifies its own
  `ConnectTimeout`.
- Error classification (surfaces through Machine test/connect failures): message containing
  "host key"/"host fingerprint" → host-key mismatch; "authentication"/"auth"/"permission denied" →
  auth failure; "timeout"/"timed out" → timeout; anything else → generic transport error.
- Auth-specific failures (surfaced in the Test Connection result and save errors):
  - Password auth with nothing to send: `No password found for SSH connection '<name>'`.
  - Agent auth: `SSH agent is disabled by SSH config for connection '<name>'`,
    `SSH agent socket not found for connection '<name>'`, or, when `IdentitiesOnly` is set but no
    matching public keys could be loaded: `IdentitiesOnly is enabled, but no IdentityFile public
    keys could be loaded for SSH connection '<name>'`.
- `deriveConnectionMachineStatusKind`: maps `error`→error, `connecting`/`reconnecting`→initializing,
  `connected`→successful, else idle — this is the icon/dot state shown throughout the Machines UI.

## Repository provider resolution (backend, feeds PR/issue badges)

`ProviderRepositoryService` resolves a project's GitHub identity from its base remote for PR/issue
capability badges elsewhere in the app: `project-missing`, `no_remote`, `invalid_remote`,
`unsupported_provider` (non-GitHub host), `host_unreachable`, `host_error`. Not directly rendered
as its own screen — feeds the repository-link pill in the Project Header and PR/issue tab gating.

## Remote development — workspace server distribution

The workspace server is the daemon Emdash installs on a remote machine (over the SSH connection)
to run file, git, terminal, and agent services there; its user-facing surface in the desktop app is
entirely the Workspace Runtime row / badges documented above (Install / Start / Restart / Shutdown,
health states, update prompts). Behind that:

- Distributed as a self-contained per-OS/arch archive (`linux-x64`, `linux-arm64`, `darwin-arm64`)
  bundling its own Node runtime and native modules (`node-pty`, `better-sqlite3`,
  `@parcel/watcher`) plus a pinned `ripgrep` build — a target machine needs no Node/npm/pnpm
  installed.
  - `install.sh` requires an explicit `--version`; there is no "latest" or channel selection at
    install time — the desktop app resolves the version to install from its own release channel
    metadata pointer.
- Two release channels, **stable** and **canary**; canary versions are the stable package version
  with the patch bumped and the CI run number appended (e.g. `0.1.1-canary.42`). Channel pointers
  (`channels/stable/protocol-<N>.json`, `channels/canary/protocol-<N>.json`) are the only mutable
  release objects — versioned archives themselves are immutable once published.
- Update-availability and protocol-mismatch detection (surfaced via `UpdateCard` and the
  `protocol-upgrade-client` / `protocol-upgrade-server` error codes in the badges above) come from
  comparing the running server's protocol/version against the channel pointer the desktop app
  reads.

## Unverified / unclear

- Exact backoff schedule / attempt cap for **automatic SSH reconnection** (the UI states "Automatic
  recovery stopped after six attempts" for project-attachment recovery, but the underlying host
  supervisor's reconnect backoff timing itself lives outside this sweep's directory scope
  (`src/core/services/hosts/`) and was not fully traced).
- Whether there is a maximum stored-machine count or per-machine simultaneous-connection limit.
- The exact set of "well-known" branch names used when inferring `defaultBranch` (e.g. main/master)
  was not located in this sweep's scope; only the precedence order is confirmed.
- Full behavior of `agentGitCredentials: 'system'` vs `'none'` at the git-credential-helper level
  (backend mechanics live in `createGitCredentialsService`, outside this directory scope).
- Whether the "Add machine" flow from the Add-Project modal location selector differs in any way
  from the standalone Machines settings "Add machine" button beyond the back-vs-close dismiss
  control (both appear to route to the same `AddMachineModal`).

## Coverage note

This sweep read every non-test file under `src/core/features/projects/browser/`,
`src/core/features/projects/contributions/browser/`,
`src/core/features/projects/api/browser/` (state/store layer, not exhaustively line-by-line),
`src/core/features/machines/browser/` (all components and pages), `src/core/features/repository/`,
and the relevant parts of `src/core/services/ssh/node/` (connection lifecycle, auth, error
classification) and `packages/core/src/runtimes/host-settings/api/`. It also read
`apps/workspace-server/docs/packaging.md` and `install.sh` for the remote-development distribution
model. Not read in full: the project-settings *node*-side resolvers/services (only their
user-visible contracts, reached through the browser form components, are catalogued), the PR view
and task-creation modal (out of this document's assigned scope — tasks/PRs belong to another
sweep), and the `hosts` service's reconnect-supervisor internals (noted above as unverified). Test
files (`*.test.ts(x)`) were not read; they were treated as confirming, not defining, behavior.
