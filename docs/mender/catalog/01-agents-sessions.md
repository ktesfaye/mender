## Agent adapter / plugin system

Emdash supports many third-party coding-agent CLIs through one plugin contract. Every provider is
a `definePlugin(metadata, capabilities, assets)` + `registerPluginBehavior(plugin, behavior)` pair
(`packages/core/src/services/agent-plugins/api/plugins/index.ts`), registered into one
`pluginRegistry` (`packages/plugins/src/agents/registry.ts`). This is the single source of truth
for "which agent CLIs exist and what each can do" — a new UI should read this registry rather than
hardcode a provider list.

### Feature: the supported-agent catalog (37 providers)

What it is: a fixed list of CLI coding agents Emdash knows how to drive, each with a name,
description, website URL, and icon (`impl/<id>/icon.ts`).

What the user can do: pick any of these as the agent behind a conversation (subject to whether it
is installed — see Host dependency management below).

Full list read from `packages/plugins/src/agents/impl/*/index.ts` (id → display name):
`amp` Amp, `antigravity` Antigravity, `auggie` Auggie, `autohand` Autohand Code, `charm` Charm,
`claude` Claude Code, `cline` Cline, `codebuddy` CodeBuddy Code, `codebuff` Codebuff, `codex`
Codex, `commandcode` Command Code, `continue` Continue, `copilot` GitHub Copilot, `cursor` Cursor,
`devin` Devin, `droid` Droid, `freebuff` Freebuff, `goose` Goose, `grok` Grok, `hermes` Hermes
Agent, `jules` Jules, `junie` Junie, `kilocode` Kilocode, `kimi` Kimi, `kiro` Kiro (AWS), `letta`
Letta, `mimocode` MiMo Code, `mistral` Mistral Vibe, `muse` Muse Code, `oh-my-pi` Oh My Pi,
`opencode` OpenCode, `pi` Pi, `prime-agent` Prime Agent, `qoder` Qoder CLI, `qwen` Qwen Code,
`rovo` Rovo Dev, `zero` Zero.

Backend: `packages/plugins/src/agents/registry.ts` (`pluginRegistry`), each provider's
`impl/<id>/index.ts`.

### Feature: per-agent capability declaration (drives what the UI shows)

Each provider declares a subset of eleven typed capabilities. A new front end should treat every
one of these as a UI affordance that appears/disappears per selected agent, not as a fixed layout.
Declared in `packages/core/src/services/agent-plugins/api/plugins/capabilities/*.ts`:

- **`acp`** — `{kind:'none'|'supported'}`. Whether the agent speaks the Agent Client Protocol
  (structured streaming session, not a raw terminal). 20 of 37 providers support it (claude, codex,
  auggie, cline, codebuddy, copilot, cursor, devin, droid, goose, grok, hermes, junie, kilocode,
  kimi, kiro, mimocode, mistral, oh-my-pi, opencode, prime-agent, qoder, qwen — grep count ≈23).
  Non-ACP agents run only as a raw PTY/terminal session.
- **`auth`** — `{kind:'none'|'supported', methods:[...]}`. Only `claude`, `codex`, `opencode`
  declare auth methods among those grepped; each method is either `cli-login` (name, args, runs the
  CLI's own sign-in flow in a terminal, e.g. Claude's `auth login`, Codex's `login --device-auth`)
  or `api-key` (one or more named env vars, e.g. `ANTHROPIC_API_KEY`, plus a `helpUrl` to the
  provider's key page). UI: an auth method picker + "sign in" action + API key entry.
- **`autoApprove`** — `{kind:'none'|'supported'}`. Whether the agent has a flag to skip permission
  prompts entirely (Claude: `--dangerously-skip-permissions`; Codex:
  `-c approval_policy=never -c sandbox_mode=danger-full-access --dangerously-bypass-hook-trust`).
  UI: a toggle, typically named "auto-approve" / "yolo mode".
- **`effort`** — `{kind:'none'|'selectable', effortOptions: {id: {label, level}}}`. A reasoning-effort
  / thought-level dial (only `goose` declares it in the current set). UI: submenu under the model
  picker (see Composer below — `renderFooter` "Effort" row with a radio group).
- **`hooks`** — `{kind:'none'|'config'|'plugin', scope:'global'|'workspace', supportedEvents}`.
  Lifecycle hook events: `notification | stop | session | start | tool-use | tool-use-failure`.
  Drives status derivation (see Agent status below), not directly user-visible, but underlies the
  "agent is waiting for input" notification.
- **`hostDependency`** — binary names to probe, and per-platform install commands (curl script,
  Homebrew formula/cask, npm package, PowerShell script), an uninstall command, and an update
  command. Drives the CLI install/update flow (see Host dependency management below).
- **`mcp`** — `{kind:'none'|'supported', scope:'global', supportedTransports:['stdio','http']}`.
  Whether the agent can be configured with MCP servers through Emdash. UI: the composer's MCP
  servers popover (see below).
- **`models`** — `{kind:'none'|'selectable', modelOptions:{id:{name, description, modelFeatures:
  {contextWindowSize, speed 1-5, intelligence 1-5}}}}`. Model picker with per-model metadata.
  Claude's current model list (from `impl/claude/index.ts`): Claude Fable 5.1, Claude Fable 5,
  Claude Opus 4.8, Claude Opus 5, Claude Sonnet 5, Claude Haiku 4.5. Codex's: GPT-6 Astra, GPT-5.6
  Sol/Terra/Luna, GPT-5.5, GPT-5.4 Mini, GPT-5.3 Codex Spark — each with a description and
  intelligence/speed rating.
- **`plugins`** — `{kind:'none'|'file-drop'|'cli', scope}`. How Emdash extends the agent (drop a
  file into its plugin dir, or drive its own plugin-install CLI command).
- **`prompt-delivery`** (`prompt` in code) — `{kind:'argv'|'pty-only'|'stdin-pipe'|'none', flag?}`.
  How a prompt is actually delivered to the process (as a CLI argument, only via an interactive
  PTY, or piped to stdin). Determines whether Emdash can run the agent headlessly (ACP or
  argv/stdin) or must always attach a terminal (pty-only).
- **`sessions`** — `{kind:'resumable'|'stateless'}`. Whether the provider's own session id can be
  used to resume a prior conversation. `validateSessionId` behavior per-agent recognizes the
  provider's id shape (e.g. Amp ids start with `T-`, Droid matches a specific pattern, MiMo Code
  starts with `ses`, OpenCode starts with `ses`).
- **`trust`** — `{kind:'none'|'supported'}`. Whether Emdash can pre-authorize ("trust") a workspace
  in the agent's own config so its first-run trust dialog doesn't block a headless launch (e.g.
  Claude: writes `hasTrustDialogAccepted`/`hasCompletedProjectOnboarding` into `.claude.json`
  per-project). Declared by `claude`, `copilot`, `cursor`.

Backend: `packages/core/src/services/agent-plugins/api/plugins/capabilities/{acp,auth,auto-approve,
effort,hooks,mcp,models,plugins,prompt,sessions,trust}.ts`.

### Feature: ACP session transport (structured streaming)

What it is: for ACP-capable agents, Emdash spawns a small Node adapter process (bundled from
`@agentclientprotocol/<agent>-acp`) rather than talking to the raw CLI, and speaks the Agent Client
Protocol over its stdio. This is what makes rich transcript rendering (see chat-ui section)
possible instead of raw terminal text.

What the user can do: nothing directly — this is invisible plumbing — but it's what enables tool
call cards, diffs, thinking blocks, plan lists, permission prompts, model/mode switching, etc.
mid-session (see `IAcpBehavior`: `initialize`, `newSession`, optional `loadSession`, `prompt`,
`cancel`, optional `setSessionConfigOption`, optional `setSessionMode`, optional `closeSession`).

Backend: `packages/core/src/services/agent-plugins/api/plugins/capabilities/acp.ts`
(`IAcpBehavior`, `AcpSpawnContext`, `AcpAgentApi`); per-agent `buildSpawn`/`connect` in
`impl/claude/index.ts`, `impl/codex/index.ts`; adapter bundle descriptors `impl/claude/adapter.ts`,
`impl/codex/adapter.ts`; stdio wiring `helpers/acp-stdio.ts` (`connectStdioAcp`).

### Feature: enrichment of vendor-specific event fields

What it is: an optional `enrich(event, raw)` hook per-agent (only Claude declares one,
`enrichClaudeUpdate` in `impl/claude/acp-transform.ts`) that promotes vendor `_meta` fields (e.g.
Claude's `_meta.claudeCode.parentToolUseId`) into first-class normalized fields such as
`parentToolCallId`, so the generic transcript renderer can show hierarchical tool calls (subagents)
even though only some agents' payloads carry that data in a standard place.

Backend: `EnrichHook` type in `packages/core/src/primitives/acp-transcript/api/normalized-event.ts`;
declared via `acp.enrich` capability.

### Feature: session resumability & provider session-id tracking

What it is: Emdash tracks a provider-native session id per conversation (`providerSessionId`),
separate from its own conversation id, because some agents mint their own ids server-side (grok,
copilot, kimi, codex, droid) while others accept an Emdash-chosen id (Claude's `--session-id`,
OpenCode's `--session`). Codex is resumed with `resume <id>` (or `resume --last` when no id is
known yet); Claude with `--resume <id>`.

What the user can do: implicitly — reopening a conversation resumes the underlying agent process at
its last state instead of starting fresh. If resume fails, Emdash falls back to a new session
(`resumeOutcome: 'replaced-by-new'`), which is user-visible in conversation history — see below.

States: `lastResumeOutcome` on the conversation record is one of `loaded | replaced-by-new |
never-resumed`.

Backend: `sessions` capability; `CommandContext.sessionId` /
`providerSessionId`/`isResuming` (`capabilities/prompt.ts`); `conversation-index` schema
(`lastResumeOutcome`); `conversation-reports` `reportSessionStartedInputSchema`
(`resumeOutcome: 'loaded'|'replaced-by-new'|null`).

### Feature: hook-driven status & session signals per agent

What it is: for agents whose config supports lifecycle hooks, Emdash writes hook commands into the
agent's own config file (JSON for Claude — `settings.json`; TOML for Codex — `config.toml`, plus a
migration path off a legacy `hooks.json`) that POST an event back to a local HTTP port whenever the
agent starts a turn, stops, emits a notification, or starts a session. Each provider has its own
`parseHookEvent` to normalize vendor-specific payloads into one of three canonical shapes:
`{kind:'status', type:'start'|'stop'|'error'|'notification', notificationType?, providerSessionId?}`,
`{kind:'session', providerSessionId}`, or `{kind:'ignore'}`.

Provider-specific quirks discovered in the code (useful for anyone reimplementing without the
hook abstraction):
- Claude's `Notification` hook payload carries no explicit type — Emdash classifies by regex on the
  message text (`/permission|approval/i` → `permission_prompt`, else `idle_prompt`). Every payload
  carries `session_id`, which is adopted live so an in-TUI `/resume` is tracked without a dedicated
  event.
- Codex sends `{type:'agent-turn-complete'}` instead of a plain stop event, and fixed
  `notification_type` values rather than free text; Emdash also cleans up a legacy PowerShell/bash
  notify-hook shape left by older installs.

What the user can do: nothing directly, but this is why agent status badges and idle/permission
notifications work without polling.

Backend: `packages/core/src/services/agent-plugins/api/plugins/capabilities/hooks.ts` /
`hooks-types.ts`; `impl/claude/hooks.ts`, `impl/codex/hooks.ts`; `HOOK_EVENTS`.

### Feature: MCP server management, scoped per agent

What it is: for `mcp`-capable agents, Emdash can read/write/remove MCP server registrations in the
agent's own config (`readServers`/`writeServers`/`removeServer`), scoped globally, over `stdio` or
`http` transport. Claude uses a "passthrough" adapter writing directly into `.claude.json`; Codex
has a dedicated `codexMcpAdapter()`.

What the user can do: implicitly, configure MCP servers that a given agent will have access to; the
composer surfaces the *result* as a read-only popover listing active session MCP servers by name
and transport (see Composer section).

Backend: `capabilities/mcp.ts` (`IMcpBehavior`); `helpers/mcp.ts` (`passthroughMcpAdapter`,
`codexMcpAdapter`).

### Feature: workspace trust pre-authorization

What it is: before launching an agent headlessly (no interactive TUI to click through a first-run
trust dialog), Emdash can write the "yes I trust this folder" flag directly into the agent's config
for the given workspace path, so the first prompt doesn't hang waiting for input that never comes.

Backend: `capabilities/trust.ts` (`ITrustBehavior.trustWorkspace`); `impl/claude/trust.ts`
(`withClaudeTrustedProject`, sets `hasTrustDialogAccepted` + `hasCompletedProjectOnboarding` per
project path in `.claude.json`).

### Feature: authentication status detection & multi-account management

What it is: two layers.

1. **Per-agent auth status check** (`IAgentAuthBehavior.checkStatus`): first checks whether a known
   API-key env var is set (`authenticatedFromEnv`); if not, runs the CLI's own status subcommand
   (e.g. `claude auth status`, `codex login status`) with a 5s timeout and classifies the result as
   `authenticated` (optionally carrying an account/email string parsed from JSON or plain-text
   output), `unauthenticated`, or `unknown`. Claude additionally regex-matches common "not logged
   in" phrasing across stdout/stderr/exception message when the exit code is 1.
2. **Multi-account registry** (desktop-only, `ProviderAccountRegistry` — for external services like
   GitHub/Linear/Jira, not the coding-agent CLIs themselves): supports multiple named accounts per
   provider, each with a secret stored in an encrypted secret store behind an opaque
   `credentialRef` (never in the DB row itself) and optional JSON `meta`. Exactly one account per
   provider can be `isDefault`; removing the default self-heals to the oldest remaining account
   (by `createdAt`, tie-broken by rowid). Full CRUD: `upsertAccount`, `listAccounts`, `getAccount`
   (by id or default), `setDefaultAccount`, `resolveSecret`, `removeAccount`, `removeAllAccounts`,
   `isConfigured`.

What the user can do: sign in via the agent's own CLI flow or paste an API key (see `auth`
capability above); for external provider accounts, add multiple accounts, switch the default,
remove an account (auto-promotes another as default), and see whether a provider has any account
configured at all.

States: `authenticated` (with optional account label), `unauthenticated`, `unknown` (status could
not be determined, e.g. command not found or ambiguous output).

Backend: `capabilities/auth.ts`; `helpers/auth.ts` (`authenticatedFromEnv`, `commandAuthStatus`);
`apps/emdash-desktop/src/main/core/provider-accounts/provider-account-registry.ts`.

### Feature: CLI dependency install / update / uninstall management

What it is: a full lifecycle manager for the *binaries* backing each agent (and other core tools).
Each agent declares `hostDependency`: which binary names to search for, and per-OS
(macos/linux/windows) install options — each option has a `method` (`curl`, homebrew formula/cask,
npm package, PowerShell script), the exact command, an optional recommended flag, and an
`uninstallCommand`; plus a separate `updateCommand` (either `{kind:'self', args}` to invoke the
tool's own self-update, or a full external command).

Detected state per dependency: `available | missing | error`, with `version`, resolved `path` /
`realpath`, `latestVersion` and `updateAvailable` when known, and multiple discovered
**installations** on `PATH` (so a user with two Node-managed copies can choose which one Emdash
uses — `HostDependencySelection`: `{kind:'auto'}` | `{kind:'path', path}` | `{kind:'cli', command}`).

Failure states surfaced to the UI, each with enough detail to render a specific error+retry:
`unknown-dependency`, `missing`, `stale-selection` (a previously-picked path no longer exists),
`invalid-selection`, `no-install-command`, `not-detected-after-install` (installer ran but the
binary still isn't found — includes captured output), `no-update-command`, `installer-missing`
(e.g. Homebrew itself isn't installed), `permission-denied` (with `canRetryWithSudo`,
`elevatedCommand`, `interactiveCommand` — i.e. the UI can offer "retry with sudo"), `command-failed`
(with output + exit code), `io`.

Host elevation is tracked separately (`root | passwordless-sudo | unavailable`) to decide whether a
sudo retry is even offered.

What the user can do: see install status per agent CLI, click Install (runs the recommended, or a
chosen, install method), click Update (self-update or external command), Uninstall, pick which
`PATH` installation to use when more than one is found, retry a failed install with elevated
permissions.

Backend: `packages/core/src/primitives/host-dependencies/api/{capability,types,
format-command-output-tail}.ts`; per-agent declarations e.g. `impl/claude/index.ts`
`hostDependency` block (curl script + Homebrew cask, per-OS), `impl/codex/index.ts` (`npmDependency`
+ Homebrew + PowerShell installer for Windows).

### Feature: agent-process environment sanitization

What it is: when Emdash spawns any agent CLI, it never forwards the app's full environment —
`buildAllowlistedAgentEnv` builds a fresh env from a hand-maintained allowlist of ~130 vars: every
agent-specific API-key/config var this repo knows about (`AGENT_ENV_VARS` — Anthropic, AWS, Azure
OpenAI, Google/Vertex, Groq, Grok/xAI, Kimi, Mistral, OpenAI, OpenCode, OpenRouter, Prime, Qwen,
etc.), a small "global" set (`EDITOR`, `VISUAL`, `GIT_EDITOR`, `HOSTNAME`, `LANG`, `TZ`), a display
set on Linux (`DISPLAY`, `WAYLAND_DISPLAY`, D-Bus, XDG session vars), Windows-only vars
(`TEMP`,`SystemRoot`,`LOCALAPPDATA`, etc.), plus `HOME`/`USER`/`PATH`/`TERM` forced to fixed
sensible defaults (`TERM_PROGRAM: 'emdash'`). Windows env lookups are case-insensitive with a
canonical-name table so duplicate casings arriving over IPC don't produce two different vars.

This is not directly user-facing, but it is a real constraint: **an agent CLI's env var will
silently not reach the spawned process unless it is in this allowlist** (this exact bug bit
`CLAUDE_CODE_OAUTH_TOKEN` for Emdash's own GUI-launched sessions historically, per the project's own
CLAUDE.md notes — instructive precedent for anyone porting this logic).

Backend: `packages/core/src/primitives/agent-env/api/index.ts` (`AGENT_ENV_VARS`,
`buildAllowlistedAgentEnv`, `mergeAgentEnvLayers`).

---

## Session lifecycle & conversation management

### Feature: session idle policy & automatic teardown

What it is: every running agent session (ACP or terminal) is governed by one of four idle policies:
`while-attached` (die `graceMs` after the last UI client detaches), `idle-after` (die after
`outputMs` of no output, optionally gated further by `inputMs`), `until-complete` (never
auto-evicted while busy), or `always` (never auto-evicted). Default for most runtimes is
`idle-after` at 60 minutes. A background sweeper (default interval 60s) periodically judges each
tracked key's `{running, busy}` state via a per-runtime `snapshot` callback and deactivates ones
that qualify.

Tracked per-session activity: `lastInputAt`, `lastOutputAt` (throttled to at most one timestamp per
30s), `attachedClients` (count of UI views currently watching), `detachedAt`.

What the user can do: nothing directly configurable in the UI from what's visible here — this is a
resource-management background feature — but it explains two visible behaviors: (1) a
long-idle session's process quietly goes away and gets respawned/resumed on next open, and (2) a
session that's mid-turn is never killed out from under the user even if idle-timed.

States: for a "conversation" (as opposed to a bare terminal), suspend vs. full evict are distinct:
**end/suspend** keeps resources and persists a `suspended` intent for later resume; **evict** tears
down every resource (`evictSteps`, errors isolated and logged per-step, never throws), drops
tracking, and persists (by default) a `'suspend'` disposition intent — i.e. most evictions are
still resumable, not destroyed.

Backend: `packages/core/src/services/session-lifecycle/{api,node}/*.ts`
(`SessionLifecycle`, `ConversationSessionLifecycle`, `IdlePolicyConfig`, `SESSION_IDLE_MS =
3,600,000`, `ACTIVITY_OUTPUT_THROTTLE_MS = 30,000`).

### Feature: session intents — persisted resume state

What it is: a durable record per conversation of whether its backing process should be considered
`active` or `suspended`, an opaque JSON `payload` (runtime-specific resume parameters), and the
provider `sessionId` if known, keyed by scope (`acp` or `tui-agents`). This is what survives an app
restart and lets Emdash reconcile — on startup, walk all persisted intents and either resume each
one (respecting a `precheck`/`gate` that can veto or defer) or mark it suspended with a reason.

What the user can do: nothing directly — but this is why closing and reopening the app can bring
conversations back to a running state automatically rather than cold.

Backend: `packages/core/src/services/session-intents/api/schemas.ts` (`SessionIntent`,
`SessionIntentScope`, `SessionIntentStatus`); `SessionLifecycleOptions.conversation.reconcile`
(`ReconcileOptions`: `precheck`, `parse`, `gate`, `resume`).

### Feature: ACP session launch / TUI session start contracts

What it is: two distinct "start a session" entry points with their own typed input/output/error
contracts:
- **ACP launch** (`acpSessionLaunchContract.launch`): `{conversationId, providerId, cwd,
  sessionId: null, model, modeId?, initialQueue: [{text, hiddenContext?}, ...]}` → `{sessionId}`. The
  initial queue supports queuing more than one prompt before the session is even up (e.g. a batch
  of pasted messages) and a `hiddenContext` string per queued prompt (context not shown in the
  transcript but sent to the model — likely used for things like "resume with this system note").
- **TUI start** (`tuiSessionStartContract.start`): `{conversationId, providerId, cwd, sessionId:
  null, model, initialPrompt, autoApprove, cols, rows}` → `{outcome: 'started'|'attached'}` — i.e.
  starting a TUI session can either spawn a brand new PTY or attach to one that's already running
  (dedupes double-starts), and it always carries the current terminal geometry.

Shared error shape across both: `{type, message?}` (a `SessionStartError`).

Backend: `packages/core/src/services/session-start/api/{contract,schemas}.ts`.

### Feature: conversation index (the conversation list's backing record)

What it is: one durable record per conversation: `conversationId`, `provider`, `type` (`pty`|`acp`),
`cwd`, `workspacePath`, `idRegime` (`emdash-chosen`|`provider-minted`|`none` — whether Emdash or the
provider owns the session-id namespace), `createdAt`, `title`, an opaque provider-specific `config`
blob, `providerSessionId` + `providerSessionIdObservedAt`, `lastSessionActivityAt`,
`lastSpawnedAt`, `lastResumeOutcome` (`loaded`|`replaced-by-new`|`never-resumed`), `updatedAt`.
Creation enforces that certain fields are immutable once set (`immutable-field-mismatch` error
names exactly which fields conflicted).

What the user can do: this is the row that backs the conversation/session list UI (title, which
folder it's in, which agent, when it was last active).

Backend: `packages/core/src/services/conversation-index/api/{contract,schemas}.ts`.

### Feature: conversation lifecycle reporting (feeds status + index)

What it is: four report types a running session pushes upstream: `sessionStarted`
(`providerSessionId`, `resumeOutcome`), `providerSessionId` (mid-session rebind, e.g. a late hook
capture or an in-TUI `/resume` to a different session), `sessionActivity` (heartbeat), `sessionEnded`.
Each can fail with `conversation-not-found`.

Backend: `packages/core/src/services/conversation-reports/api/{contract?,schemas}.ts`.

### Feature: agent status derivation & the unread/"seen" badge

What it is: a single 5-state status machine per conversation, persisted and broadcast live:
**`idle` | `working` | `awaiting-input` | `completed` | `error`**. Derived by
`deriveAgentStatus` from raw signals:
- `type: 'start'` → `working`
- `type: 'stop'` → `completed`
- `type: 'error'` → `error`
- `type: 'notification'` with an "attention" notification type (permission prompt or idle prompt)
  → `awaiting-input`
- anything else → no status change (context-only signal)

A separate boolean, `agentStatusSeen`, tracks whether the user has looked at this conversation since
its status last changed — set to unseen (`0`) automatically whenever status flips to `working`,
unless the caller explicitly `preserveSeen`s it (used for a startup/cache replay so a bootstrap pass
doesn't spam "unread" badges for things the user already saw before restart). This is exactly the
data behind a per-conversation notification dot / unread badge in a project/task list.

For ACP sessions specifically, status is *projected* live from the session summary rather than
purely from hook events: `pendingPermissionCount > 0` → `awaiting-input` (permission_prompt)
regardless of busy state; else `isGenerating` → `working`; else settled by `lastTurnErrored` →
`error`, `lastStopReason === 'cancelled'` → reset to idle, else any other non-null stop reason →
`completed`. On session close, status is force-reset to idle. Two variants of "apply" exist: a live
`applySignal` (delivers a hook event onward for anything listening) and a `cacheSignal` (records the
state without delivering, and without touching the seen flag — used to seed status on bootstrap
without generating a burst of notifications).

What the user can do: see, per conversation, whether the agent is working / needs their attention /
finished / errored / idle, and whether they've already looked at the latest change (unread marker).

Backend: `apps/emdash-desktop/src/main/core/agent-status/agent-status-service.ts`
(`AgentStatusService`, `deriveAgentStatus`); ACP-specific projection in
`apps/emdash-desktop/src/main/core/acp/agent-status-transition.ts`
(`projectAcpStatusSnapshot`, `deriveAcpAgentStatusActions`); bridge wiring in
`apps/emdash-desktop/src/main/core/acp/agent-status-bridge.ts` (`AcpAgentStatusBridge` — subscribes
to the live ACP session-list stream per host, diffs summaries, and fans out status/title actions);
UI glyph component `packages/ui/src/react/components/agent-status/agent-status.tsx`
(`AgentStatus`, `AgentStatusKind`).

### Feature: live conversation auto-titling from the agent

What it is: for ACP sessions, whenever the agent-reported `SessionSummary.title` changes (and
differs from the previously seen title), Emdash automatically renames the conversation to match —
i.e. the conversation's display title can be driven live by the agent itself (e.g. Claude Code
naming the session based on the task), not just by what the user typed as their first message.

Backend: `apps/emdash-desktop/src/main/core/acp/session-title-action.ts`
(`deriveAcpSessionTitleAction`), invoked from `agent-status-bridge.ts` → `renameConversation`.

### Feature: normalized transcript event vocabulary (the ACP → UI event bus)

What it is: the single, transport-agnostic set of event kinds any ACP-driven agent's stream gets
normalized into before reaching the chat UI (see chat-ui section for how each renders). This is the
integration surface a rebuilt UI must consume:

`message` (role user/assistant, text, optional attachments, optional `promptId`), `thinking`
(reasoning text), `tool_call` (id, title, `toolKind`, status, `parentToolCallId` for nesting,
`diffs[]`, `locations[]`, `inputSummary`, `outputText`, `terminalId`), `subagent` (start/update,
name, status, `background`, `agentId`, `outputFile`), `subagent_update`, `search` (query,
`matchCount`), `mcp_tool` (server, tool), `web_fetch` (url, title), `tool_update` (a partial patch
onto a prior tool_call — diffs/locations arrays present only when the field actually changed, an
empty array explicitly *clears* prior diffs/locations), `plan` (entries with
`content/status/priority`), `config` (session config options), `mode_selected` (permission/session
mode changed), `commands` (available slash commands changed), `usage` (`contextSize`,
`contextUsed`, `cost: {amount, currency} | null`), `title` (session title changed), `ignored`.

`NormalizedToolStatus` = `pending | in_progress | completed | failed`.

Backend: `packages/core/src/primitives/acp-transcript/api/normalized-event.ts`
(`NormalizedEvent`, `SessionUsage`, `PlanEntryInput`, `NormalizedDiff`, `NormalizedToolLocation`,
`AttachmentRef` — image mime types `image/png|jpeg|gif|webp`).

### Feature: host / runtime availability states

What it is: every backend "runtime" (git, file search, files, acp, automations, conversations,
tui-agents, agent-config, terminals, workspace-registry, resource-usage, host-dependencies,
host-settings, scripts — the full catalog in `runtime-broker/api/contract.ts`
`hostRuntimesDefinitions`) can fail to resolve for a structured reason: `host-unavailable` (with a
sub-`reason`: `offline | connection-failed | daemon-start-failed | artifact-download-failed |
install-failed | unsupported-platform | protocol-upgrade-client | protocol-upgrade-server |
runtime-unavailable`), `not-configured`, or `host-identity-lost`.

What the user can do: this is the error taxonomy behind "why can't I see my conversations right
now" — a rebuilt UI should render distinct messaging for e.g. "this machine is offline" vs. "the
daemon failed to start" vs. "you need to reconnect this host's identity" rather than one generic
error toast.

Backend: `packages/core/src/primitives/runtime-resolution/api/errors.ts`.

---

## Chat transcript data model

The exact set of row "kinds" a transcript can contain (`packages/chat-ui/src/model.ts`). A rebuilt
UI's renderer needs a case for each:

- **`message`** — `{role: user|assistant|thought, text (markdown), streaming?, attachments?:
  ChatImageAttachment[]}`. Image attachments carry an `id`, `name`, and optional `dataUrl` (absent
  when content couldn't be resolved on reload — renders a fallback tile).
- **`tool`** (`ChatToolCall`) — generic fallback for any ACP tool kind without a dedicated
  renderer (search, fetch, think, other): `name`, `status`, `awaitingPermission?`, `error?`,
  `inputSummary?`, `parentId?` (for nesting).
- **`subagent`** (`ChatSubagentToolCall`) — `name`, `status`, `phase: spawning|running|completed|
  failed`, `agentId?`, `background?`, `error?`.
- **`thinking`** (`ChatThinking`) — `status: thinking|done`, `text`, `startedAt`, `durationMs?`.
  Adjacent thinking segments are grouped presentation-only into a `thinking-group` synthetic item
  by the flattening pass, without losing per-segment protocol data.
- **`file-op`** (`ChatFileOpToolCall`) — `op: read|edit|delete|move`, `ops: {path, line?}[]`
  (accumulating, replaced wholesale per update, not appended).
- **`execute`** (`ChatExecute`) — `command`, `inputSummary?`, `outputLines?` (identity-stable
  array mutated in place for live terminal output, so consumers must watch `outputVersion` rather
  than array identity), `outputTruncated?`, `startedAt`, `durationMs?`, `terminalId?`.
- **`diff`** (`ChatDiff`) — one per changed file per tool call, id = `${toolCallId}:${path}`,
  `oldText: string|null` (`null` = new file, all lines are additions), `newText`.
- **`resource-link`** (`ChatResourceLink`) — `uri`, `name`, `title?`, `description?`, `mimeType?`,
  `size?`, and a pre-resolved `target`: `{kind:'workspace-file', path}` | `{kind:'external', url}`
  | `{kind:'opaque'}`.
- **`plan`** (`ChatPlan`) — `entries: {content, status, priority}[]`, `streaming?` (entries still
  being appended).
- Synthetic filler kinds: **`working`** (a generic "Working…" row when nothing else applies) and
  **`turn-outcome`** (`outcome: TranscriptTurnOutcome` — cancelled/error/interrupted/done, plus an
  optional reason string).

Every tool-family item shares: a `status` (`ToolStatus`, imported from the runtime), an
`awaitingPermission` flag, an optional `error` string (shown as an error-icon tooltip), and a
`parentId` for hierarchical (subagent) nesting.

Backend: `packages/chat-ui/src/model.ts`; underlying protocol types re-exported from
`@emdash/core/runtimes/acp/api/client` (`TranscriptItem`, `TranscriptMessage`, `TranscriptThinking`,
`TranscriptTurn`, `TranscriptTurnOutcome`, `ToolStatus`, `ToolNode`, `PlanState`,
`AcpPermissionRequest`).

---

## Chat transcript rendering engine

**Architecturally notable**: the transcript renderer (`packages/chat-ui`) is a custom SolidJS
engine (fine-grained reactive `class=`, `Show`, `For`, signals) embedded inside an otherwise React
app, with its own virtualizer, row-height measurement/estimation system, and CSS-var-driven height
animation ("tween") for expand/collapse — not a generic markdown-in-a-scrolling-div renderer. It
distinguishes an *estimate* pass (cheap, used for initial virtualization) from a *measure* pass
(exact, used once a row is actually laid out) per row kind (`defineUnit({kind, margin, vars,
estimate, measure, Render})`). Rebuilding this exactly is likely not worth it in a new stack, but
every visible behavior below must be preserved somehow.

### Feature: virtualized, auto-growing transcript scroll region

What it is: the whole message list is rendered through a custom `Virtualizer`, not a plain scrolling
DOM list — necessary because rows can be arbitrarily tall (a long diff, an expanded thinking block)
and can change height live while streaming.

What the user can do: scroll a transcript with thousands of items smoothly; the composer sits in a
sticky "slot" whose measured height is fed back into the virtualizer's bottom padding automatically
(`padBottom` driven by a `ResizeObserver` on the composer slot when `composer==='slot'`); an
optional absolutely-positioned "content overlay" slot (z-index 15, above transcript, below composer)
lets the host portal in loading/empty/disabled states.

Commands (with default keybindings): **scroll to top** (`Mod+ArrowUp`), **scroll to bottom**
(`Mod+ArrowDown`); also imperative `scrollToItem(id, {align:'start'|'center'|'end', offset, behavior})`
and `loadOlder(turns)` (infinite-scroll-up pagination), plus an `onReachStart` callback fired when
the user scrolls near the top and history is exhausted.

States/callbacks: `onAtBottomChange` (sticky-to-bottom state), `onActiveUserMessageVisibilityChange`
(whether the latest user message is at least partly in view — distinct from generic "at bottom",
meant to gate a smarter "jump to latest" affordance).

Backend: `packages/chat-ui/src/ChatRoot.tsx` (`EngineControls`, `ChatRootProps`),
`packages/chat-ui/src/commands.ts` (`CHAT_VIEW_COMMANDS`), `packages/chat-ui/src/core/virtualizer.ts`,
`core/stick-to-bottom.ts`.

### Feature: composer placement — centered (empty state) vs. docked bottom

What it is: the composer can render in two placements — `'center'` (used for an empty/new
conversation hero layout) and `'bottom'` (docked, the normal in-conversation position) — and
`setComposerPlacement(placement, {animate})` performs a measured FLIP-style animated transition
between the two (skipped under `prefers-reduced-motion`).

Backend: `ChatRoot.tsx` (`ComposerPlacement`, `resolveComposerPlacement`,
`setComposerPlacement`).

### Feature: pin the active user message while scrolling its response

What it is: when `pinUserMessages` is enabled, the user message that started the currently-viewed
turn is duplicated as a non-virtualized, blurred, sticky header strip above the scroll region (with
a bottom fade signaling more content scrolls beneath it), sharing the same expand/collapse state as
the inline copy so clicking either keeps them in sync.

Backend: `packages/chat-ui/src/components/rows/message/PinnedUserMessage.tsx`.

### Feature: user message card — collapse, attachments, inline stop

What it is: a user's message renders as a card that:
- Shows an image-attachment thumbnail strip above the text; clicking a thumbnail invokes
  `onViewImage`; a broken/unresolvable attachment shows an "image off" placeholder tile instead of
  failing silently. Attachments without inline bytes are resolved lazily via
  `commands.resolveAttachment`.
- Auto-clamps to a max height when the content is long, with a bottom fade overlay and a pointer
  cursor signaling "click to expand"; expand/collapse animates the card height and pins the border
  correctly mid-tween (`clipTrackedHeight`) instead of letting the browser's overflow clip cut off
  rounded corners.
- Shows a floating **Stop generating** button overlaid on the card *only* when this specific message
  is the one currently driving generation (`turn.currentMessageId() === this message` AND
  `turn.turnStatus() === 'generating'`) — i.e. stop is scoped per-turn, not global.
- Carries a screen-reader-only plain-text mirror of the rendered markdown for accessibility.

Backend: `packages/chat-ui/src/components/rows/message/UserMessageCard.tsx`.

### Feature: generic tool call row

What it is: the fallback single-line renderer for any ACP tool kind without a dedicated card:
name + `inputSummary`, a shimmer animation while `status==='running'`, an error icon with the
failure message in its title/tooltip, or a shield-alert icon when `awaitingPermission`.

Backend: `packages/chat-ui/src/components/rows/tools/tool/Tool.tsx`, `tool.def.tsx`
(`toolFromItem` — derives the row's display name/summary per underlying ACP kind: read/search/mcp/
web-fetch/spawn-subagent/unknown/tool-group).

### Feature: hierarchical tool grouping (subagents nest their own tool calls)

What it is: any tool call with children (most notably a subagent's own tool activity) renders as one
collapsible composite row instead of a flat list — a `CollapseHeader` (or, for a subagent parent,
the richer `SubagentHeader`) with a recursively-rendered child stack shown only when expanded.
Collapsed, it's a single header line regardless of children's individual statuses; while running,
only the header label shimmers (children don't visually spam the collapsed view). Nesting is
arbitrary depth (`ToolGroupRender` recurses into `ChildItem` for any child that itself has
children). Only tool-family kinds are valid children: `tool`, `subagent`, `execute`, `diff`,
`file-op`.

Backend: `packages/chat-ui/src/components/rows/tools/tool-group/tool-group.def.tsx`.

### Feature: subagent card

What it is: a header showing an animated braille spinner (`⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏`, 80ms/frame) while
`phase` is `spawning`/`running`, a solid dot (success/fail colored) once `completed`/`failed`; the
subagent's name (suffixed "(background)" when `background:true`), shimmering while running; and,
when used as a collapsible group header, a status row + chevron the user can click to
expand/collapse its child tool calls.

Backend: `packages/chat-ui/src/components/rows/tools/subagent/Subagent.tsx`.

### Feature: diff card (file edit preview)

What it is: a header (file-type icon resolved from the filename, click anywhere on the header to
`onOpenFile`, filename shimmering while running, `+N`/`−N` add/delete counts once a body exists and
there are actual changes, error/awaiting-permission icon) over a syntax-highlighted unified diff
body (added/removed/context lines), capped to a preview window (12 lines with ±1 context per the
model's doc comment) — highlighting runs via an idle-scheduled callback so it never blocks a
streaming update, and is skipped entirely while `status==='running'` (painted once on settle).

Backend: `packages/chat-ui/src/components/rows/tools/diff/Diff.tsx`, `diff.def.tsx`.

### Feature: execute card (shell command + live output)

What it is: a collapsible card — header shows the provider's `inputSummary` or the first command
line; body (hidden until expanded, in every status) shows the bash-syntax-highlighted command
followed by output lines, clamped to `expandedMaxLines` with scroll overflow, auto-scrolled to the
newest line while output is still streaming, with a bottom fade overlay signaling truncated content
when collapsed-but-overflowing. Highlighting is idle-scheduled and cache-checked (`peekHighlight`)
before falling back to an async highlight pass. `outputTruncated` (upstream ring-buffer or client
byte-cap drop) collapses to one generic "truncated" UI regardless of which side truncated it.

Backend: `packages/chat-ui/src/components/rows/tools/execute/Execute.tsx`, `execute.def.tsx`.

### Feature: file operation card (read/edit/delete/move)

What it is: single-file ops render inline (`Read foo.tsx`, clickable → opens the file at an
optional line number); multi-file ops collapse to a header ("Read 2 files ›") that expands to a
per-file list, each row independently clickable to open that file. A streaming preview variant
inside a running tool call's window auto-scrolls to the newest file as the list grows. Verb map:
`read→Read, edit→Edited, delete→Deleted, move→Moved`.

Backend: `packages/chat-ui/src/components/rows/tools/file-op/FileOperation.tsx`, `file-op.def.tsx`.

### Feature: thinking / reasoning card

What it is: while `status==='thinking'`, shows a live-updating "Thinking Ns" header (a 1s interval
timer) and a fixed-height streaming preview window with a fade at the top and auto-scroll to the
newest text; once settled, collapses to "Thought briefly" (<1s) or "Thought for Ns" and can be
clicked to expand the full reasoning text (rendered as markdown, headings flattened out so they
don't visually compete with the transcript's own heading levels).

Backend: `packages/chat-ui/src/components/rows/thinking/thinking.def.tsx`.

### Feature: plan / todo-list card

What it is: a checklist of the agent's declared plan entries, each with a status glyph (pending =
hollow circle, in_progress = half-filled, completed = check) colored accordingly, dimmed at reduced
opacity for `low` priority entries, and markdown-rendered content per entry (so a plan step can
itself contain inline code, links, etc.). The whole card shimmers/auto-scrolls while `streaming`
(new entries still being appended) and this "streaming" flag clears on turn completion.

Backend: `packages/chat-ui/src/components/rows/plan/Plan.tsx`, `plan.def.tsx`.

### Feature: resource link card (ACP `resource_link` content blocks)

What it is: a compact single-line card — file-type icon (or a generic resource glyph for
non-file mimetypes), title (or name), a secondary line (workspace path / external URL's hostname /
opaque URI scheme prefix), and a formatted size (`B`/`KB`/`MB`) when known. Clicking a
`workspace-file` target opens it in the editor; an `external` target opens in a new browser tab;
an `opaque` target (an MCP server's own custom URI scheme Emdash can't resolve) is inert but still
shows the URI so the user can read/copy it.

Backend: `packages/chat-ui/src/components/rows/resource-link/ResourceLink.tsx`.

### Feature: turn outcome / filler rows

What it is: two small synthetic rows the flattening pass inserts: a generic **"Working…"** filler
(shown when there's activity with nothing more specific to render yet) and a **turn outcome**
line — "Turn cancelled/failed/interrupted/completed (reason)" — colored red for `error`, muted
otherwise.

Backend: `working.def.tsx`, `turn-outcome.def.tsx`.

### Feature: markdown rendering inside every text row

What it is: shared markdown block engine across message/thinking/plan text: headings, paragraphs,
lists, tables, blockquotes, horizontal rules, inline code and fenced code blocks
(Shiki-highlighted, language auto-detected from the fence), Mermaid fenced blocks rendered as an
inline SVG preview with a hover-revealed **expand** button (keyboard-activatable) that opens a
pan/zoom dialog, GFM tables, and markdown links.

There is a second, simpler React-based markdown renderer for non-transcript surfaces
(`packages/ui/src/react/components/markdown/markdown.tsx`) supporting: GFM (`remark-gfm`), math via
KaTeX (`remark-math`/`rehype-katex`, with LaTeX delimiter normalization), Mermaid via the same
expand-to-dialog `MermaidBlock`, Shiki code highlighting, sanitized raw-HTML passthrough
(`rehype-sanitize` with a custom schema, only in the `full` variant), expandable images (click to
zoom; local/relative image paths resolved async via a host-supplied `resolveImage` callback that
returns a `data:` URI or `null` → renders "[Image not found]"), and link click interception
(`onOpenLink(href)` — return true to claim the click and suppress default `target="_blank"`
navigation, e.g. to route workspace-relative links through the editor instead of the browser).

Backend: `packages/chat-ui/src/components/rows/markdown/**`; standalone renderer
`packages/ui/src/react/components/markdown/{markdown.tsx,mermaid-block.tsx,mermaid.ts,
sanitize-schema.ts,markdown-latex.ts,highlight.ts}`.

### Feature: Mermaid diagram pan/zoom viewer dialog

What it is: a modal dialog that renders pre-generated Mermaid SVG markup full-size with pan/zoom
(via the shared `ZoomViewerDialog`), or a "Couldn't render diagram" message when rendering failed.

Backend: `packages/ui/src/react/components/mermaid-viewer/index.tsx` (`MermaidViewerDialog`).

### Feature: copy-to-clipboard affordance

What it is: a shared copy button in two variants — `inline` (text label + icon, revealed on
hover over its parent group, used e.g. on a message footer) and `overlay` (icon-only, absolute
positioned top-right of a code block) — both swap to a checkmark + "Copied" label briefly after a
successful copy.

Backend: `packages/chat-ui/src/components/primitives/CopyButton.tsx`,
`components/primitives/use-clipboard.ts` (`createClipboard`).

### Feature: agent status glyph (small inline indicator)

What it is: a small SVG status glyph matching the 5-state agent status vocabulary above:
`working` (animated 3×3 dot grid pulse), `awaiting-input` (rotated square/diamond outline),
`completed` (circle outline), `error` (square outline + filled dot), `idle` (renders nothing at
all — i.e. idle is only ever the *absence* of the indicator, not a distinct visual). Optional
tooltip wrapper naming the status ("Agent is working", "Agent is awaiting input", "Agent error",
"Agent completed").

Backend: `packages/ui/src/react/components/agent-status/agent-status.tsx`,
`braille-spinner.tsx` (the animated spinner glyph, shared with the subagent card).

---

## Composer (message input) surface

`packages/ui/src/react/components/chat-composer/index.tsx` — a large, fully host-agnostic React
component (~1,200 lines) that every one of the capability-driven selectors below is conditionally
rendered from, based on what props the host supplies (so the composer's own shape changes per
selected agent's declared capabilities from the plugin system above).

### Feature: agent selector

What it is: before a conversation has any history, a searchable combobox (grouped by an optional
`groupLabel`, e.g. "Installed" / "Not installed") listing every configured agent, each with an icon,
name, optional description, and a `disabled` state (e.g. not installed). Once the conversation has
history (`agentLocked`), the selector collapses to a static disabled icon button (ACP sessions can't
switch agents mid-conversation) with a tooltip explaining why.

Backend/props: `ComposerAgentOption`, `agentOptions`, `selectedAgent`, `onAgentChange`,
`agentLocked`.

### Feature: model selector, with a rich hover-detail card

What it is: a searchable combobox of models; each row shows the name, and hovering/selecting reveals
a detail card with the description and three feature rows: **Context** (formatted as e.g. "200K
tokens" / "1M tokens"), **Speed** and **Intelligence** each rendered as a 5-segment bar meter
(`●●●○○`). If the agent also declares `effort`, a footer row inside the same popover ("Effort:
Default ›") opens a nested radio-group submenu to pick a reasoning effort level without leaving the
model picker.

Backend/props: `ComposerModelOption`, `modelOptions`, `selectedModel`, `onModelChange`,
`ComposerEffortOption`, `effortOptions`, `selectedEffort`, `onEffortChange`.

### Feature: permission mode & collaboration mode selectors

What it is: two independent single-select dropdowns (rendered only when the host supplies options)
— **permission mode** (e.g. auto-approve level) with a shield icon, and **collaboration mode** (e.g.
"Plan" vs. default, per the code comment mentioning "Codex Default / Plan") with a checklist icon.
Each item can show a name + description.

Backend/props: `ComposerPermissionModeOption`/`permissionModeOptions`/`selectedPermissionMode`/
`onPermissionModeChange`; `ComposerCollaborationModeOption`/`collaborationModeOptions`/
`selectedCollaborationMode`/`onCollaborationModeChange`.

### Feature: session MCP servers indicator

What it is: a small pill button showing the count of active MCP servers for this session; clicking
it opens a popover listing each server's name and transport (`stdio`/`http`).

Backend/props: `ComposerMcpServer` (`name`, `transport`), `mcpServers`.

### Feature: context-window usage indicator

What it is: a small SVG donut in the toolbar (empty when no usage data), filled proportionally to
`used/size`, switching to a warning color at ≥90% full. Clicking opens a popover with the exact
percentage, a `used / size Tokens` readout (formatted `k`/`M`), a linear progress bar (same 90%
warning threshold), and — when available — a formatted cost line (`Intl.NumberFormat` currency
formatting per `cost.currency`, with a plain fallback if the currency code is invalid).

Backend/props: `ContextUsage {used, size, cost?}`, `contextUsage`.

### Feature: attachments (image drag/drop, paste, preview strip)

What it is: image files can be dropped or pasted directly into the composer; each becomes a
thumbnail in a strip above the input with a click-to-view action (host-hookable via `onViewImage`)
and a remove (×) button. Non-image file drops are forwarded via `onFilesDropped` for the host to
resolve to real paths and insert as mentions instead. A default handler reads dropped images into
`data:` URL attachments client-side; hosts can override with `onImageFilesDropped` to own the
upload path themselves. An explicit "add attachment" paperclip button is also available via
`onAttach`.

Backend/props: `ComposerAttachment {id, name, path?, kind: image|file, previewUrl?, mimeType?}`,
`attachments`, `onAttachmentsChange`, `onImageFilesDropped`, `onFilesDropped`, `onAttach`,
`onViewImage`.

### Feature: send / stop / queue button (context-sensitive)

What it is: one round icon button in three states — **Send** (arrow-up, enabled once `canSubmit`
and not disabled), **Stop generation** (destructive-red, shown while `isWorking` and the host can't
queue), or, when the host *can* queue mid-generation, the same Send-shaped button instead submits
into the queue (aria-label flips to "Queue message"). `showSubmitButton=false` hides the control
entirely for draft-only composer instances.

Backend/props: `isWorking`, `canSubmit`, `showSubmitButton`, `onSubmit`, `onSubmitWhileWorking`,
`onStop`.

### Feature: notice band (session-state banners)

What it is: a dismissible banner flush above the input for session-level notices, three tones
(`error`/`warning`/`info`), each with an icon, optional title, message, and optional dismiss (×)
button. Height/opacity animate in and out on add/remove. A built-in helper `stopReasonNotice(reason)`
maps ACP stop reasons to ready-made notices: `max_turn_requests` → "Turn limit reached", `max_tokens`
→ "Response truncated", `refusal` → "Request refused" (other reasons like `end_turn`/`cancelled`
produce no notice).

Backend/props: `ComposerNotice {variant, title?, message, onDismiss?}`, `notice`,
`stopReasonNotice()`.

### Feature: permission request band (ACP tool-call approval)

What it is: when the agent needs the user to approve/deny a tool action, the notice band is
replaced by a permission band: a shield-alert icon, "Allow {title}" label (title is a
pre-formatted verb like "Read a File"/"Execute"), a "(1 of N)" counter when multiple permission
requests are queued, and a split-button whose options come directly from the ACP permission
options (`allow_*` → accepted/green tone, `reject_*` → rejected/red tone, anything else → neutral)
— the default pre-selected option prefers `allow_once`, then any `allow_*`, then the first option.
The split button's dropdown lets the user pick a *different* option than the default before
confirming (e.g. "Allow always" vs. "Allow once"). Selection resets to the default whenever a new
request (`requestId` changes) arrives, not on every options-array change.

Backend/props: `ComposerPermissionOption {optionId, name, kind}`, `ComposerPermissionRequest
{requestId, title, options}`, `permissionRequest`, `permissionQueueCount`, `onResolvePermission`.

### Feature: queued prompts band (send-while-busy queue)

What it is: prompts the user submits while the agent is already generating are held in a visible,
numbered, reorderable queue above the composer rather than lost or silently appended:
- **Reorder**: drag-and-drop via a grip handle on each row (native HTML5 DnD), reindexing the whole
  list on drop.
- **Edit inline**: click the prompt text to turn it into a multi-line textarea in place; Enter saves
  (Shift+Enter for a newline), Escape cancels, a checkmark/× pair also confirms/cancels; saving a
  blank edit is blocked (disabled Save).
- **Delete**: trash icon per row.
- **Send now**: an up-arrow per row that jumps the queue and sends that prompt immediately
  ("Send now — cancels the active turn", per its tooltip — i.e. this interrupts the in-flight turn).
- An image-only queued prompt (no text) shows placeholder label "Image-only prompt".
- The band visually "connects" to the permission band below it when both are showing at once
  (`connectToBandBelow`).

Backend/props: `ComposerQueuedPrompt {id, text}`, `queuedPrompts`, `onEditQueuedPrompt`,
`onDeleteQueuedPrompt`, `onReorderQueuedPrompts`, `onSendQueuedPromptNow`.

---

## Prompt editor (rich text input)

`packages/ui/src/react/components/prompt-editor/` — a TipTap (ProseMirror) rich-text editor, not a
plain `<textarea>`.

### Feature: @ mentions (files, issues, symbols, custom)

What it is: typing `@` opens a suggestion popup (provider-driven — see below) and inserting a
suggestion produces an **atomic inline pill node**, not plain text, carrying `{id, label, name,
kind}`. `kind` is one of `file | issue | symbol | custom`, each with its own icon rendering in both
the popup and (via a host-supplied `renderMentionIcon`) the inline pill. A mention can instead be a
raw-text insert (`insertText` set) when the host wants literal text rather than a chip (e.g. for
non-referential suggestions). Mentions serialize to plain text as `@label` (or `@"label"` when the
label contains spaces/special characters), or an exact `serializedText` override when the host needs
a specific token preserved (e.g. restoring a controlled value). Programmatic API on the editor ref:
`insertMention`, `prependMention` (ensure-at-start, replacing duplicates), `removeMention(id)`,
`setMentionPending(id, pending)` (shows a pending/resolving visual state on the pill without
touching serialization).

What the user can do: type `@` and search across a host-provided source (typed `ContextMentionProvider
.search(query)`, or a legacy `queryMentions(query)` callback) to insert file/issue/symbol
references as clickable pills; click a resolved mention pill in the transcript to trigger
`onClickMention`.

Backend: `prompt-editor/extensions/mention.ts`, `mention-pill.tsx`, `mention-pill-helpers.ts`,
`serialize.ts` (`serializeMentionLabel`), `types.ts` (`MentionItem`, `MentionKind`,
`ContextMentionProvider`, `RenderMentionIcon`).

### Feature: / slash commands

What it is: typing `/` opens a command suggestion popup (host-driven via `queryCommands(query)`)
built on the same TipTap mention-suggestion infrastructure under a different trigger char and node
name (`slashCommand`). Each `CommandItem` has one of three behaviors on selection: **`insert`**
(inserts an atomic `/name` pill node, then a trailing space, same as a mention chip), **`insert-text`**
(deletes the trigger range and inserts the item's raw text as literal editor content, split into
paragraphs on newlines), or **`execute`** (deletes the trigger range with *no* text/node insertion
and calls `onCommand(item)` — i.e. this is how a slash command can trigger a side effect, like
opening a settings panel, rather than inserting anything into the prompt). Items can carry an
optional `section` for visual grouping in the popup.

Backend: `prompt-editor/extensions/slash-command.ts`, `slash-command-pill.tsx`, `types.ts`
(`CommandItem`, `CommandBehavior`).

### Feature: submit keybindings & multi-line editing

What it is: a configurable submit shortcut — `'enter'` (Enter submits, default), `'mod-enter'`
(Cmd/Ctrl+Enter submits, plain Enter makes a newline), or `'none'` (no keyboard submit). Whichever
shortcut is *not* configured falls through to the editor's normal newline behavior. Shift+Enter
always inserts a hard line break regardless of the configured shortcut, in every mode. The
suggestion-popup plugins (mentions/commands) intercept Enter first when a popup is open, so the
submit shortcut only fires when no popup is showing.

Backend: `prompt-editor/extensions/submit-keymap.ts` (`buildSubmitKeymap`,
`PromptSubmitShortcut`).

### Feature: prompt editor imperative API

What it is: a ref handle exposing `focus()`, `clear()`, `getText()` (serialized plain text),
`getSelection()` (`{from, to}` offsets into that plain text), `getPositionAtCoordinates({left,
top})` (hit-test viewport coordinates to a text offset — used for cursor-position-aware
interactions like inserting a mention where the user clicked), `setText(text)`.

Also configurable: `clearOnSubmit` (default true), `allowEmptySubmit` (default false — an
empty-document submit is a no-op unless explicitly allowed, e.g. for an image-only send).

Backend: `prompt-editor/types.ts` (`PromptEditorRef`, `PromptEditorProps`).
