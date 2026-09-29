# AI agents in cmux

cmux is built around running AI coding-agent CLIs (Claude Code, Codex, Grok, OpenCode, Pi, OMP, Campfire, Amp, Cursor CLI, Gemini, Kiro, Rovo Dev, Copilot, CodeBuddy, Factory, Qoder, Kimi Code, Antigravity, Hermes Agent) inside its terminals and giving the user a layer on top: hook-driven status tracking, an approvals inbox (Feed), session restore across app relaunch, a session history/checkpoint browser (Vault), agent hibernation to save RAM, workspace/tab auto-naming, "fork a conversation," multi-agent team orchestration (Claude Code Teams / oh-my-* integrations), and cmux-authored Skills that teach any agent to drive cmux itself.
Everything below is cataloged from source and the docs/strings shipped in the repo; nothing is inferred from file names alone.

## Agent hook integrations

### What a "hook integration" is

For each supported agent, `cmux hooks setup` (or `cmux hooks setup <agent>` / `cmux hooks setup --agent <agent>`) writes that agent's own hook/plugin/extension configuration so its CLI reports lifecycle events (session start/stop, tool use, permission requests, questions) back to cmux over the control socket. `cmux hooks uninstall <agent>` removes it. Agents whose binary isn't found on `PATH` are skipped, and the command prints a summary of what it skipped.

- Source: `docs/agent-hooks.md`, `docs/feed.md`, `docs/session-restore` (web docs page), CLI `cmux hooks ...`.
- Supported agent names for the CLI: `codex`, `grok`, `opencode`, `pi`, `omp`, `campfire`, `amp`, `cursor`, `gemini`, `kimi`, `kiro`, `rovodev` (alias `rovo`), `copilot`, `codebuddy`, `factory`, `qoder`, plus Antigravity (`agy`). Claude Code is handled separately by the **cmux Claude wrapper** (a PATH shim), not by `cmux hooks setup claude`.

### What every hook writes locally

Every agent's hook session writes an entry to `~/.cmuxterm/<agent>-hook-sessions.json`: the agent's native session ID, the cmux workspace ID, the surface ID, the cwd, the process ID (when available), the current lifecycle (`running` | `idle` | `needsInput` | `unknown`), and a **sanitized** launch command (prompts, credentials, old session selectors, and noninteractive flags are stripped so a relaunch resumes the session rather than replaying a task or leaking secrets).

### Per-agent integration matrix

| Agent | Binary | Config file(s) written | Session resume command | Feed bridge (what creates approval cards) | Config dir override | Disable-for-one-process env var |
|---|---|---|---|---|---|---|
| Claude Code | `claude` (via cmux wrapper) | wrapper-injected settings (no file) | `claude --resume <id>` | `PermissionRequest` | — | — |
| Codex | `codex` | `~/.codex/hooks.json`, `~/.codex/config.toml` | `codex resume <id>` | `PreToolUse`, `PermissionRequest` (telemetry only, non-blocking) | `CODEX_HOME` | `CMUX_CODEX_HOOKS_DISABLED=1` |
| Grok / Grok Build CLI | `grok` | `~/.grok/hooks/cmux-session.json` | `grok -r <id>` | `PreToolUse` | `GROK_HOME` | `CMUX_GROK_HOOKS_DISABLED=1` |
| OpenCode | `opencode` | `~/.config/opencode/plugins/cmux-session.js`, `~/.config/opencode/plugins/cmux-feed.js` (also project-local via `cmux hooks opencode install --project` → `.opencode/plugins/cmux-feed.js`) | `opencode --session <id>` | plugin event bus | `OPENCODE_CONFIG_DIR` | `CMUX_OPENCODE_HOOKS_DISABLED=1` |
| Pi | `pi` | `~/.pi/agent/extensions/cmux-session.ts` | `pi --session <id>` | `tool_execution_start` / `tool_execution_end` telemetry | `PI_CODING_AGENT_DIR` | `CMUX_PI_HOOKS_DISABLED=1` |
| OMP (oh-my-pi) | `omp` | `~/.omp/agent/extensions/cmux-omp-session.ts` or `$PI_CODING_AGENT_DIR/extensions/cmux-omp-session.ts` | `omp --session <id>` | none (lifecycle/restore only) | `PI_CODING_AGENT_DIR` (full dir) else `PI_CONFIG_DIR` (config root) | `CMUX_OMP_HOOKS_DISABLED=1` |
| Campfire | `campfire` | `~/.campfire/agent/extensions/cmux-campfire-session.ts` or `$CAMPFIRE_CODING_AGENT_DIR/extensions/...` — **native bridge in current Campfire builds, no install step needed** | `campfire --session <id>` | none for permissions; surfaces collaborative moments (joiner waiting, capability ask) as notifications | `CAMPFIRE_CODING_AGENT_DIR` | `CMUX_CAMPFIRE_HOOKS_DISABLED=1` |
| Amp | `amp` | `~/.config/amp/plugins/cmux-session.ts` | `amp threads continue <id>` | none for approvals; bundled plugin reports live tab-status (idle/thinking/running/reading/done/error/interrupted) | none | `CMUX_AMP_HOOKS_DISABLED=1` |
| Cursor CLI | `cursor-agent` | `~/.cursor/hooks.json` | `cursor-agent --resume <id>` | `beforeShellExecution` | none | `CMUX_CURSOR_HOOKS_DISABLED=1` |
| Gemini | `gemini` | `~/.gemini/settings.json` | `gemini --resume <id>` | `PreToolUse` | none | `CMUX_GEMINI_HOOKS_DISABLED=1` |
| Kiro CLI | `kiro-cli` | `~/.kiro/agents/cmux.json` or `$KIRO_HOME/agents/cmux.json` | `kiro-cli chat --resume-id <id>` | `preToolUse`, `postToolUse` | `KIRO_HOME` | `CMUX_KIRO_HOOKS_DISABLED=1` |
| Rovo Dev | `acli` | `~/.rovodev/config.yml` | `acli rovodev run --restore <id>` | none | none | `CMUX_ROVODEV_HOOKS_DISABLED=1` |
| Copilot | `copilot` | `~/.copilot/config.json` | `copilot --resume <id>` | `PreToolUse` | `COPILOT_HOME` | `CMUX_COPILOT_HOOKS_DISABLED=1` |
| CodeBuddy | `codebuddy` | `~/.codebuddy/settings.json` | `codebuddy --resume <id>` | `PreToolUse` | `CODEBUDDY_CONFIG_DIR` | `CMUX_CODEBUDDY_HOOKS_DISABLED=1` |
| Factory | `droid` | `~/.factory/settings.json` | `droid --resume <id>` | `PreToolUse` | none | `CMUX_FACTORY_HOOKS_DISABLED=1` |
| Qoder | `qodercli` | `~/.qoder/settings.json` | `qodercli --resume <id>` | `PreToolUse` | `QODER_CONFIG_DIR` | `CMUX_QODER_HOOKS_DISABLED=1` |
| Kimi Code | `kimi` | `${KIMI_CODE_HOME:-~/.kimi-code}/config.toml` (current) or `${KIMI_SHARE_DIR:-~/.kimi}/config.toml` (≤1.49) | not yet supported | `PreToolUse`, `PostToolUse` | `KIMI_CODE_HOME`, `KIMI_SHARE_DIR` | `CMUX_KIMI_HOOKS_DISABLED=1` |
| Antigravity | `agy` | `~/.gemini/config/hooks.json` (`cmux` hook group) | `agy --conversation <id>` | `PreToolUse`/`PostToolUse` | none | `CMUX_ANTIGRAVITY_HOOKS_DISABLED=1` |
| Hermes Agent | `hermes` | (registered as a Vault agent; see Vault section) | `hermes --resume <id>` | `pre_tool_call`, `post_tool_call`, `pre_approval_request`, `post_approval_response` | — | — |

Notes:
- Kimi installs into whichever config path `kimi doctor` reports; if the binary can't answer, cmux picks the first of the two paths that already exists (defaulting to the Kimi Code CLI path). The other path's cmux block is refreshed in place rather than emptied, so a second Kimi install keeps working. `cmux hooks uninstall kimi` removes the block from both files.
- OMP uses OMP's own native extension discovery (`${PI_CODING_AGENT_DIR:-~/${PI_CONFIG_DIR:-.omp}/agent}/extensions/`) with a filename distinct from Pi's (`cmux-omp-session.ts` vs `cmux-session.ts`) so the two never collide.
- Antigravity's hook commands resolve to whichever cmux build (stable / nightly / a tagged dev build) owns the terminal a session started in, via `CMUX_BUNDLED_CLI_PATH` / `CMUX_SOCKET_PATH` captured from that terminal's env; outside that env they fall back to the cmux build that installed them.

### Claude Code's own path (not via `cmux hooks setup`)

Claude Code is intercepted by the **cmux Claude wrapper**, a PATH shim, when "Claude Code integration" is enabled in Settings. It injects cmux's hook settings per invocation (`--settings`) transparently — nothing is written to `~/.claude`, and a hand-typed `claude` in a cmux terminal picks it up too. Claude's `PushNotification` tool (a model-initiated "notify the user now" push) is bridged through a `PostToolUse` hook into cmux notifications; cmux suppresses the tool's normal raw OSC desktop notification on hook-integrated surfaces so the bridge is the only thing the user sees, and it mirrors the tool's own outcome (a push the tool itself reports as skipped is not duplicated).

Grok's completion text specifically comes from its `Notification` hook, not a generic "done" string — cmux records `Stop` as the idle-state transition but keeps Grok's own message so repeated turns don't collapse into a canned phrase.

### Codex wrapper precedence

When cmux launches Codex and at least one cmux event isn't already covered by a persistent handler in `hooks.json`, the wrapper appends `--enable hooks --dangerously-bypass-hook-trust` plus one `-c hooks.<event>=...` value per uncovered event, for that single invocation only — it never rewrites the user's `hooks.json`/`config.toml`. If `cmux hooks codex install` has already installed every cmux handler, the wrapper injects nothing (an intentional `features.hooks = false` is left intact). `--dangerously-bypass-hook-trust` skips Codex's hook-trust review for the whole process, which also lets user/project handlers run without a trust prompt. `CMUX_CODEX_HOOKS_DISABLED=1` disables all of this for one launch, leaving Codex's own config and trust review untouched but also turning off cmux's Feed/notification bridge and hibernation for that process.

### Troubleshooting states

- **"Feed shows nothing even though the agent is running"** → the hook file is missing the `cmux hooks feed --source <agent>` entry (`cat ~/.codex/hooks.json` etc.); re-run `cmux hooks setup`.
- **"Codex plan-mode question stays in the terminal"** → Codex's `request_user_input` isn't a hook event in the stock TUI path; Feed only sees Codex's permission hooks.
- **"Agent hangs on a permission request"** → Feed never blocks an agent longer than 120s; a longer hang means the hook failed to reach the socket (verify `$CMUX_SOCKET_PATH`, default `~/.config/cmux/cmux.sock`).
- **"OpenCode plugin doesn't fire"** → plugin only installs if `opencode` was on `PATH` at setup time; check the plugin file contains `// cmux-feed-plugin-marker v1`.
- **"If relaunch does not resume an agent"** → run `cmux sessions --agent <name> --json` (works without a running cmux socket) to inspect the saved session, then check `~/.cmuxterm/<agent>-hook-sessions.json` and verify the agent's own resume command still works outside cmux.

## Feed — the approvals inbox

### What it is

Feed is cmux's inline surface for AI-agent decisions: a right-sidebar panel (default shortcut `Ctrl-4`) that shows the three kinds of thing an agent needs a human to answer, plus a scrollback of everything else the agent does (tool use, assistant messages, session start/stop, `TodoWrite` updates) as read-only informational activity.

- Source: `docs/feed.md`, `Sources/Feed/*.swift` (`FeedCoordinator.swift` is ~1,760 lines and is the central actor), string prefix `feed.*` (194 strings).

### The three actionable kinds

1. **Permission requests** — agent wants to run a tool, edit a file, or execute a shell command. Decision buttons: **Once**, **Always**, **All tools**, **Bypass**, **Deny**.
2. **ExitPlanMode** — agent finished planning, ready to start editing. Decision buttons: **Ultraplan**, **Manual**, **Auto**, (**Deny** with feedback).
3. **AskUserQuestion** — agent asks a multiple-choice question (single- or multi-select). User picks option(s) and presses **Submit** (`feed.question.submit` / `feed.question.submitAll` "Submit All Answers"); an unanswered multi-select shows `feed.question.answerAll` "Please answer all questions."

### Decision semantics per mode

**Permission modes** (what cmux replies to the agent's own hook):

| Mode | Effect |
|---|---|
| Once | Allow once through the agent's native permission hook |
| Always | Allow + apply the agent's suggested persistent permission rule when the agent offers one |
| All tools | Allow + apply the agent's suggested persistent rule |
| Bypass | Allow + request session-level bypass mode when the agent supports it |
| Deny | Deny through the agent's native permission hook |

For Claude Code specifically, the cmux wrapper launches Claude with `--allow-dangerously-skip-permissions`; this doesn't turn bypass on by default, but it's what lets a later `PermissionRequest` reply switch the running session into `bypassPermissions`. Without that launch flag, Claude ignores `setMode: bypassPermissions` entirely.

**Plan-mode decisions:**

| Mode | Behavior |
|---|---|
| Ultraplan | Reject the local plan, ask Claude to refine it with Ultraplan |
| Manual | Allow the plan, keep manual edit approvals |
| Auto | Allow the plan, request Claude's auto mode |
| Deny | Deny with the user's rejection/feedback message |

Exit-plan feedback field placeholder: `"Tell Claude what to change…"` (`feed.exitplan.feedback.placeholder`); the Send button reads "Send feedback" (`feed.exitplan.refine`).

**AskUserQuestion**: for Claude Code, answered by allowing the underlying `PermissionRequest` with an updated tool input carrying the selected answers; other agents use their own native question-reply shape.

**Codex is different by design**: Codex's own `request_user_input`, `update_plan`, and approval prompts stay in Codex's native TUI/app-server path. cmux records Codex `PreToolUse`/`PermissionRequest` hooks as **non-blocking telemetry only**, because Codex runs `PermissionRequest` hooks *before* its own "Approve for me" auto-review path — blocking in hook mode would force Feed approval before Codex's own reviewer can even decide. When Codex is launched via **`cmux codex-teams`**, cmux owns a private Codex app-server connection and the Codex Teams watcher *does* bridge app-server command/file-change approval requests to Feed as real actionable cards (a Feed click answers the app-server request directly); if Feed times out with no decision, cmux sends nothing so Codex's own TUI approval can still answer.

### Timeout behavior

Feed is advisory, never blocking forever: the hook waits **at most 120 seconds** for a decision. On timeout the bridge emits `{}` (no decision) and the agent falls through to its own in-TUI prompt. Per-event hook timeouts are raised to ~120–125s for blocking Feed entries (Claude's `PermissionRequest` specifically uses 125s) so a 30-second human doesn't trip a default 5000ms hook timeout. Codex's Feed hooks stay non-blocking with a short timeout since Codex owns its own approval UI.

### Notifications

Feed posts a native macOS notification with inline action buttons when the app window isn't focused, for the three categories `CMUXFeedPermission`, `CMUXFeedExitPlan`, `CMUXFeedQuestion` (registered at launch). Exact notification copy:
- Permission: title `"%@ permission"`, body `"%@ needs approval"`, buttons Allow Once / Always / All tools / Deny (`feed.notification.permission.*`).
- Exit plan: title `"%@ plan ready"`, body `"Review and approve the plan"`, buttons Auto / Manual / Bypass / Ultraplan / "Revise…" (`feed.notification.exitPlan.*`, `feed.notification.exitPlan.revise`).
- Question: title `"%@ question"`, body `"Agent is asking a question"`, button "Reply" (`feed.notification.question.*`), with an "Other…" free-text option (`feed.notification.question.other`).
If macOS notification authorization is denied, Feed rows still appear in the sidebar but no native banner is delivered.

### Status vocabulary and badges

Item status strings: `feed.status.pending` "Pending", `feed.status.needsInput` "Needs input", `feed.status.expired` "Expired". Resolved badges: `feed.badge.allowed` "Allowed", `feed.badge.answered` "Answered", `feed.badge.plan` "Plan", `feed.badge.refined` "Refined", `feed.badge.submitted` "Submitted". A resolved item's row rewrites in place with a "Resolved" divider (`feed.divider.resolved`) rather than disappearing.

Row kind labels shown in the timeline (uppercase pills): `PERMISSION`, `PLAN`, `QUESTION`, `MESSAGE`, `PROMPT`, `TOOL USE`, `TOOL RESULT`, `TODOS`, `STOP`, `SESSION START`, `SESSION END` (`feed.kind.*`). A Task-tool subagent's activity is grouped under a "Subagent" lifecycle header, and context-compaction events under a "Compaction" header (`feed.lifecycle.subagent.title`, `feed.lifecycle.compaction.title`).

### Empty states (per filter tab)

- **Actionable** tab empty: title "No pending decisions", subtitle "Permission, plan, and question requests from AI agents will appear here."
- **All Activity** tab empty: title "No activity yet", subtitle "Agent decisions and todo-list updates will appear here."
- A third "all feed" empty state: title "No feed activity yet", subtitle "Tool use, messages, and session events will appear here."
Filter tabs: `feed.filter.actionable` "Actionable", `feed.filter.activity` "All Activity", `feed.filter.all` "All".

### Stop / continue

When Claude finishes a turn, Feed shows a reply row: label "Claude finished — reply to continue" (`feed.stop.label`), placeholder "Reply to Claude…" (`feed.stop.placeholder`), button "Send to Claude" (`feed.stop.send`). Prompts the user sent are echoed in the feed as `"You: %@"` (`feed.promptEcho`), or for a permission-triggering message, `"You: %@ request from %@"`.

### Todos

TodoWrite updates render under a "Tasks" panel (`feed.todos.title`) with a Collapse action.

### Storage and audit

| Path | Contents |
|---|---|
| `~/.cmuxterm/workstream.jsonl` | Append-only audit log of every Feed event (actionable + telemetry) |
| `~/.cmuxterm/<agent>-hook-sessions.json` | Session→workspace mapping used by `feed.jump` |
| `~/.config/cmux/cmux.sock` | V2 socket the hooks/plugin talk to |
| `~/.config/opencode/plugins/cmux-feed.js` | OpenCode plugin emitted by `cmux hooks opencode install` |

Memory keeps the most recent **2000 items** in a ring buffer; older items remain in the JSONL audit log and are paged in on demand (`feed.history.loadOlder` / `feed.history.loadingOlder`, `hasMorePersistedItems`). Reset with `cmux feed clear` (prompts for confirmation) or `cmux feed clear --yes`.

### Jumping to the terminal

Double-clicking a Feed row focuses the cmux workspace + surface where the agent is running (`workspace.select` + `surface.focus`); if the agent isn't in a cmux terminal (no entry in `<agent>-hook-sessions.json`), the jump is a no-op.

### Keyboard-first TUI variant

`cmux feed tui` runs a keyboard-first OpenTUI (Bun-based) Feed in the terminal alternate screen; it can also be embedded in the separate right-sidebar Dock via a Dock control running `cmux feed tui`. First run creates `~/.cmuxterm/feed-tui-opentui`, installs `@opentui/core`, and launches by absolute path (keeping the workspace cwd). `cmux feed tui --opentui` forces the new OpenTUI implementation and fails loudly if it can't start; `CMUX_FEED_TUI_LEGACY=1` or `cmux feed tui --legacy` forces the older built-in TUI. `CMUX_FEED_TUI_BUN_PATH` points at an explicit Bun binary.

### Internal/debug-only Feed surfaces (not user features)

`Sources/Feed/FeedButtonStyleDebugWindowController.swift` and `FeedTextEditorDebugWindowController.swift` are dev-only style/variation labs (`feed.buttonDebug.*`, `feed.textEditorDebug.*` — dozens of palette/preset names like "Raycast Glass", "Liquid Capsule"). These are internal design tools, not something an end user reaches in normal use; excluded from the feature count below except as a note.

## Agent Session panels (native chat renderer)

### What it is

The `agentSession.*` string prefix (97 strings) and `Sources/Mobile/AgentChat/`, `Packages/Shared/CmuxAgentChat/`, `Packages/iOS/CmuxAgentChatUI/`, `Resources/agent-session-react`, `Resources/agent-session-solid` describe cmux's native structured chat panel for an agent session (as opposed to a raw terminal), rendered by an embedded web view with two interchangeable renderer backends: **React** and **Solid** (`agentSession.renderer.react` / `agentSession.renderer.solid`). It's used by the mobile/iOS GUI mode and by session-panel surfaces on macOS.

### Providers

Three providers are named explicitly: `agentSession.provider.claude` "Claude Code", `agentSession.provider.codex` "Codex", `agentSession.provider.opencode` "OpenCode" (`agentSession.provider.*`).

### Composer / input area

- Prompt placeholder: `"Ask anything"`.
- Attachments: "Attach file", "Add files and more", "Add photos & files", "Remove attachment".
- IDE context: "IDE context" toggle, "Include IDE context".
- Web browsing toggle: "Browse web".
- `@`-mention menu: title "Mention", with "Current workspace" as a mentionable target.
- Voice input button.
- Send / Stop / Start buttons for the turn lifecycle.
- Slash-style skill menu: title "Skills" with example entries "Code review", "Plan", "Research" (`agentSession.web.skillMenuTitle`, `skillCodeReview`, `skillPlan`, `skillResearch`).
- Plan-mode: a "Plan mode" toggle plus an inline suggestion card — title "Create a plan", action "Use plan mode", shortcut hint `Shift + Tab`, and a dismiss ("Dismiss suggestion").

### Status states

`agentSession.web.status.*`: `loading`, `starting`, `running`, `stopping`, `idle`, `failed` ("Loading", "Starting", "Running", "Stopping", "Idle", "Failed"). Provider process lifecycle is logged as `"Provider started"` / `"Provider exited %d"` (exit code) / `"%@ ready"` (renderer ready) / `"Stopped"`.

### Permission / sandbox modes (Codex-flavored)

`agentSession.web.permissions.*`: "Default permissions", "Full access", "Auto-review", "Custom (config.toml)" — a picker for the session's own approval/sandbox posture, separate from Feed's per-request decisions.

### Rate limits panel

Shows "Rate limits" with rows for "Primary" and "Secondary" usage windows, each "Weekly" or "Monthly", a "Usage remaining" readout, and a "resets" countdown formatted as `%@d` / `%@h` / `%@m` (days/hours/minutes) — this is the panel that would show something like a weekly-limit warning for Claude/Codex usage.

### Message actions

Per-message: Copy message / Copy (assistant) / "Copied" confirmation state; for embedded shell blocks: Collapse shell, Copy shell contents / "Copied shell contents", Show more / Show less. A composer search box shows "No results" when nothing matches.

### Errors

- `"Native bridge request failed."` — generic bridge RPC failure.
- Codex-specific: `"cmux could not read the response from Codex. Try again."` (invalid JSON), `"The Codex request failed. Try again."` (RPC failure), `"Request from Codex app-server is not supported: %@"`, and `"Codex reported a warning."`
- OpenCode-specific: `"OpenCode event stream disconnected."`, `"OpenCode session could not be created."`
- Generic provider-not-found: `"%@ was not found. Install it and make sure \"%@\" can be run from your terminal."`
- Bridge-layer errors: invalid provider, invalid request, missing parameter, provider not ready, session already running, session no longer available, unsupported method, unsupported transport (`agentSession.bridge.error.*`).

### Codex "activity" verb pairs (in-progress vs. completed)

The Codex renderer shows an activity line per file/command action, with distinct present/past-tense verbs so an in-flight action reads differently from a finished one: Running → Ran, Creating → Created, Editing → Edited, Deleting → Deleted, Stopped (for a command) (`agentSession.codex.activity.*`).

## Agent session index, restore and resume

### The reliability model (from `docs/agent-session-tracking-spec.md`)

cmux's design principle for "does this terminal have a live agent, and what state is it in" is: **deterministic binding, never a heuristic**. Every cmux-owned terminal surface is spawned with `CMUX_SURFACE_ID` / `CMUX_WORKSPACE_ID` / `CMUX_PANEL_ID` / `CMUX_TAB_ID` injected as protected env vars, so even a hand-typed `claude`/`codex` inherits the token and its hooks resolve to the correct surface. A fired hook resolves its surface, in priority order: (1) explicit `--workspace`/`--surface` flags, (2) inherited env vars, (3) tty→surface lookup against cmux's own `debug.terminals` table, (4) process-tree match of the agent's pid under a surface's tracked process tree. Titles and file-mtime heuristics were deliberately deleted as unreliable and are never used as a fallback.

**State machine** (`AgentSession.state`), driven only by hook events tied to the surface token:
- `sessionStart` → `idle`
- `userPromptSubmit | preToolUse | postToolUse | todoWrite` → `working`
- `permissionRequest | askUserQuestion | exitPlanMode | notification` → `needsInput`
- `stop` → `idle`
- `subagentStop` → unchanged (a Task-tool subagent finishing says nothing about the parent)
- `sessionEnd` → `ended`

**`ended` is retained, not deleted** — a GUI surface stays visible after the agent ends; `ended` only disables the input/bottom bar.

**Backstops that don't depend on hook delivery**: an owned-process-exit watcher (`DispatchSource.makeProcessSource(...,.exit)` on the agent's pid) flips state to `ended` deterministically even if the `sessionEnd` hook never arrives (guarded so a `claude --resume` under a *new* pid isn't ended by its predecessor's exit); transcript-tail corroboration can clear a stuck `working` state from the agent's own JSONL, used only to correct, never to invent presence.

**Codex-specific gap and fix** (`docs/codex-agent-detection-plan.md`): Codex has no reliable `SessionStart`-equivalent hook by default (its one legacy `notify` slot is often already claimed, e.g. by Computer Use). The fix is a `cmux-codex-wrapper` PATH shim (mirroring the existing Claude wrapper) that emits `cmux hooks codex session-start` itself before exec'ing the real `codex`, carrying the surface id/cwd/pid — so detection needs *no* cooperation from Codex's own hook system. Outside a cmux terminal (no `CMUX_SURFACE_ID`), the wrapper no-ops.

### What cmux restores after an app relaunch (`docs/session-restore` web page)

Always restored: window/workspace/pane layout, working directories, terminal scrollback (best-effort — terminal apps can redraw/clear their own screen), browser URL and navigation history. **cmux does not checkpoint arbitrary live process state**; tmux, vim, shells, and unsupported terminal apps just reopen as plain terminals unless they have their own resume integration.

**Agent session resume**: for the agents whose hooks record a native session ID, cmux relaunches by running that agent's own resume command with the saved ID (table above / `docs/session-restore`). Manual restore: **History > Restore Previous App Launch**, `⌘⇧O`, or `cmux restore-session`.

**Disable automatic agent resume**: **Settings > Terminal > Resume Agent Sessions on Reopen** (off) or `{"terminal": {"autoResumeAgentSessions": false}}` in `~/.config/cmux/cmux.json`. With this off, cmux still restores window/workspace/pane/scrollback/browser state; restored agent terminals just stay idle (a placeholder with a manual **Resume** button) until resumed by hand.

**Custom surface resume commands** (`cmux surface resume set --shell <command>`, `cmux surface resume show --json`, `cmux surface resume clear`): lets any terminal surface — not just a known agent — bind a restart command. Public CLI/socket-created bindings are stored for inspection but are not auto-run unless approved. Approval is prefix-based and cryptographically signed by cmux, and binds the working directory and exact environment values when present.

#### Surface Resume Approval dialogs

Two distinct prompts, both under **Settings > Terminal > Resume Commands**:

1. **"Allow Resume Command?"** (`surfaceResumeApproval.proposal.*`) — shown when a process (not the trusted agent-hook path) proposes making a resume command sticky. Message: *"A process wants cmux to keep this resume command for the current terminal:"*. Buttons: **Auto-Restore**, **Ask Each Time**, **Keep Manual**, with a checkbox *"Apply to all commands starting with '%@' in this folder"* (prefix + cwd scoped).
2. **"Run Resume Command?"** (`surfaceResumeApproval.runPrompt.*`) — shown at actual restore time for a binding needing per-run confirmation. Message: *"cmux is restoring a terminal with this resume command:"*. Buttons: **Run**, **Run All**, **Skip**, **Skip All**, with checkbox *"Don't ask again for this command"*.

Agent-hook-published bindings arrive with automatic resume already granted (they're the trusted path); a later `--source agent-hook` write for the same session that omits automatic resume (e.g. an older Pi extension re-publishing) does **not** downgrade an already-trusted binding — cmux keeps the trusted one. Sensitive env keys (tokens/passwords/secrets/API keys) are dropped before any resume binding is stored.

### Under the hood (versioned snapshot)

cmux writes a versioned JSON snapshot to `~/Library/Application Support/cmux/session-<bundle-id>.json` (plus a previous-session cache for manual reopen). Restore order: rebuild windows/panes first, then — if auto-resume is enabled — launch a one-shot shell running the agent's native resume command with the saved session ID.

## Agent Hibernation

### What it is

Kills idle background agent processes to free RAM/CPU, then resumes each one from its saved session when the user returns to its tab. Off by default for routine use; a separate bounded safety path stays active regardless, for critical system memory pressure.

- Source: `docs/agent-hooks.md` ("Agent Hibernation" section), `Sources/AgentHibernation/*.swift`.

### Eligibility gates for routine hibernation (all must hold)

- It has a saved restorable agent session with launch data that can build a resume command.
- Lifecycle is `idle` (`AgentHibernationLifecycleState.idle` — not `running`, not `needsInput`, not `unknown`).
- The terminal's panel is currently off-screen (background).
- The count of live restorable agent terminals exceeds `maxLiveTerminals` (default **12**).
- No output/input/lifecycle change for at least `idleSeconds` (default **5**, range 5–604800).

Under the live-terminal limit, **nothing** hibernates no matter how long it's idle; once over the limit, cmux frees only the oldest-idle background terminals, just enough to get back under it. Visible terminals are never touched.

Before killing, cmux watches the terminal tail and process fingerprint for a `confirmationSeconds` (~60s) settle window; any new output/input/lifecycle/PID change cancels the pending hibernation. Net effect: routine hibernation only ever affects someone running >12 agents at once, and only ~1 minute after one goes quiet off-screen.

### Critical memory pressure path

Runs independently of the `enabled` setting and the live-terminal limit when macOS reports critical memory pressure. Each pass kills at most **two** of the oldest eligible background agents; eligibility still requires restorable + off-screen + explicitly idle + no unconfirmed input + past the confirmation window + a transcript cmux can protect. Visible/running/needs-input/recently-changed/unprotectable agents are never selected.

### Termination and recovery

cmux sends `SIGTERM` to the agent's process group (scoped to that workspace+surface), swaps the live terminal for a lightweight placeholder (frees memory/CPU), and shows a manual **Resume** button on the placeholder as a fallback. Visiting the tab again runs the agent's native resume command with the saved session ID.

### Panel phases (internal state machine)

`AgentHibernationPanelPhase`: `.live` → `.terminating` → either `.hibernated` (success) or `.terminationFailed` (kill attempt failed) or `.recovering` (resuming back). `isCommitted` is true for every phase except `.live`.

### Enable / configure

- Command palette: `⌘⇧P` → **Enable Agent Hibernation**.
- **Settings > Terminal > Agent Hibernation**.
- CLI: `cmux agent-hibernation on` / `cmux agent-hibernation off`.
- `~/.config/cmux/cmux.json`: `{"terminal":{"agentHibernation":{"enabled":true,"idleSeconds":5,"maxLiveTerminals":12}}}`.

### Which agent kinds participate

`AgentHibernationLifecycleStatusKeys.allowedStatusKeys` — the fixed set of agent status keys hibernation (and Escape-key "stop the agent" authorization) will act on: `amp`, `antigravity`, `campfire`, `claude_code`, `codebuddy`, `codex`, `copilot`, `cursor`, `factory`, `gemini`, `grok`, `hermes-agent`, `kiro`, `kimi`, `omp`, `opencode`, `pi`, `qoder`, `rovodev`. A reserved `manual`/`manual:<id>` key namespace (from `cmux workspace loading`) is explicitly excluded — it drives only the sidebar's loading spinner, never hibernation or PID handling.

## Fork Conversation

### What it is

Branches a running (or ended) agent's conversation into a *new* terminal that continues from the same transcript, without touching the original session. Reached via right-click on an agent terminal.

- Source: `Sources/Workspace+ForkConversationContextMenu.swift`, `Sources/GhosttyNSView+ForkConversationContextMenu.swift`, `Sources/ContentView+ForkAgentConversation.swift`, string prefix `forkConversation.*` (12 strings) + `terminalContextMenu.forkConversation*`.

### Menu

Right-click on an eligible surface shows **"Fork Conversation"** (runs immediately, using the current default destination) and a submenu **"Fork Conversation To"** listing all six destinations, with the current default checked:

| Destination | Description string |
|---|---|
| Top Split | "Right-click Fork Conversation creates a split above the current pane." |
| Bottom Split | "Right-click Fork Conversation creates a split below the current pane." |
| Left Split | "Right-click Fork Conversation creates a split to the left." |
| Right Split | "Right-click Fork Conversation creates a split to the right." |
| New Tab | "Right-click Fork Conversation creates a sibling tab in the current pane." |
| New Workspace | "Right-click Fork Conversation creates a new workspace." |

Default destination is **Right Split**, changeable via **Settings > App > "Fork Conversation Default"** (`settings.app.forkConversationDefaultDestination`; searchable via the alias "fork conversation right left top bottom split tab workspace default").

### States / availability

- If the agent index is still refreshing, the menu item is shown disabled with no submenu (`agentIndexRefreshing`).
- If there's no valid agent snapshot at all (no fork data available for this pane), the menu item is hidden entirely.
- Fork requires the resume/fork command to still be valid at click time: cmux re-resolves the panel's current snapshot and, when the executable identity needs re-validation (`AgentForkSupport.requiresForkValidationExecutableIdentity`), re-probes the executable fingerprint and silently aborts the fork if anything changed underneath the click (renamed/moved binary, closed pane, etc.) rather than forking against stale data.
- Remote/SSH terminals fork differently: `forkNativeSSHAgentConversation` builds a retargeted resume command over the existing SSH connection; `nativeSSHAgentForkWorkspaceLaunch` builds a brand-new workspace whose scaffold carries only the remote fork command (the local scaffold never runs the agent).
- Projected tmux panes (cmux tmux-compat / Claude Teams-style panes) route through `forkProjectedTmuxAgentConversation` instead of the ordinary split/tab/workspace paths.

### Per-agent fork support

Forking depends on the agent registration supplying a `forkCommand` template (see Vault section below); agents without one simply don't offer Fork Conversation, resume still works normally.

## Vault (session index / history / restore / fork)

### What it is

Vault is cmux's cross-agent session history browser: every past and live agent session (Claude Code, Codex, OpenCode, Grok, Pi, OMP, Campfire, Amp, Rovo Dev, Hermes Agent, and any custom-registered agent) in one searchable, filterable list, with transcript preview, checkpoints, and fork/resume actions. Called "Vault" in the UI; its underlying type is `SessionIndexStore` / `sessionIndex.*` strings.

- Source: `docs/vault.md`, `Sources/Vault*.swift` (dozens of files), `CLI/CMUXCLI+Vault.swift`, string prefixes `sessionIndex.*` (122) and `cli.vault.*`.
- Reached via: right sidebar (`rightSidebar.mode.sessions` is literally labeled "Vault"), the shortcut labeled "Show Sidebar Vault," `command.openVaultPane.title` "Open Vault as Pane," or the CLI `cmux vault <subcommand>`.

### Empty / loading states

- Empty: title **"Vault is empty"**, subtitle "Claude Code, Codex, OpenCode, and Rovo Dev history will appear here." (the subtitle undersells current coverage — the matrix above shows more agents supported).
- Loading: **"Loading Vault…"**.
- Popover search box placeholder: "Search Vault"; popover-specific states "Searching…", "No matches", "You've reached the end" (end-of-list).

### Grouping, sorting, filtering

- **Group by**: Agent, Folder, or the default **Recency** (day buckets, newest first: "Today", "Yesterday", then weekday name for the last 6 days, then an abbreviated date — computed in the session's own calendar/timezone so the bucket label is correct regardless of machine timezone).
- **Sort within a bucket**: Last activity (default), Created, Duration, Folder (`sessionIndex.sort.*`) — each with a deterministic tiebreak (ties fall back to recency, then a stable id) so the ordering never flickers.
- **Filters**: Agent (all / one), Status (all / Live / Ended), Folder (all / exact cwd), Date (Any time / Today / Last 7 days / Last 30 days), with a one-click **"Reset Filters"**.
- **View modes**: Default view vs. Compact view, with a "Show details" / "Hide details" toggle for the folder/branch subtitle line.
- Row limits: a day section shows **10** rows before "Show more," expandable to **200** rows max per day (bounded so one huge day never renders thousands of rows).

### Live status

`sessionIndex.status.*`: **Live**, **Idle**, **Ended** (exited), plus **"Active in pane"** when the session's process is currently bound to an on-screen surface. `VaultSessionLiveStatus.derive` computes this from whether the process key is in the live-process set plus the last-activity timestamp.

### Row actions (right-click / row menu)

Copy File Path, Copy Resume Command, Focus Session, Open, Open Session, Open Working Directory, Open Pull Request, **Resume in New Workspace**, Reveal in Finder (`sessionIndex.row.*`).

### Transcript preview

Opens inline with role-labeled lines: "You" (user), "Agent" (assistant), "Tool", "System", "Event" (`sessionIndex.preview.role.*`). States: empty ("No previewable messages"), error ("Couldn't load transcript"), no file ("No transcript file"), truncated ("Preview truncated" / a large single record shown as "Large transcript record omitted"), with a manual resize handle.

### Checkpoints (turn-level rewind, and fork-from-checkpoint)

A checkpoint is a **pointer into the transcript**, never a copy — either automatically derived at every user-turn boundary (`.turn`, free, computed by streaming the transcript JSONL with a hard 16MB scan cap per file) or manually named by the user at the current tip (`.manual`, which also captures the workspace's git HEAD SHA at creation time).

- Tabs on a session's detail view: **Transcript** / **Checkpoints** (`sessionIndex.checkpoints.tab.*`).
- Manual checkpoint UI: name field placeholder "Name (optional)", button **"Checkpoint Now"** (help text: "Save a checkpoint at the current end of the transcript"), disabled with "Checkpoint Now is unavailable until the full transcript is read" while the transcript is still truncated/loading.
- Each turn row shows **"Turn %lld"**; a long transcript shows "Long transcript — earliest turns not shown" (`truncated`).
- Fork action per checkpoint: **"Fork from Here"** (short label "Fork"), with hint "Restore rewinds by forking a new session — the original session is never modified." Result: a new session titled **"%@ (fork)"**.
- Copy commit SHA action on manual checkpoints (captured git HEAD).
- Empty state: "No checkpoints yet" / "Name a point above to make it easy to return here."
- **Errors**: "Couldn't fork: %@", "Couldn't save checkpoint", "Fork from checkpoint isn't available for this agent yet" (harness has no fork command / anchor support — timeline goes view-only), plus specific failure reasons surfaced as distinct error cases: unsupported harness, write failed, unknown, read failed, parent transcript missing, invalid new session id, "There is nothing before this checkpoint to fork" (empty fork), "The transcript is too large to fork" (byte cap exceeded), "This checkpoint no longer matches the transcript" (anchor fingerprint mismatch — the checkpoint's anchored line was edited/removed/inserted after it was captured, detected via a SHA-256 digest of the sorted-key JSON object so equivalent key ordering doesn't false-positive).

**Anchor formats per agent** (how a checkpoint locates its line in that agent's transcript format): Claude Code uses `uuid:<v>`; Codex uses `ordinal:<n>` or `line:<n>`; Pi-family (Pi, OMP) uses `id:<v>`; Grok uses `line:<n>`. A `.turn` fork copies **strictly before** the anchored line ("before that prompt ran"); a `.manual` fork copies **through it, inclusive**.

### Custom agent registration (extending Vault to any CLI)

Beyond the built-ins, users can register arbitrary agents for Vault to detect and resume via `cmux.json`:

```jsonc
{
  "vault": {
    "agents": [{
      "id": "my-agent", "name": "My Agent",
      "iconAssetName": "AgentIcons/MyAgent",
      "detect": { "processName": "my-agent" },
      "sessionIdSource": { "type": "argvOption", "argvOption": "--session" },
      "resumeCommand": "my-agent --session {{sessionId}}",
      "forkCommand": "my-agent --session {{sessionId}} --fork",
      "cwd": "preserve",
      "sessionDirectory": "~/.my-agent/sessions"
    }]
  }
}
```

- Pi, OMP, and Campfire ship as built-in registrations of exactly this shape by default.
- Placeholders: `{{sessionId}}`, `{{sessionPath}}`, `{{executable}}`, `{{cwd}}`, `{{sessionDir}}`. `resumeCommand` must include `{{sessionId}}` or `{{sessionPath}}`.
- `forkCommand` is optional; when omitted, the right-click **Fork Conversation** item stays hidden for that agent (resume still works).
- `iconAssetName` is optional; omitted registrations get a neutral system icon rather than borrowing another agent's brand mark.
- Campfire is special-cased: only the driver's host session is restorable (joiners are ephemeral views with no persisted state), and resuming a Campfire session opens a **fresh** collaborative session with a **new invite link**, not the exact prior room.

### CLI (`cmux vault ...`)

`cmux vault sessions` (list; empty → "No sessions."), `cmux vault search <query>` (operators `agent:`, `repo:`, `ws:`, `before:`/`after:`), `cmux vault checkpoints --agent <id> --session <id>`, `cmux vault checkpoint`, `cmux vault fork --checkpoint <id>` or `--turn <n>` (prints "Resume with: %@" and "Forked session %@", or "Opened in a new workspace." for `--open`). View-only agents print "note: this agent's checkpoints are view-only (fork not supported yet)". Error strings are specific: unknown subcommand (with a "Try: sessions, search, checkpoints, checkpoint, fork" hint), missing selector, missing query, invalid `--turn`/`--limit`, missing `--checkpoint`/`--turn` for fork.

## Workspace / tab auto-naming (agent-driven)

### What it is

Opt-in AI naming of sidebar workspaces and tabs from the live agent conversation, so several concurrent identical-looking rows ("Claude Code", "codex") become short topic-bearing names that refresh as the conversation moves.

- Source: `docs/workspace-auto-naming.md`, referenced from `docs/agent-hooks.md`.
- Off by default. **Settings > Automation > Workspace Auto-Naming**, or `automation.workspaceAutoNaming` in `cmux.json`.

### Mechanics

At the end of an agent turn, cmux summarizes recent conversation into a **2–5 word title, in the conversation's own language**, and applies it to the workspace (and to the agent's own tab, if the workspace has several tabs). Names refresh when the topic shifts but are throttled by transcript growth + a minimum interval, so quiet/single-topic sessions converge to a stable name rather than re-summarizing constantly.

**Each agent names itself with its own CLI**, non-interactively, using whatever account is already authenticated on that machine:
- Claude Code: `claude -p` (model from `ANTHROPIC_SMALL_FAST_MODEL` if set, else the fast default; Vertex/Bedrock backend selection preserved), reading the Claude transcript JSONL.
- Codex: `codex exec --output-last-message`, reading the Codex rollout JSONL.
- Grok: `grok --prompt-file` with tools and web search disabled, reading `chat_history.jsonl`.
- OpenCode: `opencode run --pure` from an isolated temp directory, using cached recent prompt/assistant text from the cmux OpenCode session plugin.
- Pi / OMP: `pi --print --no-tools` / `omp --print --no-tools`, using cached text from their cmux hooks.

**Not supported** (and why): Amp's plugin doesn't expose usable transcript text; Gemini has hook payload text but no verified tool-disabled non-interactive invocation, so it's skipped rather than risk running transcript text through a tool-capable summarizer; Cursor, Antigravity, Kiro, Rovo Dev, Hermes Agent, Copilot, CodeBuddy, Factory, Qoder have the lifecycle hooks but lack both a verified transcript source and a safe non-interactive summarizer call.

### Precedence rule: manual names always win

A name set by the user (sidebar rename, command palette, `cmux rename-workspace`/`rename-tab`, or Claude's own `/rename`) is **never** overwritten by auto-naming, and auto-naming for that item stops entirely. Titles that predate this feature restore as user-set (never retroactively auto-renamed). Clearing a custom name (sidebar, command palette, or `cmux workspace-action --action clear-name`) re-opens that workspace/tab to auto-naming. OSC terminal titles never override a custom title, and provenance survives session restore and moving tabs between workspaces.

### Guarantees / failure behavior

No summarization call runs unless the setting is on (checked live, no restart needed to take effect). Only the workspace's *current, active* agent session can name it — stale/background/subagent sessions are filtered by the same gates the notification hooks use. Failures degrade silently: missing binary, timeout, or unsupported backend just means the name doesn't change (no error shown). Naming never blocks the agent (Claude's pass is an async hook; generic adapters run detached).

Mechanically: the Claude Code wrapper registers an async `Stop` hook (`cmux hooks claude auto-name`); other agents spawn an equivalent detached pass from their own turn-end hook. Each pass reads the adapter's transcript source, checks the throttle against per-session state in `~/.cmuxterm/<agent>-hook-sessions.json`, and applies the title via the `workspace.set_auto_title` socket method (which enforces the setting and the user-provenance rule app-side).

## Claude Code Teams (`cmux claude-teams`)

### What it is

Launches Claude Code with Claude's own experimental agent-teams feature enabled; when Claude spawns teammate agents, they appear as **native cmux splits** (visible in the sidebar, get notifications) instead of raw tmux panes inside one terminal.

- Docs: `/docs/agent-integrations/claude-code-teams` (nightly-build-only feature — `nightlyWarning`: "Available in nightly builds only.")
- Usage: `cmux claude-teams`, `cmux claude-teams --continue`, `cmux claude-teams --model sonnet` — all arguments after `claude-teams` are forwarded to Claude Code itself. Teammate mode defaults to **auto**.

### How it works (tmux-shim trick)

1. Creates a **tmux shim** script in a per-surface temp directory (path includes the surface UUID, changes every panel/boot — no fixed path can be hardcoded or quoted).
2. Sets `TMUX` / `TMUX_PANE` env vars to make Claude *believe* it's inside tmux.
3. Prepends the shim dir to `PATH` so Claude's `tmux` calls resolve to the shim first.
4. Sets `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` and teammate mode to auto.

When Claude issues a tmux command to manage a teammate pane, the shim translates it into a cmux socket API call instead of real tmux. The shim only routes to cmux when `CMUX_CLAUDE_TEAMS_CMUX_BIN` is set; otherwise it transparently falls through to the real `tmux` — so `which tmux` cannot tell you whether interception is active.

### Supported tmux→cmux command mapping

`new-session`/`new-window` → create a cmux workspace; `split-window` → split the current pane; `send-keys` → send text to a surface; `capture-pane` → read terminal text from a surface; `select-pane`/`select-window` → focus; `kill-pane`/`kill-window` → close; `list-panes`/`list-windows` → list.

### Split placement / persistent store

`~/.cmuxterm/tmux-compat-store.json` persists tmux-compat buffers, hooks, and split placement/layout state, notably:
- `lastSplitSurface` — maps each workspace UUID to the surface UUID created by the latest split (seeds the agent-column anchor).
- `mainVerticalLayouts` — maps each workspace UUID to `mainSurfaceId` (the leader surface) and `lastColumnSurfaceId` (the bottom-most surface in the agent column); subsequent teammate splits target that column and stack downward.
These are the keys to inspect when a teammate panel appears as a background tab instead of a visible split beside the leader.

### Env vars

`TMUX` (synthetic socket path for the `claude-teams` session), `TMUX_PANE` (synthetic pane id, **empty inside a spawned agent panel**), `CMUX_SURFACE_ID` (the current surface's UUID — use this inside a spawned panel instead of the synthetic tmux vars), `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`, `CMUX_SOCKET_PATH`. From inside a spawned agent panel, `cmux tree --json`'s `caller` object identifies the invoking panel.

## oh-my-* multi-agent orchestration wrappers

These are third-party open-source orchestration tools that cmux wraps with the *same* tmux-shim trick as Claude Code Teams, so their own multi-agent team panes/HUDs render as native cmux splits.

### oh-my-claudecode (`cmux omc`)

- OMC = "multi-agent orchestration system for Claude Code with 19 specialized agents, smart model routing, and tmux-based team pipelines."
- Usage: `cmux omc`, `cmux omc team 3:claude "implement feature"`, `cmux omc --watch`.
- What you get: team worker panes (Claude/Codex/Gemini sessions) as cmux splits; a HUD monitoring display in a split pane; auto-layout in a main-vertical grid; the user's own session stays in the primary pane.
- Prerequisite: `npm install -g oh-my-claude-sisyphus`, Claude Code CLI installed and authenticated.
- Shim: `~/.cmuxterm/omc-bin/tmux` (redirects to `cmux __tmux-compat`); also injects a `NODE_OPTIONS` restore module for Claude Code compatibility.

### oh-my-codex (`cmux omx`)

- OMX = orchestration layer for OpenAI Codex CLI, "30+ specialized agent roles, workflow skills, and tmux-based parallel team execution."
- Usage: `cmux omx`, `cmux omx --madmax --high`, `cmux omx team`.
- Prerequisite: `npm install -g @openai/codex oh-my-codex`; `omx setup` / `omx doctor` to verify.
- What you get: team worker panes (Codex/Claude) as splits; HUD showing model, branch, context, and **token usage** in a split pane; main-vertical auto-layout.
- Shim: `~/.cmuxterm/omx-bin/tmux`.

### oh-my-opencode (`cmux omo`)

- Nightly-build-only (`nightlyWarning`). Runs OpenCode with the **oh-my-openagent** plugin, orchestrating Claude, GPT, Gemini, and Grok as parallel specialized agents (named agents like "Hephaestus," "Atlas," "Oracle" are given as examples).
- Usage: `cmux omo`, `cmux omo --continue`, `cmux omo --model claude-sonnet-4-6`.
- What you get: each subagent gets its own cmux split; auto-layout (main-vertical default) resizes as agents come/go; **idle agents auto-clean up after 3 consecutive idle polls with no new messages**; if the window is too small for a new pane, the spawn **queues and retries every 2 seconds** until space frees up.
- **First run** auto-sets-up everything without touching the user's real config: creates a shadow config at `~/.cmuxterm/omo-config/` with the plugin registered, installs the `oh-my-opencode` npm package via bun/npm if missing, symlinks `node_modules`/`package.json`/plugin config from the real `~/.config/opencode/`, and turns on `tmux.enabled` (default false) only in the shadow copy. The original config is never modified — running plain `opencode` still behaves exactly as before.
- Shim: `~/.cmuxterm/omo-bin/tmux`; `OPENCODE_CONFIG_DIR` points at the shadow config.

### oh-my-pi (`omp`) — hooks-based, not a shim wrapper

Unlike the three above, OMP integrates through the **standard hook mechanism** described earlier (not a tmux shim): oh-my-pi is "a fork of Pi rewritten as a coding-first agent," binary `omp`. Setup: install `omp` (`bun install -g @oh-my-pi/pi-coding-agent` or `brew install can1357/tap/omp`), then `cmux hooks setup omp` (or `cmux hooks omp install`). The extension installs to `~/.omp/agent/extensions/cmux-omp-session.ts` and cmux upgrades it in place when the bundled version changes. What it gets: workspace busy/idle status from omp turn boundaries, turn-end notifications, session tracking for Vault resume (`omp --session <id>`) and fork (`omp --fork <id>`), workspace auto-naming (omp as its own summarizer), and Task Manager process attribution for omp processes. Env: `CMUX_OMP_HOOKS_DISABLED=1`, `CMUX_OMP_CMUX_BIN` (overrides the cmux binary the extension invokes).

## Skills (cmux-authored skills that teach agents to drive cmux)

### What it is

Distinct from an agent's own "skills"/slash-commands inside its chat: these are **SKILL.md** files cmux ships that teach any coding agent (installed as Codex/Claude/other-agent skills) how to control cmux itself — window/pane/workspace topology, settings, customization, diagnostics, browser automation, and a markdown viewer panel.

- Docs: `/docs/skills` web page; repo layout `skills/<name>/SKILL.md`, `skills/<name>/agents/openai.yaml`, `skills/<name>/references/*.md`, `skills/<name>/scripts/*`, `skills/<name>/templates/*`.

### Install

- Via Vercel's `skills` CLI (multi-agent): `npx skills add manaflow-ai/cmux -g -y` (all) or `npx skills add manaflow-ai/cmux --skill cmux-diagnostics -g -y` (one).
- Via the bundled `skills.sh` (Codex-only target): `curl -fsSL https://raw.githubusercontent.com/manaflow-ai/cmux/main/skills.sh | bash`; installs to `~/.codex/skills` or `$CODEX_HOME/skills` by default; flags `--list`, `--skill <name>` (repeatable), `--dest <dir>`, `--dry-run`, `--ref <branch/tag/commit>`.
- From a local checkout: `./skills.sh` with the same flags.

### Included skills

| Skill | Typical command | Scope |
|---|---|---|
| cmux Core (`cmux`) | `cmux identify --json` | Topology control: windows, workspaces, panes, surfaces, focus, moves, reorder, split-off, trigger flash. |
| cmux Workspace (`cmux-workspace`) | `cmux current-workspace --json` | Automation scoped to the caller's own current workspace/surface — add panes, send input, inspect state, open helper surfaces without disturbing other workspaces. |
| cmux Settings (`cmux-settings`) | `skills/cmux-settings/scripts/cmux-settings list-supported` | Inspect/edit/validate/open `~/.config/cmux/cmux.json` by JSON path with a bundled helper script. |
| cmux Customization (`cmux-customization`) | `cmux reload-config` | Customizes actions, plus-button behavior, tab-bar buttons, workspace layouts, Dock controls, Feed hooks, sidebar settings, Command Palette entries, shortcuts, Ghostty-owned terminal prefs. |
| cmux Diagnostics (`cmux-diagnostics`) | `skills/cmux-diagnostics/scripts/cmux-diagnostics` | Support-safe read-only health checks: CLI reachability, socket access, hooks, session restore, settings, agent binaries. |
| cmux Browser (`cmux-browser`) | `cmux browser surface:2 snapshot --interactive` | Automates cmux webview surfaces — snapshot refs, DOM actions, waits, screenshots, session state. |
| cmux Markdown Viewer (`cmux-markdown`) | `cmux markdown open plan.md` | Opens markdown in a formatted cmux panel with live reload, beside the terminal. |

### Customization examples library

Seven reusable prompt patterns a user can hand an agent with the customization skill: **Worktree agents** (plus-button/right-click/palette/layout for a dedicated worktree with paired Codex/Claude/SSH terminals), **Full-stack dev**, **SSH devbox**, **Review PR**, **Docs workspace**, **CI watch** (Dock controls, Feed TUI, notification hooks), **Quick agent buttons** (one-click Codex/Claude/custom-agent launchers on the surface tab bar). Detailed snippets live in `skills/cmux-customization/references/examples.md`, loaded by the agent only when needed. Example ready-to-paste prompts are given verbatim, e.g. *"Use $cmux-customization to add quick-agent-buttons for Codex and Claude."*

### Suggested-but-not-yet-built skills

cmux SSH, cmux Cloud VM, **cmux Vault** ("Manage vault-backed agent configuration, credentials, and restore behavior without leaking secrets into prompts" — flagged as needing stricter handling than normal settings because it touches secrets and agent startup) are listed as good future candidates, explicitly not shipped yet.

### Reachable from the app

The macOS **Help** menu mirrors the docs sidebar and includes a **Skills** item (`menu.help.skills`) that opens this docs page from inside the app.

## CodeRouter (team-shared Claude/Codex upstream credentials for Cloud agents)

### What it is

A billing/routing layer for **Cloud** machines (not local agent CLIs): cloud VMs send `claude`/`codex` traffic through `https://coderouter.dev/v1/messages`, and coderouter fans each request out across a team's own pool of upstream credentials rather than each cloud machine holding its own key.

- Source: `docs/coderouter-operations.md` (internal ops runbook — billing reconciliation, ClickHouse usage ledger, Sentry alerts — mostly not user-facing; the user-facing surface is the CLI below and a dashboard).
- Membership-gated only: any signed-in user in any team (including the personal team) can use it; no paid-plan gate or connected-account cap.

### Managing upstream Claude accounts (user-facing CLI)

```bash
claude setup-token                                    # mints a long-lived sk-ant-oat01-... token
cmux coderouter claude add oauth-token --label work    # runs claude setup-token, or CLAUDE_CODE_OAUTH_TOKEN / --stdin
cmux coderouter claude add oauth-token --label personal
cmux coderouter claude list                            # id, kind, masked identifier, label, health
cmux coderouter claude disable work                    # out of routing, credential kept
cmux coderouter claude remove personal                 # by id, label, or identifier
cmux coderouter machines                                # 30-day spend per Cloud machine
```
`add api-key` takes `ANTHROPIC_API_KEY`; `add bedrock` takes AWS credentials + `--region` + `--model <claude-id>=<bedrock-id>` mappings. No credential is ever typed into a browser or shell argv beyond the local `claude setup-token` OAuth flow.

### Routing / failover behavior (what a user experiences as latency/errors)

A Cloud machine (`cloud_vms.id`, else its route token) is pinned to one healthy upstream account by rendezvous hashing so Anthropic's per-organization prompt cache keeps hitting. A `429` cools that account down for `retry-after` (else the earliest `anthropic-ratelimit-*-reset`, else 60s); a `401/403` cools it for 15 minutes; a `5xx/529`/transport failure cools it for 20s. The same request is retried on the next healthy account, up to **4** attempts. When every account is cooling down, the client gets `503 overloaded_error` with the soonest retry time; if the team has no accounts at all, `503` with add-instructions.

### Usage/spend visibility

A team dashboard and `cmux coderouter machines` show 30-day token totals and an estimated API-equivalent dollar figure per Cloud machine, derived at write time from a versioned rate card — **this is an estimate, not actual spend**, and subscription-routed traffic is $0 incremental provider cost. Unknown models are excluded and reported separately as unpriced. No prompt, output, header, or credential is ever written to the usage ledger or to PostHog.

## Unverified / unclear

- **Whether "Hermes Agent" has a full `cmux hooks` CLI integration** (a config file / config-dir override / disable env var like the other 18 agents) or is Vault-registration-only. The session-restore docs page lists Hermes with `hermes --resume <id>` and a Feed trigger of `pre_tool_call, post_tool_call, pre_approval_request, post_approval_response`, and `Sources/CmuxVaultAgentRegistration+Hermes.swift` exists, but `docs/agent-hooks.md`'s integration table and troubleshooting section never mention Hermes at all — it may be Vault-only (detect/resume/fork) without the Feed/hibernation hook plumbing the other agents get. Flagged rather than asserted either way.
- **Exact Codex Teams (`cmux codex-teams`) command surface** — its existence and Feed-bridging behavior are documented in `docs/feed.md`, but (unlike Claude Code Teams) it has no dedicated `/docs/agent-integrations/*` page in this checkout, so its full CLI usage/flags weren't independently verified from a docs page the way Claude Code Teams was.
- **Subagents panel** (`docs/subagents-panel-plan.md`) is explicitly a design/plan document, not a shipped panel: "Status: first pass shipped (data context + `panel-subagents` example)" — the underlying `workspaces[i].agents` data context and the example JS sidebar panel (`Examples/CustomSidebars/panel-subagents.js`) exist, but cmux still has **no first-class subagent tree**; `SubagentStart`/`SubagentStop` hook events are deliberately dropped rather than building a parent/child hierarchy. Treat any "subagents panel" as an example/reference sidebar a user could enable, not a built-in always-on feature — not fully confirmed to ship in the default UI versus needing to be added as a custom sidebar.
- **Kimi Code session restore** is explicitly listed as "not yet" supported (`docs/agent-hooks.md` table), i.e. hooks track status/notifications but relaunch cannot resume a Kimi session automatically yet.

## Coverage note

Investigated and found **out of scope** (confirmed by reading source, not skipped blind):
- **Hive** (`Sources/Hive`, `Packages/macOS/CmuxHive`) is Mac↔iPhone device-pairing/sync infrastructure over Tailscale (`HivePairingController`, `HiveSyncRuntime`) for the mobile companion app generally — it has no AI-agent-specific behavior of its own and 0 hits in the localized-strings dump; it is not an "AI agents" feature and belongs with mobile/connectivity coverage instead.
- **"glaeda"** is a CI/build-fleet execution/test-runner tool name (`tests/test_cli_glaeda_execution.py`, `docs/fleet-enrollment.md`) — internal build tooling, not a user-facing AI-coding-agent feature.
- **coderouter-operations.md** is primarily an internal billing/ops runbook (Stripe webhooks, ClickHouse schema, Sentry alerts); only its user-facing slice (`cmux coderouter claude ...` CLI, routing/failover behavior, usage dashboard) is cataloged above as relevant to "AI agents."

Not independently re-verified in this pass (would need a running app or deeper source dive beyond the docs/strings already cross-checked): exact pixel-level layout of the Feed panel and Vault panel in the current build; live behavior of the debug-only Feed button-style/text-editor lab windows (confirmed dev-only from string names and file names, not opened); the iOS/mobile-side rendering of `mobile.chat.*` RPCs described in `agent-session-tracking-spec.md` (that spec is explicitly Mac-authoritative design doc, iOS UI was out of this catalog's scope per the assignment). Terminal core, sidebar chrome, browser, CLI reference index, settings screens generally, cloud VM provisioning, and mobile app shell are intentionally not covered here per the assignment's scope split.
