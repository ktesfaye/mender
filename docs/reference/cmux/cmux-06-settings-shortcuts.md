# Settings, shortcuts, menus, account and updates

Everything reachable from cmux's Settings window (⌘,), the Keyboard Shortcuts system, the native macOS menu bar and Dock menu, Managed Device Policies (MDM), feature flags, Account/Auth/Pricing, and Sparkle-based updates/About. Sourced from `Sources/Settings*`, `Sources/KeyboardShortcutSettings*`, `docs/configuration.md`, `docs/managed-device-policies.md`, `docs/pro-badge-options.html`, `web/data/cmux-shortcuts.ts`, and the localized-string dump (`settings.*`, `menu.*`, `account.*`, `pricing.*`, `update.*`, `about.*`, `featureFlags.*`, `dialog.*`).

## Settings window

### Structure and navigation

The Settings window (`Sources/App/SettingsWindowFactory.swift`, `SettingsWindowPresenter.swift`, `SettingsNavigation.swift`) opens with **⌘,** (also `menu.app.settings` "Settings…" and `menu.preferences` "Preferences…" in the app menu). It is a left-nav / right-detail window (`settings.section.*` gives the 19 section names in nav order): **App, Account, Automation, Beta Features, Browser, Cloud (Cloud Machines), Computer Use, Custom Sidebars, Global Hotkey, Keyboard Shortcuts, Mobile, Networking, Sidebar (Sidebar Appearance), Reset, cmux.json (Settings JSON), Sleepy Mode, Terminal, TextBox (Beta), Workspace Colors**. A section shows `"Loading…"` (`settings.section.loading`) while lazily constructing (`SettingsLazyLoadHelpers.swift`).

A search field at the top of the window (`SettingsSearchIndex.swift`, `SettingsSearchAliases.swift`) indexes every section and every individual setting by an alias string of synonyms/keywords (e.g. searching "leaking" or "OOM" surfaces `settings.terminal.memoryGuardrail`; searching "iterm" surfaces `terminal.copyOnSelect`). Every setting below has a matching `settings.search.alias.setting.<section>.<id>` entry.

Every cmux-owned setting is backed by `~/.config/cmux/cmux.json` (JSONC), read/written through `CmuxSettingsFileStore+Live.swift` / `+AppSection.swift` / `+SupportedPaths.swift` and `JSONConfigStore` in `Packages/macOS/CmuxSettings` (see `docs/config-transactions.md`). A control shows **"Managed by your organization"** and is disabled when its key is forced by an MDM profile (see Managed Device Policies below).

### App section

| Setting | Label | Control | Default | cmux.json path | What it does |
|---|---|---|---|---|---|
| App Icon | `settings.app.appIcon` | Picker (Dock and app switcher alternate icons) | — | `app.appIcon` | Alternate app icon shown in Dock/app switcher. |
| Appearance | `settings.app.appearance` | Light/Dark/System picker | System | `app.appearance` | Overall app color scheme. |
| Theme | `settings.app.theme` | — | — | — | (Ghostty terminal theme; see Themes below.) |
| Canvas Pane Gap | `settings.app.canvasPaneGap` | Stepper (points) | — | `canvas.paneGap` | Spacing between panes in canvas (freeform) layout; used by snapping, tidy, and new-pane placement. |
| Canvas Snapping | `settings.app.canvasSnapping` | Toggle | On | `canvas.snappingEnabled` | Snap pane drags/resizes to neighbor edges and the pane gap; hold ⌘ to suspend for one gesture. |
| Keep Workspace Open When Closing Last Surface | `settings.app.closeWorkspaceOnLastSurfaceShortcut` | Toggle | Off | `app.keepWorkspaceOpenWhenClosingLastSurface` | Off: closing the last surface (via shortcut/close button/middle-click) also closes the workspace. On: keeps the workspace open; use the close-workspace shortcut explicitly. |
| Command Palette Searches All Surfaces | `settings.app.commandPaletteSearchAllSurfaces` | Toggle | Off | `app.commandPaletteSearchesAllSurfaces` | Off: ⌘P matches workspace rows only. On: also matches terminal/browser/markdown surfaces across workspaces. |
| Terminal Config | `settings.app.configWindow` | Button "Open Config" | — | — | Opens the cmux terminal (Ghostty) config + generated merged preview in one utility window (see `ConfigSettingsView.swift`). |
| Confirm Quit | `settings.app.confirmQuit.*` | Picker: Always / Dirty Only / Never | `always` (stable/nightly/rc) | `app.confirmQuit` | Controls the Cmd+Q confirmation dialog. **DEV builds always behave as `never`** regardless of the file (subtitle: "DEV build: quit confirmations are disabled."). Legacy boolean `app.warnBeforeQuit` still works as a fallback (`true`→`always`, `false`→`never`). |
| Default Terminal | `settings.app.defaultTerminal` | Button: Default / Set Default / Setting... | — | — | Registers cmux as the macOS handler for SSH links, `.command`/`.tool` files, and UNIX executables. Confirms with dialog "Set cmux as default terminal?" / "cmux will ask macOS to use this app for SSH links, .command/.tool files, and UNIX executables. macOS may show a confirmation prompt." |
| Dock Badge | `settings.app.dockBadge` | Toggle | — | `notifications.dockBadge` | Show unread count on the app's Dock icon and Cmd+Tab. |
| Fade Buttons | `settings.app.fadeButtons` | Toggle | Off (always visible) | — | Action buttons show only on hover vs. always visible. |
| File Drops | `settings.app.fileDrop.defaultBehavior` | Picker: "Open file preview" / "Drop path text" | Open file preview | — | Default behavior when dragging files onto cmux; hold Shift for the alternate behavior. |
| File Editor Word Wrap | `settings.app.fileEditorWordWrap` | Toggle | — | `fileEditor.wordWrap` | Wrap long lines instead of horizontal scroll in the built-in plain-text file editor. Shortcut: ⌥Z (`toggleFileEditorWordWrap`). |
| File Editor Current Line Highlight | `settings.app.fileEditorCurrentLineHighlight` | Toggle | — | `fileEditor.currentLineHighlight` | Highlight the caret's line when nothing is selected. |
| File Editor Indent Guides | `settings.app.fileEditorIndentGuides` | Toggle | — | `fileEditor.indentGuides` | Draw vertical guides at indent columns. |
| File Editor Line Numbers | `settings.app.fileEditorLineNumbers` | Toggle | — | `fileEditor.lineNumbers` | Show line-number gutter. |
| File Editor Syntax Highlighting | `settings.app.fileEditorSyntaxHighlighting` | Toggle | — | `fileEditor.syntaxHighlighting` | Color keywords/strings/tokens. |
| File Editor Tab Width | `settings.app.fileEditorTabWidth` | Stepper | — | `fileEditor.tabWidth` | Columns per tab stop, used by indent guides. |
| Include Panes and Tabs in Focus History | `settings.app.focusHistoryIncludesPanesAndTabs` | Toggle | Off | — | Off: Back/Forward (⌘[ / ⌘]) navigate workspaces only. On: also navigates pane/tab focus changes. |
| Fork Conversation Default | `settings.app.forkConversationDefaultDestination` | Picker | `right` | `app.forkConversationDefaultDestination` | Where the tab right-click "Fork Conversation" lands by default: `right`, `left`, `top`, `bottom`, `newTab`, `newWorkspace`. The submenu still exposes every destination. |
| Global Font Magnification | `settings.app.globalFontMagnification` | Slider + Reset | 100% | — | Scales every font in cmux by the same percentage (100% = design size); per-pane zoom (⌘=/⌘-) still overrides the focused pane. |
| Hide All Sidebar Details | `settings.app.hideAllSidebarDetails` | Toggle | Off | `sidebar.hideAllDetails` | On: show only the workspace title row, overriding the detail toggles below (except the agent-activity spinner, which is a live status signal and stays visible). |
| Hide Tab Close Button | `settings.app.hideTabCloseButton` | Toggle | Off | `app.hideTabCloseButton` | Hide the × close button on tabs (shows on hover/active tab when off). |
| iMessage Mode | `settings.app.iMessageMode` | Toggle | — | — | Moves a workspace to the top and shows the submitted message when you send an agent a prompt. |
| iMessage Mode: Float Groups by Latest Unread | `settings.app.imessageFloatGroups` | Toggle | — | — | Reorders whole group sections by their most-recent unread member. |
| iMessage Mode: Sort Workspaces Inside Groups | `settings.app.imessageSortInsideGroups` | Toggle | — | — | Sorts members within a group by unread while the group section stays put. |
| Language | `settings.app.language` | Picker | — | `app.language` | App locale (l10n). Changing it prompts "Restart to apply language change?" (Restart Now / Later). |
| Loading Spinner Position | `settings.app.loadingSpinnerPosition` | Left/Right | Leading (`left`) | `sidebar.loadingSpinnerPosition` | Show the sidebar agent-activity spinner on the left (shares the unread-badge slot) or right (close-button corner) of the workspace row. |
| Make Sidebar PR Clickable | `settings.app.makeSidebarPullRequestClickable` | Toggle | — | — | Review items (PR/MR) become clickable in the sidebar; otherwise plain text and clicks select the row. |
| Markdown Viewer Font | `settings.app.markdownFontFamily` | Text field, placeholder "System" | empty (system stack) | `markdown.fontFamily` | Default body font family for newly opened markdown viewers. |
| Markdown Viewer Font Size | `settings.app.markdownFontSize` | Stepper (points) | — | `markdown.fontSize` | Default body font size for new markdown viewers; live-zoomable with Cmd-+/-/0. |
| Markdown Viewer Max Width | `settings.app.markdownMaxWidth` | Stepper (CSS px) | — | `markdown.maxWidth` | Default max reading-column width for new markdown viewers. |
| Menu Bar Only | `settings.app.menuBarOnly` | Toggle | Off | `app.menuBarOnly` | Hide the Dock icon and Cmd+Tab entry; use the menu-bar item to show cmux. |
| Minimal Mode | `settings.app.minimalMode` | Toggle | Off | `app.minimalMode` | On: hides the workspace title bar and moves workspace controls into the sidebar. |
| New Workspace Placement | `settings.app.newWorkspacePlacement` | Picker | — | `app.newWorkspacePlacement` | Where a new tab/workspace is inserted (top/bottom/end order). |
| Notification Badge Position | `settings.app.notificationBadgePosition` | Left/Right | Leading | `sidebar.notificationBadgePosition` | Which side the unread-notification badge sits on. |
| Notification Preview Lines | `settings.app.notificationMessageLineLimit` | Stepper | — | — | Max lines shown for the latest notification below each workspace title. |
| Open Markdown in cmux Viewer | `settings.app.openMarkdownInCmuxViewer` | Toggle | — | `app.openMarkdownInCmuxViewer` | Cmd-click on `.md` opens the rendered cmux markdown viewer instead of a generic file preview. |
| Open Sidebar PR Links in cmux Browser | `settings.app.openSidebarPRLinks` | Toggle (context-dependent subtitle) | — | `sidebar.openPullRequestLinksInCmuxBrowser` | Whether PR link clicks open in the embedded browser vs. default browser; disabled subtitle shown if PR clickability/visibility is off. |
| Open Sidebar Port Links in cmux Browser | `settings.app.openSidebarPortLinks` | Toggle | — | `sidebar.openPortLinksInCmuxBrowser` | Localhost port link clicks open in cmux browser vs. default browser. |
| Open Supported Files in cmux | `settings.app.openSupportedFilesInCmux` | Toggle | — | `app.openSupportedFilesInCmux` | Cmd-click opens text/code/PDF/image/audio/video/Quick Look previews inside cmux. |
| Focus Pane on First Click | `settings.app.paneFirstClickFocus` | Toggle | Off | `app.focusPaneOnFirstClick` | Off: first click when cmux is inactive only activates the window; click again to focus the pane. On: activates and focuses in one click. |
| Truncate Path From Start | `settings.app.pathLastSegmentOnly` | Toggle | Off | — | Off: full paths abbreviated with `~/`. On: trailing path shown, prefixed with `…/` when shortened. |
| Open Files With | `settings.app.preferredEditor` | Text field, placeholder "e.g. code, zed, subl" | empty (system default) | `app.preferredEditor` | Command used when Cmd-click previews are off or the file type is unsupported. |
| Rename Selects Existing Name | `settings.app.renameSelectsName` | Toggle | Off | `app.renameSelectsExistingName` | Command Palette rename: caret at end (off) vs. all text pre-selected (on). |
| Reorder on Notification | `settings.app.reorderOnNotification` | Toggle | — | `app.reorderOnNotification` | Move workspaces to the top of the sidebar on notification; disable for stable shortcut positions. |
| Open cmux.json | `settings.app.settingsFile.openButton` | Button | — | — | Opens the raw cmux.json file. |
| Show Loading Spinner | `settings.app.showAgentActivity` | Toggle | On | `sidebar.showAgentActivity` | Shows a spinner on workspace rows with running coding agents / active manual loaders; stays visible even with sidebar details hidden. |
| Show Branch + Directory in Sidebar | `settings.app.showBranchDirectory` | Toggle | — | `sidebar.showBranchDirectory` | Built-in git branch and cwd row. |
| Show in Menu Bar | `settings.app.showInMenuBar` | Toggle | — | `notifications.showInMenuBar` | Keep a cmux menu-bar item for unread notifications and quick actions. |
| Show Latest Log in Sidebar | `settings.app.showLog` | Toggle | — | `sidebar.showLog` | Latest imperative log/status message. |
| Show Custom Metadata in Sidebar | `settings.app.showMetadata` | Toggle | — | `sidebar.showCustomMetadata` | Custom metadata from `report_meta`/`set_status`/`report_meta_block`. |
| Show Notification Message in Sidebar | `settings.app.showNotificationMessage` | Toggle | — | `sidebar.showNotificationMessage` | Latest notification message below workspace title. |
| Show Listening Ports in Sidebar | `settings.app.showPorts` | Toggle | — | `sidebar.showPorts` | Detected listening ports for the active workspace. |
| Show Progress in Sidebar | `settings.app.showProgress` | Toggle | — | `sidebar.showProgress` | Built-in progress bar from `set_progress`. |
| Show Pull Requests in Sidebar | `settings.app.showPullRequests` | Toggle | — | `sidebar.showPullRequests` | Review items (PR/MR/etc.) with status and number. |
| Show SSH in Sidebar | `settings.app.showSSH` | Toggle | — | `sidebar.showSSH` | SSH target row for remote workspaces. |
| Show Workspace Description in Sidebar | `settings.app.showWorkspaceDescription` | Toggle | — | `sidebar.showWorkspaceDescription` | Custom workspace description text. |
| Show Workspace Title Bar | `settings.app.showWorkspaceTitlebar` | Toggle | On | — | Folder + active title strip above pane tabs. |
| Sidebar Branch Layout | `settings.app.sidebarBranchLayout` | Inline/Vertical | — | `sidebar.branchLayout` | Inline: all branches share one line. Vertical: each branch own line. |
| Stack Branch and Directory | `settings.app.stackBranchDirectory` | Toggle | — | — | Branch+directory share one line vs. separate lines. |
| Send Anonymous Telemetry | `settings.app.telemetry` | Toggle | On (opt-out) | `app.sendAnonymousTelemetry` | Shares anonymized crash/usage data (PostHog, Sentry). Subtitle: "Change takes effect on next launch." Locked by `DisableTelemetry` managed policy. |
| Warn Before Closing Tab | `settings.app.warnBeforeClosingTab` | Toggle | Off | — | Confirmation before ⌘W closes a tab. |
| Warn Before Tab Close Button | `settings.app.warnBeforeClosingTabXButton` | Toggle | — | `app.warnBeforeClosingTabXButton` | Confirmation before the tab's × button closes it; inert if close buttons are hidden. |
| Warn Before Quit | `settings.app.warnBeforeQuit` | Toggle | — | `app.warnBeforeQuit` | Legacy boolean, superseded by Confirm Quit above but still honored as fallback. |
| Watch Git Status in Sidebar | `settings.app.watchGitStatus` | Toggle | — | `sidebar.watchGitStatus` | Update branch/PR metadata from filesystem watch instead of polling git. |
| Group New Workspace Placement | `settings.app.workspaceGroupNewWorkspacePlacement` | Picker | — | `workspaceGroups.newWorkspacePlacement` | Where ⌘N inserts a new workspace inside a group (after current/top/end). |
| Inherit Workspace Working Directory | `settings.app.workspaceInheritWorkingDirectory` | Toggle | — | `app.workspaceInheritWorkingDirectory` | On: new workspaces start in the focused workspace's cwd. Off: uses Ghostty's own working-directory setting. |
| Workspace Layouts | `settings.app.workspaceLayouts` | "Customize…" button | — | — | Edit saved layouts offered in the new-workspace menu. |
| Wrap Workspace Titles in Sidebar | `settings.app.wrapWorkspaceTitles` | Toggle | Off | `sidebar.wrapWorkspaceTitles` | Off: titles stay one line, truncate at end. On: can wrap multiple lines. |

Notes: `app.windowTitleTemplate` and `app.confirmQuit`/`app.warnBeforeQuit` are documented cmux.json-only keys (no UI control) covered in `docs/configuration.md`; the window-title template supports placeholders `{windowId}`, `{windowToken}`, `{activeWorkspace}`, `{activeDirectory}`, `{defaultTitle}`, `{appName}` (used e.g. for tiling-WM title matching on macOS).

### Automation section

Controls the local automation/control socket and per-agent CLI hook integrations.

| Setting | Control | Default | cmux.json path | Notes |
|---|---|---|---|---|
| Claude Code Integration | Toggle + note | On | `automation.claudeCodeIntegration` | Wraps `claude` to inject session-tracking/notification hooks. Note: "Disable if you prefer to manage Claude Code hooks yourself." |
| Claude Binary Path | Text field | empty (PATH) | `automation.claudeBinaryPath` | Custom path to the `claude` binary. |
| Codex Integration | Toggle + note | — | — | Wraps `codex`; still tracks observable live Codex sessions even when off. Custom launchers need `cmux hooks setup --agent codex`. |
| Cursor Integration | Toggle | — | — | Requires `cmux hooks cursor install`; no-ops outside cmux terminals. |
| Gemini CLI Integration | Toggle | — | — | Requires `cmux hooks gemini install`. |
| Kiro CLI Integration | Toggle | — | — | Requires `cmux hooks kiro install`, then `kiro-cli chat --agent cmux`. |
| Kiro Notification Level | Minimal/Standard/Verbose | — | `automation.kiroNotificationLevel` | Controls how many Kiro tool events appear in Feed. |
| Amp Integration | Toggle | — | — | Installed/refreshed automatically in cmux terminals; no-ops outside them. |
| Naming Agent | Auto / per-agent picker | Automatic | `automation.autoNamingAgent` | Which agent's own CLI generates workspace/tab names for Workspace Auto-Naming (see below); "Automatic" = each session named by its own agent. Status strings: "%@ couldn't generate a name — it may be rate-limited, out of tokens, or signed out."; "%@ isn't installed, so naming used each session's own agent." |
| Workspace Auto-Naming | Toggle | **Off** | `automation.workspaceAutoNaming` (also `automation.autoNamingAgent`) | AI auto-names workspaces/tabs from agent conversation content using each agent's own binary; refreshes as topic shifts. Manual renames always win and disable auto-naming for that item until cleared. Warns if Claude Code Integration is off. Enable from Settings > Automation. |
| Port Base | Stepper | — | `automation.portBase` | Starting port for the `CMUX_PORT` env var; each workspace gets a dedicated range. |
| Port Range Size | Stepper | — | `automation.portRange` | Ports per workspace (paired `CMUX_PORT_END`). |
| Ripgrep Binary Path | Text field | empty | `automation.ripgrepBinaryPath` | Custom `rg` path used by Find; default checks common install locations + PATH. |
| Socket Control Mode | Picker: password / cmuxOnly / allowAll / off | — | `automation.socketControlMode` | Access mode for the local automation Unix socket. Overrides: env vars `CMUX_SOCKET_ENABLE`, `CMUX_SOCKET_MODE`, `CMUX_SOCKET_PATH` (require `CMUX_ALLOW_SOCKET_OVERRIDE=1` on stable/nightly). Locked to "Managed by your organization. Effective mode: %@." under `SocketControlMode` MDM policy. |
| Socket Password | Set/Change/Clear button | unset | — | Password for `password` socket mode; stored in Application Support. Subtitle warns "No password set. External clients will be blocked until one is configured." |
| (Open Access warning) | Confirm dialog | — | — | "Enable full open access?" — "This disables ancestry and password checks and opens the socket to all local users. Only enable when you understand the risk." (`allowAll` mode). |
| Suppress Subagent Notifications | Toggle | — | `automation.suppressSubagentNotifications` | Uses hook-process ancestry to detect nested/child Codex or Claude sessions and keep their completions out of notifications (still in Feed). |

`terminal.uploadCommands` (drag/paste file-upload override for SSH terminals) and `terminal.textBoxSubmitActions` (custom TextBox submit-button commands) are cmux.json-only, documented in `docs/configuration.md`, with no dedicated Settings UI beyond the TextBox section's Default Submit Action picker.

### Notifications (folded into App/Terminal panels via `notifications.*` keys)

| Setting | Control | cmux.json path | Notes |
|---|---|---|---|
| Agent Waiting for Input | Toggle | — | "Notify when an agent has been idle waiting for your input. Suppressed while background work is still running." |
| Agent Needs Permission | Toggle | — | "Notify when an agent is blocked waiting for your permission to run a tool." |
| Agent Finished | Always / Never / When idle | — | "When idle waits until background tasks and scheduled wakeups drain." |
| Notification Command | Text field, placeholder `say "done"` | `notifications.command` | Shell command run per notification; env vars `$CMUX_NOTIFICATION_TITLE`, `$CMUX_NOTIFICATION_SUBTITLE`, `$CMUX_NOTIFICATION_BODY`. |
| Desktop Notifications | Status + Enable/Open System Settings/Send Test | — | Status: Allowed / Deliver Quietly / Denied / Temporary / Permission unknown. Test notification title "cmux test notification". |
| Pane Flash | Toggle | `notifications.paneFlash` | Briefly flash an outline when cmux highlights a pane. |
| Unread Pane Ring | Toggle | `notifications.unreadPaneRing` | Ring around panes with unread notifications. |
| Per-Agent Notification Sounds | Grid: Agent × (Turn Done / Needs Input / Error-Stalled) with Global/Custom picker | `notifications.soundOverrides` | "Empty cells use the global notification sound." File picker validates decodability, converts to CAF if needed ("Prepared for notifications (converted to CAF)."). |
| Notification Sound | Picker: 14 built-in macOS sounds (Basso, Blow, Bottle, Frog, Funk, Glass, Hero, Morse, Ping, Pop, Purr, Sosumi, Submarine, Tink) + Custom File… + None + Default | `notifications.sound`, `notifications.customSoundFilePath` | — |

### Browser section

| Setting | Control | Default | cmux.json path | Notes |
|---|---|---|---|---|
| Enable cmux Browser | Toggle | On | `browser.enabled` | Off disables browser tabs, terminal link clicks, intercepted `open` commands; links open in default browser. |
| Default Browser Engine | Auto (Match Default Browser) / Chromium / WebKit | Auto | `browser.defaultEngine` | Auto uses Chromium when the OS default browser is Chromium-based, else WebKit. |
| Chromium Remote Debugging Port | Number field | Off | `browser.remoteDebuggingPort` | When set, new Chromium panes expose CDP at `http://127.0.0.1:<port>` (or an alternate free loopback port); CLI JSON reports the actual Playwright endpoint. Off by default — internal CDP still used privately, no external endpoint. |
| Chromium Extensions | Multi-line path list | — | `browser.chromiumExtensionDirectories` | Unpacked extension directories (each needs a `manifest.json`); applied to the next pane. |
| Default Page Zoom | Picker (%) | 100% | `browser.defaultZoomLevel` | Applied to newly opened pages. |
| Default Search Engine | Picker: Google, DuckDuckGo, Bing, Brave Search, Kagi, Startpage, Perplexity, Exa, Yahoo, Ecosia, Qwant, Mojeek, Wikipedia, GitHub, Baidu, Yandex, Custom | — | `browser.defaultSearchEngine` | Used by the address bar for non-URL input. |
| Custom Search Engine Name / URL | Text fields | — | `browser.customSearchEngineName`, `browser.customSearchEngineURLTemplate` | URL template uses `{query}` or `%s`; appends `q=` if no placeholder. |
| Show Search Suggestions | Toggle | — | `browser.showSearchSuggestions` | Address-bar autocomplete suggestions. |
| Ask Where to Save Downloads | Toggle | On | `browser.askWhereToSaveDownloads` | Off saves directly to Downloads without a panel. |
| Browser Memory Saver | Toggle | — | `browser.discardHiddenWebViews` | Hidden tabs release page memory after a delay (below), restore when shown. |
| Memory Saver Delay | Stepper (minutes/seconds) | — | `browser.hiddenWebViewDiscardDelaySeconds` | Active downloads/popups/devtools/fullscreen/loading pages are skipped from discard. |
| Browsing History | List + "Clear History…" | — | — | Clear dialog: "This removes visited-page suggestions from the browser omnibar." |
| Import Browser Data | Detect + Choose… | — | — | Detects installed browsers (Chrome/Safari/Firefox/Brave/Edge/Arc) to import bookmarks/history/cookies/profiles. |
| Hosts to Open in Embedded Browser | Multi-line allowlist | empty (all hosts) | `browser.hostsToOpenInEmbeddedBrowser` | Applies to terminal link clicks and intercepted `open https://...`. |
| HTTP Hosts Allowed in Embedded Browser | Multi-line + Save/Reset | localhost, `*.localhost`, `127.0.0.1`, `::1`, `0.0.0.0`, `*.localtest.me` | `browser.insecureHttpHostsAllowedInEmbeddedBrowser` | Which non-HTTPS hosts open without a warning prompt. |
| Embedded Browser URL Allowlist | Multi-line + Save/Reset | unset (allow all) | `browser.urlAllowlist` | Restricts navigation to hosts/URL patterns; a suggested loopback list is shown; saving opts in. Invalid-only values fail closed ("Invalid-only values fail closed; use a host or HTTP(S) URL pattern."). Same syntax/precedence as the MDM `BrowserURLAllowlist` policy (see below); a forced policy always wins and locks this editor. |
| URLs to Always Open Externally | Multi-line rules | — | `browser.urlsToAlwaysOpenExternally` | Plain-text substring, wildcard (`*`/`?`), or `re:`-prefixed regex per line. Applies to page-link clicks, terminal-link clicks, intercepted `open` calls. |
| Intercept open http(s) in Terminal | Toggle | — | `browser.interceptTerminalOpenCommandInCmuxBrowser` | Off: `open https://...`/`open http://...` in a terminal always use the default browser. |
| Open Terminal Links in cmux Browser | Toggle | — | `browser.openTerminalLinksInCmuxBrowser` | Off: terminal-output link clicks open in the default browser. |
| React Grab Version | Text field (pinned npm version) | — | `browser.reactGrabVersion` | Injected by the toolbar button (⌘⇧G); only versions with a known integrity hash accepted. |
| Browser Theme | System/forced picker | System | `browser.theme` | System follows app/macOS appearance; forcing a scheme applies to compatible pages. |

### Networking section

Iroh-based peer-to-peer/relay transport settings (also gates the iOS companion connection path).

| Setting | Control | Notes |
|---|---|---|
| Iroh Status | Read-only status row | States: "Iroh endpoint active", "Direct-only until relay settings recover", "Connected directly peer-to-peer", "Inactive", "Connected through %@" (private network), "Connected through %1$@, %2$@" (relay), "Starting". |
| Relay Preference | Automatic / Selected cmux Relays / Custom Relays | Direct peer-to-peer always stays enabled; this controls fallback relay choice. |
| Custom Relays | Add/Edit list: Name, Provider, Region, URL, Authentication (None / Device Secret) | Relay *addresses* sync with the account; provider *secrets* stay device-local and never sync. |
| Private Networks | Add/Edit list: Name, Host/IP, Port, Provider, Automatic toggle | For Tailscale alternatives, a company VPN, or a self-run private network; authentication happens before cmux accepts the route. |
| Tailscale Compatibility | Toggle | "Retained for released clients and networks where Iroh cannot connect." |
| Relay Only | Toggle | Keeps Iroh connections to this Mac on cmux relays instead of direct/local-network paths; applies on next reconnect. |
| Never Use Relays | Toggle | Requires a reachable direct/local-network/private-network path; applies on next reconnect. |
| Relay Policy | Status row | "Using the last verified catalog" / "Verified from cmux" / "No valid catalog available". cmux downloads a signed relay catalog; fleet changes don't need an app update. |
| Connection Check | "Run Check" button, report | Checks Encrypted Transport / Relay Policy / Relay Reachability / Mac Available. Produces a shareable, privacy-safe "cmux Connection Report" (excludes terminal content, identities, addresses, credentials, raw errors) with a "Share…" action and an "IT Relay Allowlist" for firewall admins. |
| Connection Diagnostics | Event log + Clear/Share | Records timestamped failure categories (Account Mismatch, Admission Denied/Lease Expired/Revalidation Failed, Authorization Failed, DNS Failed, Host Unreachable, Identity Mismatch, No Route, Offline, Permission Denied, Protocol Error, Secure Channel Failed, Timed Out, etc.) — about 20 distinct failure-reason strings. "Clear Report" asks "Clear this diagnostic report? This permanently removes the connection timeline stored on this Mac." |
| Relay-Only Verification | Toggle (Debug builds only) | Forces authenticated Iroh sessions onto relays to verify the relay path. |

### Terminal section

| Setting | Control | Default | cmux.json path | Notes |
|---|---|---|---|---|
| Adapt Default Theme to Appearance | Toggle | — | `terminal.adaptiveDefaultTheme` | On: cmux's managed light/dark palettes follow app appearance **only** when the Ghostty config has no settings; existing Ghostty settings (incl. explicit theme pairs) are never overlaid. |
| Resume Agent Sessions on Reopen | Toggle | — | — | On: restored agent terminals auto-run their resume command after a cmux relaunch; Off: stay idle until manually resumed. |
| Agent Hibernation | Toggle + sub-settings | Off | `terminal.agentHibernation.enabled` | Opt-in routine hibernation of idle background agent processes to free RAM/CPU; resumes from saved session on tab visit. See docs/agent-hooks.md#agent-hibernation. |
| — Hibernate After Idle Seconds | Stepper | 5 | `terminal.agentHibernation.idleSeconds` | Range 5–604800; a ~60s confirmation settle window also applies. |
| — Max Live Agent Terminals | Stepper | 12 | `terminal.agentHibernation.maxLiveTerminals` | Range 1–256; visible terminals always stay live, extras hibernate oldest-idle-first. |
| (Aggregate memory-pressure safety hibernation) | Always on, independent of the toggle | — | — | At ~50%/70% of installed physical RAM (or ~20%/10% available-memory corroboration) cmux may still lossless-hibernate eligible idle background agents even with routine hibernation off; never caps memory, throttles, or kills active/visible work. Enable routine hibernation via command palette ("Enable Agent Hibernation"), Settings, or `cmux agent-hibernation on`. |
| Copy on Selection | Toggle | Off | `terminal.copyOnSelect` | On: selected terminal text also copies to the system clipboard on selection commit (iTerm-style); off leaves Ghostty's own Paste Selection behavior unaffected. |
| Runaway Memory Guardrail | Toggle | — | — | Warns with a badge/banner when one pane's process tree crosses the GB threshold below, "so a single leak can't crash the whole app." |
| — Memory Warning Threshold (GB) | Stepper | — | — | GB threshold for the guardrail. |
| Reclaim Offscreen Terminal Memory | Toggle | — | — | Off-screen terminals release GPU renderer memory while idle, rebuild instantly on switch-back; process keeps running. |
| — Reclaim After Idle Seconds | Stepper | — | — | How long off-screen before reclaiming. |
| — Max Warm Renderers | Stepper | — | — | Most-recently-visible terminals keep renderers ready; extras reclaimed oldest-first. |
| Resume Commands | List + Delete | — | — | Review signed shell-command-prefix approvals used to restore non-agent terminal surfaces (Auto/Manual/Ask policy per prefix). Signature mismatch: "Signature does not match. Delete this approval and approve the command again." |
| Show Terminal Scroll Bar | Toggle | On | `terminal.showScrollBar` | Right-edge scroll bar in shell scrollback; auto-hidden for alternate-screen TUI surfaces. |
| Scroll Speed | Slider + Reset | 1.00× | — | Multiplier on scroll-wheel/trackpad deltas. |
| Session Content Alignment | Left/Center/Right | — | `terminal.sessionContentAlignment` | Placement of width-capped content within the pane. |
| Session Content Width | Toggle + numeric field (pt) | Off (full width) | `terminal.sessionContentMaxWidth` | Wrap terminal/agent-chat content to a max width; narrow panes still use all space. |
| Tab Bar Font Size | Slider + Reset (pt) | — | — (`surface-tab-bar-font-size`) | Terminal/browser tab-title font size. |
| Text Editing Gestures | Toggle | On | — | On: ⌘/⌥+arrow move by line/word, ⌘/⌥+delete kill by line/word (apps receive the chord, not the raw key — turn off before a full-screen TUI). |

TextBox (Beta) section keys `terminal.textBoxMaxLines` are duplicated under both `settings.terminal.*` and `settings.textBox.*` string IDs (same underlying setting surfaced in two places).

### TextBox (Beta) section

Banner: "TextBox is a beta feature. Its defaults and behavior may change while it is being tested."

| Setting | Control | Default | cmux.json path | Notes |
|---|---|---|---|---|
| Default Submit Action | Picker | `codex`-style example / `text-entry` | `terminal.textBoxDefaultSubmitAction` | Built-ins: Claude Dangerous (`claude --dangerously-skip-permissions -- {{prompt}}`), Codex --yolo (`codex --yolo -- {{prompt}}`), OpenCode (`opencode --prompt {{prompt}}`), Pi (`pi -- {{prompt}}`), Text Entry. Custom `commandTemplate` actions definable in `terminal.textBoxSubmitActions` (icon, color, `preservePromptAfterLaunch`). Active agent sessions (Claude/Codex/OpenCode/Pi) always submit as plain text entry regardless. Cycle with Shift-Tab (`cycleTextBoxSubmitAction`); right-click the submit button to pick any configured action or open the docs. |
| Focus TextBox on New Terminals | Toggle | — | `terminal.focusTextBoxOnNewTerminals` | Focuses the TextBox for new tabs/splits/workspaces created from the UI; CLI/control-socket-created terminals never auto-focus it. |
| Show TextBox on New Terminals | Toggle | — | `terminal.showTextBoxOnNewTerminals` | Opens the TextBox without moving focus. |
| TextBox Max Lines | Stepper | — | `terminal.textBoxMaxLines` | Max height before the rich input scrolls. |

### Mobile section

| Setting | Control | Default | Notes |
|---|---|---|---|
| Enable iOS pairing | Toggle | Off | Gates both iOS pairing and Iroh networking for this Mac. |
| Display Name | Text field, placeholder "This Mac's name" | empty (uses Mac's name) | Name shown in the iOS app while pairing. |
| Mobile Pairing | Button "Show Tailscale QR…" | — | "Devices signed in to the same account connect automatically. Use this QR only to pair through Tailscale." |
| Pairing Port | Number field + Apply | — | 1–65535; "Apply saves the port for the next pairing start. Current connections continue." Falls back to another port if busy. |
| Forward Notifications to iPhone | Toggle | — | Sends local agent alerts to cmux on iPhone/iPad. |
| Hide Notification Content | Toggle | — | Sends a generic message instead of agent/terminal text. |
| When to Send | Always / Only When Away | — | Away = Mac locked, asleep, or idle. |
| Connected Devices | List | — | iOS devices currently attached. |
| Folder Access | Subtree (default) / One Level | Subtree | `mobile.artifactFolderAccess`. Subtree: authorize a referenced directory and its full subtree. One Level: only immediate children of referenced/visible folders, listing only the folder itself. Authorization compares canonical (symlink-resolved) paths; a symlink inside an authorized folder cannot escape it. |
| Reachable at | Read-only list | — | Route kinds: Iroh, Loopback, Tailscale, WebSocket. Empty state: "No reachable addresses yet. Iroh routes need this Mac signed in to your cmux account; Tailscale routes need Tailscale running on this Mac." |
| (Managed) | — | — | "Remote control from the iOS app is disabled by your organization." shown under `DisableRemoteControl`. |

### Beta Features section

Banner: "These features are experimental and may change or break. Enable them only when you are testing them."

| Feature | Default | Notes |
|---|---|---|
| Cloud Machines | Off | Hides every Cloud surface (right-sidebar Cloud tab, Settings, palette, new-workspace entries) and keeps the Cloud tunnel/fleet polling off until enabled. |
| Custom Sidebars | Off | Lists user sidebars from `~/.config/cmux/sidebars` in the sidebar picker; renders in an isolated helper process. |
| Dock | Off | Shows "Dock" (custom terminal controls panel, `.cmux/dock.json`) in the right-sidebar mode switcher. |
| Extensions | Off | Puzzle-piece button, sidebar-toggle extension menu, install/host sidebar extensions. |
| Feed | Off | Inline agent-decision feed in the right sidebar. |
| Remote tmux | Off | Mirrors a remote host's tmux sessions (`ssh tmux -CC`) as workspaces/tabs; quitting cmux leaves the remote tmux server running. |
| Workspace Todo Controls | Off (remote-rollout gated) | Shows "Add Checklist Item" and manual status controls (otherwise read-only summaries). |
| Checklist Style | Popover (default) | Popover anchors a checklist popover to the summary line; Inline expands items under the row. |

### Workspace Colors section

Palette editor for the sidebar workspace-color feature: Notification Badge color, Pane Flash color, Selection Highlight color, and a Custom Colors palette (edit named colors via cmux.json; "Choose Custom Color…" from a workspace context menu adds local `Custom N` entries). "Reset Palette" restores built-in defaults and clears customizations.

### Sidebar (Sidebar Appearance) section

Sidebar Font Size (pt, + Reset), Match Terminal Background (toggle — same background color/transparency as the terminal), Light/Dark Mode Tint color pickers, Tint Opacity slider, "Reset Sidebar Tint" button, Dock Max Width (custom toggle + pt field, or built-in dynamic cap), Right Sidebar Tabs (choose which tabs the right sidebar shows and their order — "The ⌃1–⌃9 shortcuts follow the visible order.").

### cmux.json (Settings JSON) section

"User config file" — Open cmux.json button, plus a "Documentation" row ("View supported keys, file locations, schema, and reload behavior") linking to docs.

### Config (Ghostty Terminal Config) window

Opened from App section's "Open Config" button. Tabs: cmux config source vs. a generated "synced" preview of the effective merged config. Banner text: "This is the cmux Ghostty config selected for this build. Edit it here, then Save to reload cmux." / "This is a generated preview of the effective config. Edit the cmux tab to change what cmux reads." / "...No base Ghostty config file was found, so only cmux overrides are shown." Actions: Open in Editor…, Reveal in Finder, Reload, Save. Status: "Saved to cmux config and reloaded." / "Couldn't save the cmux config." / "Reload queued; too many requests are pending to confirm completion."

### Global Hotkey section

"Enable System-Wide Hotkey" toggle (off by default) — press the shortcut from any app to show/hide all cmux windows; note: "Use Command, Option, or Control with another key. No extra macOS permission is required." Recorder for the shortcut itself (default ⌃⌥⌘. per the shortcuts table).

### Computer Use section

| Setting | Control | Notes |
|---|---|---|
| Enable Computer Use | Toggle | "Computer Use runs locally in the bundled cmux Computer Use app. Its permissions and restart lifecycle are independent from cmux. Telemetry and update checks are disabled." Off: new agent launches (incl. already-open terminals) start without computer-use tools. On: supported agent sessions can see/drive apps on the Mac. Config path `computerUse.enabled`. |
| Permissions | Accessibility / Screen Recording rows, each Granted/Not Granted/Unknown + Grant…/Open System Settings | — | Accessibility: "Lets cmux Computer Use inspect and control app interfaces." Screen Recording: "Lets cmux Computer Use see app windows and screen content." |
| Show Computer Use in Menu Bar | Toggle | `computerUse.showInMenuBar` | Live agent sessions + shortcuts to their terminal/driven app in the menu bar. |

Locked ("Managed by your organization") under `DisableComputerUse`.

### Custom Sidebars section

"Show Custom Sidebars" toggle (off by default). Note: "Custom sidebars are SwiftUI-style files in ~/.config/cmux/sidebars. Pick one from the sidebar toggle button's right-click menu; edits hot-reload on save. Use the in-app renderer only for sidebars you trust." A "Renderer" setting picks the execution mode. Locked under `DisableCustomSidebars`.

### Cloud (Cloud Machines) section

"Your machines" panel: "Open Machines" button, subtitle "Persistent cloud computers. Files survive forever; sleeping machines cost nothing." Plan row: Free / current plan name, "%d of %d" usage or "no limit", "Manage…" / "Upgrade…" buttons, "Sign in to see your plan." when signed out. Hidden entirely under `DisableCloud` (see Managed Policies).

### Reset section

`settings.section.reset` — restores factory defaults / clears preferences (search aliases: "factory defaults restore clear preferences").

### Account section

See Account/Auth below.

## Themes, appearance, fonts, window chrome

- **Terminal theme**: inherited from the embedded Ghostty config (`Sources/App/TerminalScrollSpeedSettings.swift`/`TerminalAdaptiveDefaultThemeSettings.swift`, plus `Sources/App/AppearanceSettings.swift`). cmux ships managed light/dark palettes that only apply when the user's Ghostty config file has *no* settings at all (Adapt Default Theme to Appearance, above); any existing Ghostty config (including explicit theme pairs) is always fully preserved and never overlaid. Ghostty's own theme system (`ghostty-theme` compatible files) is used unmodified underneath.
- **App appearance**: Light/Dark/System (`settings.app.appearance`).
- **App Icon**: alternate Dock/app-switcher icon picker (`settings.app.appIcon`).
- **Global Font Magnification**: app-wide font scale percentage, independent of per-pane terminal zoom.
- **Markdown viewer** font family/size/max-width are separately configurable (App section).
- **Sidebar appearance**: separate font size, tint colors (light/dark), tint opacity, and "Match Terminal Background" (uses the terminal's own background color/transparency/material). A `settings.material.*` string set (Content Background, Full Screen UI, Header View, HUD Window, **Liquid Glass (macOS 26+)**, Menu, None, Popover, Sheet, Sidebar, Tool Tip, Under Window, Window Background) and a `settings.preset.*` set (HUD Glass, Native Sidebar, Popover Glass, Raycast Gray, Soft Blur, Under Window) indicate a configurable macOS-material/vibrancy system for window chrome — likely reached through a debug/advanced surface rather than the main Settings nav (see Unverified).
- **Browser theme**: separate System/forced light-dark for embedded web pages (`browser.theme`).
- **Workspace Colors**: a distinct named-color palette for workspace tabs/badges/selection highlight (Workspace Colors section, above), fully user-customizable via cmux.json, independent from the app or terminal theme.
- **Window title template**: `app.windowTitleTemplate` (cmux.json only) customizes the macOS `NSWindow.title` with placeholders, aimed at tiling window managers (AeroSpace/yabai) matching on a stable per-window token.
- **Minimal Mode**: hides the workspace title bar/chrome and relocates controls into the sidebar — the closest thing to a "hide window chrome" toggle.

## Keyboard shortcuts

### Customization mechanism

Shortcuts are stored under `shortcuts.bindings.<actionId>` in `cmux.json` (`KeyboardShortcutSettingsFileStore*.swift`), editable either from **Settings > Keyboard Shortcuts** (click a shortcut value to record; press **X** to unbind, which then shows a "restore" affordance) or directly in the JSON file. A binding value is a single combo string (`"cmd+b"`) or, for tmux-style multi-step chords, an array of two strokes (`["ctrl+b", "c"]`). Setting a value to `""` or `null` unbinds it. Example from the docs:
```json
{ "shortcuts": { "bindings": {
  "newSurface": ["ctrl+b", "c"],
  "showNotifications": ["ctrl+b", "i"],
  "toggleSidebar": "cmd+b",
  "toggleFileExplorer": "cmd+opt+b",
  "splitRight": "",
  "commandPalettePrevious": null
} } }
```
"Reset Default Shortcuts" restores built-in values app-settings-managed shortcuts (`settings.shortcuts.resetDefaults`). A shortcut whose binding is only settable via `cmux.json` (not the recorder UI) shows "Managed in cmux.json". "Show Shortcut Hints While Holding Modifier Keys" toggles the on-screen hint chips that appear while holding ⌘/⌃ (`ShortcutHintPill.swift`, `ShortcutHintTitlebarPolicy.swift`). Pane-resize shortcuts repeat by a configurable "Pane Resize Step" (px).

### System-wide hotkey conflict handling

`KeyboardShortcutSettings+SystemWideHotkeyConflicts.swift` computes reserved combos so the recorder can reject conflicts: every other bound action's shortcut (expanding number-matching actions like "select workspace 1…9" into all nine digit variants, and chord actions into their first stroke) plus four hardcoded system reservations — Control-Tab, Control-Shift-Tab, ⌘\`, ⌘⇧\` (window-cycling) — are excluded from being assignable to the Global Hotkey (show/hide all windows) action, with an exception carved out so the Global Hotkey itself can still claim a bare backtick with no other modifiers.

### The "All Shortcuts" discovery popover

Reached by holding ⌘ (or ⌃) in the sidebar (`ShortcutDiscoveryButton.swift`) to reveal a Command-hold hint, then opening `AllShortcutsPopover` (320×440pt): a scrollable, grouped list of every *settings-visible* shortcut action with its live effective binding, grouped into sections **App, Workspace, Navigation, Panes, Browser & Find** (`ShortcutAction.Group`) plus an "Other" catch-all. Unbound actions show a muted "Unassigned" tag instead of a key-cap chip. The list is reactive to live edits from Settings or external `cmux.json` changes via `KeyboardShortcutSettingsObserver.revision`.

### Default shortcuts (from `web/data/cmux-shortcuts.ts`, mirrors the in-app defaults)

**App** — Settings ⌘, · Open team picker ⌥⇧⌘T · Reload configuration ⌘⇧, · Show/hide all cmux windows ⌃⌥⌘. (system-wide hotkey, off by default) · Global search ⌥⌘F (while cmux active) · Command palette ⌘⇧P · Command palette next/previous result ⌃N / ⌃P (while palette open) · New window ⌘⇧N · Close window ⌃⌘W · Toggle full screen ⌃⌘F · Send feedback — *unbound by default* · Reopen previous session ⌘⇧O · Quit cmux ⌘Q.

**Workspaces** — Toggle left sidebar ⌘B · Toggle right sidebar ⌘⌥B · New workspace ⌘N · New browser workspace ⌥⌘N (first surface is a browser pane, address bar focused) · New cloud workspace ⇧⌘Y (uses most-recently-selected Cloud workspace's machine, else first machine in the right sidebar) · New cloud machine ⌘Y · Save current layout as template ⌃⌘S · Open folder ⌘O · Go to workspace ⌘P (switcher) · Next/previous workspace ⌃⌘] / ⌃⌘[ · Next/previous workspace in group — *unbound by default* · Move workspace up/down ⌃⌥⌘[ / ⌃⌥⌘] · Focus back/forward ⌘[ / ⌘] (outside browser panes; same keys are Back/Forward *inside* browser panes — unbind Focus Back/Forward to let terminal apps claim those keys) · Select workspace 1…9 ⌘1…9 · Rename workspace ⌘⇧R · Edit workspace description ⌥⌘E · Mark workspace done ⌘; · Cycle workspace status one lane forward ⌘⇧; (todo→working→needs-attention→review→done→todo) · Toggle highlighted checklist item ⌘↩ · New empty workspace group ⌃⌘G · Group selected workspaces ⌘⇧G · Collapse/expand focused group ⌃⌘. · Toggle right-sidebar focus ⌘⇧E · Navigate focused sidebar rows J/K, ⌃N/⌃P, H/L (Files: H/L collapse/expand folders; search starts with `/`) · Open selected file / toggle folder ↩ (also ⌘↓, Finder-style alias) · Close workspace ⌘⇧W · Reopen closed workspace — *unbound by default*.

**Surfaces** — New surface ⌘T · Next/previous surface ⌘⇧] / ⌘⇧[ · Reorder surface left/right ⌥⌘⇧[ / ⌥⌘⇧] · Move surface to previous/next pane ⌃⌘⇧[ / ⌃⌘⇧] · Move surface to pane left/right/up/down ⌥⌘⇧←/→/↑/↓ · Select surface 1…9 ⌃1…9 · Rename tab ⌘R · Close tab ⌘W · Close other tabs in pane ⌥⌘T · Reopen last closed ⌘⇧T · Toggle terminal copy mode ⌘⇧M · Clear screen (keep scrollback) ⌘⇧K · Simulator: Home ⌘⇧H, rotate left/right ⌘←/→, toggle appearance ⌘⇧A, toggle software keyboard ⌘K (all: focused Simulator only) · Switch focus terminal↔TextBox ⌘⇧A · Cycle TextBox submit action ⇧Tab · Attach file to TextBox ⌥⌘⇧A · Send Ctrl-F to terminal — *unbound by default* (forwards Ctrl-F to focused terminal; Claude Code: invoke twice to force-stop a hung background agent) · Save file preview ⌘S (focused text preview) · Toggle File Editor Word Wrap ⌥Z (focused file editor).

**Split panes** — Focus pane left/right/up/down ⌥⌘←/→/↑/↓ · Focus previous/next pane (cycle) — *unbound by default* (a Ghostty `goto_split:previous`/`next` keybind can also cycle, provided Focus Back/Forward doesn't claim the same keys) · Split right ⌘D · Split down ⌘⇧D · Split browser right ⌥⌘D · Split browser down ⌥⌘⇧D · Toggle pane zoom ⌘⇧↩ · Increase/decrease/reset workspace terminal font size ⌃⌘= / ⌃⌘- / ⌃⌘0 (applies to every terminal, hidden/hibernated/Dock terminals included; new terminals inherit the size) · Equalize split sizes ⌃⌘⇧= · Resize pane left/right/up/down ⌃⇧H / ⌃⇧L / ⌃⇧K / ⌃⇧J.

**Canvas** — Toggle canvas layout ⌃⌘C · Reveal focused pane ⌃⌘R · Toggle overview zoom ⌃⌘O · Zoom in/out ⌥⌘= / ⌥⌘- · Actual size ⌘0 · Tidy panes into grid ⌃⌘T.

**Browser** — Open browser ⌘⇧L · Focus address bar ⌘L · Back/Forward ⌘[ / ⌘] · Reload ⌘R (focused browser) · Hard refresh ⌘⇧R (focused browser) · Zoom in/out/reset ⌘= / ⌘- / ⌘0 · Markdown viewer zoom in/out/reset ⌘= / ⌘- / ⌘0 (focused markdown viewer — shares keys with browser zoom, disambiguated by focus) · Toggle browser dev tools ⌥⌘I · Show JS console ⌥⌘C · Enter browser focus mode ⌥⌘↩ ("Gives the focused web page first claim on shortcuts. Press Esc twice to exit.") · Toggle browser design mode ⌃⌥⌘D (select/visually edit elements) · Toggle React Grab ⌘⇧G (focused browser, or the only browser pane if a terminal is focused).

**Diff viewer** — Open diff viewer ⌃⌘⇧D · Scroll down/up one step J / K · Scroll half-page down/up ⌃D / ⌃U · Scroll down/up (Emacs) ⌃N / ⌃P · Scroll to bottom ⇧G · Scroll to top G G (config value `["g","g"]`) · Open diff file search `/` · Next/previous diff file `]F` / `[F` (config values `["]","f"]` / `["[","f"]`) — all scoped to the focused diff (or diff/markdown) viewer.

**Find** — Find ⌘F · Find in directory ⌘⇧F · Find next ⌘G · Find previous ⌥⌘G · Hide find bar ⌥⌘⇧F · Use selection for find ⌘E.

**Notifications** — Show notifications ⌘I · Jump to latest unread ⌘⇧U · Toggle current item unread state ⌥⌘U · Mark current item oldest-unread and jump to next latest ⌃⌘U · Mark all notifications read — *unbound by default* · Clear all notifications — *unbound by default* · Flash focused panel ⌘⇧H.

Additional shortcuts documented in `docs/configuration.md` but not listed in the web table: `cmux.mobileconnect` tab-bar action (configurable via `cmux.json`, opens Mobile Pairing) and the three workspace-todo shortcuts `markWorkspaceDone` (⌘;), `cycleWorkspaceStatus` (⌘⇧;), `toggleChecklistItemComplete` (⌘↩) — all editable in Settings > Keyboard Shortcuts or `shortcuts.bindings`.

### Conflicts

The only explicit, code-level conflict handling found is the **system-wide hotkey** reservation logic above (recording a Global Hotkey shortcut that collides with another bound action, a chord's first stroke, an expanded digit-picker action, or one of 4 hardcoded OS reservations is rejected). Ordinary per-action shortcut recording elsewhere is not shown to cross-validate against all other bindings in the reviewed source (see Unverified).

## Native menu bar

From `menu.*` strings (`Sources/cmuxApp+*.swift`, `AppDelegate+*Menu*.swift`). Menu bar: **cmux, File, Edit (system-default, not itemized here), Find, View, Window, Help**, plus a persistent **status-bar menu-bar extra** (`Sources/App/MenuBarExtraController.swift`) when "Show in Menu Bar" is on.

### cmux (app) menu
About cmux · Check for Updates… · Ghostty Settings… · Settings… (⌘,) / "Preferences…" alias · Keep Mac Awake · Make cmux the Default Terminal · Open cmux.json · Reload Configuration (⌘⇧,) · Quit cmux (⌘Q, with "Quit cmux? This will close all windows and workspaces." confirmation per Confirm Quit setting).

### File menu
Command Palette… (⌘⇧P) · New Workspace (⌘N) · New Workspace Group · New Browser Workspace (⌥⌘N) · New Cloud Workspace (⇧⌘Y) · New Cloud Machine (⌘Y) · New Simulator Pane · New Window (⌘⇧N) · Open Folder… (⌘O) · Open Folder in VS Code (Inline)… · Go to Workspace… (⌘P) · Close Tab (⌘W) · Close Other Tabs in Pane (⌥⌘T) · Close Workspace (⌘⇧W) · Reopen Closed Browser Panel · Restore Previous Launch / "Reopen previous session" (⌘⇧O).

### Find menu
Find… (⌘F) · Find in Directory… (⌘⇧F) · Find Next (⌘G) · Find Previous (⌥⌘G) · Use Selection for Find (⌘E) · Hide Find Bar (⌥⌘⇧F) · Send Ctrl-F to Terminal.

### View menu
Toggle Left Sidebar (⌘B) · Toggle Right Sidebar (⌥⌘B) · Focus Right Sidebar · Next/Previous Workspace · Next/Previous Surface · Split Right/Down (⌘D/⌘⇧D) · Split Browser Right/Down · Toggle Canvas Layout · Canvas Overview · Tidy Canvas · Rename Workspace… · Edit Workspace Description… · Show Notifications · Jump to Latest Unread · Reload Page · Hard Refresh · Back/Forward · Zoom In/Out · Actual Size · Toggle Developer Tools · Show JavaScript Console · Toggle Design Mode · Toggle React Grab · Clear Browser History · Import Browser Data… · Enter/Exit Browser Focus Mode · Toggle File Editor Word Wrap · Workspace %lld (per-workspace jump list).

### History menu (`menu.history.*`)
Focus Back / Focus Forward · Focus History submenu with "No Back/Forward/Focus History" empty states, "Show Full Back/Forward/History" · Recently Closed submenu (per-kind icons for Tab/Window/Workspace and per-panel-type labels: Agent, Browser, Cloud VM, Custom Sidebar, File Preview, Markdown, Project, Simulator, Terminal, Tool; "Clear All", "No Recently Closed Items") · Recently Focused submenu ("Most recent focus targets") · Reopen Last Closed / Reopen Closed Workspace.

### New Workspace menu (plus-button / layout submenu)
Default badge on the layout used for new workspaces · "Default for New Workspace" submenu (includes "None (Blank Terminal)") · "Delete Workspace Layout" submenu (per-item "Delete "%@"") · Layouts header · Manage Layouts · Save Workspace as Layout… · New Workspace from Template (saved-layout menu). Per `docs/configuration.md`, when `ui.newWorkspace.contextMenu` is unset the plus-button menu is `cmux.newWorkspace` (⌘N), `cmux.newCloudWorkspace` (⇧⌘Y, Cloud-gated), `cmux.newCloudMachine` (⌘Y, Cloud-gated), `cmux.newTerminal` (⌘T), `cmux.newBrowser` (⌘⇧L), each row live-showing its current shortcut (unbound/chord shortcuts show no hint).

### Notifications menu / status item
Show Notifications · Jump to Latest Unread · Mark All Read · Clear All · Toggle Unread.

### Window menu
Task Manager... · standard per-window entries ("Window %lld").

### Help menu
Getting Started · Concepts · Configuration · Keyboard Shortcuts Settings… · Custom Commands · Skills · Agent Integrations · Claude Code Teams · Codex Teams · oh-my-claudecode · oh-my-codex · oh-my-opencode · Notifications · Dock · Browser Automation · SSH · API Reference · Feature Flags… · Changelog · **Upgrade to cmux Pro…** · **Preview Native Pro Pricing…** (debug/internal) · **Show Pro Welcome Checklist…** (debug/internal) · Check for Updates….

### Context menus not covered by other agents
- **Workspace/tab context menu** (`TabItemView+WorkspaceContextMenu.swift`, `+WorkspaceNotificationsMenu.swift`, `WorkspaceGroupMenuSnapshot.swift`): includes the "Fork Conversation" submenu (destinations: right/left/top/bottom/newTab/newWorkspace — default set by `app.forkConversationDefaultDestination`), a per-workspace-color submenu (`SidebarWorkspaceRowColorMenu.swift`), "Choose Custom Color..." (opens the `alert.customColor` hex-entry dialog: "Enter a hex color in the format #RRGGBB."), and Move-to-group actions.
- **Status-bar / menu-bar-extra menu** (`statusMenu.*`): Jump to Latest Unread · Mark All Read · Clear All · Keep Mac Awake · "No unread notifications" empty state; also hosts the internal Profiling flow (Instruments-based capture → zip attachment → email draft with `summary.md`/`system-info.txt`, permission explanation "macOS may ask for administrator permission because Instruments samples the running cmux process.") — a support/debug tool reachable from the same menu.
- **Sudo approval** (`sudo.*` strings, `cmux sudo run` CLI, Touch ID): a privileged-command approval flow (Touch ID via `cmux sudo setup-touch-id`) surfaced in-app when a terminal script calls `cmux sudo`; not a menu item but an approval dialog family worth noting under "hidden/dev-adjacent" features. Errors include "sudo request expired before approval", "sudo could not authenticate: Touch ID was cancelled or unavailable", 256 KiB script-size cap, 86400s max timeout.

## Dock menu (macOS right-click on the Dock icon)

Minimal — a single item, **New Window** (`applicationDockMenu` in `Sources/AppDelegate.swift`), which calls the same "create main window" path as File > New Window. No workspace list, no recent-items list, and no other cmux-specific Dock menu entries were found in source.

## Managed device policies (MDM)

Delivered as forced preference values (Custom Settings / `com.apple.ManagedClient.preferences` payload) targeting domain `com.cmuxterm.app` (release app's bundle ID; channel builds honor it too, and can additionally target their own channel domain, e.g. `com.cmuxterm.app.nightly`, which wins over the release-domain fallback). Forced values are **tier 0**: they beat env vars, user settings, and `cmux.json` imports, and cannot be changed from inside the app — Settings shows "Managed by your organization", the command palette hides the matching commands, and the `cmux` CLI refuses with a managed-policy error. Re-checked roughly every 60 seconds while running, plus at launch, on preference-change notification, and when the app becomes active.

| Key | Type | Default | Effect when forced `true` (or set) |
|---|---|---|---|
| `DisableEmbeddedBrowser` | Bool | false | Kills every embedded-browser surface (panes/tabs, terminal-link interception, automation/CLI browser creation, saved/cmux.json layouts, session restore); live panes close; links fall back to the system default browser. Also disables WebKit-riding local viewers: diff viewer, agent-chat pane, in-app upgrade pages. iOS app is told this Mac has no browser capability. Takes precedence over `BrowserURLAllowlist` (allowlist isn't even consulted while this is forced). |
| `DisableRemoteControl` | Bool | false | Disables the Mac as an iOS remote-control host: Iroh host runtime (+ LAN advertisement), legacy TCP pairing listener, connection admission, device pairing; live phone connections close; pairing trust broker told `pairingEnabled=false`; relayed phone-typed replies stop. Outbound notification forwarding to an already-paired phone, Sparkle updates, the local automation socket, and Mac-as-SSH-client remain unaffected. |
| `DisableDeviceDiscovery` | Bool | false | Disables discovering *other* Macs in My Devices; does not block this Mac from accepting incoming sessions (see next key). |
| `DisableIncomingDeviceAccess` | Bool | false | Blocks this Mac from advertising/accepting incoming Mac and iOS sessions while outbound discovery stays available; live incoming sessions close. |
| `DisableCloud` | Bool | false | Disables Cloud Machines + cmux-managed private-network access entirely: Cloud UI (right-sidebar tab, Settings, palette, titlebar, new-workspace entries), Cloud session restore, Cloud VM service calls, `aiAccounts.*` (incl. credential upload), `coderouter.*`, `cmux vm-pty-connect`, and the `cmux.cloudvm` cmux.json action — all fail closed with socket code `cloud_disabled`. `cmux vpn up` fails closed; `vpn status`/`down`/`revoke` remain for cleanup. Local terminals/automation/user-configured SSH unaffected. Managed VPN config is removed when the policy activates mid-session. |
| `DisableRemoteConnections` | Bool | false | Disables cmux-created SSH, Mosh, and remote-tmux connections plus the remote registry from every entry point; also blocks Cloud VM attach (shares the mechanism) even if `DisableCloud` is absent. `ssh://` links are refused up front; a mid-session push disconnects every live cmux-created remote workspace/mirror (no reconnect, no wake-from-sleep re-arm). A user's own typed `ssh` in a shell is explicitly out of scope. |
| `DisableFileTransfer` | Bool | false | Disables cmux-mediated transfer: drag/paste uploads into remote terminals (incl. custom `terminal.uploadCommands`), SSH file-explorer remote previews, phone↔Mac transfers over iOS (RPC code `file_transfer_disabled`), and `cmux vm push`/`pull`. Local drops into local terminals still work; a user's own `scp`/`rsync` is out of scope. |
| `DisableIrohNetworking` | Bool | false | Disables the Iroh host runtime entirely (no endpoint, no relay traffic, no route publication) — the transport layer itself, broader than `DisableRemoteControl`. Local terminal work, the automation socket, and ordinary SSH unaffected. |
| `DisableTelemetry` | Bool | false | Disables PostHog analytics, Sentry crash reporting, and remote feature-flag fetch (flags fall back to built-in defaults). Read once at launch, so a mid-session push applies at next launch. |
| `DisableAutoUpdate` | Bool | false | Disables Sparkle: no scheduled/launch-time checks or downloads; "Check for Updates…" explains the managed state. Read at launch. |
| `DisableAutomationWebhooks` | Bool | false | Disables the `webhook` action of automation rules (`~/.cmuxterm/automations.json`, `cmux automation`); `run`/`notify` actions unaffected. |
| `DisableTLSTrustBypass` | Bool | false | Removes the embedded browser's click-through on certificate errors (no bypass, no 24h grant honored). |
| `DisableComputerUse` | Bool | false | Kills Computer Use: new agent launches never get computer-use tools, the bundled helper stops (even mid-session), Settings locks the toggle. |
| `DisableCustomSidebars` | Bool | false | No interpreted custom sidebars listed/mounted; Settings > Beta Features locks the toggle. |
| `DisableAICredentialUpload` | Bool | false | `cmux ai-accounts upload` / `coderouter claude add/update` fail closed (`ai_credential_upload_disabled`); listing/removing accounts still works. Independent of `DisableCloud`. |
| `SocketControlMode` | String | `cmuxOnly` | Forces the automation socket to `cmuxOnly` or `off`; wins over Settings, cmux.json, `CMUX_SOCKET_MODE`, `CMUX_SOCKET_PASSWORD`. A malformed/broader forced value (e.g. `allowAll`) fails closed to `off`. Mode change revokes all existing clients (incl. idle/event-stream) before admitting new ones. |
| `BrowserURLAllowlist` | Array<String> | unset (allow all) | Restricts every embedded-browser top-level navigation (address bar, links, redirects, `window.open`, automation, deep links, restored panes) to the listed hosts/URL patterns. A forced empty array denies all external web origins (internal cmux docs, localhost, local files remain available unless the two allow-keys below are also forced off). |
| `BrowserAllowLocalhost` | Bool | true | While true, `localhost`/`*.localhost`/`127.0.0.1`/`::1`/`0.0.0.0` are allowed on any HTTP(S) port without a rule even under a managed allowlist. Forced `false` blocks loopback origins entirely, even if named in the list. |
| `BrowserAllowLocalFiles` | Bool | true | While true, local `file:` documents (address bar, `cmux browser open`, terminal links, drag-drop, links from other local files) stay available under a managed list. Forced `false` blocks them outright. |

Verification tooling: `defaults read com.cmuxterm.app <Key>`; `cmux browser status --json` (reports `url_allowlist`, `url_allowlist_managed`, `url_allowlist_allows_localhost`, `url_allowlist_allows_local_files`); `cmux socket-status --json` (reports `configured_mode`, `effective_mode`, `forced_value_status`, `managed`, `managed_source`, `policy_key`, `socket_path_state`; explicitly never opens the socket to check, so it works while cmux is quit). In-app locked-state copy: Settings → Browser shows the enable toggle disabled with "Managed by your organization"; Settings → Mobile shows "Remote control from the iOS app is disabled by your organization."; Settings → Beta Features shows the Cloud Machines toggle disabled the same way while hiding the whole Cloud section and right-sidebar tab; the App-section telemetry toggle, the Computer Use toggle, and the Custom Sidebars toggle lock the same way; "Check for Updates…" explains the `DisableAutoUpdate` managed state. Requires macOS 14 (Sonoma)+.

## Feature flags

`featureFlags.*` (PostHog-backed; Help menu → "Feature Flags…" opens an inspector window, `featureFlags.window.title`/`.heading` "Feature Flags", subtitle "Inspect PostHog flag state and local overrides for this Mac"). Columns: Flag, Current, Source (Default/Local/Override/Remote), Override (picker: No override / On / Off). "Clear all overrides" button. Footer note: "Remote values take priority, except for local Cloud overrides in Nightly and debug builds." When a flag is server-controlled the row shows "Controlled remotely; local override inactive."; Nightly/debug Cloud overrides show "Cloud overrides take priority in this Nightly or debug build."

Registered flags found:

| Flag | Title | Description |
|---|---|---|
| `computerUseUX` | Computer Use UX | Shows the Computer Use menu-bar item and automatic onboarding. |
| `agentChat` | Agent chat UI | Shows the Agent chat entrypoints in the new-workspace dropdown, command palette, and surface tab bar. |
| `appKitSidebarList` | "Lawrence Sidebar" | Renders the workspace sidebar with a native AppKit list and divider for smoother scrolling/resizing with many workspaces. |
| `mobileConnect` | Mobile Pairing button | Shows the Mobile Pairing button in the sidebar footer. |
| `mobileTaskComposer` | Mobile Task Composer | Enables the iOS New Task composer (task model discovery, directory picking, attachment staging). |
| `mobileTerminalFilesChip` | Mobile terminal Files chip | Shows the Files chip over iOS terminals; runs its visible-path count scan. |
| `mobileWorkspaceChanges` | Mobile diff viewer | Serves workspace diffs to paired phones (iOS changes chip, toolbar button, Changes sheet). |
| `proUpgrade` | Pro upgrade UI | Shows Pro upgrade entrypoints in the sidebar, Settings, command palette, and Help menu. Per `docs/pro-badge-options.html`, registered in PostHog as `pro-upgrade-ui-enabled-release`, ON. |
| `sidebarAccount` | Sidebar account button | Shows the profile/sign-in control in the sidebar footer. |
| `sidebarWorkspaceAgentSpinner` | Workspace agent spinner | Shows a spinner in workspace rows while coding agents run. |
| `simulator` | Simulator | Enables iPhone/iPad Simulator panes, commands, automation. |
| `workspaceTodoControls` | Workspace todo controls | Shows Add Checklist Item + workspace completion controls. |
| `cloudVM` | Cloud VM UI | Shows Cloud VM entrypoints in the new-workspace dropdown and command palette. |
| `cloudMachines` | Cloud Machines | Enables the macOS Cloud Machines integration (entry points, attachments, background sync). |
| `goPlan` | Go plan | Shows and sells the $10/month Go personal Cloud VM plan. |
| (unnamed) | — | `mobile-connect-button-enabled-release`, ON, per pro-badge doc — titlebar iPhone button. |

Each flag is "registered in code (owner + review date + safe default), gated live from the PostHog dashboard, and enforced by `scripts/lint-feature-flags.py` in CI against the posthog.com feature-flag-mistakes rules" (PostHog project 244066, per `docs/pro-badge-options.html`).

## Account, auth, team

Reached from Settings → Account, the sidebar footer account button/team picker (`SidebarAccountMenuButtonStyle.swift`, `SidebarAccountTeamPicker*.swift`, `SidebarAccountTeamPopover.swift`), and the standalone sign-in pane (`Sources/Auth/AccountSignIn*.swift`).

### States
- **Signed out** — `settings.account.signedOut.title` "Not signed in"; subtitle "Sign in with your cmux account to enable sync across devices." Button "Sign In…".
- **Signing in** — full sign-in flow states, each with heading/instructions text: "Opening secure sign-in…" → "Waiting for sign-in…" (after ~a while: "Still waiting for sign-in… The sign-in window is taking longer than expected. You can reopen or copy the same secure link without restarting.") → "Finishing sign-in…" ("cmux is verifying your account. Keep this pane open."). Sign-in opens a system browser window; "Open Again in Browser" and "Copy Sign-In Link" are fallbacks ("Link copied"). Prompt: "Continue with your cmux account."
- **Signed in** — `settings.account.signedIn.title` "Signed in"; shows Active Team (or "None"), Sign Out button.
- **Success** — "You're signed in now" / "Your cmux account is connected."

### Sign-in errors (each with title + recovery text)
Browser unavailable ("Couldn't open sign-in" / open link or copy-paste manually) · Cancelled ("Sign-in canceled" / no changes made) · Invalid link ("That sign-in link is no longer valid" / old link cannot sign in, try again) · Network error ("Couldn't reach cmux") · Offline ("No internet connection") · Rejected ("cmux couldn't complete the sign-in" / check account details in browser) · Server error ("cmux sign-in is temporarily unavailable" / account and workspaces unchanged) · Timed out ("Sign-in timed out" / sign-in window did not return to cmux) · Unauthorized ("cmux couldn't authorize this sign-in" / confirm intended account) · Unknown ("Couldn't finish sign-in"). Also: "Couldn't open your browser. Copy the link and paste it into any browser." and a slow-hint: "The system sign-in window may stop responding. If nothing happens, open sign-in in your default browser instead."

### Team
`Sources/Auth/HostAccountFlow+TeamSelection.swift` — Active Team row in Settings; team picker/popover in the sidebar footer for multi-team accounts.

### Pro subscription state (in Account section)
- **Active**: "cmux Pro" title, "Your Pro subscription is active. Manage billing or cancel in Stripe." → "Manage billing" button.
- **Legacy billing**: "Your subscription is managed by our previous billing system. Contact support to make changes."
- **Not subscribed**: subtitle "Cloud dev boxes, the iOS app, and cmux AI. $50/month, or $480/year." → "Upgrade…" button (this string set appears to predate the later $30/$45 Pro pricing found in `pro-badge-options.html`/`pricing.*` below — see Unverified for the discrepancy).

## Pricing / plans / Pro badge

### Free vs. paid split (native in-app pricing screen, `pricing.native.*`)

| Plan | Price | Included |
|---|---|---|
| Free | $0 | Native Ghostty-based terminal (open source), unlimited local terminals/agents, Claude Code/Codex/Gemini/local CLI agents, vertical tabs/splits/browser panels/notifications, local session history + 1 Cloud VM trial, community support (Discord/GitHub). |
| Go | $10/mo | 1 active Cloud VM (2 vCPU, 4 GiB RAM, 16 GiB disk), 40 included VM-hours/mo (pauses at limit), 2 saved VMs. |
| Pro | $50/mo (native pricing screen) — *also seen as $30/mo billed annually / $45/mo month-to-month in `pro-badge-options.html`, and $480/yr in the older Account-section string* | Unlimited workspaces, up to 50 Cloud VMs shared 24 GB RAM / 6 vCPUs across all VMs, cmux iOS app, email support. |
| Team | $60/user/mo | Everything in Pro per member, unified/centralized billing, up to 50 Cloud VMs per user (same per-user resource pool), team-wide model-gateway analytics, priority email support. |
| Max | $200/mo | Everything in Pro, up to 64 GB RAM per machine (Go/Pro/Team cap at 24–32 GB — "32 GB and 64 GB machines need cmux Max."). |
| Enterprise | Custom | Self-hosted/air-gapped agent execution, SSO/SAML + audit logs, SOC 2, dedicated support, self-hosted model gateway, SLA. |

Cloud VM active-hour rates: Small $0.20 ("Light agents and quick tasks"), Medium $0.40 ("Standard development"), Large $0.80 ("Heavy builds and parallel agents"). "There is no metering or overage billing" beyond the included hours/VM caps described per plan.

### Pricing screen
Every upgrade entry point (badge, Settings → Account, command palette, Help menu) opens a **native SwiftUI pricing screen docked to the right side of the window**, inside the app (no external browser for viewing plans) — window title "cmux Upgrade" / "cmux Pro". Shows Free / Pro / Team / Enterprise cards with a comparison table (`pricing.native.compare.*`: Terminal, Local agents, Workspace UI, Cloud agents, Concurrent Cloud VMs, Largest Cloud VM, Model gateway, iOS app, Admin, Billing, SSO/SAML, Self-hosted execution, Support tier). Plan buttons ("Get Pro" / "Get Teams" / "Get Go" / "Get Max" / "Contact sales") open the **web checkout** (Stack-hosted) for the actual purchase — the in-app screen itself does not process payment. Status states: "Checking your current plan…", "Billing is not configured for this environment.", "Billing status unavailable" + Retry, "Current plan" badge.

### Pro badge (per `docs/pro-badge-options.html`, describing shipped `feat-pro-plan` behavior)
- **Placements**: sidebar footer (bottom-left, next to Help) and the window titlebar (top-right, left of the iPhone/Mobile-Pairing button).
- **Visual**: small pill, uses a narrow slice of the cmux logo's chevron gradient (`#249ffc → #4b75ff`) as a text-gradient tint, chosen after trying plain-text ("Pro"/"Get Pro"/"Upgrade"), solid-fill, crown/sparkles/bolt/iPhone icon, and emoji (👑/✨/💎/🚀) variants — the tint variant was picked ("the one you liked").
- **Interaction**: click opens the native pricing screen (docked right, in-app). Hover widens the capsule to reveal a **✕ dismiss** wiped in by the widening (not faded/slid). Clicking ✕ hides the badge permanently; dismissal persists across launches (reset from the debug window, "show it again"); Settings → Account keeps the durable upgrade entry regardless of badge dismissal.
- Variant switching lived behind **Debug → Debug Windows → Pro Badge Style…**, a developer-only debug window (see Unverified — confirms a hidden Debug menu exists in dev/debug builds beyond the shipping menu bar).
- iPhone/Mobile Pairing titlebar button is a separate, real tab-bar action `cmux.mobileconnect`, configurable via `cmux.json`, opening Mobile Pairing in one click.
- Web `/pricing` page: Free / Pro / Team / Enterprise; Pro **$30/mo billed annually ($360/yr, checkout default), $45/mo month-to-month**; CTA opens Stack-hosted checkout when the checkout flag is on, else a download link. This is the pricing copy that appears authoritative for the actual public price (see the discrepancy note in Unverified — three different Pro price points were found in source).

## Updates (Sparkle)

`Sources/Update/UpdateLogStore.swift`, `UpdateTitlebarAccessory.swift`, `update.*` strings. "Check for Updates…" is in both the cmux app menu and Help menu, and via the command palette. Managed off entirely under `DisableAutoUpdate` (Sparkle: no scheduled or launch-time checks/downloads; the menu item explains the managed state instead of checking).

### States / flow
Checking for Updates… ("Please wait while we check for available updates") → No Updates Available ("You are running the latest version") **or** Update Available ("Update Available: %@") → Downloading… ("Downloading: %@" progress) → Preparing ("Preparing: %@" / "Extracting and preparing the update") → Install Update and Relaunch → Installing… ("Installing update and preparing to restart") → Restart Required ("The update is ready. Please restart the application to complete the installation.") / "Restart to Complete Update".

A **popover** variant (`update.popover.*`) shows Version:, Released:, Size:, with "Details" disclosure and the same lifecycle strings duplicated ("Update Available", "Downloading Update", "Preparing Update", "No Updates Found" / "You're already running the latest version.").

Auto-update permission prompt: "Enable Automatic Updates?" (popover: "cmux can automatically check for updates in the background." / "Enable automatic updates?").

Titlebar accessory (`UpdateTitlebarAccessory.swift`) surfaces update status inline in the window chrome; a "Configure automatic update preferences" link presumably routes back to Settings/Sparkle prefs.

### Errors (each with title + user-facing message; several also carry structured detail fields: Code, Domain, Message, Failure, Recovery, Feed, URL, Log, Debug)
No Internet Connection ("cmux can't reach the update server...") · Connection Lost ("The network connection was lost while checking for updates.") · Update Failed (generic) · Couldn't Download Update · Update Feed Error / Invalid Update Feed / Insecure Update Feed ("contact support") · Update Signature Error ("could not be verified") · Server Not Found / Server Unreachable / Secure Connection Failed / Update Timed Out · Update Didn't Start ("Install attempt stalled without reaching download.") · Couldn't Start Updater ("macOS didn't start cmux's updater helper in time. Security software can delay it. Retry once; if it still fails, restart your Mac or download and install the latest version below.") · Updater Permission Error / App Location Issue ("Move cmux into Applications and relaunch to enable updates. If it's already in Applications, restart your Mac and try again, or download the latest version below.") · Updater Not Ready ("Updater is still starting. Try again in a moment.").

A **debug-only error-injection menu** exists (`update.debug.error.*`): Agent Invalidation (4010), Disk Image/Translocated (1003), Download Failure (2001), Generic Install Failure (4005), Install Didn't Start (watchdog), Install Failure/Auth (4005→4001), Installer Agent Failure (4005+timeout), No Internet, Signature Error (3001), Updater Not Ready (readiness timeout) — lets developers simulate each Sparkle failure mode for testing, gated to debug builds.

Post-update, "View Release Notes" and "View GitHub Commit" links are offered; `menu.updateLogs.copyFocusLogs`/`copyUpdateLogs` copy diagnostic logs for support.

### Channels
Per `docs/configuration.md` and `docs/managed-device-policies.md`: **stable, nightly, rc, and DEV** (and "staging") builds each run under their own bundle identifier but all honor MDM policies targeting the release domain `com.cmuxterm.app` unless a channel-specific override domain (e.g. `com.cmuxterm.app.nightly`) is also forced. `app.confirmQuit` explicitly special-cases behavior across "stable, nightly, and RC builds" vs. "DEV builds" (DEV always skips the quit confirmation). Debug/Nightly builds get their own feature-flag override tier ("Cloud overrides take priority in this Nightly or debug build.").

## About window and licenses

`menu.app.about` "About cmux" opens a 360×520pt panel (`AboutWindowController.swift`, `AboutPanelView.swift`) showing: App icon/name ("cmux"), tagline `about.description` "A Ghostty-based terminal with vertical tabs", Version, Build, Commit rows, and links: Docs, GitHub, **Licenses**.

"Licenses" opens a separate "Third-Party Licenses" window (`about.licenses.windowTitle`) built by `AboutLicenseContent.swift`, which concatenates:
1. A "cmux Project License" heading with a **"Project source"** link (`https://github.com/manaflow-ai/cmux`) and a **"Corresponding source for this build"** link — computed as `github.com/manaflow-ai/cmux/tree/v<version>` when the bundle ID is the release `com.cmuxterm.app`, or `.../tree/<commit>` (from the `CMUXCommit` Info.plist key) for other builds, falling back to the bare repo URL.
2. The bundled `LICENSE` file text.
3. The bundled `THIRD_PARTY_LICENSES.md` file text.
If either resource is missing from the app bundle, "Licenses file not found." is shown in its place. This machinery (per-build GPL-style "corresponding source" link by exact tag or commit) indicates cmux ships under a copyleft-adjacent obligation for at least part of its stack (Ghostty/GhosttyKit is GPL-licensed upstream) — worth flagging to a licensing reviewer.

## Notable dialogs and alerts (in scope: quit/settings/security-relevant)

- **Confirm Quit** (`dialog.quitCmux.*`): "Quit cmux? This will close all windows and workspaces." — governed by the App section's Confirm Quit setting (Always/Dirty Only/Never), always "Never" on DEV builds.
- **Set Default Terminal** (`settings.app.defaultTerminal.dialog.*`): "Set cmux as default terminal? cmux will ask macOS to use this app for SSH links, .command/.tool files, and UNIX executables. macOS may show a confirmation prompt."
- **Restart to apply language change?** (Restart Now / Later) — only settings change in this scope that requires an app restart to take effect (besides Telemetry, which only needs the *next launch*, not an explicit restart prompt).
- **SSH link security prompt** (`dialog.sshURL.*`): "Open SSH Workspace in cmux? An external link wants to open "%@" in cmux. Do you want to open this SSH workspace?" with a required "I trust this SSH target and want cmux to connect." checkbox and a command preview; extensive structured parameter validation (rejects control characters, oversized fields, conflicting/duplicate/unsupported URL parameters, leading-dash hosts) before ever offering the dialog, and a distinct "cmux SSH Link Blocked" terminal state for links that fail validation outright.
- **External prompt/rules paste link** (`dialog.textURL.*`): "Paste a Prompt/Rules From an External Link? A %@:// link is asking cmux to paste [a prompt/rules] into the current workspace. cmux cannot verify which website or app opened this link." — same-shaped defense-in-depth as the SSH dialog, for a different custom-URL-scheme surface.
- **Enable Notifications** (`dialog.enableNotifications.*`): "Notifications are disabled for cmux. Enable them in System Settings to see alerts." (Not Now / Open Settings).
- **Custom workspace color** (`alert.customColor.*`): hex-color entry, validates `#RRGGBB` format with a dedicated "Invalid Color" alert on bad input.
- **Full Open Access warning** (`settings.automation.openAccess.dialog.*`): "Enable full open access? This disables ancestry and password checks and opens the socket to all local users. Only enable when you understand the risk." — the one Settings toggle in this scope gated by an explicit destructive-confirmation dialog rather than a plain switch.

## Unverified / unclear

- **Exact live Pro price**: three different figures appear in source — Settings/Account legacy string "$50/month, or $480/year" (`settings.account.pro.subtitle`), the native pricing-screen string `pricing.native.pro.price` "$50" with `pricing.pro.note` "Billed annually ($360/yr), or $45 month-to-month", and `docs/pro-badge-options.html`'s "Pro is $30/mo billed annually ($360/yr, the checkout default), $45/mo month-to-month." These may reflect different points in an active pricing migration (the doc explicitly frames itself as living on a feature branch, `feat-pro-plan`, tagged build `pro1`). Treat the web `/pricing` page (adopted from PR #6791 per the doc) as most likely current, but this is not confirmed against a live build.
- **Whether ordinary per-action shortcut recording (not just the system-wide Global Hotkey) validates against all other bindings for conflicts**, or only against itself/hardcoded system reservations — only the Global Hotkey path's conflict-checking code was located and read.
- **The `settings.material.*` / `settings.preset.*` string sets** (Liquid Glass, HUD Glass, Popover Glass, Raycast Gray, Soft Blur, Under Window, etc.) strongly imply a configurable macOS-material/vibrancy system for window chrome/panels, but no Settings-section source file wiring a control to them by that exact name was located in the time available — likely reached via a developer/debug surface or an as-yet-unshipped appearance panel rather than the documented main Settings nav.
- **Debug menu / "Debug Windows"** referenced by `docs/pro-badge-options.html` ("Debug → Debug Windows → Pro Badge Style…") and the update-error injection strings (`update.debug.error.*`) confirm a hidden developer menu exists in debug/nightly builds, but its full contents were not enumerated from source in this pass.
- **Reset section** (`settings.section.reset`) — only the nav label and search aliases were found ("factory defaults restore clear preferences"); the exact controls/confirmations on that pane were not read from source.
- **`sudo.*` flow's exact UI surface** (the in-app approval dialog for `cmux sudo run` requests) — the CLI-side and error strings were read, but the SwiftUI approval-dialog source file itself was not opened.
- Whether every `settings.app.*` label maps to a control actually visible in the shipping (non-debug) build, versus a few being debug/internal-only (e.g. items with no discoverable default, like Fade Buttons, Truncate Path From Start) — these read as real shipped settings from their string phrasing and paired subtitles, but were not individually confirmed against a running app.

## Coverage note

Built from: `AGENTS.md`/`CLAUDE.md`/`docs/` index; `docs/configuration.md`, `docs/managed-device-policies.md`, `docs/config-transactions.md`, `docs/pro-badge-options.html` (read in full); `web/data/cmux-shortcuts.ts` (read in full, 730 lines, all default shortcuts and notes); `web/app/[locale]/keyboard-shortcuts.tsx` and its docs page; the full localized-string dump filtered by prefixes `settings.` (1116 strings, all read), `menu.` (174, all read), `account.` (44, all read), `pricing.` (139, all read), `update.` (93, all read), `about.` (13, all read), `featureFlags.` (51, all read), `dialog.` (~160, majority read), `alert.` (26, all read), `sudo.` (partial), `statusMenu.` (partial); and direct reads of `Sources/AllShortcutsPopover.swift`, `Sources/KeyboardShortcutSettings+SystemWideHotkeyConflicts.swift`, `Sources/KeyboardShortcutSettings+Compatibility.swift`, `Sources/App/About/AboutWindowController.swift`, `Sources/AboutLicenseContent.swift`, and the `applicationDockMenu` implementation in `Sources/AppDelegate.swift`. Not opened line-by-line: the ~150 other `Sources/Settings*`/`Sources/KeyboardShortcutSettings*` implementation files (their behavior was cross-checked against the string dump and docs rather than read directly), the Reset section's implementation, the sudo approval dialog's SwiftUI source, and the debug-only menu tree. No `onboarding.*` string prefix exists in the dump (onboarding copy, where present, lives under other prefixes like `computerUse` onboarding or is handled by another agent's scope).
