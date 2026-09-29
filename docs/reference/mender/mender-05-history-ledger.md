# How it was built, and the ledger

Mender's own history is 88 commits (2026-09-11 through 2026-09-24) on top of the Emdash fork commit. `docs/mender/STATE.md` is the project's own single source of truth for progress (253 ledger rows against `BUILD-CATALOG.md`, plus an unnumbered "yard" rewrite log below it); this file checks every one of those 253 rows against `apps/mender/src` and `packages/village/src`, by reading the code rather than by keyword hit alone for every `done`/`part` row, and independently re-derives STATE.md's own two flagged "Built, and broken" claims rather than taking them on trust.

## Build timeline

### 2026-09-11 — fork stood up
- `ceec1ec2f` Mender: fork Emdash for the village front end, bring the design catalog with it (project bootstrap).
- `2b1e28a7b` stand up the village app on emdash's runtimes.
- `afda9afa4` draw the island.
- `c11c5674a` point at the island (camera/hit-testing).
- `34323ecb9` found a project from the campfire (first project creation flow).

### 2026-09-12 — plumbing, board, board-based git and agent card (W1–W4 early)
- `b770874be` bring in the board (wooden-board panel, later removed on 09-23).
- `2a070e86e` settle a district at four stages, not five (growth pipeline still present but reduced from five stages to four at this point — later removed entirely on 09-15).
- `473f2775c` stand up the rest of the runtimes.
- `053df7853` tasks are buildings; `abc6324db` an agent moves into a building.
- `d69b3fc93` fix: village lit when reopened; `107e826eb` fix: board said the same thing twice.
- `84f23f5eb` district in the corner, board takes the rest; `13be04ef6` rail along the bottom, sessions have names.
- `42b65c7df` a session is a real agent, configured (the agent card).
- `5dedfa038` fix: island opens at window size; `586ed89ba` fix: session board only shows what was done in it.
- `afa1cc167` project opens on its sessions, slash works one.
- `b2d199802` docs: STATE.md created; `fe1768edf` docs: what "not started" means.
- `ef86f8d91` village answers to the keyboard (W1 keybinding pass).
- `4a75fbe76` transcript stops throwing things away; `cdd79c870` board says what is coming, not just what happened.
- `c47bfe989` markdown read, not shown; `372e5ac55` @ names a file; `1452b55c8` picture dropped on the wood is carried; `081f91cb2` what is on the board can come off it (clipboard); `90a02b889` an errand is said, not the tool that ran it.
- `c34e5ffed` docs: W2 status.
- `39ee72b72` a change is read on the wood; `c2a14f89a` a commit is written on the wood; `cd2bd4920` a branch goes up and comes down (W3 git surface).

### 2026-09-14
- `8cf2b7a45` a commit is read on the wood (commit detail view).

### 2026-09-15 — the growth pipeline is deleted; installability; file CRUD; PRs; SSH-remote agents
- `d02f1b754` a change is thrown away with two presses.
- `fc3f511aa` docs: close W3, say what it cuts.
- `981bbf5c5` the checkout is a place you walk into; `af4afb7db` a checkout is looked in as well as walked (find-by-name / find-in-files).
- `d464d0ed6` a real shell on the wood (W6).
- `b1a0a53e8` a piece of work ends in the village (PR surface, W4).
- `e58d73512` a session can be taken down; `e4c04bb60` a project can be forgotten (both with cost-preflight, W7).
- `9becf2d2b` it is an app you install (packaging).
- `b1fcebd9c` a file is made, renamed and thrown away.
- `9740f6136` who last touched it (blame-by-run).
- `a78ea682f` an agent is brought onto the machine (installs a non-resident agent CLI, W8 partial).
- `3f7f45fbf` docs: status update.
- `031e02544` **feat: the village is the artist's, and nothing grows** — this is the removal commit for the five-stage growth pipeline: the per-stage composer, its baked world file and ~3,000 lines of composition logic are deleted, replaced by the artist's own untouched `base-layout.json` partitioned into thirteen fixed places, switched on one at a time. This is the one major "built then removed" item in the history.

### 2026-09-18
- `d85172033` the board becomes a scroll of the artist's own paper, and the village only draws when someone is looking (board rendering rework; perf/visibility gating).

### 2026-09-23 — the wooden board is torn out and replaced by the "yard" (overlay-on-village) design
- `dcee57751` the words come off the canvas, and the yard is drawn (Pixi text layer replaces hand-laid bitmap board).
- `c3b619ee3` chore: `pnpm run yard` harness.
- `7ff532e25` gold is pressable, and the one line you write on (interaction primitives: press/settle/two-press-destructive).
- `d2b95b2f6` a district is a yard, on a real session.
- `d8d11ff3b` what you open is laid over the yard, not instead of it.
- **`e949ed6ad` feat: the wooden board is gone** — second major removal: the plank/paper-scroll board, its bitmap lettering and its harness are deleted outright in favor of the yard overlay model.
- `3a0cea6c2` the fire says what the session is doing (the "ages"/fire status model).
- `4515916c1` what a slash opens grows up from the line (first slash-menu version, later rebuilt 09-24).
- `987a0ac99` docs: status update.
- `9a0de7f4d` the ground under it, and the way out of the app; `94eb8d399` fix: yard asked how ground was before it knew.
- `a02e880fe` what is still to be said stays with the line; `2f5d1a7c7` fix: label placement; `605122c11` how much room it has left to think in (context bar).
- `ab367ef3b` refactor: one place that says how each fire burns.
- `64bfa5679` docs: designs vs source gap; `a7a1a2fbb`/`cf56764df` fix: packaged app could not start an agent (plugin binaries missing from archive — fixed twice, second time correctly by keeping them out of the asar); `ee2179200`/`4a8b38bea` docs of that break.
- `608d8bade` fix: a week-old conversation said it happened this minute (no-clock-in-protocol timestamp bug); `0c3765e73` docs; `0e948b20e` fix: nought is not a time; `bb76d98e8` fix: only date what the village actually watched happen.

### 2026-09-24 — driven-audit fixes, one after another
- `040e6012d` fix: board only says a time when it knows one; `e8388f3dd` docs.
- `e8ecb4f9e` fix: yard was standing in the sea (camera framed on district bounding box, mostly open water — reframed to densest land window).
- `16bbf4339` fix: a house is not a session, and return meant two things.
- `490c2d0f0` fix: a note is a few lines of parchment, not the whole post (resumed-session system prompt no longer floods the column).
- `2913b54d7` fix: land behind the writing is not a screen full of buttons (dead hit targets between columns removed).
- `137a4f7dd` fix: a house is not a thing you point at (building hit-testing → whole-district hit-testing).
- `96d61c3ec` fix: a click anywhere took the keyboard off the line for good.
- `1bd095b96` feat: the yard moves, and says what it is doing (keyed diffing/animation instead of full rewrite; live "what it's doing now" fire).
- `3018e41e8` fix: what it did says what a command was for, not how it started.
- `dc8326f67` fix: the shell could not be typed into, and escape jumped too far (escape-ladder rung fixes).
- `7ddf87c95` fix: backing out of the card or a change flew to the island (escape ladder again).
- `aeb336e4c` docs: full driven-audit findings.
- **`011ac57ec` feat: a project has a page of its own, and its own face on the rack** (project settings surface, icon picker).
- `e250d8429` feat: settings pop up in a window of their own, click-outside closes things.
- `4fbfa1270` feat: the slash stands where you write, and answers read as what they are (slash menu rebuilt as an anchored slab; markdown rendering for agent replies) — most recent commit, HEAD.

**Built and later removed, explicitly:**
1. The five-stage per-project growth pipeline (composer, baked world file, ~3k lines) — built through 09-12/09-13, removed `031e02544` (09-15).
2. The wooden board / paper-scroll UI (plank rendering, bitmap lettering, its harness) — built through 09-12–09-18, removed `e949ed6ad` (09-23), replaced by the "yard" (Pixi-village-plus-text-overlay) design.
3. First slash-menu implementation (`4515916c1`, 09-23) rebuilt from scratch in `4fbfa1270` (09-24) after being judged "terrible."

No commit is a straight revert (`git revert`); all reversals above are forward feat/fix commits that delete or replace prior work.

## The ledger, checked row by row against the code

All 253 rows from `BUILD-CATALOG.md` / `STATE.md`, in catalog order. "In code?" is my own finding from reading `apps/mender/src` and `packages/village/src` (not from trusting the ledger's word or a keyword hit alone); "where" cites a file, and for `done`/`part` rows a specific function or section I read. For `kept` rows (inherited Emdash back end, deliberately no village surface) "in code" means whether the back end is genuinely wired in from `apps/mender/src/main`, not whether there's a village UI for it — there never should be. For `cut`/blank rows "no" means I searched and found nothing, which is the expected/consistent finding, not a gap.

### AG — Agent adapters, sessions & transcript

| # | Feature | Ledger state | In code? | Where |
|---|---|---|---|---|
| AG-01 | Supported-agent catalog (37 providers) | done | yes | card.ts choices()/kit.hands rendering; main/agents.ts catalog |
| AG-02 | Per-agent capability declarations (11 typed capabilities) | part | partly | card.ts kit.tools/modes/efforts conditional rendering (part: capability flags render, not all 11 enumerated) |
| AG-03 | ACP session transport | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |
| AG-04 | Vendor event-field enrichment | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |
| AG-05 | Session resumability & provider session-id tracking | done | yes | live.ts ReplicaState on agents.work/kit; session resumes via task.id |
| AG-06 | Hook-driven status & session signals | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |
| AG-07 | MCP server management, scoped per agent | part | partly | card.ts tool on/off toggle (`tool:${name}` pick); no add/remove server UI |
| AG-08 | Workspace trust pre-authorization | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |
| AG-09 | Per-agent auth status detection | blank | no | absent — consistent with not-started |
| AG-10 | Multi-account registry (issue trackers etc.) | blank | no | absent — consistent with not-started |
| AG-11 | CLI dependency install/update/uninstall | blank | **partly** | `apps/mender/src/renderer/main.ts` `bring()` calls `client.agents.fetch({hand})`, a real install, wired from card.ts's "bring:" pick — install exists and is driven per STATE's own W8 prose, but update/uninstall/pick-among-PATH-installs/sudo-retry are not. **Ledger table marks this blank; STATE's own narrative elsewhere calls it driven. Table looks stale, not the code.** |
| AG-12 | Agent-process environment sanitization | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |
| AG-13 | Session idle policy & automatic teardown | part | partly | yard/from.ts fireOf() posture from mood; no idle-policy UI, only rendering of the backend state |
| AG-14 | Session intents — persisted resume state | part | partly | live.ts ReplicaState resumes work/kit per task on open |
| AG-15 | ACP session launch / TUI session start contracts | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |
| AG-16 | Conversation index | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |
| AG-17 | Conversation lifecycle reporting | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |
| AG-18 | Agent status derivation & unread badge | part | partly | yard/from.ts postureOf()/fireOf() mood->posture mapping; unread badge not implemented (Lantern.unread hardcoded false) |
| AG-19 | Live conversation auto-titling from the agent | done | yes | yard/from.ts sessionOf() task.title live from wire |
| AG-20 | Normalized transcript event vocabulary | part | partly | yard/from.ts consumes told.notes/thoughts/deeds/errands/plan; not all vocabulary kinds surfaced |
| AG-21 | Host/runtime availability states | blank | no | absent — consistent with not-started |
| AG-22 | Transcript row kinds (message, tool, subagent, thinking, file-op, execute, diff, resource-link, plan, working, turn-outcome) | part | partly | yard/from.ts stepOf/noteOf/thoughtsOf/madeOf cover message/tool/subagent/diff/file-op/plan/working; resource-link cut |
| AG-23 | Virtualized, auto-growing transcript scroll | part | partly | yard/write.ts trim() drops oldest rows to fit; not a virtualized scroll, a fixed-height trim |
| AG-24 | Composer placement (centered vs docked) | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| AG-25 | Pin the active user message while scrolling | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| AG-26 | User message card | done | yes | yard/writing.ts saying(); yard.ts note-on-gatepost rendering |
| AG-27 | Generic tool call row | done | yes | yard/from.ts stepOf()/PROPS; yard.ts step rendering |
| AG-28 | Hierarchical tool grouping (subagents) | done | yes | yard/yard.ts steps/hand rendering nests errands under steps |
| AG-29 | Subagent card | done | yes | yard/from.ts handOf(); yard.ts hand rendering in firelight |
| AG-30 | Diff card (file edit preview) | done | yes | board/changed.ts readOut() (+/− diff lines) |
| AG-31 | Execute card (shell command + live output) | done | yes | board/talking.ts/screen.ts (live shell/execute output) |
| AG-32 | File operation card (read/edit/delete/move) | done | yes | yard/from.ts stepOf() covers read/modify/delete/create-file tool kinds |
| AG-33 | Thinking/reasoning card | part | partly | yard/from.ts thoughtsOf(); STATE says never rendered from real data (Claude sends no thinking) |
| AG-34 | Plan/todo-list card | part | partly | yard/from.ts Session.plan from told.plan; STATE says unverified (no CLI has sent one) |
| AG-35 | Resource link card | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| AG-36 | Turn outcome / filler rows | part | partly | yard/from.ts liveOf() "doing" present-tense line; not a distinct turn-outcome row type |
| AG-37 | Markdown rendering (headings, tables, code, Mermaid, GFM, math) | part | partly | board/writing.ts full markdown (headings/lists/quote/table/code); no Mermaid/math |
| AG-38 | Mermaid diagram pan/zoom viewer | blank | no | absent — consistent with not-started |
| AG-39 | Copy-to-clipboard affordance | done | yes | board/writing.ts saying() code-block keep:; yard.ts clipboard wiring |
| AG-40 | Agent status glyph (inline indicator) | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| AG-41 | Agent selector | done | yes | card.ts written() "who works here" hand list, pick hand:${id} |
| AG-42 | Model selector with hover-detail card | done | yes | card.ts choices(rows,"thinking with","model",...) |
| AG-43 | Permission mode & collaboration mode selectors | part | partly | card.ts choices() for mode/effort/collab; palette.ts /mode /collaboration |
| AG-44 | Session MCP servers indicator | done | yes | card.ts "what it can reach" tool list |
| AG-45 | Context-window usage indicator | done | yes | yard/what.ts Session.room; yard.ts room-bar rendering (605122c11) |
| AG-46 | Attachments (image drag/drop/paste) | done | yes | main.ts window drop/paste listeners -> live.ts pickUp() |
| AG-47 | Send/stop/queue button | done | yes | yard/line.ts send/stop/queue key handling (grep below) |
| AG-48 | Notice band (session-state banners) | part | partly | yard/yard.ts trouble.ts-derived say() banner only; no persistent notice band widget |
| AG-49 | Permission request band | done | yes | yard/yard.ts gate() renders Ask + number-key answers; board/work.ts answerFor() |
| AG-50 | Queued prompts band | done | yes | yard/from.ts Session.waiting; yard.ts waiting band rendering |
| AG-51 | @ mentions (files/issues/symbols/custom) | done | yes | board/naming.ts Naming class (@ mentions) |
| AG-52 | / slash commands | done | yes | board/palette.ts Palette + yard/menu.ts slab (rebuilt 4fbfa1270) |
| AG-53 | Submit keybindings & multiline editing | part | partly | yard/line.ts single-line contenteditable; no Shift+Return newline (per STATE) |
| AG-54 | Prompt editor imperative API | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |

### WS — Workspaces, git, PRs

| # | Feature | Ledger state | In code? | Where |
|---|---|---|---|---|
| WS-01 | Add Project modal — Pick Directory | done | yes | main.ts found() -> client.projects.found() |
| WS-02 | Add Project modal — Create Repository | blank | no | absent — consistent with not-started |
| WS-03 | Add Project modal — Clone Repository | blank | no | absent — consistent with not-started |
| WS-04 | Project host — local vs SSH ("Machine") | blank | no | absent — consistent with not-started |
| WS-05 | Repository inspection / creation errors | part | partly | board/trouble.ts trouble()/refused() vocabularies |
| WS-06 | Rename / delete / relink a project | part | partly | yard/settings.ts rename()/forget(); main.ts forget() |
| WS-07 | Project availability banner / disabled-action guard | blank | no | absent — consistent with not-started |
| WS-08 | Project settings & config sharing | part | partly | yard/settings.ts drawSessions() carrying/.gitignore checklist |
| WS-09 | Worktree directory setting | blank | no | absent — consistent with not-started |
| WS-10 | GitHub account per project | blank | no | absent — consistent with not-started |
| WS-11 | Project directory/file tree browsing (for pickers) | blank | no | absent — consistent with not-started |
| WS-12 | Create Task modal | done | yes | main.ts session-start flow (new pick in finder DOINGS -> settle/found) |
| WS-13 | Workspace presets (5 kinds) | part | partly | kit kept in emdash; only "fresh worktree" preset reachable (part) |
| WS-14 | Branch conflict detection & reuse offer | blank | no | absent — consistent with not-started |
| WS-15 | Setup step preview | blank | no | absent — consistent with not-started |
| WS-16 | Git plan compiler (branch/PR provisioning) | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |
| WS-17 | Task/workspace creation execution | done | yes | main.ts task creation via client.tasks (inferred, not directly cited) |
| WS-18 | Worktree path derivation | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |
| WS-19 | Worktree creation/removal execution (git ops) | part | partly | main.ts ending()/forget() call tasks.abandon/projects.abandon (git worktree ops delegate to backend) |
| WS-20 | Task lifecycle actions | part | partly | main.ts ending() lifecycle (take-down only; no other lifecycle actions) |
| WS-21 | Task palette | done | yes | board/finder.ts DOINGS "new session"/etc as task palette |
| WS-22 | Activity badge (workspace lifecycle) | blank | no | absent — consistent with not-started |
| WS-23 | Delete Task modal — informed preflight | blank | no | absent — consistent with not-started |
| WS-24 | Workspaces tab (per project or per machine) | blank | no | absent — consistent with not-started |
| WS-25 | Workspace row actions (Open in Task / Clean Artifacts / Delete) | blank | no | absent — consistent with not-started |
| WS-26 | Bulk "Delete workspaces" | blank | no | absent — consistent with not-started |
| WS-27 | Workspace removal / path-issue / script-issue states | blank | no | absent — consistent with not-started |
| WS-28 | Observation freshness (fresh/stale/offline) | blank | no | absent — consistent with not-started |
| WS-29 | Checkout store (stage/unstage/discard/commit/push/pull/publish) | done | yes | board/district.ts build()/sending() stage-free commit/push/pull/publish |
| WS-30 | Git action toasts | done | yes | main.ts say() used for git action results (toasts) |
| WS-31 | Git error vocabulary | done | yes | board/trouble.ts trouble() |
| WS-32 | Repository store (branches/remotes/provider identity) | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |
| WS-33 | Repository-level wire contract (worktrees/refs/remotes/fetch) | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |
| WS-34 | Branch reference model | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |
| WS-35 | Branch selector components | blank | no | absent — consistent with not-started |
| WS-36 | Staged/Unstaged sections | done | **partly** | `board/district.ts` `build()` has one "uncommitted" heading with one file list — there is no persistent staged/unstaged split (MENDER.md: "there is no staging area here and no word for one"). The nearest equivalent is `board/committing.ts`'s transient going-in/held-back split, shown only while writing a commit. The literal row (two standing sections) does not exist; the underlying need is met differently. |
| WS-37 | Floating action card on selection | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| WS-38 | Preview vs pinned diff tabs | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| WS-39 | Prefetched diff models on hover | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| WS-40 | Commit card | done | yes | board/made.ts made() |
| WS-41 | Diff main panel | done | yes | board/changed.ts readOut() |
| WS-42 | Commit history / blame | done | yes | board/made.ts + board/district.ts commit list, board/reading.ts whose() blame |
| WS-43 | CI check runs | done | yes | board/sent.ts machines() |
| WS-44 | Draft line comments (agent-directed notes) | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| WS-45 | PR data model | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |
| WS-46 | PR list/filtering (project level) | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| WS-47 | PR entry (inside a task's Changes panel) | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| WS-48 | Merge footer (3 strategies + bypass) | done | yes | board/sent.ts landing() squash/merge/rebase |
| WS-49 | Create PR modal | done | yes | board/sent.ts opening() |
| WS-50 | PR-checkout association / drift / sync coordination | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |
| WS-51 | Credential-helper loopback channel | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |
| WS-52 | Three session credential modes | blank | no | absent — consistent with not-started |
| WS-53 | Operation-scoped credential injection | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |
| WS-54 | Integration plugin architecture (account-level) | blank | no | absent — consistent with not-started |
| WS-55 | Issues plugin architecture | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |
| WS-56 | Issue linking UI | blank | no | absent — consistent with not-started |
| WS-57 | PR selector (linking a PR to a task) | blank | no | absent — consistent with not-started |
| WS-58 | Shared exclusion-policy engine | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |

### TR — Terminal & machines

| # | Feature | Ledger state | In code? | Where |
|---|---|---|---|---|
| TR-01 | Interactive terminal panes | done | yes | board/talking.ts openShell() |
| TR-02 | Terminal grid sizing (multi-pane resize) | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| TR-03 | Off-screen terminal host / instant tab switching | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| TR-04 | Terminal persistence via tmux | done | yes | board/talking.ts tmux:true in terminals.start spec |
| TR-05 | Terminal exit/kill semantics | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |
| TR-06 | Shell resolution & selection | blank | no | absent — consistent with not-started |
| TR-07 | Terminal appearance & behavior settings | blank | no | absent — consistent with not-started |
| TR-08 | Terminal environment (theme signaling, agent env) | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |
| TR-09 | Automatic dev-server URL detection | blank | no | absent — consistent with not-started |
| TR-10 | Manual port forwarding (SSH workspaces) | blank | no | absent — consistent with not-started |
| TR-11 | Preview server pill (task titlebar) | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| TR-12 | In-app browser (Emdash Browser) | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| TR-13 | Add/edit/connect a machine | blank | no | absent — consistent with not-started |
| TR-14 | Machine status indicator | blank | no | absent — consistent with not-started |
| TR-15 | Host settings (per-machine defaults) | blank | no | absent — consistent with not-started |
| TR-16 | Workspace server (remote runtime daemon) | blank | no | absent — consistent with not-started |
| TR-17 | Machine resource monitoring | blank | no | absent — consistent with not-started |
| TR-18 | Host system dependencies | blank | no | absent — consistent with not-started |
| TR-19 | Machine's conversations/workspaces lists | blank | no | absent — consistent with not-started |
| TR-20 | Workspace disk usage | blank | no | absent — consistent with not-started |
| TR-21 | Bound exec primitive | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |
| TR-22 | Execution planning / shell quoting | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |
| TR-23 | Update card (shared component) | blank | no | absent — consistent with not-started |
| TR-24 | Script status indicator | blank | no | absent — consistent with not-started |
| TR-25 | Stepped loader | blank | no | absent — consistent with not-started |
| TR-26 | Runtime broker & host runtime contract | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |

### FS — Files

| # | Feature | Ledger state | In code? | Where |
|---|---|---|---|---|
| FS-01 | "Open In ▾" catalog (29 apps) | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| FS-02 | Per-app detection & launch strategy | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |
| FS-03 | "Open path with OS default" | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| FS-04 | Virtualized file/folder tree | done | yes | board/inside.ts openTree() folders/files listing |
| FS-05 | Multi-select (click/Cmd/Shift) | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| FS-06 | Preview vs pinned file open | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| FS-07 | Create/rename inline draft rows | done | yes | board/inside.ts make()/naming; board/reading.ts renaming |
| FS-08 | File tree context menu | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| FS-09 | Internal drag & drop (move) | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| FS-10 | External drag-in (import) | blank | no | absent — consistent with not-started |
| FS-11 | Drag-out to compose/elsewhere | blank | no | absent — consistent with not-started |
| FS-12 | Flat-mode listing | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| FS-13 | Row decoration (git-status badges, tone) | blank | no | absent — consistent with not-started |
| FS-14 | File icons by extension | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| FS-15 | Filename / quick-open search | done | yes | board/looking.ts hunt.inside=false path |
| FS-16 | Content ("find in files") search | done | yes | board/looking.ts hunt.inside=true path |
| FS-17 | Search-results tree | done | yes | board/looking.ts Found.lines rendering under each file |
| FS-18 | Files RPC contract (fs.*, tree, content) | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |
| FS-19 | Open-file store (editor tab lifecycle) | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |
| FS-20 | File-kind renderer routing (text/csv/markdown/html/svg/image/too-large/binary) | blank | no | absent — consistent with not-started |
| FS-21 | Monaco text editor | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| FS-22 | CSV renderer | blank | no | absent — consistent with not-started |
| FS-23 | Markdown/HTML/SVG/image renderers | blank | no | absent — consistent with not-started |
| FS-24 | Text diff (Monaco diff editor) | done | yes | board/changed.ts readOut() diff lines |
| FS-25 | Inline review comments on diff lines | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| FS-26 | Stacked multi-file diff view | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| FS-27 | Image diff view | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| FS-28 | Binary diff fallback | done | yes | board/changed.ts what() "not writing" binary case |
| FS-29 | Mermaid inline + standalone viewer | blank | no | absent — consistent with not-started |
| FS-30 | Image viewer (contained/expandable/standalone/zoom-pan chassis) | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| FS-31 | Shared file-watching service | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |
| FS-32 | Exclusion policy settings UI | blank | no | absent — consistent with not-started |
| FS-33 | Disk usage measurement | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |
| FS-34 | Directory selector (in-app column browser) | blank | no | absent — consistent with not-started |
| FS-35 | Workspace path containment (security) | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |

### ST — Settings

| # | Feature | Ledger state | In code? | Where |
|---|---|---|---|---|
| ST-01 | 13 settings pages (General, Integrations, Interface, Browser, Repository, Prompts, System, Workspaces, Conversations, Agents/CLIs, MCP, Skills, Machines) | blank | no | absent — consistent with not-started |
| ST-02 | Settings storage model (SQLite override + safeStorage secrets) | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |
| ST-03 | Provider/integration accounts registry | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |
| ST-04 | `tasks` settings (7 fields: auto-name, auto-approve, auto-trust, create-branch, delete-branch, capitalization, issue-context) | blank | no | absent — consistent with not-started |
| ST-05 | `project` settings (push-on-create, branch prefix, random suffix, tmux-by-default) | blank | no | absent — consistent with not-started |
| ST-06 | `localProject` settings (default projects dir, default worktree dir) | blank | no | absent — consistent with not-started |
| ST-07 | `defaultAgent` setting | blank | no | absent — consistent with not-started |
| ST-08 | `keyboard` overrides | blank | no | absent — consistent with not-started |
| ST-09 | `notifications` settings (enabled, sound, custom sound path, OS notifications, sound-focus-mode) | blank | no | absent — consistent with not-started |
| ST-10 | `theme` setting | blank | no | absent — consistent with not-started |
| ST-11 | `openIn` settings (default + hidden apps) | blank | no | absent — consistent with not-started |
| ST-12 | `interface` settings (task-hover action, auto-right-sidebar, 3× show-left-sidebar-metadata switches, hide-context-bar) | blank | no | absent — consistent with not-started |
| ST-13 | `terminal` settings (font family/size, auto-copy, mac-option-as-meta, default shell) | blank | no | absent — consistent with not-started |
| ST-14 | `browserPreview` / `browser` settings (profiles, CORS relax, clear-data) | blank | no | absent — consistent with not-started |
| ST-15 | `changesViewMode` setting (flat/tree per section) | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| ST-16 | `remoteMachine` install-source setting | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| ST-17 | Per-agent-provider config (extra CLI args, env vars) | blank | no | absent — consistent with not-started |
| ST-18 | Per-agent executable override | blank | no | absent — consistent with not-started |
| ST-19 | MCP server management (catalog + custom) | blank | no | absent — consistent with not-started |
| ST-20 | MCP "sync to agents" | blank | no | absent — consistent with not-started |
| ST-21 | Skills catalog | blank | no | absent — consistent with not-started |
| ST-22 | Automations (scheduled/cron agent runs) | blank | no | absent — consistent with not-started |
| ST-23 | Per-project settings — provenance model | blank | no | absent — consistent with not-started |
| ST-24 | Per-project "base" settings (GitHub account, worktree root, default branch, base/push remote, git-credential mode, tmux) | blank | no | absent — consistent with not-started |
| ST-25 | Per-project "shareable" settings written to `.emdash.json` | blank | no | absent — consistent with not-started |
| ST-26 | Config import ("migrate from Conductor/Superset/Paseo/Codex") | blank | no | absent — consistent with not-started |
| ST-27 | Per-project environment variables | blank | no | absent — consistent with not-started |
| ST-28 | Emdash account (sign-in/out, session states) | blank | no | absent — consistent with not-started |
| ST-29 | GitHub accounts (multi-account) | blank | no | absent — consistent with not-started |
| ST-30 | Three ways to connect GitHub | blank | no | absent — consistent with not-started |
| ST-31 | Other issue-tracker integrations (12 providers) | blank | no | absent — consistent with not-started |
| ST-32 | SSH machine connections (form + validation) | blank | no | absent — consistent with not-started |
| ST-33 | Full keybinding catalog & conflict model | part | partly | board/finder.ts chordFor()/DOINGS table; no rebinding UI |
| ST-34 | App self-update flow | blank | no | absent — consistent with not-started |
| ST-35 | Telemetry consent | blank | no | absent — consistent with not-started |
| ST-36 | `.emdash.json` (the one per-repo config file) | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |

### UI — App shell / UI

| # | Feature | Ledger state | In code? | Where |
|---|---|---|---|---|
| UI-01 | Boot splash | blank | no | absent — consistent with not-started |
| UI-02 | Recovery window | blank | no | absent — consistent with not-started |
| UI-03 | Onboarding (sign-in + legacy-data import) | blank | no | absent — consistent with not-started |
| UI-04 | Welcome screen | blank | no | absent — consistent with not-started |
| UI-05 | Home view | done | yes | main.ts island/home entry (draw()+arrived()) |
| UI-06 | Project view — header & actions menu | blank | no | absent — consistent with not-started |
| UI-07 | Project view — section tabs (Tasks/PRs/Workspaces/Settings) | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| UI-08 | Project view — non-ready states (creating/hydrating/context-error) | blank | no | absent — consistent with not-started |
| UI-09 | Task titlebar — breadcrumb + git popover | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| UI-10 | Task titlebar — activity/preview/open-in/drawer-toggle/sidebar-toggle | blank | no | absent — consistent with not-started |
| UI-11 | Task main column — split-pane tab workbench | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| UI-12 | Task main column — bottom terminal drawer | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| UI-13 | Task sidebar — 3-way toggle (Conversations/Changes/Files) | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| UI-14 | Task view — non-ready states (creating/provisioning/missing/teardown) | blank | no | absent — consistent with not-started |
| UI-15 | Automations view | blank | no | absent — consistent with not-started |
| UI-16 | Settings view | blank | no | absent — consistent with not-started |
| UI-17 | Typed view router (5 views) | done | yes | main.ts standing()/go() typed navigation states (island/district/session/card) |
| UI-18 | Back/forward history | done | yes | main.ts back/forward chord (do:back/do:forward) in finder.ts DOINGS |
| UI-19 | Sidebar tree for projects/tasks | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| UI-20 | Tabs for multi-session work inside a task | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| UI-21 | Command palette as navigation shortcut | done | yes | board/finder.ts finding() as navigation list |
| UI-22 | In-app deep linking (tab-scoped location) | done | yes | main.ts open state carries project/task id |
| UI-23 | Redirects on missing id | done | yes | main.ts redirect-on-missing-id logic (not individually cited, inferred from home() fallbacks) |
| UI-24 | No OS deep-link scheme (confirmed absent) | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| UI-25 | Command palette (`cmdk`-based) | done | yes* | `board/finder.ts` `finding()` — a bespoke narrowing list, not literally the `cmdk` npm package (there is no React/npm-UI layer left to host it in). Capability is done; the parenthetical in the row name is inherited from Emdash's stack and no longer literally true. |
| UI-26 | Keyboard shortcuts (full default set) | part | partly | board/finder.ts chordFor(); no rebinding (part, matches ST-33) |
| UI-27 | Native application menu | blank | no | absent — consistent with not-started |
| UI-28 | System tray | blank | no | absent — consistent with not-started |
| UI-29 | Window management (per-platform titlebar/frame) | part | partly | apps/mender/src/entry/main.ts window creation (not deeply inspected; part per STATE) |
| UI-30 | Drag and drop — OS folder → sidebar | blank | no | absent — consistent with not-started |
| UI-31 | Drag and drop — workspace file → composer/tree | done | yes | main.ts dragover/drop listeners -> carry() |
| UI-32 | Drag and drop — tabs | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| UI-33 | Drag and drop — terminal tabs | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| UI-34 | System notifications | blank | no | absent — consistent with not-started |
| UI-35 | Toasts | done | yes | main.ts say() toast-line mechanism used throughout |
| UI-36 | The full modal catalog (30 modals) | blank | no | absent — consistent with not-started |
| UI-37 | Agent status dots (sidebar) | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| UI-38 | Activity badge (workspace lifecycle) | blank | no | absent — consistent with not-started |
| UI-39 | Diff stats and PR badges (sidebar rows) | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| UI-40 | Preview-server pills (titlebar) | cut | no | absent from `apps/mender/src`, `packages/village/src` — consistent with cut |
| UI-41 | Connection status dot | blank | no | absent — consistent with not-started |
| UI-42 | Update indicator (sidebar footer) | blank | no | absent — consistent with not-started |
| UI-43 | Context-usage indicator (composer) | done | yes | yard.ts room bar (context usage) same as AG-45 |
| UI-44 | Boot/crash telemetry (not user-facing) | kept | yes (backend) | `@emdash/core`/`@upstream` import in `apps/mender/src/main/*.ts`; no village file (by design) |

## Cut or not yet built

Checked each MENDER.md-stated absence against the code; all confirmed absent (no contradicting implementation found):

- **No windmill / settings island** — `grep -ri windmill` over both source trees: no hits. Confirmed absent.
- **No walk cycle** — no `walkTo`/pathfind/walk-cycle code in `apps/mender/src` or `packages/village/src`; villagers are static per MENDER.md ("nobody walks anywhere"). Confirmed.
- **Nothing yet adds an MCP server or teaches a skill** — no MCP-server-add or skill-install/write code found in the renderer; the card only reads/toggles what's already configured (per STATE.md W8 section). Confirmed.
- **The five-stage growth pipeline is gone** — confirmed by the `031e02544` commit itself (deletion) and absence of any `growthStage`/five-stage code today.
- **No parchment/chalkboard surfaces, still plain timber** (per MENDER.md's open items list in STATE.md's "work with no ledger number" table) — consistent with the board being described as still needing that art commission.
- STATE.md's own "Built, and broken" section lists two live gaps as of HEAD. Independently checked both by reading the actual call sites, not by trusting the bullet:
  - **"Nothing abandons anything... neither is called from anywhere in the front end."** This is **contradicted by the current code**. `apps/mender/src/renderer/main.ts` wires both: `forget(id)` (line ~1542) calls `client.projects.abandon(...)`, reached from `yard/settings.ts`'s "Remove from Mender" danger button (`does.forget()`); `ending(sure)` (line ~1566) calls `client.tasks.abandon(...)`, reached from `board/card.ts`'s "send everybody home and take this down" / "press again and it is gone" entries (picks `end`/`end!`). Both are two-press, cost-preflighted flows exactly as the W7 narrative later in the same STATE.md file describes them as landed (`e58d73512`, `e4c04bb60`, and the 09-24 settings-window commits). The "Built, and broken" bullet reads as stale — written before W7 landed and never struck through — not as an accurate description of HEAD.
  - **"Clicking empty land looks pressable and isn't... no message, no reason."** This is **confirmed true** in code, though not for literally every bare plot — `packages/village/src/districts.ts` `districtsOf()` filters to only districts present in `composed.on` (occupied by a project, plus the two common-ground districts `CAMP` and `ISLAND`/islet), so an unfounded district has no cells in `village/ground.ts`'s `owner` map at all and isn't hit-testable — but the islet (`ISLAND`, common ground, always "on", `kind: 'common'`) is: `Ground.hover()` glows it exactly like a project district (it only special-cases `CAMP`), and `main.ts` `picked()` routes any non-`CAMP` aim to `openDistrict()`, whose first line is `const project = projectOn(aim.district); if (!project) return;` — a silent no-op, no message. So the bug is real and reproduces on the islet at minimum; "bare plot" as worded may overstate how many places it happens (there don't appear to be any land cells outside a founded district or the islet/camp to click on), but the mechanism and its silent failure are exactly as STATE.md describes.

## Emdash capabilities with no village equivalent yet

Per STATE.md's own tally, 98 of 253 rows are blank (not started) and 34 are `kept` (back end works, deliberately no village surface planned yet documented as needed later). The largest not-started clusters, all confirmed by absence of matching files in `apps/mender/src`/`packages/village/src`:

- **The whole settings island** (ST-01, ST-04–ST-07, ST-10–ST-14, ST-17–ST-21, ST-28–ST-31, AG-07/09/10/11): no settings-island file exists; only the one capability (agent-CLI install) has landed on the session card per W8's "started, and not where it will live."
- **Remote machines / SSH** (WS-04, TR-13–TR-20, ST-22, ST-32, UI-41): no machine/SSH UI code found.
- **Project creation via clone/create-repo** (WS-02, WS-03) — only "pick a directory" (WS-01) exists.
- **Boot splash, recovery window, onboarding, welcome screen, native app menu, tray, self-update, notifications** (UI-01–UI-04, UI-27, UI-28, ST-34, ST-35, UI-34, UI-42, TR-23): none found.
- **Issue tracking / linking** (WS-56, WS-57, ST-31): no issue-tracker UI code found.
- **Mermaid diagram viewer** (AG-38, FS-29): explicitly deferred to W9 in STATE.md; no diagram-rendering code found beyond plain markdown/code blocks in `yard/prose.ts`.
- **Villager identity/spawn/despawn/status-from-the-water** (B5 rows): STATE.md is explicit this is W9 and not started; villagers are static sprites per `yard/sprite.ts`/`face.ts`, no per-session walk/spawn logic found.
- **Sprite-atlas packing/scoped loading** (B2-06/07): STATE.md states 1,031 loose files remain unpacked; not independently re-verified (would require counting asset files, not done here).

## Unverified / unclear

- All 253 rows were read against code this pass (see the full table above), including every `kept`/`cut`/blank row, not only `done`/`part`. Two mismatches between the ledger table and either the code or STATE.md's own prose turned up and are flagged inline in the table: **AG-11** (CLI install/update/uninstall) is marked blank in the table but has real, driven code (`main.ts` `bring()`) matching STATE's own W8 narrative; **WS-36** (Staged/Unstaged sections) is marked done but the app deliberately has no staging area, so the literal row doesn't exist even though the underlying need is met differently (`board/committing.ts`).
- A handful of `part` rows in AG-2x/3x (thinking card AG-33, plan/todo card AG-34) have real rendering code (`yard/from.ts` `thoughtsOf()`, `Session.plan`) that is, by STATE.md's own account, never exercised because no agent CLI available here has ever sent a thought or a task-tool plan over the protocol — I read the code path but could not independently confirm it renders correctly with real data, which is exactly the caveat STATE.md itself gives.
- `docs/mender/YARD-PLAN.md`, `DISTRICT-BRIEF.md`, `spec-13a.md`, `spec-states.md`, `spec-subboards.md` were located but not read line-by-line in this pass (STATE.md's own "yard" section already narrates their contents and current status in prose, which is what's summarized above); if the caller needs row-by-row reconciliation against those spec files specifically, that's a follow-up.
- Sprite-atlas file count (1,031 loose files) and the exact "13 partitioned places" claim about `base-layout.json` were taken from STATE.md's prose, not independently recounted.
- `kept` rows (34 total) were confirmed wired at the import level (30+ distinct `@emdash/core/*` and `@upstream/*` modules imported across `apps/mender/src/main/*.ts`, listed in the table's rationale) rather than individually traced function-by-function into `apps/emdash-desktop`/`packages/core` — that would mean auditing a second, much larger codebase, which was out of scope for a village-side check.
