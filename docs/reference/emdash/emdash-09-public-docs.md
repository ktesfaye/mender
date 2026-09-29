# Emdash as documented publicly

Retrieved 2026-09-24. Sources: emdash.com (formerly emdash.sh, which now 301-redirects to
emdash.com) homepage, `/download`, `/blog`, `/changelog`, and every page under `/docs`
(crawled via the nav listing returned by `/docs`); GitHub releases for
`generalaction/emdash` (`gh release view`, ~50 releases fetched, v1.2.6 down to v0.4.40 plus
v1.1.5 and v0); and `README.md`, `CONTRIBUTING.md`, `docs/adr/0001`–`0008` in the source tree
(identical between this fork's root and the upstream checkout at
`/private/tmp/claude-501/.../scratchpad/emdash`, confirmed with `diff`). Source cross-checks
were grepped against that emdash checkout, pinned at upstream main / v1.2.6 / commit
`95838289f`. All doc-page content below is paraphrased/quoted from WebFetch's rendering of
each page (labelled "verified from primary page"); nothing here is from training memory.

## Advertised features (grouped)

### Parallel agent tasks in isolated Git worktrees
What it is: each unit of work ("task") gets its own git branch and worktree so agents don't
interfere with each other; isolation can be disabled with a warning.
Claim wording: "a unit of work for an agent. Each task gets its own git branch and worktree,
keeping changes isolated until you merge"; worktrees "prevent agents from interfering with
each other." Local worktrees default to `~/emdash/worktrees`; remote SSH worktrees default to
`.emdash/worktrees`.
Source: `/docs/tasks` (verified from primary page); homepage tagline "Run agents in parallel...";
README "Keep every agent isolated in its own Git worktree and branch."
Source check: confirmed — worktree creation lives under
`apps/emdash-desktop/src/core/features/tasks/` and the workspace registry
(ADR 0001/0005/0006 in `docs/adr/`); `EMDASH_TASK_ID` etc. referenced throughout
`task-session-launch-context.ts`.

### 35 supported coding-agent CLIs, auto-detected
What it is: Emdash shells out to each agent's own official CLI; it detects installed CLIs
automatically and needs no separate install of its own.
Claim wording: "Emdash supports 35 coding agent CLIs. Install or set up any of them and Emdash
detects it automatically" (`/docs/providers`, verified from primary page). Homepage/download
page instead say "25+ supported coding agents" / "Supports 25+ coding agents", and README says
"detects installed provider CLIs automatically... Claude Code, Codex, Cursor, OpenCode, Amp,
Devin, Qwen Code, Droid, and GitHub Copilot" (a shorter illustrative list, not the full 35).
Source: `/docs/providers` full table (Amp, Antigravity, Auggie, Autohand Code, Charm, Claude
Code, Cline, CodeBuddy Code, Codebuff, Codex, Command Code, Continue, Cursor, Devin, Droid,
Freebuff, GitHub Copilot, Goose, Grok, Hermes Agent, Jules, Junie, Kilocode, Kimi, Kiro (AWS),
Letta, MiMo Code, Mistral Vibe, Oh My Pi, OpenCode, Pi, Qoder CLI, Qwen Code, Rovo Dev, Zero —
34 rows counted from the fetched table against a stated total of 35).
Source check: confirmed and broader — `packages/plugins/src/agents/impl/` has 36 provider
implementation files (34 real providers matching most of the docs list, plus two later
additions not on the fetched docs page: `muse.ts` and `prime-agent.ts`, both shipped per the
v1.2.4/v1.2.3 changelog — see "Advertised but not found" section). Two files in that
directory, `native-acp.test.ts` and `prompt-delivery.test.ts`, are tests, not providers.

### Issue-tracker integrations
What it is: connect Linear, Asana, Monday.com, Trello, GitHub, Jira, GitLab, Plane, Forgejo,
Featurebase, Plain, or Notion and pull/search/attach issues into tasks.
Claim wording: per-integration setup strings, e.g. Linear "Create a new API key"; GitLab
"personal access token with `read_api` scope"; see `/docs/issues` (verified from primary page).
README lists "Linear, GitHub, Jira, GitLab, Asana, Featurebase, Monday.com, Forgejo, or Plain";
homepage lists "Linear, Jira, GitHub, Notion, Asana" as headline integrations.
Source check: not individually grepped per-provider (out of scope for a quick check), but the
issues feature and a plugin/connector architecture for multiple trackers is consistent with
`agents/integrations/` doc references in `AGENTS.md`.

### GitHub account management (multi-account, OAuth/CLI/device flow)
What it is: connect one or more GitHub accounts per machine; per-project default account;
device-flow login without an Emdash account.
Claim wording: "one or more GitHub accounts for issues, pull requests, checks and repositories";
"The connected GitHub accounts do not change how git commands authenticate." (`/docs/github-
accounts`, verified from primary page.) v1.2.5 release notes add: "Connect multiple accounts
for each integration, choose a default, and select which account each project uses."
Source: `/docs/github-accounts`; release v1.2.5 (2026-09-18).
Source check: not independently grepped this pass; feature area is `src/main/core/` GitHub
integration per `AGENTS.md`'s main-process adapter-domain list.

### Automations (scheduled/cron agent runs)
What it is: a "saved task recipe" that fires on a cron schedule, creates a task with a
preconfigured prompt/workspace, keeps full run history, and can be manually re-run or
converted into a regular task.
Claim wording: "Each automation creates a task in a specific project using a pre configured
prompt and workspace settings on a cron schedule"; "every run persisted with status, timing,
trigger kind, and any error"; "self-healing scheduler" maintaining one upcoming run per enabled
automation.
Source: `/docs/automations` (verified from primary page); introduced per v1.1.32 release notes
("Emdash v1.1.32 is out! This release brings automations...", 2026-06-10) and given a "beta"
sidebar badge per PR #1673 (v0.4.47, 2026-04-06 cycle — an early precursor UI).
Source check: confirmed — automations referenced in `agents/manifests` and task-activation
code; not deep-dived further given scope.

### Built-in browser (preview + persistent profiles)
What it is: an in-task browser tab for previewing dev servers or public pages, with separate
persistent cookie/storage profiles per account, DevTools access in dev builds, restored tabs
across restarts; restricted to `http:`, `https:`, `about:blank`.
Claim wording: "Preview web apps and pages inside a task"; limitations explicitly stated: "does
not integrate with your system Chrome profile, load extensions, or share system-browser sign-in
state."
Source: `/docs/in-app-browser` (verified from primary page). v1.1.33 added "Google Search, zoom,
screenshots, link menus, and history navigation"; v1.1.35 added "google search to in app
browser" (PR #2479); v1.2.6 fixed an iframe-load edge case.
Source check: `apps/emdash-desktop/src/core/features/` presumed to contain a browser/preview
feature slice; not individually grepped this pass (time-boxed).

### Diff view / code review (stage, commit, push, open PRs)
What it is: review unstaged/staged/PR diffs, stage or discard files with confirmation, unified
or split layout, inline diff editing (⌘S/Ctrl+S), commit/push/open-PR from the same panel.
Claim wording: "review what an agent changed, stage or discard files, commit, push, and open
pull requests without leaving Emdash."
Source: `/docs/diff-view` (verified from primary page); "Enable editing working tree diffs"
shipped per PR #1824 (v1.1.10 cycle, 2026-05-06); line comments for code review per the
changelog's v1.0 entry (2026-04-24, per the fetched `/changelog` summary — this predates the
40-release window fetched directly and is cited from the changelog page, not a `gh release
view` call).
Source check: matches MENDER.md's own description of the equivalent upstream feature ("A file
that changed is read on the board... A commit is written on the board too").

### File editor (Monaco-based, in-worktree)
What it is: browse/edit a task's worktree without an external editor; syntax highlighting,
find/replace, tabs (single-click preview, double-click persistent), auto-recovery of unsaved
changes after ~2s, delete via right-click.
Claim wording: "browse and edit code in a task's worktree without switching to an external
editor"; documented as having planned (not yet shipped, per the doc's own wording) LSP-powered
language features, quick file open, and drag-and-drop.
Source: `/docs/file-editor` (verified from primary page).
Source check: confirmed — `src/core/features/editor/browser/` "owns Monaco and file rendering"
per `AGENTS.md`'s architecture notes.

### Library: Prompts, Skills, MCP servers
What it is: a sidebar "Library" holding three reusable-resource types.
- **Prompts**: save/insert reusable instructions into task conversations; searchable; a default
  review prompt ships and can be edited/replaced.
- **Skills**: install Agent-Skills-standard skills from a catalog sourced from OpenAI/Anthropic
  catalogs, into `~/.agentskills/`, synced via symlink to Claude Code, Codex, OpenCode, Cursor,
  Roo Code, Mistral Vibe; custom skills via `SKILL.md` + YAML front matter.
- **MCP**: a "curated catalog of 54 pre-configured servers," local (stdio) and remote (HTTP)
  transports, syncs to 11+ agents' native config formats.
Claim wording: "keeps reusable agent resources: prompts you can insert into tasks, skills that
extend agents with specialized workflows, and MCP servers that connect agents to external tools
and data sources." "configure once and each selected installed agent picks it up."
Source: `/docs/library`, `/docs/library/prompts`, `/docs/library/skills`, `/docs/library/mcp`
(all verified from primary page).
Source check: confirmed feature slices exist — `apps/emdash-desktop/src/core/features/library/`,
`.../catalog/` (skills catalog: `catalog/node/bundled-catalog.json` is a real bundled file,
version 2, `skills: 58` entries, `lastUpdated: 2026-06-16`), and `.../mcp/` (wire controller,
browser components, no bundled catalog JSON found in-tree for MCP servers — see "Advertised
but not found" below for the "54 servers" figure specifically).

### CI checks (GitHub Actions monitoring)
What it is: view GitHub Actions check runs, statuses, durations, and PR comments for a task's
branch inside Emdash; syncs automatically and on manual reopen.
Claim wording: "Monitor GitHub Actions check runs directly in Emdash." Requires a configured
GitHub account, an active PR on the task branch, and workflows/status checks in the repo.
Source: `/docs/ci-checks` (verified from primary page).
Source check: not independently grepped this pass; consistent with `AGENTS.md`'s "PRs" domain
under Git/GitHub/GitLab services.

### Remote development (Remote Projects, Remote Tasks, SSH Connections)
What it is: run the UI locally while project work (git, files, terminals, agents) executes on
a remote machine over SSH.
- **Remote Projects**: persistent projects on one remote server, added by Pick/Clone/New;
  worktrees default to `.emdash/worktrees` on the remote host; connection states shown
  (Connecting/Connected/Disconnected); auto-reconnect with backoff up to 20s.
- **Remote Tasks**: per-task ephemeral workspace provisioning via user-supplied executable
  provision/terminate scripts. Provision script must print JSON with required fields `id`,
  `host`; optional `port` (default 22), `username` (default current user), `password` (omit
  for SSH-agent auth), `worktreePath` (default project path), `forwardAgent` (default false).
  Terminate script receives `REMOTE_WORKSPACE_ID` env var.
- **SSH Connections**: password (encrypted app storage), SSH key (with optional passphrase),
  or SSH-agent auth; supports SSH config aliases (resolved via `ssh -G`), ProxyJump, ForwardAgent,
  ProxyCommand.
Claim wording: "keep the UI on your local machine while project work runs somewhere else."
Source: `/docs/remote-development`, `/docs/remote-development/remote-projects`,
`/docs/remote-development/remote-tasks`, `/docs/remote-development/ssh-connections` (all
verified from primary page). The "Emdash Workspace Server" (a managed remote-dev backend, "on
par with local development, including Git, files, terminals, agents, automations, file search,
and preview forwarding") shipped in v1.2.0 (2026-08-28), per the changelog page.
Source check: confirmed — `apps/workspace-server/`, `packages/core` SSH/SFTP services, and
`docs/adr/0005`–`0008` all describe this exact host/registry/RPC-verb architecture; field names
`worktreePath`, `forwardAgent`, `REMOTE_WORKSPACE_ID` located via grep in
`apps/emdash-desktop/src/core/features/machines/browser/` (machine-form-schema.ts and related
files).

### Tmux-backed persistent sessions
What it is: wraps agent chats and task terminals in tmux (named per project/task/chat) so they
survive disconnects and app restarts; toggle globally (Settings → General) or per project;
requires tmux on PATH locally, or on the remote host for SSH projects.
Claim wording: "wrap[s] agent chats and task terminals in tmux so they survive disconnects and
Emdash restarts."
Source: `/docs/tmux-sessions` (verified from primary page).
Source check: confirmed — `tmux` referenced across
`apps/emdash-desktop/src/core/features/tasks/api/node/task-session-manager.ts`,
`task-session-cleanup.ts`, `task-session-launch-context.ts`, `node/session-targets.ts`,
`node/operations/archiveTask.ts`, and settings search/UI files.

### Keyboard shortcuts
Full documented list under **Keyboard shortcuts** below.
Source: `/docs/keyboard-shortcuts` (verified from primary page).
Source check: confirmed — a dedicated keybindings subsystem exists at
`apps/emdash-desktop/src/renderer/lib/keybindings/` (dispatcher, mount, browser-shortcut-
forwarding) and `apps/emdash-desktop/src/core/primitives/keybindings/`; individual bindings
were not diffed key-by-key against the docs (out of scope for the time box), so treat the
doc list as authoritative for wording and the source check as "the mechanism exists," not
"every binding was matched line-for-line."

### Project config (`.emdash.json`)
Full field list under **Documented config formats** below.
Source: `/docs/project-config` (verified from primary page).
Source check: confirmed — see grep hits below.

### Telemetry (optional, anonymized)
What it is: PostHog-based, anonymous-by-default, enabled by default in production builds;
excludes code/file contents, prompts/messages, env vars, user input, repo names, paths,
location, session recordings; disable via Settings → General → Privacy & Telemetry or
`TELEMETRY_ENABLED=false` (also accepts `0`/`no`); dev builds don't send telemetry.
Claim wording: "anonymous-by-default telemetry in production builds, enabled by default."
Source: `/docs/telemetry` (verified from primary page); README repeats the env-var toggle.
Source check: confirmed — `TELEMETRY_ENABLED` referenced in
`apps/emdash-desktop/src/main/bootstrap/core/config.test.ts` and
`packages/core/src/services/shell-env/node/user-env.ts`.

### Installation (macOS/Windows/Linux, multiple package formats)
What it is: brew cask, direct dmg (arm64/x64), Windows exe/msi, Linux AppImage/deb/rpm
(x64 and, as of v1.2.3, native arm64).
Claim wording: README table with per-platform download links; "Emdash v1 is... the stable
release for macOS, Windows, and Linux."
Source: `/docs/installation`, README.md (verified from primary page / source tree).
Source check: release asset lists in `gh release view` output confirm dmg/exe/msi/AppImage/
deb/rpm artifacts are actually published (e.g. v1.2.6 assets: `emdash-arm64.dmg`,
`emdash-x64.exe`, `emdash-x64.msi`, `emdash-x86_64.AppImage`, `emdash-amd64.deb`,
`emdash-x86_64.rpm`, `emdash-aarch64.rpm`, plus arm64 Linux variants).

## Release timeline

Chronological, newest first, drawn from `gh release view` (stable releases; canary
pre-releases omitted as iterations of the next stable). Where a release's notes used the
"### Highlights" structured format the highlight bullets are quoted; where notes were only a
plain PR list, a summary line (quoted from the release body where one exists) or representative
PR titles are given instead.

- **v1.2.6** — 2026-09-21. File drops/image pastes in remote terminals; OpenCode v2 native
  status hooks; IPv6 preview-server detection; search dedup fixes; various reliability fixes.
- **v1.2.5** — 2026-09-18. Multiple accounts per integration with a default; custom agent
  executable selection (including Windows PowerShell wrappers); menu-bar/tray icon visibility
  toggle; diff-view scroll-to-first-change.
- **v1.2.4** — 2026-09-07. ACP conversations group related thinking blocks and collapse
  consecutive tool calls; project renaming; Muse Code added as a provider; CodeBuddy Code gets
  lifecycle hooks; Codex adds GPT-6 Astra; model-effort shown in composer.
- **v1.2.3** — 2026-09-02. Prime Agent added as a provider (native ACP, resumable sessions, MCP,
  hooks); project-level environment variables; drag-to-split panes; git-status color propagation
  up the file tree; Claude adds Opus 5 and "Fable 5.1"; native Linux arm64 packages (AppImage/
  DEB/RPM).
- **v1.2.2** — 2026-08-31. Codex ACP Default/Plan mode switch in the composer, remembered per
  session.
- **v1.2.1** — 2026-08-29. (No structured highlights in the fetched release body.)
- **v1.2.0** — 2026-08-28. Emdash Workspace Server (remote projects "on par with local
  development"); per-machine management of workspaces/conversations/agents/MCP/skills/
  dependencies/resource usage; file-content search (Cmd/Ctrl+Shift+F); background/non-blocking
  task setup with an Activity menu; ACP chat draft/attachment persistence across navigation.
- **v1.1.40** — 2026-07-17. Zen-mode shortcut toggle; paste image attachments in chat; "Show in
  Finder" context menu; misc UI fixes.
- **v1.1.39** — 2026-07-14. Executor added to recommended MCP servers; OpenCode selected-model
  forwarding fix; SSH remote-teardown crash fix.
- **v1.1.38** — 2026-07-11. Issue-provider code extracted into the plugins package; "Rider"
  open-in-app; update-download entry point moved to sidebar; chat UI work-in-progress
  improvements; Hyper terminal open-with support.
- **v1.1.37** — 2026-07-06. "Live chat UI"; Codex chat-UI support added to the plugin
  architecture; feedback includes platform details.
- **v1.1.36** — 2026-07-01. (No PR list captured in the fetched release body.)
- **v1.1.35** — 2026-06-23. In-app browser navigation polish; custom DMG install-screen
  background; "parallel" MCP catalog entry; Google Search added to the in-app browser.
- **v1.1.34** — 2026-06-15. (No PR list captured in the fetched release body.)
- **v1.1.33** — 2026-06-12. In-app browser gains Google Search, zoom, screenshots, link menus,
  history navigation; new MCP catalog entries; polished macOS installer; stronger git/worktree
  handling; fixes across tmux glyphs, notifications, themes, GitHub setup, diffs, SSH,
  automations.
- **v1.1.32** — 2026-06-10. Automations, multiple GitHub accounts, and in-app browser tabs
  introduced; new Trello, Monday.com, Plane integrations; broader agent hook support.
- **v1.1.27** — 2026-05-31. Diff tree view and easier selection; compact single-child folders in
  the file tree; configurable default terminal shell; better clipboard support; SSH/project
  reliability fixes.
- **v1.1.25** — 2026-05-26. PR/task workflow improvements; Windows paste and persisted image
  pastes in terminal/diff view; TSX/JSX highlighting; GitHub Enterprise remote compatibility;
  new MCP provider "Notra."
- **v1.1.24** / **v1.1.22** — 2026-05-22 / 2026-05-20. GitHub auth source/connection-flow
  improvements; home-action label casing normalized; actionable SSH MaxSessions panel; worktree
  directory browser; theme fixes.
- **v1.1.19** — 2026-05-18. Smoother SSH/remote workflows; command-palette/navigation
  improvements; richer PR file-list info and PR comment rendering; Asana and Grok CLI added;
  Linear updates.
- **v1.1.16** — 2026-05-14. Terminal drawer added; task marked "working" after conversation
  creation with an initial prompt; image paste/drag-drop in feedback; copy-branch task action;
  drop folders onto sidebar to add projects.
- **v1.1.10** — 2026-05-06. Kitty added to Open In menu; editable working-tree diffs; standardized
  lifecycle-script interfaces; GitHub issue-picker fix; Windows path-outside-allowed-roots fix.
- **v1.1.5** ("Emdash v1.1.5") — 2026-04-30. "Emdash v1 is now stable." Fixes/perf/groundwork for
  remote workflows and BYOI workspaces; import existing v0.4.x tasks during onboarding; canary
  release channel added; Devin CLI agent support added.
- **v1.0** — 2026-04-24 (per the `/changelog` page, not independently fetched via `gh release
  view` in this pass — dated outside the ~40-release window pulled). "Initial stable v1 release
  with rebuilt task and worktree engine"; first-class SSH project support; line comments for
  code review; terminal search.
- **v0** — 2026-04-28. (Early/legacy tag; PR list only, no structured notes — e.g. "codex
  status," Create-Workspace input validation.)
- **v0.4.50** — 2026-04-22. v1-beta download links and in-app discovery hint added ahead of the
  v1 launch.
- **v0.4.49** — 2026-04-17. GitHub CLI legacy-token migration into keychain; MiniMax-AI/cli added
  as a default skill tap; unread-task app badge count; docs infra changes.
- **v0.4.48** — 2026-04-14. Semantic settings search added; scheduled-task sleep/resume handling;
  GitHub integration decoupled from `gh` CLI auth; license changed from MIT to Apache-2.0.
- **v0.4.47** — 2026-04-06. "Reveal in Finder"/"Open in Terminal" folder context actions; sidebar
  folder collapse state persisted; automations given a "beta" badge in the UI.
- **v0.4.46** — 2026-04-06. Fish-shell SSH prompt-detection delay fix; macOS crash fix; branch
  prefix applied to remote worktree creation; Forge (forgecode.dev) added as a provider; PR/CI
  info shown for fork branches; `CLAUDE_CONFIG_DIR` passthrough fix.
- **v0.4.45** / **v0.4.44** — 2026-03-29. Git-status perf optimization for large monorepos;
  OpenCode MCP-config preservation and spinner fixes; fish-prompt SSH detection without timeout
  fallback; React testing foundation added.
- **v0.4.43** — 2026-03-29. Terminal focus-stealing fix; default notification sound changed.
- **v0.4.42** — 2026-03-28. `stop` lifecycle script support; configurable dev-server port;
  branch-select perf for large repos; "Option as Meta key" terminal setting (macOS); Nix flake
  build fix.
- **v0.4.41** — 2026-03-25. MCP tab redesign with provider icons; macOS/Linux PATH-init
  improvement; sidebar task sorting/manual reordering; skills-page icons; changelog hero-image
  support with a GitHub Releases fallback.
- **v0.4.40** — 2026-03-23. Provisioning hard-timeout replaced with a warning; git operations for
  workspace-provider tasks routed through SSH; toggle to disable auto-close of linked issues on
  PR creation; Windows PTY-shutdown EPIPE suppression.

Note: releases between v1.1.5 (2026-04-30) and v0.4.50 (2026-04-22) bracket the v1.0
(2026-04-24) and v0 (2026-04-28) tags in a non-linear tag history (v0 was cut after v0.4.50 as
part of the v0→v1 transition); dates, not tag-name ordering, are authoritative above.

## Documented config formats

### `.emdash.json` (project-level, committed)
Source: `/docs/project-config` (verified from primary page).

| Field | Type | Purpose (as documented) |
|---|---|---|
| `preservePatterns` | array of strings | "Copies matching untracked or gitignored files such as .env into new tasks." Example: `[".env", ".env.local"]`. |
| `shellSetup` | string | "Commands that run before terminals, agent sessions and lifecycle scripts." Example: `"source ~/.nvm/nvm.sh && nvm use"`. |
| `scripts.setup` | string | Commands for initial task setup. Example: `"docker compose up && pnpm install"`. |
| `scripts.run` | string | Commands for running the task's dev workflow. Example: `"pnpm dev"`. |
| `scripts.teardown` | string | Commands for cleanup after a task. Example: `"docker compose down"`. |

Documented behavior: values are "committed and merged onto the base branch, so teammates and
new tasks get the same project defaults"; a personal/local machine override takes precedence
over the committed file, and clearing the local override falls back to the shared
`.emdash.json` value. Scripts receive environment variables including `EMDASH_TASK_ID`,
`EMDASH_PORT`, and others (not fully enumerated in the fetched page).

Source check: confirmed — `preservePatterns` and `shellSetup` are both referenced in
`apps/emdash-desktop/src/core/features/projects/api/project-settings-page.ts`,
`.../tasks/api/node/task-session-launch-context.ts`, and settings-store code; the
`prepare`/`setup`/`run`/`teardown` script-kind vocabulary matches
`apps/emdash-desktop/src/core/features/tasks/browser/components/activity-badge.tsx`
(`type ScriptStepId = 'prepare' | 'setup' | 'run' | 'teardown'`) — note the source has a fourth
kind, `prepare`, not mentioned on the `/docs/project-config` page (see "in source but
undocumented" below). This matches `AGENTS.md`'s own field list for `.emdash.json`
(`preservePatterns`, `scripts.prepare`, `scripts.setup`, `scripts.run`, `scripts.teardown`,
`shellSetup`), which additionally documents `scripts.prepare` where the public docs page does
not.

### Remote-task provision-script JSON output
Source: `/docs/remote-development/remote-tasks` (verified from primary page).

| Field | Required | Default | Purpose |
|---|---|---|---|
| `id` | yes | — | External workspace identifier, used for the matching terminate script. |
| `host` | yes | — | Hostname or IP address to SSH into. |
| `port` | no | `22` | SSH port. |
| `username` | no | current user | SSH username. |
| `password` | no | (omit for SSH-agent auth) | Password auth if provided. |
| `worktreePath` | no | project path | Where the task's worktree lives on the provisioned host. |
| `forwardAgent` | no | `false` | Enables SSH agent forwarding. |

The terminate script receives `REMOTE_WORKSPACE_ID` (set to the provision output's `id`) as an
environment variable.

Source check: confirmed — `worktreePath`, `forwardAgent` field names located in
`apps/emdash-desktop/src/core/features/machines/browser/machine-form-schema.ts` and sibling
files (`machine-connection-details.tsx`, `machine-manual-fields.tsx`).

## Keyboard shortcuts

Source: `/docs/keyboard-shortcuts` (verified from primary page). Mac binding listed first,
Windows/Linux second.

**Navigation**
- Open command palette — ⌘K / Ctrl+K
- Open settings — ⌘, / Ctrl+,
- Open the Library — ⌘L / Ctrl+L
- Close modal or dialog — Esc / Esc
- Create a task — ⌘N / Ctrl+N
- Delete selected tasks — ⌘Backspace / Ctrl+Backspace
- Create a project — ⌘⇧N / Ctrl+Shift+N
- Open project in editor — ⌘O / Ctrl+O
- Confirm dialog action — ⌘Enter / Ctrl+Enter
- Go back — ⌘[ / Ctrl+[
- Go forward — ⌘] / Ctrl+]

**View**
- Toggle left sidebar — ⌘B / Ctrl+B
- Toggle right sidebar — ⌘. / Ctrl+.

**Task view**
- View Changes panel — ⌘⇧1 / Ctrl+Shift+1
- View Files panel — ⌘⇧2 / Ctrl+Shift+2
- View Conversations panel — ⌘⇧3 / Ctrl+Shift+3
- Create a conversation — ⌘T / Ctrl+T
- Create conversation in right split — ⌘D / Ctrl+D
- Create a terminal — ⌘⇧T / Ctrl+Shift+T
- Open browser — ⌘⇧B / Ctrl+Shift+B
- Toggle terminal drawer — ⌘J / Ctrl+J
- Switch to next task — ⌘⌥↓ / Ctrl+Alt+↓
- Switch to previous task — ⌘⌥↑ / Ctrl+Alt+↑

**Tab navigation**
- Switch to next tab — ⌘⌥→ or Ctrl+Tab / Ctrl+Alt+→ or Ctrl+Tab
- Switch to previous tab — ⌘⌥← or Ctrl+Shift+Tab / Ctrl+Alt+← or Ctrl+Shift+Tab
- Close active tab — ⌘W / Ctrl+W
- Split pane — ⌘\ / Ctrl+\
- Jump to tabs 1–9 — ⌘1–⌘9 / Ctrl+1–Ctrl+9

**Context and search**
- Search within focused search inputs — ⌘F / Ctrl+F
- Toggle Add-context menu in conversation — ⌘⇧A / Ctrl+Shift+A
- Add selected context and send — ⌘Enter / Ctrl+Enter

(Not on this docs page, but shipped per the v1.1.40 release notes: a "zen mode toggle"
keyboard shortcut, PR #2835 — see "advertised but not found" note below, since the docs page as
fetched does not list it.)

Source check: the keybinding dispatcher mechanism is confirmed at
`apps/emdash-desktop/src/renderer/lib/keybindings/` and
`apps/emdash-desktop/src/core/primitives/keybindings/`; individual key combinations above were
not diffed one-by-one against source (time-boxed) — treat the list itself as verified-from-
docs, and the mechanism's existence as source-confirmed.

## Advertised but not found in source / in source but undocumented (notable)

- **Provider-count mismatch across pages.** `/docs/providers` states "35 coding agent CLIs" but
  the fetched table lists 34 rows; the homepage and `/download` instead advertise "25+
  supported coding agents." Source has 34 non-test provider plugin files matching most of the
  docs table, plus two newer ones the fetched docs table omits: `muse.ts` (Muse Code, shipped
  v1.2.4, 2026-09-07) and `prime-agent.ts` (Prime Agent, shipped v1.2.3, 2026-09-02). Likely
  explanation: the docs page and homepage/download counts were captured/cached before these two
  September additions, or the "35" vs "25+" figures are simply maintained independently and
  inconsistently — not a removal, a doc lag or copy inconsistency.
- **MCP "54 pre-configured servers" catalog** (`/docs/library/mcp`) — no bundled MCP-server
  catalog JSON was found in `apps/emdash-desktop/src/core/features/mcp/` or `.../catalog/`; the
  only bundled catalog file found in that area (`catalog/node/bundled-catalog.json`) is the
  **skills** catalog (58 entries, not MCP servers). The MCP server catalog is presumably served
  from a remote/CDN source at runtime rather than bundled in the repo — not confirmed either
  way in this pass, flagged as unverified rather than "not found."
- **`scripts.prepare`** — a fourth lifecycle-script kind (`'prepare' | 'setup' | 'run' |
  'teardown'`) exists in source
  (`apps/emdash-desktop/src/core/features/tasks/browser/components/activity-badge.tsx`) and is
  documented in this repo's own `AGENTS.md` (`scripts.prepare`), but the public
  `/docs/project-config` page's field table only documents `scripts.setup`, `scripts.run`, and
  `scripts.teardown` — `prepare` is in source and in this repo's internal docs, but not in the
  public-facing config-field table as fetched.
- **Zen mode** — a documented-in-changelog keyboard shortcut ("feat(shortcuts): add zen mode
  toggle," v1.1.40, PR #2835) does not appear on the fetched `/docs/keyboard-shortcuts` page's
  shortcut tables.
- **v1.0 release notes** were only available secondhand via the `/changelog` page's own summary
  (dated 2026-04-24); this specific tag was not independently pulled with `gh release view`
  in this pass because it fell outside the ~40-release window fetched by tag name (the fetched
  window ran v1.2.6 → v0.4.40 plus v1.1.5 and v0, which brackets but does not include a
  standalone "v1.0" tag in the `gh release list` output — the nearest tags are v1.1.5 and
  v0.4.50/v0). Treat the v1.0 line in the timeline as reported-secondhand, not verified from a
  release page.

## Unverified / fetch failures

- No outright fetch failures: both `emdash.sh` and every `/docs/*` path 301-redirected to
  `emdash.com` and were then fetched successfully on retry; no page required the `scrapling`
  skill or curl fallback.
- `gh release view "Emdash v1.1.5"` (using the release title rather than the tag) failed with
  "release not found"; retried successfully as `gh release view v1.1.5` (the actual tag) and
  succeeded.
- Per-provider issue-tracker integration claims (Linear/Asana/Monday.com/Trello/GitHub/Jira/
  GitLab/Plane/Forgejo/Featurebase/Plain/Notion) and the CI-checks and GitHub-accounts features
  were confirmed against `/docs/issues`, `/docs/ci-checks`, `/docs/github-accounts` (verified
  from primary page) but were **not** individually grepped against source per-integration in
  this pass — flagged as doc-verified but not source-cross-checked at the per-provider level.
  Same caveat applies to the full keyboard-shortcut list (mechanism confirmed, individual
  bindings not diffed) and to individual issue-tracker connector files.
- The blog was crawled via `/blog` only (3 posts found: "What Is Emdash?" 2026-08-13, "Emdash
  v1" 2026-04-24, "Emdash public v1 beta" 2026-04-16); it's possible additional older posts
  exist below the fold that the WebFetch summary did not surface — not independently confirmed
  by paginating the blog.
