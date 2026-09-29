# Terminals, editor, files, search and browser

Covers every user-facing behaviour in Emdash's terminal, code editor, file explorer, search, in-app browser, dev-server-preview, and library/catalog surfaces, read from source rather than inferred from names. "Library" turned out to be a reusable-prompts manager; "catalog" is a backend data source (skills + MCP registry) with no UI of its own in this slice — its consumers live in the skills/MCP features, out of scope here.

## Terminals

### Multiple terminals per task, drawer + full tabs
A task's bottom drawer has two modes, switched by a small `Terminals`/`Scripts` tab pair on the right of the bar: "Terminals" lists every open terminal as a pill-shaped tab; "Scripts" lists the project's lifecycle scripts (setup/run/teardown) the same way. Terminals opened into a main editor pane (via drag or split) are filtered out of the drawer list so they aren't shown twice.
- Each terminal tab shows a terminal icon, its name, and (on hover) a small "×" close button with tooltip "Close terminal".
- Double-clicking a terminal's tab label turns it into an inline rename `<input>` (auto-focused, auto-selected text); Enter or blur confirms, Escape cancels.
- Terminals can be dragged by their tab (uses `@dnd-kit`) — `TERMINAL_DRAWER_DRAG_TYPE` drag data carries `terminalId` and `label`.
- Empty states: "No terminals yet" / "Add a terminal to run shell commands in this task's working directory." with a "New terminal" button (shows the `task.newTerminal` shortcut as keycaps); "No scripts configured" / "Add setup, run, or teardown scripts to your project configuration." (no action).
- Unavailable state (project's live actions disabled, e.g. remote host down): "Terminal unavailable" with the disabled reason as detail, or "Live actions are unavailable." as fallback.
- Source: `apps/emdash-desktop/src/core/features/terminals/contributions/browser/task-terminal/terminal-panel.tsx`, `.../browser/task-terminal/terminal-drawer-tab-bar.tsx`.

### New terminal / shell picker
A split button: the "+" half creates a terminal with the default shell (tooltip "New terminal" + bound shortcut `task.newTerminal`); the chevron half opens a shell dropdown.
- Dropdown states: `Loading shells…` (spinner icon), `Failed to load shells` (clicking retries; tooltip shows the error message), `No shells found` (disabled row), or a list of shells from `TerminalShellAvailability` — unavailable shells render disabled with their `reason` as a tooltip.
- Terminal names auto-increment: `nextTerminalName` scans existing names for `Terminal N` and picks the lowest free `N` (source: `terminal-tabs.tsx`).
- Creating a terminal is optimistic: a `TerminalStore`/`PtySession` is added to the UI immediately, then reconciled or rolled back if the create call fails.
- Source: `.../browser/task-terminal/terminal-drawer-tab-bar.tsx` (`NewTerminalButton`).

### Terminal tabs in the main editor area
A terminal can also live as a first-class tab in the main pane (split/drag target), sharing the exact same `TerminalPtyContent` renderer as the drawer.
- Tab label: the terminal's name, or `Terminal` if the store hasn't resolved yet.
- If the terminal manager hasn't loaded: empty state "Loading terminal" / "Restoring terminal session."; once loaded but the terminal no longer exists: "Terminal unavailable" / "This terminal was removed from the drawer."
- If live actions are disabled: "Terminal unavailable" with the disabled reason.
- Closing the manager-tracked terminal (e.g. deleted elsewhere) auto-closes the tab via a MobX reaction, with a 0ms `setTimeout` to avoid closing mid-render.
- Source: `.../browser/task-terminal/terminal-tab-provider.tsx`.

### xterm.js session — mount, resize, persistence
Each session is a persistent `FrontendPty` (xterm.js Terminal + Canvas2D renderer) that survives tab switches: on unmount its DOM is reparented into an off-screen host rather than destroyed, so scrollback is preserved. Default PTY size on first hydrate is 80×24 columns/rows (`DEFAULT_TERMINAL_SIZE` in `node/wire-controller.ts`); the frontend then resizes to the pane's real pixel geometry as soon as it mounts.
- Resize path: the per-pane "resize controller" measures xterm's real cell metrics (`getCellMetrics`), recomputes cols/rows, and broadcasts a PTY resize to *all* sessions sharing that pane; a cold-path retry (up to 5 attempts, 100ms apart) covers the case where xterm hasn't measured fonts yet because it was mounted off-DOM. Comment cites bug `ENG-1577` ("Claude Code output overlaps input field, fixed by resizing") as the reason resize must happen synchronously before the next paint.
- A DECRQM workaround intercepts CSI `$p`/`?$p` queries (an xterm.js 6.0 bug) and answers them directly rather than forwarding to the PTY.
- Terminal state persists across app restarts through the underlying PTY/tmux runtime (see Tmux below); the frontend session itself lazily reconnects on first observation (`onBecomeObserved`).
- Source: `.../browser/pty/use-pty.ts`, `.../api/browser/pty/pty-session.ts`, `.../api/browser/task-terminal/terminal-manager.ts`.

### Terminal search overlay
`Cmd/Ctrl+F`-style in-terminal find (triggered via the `terminal.find` view-scope command, e.g. from a keybinding or the search icon).
- A floating panel (blurred backdrop) with a magnifier icon, text input placeholder `"Find in terminal..."` (`aria-label="Find in terminal"`), a `N/total` counter (`0/0` when empty), and Previous/Next/Close buttons (`aria-label`s "Previous terminal match", "Next terminal match", "Close terminal search").
- Enter steps to the next match; Shift+Enter steps to the previous. Prev/Next buttons disable when there's no query or zero matches.
- Matching is case-insensitive, spans soft-wrapped lines by joining wrapped rows into one logical line before searching, and returns row/col/length hits (`collectTerminalSearchMatches`); `getNextTerminalSearchIndex` computes wraparound next/prev navigation, including recovering a "nearest" match if the exact current match disappeared (e.g. buffer scrolled).
- Source: `.../contributions/browser/pty/terminal-search-overlay.tsx`, `.../browser/pty/terminal-search.ts`, `.../api/browser/pty/use-terminal-search.ts`.

### Clickable file links in terminal output
Output lines are scanned for file-path-looking tokens and turned into xterm.js link providers.
- Activation requires holding the platform modifier while clicking: ⌘ (without Ctrl) on macOS, Ctrl (without ⌘/Meta) elsewhere — checked live against `keydown`/`keyup`/`mousemove`/`mousedown`/`mouseup`, and reset on window blur.
- While the modifier is held and the link is hovered, the link gets an underline + pointer cursor; only the primary mouse button (button 0, or `undefined`) activates it.
- External-looking paths (URLs) open externally; workspace-relative paths (`./foo` gets its `./` stripped) open in the task's file editor.
- Source: `.../api/browser/pty/file-link-provider.ts`, `.../browser/pty/file-link-detection.ts`, `.../browser/pty/terminal-context-link.ts`.

### Copy / paste and clipboard
- Selecting text sets a 2-second "recent selection" grace window (`LAST_SELECTION_COPY_GRACE_MS`) so a copy shortcut fired immediately after losing the live xterm selection (e.g. after a context-menu click) still has something to copy.
- Copy shortcuts: **Ctrl+Shift+C** on any platform copies if there's a selection or a recent one; **Cmd+C** (mac, no Ctrl/Shift/Alt) or **Ctrl+C** (other platforms, no Meta/Shift/Alt) copies only an active selection.
- Auto-copy-on-selection (a Terminal setting): when enabled, any selection is copied 150ms after it stabilizes.
- Paste shortcuts: **Ctrl+V**/**Ctrl+Shift+V** on Windows; **Ctrl+Shift+V** only on Linux; on macOS, ⌘V is left to the native/Electron path (not intercepted).
- Right-click opens a native context menu (paste / select-all / clear), routed over the desktop host bridge with a request id so late responses can't be misapplied to a newer menu.
- OSC 52 clipboard writes from inside the terminal (e.g. a CLI agent setting the system clipboard) are decoded and applied (`decodeOsc52ClipboardData`, target `c`, base64-decoded, empty or `?` payloads ignored).
- Source: `.../browser/pty/pty-keybindings.ts`, `.../browser/pty/pty-clipboard.ts`, `.../browser/pty/use-pty.ts`.

### Dropping / pasting images and files into a terminal
Dropped or pasted files (drag from Finder, paste from clipboard) are converted into a shell-safe, bracketed-paste-wrapped list of file paths and injected as terminal input, so a CLI agent sees literal file paths it can read.
- macOS/Electron drag-temp paths (under `.../T/Drops/...`) and any path containing `tmp`/`temp` plus `drop`/`chromium`/`electron`, plus Windows `AppData\Local\Temp`, are treated as "unstable" and re-persisted rather than referenced directly, because Chromium deletes them right after the drop completes — before an agent process can read them. HEIC/HEIF files are always re-persisted (never used by original path).
- Re-persisted blobs are capped at 50 MB (`MAX_DROPPED_BLOB_BYTES`); larger drops are silently skipped with a warning log (no visible toast at this layer).
- Clipboard image extraction dedupes by `name\0type\0size\0lastModified`, and when the raw clipboard also advertises an `image/*` MIME type, only one image is kept — preferring PNG, then JPEG, then GIF, then WebP — since browser clipboard item ordering isn't guaranteed.
- Two pastes within 250ms of each other are treated as a near-duplicate (`isNearDuplicatePaste`), guarding against double-fire paste events.
- Paths are escaped per platform: POSIX backslash-escapes shell metacharacters (space, quotes, `\$\`!*?()[]{}|;<>&#~`); Windows wraps in double quotes with internal quotes doubled. The whole injected text is wrapped in a bracketed-paste sequence (`ESC[200~ ... ESC[201~`) with the trailing space *inside* the paste markers — a comment notes Claude Code otherwise discards the whole paste if any byte follows the end marker in the same write, leaving a stray space in the prompt.
- Source: `.../api/browser/pty/terminal-image-paths.ts`, `.../api/browser/pty/terminal-image-injection.ts`, `apps/emdash-desktop/src/main/core/files/file-system/file-errors.ts` companion `resolveDroppedFile`.

### Terminal fonts, theme, keyboard editing shortcuts
- Settings (`terminal` app-settings key): `fontFamily` (optional custom family, quoted and appended before fallbacks `Menlo, Monaco, Consolas, monospace`), `fontSize` (clamped to `TERMINAL_FONT_SIZE_MIN`/`MAX`, default `TERMINAL_FONT_SIZE_DEFAULT`), `autoCopyOnSelection` (default off), `macOptionIsMeta` (default off), `defaultShell` (one of the app's known shell ids, default `system`).
- Font/setting changes propagate live via `window` custom events (`terminal-font-changed`, `terminal-auto-copy-changed`, `terminal-mac-option-is-meta-changed`) so open terminals update without remounting.
- macOS-only readline-style editing shortcuts, intercepted only in `shell` input context (not for an agent's own terminal, which gets native Option+Arrow): Option+←/→ = backward/forward-word, Option+↑/↓ = beginning/end-of-line; ⌘+← = beginning-of-line (`\x01`), ⌘+→ = end-of-line (`\x05`); ⌘+Backspace = kill-to-beginning-of-line (`\x15`, unix-line-discard), macOS only (other platforms get native Ctrl+U).
- Shift+Enter, when `mapShiftEnterToCtrlJ` is set (used by chat-style terminals), sends a literal line feed (`\x0A`) instead of a carriage return, so CLI agents interpret it as a newline within the same message rather than submitting.
- Escape (no modifiers) invokes an "interrupt" callback rather than being sent to the PTY.
- Source: `.../contributions/settings.ts`, `.../api/browser/pty/terminal-font.ts`, `.../browser/pty/pty-keybindings.ts`, `.../browser/pty/use-pty.ts`.

### Terminal input tracking and "first message" capture
Input typed into a terminal is buffered and, once a submitted line is detected (carriage return), reported through `onEnterPress`/`onFirstMessage` callbacks used elsewhere (e.g. to auto-title a task from the first command run). `SubmittedInputBuffer`/`isRealTaskInput` filter out pure terminal-control byte sequences so control traffic doesn't count as "real" user input.

### Terminal exit / unexpected-exit classification
`isUnexpectedPtyExit({ exitCode, signal })` returns true whenever `exitCode !== 0` or a `signal` is present — i.e. a clean `exit 0` with no signal is the only "expected" exit; everything else (non-zero code, or killed by signal) is unexpected. (No further UI-level exit banner text was found in this slice; how this classification surfaces visually is in the runtime/host layer outside this scope.)
- Source: `packages/core/src/services/pty/api/exit-classification.ts`.

### Tmux integration and persistence identity
Each terminal is (when tmux is enabled for the workspace) backed by a named tmux session so its scrollback and running process survive app restarts and reconnects.
- Session resolution order (`resolveTmuxSession`): (1) an existing tmux session whose recorded identity metadata matches, (2) a session under the *legacy* name scheme (`makeLegacyTmuxSessionName`), (3) otherwise the *current* name scheme (`makeTmuxSessionName(identity, label)`), created if absent.
- `findTmuxSessionNamesByIdentity` and `listTmuxSessionActivity`/`parseTmuxSessionActivity` (keyed either by session name or `identity:<id>`) support batch lookups and "last activity" timestamps used for staleness/liveness.
- Source: `packages/core/src/services/pty/api/tmux.ts` (+ `tmux-commands.ts`, `tmux-identity.ts`, sibling `.test.ts` files for exact naming rules).

### Terminal shell / env / attachment plumbing (backend)
- Terminal creation resolves shell via explicit param → app `terminal.defaultShell` setting; env is composed from the task's launch-context env vars plus a "color env" (`terminalShell.getColorEnv()`), and — new in this slice — per-session git credentials from the project's "agent git credentials" setting are threaded into the terminal spec (`gitCredentials`).
- Deleting a terminal removes its DB row and kills the runtime session (best-effort; failure is swallowed).
- `terminal_created` / `terminal_deleted` telemetry events are captured with `terminal_id`/`project_id`/`task_id`.
- Source: `apps/emdash-desktop/src/core/features/terminals/node/wire-controller.ts`.

## Editor

### File tabs, dirty state, saving
Opening a file creates (or reuses, ref-counted) an `OpenFileEntry` in a single app-global `OpenFileStore` — the same file opened from two different workspaces, or the file tree and a chat link, shares one entry.
- A tab shows a small filled-circle dot with `title="Unsaved changes"` when the buffer's text differs from the last-known disk text; the dot fades on tab hover (`group-hover:opacity-0`) as the close "×" takes its place.
- **Save**: ⌘/Ctrl+S; **Save all**: ⌘/Ctrl+Shift+S (Monaco `addCommand`).
- Autosave-for-crash-recovery: every buffer edit debounces a background write of the raw buffer text (not a real save) after **2000 ms** (`BUFFER_AUTOSAVE_DEBOUNCE_MS`) so an app crash before an explicit save doesn't lose the edit; this clears on a real save or discard.
- A file's first content load has a **10-second** deadline (`FIRST_LOAD_DEADLINE_MS`); if no content state arrives in that window the entry flips to `error(unavailable)` (still auto-recovers if content shows up late).
- Once nothing is holding interest in a file's buffer/disk facets, they linger for **15 seconds** (`OPEN_FILE_LINGER_MS`) before being torn down — except a *dirty* buffer, which never auto-evicts (only re-evaluated after save/discard).
- Save uses an etag precondition: a stale etag on write is classified as a `conflict`, which sets `entry.conflicted = true` and surfaces the "File Modified Externally" dialog (see below) rather than silently overwriting.
- Renaming/moving a file re-keys its `OpenFileEntry` (`rekey`) in place: dirty text carries over via a temporary crash-recovery buffer write under the new URI, then all facet handles and wire subscriptions restart under the new identity.
- Source: `apps/emdash-desktop/src/core/features/editor/api/browser/open-file-store/open-file-store.ts`, `.../browser/task-editor/file-tab-item.tsx`, `.../browser/monaco/editorConfig.ts`.

### "File Modified Externally" conflict dialog
Shown when a save collides with an on-disk change made outside the editor while there are unsaved edits.
- Title: **"File Modified Externally"**. Body: *"`<last two path segments>`* was changed outside the editor while you have unsaved edits. What would you like to do?"* (path is code-styled, truncated to its last two segments).
- Two buttons: **"Keep Mine"** (secondary — overwrites disk with the buffer) and **"Accept Incoming"** (primary — discards the buffer edits and reloads from disk). No close button; the dialog guards against being dismissed without a choice (`setCloseGuard(true)`).
- The same dialog and resolution path is reused by the sticky diff editor's own Ctrl/⌘+S handler when saving a buffer facet shown in a diff.
- Source: `.../browser/task-editor/conflict-dialog.tsx`, `.../contributions/browser/monaco/sticky-diff-editor.tsx`.

### File tab load-state placeholders
While a tab's `OpenFileStore` entry isn't `ready`, the pane shows a centered notice instead of Monaco:
- **Loading**: spinner + "Loading file..."
- **Orphaned** (file deleted on disk while open): file-x icon, "File was deleted on disk", detail "The content comes back automatically if the file is restored." — no retry button; it self-heals.
- **not-found**: "File not found" + Retry button.
- **no-permissions**: "Permission denied" + Retry button.
- **too-large**: "File too large to display in the editor"; if the file is local, an "Open in default app" button (opens via the OS).
- **binary**: "Binary file — no preview" (icon: file-question); local files get "Open in default app".
- **unavailable** (any other seam error): "Could not load file" + Retry button.
- A matching, shorter set of messages is shown as the tab's tooltip suffix when a tab is in an error state (`fileTabErrorTooltip`): "File not found", "Permission denied", "File too large to display", "Binary file", "Could not load file".
- Source: `.../browser/task-editor/file-status-placeholder.tsx`, `.../browser/task-editor/file-tab-item.tsx`.

### File kind detection and preview modes
`getFileKind` maps a file's extension to one of: `image` (`png jpg jpeg gif webp ico bmp`), `svg`, `csv`, `markdown` (`md`/`mdx`), `html`/`htm`, `binary` (a large hardcoded set: `exe dll so dylib wasm zip tar gz bz2 7z rar pdf db sqlite sqlite3 class jar pyc o a lib bin dat pkg dmg iso ttf otf woff woff2 eot mp3 mp4 wav ogg webm mov avi`), or `text` (default, opened in Monaco). SVG/Markdown/HTML/CSV default to a rendered "Preview" mode with a "Raw"/"Preview" toggle in the tab's toolbar (`ToggleGroup`, labels "Raw" and "Preview"); the diff viewer treats `binary`/`image`/`svg` files as non-text (images render as `<img>`, everything else in `binary` shows the binary notice).
- **Image preview**: `<ExpandableImage>` (click-to-expand) for raster and SVG files; empty SVG shows "Empty file".
- **CSV preview**: rendered as an HTML table; capped at **1000 rows** and **100 columns** (`MAX_PREVIEW_ROWS`/`MAX_PREVIEW_COLUMNS`), with a footer note like "Preview capped at 1,000 rows and 100 columns." when truncated; empty file shows "Empty file"; empty header cells fall back to "Column N".
- **Markdown preview**: rendered with the shared `Markdown` component; relative image `src`s and relative links are resolved against the workspace and the file's own path; clicking a resolved workspace link opens that file as a non-preview tab.
- **HTML preview**: rendered in a sandboxed `<iframe sandbox="allow-scripts">` (no `allow-same-origin`, so it can't read host cookies/localStorage). `<link rel=stylesheet>`, `<script src>`, and `<img>`/`<picture><source>` references (including `url(...)` inside inlined CSS) are resolved from the workspace and inlined as data — no live network fetches. An injected script intercepts in-page anchor clicks and form submits (`e.preventDefault()`), posting the click back to the host via `postMessage`; clicking a link to another `.html`/`.htm` file in the workspace opens it as a new tab. Shows "Loading preview…" while reprocessing, "Empty file" for empty content.
- **Binary preview**: file-question icon, filename, extension label ("`EXT` file"), "Binary file — no preview available".
- Source: `.../api/browser/renderers/fileKind.ts`, `.../browser/renderers/{csv-renderer,csv-parser,svg-renderer,image-renderer,binary-renderer,markdown-renderer}.tsx`, `.../contributions/browser/renderers/html-renderer.tsx`, `.../browser/task-editor/file-content-toolbar.tsx`.

### Monaco editor configuration
- TypeScript/JavaScript language service is configured to match the app's own `tsconfig` shape (ES2020 target, `dom`/`dom.iterable` libs, strict, `ReactJSX`, the app's own path aliases `@/*`, `@core/*`, `@renderer/*`, `#types/*`) but with **semantic validation disabled** (only syntax validation), since Monaco here has no real project/type graph and semantic errors would be misleading; `setEagerModelSync(true)` for both TS and JS.
- Editor defaults: quick-suggestions on for "other" and strings (off for comments), suggestOnTriggerCharacters on, parameter hints on, word-based suggestions off, suggestions restricted to keywords/snippets/classes/functions/variables.
- Theme: two custom Monaco themes (`custom-dark` based on `vs-dark`, `custom-light` based on `vs`) built by reading `--monaco-*` CSS custom properties off the app's own light/dark theme classes (`emlight`/`emdark`) and converting to hex — editor background/foreground, line highlight, line-number color, gutter, diff insert/remove backgrounds/borders, unchanged-region background, diff border/diagonal-fill, selection/inactive-selection colors. So the editor always matches the app's live theme rather than a fixed Monaco palette.
- Diff editor: split or unified (`renderSideBySide`), read-only by default, word-wrap on both content and diff gutter, smooth scrolling + smooth caret, glyph margin on, folding off, `hideUnchangedRegions` explicitly disabled (comment: collapsed unchanged regions break drag-selection across large diffs — bug `ENG-1248`), 3 overview-ruler lanes.
- Source: `.../browser/monaco/{editorConfig,monaco-config,monaco-themes}.ts`.

### Diff editor (sticky, buffer-aware)
The diff view (`StickyDiffEditor`) resolves each side (original/modified) against the same `OpenFileStore` facets as the plain editor — a git ref facet for "before", the live editable buffer facet for "after" — so editing the modified side of a diff is the same save/dirty/conflict machinery as a normal tab, including the "File Modified Externally" dialog on a stale-etag save. A side resolves to an intentionally blank half (not an error) when: the ref doesn't contain the path (added file) or the working file is gone (`orphaned`/`not-found`) — otherwise it stays pending until ready. Viewport (scroll/cursor) is saved per URI pair and restored when returning to the same diff; the first render reveals the first changed line unless a saved viewport exists or `revealFirstChange` is disabled (used for stacked diffs).

### Read-only states
A buffer is forced read-only whenever `content.readonly` is true from the file content seam (e.g. read-only filesystem entry), and every facet other than `buffer` (the git/disk mirror facets) is always read-only.

### File tree — create, rename, move, delete, drag & drop
Lives as the editor's sidebar file tree (`EditorFileTree`); reveal button label is platform-specific: **"Show in Finder"** (mac), **"Show in File Explorer"** (Windows), **"Show in File Manager"** (Linux) — computed once from `detectPlatformContext().os`.
- **New File / New Folder** header buttons start an inline draft row (esc-cancelable); their tooltip becomes the live-actions-disabled reason when disabled. Creating shows toast `"File created"` / `"Folder created"`.
- **Rename**: inline; command `editor.fileTree.rename`, shortcut **Mod+Shift+R**, requires exactly one selected item (otherwise disabled with reason "Select one item", or the live-action-disabled reason). Toast `"File renamed"` / `"Folder renamed"`.
- **Cut** (`editor.fileTree.cut`, **Mod+X**) / **Copy** (`editor.fileTree.copy`, **Mod+C**) / **Paste** (`editor.fileTree.paste`, **Mod+V**) work on the current selection (or the right-clicked node if nothing selected) via an in-memory clipboard (`{mode:'cut'|'copy', paths}`), not the OS clipboard. Toasts: `"Item cut"` / `"N items cut"`, `"Item copied"` / `"N items copied"`, `"Item moved"` / `"N items moved"`, `"Item copied"` / `"N items copied"` (paste-as-copy). Pasting into the same directory a cut item is already in is a no-op for that item; name conflicts on paste get a generated non-conflicting name (`copyNameForConflict`). Cut items are shown muted (dimmed row) in the tree until pasted or the clipboard is cleared.
- **Delete** (`editor.fileTree.delete`, **Mod+Backspace**) opens a confirm dialog: title **"Delete folder?"** / **"Delete link?"** / **"Delete file?"** for a single item, or **"Delete N items?"**; description explains folders delete recursively ("...and all of its contents will be deleted from the workspace."), symlinks only remove the link ("Its target will not be deleted."), and multi-select lists every path. Confirm label **"Delete"**, destructive styling. Deleting closes any open tabs under the deleted path(s) and clears selection; toast `"File deleted"` / `"Folder deleted"` / `"Link deleted"` / `"N items deleted"`.
- **Copy Contents** (only for openable/text nodes) reads up to **10 MB** (`MAX_COPY_FILE_BYTES`) and copies the text to the OS clipboard; over that or on truncation shows toast error "Copy failed" / "File is too large to copy."
- **Copy path** / **Copy relative path** copy the resolved real path or the workspace-relative path; toasts `"Path copied"` / `"Relative path copied"`.
- **Show in Finder/Explorer/Manager** (hidden for SSH-remote workspaces).
- Drag & drop: internal drag reorders/moves nodes (blocked from moving a node into its own descendant via `canMoveNode`); dropping external OS files imports them (uploads), rejecting any single file over **10 MB** (`MAX_FILE_UPLOAD_BYTES`, shared with the import-conflict flow below) with toast `"Import failed"` / `"<name> exceeds the 10 MB upload limit."`; multiple dropped files with the same destination name also fails with `"Multiple dropped files have the same destination name."` Name conflicts with existing files prompt **"Replace existing file?"**/**"Replace existing files?"** (confirm label **"Replace"**, destructive) before overwriting.
- Git-status decoration: file/directory rows tint by git status — added → success (green), modified → warning (amber), deleted/conflicted → error (red, strikethrough + muted), renamed → info (blue); a directory containing any changed descendant shows a small dot ("Contains emphasized items").
- File tree respects a `files` settings key with `treeExclude`/`searchExclude`/`watcherExclude` glob/segment lists (defaults: tree hides `.git`, `.DS_Store`, `Thumbs.db`; search additionally hides `node_modules`, build/output dirs, VCS dirs, various tool caches, and every known agent-tool config dir — `.claude .cursor .codex .aider .continue .cody .windsurf .devin .amp`, plus `worktrees`/`.worktrees`/`.emdash`; watcher ignores `.git/objects`, `.git/subtree-cache`, `node_modules`, `.hg/store`). **Note: this is a fixed exclusion list, not actual `.gitignore` parsing/respect** — no `.gitignore`-aware filtering was found in this slice.
- Header toolbar: search field (`aria-label`/`placeholder` "Search", max length from `FILE_SEARCH_MAX_QUERY_LENGTH` = 512), New File, New Folder, Collapse All, Refresh (spinning icon while refreshing) — each disabled (with tooltip = disabled reason) when live actions are unavailable.
- "Files unavailable" empty state when the tree hasn't been observed / is unavailable, with the live-action-disabled reason or "The file tree has not been observed yet."
- A stale-but-cached tree (host reachable again but data not yet refreshed) shows a thin banner with the disabled reason.
- Source: `.../contributions/browser/editor-file-tree.tsx`, `.../contributions/commands.ts`.

### External-editor "open in" / reveal
"Reveal File" is offered from a file tab's kind-menu (for in-workspace files) and jumps back to the file tree, scrolling/selecting it. Files that are too-large or binary offer "Open in default app" (local files only — routes through the OS's default handler, not a specific external editor).

## Files (main-process policy)

- `workspace-file-policy.ts` and `realpath-containment.ts` (in `src/main/core/files/`) enforce path containment — files/paths are validated against symlink-resolved real paths so operations can't escape the intended root (details not fully re-derived here; flagged for a security-focused follow-up read if needed).
- `file-errors.ts` maps low-level `FsError`s to user-facing messages via a shared `fsErrorMessage` helper in `runtime-broker/node/files` (message catalog not read in this pass — see Unverified).

## Search

### Quick open (files) — command palette `@files`
Typing `@files` (or matching via fuzzy text) in the command palette searches workspace files.
- Minimum query length **2** characters; results capped at **20** (`FILE_SEARCH_LIMIT`).
- Each row shows the filename, its relative path as a muted subtitle, and the file's icon; selecting opens it.
- Source: `apps/emdash-desktop/src/core/features/workbench/contributions/browser/file-palette-provider.tsx`.

### Full-text content search (in a file tree's search box)
Typing into the editor sidebar's search field (once it has content) replaces the tree with search results instead of a filtered tree.
- Debounced **200 ms** (`SEARCH_DEBOUNCE_MS`) before a search job starts; queries are capped at **512 characters** (`FILE_SEARCH_MAX_QUERY_LENGTH`).
- Progress streams in live (partial file results merge in as they arrive) while `isSearching` shows a spinning loader next to a running result-count summary: `"N result(s) in M file(s)"`.
- Empty state: **"No results found"**. Error state shows the raw error message, centered.
- If the underlying search job reports incomplete results (hit some internal cap), a footer banner reads: **"Results were limited. Refine your search to see more."**
- Clicking a match opens the file (non-preview) at that exact line/column and focuses the main pane.
- Source: `apps/emdash-desktop/src/core/features/editor/browser/task-editor/file-content-search.tsx`.

### Entity search index (tasks/projects/conversations)
A background SQLite FTS-backed index (`search_index` table) keeps tasks, projects, and conversations searchable for other palette flows: exact title match ranks first, then prefix match, then substring, then a fuzzy "letters in order" pattern; results are capped to a caller-supplied limit (clamped 1–100, default 50). With an empty query it instead returns "recents" — the 10 most recently interacted-with tasks (optionally scoped to a project) and, if a task is in context, its 10 most recently active conversations. The index is kept live by listening to task/project/conversation create/rename/delete/archive events, and lazily backfilled once if the table is empty on startup.
- Source: `apps/emdash-desktop/src/core/features/search/node/search-service.ts`.

## In-app browser

### URL bar, navigation, loading state
Toolbar: Back / Forward (disabled per `canGoBack`/`canGoForward`), a combined Reload/Stop button (icon swaps between refresh and a stop-square, tooltip "Reload"/"Stop" depending on `isLoading`), a favicon-or-globe-prefixed URL input (`aria-label="Browser URL"`, `placeholder="Search or enter URL"`, loading spinner suffix while navigating), a "Copy screenshot" button (disabled while on the blank start page or loading; icon does a 300ms 90°-rotate flourish on click), and an overflow "…" menu.
- URL normalization: `about:blank` passes through; bare search-looking text (no dot, has a space, or an unsupported/absent scheme) is sent to Google search (`https://www.google.com/search?q=...`); `localhost`/`127.0.0.1`/`[::1]`/`*.localhost` get an implicit `http://`; anything else gets an implicit `https://` unless it already has an explicit scheme. Rejections map to inline messages: empty → **"Enter a URL"**; unsupported file URL → **"File URLs are not enabled for this browser"**; unsupported protocol → **"This URL scheme is not supported"**; otherwise → **"Enter a valid URL"** (surfaced as a screen-reader-only `role="alert"`, not a visible inline error under the field).
- Source: `.../browser/browser-toolbar.tsx`, `apps/emdash-desktop/src/core/primitives/browser/api/browser.ts`.

### Load-error page (net-error translation)
A subset of Chromium `net::ERR_*` codes are translated into a human page shown in place of the webview:
- Name not resolved / resolution failed → **"This site can't be reached"** / "`<host>`'s server IP address could not be found."
- Connection refused → same heading / "`<host>` refused to connect."
- Timed out / connection timed out → same heading / "`<host>` took too long to respond."
- Connection reset/closed/failed → same heading / "The connection to `<host>` was interrupted."
- Address unreachable → same heading / "`<host>` is unreachable."
- Internet disconnected → **"No internet"** / "You appear to be offline."
- Network changed → **"This site can't be reached"** / "Your network connection changed."
- SSL protocol error / insecure response → **"This site can't provide a secure connection"** / "`<host>` sent an invalid response."
- Cert common-name/date/authority invalid → **"Your connection is not private"** / "`<host>`'s security certificate is not trusted."
- Invalid URL → **"This site can't be reached"** / "The web address isn't valid."
- Fallback (unmapped code) → **"This site can't be reached"** / the raw Electron error description, sentence-cased, or "`<host>` could not be loaded." if the description is empty or just a constant name. The numeric/constant error code (e.g. `ERR_CONNECTION_REFUSED` or `Error -105`) is appended in parentheses.
- Page offers **Reload** and **Open externally** (disabled unless the URL is http/https) buttons.
- Source: `.../browser/browser-load-error.ts`, `.../browser/browser-pane.tsx`.

### Start page (local dev servers)
When the current URL is `about:blank` and not loading, a start page lists detected local dev servers (filtered to `localhost`/`127.0.0.1`/`::1`/`*.localhost` hosts) under a **"Local servers"** heading, each as a clickable row with a globe icon, a live-indicator dot, a formatted title ("Port `<port>`" for bare localhost/127.0.0.1 addresses, otherwise `host:port`), and the full address as a subtitle. Empty (no detected servers) shows nothing beyond the (also empty) heading area — no explicit "nothing here" copy was found.
- Source: `.../browser/browser-start-page.tsx`.

### Overflow menu (⋯)
- **Open externally** (disabled unless URL is http/https) — hands off to the OS default browser.
- **Force reload** (bypasses cache).
- **Open DevTools** — dev-build only (`import.meta.env.DEV`).
- **Browser profile** submenu: radio list of configured profiles plus a fixed **"Isolated per task"** entry (separate, per-task-scoped storage partition), and a **"Manage profiles…"** item that navigates to Settings → Browser tab.
- **Zoom** row: −/+ buttons and a reset button (disabled at min/max or already-default), percentage readout. Discrete zoom steps: `25, 33, 50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200, 250, 300, 400, 500` (%) — default 100%.
- **Clear cookies**, **Clear cache** (each reloads on success) and **Clear browser storage** (opens a confirm dialog first: title **"Clear browser storage?"**, description "This clears cookies, local storage, IndexedDB, and cache for `<profile>`. Browser tabs using the same storage boundary will be signed out.", confirm label **"Clear Storage"**, destructive). Failure toast: **"Could not clear browser data"** / "Try again, or reload the browser view manually." (or the thrown error's message).
- Screenshot: on success, toast **"Screenshot copied to clipboard"**; on failure, **"Could not capture screenshot"**.
- Source: `.../browser/browser-toolbar.tsx`, `.../browser/browser-toolbar-actions.ts`.

### Diagnostics panel
A collapsible strip under the webview shows up to the last 50 console/navigation/network diagnostic entries for the active browser session (title **"Diagnostics"**, a **"Clear"** button). Each row shows a level icon (error = red alert-circle, warning = yellow triangle, info = muted info icon), a source label (`console`/`navigation`/`network`), the message, and, if present, the offending URL. It renders nothing at all when there are zero entries (no persistent header/toggle).
- Source: `.../browser/browser-diagnostics-panel.tsx`.

### Browser session model
- Profiles: a default named profile (`Default`) plus any user-configured ones, or an isolated-per-task partition; partition names are derived deterministically (`persist:emdash-browser-...`), with the isolated variant keyed by project/workspace/task id components (sanitized to `[a-zA-Z0-9_-]`).
- Cross-window/tab shortcut event: a global `tab-navigation-shortcut` routes to the browser pane's own "next/previous tab" scope command, scoped to the specific `browserId` that received the shortcut.
- **No element-picker / inspect-and-annotate-to-agent feature was found** in this codebase slice — the brief's description of "element picking/annotation sent to the agent" does not match anything under `features/browser`; see Unverified.
- Source: `apps/emdash-desktop/src/core/primitives/browser/api/browser.ts`, `.../browser/browser-pane.tsx`.

### Settings
`browser` app-settings key: `defaultProfileId` (default `default`), `relaxCorsForLocalhost` (default false), `profiles` (array of `{id, name}`, min 1, default one entry named "Default", ids validated against a slug pattern and can't collide with the reserved `isolated-per-task` id). A second key, `browserPreview`, just toggles whether the in-app browser feature is enabled at all (default `enabled: true`).
- Source: `.../features/browser/contributions/settings.ts`.

## Preview / dev servers

### Detection and kinds
A preview server is either **direct** (a local process bound to a host:port the app can reach directly) or **forwarded** (an SSH port-forward tunnel to a remote workspace's port). Both are keyed by a deterministic identity so the same detected server is deduplicated rather than re-registered (`local:auto:<project>:<workspace>:<host>:<port>` / `ssh:auto:<connection>:<project>:<workspace>:<protocol>:<port>`).
- Status machine (forwarded): `starting` → `ready` (or `not-listening` if a live probe detects the remote port isn't actually accepting connections yet — treated as advisory, so the URL is still clickable as a retry) → `reconnecting` (SSH link dropped) → back to `ready`, or `failed` with a message (e.g. "SSH connection failed to reconnect", "Remote preview port is no longer accepting connections", "Failed to open SSH port forward"). A `reconnected` SSH event with no established local port yet triggers an automatic retry of the tunnel.
- Terminal-sourced servers (detected from output of a task's own terminal / dev-server-launching script) are stopped automatically when their source terminal exits, and "Stop"ping one from the UI interrupts that terminal.
- Source: `apps/emdash-desktop/src/core/features/preview-servers/node/preview-server-service.ts`.

### Preview server pill (task toolbar)
Each detected/forwarded server renders as a small pill: globe icon (or spinner while `starting`/`reconnecting`), a label (`host:port` / "Port `<port>`" for direct servers; `remote <port>` or `<remotePort> -> <localPort>` for forwarded ones), and a chevron opening a dropdown.
- Dropdown header shows "Preview" (micro-label), the resolved URL or **"No local URL"**, for forwarded servers a remote/local port summary line, a red error line if `failed` (the status message), an amber **"Remote port not listening yet"** line if `not-listening`, and the live-action-disabled reason if applicable.
- Actions: **"Open in Emdash Browser"** (opens the in-app browser pane at that URL), **"Open in System Browser"**, **"Copy URL"**, (forwarded only) **"Restart Forward"**, and a destructive **"Stop"**. Each disabled state mirrors the pill's own availability (`canOpen`/live-actions-disabled).
- Pill background color communicates status: info-tinted (blue) when `ready`, warning-tinted (amber) for `starting`/`not-listening`/`reconnecting`, destructive-tinted (red) for `failed`.
- Source: `apps/emdash-desktop/src/core/features/tasks/browser/components/preview-servers/preview-server-pill.tsx`, `.../preview-server-format.ts`.

### Manual port forward dialog
"Forward Port" dialog for SSH workspaces: Protocol select (HTTP/HTTPS, default HTTP), numeric Remote port field (placeholder "5173"), numeric Local port field (placeholder "Auto", optional — server picks a free local port if left blank). Ports are validated to the 1–65535 integer range client-side ("Enter a remote port between 1 and 65535." / "Enter a local port between 1 and 65535."). Submit button reads **"Forward"**, becomes **"Forwarding..."** while in flight; server-side failures (`not-ssh-workspace`, `host-unavailable`, `not-configured`, `project-unavailable`, `open-failed`, `cancelled`) surface their own message text inline.
- Source: `.../preview-servers/manual-forward-dialog.tsx`.

## Library (reusable prompts)

"Library" is a per-user list of reusable prompt templates that can be inserted into a task's prompt composer from its prompt menu — not a code snippet or file library.
- Page header: **"Prompts"** / "Manage reusable prompts that can be sent from task prompt menus."
- Each row shows the prompt's title and a one-line-clamped preview of its text, with hover-revealed Edit (pencil) and a "⋯" menu (**"Edit…"**, destructive **"Delete…"**).
- **New Prompt** button (icon-only below a container width breakpoint) opens the prompt editor modal.
- New/Edit modal: title **"New Prompt"**/**"Edit Prompt"**, a required **Title** field (placeholder "Security review"), a required **Prompt** textarea (placeholder "Write the prompt agents should receive.", min-height ~14 lines, resizable, scrolls past 50vh), **Cancel**/**Save** (Save disabled until both fields are non-empty after trimming).
- Deleting opens a confirm dialog: **"Delete prompt?"** / "`<title>` will be removed from the prompt library." confirm label **"Delete"**.
- Toasts: **"Prompt added"**, **"Prompt updated"**, **"Prompt deleted"**.
- Search box placeholder **"Search prompts…"**; empty states: **"No prompts match your search"** / "Try a different title or prompt text." when a search yields nothing, or **"No prompts"** / "Add a prompt to reuse it from task prompt menus." when the library is genuinely empty (library icon shown above either).
- Source: `apps/emdash-desktop/src/core/features/library/browser/prompts/{prompt-library-view,prompt-modal,prompt-library-list-model}.tsx`.

## Catalog (skills + MCP registry — backend only in this slice)

`CatalogService` is the data source behind the (out-of-scope-here) Skills and MCP features: it is **not itself a user-visible screen** in `features/catalog` — there is no `browser/` folder under it, only `api` (wire contract + browser client) and `node` (service + wire controller).
- **Skills catalog**: served from a bundled JSON fallback (`bundled-catalog.json`) or a disk-cached, versioned (`CATALOG_VERSION = 2`) refresh that merges skills scraped from `github.com/openai/skills` (`.curated`/`.system` dirs, reading each skill's `agents/openai.yaml` for display name/description/icon/brand color/default prompt where present, else falling back to the `SKILL.md` frontmatter description) and `github.com/anthropics/skills`. A live search against **skills.sh** (`https://skills.sh/api/search`) is also supported, capped at 24 results, deduped, restricted to GitHub-sourced entries, with a 5-minute in-memory cache per query and a 200-entry LRU-ish per-skill content cache. Search accepts either a plain query or a pasted `skills.sh/...` URL (the trailing path segment is extracted).
- **MCP catalog**: a static curated list (bundled) merged with live results from the public MCP registry (`https://registry.modelcontextprotocol.io/v0.1/servers`, 1-hour cache per base-URL+search key), defaulting to "featured only" (static list). Registry entries are converted to a runnable default config: prefers a declared remote HTTP URL, else an npm package (`npx -y <pkg>[@version] [args...]`); entries that are neither are dropped.
- All outbound HTTP is a hand-rolled `https.get` with a **15-second** timeout, a max of **5 redirects**, and a response-size cap (**2 MB** default, overridable per call — the MCP registry fetch allows up to **8 MB**).
- Source: `apps/emdash-desktop/src/core/features/catalog/node/catalog-service.ts`.

## Unverified / unclear

- **PTY exit UI**: `isUnexpectedPtyExit` classifies exits, but no in-terminal banner text ("Process exited" or similar) was found in this slice's files — it likely renders from `packages/core/src/runtimes/terminals/` or the desktop host layer, which was only partly read. Flagged rather than guessed.
- **File-system error message catalog** (`fsErrorMessage` in `runtime-broker/node/files`) was referenced but not opened — the exact wording of each `FsError` variant's user-facing message is unverified.
- **Workspace file containment policy** (`workspace-file-policy.ts`, `realpath-containment.ts`) exists but its exact rules/error text weren't read in depth (out of the "user-visible text" grain and flagged as security-sensitive by `AGENTS.md`, so treated as read-only reconnaissance rather than full transcription).
- **Element picking / annotation sent to the agent, and screenshots** from the in-app browser: the brief describes this as in-scope, but no picker/inspect/annotate code exists under `features/browser`. A "Copy screenshot" toolbar action exists (copies to the OS clipboard) but nothing that selects a DOM element and hands it to an agent. This may live in a different, out-of-scope slice, or may not exist at all in v1.2.6 — flagged rather than assumed.
- **Terminal bell** (visual/audio bell on `\a`) — no explicit bell-handling code was found in the files read; xterm.js's default bell behavior may or may not be overridden elsewhere in the runtime layer not covered by this pass.
- **tmux session naming exact formats** (`makeTmuxSessionName`/`makeLegacyTmuxSessionName`) were referenced but their precise string format wasn't opened — only their role in resolution order is confirmed.
- **Quick-open beyond `@files`**: the workbench command palette has other providers (`commands-palette-provider`, task/dev-perf palette contributions) that were not opened, since they sit in `features/workbench`/`features/tasks`, not the assigned slice; only the file-search-specific `@files` provider was read as directly relevant to "search."

## Coverage note

Read every file under the assigned `terminals`, `editor`, `files`, `search`, `browser`, `preview-servers`, `library`, and `catalog` browser/API/node trees except test files, plus the directly-relevant `packages/core/src/services/pty/api/*` and `packages/core/src/primitives/exclusion-policy` files. Deliberately did not open: `packages/core/src/runtimes/terminals/` internals beyond the contract/worker file names (backend job/worker plumbing, not user-facing), the full `agent-status`/ACP integration (out of scope), and files under `src/main/core/preview-servers/dev-server-bridge.ts` beyond a grep (detection heuristics for what counts as a "dev server" from terminal output — likely the single richest remaining vein if more detail is wanted on preview-server *detection*, as opposed to the display/control surface fully covered here).
