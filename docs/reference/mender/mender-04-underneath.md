# Underneath: the main process

Scope: `apps/mender/src/main/`, `apps/mender/src/shared/`, `apps/mender/src/entry/`, `electron-builder.config.ts`, `electron.vite.config.ts`, `apps/mender/build/`. This layer wires Electron to Emdash's back-end runtimes (spawned as subprocess "workers") and to Mender's own JSON-file domains (projects, tasks, agents-as-villagers, changes, finding, pictures, village map). Everything below is read from source; nothing was run.

## Window and app lifecycle

### Window creation
- Single `BrowserWindow`, 1480×1020, `backgroundColor: '#2d5d6b'`, `show: false` until `ready-to-show`. `apps/mender/src/main/index.ts:89-108`
- `titleBarStyle: 'hiddenInset'` on macOS (traffic lights float over the world), `'default'` elsewhere. Line 96.
- No menu bar is ever constructed (no `Menu.setApplicationMenu` call anywhere in scope) — Electron's default menu stands, since nothing here builds or replaces it. Unverified whether Electron's implicit default (with Cmd+Q, Cmd+W, etc.) is intentional or an oversight.
- `webPreferences.sandbox: false`, `backgroundThrottling: false` — explicit and commented: the window must keep animating/ticking the wire even when not visible, because "the fire stops breathing" otherwise. Lines 99-107.
- Preload path: `out/preload/index.mjs` under `app.getAppPath()`. Line 100.
- No window position/size memory: width/height are hardcoded constants; nothing persists or restores bounds across launches (no `bounds` read/write found anywhere in scope).
- Renderer loads `ELECTRON_RENDERER_URL` (dev server) if set, else `out/renderer/index.html` from the app path. Lines 143-145.

### Debug mode (`MENDER_DEBUG_PORT`)
- If set, `app.commandLine.appendSwitch('remote-debugging-port', <port>)` before `app.whenReady()`. Line 40.
- On macOS with debug port set, `app.setActivationPolicy('accessory')` — app gets no dock tile and never becomes the active app, so repeated restarts driven externally don't steal focus. Lines 44-47.
- On `ready-to-show` with the port set: `window.setOpacity(0)`, `window.setIgnoreMouseEvents(true)`, `window.showInactive()` — window is fully invisible and non-interactive to the real user, but still composites and answers CDP clicks/screenshots. Lines 110-129.
- Without the debug port: normal `window.show()` + `window.focus()`.

### Visibility signalling to renderer (`Watching`)
- Main tracks window focus/blur/show/hide/minimize/restore and computes one of `'front' | 'behind' | 'gone'`: gone if not visible or minimized, else front if focused else behind. Sent over `MENDER_WATCH_CHANNEL` IPC, re-sent on `did-finish-load` (resets and recomputes) since events before page load are missed. `apps/mender/src/main/index.ts:167-190`.
- Preload buffers the last value (default `'front'`) so a late-subscribing renderer still gets an immediate answer. `apps/mender/src/entry/preload.ts:13-18, 37-40`.
- Purpose stated in comments: background throttling is off (so timers/wire keep running while backgrounded), so the renderer needs an explicit "is anyone looking" signal to decide how hard to draw (e.g. throttle its own animation loop) since Chromium's own visibility APIs would lie.

### App identity, data dir, quit
- `app.setName('Mender')` before anything touches paths — otherwise Electron would derive `userData` from the npm package name `@emdash/mender`, landing data in a scoped subfolder. `index.ts:26`.
- `MENDER_DATA_DIR` env var, if set, overrides `userData` path via `app.setPath('userData', ...)` — lets a second, isolated instance run beside the "real" one for driving a build without colliding on the same SQLite/JSON files. `index.ts:30`. This same var is re-read independently (not shared state) by every module that needs `userData`: `agents.ts:1340`, `tasks.ts:359`, `projects.ts:393`, `runtimes.ts:390`, `prompts.ts:31`.
- `app.on('activate')`: reopens the village window if no windows are open (standard macOS dock-click behavior). `index.ts:75-77`.
- `app.on('window-all-closed')`: quits only on non-macOS. `index.ts:79-81`.
- `app.on('before-quit')`: disposes the root `Scope` (`mender`), which tears down every runtime worker and every registered `scope.add` disposer (agents, tasks). `index.ts:83-85`.
- Renderer console messages and crashes are piped to the main process's stdout as `[renderer] <message> (<source>:<line>)` and `[renderer] gone: <reason>` — since electron-vite dev output doesn't carry the renderer's own console. `index.ts:136-141`.

### Entry / startup failure handling (`src/entry/main.ts`)
- If packaged and `NODE_ENV` unset, forces `NODE_ENV=production` before any other import, so spawned worker subprocesses inherit it — otherwise environment-keyed defaults (e.g. wire validation policy) would silently pick dev behavior in a shipped app. Lines 6-8.
- Global `uncaughtException`/`unhandledRejection` handlers write `[fatal] <stack>` / `[fatal rejection] <stack>` to stdout. Lines 10-17. These do not crash or dialog the app by themselves.
- `start()` dynamically imports `@main/index` and calls `main()`. On any thrown error during boot: writes `[fatal boot] <stack>` to stdout, waits for `app.whenReady()`, then shows a native error dialog titled **"Mender could not start"** with the error's stack (or message, or `String(error)`) as the body. Lines 19-31.

## Data locations and env vars

- `userData` dir (Electron default, or `MENDER_DATA_DIR` override) holds: `agents.json` (task→conversation map, `agents.ts:153`), `tasks.json` (`tasks.ts:99`), `projects.json` (`projects.ts:112`), `prompts.json` (`prompts.ts:31`), `icons/<projectId>.png` (kept project pictures, `projects.ts:353`), plus runtime-owned SQLite/JSON files: `conversations.db`, `file-search.db`, `pull-requests.db`, `workspaces.db`, `host-dependencies.json`, `host-settings.json`, `acp-attachments/`, `acp-intents.json`, `tui-agent-intents.json` — all named in `runtimes.ts:133-341` via a `data(name)` helper scoped to the same dir.
- `MENDER_WORKTREE_ROOT` env var overrides where task worktrees are cut; default `~/mender/worktrees`. `tasks.ts:356`. Worktree path is `<root>/<project-folder-basename>/<branch-with-slashes-as-dashes>`. `tasks.ts:167`.
- `GH_TOKEN` / `GITHUB_TOKEN` env vars: if set, used directly as the GitHub auth token, bypassing `gh auth token`. `github.ts:55-56`.
- `MENDER_DEBUG_PORT` — see above.
- `MENDER_DATA_DIR` — see above.
- `ELECTRON_RENDERER_URL` — dev-server URL, standard electron-vite var, read directly in `index.ts:143`.
- `NODE_ENV` — forced to `production` when packaged and unset (`entry/main.ts:6-8`).

## Which Emdash runtimes are started, and what each gives Mender

All started in `apps/mender/src/main/runtimes.ts` via `startRuntimes(scope)`, each as its own subprocess ("worker") through `@emdash/wire/worker`'s `childProcessSpawner`. Two are wired in-process rather than spawned (host-dependencies, GitHub auth). Dependency graph (who waits on whom) matters for startup order:

1. **fs-watch** (`fs-watch` worker) — file watcher; other runtimes depend on it (git, file-search, files). `runtimes.ts:159-163`.
2. **conversations** — the host's conversation index; ACP and the tui-agents runtime depend on it (`conversations.db`). `runtimes.ts:165-175`.
3. **terminals** — real PTY shells; lifecycle `{ terminal: { kind: 'always' } }`, i.e. terminals outlive the window/session that opened them. `runtimes.ts:177-190`.
4. **scripts** — runs configured lifecycle scripts (prepare/setup/run/teardown) for worktrees. `runtimes.ts:192-202`.
5. **host-settings** — per-host defaults (shellSetup, worktreeRoot, tmux), stored at `host-settings.json`. `runtimes.ts:204-214`.
6. **git** (depends on watcher, host-dependencies resolver, userEnv) — repository inspection, file reads at revisions, default-branch lookup. `runtimes.ts:218-229`.
7. **file-search** (depends on watcher, userEnv) — the searchable index of a checkout's files, backing `@` file-naming, task file suggestion, and "named"/"written" search. `file-search.db`. `runtimes.ts:233-245`.
8. **files** (depends on watcher; `watchIgnore: DEFAULT_WATCHER_EXCLUDE`) — read/write of actual file contents; recursive watching is limited by the default exclusion policy, explicitly because watching `node_modules`/`.git` would hang the first index of a project. `runtimes.ts:249-264`.
9. **pull-requests** (upstream component, not core; depends on `githubAuth` — see below) — PR listing/checks/state, `pull-requests.db`, `incrementalIntervalMs: 60_000`. `runtimes.ts:269-279`.
10. **acp** (depends on conversations, host-dependencies resolver, userEnv; `pluginRegistry` passed in) — the actual agent sessions: spawns agent CLIs over ACP, session state/config/plan/usage/transcript, permission requests, attachments (`acp-attachments/`), queued prompts (`acp-intents.json`). `runtimes.ts:281-295`.
11. **agent-config** (depends on host-dependencies resolver, userEnv; `pluginRegistry`) — reads/writes each agent's own MCP server config. `runtimes.ts:297-308`.
12. **tui-agents** (depends on conversations, host-dependencies resolver, userEnv; `pluginRegistry`) — legacy/TUI (non-ACP) agent runtime; started but Mender's kit UI only surfaces agents with ACP `'supported'` capability, so this appears unused by anything in scope beyond being a dependency the workspace registry needs for teardown. Marked **possibly-vestigial for Mender's UI** — see Unverified.
13. **workspace-registry** (depends on watcher, acp, terminals, tui-agents, scripts, host-settings) — the thing that actually cuts/deletes git worktrees (`createWorktree`, `deleteWorktree`, `createWorkspace`, `getProjectConfig`, `patchPersonalProjectConfig`); `workspaces.db`. Explicitly last to start because tearing a workspace down means killing whatever ran inside it. `runtimes.ts:325-344`.

- **host-dependencies** — not a worker; created in-process via `createHostDependenciesComponent`, backed by `host-dependencies.json`, given `CORE_DEPENDENCIES` plus every plugin's descriptor (`buildDescriptorFromProvider`) from the full `pluginRegistry`. This is what answers "is Claude/Codex/etc. installed on this machine" and runs install commands. `runtimes.ts:140-157`.
- **GitHub auth** — not a worker; `createGitHubAuth()` (`github.ts`) is handed to the pull-requests component as its `githubAuth` dependency, in-process.
- Controllers exposed to the renderer via Wire for the raw runtime domains: `git`, `files` (disk read/write, `filesContract`), `terminals`, `pulls` (pull requests) — `runtimes.ts:354-365`. `workspaces`, `conversations`, `acp`, `agentConfig`, and `host` are kept as main-process-only clients (not exposed as renderer controllers directly); Mender's own domain modules (`tasks.ts`, `agents.ts`, `kit.ts`, `projects.ts`) wrap them instead.
- `observed()` wraps every worker's `.ready()` promise so a readiness failure logs `[runtimes] worker readiness failed: <error>` to stderr instead of becoming an unhandled rejection; callers still see every queued call reject. `runtimes.ts:383-388`.
- Workers accept queued calls before they finish booting (`queuedClient`), so the window opens and the UI can talk to e.g. git immediately without waiting on a readiness gate. `runtimes.ts:346-348`.

## Projects (districts)

Source of truth: `projects.json` in userData, a flat array of `Project` records — **not** Emdash's SQLite-backed project schema at all. `projects.ts:110-127`. Comment states this deliberately: "Emdash keeps projects in a SQLite schema with worktree roots, remotes, per-host settings and a migration chain behind it; what the island needs to know is [far less]." `projects.ts:18-22`.

### Founding a project
- `found()` opens a native `dialog.showOpenDialog` titled **"Found a project"**, message **"Which checkout is moving in?"**, `properties: ['openDirectory', 'createDirectory']`, button label **"Found"**. `projects.ts:216-221`.
- Before showing the dialog: computes which districts are free (not already taken, not common ground, and reachable from what's already standing per the village's growth-order plan). If none are free, returns `{ error: { kind: 'island-full' } }` **without ever showing the dialog** — i.e. "eleven districts, and every one of them taken" (comment, line 213) short-circuits before the folder picker. `projects.ts:197-214`.
- Cancel → `{ error: { kind: 'cancelled' } }`.
- Duplicate path (already founded) → `{ error: { kind: 'already-founded', path } }`. `projects.ts:225-227`.
- Path resolved via `parseNativeAbsolute`; failure or `git.inspectPath` not reporting `kind: 'repository'` → `{ error: { kind: 'not-a-repository', path } }`. This uses git's own inspection (not a `.git`-directory check), so it correctly recognizes a worktree, a submodule, or a bare repo as valid. `projects.ts:229-237`.
- New `Project`: `id` = `crypto.randomUUID()`, `name` = `basename(path)`, `district` = the first free district in growth order, `foundedAt` = ISO timestamp now. `projects.ts:239-245`.
- District count: comments say "eleven districts" (line 213) and "his thirteen" (shared/projects.ts:602 comment) — the shared schema comment says thirteen while the code comment says eleven; the discrepancy is presumably camp + islet (2 common) + 11 assignable = 13 total district slots, 11 of which a project can occupy. Not fully reconciled from this file alone.

### Project fields
`id`, `name` (island display name, renamable, folder name by default), `path`, `district` (assigned district id), `foundedAt`, `picture` (source path the icon was taken from, optional), `icon` (data URL of the kept copy, computed on read, never stored). `projects.ts:24-37`.

### Renaming
- `rename(id, name)`: trims; empty string is a no-op (returns current list unchanged). `projects.ts:250-257`.

### Picture / icon
- `pictures(id, many)` → delegates to `picturesIn(project.path, many)` (see Pictures section).
- `picture(id, from)`: three modes.
  - `{ kind: 'none' }`: deletes the kept icon file (`rm(iconPath(id), { force: true })`), strips `picture` from the stored record. `projects.ts:269-274`.
  - `{ kind: 'own' }`: opens `dialog.showOpenDialog`, title **"A picture for {project.name}"**, message **"Which picture stands for it on the rack?"**, `properties: ['openFile']`, filters name **"Pictures"**, extensions `png, jpg, jpeg, svg, icns, ico, webp, gif`, button label **"Use this"**. Cancel → `{ error: { kind: 'cancelled' } }`. `projects.ts:277-292`.
  - `{ kind: 'in', path }`: picks a path already found among the checkout's own pictures.
  - In all non-`none` cases, `keep(path, project.path, iconPath(id))` copies and downsizes the image to a 256px PNG (`pictures.ts:246-253`, `KEPT = 256`). If unreadable, returns `{ error: { kind: 'unreadable', path } }`. `projects.ts:295-297`.
  - Icon is never stored as base64 in the JSON store — only the source `picture` path is kept; the actual bytes live at `icons/<id>.png` and are read back fresh (`shown()`) on every `list()`. `projects.ts:132-134, 352-355`.

### Carrying (what a new session takes with it that git ignores)
- `carrying(id)`: registers the project as a workspace (idempotent), reads its resolved `preservePatterns` from the workspace registry, cross-references with `ignoredIn(checkout)` (git-ignored top-level entries plus files up to 4 path segments deep matching a "looks local" pattern). Returns `{ base, carries }` where `base` is the default branch (via `git.repository.getDefaultBranch` on `origin`, `null` if none) and `carries` is the list of `{ path, on, folder }`. `projects.ts:159-186`.
- `ignoredIn()` runs `git ls-files -o -i --exclude-standard --directory --no-empty-directory`, filters out obviously-generated dirs by name (`MADE` regex: `dist|build|out|release|target|coverage|.next|.nuxt|.turbo|.cache|.nx|.gradle|.dart_tool|__pycache__|.pytest_cache|tmp|logs?|*.log`, plus `.DS_Store`), and — for anything nested — additionally requires the path be ≤4 segments deep AND match a "looks like local config/secrets" regex (`LOCAL`: `^\.env|\.local$|\.local\.|secret|credential|\.pem$|\.key$|_key$|local\.properties$|node_modules$`, case-insensitive). Capped at 40 entries. `projects.ts:365-391`.
- `carry(id, path, on)`: toggles one path in the resolved `preservePatterns` via `patchPersonalProjectConfig`, then re-derives the current `carrying()` view.

### Abandoning
- `abandon(id)`: first calls the registered `sweeping` callback (set once at startup: `projects.sweeps((project) => tasks.sweep(project))` in `index.ts:55`) which tears down **every task/session in that project first** (worktrees deleted, no branch deletion — see Tasks). Then deletes the kept icon file and removes the project record. `projects.ts:328-336`. Comment: "A project forgotten with its sessions still cut leaves worktrees on the disk that nothing in the village can reach any more, which is the worst of both." Line 330-332.

### Growth model / village map
- `projects.standing()` returns `[...COMMON, ...districts of founded projects]` — feeds `village.ts`'s `map` procedure. `projects.ts:188-191, 195`.
- Legacy stored records with an old `plot`/`stage` schema are migrated on read: `district` falls back to `plot`, `stage` and any stored `icon` are dropped. `projects.ts:117-126`.
- `createVillageController` (`village.ts`) composes the map for a given state of standing districts, caching composed results by a `stateKey`. Costs "about a second" per new state per its own comment (`village.ts:27-31`), so caching (`maps` Map, keyed) avoids recomputation. World files read from `assets/village/`: `base-layout.json` (parsed with a custom `parseLayout` because 116 Unity object ids exceed `2^53` and would be corrupted by plain `JSON.parse`), `districts.json`, `atlas.json`. `village.ts:61-71`.

## Tasks (sessions)

Source of truth: `tasks.json` in userData. `tasks.ts:99`.

### Task fields
`id`, `project`, `name` (as cut, source of the branch), `title` (display name; agent's own title or user's, falls back to `name`), `named` (true once the user has explicitly renamed it — locks out agent auto-retitling), `agent` (provider id, optional), `model` (nullable, remembered for next launch), `branch`, `base` (nullable — the ref it was cut from), `slot` (nullable — which building), `path` (worktree path), `startedAt` (ISO). `tasks.ts:31-53`.

### Beginning a task
- `begin(project, name, slot)`: trims `name`; empty → `{ error: { kind: 'nameless' } }`. `tasks.ts:136-137`.
- Project must exist → else `{ error: { kind: 'no-such-project' } }`.
- Branch computed via `branchFor(name)`: lowercases, replaces non-`[a-z0-9]` runs with `-`, strips leading/trailing `-`, truncates to 48 chars, falls back to `work` if empty, prefixed `mender/`. `tasks.ts:345-352`. E.g. name `"Fix the Thing!! "` → branch `mender/fix-the-thing`.
- If a task with that branch already exists in the project → `{ error: { kind: 'already-here', name } }`. `tasks.ts:145-147`.
- If a `slot` is given and already occupied in that project → `{ error: { kind: 'taken' } }`. `tasks.ts:148`.
- Registers/ensures the project's repository in the workspace registry (`repositoryOf`) — if the project's own checkout is itself a worktree, the *parent* repo id is used, since new worktrees can't be cut from a worktree. `tasks.ts:318-328`.
- Base ref: asks `git.repository.getDefaultBranch` against `origin`; falls back to literal `'HEAD'` string if no remote/answer — comment: "A task starts from the branch the project calls home, not from whatever happens to be checked out." `tasks.ts:158-162`.
- Worktree path: `<worktreeRoot>/<basename(project.path)>/<branch with / → ->` — keyed by the *folder's* name, not the project's island display name, so renaming on the island doesn't relocate future worktrees. `tasks.ts:164-167`.
- Calls `runtimes.workspaces.createWorktree(..., { timeoutMs: 0 })` — no timeout, since cutting a worktree "copies a repository's whole working tree and then runs whatever that project does to make a checkout usable... minutes, not seconds." `tasks.ts:176-181`.
- On failure: `{ error: { kind: 'refused', because: <message> } }`, where the message is translated from the registry's error type: `path-conflict` → `"there is already something at <path>."`; `path-not-found` → `"there is nothing at <path>."`; `repository-not-found` → `"that checkout is not a repository."`; else raw `error.type`. `tasks.ts:330-337`.
- Success: `base` is stored as `null` if it resolved to the `'HEAD'` fallback (so the board can distinguish "no real base" from an actual branch). `tasks.ts:192`.

### File naming (`@`-mentions)
- `files(id, like)`: lazily creates and holds open an `ActiveRootStatus` replica for the task's worktree root (first ask triggers indexing; kept alive thereafter so subsequent keystrokes are fast). Searches via `runtimes.files.searchPaths({ kinds: ['file'], limit: 12 })` (`NAMES = 12`). Errors/still-building index → empty array silently (not surfaced as an error). `tasks.ts:201-231`.

### Renaming / retitling
- `rename(id, title)` (user-initiated): trims; empty is a no-op; sets `title` and `named: true`, permanently locking out agent auto-retitle. `tasks.ts:233-240`.
- `retitle(id, title)` (agent-initiated, called from `agents.ts` when the ACP session reports a `title`): only applies if the task is **not** `named` and the title actually differs; trims; empty is a no-op. `tasks.ts:244-251`.

### Rehand / remodel
- `rehand(id, agent)`: sets `agent`, and **clears `model` to `null`** — comment: "A different agent has a different list of models, so the old choice means nothing to them." `tasks.ts:253-259`. Triggers, from `kit.ts`, an `evict()` of the current agent's House (the old session is torn down) before the switch — see Agents.
- `remodel(id, model)`: just updates the stored `model`.

### Abandoning
- `abandon(id)`: deletes the worktree via `runtimes.workspaces.deleteWorktree({ workspaceId: id, deleteBranch: false }, { timeoutMs: 0 })` — **branch is explicitly preserved** ("The branch outlives the building"). Disposes the held file-search index replica. Removes the task record. `tasks.ts:267-281`.
- `sweep(project)`: same deletion, batched, for every task belonging to a project (used when a project is abandoned).

### Task-name resolution quirk
- Records written before `title` existed are backfilled on every read: `title: task.title || task.name`, and `slot: task.slot ?? null`. `tasks.ts:108-114`.

## Agents (villagers) over ACP

`apps/mender/src/main/agents.ts` (1342 lines) is the largest file in scope: it owns "houses" (one per task with an active/spoken-to session) and projects the raw ACP session state into the `WorkingState`/`Kit` shapes the renderer reads.

### Supported agents
- Every plugin in `pluginRegistry` whose `capabilities.acp.kind === 'supported'` appears as a `Hand` option. From the repo-wide grep, 33 plugins currently declare ACP support: `amp, antigravity, auggie, autohand, charm, claude, cline, codebuddy, codex, commandcode, continue, copilot, cursor, devin, droid, goose, grok, hermes, junie, kilocode, kimi, kiro, letta, mimocode, mistral, muse, oh-my-pi, opencode, prime-agent, qoder, qwen, rovo, zero`. (This list comes from `packages/plugins/`, outside this audit's file scope, but is load-bearing for what Mender's card shows — confirmed by grep, not fully read.)
- Default provider when none is chosen: `'claude'` (`PROVIDER` constant). `agents.ts:85`.
- `hands` list is sorted: installed-on-this-machine first, then alphabetically by name. `kit.ts:222-230`.
- Whether an agent is "here" (installed) comes from the in-process host-dependencies snapshot (`runtimes.host.snapshot.state('current')`), refreshed live. `kit.ts:75-82`.

### Installing an agent (`fetch`)
- Looks up the plugin by id in `pluginRegistry`; not found → `{ error: { kind: 'no-such-agent' } }`. `agents.ts:305-306`.
- Runs the plugin's own install command via `hostDependenciesContract.runInstallCommand` as a live job; then force-refreshes the host snapshot for that dependency id so "not installed" clears from the UI. `agents.ts:311-320`.
- Success but still not available: returns `{ success: true, data: { here: false, because: <what the install actually said> } }` — not an error; the caller decides how to present a "ran but didn't take" install. `agents.ts:321-327`.
- `said()` helper renders install-failure detail: `permission-denied` → `"it is not allowed to write where that goes<: message>."`; else the raw message; else the type with dashes replaced by spaces; else `"nothing said what went wrong."`. `agents.ts:46-53`.
- Thrown `LiveJobFailedError` → `{ error: { kind: 'refused', because: <message or "it would not install."> } }`. `agents.ts:328-336`.
- Explicitly does not auto-select the newly installed agent for any session — "Nothing is chosen for you afterwards... who works in a building is still a press." `agents.ts:301-303`.

### Waking a session
- `wake(task)`: requires a task with an existing conversation (`lodgers[task]`) and an existing task record; else `{ error: { kind: 'no-such-task' } }`. Calls `runtimes.acp.launch({ conversationId, providerId, cwd, sessionId (from records[...].providerSessionId or null), model }, { timeoutMs: 0 })`. On failure, marks the House "broke" with the translated error and returns `{ error: { kind: 'refused', because } }`. `agents.ts:348-371`.
- Comment: a spoken-to session survives restarts (branch, worktree, transcript), but the agent process itself is not running until woken — "opening the board is enough of a reason" to wake it (i.e. Mender wakes on open, not lazily on first message). `shared/agents.ts:365-373`.

### Sending a message (`tell`)
- Empty text with no attachments → `{ error: { kind: 'nothing' } }` (a picture alone still counts as "something said"). `agents.ts:374-376`.
- If no conversation exists yet for the task, one is created on the fly (`moveIn`) — creating a conversation is how "dropping something on an empty building moves somebody in" for both `tell` and `carry`. `agents.ts:381-383, 448-455`.
- Marks the House `watched()` (from here on, timestamps on new items are real wall-clock rather than `0`/"unknown") and `arriving()` (mood flips to `arriving` with doing-text **"someone is on their way."** if the house was `empty`). `agents.ts:389-390`.
- No timeout on either the launch (`runtimes.acp.launch`) or the prompt send (`runtimes.acp.sendPrompt`) — `{ timeoutMs: 0 }` on both. `agents.ts:394-428`.
- Attachments passed through as `{ type: 'attachment', id, mimeType, name }[]`.
- Failure at either the launch or the prompt-send step → House marked broke with the translated error message, returns `{ error: { kind: 'refused', because } }`.

### Conversation lifecycle / persistence
- Task→conversation mapping (`lodgers`) persisted at `agents.json`. On app start, every existing lodger gets a House pre-created (so the island shows moods for sessions that were already running, without requiring the user to open each building first). `agents.ts:221-226`.
- Each House, on `settle(conversation)`, subscribes to four live replicas from the ACP session model: `state` (lifecycle), `activeTurn`, `plan`, `usage`; awaits all four's initial values, then asynchronously loads up to `BACKWARD = 12` turns of history via `runtimes.acp.loadHistory`. A suspended session with no history available is handled gracefully (board says nothing was recoverable rather than pretending it was always empty). `agents.ts:550-623`.
- **Timestamps are synthetic and explicitly approximate.** The protocol carries no clock. An item is stamped `Date.now()` only if the House is already `watching` (i.e., the user has said something since this house was created/loaded) AND the item is not already-finished when first observed; otherwise it is stamped `0` ("nought"), meaning "unknown / do not claim a time." Comment block explains this at length: a resumed session replaying its whole history would otherwise falsely claim "this happened just now." `agents.ts:642-666`.
- `evict(task)`: disposes the House, calls `runtimes.acp.terminate` and `runtimes.conversations.delete`, removes the lodger record. Triggered by: switching agents (`rehand` via `kit.choose('hand', ...)`), a project being abandoned (via task sweep — though note `evict` here is the *agent* layer's teardown, separate from the task/worktree teardown), and app disposal.

### Moods
Computed by `moodOf()` (`agents.ts:739-756`), one of: `empty` (no session), `arriving` (starting/replaying/on-the-way), `working` (`isGenerating`), `asking` (a pending permission request exists), `hurt` (an explicit `trouble` string was set, e.g. a launch/send/permission failure, **or** `lastTurnErrored`), `resting` (closed/suspended/idle — "not empty," since the conversation and worktree persist). Priority order: `trouble` (hurt) > no lifecycle yet (arriving) > pending ask (asking) > starting/replaying (arriving) > generating (working) > last turn errored (hurt) > resting.

### The "doing" line
`doingOf()` (`agents.ts:759-766`) produces the one-line status: `asking` → **"waiting on you."**; `arriving` → **"someone is on their way."**; `resting` → **"done, and waiting for you to say something."**; `empty` → **"nobody is working in here."**; otherwise, the last running tool/thinking action, suffixed `…`, or **"working."** as a fallback.

### Context-room ("context limit") — the exact grain the owner flagged
- `room` is computed as `1 - usage.contextUsed / usage.contextSize`, clamped to `[0, 1]`; `null` if there's no usage data or `contextSize <= 0`. `agents.ts:832-836`.
- Comment: "An agent holds a fixed amount in mind at once and gets no warning of its own when that fills: the conversation quietly starts losing its beginning. So it is worth being able to see it coming." `agents.ts:824-831`. This is the only place in main-process/shared code that models "context limit" — there is **no explicit "context limit reached" string anywhere in this scope**; that phrasing (which the owner specifically flagged as the target grain) must live in renderer code outside this audit's scope, or in the `@emdash/core` ACP runtime (also out of scope). Flagged under Unverified.

### Permission requests (asks)
- `askOf()` maps the first pending permission request into `{ requestId, text (the tool call rendered the same way a deed is), options: [{ optionId, name: name.toLowerCase() }] }`. `agents.ts:838-848`. Note: option names are lowercased for display.
- `answer(task, requestId, optionId)` calls `runtimes.acp.resolvePermission`; `no-such-task` if no conversation. `agents.ts:436-446`.

### Cancellation and unsaying
- `hush(task)` → `runtimes.acp.cancelTurn`. A cancelled turn is rendered in the transcript as the note **"you stopped it there."** (tone `faded`). `agents.ts:487-493, 908-909`.
- `unsay(task, id)` → `runtimes.acp.deleteQueuedPrompt` — retracts something said while the agent was busy, before it's been heard. `agents.ts:479-485`.
- A turn ending in error is rendered as a note with tone `sore`, text = the runtime's `outcome.reason` spelled out (underscores → spaces, period appended) or **"it broke off."** if no reason given. `agents.ts:910-916, 1329-1330`.

### Pictures/attachments in the transcript
- `carry(task, file)`: creates a conversation if needed, uploads via `runtimes.acp.uploadAttachment` with `{ timeoutMs: 0 }` (explicit: "a picture off a phone is not small, and none of this is on a deadline"). Only accepts `image/png|jpeg|gif|webp`; anything else uploaded successfully by the runtime is still rejected at this layer with `{ error: { kind: 'refused', because: 'the village only carries pictures.' } }`. `agents.ts:448-466, 800-807`.
- `putDown(task, id)` → `runtimes.acp.deleteAttachment` (removing it before it's sent).
- In the transcript, a message with attachments and no text is rendered as the note **"you handed over {comma-joined attachment names}."**; if there's also text, the text is rendered first as a normal `said` line. `agents.ts:868-881`.

### Kit (card): models, modes, effort, collab, tools, skills, slash commands
All in `apps/mender/src/main/kit.ts`.
- `awake` is true only once the session has actually started and reported either `modelOptions` or `modeOptions` — before that the card shows only `hand`/`hands` and empty everything else. `kit.ts:178-180, 233`.
- `choose(task, 'hand', id)`: **not** a live-session setting — it calls `tasks.rehand()` then `moveOut(task)` (evicts the current House entirely) then redraws. Comment: "Who works here is not a setting on a running session, it is a different person." `kit.ts:100-107`.
- `choose(task, 'model'|'mode'|'effort'|'collab', id)`: requires an already-`awake` card with a live conversation, else `{ error: { kind: 'refused', because: 'nobody is working in here yet.' } }`. Maps to `runtimes.acp.setOption({ key: 'model'|'mode'|'collaborationMode'|'effort', value: id })`. A model choice is also persisted via `tasks.remodel()` for next launch. `kit.ts:109-129`.
- `tool(task, name, on)`: toggles one of the agent's own MCP servers on/off by resaving it via `runtimes.agentConfig.saveMcpServer` — reads current server list via `listMcpForAgent`; unknown name → `{ error: { kind: 'refused', because: '<name> is not one of <hand>'s.' } }`. `kit.ts:132-145`.
- **Skills discovery ("knacks")**: reads `.claude/skills/*/SKILL.md` from two locations — `~/.claude/skills` (tagged `from: 'everywhere'`) and `<worktree>/.claude/skills` (tagged `from: 'here'`) — sorted alphabetically. Description is extracted via regex `^description:\s*(.+)$` against the first 2000 chars of the file's YAML frontmatter, with surrounding quotes stripped. Missing directories/files fail silently (empty list). `kit.ts:299-324`. **This is Claude-specific by path** (`.claude/skills`) even though it's offered regardless of the selected `hand`/agent — flagged under Unverified/Differences.
- **MCP servers ("tools")**: two sources cross-referenced — the agent's own config file (`listMcpForAgent`, which servers are *allowed*) and the live session's reported `mcpServers` (which actually started, and any `startupError`). A server "on" per config but with a live `startupError` surfaces that error string on the card. `kit.ts:266-275`.
- **Slash commands ("orders")**: read straight from the live session's `availableCommands` — "Not a list anybody here keeps." `kit.ts:248-252`.
- Any agent config/session-option failure is rendered via `said()`: `error.message ?? error.type ?? 'it was refused.'`. `kit.ts:326-328`.

### Line/board projection details (verbatim strings and numbers)
- `KEPT = 400` — how many transcript lines the board keeps (`lines.slice(-KEPT)`). `agents.ts:88, 714`.
- `BACKWARD = 12` — turns of history requested on session settle, and turns kept in the "before" buffer once a turn completes. `agents.ts:90, 616, 699`.
- `SPOKE = 40` — lines of a tool's own output shown before truncation. `agents.ts:1132`.
- `MUSED = 60` — lines of a thought shown before truncation. `agents.ts:1134`.
- Truncated bodies carry a `more: <n>` count of additional lines not shown. `agents.ts:1180, 1193, 1247`.
- Thought line text: **"thinking"** while in progress, **"thought for {clock(ms)}"** once done, where `clock()` renders `<n>s` under 60s or `<m>m <s>s` above. `agents.ts:1242, 1251-1254`.
- Tool status marks: running → `…`, error → `✗`, else `·`. `agents.ts:1136-1138`.
- Deed phrasing (`deedOf`, `agents.ts:1258-1283`): `execute-tool-call` → the command itself (path-shortened, see below); `read-tool-call` → **"read {location or title}"**; `create-file-tool-call` → **"wrote {path}"**; `modify-file-tool-call` → **"changed {path}"**; `delete-file-tool-call` → **"removed {path}"**; `search-tool-call` → **"looked for {query}"**; `web-fetch-tool-call` → **"read {pageTitle or url}"**; `spawn-subagent-tool-call` → **"sent {who} off"** or **"sent {who} off to {errand, lowercased first letter}"** (where `who` is `"somebody"` if the tool's own name is `Agent`/`Task`, else the literal name); `create-plan-tool-call` → **"made a plan"**; `mcp-tool-call` → **"{server}: {tool}"** or just `{tool}`.
- Paths and commands are rewritten relative to the checkout root when known — `standing()` strips the root prefix from commands, `inside()` strips it from paths — "on the wood they are mostly the same forty characters over and over, pushing the part you wanted off the end of the line." `agents.ts:1296-1326`.
- Diff rendering for a modified file: computed via the same Myers-algorithm helper as `changes.ts` (see below), summarized as `+{added} −{gone}` when nonzero. `agents.ts:1080-1085`.
- New-file note: `{n} line{s}` count. `agents.ts:1077-1078`.
- Search note: `{n} match{es}`. `agents.ts:1086-1087`.

## Changes / diffs

`apps/mender/src/main/changes.ts` + `diff.ts`.
- Two comparison modes: (a) default — committed (`HEAD`) content vs. current disk content (reads the working tree directly — "the one place in the village that reads a working tree directly," `changes.ts:19-21`); (b) given an `At { sha, from }` — that commit vs. its named parent (`from: null` for a root commit, meaning "everything in it is new").
- Path validation errors: `{ kind: 'not-a-checkout' }` (bad root), `{ kind: 'not-in-the-checkout' }` (path escapes the root or fails relative parsing). `changes.ts:42-46`.
- Binary detection: any text containing a NUL byte is treated as binary; a binary file returns `{ kind: 'binary', added: 0, taken: 0, lines: [] }` with no diff attempted. `changes.ts:89-94, 182-184`.
- File-too-large-for-diffing on disk: files over `HUGE = 4 * 1024 * 1024` bytes (4MB) are treated as binary (not diffed). `changes.ts:36, 157`.
- Deleted-on-both-sides edge case: if the "before" version doesn't exist AND the "after" is also gone, returns `{ error: { kind: 'unreadable', because: 'there is no such file.' } }`. `changes.ts:86-88`.
- `kind` classification: `'new'` (no before), `'gone'` (no after), `'changed'` (lines added or removed), `'same'` (no diff at all — lines array empty even though the file exists).
- Diff windowing: `AROUND = 3` unchanged lines kept around any change; a skipped run ≤ `SKIP = 7` (2×3+1) lines is shown in full rather than collapsed (since a "gap of one or two [lines]" isn't worth summarizing — actually up to 7); longer runs collapse to the literal line **"… {n} lines"**. `changes.ts:29-34, 201-234`.
- Output cap: `LINES = 800` marked lines per response; `more: <n>` count when truncated. `changes.ts:34, 119-121`.
- Diff algorithm: hand-rolled Myers shortest-edit-script (same algorithm git itself uses), explicitly *not* git's own diff output — "what reaches the board has to be lines with a mark on them, not a patch to parse back apart." Common head/tail stripped first to bound the search. Past `FAR = 3000` differences, gives up the O(ND) search and falls back to a plain "everything removed, everything added" listing rather than guessing. `diff.ts:1-13, 27, 60-88`.
- Missing-file-on-disk (ENOENT) is treated as a deletion (`{ kind: 'gone' }`), not an error. `changes.ts:153-154, 162`.
- Any other disk error surfaces via `{ error: { kind: 'unreadable', because: <error.message or "the disk would not say."> } }`. `changes.ts:170-172`.
- Any git error is translated: `error.message` if present, else `{type with underscores→spaces}.`, else `"git would not say."`. `changes.ts:176-179`.

## Finding / search

`apps/mender/src/main/finding.ts`.
- `named(checkout, like)` — filename search; `written(checkout, like)` — content search. Both require the file-search index for that checkout root to be "ready" first.
- Readiness wait: polls every **120ms** up to a **20000ms (`PATIENCE`)** total budget; times out to `{ error: { kind: 'still-reading' } }` if the index never reaches an `active`/non-`building` state (searchable or not) within that window; an explicit `failed` phase also yields `still-reading`... actually returns `false` from `ready()` either way, which both map to `{ kind: 'still-reading' }` at the call site — a genuinely failed index is indistinguishable from a slow one to the user. `finding.ts:53-65, 71-73, 87-89`. Flagged under Unverified/notable since a permanently broken index would always say "still reading."
- `named`: up to `FILES = 60` file-path results via `searchPaths({ kinds: ['file'] })`.
- `written`: a cancellable live job via `searchContent`, up to `FILES = 60` files, each with up to `IN_ONE = 40` matched lines (`{ at: lineNumber, text: previewText }`), limited server-side to 400 files before that per-file/per-line trim.
- Index build failure or search error surfaces as `{ error: { kind: 'no-way-to-look', because: <message or "the index would not say what went wrong."> } }`. `finding.ts:131-136`.

## Pictures

`apps/mender/src/main/pictures.ts` — used for both project-icon discovery and (implicitly) generic small-image loading.
- Candidate list built via `git ls-files -co --exclude-standard -z` (tracked + untracked-but-not-ignored), filtered to `IMAGE` extensions: `png, jpg/jpeg, svg, ico, icns, webp, gif`. `pictures.ts:27, 130-136`.
- Name-based scoring (`named()`, `pictures.ts:35-60`): `+60` for a basename matching `^(app[-_ ]?)?(icon|logo)([-_@.\d]|x\d|$)` or `^favicon`; `+55` for Android-style `ic_launcher(_round)?`/`appicon`/`logo` patterns; `+30` for loosely containing `logo|icon|brand|emblem|mascot|avatar`; `+25` if the directory looks like an iOS appiconset or an icon/logo/brand folder; `+8` if under a common assets-ish directory (`build|public|static|assets?|res|resources|web|images?|img|media|branding`); `-45` if under a tests/fixtures/vendor/node_modules-ish directory; `-25` if the basename looks like a screenshot/banner/splash/hero/preview; `-3` per path segment beyond 4 deep (penalizes deeply nested files).
- Only the top `window = max(SIFTED=160, many*3)` name-ranked candidates are actually opened and measured (avoids decoding thousands of sprite files in a game repo). `pictures.ts:29, 155-166`.
- Pixel-based re-scoring after opening: `+20` if nearly square (aspect deviation <8%), `-20` if very non-square (>40%), `-30` if the longer side is under 32px, `+6` if ≥128px.
- Loading: tries Electron's `nativeImage.createFromPath` first; falls back to `nativeImage.createThumbnailFromPath` (macOS Quick Look) for formats Chromium's decoder won't open directly (SVG, ICNS, WEBP in some cases). `pictures.ts:78-98`.
- Thumbnail cache keyed by path + mtime (`sized` Map, in-memory, unbounded for the process lifetime). `pictures.ts:100-121`.
- "Family" grouping collapses same-logo-different-size sets (Android mipmap densities, iOS appiconset, `icon-16`/`icon-512` naming) to just the largest member. `pictures.ts:69-75, 171-178`.
- Perceptual-duplicate dedup: each surviving candidate reduced to a 12×12 (`PRINT = 12`) bitmap fingerprint; two are "alike" if their aspect ratios are within 8% and their per-pixel byte difference averages under 14. `pictures.ts:210-236`.
- First look shows only "face-scored" candidates (`named-score >= FACE = 20`) up to `many` results if `many <= FIRST = 12` and any faces exist; otherwise (or if none score as a face) falls back to the top-`many` overall-ranked candidates. `pictures.ts:192-193, 206-208`.
- `more` in the response combines both truncations: candidates cut by the family/face filtering, plus candidates never even opened because they fell outside the `window`.
- `THUMB = 96`px working thumbnail size for listing; `KEPT = 256`px for a project's saved own-picture.
- `keep()` (used by project icon-setting) resolves a relative "from" path against the checkout, loads and resizes to `KEPT`, writes as PNG; returns `false` (not an error object) if the image can't be loaded at all.
- `shown()` reads a kept icon back as a `data:image/png;base64,...` URL; returns `undefined` (silently) if the file is missing/unreadable.

## GitHub / pull requests

`apps/mender/src/main/github.ts`.
- No credential store of Mender's own. Deliberately reuses whatever `gh` on the machine is signed in as — comment: "a second place to be signed in is a second place to be signed out of." `github.ts:8-19`.
- `resolveAuth({ repositoryUrl })`: derives the host from the URL (`git@host:...` SSH form parsed by regex, else `new URL(url).hostname`, else fallback `'github.com'`), then resolves a token.
- Token resolution order: `GH_TOKEN` or `GITHUB_TOKEN` env var first; else shells out to `gh auth token --hostname <host>` with a **10000ms timeout**; any failure (missing binary, not logged in, timeout) yields `null`.
- No token found → `{ success: false, error: { type: 'auth_required', host, message: 'nothing on this machine is signed in to {host}.', hint: 'run \`gh auth login\` in a terminal.' } }`. Exact verbatim strings. `github.ts:26-34`.
- Success → `{ token, host, apiBaseUrl: host === 'github.com' ? 'https://api.github.com' : 'https://{host}/api/v3' }` (GitHub Enterprise-aware).
- Nothing is logged, cached, or persisted by this module — the token is fetched fresh per call and handed straight to the pull-requests runtime.

## Prompts (kept snippets)

`apps/mender/src/main/prompts.ts`.
- Stored at `prompts.json`. Seeded on first read (if the store is empty/unreadable) with exactly one entry:
  - id `review-prompt`, title **"Review prompt"**, text: *"Review all changes in this worktree. Focus on correctness, regressions, edge cases, and missing tests. List concrete issues first, then note residual risks."* `prompts.ts:14-20`.
- `keep(prompt)`: trims, assigns a random UUID id, and auto-titles via `titled()`: collapses whitespace; if ≤44 chars, the title is the whole trimmed prompt; otherwise cuts at 44 chars and backs up to the last space (if that space is past position 20) before appending `…`, else hard-cuts at 44 and appends `…`. `prompts.ts:22-28, 52`.
- `forget(id)`: filters it out. No confirmation step at this layer (confirmation, if any, is a renderer/UI concern).
- Explicitly never surfaced to the agent as words — it's the village's own memory of things the user tends to type, not a system prompt or instruction sent to the CLI. Comment: "no agent ever hears about the list itself." `shared/prompts.ts:8-10`.

## Wire / IPC plumbing

- `installWire()` (`wire.ts`) exposes one `MessageChannelMain`-backed wire port over `MENDER_WIRE_CHANNEL`, routing `domain.procedure` paths to the matching controller by splitting on the first `.`. Unknown domain → thrown `Error("Unknown wire domain '<domain>'")` (a real exception, not a typed wire error — would surface as an internal failure). `wire.ts:20-27`.
- Preload (`entry/preload.ts`) exposes exactly five things on `window.mender`: `requestWirePort`, `pathOf(file)` (resolves a dropped `File`'s real filesystem path via `webUtils.getPathForFile`, empty string on failure — used so a dropped file can be referenced by path, e.g. for pictures/carrying), `watching(cb)`, `keep(text)` (writes to the OS clipboard, explicitly the host's clipboard rather than the browser's `navigator.clipboard`, because "a packaged village is loaded off the disk" and lacks a secure-context origin), `openIt(path)` (`shell.openPath`), `showIt(path)` (`shell.showItemInFolder`). No other Electron API surface is exposed to the renderer — no generic IPC passthrough, no `require`, no file-system access outside the wire and these five explicit calls.

## Packaging

`apps/mender/electron-builder.config.ts` + `electron.vite.config.ts` + `apps/mender/build/`.
- App id `dev.kirubel.mender`, product name **Mender**, executable name **Mender**.
- Output to `release/`; artifact name pattern `Mender-${version}-${arch}.${ext}`.
- **No publishing, no update channel, no notarization** — `publish: null`, `notarize: false` explicitly. Comment: "there is nobody to release to yet."
- Files bundled: `out/**/*`, `assets/**/*`, `node_modules/**/*`. `asarUnpack: ['out/main/adapters/**', '**/*.node']` — the two ACP CLI adapter bundles (native programs the OS must load directly, not archive entries) plus any native `.node` binaries are unpacked to real files on disk; everything else stays in the asar archive, including workers spawned at runtime, which resolve correctly from inside the archive via Electron's own patched `node`.
- macOS: category `public.app-category.developer-tools`, `hardenedRuntime: true`, entitlements at `build/entitlements.mac.plist`, icon `build/icon.icns`, single target `dmg` for `arm64` only (**no x64/Intel build target configured**).
- `NSLocalNetworkUsageDescription`: **"Mender reaches agents and hosts on your network."**
- DMG window 520×320, with a file icon at (130,150) and an `/Applications` symlink at (390,150).
- Entitlements (`build/entitlements.mac.plist`): sandboxing explicitly disabled (`com.apple.security.app-sandbox: false` — comment: "the whole app is a thing that runs other people's compilers in other people's folders, and a sandbox is the opposite of that"), `disable-library-validation: true`, `allow-unsigned-executable-memory: true`, `allow-jit: true` (native bits: sqlite, pty, file watcher), `get-task-allow: false`.
- Build: main process bundles from `src/entry/main.ts` plus one Rollup input per worker (from `shared/workers.ts`'s `menderWorkers` map — 15 workers total: fs-watch, git, file-search, files, conversations, terminals, scripts, host-settings, workspace-registry, pull-requests, acp, agent-config, tui-agents — output flattened to `[name].js` so `worker-paths.ts` can resolve `out/main/<id>.js` at runtime). A custom Vite plugin `carryTheAdapters()` copies `packages/plugins/dist/adapters` to `out/main/adapters` after build (silently no-ops if that source dir is missing, i.e. plugins package wasn't built — a real risk of shipping without agent adapters if build order is wrong).
- Workspace packages (`@emdash/core`, `@emdash/plugins`, `@emdash/shared`, `@emdash/wire`, `@mender/village`) are explicitly bundled rather than externalized in main/preload builds, specifically to avoid loading stale dist output at runtime (dev's `development` export condition wouldn't apply to an externalized/Node-resolved import).
- Renderer built with `base: './'` (relative asset URLs, required since the packaged app loads `index.html` off disk rather than serving it), and `assets/` (world files + packed sprite kit) is the renderer's `publicDir`.

## Logging

- No structured/file logger visible in this scope beyond `initWorkerProcessLogging` (from `@emdash/wire/worker/node`, used verbatim by the three custom worker entries — its internals are outside scope) and raw `process.stdout.write`/`process.stderr.write` calls for fatal errors and worker-readiness failures (see Window/App lifecycle and Runtimes sections above for exact strings).
- No redaction logic is present in this layer's own code (AGENTS.md requires file logging to preserve secret redaction, but that responsibility appears to live entirely in the inherited `@emdash/core`/`@emdash/wire` logging infrastructure, out of scope here).

## Differences from MENDER.md

1. **District count is ambiguous/possibly inconsistent.** `MENDER.md` says "A project takes one whole" of "his eleven" districts (also stated as "Eleven districts, and every one of them taken" in `projects.ts:213`), while the shared schema's own comment says "his thirteen" (`shared/projects.ts:602`). The code's actual behavior (`found()`) only ever assigns from `plan().order()` filtered against `COMMON` (camp + islet, always present) — so the discrepancy is very likely just "13 total slots, 2 of which are common ground, 11 assignable," matching MENDER.md's "eleven"/"thirteen" both being correct in different senses — but this file audit cannot confirm the exact total from `districts.json`'s contents (out of scope) with certainty.

2. **Skills discovery is unconditionally Claude-shaped.** MENDER.md describes skills as read "from where the agent actually looks for them" generically ("the skills are read from where the agent actually looks"), implying agent-specific discovery. The actual code (`kit.ts:knacksFor`) hardcodes `.claude/skills` (home directory and worktree) regardless of which `hand`/agent is currently selected for the task — so a session running Codex or Cursor would still be shown Claude's skill folders, not that agent's own. This is a real gap between the stated design ("read from where the agent actually looks") and the implementation (always looks in Claude's own directory).

3. **No "context limit reached" string exists at this layer.** The owner's calibration example ("a message saying 'context limit reached' in red") is not literally produced anywhere in `apps/mender/src/main` or `apps/mender/src/shared`. What exists here is only the numeric `room` fraction (`agents.ts:roomOf`) — the actual user-facing red warning text, if any, must be composed in renderer code (out of this audit's scope) or originate from `@emdash/core`'s ACP runtime. MENDER.md's own description ("Nothing warns an agent that it is running out of room; it simply starts losing the beginning of the conversation, so the village says it instead") matches the *existence* of `room`, but the exact wording used for it is not in this layer.

4. **MENDER.md's "no title bar full of buttons" / "no menu"** is true of the window's own custom chrome, but nothing in this scope removes or replaces Electron's default application menu (no `Menu.setApplicationMenu(null)` or custom menu found) — so on macOS the standard app menu bar (with default items like Quit, Edit, Window) is presumably still present via Electron's built-in default, unless the renderer or an out-of-scope file suppresses it. Not explicitly contradicted by MENDER.md (which talks about in-window chrome, not the OS menu bar), but worth flagging since "no menu" could be read either way.

5. **"An agent runs under its own settings on this machine, the same ones a terminal session gets"** (MENDER.md) is consistent with what's here (ACP launches use the host's actual dependency resolution and `userEnv`/shell-env manager, same as terminals), but this layer does not itself expose any UI or setting for "ask before doing things" / auto-approval policy — permission handling here is purely mechanical (`answer`/pending request forwarding); where that policy is configured (if anywhere accessible to the user) is outside this scope.

6. **Worktree carrying only offers `.env`/local/secret-looking files and known build-output directories** by regex (`MADE`/`LOCAL` in `projects.ts`), not a general "everything git ignores." MENDER.md says "everything git is told to ignore ... is missing from it: the .env, the local keys, the installed dependencies. These are the ones in the checkout that could go along, and which do" — the actual candidate list is explicitly narrower than "everything git ignores" (e.g., build directories like `dist`/`out`/`coverage` are filtered *out* by name on purpose, and nested files must also match the "looks local" pattern) — a deliberate curation MENDER.md doesn't fully spell out but doesn't contradict either, since it also gives `.env`/local keys as the examples.

## Unverified / unclear

- Exact total number and names of the "eleven"/"thirteen" districts, and the full growth-order algorithm's tie-breaking — `districts.json`/`base-layout.json` and `@mender/village`'s `createPlan`/`reachable` logic are out of this audit's scope (package code, not `apps/mender/src/main`).
- Whether Electron's default application menu is actually suppressed somewhere the renderer controls (out of scope) — flagged as Difference #4 above rather than confirmed either way.
- Whether the `tui-agents` worker (started, and a dependency of `workspace-registry`) is ever actually driven by anything in Mender's UI, since the kit/card only surfaces ACP-`'supported'` plugins. It may exist purely because `workspace-registry` requires it as a teardown dependency inherited from Emdash's own wiring, with no user-visible TUI/legacy agent path in Mender at all.
- The exact wording and trigger of any "context limit reached"-style warning text the owner specifically referenced — not found in this scope; likely lives in renderer code or `@emdash/core`.
- Whether a genuinely broken/failed file-search index is ever distinguished from "still building" in the UI — at this layer both map to the identical `{ kind: 'still-reading' }`, so a permanently broken index for a checkout would look to the user like search is perpetually indexing (up to the 20s patience window, repeated on every keystroke thereafter, forever).
- Full list and metadata (name, install command, capability flags) for all 33 ACP-capable plugins — confirmed to exist by grep against `packages/plugins/src/agents/impl/`, but individual plugin files were not read (out of `apps/mender/src/main` scope).
- Whether `carryTheAdapters()`'s silent ENOENT no-op (when `packages/plugins/dist/adapters` doesn't exist at build time) has ever caused a shipped build to lack agent adapters — a build-order risk noted in Packaging but not something this static read can confirm happened.

## Coverage note

Every file listed in scope was read in full: all files under `apps/mender/src/main/` (including `entries/`), all files under `apps/mender/src/shared/`, both files under `apps/mender/src/entry/`, `electron-builder.config.ts`, `electron.vite.config.ts`, and `apps/mender/build/entitlements.mac.plist`. The `packages/plugins/` agent-plugin implementations and `@mender/village`/`@emdash/core` internals referenced from this layer were only grepped for confirming names/counts, not read — they are outside this audit's assigned scope and are covered (if at all) by other agents' audits.
