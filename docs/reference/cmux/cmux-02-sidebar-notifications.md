# Sidebar, attention and notifications

cmux's left sidebar is the vertical workspace/tab list; the right sidebar is a mode-switchable
panel (Files, Find, Vault, Feed, Dock, Cloud, or a custom sidebar). Attention is carried by a
blue pane ring/flash, unread badges, a notification store with panel + menu-bar surfaces, macOS
system notifications, a dock badge, and optional iPhone forwarding.

## Left sidebar (vertical workspace list)

### Row anatomy

Each workspace row is built from an immutable `SidebarWorkspaceRowSnapshot`/`Snapshot` (rebuilt
whenever workspace state changes; rows are `Equatable` and only re-render on an actual value
change). A row can show, left to right / stacked:

- **Leading status slot**: either the unread badge or a loading spinner (mutually exclusive,
  spinner wins while active), each in a fixed square slot.
- **Title** — the workspace's title (custom or default), single or first-line-centered depending
  on layout.
- **Manual task-status glyph** (only when a manual status override is set and the feature is
  enabled) — a small 9pt (scales with font size) circular progress-pie glyph drawn immediately
  before the title.
- **Description** (optional, user-set) and **git branch / directory line(s)** — a vertical
  branch+directory layout when the row is tall enough, else a compact one-line summary.
- **Pull request row(s)** — one or more PR chips (`SidebarWorkspaceSnapshotBuilder.PullRequestDisplay`)
  with number, label, URL, status (`open`/`merged`/`closed`), and a staleness flag.
- **Listening ports** — `[Int]`, rendered as `:<port>` chips (`sidebar.port.label`, format `:%lld`);
  tooltip "Open localhost:%lld"; click opens `http://localhost:<port>`.
- **Latest conversation/log line** — `latestConversationMessage` and a `SidebarLogEntry`
  (`latestLog`) plus arbitrary `metadataEntries`/`metadataBlocks` an agent or extension published.
- **Progress state** — an optional `SidebarProgressState` (e.g. a determinate bar with a label).
- **Active coding-agent count** — `activeCodingAgentCount` feeds the loading-spinner tooltip.
- **Checklist summary** — `checklistCompletedCount`/`checklistTotalCount`/`checklistFirstUncheckedText`,
  clickable to open the checklist (inline or popover per setting).
- **Media activity icons** — speaker/mic/camera glyphs when the workspace's browser panel is
  playing audio, using the mic, or using the camera (see Media activity below).
- **Memory warning badge** — shown when a pane's process tree is using a lot of memory.
- **Trailing status slot** — unread badge, loading spinner, or a close (×) button, in that
  priority, faded in/out with `.transition(.opacity)`.
- **Remote/Cloud badge** — "SSH" pill for SSH-backed workspaces, or a Cloud/device badge
  (`cloudWorkspaceLabel`/`deviceWorkspaceLabel`) with a cloud or desktopcomputer glyph.

### Unread badge

`SidebarWorkspaceUnreadBadge`: a filled circle (accent-colored, per Notification Badge Color
setting) with the **exact unread count** as white/contrasting text centered inside — not just a
dot. Shown in the leading or trailing slot per **Settings → App → Notification Badge Position**
(left/right of the row; default not captured here — see Unverified). A parallel **Loading Spinner
Position** setting controls whether the loading spinner shares the left or right slot. Tooltip
for the spinner: "Loading (1 active task)" (singular) or "Loading (%lld active tasks)" (plural),
localized via `sidebar.agentActivity.tooltip.one` / `.many`.

### Manual task-status glyph

A small circular "pie" progress glyph, drawn only when: the (currently beta, off-by-default)
workspace-todo-controls feature is enabled AND the workspace has a **manual** status override
(automatic/inferred status never draws a row glyph — it only tints the row, e.g. dims a "done"
row). Base size 9pt × font scale, fixed 11pt-wide slot so titles align regardless of stroke width.

Five lanes, in round-robin cycle order `todo → working → needs-attention → review → done → todo`:

| Lane | Display name | Fill fraction | Color | Checkmark |
|---|---|---|---|---|
| `todo` | "Todo" | 0 (outline only) | neutral gray | no |
| `working` | "Working" | 0.5 (pie) | accent blue | no |
| `needsAttention` | "Needs Attention" | 0.5 (pie), thicker stroke (1.4pt vs 1pt) | attention orange-red `rgb(255,107,51)` | no |
| `review` | "In Review" | 0.75 (pie) | green | no |
| `done` | "Done" | 1 (full fill) | muted gray-green `rgb(115,158,128)` | yes, white (or 70%-black on selected/monochrome rows) |

Tooltip: `"<lane> — set manually"` (`sidebar.status.tooltip.manual`) or `"<lane> — inferred"`
(`sidebar.status.tooltip.inferred`) though the inferred variant never actually reaches a row
glyph today (inferred status shows no glyph by design comment).

**Automatic status inference** (`WorkspaceTaskStatus.inferred`, first match wins):
1. Any agent in the workspace is waiting on input → `needsAttention`.
2. Any agent is running → `working`.
3. Any pull request is open → `review`.
4. The workspace has PRs and all are merged/closed → `done`.
5. The git working tree is dirty → `working`.
6. Otherwise → `todo`.

A **manual override** is recorded together with the inference at the moment it was set; if the
live inference later moves away from that recorded value, the override auto-expires back to
automatic ("anti-rot") — this reconciliation runs at explicit mutation/read entry points, not
inside view bodies. Selecting a lane always re-engages the feature (clears "None"); a workspace
can also be set to **"None (hide status)"** (`sidebar.status.none`), which shows no glyph at all
and is distinct from Auto (which still infers, just draws nothing today). `statusHidden` defaults
to `true` on a fresh workspace's todo state.

Cycling: `⌘`-bound `markWorkspaceDone` shortcut and the `cycleWorkspaceStatus`
socket verb / shortcut step one lane forward from the *effective* (override-or-inferred) status.

A compact status menu/popover (`SidebarWorkspaceManualStatusIndicatorMenu`) opens on click,
listing all lanes plus "None"; footnote: "Pinned status clears when activity changes"
(`sidebar.statusPopover.pinFootnote`).

### Checklist (per-workspace todo list)

Each workspace carries a persisted checklist (`WorkspaceChecklistItem`), separate from the
task-status lane. Limits: **max 50 items**, item text trimmed and **capped at 500 characters**;
adding to a full list or an empty-after-trim string is rejected (`checklistFull` / `emptyText`).
Items have state `pending` | `in-progress` | `completed` and origin `user` | `agent`; completed
items are always kept at the end of storage (completed-last invariant preserved across state
changes and moves) and may carry image attachments (`WorkspaceChecklistAttachment`).

- **Checklist style** setting (Settings → Beta Features → Checklist Style): `Inline` (clicking the
  row's checklist summary expands items inline under the row) or `Popover` (opens an anchored
  popover) — default **Popover**.
- Row affordances (sidebar checklist view / popover): Add item, edit item text, mark
  completed/pending, "Mark In Progress", remove item, collapse/expand ("Hide checklist items" /
  "Show checklist items"), attach images (up to — tooltip "Manage images"), open the checklist "as
  Pane".
- **"Checklist complete" notification**: when the checklist transitions from not-fully-complete to
  fully complete (n/n, n>0), cmux posts a workspace-level notification: title **"Checklist
  complete"**, subtitle = the workspace title, body **"Every checklist item is done."** Cooldown-
  keyed per workspace (3s) so two mutation entry points firing in the same tick post once.
- Command palette / context menu: "Add Checklist Item…" (workspace context menu, gated behind the
  todo-controls feature flag).
- **Feature gate**: `WorkspaceTodoFeature.isEnabled` = remote flag OR local beta opt-in
  (`sidebar.beta.workspaceTodos.controls.enabled`, **default false**). When off, existing
  checklist items stay visible/usable but the controls that create items or set status/lanes are
  hidden (per `settings.betaFeatures.workspaceTodoControls.subtitleOff`).
- Dedicated **Todo pane** (`WorkspaceTodoPanelView`/`WorkspaceTodoPanel`, opened via
  `command.openWorkspaceTodoPane` "Open Todo Pane" or `cmux todo open`): empty state
  "No checklist items yet." (`workspaceTodoPane.emptyChecklist`); shows "This workspace is no
  longer available." if the workspace was closed while the pane was open.
- CLI: `cmux todo add/list/check/start/set/open` etc. (see `cli.todo.usage` strings); `<index>` is
  the 1-based number from `cmux todo list`, `<id>` is the item UUID.

### Pull requests

Each PR row shows a status word — "open" / "merged" / "closed" — (`sidebar.pullRequest.status*`),
a `#<number>` label, and opens the PR URL on click (tooltip "Open %1$@ #%2$lld" —
`sidebar.pullRequest.openTooltip`). `workspace.pr`/`prs` carry `{number, label, url, status,
stale, branch}`; the first PR is shown by default, `prs` holds every PR known for the workspace.

### Ports

`workspace.ports`/`portCount` (also per-tab `tabs[i].ports`). Backed by `PortScanner`, a batched
`ps -t <ttys>` + `lsof -p <pids>` scanner (not per-shell polling): each terminal sends a
lightweight `report_tty`/`ports_kick`; the scanner **coalesces kicks for 200ms**, then runs a
**burst of 6 scans** at offsets `0.5s, 1.5s, 3s, 5s, 7.5s, 10s` after the coalesce fires, so a
newly-opened port a dev server takes a moment to bind to is still caught. A port that stops
appearing is retained for **2 more scan misses** before being retired from the row (avoids
flicker from a transient miss). Agent-owned (non-TTY-attached) process trees are rescanned on a
separate **2-second** periodic timer. Clicking a port chip opens `http://localhost:<port>`.

### Groups

See **Workspace groups** section below (same document covers sidebar rendering + CLI + config).

### Sidebar tree grouping (top-level sections)

Rows are organized into implicit sections in the sidebar tree, with generated headers/subtitles:
- **Pinned** — pinned top-level rows (workspaces and groups), always first.
- **Other** — the default bucket; subtitle "No folder" when a workspace has no folder/project.
- **Remote** — subtitle "SSH".
Within the pinned/unpinned tiers, groups and workspaces keep the order dragged into them (see
Workspace Groups doc, "sidebar layout" section).

### Row states, badges, and protections

- **Muted workspace**: tooltip "Notifications muted for this workspace" (`sidebar.mutedWorkspace.tooltip`);
  toggled from the row/context menu ("Mute Workspace Notifications" / "Unmute…", singular or
  plural for a multi-selection).
- **Pinned + protected**: a pinned workspace's close is guarded; tooltip "Pinned workspace —
  protected from Close" (`sidebar.pinnedWorkspaceProtected.tooltip`).
- **Memory warning**: accessibility label "High memory warning"; tooltip "A pane in this workspace
  is using a lot of memory" (`sidebar.memoryWarning.tooltip`) — tied to Settings → Terminal →
  Memory Guardrail, which "warns you with a badge and a banner when one pane's process tree uses
  too much memory, so a single leak can't crash the whole app."
- **Remote/SSH connection state**: help text per state — "Remote connected to %@" / "Remote
  connecting to %@" / "Remote disconnected from %@" / "Remote error for %@[: %@]" / "Remote
  reconnecting to %@"; when an SSH host is unreachable: "SSH host %@ is unreachable. Automatic
  reconnect is paused — use Reconnect to retry." with a **Reconnect** button (`sidebar.remote.*`).
- **Media activity** (browser panel in a workspace): three independent glyphs, shown together
  when multiple are active —
  - Playing audio: `speaker.wave.2.fill`, tooltip "Playing audio", tinted per-row accent color.
  - Microphone in use: `mic.fill`, orange, tooltip "Microphone in use".
  - Camera in use: `video.fill`, green, tooltip "Camera in use".
- **Loading spinner**: shown while the workspace has active tasks; replaces the unread badge in
  whichever slot both share (leading or trailing per the Loading Spinner Position setting).

### Drag, reorder, multi-select, rename

- Rows are drag-reorderable (`SidebarWorkspaceDragCandidate`/drag source monitor/reorder overlay);
  accessibility hint: "Activate to focus this workspace. Drag to reorder, or use Move Up and Move
  Down actions." Accessibility actions "Move Up"/"Move Down" duplicate drag-reorder for
  non-pointer users.
- Inline rename: double-click or context-menu "Rename Workspace…" turns the title into an
  editable field (`SidebarInlineRenameField`/`Coordinator`); accessibility label "Rename
  workspace".
- Multi-selection: shift/cmd-click selects multiple rows; most context-menu actions pluralize
  their label and act on every selected id (`isMulti` branches throughout
  `TabItemWorkspaceContextMenuContent`).

### Row context menu (right-click a workspace row)

Full menu, top to bottom (workspace or workspaces, singular/plural labels swap automatically):
Pin/Unpin Workspace(s) → Mute/Unmute Workspace Notifications (bell/bell.slash icon) → workspace
**group** section (New Empty Workspace Group / New Group from Workspace / New Group from
Selection, etc. — see Workspace Groups) → divider → **workspace todo section**: Status submenu
(Auto, then the five lanes, then a divider, then "None (hide status)"; checkmark marks the
current selection), "Mark Workspace(s) as Done" (shortcut-bound), "Add Checklist Item…" → divider
→ Rename Workspace… (shortcut-bound) → Remove Custom Workspace Name (only if a custom title is
set) → Edit Workspace Description… (shortcut-bound, single-selection only) → Clear Workspace
Description (only if set) → [if remote targets present] Reconnect Workspace(s) / Disconnect
Workspace(s) → Workspace Color submenu (Clear Color if set, Choose Custom Color…, divider, a
palette of preset swatches with a checkmark on the active one) → [if an SSH error exists] Copy SSH
Error → divider → Move Up / Move Down (disabled at the list ends) → Move to Top → Move Workspace(s)
to Window submenu (New Window, then every other open window) → divider → Close Workspace(s)
(shortcut-bound) → Close Other Workspaces (disabled if only one workspace or all are selected) →
Close Workspaces Below / Above (disabled at the ends) → divider → Mark as Read / Mark as Unread
(disabled per current read state) → Clear Latest Notification(s) (disabled if none) →
**Notifications submenu** (per-notification list for the target workspace(s); "No Notifications"
disabled item when empty; each entry title = `<•><time>  <title>` on the first line with a wrapped
detail line, `•` prefix marks unread, text truncated at 80/120 chars with "...") → divider → Copy
Workspace ID(s) → Copy Workspace Link(s) → [single-selection only] Show in Finder (disabled if no
directory).

## Right sidebar

Toggled with `⌘⌥B` (per `rightSidebar.toggle.tooltip`). Modes (`RightSidebarMode`), each with a
label/SF Symbol and (except Custom) a dedicated shortcut action:

| Mode | Label | Symbol | Notes |
|---|---|---|---|
| `.files` | "Files" | `folder` | can also open as a Bonsplit pane |
| `.find` | "Find" | `magnifyingglass` | can also open as a pane |
| `.sessions` | "Vault" | `books.vertical` | can also open as a pane |
| `.feed` | "Feed" | `dot.radiowaves.left.and.right` | agent decision/approval feed (see feed.md, out of this scope except as it touches notifications) |
| `.dock` | "Dock" | `dock.rectangle` | cannot open as a standalone pane |
| `.machines` | "Cloud" | `cloud` | Cloud tree; can also open as a pane |
| `.customSidebar` | "Custom" | `wand.and.stars` | a user-authored sidebar file rendered in the right sidebar; no dedicated shortcut |

- **Open as Pane**: any pane-capable mode can be popped out of the right sidebar into a normal
  Bonsplit split ("Open %@ as Pane" / tooltip "Open as pane").
- **Customize Tabs…** menu entry reorders/hides the mode bar's tabs.
- Close button: accessibility label "Close Right Sidebar".
- Remote/CLI errors surfaced through `right_sidebar` socket verb, e.g. "Custom sidebars are
  disabled (enable them in Settings → Beta Features)", "No custom sidebar named '%@' in
  ~/.config/cmux/sidebars", full usage strings for `toggle|show|hide|focus|set|mode`.
- `rightSidebar.mode.pendingHelp` — "%@ · %#@count2@" — a pending-count help string layered on a
  mode's label (exact plural text not resolved from strings dump; see Unverified).

### Custom sidebars (extensions)

Two independent mechanisms, both reachable from the left sidebar's toggle-button right-click menu
and via `cmux right-sidebar set custom <name>` / `cmux sidebar open <name>`:

**1. Interpreted custom sidebars** (`docs/custom-sidebars.md`) — user-authored files under
`~/.config/cmux/sidebars/<name>.{js,swift,json}`, interpreted at runtime with no build step, and
hot-reloading on save. Gate: **Settings → Custom Sidebars**, `customSidebars.beta.enabled`, on by
default; while off, custom sidebars do not appear at all.
- `.js` — a JavaScriptCore "reactive scene" runtime: builds a retained scene graph once, then only
  re-renders bindings whose signal changed (fastest, supports `Reorderable` drag-and-drop with
  stable per-key identity, `.contextMenu`, `.marquee`, `.fade`, hover-background, etc).
- `.swift` — a single SwiftUI-style view expression, interpreted (no `struct`/`var body`), a
  larger but not-yet-fully-reactive subset of SwiftUI (containers, shapes, most modifiers, `if`,
  `for`, `ForEach`, ternary, arithmetic, array/string methods; missing `@State`-driven controls
  like `TextField`/`Toggle`/`Slider`/`Picker`, `switch`, custom structs, gradients,
  navigation/sheets, `.keyboardShortcut`).
- `.json` — declarative, static-only.
- Priority when multiple share a base name: `.js` > `.swift` > `.json`.
- Live read-only data context (`workspaces`, `tabs`, `workspaceCount`, `selectedTitle`,
  `selectedId`, `unreadTotal`, `clock`), refreshing ~1×/second; actions run via `cmux(method,
  params)` through the same v2 socket dispatcher the `cmux` CLI uses.
- **Renderer choice**: **in-process** (default; native SwiftUI mount, full hover/focus/keyboard) or
  **remote** (out-of-process worker; contained against a crash/hang from an untrusted file, but
  input limited to forwarded clicks — no hover/focus/keyboard; also does not honor a `glass`
  surface request). Set via Settings → Custom Sidebars or `customSidebars.renderer` in
  `cmux.json` (`"inProcess"` default | `"remote"`), read live (no restart needed).
- Both renderers protect the host with an evaluation budget (nesting depth, node count); an
  over-budget render is discarded and the previous good render stays up.
- Right-sidebar panel variants ship as examples: `panel-info`, `panel-sessions`, `panel-todo`,
  `panel-subagents`, five agent-roster layouts (`agents-board`, `agents-cards`, `agents-timeline`,
  `agents-focus`, `agents-dense`), `kitchen-sink`.
- **Planned, not shipped** (`docs/data-driven-sidebar-plan.md`): projecting the full 248-method v2
  command surface and the whole `CmuxEventBus` event stream into the interpreter (currently only 4
  hand-built data keys plus a narrow action allowlist). Marked as a roadmap with open waves and an
  undecided security question (whether authored sidebars get every command by default). Treat
  everything in that doc as **not-yet-built** unless corroborated elsewhere.

**2. Compiled ExtensionKit sidebars** — real, sandboxed, out-of-process Swift extensions (see
`Examples/SampleSidebarExtensionApp`, `CmuxInstalledExtensionSidebarHostView.swift`). Distinct
lifecycle/permission model:
- **Access levels**: an extension starts with metadata-only access; "Limited extension access"
  dialog explains "%@ is using metadata-only access until you grant its requested data and
  actions," with "Grant Requested Access" / "Keep Limited" buttons; a limited extension's status
  badge reads "Limited" (help: "This extension has limited access.").
- **Permission scopes** requestable: Close workspaces, Create workspaces with paths, Select
  workspaces, Open URLs, plus **read** scopes: Network ports, Notifications ("Read latest
  workspace notifications"), Pull requests, Workspace metadata (names/branches/unread
  counts/selection), Workspace paths.
- **Blocked states**, each with a status string and detail text: connection interrupted,
  configuration ("manifest") failed to load, invalid configuration, configuration timed out,
  missing configuration — e.g. "CMUX lost the extension connection. No workspace data or actions
  are being shared." Title in every case: "Extension Blocked."
- **Details popover**: Bundle, Status (Connected/Waiting for an enabled extension), Configuration,
  Permissions (Granted/Pending), "Secure extension connection" runtime label.
- Extension action failures surface as toast-like row text: "Workspace could not be closed,"
  "Extension action is not granted," "Extension connection is no longer active," "Surface could
  not be created," "Surface not found," "URL could not be opened," "Workspace not found."
- Empty/error/loading states: "No sidebar extension enabled" / "Install and enable a CMUX sidebar
  extension to show it here," "CMUX could not load sidebar extensions," "Loading sidebar
  extensions," "Choose a sidebar extension" (picker when more than one enabled extension exists).
- **Manage Sidebar Extensions...** menu entry; **Use Workspace Sidebar** reverts to the built-in
  (non-extension) sidebar.

### Sidebar "Help" menu (footer)

`sidebar.help.*`: **Help** button opening **Changelog**, **Discord**, **GitHub Issues**, **Send
Feedback** (a full feedback form: email, message, up to 10 image attachments each ≤4MB, various
validation errors — invalid email, empty message, message too long, too many/large images — rate
limiting, and a fallback "Feedback is unavailable right now. Email founders@manaflow.com
instead."). Welcome text: "Welcome to cmux!"

### Account / team switcher (sidebar footer)

`sidebar.account.*`: shows "<name>, <team>" or "<name>, active" for the active account; "Create
team…" flow with inline name field, "No team" state, "<team> · Pro" plan suffix, loading state
"Loading teams…", and generic failure text "Could not create/switch that team. Try again."

### Sidebar width, appearance, collapse

- Default and minimum sidebar width: **240pt**. The user-configurable minimum (Settings) ranges
  **120–260pt**; maximum width **600pt**, also clamped to **at most 1/3 of the window's width**.
  Below ~400pt window height the footer (account/help/update pill) starts to overlap workspace
  rows, so window resizes are clamped before that happens.
- **Active-tab indicator style** setting: "Left Rail" or "Solid Fill" (`sidebar.activeTabIndicator.*`
  / `sidebar.indicator.*` — same two options appear under two different key prefixes).
- **Sidebar font size** setting controls "workspace titles, metadata, badges, and shortcut hints in
  the left sidebar."
- Sidebar appearance also supports "liquid glass" translucent presets (e.g. Raycast Gray, HUD
  Glass) configured in Settings, which a custom sidebar can opt into via `surface: "glass"`.
- Drag-to-resize divider; hovering shows an occlusion-aware resizer per
  `SidebarResizerOcclusionResolver`.

## Notifications

### Sources

A notification is produced by: `cmux notify` (CLI/hooks), OSC 9/99/777 terminal escape sequences
from a running program, cmux's own built-in agent "prompt-turn" completion detection, or (inside a
cmux Cloud machine) `cmux-tui`'s `notification create`, relayed to the Mac over the existing event
stream.

### Notification data model (`TerminalNotification`)

Fields: `id`, `tabId` (workspace), `surfaceId`/`panelId`, `retargetsToLiveSurfaceOwner` (whether a
notification follows its pane if the pane moves workspace before it's read/cleared),
`correlationKey` (lets a producer clear exactly one notification it created, without touching
newer ones on the same surface), `title`/`subtitle`/`body`, `createdAt`, `isRead`, `paneFlash`
(whether arrival should also flash the pane), `scrollPosition` (where in the terminal scrollback
the notification points), `clickAction` (`revealInFinder(path:)` or default: open the pane),
`replyShape` (whether/what kind of reply UI to show for an agent needs-permission-style
notification), `soundContext` (per-agent/alert-type sound override), `origin` (`local` |
`ssh-relay:<uuid>` | `cloud-vm:<machine>` — a remote origin clamps the notification to
display-only side effects; remote text is treated as untrusted).

### Delivery/gating pipeline

1. **Agent-category gate** (`agentNotificationShouldDeliver`) — only for agent-tagged
   notifications (category parsed from a `c=<category>;p=<0|1>[...]` metadata suffix the agent
   hook appends). Legacy/uncategorized notifications (codex, grok, antigravity, or any
   pre-metadata client) always pass through unchanged.

   | Category | Meaning | Gate | Setting | Default |
   |---|---|---|---|---|
   | `needs-permission` | agent is blocked waiting for a tool-use approval | delivered iff `notifications.agentPermissionPrompt` | "Notify when an agent is blocked waiting for permission" | **on** — "this is the one alert the user must act on to unblock the agent" |
   | `turn-complete` | an agent turn ended | delivered per `notifications.agentTurnComplete` = `always` (every turn) / `never` / `whenIdle` (suppressed if the turn ended with background work still pending) | Turn-complete mode | **`whenIdle`** |
   | `idle-reminder` | agent has been idle ~60s after a turn ended | delivered iff `notifications.agentIdleReminder` AND not pending | "Notify when an agent has been idle-waiting for input" | **on** |
   | `other` | legacy/uncategorized | always delivered | — | — |

2. **Focus/mute admission** (`TerminalNotificationDeliveryDecision.resolve`) — three outcomes:
   - **`.muted`** — the workspace is muted: every effect suppressed before history, badges, phone
     forwarding, commands, or UI delivery can observe it at all.
   - **`.focusedInline`** — app is focused AND it's the active tab AND the focused surface: the
     desktop banner, sound, and pane flash are suppressed, but history/unread state and the
     custom-command hook effect still fire (it still shows up in the notification list).
   - **`.externalDelivery`** — otherwise: full delivery (banner, sound, flash, phone-forward
     eligible).
3. **User hooks** (`cmux.json` `notifications.hooks`) — off by default; only run when at least one
   hook is configured. Each hook is a shell command that receives the full notification-policy
   JSON on stdin (`version`, `notification`, `context` incl. `appFocused`/`focusedPanel`, `agent`
   context object, `origin`, and an `effects` bag: `record`, `markUnread`, `reorderWorkspace`,
   `desktop`, `sound`, `command`, `paneFlash`) and can return a patch JSON on stdout to flip any
   `effects` flag. Global hooks (`~/.config/cmux/cmux.json`) run first, then project hooks from
   parent directories (subject to the existing project-`cmux.json` trust prompt); a project's
   `notifications.hooksMode: "replace"` drops inherited hooks. `agent`/`origin` are read-only —
   patches to them are silently ignored. On hook failure/timeout/invalid JSON, cmux falls back to
   default behavior and posts an in-app alert: title **"Notification Hook Failed"**, body "cmux
   used default notification behavior because '%@' failed." `automation.suppressSubagentNotifications`
   (on by default) drops nested-subagent completion events **before** they even reach hooks.

### Visual/audio effects on delivery

- **Blue pane ring** (persistent attention indicator, `notificationRingStyle`): a rounded-rect
  stroke, **line width 2.5pt**, 2pt inset, 6pt corner radius, color **systemBlue** by default (or
  the hex in `notifications.paneFlashColor` when set), glow opacity **0.35**, glow radius **3**.
  Toggled by **Settings → Notifications → "Unread Pane Ring"** ("Show a ring around panes with
  unread notifications"), **default on**.
- **Pane flash** (transient burst on arrival/dismiss/navigation): same stroke geometry, glow
  opacity **0.6**, glow radius **6** (louder than the persistent ring). Toggled by **"Pane
  Flash"** setting, **default on**; reasons: `navigation`, `userInitiated`, `notificationArrival`,
  `notificationDismiss`, `unreadIndicatorDismiss`, `debug`. A `navigation` flash is suppressed if
  another pane already has a competing unread/flash indicator; every other reason always flashes.
- **Notification color override**: `notifications.paneFlashColor` — empty string default keeps
  systemBlue; a `#RRGGBB` hex recolors both the ring and the flash. Settings label: "Notification
  Badge" color under Workspace Colors ("Color of the unread notification badge on workspace
  tabs.") and "Color of the attention ring and pane flash when a pane needs input" for the ring's
  own color setting.
- **Sound**: `notifications.sound` (default `"default"`), or a custom sound file
  (`notifications.customSoundFilePath`), plus a sparse per-agent × per-alert-type override matrix
  (`notifications.soundOverrides`, JSON, default `{}`).
- **Dock badge**: `NSApp.dockTile.badgeLabel` = the unread count, capped at **"99+"** past 99, or
  `nil` when the count is 0 or the setting is off. Setting **"Dock Badge"**
  (`notifications.dockBadge`), **default on**. When a dev/CI build carries a tag (`TaggedRunBadgeSettings`),
  the badge becomes `"<tag>"` or `"<tag>:<count>"` instead of a bare number. No dock **bounce**
  (`requestUserAttention`) was found in the notification path — see Unverified.
- **Menu-bar (status) icon badge**: a custom-drawn overlay on the menu-bar glyph, count capped at
  **"9+"** past 9 (different cap from the dock badge and the sidebar row badge, which both use
  99+/exact respectively). Tooltip: "cmux: 1 unread notification" / "cmux: %lld unread
  notifications".
- **Sidebar row / workspace-level unread**: exact count in a filled circle (no cap observed in the
  badge view itself — `Text("\(unreadCount)")`).
- **Phone forwarding** (see below) — suppressed entirely by `.muted`/`.focusedInline`
  dispositions (`suppressesPhoneForward`).

### Auto-withdraw / suppression nuance

By default, cmux withdraws a delivered banner as soon as its **workspace** becomes
visible/active — which can retract a still-unread banner for a *different, non-focused* surface
in that same visible workspace (e.g. a second agent pane) before the user notices it. Opt-in flag
`notifications.suppressOnlyFocusedSurface` (default **false**) narrows auto-withdraw to only the
exact focused surface, matching the delivery gate exactly; a banner for a non-focused surface then
stays up until that surface itself is focused or the banner is explicitly dismissed/clicked.
Workspace-visible-but-not-focused surfaces, and surfaces in non-visible workspaces, always keep
their banners regardless of this setting; explicit "mark workspace read" and click/type-to-clear
are unaffected either way.

### Notification panel (in-app, right sidebar "Feed"-adjacent surface / `NotificationsPage`)

- **Header**: "Notifications" title; when any notification exists, a "Jump to Latest Unread"
  button (disabled when nothing is unread; shows its keyboard shortcut as a badge) and a "Clear
  All" button.
- **Phone-forwarding row** (always visible at the top): a toggle "Forward notifications to my
  iPhone" — "Send local agent notifications to cmux on your iPhone. Enabled by default; turn this
  off to stop this Mac from forwarding them." When on, reveals: a picker "When to send" → "Only
  when away from this Mac" (default) or "Always"; when set to "Only when away," an explanatory
  caption computed from `MacPresenceMonitor.recentHardwareInputThreshold` — "Away means the screen
  is locked or asleep, the screensaver is running, or there has been no keyboard or mouse input
  for %lld minutes." — and a secondary toggle "Hide content (send a generic message instead of the
  terminal text)".
- **Empty state**: bell-slash icon, "No notifications yet" / "Desktop notifications will appear
  here for quick review."
- **Workspace-unread-indicator-only state** (unread exists but no discrete notification rows —
  e.g. manual unread marks): bell-badge icon with a dynamic "state hint" title.
- **Notification list**: each row shows an unread dot (filled accent when unread, hollow/dim
  when read), title, time (short format), body (up to 3 lines), and the owning workspace's title;
  clicking opens/focuses the source pane; a small × button and a right-click menu offer **Open**,
  **Copy** (copies formatted notification text), and **Dismiss** (destructive). Rows are
  keyboard-navigable (arrow/tab focus) with return/space as the default action.
- Resizable panel: "Resize notifications" drag handle, hint "Drag to resize the notifications
  popover."

### Menu-bar (status item) notification list

A smaller popover variant (`NotificationPopoverRow`) reachable from the macOS menu-bar icon:
56pt-tall rows, an unread-accent leading stripe, workspace title as the primary line (falling back
to the notification's own title if no workspace title), the notification title as a secondary
line, up to 2 lines of body, relative time, a hover-revealed × "clear" button, and the same
Open/Copy/Mark-as-Read-or-Unread/Dismiss context menu. Status-menu items: "Show cmux", "Show
Notifications", "Search All Windows...", "Task Manager...", "Keep Mac Awake" (caffeinate toggle),
"Sleepy Mode" / "Sleepy Mode Settings…", then the notification section: "Jump to Latest Unread",
"Mark All Read", "Clear All", state-hint text "No unread notifications" or "%lld unread
notifications" (singular: "1 unread notification").

### Navigation shortcuts

- **`⌘⇧U`** ("Cmd+Shift+U") — jump to the latest unread notification.
- **`⌃⌘U`** ("Ctrl+Cmd+U") — mark the current item as the oldest-unread boundary and jump to the
  next latest unread (a "seen up to here" advance).
Both are rebindable in **Settings → Keyboard Shortcuts** and in `cmux.json`.

### CLI surface

```
cmux notify [--title][--subtitle][--body][--reply][--clear][--workspace][--surface][--window]
cmux list-notifications
cmux dismiss-notification (--id | --all-read)
cmux mark-notification-read (--id | --workspace [--surface] | --all)
cmux open-notification --id
cmux jump-to-unread
cmux clear-notifications [--workspace][--surface][--window]
cmux set-status <key> <value>
cmux clear-status <key>
```
Also supports a compatibility form (`--tab`/`--panel`) for older scripts, `--id-format uuids`, and
`--clear` to clear only the posting surface's own notifications (same caller resolution as
`notify`).

### Inside a cmux Cloud machine

`cmux notify` also works inside a Cloud VM. It posts into the machine's own `cmux-tui` session,
tagged with the terminal it ran in; the Mac reads it off the event stream it already follows for
that machine and shows it on whichever pane currently displays that terminal — or, if no pane
shows it (a detached `cmux vm agent` run, or a closed pane), as a **workspace-level** notification
wherever the machine is being looked at. If no local workspace is bound to the machine at all,
only a dot on the Cloud tree shows, and delivery waits for a placement. Machine notifications:
- Honor `--title`/`--body`/`--level info|warning|error`; `--subtitle` folds into the body (no
  subtitle field in cmux-tui) and the **machine's name becomes the Mac-side subtitle**.
- Ignore `--workspace`/`--surface`/`--window`/`--tab`/`--panel`/`--reply` (the Mac decides
  placement; a machine never sees Mac-side ids).
- Text is treated as **untrusted**: escape sequences, control characters, bidi/invisible
  characters stripped; **title capped at 128 bytes, body at 1 KiB**; rate-limited to a **burst of
  5, refilling at 1/second**, with identical text within 5 seconds collapsed.
- Still get a banner, sound, sidebar unread marker, and phone forwarding, and still run the user's
  **global** `~/.config/cmux/cmux.json` hooks/`notifications.command` (with
  `CMUX_NOTIFICATION_ORIGIN=cloud-vm:<machine>`), but never get a reply affordance, click action,
  agent context, or a *project*-local `cmux.json`'s hooks.
- Read state is **per client**: each row tracks which client ids acknowledged it
  (`notification.ack`); a second Mac attached to the same machine keeps independent unread state,
  and the machine's own TUI keeps its own separate console marker. A notification posted while the
  Mac's connection was down still arrives on reconnect; a daemon restart on the machine does not
  lose it.

### Environment variables set in child shells

`CMUX_SOCKET_PATH`, `CMUX_TAB_ID`, `CMUX_PANEL_ID`; and (for agent-tagged notifications reaching
hooks) `CMUX_NOTIFICATION_AGENT_KIND`, `CMUX_NOTIFICATION_AGENT_CATEGORY`,
`CMUX_NOTIFICATION_AGENT_PENDING` (0/1), `CMUX_NOTIFICATION_AGENT_IS_SUBAGENT` (0/1),
`CMUX_NOTIFICATION_ORIGIN` (`local` | `ssh-relay:<uuid>` | `cloud-vm:<machine>`).

## Workspace groups

Collapsible named sections nesting several workspaces under one header row in the sidebar.

- **Anchor workspace**: every group is owned by exactly one workspace, the anchor; the group
  header row IS the anchor's own row (no separate header row exists). Clicking the header name
  focuses the anchor's panels; clicking the chevron toggles collapse. A group's anchor is always a
  **brand-new** workspace at creation time — grouping a selection never promotes an existing
  workspace into the anchor role. Closing the anchor **promotes the next member** to anchor
  (keeping the group and its other members intact, now showing the group name as its header); if
  the anchor was the group's only member, the group is removed entirely.
- **Identity**: `name`, `iconSymbol` (SF Symbol, default `folder.fill`), optional `customColor`
  hex; automation may set an `external_id`/`idempotency_key` (caller-owned, window-scoped) so
  repeated `workspace.group.create` calls are idempotent. Names are not unique identities.
- **Pinning**: independent of individual workspace pins; pinned top-level rows (workspace or
  group) sort above unpinned ones; within a tier, order follows drag position.
- **Creation**:
  - `⌃⌘G` — new empty group, auto-named "Group 1", "Group 2", …
  - `⌘⇧G` on a multi-selection of ≥2 workspaces — groups the selection (only fires with an
    explicit sidebar multi-selection; otherwise the chord falls through to React Grab, its
    upstream collision).
  - Workspace row context menu: "New Empty Workspace Group", "New Group from Workspace", "New
    Group from Selection".
  - Group header context menu: "Rename Group…", "Pin/Unpin Group", "Edit Group Config…" (opens
    `cmux.json`), "Open Workspace Groups Docs", "Ungroup Workspaces" (keeps workspaces, removes
    the container), "Delete Group" (closes the header workspace and every member; prompts for
    confirmation if the group has children).
  - Group header's trailing **`+`** button (hover to reveal): click creates a new workspace in the
    group at the anchor's cwd; right-click offers "New Workspace in Group", "Edit Group Config…",
    "Open Workspace Groups Docs".
  - `⌘N` from inside a group also creates within it.
- **New-workspace placement** inside a group: `afterCurrent` (default; right after the active
  in-group member, or top if there's no reference), `top` (right after the header), `end` (after
  the last member) — resolvable per explicit CLI/API arg → per-cwd `cmux.json` config → global
  Settings → App → "Group New Workspace Placement" default.
- **Context-menu strings**: Clear Latest Notifications, Delete Group, Edit Group Config…, Mark All
  Workspaces in Group as Read/Unread, Mark Group as Read/Unread, Open Workspace Groups Docs, Pin
  Group / Unpin Group, Rename Group…, Ungroup Workspaces.
- **CLI**: `cmux workspace-group list|create|ungroup|delete[--close-workspaces]|rename|collapse|
  expand|pin|unpin|add|remove|set-anchor|new-workspace`.
- **Config** (`~/.config/cmux/cmux.json`, `workspaceGroups.byCwd`): per-directory (glob or
  longest-prefix match) color, icon, `newWorkspacePlacement`, and a custom `contextMenu` entry
  list referencing named actions or built-ins.
- **"iMessage mode" group behavior is planned, not shipped**: two knobs, `sortInsideGroups`
  (default true) and `floatGroups` (default false), are documented as intent but explicitly "not
  wired up yet" — current builds ignore groups when sorting by latest-unread.
- **Persistence**: groups round-trip through the session snapshot alongside workspaces
  (name/anchor/pin/collapse/color/icon/external-identity/anchor-provenance); membership lives on
  `Workspace.groupId`.

## Workspace auto-naming

Opt-in AI-generated short names for workspaces/tabs from live agent conversation content, **off by
default** (`automation.workspaceAutoNaming`, Settings → Automation → Workspace Auto-Naming).

- At the end of an agent turn, cmux summarizes recent conversation into a **2–5 word** title (in
  the conversation's own language) and applies it; if the workspace has multiple tabs, the agent's
  own tab is named too.
- Refreshes are throttled by transcript growth and a minimum interval, so quiet/single-topic
  sessions converge to a stable name instead of re-summarizing repeatedly.
- Runs through the user's own already-authenticated agent binary per session type: `claude -p`
  (model from `ANTHROPIC_SMALL_FAST_MODEL` or the fast default), `codex exec
  --output-last-message`, `grok --prompt-file` (tools/web search disabled), `opencode run --pure`,
  `pi --print --no-tools`, `omp --print --no-tools`. A machine missing one of these binaries just
  skips that adapter.
- **Manual names always win**: any name set by the user (sidebar rename, command palette, `cmux
  rename-workspace`/`rename-tab`, Claude's `/rename`) is never overwritten, and auto-naming stops
  for that workspace/tab from then on; pre-existing custom titles from before this feature existed
  restore as user-set. Clearing a custom name (sidebar, palette, or `cmux workspace-action
  --action clear-name`) re-opens that workspace/tab to auto-naming. OSC terminal titles never
  override any custom title (unchanged prior behavior).
- Fails silently: no binary on PATH, a timeout, or an unsupported backend just means the name does
  not change; never blocks the agent (Claude's pass is an async hook; other adapters run detached).
- Currently **skipped** for Amp (no usable transcript exposed), Gemini (untrusted tool-capable
  CLI), and Cursor/Antigravity/Kiro/Rovo Dev/Hermes Agent/Copilot/CodeBuddy/Factory/Qoder (no
  verified safe transcript+summarizer pairing yet).
- Mechanics: Claude registers an async `Stop` hook (`cmux hooks claude auto-name`); other agents
  spawn an equivalent detached pass from their own turn-end hook; each pass reads the adapter's
  transcript, checks throttle state in `~/.cmuxterm/<agent>-hook-sessions.json`, and applies the
  title through the `workspace.set_auto_title` socket method (which enforces the setting and the
  user-provenance rule app-side, not client-side).

## Unverified / unclear

- Exact **default** side (left vs. right) for the Notification Badge Position and Loading Spinner
  Position settings was not confirmed from the code read (only that the settings exist and are
  independently configurable).
- `rightSidebar.mode.pendingHelp` ("%@ · %#@count2@") — the exact pluralized text and which right
  sidebar mode(s) show a "pending" count were not traced to their call site.
- No macOS dock **bounce** (`NSApp.requestUserAttention`) was found anywhere in the notification
  delivery path during this pass — only the dock badge label. If bounce exists it is not wired
  through the paths read here.
- `docs/data-driven-sidebar-plan.md` is explicitly a roadmap ("Waves A–D", "open decision") for
  exposing the full command/event surface to interpreted sidebars; only the current, narrower data
  context and action surface documented in `docs/custom-sidebars.md` is confirmed as shipped.
- Workspace-group "iMessage mode" (`sortInsideGroups`/`floatGroups`) is explicitly documented as
  not wired up yet — listed here for completeness, not as a current behavior.
- The precise cap (if any) on the in-panel `NotificationsPage` unread badge count was not found;
  only the menu-bar (9+) and dock (99+) caps were confirmed.
- `statusMenu.profiling.*` (a large block of strings around an Instruments-based performance
  capture/email-submission flow reachable from the status menu) is a developer/debug tool, not a
  notification feature; included in the raw strings grep but out of this catalog's scope and not
  detailed above.

## Coverage note

This catalog focused on: the left sidebar workspace row (every field, badge, glyph, context menu
entry), workspace task-status and checklist mechanics, port scanning, workspace groups, workspace
auto-naming, the right sidebar's modes and both custom-sidebar mechanisms, and the full
notification pipeline (gating rules, visual/audio effects, panel/menu-bar/CLI/Cloud-machine
surfaces, hooks). Not independently re-verified here: the Feed panel's own approval-banner UI
(covered by `docs/feed.md`, referenced only where it intersects notification hooks), the Vault
(sessions) and Dock right-sidebar modes' own internals beyond their mode-bar presence, and the
Cloud/machines tree's non-notification UI. Settings pages were read only where a `notifications.*`
or sidebar-appearance key's default value was needed for this catalog, not exhaustively.
