# Behaviour under the hood

This section catalogs user-visible behaviour that originates in the runtime/service
layer (`packages/core/src/runtimes/`, `packages/core/src/services/`, `apps/workspace-server/`,
`packages/shared`) rather than in a UI slice. Source: Emdash v1.2.6, commit `95838289f`.

## Resource usage (CPU / memory / disk)

### Live host metrics on the Machine card
- What: a "Resource Utilization" row with three tiles — CPU, Memory, Disk — each
  showing a rounded percent and, for memory/disk, `used / total` in human bytes
  (e.g. "8.2 GB / 16 GB").
- Where: `apps/emdash-desktop/src/core/features/machines/browser/components/machine-resources.tsx`,
  fed by `use-machine-metrics.ts`.
- Sampling: polled every **5,000 ms** (`REFRESH_INTERVAL_MS`) while the card is
  visible and the machine is connected; polling stops entirely (state goes to
  `null`, tiles read "—"/"Unavailable") when the tab isn't enabled or the
  machine isn't `connected`.
- CPU percent is computed by sampling `os.cpus()` twice, **100 ms apart**
  (`FIRST_SAMPLE_INTERVAL_MS`) on the *first* sample of a runtime instance only —
  subsequent samples reuse the previous snapshot, so steady-state sampling has no
  extra latency. Percent is `(idleDelta shrinking)`, rounded to one decimal,
  clamped 0–100.
- Disk usage is `statfs()` on the OS **home directory**, not the project or
  workspace path — i.e. it reports whole-volume usage, not per-project usage.
- A sample failure (statfs error, etc.) surfaces as `{ type: 'sample-failed', message }`
  and the row falls back to its "Unavailable"/"—" display.
- Source: `packages/core/src/runtimes/resource-usage/node/resource-usage-runtime.ts:5-93`,
  `apps/emdash-desktop/src/core/features/machines/browser/use-machine-metrics.ts`.

### Per-workspace disk usage (separate from the above)
- What: the project's "Manage workspaces" table has a Storage column per
  task/workspace: total bytes used and a second line "`N` artifacts" (bytes under
  configured artifact roots, e.g. build output) — or "Loading..." / "Scanning
  artifacts" while a scan is in flight, or "-" if nothing is known yet.
- This is a live recursive `lstat`/`readdir` walk of the workspace directory
  (not `du`), which: separates apparent size vs. on-disk size (512-byte block
  count), tracks hard-linked files so their bytes are counted once
  (`exclusiveDiskBytes`), and tags bytes under any configured "artifact root" path
  separately from the rest. A per-path read error (e.g. permission denied) is
  collected into an `errors[]` list rather than failing the whole scan.
- Source: `packages/core/src/services/fs-usage/node/*.ts`,
  `apps/emdash-desktop/src/core/features/workspaces/contributions/browser/workspace-detail-page.tsx:143-164`,
  `apps/emdash-desktop/src/core/features/workspaces/node/operations/measure-project-workspaces.ts`.

## Automations (scheduling / cron)

Automations are cron-scheduled (or manually triggered) agent runs against a
project, with a full run history. This runtime isn't documented elsewhere in the
catalog beyond the task-side "Automation run pill" (see `emdash-03`), so its
scheduling semantics are captured here.

### Cron scheduling semantics
- Schedule = a 5-field cron expression + an IANA timezone (`AutomationSchedule`).
  Validated at save time: must have exactly 5 whitespace-separated fields
  ("Cron expression must contain exactly five fields"), must have a non-blank
  timezone, and must produce at least one future occurrence, or the deployment
  is rejected with `invalid-schedule` / reasons `malformed_expression`,
  `invalid_expression_or_timezone`, `no_future_occurrence`.
- The scheduler ticks every **60,000 ms** (`DEFAULT_TICK_INTERVAL_MS`) to
  reconcile pending runs, queue due runs, and (re)create the next scheduled run
  per enabled automation. Uses the `croner` library for cron math.
- **Missed-run semantics**: each scheduled run gets a `deadlineAt` equal to the
  *next* occurrence after its own `scheduledAt` (i.e. one full period). If the
  run hasn't been claimed and started by the time its deadline passes (queue
  backlog, app was asleep, etc.), it is marked `skipped` with error code
  `deadline_exceeded`, and the UI renders: **"Skipped because it waited in the
  queue for too long"**. There is no separate "missed" status — a missed run and
  a queue-timeout look identical to the user.
- **Concurrency**: at most **4** automation runs execute at once across the
  whole app (`DEFAULT_MAX_CONCURRENT_RUNS`), and at most **100** due runs are
  claimed per scheduler tick (`DEFAULT_MAX_DUE_PER_TICK`). Only one run per
  automation may be active at a time — a second due run for the same automation
  is skipped with code `previous_running`.
- If an automation is disabled or deleted while a run is pending/queued, that
  run is skipped with `automation_disabled` / `automation_deleted`. If the
  automation's schedule changed since a `scheduled` run was created, that run is
  skipped with `redeployed` and a fresh one is created off the new schedule.
- **Run statuses**: `scheduled → queued → provisioning_workspace →
  starting_session → done | failed | skipped | cancelled`.
- **App-restart recovery**: on scheduler start, any run stuck in
  `provisioning_workspace` or `starting_session` (i.e. the app died mid-run) is
  transitioned to "interrupted" rather than silently resumed or silently lost.
- Trigger kinds are `cron` and `manual`; manual runs (`runNow`) are inserted
  directly as `queued` and bypass the schedule.
- Cancelling a `scheduled` run marks it `skipped` (code `cancelled`); cancelling
  anything already running aborts its `AbortController` and marks it
  `cancelled`.
- Run-name generation defaults to `emdash-<8 hex chars>` when no custom naming
  is supplied.
- Error-message mapping shown in the UI (`automation-run-format.ts`):
  - `deadline_exceeded` → "Skipped because it waited in the queue for too long"
  - `manually_stopped` → "Manually stopped"
  - step `provision_workspace` failure → the raw message, or "Could not prepare
    the automation workspace"
  - step `start_session` failure → the raw message, or "Could not start the
    agent session"
- Source: `packages/core/src/runtimes/automations/node/scheduling/scheduler.ts`,
  `.../scheduling/cron.ts`, `.../api/run.ts`,
  `apps/emdash-desktop/src/core/features/automations/browser/automation-run-format.ts`.

## Attachments

### Size and count limits on pasted/dropped files
- Max attachment size: **50 MB** per file (`MAX_ATTACHMENT_BYTES`).
- Max attachment count is defined as **20** (`MAX_ATTACHMENT_FILES`) but is not
  wired into the upload contract's enforcement path found — the wire contract
  itself only enforces the 50 MB per-file cap via `uploadFile({ maxSize })`.
  Treat the 20-file cap as declared-but-unverified-as-enforced.
- Attachments are owned by either a `conversation` or a `workspace`; owner ids
  are validated to reject `.`, `..`, and path separators (path-safety, not just
  a UI nicety).
- Errors surfaced: `owner-not-found`, `attachment-not-found`, `storage-failed`.
- Source: `packages/core/src/services/attachments/api/index.ts:4-5`.

## Session intents, lifecycle and resume (what happens on quit/restart)

This is the mechanism behind "a session keeps its branch, worktree and
transcript across a restart" and behind recovering agents after the app was
killed mid-conversation.

### Active vs. suspended session intents
- Every running ACP/TUI conversation continuously persists a small "intent"
  record (`{conversationId, status: active|suspended, payload, sessionId,
  updatedAt}`) to a key-value store, keyed `session-intents:<scope>:<conversationId>`
  where scope is `acp` or `tui-agents`.
- On clean stop, the intent is marked `suspended` with a `suspendedCause`
  string such as `'detached'`, `'idle'`, `'user'`, or (specifically on an
  unexpected worker crash/restart) `'worker-restart'`, or `'reconcile-failed'`
  if resuming it on the next boot itself throws.
- On app start, `reconcile()` lists all `active` intents (ones that were never
  cleanly suspended — i.e. the app was killed) and attempts to resume each one
  through the provider's ACP session-resume path; a resume failure marks it
  `suspended` with cause `reconcile-failed` rather than silently dropping it.
  This is the orphaned-session recovery path.
- Source: `packages/core/src/services/session-intents/api/{schemas,store}.ts`,
  `packages/core/src/runtimes/acp/node/runtime/session-manager.ts:895-921`.

### Idle eviction policy (when a session is freed from memory, not killed)
- A background sweep runs every **60,000 ms** by default (`sweepIntervalMs`)
  and evaluates each live conversation/terminal entry against one of three
  idle policies:
  - `always` / `until-complete`: never auto-evicted.
  - `while-attached`: evicted `graceMs` after the last viewer detaches, but
    only if nothing is running.
  - `idle-after` (the session-lifecycle default): evicted once **both** no
    input has arrived for `inputMs` **and** no output for `outputMs` — default
    `outputMs` is **`SESSION_IDLE_MS` = 60 × 60,000 ms = 1 hour**. A busy
    session is never evicted regardless of idle time.
- Output-activity timestamps are throttled to update at most once per
  **30,000 ms** (`ACTIVITY_OUTPUT_THROTTLE_MS`) — rapid streaming output does
  not reset the idle clock on every chunk.
- Eviction runs each registered "evict step" (best-effort, errors logged and
  swallowed per-step, never aborting the others), then tombstones the key so a
  late, straggling event from the torn-down session can't silently resurrect a
  half-cleaned entry — it's only revived by an explicit new input or by
  reappearing in the live entry list.
- Source: `packages/core/src/services/session-lifecycle/node/session-lifecycle.ts:1-330`,
  `packages/core/src/services/session-lifecycle/api/index.ts:33,40`.

## Shell environment resolution (what env an agent/terminal actually gets)

- Emdash captures the **user's login shell's environment** rather than reusing
  Electron's own inherited env, so PATH/nvm/rbenv/etc. entries from the user's
  shell profile reach spawned agents and terminals.
- Shell resolution order: `$SHELL` env var → the OS user's registered login
  shell (`os.userInfo().shell`) → `/bin/bash` → `/bin/sh` (first one that
  exists on disk wins).
- Capture command is exactly `<shell> -ilc env` — **interactive + login**
  shell, so `.zshrc`/`.bash_profile` etc. are sourced (matches the pattern this
  project's own dev notes assume).
- Capture timeout: **5,000 ms** default; stdout/stderr capped at **1 MiB**
  (`maxBuffer`). A non-zero exit or timeout surfaces as `capture-failed` with
  the shell path and stderr (or "shell env capture exited with status N").
- On Windows, no shell capture happens at all — `process.env` is used directly
  and the result is tagged `source: 'windows'`.
- A guard env var (`SHELL_ENV_CAPTURE_GUARD`) is injected during the capture
  subprocess and always stripped from the result before it's used, presumably
  to let shell startup scripts detect "I'm being probed by Emdash" and skip
  slow init.
- Terminal/PTY sessions additionally get, on top of the captured env:
  `TERM=xterm-256color`, `COLORTERM=truecolor`, `TERM_PROGRAM=emdash` (visible
  to any script checking `$TERM_PROGRAM`), and `SHELL` forced to the resolved
  shell profile's executable (POSIX/csh families) or the platform default
  (`/bin/zsh` on macOS, `/bin/bash` elsewhere) if nothing else is known.
  `HOME` is filled in from `os.homedir()` if absent.
- Deliberately **not** set: `CI=1` is explicitly never injected into script
  runs — called out in-source as "a documented breaking change" relative to
  the old behaviour, meaning agent/lifecycle scripts cannot assume `CI` is set.
- Source: `packages/core/src/services/shell-env/node/capture.ts`,
  `packages/core/src/services/pty/api/terminal-env.ts`,
  `packages/core/src/runtimes/scripts/node/env.ts:1-13`.

### Workspace/task env vars available to lifecycle scripts and terminals
Lifecycle scripts (`prepare`/`setup`/`run`/`teardown`, defined in a workspace's
`.emdash.json`) and any script run from the workspace's script runner receive:
- `EMDASH_TASK_ID` — the workspace record id.
- `EMDASH_TASK_NAME` — a slugified form of the branch name (falls back to the
  worktree directory's basename if no branch fact is known); slugify lowercases,
  strips to `[a-z0-9-]`, collapses repeats, and defaults to `'task'` if empty.
- `EMDASH_TASK_PATH` — the worktree's absolute path.
- `EMDASH_ROOT_PATH` — the repository root (falls back to the worktree path).
- `EMDASH_DEFAULT_BRANCH` — only present when the base/default branch is known
  (omitted, not empty-stringed, otherwise).
- `EMDASH_PORT` — a deterministic port derived from a hash of the workspace
  path: `50000 + (hash(path) mod 1000) * 10`, i.e. one of 1,000 possible ports
  in `[50000, 59990]` step 10, **stable across restarts for the same worktree
  path** so a dev server bound to it keeps the same port every run.
- PATH and the rest of the ambient environment come from the login-shell
  capture above, not from this map — this map is intentionally small and
  workspace-fact-derived only (no `process.env` merge).
- Source: `packages/core/src/runtimes/scripts/node/env.ts`.

## Script runner (prepare / setup / run / teardown)

- Four lifecycle script kinds exist: `prepare`, `setup`, `run`, `teardown`,
  each keyed by `(workspacePath, script)` — the same key space whether the
  registry auto-ran it (`provenance: 'activation'`) or a user manually re-ran it
  (`'manual'`/`'retry'`) from a script panel.
- Run status is one of `running | succeeded | failed | timed-out | cancelled` —
  a **timed-out run is a distinct terminal state from failed**, and a
  user-cancelled run is distinct from both.
- If a `timeoutMs` is supplied, the run is force-settled as `timed-out`; if
  omitted there is no timeout at all (a `run` dev-server script is expected to
  run indefinitely).
- Only the **last run per (workspace, script)** is retained, in memory, with a
  capped **~16 KiB** output tail that survives past the process exit — nothing
  about script run history survives an app/worker restart (no run history UI
  beyond "the last run").
- A `run`-kind script's stdout is scanned by the **same preview-URL detector**
  interactive terminals use (see Preview detection below), so a dev server
  started from a lifecycle script surfaces in the app's preview UI exactly like
  one typed by hand.
- Keyboard input can be sent into an in-flight run's PTY (for interactive
  prompts scripts might emit), and it can be resized.
- Source: `packages/core/src/runtimes/scripts/api/schemas.ts:17-101`.

## Workspace lifecycle steps (per-workspace activity timeline)

- A workspace's durable lifecycle is modeled as an ordered list of named steps:
  creation-class (`adopt-worktree`, `fetch-branch`, `fetch-remote-base`,
  `create-worktree`, `configure-branch` — run in the foreground, block the
  creation call), background-class (`copy-artifacts`, `push-branch`,
  `fetch-refs` — run after creation returns), and script-class (`prepare`,
  `setup`, `run`, `teardown` — track the current activation).
- Step statuses: `pending | running | succeeded | failed | skipped |
  cancelled`. Semantics called out explicitly in source:
  - `pending`/`running` read as **incomplete** and are idempotently replayed on
    host restart or the next activation (i.e. an interrupted background step
    resumes automatically rather than needing user action).
  - `failed` is terminal and is **never** auto-retried — only an explicit
    "retry" action re-runs it. Only `copy-artifacts` and `push-branch` are
    user-retryable steps (`retryableLifecycleStepSchema`); a retry request for
    a step that isn't currently `failed` is a no-op that returns the current
    record unchanged.
  - `skipped` = planned but became inapplicable at runtime (distinct from a
    step that was never applicable at all, which is simply absent from the
    list, not present-and-skipped).
  - `cancelled` = the user stopped it (deactivation, a drawer's stop button) or
    an app restart interrupted it mid-flight — distinct from both `failed` and
    "never started".
- This step list is the single source of truth driving replay, gating,
  retry, *and* the workspace's Activity timeline UI — i.e. what the Activity
  tab shows is a direct rendering of this persisted state machine, not a
  separate event log.
- Source: `packages/core/src/runtimes/workspace-registry/api/schemas/lifecycle-steps.ts:1-100`.

## Preview / dev-server detection

- Detection watches terminal (and lifecycle-`run`-script) stdout for URLs
  matching `http(s)://(localhost|127.0.0.1|0.0.0.0|[ipv6])(:port)?(/path)?`,
  scanning a rolling 4 KiB buffer (`MAX_BUFFER`) after stripping ANSI escape
  codes/OSC sequences and carriage returns.
- Once a URL is seen, the port is probed with a raw TCP connect (not an HTTP
  request): **500 ms** timeout (`PROBE_TIMEOUT_MS`) per attempt.
- Adaptive probe cadence, explicitly documented in-source: **1,000 ms**
  (`PROBE_FAST_INTERVAL_MS`) fast polling until the port first answers (since a
  just-detected server may still be starting) and again immediately after any
  single failure so a real shutdown is caught within about a second; once
  confirmed open, cadence backs off to **15,000 ms** (`PROBE_STEADY_INTERVAL_MS`)
  — cutting probe cost from 60/minute to 4/minute per detected URL.
  A server is only declared closed (and the preview surface removed) after
  **2 consecutive** failed probes (`PROBE_FAILURES_TO_CLOSE`), not one.
- The PTY exiting also immediately closes any preview URLs it had open
  (`reason: 'pty-exit'`), independent of the port probe.
- `0.0.0.0` in output is treated as if the server is reachable at `127.0.0.1`
  for the purpose of opening a preview link (browsers can't literally hit
  0.0.0.0).
- Source: `packages/core/src/services/preview-detection/node/url-detector.ts:1-197`.

## File watching

- The native OS-level watch backend (`@parcel/watcher`) has a startup
  watchdog: if the native watcher doesn't come up within its timeout, it's
  killed off as a `NativeWatchStartupTimeoutError` rather than hanging
  silently.
- Watch loss triggers an event-gap recovery path with **exponential backoff**
  retries (`RESUBSCRIBE_DELAY_MS * 2^attempt`) and an internal resync — i.e. if
  the watcher drops out from under a long directory scan or OS hiccup, Emdash
  keeps retrying with growing delay rather than giving up after one failure or
  hammering immediately.
- Emitted filesystem events are debounced per-consumer (`debounceMs`, caller
  supplied per subscription; e.g. git status watching debounces at 100 ms — see
  Git below).
- File-search's own index watcher debounces at **50 ms** and falls back to a
  **60,000 ms** degraded poll (`DEGRADED_POLL_MS`) if native watching can't be
  used at all for a root.
- The default set of paths excluded from both search and file watching (used
  by ripgrep globs, the path index, and watch-ignore globs alike) includes:
  `.git`, `.svn`, `.hg`, `dist`, `build`, `.next`, `.nuxt`, `out`, `.turbo`,
  `coverage`, `.nyc_output`, `.cache`, `.parcel-cache`, `tmp`, `temp`,
  `.DS_Store`, `Thumbs.db`, `.vscode-test`, `.idea`, `__pycache__`,
  `.pytest_cache`, `venv`, `.venv`, `target`, `.terraform`, `.serverless`,
  `.checkouts`, `checkouts`, `.conductor`, `.cursor`, `.claude`, `.devin`, and
  more (see source) — i.e. `node_modules`-style build/VCS/tool directories are
  invisible to @-file-mentions, content search, and the file-change watcher
  alike.
- Source: `packages/core/src/services/fs-watch/impl/{native-backend,native-watch,watch-service}.ts`,
  `packages/core/src/runtimes/file-search/node/path/index/{watch-supervisor,root-index}.ts`,
  `packages/core/src/primitives/exclusion-policy/api/exclusion-policy.ts:8-40`.

## File search (@-mentions, path search, content search)

- Path search (used by @-file-mention autocomplete and quick-open): default
  **20** results, hard cap **200** (`PATH_SEARCH_DEFAULT_LIMIT` /
  `PATH_SEARCH_MAX_LIMIT`).
- Content (grep) search: default **1,000** results, hard cap **10,000**
  (`CONTENT_SEARCH_DEFAULT_LIMIT` / `CONTENT_SEARCH_MAX_LIMIT`); each match's
  preview text is capped at **16,384 chars** (`CONTENT_SEARCH_MAX_PREVIEW_LENGTH`),
  and the *whole* accumulated preview text across a search session is capped at
  **4 MiB** (`CONTENT_SEARCH_MAX_ACCUMULATED_PREVIEW_LENGTH`) — a search that
  would exceed it stops accumulating rather than growing unbounded.
- Search query strings are capped at **512 chars** (`FILE_SEARCH_MAX_QUERY_LENGTH`).
- Content search is implemented by shelling out to `ripgrep` (`rg`) with
  streamed newline-delimited JSON output; its stderr is capped at **64 KiB**
  and its single largest JSON record at **32 MiB**
  (`DEFAULT_MAX_JSON_RECORD_BYTES`) to bound memory on a pathological match.
- Concurrency caps: at most **2** concurrent directory scans, **4** concurrent
  content searches, and **4** concurrent watch-start operations run at once
  across all open roots (`DEFAULT_MAX_CONCURRENT_SCANS` /
  `_CONTENT_SEARCHES` / `_WATCH_STARTS`), and at most **2** concurrent root
  validation probes (`MAX_CONCURRENT_VALIDATION_PROBES`).
- The path index is backed by SQLite with an FTS index for fast prefix/fuzzy
  matching, persisted per root.
- Source: `packages/core/src/runtimes/file-search/api/schemas.ts:6-11`,
  `packages/core/src/runtimes/file-search/node/file-search-runtime.ts:36-38`,
  `.../content/ripgrep/ripgrep-content-searcher.ts:25-26`,
  `.../content/ripgrep/content-accumulator.ts:10`,
  `.../root/root-registry.ts:28`.

## Git operations

- Reading a file's *raw content* (diff viewer, download) from the git object
  store is capped at **10 MiB** (`MAX_CONTENT_BYTES` for viewing,
  `MAX_DOWNLOAD_BYTES` for the download action). A blob larger than that fails
  with `{ type: 'too-large', maxBytes: 10485760 }` rather than partially
  loading or hanging on a giant file.
- Git-LFS pointer files are specifically detected (by the
  `version https://git-lfs.github.com/spec/` prefix) and rejected as a distinct
  `lfs-pointer` error rather than being shown as (or downloaded as) the literal
  ~130-byte pointer text.
- Repository and checkout status watching debounces filesystem events at
  **100 ms** (`WATCH_DEBOUNCE_MS`) and also force-revalidates on a
  **5-minute** timer (`REVALIDATE_INTERVAL_MS = 5 * 60_000`) independent of any
  watch events — i.e. git status is refreshed at least every 5 minutes even if
  the watcher were to miss something.
- File-content lookups (e.g. for the diff view's surrounding context) debounce
  at a much tighter **25 ms** (`CONTENT_DEBOUNCE_MS`).
- Git author/committer identity resolution for worktree aliases has a
  **TTL-based cache eviction** (`identity-resolver.ts`) — an alias entry not
  reused within its TTL is dropped and its timer cleared.
- Source: `packages/core/src/runtimes/git/node/repository/repository-resource.ts:23-24`,
  `.../checkout/checkout-resource.ts:30-31`, `.../checkout/file-content-registry.ts:26`,
  `.../checkout/ops/download.ts:9,53`, `.../checkout/ops/content.ts:7`,
  `.../allocation/identity-resolver.ts`.

## Process execution primitives (shared by everything above)

- The generic bound-exec wrapper used across services defaults `maxBuffer` to
  **10 MiB** (`DEFAULT_MAX_BUFFER`) for any subprocess's stdout/stderr; exceeding
  it fails the call with "stdout/stderr exceeded maxBuffer" rather than
  truncating silently. A per-call `timeoutMs` is optional; if given and
  exceeded, the process is killed and the error message is literally
  `` `Timed out after ${timeoutMs}ms` ``.
- Source: `packages/core/src/services/exec/api/bound-exec.ts:20,132,157-214`.

## Host dependency detection

- Binaries probed and their exact probe timeouts: resolving via `which`/`where`
  — **5,000 ms** (`WHICH_TIMEOUT_MS`); resolving a symlink's real path —
  **5,000 ms** (`REALPATH_TIMEOUT_MS`); running `<bin> --version` (or similar) to
  read the installed version — **10,000 ms** (`VERSION_PROBE_TIMEOUT_MS`);
  probing for sudo/elevation (`id -u`, `sudo -n true`) — **5,000 ms**
  (`ELEVATION_PROBE_TIMEOUT_MS`) each.
- The "core" dependency set Emdash checks for and can offer to install:
  **required** — `git`, `ripgrep`; **recommended** — `node`, `npm`, `tmux`,
  `curl`. Each has per-OS install commands (Homebrew on macOS, `apt-get` on
  Linux, `winget` on Windows) and a `recommended`/`elevation` flag per method.
- Linux installs go through `apt-get` with a **60-second** dpkg lock wait
  baked into the command itself: `DEBIAN_FRONTEND=noninteractive apt-get -o
  DPkg::Lock::Timeout=60 ...` — i.e. if another apt/dpkg process is holding the
  lock, Emdash's install attempt waits up to 60s for it rather than failing
  immediately.
- Source: `packages/core/src/services/host-dependencies/api/runtime/probe.ts:4-7`,
  `.../api/core-dependencies.ts`, `.../api/apt-commands.ts:1-3`.

## Terminal persistence (tmux)

- Confirms the behaviour this project's own dev notes assume: a terminal
  session is matched to an existing tmux session first by an embedded identity
  marker written into tmux session metadata, then by a **legacy** naming
  scheme (for sessions created before the identity marker existed), then by a
  fresh deterministic name derived from identity + label — in that priority
  order. This is what lets a terminal "live outside the window" and be found
  again by the app after a restart (per `MENDER.md`'s own description of this
  behaviour).
- Source: `packages/core/src/services/pty/api/tmux.ts:10-29`,
  `packages/core/src/services/pty/api/tmux-identity.ts`.

## Conversation lifecycle reporting (feeds the conversation index)

- Session-started, provider-session-id-observed, and session-ended events are
  reported synchronously (fire-and-forget) to a host-local conversation index,
  but **activity** pings (used to compute "last active" times shown in
  conversation lists) are debounced to at most once per **15,000 ms** per
  conversation (`DEFAULT_ACTIVITY_DEBOUNCE_MS`) — so a conversation that's
  streaming continuously doesn't hammer the index with a write per token.
- All these reports are explicitly one-way and best-effort: a delivery failure
  is logged and swallowed, "repaired by the next report or the next resume" —
  meaning a transient index failure never blocks or crashes an agent session,
  it just means the index's "last active" timestamp may lag until the next
  activity tick.
- Source: `packages/core/src/services/conversation-reports/node/reporter.ts:1-77`.

## Config file watching (agent config / MCP config files)

- Config-model file watching explicitly **debounces bursts** of filesystem
  events on a config file (e.g. an agent's own `settings.json`/MCP config being
  rewritten in several small writes by its own CLI) and calls the change
  callback **once per settle**, not once per write — so editing an agent's
  config externally doesn't cause Emdash to reload it multiple times in quick
  succession.
- Source: `packages/core/src/services/config-model/node/config-model.ts:130`.

## Agent auth cache

- Agent provider auth/credential lookups are cached with a **15-minute** TTL
  (`CACHE_TTL_MS = 15 * 60 * 1000`) — i.e. a provider's advertised auth/login
  state (used to decide whether an agent card shows "connected" vs. needing
  login) can be up to 15 minutes stale before being re-probed.
- Source: `packages/core/src/runtimes/agent-config/node/runtime/auth.ts:22,82`.

## Log redaction (what never reaches a log file)

- Every log line goes through both structural (field-name) and string-pattern
  redaction before being written, as defense in depth (the field-name pass
  covers structured log objects; the string pass is a backstop for
  interpolated message text and raw `Error` strings).
- Structural redaction blanks these field names (and any nested `*.<name>`)
  outright: `token`, `password`, `secret`, `passphrase`, `authorization`,
  `set-cookie`, `apiKey`/`api_key`, `accessToken`/`access_token`,
  `refreshToken`/`refresh_token`, `clientSecret`/`client_secret`,
  `sessionToken`/`session_token`.
- String-pattern redaction additionally recognizes and masks, wherever they
  appear in a log message: JSON/`key=value`/`key: bearer <value>` pairs whose
  key looks like a secret; PEM key blocks (`[REDACTED_PEM_BLOCK]`); and
  vendor-specific token shapes by prefix — GitHub (`gh[opsu]_...` →
  `[REDACTED_GITHUB_TOKEN]`), GitLab (`glpat-...`), npm (`npm_...`), AWS
  (`AKIA...` → `[REDACTED_AWS_KEY]`), Stripe (`sk|pk|rk_live|test_...`),
  **Anthropic** (`sk-ant-...` → `[REDACTED_ANTHROPIC_KEY]`, checked *before*
  the generic OpenAI-style pattern), OpenAI-style (`sk-...`), Slack
  (`xox[baprs]-...`), and JWTs (`eyJ...eyJ...` shape).
- A separate PII pass (used where relevant) redacts: any `scheme://user:pass@`
  credential in a URL, `git@host`/`hg@host`/`svn@host` SSH remotes (host is
  redacted, not the whole remote), MAC addresses, email addresses, IPv4/IPv6
  addresses, and home-directory paths — `/Users/<name>` and `/home/<name>`
  become `/Users/[REDACTED_USER]` / `/home/[REDACTED_USER]`, and a Windows
  `C:\Users\<name>` path keeps its drive letter but redacts the username.
- Source: `packages/shared/src/logger/redact.ts:1-119`.

## Config model (script/env resolution precedence — cross-reference)

- Confirms the precedence AGENTS.md states for workspace runtime settings:
  personal config > that workspace's `.emdash.json` > host default > built-in,
  with arrays replacing (not merging) at each layer. This is implemented, not
  just documented, in `packages/core/src/runtimes/workspace-registry/node/{config-model,project-config,scripts-plane}.ts`
  — no new behaviour beyond what AGENTS.md already states, noted here only to
  confirm it's real and not aspirational.

## Corrections to other sections

- None found — the existing UI-slice sections (chat, agents, tasks/workbench,
  projects/remote, git/github, terminal/editor/files, settings/config,
  shell-commands) did not misstate anything this pass touched. The automations
  *runtime* semantics (cron validation, concurrency=4, tick=60s,
  deadline/"missed run" handling, skip-reason vocabulary) were absent from
  `emdash-03-tasks-workbench.md`, which only covers the task-side automation-run
  pill — that gap is filled by the Automations section above rather than being
  a correction.

## Coverage note

Covered in depth: resource-usage, automations/scheduling, attachments,
session-intents + session-lifecycle (resume/orphan/idle-eviction), shell-env,
scripts runtime + workspace lifecycle steps, preview-detection, fs-watch,
file-search, git operation limits, exec primitives, host-dependencies,
terminals/tmux, conversation-reports, config-model debouncing, agent-config
auth caching, and shared log redaction.

Lighter or not independently covered (either thin source-side, or already
well covered by other catalog sections and only cross-referenced here):
`session-start` (a thin contract subset reused by automations — no distinct
user-visible behaviour beyond what session-lifecycle already documents),
`runtime-broker` (pure routing/dispatch, no user-facing states of its own),
`agent-plugins` service (hosting plumbing for `packages/plugins`, whose
user-visible behaviour — models, modes, skills — is provider metadata already
covered under the agents/chat catalog sections), `conversation-index` (a
schema/record-creation contract; its read/search surface lives in the
`conversations` feature already catalogued elsewhere), `files` runtime (thin
wrapper over primitives already covered under editor/files), `host-settings`
(mostly typed config plumbing per AGENTS.md's own description; no numeric
defaults found beyond what's already documented), and `apps/workspace-server/`
beyond the daemon probe timeout noted above (its distribution/health/update UX
is already extensively documented in `emdash-04-projects-remote.md`).
