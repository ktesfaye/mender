# Agents and providers

Emdash ships one plugin per supported CLI coding agent (37 in this build), each declaring a fixed set of "capabilities" (ACP, auth, models, hooks, MCP, trust, sessions, prompt delivery, plugins, auto-approve, effort, host-dependency install) and the behavior that implements them. The desktop surfaces these through an agent selector combobox, a settings "Agents" page, and a status indicator system fed by CLI lifecycle hooks.

## The plugin/capability framework

### What it is
Every provider is defined in `packages/plugins/src/agents/impl/<id>/index.ts` as a `definePlugin(metadata, capabilities, assets)` + `registerPluginBehavior(plugin, behavior)` pair, then registered into a single `pluginRegistry` (`packages/plugins/src/agents/registry.ts`). The registry order used for iteration/display is: codex, claude, grok, devin, qwen, droid, antigravity, cursor, copilot, amp, commandcode, opencode, hermes, charm, auggie, goose, kimi, kilocode, kiro, rovo, cline, codebuddy, continue, codebuff, freebuff, mistral, jules, junie, oh-my-pi, pi, prime-agent, qoder, letta, autohand, mimocode, muse, zero.

### Capabilities (framework-level, `packages/core/src/services/agent-plugins/api/plugins/capabilities/`)
- **acp** (`acp.ts`) — `kind: 'supported'` or absent. Governs whether the provider can run inside Emdash's structured chat UI (ACP = Agent Client Protocol). Behavior supplies `buildSpawn`, `connect`, optional `enrich` (per-provider event transform) and optional `terminalCommand`.
- **auth** (`auth.ts`) — `kind: 'none'` (default) or `kind: 'supported'` with a list of `AgentAuthMethod`s: `cli-login` (id, name, args, description) or `api-key` (id, name, envVars[{name,label}], helpUrl). Behavior supplies `checkStatus(ctx) => AgentAuthStatus` (`authenticated` w/ optional `account`, `unauthenticated`, or `unknown`).
- **autoApprove** — `kind: 'supported' | 'none'` (default `'none'`). Whether the provider has a "yolo"/bypass-permissions flag Emdash can pass.
- **effort** — `kind: 'selectable' | 'none'` (default `'none'`). Declared but **no provider in this build sets `selectable`** — only `goose` explicitly sets `'none'`; every other provider inherits the default. This is a dead/unused capability in v1.2.6.
- **hooks** — `kind: 'config' | 'plugin' | 'none'`, `scope: 'global'|'workspace'`, `supportedEvents` drawn from `['notification','stop','session','start','tool-use','tool-use-failure']`. `'config'` = hooks written into the agent's own settings/config file; `'plugin'` = an Emdash-authored plugin/extension file dropped into the agent's plugin directory that itself posts hook events.
- **hostDependency** — install/detection descriptor: `binaryNames`, per-OS `installCommands` (method: curl/npm/homebrew/powershell/other, `command`, optional `updateCommand`, `uninstallCommand`, `recommended`, `elevation`), `updates` (`releaseSource`: none/npm/github, `update.kind`: package-manager/self/cli), `installDocs`.
- **mcp** — `kind: 'supported'` (`scope:'global'`, `supportedTransports: ['stdio','http']`) or `'none'`. Behavior reads/writes/removes MCP server registrations in the provider's own config format.
- **models** — `kind: 'selectable'` with a `modelOptions` map (`name`, optional `description`, `modelFeatures.intelligence`/`speed` 1–5, optional `contextWindowSize`) or `'none'`.
- **plugins** — `kind: 'file-drop'` (Emdash drops a hook/notification file into the agent's extension directory), `'cli'`, or `'none'`.
- **prompt** — delivery mechanism: `argv` (with an optional `flag`; empty string = positional), `stdin-pipe`, `pty-only` (no way to inject the initial prompt via CLI — Emdash opens the interactive TUI and the user types it), or `none`.
- **sessions** — `kind: 'resumable' | 'stateless'`. Resumable providers can be reattached later; behavior may add `validateSessionId(id)` to reject a stored id that doesn't look like that provider's format (prevents resuming with Emdash's internal UUID before the provider has emitted its own).
- **trust** — `kind: 'supported' | 'none'`. Behavior's `trustWorkspace(fs, ctx)` pre-accepts a folder-trust prompt so the CLI doesn't stop to ask on first run in a new worktree.

### Command construction — `buildStandardCommand`
`packages/core/src/services/agent-plugins/api/plugins/helpers/standard-command.ts` is the shared builder nearly every provider uses. A `StandardCommandSpec` declares per-provider flag names (`autoApproveFlag`, `initialPromptFlag`, `resumeFlag`, `sessionIdFlag`, `sessionIdOnResumeOnly`, `resumeWithoutSessionFlag`, `newConversationFlag`, `modelFlag`, `deduplicateFlags`, `omitAutoApproveOnResume`, `extraEnv`, `defaultArgs`). Session id resolution rule: on a fresh session the Emdash conversation UUID is passed (if the provider takes one); on resume, if the provider has since reported its own native session id (e.g. Claude's in-TUI `/resume` switching sessions) and it differs from the UUID, that native id is used instead. `initialPromptViaStdinPipe` wraps the whole command in `bash -c "printf '%s\n' <prompt> | <agent...>"` (used by Amp).

### Icon and asset display
Each provider ships an `icon.ts` (referenced in `plugin.assets.icon`) rendered by `AgentIcon` (`contributions/browser/agent-icon.tsx`), used in the selector rows, hover card header, and stacked logos (`stacked-agent-logos.tsx`) elsewhere in the app.

## Per-provider table

Columns: Display name · CLI binary/install method (macOS) · ACP · Auth · Models · Auto-approve flag · Hooks kind · MCP · Sessions · Prompt delivery.

| id | Name | Install (macOS) | ACP | Auth | Models | Auto-approve flag | Hooks | MCP | Sessions | Prompt |
|---|---|---|---|---|---|---|---|---|---|---|
| amp | Amp | npm `@ampcode/cli@latest` | none | none | selectable (low/medium/high/ultra + legacy aliases deep→ultra, rush→low, smart→high) | `--dangerously-allow-all` | plugin (start/stop/session) | supported | resumable (`T-` prefix validated) | stdin-pipe |
| antigravity | Antigravity | curl `antigravity.google/cli/install.sh` | none | none | selectable (8 Gemini/Claude/GPT-OSS variants) | `--dangerously-skip-permissions` | config (session/start/stop) | none | resumable | argv `-i` |
| auggie | Auggie | npm `@augmentcode/auggie` | supported (native `--acp`) | none | none | none (no autoApprove capability) | config (notification/stop/session/start) | none | resumable | argv `` |
| autohand | Autohand Code | npm `autohand-cli` | none | none | none | `--unrestricted` | none | none | stateless | argv `-p` |
| charm | Charm (Crush) | npm `@charmland/crush` | none | none | `kind:'none'` (explicit) | none (`kind:'none'` explicit) | none | supported | stateless | argv (custom: `run` subcommand when sending an initial prompt) |
| claude | Claude Code | curl `claude.ai/install.sh`; homebrew cask `claude-code` | supported (Node adapter + Claude Agent SDK) | supported (cli-login `auth login` + API key `ANTHROPIC_API_KEY`) | selectable: Claude Fable 5.1, Claude Fable 5, Claude Opus 4.8, Claude Opus 5, Claude Sonnet 5, Claude Haiku 4.5 | `--dangerously-skip-permissions` | config (start/notification/stop/session) | supported | resumable | argv `` |
| cline | Cline | npm `cline` | supported (native `--acp`) | none | none | `--yolo` | none | none | stateless | argv `` |
| codebuddy | CodeBuddy Code | npm `@tencent-ai/codebuddy-code` (bins `codebuddy`/`cbc`) | supported (native `--acp`) | none | none | `--dangerously-skip-permissions` | config (notification/stop/session/start/tool-use-failure) | supported (`.codebuddy/.mcp.json`) | resumable | argv `` |
| codebuff | Codebuff | npm `codebuff` | none | none | none | none | none | none | stateless | argv `` |
| codex | Codex | curl `chatgpt.com/codex/install.sh`; npm `@openai/codex`; homebrew cask `codex` | supported (Node adapter) | supported (cli-login `login --device-auth` + API key `OPENAI_API_KEY`) | selectable: GPT-6 Astra, GPT-5.6 Sol/Terra/Luna, GPT-5.5, GPT-5.4 Mini, GPT-5.3 Codex Spark | `-c approval_policy=never -c sandbox_mode=danger-full-access --dangerously-bypass-hook-trust` | config (notification/stop/session) | supported | resumable | argv `` |
| commandcode | Command Code | npm `command-code@latest` (bins command-code/commandcode/cmdc) | none | none | none | `--yolo` | config (session/stop) | none | resumable | argv `` |
| continue | Continue | npm `@continuedev/cli` (bin `cn`) | none | none | none | `--auto` | none | none | resumable | argv `` |
| copilot | GitHub Copilot | npm `@github/copilot` | supported (native `--acp`) | none | none | `--allow-all-tools` | config (stop/session/notification) | supported | resumable | argv `-i` |
| cursor | Cursor | curl `cursor.com/install` | supported (native `acp`) | none | none | `-f --approve-mcps` | none | supported | resumable | argv `` |
| devin | Devin | curl `cli.devin.ai/install.sh` | supported (native `acp`, custom `terminalCommand`) | none | none | `--permission-mode=bypass` | config (stop/notification) | none | resumable | argv `--` |
| droid | Droid | curl `app.factory.ai/cli` | supported (native `exec --output-format acp-daemon`) | none | none | `--auto high` | config (notification/stop/session/start) | supported | resumable (UUID-validated) | argv `` |
| freebuff | Freebuff | npm `freebuff` | none | none | none | none | none | none | stateless | pty-only |
| goose | Goose | curl GitHub release `download_cli.sh` | supported (native `acp`) | none | none (`kind:'none'` explicit) | `kind:'none'` explicit | config (session/start/stop/tool-use/tool-use-failure) | none (`kind:'none'`) | resumable | argv `-t` (custom command builder w/ `session`/`run -s` subcommands) |
| grok | Grok | curl `x.ai/cli/install.sh`; npm `@xai-official/grok` | supported (native `agent stdio`) | none | none | `--always-approve` | config (notification/stop/session/start) | supported | resumable | argv `` |
| hermes | Hermes Agent | curl `hermes-agent.nousresearch.com/install.sh` | supported (native `acp`) | none | none | `--yolo` | none | none | resumable | pty-only |
| jules | Jules | npm `@google/jules` | none | none | none | none | none | none | stateless | pty-only (CLI has no prompt arg) |
| junie | Junie | curl `junie.jetbrains.com/install.sh` | supported (native `--acp=true`) | none | none | none | none | none | resumable | argv `--task` |
| kilocode | Kilocode | npm `@kilocode/cli` (bin `kilo`) | supported (native `acp`) | none | none | `--auto` | plugin (notification/stop/session) | none | resumable | argv `--prompt` (positional avoided — realpath ENAMETOOLONG bug ENG-1546) |
| kimi | Kimi | curl `code.kimi.com/install.sh` | supported (native `acp`) | none | none | `--yolo` (omitted on resume) | config (notification/stop/session/start) | none | resumable | pty-only (custom command injects hooks into inline `--config`) |
| kiro | Kiro (AWS) | curl `cli.kiro.dev/install` | supported (native `acp`) | none | none | `--trust-all-tools` | config (session/start/stop) | none | resumable | argv `` (`chat --agent emdash` default args) |
| letta | Letta | npm `@letta-ai/letta-code` | none | none | none | `--yolo` | none | none | resumable | pty-only |
| mimocode | MiMo Code | npm `@mimo-ai/cli`; curl `mimo.xiaomi.com/install` | supported (native `acp`) | none | none | via env `MIMOCODE_PERMISSION={"*":"allow"}` | plugin (notification/stop/session) | supported | resumable (`ses` prefix validated) | argv `--prompt` |
| mistral | Mistral Vibe | curl `mistral.ai/vibe/install.sh` | supported (native, spawns sibling `vibe-acp` binary) | none | selectable: Mistral Medium 3.5, Devstral Small, Local Devstral | `--agent auto-approve` | config (notification/stop) | none | stateless | argv `` |
| muse | Muse Code | curl `dev.meta.ai/install.sh` | none | none | none | `--yolo` | config (session/start/stop) | none | stateless | pty-only |
| oh-my-pi | Oh My Pi | curl `omp.sh/install`; homebrew `can1357/tap/omp`; bun | supported (native `acp`) | none | none | none | plugin (session/stop) | none | resumable | argv `` |
| opencode | OpenCode | npm `opencode-ai` | supported (Node adapter, direct `acp` subcommand) | supported (cli-login `auth login` + API keys: Anthropic/OpenAI/Gemini/OrcaRouter) | none | via env `OPENCODE_PERMISSION={"*":"allow"}` | plugin (notification/start/stop/session) | supported | resumable (`ses` prefix) | argv `--prompt` |
| pi | Pi | npm `@earendil-works/pi-coding-agent --ignore-scripts` | none | none | none | none | plugin (session/stop) | none | resumable | argv `` |
| prime-agent | Prime Agent | curl `app.primeintellect.ai/prime-agent/install.sh` | supported (native `--mode acp`) | none | none | none | plugin (session/start/stop) | supported | resumable | argv `` |
| qoder | Qoder CLI | npm `@qoder-ai/qodercli`; curl `qoder.com/install` | supported (native `--acp`) | none | none | `--yolo` | config (notification/stop/session/start/tool-use/tool-use-failure) | none | resumable | argv `` |
| qwen | Qwen Code | npm `@qwen-code/qwen-code` | supported (native `--acp --experimental-skills`) | none | none | `--approval-mode=yolo` | config (notification/stop/session) | supported | resumable | argv `-i` |
| rovo | Rovo Dev | `acli rovodev auth login` | none | none | none | `--yolo` | none | none | stateless | argv `` |
| zero | Zero | npm `@gitlawb/zero` | none | none | none | `--skip-permissions-unsafe` | none | none | stateless | pty-only |

## Auth

### What it is
Two providers (Claude Code, Codex) plus OpenCode expose a real `auth` capability with structured methods; every other provider falls back to a synthesized single `cli-login` method (`buildAuthDescriptor` in `agent-payload-builder.ts`): "Open `<binary>` in a terminal and complete the provider sign-in flow."

### States and text
- `AgentAuthStatus`: `{kind:'authenticated', account?}`, `{kind:'unauthenticated', message?}`, `{kind:'unknown', message?}`.
- Claude: checks `ANTHROPIC_API_KEY` env first; else runs `claude auth status` with a 5s timeout, parses JSON output for `email`/`account`/`accountEmail`/`oauthAccount.emailAddress`; on exit code 1 with output matching `/not (authenticated|logged in|signed in)|login required|logged out/i` → `unauthenticated`, otherwise `unknown`.
- Codex: checks `OPENAI_API_KEY` env first; else runs `login status`, matching `/authenticated|logged in|signed in/i` vs `/not authenticated|not logged in|not signed in|login required/i`.
- OpenCode has its own `opencode-auth.ts` (not read in depth here — see Unverified).

### Sign-in UI
`AgentSignInModal` (`apps/emdash-desktop/src/core/features/settings/browser/agents-page/AgentSignInModal.tsx`) is a real xterm.js terminal embedded in a modal dialog (`Dialog.Header` title `Sign in to {providerName}`, subtitle `on {machineName}` for remote hosts). It spawns the provider's own `cli-login` command as a PTY via `AcpAuthLoginBinding`, sized to the container with a bounded 5-retry cell-metrics measurement loop. Before the PTY attaches: "Starting sign-in terminal..." with a spinner. On PTY error: the raw error message is shown full-bleed in the body. The modal auto-closes (`modal.complete()`) the instant a `reaction` on auth status observes `kind:'authenticated'`. External URLs surfaced by the login flow (e.g. an OAuth link) are intercepted and opened via `confirmOpenExternalLink` rather than left clickable only in-terminal; each URL id is only handled once (`handledUrlsRef`). Footer has a single "Close" button.

## Agent status / hook lifecycle

### Canonical states
`packages/ui/src/react/components/agent-status/agent-status.tsx` defines `AgentStatusKind = 'working' | 'awaiting-input' | 'error' | 'completed' | 'idle'`. `idle` renders nothing (returns `null`). Accessible label / tooltip text, verbatim:
- working → **"Agent is working"**
- awaiting-input → **"Agent is awaiting input"**
- error → **"Agent error"**
- completed → **"Agent completed"**

### Visuals
- **working**: a 3×3 grid of 9 dots (`DOT_POINTS`), each a `<circle r="1.85">`, animated with a `dotShimmer` keyframe (opacity 0.3→1→0.4 cycling, scale 0.8→1.0→0.89) over a 1200ms period, staggered per-dot so it reads as a wave sweeping the grid; colour is `foregroundMuted` (neutral, not colour-coded). Respects `prefers-reduced-motion: reduce` by freezing to static per-dot opacities (0.96, 0.72, 0.48, 0.72, 0.48, 0.32, 0.48, 0.32, 0.24) instead of animating.
- **awaiting-input**: a diamond (rotated square, `rotate(45 12 12)`), fill = `backgroundWarning`, stroke = `foregroundWarning` (warning/amber).
- **completed**: a plain circle, fill = `backgroundSuccess`, stroke = `foregroundSuccess` (green).
- **error**: a rounded square with a small solid dot inside, fill/stroke = `backgroundError`/`foregroundError` (red).
- Default indicator size `1.5rem`; consumers can override via the `size` prop (numbers treated as px).

### Where it's shown
`TaskSidebarTrailingSlot` (`apps/emdash-desktop/src/core/features/workbench/browser/sidebar/task-sidebar-agent-status.tsx`) — the right-aligned trailing slot of each task row in the sidebar. Priority order: (1) if the task is bootstrapping (delayed 500ms to avoid flashing on fast creates) — a `BrailleSpinner` (variant "wave") with tooltip **"Creating task workspace..."**; (2) else if the agent status is non-idle — the `AgentStatus` dot/glyph with tooltip; (3) else, if `showTimestamp`, a compact relative time. So the badge replaces the timestamp entirely while the agent is active or unseen, and idle/seen tasks show only a timestamp — there is no separate "idle" glyph anywhere.

### Status derivation pipeline
1. **Hook fires** in the running CLI (see "Hooks" below) → POSTs to a per-task local HTTP endpoint (`http://127.0.0.1:$EMDASH_HOOK_PORT/hook`) with headers `X-Emdash-Token`, `X-Emdash-Pty-Id`, `X-Emdash-Event-Type`.
2. **`parseHookEvent(eventType, body)`** (per-provider override, else `defaultHookEventParser`) turns the raw event into a `CanonicalHookEvent`: `{kind:'status', type:'start'|'stop'|'error'|'notification', notificationType?, title?, message?, lastAssistantMessage?, providerSessionId?}`, `{kind:'session', providerSessionId}`, or `{kind:'ignore'}`.
3. **`TuiAgentStates.applyCanonicalEvent`** (`packages/core/src/runtimes/tui-agents/node/runtime/agent-state.ts`) maps to a `TuiAgentState.status`:
   - `type:'start'` → **working**
   - `type:'stop'` → **completed**
   - `type:'error'` → **error**
   - `type:'notification'` with `notificationType` in `{permission_prompt, idle_prompt, elicitation_dialog}` (the `ATTENTION_NOTIFICATION_TYPES` set) → **awaiting-input**; any other/absent notification type → **idle**.
   - A `providerSessionId` carried on any event updates the stored session id live (handles Claude's in-TUI `/resume` switching sessions without a dedicated event).
4. Two non-hook fallbacks flip status to **working** even without a hook: `markInputSubmitted` (the user typed `\r` into the raw PTY and the provider's hook set doesn't include `'start'`) and `markInitialPromptSubmitted` (an initial prompt was sent and, again, the provider has no `'start'` hook).
5. Main-process mirror: `AgentStatusService` (`apps/emdash-desktop/src/main/core/agent-status/agent-status-service.ts`) derives `AgentStatus` (`working|completed|error|awaiting-input`, or `null` = no change) from an `AgentStatusSignal`, using `isAttentionNotification` for the same notification-type check, persists it to the `conversations` row (`agentStatus`, `agentStatusSeen`), and publishes an `agent-status-changed` conversation event carrying `seen`. Per-conversation write queue serializes concurrent signals. `resetToIdle` only fires (and only clears `working`/`awaiting-input` rows) explicitly, e.g. when a session is abandoned.
6. `notificationType` values overall: `permission_prompt`, `idle_prompt`, `auth_success`, `elicitation_dialog` — only the first three plus elicitation are attention-worthy; `auth_success` is parsed but not in the attention set (so it does not flip to awaiting-input).

### Hook transport mechanics
`makeStdinHookCommand`/`makeNotificationHookCommand`/`makeHookPostCommand` (`packages/core/src/services/agent-plugins/api/plugins/helpers/hooks.ts`) build the actual shell command written into the agent's config:
- POSIX: a guard (`if [ -z "$EMDASH_HOOK_PORT" ] ... ; then exit 0; fi`) then `curl -sf -X POST` with the three `X-Emdash-*` headers to `http://127.0.0.1:$EMDASH_HOOK_PORT/hook`, body either piped from stdin (`-d @-`) or a fixed JSON literal (e.g. `{"notification_type":"idle_prompt"}`), `|| true` so a failed hook never blocks the agent.
- Windows: `cmd.exe /d /c set EMDASH_HOOK_MARKER=...&&` then a base64-encoded, `-NoProfile -ExecutionPolicy Bypass` PowerShell one-liner doing the equivalent `Invoke-WebRequest`, wrapped in `try/catch { exit 0 }` so failures are silent. A version marker (`EMDASH_HOOK_CONFIG_VERSION=1`) is embedded so stale hook installs can be detected/cleaned.
- `EMDASH_MARKER = 'EMDASH_HOOK_PORT'` is grepped for to identify/filter Emdash-owned hook entries (`filterUserHooks`) versus the user's own, so re-installing hooks never clobbers a user's custom hook config.

### Per-provider hook quirks (selected)
- **Claude**: `Notification` events carry no `notification_type` field; classified by regex on the message text (`/permission|approval/i` → `permission_prompt`, else `idle_prompt`). Hooks: `SessionStart`→session-start, `UserPromptSubmit`→start, `Notification`→notification, `Stop`→stop, written into `settings.json` under `$CLAUDE_CONFIG_DIR` (default `.claude`).
- **Codex**: Stop is sent as `{type:'agent-turn-complete'}` rather than a plain `'stop'` type; notifications carry fixed `notification_type` values. Hooks live in `config.toml`'s `hooks` table (TOML, not JSON) under `$CODEX_HOME` (default `.codex`); Codex itself also owns a `hooks.state` sub-table Emdash must not touch. Migrates two legacy formats forward: a legacy `hooks.json` file and a legacy shell/PowerShell `notify` array (`LEGACY_CODEX_NOTIFY_COMMAND`) — both cleaned up on next hook write.
- **Qoder / Qwen**: permission requests arrive as `notification` events with `hook_event_name === 'PermissionRequest'` (not a `notification_type` field); custom parsers translate this to `permission_prompt`. Qoder additionally sets a title "Permission Required" and, absent an explicit message, synthesizes one: `"Qoder CLI is requesting permission to use {tool_name}."`.
- **Mistral**: hooks are TOML entries with `type`/`match`/`timeout`/`strict`/`description` fields (its own hook schema, not Emdash's generic map), e.g. `post_agent_turn` → stop, `before_tool` matched on `ask_user_question` → permission_prompt.
- **Kiro**: supports two hook schema generations concurrently — "classic" (`agents/emdash.json`, event keys like `agentSpawn`) and "v3" (`hooks/emdash.json`, `{name, trigger, command}` entries) — both written/read depending on what the installed CLI version expects.
- **Antigravity**: hooks are written into a "plugin" manifest+hooks pair (`plugins/emdash/plugin.json`, `plugins/emdash/hooks.json`) and consumes the hook's **stdout** as a decision payload (`{decision:'stop'}` on Stop) rather than treating the HTTP call as fire-and-forget; a comment in source explicitly warns never to leak the HTTP transport's response as that decision.
- **Muse**: reads its own `settings.json` first to discover a `managed_hooks_path`/`managed_hooks_env_vars` indirection, with hardened validation against path traversal/absolute paths/env-var interpolation before writing anywhere (a defensive comment: "Never replace an external managed hook source").
- **Devin**: notification hook maps `PermissionRequest` directly to `permission_prompt`; Devin also has a custom `terminalCommand` transform in its ACP behavior — if the agent sends argv, use it literally; if it sends only a `command` string (a full shell script), run it as a shell line instead of args.

### Hooks status shown in Settings
`AgentHooksSection` (`apps/emdash-desktop/src/core/features/settings/browser/agents-page/AgentIntegrationSection.tsx`), gated on `agent.capabilities.hooks.kind !== 'none'`:
- Loading → spinner only.
- `status.state === 'installed'` → green check + **"Configured · {tildified resolved root path}"** (e.g. `~/.claude`), full path also in the `title` tooltip attribute.
- Otherwise → clock icon + **"Configured on first session"** (hooks are installed lazily, the first time a session actually launches that provider).
- An info tooltip on the "Hooks" label reads: *"Hooks let Emdash track agent status, deliver notifications, and capture session IDs for reliable resume."*

### Workspace trust shown in Settings
`AgentTrustSection`, gated on `agent.capabilities.trust.kind !== 'none'` (Claude, Cursor, Copilot only): shows **"Enabled"** (green check) or **"Disabled"** depending on the global `tasks.autoTrustWorktrees` app setting, with a "Manage in Settings" button linking to the general settings tab. Tooltip: *"Skip the folder trust prompt in supported CLIs for new tasks."*
- Claude trust: patches `.claude.json`'s `projects[workspacePath]` with `hasTrustDialogAccepted: true` and `hasCompletedProjectOnboarding: true` (only if not already both true).
- Cursor and Copilot have their own `trust.ts` (not read in depth — see Unverified).

## Agent selector UI

### What it is
`AgentSelector` (`apps/emdash-desktop/src/core/features/agents/contributions/browser/agent-selector.tsx`) is a searchable combobox used wherever a task/session picks its agent (e.g. new-task flow, default-agent setting). Placeholder when nothing is selected: **"No agent installed"** (overridable per-call). Search input placeholder: **"Search agents..."**.

### Grouping and states
Options are split into two `Combobox.Group`s labelled **"Installed"** and **"Not installed"** (`buildAgentGroups`). Installed-but-currently-disabled agents (via a caller-supplied `getDisabledReason`) stay in the Installed group but render disabled with the reason text shown as a small muted line under the name. Not-installed agents are always rendered `disabled` (can't be selected directly) but show an install button (`canInstall`) unless the caller passed `installable={false}`.
- Row content: agent icon (dimmed to 50% opacity when not installed), name (muted colour when not installed), optional disabled-reason subtext, then capability icons.
- `AgentCapabilityIcons`: a speech-bubble icon with tooltip **"Supports Chat UI"** shown only if the agent supports ACP, and a terminal icon with tooltip **"Supports TUI"** shown for every agent (every provider can run in the raw PTY/TUI path).
- Trigger button shows the selected agent's icon + name, chevron-down at the right; disabled state dims to 60% opacity with `cursor-not-allowed`.

### Install button (inline, in each combobox row and the hover card)
`AgentInstallButton` renders only when `canInstall && !isInstalled`. Icon: a download glyph, replaced by a spinning `Loader2` while installing. `aria-label`/tooltip text: **"Install {agentName}"**. Tooltip default side: right.

### Hover card
Hovering a row after a **500ms** delay opens a floating `AgentInfoCard` beside the list (position configurable, default right/start), `sideOffset` 8px; moving to another row while it's open swaps content instantly (no re-delay). Leaving all rows/the card schedules a close after **200ms**, cancelled if the pointer re-enters the card, an input inside it is focused, or a nested popup it spawned (e.g. the install-method dropdown) is expanded — special DOM-containment logic (`isEventInsideAgentHoverCard`) treats clicks inside portalled sub-popups as still "inside" so they don't dismiss the whole combobox.
Card contents (`AgentInfoCard`): icon + name header, a "View Website" link (external-link icon) if `websiteUrl` is set, the provider's `description` text, a **"Set as the default agent"** row with a toggle switch (disabled unless the agent is installed or the request is loading/saving), and the full `InstallSection` (status card + install/update controls) below it.

## Install / update / uninstall flow

### Status card (`DependencyInstallationStatusCard`)
Four `InstallationState`s, each with a distinct icon and one-line label:
- **checking** — grey loader spinner icon; text **"Checking…"**.
- **found** — green check-in-rounded-square icon; text **"Found"** + optional version chip **"v{version}"** + **" installed using {source label}"** (source label e.g. "Homebrew", "PATH", a custom path, etc.).
- **not-found** — grey X icon; text **"Not found — install below"**.
- **uninstalled** — grey X icon (same as not-found); text **"Uninstalled"**.
- A "⋯" overflow menu (`MoreHorizontal`) offers: **"Change source"** submenu (lists every discovered installation plus install-method options, each tagged with a "Recommended" badge and/or "Installed"/"Used" badges), **"Refresh"** (toast sequence: "Refreshing installations..." → "Installations refreshed" / "Failed to refresh installations"), **"Check for updates"** (toast: "Checking for updates..." → "Checked for updates" / "Failed to check for updates"), and, only when supported and currently found, a destructive **"Uninstall"** item (toast: "Uninstalling {name}..." → "{name} successfully uninstalled" / "Failed to uninstall {name}").
- When the active installation isn't a manageable package-manager install, a muted hint line appears: **"Automatic updates are not available for this installation."**

### Badges (`agent-status-badge.tsx`)
- **"Installed"** — green pill.
- **"Not installed"** — neutral grey pill.
- **"Update available"** — amber/warning pill.
- **"Recommended"** — small neutral pill (10px text).
- **"Used"** — small blue/info pill (10px text) — marks whichever source is currently active among several discovered candidates.
- **"Installing…"** — blue/info pill.
- **"Updating…"** — blue/info pill.

### Update card / action state (`agent-install.ts`)
`getAgentUpdateActionState`: renders only if `updateAvailable && updateStrategyKind` is neither `'auto'` nor `'none'`. Label toggles between **"Update"** and **"Updating..."**; a version-transition label is shown as **"v{old} → v{new}"** when both are known.

### Error text (`getAgentUpdateErrorMessage` / `getHostDependencyErrorMessage`), verbatim
- No update strategy: **"No update strategy is available for {id}."**
- Not detected after update: **"The agent was not detected after update."**
- Unknown dependency: **"Unknown dependency: {id}"**
- Missing: **"Dependency is missing: {id}"**
- Stale selection: **"Selected path no longer exists: {path}"**
- No install command: **"No install command is available for {id}."**
- Not detected after install: **"Installed {id}, but the binary was not detected on PATH."**
- No update command: **"No update command is available for {id}."**
- Installer missing: **"The installer `{tool}` is not installed on this machine, so {id} cannot be installed. Install `{tool}` or choose a different install method."**
- Command failed: the underlying message plus a trailing tail of captured command output (stdout/stderr), when present.
- `invalid-selection` / `permission-denied` / `io`: pass through the underlying message verbatim.

### Default agent
Set in app Settings (`DefaultAgentSelector`, general/agents settings page): row reads **"Default agent"** / **"Selected by default when creating a new task."**, with the same `AgentSelector` combobox next to it, validated only against the local host's installed agents. The schema-level default (`apps/emdash-desktop/src/core/features/agents/contributions/settings.ts`) is **`claude`** (Claude Code) if nothing has been chosen — i.e. new installs default to Claude Code as the pre-selected agent.

### Uninstalled-agent assumption
`getAssumedInstalledAgents`: if a currently-selected agent has no dependency-status entry yet (still loading/unknown), it is optimistically treated as installed so the selector doesn't flash it into the "Not installed" group while data is in flight.

## Provider accounts (adjacent system, not agent-CLI auth)

`ProviderAccountRegistry` (`apps/emdash-desktop/src/main/core/provider-accounts/provider-account-registry.ts`) is a separate account store for **external service integrations** (e.g. GitHub, Linear, Jira connections used for issue/PR features), keyed by `providerId`/`accountId`, with at most one default account per provider (self-healing to the oldest account if the default becomes invalid), and secret material stored behind an encrypted `credentialRef` rather than in the row itself. This is distinct from the per-agent-CLI `auth` capability described above; it is not itself the mechanism that authenticates Claude Code/Codex/etc.

## MCP passthrough (brief, since MCP itself is out of this audit's scope)

Providers with `mcp.kind:'supported'` delegate to a shared `createMcpAdapter`/named per-provider adapter (`claudeMcpAdapter`... `passthroughMcpAdapter('.claude.json')`, `codexMcpAdapter()`, `ampMcpAdapter()`, `cursorMcpAdapter()`, `copilotMcpAdapter()`, `droidMcpAdapter()`, `grokMcpAdapter()`, `qwenMcpAdapter()`, `crushMcpAdapter()`, `opencodeMcpAdapter()`, `mimocodeMcpAdapter()`) that reads/writes that provider's native MCP config file format. Prime Agent and CodeBuddy define bespoke inline adapters (seen above) rather than using a shared helper, because their JSON schema for a server entry differs (e.g. Prime Agent's `type: 'http'|'stdio'` discriminated shape with `oauth`/`callTimeoutMs` fields).

## Unverified / unclear

- **Exact ACP status-message text ("context limit reached" style strings)**: not found anywhere under the audited paths (`packages/plugins`, `apps/emdash-desktop/src/core/features/agents`, `tui-agents`, `agent-status`, `dependencies`). The only "context limit" hit in the whole repo is a fixture string in `codex/fixtures/acp-transcript.json` (a tool-call description, not app chrome) and a doc comment in `packages/core/src/runtimes/acp/api/models/config.ts` about a context-window capacity field. This exact UI text likely lives in `packages/chat-ui/` (the ACP transcript renderer), which was out of this audit's assigned scope.
- **OpenCode's `opencodeAuthStatus`** (`packages/plugins/src/agents/impl/opencode/auth.ts`) was not read in depth.
- **Cursor's and Copilot's `trust.ts` behaviors** were not read in depth (only that they exist and are wired in).
- **`native-acp.test.ts` / `prompt-delivery.test.ts`** at the impl root (shared cross-provider tests) were not read; they likely assert invariants across all native-ACP and prompt-delivery providers but weren't inspected for additional per-provider facts.
- **Sidebar/task-list/conversation-tab rendering of `agentStatus`** beyond `TaskSidebarTrailingSlot` (e.g. `conversation-tab-item.tsx`, `sidebar-conversations-list.tsx`, `task-row.tsx`, `conversation-palette-provider.tsx`) were found via grep but not opened — there may be additional status-driven visuals (badges on tabs, palette entries) beyond the sidebar dot documented here.
- **Sound/desktop notifications**: no evidence of an audible/OS-notification layer was found in the audited paths; not confirmed absent, just not located.
- **`freebuff` / `jules` / `hermes` / `letta` / `muse` / `zero` / `kimi`**: all `pty-only` prompt delivery — confirmed from `index.ts`, but the exact behavior/copy of the "type your prompt in the terminal" experience these fall back to was not traced into the PTY/TUI runtime UI layer (outside this audit's file list).
- **Effort capability**: confirmed unused (no provider sets `kind:'selectable'`), but whether this is because effort selection now rides through the `models` list (e.g. Codex's "Spark" vs "Terra" variants, Amp's low/medium/high/ultra) rather than a separate UI control is an inference, not confirmed against a changelog.

## Coverage note

All 37 providers' `index.ts` were read in full. Deep-dived: Claude Code (acp-transform, hooks, auth, trust) and Codex (hooks, incl. legacy-format migration) as the two richest/default-adjacent providers. Hooks.ts was additionally read for antigravity, auggie, commandcode, copilot, devin, droid, grok, kiro, mistral, muse, qoder, qwen to capture per-provider notification-classification quirks; the remaining providers' hook wiring is inferred from their declared `supportedEvents` list plus the shared `buildNestedJsonHookConfig`/`buildFlatTomlHookConfig` helpers, not read hook-by-hook. All twelve capability schema files (acp, auth, auto-approve, effort, hooks, hooks-types, mcp, models, plugins, prompt, sessions, trust) were read in full. Status/lifecycle: `agent-state.ts`, `agent-status-service.ts`, `hooks.ts` helper (transport), `parse-hook-event.ts`, and the `AgentStatus` UI component + its vanilla-extract stylesheet were read in full. UI: agent-selector, agent-hover-card, agent-info-card, agent-install-button, agent-capability-icons, agent-selector-options, use-agent-availability, agent-payload-builder, agent-error-mapping, DependencyInstallationStatusCard, agent-status-badge, DefaultAgentSelector, AgentIntegrationSection (hooks/trust sections), AgentSignInModal, and the agents-page settings contribution were all read in full. Not opened: `hook-installer.ts`, `hook-pipeline.ts`, `hook-server.ts` (transport receiver internals — only their effect was inferred from the sender side), `workspace-trust.ts`, `runtime.ts`/`worker-spec.ts` (PTY/TUI process runtime internals), `live-models.ts`, and most `*.test.ts` files (used only to corroborate behavior already read from source, not as a primary source).
