# Terminal, windows, workspaces, tabs and splits

cmux embeds libghostty as its terminal engine and wraps it in a custom AppKit/SwiftUI
shell: a window holds a vertical strip of "workspaces" (tabs), each workspace holds a
tree of split "panes" managed by the vendored `Bonsplit` split engine, and each pane
holds one or more panel "tabs" (terminal, browser, file preview, etc.). This catalogs the
terminal surface itself, that pane/split/tab model, and session persistence/restore.

## Terminal configuration (Ghostty config)

### Config file discovery and load order
cmux reads the user's real Ghostty config, not a cmux-private format, so anyone who
already configures Ghostty gets the same terminal in cmux.

- Search order (`GhosttyConfig.loadFromDisk`): `~/.config/ghostty/config`, then
  `~/.config/ghostty/config.ghostty`, then
  `~/Library/Application Support/com.mitchellh.ghostty/config.ghostty`, then
  (conditionally) the legacy `~/Library/Application Support/com.mitchellh.ghostty/config`
  file, then cmux's own app-support config paths (`CmuxGhosttyConfigPathResolver`).
- The legacy `com.mitchellh.ghostty/config` file (pre-`.ghostty` extension) is only
  included if it has content **and** the new `config.ghostty` file is empty or missing
  (`shouldIncludeLegacyGhosttyConfigInResolvedLoad`) — i.e. it's a one-way fallback for
  users who haven't migrated, never a merge.
  Source: `GhosttyConfig.swift:338-357,1385-1392`.
- Every loaded file is scanned for a `config-file = <path>` directive, which recursively
  includes another file (relative to the including file's directory unless absolute,
  `~` expanded). A value prefixed with `?` is an optional include (same resolution, just
  tolerant of a missing file since it silently fails to parse rather than erroring).
  An empty `config-file =` value clears the pending recursive-include queue outright.
  Already-loaded paths are de-duplicated so a cycle can't infinite-loop.
  Source: `GhosttyConfig.swift:773-877`.
- Config files are read as UTF-8; a leading BOM is stripped; blank lines and lines
  starting with `#` are comments; directives are `key = value` with optional
  surrounding double-quotes stripped from the value.
- Parsed directives (only these are recognized; everything else is silently ignored):
  `font-family`, `font-size`, `surface-tab-bar-font-size`, `sidebar-font-size`, `theme`,
  `working-directory`, `command`, `scrollback-limit`, `background`,
  `background-opacity`, `background-blur`, `foreground`, `bold-color`, `cursor-color`,
  `cursor-text`, `selection-background`, `selection-foreground`, `palette`,
  `unfocused-split-opacity`, `unfocused-split-fill`, `split-divider-color`,
  `sidebar-background`, `sidebar-tint-opacity`, plus the recursive `config-file`.
  Source: `GhosttyConfig.swift:552-739`.
- The config is cached per `(colorScheme, fontMagnificationPercent, adaptiveDefaultThemeEnabled)`
  key (`GhosttyConfig.load`), and `invalidateLoadCache()` drops the whole cache so the
  next load re-reads disk (used when the user edits their config or toggles a setting
  that depends on it).

### Defaults (before any user config)
- Font family: `Menlo`. Font size: `13pt` (matches Ghostty's native macOS default).
- Surface tab-bar font size and sidebar font size: their own defaults/min/max exposed as
  `GhosttyConfig.default/min/maxSurfaceTabBarFontSize` and `...SidebarFontSize`, sourced
  from `CmuxGhosttyConfigSettingEditor`.
- Scrollback limit: `50,000,000` **bytes** (Ghostty measures scrollback in bytes, not
  lines) — `scrollbackLimit = 50_000_000`.
- Background `#282C34` (Ghostty's vendored default), foreground white `#FFFFFF`.
- ANSI palette (indexes 0-15): the vendored Ghostty `terminal/color.zig` defaults, e.g.
  0=`#1D1F21`, 1=`#CC6666` (red), 2=`#B5BD68` (green) ... 15=`#EAEAEA`. A `palette =
  N=#hex` directive replaces one entry at a time.
- Unfocused-split overlay opacity: `0.7` config value, clamped to `[0.15, 1.0]` before
  deriving the actual drawn overlay opacity as `1 - clamped` (so higher config values
  dim unfocused splits *less*).
- Split-divider color: explicit `split-divider-color` if set, else the background color
  darkened by `0.08` (light background) or `0.4` (dark background) —
  `GhosttyConfig.resolvedSplitDividerColor`.
- Cursor color / cursor-text / selection-background / selection-foreground each fall
  back dynamically (cursor color → foreground; cursor text → background; selection
  background → foreground; selection foreground → background) when unset, and each also
  accepts a "cell-relative" semantic value (`GhosttyCellRelativeColor`) instead of a hex
  color, mirroring Ghostty's `cursor-color = cell-foreground` style directives.
- `background-blur` accepts `false`/`0` (disabled), `true` (radius 20), a numeric radius
  1-255, or the macOS-specific values `macos-glass-regular` / `macos-glass-clear`.

### Managed default appearance ("adaptive default theme")
When a setting (`adaptiveDefaultThemeEnabled`) is on **and** the user's resolved config
has no `theme` directive and no explicit terminal-color directive (background,
foreground, bold-color, palette, cursor-color, cursor-text, selection-background/
foreground), cmux injects its own managed light/dark default palette before parsing the
user's file, so a fresh install still looks intentional instead of raw-Ghostty-default.
Typography/behavior settings (fonts, scrollback, etc.) are unaffected either way.
- Managed theme names: `"Apple System Colors Light"` / `"Apple System Colors"` (dark).
- If no theme file for those names is found on disk, a hardcoded fallback palette is
  used (`cmuxDefaultFallbackConfigContents`) — distinct 16-color palettes for light and
  dark, e.g. light background `#feffff`/foreground `#000000`, dark background
  `#1e1e1e`/foreground `#ffffff`.
- Authoring *any* theme or terminal color in the user's own config fully opts them out
  of the managed appearance — it's all-or-nothing per config, not per-field.

### Theme resolution
- `theme = NAME` loads a named theme file; `theme = light:NAME_A,dark:NAME_B` (Ghostty's
  conditional syntax) picks a side by the active color scheme, falling back to
  whichever side is present, then to a bare unlabeled entry.
- Known compatibility aliases: `Solarized Light` ⟷ `iTerm2 Solarized Light` and
  `Solarized Dark` ⟷ `iTerm2 Solarized Dark` are tried as fallbacks for each other.
  `builtin NAME` and `NAME (builtin)` are both normalized to `NAME` as an additional
  candidate.
- Theme search paths, in order: `$GHOSTTY_RESOURCES_DIR/themes/NAME`, the app bundle's
  `ghostty/themes/NAME`, each `$XDG_DATA_DIRS` entry's `ghostty/themes/NAME`,
  `/Applications/Ghostty.app/Contents/Resources/ghostty/themes/NAME`,
  `~/.config/ghostty/themes/NAME`, each app-support directory's
  `<bundle-id>/themes/NAME`, and finally
  `~/Library/Application Support/com.mitchellh.ghostty/themes/NAME`.
- A documented Ghostty bug workaround: for `light:X`/`dark:X` conditional themes,
  Ghostty applies the background but not the foreground/palette correctly for the
  conditional form, so cmux computes and injects a resolved plain `theme = X` override
  only for the side that was *explicitly* specified
  (`explicitConditionalThemeName`) — referencing
  `github.com/manaflow-ai/cmux/issues/3459` in a doc comment.

### Sidebar appearance
A `sidebar-background` directive (raw, possibly light/dark-conditional like `theme`) is
resolved into `sidebarBackground`/`sidebarBackgroundLight`/`sidebarBackgroundDark`, and
`sidebar-tint-opacity` (0-1) is written into `UserDefaults` (`sidebarTintHex`,
`sidebarTintHexLight`, `sidebarTintHexDark`, `sidebarTintOpacity`) so the SwiftUI
sidebar can read them without re-parsing the config.

## Canvas layout (freeform alternate to splits)

### What it is
Each workspace can switch between two layout engines for arranging its panes:
**Splits** (the default bonsplit tree — panes divide the available rectangle) and
**Canvas** (a freeform 2D surface where panes are independently positioned/sized
rectangles the user can drag, resize, zoom and pan around, like an infinite whiteboard).
Toggling does not discard the split tree — it's kept underneath so toggling back
restores it exactly (`Workspace.setLayoutMode`).

- Reach it: View menu → "Toggle Canvas Layout" (`menu.view.toggleCanvasLayout`), a
  keyboard shortcut (`shortcut.toggleCanvasLayout.label`), or the command palette.
- Entering canvas seeds each pane's canvas frame from its current on-screen split
  geometry (`splitPaneFramesByPanelId`), so the canvas initially looks pixel-identical
  to the split layout it replaced; only the selected tab of each split pane gets a seed
  frame, and the canvas placer arranges the rest.
- Leaving canvas re-derives split-mode terminal/browser portal visibility from the
  restored split tree.
- A `workspaceLayoutModeDidChange` notification fires on every mode change so window
  chrome (e.g. a toolbar toggle) can reflect it regardless of the entry point (shortcut,
  palette, menu, toolbar).

### Canvas-only actions (all no-ops outside canvas mode)
Defined centrally in `CanvasAction`/`CanvasActionExecutor` so every entry point (shortcut,
command palette, View menu, and `canvas.*` debug-socket verbs) shares one execution path:
- **Reveal Focused Pane** (`shortcut.canvasRevealFocusedPane.label`) — scrolls/animates
  the focused pane fully into the visible viewport.
- **Toggle Overview** (`shortcut.canvasOverview.label` / `menu.view.canvasOverview`) —
  a fit-all zoom showing every pane at once.
- **Zoom In / Zoom Out** — steps by a factor of `1.25`, anchored at the viewport center.
- **Actual Size** (`shortcut.canvasZoomReset.label`) — resets to 100% magnification.
- **Tidy Canvas** (`menu.view.canvasTidy` / `shortcut.canvasTidy.label`) and alignment
  commands: Align Left/Right/Top/Bottom Edges, Equalize Widths/Heights, Distribute
  Horizontally/Vertically — each applies to the selected panes (or, with none selected,
  keys off the focused pane as the alignment reference).
- Directional pane focus (`moveCanvasFocus`) picks the nearest pane spatially in the
  requested direction and reveals it, mirroring split-mode's directional pane focus.
- Numbered/adjacent surface selection (`selectCanvasTab(at:)`,
  `selectAdjacentCanvasTab(offset:)`, `selectLastCanvasTab()`) address the whole
  floating workspace surface order in canvas mode, since separate canvas panes don't
  share one focused tab strip the way split panes do.
- New-pane creation in canvas mode (`openNewCanvasPane`) creates a terminal, browser or
  simulator pane as its own free-floating canvas pane positioned near the focused pane
  (rather than as a tab of an existing pane); `joinNewPanelIntoCanvasPane` is the
  Cmd+T-in-canvas semantics — makes a freshly created panel a *tab* of the canvas pane
  hosting an anchor panel instead.
- Canvas pane z-order is mirrored onto portal-hosted browser webviews
  (`syncCanvasBrowserPortalZOrder`) so a frontmost canvas pane's browser content
  actually draws above a pane behind it.

### Settings
`CanvasLayoutSettings` (`UserDefaults`, mirrored into `~/.config/cmux/cmux.json`):
- **Pane gap** (`canvasPaneGap`): default `CanvasMetrics.defaultGap`; user range `0...64`.
- **Snapping enabled** (`canvasSnappingEnabled`): default `true`; when off, the snap
  threshold used while dragging/resizing panes is `0` (no snapping) instead of
  `CanvasMetrics.defaultSnapThreshold`.

### Session persistence
Canvas panes persist as `SessionCanvasPaneSnapshot` (frame x/y/width/height, the panel
ids hosted as tabs of that pane, and which tab is selected), remapped onto fresh panel
ids on restore; `nil` snapshots mean "never entered canvas mode" for that workspace, in
which case restore leaves it in split mode entirely.

## Splits and panes (Bonsplit-based split-tree layout)

### Split creation
- **Split Down** / **Split Right** (`workspace.tooltip.splitDown` /
  `workspace.tooltip.splitRight`, and terminal context menu "Split Horizontally" /
  "Split Vertically") divide the focused pane; direction maps to a bonsplit
  `orientation` + `insertFirst` flag (`TabManager.newSplit`/`Workspace.newTerminalSplit`).
  A new split can carry an explicit working directory, initial command/input, tmux
  start command, startup environment, and an explicit initial divider position.
- Splitting an **empty tree** (a workspace with no panes yet) places the panel directly
  into the root pane instead of creating an actual split (`DockSplitStore.newSplit`,
  same pattern in `Workspace`).
- New terminal splits can inherit the source pane's terminal font-size lineage
  (`inheritedTerminalFontSizeConfig`) so a split born from a font-resized terminal keeps
  that size instead of resetting to the config default.
- Terminal context menu also offers **Reconnect Pane** (for remote/SSH panes) and a
  **Swap With Session** action (drag-free way to swap the contents of two panes,
  `beginPaneSwapSelection`).

### Pane focus and navigation
- `moveSplitFocus`/`Workspace.moveFocus(direction:)` moves focus one pane in a cardinal
  direction (**Focus Pane Left/Right/Up/Down**, `shortcut.focusPane*.label`).
- `cycleSplitFocus`/`cycleFocus(forward:)` cycles focus to the next/previous pane in
  tree order, wrapping at the ends (**Focus Next/Previous Pane**).
- Surfaces (tabs within a pane) can be moved instead of just focus-shifted: **Move
  Surface to Pane Above/Below/Left/Right**, **Move Surface to Next/Previous Pane**, and
  **Reorder Surface Left/Right** (moving a tab's position within its pane's tab strip).
- **Global Search** (`shortcut.globalSearch.label`) and directional focus all live under
  the `shortcutDiscovery.section.navigation`/`.panes` groupings surfaced in the "show
  all shortcuts" popover (`shortcutDiscovery.button.help` — "Show all shortcuts").

### Pane zoom
**Toggle Pane Zoom** (`shortcut.togglePaneZoom.label`) expands the focused pane to fill
the whole workspace, hiding sibling panes without altering the underlying split tree —
toggling again restores the normal split view (`toggleSplitZoom`/
`toggleFocusedSplitZoom`, delegating to bonsplit).

### Full-width tab mode
A pane can independently be put into "full width tab" mode
(`toggleFullWidthTabMode`/`shortcut.toggleFocusedFullWidthTab` via
`Workspace+FullWidthTab.swift`) — `bonsplitController.setFullWidthTabMode`. This affects
how that pane's own tab strip renders (tabs stretch to fill the pane width) rather than
resizing the pane itself; toggling refocuses the pane.

### Equalize splits
**Equalize Splits** (`shortcut.equalizeSplits.label`) — bonsplit has no native "make all
divider positions equal" operation, so cmux's `CmuxPanes` `paneLayout.equalizeSplits`
walks the current split tree snapshot and resets divider positions itself
(`TabManager+EqualizeSplits.swift`). Returns whether at least one split was found
(`foundSplit`) and whether every split was fully equalized (`didFullyEqualize`); a
`didProgrammaticallyChangeSplitGeometry()` call afterward notifies the same geometry-
change path a manual drag would trigger, so persisted layout stays in sync.

### Resize by keyboard
**Resize Pane Up/Down/Left/Right** (`shortcut.resizePane*.label`) nudge the divider
position for the focused pane's split in that direction.

### Closing panes and workspaces / close confirmation
- **Close Tab** (`menu.file.closeTab`) closes the focused pane's tab; **Close Other Tabs
  in Pane** (`menu.file.closeOtherTabs`) closes every other tab sharing that pane.
- **Close Workspace** (`shortcut.closeWorkspace.label`, `menu.file.closeWorkspace`) via
  `closeCurrentWorkspaceWithConfirmation`/`closeWorkspaceWithConfirmation`.
- Sidebar/tab-strip context menu batch actions: **Close Other Workspaces**, **Close
  Workspaces Above**, **Close Workspaces Below**, **Close Workspaces** (multi-select).
- A workspace close can require confirmation when it would kill a running process
  (`closeWorkspaceIfRunningProcess`/`shouldConfirmClose`); a **pinned** workspace refuses
  to close outright until unpinned — surfaced as the message
  `workspace.closeProtected.message`: *"Pinned workspaces can't be closed while pinned.
  Unpin the workspace first."* A workspace that plain can't be closed right now (e.g.
  mid-teardown) shows `workspace.closeBlocked.message`: *"This workspace can't be
  closed right now."*
- `beginCloseConfirmationSession`/`endCloseConfirmationSession`/`confirmClose` gate a
  single confirmation alert session so rapid repeated close attempts (e.g. holding
  Cmd+W) don't stack multiple alert sheets.
- Multi-workspace close (`closeWorkspacesWithConfirmation`) takes an `allowPinned` flag
  and computes a `CloseWorkspacesPlan` before running one batched confirmation.

### Closed-item history and reopen
A single shared `ClosedItemHistoryStore` records closed **panels**, closed
**workspaces**, and closed **windows** as one ordered, restorable stack:
- **Restore Previous Launch** (`menu.file.reopenPreviousSession` /
  `shortcut.reopenPreviousSession.label`, alias `restorePreviousAppLaunch`) restores the
  whole previous app launch's window/workspace/pane state (see Session persistence,
  below) — distinct from per-item "reopen closed".
- `reopenMostRecentlyClosedItem()` pops the most recent restorable entry off the shared
  history and restores it: a closed **panel** is restored into its original workspace
  (`restoreClosedPanel` — remaps its saved pane-tree position via
  `SessionSplitContainerLayoutCodec`, and re-anchors any pending closed-item history
  entries that referenced its old id); a closed **workspace** is restored
  (`restoreClosedWorkspace`); a closed **window** entry is not directly restorable
  through this path (returns `false`).
- `reopenClosedHistoryItem(id:)` reopens one specific entry (not necessarily the most
  recent) by id, e.g. from a "recently closed" menu; if restoring it fails, the removed
  record is reinserted at its original index so the history stays consistent.
- Restoring a panel/workspace re-establishes it in the focus-history stack
  (`focusHistoryNavigation.recordFocusInHistory`), "preserving forward branch" so a
  reopen doesn't stomp the user's undo/redo-style focus trail.
- Browser panels additionally have a **legacy** closed-panel stack
  (`browserModel.popMostRecentlyClosedBrowserPanel`) — **Reopen Closed Browser Panel**
  (`menu.file.reopenClosedBrowserPanel`) tries the shared history first, then falls back
  to this legacy stack, restoring it into whichever workspace originally owned it (and
  dropping — not barging into an unrelated workspace — if that workspace no longer
  exists). This history can be cleared (`clearRecentlyClosedBrowserPanelHistory`).

### Focus history (back/forward navigation across the whole app)
A cross-workspace focus-history stack (`FocusHistoryHosting`/`focusHistoryNavigation`)
records every (workspace, panel) focus transition:
- **Focus Back** / **Focus Forward** (`shortcut.focusHistoryBack.label` /
  `...Forward.label`) step through the recorded history like a browser's back/forward,
  re-selecting the workspace and re-focusing the panel, or falling back to the
  workspace's remembered/first panel if the exact one is gone.
- A focus-history *menu* snapshot (`focusHistoryMenuSnapshot`,
  `recentlyFocusedFocusHistoryMenuItems(maxItemCount:)`) surfaces recent entries by
  title for direct jump (`navigateToFocusHistoryMenuItem`).
- Recording can be suppressed for a scope of internal mutations
  (`withFocusHistoryRecordingSuppressed`) so programmatic restores/remaps don't pollute
  the user-visible back/forward trail.
- A per-target invalidation (`invalidateFocusHistoryTarget`) drops stale entries when
  a workspace or panel disappears.
- A **focus flash** (`triggerFocusFlash`) can be manually invoked
  (`terminalContextMenu.triggerFlash` — "Trigger Flash", `shortcut.flashFocusedPanel.label`
  — "Flash Focused Panel") and fires automatically on navigation-driven refocus. See
  "Focus flash / attention ring" below for its exact animation.

### Numbered / adjacent workspace selection
- **Select Workspace 1…9** (`shortcut.selectWorkspaceByNumber.label`) selects by the
  order workspaces render in the sidebar; group *header* rows and collapsed child rows
  are intentionally excluded from the numbering
  (`TabManager+NumberedWorkspaceSelection.swift`).
- **Next/Previous Workspace** (`menu.view.nextWorkspace`/`previousWorkspace`), **Next/
  Previous Workspace in Group** (scoped to a workspace group), and **Move Workspace Up/
  Down** (`shortcut.moveWorkspaceUp/Down.label`) round out ordering/navigation.
- Reordering supports drag (`isDragOperation` flag threading through
  `reorderWorkspace(tabId:toIndex:)`) as well as programmatic before/after placement, and
  a dedicated sidebar-scoped path (`sidebarReorderWorkspaceIds`,
  `sidebarReorderPinnedWorkspaceIds`) that separately tracks pinned vs. unpinned legal
  insertion ranges so a drag can't reorder a pinned workspace into the unpinned list (or
  vice versa) by accident.

### Move tab to new workspace / detach
- Terminal context menu: **Move Tab** and **Move Tab to New Workspace**
  (`terminalContextMenu.moveTab` / `.moveTabToNewWorkspace`); equivalent context-menu
  entries exist for browser panels (`BrowserPanel+MoveTabToNewWorkspace.swift`) and web
  views generally (`CmuxWebView+MoveTabToNewWorkspace.swift`).
- A detached surface becomes a `DetachedSurfaceTransfer` snapshot (id, title, directory,
  the live panel) and `TabManager.addWorkspace(fromDetachedSurface:)` builds a brand-new
  workspace around it: it inherits the source workspace's implicit working directory and
  terminal font-size lineage, computes a fresh insertion index (respecting placement
  overrides and the pinned-workspace boundary via
  `clampedDetachedWorkspaceInsertIndex`), applies chrome inheritance (color/title
  conventions) from the source workspace, and optionally selects + focuses the new
  workspace with the moved panel already focused.
- Dragging a tab out **between windows** is also supported —
  `Workspace+ExternalTabDrop.swift` / `CMUXCLI+MoveTabToNewWorkspace.swift` handle the
  cross-window drop path.

### Saved layouts
**Save Layout as Template…** (`shortcut.saveLayoutTemplate.label`) captures a
workspace's split tree, working directory, environment, color, and title into a
`CmuxSavedLayout`. Opening one back up (`TabManager.openWorkspace(fromSavedLayout:)`,
`TabManager+SavedLayouts.swift`) resolves its `cwd` (optionally overridden by the
caller) relative to the user's home directory, creates a new workspace with the saved
name/environment, applies the saved tab color if any, and replays the saved split-tree
layout (`workspace.applyCustomLayout`) rooted at the resolved working directory.

## Terminal surface — copy/paste, links, find, selection

### Terminal context menu (right-click in a terminal pane)
Built per right-click in `GhosttyNSView.makeContextMenu` (also reachable without
sending Ghostty a synthetic click, for clicks on pane chrome outside the actual
terminal viewport, via `paneContextMenu(for:)`). In order:
1. **Trigger Flash** (only shown when a flash handler is wired) + separator.
2. **Copy** — only shown when there's a copyable terminal selection
   (`hasCopyableTerminalSelection`); when shown, a **Translate Selection**
   (`terminalContextMenu.translateSelection`, macOS 15+ only, gated on
   `TerminalSelectionTranslation.isSupported` and a non-blank selection) item is
   appended right after it, using a `translate` SF Symbol.
3. **Paste** — always present.
4. Separator, then **Split Horizontally** / **Split Vertically**, each carrying whatever
   shortcut is currently bound to Split Down/Split Right
   (`KeyboardShortcutSettings.menuShortcut`) and an SF Symbol icon
   (`rectangle.bottomhalf.inset.filled` / `rectangle.righthalf.inset.filled`).
5. **Swap With Session** (pane-swap picker) with an `arrow.left.arrow.right` icon.
6. Any surface-specific items appended by `appendCurrentSurfaceContextMenuItems`
   (varies by what's currently running — e.g. an active agent, a fork-conversation
   entry point).
7. **Reset Terminal** (`arrow.trianglehead.2.clockwise` icon) — resets the terminal
   state (clears the underlying pty/terminal grid state, distinct from "Clear Screen").
8. A remote-pane **Reconnect** item if applicable (`appendReconnectRemotePaneMenuItem`).
9. Separator, then (when the surface has an identity) **Copy IDs**
   (`terminalContextMenu.copyIdentifiers`) and **Copy Surface Link**
   (`command.copySurfaceLink.title`).
- Right-clicking claims the responder chain (`window?.makeFirstResponder(self)`) and
  synthesizes a right-mouse-down into the Ghostty surface before building the menu (so
  the terminal's own selection state, e.g. right-click-to-select-word behavior some
  shells implement, is consistent with the menu's contents) — unless the surface has
  already captured the mouse for some other protocol (e.g. an active drag), in which
  case no context menu is shown at all.

### Copy / selection
- **Copy** (`terminalContextMenu.copy`) copies the current terminal selection.
- **Translate Selection** invokes the system Translation UI (macOS 15+): captures a
  selection-text snapshot, positions a small anchor view at the top-left of the
  selection's on-screen rect (offset up by 22pt so the popover doesn't cover the text),
  and hosts `TerminalSelectionTranslationAnchorView` there via `NSHostingView`. Beeps
  (`NSSound.beep()`) if there's no non-blank selection when invoked directly.
- **Toggle Terminal Copy Mode** (`shortcut.toggleTerminalCopyMode.label` — Ghostty's
  vi-style keyboard-driven copy mode) shows a floating HUD badge overlay while active:
  a rounded (`cornerRadius 18`), translucent (`.hudWindow` material,
  `.withinWindow` blending, `alphaValue 0.97`) pill with a `1px` white-12%-alpha border
  and a drop shadow (`opacity 0.22, radius 10, offset (0,2)`), containing an icon and
  the label text `"vim"` (`ghostty.copy-mode.indicator`, localizable). The same badge
  mechanism shows other active Ghostty "key table" names (e.g. after entering a custom
  keybinding table) with the default label `"key table"`
  (`ghostty.key-table.indicator`) when the table name isn't recognized as vi/vim.
- Command-click / Ctrl-click a path or URL in terminal output: file paths open inside
  cmux's own file preview (not an external app) via `CommandClickFileOpenRouter`
  (working directory resolved from the owning surface, remote-SSH-aware — a remote
  terminal's file link is either deferred into a native remote file preview or dropped
  through the same file-open router depending on transport); recognized URLs open as a
  **new browser pane split** from the clicked terminal
  (`openTerminalBrowserLink` — prefers filling an existing empty right-side pane before
  falling back to a fresh horizontal split).

### Paste
- **Paste** (`terminalContextMenu.paste`) and Cmd+V both deliver through Ghostty's
  bracketed-paste path (`ghostty_surface_text` under the hood), so shells/TUIs that
  understand bracketed paste (most do) treat a paste as one atomic insertion rather than
  simulated keystrokes.
- **Image paste/transfer**: pasting (or drag-dropping) an image or file shows a
  transient upload/transfer indicator overlay (`beginImageTransferIndicator`/
  `endImageTransferIndicator`) — a translucent `NSVisualEffectView` panel with an
  animated `NSProgressIndicator` spinner and a cancel button. The indicator is
  intentionally **debounced 150ms** before it becomes visible (`imageTransferIndicatorShowScheduler`)
  so a fast/instant transfer never flashes the spinner at all; if the operation is
  already done or cancelled by the time the delay elapses, it's never shown. It stacks
  above the search overlay and the copy-mode badge in z-order. The cancel button calls
  `operation.cancel()`; if that succeeds, the indicator is dismissed and an
  `onCancel` handler is invoked.
- In the TextBox (agent prompt) input, dropped/pasted images are prepared off the main
  actor (`TextBoxPastePreparationService`): each attachment gets a normalized SDR PNG
  thumbnail (max 64px on the long edge, high-quality interpolation, sRGB color space)
  generated via `CGImageSource`/`CGContext`, independent of the original image's color
  profile/HDR state. `TerminalImageTransferPreparedContent` distinguishes plain-text
  paste (`insertText`), rejected content (`reject`), and file/image attachments
  (`fileURLs`).
- No large-paste / multiline-paste confirmation dialog was found (unlike some terminal
  apps that warn before pasting multi-line text into a shell prompt) — see Unverified.

### Find-in-terminal
A floating, draggable find bar overlays the terminal (`SurfaceSearchOverlay`):
- **UI**: a search field (180pt wide) with a match-count readout inside it
  (`"N/total"` when a match is selected, `"-/total"` when a query has results but none
  is selected yet), then chevron-up "next match", chevron-down "previous match", and an
  "x" close button. Rendered in a `RoundedRectangle(cornerRadius: 8)` card with a system
  `.background` material and a `radius: 4` shadow.
- **Placement**: snaps to one of the four corners of the terminal pane
  (`Corner.topLeft/.topRight/.bottomLeft/.bottomRight`, default `.topRight`); dragging it
  live-tracks the gesture and, on release, animates (`easeOut, 0.2s`) to whichever corner
  is nearest the drop point.
- **Text**: placeholder `"Search"` (`search.placeholder`). Tooltips: next match "Next
  match (Return)" (`search.nextMatch.help`), previous match "Previous match
  (Shift+Return)" (`search.previousMatch.help`), close "Close (Esc)"
  (`search.close.help`).
- **Behavior**: Return navigates to the next match, Shift+Return to the previous; Escape
  closes the bar (suppressed during active CJK/IME marked-text composition, so Escape
  during IME composition doesn't accidentally close find — issue #118 referenced in a
  comment). The field remembers/restores its text selection across focus loss/window
  switching via a dedicated `.ghosttySearchFocus` notification mechanism, so refocusing
  the find field after switching windows doesn't blow away the user's cursor position or
  select-all unexpectedly.
- A parallel implementation (`BrowserSearchOverlay.swift`) provides the same find
  affordance inside in-app browser panes, and `MarkdownFindWebViewEvaluator`/
  `BrowserFindWebViewEvaluator` drive the actual highlight/scroll via injected JS against
  the hosted WKWebView.
- No dedicated `terminal.restore.no_snapshot` string ("No previous session snapshot
  available") is find-related — it's a session-restore message (see below).

### Bell
`TerminalBellService`/`TerminalBellPresentation` (package `CmuxTerminal`):
- Two independent audio channels can both fire on one bell: the **system alert sound**
  (`NSSound.beep()`, gated by `systemSoundEnabled`) and an optional **custom sound file**
  (loaded via `NSSound(contentsOfFile:)`, played at a `customAudioVolume` clamped to
  `0...1`; a new bell replaces whatever custom sound was still playing).
  Rings are explicitly audio-only — the doc comment states application/window-level
  process attention ("bounce the dock icon" / "flash window") is *deliberately not
  representable* through this API, because that can promote an entire Stage Manager
  window set; instead...
- **Visual bell** (`visualBellEnabled`) is routed by the terminal host into cmux-owned
  pane/workspace/Dock **unread** state rather than an AppKit-level flash — i.e. a
  terminal bell can mark its pane/workspace as unread/attention-needing through the same
  channel as a real notification, not a separate blink effect.

### Focus flash / attention ring
A shared animated ring overlay (`WorkspaceAttentionFlashRingView`,
`WorkspaceAttentionCoordinator`) is used both for **"flash to show me where focus just
went"** and for notification arrival/dismiss indicators:
- **Color**: a `WorkspaceAttentionColor` resolved from a configured `#rrggbb` string (via
  environment); an invalid/unset config falls back to `NSColor.systemBlue`. The color
  string must be *exactly* a 7-character `#` + 6 hex digits or it's rejected outright
  (`strictRGB`).
- **Shape**: a rounded rectangle stroke (`cornerRadius` from `FocusFlashPattern.ringCornerRadius`),
  line width `2.5pt`, inset `2pt` from the pane bounds, with a colored glow shadow
  (opacity/radius vary by *presentation style*: the plain "flash ring" style used for
  navigation/user-initiated/notification events uses glow opacity `0.6`, radius `6`; a
  separate, softer "notification ring" style — opacity `0.35`, radius `3` — exists for
  ambient unread indicators). `allowsHitTesting(false)` — it never intercepts clicks.
- **Animation curve** (`FocusFlashPattern`): opacity keyframes `[0, 1, 0, 1, 0]` at
  times `[0, 0.25, 0.5, 0.75, 1]` of a `0.9s` total duration, i.e. it flashes on-off-on-off
  twice, with alternating `.easeOut`/`.easeIn` segments between keyframes — a double-pulse
  rather than a single fade.
- **When it fires** (`WorkspaceAttentionFlashReason`): `.navigation` (moving focus
  around), `.userInitiated` (manual "Trigger Flash"/"Flash Focused Panel"),
  `.notificationArrival`, `.notificationDismiss`, `.unreadIndicatorDismiss`, `.debug`.
  A `.navigation` flash is **suppressed** if another panel already has a competing
  unread/attention indicator showing (`hasCompetingIndicator`) — so ordinary tab-to-tab
  navigation doesn't flash-spam every pane, but every other reason always flashes.

## The TextBox (agent prompt / command input)

### What it is
A single multi-line composer at the bottom of a terminal pane, used to type prompts to
an agent or plain shell commands, with a placeholder of `"Prompt or command"`
(`textbox.placeholder`). It is a shared component, not agent-specific chrome — every
terminal pane can show one.

- **Focus TextBox Input** (`shortcut.focusTextBoxInput.label`) and **Cycle TextBox
  Submit Action** (`shortcut.cycleTextBoxSubmitAction.label`, Shift-Tab) are its core
  shortcuts; **Attach File to TextBox Input** (`shortcut.attachTextBoxFile.label`).
- The send button and its context menu are described below; a fallback `Send`
  tooltip/label is `textbox.send.tooltip`.

### Submit actions
Submitting isn't just "run this text" — it's dispatched through one of several
configurable **submit actions**, each either a plain text-entry send or a **command
template** that wraps the typed prompt in a specific CLI invocation:
- Built-in actions include `codex` (**"Codex --yolo"**, `textbox.submitAction.codex`),
  `claude` (**"Claude Dangerous"**, `textbox.submitAction.claude`), `opencode`
  (**"OpenCode"**), `pi` (**"Pi"**), and the always-available **"Text Entry"**
  (`textbox.submitAction.textEntry` / `TextBoxSubmitAction.textEntryAction`) fallback
  that just sends raw text/keystrokes with no command wrapping.
- The send button shows the currently selected action's icon (from an explicit image
  path, a bundled asset name, or an SF Symbol fallback); right-clicking it opens a
  context menu listing every configured submit action (checkmark on the active one),
  a **Cancel Pending Launch** entry when a provider launch is in flight
  (`textbox.submitAction.cancelPending`), and a **"TextBox Submit Actions Docs"** link
  (`textbox.submitAction.docs`) that opens
  `github.com/manaflow-ai/cmux/blob/main/docs/configuration.md#terminaltextboxsubmitactions`.
- Pressing Shift-Tab cycles through the configured actions in order, wrapping around
  (`nextCycledSubmitActionID`); the tooltip on the composer's action indicator literally
  says **"Submit with %@. Press Shift-Tab to change."** (`textbox.submitAction.tooltip`).
- **Forced Text Entry**: while the focused terminal already has an active agent hook
  context that "supports active agent prefixes," submission is force-pinned to Text
  Entry and submit-action *selection itself* is disabled — surfaced by the tooltip
  **"This terminal uses Text Entry until command launch is available. Shift-Tab is
  disabled while Text Entry is forced."** (`textbox.submitAction.activeAgent.tooltip`)
  with the action label showing as **"Text Entry"** (`textbox.submitAction.activeAgent`).
- A **pending provider launch** (the user picked a command-template action like "Claude
  Dangerous" and it's mid-startup) has its own state machine: it starts a `12s` timeout
  (`pendingProviderLaunchTimeoutSeconds`); it clears itself once the terminal's shell
  activity reports `.promptIdle` or the agent hook context reports active agent
  prefixes, or once the timeout expires (at which point it also clears whatever launch
  command was staged, unless the terminal was mid pending-launch context already).
  The submit button disables while this is pending, and the composer offers a
  cancel affordance.
- A command-template action that can't currently produce a command (e.g. shell isn't at
  an idle prompt) makes the send button disabled ("fail closed") rather than silently
  falling back to sending raw text.

### File/image attachments and mentions
- **Add Files…** / **Add Images…** (`textbox.addFiles.*` / `textbox.addImages.*`) open
  native Open panels titled "Add Files"/"Add Images" with an "Add" prompt button, or the
  toolbar buttons carry the same tooltips.
- **Remove Attachment** (`textbox.removeAttachment.tooltip`) removes one staged
  attachment chip.
- Image attachments render inline as small thumbnail chips
  (`TextBoxInlineAttachmentCell`/`Renderer`/`ThumbnailNormalizer`) rather than as raw
  paths; an attachment can be opened externally — **"Open with Preview"**
  (`textbox.openWithPreview.button`) / **"Open in Preview"**
  (`textbox.openInPreview.tooltip`).
- Typing `@` opens a file-mention completion popup (`TextBoxMentionCompletionController`
  /`Detector`/`Candidate`/`IndexStore`) that indexes the workspace's files (respecting
  `.gitignore` via `TextBoxGitIgnoreProbe`) and inserts a markdown-style file reference
  on selection.
- **Diff review comments**: when the composer has pending inline diff comments attached
  to the next submission, it shows a count pill — `"1 comment"` (`textbox.diffComments.one`)
  or a pluralized `"N comments"` (`textbox.diffComments.many`), a **"Show comments"**
  preview affordance, a dismiss control (**"Dismiss comments without sending"**), and a
  tooltip explaining **"Diff review comments are included when you submit"**
  (`textbox.diffComments.tooltip`).

## Windows, titlebar, and multi-display

### Titlebar / presentation modes
`WorkspacePresentationModeSettings` (`UserDefaults` key `workspacePresentationMode`):
two modes, **`standard`** (default) and **`minimal`**. In minimal mode,
`WorkspaceTitlebarModeLayer` simply omits the titlebar view entirely, and a separate
`WorkspaceContentMinimalModeSafeAreaModifier` adjusts content insets to compensate. A
related, independently toggled setting `workspaceButtonsFadeMode` (default `disabled`)
governs whether workspace-row hover buttons fade in/out.

### New windows
**New Window** (`menu.file.newWindow` / `contextMenu.newWindow` /
`shortcut.newWindow.label`) opens an additional independent main window, each with its
own `TabManager`/workspace strip; a per-window `DockSplitStore` (scope `.global`) is
seeded from the global `~/.config/cmux/dock.json`, separate from each per-workspace Dock
seeded from that project's `.cmux/dock.json`.

### Display placement
Exposed as both a `window.display`/`window.displays` control-socket command and a
`cmux window display --list` CLI verb (`AppDelegate+DisplayPlacement.swift`), not
(as far as read) a menu item:
- **List displays**: every connected `NSScreen`, in `NSScreen.screens` order, with name,
  index, a `CGDirectDisplayID`, whether it's the main display, and its frame.
- **Move to display**: resolves a query against display names by exact
  case-insensitive match, then case-insensitive substring match, then a bare numeric
  index string; moves one window or every main window onto the resolved screen,
  preserving the window's current size (clamped to the target screen) and centering it
  in the target's visible frame. Explicitly documented as **not** raising/keying/
  activating the window — this command must never steal macOS focus as a side effect.

## Session persistence and restore

### What's captured
A full app-session snapshot covers windows → their `TabManager` (workspaces, workspace
groups, selection) → each workspace's panels/split layout/canvas panes, plus sidebar
state (visibility, selection, width) and window frames.

Hard caps enforced while building/restoring a snapshot (`SessionPersistencePolicy`):
- Up to **12 windows** per snapshot (`maxWindowsPerSnapshot`).
- Up to **128 workspaces per window** (`maxWorkspacesPerWindow`).
- Up to **512 panels per workspace** (`maxPanelsPerWorkspace`).
- Terminal scrollback persisted per terminal is truncated to at most **4000 lines** and
  **400,000 characters** (`maxScrollbackLinesPerTerminal`/`maxScrollbackCharactersPerTerminal`),
  keeping the *tail* of the buffer. Truncation is ANSI-escape-safe: if the naive
  character cutoff would land inside an unterminated CSI escape sequence (`ESC [ ... `),
  the truncation point is advanced past that sequence's final byte so a restored
  scrollback never replays a malformed/partial control sequence.
- Autosave runs on an **8-second** interval (`autosaveInterval`).
- Sidebar width persists within a configurable minimum (default **240pt**, itself
  clamp-ranged **120...260pt**) and a fixed maximum of **600pt**; window minimum size is
  **300×400pt** (chrome — sidebar footer / update pill — starts overlapping workspace
  rows below ~400pt tall).

### Restore trigger and opt-out
`SessionRestorePolicy.shouldAttemptRestore` decides whether app launch attempts a
restore at all:
- Disabled outright if `CMUX_DISABLE_SESSION_RESTORE=1` is set.
- Disabled when running under automated tests, detected via any of: `CMUX_TEST_PROCESS=1`,
  `CMUX_UI_TEST_MODE=1`, any `CMUX_UI_TEST_*` env var, `XCTestConfigurationFilePath`/
  `XCTestBundlePath`/`XCTestSessionIdentifier`/`XCInjectBundle`/`XCInjectBundleInto`
  present, or `DYLD_INSERT_LIBRARIES` containing `libXCTest`.
- Disabled when the app was launched with any explicit non-`-psn_*` command-line
  argument (an explicit argument is treated as an explicit "open this specific thing"
  intent that should override restoring the old session).
- User-facing entry point: **Restore Previous Launch** (`menu.file.reopenPreviousSession`,
  alias **"Restore Previous App Launch"** — `shortcut.reopenPreviousSession.label`).
- A restore with nothing to restore surfaces **"No previous session snapshot available"**
  (`terminal.restore.no_snapshot`).

### Crash-diagnostic window pruning
Windows/workspaces whose working directory lives under cmux's own crash-diagnostic
storage (`~/.local/state/cmux/crash/`, or `$XDG_STATE_HOME/cmux/crash/` if set) are
pruned from a restored snapshot **unless** they carry meaningful user state worth
keeping — a workspace is only considered prunable if none of the following are true:
custom title/description/color, pinned, grouped, manually marked unread/has-unread,
in-progress indicator, a git branch, any notifications/canvas panes/environment
overrides/status or log entries; a panel is only prunable if it has no custom title,
isn't pinned/manually-unread, has no unread indicator, no git branch, no listening
ports, and no notifications; and a terminal panel is only prunable if its persisted font
size isn't one the app would keep, and it has no scrollback text and no draft TextBox
text, and — separately — has no agent, no hibernation state, no resume binding, no tmux
start command, and isn't a remote/SSH terminal. Pruning removes whole workspaces (and
whole windows if every workspace in them was pruned), and repairs the "selected
workspace" index and any workspace-group anchors so the remaining state stays coherent
after removal, including keeping an otherwise-empty **pinned** group around
(`keepsEmptyPinnedGroup`) rather than deleting it.

## Unverified / unclear

- No large/multiline-paste **confirmation dialog** was found (some terminal apps warn
  before pasting text containing newlines into a shell prompt); grepped for it and found
  nothing — likely genuinely absent, but not exhaustively ruled out given the codebase's
  size.
- No dedicated **secure input** (`EnableSecureEventInput`/password-field-aware masking)
  feature was found under the terminal/pane scope; a targeted grep across `Sources/` and
  `Packages/macOS/` turned up nothing. Ghostty/macOS terminals sometimes gate this behind
  a completely different naming convention this pass may have missed.
- `TextBoxInput.swift` is ~5,800 lines and was only sampled via targeted grep, not read
  end-to-end; its full IME composition handling, keyboard-shortcut interception, and
  drag-and-drop acceptance logic are only partially covered here.
- `ContentView.swift` (~18,000 lines) and `Workspace.swift`/`TabManager.swift`
  (~14,800/~6,900 lines) were explored by function-signature/grep index plus targeted
  reads, not read in full; window-chrome composition, command-palette wiring, and the
  exact appearance/animation of every context-menu-adjacent affordance may have
  additional states not captured here.
- `DockSplitStore.swift` and its ~30 extension files implement a parallel, structurally
  similar split/pane system for the **right-sidebar "Dock"** feature, which is explicitly
  out of this agent's scope (sidebar) — its `newSplit`/`newSurface` mechanics were read
  only far enough to confirm the distinction, not cataloged.
- `Sources/GhosttyTerminalView.swift` is extremely large (10,000+ lines observed); mouse-
  event/drag-session handling (`GhosttyMouseSessionLedger`), remote-tmux-specific pane
  behavior, and the "reconcile Ghostty mouse buttons" state machine were not explored
  beyond what's cited above.
- Saved-layout **management UI** (listing/renaming/deleting saved templates) was not
  located — only the apply-a-saved-layout path (`TabManager+SavedLayouts.swift`) was
  confirmed.
- Terminal font-size / zoom keyboard shortcuts (`menu.view.zoomIn`/`zoomOut`/`actualSize`,
  `shortcut.increase/decrease/resetWorkspaceTerminalFontSize.label`) were confirmed to
  exist via strings/shortcut catalog but their exact step size and min/max clamp weren't
  traced into `WorkspaceTerminalFontSize*` (a large multi-file subsystem under
  `Sources/`) given scope/time.

## Coverage note

**Read in full**: `Packages/macOS/CmuxTerminalCore/Sources/CmuxTerminalCore/Config/GhosttyConfig.swift`;
all of `Sources/Find/` except the two tiny WKWebView-evaluator files (skimmed, they're
thin JS-eval wrappers); all of `Sources/Canvas/`; all of `Sources/Windowing/`;
`Sources/TextBoxSubmitActions.swift`, `Sources/TextBoxPastePreparationService.swift`;
`Packages/macOS/CmuxTerminal/Sources/CmuxTerminal/Services/Bell/*`;
`Sources/Panels/WorkspaceAttentionColor.swift`,
`Sources/Panels/WorkspaceAttentionFlashRingView.swift`, and the relevant section of
`Sources/Panels/Panel.swift` (`WorkspaceAttentionCoordinator`/`FocusFlashPattern`);
`Sources/GhosttyNSView+SelectionTranslation.swift`;
`Sources/Workspace+TerminalLinkOpening.swift`; `Sources/AppDelegate+DisplayPlacement.swift`
(partial); `Sources/SessionPersistencePolicy+CrashStorage.swift`;
`Sources/TabManager+SavedLayouts.swift`, `+EqualizeSplits.swift`,
`+NumberedWorkspaceSelection.swift`, `+FocusHistoryHosting.swift`, `+DetachedWorkspace.swift`;
`Sources/Workspace+FullWidthTab.swift`, `+EqualizeSplitsSupport.swift`,
`+ClosedPanelLayoutRestore.swift`, `+CanvasLayout.swift`.

**Read via targeted `sed`/grep excerpts, not end-to-end**: `Sources/Workspace.swift`,
`Sources/TabManager.swift`, `Sources/DockSplitStore.swift`, `Sources/ContentView.swift`,
`Sources/SessionPersistence.swift` (first ~520 lines read closely; struct/enum index
scanned for the rest), `Sources/GhosttyTerminalView.swift` (context menu, copy-mode
badge, image-transfer indicator sections read closely; ~10,000+ remaining lines only
grep-indexed).

**Strings coverage**: every key under the `terminal.`, `terminalContextMenu.`, `panel.`,
`tab.`, `textbox.`, `titlebar.`, `workspace.`, `contextMenu.`, `common.`, `find.`,
`session.` (contains-match — no exact `session.*` scope-relevant keys existed beyond
what's cited), `layout.`, `window.`, `split.`, and `pane.` namespaces from
`cmux-strings.tsv` were pulled and reviewed (182 lines); a second pass covered
`menu.file.*`, `menu.view.*`, `menu.window*`, `search.*`, and the full `shortcut.*`/
`shortcutDiscovery.*` namespace (244 lines) for keyboard-shortcut labels, help text, and
error strings (conflict/reserved-key/numbered-shortcut validation messages surfaced in
the shortcut recorder UI). Not every string was traced back to the exact UI element that
displays it — some (e.g. `shortcut.recorder.*`) belong to the shortcut-customization UI,
which is settings-adjacent and only lightly covered here.
