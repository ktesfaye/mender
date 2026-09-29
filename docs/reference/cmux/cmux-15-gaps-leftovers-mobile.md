# Gaps found in the leftovers and the phone app

Audited every macOS string under the ~60 prefixes `cmux-08`'s coverage note listed as "catalogued briefly" or "noted but not expanded" (`appIcon`, `appearance`, `automation`, `caffeine`, `clipboard`, `controlSocket`, `crashBreadcrumb`, `defaultTerminal`, `detail`, `emptyPanel`, `error`, `example`, `fileDrop`, `filePreview`, `ghostty`, `historyPane`, `language`, `managedPolicy`, `memory`/`memoryDiagnostic`, `mode`, `notification`, `notificationHook`, `projectSchemes`, `proWelcome`, `relativeTime`, `shortcutDiscovery`, `surfaceCatalog`, `surfaceDrop`, `tab`, `textSelection`, `theme`, `toolbar`, `uiTest`, `workspaceTodoPane`, plus the SSH/remote-runtime internals `rpc.v2`, `remoteRelay`, `remoteSession`, `remotePTYAttach`, `detectedSSH`, and a handful `cmux-08` missed entirely: `accessibility`, `agentRestore`, `auth`, `cloudEnv`, `cloudNotification`, `connection`, `devices`, `push` on macOS) — about 320 strings — plus all 1,492 iOS `Localizable.xcstrings` entries. `cmux-08`'s "in depth" set (`dock`, `canvas`, `diffViewer`, `diffComments`, `fileExplorer`, `markdown`, `globalSearch`, `search`, `debug`, `customSidebarRenderer`, the iOS sign-in/settings/dashboard sections) was left alone. Roughly 80% of the audited macOS leftovers and 88% of iOS strings had *some* trace in the existing catalog, almost all of it the one-line "briefly noted" treatment `cmux-08` flagged as incomplete; this file replaces those one-liners with full write-ups. ~175 iOS strings and every SSH-runtime internal below had no trace at all.

## Cross-Mac devices (Handoff-style)

### Discover other Macs / Make this Mac discoverable

Two independent toggles governing peer-to-peer Mac-to-Mac access over Iroh, reachable from the Computers settings section's `⋯` menu (`ComputerAccessMenuItems.swift`) and inline in the Cloud sidebar's empty Devices row (`CloudTreeDevicesEmptyView.swift`).

- **`devices.discovery.toggle`** "Discover other Macs" — this Mac looks for other Macs signed into the same account. Help text (`devices.discovery.help`): "Find and connect to other Macs signed in to your account. Turning this off disconnects their panes without closing their terminals." Fresh installs default this on.
- **`devices.incoming.toggle`** "Make this Mac discoverable" — other Macs may connect to this one. Help text (`devices.incoming.help`): "Turning this off removes this Mac from discovery and disconnects incoming sessions. You can still connect to your other Macs." Fresh installs default this off.
- Either toggle, when blocked by MDM policy, is disabled and its `.help()` becomes **`devices.managed`** "Disabled by your administrator."
- Settings > Computers card states: not signed in → `settings.computers.signIn` "Sign in to the same account on both Macs to discover and connect to them."; discovery off → `devices.discovery.settingsDisabled` "Turn on Discover other Macs to see your devices."; discovery on with zero peers → `devices.empty.title` "No other Macs yet" plus `devices.empty.help` "Sign in to cmux on another Mac and turn on Allow access to this Mac in Computers settings."; otherwise a row per computer. A **Refresh** button (disabled while refreshing, not signed in, or discovery off) re-lists them; a spinner shows while `isRefreshing`. Errors surface as a red `exclamationmark.triangle` label, selectable text.
- The `⋯` options menu itself is titled/labelled **`devices.manage`** "Manage My Devices".
- Empty state in the Cloud sidebar tree (`CloudTreeDevicesEmptyView`) renders the same "No other Macs yet" line, then inline action rows to turn on whichever toggle(s) are off, each disabled+`devices.managed` if MDM-blocked.
- **Mac disconnected mid-session**: `devices.terminal.disconnected.title` "Mac disconnected" / `.detail` "Your layout and scrollback are preserved. Retry when the other Mac is available." — shown on a peer terminal pane when the remote Mac drops.
- **Layout sync failure**: `devices.layoutSyncFailed.detail` "The layout change could not be saved on the other Mac. Try again." — when a split/layout edit made on this Mac fails to propagate.
- iOS side pairs into the same system: `computers.listauth.unverified.title` "Not verified on the new connection system yet" / `.detail` "It may be running an older cmux version. Update the Mac, or if it's already updated, open cmux on it once to verify." and `computers.version.outdated.title` "Mac update required" / `.detail` "This Mac is running cmux %@. Update cmux on this Mac to %@ or later." — version-gate guards when the phone's connection system is ahead of a paired Mac's.

Source: `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/ComputerAccessMenuItems.swift`, `ComputersSection.swift`; `Sources/Cloud/CloudTreeDevicesEmptyView.swift`; `Sources/Devices/DeviceTerminalAttachmentStatus.swift:43-44`, `DeviceWorkspaceCreationCoordinator.swift:32`.

**Correction to `cmux-08`**: its "Mobile devices" dashboard paragraph and "discovery.enabled" mention (line ~2878) describe the account-level policy shape; the actual macOS-side toggle labels, help text, empty/disabled states above were not previously documented anywhere.

## Automation rule engine

`automation.*` (9 strings) — error surface for the user-authored rule file at `~/.cmuxterm/automations.json`, read by `cmux automation reload` and matched against terminal/workspace events (`TerminalController+Automation.swift`). All 9 are one-line RPC error messages returned to whatever invoked the automation (the CLI, a socket caller, or the rule engine itself), never a dialog:
- `automation.error.engineUnavailable` "Automation is unavailable. Check ~/.cmuxterm/automations.json, then run cmux automation reload."
- `automation.error.invalidRule` "Invalid automation rule: %@"
- `automation.error.unsupportedVersion` "Unsupported automation configuration version %lld"
- `automation.error.fileTooLarge` "Automation configuration is larger than 4 MiB"
- `automation.error.missingRuleID` "Missing automation rule id"
- `automation.error.ruleNotFound` "Automation rule not found: %@"
- `automation.error.focusSuppressed` "This automation action requires permission to focus or select a surface. Update the rule to allow focus, then try again." — a rule tried to focus/select a surface without the permission flag set in its own JSON.
- `automation.error.encodeRPC` "Could not prepare the automation action. Check the rule configuration and try again."
- `automation.error.testEventObject` "automation.test requires event object" — the `cmux automation test` dry-run command's own argument-shape error (only one not phrased as a full sentence).

Source: `Sources/TerminalController+Automation.swift`.

## Keep Mac Awake (caffeine)

A one-switch feature: prevents macOS from sleeping while cmux is running, reachable from the app menu (`menu.app.keepMacAwake`, checkbox bound to `caffeineController.isEnabled`), the status-bar/menu-bar-extra menu, and remotely per-Mac from the iPhone app's Mac Power settings. Backed by a `caffeinate`-style assertion (`CaffeineController.swift:25`, reason string `"cmux Keep Mac Awake"`), turned off automatically on quit (`AppDelegate.swift:2390`).
- v2 socket/RPC surface (`TerminalController+Caffeine.swift`) exposes `caffeine status`/`caffeine set`: not-yet-attached controller → error code `caffeine_unavailable`, **`caffeine.error.unavailable`** "Keep Mac Awake isn't available yet."; missing/invalid `enabled` param → error code `invalid_params`, **`caffeine.error.missingEnabled`** "Pass enabled=true or enabled=false."
- iPhone side (`MobileCaffeineSettingsContent.swift`) is a full remote-control screen, not just a toggle: title/section "Keep Mac Awake"; not-connected state "Connect to this Mac to control Keep Mac Awake."; Mac-too-old state "Update cmux on this Mac to control Keep Mac Awake from iPhone."; load-failure "Couldn't load the Mac's Keep Mac Awake status. Check the connection and retry."
- An onboarding upsell card also exists (`OnboardingKeepAwakeCard.swift`, already noted by `cmux-08` at line 3987) offering the same toggle inline with async confirm/revert during first-run setup, and it can reappear per-Mac at the end of the connect flow (`OnboardingKeepAwakeOffer.swift`).

**Correction to `cmux-08`**: line 245/4223 called `caffeine.*` "Keep Mac Awake toggle errors" only; it is a shipped, user-reachable feature on three surfaces (app menu, status-bar menu, and iPhone remote control), not just an error-string set.

## Post-crash diagnostic notice

`crashBreadcrumb.*` (3 strings) — a local (never sent anywhere) notification shown once, the run after cmux crashes, if a crash-diagnostic file was captured. Delivered through the same in-app notification store as agent alerts (`AppDelegate.swift:2646-2664`, `GhosttyCrashBreadcrumb`):
- Title: "cmux crashed during your last session"
- Subtitle: "Diagnostic file saved"
- Body: "Diagnostic file saved. Click to reveal it in Finder."
- Click action reveals the crash file in Finder (`.revealInFinder(path:)`). Shown at most once per crash (`GhosttyCrashBreadcrumb.markShown`).

## Notification hook failures

`notificationHook.*` (2 strings) — when a user-configured shell hook that customizes notification behavior (a project- or global-level `notificationHook` setting, resolved from `TerminalNotificationStore+HookResolution.swift`; remote/SSH/cloud origins only ever use the global Mac-level config, never a project-local one) exits non-zero or otherwise fails, cmux falls back to its default notification and separately surfaces:
- Title: "Notification Hook Failed"
- Body (format): "cmux used default notification behavior because '%@' failed." — `%@` is the hook's own identifier/path.

## Agent Chat server-unavailable notification

`notification.agentChat.*` (5 strings) — when cmux can't reach a workspace's configured Agent Chat server (`AppDelegate+AgentChatNotifications.swift`):
- Title: "Agent chat server isn't running"
- Body, with a configured start command: "cmux couldn't reach %@. Start it with: %@"; without one: "cmux couldn't reach %@. Start the server with cmux-chat or configure agentChat.startCommand in cmux.json."
- Subtitle depends on whether cmux itself just tried and failed to auto-launch it: `subtitleLaunchFailed` "Could not start Agent Chat" vs. plain `subtitle` "Opened Agent Chat" (i.e. cmux opened Agent Chat successfully in general but this particular server ping still failed).
- `notification.desktop.defaultTerminalTitle` "Terminal" — fallback title used for a terminal-activity desktop notification when the surface has no better name (`Workspace.swift`).

## Push notification copy (shared macOS/iOS payloads)

`push.*` on macOS (3) and iOS (4) — the actual text baked into push payloads/local notifications, distinct from in-app copy:
- `push.hidden.body` "New terminal activity" — generic body used when the real content must stay off the lock screen.
- `push.test.title` "cmux Notification Test" / `push.test.body` "Your Mac sent a test alert to cmux." — the Settings "send test notification" round-trip, present on both platforms.
- iOS-only `push.generic.title` "cmux" / `push.generic.body` "An agent needs your attention" — fallback push shown when the payload can't be decrypted or parsed client-side, defined but the macOS side has no matching `push.generic.*` (macOS instead falls back to `push.hidden.body`).

## Managed (MDM) policy blocks

`managedPolicy.*` (3 strings) — org-pushed configuration profile restrictions, read via `ManagedCapabilityPolicy.swift`, each rendered wherever the blocked action would otherwise appear (Computers toggles show `devices.managed` instead; these three are the underlying capability-block messages surfaced elsewhere, e.g. SSH/remote UI and file-drop-to-remote):
- `managedPolicy.remoteConnections.disabled` "Remote connections are disabled by your organization."
- `managedPolicy.fileTransfer.disabled` "File transfer is disabled by your organization."
- `managedPolicy.irohNetworking.disabled` "cmux relay networking is disabled by your organization."

## Default-terminal registration

`defaultTerminal.*` / `error.defaultTerminal.*` (2 strings total) — triggered by the app-menu/Settings **Make cmux the Default Terminal** action (also documented briefly at `cmux-08` line 3410) failing at the OS level:
- `error.defaultTerminal.registrationFailed` "cmux could not register as the default terminal app."
- `defaultTerminal.updateFailed.message` "macOS could not update every default terminal handler." — a second, broader failure (some but not all of the terminal URL-scheme/document-type handlers failed to register).

## Standalone `error.*` strings

Five strings with no shared feature, each a one-off failure surfaced inline where it happens:
- `error.clipboardFolderPath` "Could not load any folder path from the clipboard." — pasting a non-folder-path clipboard value where a folder path was expected.
- `error.cmuxConfigActionSaver.malformedConfig` "%@ isn't a valid JSON object, so the workspace layout couldn't be updated. Fix the file and try again." / `.unreadableConfig` "Couldn't read %@." — saving a workspace-layout action back into a project's `cmux.json` when the file is hand-edited into invalid JSON or is unreadable.
- `error.remoteDrop.invalidFileURL` "Dropped item is not a file URL." / `.unavailable` "Remote drop is unavailable." / `.uploadFailed` "Failed to upload dropped file: %@" — dropping a file onto a remote (SSH) terminal/pane when it isn't a real file, the feature is off, or the upload itself fails.

## Custom-sidebar example templates

`example.sidebar.*` (27 strings) — the built-in demo content shown for the four example custom-sidebar extensions cmux ships as onboarding/reference fixtures for the extension-sidebar feature (real source: `Examples/CmuxExtensionSidebarExamples/Sources/CmuxExtensionSidebarExamples/AttentionQueueSidebar.swift` and siblings). Every one of the four carries a subtitle marking it as sample content: **"User extension"**.
- **Attention Queue** — title "Attention Queue"; groups: Active, Needs Attention, Quiet, Pinned, Recent Prompts, No Prompts, "No prompts yet".
- **Browser Stack** — title "Browser Stack"; sections: Reading List (`group:reading-list`), Open (`loose`), Pinned (`tiles`).
- **Dev Servers** — title "Dev Servers"; groups: Live Servers, Local, Remote, No Folder.
- **Project Worktrees** — title "Project Worktrees"; groups: Workspaces, Pinned.
- One more fixture, **Last Prompt** (title "Last Prompt"), and **Super Compact** (title "Super Compact") round out the set — both single-purpose demo layouts rather than grouped lists.

## File-drop / file-preview / empty-panel chrome

Three small, generic action-bar string sets, each reused across multiple panel types:
- **`fileDrop.*`** (3) — Shift-modifier hints shown on the drag overlay while dragging a file over a panel, keyed to what a plain drop would do vs. what holding Shift changes it to (`DragOverlayRoutingPolicy.swift`): over a terminal-eligible target, "Hold Shift to drop into terminal"; over an editor-eligible target, "Hold Shift to drop into editor"; over a preview-eligible target, "Hold Shift to open as split".
- **`filePreview.*`** (7) — the action bar on the file-preview panel: Open Externally, "Open in %@" (a specific named app), an "Open With" submenu, Refresh, Revert, Save, Share.
- **`emptyPanel.*`** (3) — an empty panel's two quick-create actions, "Browser" / "Terminal", under the title "Empty Panel".

## Project panel: Xcode schemes tab

`projectSchemes.*` (15 strings) — the Schemes tab inside the Project panel (`Sources/Panels/ProjectSchemesTabView.swift`, opened via the `.project` panel kind in `PanelContentView.swift`), which reads a checked-out Xcode project's own `.xcodeproj`/`.xcscheme` metadata and lists it read-only, split-view style:
- Left list: one row per scheme across all modules, each badged **personal** or **shared** (`projectSchemes.badge.*`), each row formatted `run: %@` or `test: %d` (`projectSchemes.row.runFormat`/`.testFormat`).
- Right detail pane, once a scheme is picked, lists: Run target, Test targets, Profile target, Archive target, Launch arguments, Environment, and Visibility (Personal — "Personal (current user)" — or Shared).
- Nothing selected: title "Select a scheme", hint "Pick a scheme on the left to inspect its run / test / profile / archive targets and launch settings."

**Correction to `cmux-08`**: its note ("purpose/entry point not fully traced") is resolved — this is a real read-only inspector reached from the Project panel's Schemes tab, not a debug lab.

## Browser history pane

`historyPane.*` (10 strings) — the side pane listing the in-app browser's closed/visited history (arguably in the `browser` agent's territory, but its prefix wasn't on either exclusion list, so documented here per `cmux-08`'s note): search field (placeholder "Search history", "Clear search"), day-grouped rows ("Today"/"Yesterday", else a date), each row formatted "Closed %@" or "Focused %@" (relative time), a **Clear Closed** action (help: "Clear recently closed history"), empty state "No history yet", no-results state "No matching history".

## Shortcut-discovery overlay

`shortcutDiscovery.*` (8 strings) — the "show all shortcuts" help overlay (`ShortcutDiscoveryButton.swift`; button/help text "Show all shortcuts"), organized into named sections: App, Browser & Find, Navigation, Other, Panes, Workspace, and a catch-all **Unassigned** section for bindable actions with no key assigned.

## Ghostty terminal-mode indicators

`ghostty.*` (3 of the string-table entries; most of the prefix's other ~15 hits in source are debug log tags, not localized UI) — small status labels libghostty shows in-terminal for modal input states (`GhosttyTerminalView.swift:89-97`): vim-style copy-mode indicator "vim"; key-table (leader-key chord) indicator "key table", with accessibility label "Key table".

## Toolbar layout switcher

`toolbar.layout.*` (3 strings) — the window-toolbar segmented control for switching a workspace between Split panes and Canvas layout (`WindowToolbarController.swift:251-267`): segment tooltips "Split panes" / "Canvas", control label "Layout". (The keyboard-shortcut tooltip for the same action, "Toggle Canvas Layout", lives under the already-owned `shortcut.*` prefix.)

## App Icon / Appearance / Theme pickers

Three separate System/Light/Dark-style pickers exist, each independently localized and each scoped to a different setting — not one shared picker family as `cmux-08` guessed:
- **`appIcon.*`** (3: Automatic/Dark/Light) — Settings' visual three-tile App Icon picker (`AppIconPickerRow.swift`), controlling the Dock/app-switcher icon. The Automatic tile overlays both concrete icons.
- **`appearance.*`** (4: System/Light/Dark/Auto) — the app-wide appearance mode (`AppearanceSettings.swift`), applied to the whole window chrome and synchronized into the terminal theme. **`appearance.auto`** ("Auto") is a real `AppearanceMode` case with live-apply logic, but `AppearanceMode.visibleCases` only exposes `[.system, .light, .dark]` to the picker UI — `.auto` is reachable in code but not currently offered as a chooseable option anywhere, i.e. defined-and-wired but not user-reachable.
- **`theme.*`** (3: Dark/Light/System) — the in-app browser's own "Design Mode" theme-override picker (`BrowserPanel.swift`, `BrowserSection.swift`), independent of the app-wide appearance above.

## Two settings strings confined to a dev-only prototype

**Correction to `cmux-08`**: it described `detail.*` and `mode.*` as "likely shared debug-lab chrome, not traced to one owner" / "generic Compact/Expanded/System selector, reused across surfaces". Both are traced now — every real (non-`localization-allowed-omissions.json`) source hit for both prefixes is inside `Prototypes/SettingsShellLab/Sources/SettingsShellLab/Views/SettingsDetailView.swift`. Neither appears anywhere in the shipped `Sources/`/`Packages/` app code. They are a settings-shell UI prototype only — not reachable in the running app at all — not "reused across surfaces" as the earlier note implied.
- `detail.*` (6): Mode, "Open Related File" (primary action), "Restore Defaults" (secondary action), Section, Amount (slider), Enable (toggle) — generic prototype chrome labels.
- `mode.*` (3): Compact, Expanded, System — a generic display-density picker mockup.

## Language picker

`language.system` "System" — the one localized string for cmux's app-language picker (Settings), value shown when following the OS language rather than a pinned locale.

## Relative-time formatting bug

`relativeTime.*` (5): the shared relative-time formatter used by the extension-sidebar workspace rows (`ExtensionSidebarWorkspaceRowView.swift`). `relativeTime.now` reads "now"; the rest are plural forms that read compactly: days one: "%lldd" / other: "%lldd", hours one: "%lldh" / other: "%lldh", minutes one: "%lldm" / other: "%lldm", weeks one: "%lldw" / other: "%lldw".

## Memory/diagnostics strings

- `memory.attribution.*` (3, Task Manager memory breakdown, alongside `taskManager.memory.unattributed` "Unattributed"): `multipleOwners` "multiple owners", `partial` "partially attributed", and `multipleWorkspaces` as a plural form, one: "%lld workspace" / other: "%lld workspaces" (`CmuxTaskManagerMemoryGroupAttribution.swift:53`).
- `memoryDiagnostic.*` (3) — footprint summary line built by `CmuxTopMemoryDiagnostics.swift`, concatenated from up to three parts: base "%@ app footprint + %@ child RSS", optionally "; top child group: %@ %@", optionally " from workspace %@".

## SSH/remote-runtime internals (no prior catalog trace)

These read as backend/CLI-facing error strings for the SSH and Iroh-relay transport layers. `cmux-08` deliberately left them unexpanded as belonging to the excluded SSH/cloud/terminal domains even though their literal prefixes weren't on any exclusion list; none of them appear anywhere else in the catalog either, so they're written up here as genuinely uncovered:

- **`rpc.v2.surface.respawn.*`** (7) — errors from the `surface respawn` RPC (re-launching a terminal's shell process in place): "Failed to respawn surface", "Missing or invalid focus", "No focused surface", "Surface not found for the given surface_id", "Surface is not a terminal", "Unable to access the target workspace", "Workspace not found". Plus one general `rpc.v2.terminalCreation.error.initialInputRequiresTerminalType` "Initial command input can only be used with terminal surfaces".
- **`remotePTYAttach.*`** (5) — attaching a persistent SSH PTY session: "remote PTY attach failed", "remote daemon did not respond in time", "remote PTY input is temporarily backed up", "persistent SSH PTY session is no longer running", plus a passthrough diagnostic `%@`.
- **`remoteSession.*`** (8) — SSH connection lifecycle: `controlMaster.ownershipUnavailable` "SSH connection is busy in another cmux process."; `proxy.unavailable` "Remote proxy unavailable"; `reverseRelay.portUnavailableRetrying`/`.unavailableRetrying` "Remote SSH relay port unavailable; retrying in 2 seconds" / "…relay unavailable; retrying in 2 seconds"; and four "parked" states each pointing at a **Reconnect** action: `cleanupBlocked` "cmux could not clean up the previous SSH connection to %@. Check that the host is reachable, then use Reconnect to try again."; `notActive` "The SSH connection is not active. Use Reconnect to try again."; `proxyNotReady` "The cmux proxy tunnel to %@ did not become ready. Automatic reconnect paused; use Reconnect to try again."; `relayNotReady` "The cmux relay on %@ did not become ready (the host may not allow SSH remote port forwarding). Automatic reconnect paused; use Reconnect to try again."
- **`detectedSSH.fileDrop.*`** (3) — dropping a file onto an auto-detected SSH terminal to upload it: not a local file URL, SCP timed out, upload failed generically.
- **`remoteRelay.commandDenied`** "Remote relay command denied" — **defined but not referenced anywhere in source** (no non-string-table hit in the whole checkout).
- **`connection.relay.*`** (3, shared macOS/iOS, `RelayConnectionDiagnostic+FailureDescription.swift` in `Packages/Shared/CmuxIrohTransport`): `nativeFailure` "Relay connection to %1$@ failed: %2$@.", `timedOut` "The relay connection timed out.", `unavailable` "Unable to connect. Check your network and try again."
- **`cloudEnv.*`** (3, `Sources/Surfaces/CloudEnvDelivery.swift`) — delivering an environment/workspace onto a Cloud machine: "Environment delivery was cancelled.", "Environment delivery failed.", and `workspaceCleanupFailed` "The temporary environment receiver workspace %@ could not be removed. Inspect the machine before retrying."
- **`cloudNotification.subtitle.machine`** "%1$@ on %2$@" — notification subtitle format pairing a workspace/agent name with its Cloud machine name.
- **`controlSocket.*`** (2) — one message, "Terminal session is out of date; restart the shell and try again", reused twice: once as a raw `ERROR:` — prefixed control-socket wire reply (`controlSocket.reportShellState.invalidTerminalLifecycleID`) and once as its human-facing sidebar surface (`controlSocket.surface.reportShellState.invalidTerminalLifecycleID`, no `ERROR:` prefix).
- **`surfaceCatalog.error.*`** (7) — errors from the CLI/socket `open`/`surface` commands' resource resolver (`Packages/macOS/CmuxSurfaceCatalogModel`): ambiguous remote placement (terminal exists on more than one remote tab), destination/resource/surface not found, "This machine is not connected: %@.", unsupported, and a generic "%1$@ is unavailable: %2$@".
- **`surfaceDrop.cloudMachineMismatch`** "Cloud workspaces can only hold terminals, browsers, and displays from their own Cloud machine. Open a local workspace and move the splits there." — dragging a split from one Cloud machine's workspace onto another's.

## Misc single strings

- `tab.untitled` "Untitled Tab" — fallback tab title (`WorkspaceCloseTabsBatching.swift`) when a tab has no derivable name during a close/batch operation.
- `textSelection.copyText` "Copy Text" — the context-menu item for the read-only, copy-only text-selection mode (`CopyOnlyTextSelection.swift`) used over non-terminal text surfaces.
- `accessibility.workspacePosition` "%1$@, workspace %2$lld of %3$lld" — VoiceOver-only announcement format for a workspace's position among its siblings.
- `proWelcome.workspace.title` "Welcome to cmux Pro" — window/tab title for the one-time, chromeless in-app web page (`/app-pro-welcome`) opened automatically the first time a user's account becomes Pro (`ProWelcomeChecklist.swift:191-283`); reuses an existing tab on relaunch if the checklist workspace is still open.
- `clipboard.sshError.*` (2) — formatting helpers (`%lld. %@ (%@): %@` / `"SSH error (%@): %@"`) used only to render SSH-originated clipboard failures inline.
- `uiTest.bonsplit.action.title` "UITest Action %lld" — synthetic label used only by an internal UI test fixture, not user-facing.
- `agentRestore.*` (10) — the CLI-facing messages `cmux restore --surface` prints/returns when re-admitting an agent session into a surface after a restart: admission validation failures, "The surface restore record changed. Run 'cmux restore --surface' again.", live-owner conflict ("This agent session is already running in process %1$lld. cmux did not start another copy. To take it over here, stop process %1$lld, then run 'cmux restore --surface' again."), unreadable/timed-out verification, and an unverifiable-so-not-auto-resumed notice — plus two UI-facing recovery strings, "Restoring saved agent session…" and "%1$@ session is running in process %2$@. Waiting for its writer to become available…", shown while a workspace reattaches on launch.

## Coverage note additions

`agentRestore.*`, `devices.*`, `auth.*` (macOS), `connection.*`, `cloudEnv.*`, `cloudNotification.*` were absent from `cmux-08`'s own leftover-prefix sweep entirely (not listed as "catalogued" or "noted"), not just under-documented — they weren't on its radar. `ghostty.*` was named in its coverage note but never actually itemized.

## The iOS app: gaps beyond `cmux-08`'s sign-in/settings/dashboard coverage

`cmux-08` catalogued sign-in, the main Settings screens, and two dashboard pages in depth. These `mobile.*`-prefixed features were not covered there.

### Manual device pairing (non-Iroh)

A fallback to the automatic Iroh discovery/pairing flow, for entering a Mac's connection details by hand: `mobile.addDevice.*` — fields **NAME**, **HOST**, **PORT** (placeholder `58465`), action **Pair** (`PairingView.swift`). Companion copy actions on the manual pairing screen: `mobile.pairing.manual.copyIP` "Copy IP", `.copyPort` "Copy Port". A one-time migration banner nudges existing manual/raw-TCP users onto Iroh: `mobile.autoConnectMigration.useAutoConnect` "Use Iroh" (`MobileAutoConnectMigrationActions.swift`).

### Advanced Iroh networking: custom and private routes

Under iOS Settings > Networking, beyond the basic Iroh toggle (`cmux-08` line 4078 only names "Networking (→ Iroh settings above)"): a **custom relay** editor and a **private path** editor (`MobileIrohCustomRelayEditor.swift`, `MobileIrohCustomPrivatePathEditor.swift`, surfaced from `MobileIrohSettingsView.swift` and per-Mac from `MacComputerDetailView.swift`).
- `mobile.iroh.custom.name` "Name", `.summary` "%1$@ · %2$@", `.authentication.none` "None" — a named custom relay entry.
- `mobile.iroh.private.name` "Name", `.port` "Port", `.note` "Use a private route for Tailscale alternatives, a company VPN, or a network you operate. cmux still authenticates the Mac before use.", `.footer` "Iroh discovers LAN and VPN paths after authenticating the Mac. Custom raw TCP routes are not accepted because they cannot prove the remote Mac." — a private (VPN/LAN) route entry; explicitly distinguishes "private route" (accepted, still authenticated) from a raw custom TCP route (rejected, can't prove Mac identity).
- `mobile.iroh.diagnostics.failure.none` "None" — a diagnostics screen's no-failure state.
- `mobile.connections.method.iroh` / `mobile.settings.activeTransport.iroh` / `mobile.settings.connectionMethod.automatic` / `mobile.onboarding.connect.method.automatic` — all render "Iroh" as the (currently sole) connection-method label across four different pickers/summaries.
- `mobile.connections.direct.addConfirm` "Add" — confirms adding a direct-connection entry.

### Managing paired Macs from the phone

Beyond pairing itself: `mobile.computers.hide` "Hide" / `.unhide` "Unhide" — remove a Mac from the visible list without unpairing it. `mobile.computers.forget.confirmMessage` "It's removed from all your devices. If it's still online, it reappears the next time it connects." — the confirmation copy for fully forgetting a Mac. `mobile.computers.pinging` "Pinging…" — a live reachability-check state shown per Mac row. `mobile.computers.field.icon`/`.name`/`.role` — editable per-Mac fields. `mobile.computers.build.dev` "DEV" / `.rc` "RC" / `.devTaggedFormat` "DEV · %@" and `mobile.buildType.beta`/`.demo`/`.dev`/`.prod` — build-channel badges shown next to a Mac's name/version. `mobile.demo.computerName` "Demo Mac" — a fixture name used in App Store screenshot/demo mode.

### Remote-controlling the macOS Simulator from iPhone

A live video-stream + touch-input remote control of the Mac's iOS Simulator (`SimulatorStreamPane.swift`; the macOS-side `simulator.*` feature itself is out of my scope, but this phone-side control surface is `mobile.*` and undocumented). States, each with title+detail:
- **Locked**: "Simulator In Use" / "Another phone is controlling this Simulator." — another device already has iPhone Control.
- **Stalled**: "Reconnecting to Simulator" / "The video feed stalled. Restoring the stream."
- **Waiting**: "Waiting for Simulator" / "The first frame will appear when the Mac is ready."
- **Disconnected**: "Simulator Disconnected" / "Reconnect to the Mac to continue streaming."
- Control-ownership badge: **"iPhone Control"** (this phone owns input) vs. **"Connecting"** vs. **"View Only"** (someone/something else owns it, or view-only mode).
- Hardware button row: Home, Lock, App Switcher, Volume Up, Volume Down, Siri, plus a "More Buttons" overflow (accessibility label) and a text-entry field (placeholder "Text") with a **Send Text** action.

### Task composer: browsing the Mac's folders from the phone

Starting a new task from iPhone lets you pick a working directory on the paired Mac by browsing rather than typing (`TaskComposerDirectoryPickerView.swift`, `TaskComposerDirectoryBrowseScreen.swift`): a **Home** shortcut, "Use "%@"" to confirm a folder, an empty-folder state "No Subfolders", a Mac-too-old gate "Install the latest cmux on the Mac to browse every accessible folder.", and a degraded-search notice "This Mac returned limited search results. Browse to reach every accessible folder." Composer also has: `mobile.taskComposer.effort.error.queryFailed` "Couldn't load efforts" (effort-level picker failed to load), `mobile.taskComposer.promptPlaceholder` "Describe what you want to accomplish", `mobile.taskComposer.promptTitle.agentFormat` "Ask %@", template icon choices Bolt/Bug/Test (`mobile.taskComposer.template.icon.*`), and `mobile.taskComposer.workspaceGroup.none` "None".

### Notification feed screen

The phone's aggregated feed of agent alerts across all paired Macs (`NotificationFeedStatusView.swift`): loading state "Collecting agent alerts from your paired Macs.", row action **Open**, read/unread toggle **Read**, row field format "%1$@: %2$@" with a "From" label for the source Mac/workspace, and named preview fixtures "MacBook Pro" / "Studio" / workspace "Docs" (used for the feed's empty-state or App Store preview rendering, not live data).

### Onboarding flow

Beyond the sign-in screen `cmux-08` covers: `mobile.onboarding.back`/`.next`/`.skip`, a push-permission step with `mobile.onboarding.push.notNow` "Not Now", and a live preview pane during setup showing simulated activity — `mobile.onboarding.preview.computer` "MacBook Pro", `.live` "Live", `.workspace.docs` "Docs", `.workspace.ios` "iOS avatar tuning", `.workspace.waiting` "Drafting release notes…" (sample workspace names/states used purely to illustrate what the app will look like once connected). `mobile.setupHelp.signInTitle` "Sign in" / `.youAreHere` "You are here" — a setup-help overlay pointing at where in the UI to look.

### Mobile surfaces: project explainer and todo panel

`mobile.surface.explainer.project` "This pane browses the project's files on your Mac." — inline explainer shown on the mobile project-browsing surface. `mobile.surface.kind.todo` "Todo" and `mobile.surface.workspaceContextFormat` "%1$@ · In "%2$@"" — surface-type label and breadcrumb format. `mobile.todo.status.done`/`.todo` and `mobile.todo.progressFormat` "%1$d of %2$d done" — the mobile counterpart to the macOS `workspaceTodoPane`, showing checklist completion.

### Terminal keyboard toolbar (full button inventory)

Resolves `cmux-08`'s "Unverified" note about the shipped default toolbar order — the ordering itself is still not traced, but here is every button/label that can appear, gathered from `mobile.terminal.action.*` (uncovered) plus the already-partially-covered `terminal.input_accessory.*` and `terminal.shortcut.name.*`: Alt, Ctrl (`^` glyph variants ^C/^D/^L/^Z also exist as direct-insert shortcuts), Esc, Tab, Home, End, Page Up (`PgUp`)/Page Down (`PgDn`), arrow keys (↑↓←→), ⌘ (Command), ⇧ (Shift), `~` (tilde), `|` (Pipe), `@` (At), and a **Zoom In** control with a live point-size readout (`mobile.settings.pointsFormat` "%lld pt", `mobile.terminal.zoom.current_size` "%lld pt"). A `terminal.shortcut.name.ollama` string exists (noted by `cmux-08`) with no matching insertion action found — likely an unshipped/planned quick-insert shortcut, still unconfirmed.

### Debug-only settings labs (not shipped)

Four Settings-reachable screens are compiled only under `#if DEBUG` (confirmed by reading their `#if` guards) and do **not** ship in release builds, despite living under the same `mobile.settings.*`/`mobile.hideComputersVerifier.*` namespace as real settings:
- `TaskComposerShellIconLabView.swift` (`mobile.settings.shellIconLab.footer` "The first value is icon size. Stroke weights are 400 regular, 500 medium, and 600 semibold. α changes contrast; ○ changes circle size. Choose a variant, then reopen New Task.") — compares Shell-badge icon variants.
- `UnreadIndicatorLabView.swift` (`mobile.settings.unreadIndicatorLab.pointsFormat` "%.1f pt") — tunes the unread-indicator dot size.
- A toast-demo screen (`mobile.settings.toastDemoDelayValueFormat` "%d s") — fires a test toast after a configurable delay.
- `HideComputersVerifierView.swift` (`mobile.hideComputersVerifier.*`, 8 strings: `allHidden=`, `halfHiddenAbsent=`, `halfNoDisconnectedBanner=`, `halfRemainingPresent=`, `refreshPreservedEmptyList=`, `refreshPreservedHalfList=`, status `PASS`, `page `) — an automated self-test screen that verifies the hide/unhide-computers logic and prints raw pass/fail diagnostics; not a user surface at all, effectively a UI test harness rendered as a view.

### Small chrome not written up individually

Genuinely minor, self-explanatory strings intentionally left as a list rather than expanded: `mobile.common.done/edit/ok/save`, `mobile.composer.send`, `mobile.browser.back`/`.stop`, `mobile.browserStream.back`, `mobile.feedback.placeholder` "What happened?" / `.sendAction`, `mobile.screenshot.notification.reply.send`, `mobile.textSheet.done`, `mobile.workspace.back`/`.pin`/`.customize.name`, `mobile.workspace.preview.justNow`/`.minutesCompactFormat`/`.hoursCompactFormat`/`.daysCompactFormat` (compact relative-time badges, "now"/"%dm"/"%dh"/"%dd"), `mobile.workspaces.filter.readState` "Show", `mobile.workspaces.macPicker.titleWithBuildFormat`, `mobile.workspaceGroup.footer.a11y.label` "End of %@", `mobile.localDataReset.erasing` "Erasing cmux data on this device…", `mobile.workspaceAction.failure.legacyFormat`, `mobile.deviceTree.lastSeenFormat` "Last seen %@", `mobile.simulatorStream.qualityHigh`/`.appSwitcher`/`.volumeUp`/`.volumeDown` (covered above under Simulator streaming), `mobile.workspaces.preview.mixed.betaAnchor` "Beta Lead" (App Store preview/fixture data, not live UI).

## Corrections to other sections

- **`cmux-08` line 245/4223, `caffeine.*`**: described as just "Keep Mac Awake toggle errors, macOS side of the iOS Mac-power feature." It is a shipped three-surface feature (app menu checkbox, status-bar menu, iPhone remote toggle with its own connected/outdated/load-failure states) — see "Keep Mac Awake" above.
- **`cmux-08` line 4223, `detail.*` and `mode.*`**: described as "likely shared debug-lab chrome, not traced to one owner" / "generic Compact/Expanded/System selector, reused across surfaces." Both are traced now to `Prototypes/SettingsShellLab` exclusively — a dev prototype not compiled into the shipped app target, not "reused across surfaces."
- **`cmux-08` line 4223, `projectSchemes.*`**: described as "purpose/entry point not fully traced." Resolved — it's the Schemes tab of the Project panel (`.project` panel kind), a read-only Xcode-scheme inspector. See "Project panel: Xcode schemes tab" above.
- **`cmux-08` line 4223, `theme.*`**: grouped with `appearance.*` as "likely the same picker family." They are two separate, independently-wired pickers (in-app-browser Design Mode vs. app-wide appearance) — see "App Icon / Appearance / Theme pickers" above.
- **`cmux-08`'s Unverified section, `relativeTime.*` and `fileExplorer.search.*`**: these were flagged as rendering their own key names. They do not; they are plural forms in the string table, which an earlier flat dump of it could not read. Their real wording is given above and in `cmux-08`.

## Coverage note (per-prefix coverage table)

Coverage = fuzzy text/key match against the full existing catalog before this file was written; "Addressed here" = write-up added above regardless of the fuzzy score, since `cmux-08` had already flagged nearly all of these as under-documented.

| Prefix | Strings | Had a prior trace | Addressed here |
|---|---|---|---|
| debug | 261 | 225 (already "in depth" per cmux-08) | not re-expanded |
| diffViewer / dock / fileExplorer / markdown / search / globalSearch / customSidebarRenderer | 216 combined | mostly covered (already "in depth") | not re-expanded |
| agentRestore | 10 | 0 (missed entirely by cmux-08's sweep) | yes |
| automation | 9 | 0 | yes |
| example | 27 | 1 | yes |
| projectSchemes | 15 | 2 | yes |
| devices | 8 | 0 | yes |
| historyPane | 10 | 0 | yes |
| shortcutDiscovery | 8 | 1 | yes |
| surfaceCatalog | 7 | 0 | yes |
| remoteSession | 8 | 0 | yes |
| rpc.v2 | 8 | 0 | yes |
| memoryDiagnostic / memory | 6 | ~5 | yes |
| filePreview | 7 | 5 | yes |
| detail / mode | 9 | ~7 (false-positive fuzzy matches; traced to a dev prototype) | yes |
| appIcon / appearance / theme | 10 | ~6 | yes |
| all other leftover prefixes (crashBreadcrumb, notificationHook, notification, managedPolicy, defaultTerminal, error, fileDrop, emptyPanel, tab, textSelection, accessibility, proWelcome, clipboard, controlSocket, uiTest, relativeTime, remotePTYAttach, remoteRelay, detectedSSH, surfaceDrop, connection, cloudEnv, cloudNotification, toolbar, ghostty, language, push, auth) | ~85 | mixed, mostly thin | yes |
| iOS `mobile.*` | 1,411 | 1,254 (fuzzy) | ~157 uncovered strings written up above by feature; remainder (common chrome, already-covered sign-in/settings/dashboard) left as-is |
| iOS `terminal.*` | 49 | 33 | folded into the keyboard-toolbar write-up above |
| iOS `auth.*` / `computers.*` / `connection.*` / `push.*` | 32 | 31 | `auth.*` already covered by cmux-08's full taxonomy line; `computers.*`/`push.generic.*` added above |
