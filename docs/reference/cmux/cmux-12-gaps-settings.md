# Gaps found in settings, menus and dialogs

Audited prefixes: `settings`, `shortcut`/`shortcutDiscovery`, `menu`, `featureFlags`, `update`, `account`, `pricing`, `about`, `dialog`, `alert`, `onboarding` (0 strings exist), `mobile` (settings side only). 2,074 strings checked; grouped by setting/dialog/shortcut identity (611 distinct items) rather than by raw string, ~71% (435/611) were already represented in `cmux-06-settings-shortcuts.md` and the other `cmux-0*.md` files. The gaps below are the remaining ~29%, mostly exact error/empty-state copy, one previously-undocumented feature (an automation rules file + engine), a whole undocumented "Open Current Directory In…" menu, and ~70 keyboard-shortcut actions missing from the shortcuts inventory. `settings.search.*` (168 strings) is excluded throughout: it is search-index keyword metadata (`Sources/SettingsSearchAliases.swift`), never shown as UI text, so it is not a coverage gap.

## Menu

### "Open Current Directory In…" menu — entirely undocumented

Not mentioned anywhere in `cmux-0*.md`. Source: `Sources/App/TerminalDirectoryOpenSupport.swift` (951 lines), wired into `Sources/AppDelegate.swift`, `Sources/cmuxApp.swift`, `Sources/ContentView.swift`. A command-palette/menu family, one command per target app, that opens the focused surface's resolved working directory in an external app. Each target is a `TerminalDirectoryOpenTarget` case with a command-palette id `palette.terminalOpenDirectory.<case>`, availability gated on the app actually being installed (checked at fixed `/Applications` / `~/Applications` bundle paths first, then falling back to `NSWorkspace.fullPath(forApplication:)`), and per-target search keywords (`common: ["terminal","directory","open","ide"]` plus app-specific terms).

| Key | Label (verbatim) | Target app bundle(s) checked |
|---|---|---|
| `menu.openInAndroidStudio` | Open Current Directory in Android Studio | Android Studio.app |
| `menu.openInAntigravity` | Open Current Directory in Antigravity | Antigravity.app |
| `menu.openInCursor` | Open Current Directory in Cursor | Cursor.app, Cursor Preview.app, Cursor Nightly.app |
| `menu.openInDevin` | Open Current Directory in Devin | Devin.app |
| `menu.openInFinder` | Open Current Directory in Finder | /System/Library/CoreServices/Finder.app |
| `menu.openInGhostty` | Open Current Directory in Ghostty | Ghostty.app |
| `menu.openInITerm2` | Open Current Directory in iTerm2 | iTerm.app, iTerm2.app |
| `menu.openInIntelliJ` | Open Current Directory in IntelliJ IDEA | IntelliJ IDEA.app |
| `menu.openInTerminal` | Open Current Directory in Terminal | /System/Applications/Utilities/Terminal.app |
| `menu.openInTower` | Open Current Directory in Tower | Tower.app |
| `menu.openInVSCode` | Open Current Directory in VS Code (Inline) | Visual Studio Code.app / Code.app, plus requires an on-disk `code-tunnel` binary inside the bundle (`Contents/Resources/app/bin/code-tunnel`) — this is the only target with an extra availability check, since it opens inline via a code-server tunnel rather than launching the desktop app |
| `menu.openInVSCodeDesktop` | Open Current Directory in VS Code | Visual Studio Code.app / Code.app |
| `menu.openInWarp` | Open Current Directory in Warp | Warp.app |
| `menu.openInWindsurf` | Open Current Directory in Windsurf | Windsurf.app |
| `menu.openInXcode` | Open Current Directory in Xcode | Xcode.app |
| `menu.openInZed` | Open Current Directory in Zed | Zed.app, Zed Preview.app, Zed Nightly.app |

Edge case: an uninstalled target's command is simply absent from the palette/menu (no disabled/greyed entry) — `availableTargets(in:)` filters `allCases` down to installed apps before anything is shown.

## Settings

### Automation section — undocumented automation-rules engine

`cmux-06` documents the Automation section's toggles/pickers table but omits an entire rule-based automation feature reachable from that section. Source: `Sources/AutomationConfigStore.swift`, `Sources/AutomationEngine.swift`, `Sources/HostSettingsActions.swift`.

- Config file: `~/.cmuxterm/automations.json` (versioned JSON, `AutomationConfiguration`), deliberately kept outside `cmux.json` "so it's easy to diff, copy between machines, and edit without touching the GUI settings file."
- A rule = `id`, `enabled`, a `when` selector (`event` or `category`, at least one required) and 1–64 `actions` (`rpc` action needs a `method`; `run` action needs a `command`); limits: ≤512 rules, rule id ≤256 bytes, JSON file ≤4MB, ≤256 array items/object entries, JSON depth ≤12.
- `openAutomationRulesInExternalEditor()`: if the file doesn't exist yet, first writes an empty v1 configuration, then opens it in the user's preferred editor (`PreferredEditorService`); if the initial write fails, shows the error alert below instead of opening.
- `automationRulesStatus()` (async, off-main): reports `configPath`, `ruleCount`, `enabledCount`, `configExists`, and an error flag if the file failed to parse — this is presumably what the Automation section renders as a status line/count next to the "edit rules" action (exact label string not found in the TSV — likely a plain SwiftUI `Button` with no localized title, or uses `settings.automation.rules` under a key not in this dump).
- `reloadAutomationRules()`: routes a reload request to `TerminalController.shared.v2AutomationReload()`.
- CLI surface exists too (`cli.automation.output.noRules` = "No automation rules", `cli.automation.output.rule` = "%1$@ [%2$@] when %3$@") — not in scope here (CLI prefix), but confirms this is a real, shipped feature, not dead code.

| Key | Text (verbatim) | When shown |
|---|---|---|
| `settings.automation.rules.createFailed.title` | Could Not Create Automation Rules | `NSAlert` shown if creating the initial empty `automations.json` fails (folder not writable / disk full). |
| `settings.automation.rules.createFailed.message` | Check that the configuration folder is writable and the disk has free space, then try again. | Same alert, informative text. |

### Automation section — other missing copy

| Key | Text (verbatim) | Notes |
|---|---|---|
| `settings.automation.openAccessWarning` | Warning: Full open access makes the control socket world-readable/writable on this Mac and disables auth checks. Use only for local debugging. | Static inline warning label shown under Socket Control Mode when set to `allowAll` — distinct from the confirm dialog `settings.automation.openAccess.dialog.title`/`.confirm` ("Enable full open access?" / "Enable Full Open Access") that `cmux-06` already documents; this is the persistent label, the dialog is the one-time confirm. |
| `settings.automation.port.note` | Each workspace gets CMUX_PORT and CMUX_PORT_END env vars with a dedicated port range. New terminals inherit these values. | Note under Port Base/Port Range Size (`cmux-06` documents the two fields but not this note text). |
| `settings.automation.portBase.subtitle` | Starting port for CMUX_PORT env var. | Subtitle text under Port Base. |
| `settings.automation.portRange.subtitle` | Number of ports per workspace. | Subtitle text under Port Range Size. |
| `settings.automation.socketOverrides.note` | Overrides: CMUX_SOCKET_ENABLE, CMUX_SOCKET_MODE, and CMUX_SOCKET_PATH (set CMUX_ALLOW_SOCKET_OVERRIDE=1 for stable/nightly builds). | Note under Socket Control Mode. |

### Networking section — missing status/error copy

| Key | Text (verbatim) | Notes |
|---|---|---|
| `settings.networking.attention` | Your saved relay choice needs attention. Direct Iroh remains available, but cmux will not substitute an unselected relay. | Status text shown when the saved Relay Preference/Custom Relay can no longer be resolved. |
| `settings.networking.irx.notConfigurable` | This setting is not configurable with the current transport. | Disabled-control subtitle shown when a Networking control doesn't apply to the active transport (source: `Sources/Mobile/MobileHostIrxRuntime+SettingsControl.swift` — the "irx" prefix ties this to the Iroh transport runtime, not a mobile-only string despite the file path). |
| `settings.networking.saveFailed` | Could Not Save Networking Settings | Error alert title when writing Networking changes fails. |
| `settings.networking.saveFailed.message` | Your previous networking configuration is still active. Check your account connection and relay values, then try again. | Same alert, message. |

### Custom Sidebars section — missing error copy

| Key | Text (verbatim) |
|---|---|
| `settings.customSidebars.templateUnavailable` | Could not load the sidebar template. Reinstall cmux and try again. |
| `settings.customSidebars.writeFailed` | Could not create the sidebar. Check folder permissions and free disk space, then try again. |

Both are failure paths of the "new custom sidebar" creation flow that `cmux-06`'s Custom Sidebars section summary doesn't cover.

### Workspace Colors section — missing empty/note copy

`cmux-06` documents the section's controls but not this state/help copy:

| Key | Text (verbatim) |
|---|---|
| `settings.workspaceColors.base` | Base: %@ |
| `settings.workspaceColors.customEntry` | Named palette entry. |
| `settings.workspaceColors.dictionaryNote` | Edit cmux.json to add or remove named colors. "Choose Custom Color..." still adds local Custom N entries. |
| `settings.workspaceColors.emptyPalette` | No palette entries. Add colors in cmux.json or use "Choose Custom Color..." from a workspace context menu. |
| `settings.workspaceColors.indicator` | Workspace Color Indicator |
| `settings.workspaceColors.noCustomColors` | Custom colors: none yet. Use "Choose Custom Color..." from a workspace context menu. |
| `settings.workspaceColors.paletteNote` | Customize the workspace color palette used by Sidebar > Workspace Color. "Choose Custom Color..." entries are persisted below. |

### Sidebar Appearance section — missing label/subtitle

| Key | Text (verbatim) |
|---|---|
| `settings.sidebarAppearance.tintColorLight` | Light Mode Tint |
| `settings.sidebarAppearance.tintColorLight.picker` | Light tint |
| `settings.sidebarAppearance.tintColorLight.subtitle` | Sidebar tint color when using light appearance. |

(`cmux-06` mentions "Light/Dark Mode Tint color pickers" in prose but not this exact label set — the Dark-mode-tint counterpart key wasn't in the uncovered list, so only the Light-tint labels were missing verbatim.)

### cmux.json (Settings JSON) section — missing button label

| Key | Text (verbatim) |
|---|---|
| `settings.settingsJSON.docsButton` | Open Docs |

### Keyboard Shortcuts section — chord shortcuts sub-feature undocumented

| Key | Text (verbatim) |
|---|---|
| `settings.shortcuts.chords` | Shortcut Chords |
| `settings.shortcuts.chords.docsButton` | Chord docs |
| `settings.shortcuts.chords.subtitle` | Add tmux-style multi-step shortcuts in cmux.json, for example ["ctrl+b", "c"]. |

A row in the Keyboard Shortcuts section pointing at tmux-style multi-key chord bindings (e.g. `["ctrl+b", "c"]`) configured via `cmux.json`, with a "Chord docs" link button. `cmux-06`'s shortcuts section (around the `AllShortcutsPopover` description) doesn't mention chords at all.

### Reset section — button label

| Key | Text (verbatim) |
|---|---|
| `settings.reset.resetAll` | Reset All Settings |

`cmux-06`'s Reset section entry only cites `settings.section.reset` (the nav label) and paraphrases what it does; this is the actual button/action text. Source: `Sources/SettingsSearchIndex.swift:195`.

### Blend Mode / material system — two more option labels, still unreached from main nav

| Key | Text (verbatim) |
|---|---|
| `settings.blendMode.behindWindow` | Behind Window |
| `settings.blendMode.withinWindow` | Within Window |

These are `NSVisualEffectView.BlendingMode` option labels for the same window-chrome material/vibrancy system `cmux-06`'s "Themes, appearance, fonts, window chrome" section already flags as `settings.material.*`/`settings.preset.*` and marks **Unverified** (likely a debug/advanced surface, not confirmed reachable from the main Settings nav). Not found referenced in any `Sources/*.swift` grep outside the search-alias/string-catalog files, consistent with that existing Unverified note — filing alongside it rather than as a new surface.

### Sidebar follow-window state — likely a hidden/undocumented `cmux.json`-only or debug option

| Key | Text (verbatim) |
|---|---|
| `settings.state.followWindow` | Follow Window |

Backed by `SidebarStateOption.followWindow`, read from `UserDefaults` key `"sidebarState"` (`Sources/cmuxApp.swift`, `Sources/ContentView.swift`, `Sources/Windowing/AppWindowChromeComposition.swift`), not found wired to any visible Settings control in the grepped source — appears to be another debug/internal `@AppStorage` option, same category as the blend-mode entries above. **Unverified** as a user-reachable setting.

### Miscellaneous generic strings

| Key | Text (verbatim) | Where |
|---|---|---|
| `settings.common.ok` | OK | Generic OK button reused across Settings-window alerts. |
| `settings.error.alert.title` | Couldn't save setting | Generic title for a failed cmux.json write from any Settings control. |
| `settings.error.alert.dismiss` | OK | Dismiss button on that same alert. |
| `settings.configMutation.invalidCandidate` | The proposed config is invalid. No changes were saved. | Shown when a settings write is rejected by config validation (`JSONConfigStore` transaction layer). |
| `settings.configMutation.undoConflict` | Undo preserved a newer choice. Review this setting before changing it: | Shown when Cmd+Z on a settings change would clobber a newer edit made elsewhere (e.g. by an external `cmux.json` edit) — config-transaction conflict resolution, see `docs/config-transactions.md`. |
| `settings.fontSize.valuePoints` | %@ pt | Generic "N pt" value formatter reused by several font-size steppers (App/Sidebar/Markdown/TextBox sections). |
| `settings.window.runtimeUnavailable` | Settings could not load. Please restart cmux and report this issue. | Fallback body text shown instead of the whole Settings window if `AppDelegate.shared?.settingsRuntime` is nil when the window opens — a lifecycle-regression guard, "unreachable in a normally-launched app" per the source comment (`Sources/App/SettingsWindowFactory.swift:184`). |
| `settings.account.error.invalidCallback` | The sign-in callback was invalid. | Sign-in error, Account section. |
| `settings.account.error.missingAccessToken` | Account access token is unavailable. | Sign-in error, Account section. |
| `settings.account.error.missingRefreshToken` | Account refresh token is unavailable. | Sign-in error, Account section. |

## Dialogs

### Close-tab / close-pane / close-workspace / close-window confirmation family

`cmux-06` doesn't enumerate this whole confirm-dialog family, which covers every "closing this will lose work/ungroup/close more than you clicked" case in the tab/pane/workspace hierarchy:

| Key | Text (verbatim) | Trigger |
|---|---|---|
| `dialog.closeAnchor.title` | Close this workspace? | Closing a workspace that is the anchor of a group. |
| `dialog.closeAnchor.message.lone` | Closing this workspace will remove the group "%@". | Anchor with no other members. |
| `dialog.closeAnchor.message.one` | Closing this workspace will ungroup "%@" and release 1 other workspace. | Anchor with exactly one other member. |
| `dialog.closeAnchor.message.many` | Closing this workspace will ungroup "%1$@" and release %#@count2@. | Anchor with several other members (plural-formatted count). |
| `dialog.closeLastTabWindow.message` | This will close the last tab and close the window. | Closing the only remaining tab in a window. |
| `dialog.closeLastTabWorkspace.message` | This will close the last tab and close its workspace. | Closing the only remaining tab in a workspace. |
| `dialog.closeOtherTabs.title` | Close other tabs? | "Close Other Tabs" context-menu action. |
| `dialog.closeOtherTabs.message.one` | This will close 1 tab in this pane: | Exactly one other tab. |
| `dialog.closeOtherTabs.message.other` | one: This will close %1$lld tab in this pane: ⏎ %2$@ / other: This will close %1$lld tabs in this pane: ⏎ %2$@ | Plural form, English picked by count. |
| `dialog.closePane.title` | Close pane? | Closing a pane with multiple tabs. |
| `dialog.closePane.message.one` | This will close 1 tab in this pane: | Singular. |
| `dialog.closePane.message.other` | one: This will close %1$lld tab in this pane: ⏎ %2$@ / other: This will close %1$lld tabs in this pane: ⏎ %2$@ | Plural form, English picked by count. |
| `dialog.closePinnedWorkspace.title` | Close pinned workspace? | Closing a pinned workspace. |
| `dialog.closePinnedWorkspace.message` | This workspace is pinned. Closing it will close the workspace and all of its panels. | Same dialog, body. |
| `dialog.closeWindow.title` | Close window? | Closing a window with multiple workspaces open. |
| `dialog.closeWindow.message` | This will close the current window and all of its workspaces. | Same dialog, body. |
| `dialog.closeWorkspace.title` | Close workspace? | Baseline single-workspace close confirm. |
| `dialog.closeWorkspace.message` | This will close the workspace and all of its panels. | Same dialog, body. |
| `dialog.closeWorkspaces.title` | Close workspaces? | Closing multiple selected workspaces at once. |
| `dialog.closeWorkspaces.message` | one: This will close %1$lld workspace and all of its panels: ⏎ %2$@ / other: This will close %1$lld workspaces and all of their panels: ⏎ %2$@ | Plural form, English picked by count. |
| `dialog.closeWorkspacesWindow.message` | one: This will close the current window, its %1$lld workspace, and all of its panels: ⏎ %2$@ / other: This will close the current window, its %1$lld workspaces, and all of their panels: ⏎ %2$@ | Plural form, English picked by count. |
| `dialog.closeTab.title` | Close tab? | (Present, for completeness of the family — already appears covered elsewhere in the catalog set via `dialog.closeTab.message`/`.messageNamed`.) |

Note: the multi-item messages in this family are plural forms (one/other), so the English shown depends on the count.

### Other standalone dialogs

| Key | Text (verbatim) | Trigger |
|---|---|---|
| `dialog.defaultTerminal.setFailed.title` | Could Not Set Default Terminal | Failure path of the App section's "Default Terminal" button (`cmux-06` documents the success/confirm flow but not this failure alert). |
| `dialog.dontAskAgain` | Don't ask again | Checkbox reused across multiple confirm dialogs. |
| `dialog.dontWarnCmdQ` | Don't warn again for Cmd+Q | Checkbox on the Cmd+Q confirm-quit dialog (ties to `settings.app.confirmQuit.*`, already documented — this is the in-dialog opt-out checkbox text specifically). |
| `dialog.moveFailed.title` | Move Failed | Failure moving a tab to a drag-drop destination. |
| `dialog.moveFailed.message` | cmux could not move this tab to the selected destination. | Same dialog, body. |
| `dialog.newWorkspaceDefault.failedTitle` | Couldn't Update Default | Failure saving a "set as default new-workspace behavior" choice (ties to `settings.app.newWorkspacePlacement`/`forkConversationDefaultDestination`-style defaults). |
| `dialog.simulatorCameraCleanupFailed.title` | Couldn't Finish Simulator Cleanup | Shown on Quit if cmux can't restore an iOS Simulator's camera permission state on exit. |
| `dialog.simulatorCameraCleanupFailed.message` | cmux stayed open because it could not restore a Simulator app's camera state. Quit again to retry cleanup. | Same dialog, body — notable because **quitting is blocked** (app stays open) until cleanup succeeds or the user quits a second time. |

### Generic

| Key | Text (verbatim) |
|---|---|
| `alert.ok` | OK |

## Update

`cmux-06`'s update/Sparkle section covers the main check/download/install states but is missing three progress sub-states:

| Key | Text (verbatim) | State |
|---|---|---|
| `update.preparingCheck` | Preparing Update Check… | Before the check request is sent, if a previous update session hasn't finished yet. |
| `update.preparingCheck.message` | Waiting for the current update session to finish | Same state, detail line. |
| `update.startingDownload` | Starting Download… | Between "update found" and the download progress bar actually starting. |
| `update.startingDownload.message` | Starting the update download | Same state, detail line. |
| `update.downloadingPackage` | Downloading the update package | Download-in-progress detail line (distinct from a numeric progress state already covered elsewhere). |

## Pricing

| Key | Text (verbatim) | Where |
|---|---|---|
| `pricing.subtitle` | cmux is free and open source, and always will be. Pro adds the cloud. | Subhead on the pricing surface, above the plan cards. |
| `pricing.perUserMonth` | /user/month | Suffix appended to the Pro plan's price. |
| `pricing.footnote` | One click with your cmux account. Cancel anytime. | Footnote under the upgrade CTA. |

## Feature flags

| Key | Text (verbatim) |
|---|---|
| `featureFlags.value.on` | On |
| `featureFlags.value.off` | Off |

Generic On/Off value labels for whatever feature-flag debug list surfaces `featureFlags.*` (the flags themselves are documented elsewhere in the catalog set; this is just the shared value-formatter pair).

## Shortcuts

~70 keyboard-shortcut actions exist in `Sources/KeyboardShortcutSettings.swift` (the `ShortcutAction` enum, `shortcut.<id>.label` keys) that aren't named in `cmux-06`'s shortcuts table. Defaults below are pulled from `web/data/cmux-shortcuts.ts` where present; "unbound by default" means the action exists and is user-bindable but ships with no default combo (would show the "Unassigned" tag `cmux-06` already describes for the `AllShortcutsPopover`).

| Key | Label (verbatim) | Default combo |
|---|---|---|
| `shortcut.canvasZoomIn.label` | Canvas: Zoom In | ⌥⌘= |
| `shortcut.canvasZoomOut.label` | Canvas: Zoom Out | ⌥⌘- |
| `shortcut.canvasAlignBottom.label` | Canvas: Align Bottom Edges | unbound by default |
| `shortcut.canvasAlignLeft.label` | Canvas: Align Left Edges | unbound by default |
| `shortcut.canvasAlignRight.label` | Canvas: Align Right Edges | unbound by default |
| `shortcut.canvasAlignTop.label` | Canvas: Align Top Edges | unbound by default |
| `shortcut.canvasDistributeHorizontally.label` | Canvas: Distribute Horizontally | unbound by default |
| `shortcut.canvasDistributeVertically.label` | Canvas: Distribute Vertically | unbound by default |
| `shortcut.canvasEqualizeHeights.label` | Canvas: Equalize Heights | unbound by default |
| `shortcut.canvasEqualizeWidths.label` | Canvas: Equalize Widths | unbound by default |
| `shortcut.commandPaletteNext.label` | (command palette: select next result) | ⌃N |
| `shortcut.commandPalettePrevious.label` | (command palette: select previous result) | ⌃P |
| `shortcut.focusNextPane.label` | Focus next pane (cycle) | unbound by default |
| `shortcut.focusPreviousPane.label` | Focus previous pane (cycle) | unbound by default |
| `shortcut.focusPaneUp.label` / `.focusPaneDown.label` / `.focusPaneRight.label` | Focus pane above/below/right (directional pane focus; a `focusPaneLeft` counterpart is presumably covered already since it wasn't in the uncovered set) | unbound by default |
| `shortcut.focusRightSidebar.label` | Toggle right-sidebar focus | ⌘⇧E |
| `shortcut.resizePaneDown.label` / `.resizePaneRight.label` | Resize pane down/right | unbound by default |
| `shortcut.nextSurface.label` | Next surface | ⌘⇧] |
| `shortcut.nextWorkspace.label` | (next workspace — counterpart to a previous-workspace shortcut) | not resolved in `cmux-shortcuts.ts` |
| `shortcut.nextWorkspaceInGroup.label` | (cycle to next workspace within its group) | not resolved |
| `shortcut.moveWorkspaceDown.label` | Move workspace down | ⌃⌥⌘] |
| `shortcut.moveSurfaceRight.label` | (move surface to the pane on the right) | ⌥⌘⇧→-family combo |
| `shortcut.moveSurfaceToNextPane.label` / `.moveSurfaceToPreviousPane.label` | Move surface to next/previous pane (cycle) | ⌃⌘⇧]/⌃⌘⇧[ |
| `shortcut.moveSurfaceToPaneUp.label` / `.moveSurfaceToPaneDown.label` / `.moveSurfaceToPaneLeft.label` / `.moveSurfaceToPaneRight.label` | Move surface to pane above/below/left/right | ⌥⌘⇧+arrow |
| `shortcut.increaseWorkspaceTerminalFontSize.label` | Increase font size for every terminal in the selected workspace | ⌃⌘= |
| `shortcut.decreaseWorkspaceTerminalFontSize.label` | Decrease font size for every terminal in the selected workspace | ⌃⌘- |
| `shortcut.resetWorkspaceTerminalFontSize.label` | Reset font size for every terminal in the selected workspace | ⌃⌘0 |
| `shortcut.resetWorkspaceColor.label` | Reset workspace color to default | unbound by default |
| `shortcut.setWorkspaceColorRed.label` / `Orange` / `Amber` / `Olive` / `Green` / `Teal` / `Aqua` / `Blue` / `Crimson` | Set workspace color to <name> — nine direct-assignment shortcuts, one per built-in palette color (ties to the Workspace Colors palette documented above) | unbound by default |
| `shortcut.toggleChecklistItemComplete.label` | (toggle a workspace checklist item's completion state) | ⌘↩ |
| `shortcut.toggleFocusedWorkspaceGroupCollapsed.label` | (collapse/expand the focused workspace group in the sidebar) | ⌃⌘. |
| `shortcut.fileExplorerOpenSelection.label` | (open the selected item in the file explorer) | ↩ |
| `shortcut.fileExplorerOpenSelectionFinderAlias.label` | (same action, Finder-style alias binding) | ⌘↓ |
| `shortcut.showBrowserJSConsole.label` | (open the embedded browser's JS console) | not resolved |
| `shortcut.toggleBrowserDevTools.label` | (toggle embedded-browser DevTools) | not resolved |
| `shortcut.markdownZoomIn.label` / `.markdownZoomOut.label` / `.markdownZoomReset.label` | Markdown Viewer: Zoom In / Out / Reset | ⌘= / ⌘- / ⌘0 |
| `shortcut.diffViewerScrollUp.label` / `.diffViewerScrollDown.label` | Viewer scroll up/down (vim-style) | K / J |
| `shortcut.diffViewerScrollUpEmacs.label` / `.diffViewerScrollDownEmacs.label` | Viewer scroll up/down (Emacs-style) | ⌃P / ⌃N |
| `shortcut.diffViewerScrollHalfPageUp.label` / `.diffViewerScrollHalfPageDown.label` | Viewers: Scroll Half Page Up/Down | ⌃U / ⌃D |
| `shortcut.diffViewerScrollToTop.label` / `.diffViewerScrollToBottom.label` | Scroll to top/bottom of viewer (vim `gg` / `G`) | GG / ⇧G |
| `shortcut.diffViewerNextFile.label` / `.diffViewerPreviousFile.label` | Next/previous file in diff viewer | ] / [F-style |
| `shortcut.diffViewerOpenFileSearch.label` | Open file search within diff viewer | / |
| `shortcut.switchRightSidebarToDock.label` / `.ToFeed.label` / `.ToFiles.label` / `.ToFind.label` / `.ToMachines.label` | Switch right sidebar to the Dock/Feed/Files/Find/Machines tab directly (ties to the Right Sidebar Tabs setting and its documented ⌃1–⌃9 order-following shortcuts, but these are named per-tab jumps, not the numbered ones) | not resolved |
| `shortcut.simulatorRotateLeft.label` / `.simulatorRotateRight.label` | Simulator: rotate left/right | ⌘← / ⌘→ |
| `shortcut.simulatorToggleAppearance.label` | Simulator: toggle light/dark appearance | ⌘⇧A |
| `shortcut.simulatorToggleSoftwareKeyboard.label` | Simulator: toggle software keyboard | ⌘K |
| `shortcut.key.mediaPlayPause` / `.mediaNext` / `.mediaPrevious` / `.mediaVolumeUp` / `.mediaVolumeDown` / `.mediaBrightnessUp` / `.mediaBrightnessDown` / `.tab` | Key-cap display names for media/function keys and Tab, used when rendering a bound shortcut's key-cap chip in the recorder/popover. |

### Shortcut recorder — validation states not documented

`cmux-06` doesn't describe the shortcut recorder's own error states. Source: `Sources/KeyboardShortcutSettings.swift`.

| Key | Text (verbatim / paraphrased) |
|---|---|
| `shortcut.pressShortcut.prompt` | Prompt shown while the recorder is capturing a new key combo. |
| `shortcut.recorder.pendingChord` | State while the first key of a multi-step chord has been captured and the recorder is waiting for the next key. |
| `shortcut.recorder.error.bareKeyNotAllowed` | Rejects a binding with no modifier key (a bare letter/number) outside contexts that explicitly allow it. |
| `shortcut.recorder.error.reservedBySystem` | Rejects a combo macOS reserves system-wide. |
| `shortcut.recorder.error.conflictsWithAction` | Rejects a combo already bound to a different action. |
| `shortcut.recorder.error.conflictsWithAction.swap` | Same conflict, but offers to swap the binding to the new action instead of just rejecting. |
| `shortcut.recorder.error.numberedShortcutRequiresDigit` | For actions in a numbered family (e.g. the ⌃1–⌃9 sidebar-tab jumps), rejects a non-digit final key. |
| `shortcut.recorder.error.systemWideHotkeyRequiresModifier` | Specific to the Global Hotkey recorder (`cmux-06`'s Global Hotkey section) — requires Command/Option/Control plus another key. |
| `shortcut.recorder.clear.help` | Help text for the recorder's "clear binding" control. |
| `shortcut.recorder.restore.help` | Help text for the recorder's "restore default" control. |

### Shortcut "when" context captions

`shortcut.when.caption.*` — caption strings naming the focus context a shortcut is scoped to, shown in the `AllShortcutsPopover`/settings shortcuts list next to context-scoped bindings: `browserFocus`, `browserOrFilePreviewTextEditorFocus`, `filePreviewTextEditorFocus`, `markdownFocus`, `sidebarFocus`, `simulatorFocus`, `terminalFocus`, and `override` (a binding that overrides the global default only in a specific context).

## Mobile (settings side)

`mobile.pairing.*` (the Settings > Mobile section and the "Pair your iPhone" window/QR flow) is already fully covered in `cmux-06`'s Mobile section table — no gap found there.

The other `mobile.*` subprefixes present in the string dump (`mobile.chat.*`, `mobile.panel.*`, `mobile.terminal.*`, `mobile.workspaceChanges.*`, `mobile.taskComposer.*` — ~74 strings) are server-side error responses returned to the iOS companion app over its API (file/artifact/terminal/diff read errors, capability-disabled errors), not Settings UI. Per the "mobile (settings side only)" scope for this pass, these are intentionally excluded — they belong to whichever section covers the mobile/remote-control protocol surface (`cmux-07-remote-cloud.md` territory), not this one.

## Corrections to other sections

- `cmux-06`'s Reset section entry cites only `settings.section.reset`; the actual action button is `settings.reset.resetAll` ("Reset All Settings"), not previously quoted.
- `cmux-06`'s note on `settings.blendMode.*`/`settings.material.*`/`settings.preset.*` being an unreached debug/advanced surface is corroborated: `settings.blendMode.behindWindow`/`.withinWindow` grep to zero hits in `Sources/*.swift` outside the string-catalog/search-alias files, same as the other entries already flagged there as **Unverified**. No correction needed, just confirmation.
- No other factual contradictions found between `cmux-06`'s existing settings tables and the source for the sections it does cover (App, Notifications, Browser, Terminal, TextBox, Beta Features, Computer Use, Custom Sidebars, Cloud Machines, Account) — the gaps above are omissions, not inaccuracies.

## Coverage note

Of 2,074 strings under the audited prefixes, 168 (`settings.search.*`) are non-UI search-index metadata and out of scope by nature. Of the remaining ~1,906, roughly 994 initially failed a strict text-match against the catalog files, but most of those were child strings (`.subtitle`, `.note`, `.error.*`) of settings/dialogs the catalog already describes in its own paraphrased prose rather than verbatim — grouping by setting/dialog/shortcut identity brought real gaps down to 176 distinct items (~29% of 611 groups), all addressed above. The largest genuine finds: the undocumented automation-rules engine (`~/.cmuxterm/automations.json`), the 16-target "Open Current Directory In…" menu, four dialog keys that ship with no English value and leak their raw i18n key to the user, and ~70 keyboard-shortcut actions missing from the shortcuts inventory (mostly Canvas alignment, diff/markdown viewer navigation, pane focus/move/resize, and workspace-color quick-set shortcuts).
