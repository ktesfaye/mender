# Build catalog — the village front end

Everything we need to do, in one place, organized so tickets can be cut straight out of it. Built from a full read of `docs/app/catalog/01` through `09` and `docs/superpowers/specs/2026-09-05-village-front-design.md`. Nothing here is invented — every ledger row and build item traces to a specific catalog section; where a catalog itself said INFERRED, that marker is kept.

This is a working document, not a pitch. Rows are dense on purpose.

---

## 1. Orientation

**What we are building.** Emdash is an Electron app for running coding agents against git repos: create a project, spin up a task (a git worktree) inside it, point one of 37 agent CLIs at it, watch it work in a chat transcript, review its diff, open a PR. Kirubel is forking it, keeping the entire back end, and replacing the entire front end with a pixel-art village: the app opens on an island, each project is a district that grows across five hand-drawn stages as the project grows, each task is a building in that district, and each running agent session is a villager walking around whose animation/overlay state shows whether it's working, waiting on you, errored, or done. Clicking a district zooms the camera in, slides a wooden-board panel in beside it, and that board carries whatever screen the feature needs (chat, terminal, file tree, diff, settings). The village keeps living behind the board. Nothing is a screen change; everything is diegetic — including settings, which is a separate island with a windmill.

**What we keep.** The entire back end: `packages/wire` (the RPC/streaming runtime), `packages/core` (ACP/TUI agent runtimes, git, files, terminals, search, host-dependencies, etc.), and all 39 domain contracts assembled in `apps/emdash-desktop/src/core/manifests/shared/domain-contracts.ts`. Catalog 07 confirms this layer imports neither Electron nor React and is built to be consumed by a different client without forking. We also keep this repo's own village pipeline: `world/state.py`'s resolution rules (to be ported), the editor's shore/dress pass (`editor/src/scene/*`, `world/shore/shore.mjs` — already portable JS), the scene graph, alpha-accurate picking, and the NPC walker system in `editor/src/app/*` (catalog 08). None of `study/`, the composer, or the generator are used by the app (per the 2026-09-05 spec) — they stay as history.

**What we replace.** All of `apps/emdash-desktop/src/renderer` and `apps/emdash-desktop/src/core/features/**/browser/**` — every React component, every one of the 30 modals, all 13 settings pages, the whole task workbench (split-pane tabs, sidebar, composer), the native-menu/tray/window chrome to the extent it assumes a conventional app shell. `app/` and `world/render.py`'s baked-PNG pipeline in *this* repo are also replaced (catalog 08's "headline finding": that pipeline is a dead end for a live client; the actual foundation is the Pixi editor).

**The one-paragraph architecture.** A Pixi.js/`pixi-viewport` client (built out of `editor/src/scene/*` and `editor/src/app/*`, stripped of editor tooling) renders `world.json` filtered by a live project/task state instead of a fixed demo; it connects to Emdash's existing wire contracts over a new (non-Electron-preload) transport — most likely `packages/wire`'s `stream` transport reached through the kept Electron main process, or an Electron IPC/port transport reimplemented for the new renderer — subscribes to the `projects`/`tasks`/`conversations`/`workspaces` live models the same way the current React app does, and maps that live state onto plots, buildings, and villagers. Clicking a plot/building drives a camera transition (new — none exists today) and opens a wooden-board panel that is itself a small app: a restyled `xterm` terminal for shells, a restyled Monaco editor for files/diffs, and a new chat-transcript renderer (the existing SolidJS `chat-ui` engine is a candidate for direct reuse since it's already decoupled from React) for agent conversations, all skinned to sit on wood rather than in a conventional pane.

**How to read the ledger, and the rule that outranks it.** The ledger below is an
INVENTORY, not a target. It exists so that no capability disappears by accident,
unnoticed. It is not a promise that this app has every surface emdash has, and
"emdash does it this way" is never on its own a reason for us to.

This app is deliberately simpler and cleaner than emdash. You open it and you see
the village. Where a feature can be reached through fewer, calmer, more physical
moves than emdash uses, that is the better answer even though it scores lower on
parity. Where a feature genuinely is not wanted, it is cut on purpose and recorded
as cut, not smuggled in as a panel because upstream had one.

The failure mode this note exists to prevent: reading a ledger row and reaching for
emdash's layout to satisfy it.

---

## 2. The feature ledger

Every user-facing capability Emdash has today, grouped by the domain it was catalogued under. **Village appearance** is either a concrete proposal or `OPEN` (see the numbered question in section 3). Traceability: each row cites its catalog file; "01 §Agent selector" etc.

### 2.1 Agent adapter / plugin system (catalog 01)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| AG-01 | Supported-agent catalog (37 providers) | Fixed list of coding-agent CLIs Emdash can drive, each with name/description/website/icon | Agent choice = which "worker" walks the villager; icon shown on the villager or its status bubble. Concrete. |
| AG-02 | Per-agent capability declarations (11 typed capabilities) | Drives which UI affordances appear per selected agent (ACP vs PTY-only, auth, auto-approve, effort, hooks, host dependency, MCP, models, plugins, prompt delivery, sessions, trust) | Backing logic unchanged; each capability becomes a conditional element on the chalkboard composer. Concrete. |
| AG-03 | ACP session transport | Structured streaming protocol for capable agents instead of raw terminal text | Invisible plumbing; enables the rich transcript board. Concrete (no UI). |
| AG-04 | Vendor event-field enrichment | Promotes vendor-specific fields (e.g. Claude's subagent parent id) into normalized fields for hierarchical tool-call rendering | Invisible; needed for subagent nesting in the transcript. Concrete (no UI). |
| AG-05 | Session resumability & provider session-id tracking | Reopening a conversation resumes the underlying agent process instead of starting fresh | Invisible; villager "picks up where it left off" instead of respawning. Concrete. |
| AG-06 | Hook-driven status & session signals | Agent CLIs' own lifecycle hooks (start/stop/notification/session) feed status without polling | Drives the villager's visible state (see AG-08). Concrete (no UI). |
| AG-07 | MCP server management, scoped per agent | Read/write/remove MCP server registrations per agent, surfaced read-only in the composer | OPEN — see Q-MCP (3.13). |
| AG-08 | Workspace trust pre-authorization | Pre-writes "trust this folder" into an agent's config so headless launch doesn't hang on a first-run dialog | Invisible. Concrete (no UI). |
| AG-09 | Per-agent auth status detection | Checks env var / runs `<cli> auth status` to classify authenticated/unauthenticated/unknown | Shown on the agent-CLI's representation in the Settings-island "workshop" (see ST rows). OPEN placement — see Q-SETTINGS (3.6). |
| AG-10 | Multi-account registry (issue trackers etc.) | Multiple named accounts per external provider, one default, self-healing on removal | Same as AG-09 — lives in the settings island. OPEN placement. |
| AG-11 | CLI dependency install/update/uninstall | Per-agent binary lifecycle: detect, install (curl/brew/npm/PowerShell), update, uninstall, pick among multiple PATH installs, sudo retry | The "workshop" idea: agent CLIs as tools on a bench in the settings island; install = "commission the tool." OPEN — see Q-SETTINGS. |
| AG-12 | Agent-process environment sanitization | Spawned agent processes get an allowlisted env, never the app's full env | Invisible. Concrete (no UI); must be preserved exactly, including the `CLAUDE_CODE_OAUTH_TOKEN` gap already known from this project's own CLAUDE.md. |

### 2.2 Session lifecycle & conversation management (catalog 01)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| AG-13 | Session idle policy & automatic teardown | 4 idle policies (`while-attached`/`idle-after`/`until-complete`/`always`); background sweeper evicts qualifying sessions | Invisible; a villager "goes home" (despawns/parks) when its session is evicted. Concrete (no UI needed beyond the villager state machine, see 08 build item 11). |
| AG-14 | Session intents — persisted resume state | Durable per-conversation resume record; app restart reconciles and resumes/suspends | Villagers repopulate the island on app relaunch instead of the island being empty. Concrete. |
| AG-15 | ACP session launch / TUI session start contracts | Typed start-a-session entry points, each with its own input/output/error shape | Invisible; backs "found a new task" (see building-creation flow). Concrete (no UI). |
| AG-16 | Conversation index | One durable record per conversation (id, provider, cwd, title, timestamps, resume outcome) | Backing data for the building's task list / villager identity. Concrete (no UI). |
| AG-17 | Conversation lifecycle reporting | 4 report types a session pushes upstream (started, providerSessionId rebind, activity heartbeat, ended) | Invisible; drives villager spawn/despawn timing. Concrete (no UI). |
| AG-18 | Agent status derivation & unread badge | 5-state machine (idle/working/awaiting-input/completed/error) + a "seen" flag per conversation | THE core status→villager mapping. Concrete — see Q-STATUS (3.3) for exact visual language; unread badge OPEN for where it surfaces diegetically. |
| AG-19 | Live conversation auto-titling from the agent | Agent-reported session title renames the conversation live | Building/task label updates live. Concrete. |
| AG-20 | Normalized transcript event vocabulary | The full set of event kinds (message, thinking, tool_call, subagent, search, mcp_tool, web_fetch, tool_update, plan, config, mode_selected, commands, usage, title, ignored) | Backs the chalkboard chat renderer; every kind needs a rendering. Concrete (no separate UI row; rows AG-21+ below cover the renderer). |
| AG-21 | Host/runtime availability states | Typed reasons a backend runtime can fail to resolve (offline, daemon-start-failed, host-identity-lost, etc.) | Surfaces as a village-appropriate error state on the affected district/building rather than a generic toast. OPEN — see Q-ERRORS (3.16). |

### 2.3 Chat transcript — data model & rendering engine (catalog 01)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| AG-22 | Transcript row kinds (message, tool, subagent, thinking, file-op, execute, diff, resource-link, plan, working, turn-outcome) | The full vocabulary any transcript renderer needs a case for | Rendered inside the chalkboard/parchment content of an opened building. Concrete — reuse `chat-ui`'s model, restyle rendering. |
| AG-23 | Virtualized, auto-growing transcript scroll | Custom virtualizer handles arbitrarily tall/streaming rows at scale | Concrete — needed verbatim inside the board's chat pane. |
| AG-24 | Composer placement (centered vs docked) | Animated FLIP transition between empty-state and in-conversation composer position | Concrete, restyled to the board. |
| AG-25 | Pin the active user message while scrolling | Sticky blurred header strip of the message that started the current turn | Concrete, restyled. |
| AG-26 | User message card | Collapse/expand, attachments, inline stop-generating button scoped per turn | Concrete, restyled. |
| AG-27 | Generic tool call row | Fallback single-line renderer for any tool kind | Concrete, restyled. |
| AG-28 | Hierarchical tool grouping (subagents) | Collapsible composite rows, arbitrary nesting depth | Concrete, restyled. |
| AG-29 | Subagent card | Braille spinner while running, status dot on completion, expandable child stack | Concrete — spinner glyph is a UI convention that needs a village-native equivalent (see Q-MOTIF, 3.17) or can stay as-is on the board (board content need not be full pixel-art). OPEN styling choice. |
| AG-30 | Diff card (file edit preview) | Syntax-highlighted unified diff, +N/−N counts, 12-line preview cap | Concrete, restyled on Monaco (see FS rows) or the lighter Shiki-based renderer. |
| AG-31 | Execute card (shell command + live output) | Collapsible, bash-highlighted command + streaming output, auto-scroll, truncation notice | Concrete, restyled. |
| AG-32 | File operation card (read/edit/delete/move) | Single/multi-file op rows, clickable to open the file | Concrete, restyled. |
| AG-33 | Thinking/reasoning card | Live "Thinking Ns" timer, collapses to "Thought for Ns", expandable | Concrete, restyled. |
| AG-34 | Plan/todo-list card | Checklist with status glyphs, priority dimming, markdown per entry | Concrete, restyled — could double as the building's visible "what this task is doing" summary. OPEN whether it surfaces outside the board too (Q-STATUS). |
| AG-35 | Resource link card | Compact file/URL/opaque-URI row | Concrete, restyled. |
| AG-36 | Turn outcome / filler rows | "Working…" filler; cancelled/failed/interrupted/completed line | Concrete, restyled. |
| AG-37 | Markdown rendering (headings, tables, code, Mermaid, GFM, math) | Shared markdown engine across message/thinking/plan text | Concrete — keep Shiki + KaTeX + Mermaid stack, restyle chrome only. |
| AG-38 | Mermaid diagram pan/zoom viewer | Modal with pan/zoom over rendered SVG | Concrete, restyled dialog. |
| AG-39 | Copy-to-clipboard affordance | Inline and overlay copy buttons | Concrete, restyled. |
| AG-40 | Agent status glyph (inline indicator) | Small SVG glyph for the 5-state status vocabulary | Superseded on-map by the villager's own animation (AG-18); the small glyph may still be needed inline in lists. OPEN — see Q-STATUS. |

### 2.4 Composer & prompt editor (catalog 01)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| AG-41 | Agent selector | Searchable combobox of configured agents, locks once conversation has history | Concrete — this becomes "which worker do you send" at task-creation time; restyled control on the board/modal. |
| AG-42 | Model selector with hover-detail card | Model list + description + context/speed/intelligence meters, nested effort submenu | Concrete, restyled. |
| AG-43 | Permission mode & collaboration mode selectors | Two independent dropdowns (approval level, plan vs default) | Concrete, restyled. |
| AG-44 | Session MCP servers indicator | Pill + popover listing active MCP servers | Concrete, restyled; ties to AG-07. |
| AG-45 | Context-window usage indicator | SVG donut + popover with used/size tokens and cost | Concrete, restyled — could be a villager-carried prop (e.g. a filling jug) per Q-MOTIF, or stay a plain meter on the board. OPEN. |
| AG-46 | Attachments (image drag/drop/paste) | Thumbnail strip, remove, non-image forwarded as mentions | Concrete, restyled. |
| AG-47 | Send/stop/queue button | Context-sensitive single button: send, stop generation, or queue while busy | Concrete, restyled. |
| AG-48 | Notice band (session-state banners) | Dismissible error/warning/info banner above input, incl. stop-reason mapping | Concrete, restyled. |
| AG-49 | Permission request band | Shield-icon approval UI with split-button options, queue counter | Concrete, restyled — this is a moment a villager could visibly "wait at your door" for (ties to AG-18/Q-STATUS). |
| AG-50 | Queued prompts band | Reorderable, editable, deletable, "send now" queue of pending messages | Concrete, restyled. |
| AG-51 | @ mentions (files/issues/symbols/custom) | Atomic inline pill nodes from a typed suggestion source | Concrete, restyled TipTap extension. |
| AG-52 | / slash commands | Inline command pills, three behaviors (insert / insert-text / execute) | Concrete, restyled. |
| AG-53 | Submit keybindings & multiline editing | Configurable submit shortcut, Shift+Enter always a newline | Concrete, unchanged logic. |
| AG-54 | Prompt editor imperative API | focus/clear/getText/getSelection/setText for host control | Concrete, unchanged (internal). |

### 2.5 Projects (catalog 02)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| WS-01 | Add Project modal — Pick Directory | Browse/type a local or remote directory, offer git-init if not a repo | Concrete — this is "found a new district": clicking the campfire / an empty plot opens this flow, restyled as a board form. |
| WS-02 | Add Project modal — Create Repository | Create a brand-new GitHub repo (owner, name, visibility, target dir) | Same entry point as WS-01, different tab/mode. Concrete. |
| WS-03 | Add Project modal — Clone Repository | Clone from a URL into a target directory | Same entry point. Concrete. |
| WS-04 | Project host — local vs SSH ("Machine") | Every project operation is host-parameterized; location selector with live connection status | OPEN — see Q-MACHINES (3.11): does a remote machine get its own visual (a boat, a second island, a bridge)? |
| WS-05 | Repository inspection / creation errors | Typed error surface for not-a-repo, destination-not-empty, clone auth/network failures, etc. | Concrete — rendered as board-form inline errors, not generic toasts. |
| WS-06 | Rename / delete / relink a project | Rename modal; delete with confirm; relink when path/host is no longer valid | Concrete — rename relabels the district; delete removes it from the island (with the land-retraction question, Q-RETRACT 3.9); relink fixes a "washed away" district. |
| WS-07 | Project availability banner / disabled-action guard | Every git/task action disables itself with an explanatory reason when the host is unreachable | Concrete — surfaces as a district-level visual state (fog, storm cloud, closed gate) rather than a disabled button bank. OPEN exact motif — Q-ERRORS. |
| WS-08 | Project settings & config sharing | Project settings page; provenance model (inherited/overridden/broken); import/export team config; config migration from other tools | OPEN placement — part of the per-district chalkboard, see Q-SETTINGS. |
| WS-09 | Worktree directory setting | Where new worktrees for this project live on disk | Concrete, one field on the district's settings board. |
| WS-10 | GitHub account per project | Pin/rebind which GitHub account a project uses; warns how many projects use an account before disconnect | Concrete, on the district's settings board. |
| WS-11 | Project directory/file tree browsing (for pickers) | Lazily-expanded remote-aware file tree used inside Add Project flows | Concrete, restyled tree control in the modal. |

### 2.6 Tasks & workspaces (catalog 02)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| WS-12 | Create Task modal | One modal creating both the agent conversation and its git worktree: name, linked issue/PR, workspace strategy, first prompt | Concrete — this is "found a new building" inside a district, opened from the district's board. |
| WS-13 | Workspace presets (5 kinds) | New worktree / repo-root / reuse-existing / checkout-PR / PR-new-branch, each with its own panel and gating | Concrete, restyled picker in the task-creation form. |
| WS-14 | Branch conflict detection & reuse offer | Warns and offers "reuse existing workspace" if a branch is already checked out elsewhere | Concrete, inline form warning. |
| WS-15 | Setup step preview | Live ordered list of exactly what git operations will run, computed from the real plan | Concrete — could read as a little "blueprint" list on the board before the building appears. |
| WS-16 | Git plan compiler (branch/PR provisioning) | Turns the UI's workspace/git selection into an exact executable plan (create-branch / use-branch / pr-branch variants) | Invisible; backs WS-12/13/15. Concrete (no UI). |
| WS-17 | Task/workspace creation execution | Tombstone-aware creation, background worktree build, task appears immediately in a provisioning state | Concrete — the building appears as scaffolding/under-construction before it's "ready." Ties into stage-growth art (see Art List). |
| WS-18 | Worktree path derivation | Deterministic pool-dir + sanitized-branch worktree path, OS-aware truncation | Invisible. Concrete (no UI). |
| WS-19 | Worktree creation/removal execution (git ops) | Idempotent create pipeline (inspect→fetch→add→configure→verify); force-remove with path-safety guard | Invisible. Concrete (no UI). |
| WS-20 | Task lifecycle actions | Rename, set status/pinned/linked-issue, convert-to-automation, archive, restore, teardown, stats | Concrete — building context menu / board actions. |
| WS-21 | Task palette | Command-palette-style search over tasks | Folds into the global command palette, see Q-PALETTE (3.2). |
| WS-22 | Activity badge (workspace lifecycle) | One badge showing lifecycle-step spinner/error/settled state, with a step-log popover | Concrete — could be the building's under-construction/complete visual plus a click-to-see-log. |
| WS-23 | Delete Task modal — informed preflight | Per-task dirty/unpushed/shared-worktree/deletable-branch/host-reachable checks before the confirm dialog even renders | Concrete, restyled confirm modal. |

### 2.7 Workspaces view (catalog 02)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| WS-24 | Workspaces tab (per project or per machine) | Table of every worktree: status, branch/git stats, disk usage, linked-task counts, row actions | OPEN — see Q-WORKBENCH (3.1): does this table exist at all in a village, or does clicking the district show its buildings directly and this table becomes a "records office" board? |
| WS-25 | Workspace row actions (Open in Task / Clean Artifacts / Delete) | Per-row menu; Clean Artifacts stops sessions then removes gitignored build output | Concrete regardless of WS-24's resolution — reachable from a building's context menu. |
| WS-26 | Bulk "Delete workspaces" | Deletes every deletable row for a project/machine at once, excludes repo roots, reports partial failures | Concrete, board-level bulk action. |
| WS-27 | Workspace removal / path-issue / script-issue states | Pending-removal, stuck, path-moved, per-lifecycle-script failure chips | Concrete — surfaced as building-level visual state, see Q-ERRORS. |
| WS-28 | Observation freshness (fresh/stale/offline) | Distinct states for live vs last-known-good vs no data | Concrete, small state indicator per building/district. |

### 2.8 Git — checkout state & mutations (catalog 02)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| WS-29 | Checkout store (stage/unstage/discard/commit/push/pull/publish) | Full live git working-tree state and its mutating actions | Concrete — the Changes board inside an open building. |
| WS-30 | Git action toasts | Formatted error toasts for fetch/pull/push/publish failures | Concrete, restyled toast (or in-world equivalent, Q-NOTIFY 3.15). |
| WS-31 | Git error vocabulary | Large typed error union (auth, network, conflict, diverged, LFS, etc.) driving distinct UI per case | Concrete — must render distinctly on the board, not collapse to one message. |
| WS-32 | Repository store (branches/remotes/provider identity) | Live branch/remote state, resolved base/push remotes, canonical URLs | Invisible; backs the board's git UI. Concrete (no UI). |
| WS-33 | Repository-level wire contract (worktrees/refs/remotes/fetch) | `listWorktrees`, `getDefaultBranch`, `fetch`, `fetchPrForReview` | Invisible. Concrete (no UI). |
| WS-34 | Branch reference model | Local/remote branch typing, branded ref strings | Invisible. Concrete (no UI). |
| WS-35 | Branch selector components | Searchable combobox, Local/Remote tabs, remote-picker footer | Concrete, restyled control. |

### 2.9 Diff viewer / Changes panel (catalog 02)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| WS-36 | Staged/Unstaged sections | Collapsible sections, select-all, List/Tree toggle, virtualized | Concrete, restyled board content. |
| WS-37 | Floating action card on selection | Contextual Stage/Unstage-selected vs Stage/Unstage-all | Concrete, restyled. |
| WS-38 | Preview vs pinned diff tabs | Single-click preview (reused tab), double-click pins | Concrete, restyled tab strip on the board. |
| WS-39 | Prefetched diff models on hover | Snappier open via hover-triggered prefetch | Invisible perf detail. Concrete (no UI). |
| WS-40 | Commit card | Message/description fields, split-button (Commit / Commit & Push / Commit & Create PR), phase animation | Concrete, restyled. |
| WS-41 | Diff main panel | Monaco diff editor, image diff, stacked multi-file view, whitespace/word-wrap facets | Concrete — Monaco kept, restyled to sit on the board (per catalog 04's "Weight: heavy" note — decision point, see Q-EDITOR 3.10). |
| WS-42 | Commit history / blame | PR-scoped commit list, per-line blame hunks | Concrete, restyled. |
| WS-43 | CI check runs | Polling/state for PR checks | Concrete, restyled. |
| WS-44 | Draft line comments (agent-directed notes) | Gutter "+"-added notes pinned to a diff line, fed into the agent's next prompt as reviewer feedback | Concrete, restyled — a genuinely good diegetic opportunity (sticky notes on the board), see Art List. |

### 2.10 Pull requests (catalog 02)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| WS-45 | PR data model | Provider-neutral PR shape (status, mergeability, checks, comments, etc.) | Invisible. Concrete (no UI). |
| WS-46 | PR list/filtering (project level) | Filtered/sorted/paged PR list across repos, with sync-status card | Concrete — a tab/board inside the district view. |
| WS-47 | PR entry (inside a task's Changes panel) | Header, merge-line, drift detection, Files/Commits/Checks tabs | Concrete, restyled. |
| WS-48 | Merge footer (3 strategies + bypass) | Merge / Squash / Rebase, each with a bypass variant when permitted; mark-ready-for-review | Concrete, restyled. |
| WS-49 | Create PR modal | Target remote + base branch selection, GitHub identity strip, split "Push & Create PR" action, draft variant | Concrete, restyled — plausibly the moment a building "sends a letter" or similar motif. OPEN motif, Q-MOTIF. |
| WS-50 | PR-checkout association / drift / sync coordination | Computes which PR a checkout corresponds to and whether it's drifted | Invisible. Concrete (no UI). |

### 2.11 Git credentials (catalog 02)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| WS-51 | Credential-helper loopback channel | Per-session HTTP loopback + nonce; tokens never enter session env/argv/config | Invisible — must be preserved exactly. Concrete (no UI). |
| WS-52 | Three session credential modes | `effective-account` / `system` / `none`, scrubbing askpass when `none` | Concrete, one field on the project settings board. |
| WS-53 | Operation-scoped credential injection | Short-lived clone credentials for the Add Project → Clone flow | Invisible. Concrete (no UI). |

### 2.12 Issues & integrations (catalog 02)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| WS-54 | Integration plugin architecture (account-level) | 12 providers (GitHub, Linear, Jira, GitLab, Plane, Forgejo, Trello, Asana, Monday, Notion, Featurebase, Plain), each with auth methods (form/OAuth/device/CLI-import) | Concrete — the settings-island "workshop" hosts these as connectable tools. OPEN exact visual, Q-SETTINGS. |
| WS-55 | Issues plugin architecture | Per-integration list/search/get-issue, provider-neutral `IssueData` | Invisible, backs WS-56. Concrete (no UI). |
| WS-56 | Issue linking UI | Combobox with provider switcher, live search, "already linked to task X" indicator, description preview | Concrete, restyled control inside the Create Task board. |
| WS-57 | PR selector (linking a PR to a task) | Equivalent picker to WS-56 for a PR instead of an issue | Concrete, restyled. |

### 2.13 File-search exclusion policy (catalog 02, backend)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| WS-58 | Shared exclusion-policy engine | One pattern list feeding three shapes: boolean test, ripgrep globs, watch-ignore globs | Invisible. Concrete (no UI, but see FS-24 for the settings UI on top of it). |

### 2.14 Terminals (catalog 03)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| TR-01 | Interactive terminal panes | Full xterm.js terminal, multi-tab, drag between drawer/pane, native context menu, kill-line/word-jump shortcuts, image paste, OSC 52 clipboard, file-link/URL click, in-terminal search | Concrete — a restyled xterm sits on the wooden board exactly as the spec calls for; theming surface is narrow (6 CSS vars) so restyling is well-scoped. |
| TR-02 | Terminal grid sizing (multi-pane resize) | Keeps several sessions in one pane grid-aligned via measured cell metrics | Concrete, unchanged logic. |
| TR-03 | Off-screen terminal host / instant tab switching | Reparents DOM nodes instead of destroy/recreate; render loop pauses while hidden | Concrete, unchanged — important for perf when many buildings each have a terminal. |
| TR-04 | Terminal persistence via tmux | Sessions backed by a host tmux session, survive app restart/disconnect | Concrete, unchanged. |
| TR-05 | Terminal exit/kill semantics | Process-tree kill with grace period, platform-specific mechanics | Invisible. Concrete (no UI). |
| TR-06 | Shell resolution & selection | Per-host shell picker (system/bash/zsh/fish/cmd/powershell/pwsh/wsl), live availability | Concrete, restyled dropdown. |
| TR-07 | Terminal appearance & behavior settings | Shell, font (searchable, installed-fonts-aware), size, auto-copy, Option-as-Meta | Concrete, on the settings island (font choice may be moot if the board enforces one pixel-matched font — OPEN, Q-TERMFONT 3.18). |
| TR-08 | Terminal environment (theme signaling, agent env) | `COLORFGBG` reflects app theme; allowlisted env forwarded to spawned processes | Invisible. Concrete (no UI) — must preserve the allowlist exactly. |

### 2.15 Preview servers (catalog 03)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| TR-09 | Automatic dev-server URL detection | Watches PTY output for localhost URLs, adaptive TCP probing, auto-close on failure | Concrete backend; surfaces as TR-11 below. |
| TR-10 | Manual port forwarding (SSH workspaces) | Dialog to open a remote-port→local-port tunnel by hand | Concrete, restyled dialog on the board. |
| TR-11 | Preview server pill (task titlebar) | Chip per detected/forwarded server; open in-app or externally, copy URL, restart, stop | Concrete — plausibly a "window with light on" motif for a running dev server. OPEN motif, Q-MOTIF. |
| TR-12 | In-app browser (Emdash Browser) | Webview-backed browser pane with its own toolbar/zoom/history | Concrete, restyled pane, opened from the preview pill or as a board tab. |

### 2.16 Remote & local machines / SSH (catalog 03)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| TR-13 | Add/edit/connect a machine | SSH host form (name/host/port/user/auth type/config alias/proxy/forward-agent), connect/disconnect/retry, sync-local-settings toggle | OPEN — see Q-MACHINES (3.11). |
| TR-14 | Machine status indicator | Small glyph: idle/successful/error/initializing | Concrete, restyled — or replaced by the district-level motif from Q-MACHINES. |
| TR-15 | Host settings (per-machine defaults) | Shell setup snippet, worktree root, tmux-by-default, sync-local-settings, watcher exclusions | Concrete, on the machine's settings board. |
| TR-16 | Workspace server (remote runtime daemon) | Install/start/stop/restart/update a background daemon on the remote host, health badge | Concrete, restyled — reuses the same `UpdateCard` pattern as app self-update (see ST rows). |
| TR-17 | Machine resource monitoring | Live CPU/memory/disk stat cards | Concrete, restyled cards (or an in-world gauge per Q-MOTIF). |
| TR-18 | Host system dependencies | Per-host required/recommended CLI checks (git, ripgrep, node, npm, tmux, curl) with one-click install | Concrete — same "workshop" pattern as AG-11. |
| TR-19 | Machine's conversations/workspaces lists | Per-machine drill-down pages | Concrete, restyled list. |
| TR-20 | Workspace disk usage | Total vs reclaimable ("artifact") bytes per workspace, hardlink-aware | Concrete — shown on the building's board (e.g. "clutter" indicator), see Art List for a possible visual motif. |

### 2.17 Process execution & misc runtime components (catalog 03)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| TR-21 | Bound exec primitive | General run-a-program-and-get-output primitive backing git ops, dependency installs, lifecycle scripts | Invisible. Concrete (no UI). |
| TR-22 | Execution planning / shell quoting | Per-platform argv-vs-shell invocation and quoting | Invisible. Concrete (no UI). |
| TR-23 | Update card (shared component) | Up-to-date / update-available / download-available (progress) / install-available states, reused for app + workspace-server updates | Concrete, restyled card. |
| TR-24 | Script status indicator | Small glyph for lifecycle-script tabs: success/error/in-progress/waiting/cancelled | Concrete, restyled — or folded into the building's under-construction motif (WS-22). |
| TR-25 | Stepped loader | "Step N of M" progress indicator for multi-stage async flows (provisioning, dependency batches) | Concrete, restyled. |
| TR-26 | Runtime broker & host runtime contract | Unified RPC surface serving every host-scoped feature identically whether local or remote-over-SSH | Invisible; the seam that makes remote machines "just work." Concrete (no UI). |

### 2.18 External editor / "Open In" (catalog 04)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| FS-01 | "Open In ▾" catalog (29 apps) | Split-button + dropdown to open a workspace path in an external editor/terminal/IDE, remembers last-used default, filters by remote-support and hidden list | Concrete — a right-click/board action "open in the real world," restyled control. |
| FS-02 | Per-app detection & launch strategy | Bundle-id/PATH/mdfind/vswhere detection; local exec vs remote SSH URI/AppleScript launch | Invisible. Concrete (no UI). |
| FS-03 | "Open path with OS default" | Bare `shell.openPath`, local hosts only | Concrete, folds into FS-01's menu. |

### 2.19 Workspace file tree (catalog 04)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| FS-04 | Virtualized file/folder tree | Browse/expand/collapse, chained single-child-folder compaction | Concrete — the Files board inside a building. |
| FS-05 | Multi-select (click/Cmd/Shift) | Toggle and range selection | Concrete. |
| FS-06 | Preview vs pinned file open | Single-click preview tab, double-click pins | Concrete. |
| FS-07 | Create/rename inline draft rows | New file/folder, rename-in-place, Enter/Escape semantics | Concrete. |
| FS-08 | File tree context menu | Cut/Copy/Paste/Copy Contents/Copy path/Copy relative path/Show in Finder/Rename/Delete, root menu adds New File/Folder | Concrete, restyled menu. |
| FS-09 | Internal drag & drop (move) | Drag rows onto a folder to move, hover-to-expand, drop-target ring, pending-move greying | Concrete. |
| FS-10 | External drag-in (import) | OS files dropped onto a folder import into the workspace | Concrete. |
| FS-11 | Drag-out to compose/elsewhere | Custom drag payload so a file can be attached as chat context | Concrete, feeds AG-51's mentions. |
| FS-12 | Flat-mode listing | Alternate flat alphabetical view with directory label per row | Concrete. |
| FS-13 | Row decoration (git-status badges, tone) | Custom icons/decorations/muted/strikethrough/tone per row | Concrete. |
| FS-14 | File icons by extension | devicon-based per-extension icons | OPEN — do file icons stay literal devicon glyphs on the board, or get a pixel-art icon set matching the kit's palette? Q-MOTIF. |

### 2.20 Search (catalog 04)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| FS-15 | Filename / quick-open search | SQLite-backed substring search, per-root leased index with building/searchable/failed states | Concrete — folds into the global command palette (Q-PALETTE) and/or a board-local search box. |
| FS-16 | Content ("find in files") search | Ripgrep-backed, debounced, cancellable, streaming/progressive results, literal+case-insensitive | Concrete, restyled results tree on the board. |
| FS-17 | Search-results tree | File-grouped collapsible virtualized tree, highlighted match previews, keyboard nav | Concrete, restyled. |

### 2.21 File operations & the open-file store (catalog 04)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| FS-18 | Files RPC contract (fs.*, tree, content) | exists/realPath/readText/readBytes/upload/create/rename/move/copy/delete; live tree; live content (disk or git-ref source) | Invisible. Concrete (no UI). |
| FS-19 | Open-file store (editor tab lifecycle) | Content status (loading/ready/orphaned/error), first-load deadline, linger-after-close, autosave debounce, etag-based save conflicts | Invisible; backs the board's file tabs. Concrete (no UI). |

### 2.22 Viewing & diffing a file (catalog 04)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| FS-20 | File-kind renderer routing (text/csv/markdown/html/svg/image/too-large/binary) | Dedicated renderer per kind | Concrete, restyled on the board. |
| FS-21 | Monaco text editor | Full VS Code-grade editing, minimap, format-on-paste/type, word wrap | Concrete — kept per Q-EDITOR (3.10); restyle chrome only. |
| FS-22 | CSV renderer | Table with sticky header, 1000-row/100-col preview cap | Concrete, restyled. |
| FS-23 | Markdown/HTML/SVG/image renderers | Shared markdown component; raw HTML preview; SVG-as-image; zoomable image | Concrete, restyled. |
| FS-24 | Text diff (Monaco diff editor) | Side-by-side or inline diff, staged/commit/PR/working-tree sources, markdown/HTML preview toggle | Concrete, kept per Q-EDITOR. |
| FS-25 | Inline review comments on diff lines | Comment widget anchored to a diff line (same mechanism as WS-44) | Concrete — same sticky-note motif as WS-44. |
| FS-26 | Stacked multi-file diff view | Several files' diffs stacked with collapsible headers, large-diff threshold | Concrete, restyled. |
| FS-27 | Image diff view | Dedicated before/after viewer, LFS-pointer-aware | Concrete, restyled. |
| FS-28 | Binary diff fallback | "Binary file — no diff available" message | Concrete. |

### 2.23 Diagrams & images (catalog 04)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| FS-29 | Mermaid inline + standalone viewer | Inline SVG preview with expand button; standalone pre-rendered-SVG dialog | Concrete, restyled. |
| FS-30 | Image viewer (contained/expandable/standalone/zoom-pan chassis) | Auto-fit, dynamic zoom bounds by content size, wheel/double-click zoom, keyed remount on content change | Concrete, restyled chrome. |

### 2.24 File watching & disk (catalog 04)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| FS-31 | Shared file-watching service | Deduplicated native watcher per (root, ignore-set), gap/resubscribe recovery, remote-host proxying | Invisible — is why the tree/board updates live when an agent edits files. Concrete (no UI). |
| FS-32 | Exclusion policy settings UI | Three textareas (tree/search/watcher excludes) with per-field reset and a watcher-cost warning | Concrete, on the project settings board. |
| FS-33 | Disk usage measurement | Recursive walker computing apparent/disk/exclusive/artifact bytes, hardlink-aware | Concrete — same data as TR-20. |
| FS-34 | Directory selector (in-app column browser) | Finder-style navigate/filter/select/create-folder picker, git-repo detection per row | Concrete, restyled — used throughout Add Project/task-creation flows. |
| FS-35 | Workspace path containment (security) | Real-path symlink-aware containment check on every write; typed refusal errors | Invisible — must be preserved exactly. Concrete (no UI). |

### 2.25 Settings — structure & storage (catalog 05)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| ST-01 | 13 settings pages (General, Integrations, Interface, Browser, Repository, Prompts, System, Workspaces, Conversations, Agents/CLIs, MCP, Skills, Machines) | Full settings surface, sidebar nav + search + breadcrumb drill-down | OPEN — this is Q-SETTINGS (3.6), the single biggest open design question. |
| ST-02 | Settings storage model (SQLite override + safeStorage secrets) | Field-level overrides deep-merged onto code defaults; secrets in OS keychain via Electron `safeStorage` | Invisible. Concrete (no UI) — must be preserved; Linux keyring-unavailable failure state needs a village-appropriate error surface. |
| ST-03 | Provider/integration accounts registry | One row per external account, encrypted credential ref, one default per provider | Invisible, backs WS-54/AG-10. Concrete (no UI). |

### 2.26 The 15-key AppSettings schema (catalog 05)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| ST-04 | `tasks` settings (7 fields: auto-name, auto-approve, auto-trust, create-branch, delete-branch, capitalization, issue-context) | Task-creation defaults, switch rows | Concrete, settings-island board. |
| ST-05 | `project` settings (push-on-create, branch prefix, random suffix, tmux-by-default) | Repository/branch defaults | Concrete, on Repository settings board. |
| ST-06 | `localProject` settings (default projects dir, default worktree dir) | Machine-wide filesystem fallbacks, no dedicated UI today (INFERRED set via file pickers) | OPEN whether it gets an explicit village control or stays implicit. |
| ST-07 | `defaultAgent` setting | Which agent CLI is preselected for a new task | Concrete, single selector on the settings island. |
| ST-08 | `keyboard` overrides | Per-command rebind map, reserved/error/shadowing conflict severities | OPEN — see Q-KEYBOARD (3.14). |
| ST-09 | `notifications` settings (enabled, sound, custom sound path, OS notifications, sound-focus-mode) | Notification behavior | OPEN — see Q-NOTIFY (3.15). |
| ST-10 | `theme` setting | System/Light/Dark; underlying package also defines Solarized ×2 + compact density, unwired | OPEN — a pixel-art village likely has a fixed art style; does "theme" even survive? Q-THEME (3.19). |
| ST-11 | `openIn` settings (default + hidden apps) | Which external tool is default/shown for FS-01 | Concrete, settings-island board. |
| ST-12 | `interface` settings (task-hover action, auto-right-sidebar, 3× show-left-sidebar-metadata switches, hide-context-bar) | Misc UI toggles, several with no discovered settings-card UI today | OPEN — several of these (sidebar metadata, context bar) presuppose a conventional sidebar/context-bar that may not exist in the village; see Q-SIDEBAR (3.4). |
| ST-13 | `terminal` settings (font family/size, auto-copy, mac-option-as-meta, default shell) | Terminal appearance/behavior | Concrete, settings-island board; font choice possibly moot per Q-TERMFONT. |
| ST-14 | `browserPreview` / `browser` settings (profiles, CORS relax, clear-data) | In-app browser profile management, per-profile storage clearing | Concrete, restyled cards. |
| ST-15 | `changesViewMode` setting (flat/tree per section) | List-vs-tree toggle for changed-files sections, no dedicated settings card (INFERRED set from the panel toolbar) | Concrete, inline board toggle, not a settings-page row. |
| ST-16 | `remoteMachine` install-source setting | Workspace-server artifact base URL, no user-facing UI (ops-only) | Concrete — stays a build/ops config, no village surface needed. |

### 2.27 Per-agent, MCP, skills, automations, per-project settings (catalog 05)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| ST-17 | Per-agent-provider config (extra CLI args, env vars) | Override store keyed by agent id | Concrete, per-agent detail sheet on the settings island. |
| ST-18 | Per-agent executable override | Pin a CLI to an absolute path/PATH command, disables auto-update, has a Validate step | Concrete, same detail sheet. |
| ST-19 | MCP server management (catalog + custom) | Per-server config (transport, command/args or url/headers, env, oauth), Connected/Available grids | Concrete — "workshop" pattern, settings island. |
| ST-20 | MCP "sync to agents" | Explicit per-server set of agent CLIs it's registered with, chip list + picker + sync-all shortcut | Concrete, same board. |
| ST-21 | Skills catalog | Install/browse across 4 sources (openai/anthropic/skillssh/local), detail modal, create-local-skill flow | Concrete — "workshop" pattern; a shelf-of-skills motif is plausible (Art List candidate). |
| ST-22 | Automations (scheduled/cron agent runs) | Per-project cron-triggered conversations with a full task/workspace config, run history, template catalog | Concrete — OPEN motif: a scheduled/automated villager (a "night shift" worker)? Q-MOTIF. |
| ST-23 | Per-project settings — provenance model | Every resolved field shows set/inferred/broken/unresolvable, with a reset-to-inferred action | Concrete UI pattern to preserve; restyled badge. |
| ST-24 | Per-project "base" settings (GitHub account, worktree root, default branch, base/push remote, git-credential mode, tmux) | Project-level overrides of app defaults | Concrete, district settings board. |
| ST-25 | Per-project "shareable" settings written to `.emdash.json` | Preserve patterns, shell setup, prepare/setup/run/teardown scripts, auto-run toggles, multi-scope override sources | Concrete, district settings board — scripts are a strong "recipe/instructions on the board" motif. |
| ST-26 | Config import ("migrate from Conductor/Superset/Paseo/Codex") | Detects and offers to migrate other tools' project config | Concrete, inline prompt after WS-01/02/03. |
| ST-27 | Per-project environment variables | Host-local key/value list for terminals/scripts/agents, not shared | Concrete, district settings board. |

### 2.28 Accounts, integrations, auth (catalog 05)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| ST-28 | Emdash account (sign-in/out, session states) | Loading/signed-in/expired/no-account/server-unavailable states | Concrete, settings-island "town hall" board. |
| ST-29 | GitHub accounts (multi-account) | Per-account default badge, credential-source badge, set-default, remove-with-usage-warning | Concrete, same board. |
| ST-30 | Three ways to connect GitHub | OAuth via Emdash account, `gh` CLI import, manual device-code flow | Concrete, restyled modal. |
| ST-31 | Other issue-tracker integrations (12 providers) | Generic setup form, connection status, host-mismatch/token-missing/auth-required error states | Concrete, "workshop" pattern. |
| ST-32 | SSH machine connections (form + validation) | Full connection form incl. SSH-config-alias autofill | OPEN — see Q-MACHINES. |

### 2.29 Keybindings (catalog 05)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| ST-33 | Full keybinding catalog & conflict model | User-editable vs fixed vs no-default commands; chord grammar; reserved/error/shadowing severities | OPEN — see Q-KEYBOARD (3.14) for whether/how a village app keeps a keyboard-shortcuts surface at all. |

### 2.30 App-level (updates, telemetry, config file) (catalog 05)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| ST-34 | App self-update flow | Up-to-date/available/downloading/install-ready states, Check-for-Updates button | Concrete — reuses the `UpdateCard` pattern (TR-23), restyled; possibly a "new supplies arrived" motif. |
| ST-35 | Telemetry consent | Persisted opt-out, envDisabled/no-keys/normal states, self-logging the toggle | Concrete, settings island. |
| ST-36 | `.emdash.json` (the one per-repo config file) | preservePatterns/shellSetup/scripts, lenient parse, external-edit watch | Invisible; backs ST-25. Concrete (no UI). |

### 2.31 Screens & app shell (catalog 06)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| UI-01 | Boot splash | Static themed splash before any bundle executes; watchdog escape hatch (Restart/Open Recovery) | Concrete — becomes the island's own boot moment (fade-in on the water?), watchdog UI kept functionally, restyled. |
| UI-02 | Recovery window | Separate native window shown on fatal boot failure; crash reason, log file, updater controls | Concrete — deliberately NOT diegetic (per catalog's own framing: this is triage, not product); keep as a plain utility window. |
| UI-03 | Onboarding (sign-in + legacy-data import) | First-run flow, steps computed once and frozen | Concrete — the very first thing a new user sees before the island exists; needs its own diegetic or plain framing. OPEN, Q-ONBOARD (3.20). |
| UI-04 | Welcome screen | One-time animated splash with a "Start shipping" button | Concrete — natural fit for "here is your empty island," restyle only. |
| UI-05 | Home view | Landing view with 4 add-project actions (open/create/clone/remote) | Superseded by clicking the campfire (per the 2026-09-05 spec) — the 4 actions become tabs/modes of that one flow (WS-01/02/03 + remote). Concrete. |
| UI-06 | Project view — header & actions menu | Icon+name, remote link, Open-In menu, Rename/Remove | Concrete — district-level board header. |
| UI-07 | Project view — section tabs (Tasks/PRs/Workspaces/Settings) | Four pill-tabs switching the district board's content | OPEN — see Q-WORKBENCH (3.1) for whether Workspaces stays a tab or becomes implicit. |
| UI-08 | Project view — non-ready states (creating/hydrating/context-error) | Dedicated panels incl. Retry/Remove | Concrete — district-level "under construction"/"storm" states. |
| UI-09 | Task titlebar — breadcrumb + git popover | Project/task name, branch, fetch/pull/push/publish with counts, issue-link combobox | Concrete, board header. |
| UI-10 | Task titlebar — activity/preview/open-in/drawer-toggle/sidebar-toggle | Right-side cluster of status and view controls | Concrete, board header row. |
| UI-11 | Task main column — split-pane tab workbench | Any number of resizable panes, draggable/splittable tabs, 6 tab kinds (Conversation/ACP chat/File/Diff/Terminal/Browser) | **The single hardest surface to port.** OPEN — see Q-WORKBENCH (3.1). |
| UI-12 | Task main column — bottom terminal drawer | Collapsible drawer of terminal tabs, draggable in/out of panes | Concrete but entangled with UI-11's resolution. |
| UI-13 | Task sidebar — 3-way toggle (Conversations/Changes/Files) | Collapsible resizable right panel | Entangled with UI-11; likely folds into board tabs rather than a persistent sidebar. OPEN, Q-WORKBENCH. |
| UI-14 | Task view — non-ready states (creating/provisioning/missing/teardown) | Full-panel states with stage labels and recovery actions | Concrete — maps directly onto the building's under-construction art. |
| UI-15 | Automations view | List of scheduled automations, detail sheet, run history, template rail | Concrete, own board/district feature — see ST-22. |
| UI-16 | Settings view | Full-page nav+content, search-filters-nav, breadcrumb drill-down | OPEN — Q-SETTINGS. |

### 2.32 Navigation model (catalog 06)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| UI-17 | Typed view router (5 views) | `navigate(viewDef(params))`, zod-typed params per view | Concrete backbone; the village's own camera/board state becomes the "view." |
| UI-18 | Back/forward history | Real navigation-history stack, `Mod+[`/`Mod+]` | Concrete — camera "returns" to the previous board/zoom state. |
| UI-19 | Sidebar tree for projects/tasks | Persistent virtualized project/task list, pinned-tasks strip, drag reorder, context menu | OPEN — see Q-SIDEBAR (3.4): is there ANY always-visible list view, or is the island itself the only index? |
| UI-20 | Tabs for multi-session work inside a task | Two-level nav: sidebar/back-forward moves between tasks, tabs/panes move between views on one task | Entangled with Q-WORKBENCH. |
| UI-21 | Command palette as navigation shortcut | `Mod+K` fuzzy search over projects/tasks/commands/conversations/files | OPEN — see Q-PALETTE (3.2). |
| UI-22 | In-app deep linking (tab-scoped location) | Per-tab `location` params restore not just which task but which tab was open | Concrete — needs a village-side equivalent (restore camera + board state on relaunch). |
| UI-23 | Redirects on missing id | Opening a nonexistent task/project redirects to parent/home rather than erroring | Concrete. |
| UI-24 | No OS deep-link scheme (confirmed absent) | External `emdash://` links are not supported today | Concrete — nothing to preserve; note for Risks if ever wanted. |

### 2.33 Global affordances (catalog 06)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| UI-25 | Command palette (`cmdk`-based) | Fuzzy modal over 5 source types, keyword-scoped provider chips | OPEN — Q-PALETTE (3.2). |
| UI-26 | Keyboard shortcuts (full default set) | ~35 rebindable defaults across app/tab/task/file-tree scopes | OPEN — Q-KEYBOARD (3.14). |
| UI-27 | Native application menu | Full macOS/Win/Linux menu bar, accelerators synced to user rebinds | Concrete — kept as real OS menu (village doesn't replace OS chrome); content needs auditing against the new feature set once UI-11 is resolved. |
| UI-28 | System tray | Persistent tray icon, Open/Quit, hide-not-quit on window close | Concrete, kept as-is; icon art becomes a small pixel-art mark. |
| UI-29 | Window management (per-platform titlebar/frame) | Native inset titlebar (mac), frameless custom titlebar (Linux), native frame (Windows), single-instance lock | Concrete, kept — orthogonal to the in-canvas UI. |
| UI-30 | Drag and drop — OS folder → sidebar | Drop-to-add-project overlay, inspects and adds each valid directory | Concrete — becomes drop-onto-the-island-to-found-a-project. |
| UI-31 | Drag and drop — workspace file → composer/tree | Custom MIME + in-memory fallback for attaching file context | Concrete, unchanged mechanism, restyled visuals. |
| UI-32 | Drag and drop — tabs | Reorder/split via `@dnd-kit`, floating drag preview | Entangled with Q-WORKBENCH. |
| UI-33 | Drag and drop — terminal tabs | Drag out of drawer into a pane and back | Entangled with Q-WORKBENCH. |
| UI-34 | System notifications | Native OS banners, one per group key, click focuses app and navigates to the target | OPEN — see Q-NOTIFY (3.15): does a running villager ALSO need an OS notification, or does the map's ambient state replace it? |
| UI-35 | Toasts | App-wide transient success/error messages | OPEN — see Q-ERRORS (3.16): toasts vs in-world equivalents. |
| UI-36 | The full modal catalog (30 modals) | Command palette, confirm-action, external-link gate, unsaved-changes guards, feedback, Create/Rename/Delete Task, addRemote, Add/Rename/Relink Project, share/import project config, directory selector, create conversation, create/detail skill, create PR, conflict dialog, add machine, link conversation, integration setup, GitHub connect/device-flow, agent sign-in, prompt library, dev process panel | Every one of these 30 needs an explicit disposition (kept-as-modal-on-wood vs replaced by an in-world flow). Enumerate individually when cutting tickets — see Build List item B4-09. OPEN in aggregate, concrete case-by-case. |

### 2.34 Ambient indicators (catalog 06)

| # | Feature | What it does | Village appearance |
|---|---|---|---|
| UI-37 | Agent status dots (sidebar) | 5-state dot cluster per task row | Superseded by the villager's own on-map animation; a list-view equivalent only needed if Q-SIDEBAR keeps any list. |
| UI-38 | Activity badge (workspace lifecycle) | Same as WS-22 — listed here for its titlebar placement | Concrete, see WS-22. |
| UI-39 | Diff stats and PR badges (sidebar rows) | Live +/− counts and PR badge per task | OPEN placement — Q-SIDEBAR. |
| UI-40 | Preview-server pills (titlebar) | Same as TR-11 | Concrete, see TR-11. |
| UI-41 | Connection status dot | Small colored dot for SSH/remote connectivity | OPEN — folds into Q-MACHINES's district/motif answer. |
| UI-42 | Update indicator (sidebar footer) | Version number, swaps to Update button | Concrete — moves to the settings-island board. |
| UI-43 | Context-usage indicator (composer) | Same as AG-45 | Concrete, see AG-45. |
| UI-44 | Boot/crash telemetry (not user-facing) | Window focus/blur + DAU events | Invisible. Concrete (no UI). |

---

## 3. Open design questions

Every place the village metaphor does not obviously have an answer. Each is stated with the options as seen and a recommendation — these are calls for Kirubel to make, not settled by this document.

### Q-WORKBENCH (3.1) — The task workbench: split panes, tabs, 6 tab kinds
**DECIDED. One board.** Emdash's task view is a VS-Code-style workbench: any number
of resizable panes, each with a draggable tab strip, tabs of 6 kinds (Conversation,
ACP chat, File, Diff, Terminal, Browser), plus a collapsible bottom terminal drawer
(catalog 06 UI-11/12/13). We are not reproducing that, and the fact that it exists
upstream is not an argument that we must. This app is deliberately simpler and
cleaner than emdash: you open it and you see the village, and opening a building
brings in ONE board.

The board holds one thing at a time and you change what is on it. Everything the
six tab kinds do still has to be reachable, so the open work is how you switch what
the board is showing without a tab strip stapled along its top edge, and without
spawning a second board. Propping several boards around the district was considered
and rejected: it is clutter, and it re-imports a desktop-IDE layout in costume.

Still open, and the actual design work here:
- How you change what the board shows. Candidates: an in-world object per view
  (the building's door for conversation, a workbench for files, a hearth for the
  terminal), a physical page-turn on the board itself, or a small carved selector
  on the board's frame.
- Whether the terminal is on the same board as everything else or is its own
  in-world place inside the building.
- What happens when a user genuinely needs two things at once (a diff while reading
  the agent's message). Deliberately NOT answered by a second board. Measure whether
  it is a real need first.

Internally, keep views as first-class addressable things so what the board shows is
a value, not a layout. That keeps every option above cheap without committing to any
of them in the art.

### Q-PALETTE (3.2) — Command palette
`Mod+K` fuzzy search over projects/tasks/commands/conversations/files (UI-21/25) is core muscle memory for a power-user coding tool, and arguably in tension with "everything is diegetic."
- **Option A — keep it, un-diegetic, as an escape hatch.** A power-user shortcut that overlays the village, admittedly breaking the metaphor, justified as "the terminal is real too."
- **Option B — reframe it as an in-world object** (a town crier, a notice board you can always summon) that still opens the same fuzzy list.
- **Recommendation:** Option A for the MVP — the terminal and Monaco are already precedent for "some surfaces stay literal tools"; revisit only if playtesting shows the overlay breaks immersion badly.

### Q-STATUS (3.3) — The exact visual language for agent status
Today: a 5-state dot cluster (idle/working/awaiting-input/completed/error, AG-18/UI-37) plus an unread "seen" flag. The villager is supposed to carry this. Catalog 08/09 confirm the kit has zero walk-cycle/animation frames for any character and zero precedent for "thinking"/"error" poses; the closest in-kit precedent is a binary lit/unlit state (Lantern, Shrine).
- **Option A — animation-only.** Distinct walk/idle/work/error poses per state (biggest art cost, most legible, most "alive").
- **Option B — overlay glyph.** One base character + a small icon/speech-bubble overlay per state (cheapest, reuses the lit/unlit precedent, less alive).
- **Option C — hybrid.** A modest idle/walk cycle (2 states) plus overlay glyphs for the rest.
- **Recommendation:** Option C — the character needs *some* motion to read as alive at all (catalog 09's own conclusion), but 5 fully-animated states is a large, open-ended art commission; overlay glyphs cover the rest cheaply and extend the kit's own on/off-state precedent.

### Q-SIDEBAR (3.4) — The always-visible project/task sidebar
Today: a persistent virtualized project+task tree with a pinned-tasks strip, always on screen (UI-19). This is the primary navigation for a user managing many concurrent tasks and is in direct tension with "the island IS the index."
- **Option A — no persistent sidebar; the island is the only index.** Purest to the concept; harder to see 20 tasks' status at a glance, harder to jump directly to a specific task without visually finding it.
- **Option B — a collapsible list, off by default.** A conventional list panel reachable by a keybind/edge-drag, for power users, not shown by default.
- **Option C — an in-world index object** (a board at the camp, a ledger) that lists tasks/status textually but is itself part of the world.
- **Recommendation:** Option C for parity with "everything is diegetic," falling back to Option B behind a keybind for anyone managing more tasks than fit legibly on the island — needs prototyping before committing (see Risks 6.2).

### Q-STAGE-METRIC (3.5) — What drives a project's growth stage
The 2026-09-05 spec explicitly defers this ("a manual stage control now; a hook for commit count or repo size comes later"). It's still open and affects a lot of downstream work (villager behavior, when a building "levels up").
- **Option A — manual control**, as the spec currently has it.
- **Option B — commit count / repo size**, as the spec suggests as a future hook.
- **Option C — task/session activity** (how many tasks, how much agent time spent) — arguably closer to "an agentic coding tool" than raw commit count.
- **Recommendation:** ship Option A now (already decided), design Option C as the real metric before B, since this app's core object is agent sessions, not commits.

### Q-SETTINGS (3.6) — The settings surface: 13 pages, ~50+ fields, dozens more via MCP/skills/automations
This is a full desktop-app settings surface (catalog 05). The spec calls for "an island with a big windmill." That's a strong visual anchor but says nothing about how 13 pages of forms live inside it.
- **Option A — the windmill is one building with an internal tabbed board**, effectively Option A of Q-WORKBENCH applied to settings: one board, a tab strip for the 13 areas.
- **Option B — the settings island has multiple structures**, one per settings domain (a workshop for agent CLIs/dependencies, a town hall for account/GitHub, a shed for terminal/interface prefs), each opening its own smaller board.
- **Recommendation:** Option B — settings naturally cluster (this ledger's ST rows already group into "workshop"/"town hall"/plain prefs), and multiple small structures reads better on an island than one mega-tabbed form; several ledger rows above already assume this ("workshop" appears repeatedly).

### Q-PLOT-CAPACITY (3.7) — More projects than the island has hand-drawn plots
The spec starts with six plots, expandable "by drawing more plots later." A real user's project count is unbounded over time (and Emdash supports remote machines too).
- **Option A — hard cap**, extra projects wait in a queue/dock until a plot is freed or drawn.
- **Option B — the island keeps growing** (new landmass drawn/generated as needed) — but the spec explicitly rejected runtime generation ("nothing generated at runtime... a general village generator... never looked like the artist's").
- **Option C — a second island reachable by boat/bridge** once the first is full, itself hand-drawn, repeating as needed.
- **Recommendation:** Option C — consistent with "everything hand-drawn," gives a natural, low-cost answer to unbounded growth (draw island #2 when #1's dozen plots are full), and a boat/bridge motif also answers Q-MACHINES.

### Q-TASK-DENSITY (3.8) — More tasks (buildings) than a district's stage-5 art has room for
Symmetric problem to 3.7 one level down: a district's stage-5 layout is one of the artist's own finished settlements, hand-fit. A project can have many more worktrees/tasks than that settlement has buildings.
- **Option A — cap visible buildings**, extra tasks live in an in-world "records office"/overflow list for that district.
- **Option B — buildings get denser/smaller** procedurally as task count grows past what the art shows — rejected by the same "nothing generated at runtime" principle unless it's just picking among a few hand-drawn density variants per district.
- **Recommendation:** Option A, mirroring Q-PLOT-CAPACITY's answer; keep it consistent so both district-count and building-count overflow resolve the same way (a small in-world "more" affordance, not procedural generation).

### Q-RETRACT (3.9) — Deleting a project or task: does land/a building physically go away?
WS-06 (delete project) and WS-23 (delete task) exist today as destructive actions. Growth stages only ever go up in the spec as written.
- **Option A — land retracts / buildings are removed**, symmetric with growth, but needs art for "shrinking" a district and was explicitly out of scope for the first spec pass.
- **Option B — the building/district goes derelict/abandoned in place** (a ruin, boarded windows) rather than vanishing — cheaper (one art state, not a reverse-growth sequence) and arguably more true to "your history is still your history."
- **Recommendation:** Option B for the near term (far cheaper, avoids needing reverse-growth art for all 5 stages), revisit true retraction only if it becomes a frequent user complaint.

### Q-MACHINES (3.10) — Remote/SSH machines
A project can live on a remote host, and Emdash has a whole "Machines" settings area (TR-13 through TR-20, WS-04). Nothing in the village metaphor addresses this yet.
- **Option A — invisible.** Machine is just project metadata; no in-world representation at all, purely a settings-island concern.
- **Option B — a second island per machine**, reachable by boat (also answers Q-PLOT-CAPACITY's overflow case) — districts on a remote machine's island look visually distinct (weather, palette shift) to signal "this is elsewhere."
- **Recommendation:** Option B — a boat/second-island motif does double duty for both plot overflow and remote-machine identity, and gives connection-state (connecting/connected/offline) a natural visual (the boat at sea vs docked vs storm-bound).

### Q-EDITOR (3.11) — Keep Monaco, or replace it
Catalog 04 flags Monaco as "the single biggest UI dependency... multi-megabyte... rebuilding without it means giving up multi-cursor editing, the side-by-side diff editor, inline PR-style comments, minimap."
- **Option A — keep Monaco**, restyle chrome only (background/gutter/selection colors to wood-adjacent tones), accept the weight.
- **Option B — replace with a lighter code viewer/editor** for read-mostly use, losing the listed capabilities.
- **Recommendation:** Option A — this is a coding tool; a materially worse editing/diff experience is a regression users will feel immediately, and the weight cost is a one-time load, not a per-frame cost.

### Q-TERMFONT (3.12) — Terminal font as a user setting, inside a pixel-art frame
TR-07/ST-13 let users pick any installed font at any size 8–32px for the terminal. A wooden-board frame with a specific pixel-art aesthetic may not tolerate arbitrary fonts gracefully.
- **Option A — keep the setting**, let the board frame around whatever font renders inside it.
- **Option B — pin one bitmap/monospace font** that matches the kit's pixel aesthetic, drop the picker.
- **Recommendation:** Option A — font choice is a real accessibility and preference need for a text-heavy surface (this is exactly the "text-heavy content" risk in section 6); keep the setting, just constrain the frame's own chrome, not the terminal's content font.

### Q-MCP (3.13) — MCP servers as a village object
AG-07/ST-19/ST-20 are a real, moderately complex settings surface (catalog + custom + per-agent sync). No obvious in-world metaphor exists.
- **Recommendation:** fold into Q-SETTINGS's "workshop" building (Option B) as one of its boards; no separate in-world object needed — this is a configuration surface, not something that benefits from being spatial.

### Q-KEYBOARD (3.14) — Keyboard shortcuts surface
~35 rebindable defaults (UI-26/ST-33) with a real conflict-detection model. A village app still needs this for power users (renaming, saving, tab navigation, etc.), but "which panel holds it" depends on Q-WORKBENCH/Q-SETTINGS.
- **Recommendation:** keep the full rebinding UI verbatim (it's a solved, well-designed system per catalog 05), house it in the settings-island "workshop" alongside AG-11/TR-18's tool-install pattern; do not attempt to make individual shortcuts diegetic.

### Q-NOTIFY (3.15) — System notifications vs in-world signals
UI-34/ST-09: native OS banners today, click-to-focus-and-navigate. A village where a villager's animation already shows "awaiting input" raises the question of whether OS notifications are still needed when the app isn't focused.
- **Option A — keep OS notifications as the only "you're not looking" signal**, unrelated to the map.
- **Option B — OS notification when unfocused, in-world visual only when focused** (matches the existing `soundFocusMode: 'unfocused'` setting's intent).
- **Recommendation:** Option B — it's already the existing default behavior pattern (sound-focus-mode already distinguishes focused/unfocused), just extend the same rule to the visual channel.

### Q-ERRORS (3.16) — Toasts and disabled-action reasons vs in-world states
UI-35/WS-07/WS-27/AG-21: today, unreachable hosts, failed operations, and stale data all surface via toasts or disabled-with-tooltip UI. The ledger repeatedly proposes in-world equivalents (fog, storm cloud, closed gate) without a settled visual language.
- **Recommendation:** needs its own small design pass before Build List phase 4 (see B4-01): define a short, consistent set of district/building-level "trouble" states (2-4 states covering unreachable-host, stale-data, script-failure, provisioning-error) with one visual treatment each, used everywhere WS-07/WS-27/AG-21 apply, rather than inventing a new motif per feature.

### Q-MOTIF (3.17) — Small per-feature in-world motifs
A cluster of features flagged OPEN above for a specific visual metaphor rather than a structural question: context-usage meter (AG-45), permission-request waiting (AG-49), PR creation (WS-49), preview-server-running (TR-11), automations/scheduled runs (ST-22), file icons (FS-14).
- **Recommendation:** batch these into one small design session once the core structural questions (Q-WORKBENCH, Q-SETTINGS, Q-STATUS) are settled — they're independent, low-risk, and best designed together for visual consistency rather than one at a time.

### Q-THEME (3.18) — Light/dark theme in a fixed pixel-art world
ST-10: today users pick System/Light/Dark (plus two unwired Solarized variants). A hand-painted village has one committed art style; "dark mode" for pixel art usually means something different (a night palette) than a CSS theme swap.
- **Recommendation:** drop the CSS-theme concept for the world itself; if a day/night palette is wanted later it's a rendering feature (time-of-day tinting), not a settings toggle — but the wooden-board panels (terminal, Monaco, chat) still need their own light/dark for text-heavy legibility, so keep theme as a board-only setting, not a world setting.

### Q-ONBOARD (3.19) — Onboarding and the very first launch
UI-03/UI-04: sign-in + legacy-data-import steps, then a one-time "Start shipping" splash, all before the island exists in any project-populated sense.
- **Recommendation:** treat as pre-village chrome, deliberately not diegetic (same reasoning as the Recovery window, UI-02) — a new user hasn't earned an island yet; keep these as clean, plain screens and let the empty island (with just the campfire) be the actual "welcome."

### Q-MULTIWINDOW (3.20) — Multiple windows / multi-monitor
Not explicitly catalogued as a current Emdash feature (single-window app per catalog 06), but worth naming: does the village ever open a second window (e.g. for a second monitor), and if so what does a second island look like?
- **Recommendation:** out of scope for the MVP; single window only, matching current Emdash behavior and the spec's own "out of scope" list.

---

## 4. The build list

Every distinct piece of engineering work, grouped into phases that make sense as an order of execution. Each entry names what "done" looks like. Traceable to catalog 07 (wire seam) and catalog 08 (renderer) primarily, with catalog 06 features folded in per Q-WORKBENCH/Q-SETTINGS once those are decided.

### Phase 0 — Fork & back-end plumbing

- **B0-01. Fork Emdash, delete the front end.** Remove `apps/emdash-desktop/src/renderer/**` and `apps/emdash-desktop/src/core/features/**/browser/**`; keep everything under `packages/wire`, `packages/core`, and every `**/api/**` and `**/node/**` directory untouched. Done: the app still boots to a blank/placeholder window with the back end fully wired (all 39 domain controllers registered, `bootControllers()`'s parity assertion still passes).
- **B0-02. Stand up a non-React wire client bootstrap.** Catalog 07 Q4 identifies the Electron-preload port-acquisition code (`seed-desktop-wire.ts`) and the 39 per-domain `browser/client.ts` factories as React-app-specific glue that must be reimplemented. Done: a minimal script can call any of the 39 domain contracts (e.g. `projectsWireContract.projectList`) from the new renderer process and get live data back, with the exact same reconnect/resync guarantees catalog 07 §5 describes (gap detection, generation bump, automatic re-attach).
- **B0-03. Read the ACP reducer's actual output shape before committing to reuse it.** Catalog 07 Q4 item 4 flags this as unverified — `packages/core/src/runtimes/acp/api/reducer/*` may or may not hand back UI-ready DOM-shaped strings vs. structured data a canvas renderer needs. Done: a short written finding (structured vs. rendered) that the chat-transcript renderer work (Phase 4) is scoped against.
- **B0-04. Decide and build the transport for a canvas/game front end.** Catalog 07 Q4 item 1: Electron's `dom-port` transport is what today's React app uses; a differently-hosted renderer (even if still inside the same Electron app, just a different bundle) needs an explicit choice among wire's five transports. Done: transport chosen and documented, with a working round-trip test.

### Phase 1 — World & state model

- **B1-01. Extend `world.json`/`plots.json` from a fixed six-plot demo to a live, arbitrarily-many-project model.** Today's world file (per the 2026-09-05 spec) is hand-authored for six plots at five stages. It needs a schema that can represent N real projects, each mapped to a plot, each carrying a live stage. Done: `world/plots.json`'s shape supports assigning an arbitrary real `projectId` to a plot and reading/writing that mapping, without touching the hand-drawn tile/object data.
- **B1-02. Replace `projects.json` (local, gitignored, hand-rolled) with the real backend project list.** The spec's `projects.json` was a placeholder; the fork's actual project data is the wire `projects` domain contract's live model. Done: the plot-assignment UI reads/writes against `projectsWireContract`'s live data, not a flat local JSON file.
- **B1-03. Build the plot-allocation algorithm.** Given N live projects and a fixed hand-drawn set of plots (growing to a second island per Q-PLOT-CAPACITY), decide which project gets which plot, in what order, including the "new project offered free plots whose parent is on the map" rule the spec already states for growth-from-camp. Done: a pure function, tested, that assigns plots deterministically as projects are added/removed, with an explicit policy for the overflow case from Q-PLOT-CAPACITY.
- **B1-04. Task-to-building mapping.** Each task/worktree within a project becomes a building; districts' stage-5 art has a fixed building count per catalog 09's constraints. Done: a mapping function from live task list → building slots, with the overflow policy from Q-TASK-DENSITY implemented.
- **B1-05. Wire the stage-driving metric.** Ship the manual control from the spec (Q-STAGE-METRIC option A) first; leave a clean seam for option C (task/session-activity-driven) to replace it later without touching the renderer. Done: stage is read from one function whose implementation can change without touching any other system.
- **B1-06. Villager-to-session mapping.** Each live agent session (conversation) becomes a villager instance tied to a task/building. Done: a spawn/despawn function keyed by conversation id, backed by AG-13/14/17's lifecycle events, that never leaves an orphaned villager after a session ends or the app restarts.

### Phase 2 — Renderer & camera (catalog 08's Build List, items 1–10, folded in)

- **B2-01. Bootstrap the live client app shell on the Pixi stack.** Replace `app/`'s `<img>`-panning page with a page booting Pixi + `pixi-viewport` per `editor/src/main.ts`, stripped of editor/brush tooling. Done: loads in a browser, renders the current island state via Pixi at the same visual fidelity as today's baked PNG.
- **B2-02. Port `world/state.py`'s state resolution to TypeScript.** `parse_state`, `effective` (ancestor-lane rule), `land_of`/`new_of`/`filter_layout`/`visible`. Done: given a state string and `world.json`, the client computes the same visible tile/object set Python does, golden-tested against `state.py`.
- **B2-03. Bring the shore/dress pass client-side.** Re-bundle `world/shore/entry.ts`'s logic (the editor's own `Ground.erase`/`weave.ts`/`redress.ts`) for the browser, behind a Web Worker. Done: given a land-cell set, produces cell-for-cell-identical output to `shore.mjs` today.
- **B2-04. Unify the two `nav` schemas.** `world/network.py` emits `{roads, pieces, piece_rows, spots}`; the editor's composer/`npc.ts` expects `{walkable, roads, settlements[...]}`. Per this project's own "one question, one implementation" rule (CLAUDE.md), pick one shape and one producer. Done: `Villagers.spawn()` accepts the live client's nav output unmodified.
- **B2-05. Client-side district composition ("grow a plot").** Combine B2-02 through B2-04 into one `compose(state) → DrawItem[]` path, patching the scene graph in place via `SceneGraph.insert`/`removeObject` instead of asking a server for a new PNG. Done: changing a project's stage updates the live scene with no reload and no server round-trip for pixels.
- **B2-06. Sprite atlas packing.** No packed atlas exists today — 1,031 loose PNGs. Build an offline packing step (terrain/buildings/plants/props/character atlases) consumed transparently by `render.ts`'s existing texture lookup. Done: initial district view loads via a handful of atlas requests, not 100+ individual fetches.
- **B2-07. Progressive/scoped sprite loading.** Extend `loadSprites()` to load only the visible districts' sprite set, with background prefetch for districts about to come into view. Done: cold load doesn't fetch the whole kit; approaching an unloaded district shows no visible pop-in at normal camera speed.
- **B2-08. Animated camera transitions.** Add tweened `pixi-viewport` moves (the library ships an unused `animate()` plugin) for "zoom into a district" and "return to the island." Done: clicking a district animates the camera instead of a jump cut, and back again.
- **B2-09. District/plot hit-testing.** Port `app/app.js`'s dead `plotAt`/`inRows`/`bboxOf` logic (or the `world/plots.json` footprint data it reads) against `viewport.toWorld()`, extracting `Editor`'s private `toWorld`/`cellAt` helpers to a shared module. Done: clicking present-district ground opens the right project, clicking open sea does nothing, `SceneGraph.pick` still resolves individual objects first.
- **B2-10. Perf validation harness.** Nothing today exercises "camera animating + NPCs ticking + a board open" together, or NPC counts beyond ~24 test walkers. Build a driven Playwright test (matching the `editor/tools/*.mjs` pattern) opening a project, letting several NPCs walk, asserting fps stays above a floor. Done: harness runs in CI and fails on a regression, per this project's "measure the picture, not the model" discipline.

### Phase 3 — The panel/board system and its diegetic transition

- **B3-01. Resolve Q-WORKBENCH before starting this phase** — the board's internal structure (single-tab vs multi-board vs full split-pane) is a prerequisite decision, not a build task.
- **B3-02. Build the wooden-board panel component.** A new UI primitive (DOM or Pixi) that slides in alongside the zoomed camera position and tracks/locks to it (catalog 08 build item 9). Done: opening a project shows the board in sync with the camera's arrival; closing reverses cleanly; no visible ticker stutter during the transition (measured, not eyeballed).
- **B3-03. Board tab strip.** Whatever Q-WORKBENCH resolves to, build the tab-open/close/switch mechanism the board's content routes through. Done: at least the 6 tab kinds from UI-11 (Conversation, ACP chat, File, Diff, Terminal, Browser) can each be opened as board content.
- **B3-04. Restyle xterm.js for the board.** Catalog 03's "Answer up front" notes the theming surface is narrow (6 CSS custom properties) and both terminal instantiation sites share the same theme builder, so one restyle covers both. Done: a terminal on the board matches the wood/parchment palette; ANSI 16-color palette theming (currently unthemed anywhere in Emdash) is an explicit decision, not an oversight, if left unthemed.
- **B3-05. Restyle Monaco for the board.** Theme tokens via `monaco-themes.ts`'s existing CSS-variable-derived color mapping. Done: the file editor and diff editor render on-board with a consistent palette; minimap/format-on-type/word-wrap behavior unchanged.
- **B3-06. Restyle or reuse the `chat-ui` SolidJS transcript engine.** Catalog 01 flags it as "likely not worth rebuilding exactly" but every visible row-kind behavior must be preserved (AG-22 through AG-40). Done: every transcript row kind renders correctly inside a board-mounted instance, embedded in whatever shell framework the new renderer uses (React/Solid/vanilla — decide once, per B4-00 below).
- **B3-07. Pick the new renderer's UI framework for panel content.** Not yet decided anywhere in the catalogs — the current app is React outside `chat-ui`'s Solid island. Done: one documented choice (React again, Solid throughout, vanilla+islands, etc.) that every Phase 4 feature surface is built against.
- **B3-08. Board-native form/control kit.** A restyled equivalent of the current design system's inputs, selects, comboboxes, switches, steppers, split-buttons — every settings row and every modal in the ledger needs these. Done: one small component library, wood/parchment-themed, covering the control types enumerated across sections 2.25–2.30.

### Phase 4 — Feature surfaces rebuilt on canvas + board

Each item below rebuilds one ledger cluster. "Done" = every row in the cited ledger section works end-to-end against the live back end, verified by driving the real app (per this project's "run it, don't trust green tests" rule).

- **B4-01. District/building error & availability states.** Resolve Q-ERRORS first, then implement the 2–4 canonical trouble states across WS-07, WS-27, AG-21, ST-02's keychain-unavailable case. Done: every "host unreachable"/"stale"/"script failed"/"provisioning error" condition from the ledger shows one of the defined states, not a generic disabled button.
- **B4-02. Project creation flow (WS-01/02/03/05, ST-26).** Found-a-district flow from the campfire/an empty plot: pick-directory / create-repo / clone / remote, with inline typed errors and the config-import prompt. Done: all three creation modes work against the real back end, remote-host mode included.
- **B4-03. Project management (WS-06/08/09/10/11, ST-23/24/25/27).** Rename/delete/relink, and the full per-project settings board (base + shareable + env vars + provenance badges). Done: every field in ST-24/25/27 round-trips through the live settings RPCs with correct provenance display.
- **B4-04. Task/building creation flow (WS-12 through WS-19).** Create Task modal → workspace presets → git plan compiler → execution, with the setup-step preview and provisioning/scaffolding visual. Done: all 5 workspace presets (WS-13) work, branch-conflict reuse offer (WS-14) works, the building visibly enters "under construction" during background worktree creation and "ready" after.
- **B4-05. Task lifecycle & workspace management (WS-20 through WS-28).** Rename/pin/archive/delete with preflight, teardown, activity badge, workspaces table (per Q-WORKBENCH's resolution), row actions, bulk delete, disk-usage display. Done: every action in WS-20/23/25/26 works and the preflight/confirm copy matches catalog 02's documented behavior.
- **B4-06. Git changes board (WS-29 through WS-44, FS-24 through FS-28).** Checkout store, staged/unstaged sections, commit card, diff main panel (Monaco), stacked/image/binary diffs, draft line comments. Done: stage/unstage/commit/push/pull/publish all work; every git error in WS-31's vocabulary renders distinctly; draft comments round-trip to the agent's next prompt exactly as today.
- **B4-07. Pull requests (WS-45 through WS-50).** List/filter, PR entry with merge/drift, create-PR modal, merge strategies with bypass gating. Done: full PR lifecycle (create → review → merge) works against a real GitHub-backed repo.
- **B4-08. Issues & integrations (WS-54 through WS-57, ST-31).** Issue linking combobox, PR selector, the 12-provider integration connect flows. Done: linking a task to an issue from at least 2 of the 12 providers works end-to-end.
- **B4-09. Modal-by-modal disposition of the 30-modal catalog (UI-36).** For each of the 30 modals, decide kept-as-board-modal vs. replaced-by-an-in-world-flow, then build it. Done: a tracked checklist (not prose) with all 30 resolved and built; none silently dropped.
- **B4-10. Files board (FS-04 through FS-20).** Tree, search (filename + content), file operations, open-file store, all renderer kinds. Done: browse/create/rename/delete/drag-drop all work; both search systems return live results within the documented latency (200ms debounce for content search).
- **B4-11. Terminal board (TR-01 through TR-08).** Multi-tab terminal, tmux persistence, shell picker, kill semantics, preview-server detection/pill/manual-forward/in-app-browser. Done: every terminal capability in TR-01 works identically to today, restyled; preview pill correctly reflects a real dev server's lifecycle.
- **B4-12. Chat/agent conversation board (AG-20 through AG-54).** Full transcript rendering + composer, all capability-conditional composer elements per AG-02. Done: a full agent turn (message → tool calls → diff → completion) renders correctly for at least one ACP agent and one PTY-only agent, exercising the capability-driven composer differences.
- **B4-13. Settings surface (per Q-SETTINGS's resolution).** All of ST-01 through ST-36 built as one or several settings-island structures. Done: every settings field in the ledger is reachable, editable, and shows correct provenance/reset-to-default behavior.
- **B4-14. Machines/SSH (per Q-MACHINES's resolution; TR-13 through TR-20, WS-04, ST-32).** Add/edit/connect, host settings, workspace-server lifecycle, resource monitoring, host dependencies. Done: a real remote host can be added, connected, and used to run a task end-to-end.
- **B4-15. Automations (ST-22, UI-15).** Cron-scheduled agent runs, run history, template rail. Done: a scheduled automation actually fires and produces a task/session on schedule.
- **B4-16. Command palette (per Q-PALETTE's resolution).** Fuzzy search across projects/tasks/commands/conversations/files. Done: matches UI-25's documented behavior (keyword-scoped provider chips, footer hints).
- **B4-17. Keybindings (Q-KEYBOARD).** Full rebind UI with conflict detection, housed per B4-13. Done: matches ST-33's documented conflict-severity model exactly.
- **B4-18. Native shell chrome (UI-27 through UI-29).** Menu bar, tray, per-platform window management — largely kept as-is, audited against the new feature set. Done: menu items resolve to real commands in the new app; tray Open/Quit work; window-close-hides-to-tray behavior preserved.
- **B4-19. Notifications (Q-NOTIFY, UI-34).** OS notification + in-world signal split. Done: matches the focused/unfocused rule from ST-09, extended to the visual channel per Q-NOTIFY's recommendation.
- **B4-20. Onboarding/welcome/recovery (UI-01 through UI-04).** Boot splash, recovery window, onboarding, welcome. Done: first-run flow works end to end including the legacy-data-import path; recovery window still works when the main boot sequence fails (test by forcing a boot failure).
- **B4-21. Updates & telemetry (ST-34/35, TR-23).** App self-update, workspace-server update (shared `UpdateCard`), telemetry consent. Done: update flow works through all 4 states (up-to-date/available/downloading/install-ready).

### Phase 5 — Agent-session villagers

- **B5-01. Character sprite integration.** Once the Art List's character batch is delivered, wire idle/walk (and whatever Q-STATUS lands on) into `npc.ts`'s existing motion/occlusion/pathing machinery (catalog 08 build item 12). Done: a villager visibly walks with the new art, correctly occluded by buildings/trees, using the existing depth-sort.
- **B5-02. Per-villager identity & on-demand spawn/despawn.** Extend `Walker`/`npc.ts` with a stable session id, spawn tied to session start, despawn/park tied to session end (catalog 08 build item 11). Done: starting an agent session spawns a villager heading to that task's building door; ending the session despawns or parks it without touching unrelated walkers.
- **B5-03. Directable goals.** Replace the fixed "cycle between two settlements forever" loop with per-villager destinations (a specific building's door). Done: `Villagers` supports assigning/reassigning a target per walker, not just whole-population operations.
- **B5-04. Agent status visualization wired to AG-18.** Implement whatever Q-STATUS decides (overlay glyph / hybrid), reading the live 5-state status machine. Done: an agent's live status is visible on its NPC at a glance, verified against real status transitions (working → awaiting-input → completed) from a live session.
- **B5-05. Multiple concurrent villagers at scale.** Palette-swap or otherwise distinguish many simultaneous sessions; measure the real per-frame cost beyond the ~24-walker test harness. Done: N concurrent real agent sessions (N = a number chosen from real usage, not guessed) run with fps above the floor set in B2-10's harness.

### Phase 6 — Harnesses and gates

Every harness below either already exists in this repo (extend it) or is new (build it), per CLAUDE.md's standing rule that nothing is done until it's been rendered and looked at.

- **B6-01. Extend `world/test_shore.py` and `world/test_paths.py`** to cover the live, arbitrary-plot-count world model from B1-01 through B1-04, not just the fixed hand-authored states.
- **B6-02. Run `map-verdict` on the full live-rendered island**, not just the offline PNG pipeline — needs a render path from the live Pixi client (a headless screenshot) feeding the same skill.
- **B6-03. Extend `editor/tools/drive.mjs`-style real-pointer harnesses** to the new app shell: found a project, grow it, click a district, open a building, close it — the equivalent of today's `node app/drive.mjs` but against the real feature set, not the six-plot demo.
- **B6-04. Build a feature-parity checklist harness.** A literal checklist (generated from this document's section 2 row ids) that a session can mark against as each ledger row is verified working against the live back end — the mechanism for "we did not lose a feature."
- **B6-05. Perf-under-load harness** (B2-10, extended per B5-05) as a permanent CI gate, not a one-time check.
- **B6-06. `visual-verdict` pass on every restyled board surface** (terminal, Monaco, chat transcript, forms) before calling any of Phase 3/4's restyling done — screenshot comparison against the intended wood/parchment palette, per this project's "measure the picture" discipline.
- **B6-07. Known traps to gate against explicitly**, carried over from this project's own CLAUDE.md and directly relevant to Phase 1/2 work: object ids larger than `Number.MAX_SAFE_INTEGER` must be matched by index, not by `String(id)`, across the wire boundary if any project/task/conversation id ever needs client-side identity comparison; the eight-neighbour (not four) coastline rule when districts' shores are cut/redressed as projects are added/removed; the "can you see through it" vs "is there a surface here" distinction when villager pathing crosses new land; `Editor.scramble`-style non-determinism must never leak into any harness without an explicit seed.

---

## 5. The art list

Every asset that has to be made or sourced, from catalog 09's survey of the 1,031-file Cainos kit, organized as commissionable batches. "Derivable" batches need no new art, just assembly/direction; everything else needs an actual pixel-art pass matching the kit's linework, shading, and the confirmed palette (`#482510` outline; warm brown/tan/grey base tones; accent colors sampled from existing grass/water/roof sprites, never invented, never saturated/neon).

### Batch 1 — Character sprite set (the single biggest gap)
The kit ships exactly 4 static, barely-legible placeholder sprites (`TX Player B/F/S` + one shared shadow), used zero times in the artist's own layout, with zero animation frames of any kind anywhere in the kit for a character. This is entirely new art.
- Idle pose(s), redrawn from scratch to be a legible villager (not derivable from the existing 4 sprites).
- Walk cycle, 4-direction minimum (matching the kit's own asymmetric-prop mirroring convention — cheapest viable scope per catalog 09) or 8-direction if the budget allows, to match the world's 8-directional placement logic elsewhere.
- Working-at-a-desk pose (no precedent in the kit at all).
- Sleeping pose (no precedent).
- Error/distressed pose or expression variant (no precedent — the 4 existing sprites don't even establish a consistent face to build an expression system from).
- A base character built clean enough that palette-swapping it per agent/session is straightforward (this step is genuinely derivable once the base exists, not before).
- **Depends on:** Q-STATUS's resolution (how many of the 5 states get full animation vs. an overlay glyph) before final scope is locked.

### Batch 2 — Agent status indicators
- If Q-STATUS lands on overlay glyphs (recommended): 3–5 small icon/speech-bubble overlays for working/awaiting-input/error/completed/idle, extending the kit's own lit/unlit precedent (`Lantern 01/02`, `Shrine 01/01 Lit`) as the template, desaturated/earth-toned per the palette constraint.
- Unread/"seen" badge equivalent (AG-18), if Q-SIDEBAR keeps any list view that needs one.

### Batch 3 — Settings island windmill
Confirmed absent from the kit by four independent checks (filename search, JSON-manifest grep, visual inspection of every building, every design-iteration scene file). 100% new art.
- Windmill base structure — the non-rotating shell can lean on existing House/Barn/Tower building parts for walls/roof/base.
- Rotating blade mechanism and its rotation animation — no precedent of any kind in the kit; the only existing animation (gate/door hinge swing) is a different motion class entirely. This is the single hardest individual asset in the whole survey.

### Batch 4 — Panel/board surfaces (the actual UI substrate)
None of this exists in the kit at any scale usable for UI. All new art, all must land inside the earth-tone palette (no stock UI colors).
- A wooden-plank panel, built to 9-slice/tile to arbitrary sizes (the existing `Billboard 01` at 64×52px is the closest analog and is far too small and not built to scale).
- A parchment/scroll surface for text-heavy content (chat, file lists, notes) — no paper/parchment texture exists anywhere in the kit.
- A chalkboard surface, as explicitly named in the product brief — no chalkboard/slate texture of any kind exists.
- A sliding-panel frame/border mechanism — the gate/door open-animation is a usable *behavioral* precedent (something animating from closed to open reads correctly in this world) even though its visual form doesn't transfer.
- **Depends on:** Q-WORKBENCH and Q-SETTINGS resolutions, which determine how many distinct panel sizes/shapes are actually needed (one board design reused everywhere vs. several purpose-built ones).

### Batch 5 — Iconography for software concepts with no village equivalent
All new art. Several have a plausible in-world starting metaphor noted; none exist today.
- Git branch/merge (no natural "two paths become one" prop in the kit — fences fork but don't rejoin).
- Diff (added/removed/changed) — needs a from-scratch visual language, must stay inside the earth-tone constraint rather than using stock red/green.
- Pull request — a gate/threshold motif (leaning on the existing 7-frame gate animation) is a plausible starting point.
- Terminal/running-command-output — ties to the chalkboard/parchment gap in Batch 4.
- Model picker — could build from the `Sign Icon 01–08` glyph-on-a-sign format/scale, but the glyphs themselves are new.
- Error state, beyond the character overlay in Batch 2 — for UI chrome generally; the on/off lantern precedent is the template, not the answer.
- Running/stopped/idle status for non-character objects (e.g. a building or a preview-server indicator) — same lantern/shrine template, needs a 3+-state extension.
- **Depends on:** Q-MOTIF's batched design pass (section 3) to settle exactly which of these are needed and in what form before commissioning.

### Batch 6 — Stage-growth structures beyond the kit's own ceiling
Per this project's CLAUDE.md ("the artist is not the ceiling — stage 5 must exceed the demo"), a fully mature stage-5 district needs to visibly exceed anything the artist built. The kit's biggest structures (House variants, Warehouse, Tower, Barn) are the ceiling today.
- One or more large-scale landmark structures per district archetype, exceeding the kit's existing building range, for the stage-5 "impressive" state.
- Early-stage growth (tents → sheds → houses) is mostly derivable from the kit's own building range as-is; only the top end needs new art.

### Batch 7 — Derivable / reuse inventory (no new art needed)
Confirmed usable as-is or via light recombination — listed so it isn't accidentally re-commissioned:
- Signage: `Sign 01/L/R` (fork/menu object), `Road Sign 01/02/03`.
- The gate/door open-close animation (`Fence 02 Door`, `Gate 01`, 7-frame, 8fps) — the kit's only existing animation, directly reusable literally for "opening a project/panel."
- Containers as icon shapes: barrels, crates, sacks, pots, planter boxes — no lockable chest exists, note if one is needed later.
- Landmark objects: `Well 01` (hub/settings landmark read), `Statue 01`, `Gravestone`/`Tomb` (decorative only), `Stall 01–06` (six variants — usable if a market-square-per-project metaphor is ever wanted alongside districts).
- Per-project district markers, riding on the existing stage 0–5 district vocabulary already built in `world/stages/*.json` — assemblable from existing pieces.
- The growing-island shore/dressing itself — already solved by the editor's own erase/redress pass (catalog 08); no new art, an engineering deliverable (B2-03).

### Batch 8 — Palette & style guide deliverable
Not new art per se, but a written deliverable any commissioned artist needs before starting: outline color (`#482510`, confirmed matching the kit's own top-3 dominant pixel color), base-tone cluster (warm brown/tan/grey), and an explicit note that accent colors (green/blue/red/orange) must be sampled from the kit's actual grass/water/roof/produce sprites rather than invented, and that nothing in this world is saturated/neon — including any status-color coding (error red, running green) this app needs, which must be desaturated and earth-toned or it reads as a modern overlay pasted onto pixel art.

---

## 6. Risks and unknowns

What we still don't know, and what would have to be prototyped or measured to find out.

1. **The ACP reducer's output shape is unverified.** Catalog 07 Q4 flags `packages/core/src/runtimes/acp/api/reducer/*` as "looks reusable... not opened in depth" — if it emits rendered markdown/HTML rather than structured turn/message/tool-call data, the chat-transcript board (B4-12) inherits real rework instead of a clean port. **Measure by:** reading the reducer's actual output type before B3-06/B4-12 are scoped in detail (B0-03 above).

2. **Whether a village-shaped index (Q-SIDEBAR) can actually replace a persistent task list for real usage.** A user managing a dozen concurrent tasks across several projects needs to see status at a glance; the island may not scale as an index the way a list does, especially at typical zoom levels once Q-PLOT-CAPACITY's second-island answer is in play. **Prototype:** build the "in-world ledger board" option from Q-SIDEBAR early and stress-test it with a realistic number of simultaneous tasks (10–20) before committing to it over a conventional list.

3. **Sprite-set load latency and pop-in on district-to-district navigation.** Catalog 08 §2/§6 flags this as real, unstarted work — no packed atlas exists today, and every existing perf story is "one scene loaded once, then edited," not "hot-swap sprite sets on every camera transition." **Measure by:** B2-06/B2-07's atlas-packing and progressive-loading work, validated against real navigation speed, not just cold-load time.

4. **Perf with camera animation + many NPCs + an open board, simultaneously.** Nothing in the current codebase exercises this combination (catalog 08 §6, "new risk, not yet exercised"). **Measure by:** B2-10's harness, extended per B5-05 to real concurrent-session counts.

5. **Whether restyling xterm/Monaco to sit convincingly on a wooden board is achievable within their theming surfaces, or whether it will read as "a normal app pasted onto a village."** xterm's theming surface is narrow (6 CSS vars; ANSI 16-color palette is unthemed anywhere in Emdash today) and Monaco is a heavyweight, VS-Code-grade editor with its own visual identity. **Measure by:** B6-06's `visual-verdict` pass, run early on a throwaway prototype before committing to keeping both verbatim (Q-EDITOR, Q-TERMFONT).

6. **The cost and timeline of the art commission.** Catalog 09's bottom line is stark: "none of the actual interface layer exists" — no windmill, no panel/parchment/chalkboard surface of any kind, no icon vocabulary, and the character (the single most central asset to the whole "agents are villagers" premise) is a full from-scratch commission, not a recolour job. This is a real production dependency for Phase 3/4/5, not a detail. **De-risk by:** scoping Batch 1 (character) and Batch 4 (panel surfaces) first and separately from the rest, since B3-02/B3-04/B3-05/B5-01 are blocked on them specifically, while the district/world art (already largely solved by this repo's existing pipeline) is not.

7. **Whether 13 settings pages' worth of forms, dozens of AppSettings fields, and a full keybinding-conflict UI can be made to feel like part of a village rather than a settings app wearing a windmill hat.** Q-SETTINGS's "several small structures" recommendation is untested. **Prototype:** build one settings "workshop" structure fully (e.g. the agent-CLI install/update surface, AG-11/TR-18) before committing the pattern to all 13 pages.

8. **Whether the diegetic zoom-and-board transition holds up under real, frequent use** (a developer opening/closing tasks dozens of times a day) rather than reading as charming once and tedious on the hundredth open. No data exists on this; it's a genuine product-feel risk, not just an engineering one. **De-risk by:** early, frequent dogfooding of just the camera-zoom-and-board mechanic (B2-08 + B3-02) in isolation, before building every feature surface on top of it.

9. **Orphaned/undiscovered settings.** Catalog 05 flags several `AppSettings` fields (`taskHoverAction`, `autoRightSidebarBehavior`, `browserPreview.enabled`, `changesViewMode`, `remoteMachine.installBaseUrl`, `localProject.*`) with a schema and a default but **no settings-card UI found anywhere** in the current app — either they're set contextually elsewhere, or they're dead. **Resolve by:** a targeted grep pass per key before B4-13, so the rebuild doesn't silently drop a live behavior that just happens to have no obvious settings-page home today.

10. **Skills' exact install/sync mechanics into each agent's own config were not traced end-to-end** (catalog 05, explicitly time-boxed and flagged as a follow-up). **Resolve by:** a dedicated read of the skills install path before B4-13 commits to a specific "workshop" UI for it, especially if the settings-island "skills shelf" motif (Art List, ST-21) needs exact parity with today's per-source install behavior.

11. **No OS deep-link scheme exists today** (`emdash://`) and this document doesn't propose adding one — confirmed absent, not a gap, but worth flagging since a village app might plausibly want deep-linking into a specific district/building for sharing, and that would be new scope beyond parity.

12. **Multi-account, multi-provider, multi-machine complexity may not compress well into "one village."** GitHub multi-account (ST-29), 12 issue-tracker integrations (WS-54), remote SSH machines (Q-MACHINES) are each individually solvable but stack into a lot of simultaneous state for one island to represent legibly. **De-risk by:** building Q-MACHINES's boat/second-island answer and stress-testing it with more than one remote machine before assuming the metaphor scales.
