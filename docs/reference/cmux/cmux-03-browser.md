# The in-app browser

cmux embeds a real browser (WebKit by default, or an out-of-process Chromium) as a pane type alongside terminals, so an agent's dev server, docs, or a page under test sits next to its terminal in the same split layout. Everything below is scoped to that browser surface: panes, chrome, downloads, design mode, the scriptable automation API, and cross-browser import.

## Browser panes, tabs and placement

### Opening a browser pane
A browser pane is a tab within a split pane, same as a terminal tab, created from the command palette, a keyboard shortcut, a dock control, or the `cmux browser open` CLI.
- Where it lives: `Sources/Panels/BrowserPanel.swift` (the pane's full state machine, ~11.6k lines), `Sources/BrowserSplitContainer.swift`, `Sources/BrowserSplitPlacement.swift`, `Sources/BrowserSplitRequest.swift`.
- Menu/commands: **New Tab (Browser)** (`command.newBrowserTab.title`), **New Browser Workspace** (`command.newBrowserWorkspace.title`, ⌘⌥N), **Open Browser** (⌘⇧L).
- Placement default (documented in `docs/agent-browser-port-spec.md`): a caller-relative new pane reuses the nearest right sibling pane; if none exists it splits right from the caller pane. Deeply nested layouts choose the nearest right sibling leaf in the caller's own split ancestry rather than reshuffling unrelated panes.
- Explicit split commands: **Split Browser Right** (⌘⌥D) / **Split Browser Down** (⌘⇧⌥D), also reachable as "Duplicate Browser to the Right" (`command.browserDuplicateRight.title`).
- Reopen: **Reopen Closed Browser Tab/Panel** (⌘⇧T) restores the most recently closed browser panel's URL, profile, original pane id, original tab index, and split orientation/anchor so it lands back where it was (`Packages/macOS/CmuxBrowser/Sources/CmuxBrowser/RecentlyClosed/ClosedBrowserPanelRestoreSnapshot.swift`). History is a stack; **Clear Browser History** / `menu.view.clearBrowserHistory` empties it. `BrowserManaging` tracks `mostRecentClosedBrowserPanelClosedAt` for the History menu's window ordering.
- Dock: cmux's right-sidebar terminal/browser control area can host a "New Browser" control (`dock.action.newBrowser`) that embeds a fixed URL (e.g. project dashboards, dev-server status). Dock config is JSON: `browser` controls require `url`; `chrome: false` hides the address bar/toolbar (Focus Address Bar then does nothing) while `cmux browser goto`/`reload` remain available via CLI (see string block at top of `cmux-strings.tsv`).
- Move: **Move Tab to New Workspace** exists for browser tabs (`Sources/Panels/BrowserPanel+MoveTabToNewWorkspace.swift`).
- Tab switching / new tab: `browser.switchToTab`, `browser.newTab` ("New tab"), `browser.action.newTab` ("new tab", lowercase agent-facing verb).
- Disabling the whole feature: **Disable cmux Browser** / **Enable cmux Browser** commands and `settings.browser.enabled` (default on). When off: "Browser tabs, terminal link clicks, and intercepted open commands are disabled. Links open in your default browser." This can also be forced off by an MDM configuration profile (`DisableEmbeddedBrowser` key, tier-0 — wins over user settings, `cmux.json`, and defaults; no in-app control, including session restore, can re-enable it — `Sources/BrowserAvailabilityManagedPolicy.swift`).

### Rendering engine
- Setting: **Default Browser Engine** (`settings.browser.engine`), options **Auto (Match Default Browser)**, **WebKit**, **Chromium**. Auto picks Chromium when the OS default browser is Chromium-based (Chrome, Edge, Brave, Arc, …), otherwise WebKit.
- Per-pane override: `--engine webkit|chromium` on `cmux browser open`/`new-pane`; only valid when creating a new pane (not when targeting an existing surface).
- Chromium runs as "a managed out-of-process Chromium runtime." Its automation goes over CDP (Chrome DevTools Protocol) internally (`browser.chromium.automation.*`, `browser.chromium.cdp.*` error strings cover: command/document-script/JS/navigation/screenshot timeouts, malformed cookies/navigation history, no CDP command result, no JS value, no screenshot, no page target/websocket, renderer exited (with exit code), unknown CDP error).
- **Chromium Remote Debugging Port** setting (`settings.browser.remoteDebuggingPort`): off by default ("Chromium panes still use private CDP internally; no external endpoint is exposed"). When set, new panes request `http://127.0.0.1:<port>`; if busy cmux silently picks another loopback port, and the CLI's JSON output reports the actual Playwright-compatible endpoint.
- **Chromium Extensions** setting: newline-separated absolute paths to unpacked extension directories (each must contain `manifest.json`), loaded into Chromium panes; applies to the *next* pane started, not live panes.
- Page zoom is **not supported for Chromium browser panes** (`browser.viewport.error.unsupportedEngine`) — zoom/viewport emulation is a WebKit-only feature.
- Cookie import into a Chromium destination profile is unsupported ("Chromium uses an isolated cookie store" — see Import section).

### Profiles
Each browser profile is an isolated `WKWebsiteDataStore` (cookies, storage, cache) plus an isolated history file, keyed by a UUID. Exactly one profile is the immovable built-in default.
- Where: `Packages/macOS/CmuxBrowser/Sources/CmuxBrowser/Profiles/`.
- UI: profile menu titled **Profiles**, entries **Default**, **New Profile...** ("Create a separate browser profile for cookies, history, and local storage.", prompts for a name), **Rename Current Profile...**. Toolbar button help text: "Browser Profile: %@".
- Slug derivation: the built-in default always slugs to `"default"`; others lowercase the display name, collapse non-alphanumerics to `-`, trim leading/trailing `-`, and fall back to the lowercased UUID when empty (used for socket/CLI addressing).
- CLI (`--profile <name|uuid>`): only valid when creating a new browser pane (not with `browser open <surface>` targeting), and not available when creating a pane in a remote workspace (`browser.profile.automation.error.profileUnavailableInRemoteWorkspace`) or while the browser is disabled. Errors cover: missing name/profile, invalid/multiple selectors, ambiguous name match (lists candidates, asks for a UUID), profile not found (suggests `cmux browser profiles`), profile creation/rename/delete/clear failure, cannot delete the default profile, cannot delete a profile that's in use (reports the count of surfaces using it).
- Switching profile clears the pane's Focus Mode (`clearBrowserFocusMode(reason: "profileSwitch")`).

### Duplicating / project pricing restore
`Sources/Surfaces/Workspace+BrowserDuplication.swift` and `Sources/Panels/BrowserPanel+AppPricingRestore.swift` exist for duplicating a workspace's browser panes and for restoring the app's own pricing page state on relaunch — internal plumbing, no independent user-facing surface beyond what's covered above.

## Address bar (omnibar)

- Placeholder text: **"Search or enter URL"** (`browser.addressBar.placeholder`).
- Focus: **Focus Address Bar** (⌘L; ⌘⇧L opens a new browser pane and focuses it). With `chrome: false` (dock controls), Focus Address Bar is a no-op.
- Suggestions dropdown (`Sources/BrowserPortalOmnibarSuggestionsHostingView.swift`, `Sources/BrowserPortalOmnibarSuggestionsOverlay.swift`) mixes browsing-history matches and the configured search engine.
- **Show Search Suggestions** toggle (`settings.browser.searchSuggestions`).
- **Default Search Engine** (`settings.browser.searchEngine`), used "when input is not a URL": Google, Bing, DuckDuckGo, Brave Search, Startpage, Kagi, Perplexity, Exa, Yahoo, Ecosia, Qwant, Mojeek, Wikipedia, GitHub, Baidu, Yandex, or **Custom**.
- Custom search engine: **Custom Search Engine Name** (shown in address-bar suggestions) and **Custom Search URL** — template uses `{query}` or `%s`; if the template has no placeholder cmux appends `q=` itself.
- Omnibar selection auto-repeat: holding a Ctrl+arrow with the address bar focused arms a repeat after a 250 ms hold, then ticks every 55 ms until release/modifier-change/blur (`Packages/macOS/CmuxBrowser/Sources/CmuxBrowser/Focus/BrowserOmnibarSelectionRepeatCoordinator.swift`).
- **Hide/Show Browser Omnibar** commands exist (`command.browserHideOmnibar.title` / `command.browserShowOmnibar.title`) — the chrome can be collapsed independent of Focus Mode.
- Downloads button, Profile button, Design Mode button, PDF Download/Print buttons (when viewing a rendered PDF) all live in the omnibar toolbar — see their own sections below.

## Navigation

- Commands: **Back** (⌘[), **Forward** (⌘]), **Reload** (⌘R), a hard reload (⌘⇧R, `browserHardReload`), **Stop** (`browser.stop`), **Open Current Page in Default Browser** (`command.browserOpenDefault.title`).
- `goToURL` ("go to URL") is the generic navigate action surfaced to the CLI/automation layer.
- **New tabs from links**: ⌘+click, middle-click (button 2, with a recovery path for WebKit reporting button 4 right after an observed middle-click), or an `otherMouseDown/Up` event with button 2 opens a new tab instead of navigating in place (`Sources/Panels/BrowserNavigationPopupPolicy.swift`).
- **Scripted popups** (`window.open` with explicit feature flags — x/y/width/height/menu/status/toolbar visibility or resize flags) open as a standalone `NSPanel` popup window (`Sources/Panels/BrowserPopupWindowController.swift`), not a tab, with its own URL label and webview; nested popups are capped at **`maxNestingDepth = 3`**; popup title/loading label reads **"Loading…"** (`browser.popup.loadingTitle`) until the target page loads.
- **Terminal link clicks**: **Open Terminal Links in cmux Browser** (`settings.browser.openTerminalLinks`, default reflects "when off, links clicked in terminal output open in your default browser").
- **Sidebar PR/port links**: two independent toggles, **Open Sidebar PR Links in cmux Browser** and **Open Sidebar Port Links in cmux Browser** — off routes those clicks to the system default browser.
- **Intercept `open http(s)://…` in Terminal** (`settings.browser.interceptOpen`): when off, a shell `open https://...`/`open http://...` always uses the system default browser instead of being caught and routed into cmux.
- **Hosts to Open in Embedded Browser** allowlist (`settings.browser.hostWhitelist`): applies to terminal link clicks and intercepted `open` calls only (not in-page browser navigation). One host/wildcard per line (e.g. `example.com`, `*.internal.example`); empty list = open all hosts in cmux; non-matching hosts fall back to the system default browser.
- **URLs to Always Open Externally** (`settings.browser.externalPatterns`): applies to in-page link clicks *and* terminal links *and* intercepted `open` calls. One rule per line; plain text substring-matches, `*`/`?` wildcards and regex are supported (regex using `*`/`?` needs a `re:` prefix; legacy `.*`/`.+` forms still work).
- **Embedded Browser URL Allowlist** (`settings.browser.urlAllowlist`): restricts in-page navigation itself (not just link-click routing) to matching hosts/patterns. A suggested localhost-only list is shown by default; saving it "opts into the restriction." Clearing the list allows all origins **unless a managed (MDM) policy applies**, in which case invalid-only values "fail closed." Internal cmux documentation pages remain reachable regardless. Blocked navigations render an in-place page (not a native alert):
  - Managed-policy block: title **"Blocked by your organization's policy"**, message **"This URL is not allowed by your organization's embedded-browser policy."**, next step **"Ask your administrator to add this site to the cmux browser allowlist. Sites on the allowlist, localhost, and local files stay available."**
  - User-configured block: title **"Blocked by the embedded-browser URL policy"**, message **"This URL is not allowed by the embedded-browser URL policy."**, next step **"Add this site in Settings → Browser → Embedded Browser URL Allowlist, or clear the list to allow all web origins."**
  - The page shows only the **origin** (scheme+host+port) of the attempted URL under an "Attempted URL" label — credentials, path, query, and fragment are stripped before reaching the UI. Source: `Sources/Panels/BrowserURLAllowlistBlockedPage.swift`.
- **HTTP Hosts Allowed in Embedded Browser** (`settings.browser.httpAllowlist`): controls which *plain HTTP* (non-HTTPS) hosts can load without a warning. Defaults: `localhost`, `*.localhost`, `127.0.0.1`, `::1`, `0.0.0.0`, `*.localtest.me`. **Reset to Defaults** / **Save** actions.
- **External App / "Open App?" prompt**: when a web page tries to navigate to a non-http(s) scheme that would hand off to another app, cmux shows a choice rather than silently leaving the browser: title **"Open External App?"**, message **"A web page in cmux wants to open a link in another app. You can stay in the browser instead."**, buttons **"Open App"** / **"Stay in Browser"**.
  - If opening the external app itself fails: title **"Cannot Open Link"**, message **"cmux could not open this link. You can copy it and open it in another app."**, button **"Copy Link"**.
  - "Proceed in cmux" (`browser.proceedInCmux`) is a related recovery action.
- Context menu (right-click on a page): **Open Link in New Tab**, **Open Link in Default Browser**, **Screenshot Page**, **Screenshot Section**.
- `browser.moreActions` — an overflow "More Actions" menu exists on the omnibar toolbar in addition to the discrete buttons.
- Drag-and-drop into a browser pane: `Sources/BrowserPaneDropTargetView.swift`, `BrowserFileDropNavigationGuard.swift`, `BrowserPaneFileDropRouting.swift` route a dropped file to either navigation (local file) or into a page's own drop handler; `BrowserImageCopyPasteboardBuilder.swift` builds a pasteboard writer for copying an image out of a page.

## Error pages

In-webview interstitials (own HTML/CSS, not a native sheet), rendered by `Sources/Panels/BrowserErrorPage.swift` / `BrowserErrorPageContent.swift`. All show: a small circular "!" icon, a title, a message, the failed URL in a monospace code block, and up to two buttons.

| Trigger (NSURLError code) | Title | Message | SSL bypass offered? |
|---|---|---|---|
| Cannot connect to host / cannot find host / timed out | "Can't reach this page" | "%@ refused to connect. Check that a server is running on this address." (or the generic form with no URL: "The site refused to connect. Check that a server is running on this address.") | No |
| Not connected to internet / network connection lost | "No internet connection" | "Check your network connection and try again." | No |
| Server certificate untrusted / unknown root / bad date / not yet valid / secure connection failed | "Connection isn't secure" | "The certificate for this site is invalid." | **Yes** |
| Any other error | "Can't open this page" | "The page could not be opened. Check the address and try again." | No |

- **Reload** button re-issues the request when it can be safely retried with the URL alone (http/https with a host); the retry can instead carry the original failed `URLRequest` when reload-with-URL-only isn't safe.
- **Proceed Anyway (Unsafe)** button appears only for the certificate-error case, and only when the failed request is HTTPS-safe to bypass; clicking it posts a one-shot, token-authenticated message back to native code (`BrowserSSLTrustBypassMessageHandler`) — the token-bearing page is deliberately loaded with `baseURL: nil` ("Keep token-bearing interstitials out of the failed site's origin").
- **SSL trust bypass grants** are scoped per `(scheme, host, port)` (`BrowserSSLTrustScope`), tokens expire after **24 hours**, at most **32 pending bypass tokens** are retained at once, and up to **1 MiB** of the original request body is retained for replay. An MDM policy key **`DisableTLSTrustBypass`** can turn the bypass button off entirely; the check is re-read per navigation so a profile pushed mid-session takes effect on the next attempt. Source: `Sources/Panels/BrowserSSLTrustBypassState.swift`.

## Authentication

### HTTP Basic Auth
Native `NSAlert` sheet (or, on mobile-streamed sessions, a `MobileBrowserDialog`), triggered from `WKNavigationDelegate` on a `URLAuthenticationChallenge`.
- Title: **"Authentication Required"**.
- Message: **"%@ requires a username and password."** or, when the server supplies a realm, **"%1$@ requires a username and password for "%2$@"."** — `%@`/`%1$@` is the origin (or **"this site"** if the host can't be determined).
- On a retry after a failed attempt, the message is prefixed with **"The username or password you entered is incorrect."**
- Fields: **Username**, **Password** (secure field), pre-filled from any proposed credential.
- Buttons: **Sign In** / **Cancel**. Sign In supplies a `.forSession`-persistence `URLCredential`; Cancel (or dismissing the sheet) sends `.cancelAuthenticationChallenge`.
- Source: `Sources/Panels/BrowserHTTPBasicAuthPrompt.swift`, coordinated by `BrowserHTTPBasicAuthPromptCoordinator.swift`.

### Client certificates
- Title: **"Choose a Certificate"**.
- Message: **"%@ requires a client certificate."** (origin, or **"This site"** if unknown).
- A popup-button accessory lists every candidate certificate, first item pre-selected; label is the certificate's title, or **"Certificate %d"** (1-based index) if it has none, plus **"Serial %@"** in parentheses when a serial number is available, e.g. `"My Cert (Serial 04:A1…)"`.
- Buttons: **Continue** / **Cancel**.
- Source: `Sources/Panels/BrowserClientCertificateCredentialPicker.swift`, `BrowserClientCertificateAuthenticationController.swift`.

### WebAuthn / passkeys
A native bridge overrides `navigator.credentials.create()`/`.get()` inside the page's JS world and relays the serialized public-key request to native `AuthenticationServices` (Touch ID / iCloud Keychain / security keys), marshalling the ceremony result back into the shape a page expects. Source: `Sources/Panels/BrowserWebAuthnSupport.swift` (~1.9k lines) plus the request/response model types in `Sources/Panels/BrowserWebAuthn*.swift` (assertion/creation options, credential descriptors, relying-party descriptor, transport summary, binary-data codec, authenticator selection). This is what lets sites offering passkey sign-in work inside the embedded browser rather than failing outright.

## Downloads

- Where: `Packages/macOS/CmuxBrowser/Sources/CmuxBrowser/Download/BrowserDownloadRecord.swift` (data model), `Sources/Panels/BrowserDownload*.swift`, `Sources/Panels/BrowserSessionDownloadSaver.swift`, `Sources/Panels/BrowserSubframeDownloadIntentTracker.swift`.
- **States** (`BrowserDownloadRecord.State`): `downloading` → `saved` or `failed`. `isComplete` is true for anything not `downloading`.
- **Toolbar button** (Safari/Chrome-style): a monochrome down-arrow-in-circle icon; swaps to a small spinner (`ProgressView`) while any download is in flight. On completion, the icon does a discrete SF Symbol `.bounce`. A red notification-bubble badge shows the count of downloads not yet viewed in the popover (caps display at "99+"), clearing when the popover opens. Source: `Sources/Panels/BrowserDownloadsToolbarButton.swift`.
- **Downloads popover**: title **"Downloads"**, a **Clear** button (only shown when the list isn't empty), and either **"No recent downloads"** or a scrollable list (max height 320pt) of `BrowserDownloadRow`s.
  - Row: filename (single line, middle-truncated), a subtitle that is **"Downloading..."** while in flight, **"Failed"** (red) on failure, or on success either the file size (`ByteCountFormatter`, file style) or the containing folder's name.
  - Leading icon: spinner while downloading, filled document icon when saved, red filled warning-triangle when failed.
  - Row actions when saved: **Open** button and a magnifying-glass **Show in Finder** button; the whole row is also a tap target (opens the file) and a native drag source out of the popover onto the Finder/other apps (only for saved files whose file still exists on disk and is a regular file — a moved/deleted file silently stops being draggable).
- **Filename resolution** (`Sources/Panels/BrowserDownloadFilenameResolver.swift`):
  - Forced-download MIME types even without a `Content-Disposition: attachment` header: `application/gzip`, `application/octet-stream`, `application/x-gzip`, `application/x-zip-compressed`, `application/zip`, `text/csv`.
  - Filename collisions in the destination folder are deduped as `"name (1).ext"`, `"name (2).ext"`, … up to **100 attempts**, then falls back to a UUID-suffixed name.
  - Empty/whitespace-only or path-traversal-y suggested names fall back to `"download"` (`browser.download.defaultFilename`); `:` characters are replaced with `-`.
  - Downloaded images get their extension corrected to match the sniffed image type (via `CGImageSource`) when the suggested filename's extension doesn't already match.
- **Ask Where to Save Downloads** setting (`settings.browser.askWhereToSaveDownloads`): when on, a save panel appears for each download; when off, files save directly into the Downloads folder.
- **PDF preview**: a PDF opened in-pane (not force-downloaded) shows two extra omnibar butons — **Download PDF** (writes it into the Downloads folder like any other download) and **Print PDF** (drives a native print operation, `Sources/Panels/BrowserPDFPrintOperationRunner.swift`). Source: `Sources/Panels/BrowserPDFDocumentToolbarButtons.swift`, `BrowserDownloadDelegate+PDFPreviewData.swift`.
- Generic failure text: **"Download failed"** (`browser.download.error.generic`).
- **"Download in progress"** (`browser.downloadInProgress`) is shown where cmux needs to warn that closing a pane/tab would interrupt an active download.
- Automation/CLI: `cmux browser <surface> download --path <file> --timeout-ms <ms>` waits for and saves the next triggered download; `download list --limit N --json` lists recent downloads newest-first (`cli.browser.download.list.entry` format: `"1. name url"`; `cli.browser.download.list.empty`: "No recent downloads.").

## Memory / discard ("Browser Memory Saver")

- Setting: **Browser Memory Saver** (`settings.browser.hiddenWebViewDiscard`), default **on**.
  - Off: "Hidden browser tabs keep page memory until closed."
  - On: "Hidden browser tabs release page memory after the delay below, then restore when shown again."
- **Memory Saver Delay** (`settings.browser.hiddenWebViewDiscardDelay`): default **300 seconds (5 minutes)**, clamped range **0–3600 s**; displayed as `%dm %ds`.
- Both values can be overridden by env vars for debugging: `CMUX_BROWSER_HIDDEN_WEBVIEW_DISCARD_ENABLED` and `CMUX_BROWSER_HIDDEN_WEBVIEW_DISCARD_DELAY_SECONDS` (accepts `1/true/yes/on` / `0/false/no/off`). Source: `Sources/Panels/BrowserHiddenWebViewDiscardPolicy.swift`.
- **Discard is skipped** (never fires) while any of these hold, per the setting's own subtitle and confirmed in `BrowserHiddenWebViewDiscardManager.swift`'s eligibility snapshot: the page/webview is still loading, a download is active, an element is in fullscreen, a popup is open, or developer tools are visible. On restore (tab shown again), the page reloads from its held state.
- Related: `Sources/App/BrowserHiddenWebViewMemoryPressureResponder.swift` — a system memory-pressure responder that can also prompt discarding hidden webviews.

## Zoom

- **Zoom In** (⌘=), **Zoom Out** (⌘-), **Actual Size** / reset (⌘0). Step is a fixed **0.1** per press (`BrowserZoomSettings.step`).
- Range: **25%–500%** (`minimumLevel = 0.25`, `maximumLevel = 5.0`), default **100%**.
- **Default Page Zoom** setting (`settings.browser.defaultZoomLevel`): the zoom applied to *newly opened* pages; individual pages can still be zoomed independently after that with the shortcuts above. Displayed as `%lld%%`.
- Zoom (as page-zoom) is WebKit-only; Chromium panes reject `viewport.error.unsupportedEngine` for page-zoom requests. Automation also supports exact CSS-pixel viewport emulation (1–4096 px) independent of zoom — see Automation section, `browser.viewport.*`.

## Find on page

- Draggable in-page find bar, corner-snapping (`Sources/Find/BrowserSearchOverlay.swift`), search field placeholder **"Search"**.
- Match counter next to the field: `"n/total"` once a match is selected, `"-/total"` before any match is selected, `"0/0"` when there are no matches.
- Buttons: previous (chevron up) / next (chevron down), help text **"Next match (Return)"**; Return advances, Shift+Return goes to the previous match, Escape closes the bar and (if the find field had focus) restores webview focus.
- Starting a find clears Browser Focus Mode (`clearBrowserFocusMode(reason: "startFind")`).
- Source: `Packages/macOS/CmuxBrowser/Sources/CmuxBrowser/Find/` (match-count model, script-evaluation seam, `BrowserFindScript`, `BrowserFindService`).

## Focus Mode

A chrome-hiding "just the page" mode, distinct from Design Mode.
- Enter: **Enter Browser Focus Mode** command (⌘⌥↩, i.e. Return with Command+Option) or via context menu; help text **"Enter browser focus mode"**.
- While active: **"Focus Mode"** indicator (`browser.focusMode.active`); once an Escape has been pressed, the hint changes to **"Esc again to exit"** (`browser.focusMode.armed`); the general shortcut hint string is **"Esc Esc"**.
- Eligibility (`canEnterBrowserFocusMode`): the webview must actually be rendering, attached to a real interactive host window, not hidden/hidden-ancestor, no find bar open, and Design Mode not active (Design Mode owns the pointer/keyboard and needs the omnibar reachable, so it's never hidden under Focus Mode).
- **Exit sequence is two Escapes**: the first plain Escape (no modifiers, keyCode 53, not an auto-repeat) *arms* an exit window; a second plain Escape within **1.6 seconds** (`browserFocusModeEscapeSequenceInterval`) actually exits. If the second Escape arrives *after* the window, it re-arms a fresh window instead of exiting (and is forwarded to the page rather than consumed). A held/auto-repeating Escape, or the exact same NSEvent seen twice, is swallowed without changing state. Any non-Escape key clears the arm. Source: `Sources/Panels/BrowserPanel.swift` (`handleBrowserFocusModeKeyEvent`, `setBrowserFocusModeActive`, `clearBrowserFocusMode`).
- Focus Mode is also cleared automatically on: search starting, Design Mode activating, profile switch, panel losing focus, webview discard, or a context reset.
- Exit command: **Exit Browser Focus Mode** (`command.browserFocusMode.exit.title`), help text "Exit browser focus mode."

## Developer Tools

- Toggle: **Toggle Developer Tools** (⌘⌥I) / **Show JavaScript Console** (⌘⌥C, `browser.toggleDevTools`/`command.browserConsole.title`).
- Docking states: docked inside the host window (normal WebKit Web Inspector redock behavior — left/right/bottom/side dock), or **detached into its own window**. cmux normalizes the inspector's own dock-control UI depending on whether the frontend webview is currently attached to the host window or has been pulled into a separate window (`Sources/Panels/BrowserDeveloperToolsDockControlNormalizer.swift`, `HostedInspectorDockControlScript`).
- Detached-window lifecycle is deliberately conservative: closing the detached DevTools window from the window's own close box is tracked as an "explicit user close"; other `willClose` events (which can also fire mid-redock, when WebKit is moving the inspector back into the host window) are deferred/resolved rather than torn down immediately, to avoid killing the inspector frontend while a redock is still in flight (`Sources/Panels/BrowserPanelDeveloperToolsLifecycle.swift`).
- Changing the browser viewport (see Automation) requires closing/detaching the inspector first (`browser.viewport.error.attachedBrowserInspector`).
- Browser Focus Mode's Escape key handling is unaffected by DevTools; opening DevTools does not itself exit Focus Mode, but the Memory Saver discard is blocked while DevTools is visible (see Memory section).

## Screenshot

- Two entry points from the context menu: **Screenshot Page** (captures the whole page) and **Screenshot Section** (drag-select a region).
- Screenshot Section shows instructions **"Click and drag to select. Esc cancels."**; a selection-overlay view drives the drag rectangle.
- On capture, a **white flash animation** plays over the pane (opacity 0→0.32→0 over 0.20 s, ease-out) — a physical camera-flash cue rather than a spinner, `Sources/Panels/BrowserScreenshot.swift` (`BrowserScreenshotFlashView`).
- Result: **"Copied"** confirmation on the button (`browser.screenshotPage.copied`), help text **"Screenshot copied to clipboard"**; the copy-only affordance is **"Screenshot Page to Clipboard"**.
- Failure modes (`browser.screenshot.error.*`): automation timeout waiting for the screenshot, capture area too large ("The page is too large to capture."), another capture already in progress ("Another browser screenshot is already in progress."), empty snapshot returned, image could not be encoded, selection empty/outside the view, clipboard write failed, page dimensions unreadable, and a **rendered-content mismatch** check — the screenshot pixels disagreeing with the page's rendered text at a location, reported with a blank-region count (an anti-flake / anti-blank-capture safeguard for automation screenshots).
- Related pipeline files: `BrowserScreenshotCaptureService.swift`, `BrowserScreenshotPipeline.swift`, `BrowserScreenshotSnapshotter.swift`, `BrowserScreenshotAnimationFrameWaiter.swift` (waits for the page to settle before capturing), `BrowserScreenshotDOMProbeCollector.swift` (the DOM/text cross-check), `BrowserScreenshotContinuationGate.swift`, `BrowserScreenshotPasteboardWriter.swift`, `BrowserScreenshotJavaScriptRequest.swift` / `…SnapshotRequest.swift`.

## Browser Design Mode

An element/region inspector for capturing visual context (screenshots + DOM/CSS metadata) to hand off to a coding agent — "point at this button, describe what's wrong with it."

- Toolbar toggle: paintbrush icon (`paintbrush.pointed` inactive / `paintbrush.pointed.fill` + accent color while active); help text **"Design Mode (%@)"** with the current keyboard shortcut, or a specific unavailable-reason message when disabled. Shortcut: **⌘⌃⌥D** (`toggleBrowserDesignMode`). Menu: **Toggle Design Mode**.
- **Phase state machine** (`Packages/macOS/CmuxBrowser/Sources/CmuxBrowser/DesignMode/BrowserDesignModePhase.swift`):
  - `inactive` → `activating` → `active(annotation:)` → `deactivating` → `inactive`.
  - `isTransitioning` is true during `activating`/`deactivating` (buttons should be treated as busy).
  - Within `active`, a nested **annotation phase** tracks one in-flight freehand drawing/capture at a time: `idle` → `drawing(id)` → `inkOnly(request)` → `capturing(request)` → `captured(id, selector)` → back to `idle`. `permitsHandoff` is true only at `idle`/`captured` — mid-draw or mid-capture, handing off to an agent is blocked.
- **Two interaction modes**, mutually exclusive: **"Select elements"** (click a DOM node) and **"Draw a capture area"** (freehand rectangle over the page) — `browser.designMode.mode.select` / `.mode.draw`.
- **Selection data model** (`BrowserDesignModeSelection`): primary CSS selector, ordered fallback selectors (survive an SPA re-rendering the node), an id-anchored absolute XPath, a palette hex color shared between the on-page outline and the composer's pill, lowercased tag name, a bounded outer-HTML snippet, the element's text/value before editing, whether text is safely editable, viewport-relative bounds + viewport size, a bounded set of computed CSS properties, and (when detectable) the nearest named React component(s) and their **prop keys only** (never prop values — privacy-conscious).
- **Edits recorded**: `style` (a CSS property override) or `text` (a leaf element's text/form value) — `BrowserDesignModeEditKind`.
- **Composer** (the popover where you describe the change): placeholder **"Describe the change"**, each selected element becomes an inline chip/token with an SF Symbol matching its tag (photo for `img`/`picture`, play-rectangle for `video`, speaker for `audio`, link for `a`, cursor-click for `button`, text-cursor for form controls, heading-size icon for `h1`–`h6`, paragraph-align icon for text elements, list-bullet for lists, table-cells for tables, paintbrush for `svg`/`canvas`/`path`, globe for `iframe`, crop for a drawn region, and a dashed square as the fallback), each removable via **"Remove %@ context"** / **"Remove selected element"**.
- **Copy / handoff**: **Copy** button; states **Copying…** → **Copied**; keyboard shortcut **⌘↩**. Delivery copies text + artifact references to the system clipboard rather than sending directly into a chat composer — a coding-agent composer then picks it up. The prompt text composed for the clipboard interleaves free text with inline screenshot-path references per selection (`BrowserDesignModePromptFormatter`), falling back to:
  - No text typed: **"Design-mode context for the selected page elements."**
  - Always appended: **"Page: %@"** (page URL) and **"Details: %@"** (path to a saved, deterministic, pretty-printed JSON file with the complete structured context, for an agent to read for full fidelity beyond the short clipboard text).
- **Artifact/handoff leasing**: captured screenshots are written to disk under a lease (`beginHandoff`/`retainHandoffArtifacts`/`releaseHandoff`); a stale lease's artifacts are discarded, and a superseded handoff's artifacts are cleaned up once the clipboard actually references the newer one — so closing/reopening Design Mode quickly doesn't leak temp screenshots or race a half-written clipboard entry (`Sources/Panels/BrowserDesignModeController+Handoff.swift`).
- Errors (`browser.designMode.error.*`), all surfaced inline rather than as crashes: no page open yet ("Open a page before entering Design Mode."), capture annotation failed ("Could not capture the annotation. Draw it again."), the selected element moved mid-capture ("The selected element moved during capture. Try again when the page is still."), Design Mode failed to enable/disable ("Design Mode could not start." / "Design Mode cleanup failed. Reload the page or try again."), page returned invalid design data, operation timed out ("The page stopped responding. Reload it and try again."), generic recovery hint ("Try again. If the problem continues, reload the page."), and two React-Grab-specific teardown failures (below).
- **React Grab** (⌘⇧G, `browser.reactGrab`): a separate, pinned-version npm tool ("React Grab Version" setting — "Pinned npm version of react-grab injected by the toolbar button… Only versions with a known integrity hash are accepted") injected into the page to grab React component info; toggled with `cmux browser react-grab toggle`. Design Mode and React Grab are mutually exclusive — entering one cleanly tears down the other first, and a failure to do so surfaces as **"Design Mode could not close before starting React Grab. Reload the page and try again."** / **"React Grab could not close. Reload the page and try again."**
- CLI: `cmux browser design-mode enable|disable|toggle|status [--surface <id>]`; status values `enabled`/`disabled`; timeout and update-failure errors are distinct strings.

## Browser Automation (scriptable API)

cmux ports the `vercel-labs/agent-browser` CLI/protocol surface onto `WKWebView`/Chromium panes so an LLM agent can drive the page directly, without a separate headless browser process. Full command reference lives in the public docs page (`web/app/[locale]/(landing)/docs/browser-automation/page.tsx`) and the internal parity spec (`docs/agent-browser-port-spec.md`).

### Targeting
Every command targets a **surface** (a browser tab within a pane), addressed positionally or with `--surface`:
```
cmux browser open https://example.com
cmux browser identify
cmux browser identify --surface surface:2
cmux browser surface:2 url                 # positional target
cmux browser --surface surface:2 url       # flag target, equivalent
```
`cmux browser identify` / `system.identify` returns `focused.window_id/workspace_id/pane_id/surface_id` plus, for browser workflows, `focused.surface_type`, `focused.browser.url/.title/.loading`. Handles accept either a UUID or a short ref (`window:N`, `pane:N`, `workspace:N`, `surface:N` — global per daemon, monotonic, never reused until restart); plain-text and JSON CLI output default to short refs (`--id-format refs|uuids|both` selects otherwise).

### Command families (verbatim command names from the docs page / spec)
- **Navigation & targeting**: `identify`, `open`, `open-split`, `navigate`, `back`, `forward`, `reload`, `url`, `focus-webview`, `is-webview-focused`, `zoom`, `focus-mode`, `react-grab`, `devtools`.
- **Waiting**: `wait --load-state complete|…`, `wait --selector "#sel"`, `wait --text "…"`, `wait --url-contains "…"`, `wait --function "js expr"`, all with `--timeout-ms`.
- **DOM interaction**: `click`, `dblclick`, `hover`, `focus`, `check`, `uncheck`, `scroll-into-view`, `type <selector> <text>`, `fill <selector> --text "…"` (an **empty `--text ""` is treated as clearing the field**, per Decision Log item 14), `press <Key>`, `keydown <Key>`, `keyup <Key>`, `select <selector> <value>`, `scroll --dx --dy [--selector]`.
- **Inspection**: `snapshot [--interactive] [--compact] [--selector] [--max-depth]`, `screenshot --out <path>`, `get title|url|text|html|value|attr|count|box|styles`, `is visible|enabled|checked`, `find role|text|label|placeholder|alt|title|testid|first|last|nth`, `highlight <selector>`.
- **JavaScript & injection**: `eval "<js>"` / `eval --script "<js>"`, `addinitscript`, `addscript`, `addstyle`.
- **Frames, dialogs, downloads**: `frame "<selector>"` (enter an iframe) / `frame main` (return to top document), `dialog accept [text]` / `dialog dismiss`, `download --path <file> --timeout-ms <ms>` / `download list --limit N --json`.
- **State & session**: `cookies get [--name]`, `cookies set <name> <value> [--domain] [--path]`, `cookies clear --name <name>` / `--all`; `storage local|session get|set|clear`; `state save <path>` / `state load <path>`; `history clear --force`.
- **Tabs & logs**: `tab list`, `tab new <url>`, `tab switch <index|surface:N>`, `tab close [surface:N]`; `console list|clear`; `errors list|clear`.
- **Mutating-action verification**: most mutating commands (click, navigate, reload, scroll, …) accept `--snapshot-after` to return a `post_action_snapshot` (refs/title/url) in the same response, so an agent can verify the effect without a second round-trip.

### Underlying protocol scope (from the port spec)
The ported `agent-browser` protocol defines **125 total actions** — 93 directly reachable from the CLI parser and 32 "protocol-only" ones exposed only over the RPC surface (e.g. `addinitscript`, `bringtofront`, `clipboard`, `evalhandle`, `expose`, `har_start/stop`, `input_mouse/keyboard/touch`, `permissions`, `responsebody`, `screencast_start/stop`, `setcontent`, `timezone`, `useragent`, `video_start/stop`). Their exposure in cmux's own CLI/API is still an open decision (see Unverified). P2/advanced parity items explicitly **not yet implemented**: full network request interception/mocking (`route|unroute`), and trace/video/screencast/HAR recording — the port spec marks these unchecked as of the snapshot read.
- `browser fill` treats empty text as "clear."
- Viewport emulation: `cmux browser viewport <width> <height> | reset` — emulates an exact **1–4096 CSS-pixel** viewport inside the existing pane (aspect-fitted, without resizing the pane itself, preserving focus); `reset` restores native pane sizing. Oversized viewport × page-zoom combinations return a structured "render limit" error rather than silently clamping (`browser.viewport.error.renderGeometryTooLarge`). Requires closing/detaching an attached DevTools inspector and exiting any element-fullscreen first. Not supported for Chromium panes' zoom dimension (page zoom is WebKit-only, per Engine section above).
- Automation error strings distinguish: document-readiness timeout, JavaScript-evaluation timeout, "the browser surface stopped responding and was recovered — retry the command" (auto-healed crash), and "the browser surface was already recovered — retry the command" (a second, now-stale caller hitting the same recovery).
- Cookies CLI: `cmux browser cookies <get|set|clear> [--name] [--value] [--url] [--domain] [--path] [--expires <unix>] [--secure] [set: --http-only] [--all]`; `clear` requires **exactly one** of `--all` or a specific filter scope; `--expires` must be an integer Unix timestamp; `--url` must be a valid URL with a host.
- Named-key convention for `--key`: follows Playwright/W3C key names — `Space`, `Spacebar`, and lowercase `space` all emit DOM key `" "`/code `"Space"`; a literal `--key ' '` passes the raw DOM key through unchanged.
- Move/reorder invariant: `surface_id` is guaranteed stable across `surface.move`, `surface.reorder`, cross-pane/workspace/window moves, and `workspace.reorder` — this is a locked, tested invariant per the spec's decision log, not just a goal.
- Unsupported commands fail with an explicit `not_supported` error code rather than silently no-op'ing.

## Browser data import

Copies cookies and/or browsing history from another installed browser into a cmux browser profile, with dedup against already-imported entries.

### Supported source browsers (22, by rendering-engine family)
`Packages/macOS/CmuxBrowser/Sources/CmuxBrowser/Import/Values/BrowserImportBrowserDescriptor.swift`, ranked by a detection score (app bundle found: +80, data root found: +24, up to +24 for profile count, up to +16 for other artifact hits) then by a fixed tier, then alphabetically:
- **Tier 1** — Safari (WebKit), Google Chrome (Chromium), Firefox (Firefox), Arc (Chromium), Brave (Chromium), Microsoft Edge (Chromium).
- **Tier 2** — Zen Browser (Firefox), Vivaldi (Chromium), Opera (Chromium), Opera GX (Chromium), Orion (WebKit), Dia (Chromium).
- **Tier 3** — Perplexity Comet (Chromium), Floorp (Firefox), Waterfox (Firefox), SigmaOS (Chromium), Sidekick (Chromium), Helium (Chromium), Atlas (Chromium), Ladybird (WebKit), Chromium (Chromium), Ungoogled Chromium (Chromium).
- Detection reads only the filesystem (app bundle presence + known data-directory layout per engine family: Chromium's `Cookies`/`History` SQLite files, Firefox's `cookies.sqlite`/`places.sqlite` + `profiles.ini`, WebKit's `History.db`/`Cookies.binarycookies`) — no network calls.

### What's imported, per scope
- **Cookies only**, **History only**, **Cookies + history**, or **Everything** (`BrowserImportScope`) — "Everything" additionally flags the not-yet-implemented tier (bookmarks/settings/extensions) as a warning rather than silently skipping it: **"Bookmarks, settings, and extensions import are not available yet. Imported cookies and history only."**
- Known unsupported cases, each surfaced as a specific warning rather than a generic failure:
  - **Safari cookies**: "Safari cookies are stored in Cookies.binarycookies and are not yet supported by this importer."
  - **Chromium destination + cookies**: "Cookies were not imported because Chromium uses an isolated cookie store. Select WebKit as the destination engine and try again." (also blocks the operation up-front: "Cookie import into Chromium is not available yet…")
  - Per-browser cookie import simply "not implemented yet" for others not yet covered.
  - Encrypted cookies: "Skipped %ld encrypted cookie(s) that require(s) Keychain decryption." Keychain unlock failure: "Skipped %ld encrypted %@ cookie(s) because %@ could not be unlocked from Keychain." (both plural forms)
  - No history database found for a browser: "No browsing history was found for %@."
  - Read failures during import are per-browser, per-path, with the underlying error text included: "Failed reading %@ cookies at %@: %@" / "…history…".

### Destination mapping
Three modes (`BrowserImportDestinationMode`): **Separate profiles** (each source profile → its own matching cmux profile, missing ones auto-created), **Merge into one** (every selected source profile → one chosen cmux profile), or a single **Destination** profile picker for a simple one-to-one import.

### Wizard flow (3-step modal)
1. **Step 1 of 3 — Source**: pick a detected browser (list shows **"Detected: %@."**, or with more than fits, **"Detected: %@, +1 more."**/`"…, N more."`; **"No supported browsers detected."** if none found), or **"No importable browsers found"** state with message "cmux could not find browser profiles to import from on this Mac."
2. **Step 2 of 3 — Source profiles**: multi-select the source browser's own profiles ("Select one or more profiles."); empty state "No source profiles detected for %@."
3. **Step 3 of 3 — Data types**: choose Cookies / History checkboxes (validation: "Select Cookies, History, or both before starting import."), plus an **Additional data (bookmarks, settings, extensions)** checkbox with the note "Bookmarks, settings, and extensions are not available yet."; choose destination mode and destination profile(s) (validation: "Choose at least one source profile to import."); optional **Domains** filter field, placeholder "Optional domains, comma-separated"; **Start Import** / **Back** / **Next** navigation.
- Progress modal: title **"Importing Browser Data"**, message **"Importing %@ from %@…"**, subtitle **"This can take a few seconds for large profiles."**
- Completion summary (`browser.import.complete.*`): title **"Browser data import complete"**, lists Browser, Destination profile / Created cmux profiles / profile mappings (`"%@ -> %@"`), Scope, Domain filter, imported-cookies/imported-history counts, skipped-cookies count, source profiles, and any Warnings.
- Errors: title **"Import could not start"**; specific cases include the chosen cmux destination profile no longer existing ("Pick a destination profile again.") and destination-profile creation failure.

### Entry points
- **Settings → Browser → Import Browser Data**, with a **Choose…**/**Choose What to Import…** action and a live "Checking installed browsers..."/"Refresh" detection state.
- **Blank-tab hint**: a new blank browser tab can show an inline suggestion — title **"Import browser data"**, subtitle **"Import bookmarks, history, and cookies from Safari, Chrome, Firefox, Brave, Edge, or Arc. Already-imported entries are deduped automatically."**, actions **Import…** / **Hide Hint**, footnote **"You can always find this in Settings > Browser."** A setting toggles this hint (**"Show import hint on blank browser tabs"**), independently notes when it's hidden or when a debug "Settings only" override is active.
- **Menu → View → Import Browser Data…**.
- **CLI/automation** (`browser.import.automation.*`, `browser.profile.automation.*`): scripted import targeting a named/UUID'd browser and source profile(s) into a named/UUID'd (or newly created) cmux destination profile, with the same scope vocabulary as the wizard. Ambiguous name matches list every candidate and ask for a UUID instead.

## Routing browser panes through remote/SSH workspaces

When a browser pane belongs to a **remote workspace** (an SSH-backed cmux workspace, as opposed to a local one), its networking and cookie/storage isolation both follow the remote host rather than the Mac running cmux:
- **Proxying**: `BrowserProxyEndpoint` (`Packages/macOS/CmuxCore/Sources/CmuxCore/Remote/BrowserProxyEndpoint.swift`) is "a loopback HTTP/SOCKS proxy endpoint the embedded browser routes through to reach services on a remote workspace host" — always a loopback host/port on the Mac side, tunneling to the remote box. `BrowserPanel.setRemoteProxyEndpoint(_:)` applies it as both a SOCKSv5 and an HTTP-CONNECT `ProxyConfiguration` on the pane's `WKWebsiteDataStore`. A pane can opt out via `bypassesRemoteWorkspaceProxy`.
- **Local panes**, by contrast, mirror the Mac's *active system proxy* (excluding loopback, to avoid a self-proxy loop — referenced fix for GitHub issue #5888) and live-refresh that mirror via `Sources/Panels/BrowserSystemProxyWatcher.swift`, which watches `SystemConfiguration`'s dynamic store for proxy-setting or network-location changes.
- **Remote workspace status**: `BrowserRemoteWorkspaceStatus` carries the remote target string, `WorkspaceRemoteConnectionState`, a heartbeat count, and last-heartbeat timestamp, so a browser pane can reflect (and presumably block/queue navigation on) connection loss; `resumePendingRemoteNavigationIfNeeded()` runs once the endpoint (re)appears.
- **Website-data isolation**: `DockRemoteBrowserSettings` (used so Dock-hosted browser controls route through the *same* remote proxy/website-data store as main-area panes rather than navigating locally) carries a `remoteWebsiteDataStoreIdentifier: UUID?` — i.e. cookies/local storage for a remote workspace's browser panes are keyed separately per remote workspace, not shared with local panes.
- **Cloud machines** (a different, VM-backed remote target) get their own proxy path: `CloudBrowserProxyEndpoint`/`CloudBrowserProxyProcess`/`CloudBrowserRouting` establish an authenticated local SOCKS/HTTP-CONNECT-style proxy to a Cloud machine and probe its readiness (used both for embedded browser panes pointed at a Cloud machine and for the separate Cloud VNC "desktop" viewer — `CloudBrowserAccessState`/`CloudBrowserAccessView`/`CloudBrowserConnectionCard`, which is remote-desktop access rather than a cmux browser pane, out of this doc's core scope but adjacent).
- Cloud/remote failure copy: **"Update cmux to connect to this Cloud page."** (client too old), **"The Cloud connection ended. Reload to reconnect."**, **"This Cloud display or browser is unavailable. Refresh its machine to reconnect."**, and (missing Network Extension entitlement) **"This cmux build does not include the signed Network Extension required for browser access."**

## Theme (page color scheme)

- Setting **Browser Theme** (`settings.browser.theme`): forces a color scheme on compatible pages — "System follows app and macOS appearance," or a forced choice whose subtitle reads **"%@ forces that color scheme for compatible pages."** Toolbar button help: "Browser Theme: %@".

## Settings summary (Settings → Browser)

| Setting | Key | Default | Notes |
|---|---|---|---|
| Enable cmux Browser | `browser.enabled` | on | MDM `DisableEmbeddedBrowser` overrides, tier-0 |
| Default Browser Engine | `browser.defaultEngine` | Auto | Auto / WebKit / Chromium |
| Default Search Engine | `browser.defaultSearchEngine` | — | 16 built-ins + Custom |
| Custom Search Engine Name/URL | `browser.customSearchEngineName/URLTemplate` | — | `{query}`/`%s` placeholder |
| Show Search Suggestions | `browser.showSearchSuggestions` | — | |
| Browser Theme | `browser.theme` | System | |
| Default Page Zoom | — | 100% | applies to newly opened pages only |
| Ask Where to Save Downloads | `browser.askWhereToSaveDownloads` | — | off = direct-to-Downloads |
| Browser Memory Saver | `browser.discardHiddenWebViews` | on | |
| Memory Saver Delay | `browser.hiddenWebViewDiscardDelaySeconds` | 300 s | range 0–3600 s |
| Chromium Remote Debugging Port | `browser.remoteDebuggingPort` | off | |
| Chromium Extensions | `browser.chromiumExtensionDirectories` | empty | one path/line, needs `manifest.json` |
| React Grab Version | `browser.reactGrabVersion` | pinned | integrity-hash-checked |
| Open Terminal Links in cmux Browser | `browser.openTerminalLinksInCmuxBrowser` | — | |
| Open Sidebar PR Links in cmux Browser | `sidebar.openPullRequestLinksInCmuxBrowser` | — | |
| Open Sidebar Port Links in cmux Browser | `sidebar.openPortLinksInCmuxBrowser` | — | |
| Intercept open http(s) in Terminal | `browser.interceptTerminalOpenCommandInCmuxBrowser` | — | |
| Hosts to Open in Embedded Browser | `browser.hostsToOpenInEmbeddedBrowser` | empty (=all) | terminal/`open` routing only |
| URLs to Always Open Externally | `browser.urlsToAlwaysOpenExternally` | empty | link clicks + terminal + `open` |
| Embedded Browser URL Allowlist | `browser.urlAllowlist` | suggested localhost list, opt-in | in-page nav; fails closed under managed policy |
| HTTP Hosts Allowed in Embedded Browser | `browser.insecureHttpHostsAllowedInEmbeddedBrowser` | localhost/`*.localhost`/127.0.0.1/`::1`/0.0.0.0/`*.localtest.me` | |
| Browsing History | — | — | omnibar suggestion source; **Clear History…** dialog: title "Clear browser history?", message "This removes visited-page suggestions from the browser omnibar.", Cancel/Clear History |
| Import Browser Data | — | — | see Import section |
| Show import hint on blank browser tabs | `browser.showImportHintOnBlankTabs` | on | |

## Keyboard shortcuts (defaults)

| Action | Shortcut |
|---|---|
| New Tab (any surface) | ⌘N |
| New Browser Workspace | ⌘⌥N |
| Reopen Closed Browser Tab/Panel | ⌘⇧T |
| Split Browser Right | ⌘⌥D |
| Split Browser Down | ⌘⇧⌥D |
| Open Browser | ⌘⇧L |
| Focus Address Bar | ⌘L |
| Back / Forward | ⌘[ / ⌘] |
| Reload / Hard Reload | ⌘R / ⌘⇧R |
| Zoom In / Out / Reset | ⌘= / ⌘- / ⌘0 |
| Toggle Developer Tools | ⌘⌥I |
| Show JavaScript Console | ⌘⌥C |
| Enter/Toggle Browser Focus Mode | ⌘⌥↩ (then Esc, Esc to exit) |
| Toggle Browser Design Mode | ⌘⌃⌥D |
| React Grab | ⌘⇧G |
| Design Mode handoff copy | ⌘↩ (inside the composer) |

Source: `Packages/macOS/CmuxSettings/Sources/CmuxSettings/Values/ShortcutAction+Defaults.swift`. All are user-remappable in Settings → Shortcuts.

## Unverified / unclear

- Whether every one of the 32 "protocol-only" agent-browser actions (e.g. `har_start/stop`, `screencast_start/stop`, `video_start/stop`, `permissions`, `useragent`, `timezone`, `locale`, `expose`) is reachable at all from cmux's current CLI/API, or gated behind a future rollout — the port spec explicitly leaves this as an open decision ("Whether to expose protocol-only agent-browser actions in first public release of `cmux browser`…").
- Network request interception/mocking (`route`/`unroute`) and trace/video/screencast/HAR recording parity are listed as unchecked/not-yet-implemented in the spec's Phase 4 TODO; unclear whether any partial support has since landed beyond what the checkboxes show.
- Exact live layout/animation of the Design Mode popover beyond the composer/token elements described (full 794-line `BrowserDesignModePopover.swift` and 295-line `BrowserDesignModePopoverHost.swift` were only partially read).
- Precise on-page visual style of the design-mode element outline/highlight while hovering/selecting (the injected page-world script, not read in full).
- Exact mechanics of the omnibar suggestions ranking/mixing algorithm between history and search-engine suggestions (files present but not read in full: `Sources/BrowserPortalOmnibarSuggestionsConfiguration.swift`, `…HostingView.swift`, `…Overlay.swift`).
- Full detail of the mobile/iOS browser-streaming bridge (`Sources/Mobile/MobileBrowser*.swift`, `CMUXMobileCore` mobile browser dialog/frame/key/pointer types) — noted to exist (mirrors dialogs like HTTP Basic Auth to a phone-streamed session) but out of this catalog's macOS-app scope and not exhaustively read.
- Whether the "Cloud" VNC-style remote-desktop browser access (`CloudBrowserAccessView`, port-forwarded noVNC-style `/vnc.html` endpoint) is considered part of "the in-app browser" by the app's own information architecture, or a wholly separate Cloud feature that merely shares the `Browser` word — treated here as adjacent/out-of-core-scope per the task's remote-routing note only.
- The exact behavior/UI of `BrowserLocalFileFinderMenu.swift` (local-file navigation menu) was not read.
- Full list of context-menu items beyond the four confirmed strings (there may be more standard WebKit context-menu items inherited unmodified, e.g. copy/inspect-element, not separately localized by cmux and therefore not enumerated here).

## Coverage note

This catalog is built from: the full `browser`/`download`/`devtools`/`designMode`/`import`-prefixed slice of the localized-strings dump (634 lines), the public docs page and English copy for `browser-automation`, the internal `docs/agent-browser-port-spec.md`, and direct reads of ~35 Swift source files across `Sources/Panels/`, `Sources/Cloud/PortForward/`, `Sources/Find/`, `Sources/DockRemoteBrowserSettings.swift`, and the `Packages/macOS/CmuxBrowser` and `Packages/macOS/CmuxCore`/`CmuxSettings` packages (out of 185 `Sources/*Browser*` files and 223 files inside `CmuxBrowser` — the remainder were enumerated by filename/grep but not opened line-by-line). `BrowserPanel.swift` itself (11,638 lines, the pane's central state machine) was read only in targeted sections (Focus Mode, remote proxy, zoom, discard) rather than end-to-end; some finer state transitions it owns may exist beyond what's captured here. WebAuthn support (1,867 lines) and the Design Mode popover/host (~1,100 lines combined) were likewise sampled rather than read exhaustively.
