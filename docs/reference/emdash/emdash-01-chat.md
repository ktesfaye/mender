# Chat and conversations

This catalogs every user-facing feature of Emdash's chat/conversation experience: the ACP chat composer and transcript (`packages/chat-ui`, `packages/ui/.../chat-composer`, `packages/ui/.../prompt-editor`), the conversation lifecycle chrome around it, and the legacy PTY/TUI conversation surface, as found in the running source (not inferred from names).

## Composer — input area

### Text entry (PromptEditor)
A TipTap/ProseMirror rich-text box that looks like plain text but supports inline chips for @-mentions and /-commands, auto-grows to a max height, and copies as plain text.
- Reach: the line at the bottom of every conversation/session board.
- Placeholder text, in priority order: disabled → `"Session closed"`; working → `"Add a follow-up"`; otherwise the host's override or the default `"Send a message, tag @files or use /commands"`. (`packages/ui/src/react/components/chat-composer/index.tsx:875-879`; base editor placeholder default is `"Message…"` per `prompt-editor.tsx:157` when no composer wraps it.)
- Enter submits (default `submitShortcut: 'enter'`); Shift+Enter always inserts a hard line break; `Mod-Enter` (Cmd/Ctrl+Enter) submits only when the shortcut setting is configured to `mod-enter`. A `'none'` setting exists (no default binding). When a mention/command suggestion popup is open, Enter/arrow keys are consumed by the popup instead of submitting. (`prompt-editor/extensions/submit-keymap.ts`, `types.ts:113`)
- Disabled state: `aria-disabled` on the editor; still visible, not typeable in practice since composer isn't shown at all until history is known (see Session/loading states below).
- Submitting with only attachments and no text is allowed ("image-only sends"); submitting with neither text nor an image attachment is a no-op.
- While the agent `isWorking`, calling submit does not send — it calls `onSubmitWhileWorking` (queues the prompt) if provided by the host, otherwise the attempt is silently ignored.

### Send / Stop button
Single round icon button, right end of the toolbar.
- Idle/ready: up-arrow icon, `aria-label="Send message"`. Disabled when `disabled` or (`!isWorking && !canSubmit`).
- Working (agent generating) and nothing queueable: switches to a red/destructive round button with a stop-square icon, `aria-label="Stop generation""`, calls `onStop`.
- Working and there is text/an image ready to queue (`canQueuePrompt`): button stays the up-arrow but `aria-label="Queue message"` — pressing it hands the prompt to `onSubmitWhileWorking` instead of stopping the turn.
- `showSubmitButton=false` hides the control entirely (used for draft-only composer surfaces).

### Attach button
Ghost icon button (paperclip), `aria-label="Add attachment"`, shown only when `onAttach` is provided (ACP conversations with live actions enabled). Opens the OS file picker (hidden `<input type="file" multiple>`).

### Drag-and-drop / paste attachments
- Dropping files onto the composer shell sets a `dragActive` visual state (via `composerShell({ dragActive })`) while dragging over it.
- Dropped/pasted images: default path creates a `data:` URL preview attachment client-side (via `FileReader`); a host can override with `onImageFilesDropped` to control upload itself (ACP does — uploads through the attachments client).
- Non-image dropped files become `@`-path mentions inserted into the editor rather than attachments, resolved against the workspace and inserted with `insertMention`.
- Paste of image data: only intercepted (`preventDefault`) when the clipboard has no accompanying `text/*` type, so pasting an image alongside text doesn't eat the text.
- ACP-specific unsupported-image toast: title `"Unsupported image format"`, description `"{names} could not be attached. Use PNG, JPEG, GIF, or WebP."` — ACP attachments only accept PNG/JPEG/GIF/WebP (`packages/plugins`… no; source: `acp-dropped-file.ts` mime allow-list + `acp-chat-panel.tsx:366-369`).
- ACP file-mention upload failure toast: title `"Failed to attach file"`, description `"{name} has no target Host path."` (`acp-chat-panel.tsx:341-345`).
- Image attachment thumbnails: shown in a strip above the editor; each has a "view" button (`aria-label="View image: {name}"`) opening the app's image viewer dialog, and a small remove "×" button (`aria-label="Remove {name}"`). Removing an ACP attachment also calls the host to delete the uploaded copy and revokes the local object URL.
- Image-kind draft attachments persist across app restarts (see Drafts below) and are re-fetched as data URLs on reload; if the attachment is gone server-side it silently drops from the draft, otherwise it's marked "unavailable" (kept, but without a preview) on transient failure.

### @ mentions
- Trigger: typing `@` anywhere in the message opens a popup (`ComboboxPopup`, "wide" layout) listing suggestions, narrowing as you type; `allowSpaces: false` so the token stops at the first space.
- Kinds: `file`, `issue`, `symbol`, `custom`, each with its own default icon (File/CircleDot/Braces/AtSign glyphs) unless the item or a host `renderMentionIcon` supplies one. File mentions get a devicon-style file-type icon when resolvable.
- ACP mention source (`acp-chat-panel.tsx`): combines — a pinned linked-issue (if the query matches it) first, then workspace file search results (min none, searched via the search client against the task's workspace), then issue-provider search results (only queried once the query is ≥2 chars, capped at 20 results; provider chosen from the project's selected issue provider or first connected provider), de-duplicated by mention id.
- Selecting a mention inserts an atomic "chip" node; it serializes to plain text as `@label` (or `@"label"` when the label contains spaces/special characters) so copy/paste and the wire payload stay plain text.
- Clicking a mention pill in a **sent** transcript message: file mentions open the file in an adjacent editor pane; issue mentions resolve the issue's URL via the issue client and open it externally.
- Workspace-file mentions in agent-authored text (not composed by the user) are also auto-recognized: any token containing `/` or `.` is heuristically treated as a file path and rendered as a file mention pill in the transcript, even if the agent didn't literally emit a mention node (`workspace-file-mention-provider.ts`).

### / slash commands
- Trigger: typing `/` opens a popup ("stacked" layout) of command entries, sectioned into `"Commands"` (agent-advertised ACP commands) and `"Prompts"` (the user's saved prompt library), each row showing name + description (prompts show the first line of the saved prompt text as the description).
- Selecting a `"Commands"` entry inserts a `/name` chip that, on submit, is sent to the agent as-is (`behavior: 'insert'`).
- Selecting a `"Prompts"` entry (`behavior: 'insert-text'`) inserts the prompt's full raw text directly into the editor (not as a chip) — it becomes ordinary editable text.
- A third behavior, `'execute'`, exists in the model (deletes the trigger range and calls a host callback with no node inserted) but no host in this scope currently supplies execute-type slash items (only the two behaviors above are wired for ACP chat).
- Only commands the *live* ACP session currently advertises are rendered as chips elsewhere in the transcript (e.g. if the agent's own conversation history references `/foo`), via a per-conversation registry (`advertised-command-provider.ts`) — a `/token` that isn't in that list renders as plain text, not a chip.
- Command popup items filter by substring match against name, label, and description, case-insensitively.

### Agent selector
- Shown only when there are agent options and no model list (i.e., collapses away once a model selector is present — see toolbar layout note below).
- Unlocked: an icon-trigger combobox; search box placeholder `"Search agents…"`; items grouped by an optional `groupLabel` (e.g. "Installed" / "Not installed"); disabled items are shown but not selectable.
- Locked (`agentLocked`, always true for ACP chat once created): renders as a static disabled icon button; its title/aria-label is `"{agent name} — agents can't be switched after a conversation starts"`. ACP hard-locks the agent for the life of a conversation.

### Model selector
- A combobox-with-detail-popover keyed by model id; trigger shows the agent icon + selected model name (+ the selected effort name in muted text alongside it, e.g. "Sonnet 5  High"); placeholder `"Model…"` when nothing selected.
- Search placeholder inside the popup: `"Search models…"`.
- Hovering/selecting a model in the list shows a detail card: model name, optional description, and up to three feature rows — `"Context"` (formatted window size: "…M tokens" / "…K tokens" / raw), `"Speed"` and `"Intelligence"` each rendered as a 5-dot bar meter (`BarMeter`, filled dots = round(value×5)).
- A footer row inside the model popover, shown only when effort options exist: `"Effort"` label with the current effort name (default label `"Default"`) and a chevron opening a nested radio submenu of effort levels.
- Changing model or effort persists as a per-host/per-provider/per-transport preference (`updateProviderPreference`) so future conversations with that agent default to it.
- Failure toasts: `"Failed to change model"` / `"Failed to change effort"`, with the underlying error message as description.

### Permission mode / Collaboration mode selectors
- Two independent `<Select>` dropdowns, shown only when the agent advertises them (e.g. Codex's Default/Plan collaboration modes). Icons: `ListTodo` for collaboration mode, `ShieldCheck` for permission mode.
- Placeholders: `"Collaboration…"` and `"Permissions…"`. Each item shows name + optional description.
- Whichever of {model, collaboration mode, permission mode} is the leftmost visible control gets a slightly different trigger style (`isFirst` flag) to sit flush with the toolbar edge.
- Failure toasts: `"Failed to change session mode"`, `"Failed to change collaboration mode"`.

### MCP servers popover
- Shown only when the session reports MCP servers (`mcpServers.length > 0`): a pill trigger with the MCP icon and a count, opening on hover (`openOnHover`).
- Trigger `aria-label`: `"{n} session MCP server(s)"`, appended with `", {n} startup failure(s)"` when any server failed to start; the trigger also carries a `data-failed` flag for a red-tinted style when any server failed.
- Popover content `aria-label="Session MCP servers"`; lists each server's name, an optional transport badge (e.g. "stdio"/"sse"), and — only for a server with a `startupError` — an info icon whose tooltip (`aria-label="{name} startup error"`) shows the raw error text.

### Context-usage indicator (token donut)
- Small ghost icon button showing a circular "donut" progress ring; shown only when `contextUsage.size > 0`.
- Button `aria-label`: `"Context window: {pct}% used"`.
- Ring color: normal foreground color under 90% used; **turns warning-amber (`surfaceWarningForeground` token) at ≥90% used**, both for the ring stroke and the linear bar fill inside the popover.
- Clicking opens a popover: header `"Context usage"`, a `{pct}%` figure beside `"{used} / {size} Tokens"` (values formatted compactly: `1.2M`, `340k`, or raw under 1000), a horizontal usage bar (same 90%-amber threshold), and — only when the session reports a cost — a `"Cost: {formatted currency amount}"` line (localized via `Intl.NumberFormat`, 2–4 fraction digits; falls back to `"{amount} {currency}"` if the currency code isn't recognized).
- Disabled state (e.g. session not live) dims the trigger but keeps it visible.

### Notice band (composer-docked banners)
A thin banner flush above the input, replaced by the permission band when one is pending. Three variants, each with its own background/border/text color token:
- `error` → `surfaceDestructive*` tokens (red).
- `warning` → `surfaceWarning*` tokens (amber).
- `info` → `surfaceInfo*` tokens (blue), the default variant.
- Built-in ACP stop-reason → notice mappings (`stopReasonNotice`):
  - `max_turn_requests` → error, title **"Turn limit reached"**, message *"The agent hit the maximum number of turn requests. Send a new message to continue."*
  - `max_tokens` → error, title **"Response truncated"**, message *"The response was cut off after reaching the maximum token limit."*
  - `refusal` → error, title **"Request refused"**, message *"The agent declined to continue with this request."*
  - `end_turn`, `cancelled`, and any unrecognized reason produce no notice (returns null) — a normal/expected stop is silent.
- A notice can carry an optional dismiss "×" button (`aria-label="Dismiss notice"`); the band animates open/closed (grid-rows 0fr↔1fr tween) and retains its last content through the collapse animation so it doesn't blank mid-exit.

### Permission band (ACP permission requests)
Replaces the notice band entirely while a tool-permission request is pending.
- Icon: shield-alert. Text: **"Allow"** (bold) followed by the request's title, which is the agent-supplied action description verbatim from the ACP tool call (examples in code comments: *"Read a File"*, *"Execute"*).
- Queue counter: when more than one permission request is queued, shows `"(1 of {N})"` after the title (always literally shows position 1, since only the head of the queue is displayed/resolved at a time).
- A split-button of the agent's own offered options (e.g. Allow once / Allow always / Reject once / Reject always, or provider-specific labels), tone-mapped from the ACP `kind`: `allow_*` → accept (green-ish), `reject_*` → reject (red-ish), anything else → neutral. The default pre-selected option is the first `allow_once`, else the first `allow_*`, else the first option overall.
- Resolving a request removes it from the queue and, if the host has an `onSubmitWhileWorking`, doesn't affect the input; the next queued request (if any) replaces the band, resetting the selection to its own default (keyed on request id).

### Queued prompts band
Appears above the permission/notice band whenever the user has one or more prompts queued while the agent is busy.
- Header: **"Queued prompts"** (bold) `"({n})"`.
- Each row: an index number, a drag handle (`aria-label="Reorder queued prompt {n}"`, `title="Drag to reorder"`) for manual reordering via native HTML5 drag-and-drop, the prompt's first-line-ish text (or, for an image-only queued prompt, the literal placeholder **"Image-only prompt"**), and two actions:
  - Send now — up-arrow icon, `aria-label="Send queued prompt now"`, `title="Send now - cancels the active turn"`. If the agent is actively generating, the host wraps this in a confirmation modal: title **"Turn in progress"**, description *"Send this queued prompt now and cancel the active turn?"*, confirm label **"Cancel & Send"** (destructive variant). If the agent isn't currently generating, it sends immediately without confirmation.
  - Delete — trash icon, destructive tone, `aria-label="Delete queued prompt"`.
- Clicking the prompt text (when not already editing) opens inline edit: a textarea replaces the text, autofocused and text pre-selected; Enter (without Shift) saves, Escape cancels, or explicit Save (check icon, disabled until non-empty) / Cancel (X icon) buttons. Editing one queued prompt while another exists doesn't affect the others; if the prompt being edited is removed from the underlying list (e.g. sent) while mid-edit, the edit UI closes automatically.
- Reordering persists via the host's `onReorderQueuedPrompts`, sending the full new id order.

## Transcript rendering (chat-ui)

### Empty conversation hero
Before any message has been sent (`store.isEmpty` and no load error), the composer is centered and a large heading is shown above it: **"What are we building today?"** (h1, `text-2xl`). Once the first message lands, the composer placement animates from center to the bottom (only animates if the conversation was empty at mount and became non-empty in the same session — no animation when reopening an already-active conversation).

### User messages
Rendered as a bordered card (not a plain bubble), right-aligned-content style, with:
- An attachment strip above the text for any image attachments, each a clickable thumbnail (`aria-label="View image: {name}"`); a broken/unresolved image shows a placeholder tile with an "image-off" icon and the file name as a tooltip.
- Full markdown rendering of the message body (see Markdown blocks below).
- Overflow handling: long messages are clamped to a `collapsedMaxH`; clamped state shows a bottom fade-out overlay and the whole card becomes a clickable pointer-cursor "expand" target; expanded state raises the cap to `expandedMaxH` and allows internal scrolling.
- A screen-reader-only mirror of the plain-text content (`class=srOnly`) is always present for accessibility, independent of the visual (possibly collapsed) rendering.
- While this exact message is the one currently being responded to and the agent `turnStatus` is `'generating'`, a stop-overlay button appears on the card itself: `aria-label="Stop generating"`, stop icon.
- **Pinned mode**: when `pinUserMessages` is enabled on the transcript (ACP chat always enables it), the most recent user message sticks to the top of the scroll area as a translucent/blurred strip while you scroll through the agent's response below it, with a 16px fade at its bottom edge signaling more content scrolls underneath. Expand state (collapsed/expanded) is mirrored between the pinned copy and the inline row.

### Agent thinking (reasoning) blocks
Collapsible card with a live elapsed-time header.
- While actively thinking: header text is **"Thinking"** for the first second, then **"Thinking {n}s"**, updating every second; the header row is marked `aria-live="polite"` so screen readers announce updates.
- Once finished: **"Thought briefly"** if it took under 1 second, else **"Thought for {n}s"** (floor of duration/1000); if duration is unknown, just **"Thought"**.
- Collapsed-but-still-thinking state shows a small scrolling preview window (auto-scrolls to the bottom of the streaming reasoning text) rather than nothing; once collapsed and finished, only the header line remains.
- Expanding reveals the full reasoning text as rendered markdown.

### Plan blocks
A checklist-style list of plan entries, each with a status glyph:
- `completed` → green check-style glyph (`--chat-plan-done`, default `#22c55e`).
- `in_progress` → amber glyph (`--chat-plan-active`, default `#f59e0b`).
- `pending` → a neutral/passive glyph, current-color.
- Low-priority entries render at reduced opacity (`0.55`); normal/high priority render fully opaque.
- Each glyph carries an `aria-label` of the status with underscores replaced by spaces (e.g. "in progress").
- Entry text supports markdown (rendered via the same block-stack layout as messages).

### Turn outcome line
A single plain text row appended when a turn ends, colored red (`fgError` token) only for the `error` outcome, muted for everything else:
- `cancelled` → **"Turn cancelled{ (reason)}"**
- `error` → **"Turn failed{ (reason)}"**
- `interrupted` → **"Turn interrupted{ (reason)}"**
- `done` → **"Turn completed{ (reason)}"**
- anything else → **"Turn finished{ (reason)}"**
The `(reason)` suffix is only appended when the underlying outcome carries a reason string.

### "Working…" row
A plain muted text row reading exactly **"Working…"**, shown as a lightweight placeholder while the agent is active with no other more specific status row to show.

### Tool call rendering — generic fallback (`Tool`)
Single-row, no card, no collapse: tool name + optional input summary text, with a running-state text shimmer animation (skipped while `awaitingPermission`). Status glyphs on the right: shield-alert icon (`title="Awaiting permission"`, `aria-label="awaiting permission"`) takes priority over an error icon (`title="{error message}"` or default `"Failed"`, `aria-label="error"`), which only shows for `status === 'error'`.
- Display names by ACP tool kind: `read-tool-call` → the tool's own title; `search-tool-call` → **"Search"**; `mcp-tool-call` → **"MCP"**; `web-fetch-tool-call` → **"Fetch"**; `spawn-subagent-tool-call` → **"Subagent"**; `unknown-tool-call` → the tool's raw name; `tool-group` → the group's own label; anything else → **"Tool"**.
- Input-summary text by kind: search shows `"{query} ({n} matches)"` (match count only if known); MCP shows `"{server}.{tool}"`; web-fetch shows the resolved page title or else the URL; subagent shows `"{name}"` or `"{name} (background)"`.

### Execute (shell command) card
Collapsible card, terminal icon, header = the command's own description if the agent gave one, else the raw command text (monospaced if shown as raw command).
- Collapsed: header-only row in every status (running/success/error).
- Expanded body: bash-syntax-highlighted command line(s) prefixed with `$ ` (continuation lines prefixed with a space), then a blank spacer line, then — if the client-side output buffer dropped earlier lines — a literal truncation marker line reading exactly **"… earlier output truncated"**, then the raw output lines.
- Body is capped at 16 visible lines (`expandedMaxLines`) with vertical scroll when longer, and horizontal scroll (with a thin native scrollbar) when any line's natural width exceeds the card width.
- Error state: error icon in the header, native tooltip = the tool's error message or **"Failed"**.
- Awaiting-permission state: shield-alert icon, tooltip **"Awaiting permission"**.
- Running state: header label text-shimmers (unless awaiting permission).

### File operation (read/edit/delete/move) rows
Verb map shown as the leading word: **Read**, **Edited**, **Deleted**, **Moved**.
- Single-file: one row, `"{Verb} {basename}"`, clickable to open that file (opens at the edited line when known) — unless the op is still in flight and no path is known yet, in which case it shows `"{Verb}…"` with a shimmer.
- Multi-file (batched op with more than one file): collapsible header `"{Verb} {n} files"`; expanding lists each file individually, each independently clickable to open it.
- Same error/awaiting-permission iconography and tooltips as Execute (`"Failed"` default, `"Awaiting permission"`).
- A "preview body" variant exists (auto-scrolls to the newest file as the list grows) used while a multi-file operation is still streaming in files.

### Diff (file create/modify) card
Card header shows the file name (mono, shimmer while running) plus green **"+{adds}"** additions and (implicitly, by symmetry with adds — see diff.css) a deletions count, and the same error/awaiting-permission iconography.
- Body: syntax-highlighted unified-diff-style preview, capped to 8 lines of context (`maxLines: 8`, `context: 1`) with a truncation flag when the real diff is longer than what's previewed.
- A tool call still streaming its new content in with nothing yet to show renders header-only (no body) until content arrives.
- Clicking the header opens the file (`onOpenFile`, source `'diff'`).

### Subagent card
A dedicated header style (not the generic collapsible-card header) with:
- A live braille-dot spinner (`⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏`, 80ms/frame) while phase is `spawning` or `running`; once `completed` or `failed`, the spinner is replaced by a static colored dot (green for completed, red for failed), each with `title`/`aria-label` equal to the phase label.
- Phase labels shown as status text: **Spawning**, **Running**, **Completed**, **Failed**.
- Name row: the subagent's own name, suffixed with **" (background)"** when it was launched to run in the background; text-shimmers while `status === 'running'`.
- Collapsible: the whole status row is the click target when `collapsible`; a chevron (›) rotates on expand.
- On failure, the status row's native tooltip shows the subagent's own error text or **"Failed"**.
- Children of a subagent (its own tool calls) render nested underneath, indented, when expanded, dispatching to each child's own native row renderer (tool / execute / diff / file-op / nested subagent).

### Tool group (composite/nested tool calls)
A generic parent wrapper for any non-subagent group of related tool calls: single collapsible header (label = the item's own tool name if it's a plain `tool` kind, else its raw `kind` string) with children rendered in a stack when expanded. Collapsed groups show one line regardless of internal status; only the label shimmers while active.

### Resource links
Single-line row: file-type icon (devicon) or a generic file icon fallback, a title, and a secondary/muted label:
- `workspace-file` target → shows the file's relative path as the secondary label; clicking opens it in the editor.
- `external` target → shows the URL's hostname as the secondary label; clicking opens it in a new tab (`window.open(..., 'noopener,noreferrer')`).
- `opaque` target → not clickable; secondary label shows the URI's scheme (`scheme://…`, ellipsized) or the raw URI, for copying.
- An optional size badge, human-formatted (`"{n} B"` / `"{n.n} KB"` / `"{n.n} MB"`).
- Error state: red error icon, tooltip = the item's own error text or **"Failed"**.

### Markdown / code blocks
- Standard block types: headings, paragraphs, lists, blockquotes, tables, horizontal rules, code fences, Mermaid diagrams — each has its own dedicated layout module under `chat-ui/src/components/rows/markdown/`.
- Code blocks: syntax-highlighted via Shiki, highlighting deferred to an idle callback (so it never blocks first paint or scrolling); while streaming, a block only gets highlighted once its content has "settled" (crossed a safe parse boundary) rather than re-highlighting every partial token. A copy-icon button sits pinned top-right of the block (icon-only "overlay" variant of the shared Copy button).
- Copy button (shared primitive): two variants — inline (message footer: icon + text label, revealed on hover) and overlay (code blocks, icon-only). Label text toggles **"Copy"** → **"Copied"** after a click, reverting after a short interval; `aria-label` mirrors this (`"Copy — copied"` while in the copied state, or a custom label prefix if the caller supplied one, e.gl for a code block it may read `"{label} — copied"`).
- Mermaid diagrams: rendered lazily on an idle callback. Placeholder text while pending: **"Mermaid diagram"**. On a render failure (invalid/unsupported diagram): **"Couldn't render diagram"**. The rendered SVG is clickable/keyboard-activatable (`role="button"`, `aria-label="View Mermaid diagram"`, Enter/Space also trigger it) and opens a dedicated Mermaid viewer dialog for a full-size look.

### Scroll behavior
- The transcript "sticks to bottom" by default while new content streams in (`tail` scroll mode) and only breaks out of tail-follow on an explicit user gesture or host call — it never silently jumps because of layout/geometry changes (e.g. an item expanding).
- Sending a message pins the new user message flush to the top of the viewport (`pinTopMode`) rather than snapping straight to the very bottom, so the start of the agent's reply is visible as it streams in.
- A floating "scroll to bottom" button (down-arrow, round, `aria-label="Scroll to bottom"`) appears above the composer whenever the view is not currently at the bottom of the transcript; clicking it smooth-scrolls to the tail.
- Keyboard: **Cmd/Ctrl+↑** scrolls to top (smooth), **Cmd/Ctrl+↓** scrolls to bottom (smooth) — captured at the window level while focus is inside the chat panel.

## Conversation lifecycle (ACP and legacy TUI)

### Creating a conversation
Modal titled **"Create Conversation"**.
- **Agent** field (required, autofocused): the agent selector.
- **Model** field: only shown if the selected agent exposes selectable models; a `<Select>` with a **"Default model"** placeholder/first item and the agent's named model options.
- **"Auto-approve permissions"** switch: only shown for agents that support it; defaults to the task's own `autoApproveByDefault` setting unless explicitly overridden in this dialog.
- **"Use chat UI"** switch: only shown for agents that support ACP; toggling it switches the conversation type between `'acp'` (chat-ui transcript) and `'pty'` (legacy terminal); persisted as a local-storage preference (`initial-conversation:chat-ui-enabled`) so it's remembered for the next conversation created, not just this one.
- Inline error text (destructive-colored): **"Failed to create conversation"** on any creation failure.
- A disabled-state note (muted, focusable for a11y) shows the project's live-action-disabled reason when the project isn't currently reachable (e.g. host unavailable), and disables the whole form.
- Submit button label: **"Create"**, or **"Creating..."** while the request is in flight; disabled while submitting, while creation is otherwise blocked, or while the project is unavailable.
- On success, immediately opens the new conversation's tab (ACP → the chat-ui panel; PTY → the terminal panel).
- Default titles auto-increment per provider per task: **"{ProviderName} (1)"**, **"{ProviderName} (2)"**, … reusing the lowest free index; a title matching that exact auto-numbered pattern is re-derived for display (so renaming manually to something else "escapes" the auto-numbering, but a literal match to the pattern re-capitalizes the provider name for display even if it wasn't typed that way).

### Conversation status indicator (badge on tab / sidebar row)
A small 9-dot glyph in a `3×3` grid, five states (`AgentStatusKind`), each with its own screen-reader label (used as the default `aria-label`/tooltip text):
- `working` — the only state that renders even when "seen": a shimmering pulse animation across all 9 dots, each with a staggered phase (period 1200ms, respects `prefers-reduced-motion` by freezing to a fixed per-dot opacity ladder instead of animating). Label: **"Agent is working"**.
- `awaiting-input` — amber diamond (45°-rotated square). Label: **"Agent is awaiting input"**.
- `error` — red square with a small red dot mark inside. Label: **"Agent error"**.
- `completed` — green circle outline. Label: **"Agent completed"**.
- `idle` (or null) — renders nothing at all (no dot, no space reserved).
- Critically, `awaiting-input` / `error` / `completed` only show **once** — as soon as the conversation is marked "seen" (opening it, or the panel being the active view), the indicator clears back to nothing even though the underlying status hasn't changed, and only the always-visible `working` state persists regardless of "seen".
- Where shown: the conversation's tab-bar item (fades out on hover, revealing tab controls), the sidebar conversation list row (replacing the relative-timestamp that shows there otherwise), and the command-palette conversation entries.
- Sidebar row without an active/unseen status instead shows a compact relative time (e.g. "2h", via `RelativeTime`) for when it was last interacted with.

### Renaming a conversation
- Via the tab's own rename affordance (keyboard shortcut bound to `workbench.tabRename`) or the sidebar row's right-click menu item **"Rename"** (pencil icon).
- Sidebar inline rename: an input replaces the title text, autofocused with the current text pre-selected; Enter or blur commits (trimmed, capped at 100 characters, ignored if empty or unchanged from the current title); Escape cancels without committing.
- Server-side rename also trims and caps at the same 100-character max (`MAX_CONVERSATION_TITLE_LENGTH`).

### Sidebar conversation list
- Section header: **"Conversations"**, with an add button (`+`) that opens the create-conversation modal (disabled with the same live-action-disabled affordance as elsewhere).
- Rows are grouped into two sections, **"Active"** and **"Inactive"** (by whether a live session is currently attached), sorted within each by most-recently-interacted-with first.
- Section header select-all checkbox: `aria-label="Select all {section} conversations"` (lowercased section name), tri-state (checked/indeterminate/unchecked).
- Row selection: a small selection control overlays the status indicator/timestamp; supports shift-click range-select and toggling; a `+`/`-` style multi-select toolbar (`ListPopoverCard`) appears at the bottom once ≥1 row is selected: shows **"{n} selected"**, a destructive **"Delete"** button (spinner while a delete is in-flight), and a clear-selection "×" (`aria-label="Clear conversation selection"`).
- Right-click context menu per row: **Rename**; for ACP conversations only, a separator then **"Export transcript"** and **"Export raw ACP log"** (download icons); if the conversation has a live/active session, a separator then destructive **"Kill session"** (disabled + tooltipped with the live-action-disabled reason when the project is unreachable); finally a separator and destructive **"Delete"**.
- Double-clicking a row opens it as a permanent (non-preview) tab; single click opens it as a preview tab; Enter/Space on the focused row does the same as a single click.

### Killing a session (stop the running agent, keep history)
Confirmation modal: title **"Kill session"**, description `"{title}" will be stopped. The conversation will remain available as inactive/resumable.`, confirm label **"Kill session"** (destructive). On confirm, stops the session and closes any open tab for it. Failure toast: **"Failed to kill session"** with the underlying error message.

### Deleting conversations
Confirmation modal, singular: title **"Delete conversation"**, description `"{title}" will be permanently deleted. This action cannot be undone.` (with an appended note like `" 2 active conversations are included."` if relevant — though for a single delete this only applies if that one conversation is active, phrased `" 1 active conversation is included."`). Plural (batch): title **"Delete {n} conversations?"**, description `"{n} conversations will be permanently deleted. This action cannot be undone."` (+ the same active-count note). Confirm label: **"Delete"** (destructive).
- On completion: any succeeded deletions close their tabs and clear their selection; on partial failure, toast **"{succeeded} deleted, {failed} failed"** with the first error's message as description; on full success of a batch (>1), toast **"{n} conversations deleted"** (no toast for a single successful delete).

### Exporting a transcript
Sidebar context menu, ACP conversations only: **"Export transcript"** (parsed) and **"Export raw ACP log"** (raw). Requires the chat panel for that conversation to already be open/loaded — if not, toast **"Failed to export transcript"**, description **"Open the chat before exporting it."** On success, opens a native "save file" dialog titled `"Export {parsed transcript|raw ACP log}"` with a default filename `"{conversationId}-{transcript|acp-raw}.json"`; on completion, toast **"Exported {parsed transcript|raw ACP log}"**; failure toasts: **"Failed to save transcript"** or **"Failed to export transcript"** with the error message.

### Conversation drafts (unsent text survives restarts)
Unsent composer text and pending (not-yet-sent) image attachments for an ACP conversation are auto-persisted (memento-backed) per conversation, capped at 65,536 characters of text; restored automatically the next time that conversation's store is created (e.g. app restart), including re-resolving attachment previews as data URLs.

## ACP session states, loading, and errors

### Loading / bootstrap states (chat panel body, when composer isn't shown yet)
- `store.historyLoading` with no error yet → centered text **"Loading chat..."**.
- `loadError.kind === 'unavailable'` and there's no transcript yet at all → centered block: **"Chat unavailable"** with the specific unavailability message beneath (muted, smaller text) — e.g. *"Live chat is unavailable until Project access returns."*
- `loadError.kind === 'auth_required'` → centered block: **"{Agent name} needs you to sign in."** (or **"This agent needs you to sign in."** if the agent's display name isn't known), the CLI auth method's own description (or the raw error message as fallback) beneath, then a **"Sign in"** button (primary, only shown if the agent exposes a CLI login auth method — opens the agent's own sign-in modal) and a **"Retry"** button (secondary).
- Any other error kind (`generic`, `history_unavailable`) → centered block: **"Failed to load chat."**, the error message beneath, and a **"Retry"** button.
- `history_unavailable` specifically arises when the session reports its history can't be read yet and no local history/messages are known: message text *"Conversation history is unavailable. Retry loading this conversation."*
- While the project itself is unreachable (host disconnected etc.), any load attempt short-circuits to the `unavailable` message *"Live chat is unavailable until Project access returns."* rather than surfacing the underlying ACP error.
- A small inline error strip can also appear just above the composer once it *is* showing (`store.loadError` while the composer is otherwise usable): destructive-tinted bar with the error's message and a **"Retry"** button.
- These overlay states use `aria-live="polite"` on their container so screen readers announce the transition.

### Reconnect / attachment recovery
When the project host reconnects or generation changes, the store silently attempts to re-attach the live session with exponential backoff (starting at 1s, capped at 15s between attempts) rather than surfacing a spinner; only a genuine `auth_required` failure during recovery stops the retry loop and surfaces the sign-in error state.

### Sending a prompt that we can't confirm was received
If the underlying transport is interrupted mid-send in a way that leaves delivery ambiguous (`AcpPromptDeliveryUnknownError`), the prompt is tracked as "unconfirmed" (its id kept in `unconfirmedPromptIds`) until the agent's own queued-prompt/message state later proves it was actually accepted — no error is shown to the user for this transient state, it just resolves silently once confirmed, or otherwise a normal send failure toast follows if the retry ultimately fails.

### Send/action failure toasts (destructive toast, title + underlying error message as description)
**"Failed to send message"**, **"Failed to stop"**, **"Failed to change model"**, **"Failed to change session mode"**, **"Failed to change collaboration mode"**, **"Failed to change effort"**, **"Failed to edit queued prompt"**, **"Failed to delete queued prompt"**, **"Failed to reorder queued prompts"**, **"Failed to send queued prompt"**, **"Failed to upload attachment"**, **"Failed to delete attachment"**.

### Stop reasons surfaced as composer notices
See "Notice band" above — `max_turn_requests`, `max_tokens`, `refusal` each get a dedicated red banner with a distinct title and message; `end_turn` and `cancelled` are silent (expected outcomes, no banner).

## Legacy TUI / terminal conversations

The non-ACP conversation type renders as a real embedded terminal (xterm-based PTY pane) instead of a structured transcript.
- Empty/unavailable state: `EmptyState` component, label **"Conversation unavailable"**, description = the project's live-action-disabled reason.
- While the project is live-action-disabled but a terminal session *is* connected and ready, a floating note banner overlays the top of the terminal: rounded bordered chip, centered text = the disabled reason, and the terminal itself becomes read-only (`readOnly` prop) while that banner is up.
- A `ContextBar` (interrupt / context controls) sits under the terminal area; it can be hidden via the interface setting `hideContextBar` (default false) but the app still measures its height (even when hidden it renders null/height 0) to keep the PTY's available rows correct.
- Search overlay inside the terminal (find-in-terminal) is available whenever a PTY is attached.
- TUI agent status/attention classification (`NotificationType`): `permission_prompt`, `idle_prompt`, and `elicitation_dialog` are all "attention" notifications that flip the status indicator to `awaiting-input`; `auth_success` is not an attention type. A `permission_prompt`-sourced `awaiting-input` status is "sticky" against the next `setWorking()` call — i.e., if the agent immediately reports working again right after asking for a permission decision, the indicator holds `awaiting-input` rather than flickering back to `working`. `clearWorking()` (the interrupt affordance) resets a `working`/`awaiting-input` conversation back to `idle`.

## Keyboard shortcuts (this scope)

- **Enter** — submit the composer (default `submitShortcut`).
- **Shift+Enter** — insert a hard line break (always, regardless of submit-shortcut setting).
- **Mod-Enter** (Cmd/Ctrl+Enter) — submit, only if `submitShortcut` is configured to `'mod-enter'` instead of the default `'enter'`.
- **Cmd/Ctrl+↑** — scroll transcript to top (smooth).
- **Cmd/Ctrl+↓** — scroll transcript to bottom (smooth).
- **Escape**, in the queued-prompts inline edit textarea — cancel the edit without saving.
- **Enter** (no Shift), in the queued-prompts inline edit textarea — save the edit.
- Arrow keys / Tab / Escape inside the @-mention and /-command popups — standard combobox navigation, select, and dismiss (handled by the shared `ComboboxPopup`).
- Rename shortcut on a conversation tab is bound to the app-wide `workbench.tabRename` command (exact key not defined in this scope's files).

## Settings that change this area (as far as this scope shows)

- **Task setting `autoApproveByDefault`**: seeds the "Auto-approve permissions" switch default when creating a new conversation.
- **Local-storage preference `initial-conversation:chat-ui-enabled`**: remembers whether the "Use chat UI" (ACP) switch was last on/off when opening the create-conversation modal.
- **Per-host/provider/transport preference** (model, permission mode, effort, collaboration mode): set implicitly every time you change one of these in the composer for a live ACP session; read back in as the default for that provider next time (`provider-preferences.ts`).
- **Interface setting `hideContextBar`**: hides the legacy terminal conversation's context bar (default: shown).
- **`submitShortcut`** (`'enter' | 'mod-enter' | 'none'`, default `'enter'`): controls whether plain Enter or Cmd/Ctrl+Enter submits the composer; not found wired to an app-level settings UI within this scope's files (may be host-supplied elsewhere).

## Provider differences observed in this scope

- **Agent switching**: always locked after a conversation has any history for ACP (protocol-level constraint — "agents can't be switched after a conversation starts"); the create-conversation modal is the only place to pick the agent.
- **Model/effort/permission-mode/collaboration-mode selectors**: each only renders at all if the connected agent's ACP session actually advertises that option set (`Record<string, Option> | null`) — e.g. an agent with no selectable models shows no model control and the plain agent-icon selector takes its place instead.
- **Auto-approve permissions** and **"Use chat UI" (ACP)** toggles in the create-conversation modal are each conditionally shown per-agent (`agentSupportsAutoApprove`, `agentSupportsAcp` capability checks).
- **MCP servers popover**: only appears for ACP sessions that report `mcpServers`.
- **CLI sign-in flow**: only offered when the specific agent's capabilities expose a `cli-login` auth method; otherwise the auth-required overlay shows only Retry, no Sign in button.
- **Collaboration mode** (e.g. Codex's Default/Plan) is a distinct control from **permission mode**; both can coexist for an agent that offers both, positioned model → collaboration mode → permission mode → MCP badge, left to right.

## Unverified / unclear

- The exact keybinding for `workbench.tabRename` (conversation rename shortcut) is defined outside this scope's files (referenced only by command id).
- Whether a literal, hard-coded "context limit reached" string exists anywhere was not found in this scope; the closest analog located was Codex's own agent-authored compaction message ("Summarize conversation to avoid hitting the context limit.") in a test fixture, which is agent output, not app chrome. The app's actual context-limit-adjacent UI is the composer's context-usage donut (amber at ≥90%) and the generic `max_tokens` / `max_turn_requests` stop-reason notices.
- The precise default vs. amber vs. red thresholds for the diff card's line-count truncation indicator styling were not fully traced (only the 8-line/1-context cap and the "truncated" boolean were confirmed).
- Whether `submitShortcut` is exposed anywhere in Emdash's settings UI (vs. only settable programmatically) was not confirmed within this scope's files.
- The full list of ACP slash-command "execute" behaviors in practice (which host, if any, currently supplies `behavior: 'execute'` items) wasn't found wired up in this scope — only `'insert'` (agent commands) and `'insert-text'` (saved prompts) are observed in active use.
- Diff card's deletion-count badge styling (color/format) was inferred by symmetry with the confirmed `+{adds}` addition badge but its exact class/token wasn't independently read.

## Coverage note

Read in full: `chat-composer/index.tsx`, `context-usage-indicator.tsx`, `permission-band.tsx`, `queued-prompts-band.tsx`, `chat-composer.css.ts` (partial, targeted), `prompt-editor.tsx`, `extensions/mention.ts`, `extensions/slash-command.ts`, `extensions/submit-keymap.ts`, `advertised-command-provider.ts`, `workspace-file-mention-provider.ts`, `acp-chat-panel.tsx`, `acp-chat-store.ts`, `acp-chat-view-commands.ts`, `acp-chat-tab-provider.tsx`, `conversation-tab-item.tsx`, `conversation-title-utils.ts`, `create-conversation-modal.tsx`, `conversations-panel.tsx`, `sidebar-conversations-list.tsx`, `transcript-file-commands.ts`, `acp-dropped-file.ts`, `errors.ts`, `stop-reason.ts`, `permissions.ts`, `agent-status.tsx` + `.css.ts`, `agent-events.ts`, `conversation-manager.ts` (status/indicator sections), `turn-outcome.def.tsx`, `working.def.tsx`, `thinking.def.tsx`, `Plan.tsx`, `Tool.tsx` + `tool.def.tsx`, `Execute.tsx` + `execute.def.tsx` + `execute-lines.ts`, `FileOperation.tsx`, `diff.def.tsx` (+ `Diff.tsx` grepped), `Subagent.tsx`, `tool-group.def.tsx`, `ResourceLink.tsx`, `CopyButton.tsx`, `UserMessageCard.tsx`, `PinnedUserMessage.tsx`, `CollapsibleCard.tsx`, `CardHeader.tsx` (grepped), `Mermaid.tsx`, `Code.tsx` (partial), `scroll-mode.ts`.

Skimmed / grep-only (not fully read line-by-line): `acp-live-session.ts` (start/cancel/error classes only), `chat-transcript.ts`, `chat-ui-runtime.ts`, `shared-chat-context.ts`, `chat-mention-provider.ts`, `issue-mention-context.ts`, `provider-preferences.ts`, `mementos.ts` (constants only), `conversation-registry.ts`, `stick-to-bottom.ts`, remaining markdown block defs (headings/lists/table/rule/prose — layout-only, no distinct copy), `types.ts` for prompt-editor.

Sweep: an initial grep across the three scope roots for `placeholder=`, `aria-label=`, `title=`, `label:`, `description:`, tooltip and toast call sites returned 696 candidate lines; the entries above account for the large majority of the distinct user-visible strings among them (composer, permission/notice/queued bands, tool/diff/execute/file-op/subagent rows, conversation lifecycle modals and menus, session error states). Remaining unreflected hits were almost entirely internal prop/type names (`label:` in TypeScript interfaces), CSS class identifiers matching the `aria-label` grep pattern coincidentally, and duplicate occurrences of strings already captured above.
