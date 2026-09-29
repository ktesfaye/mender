# CLI, socket API and automation

cmux ships a large `cmux` command-line binary that mirrors nearly everything the GUI can do, a JSON Unix-socket API (v1 line protocol plus a v2 handle-based JSON protocol) that the CLI itself is a client of, a config-driven custom-command/action system (`cmux.json`), a rule-based automation engine (`~/.cmuxterm/automations.json`), a small AppleScript dictionary, and a reconnectable NDJSON event stream. Sourced primarily from `docs/cli-contract.md` (the authoritative, tested compatibility contract), `docs/automations.md`, `docs/events.md`, `docs/v2-api-migration.md`, `docs/local-tmux.md`, `Resources/cmux.sdef`, the localized-string dump, and targeted reads of `CLI/*.swift`.

## Global invocation

- `cmux <path>` — opens a directory or file's parent in cmux via the app's file-open path, no control socket required. Relative paths resolve from cwd.
- `cmux [global-options] <command> [options]` — run a named command; presentation options may appear before or after the command.
- `cmux --help` / `-h`, `cmux help` — print top-level usage without a socket. Commands are grouped once each under task groups: **Start & Resume, Agents, Navigate & Arrange, Inspect, Customize, Automation, Browser, Remote, Diagnostics / Advanced**.
- `cmux help <topic>` — print one task group without a socket. Topics: `start`, `agents`, `navigate`, `inspect`, `customize`, `automation`, `browser`, `remote`, `diagnostics`. Unknown topic or >1 argument prints top-level usage.
- `cmux --version` / `-v` / `cmux version` — print version summary without a socket. (`version --help` also prints the version summary, a documented quirk: `version` is handled before subcommand help dispatch.)

Global options (before the command):

| Option | Meaning |
| --- | --- |
| `--socket <path>` | Override the socket path for this invocation. |
| `--password <value>` | Explicit socket password; overrides `CMUX_SOCKET_PASSWORD`. |
| `--json` | Prefer machine-readable JSON output (also accepted after the command). |
| `--id-format <refs\|uuids\|both>` | Handle format in JSON/text output (also accepted after the command). |
| `--window <id\|ref\|index>` | Route through a specific window where supported. |

Environment variables:

| Variable | Meaning |
| --- | --- |
| `CMUX_SOCKET_PATH` | Canonical socket path override. |
| `CMUX_SOCKET` | Deprecated alias for `CMUX_SOCKET_PATH`; if both are set and differ, the CLI fails before any socket command. |
| `CMUX_SOCKET_PASSWORD` | Socket password fallback when `--password` is absent. |
| `CMUX_WORKSPACE_ID` | Default workspace context inside cmux terminals. |
| `CMUX_SURFACE_ID` | Default surface context inside cmux terminals. |
| `CMUX_TAB_ID` | Default tab context for tab commands. |

Handles: UUIDs, refs such as `workspace:2`, and plain indexes are accepted anywhere a window/workspace/pane/surface/tab handle is expected.

## Workspaces, panes, splits, surfaces (start & navigate)

### `new-workspace`
Creates a workspace. Flags: `--name <title>`, `--description <text>`, `--command <text>` (initial interactive-shell input, see below), `--cwd <path>`, `--env KEY=VALUE` (repeatable), `--env-file <path>`, `--layout <json>`, `--window <id|ref|index>`, `--focus <true|false>`, `--group <id|ref>`, `--group-placement <afterCurrent|top|end>`, `--group-reference <workspace>`. Unknown flag error lists this exact set (`cli.workspace.create.error.unknownFlag`). Backed by v2 `workspace.create`.

### `workspace` namespace
`cmux workspace <list|create|env|close|rename|select|status|reconnect|disconnect|group>`.
- `workspace status` — prints the workspace's todo lifecycle status (effective, inferred, override lane).
- `workspace status set <todo|working|needs-attention|review|done|auto>` — pins a manual status lane; `auto` clears the pin and a pinned lane auto-clears once the inferred lane changes.
- `workspace env [<handle>] [--mask] [--json]` — prints configured workspace environment variables (see Workspace environment variables below); `--mask` redacts values. Env is deliberately omitted from `workspace list` so a plain listing never leaks secrets. Unknown-flag error: `workspace env: unknown flag '%@'. Known flags: --workspace <id|ref|index>, --window <id|ref|index>, --mask`.
- `workspace reconnect` / `workspace disconnect` — manually reconnect (including a suspended-because-host-unreachable remote/SSH workspace) or stop its remote connection. Both accept a positional handle or `--workspace <id|ref|index>`, defaulting to the caller's, then the selected workspace.
- Unknown subcommand error: `Unknown workspace subcommand: %@. Try: list, create, env, close, rename, select, status, reconnect, disconnect, loading, group`.

### Other workspace/window/pane/surface commands
`list-windows`, `current-window`, `new-window`, `focus-window --window <id|ref|index>`, `close-window --window <id|ref|index>`, `window displays` (list connected displays: name, index, main flag), `window display <name|index>` (move window(s) to a display by exact/substring name or index, preserving size, never stealing focus; `--window` scopes it, else all main windows; `--list` aliases `window displays`), `window default-display [<name>|--clear]` (sets/shows/clears the shared cross-tag default display DEBUG builds open new windows on, stored at `~/.config/cmux/cmux.json` → `app.devWindowDisplay`; also settable in Debug > Debug Windows > Dev Window Display), `move-workspace-to-window`, `reorder-workspace`, `reorder-workspaces` (atomic reorder inside pinned/unpinned groups), `workspace-action --action <name>` (actions: `pin`, `unpin`, `rename`, `clear-name`, `set-description`, `clear-description`, `move-up`, `move-down`, `move-top`, `close-others`, `close-above`, `close-below`, `mark-read`, `mark-unread`, `set-color`, `clear-color`), `list-workspaces`, `move-tab-to-new-workspace`, `close-workspace`, `select-workspace`, `rename-workspace` (alias `rename-window`), `current-workspace`.

Split/pane/surface family: `new-split` (direction + optional `--command`), `list-panes`, `list-pane-surfaces`, `tree` (window/workspace/pane/surface tree), `top` (process/resource usage for windows/workspaces/panes/surfaces — see `cmux top`/`cmux memory` below), `focus-pane`, `new-pane` (terminal or browser content; `--command` for terminal panes only), `new-surface` (`--command` for terminal surfaces only), `close-surface`, `move-surface`, `split-off` (moves a surface into a new split without changing focus by default), `reorder-surface`, `tab-action --action <name>` (actions: `rename`, `clear-name`, `close-left`, `close-right`, `close-others`, `new-terminal-right`, `new-browser-right`, `reload`, `duplicate`, `pin`, `unpin`, `mark-unread`), `rename-tab` (compat wrapper for `tab-action rename`), `drag-surface-to-split`, `refresh-surfaces`, `reload-config`, `surface-health`, `debug-terminals`, `trigger-flash`, `list-panels`/`focus-panel` (compat aliases over pane/surface data).

### Initial terminal command (`--command`)
Accepted by `new-workspace`, `new-split`, `new-pane`, `new-surface` (also `--command=<text>`; a value is required).
- CLI sends it to the v2 socket as `initial_input` with one trailing Enter (`\r`) appended; text (quotes, `&&`, pipes, `$VARS`) is preserved literally and interpreted by the new shell.
- Socket equivalent: `initial_input` on `workspace.create`, `surface.split`, `pane.create`, `surface.create` (including Dock placement); delivered raw at spawn time, so socket clients must append their own Enter.
- **Interactive shell stays alive** — the normal shell spawns and the text is typed into it, unlike the older `initial_command` socket param which replaces the shell with a one-shot process (unchanged, still exists).
- Terminal-only: CLI rejects `--command` when `--type` is explicitly non-terminal (`browser`, `simulator`, `agent-session`); socket rejects `initial_input` with `invalid_params` when `type` is present and non-terminal. Null `type` = terminal.
- Blank/whitespace-only text is dropped silently.
- `new-workspace --layout` ignores `--command` entirely (layout surfaces define their own commands).
- A mirrored remote-tmux workspace **fails closed**: rejects creation requests carrying `initial_input` instead of dropping it; a split next to a cloud-projected pane with explicit `initial_input` stays local.

### Workspace environment variables
A workspace can carry user-defined env vars every shell spawned in it inherits.
- Set via CLI (`--env KEY=VALUE` repeatable, `--env-file <path>` — `KEY=VALUE` lines, blank/`#` comment lines ignored, optional leading `export ` stripped; `--env` overrides a file value for the same key), via `cmux.json` (`env` object on a workspace definition), or via socket `workspace_env` param on `workspace.create`.
- Inheritance: applies to the initial shell and every pane/surface/split created later, no re-export needed; re-applied on every shell recreated at session restore.
- Persistence: stored on the workspace in the session manifest — survives app/daemon restart and session restore. **Values are stored in the session manifest in plaintext on disk.**
- Precedence: overlays the inherited process env as the shell's startup environment (visible to `~/.zprofile`/`~/.zshrc` as they run, but any `export` those files perform for the same key wins afterward). An explicit per-surface environment (layout `surfaces[].env`, SSH startup env) overrides workspace env for that surface.
- Protected `CMUX_*` variables (e.g. `CMUX_WORKSPACE_ID`, `CMUX_SURFACE_ID`, `CMUX_SOCKET_PATH`, `CMUX_SOCKET_PASSWORD`) and terminal identity vars (`TERM`, `COLORTERM`, `TERM_PROGRAM`) can never be overridden — protected at spawn time and silently win.
- Secrets: never logged, masked by `--mask`, kept out of `workspace list`; prefer `--env-file` to avoid shell-history leakage.

## Workspace todos (`cmux todo`)

Per-workspace checklist namespace, shared by sidebar row, checklist popover, the todo pane, `cmux todo` / `cmux workspace status`, and `workspace.todo.*` / `workspace.status.*` socket verbs.

- `todo add "text" [--state <pending|in-progress|completed>] [--origin <user|agent>]`
- `todo list` — prints the numbered list (`<index>` = 1-based number).
- `todo check <index|id>` / `todo uncheck <index|id>` / `todo start <index|id>` (sets in-progress)
- `todo edit <index|id> "text"`
- `todo rm <index|id>`
- `todo clear`
- `todo set ['<json>']` — atomically replaces the whole checklist from a JSON array of `{text, state?, id?, origin?}` (inline arg, or piped on stdin; also accepts `{"items":[...]}`). Items whose `id` matches an existing item keep identity+origin (state updates when given); unnamed items are created (`origin` defaults `user`, `state` defaults `pending`); items not named are removed. **Whole replace is rejected (nothing mutated)** if any text is empty after trimming or the array exceeds 50 items. Reply is the full resulting list. Re-running with the same `id`s updates in place without churning identity — safe for a watcher loop to re-emit the full list every tick.
- `todo open` — opens/focuses the workspace's todo pane (socket `workspace.todo.open`).
- All target the caller's workspace by default; `--workspace <id|ref|index>` overrides.

Item schema: `id` (stable UUID), `text` (trimmed, non-empty, capped 500 chars), `state` (`pending`/`in-progress`/`completed`), `origin` (`user`/`agent`). Cap: 50 items/workspace. Storage order = creation/`set` order (what `todo list` and the wire return); the sidebar/popover/pane's "unchecked float above completed" is display-only, never reorders storage.

**Agent policy** (documented, not code-enforced elsewhere): coding agents must not create/edit/complete/remove/replace checklist items or set/cycle status unless the user explicitly asks — the status lane already infers activity automatically; agents should keep their own plans in their internal tracker.

Example from docs:
```bash
./plan-steps.sh --json | cmux todo set   # [{"text":"lint","state":"completed"}, ...]
cmux todo open
```

## Selection, screen and input

- `read-selection` — reads the active selection from a terminal, file preview, Markdown, or browser surface via the v2 worker-lane method `surface.read_selection` (advertised by `system.capabilities`/`cmux capabilities`). Accepts the usual surface selectors (`window_id`, `workspace_id`, `surface_id`, `terminal_id`, `tab_id`, `pane_id`) **without focusing** anything. Response shape: `has_selection`, `kind`, `text`, `base64` always present; `file_path` for native file/Markdown selections; `line_range` (`start`/`end`, 1-based inclusive) when mappable to source lines; `url` for browser selections; workspace/surface/window identity fields always present (absent window identity is JSON `null`). Selection text capped at 1 MiB before crossing the socket boundary; browser/native text selections truncate with a visible ellipsis; a terminal selection exceeding Ghostty's bounded work budget reports "temporarily unavailable". A supported surface with no selection succeeds with `has_selection:false` and empty text/base64 — still exits 0 and prints the marker `Has selection: false`. Unsupported surface kinds return `not_supported`; a selectable surface whose live view is gone returns `unavailable`. Password-input selections are never exposed.
  - `cmux read-selection --surface surface:2 [--json]`
- `read-screen` — reads terminal text from a surface. `--selection` is a **text-only** compat alias for `read-selection` (omits source metadata) and cannot combine with `--scrollback` or `--lines`.
- `send` / `send-key` — send text / one key to a terminal surface (implicit focused surface). `send-panel` / `send-key-panel` — same, targeting a panel/surface explicitly.

## Notifications

`notify` — sends a notification to a workspace/surface, returns its notification id; `--clear` clears the resolved caller/target scope; supports `--id-format refs|uuids|both`. `notify --clear --surface` requires workspace/window context (error: `notify --clear --surface requires workspace or window context; specify --workspace or --window`).
`list-notifications` — includes `created_at` and `tab_title`.
`dismiss-notification` — removes one (`--id`) or all already-read (`--all-read`); exactly one selector required (error: `dismiss-notification requires exactly one of --id or --all-read`).
`mark-notification-read` — exactly one of `--id`, `--workspace`, or `--all` (error message names all three); `--surface` requires `--workspace`.
`open-notification` — focuses the notification's workspace/surface and marks it read; requires `--id`.
`jump-to-unread` — focuses the latest unread notification.
`clear-notifications` — optionally scoped by workspace/surface/`--window`; also usable as `clear_notifications [--tab=X] [--panel=ID] [--correlation-key=UUID]` (legacy form); `--correlation-key` requires `--panel`.

## Sidebar metadata (build-script / CI surface)

- `set-status` / `clear-status` / `list-status` — status pills keyed by a caller-chosen key so different tools manage their own entries.
- `set-progress` / `clear-progress` — progress bar 0.0–1.0.
- `log` / `clear-log` / `list-log` — sidebar log entries; levels `info`, `progress`, `success`, `warning`, `error`.
- `sidebar-state` — dumps all sidebar metadata (cwd, git branch, ports, status, progress, logs) for a workspace.
- `right-sidebar` — namespace: `toggle`/`show`/`hide` (no success print), `focus` (focus current mode), `set <files|find|vault|sessions|feed|dock|cloud|devices>` (show + switch + focus unless `--no-focus`), short aliases `right-sidebar files|find|vault|sessions|feed|dock|cloud|devices` for `set <mode>` with focus (`cloud` aliases `machines`/`vms`; `devices` aliases `device`/`macs`, both report mode `machines`), `right-sidebar mode` (prints JSON `{visible, mode}`). `--workspace`/`--window <id|ref|index>` target routing resolved before the v1 command is sent; `--no-focus` only valid with `set`.
- Custom sidebars: `sidebar validate [name]`, `sidebar reload [name]` (validate then reload every valid one), `sidebar select <name>` (validate + activate in the picker), `sidebar open <name>` (validate + open as a normal Bonsplit pane tab, preferring right split from focused surface). Files live under `~/.config/cmux/sidebars`.

## Themes

`themes` alone: interactive picker in a TTY, else lists themes. `themes list` — themes + current light/dark defaults. `themes set <theme>` — same theme both appearances. `themes set --light <theme>` / `--dark <theme>` — per-appearance. `themes clear` — removes the cmux theme override.

## Settings, config, docs, shortcuts (customize)

- `settings` — opens Settings (launches cmux if needed). `settings open [target]`. `settings path` — cmux.json paths, docs URL, schema URL, backup reminder, reload command, **no socket**. `settings docs` — same as `docs settings`. `settings <target>` — aliases include `shortcuts`, `json`, `cmux-json`, `browser`, `automation`.
- `shortcuts` — opens Settings to Keyboard Shortcuts.
- `config doctor [--path <file>]` (aliases `config check`, `config validate`) — validates JSONC syntax + semantic `cmux.json` constraints (recognized paths, value types, enums, bounds, nested values, project/global scope). Default discovery checks primary config, project `.cmux/cmux.json` or `cmux.json`, and legacy files; `--path` repeatable; `--scope global|project` overrides scope inference for explicit files. Exit 0 success / 1 any error. No socket required. `--json` output: `{ok, error_count, findings, reload_command, docs_url, schema_url}`; each finding has `label`, `display_path`, `path`, `status`, `ok`, `keys`, optional `message`/`bytes`; a semantic-fail finding also has `issues` (array of `{path (JSON path like $.app.appearance), message (localized)}`), omitted when empty.
- `config path` / `config paths` — cmux.json paths etc., no socket. `config docs` / `config documentation` — same as `docs settings`. `config reload` — asks the running app to reload config, **requires a socket**.
- `config get sidebar-font-size` / `config set sidebar-font-size <points>` / `config sidebar-font-size [points]` (get-or-set) — writes to cmux's editable Ghostty config, reloads running app when available.
- `config get surface-tab-bar-font-size` / `config set ... <points>` / `config surface-tab-bar-font-size [points]` — same pattern for the workspace tab bar text size.
- `docs` (bare) — lists docs topics, no socket. `docs settings` — config docs URL, raw schema URL, cmux.json paths, backup reminder, reload command. `docs shortcuts` — shortcut docs + raw shortcut data. `docs api` — API docs + raw CLI contract resource. `docs browser` — browser automation docs + raw browser-skill resource. `docs agents` — agent integration docs + raw resources. `docs workflows` (aliases `templates`, `presets`, `examples`, `layouts`) — saved-layout lifecycle + shipped workflow-example catalog; `--json` exposes stable example ids, task-fit cues, created/configured surfaces, config files, primitives, requirements, instantiation/adaptation guidance, source recipe links, save-as-layout steps. No socket.
- `disable-browser` / `enable-browser` / `browser-status` — disable/re-enable/report cmux browser creation and link interception; `browser-status` supports `--json`.
- `socket-status` — prints effective automation socket mode and managed source **without connecting to the socket**; `--json` adds configured mode, forced-value status, socket-path observation (`live_enforcement` is intentionally `not_observed`). Works with listener off or cmux not running.
- `agent-hibernation <on|off>` — enable/disable routine Agent Hibernation; `--json`.
- `restore-session` — restores the previously saved cmux session.

## Shipped workflow examples (`cmux docs workflows`)

Named recipes, each with title/summary from strings (`cli.workflow.<id>.title/summary`): **Worktree Agents** (worktree with two coding-agent terminals + context-menu actions), **Full-Stack Dev** (dev server + test watcher + browser preview, optional Git/Feed Dock controls), **SSH Devbox** (remote shell + browser preview in one workspace), **Review PR** (PR commands beside the browser review page), **Docs Workspace** (doc tools beside Markdown view + browser preview), **Quick Agent Buttons** (Codex/Claude launch actions on tab bar + Command Palette), **CI Watch** (long-running CI/Feed monitors kept in Dock instead of workspace panes). Guidance surfaced by the CLI: choose an example that fits the task, open the recipe and copy only needed top-level keys into `.cmux/cmux.json` or `~/.config/cmux/cmux.json` (add `.cmux/dock.json` if it uses Dock), adapt sample paths/commands/URLs/tool names/placements, validate the JSON/JSONC and `cmux reload-config`, then `cmux layout save <name> --description "<what this creates>"` when it looks right. Related layout subcommands: `layout list/inspect/open/save/delete`.

## `cmux welcome` / `cmux feedback` / `cmux feed`

- `welcome` — prints the welcome screen (no-socket help probe confirms it lists e.g. "Toggle Left Sidebar" / "Toggle Right Sidebar").
- `feedback` — opens the feedback UI, or submits feedback headlessly with `--email`, `--body`, and repeated `--image`.
- `feed` — opens the keyboard-first Feed TUI (`cmux feed tui [--opentui|--legacy]`) or manages persisted Feed workstream history.

## Guide and docs entry points

- `guide` / `--skill` (top level) — prints the same short Markdown guide to workspace, terminal, browser, computer-use, and Cloud methods. Works with no app, no socket, no network, no sign-in. `--json` → `{topic:"cmux", format:"markdown", content:"..."}`.
- `cloud guide` / `cloud --skill` (also `vm guide`, `vm --skill`) — same pattern for the Cloud guide (`{topic:"cloud",...}`). Does **not** install a skill or start an agent (that's `vm prompt`/`vm skill`).

## Agents: launcher wrappers and hooks

- `claude-teams` — launches Claude Code with cmux/tmux-style agent-team integration.
- `codex-teams` — launches Codex with cmux-managed subagent panes.
- `omo` — launches OpenCode with oh-my-openagent integration (`cmux omo [opencode-args...]`).
- `omx` — launches Oh My Codex with cmux pane integration (`cmux omx [omx-args...]`).
- `omc` — launches Oh My Claude Code with cmux pane integration (`cmux omc [omc-args...]`).
- `hooks` — install/uninstall/run agent hook integrations under one namespace:
  - `hooks setup` — installs hooks for every supported agent whose binary is on `PATH`. Flags: `--agent <name>`, positional agent filters (`cmux hooks setup rovo`), `--yes`.
  - `hooks uninstall` — same shape for removal.
  - `hooks <agent> install` / `hooks <agent> uninstall` — per-agent (opencode's `install` also supports `--project` for the project-local Feed plugin).
  - `hooks claude <event>` — Claude Code hook events (compat alias: `claude-hook <event>`).
  - `hooks codex <event>` — Codex hook events (compat installer alias: `codex install-hooks` / `codex uninstall-hooks`, and top-level `codex` is a compat alias command for installing/uninstalling Codex hooks: `cmux codex <install-hooks|uninstall-hooks>`).
  - `hooks feed --source <agent>` — converts agent hook events into Feed context.
  - `hooks <agent> <event>` — generic hook surface for `grok`, `opencode`, `pi`, `amp`, `cursor`, `gemini`, `kimi`, `rovodev`, `copilot`, `codebuddy`, `factory`, `qoder`.
  - Kimi is special-cased: setup targets whatever `kimi doctor` reports; without that, tries (in order) `${KIMI_CODE_HOME:-~/.kimi-code}/config.toml` (Kimi Code CLI) then `${KIMI_SHARE_DIR:-~/.kimi}/config.toml` (Kimi CLI ≤1.49) if either exists as a file, then whichever directory exists, defaulting to the Kimi Code CLI path if neither directory exists. Setup refreshes but never removes an existing cmux marker block in the *other* location; `hooks kimi uninstall` removes the block from both locations.
- `claude-hook` — top-level compat alias for Claude Code hook events from stdin JSON.

## `cmux sessions`

`cmux sessions [list]` — lists saved agent session records **without a running socket**, reading hook state from disk. By default includes records active for a workspace/surface, restorable, launch-backed, or transcript-backed; passing `--all` or any record filter (`--session`, `--workspace`, `--surface`, `--cwd`) widens to every matching record. Overrides: `--state-dir <path>`, `--codex-home <path>`. Text output defaults to 100 results; `--limit <n>` (positive integer) or `--all` (removes limit). `--json` object fields: `state_dir`, `default_codex_home`, `total_matches` (before `--limit`), `limit` (`null` with `--all`), `stores` (per-agent hook store files: `agent`, `path`, `exists`, `session_count`), `sessions` (the limited result set).

## `cmux restore` / `cmux fork`

- `restore [--surface <id|ref>] <kind> <checkpoint-id>` — replaces the CLI process with a process restored from structured surface state; `--surface` defaults to the caller's surface when omitted.
- `fork [--surface <id|ref>] <kind> <checkpoint-id>` — same but restores a provider **fork** process.

## `cmux vault`

Vault session-index namespace:
- `vault sessions [--agent <id>] [--folder <path>] [--limit <n>]` — lists indexed agent sessions newest first.
- `vault search <query>` — with operators `agent:`, `repo:`, `ws:`, `before:`, `after:`.
- `vault checkpoints --agent <id> --session <id>` — lists a session's checkpoint timeline (derived turn checkpoints + manual ones).
- `vault checkpoint … [--name <text>]` — creates a manual checkpoint, capturing the workspace git HEAD when available.
- `vault fork … (--checkpoint <id> | --turn <n>) [--open]` — forks a new session from a checkpoint, prints the new session id (plus resume command when available); `--open` also opens it in a new workspace.
- Backed by socket v2 `vault.sessions`, `vault.search`, `vault.checkpoints`, `vault.checkpoint`, `vault.fork`; all support `--json`.
- Errors observed in strings: "Unknown agent.", "No Vault session matched.", "This session has no readable transcript.", "agent and session are required.", "query is required.", "No checkpoint matched. Pass checkpoint <id> or turn <n> from vault checkpoints."

## `cmux comments`

`cmux comments list` (alias `ls`) `[--repo <path>] [--all] [--json]` — read-only listing of diff-viewer review comments saved for one git repository (default: repo containing cwd). Pending only by default; `--all` includes comments already delivered to an agent through a TextBox submission. Backed by socket `comments.list`. Error: "A repository path is required."

## `cmux review`

Reads **local adversarial-review receipts** from the repository's Git metadata **without connecting to the cmux socket**:
- `review list` — enumerates runs newest first.
- `review show [<id|latest>]` — prints one receipt.
- `review findings [<id|latest>] [--all]` — prints surfaced findings, hides refuted/suppressed findings by default.
All subcommands accept `--repo <path>` and `--json`.

## `cmux current` (Find Work)

`cmux current [--limit <1...200>] [--json]` — a bounded, read-only projection of work already owned by cmux (surfaced in the GUI as **Find Work** in the command palette, `commandPalette.currentWork.*`). Read-only: does not ingest anything from `cmux glaeda observe`. Text fields per item include `agent: %@`, `attention: %@`, `cwd: %@`, `freshness: %@`, `possible human obligation: %@`, `Observed: %@; cached owner facts, no refresh`, `Owner %@: %@`, `PR: %@`. Empty state: "No current work observed". Reaching the cap: "Limit reached; more work was observed. Use --limit (maximum 200)." Errors: unexpected argument names known flags `--limit <1...200> --json`; `--limit` may only be supplied once; `--limit` requires an integer 1–200; invalid response reports "missing items". Command-palette equivalent groups items as **Local** / **Cloud**, marks items "May be out of date" or "No open local view · read only", and shows "Additional work is outside this snapshot." when truncated.

## `cmux glaeda`

`cmux glaeda <request|observe> [options]` — a caller-neutral execution-exchange seam, **not another CMUX work database**. Both subcommands are local data operations and do not require a running cmux socket.
- `glaeda request --request-ref <ref> --work-ref <ref> --repository <owner/repo> --commit <sha> --tree <tree>` — emits one `glaeda-external-execution-request/v1` JSON document. Carries exact Git source plus caller correlation only; CMUX workspace/UI and provider placement stay outside the request.
- `glaeda observe --request request.json --receipt result.json` — validates/correlates one bounded Glaeda receipt, emitting an observation (bounded correlation/evidence: request identity, caller's `work_ref`, terminal state, receipt digests). Does not create a workspace, work item, scheduler record, or placement decision.
- The caller that already owns the CMUX work item uses `work_ref` to associate the evidence with its existing lifecycle; `cmux current --json` keeps reading the same bounded projection independently.

## `cmux top` / `cmux memory`

- `top` — prints process/resource usage for cmux windows, workspaces, panes, and surfaces. Error: `top: invalid workspace handle '%@'`; requires a build that supports process diagnostics.
- `memory` — flags: `--all`, `--workspace <id|ref|index>`, `--groups <count>` (1–100), `--json`. Output sections: `APP` header, `  rss  <value>`, `  footprint <value>`, `CHILD PROCESSES` header (or "no child process groups"), `TOP CHILD GROUPS` header with columns `RSS  PROC  COMMAND  ATTRIBUTION`, per-group attribution lines (`workspace %@`, `pane %@`, `surface %@`, or `unattributed`), `recursive RSS %@ across %@`, process-count pluralization. Errors: unknown flag names the full known-flag set above; `--groups` requires a value / must be an integer 1–100; `--workspace` requires a value / invalid handle; unexpected argument; requires a cmux build that supports memory diagnostics.

## `cmux ping` / `capabilities` / `identify` / `rpc`

- `ping` — checks socket connectivity.
- `capabilities` — prints server capabilities as JSON (the advertised v2 method list, including things like `events.stream`, `surface.read_selection`).
- `identify` — prints server identity and caller context (focused window/workspace/pane/surface).
- `rpc <method> [json-params]` — calls a raw v2 socket method with optional JSON params, for anything not wrapped by a dedicated subcommand. Example: `cmux rpc surface.read_selection '{"surface_id":"..."}'`.

## `cmux events`

Streams reconnectable NDJSON events over the v2 method `events.stream`. See "Event stream" section below for the full protocol; CLI options:

| Option | Meaning |
| --- | --- |
| `--after <seq>` / `--after-seq <seq>` | Subscribe after a sequence number. |
| `--cursor-file <path>` | Read starting sequence from a file; updates it after every event. |
| `--name <event>` | Filter by event name (repeatable). |
| `--category <name>` | Filter by category (repeatable). |
| `--reconnect` | Reconnect and resume from last sequence until interrupted. |
| `--limit <n>` | Exit after printing n event frames. |
| `--no-ack` | Suppress the initial ack frame. |
| `--no-heartbeat` / `--no-heartbeats` | Suppress heartbeat frames. |

Examples: `cmux events --cursor-file ~/.cache/cmux/events.seq --reconnect`; `cmux events --category window --category workspace --category pane --category surface`; `cmux events --category feed --category agent --no-heartbeat`.

## `cmux automation`

Manages config-backed event rules living in `~/.cmuxterm/automations.json` (versioned JSON, checkable into a repo). Rules subscribe to the in-process event bus and run ordered actions when they match.

Config shape:
```json
{
  "version": 1,
  "rules": [
    {
      "id": "surface-needs-input",
      "when": { "event": "agent.needs_input" },
      "where": { "workspace.tag": "dispatch", "surface.kind": "terminal" },
      "rate_limit": { "interval_seconds": 30, "maximum": 1 },
      "then": [
        { "action": "notify", "title": "Agent needs input", "body": "Review {{payload.session_id}}" },
        { "action": "rpc", "method": "workspace.reorder", "params": { "index": 1 } }
      ]
    }
  ]
}
```
- `when.event` / `when.category` accept exact names or a `*` prefix/suffix wildcard.
- `where` predicates match against the event payload; common aliases `workspace.tag`, `workspace.title`, `title`, `agent`, `surface.kind`. Predicate objects support `equals`, `contains`, `prefix`, `suffix`, `in`, `not`; selector/contains comparisons ignore case with a locale-independent policy.
- Rules are enabled by default; `"enabled": false` keeps a rule in the file without firing it.
- Rate limit: every rule has one; omitted defaults to one firing/second. Engine caps concurrent firings and keeps the most recent 256 firing records in memory.

Actions:
- `notify` — via TerminalNotificationStore; `workspace_id`/`surface_id` default to the event target; `title`/`subtitle`/`body`/`message` support `{{event.name}}`, `{{event.category}}`, `{{event.source}}`, `{{payload.<key>}}`.
- `rpc` — dispatches any v2 socket method through the normal dispatcher; focus is **suppressed by default**; set `allow_focus: true` (or `focus: true`) to intentionally select a workspace/surface.
- `run` — executes `command`/`cmd` through `/bin/sh -c` in an owned process group; default 60s timeout, `timeout_seconds` up to 300. Env exposed to the child: `CMUX_AUTOMATION_EVENT`, `CMUX_AUTOMATION_EVENT_JSON`, `CMUX_AUTOMATION_RULE_ID`, `CMUX_AUTOMATION_CHAIN` (JSON string array).
- `webhook` — POSTs the event JSON to `url`; optional string headers. URLs with credential-bearing headers (`Authorization`, token, cookie, or API-key headers) must use HTTPS; those headers are stripped before a cross-origin redirect; cleartext redirects are rejected.
- Action-generated events carry an `automation_origin` envelope with the rule chain; a rule already present in its own chain is skipped (stops self-triggering / multi-rule cycles).

CLI:
```text
cmux automation list
cmux automation show <id>
cmux automation test <id> --event <json>
cmux automation enable <id>
cmux automation disable <id>
cmux automation logs [--limit <n>]
cmux automation reload
```
`test` is a **dry run**: evaluates a synthetic event without dispatching actions or mutating rate-limit state. `show` and `test` redact credential-like predicate/action/session/event/webhook-URL fields (including query credentials) before returning them. Event JSON supplied with `@file` is read only from a regular file, bounded to 4 MiB with the same nesting guard as the config loader. `logs` reports the bounded in-memory firing ring from the running process.

## Custom commands and actions (`cmux.json`)

Source: `docs/custom-commands/page.tsx` copy in `web/messages/en.json` (`docs.customCommands.*`).

**File locations** (in order): per-project `./.cmux/cmux.json` (takes precedence), fallback local `./cmux.json` (still supported for existing repos), global `~/.config/cmux/cmux.json` (applies to all projects, fills in commands not defined locally). Local actions/commands override global entries sharing an ID or name. Edit, then press **Cmd+Shift+,** or run `cmux reload-config` to apply.

A `cmux.json` can hold an `actions` registry (nightly-build feature) plus a `commands` array.

### `commands` — simple commands and workspace commands
- **Simple command** fields: `name` (required, shown in palette), `description` (optional), `keywords` (extra search terms), `command` (shell command run in the focused terminal's cwd — prefix with a cd to run relative to repo root or any specific directory), `confirm` (show confirmation dialog first).
- **Workspace command** fields: `name` (workspace tab name, defaults to command name), `cwd`, `color` (tab color), `env` (inherited by every shell in the workspace), `setup` (bootstrap command sent to the first terminal *before* that terminal's own command), `layout` (the split/pane tree).
- **Restart behavior** (what happens if a workspace with the same name exists): `ignore` (switch to existing — default is actually "Create a new workspace"; three named behaviors are: switch to existing, close and recreate without asking, ask before recreating; default is create-new).
- **Layout tree**: recursive split nodes. Split node divides space into two children (`direction`, `position` 0.1–0.9 default 0.5, exactly two children which are split-or-pane nodes). Pane node is a leaf with one or more surfaces (tabs within the pane). Surface definition (terminal or browser): `name` (custom tab title), `command` (terminal-only, auto-run on creation), `cwd`, `env`, `url` (browser-only), `focus`.
- **cwd resolution**: omitted → workspace cwd; relative → relative to workspace cwd; `~`-prefixed → expanded to home; absolute path → used as-is.

### `actions` — the nightly action registry (public IDs)
Maps stable IDs to runnable behavior, shared by the surface tab bar, Command Palette, and action-level shortcuts. Built-in IDs that can be overridden: `cmux.newTerminal`, `cmux.newBrowser`, `cmux.splitRight`, `cmux.splitDown`. Custom project-specific IDs are also allowed.

**Action types**: `builtin` (alias a built-in cmux action), `command` (run shell text in a terminal; `target` chooses `currentTerminal` or `newTabInCurrentPane` — default), `agent` (start a coding agent — any CLI name works, `claude`/`codex`/`opencode`/custom, with optional `args` — in a new terminal tab), `workspaceCommand` (run a named workspace definition from `commands`), `workspace` (create a workspace from an inline definition, with optional restart behavior; offered in the new-workspace plus-button menu automatically).

**Action fields**: `title` (palette row title / surface button label / menu item title / trust prompt title unless overridden), `subtitle`/`description` (alias, palette secondary text), `keywords`, `palette` (default `true`; `false` hides from palette while keeping it callable elsewhere), `shortcut` (same single-stroke/two-stroke chord syntax as settings shortcuts, e.g. `"cmd+shift+c"` or `["cmd+k","cmd+c"]`), `target` (command/agent actions only), `confirm` (ask before running), `newWorkspaceMenu` (`true` adds to the plus-button context menu, `false` hides a workspace action from it).

**Trust model**: project-local actions show up in tab bar and Command Palette immediately, but the first run still prompts for trust. Trust is per exact action fingerprint, not per repo. Project-local image icons stay locked until that action is trusted.

**Icons** (`ui.surfaceTabBar.buttons`): replaces the default button list when present; leaving out a built-in ID hides it. Icon object shapes: `{"type":"symbol","name":"play.circle"}`, `{"type":"emoji","value":"🧪","scale":0.9}` (scale optional, default 1), `{"type":"image","path":"./icons/codex.svg"}` (relative to the config file). Supported image formats: SVG, PDF, PNG, JPEG, GIF, TIFF, BMP, HEIC, HEIF, WebP, AVIF, ICO, ICNS. Each button entry is either an action-ID string or a button object (for a different surface label/icon/tooltip); the resolved button title is also the trust prompt title.

**Command Palette behavior**: reads the resolved action registry; custom action IDs are rows when `palette` is not `false`. Legacy `commands` entries are auto-added as custom rows unless an action with the same generated ID already exists. Overriding a built-in ID such as `cmux.newTerminal` changes the behavior behind that shared entry point everywhere.

**Custom plus-button menu**: `ui.newWorkspace.action` overrides what the plus button itself does; `ui.newWorkspace.contextMenu` (or alias `rightClick`) defines the ordered right-click menu — entries are action IDs, action objects, or `{"type":"separator"}`. When unset, the default menu lists `cmux.newWorkspace` (⌘N), `cmux.newCloudWorkspace` (⇧⌘Y), `cmux.newCloudMachine` (⌘Y), `cmux.newTerminal` (⌘T), `cmux.newBrowser` (⇧⌘L), each showing its current shortcut. New Cloud Workspace uses the last-selected Cloud workspace's machine, then the first machine in the sidebar; New Cloud Machine deliberately provisions a new one. Cloud rows appear only when Cloud Machines is enabled.

**Saving layouts without JSON**: right-click the plus button → "Save Workspace as Layout" captures the current workspace's splits, directories, running agents, and browser tabs into `~/.config/cmux/cmux.json` as an `actions` entry. "Customize Workspace Layouts" opens that file in the editor. "Default for New Workspace" submenu (or the save dialog's "Use as default for new workspaces" checkbox) picks which saved layout plain New Workspace runs, set via `ui.newWorkspace.action`; project-local `.cmux/cmux.json` value wins over the global one.

Schema error handling: on a schema error, cmux falls back to the next valid config and shows a **"cmux.json Schema Error"** row in Command Palette; selecting it opens the config file.

## Socket API

### v1 vs v2
- **v1**: line protocol, space-delimited commands, text responses. Still fully supported (the migration is additive, not a removal).
- **v2**: newline-delimited JSON, handle-based (`window_id`, `workspace_id`, `pane_id`, `surface_id`). One JSON object per line in, one per line out: request `{"id":"1","method":"workspace.list","params":{}}`, response `{"id":"1","ok":true,"result":{...}}` or `{"id":"1","ok":false,"error":{"code":"not_found","message":"..."}}`. `id` is echoed when present; responses may include ephemeral `index` fields for debugging but IDs are the stable handles. Legacy v1-shaped JSON such as `{"command":"..."}` is explicitly **not** accepted on the v2 path (`api.socketCallout`).
- `rpc <method> [json-params]` is the escape hatch for any v2 method without a dedicated CLI wrapper.

### v1 → v2 method parity map
Windows: `list_windows`→`window.list`, `current_window`→`window.current`, `focus_window`→`window.focus`, `new_window`→`window.create`, `close_window`→`window.close`, `move_workspace_to_window`→`workspace.move_to_window`.
Workspaces: `list_workspaces`→`workspace.list`, `new_workspace`→`workspace.create`, `select_workspace`→`workspace.select`, `current_workspace`→`workspace.current`, `close_workspace`→`workspace.close`, `reorder-workspace`→`workspace.reorder`, `reorder-workspaces`→`workspace.reorder_many`.
Surfaces/splits: `list_surfaces`→`surface.list`, `focus_surface`/`focus_surface_by_panel`→`surface.focus`, `new_split`→`surface.split`, `new_surface`→`surface.create`, `close_surface`→`surface.close`, `drag_surface_to_split`→`surface.drag_to_split`, `refresh_surfaces`→`surface.refresh`, `surface_health`→`surface.health`, `trigger_flash`→`surface.trigger_flash` (new in v2).
Panes: `list_panes`→`pane.list`, `focus_pane`→`pane.focus`, `list_pane_surfaces`→`pane.surfaces`, `new_pane`→`pane.create`.
Input: `send`/`send_surface`→`surface.send_text`, `send_key`/`send_key_surface`→`surface.send_key`.
Notifications: `notify`→`notification.create`, `notify_surface`→`notification.create_for_surface`, `notify_target`→`notification.create_for_target`, `list_notifications`→`notification.list`, `clear_notifications`→`notification.clear`, `set_app_focus`→`app.focus_override.set`, `simulate_app_active`→`app.simulate_active`.
Browser: `open_browser`→`browser.open_split`, `navigate`→`browser.navigate`, `browser_back`→`browser.back`, `browser_forward`→`browser.forward`, `browser_reload`→`browser.reload`, `get_url`→`browser.url.get`, `focus_webview`→`browser.focus_webview`, `is_webview_focused`→`browser.is_webview_focused`.
Debug/test-only: `set_shortcut`→`debug.shortcut.set`, `simulate_shortcut`→`debug.shortcut.simulate`, `simulate_type`→`debug.type`, `activate_app`→`debug.app.activate`, `is_terminal_focused`→`debug.terminal.is_focused`, `read_terminal_text`→`debug.terminal.read_text`, `render_stats`→`debug.terminal.render_stats`, `layout_debug`→`debug.layout`, `bonsplit_underflow_count/reset`→`debug.bonsplit_underflow.*`, `empty_panel_count/reset`→`debug.empty_panel.*`, `focus_notification`→`debug.notification.focus`, `flash_count/reset`→`debug.flash.*`, `panel_snapshot/panel_snapshot_reset`→`debug.panel_snapshot.*`, `screenshot`→`debug.window.screenshot`.

### Socket access control (`CMUX_SOCKET_MODE`)
From `socketControl.*` strings and `docs/api` copy:

| Mode | Description | How to enable |
| --- | --- | --- |
| `off` | Socket disabled entirely. | Settings UI, or `CMUX_SOCKET_MODE=off`. |
| `cmuxOnly` (default) | Only processes started inside cmux terminals can connect (ancestry check). | Default in Settings UI. |
| `allowAll` | Any local process/user can connect, **no auth, unsafe**. | Environment override only: `CMUX_SOCKET_MODE=allowAll`. |
| `automation` | Allow external local automation clients from this macOS user, no ancestry check. | (socketControl string; distinct mode surfaced alongside password mode) |
| `password` | Require socket auth via a password stored in a local file. | — |

Legacy `CMUX_SOCKET_MODE` values `full` and `notifications` are still accepted for compatibility. Also accepts `cmux-only`/`cmux_only` and `allow-all`/`allow_all` spellings. On shared machines, docs recommend `Off` or `cmux processes only`. A denied client gets: "Access denied - only processes started inside cmux can connect" (`socket.client.accessDenied`) or "Unable to verify client process" (`socket.client.verificationFailed`).

`socket-status` reports the effective mode without connecting to the socket at all (works even when the listener is off).

### Environment variables (socket/CLI detection)
`CMUX_SOCKET_PATH` (override socket path), `CMUX_SOCKET_ENABLE` (force enable/disable, `1`/`0`/`true`/`false`/`on`/`off` — implied by docs), `CMUX_SOCKET_MODE` (as above), `CMUX_WORKSPACE_ID` (auto-set current workspace), `CMUX_SURFACE_ID` (auto-set current surface), `TERM_PROGRAM=ghostty`, `TERM=xterm-ghostty` — the two used to detect "running inside cmux".

### `capabilities`
`cmux capabilities` prints the server's available socket methods and current access mode as JSON — the discovery mechanism for what v2 methods (including `events.stream` and `surface.read_selection`) exist in this build.

## Event stream (`events.stream`)

Full protocol documented in `docs/events.md`; CLI front-end is `cmux events` (options above). Socket call:
```json
{"id":"client-1","method":"events.stream","params":{"after_seq":123,"categories":["notification","feed"]}}
```
Params: `after_seq`/`after` (int, replay events with seq greater than this), `names`/`name` (string or array, event-name filter), `categories`/`category` (string or array, category filter), `include_heartbeats` (bool, default `true`). The request line takes over the connection — no further commands should be sent on it.

Frames (one JSON object per line): first frame is always `ack`, then retained replay events, then live events and heartbeats.
- **ack**: `{type, protocol:"cmux-events", version:1, boot_id, subscription_id, heartbeat_interval_seconds:15, replay_count, resume:{after_seq, requested_after_seq, oldest_seq, latest_seq, next_seq, gap}, filters:{names, categories}}`. `resume.gap:true` when the requested cursor is older than what's retained in memory, or newer than the current process after a restart — client should process the replayed tail then refresh state via snapshot commands (`list-workspaces`, `list-notifications`, `tree`, `extension.sidebar.snapshot`, focused-surface queries).
- **event**: `{type:"event", protocol, version, boot_id, seq, id, name, category, source, occurred_at, workspace_id, surface_id, pane_id, window_id, payload}`; optional `automation_origin` (`rule_id`, `chain`, `depth`) when an automation action produced it.
- **heartbeat**: `{type:"heartbeat", protocol, version, boot_id, subscription_id, latest_seq, occurred_at}` — no `seq`.

Bounds: retained replay buffer is in-memory, bounded to **4,096 events**; individual event frames capped at **16 KiB** after JSON encoding (oversized payloads replaced with a small `payload_truncated:true` stub); each live subscriber has a bounded pending queue of **1,024 events** — falling behind closes the subscription with a `slow_consumer` error, client should reconnect with last processed `seq`. Durable log `~/.cmuxterm/events.jsonl` rotates the previous file to `.jsonl.1`, capped at **16 MiB** each, writes batched behind a bounded 1,024-line disk queue; under sustained backpressure cmux drops the oldest pending disk-only lines while keeping the live socket stream moving. Feed writes its own separate long-term audit log to `~/.cmuxterm/workstream.jsonl`.

Recommended client loop: connect → authenticate if required → send `events.stream` with last processed `seq` → read `ack` → if `resume.gap` refresh via snapshot commands → process replay then live events → persist each `seq` only after the side effect succeeds → reconnect with the latest persisted `seq` on close.

### Event catalog (name / trigger)
**Window**: `window.created`, `window.focused` (app-level focus, not necessarily new AppKit key), `window.keyed`/`window.unkeyed` (AppKit key-window transitions), `window.closed`. Payloads include `window_id`, `workspace_id`, `workspace_count`, `selected_workspace_index`, `is_key_window`, `is_main_window`, `origin`.

**Workspace**: `workspace.created`, `workspace.selected` (fires for sidebar clicks, shortcuts, palette actions, tmux-compat `next-window`/`previous-window`/`last-window`, CLI, socket), `workspace.closed`, `workspace.renamed`, `workspace.reordered` (payload: ordered `workspace_ids`, `moved_workspace_ids`, `pinned_workspace_ids`, `count`), `workspace.moved`, `workspace.action`, `workspace.prompt.submitted` (payload: `workspace_id`, redacted `message`, `message_preview`, `message_length`, `redacted_fields` — local sensitive data, only forward with explicit opt-in). Socket `workspace.reorder`/`workspace.reorder_many` command *results* (not stream events) include `plan`/`events` arrays with short refs and final indexes, e.g. `{window_ref, workspace_ref, from_index, to_index}`.

**Surface/pane**: `surface.created`, `surface.selected` (horizontal tab selection or programmatic convergence), `surface.focused` (the surface that should receive input), `surface.closed`, `surface.moved`, `surface.reordered`, `surface.action`, `surface.input_sent` (text redacted), `surface.key_sent`; `pane.created`, `pane.closed`, `pane.focused` (clicks, split focus, `focus-pane`, `last-pane`, post-close/move convergence; payload `selected_surface_id`), `pane.resized` (local), `pane.resize_requested` (remote-tmux, async), `pane.swapped`, `pane.broken`, `pane.joined`. Selection payloads include `previous_workspace_id`/`previous_surface_id`, `index`, `tab_count`, `pane_id`, `kind`, `focused`.

**Sidebar metadata**: `sidebar.metadata.updated`/`.cleared`, `sidebar.progress.updated`/`.cleared`, `sidebar.log.appended`/`.cleared`, `sidebar.reset`.

**Notifications**: `notification.requested`, `.clear_requested`, `.dismiss_requested`, `.mark_read_requested`, `.open_requested`, `.jump_to_unread_requested` (socket-command-asked variants) plus store-truth `notification.created`, `.read`, `.removed`, `.cleared`.

**Feed/agent hooks**: `feed.item.received` (`feed.push` received a hook/workstream event), `feed.item.completed` (hook decision/timeout/no-op result — payload includes the workstream payload plus a `result` matching `feed.push`'s socket response), `feed.item.resolved` (a Feed reply resolved a permission/question/plan item), `agent.hook.<HookEventName>` (e.g. Claude Code / Codex permission requests when hooks are installed).

**App/browser/config**: `app.focus_override.changed`, `app.simulated_active` (test/debug), `browser.navigation`, `browser.interaction` (click/hover/scroll/key/select/focus), `browser.input` (value redacted), `config.reloaded` (v1 socket reload request).

**Agent hook example payload**:
```json
{"name":"agent.hook.Stop","category":"agent","source":"codex","workspace_id":"...","surface_id":"...",
 "payload":{"session_id":"session-123","hook_event_name":"Stop","_source":"codex","surface_id":"...",
            "tool_name":null,"_opencode_request_id":"request-456","phase":"received"}}
```
When an incoming hook event includes `surface_id`, it is preserved both on the event envelope and in its workstream payload.

**Privacy**: `surface.input_sent`, `browser.input`, v1 terminal send commands, notification text fields, and large agent-hook fields redact local text and include only length metadata. Feed/agent-hook events keep operational identifiers (hook name, tool name, request id, phase, decision result) without prompt/tool payloads by default. Consumers should treat the whole stream as local-sensitive data.

## Browser automation (`cmux browser ...`)

A large sub-namespace for driving cmux's embedded WebKit browser surfaces programmatically. Legacy top-level aliases remain for the earliest verbs: `open-browser`→`browser open`, `navigate`→`browser navigate`, `browser-back`/`browser-forward`/`browser-reload`→`browser back|forward|reload`, `get-url`→`browser get-url`, `focus-webview`/`is-webview-focused`→same under `browser`.

| Command | Contract |
| --- | --- |
| `browser open`, `browser open-split`, `browser new` | Create/open a browser surface. |
| `browser goto`, `browser navigate` | Navigate to a URL. |
| `browser back`, `browser forward`, `browser reload` | History navigation / reload. |
| `browser url`, `browser get-url` | Print current URL. |
| `browser focus-webview`, `browser is-webview-focused` | Focus / query webview focus. |
| `browser snapshot` | Print a DOM snapshot. |
| `browser eval` | Evaluate JavaScript. |
| `browser wait` | Wait for selector, text, URL, load state, or JS predicate. |
| `browser click`, `dblclick`, `hover`, `focus`, `check`, `uncheck`, `scroll-into-view` | Element interaction. |
| `browser type`, `browser fill` | Type into / set an input. |
| `browser press`, `key`, `keydown`, `keyup` | Keyboard input via `--key <key>` or positional `<key>` using Playwright/W3C names (`Enter`, `Tab`, `Escape`, `ArrowLeft`, `Space`, ...). Supported keys replay through native WebKit input (contenteditable caret movement, scrolling work); opaque tokens fall back to a page-event compatibility path. `Space`/`Spacebar`/`space` emit DOM key `" "` code `"Space"`; raw `--key ' '` also accepted. Hold a modifier across a subsequent key with `keydown`/`keyup`. |
| `browser select` | Select an option. |
| `browser scroll` | Scroll page or element. |
| `browser screenshot` | Save a screenshot. Errors: `screenshot_mismatch` (conservative DOM/pixel attestation still disagrees after retry — client may retry, cmux does not return the suspect image), `timeout` (bounded capture budget exceeded or another capture already running — retryable), `internal_error` (other failures). |
| `browser get` | Read url/title/text/HTML/value/attr/count/box/styles. |
| `browser is` | Check visible/enabled/checked. |
| `browser find` | Find by role, text, label, placeholder, alt, title, testid, first, last, nth. |
| `browser frame` | Select frame context. |
| `browser dialog` | Accept/dismiss dialogs. |
| `browser download list` | List newest-first downloads for one browser surface; `--limit <1...25>`, `--json`. Includes stable IDs, filenames, actual paths when known, status, bytes when known, path existence. Repeatable listing — does not consume `browser.download.wait`. |
| `browser download [wait]` | Wait for or save a download, preserving path/timeout options. |
| `browser profiles` | List/add/rename/clear/delete cmux browser profiles. `clear` refuses to wipe active profiles unless `--force`. |
| `browser import` | Open the browser-import wizard. In detected coding-agent environments defaults to non-interactive cookie import; `--interactive` forces the wizard. Non-interactive flags: `--from`, `--profile`, `--all-profiles`, `--to-profile`, `--create-profile`, `--domain`. |
| `browser cookies` | Get/set/clear cookies; `set --http-only` hides from page JS; `clear` requires an explicit scope (`--url`/`--domain`/`--name`/`--all`), returns removed count as `cleared` in JSON. |
| `browser storage` | Get/set/clear local/session storage. |
| `browser tab` | Create/list/switch/close browser tabs. |
| `browser console`, `browser errors` | List/clear console messages and errors. |
| `browser highlight` | Highlight an element. |
| `browser state` | Save/load browser state. |
| `browser addinitscript`, `addscript`, `addstyle` | Inject scripts/CSS. |
| `browser viewport <width> <height>` | Emulate an exact logical viewport, **1×1 through 4096×4096 CSS pixels**. WKWebView aspect-fits the page inside the current pane without resizing the pane or changing focus; screenshots use the emulated dimensions. |
| `browser viewport reset` | Restore native viewport sizing (page follows pane dimensions). |
| `browser geolocation`, `browser geo` | Set geolocation. |
| `browser offline` | Toggle offline state. |
| `browser trace` | Start/stop trace capture. |
| `browser network` | Route, unroute, or list requests. |
| `browser screencast` | Start/stop screencast. |
| `browser input`, `input_mouse`, `input_keyboard`, `input_touch` | Low-level input. |
| `browser identify` | Identify browser surface context. |

`browser viewport` semantics: on WKWebView, requested logical size becomes `window.innerWidth`/`innerHeight`, page uniformly scaled to fit the existing pane; pane layout and other surfaces don't move; screenshots normalized to exact CSS-pixel dimensions independent of display backing scale. JSON reports `mode`, effective `width`/`height`, displayed size, `scale`, `presentation`, `pane_resized`; `reset` reports actual native CSS viewport including current page zoom. cmux bounds combined viewport+page-zoom render geometry to **8192 points/dimension** and **33,554,432 points of area**; exceeding it leaves the viewport unchanged and returns `invalid_params` with `reason: viewport_zoom_render_geometry_too_large`, `requested_page_zoom`, `maximum_page_zoom`. While emulation is active, browser zoom commands also stop at that max. A visible attached browser inspector owns the same layout — close/detach it before changing viewport, else `invalid_state`/`reason: attached_browser_inspector`; opening/redocking an inspector while emulation is active resets to native sizing first.

Related standalone command: `markdown open <path>` — opens a markdown file in a formatted viewer panel with live reload.

## Custom sidebars, right sidebar, markdown

(See "Sidebar metadata" and "Settings" sections above for `right-sidebar` and `sidebar`.)

## tmux compatibility layer (`__tmux-compat` + real tmux verbs)

cmux implements a subset of the `tmux` command surface directly, so scripts/plugins written against tmux mostly work unmodified inside a cmux terminal:

| Command | Contract |
| --- | --- |
| `capture-pane` | Read pane text. |
| `resize-pane` | Resize a pane with direction flags. |
| `pipe-pane` | Pipe pane text to a shell command. |
| `wait-for` | Signal or wait on a named synchronization point. |
| `swap-pane` | Swap two panes. |
| `break-pane` | Move a pane into a new workspace. |
| `join-pane` | Join a pane into another pane. |
| `next-window`, `previous-window`, `last-window` | Move workspace selection. |
| `last-pane` | Focus the last pane. |
| `find-window` | Find a workspace by title or content. |
| `clear-history` | Clear terminal scrollback. |
| `set-hook` | Manage tmux-compat hook definitions. |
| `popup` | Placeholder, currently unsupported. |
| `bind-key`, `unbind-key`, `copy-mode` | Placeholders, currently unsupported. |
| `set-buffer`, `paste-buffer`, `list-buffers` | tmux-compat paste buffers. |
| `respawn-pane` | Send a restart command to a surface. |
| `display-message` | Print or display a message. |

`__tmux-compat` is the internal dispatcher these route through (documented as internal/hidden in the contract).

## Local tmux persistence (`cmux local-tmux`)

An explicit, opt-in persistence profile for **local** terminal processes, distinct from the tmux-compat layer above and from remote tmux mirroring. Starts one user-owned tmux server under `~/.cmux/local-tmux` and attaches a cmux terminal to a named tmux session; the default cmux terminal profile still launches its ordinary Ghostty PTY.

```sh
cmux local-tmux start work --cwd ~/src/project --command 'npm run dev'
cmux local-tmux list
cmux local-tmux status work
cmux local-tmux detach work
cmux local-tmux attach work
cmux local-tmux close work
```
`start` creates the session and attaches it to the caller's workspace; `--detached` creates only the durable owner for later attach. `cmux local-tmux attach work --headless` attaches from a non-cmux terminal. Alias `cmux tmux attach work` (attach-only; use `local-tmux` for listing/lifecycle). `list`, `status`, `detach`, `close`, `cleanup`, `attach --headless` all work **without a running cmux control socket**.

Lifecycle/identity: the tmux server owns shell/agent/dev-server/PTY/scrollback; cmux owns only the client surface — closing/updating cmux **detaches** rather than terminates. Session restore replays the attach command only when the terminal snapshot carries the `TMUX= CMUX_LOCAL_TMUX=1` marker. New sessions get a bounded **10,000-line** tmux history limit. The registry stores a stable logical session UUID bound to a tmux server incarnation marker, the immutable `$N` session ID, and creation time; a restarted server (new random marker) cannot inherit an old record even reusing `$N`. Attach/detach/close check the marker inside the same tmux request and fail closed on mismatch. A tmux-side rename keeps the immutable binding and updates the registry name. `--new-client` deliberately creates another cmux client instead of reusing a restored one.

What persistence covers: survives cmux quit/crash/update/surface-close and normally Mac sleep. **Does not** survive logout/restart/shutdown/power-loss/killed tmux server — the registry file may remain but the server marker no longer matches, so reattach **fails closed** rather than attaching to an unrelated replacement. For continuity while the Mac itself is offline, use a remote-host owner via `cmux ssh-tmux`, `cmux mosh-tmux`, or a persistent Cloud VM.

Discovery/cleanup/safety:
```sh
cmux local-tmux list --json
cmux local-tmux cleanup --prune
cmux local-tmux detach work --client <client-id>
cmux local-tmux detach work --all
```
`list` reports unmanaged sessions on the profile socket plus stale registry entries. `cleanup` previews stale records by default; `--prune` removes them; neither kills an unknown live session. `detach` refuses to guess among multiple clients unless `--client` or `--all` given. State dir is mode `0700`, registry/lock mode `0600`; the tmux Unix socket path may appear in CLI output but is not a cmux control endpoint. Limitations: requires a local `tmux` executable (or `CMUX_LOCAL_TMUX_BIN`); server-socket names restricted to `[A-Za-z0-9_-]+`, ≤128 chars; closing a cmux surface does **not** kill the tmux session (`local-tmux close` does).

`tmux attach` (top level) — compatibility alias for `local-tmux attach`.

## Remote tmux (beta) — `cmux ssh-tmux`

Source: `docs/remote-tmux.md` copy (`remoteTmux.*` in en.json). A **Beta Features flag**, off by default — mirrors a `tmux -CC` session on a remote SSH host into cmux's native UI (workspaces/tabs/splits/scrollback/copy) rather than a plain terminal.

- Mapping: tmux **session** → a dedicated cmux **workspace**; tmux **window** → a **tab** in that workspace; tmux **pane** → a **pane in a native cmux split** inside that tab. (cmux and tmux nest layout in opposite directions: cmux panes hold rows of tabs, tmux windows hold splits of panes — remote tmux bridges the two.) The bridge is two-way: splitting/closing a pane in that tab runs `tmux split-window`; reordering tabs reorders tmux windows with `swap-window`.
- Requirements: a reachable SSH host (reads `~/.ssh/config`) with **tmux 3.2+**; control mode (`tmux -CC`) needs no special build; cmux checks the remote tmux version before attaching and fails clearly on older servers; attaches over an SSH ControlMaster connection; remote tmux server keeps running on detach.
- Enable: Settings → Beta Features → Remote tmux (off by default).
- Attach: `cmux ssh-tmux <destination>` (an `~/.ssh/config` alias or `user@host`) mirrors that host's sessions into the current window's sidebar. `--new-window` opens the mirror in a dedicated new window instead. Hosts that authenticate non-interactively attach silently; hosts needing interactive auth (password/host-key/MFA) get `ssh` run inline in your terminal to authenticate, then mirror into the current window. Accepts `--port`, `--identity`, `--no-focus`.
- Troubleshooting "Permission denied": the destination is handed to `ssh` as-is, so an alias needs `User` (else local username is tried) and `IdentityFile`; or pass the user explicitly (`cmux ssh-tmux dev@my-ssh-alias`) — if plain `ssh <destination>` doesn't log in, neither will this.
- Contrast with **`cmux mosh-tmux`**: opens a first-class Mosh terminal attached to a named tmux session for network roaming — it does **not** replace the native workspace/tab/split mirror.
- How it works: cmux spawns `ssh … tmux -CC attach` and parses the control-mode stream itself (owns `%begin`/`%end` correlation) rather than using a built-in tmux viewer. Each remote pane renders into a dedicated terminal surface fed by tmux `%output`; input (keys + mouse) forwarded with `tmux send-keys`. The remote tmux server owns pane sizing/reflow — cmux stays in lock-step and never reflows locally.
- Behavior: **Sizing** — remote client resized to the rendered grid (`refresh-client -C`), so TUIs aren't stuck at 80×24. **Splits** — programmatic splits (`cmux new-split` or `surface.split`) report accepted with no surface id — the new pane arrives asynchronously once tmux confirms the layout change; requests carrying options the routed split can't honor (startup command, cwd, divider position, left/up placement) are rejected up front, before the remote session is mutated. **Reordering** via `swap-window`. **Working directory** tracked per pane, shown on the tab. **Paste & drop** — pasted text and dropped images/files go through `tmux paste-buffer -p` so a remote agent receives a real bracketed paste (an image arrives as `[Image #N]`, not a local path). **Mouse** — clicks/scroll/drag reach the remote app in mouse mode; Shift+drag forces a native cmux text selection/copy. **Unicode-correct output** even when tmux splits multi-byte chars across updates.
- Socket commands (gated on the Beta Features flag; `host` = SSH destination/`~/.ssh/config` alias, `session` = tmux session name, `mirror` also accepts standard window/workspace/surface/pane routing): `remote.tmux.sessions` (list sessions on a host), `remote.tmux.attach` (attach, create-attaches-or-creates), `remote.tmux.mirror` (mirror every session on a host, each as its own workspace, windows become tabs; returns the ssh command for interactive auth when needed), `remote.tmux.detach` (detach control client, remote session keeps running), `remote.tmux.state` (report the control client's observed state — diagnostics). A dash-prefixed host or identity file is rejected at the trust boundary against SSH option injection. Errors: `remote tmux beta is disabled`, `host and session are required`, `host is required`, `session is required`.
- Limitations: transient SSH drops reconnect automatically with capped exponential backoff, re-seeding panes on resume; the mirror only closes for good when the remote session ends or you close the window/quit cmux — **not restored on relaunch** (re-attach with `cmux ssh-tmux`). Only single-line paste/drop is a real bracketed paste via `paste-buffer -p`; multi-line text is sent as plain keystrokes (not treated as one paste). Live cwd updates require tmux 3.2+ control-mode subscriptions. Primary-screen scrollback isn't re-wrapped on resize (cmux leaves reflow to tmux — older lines can stay at the previous width until repaint; full-screen TUIs that redraw on resize are unaffected).

## SSH workspaces (`cmux ssh`)

`cmux ssh <destination>` — opens an SSH-backed workspace. Preserves the caller's live `SSH_AUTH_SOCK` for app-launched OpenSSH processes so `ForwardAgent yes` from ssh_config works normally. Flags: `-A`/`--forward-agent` (request forwarding), `-a`/`--no-forward-agent` (disable). Forwarding is opt-in because forwarded agents can be used by processes on the remote host while the SSH session is active. Also: `--transport <ssh|mosh>`, `--command <text>`.
- `mosh <destination>` — a distinct top-level command (not shown in the group table but present in help probes) for Mosh-backed sessions.
- `mosh-tmux <destination> [--session <name>]` — Mosh terminal attached to a named tmux session (see Remote tmux contrast above).
- `ssh-session-list [--json]` — lists persisted SSH PTY sessions for one remote workspace or all.
- `ssh-session-attach --session-id <id>` — creates a local terminal surface that reattaches to an existing persisted SSH PTY session. Errors: "ssh-session-attach: no persisted SSH PTY session with id '%@'. Run 'cmux ssh-session-list --all-workspaces' to see valid session ids.", "…persisted SSH PTY session state is unavailable. Run 'cmux ssh-session-list --all-workspaces' and retry.", "…session '%1$@' exists in multiple workspaces (%2$@). Pass --workspace <workspace> to choose one.", "…belongs to workspace %2$@, but --workspace requested a different workspace", "--workspace requires a value".
- `ssh-session-cleanup [--json]` — closes one or all persisted SSH PTY sessions.
- `remote-daemon-status` — prints bundled remote daemon version, asset, checksum, and cache status (runs before subcommand help dispatch, so `--help` prints status instead of usage — a documented quirk).
- Internal helpers (hidden/undocumented for end users, used by SSH terminal startup scripts): `vm-pty-attach`, `vm-ssh-attach` (hidden compat alias for older VM workspaces), `vm-pty-connect` (connects to a VM PTY from a config file), `ssh-pty-attach` (bridges a local terminal surface to a remote PTY session), `ssh-session-end` (clears remote SSH session state).

## Remotes (device registry for iOS)

`remotes` (alias `remote`) manages Macs in the team device registry so they appear in the iOS app's device list:
- `remotes list` / `remotes ls` — name, deviceId, routes, tag, last seen; `--json`.
- `remotes add <name> --route <host:port> [--route ...] [--tag] [--json]` — idempotent on `<name>` (re-adding updates routes). Host must be a Tailscale address the phone can authenticate to (CGNAT `100.64.x.x`–`100.127.x.x` or `*.ts.net`); loopback, plain LAN IPs, and bare hostnames are **rejected**.
- `remotes remove <name-or-deviceId>` (aliases `rm`, `delete`) — removes a remote you registered; `--json`.

## My Devices (peer-to-peer Mac-to-Mac, distinct from `remotes`)

Connects opted-in Macs on the same account through authenticated Iroh v2 sessions; runs only while Cloud Machines is enabled. Fresh installs default to *discovering* other Macs with *incoming access to this Mac* off. Cloud sidebar exposes **Discover other Macs** and **Allow access to this Mac** independently (`devices.discovery.enabled`, `devices.incomingAccess.enabled`; hidden-Mac list `devices.sidebar.hiddenMacIDs`). Turning off incoming access disconnects incoming sessions; turning off discovery stops outgoing connections; iPhone pairing is separately opt-in; turning Cloud Machines off stops discovery, connections, and hosting entirely. No Tailscale setup, pairing link, or address entry required. Use `surface ls`/`surface open`/`surface new-terminal` for discovered Mac resources (the cloud-only `vm workspace` commands remain VM-only operations).

## Cloud / VM (`cmux vm`, alias `cmux cloud`)

`vm`/`cloud` manage cloud VMs and their HTTPS publications; `cloud` is a full alias for `vm` everywhere. The public product name is moving to **"Base"** for the default persistent per-account workspace (`docs/tui` page, still CLI/menu-labeled "Cloud VM" in places — an explicitly noted preview-naming gap). Base is deterministic: opening it finds the right persistent VM for the current account scope, resumes it if needed, repairs the terminal endpoint if possible, then opens a terminal. Personal Base (one VM per cmux account) vs Team Base (one VM per team, access via team membership/policy) are different VMs even from the same Mac; switching account/team changes which Base opens.

### Domains / publications
| Command | Contract |
| --- | --- |
| `cloud domains [list]`, `vm domains [list]` | List the account's VM-port publications (`vm.publication_list`); `--json` → `{publications:[...]}`. |
| `cloud domains zones`, `vm domains zones` | List custom domains owned by the account (`vm.domain_list`); `--json` → `{domains:[...]}`. |
| `cloud domains verify <domain>` | Start/complete ownership+certificate verification for a custom zone (`vm.domain_verify`); first call prints the DNS checklist, add records and rerun. Generated cmux names need no verification. |
| `cloud domains publish <vm> <port> [--domain <host>] [--access personal\|team\|public] [--team <id>]` | Create one HTTPS publication (`vm.publication_create`). Generated names need no DNS. `personal` (default, owner-only), `team` (requires `--team`), `public` (anyone with URL). |
| `cloud domains access <hostname> <personal\|team\|public> [--team <id>]` | Change an existing publication's viewer policy (`vm.publication_update`); first arg is a publication hostname/id, not a VM id. |
| `cloud domains rm <hostname>` | Remove a publication (`vm.publication_delete`). |

### Core VM lifecycle
- `vm ls`, `vm list` — list VMs.
- `vm new`, `vm create` — creates a devbox VM with devtools, coding agents, and a screen (TigerVNC + openbox + noVNC on port 6901). CLI always sends machine **kind** `desktop`; `--desktop`/`--base`/`--no-desktop` accepted for older scripts, change nothing; `--image <id>` is the only way an explicit image id leaves the client. Flags: `--size <4g|8g|16g|24g|32g|64g>`, `--name <label>` (applied via `vm.rename` after create), `--provider`, `--workspace`, `--detach`/`-d`. Without `--detach`, opens a plain terminal on the machine.
- `vm base open`, `vm base reset` — open (creating on first use) or reset the persistent Base machine; `--base`/`--desktop` accepted, no-op; existing Base keeps its image.
- `vm shell`, `vm attach` — interactive shell for an existing VM. Every cloud open path (`vm shell`/`new`/`fork`/`restore`/`base open`/`base reset`, Machines panel, sidebar cloud button) uses the machine's private cmux-tui route through the app's user-space WireGuard hub; first open gets an enrollment invitation from `vm.cmux_remote_info`, a known device reconnects with its pinned daemon fingerprint and cached private route (no connection-time control-plane request). No public WebSocket, no automatic SSH fallback; `vm ssh` remains an explicit diagnostic command.
- `vm stats <id>`, `vm top <id>` — CPU/memory/disk right now; a sleeping machine reports `asleep` and is **not** woken.
- `vm resize <id> [--cpu <vCPUs>] [--memory <GiB>] [--disk <GiB>]` — grow in place. CPU 1–32 vCPUs, memory 4–64 GiB (whole GiB), disk 4–256 GiB (4 GiB steps). Server enforces plan ceilings, returns provider-confirmed resources.
- `vm desktop <id>`, `vm vnc <id>` — opens the private VM desktop through the authenticated userspace hub in a browser pane; noVNC+websockify over one loopback forward, no system VPN setup needed.
- `vm rename <id> <label>` / `vm rename <id> --clear` — set/clear display label; machine id stays its address.
- `vm rm`, `vm destroy`, `vm delete` — destroy a VM.
- `vm ssh` — cmux-managed SSH workspace for an existing VM. `vm ssh-info` — prints connection info. `vm ssh-attach` — internal attach helper.
- `vm exec` — run a shell command inside a VM.
- `vm tui <id>` — opens the **FULL cmux-tui client** (its own workspaces/panes/tabs) in a pane, unlike every other open which gives a plain terminal; dials the machine's trusted-carrier listener directly over the private network, so **no device enrollment/approval** happens. Hidden helper used only by this command: `vm-tui-connect --config <file>` execs the local cmux-tui client in the pane.
- `vm run -- <command...>` — runs a command without naming a machine: reuses an idle machine the router provisioned earlier (persisted in `~/.cmuxterm/vm-run-pool.json`, labeled `agent-pool`), wakes a sleeper, or provisions fresh. `--sync` pushes cwd first; `--pull <remote>` fetches results; remote exit code passes through.
- `vm push <id> <local> [remote]` (alias `vm upload`) — SCP over the userspace WireGuard connection; pins the guest host key, verifies SHA-256, packs directories as tarballs. `--exclude <pattern>` (repeatable), `--no-default-excludes`.
- `vm pull <id> <remote> [local]` (alias `vm download`) — copies from VM over the exec channel.
- `vm wait <id> [--timeout <seconds>] [--wake]` — blocks until ready; `--wake` also runs a trivial exec to wake a sleeper.
- `vm open <id> <port> [--print]` — opens the canonical machine-port browser resource; HTTP uses authenticated loopback forward, HTTPS keeps private host/cert identity; copying does not create a forward; `--print` explicitly requests the control-plane URL.
- `vm open <target> [--workspace <id|ref|index>] [--focus <true|false>]` — opens a **tree address**: `<machine>` = `vm shell <machine>`; `<machine>/<ws>` (ws_… id or name) opens the focused/first live terminal or starts one if empty; `<machine>/<ws>/<term_…>` opens one terminal, reusing the pane already showing it (`reused:true`); `<machine>/<ws>/<term_…>/<tab_…>` opens that exact tab placement (when one terminal occupies several tabs of a pane); `<machine>:desktop` = `vm desktop`; `<machine>:port/<n>` = the port form. Prints `OK surface=… workspace=… terminal=…`; `--json` prints the socket payload. Anything else is a usage error.
- `vm route [--cwd <dir>] [--new] [--provision] [--size <s>] [--json]` — prints the machine `vm run`/`vm agent` would use and why (router policy: directory-bound machine → awake idle pool machine → sleeper), without running anything; stops before provisioning unless `--provision`.
- `vm agent --agent <claude|codex|opencode|pi> [--machine <id>] [--sync] [--cwd <dir>] [--name <name>] [--no-open] [--new] [--size <s>] [--json] -- <prompt or args...>` — starts a coding agent on a cloud machine (routed like `vm run`, or pinned with `--machine`) as a detached terminal (`surface.new_terminal`; command is a login shell putting `/root/.npm-global/bin` first). A bare prompt uses the agent's one-shot form (`claude -p`, `codex exec`, `opencode run`, `pi -p`); flag/subcommand-led args pass through. `--sync` pushes cwd to `work/<basename>` first. Prints the terminal, workspace, and `vm open <machine>/<ws>/<term>` reattach address; exits as soon as the terminal starts.
- `vm tools <id>`, `vm tool-inspector <id>` — inspect installed tools. `vm ports <id>` — listening TCP ports. `vm handoff <id>` — short attach handoff block. `vm promote-template <id>` — promote to a reusable template.

### VM workspace/terminal/tab sub-namespace (cmux-tui plumbing)
- `vm workspace new <machine> [--name <name>] [--json]` — `vm.workspace_new`: creates a cmux-tui workspace on the machine (⌘N + first terminal), opens as new local workspace. Prints `OK workspace=<local id> remote_workspace=<ws id> machine=<id>`.
- `vm workspace open <machine> <workspace> [--here] [--tabs] [--workspace <local>] [--pane <id|ref> [--left|--right|--up|--down]] [--json]` — `vm.workspace_open`: opens machine workspace's terminals/browsers/pinned displays as a new local workspace, one pane each (mirrors sidebar click). `<workspace>` = `ws_…` id or unambiguous name resolved exactly as the sidebar (every view of every terminal counts); payload's `remote_workspace_id` is the resolved id. An empty existing workspace opens nothing: "Nothing to open: … cmux vm open <machine>/<ws> starts a terminal there". `--here`/`--tabs`/`--pane`+side project into an existing local workspace instead (sidebar's "Open All Here"/"Open All in New Tabs"/drop-on-pane-edge).
- `vm prompt [--json]` / `vm prompt --open <agent>` (alias `skill`) — `vm.cloud_prompt`/`vm.cloud_agent_open`: installs the bundled cmux-cloud skill file at `~/.config/cmux/skills/cmux-cloud.md` and prints the kickoff prompt for any agent (Machines panel's "Copy Cloud Prompt"), or opens a local terminal running `claude`/`codex`/`opencode` with it ("Open Cloud Agent").
- `vm workspace rename <machine> <workspace-id> <name> [--json]` — `vm.workspace_rename`.
- `vm tab rename <machine> <tab-id> <name> [--json]` — `vm.tab_rename`: renames one exact tab placement; `""` clears the custom label. Daemon revision fence prevents overwriting a concurrent rename.
- `vm workspace close <machine> <workspace-id> [--json]` — `vm.workspace_close`: closes the workspace, terminals keep running in the Terminals pool (CLI-only).
- `vm workspace rm <machine> <workspace-id> [--json]` (alias `delete`) — `vm.workspace_delete`: kills every terminal viewed in the workspace, then closes it; prints how many were closed.
- `vm terminal close <machine> <terminal-id> [--json]` — `vm.terminal_close`.
- `vm terminal send <machine> <terminal-id> [text] [--keys <k1,k2,…>] [--json]` (alias `write`) — `vm.terminal_write`: types `text` exactly as given (no newline), then presses named keys (`enter`, `tab`, `escape`, `up`, …; chords join with `+`, e.g. `ctrl+c`). Headless: no pane attached/focused.
- `vm terminal read <machine> <terminal-id> [--json]` (alias `screen`) — `vm.terminal_read`: visible screen text; `--json` adds `rows`, `cols`, `cursor_row`, `cursor_col`, `cursor_visible`.
- `vm terminal wait <machine> <terminal-id> --pattern <regex> [--timeout <seconds>] [--json]` — `vm.terminal_wait`: blocks until screen text matches (default 30s); prints `OK matched …`; exits 1 with a bounded timeout diagnostic that **does not include terminal text**.
- `vm terminal rename <machine> <terminal-id> <name> [--json]` — names the daemon tab view(s); `""` clears the custom label; a zero-view pool terminal has no tab to name.

### `surface` namespace (unified catalog across This Mac + all cloud machines)
- `surface ls [<machine>|local] [--refresh] [--json]` — exactly `vm tree` (This Mac + every cloud machine, Finder-style: This Mac first (terminals grouped by local workspace, then browsers), then per cloud machine: Workspaces, Ports, VNC Displays (one row per screen), and a final Terminals section for every machine-owned terminal). `--refresh` re-syncs every provider first. `--json` payload includes `cloud_states` (`sync_mode`: `journaled`/`snapshot_only`, cursor `(generation, revision)`, freshness, pending writes) and resources with `remote_views:[{tab_id, workspace:{id,name,index,focused}, screen_id?, pane_id?, name?, index?, focused?, screen_index?, pane_index?}]`. A snapshot-only VM stays readable but rejects revision-fenced rename writes until its daemon upgrades.
- `surface open <resource> [--workspace <id|ref|index>] [--pane <id|ref>] [--left|--right|--up|--down|--tab] [--new] [--focus <true|false>] [--json]` — puts one surface in a pane through `surface.project`; `<resource>` is `<machine>/<kind>/<key>` from `surface ls --json` (`local/terminal/<uuid>`, `<m>/terminal/<term_…>`, `<m>/display/display:1`, `<m>/browser/port:<n>`); reuses the pane already showing the resource unless `--new`; `--pane`+side splits, `--tab` adds a tab, else the workspace's focused pane; a local terminal moves to the destination (shown once). Prints `OK surface=… workspace=… resource=… [reused=true]`.
- `surface new-terminal --machine <id|local> [--cwd <dir>] [--name <name>] [--remote-workspace <ws_…>] [--workspace <id|ref|index>] [--no-open] [--json] [-- <command...>]` — creates a terminal via `surface.new_terminal` and opens it as a pane unless `--no-open`; cloud terminals land in the machine's cmux-tui session (`--remote-workspace` picks it), local ones are a new shell on This Mac.

## CodeRouter (`cmux coderouter`, alias `cmux cr`)

`coderouter status|machines|claude` are cmux-owned and go through the app; **every other verb**, and all of `cmux cr ...`, exec the CodeRouter CLI unchanged with `CMUX_*`/`CMUXD_*` env stripped: `coderouter`/`cr` on PATH first, then the official installer's `~/.coderouter/bin/coderouter` (`$CODEROUTER_INSTALL/bin` when set), never with a network call. If neither exists and stdin+stderr are TTYs, cmux prints the installer command (`curl -fsSL https://cmux.com/coderouter/install.sh | sh`), explains what it does (checksum-verified binary into `~/.coderouter/bin`, PATH line added to the shell profile), asks once (`Install CodeRouter now? [y/N]`), and on `y` fetches+runs the script then execs the new install with the original args. Non-interactive/declined/download-or-install-failure prints the install command on stderr and **exits 127**.

- `coderouter status` — sign-in state (`auth.status`), selected team, team's Claude upstream accounts. `--team <id>`, `--json`.
- `coderouter machines` (alias `machine`) — 30-day usage per Cloud machine from `GET /api/coderouter/vm-usage/team`: vmId, display name, total tokens, API-equivalent USD, plus a total line. `--team <id>`, `--json` (raw team-usage payload).
- `coderouter claude list` (aliases `ls`, `show`, `get`, `status`) — every Claude upstream account of the team: id, kind, masked identifier, label, health (`active`, `disabled`, `cooling down Ns <failure code>`), last use. `--team <id>`, `--json`.
- `coderouter claude add oauth-token` — adds a Claude Code OAuth token (`sk-ant-oat01-...`, from `claude setup-token`). In a terminal, cmux runs `claude setup-token` and parses output automatically; also reads `CLAUDE_CODE_OAUTH_TOKEN`, `--stdin`/non-TTY stdin, or a hidden terminal prompt — **never argv**. `--label <s>`. Non-`sk-ant-oat01-` value rejected before the socket is used. Prints masked identifier + account id only. `set` aliases `add`.
- `coderouter claude add api-key` — same intake pattern for `ANTHROPIC_API_KEY` (`sk-ant-...`, not `sk-ant-oat`).
- `coderouter claude add bedrock` — Amazon Bedrock creds from `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/optional `AWS_SESSION_TOKEN`; `--region <r>` (default `AWS_REGION`/`AWS_DEFAULT_REGION`); repeatable `--model <claude-id>=<bedrock-id>`.
- `coderouter claude remove <account>` (aliases `rm`, `delete`) — `<account>` is the id, or a label/masked identifier matching exactly one account (ambiguity errors with a count). Idempotent.
- `coderouter claude disable <account>` / `coderouter claude enable <account>` — via `coderouter.claude_upstream.update`; same selector rules as `remove`.
- `coderouter claude clear` (aliases `remove-all`, `unset`) — removes every account of the team; "No Claude upstream accounts were set." when none. `--team <id>`, `--json`.
- Socket methods: `coderouter.claude_upstream.get|add|update|remove|clear` (`set` aliases `add`), `coderouter.machines`. Sign-in failures surface as `auth_required` (same code as `vm`).

## `cmux auth`

- `auth status` — signed-in state; `--json`.
- `auth login` — begins sign-in through the app, waits for completion.
- `auth logout` — clears the current session.
- `auth team list`, `auth team use <team-id>`, `auth team create <name>` — list/select/create teams.

## `cmux vpn` (system-wide Network Extension tunnel)

Controls the system-wide Network Extension tunnel used by *other apps* on the Mac — cmux's own terminals/Ports/Desktop use a separate built-in user-space WireGuard hub and don't need this. `cmux vpn <up|down|status|revoke>` (default subcommand `status` when none given); `up` aliases `on`, `down` aliases `off`.
- `vpn up` — calls `vm.tunnel_status`; if the backend isn't app-managed, errors: "This cmux build has no signed Network Extension, so it cannot give other apps a route to your Cloud VM network. cmux's own terminals, Ports, and Desktop do not need it." Otherwise brings the app-managed tunnel up (no sudo needed with an app-managed extension; older/system-extension flow prompts for sudo: "Bringing the tunnel up (sudo will prompt for your password)…").
- `vpn down` — same guard, error if unavailable: "This cmux build has no signed Network Extension. No system-wide VPN is running."
- `vpn status` — prints `Terminal tunnel: up|idle (user-space WireGuard)` plus, when app-managed, extended state (`Tunnel: down (enrolled; run 'cmux vpn up')`, `Tunnel: not set up (run 'cmux vpn up')`, `Tunnel: up, but for a different enrollment (run 'cmux vpn up' to switch it)`, `Tunnel: starting`, `Tunnel: waiting for approval in System Settings › General › Login Items & Extensions`, `Tunnel: failed (%@)`, `Tunnel: down (starts automatically when you open a Cloud machine)`, `Tunnel: not set up (enrolls automatically when you open a Cloud machine)`, `Pinned up by 'cmux vpn up'; run 'cmux vpn down' to release.`, or the auto-managed explanation), else `System-wide tunnel: unavailable in this build...` / `System-wide backend: unavailable`.
- `vpn revoke` — calls `vm.tunnel_revoke` (60s timeout); un-enrolls this Mac.
- Related strings: "Enrolled this Mac on your Cloud VM network.", "This Mac is unenrolled from your Cloud VM network.", "Refreshed this Mac's tunnel keys.", "wg-quick is not installed. Install with: brew install wireguard-tools" (non-app-managed backend), and switching-enrollment prompt: "The tunnel that is up was brought up for another enrollment (a different account, or older keys). Replacing it with this one (sudo will prompt for your password)…", failure recovery: "Could not switch the tunnel. Check the command output above, run `cmux vpn down`, then retry `cmux vpn up`." App-managed explainer: installs the "cmux Cloud Tunnel" network extension + a macOS VPN configuration named "cmux Cloud" so every app on the Mac can reach the Cloud VM network; first time macOS asks to allow the extension in System Settings › General › Login Items & Extensions. `cmux vpn hosts` (referenced, needs sudo) maps `<machine>.internal` entries into `/etc/hosts`.

## `cmux sudo` (Touch-ID-gated privilege escalation broker)

`cmux sudo run [-r reason] [-t timeout] (-c 'command' | script.sh | -)` — runs a command/script as root through an approval broker gated by Touch ID rather than a raw sudo prompt in the terminal.
- `-r <reason>` — shown to the approver; default when omitted: "(no reason given)".
- `-t <timeout>` — must be a positive integer, max 86400 seconds ("sudo: timeout must be a positive integer" / "sudo: timeout must not exceed 86400 seconds").
- Input: `-c 'command'` inline, a script file path, or `-` for stdin. Missing input: "sudo: nothing to run; pass -c 'command', a script file, or -". Script must be valid UTF-8 (else "sudo: the script must be valid UTF-8") and ≤256 KiB ("sudo: the script exceeds the 256 KiB limit").
- Flow: cmux writes an approval request, a cmux GUI dialog shows **"Administrator access requested"** with a warning ("Review the entire script before approving. It will run with administrator privileges."), Request ID, Reason, Requested by (`%1$@ (PID %2$d)`), Working directory, Queued time, and the full script text under "Script to run as root"; buttons "Approve with Touch ID" / "Deny". Status progression shown to the approver: Waiting for approval → Applying decision… → Approved — starting the secure runner… → Running with administrator privileges…
- CLI-side waiting message: "sudo: request %@ queued; waiting up to %d seconds for approval in cmux…" (singular variant for 1 second).
- Outcomes: `sudo: request denied`, `sudo: request failed`, `sudo: timed out waiting for approval (request %@ was not approved)`, `sudo: request %@ was approved, but execution did not complete before the timeout`.
- `cmux sudo pending` — lists pending requests ("(none)" when empty).
- `cmux sudo setup-touch-id` — configures Touch ID for sudo (error if Touch ID isn't configured points here: "Touch ID for sudo is not configured. Run cmux sudo setup-touch-id.").
- Other broker errors: approval expired before approval, requester process exited before completion, execution interrupted before a result was written, execution timed out (process tree terminated), Touch ID cancelled/unavailable, script could not be staged safely, runner could not be launched, command could not be launched, cleanup could not finish (one or more processes survived).
- Environment/guard errors: too many pending approval requests, could not start Touch ID setup (reinstall and retry), could not open cmux for approval (open cmux and retry), could not write the approval request, could not verify the requesting process, could not monitor the approval result, must run from a cmux terminal ("could not start secure execution; retry from a cmux terminal"), must use the bundled cmux CLI ("use the cmux CLI included with the cmux app, then retry"). Unknown flag / unexpected argument / script not found / script unreadable errors also defined.

## AppleScript support

Full dictionary defined in `Resources/cmux.sdef` (`Cmux` suite code), implemented by `Sources/AppleScriptSupport.swift`. Gate: `applescript.error.disabled` — "AppleScript is disabled by the macos-applescript configuration."

Classes (all read-only properties unless noted):
- `application` (`NSApplication`) — `name`, `frontmost` (r), `front window` (r, → `window`), `version` (r); has-elements `window` (r), `terminal` (r); responds to `perform action`, `new window`, `new tab`, `quit`.
- `window` (`CmuxScriptWindow`, plural `windows`) — `id`, `name` (title), `selected tab` (→ `tab`); responds to `activate window`, `close window`; has-elements `tab`, `terminal`.
- `tab` (`CmuxScriptTab`, plural `tabs`, "a cmux workspace") — `id`, `name` (title), `index` (1-based), `selected` (bool), `focused terminal` (→ `terminal`); responds to `select tab`, `close tab`; has-elements `terminal`.
- `terminal` (`CmuxScriptTerminal`, plural `terminals`, "an individual terminal panel") — `id`, `name` (title), `working directory`; responds to `split`, `focus`, `close`.

Enumeration `split direction`: `right`, `left`, `down`, `up`.

Commands:
- `perform action <text> [on <terminal>]` → boolean — performs a **Ghostty action string** on a terminal.
- `new window` → `window`.
- `new tab [in <window>]` → `tab` — creates a new workspace, optionally in a target window.
- `split <terminal specifier> [direction <split direction>]` → `terminal` — splits a terminal, returns the new terminal.
- `focus <terminal specifier>` — focuses a terminal, brings its window to front.
- `close <terminal specifier>` — closes a terminal.
- `activate window <window specifier>` — brings a window to front.
- `select tab <tab specifier>` — selects a workspace in its window.
- `close tab <tab specifier>` — closes a workspace.
- `close window <window specifier>` — closes a window.
- `input text <text> to <terminal>` — inputs text to a terminal **as if pasted**.
- Standard Suite: `count`, `exists`, `quit`.

Error strings surfaced by handlers: "Failed to create split.", "Failed to create window.", "Failed to create workspace.", "Missing action string.", "Missing input text.", "Missing or unknown split direction.", "Missing terminal target.", "Terminal is no longer available.", "Window is no longer available.", "Workspace is no longer available."

**What's missing from the dictionary** compared to the CLI/socket surface: no browser scripting, no notification/sidebar-metadata scripting, no VM/Cloud scripting, no todo/vault/comments scripting, and no direct pane-level (only terminal/tab/window) addressing — AppleScript covers only the oldest window→tab(workspace)→terminal object model, not panes, surfaces, splits-as-objects, or any v2 concept.

## Command Palette catalog

The palette (`Cmd+K`-style) surfaces both built-in commands (`command.*` strings, ~250 entries) and config-defined custom actions (see Custom commands above). It has distinct *kinds* of rows (`commandPalette.kind.*`): Agent, Browser, Cloud VM (loading), Custom Sidebar, File Preview, Markdown, Project, Tool (right-sidebar tool), Simulator, Terminal, Workspace, Todos.

Selected built-in commands by area (non-exhaustive list of the ~250; grouped by the string's `subtitle`):
- **Window**: New Window, Close Window, Toggle Full Screen.
- **Tab**: New Tab (Terminal), New Tab (Browser), Close Tab, Pin/Unpin Tab, Rename Tab…, Clear Tab Name, Mark Tab as Read/Unread.
- **Workspace**: New Workspace, New Browser Workspace, New Cloud Workspace, Close Workspace, Pin/Unpin Workspace, Rename Workspace…, Clear Workspace Name, Edit/Clear Workspace Description, Copy Workspace ID and Ref, Copy Workspace Link, Mark Workspace as Done, Workspace Status: %@ / Auto, Open Todo Pane, Open All Workspace PR Links, Next/Previous Workspace.
- **Browser**: Back/Forward/Reload Page, Clear Browser History, Focus/Hide/Show Address Bar/Omnibar, Show JavaScript Console, Toggle Developer Tools, Open Current Page in Default Browser, Zoom In/Out/Actual Size, Split Browser Right/Down, Duplicate Browser to the Right, Reopen Closed Browser Tab.
- **Terminal Layout**: Split Right/Down, Split Browser Right/Down (from a terminal), Toggle Pane Zoom, Equalize Splits.
- **Terminal**: Find…/Find Next/Previous, Hide Find Bar, Use Selection for Find, Send Ctrl-F to Terminal, Clear Screen (Keep Scrollback), Focus/Toggle/Attach File to TextBox Input.
- **Agent Chat**: New agent chat. **Fork actions**: Fork Conversation to the Left/Right/Top/Bottom/New Tab/New Workspace.
- **Cloud**: Open Base (`command.cloudVM.title`), New Cloud VM, New Cloud Machine…, Status, Checkpoint/Restore/Fork/Resize Cloud VM, Ports, Inspect Tools, Promote to Template, Agent Handoff, Advanced, Open Cloud VM. Failure dialogs are titled per-operation ("Couldn't Start Cloud VM", "Couldn't Checkpoint/Delete/Fork/Open/Rename/Resize/Restore Machine", "Cloud VM Command Failed") with a generic "What to try:" / "Details:" (technical details noted as "available in logs" when hidden) and action-specific remediation text, e.g. missing-CLI: "Install or reload a fresh cmux build, then retry."; exited-nonzero: "The Cloud VM command exited with status %d."; delete-failure: "Refresh the Machines list and retry. A machine that no longer exists is removed from the list automatically. To see the full output, run `cmux vm rm <id>` in a terminal."
- **cmux.json**: rows for schema errors/warnings in project vs global config (`command.cmuxConfig.*`), each showing which config file and the localized issue message; selecting opens the file.
- **CLI**: Shell Command: Install/Uninstall 'cmux' in PATH.
- **Global**: Open Settings, Check for Updates, Attempt Update, Apply Update (If Available), Restart CLI Listener, Make cmux the Default Terminal, Sleepy Mode, Flash Focused Panel.
- **Account**: Sign In, Sign Out; Open Team Picker.
- **Notifications**: Show Notifications, Jump to Latest Unread, Mark as Oldest Unread and Jump to Next Latest Unread.
- **Saved Layouts**: New Workspace from Layout: %@, Save Layout as Template….
- **History**: Restore Previous App Launch (reopen previous session).
- **Mobile**: Open Mobile Pairing.
- **Right Sidebar**: Find in Directory, Open Files/Find/Vault/Cloud as Pane, sidebar mode switch commands.
- **Find Work** (`commandPalette.currentWork.*`): title "Find Work", subtitle "Current local and Cloud work"; search box "Find current work"; groups results under Local/Cloud; per-item badges "May be out of date" / "No open local view · read only"; empty state "No work in this snapshot matches your search."; truncation note "Showing %lld of %lld items" and "Additional work is outside this snapshot."
- **Workspace switcher**: search placeholders "Search workspaces" / "Search workspaces and surfaces"; window label "Window %lld"; empty states "No workspaces match your search." / "No workspaces or surfaces match your search."
- **Rename flows** (inline, not a separate dialog): Rename Workspace / Rename Tab / Rename Workspace Group panels reuse the same palette UI with a confirm hint ("Press Enter to apply this … name, or Escape to cancel.") and a placeholder.
- Generic toggle-setting rows: "Enable %@"/"Disable %@" with a subtitle "%@ • %@" and state "On"/"Off" — used for many boolean settings surfaced directly in the palette (e.g. Match Terminal Background, Minimal Mode).

## Unverified / unclear

- The exact list of all ~250 `command.*` palette entries was not individually cross-referenced against live UI; the section above groups a representative majority by subtitle from the string dump rather than the full enumerated list. A handful of very narrow entries (e.g. some VS Code Inline / simulator-specific rows) are named but not further detailed here.
- `CMUX_SOCKET_ENABLE`'s exact accepted value set is inferred from `api.socketEnableDesc` ("1/0, true/false, on/off") rather than confirmed against the parsing code.
- `restart behavior` default in custom commands: the docs string `customCommands.restartNew = "Create a new workspace (default)"` conflicts in ordering with `restartIgnore`/`restartRecreate`/`restartConfirm` being listed first in the flat dump — treat "Create a new workspace" as the documented default, with ignore/recreate/confirm as the other three named behaviors, exact enum value strings (e.g. `ignore`, `recreate`, `confirm`, `new`) not independently confirmed from schema source.
- `vm --help` usage line lists many additional subcommands not individually detailed above from source (`pause`, `resume`, `snapshot`, `fork`, `restore`, `dev`, `layout`, `env`, `ports`) — some map to strings seen elsewhere (`command.cloudVM.snapshot/restore/fork` in the palette) but their exact CLI flag shapes were not read from `CLI/CMUXCLI+CloudFeature.swift` or equivalent source in this pass.
- `cmux sudo run` exact short/long flag spellings beyond `-r`/`-t`/`-c`/`-` were read only from the usage string, not the argument parser source.
- The full breakdown of every `hooks <agent> <event>` per-agent event name (e.g. exact Claude Code hook event list vs Codex's) was not enumerated; only the agent name list and a couple of example hook names (`Stop`) were confirmed.
- `vm terminal wait` and other VM terminal commands' exact JSON field names beyond what's quoted in the contract doc were not independently verified against the socket method implementation.

## Coverage note

This catalog is built primarily from `docs/cli-contract.md` (the project's own tested compatibility contract for the entire `cmux` CLI, including its complete no-socket help-probe table), `docs/automations.md`, `docs/events.md`, `docs/v2-api-migration.md`, `docs/local-tmux.md`, the web docs copy for Custom Commands / CLI Reference / Configuration / Remote tmux / Base (`web/messages/en.json` under `docs.*`), `Resources/cmux.sdef` (complete AppleScript dictionary) plus `Sources/AppleScriptSupport.swift`, and the `command.*`/`commandPalette.*`/`socket.*`/`socketControl.*`/`sudo.*`/`cli.vpn.*` sections of the localized-string dump, supplemented by direct reads of `CLI/CMUXCLI+VPN.swift`, `CLI/CMUXCLI+VPNAppManaged.swift`, and `CLI/CMUXCLI+Sudo.swift` for the two subsystems (`vpn`, `sudo`) not covered by the CLI contract doc. It does not exhaustively read every one of the ~300 `CLI/CMUXCLI+*.swift` implementation files line-by-line; where the contract doc, docs pages, or strings gave an authoritative, tested surface (which is most of the CLI, since the contract doc is itself a compatibility test target), that was treated as ground truth over guessing from filenames. Areas explicitly out of scope per the brief (window/pane rendering, notifications UI, sidebar UI, diff viewer UI, simulator/computer-use UI, Feed UI, task manager, mobile app, pricing, dock, vault UI, workspace groups UI) are covered by other agents and were only touched here where they intersect the CLI/socket/automation/AppleScript surface (e.g. `todo`, `comments`, `vault`, `right-sidebar`, `sidebar-state`).
