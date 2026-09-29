# Gaps found in agents and sessions

Prefixes: `agentSession`, `agent`, `sessionIndex`, `feed`, `forkConversation`, `sleepyMode`,
`surfaceResumeApproval`, `hive`, `vault` (agent/session side), `skills`, plus `cli.vault.*` /
`socket.vault.*`. 585 strings checked (0 under a literal `hive.` or `skills.` prefix — skill
strings live under `agentSession.web.skill*`, none uncovered there beyond what's below). ~44%
(258/585) already appear in `cmux-04-agents.md` (Feed and Vault are both extensively covered
there already); the other ~56% (327 strings) is below, minus debug-only noise (`feed.buttonDebug.*`,
57 strings, and `feed.textEditorDebug.*`, 13 strings — internal SwiftUI/AppKit component-lab
windows, not user features, excluded).

## Feed (approvals inbox) — remaining gaps

`cmux-04-agents.md` already documents Feed's three actionable kinds, notification copy, status/
badge strings, kind pills, and the stop/reply row. Not documented there:

### Lowercase mode values vs. button labels
Exit-plan and permission rows store their resolved mode as a lowercase machine-readable string,
distinct from the Title-Case button labels already documented:
- `feed.exitplan.mode.*`: `ultraplan`, `bypass`, `auto` (key `autoAccept`), `manual`, `denied` (key `deny`).
- `feed.permission.mode.*`: `once`, `always`, `all tools` (key `all`), `bypass`, `denied` (key `deny`).
Both sets are read in `Sources/Feed/FeedPanelView.swift:14-42` — used for the small "resolved as: X"
caption under a completed permission/plan row, separate from the button that produced it.

### Exit-plan allowed-prompts detail
When an `ExitPlanMode` call carries `allowedPrompts` (Bash permission requests bundled with the
plan), the row grows an **"Allowed prompts"** section (`feed.exitplan.allowedPrompts`,
`FeedPanelView.swift:2370`) listing each one via `ExitPlanAllowedPromptsView`.

### Question flow detail
- A question row shows a **"Multi-select"** tag (`feed.question.multiSelect`) when `AskUserQuestion`
  marks it multi-select.
- If the agent sends a question with an empty options array: **"Agent provided no options."**
  (`feed.question.noOptions`) and the row falls back to free text only.
- Free-text answer field placeholder: **"Type something…"** (`feed.question.typeSomething`).
- A dedicated action **"Skip + plan immediately"** (`feed.question.skipInterviewPlan`,
  `FeedPanelView.swift:3119`) lets the user bypass the remaining interview questions and jump
  straight to planning.
- (Already documented: `answerAll`, `submit`, `submitAll`, notification's `other` free-text option.)

### Telemetry (non-actionable) row labels
Session lifecycle/telemetry rows (hook events that don't need a decision) render lowercase status
words: `feed.telemetry.ok` "ok" / `.error` "error", and event-type labels `session start`,
`session end`, `stop` (`FeedPanelView.swift:3775-3785`).

### Todos row detail
- Collapsed-todos overflow: `feed.todos.moreCompleted` (format string, e.g. "+N more completed").
- Summary line composed from up to three parts: `feed.todos.summary.done` ("N done"),
  `.inProgress` ("N in progress"), `.open` ("N open") — only non-zero counts are included
  (`FeedPanelView.swift:3852-3858`).
- (Already documented: "Tasks" title, Collapse action.)

### Speaker labels on echoed lines
`feed.context.agent` "Agent:", `feed.context.plan` "Plan:", `feed.context.you` "You:" — short
speaker prefixes used somewhere the promptEcho/context strings need a label rather than the
`"You: %@"` sentence form already documented.

### `feed.push` socket-method validation errors
The blocking `feed.push` control-socket RPC (already documented as the ingestion path with a
0–120s `wait_timeout_seconds` cap) has three input-validation errors not yet listed:
`feed.push requires an \`event\` object`, `feed.push accepts either \`event\` or \`events\`, not
both`, `feed.push event failed to decode` (`Sources/TerminalController+FeedAcknowledgment.swift:218-239`).

### Native-notification "decision needed" fallback
`feed.notification.decisionNeeded` "Decision needed" (`Sources/Feed/FeedCoordinator.swift:1020`) —
a generic notification body used when a Feed item doesn't map to one of the three specific
notification categories already documented (permission/exit-plan/question).

## Vault (session index) — toolbar, row actions, preview, remaining gaps

`cmux-04-agents.md` covers Vault's purpose, empty/loading states, status derivation, checkpoints,
CLI, and custom registration in depth. Not documented there:

### List toolbar
- **Sort** (`sessionIndex.sort.*`): Last activity, Folder, Duration, Created — with tooltip "Sort
  sessions" and a "Sort by" label (`sessionIndex.allSessions.sortBy/sortTooltip`).
- **Filter** (`sessionIndex.filter.*`): facets Status (Live/Ended/All statuses), Folder (+"All
  folders"), Date (Today/Last 7 days/Last 30 days/Any time), Agent (+"All agents"), and a
  **"Reset Filters"** action; filter-panel tooltip "Filter sessions".
- **Group** (`sessionIndex.group.*`): by Recency, Agent, or Folder/Directory.
- **Search**: placeholder "Search sessions…", **"Clear search"** button, states "Searching…", "No
  matching sessions", and a degraded-search notice "Some session history could not be searched"
  (`sessionIndex.search.providerFailure`) — a per-provider read failure (e.g. one agent's history
  store errors) doesn't blank the whole list, just narrows results silently except for this banner.
- **View** (`sessionIndex.view.*`): a view picker titled "Session view" with **Default view** /
  **Compact view** options, plus a **"Show details" / "Hide details"** toggle.
- Day-group headers "Today" / "Yesterday" (`sessionIndex.day.*`).
- Reload button (tooltip "Reload Vault") and an overflow "More Vault actions" menu
  (`sessionIndex.reload.tooltip`, `sessionIndex.more.tooltip`).
- Scope toggle "This folder only" (`sessionIndex.scope.thisFolder`) — narrows Vault to the current
  workspace's directory.
- Section-list controls: "No chats" (two variants, `section.empty`/`section.noChats`), "Show
  less"/"Show more", and a count-suffixed "Show more" variant (`section.showMoreCount`, format
  string).
- An untitled session's fallback title: "Untitled chat" (`sessionIndex.untitled`).

### Row context menu (`sessionIndex.row.*`)
Right-click (or row overflow) on a Vault entry: **Copy File Path**, **Copy Resume Command**,
**Focus Session** (jump to the live pane), **Open**, **Open Session**, **Open Working Directory**,
**Open Pull Request**, **Resume in New Workspace**, **Reveal in Finder**.

### Transcript preview panel (`sessionIndex.preview.*`)
Hovering/selecting a Vault row shows a resizable transcript preview (drag handle tooltip "Resize
preview"). States: "No previewable messages" (empty), "Couldn't load transcript" (error), "No
transcript file", "Large transcript record omitted" (a single message too big to render), "Preview
truncated" (whole preview cut off). Speaker-role labels in the preview: `role.user` "You",
`role.assistant` "Agent", `role.tool` "Tool", `role.system` "System", `role.event` "Event".

### Search popover (separate from the main list search)
A lighter-weight popover search surface (`sessionIndex.popover.*`) with its own states:
"Search Vault" placeholder, "Searching…", "No matches", "Loading…", and end-of-list "You've
reached the end" — distinct copy from the main list's `search.*` states above; this is the
popover already referenced in `cmux-04-agents.md` line 349 but its `.loading`/`.noMatches` string
keys weren't listed there.

### Amp-specific and misc
- Amp sessions (Amp has no per-session title) fall back to "Amp session" or "Amp session in %@"
  (`sessionIndex.amp.title(InDirectory)`), and a specific error "Session history is unavailable"
  (`sessionIndex.error.ampStoreRead`) if Amp's store can't be read.
- OpenCode-specific snapshot error: "OpenCode: cannot snapshot opencode.db (%@)"
  (`sessionIndex.error.openCodeSnapshot`) — OpenCode's session DB is copied to a snapshot file
  before reading (to avoid reading a file the live `opencode` process is writing); this is the
  failure path for that copy.
- Directory unknown placeholder: "(no folder)" (`sessionIndex.directory.unknown`).
- A "Local command" label (`sessionIndex.localCommand`) — presumably distinguishes a plain shell
  resume command from an agent's own resume command in a mixed list; not confirmed further.
- Per-agent display-name strings under `sessionIndex.agent.*` (Claude Code, Codex, Grok, Hermes
  Agent, OpenCode, Pi, Rovo Dev) power the Agent filter dropdown and group headers — same display
  names as elsewhere, listed here because they're a distinct string set from the main agent table.

## Agent session restore collision handling (`agentRestore.*`) — undocumented entirely

Not mentioned anywhere in `cmux-04-agents.md`'s restore section. This is the **admission check**
cmux's `cmux restore --surface` path runs before actually relaunching a saved agent session, to
avoid starting a second copy of the same agent process:

- On restore, cmux asks whether the session is *already* live (e.g. resumed manually in another
  terminal, or restore ran twice) before running the resume command.
- **Already running elsewhere**: `agentRestore.liveOwner.notice` / `cli.restore.error.liveOwner` —
  *"This agent session is already running in process %1$lld. cmux did not start another copy. To
  take it over here, stop process %1$lld, then run 'cmux restore --surface' again."* cmux refuses
  to double-launch; the user must kill the other process first.
- **Can't verify (unavailable)** — several distinct causes, each with its own string:
  `agentRestore.admission.unavailable` (generic — "cmux could not verify whether this agent
  session is already running. Retry..."), `.hookStoreUnreadable` (the saved hook-session records
  file couldn't be read), `.timedOut` (the check itself timed out).
  When verification is impossible, cmux does **not** auto-resume
  (`agentRestore.unverifiable.notice`: *"cmux could not verify whether this agent session is
  already running, so it did not resume the session automatically. Run 'cmux restore --surface'
  to resume it here."*) — fails closed rather than risking a duplicate process.
- **Malformed request**: `agentRestore.admission.invalid` (missing workspace/surface/kind/session)
  and `.releaseInvalid` (releasing a restore claim without a valid kind/session/claim id).
- **Stale record**: `agentRestore.admission.targetChanged` — the surface's restore record changed
  underneath the request; re-run is required.
- **In-progress UI state**: while the check itself runs, the terminal placeholder shows
  "Restoring saved agent session…" (`agentRestore.recovery.checking`); if it turns out the session
  is live elsewhere, it instead shows "%1$@ session is running in process %2$@. Waiting for its
  writer to become available…" (`agentRestore.recovery.liveOwner`) — an interim state before the
  liveOwner notice above is finalized.
- CLI mirror: `cli.restore.error.admissionIdentityMissing` ("this session's live ownership could
  not be verified. Run 'cmux restore --surface' again.") and `cli.restore.error.launchPending`
  ("another launch of this agent session is already starting. Wait for it to appear, or retry
  'cmux restore --surface'.") round out the same collision-avoidance state machine from the CLI
  side.

This is a real correctness feature (preventing two processes attached to one agent session's
transcript/lock) that the existing catalog's restore section doesn't mention at all.

## Sleepy Mode — entirely undocumented (screensaver with agent pets)

Not mentioned anywhere in the existing catalog. cmux ships a full-screen lock-style screensaver,
reached from Settings and from a manual "Start Sleepy Mode" action (`sleepyMode.settings.title`
"Sleepy Mode", `.start`/`.startRow` "Start Sleepy Mode" / "Start Sleepy Mode now").

- **Source**: `Sources/Sleepy*.swift` (`SleepyModeController`, `SleepyFaceView`, `SleepyPalette`,
  `SleepyAgentCensus`, `SleepyStatusProvider`, `SleepyEnergyMode`, `SleepyOverlayWindow`, etc.),
  string prefix `sleepyMode.*` (62 strings).
- **Agent pets tie-in** (the reason this is in scope): `SleepyAgentCensus.swift` samples cmux's
  live agent-PID registry across every open workspace (at most every 2s) and buckets running
  agents into `claude` / `codex` / `opencode` / `pi` / `ollama` / `other`
  (`SleepyAgentCensus.Bucket`). `SleepyAgentCounts` doc comment: *"How many coding agents the user
  has open, by provider. Drives the Sleepy Mode pets: one cute pet per running agent, to make
  running lots of agents feel rewarding."* Settings subtitle:
  `sleepyMode.settings.pets.subtitle` — *"Walks one cute pet for every Claude, Codex, and OpenCode
  agent you have running."* A `debugOverride` field lets DEBUG builds summon pets without live
  agents, for demoing.
- **Security posture is explicit and self-limiting**: `sleepyMode.settings.securityNote.subtitle`
  — *"Sleepy Mode is a screensaver, not a lock — any key wakes it. For real security, use the
  'Lock Mac' button in the scene, which engages the actual macOS login lock."* Two exit modes:
  - **Casual** (`requireAuth.off`): "Any key or click wakes it" — dismiss hint "Press any key to
    wake (click the characters to play)" (`sleepyMode.dismissHintCasual`).
  - **Require Touch ID** (`requireAuth.on`): "Locks the Mac. Blocks Cmd-Tab, Cmd-Q, and force-quit
    until you authenticate." Dismiss hint "Touch ID or password to unlock"
    (`sleepyMode.dismissHint`); unlock reason string "Unlock cmux Sleepy Mode"
    (`sleepyMode.unlockReason`) is what macOS shows in the Touch ID/password prompt; a
    **Cancel** button exits that prompt without unlocking.
- **In-scene controls** (`sleepyMode.button.*`): Exit, **Lock Mac** (engages real macOS lock),
  **Sleep Display**, Energy (cycles System Settings' Energy Mode — Automatic/Low/High,
  `SleepyEnergyMode` wraps `IOPMAssertionCreateWithName`-style low-power toggling), and a Low
  Power on/off indicator. `sleepyMode.keepAwake` "Mac staying awake" / `.keepAwake.failed`
  "Couldn't keep Mac awake — check Battery settings" reports whether cmux's keep-awake IOPM
  assertions (idle-system-sleep + idle-display-sleep) actually took.
- **Customization** (`sleepyMode.settings.*` under Look/Scene/Security sections): Mascot (Cat,
  Ghost, cmux mascot, Logo face), Theme (Blossom, Mint, Mono, cmux, Custom), background Glow
  (Aurora, Black, cmux, Midnight, Ocean, Sunset, Custom), a Stars toggle, a Moon toggle, a
  Clock & date toggle, floating "z z z" toggle, and a color-by-part picker for Custom theme
  (Background, Blush, Nightcap, Eyes, Face, Logo). A **"Preview full screen"** action runs the
  scene without locking (any key/click exits, per `previewRow.subtitle`). A **Battery & Wi-Fi**
  status row.

## Agent status/notification classification (`agent.*`)

Mostly undocumented in `cmux-04-agents.md`, which focuses on the Feed/hooks pipeline, not on the
separate agent-status/notification layer that feeds the sidebar and system notifications.

### Codex hook-failure classifier
`CLI/cmux.swift:30244-30284` (`summarizeCodexHookFailureCandidate`) — when a Codex hook reports an
`error`/`stream_error` event (or any hook payload whose message/detail text contains failure
keywords: "error", "failed", "exception", "usage limit", "rate limit", "stream disconnected",
"connection", "unauthorized"), cmux keyword-matches the combined message/`additional_details`/
`codex_error_info` text (lowercased) into one of four buckets, each with its own status-line and
subtitle string:
| Match signal | Status (`agent.codex.error.status.*`) | Subtitle (`agent.codex.error.subtitle.*`) |
|---|---|---|
| "usage_limit"/"usage limit"/"rate_limit"/"rate limit"/"credits" | "Codex rate limit" | "Rate limit" |
| "unauthorized"/"auth"/"access token"/"sign in"/"login" | "Codex auth error" | "Auth error" |
| "response_stream"/"stream disconnected"/"connection"/"network"/"offline"/"timed out"/"timeout" | "Codex network error" | "Network error" |
| none of the above | "Codex error" | "Error" |

The notification body is the raw detail/message text, truncated to 220 chars and normalized to a
single line. If no message is present at all, falls back to `agent.codex.error.defaultMessage`
"Codex reported an error". A separate `agent.codex.error.noFinalResponse` "Codex ended before
sending a final response" covers a session that stops without ever producing output.
Also: `agent.codex.status.idle` "Idle", `agent.codex.input.status.needsInput` "Codex needs input" /
`.body.needsInput` "Codex is asking a question" / `.subtitle.waiting` "Waiting",
`agent.codex.completion.subtitle.completed` "Completed" / `.completedInProject` "Completed in %@",
`agent.codex.completion.body.sessionCompleted` "%@ session completed".

### Generic (cross-agent) notification vocabulary
`agent.generic.notification.*` is the fallback status/notification copy for any agent that doesn't
have its own classifier (i.e. every agent besides Codex/Claude): status keys `Idle`, `Running`
(`agent.generic.status.running`), `Interrupted`, `"%@ error"`, `"%@ needs input"`; subtitles
`Completed`, `Error`, `Attention`, `Permission`, `Waiting`; bodies `Approval needed`, `"%@ reported
an error"`, `Task completed`, `The task reported an error`, `Waiting for input`.

### Claude notification subtitle
`agent.claude.completion.subtitle.completed` "Completed" / `.completedInProject` "Completed in %@"
— narrower than Codex/generic; Claude apparently doesn't get its own error-classifier bucket set
(errors presumably fall through Feed instead, consistent with Claude being the agent with the
richest Feed integration per the existing catalog).

### Campfire (multi-agent collaborative session) notifications
Not detailed in the existing catalog beyond Campfire's row in the agent table and one line noting
it "surfaces collaborative moments... as notifications." The actual notification vocabulary
(`agent.campfire.*`):
- `notification.body.joinRequested` — *"%@ is waiting to join the Campfire session"* (another
  participant/agent wants in).
- `notification.body.permissionAsked` — *"%1$@ asked for permission to %2$@"* — the `%2$@` slot is
  filled from a fixed capability vocabulary (`agent.campfire.capability.*`): "run a shell command",
  "browse files", "queue a prompt", "run a prompt now", "interrupt the agent", "add tools or
  skills", with `.fallback` "do something" for an unrecognized capability.
- `notification.body.relayError` — "Campfire relay connection failed".
- `notification.participantFallback` — "Someone" (used when a joining participant's name isn't
  known).

### Hermes
`agent.hermes.notification.body.approvalCommand` — `"%1$@: %2$@"` (an approval-request notification
pairing a label with the command/action text). This is the only `agent.hermes.*` string found;
corroborates the existing catalog's flagged uncertainty (line 583) about how thin Hermes's
notification integration is — Hermes has exactly one notification string versus Codex's ~15.

### Ollama and delivery-target plumbing
- `agent.ollama.displayName` "Ollama" — Ollama is registered as a display name here but doesn't
  appear in the main agent-hooks table in `cmux-04-agents.md`; likely a minimal/local-model
  integration distinct from the CLI-agent roster documented there. Not independently verified
  further (would need to find where Ollama is actually launched/tracked).
- `agent.deliveryTarget.error.*` — internal errors for resolving *which process* a hook
  response/approval decision should be delivered to: "PID must be a positive integer", "pid_
  resolution must be corroborated or controlling_tty", "No live delivery target", "Delivery target
  resolution is unavailable; retry after cmux finishes starting." These are plumbing-level errors
  (would surface as a hook/CLI failure, not normal UI) rather than a user-facing feature.

## Web agent-chat renderer (`agentSession.web.*`) — copy prepared but not wired in this source

This directly answers the "context limit reached" / context-usage question: **no context-usage
bar, percentage, or "context limit reached" state was found anywhere** — not in the Swift bridge,
not in the `agent-chat` React source. The closest things that exist:

- `agentSession.web.autoContext` "Context" — a composer control labeled just "Context" (an
  auto-context toggle, presumably auto-attaching relevant files/IDE state), paired with
  `includeIdeContext` "Include IDE context" and `ideContext` "IDE context". No token count,
  percentage, or limit warning attached to it anywhere found.
- `agentSession.web.rateLimit.*` (12 strings: Primary/Secondary, Weekly/Monthly, "Usage remaining",
  "resets", day/hour/minute format strings) — this is Claude's plan **rate-limit** (5-hour/weekly
  usage window), not context-window/token usage. Also not wired up (see below).

**Finding**: `Sources/Panels/AgentSessionWebRendererCoordinator.swift`'s `app.context` bridge
handler (lines ~349-522) builds a large `copy` dictionary of ~50 localized strings — including all
of `rateLimit.*`, `planMode`, `browseWeb`, `autoContext`, `includeIdeContext`, `ideContext`,
`tools`, all four `permissions.*` labels, `reasoningEffort.high`, `mentionMenuTitle`,
`mentionCurrentWorkspace`, `skillMenuTitle`, `skillPlan`/`skillCodeReview`/`skillResearch`,
`composerNoResults`, `showMore`/`showLess` — and sends it to the embedded web view as
`window.cmuxAgentBridge`'s context payload. Also always sent: `"rateLimitRows": []` — hardcoded
empty, never populated from any live data in this file.

None of these `copy.*` fields, nor `rateLimitRows`, nor the literal text of any of the strings
above, appear anywhere in `agent-chat/src/**` (checked `App.tsx`, `Chat.tsx`, `Composer.tsx`,
`StatusRow.tsx`, `context.tsx`, `session.ts`). The React source in this checkout does not read
`copy.rateLimits`, `copy.planMode`, etc. at all. Two explanations are possible and this pass
can't distinguish them from static reading alone: (a) this `agent-chat/` checkout is behind the
actual shipped bundle (a newer frontend consumes these fields, just not present in this snapshot),
or (b) the feature is prepared server-side but genuinely unshipped/dead in the current build. Flag
this rather than assert either way — but either way, **as of this source, rate limits and a
context-mode toggle are the only "budget" affordances prepared, there is no token-count/percentage
UI, and nothing resembling a red "context limit reached" state exists.**

What *is* actually wired up in `agent-chat/src` and reachable: send/stop/start controls, provider
picker, cwd picker, model/mode/effort/permission-mode inline selects (`INLINE_OPTION_IDS` in
`StatusRow.tsx`: `model`, `context`, `fastMode`, `mode`, `permissionMode` — note `context` is in
this set as a *selectable option*, i.e. a dropdown, not a usage meter), an overflow "More options"
menu, copy-message/copy-output/copy-shell-contents actions, attachment add/remove, voice input,
and a slash-command-style composer with fuzzy filtering (`composerNoResults` "No results" is the
one piece of this group confirmed live, since composer filtering logic exists in `session.ts`/
`options.ts`).

## Corrections to other sections

None found — no other catalog section's existing text was contradicted by source. The one
adjacent note: `cmux-04-agents.md`'s Hermes uncertainty flag (line 583, "may be Vault-only... Flagged
rather than asserted either way") is corroborated, not contradicted, by this pass: Hermes has
exactly one `agent.hermes.*` notification string versus Codex's ~15 and Claude's 2, consistent with
thin notification-hook coverage.

## Coverage note

No strings exist under a literal `hive.` or `skills.` top-level prefix in the TSV — "Hive" isn't a
feature name found anywhere in the 7,524-row string table, and Skills copy lives entirely under
`agentSession.web.skill*` (4 strings, covered above). `cli.vault.*` / `socket.vault.*` (16 strings)
are already fully covered by `cmux-04-agents.md`'s CLI section, so nothing added there. Debug-only
noise excluded per above (70 strings: button-style lab + text-editor lab windows). Not independently
re-verified: live rendering of the Feed/Vault panels in a running app (source-only pass, per
assignment scope), and whether the `agent-chat/` checkout here matches the actually-shipped
bundle (see the web-renderer finding above).
