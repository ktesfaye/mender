# App shell, commands, shortcuts, notifications and themes

This catalogs everything cross-cutting in Emdash v1.2.6: the Electron main-process shell (window, menu, tray, protocol, updater, recovery, quit lifecycle), the renderer shell (onboarding, error boundary, toasts), the full command/keybinding catalog, every modal/view contribution, and the theme/appearance system. Source root below is `apps/emdash-desktop/` unless a path starts with `packages/`.

## Window (src/main/host/window.ts, src/main/bootstrap/boot/phases/window.ts)

- **Single window only.** `createMainWindow()` builds exactly one `BrowserWindow`; there is no "new window" command or multi-window support anywhere in the codebase.
- **No size/position memory.** The window is always created at a fixed `width: 1400, height: 900` (`minWidth: 700, minHeight: 500`). Nothing reads or writes window bounds to disk/DB — quitting and relaunching always returns to 1400×900, not wherever the user last resized/moved it.
- **Boot sequence is "window-first":** `bootWindow()` registers the `app://` protocol scheme, builds the native menu, installs the Wire IPC gateway, creates the window, and registers the quit handler — all before backend controllers exist; renderer traffic queues until they register.
- **Background color pre-paint:** window `backgroundColor` is set to an sRGB approximation of the theme background (`#111111` dark / `#fcfcfc` light, from `nativeTheme.shouldUseDarkColors`) so there's no white flash before the splash paints.
- **Platform-specific chrome:**
  - macOS: `titleBarStyle: 'hiddenInset'`, custom `trafficLightPosition: { x: 10, y: 10 }`, `acceptFirstMouse: true`.
  - Linux: `frame: false` (fully frameless); the renderer draws its own window controls (`FramelessTitlebarOverlay`), because Electron's native `titleBarOverlay` is "experimental/inconsistent across desktop environments" (code comment explicitly compares this choice to VS Code).
  - Windows/Linux (non-mac): native menu bar is hidden (`setMenuBarVisibility(false)`) — the app relies on its own in-app UI, not a visible top menu bar.
- **Show strategy:** the window calls `.show()` immediately (not waiting for `ready-to-show`) so the static HTML boot splash paints as fast as possible; `ready-to-show` is logged for diagnostics only.
- **Window events:**
  - `focus` → fires `telemetryService.capture('app_window_focused')`, restores window-button visibility on mac, and checks/reports daily-active-user telemetry.
  - `blur` → fires `telemetryService.capture('app_window_unfocused')`.
  - `close` → if shutdown isn't already resolved to "allow close," the event is prevented and the window is **hidden**, not destroyed (keeps the app alive in the tray / for `activate`/dock-click to restore). If shutdown is already in progress, close is allowed through.
  - `maximize`/`unmaximize` → emits `window-maximize-changed` events so the Linux custom window controls' maximize/restore icon stays in sync.
  - `closed` → nulls the module-level window reference.
- **webPreferences:** `nodeIntegration: false`, `contextIsolation: true`, `sandbox: false` (required for ESM preload), `webviewTag: true` (for the in-app browser pane — the `<webview>` process is separate, nodeIntegration stays off). Preload always resolves to `out/preload/index.mjs` via `app.getAppPath()`.
- **Dev-only:** dock icon on macOS in dev is explicitly set to a distinct `emdash-dev.png` (`app.dock?.setIcon`), wrapped in try/catch with a warning log on failure.
- **`applyNativeTheme(theme)`:** on Windows only, sets `nativeTheme.themeSource` to `'dark'|'light'|'system'` based on the app's theme setting (`emdark`/`emlight`/null) — this is the native OS-chrome dark mode hook, distinct from the in-app CSS theme system.
- **Webview attachment hardening:** `will-attach-webview` validates the attach against a registered-partitions allowlist (`validateBrowserWebviewAttach`), denies and logs a warning if invalid, otherwise hardens `webPreferences` and strips params before attach; `did-attach-webview` verifies the resulting webContents against the browser registry and logs a warning if it can't be matched.

## Dock / Tray / Badge

- **No dock bounce, no dock badge count.** Grepped for `setBadgeCount`/dock-bounce across `src/main` and `src/core` — the only dock API usage found is the dev-mode icon swap above. There is no unread/attention badge on the macOS dock icon or Windows taskbar.
- **Tray (`src/main/host/tray.ts`) is opt-in, driven by a setting:** `InterfaceSettings.showTrayIcon` (see Themes/Settings section) is read at boot (`appSettingsService.get('interface')`) and piped into `setTrayVisible()`.
  - macOS: template image built from two explicit DPI representations (`trayTemplate.png` / `trayTemplate@2x.png`) since production asset filenames are hashed and break Electron's automatic `@2x` lookup; `setTemplateImage(true)` so macOS renders it correctly for light/dark menu bars.
  - Non-mac: a resized 20×20 icon (dev/canary/stable icon variants) is used, and the tray itself responds to a left-`click` by calling `showMainWindow()` (macOS relies on the context menu instead, since left-click there normally just opens the menu).
  - Context menu: **"Open {ProductName}"** (calls `showMainWindow()`) and a separator, then **"Quit {ProductName}"** (`app.quit()`).
  - `setTrayVisible(false)` destroys the tray instance entirely (not just hides it).

## Application menu (src/main/host/menu.ts)

Native menu, rebuilt via `setupApplicationMenu()`; accelerators are resolved per-platform from the shared command catalog (`resolveEffectiveChord` against `MENU_ITEMS`, currently `app.settings`, `workbench.tabClose`, `app.commandPalette`) so the menu always reflects the user's custom keybindings.

| Menu | Item | Accelerator | Action |
|---|---|---|---|
| **{App name}** (mac only) | About {App name} | — | `app.showAboutPanel()` |
| | Settings… | Cmd+, (customizable) | emits `app.settings` command |
| | Check for Updates… | — | emits `menu-check-for-updates` |
| | Services / Hide / Hide Others / Unhide | (OS roles) | native roles |
| | Quit {App name} | Cmd+Q | `app.quit()` |
| **File** | Settings… (non-mac only, moved here) | Ctrl+, | emits `app.settings` |
| | Close Tab (mac) | Cmd+W (customizable) | emits `workbench.tabClose` |
| | Quit (non-mac) | Ctrl+Q | `app.quit()` |
| **Edit** | Undo | Cmd/Ctrl+Z | emits `menu-undo` |
| | Redo | Shift+Cmd+Z (mac) / Ctrl+Y (other) | emits `menu-redo` |
| | Cut / Copy / Paste / (Paste and Match Style, mac only) / Delete / Select All | native | native roles |
| **View** | Reload / Force Reload / Toggle Developer Tools | native | native roles |
| | Command Palette… | Cmd/Ctrl+K (customizable) | emits `app.commandPalette` |
| | Reset Zoom / Zoom In / Zoom Out | native | native roles — **this is the only zoom control in the app**; no in-app zoom setting exists |
| | Toggle Full Screen | native | native role |
| **Window** | (native `windowMenu` role) | — | OS-provided |
| **Help** | Check for Updates… (non-mac only, moved here) | — | emits `menu-check-for-updates` |
| | Docs | — | opens `EMDASH_DOCS_URL` externally |
| | Changelog | — | opens `EMDASH_RELEASES_URL` externally |
| | Troubleshooting ▸ Report Issue… | — | opens `EMDASH_ISSUES_NEW_URL` externally |
| | Troubleshooting ▸ Copy Installation ID | — | copies `Emdash {version}\nInstallation ID: {id}\nPlatform: {platform} {arch}\nElectron: {electronVersion}` to clipboard |
| | Give Feedback | — | emits `app.giveFeedback` command (opens feedback modal) |

All non-native-role clicks are dispatched as a `menu-command` desktop-host event; the renderer (`app-menu-events.tsx`) resolves it against `COMMAND_CATALOG`, looks up the currently-bound (view-scoped) command implementation, and executes it — with a one-`requestAnimationFrame` retry if no binding is active yet (logging a dev-only console warning if it still fails).

## Protocol / deep links (src/main/host/protocol.ts)

- Registers a **privileged custom scheme `app://`** (`app://emdash`) as the renderer's origin — `standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, codeCache: true` (the last lets Chromium cache compiled JS across relaunches).
- `setupAppProtocol` serves files from the packaged `out/renderer` directory, path-traversal-guarded (`resolved.startsWith(root + sep)` check, 403 otherwise), and falls back to `index.html` (SPA-style) on any fetch failure.
- **No OS-level deep link / custom URL scheme is registered** (`setAsDefaultProtocolClient` and `open-url` do not appear anywhere in the app). The `app://` scheme above is purely an internal renderer-origin scheme, not an OS-wide handler. There is no "open with Emdash" file association either.

## Single instance / activation (src/main/bootstrap/boot/phases/prepare-electron.ts)

- **Single-instance lock is enforced only outside dev** (`!config.isDev && !app.requestSingleInstanceLock()`) — a second launch quits immediately with a `BootAborted('Another application instance is already running')` boot error.
- `second-instance` event: if the window phase has finished booting, focuses/restores the existing window via `showMainWindow()`.
- `activate` (macOS dock icon click when no windows are open): same `showMainWindow()` behavior, gated on the window phase being ready.
- `window-all-closed`: explicit **no-op** — the app is deliberately kept alive (available from the tray) when its only window is closed; quitting only happens through the explicit quit/before-quit flow.
- `showMainWindow()`: restores if minimized, shows, and steals focus (`app.focus({ steal: true })` on macOS, plain `app.focus()` elsewhere), then calls `.focus()` on the window itself.

## Quit confirmation & shutdown lifecycle

This is a full two-process, event-driven handshake — not a single `beforeunload` dialog.

**Main-process coordinator** (`src/main/bootstrap/shutdown/coordinator.ts`), states `idle → confirming → shutting-down`:
1. On a quit request, if an update install was requested, confirmation is skipped and shutdown proceeds directly.
2. Otherwise, if the renderer is currently "shutdown-capable" (i.e., its webContents is alive and has called `shutdownReady()`), the window is shown/focused and a `quit-confirmation-requested` event (with an `ActiveSessionSummary`) is emitted to the renderer, with a **60-second deadline** (`CONFIRMATION_DEADLINE_MS`) — if the renderer never answers, the coordinator logs a warning ("quit: renderer confirmation timed out, proceeding with shutdown") and treats it as confirmed anyway, so quitting is never permanently blocked by an unresponsive renderer.
3. Once confirmed, a `shutdown-started` event is emitted and the renderer has a **2-second flush deadline** (`FLUSH_DEADLINE_MS`) to `ackShutdownFlush()`.
4. `runCleanup()` then executes with an **8-second hard deadline** (`forceExit` timer) — if cleanup hangs, the coordinator logs "quit: hard deadline reached, forcing exit" and force-exits anyway.
5. Renderer navigation away (`did-start-loading`) or a renderer crash (`render-process-gone`) invalidates the "shutdown-capable" flag and settles any pending confirmation/flush as failed/skipped.

**Renderer side** (`src/renderer/app/app-shutdown-lifecycle.tsx`):
- On `quit-confirmation-requested`, it first checks `openFileStore.dirtyEntries()` (unsaved editor tabs / editable diffs). If any exist, it opens the **`quitUnsavedChangesModal`** with the dirty count; the user can save-all or discard-all.
  - If saving fails: toast **"Could not save all files"** / "Resolve any file conflicts and try quitting again." (error toast)
  - If resolving throws: toast **"Could not resolve unsaved files"** / "Your changes were kept. Try quitting again." (error toast)
- It then opens the generic **`confirmActionModal`** with title **"Quit Emdash?"** and a dynamically-built description via `describeShutdownImpact(summary)`:
  - Lists running local agent sessions (`acpSessions + localTuiSessions`) and terminals, e.g. *"3 running agent sessions and 2 terminals may be stopped."* (singular/plural handled)
  - If the summary was incomplete (couldn't fully enumerate), prefixes with **"At least "**.
  - If there's nothing local running, falls back to **"Background services and automations will stop."**
  - Appends a note about remote sessions continuing: *" 2 remote sessions will keep running."* (only shown when `remoteSessions > 0`)
  - Confirm button label: **"Quit"**.
- On confirmation, resolves back to main via `resolveQuitConfirmation`.
- On `shutdown-started`, flushes the memento (UI-state) client and acks; on success or failure it still acks (`finally`) so shutdown never hangs waiting on the renderer.
- **Shutdown overlay:** if shutdown takes longer than 500ms, a full-screen `role="alertdialog"` overlay appears: a spinner and the text **"Shutting down — stopping sessions and saving state…"**. It blocks all keyboard input (captured `keydown` listener with `preventDefault`/`stopPropagation`) so the user can't interact with a dying app.
- On `quit-confirmation-cancelled`, all passive modals are dismissed (`modalStore.dismissAll('passive')`).

## Crash recovery / safe mode (src/main/bootstrap/core/recovery.ts, src/main/host/recovery/)

If the main boot sequence throws, `enterSafeMode(error)` runs instead of a normal boot:
- Deliberately isolated from the DB/Wire/updater module graph so a failure in *those* systems can't also break recovery; the updater is loaded dynamically and recovery degrades gracefully (a warning is logged, "Update service unavailable in recovery mode") if that import itself fails.
- Opens a **separate, minimal recovery window** (560×480, `sandbox: true`, no preload — communication is entirely via intercepted `emdash-recovery://<action>` navigation URLs, since the scheme is deliberately left unregistered so `will-navigate` fires and can be `preventDefault()`-ed before Chromium tries to resolve it).
- Recovery page content (verbatim, `recovery.html`):
  - Title: **"Something went wrong"**
  - Body: *"Emdash could not finish starting. You can check for an update, restart Emdash, or open the logs for more information."*
  - Buttons: **"Check for updates"** (primary, cycles label through Check → Download update → Downloading… → Install and restart → Checking… per updater state), **"Restart Emdash"**, **"Open logs"**, **"Quit"**.
  - Collapsible **"Error details"** `<details>` block, auto-expanded whenever an error message is present, showing the raw error text in a `<pre>`.
  - Footer shows **"Version {app version}"**.
  - Status line text per updater state: *"Version {v} is available."* / *"Downloading update… {pct}%"* (with a visible `<progress>` bar) / *"Version {v} is ready to install."* / *"Checking for updates…"* / *"Installing update…"* / on error, the error message itself (or *"The update check failed."*) / idle fallback: *"Recovery mode is ready."* or, if the updater failed to load entirely, *"Automatic updates are unavailable in this build."*
- If even the recovery window itself fails to open, falls back to a native OS error dialog: **"Something went wrong"** / *"Emdash could not start or open recovery mode.\n\n{errorMessage}"*.
- The very last-resort fallback (if `enterSafeMode` itself throws) is another native dialog: **"Something went wrong"** / *"Emdash could not start recovery mode.\n\n{error}"*.
- Recovery actions: `check`/`download`/`install` drive the update service exactly as the main app would; `install` and `restart` both call `clearBootFailureMarker()` first (so the crash-loop guard doesn't immediately re-trigger recovery on the next launch); `open-logs` shows the log file in Finder/Explorer (`shell.showItemInFolder`) or opens the logs folder if no log file path is known; `quit` calls `app.quit()`.

## Boot splash & "taking too long" escape hatch (src/renderer/index.html, src/renderer/lib/boot/boot-splash.ts)

- A **static, inline HTML/CSS splash** (no React) is painted immediately, before any JS bundle executes: a small inline SVG "emdash" wordmark logo and a thin animated progress bar (bar slides back and forth continuously, revealed 240ms after a 1200ms delay).
- A pre-paint inline `<script>` reads `localStorage['emdash-theme']` synchronously and applies the `emlight`/`emdark` class plus matching background-color CSS custom properties *before* any stylesheet loads, so the very first frame (splash included) already matches the persisted theme rather than flashing white/black.
- If boot is detected as stuck (main-process "boot watchdog"), the escape hatch reveals: **"Emdash is taking longer than expected to start."** with two buttons: **"Restart Emdash"** and **"Open recovery"**, wired to `window.electronAPI.requestBootEscape('restart'|'open-recovery')` over a direct preload channel (not the Wire RPC layer, since a hung backend may never register controllers).
- `dismissBootSplash()` fades the splash out (`.boot-splash-done`, opacity transition) and removes it from the DOM on `transitionend`, with a 400ms fallback removal timer in case the transition never fires (e.g. reduced-motion, background tab).

## Auto-updater (src/main/host/updates/update-service.ts, electron-updater)

- `autoDownload: false`, `autoInstallOnAppQuit: true`, `autoRunAppAfterInstall: true`, `allowDowngrade: false`, `allowPrerelease` = true only on the **canary** build (`IS_CANARY`).
- Disabled entirely in dev (`import.meta.env.DEV` short-circuits `initialize()` after just resolving the current version).
- First automatic check fires **30 seconds** after startup (`STARTUP_DELAY_MS`); subsequent checks every **1 hour** (`CHECK_INTERVAL_MS`), rescheduled after every check regardless of outcome.
- State machine: `idle → checking → available → downloading → downloaded → installing`, with an `error` state that can be entered/exited at multiple points; `hasPendingUpdate` guards re-checks while a download/install is in flight.
- `quitAndInstall()`: sets state to `installing`, waits 250ms, then calls the native `autoUpdater.quitAndInstall(false, true)`. Guarded by a **2-minute timeout** (`INSTALL_RESTART_GUARD_TIMEOUT_MS`) that, if the app hasn't actually quit by then, rolls the state back to `downloaded` and logs "quitAndInstall timed out before app quit; allowing retry" — so a stuck install doesn't permanently strand the UI in "Installing…".
- `fetchReleaseNotes()`: prefers the release notes bundled in the update metadata; falls back to fetching `https://api.github.com/repos/generalaction/emdash/releases/tags/v{version}` directly and using the release body, defaulting to *"No release notes available"*.
- Emits typed update events (`checking`, `available`, `not-available`, `progress`, `downloaded`, `error`, `downloading`, `installing`) over `updateEvents`, consumed by both the renderer's `update-store.tsx` and the recovery window.

### Update toast (renderer, `src/core/features/updates/browser/update-store.tsx`)
When an update becomes available, a toast is shown (deduped per-version via `localStorage`, snoozed for `SNOOZE_HOURS` after being shown once for that version):
- Title: **"Update Available"**
- Description: *"Version {version} is available to download and install."*
- Duration: 10 seconds
- Action button: **"Update →"** (arrow-up-right icon) — navigates to Settings ▸ General and, if still in the `available` state, immediately starts the download.

## Notifications — master inventory

### System notification producers (main process → OS notification banner)
`src/core/services/notifications/node/producers/`:

| kind | groupKey / dedupeKey | Title | Body | Sound |
|---|---|---|---|---|
| `update-available` | `app-update` | Update available | `Emdash {version} is ready to download.` | none |
| `update-downloaded` | `app-update` | Update ready | `Emdash {version} has been downloaded and will install on restart.` | none |
| `update-error` | `app-update` | Update failed | `{error message}` | none |
| `agent-complete` | `conversation:{conversationId}` | `{providerName} - {taskName}` or just `{providerName}` | Your agent has finished working | `task_complete` |
| `agent-attention` | `conversation:{conversationId}` | `{providerName} - {taskName}` or just `{providerName}` | Your agent is waiting for input | `needs_attention` |

- `agent-complete` fires on the agent's `stop` event; `agent-attention` fires on an agent `notification` event whose `notificationType` is classified as attention-worthy (`isAttentionNotification`).
- **System delivery** (`system-notification-sink.ts`): built with `silent: true` (relies on the two named sound assets above rather than the OS default alert sound), deduped per `groupKey` (a new notification in the same group closes the previous banner first). Clicking a banner focuses/restores the app window and emits an "open" delivery event routed by `useRegisterNotificationOpenHandlers` in the renderer.
- Delivery is gated by `NotificationSettings`: `enabled` (master on/off), `sound` (on/off), `customSoundPath` (override for the built-in tones), `osNotifications` (native banners on/off), `soundFocusMode: 'always' | 'unfocused'` (only play sound when the window isn't focused).

### Toast inventory (renderer, sonner-based `toast` from `@emdash/ui`)
Toasts are the dominant feedback mechanism app-wide; ~130 call sites across ~54 files. `toast(title, opts)` is neutral (used for confirmations), `toast.error(...)` for failures, `toast.success`/`toast.warning`/`toast.info` exist but are rarely used directly (only `toast.success('Trace captured', …)` was found used explicitly; most positive feedback uses the neutral `toast(...)`), and `toast.promise(...)` wraps async flows with `loading/success/error` triplets. Default auto-dismiss ~4000ms (sonner default) unless a call passes `duration` (the update-available toast uses 10000ms; an upload-in-progress toast uses `Infinity` until dismissed).

Representative full inventory by area (title — description — where):
- **Quit/shutdown:** "Could not save all files" / "Resolve any file conflicts and try quitting again." · "Could not resolve unsaved files" / "Your changes were kept. Try quitting again." (`app-shutdown-lifecycle.tsx`)
- **Settings — executables/agents:** "Could not change executable" · "{Agent} successfully installed/updated" · "Failed to install/update {agent}" · "Permission denied" (agent install) · toast.promise for Refresh ("Refreshing installations…" → "Installations refreshed" / "Failed to refresh installations"), Check for updates, and Uninstall ("Uninstalling {name}…" → "{name} successfully uninstalled" / "Failed to uninstall {name}")
- **Settings — shortcuts:** "Shortcut is reserved" / "Shortcut conflict" (description: `Conflicts with "{title}". Choose a different shortcut.`) · "Shortcut updated" · "Shortcut reset" · "Shortcut removed"
- **Settings — GitHub/accounts:** "GitHub connection unsuccessful" / "Device flow was canceled" · "✓ Code copied" / "Paste it in GitHub to authorize" · "Copy failed" / "Please copy the code manually" · "Authentication Failed" · "Sign in failed" · "Sign out failed" · "Signed in to Emdash" · "Default {integration} account updated" · "{integration} account removed" · "Unable to update/remove default account"
- **Settings — browser data:** "Could not clear browsing data" · "Could not clear browser storage" · "Could not delete browser profile" · "{label} cleared"
- **Projects:** "Failed to relink Project" · "Invalid folder name" · "Could not create folder" · "Could not select folder" · "Invalid absolute path" · "Failed to check project" · "Team config shared" / ".emdash.json was written successfully." · "{migration.label} config imported"
- **Tasks:** "Could not copy browser URL" · "Could not archive task" · "Could not re-provision workspace" · "Could not delete task(s)" · "Copy failed" / "The branch name could not be copied to the clipboard." · "Could not retry the {script} script" · "Could not push the branch" · "Branch name copied"
- **Terminals:** "Failed to attach files" · "Uploading attachments…" (duration: Infinity, dismissed on completion)
- **MCP:** "Failed to save server" · "Failed to remove server" · "Failed to refresh MCP data"
- **Workspaces:** "Could not retry removal" / "Could not untrack workspace" · "N deleted, M failed" · "Could not delete workspaces" · "Could not clean artifacts" · "Removal already pending" / "No deletable workspaces" · "Deleted N workspaces" · "Queued artifact cleanup for {name}" · "Deleted {name}" · "Removal retrying" / "The removal runs again in the background." · "Workspace untracked"
- **Git / source control:** "Failed to initialize Git repository" · "Git repository initialized" · "Failed to stage/unstage/commit/push changes: {detail}" · "Failed to fetch/pull/push/publish: {detail}" · "Failed to refresh pull requests" · "Failed to merge pull request" / "Failed to merge without waiting" · "Could not update the checkout" · "Failed to mark pull request ready" / "Refresh PR status and try again."
- **Machines/remote:** "Failed to {start/stop} workspace server" · "Failed to check workspace server updates" · "Could not link/delete conversation" · "Failed to rename machine" · "Could not request/retry/disconnect a Machine connection" · "Failed to delete SSH connection" · "Failed to save host settings" · "Failed to update sync setting"
- **Theme/appearance:** "Theme not changed"
- **Dev/perf:** "Trace captured" (success) / "Trace capture failed" (error) · "Recording performance trace" / "Capturing 10 seconds…"
- **Drag & drop:** "Cannot add project" (multiple variants: inspect failure, "Drop a folder to add it as a project.", generic add failure) · "Projects added" / "{n} projects added."
- **Browser pane:** "Could not capture screenshot" · "Screenshot copied to clipboard" · "Could not clear browser data"
- **Feedback:** "Failed to send feedback" / "Please try again." · "Feedback sent" / "Thanks for your feedback!"
- **Links/clipboard:** "Copy failed" / "The link/PR URL could not be copied to the clipboard." · "Link copied" · "PR URL copied" · "Browser URL copied" · "Image URL copied" (from menu/link-copied events)
- **Editor file tree** (largest single cluster, ~20 toasts): "Import failed" (oversized file >10MB, duplicate destination name, generic) · "Reveal/Folder load/Refresh/Create/Rename/Move/Delete/Copy/Show failed" (each with `resultErrorMessage`) · "File created" · "Folder created" · "File/Folder renamed" · "Item moved" / "{n} items moved" · "File copied" · "Path copied" / "Relative path copied" · "Item cut" / "{n} items cut" · "Item copied" / "{n} items copied" · "Unsaved file kept open"
- **Skills:** "Install failed" · "Uninstall failed" · "Skill installed" / "{id} is now available across your agents" · "Skill removed" / "Skill has been uninstalled"
- **Automations:** "Could not open automation run" · "Could not delete automation" · "Automation created"
- **Conversations:** "Failed to kill session" · "Failed to export transcript" / "Open the chat before exporting it." · "N deleted, M failed" (bulk conversation delete) · "N conversations deleted" · "Exported {label}" · "Failed to attach file" / "{name} has no target Host path." · "Unsupported image format" / "Use PNG, JPEG, GIF, or WebP."
- **Integrations:** "Integration connected" / "Integration set up successfully." · "GitHub CLI accounts imported" · "Connected to GitHub"
- **Library:** onSuccess prompt-saved/deleted toasts, "Prompt deleted"
- **Sidebar drag-drop:** duplicate of the "Cannot add project" cluster above (`use-sidebar-drop.ts`)

## Renderer shell

### First-run flow (App.tsx)
`AppView = 'onboarding' | 'welcome' | 'workspace'`, gated by `localStorage['emdash:has-seen-onboarding:v1']`.
1. **Onboarding** (only shown if there's something to onboard): computed once, frozen so it can't shrink mid-flow — steps are `'sign-in'` (if not already signed in) and/or `'import'` (if legacy import sources exist and haven't been imported). If neither applies, onboarding is skipped entirely.
2. **Welcome screen** (`src/renderer/app/welcome.tsx`) — full-screen overlay (`fixed inset-0 z-50`) with a background image (`YTBanner`) masked to a gradient fade from the bottom, the Emdash icon in a small elevated card, heading **"Welcome."**, and a primary button **"Start shipping"** with a bound-shortcut hint for `app.confirm` (Mod+Enter, held 120ms — `SHORTCUT_PRESS_DURATION_MS` — with a visual press animation before firing, to avoid accidental double-triggers). Framer Motion staggers the elements in (0.3s stagger, 0.7s initial delay, 0.9s per-item ease).
3. **Workspace** — the main app.
- On Linux (frameless), `FramelessTitlebarOverlay` is mounted in every branch, including the loading state, so window controls/drag region are always available.

### Error boundary (src/renderer/error-boundary.tsx)
Class component wrapping the whole app.
- Fallback UI: **"Emdash couldn't display that view"** / *"Reload to try again with your saved layout."* with a primary **"Reload app"** button (RotateCw icon).
- A collapsible **"Error details"** section (chevron rotates on open) shows the raw `error.message` (or *"An unexpected error occurred."* if none) in a `<pre>` block.
- A second collapsible, **"Still having trouble?"**, offers a destructive **"Reset UI state and reload"** button, described as: *"Reset saved UI state to try a fresh layout. This clears layouts, navigation, project order, and unsent drafts. Projects, files, and saved conversations are kept."*
- Reload: flushes the memento (UI-state) client, then `window.location.reload()`. If either step fails: *"Could not reload the app. Try again."*
- Reset: **deletes all memento state first** (comment notes this must happen before deleting, "so beforeunload cannot restore it"), then reloads. If the reset itself fails: *"Could not reset UI state. Try again, or use Reload to restart the app."* (stays visible/retryable, doesn't auto-recover).

## Commands & keybindings — full catalog

Commands are defined with `defineCommand` across five feature slices and merged by `COMMAND_CATALOG` (`src/core/manifests/shared/command-catalog.ts`). Two keybinding kinds exist: `keybinding.fixed(chord, options)` (not user-customizable — used for a handful of universal keys like Escape and terminal-passthrough combos) and `keybinding.settings(settingsKey, defaultChord, options)` (stored per-user under `AppSettings.keyboard[settingsKey]`, fully customizable and conflict-checked in the Keyboard settings card). `Mod` resolves to Cmd on macOS and Ctrl on Windows/Linux (`chord.ts`, `resolveChordSpec`).

Keybinding `options` are enforcement flags, not remap targets: `ignoreWhenTextInputFocused`, `ignoreWhenEditorFocused`, `ignoreWhenBrowserFocused`, `allowWhenTerminalFocused`, `allowRepeat`.

### App / Window (`app.*`, workbench contributions)
| id | title | default (Mod=Cmd/Ctrl) | notes |
|---|---|---|---|
| `app.settings` | Open Settings | Mod+, | also in native menu |
| `app.newProject` | New Project | Mod+Shift+N | |
| `app.newTask` | New Task | Mod+N | optional `projectId` input |
| `app.giveFeedback` | Give Feedback | — | opens feedback modal |
| `app.toggleTheme` | Toggle Theme | — | |
| `app.navigateBack` | Go Back | Mod+[ | code-based (`BracketLeft`) |
| `app.navigateForward` | Go Forward | Mod+] | code-based (`BracketRight`) |
| `app.commandPalette` | Command Palette | Mod+K | also in native menu |
| `app.openInEditor` | Open in Editor | Mod+O | |
| `app.confirm` | Confirm | Mod+Enter | used on Welcome screen |
| `modal.close` | Close Modal | Escape | fixed |
| `workbench.toggleLeftSidebar` | Toggle Left Sidebar | Mod+B | |
| `workbench.zenMode` | Zen Mode | Ctrl+Z | hides both sidebars; ignored while editor/browser focused |

### Tabs / panes (`workbench.*`)
| id | title | default |
|---|---|---|
| `workbench.tabNext` | Next Tab | Mod+Alt+→ |
| `workbench.tabPrev` | Previous Tab | Mod+Alt+← |
| `workbench.tabClose` | Close Tab | Mod+W (also File-menu item on mac) |
| `workbench.tabReopen` | Reopen Closed Tab | Mod+Shift+T |
| `workbench.tabRename` | Rename Tab | Mod+Shift+R |
| `workbench.splitPane` | Split Pane | Mod+\ (code-based) |
| `workbench.tabCycleNext` | Cycle to Next Tab | Ctrl+Tab (fixed, works while terminal focused) |
| `workbench.tabCyclePrev` | Cycle to Previous Tab | Ctrl+Shift+Tab (fixed, works while terminal focused) |
| `workbench.tab1`…`workbench.tab9` | Open Tab 1–9 | Mod+1…Mod+9 (fixed) |

### Editor (`editor.*`)
| id | title | default |
|---|---|---|
| `editor.save` | Save File | Mod+S (fixed, ignored while browser pane focused) |
| `editor.saveAll` | Save All Files | Mod+Shift+S (fixed, ignored while browser pane focused) |
| `editor.fileTree.rename` | Rename File Tree Item | Mod+Shift+R |
| `editor.fileTree.cut` | Cut File Tree Items | Mod+X |
| `editor.fileTree.copy` | Copy File Tree Items | Mod+C |
| `editor.fileTree.paste` | Paste File Tree Items | Mod+V |
| `editor.fileTree.delete` | Delete File Tree Items | Mod+Backspace |

(All five file-tree commands ignore key events while a text input is focused.)

### Terminal (`terminal.*`)
| id | title | default |
|---|---|---|
| `terminal.find` | Find in Terminal | Mod+F (fixed, works while terminal focused) |
| `terminalSearch.close` | Close Terminal Search | Escape (fixed) |

### Settings
| id | title | default |
|---|---|---|
| `settings.close` | Close Settings | Escape (fixed) |

### Task / conversation (`task.*`)
| id | title | default |
|---|---|---|
| `task.newConversation` | New Conversation | Mod+T |
| `task.newConversationSplitRight` | New Conversation in Right Split | Mod+D |
| `task.sidebarChanges` | View Changes | Mod+Shift+1 |
| `task.sidebarConversations` | View Conversations | Mod+Shift+3 |
| `task.sidebarFiles` | View Files | Mod+Shift+2 |
| `task.fileContentSearch` | Search File Contents | Mod+Shift+F (works while terminal focused) |
| `task.viewTerminals` | View Terminals | — |
| `task.toggleTerminalDrawer` | Toggle Terminal Drawer | Mod+J |
| `task.toggleRightSidebar` | Toggle Right Sidebar | Mod+. |
| `task.newTerminal` | New Terminal | Mod+Shift+\` |
| `task.openBrowser` | Open Browser | Mod+Shift+B |
| `task.browserGoBack` / `task.browserGoForward` / `task.browserReload` / `task.browserFocusUrl` / `task.browserOpenExternal` | Browser Back/Forward/Reload/Focus URL/Open Externally | — (toolbar only, no default keys) |
| `task.browserCopyUrl` | Copy Browser URL | Mod+Shift+C |
| `task.gitFetch` / `task.gitPull` / `task.gitPush` | Git Fetch/Pull/Push | — |
| `task.pin` | Pin Task | — |
| `task.archive` | Archive Task | Mod+Shift+E (ignored while editor focused) |
| `task.convertAutomation` | Convert to Regular Task | — |
| `task.nextTask` / `task.prevTask` | Next/Previous Task | Mod+Alt+↓ / Mod+Alt+↑ (ignored while editor focused) |
| `task.deleteSelected` | Delete Selected Tasks | Mod+Backspace (ignored while text input focused) |

### Developer (`devPerf.*`, dev-only surfacing)
| id | title | default |
|---|---|---|
| `devPerf.processPanel` | Open Process Panel | — ("Show live CPU and memory usage for every emdash process") |
| `devPerf.captureTrace` | Capture Performance Trace | — ("Record a 10-second contentTracing trace to a file") — feeds the "Trace captured"/"Trace capture failed" toasts above |

### Not user-customizable, always active
`system.hide` (`Mod+H`, macOS Hide) is registered as a synthetic reserved entry purely so the keyboard settings conflict-checker knows not to let a user rebind something onto it.

### Keybinding customization UI (Settings ▸ Keyboard, `KeyboardSettingsCard.tsx`)
- Every command with a `keybinding.settings(...)` entry is listed, grouped by view scope.
- Live conflict detection (`findConflicts`) against all other bound commands *and* the reserved `system.hide` entry.
- Rebinding a shortcut that's reserved shows toast **"Shortcut is reserved"**; a conflict with another command shows **"Shortcut conflict"** / *"Conflicts with "{other command title}". Choose a different shortcut."*
- Successful rebind: toast **"Shortcut updated"**. Reset-to-default: toast **"Shortcut reset"**. Clear/remove: toast **"Shortcut removed"**.
- A dedicated chord recorder (`useChordRecorder`) and a US-keyboard-layout code map (`CODE_TO_US_CHAR`) back the capture UI.

## Modals & views (contributions/browser.ts across slices)

Aggregated in `src/core/manifests/browser/browser-contributions.ts`. Full modal list (25) by owning slice:

- **Conversations:** Create Conversation modal
- **Dev-perf:** Dev Process Panel modal (CPU/memory live view)
- **Editor:** Conflict dialog (file changed on disk while editing)
- **Integrations:** Integration Setup modal
- **Library:** Prompt modal (prompt library)
- **Machines:** Add Machine modal, Link Conversation modal
- **Projects:** Add Project modal, Share Project Config modal, Project Config Import modal, Directory Selector modal, Relink Project modal, Rename Project modal
- **Settings:** Agent Sign-In modal, GitHub Device Flow modal
- **Skills:** Create Skill modal, Skill Detail modal
- **Source control:** Create PR modal
- **Tasks:** Create Task modal, Rename Task modal, Add Remote modal, Delete Task modal
- **Workbench** (the generic/cross-cutting ones): **Command Palette** modal, generic **Confirm Action** dialog (reused for Quit, deletes, etc.), **Confirm External Link** dialog (choice before opening an external URL), **Feedback** modal, **Quit Unsaved Changes** dialog, generic **Unsaved Changes** dialog

Views (full-page, not modal) contributed the same way: Workbench Home view, Automations view, Projects view, Settings view, Tasks view.

## Themes & appearance

- **Theme manifest** (`packages/theme/src/themes/registry.ts`) defines four theme entries — **Light**, **Dark**, **Solarized Light**, **Solarized Dark** — each with a `polarity` (light/dark) and a CSS selector class (`.emlight`, `.emdark`, `.emsolarized-light`, `.emsolarized-dark`). However, the *app-level* `Theme` type (`app-settings/api/app-settings.ts`) only accepts `'emlight' | 'emdark' | null` — the Solarized variants exist in the shared `@emdash/theme` package (used for e.g. syntax highlighting / chat markdown) but are **not selectable as the whole-app theme**.
- **Settings ▸ Appearance (`ThemeCard.tsx`)** offers exactly three cards, each a `SelectableCard` with an icon and telemetry (`setting_changed` captured on every change):
  - **System** (Monitor icon, value `null`) — follows `prefers-color-scheme`.
  - **Emdash Light** (Sun icon, value `'emlight'`)
  - **Emdash Dark** (Moon icon, value `'emdark'`)
- Theme resolution: `effectiveTheme = theme ?? systemTheme`, where system theme is read live via `matchMedia('(prefers-color-scheme: dark)')` and kept in sync with a `useSyncExternalStore` subscription (so the app follows OS theme changes in real time when set to System).
- The chosen theme class is written to both `<html>` (`classList`) and `localStorage['emdash-theme']` (used only as a pre-paint cache to avoid a flash on next launch — the persisted `AppSettings` value remains authoritative).
- On **Windows only**, `applyNativeTheme()` also sets `nativeTheme.themeSource` so native OS chrome (non-client areas) matches.
- **Density:** the `@emdash/theme` package defines two density presets — **Comfortable** (default) and **Compact** (0.875× space scale, 0.85× radius scale) — but nothing in `src/core/features/settings` or the renderer references `densityId`/`setDensity`/`DENSITY_MANIFEST`. Density exists in the design-system layer but is **not exposed anywhere in the app's UI** — effectively dead/unused for end users.
- **Zoom:** no in-app zoom setting exists; the only zoom control is the native Electron `resetZoom`/`zoomIn`/`zoomOut` menu roles under View (standard Chromium page-zoom, OS keyboard shortcuts apply).
- **Font:** no app-wide font choice exists. The only font setting anywhere is `TerminalSettings.fontFamily`/`fontSize`, scoped strictly to the terminal panes.
- **Accent color:** no accent/highlight-color picker exists anywhere in settings.
- Toggling theme via the `app.toggleTheme` command or the settings cards can fail (e.g., settings write failure) — surfaces as toast **"Theme not changed"** with the underlying error as description.

## Related InterfaceSettings (relevant to shell behavior, `app-settings.ts`)
- `showTrayIcon: boolean` — drives tray visibility (see Dock/Tray above).
- `taskHoverAction: 'delete' | 'archive'` — not shell chrome per se, but affects a hover affordance.
- `autoRightSidebarBehavior`, `showLeftSidebarLineChanges`, `showLeftSidebarPrStatus`, `showLeftSidebarTimestamps`, `hideContextBar` — sidebar/chrome density toggles, not part of the theme system.

## Logging / diagnostics export (src/main/host/file-logger.ts)
- Pino-backed file logging to `{userData}/logs/emdash.log`, capped at 5MB with 5 retained rotated files; overridable via `EMDASH_LOG_FILE` env var.
- Every logged line is passed through `redactAll` (secret-pattern redaction) before being written — enforced centrally in the shared file transport, not per call site.
- **Diagnostics attachment** (`getDiagnosticLogAttachment`): used by the feedback flow — reads the last 500KB of the log file (trimmed to a line boundary), re-redacts it, and attaches it as `emdash-diagnostics.log`; falls back to the literal string `"No application logs were available."` if no log file exists yet.
- `registerProcessErrorLogging` installs global `uncaughtException`/(presumably `unhandledRejection`, truncated in the excerpt read) handlers that log via the shared logger.

## Platform differences (macOS / Windows / Linux) — summary
| Area | macOS | Windows | Linux |
|---|---|---|---|
| Window chrome | Hidden-inset native title bar, custom traffic-light position, `acceptFirstMouse` | Standard native frame, menu bar visible only via app menu roles (menu bar hidden by `setMenuBarVisibility(false)`) | **Frameless** (`frame: false`); renderer draws its own `FramelessTitlebarOverlay` window controls |
| Native theme sync | not applied | `nativeTheme.themeSource` set from app theme | not applied |
| Tray click | opens context menu only (no bound `click`) | left-click restores window | left-click restores window |
| App menu | Full app menu incl. app-name menu (About/Settings/Check for Updates/Quit) | Settings + Quit folded into File menu, Check for Updates folded into Help | same as Windows |
| Chromium flags | none | none | `ozone-platform-hint=auto`; forces `libsecret` password-store backend under certain env conditions (`shouldForceLibsecretBackend`) |
| Dev dock icon | explicit dev icon set via `app.dock?.setIcon` | n/a | n/a |

## Unverified / unclear
- Whether `registerProcessErrorLogging` also installs an `unhandledRejection` handler was not fully confirmed (file read was truncated at that point); treat as likely but unread.
- Whether density (Comfortable/Compact) is reachable through any hidden/dev-only UI path or feature flag was not exhaustively checked beyond a full-text grep for `densityId`/`setDensity`/`DENSITY_MANIFEST` in settings and renderer — it may still be wired through a path this grep missed (e.g. a Storybook-only surface), but there is no end-user-facing settings row for it.
- The exact wording/behavior of `toast.warning` and `toast.info` variants was not found in any call site — the app appears not to use these tones at all in current code (`toast.error`/bare `toast(...)`/`toast.success` cover essentially everything), despite the primitive supporting them.
- Windows/Linux taskbar "flash on notification" or `win.flashFrame()` behavior was not checked (not surfaced in any of the files read); likely absent given no dock-badge/bounce equivalent exists either, but not exhaustively grepped beyond the badge/bounce search.

## Coverage note
This pass covered: `src/main/host/` (window, menu, tray, protocol, recovery, updates, file-logger, chromium-command-line, notifications sink), `src/main/bootstrap/` (boot phases, shutdown coordinator, recovery, prepare-electron), `src/entry/main.ts`, the renderer shell (`App.tsx`, `welcome.tsx`, `error-boundary.tsx`, `app-shutdown-lifecycle.tsx`, `app-menu-events.tsx`, `index.html` boot splash), the full command catalog (all 5 `contributions/commands.ts` files plus `command-catalog.ts`/`menu-items.ts`), all `contributions/browser.ts` files for the modal/view catalog, the theme package (`packages/theme`) and app theme wiring, `NotificationSettings`/notification producers/sinks, and a near-exhaustive grep-driven sweep of every `toast(...)`/`toast.error/success/warning/info/promise(...)` call site across `apps/emdash-desktop/src` and `packages/**` (133 raw matches, all triaged). Not independently re-verified by running the app (read-only source audit only, per task scope). Deeper feature-specific modal/command *behavior* (as opposed to existence and title) is intentionally left to the slice-owning agents per the task's scope split.
