# STATE — how far along Mender actually is

One file, one answer. When the question is "how much is left", this is what gets
read, and nothing else is allowed to answer it from memory.

`BUILD-CATALOG.md` is the inventory: every capability emdash has, 253 numbered
rows, plus the phases and the art list. It says what could exist. **This file
says what does.** Every ledger row carries a state and, if it isn't finished, the
wave it belongs to.

**The rule that keeps this honest: any commit that changes what the app can do
updates this file in the same commit.** A row moves to `done` only after the
change has been driven in the running app and looked at, never because the code
compiles. If that feels like friction, it is the friction that this document
exists to buy: without it, progress gets reported from whatever list happened to
be in the last conversation, which is how a week's worth of small asks got
mistaken for the build.

## Where it is, in one paragraph

The village is real and so is the back end. The island draws, grows, pans and
opens; a project is a district; a session is its own worktree with a real Claude
agent in it that resumes across restarts; a project's board lists its sessions
and starts new ones; a slash on the line reaches Claude's own commands and skills
and sets the model, mode and effort of the running session; and the card behind
`/agent` shows what that session works with. That is roughly the first three
phases of the catalog, which is all plumbing, camera and board.

It answers to the keyboard now: a chord for everything you do often, a finder
over every session and project, arrows that walk any board, and it reopens where
you left it. But almost everything a person actually does with a coding tool is
still missing. There is no git beyond reading status, no diff, no file, no
terminal, no pull request, no settings. Of the 253 ledger rows: 18 done, 23
partly done, 34 inherited working from emdash's back end and needing no village
surface, 13 deliberately cut, and **165 not started**.

## What "not started" actually means

Every one of those 165 rows already works underneath. Emdash's back end is kept
whole and it is the engine: staging, unstaging, reverting and committing are
mutations on a live checkout model; push, pull, publish, fetch, the log, a
commit's files and blame are all procedures we can call today; so are the
terminal, the file tree, both searches, pull requests, issues, MCP, skills,
machines over SSH, settings and the updater. Forty-odd domain contracts, none of
which import Electron or React, all of them registered and running in Mender
right now.

So "not started" almost never means the capability doesn't exist. It means
there is no way to reach it in a village: nothing to press, nowhere for it to
appear on the wood, and in most cases no decision yet about what pressing it
should look like. That is the work. It is real work, and it is a different
shape from writing a git client.

The exceptions, where we genuinely are building the thing itself and not just
its surface: the board and everything drawn on it, the island and its rules, the
villagers, and the transcript renderer, because emdash's is React and we deleted
it. Those are ours from nothing.

## How to read the states

| | |
|---|---|
| `done` | You can do it in the running app. Verified by driving it, not by reading the code. |
| `part` | Some of it works and the rest is named in the wave. |
| `kept` | Emdash's back end already does it and it needs no village surface. Not work. |
| `cut` | Deliberately not built, because the village answers it another way. Recorded so it doesn't creep back. |
| blank | Not started. |

## Built, and broken

Found by auditing every line of the app against what it claims to do. These are
not missing features, they are things that exist and are wrong, which makes them
worse. Struck-through ones are fixed.

- ~~**Renaming a session cannot be reached.**~~ Fixed in W1: it is a doing with
  its own key rather than a condition that could never be true.
- **Nothing abandons anything.** Abandoning a project and abandoning a session
  are both implemented end to end, worktree deletion included, and neither is
  called from anywhere in the front end. (W7.)
- ~~**Arrow keys do two things at once.**~~ Fixed in W1: there is now exactly
  one key listener in the app and everything reads keys through it, in an order.
- ~~**Escape throws away what you are writing.**~~ Fixed in W1: it clears a
  half-written name or search first, and only backs out on the second press.
- **Clicking empty land looks pressable and isn't.** Bare plots glow under the
  pointer exactly like a founded district, then do nothing at all when clicked.
  No message, no reason. (W7.)
- ~~**The card is mouse-only.**~~ Fixed in W1, and more generally: every board
  is a list of pressable lines, the arrows walk any of them and return picks.
- **The permission question has never been seen.** The whole path is built,
  including the number keys that answer it, but this machine's Claude settings
  approve everything a session has asked for so far, so it has never fired.
  (W2, and it needs to be forced in a test before it counts.)

## The waves

Ordered by what you can open and judge at the end of each one, not by
architectural layer. Art is never a gate: anything blocked on a commission gets
a plain stand-in and ships anyway.

### W1 — it answers to the keyboard · mostly done

Command and a letter now means something: T starts a session, K opens the
finder, I turns a session's board over, R renames it, N founds a project, W
backs out, the brackets go back and forward, and a number goes to that project
on the rail. The finder lists every session, project and doing, narrowing as you
type. The arrows walk any board's pressable lines and return picks one. There is
one key listener in the whole app. The app reopens on whatever you last had
open.

Left in it: rebinding, and the conflict model that goes with it, which needs
somewhere to live and so waits for the settings island in W8. Filename search
(FS-15) waits for files in W5, since there is nothing to search yet. Shift and
return for a newline (AG-53) still needs the line to hold more than one.

Closed UI-17, UI-18, UI-21, UI-22, UI-23, UI-25, WS-21, and four of the seven
broken things above: the arrow collision, Escape eating a draft, the rename
nobody could reach and the mouse-only card. Still open in it: UI-26 and ST-33
(the chord table exists, rebinding and conflicts do not), ST-08 and FS-15 and
AG-53 as above, and the driven harness over the real feature set (B6-03), which
is the next thing in this wave.

### W2 — a session reads like a real conversation

The transcript today has three kinds of line: something said, something done,
and the village talking. Claude emits fifteen. Everything structured it sends
arrives flattened.

Closes AG-02, AG-13, AG-14, AG-20, AG-22 through AG-40, AG-43, AG-45 through
AG-51, FS-29, UI-31, UI-43.

Done when: a full turn with tool calls, a diff, a thought and a todo list reads
properly on the wood; nested subagents fold and unfold; you can stop a turn
mid-flight and queue the next thing behind it; an image dropped on the board
goes in as context; a file or an issue can be named inline; a permission
question lands and a number key answers it; and every session comes back running
after a restart, not just the one you open.

### W3 — you can finish a piece of work without a terminal

Today a session ends by leaving Mender. That is the single biggest hole.

Closes WS-29 through WS-31, WS-35 through WS-42, WS-44, FS-24 through FS-28,
ST-15, UI-09, UI-35, UI-39.

Done when: you can read any diff on the board, stage and unstage by line or
file, write a commit, push it, pull, publish a branch, see the history and who
last touched a line, and every distinct git failure says its own distinct thing
rather than collapsing into one apology.

### W4 — you can ship it

Closes WS-43, WS-46 through WS-49, WS-54, WS-56, WS-57.

Done when: a session opens its own pull request, shows its checks, and merges,
and a session can be linked to an issue from at least the trackers you actually
use.

### W5 — you can read and edit the code

Closes FS-01, FS-03 through FS-14, FS-16, FS-17, FS-20 through FS-23, FS-30.

Done when: the board can show the tree, open a file, edit and save it, search by
name and by content, and render an image, a table or a drawing without handing
you a path to open somewhere else.

### W6 — there is a terminal in the village

Closes TR-01 through TR-04, TR-06, TR-09 through TR-12, UI-12, UI-40.

Done when: a real shell runs on the board, survives the app closing, and a dev
server it starts is reachable without you hunting for the port.

### W7 — a project is fully yours

The largest wave, and the least glamorous. Everything about founding, naming,
configuring and disposing of projects and sessions.

Closes WS-02 through WS-11, WS-13 through WS-15, WS-19, WS-20, WS-22 through
WS-28, WS-52, ST-23 through ST-27, TR-24, TR-25, FS-34, AG-21, UI-06, UI-08,
UI-10, UI-14, UI-30, UI-36, UI-38.

Done when: you can create or clone a repository as well as point at one; rename,
relink and abandon both projects and sessions, with an honest preflight before
anything is destroyed; choose how a session's worktree is cut rather than always
getting a fresh branch; set a project's worktree root, default branch, remotes,
account, scripts and environment; and every kind of trouble a checkout can be in
shows as a state on the district instead of silence.

### W8 — the settings island

There is no settings island. No windmill, no workshop, nowhere for any of it.

Closes ST-01, ST-04 through ST-07, ST-10 through ST-14, ST-17 through ST-21,
ST-28 through ST-31, AG-07, AG-09, AG-10, AG-11, TR-07, FS-32, UI-16.

Done when: the island exists and holds every app-wide setting; agent CLIs can be
installed, updated, authenticated and pinned from it; MCP servers can be added
and edited rather than only switched on and off; skills can be installed and
written; and accounts connect.

### W9 — the village is alive

Mostly art and behaviour rather than ledger rows, and the one wave whose payoff
is purely how it feels.

Closes AG-18, AG-40, and the unnumbered work: villagers that walk and carry a
session's identity, the four growth stages that were never drawn, what happens
when a project has more sessions than its district has houses or the island has
more projects than plots, and land that retracts when a project is abandoned.

Done when: you can tell from the water who is working, who is stuck and who is
waiting for you, without opening anything.

### W10 — other machines, and work that runs itself

Closes WS-04, TR-13 through TR-20, ST-22, ST-32, UI-15, UI-41.

Done when: a remote host can be added and a session run on it end to end, and a
session can be scheduled to start without you.

### W11 — it is an app you install

Closes UI-01 through UI-04, UI-27 through UI-29, UI-34, UI-42, ST-09, ST-34,
ST-35, TR-23.

Done when: it launches from the Applications folder, recovers from a bad boot,
tells you when something wants you while you are elsewhere, and updates itself.

## What was cut on purpose

Kept here so none of it quietly returns as a panel.

- The split-pane workbench, its tab strips and its terminal drawer (UI-11,
  UI-12's drawer form, UI-13, UI-20, UI-32, UI-33). One board shows one thing.
- The persistent project and task sidebar (UI-19) and its status dots (UI-37).
  The rail and the roster do this.
- The project view's section tabs (UI-07). A project's board opens on its
  sessions and the checkout is a footnote.
- The composer as a separate placed object (AG-24) and its imperative text API
  (AG-54). The last line of the board is where you write, always.
- An OS deep-link scheme (UI-24), which emdash does not have either.
- The workspace-server artifact URL (ST-16), which stays build configuration.

## The work that has no ledger number

The ledger only covers capability inherited from emdash. These are ours, from the
catalog's build list, art list and open questions.

Done: the fork and the deleted front end, the wire client without React, the
transport, the ported state rules, the shore pass client-side, district
composition, hit testing, the camera moves, the board itself, the plot and
building mapping, the rail and the roster (B0-01 through B0-04, B1-01 through
B1-05, B2-01 through B2-05, B2-08, B2-09, B3-02).

Not started, and each one is real work:

| | Wave |
|---|---|
| Sprite atlas packing and scoped loading — 1,031 loose files today (B2-06, B2-07) | W9 |
| Villagers that walk: per-session identity, spawn and despawn, directable goals (B1-06, B5-01 through B5-03, B5-05) | W9 |
| Status legible from the water, whatever Q-STATUS lands on (B5-04) | W9 |
| Growth stages 1, 2, 3 and 5 — only 0 and 4 are drawn, so nothing grows | W9 |
| Overflow: more projects than plots, more sessions than houses (Q-PLOT-CAPACITY, Q-TASK-DENSITY) | W9 |
| Land retraction when a project is abandoned (Q-RETRACT) | W9 |
| The character sprite set — idle, walk, working, sleeping, distressed. A full commission, not a recolour (art batch 1) | W9 |
| Status overlays (art batch 2) | W9 |
| The windmill, blades and all (art batch 3) | W8 |
| Parchment and chalkboard surfaces — the board is plain timber today (art batch 4) | W5 |
| An icon vocabulary for branch, diff, PR, terminal, error (art batch 5) | W3 |
| Stage-5 landmarks that exceed the artist's own ceiling (art batch 6) | W9 |
| The written palette and style guide any commissioned artist needs (art batch 8) | W9 |
| Perf under load: camera moving, villagers ticking, a board open (B2-10, B6-05) | W9 |
| A driven harness over the real feature set (B6-03) | W1 |
| A parity checklist harness generated from this file (B6-04) | W1 |
| Visual checks on every restyled surface before it counts as done (B6-06) | W5 |

### Open design questions

The catalog asks twenty. Exactly one is decided: Q-WORKBENCH, one board. The
other nineteen carry a recommendation nobody has ruled on, which is fine while
they are far off and a problem the moment their wave starts.

Three have been answered in practice by what got built, and the catalog should
be updated to say so: Q-SIDEBAR (the rail and the roster, no list panel),
Q-PALETTE's underlying tension (the slash on the line already breaks the "no
conventional control" purity and reads fine), and Q-STAGE-METRIC (manual, stage
four on founding).

The ones that block a wave and need a call before it starts: Q-KEYBOARD and
Q-PALETTE for W1, Q-ERRORS and Q-MOTIF for W3, Q-EDITOR for W5, Q-TERMFONT for
W6, Q-SETTINGS, Q-MCP and Q-THEME for W8, Q-STATUS, Q-PLOT-CAPACITY,
Q-TASK-DENSITY and Q-RETRACT for W9, Q-MACHINES for W10, and Q-NOTIFY,
Q-ONBOARD and Q-MULTIWINDOW for W11.

## The ledger

Every row from `BUILD-CATALOG.md` section 2, with its state and its wave.

| # | Feature | State | Wave |
|---|---|---|---|
| AG-01 | Supported-agent catalog (37 providers) | done |  |
| AG-02 | Per-agent capability declarations (11 typed capabilities) | part | W2 |
| AG-03 | ACP session transport | kept |  |
| AG-04 | Vendor event-field enrichment | kept |  |
| AG-05 | Session resumability & provider session-id tracking | done |  |
| AG-06 | Hook-driven status & session signals | kept |  |
| AG-07 | MCP server management, scoped per agent | part | W8 |
| AG-08 | Workspace trust pre-authorization | kept |  |
| AG-09 | Per-agent auth status detection |  | W8 |
| AG-10 | Multi-account registry (issue trackers etc.) |  | W8 |
| AG-11 | CLI dependency install/update/uninstall |  | W8 |
| AG-12 | Agent-process environment sanitization | kept |  |
| AG-13 | Session idle policy & automatic teardown | part | W2 |
| AG-14 | Session intents — persisted resume state | part | W2 |
| AG-15 | ACP session launch / TUI session start contracts | kept |  |
| AG-16 | Conversation index | kept |  |
| AG-17 | Conversation lifecycle reporting | kept |  |
| AG-18 | Agent status derivation & unread badge | part | W9 |
| AG-19 | Live conversation auto-titling from the agent | done |  |
| AG-20 | Normalized transcript event vocabulary | part | W2 |
| AG-21 | Host/runtime availability states |  | W7 |
| AG-22 | Transcript row kinds (message, tool, subagent, thinking, file-op, execute, diff, resource-link, plan, working, turn-outcome) | part | W2 |
| AG-23 | Virtualized, auto-growing transcript scroll | part | W2 |
| AG-24 | Composer placement (centered vs docked) | cut |  |
| AG-25 | Pin the active user message while scrolling |  | W2 |
| AG-26 | User message card | part | W2 |
| AG-27 | Generic tool call row | part | W2 |
| AG-28 | Hierarchical tool grouping (subagents) |  | W2 |
| AG-29 | Subagent card |  | W2 |
| AG-30 | Diff card (file edit preview) |  | W2 |
| AG-31 | Execute card (shell command + live output) |  | W2 |
| AG-32 | File operation card (read/edit/delete/move) |  | W2 |
| AG-33 | Thinking/reasoning card |  | W2 |
| AG-34 | Plan/todo-list card |  | W2 |
| AG-35 | Resource link card |  | W2 |
| AG-36 | Turn outcome / filler rows | part | W2 |
| AG-37 | Markdown rendering (headings, tables, code, Mermaid, GFM, math) |  | W2 |
| AG-38 | Mermaid diagram pan/zoom viewer |  | W2 |
| AG-39 | Copy-to-clipboard affordance |  | W2 |
| AG-40 | Agent status glyph (inline indicator) | cut | W9 |
| AG-41 | Agent selector | done |  |
| AG-42 | Model selector with hover-detail card | done |  |
| AG-43 | Permission mode & collaboration mode selectors | part | W2 |
| AG-44 | Session MCP servers indicator | done |  |
| AG-45 | Context-window usage indicator |  | W2 |
| AG-46 | Attachments (image drag/drop/paste) |  | W2 |
| AG-47 | Send/stop/queue button | part | W2 |
| AG-48 | Notice band (session-state banners) | part | W2 |
| AG-49 | Permission request band | part | W2 |
| AG-50 | Queued prompts band |  | W2 |
| AG-51 | @ mentions (files/issues/symbols/custom) |  | W2 |
| AG-52 | / slash commands | done |  |
| AG-53 | Submit keybindings & multiline editing | part | W1 |
| AG-54 | Prompt editor imperative API | cut |  |
| WS-01 | Add Project modal — Pick Directory | done |  |
| WS-02 | Add Project modal — Create Repository |  | W7 |
| WS-03 | Add Project modal — Clone Repository |  | W7 |
| WS-04 | Project host — local vs SSH ("Machine") |  | W10 |
| WS-05 | Repository inspection / creation errors | part | W7 |
| WS-06 | Rename / delete / relink a project |  | W7 |
| WS-07 | Project availability banner / disabled-action guard |  | W7 |
| WS-08 | Project settings & config sharing |  | W7 |
| WS-09 | Worktree directory setting |  | W7 |
| WS-10 | GitHub account per project |  | W7 |
| WS-11 | Project directory/file tree browsing (for pickers) |  | W7 |
| WS-12 | Create Task modal | done |  |
| WS-13 | Workspace presets (5 kinds) | part | W7 |
| WS-14 | Branch conflict detection & reuse offer |  | W7 |
| WS-15 | Setup step preview |  | W7 |
| WS-16 | Git plan compiler (branch/PR provisioning) | kept |  |
| WS-17 | Task/workspace creation execution | done |  |
| WS-18 | Worktree path derivation | kept |  |
| WS-19 | Worktree creation/removal execution (git ops) | part | W7 |
| WS-20 | Task lifecycle actions | part | W7 |
| WS-21 | Task palette | done | W1 |
| WS-22 | Activity badge (workspace lifecycle) |  | W7 |
| WS-23 | Delete Task modal — informed preflight |  | W7 |
| WS-24 | Workspaces tab (per project or per machine) |  | W7 |
| WS-25 | Workspace row actions (Open in Task / Clean Artifacts / Delete) |  | W7 |
| WS-26 | Bulk "Delete workspaces" |  | W7 |
| WS-27 | Workspace removal / path-issue / script-issue states |  | W7 |
| WS-28 | Observation freshness (fresh/stale/offline) |  | W7 |
| WS-29 | Checkout store (stage/unstage/discard/commit/push/pull/publish) |  | W3 |
| WS-30 | Git action toasts |  | W3 |
| WS-31 | Git error vocabulary |  | W3 |
| WS-32 | Repository store (branches/remotes/provider identity) | kept |  |
| WS-33 | Repository-level wire contract (worktrees/refs/remotes/fetch) | kept |  |
| WS-34 | Branch reference model | kept |  |
| WS-35 | Branch selector components |  | W3 |
| WS-36 | Staged/Unstaged sections |  | W3 |
| WS-37 | Floating action card on selection |  | W3 |
| WS-38 | Preview vs pinned diff tabs |  | W3 |
| WS-39 | Prefetched diff models on hover |  | W3 |
| WS-40 | Commit card |  | W3 |
| WS-41 | Diff main panel |  | W3 |
| WS-42 | Commit history / blame |  | W3 |
| WS-43 | CI check runs |  | W4 |
| WS-44 | Draft line comments (agent-directed notes) |  | W3 |
| WS-45 | PR data model | kept |  |
| WS-46 | PR list/filtering (project level) |  | W4 |
| WS-47 | PR entry (inside a task's Changes panel) |  | W4 |
| WS-48 | Merge footer (3 strategies + bypass) |  | W4 |
| WS-49 | Create PR modal |  | W4 |
| WS-50 | PR-checkout association / drift / sync coordination | kept |  |
| WS-51 | Credential-helper loopback channel | kept |  |
| WS-52 | Three session credential modes |  | W7 |
| WS-53 | Operation-scoped credential injection | kept |  |
| WS-54 | Integration plugin architecture (account-level) |  | W4 |
| WS-55 | Issues plugin architecture | kept |  |
| WS-56 | Issue linking UI |  | W4 |
| WS-57 | PR selector (linking a PR to a task) |  | W4 |
| WS-58 | Shared exclusion-policy engine | kept |  |
| TR-01 | Interactive terminal panes |  | W6 |
| TR-02 | Terminal grid sizing (multi-pane resize) |  | W6 |
| TR-03 | Off-screen terminal host / instant tab switching |  | W6 |
| TR-04 | Terminal persistence via tmux |  | W6 |
| TR-05 | Terminal exit/kill semantics | kept |  |
| TR-06 | Shell resolution & selection |  | W6 |
| TR-07 | Terminal appearance & behavior settings |  | W8 |
| TR-08 | Terminal environment (theme signaling, agent env) | kept |  |
| TR-09 | Automatic dev-server URL detection |  | W6 |
| TR-10 | Manual port forwarding (SSH workspaces) |  | W6 |
| TR-11 | Preview server pill (task titlebar) |  | W6 |
| TR-12 | In-app browser (Emdash Browser) |  | W6 |
| TR-13 | Add/edit/connect a machine |  | W10 |
| TR-14 | Machine status indicator |  | W10 |
| TR-15 | Host settings (per-machine defaults) |  | W10 |
| TR-16 | Workspace server (remote runtime daemon) |  | W10 |
| TR-17 | Machine resource monitoring |  | W10 |
| TR-18 | Host system dependencies |  | W10 |
| TR-19 | Machine's conversations/workspaces lists |  | W10 |
| TR-20 | Workspace disk usage |  | W10 |
| TR-21 | Bound exec primitive | kept |  |
| TR-22 | Execution planning / shell quoting | kept |  |
| TR-23 | Update card (shared component) |  | W11 |
| TR-24 | Script status indicator |  | W7 |
| TR-25 | Stepped loader |  | W7 |
| TR-26 | Runtime broker & host runtime contract | kept |  |
| FS-01 | "Open In ▾" catalog (29 apps) |  | W5 |
| FS-02 | Per-app detection & launch strategy | kept |  |
| FS-03 | "Open path with OS default" |  | W5 |
| FS-04 | Virtualized file/folder tree |  | W5 |
| FS-05 | Multi-select (click/Cmd/Shift) |  | W5 |
| FS-06 | Preview vs pinned file open |  | W5 |
| FS-07 | Create/rename inline draft rows |  | W5 |
| FS-08 | File tree context menu |  | W5 |
| FS-09 | Internal drag & drop (move) |  | W5 |
| FS-10 | External drag-in (import) |  | W5 |
| FS-11 | Drag-out to compose/elsewhere |  | W5 |
| FS-12 | Flat-mode listing |  | W5 |
| FS-13 | Row decoration (git-status badges, tone) |  | W5 |
| FS-14 | File icons by extension |  | W5 |
| FS-15 | Filename / quick-open search |  | W1 |
| FS-16 | Content ("find in files") search |  | W5 |
| FS-17 | Search-results tree |  | W5 |
| FS-18 | Files RPC contract (fs.*, tree, content) | kept |  |
| FS-19 | Open-file store (editor tab lifecycle) | kept |  |
| FS-20 | File-kind renderer routing (text/csv/markdown/html/svg/image/too-large/binary) |  | W5 |
| FS-21 | Monaco text editor |  | W5 |
| FS-22 | CSV renderer |  | W5 |
| FS-23 | Markdown/HTML/SVG/image renderers |  | W5 |
| FS-24 | Text diff (Monaco diff editor) |  | W3 |
| FS-25 | Inline review comments on diff lines |  | W3 |
| FS-26 | Stacked multi-file diff view |  | W3 |
| FS-27 | Image diff view |  | W3 |
| FS-28 | Binary diff fallback |  | W3 |
| FS-29 | Mermaid inline + standalone viewer |  | W2 |
| FS-30 | Image viewer (contained/expandable/standalone/zoom-pan chassis) |  | W5 |
| FS-31 | Shared file-watching service | kept |  |
| FS-32 | Exclusion policy settings UI |  | W8 |
| FS-33 | Disk usage measurement | kept |  |
| FS-34 | Directory selector (in-app column browser) |  | W7 |
| FS-35 | Workspace path containment (security) | kept |  |
| ST-01 | 13 settings pages (General, Integrations, Interface, Browser, Repository, Prompts, System, Workspaces, Conversations, Agents/CLIs, MCP, Skills, Machines) |  | W8 |
| ST-02 | Settings storage model (SQLite override + safeStorage secrets) | kept |  |
| ST-03 | Provider/integration accounts registry | kept |  |
| ST-04 | `tasks` settings (7 fields: auto-name, auto-approve, auto-trust, create-branch, delete-branch, capitalization, issue-context) |  | W8 |
| ST-05 | `project` settings (push-on-create, branch prefix, random suffix, tmux-by-default) |  | W8 |
| ST-06 | `localProject` settings (default projects dir, default worktree dir) |  | W8 |
| ST-07 | `defaultAgent` setting |  | W8 |
| ST-08 | `keyboard` overrides |  | W1 |
| ST-09 | `notifications` settings (enabled, sound, custom sound path, OS notifications, sound-focus-mode) |  | W11 |
| ST-10 | `theme` setting |  | W8 |
| ST-11 | `openIn` settings (default + hidden apps) |  | W8 |
| ST-12 | `interface` settings (task-hover action, auto-right-sidebar, 3× show-left-sidebar-metadata switches, hide-context-bar) |  | W8 |
| ST-13 | `terminal` settings (font family/size, auto-copy, mac-option-as-meta, default shell) |  | W8 |
| ST-14 | `browserPreview` / `browser` settings (profiles, CORS relax, clear-data) |  | W8 |
| ST-15 | `changesViewMode` setting (flat/tree per section) |  | W3 |
| ST-16 | `remoteMachine` install-source setting | cut |  |
| ST-17 | Per-agent-provider config (extra CLI args, env vars) |  | W8 |
| ST-18 | Per-agent executable override |  | W8 |
| ST-19 | MCP server management (catalog + custom) |  | W8 |
| ST-20 | MCP "sync to agents" |  | W8 |
| ST-21 | Skills catalog |  | W8 |
| ST-22 | Automations (scheduled/cron agent runs) |  | W10 |
| ST-23 | Per-project settings — provenance model |  | W7 |
| ST-24 | Per-project "base" settings (GitHub account, worktree root, default branch, base/push remote, git-credential mode, tmux) |  | W7 |
| ST-25 | Per-project "shareable" settings written to `.emdash.json` |  | W7 |
| ST-26 | Config import ("migrate from Conductor/Superset/Paseo/Codex") |  | W7 |
| ST-27 | Per-project environment variables |  | W7 |
| ST-28 | Emdash account (sign-in/out, session states) |  | W8 |
| ST-29 | GitHub accounts (multi-account) |  | W8 |
| ST-30 | Three ways to connect GitHub |  | W8 |
| ST-31 | Other issue-tracker integrations (12 providers) |  | W8 |
| ST-32 | SSH machine connections (form + validation) |  | W10 |
| ST-33 | Full keybinding catalog & conflict model | part | W1 |
| ST-34 | App self-update flow |  | W11 |
| ST-35 | Telemetry consent |  | W11 |
| ST-36 | `.emdash.json` (the one per-repo config file) | kept |  |
| UI-01 | Boot splash |  | W11 |
| UI-02 | Recovery window |  | W11 |
| UI-03 | Onboarding (sign-in + legacy-data import) |  | W11 |
| UI-04 | Welcome screen |  | W11 |
| UI-05 | Home view | done |  |
| UI-06 | Project view — header & actions menu |  | W7 |
| UI-07 | Project view — section tabs (Tasks/PRs/Workspaces/Settings) | cut |  |
| UI-08 | Project view — non-ready states (creating/hydrating/context-error) |  | W7 |
| UI-09 | Task titlebar — breadcrumb + git popover |  | W3 |
| UI-10 | Task titlebar — activity/preview/open-in/drawer-toggle/sidebar-toggle |  | W7 |
| UI-11 | Task main column — split-pane tab workbench | cut |  |
| UI-12 | Task main column — bottom terminal drawer |  | W6 |
| UI-13 | Task sidebar — 3-way toggle (Conversations/Changes/Files) | cut |  |
| UI-14 | Task view — non-ready states (creating/provisioning/missing/teardown) |  | W7 |
| UI-15 | Automations view |  | W10 |
| UI-16 | Settings view |  | W8 |
| UI-17 | Typed view router (5 views) | done | W1 |
| UI-18 | Back/forward history | done | W1 |
| UI-19 | Sidebar tree for projects/tasks | cut |  |
| UI-20 | Tabs for multi-session work inside a task | cut |  |
| UI-21 | Command palette as navigation shortcut | done | W1 |
| UI-22 | In-app deep linking (tab-scoped location) | done | W1 |
| UI-23 | Redirects on missing id | done | W1 |
| UI-24 | No OS deep-link scheme (confirmed absent) | cut |  |
| UI-25 | Command palette (`cmdk`-based) | done | W1 |
| UI-26 | Keyboard shortcuts (full default set) | part | W1 |
| UI-27 | Native application menu |  | W11 |
| UI-28 | System tray |  | W11 |
| UI-29 | Window management (per-platform titlebar/frame) | part | W11 |
| UI-30 | Drag and drop — OS folder → sidebar |  | W7 |
| UI-31 | Drag and drop — workspace file → composer/tree |  | W2 |
| UI-32 | Drag and drop — tabs | cut |  |
| UI-33 | Drag and drop — terminal tabs | cut |  |
| UI-34 | System notifications |  | W11 |
| UI-35 | Toasts |  | W3 |
| UI-36 | The full modal catalog (30 modals) |  | W7 |
| UI-37 | Agent status dots (sidebar) | cut |  |
| UI-38 | Activity badge (workspace lifecycle) |  | W7 |
| UI-39 | Diff stats and PR badges (sidebar rows) |  | W3 |
| UI-40 | Preview-server pills (titlebar) |  | W6 |
| UI-41 | Connection status dot |  | W10 |
| UI-42 | Update indicator (sidebar footer) |  | W11 |
| UI-43 | Context-usage indicator (composer) |  | W2 |
| UI-44 | Boot/crash telemetry (not user-facing) | kept |  |
