# Gaps found in remote, cloud and system tools

Prefixes checked: `remote*` (incl. `remoteDaemon`, `remoteSession`, `remoteTmux`, `remotePTYAttach`, `remoteRelay`), `cloud*` (incl. `cloudTree`, `cloudPane`, `cloudTunnel`, `cloudVM`, `cloudEnv`, `cloudNotification`), `machines`, `computerUse`, `simulator` (~408 strings), `sudo`, `taskManager`, `paneMemoryGuardrail` — 1,192 strings total. No `vault.*` or `vpn.*` keys exist (those words only appear inside `cli.*`/help-text strings, already covered by `cmux-07`). `cmux-07-remote-cloud.md` already covers this territory in unusual depth (~360 lines); a key/text substring check against all `cmux-*.md` files came back ~28% literally matched, but manual review shows most of the remainder is paraphrase-covered. The genuine gaps below are concentrated in: exact CLI/error copy for sudo, remote-daemon bootstrap, remote-tmux and parked-session failures; the Cloud terminal-pane attach/overlay UI (a layer `cmux-07` doesn't mention at all); Machines panel sign-in gating; and the Simulator's permission/Web-Inspector/device-state catalogs, which `cmux-07` summarizes in two paragraphs for ~400 strings.

## SSH / remote session

### Reconnect can enter a manual-only "paused" state, distinct from the backoff loop
`cmux-07`'s Reconnect section documents the automatic 3s/6s/12s/60s backoff and its terminal status lines, but not this separate state: a suspended/parked connection stops retrying on its own and needs a person.
- `remote.notification.suspendedTitle` — "SSH Reconnect Paused"
- `remote.state.suspended.detail` — "Can't reach %@ — automatic reconnect is paused. Use Reconnect when your network is back."
- `remote.statusEntry.suspended` — "SSH reconnect paused (%@): %@"
- `remote.status.error` — "Error"; `remote.status.terminalDisconnected` — "Remote terminal session disconnected"
- `remote.state.connected.vmNoProxy` — "Connected to %@ (VM, proxy disabled)" — a connected-but-degraded state (no proxy) not previously listed among the terminal states.
- Disconnect banner text printed into the pane itself (distinct from the `[cmux] ssh exited...` reconnect lines already documented): `remote.disconnectBanner.sessionEnded` = "[cmux] remote session disconnected: %s", `remote.disconnectBanner.reconnectHint` = "[cmux] Press Enter to reconnect. This terminal will stay disconnected until then.", `remote.disconnectBanner.reconnectUnavailableHint` = "[cmux] Reconnect this workspace from the sidebar or by running the original cmux remote command again."
- Source: `remote.*` keys referenced across `packages/core/src/runtimes/terminals/` SSH session state (grep-confirmed present, not individually traced line-by-line this pass).

### "Parked" sessions have four distinct, exact reasons
`cmux-07` mentions parking exists ("a session that cannot become ready parks... rather than retrying forever") but not the reason text shown for it:
- `remoteSession.parked.cleanupBlocked` — "cmux could not clean up the previous SSH connection to %@. Check that the host is reachable, then use Reconnect to try again."
- `remoteSession.parked.notActive` — "The SSH connection is not active. Use Reconnect to try again."
- `remoteSession.parked.proxyNotReady` — "The cmux proxy tunnel to %@ did not become ready. Automatic reconnect paused; use Reconnect to try again." (matches the doc's "parks if no proxy endpoint is published within 60 seconds" case)
- `remoteSession.parked.relayNotReady` — "The cmux relay on %@ did not become ready (the host may not allow SSH remote port forwarding). Automatic reconnect paused; use Reconnect to try again." — a distinct failure mode: the remote host's `sshd` has `AllowStreamLocalForwarding`/remote-forward disabled.
- `remoteSession.controlMaster.ownershipUnavailable` — "SSH connection is busy in another cmux process." (ControlMaster contention between two cmux processes on the same Mac)
- `remoteSession.proxy.unavailable` — "Remote proxy unavailable"
- `remoteSession.reverseRelay.portUnavailableRetrying` / `.unavailableRetrying` — "Remote SSH relay port unavailable; retrying in 2 seconds" / "Remote SSH relay unavailable; retrying in 2 seconds" — a fixed **2-second** retry cadence for the reverse relay specifically, separate from the documented exponential SSH backoff.

### `remotePTYAttach.*` — persistent-PTY attach failure reasons
Not mentioned in `cmux-07` at all; ties to the `ssh-pty-attach --wait` callers the Reconnect section references.
- `remotePTYAttach.error.attachFailed` — "remote PTY attach failed"
- `remotePTYAttach.error.daemonTimeout` — "remote daemon did not respond in time"
- `remotePTYAttach.error.inputBackedUp` — "remote PTY input is temporarily backed up"
- `remotePTYAttach.error.sessionEnded` — "persistent SSH PTY session is no longer running"
- `remotePTYAttach.error.allocationDiagnostic` — `%@` (raw diagnostic passthrough)

### `remoteDaemon.*` bootstrap/upload failure copy (`cmuxd-remote` install path)
`cmux-07`'s Relay daemon section describes the upload/verify mechanism but not its user-facing failure text:
- `remoteDaemon.bootstrap.buildOutputEmpty` — "The remote daemon files are missing or empty"
- `remoteDaemon.bootstrap.failed` — "Could not prepare the remote daemon"
- `remoteDaemon.bootstrap.helloFailed` — "Could not confirm that the remote daemon is ready"
- `remoteDaemon.bootstrap.probeFailed` — "Could not inspect the remote daemon installation"
- `remoteDaemon.bootstrap.noDaemonForPlatform` — "This cmux build has no remote daemon for the remote host's platform"
- `remoteDaemon.bootstrap.reconnectPaused` — "Automatic reconnect paused because bootstrap cannot proceed; repair the reported remote failure and use Reconnect to try again." (another distinct paused-state trigger, specific to bootstrap)
- `remoteDaemon.bootstrap.removeCorruptFailed(WithDetail)` — "failed to remove corrupt remote daemon install(: %@)"
- `remoteDaemon.upload.createDirectoryFailed(WithDetail)`, `.installFailed(WithDetail)`, `.verifyFailed(WithDetail)` ("remote daemon integrity verification failed" — the SHA-256 manifest check failing), `.transferFailed(WithDetail)` = "failed to upload cmuxd-remote: %@"
- `remoteDaemon.error.missingPersistentPTYCapability` / `.missingRequiredFunctionality` — "remote daemon does not support persistent SSH PTY sessions; reconnect the remote workspace to update cmux" / "...is missing required functionality..." — an old `cmuxd-remote` build on the remote host is detected and reported explicitly, telling the user to reconnect (which re-uploads a fresh binary).
- **New feature not mentioned anywhere in `cmux-07`**: a `cmux notify clear` (or equivalent CLI-relay) path exists, scoped by workspace and surface, with its own validation: `remoteDaemon.error.cloudNotificationClearWorkspaceInvalid` ("Cloud CLI notification clear requires a valid workspace_id"), `.cloudNotificationClearWorkspaceDenied` ("...target does not match this workspace" — cross-workspace clear is rejected), `.cloudNotificationClearSurfaceInvalid`, `.cloudNotificationClearEncodingFailed`. This is the remote-side counterpart of the CLI relay clearing a notification badge back on the originating Mac.
- Source: `Sources/RemoteDaemonBootstrap*.swift` (grep-confirmed key usage, not fully read this pass).

### `remoteTmux.*` — exact error copy for `cmux ssh-tmux`
`cmux-07`'s Remote tmux section covers the feature narratively (3.2+ requirement, mapping, limitations) but not these exact failure strings:
- `remoteTmux.error.tmuxNotFound` — "tmux was not found on %@. cmux ssh-tmux mirrors a remote tmux server (tmux %@ or newer required)."
- `remoteTmux.error.unsupportedVersion` — "remote session server is too old (found %@; cmux needs version %@ or newer)"
- `remoteTmux.error.unreachable` — "host unreachable: %@"
- `remoteTmux.error.launchFailed` — "failed to launch SSH: %@"
- `remoteTmux.error.commandFailed` / `.commandFailedWithDetail` — "remote command failed (exit %d)" / "...(exit %d): %@"
- `remoteTmux.error.windowCreationFailed` — "cmux could not create a new window"
- `remoteTmux.error.controlSocketPathTooLong` — "SSH control socket path is too long for a Unix domain socket (%lld > %#@count2@); home directory path is too long" — an edge case not previously documented: ControlMaster multiplexing (used for the SCP upload path per `cmux-07`) can fail on a Mac with a very long home-directory path, because Unix domain socket paths have a fixed length limit.
- `remoteTmux.pane.close` — "Close Pane"; `remoteTmux.tab.windowPaneIndexed` — "%1$@ [%2$@]" (tab title format for a mirrored tmux pane); `remoteTmux.version.unknown` — "unknown" (shown when the remote tmux version couldn't be parsed).
- `remoteRelay.commandDenied` — "Remote relay command denied" (the CLI-relay deny-by-default allowlist rejecting a method, referenced narratively in the Relay daemon section but not quoted).

## Cloud

### Cloud terminal-pane attach/reconnect UI — not covered in `cmux-07` at all
`cmux-07`'s "Attach failure reasons surfaced in the UI" bullet is about the **Cloud Tree sidebar**; this is the separate overlay shown **inside the terminal pane itself** while it's attaching:
- `cloudPane.attachment.attaching` — "Attaching to %@…"; `.attachingAgain` — "Attaching to %@… (attempt %lld)"; `.reconnecting` — "Reconnecting to %@… (attempt %lld; %@)"
- Reasons interpolated into that reconnecting string: `cloudPane.attachment.reason.handshakeTimedOut` ("the machine did not finish the attach handshake"), `.livenessTimedOut` ("the connection stopped answering"), `.transportClosed` ("the connection closed")
- New-terminal failure dialog: `cloudPane.newTerminalFailed.title` — "Couldn't start a terminal on %@" / `.shortTitle` — "Couldn't open terminal" / `.recovery` — "Check that the machine is connected, then try Cmd+D or Cmd+T again." / `.invalidResult` ("The machine did not return the new terminal. Refresh the machine before trying again.") / `.noWorkspace` ("This machine has no available workspace. Refresh the machine and try again.") / `.stateUnavailable` ("The machine's current state could not be loaded. Reconnect and try again.")
- Layout-desync dialog: `cloudPane.layoutSyncFailed.title` — "Couldn't update the machine workspace" / `.detail` — "Your local pane change was kept, but the machine layout could not be synchronized. Reopen the machine workspace to see its current layout." / `.ambiguous` — "The pane does not identify a unique machine tab. Reopen it from the machine workspace." (a local split/close on a Cloud pane can silently fall out of sync with the machine's real tmux-like layout state)

### Cloud terminal overlay states (`cloud.overlay.*`) — separate layer from `cloudPane.*`
A second, distinct set of full-pane overlay states, not mentioned in `cmux-07`:
- `cloud.overlay.materializationFailed.title` — "Cloud terminal could not start" / `.detail` — "The secure Cloud terminal endpoint is unavailable."
- `cloud.overlay.disconnected.title` — "Cloud session disconnected" / `.detail` — "The terminal session is offline. Reconnect when you are ready."
- `cloud.overlay.suspended.title` — "Cloud session unavailable" / `.detail` — "Automatic reconnect paused. Reconnect to try again." (the pane-level surfacing of the `remoteSession`/`remote.state.suspended` paused state above)
- `cloud.overlay.error.title` — "Cloud session unavailable" / `.detail` — "The secure terminal endpoint is unavailable."
- `cloud.overlay.manual.unavailable.title` — "Cloud terminal unavailable" / `.detail` — "The terminal view is unavailable. Reconnect to restore it."; `.reopen.detail` — "Close this tab and reopen the terminal from the Cloud sidebar."
- `cloud.link.inputTooLarge` — "The machine input chunk is too large. Split it into smaller chunks and retry." — a previously undocumented cap on how much data can be written to a Cloud terminal in one RPC chunk.
- `cloud.link.trustedListenerPending` — "The Cloud machine is still preparing remote access. Try again shortly."
- `cloud.fileDelivery.noResult` — "The machine's file receiver ended without a result." (ties to the `cmux file receive` path used by `vm push --secret`, per `cmux-07`'s SCP section)

### Cloud VM plan-gating — resolves an "Unverified" item from `cmux-07`
`cmux-07`'s Unverified section flags that it couldn't trace which machine sizes require Pro vs Max. The exact upgrade-copy strings resolve the boundary:
- `cloudVM.error.requiresPro.action` — "Upgrade to cmux Pro at https://cmux.com/pricing?cmux_source=mac_vm_requires_pro_error&cmux_client=mac to create Cloud VMs." — **Pro is required to create a Cloud VM at all.**
- `cloudVM.error.memoryRequiresPlan.action` — "Larger machines need cmux Max. Upgrade at %@, or choose a smaller machine." — **Max is required only for the larger memory sizes**; a smaller size stays available on Pro. This confirms the two-tier gating `cmux-07` described as unclear.
- `cloudVM.error.reference` — "Reference: %@" (a diagnostic reference id shown alongside a VM error, matching the "Copy diagnostic reference" pattern in the Cloud Diagnostics panel).
- `cloudVM.publication.error.*` (missingDNS, invalidDNS, missingDomain, missingDomainFields, missingDomainList, missingFields, missingList) — internal response-shape validation errors for the domain-publication API (`cmux cloud domains verify`); user-facing only as a generic failure, not enumerated individually in the doc's Cloud domains section.

### Machines panel — sign-in gating not covered
Not mentioned anywhere in `cmux-07`'s Machines panel section: before the panel can show any machine, it gates on cmux account sign-in:
- `machines.auth.title` — "Sign in to use Cloud Machines"
- `machines.auth.subtitle` — "Sign in to see and manage the machines in your cmux account."
- `machines.auth.checking` — "Checking your cmux account…"

### Machines panel — per-operation status labels
`cmux-07` documents the shared Cloud Diagnostics phase pipeline; the Machines panel additionally shows a short per-action label while an operation runs on a specific machine, distinct from that pipeline's phase names:
- `machines.operation.create` — "Creating a new machine…"; `.checkpoint` — "Checkpointing %@…"; `.delete` — "Deleting %@…"; `.fork` — "Forking %@…"; `.rename` — "Renaming %@…"; `.status` — "Checking %@…"; `.openDesktop` — "Opening %@'s desktop…"; `.openShell` — "Opening %@…"; `.generic` — "Working on %@…"
- `machines.agent.operation.starting` — "Starting %@…" (agent quick-launch, e.g. Claude/Codex/OpenCode on a machine)
- `machines.tree.error` — "Cloud tree error" (generic row-level error label)
- `machines.kind.base` / `machines.kind.desktop` — "Base" / "Desktop": machines are internally categorized by kind, distinguishing the always-on Base VM from a general desktop-image machine — not mentioned as a distinct taxonomy in `cmux-07`.

### MDM-disabled copy actually shown to the user
`cmux-07`'s policy table describes `DisableCloud` behaviorally but doesn't quote the strings a user actually sees:
- `cloud.managed.disabled` — "Cloud Machines are disabled by your administrator."
- `cloud.managed.tunnelDisabled` — "Cloud private-network access is disabled by your organization."
- `cloud.feature.disabled` — "Cloud Machines are temporarily unavailable." (the separate remote-feature-flag kill switch, distinct from MDM — parallels `simulator.featureDisabled.*` documented for the Simulator pane).

### Cloud project environments (`cmux vm dev`) — delivery has real, shipped error handling
`cmux-07` flags `cmux vm dev` as "design, partially shipped." The `cloudEnv.*` strings show the environment-delivery step specifically (part of documented "P1 shipped" scope) has a real, user-facing failure surface, not just internal plumbing:
- `cloudEnv.error.deliveryCancelled` — "Environment delivery was cancelled."
- `cloudEnv.error.deliveryFailed` — "Environment delivery failed."
- `cloudEnv.error.workspaceCleanupFailed` — "The temporary environment receiver workspace %@ could not be removed. Inspect the machine before retrying." — implies `vm dev`/`vm env` provisioning creates a temporary receiver workspace on the machine as an implementation detail, which can leak if cleanup fails.

### Cloud VPN — plain-language explainer and a few additional errors
- `cloud.vpn.setup.howItWorks.body` — "Connect Safari, Chrome, and other apps to your Cloud machines. Each machine keeps its private IP address and original ports. Only traffic to your Cloud network uses this encrypted connection. cmux terminals, Ports, and Desktop work without it." (the in-Settings explainer copy for the system-wide VPN role vs. the in-app userspace tunnel `cmux-07` describes).
- `cloudTree.tunnel.help` — near-identical restatement shown from the sidebar's tunnel-status popover.

### Cloud tree — a few actions not mentioned
- `cloudTree.menu.openFullClient` — "Open Full cmux-tui Client" (opens the bundled `cmux-tui` terminal client directly against a tree node — the sidebar-menu equivalent of `cmux vm tui`, which `cmux-07` documents only as a CLI command).
- `cloudTree.menu.copyPrivateURL` — "Copy Private Address URL" with `cloudTree.operation.copyPortLink` — "Preparing the link…": copies a port's private-network URL (the `10.x.x.x:port` form `cmux-07` describes under Cloud VPN) to the clipboard.
- `cloudTree.port.forwardListenerFailed` — "cmux could not open a local port for the forward: %@"; `.forwardListenerCancelled` — "The local port forward was closed before it started."; `.noPort` — "%@ has no port to open."; `.noPrivateAddress` — "%@ has no private network address yet; refresh the machine list and retry." (this last one paraphrase-matches an already-documented sidebar line, but the "no port to open" / listener-failed cases are new.)
- `cloudTree.pane.connecting` — "Connecting to %@…" / `.failed` — "Couldn't open %@" / `.retryHint` — "Close this pane and open it again from the sidebar." — a tree-opened pane's own connect/fail state, separate from both `cloudPane.attachment.*` and `cloud.overlay.*` above (three parallel attach-state surfaces exist for different pane-opening paths).

## Simulator pane

`cmux-07` covers the Simulator pane in one dense paragraph plus a note that most of its ~400 strings "vary by installed Xcode version" and weren't enumerated. Real gaps:

### Digital Crown / Apple Watch input exists in code but is dead — correction to `cmux-07`
`cmux-07` states the pane is "explicitly scoped to iPhone/iPad... the doc calls out that Apple Watch... [is] outside the pane's scope." This is contradicted by the implementation, though the contradiction is inert: `SimulatorPaneCoordinator+Input.swift:127` defines `rotateDigitalCrown(by:)`, documented in its own doc-comment as "Rotates the **Apple Watch** Digital Crown by a raw delta," and `simulator.action.crownUp`/`crownDown` ("Crown Up"/"Crown Down") and `simulator.activity.digitalCrown` ("Digital Crown") strings exist for it. Grep across `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/` finds **no call site** for `rotateDigitalCrown(...)` and no UI element referencing `crownUp`/`crownDown` — this is watchOS-era scaffolding, **defined but unused**, consistent with the device picker only ever listing iPhone/iPad runtimes (`simulator.device.none` = "No iPhone or iPad Simulators"). The doc's user-facing claim ("no watchOS") is accurate for what's reachable; the "outside scope" framing should note the code still carries unused watch-input plumbing rather than never having had it.

### Privacy/permission catalog — not enumerated
`cmux-07` says only "Permissions (grant/revoke/reset public + supported private permissions incl. push)." The full permission list (`simulator.privacy.*`) is: All Services, Calendars, Camera, Contacts, Limited Contacts, Critical Notifications, Face ID, HomeKit, Location While Using, Location Always, Media Library, Microphone, Motion, Notifications, Photos, Add Photos, Limited Photos, Reminders, Siri, Speech Recognition, App Tracking — each independently Grant/Revoke/Reset-able. Authorization state shown per permission (`simulator.authorization.*`): Granted, Denied, Limited, Not Determined, Unknown, plus a distinct Critical Alerts sub-state. Failure text when the active Xcode build can't mutate a given service: `simulator.control.privacyServiceUnavailable` — "The active Xcode does not expose %@ through simctl; cmux will not mutate private TCC or BulletinBoard stores in the host process." (i.e. cmux deliberately refuses to poke TCC/BulletinBoard SQLite directly as a fallback — a safety choice worth noting.)

### Web Inspector panel — not described beyond one clause
`cmux-07` mentions only "raw Web Inspector JSON commands to Safari/WKWebView targets." The panel (`simulator.webInspector.*`) has: target picker (`chooseTarget`, `noTargets` = "No inspectable pages", `refreshTargets`), a raw-JSON request editor (`rawRequest` = "Raw Web Inspector JSON Request", `send` = "Send JSON"), a response log (`responses`, `noResponses` = "No inspector responses", `clearResponses`, `truncatedResponse` = "Response truncated in this view"), page highlighting (`highlight`/`unhighlight` = "Highlight Page"/"Remove Highlight"), and an "In Use" busy state (`inUse`) plus `unavailable` = "Web Inspector is unavailable for this Simulator". Corresponding activity-log entries exist for attach/command/highlight/release/targets separately (`simulator.activity.webInspector*`).

### Device/connection/empty states
- Empty device list: `simulator.device.none` — "No iPhone or iPad Simulators" with help `simulator.device.none.help` — "Install an iOS runtime in Xcode, then refresh." (never mentioned — this is the pane's actual zero-state, distinct from any failure).
- Connection lifecycle badges (`simulator.status.*`): Connecting, Working (`loading`), Live (`streaming`), "Select a device to start", "Device Unavailable", "Simulator Connection Failed", "Simulator Renderer Stopped" — partially overlapping with the documented crash-fuse/worker-crash behavior but not previously listed as a discrete status vocabulary.
- `simulator.deviceState.*` — Booted, Booting, Shut Down, Shutting Down, Unknown (the underlying `simctl` device-state enum surfaced in the device picker).

### Camera — mirror modes and injected-app list
`cmux-07` covers camera injection sources (Placeholder/Static/Video/Host camera) and the Experimental label; not covered: mirror mode toggle `simulator.camera.mirror.auto`/`.on`/`.off` ("Automatic"/"On"/"Off" — whether the injected feed also mirrors to the Mac's display) and `simulator.camera.injectedApplications` ("Injected Apps" — a list of which installed apps currently have an active injected-camera session).

### App inspector fields
`simulator.application.*` — not mentioned: per-installed-app detail fields Bundle Identifier, Build, Executable, Minimum OS, App Path, Process ID, Version, Launch Arguments, "Wait for Debugger" (`waitForDebugger`), and a "Terminate Running App" (`terminateRunning`) action distinct from the general `terminate` action already documented — this one specifically kills an already-running instance before a fresh launch.

## Computer Use

### Onboarding wizard — richer than the "3-step wizard" summary
`cmux-07` compresses the onboarding flow to "Accessibility → Screen Recording → Done." The actual flow (`computerUse.onboarding.*`) is drag-based, not click-based: a hero screen ("Enable cmux Computer Use" / "cmux Computer Use needs these permissions to use apps on your Mac.") explains that permissions belong to a separate helper (`computerUse.onboarding.hero.helperNote` — "Permissions belong to a separate Computer Use helper. You can quit or reopen it without closing cmux or your terminal sessions."), then each permission step asks the user to literally **drag** the helper app's icon into the System Settings permission list (`computerUse.onboarding.dragHint` — "Drag this app into the list in System Settings, turn it on, then come back here.", `.dragTip` — "Drag the app card, not this window, into the permission list.", companion copy `Drag %@ into Accessibility` / `Drag %@ into Screenshots`), with a "Complete in System Settings" fallback link, a "Permission granted" confirmation step, and (macOS Tahoe only) an extra screen-capture confirmation sub-step (`computerUse.onboarding.companion.confirmCapture` — "Allow screen capture in the macOS alert" / `.detail` — "The system 'bypass' warning is expected here."). Ends on `computerUse.onboarding.done.detailReady` — "Setup is complete. You can now ask cmux to use apps on your Mac."

### Background continuation — not mentioned
`cmux-07`'s Follow/stop controls bullet lists Focus Computer Use / Focus Calling Terminal / Stop Using; missing is a distinct **"Continue in Background"** menu action (`computerUse.menu.continueInBackground`) shown alongside a `computerUse.menu.backgroundStatus` = "cmux Computer Use: Running in Background" state, plus `computerUse.menu.sessionTitle` ("%1$@ · %2$@") and `computerUse.menu.statusWithTarget` ("%1$@: %2$@") row formats and `computerUse.menu.unknownTarget` = "App" fallback. `computerUse.cursorOverlay.accessibilityLabel` — "Computer-use cursor" (an on-screen cursor overlay shown while an agent drives the Mac, accessibility-labeled for VoiceOver).

## Sudo approval broker

`cmux-07`'s Sudo section covers the approval-dialog flow well but not the CLI's own error/usage surface (`sudo.cli.*`, `sudo.error.*`), which is a real gap given the section already promises "the full lifecycle":
- Usage: `sudo.cli.usage` — "Usage: cmux sudo run [-r reason] [-t timeout] (-c 'command' | script.sh | -)"
- CLI-side argument errors: `sudo.cli.error.unknown_flag` ("sudo: unknown flag: %@"), `.unexpected_argument`, `.script_not_found` ("sudo: script not found: %@"), `.script_unreadable` ("sudo: script is not a readable regular file: %@"), `.input_read_failed` ("sudo: could not read the script from standard input").
- CLI-side plumbing errors before the request even reaches the GUI: `.request_capacity` ("sudo: too many approval requests are pending; resolve one in cmux and retry"), `.touch_id_setup_failed` ("sudo: could not start Touch ID setup; reinstall cmux and retry"), `.app_launch_failed` ("sudo: could not open cmux for approval; open cmux and retry"), `.request_write_failed`, `.requester_identity` ("sudo: could not verify the requesting process; retry the command"), `.result_wait_failed`, `.runner_context` ("sudo: could not start secure execution; retry from a cmux terminal"), `.enclosing_app` ("sudo: use the cmux CLI included with the cmux app, then retry" — blocks running a standalone/relocated `cmux` binary's sudo command outside the app bundle).
- Queued-wait line has a **singular variant** cmux-07 doesn't quote: `sudo.cli.queued.singular` — "sudo: request %@ queued; waiting up to 1 second for approval in cmux…" (vs. the plural "%d seconds" form already documented) — implies a `-t 1` timeout is grammatically special-cased.
- Post-approval execution failures the GUI-side "Errors cover the full lifecycle" bullet names generically but doesn't quote: `sudo.error.requester_unavailable` ("sudo request cancelled because the requesting process exited"), `.execution_interrupted` ("approved sudo execution was interrupted before a result was written"), `.execution_timeout` ("approved sudo execution timed out; the process tree was terminated"), `.staging_failed` ("the approved sudo script could not be staged safely"), `.runner_launch_failed` ("the independent sudo runner could not be launched"), `.process_launch_failed` ("the approved sudo command could not be launched"), `.cleanup_failed` ("sudo could not finish process cleanup; one or more processes survived").
- `sudo pending` list row fields: `sudo.approval.reason` ("Reason"), `.queued` ("Queued"), `.deny` ("Deny"), `.requester_value` ("%1$@ (PID %2$d)") — confirms the PID-attribution display format `cmux-07` describes narratively.
- Source: `CLI/CMUXCLI+Sudo.swift` (read this pass) confirms the CLI wraps `SudoCLICommand`/`SudoCLICommandError` and prints `error.message` verbatim with `error.exitCode` — the string catalog above is the exhaustive set of what that command can print.

## Task Manager

Mostly well covered by `cmux-07`; two small additions:
- `taskManager.error.title` — "Unable to load resource usage" is a distinct string from the already-documented refresh-failure text ("Unable to refresh Task Manager data.") — the former is an initial-load failure, the latter a refresh failure.
- `taskManager.memory.pane` / `.surface` — "Pane %@" / "Surface %@" row-naming formats for the `cmux memory` child-process-group attribution table, alongside the already-documented `taskManager.row.pane` used in the GUI table.

## Corrections to other sections

- **`cmux-07-remote-cloud.md`, Simulator pane section**: "explicitly scoped to iPhone/iPad... the doc calls out that Apple Watch... [is] outside the pane's scope" is accurate for what a user can reach, but the framing implies the codebase never touches watch input. In fact `SimulatorPaneCoordinator+Input.swift` still defines a `rotateDigitalCrown(by:)` method whose own doc-comment says "Apple Watch Digital Crown," and `simulator.action.crownUp`/`crownDown` strings exist — both are unreferenced by any view/button (defined but unused), not absent. Worth a one-line addendum rather than a contradiction fix, since the user-visible behavior claim itself is correct.
- **`cmux-07-remote-cloud.md`, Unverified section**, item "Exact behavior of `cloudVM.error.requiresPro` vs `memoryRequiresPlan` plan gating thresholds... was not traced": resolved above — Pro gates VM creation itself; Max gates only the larger memory sizes (a smaller size remains available on Pro). Can be moved out of Unverified.

## Coverage note

Read in full: `cmux-strings.tsv` filtered to every listed prefix (1,192 rows) plus manual grep passes for `crown`/`digitalCrown` usage. Read `CLI/CMUXCLI+Sudo.swift` in full. Grepped (not fully read line-by-line) `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/` for crown/digital-crown call sites, and `remoteDaemon`/`remoteTmux`/`remoteSession`/`remotePTYAttach` key usage across `Sources/` and `packages/core/src/runtimes/`. Cross-checked every uncovered string's key and a normalized text snippet against all nine `cmux-0X-*.md` catalog files (not just `cmux-07`) before treating it as a genuine gap; a substantial share of the raw "uncovered" hits from the mechanical pass turned out to be paraphrase-covered prose and were excluded from this report. Not independently re-verified against source line-by-line for every string quoted above beyond the sudo CLI and simulator-crown cases — for the rest, the TSV key/text pairing and cross-reference against `cmux-07`'s own already-cited source paths were treated as sufficient, consistent with how `cmux-07` itself was built.
