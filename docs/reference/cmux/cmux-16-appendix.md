# Every other string

Every localised string in the Mac app that no section above quotes, grouped by the part of the app its key belongs to. Each line is the English text, its key, and where the source first uses it. "Defined but unused" means the string ships in the app's string table but no source file refers to it, so it most likely never reaches the screen.

## cli

### cli · (general)

- "Couldn't Install cmux CLI" · `cli.installFailed` · `Sources/AppDelegate.swift:10402`
- "cmux CLI Installed" · `cli.installed` · `Sources/AppDelegate.swift:10396`
- "Couldn't Uninstall cmux CLI" · `cli.uninstallFailed` · `Sources/AppDelegate.swift:10427`
- "cmux CLI Uninstalled" · `cli.uninstalled` · `Sources/AppDelegate.swift:10421`

### cli · agentHook

- "Agent hook journal append failed for %@ %@." · `cli.agentHook.error.journalAppend` · `CLI/CMUXCLI+AgentHookFailureReporting.swift:57`
- "Agent hook notification delivery failed for %@ %@." · `cli.agentHook.error.notificationDelivery` · `CLI/CMUXCLI+AgentHookFailureReporting.swift:48`
- "Agent hook target resolution failed for %@ %@." · `cli.agentHook.error.targetResolution` · `CLI/CMUXCLI+AgentHookFailureReporting.swift:39`

### cli · auth

- "Usage: cmux auth <status|login|logout|team>\n\nstatus   Print whether the user is signed in (add `cmux --json` for JSON).\nlogin    Open the sign-in popup on the cmux web app and wait for it to finish.\nlogout   Clear the current session.\nteam     List teams or select one (`team list|use <team-id>|create <name>`)." · `cli.auth.help` · `CLI/cmux.swift:18187`
- "Usage: cmux auth team create <name>" · `cli.auth.team.createUsage` · `CLI/CMUXCLI+AuthTeam.swift:51`
- "Created and selected team: %@" · `cli.auth.team.created` · `CLI/CMUXCLI+AuthTeam.swift:64`
- "Usage: cmux auth team <list|use <team-id>|create <name>>" · `cli.auth.team.usage` · `CLI/CMUXCLI+AuthTeam.swift:70`
- "Usage: cmux auth team use <team-id>" · `cli.auth.team.useUsage` · `CLI/CMUXCLI+AuthTeam.swift:29`
- "Usage: cmux auth <status|login|logout|team>" · `cli.auth.usage` · `CLI/cmux.swift:5499`

### cli · automation

- "Usage: cmux automation <list|show|test|enable|disable|logs|reload> [args]\n\nRules live in ~/.cmuxterm/automations.json.\nExamples:\n  cmux automation list\n  cmux automation show surface-needs-input\n  cmux automation test surface-needs-input --event '{"name":"agent.needs_input"}'\n  cmux automation enable surface-needs-input\n  cmux automation disable surface-needs-input\n  cmux automation logs [--limit <n>]\n  cmux automation reload" · `cli.automation.help` · `CLI/CMUXCLI+Automation.swift:244`

### cli · browser

- "browser cookies clear requires exactly one of --all or a cookie scope" · `cli.browser.cookies.clearRequiresScope` · `Sources/TerminalController.swift:10340`
- "cookies <get|set|clear> [--name <name>] [--value <value>] [--url <url>] [--domain <domain>] [--path <path>] [--expires <unix>] [--secure] [set: --http-only] [--all]" · `cli.browser.cookies.help` · `CLI/cmux.swift:20236`
- "browser cookies clear --expires must be an integer Unix timestamp" · `cli.browser.cookies.invalidExpires` · `Sources/TerminalController.swift:10352`
- "browser cookies clear received an invalid cookie filter" · `cli.browser.cookies.invalidFilter` · `Sources/TerminalController.swift:10344`
- "browser cookies clear --url requires a valid URL with a host" · `cli.browser.cookies.invalidURL` · `Sources/TerminalController.swift:10348`
- "browser cookies <get|set|clear> [set: --http-only] [...]" · `cli.browser.cookies.usage` · `CLI/CMUXCLI+TaskHelp.swift:367`
- "browser design-mode requires one of: enable, disable, toggle, status" · `cli.browser.designMode.expectedModes` · `CLI/cmux.swift:16537`
- "Timed out updating browser design mode" · `cli.browser.designMode.timeout` · `Sources/TerminalController+BrowserDesignMode.swift:62`
- "Browser design mode could not be updated" · `cli.browser.designMode.updateFailed` · `Sources/TerminalController+BrowserDesignMode.swift:72`
- "Invalid browser download arguments: %@" · `cli.browser.download.error.invalidArguments` · `CLI/CMUXCLI+BrowserDownload.swift:224`
- "browser download requires a surface handle" · `cli.browser.download.error.surfaceRequired` · `CLI/CMUXCLI+BrowserDownload.swift:17`
- "Choose WebKit or Chromium for the browser engine." · `cli.browser.engine.error.invalid` · defined but unused
- "Rendering engine (browser only)" · `cli.browser.engine.flagDescription` · defined but unused
- "[--engine <webkit|chromium>]" · `cli.browser.engine.option` · defined but unused
- "Could not read browser cookies" · `cli.browser.error.cookieReadFailed` · defined but unused
- "Could not write browser cookies" · `cli.browser.error.cookieWriteFailed` · defined but unused
- "Browser navigation failed" · `cli.browser.error.navigationFailed` · defined but unused
- "Browser screenshot failed" · `cli.browser.error.screenshotFailed` · defined but unused
- "Blocked by your organization's browser policy" · `cli.browser.error.urlBlockedByPolicy` · `Sources/TerminalController.swift:6873`
- "browser viewport reset does not accept additional arguments" · `cli.browser.error.viewportResetAdditionalArguments` · `CLI/CMUXCLI+BrowserViewport.swift:13`
- "Named keys follow Playwright/W3C names. Space, Spacebar, and space emit DOM key " " with code "Space"; --key ' ' passes the raw DOM key." · `cli.browser.help.keyboardNaming` · `CLI/cmux.swift:20217`
- "[--profile <name|uuid>]" · `cli.browser.profile.option` · `CLI/cmux.swift:20204`

### cli · canvas

- "type must be terminal, browser, or simulator" · `cli.canvas.error.invalidPaneType` · `Packages/macOS/CmuxControlSocket/Sources/CmuxControlSocket/Coordinator/Canvas/ControlCommandCoordinator+Canvas.swift:270`
- "Usage: cmux canvas new-pane [--type terminal|browser|simulator]" · `cli.canvas.error.newPaneTypeUsage` · `CLI/cmux.swift:10729`

### cli · claude-hook

- "Claude reported an error" · `cli.claude-hook.notification.body.error` · `CLI/CMUXCLI+NotificationFormatting.swift:75`

### cli · claude-teams

- "Usage: cmux claude-teams [claude-args...]\n\nLaunch Claude Code with agent teams enabled.\n\nThis command:\n  - defaults Claude teammate mode to auto\n  - sets a tmux-like environment so Claude auto mode uses cmux splits\n  - sets CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1\n  - prepends a private tmux shim to PATH\n  - forwards all remaining arguments to claude\n\nThe tmux shim translates supported tmux window/pane commands into cmux\nworkspace and split operations in the current cmux session.\n\nExamples:\n  cmux claude-teams\n  cmux claude-teams --continue\n  cmux claude-teams --model sonnet" · `cli.claude-teams.usage` · `CLI/cmux.swift:18594`

### cli · closeSurface

- "close-surface requires --workspace or --window with explicit --surface" · `cli.closeSurface.error.explicitSurfaceRequiresWorkspaceOrWindow` · `CLI/cmux.swift:7113`

### cli · cloud

- "id: %1$@\nverification: %2$@\ncertificate: %3$@" · `cli.cloud.domains.custom.details` · `CLI/CMUXCLI+CloudDomains.swift:367`
- "id: %1$@\nvm: %2$@:%3$@\naccess: %4$@\nstate: %5$@\nrouting revision: %6$@\ndomain: %7$@" · `cli.cloud.domains.details` · `CLI/CMUXCLI+CloudDomains.swift:313`
- "Add these DNS records for %@:" · `cli.cloud.domains.dns.header` · `CLI/CMUXCLI+CloudDomains.swift:427`
- "No published Cloud VM domains." · `cli.cloud.domains.empty` · `CLI/CMUXCLI+CloudDomains.swift:54`
- "The cmux app returned a publication response this CLI could not read." · `cli.cloud.domains.malformedResponse` · `CLI/CMUXCLI+CloudDomains.swift:116`
- "Removed publication %@." · `cli.cloud.domains.removed` · `CLI/CMUXCLI+CloudDomains.swift:203`
- "Usage:\n  cmux cloud domains [list]\n  cmux cloud domains zones\n  cmux cloud domains verify <domain>\n  cmux cloud domains publish <vm> <port> [--domain <hostname>] [--access personal|team|public] [--team <id>] [--org-slug <slug>] [--yes]\n  cmux cloud domains access <hostname> <personal|team|public> [--team <id>] [--yes]\n  cmux cloud domains grant <hostname> <email> [--expires <ISO-date>]\n  cmux cloud domains ungrant <hostname> <email>\n  cmux cloud domains grants <hostname>\n  cmux cloud domains rm <hostname>\n\nVerify a domain you own first: `verify` prints the DNS records to add, then run it\nagain to complete. `publish --domain` then accepts that domain or any one-label child.\nGenerated names use <vm>--<organization>--<port>.cmux.sh and need no verification.\nAccess defaults to the owning team or personal owner. Email grants apply to one port only.\nPublic access requires confirmation; --yes confirms it for scripts. Add --json for JSON output." · `cli.cloud.domains.usage` · `CLI/CMUXCLI+CloudDomains.swift:14`
- "verification: not required (cmux domain)" · `cli.cloud.domains.verification.generated` · `CLI/CMUXCLI+CloudDomains.swift:321`

### cli · coderouter

- "coderouter|cr [coderouter-args...]                 (aliases for the CodeRouter CLI; offers to install it when missing)" · `cli.coderouter.aliases` · `CLI/cmux.swift:4742`
- "CodeRouter was not installed. Install it later with:\n  %@" · `cli.coderouter.bootstrap.declined` · `CLI/CMUXCLI+CoderouterPassthrough.swift:118`
- "Could not download the CodeRouter installer (curl exited with status %1$d). Retry, or install it with:\n  %2$@" · `cli.coderouter.bootstrap.downloadFailed` · `CLI/CMUXCLI+CoderouterPassthrough.swift:217`
- "The CodeRouter installer finished, but its command could not be found in %@. Check the installation and try again." · `cli.coderouter.bootstrap.installedNotFound` · `CLI/CMUXCLI+CoderouterPassthrough.swift:150`
- "The CodeRouter installer exited with status %1$d. Retry, or install it with:\n  %2$@" · `cli.coderouter.bootstrap.installerFailed` · `CLI/CMUXCLI+CoderouterPassthrough.swift:140`
- "Installing CodeRouter..." · `cli.coderouter.bootstrap.installing` · `CLI/CMUXCLI+CoderouterPassthrough.swift:126`
- "CodeRouter CLI is not installed. Install it, then retry:\n  %@" · `cli.coderouter.bootstrap.notInstalled` · `CLI/CMUXCLI+CoderouterPassthrough.swift:94`
- "CodeRouter CLI is not installed. cmux can install it now by running the official installer:\n  %1$@\nThis downloads the checksum-verified CodeRouter binary into %2$@ and adds that directory to your shell PATH." · `cli.coderouter.bootstrap.offer` · `CLI/CMUXCLI+CoderouterPassthrough.swift:104`
- "coderouter <status|machines|claude> [--team <id>] [--json]    (team model-plane settings; other verbs pass through)" · `cli.coderouter.commands` · `CLI/cmux.swift:4757`
- "Could not start the required CLI. Check the installation and try again." · `cli.coderouter.error.launchFailed` · `CLI/CMUXCLI+CoderouterPassthrough.swift:290`
- "Required CLI not found. Install the command and retry." · `cli.coderouter.error.notFound` · defined but unused

### cli · codexTeams

- "cmux codex-teams watcher skipped a Codex subagent: depth %1$lld exceeds the automatic pane limit %2$lld." · `cli.codexTeams.watcher.subagent.depthExceeded` · `CLI/cmux.swift:24301`
- "cmux codex-teams watcher could not create a pane for a resumed Codex subagent." · `cli.codexTeams.watcher.subagent.paneCreationFailed` · `CLI/cmux.swift:24438`
- "cmux codex-teams watcher could not create a pane for a resumed Codex subagent (error code: %@)." · `cli.codexTeams.watcher.subagent.paneCreationFailedWithCode` · `CLI/cmux.swift:24433`
- "cmux codex-teams watcher could not attach a Codex subagent because its resumed thread was not ready." · `cli.codexTeams.watcher.subagent.readinessFailed` · `CLI/cmux.swift:24377`
- "cmux codex-teams watcher skipped a Codex subagent: thread status %@ is not attachable." · `cli.codexTeams.watcher.subagent.statusNotAttachable` · `CLI/cmux.swift:24317`

### cli · comments

- "cmux comments requires a git repository: %@" · `cli.comments.error.notARepository` · `CLI/CMUXCLI+Comments.swift:977`
- "--repo requires a path. For a path starting with a dash, pass it as ./-name" · `cli.comments.error.repoRequiresPath` · `CLI/CMUXCLI+Comments.swift:931`
- "comments requires a subcommand. Try: list" · `cli.comments.error.subcommandRequired` · `CLI/CMUXCLI+Comments.swift:918`
- "Unexpected argument '%@' for cmux comments list. Supported: --repo <path>, --all, --json" · `cli.comments.error.unexpectedArgument` · `CLI/CMUXCLI+Comments.swift:940`
- "Unknown comments subcommand '%@'. Try: list" · `cli.comments.error.unknownSubcommand` · `CLI/CMUXCLI+Comments.swift:957`
- "No review comments. (repo: %@)" · `cli.comments.list.empty` · `CLI/CMUXCLI+Comments.swift:1029`
- "[one] %1$lld review comment (repo: %2$@) / [other] %1$lld review comments (repo: %2$@)" · `cli.comments.list.header.other` · `CLI/CMUXCLI+Comments.swift:1005`
- "Usage: cmux comments <subcommand> [options]\n\nReview comments saved from the diff viewer, stored per git repository.\n\nSubcommands:\n  list [--repo <path>] [--all] [--json]\n    List review comments for a repository (default: the git repository\n    containing the current directory). Lists pending comments only;\n    --all includes comments already delivered to an agent through a\n    TextBox submission." · `cli.comments.usage` · `CLI/CMUXCLI+Comments.swift:10`

### cli · creation

- "(routed to remote tmux; the new pane arrives asynchronously)" · `cli.creation.remoteTmux.newPane` · `CLI/cmux.swift:21078`
- "(routed to remote tmux; the new window arrives asynchronously)" · `cli.creation.remoteTmux.newWindow` · `CLI/cmux.swift:21077`

### cli · current

- "current: unexpected argument '%@'. Known flags: --limit <1...200> --json" · `cli.current.error.argument` · `CLI/CMUXCLI+Current.swift:57`
- "current: --limit may only be supplied once" · `cli.current.error.duplicateLimit` · `CLI/CMUXCLI+Current.swift:40`
- "current: --limit requires an integer from 1 to 200" · `cli.current.error.limit` · `CLI/CMUXCLI+Current.swift:46`
- "current: invalid response (missing items)" · `cli.current.error.response` · `CLI/CMUXCLI+Current.swift:66`
- "Usage: cmux current [--limit <1...200>] [--json]\n\nRead bounded current-work facts already known to cmux across local and Cloud surfaces.\nDoes not refresh machines, read transcripts, or mutate work.\n\nFlags:\n  --limit <1...200>  Maximum items (default: 100)\n  --json            Exact owner payload with identities, evidence and freshness\n\nText and JSON use the same snapshot. Unknown facts remain unknown; possible\nhuman obligations are observations, not permission to act. --window does not\nfocus or filter this app-wide query; --id-format does not rewrite its identities.\n\nExamples:\n  cmux current\n  cmux current --json --limit 50" · `cli.current.help` · `CLI/CMUXCLI+Current.swift:5`

### cli · error

- "clear-notifications --surface requires a workspace or window context" · `cli.error.clearNotificationsSurfaceRequiresTarget` · `CLI/cmux.swift:7712`
- "mark-notification-read requires exactly one selector: --id, --workspace, or --all" · `cli.error.markNotificationReadSelector` · `CLI/cmux.swift:7653`
- "ssh-session-attach: persisted SSH PTY session state is unavailable. Run 'cmux ssh-session-list --all-workspaces' and retry." · `cli.error.sshSessionAttachStateUnavailable` · `Sources/TerminalController+SSHSessionAttachContext.swift:183`
- "ssh-session-attach: session '%1$@' exists in multiple workspaces (%2$@). Pass --workspace <workspace> to choose one." · `cli.error.sshSessionAttachWorkspaceAmbiguous` · `Sources/TerminalController+SSHSessionAttachContext.swift:194`
- "ssh-session-attach: session '%1$@' belongs to workspace %2$@, but --workspace requested a different workspace" · `cli.error.sshSessionAttachWorkspaceMismatch` · `Sources/TerminalController+SSHSessionAttachContext.swift:173`
- "ssh-session-attach: --workspace requires a value" · `cli.error.sshSessionAttachWorkspaceRequiresValue` · `CLI/cmux.swift:14845`
- "workspace requires a subcommand. Try: list, create, env, close, rename, select, status, reconnect, disconnect, loading, group" · `cli.error.workspaceSubcommandRequired` · `CLI/cmux.swift:10809`

### cli · events

- "Connection to cmux was denied. Run this command from a cmux terminal or review socket access in Settings > Automation." · `cli.events.error.connectionDenied` · `CLI/cmux.swift:4073`
- "--timeout must be greater than 0" · `cli.events.error.invalidTimeout` · `CLI/CMUXCLI+Events.swift:248`
- "cmux returned an error while starting the event stream. Check the command and try again." · `cli.events.error.server` · `CLI/cmux.swift:4079`
- "Timed out waiting for a matching event" · `cli.events.error.timeout` · `CLI/CMUXCLI+Events.swift:55`
- "Print the subscription snapshot and exit" · `cli.events.help.snapshot` · `CLI/cmux.swift:18129`
- "Exit unsuccessfully if no matching event arrives before the deadline" · `cli.events.help.timeout` · `CLI/cmux.swift:18125`

### cli · fork

- "fork: the saved agent session is unavailable. The terminal remains in its saved directory; retry later or start a new agent session." · `cli.fork.codexCheckpointUnavailable` · `CLI/CMUXCLI+ForkExecution.swift:87`
- "fork: this command no longer matches the session. Run 'cmux fork --surface' to use the current record." · `cli.fork.error.checkpointMismatch` · `CLI/CMUXCLI+ForkExecution.swift:42`
- "fork: the saved process could not be started. Retry the visible fork command." · `cli.fork.error.compatibilityShellFailed` · `CLI/CMUXCLI+ForkExecution.swift:82`
- "fork: the current cmux surface could not be identified. Retry from this terminal or pass --surface <id|ref>." · `cli.fork.error.currentSurfaceUnknown` · `CLI/CMUXCLI+ContinuationSupport.swift:178`
- "fork: the saved agent command is unavailable. Make sure the agent is installed, then retry." · `cli.fork.error.executableNotFound` · `CLI/CMUXCLI+ForkExecution.swift:72`
- "fork: the saved process could not be started. Retry the visible fork command." · `cli.fork.error.execveFailed` · `CLI/CMUXCLI+ForkExecution.swift:77`
- "fork: this session's saved fork data is not compatible. Start the agent again in this terminal." · `cli.fork.error.incompleteData` · `CLI/CMUXCLI+ForkExecution.swift:52`
- "fork: this command no longer matches the session. Run 'cmux fork --surface' to use the current record." · `cli.fork.error.kindMismatch` · `CLI/CMUXCLI+ForkExecution.swift:37`
- "fork: this session's saved restore data is not compatible. Start the agent again in this terminal." · `cli.fork.error.malformedArguments` · `CLI/CMUXCLI+ContinuationSupport.swift:198`
- "fork: this session's saved restore data is not compatible. Start the agent again in this terminal." · `cli.fork.error.malformedRecord` · `CLI/CMUXCLI+ContinuationSupport.swift:193`
- "fork: agent setup failed. Check the agent settings, then retry." · `cli.fork.error.providerSetupFailed` · `CLI/CMUXCLI+ForkExecution.swift:62`
- "fork: cmux is still opening. Retry the visible fork command in a moment." · `cli.fork.error.socketNotReady` · `CLI/CMUXCLI+ForkExecution.swift:92`
- "fork: the requested surface was not found. Check the surface reference, then retry." · `cli.fork.error.surfaceNotFound` · `CLI/CMUXCLI+ContinuationSupport.swift:168`
- "fork: this agent does not support forking. Configure a fork command for this agent, then retry." · `cli.fork.error.unsupported` · `CLI/CMUXCLI+ForkExecution.swift:57`
- "fork: this session's saved fork data is not compatible. Start the agent again in this terminal." · `cli.fork.error.unsupportedMode` · `CLI/CMUXCLI+ForkExecution.swift:47`
- "fork: the saved working directory is inaccessible. Restore access to it, then retry." · `cli.fork.error.workingDirectoryFailed` · `CLI/CMUXCLI+ForkExecution.swift:67`
- "Usage: cmux fork [--surface <id|ref>] <kind> <checkpoint-id>\n       cmux fork <kind> <checkpoint-id> --surface <id|ref>\n       cmux fork --surface=<id|ref> <kind> <checkpoint-id>\n       cmux fork --surface [id|ref]\n\nStart a fork from the saved session on the selected surface." · `cli.fork.help` · `CLI/CMUXCLI+Fork.swift:15`
- "Usage: cmux fork [--surface <id|ref>] <kind> <checkpoint-id>\n       cmux fork <kind> <checkpoint-id> --surface <id|ref>\n       cmux fork --surface=<id|ref> <kind> <checkpoint-id>" · `cli.fork.usage.positional` · `CLI/CMUXCLI+ContinuationSupport.swift:154`
- "Usage: cmux fork --surface [id|ref]" · `cli.fork.usage.surface` · `CLI/CMUXCLI+ContinuationSupport.swift:149`

### cli · forwarding

- "cmux could not start this command. Try again, or reinstall cmux if the problem continues." · `cli.forwarding.error.allocateArguments` · `Sources/App/CLIForwardingLaunchRouter.swift:128`
- "cmux could not start the command-line tool from the app bundle. Reinstall cmux or run the command from a standard cmux CLI installation." · `cli.forwarding.error.execFailed` · `Sources/App/CLIForwardingLaunchRouter.swift:135`
- "cmux could not run this command from the app bundle. Reinstall cmux or run the command from a standard cmux CLI installation." · `cli.forwarding.error.missingBundledCLI` · `Sources/App/CLIForwardingLaunchRouter.swift:121`

### cli · guide

- "## Use browsers and computer use\n\nFor browser automation on the machine, run `agent-browser` there and read its documentation. Prefer the machine's existing headful Chrome session when it exposes DevTools. The devbox installs Chrome, but its dock launcher does not enable remote debugging by default. If no debugging-enabled session exists, use a machine terminal under the work-user desktop session to start a separate visible Chrome with `DISPLAY=:1`, `--remote-debugging-port=9222`, and a dedicated `--user-data-dir`, then use `agent-browser --cdp 9222 snapshot`, or try `agent-browser --auto-connect snapshot`. `cloud exec` is for short provider commands and may not have the work-user desktop bus. Inspect the installed browser and driver with `command -v` and `--version`; `cloud tools` only checks general utilities. The default devbox also installs `cua-driver` for Linux desktop automation. Run `cua-driver doctor` from the machine terminal and read its X11 and AT-SPI results; a zero exit alone does not prove the desktop is ready. Use `cua-driver list-tools` to inspect its actions. Configure a remote agent's MCP host to launch `cua-driver mcp`; use `cua-driver call <tool> [JSON args]` for shell automation. These commands need the desktop display (`DISPLAY=:1`) and accessibility bus. Use `cua-driver` for visible desktop windows and `agent-browser` for web pages. Historical shell-only machines may not have a desktop or driver. Inspect the remote screen, act, then verify. Local computer-use tools target your Mac unless configured for a remote target." · `cli.guide.cloud.browser` · `CLI/CMUXCLI+Guide.swift:143`
- "## Choose a machine\n\nInspect existing machines first. Route the current directory with `route --json`; reuse its machine when `would_provision` is false. When `machine` is null and `would_provision` is true, check `ls` and choose Base, an idle machine, or deliberate provisioning before creating anything. Check `vpn status`; run `vpn up` if a private operation reports a down or stale tunnel. Base is a persistent machine with a workspace that you can reopen. Prefer a new workspace on an existing machine; use `new` for isolation. Use returned machine, workspace, and terminal IDs in later commands." · `cli.guide.cloud.choose` · `CLI/CMUXCLI+Guide.swift:108`
- "cmux Cloud runs commands, agents, browsers, and desktops on remote machines. Run the commands below from cmux on your Mac. Cloud operations need the app and a signed-in account. `cmux cloud --skill` prints this same guide; `cmux vm` is an alias for `cmux cloud`." · `cli.guide.cloud.intro` · `CLI/CMUXCLI+Guide.swift:106`
- "## Find exact methods\n\nRead command help for flags and examples. The full Cloud reference covers machine lifecycle, workspaces, terminals, and transfers. Use `cmux guide` for local workspace, browser, and computer-use methods." · `cli.guide.cloud.more` · `CLI/CMUXCLI+Guide.swift:162`
- "## Observe, open, share, and clean up\n\nUse `tree`, `terminal read`, and `terminal wait` to observe live work and check its real output. Use `open` for a machine's terminal, desktop, or web port when there is something useful to show. Private web URLs need the Cloud network connection; read `vpn` help. Use `domains` to publish a web port with explicit access rules. Use snapshots and forks to keep or copy machine state. Delete forks and scratch machines you created. Never remove or reset a machine you did not create." · `cli.guide.cloud.share` · `CLI/CMUXCLI+Guide.swift:157`
- "## Run work and collect results\n\nUse `exec` for a short non-GUI command on a chosen machine. Use `run -- <command>` to route a bounded command; add `--sync` only when you want to upload the current directory. Use `dev <machine> --no-open` to stage a recognized project with its development layout, or use `agent` to start a coding agent. Use a machine `terminal` for long-running, interactive, or GUI work. Machine workspaces and terminals keep running when a pane closes or the Mac sleeps; terminal IDs come from `tree`, and you can reattach with the `vm open <machine>/<workspace>/<terminal>` address. Use `push` and `pull` to transfer files. Use `terminal wait` for a screen pattern and `terminal wait-exit` plus `terminal output` for process completion and logs. Read terminal output before reporting success." · `cli.guide.cloud.work` · `CLI/CMUXCLI+Guide.swift:124`
- "Read a short guide and find specific methods. No running app, network access, or sign-in is needed to read it." · `cli.guide.description` · `CLI/CMUXCLI+Guide.swift:44`
- "## Use a browser\n\nUse `cmux browser` for a browser surface inside cmux. Use `agent-browser` for a separate browser session. Prefer an existing headful Chrome session when it exposes DevTools through remote debugging: `agent-browser --auto-connect snapshot`, or `agent-browser --cdp 9222 snapshot` for an explicit port. A normal Chrome window without remote debugging cannot be attached; `agent-browser --headed` starts a new visible browser. Read a snapshot, act on an observed element, then take a fresh snapshot. Check appearance with a screenshot. Keep each tool's target IDs within that tool." · `cli.guide.overview.browser` · `CLI/CMUXCLI+Guide.swift:68`
- "## Use Cloud\n\nUse cmux Cloud when work needs a remote machine. List machines before choosing one. Use `exec` for a short command, `agent` for a coding agent, and `push` or `pull` for files. The default Cloud devbox includes Chrome and `cua-driver`; the Cloud guide explains how to verify and use them. Use the Cloud guide for desktop, browser, port, and machine lifecycle methods." · `cli.guide.overview.cloud` · `CLI/CMUXCLI+Guide.swift:86`
- "## Use app windows\n\nUse computer-use tools for native apps or visual controls. cmux provides these tools to Claude Code and Codex sessions launched in cmux. Complete setup in Settings > Computer Use. Read the `cmux-cua` skill for your agent's methods: inspect app or window state, click or type, then inspect again." · `cli.guide.overview.computer` · `CLI/CMUXCLI+Guide.swift:82`
- "cmux puts terminals, browsers, and agents in one workspace. Use this guide to choose a method, then read its help before acting. `cmux --skill` prints this same guide." · `cli.guide.overview.intro` · `CLI/CMUXCLI+Guide.swift:53`
- "## Show work and find more methods\n\nUse Markdown and diff views to show results. Use notifications and progress to report task state. Read the Cloud guide for remote machines. Settings and integration docs list their own methods." · `cli.guide.overview.share` · `CLI/CMUXCLI+Guide.swift:95`
- "## Find your target\n\nA window contains workspaces. A workspace contains split panes. Each pane contains surfaces, such as a terminal or browser tab. Inspect the caller and use the returned IDs. Keep the caller's workspace and surface context; use explicit targets and `--focus false` where supported." · `cli.guide.overview.targets` · `CLI/CMUXCLI+Guide.swift:55`
- "## Work with terminals\n\nCreate a workspace for a task, add panes for parallel work, and read terminal output before sending input. `send` enters text; `send-key` sends keys. Read the screen again to check the result." · `cli.guide.overview.terminals` · `CLI/CMUXCLI+Guide.swift:63`

### cli · help

- "Usage: cmux clear-notifications [--workspace <id|ref|index>] [--surface <id|ref|index>] [--window <id|ref|index>]\n\nClear queued notifications, optionally scoped to a workspace and surface.\n\nFlags: --workspace <id|ref|index> --surface <id|ref|index> --window <id|ref|index>" · `cli.help.clearNotifications` · `CLI/cmux.swift:19961`
- "Show top-level CLI usage, or one task-focused command group." · `cli.help.description` · `CLI/CMUXCLI+TaskHelp.swift:97`
- "Usage: cmux dismiss-notification (--id <uuid> | --all-read)\n\nRemove one notification, or remove every already-read notification.\n\nFlags:\n  --id <uuid>           Notification id to remove\n  --all-read            Remove every already-read notification\n  --json                Print JSON\n  --id-format <mode>    refs, uuids, or both" · `cli.help.dismissNotification` · `CLI/cmux.swift:19913`
- "fork [--surface <id|ref>] <kind> <checkpoint-id> | fork --surface [id|ref]" · `cli.help.fork` · `CLI/CMUXCLI+Fork.swift:8`
- "ios <subcommand> [args] [--surface <id|ref|index>]" · `cli.help.ios` · `CLI/CMUXCLI+Simulator.swift:19`
- "Usage: cmux iroh-diag\n\nPrint the host's Iroh Connection Report as a plain-language timeline,\nthe same data as Settings > Networking > Connection Report." · `cli.help.irohDiag` · `CLI/cmux.swift:18072`
- "Usage: cmux jump-to-unread\n\nFocus the latest unread notification, matching the Notifications page action.\n\nFlags:\n  --json                Print JSON\n  --id-format <mode>    refs, uuids, or both" · `cli.help.jumpToUnread` · `CLI/cmux.swift:19951`
- "Usage: cmux mark-notification-read (--id <uuid> | --workspace <id|ref> [--surface <id|ref>] | --all)\n\nMark notifications read without opening them. Exactly one selector is required.\n\nFlags:\n  --id <uuid>           Mark one notification read\n  --workspace <id|ref>  Mark notifications for a workspace\n  --surface <id|ref>    Narrow --workspace to one surface\n  --all                 Mark every notification read\n  --json                Print JSON\n  --id-format <mode>    refs, uuids, or both" · `cli.help.markNotificationRead` · `CLI/cmux.swift:19925`
- "Usage: cmux memory [flags]\n\nDiagnose cmux app memory separately from recursive terminal child-process RSS.\n\nFlags:\n  --all                         Include all windows (default: current window only)\n  --workspace <id|ref|index>   Limit workspace context for attribution labels\n  --groups <count>              Number of child command groups to show (default: 12)\n  --json                        Structured JSON output\n\nOutput:\n  App footprint is the direct cmux process physical footprint from macOS process accounting.\n  Child RSS is recursive resident memory for descendants of the cmux app process,\n  grouped by command name and attributed back to workspace, pane, and surface when known.\n\nExample:\n  cmux memory\n  cmux memory --groups 20\n  cmux --json memory --all" · `cli.help.memory` · `CLI/cmux.swift:19304`
- "Usage: cmux mosh <destination> [flags] [-- <remote-command-args>]\n\nMosh terminal transport:\n  --transport <ssh|mosh>  Interactive terminal transport (default: mosh)\n\nSSH continues to handle remote features; Mosh carries only the interactive\nterminal. If Mosh is missing locally or remotely, cmux reports it and uses SSH.\n\nExample:\n  cmux ssh dev@my-host --transport mosh\n\n  cmux mosh dev@my-host" · `cli.help.mosh` · `CLI/CMUXCLI+SSHHelp.swift:54`
- "Usage: cmux mosh-tmux <destination> [--session <name>] [flags]\n\nCreate a Mosh workspace that creates or attaches to a named tmux session (default: main). The tmux profile persists across reconnect and app session restore. This is a roaming tmux terminal, not the native mirror from cmux ssh-tmux. --session <name> selects the session; all other flags match cmux mosh. Without Mosh, the same profile runs over SSH.\n\nExample:\n  cmux mosh-tmux dev@my-host\n  cmux mosh-tmux dev@my-host --session agent-main" · `cli.help.mosh-tmux` · `CLI/CMUXCLI+SSHHelp.swift:70`
- "Also works without a running cmux app or socket." · `cli.help.noSocket` · `CLI/CMUXCLI+TaskHelp.swift:103`
- "Usage: cmux notify [flags]\n\nSend or clear notifications.\n\nFlags: --title --subtitle --body --reply --clear --workspace --surface --window --json --id-format" · `cli.help.notify` · `CLI/cmux.swift:19881`
- "--clear                Clear notifications for the resolved caller/target instead of posting" · `cli.help.notify.clear` · defined but unused
- "The response includes the created notification id. Use cmux dismiss-notification --id <uuid>, cmux list-notifications, or cmux clear-notifications to manage notifications." · `cli.help.notify.management` · defined but unused
- "--reply                Allow a free-text inline reply" · `cli.help.notify.reply` · defined but unused
- "Usage: cmux open-notification --id <uuid>\n\nFocus the notification's workspace and surface, then mark the row read.\n\nFlags:\n  --id <uuid>           Notification id to open\n  --json                Print JSON\n  --id-format <mode>    refs, uuids, or both" · `cli.help.openNotification` · `CLI/cmux.swift:19940`
- "Usage: cmux read-screen [flags]\n\nRead terminal text from a surface as plain text.\n\nFlags:\n  --workspace <id|ref|index>   Target workspace (default: $CMUX_WORKSPACE_ID)\n  --surface <id|ref|index>     Target surface (default: $CMUX_SURFACE_ID)\n  --window <id|ref|index>      Window context for workspace/surface refs and indexes\n  --scrollback                 Include scrollback (not just visible viewport)\n  --lines <n>                  Limit to the last n lines (implies --scrollback)\n  --selection                  Read only the active selection; cannot be combined with --scrollback or --lines\n\nExample:\n  cmux read-screen\n  cmux read-screen --surface surface:2 --scrollback --lines 200\n  cmux read-screen --surface surface:2 --selection" · `cli.help.readScreen` · `CLI/CMUXCLI+SurfaceSelection.swift:184`
- "Usage: cmux read-selection [flags]\n\nRead the active selection from any selectable surface. Plain output includes source context; --json returns the complete response.\n\nFlags:\n  --workspace <id|ref|index>   Target workspace (default: $CMUX_WORKSPACE_ID)\n  --surface <id|ref|index>     Target surface (default: $CMUX_SURFACE_ID)\n  --window <id|ref|index>      Window context for workspace/surface refs and indexes\n\nExample:\n  cmux read-selection --surface surface:2\n  cmux read-selection --surface surface:2 --json" · `cli.help.readSelection` · `CLI/CMUXCLI+SurfaceSelection.swift:167`
- "Usage: cmux reorder-workspaces --order <id|ref|index>,<id|ref|index>,... [flags]\n\nReorder workspaces within a window as one atomic batch. The comma-separated\norder is the final leading order inside the pinned and unpinned groups;\nunmentioned workspaces keep their relative order after listed peers in the\nsame group.\n\nFlags:\n  --order <refs>                Comma-separated workspace refs to place first\n  --window <id|ref|index>       Window context\n  --dry-run                     Print the resolved final indexes without applying\n\nExample:\n  cmux reorder-workspaces --order workspace:1,workspace:11,workspace:31\n  cmux reorder-workspaces --order workspace:11,workspace:1 --dry-run" · `cli.help.reorderWorkspaces` · `CLI/cmux.swift:18844`
- "restore [--surface <id|ref>] <kind> <checkpoint-id> | restore --surface [id|ref]" · `cli.help.restore` · `CLI/CMUXCLI+Restore.swift:8`
- "Usage: cmux set-status <key> <value> [flags]\n\nSet a sidebar status entry for a workspace. Status entries appear as\npills in the sidebar tab row. Use a unique key so different tools\n(e.g. "claude_code", "build") can manage their own entries.\n\nFlags:\n  --icon <name>          Icon name (e.g. "sparkle", "hammer")\n  --color <#hex>         Pill color (e.g. "#ff9500")\n  --priority <n>         Sort priority; higher appears first (default: 0)\n  --workspace <id|ref>   Target workspace (default: $CMUX_WORKSPACE_ID)\n\nExample:\n  cmux set-status build "compiling" --icon hammer --color "#ff9500" --priority 80\n  cmux set-status deploy "v1.2.3" --workspace workspace:2" · `cli.help.setStatus` · `CLI/cmux.swift:19972`
- "simulator <subcommand> [args] [--surface <id|ref|index>]" · `cli.help.simulator` · `CLI/CMUXCLI+Simulator.swift:12`
- "Usage: cmux ssh <destination> [flags] [-- <remote-command-args>]\n\nCreate a new workspace, mark it as remote-SSH, and start an SSH session in that workspace.\ncmux will also establish a local SSH proxy endpoint so browser traffic can egress from the remote host.\n\nFlags:\n  --name <title>          Optional workspace title\n  --port <n>              SSH port\n  --identity <path>       SSH identity file path\n  -A, --forward-agent     Forward the caller's SSH agent; also honors ForwardAgent yes from ssh_config\n  -a, --no-forward-agent  Disable SSH agent forwarding for this workspace\n  --ssh-option <opt>      Extra SSH -o option (repeatable)\n  --window <id|ref|index> Target window for the managed workspace\n  --no-focus              Create workspace without switching to it\n\nExample:\n  cmux ssh dev@my-host\n  cmux ssh dev@my-host --name "gpu-box" --port 2222 --identity ~/.ssh/id_ed25519\n  cmux ssh dev@my-host --forward-agent\n  cmux ssh dev@my-host --ssh-option UserKnownHostsFile=/dev/null --ssh-option StrictHostKeyChecking=no" · `cli.help.ssh` · `CLI/CMUXCLI+SSHHelp.swift:5`
- "Usage: cmux ssh-tmux <destination> [--port <n>] [--identity <path>] [--no-focus]\n\nMirror a remote host's tmux sessions into the current cmux window over SSH tmux control mode. Each session becomes a workspace, each window a tab, and each multi-pane window a native split. Requires the "Remote tmux" beta setting.\n\nIf interactive authentication is needed, cmux runs ssh in this terminal and then retries over the shared connection. ~/.ssh/config aliases and settings are honored.\n\nFlags:\n  --port <n>          SSH port\n  --identity <path>   SSH identity file path\n  --no-focus          Do not select the mirror workspace or activate its window\n\nExample:\n  cmux ssh-tmux dev@my-host\n  cmux ssh-tmux dev@my-host --port 2222 --identity ~/.ssh/id_ed25519" · `cli.help.ssh-tmux` · `CLI/cmux.swift:19098`
- "Additional flag:\n  --new-window        Open the mirror in a dedicated new window" · `cli.help.ssh-tmux.newWindow` · `CLI/cmux.swift:19122`
- "Initial command:\n  --command <text>        Run text once in the initial remote terminal after shell startup\n\nExample:\n  cmux ssh dev@my-host --command 'omp "investigate auth"'" · `cli.help.ssh.initialCommand` · `CLI/CMUXCLI+SSHHelp.swift:41`
- "Mosh terminal transport:\n  --transport <ssh|mosh>  Interactive terminal transport (default: ssh)\n\nSSH continues to handle remote features; Mosh carries only the interactive\nterminal. If Mosh is missing locally or remotely, cmux reports it and uses SSH.\n\nExample:\n  cmux ssh dev@my-host --transport mosh" · `cli.help.ssh.mosh` · `CLI/CMUXCLI+SSHHelp.swift:28`
- "Show one command group without connecting to the cmux socket." · `cli.help.taskHelp.description` · `CLI/CMUXCLI+TaskHelp.swift:172`
- "Task Help:" · `cli.help.taskHelp.heading` · `CLI/CMUXCLI+TaskHelp.swift:170`
- "Run `cmux <command> --help` for command-specific usage." · `cli.help.topic.commandUsage` · `CLI/CMUXCLI+TaskHelp.swift:117`
- "Unknown topics keep the top-level help behavior." · `cli.help.unknownTopic` · `CLI/CMUXCLI+TaskHelp.swift:102`
- "Usage: cmux help [topic]" · `cli.help.usage` · `CLI/CMUXCLI+TaskHelp.swift:95`

### cli · hooks

- "\nProceed? [y/N]" · `cli.hooks.antigravity.confirmProceed` · `CLI/cmux.swift:32851`
- "%@ hooks installed at %@" · `cli.hooks.antigravity.installed` · `CLI/cmux.swift:32865`
- "Removed Antigravity cmux hooks from %@" · `cli.hooks.antigravity.removed` · `CLI/cmux.swift:32925`
- "Campfire hooks already up to date at %@" · `cli.hooks.campfire.alreadyUpToDate` · `CLI/CMUXCLI+CampfireExtensionInstall.swift:54`
- "\nProceed? [y/N]" · `cli.hooks.campfire.confirmProceed` · `CLI/CMUXCLI+CampfireExtensionInstall.swift:77`
- "Campfire hooks installed at %@" · `cli.hooks.campfire.installed` · `CLI/CMUXCLI+CampfireExtensionInstall.swift:90`
- "No Campfire cmux extension found at %@" · `cli.hooks.campfire.noneFound` · `CLI/CMUXCLI+CampfireExtensionInstall.swift:103`
- "Removed Campfire cmux extension from %@" · `cli.hooks.campfire.removed` · `CLI/CMUXCLI+CampfireExtensionInstall.swift:124`
- "Usage: cmux hooks enqueue <agent> <subcommand>" · `cli.hooks.enqueue.usage` · `CLI/CMUXCLI+AgentHookAdmission.swift:248`
- "cmux could not create the hooks directory: a file exists at %@. Remove or rename the conflicting file, then run `cmux hooks setup` again." · `cli.hooks.error.configDirectoryIsFile` · `CLI/cmux.swift:32785`
- "\nProceed? [y/N]" · `cli.hooks.kimi.confirmProceed` · `CLI/CMUXCLI+KimiHooks.swift:110`
- "%@ hooks installed at %@" · `cli.hooks.kimi.installed` · `CLI/CMUXCLI+KimiHooks.swift:213`
- "Removed Kimi Code cmux hooks from %@" · `cli.hooks.kimi.removed` · `CLI/CMUXCLI+KimiHooks.swift:202`
- "Warning: cmux hooks are installed at %@, but cmux could not refresh its existing hook block in %@. Check that path and re-run `cmux hooks setup kimi` to finish the update." · `cli.hooks.kimi.secondaryRefreshWarning` · `CLI/CMUXCLI+KimiHooks.swift:227`
- "Warning: cmux could not remove its hook block from %@. Check that path and re-run `cmux hooks uninstall kimi` to finish cleanup." · `cli.hooks.kimi.secondaryUninstallWarning` · `CLI/CMUXCLI+KimiHooks.swift:239`
- "Kiro applies these hooks only when run as the cmux agent. Start Kiro with `kiro-cli chat --agent cmux`, or make it the default with `kiro-cli settings chat.defaultAgent cmux`." · `cli.hooks.kiro.postInstallNote` · `CLI/CMUXCLI+AgentHookCatalog.swift:136`
- "OMP hooks already up to date at %@" · `cli.hooks.omp.alreadyUpToDate` · `CLI/CMUXCLI+OmpExtension.swift:465`
- "\nProceed? [y/N]" · `cli.hooks.omp.confirmProceed` · `CLI/CMUXCLI+OmpExtension.swift:488`
- "OMP hooks installed at %@" · `cli.hooks.omp.installed` · `CLI/CMUXCLI+OmpExtension.swift:501`
- "No OMP cmux extension found at %@" · `cli.hooks.omp.noneFound` · `CLI/CMUXCLI+OmpExtension.swift:514`
- "Removed OMP cmux extension from %@" · `cli.hooks.omp.removed` · `CLI/CMUXCLI+OmpExtension.swift:535`
- "Pi hooks already up to date at %@" · `cli.hooks.pi.alreadyUpToDate` · `CLI/CMUXCLI+PiExtension.swift:122`
- "\nProceed? [y/N]" · `cli.hooks.pi.confirmProceed` · `CLI/CMUXCLI+PiExtension.swift:145`
- "Pi hooks installed at %@" · `cli.hooks.pi.installed` · `CLI/CMUXCLI+PiExtension.swift:172`
- "No Pi cmux extension found at %@" · `cli.hooks.pi.noneFound` · `CLI/CMUXCLI+PiExtension.swift:185`
- "Removed Pi cmux extension from %@" · `cli.hooks.pi.removed` · `CLI/CMUXCLI+PiExtension.swift:230`

### cli · install

- "Administrator privileges were required to write to /usr/local/bin." · `cli.install.adminRequired` · `Sources/AppDelegate.swift:10393`
- "Created symlink:\n\n%1$@ -> %2$@" · `cli.install.symlinkCreated` · `Sources/AppDelegate.swift:10391`

### cli · ios

- "[one] Found %lld iOS Simulator pane; pass --surface <ref> or --all / [other] Found %lld iOS Simulator panes; pass --surface <ref> or --all" · `cli.ios.error.ambiguousTargets` · `CLI/CMUXCLI+Simulator.swift:245`
- "The selected iOS pane has no surface reference" · `cli.ios.error.missingSurfaceReference` · `CLI/CMUXCLI+Simulator.swift:531`
- "[one] Found %lld iOS Simulator pane; screenshot --all supports at most 8 / [other] Found %lld iOS Simulator panes; screenshot --all supports at most 8" · `cli.ios.error.screenshotBatchLimit` · `CLI/CMUXCLI+Simulator.swift:262`
- "Usage: cmux ios <subcommand> [args] [--surface <ref>]\n\nEvery native `cmux simulator` subcommand is accepted unchanged.\n\nAdditional subcommands:\n  list [--workspace <ref>]            List Simulator panes and device identifiers\n  context [--udid]                    Print one selected Simulator identity\n  select <device-udid>                Bind a pane to an iPhone or iPad Simulator\n  screenshot [--out <path>]           Capture one or many selected Simulators\n\nExamples:\n  cmux ios list --json\n  cmux ios screenshot --surface surface:2 --out phone.png\n  cmux ios screenshot --all --out screenshots/\n  cmux ios rotate landscape-left" · `cli.ios.usage` · `CLI/CMUXCLI+Simulator.swift:76`

### cli · localTmux

- "local-tmux workspace and attachment options are only valid with start or attach" · `cli.localTmux.error.attachOrStartOnly` · `CLI/LocalTmuxInvocation.swift:195`
- "local-tmux cleanup could not list sessions; the registry was left unchanged." · `cli.localTmux.error.cleanupListFailed` · `CLI/CMUXCLI+LocalTmuxLifecycle.swift:194`
- "local-tmux cleanup does not take a session selector" · `cli.localTmux.error.cleanupSelector` · `CLI/LocalTmuxInvocation.swift:187`
- "local-tmux close failed" · `cli.localTmux.error.closeFailed` · `CLI/CMUXCLI+LocalTmuxLifecycle.swift:304`
- "local-tmux working directory is not an accessible directory: %@" · `cli.localTmux.error.cwdInvalid` · `CLI/CMUXCLI+LocalTmux.swift:281`
- "local-tmux --client/--all are only valid with detach" · `cli.localTmux.error.detachOnly` · `CLI/LocalTmuxInvocation.swift:200`
- "local-tmux detach accepts either --client or --all, not both" · `cli.localTmux.error.detachSelectorConflict` · `CLI/LocalTmuxInvocation.swift:203`
- "local-tmux: session name was supplied more than once" · `cli.localTmux.error.duplicateName` · `CLI/LocalTmuxInvocation.swift:160`
- "local-tmux session already exists; use attach or close it before supplying a new command" · `cli.localTmux.error.existingSessionCommand` · `CLI/CMUXCLI+LocalTmux.swift:227`
- "local-tmux session already exists with a different working directory; use attach or close it first" · `cli.localTmux.error.existingSessionCwd` · `CLI/CMUXCLI+LocalTmux.swift:222`
- "local-tmux --headless is only valid with attach or start" · `cli.localTmux.error.headlessOnly` · `CLI/LocalTmuxInvocation.swift:209`
- "local-tmux state path is not owned by the current user or is group/world accessible: %@" · `cli.localTmux.error.insecurePath` · defined but unused
- "local-tmux interactive client exited with status %d" · `cli.localTmux.error.interactiveExit` · `CLI/CMUXCLI+LocalTmuxLifecycle.swift:420`
- "local-tmux could not start an interactive client" · `cli.localTmux.error.interactiveStart` · `CLI/CMUXCLI+LocalTmuxLifecycle.swift:415`
- "local-tmux: --focus must be true or false" · `cli.localTmux.error.invalidFocus` · `CLI/LocalTmuxInvocation.swift:128`
- "local-tmux: --id must be a UUID" · `cli.localTmux.error.invalidID` · `CLI/LocalTmuxInvocation.swift:106`
- "local-tmux session names must contain only letters, numbers, underscore, or dash (1–128 characters)" · `cli.localTmux.error.invalidName` · `CLI/LocalTmuxCommandBuilder.swift:10`
- "local-tmux list does not take a session selector" · `cli.localTmux.error.listSelector` · `CLI/LocalTmuxInvocation.swift:184`
- "local-tmux could not verify the existing surface; no new client was created" · `cli.localTmux.error.livenessUnavailable` · `CLI/CMUXCLI+LocalTmuxAttachment.swift:313`
- "local-tmux session has multiple clients; pass --client <id> or --all to detach explicitly" · `cli.localTmux.error.multipleClients` · `CLI/CMUXCLI+LocalTmuxLifecycle.swift:361`
- "local-tmux --new-client is only valid with attach" · `cli.localTmux.error.newClientOnly` · `CLI/LocalTmuxInvocation.swift:212`
- "local-tmux session has no attached clients: %@" · `cli.localTmux.error.noClients` · `CLI/CMUXCLI+LocalTmuxLifecycle.swift:357`
- "local-tmux --prune is only valid with cleanup" · `cli.localTmux.error.pruneOnly` · `CLI/LocalTmuxInvocation.swift:206`
- "local-tmux could not run tmux" · `cli.localTmux.error.runFailed` · `CLI/LocalTmuxProcessRunner.swift:55`
- "local-tmux: use either a session name or --id, not both" · `cli.localTmux.error.selectorConflict` · `CLI/LocalTmuxInvocation.swift:171`
- "local-tmux %@ requires a session name or --id\n%@" · `cli.localTmux.error.selectorRequired` · `CLI/LocalTmuxInvocation.swift:178`
- "local-tmux session not found for id %@" · `cli.localTmux.error.sessionIDNotFound` · `CLI/CMUXCLI+LocalTmux.swift:365`
- "local-tmux session identity changed; refusing to operate on replacement session: %@" · `cli.localTmux.error.sessionIdentityChanged` · `CLI/LocalTmuxSessionIdentityResolver.swift:179`
- "local-tmux could not verify the tmux session identity: %@" · `cli.localTmux.error.sessionIdentityUnavailable` · `CLI/LocalTmuxSessionIdentityResolver.swift:186`
- "local-tmux session not found: %@" · `cli.localTmux.error.sessionNotFound` · `CLI/CMUXCLI+LocalTmux.swift:331`
- "local-tmux session is no longer running: %@" · `cli.localTmux.error.sessionNotRunning` · `CLI/LocalTmuxSessionIdentityResolver.swift:122`
- "local-tmux state directory is too long for a Unix socket: %@" · `cli.localTmux.error.socketPathTooLong` · `CLI/CMUXCLI+LocalTmux.swift:188`
- "local-tmux start accepts a name, not --id" · `cli.localTmux.error.startID` · `CLI/LocalTmuxInvocation.swift:174`
- "local-tmux --cwd and --command are only valid with start" · `cli.localTmux.error.startOnly` · `CLI/LocalTmuxInvocation.swift:190`
- "local-tmux start requires a session name" · `cli.localTmux.error.startRequiresName` · `CLI/CMUXCLI+LocalTmux.swift:203`
- "local-tmux state could not be accessed safely" · `cli.localTmux.error.stateOperationFailed` · `CLI/LocalTmuxSessionRegistry.swift:56`
- "local-tmux surface target was not found" · `cli.localTmux.error.surfaceNotFound` · defined but unused
- "local-tmux could not resolve %@ target %@" · `cli.localTmux.error.targetNotFound` · `CLI/CMUXCLI+LocalTmuxAttachment.swift:89`
- "local-tmux command timed out" · `cli.localTmux.error.timedOut` · `CLI/LocalTmuxProcessRunner.swift:167`
- "local-tmux requires tmux. Install tmux or configure an executable tmux path" · `cli.localTmux.error.tmuxMissing` · `CLI/CMUXCLI+LocalTmux.swift:183`
- "local-tmux: unexpected argument '%@'" · `cli.localTmux.error.unexpectedArgument` · `CLI/LocalTmuxInvocation.swift:166`
- "local-tmux: unknown flag '%@'\n%@" · `cli.localTmux.error.unknownFlag` · `CLI/LocalTmuxInvocation.swift:148`
- "Unknown local-tmux subcommand '%@'.\n%@" · `cli.localTmux.error.unknownSubcommand` · `CLI/LocalTmuxInvocation.swift:57`
- "local-tmux could not create a workspace for %@" · `cli.localTmux.error.workspaceCreateFailed` · `CLI/CMUXCLI+LocalTmuxAttachment.swift:127`
- "local-tmux workspace target was not found" · `cli.localTmux.error.workspaceNotFound` · `CLI/CMUXCLI+LocalTmuxAttachment.swift:21`
- "local-tmux pane or surface targets require a workspace" · `cli.localTmux.error.workspaceRequiredForTarget` · `CLI/CMUXCLI+LocalTmuxAttachment.swift:112`
- "OK session=%@ surface=%@ mode=local-tmux" · `cli.localTmux.output.attached` · `CLI/CMUXCLI+LocalTmuxAttachment.swift:159`
- "OK closed session=%@" · `cli.localTmux.output.closed` · `CLI/CMUXCLI+LocalTmuxLifecycle.swift:319`
- "OK detached session=%@ client=%@" · `cli.localTmux.output.detached` · `CLI/CMUXCLI+LocalTmuxLifecycle.swift:389`
- "OK session=%@ id=%@ state=%@ socket=%@" · `cli.localTmux.output.record` · `CLI/CMUXCLI+LocalTmuxLifecycle.swift:444`
- "Usage: cmux local-tmux <start|attach|list|status|detach|close|cleanup> [session] [options]\n\nOpt-in local tmux sessions survive cmux quit, crash, and app updates. Ordinary cmux terminals are unchanged.\n\nstart <name> [--cwd <path>] [--command <shell>] [--detached]\nattach <name|--id <uuid>> [--workspace <id|ref|index>] [--focus <true|false>] [--headless] [--new-client]\nlist [--json]\nstatus <name|--id <uuid>> [--json]\ndetach <name|--id <uuid>> [--client <id> | --all]\nclose <name|--id <uuid>>\ncleanup [--prune]\n\nThe registry and tmux server socket live under ~/.cmux/local-tmux with user-only permissions. `attach --headless` hands the terminal directly to tmux for a client outside the cmux GUI." · `cli.localTmux.usage` · `CLI/LocalTmuxInvocation.swift:235`

### cli · memory

- "memory: unknown flag '%@'. Known flags: --all --workspace <id|ref|index> --groups <count> --json" · `cli.memory.error.unknownFlag` · `CLI/CMUXCLI+Memory.swift:53`
- "[one] %lld process / [other] %lld processes" · `cli.memory.output.processCount.other` · `CLI/CMUXCLI+Memory.swift:180`
- "RSS  PROC  COMMAND                    ATTRIBUTION" · `cli.memory.output.topGroupsColumns` · `CLI/CMUXCLI+Memory.swift:162`

### cli · mobile

- "Granted Mac dev tags for paired phones: %@ (pushed to connected device(s))." · `cli.mobile.compatibleTags.applied` · `CLI/cmux.swift:6516`
- "Granted Mac dev tags for paired phones: %@ (applies when a phone next connects)." · `cli.mobile.compatibleTags.appliedNoDevice` · `CLI/cmux.swift:6522`
- "No additional Mac dev tags are granted to this Mac's paired phones." · `cli.mobile.compatibleTags.empty` · `CLI/cmux.swift:6477`
- "Usage: cmux mobile compatible-tags [list|set <tags...>|add <tags...>|remove <tags...>|clear]" · `cli.mobile.compatibleTags.usage` · `CLI/cmux.swift:6426`
- "Set mobile terminal font to %@pt on connected device(s)." · `cli.mobile.setFont.applied` · `CLI/cmux.swift:6450`
- "Set mobile terminal font to %@pt (no iOS device is currently connected)." · `cli.mobile.setFont.appliedNoDevice` · `CLI/cmux.swift:6456`
- "Usage: cmux mobile set-font <points> [--surface <id>] [--workspace <id>]" · `cli.mobile.setFont.usage` · `CLI/cmux.swift:6422`

### cli · moshTmux

- "mosh-tmux accepts a destination and --session, not a separate remote command" · `cli.moshTmux.arguments.invalid` · `CLI/cmux.swift:12198`
- "mosh-tmux: --session requires a non-empty session name without hidden characters" · `cli.moshTmux.session.invalid` · `CLI/cmux.swift:12151`

### cli · newPane

- "--profile <name|uuid>                Browser profile name or UUID" · `cli.newPane.help.profileDescription` · `CLI/cmux.swift:19355`

### cli · notification

- "Invalid notification payload" · `cli.notification.invalidPayload` · `CLI/CMUXCLI+SemanticNotifications.swift:13`

### cli · omo

- "Failed to install %1$@. Try manually: npm install -g %2$@" · `cli.omo.installFailed` · `CLI/cmux.swift:25478`
- "Installing %@ plugin (this may take a minute on first run)..." · `cli.omo.installingPlugin` · `CLI/cmux.swift:25470`
- "Neither bun nor npm found in PATH. Install %1$@ manually: bunx %2$@ install" · `cli.omo.noPackageManager` · `CLI/cmux.swift:25482`
- "%@ plugin installed" · `cli.omo.pluginInstalled` · `CLI/cmux.swift:25486`
- "Retrying %@ install with a clean shadow package state..." · `cli.omo.retryingInstallCleanState` · `CLI/cmux.swift:25474`
- "Usage: cmux omo [opencode-args...]\n\nLaunch OpenCode with oh-my-openagent in a cmux-aware environment.\n\noh-my-openagent orchestrates multiple AI models as specialized agents in\nparallel. This command sets up a tmux shim so agent panes become native\ncmux splits with sidebar metadata and notifications.\n\nThis command:\n  - sets a tmux-like environment so oh-my-openagent uses cmux splits\n  - prepends a private tmux shim to PATH\n  - forwards all remaining arguments to opencode\n\nThe tmux shim translates tmux window/pane commands into cmux workspace\nand split operations in the current cmux session.\n\nExamples:\n  cmux omo\n  cmux omo --continue\n  cmux omo --model claude-sonnet-4-6" · `cli.omo.usage` · `CLI/cmux.swift:18633`

### cli · open

- "open: unknown flag '%@'. Usage: cmux open <path-or-url>... [--engine <webkit|chromium>] [--workspace <id|ref|index>] [--surface <id|ref|index>] [--pane <id|ref|index>] [--window <id|ref|index>] [--focus true|false] [--no-focus]" · `cli.open.error.unknownFlag` · defined but unused

### cli · pathOpen

- "Failed to activate cmux" · `cli.pathOpen.error.activateFailed` · `CLI/cmux.swift:8664`
- "Failed to launch cmux" · `cli.pathOpen.error.launchFailed` · `CLI/cmux.swift:8657`
- "Path does not exist: %@" · `cli.pathOpen.error.pathDoesNotExist` · `CLI/cmux.swift:8357`
- "Failed to monitor process exit" · `cli.pathOpen.error.processMonitorFailed` · `CLI/cmux.swift:8427`
- "%@ (timed out)" · `cli.pathOpen.error.timedOut` · `CLI/cmux.swift:8390`

### cli · readSelection

- "read-screen: --selection cannot be combined with --scrollback or --lines" · `cli.readSelection.error.readScreenConflict` · `CLI/cmux.swift:7351`
- "Kind: %@" · `cli.readSelection.output.kind` · `CLI/CMUXCLI+SurfaceSelection.swift:110`
- "Line: %lld" · `cli.readSelection.output.line` · `CLI/CMUXCLI+SurfaceSelection.swift:131`
- "Lines: %lld-%lld" · `cli.readSelection.output.lines` · `CLI/CMUXCLI+SurfaceSelection.swift:139`
- "URL: %@" · `cli.readSelection.output.url` · `CLI/CMUXCLI+SurfaceSelection.swift:150`

### cli · restore

- "restore: waiting for cmux to verify that this agent session is not already running…" · `cli.restore.admission.waiting` · defined but unused
- "restore: the saved agent session is unavailable. The terminal remains in its saved directory; retry later or start a new agent session." · `cli.restore.codexCheckpointUnavailable` · `CLI/CMUXCLI+CodexResumeBindingVerification.swift:232`
- "restore: this command no longer matches the session. Run 'cmux restore --surface' to use the current record." · `cli.restore.error.checkpointMismatch` · `CLI/CMUXCLI+Restore.swift:59`
- "restore: the saved process could not be started. Retry the visible restore command." · `cli.restore.error.compatibilityShellFailed` · `CLI/CMUXCLI+RestoreExecution.swift:129`
- "restore: the current cmux surface could not be identified. Retry from this terminal or pass --surface <id|ref>." · `cli.restore.error.currentSurfaceUnknown` · `CLI/CMUXCLI+Restore.swift:295`
- "restore: the saved agent command is unavailable. Make sure the agent is installed, then retry." · `cli.restore.error.executableNotFound` · `CLI/CMUXCLI+RestoreExecution.swift:67`
- "restore: the saved process could not be started. Retry the visible restore command." · `cli.restore.error.execveFailed` · `CLI/CMUXCLI+RestoreExecution.swift:86`
- "restore: this session's saved restore data is not compatible. Start the agent again in this terminal." · `cli.restore.error.incompleteData` · `CLI/CMUXCLI+AdmittedRestore.swift:53`
- "restore: this command no longer matches the session. Run 'cmux restore --surface' to use the current record." · `cli.restore.error.kindMismatch` · `CLI/CMUXCLI+Restore.swift:48`
- "restore: this session's saved restore data is not compatible. Start the agent again in this terminal." · `cli.restore.error.malformedArguments` · `CLI/CMUXCLI+ContinuationSupport.swift:188`
- "restore: this session's saved restore data is not compatible. Start the agent again in this terminal." · `cli.restore.error.malformedRecord` · `CLI/CMUXCLI+ContinuationSupport.swift:183`
- "restore: provider setup could not start. Check the agent's provider settings, then retry." · `cli.restore.error.providerSetupConfigurationFailed` · `CLI/CMUXCLI+RestorePreflight.swift:34`
- "restore: provider setup failed. Check the agent's provider settings, then retry." · `cli.restore.error.providerSetupExited` · `CLI/CMUXCLI+RestorePreflight.swift:186`
- "restore: provider setup failed. Check the agent's provider settings, then retry." · `cli.restore.error.providerSetupSignaled` · `CLI/CMUXCLI+RestorePreflight.swift:198`
- "restore: provider setup could not start. Check the agent's provider settings, then retry." · `cli.restore.error.providerSetupStartFailed` · `CLI/CMUXCLI+RestorePreflight.swift:148`
- "restore: provider setup took too long. Check the provider connection, then retry." · `cli.restore.error.providerSetupTimedOut` · `CLI/CMUXCLI+RestorePreflight.swift:171`
- "restore: provider setup is unavailable. Check the agent's provider settings, then retry." · `cli.restore.error.providerSetupUnavailable` · `CLI/CMUXCLI+RestorePreflight.swift:22`
- "restore: provider setup could not complete. Retry the visible restore command." · `cli.restore.error.providerSetupWaitFailed` · `CLI/CMUXCLI+RestorePreflight.swift:317`
- "restore: cmux is still opening. Retry the visible restore command in a moment." · `cli.restore.error.socketNotReady` · `CLI/CMUXCLI+ContinuationSupport.swift:62`
- "restore: the requested surface was not found. Check the surface reference, then retry." · `cli.restore.error.surfaceNotFound` · `CLI/CMUXCLI+ContinuationSupport.swift:163`
- "restore: this session's saved restore data is not compatible. Start the agent again in this terminal." · `cli.restore.error.unsupportedMode` · `CLI/CMUXCLI+Restore.swift:120`
- "restore: the saved working directory is inaccessible. Restore access to it, then retry." · `cli.restore.error.workingDirectoryFailed` · `CLI/CMUXCLI+RestoreExecution.swift:27`
- "Usage: cmux restore [--surface <id|ref>] <kind> <checkpoint-id>\n       cmux restore <kind> <checkpoint-id> --surface <id|ref>\n       cmux restore --surface=<id|ref> <kind> <checkpoint-id>\n       cmux restore --surface [id|ref]\n\nReplace this CLI process with the persisted surface process. New\nrecords preserve launch arguments and cwd as structured values;\ncommand-only records from older builds use a compatibility shell.\nWith no id or ref, --surface uses the calling cmux surface." · `cli.restore.help` · `CLI/cmux.swift:18478`
- "Usage: cmux restore [--surface <id|ref>] <kind> <checkpoint-id>\n       cmux restore <kind> <checkpoint-id> --surface <id|ref>\n       cmux restore --surface=<id|ref> <kind> <checkpoint-id>" · `cli.restore.usage.positional` · `CLI/CMUXCLI+ContinuationSupport.swift:140`
- "Usage: cmux restore --surface [id|ref]" · `cli.restore.usage.surface` · `CLI/CMUXCLI+ContinuationSupport.swift:135`

### cli · rightSidebar

- "right-sidebar: unknown flag '%@'" · `cli.rightSidebar.error.unknownFlag` · `CLI/cmux.swift:20860`
- "right-sidebar: --window requires an id" · `cli.rightSidebar.error.windowRequiresValue` · `CLI/cmux.swift:20845`
- "right-sidebar: --workspace requires an id" · `cli.rightSidebar.error.workspaceRequiresValue` · `CLI/cmux.swift:20839`
- "Usage: cmux right-sidebar <command> [flags]\n\nControl the right sidebar from the CLI.\n\nCommands:\n  toggle                         Toggle right sidebar visibility\n  show                           Show the right sidebar\n  hide                           Hide the right sidebar\n  focus                          Focus the current right sidebar mode\n  set <files|find|vault|sessions|feed|dock|cloud|custom> [sidebar-name]\n                                 Show, switch mode, and focus. `custom` renders a\n                                 JS/Swift sidebar from ~/.config/cmux/sidebars as\n                                 a right panel; the optional name picks which one.\n  mode                           Print {"visible":bool,"mode":string}\n  files|find|vault|sessions|feed|dock|cloud|custom\n                                 Alias for show + set + focus\n\nFlags:\n  --workspace <id|ref|index>     Target the window containing a workspace\n  --window <id|ref|index>        Target a window\n  --no-focus                     With set, switch mode without moving focus\n\nExamples:\n  cmux right-sidebar toggle\n  cmux right-sidebar set find\n  cmux right-sidebar set vault --no-focus\n  cmux right-sidebar mode" · `cli.rightSidebar.usage` · `CLI/cmux.swift:20106`

### cli · send

- "queued (terminal starting; input will be sent when its PTY is ready)" · `cli.send.queuedSuffix` · `CLI/cmux.swift:21061`

### cli · sessions

- "sessions [list] [options]" · `cli.sessions.command` · `CLI/CMUXCLI+TaskHelp.swift:192`
- "sessions list: unknown flag '%@'" · `cli.sessions.error.unknownFlag` · `CLI/CMUXCLI+SessionsList.swift:52`
- "[one] ... %lld more. Pass --all or --limit <n>. / [other] ... %lld more. Pass --all or --limit <n>." · `cli.sessions.output.more` · `CLI/CMUXCLI+SessionsList.swift:293`
- "Usage: cmux sessions list [options]\n       cmux sessions [options]\n\nPrint saved agent session records from ~/.cmuxterm/*-hook-sessions.json.\nThis command does not require a running cmux socket.\nBy default, broad output shows active, restorable, or transcript-backed records.\nPass --all to inspect every saved hook record.\n\nOptions:\n  --agent <name>        Filter to one agent, for example codex or claude\n  --session <id>        Filter to one agent session id\n  --workspace <id>      Filter to one saved workspace id\n  --surface <id>        Filter to one saved surface id\n  --cwd <text>          Filter by saved cwd or launch working directory\n  --state-dir <path>    Override hook state directory\n  --codex-home <path>   Override the default Codex home used for transcript checks\n  --limit <n>           Limit text output (default: 100)\n  --all                 Print all matches\n  --json                Print structured JSON\n\nCodex rows include whether the saved id exists in CODEX_HOME/session_index.jsonl\nand whether a matching transcript file exists under CODEX_HOME/sessions or\nCODEX_HOME/archived_sessions.\n\nCompatibility aliases:\n  cmux sessions debug [options]\n  cmux session-debug [options]" · `cli.sessions.usage` · `CLI/CMUXCLI+SessionsList.swift:300`

### cli · sidebar

- "ERROR %@ [%@] %@: %@" · `cli.sidebar.report.error` · `CLI/cmux.swift:20777`
- "%#@count1@, %#@count2@." · `cli.sidebar.report.summary` · `CLI/cmux.swift:20810`
- "Usage: cmux sidebar <validate|reload|select|open> [name|--all] [--json]\n\nValidate, reload, select, or open custom sidebars from ~/.config/cmux/sidebars.\nSwift files win over JSON files with the same base name.\n\nCommands:\n  validate [name]   Validate all custom sidebars, or one named sidebar\n  reload [name]     Validate all sidebars, then reload every valid one\n  select <name>     Validate and activate one custom sidebar\n  open <name>       Open one custom sidebar as a Bonsplit pane\n\nExamples:\n  cmux sidebar validate\n  cmux sidebar reload --all\n  cmux sidebar select finder.tree\n  cmux sidebar open finder.tree" · `cli.sidebar.usage` · `CLI/cmux.swift:20137`

### cli · simulator

- "The Simulator worker returned no accessibility snapshot" · `cli.simulator.error.accessibilityMissing` · `Sources/TerminalController+ControlSimulatorOperationPayloads.swift:51`
- "The caller surface is no longer available. Pass --surface or --window to select a Simulator." · `cli.simulator.error.callerSurfaceUnavailable` · defined but unused
- "The Simulator camera operation failed" · `cli.simulator.error.cameraFailed` · `Packages/macOS/CmuxControlSocket/Sources/CmuxControlSocket/Coordinator/Simulator/ControlCommandCoordinator+SimulatorErrors.swift:56`
- "Camera source %@ requires a file path" · `cli.simulator.error.cameraPathRequired` · `Sources/TerminalController+ControlSimulatorCameraPayloads.swift:112`
- "The Simulator worker returned no camera status" · `cli.simulator.error.cameraStatusMissing` · `Sources/TerminalController+ControlSimulatorCameraPayloads.swift:51`
- "The camera file is not a readable image or video" · `cli.simulator.error.cameraUnreadable` · `Sources/TerminalController+ControlSimulatorCameraPayloads.swift:29`
- "Simulator has been disabled remotely" · `cli.simulator.error.featureDisabled` · `Sources/TerminalController+ControlSimulatorOperations.swift:13`
- "The Simulator worker returned no foreground-app result" · `cli.simulator.error.foregroundMissing` · `Sources/TerminalController+ControlSimulatorOperationPayloads.swift:73`
- "Simulator input transmission did not complete before the deadline" · `cli.simulator.error.inputTimeout` · `Packages/macOS/CmuxControlSocket/Sources/CmuxControlSocket/Coordinator/Simulator/ControlCommandCoordinator+Simulator.swift:54`
- "[one] simulator input exceeds the %lld-byte UTF-8 limit / [other] simulator input exceeds the %lld-byte UTF-8 limit" · `cli.simulator.error.inputTooLarge` · `CLI/CMUXCLI+SimulatorInput.swift:150`
- "The Simulator worker returned no interface status" · `cli.simulator.error.interfaceStatusMissing` · `Sources/TerminalController+ControlSimulatorOperations.swift:522`
- "simulator gesture requires a JSON touch object or array" · `cli.simulator.error.invalidGestureJSON` · `CLI/CMUXCLI+SimulatorAgent.swift:41`
- "simulator highlight requires on or off" · `cli.simulator.error.invalidHighlight` · `CLI/CMUXCLI+Simulator.swift:644`
- "Simulator tools action must be show, hide, or toggle" · `cli.simulator.error.invalidToolsAction` · `Sources/TerminalController+ControlSimulatorOperations.swift:198`
- "The selected Simulator is not streaming" · `cli.simulator.error.notStreaming` · defined but unused
- "The Simulator operation failed" · `cli.simulator.error.operationFailed` · `Sources/TerminalController+ControlSimulatorOperations.swift:341`
- "The Simulator operation did not complete before the deadline" · `cli.simulator.error.operationTimeout` · `Packages/macOS/CmuxControlSocket/Sources/CmuxControlSocket/Coordinator/Simulator/ControlCommandCoordinator+SimulatorOperations.swift:179`
- "The Simulator worker returned no permission status" · `cli.simulator.error.permissionStatusMissing` · `Sources/TerminalController+ControlSimulatorOperations.swift:434`
- "Simulator control is unavailable in remote workspaces" · `cli.simulator.error.remoteWorkspace` · `Packages/macOS/CmuxControlSocket/Sources/CmuxControlSocket/Coordinator/Simulator/ControlCommandCoordinator+Simulator.swift:129`
- "[one] Text exceeds the %lld-byte UTF-8 limit / [other] Text exceeds the %lld-byte UTF-8 limit" · `cli.simulator.error.textTooLong` · `Packages/macOS/CmuxControlSocket/Sources/CmuxControlSocket/Coordinator/Simulator/ControlCommandCoordinator+Simulator.swift:76`
- "Simulator input transmission is unavailable" · `cli.simulator.error.transmissionUnavailable` · `Packages/macOS/CmuxControlSocket/Sources/CmuxControlSocket/Coordinator/Simulator/ControlCommandCoordinator+Simulator.swift:108`
- "simulator: unknown flag '%@'" · `cli.simulator.error.unknownFlag` · `CLI/CMUXCLI+SimulatorInput.swift:35`
- "Unknown Simulator touch edge: %@" · `cli.simulator.error.unknownTouchEdge` · `Sources/TerminalController+ControlSimulatorOperationPayloads.swift:29`
- "Unknown Simulator touch phase: %@" · `cli.simulator.error.unknownTouchPhase` · `Sources/TerminalController+ControlSimulatorOperationPayloads.swift:16`
- "The Web Inspector operation did not complete before the deadline" · `cli.simulator.error.webInspectorTimeout` · `Packages/macOS/CmuxControlSocket/Sources/CmuxControlSocket/Coordinator/Simulator/ControlCommandCoordinator+SimulatorWebInspector.swift:101`
- "The Simulator worker did not respond before the deadline" · `cli.simulator.error.workerTimeout` · `Packages/macOS/CmuxControlSocket/Sources/CmuxControlSocket/Coordinator/Simulator/ControlCommandCoordinator+SimulatorErrors.swift:41`
- "No permission values" · `cli.simulator.output.noPermissions` · `CLI/CMUXCLI+SimulatorAgentFormatting.swift:65`
- "%@ %@ for %@" · `cli.simulator.output.permissionUpdated` · `CLI/CMUXCLI+SimulatorAgentFormatting.swift:31`
- "Permission results were truncated at 256 applications" · `cli.simulator.output.permissionsTruncated` · `CLI/CMUXCLI+SimulatorAgentFormatting.swift:82`
- "[one] Typed %lld character / [other] Typed %lld characters" · `cli.simulator.output.typed` · `CLI/CMUXCLI+Simulator.swift:681`
- "Usage:\n  cmux simulator permissions list [bundle-id] [--surface <id|ref|index>]\n  cmux simulator permissions grant <permission> <bundle-id> [--value <value>] [--surface <id|ref|index>]\n  cmux simulator permissions revoke <permission> <bundle-id> [--surface <id|ref|index>]\n  cmux simulator permissions reset <permission|all> <bundle-id> [--surface <id|ref|index>]\n\nValues: photos limited; notifications critical; location always, inuse, or never." · `cli.simulator.permissions.usage` · `CLI/CMUXCLI+SimulatorSettings.swift:290`
- "Usage:\n  cmux simulator ui [status] [--surface <id|ref|index>]\n  cmux simulator ui [get] <option> [--surface <id|ref|index>]\n  cmux simulator ui [set] <option> <value> [--surface <id|ref|index>]\n\nOptions: appearance, liquid-glass, color-filter, text-size, reduce-motion, increase-contrast, show-borders, reduce-transparency, voiceover." · `cli.simulator.ui.usage` · `CLI/CMUXCLI+SimulatorSettings.swift:305`
- "Usage: cmux simulator <subcommand> [args] [--surface <id|ref|index>]\n\nSubcommands:\n  type [text] [--stdin|--file <path>]  Type text and wait for transmission completion\n  tap <x> <y> [x2 y2]                 Send a correlated one- or two-finger tap\n  gesture <json> [--stdin|--file]      Send 1...256 ordered normalized touch events\n  multitouch <json> [--stdin|--file]  Send ordered two-finger touch events\n  swipe <x1> <y1> <x2> <y2> [steps]  Send a sampled swipe\n  button <name>                       Press a Simulator hardware button\n  rotate <orientation>                Rotate to a logical orientation\n  ca <diagnostic> <on|off>             Toggle a Core Animation diagnostic\n  memory-warning                      Simulate a memory warning\n  event-log [limit]                   Print recent Simulator events\n  tools <show|hide|toggle>             Control the Simulator tools inspector\n  camera <configure|switch|mirror|status> ...\n  permissions <list|grant|revoke|reset> ...\n  ui [status|get|set] [option] [value]\n  targets                             Refresh and print Web Inspector targets\n  attach <target-id>                  Attach the native Web Inspector session\n  send [json] [--stdin|--file <path>] Send a raw JSON inspector command\n  highlight <on|off>                  Highlight the attached page\n  release                             Release the attached page\n\nEach command waits for its correlated Simulator-worker result. `send` prints the raw response carrying the same JSON request id." · `cli.simulator.usage` · `CLI/CMUXCLI+Simulator.swift:34`
- "Additional inspection commands:\n  accessibility                       Print the bounded native accessibility tree\n  foreground                          Print the foreground application" · `cli.simulator.usage.inspection` · `CLI/CMUXCLI+Simulator.swift:64`

### cli · socket

- "Command timed out" · `cli.socket.error.commandTimedOut` · defined but unused
- "Refusing to choose socket: CMUX_SOCKET_PATH and CMUX_SOCKET differ. Use CMUX_SOCKET_PATH or unset CMUX_SOCKET." · `cli.socket.error.conflictingEnvironment` · `CLI/CLISocketSentryTelemetry.swift:20`
- "No live cmux socket found. Tried:" · `cli.socket.error.discoveryFailed` · `CLI/CLISocketPathResolver.swift:107`
- "Failed to write to socket" · `cli.socket.error.failedToWrite` · defined but unused
- "Failed to write to socket (%1$@, errno %2$d)" · `cli.socket.error.failedToWriteWithErrno` · `CLI/cmux.swift:3819`
- "Invalid UTF-8 response" · `cli.socket.error.invalidUTF8Response` · defined but unused
- "Socket response exceeded batch limit" · `cli.socket.error.responseExceededBatchLimit` · defined but unused
- "Socket closed before complete reply" · `cli.socket.error.socketClosedBeforeCompleteReply` · defined but unused
- "Socket read error" · `cli.socket.error.socketRead` · `CLI/cmux.swift:3958`
- "Unexpected extra batched socket response" · `cli.socket.error.unexpectedExtraBatchResponse` · defined but unused
- "Workspace not closed" · `cli.socket.error.workspaceNotClosed` · `Sources/TerminalController+ControlWorkspaceStrings.swift:12`
- "cmux: default socket %@ is unavailable; using %@." · `cli.socket.notice.rerouted` · `CLI/CLISocketPathResolver.swift:118`

### cli · socketControlStatus

- "socket-status [--json]" · `cli.socketControlStatus.command` · `CLI/CMUXCLI+TaskHelp.swift:408`
- "Use --json for the profile source and socket-path observation. This command never connects to the automation socket." · `cli.socketControlStatus.detail` · `CLI/CMUXCLI+SocketControlStatus.swift:61`
- "Usage: cmux socket-status [--json]" · `cli.socketControlStatus.error.invalidArguments` · `CLI/CMUXCLI+SocketControlStatus.swift:18`
- "Usage: cmux socket-status [--json]\n\nPrint the effective automation socket policy and managed source\nwithout connecting to the socket. This remains available when\nthe socket is off; live enforcement is reported as unobserved." · `cli.socketControlStatus.help` · `CLI/cmux.swift:18460`
- "Socket control mode: %@%@. Live enforcement: not observed." · `cli.socketControlStatus.summary` · `CLI/CMUXCLI+SocketControlStatus.swift:56`

### cli · ssh

- "SSH authentication to %@ failed (exit %@)." · `cli.ssh.authenticationExitFailed` · `CLI/CMUXCLI+SSHAuthentication.swift:95`
- "SSH authentication requires the system SSH executable." · `cli.ssh.authenticationSystemExecutableRequired` · `CLI/CMUXCLI+SSHAuthentication.swift:28`
- "[cmux] SSH restore stopped because cmux could not register the connection lifecycle. Reopen this remote workspace to reconnect." · `cli.ssh.restore.lifecycleUnavailable` · `Sources/SessionRemoteWorkspaceSnapshot+Restore.swift:302`
- "ssh: --transport must be followed by 'ssh' or 'mosh'" · `cli.ssh.transport.invalid` · `CLI/cmux.swift:12138`

### cli · sshPtyAttach

- "[cmux] remote PTY reconnected (attempt %s/%s)." · `cli.sshPtyAttach.reconnected` · `Packages/macOS/CmuxFoundation/Sources/CmuxFoundation/SSHPTYAttachRetryScriptBuilder.swift:64`

### cli · sshSessionList

- "Remote PTY session state is unavailable for one or more workspaces." · `cli.sshSessionList.remoteStateUnavailable` · `CLI/cmux.swift:14624`

### cli · surface

- "Usage: cmux surface ls [<machine>|local] [--refresh] [--json]\n       cmux surface open <resource> [--workspace <id|ref|index>] [--pane <id|ref>] [--left|--right|--up|--down|--tab] [--new] [--focus <true|false>]\n       cmux surface new-terminal --machine <id|local> [--cwd <dir>] [--name <name>] [--remote-workspace <ws_…>] [--workspace <id|ref|index>] [--no-open] [-- <command...>]\n       cmux surface resume set [flags] -- <argv...>\n       cmux surface resume set [flags] --shell <command>\n       cmux surface resume show [--json] [flags]\n       cmux surface resume get [--json] [flags]\n       cmux surface resume clear [flags]\n\nls / open / new-terminal: the surface catalog. Terminals, VNC screens and browsers\non This Mac and on every cloud machine are resources (`<machine>/<kind>/<key>`,\ne.g. local/terminal/<uuid>, vivid-newt/terminal/term_2f9c…, vivid-newt/display/display:1,\nvivid-newt/browser/port:3000); panes project them. `open` reuses the pane already\nshowing a resource unless --new; --pane with a side splits that pane on that side,\n--tab adds a tab to it. A local terminal moves to the destination (it is shown once).\n`new-terminal` creates a terminal on the machine (cloud: in its cmux-tui session).\n`cmux vm tree` prints the same catalog.\n\nresume: attach restart command metadata to a terminal surface.\nPublic CLI bindings are stored for inspection and manual restore.\n\nFlags:\n  --workspace <id|ref|index>   Workspace context (default: $CMUX_WORKSPACE_ID)\n  --surface <id|ref|index>     Surface context (default: $CMUX_SURFACE_ID)\n  --window <id|ref|index>      Window context for workspace and surface refs/indexes\n  --cwd <path>             Working directory for restore (default: $PWD)\n  --name <name>            Display name for the binding\n  --kind <kind>            Binding kind, for example agent or tmux\n  --checkpoint <id>        Provider checkpoint or session id\n  --checkpoint-id <id>     Same as --checkpoint and takes precedence\n  --source <source>        Binding source label\n\nExamples:\n  cmux surface resume set --kind tmux --shell "tmux attach -t work"\n  cmux surface resume set --kind opencode --checkpoint ses_123 -- opencode --session ses_123\n  cmux surface resume show --json" · `cli.surface.usage` · `CLI/cmux.swift:19476`

### cli · surfaceResume

- "surface resume set: unknown flag '%1$@'. Known flags: %2$@. Use -- <argv...> for command arguments." · `cli.surfaceResume.set.error.unknownFlag` · `CLI/cmux.swift:9488`

### cli · terminalCreation

- "%@: --command can only be used with --type terminal" · `cli.terminalCreation.error.commandRequiresTerminalType` · `CLI/CMUXCLI+TerminalCreation.swift:121`
- "%@: --command requires <text>" · `cli.terminalCreation.error.commandRequiresValue` · `CLI/CMUXCLI+TerminalCreation.swift:183`
- "Run this as the new terminal's initial command" · `cli.terminalCreation.help.initialCommandDescription` · `CLI/cmux.swift:18044`

### cli · tmux-compat

- "cmux tmux shim: no downstream tmux executable found" · `cli.tmux-compat.error.downstreamTmuxMissing` · `CLI/CMUXCLI+TmuxCompatLaunchContext.swift:221`
- "%@ must be launched from a cmux-managed terminal surface. Open a terminal surface in cmux and run this command there." · `cli.tmux-compat.error.managedTerminalRequired` · `CLI/CMUXCLI+ExecutableResolution.swift:8`

### cli · tmuxCompat

- "respawn-pane requires -k in cmux tmux compatibility mode" · `cli.tmuxCompat.respawnPane.requiresForce` · `CLI/cmux.swift:26399`

### cli · top

- "cmux top requires a running cmux build that supports process diagnostics" · `cli.top.error.processDiagnosticsUnsupported` · `CLI/cmux.swift:21333`

### cli · uninstall

- "Administrator privileges were required to modify /usr/local/bin." · `cli.uninstall.adminRequired` · `Sources/AppDelegate.swift:10418`
- "No cmux CLI symlink was found at %@." · `cli.uninstall.notFound` · `Sources/AppDelegate.swift:10415`

### cli · usage

- "read-screen [--workspace <id|ref|index>] [--surface <id|ref|index>] [--window <id|ref|index>] [--scrollback] [--lines <n>] [--selection]" · `cli.usage.readScreen` · `CLI/CMUXCLI+SurfaceSelection.swift:213`
- "read-selection [--workspace <id|ref|index>] [--surface <id|ref|index>] [--window <id|ref|index>]" · `cli.usage.readSelection` · `CLI/CMUXCLI+SurfaceSelection.swift:206`

### cli · vault

- "vault requires a subcommand. Try: sessions, search, checkpoints, checkpoint, fork" · `cli.vault.error.subcommandRequired` · `CLI/CMUXCLI+Vault.swift:44`
- "Usage: cmux vault <subcommand> [options]\n\nBrowse, search, checkpoint, and fork agent sessions from the Vault index.\n\nSubcommands:\n  sessions [--agent <id>] [--folder <path>] [--limit <n>]\n      List indexed agent sessions, newest first.\n  search <query> [--limit <n>]\n      Search sessions. Supports agent:, repo:, ws:, before:/after:\n      operators and quoted phrases, ranked by recency.\n  checkpoints --agent <id> --session <id>\n      List a session's checkpoint timeline (derived turns + manual).\n  checkpoint --agent <id> --session <id> [--name <text>]\n      Create a manual named checkpoint at the session's current tip.\n  fork --agent <id> --session <id> (--checkpoint <id> | --turn <n>) [--open]\n      Fork a new session from a checkpoint. Prints the new session id\n      and its resume command; --open also opens it in a new workspace.\n\nAll subcommands support --json for machine-readable output." · `cli.vault.usage` · `CLI/CMUXCLI+Vault.swift:9`

### cli · vm

- "Reattach: cmux vm open %1$@/%2$@/%3$@" · `cli.vm.agent.reattach` · `CLI/cmux.swift:12899`
- "Started %1$@ on %2$@ — terminal %3$@ in workspace %4$@ (detached: it keeps running if the pane closes)." · `cli.vm.agent.started` · `CLI/CMUXCLI+VMTransfer.swift:1826`
- "Waiting for %1$@ to finish (Ctrl-C stops waiting; the agent keeps running — %2$@).\n" · `cli.vm.agent.waiting` · `CLI/CMUXCLI+VMTransfer.swift:1856`
- "%1$@ attaches only through its cmux-tui daemon. Run `cmux vm tui %1$@`; if that reports no client, install one with `curl -fsSL https://cmux.com/tui/install-static.sh | sh` or point CMUX_TUI_CLIENT at a binary." · `cli.vm.attach.cmuxTuiOnly` · defined but unused
- "Created Cloud VM %@" · `cli.vm.create.createdCloudVM` · `Sources/Cloud/MachineCreateCoordinator.swift:306`
- "vm env ls: unknown flag '%1$@'\n\n%2$@" · `cli.vm.env.lsUnknownFlag` · `CLI/CMUXCLI+VMLayoutEnv.swift:343`
- "[one] OK removed %1$ld variable on %2$@: %3$@ / [other] OK removed %1$ld variables on %2$@: %3$@" · `cli.vm.env.remove.many` · `CLI/CMUXCLI+VMLayoutEnv.swift:384`
- "[one] OK removed %1$ld variable on %2$@: %3$@ / [other] OK removed %1$ld variable on %2$@: %3$@" · `cli.vm.env.remove.one` · `CLI/CMUXCLI+VMLayoutEnv.swift:383`
- "vm env rm: give at least one KEY\n\n%1$@" · `cli.vm.env.rmGiveAtLeastOneKEY` · `CLI/CMUXCLI+VMLayoutEnv.swift:365`
- "vm env rm: unknown flag '%1$@'\n\n%2$@" · `cli.vm.env.rmUnknownFlag` · `CLI/CMUXCLI+VMLayoutEnv.swift:360`
- "vm env set: %1$@" · `cli.vm.env.set` · `CLI/CMUXCLI+VMLayoutEnv.swift:311`
- "[one] OK set %1$ld variable on %2$@: %3$@ / [other] OK set %1$ld variables on %2$@: %3$@" · `cli.vm.env.set.many` · `CLI/CMUXCLI+VMLayoutEnv.swift:336`
- "[one] OK set %1$ld variable on %2$@: %3$@ / [other] OK set %1$ld variable on %2$@: %3$@" · `cli.vm.env.set.one` · `CLI/CMUXCLI+VMLayoutEnv.swift:335`
- "vm.env_set: every entry needs a string `key` and a string `value`." · `cli.vm.env.setEveryEntryNeedsAStringKeyAnd` · `Sources/Surfaces/SurfaceSocketCommands.swift:788`
- "vm env set: give KEY=VALUE pairs, --from-file <.env>, or - for stdin\n\n%1$@" · `cli.vm.env.setGiveKEYVALUEPairsFromFileEnv` · `CLI/CMUXCLI+VMLayoutEnv.swift:314`
- "vm.env_set requires `entries`: a non-empty array of {key, value}." · `cli.vm.env.setRequiresEntriesANonEmptyArrayOf` · `Sources/Surfaces/SurfaceSocketCommands.swift:782`
- "vm.env_set requires `id`. Run `cmux vm ls` to find one." · `cli.vm.env.setRequiresIdRunCmuxVmLsTo` · `Sources/Surfaces/SurfaceSocketCommands.swift:779`
- "vm env set: unknown flag '%1$@'\n\n%2$@" · `cli.vm.env.setUnknownFlag` · `CLI/CMUXCLI+VMLayoutEnv.swift:575`
- "vm env: unknown verb '%1$@'\n\n%2$@" · `cli.vm.env.unknownVerb` · `CLI/CMUXCLI+VMLayoutEnv.swift:396`
- "Usage:\n  cmux vm env set <machine> KEY=VALUE [KEY2=VALUE2 …] [--from-file <.env>] [-]\n                                                      Set environment variables for every terminal, agent, and\n                                                      command cmux starts on the machine. They persist in\n                                                      ~/.config/cmux/env on its durable volume (mode 0600) and are\n                                                      sourced by login and interactive shells there. --from-file\n                                                      and `-` (stdin) read KEY=VALUE lines (dotenv rules: blank\n                                                      lines and # comments skipped, optional `export `, matching\n                                                      quotes stripped) — prefer them over KEY=VALUE on the command\n                                                      line so values stay out of your shell history and `ps`.\n  cmux vm env ls <machine> [--show]                   List the variable names; --show prints the values too.\n  cmux vm env rm <machine> KEY [KEY2 …]               Remove variables.\n\nHow values travel: over the machine's cmux-tui link (end-to-end encrypted, brokered but never\nread by the control plane) into the machine's `cmux env receive`, which turns terminal echo\noff before it reads. Nothing passes through vm.exec, a command line, or a terminal's screen,\nand only names are ever printed back (use --show to see values). Forks, snapshots, and\ntemplates of the machine inherit the file; `cmux vm env rm` before you promote one.\nKeys match [A-Za-z_][A-Za-z0-9_]*. Add --json for the raw result." · `cli.vm.env.usage` · `CLI/CMUXCLI+VMLayoutEnv.swift:49`
- "accepted for older scripts; every machine has a screen" · `cli.vm.help.legacyKindFlags` · `CLI/cmux.swift:5833`
- "Create a new machine: the devbox with devtools," · `cli.vm.help.newDevbox` · `CLI/cmux.swift:18307`
- "the image for the size; --image <id> is an" · `cli.vm.help.newDevboxImage` · `CLI/cmux.swift:18309`
- "explicit override you normally omit." · `cli.vm.help.newDevboxOverride` · `CLI/cmux.swift:18310`
- "coding agents and a VNC screen. The server picks" · `cli.vm.help.newDevboxScreen` · `CLI/cmux.swift:18308`
- "vm layout apply: --from-saved needs a layout name (see `cmux layout list`)" · `cli.vm.layout.applyFromSavedNeedsALayoutNameSee` · `CLI/CMUXCLI+VMLayoutEnv.swift:253`
- "vm layout apply: give a layout file, `-` for stdin, or --from-saved <name>\n\n%1$@" · `cli.vm.layout.applyGiveALayoutFileForStdinOr` · `CLI/CMUXCLI+VMLayoutEnv.swift:269`
- "vm layout apply: invalid layout document: %1$@" · `cli.vm.layout.applyInvalidLayoutDocument` · `CLI/CMUXCLI+VMLayoutEnv.swift:150`
- "vm layout apply: pass a file (or -) OR --from-saved <name>, not both\n\n%1$@" · `cli.vm.layout.applyPassAFileOrORFromSaved` · `CLI/CMUXCLI+VMLayoutEnv.swift:140`
- "vm layout apply: unknown flag '%1$@'\n\n%2$@" · `cli.vm.layout.applyUnknownFlag` · `CLI/CMUXCLI+VMLayoutEnv.swift:131`
- "vm layout export: unknown flag '%1$@'\n\n%2$@" · `cli.vm.layout.exportUnknownFlag` · `CLI/CMUXCLI+VMLayoutEnv.swift:100`
- "vm layout: unknown verb '%1$@'\n\n%2$@" · `cli.vm.layout.unknownVerb` · `CLI/CMUXCLI+VMLayoutEnv.swift:92`
- "Usage:\n  cmux vm layout export <machine> [<workspace-id|name>] [--raw]\n                                                      Print a machine workspace's layout as a declarative layout\n                                                      document — the same JSON `cmux new-workspace --layout`,\n                                                      `cmux layout save/open`, and cmux.json use. Default: the\n                                                      machine's focused workspace. --raw prints the daemon's own\n                                                      LayoutDocument (exact pane/tab ids) instead.\n  cmux vm layout apply <machine> (<file>|- | --from-saved <name>) [--workspace <workspace-id>|--name <name>] [--cwd <dir>] [--open]\n                                                      Build panes, splits, and tabs on the machine from a layout\n                                                      document: a file, stdin (-), or a layout saved on this Mac\n                                                      (`cmux layout list`). Default: a NEW machine workspace named\n                                                      after the document (--name overrides); --workspace targets an\n                                                      existing EMPTY workspace. Terminal `command`s are typed into\n                                                      login shells started in each surface's `cwd` (relative to\n                                                      --cwd, default: the work user's home). --open then opens the workspace here\n                                                      with the same geometry.\n\nDocument (one of):\n  {"pane": {"surfaces": [{"type": "terminal", "name": "tests", "command": "bun test", "cwd": "work/app"}]}}\n  {"direction": "horizontal"|"vertical", "split": 0.6, "children": [<node>, <node>]}\n  {"name": …, "cwd": …, "layout": <node>}      or      {"name": …, "workspace": {"cwd": …, "layout": <node>}}\n`horizontal` = side by side (first child left), `vertical` = stacked (first child top); `split` is the\nfirst child's share (0.1–0.9, default 0.5). Surface types: terminal (name, command, cwd, env),\nbrowser (url, name); project surfaces are Mac-only and skipped on a machine.\nWorkspace ids come from `cmux vm tree`. Add --json for the raw result. Exit 2 = the document is invalid." · `cli.vm.layout.usage` · `CLI/CMUXCLI+VMLayoutEnv.swift:21`
- "cmux %1$@ failed on %2$@ (exit %3$@)" · `cli.vm.layoutEnv.cmuxValueFailedOnValueExitValue` · `CLI/CMUXCLI+VMLayoutEnv.swift:434`
- "line %1$@: invalid variable name '%2$@' (keys match [A-Za-z_][A-Za-z0-9_]*)" · `cli.vm.layoutEnv.lineValueInvalidVariableNameValueKeysMatchAZa` · `CLI/CMUXCLI+VMLayoutEnv.swift:624`
- "Open it: cmux vm workspace open %1$@ %2$@" · `cli.vm.layoutEnv.openItCmuxVmWorkspaceOpenValueValue` · `CLI/CMUXCLI+VMLayoutEnv.swift:195`
- "Free cloud access expires in %1$@ (%2$@) — upgrade to keep using it: %3$@" · `cli.vm.list.freeAccess` · `CLI/cmux.swift:5622`
- "%1$d of 1 machine on the %2$@ plan" · `cli.vm.list.planMeter.single` · `CLI/cmux.swift:5570`
- "[one] %1$d machine on the %2$@ plan, no limit / [other] %1$d machines on the %2$@ plan, no limit" · `cli.vm.list.planMeter.unlimited` · `CLI/cmux.swift:5582`
- "Targets (from `cmux vm tree`; <machine> is a cloud ID or another Mac's `device:<uuid>@<tag>`):" · `cli.vm.open.deviceTargets` · `CLI/CMUXCLI+VMTui.swift:852`
- "The machine’s sessions are unavailable. Refresh and retry." · `cli.vm.open.sessionsUnavailable` · `CLI/CMUXCLI+VMTui.swift:488`
- "The machine's output could not be read completely. Reconnect and retry." · `cli.vm.output.incomplete` · `CLI/CMUXCLI+VMTransfer.swift:1950`
- "The machine returned an invalid output page. Reconnect and retry." · `cli.vm.output.invalidPage` · `CLI/CMUXCLI+VMTransfer.swift:1945`
- "cmux vm pull: %1$d/%#@count2@" · `cli.vm.pull.progress` · `CLI/CMUXCLI+VMTransfer.swift:925`
- "Pulled %1$@:%2$@ to %3$@ (%4$@)" · `cli.vm.pull.summary` · `CLI/CMUXCLI+VMTransfer.swift:734`
- "cmux vm push: %1$d/%#@count2@" · `cli.vm.push.progress` · defined but unused
- "Pushed %1$@ to %2$@:%3$@ (%4$@)" · `cli.vm.push.summary` · `CLI/CMUXCLI+VMTransfer.swift:282`
- "[cmux] connection lost — reconnecting (attempt %d)…" · `cli.vm.reconnecting` · `CLI/cmux.swift:14001`
- "%1$@ is now labeled “%2$@”" · `cli.vm.rename.set` · `CLI/cmux.swift:6174`
- "Usage: cmux vm rename <id> <new-label>\n       cmux vm rename <id> --clear\n\nThe label is display-only; the machine id stays its address.\nFind an id:\n  cmux vm ls" · `cli.vm.rename.usage` · `CLI/cmux.swift:6156`
- "Grow an existing machine's CPU, memory, or disk; see `cmux vm resize --help`." · `cli.vm.resize.helpDescription` · `CLI/cmux.swift:18213`
- "Usage:\n  cmux vm resize <id> [--cpu <vCPUs>] [--memory <GiB>] [--disk <GiB>]\n\nGrow an existing Cloud VM in place. Specify at least one resource:\nCPU: 1–32 vCPUs. Memory: 1–64 GiB in whole GiB. Disk: 4–256 GiB in 4 GiB steps.\nMemory and disk accept G, GB, or GiB suffixes. Shrinking is not supported.\nThe server enforces plan limits and returns the provider-confirmed resources.\nAdd --json for the structured result." · `cli.vm.resize.usage` · `CLI/CMUXCLI+VMHelp.swift:56`
- "No pool machine is free for %@ — `cmux vm run` would provision a fresh one (add --provision to create it now)." · `cli.vm.route.wouldProvision` · `CLI/CMUXCLI+VMTransfer.swift:1670`
- "vm run: provisioned %1$@ but could not record it in the pool store, so later runs will not reuse it. Use `cmux vm run --machine %1$@` to keep using it or `cmux vm rm %1$@` to remove it." · `cli.vm.run.poolRecordFailed` · `CLI/CMUXCLI+VMTransfer.swift:1400`
- "cmux vm tree --sidebar [list|pin|unpin|up|down|before|after] [node-id] [target-id]\nOrganize this Mac's Cloud sidebar. Use list to find row IDs; before/after require a target in the same group and pin section. Sessions and pane layouts are unchanged." · `cli.vm.sidebar.usage` · `CLI/CMUXCLI+CloudSidebar.swift:5`
- "The machine returned an invalid snapshot list. Reconnect and retry." · `cli.vm.snapshot.invalidList` · `CLI/CMUXCLI+VMSnapshots.swift:43`
- "desktop  (cmux vm open %@:desktop)" · `cli.vm.tree.desktop` · defined but unused
- "(detached — no tab on the machine shows these)" · `cli.vm.tree.detached` · `CLI/CMUXCLI+VMTui.swift:1696`
- "No cloud machines. Try: cmux vm new" · `cli.vm.tree.empty` · `CLI/CMUXCLI+VMTui.swift:1418`
- "link %@" · `cli.vm.tree.link` · `CLI/CMUXCLI+VMTui.swift:1520`
- "asleep — cmux vm open %@ wakes it" · `cli.vm.tree.link.asleep` · `CLI/CMUXCLI+VMTui.swift:1600`
- "⚠ link %@: %@" · `cli.vm.tree.link.error` · `CLI/CMUXCLI+VMTui.swift:1605`
- "retry: cmux vm tree %@ --refresh" · `cli.vm.tree.link.retry` · `CLI/CMUXCLI+VMTui.swift:1610`
- "(open: %@)" · `cli.vm.tree.open` · `CLI/CMUXCLI+VMTui.swift:1798`
- "Usage: cmux vm tree [<machine>|local] [--refresh] [--json]\n       cmux surface ls [<machine>|local] [--refresh] [--json]\n\nThe Finder-style view of every surface: This Mac first (its terminals grouped by\nworkspace, and its browsers), then each cloud machine — Workspaces, Ports, VNC\nDisplays (one row per screen), and a final Terminals section containing every\nmachine-owned terminal. Every line carries an address `cmux vm open` or\n`cmux surface open` accepts.\n\nOptions:\n  <machine>   Only this machine (`local` for This Mac).\n  --refresh   Re-read every provider (machine list, links, local panes) first.\n  --json      Print the catalog payload ({machines, resources, projections})." · `cli.vm.tree.usage` · `CLI/CMUXCLI+VMTui.swift:805`
- "cmux-tui exited with status %1$d. Re-run `cmux vm tui %2$@` to reconnect." · `cli.vm.tui.clientExited` · defined but unused
- "No cmux-tui client found (searched: %1$@). Install one with `curl -fsSL https://cmux.com/tui/install-static.sh | sh`, or point CMUX_TUI_CLIENT at a binary." · `cli.vm.tui.clientMissingSearched` · `CLI/CMUXCLI+VMTui.swift:331`
- "Connecting to %1$@ through cmux-tui…" · `cli.vm.tui.connecting` · `CLI/CMUXCLI+VMTui.swift:583`
- "private network trust" · `cli.vm.tui.mode.carrier` · `CLI/CMUXCLI+VMTui.swift:298`
- "device already enrolled" · `cli.vm.tui.mode.enrolled` · `CLI/CMUXCLI+VMTui.swift:299`
- "Opened cmux-tui for %1$@ (%2$@)" · `cli.vm.tui.opened` · `CLI/CMUXCLI+VMTui.swift:294`
- "The machine's cmux-tui daemon is older than this client; reconnect once the machine has updated." · `cli.vm.tui.staleDaemon` · `CLI/CMUXCLI+VMTui.swift:213`
- "%1$@ is ready (%2$@) after %#@count3@s" · `cli.vm.wait.ready` · `CLI/CMUXCLI+VMTransfer.swift:803`

### cli · vpn

- "Your address on the network: %@" · `cli.vpn.address` · `CLI/CMUXCLI+VPN.swift:71`
- "Bringing the tunnel up (app-managed, no sudo needed)…" · `cli.vpn.appManaged.bringingUp` · `CLI/CMUXCLI+VPNAppManaged.swift:45`
- "This installs the cmux Cloud Tunnel network extension and a macOS VPN configuration named “cmux Cloud”, so every app on this Mac can reach your Cloud VM network. cmux itself does not need it: terminals, Ports, and Desktop use the built-in user-space tunnel. The first time, macOS asks you to allow the extension in System Settings › General › Login Items & Extensions." · `cli.vpn.appManaged.explain` · `CLI/CMUXCLI+VPNAppManaged.swift:40`
- "Pinned up until `cmux vpn down`. Otherwise cmux starts the tunnel when you open a Cloud machine and stops it when no Cloud sessions remain." · `cli.vpn.appManaged.pinned` · `CLI/CMUXCLI+VPNAppManaged.swift:90`
- "Tunnel is down." · `cli.vpn.down` · `CLI/CMUXCLI+VPNAppManaged.swift:102`
- "Tunnel: down (enrolled; run `cmux vpn up`)" · `cli.vpn.status.down` · defined but unused
- "Tunnel: not set up (run `cmux vpn up`)" · `cli.vpn.status.notSetUp` · defined but unused
- "Pinned up by `cmux vpn up`; run `cmux vpn down` to release." · `cli.vpn.status.pinned` · `CLI/CMUXCLI+VPNAppManaged.swift:147`
- "Tunnel: up, but for a different enrollment (run `cmux vpn up` to switch it)" · `cli.vpn.status.stale` · defined but unused
- "Tunnel: unavailable (%@)" · `cli.vpn.status.unavailable` · `CLI/CMUXCLI+VPNAppManaged.swift:115`

### cli · workflow

- "change the CI command" · `cli.workflow.ci-watch.adapt.0` · `CLI/CMUXCLI+DocsSettings.swift:302`
- "replace or add monitor controls" · `cli.workflow.ci-watch.adapt.1` · `CLI/CMUXCLI+DocsSettings.swift:303`
- "adjust control heights" · `cli.workflow.ci-watch.adapt.2` · `CLI/CMUXCLI+DocsSettings.swift:304`
- "use the global Dock file only for personal cross-project controls" · `cli.workflow.ci-watch.adapt.3` · `CLI/CMUXCLI+DocsSettings.swift:305`
- "a GitHub Runs Dock control" · `cli.workflow.ci-watch.creates.0` · `CLI/CMUXCLI+DocsSettings.swift:287`
- "a Feed TUI Dock control" · `cli.workflow.ci-watch.creates.1` · `CLI/CMUXCLI+DocsSettings.swift:288`
- "CI-heavy repositories" · `cli.workflow.ci-watch.fit.0` · `CLI/CMUXCLI+DocsSettings.swift:282`
- "GitHub Actions monitoring" · `cli.workflow.ci-watch.fit.1` · `CLI/CMUXCLI+DocsSettings.swift:283`
- "long-running status views that should stay beside the workspace" · `cli.workflow.ci-watch.fit.2` · `CLI/CMUXCLI+DocsSettings.swift:284`
- "Open the CI Watch recipe, merge the controls into .cmux/dock.json, adapt commands for the repository, validate the JSON, then reload the Dock/config." · `cli.workflow.ci-watch.instantiate.0` · `CLI/CMUXCLI+DocsSettings.swift:299`
- "gh for the sample GitHub Runs control" · `cli.workflow.ci-watch.requires.0` · `CLI/CMUXCLI+DocsSettings.swift:296`
- "Keep long-running CI and Feed monitors in Dock instead of workspace panes." · `cli.workflow.ci-watch.summary` · `CLI/CMUXCLI+DocsSettings.swift:280`
- "use the repository's docs command" · `cli.workflow.docs-workspace.adapt.0` · `CLI/CMUXCLI+DocsSettings.swift:236`
- "point at the primary Markdown file" · `cli.workflow.docs-workspace.adapt.1` · `CLI/CMUXCLI+DocsSettings.swift:237`
- "change the preview path/port" · `cli.workflow.docs-workspace.adapt.2` · `CLI/CMUXCLI+DocsSettings.swift:238`
- "drop panes the docs workflow does not need" · `cli.workflow.docs-workspace.adapt.3` · `CLI/CMUXCLI+DocsSettings.swift:239`
- "a docs-server terminal" · `cli.workflow.docs-workspace.creates.0` · `CLI/CMUXCLI+DocsSettings.swift:218`
- "a cmux Markdown viewer terminal" · `cli.workflow.docs-workspace.creates.1` · `CLI/CMUXCLI+DocsSettings.swift:219`
- "a browser docs preview" · `cli.workflow.docs-workspace.creates.2` · `CLI/CMUXCLI+DocsSettings.swift:220`
- "documentation work" · `cli.workflow.docs-workspace.fit.0` · `CLI/CMUXCLI+DocsSettings.swift:213`
- "docs sites" · `cli.workflow.docs-workspace.fit.1` · `CLI/CMUXCLI+DocsSettings.swift:214`
- "projects with a local docs preview" · `cli.workflow.docs-workspace.fit.2` · `CLI/CMUXCLI+DocsSettings.swift:215`
- "Open the Docs Workspace recipe, replace the docs command, Markdown path, and preview URL, merge it into cmux.json, then run cmux reload-config." · `cli.workflow.docs-workspace.instantiate.0` · `CLI/CMUXCLI+DocsSettings.swift:233`
- "the project's docs-dev command" · `cli.workflow.docs-workspace.requires.0` · `CLI/CMUXCLI+DocsSettings.swift:230`
- "Run documentation tools beside a Markdown view and browser preview." · `cli.workflow.docs-workspace.summary` · `CLI/CMUXCLI+DocsSettings.swift:211`
- "use the repository's package manager and scripts" · `cli.workflow.full-stack-dev.adapt.0` · `CLI/CMUXCLI+DocsSettings.swift:138`
- "change the preview URL/port" · `cli.workflow.full-stack-dev.adapt.1` · `CLI/CMUXCLI+DocsSettings.swift:139`
- "replace lazygit or Feed with project-specific Dock monitors" · `cli.workflow.full-stack-dev.adapt.2` · `CLI/CMUXCLI+DocsSettings.swift:140`
- "a Web terminal" · `cli.workflow.full-stack-dev.creates.0` · `CLI/CMUXCLI+DocsSettings.swift:117`
- "a Tests terminal" · `cli.workflow.full-stack-dev.creates.1` · `CLI/CMUXCLI+DocsSettings.swift:118`
- "a browser preview" · `cli.workflow.full-stack-dev.creates.2` · `CLI/CMUXCLI+DocsSettings.swift:119`
- "optional lazygit and Feed TUI Dock controls" · `cli.workflow.full-stack-dev.creates.3` · `CLI/CMUXCLI+DocsSettings.swift:120`
- "web apps" · `cli.workflow.full-stack-dev.fit.0` · `CLI/CMUXCLI+DocsSettings.swift:112`
- "full-stack repositories" · `cli.workflow.full-stack-dev.fit.1` · `CLI/CMUXCLI+DocsSettings.swift:113`
- "projects with a local dev server and watch tests" · `cli.workflow.full-stack-dev.fit.2` · `CLI/CMUXCLI+DocsSettings.swift:114`
- "Open the Full-Stack Dev recipe, merge the workspace command and optional Dock controls, replace the sample bun commands and preview URL, then run cmux reload-config." · `cli.workflow.full-stack-dev.instantiate.0` · `CLI/CMUXCLI+DocsSettings.swift:135`
- "the project's dev command" · `cli.workflow.full-stack-dev.requires.0` · `CLI/CMUXCLI+DocsSettings.swift:130`
- "the project's watch-test command" · `cli.workflow.full-stack-dev.requires.1` · `CLI/CMUXCLI+DocsSettings.swift:131`
- "optional lazygit" · `cli.workflow.full-stack-dev.requires.2` · `CLI/CMUXCLI+DocsSettings.swift:132`
- "Open a dev server, test watcher, and browser preview, with optional Git and Feed Dock controls." · `cli.workflow.full-stack-dev.summary` · `CLI/CMUXCLI+DocsSettings.swift:110`
- "Replace sample paths, commands, URLs, tool names, and placements with values for this repository." · `cli.workflow.guidance.adapt` · `CLI/CMUXCLI+DocsSettings.swift:63`
- "Pick an example that fits the task and lists requirements you have." · `cli.workflow.guidance.choose` · `CLI/CMUXCLI+DocsSettings.swift:61`
- "Use `cmux docs workflows --json` to choose a shipped workflow example or discover the saved-layout lifecycle." · `cli.workflow.guidance.discover` · `CLI/CMUXCLI+DocsSettings.swift:495`
- "Open the recipe and copy only the needed top-level keys into .cmux/cmux.json or ~/.config/cmux/cmux.json. Add .cmux/dock.json when the example uses Dock." · `cli.workflow.guidance.recipe` · `CLI/CMUXCLI+DocsSettings.swift:62`
- "When the workspace looks right, save it with cmux layout save <name> --description "<what this creates>"." · `cli.workflow.guidance.save` · `CLI/CMUXCLI+DocsSettings.swift:65`
- "Validate the JSON or JSONC, run cmux reload-config, and check the resulting entry point." · `cli.workflow.guidance.validate` · `CLI/CMUXCLI+DocsSettings.swift:64`
- "Delete an old layout" · `cli.workflow.layouts.delete` · `CLI/CMUXCLI+DocsSettings.swift:51`
- "Saved layouts capture a live workspace arrangement. Use an example as a starting point, adapt the workspace, and save the result for reuse." · `cli.workflow.layouts.description` · `CLI/CMUXCLI+DocsSettings.swift:527`
- "Inspect a layout" · `cli.workflow.layouts.inspect` · `CLI/CMUXCLI+DocsSettings.swift:48`
- "List saved layouts" · `cli.workflow.layouts.list` · `CLI/CMUXCLI+DocsSettings.swift:47`
- "Open a layout for this project" · `cli.workflow.layouts.open` · `CLI/CMUXCLI+DocsSettings.swift:49`
- "Save the adapted workspace" · `cli.workflow.layouts.save` · `CLI/CMUXCLI+DocsSettings.swift:50`
- "remove unused agents" · `cli.workflow.quick-agent-buttons.adapt.0` · `CLI/CMUXCLI+DocsSettings.swift:270`
- "change action targets" · `cli.workflow.quick-agent-buttons.adapt.1` · `CLI/CMUXCLI+DocsSettings.swift:271`
- "add or remove built-in tab-bar buttons" · `cli.workflow.quick-agent-buttons.adapt.2` · `CLI/CMUXCLI+DocsSettings.swift:272`
- "rename button labels" · `cli.workflow.quick-agent-buttons.adapt.3` · `CLI/CMUXCLI+DocsSettings.swift:273`
- "Codex and Claude agent actions" · `cli.workflow.quick-agent-buttons.creates.0` · `CLI/CMUXCLI+DocsSettings.swift:253`
- "surface-tab-bar buttons" · `cli.workflow.quick-agent-buttons.creates.1` · `CLI/CMUXCLI+DocsSettings.swift:254`
- "frequent agent launches" · `cli.workflow.quick-agent-buttons.fit.0` · `CLI/CMUXCLI+DocsSettings.swift:248`
- "projects that use multiple coding agents" · `cli.workflow.quick-agent-buttons.fit.1` · `CLI/CMUXCLI+DocsSettings.swift:249`
- "personal agent shortcuts" · `cli.workflow.quick-agent-buttons.fit.2` · `CLI/CMUXCLI+DocsSettings.swift:250`
- "Open the Quick Agent Buttons recipe, keep the agent actions you use, merge actions/ui into cmux.json, then run cmux reload-config." · `cli.workflow.quick-agent-buttons.instantiate.0` · `CLI/CMUXCLI+DocsSettings.swift:267`
- "Command Palette action exposure" · `cli.workflow.quick-agent-buttons.primitives.2` · `CLI/CMUXCLI+DocsSettings.swift:261`
- "the agent binaries you keep in the recipe" · `cli.workflow.quick-agent-buttons.requires.0` · `CLI/CMUXCLI+DocsSettings.swift:264`
- "Put Codex and Claude launch actions on the tab bar and in Command Palette." · `cli.workflow.quick-agent-buttons.summary` · `CLI/CMUXCLI+DocsSettings.swift:246`
- "replace gh pr status with the team's review command" · `cli.workflow.review-pr.adapt.0` · `CLI/CMUXCLI+DocsSettings.swift:202`
- "use a specific PR URL" · `cli.workflow.review-pr.adapt.1` · `CLI/CMUXCLI+DocsSettings.swift:203`
- "add a notes or diff pane when useful" · `cli.workflow.review-pr.adapt.2` · `CLI/CMUXCLI+DocsSettings.swift:204`
- "a terminal running gh pr status" · `cli.workflow.review-pr.creates.0` · `CLI/CMUXCLI+DocsSettings.swift:186`
- "a browser pane on the repository pull-request page" · `cli.workflow.review-pr.creates.1` · `CLI/CMUXCLI+DocsSettings.swift:187`
- "pull-request review" · `cli.workflow.review-pr.fit.0` · `CLI/CMUXCLI+DocsSettings.swift:181`
- "GitHub-hosted repositories" · `cli.workflow.review-pr.fit.1` · `CLI/CMUXCLI+DocsSettings.swift:182`
- "tasks that combine gh output with browser review" · `cli.workflow.review-pr.fit.2` · `CLI/CMUXCLI+DocsSettings.swift:183`
- "Open the Review PR recipe, point its command and URL at the repository's review flow, merge it into cmux.json, then run cmux reload-config." · `cli.workflow.review-pr.instantiate.0` · `CLI/CMUXCLI+DocsSettings.swift:199`
- "gh for the sample terminal command" · `cli.workflow.review-pr.requires.0` · `CLI/CMUXCLI+DocsSettings.swift:196`
- "Keep pull-request commands beside the browser review page." · `cli.workflow.review-pr.summary` · `CLI/CMUXCLI+DocsSettings.swift:179`
- "change the SSH host/command" · `cli.workflow.ssh-devbox.adapt.0` · `CLI/CMUXCLI+DocsSettings.swift:170`
- "change the preview URL" · `cli.workflow.ssh-devbox.adapt.1` · `CLI/CMUXCLI+DocsSettings.swift:171`
- "add local notes, logs, or another remote pane" · `cli.workflow.ssh-devbox.adapt.2` · `CLI/CMUXCLI+DocsSettings.swift:172`
- "an SSH terminal pane" · `cli.workflow.ssh-devbox.creates.0` · `CLI/CMUXCLI+DocsSettings.swift:154`
- "a browser preview pane" · `cli.workflow.ssh-devbox.creates.1` · `CLI/CMUXCLI+DocsSettings.swift:155`
- "remote development" · `cli.workflow.ssh-devbox.fit.0` · `CLI/CMUXCLI+DocsSettings.swift:149`
- "SSH-backed devboxes" · `cli.workflow.ssh-devbox.fit.1` · `CLI/CMUXCLI+DocsSettings.swift:150`
- "projects developed on another machine" · `cli.workflow.ssh-devbox.fit.2` · `CLI/CMUXCLI+DocsSettings.swift:151`
- "Open the SSH Devbox recipe, replace ssh devbox and the preview URL for the project, merge the command into cmux.json, then run cmux reload-config." · `cli.workflow.ssh-devbox.instantiate.0` · `CLI/CMUXCLI+DocsSettings.swift:167`
- "a working ssh target or alias" · `cli.workflow.ssh-devbox.requires.0` · `CLI/CMUXCLI+DocsSettings.swift:164`
- "Pair a remote shell with a browser preview in one workspace." · `cli.workflow.ssh-devbox.summary` · `CLI/CMUXCLI+DocsSettings.swift:147`
- "Saved layouts plus shipped customization examples for common project workflows." · `cli.workflow.topic.summary` · `CLI/CMUXCLI+DocsSettings.swift:404`
- "Start a worktree with two coding-agent terminals and optional context-menu actions." · `cli.workflow.worktree-agents.summary` · `CLI/CMUXCLI+DocsSettings.swift:72`

### cli · workspace

- "%@: --env-file requires <path>" · `cli.workspace.create.error.envFileRequiresValue` · `CLI/CMUXCLI+TerminalCreation.swift:42`
- "%@: --env requires KEY=VALUE" · `cli.workspace.create.error.envRequiresValue` · `CLI/CMUXCLI+TerminalCreation.swift:32`
- "No environment variables" · `cli.workspace.env.empty` · `CLI/cmux.swift:10396`
- "%@: %@ entry '%@' has an empty key" · `cli.workspace.env.error.emptyKey` · `CLI/cmux.swift:10299`
- "%@: %@ entry '%@' must be in KEY=VALUE form" · `cli.workspace.env.error.invalidAssignment` · `CLI/cmux.swift:10285`
- "%@: could not read --env-file '%@': %@" · `cli.workspace.envFile.error.readFailed` · `CLI/cmux.swift:10248`
- "Usage: cmux workspace status [set <lane|auto> | cycle] [--workspace <id|ref|index>] [--window <id|ref|index>] [--json]\n\nShow or pin a workspace's todo lifecycle status. Without arguments prints\nthe effective status, the inferred status, and the override, targeting the\ncaller's workspace by default.\n\nLanes are inferred from live signals (agent needs input > agent running >\nopen PR > all PRs merged/closed > dirty git tree > todo). `set <lane>`\npins a manual lane that auto-clears as soon as the inferred lane changes;\n`set auto` clears the pin immediately. `cycle` advances the manual override\none lane forward (todo → working → needs-attention → review → done → todo).\n\nNote for coding agents: manual status pins belong to the user; the lane\nalready tracks your activity automatically. Do not `set` or `cycle` the\nstatus unless the user explicitly asks you to.\n\nLanes: todo, working, needs-attention, review, done\n\nExamples:\n  cmux workspace status\n  cmux workspace status set review\n  cmux workspace status cycle\n  cmux workspace status set auto --workspace workspace:2" · `cli.workspace.status.usage` · `CLI/CMUXCLI+WorkspaceTodo.swift:324`
- "Usage: cmux workspace <subcommand> [flags]\n\nCanonical noun for workspace operations. Legacy verbs\n(new-workspace, list-workspaces, close-workspace,\nrename-workspace, select-workspace) keep working and print a\none-time deprecation hint pointing here.\n\nSubcommands:\n  list                    List workspaces in a window\n  create [flags]          Create a workspace (same flags as new-workspace)\n  env [workspace] [--mask]\n                          Print a workspace's configured environment\n                          variables (--mask redacts the values)\n  close <workspace>       Close a workspace\n  rename <workspace> --title <new>\n  select <workspace>      Make a workspace active\n  status [set <lane|auto>]\n                          Show or pin the workspace todo status\n  reconnect [workspace]   Reconnect a remote (SSH) workspace, including one\n                          whose automatic reconnect paused because the host\n                          was unreachable\n  disconnect [workspace]  Stop a remote (SSH) workspace's connection\n  loading <on|off> [--id <name>] Toggle the workspace loading spinner.\n  group <subcommand>      Workspace group operations (see cmux workspace-group --help)\nenv/reconnect/disconnect accept a positional handle or --workspace\n<id|ref|index>, defaulting to the caller's workspace, then the\nselected one (of --window's window when given).\nExamples:\n  cmux workspace list --json\n  cmux workspace create --name Build --cwd ~/projects/myapp\n  cmux workspace env workspace:3 --mask\n  cmux workspace close workspace:3\n  cmux workspace reconnect\n  cmux workspace disconnect --workspace workspace:3" · `cli.workspace.usage` · `CLI/CMUXCLI+WorkspaceTodo.swift:287`

### cli · workspaceAction

- "Mobile Pairing is unavailable" · `cli.workspaceAction.tailscalePairingUnavailable` · `Sources/TerminalController.swift:4921`

### cli · workspaceGroup

- "Manage collapsible workspace groups in the sidebar. Each group is owned by an "anchor" workspace; the group header IS the anchor's sidebar representation. Closing the anchor closes only that workspace and promotes the group's next member to be the new anchor, so the group and its other members stay intact. When the anchor is the group's only workspace, the group is removed." · `cli.workspaceGroup.help.overview` · `CLI/cmux.swift:19045`
- "[one] OK group deleted (closed %lld workspace) / [other] OK group deleted (closed %lld workspaces)" · `cli.workspaceGroup.response.closed.other` · `CLI/cmux.swift:10978`
- "[one] OK group dissolved (kept %lld workspace) / [other] OK group dissolved (kept %lld workspaces)" · `cli.workspaceGroup.response.dissolved.other` · `CLI/cmux.swift:10972`

### cli · workspaceLoading

- "Usage: cmux workspace loading <on|off> [--id <name>] [--workspace <id>] [--window <id>] [--json]" · `cli.workspaceLoading.usage` · `CLI/WorkspaceLoadingArguments.swift:24`

## settings

### settings · account

- "Open in Browser" · `settings.account.signIn.openInBrowser` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Account/AccountIdentityCard.swift:72`

### settings · app

- "Spacing between panes in the canvas layout, in points. Snapping, tidy, and new-pane placement all use this one gap." · `settings.app.canvasPaneGap.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:483`
- "Snap pane drags and resizes to neighbor edges and the pane gap. Hold Command to suspend snapping for one gesture." · `settings.app.canvasSnapping.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:507`
- "When the focused surface is the last one in its workspace, closing it with the close-surface shortcut, tab close button, or middle-click also closes the workspace." · `settings.app.closeWorkspaceOnLastSurfaceShortcut.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:307`
- "When the focused surface is the last one in its workspace, closing it with the close-surface shortcut, tab close button, or middle-click closes only the surface and keeps the workspace open. Use the close-workspace shortcut to close the workspace explicitly." · `settings.app.closeWorkspaceOnLastSurfaceShortcut.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:306`
- "Cmd+P matches workspace rows only." · `settings.app.commandPaletteSearchAllSurfaces.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:908`
- "Cmd+P also matches terminal, browser, and markdown surfaces across workspaces." · `settings.app.commandPaletteSearchAllSurfaces.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:907`
- "Open the cmux terminal config and generated preview in one utility window." · `settings.app.configWindow.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:396`
- "Show a confirmation only when a workspace needs close confirmation." · `settings.app.confirmQuit.subtitleDirtyOnly` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection+DisplayText.swift:75`
- "cmux handles SSH links, .command/.tool files, and UNIX executables." · `settings.app.defaultTerminal.subtitleDefault` · defined but unused
- "Set cmux as the handler for SSH links, .command/.tool files, and UNIX executables." · `settings.app.defaultTerminal.subtitleNotDefault` · defined but unused
- "macOS may ask you to confirm this change." · `settings.app.defaultTerminal.subtitleSetting` · defined but unused
- "Show unread count on app icon (Dock and Cmd+Tab)." · `settings.app.dockBadge.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:643`
- "Keep action buttons always visible." · `settings.app.fadeButtons.subtitleOff` · defined but unused
- "Show action buttons only on hover." · `settings.app.fadeButtons.subtitleOn` · defined but unused
- "Dragging files opens previews or split panes. Hold Shift over terminals and editors to insert path text." · `settings.app.fileDrop.defaultBehavior.preview.subtitle` · `Sources/DragOverlayRoutingPolicy.swift:53`
- "Over terminals and editors, dragging files inserts shell-escaped paths. Hold Shift to open a file preview or split." · `settings.app.fileDrop.defaultBehavior.text.subtitle` · `Sources/DragOverlayRoutingPolicy.swift:48`
- "Highlight the line that contains the caret when nothing is selected." · `settings.app.fileEditorCurrentLineHighlight.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:584`
- "Draw vertical guides at indent columns in the built-in file editor." · `settings.app.fileEditorIndentGuides.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:572`
- "Show a line-number gutter beside the built-in file editor." · `settings.app.fileEditorLineNumbers.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:560`
- "Color keywords, strings, and other tokens in the built-in file editor." · `settings.app.fileEditorSyntaxHighlighting.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:548`
- "Wrap long lines at the editor's right edge instead of scrolling horizontally. Applies to the plain-text file editor." · `settings.app.fileEditorWordWrap.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:536`
- "Back and forward navigate between workspaces only." · `settings.app.focusHistoryIncludesPanesAndTabs.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:335`
- "Back and forward navigate focus changes between panes, tabs, and workspaces." · `settings.app.focusHistoryIncludesPanesAndTabs.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:334`
- "Scale every font in cmux by the same percentage. 100% = design size." · `settings.app.globalFontMagnification.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:185`
- "Terminals, tabs, and chrome all render at this magnification. Per-pane zoom (⌘= / ⌘-) still overrides for the focused pane." · `settings.app.globalFontMagnification.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:180`
- "Show secondary workspace details as controlled by the toggles below." · `settings.app.hideAllSidebarDetails.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection.swift:266`
- "Show only the workspace title row. Overrides the detail toggles below." · `settings.app.hideAllSidebarDetails.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection.swift:265`
- "Tab close buttons appear on hover and on the active tab." · `settings.app.hideTabCloseButton.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:880`
- "Tab close buttons are hidden." · `settings.app.hideTabCloseButton.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:879`
- "Move a workspace to the top and show the submitted message when you send an agent prompt." · `settings.app.iMessageMode.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:619`
- "Reorder whole group sections by their most-recent unread member when iMessage mode is on." · `settings.app.imessageFloatGroups.subtitle` · defined but unused
- "When iMessage mode floats unread workspaces to the top, sort members within each group while the group section stays put." · `settings.app.imessageSortInsideGroups.subtitle` · defined but unused
- "Restart cmux to apply" · `settings.app.language.restartSubtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:202`
- "Show the spinner on the left (sharing the unread badge slot) or the right of the workspace row." · `settings.app.loadingSpinnerPosition.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection+AgentActivity.swift:21`
- "Review items stay visible as plain text, and clicks in that area select the workspace row." · `settings.app.makeSidebarPullRequestClickable.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection.swift:432`
- "Default body font family for newly opened markdown viewers. Leave empty for the system markdown font stack." · `settings.app.markdownFontFamily.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:520`
- "Default body font size, in points, for newly opened markdown viewers. Zoom a viewer live with Cmd-+ / Cmd-- / Cmd-0." · `settings.app.markdownFontSize.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:436`
- "Default maximum reading column width, in CSS pixels, for newly opened markdown viewers." · `settings.app.markdownMaxWidth.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:459`
- "Hide the Dock icon and Cmd+Tab entry. Use the menu bar item to show cmux." · `settings.app.menuBarOnly.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:655`
- "Use the standard workspace title bar and controls." · `settings.app.minimalMode.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:287`
- "Hide the workspace title bar and move workspace controls into the sidebar." · `settings.app.minimalMode.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:286`
- "Show the unread notification badge on the left or the right of the workspace row." · `settings.app.notificationBadgePosition.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection+AgentActivity.swift:41`
- "Maximum lines shown for the latest notification below each workspace title." · `settings.app.notificationMessageLineLimit.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection+NotificationPreview.swift:9`
- "Cmd-clicking Markdown files opens the rendered cmux markdown viewer instead of the generic file preview." · `settings.app.openMarkdownInCmuxViewer.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:424`
- "Enable sidebar PR clickability to choose where PR links open." · `settings.app.openSidebarPRLinks.subtitleDisabled` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection.swift:536`
- "Enable sidebar PR visibility to choose where PR links open." · `settings.app.openSidebarPRLinks.subtitleHidden` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection.swift:533`
- "Clicks open in your default browser." · `settings.app.openSidebarPRLinks.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection.swift:540`
- "Clicks open inside cmux browser." · `settings.app.openSidebarPRLinks.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection.swift:539`
- "Port clicks open in your default browser." · `settings.app.openSidebarPortLinks.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection.swift:459`
- "Port clicks open inside cmux browser." · `settings.app.openSidebarPortLinks.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection.swift:458`
- "Cmd-clicking readable files opens text, code, PDFs, images, audio, video, and Quick Look previews in cmux." · `settings.app.openSupportedFilesInCmux.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:383`
- "When cmux is inactive, the first click only activates the window. Click again to focus the pane." · `settings.app.paneFirstClickFocus.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:321`
- "When cmux is inactive, clicking a pane activates the window and focuses that pane in one click." · `settings.app.paneFirstClickFocus.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:320`
- "Render full paths abbreviated with ~/." · `settings.app.pathLastSegmentOnly.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection.swift:369`
- "Show as much of the trailing path as fits; shorter forms are prefixed with …/." · `settings.app.pathLastSegmentOnly.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection.swift:368`
- "Command used when Cmd-click file previews are disabled or a file is unsupported. Leave empty for system default." · `settings.app.preferredEditor.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:368`
- "Command Palette rename keeps the caret at the end." · `settings.app.renameSelectsName.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:894`
- "Command Palette rename starts with all text selected." · `settings.app.renameSelectsName.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:893`
- "Move workspaces to the top when they receive a notification. Disable for stable shortcut positions." · `settings.app.reorderOnNotification.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:631`
- "Show a loading spinner on workspaces with running coding agents or active loaders. Stays visible even when sidebar details are hidden." · `settings.app.showAgentActivity.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection+AgentActivity.swift:10`
- "Display the built-in git branch and working-directory row." · `settings.app.showBranchDirectory.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection.swift:396`
- "Keep cmux in the menu bar for unread notifications and quick actions." · `settings.app.showInMenuBar.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:672`
- "Display the latest imperative log/status message." · `settings.app.showLog.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection.swift:495`
- "Display custom metadata from report_meta/set_status and report_meta_block." · `settings.app.showMetadata.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection.swift:521`
- "Display the latest notification message below the workspace title." · `settings.app.showNotificationMessage.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection.swift:381`
- "Display detected listening ports for the active workspace." · `settings.app.showPorts.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection.swift:483`
- "Display the built-in progress bar from set_progress." · `settings.app.showProgress.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection.swift:507`
- "Display review items (PR/MR/etc.) with status and number." · `settings.app.showPullRequests.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection.swift:408`
- "Display review items (PR/MR/etc.) with status and number." · `settings.app.showPullRequests.subtitle.basic` · defined but unused
- "Display the SSH target for remote workspaces in its own row." · `settings.app.showSSH.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection.swift:471`
- "Display custom workspace descriptions below the workspace title." · `settings.app.showWorkspaceDescription.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection.swift:290`
- "Hide the folder and active title above pane tabs." · `settings.app.showWorkspaceTitlebar.subtitleOff` · defined but unused
- "Show the folder and active title above pane tabs." · `settings.app.showWorkspaceTitlebar.subtitleOn` · defined but unused
- "Vertical: each branch appears on its own line." · `settings.app.sidebarBranchLayout.subtitleVertical` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection.swift:336`
- "Branch and directory share a single line." · `settings.app.stackBranchDirectory.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection.swift:355`
- "Branch and directory render on separate lines." · `settings.app.stackBranchDirectory.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection.swift:354`
- "Tabs close immediately without confirmation." · `settings.app.warnBeforeClosingTab.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:853`
- "Show a confirmation before closing a tab." · `settings.app.warnBeforeClosingTab.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:852`
- "Tab close buttons are hidden, so this warning is inactive." · `settings.app.warnBeforeClosingTabXButton.subtitleHidden` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection+DisplayText.swift:85`
- "The tab close button closes tabs immediately." · `settings.app.warnBeforeClosingTabXButton.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection+DisplayText.swift:96`
- "The tab close button asks for confirmation before closing." · `settings.app.warnBeforeClosingTabXButton.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection+DisplayText.swift:91`
- "Cmd+Q quits immediately without confirmation." · `settings.app.warnBeforeQuit.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection+DisplayText.swift:76`
- "Show a confirmation before quitting with Cmd+Q." · `settings.app.warnBeforeQuit.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection+DisplayText.swift:74`
- "Update sidebar branch and PR metadata from repository file changes without polling git." · `settings.app.watchGitStatus.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection.swift:420`
- "New workspaces use Ghostty's working-directory setting instead." · `settings.app.workspaceInheritWorkingDirectory.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:272`
- "New workspaces start in the focused workspace's working directory." · `settings.app.workspaceInheritWorkingDirectory.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:271`
- "Edit the saved layouts offered in the new-workspace menu." · `settings.app.workspaceLayouts.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:255`
- "Workspace titles stay on one line and truncate at the end." · `settings.app.wrapWorkspaceTitles.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection.swift:279`
- "Long workspace titles can use as many lines as they need." · `settings.app.wrapWorkspaceTitles.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection.swift:278`

### settings · automation

- "cmux installs and refreshes Amp hooks automatically in cmux terminals. They no-op outside cmux terminals. When disabled, the installed Amp plugin stays inactive without needing to be removed." · `settings.automation.amp.note` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AutomationSection.swift:512`
- "Amp runs without cmux integration." · `settings.automation.amp.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AutomationSection.swift:504`
- "Sidebar shows Amp agent status and notifications." · `settings.automation.amp.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AutomationSection.swift:503`
- "Each session is named by its own agent." · `settings.automation.autoNamingAgent.requirement.auto` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Values/AutoNamingAgentDisplay.swift:12`
- "%@ names every session. Requires its CLI on your PATH; if it can't produce a name, existing names are left unchanged." · `settings.automation.autoNamingAgent.requirement.supported` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Values/AutoNamingAgentDisplay.swift:19`
- "%@ can't generate names yet, so cmux uses each session's own agent." · `settings.automation.autoNamingAgent.requirement.unsupported` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Values/AutoNamingAgentDisplay.swift:24`
- "%@ couldn't generate a name — it may be rate-limited, out of tokens, or signed out. Existing names are left unchanged." · `settings.automation.autoNamingAgent.status.failed` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Values/AutoNamingAgentDisplay.swift:36`
- "e.g. /usr/local/bin/claude" · `settings.automation.claudeCode.customPath.placeholder` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AutomationSection.swift:384`
- "Custom path to the claude binary. Leave empty to use PATH." · `settings.automation.claudeCode.customPath.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AutomationSection.swift:381`
- "When enabled, cmux wraps the claude command to inject session tracking and notification hooks. Disable if you prefer to manage Claude Code hooks yourself." · `settings.automation.claudeCode.note` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AutomationSection.swift:353`
- "Claude Code runs without cmux integration." · `settings.automation.claudeCode.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AutomationSection.swift:345`
- "Sidebar shows Claude session status and notifications." · `settings.automation.claudeCode.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AutomationSection.swift:344`
- "When enabled, cmux wraps the codex command to inject session tracking and notification hooks. Disable if you prefer to manage Codex hooks yourself. cmux still tracks live Codex sessions it can observe even when this is off. To also track Codex launched through a custom launcher that bypasses the wrapper (e.g. a subrouter), run `cmux hooks setup --agent codex`, which installs hooks into ~/.codex/hooks.json." · `settings.automation.codex.note` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AutomationSection.swift:372`
- "Codex runs without cmux integration." · `settings.automation.codex.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AutomationSection.swift:364`
- "Sidebar shows Codex session status and notifications." · `settings.automation.codex.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AutomationSection.swift:363`
- "Hooks must be installed with `cmux hooks cursor install`. They no-op outside cmux terminals." · `settings.automation.cursor.note` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AutomationSection.swift:532`
- "Cursor runs without cmux integration." · `settings.automation.cursor.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AutomationSection.swift:524`
- "Sidebar shows Cursor agent status and notifications." · `settings.automation.cursor.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AutomationSection.swift:523`
- "Hooks must be installed with `cmux hooks gemini install`. They no-op outside cmux terminals." · `settings.automation.gemini.note` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AutomationSection.swift:552`
- "Gemini runs without cmux integration." · `settings.automation.gemini.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AutomationSection.swift:544`
- "Sidebar shows Gemini session status and notifications." · `settings.automation.gemini.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AutomationSection.swift:543`
- "Hooks must be installed with `cmux hooks kiro install`, then run Kiro with `kiro-cli chat --agent cmux` (or set it as your default agent). They no-op outside cmux terminals." · `settings.automation.kiro.note` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AutomationSection.swift:588`
- "Kiro runs without cmux integration." · `settings.automation.kiro.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AutomationSection.swift:564`
- "Sidebar shows Kiro session status, notifications, and Feed tool events." · `settings.automation.kiro.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AutomationSection.swift:563`
- "e.g. /etc/profiles/per-user/you/bin/rg" · `settings.automation.ripgrep.customPath.placeholder` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AutomationSection.swift:469`
- "Custom path to the rg binary used by Find. Leave empty to use common install locations and PATH." · `settings.automation.ripgrep.customPath.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AutomationSection.swift:466`
- "Controls access to the local Unix socket for programmatic control. Choose a mode that matches your threat model." · `settings.automation.socketMode.note` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AutomationSection.swift:282`
- "Failed to clear password (%@)." · `settings.automation.socketPassword.clearFailed` · defined but unused
- "Password cleared." · `settings.automation.socketPassword.cleared` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AutomationSection.swift:642`
- "Enter a password first." · `settings.automation.socketPassword.empty` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AutomationSection.swift:625`
- "Enter a password first." · `settings.automation.socketPassword.enterFirst` · defined but unused
- "Failed to save password (%@)." · `settings.automation.socketPassword.saveFailed` · defined but unused
- "Password saved." · `settings.automation.socketPassword.saved` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AutomationSection.swift:633`
- "Uses process ancestry from hook processes. Disable if nested Codex or Claude sessions should trigger completion notifications." · `settings.automation.suppressSubagentNotifications.note` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AutomationSection.swift:493`
- "Child agent completions notify like top-level agents." · `settings.automation.suppressSubagentNotifications.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AutomationSection.swift:485`
- "Child agent completions stay in Feed without notifications." · `settings.automation.suppressSubagentNotifications.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AutomationSection.swift:484`
- "Claude Code Integration is off, so Claude sessions will not be auto-named. Other supported agents still name when their cmux hooks are installed." · `settings.automation.workspaceAutoNaming.hooksOffWarning` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AutomationSection.swift:439`
- "When enabled, cmux summarizes supported agent sessions into short workspace and tab names using each agent's own binary, refreshed as the topic shifts. Manual renames always win and stop auto-naming for that workspace or tab. Uses your agent account for the short summarization calls." · `settings.automation.workspaceAutoNaming.note` · `Sources/SettingsSearchIndex.swift:152`
- "Workspace and tab names are never generated." · `settings.automation.workspaceAutoNaming.subtitleOff` · `Sources/SettingsSearchIndex.swift:151`
- "Workspaces and tabs are named from agent conversations." · `settings.automation.workspaceAutoNaming.subtitleOn` · `Sources/SettingsSearchIndex.swift:150`

### settings · betaFeatures

- "Hides every Cloud Machines surface, and keeps the Cloud tunnel and fleet polling off, until you enable it here." · `settings.betaFeatures.cloudMachines.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BetaFeaturesSection.swift:171`
- "Shows Cloud in the right sidebar plus the Cloud Machines settings, palette commands, and new-workspace entries." · `settings.betaFeatures.cloudMachines.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BetaFeaturesSection.swift:170`
- "Hides custom sidebars from the sidebar picker until you enable them here." · `settings.betaFeatures.customSidebars.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BetaFeaturesSection.swift:210`
- "Lists your sidebars from ~/.config/cmux/sidebars in the sidebar picker, rendered in an isolated helper process." · `settings.betaFeatures.customSidebars.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BetaFeaturesSection.swift:209`
- "Hides Dock from the right sidebar until you enable it here." · `settings.betaFeatures.dock.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BetaFeaturesSection.swift:152`
- "Shows Dock in the right sidebar mode switcher for custom terminal controls." · `settings.betaFeatures.dock.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BetaFeaturesSection.swift:151`
- "Hides all extension UI until you enable it here." · `settings.betaFeatures.extensions.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BetaFeaturesSection.swift:191`
- "Shows the puzzle button, the sidebar-toggle extension menu, and lets you install and host sidebar extensions." · `settings.betaFeatures.extensions.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BetaFeaturesSection.swift:190`
- "Hides Feed from the right sidebar until you enable it here." · `settings.betaFeatures.feed.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BetaFeaturesSection.swift:135`
- "Shows Feed in the right sidebar mode switcher for inline agent decisions." · `settings.betaFeatures.feed.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BetaFeaturesSection.swift:134`
- "Hides remote tmux mirroring until you enable it here." · `settings.betaFeatures.remoteTmux.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BetaFeaturesSection.swift:228`
- "Mirrors a remote host's tmux sessions in the sidebar over ssh tmux -CC; sessions become workspaces and windows become tabs. Quitting cmux leaves the remote tmux server running." · `settings.betaFeatures.remoteTmux.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BetaFeaturesSection.swift:227`
- "Shows Add Checklist Item and workspace status controls." · `settings.betaFeatures.workspaceTodoControls.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BetaFeaturesSection.swift:93`
- "Clicking a row's checklist summary expands the items inline under the row." · `settings.betaFeatures.workspaceTodosChecklistStyle.subtitleInline` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BetaFeaturesSection.swift:111`
- "Clicking a row's checklist summary opens an anchored popover." · `settings.betaFeatures.workspaceTodosChecklistStyle.subtitlePopover` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BetaFeaturesSection.swift:110`

### settings · browser

- "When off, browser downloads save directly to Downloads without a save panel." · `settings.browser.askWhereToSaveDownloads.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BrowserSection.swift:299`
- "Unpacked extension directories loaded into Chromium browser panes. One absolute path per line; each directory must contain a manifest.json. Applies when the next pane starts." · `settings.browser.chromiumExtensions.subtitle` · defined but unused
- "Shown in browser address bar search suggestions." · `settings.browser.customSearchEngineName.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BrowserSection.swift:181`
- "Use {query} or %s for the search terms. Without a placeholder, cmux appends q=." · `settings.browser.customSearchEngineURLTemplate.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BrowserSection.swift:191`
- "Zoom applied to newly opened browser pages. Zoom In, Zoom Out, and Actual Size still adjust each page." · `settings.browser.defaultZoomLevel.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BrowserSection.swift:232`
- "Browser tabs, terminal link clicks, and intercepted open commands can use the embedded browser." · `settings.browser.enabled.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BrowserSection.swift:143`
- "New browser panes use Chromium when your default browser is Chromium-based (Chrome, Edge, Brave, Arc…), otherwise WebKit." · `settings.browser.engine.subtitle.auto` · defined but unused
- "Use a managed out-of-process Chromium runtime for new browser panes." · `settings.browser.engine.subtitle.chromium` · defined but unused
- "Use the built-in WebKit engine for new browser panes." · `settings.browser.engine.subtitle.webkit` · defined but unused
- "Applies to browser-page link clicks, terminal link clicks, and intercepted `open https://...` calls. One rule per line. Plain text matches any URL substring; regex-shaped rules and `*`/`?` wildcards are supported (for example: example.com, *example.com*, .*example\.com.*). Regex rules containing `*` or `?` must use the `re:` prefix; legacy `.*`/`.+` rules remain supported." · `settings.browser.externalPatterns.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BrowserSection.swift:344`
- "[one] %lldm / [other] %lldm" · `settings.browser.hiddenWebViewDiscardDelay.minutes` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BrowserSection.swift:832`
- "%#@count1@m %#@count2@s" · `settings.browser.hiddenWebViewDiscardDelay.minutesSeconds` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BrowserSection.swift:835`
- "[one] %llds / [other] %llds" · `settings.browser.hiddenWebViewDiscardDelay.seconds` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BrowserSection.swift:828`
- "How long a browser tab must stay hidden before cmux frees its page memory. Active downloads, popups, developer tools, fullscreen, and loading pages are skipped." · `settings.browser.hiddenWebViewDiscardDelay.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BrowserSection.swift:274`
- "No saved pages yet." · `settings.browser.history.subtitleEmpty` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BrowserSection.swift:807`
- "Checking browsing history..." · `settings.browser.history.subtitleLoading` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BrowserSection.swift:805`
- "[one] %lld saved page appears in omnibar suggestions. / [other] %lld saved pages appear in omnibar suggestions." · `settings.browser.history.subtitleMany` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BrowserSection.swift:811`
- "1 saved page appears in omnibar suggestions." · `settings.browser.history.subtitleOne` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BrowserSection.swift:809`
- "Applies to terminal link clicks and intercepted `open https://...` calls. Only these hosts open in cmux. Others open in your default browser. One host or wildcard per line (for example: example.com, *.internal.example). Leave empty to open all hosts in cmux." · `settings.browser.hostWhitelist.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BrowserSection.swift:336`
- "Controls which HTTP (non-HTTPS) hosts can open in cmux without a warning prompt. Defaults include localhost, *.localhost, 127.0.0.1, ::1, 0.0.0.0, and *.localtest.me. Remove entries to block them; reset to restore defaults." · `settings.browser.httpAllowlist.description` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BrowserSection.swift:434`
- "One host or wildcard per line. Remove entries to block them." · `settings.browser.httpAllowlist.hint` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BrowserSection.swift:452`
- "The blank-tab import hint is hidden. Turn it back on here any time." · `settings.browser.import.hint.note.hidden` · defined but unused
- "Blank tabs are currently using Settings only mode from the debug window." · `settings.browser.import.hint.note.settingsOnly` · defined but unused
- "Blank browser tabs can show this import suggestion. Hide or re-enable it here." · `settings.browser.import.hint.note.visible` · defined but unused
- "Shown until you import or dismiss it on a blank tab." · `settings.browser.import.hint.settingsNote` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BrowserSection.swift:746`
- "When off, `open https://...` and `open http://...` always use your default browser." · `settings.browser.interceptOpen.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BrowserSection.swift:324`
- "Pinned npm version of react-grab injected by the toolbar button (Cmd+Shift+G). Only versions with a known integrity hash are accepted." · `settings.browser.reactGrabVersion.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BrowserSection.swift:376`
- "Off by default. Chromium panes still use private CDP internally; no external endpoint is exposed." · `settings.browser.remoteDebuggingPort.subtitleOff` · defined but unused
- "New panes request http://127.0.0.1:%lld. If busy, cmux chooses another loopback port; CLI JSON reports the actual Playwright endpoint." · `settings.browser.remoteDebuggingPort.subtitleOn` · defined but unused
- "Used by the browser address bar when input is not a URL." · `settings.browser.searchEngine.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BrowserSection.swift:163`
- "Restricts embedded-browser navigation to matching hosts or URL patterns. A suggested localhost list is shown; saving it opts into the restriction. Remove entries to block them, or, when no managed policy applies, clear the list to allow all web origins. Invalid-only values fail closed. Internal cmux documents remain available." · `settings.browser.urlAllowlist.description` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BrowserSection.swift:538`
- "One rule per line: localhost, *.localhost, example.com, https://git.example.com, or http://localhost:3000. Remove entries to block them." · `settings.browser.urlAllowlist.hint` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BrowserSection.swift:649`
- "One or more rules are invalid. Invalid-only values fail closed; use a host or HTTP(S) URL pattern." · `settings.browser.urlAllowlist.invalidRule` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/BrowserSection.swift:664`

### settings · cloudMachines

- "%1$@ · %2$d of %#@count3@" · `settings.cloudMachines.plan.summary` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/CloudMachinesSection.swift:99`
- "%1$@ · %#@count2@, no limit" · `settings.cloudMachines.plan.summary.unlimited` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/CloudMachinesSection.swift:93`

### settings · computerUse

- "New agent launches start without the computer-use tools, including in terminals that are already open." · `settings.computerUse.enabled.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/ComputerUseSection.swift:68`
- "Supported agent sessions can see and drive apps on this Mac." · `settings.computerUse.enabled.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/ComputerUseSection.swift:67`
- "Show live agent sessions and shortcuts to their terminal and driven app." · `settings.computerUse.showInMenuBar.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/ComputerUseSection.swift:97`

### settings · config

- "Open Active Config…" · `settings.config.action.openActiveEditor` · `Sources/Settings/ConfigSettingsView.swift:162`
- "Reveal Active Config in Finder" · `settings.config.action.revealActiveFinder` · `Sources/Settings/ConfigSettingsView.swift:172`
- "This is a generated preview of the effective config. No base Ghostty config file was found, so only cmux overrides are shown." · `settings.config.banner.syncedNoGhostty` · `Sources/Settings/ConfigSettingsView.swift:39`
- "Couldn't open the cmux config." · `settings.config.status.openFailed` · `Sources/Settings/ConfigSettingsView.swift:312`
- "Reloaded configuration from disk." · `settings.config.status.reloaded` · `Sources/Settings/ConfigSettingsView.swift:212`

### settings · customSidebars

- "Hides custom sidebars from the sidebar picker until you enable them here." · `settings.customSidebars.enabled.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/CustomSidebarsSection.swift:80`
- "Lists your sidebars from ~/.config/cmux/sidebars in the sidebar picker." · `settings.customSidebars.enabled.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/CustomSidebarsSection.swift:79`

### settings · globalHotkey

- "Turn this on to show or hide all cmux windows from any app." · `settings.globalHotkey.enable.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/GlobalHotkeySection.swift:73`
- "Press the shortcut from any app to show or hide all cmux windows." · `settings.globalHotkey.enable.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/GlobalHotkeySection.swift:72`

### settings · mobile

- "Limits iOS to immediate children of referenced or visible folders." · `settings.mobile.artifactFolderAccess.subtitleOneLevel` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/MobileSection.swift:476`
- "Lets iOS browse any item inside a folder referenced by chat or visible in a terminal." · `settings.mobile.artifactFolderAccess.subtitleSubtree` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/MobileSection.swift:471`
- "Entire Subtree" · `settings.mobile.artifactFolderAccess.subtree` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/MobileSection.swift:451`
- "iOS devices currently attached to this Mac." · `settings.mobile.connections.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/MobileSection.swift:490`
- "Name the iOS app shows for this Mac when pairing. Empty uses this Mac's name." · `settings.mobile.displayName.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/MobileSection.swift:424`
- "Keeps iOS pairing and Iroh networking off until you enable it here." · `settings.mobile.iOSPairingHost.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/MobileSection.swift:276`
- "Allows iOS pairing and Iroh networking for this Mac." · `settings.mobile.iOSPairingHost.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/MobileSection.swift:275`
- "Stops this Mac from sending local agent alerts to mobile devices." · `settings.mobile.phonePush.forwarding.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/MobileSection.swift:160`
- "Sends local agent alerts from this Mac to cmux on your iPhone and iPad." · `settings.mobile.phonePush.forwarding.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/MobileSection.swift:156`
- "Sends a generic message instead of agent and terminal text." · `settings.mobile.phonePush.hideContent.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/MobileSection.swift:227`
- "Always sends every local agent alert. Away mode waits until this Mac is locked, asleep, or idle." · `settings.mobile.phonePush.mode.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/MobileSection.swift:187`
- "Port %lld is in use. The pairing listener is still on %lld." · `settings.mobile.port.apply.inUse` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/MobileSection.swift:360`
- "Saved port %lld. It takes effect the next time iOS Pairing starts." · `settings.mobile.port.apply.saved` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/MobileSection.swift:370`
- "Apply saves the port for the next pairing start. Current connections continue. To use the new port, turn iOS Pairing off and on. If the port is unavailable, cmux chooses an available port." · `settings.mobile.port.note` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/MobileSection.swift:118`
- "Port %lld is saved for the next pairing start. Currently using port %lld." · `settings.mobile.port.pending` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/MobileSection.swift:348`
- "Port %lld is in use. The pairing listener is on %lld instead." · `settings.mobile.port.status.fallback` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/MobileSection.swift:397`
- "Port must be between 1 and 65535." · `settings.mobile.port.status.invalid` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/MobileSection.swift:339`
- "Pairing listener on port %lld." · `settings.mobile.port.status.ok` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/MobileSection.swift:405`
- "Starting the pairing listener…" · `settings.mobile.port.status.starting` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/MobileSection.swift:392`
- "Preferred port for IROH connections, 1–65535." · `settings.mobile.port.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/MobileSection.swift:291`

### settings · networking

- "Confirm you are signed in, then reopen cmux and run the check again." · `settings.networking.check.action.account` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohConnectionCheckCard.swift:267`
- "Connect this Mac to the internet, then run the check again." · `settings.networking.check.action.internet` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohConnectionCheckCard.swift:249`
- "Keep cmux open and confirm both apps use the same account." · `settings.networking.check.action.mac` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohConnectionCheckCard.swift:254`
- "Your network may block relay traffic. Ask IT to allow HTTPS and WebSocket access to your configured cmux relay domains, or add an approved custom relay." · `settings.networking.check.action.relay` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohConnectionCheckCard.swift:259`
- "Update cmux on both devices. If needed, pair them again." · `settings.networking.check.action.repair` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohConnectionCheckCard.swift:279`
- "Retry. If this continues, share the safe report with cmux support." · `settings.networking.check.action.retry` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohConnectionCheckCard.swift:244`
- "Choose Automatic relay selection, or fix the selected custom relay and its device secret." · `settings.networking.check.action.settings` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohConnectionCheckCard.swift:272`
- "Allow outbound HTTPS and WebSocket access to these cmux relay origins:" · `settings.networking.check.allowlist.header` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohConnectionCheckCard.swift:122`
- "Not Needed" · `settings.networking.check.notApplicable` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohConnectionCheckCard.swift:215`
- "cmux automatically uses direct internet, LAN, or any VPN route available to macOS, then falls back to an allowed relay. Every route remains end-to-end encrypted." · `settings.networking.check.note` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohConnectionCheckCard.swift:35`
- "Active Route" · `settings.networking.check.path` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohConnectionCheckCard.swift:50`
- "Custom Relay (%1$@)" · `settings.networking.check.path.customRelay` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohConnectionCheckCard.swift:182`
- "cmux Relay (%1$@, %2$@)" · `settings.networking.check.path.managedRelay` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohConnectionCheckCard.swift:173`
- "LAN or Private VPN" · `settings.networking.check.path.private` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohConnectionCheckCard.swift:167`
- "No Live Route" · `settings.networking.check.path.unavailable` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohConnectionCheckCard.swift:157`
- "Suggested Action" · `settings.networking.check.report.action` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohConnectionCheckCard.swift:145`
- "Secure Session" · `settings.networking.check.session` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohConnectionCheckCard.swift:204`
- "Checks encrypted transport, relay policy, and relay reachability from this Mac." · `settings.networking.check.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohConnectionCheckCard.swift:18`
- "Add Custom Relay" · `settings.networking.custom.add` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohCustomRelayEditor.swift:77`
- "Add…" · `settings.networking.custom.add.short` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohNetworkingSection.swift:168`
- "Edit Custom Relay" · `settings.networking.custom.edit` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohCustomRelayEditor.swift:78`
- "Relay addresses sync with your account. Provider secrets stay only in each device's secure storage. Missing secrets never fall back to cmux relays." · `settings.networking.custom.note` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohNetworkingSection.swift:206`
- "Remove this custom relay?" · `settings.networking.custom.remove.confirm` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohNetworkingSection.swift:95`
- "Relay Secret" · `settings.networking.custom.secret` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohCustomRelayEditor.swift:62`
- "New Secret (leave blank to keep current)" · `settings.networking.custom.secret.keep` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohCustomRelayEditor.swift:63`
- "The secret stays in this device's secure storage and never syncs with your account." · `settings.networking.custom.secret.note` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohCustomRelayEditor.swift:67`
- "Use relays you operate or obtain from another provider." · `settings.networking.custom.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohNetworkingSection.swift:164`
- "Debug builds only. Keeps authenticated Iroh sessions on relays so the relay path can be verified." · `settings.networking.debug.relayOnly.subtitle` · defined but unused
- "Recorded Events" · `settings.networking.diagnostics.eventCount` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohNetworkingSection.swift:449`
- "Connection Admission Denied" · `settings.networking.diagnostics.failure.admissionDenied` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohNetworkingSection.swift:603`
- "Admission Revalidation Failed" · `settings.networking.diagnostics.failure.admissionRevalidationFailed` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohNetworkingSection.swift:613`
- "Connection Refused" · `settings.networking.diagnostics.failure.connectionRefused` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohNetworkingSection.swift:548`
- "Name Resolution Failed" · `settings.networking.diagnostics.failure.dnsFailed` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohNetworkingSection.swift:563`
- "Endpoint Identity Mismatch" · `settings.networking.diagnostics.failure.identityMismatch` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohNetworkingSection.swift:598`
- "No Route Available" · `settings.networking.diagnostics.failure.noRoute` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohNetworkingSection.swift:578`
- "Connection Attempt Held" · `settings.networking.diagnostics.failure.routeGated` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohNetworkingSection.swift:643`
- "Replaced by a Newer Attempt" · `settings.networking.diagnostics.failure.superseded` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohNetworkingSection.swift:648`
- "Last Successful Connection" · `settings.networking.diagnostics.lastSuccess` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohNetworkingSection.swift:424`
- "Not Recorded" · `settings.networking.diagnostics.notRecorded` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohNetworkingSection.swift:524`
- "The report stays on this Mac until you share it. It excludes terminal content, account and endpoint identities, network addresses, relay URLs, credentials, and raw errors." · `settings.networking.diagnostics.privacy` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohNetworkingSection.swift:495`
- "Share a bounded, privacy-safe connection timeline with support." · `settings.networking.diagnostics.report.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohNetworkingSection.swift:461`
- "Requires a reachable direct, local-network, or private-network path. Applies on the next reconnect." · `settings.networking.neverUseRelays.subtitle` · defined but unused
- "Add Private Network" · `settings.networking.private.add` · defined but unused
- "Add…" · `settings.networking.private.add.short` · defined but unused
- "Edit Private Network" · `settings.networking.private.edit` · defined but unused
- "Host or IP Address" · `settings.networking.private.host` · defined but unused
- "Use this for Tailscale alternatives, a company VPN, or a private network you operate. Authentication still happens before cmux accepts the route." · `settings.networking.private.note` · defined but unused
- "The other Mac must run a current cmux build that advertises Iroh private-path support. Custom raw TCP routes are not accepted because they cannot prove the remote Mac. Iroh private paths stay encrypted and bound to its exact EndpointID." · `settings.networking.private.note.short` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohNetworkingSection.swift:242`
- "Remove this private network?" · `settings.networking.private.remove.confirm` · defined but unused
- "Iroh discovers usable LAN and VPN paths after authenticating the other device." · `settings.networking.private.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohNetworkingSection.swift:219`
- "Keeps Iroh connections to this Mac on cmux relays instead of direct or local-network paths. Applies on the next reconnect." · `settings.networking.relayOnly.subtitle` · defined but unused
- "cmux downloads a signed relay catalog. Fleet additions, removals, and regional changes do not require an app update." · `settings.networking.relayPolicy.note` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohNetworkingSection.swift:151`
- "Direct peer-to-peer stays enabled. This controls which relays Iroh may use when a direct path is unavailable." · `settings.networking.relayPreference.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohNetworkingSection.swift:115`
- "Connected through a private network" · `settings.networking.status.private.generic` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/IrohNetworkingSection.swift:379`

### settings · notifications

- "When to notify that an agent finished. When idle waits until background tasks and scheduled wakeups drain." · `settings.notifications.agentTurnComplete.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:721`
- "Run a shell command when a notification arrives. $CMUX_NOTIFICATION_TITLE, $CMUX_NOTIFICATION_SUBTITLE, $CMUX_NOTIFICATION_BODY are set." · `settings.notifications.command.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:800`
- "Desktop notifications are enabled." · `settings.notifications.desktop.subtitle.allowed` · `Sources/TerminalNotificationStore.swift:720`
- "Desktop notifications are disabled in System Settings." · `settings.notifications.desktop.subtitle.denied` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/DesktopNotificationPermissionPresentation.swift:81`
- "Desktop notifications are not enabled yet." · `settings.notifications.desktop.subtitle.notDetermined` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/DesktopNotificationPermissionPresentation.swift:77`
- "Show a ring around panes with unread notifications." · `settings.notifications.paneRing.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:685`
- "Choose Notification Sound" · `settings.notifications.sound.custom.choose.title` · defined but unused
- "Custom Notification Sound Error" · `settings.notifications.sound.custom.error.title` · defined but unused
- "No file selected" · `settings.notifications.sound.custom.file.none` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/NotificationSoundGlobalRow.swift:141`
- "The file is missing or cannot be decoded as audio." · `settings.notifications.sound.custom.invalid.message` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/NotificationSoundGlobalRow.swift:169`
- "Choose Notification Sound" · `settings.notifications.sound.custom.panelTitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/NotificationSoundGlobalRow.swift:165`
- "Choose a custom audio file first." · `settings.notifications.sound.custom.status.empty` · defined but unused
- "File needs an extension:" · `settings.notifications.sound.custom.status.missingExtensionPrefix` · defined but unused
- "Could not prepare this file for notifications. Try WAV, AIFF, or CAF." · `settings.notifications.sound.custom.status.prepareFailed` · defined but unused
- "Ready for notifications." · `settings.notifications.sound.custom.status.ready` · defined but unused
- "Validating notification sound" · `settings.notifications.sound.custom.validating` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/NotificationSoundGlobalRow.swift:88`
- "Sound played when a notification arrives." · `settings.notifications.sound.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/NotificationSoundGlobalRow.swift:41`
- "Choose Custom File…" · `settings.notifications.soundOverrides.chooseCustom` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/NotificationSoundOverridesView.swift:158`
- "Choose Notification Sound" · `settings.notifications.soundOverrides.chooseCustom.title` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/NotificationSoundOverridesView.swift:194`
- "Error / Stalled" · `settings.notifications.soundOverrides.errorStalled` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/NotificationSoundOverridesView.swift:218`
- "Choose a sound for each agent and alert type. Empty cells use the global notification sound." · `settings.notifications.soundOverrides.help` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/NotificationSoundOverridesView.swift:71`
- "The saved per-agent sound settings are invalid. Fix notifications.soundOverrides in cmux.json before editing." · `settings.notifications.soundOverrides.invalidConfiguration` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/NotificationSoundOverridesView.swift:63`
- "That file is missing or cannot be decoded as audio." · `settings.notifications.soundOverrides.invalidFile` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/NotificationSoundOverridesView.swift:198`
- "No registered agents found." · `settings.notifications.soundOverrides.noAgents` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/NotificationSoundOverridesView.swift:79`
- "Override the sound for a specific agent and alert type." · `settings.notifications.soundOverrides.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection.swift:764`
- "Use Global Sound" · `settings.notifications.soundOverrides.useGlobal` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/NotificationSoundOverridesView.swift:145`

### settings · search

- "auth authentication login logout sign in sign out email user profile team" · `settings.search.alias.section.account` · `Sources/SettingsSearchAliases.swift:9`
- "general preferences prefs behavior chrome dock menubar menu bar status notifications telemetry" · `settings.search.alias.section.app` · `Sources/SettingsSearchAliases.swift:11`
- "api cli control socket mcp agents hooks ports" · `settings.search.alias.section.automation` · `Sources/SettingsSearchAliases.swift:31`
- "web webview address bar omnibar links urls embedded default browser" · `settings.search.alias.section.browser` · `Sources/SettingsSearchAliases.swift:35`
- "chrome safari firefox brave edge arc bookmarks history cookies profiles" · `settings.search.alias.section.browserImport` · `Sources/SettingsSearchAliases.swift:37`
- "cloud machines vm virtual machine persistent computer sandbox plan upgrade fleet freestyle" · `settings.search.alias.section.cloudMachines` · `Sources/SettingsSearchAliases.swift:21`
- "computer use cua accessibility screen capture recording permissions cursor mcp agents menu bar onboarding" · `settings.search.alias.section.computerUse` · `Sources/SettingsSearchAliases.swift:33`
- "custom sidebars vibe code swift json interpreted renderer in-process remote worker isolated" · `settings.search.alias.section.customSidebars` · `Sources/SettingsSearchAliases.swift:27`
- "system shortcut global keyboard show hide bring forward" · `settings.search.alias.section.globalHotkey` · `Sources/SettingsSearchAliases.swift:39`
- "keybinds key bindings hotkeys chords accelerators commands" · `settings.search.alias.section.keyboardShortcuts` · `Sources/SettingsSearchAliases.swift:41`
- "ios iphone ipad mobile pairing local network permission sync" · `settings.search.alias.section.mobile` · `Sources/SettingsSearchAliases.swift:19`
- "iroh relay relays server fleet provider region custom self hosted private network tailscale vpn direct peer" · `settings.search.alias.section.networking` · `Sources/SettingsSearchAliases.swift:23`
- "configuration config file json jsonc dotfile ~/.config schema docs" · `settings.search.alias.section.settingsJSON` · `Sources/SettingsSearchAliases.swift:45`
- "sidebar left rail navigation details branches badges material terminal background" · `settings.search.alias.section.sidebarAppearance` · `Sources/SettingsSearchAliases.swift:25`
- "sleepy mode screensaver caffeinate keep awake do not sleep lock touch id battery wifi clock mascot theme glow pixel night" · `settings.search.alias.section.sleepyMode` · `Sources/SettingsSearchAliases.swift:17`
- "shell scrollback scrollbar scroll bar ghostty tty pty" · `settings.search.alias.section.terminal` · `Sources/SettingsSearchAliases.swift:13`
- "textbox text box rich input prompt beta focus composer compose attachments" · `settings.search.alias.section.textBox` · `Sources/SettingsSearchAliases.swift:15`
- "tab colors palette accent badge selected highlight" · `settings.search.alias.section.workspaceColors` · `Sources/SettingsSearchAliases.swift:43`
- "auth authentication login logout signin sign-in signout sign-out email user profile stack team" · `settings.search.alias.setting.account.account` · `Sources/SettingsSearchAliases.swift:60`
- "app.appIcon dock icon application icon app switcher alternate icon" · `settings.search.alias.setting.app.app-icon` · `Sources/SettingsSearchAliases.swift:63`
- "app.appearance theme color scheme light mode dark mode system mode" · `settings.search.alias.setting.app.appearance` · `Sources/SettingsSearchAliases.swift:62`
- "canvas.paneGap canvas pane gap spacing freeform layout panes snapping tidy distribute align" · `settings.search.alias.setting.app.canvas-pane-gap` · `Sources/SettingsSearchAliases.swift:110`
- "canvas.snappingEnabled canvas snap snapping enabled edges drag resize align panes freeform layout" · `settings.search.alias.setting.app.canvas-snapping` · `Sources/SettingsSearchAliases.swift:111`
- "app.defaultTerminal default terminal ssh links command tool unix executable launch services handler" · `settings.search.alias.setting.app.default-terminal` · `Sources/SettingsSearchAliases.swift:64`
- "macos desktop notifications system settings permission alerts notify test" · `settings.search.alias.setting.app.desktop-notifications` · `Sources/SettingsSearchAliases.swift:93`
- "notifications.dockBadge badge dock unread count icon notifications red bubble" · `settings.search.alias.setting.app.dock-badge` · `Sources/SettingsSearchAliases.swift:88`
- "fileEditor.currentLineHighlight current line caret" · `settings.search.alias.setting.app.file-editor-current-line-highlight` · `Sources/SettingsSearchAliases.swift:84`
- "fileEditor.indentGuides indent guides columns" · `settings.search.alias.setting.app.file-editor-indent-guides` · `Sources/SettingsSearchAliases.swift:83`
- "fileEditor.lineNumbers gutter line numbers" · `settings.search.alias.setting.app.file-editor-line-numbers` · `Sources/SettingsSearchAliases.swift:82`
- "fileEditor.syntaxHighlighting syntax highlight colors tokens code" · `settings.search.alias.setting.app.file-editor-syntax-highlighting` · `Sources/SettingsSearchAliases.swift:81`
- "fileEditor.tabWidth tab width indent columns" · `settings.search.alias.setting.app.file-editor-tab-width` · `Sources/SettingsSearchAliases.swift:85`
- "fileEditor.wordWrap file editor word wrap soft wrap reflow lines text horizontal scroll preview" · `settings.search.alias.setting.app.file-editor-word-wrap` · `Sources/SettingsSearchAliases.swift:80`
- "app.focusPaneOnFirstClick click to focus focus follows mouse first click mouse activation" · `settings.search.alias.setting.app.focus-pane-first-click` · `Sources/SettingsSearchAliases.swift:71`
- "app.forkConversationDefaultDestination fork conversation right left top bottom split tab workspace default" · `settings.search.alias.setting.app.fork-conversation-default` · `Sources/SettingsSearchAliases.swift:67`
- "sidebar.hideAllDetails compact sidebar hide details only title minimal left rail" · `settings.search.alias.setting.app.hide-sidebar-details` · `Sources/SettingsSearchAliases.swift:126`
- "app.hideTabCloseButton hide close tab x button terminal surface" · `settings.search.alias.setting.app.hide-tab-close-button` · `Sources/SettingsSearchAliases.swift:105`
- "app.keepWorkspaceOpenWhenClosingLastSurface close last pane surface keep tab workspace" · `settings.search.alias.setting.app.keep-workspace-open` · `Sources/SettingsSearchAliases.swift:70`
- "app.language locale l10n localization translation japanese english ja en nihongo restart" · `settings.search.alias.setting.app.language` · `Sources/SettingsSearchAliases.swift:61`
- "sidebar.loadingSpinnerPosition loading spinner position left right leading trailing side workspace" · `settings.search.alias.setting.app.loading-spinner-position` · `Sources/SettingsSearchAliases.swift:147`
- "markdown.fontFamily md markdown viewer font font-family family typeface system stack custom" · `settings.search.alias.setting.app.markdown-font-family` · `Sources/SettingsSearchAliases.swift:78`
- "markdown.fontSize md markdown viewer font size points zoom scale text bigger smaller larger default" · `settings.search.alias.setting.app.markdown-font-size` · `Sources/SettingsSearchAliases.swift:77`
- "markdown.maxWidth md markdown viewer max width column reading line length pixels px narrow wide" · `settings.search.alias.setting.app.markdown-max-width` · `Sources/SettingsSearchAliases.swift:79`
- "app.openMarkdownInCmuxViewer md markdown mdx viewer preview readme" · `settings.search.alias.setting.app.markdown-viewer` · `Sources/SettingsSearchAliases.swift:76`
- "app.menuBarOnly menubar menu bar dockless hide dock app switcher cmd-tab command-tab" · `settings.search.alias.setting.app.menu-bar-only` · `Sources/SettingsSearchAliases.swift:89`
- "app.minimalMode minimal layout simple chrome compact titlebar controls" · `settings.search.alias.setting.app.minimal-mode` · `Sources/SettingsSearchAliases.swift:69`
- "app.newWorkspacePlacement new tab insert position order top bottom end" · `settings.search.alias.setting.app.new-workspace-placement` · `Sources/SettingsSearchAliases.swift:65`
- "sidebar.notificationBadgePosition notification unread badge position left right leading trailing side workspace" · `settings.search.alias.setting.app.notification-badge-position` · `Sources/SettingsSearchAliases.swift:148`
- "notifications.command shell command hook script env environment variable variables done agent" · `settings.search.alias.setting.app.notification-command` · `Sources/SettingsSearchAliases.swift:96`
- "notifications.sound notifications.customSoundFilePath sound audio alert chime beep custom file wav mp3 caf aiff" · `settings.search.alias.setting.app.notification-sound` · `Sources/SettingsSearchAliases.swift:94`
- "notifications.soundOverrides per-agent agent sound turn done needs input permission error stalled custom file" · `settings.search.alias.setting.app.notification-sound-overrides` · `Sources/SettingsSearchIndex.swift:59`
- "sidebar.openPortLinksInCmuxBrowser ports localhost links browser default external embedded" · `settings.search.alias.setting.app.open-port-links` · `Sources/SettingsSearchAliases.swift:141`
- "sidebar.openPullRequestLinksInCmuxBrowser pr links github browser default external embedded" · `settings.search.alias.setting.app.open-pr-links` · `Sources/SettingsSearchAliases.swift:140`
- "app.commandPaletteSearchesAllSurfaces command palette search all surfaces cmd-p terminal browser markdown" · `settings.search.alias.setting.app.palette-search-all` · `Sources/SettingsSearchAliases.swift:109`
- "notifications.paneFlash flash blink highlight pane notification pulse" · `settings.search.alias.setting.app.pane-flash` · `Sources/SettingsSearchAliases.swift:92`
- "app.preferredEditor editor open file code vscode visual studio zed sublime subl cursor" · `settings.search.alias.setting.app.preferred-editor` · `Sources/SettingsSearchAliases.swift:73`
- "app.renameSelectsExistingName rename select all existing title command palette workspace name" · `settings.search.alias.setting.app.rename-selects-name` · `Sources/SettingsSearchAliases.swift:108`
- "app.reorderOnNotification notification reorder move workspace top unread sort" · `settings.search.alias.setting.app.reorder-notification` · `Sources/SettingsSearchAliases.swift:87`
- "sidebar.showAgentActivity loading spinner active coding agent agents running activity" · `settings.search.alias.setting.app.show-agent-activity` · `Sources/SettingsSearchAliases.swift:146`
- "sidebar.showBranchDirectory git branch cwd path directory folder repo sidebar" · `settings.search.alias.setting.app.show-branch-directory` · `Sources/SettingsSearchAliases.swift:136`
- "sidebar.showLog log status latest message imperative" · `settings.search.alias.setting.app.show-log` · `Sources/SettingsSearchAliases.swift:144`
- "notifications.showInMenuBar menubar menu bar status item tray extra" · `settings.search.alias.setting.app.show-menu-bar` · `Sources/SettingsSearchAliases.swift:90`
- "sidebar.showCustomMetadata metadata meta report_meta status custom block" · `settings.search.alias.setting.app.show-metadata` · `Sources/SettingsSearchAliases.swift:149`
- "sidebar.showNotificationMessage latest message unread notification text sidebar" · `settings.search.alias.setting.app.show-notification-message` · `Sources/SettingsSearchAliases.swift:135`
- "sidebar.showPorts localhost port listener dev server url" · `settings.search.alias.setting.app.show-ports` · `Sources/SettingsSearchAliases.swift:143`
- "sidebar.showProgress progress bar percent status set_progress" · `settings.search.alias.setting.app.show-progress` · `Sources/SettingsSearchAliases.swift:145`
- "sidebar.showPullRequests pr mr review github gitlab bitbucket pull request merge request" · `settings.search.alias.setting.app.show-pull-requests` · `Sources/SettingsSearchAliases.swift:137`
- "sidebar.showSSH remote host target ssh server" · `settings.search.alias.setting.app.show-ssh` · `Sources/SettingsSearchAliases.swift:142`
- "sidebar.showWorkspaceDescription workspace description notes markdown sidebar" · `settings.search.alias.setting.app.show-workspace-description` · `Sources/SettingsSearchAliases.swift:128`
- "sidebar.branchLayout git branch layout vertical inline cwd directory" · `settings.search.alias.setting.app.sidebar-branch-layout` · `Sources/SettingsSearchAliases.swift:132`
- "app.openSupportedFilesInCmux cmd click file preview pdf image video audio quicklook quick look editor external" · `settings.search.alias.setting.app.supported-file-previews` · `Sources/SettingsSearchAliases.swift:74`
- "app.sendAnonymousTelemetry analytics crash reports sentry posthog usage anonymous privacy" · `settings.search.alias.setting.app.telemetry` · `Sources/SettingsSearchAliases.swift:97`
- "ghostty config configuration terminal settings preview merged file reload macos-option-as-alt option as alt left option right option alt key meta" · `settings.search.alias.setting.app.terminal-config` · `Sources/SettingsSearchAliases.swift:75`
- "notifications.unreadPaneRing blue border unread ring notification pane outline" · `settings.search.alias.setting.app.unread-pane-ring` · `Sources/SettingsSearchAliases.swift:91`
- "app.warnBeforeClosingTab close tab confirmation command-w cmd-w terminal surface" · `settings.search.alias.setting.app.warn-before-closing-tab` · `Sources/SettingsSearchAliases.swift:99`
- "app.warnBeforeClosingTabXButton close tab x button confirmation terminal surface" · `settings.search.alias.setting.app.warn-before-closing-tab-x-button` · `Sources/SettingsSearchAliases.swift:101`
- "app.warnBeforeQuit quit confirmation command-q cmd-q exit close app" · `settings.search.alias.setting.app.warn-before-quit` · `Sources/SettingsSearchAliases.swift:98`
- "sidebar.watchGitStatus git status branch watcher index lock" · `settings.search.alias.setting.app.watch-git-status` · `Sources/SettingsSearchAliases.swift:138`
- "workspaceGroups.newWorkspacePlacement group new workspace command n cmd-n plus insert position after current top end" · `settings.search.alias.setting.app.workspace-group-new-workspace-placement` · `Sources/SettingsSearchAliases.swift:66`
- "app.workspaceInheritWorkingDirectory workspace cwd directory inherit current focused ghostty working-directory" · `settings.search.alias.setting.app.workspace-inherit-working-directory` · `Sources/SettingsSearchAliases.swift:68`
- "sidebar.wrapWorkspaceTitles workspace title wrap multiline pr pull request" · `settings.search.alias.setting.app.wrap-workspace-titles` · `Sources/SettingsSearchAliases.swift:127`
- "automation.claudeCodeIntegration claude code hooks agent integration status notifications" · `settings.search.alias.setting.automation.claude-code` · `Sources/SettingsSearchAliases.swift:165`
- "automation.claudeBinaryPath claude binary executable path cli command custom" · `settings.search.alias.setting.automation.claude-path` · `Sources/SettingsSearchAliases.swift:166`
- "automation.cursorIntegration cursor ide agent hooks notifications" · `settings.search.alias.setting.automation.cursor` · `Sources/SettingsSearchAliases.swift:170`
- "automation.geminiIntegration gemini cli google agent hooks notifications" · `settings.search.alias.setting.automation.gemini` · `Sources/SettingsSearchAliases.swift:171`
- "automation.kiroIntegration kiro cli amazon q agent hooks notifications" · `settings.search.alias.setting.automation.kiro` · `Sources/SettingsSearchAliases.swift:172`
- "automation.kiroNotificationLevel kiro cli notification verbosity minimal standard verbose tool events" · `settings.search.alias.setting.automation.kiro-notification-level` · `Sources/SettingsSearchAliases.swift:173`
- "automation.portBase cmux_port start first base env environment variable" · `settings.search.alias.setting.automation.port-base` · `Sources/SettingsSearchAliases.swift:174`
- "automation.portRange cmux_port_end range size count env ports" · `settings.search.alias.setting.automation.port-range` · `Sources/SettingsSearchAliases.swift:175`
- "automation.ripgrepBinaryPath ripgrep rg binary executable path search find nix custom" · `settings.search.alias.setting.automation.ripgrep-path` · `Sources/SettingsSearchAliases.swift:168`
- "automation.socketControlMode api socket unix domain control server auth allow password disabled" · `settings.search.alias.setting.automation.socket-mode` · `Sources/SettingsSearchAliases.swift:163`
- "automation.socketPassword auth token credential secret password access key" · `settings.search.alias.setting.automation.socket-password` · `Sources/SettingsSearchAliases.swift:164`
- "automation.suppressSubagentNotifications subagent nested child agent codex claude hooks notifications" · `settings.search.alias.setting.automation.subagent-notifications` · `Sources/SettingsSearchAliases.swift:169`
- "automation.workspaceAutoNaming automation.autoNamingAgent ai auto naming auto-name auto name workspace tab workspaces tabs title titles rename workspace rename tab renaming generated summarize summary summarizer conversation agent picker naming agent" · `settings.search.alias.setting.automation.workspace-auto-naming` · `Sources/SettingsSearchAliases.swift:167`
- "sidebar.beta.workspaceTodos.controls.enabled workspace todo todos task status checklist add item controls beta" · `settings.search.alias.setting.betaFeatures.workspace-todo-controls` · `Sources/SettingsSearchAliases.swift:130`
- "sidebar.beta.workspaceTodos.checklistStyle workspace todo todos task status checklist popover inline presentation style beta" · `settings.search.alias.setting.betaFeatures.workspace-todos-checklist-style` · `Sources/SettingsSearchAliases.swift:131`
- "browser.askWhereToSaveDownloads downloads save panel folder attachments files pdf gmail" · `settings.search.alias.setting.browser.ask-where-to-save-downloads` · `Sources/SettingsSearchAliases.swift:185`
- "browser.chromiumExtensionDirectories chrome extension unpacked load-extension addon plugin" · `settings.search.alias.setting.browser.chromium-extensions` · defined but unused
- "browser.enabled enable disable webview embedded browser tabs links" · `settings.search.alias.setting.browser.enable-browser` · `Sources/SettingsSearchAliases.swift:179`
- "browser.defaultEngine auto match default browser webkit chromium chrome rendering engine out of process" · `settings.search.alias.setting.browser.engine` · defined but unused
- "browser.urlsToAlwaysOpenExternally denylist blocklist regex rules external default browser" · `settings.search.alias.setting.browser.external-patterns` · `Sources/SettingsSearchAliases.swift:189`
- "browser.discardHiddenWebViews memory hidden tabs webview discard unload reclaim" · `settings.search.alias.setting.browser.hidden-webview-discard` · `Sources/SettingsSearchAliases.swift:183`
- "browser.hiddenWebViewDiscardDelaySeconds memory hidden tabs delay seconds discard unload" · `settings.search.alias.setting.browser.hidden-webview-discard-delay` · `Sources/SettingsSearchAliases.swift:184`
- "clear browser history visited pages suggestions omnibar" · `settings.search.alias.setting.browser.history` · `Sources/SettingsSearchAliases.swift:195`
- "browser.hostsToOpenInEmbeddedBrowser allowlist whitelist host wildcard domain embedded browser" · `settings.search.alias.setting.browser.host-whitelist` · `Sources/SettingsSearchAliases.swift:188`
- "browser.insecureHttpHostsAllowedInEmbeddedBrowser insecure http allowlist localhost localtest non-https warning" · `settings.search.alias.setting.browser.http-allowlist` · `Sources/SettingsSearchAliases.swift:190`
- "browser.interceptTerminalOpenCommandInCmuxBrowser open command http https url terminal intercept" · `settings.search.alias.setting.browser.intercept-open` · `Sources/SettingsSearchAliases.swift:187`
- "browser.reactGrabVersion react grab npm version toolbar cmd-shift-g inspect component" · `settings.search.alias.setting.browser.react-grab` · `Sources/SettingsSearchAliases.swift:194`
- "browser.remoteDebuggingPort cdp devtools protocol playwright puppeteer loopback localhost attach" · `settings.search.alias.setting.browser.remote-debugging-port` · defined but unused
- "browser.defaultSearchEngine browser.customSearchEngineName browser.customSearchEngineURLTemplate omnibar address bar google duckduckgo bing kagi brave startpage perplexity exa yahoo ecosia qwant mojeek wikipedia github baidu yandex custom search provider" · `settings.search.alias.setting.browser.search-engine` · `Sources/SettingsSearchAliases.swift:180`
- "browser.showSearchSuggestions suggest autocomplete address bar search suggestions" · `settings.search.alias.setting.browser.search-suggestions` · `Sources/SettingsSearchAliases.swift:181`
- "browser.openTerminalLinksInCmuxBrowser click url terminal links open in browser href" · `settings.search.alias.setting.browser.terminal-links` · `Sources/SettingsSearchAliases.swift:186`
- "browser.theme web page theme color scheme light dark system" · `settings.search.alias.setting.browser.theme` · `Sources/SettingsSearchAliases.swift:182`
- "browser.urlAllowlist URL allowlist localhost wildcard scheme port organization policy" · `settings.search.alias.setting.browser.url-allowlist` · `Sources/SettingsSearchAliases.swift:191`
- "chrome safari firefox brave edge arc bookmarks history cookies profiles migration" · `settings.search.alias.setting.browserImport.import-data` · `Sources/SettingsSearchAliases.swift:192`
- "browser.showImportHintOnBlankTabs blank tab onboarding hint import prompt dismiss" · `settings.search.alias.setting.browserImport.import-hint` · `Sources/SettingsSearchAliases.swift:193`
- "computerUse.enabled enable disable computer use cua mcp agent sessions" · `settings.search.alias.setting.computerUse.enabled` · `Sources/SettingsSearchAliases.swift:176`
- "accessibility screen recording capture permissions privacy system settings grant" · `settings.search.alias.setting.computerUse.permissions` · `Sources/SettingsSearchAliases.swift:177`
- "computerUse.showInMenuBar menu bar menubar status item cursor agents" · `settings.search.alias.setting.computerUse.showInMenuBar` · `Sources/SettingsSearchAliases.swift:178`
- "global hotkey enable system wide show hide all windows" · `settings.search.alias.setting.globalHotkey.enable-hotkey` · `Sources/SettingsSearchAliases.swift:196`
- "global hotkey shortcut recorder key command option control" · `settings.search.alias.setting.globalHotkey.shortcut` · `Sources/SettingsSearchAliases.swift:197`
- "pane resize split step pixels key repeat keybindings ctrl shift h j k l" · `settings.search.alias.setting.keyboardShortcuts.pane-resize-step` · `Sources/SettingsSearchAliases.swift:72`
- "tmux prefix ctrl-b control-b multi key sequence chord cmux json" · `settings.search.alias.setting.keyboardShortcuts.shortcut-chords` · `Sources/SettingsSearchAliases.swift:198`
- "hotkeys keybindings key bindings commands keyboard accelerators shortcuts cmux json" · `settings.search.alias.setting.keyboardShortcuts.shortcuts` · `Sources/SettingsSearchAliases.swift:200`
- "mobile ios iphone files folders directory subtree one level authorization security" · `settings.search.alias.setting.mobile.artifactFolderAccess` · `Sources/SettingsSearchAliases.swift:156`
- "mobile ios iphone pairing display name mac hostname device label" · `settings.search.alias.setting.mobile.iOSPairingDisplayName` · `Sources/SettingsSearchAliases.swift:155`
- "ios iphone ipad mobile pairing local network permission sync" · `settings.search.alias.setting.mobile.iOSPairingHost` · `Sources/SettingsSearchAliases.swift:153`
- "mobile ios iphone pairing port tcp listener firewall conflict bind" · `settings.search.alias.setting.mobile.iOSPairingPort` · `Sources/SettingsSearchAliases.swift:154`
- "iroh custom relay self hosted server url secret credential device authentication" · `settings.search.alias.setting.networking.customRelays` · `Sources/SettingsSearchAliases.swift:158`
- "relay policy signed verified catalog cached server expiry sequence security" · `settings.search.alias.setting.networking.policy` · `Sources/SettingsSearchAliases.swift:162`
- "private network lan vpn direct peer path local address generic provider automatic" · `settings.search.alias.setting.networking.privateNetworks` · `Sources/SettingsSearchAliases.swift:159`
- "iroh relay preference automatic managed selected cmux fleet provider region account" · `settings.search.alias.setting.networking.relayPreference` · `Sources/SettingsSearchAliases.swift:157`
- "iroh status diagnostics direct peer relay degraded active inactive refresh" · `settings.search.alias.setting.networking.status` · `Sources/SettingsSearchAliases.swift:161`
- "tailscale tailnet private ip compatibility vpn legacy tcp automatic" · `settings.search.alias.setting.networking.tailscaleCompatibility` · `Sources/SettingsSearchAliases.swift:160`
- "factory reset restore defaults clear preferences" · `settings.search.alias.setting.reset.reset-all` · `Sources/SettingsSearchAliases.swift:207`
- "docs documentation schema reference cmux json keys configuration" · `settings.search.alias.setting.settingsJSON.documentation` · `Sources/SettingsSearchAliases.swift:206`
- "open config file json jsonc config editor ~/.config cmux preferences" · `settings.search.alias.setting.settingsJSON.open-file` · `Sources/SettingsSearchAliases.swift:205`
- "sidebarAppearance.darkModeTintColor dark color sidebar tint hex nighttime" · `settings.search.alias.setting.sidebarAppearance.dark-tint` · defined but unused
- "sidebar-font-size sidebar font size text scale workspace title badge metadata shortcut hint" · `settings.search.alias.setting.sidebarAppearance.font-size` · `Sources/SettingsSearchAliases.swift:125`
- "sidebarAppearance.lightModeTintColor light color sidebar tint hex daytime" · `settings.search.alias.setting.sidebarAppearance.light-tint` · defined but unused
- "sidebarAppearance.matchTerminalBackground transparent background material terminal background sync" · `settings.search.alias.setting.sidebarAppearance.match-terminal` · `Sources/SettingsSearchAliases.swift:124`
- "restore default clear tint colors opacity" · `settings.search.alias.setting.sidebarAppearance.reset-tint` · defined but unused
- "sidebar.rightMaxWidth dock right sidebar max width terminal reservation cap logs lazygit" · `settings.search.alias.setting.sidebarAppearance.right-max-width` · `Sources/SettingsSearchAliases.swift:150`
- "sidebarAppearance.tintOpacity alpha transparency intensity blend" · `settings.search.alias.setting.sidebarAppearance.tint-opacity` · defined but unused
- "terminal.adaptiveDefaultTheme adaptive default theme appearance light dark palette Ghostty managed colors empty untouched config preserve settings" · `settings.search.alias.setting.terminal.adaptive-default-theme` · `Sources/SettingsSearchIndex.swift:89`
- "terminal.copyOnSelect copy on selection select clipboard mouse double click triple click iterm" · `settings.search.alias.setting.terminal.copy-on-select` · `Sources/SettingsSearchAliases.swift:116`
- "surface resume commands approvals command prefixes auto restore ask manual tmux hibernation sticky process" · `settings.search.alias.setting.terminal.resume-commands` · `Sources/SettingsSearchAliases.swift:119`
- "terminal.showScrollBar scrollback scrollbar scroll bar right edge alternate screen tui" · `settings.search.alias.setting.terminal.scrollbar` · `Sources/SettingsSearchAliases.swift:113`
- "terminal.sessionContentAlignment terminal agent chat left center right alignment position" · `settings.search.alias.setting.terminal.session-content-alignment` · `Sources/SettingsSearchAliases.swift:115`
- "terminal.sessionContentMaxWidth terminal agent chat max width readable line length points pt narrow wide" · `settings.search.alias.setting.terminal.session-content-width` · `Sources/SettingsSearchAliases.swift:114`
- "surface-tab-bar-font-size tab bar font size text scale terminal browser pane tab title" · `settings.search.alias.setting.terminal.tab-bar-font-size` · `Sources/SettingsSearchAliases.swift:118`
- "terminal.textBoxDefaultSubmitAction submit action shift tab claude codex opencode pi agent route provider icon new session" · `settings.search.alias.setting.textBox.default-submit-action` · `Sources/SettingsSearchAliases.swift:122`
- "terminal.focusTextBoxOnNewTerminals focus textbox text box rich input prompt default new terminal workspace split tab beta" · `settings.search.alias.setting.textBox.focus-textbox-new-terminals` · `Sources/SettingsSearchAliases.swift:121`
- "terminal.showTextBoxOnNewTerminals show textbox text box rich input prompt default new terminal workspace split tab beta" · `settings.search.alias.setting.textBox.show-textbox-new-terminals` · `Sources/SettingsSearchAliases.swift:120`
- "terminal.textBoxMaxLines textbox text box rich input prompt max height lines grow scroll beta" · `settings.search.alias.setting.textBox.textbox-max-lines` · `Sources/SettingsSearchAliases.swift:123`
- "workspaceColors.notificationBadgeColor unread notification badge color dot count" · `settings.search.alias.setting.workspaceColors.badge` · `Sources/SettingsSearchAliases.swift:203`
- "workspaceColors.indicatorStyle tab indicator active workspace style color stripe dot" · `settings.search.alias.setting.workspaceColors.indicator` · `Sources/SettingsSearchAliases.swift:201`
- "workspaceColors.colors workspace palette named colors custom color reset built-in" · `settings.search.alias.setting.workspaceColors.palette` · `Sources/SettingsSearchAliases.swift:204`
- "workspaceColors.selectionColor selected workspace color highlight background active tab" · `settings.search.alias.setting.workspaceColors.selection` · `Sources/SettingsSearchAliases.swift:202`
- "current line caret highlight" · `settings.search.fileEditor.currentLineHighlight` · `Sources/SettingsSearchIndex.swift:43`
- "indent guides columns" · `settings.search.fileEditor.indentGuides` · `Sources/SettingsSearchIndex.swift:42`
- "gutter line numbers" · `settings.search.fileEditor.lineNumbers` · `Sources/SettingsSearchIndex.swift:41`
- "syntax highlight colors tokens code" · `settings.search.fileEditor.syntaxHighlighting` · `Sources/SettingsSearchIndex.swift:40`
- "tab width indent columns" · `settings.search.fileEditor.tabWidth` · `Sources/SettingsSearchIndex.swift:44`
- "file editor word wrap soft wrap reflow lines text horizontal scroll preview" · `settings.search.fileEditor.wordWrap` · `Sources/SettingsSearchIndex.swift:39`
- "computer use accessibility screen recording permissions cursor mcp agents menu bar onboarding" · `settings.search.keywords.computerUse` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Navigation/SettingsSectionID.swift:129`

### settings · settingsJSON

- "Edit cmux-owned app settings, shortcuts, automation, sidebar, notifications, and browser behavior." · `settings.settingsJSON.file.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SettingsJSONSection.swift:36`

### settings · shortcuts

- "Pixels moved each time a pane-resize shortcut repeats." · `settings.shortcuts.paneResizeStep.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/KeyboardShortcutsSection.swift:85`
- "%d px" · `settings.shortcuts.paneResizeStep.value` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/KeyboardShortcutsSection.swift:97`
- "Click a shortcut value to record. Use X to unbind; it changes to restore after a clear." · `settings.shortcuts.recordHint` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/KeyboardShortcutsSection.swift:67`
- "Reset Defaults" · `settings.shortcuts.resetDefaults.button` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/KeyboardShortcutsSection.swift:148`
- "Restore built-in shortcut values for shortcuts managed in app settings." · `settings.shortcuts.resetDefaults.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/KeyboardShortcutsSection.swift:142`
- "Holding Cmd or Control does not show shortcut hint chips." · `settings.shortcuts.showModifierHoldHints.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/ModifierHoldHintsSettingsRow.swift:18`
- "Holding Cmd or Control shows shortcut hint chips." · `settings.shortcuts.showModifierHoldHints.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/ModifierHoldHintsSettingsRow.swift:17`

### settings · sidebar

- "Use the built-in dynamic cap that keeps extra terminal space reserved." · `settings.sidebar.rightMaxWidth.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection.swift:171`
- "The Dock can grow past the built-in width cap while preserving terminal space." · `settings.sidebar.rightMaxWidth.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection.swift:169`
- "Use custom Dock max width" · `settings.sidebar.rightMaxWidth.toggle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection.swift:247`
- "Move %@ Down" · `settings.sidebar.rightTabs.moveDown` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection+RightSidebarTabs.swift:75`
- "Move %@ Up" · `settings.sidebar.rightTabs.moveUp` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection+RightSidebarTabs.swift:60`
- "Choose which tabs the right sidebar shows and their order. The ⌃1–⌃9 shortcuts follow the visible order." · `settings.sidebar.rightTabs.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection+RightSidebarTabs.swift:19`

### settings · sidebarAppearance

- "Couldn't save sidebar font size. Please try again." · `settings.sidebarAppearance.fontSize.saveFailed` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection.swift:226`
- "Controls workspace titles, metadata, badges, and shortcut hints in the left sidebar." · `settings.sidebarAppearance.fontSize.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection.swift:196`
- "Use the same background color and transparency as the terminal." · `settings.sidebarAppearance.matchTerminalBackground.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SidebarSection.swift:184`
- "Restore default sidebar appearance." · `settings.sidebarAppearance.reset.subtitle` · defined but unused
- "Dark tint" · `settings.sidebarAppearance.tintColorDark.picker` · defined but unused
- "Sidebar tint color when using dark appearance." · `settings.sidebarAppearance.tintColorDark.subtitle` · defined but unused
- "How strongly the tint color shows over the sidebar material." · `settings.sidebarAppearance.tintOpacity.subtitle` · defined but unused

### settings · terminal

- "An untouched Ghostty config uses Ghostty's fixed built-in palette. Existing Ghostty settings, including light/dark theme pairs, are always preserved." · `settings.terminal.adaptiveDefaultTheme.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TerminalSection.swift:289`
- "cmux's managed light and dark palettes follow the app appearance only when your Ghostty config has no settings. Existing Ghostty settings are never overlaid." · `settings.terminal.adaptiveDefaultTheme.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TerminalSection.swift:285`
- "When cmux reopens after quit, restored agent terminals stay idle until you resume them manually." · `settings.terminal.agentAutoResume.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TerminalSection.swift:448`
- "When cmux reopens after quit, restored agent terminals automatically run their resume command." · `settings.terminal.agentAutoResume.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TerminalSection.swift:447`
- "A terminal must have no output and report an idle agent lifecycle for this long before it can be hibernated." · `settings.terminal.agentHibernation.idleSeconds.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TerminalSection.swift:472`
- "Visible terminals stay live. Extra idle background agent terminals hibernate oldest first." · `settings.terminal.agentHibernation.maxLiveTerminals.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TerminalSection.swift:487`
- "Scheduled hibernation is off. During critical memory pressure, cmux may still hibernate safe idle background agents." · `settings.terminal.agentHibernation.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TerminalSection.swift:461`
- "Idle background agent terminals can be hibernated when the live-terminal limit is exceeded." · `settings.terminal.agentHibernation.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TerminalSection.swift:460`
- "cmux does not add system-clipboard copy on selection. Ghostty config still controls Paste Selection." · `settings.terminal.copyOnSelect.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TerminalSection.swift:422`
- "Selected terminal text is also copied to the system clipboard when the selection is committed." · `settings.terminal.copyOnSelect.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TerminalSection.swift:421`
- "No warning is shown when a pane's process tree grows large. A leaking process can OOM-suspend the entire app." · `settings.terminal.memoryGuardrail.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TerminalSection.swift:548`
- "A pane is flagged once its combined process-tree memory crosses this many gigabytes." · `settings.terminal.memoryGuardrail.threshold.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TerminalSection.swift:560`
- "An off-screen terminal must stay off-screen this long before its renderer memory is reclaimed." · `settings.terminal.rendererRealization.idleSeconds.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TerminalSection.swift:515`
- "The most recently visible terminals keep their renderer ready so switching stays instant. Extra off-screen renderers are reclaimed oldest first." · `settings.terminal.rendererRealization.maxWarmRenderers.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TerminalSection.swift:530`
- "Every visited terminal keeps its full GPU renderer allocated until you close it, even when off-screen." · `settings.terminal.rendererRealization.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TerminalSection.swift:504`
- "Off-screen terminals release their GPU renderer memory while idle and rebuild it instantly when you switch back. The process keeps running." · `settings.terminal.rendererRealization.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TerminalSection.swift:503`
- "Could not delete the resume command approval." · `settings.terminal.resumeCommands.deleteFailed` · defined but unused
- "Resume command approval deleted." · `settings.terminal.resumeCommands.deleted` · defined but unused
- "No custom resume commands have been approved." · `settings.terminal.resumeCommands.empty` · defined but unused
- "env: %@" · `settings.terminal.resumeCommands.envSummary` · defined but unused
- "Enter a valid shell-style command prefix." · `settings.terminal.resumeCommands.invalidPrefix` · defined but unused
- "Command prefix" · `settings.terminal.resumeCommands.prefixPlaceholder` · defined but unused
- "Review signed command prefixes that can restore non-agent terminal surfaces." · `settings.terminal.resumeCommands.subtitle` · `Sources/GhosttyNSView+ForkConversationContextMenu.swift:238`
- "Could not update the resume command approval." · `settings.terminal.resumeCommands.updateFailed` · defined but unused
- "Resume command approval updated." · `settings.terminal.resumeCommands.updated` · defined but unused
- "Hides the right-edge terminal scroll bar everywhere. Changes apply immediately and persist across relaunches." · `settings.terminal.scrollBar.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TerminalSection.swift:409`
- "Shows the right-edge terminal scroll bar in shell scrollback. cmux hides it automatically for alternate-screen style TUI surfaces." · `settings.terminal.scrollBar.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TerminalSection.swift:408`
- "Multiplier applied to terminal scroll wheel and trackpad deltas. Higher scrolls faster." · `settings.terminal.scrollSpeed.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TerminalSection.swift:375`
- "%.2f×" · `settings.terminal.scrollSpeed.value` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TerminalSection.swift:389`
- "Places width-capped content within the pane." · `settings.terminal.sessionContentAlignment.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TerminalSection.swift:349`
- "Terminal and agent chat content uses the full pane width." · `settings.terminal.sessionContentWidth.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TerminalSection.swift:176`
- "Terminal and agent chat content wraps within this width. Narrow panes still use all available space." · `settings.terminal.sessionContentWidth.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TerminalSection.swift:171`
- "Limit session content width" · `settings.terminal.sessionContentWidth.toggle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TerminalSection.swift:326`
- "Couldn't save tab bar font size. Please try again." · `settings.terminal.tabBarFontSize.saveFailed` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TerminalSection.swift:254`
- "Controls the font size of the terminal and browser tab titles at the top of each pane." · `settings.terminal.tabBarFontSize.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TerminalSection.swift:224`
- "Limits how tall the rich terminal input can grow before it scrolls." · `settings.terminal.textBoxMaxLines.subtitle` · defined but unused
- "Command and Option key combinations reach the terminal unchanged." · `settings.terminal.textEditingGestures.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TerminalSection.swift:435`
- "Command and Option arrow keys move by line and word, and the Command and Option delete keys kill by line and word. Applications receive these chords instead of the gesture, so turn this off before working in a full-screen TUI." · `settings.terminal.textEditingGestures.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TerminalSection.swift:434`

### settings · textBox

- "Used for new terminal sessions. Active Claude, Codex, OpenCode, and Pi sessions always submit as text entry." · `settings.textBox.defaultSubmitAction.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TextBoxSection.swift:102`
- "New terminals keep keyboard focus in the terminal surface." · `settings.textBox.focusOnNewTerminals.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TextBoxSection.swift:85`
- "New terminal tabs, splits, and workspaces put keyboard focus in the TextBox." · `settings.textBox.focusOnNewTerminals.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TextBoxSection.swift:84`
- "Limits how tall the rich terminal input can grow before it scrolls." · `settings.textBox.maxLines.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TextBoxSection.swift:131`
- "New terminals start with the TextBox hidden until you open it." · `settings.textBox.showOnNewTerminals.subtitleOff` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TextBoxSection.swift:66`
- "New terminal tabs, splits, and workspaces open with the TextBox visible." · `settings.textBox.showOnNewTerminals.subtitleOn` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/TextBoxSection.swift:65`

### settings · workspaceColors

- "Color of the unread notification badge on workspace tabs." · `settings.workspaceColors.notificationBadgeColor.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/WorkspaceColorsSection.swift:116`
- "Restore built-in defaults and clear all custom colors." · `settings.workspaceColors.resetPalette.subtitle` · defined but unused
- "Restore the built-in palette and remove extra named colors." · `settings.workspaceColors.resetPalette.subtitleV2` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/WorkspaceColorsSection.swift:155`
- "Background color of the selected workspace in the sidebar." · `settings.workspaceColors.selectionColor.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/WorkspaceColorsSection.swift:108`

## simulator

### simulator · accessibility

- "[one] Accessibility element: %lld / [other] Accessibility elements: %lld" · `simulator.accessibility.nodeCount` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+Accessibility.swift:25`
- "Live Element Overlay" · `simulator.accessibility.overlay` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+Accessibility.swift:5`
- "Page %1$lld of %2$lld" · `simulator.accessibility.page` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+Accessibility.swift:34`
- "[one] Accessibility root: %lld / [other] Accessibility roots: %lld" · `simulator.accessibility.rootCount` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+Activity.swift:77`
- "More elements exist beyond the bounded snapshot." · `simulator.accessibility.truncated` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+Accessibility.swift:18`

### simulator · action

- "Add Media" · `simulator.action.addMedia` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:255`
- "Apply Status Bar" · `simulator.action.applyStatusBar` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:308`
- "Capture Keyboard (Escape to Release)" · `simulator.action.captureKeyboard` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:85`
- "Capture Pointer and Keyboard (Escape to Release)" · `simulator.action.capturePointer` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:79`
- "Image or Video" · `simulator.action.chooseCameraSource` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:322`
- "Clear Highlight" · `simulator.action.clearHighlight` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:343`
- "Clear Location" · `simulator.action.clearLocation` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:268`
- "Clear Status Bar" · `simulator.action.clearStatusBar` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:309`
- "Disable Camera" · `simulator.action.disableCamera` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:324`
- "Use Mac Camera" · `simulator.action.hostCamera` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:323`
- "Install App or IPA" · `simulator.action.installApplication` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:246`
- "Pause Route" · `simulator.action.pauseRoute` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:269`
- "Load Recent Logs" · `simulator.action.recentLogs` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:315`
- "Reload React Native" · `simulator.action.reloadReactNative` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:342`
- "Resume Route" · `simulator.action.resumeRoute` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:270`
- "Rotate Right" · `simulator.action.rotateRight` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:61`
- "Send Push Payload" · `simulator.action.sendPush` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:277`
- "Set Location" · `simulator.action.setLocation` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:266`
- "Shut Down Device" · `simulator.action.shutdown` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:201`
- "Side Button" · `simulator.action.sideButton` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:221`
- "Stream Logs" · `simulator.action.startLogStream` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:316`
- "Start Recording" · `simulator.action.startRecording` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:312`
- "Start Route" · `simulator.action.startRoute` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:267`
- "Stop Streaming" · `simulator.action.stopLogStream` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:317`
- "Stop Recording" · `simulator.action.stopRecording` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:313`
- "Stop Route" · `simulator.action.stopRoute` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:271`
- "Swipe Home" · `simulator.action.swipeHome` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:224`
- "Copy from Mac" · `simulator.action.syncClipboard` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:259`
- "Terminate Renderer" · `simulator.action.terminateRenderer` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:175`

### simulator · activity

- "Accessibility Highlight" · `simulator.activity.accessibilityHighlight` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+Activity.swift:34`
- "Simulator Action" · `simulator.activity.action` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:244`
- "Camera Configuration" · `simulator.activity.cameraConfiguration` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+Activity.swift:37`
- "Camera Status" · `simulator.activity.cameraStatus` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+Activity.swift:36`
- "No recent activity" · `simulator.activity.empty` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:243`
- "Appearance or Accessibility" · `simulator.activity.interface` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+Activity.swift:39`
- "Appearance Status" · `simulator.activity.interfaceStatus` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+Activity.swift:40`
- "Privacy Status" · `simulator.activity.privacyStatus` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+Activity.swift:32`
- "React Native Reload" · `simulator.activity.reactNativeReload` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+Activity.swift:33`
- "Type Text" · `simulator.activity.typeText` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+Activity.swift:22`
- "Web Inspector Command" · `simulator.activity.webInspectorCommand` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+Activity.swift:68`
- "Web Inspector Highlight" · `simulator.activity.webInspectorHighlight` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+Activity.swift:64`
- "Web Inspector Release" · `simulator.activity.webInspectorRelease` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+Activity.swift:60`

### simulator · application

- "React Native" · `simulator.application.reactNative` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:197`

### simulator · camera

- "Camera injection uses private Simulator interfaces and may stop working after an Xcode update." · `simulator.camera.experimentalHelp` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:336`

### simulator · control

- "Xcode returned an unexpected installed-application list." · `simulator.control.applicationListUnexpected` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/Control/SimulatorControlService+Applications.swift:82`
- "Xcode returned an unreadable installed-application list: %@" · `simulator.control.applicationListUnreadable` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/Control/SimulatorControlService+Applications.swift:70`
- "Camera injection must run inside the isolated Simulator worker." · `simulator.control.cameraRequiresWorker` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/Control/SimulatorControlService+Actions.swift:114`
- "cmux could not create a private clipboard staging file." · `simulator.control.clipboardStagingFailed` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/Control/SimulatorControlService+Applications.swift:320`
- "This action requires correlated execution in the isolated Simulator worker." · `simulator.control.correlatedActionRequiresWorker` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/Control/SimulatorControlService+Actions.swift:74`
- "Xcode returned an unreadable Simulator device list: %@" · `simulator.control.deviceListUnreadable` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/Control/SimulatorControlService+Devices.swift:21`
- "The application environment key '%@' is invalid." · `simulator.control.environmentKeyInvalid` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/Control/SimulatorControlService+Applications.swift:127`
- "Simulator action failed" · `simulator.control.failed` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:339`
- "This live accessibility setting requires the contained in-Simulator helper." · `simulator.control.liveAccessibilityRequiresHelper` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/Control/SimulatorControlService+Settings.swift:98`
- "Latitude must be from -90 through 90 and longitude from -180 through 180." · `simulator.control.locationCoordinateInvalid` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/Control/SimulatorControlService+Location.swift:740`
- "Location route update distance must be positive." · `simulator.control.locationDistanceInvalid` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/Control/SimulatorControlService+Location.swift:433`
- "Location route update interval must be positive." · `simulator.control.locationIntervalInvalid` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/Control/SimulatorControlService+Location.swift:446`
- "A location route needs at least two distinct waypoints and a positive speed." · `simulator.control.locationRouteInvalid` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/Control/SimulatorControlService+Location.swift:758`
- "cmux has no paused location route for this device." · `simulator.control.locationRouteNotPaused` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/Control/SimulatorControlService+Location.swift:544`
- "cmux has no running location route for this device." · `simulator.control.locationRouteNotRunning` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/Control/SimulatorControlService+Location.swift:470`
- "Another client replaced this device's location route." · `simulator.control.locationRouteOwnershipLost` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/Control/SimulatorControlService+Location.swift:1117`
- "The log interval must be positive." · `simulator.control.logIntervalInvalid` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/Control/SimulatorControlService+Capture.swift:42`
- "Native input actions require the isolated Simulator worker." · `simulator.control.nativeInputRequiresWorker` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/Control/SimulatorControlService+Actions.swift:12`
- "Granting or revoking privacy access requires a bundle identifier." · `simulator.control.privacyBundleIdentifierRequired` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/Control/SimulatorControlService+Settings.swift:26`
- "The %1$@ value must be from %2$lld through %3$lld." · `simulator.control.statusBarValueOutOfRange` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/Control/SimulatorControlService+Settings.swift:119`
- "A status bar override needs at least one value." · `simulator.control.statusBarValueRequired` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/Control/SimulatorControlService+Settings.swift:64`

### simulator · device

- "Choose Device" · `simulator.device.choose` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:19`
- "UDID" · `simulator.device.udid` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:220`

### simulator · diagnostic

- "Color Blended Layers" · `simulator.diagnostic.colorBlendedLayers` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:227`
- "Color Copied Images" · `simulator.diagnostic.colorCopiedImages` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:231`
- "Color Misaligned Images" · `simulator.diagnostic.colorMisalignedImages` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:235`
- "Color Offscreen Rendering" · `simulator.diagnostic.colorOffscreenRendering` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:239`

### simulator · failure

- "Accessibility requires a live framebuffer." · `simulator.failure.accessibilityFramebufferRequired` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorWorker/Process/SimulatorWorkerCoordinator+Accessibility.swift:13`
- "The worker could not update the accessibility highlight overlay." · `simulator.failure.accessibilityHighlightFailed` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerClient+Actions.swift:227`
- "An accessibility snapshot is already at capacity." · `simulator.failure.accessibilityRequestBusy` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorWorker/Process/SimulatorWorkerCoordinator+Accessibility.swift:35`
- "The Simulator display changed during accessibility inspection." · `simulator.failure.accessibilitySnapshotStale` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorWorker/Process/SimulatorWorkerCoordinator+Accessibility.swift:94`
- "Accessibility inspection is unavailable" · `simulator.failure.accessibilityUnavailable` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+Activity.swift:119`
- "The Simulator worker could not release camera and inspector ownership of the app." · `simulator.failure.applicationMutationPreparation` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerClient+ApplicationLifecycle.swift:29`
- "The active Xcode worker did not negotiate an isolated camera adapter." · `simulator.failure.cameraAdapterCapability` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerClient+Actions.swift:107`
- "Camera authorization readback rejected an invalid device or bundle identifier." · `simulator.failure.cameraAuthorizationIdentifier` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorWorker/Privacy/SimulatorPrivatePrivacyAdapter+TCC.swift:64`
- "The saved Simulator camera authorization could not be restored." · `simulator.failure.cameraAuthorizationRestore` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/Control/SimulatorControlService+Applications.swift:246`
- "The Simulator camera authorization has an unsupported value and was not changed." · `simulator.failure.cameraAuthorizationUnsupported` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorWorker/Privacy/SimulatorPrivatePrivacyAdapter+TCC.swift:92`
- "Camera cleanup is still running. Retry after it finishes." · `simulator.failure.cameraCleanupPending` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorCameraCleanupCoordinator.swift:71`
- "The isolated worker could not configure the requested camera source and target." · `simulator.failure.cameraConfigurationFailed` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerClient+Actions.swift:300`
- "The worker could not update camera mirroring." · `simulator.failure.cameraMirrorFailed` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerClient+Actions.swift:127`
- "Another cmux Simulator pane already owns the camera feed for this device." · `simulator.failure.cameraOwnershipBusy` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorWorker/Camera/SimulatorCameraOwnershipLock.swift:28`
- "Could not open the Simulator camera ownership lock." · `simulator.failure.cameraOwnershipLockUnavailable` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorWorker/Camera/SimulatorCameraOwnershipLock.swift:19`
- "A synthetic-camera source can only be switched while a camera session is active." · `simulator.failure.cameraSourceInactive` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorWorker/Camera/SimulatorCameraAdapter.swift:350`
- "The isolated worker could not switch the active camera source." · `simulator.failure.cameraSourceSwitch` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerClient+Actions.swift:263`
- "The camera action is unavailable" · `simulator.failure.cameraUnavailable` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+Activity.swift:109`
- "The Simulator command was cancelled." · `simulator.failure.commandCancelled` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/Control/SimulatorBoundedCommandRunner.swift:254`
- "Simulator subprocess output limits must be nonnegative." · `simulator.failure.commandOutputLimit` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/Control/SimulatorLegacyBoundedCommandRunner.swift:25`
- "The Simulator command timed out." · `simulator.failure.commandTimedOut` · `CLI/CMUXCLI+Simulator.swift:443`
- "Could not start the selected Simulator" · `simulator.failure.deviceActivation` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+Activity.swift:90`
- "Could not load Simulator devices" · `simulator.failure.deviceDiscovery` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+Activity.swift:87`
- "Simulator %1$@ changed to %2$@." · `simulator.failure.deviceStateChanged` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorWorker/Process/SimulatorWorkerCoordinator+Lifecycle.swift:347`
- "The Simulator became unavailable before the request was delivered." · `simulator.failure.deviceUnavailableDuringRequest` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerClient+Lifecycle.swift:144`
- "A Simulator worker request reused an active correlation identifier." · `simulator.failure.duplicateWorkerRequest` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerClient+DeferredDelivery.swift:61`
- "The active Xcode worker did not negotiate foreground-app inspection." · `simulator.failure.foregroundCapability` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerClient+Accessibility.swift:41`
- "A foreground-application read is already at capacity." · `simulator.failure.foregroundRequestBusy` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorWorker/Process/SimulatorWorkerCoordinator+Foreground.swift:29`
- "The Simulator changed during foreground-app inspection." · `simulator.failure.foregroundRequestCancelled` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorWorker/Process/SimulatorWorkerCoordinator+Foreground.swift:88`
- "The previous foreground-application read is still unwinding." · `simulator.failure.foregroundRequestUnwinding` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorWorker/Process/SimulatorWorkerCoordinator+Foreground.swift:13`
- "Simulator input is unavailable" · `simulator.failure.inputUnavailable` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Coordinator/SimulatorTextInputSubmissionError.swift:46`
- "The isolated worker could not complete the Simulator action." · `simulator.failure.interactiveActionFailed` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerClient+Actions.swift:48`
- "The location action could not be completed" · `simulator.failure.locationUnavailable` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+Activity.swift:115`
- "The Simulator did not confirm its requested orientation." · `simulator.failure.orientationSynchronization` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerClient+Actions.swift:19`
- "Simulator input exceeded its bounded host queue; held input was released and the worker stopped." · `simulator.failure.outgoingQueueOverflow` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Coordinator/SimulatorPaneCoordinator+Events.swift:57`
- "Private permission changes require an installed application bundle identifier." · `simulator.failure.permissionBundleIdentifierRequired` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerClient+Actions.swift:346`
- "The active Xcode worker did not negotiate a safe adapter for %@." · `simulator.failure.permissionMutationCapability` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerClient+Actions.swift:336`
- "The active Xcode worker did not negotiate permission readback." · `simulator.failure.permissionReadbackCapability` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerClient+Actions.swift:153`
- "The permission action is unavailable" · `simulator.failure.permissionUnavailable` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+Activity.swift:112`
- "The in-Simulator accessibility helper could not apply the requested setting." · `simulator.failure.privateInterfaceSettingFailed` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerClient+Actions.swift:78`
- "The isolated worker could not update %@." · `simulator.failure.privatePermissionFailed` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerClient+Actions.swift:435`
- "The Simulator protocol exceeded its bounded queue." · `simulator.failure.protocolQueueOverflow` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerProcessBox.swift:158`
- "React Native could not be reloaded" · `simulator.failure.reactNativeReload` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+Activity.swift:117`
- "The worker could not reload the foreground React Native application." · `simulator.failure.reactNativeReloadFailed` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerClient+Actions.swift:190`
- "The Simulator renderer stopped" · `simulator.failure.rendererStopped` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Coordinator/SimulatorPaneCoordinator+Lifecycle.swift:69`
- "The Simulator renderer is unavailable" · `simulator.failure.rendererUnavailable` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+Activity.swift:92`
- "The saved Simulator is no longer available. Choose another device." · `simulator.failure.savedDeviceUnavailable` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Coordinator/SimulatorPaneCoordinator+Lifecycle.swift:239`
- "A Simulator event subscriber exceeded its bounded queue." · `simulator.failure.subscriberQueueOverflow` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerClient+Events.swift:111`
- "Simulator permissions are not available yet. Wait for the device to finish starting." · `simulator.failure.tccUnavailable` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorWorker/Privacy/SimulatorPrivatePrivacyAdapter+TCC.swift:27`
- "Enter text to type" · `simulator.failure.textEmpty` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Coordinator/SimulatorTextInputSubmissionError.swift:19`
- "Text is too long to type" · `simulator.failure.textTooLong` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+Activity.swift:101`
- "[one] Text is too long to type (maximum %lld UTF-8 byte) / [other] Text is too long to type (maximum %lld UTF-8 bytes)" · `simulator.failure.textTooLongDetail` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Coordinator/SimulatorTextInputSubmissionError.swift:28`
- "Text contains a character that cannot be typed with a US keyboard" · `simulator.failure.textUnsupported` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+Activity.swift:104`
- "Text contains a character that cannot be typed with a US keyboard (scalar %1$lld: U+%2$@)" · `simulator.failure.textUnsupportedDetail` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Coordinator/SimulatorTextInputSubmissionError.swift:37`
- "The isolated worker could not attach the selected inspector target." · `simulator.failure.webInspectorAttachFailed` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerClient+WebInspector.swift:38`
- "The selected Simulator did not negotiate native Web Inspector access." · `simulator.failure.webInspectorCapability` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerClient+WebInspector.swift:113`
- "The isolated worker rejected the raw inspector command." · `simulator.failure.webInspectorCommandRejected` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerClient+WebInspector.swift:96`
- "The isolated worker could not update the page highlight." · `simulator.failure.webInspectorHighlightFailed` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerClient+WebInspector.swift:73`
- "A Web Inspector command with this id is already pending." · `simulator.failure.webInspectorRequestIDInUse` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Coordinator/SimulatorPaneCoordinator+WebInspectorResponses.swift:27`
- "A Web Inspector command must contain a string or numeric id." · `simulator.failure.webInspectorRequestIDRequired` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Coordinator/SimulatorPaneCoordinator+WebInspectorResponses.swift:16`
- "The Web Inspector response wait was cancelled." · `simulator.failure.webInspectorResponseCancelled` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Coordinator/SimulatorPaneCoordinator+WebInspectorResponses.swift:88`
- "The inspector response stream exceeded its bounded in-flight buffer." · `simulator.failure.webInspectorResponseOverflow` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Coordinator/SimulatorPaneCoordinator+Events.swift:188`
- "The Web Inspector response did not arrive before the bounded deadline." · `simulator.failure.webInspectorResponseTimedOut` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Coordinator/SimulatorPaneCoordinator+WebInspectorResponses.swift:50`
- "The Web Inspector session ended before the response arrived." · `simulator.failure.webInspectorSessionEnded` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Coordinator/SimulatorPaneCoordinator+Events.swift:240`
- "The isolated worker could not attach to the selected Simulator." · `simulator.failure.workerAttachFailed` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerClient.swift:259`
- "The Simulator worker client is permanently stopped." · `simulator.failure.workerClientStopped` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerClient+Events.swift:14`
- "The Simulator worker accepted a command but disconnected before confirming its outcome." · `simulator.failure.workerCommandOutcomeUnknown` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerClient.swift:482`
- "The isolated Simulator worker could not accept a command: %@" · `simulator.failure.workerCommandRejected` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerClient+Lifecycle.swift:506`
- "The Simulator worker failed twice. Recover the pane before retrying." · `simulator.failure.workerCrashFuse` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerClient.swift:435`
- "The isolated Simulator worker failed twice: %@" · `simulator.failure.workerCrashFuseReason` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerClient+Lifecycle.swift:313`
- "The Simulator worker closed its event stream before replying." · `simulator.failure.workerEventStreamClosed` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerClient+Requests.swift:56`
- "The Simulator input queue is at capacity." · `simulator.failure.workerInputQueueBusy` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerClient+DeferredDelivery.swift:106`
- "The Simulator changed while this tool operation was running." · `simulator.failure.workerOperationCancelled` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorWorker/Process/SimulatorWorkerCoordinator+ToolOperations.swift:209`
- "The previous Simulator tool operation is still stopping." · `simulator.failure.workerOperationCancelling` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorWorker/Process/SimulatorWorkerCoordinator+ToolOperations.swift:17`
- "The isolated Simulator tool queue is at capacity." · `simulator.failure.workerOperationQueueBusy` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorWorker/Process/SimulatorWorkerCoordinator+ToolOperations.swift:34`
- "The Simulator tool operation exceeded its bounded deadline." · `simulator.failure.workerOperationTimedOut` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorWorker/Process/SimulatorWorkerCoordinator+ToolOperations.swift:187`
- "The Simulator worker has too many pending requests." · `simulator.failure.workerRequestCapacityExceeded` · `Packages/macOS/CmuxSimulator/Tests/CmuxSimulatorTests/SimulatorLocalizationCatalogTests.swift:22`
- "A Simulator worker request reused an active identifier." · `simulator.failure.workerRequestIdentifierDuplicate` · `Packages/macOS/CmuxSimulator/Tests/CmuxSimulatorTests/SimulatorLocalizationCatalogTests.swift:23`
- "The Simulator worker did not produce a response." · `simulator.failure.workerResponseMissing` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerClient+Requests.swift:77`
- "The Simulator worker did not reply before the bounded deadline." · `simulator.failure.workerResponseTimedOut` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerClient+Requests.swift:67`
- "The Simulator worker stopped before replying." · `simulator.failure.workerStoppedBeforeResponse` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulator/WorkerClient/SimulatorWorkerClient+Requests.swift:41`

### simulator · field

- "Destination Latitude" · `simulator.field.destinationLatitude` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:263`
- "Destination Longitude" · `simulator.field.destinationLongitude` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:264`
- "Latitude" · `simulator.field.latitude` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:261`
- "Longitude" · `simulator.field.longitude` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:262`
- "Privacy Service" · `simulator.field.privacyService` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:278`
- "Speed (m/s)" · `simulator.field.routeSpeed` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:265`

### simulator · file

- "Simulator Recording.mp4" · `simulator.file.videoName` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+Activity.swift:15`

### simulator · location

- "Custom Route" · `simulator.location.custom` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+Location.swift:9`
- "Cupertino • flat ring road" · `simulator.location.preset.applePark.description` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+Location.swift:42`
- "Central Park • 2.5 km" · `simulator.location.preset.centralPark.description` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+Location.swift:51`
- "San Francisco • bridge round-trip" · `simulator.location.preset.goldenGate.description` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+Location.swift:44`
- "Stinson Beach • Steep Ravine + Matt Davis loop" · `simulator.location.preset.mountTam.description` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+Location.swift:47`
- "Pacifica • Devil's Slide round-trip" · `simulator.location.preset.pacificCoast.description` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+Location.swift:54`

### simulator · logs

- "Output truncated at 2 MiB." · `simulator.logs.outputTruncated` · `Packages/macOS/CmuxSimulator/Tests/CmuxSimulatorTests/SimulatorControlServiceTests.swift:1018`

### simulator · privacy

- "Read Status" · `simulator.privacy.read` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:282`

### simulator · statusBar

- "Battery State" · `simulator.statusBar.batteryState` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:307`
- "Cellular Bars" · `simulator.statusBar.cellularBars` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:306`
- "Data Network" · `simulator.statusBar.dataNetwork` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:302`

### simulator · textInput

- "Text to type" · `simulator.textInput.placeholder` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+TextInput.swift:9`

### simulator · textSize

- "Accessibility XXXL" · `simulator.textSize.accessibilityExtraExtraExtraLarge` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:418`
- "Accessibility XXL" · `simulator.textSize.accessibilityExtraExtraLarge` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:417`
- "Accessibility XL" · `simulator.textSize.accessibilityExtraLarge` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:416`
- "Accessibility Large" · `simulator.textSize.accessibilityLarge` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:415`
- "Accessibility Medium" · `simulator.textSize.accessibilityMedium` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:414`
- "XXX Large" · `simulator.textSize.extraExtraExtraLarge` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:413`
- "XX Large" · `simulator.textSize.extraExtraLarge` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:412`
- "Extra Large" · `simulator.textSize.extraLarge` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:411`
- "Extra Small" · `simulator.textSize.extraSmall` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:407`

### simulator · tools

- "Appearance and Status Bar" · `simulator.tools.appearance` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:283`
- "Notifications and Privacy" · `simulator.tools.notificationsAndPrivacy` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:273`
- "Text Input" · `simulator.tools.textInput` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings+TextInput.swift:5`
- "URL and Media" · `simulator.tools.urlAndMedia` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:252`

### simulator · webInspector

- "Choose Target" · `simulator.webInspector.chooseTarget` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:346`
- "Clear Responses" · `simulator.webInspector.clearResponses` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:366`
- "Refresh Targets" · `simulator.webInspector.refreshTargets` · `Packages/macOS/CmuxSimulator/Sources/CmuxSimulatorUI/Views/SimulatorStrings.swift:345`

## debug

### debug · aboutTitlebarDebug

- "Reset About" · `debug.aboutTitlebarDebug.resetAbout` · `Packages/macOS/CmuxAppKitSupportUI/Sources/CmuxAppKitSupportUI/AboutTitlebarDebug/Views/AboutTitlebarDebugView.swift:101`

### debug · bonsplitTabBarDebug

- "Action Lane Border" · `debug.bonsplitTabBarDebug.actionLaneBorder` · `Sources/BonsplitTabBarDebug.swift:252`
- "Action Lane Geometry" · `debug.bonsplitTabBarDebug.actionLaneGeometry` · `Sources/BonsplitTabBarDebug.swift:236`
- "Content fade" · `debug.bonsplitTabBarDebug.contentFade` · `Sources/BonsplitTabBarDebug.swift:239`
- "Copy Config" · `debug.bonsplitTabBarDebug.copyConfig` · `Sources/BonsplitTabBarDebug.swift:278`
- "Fine tune" · `debug.bonsplitTabBarDebug.fineTune` · `Sources/BonsplitTabBarDebug.swift:367`
- "%@ px" · `debug.bonsplitTabBarDebug.pixelsValue` · `Sources/BonsplitTabBarDebug.swift:342`
- "Separator fade frame" · `debug.bonsplitTabBarDebug.separatorFadeFrame` · `Sources/BonsplitTabBarDebug.swift:256`
- "Solid bg extra" · `debug.bonsplitTabBarDebug.solidBgExtra` · `Sources/BonsplitTabBarDebug.swift:244`

### debug · browserProfilePopover

- "Changes apply live to the browser profile popover." · `debug.browserProfilePopover.liveNote` · `Sources/cmuxApp.swift:2200`
- "Tune the profile popover padding live while comparing it against the browser toolbar menu." · `debug.browserProfilePopover.note` · `Sources/cmuxApp.swift:2142`

### debug · cloudSidebarSpacing

- "Machine badge gap" · `debug.cloudSidebarSpacing.badgeGap` · `Sources/Cloud/CloudSidebarDebugLabWindow.swift:152`
- "Browser URL and forwarded port rows" · `debug.cloudSidebarSpacing.browserPorts` · `Sources/Cloud/CloudSidebarDebugLabWindow.swift:261`
- "Copy config" · `debug.cloudSidebarSpacing.copyConfig` · `Sources/Cloud/CloudSidebarDebugLabWindow.swift:165`
- "Detail gap" · `debug.cloudSidebarSpacing.detailGap` · `Sources/Cloud/CloudSidebarDebugLabWindow.swift:153`
- "Disclosure gap" · `debug.cloudSidebarSpacing.disclosureGap` · `Sources/Cloud/CloudSidebarDebugLabWindow.swift:143`
- "Disclosure slot" · `debug.cloudSidebarSpacing.disclosureSlot` · `Sources/Cloud/CloudSidebarDebugLabWindow.swift:142`
- "Displays and resource metrics" · `debug.cloudSidebarSpacing.displaysResources` · `Sources/Cloud/CloudSidebarDebugLabWindow.swift:262`
- "The fixture keeps every section expanded and uses names long enough to exercise truncation, nested rows, and the trailing edge." · `debug.cloudSidebarSpacing.fixtureNotes` · `Sources/Cloud/CloudSidebarDebugLabWindow.swift:174`
- "Icon gap" · `debug.cloudSidebarSpacing.iconGap` · `Sources/Cloud/CloudSidebarDebugLabWindow.swift:151`
- "Icon slot" · `debug.cloudSidebarSpacing.iconSlot` · `Sources/Cloud/CloudSidebarDebugLabWindow.swift:150`
- "Indent / level" · `debug.cloudSidebarSpacing.indent` · `Sources/Cloud/CloudSidebarDebugLabWindow.swift:140`
- "Tune the production outline with long machine, workspace, terminal, browser, and port names. Values apply live to the Cloud sidebar." · `debug.cloudSidebarSpacing.instructions` · `Sources/Cloud/CloudSidebarDebugLabWindow.swift:107`
- "Machine line gap" · `debug.cloudSidebarSpacing.lineGap` · `Sources/Cloud/CloudSidebarDebugLabWindow.swift:155`
- "Long machine and workspace names" · `debug.cloudSidebarSpacing.longNames` · `Sources/Cloud/CloudSidebarDebugLabWindow.swift:259`
- "Long terminal titles" · `debug.cloudSidebarSpacing.longTerminals` · `Sources/Cloud/CloudSidebarDebugLabWindow.swift:260`
- "Production outline preview" · `debug.cloudSidebarSpacing.previewTitle` · `Sources/Cloud/CloudSidebarDebugLabWindow.swift:220`
- "Preview width" · `debug.cloudSidebarSpacing.previewWidth` · `Sources/Cloud/CloudSidebarDebugLabWindow.swift:138`
- "Previewing %@, with spacing overrides below." · `debug.cloudSidebarSpacing.previewing` · `Sources/Cloud/CloudSidebarDebugLabWindow.swift:129`
- "Reset spacing" · `debug.cloudSidebarSpacing.resetSpacing` · `Sources/Cloud/CloudSidebarDebugLabWindow.swift:162`
- "Reset %1$@ to %2$@" · `debug.cloudSidebarSpacing.resetValue` · `Sources/Cloud/CloudSidebarDebugResetButton.swift:13`
- "Resize the preview width to find the first awkward breakpoint. Keep the row readable before making the sidebar wider." · `debug.cloudSidebarSpacing.resizeNotes` · `Sources/Cloud/CloudSidebarDebugLabWindow.swift:263`
- "Row content" · `debug.cloudSidebarSpacing.rowContent` · `Sources/Cloud/CloudSidebarDebugLabWindow.swift:148`
- "Row height" · `debug.cloudSidebarSpacing.rowHeight` · `Sources/Cloud/CloudSidebarDebugLabWindow.swift:139`
- "Stress cases" · `debug.cloudSidebarSpacing.stressCases` · `Sources/Cloud/CloudSidebarDebugLabWindow.swift:257`
- "Trailing gap" · `debug.cloudSidebarSpacing.trailingGap` · `Sources/Cloud/CloudSidebarDebugLabWindow.swift:154`
- "Trailing inset" · `debug.cloudSidebarSpacing.trailingInset` · `Sources/Cloud/CloudSidebarDebugLabWindow.swift:141`
- "Machine vertical pad" · `debug.cloudSidebarSpacing.verticalPadding` · `Sources/Cloud/CloudSidebarDebugLabWindow.swift:156`
- "%d pt" · `debug.cloudSidebarSpacing.widthPoints` · `Sources/Cloud/CloudSidebarDebugLabWindow.swift:222`

### debug · devBuildBanner

- "Controls the red debug-build label below the sidebar footer." · `debug.devBuildBanner.description` · `Sources/InternalFlagsWindow.swift:92`
- "Show Dev Build Banner" · `debug.devBuildBanner.show` · `Sources/InternalFlagsWindow.swift:87`

### debug · devWindowDisplay

- "Clear (system default)" · `debug.devWindowDisplay.clear` · `Sources/DevWindowDisplayDebugWindow.swift:90`
- "Current: (system default)" · `debug.devWindowDisplay.currentNone` · `Sources/DevWindowDisplayDebugWindow.swift:119`
- "New DEBUG cmux windows open on the selected display. Shared across all tagged dev builds; applied at window creation." · `debug.devWindowDisplay.description` · `Sources/DevWindowDisplayDebugWindow.swift:58`

### debug · menu

- "Browser Toolbar Button Spacing" · `debug.menu.browserToolbarButtonSpacing` · `Sources/cmuxApp.swift:814`
- "Feed Question (4 Options)" · `debug.menu.notification.feedQuestion4` · `Sources/NotificationDebugEmitter.swift:311`
- "Feed Question (Many Options)" · `debug.menu.notification.feedQuestionMany` · `Sources/NotificationDebugEmitter.swift:317`
- "Feed Question (Multi-select)" · `debug.menu.notification.feedQuestionMultiSelect` · `Sources/NotificationDebugEmitter.swift:313`
- "Feed Question (Multiple)" · `debug.menu.notification.feedQuestionMultiple` · `Sources/NotificationDebugEmitter.swift:315`

### debug · notification

- "Unknown kind or no notification target" · `debug.notification.error.invalidKindOrTarget` · `Sources/TerminalController.swift:3091`
- "Pass enabled=true or enabled=false to turn notification debug mode on or off." · `debug.notification.error.missingEnabled` · `Sources/TerminalController.swift:3063`
- "Pass kind=<notification kind> to choose which debug notification to emit." · `debug.notification.error.missingKind` · `Sources/TerminalController.swift:3076`
- "Inspect the notification and verify the actions." · `debug.notification.synthetic.plan` · `Sources/NotificationDebugEmitter.swift:215`
- "Choose a notification debug answer" · `debug.notification.synthetic.question` · `Sources/NotificationDebugEmitter.swift:246`

### debug · sidebarFooterIconBalance

- "Tune each icon live, compare sharp and squint previews, then use the cards to explore Help weights." · `debug.sidebarFooterIconBalance.description` · `Sources/cmuxApp.swift:2772`
- "Help icon" · `debug.sidebarFooterIconBalance.helpIcon` · `Sources/cmuxApp.swift:2875`
- "Hover intensity" · `debug.sidebarFooterIconBalance.hoverIntensity` · `Sources/cmuxApp.swift:3119`
- "Hover preview" · `debug.sidebarFooterIconBalance.hoverPreview` · `Sources/cmuxApp.swift:3172`
- "Icon sizes" · `debug.sidebarFooterIconBalance.iconSizes` · `Sources/cmuxApp.swift:2923`
- "Optical balance" · `debug.sidebarFooterIconBalance.opticalBalance` · `Sources/cmuxApp.swift:3004`
- "Profile display" · `debug.sidebarFooterIconBalance.profileDisplay` · `Sources/cmuxApp.swift:2813`
- "Profile icon" · `debug.sidebarFooterIconBalance.profileIcon` · `Sources/cmuxApp.swift:2842`
- "Cell guides show geometric alignment; the squint preview compares optical weight." · `debug.sidebarFooterIconBalance.referenceNote` · `Sources/cmuxApp.swift:2780`
- "Reset Selection" · `debug.sidebarFooterIconBalance.reset` · `Sources/cmuxApp.swift:2793`
- "Show 22 pt cell guides" · `debug.sidebarFooterIconBalance.showCellGuides` · `Sources/cmuxApp.swift:3028`
- "Squint radius" · `debug.sidebarFooterIconBalance.squintRadius` · `Sources/cmuxApp.swift:3013`

### debug · splitButtonLayout

- "Always Show Hover State" · `debug.splitButtonLayout.alwaysHover` · defined but unused
- "Backdrop Options" · `debug.splitButtonLayout.backdropOptions` · defined but unused
- "Caret Segment" · `debug.splitButtonLayout.caretSegment` · defined but unused
- "Forced Hover Segment" · `debug.splitButtonLayout.hoverSegment` · defined but unused
- "Inner Padding and Width" · `debug.splitButtonLayout.innerPadding` · defined but unused
- "Changes apply live." · `debug.splitButtonLayout.liveNote` · defined but unused
- "controlBackgroundColor" · `debug.splitButtonLayout.option.controlBackground` · defined but unused
- "Pre-composited barBackground" · `debug.splitButtonLayout.option.precompositedBar` · defined but unused
- "barBackground (tab chrome)" · `debug.splitButtonLayout.option.rawBar` · defined but unused
- "Raw paneBackground (opaque)" · `debug.splitButtonLayout.option.rawPane` · defined but unused
- "Translucent chrome" · `debug.splitButtonLayout.option.translucentChrome` · defined but unused
- "windowBackgroundColor" · `debug.splitButtonLayout.option.windowBackground` · defined but unused
- "[one] Plus clicks: %d / [other] Plus clicks: %d" · `debug.splitButtonLayout.plusClicks` · defined but unused
- "Plus Segment" · `debug.splitButtonLayout.plusSegment` · defined but unused
- "Reset Padding and Widths" · `debug.splitButtonLayout.resetPadding` · defined but unused
- "Section Width" · `debug.splitButtonLayout.sectionWidth` · defined but unused
- "Button Backdrop Color" · `debug.splitButtonLayout.title` · defined but unused
- "Caret Width Offset" · `debug.splitButtonLayout.width.caretOffset` · defined but unused
- "Plus Width Offset" · `debug.splitButtonLayout.width.plusOffset` · defined but unused

### debug · startupAppearance

- "Reloads the running app through Ghostty config update, matching startup theme resolution without editing config files." · `debug.startupAppearance.applied.help` · `Sources/cmuxApp.swift:4758`
- "Force Dark" · `debug.startupAppearance.mode.dark` · `Sources/cmuxApp.swift:4614`
- "Force Light" · `debug.startupAppearance.mode.light` · `Sources/cmuxApp.swift:4609`
- "Stored App Setting" · `debug.startupAppearance.mode.stored` · `Sources/cmuxApp.swift:4604`
- "No user Ghostty settings, so cmux applies its managed default colors." · `debug.startupAppearance.profile.freshInstall.detail` · `Sources/GhosttyStartupAppearancePreviewProfile.swift:52`
- "Loads your actual Ghostty and cmux config files." · `debug.startupAppearance.profile.realUserConfig.detail` · `Sources/GhosttyStartupAppearancePreviewProfile.swift:47`
- "Simulates a user with direct terminal color settings and no theme." · `debug.startupAppearance.profile.userExplicitColors.detail` · `Sources/GhosttyStartupAppearancePreviewProfile.swift:67`
- "Simulates a user with one Ghostty theme applied in both appearances." · `debug.startupAppearance.profile.userSingleTheme.detail` · `Sources/GhosttyStartupAppearancePreviewProfile.swift:62`
- "Simulates a user with an explicit light/dark Ghostty theme." · `debug.startupAppearance.profile.userThemePair.detail` · `Sources/GhosttyStartupAppearancePreviewProfile.swift:57`
- "Loads real user config files." · `debug.startupAppearance.realConfigFallback` · `Sources/cmuxApp.swift:4784`

### debug · tabBarBackdropLab

- "End opacity" · `debug.tabBarBackdropLab.candidateEnd` · defined but unused
- "Candidate fade" · `debug.tabBarBackdropLab.candidateFade` · defined but unused
- "Lead opacity" · `debug.tabBarBackdropLab.candidateLead` · defined but unused
- "Ramp start" · `debug.tabBarBackdropLab.candidateRamp` · defined but unused
- "Candidate softness" · `debug.tabBarBackdropLab.candidateSoftness` · `Sources/cmuxApp.swift:4102`
- "Solid width" · `debug.tabBarBackdropLab.candidateSolid` · defined but unused
- "Mask tabs" · `debug.tabBarBackdropLab.maskTabs` · defined but unused
- "Surface opacity" · `debug.tabBarBackdropLab.opacity` · `Sources/cmuxApp.swift:4088`
- "Live Bonsplit tab bars with overflow tabs under the split buttons. The window background is transparent." · `debug.tabBarBackdropLab.subtitle` · `Sources/cmuxApp.swift:4081`
- "agent-browser logs" · `debug.tabBarBackdropLab.tab.agentBrowserLogs` · `Sources/cmuxApp.swift:4305`
- "split button backdrop check" · `debug.tabBarBackdropLab.tab.backdropCheck` · `Sources/cmuxApp.swift:4308`
- "tabs hidden below controls" · `debug.tabBarBackdropLab.tab.hiddenBelowControls` · `Sources/cmuxApp.swift:4310`
- "right edge overflow sample" · `debug.tabBarBackdropLab.tab.rightEdgeOverflow` · `Sources/cmuxApp.swift:4309`
- "cmux terminal transparency" · `debug.tabBarBackdropLab.tab.terminalTransparency` · `Sources/cmuxApp.swift:4306`
- "underlay tab text visible here" · `debug.tabBarBackdropLab.tab.underlayText` · `Sources/cmuxApp.swift:4307`
- "drag / resize / compare the transparent edges" · `debug.tabBarBackdropLab.terminal.compare` · `Sources/cmuxApp.swift:4393`
- "tab titles intentionally overflow under the split buttons" · `debug.tabBarBackdropLab.terminal.overflow` · `Sources/cmuxApp.swift:4391`
- "lawrence in ~/cmux" · `debug.tabBarBackdropLab.terminal.prompt` · `Sources/cmuxApp.swift:4389`
- "workspace@lab:~" · `debug.tabBarBackdropLab.titlebarSample` · `Sources/cmuxApp.swift:4219`
- "Translucent chrome with tab occlusion." · `debug.tabBarBackdropLab.variant.candidate.detail` · `Sources/cmuxApp.swift:3867`
- "Low contrast" · `debug.tabBarBackdropLab.variant.candidateLowContrast` · `Sources/cmuxApp.swift:3933`
- "Lower-opacity solid region." · `debug.tabBarBackdropLab.variant.candidateLowContrast.detail` · `Sources/cmuxApp.swift:3934`
- "Soft end" · `debug.tabBarBackdropLab.variant.candidateSoftEnd` · `Sources/cmuxApp.swift:3895`
- "Same mask with lighter button fill." · `debug.tabBarBackdropLab.variant.candidateSoftEnd.detail` · `Sources/cmuxApp.swift:3896`
- "Tight edge" · `debug.tabBarBackdropLab.variant.candidateTightEdge` · `Sources/cmuxApp.swift:3914`
- "More coverage at the fade start." · `debug.tabBarBackdropLab.variant.candidateTightEdge.detail` · `Sources/cmuxApp.swift:3915`
- "Wide fade" · `debug.tabBarBackdropLab.variant.candidateWideFade` · `Sources/cmuxApp.swift:3876`
- "Same model with a softer edge." · `debug.tabBarBackdropLab.variant.candidateWideFade.detail` · `Sources/cmuxApp.swift:3877`
- "4 Control background" · `debug.tabBarBackdropLab.variant.controlBackground` · `Sources/cmuxApp.swift:4048`
- "Uses AppKit controlBackgroundColor." · `debug.tabBarBackdropLab.variant.controlBackground.detail` · `Sources/cmuxApp.swift:4049`
- "7 No backdrop" · `debug.tabBarBackdropLab.variant.hidden` · `Sources/cmuxApp.swift:3988`
- "Control sample. Tabs remain visible below the buttons." · `debug.tabBarBackdropLab.variant.hidden.detail` · `Sources/cmuxApp.swift:3989`
- "2 Raw bar opaque" · `debug.tabBarBackdropLab.variant.opaqueBar` · `Sources/cmuxApp.swift:4018`
- "Uses the tab chrome color at full opacity." · `debug.tabBarBackdropLab.variant.opaqueBar.detail` · `Sources/cmuxApp.swift:4019`
- "1 Raw pane opaque" · `debug.tabBarBackdropLab.variant.opaquePane` · `Sources/cmuxApp.swift:4008`
- "Forces the pane fill to full opacity." · `debug.tabBarBackdropLab.variant.opaquePane.detail` · `Sources/cmuxApp.swift:4009`
- "5 Opaque bar composite" · `debug.tabBarBackdropLab.variant.precompositedBar` · `Sources/cmuxApp.swift:4028`
- "Composites tab chrome over the window background." · `debug.tabBarBackdropLab.variant.precompositedBar.detail` · `Sources/cmuxApp.swift:4029`
- "0 Opaque pane composite" · `debug.tabBarBackdropLab.variant.precompositedPane` · `Sources/cmuxApp.swift:3998`
- "6 Translucent chrome" · `debug.tabBarBackdropLab.variant.translucentChrome` · `Sources/cmuxApp.swift:3952`
- "No fade" · `debug.tabBarBackdropLab.variant.translucentNoFade` · `Sources/cmuxApp.swift:3971`
- "Hard translucent edge for contrast." · `debug.tabBarBackdropLab.variant.translucentNoFade.detail` · `Sources/cmuxApp.swift:3972`
- "3 Window background" · `debug.tabBarBackdropLab.variant.windowBackground` · `Sources/cmuxApp.swift:4038`
- "Uses AppKit windowBackgroundColor." · `debug.tabBarBackdropLab.variant.windowBackground.detail` · `Sources/cmuxApp.swift:4039`
- "Sample width" · `debug.tabBarBackdropLab.width` · `Sources/cmuxApp.swift:4095`

### debug · titlebarLayoutDebug

- "Copy Config" · `debug.titlebarLayoutDebug.copyConfig` · `Sources/TitlebarLayoutDebugWindow.swift:169`
- "Minimum Width" · `debug.titlebarLayoutDebug.minimumWidth` · `Sources/TitlebarLayoutDebugWindow.swift:152`
- "Tab Bar Inset" · `debug.titlebarLayoutDebug.tabBarInset` · `Sources/TitlebarLayoutDebugWindow.swift:142`
- "Titlebar Controls" · `debug.titlebarLayoutDebug.titlebarControls` · `Sources/TitlebarLayoutDebugWindow.swift:109`
- "Titlebar Inset" · `debug.titlebarLayoutDebug.titlebarInset` · `Sources/TitlebarLayoutDebugWindow.swift:137`
- "Traffic Light Insets" · `debug.titlebarLayoutDebug.trafficLights` · `Sources/TitlebarLayoutDebugWindow.swift:134`

## dialog

### dialog · cmuxConfig

- "This project action comes from:\n\n%@\n\nIt will run:\n\n%@" · `dialog.cmuxConfig.confirmCommand.messageWithCommand` · `Sources/CmuxConfigExecutor.swift:322`
- "Run Once" · `dialog.cmuxConfig.confirmCommand.run` · `Sources/CmuxConfigExecutor.swift:332`
- "Run Project Action?" · `dialog.cmuxConfig.confirmCommand.title` · `Sources/CmuxConfigExecutor.swift:318`
- "Trust and Run" · `dialog.cmuxConfig.confirmCommand.trustAndRun` · `Sources/CmuxConfigExecutor.swift:336`
- "A workspace with this name already exists. Close it and create a new one?" · `dialog.cmuxConfig.confirmRestart.message` · `Sources/CmuxConfigExecutor+WorkspaceLaunch.swift:130`
- "Workspace Already Exists" · `dialog.cmuxConfig.confirmRestart.title` · `Sources/CmuxConfigExecutor+WorkspaceLaunch.swift:126`
- "cwd %1$@: %2$@" · `dialog.cmuxConfig.disclosure.cwdCommand` · `Sources/CmuxConfigExecutor+WorkspaceLaunch.swift:43`
- "url: %@" · `dialog.cmuxConfig.disclosure.url` · `Sources/CmuxConfigExecutor+WorkspaceLaunch.swift:47`

### dialog · deleteGroup

- "Delete the group “%@” and close its workspace?" · `dialog.deleteGroup.message.lone` · `Sources/SidebarWorkspaceGroupDialogs.swift:56`
- "Delete the group “%1$@” and close its %#@count2@?" · `dialog.deleteGroup.message.many` · `Sources/SidebarWorkspaceGroupDialogs.swift:68`
- "Delete the group “%@” and close its 2 workspaces?" · `dialog.deleteGroup.message.one` · `Sources/SidebarWorkspaceGroupDialogs.swift:62`
- "Delete this group?" · `dialog.deleteGroup.title` · `Sources/SidebarWorkspaceGroupDialogs.swift:48`

### dialog · deleteWorkspaceLayout

- "Couldn't Delete Workspace Layout" · `dialog.deleteWorkspaceLayout.failedTitle` · `Sources/AppDelegate+WorkspaceActionSave.swift:126`
- "Removes “%1$@” from %2$@. Workspaces it already created stay open." · `dialog.deleteWorkspaceLayout.message` · `Sources/AppDelegate+WorkspaceActionSave.swift:93`

### dialog · enableNotifications

- "Enable Notifications for cmux" · `dialog.enableNotifications.title` · `Sources/TerminalNotificationStore.swift:2727`

### dialog · moveTab

- "Choose a destination for this tab." · `dialog.moveTab.message` · defined but unused
- "New Workspace in Current Window" · `dialog.moveTab.newWorkspaceCurrentWindow` · defined but unused
- "Selected Workspace in New Window" · `dialog.moveTab.selectedWorkspaceNewWindow` · defined but unused

### dialog · renameTab

- "Enter a custom name for this tab." · `dialog.renameTab.message` · defined but unused

### dialog · renameWorkspace

- "Enter a custom name for this workspace." · `dialog.renameWorkspace.message` · `Sources/AppDelegate.swift:14324`

### dialog · saveWorkspaceLayout

- "[one] One or more captured commands are longer than %lld UTF-8 byte and cannot be replayed reliably from a saved layout. Shorten them before saving. / [other] One or more captured commands are longer than %lld UTF-8 bytes and cannot be replayed reliably from a saved layout. Shorten them before saving." · `dialog.saveWorkspaceLayout.commandTooLongMessage` · `Sources/AppDelegate+WorkspaceActionSave.swift:316`
- "Command Too Long to Save" · `dialog.saveWorkspaceLayout.commandTooLongTitle` · `Sources/AppDelegate+WorkspaceActionSave.swift:312`
- "Commands that will be saved and re-run:" · `dialog.saveWorkspaceLayout.commandsHeader` · `Sources/WorkspaceActionSaveDialogAccessory.swift:82`
- "Environment variables whose values will be saved:" · `dialog.saveWorkspaceLayout.envHeader` · `Sources/WorkspaceActionSaveDialogAccessory.swift:100`
- "Couldn't capture the workspace layout. Try again." · `dialog.saveWorkspaceLayout.failedMessage` · `Sources/AppDelegate+WorkspaceActionSave.swift:338`
- "Couldn't Save Workspace Layout" · `dialog.saveWorkspaceLayout.failedTitle` · `Sources/AppDelegate+WorkspaceActionSave.swift:295`
- "Saves this workspace as a reusable layout in %@. It appears in the new-workspace menu and the Command Palette." · `dialog.saveWorkspaceLayout.message` · `Sources/AppDelegate+WorkspaceActionSave.swift:216`
- "[one] %lld panel has no layout representation (previews, viewers, …) and will be left out. / [other] %lld panels have no layout representation (previews, viewers, …) and will be left out." · `dialog.saveWorkspaceLayout.skippedNote` · `Sources/AppDelegate+WorkspaceActionSave.swift:225`
- "Save Workspace Layout" · `dialog.saveWorkspaceLayout.title` · `Sources/AppDelegate+WorkspaceActionSave.swift:212`
- "URLs that will be saved:" · `dialog.saveWorkspaceLayout.urlsHeader` · `Sources/WorkspaceActionSaveDialogAccessory.swift:91`

### dialog · savedLayout

- "Enter a name before saving the layout." · `dialog.savedLayout.error.blankName` · `Sources/ContentView+SavedLayoutCommands.swift:89`
- "The saved layouts file could not be read. Check it and try again." · `dialog.savedLayout.error.corruptFile` · `Sources/ContentView+SavedLayoutCommands.swift:149`
- "A layout with that name already exists." · `dialog.savedLayout.error.duplicateName` · `Sources/ContentView+SavedLayoutCommands.swift:145`
- "That saved layout could not be found." · `dialog.savedLayout.error.notFound` · `Sources/ContentView+SavedLayoutCommands.swift:147`
- "Layout Not Saved" · `dialog.savedLayout.error.title` · `Sources/ContentView+SavedLayoutCommands.swift:88`
- "The saved layout request could not be completed. Try again." · `dialog.savedLayout.error.unknown` · `Sources/ContentView+SavedLayoutCommands.swift:152`
- "A layout named “%@” already exists. Replace it?" · `dialog.savedLayout.overwrite.message` · `Sources/ContentView+SavedLayoutCommands.swift:119`
- "Replace Saved Layout?" · `dialog.savedLayout.overwrite.title` · `Sources/ContentView+SavedLayoutCommands.swift:118`
- "Enter a name for this workspace layout." · `dialog.savedLayout.save.message` · `Sources/ContentView+SavedLayoutCommands.swift:76`

### dialog · sshURL

- "The link included conflicting SSH target fields." · `dialog.sshURL.error.conflictingDestinationParameters` · `Sources/AppDelegate+CmuxSSHURL.swift:975`
- "The link included both title and name. Use only one workspace title field." · `dialog.sshURL.error.conflictingTitleParameters` · `Sources/AppDelegate+CmuxSSHURL.swift:980`
- "The SSH host or user contains unsupported or hidden characters, so cmux refused to use it." · `dialog.sshURL.error.destinationContainsUnsafeCharacters` · `Sources/AppDelegate+CmuxSSHURL.swift:935`
- "The SSH host or user cannot start with a dash." · `dialog.sshURL.error.destinationStartsWithDash` · `Sources/AppDelegate+CmuxSSHURL.swift:940`
- "[one] The SSH target is too long. The maximum length is %lld character. / [other] The SSH target is too long. The maximum length is %lld characters." · `dialog.sshURL.error.destinationTooLong` · `Sources/AppDelegate+CmuxSSHURL.swift:930`
- "The SSH link repeated a parameter: %@" · `dialog.sshURL.error.duplicateParameter` · `Sources/AppDelegate+CmuxSSHURL.swift:985`
- "The SSH link included an invalid boolean value for parameter: %@" · `dialog.sshURL.error.invalidBooleanParameter` · `Sources/AppDelegate+CmuxSSHURL.swift:970`
- "The SSH link included an invalid host key policy for parameter: %@" · `dialog.sshURL.error.invalidHostKeyPolicy` · `Sources/AppDelegate+CmuxSSHURL.swift:965`
- "The SSH link included an invalid integer value for parameter: %@" · `dialog.sshURL.error.invalidIntegerParameter` · `Sources/AppDelegate+CmuxSSHURL.swift:960`
- "The SSH port must be between 1 and 65535." · `dialog.sshURL.error.invalidPort` · `Sources/AppDelegate+CmuxSSHURL.swift:955`
- "The link did not include an SSH host." · `dialog.sshURL.error.missingDestination` · `Sources/AppDelegate+CmuxSSHURL.swift:925`
- "Only one SSH link can be opened at a time." · `dialog.sshURL.error.multipleLinks` · `Sources/AppDelegate+CmuxSSHURL.swift:995`
- "The workspace title contains hidden control or formatting characters, so cmux refused to use it." · `dialog.sshURL.error.titleContainsControlCharacters` · `Sources/AppDelegate+CmuxSSHURL.swift:950`
- "[one] The workspace title is too long. The maximum length is %lld character. / [other] The workspace title is too long. The maximum length is %lld characters." · `dialog.sshURL.error.titleTooLong` · `Sources/AppDelegate+CmuxSSHURL.swift:945`
- "The SSH link included an unsupported parameter: %@" · `dialog.sshURL.error.unsupportedParameter` · `Sources/AppDelegate+CmuxSSHURL.swift:990`
- "cmux ssh exited with status %d." · `dialog.sshURL.launchFailed.exit` · `Sources/AppDelegate+CmuxSSHURL.swift:323`
- "cmux ssh could not be launched." · `dialog.sshURL.launchFailed.launch` · `Sources/AppDelegate+CmuxSSHURL.swift:345`
- "The bundled cmux CLI is missing from this app build." · `dialog.sshURL.launchFailed.missingCLI` · `Sources/AppDelegate+CmuxSSHURL.swift:290`
- "Couldn't Open SSH Link" · `dialog.sshURL.launchFailed.title` · `Sources/AppDelegate+CmuxSSHURL.swift:371`
- "An external link wants to open "%@" in cmux. Do you want to open this SSH workspace?\n\nIf you did not initiate this request, it may represent an attempted attack on your system. Only continue if you explicitly started this action." · `dialog.sshURL.message` · `Sources/AppDelegate+CmuxSSHURL.swift:677`

### dialog · textURL

- "cmux Link Blocked" · `dialog.textURL.blocked.title` · `Sources/AppDelegate+CmuxSSHURL.swift:913`
- "The link repeated a parameter: %@" · `dialog.textURL.error.duplicateParameter` · `Sources/AppDelegate+CmuxSSHURL.swift:1045`
- "The link included an invalid boolean value for parameter: %@" · `dialog.textURL.error.invalidBooleanParameter` · `Sources/AppDelegate+CmuxSSHURL.swift:1040`
- "The link did not include text." · `dialog.textURL.error.missingText` · `Sources/AppDelegate+CmuxSSHURL.swift:1005`
- "Only one cmux external link can be opened at a time." · `dialog.textURL.error.multipleLinks` · `Sources/AppDelegate+CmuxSSHURL.swift:1055`
- "The link name contains hidden control or formatting characters, so cmux refused to use it." · `dialog.textURL.error.nameContainsUnsafeCharacters` · `Sources/AppDelegate+CmuxSSHURL.swift:1025`
- "[one] The link name is too long. The maximum length is %lld character. / [other] The link name is too long. The maximum length is %lld characters." · `dialog.textURL.error.nameTooLong` · `Sources/AppDelegate+CmuxSSHURL.swift:1020`
- "The link text contains unsupported or hidden characters, so cmux refused to use it." · `dialog.textURL.error.textContainsUnsafeCharacters` · `Sources/AppDelegate+CmuxSSHURL.swift:1015`
- "[one] The link text is too long. The maximum length is %lld character. / [other] The link text is too long. The maximum length is %lld characters." · `dialog.textURL.error.textTooLong` · `Sources/AppDelegate+CmuxSSHURL.swift:1010`
- "The link title contains hidden control or formatting characters, so cmux refused to use it." · `dialog.textURL.error.titleContainsUnsafeCharacters` · `Sources/AppDelegate+CmuxSSHURL.swift:1035`
- "[one] The link title is too long. The maximum length is %lld character. / [other] The link title is too long. The maximum length is %lld characters." · `dialog.textURL.error.titleTooLong` · `Sources/AppDelegate+CmuxSSHURL.swift:1030`
- "The link included an unsupported parameter: %@" · `dialog.textURL.error.unsupportedParameter` · `Sources/AppDelegate+CmuxSSHURL.swift:1050`
- "Link type: %@" · `dialog.textURL.kindLabel` · `Sources/AppDelegate+CmuxSSHURL.swift:809`
- "cmux could not send the link text to a terminal." · `dialog.textURL.pasteFailed.message` · `Sources/AppDelegate+CmuxSSHURL.swift:902`
- "A %@:// link is asking cmux to paste a prompt into the current workspace. cmux cannot verify which website or app opened this link.\n\ncmux will paste the text into the terminal and will not press Return. Only continue if you trust this prompt." · `dialog.textURL.prompt.message` · `Sources/AppDelegate+CmuxSSHURL.swift:717`
- "Couldn't Paste Prompt Link" · `dialog.textURL.prompt.pasteFailed.title` · `Sources/AppDelegate+CmuxSSHURL.swift:899`
- "Paste a Prompt From an External Link?" · `dialog.textURL.prompt.title` · `Sources/AppDelegate+CmuxSSHURL.swift:711`
- "A %@:// link is asking cmux to paste rules into the current workspace. cmux cannot verify which website or app opened this link.\n\ncmux will paste the rules into the terminal and will not write files or press Return. Only continue if you trust these rules." · `dialog.textURL.rules.message` · `Sources/AppDelegate+CmuxSSHURL.swift:721`
- "Couldn't Paste Rules Link" · `dialog.textURL.rules.pasteFailed.title` · `Sources/AppDelegate+CmuxSSHURL.swift:900`
- "Paste Rules From an External Link?" · `dialog.textURL.rules.title` · `Sources/AppDelegate+CmuxSSHURL.swift:712`
- "Title: %@" · `dialog.textURL.titleLabel` · `Sources/AppDelegate+CmuxSSHURL.swift:817`

## command

### command · browserDuplicateRight

- "Browser Layout" · `command.browserDuplicateRight.subtitle` · `Sources/ContentView.swift:8252`

### command · browserSplitDown

- "Browser Layout" · `command.browserSplitDown.subtitle` · `Sources/ContentView.swift:8240`

### command · browserSplitRight

- "Browser Layout" · `command.browserSplitRight.subtitle` · `Sources/ContentView.swift:8228`

### command · cloudVM

- "Select a Cloud VM workspace first, then retry this command." · `command.cloudVM.current.missing.message` · `Sources/AppDelegate.swift:8846`
- "No Cloud VM Selected" · `command.cloudVM.current.missing.title` · `Sources/AppDelegate.swift:8845`
- "Retry, or run the Cloud VM command in a terminal to see the full output." · `command.cloudVM.failed.action.generic` · `Sources/CloudVMActionLauncher.swift:79`
- "Reload cmux so its command-line tools are available, then retry. If it still fails, run the Cloud VM command in a terminal and send us the output." · `command.cloudVM.failed.action.launch` · defined but unused
- "Install or reload a fresh cmux build, then retry. You can also run the Cloud VM command in a terminal to see the full error." · `command.cloudVM.failed.action.missingCLI` · defined but unused
- "A label is printable text of at most 64 characters. Retry, or run `cmux vm rename <id> <label>` in a terminal to see the full output." · `command.cloudVM.failed.action.rename` · `Sources/CloudVMActionLauncher.swift:98`
- "Additional technical details are available in logs." · `command.cloudVM.failed.details.hidden` · `Sources/CloudVMActionLauncher.swift:518`
- "The Cloud VM command could not be launched." · `command.cloudVM.failed.launch` · `Sources/CloudVMActionLauncher.swift:405`
- "The bundled cmux CLI is missing from this app build." · `command.cloudVM.failed.missingCLI` · `Sources/CloudVMActionLauncher.swift:298`
- "Couldn't Checkpoint Machine" · `command.cloudVM.failed.title.checkpoint` · `Sources/CloudVMActionLauncher.swift:104`
- "Couldn't Delete Machine" · `command.cloudVM.failed.title.delete` · `Sources/CloudVMActionLauncher.swift:87`
- "Couldn't Fork Machine" · `command.cloudVM.failed.title.fork` · `Sources/CloudVMActionLauncher.swift:109`
- "Couldn't Open Machine" · `command.cloudVM.failed.title.open` · `Sources/CloudVMActionLauncher.swift:129`
- "Couldn't Rename Machine" · `command.cloudVM.failed.title.rename` · `Sources/CloudVMActionLauncher.swift:96`
- "Couldn't Resize Machine" · `command.cloudVM.failed.title.resize` · `Sources/CloudVMActionLauncher.swift:124`
- "Couldn't Restore Checkpoint" · `command.cloudVM.failed.title.restore` · `Sources/CloudVMActionLauncher.swift:114`
- "Couldn't Read Machine Status" · `command.cloudVM.failed.title.status` · `Sources/CloudVMActionLauncher.swift:119`
- "Cloud VM Forked" · `command.cloudVM.fork.result.title` · `Sources/AppDelegate.swift:8916`
- "Fork Cloud VM" · `command.cloudVM.fork.title` · `Sources/ContentView+AuthCommandPalette.swift:109`
- "Cloud VM Handoff" · `command.cloudVM.handoff.result.title` · `Sources/AppDelegate.swift:8924`
- "Cloud VM Ports" · `command.cloudVM.ports.result.title` · `Sources/AppDelegate.swift:8920`
- "Cloud VM Resized" · `command.cloudVM.resize.result.title` · `Sources/Cloud/MachineRowActions.swift:100`
- "Paste a checkpoint or snapshot id to restore." · `command.cloudVM.restore.prompt.message` · `Sources/AppDelegate.swift:9099`
- "snapshot-id" · `command.cloudVM.restore.prompt.placeholder` · `Sources/AppDelegate.swift:9103`
- "Restore Cloud VM" · `command.cloudVM.restore.prompt.title` · `Sources/AppDelegate.swift:9098`
- "Cloud VM Restored" · `command.cloudVM.restore.result.title` · `Sources/AppDelegate.swift:8897`
- "Restore Checkpoint..." · `command.cloudVM.restore.title` · `Sources/ContentView+AuthCommandPalette.swift:121`
- "Cloud VM Checkpoint" · `command.cloudVM.snapshot.result.title` · `Sources/AppDelegate.swift:8918`
- "Checkpoint Cloud VM" · `command.cloudVM.snapshot.title` · `Sources/ContentView+AuthCommandPalette.swift:115`
- "Cloud VM Status" · `command.cloudVM.status.result.title` · `Sources/AppDelegate.swift:8914`
- "Cloud VM Template" · `command.cloudVM.template.result.title` · `Sources/AppDelegate.swift:8926`
- "Cloud VM Tools" · `command.cloudVM.tools.result.title` · `Sources/AppDelegate.swift:8922`

### command · cmuxConfig

- "%@ references missing action '%@'" · `command.cmuxConfig.issue.newWorkspaceActionNotFound.detail` · `Sources/ContentView.swift:8656`
- "%@ must reference a workspace command action" · `command.cmuxConfig.issue.newWorkspaceActionRequiresWorkspaceCommand.detail` · defined but unused
- "%@ references missing command '%@'" · `command.cmuxConfig.issue.newWorkspaceCommandNotFound.detail` · `Sources/ContentView.swift:8660`
- "%@ '%@' must reference a workspace command" · `command.cmuxConfig.issue.newWorkspaceCommandRequiresWorkspace.detail` · `Sources/ContentView.swift:8666`
- "Invalid cmux.json" · `command.cmuxConfig.issue.schemaError.fallback` · `Sources/ContentView.swift:8651`
- "cmux.json Configuration Warning" · `command.cmuxConfig.issue.warning.title` · `Sources/ContentView.swift:8623`

### command · copyPaneID

- "Copy Pane ID" · `command.copyPaneID.title` · `Sources/ContentViewIdentifierCopyCommands.swift:51`

### command · copyPaneLink

- "Copy Pane Link" · `command.copyPaneLink.title` · `Sources/ContentViewIdentifierCopyCommands.swift:58`

### command · copySurfaceID

- "Copy Surface ID" · `command.copySurfaceID.title` · `Sources/ContentViewIdentifierCopyCommands.swift:65`

### command · disableMatchTerminalBackground

- "Disable Match Terminal Background" · `command.disableMatchTerminalBackground.title` · `Sources/ContentView.swift:7627`

### command · disableMinimalMode

- "Disable Minimal Mode" · `command.disableMinimalMode.title` · `Sources/ContentView.swift:7646`

### command · enableMatchTerminalBackground

- "Enable Match Terminal Background" · `command.enableMatchTerminalBackground.title` · `Sources/ContentView.swift:7628`

### command · enableMinimalMode

- "Enable Minimal Mode" · `command.enableMinimalMode.title` · `Sources/ContentView.swift:7637`

### command · forkAgentConversationBottom

- "Fork Conversation to the Bottom" · `command.forkAgentConversationBottom.title` · `Sources/ContentView+ForkAgentConversation.swift:640`

### command · forkAgentConversationNewTab

- "Fork Conversation to New Tab" · `command.forkAgentConversationNewTab.title` · `Sources/ContentView+ForkAgentConversation.swift:642`

### command · forkAgentConversationNewWorkspace

- "Fork Conversation to New Workspace" · `command.forkAgentConversationNewWorkspace.title` · `Sources/ContentView+ForkAgentConversation.swift:644`

### command · forkAgentConversationRight

- "Fork Conversation to the Right" · `command.forkAgentConversationRight.title` · `Sources/ContentView+ForkAgentConversation.swift:634`

### command · forkAgentConversationTop

- "Fork Conversation to the Top" · `command.forkAgentConversationTop.title` · `Sources/ContentView+ForkAgentConversation.swift:638`

### command · installCLI

- "Shell Command: Install 'cmux' in PATH" · `command.installCLI.title` · `Sources/ContentView.swift:7475`

### command · makeDefaultTerminal

- "default,terminal,ssh,launch,services,handler,command,tool,executable" · `command.makeDefaultTerminal.keywords` · `Sources/ContentView.swift:7750`

### command · markTabUnread

- "Mark Tab as Unread" · `command.markTabUnread.title` · `Sources/ContentView.swift:8037`

### command · matchTerminalBackground

- "Choose Sidebar" · `command.matchTerminalBackground.subtitle` · `Sources/ContentView.swift:7630`

### command · newSimulatorPane

- "iPhone and iPad" · `command.newSimulatorPane.subtitle` · `Sources/SimulatorCommandPaletteIntegration.swift:15`

### command · nextTabInPane

- "Tab Navigation" · `command.nextTabInPane.subtitle` · defined but unused
- "Next Tab in Pane" · `command.nextTabInPane.title` · `Sources/ContentView+SurfaceNavigationCommands.swift:22`

### command · nextWorkspace

- "Workspace Navigation" · `command.nextWorkspace.subtitle` · `Sources/ContentView.swift:7898`

### command · openCloudPane

- "Open Cloud as Pane" · `command.openCloudPane.title` · `Sources/ContentView+RightSidebarCommandPalette.swift:210`

### command · openDirectoryDiffViewer

- "Open Directory Diff Viewer" · `command.openDirectoryDiffViewer.title` · `Sources/ContentView.swift:8075`

### command · openFilesPane

- "Open Files as Pane" · `command.openFilesPane.title` · `Sources/ContentView+RightSidebarCommandPalette.swift:204`

### command · openFindPane

- "Open Find as Pane" · `command.openFindPane.title` · `Sources/ContentView+RightSidebarCommandPalette.swift:206`

### command · openGhosttySettings

- "Ghostty Config Files" · `command.openGhosttySettings.subtitle` · `Sources/ContentView.swift:7720`
- "Open Ghostty Settings in TextEdit" · `command.openGhosttySettings.title` · `Sources/ContentView.swift:7715`

### command · previousTabInPane

- "Tab Navigation" · `command.previousTabInPane.subtitle` · defined but unused
- "Previous Tab in Pane" · `command.previousTabInPane.title` · `Sources/ContentView+SurfaceNavigationCommands.swift:34`

### command · previousWorkspace

- "Workspace Navigation" · `command.previousWorkspace.subtitle` · `Sources/ContentView.swift:7907`

### command · surfaceNavigation

- "Surface Navigation" · `command.surfaceNavigation.subtitle` · `Sources/ContentView+SurfaceNavigationCommands.swift:13`

### command · switchExtensionSidebar

- "Choose Sidebar" · `command.switchExtensionSidebar.subtitle` · `Sources/ContentView.swift:7615`

### command · terminalToggleTextBoxInput

- "Toggle TextBox Input" · `command.terminalToggleTextBoxInput.title` · `Sources/ContentView.swift:8358`

### command · toggleFullWidthTab

- "Toggle Full Width Tab" · `command.toggleFullWidthTab.title` · `Sources/ContentView.swift:8535`

### command · uninstallCLI

- "Shell Command: Uninstall 'cmux' from PATH" · `command.uninstallCLI.title` · `Sources/ContentView.swift:7484`

### command · vscodeServeWebRestart

- "Restart VS Code Inline Server" · `command.vscodeServeWebRestart.title` · `Sources/ContentView.swift:8289`

### command · vscodeServeWebStop

- "Stop VS Code Inline Server" · `command.vscodeServeWebStop.title` · `Sources/ContentView.swift:8277`

### command · workspaceStatusAuto

- "Workspace Status: Auto" · `command.workspaceStatusAuto.title` · `Sources/TabItemView+WorkspaceTodo.swift:120`

## cloudTree

### cloudTree · closeWorkspace

- "[one] Its %d terminal is killed with it. / [other] Its %d terminals are killed with it." · `cloudTree.closeWorkspace.message.other` · `Sources/Cloud/CloudTreeNodeActions.swift:371`
- "Close workspace “%@”?" · `cloudTree.closeWorkspace.title` · `Sources/Cloud/CloudTreeNodeActions.swift:368`

### cloudTree · deleteWorkspace

- "Its terminal is killed with it. To keep it, use “Close Workspace” instead — it moves to the Terminals pool." · `cloudTree.deleteWorkspace.message.one` · defined but unused
- "[one] Its %d terminal is killed with it. To keep it, use “Close Workspace” instead — it moves to the Terminals pool. / [other] Its %d terminals are killed with it. To keep them, use “Close Workspace” instead — they move to the Terminals pool." · `cloudTree.deleteWorkspace.message.other` · defined but unused
- "Delete workspace “%@”?" · `cloudTree.deleteWorkspace.title` · defined but unused

### cloudTree · device

- "%lldd ago" · `cloudTree.device.age.days` · `Sources/Cloud/CloudTreeDeviceRow.swift:124`
- "%lldh ago" · `cloudTree.device.age.hours` · `Sources/Cloud/CloudTreeDeviceRow.swift:122`
- "%lldm ago" · `cloudTree.device.age.minutes` · `Sources/Cloud/CloudTreeDeviceRow.swift:118`
- "Offline · seen %@" · `cloudTree.device.status.offlineSince` · `Sources/Cloud/CloudTreeDeviceRow.swift:81`
- "[one] %lld workspace / [other] %lld workspaces" · `cloudTree.device.workspaceCount.other` · `Sources/Cloud/CloudTreeDeviceRowContent.swift:119`

### cloudTree · displays

- "Displays unavailable while the machine sleeps" · `cloudTree.displays.asleep` · `Sources/Cloud/CloudMachineSurfacePresentation.swift:30`
- "No displays available" · `cloudTree.displays.empty` · `Sources/Cloud/CloudMachineSurfacePresentation.swift:36`
- "Couldn’t discover displays. Refresh to retry." · `cloudTree.displays.failed` · `Sources/Cloud/CloudMachineSurfacePresentation.swift:27`
- "Discovering displays…" · `cloudTree.displays.loading` · `Sources/Cloud/CloudMachineSurfacePresentation.swift:24`
- "Display discovery unavailable. Refresh to retry." · `cloudTree.displays.unavailable` · `Sources/Cloud/CloudMachineSurfacePresentation.swift:33`

### cloudTree · error

- "This cmux build has no user-space WireGuard hub, so it cannot reach ports on Cloud machines." · `cloudTree.error.hubUnavailable` · `Sources/Surfaces/CmuxTuiSurfaceProvider+Error.swift:103`
- "The Cloud service returned an unusable preview address. Refresh and retry." · `cloudTree.error.invalidPreviewURL` · `Sources/Surfaces/CmuxTuiSurfaceProvider+Error.swift:98`
- "cmux could not build a local address for this port forward." · `cloudTree.error.localForwardURLUnavailable` · `Sources/Surfaces/CmuxTuiSurfaceProvider+Error.swift:108`
- "Remote workspace %@ has no available terminal placement. Refresh and retry." · `cloudTree.error.remotePlacementUnavailable` · `Sources/Surfaces/CmuxTuiSurfaceProvider+Error.swift:46`
- "Remote tab %@ is no longer available. Refresh and retry." · `cloudTree.error.remoteTabNotFound` · `Sources/Surfaces/CmuxTuiSurfaceProvider+Error.swift:54`
- "Remote workspace %@ is no longer available. Refresh and retry." · `cloudTree.error.remoteWorkspaceNotFound` · `Sources/Surfaces/CmuxTuiSurfaceProvider+Error.swift:38`
- "The remote rename came from a different VM session. Refresh and retry." · `cloudTree.error.renameTerminalGeneration` · `Sources/Surfaces/CmuxTuiSurfaceProviders.swift:1207`
- "This terminal is not open in a remote workspace." · `cloudTree.error.renameTerminalNoView` · `Sources/Surfaces/CmuxTuiSurfaceProviders.swift:1059`
- "Terminal rename changed %1$d of %#@count2@. Another change prevented a safe rollback. Refresh and retry." · `cloudTree.error.renameTerminalPartial` · `Sources/Surfaces/CmuxTuiSurfaceProviders.swift:1220`
- "The remote rename response was invalid. Refresh and retry." · `cloudTree.error.renameTerminalResponse` · `Sources/Surfaces/CmuxTuiSurfaceProviders.swift:1205`
- "The remote rename returned revision %2$llu after revision %1$llu. Refresh and retry." · `cloudTree.error.renameTerminalRevision` · `Sources/Surfaces/CmuxTuiSurfaceProviders.swift:1209`
- "The terminal state could not be refreshed. Try again." · `cloudTree.error.renameTerminalUnavailable` · `Sources/Surfaces/CmuxTuiSurfaceProvider+Error.swift:91`
- "A workspace name cannot be empty." · `cloudTree.error.renameWorkspaceEmptyName` · `Sources/Surfaces/CmuxTuiSurfaceProviders.swift:948`
- "This remote workspace is no longer available." · `cloudTree.error.renameWorkspaceNotFound` · `Sources/Surfaces/CmuxTuiSurfaceProviders.swift:957`
- "The clicked Cloud terminal could not be restored in its workspace." · `cloudTree.error.terminalRestoreFailed` · `Sources/Cloud/CloudTreeTerminalNavigationCoordinator.swift:122`

### cloudTree · killTerminal

- "Kill terminal “%@”?" · `cloudTree.killTerminal.title` · `Sources/Cloud/CloudTreeNodeActions.swift:351`

### cloudTree · link

- "macOS is waiting for you to allow the cmux Cloud Tunnel extension in System Settings › General › Login Items & Extensions." · `cloudTree.link.tunnelAwaitingApproval` · `Sources/Cloud/Tunnel/CloudTunnelStatus.swift:31`
- "This Mac's tunnel to your Cloud VM network could not start: %@" · `cloudTree.link.tunnelFailed` · `Sources/Cloud/Tunnel/CloudTunnelStatus.swift:36`
- "This Mac's tunnel to your Cloud VM network is down; reopen the machine to start it." · `cloudTree.link.tunnelOffAppManaged` · defined but unused
- "This Mac's tunnel is up for a different enrollment — run `cmux vpn up` to switch it." · `cloudTree.link.tunnelStale` · defined but unused
- "This Mac's tunnel to your Cloud VM network is still starting; the machine reconnects on its own." · `cloudTree.link.tunnelStarting` · `Sources/Cloud/Tunnel/CloudTunnelStatus.swift:21`
- "The cmux Cloud Tunnel is stopping…" · `cloudTree.link.tunnelStopping` · `Sources/Cloud/Tunnel/CloudTunnelStatus.swift:26`

### cloudTree · local

- "1 browser" · `cloudTree.local.browserCount.one` · `Sources/Cloud/CloudTreeLocalMachineRowContent.swift:66`
- "[one] %d browser / [other] %d browsers" · `cloudTree.local.browserCount.other` · `Sources/Cloud/CloudTreeLocalMachineRowContent.swift:67`

### cloudTree · menu

- "Copy Surface ID" · `cloudTree.menu.copySurfaceID` · `Sources/Cloud/CloudTreeOutlineView.swift:862`
- "Open as New Workspace" · `cloudTree.menu.openAsNewWorkspace` · defined but unused
- "Open in New Pane" · `cloudTree.menu.openInNewPane` · `Sources/Cloud/CloudTreeOutlineView.swift:845`
- "Open in New Tab" · `cloudTree.menu.openInNewTab` · `Sources/Cloud/CloudTreeOutlineView.swift:836`

### cloudTree · operation

- "Closing on %@…" · `cloudTree.operation.close` · `Sources/Cloud/CloudTreeNodeActions.swift:355`
- "Starting a terminal on %@…" · `cloudTree.operation.newTerminal` · `Sources/Cloud/CloudTreeNodeActions.swift:111`
- "Creating a workspace on %@…" · `cloudTree.operation.newWorkspace` · `Sources/Cloud/CloudTreeNodeActions.swift:342`

### cloudTree · organization

- "Cannot move this item. Choose a current item in the same group and pin section." · `cloudTree.organization.invalidAction` · `Sources/Cloud/Sidebar/TerminalController+CloudSidebar.swift:41`

### cloudTree · pane

- "Couldn’t open %@" · `cloudTree.pane.failed` · `Sources/Surfaces/SurfacePaneFactory.swift:306`
- "This provider cannot open port previews. Do not retry; use `cmux vm exec` inside the machine or choose another machine." · `cloudTree.pane.unsupportedHint` · `Sources/Surfaces/SurfacePaneFactory.swift:315`

### cloudTree · port

- "Ports can only be opened on a cloud machine." · `cloudTree.port.invalidMachine` · `Sources/Surfaces/SurfaceCatalog+CloudPorts.swift:49`
- "No local workspace is showing %@; select a workspace and retry." · `cloudTree.port.noLocalWorkspace` · `Sources/Surfaces/SurfaceCatalog+CloudPorts.swift:10`
- "%@’s provider cannot open machine ports as previews; reach the service from inside the machine with `cmux vm exec %@ -- …`." · `cloudTree.port.unsupported` · `Sources/Surfaces/SurfaceCatalog+CloudPorts.swift:21`

### cloudTree · ports

- "Open the machine to discover ports" · `cloudTree.ports.asleep` · `Sources/Cloud/CloudMachineSurfacePresentation.swift:56`
- "No reachable ports" · `cloudTree.ports.empty` · `Sources/Cloud/CloudMachineSurfacePresentation.swift:62`
- "Couldn’t discover ports. Refresh to retry." · `cloudTree.ports.failed` · `Sources/Cloud/CloudMachineSurfacePresentation.swift:53`
- "Discovering ports…" · `cloudTree.ports.loading` · `Sources/Cloud/CloudMachineSurfacePresentation.swift:50`
- "Port discovery unavailable. Refresh to retry." · `cloudTree.ports.unavailable` · `Sources/Cloud/CloudMachineSurfacePresentation.swift:59`

### cloudTree · renameTerminal

- "Rename “%@”" · `cloudTree.renameTerminal.title` · `Sources/Cloud/CloudTreeNodeActions.swift:393`

### cloudTree · renameWorkspace

- "Rename “%@”" · `cloudTree.renameWorkspace.title` · `Sources/Cloud/CloudTreeNodeActions.swift:383`

### cloudTree · terminal

- "1 more tab in this pane, listed beneath this row. The pane shows this tab." · `cloudTree.terminal.badge.hiddenTabs.help.one` · defined but unused
- "[one] %d more tab in this pane, listed beneath this row. The pane shows this tab. / [other] %d more tabs in this pane, listed beneath this row. The pane shows this tab." · `cloudTree.terminal.badge.hiddenTabs.help.other` · defined but unused
- "×%d" · `cloudTree.terminal.badge.views` · defined but unused
- "Open in a pane" · `cloudTree.terminal.open` · defined but unused
- "1 tab on the machine shows this terminal" · `cloudTree.terminal.views.one` · defined but unused
- "[one] %d tab on the machine shows this terminal / [other] %d tabs on the machine show this terminal" · `cloudTree.terminal.views.other` · `Sources/Cloud/CloudTreeRowContentView.swift:361`
- "No tabs on the machine show this terminal" · `cloudTree.terminal.views.zero` · defined but unused

### cloudTree · workspace

- "1 more tab" · `cloudTree.workspace.hiddenTabs.one` · defined but unused
- "[one] %d more tab / [other] %d more tabs" · `cloudTree.workspace.hiddenTabs.other` · defined but unused
- "[one] %d terminal / [other] %d terminals" · `cloudTree.workspace.terminalCount.other` · `Sources/Cloud/CloudTreeRowContentView.swift:134`

## mobile

### mobile · chat

- "The file contains invalid or damaged media data." · `mobile.chat.artifact.error.corruptMedia` · `Sources/TerminalController+MobileChatArtifacts.swift:500`
- "That file is no longer available on the Mac." · `mobile.chat.artifact.error.fileNotFound` · `Sources/TerminalController+MobileChatArtifacts.swift:419`
- "That file was not referenced by this conversation." · `mobile.chat.artifact.error.forbidden` · `Sources/TerminalController+MobileChatArtifacts.swift:410`
- "cmux couldn't tell which session this gallery belongs to." · `mobile.chat.artifact.error.galleryInvalidParams` · `Sources/TerminalController+MobileChatArtifacts.swift:25`
- "The gallery cursor is invalid." · `mobile.chat.artifact.error.invalidCursor` · `Sources/TerminalController+MobileChatArtifacts.swift:38`
- "cmux couldn't tell which session or file was requested." · `mobile.chat.artifact.error.invalidParams` · `Sources/TerminalController+MobileChatArtifacts.swift:298`
- "The file path is invalid." · `mobile.chat.artifact.error.invalidPath` · `Sources/TerminalController+MobileChatArtifacts.swift:336`
- "Artifact transfer requires an authenticated session." · `mobile.chat.artifact.error.irohTransportUnavailable` · `Sources/TerminalController+MobileChatArtifacts.swift:167`
- "That path is not a folder." · `mobile.chat.artifact.error.notDirectory` · `Sources/TerminalController+MobileChatArtifacts.swift:473`
- "That path is not a regular file." · `mobile.chat.artifact.error.notRegularFile` · `Sources/TerminalController+MobileChatArtifacts.swift:482`
- "cmux does not have permission to read that file." · `mobile.chat.artifact.error.permissionDenied` · `Sources/TerminalController+MobileChatArtifacts.swift:464`
- "The Mac could not create a preview for that file." · `mobile.chat.artifact.error.previewFailed` · `Sources/TerminalController+MobileChatArtifacts.swift:509`
- "The Mac found that file but could not read it." · `mobile.chat.artifact.error.readFailed` · `Sources/TerminalController+MobileChatArtifacts.swift:518`
- "That agent session is no longer available." · `mobile.chat.artifact.error.sessionNotFound` · `Sources/TerminalController+MobileChatArtifacts.swift:392`
- "That session exists, but its file history could not be read." · `mobile.chat.artifact.error.sessionUnavailable` · `Sources/TerminalController+MobileChatArtifacts.swift:401`
- "Artifact transfer is temporarily unavailable." · `mobile.chat.artifact.error.transferUnavailable` · `Sources/TerminalController+MobileChatArtifacts.swift:437`
- "This file type cannot be previewed." · `mobile.chat.artifact.error.unsupportedMedia` · `Sources/TerminalController+MobileChatArtifacts.swift:428`
- "Answer key was not accepted" · `mobile.chat.error.answerNotAccepted` · `Sources/TerminalController+MobileChat.swift:388`
- "Interrupt key was not accepted" · `mobile.chat.error.interruptNotAccepted` · `Sources/TerminalController+MobileChat.swift:355`
- "Agent chat transcript service is not configured" · `mobile.chat.error.serviceUnavailable` · `Sources/TerminalController+MobileChat.swift:26`
- "That agent session is no longer available." · `mobile.chat.error.sessionNotFound` · `Sources/TerminalController+MobileChat.swift:210`
- "The agent's terminal moved. Open it once on your Mac (or send the agent any prompt there), then retry." · `mobile.chat.error.terminalMoved` · `Sources/TerminalController+MobileChat.swift:17`
- "The Mac can't find a transcript file for this conversation. If the agent just started in a project folder, send it a prompt and tap Retry. If it's running in your home directory, it doesn't keep a transcript, so use the Terminal tab to interact." · `mobile.chat.error.transcriptNotReadable` · `Sources/TerminalController+MobileChat.swift:250`

### mobile · pairing

- "Tailscale pairing code. Keep Tailscale connected on both devices. Both devices must be connected to the same Tailscale network." · `mobile.pairing.codeMode.tailscaleDetail` · defined but unused
- "Your terminal workspaces are now syncing to your iPhone. You can close this window." · `mobile.pairing.connected.subtitle` · `Sources/Mobile/Pairing/MobilePairingView+Connected.swift:14`
- "iPhone connected" · `mobile.pairing.connected.title` · `Sources/Mobile/Pairing/MobilePairingView+Connected.swift:12`
- "iOS pairing is off on this Mac. Open Settings and enable iOS pairing to discover this Mac from cmux on your iPhone." · `mobile.pairing.disabled.body` · `Sources/Mobile/Pairing/MobilePairingView.swift:185`
- "Could not start the pairing listener on this Mac." · `mobile.pairing.error.listenerOffline` · `Sources/Mobile/Pairing/MobilePairingModel.swift:194`
- "Could not generate a pairing code. Try again." · `mobile.pairing.error.noTicket` · defined but unused
- "Pairing could not finish. Check your connection and try again." · `mobile.pairing.error.preparationFailed` · `Sources/Mobile/Pairing/MobilePairingModel.swift:326`
- "Download cmux for" · `mobile.pairing.getApp.badge.caption` · `Sources/Mobile/Pairing/MobilePairingView.swift:106`
- "Get cmux for iPhone" · `mobile.pairing.getApp.link` · `Sources/Mobile/Pairing/MobilePairingView.swift:128`
- "Install cmux on your iPhone and sign in with the same account. It connects automatically — no code needed." · `mobile.pairing.irohInstruction` · `Sources/Mobile/Pairing/MobilePairingView.swift:253`
- "Can't scan? Enter this Mac's numeric Tailscale IP and port:" · `mobile.pairing.manual.title` · `Sources/Mobile/Pairing/MobilePairingView.swift:473`
- "Preparing a pairing code…" · `mobile.pairing.preparing` · `Sources/Mobile/Pairing/MobilePairingView.swift:147`
- "Pairing QR code" · `mobile.pairing.qrAccessibilityLabel` · `Packages/macOS/CmuxMobileHost/Sources/CmuxMobileHost/Pairing/MobilePairingQRImageView.swift:35`
- "Pairing code unavailable. Tap Refresh Code." · `mobile.pairing.qrUnavailable` · `Packages/macOS/CmuxMobileHost/Sources/CmuxMobileHost/Pairing/MobilePairingQRImageView.swift:50`
- "Refresh Code" · `mobile.pairing.refresh` · `Sources/Mobile/Pairing/MobilePairingView.swift:312`
- "Get Tailscale" · `mobile.pairing.req.tailscale.get` · `Sources/Mobile/Pairing/MobilePairingView.swift:395`
- "Tailscale is not connected on this Mac. Install it on both devices and connect both to the same Tailscale network." · `mobile.pairing.req.tailscale.missing` · `Sources/Mobile/Pairing/MobilePairingView.swift:385`
- "In cmux on your iPhone, sign in with the same account, choose Tailscale, then scan this code." · `mobile.pairing.scanInstruction` · `Sources/Mobile/Pairing/MobilePairingView.swift:289`
- "Sync your terminal workspaces to your iPhone." · `mobile.pairing.subheading` · `Sources/Mobile/Pairing/MobilePairingView.swift:89`
- "cmux DEMO" · `mobile.pairing.target.demo` · `Sources/Mobile/Pairing/MobilePairingModel.swift:255`
- "cmux DEV %@" · `mobile.pairing.target.dev` · `Sources/Mobile/Pairing/MobilePairingModel.swift:260`
- "cmux INTERNAL" · `mobile.pairing.target.internal` · `Sources/Mobile/Pairing/MobilePairingModel.swift:250`
- "iPhones signed in to your account find this Mac automatically over Iroh — end-to-end encrypted, direct when possible, through a cmux relay when not. No code needed." · `mobile.pairing.transport.iroh.detail` · `Sources/Mobile/Pairing/MobilePairingView.swift:412`
- "Not detected" · `mobile.pairing.transport.status.notDetected` · `Sources/Mobile/Pairing/MobilePairingView.swift:429`
- "Not registered" · `mobile.pairing.transport.status.notRegistered` · `Sources/Mobile/Pairing/MobilePairingView.swift:410`
- "This code pairs over Tailscale instead. Both devices must be connected to the same Tailscale network." · `mobile.pairing.transport.tailscale.detail` · `Sources/Mobile/Pairing/MobilePairingView.swift:431`
- "Waiting for your iPhone…" · `mobile.pairing.waiting` · `Sources/Mobile/Pairing/MobilePairingView.swift:305`

### mobile · panel

- "That file is not currently shown in this panel." · `mobile.panel.artifact.error.forbidden` · `Sources/TerminalController+MobileSurfaces.swift:432`
- "cmux couldn't complete the panel file request." · `mobile.panel.artifact.error.internal` · `Sources/TerminalController+MobileSurfaces.swift:467`
- "cmux couldn't tell which panel or file was requested." · `mobile.panel.artifact.error.invalidParams` · `Sources/TerminalController+MobileSurfaces.swift:365`
- "cmux doesn't recognize that panel file request." · `mobile.panel.artifact.error.methodNotFound` · `Sources/TerminalController+MobileSurfaces.swift:193`
- "That file panel is no longer available." · `mobile.panel.artifact.error.panelNotFound` · `Sources/TerminalController+MobileSurfaces.swift:381`

### mobile · taskComposer

- "Task Composer is disabled on this Mac" · `mobile.taskComposer.error.capabilityDisabled` · `Sources/TerminalController+MobileTaskModels.swift:15`

### mobile · terminal

- "That file is not currently shown in this terminal." · `mobile.terminal.artifact.error.forbidden` · `Sources/TerminalController+MobileTerminalArtifacts.swift:430`
- "cmux couldn't tell which terminal or file was requested." · `mobile.terminal.artifact.error.invalidParams` · `Sources/TerminalController+MobileTerminalArtifacts.swift:339`
- "That terminal is no longer available." · `mobile.terminal.artifact.error.terminalNotFound` · `Sources/TerminalController+MobileTerminalArtifacts.swift:421`

### mobile · workspaceChanges

- "Workspace changes are not enabled on this Mac" · `mobile.workspaceChanges.error.capabilityDisabled` · `Sources/TerminalController+MobileWorkspaceChanges.swift:16`
- "The workspace, path, or revision is missing or invalid" · `mobile.workspaceChanges.error.invalidContentRequest` · `Sources/TerminalController+MobileWorkspaceChanges.swift:439`
- "Missing or invalid path" · `mobile.workspaceChanges.error.invalidPath` · `Sources/TerminalController+MobileWorkspaceChanges.swift:150`
- "A selected workspace identifier is invalid" · `mobile.workspaceChanges.error.invalidWorkspaceIDs` · `Sources/TerminalController+MobileWorkspaceChanges.swift:64`
- "Workspace directory is not a Git repository" · `mobile.workspaceChanges.error.notRepository` · `Sources/TerminalController+MobileWorkspaceChanges.swift:425`
- "Path is not in the workspace changes" · `mobile.workspaceChanges.error.pathNotChanged` · `Sources/TerminalController+MobileWorkspaceChanges.swift:351`
- "Path must stay inside the repository" · `mobile.workspaceChanges.error.pathOutsideRepository` · `Sources/TerminalController+MobileWorkspaceChanges.swift:340`
- "Failed to read workspace diff" · `mobile.workspaceChanges.error.readFailed` · `Sources/TerminalController+MobileWorkspaceChanges.swift:432`
- "Between 1 and 64 workspaces can be requested at once" · `mobile.workspaceChanges.error.workspaceIDsCount` · `Sources/TerminalController+MobileWorkspaceChanges.swift:52`
- "Workspace or effective directory not found" · `mobile.workspaceChanges.error.workspaceUnavailable` · `Sources/TerminalController+MobileWorkspaceChanges.swift:418`

## machines

### machines · (general)

- "Refresh Machines" · `machines.refresh` · `Sources/Cloud/MachinesPanelView.swift:211`

### machines · agent

- "This build is missing the bundled cmux Cloud skill file." · `machines.agent.error.missingSkill` · `Sources/Cloud/CloudAgentSkillLauncher+LauncherError.swift:11`

### machines · delete

- "Delete machine “%@”?" · `machines.delete.title` · `Sources/Cloud/MachineRowActions.swift:235`

### machines · empty

- "[one] Your plan includes %d machine / [other] Your plan includes %d machines" · `machines.empty.planIncludes` · `Sources/Cloud/MachinesPanelView.swift:745`
- "[one] Upgrade to use more than %d machine / [other] Upgrade to use more than %d machines" · `machines.empty.upgrade` · `Sources/Cloud/MachinesPanelView.swift:722`

### machines · freeAccess

- "%#@count1@d %#@count2@h" · `machines.freeAccess.countdown.daysHours` · `Sources/Cloud/MachineSnapshotBuilder.swift:71`
- "%#@count1@h %#@count2@m" · `machines.freeAccess.countdown.hoursMinutes` · `Sources/Cloud/MachineSnapshotBuilder.swift:77`
- "[one] %dm / [other] %dm" · `machines.freeAccess.countdown.minutes` · `Sources/Cloud/MachineSnapshotBuilder.swift:82`
- "Free cloud access · expires today, %@ left" · `machines.freeAccess.expiresToday` · `Sources/Cloud/MachinePlanSnapshot.swift:67`
- "[one] Free plans keep a machine reachable for %d day after it is created. Upgrade to Pro to keep using it. / [other] Free plans keep a machine reachable for %d days after it is created. Upgrade to Pro to keep using it." · `machines.freeAccess.help` · `Sources/Cloud/MachinesControlBarComponents.swift:96`

### machines · managedPolicy

- "Cloud VM access ended because your organization disabled cmux Cloud." · `machines.managedPolicy.disconnectedDetail` · `Sources/AppDelegate.swift:9046`

### machines · menu

- "Increase to %d GiB" · `machines.menu.resizeToGiB` · `Sources/Cloud/CloudTreeResizeMenu.swift:13`
- "Increase to %d vCPUs" · `machines.menu.resizeToVCPUs` · `Sources/Cloud/CloudTreeResizeMenu.swift:23`

### machines · meter

- "%1$d of 1 machine" · `machines.meter.count.single` · `Sources/Cloud/MachinePlanSnapshot.swift:48`
- "[one] %1$d machine / [other] %1$d machines" · `machines.meter.count.unlimited` · `Sources/Cloud/MachinePlanSnapshot.swift:44`
- "[one] Your plan includes %d machine. Upgrade to create more. / [other] Your plan includes %d machines. Upgrade to create more." · `machines.meter.help.atLimit` · `Sources/Cloud/MachinesControlBarComponents.swift:35`
- "Your plan includes 1 machine. Upgrade to create more." · `machines.meter.help.atLimit.single` · `Sources/Cloud/MachinesControlBarComponents.swift:30`
- "Upgrade for more" · `machines.meter.upgrade` · `Sources/Cloud/MachinesControlBarComponents.swift:15`

### machines · new

- "Setup continues in the Machines panel." · `machines.new.background.note.base` · `Sources/Cloud/NewMachineSheet.swift:175`
- "Setting up Base…" · `machines.new.creating.base` · `Sources/Cloud/MachineCreateRequest.swift:104`
- "Machine %1$@ was created, but opening it failed. Open it from the Machines list.\n\n%2$@" · `machines.new.error.createdOpenFailed` · defined but unused
- "The machine could not be created." · `machines.new.error.generic` · `Sources/Cloud/MachineCreateCoordinator.swift:314`
- "cmux could not start the create command. Sign in and try again." · `machines.new.error.launch` · `Sources/Cloud/MachineCreateCoordinator.swift:209`
- "[one] Free plan: this machine stays reachable for %d day. Upgrade to keep it. / [other] Free plan: this machine stays reachable for %d days. Upgrade to keep it." · `machines.new.plan.freeWindow` · `Sources/Cloud/NewMachineModel.swift:385`
- "%1$d of %#@count2@ in use" · `machines.new.plan.multi` · `Sources/Cloud/NewMachineModel.swift:377`
- "%1$d of 1 machine in use" · `machines.new.plan.single` · `Sources/Cloud/NewMachineModel.swift:376`
- "[one] %1$d machine in use / [other] %1$d machines in use" · `machines.new.plan.unlimited` · `Sources/Cloud/NewMachineModel.swift:371`
- "1 machine in use" · `machines.new.plan.unlimited.single` · `Sources/Cloud/NewMachineModel.swift:369`
- "RAM size" · `machines.new.size.accessibilityLabel` · `Sources/Cloud/NewMachineSheet.swift:103`
- "%d GB disk included" · `machines.new.size.detail` · `Sources/Cloud/NewMachineModel.swift:37`
- "%d GB" · `machines.new.size.gb` · `Sources/Cloud/NewMachineModel.swift:45`
- "Choose the memory and disk profile for this machine." · `machines.new.size.help` · `Sources/Cloud/NewMachineSheet.swift:76`
- "%1$@ machines need cmux %2$@." · `machines.new.size.locked.note` · `Sources/Cloud/NewMachineModel.swift:352`
- "%d MB" · `machines.new.size.mb` · `Sources/Cloud/NewMachineModel.swift:396`
- "%1$d GB RAM · %2$d GB disk" · `machines.new.size.menu` · `Sources/Cloud/NewMachineModel.swift:53`
- "No machine size is available for this plan. Close this dialog and reopen it to refresh your plan." · `machines.new.size.noneAllowed` · `Sources/Cloud/NewMachineSheet.swift:19`
- "A cloud computer with devtools and coding agents preinstalled. Its home directory is reset when the machine is recreated." · `machines.new.subtitle` · `Sources/Cloud/NewMachineSheet.swift:61`
- "Base is your persistent cloud machine. Opening it later reuses this same machine; reset Base to start over." · `machines.new.subtitle.base` · `Sources/Cloud/NewMachineSheet.swift:57`

### machines · notification

- "Open it from the Machines list." · `machines.notification.createdOpenFailed.body` · `Sources/Cloud/MachineCreateNotice.swift:44`
- "Retry or dismiss it from the Machines list." · `machines.notification.failed.body` · `Sources/Cloud/MachineCreateNotice.swift:53`

### machines · operation

- "Opening %@’s desktop…" · `machines.operation.openDesktop` · `Sources/Cloud/MachineRowActions.swift:44`
- "Increasing %@ disk to %d GiB…" · `machines.operation.resizeDisk` · `Sources/Cloud/MachineRowActions.swift:68`

### machines · pending

- "Cancel Create" · `machines.pending.cancel` · `Sources/Cloud/CloudTreeRowHoverButtons.swift:46`
- "Copy Error" · `machines.pending.copyError` · `Sources/Cloud/CloudErrorCopy.swift:6`
- "%1$@ was created, but opening it failed: %2$@ Open it from the list." · `machines.pending.createdOpenFailed.bar` · `Sources/Cloud/MachinesPanelViewModel.swift:300`
- "Couldn't create machine" · `machines.pending.failed` · `Sources/Cloud/MachineCreateRequest.swift:112`
- "Couldn't set up Base" · `machines.pending.failed.base` · `Sources/Cloud/MachineCreateRequest.swift:111`
- "%@ did not get created. The command reported:" · `machines.pending.failure.lead` · `Sources/Cloud/MachineCreateRowActions.swift:60`
- "Retry Create" · `machines.pending.retry` · `Sources/Panels/MachineCreateLoadingContent.swift:36`
- "Show Error…" · `machines.pending.showError` · `Sources/Cloud/CloudTreeOutlineView+MachineMenu.swift:66`

### machines · rename

- "The label is display-only. The machine keeps its name as its address." · `machines.rename.message` · `Sources/Cloud/MachineRowActions.swift:195`
- "Rename “%@”" · `machines.rename.title` · `Sources/Cloud/MachineRowActions.swift:192`

### machines · requiresPro

- "This account’s plan doesn’t include Cloud machine access. Upgrade to create and reconnect machines." · `machines.requiresPro.subtitle` · `Sources/Cloud/MachinesPanelView.swift:458`

### machines · row

- "1 day left" · `machines.row.dayLeft` · defined but unused
- "[one] %d day left / [other] %d days left" · `machines.row.daysLeft` · defined but unused

### machines · sessionRejected

- "The Cloud service no longer accepts this Mac’s saved session. Sign out and sign back in to reconnect." · `machines.sessionRejected.subtitle` · `Sources/Cloud/MachinesPanelView.swift:428`

### machines · signOut

- "Cloud VM access ended because cmux signed out." · `machines.signOut.disconnectedDetail` · `Sources/AppDelegate.swift:9041`

### machines · unavailable

- "Cloud unreachable — showing last known" · `machines.unavailable.stale` · `Sources/Cloud/MachinesCloudStatus.swift:26`
- "Your machines are still there. cmux couldn’t reach the Cloud service just now; it retries on its own." · `machines.unavailable.subtitle` · `Sources/Cloud/MachinesPanelView.swift:401`

### machines · usage

- "%1$@ · %2$@ tokens · %3$@" · `machines.usage.line` · `Sources/Cloud/CloudTreeMachineRowContent.swift:92`
- "[one] %dd / [other] %dd" · `machines.usage.period.days` · `Sources/Cloud/CloudTreeMachineRowContent.swift:88`
- "Token usage unavailable" · `machines.usage.unavailable` · `Sources/Cloud/CloudTreeMachineRowContent.swift:80`

### machines · workspace

- "Create a machine with New Cloud Machine, then try again." · `machines.workspace.noMachines` · `Sources/AppDelegate+NewCloudWorkspace.swift:99`

## pricing

### pricing · enterprise

- "Self-host agent execution, air-gapped" · `pricing.enterprise.f1` · defined but unused
- "SSO / SAML, audit logs" · `pricing.enterprise.f2` · defined but unused
- "Self-hosting and compliance." · `pricing.enterprise.note` · defined but unused

### pricing · free

- "Download for Mac" · `pricing.free.cta` · defined but unused
- "Native macOS terminal built on Ghostty, open source" · `pricing.free.f1` · defined but unused
- "Unlimited local terminals and agents" · `pricing.free.f2` · defined but unused
- "5 active Cloud VMs, 20 VM creates" · `pricing.free.f3` · defined but unused
- "The full terminal, forever." · `pricing.free.note` · defined but unused

### pricing · native

- "Centralized admin and shared team rules" · `pricing.native.compare.admin` · `Sources/PricingPlansScreen.swift:887`
- "Local CLI agents with your own keys" · `pricing.native.compare.agents` · `Sources/PricingPlansScreen.swift:797`
- "Unified billing and seat management" · `pricing.native.compare.billing` · `Sources/PricingPlansScreen.swift:860`
- "Cloud agents on Cloud VMs" · `pricing.native.compare.cloud` · `Sources/PricingPlansScreen.swift:815`
- "1 VM trial" · `pricing.native.compare.cloud.free` · `Sources/PricingPlansScreen.swift:816`
- "50 per user" · `pricing.native.compare.concurrent.team` · `Sources/PricingPlansScreen.swift:828`
- "Model gateway: routing and usage analytics" · `pricing.native.compare.gateway` · `Sources/PricingPlansScreen.swift:842`
- "Self-hosted and air-gapped execution" · `pricing.native.compare.selfHosted` · `Sources/PricingPlansScreen.swift:878`
- "SSO and SAML sign-in" · `pricing.native.compare.sso` · `Sources/PricingPlansScreen.swift:869`
- "Native macOS terminal, open source" · `pricing.native.compare.terminal` · `Sources/PricingPlansScreen.swift:788`
- "Usage-based" · `pricing.native.compare.usageBased` · defined but unused
- "Vertical tabs, splits, notifications, socket API" · `pricing.native.compare.workspace` · `Sources/PricingPlansScreen.swift:806`
- "Audit logs and dedicated support" · `pricing.native.enterprise.feature.audit` · `Sources/PricingPlansScreen.swift:646`
- "Self-hosted Cloud execution and networking" · `pricing.native.enterprise.feature.selfHosted` · `Sources/PricingPlansScreen.swift:643`
- "SOC 2 and an SLA" · `pricing.native.enterprise.feature.sla` · `Sources/PricingPlansScreen.swift:647`
- "SSO and SAML sign-in" · `pricing.native.enterprise.feature.sso` · `Sources/PricingPlansScreen.swift:645`
- "Claude Code, Codex, Gemini, and local CLI agents" · `pricing.native.free.feature.agents` · `Sources/PricingPlansScreen.swift:566`
- "Community support on Discord and GitHub" · `pricing.native.free.feature.community` · `Sources/PricingPlansScreen.swift:569`
- "Local session history and one Cloud VM trial" · `pricing.native.free.feature.trial` · `Sources/PricingPlansScreen.swift:568`
- "Vertical tabs, split panes, browser panels, and notifications" · `pricing.native.free.feature.workspaces` · `Sources/PricingPlansScreen.swift:567`
- "40 included VM-hours each month; pauses at the limit" · `pricing.native.go.feature.hours` · `Sources/PricingPlansScreen.swift:584`
- "1 active Cloud VM, 2 vCPU, 4 GiB RAM, 16 GiB disk" · `pricing.native.go.feature.vm` · `Sources/PricingPlansScreen.swift:582`
- "Everything in Pro: 50 Cloud VMs, unlimited workspaces, the iOS app" · `pricing.native.max.feature.pro` · `Sources/PricingPlansScreen.swift:613`
- "Included compute" · `pricing.native.metric.compute` · defined but unused
- "20 hrs/mo" · `pricing.native.metric.compute.value` · defined but unused
- "Extra usage" · `pricing.native.metric.usage` · defined but unused
- "metered" · `pricing.native.metric.usage.value` · defined but unused
- "Default VM" · `pricing.native.metric.vm` · defined but unused
- "4 vCPU / 16 GB" · `pricing.native.metric.vm.value` · defined but unused
- "Up to 50 Cloud VMs, with 24 GB RAM and 6 vCPUs shared across all VMs" · `pricing.native.pro.feature.hours` · `Sources/PricingPlansScreen.swift:598`
- "cmux iOS app and email support" · `pricing.native.pro.feature.ios` · `Sources/PricingPlansScreen.swift:600`
- "Pro includes up to 50 Cloud VMs, with 24 GB RAM and 6 vCPUs shared across all VMs. Team includes the same limits per user. There is no metering or overage billing." · `pricing.native.sizes.body` · `Sources/PricingPlansScreen.swift:1006`
- "Per active hour" · `pricing.native.sizes.colRate` · defined but unused
- "Best for" · `pricing.native.sizes.colUse` · defined but unused
- "Cloud VM resources" · `pricing.native.sizes.title` · `Sources/PricingPlansScreen.swift:1002`
- "Unified billing for the whole team" · `pricing.native.team.feature.billing` · `Sources/PricingPlansScreen.swift:624`
- "Up to 50 Cloud VMs per user, with 24 GB RAM and 6 vCPUs per user shared across all their VMs" · `pricing.native.team.feature.compute` · `Sources/PricingPlansScreen.swift:626`
- "Team-wide model gateway analytics" · `pricing.native.team.feature.gateway` · `Sources/PricingPlansScreen.swift:627`
- "Centralized seat management" · `pricing.native.team.feature.seats` · `Sources/PricingPlansScreen.swift:625`

### pricing · pro

- "Cloud dev boxes: 10 active, unlimited creates" · `pricing.pro.f2` · defined but unused
- "20 compute-hours/mo on a 4 vCPU / 16 GB VM" · `pricing.pro.f3` · defined but unused
- "iOS app: your Mac's terminals on your iPhone" · `pricing.pro.f4` · defined but unused
- "cmux AI early access + priority support" · `pricing.pro.f5` · defined but unused

### pricing · team

- "Everything in Pro for every member" · `pricing.team.f1` · defined but unused
- "Shared team billing" · `pricing.team.f2` · defined but unused
- "Centralized Cloud VM usage" · `pricing.team.f3` · defined but unused
- "Everything in Pro, per seat." · `pricing.team.note` · defined but unused

## feed

### feed · buttonDebug

- "Apply Raycast Glass" · `feed.buttonDebug.applyRaycastGlass` · defined but unused
- "Compact horizontal padding" · `feed.buttonDebug.compactHorizontalPadding` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:1156`
- "Compact radius" · `feed.buttonDebug.compactRadius` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:1138`
- "Compact vertical padding" · `feed.buttonDebug.compactVerticalPadding` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:1162`
- "Glass tint" · `feed.buttonDebug.glassTint` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:1174`
- "Medium horizontal padding" · `feed.buttonDebug.horizontalPadding` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:1150`
- "Button Kind" · `feed.buttonDebug.kind` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:1225`
- "Medium radius" · `feed.buttonDebug.mediumRadius` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:1144`
- "Medium vertical padding" · `feed.buttonDebug.mediumVerticalPadding` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:1168`
- "Glass Neutral" · `feed.buttonDebug.palette.glassNeutral` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:74`
- "Graphite" · `feed.buttonDebug.palette.graphite` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:76`
- "Orchard" · `feed.buttonDebug.palette.orchard` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:80`
- "Clear Glass" · `feed.buttonDebug.preset.clearGlass` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:558`
- "Command Dark" · `feed.buttonDebug.preset.commandDark` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:554`
- "Command Light" · `feed.buttonDebug.preset.commandLight` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:556`
- "Compact Glass" · `feed.buttonDebug.preset.compactGlass` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:560`
- "Frosted Outline" · `feed.buttonDebug.preset.frostedOutline` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:550`
- "Hairline Glass" · `feed.buttonDebug.preset.hairlineGlass` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:568`
- "Halo Glow" · `feed.buttonDebug.preset.haloGlow` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:552`
- "Liquid Mono" · `feed.buttonDebug.preset.liquidMono` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:564`
- "Minimal Flat" · `feed.buttonDebug.preset.minimalFlat` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:570`
- "Native Blue" · `feed.buttonDebug.preset.nativeBlue` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:562`
- "Native Glass" · `feed.buttonDebug.preset.nativeGlass` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:544`
- "Prominent Glass" · `feed.buttonDebug.preset.nativeProminentGlass` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:546`
- "Soft Halo" · `feed.buttonDebug.preset.softHalo` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:566`
- "Solid Classic" · `feed.buttonDebug.preset.solidClassic` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:536`
- "Standard Liquid Glass" · `feed.buttonDebug.preset.standardLiquidGlass` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:540`
- "Tinted Liquid Glass" · `feed.buttonDebug.preset.tintedLiquidGlass` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:542`
- "Native Glass" · `feed.buttonDebug.section.nativeGlass` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:825`
- "Command Light" · `feed.buttonDebug.style.commandLight` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:43`
- "Halo" · `feed.buttonDebug.style.halo` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:39`
- "Native Glass" · `feed.buttonDebug.style.nativeGlass` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:33`
- "Prominent Glass" · `feed.buttonDebug.style.nativeProminentGlass` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:35`
- "Standard Glass" · `feed.buttonDebug.style.standardGlass` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:29`
- "Standard Tinted Glass" · `feed.buttonDebug.style.standardTintedGlass` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:31`
- "Tune every Feed button kind live." · `feed.buttonDebug.subtitle` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:916`
- "Feed Buttons" · `feed.buttonDebug.title` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:912`
- "Variations" · `feed.buttonDebug.variations` · `Sources/Feed/FeedButtonStyleDebugWindowController.swift:1114`

### feed · exitplan

- "Plan file" · `feed.exitplan.planFile` · `Sources/Feed/FeedPanelView.swift:2413`

### feed · push

- "feed.push accepts either `event` or `events`, not both" · `feed.push.error.exclusiveEventShape` · `Sources/TerminalController+FeedAcknowledgment.swift:224`
- "feed.push requires an `event` object" · `feed.push.error.requiresEvent` · `Sources/TerminalController+FeedAcknowledgment.swift:231`

### feed · textEditorDebug

- "Type several lines here..." · `feed.textEditorDebug.placeholder` · `Sources/Feed/FeedTextEditorDebugWindowController.swift:81`
- "Compare autosizing editors with identical input." · `feed.textEditorDebug.subtitle` · `Sources/Feed/FeedTextEditorDebugWindowController.swift:132`
- "Feed Text Editors" · `feed.textEditorDebug.title` · `Sources/Feed/FeedTextEditorDebugWindowController.swift:129`
- "AppKit Direct, intrinsic" · `feed.textEditorDebug.variant.appKitDirectIntrinsic` · `Sources/Feed/FeedTextEditorDebugWindowController.swift:59`
- "AppKit Direct, sizeThatFits" · `feed.textEditorDebug.variant.appKitDirectSize` · `Sources/Feed/FeedTextEditorDebugWindowController.swift:57`
- "AppKit ScrollView, measured" · `feed.textEditorDebug.variant.appKitScrollMeasured` · `Sources/Feed/FeedTextEditorDebugWindowController.swift:63`
- "AppKit ScrollView, sizeThatFits" · `feed.textEditorDebug.variant.appKitScrollSize` · `Sources/Feed/FeedTextEditorDebugWindowController.swift:61`
- "SwiftUI Mirror TextEditor" · `feed.textEditorDebug.variant.swiftUIMirror` · `Sources/Feed/FeedTextEditorDebugWindowController.swift:55`
- "SwiftUI TextField" · `feed.textEditorDebug.variant.swiftUITextField` · `Sources/Feed/FeedTextEditorDebugWindowController.swift:53`

### feed · todos

- "[one] %lld in progress / [other] %lld in progress" · `feed.todos.summary.inProgress` · `Sources/Feed/FeedPanelView.swift:3855`
- "[one] %lld open / [other] %lld open" · `feed.todos.summary.open` · `Sources/Feed/FeedPanelView.swift:3858`

## sidebar

### sidebar · agentActivity

- "[one] Loading (%lld active task) / [other] Loading (%lld active tasks)" · `sidebar.agentActivity.tooltip.many` · `Sources/Sidebar/SidebarWorkspaceStatusSlots.swift:9`

### sidebar · cloudWorkspace

- "Cloud workspace on %@" · `sidebar.cloudWorkspace.label` · `Sources/Cloud/CloudWorkspaceSidebarPresentation.swift:41`

### sidebar · custom

- "Sidebar error" · `sidebar.custom.error` · `Packages/macOS/CmuxSwiftRenderUI/Sources/CmuxSwiftRenderUI/Sidebar/CustomSidebarContentView.swift:130`
- "Sidebar file is empty or missing." · `sidebar.custom.missing` · `Packages/macOS/CmuxSwiftRenderUI/Sources/CmuxSwiftRenderUI/Sidebar/CustomSidebarContentView.swift:62`

### sidebar · extension

- "Create worktree" · `sidebar.extension.createWorktree` · `Sources/ContentView.swift:13951`

### sidebar · extensions

- "%@ is using metadata-only access until you grant its requested data and actions." · `sidebar.extensions.access.detail` · `Sources/CMUXInstalledExtensionSidebarHostView.swift:801`
- "Surface could not be created" · `sidebar.extensions.action.surfaceCreateRejected` · `Sources/ContentView.swift:13301`
- "Select workspaces" · `sidebar.extensions.actionScope.selectWorkspace` · `Sources/CMUXInstalledExtensionSidebarHostView.swift:1105`
- "CMUX lost the extension connection. No workspace data or actions are being shared." · `sidebar.extensions.blocked.detail.connectionInterrupted` · `Sources/CMUXInstalledExtensionSidebarHostView.swift:675`
- "Open larger" · `sidebar.extensions.browser.compact` · `Sources/CMUXSidebarExtensionBrowserPanel.swift:119`
- "Choose Extension" · `sidebar.extensions.choose.action` · `Sources/CMUXInstalledExtensionSidebarHostView.swift:445`
- "Choose which enabled extension should replace the sidebar." · `sidebar.extensions.choose.detail` · `Sources/CMUXInstalledExtensionSidebarHostView.swift:397`
- "Show extension details" · `sidebar.extensions.details.help` · `Sources/CMUXInstalledExtensionSidebarHostView.swift:498`
- "A sidebar extension is installed but disabled." · `sidebar.extensions.disabled.detail` · `Sources/CMUXInstalledExtensionSidebarHostView.swift:415`
- "Install and enable a CMUX sidebar extension to show it here." · `sidebar.extensions.empty.detail` · `Sources/CMUXInstalledExtensionSidebarHostView.swift:402`
- "Loading sidebar extensions" · `sidebar.extensions.loading` · `Sources/CMUXInstalledExtensionSidebarHostView.swift:294`
- "Close workspaces from the extension" · `sidebar.extensions.permission.closeWorkspace.detail` · `Sources/CMUXInstalledExtensionSidebarHostView.swift:982`
- "Create workspaces for specific local folders" · `sidebar.extensions.permission.createWorkspaceWithPath.detail` · `Sources/CMUXInstalledExtensionSidebarHostView.swift:1000`
- "Read listening ports for each workspace" · `sidebar.extensions.permission.networkPorts.detail` · `Sources/CMUXInstalledExtensionSidebarHostView.swift:969`
- "Read latest workspace notifications" · `sidebar.extensions.permission.notifications.detail` · `Sources/CMUXInstalledExtensionSidebarHostView.swift:967`
- "Open links from the extension" · `sidebar.extensions.permission.openURL.detail` · `Sources/CMUXInstalledExtensionSidebarHostView.swift:998`
- "Read pull request links associated with workspaces" · `sidebar.extensions.permission.pullRequests.detail` · `Sources/CMUXInstalledExtensionSidebarHostView.swift:971`
- "Select a workspace when you click in the extension" · `sidebar.extensions.permission.selectWorkspace.detail` · `Sources/CMUXInstalledExtensionSidebarHostView.swift:980`
- "Read workspace names, branches, unread counts, and selection" · `sidebar.extensions.permission.workspaceMetadata.detail` · `Sources/CMUXInstalledExtensionSidebarHostView.swift:961`
- "Read local workspace and project paths" · `sidebar.extensions.permission.workspacePaths.detail` · `Sources/CMUXInstalledExtensionSidebarHostView.swift:965`
- "An installed sidebar extension needs approval before CMUX can use it." · `sidebar.extensions.unapproved.detail` · `Sources/CMUXInstalledExtensionSidebarHostView.swift:410`
- "Use Default" · `sidebar.extensions.useDefault.short` · `Sources/CMUXInstalledExtensionSidebarHostView.swift:467`

### sidebar · help

- "Feedback is unavailable right now. Email founders@manaflow.com instead." · `sidebar.help.feedback.endpointError` · `Packages/macOS/CmuxFeedback/Sources/CmuxFeedback/ComposerUI/Composer/SidebarFeedbackComposerSheet.swift:354`
- "Your message is too long." · `sidebar.help.feedback.messageTooLong` · `Packages/macOS/CmuxFeedback/Sources/CmuxFeedback/ComposerUI/Composer/SidebarFeedbackComposerSheet.swift:303`
- "You can also reach us at founders@manaflow.com." · `sidebar.help.feedback.note` · `Packages/macOS/CmuxFeedback/Sources/CmuxFeedback/ComposerUI/Composer/SidebarFeedbackComposerSheet.swift:90`
- "Too many feedback attempts. Please try again later." · `sidebar.help.feedback.rateLimited` · `Packages/macOS/CmuxFeedback/Sources/CmuxFeedback/ComposerUI/Composer/SidebarFeedbackComposerSheet.swift:399`
- "You can also reach us at founders@manaflow.com." · `sidebar.help.feedback.successBody` · `Packages/macOS/CmuxFeedback/Sources/CmuxFeedback/ComposerUI/Composer/SidebarFeedbackComposerSheet.swift:67`
- "You can attach up to 10 images." · `sidebar.help.feedback.tooManyImages` · `Packages/macOS/CmuxFeedback/Sources/CmuxFeedback/ComposerUI/Composer/SidebarFeedbackComposerSheet.swift:251`
- "Check your message and attachments, then try again." · `sidebar.help.feedback.validationError` · `Packages/macOS/CmuxFeedback/Sources/CmuxFeedback/ComposerUI/Composer/SidebarFeedbackComposerSheet.swift:393`

### sidebar · metadata

- "Show less details" · `sidebar.metadata.showLessDetails` · `Sources/ContentView.swift:17155`

### sidebar · pro

- "Hide the Pro badge" · `sidebar.pro.badge.dismiss` · `Sources/ProBadgeStyle.swift:255`

### sidebar · provider

- "Default Workspaces" · `sidebar.provider.default.title` · `Packages/macOS/CmuxSidebarProviderKit/Sources/CmuxSidebarProviderKit/CmuxSidebarProviderDescriptor.swift:37`
- "Extension Sidebar" · `sidebar.provider.extensions.title` · `Sources/CMUXInstalledExtensionSidebarHostView.swift:517`

### sidebar · remote

- "Remote connecting to %@" · `sidebar.remote.help.connecting` · `Sources/SidebarWorkspaceSnapshotFactory.swift:214`
- "Remote reconnecting to %@" · `sidebar.remote.help.reconnecting` · `Sources/SidebarWorkspaceSnapshotFactory.swift:216`
- "SSH host %@ is unreachable. Automatic reconnect is paused — use Reconnect to retry." · `sidebar.remote.help.suspended` · `Sources/SidebarWorkspaceSnapshotFactory.swift:234`
- "Remote • %@" · `sidebar.remote.subtitle` · defined but unused

### sidebar · workspace

- "Activate to focus this workspace. Drag to reorder, or use Move Up and Move Down actions." · `sidebar.workspace.accessibilityHint` · `Sources/ContentView.swift:13660`

## cloud

### cloud · diagnostics

- "No Cloud activity recorded in this session." · `cloud.diagnostics.empty` · `Sources/Cloud/CloudOperationDetailsView.swift:23`

### cloud · display

- "Connect to this Cloud display" · `cloud.display.connectTitle` · `Sources/Cloud/PortForward/CloudBrowserConnectionCard.swift:15`
- "The Cloud page connection was cancelled. Retry to connect." · `cloud.display.connectionCancelled` · `Sources/Cloud/PortForward/CloudBrowserAccessState.swift:284`

### cloud · imagePaste

- "Cloud temporary image storage is full. Wait ten minutes for previous images to expire, then try again." · `cloud.imagePaste.capacity` · `Sources/Cloud/CloudImagePasteError.swift:16`
- "The link closed before image paste was confirmed. Check the agent for an attachment before pasting again." · `cloud.imagePaste.deliveryUncertain` · `Sources/Cloud/CloudImagePasteError.swift:24`
- "Image could not be pasted" · `cloud.imagePaste.failed` · `Sources/TerminalSurface+CloudImagePaste.swift:56`
- "The image exceeds the 20 MiB limit. Resize it and try again." · `cloud.imagePaste.sizeLimit` · `Sources/Cloud/CloudImagePasteError.swift:12`
- "The image could not be stored. Check the machine’s available disk space and copy the image again." · `cloud.imagePaste.storage` · `Sources/Cloud/CloudImagePasteError.swift:20`
- "The image transfer timed out. Reconnect the Cloud terminal and try again." · `cloud.imagePaste.timedOut` · `Sources/Cloud/CloudImagePasteError.swift:22`
- "The Cloud terminal link is unavailable. Reconnect the terminal, then paste the image again." · `cloud.imagePaste.unavailable` · `Sources/Cloud/CloudImagePasteError.swift:8`
- "This Cloud daemon cannot receive clipboard images. Update cmux-tui on the machine and reconnect the terminal." · `cloud.imagePaste.unsupported` · `Sources/Cloud/CloudImagePasteError.swift:10`
- "Cloud image paste accepts PNG, JPEG, GIF, and WebP files. Copy a supported image and try again." · `cloud.imagePaste.unsupportedType` · `Sources/Cloud/CloudImagePasteError.swift:14`

### cloud · operation

- "Cloud activity and errors" · `cloud.operation.details` · defined but unused
- "Dismiss operation" · `cloud.operation.dismiss` · `Sources/Cloud/CloudOperationActivityView.swift:29`
- "This operation did not complete. Check the machine state before you try it again." · `cloud.operation.failedAction` · `Sources/Cloud/CloudOperationDetailsView.swift:56`
- "Operation cancelled" · `cloud.operation.failure.cancelled` · `Sources/Cloud/CloudDiagnosticFailure.swift:32`
- "The Cloud connection did not complete. Check your connection and try again." · `cloud.operation.failure.network` · `Sources/Cloud/CloudDiagnosticFailure.swift:22`
- "The Cloud operation failed. Copy the diagnostic reference if the problem continues." · `cloud.operation.failure.other` · `Sources/Cloud/CloudDiagnosticFailure.swift:34`
- "Cloud access was denied. Check your permissions." · `cloud.operation.failure.permission` · `Sources/Cloud/CloudDiagnosticFailure.swift:16`
- "The Cloud terminal placement is unavailable. Refresh the machine, then retry." · `cloud.operation.failure.placement` · `Sources/Cloud/CloudDiagnosticFailure.swift:28`
- "Cloud received too many requests. Wait before you retry." · `cloud.operation.failure.rateLimit` · `Sources/Cloud/CloudDiagnosticFailure.swift:20`
- "This Cloud operation is not supported. Check for an update." · `cloud.operation.failure.unsupported` · `Sources/Cloud/CloudDiagnosticFailure.swift:30`
- "Prepare base" · `cloud.operation.kind.base` · `Sources/Cloud/CloudOperationKind.swift:25`
- "Connect to machine" · `cloud.operation.kind.connect` · `Sources/Cloud/CloudOperationKind.swift:30`
- "Create machine" · `cloud.operation.kind.create` · `Sources/Cloud/CloudOperationKind.swift:11`
- "Prepare environment" · `cloud.operation.kind.environment` · `Sources/Cloud/CloudOperationKind.swift:29`
- "Run machine command" · `cloud.operation.kind.exec` · `Sources/Cloud/CloudOperationKind.swift:22`
- "Transfer files" · `cloud.operation.kind.file` · `Sources/Cloud/CloudOperationKind.swift:28`
- "Copy machine" · `cloud.operation.kind.fork` · `Sources/Cloud/CloudOperationKind.swift:19`
- "Update notifications" · `cloud.operation.kind.notification` · `Sources/Cloud/CloudOperationKind.swift:31`
- "Pause machine" · `cloud.operation.kind.pause` · `Sources/Cloud/CloudOperationKind.swift:16`
- "Manage publication" · `cloud.operation.kind.publication` · `Sources/Cloud/CloudOperationKind.swift:24`
- "Refresh machines" · `cloud.operation.kind.refresh` · `Sources/Cloud/CloudOperationKind.swift:13`
- "Rename machine" · `cloud.operation.kind.rename` · `Sources/Cloud/CloudOperationKind.swift:14`
- "Resize machine" · `cloud.operation.kind.resize` · `Sources/Cloud/CloudOperationKind.swift:21`
- "Save snapshot" · `cloud.operation.kind.snapshot` · `Sources/Cloud/CloudOperationKind.swift:18`

### cloud · portAccess

- "The Cloud desktop connection failed. Retry to reconnect to the machine." · `cloud.portAccess.desktopDisconnected` · `Sources/Cloud/PortForward/CloudBrowserAccessState.swift:147`
- "This port does not have a valid HTTP or HTTPS address." · `cloud.portAccess.invalidURL` · `Sources/Cloud/PortForward/CloudPortRoutePlan.swift:25`

### cloud · ports

- "Connect to this Cloud port" · `cloud.ports.accessTitle` · `Sources/Cloud/PortForward/CloudBrowserConnectionCard.swift:16`
- "Loading Cloud page…" · `cloud.ports.loading` · `Sources/Cloud/PortForward/CloudBrowserConnectionCard.swift:28`
- "Local address" · `cloud.ports.local` · defined but unused

### cloud · workspace

- "Several machine workspaces have that name. Use a workspace ID or choose a unique name." · `cloud.workspace.ambiguousName` · `Sources/Surfaces/CmuxTuiSurfaceProviders.swift:891`

## shortcut

### shortcut · diffViewerPreviousFile

- "Diff Viewer: Previous File" · `shortcut.diffViewerPreviousFile.label` · `Sources/KeyboardShortcutSettings.swift:405`

### shortcut · diffViewerScrollDown

- "Viewers: Scroll Down" · `shortcut.diffViewerScrollDown.label` · `Sources/KeyboardShortcutSettings.swift:392`

### shortcut · diffViewerScrollDownEmacs

- "Viewers: Scroll Down (Emacs)" · `shortcut.diffViewerScrollDownEmacs.label` · `Sources/KeyboardShortcutSettings.swift:396`

### shortcut · diffViewerScrollHalfPageDown

- "Viewers: Scroll Half Page Down" · `shortcut.diffViewerScrollHalfPageDown.label` · `Sources/KeyboardShortcutSettings.swift:394`

### shortcut · diffViewerScrollToBottom

- "Viewers: Scroll to Bottom" · `shortcut.diffViewerScrollToBottom.label` · `Sources/KeyboardShortcutSettings.swift:398`

### shortcut · focusPaneDown

- "Focus Pane Down" · `shortcut.focusPaneDown.label` · `Sources/KeyboardShortcutSettings.swift:320`

### shortcut · focusPaneRight

- "Focus Pane Right" · `shortcut.focusPaneRight.label` · `Sources/KeyboardShortcutSettings.swift:318`

### shortcut · key

- "Brightness Down" · `shortcut.key.mediaBrightnessDown` · `Packages/macOS/CmuxSettings/Sources/CmuxSettings/Values/ShortcutDisplayFormatter.swift:125`
- "Brightness Up" · `shortcut.key.mediaBrightnessUp` · `Packages/macOS/CmuxSettings/Sources/CmuxSettings/Values/ShortcutDisplayFormatter.swift:127`
- "Next Track" · `shortcut.key.mediaNext` · `Packages/macOS/CmuxSettings/Sources/CmuxSettings/Values/ShortcutDisplayFormatter.swift:131`
- "Previous Track" · `shortcut.key.mediaPrevious` · `Packages/macOS/CmuxSettings/Sources/CmuxSettings/Values/ShortcutDisplayFormatter.swift:135`

### shortcut · markdownZoomOut

- "Markdown Viewer: Zoom Out" · `shortcut.markdownZoomOut.label` · `Sources/KeyboardShortcutSettings.swift:378`

### shortcut · markdownZoomReset

- "Markdown Viewer: Actual Size" · `shortcut.markdownZoomReset.label` · `Sources/KeyboardShortcutSettings.swift:379`

### shortcut · moveSurfaceToPaneDown

- "Move Surface to Pane Below" · `shortcut.moveSurfaceToPaneDown.label` · `Sources/SurfacePaneMovement.swift:82`

### shortcut · moveSurfaceToPaneLeft

- "Move Surface to Pane on Left" · `shortcut.moveSurfaceToPaneLeft.label` · `Sources/SurfacePaneMovement.swift:67`

### shortcut · moveSurfaceToPaneRight

- "Move Surface to Pane on Right" · `shortcut.moveSurfaceToPaneRight.label` · `Sources/SurfacePaneMovement.swift:72`

### shortcut · moveSurfaceToPreviousPane

- "Move Surface to Previous Pane" · `shortcut.moveSurfaceToPreviousPane.label` · `Sources/SurfacePaneMovement.swift:57`

### shortcut · resizePaneRight

- "Resize Pane Right" · `shortcut.resizePaneRight.label` · `Sources/KeyboardShortcutSettings.swift:343`

### shortcut · setWorkspaceColorAmber

- "Workspace Color: Amber" · `shortcut.setWorkspaceColorAmber.label` · `Sources/ContentView.swift:7418`

### shortcut · setWorkspaceColorAqua

- "Workspace Color: Aqua" · `shortcut.setWorkspaceColorAqua.label` · `Sources/ContentView.swift:7426`

### shortcut · setWorkspaceColorBlue

- "Workspace Color: Blue" · `shortcut.setWorkspaceColorBlue.label` · `Sources/ContentView.swift:7428`

### shortcut · setWorkspaceColorCrimson

- "Workspace Color: Crimson" · `shortcut.setWorkspaceColorCrimson.label` · `Sources/ContentView.swift:7414`

### shortcut · setWorkspaceColorGreen

- "Workspace Color: Green" · `shortcut.setWorkspaceColorGreen.label` · `Sources/ContentView.swift:7422`

### shortcut · setWorkspaceColorOlive

- "Workspace Color: Olive" · `shortcut.setWorkspaceColorOlive.label` · `Sources/ContentView.swift:7420`

### shortcut · setWorkspaceColorOrange

- "Workspace Color: Orange" · `shortcut.setWorkspaceColorOrange.label` · `Sources/ContentView.swift:7416`

### shortcut · setWorkspaceColorTeal

- "Workspace Color: Teal" · `shortcut.setWorkspaceColorTeal.label` · `Sources/ContentView.swift:7424`

### shortcut · simulatorRotateRight

- "Simulator: Rotate Right" · `shortcut.simulatorRotateRight.label` · `Sources/SimulatorCommandPaletteIntegration.swift:56`

### shortcut · switchRightSidebarToFeed

- "Show Sidebar Feed" · `shortcut.switchRightSidebarToFeed.label` · `Sources/KeyboardShortcutSettings.swift:272`

### shortcut · switchRightSidebarToFiles

- "Show Sidebar Files" · `shortcut.switchRightSidebarToFiles.label` · `Sources/KeyboardShortcutSettings.swift:269`

### shortcut · switchRightSidebarToFind

- "Show Sidebar Find" · `shortcut.switchRightSidebarToFind.label` · `Sources/KeyboardShortcutSettings.swift:270`

### shortcut · switchRightSidebarToMachines

- "Show Sidebar Cloud" · `shortcut.switchRightSidebarToMachines.label` · `Sources/KeyboardShortcutSettings.swift:274`

### shortcut · when

- "Only while a browser pane is focused" · `shortcut.when.caption.browserFocus` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Bindings/ShortcutListModel.swift:154`
- "Only while a browser pane or text file preview is focused" · `shortcut.when.caption.browserOrFilePreviewTextEditorFocus` · `Packages/macOS/CmuxSettingsUI/Tests/CmuxSettingsUITests/ShortcutListModelTests.swift:478`
- "Only while a text file preview is focused" · `shortcut.when.caption.filePreviewTextEditorFocus` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Bindings/ShortcutListModel.swift:159`
- "Only while a markdown preview is focused" · `shortcut.when.caption.markdownFocus` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Bindings/ShortcutListModel.swift:170`
- "When: %@" · `shortcut.when.caption.override` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Bindings/ShortcutListModel.swift:141`
- "Only while the right sidebar is focused" · `shortcut.when.caption.sidebarFocus` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Bindings/ShortcutListModel.swift:149`
- "Only while a Simulator is focused" · `shortcut.when.caption.simulatorFocus` · `Packages/macOS/CmuxSettingsUI/Tests/CmuxSettingsUITests/ShortcutListModelTests.swift:532`
- "Only while a terminal pane is focused" · `shortcut.when.caption.terminalFocus` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Bindings/ShortcutListModel.swift:177`

## browser

### browser · automation

- "Timed out waiting for the browser document to become ready" · `browser.automation.error.documentReadinessTimedOut` · `Sources/TerminalController+BrowserWorkerSupport.swift:199`
- "Timed out waiting for JavaScript result" · `browser.automation.error.javaScriptTimedOut` · `Sources/TerminalController+BrowserAutomationRecovery.swift:122`
- "The browser surface stopped responding and was recovered. Retry the command." · `browser.automation.error.recovered` · `Sources/TerminalController+BrowserAutomationRecovery.swift:178`
- "The browser surface was already recovered. Retry the command." · `browser.automation.error.superseded` · `Sources/TerminalController+BrowserWorkerSupport.swift:208`

### browser · chromium

- "Timed out waiting for Chromium CDP command" · `browser.chromium.automation.commandTimedOut` · defined but unused
- "Timed out waiting for JavaScript result" · `browser.chromium.automation.javascriptTimedOut` · defined but unused
- "Timed out waiting for Chromium navigation" · `browser.chromium.automation.navigationTimedOut` · defined but unused
- "Timed out waiting for Chromium screenshot" · `browser.chromium.automation.screenshotTimedOut` · defined but unused
- "Timed out waiting for Chromium" · `browser.chromium.cdp.startupTimedOut` · defined but unused
- "Chromium unavailable" · `browser.chromium.error.title` · defined but unused

### browser · designMode

- "Could not copy the design context." · `browser.designMode.error.copy` · `Sources/Panels/BrowserDesignModeController.swift:591`

### browser · engine

- "Choose WebKit or Chromium for the browser engine." · `browser.engine.error.invalid` · defined but unused

### browser · error

- "%@ uses plain HTTP, so traffic can be read or modified on the network.\n\nOpen this URL in your default browser, or proceed in cmux." · `browser.error.insecure.message` · `Sources/Panels/BrowserPanel.swift:5778`

### browser · focusMode

- "Enter Focus Mode" · `browser.focusMode.enter` · defined but unused

### browser · import

- "No importable browser matches '%@'" · `browser.import.automation.error.browserNotFound` · `Sources/Panels/BrowserAutomation.swift:22`
- "Cookie import into Chromium is not available yet. Open a WebKit browser pane or set WebKit as the default engine and try again." · `browser.import.automation.error.chromiumCookiesUnsupported` · defined but unused
- "Browser import failed" · `browser.import.automation.error.fallback` · `Sources/Panels/BrowserAutomation.swift:64`
- "[one] Imported cookie: %ld / [other] Imported cookies: %ld" · `browser.import.complete.importedCookies` · `Packages/macOS/CmuxBrowser/Sources/CmuxBrowser/Import/Outcome/BrowserImportOutcome+Formatting.swift:73`
- "[one] Imported history entry: %ld / [other] Imported history entries: %ld" · `browser.import.complete.importedHistory` · `Packages/macOS/CmuxBrowser/Sources/CmuxBrowser/Import/Outcome/BrowserImportOutcome+Formatting.swift:94`
- "Scope: %@" · `browser.import.complete.scope` · `Packages/macOS/CmuxBrowser/Sources/CmuxBrowser/Import/Outcome/BrowserImportOutcome+Formatting.swift:64`
- "[one] Skipped cookie: %ld / [other] Skipped cookies: %ld" · `browser.import.complete.skippedCookies` · `Packages/macOS/CmuxBrowser/Sources/CmuxBrowser/Import/Outcome/BrowserImportOutcome+Formatting.swift:83`
- "Cookies (site sign-ins)" · `browser.import.cookies` · `Sources/TerminalController.swift:1717`
- "Imported data goes into the selected cmux profile." · `browser.import.destinationProfile.help` · defined but unused
- "Browser Settings" · `browser.import.hint.settings` · `Sources/Panels/BrowserPanelView.swift:2357`
- "History (visited pages)" · `browser.import.history` · `Sources/Panels/BrowserPanel.swift:11013`
- "[one] Skipped %ld encrypted cookie that requires Keychain decryption. / [other] Skipped %ld encrypted cookies that require Keychain decryption." · `browser.import.warning.encryptedCookiesSkipped` · `Sources/Panels/BrowserPanel.swift:9205`
- "Failed reading Firefox cookies at %@: %@" · `browser.import.warning.firefoxCookiesReadFailed` · `Sources/Panels/BrowserPanel.swift:9709`
- "Failed reading Firefox history at %@: %@" · `browser.import.warning.firefoxHistoryReadFailed` · `Sources/Panels/BrowserPanel.swift:9853`
- "[one] Skipped %ld encrypted %@ cookie because %@ could not be unlocked from Keychain. / [other] Skipped %ld encrypted %@ cookies because %@ could not be unlocked from Keychain." · `browser.import.warning.keychainDecryptFailed` · `Sources/Panels/BrowserPanel.swift:9195`

### browser · navigation

- "Unsupported browser navigation action" · `browser.navigation.error.unsupportedAction` · defined but unused

### browser · profile

- "Browser profile command failed" · `browser.profile.automation.error.fallback` · `Sources/Panels/BrowserAutomation.swift:195`
- "New Browser Profile" · `browser.profile.new.title` · `Sources/Panels/BrowserPanelView.swift:2684`
- "Choose a new name for this browser profile." · `browser.profile.rename.message` · `Sources/Panels/BrowserPanelView.swift:2718`
- "Rename Browser Profile" · `browser.profile.rename.title` · `Sources/Panels/BrowserPanelView.swift:2717`

### browser · screenshot

- "Timed out waiting for the browser screenshot." · `browser.screenshot.error.automationTimedOut` · `Sources/Panels/BrowserScreenshotPipeline.swift:18`

## diffViewer

### diffViewer · (general)

- "Binary file" · `diffViewer.binaryFile` · `CLI/cmux_open.swift:533`
- "Branch base" · `diffViewer.branchBase` · `CLI/cmux_open.swift:583`
- "Filter branches" · `diffViewer.branchPickerFilterPlaceholder` · `CLI/cmux_open.swift:587`
- "Could not generate the diff. Choose a branch to retry." · `diffViewer.branchPickerGenerateFailed` · `CLI/cmux_open.swift:588`
- "Could not load branches." · `diffViewer.branchPickerLoadFailed` · `CLI/cmux_open.swift:595`
- "Loading branches..." · `diffViewer.branchPickerLoading` · `CLI/cmux_open.swift:597`
- "{count} more, type to filter" · `diffViewer.branchPickerMore` · `CLI/cmux_open.swift:596`
- "No matching branches" · `diffViewer.branchPickerNoMatches` · `CLI/cmux_open.swift:598`
- "Change diff base" · `diffViewer.branchPickerOpen` · `CLI/cmux_open.swift:599`
- "Collapse all diffs" · `diffViewer.collapseAllDiffs` · `CLI/cmux_open.swift:545`
- "Collapse unchanged context" · `diffViewer.collapseUnchangedContext` · `CLI/cmux_open.swift:546`
- "Diff stats" · `diffViewer.diffStats` · `CLI/cmux_open.swift:551`
- "Diff target" · `diffViewer.diffTarget` · `CLI/cmux_open.swift:552`
- "Disable word diffs" · `diffViewer.disableWordDiffs` · `CLI/cmux_open.swift:555`
- "Disable word wrap" · `diffViewer.disableWordWrap` · `CLI/cmux_open.swift:556`
- "Enable word diffs" · `diffViewer.enableWordDiffs` · `CLI/cmux_open.swift:557`
- "Enable word wrap" · `diffViewer.enableWordWrap` · `CLI/cmux_open.swift:558`
- "Hide backgrounds" · `diffViewer.hideBackgrounds` · `CLI/cmux_open.swift:566`
- "Hide line numbers" · `diffViewer.hideLineNumbers` · `CLI/cmux_open.swift:569`
- "Jump to file" · `diffViewer.jumpToFile` · `CLI/cmux_open.swift:571`
- "No comments yet" · `diffViewer.noComments` · `CLI/cmux_open.swift:539`
- "Open source URL" · `diffViewer.openSourceURL` · `CLI/cmux_open.swift:577`
- "Show backgrounds" · `diffViewer.showBackgrounds` · `CLI/cmux_open.swift:601`
- "Show file search" · `diffViewer.showFileSearch` · `CLI/cmux_open.swift:603`
- "Show files" · `diffViewer.showFiles` · `CLI/cmux_open.swift:602`
- "Show line numbers" · `diffViewer.showLineNumbers` · `CLI/cmux_open.swift:604`
- "Switch to split diff" · `diffViewer.switchToSplitDiff` · `CLI/cmux_open.swift:605`
- "Switch to unified diff" · `diffViewer.switchToUnifiedDiff` · `CLI/cmux_open.swift:606`

### diffViewer · baseReason

- "fork point" · `diffViewer.baseReason.forkPoint` · `CLI/cmux_open.swift:1853`
- "PR base" · `diffViewer.baseReason.prBase` · `CLI/cmux_open.swift:1851`

### diffViewer · empty

- "No branch changes to diff." · `diffViewer.empty.branch` · `CLI/cmux_open.swift:724`
- "No last-turn changes to diff." · `diffViewer.empty.lastTurn` · `CLI/cmux_open.swift:725`
- "No staged changes to diff." · `diffViewer.empty.staged` · `CLI/cmux_open.swift:723`
- "No unstaged changes to diff." · `diffViewer.empty.unstaged` · `CLI/cmux_open.swift:722`

### diffViewer · error

- "Diff viewer allowlist is too large" · `diffViewer.error.allowlistTooLarge` · `Packages/macOS/CmuxBrowser/Sources/CmuxBrowser/DiffViewer/CmuxDiffViewerSessionError.swift:67`

## computerUse

### computerUse · menu

- "View Computer Use" · `computerUse.menu.viewComputerUse` · defined but unused

### computerUse · onboarding

- "Allows cmux to access app interfaces" · `computerUse.onboarding.accessibility.cardDetail` · `Sources/App/ComputerUseOnboardingView.swift:271`
- "Accessibility lets the Computer Use helper inspect controls, click buttons, and type in apps you ask an agent to use." · `computerUse.onboarding.accessibility.detail` · defined but unused
- "The system “bypass” warning is expected here." · `computerUse.onboarding.companion.confirmCapture.detail` · `Sources/App/ComputerUseOnboardingView.swift:877`
- "Then turn it on." · `computerUse.onboarding.companion.turnOn` · `Sources/App/ComputerUseOnboardingView.swift:872`
- "Finish screenshot access" · `computerUse.onboarding.finishScreenshotAccess` · `Sources/App/ComputerUseOnboardingView.swift:527`
- "macOS is asking to confirm screen capture.\nChoose Allow in the system alert to finish setup." · `computerUse.onboarding.hero.confirmCapture` · `Sources/App/ComputerUseOnboardingView.swift:137`
- "cmux Computer Use needs these permissions to use apps on your Mac.\nThese permissions are used when you ask cmux to perform tasks." · `computerUse.onboarding.hero.detail` · `Sources/App/ComputerUseOnboardingView.swift:142`
- "Let agents work across apps you choose" · `computerUse.onboarding.media.detail` · defined but unused
- "Control apps you choose" · `computerUse.onboarding.overview.accessibility` · defined but unused
- "When a task needs more than the terminal, supported agents can see and drive local apps. Permissions belong to a separate helper, so granting them never requires restarting cmux." · `computerUse.onboarding.overview.detail` · defined but unused
- "Runs locally with separate cmux Computer Use permissions" · `computerUse.onboarding.overview.local` · defined but unused
- "Only the Computer Use helper needs to restart after permission changes. cmux stays open." · `computerUse.onboarding.overview.restartHelper` · defined but unused
- "Driver telemetry and update checks are disabled" · `computerUse.onboarding.overview.telemetry` · defined but unused
- "Agents can work across apps on this Mac" · `computerUse.onboarding.overview.title` · defined but unused
- "In System Settings, turn on %@, then return here." · `computerUse.onboarding.permission.instructions` · defined but unused
- "You can continue to the next step." · `computerUse.onboarding.permissionReady.detail` · defined but unused
- "Preparing cmux Computer Use…" · `computerUse.onboarding.preparingHelper` · defined but unused
- "Allows cmux Computer Use to see app windows and screen content" · `computerUse.onboarding.screenRecording.cardDetail` · defined but unused
- "Screen Recording lets the Computer Use helper see app windows and screen content so it can act on what is visible." · `computerUse.onboarding.screenRecording.detail` · defined but unused
- "Grant Screen Recording" · `computerUse.onboarding.screenRecording.title` · `Sources/ContentView+ComputerUseCommandPalette.swift:50`
- "cmux uses screenshots to know where to click" · `computerUse.onboarding.screenshots.cardDetail` · `Sources/App/ComputerUseOnboardingView.swift:298`
- "macOS asks for confirmation. Allow screen capture." · `computerUse.onboarding.screenshots.confirmDetail` · `Sources/App/ComputerUseOnboardingView.swift:293`
- "Computer Use Setup" · `computerUse.onboarding.windowTitle` · `Sources/ContentView+ComputerUseCommandPalette.swift:28`

## socket

### socket · authTeam

- "Could not update the team. Try again." · `socket.authTeam.failed` · `Sources/TerminalController+AuthTeam.swift:116`
- "Sign in to manage teams." · `socket.authTeam.signedOut` · `Sources/TerminalController+AuthTeam.swift:91`

### socket · cloudVM

- "Cloud VM access requires sign-in. Run `cmux auth login`, then retry." · `socket.cloudVM.authRequired` · `Sources/TerminalController.swift:3853`
- "vm.domain_verify requires `name` (a domain)." · `socket.cloudVM.domain.nameRequired` · `Sources/Cloud/VMClientSocketCommands.swift:84`
- "vm.publication_create requires `port` between 1 and 65535." · `socket.cloudVM.publication.create.invalidPort` · `Sources/Cloud/VMClientSocketCommands.swift:110`
- "vm.publication_create requires `vmId`." · `socket.cloudVM.publication.create.missingVM` · `Sources/Cloud/VMClientSocketCommands.swift:100`
- "%@ requires `accessMode` to be personal, team, or public." · `socket.cloudVM.publication.invalidAccess` · `Sources/Cloud/VMClientSocketCommands.swift:1036`
- "%@ accepts `teamId` only when `accessMode` is team." · `socket.cloudVM.publication.teamOnly` · `Sources/Cloud/VMClientSocketCommands.swift:1051`
- "%@ requires `teamId` when `accessMode` is team." · `socket.cloudVM.publication.teamRequired` · `Sources/Cloud/VMClientSocketCommands.swift:1044`
- "The Cloud VM request failed. Retry, or check the machine's status with `cmux vm ls`." · `socket.cloudVM.requestFailed` · `Sources/TerminalController.swift:3935`
- "vm.resize requires a positive `storage_mb` value." · `socket.cloudVM.resize.diskRequired` · `Sources/Cloud/VMClientSocketCommands.swift:316`
- "vm.resize requires `id`. Run `cmux vm ls` to find one." · `socket.cloudVM.resize.idRequired` · `Sources/Cloud/VMClientSocketCommands.swift:302`
- "The cmux Cloud service rejected this session. Run `cmux auth logout`, then `cmux auth login`, and retry." · `socket.cloudVM.sessionRejected` · `Sources/TerminalController.swift:3848`
- "%1$@ offers no `%2$@` transport (its provider has no cmux-tui daemon route), so cmux cannot attach a terminal to it. %3$@" · `socket.cloudVM.transportUnsupported` · `Sources/TerminalController.swift:3880`
- "Use `cmux vm exec %1$@ -- <command>`; `cmux vm ssh %1$@` works where the provider offers SSH." · `socket.cloudVM.transportUnsupported.useExec` · `Sources/TerminalController.swift:3872`

### socket · notification

- "Missing or invalid preferred_surface_id" · `socket.notification.clear.preferredSurfaceIdInvalid` · `Sources/TerminalController+ControlNotificationContext.swift:397`
- "Notifications are unavailable. Try again." · `socket.notification.clear.unavailable` · `Sources/TerminalController+ControlNotificationContext.swift:417`

### socket · remoteRelay

- "Relay request authentication failed" · `socket.remoteRelay.authenticationFailed` · `Sources/TerminalController+RemoteRelayAuthorization.swift:14`

### socket · surfaceSelection

- "Request timed out after 5 seconds" · `socket.surfaceSelection.timeout` · `Sources/TerminalController+ControlSocketAsync.swift:315`
- "This surface does not support selection reads." · `socket.surfaceSelection.unsupported` · `Sources/TerminalController+SurfaceSelection.swift:319`

### socket · vm

- "vm.port_open: invalid explicit target `%@`." · `socket.vm.portOpen.invalidTarget` · `Sources/Surfaces/SurfaceSocketCommands.swift:272`

### socket · workspace

- "The remote terminal must open a shell or a valid named tmux session." · `socket.workspace.remote.terminalProfile.invalid` · `Sources/TerminalController+RemoteTerminalTransportErrors.swift:60`
- "The remote terminal transport must be SSH or Mosh." · `socket.workspace.remote.terminalTransport.invalid` · `Sources/TerminalController+RemoteTerminalTransportErrors.swift:49`
- "Unsupported parameter `window`; use `window_id` with a window UUID or ref from `window.list`." · `socket.workspace.unsupportedWindowParam` · `Sources/TerminalController.swift:4076`

## account

### account · signIn

- "Couldn’t open your browser. Copy the link and paste it into any browser." · `account.signIn.browserOpenFailed` · `Sources/Auth/AccountSignInView.swift:228`
- "Browser opened. Complete sign-in there." · `account.signIn.browserOpened` · `Sources/Auth/AccountSignInView.swift:220`
- "Couldn’t copy the link. Open it in your browser instead." · `account.signIn.copyFailed` · `Sources/Auth/AccountSignInView.swift:212`
- "Open the link in your browser, or copy it and paste it into any browser." · `account.signIn.error.browserUnavailable.recovery` · `Sources/Auth/AccountSignInView.swift:344`
- "Couldn’t open sign-in" · `account.signIn.error.browserUnavailable.title` · `Sources/Auth/AccountSignInView.swift:300`
- "No changes were made. Try again when you’re ready, or use the browser link below." · `account.signIn.error.cancelled.recovery` · `Sources/Auth/AccountSignInView.swift:314`
- "Try again to create a fresh secure link. The old link cannot sign in." · `account.signIn.error.invalidLink.recovery` · `Sources/Auth/AccountSignInView.swift:339`
- "Check your connection, then try again. Your account was not changed." · `account.signIn.error.network.recovery` · `Sources/Auth/AccountSignInView.swift:324`
- "Couldn’t reach cmux" · `account.signIn.error.network.title` · `Sources/Auth/AccountSignInView.swift:292`
- "Connect to Wi-Fi or another network, then try again. You can keep this pane open." · `account.signIn.error.offline.recovery` · `Sources/Auth/AccountSignInView.swift:319`
- "Check the account details in the browser and try again." · `account.signIn.error.rejected.recovery` · `Sources/Auth/AccountSignInView.swift:354`
- "cmux couldn’t complete the sign-in" · `account.signIn.error.rejected.title` · `Sources/Auth/AccountSignInView.swift:304`
- "Try again in a moment. Your account and existing cmux workspaces are unchanged." · `account.signIn.error.server.recovery` · `Sources/Auth/AccountSignInView.swift:334`
- "The sign-in window did not return to cmux. Reopen the browser link or start a new attempt." · `account.signIn.error.timedOut.recovery` · `Sources/Auth/AccountSignInView.swift:329`
- "Confirm you’re using the intended cmux account, then try again." · `account.signIn.error.unauthorized.recovery` · `Sources/Auth/AccountSignInView.swift:349`
- "cmux couldn’t authorize this sign-in" · `account.signIn.error.unauthorized.title` · `Sources/Auth/AccountSignInView.swift:302`
- "Try again. If the sign-in window still fails, copy the link and open it in your browser." · `account.signIn.error.unknown.recovery` · `Sources/Auth/AccountSignInView.swift:359`
- "Couldn’t finish sign-in" · `account.signIn.error.unknown.title` · `Sources/Auth/AccountSignInView.swift:306`
- "Complete sign-in in the window that opened. This pane updates automatically." · `account.signIn.instructions` · defined but unused
- "cmux is preparing a secure sign-in window." · `account.signIn.loading.opening.instructions` · `Sources/Auth/AccountSignInView.swift:258`
- "Complete sign-in in the window that opened. This pane updates automatically." · `account.signIn.loading.waiting.instructions` · `Sources/Auth/AccountSignInView.swift:263`
- "Sign-in wasn’t completed." · `account.signIn.notCompleted` · `Sources/Panels/BrowserAuthCallbackNavigationPolicy.swift:159`
- "You’re signed in now" · `account.signIn.successTitle` · `Sources/Auth/AccountSignInView.swift:162`

## dock

### dock · action

- "Focus Control" · `dock.action.focusControl` · defined but unused
- "New Dock Pane" · `dock.action.newSurface` · defined but unused
- "Open Dock Config" · `dock.action.openConfig` · defined but unused
- "Restart Control" · `dock.action.restartControl` · defined but unused

### dock · empty

- "Set up cmux Dock controls for the current context.\n\nFirst, learn the feature before editing:\n1. Run `cmux docs dock` if the cmux CLI is available. If it is not, read https://cmux.com/docs/dock.\n2. Inspect the repository or current directory to understand the project type, scripts, package manager, dev servers, logs, task runners, test commands, and any existing TUI tools.\n3. If the desired Dock is ambiguous, ask the user what they want monitored or controlled before writing files.\n\nDock is cmux's right-sidebar terminal and browser control area. A Dock config is JSON with a top-level `controls` array. Terminal controls run commands in Ghostty-backed sections using the user's login shell; browser controls embed URLs. Controls are useful for project dashboards, git/status views, dev server or build status, test watchers, log tails, queues, local services, or fixed web dashboards.\n\nChoose where to write the config:\n- In a repository or project directory, create or edit `.cmux/dock.json` so teammates can share it.\n- For a personal default outside a repo, create or edit `~/.config/cmux/dock.json`.\n- If both exist, project `.cmux/dock.json` is more specific for that project. Nested project configs apply to that directory tree; use the nearest relevant project config instead of writing unrelated controls globally.\n- If there is no repo and no clear project root, use the global config only after confirming the user wants a personal Dock.\n\nSchema:\n{\n  "controls": [\n    {\n      "id": "short-stable-id",\n      "title": "Human label",\n      "command": "safe command to run",\n      "cwd": "optional/path",\n      "height": 220,\n      "env": { "NAME": "value" }\n    },\n    {\n      "id": "dashboard",\n      "title": "Dashboard",\n      "type": "browser",\n      "url": "http://127.0.0.1:3000",\n      "chrome": false\n    }\n  ]\n}\n\nRules:\n- Keep ids stable, lowercase, and unique.\n- `type` is optional: `terminal` is the default, or use `browser`.\n- Terminal controls require `command`; browser controls require `url`.\n- Browser controls default to `chrome: true`. Set `chrome: false` to hide browser chrome, including the address bar and toolbar; Focus Address Bar then does nothing for that pane, while `cmux browser goto` and `cmux browser reload` remain available.\n- Use `cwd` for subdirectories; relative paths resolve from the config base.\n- Use `height` only when a control needs a fixed amount of vertical space.\n- Use `env` only for non-secret values needed by one control.\n- Do not put secrets, tokens, or machine-specific private paths in a shared project config.\n- Prefer commands that are safe to start repeatedly and make sense in a terminal.\n- Do not invent unavailable scripts. Read package files, Makefiles, Procfiles, README docs, config files, and existing tooling first.\n- Keep shared project Docks portable for teammates. Put personal or machine-specific controls in the global Dock.\n\nDeliverable:\n- Create or update the appropriate dock.json.\n- Preserve existing useful controls unless the user asked to replace them.\n- Validate that the JSON parses.\n- Summarize what each control does and any commands the user should review before trusting the Dock config." · `dock.empty.agentPrompt` · `Sources/DockEmptyView.swift:97`
- "Copy a prompt you can paste into an AI coding agent" · `dock.empty.copyPrompt.help` · `Sources/DockEmptyView.swift:33`
- "Open the Dock documentation" · `dock.empty.openDocs.help` · `Sources/DockEmptyView.swift:59`
- "Show the prompt that will be copied" · `dock.empty.promptInfo.help` · `Sources/DockEmptyView.swift:43`
- "Add controls to .cmux/dock.json." · `dock.empty.subtitle` · `Sources/DockEmptyView.swift:16`
- "No Dock Controls" · `dock.empty.title` · `Sources/DockEmptyView.swift:13`

### dock · error

- "Dock control command must not be blank." · `dock.error.blankControlCommand` · `Sources/DockControlDefinition.swift:94`
- "Dock control id must not be blank." · `dock.error.blankControlID` · `Sources/DockControlDefinition.swift:61`
- "Dock browser control url must not be blank." · `dock.error.blankControlURL` · `Sources/DockControlDefinition.swift:103`
- "Conflicting Dock routing selectors" · `dock.error.conflictingRoutingSelectors` · `Sources/TerminalController+ControlSurfaceDock.swift:98`
- "Dock control ids must be unique." · `dock.error.duplicateControl` · `Sources/DockSplitStore+Config.swift:193`
- "Dock could not be revealed" · `dock.error.focusUnavailable` · `Sources/TerminalController+ControlSurfaceDock.swift:94`
- "Could not load the Dock config. Check dock.json and try again." · `dock.error.loadFailed` · `Sources/DockSplitStore+Config.swift:135`
- "Could not open the Dock config. Check permissions and try again." · `dock.error.openFailed` · `Sources/DockSplitStore+Config.swift:145`
- "Dock placement is disabled" · `dock.error.unavailable` · `Sources/TerminalController+ControlSurfaceDock.swift:90`
- "Dock control type must be terminal or browser." · `dock.error.unknownControlType` · `Sources/DockControlDefinition.swift:73`
- "Dock placement supports only terminal and browser surfaces" · `dock.error.unsupportedSurfaceType` · `Sources/TerminalController+ControlSurfaceDock.swift:86`

### dock · source

- "Project Dock" · `dock.source.project` · `Sources/DockSplitStore.swift:1475`

### dock · trust

- "Trust Project Dock?" · `dock.trust.title` · `Sources/DockPanelView.swift:195`

## contextMenu

### contextMenu · (general)

- "Close Workspaces Above" · `contextMenu.closeWorkspacesAbove` · `Sources/TabItemView+WorkspaceContextMenu.swift:268`
- "Copy Error" · `contextMenu.copyError` · `Sources/Sidebar/SidebarAppearanceSupport.swift:249`
- "Copy Errors" · `contextMenu.copyErrors` · `Sources/Sidebar/SidebarAppearanceSupport.swift:251`
- "Copy SSH Error" · `contextMenu.copySshError` · `Sources/TabItemView+WorkspaceContextMenu.swift:202`
- "Copy Workspace IDs" · `contextMenu.copyWorkspaceIDs` · `Sources/TabItemView+WorkspaceContextMenu.swift:67`
- "Copy Workspace Links" · `contextMenu.copyWorkspaceLinks` · `Sources/TabItemView+WorkspaceContextMenu.swift:71`
- "Disconnect Workspaces" · `contextMenu.disconnectWorkspaces` · `Sources/TabItemView+WorkspaceContextMenu.swift:38`
- "Mark Workspace as Read" · `contextMenu.markWorkspaceRead` · `Sources/TabItemView+WorkspaceContextMenu.swift:56`
- "Mark Workspace as Unread" · `contextMenu.markWorkspaceUnread` · `Sources/TabItemView+WorkspaceContextMenu.swift:60`
- "Mark Workspaces as Done" · `contextMenu.markWorkspacesDone` · `Sources/TabItemView+WorkspaceTodo.swift:18`
- "Mark Workspaces as Read" · `contextMenu.markWorkspacesRead` · `Sources/TabItemView+WorkspaceContextMenu.swift:55`
- "Mark Workspaces as Unread" · `contextMenu.markWorkspacesUnread` · `Sources/TabItemView+WorkspaceContextMenu.swift:59`
- "Move Workspace to Window" · `contextMenu.moveWorkspaceToWindow` · `Sources/TabItemView+WorkspaceContextMenu.swift:80`
- "Move Workspaces to Window" · `contextMenu.moveWorkspacesToWindow` · `Sources/TabItemView+WorkspaceContextMenu.swift:79`
- "Mute Notifications for Selected Workspaces" · `contextMenu.muteWorkspacesNotifications` · `Sources/NotificationMuteMenuOption.swift:19`
- "Pin Workspaces" · `contextMenu.pinWorkspaces` · `Sources/TabItemView+WorkspaceContextMenu.swift:43`
- "Reconnect Workspaces" · `contextMenu.reconnectWorkspaces` · `Sources/TabItemView+WorkspaceContextMenu.swift:34`
- "Unmute Notifications for Selected Workspaces" · `contextMenu.unmuteWorkspacesNotifications` · `Sources/NotificationMuteMenuOption.swift:29`
- "Unpin Workspaces" · `contextMenu.unpinWorkspaces` · `Sources/TabItemView+WorkspaceContextMenu.swift:47`
- "Workspace Settings" · `contextMenu.workspaceSettings` · defined but unused

### contextMenu · workspaceGroup

- "New Group from Selection" · `contextMenu.workspaceGroup.newFromSelection` · `Sources/TabItemView+WorkspaceGroups.swift:39`

### contextMenu · workspaceSettings

- "Hide Terminal Scroll Bar" · `contextMenu.workspaceSettings.hideTerminalScrollBar` · defined but unused

## update

### update · debug

- "Disk Image / Translocated (1003)" · `update.debug.error.diskImageTranslocation` · `Packages/macOS/CmuxUpdater/Sources/CmuxUpdater/DebugUpdateErrorScenario.swift:43`
- "Install Didn’t Start (watchdog)" · `update.debug.error.installDidNotStart` · `Packages/macOS/CmuxUpdater/Sources/CmuxUpdater/DebugUpdateErrorScenario.swift:50`
- "Install Failure / Auth (4005→4001)" · `update.debug.error.installFailureWrappingAuth` · `Packages/macOS/CmuxUpdater/Sources/CmuxUpdater/DebugUpdateErrorScenario.swift:39`
- "Installer Agent Failure (4005 + timeout)" · `update.debug.error.installerAgentFailure` · `Packages/macOS/CmuxUpdater/Sources/CmuxUpdater/DebugUpdateErrorScenario.swift:33`

### update · error

- "The network connection was lost while checking for updates. Try again." · `update.error.connectionLost.message` · `Packages/macOS/CmuxUpdater/Sources/CmuxUpdater/UpdateStateModel+ErrorFormatting.swift:96`
- "cmux couldn’t start the update. Check your internet connection and try again." · `update.error.didNotStart.message` · `Packages/macOS/CmuxUpdater/Sources/CmuxUpdater/UpdateController+InstallAttempt.swift:47`
- "Update Didn’t Start" · `update.error.didNotStart.title` · `Packages/macOS/CmuxUpdater/Sources/CmuxUpdater/UpdateStateModel+ErrorFormatting.swift:18`
- "Download Latest Version" · `update.error.downloadLatest.button` · `Packages/macOS/CmuxUpdaterUI/Sources/CmuxUpdaterUI/UpdateErrorView.swift:50`
- "Something went wrong while checking for updates. Try again, or check the update log for details." · `update.error.failed.message` · `Packages/macOS/CmuxUpdater/Sources/CmuxUpdater/UpdateStateModel+ErrorFormatting.swift:135`
- "cmux couldn't download the update feed. Check your connection and try again." · `update.error.feedDownload.message` · `Packages/macOS/CmuxUpdater/Sources/CmuxUpdater/UpdateStateModel+ErrorFormatting.swift:116`
- "The update feed could not be read. Please try again later." · `update.error.feedRead.message` · `Packages/macOS/CmuxUpdater/Sources/CmuxUpdater/UpdateStateModel+ErrorFormatting.swift:118`
- "The update feed is insecure. Please contact support." · `update.error.insecureFeed.message` · `Packages/macOS/CmuxUpdater/Sources/CmuxUpdater/UpdateStateModel+ErrorFormatting.swift:122`
- "Move cmux into Applications and relaunch to enable updates. If it’s already in Applications, restart your Mac and try again, or download the latest version below." · `update.error.installRecovery.message` · `Packages/macOS/CmuxUpdater/Sources/CmuxUpdater/UpdateStateModel+ErrorFormatting.swift:128`
- "macOS didn’t start cmux’s updater helper in time. Security software can delay it. Retry once; if it still fails, restart your Mac or download and install the latest version below." · `update.error.installerAgent.message` · `Packages/macOS/CmuxUpdater/Sources/CmuxUpdater/UpdateStateModel+ErrorFormatting.swift:109`
- "Couldn’t Start Updater" · `update.error.installerAgent.title` · `Packages/macOS/CmuxUpdater/Sources/CmuxUpdater/UpdateStateModel+ErrorFormatting.swift:50`
- "The update feed URL is invalid. Please contact support." · `update.error.invalidFeed.message` · `Packages/macOS/CmuxUpdater/Sources/CmuxUpdater/UpdateStateModel+ErrorFormatting.swift:120`
- "cmux can't reach the update server. Check your internet connection and try again." · `update.error.noInternet.message` · `Packages/macOS/CmuxUpdater/Sources/CmuxUpdater/UpdateStateModel+ErrorFormatting.swift:88`
- "A secure connection to the update server couldn't be established. Try again later." · `update.error.secureConnectionFailed.message` · `Packages/macOS/CmuxUpdater/Sources/CmuxUpdater/UpdateStateModel+ErrorFormatting.swift:102`
- "The update server can't be found. Check your connection or try again later." · `update.error.serverNotFound.message` · `Packages/macOS/CmuxUpdater/Sources/CmuxUpdater/UpdateStateModel+ErrorFormatting.swift:92`
- "cmux couldn't connect to the update server. Check your connection or try again later." · `update.error.serverUnreachable.message` · `Packages/macOS/CmuxUpdater/Sources/CmuxUpdater/UpdateStateModel+ErrorFormatting.swift:94`
- "The update's signature could not be verified. Please try again later." · `update.error.signatureError.message` · `Packages/macOS/CmuxUpdater/Sources/CmuxUpdater/UpdateStateModel+ErrorFormatting.swift:124`
- "The update server took too long to respond. Try again in a moment." · `update.error.timedOut.message` · `Packages/macOS/CmuxUpdater/Sources/CmuxUpdater/UpdateStateModel+ErrorFormatting.swift:90`

## menu

### menu · file

- "Open in VS Code" · `menu.file.openFolderInVSCodeInline.panelPrompt` · `Sources/AppDelegate.swift:9346`

### menu · history

- "No Back History" · `menu.history.noFocusBackHistory` · defined but unused
- "No Forward History" · `menu.history.noFocusForwardHistory` · defined but unused
- "No Focus History" · `menu.history.noFocusHistory` · `Sources/AppDelegate+FocusHistoryContextMenu.swift:67`
- "%1$@ (%2$@)" · `menu.history.recentlyClosed.menuItemFormat` · defined but unused
- "Tabs, workspaces, and windows" · `menu.history.recentlyClosed.subtitle` · `Sources/cmuxApp+HistoryMenu.swift:86`
- "1 workspace" · `menu.history.recentlyClosed.window.oneWorkspace` · defined but unused
- "[one] %d workspace / [other] %d workspaces" · `menu.history.recentlyClosed.window.workspaceCount` · defined but unused
- "1 workspace" · `menu.history.recentlyClosed.window.workspaceCount.one` · `Sources/ClosedItemHistory.swift:813`
- "[one] %d workspace / [other] %d workspaces" · `menu.history.recentlyClosed.window.workspaceCount.other` · `Sources/ClosedItemHistory.swift:817`
- "Show Full Back History" · `menu.history.showFullFocusBackHistory` · defined but unused
- "Show Full Forward History" · `menu.history.showFullFocusForwardHistory` · defined but unused
- "Show Full History" · `menu.history.showFullFocusHistory` · `Sources/AppDelegate+FocusHistoryContextMenu.swift:91`

### menu · newWorkspace

- "Delete “%@”" · `menu.newWorkspace.deleteLayoutAlternate` · `Sources/AppDelegate+NewWorkspaceMenuRendering.swift:49`

### menu · updateLogs

- "Copy Update Logs" · `menu.updateLogs.copyUpdateLogs` · `Sources/cmuxApp.swift:850`

### menu · view

- "Toggle Right Sidebar Focus" · `menu.view.focusRightSidebar` · `Sources/cmuxApp.swift:1089`

## cloudTunnel

### cloudTunnel · error

- "The request to load the cmux Cloud Tunnel extension was canceled." · `cloudTunnel.error.activationCanceled` · `Sources/Cloud/Tunnel/SystemExtensionActivationDelegate.swift:72`
- "macOS could not load the cmux Cloud Tunnel extension (code %d)." · `cloudTunnel.error.activationFailed` · `Sources/Cloud/Tunnel/SystemExtensionActivationDelegate.swift:82`
- "macOS did not allow the cmux Cloud Tunnel extension to load. Allow it in System Settings › General › Login Items & Extensions, then retry." · `cloudTunnel.error.activationNotAllowed` · `Sources/Cloud/Tunnel/SystemExtensionActivationDelegate.swift:77`
- "macOS only loads the cmux Cloud Tunnel extension from the Applications folder. Move cmux.app to /Applications and retry." · `cloudTunnel.error.appNotInApplicationsFolder` · `Sources/Cloud/Tunnel/CloudTunnelError.swift:58`
- "The VPN configuration was not saved before the tunnel was started." · `cloudTunnel.error.configurationNotInstalled` · `Sources/Cloud/Tunnel/CloudTunnelError.swift:74`
- "The tunnel did not come up in time." · `cloudTunnel.error.deadlineExceeded` · `Sources/Cloud/Tunnel/CloudTunnelError.swift:69`
- "cmux could not start the Cloud VPN. Try again." · `cloudTunnel.error.genericFailure` · `Sources/Cloud/Tunnel/CloudTunnelCoordinator+Deadline.swift:38`
- "VPN status updates stopped arriving." · `cloudTunnel.error.linkStatusUnavailable` · `Sources/Cloud/Tunnel/CloudTunnelCoordinator.swift:744`
- "Sign in to cmux Cloud first (`cmux auth login`), then retry." · `cloudTunnel.error.notSignedIn` · `Sources/Cloud/Tunnel/CloudTunnelError.swift:48`
- "macOS needs a restart to finish installing the cmux Cloud Tunnel extension." · `cloudTunnel.error.rebootRequired` · `Sources/Cloud/Tunnel/CloudTunnelError.swift:53`
- "The tunnel start was cancelled." · `cloudTunnel.error.startCancelled` · `Sources/Cloud/Tunnel/CloudTunnelCoordinator.swift:337`
- "The tunnel could not start: %@" · `cloudTunnel.error.startFailed` · `Sources/Cloud/Tunnel/CloudTunnelError.swift:63`
- "macOS rejected the VPN configuration (code %d)." · `cloudTunnel.error.vpnConfiguration` · `Sources/Cloud/Tunnel/CloudTunnelCoordinator+Deadline.swift:32`

## workspaceGroup

### workspaceGroup · autoName

- "Group %lld" · `workspaceGroup.autoName.numbered` · `Sources/TabManager.swift:2339`

### workspaceGroup · collapse

- "Collapse group" · `workspaceGroup.collapse.a11y` · `Sources/SidebarWorkspaceGroupHeaderView.swift:155`

### workspaceGroup · contextMenu

- "Mark All Workspaces in Group as Read" · `workspaceGroup.contextMenu.markAllRead` · `Sources/SidebarWorkspaceGroupHeaderView.swift:367`
- "Mark Group as Unread" · `workspaceGroup.contextMenu.markUnread` · `Sources/SidebarWorkspaceGroupHeaderView.swift:350`

### workspaceGroup · expand

- "Expand group" · `workspaceGroup.expand.a11y` · `Sources/SidebarWorkspaceGroupHeaderView.swift:154`

### workspaceGroup · focusAnchor

- "Focus the group’s anchor workspace" · `workspaceGroup.focusAnchor.a11y` · `Sources/SidebarWorkspaceGroupHeaderView.swift:194`

### workspaceGroup · placement

- "Insert new group workspaces after the active workspace in that group." · `workspaceGroup.placement.afterCurrent.description` · defined but unused
- "End of group" · `workspaceGroup.placement.end` · defined but unused
- "Append new group workspaces after the last group member." · `workspaceGroup.placement.end.description` · defined but unused
- "Top of group" · `workspaceGroup.placement.top` · defined but unused
- "Insert new group workspaces right after the group header." · `workspaceGroup.placement.top.description` · defined but unused

### workspaceGroup · rename

- "Enter a new name for this group." · `workspaceGroup.rename.message` · `Sources/SidebarWorkspaceGroupDialogs.swift:15`

### workspaceGroup · unread

- "[one] %lld unread / [other] %lld unread" · `workspaceGroup.unread.a11y` · `Sources/SidebarWorkspaceGroupHeaderView.swift:181`

## sessionIndex

### sessionIndex · allSessions

- "Sort sessions" · `sessionIndex.allSessions.sortTooltip` · defined but unused

### sessionIndex · checkpoints

- "The new session id is invalid" · `sessionIndex.checkpoints.error.invalidSessionID` · `Sources/VaultCheckpointFork.swift:21`
- "The original transcript file is missing" · `sessionIndex.checkpoints.error.parentMissing` · `Sources/VaultCheckpointFork.swift:18`
- "Couldn't read the original transcript" · `sessionIndex.checkpoints.error.readFailed` · `Sources/VaultCheckpointFork.swift:33`
- "An unexpected error occurred" · `sessionIndex.checkpoints.error.unknown` · `Sources/TerminalController+VaultCommands.swift:204`
- "Couldn't write the forked transcript" · `sessionIndex.checkpoints.error.writeFailed` · `Sources/VaultCheckpointFork.swift:36`
- "Fork from checkpoint isn't available for this agent yet — the timeline is view-only" · `sessionIndex.checkpoints.forkUnavailable` · `Sources/VaultCheckpointTimelineView.swift:47`

### sessionIndex · filter

- "All folders" · `sessionIndex.filter.folder.all` · defined but unused

### sessionIndex · preview

- "Resize preview" · `sessionIndex.preview.resize` · `Sources/SessionIndexView.swift:1367`

### sessionIndex · search

- "No matching sessions" · `sessionIndex.search.noResults` · `Sources/SessionIndexView.swift:518`

### sessionIndex · section

- "[one] Show %lld more / [other] Show %lld more" · `sessionIndex.section.showMoreCount` · defined but unused

### sessionIndex · view

- "Choose session view" · `sessionIndex.view.tooltip` · `Sources/VaultAllSessionsBar.swift:76`

## agentSession

### agentSession · bridge

- "The selected provider is unavailable." · `agentSession.bridge.error.invalidProvider` · `Sources/Panels/AgentSessionBridgeError.swift:41`
- "Invalid bridge request." · `agentSession.bridge.error.invalidRequest` · `Sources/Panels/AgentSessionBridgeError.swift:37`
- "The request is incomplete." · `agentSession.bridge.error.missingParameter` · `Sources/Panels/AgentSessionBridgeError.swift:47`
- "The provider is not ready yet." · `agentSession.bridge.error.providerNotReady` · `Sources/Panels/AgentSessionBridgeError.swift:70`
- "An agent session is already running." · `agentSession.bridge.error.sessionAlreadyRunning` · `Sources/Panels/AgentSessionBridgeError.swift:64`
- "The agent session is no longer available." · `agentSession.bridge.error.sessionNotFound` · `Sources/Panels/AgentSessionBridgeError.swift:59`
- "This action is not supported." · `agentSession.bridge.error.unsupportedMethod` · `Sources/Panels/AgentSessionBridgeError.swift:53`
- "Agent transport is not supported." · `agentSession.bridge.error.unsupportedTransport` · `Sources/Panels/AgentSessionBridgeError.swift:76`

### agentSession · web

- "Change permissions" · `agentSession.web.changePermissions` · `Sources/Panels/AgentSessionWebRendererCoordinator.swift:460`
- "Copy output" · `agentSession.web.copyOutput` · `Sources/Panels/AgentSessionWebRendererCoordinator.swift:401`
- "[one] Sent %d char / [other] Sent %d chars" · `agentSession.web.log.sentCharsFormat` · `Sources/Panels/AgentSessionWebRendererCoordinator.swift:537`

## sleepyMode

### sleepyMode · button

- "Low Power: Off" · `sleepyMode.button.lowPowerOff` · `Sources/SleepyFaceView.swift:173`
- "Low Power: On" · `sleepyMode.button.lowPowerOn` · `Sources/SleepyFaceView.swift:172`

### sleepyMode · energy

- "High Power" · `sleepyMode.energy.high` · defined but unused
- "Low Power" · `sleepyMode.energy.low` · defined but unused

### sleepyMode · settings

- "Shows the scene full screen without locking; any key or click exits." · `sleepyMode.settings.previewRow.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SleepyModeSection.swift:121`
- "Require Touch ID to exit" · `sleepyMode.settings.requireAuth` · defined but unused
- "Casual screensaver. Any key or click wakes it." · `sleepyMode.settings.requireAuth.off` · defined but unused
- "Locks the Mac. Blocks Cmd-Tab, Cmd-Q, and force-quit until you authenticate." · `sleepyMode.settings.requireAuth.on` · defined but unused
- "Engages Sleepy Mode using the settings above." · `sleepyMode.settings.startRow.subtitle` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SleepyModeSection.swift:131`
- "Floating z z z" · `sleepyMode.settings.zs` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/SleepyModeSection.swift:105`

## auth

### auth · error

- "Could not complete browser sign-in. Try again or open sign-in in your browser." · `auth.error.browser_sign_in_failed` · `Packages/Shared/CmuxAuthRuntime/Sources/CmuxAuthRuntime/Coordinator/AuthError.swift:77`
- "The sign-in callback was invalid. Try signing in again." · `auth.error.invalid_callback` · `Packages/Shared/CmuxAuthRuntime/Sources/CmuxAuthRuntime/Coordinator/AuthError.swift:71`
- "Invalid code. Please try again." · `auth.error.invalid_code_short` · `Packages/Shared/CmuxAuthRuntime/Sources/CmuxAuthRuntime/Coordinator/AuthError.swift:65`
- "Network error. Please check your connection." · `auth.error.network_error` · `Packages/Shared/CmuxAuthRuntime/Sources/CmuxAuthRuntime/Coordinator/AuthError.swift:47`
- "No internet connection. Connect to Wi-Fi or cellular and try again." · `auth.error.offline` · `Packages/Shared/CmuxAuthRuntime/Sources/CmuxAuthRuntime/Coordinator/AuthError.swift:41`
- "Something went wrong. Please try again." · `auth.error.server_error` · `Packages/Shared/CmuxAuthRuntime/Sources/CmuxAuthRuntime/Coordinator/AuthError.swift:59`
- "Sign-in timed out. Check your connection and try again." · `auth.error.timed_out` · `Packages/Shared/CmuxAuthRuntime/Sources/CmuxAuthRuntime/Coordinator/AuthError.swift:53`
- "Session expired. Please sign in again." · `auth.error.unauthorized` · `Packages/Shared/CmuxAuthRuntime/Sources/CmuxAuthRuntime/Coordinator/AuthError.swift:83`
- "Incorrect email or password." · `auth.error.wrong_password` · `Packages/Shared/CmuxAuthRuntime/Sources/CmuxAuthRuntime/Coordinator/AuthError.swift:89`

## featureFlags

### featureFlags · appKitSidebarList

- "Renders the workspace sidebar with a native AppKit list and divider for smoother scrolling and resizing with many workspaces." · `featureFlags.appKitSidebarList.description` · `Sources/FeatureFlags.swift:83`

### featureFlags · cloudMachines

- "Enables the macOS Cloud Machines integration, including entry points, attachments, and background sync." · `featureFlags.cloudMachines.description` · `Sources/CmuxFeatureFlags+Cloud.swift:12`

### featureFlags · mobileTaskComposer

- "Enables the iOS New Task composer, including task model discovery, directory picking, and attachment staging." · `featureFlags.mobileTaskComposer.description` · `Sources/FeatureFlags.swift:162`

### featureFlags · mobileTerminalFilesChip

- "Shows the Files chip over iOS terminals and runs its visible-path count scan." · `featureFlags.mobileTerminalFilesChip.description` · `Sources/FeatureFlags.swift:123`

### featureFlags · mobileWorkspaceChanges

- "Serves workspace diffs to paired phones: the iOS changes chip, toolbar button, and Changes sheet." · `featureFlags.mobileWorkspaceChanges.description` · `Sources/FeatureFlags.swift:105`

### featureFlags · sidebarAccount

- "Shows the profile and sign-in control in the sidebar footer." · `featureFlags.sidebarAccount.description` · `Sources/FeatureFlags.swift:227`

### featureFlags · sidebarWorkspaceAgentSpinner

- "Shows a spinner in workspace rows while coding agents are running." · `featureFlags.sidebarWorkspaceAgentSpinner.description` · `Sources/FeatureFlags.swift:259`

### featureFlags · simulator

- "Enables iPhone and iPad Simulator panes, commands, and automation." · `featureFlags.simulator.description` · `Sources/FeatureFlags.swift:143`

### featureFlags · workspaceTodoControls

- "Shows Add Checklist Item and workspace completion status controls." · `featureFlags.workspaceTodoControls.description` · `Sources/FeatureFlags.swift:294`

## notifications

### notifications · empty

- "Desktop notifications will appear here for quick review." · `notifications.empty.description` · `Sources/NotificationsPage.swift:224`
- "Desktop notifications will appear here." · `notifications.empty.subtitle` · `Sources/Update/UpdateTitlebarAccessory.swift:2580`

### notifications · forwardToPhone

- "Hide content (send a generic message instead of the terminal text)" · `notifications.forwardToPhone.hideContent` · `Sources/NotificationsPage.swift:165`
- "Only when away from this Mac" · `notifications.forwardToPhone.mode.onlyWhenAway` · `Sources/NotificationsPage.swift:149`
- "[one] Away means the screen is locked or asleep, the screensaver is running, or there has been no keyboard or mouse input for %lld minute. / [other] Away means the screen is locked or asleep, the screensaver is running, or there has been no keyboard or mouse input for %lld minutes." · `notifications.forwardToPhone.mode.subtitle` · `Sources/NotificationsPage.swift:213`
- "Send local agent notifications to cmux on your iPhone. Enabled by default; turn this off to stop this Mac from forwarding them." · `notifications.forwardToPhone.subtitle` · `Sources/NotificationsPage.swift:137`
- "Forward notifications to my iPhone" · `notifications.forwardToPhone.title` · `Sources/NotificationsPage.swift:136`

### notifications · resize

- "Drag to resize the notifications popover" · `notifications.resize.hint` · `Sources/Update/UpdateTitlebarAccessory.swift:2468`

### notifications · row

- "Clear notification" · `notifications.row.clear` · `Sources/NotificationsPage.swift:388`

## rightSidebar

### rightSidebar · customSidebar

- "Custom sidebar not found" · `rightSidebar.customSidebar.missing` · defined but unused

### rightSidebar · remote

- "ERROR: Right sidebar not available" · `rightSidebar.remote.error.unavailable` · `Sources/AppDelegate.swift:7547`
- "ERROR: Usage: right_sidebar <toggle|show|hide|focus|set|mode> [mode] [--workspace=<workspace-id>] [--window=<window-id>] [--no-focus]" · `rightSidebar.remote.error.usage` · `Sources/RightSidebarRemoteCommand.swift:108`
- "ERROR: Usage: right_sidebar focus [--workspace=<workspace-id>] [--window=<window-id>]" · `rightSidebar.remote.error.usage.focus` · `Sources/RightSidebarRemoteCommand.swift:129`
- "ERROR: Usage: right_sidebar hide [--workspace=<workspace-id>] [--window=<window-id>]" · `rightSidebar.remote.error.usage.hide` · `Sources/RightSidebarRemoteCommand.swift:124`
- "ERROR: Usage: right_sidebar mode [--workspace=<workspace-id>] [--window=<window-id>]" · `rightSidebar.remote.error.usage.mode` · `Sources/RightSidebarRemoteCommand.swift:134`
- "ERROR: Usage: right_sidebar set <files|find|vault|sessions|feed|dock|custom> [sidebar-name] [--no-focus] [--workspace=<workspace-id>] [--window=<window-id>]" · `rightSidebar.remote.error.usage.set` · `Sources/RightSidebarRemoteCommand.swift:139`
- "ERROR: Usage: right_sidebar show [--workspace=<workspace-id>] [--window=<window-id>]" · `rightSidebar.remote.error.usage.show` · `Sources/RightSidebarRemoteCommand.swift:119`
- "ERROR: Usage: right_sidebar toggle [--workspace=<workspace-id>] [--window=<window-id>]" · `rightSidebar.remote.error.usage.toggle` · `Sources/RightSidebarRemoteCommand.swift:114`

## remoteDaemon

### remoteDaemon · error

- "Failed to encode Cloud CLI request" · `remoteDaemon.error.cloudNotificationClearEncodingFailed` · `Sources/RemoteDaemonStrings+App.swift:46`
- "Cloud CLI notification clear requires a valid surface_id" · `remoteDaemon.error.cloudNotificationClearSurfaceInvalid` · `Sources/RemoteDaemonStrings+App.swift:30`
- "Cloud CLI notification clear target does not match this workspace" · `remoteDaemon.error.cloudNotificationClearWorkspaceDenied` · `Sources/RemoteDaemonStrings+App.swift:26`
- "remote daemon is missing required functionality; reconnect the remote workspace to update cmux" · `remoteDaemon.error.missingRequiredFunctionality` · `Sources/RemoteDaemonStrings+App.swift:18`

### remoteDaemon · upload

- "failed to create remote daemon directory: %@" · `remoteDaemon.upload.createDirectoryFailedWithDetail` · `Packages/macOS/CmuxRemoteSession/Sources/CmuxRemoteSession/Session/RemoteSessionCoordinator+DaemonUpload.swift:66`
- "failed to install remote daemon" · `remoteDaemon.upload.installFailed` · `Packages/macOS/CmuxRemoteSession/Sources/CmuxRemoteSession/Session/RemoteSessionCoordinator+BootstrapErrorMessage.swift:53`
- "failed to install remote daemon binary: %@" · `remoteDaemon.upload.installFailedWithDetail` · `Packages/macOS/CmuxRemoteSession/Sources/CmuxRemoteSession/Session/RemoteSessionCoordinator+DaemonUpload.swift:350`
- "failed to upload remote daemon" · `remoteDaemon.upload.transferFailed` · `Packages/macOS/CmuxRemoteSession/Sources/CmuxRemoteSession/Session/RemoteSessionCoordinator+BootstrapErrorMessage.swift:43`

## statusMenu

### statusMenu · profiling

- "The profile archive is ready. cmux is opening the submission draft now." · `statusMenu.profiling.completeBody` · defined but unused
- "The email draft could not be opened." · `statusMenu.profiling.draftFailed` · defined but unused
- "The email draft is open." · `statusMenu.profiling.draftOpened` · defined but unused
- "Open Email Draft" · `statusMenu.profiling.openDraft` · defined but unused
- "Packaging the profile and opening an email draft." · `statusMenu.profiling.openingDraftStatus` · defined but unused
- "Starting Instruments..." · `statusMenu.profiling.starting` · `Sources/App/MenuBarProfilingProgressWindowController.swift:259`

### statusMenu · tooltip

- "[one] %lld unread notification / [other] %lld unread notifications" · `statusMenu.tooltip.unread.other` · `Sources/App/MenuBarExtraController.swift:227`

### statusMenu · unreadCount

- "[one] %lld unread notification / [other] %lld unread notifications" · `statusMenu.unreadCount.other` · `Sources/App/MenuBarExtraController.swift:384`

## cloudVM

### cloudVM · publication

- "Cloud VM publication response contained an invalid DNS instruction." · `cloudVM.publication.error.invalidDNS` · `Sources/Cloud/VMClient.swift:1042`
- "Cloud VM publication verification response was missing DNS instructions." · `cloudVM.publication.error.missingDNS` · `Sources/Cloud/VMClient.swift:997`
- "Cloud VM domain verification response was missing `domain`." · `cloudVM.publication.error.missingDomain` · `Sources/Cloud/VMClient.swift:848`
- "Cloud VM domain response was missing required fields." · `cloudVM.publication.error.missingDomainFields` · `Sources/Cloud/VMClient.swift:1056`
- "Cloud VM domain list response was missing `domains`." · `cloudVM.publication.error.missingDomainList` · `Sources/Cloud/VMClient.swift:828`
- "Cloud VM publication response was missing required fields." · `cloudVM.publication.error.missingFields` · `Sources/Cloud/VMClient.swift:954`
- "Cloud VM publication list response was missing `publications`." · `cloudVM.publication.error.missingList` · `Sources/Cloud/VMClient.swift:813`

## markdown

### markdown · mode

- "Show Preview" · `markdown.mode.showPreview` · `Sources/Panels/MarkdownPanelView.swift:182`
- "Show TextEdit" · `markdown.mode.showTextEdit` · `Sources/Panels/MarkdownPanelView.swift:176`
- "Toggle Markdown Mode" · `markdown.mode.toggle` · defined but unused

### markdown · toolbar

- "Copy as HTML" · `markdown.toolbar.copyHTML` · `Sources/Panels/MarkdownPanelView.swift:318`
- "Copy as Markdown" · `markdown.toolbar.copyMarkdown` · `Sources/Panels/MarkdownPanelView.swift:313`

### markdown · web

- "Remote image blocked" · `markdown.web.remoteImageBlocked` · `Sources/Panels/MarkdownViewerAssets.swift:90`
- "This remote image URL cannot be loaded in the viewer." · `markdown.web.remoteImageNotAllowed` · `Sources/Panels/MarkdownViewerAssets.swift:122`

## alert

### alert · invalidColor

- ""%@" is not a valid hex color. Use #RRGGBB." · `alert.invalidColor.invalidMessage` · `Sources/ContentView.swift:16904`

### alert · moveTab

- "Choose a destination for this tab." · `alert.moveTab.message` · defined but unused
- "New Workspace in Current Window" · `alert.moveTab.newWorkspaceInCurrentWindow` · defined but unused
- "Selected Workspace in New Window" · `alert.moveTab.selectedWorkspaceInNewWindow` · defined but unused

### alert · renameTab

- "Enter a custom name for this tab." · `alert.renameTab.message` · `Sources/DockSplitStore+ShortcutCommands.swift:233`

### alert · renameWorkspace

- "Enter a custom name for this workspace." · `alert.renameWorkspace.message` · `Sources/ContentView.swift:16915`

## socketControl

### socketControl · allowAll

- "Allow any local process and user to connect with no auth. Unsafe." · `socketControl.allowAll.description` · `Sources/SocketControlMode+Display.swift:43`

### socketControl · automation

- "Allow external local automation clients from this macOS user (no ancestry check)." · `socketControl.automation.description` · `Sources/SocketControlMode+Display.swift:39`
- "Automation mode" · `socketControl.automation.name` · `Sources/SocketControlMode+Display.swift:23`

### socketControl · cmuxOnly

- "Only processes started inside cmux terminals can send commands." · `socketControl.cmuxOnly.description` · `Sources/SocketControlMode+Display.swift:37`

### socketControl · off

- "Disable the local control socket." · `socketControl.off.description` · `Sources/SocketControlMode+Display.swift:35`

### socketControl · password

- "Require socket authentication with a password stored in a local file." · `socketControl.password.description` · `Sources/SocketControlMode+Display.swift:41`

## taskManager

### taskManager · aggregate

- "[one] %lld process / [other] %lld processes" · `taskManager.aggregate.processCount.other` · `Sources/TaskManagerSnapshot.swift:305`

### taskManager · killProcess

- "Unable to kill process: %@" · `taskManager.killProcess.error` · `Sources/TaskManagerWindowController.swift:229`
- "[one] Ask %lld process to terminate gracefully. cmux will force-kill remaining processes after a short grace period. PID: %@. / [other] Ask %lld processes to terminate gracefully. cmux will force-kill remaining processes after a short grace period. PIDs: %@." · `taskManager.killProcess.message.other` · `Sources/TaskManagerWindowController.swift:259`
- "Kill processes?" · `taskManager.killProcess.title.other` · `Sources/TaskManagerWindowController.swift:256`

### taskManager · loading

- "Loading resource usage" · `taskManager.loading.title` · `Sources/TaskManagerView.swift:330`

### taskManager · row

- "Unknown tag" · `taskManager.row.unknownTag` · `Sources/TaskManagerSnapshot.swift:374`

## fileExplorer

### fileExplorer · search

- "Search failed: %@" · `fileExplorer.search.failed` · `Sources/FileExplorerView.swift:1578`
- "[one] First %d match / [other] First %d matches" · `fileExplorer.search.limit` · `Sources/FileExplorerView.swift:1573`
- "[one] %d match / [other] %d matches" · `fileExplorer.search.matches` · `Sources/FileExplorerView.swift:1568`
- "Configured ripgrep path is not executable: %@" · `fileExplorer.search.rgConfiguredPathNotExecutable` · `Sources/FileExplorerSearchController.swift:174`
- "[one] %d match, searching / [other] %d matches, searching" · `fileExplorer.search.searching` · `Sources/FileExplorerView.swift:1561`

## surfaceResumeApproval

### surfaceResumeApproval · pending

- "Resume approval data is still loading. Retry the request." · `surfaceResumeApproval.pending.message` · `Sources/TerminalController+SurfaceResumeApproval.swift:94`

### surfaceResumeApproval · proposal

- "Apply to all commands starting with “%@” in this folder" · `surfaceResumeApproval.proposal.applyToPrefix` · `Sources/TerminalController+SurfaceResumeApproval.swift:134`
- "A process wants cmux to keep this resume command for the current terminal:\n\nWorking directory: %@\n\n%@" · `surfaceResumeApproval.proposal.message` · `Sources/TerminalController+SurfaceResumeApproval.swift:111`

### surfaceResumeApproval · runPrompt

- "Don’t ask again for this command" · `surfaceResumeApproval.runPrompt.dontAskAgain` · `Sources/Workspace.swift:3554`
- "cmux is restoring a terminal with this resume command:\n\nWorking directory: %@\n\n%@" · `surfaceResumeApproval.runPrompt.message` · `Sources/Workspace.swift:3542`

## commandPalette

### commandPalette · rename

- "Press Enter to apply this tab name, or Escape to cancel." · `commandPalette.rename.tabConfirmHint` · `Sources/ContentView.swift:5115`
- "Press Enter to apply this workspace name, or Escape to cancel." · `commandPalette.rename.workspaceConfirmHint` · `Sources/ContentView.swift:5113`
- "Choose a custom workspace name." · `commandPalette.rename.workspaceDescription` · `Packages/macOS/CmuxCommandPalette/Sources/CmuxCommandPalette/Values/CommandPaletteRenameTarget.swift:74`
- "Press Enter to apply this group name, or Escape to cancel." · `commandPalette.rename.workspaceGroupConfirmHint` · `Sources/ContentView.swift:5117`

## relativeTime

### relativeTime · (general)

- "[one] %lldd / [other] %lldd" · `relativeTime.days` · `Sources/ExtensionSidebarWorkspaceRowView.swift:154`
- "[one] %lldh / [other] %lldh" · `relativeTime.hours` · `Sources/ExtensionSidebarWorkspaceRowView.swift:152`
- "[one] %lldm / [other] %lldm" · `relativeTime.minutes` · `Sources/ExtensionSidebarWorkspaceRowView.swift:150`
- "[one] %lldw / [other] %lldw" · `relativeTime.weeks` · `Sources/ExtensionSidebarWorkspaceRowView.swift:156`

## terminal

### terminal · agentHibernation

- "Agent shutdown needs attention" · `terminal.agentHibernation.failed` · `Sources/Panels/TerminalPanelView.swift:276`
- "Finishing agent shutdown" · `terminal.agentHibernation.finishing` · `Sources/Panels/TerminalPanelView.swift:271`
- "Retry shutdown" · `terminal.agentHibernation.retry` · `Sources/Panels/TerminalPanelView.swift:290`
- "Agent hibernated" · `terminal.agentHibernation.title` · `Sources/Panels/TerminalPanelView.swift:266`

## titlebar

### titlebar · cloudVM

- "Cloud VM actions" · `titlebar.cloudVM.menu.tooltip` · defined but unused

### titlebar · fileExplorer

- "Show or hide the file explorer" · `titlebar.fileExplorer.tooltip` · defined but unused

### titlebar · newWorkspace

- "New workspace options" · `titlebar.newWorkspace.menu.tooltip` · `Sources/Update/TitlebarNewWorkspaceSplitButton.swift:121`

### titlebar · sidebar

- "Show or hide the sidebar" · `titlebar.sidebar.tooltip` · `Sources/App/SettingsWindowFactory.swift:105`

## agent

### agent · campfire

- "add tools or skills" · `agent.campfire.capability.toolsContribute` · `CLI/CMUXCLI+CampfireNotifications.swift:84`

### agent · deliveryTarget

- "pid_resolution must be corroborated or controlling_tty" · `agent.deliveryTarget.error.invalidPidResolution` · `Sources/AgentDeliveryTargetResolution.swift:371`
- "Delivery target resolution is unavailable; retry after cmux finishes starting." · `agent.deliveryTarget.error.unavailable` · `Sources/AgentDeliveryTargetResolution.swift:385`

## agentRestore

### agentRestore · admission

- "Agent restore claim release requires a valid kind, session, and claim identifier." · `agentRestore.admission.releaseInvalid` · `Sources/TerminalController+AgentRestoreAdmission.swift:169`
- "cmux could not read its saved session records for this agent, so it cannot tell whether the session is already running. Retry 'cmux restore --surface'." · `agentRestore.admission.unavailable.hookStoreUnreadable` · defined but unused
- "cmux could not finish checking whether this agent session is already running before the time limit. Retry 'cmux restore --surface'." · `agentRestore.admission.unavailable.timedOut` · defined but unused

## cloudPane

### cloudPane · newTerminalFailed

- "Couldn’t open terminal" · `cloudPane.newTerminalFailed.shortTitle` · `Sources/Workspace.swift:7593`
- "The machine’s current state could not be loaded. Reconnect and try again." · `cloudPane.newTerminalFailed.stateUnavailable` · defined but unused
- "The machine returned an unknown error." · `cloudPane.newTerminalFailed.unknownError` · defined but unused

## common

### common · (general)

- "Copy Details" · `common.copyDetails` · `Packages/macOS/CmuxUpdaterUI/Sources/CmuxUpdaterUI/UpdateErrorView.swift:73`
- "Install and Relaunch" · `common.installAndRelaunch` · `Packages/macOS/CmuxUpdaterUI/Sources/CmuxUpdaterUI/UpdatePopoverView.swift:167`
- "Restart Later" · `common.restartLater` · `Packages/macOS/CmuxUpdaterUI/Sources/CmuxUpdaterUI/UpdatePopoverView.swift:414`

## detectedSSH

### detectedSSH · fileDrop

- "Couldn't upload the dropped item because it isn't a local file. Drop a file from Finder, then try again." · `detectedSSH.fileDrop.error.notFileURL` · `Sources/TerminalSSHSessionDetector.swift:107`
- "File transfer timed out. Check the remote host and network connection, then try again." · `detectedSSH.fileDrop.error.scpTimedOut` · `Sources/TerminalSSHSessionDetector.swift:319`
- "Couldn't upload the file to the remote session. Check that the remote host is reachable, then try again." · `detectedSSH.fileDrop.error.uploadFailed` · `Sources/TerminalSSHSessionDetector.swift:123`

## sudo

### sudo · cli

- "sudo: could not write the approval request" · `sudo.cli.error.request_write_failed` · `Packages/macOS/CmuxSudoBroker/Sources/CmuxSudoBroker/SudoCLIMessages.swift:80`
- "sudo: could not monitor the approval result; retry the command" · `sudo.cli.error.result_wait_failed` · `Packages/macOS/CmuxSudoBroker/Sources/CmuxSudoBroker/SudoCLIMessages.swift:87`
- "sudo: unexpected argument: %@" · `sudo.cli.error.unexpected_argument` · `Packages/macOS/CmuxSudoBroker/Sources/CmuxSudoBroker/SudoCLIMessages.swift:114`

## workspace

### workspace · placement

- "Insert new workspaces directly after the active workspace." · `workspace.placement.afterCurrent.description` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection+DisplayText.swift:45`
- "Append new workspaces to the bottom of the list." · `workspace.placement.end.description` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection+DisplayText.swift:50`
- "Insert new workspaces at the top of the list." · `workspace.placement.top.description` · `Packages/macOS/CmuxSettingsUI/Sources/CmuxSettingsUI/Sections/AppSection+DisplayText.swift:40`

## canvas

### canvas · minimap

- "Click or drag to move the canvas viewport" · `canvas.minimap.accessibilityHelp` · `Sources/Canvas/WorkspaceCanvasHostView.swift:198`
- "Canvas minimap" · `canvas.minimap.accessibilityLabel` · `Sources/Canvas/WorkspaceCanvasHostView.swift:194`

## panel

### panel · cloudVM

- "Cloud VM command could not be launched." · `panel.cloudVM.loading.failed.launch` · `Sources/AppDelegate.swift:8794`
- "Creating or reattaching to your persistent Cloud VM." · `panel.cloudVM.loading.message` · defined but unused

## surfaceCatalog

### surfaceCatalog · error

- "This terminal has more than one remote placement. Specify the remote tab." · `surfaceCatalog.error.ambiguousRemotePlacement` · `Packages/macOS/CmuxSurfaceCatalogModel/Sources/CmuxSurfaceCatalogModel/SurfaceCatalogModel.swift:2055`
- "Destination not found: %@." · `surfaceCatalog.error.destinationNotFound` · `Packages/macOS/CmuxSurfaceCatalogModel/Sources/CmuxSurfaceCatalogModel/SurfaceCatalogModel.swift:2059`

## globalSearch

### globalSearch · palette

- "Search all windows, panels, browser tabs..." · `globalSearch.palette.placeholder` · `Sources/Search/MenubarSearchPopover.swift:79`

## memory

### memory · attribution

- "[one] %lld workspace / [other] %lld workspaces" · `memory.attribution.multipleWorkspaces` · `Sources/CmuxTaskManagerMemoryGroupAttribution.swift:53`

## paneMemoryGuardrail

### paneMemoryGuardrail · banner

- "%1$@ in %2$@" · `paneMemoryGuardrail.banner.location` · defined but unused

## ssh

### ssh · tui

- "This SSH terminal is no longer available." · `ssh.tui.sessionNotFound` · `Sources/RemoteTui/TerminalController+SSHTuiSessions.swift:98`

## workspaceTodoPane

### workspaceTodoPane · (general)

- "This workspace is no longer available." · `workspaceTodoPane.workspaceUnavailable` · `Sources/Panels/WorkspaceTodoPanelView.swift:37`
