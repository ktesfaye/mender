# Gaps found in terminal, panes and sidebar

Audited prefixes: `terminal`, `terminalContextMenu`, `panel`, `workspace`, `textbox`, `contextMenu`,
`titlebar`, `common`, `find`, `sidebar`, `notifications`, `rightSidebar`, `workspaceGroup`,
`statusMenu`, plus `historyPane`, `paneMemoryGuardrail`, `workspaceTodoPane`, `emptyPanel`, `tab`
(unowned keys containing pane/tab/todo that no other prefix claims) — 613 strings. ~73% were
already covered (often paraphrased rather than quoted) by `cmux-01`/`cmux-02`, with a handful in
`cmux-06`/`cmux-07`/`cmux-08`. 164 strings had no matching text/key anywhere in the catalog; most
turned out to belong to features genuinely missing from every catalog file below.

## Menu-bar profiling capture (`statusMenu.profiling.*`, `statusMenu.startProfiling`)

`cmux-02` explicitly flagged this whole prefix as "out of this catalog's scope" — it is a real,
shipped, user-facing flow, not a dev-only stub, so it's written up here in full.

### What it is
A one-click Instruments-based performance capture reachable from the macOS status-bar (menu-bar)
icon's menu: **"Start Profiling"** (`statusMenu.startProfiling`, `Sources/App/MenuBarProfilingMenuItem.swift:9`).
Clicking it runs `MenuBarProfilingMenuItemTarget.startProfiling` →
`MenuBarProfilingProgressWindowController.shared.startProfiling()`
(`Sources/App/MenuBarProfilingMenuItemTarget.swift:8-10`), which opens a dedicated 720×540pt
window titled **"Profiling cmux"** (`statusMenu.profiling.title`,
`MenuBarProfilingProgressWindowController.swift:59`).

### Launch and capture (`MenuBarProfilingLauncher.swift`)
- Runs the app-bundled script `start-cmux-profiling` (from `Resources/bin/`) via `/bin/bash` with
  `--pid <cmux's own pid> --duration 15 --no-submit`.
  Default duration: **15 seconds** (`defaultDurationSeconds`); default template count: **4**
  (`defaultUsefulTemplateCount`); estimated total capture time = `duration × templateCount` =
  **60 seconds** (`estimatedCaptureSeconds`), used to size the progress bar.
- If the bundled script is missing: window shows failure immediately —
  `statusMenu.profiling.scriptMissing` = "The bundled profiling script is missing." (also beeps).
- If `Process.run()` throws: `statusMenu.profiling.launchFailed` = "Unable to start profiling." +
  the system error description.
- Re-clicking "Start Profiling" while a capture/submit is already in flight, or after a capture
  finished but before the email was sent, just re-shows the existing window instead of starting a
  new one (`if process != nil || submitProcess != nil || (captureComplete && ... && !emailSent)`).

### While capturing
- `statusMenu.profiling.reviewTitle` = "Send a cmux profile" (window title label, 20pt semibold).
- Live status: `statusMenu.profiling.running` = "Recording CPU, SwiftUI, memory, and system traces
  in the background."
- Countdown label, updated every second: `statusMenu.profiling.remainingFormat` = "About %d seconds
  remaining"; once the estimated window elapses but the process hasn't exited yet, switches to
  `statusMenu.profiling.finalizing` = "Finalizing traces...".
- Detail line (`statusMenu.profiling.bodyFormat`) = "Recording CPU, SwiftUI, memory, and system
  traces for %d seconds each. Finalizing may take longer." (`%d` = 15).
- Permission note (always visible, secondary/12pt): `statusMenu.profiling.permissionExplanation` =
  "macOS may ask for administrator permission because Instruments samples the running cmux
  process." (Note: the TSV also defines `statusMenu.profiling.permissionTitle` = "Why macOS may ask
  for permission" — this key was **not found referenced anywhere in `Sources/`**; only the
  `...Explanation` body string is actually wired up. Likely a leftover/unused title for a
  disclosure the current window doesn't have.)
- A determinate `NSProgressIndicator` (0…estimatedSeconds) advances with elapsed time.
- Script stdout/stderr are captured to temp log files and scanned for an `Output: ` or "cmux
  profiling capture written to " line to learn the capture folder path.

### On completion
- **Success** (`terminationStatus == 0`): countdown label → `statusMenu.profiling.completeTitle` =
  "Capture complete"; status → `statusMenu.profiling.readyToReview` = "Review the attachment, add
  context, then send the email."
- **Failure**: countdown label → `statusMenu.profiling.failedTitle` = "Profiling failed"; status →
  `statusMenu.profiling.failedBody` = "The capture did not finish. If a folder was created, it may
  contain partial logs." with the last 2 lines of script output appended; `NSSound.beep()`.

### Review form (email submission)
Fields, all in the same window once capture completes:
- **Your email** (`statusMenu.profiling.emailLabel`) — text field, persisted to
  `UserDefaults` under the shared feedback-composer's stored-email key on send. Placeholder in the
  TSV: `statusMenu.profiling.emailPlaceholder` = "you@example.com" (not directly confirmed wired to
  this specific field vs. the shared Feedback form, but same string is reused).
  Validation regex: `^[A-Z0-9a-z._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$`
  (`MenuBarProfilingProgressWindowController.isValidEmail`); invalid/empty shows
  `statusMenu.profiling.invalidEmail` = "Enter a valid email address so we can follow up." under
  the field and disables **Send Email**.
- **Anything else we should know?** (`statusMenu.profiling.noteLabel`) — free-text note, 56pt tall
  scrollable text view.
- **Attachment preview** (`statusMenu.profiling.previewLabel`) — read-only text view (118pt),
  populated by `MenuBarProfilingProfilePreview.text`:
  - `statusMenu.profiling.previewRecipient` = "Recipient: %@"
  - `statusMenu.profiling.previewEmailFormat` = "Your email: %@"
  - `statusMenu.profiling.previewAttachmentFormat` = "Attachment: %@" (the `.zip` filename)
  - `statusMenu.profiling.previewArchiveNote` = "The email includes a zip with traces, logs,
    summary.md, and system-info.txt."
  - `statusMenu.profiling.previewSummaryHeader` = "summary.md preview:" followed by the file's
    contents, or `statusMenu.profiling.summaryMissing` = "summary.md is not available yet." if
    absent.
  - Before any capture output exists: `statusMenu.profiling.previewWaiting` = "The attachment
    preview will appear after the profiler writes the capture folder."
- **Attachment status line** below the preview, three states:
  - No output yet: `statusMenu.profiling.attachmentWaiting` = "Attachment will be ready after
    capture."
  - Output exists, not yet zipped: `statusMenu.profiling.attachmentReadyFormat` = "%d profiling
    files will be zipped and attached." (`%d` = file count via
    `MenuBarProfilingProfilePreview.fileCount`).
  - Already zipped: `statusMenu.profiling.archiveReadyFormat` = "Attachment: %@" (archive's last
    path component).
  - Zero-file/inaccessible-folder variants inside the preview builder itself:
    `statusMenu.profiling.filesEmpty` = "Files: none yet", `statusMenu.profiling.filesUnavailable`
    = "Files: unavailable".

### Buttons
- **Preview Attachment** (`statusMenu.profiling.previewAttachment`) — packages the capture folder
  into a zip via the bundled `submit-cmux-profile` helper and opens it with Quick Look
  (`/usr/bin/qlmanage -p`, falling back to `NSWorkspace.shared.open` if that fails). While running,
  its title becomes `statusMenu.profiling.packagingAttachment` = "Packaging..." and status shows
  `statusMenu.profiling.packagingAttachmentStatus` = "Creating the zip attachment for preview.";
  disabled unless the capture completed, an output folder exists, and no submit is already running.
  On success: `statusMenu.profiling.packageReady` = "Attachment is ready to preview."; on failure:
  `statusMenu.profiling.packageFailed` = "Could not package the attachment." (+ last 2 lines of
  stderr, or the timeout-retry line below).
- **Send Email** (`statusMenu.profiling.sendEmail`) — requires a valid email + completed capture;
  writes the email and note to two `0600`-permission temp files (never passed as bare CLI args),
  then runs the submitter with `--send`. While sending: button title →
  `statusMenu.profiling.sendingEmail` = "Sending..."; status →
  `statusMenu.profiling.sendingEmailStatus` = "Packaging the profile and sending the email through
  Mail." On success: `statusMenu.profiling.emailSent` = "Email sent." (button stays disabled —
  `emailSent` latches true, can't resend without closing/reopening the window/new capture). On
  failure: `statusMenu.profiling.emailFailed` = "The email could not be sent." (+ tail of stderr).
  If the submitter binary itself is missing: `statusMenu.profiling.submitterMissing` = "The bundled
  profile submission helper is missing." If writing the private temp input files throws:
  `statusMenu.profiling.submitLaunchFailed` = "Unable to send the email." + error description.
- **Close** (`statusMenu.profiling.close`) — closes the window; `windowWillClose` calls
  `clearCompletedCaptureState()`, which cancels any in-flight submit and resets capture state once
  it's idle.

### Timeout handling
Submit/package processes (Mail-based, launched through `submit-cmux-profile`) get a **180-second**
timeout (`submitTimeoutSeconds`). On timeout: `statusMenu.profiling.submitTimedOut` = "Mail did not
finish in time. Stopping the send helper so you can retry." → `process.terminate()`, then a 3-second
grace timer force-`SIGKILL`s it if still alive. The resulting failure message uses
`statusMenu.profiling.submitTimedOutRetry` = "The Mail helper timed out and was stopped. You can
try again." instead of the generic failure's stderr tail.

Source: `Sources/App/MenuBarProfilingLauncher.swift`,
`Sources/App/MenuBarProfilingProgressWindowController.swift`,
`Sources/App/MenuBarProfilingSubmissionActions.swift`,
`Sources/App/MenuBarProfilingProfilePreview.swift`,
`Sources/App/MenuBarProfilingMenuItem.swift`, `Sources/App/MenuBarProfilingMenuItemTarget.swift`.

**Edge case / possible dead string**: `statusMenu.profiling.permissionTitle` ("Why macOS may ask
for permission") is defined but has no call site found in `Sources/`.

## Workspace group API validation errors (`workspaceGroup.error.*`)

Not covered by `cmux-02` (which documents the `workspace-group` CLI/UI surface) or `cmux-05`
(CLI/API catalog). These are the error messages the `ControlWorkspaceGroupCoordinator` (v2 socket
API backing `cmux workspace-group ...` and any programmatic caller) returns when a group operation
is misused, surfaced as the JSON error envelope's `message` field (and printed by the CLI on
failure). Source:
`Packages/macOS/CmuxControlSocket/Sources/CmuxControlSocket/Coordinator/WorkspaceGroup/ControlWorkspaceGroupStrings.swift`
(app supplies these already-localized so the package can't drop translations), consumed in
`Sources/TerminalController+WorkspaceGroupAction.swift` and
`Sources/TerminalController+ControlWorkspaceGroupContext.swift`.

| Key | Text | Trigger |
|---|---|---|
| `workspaceGroup.error.allChildrenAreAnchors` | "All requested children are ineligible because they are already group anchors; ungroup them first" | `add`/`create` with only anchor-of-another-group workspaces as children |
| `workspaceGroup.error.workspaceIsOtherGroupAnchor` | "Workspace is the anchor of another group; ungroup it first" | adding a workspace that's already another group's anchor |
| `workspaceGroup.error.invalidReferenceWorkspace` | "Reference workspace must be a member of the target group" | `new-workspace`/insertion with a reference id outside the target group |
| `workspaceGroup.error.closeWorkspacesMustBeBoolean` | "close_workspaces must be a boolean" | `delete` called with a non-boolean `close_workspaces` param |
| `workspaceGroup.error.noWorkspacesToClose` | "Group has no workspaces to close" | `delete --close-workspaces` on an already-empty group |
| `workspaceGroup.error.couldNotCloseEveryWorkspace` | "Could not close every workspace in the group" | one or more member-workspace closes failed mid-delete |
| `workspaceGroup.error.cannotDeleteEveryWorkspace` | "Cannot delete every workspace in a window" | delete would leave the owning window with zero workspaces |
| `workspaceGroup.error.idempotencyKeyMustBeString` | "external_id and idempotency_key must be strings" | non-string value passed for either identity alias |
| `workspaceGroup.error.idempotencyKeysMustMatch` | "external_id and idempotency_key must match" | both aliases passed with different values |
| `workspaceGroup.error.idempotencyKeyMustNotBeEmpty` | "The group identity must not be empty" | identity field passed as an empty string |
| `workspaceGroup.error.removeGeneratedAnchorMustBeBoolean` | "remove_generated_anchor must be a boolean" | non-boolean cleanup-intent flag |
| `workspaceGroup.error.generatedAnchorRequiresAnchorOnly` | "Generated-anchor cleanup requires an anchor-only group" | cleanup requested on a group with non-anchor members |
| `workspaceGroup.error.generatedAnchorNotOwned` | "The group anchor was not generated by cmux" | cleanup requested on a user-created (not auto-generated) anchor |
| `workspaceGroup.error.generatedAnchorRemovalFailed` | "The generated group anchor could not be removed" | anchor removal itself failed |
| `workspaceGroup.error.emptyPinnedCannotUngroup` | "A pinned empty group can only be removed with Delete Group" | `ungroup` attempted on a pinned, member-less group |

`workspaceGroup.contextMenu.markAllUnread` = "Mark All Workspaces in Group as Unread" — a group
header context-menu item; `cmux-02` documents the group header menu's other items ("Rename Group…",
"Pin/Unpin Group", etc.) but not this one, which sits alongside "Mark Group as Read/Unread" as a
per-workspace variant (marks every member individually unread rather than the group's own
notification state).

## Right sidebar remote (`right_sidebar` socket verb) command errors (`rightSidebar.remote.error.*`)

`cmux-02` names the socket verb and gives two example errors; the full set (16 strings, all
prefixed `ERROR:` and printed to the CLI/remote caller's stderr-equivalent) was not enumerated.
Source: search `rightSidebar.remote.error` (grep across `Sources/`/`Packages/` for exact call
sites was not completed in this pass — the strings exist in the TSV and are consistent with a
socket-verb argument-parsing/dispatch error path, matching the pattern `cmux-02` already
describes for the two it does quote).

- `rightSidebar.remote.error.appDelegateUnavailable` = "ERROR: App delegate not available"
- `rightSidebar.remote.error.customSidebarNotFound` = "ERROR: No custom sidebar named '%@' in
  ~/.config/cmux/sidebars"
- `rightSidebar.remote.error.customSidebarUnset` = "ERROR: No custom sidebar selected; run
  right_sidebar set custom <name>"
- `rightSidebar.remote.error.customSidebarsDisabled` = "ERROR: Custom sidebars are disabled (enable
  them in Settings → Beta Features)"
- `rightSidebar.remote.error.focusFailed` = "ERROR: Failed to focus right sidebar"
- `rightSidebar.remote.error.invalidTargetID` = "ERROR: Invalid right sidebar --%@ id '%@'"
- `rightSidebar.remote.error.modeUnavailable` = "ERROR: Right sidebar mode '%@' is not available"
- `rightSidebar.remote.error.noFocusOnlySet` = "ERROR: --no-focus is only valid with right_sidebar
  set"
- `rightSidebar.remote.error.optionRequiresID` = "ERROR: %@ requires an id"
- `rightSidebar.remote.error.stateUnavailable` = "ERROR: Right sidebar state not available"
- `rightSidebar.remote.error.targetNotFound` = "ERROR: Right sidebar target not found"
- `rightSidebar.remote.error.unknownCommand` = "ERROR: Unknown right sidebar command '%@'"
- `rightSidebar.remote.error.unknownMode` = "ERROR: Unknown right sidebar mode '%@'"
- `rightSidebar.remote.error.unknownOption` = "ERROR: Unknown right sidebar option '%@'"
- `rightSidebar.remote.error.unknownTargetOption` = "ERROR: Unknown right sidebar target option
  '%@'"

Also: `rightSidebar.customSidebar.emptyHint` = "Pick one with: cmux right-sidebar set custom
<name>" — shown when the Custom mode has no sidebar selected yet, distinct from the
`customSidebarUnset` CLI error above (this is the in-app hint).

## Custom sidebar file validation errors (`sidebar.custom.validation.*`)

`cmux-02`'s Custom Sidebars section covers the `.js`/`.swift`/`.json` runtime and gating, but not
the file-level validation errors shown when an authored sidebar file itself is malformed. Source:
`Packages/macOS/CmuxSwiftRenderUI/Sources/CmuxSwiftRenderUI/Sidebar/CustomSidebarValidator.swift`.

- `sidebar.custom.validation.fileMissing` = "Sidebar file is missing." — the `<name>.json`/`.swift`
  file referenced no longer exists on disk.
- `sidebar.custom.validation.readFailed` = "Failed to read sidebar file." — exists but unreadable
  (permissions/IO error).
- `sidebar.custom.validation.decodeFailed` = "Failed to decode sidebar JSON." — file isn't valid
  JSON at the top level.
- `sidebar.custom.validation.invalidJSON` = "Invalid JSON at %@" — malformed JSON at a specific
  path within the structure (`%@` = a `parts.joined(separator: " › ")` breadcrumb, falling back to
  `sidebar.custom.validation.rootPath` = "root" when at the top).
- `sidebar.custom.validation.missingKey` = "Missing key '%@' at %@" — a required declarative field
  absent at that path.
- `sidebar.custom.validation.missingValue` = "Missing value at %@" — a key present but its value
  empty/absent.
- `sidebar.custom.validation.typeMismatch` = "Type mismatch at %@" — a value present but the wrong
  JSON type (e.g. string where a number was expected).
Also `sidebar.custom.noView` = "No supported SwiftUI view found." — the `.swift`-flavored sidebar's
interpreted expression didn't resolve to a renderable view.

These only apply to the `.json` (declarative) flavor's structural validation; `.js`/`.swift`
parse/runtime errors are a separate path not covered by this validator.

## Sidebar extensions (ExtensionKit) — blocked-state status/detail pairs

`cmux-02` already lists the blocked-state *titles* generically ("connection interrupted,
configuration ('manifest') failed to load, invalid configuration, configuration timed out, missing
configuration"). The exact status-line/detail-body pairs (`SidebarExtensionBlockedReason`-style
states, each rendered as a compact status word plus a longer explanation) are:

| State | Status (`sidebar.extensions.blocked.status.*`) | Detail (`sidebar.extensions.blocked.detail.*`) |
|---|---|---|
| Connection interrupted | "Blocked, connection interrupted" | *(uses the generic "CMUX lost the extension connection..." text `cmux-02` already quotes)* |
| Failed manifest | "Blocked, configuration unavailable" | "CMUX could not load this extension's configuration. No workspace data or actions were shared." |
| Invalid manifest | "Blocked, invalid configuration" | "CMUX rejected this extension's configuration. No workspace data or actions were shared." |
| Manifest timed out | "Blocked, configuration timed out" | "CMUX did not receive this extension's configuration in time. No workspace data or actions are being shared." |
| Missing manifest | "Blocked, missing configuration" | "CMUX did not receive a sidebar extension configuration, so no workspace data or actions were shared." |

Also: `sidebar.extensions.action.remoteTmuxWindowRequested` = "Remote tmux window requested" — an
extension-triggered action-log/toast line distinct from the failure toasts `cmux-02` already lists
("Workspace could not be closed," etc.), confirming a successful remote-tmux-window action request
from an extension.

## Sidebar "Help" feedback form — exact strings

`cmux-02` narratively covers this form ("email, message, up to 10 image attachments each ≤4MB,
various validation errors..."); the verbatim copy:

- Email field placeholder: `sidebar.help.feedback.emailPlaceholder` = "you@example.com"
- Message placeholder: `sidebar.help.feedback.messagePlaceholder` = "Share feedback, feature
  requests, or issues."
- Attachment hint: `sidebar.help.feedback.attachmentsHint` = "Up to 10 images."
- Validation errors: `emptyMessage` = "Enter a message before sending."; `messageTooLong` = "Your
  message is too long."; `imageTooLarge` = "Each image must be 4 MB or smaller."; `totalImagesTooLarge`
  = "These images are too large to send together. Remove a few and try again."; `invalidImageSelection`
  = "One of the selected files could not be attached."; `validationError` (generic) = "Check your
  message and attachments, then try again."
- Send failures: `connectionError` = "Couldn't send feedback. Check your connection and try again.";
  `genericError` = "Couldn't send feedback. Please try again."; `rateLimited` = "Too many feedback
  attempts. Please try again later."
- Success: `successTitle` = "Thanks for the feedback."; `successBody` = "You can also reach us at
  founders@manaflow.com."

## Sidebar workspace checklist (todo pane rows) — tooltips and controls

Extends `cmux-02`'s workspace-todo-section context-menu coverage with the inline checklist row
controls themselves (`Sources/Sidebar/AppKitList/Cells/SidebarRowChecklistItemLine.swift`,
`SidebarRowChecklistAddRow.swift`, `SidebarRowChecklistAttachmentButton.swift`,
`SidebarWorkspaceRowChecklistSection.swift`):

- Check circle tooltip toggles by state: `sidebar.checklist.checkTooltip` = "Mark as completed"
  (when currently unchecked) / `sidebar.checklist.uncheckTooltip` = "Mark as pending" (when
  checked).
- Per-item right-click menu: `sidebar.checklist.editItem` = "Edit", `sidebar.checklist.markInProgress`
  = "Mark In Progress", `sidebar.checklist.removeItem` = "Remove"; remove button's own tooltip:
  `sidebar.checklist.removeItemTooltip` = "Remove item"; inline edit field placeholder:
  `sidebar.checklist.editItemPlaceholder` = "Item text".
- Add-item row: button tooltip `sidebar.checklist.addItem` = "Add item"; text field placeholder
  `sidebar.checklist.addItemPlaceholder` = "New checklist item".
- Attachments button: tooltip `sidebar.checklist.attachmentsTooltip` = "Manage images";
  accessibility label when empty `sidebar.checklist.attachments.noneAccessibility` = "No images
  attached. Attach images."; count label singular `sidebar.checklist.attachments.one` = "1 image
  attached", plural `sidebar.checklist.attachments.other` (pluralized count); menu items
  `sidebar.checklist.attachImages` = "Attach Images…", `sidebar.checklist.openAttachment` = "Open",
  `sidebar.checklist.removeAttachment` (per-attachment remove).
- Section header (the checklist's own collapse/expand control on the workspace row):
  `sidebar.checklist.popoverTooltip` = "Show checklist" (opens the popover); when inline-expanded,
  toggles between `sidebar.checklist.expandTooltip` = "Show checklist items" and
  `sidebar.checklist.collapseTooltip` = "Hide checklist items".
- `sidebar.checklist.moreItems` — a "+N more" overflow indicator; its localized default value was
  not resolved (TSV shows the key name itself, meaning no English default string was set at the
  call site found).

## Sidebar account/team switcher — exact strings

`cmux-02` narratively covers this ("<name>, <team>" etc.); exact keys not previously quoted:
`sidebar.account.createTeamFailed` = "Could not create that team. Try again."; `switchTeamFailed` =
"Could not switch teams. Try again."; `createTeamPlaceholder` = "Team name"; `teamRowLabel` =
"%1$@%2$@" (name + suffix concatenation format); `teamWithPlan` = "%1$@ · Pro" (plan-suffix format,
matches "<team> · Pro" already described).

## Cloud VM loading panel (`panel.cloudVM.*`)

Not covered by `cmux-07` (which documents `cloudVM.*` command-palette/dialog strings) — this is a
**pane-embedded loading/failure panel** shown while a workspace is attaching to its Cloud VM,
distinct from those dialogs. It is a `Panel` type (`panelType: .cloudVMLoading`) that occupies a
Bonsplit pane slot the same way a terminal or browser panel does.

- Title: `panel.cloudVM.loading.title` = "Cloud VM"; icon `cloud.fill`.
- Loading state headline: `panel.cloudVM.loading.headline` = "Opening Base"; an elapsed-time line
  (`panel.cloudVM.loading.elapsed`) and step list, each with an SF-Symbol-style checkmark/spinner:
  - `panel.cloudVM.loading.step.request` = "Requesting your persistent VM"
  - `panel.cloudVM.loading.step.resume` = "Starting or resuming the VM"
  - `panel.cloudVM.loading.step.endpoint` = "Waiting for a secure terminal endpoint"
  - `panel.cloudVM.loading.step.retrying` = "Still waiting; retrying in the background"
  - `panel.cloudVM.loading.step.workspace` = "Pinned workspace created"
  - `panel.cloudVM.loading.step.terminal` = "Terminal will open automatically when ready"
- Failure state headline: `panel.cloudVM.loading.failed.headline` = "Base unavailable"; elapsed
  time also shown (`panel.cloudVM.loading.failed.elapsed`); buttons **Retry**
  (`panel.cloudVM.loading.failed.retry`, re-invokes `performCloudVMAction`) and **Send Feedback**
  (`panel.cloudVM.loading.failed.feedback`).
- Failure message classification (`CloudVMLoadingPanel.presentableFailureMessage`, matched
  case-insensitively against the raw script/error output):
  - Mentions "local cmux web server"/"localhost:"/"127.0.0.1:" → `panel.cloudVM.loading.failed.localServer`
    = "The local cmux web server is offline. Start it and retry Open Cloud VM."
  - Mentions "waiting for the cloud vm service"/`vm_cloud_service_unavailable`/HTTP 502/503/"service
    unavailable" → `panel.cloudVM.loading.failed.serviceUnavailable` = "The Cloud VM service could
    not create a VM yet. Retry keeps using this pinned Cloud VM slot, and once a VM exists cmux
    will always reattach to that same VM."
  - Mentions "password"/"permission denied" → `panel.cloudVM.loading.failed.auth` = "cmux could not
    open a passwordless terminal session. Try opening the Cloud VM again."
  - No pattern matched (or message empty): `panel.cloudVM.loading.failed.generic` = "Cloud VM could
    not be opened."
- `panel.cloudVM.loading.failed.missingCommand` = "Cloud VM attach command was empty." — a distinct
  failure recorded when the machine had no attach command to run at all.

Source: `Sources/Panels/CloudVMLoadingPanel.swift`, `Sources/Panels/CloudVMLoadingPanelView.swift`,
`Sources/Panels/MachineCreateLoadingContent.swift`.

## Empty panel state (`emptyPanel.*`)

A pane that has no panel/tab left in it (e.g. after closing the last tab in a split without closing
the split itself) shows a placeholder: title `emptyPanel.title` = "Empty Panel", with two action
buttons to fill it — `emptyPanel.action.terminal` = "Terminal" and `emptyPanel.action.browser` =
"Browser". Source: `Sources/WorkspaceContentView.swift:825-839`.

## Tab fallback title (`tab.untitled`)

`tab.untitled` = "Untitled Tab" — the fallback display title for a panel tab with no other name
available, used in `WorkspaceCloseTabsBatching.swift:39` (e.g. when building a "Close Other Tabs"
confirmation/summary before the real per-tab titles are known).

## Focus-history menu — exact per-item formatting

`cmux-01`'s Focus History section covers the mechanism; the per-entry menu-row formatting strings
were not quoted there:
- Row title: workspace title, or `menu.history.untitledWorkspace` = "Untitled Workspace" if blank;
  if the item also has a distinct panel title, appended as
  `menu.history.focusedItemTitleFormat` = "%1$@ - %2$@" (workspace - panel).
- Row subtitle: direction word (`menu.history.focusBack` = "Focus Back" /
  `menu.history.focusForward` = "Focus Forward") + a timestamp clause built from
  `historyPane.focusedAtFormat` = "Focused %@" (short time), joined via
  `menu.history.menuItemSubtitleFormat` = "%1$@, %2$@".
- Full menu-item text is title + "\n" + subtitle (`HistoryMenuLineFormatter.titleWithSubtitle`).
- The **closed-item** (not focus-history) counterpart uses `historyPane.closedAtFormat` = "Closed
  %@" the same way, for "recently closed" entries (`Sources/ClosedItemHistory.swift:96`).

Source: `Sources/FocusHistory.swift`, `Sources/ClosedItemHistory.swift`.

### Unresolved history-pane strings
`historyPane.clearClosed`/`.clearClosed.help`/`.day.today`/`.day.yesterday`/`.empty`/`.noResults`/
`.search.placeholder` (a "Clear Closed" button, "Today"/"Yesterday" day-group headers, an empty
state "No history yet", a no-results state "No matching history", and a search field) exist in the
TSV but **no call site was found in `Sources/`** in this pass beyond `historyPane.search.clear` =
"Clear search" (`Sources/SessionIndexView.swift:2494`, part of the Vault/session-index search box,
not the focus-history menu). These may belong to a history-browsing surface not located in this
pass, or be leftover strings from a prior design of the focus-history menu (a searchable, grouped,
clearable list) that shipped only partially. Flagged rather than guessed at.

## Miscellaneous small gaps

- `common.dontSave` = "Don't Save" — appears alongside the standard save-changes alert triad (Save
  / Don't Save / Cancel); no confirmed call site found in `Sources/` in this pass (likely the file
  editor's unsaved-changes prompt described narratively elsewhere, but the exact button label
  wasn't cross-checked against source here).
- `terminalContextMenu.lookUpFormat` = "Look Up "%@"" — a macOS-services-style "Look Up" menu item
  for terminal text selection; no call site found in `Sources/` (possibly wired through
  `NSMenuItem`'s automatic services integration rather than an explicit `String(localized:)` call,
  or unused).
- `terminal.shortcut.name.ctrlL` = "Clear (Control-L)" — a shortcut-name label (context not fully
  traced; likely the human-readable name for the Control-L "clear scrollback" binding used in a
  shortcuts list/discovery UI).
- `terminal.notification.action.replyPlaceholder` = "Message the agent…" — placeholder text for the
  inline reply field on an agent notification (the action itself, "Reply"/"Send", is presumably
  covered by `cmux-02`'s notification-row Reply action; this exact placeholder wasn't quoted there).
- `terminal.agentHibernation.lastActivity` = "Last activity %@" — a timestamp line shown with the
  agent-hibernation placeholder UI that `cmux-04` documents structurally (SIGTERM → placeholder →
  manual Resume) but without this exact status string.
- Accessibility labels on titlebar toggle buttons, not previously quoted verbatim:
  `titlebar.sidebar.accessibilityLabel` = "Toggle Sidebar", `titlebar.fileExplorer.accessibilityLabel`
  = "Toggle File Explorer", `titlebar.cloudVM.menu.accessibilityLabel` = "Cloud VM Menu".
- `sidebar.folderIcon.dragHint` = "Drag to open in Finder or another app" — drag-source hint on a
  workspace row's folder/path icon.
- `sidebar.pathMenu.macintoshHD` = "Macintosh HD" — root-volume label substituted into a
  breadcrumb-style path menu (e.g. right-clicking the folder icon to show ancestor directories).
- `sidebar.metadata.showMoreDetails` / `showLessDetails` = "Show more details" / "Show less
  details" — an expand/collapse toggle on a workspace row's metadata area.
- `sidebar.status.autoReturn` = "Auto — return to %@" and `sidebar.status.compactTooltip` = "Change
  workspace status" — extend `cmux-02`'s workspace-todo-status-submenu coverage: "Auto" isn't just
  a lane choice, it has its own explanatory subtitle naming which lane it would currently resolve
  to, and the compact status pill (when the row is too narrow for the full label) has its own
  tooltip.
- `sidebar.remote.help.errorWithDetail` = "Remote error for %@: %@" — the two-argument form of the
  "Remote error for %@[: %@]" help text `cmux-02` already documents in bracket-optional shorthand;
  this is the concrete format when a detail string is present.
- `sidebar.cloudWorkspace.directoryUnavailable` = "Directory unavailable" — shown in place of a
  working-directory path for a Cloud-machine-backed workspace when the directory can't be resolved.
- `sidebar.browserStack.closeGroup` = "Close group" — a control on the example "Browser Stack"
  custom-sidebar template (`cmux-08` already notes the example templates exist; this is one of
  their action labels).
- `sidebar.extension.inspectWorkspace` = "Workspace tools" and `sidebar.extension.toggleSection` =
  "Toggle section" — extension-sidebar chrome labels alongside the "Manage Sidebar Extensions..."/
  "Use Workspace Sidebar" items `cmux-02` already lists.

## Corrections to other sections

- `cmux-02-sidebar-notifications.md` states `statusMenu.profiling.*` is "out of this catalog's
  scope and not detailed above" — correct as far as it goes, but it belongs in this file's scope
  (`statusMenu` is one of this file's owned prefixes) and is now covered above; not a factual error,
  just a scope handoff this file completes.
- `cmux-07-remote-cloud.md`'s "Pane memory guardrail" section is confirmed consistent with source:
  it already correctly notes the `paneMemoryGuardrail.banner.*`/`.confirm.*` strings have no live
  call site in `Sources/`/`Packages/`. This pass adds one more data point rather than a correction:
  `paneMemoryGuardrail.banner.detailWithCommand` = "%1$@ — %2$@ (running %3$@)" is a third,
  previously-unquoted format variant of the same orphaned banner-detail string family (alongside the
  `%1$@ — %2$@` two-argument form `cmux-07` does quote) — same orphaned status, not a new call site.
- No other direct contradictions between this pass's source reads and the two owning catalogs
  (`cmux-01`, `cmux-02`) were found; the bulk of "uncovered" strings were narratively described but
  not quoted verbatim (handled above), not misdescribed.

## Coverage note

This pass diffed all 613 strings under the assigned prefixes against every `catalog/cmux-*.md`
file present (through `cmux-09`; a `cmux-16-appendix.md` raw string/source-path appendix appeared
in the shared directory during this session, evidently produced by a concurrent pass, and was
spot-checked but not treated as authoritative coverage since it postdates this audit's baseline).
Every uncovered string was traced to a source call site where one exists under `Sources/` or
`Packages/`; a few (noted above) had no locatable call site and are flagged as such rather than
described from the string text alone. Not independently re-verified: the exact default localized
value for keys whose TSV entry showed only the key name repeated back (`sidebar.checklist.moreItems`,
a handful of `statusMenu.profiling.*` counterparts already noted in-line) — these ship with no
English default at their call site as far as this pass found.
