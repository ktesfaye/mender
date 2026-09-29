# Gaps found, part one

Slice: `src/core/features/{account,agents,automations,browser,catalog,conversations,dev-perf,editor,files,github,integrations,issues,legacy-port,library,machines,mcp}`, `src/renderer/`, `src/main/`. 589 user-visible strings extracted (after stripping obvious TS-type false positives); 280 (~48%) had no matching text in the existing nine catalog files. Most of that 48% turned out to be either fuzzy-match misses (paraphrased instead of verbatim, or template-literal variables breaking the substring match) or low-value internal/type-signature noise. After manually checking every uncovered cluster, the following are genuine, previously undocumented features or states.

## App shell (Electron-level, not a page)

### Native application menu
Not covered anywhere in the existing catalog (only the in-app Command Palette and Settings pages are documented). Source: `apps/emdash-desktop/src/main/host/menu.ts`, built from `MENU_ITEMS` (`src/core/manifests/shared/menu-items.ts`) for keyboard accelerators.

- **macOS app menu** (`app.name`, i.e. "Emdash"): **About Emdash** (native panel via `app.showAboutPanel()`) · **Settings…** (`Cmd+,`-style accelerator from `app.settings` command) · **Check for Updates…** (no accelerator; emits `menu-check-for-updates`) · native `services`/`hide`/`hideOthers`/`unhide` · **Quit Emdash** (`Cmd+Q`).
- **File menu**: on macOS, **Close Tab** (accelerator from `workbench.tabClose`); on Windows/Linux, **Settings…** appears here instead (no macOS app menu exists there) plus **Quit** (`Ctrl+Q`).
- **Edit menu**: **Undo**/**Redo** (`Cmd/Ctrl+Z`, `Shift+Cmd+Z` on mac / `Ctrl+Y` elsewhere) emit `menu-undo`/`menu-redo` host events (used for in-app undo, not native text undo); native `cut`/`copy`/`paste`/(`pasteAndMatchStyle` on mac)/`delete`/`selectAll` roles below.
- **View menu**: native `reload`/`forceReload`/`toggleDevTools`, then **Command Palette…** (accelerator from `app.commandPalette`), then native `resetZoom`/`zoomIn`/`zoomOut`/`togglefullscreen`.
- **Window menu**: native `windowMenu` role (standard OS window list).
- **Help menu**: on Windows/Linux only, **Check for Updates…** first; then **Docs** and **Changelog** (both `shell.openExternal` to `EMDASH_DOCS_URL`/`EMDASH_RELEASES_URL`); a **Troubleshooting** submenu with **Report Issue…** (opens `EMDASH_ISSUES_NEW_URL`) and **Copy Installation ID** (copies `Emdash <version>\nInstallation ID: <id or "unavailable">\nPlatform: <platform> <arch>\nElectron: <electron version>` to the clipboard — no toast/confirmation, silent); and **Give Feedback** (emits the `app.giveFeedback` command, opening the in-app feedback flow).
- The whole menu is rebuilt (`setupApplicationMenu`) whenever keybindings change, so accelerators always track the user's current keybinding config.
- All ellipsis characters in labels are the Unicode `…` (`…`), not three periods.

### Terminal right-click context menu
Source: `apps/emdash-desktop/src/main/core/app/service.ts:280-330`. Native (Electron `Menu`) context menu shown on right-click inside a terminal pane: **Copy** (`Cmd/Ctrl+C`, disabled when nothing is selected), **Copy Link** (only present when the click was on a detected link/URL), **Paste** (`Cmd/Ctrl+V`), **Select All**, **Clear** — the last three emit `paste`/`select-all`/`clear` host events consumed by the terminal rather than acting on the native OS clipboard directly for paste.

### Crash recovery window
Entirely undocumented. A separate, minimal `BrowserWindow` (560×480, sandboxed, no preload/IPC — communicates only via `emdash-recovery://<action>` navigation interception) shown when normal app boot fails; see `showRecoveryWindow` in `apps/emdash-desktop/src/main/host/recovery/recovery-window.ts` and its page `recovery.html`.

- Title/heading: **"Something went wrong"** / *"Emdash could not finish starting. You can check for an update, restart Emdash, or open the logs for more information."*
- Window title and footer both read **"Emdash Recovery"** (`document.title`) with the running app version shown as **"Version `<version>`"**.
- Body: a status line, a `<progress>` bar (only visible while `updateStatus === 'downloading'`), an **Error details** `<details>` disclosure (auto-expanded whenever an error message is present) containing the raw error text in a `<pre>` block, and four action buttons.
- Update-status-driven copy in the status line / primary button label (mirrors the normal in-app updater state machine, but rendered in plain HTML since this window can't load the full renderer bundle):
  - `available` → *"Version `<ver>` is available."* / button **"Download update"**.
  - `downloading` → *"Downloading update… `<percent>`%"* / button **"Downloading…"** (disabled).
  - `downloaded` → *"Version `<ver>` is ready to install."* / button **"Install and restart"**.
  - `checking` → *"Checking for updates…"* / button **"Checking…"** (disabled).
  - `installing` → *"Installing update…"* / button **"Installing…"** (disabled).
  - `error` → the updater's own error message, or *"The update check failed."* / button **"Check again"**.
  - idle/default: *"Recovery mode is ready."* if the updater initialized, else *"Automatic updates are unavailable in this build."* / button **"Check for updates"**.
- Secondary buttons, always enabled: **Restart Emdash**, **Open logs**, **Quit**.
- The update button relabels/cycles through check → download → install as state advances (clicking sends `check`, `download`, or `install` depending on current `updateStatus`).
- If the updater module itself fails to load (e.g. a broken native add-on), the window still opens with the updater simply reported inactive — recovery never depends on the thing that may have caused the crash.
- Triggered from `EMDASH_FORCE_BOOT_FAILURE=1` (dev/test forcing) or any real boot-phase failure (`apps/emdash-desktop/src/main/bootstrap/boot/phases/database.ts` etc.).

### Secure secret storage unavailable
Source: `apps/emdash-desktop/src/main/host/secrets/encrypted-app-secrets-store.ts`. Any attempt to read/write an app secret (provider tokens, SSH credentials, etc.) when OS-level secure storage can't be used throws, surfacing wherever that save/read is user-triggered:
- Generic unavailable: **"Secure secret storage is unavailable on this system."**
- Linux-specific, when Electron's `safeStorage` reports it's falling back to plaintext: **"Secure secret storage is unavailable: Linux safeStorage backend is basic_text."** (i.e. no OS keyring is present/unlocked).

## Automations — node-layer error text (exact strings)

Section 07 already documents the Automations feature (list/create/detail views) and says error handling covers "typed errors for project-not-found, automation-not-found/conflict, workspace-not-found/not-supported, deployment-stale, no-project-attached, run-not-found/not-adoptable, and adoption/runtime-unavailable (server message passed through)" without quoting them. The exact user-facing text (surfaced as the sheet's inline error strip or a toast, per the existing `formatAutomationError` note) is:

- Deployment/save-time (`automations/node/deployment-builder.ts`): *"Attach the automation to a project before deploying it."* · *"Finish configuring the automation before saving."* (also reachable independently as `automation_not_configured`) · *"The selected project no longer exists."* · *"Add a prompt before saving."* · *"The project repository has no git remotes; worktree automations need one."* · *"This workspace type cannot run an automation yet."* · *"The selected workspace no longer exists."* · *"The selected workspace belongs to a different runtime host."*
- Optimistic-concurrency conflicts (`automations-service.ts`): *"This automation changed on its runtime. Try saving again."* and *"This automation changed while it was being saved. Try again."* (two distinct races — one for an external runtime-side edit, one for a same-session double-save) · *"The selected project no longer exists."* · *"This automation no longer exists."*
- Run adoption (opening a run / attaching a workspace, `run-adoption.ts`): *"This automation no longer exists."* · *"Attach the automation to a project before opening its runs."* · *"This automation run no longer exists."* · *"The automation workspace is not ready yet."* · *"The selected project no longer exists."* · *"The automation workspace belongs to a different runtime host."* · *"Could not resolve the Host workspace (`<error type>`)."* · *"Could not claim the Host workspace (`<error type>`)."*
- Deletion (`operations/deleteAutomation.ts`): *"Automation `<id>` was not found"* · *"Project is being deleted."* (blocks deleting an automation whose project is mid-delete).
- `useAutomationSettingsAutoSave.ts` (internal guard, not directly user-facing but explains a silent no-op): the auto-save effect refuses to build a conversation config and logs *"Cannot build automation conversation config without provider"* when no provider is selected yet — the Settings tab simply doesn't auto-save until a provider is chosen.

## Machines (SSH connections) — additional exact text

Section 04 documents the Machines list, Add/Edit modal, and details page thoroughly but paraphrases validation copy and omits a couple of dialogs. Source: `machines/browser/machine-form-schema.ts`, `machine-host-picker.tsx`, `machine-authentication-fields.tsx`, `machine-manual-fields.tsx`, `components/machine-conversations-list.tsx`, `components/link-conversation-modal.tsx`, `pages/machine-details-page.tsx`.

- Zod field-validation messages, verbatim (shown inline under the offending field on submit): *"`<Field label>` cannot start or end with spaces"* (name/host/username/private-key-path/SSH-config-alias/ProxyJump all share this template) · *"Invalid SSH config alias"* · *"Invalid hostname or IP address"* · *"Username is required"* · *"Password is required"* · *"Private key path is required"*.
- SSH-config host combobox: placeholder *"Select or enter a host"*; a "show all" affordance in that combobox is titled/labelled **"Show SSH config hosts"**.
- Authentication section header: **"Authentication settings"**; Passphrase field label when optional: **"Passphrase (optional)"**.
- Source-mode toggle group label: **"Connection source"**; manual-mode Alias field helper: *"Optional. Defaults to the host."*; ProxyJump field placeholder example: *"bastion or user@bastion:2222"*.
- **Link conversation to machine** modal (`link-conversation-modal.tsx`, reached from a machine's Conversations tab — "attach an existing remote conversation" flow not detailed in section 04): search box placeholder **"Search…"**, empty-search-result line **"No matches"**.
- Deleting a linked conversation from a machine (`machine-conversations-list.tsx`), confirm dialog body: *"This permanently deletes "`<title>`" from its machine. If the machine is offline, the deletion runs when it reconnects."* — notable because unlike most destructive actions here, this one is allowed to queue against an offline host rather than being blocked.
- Deleting the machine itself, confirm dialog body (this is the exact string; section 04 paraphrases it as "and its saved credentials"): *"This will remove "`<name>`" and its saved credentials from this device."*
- Save-time optimistic-concurrency error (`machine-persistence.ts`): *"This connection changed while saving. Reopen it and try again."*
- Backend errors surfaced through the same save/connect flows (`machines-service.ts`): *"SSH connection `<id>` not found"* · *"SSH connection is used by `<project names>`"* (a more specific version of the "still used by a project" delete-block already documented, naming the actual project(s)).
- Section headers on the details page (`aria-label`s, not paraphrased anywhere): **"Machine actions"** (the `⋯`/action row) and **"Machine details sections"** (the System/Workspaces/Conversations/Agents/MCP/Skills tab list).

## Editor file tree — operation failure toasts

Not covered by section 06 at all (which documents the tree's drag/drop import and rename/replace flows but not these specific failure toasts). Source: `editor/contributions/browser/editor-file-tree.tsx`.

- Importing files by drag-drop when destination names already exist and overwrite wasn't confirmed: conflict message **"Files already exist"** (paired with the list of conflicting relative paths; this feeds the existing "Replace existing file(s)?" prompt documented in section 06 as the resolution step — the conflict-detection message itself was the missing piece).
- Generic import failure (no HTTP/result error available, e.g. thrown exception): toast **"The file could not be imported."**
- **Copy file** context-menu action: reads the file's text (capped, `MAX_COPY_FILE_BYTES`) and puts it on the clipboard.
  - Success toast: **"File copied"**.
  - Failure toast title **"Copy failed"**, description either the underlying result error, or **"File is too large to copy."** when truncated, or the fallback **"The file could not be copied."**
- **Copy path** / **Copy relative path** actions: success toasts **"Path copied"** / **"Relative path copied"**; failure toast title **"Copy failed"**, description **"The path could not be copied."** (fallback) or the underlying error.
- **Reveal in file manager** action: failure toast title **"Show failed"**, description **"The item could not be shown."** (fallback) or the underlying error.
- File-tree command-palette entries (`editor/contributions/commands.ts`, command descriptions — these are what the Command Palette shows as the command's subtitle, not covered in the tasks-workbench command-palette writeup): **"Rename the selected file tree item"**, **"Cut the selected file tree items"**, **"Copy the selected file tree items"**, **"Paste cut or copied file tree items"**, **"Delete the selected file tree items"**.

## Issue-tracker integration — connection & lookup error states (backend)

The issue **picker UI** (linking an issue to a task) is documented in section 05, but the strings it can actually show come from a generic plugin-issue-provider layer (shared by every issue-tracker integration: GitHub Issues, Linear, Jira, etc. — not just GitHub) that section 05 doesn't cite. Source: `integrations/api/node/plugin-issue-provider.ts`, `integrations/api/account-reporting.ts`, `issues/api/node/plugin-issue-adapter.ts`, `integrations/node/integration-account-store.ts`.

- Missing repository context for a provider that needs one: **"Repository URL including its host is required."** (`plugin-issue-provider.ts`) / **"Repository URL is required."** (the simpler check in `plugin-issue-adapter.ts`, used when host-matching isn't relevant).
- No account connected for the project: **"Connect a `<provider>` account to get started."** (also the account-reporting empty state shown on the integration's settings/summary row, `account-reporting.ts:26`).
- Project's pinned account was disconnected mid-session: **"The selected `<provider>` account is no longer connected."** (`account-reporting.ts:21` — the general form of the GitHub-specific wording section 05 already documents).
- Account selection changed underneath an in-flight request: **"Integration account selection changed. Refreshing accounts."** — a soft, auto-retried condition rather than a dead-end error.
- Provider not connected at all (no project context): **"`<provider>` is not connected."**
- Looking up a specific issue by ID: empty/blank identifier → **"Issue identifier is required."**; provider plugin has no `getIssue` behavior implemented → **"`<provider>` does not support issue context."**
- Credential-store layer (`integration-account-store.ts`): **"Unknown integration: `<id>`"**, **"Invalid `<id>` credentials"** — internal guards, surface as a generic connect-failure if ever hit.
- Generic connection-check failure surfaced in the integration's settings row: **"Connection check failed."** (`account-verification.ts`, `issues/node/operations.ts`).

## GitHub account — one missing auth-error variant

Section 05's "GitHub auth error copy" list (line ~479) quotes three of the four `GitHubApiAuthError` variants (`github.com`, GitHub Enterprise, missing token) but omits the fourth, `account_host_mismatch` — reached when a project's pinned GitHub account belongs to a different host than the repository it's being used against:
> *"Selected GitHub account `<accountId>` is for `<accountHost>`, but this repository uses `<host>`."*
Source: `github/node/services/github-api-auth-errors.ts:69-78`.

## Dropped/pasted file & HEIC-image handling — error text

Section 06 documents the 50 MB cap and HEIC re-persist behavior but states large drops are "silently skipped with a warning log (no visible toast at this layer)". The actual error text that *is* thrown at this layer (and does propagate up to the terminal's "Failed to attach files" toast documented in section 08) was missing:
- Streaming-read overflow while buffering a HEIC file for conversion: **"Attachment exceeds the 50 MB upload limit."**
- Post-normalization size checks (checked twice — before and after any HEIC→PNG conversion, since conversion can change size): **"Dropped file is too large (`<bytes>` bytes)"**.
- HEIC/HEIF conversion, macOS-only (`sips`): on non-macOS, **"HEIC/HEIF image conversion is only supported on macOS"**; if `sips` produces a zero-byte file, **"sips produced an empty PNG"**; wrapped as **"Failed to convert HEIC/HEIF image to PNG: `<message>`"**.
Source: `apps/emdash-desktop/src/main/core/app/persist-terminal-attachment.ts`.

## Corrections to other sections

- **Section 06, "Dropping / pasting images and files into a terminal"**: currently says oversized drops are *"silently skipped with a warning log (no visible toast at this layer)"*. The code (`persist-terminal-attachment.ts`) does `throw new Error(...)` on overflow with the exact messages quoted above, and section 08 separately documents a terminal **"Failed to attach files"** toast — these two should be reconciled; the throw very plausibly is what feeds that toast rather than being swallowed. Worth re-verifying the call path from `terminalFileSources.prepare` up to the toast site before asserting "no visible toast."
- **Section 05, "GitHub auth error copy"**: missing the `account_host_mismatch` variant — see above. Not wrong, just incomplete (3 of 4 variants quoted).
- **Section 04, machine-delete confirm text**: paraphrased ("and its saved credentials from this device" implied but not shown as the full sentence) — the verbatim string is now given above for completeness; no actual inaccuracy found.

## Coverage note

589 strings extracted from the assigned slice via a small Python regex extractor (`gap/extract.py`) covering JSX text children, common prop names (title/label/description/placeholder/aria-label/tooltip/content/message/emptyText/confirmLabel/etc.), and `throw new Error(...)` literals, across non-test `.ts`/`.tsx` files. 309/589 (~52%) matched existing catalog text on a normalized-substring check (case-insensitive, whitespace-collapsed, template placeholders stripped); manual review of the remaining 280 found the true uncovered fraction was smaller — most misses were either paraphrases of already-documented copy, template-literal-only variance, or pure code/type-signature false positives from the extractor (e.g. `Promise<...>` return-type text matched as if it were a JSX text node). The features above are the genuine, previously-undocumented gaps found after that manual filter, prioritized toward things with real UI surface (menus, dialogs, toasts) over pure internal error plumbing.
