# Terminals, process execution, preview servers, and remote/local machines

Scope covered: `packages/core/src/services/{pty,exec,shell-env,preview-detection,fs-usage,host-dependencies,runtime-broker}`, `packages/core/src/primitives/{exec,host,host-dependencies,terminal-shell,path,agent-env}`, `packages/core/src/runtimes`, `packages/core/src/workspace-server`, `apps/emdash-desktop/src/main/core/{terminal-shell,preview-servers,dependencies,runtime}`, `apps/emdash-desktop/src/core/features/{terminals,preview-servers,machines,browser}`, `apps/emdash-desktop/src/core/primitives/{ssh,preview-servers,terminals}`, `packages/ui/src/react/components/{machine-status,script-status,stepped-loader,update-card}`.

**Answer up front — the terminal library and how far it can be restyled:**
The renderer uses **`@xterm/xterm` v6.0.0** (package.json: `"@xterm/xterm": "^6.0.0"`) plus the official `@xterm/addon-web-links` v0.12.0 addon. `node-pty` v1.1.0 is the backing PTY on the Node/main side. There are exactly two places `new Terminal(...)` is constructed — the main task terminal (`apps/emdash-desktop/src/core/features/terminals/api/browser/pty/pty.ts`) and the agent CLI sign-in modal terminal (`apps/emdash-desktop/src/core/features/settings/browser/agents-page/AgentSignInModal.tsx`) — and both share the same theme/font builder functions, so restyling one code path restyles both.

Today's theming surface is **deliberately narrow**: xterm's `theme` option is populated from exactly **6 CSS custom properties** (`readXtermCssVars()` in `pty.ts`):

```ts
export function readXtermCssVars(): ITerminalOptions['theme'] {
  const color = (name: string) => cssColorToHex(cssVar(name));
  return {
    background: color('--xterm-bg'),
    foreground: color('--xterm-fg'),
    cursor: color('--xterm-cursor'),
    cursorAccent: color('--xterm-cursor-accent'),
    selectionBackground: color('--xterm-selection-bg'),
    selectionForeground: color('--xterm-selection-fg'),
  };
}
```

Those vars are defined once per app theme in `apps/emdash-desktop/src/renderer/index.css` (light block ~L351, dark block ~L664):

```css
--xterm-bg: var(--em-surface-paper);
--xterm-fg: var(--foreground);
--xterm-cursor: var(--foreground);
--xterm-cursor-accent: var(--foreground-inverse);
--xterm-selection-bg: color(display-p3 0.004 0.502 0.984 / 0.212);   /* light */
--xterm-selection-fg: var(--blue-12);                                 /* light */
/* dark theme block uses different selection alpha/hue: 0.224 0.557 1 / 0.475, --blue-11 */
```

**No ANSI 16-color palette is themed** — `black`/`red`/`green`/…/`brightWhite` are never set on the `ITheme` object, so all 16 ANSI colors and any 256-color/truecolor output render with xterm.js's built-in defaults regardless of app theme (INFERRED from xterm.js's public `ITheme` API — the fields exist and are settable, they are simply never populated here since the checkout's `node_modules` isn't installed to read the shipped `.d.ts` directly).

A caller can layer a **per-session override** on top of the CSS-var base via `SessionTheme.override` (an `ITerminalOptions['theme']` partial); `resolveOverride()` even accepts `var(--some-custom-prop)` strings and resolves them to hex at apply time. This is how e.g. a read-only or embedded terminal could get a custom background without touching the global theme. `applyThemeToAll()` re-themes every live terminal instance app-wide (called on app theme change).

Other configured/knobable-but-fixed xterm options (all in `pty.ts`, not currently exposed as user settings except font):

| xterm option | value | source |
|---|---|---|
| `fontFamily` | user setting, falls back to `Menlo, Monaco, Consolas, monospace` | `buildTerminalFontFamily()` |
| `fontSize` | user setting, default **13**, clamped **8–32** | `TERMINAL_FONT_SIZE_{DEFAULT,MIN,MAX}` |
| `lineHeight` | hard-coded `1` | comment: DOM renderer can't draw custom block glyphs at other line-heights — needed for ANSI QR codes |
| `letterSpacing` | hard-coded `0` | — |
| `scrollback` | hard-coded `10_000` lines | main process ring buffer only retains 1MB/session anyway |
| `cols`/`rows` | `120 × 32` initial, then measured/resized | — |
| `allowProposedApi` | `true` | needed for `parser.registerOscHandler`/`registerCsiHandler` |
| `scrollOnUserInput` | `false` | — |
| `macOptionIsMeta` | user setting (Mac only), default `false` | toggled live via `terminal-mac-option-is-meta-changed` window event |
| `disableStdin` | set when `readOnly` prop is true | — |
| padding | `8px` (`TERMINAL_PADDING_PX`), applied directly to `terminal.element.style.padding` (not the container) because "xterm v6 insets `.xterm-screen` by padding on the `.xterm` element and subtracts padding in its own coordinate math" | `pty.ts` comment |
| renderer | **DOM renderer only** — Canvas2D/WebGL addon deliberately NOT loaded; comment: "CanvasAddon repaints the full canvas on resize, which makes panel/sidebar transitions visibly flicker" | `pty.ts` |
| `cursorStyle`/`cursorBlink`/`cursorWidth` | **not set anywhere** — xterm.js defaults apply | grep found none |
| background image / transparency | **not supported** — background is a flat CSS color (`element.style.backgroundColor`); no image layer | `pty.ts` |

So: **restyling colors and font is fully supported today (6 semantic colors + font family/size), restyling the ANSI palette, cursor shape/blink, padding-per-side, or adding a background image/transparency is NOT implemented and would need new code**, though the architecture (CSS vars → `readXtermCssVars` → `ITerminalOptions.theme`, plus the `SessionTheme.override` escape hatch) makes extending it straightforward.

---

## The terminal (PTY) surface

### Interactive terminal panes

What it is: a full xterm.js terminal wired to a real shell process, embedded in the task view (bottom drawer, or opened as a main-pane tab) and in the agent CLI sign-in modal.

What the user can do:
- Type/paste into a live shell, scroll back up to 10,000 lines.
- Open **multiple terminal tabs** per task (`+` button, dropdown to pick a specific shell), close, rename (inline rename on the tab), and drag a terminal tab (via `@dnd-kit`, `TERMINAL_DRAWER_DRAG_TYPE`) presumably to move it into the main pane layout.
- Terminals opened in the main pane are excluded from the bottom-drawer tab list (`terminalIdsOpenInMain`) — the same terminal session can be "promoted" to a full pane.
- Right-click for a **native context menu** (Paste / Select All / Clear) — routed through the host client (`showTerminalContextMenu`), not a DOM menu.
- Copy selection (`Cmd/Ctrl+C` when text is selected, `Ctrl+Shift+C` always), paste (`Cmd+V` native on Mac, `Ctrl+V`/`Ctrl+Shift+V` intercepted on Windows/Linux), "auto-copy on selection" setting (debounced 150ms).
- Kill-line: `Cmd+Backspace` on Mac sends `Ctrl+U` (unix-line-discard).
- Word-jump: `Cmd+←`/`Cmd+→` on Mac send `\x01`/`\x05` (readline home/end).
- `Shift+Enter` optionally mapped to `Ctrl+J` (line-feed) — used for agent CLIs that treat `\n` as "newline, don't submit" (`mapShiftEnterToCtrlJ` prop, per-terminal).
- `Escape` triggers an `onInterruptPress` callback (used by the composing task view) while still passing the key through.
- Drag-and-drop a file from the in-app file tree, or drop OS files, onto the terminal — injects the resolved path(s) as plain text (not bracketed paste, so agent CLIs like Claude Code don't choke on paste markers).
- Paste or drop an **image** (screenshot, clipboard image, dropped image file) — persisted to disk via the host client and the file path(s) injected as text, formatted per-OS (`formatTerminalImagePaths`), with duplicate-paste suppression (near-duplicate detection within a short window across the DOM-paste and system-paste code paths).
- **OSC 52 clipboard**: a terminal program (tmux, vim, a remote CLI) can write to the OS clipboard via the OSC 52 escape sequence; the terminal decodes and forwards it to `copyTextToClipboard`.
- Click a detected **file path** in terminal output to open it in the in-app file editor (`FileLinkProvider`) or a **URL** to confirm-and-open externally (`WebLinksAddon`, primary mouse button only).
- **In-terminal search** (`Cmd/Ctrl+F` opens `TerminalSearchOverlay`): live match count `n/total`, next/prev (`ChevronUp`/`ChevronDown` or Enter/Shift+Enter), close (`X` or Escape via view-scope).
- Terminal panes can be **read-only** (`readOnly` prop) — disables stdin and paste/drop handlers; used at least for the agent sign-in terminal.
- A DECRQM workaround intercepts two CSI query sequences xterm.js 6.0 mishandles and answers them itself so TUIs that probe terminal modes don't hang.

UI: `PtyPane` (`.../terminals/contributions/browser/pty/pty-pane.tsx`) wraps `usePty` (`.../terminals/browser/pty/use-pty.ts`), which owns the raw xterm `Terminal` lifecycle; `TerminalDrawerTabBar` (tabs/rename/close/new-with-shell dropdown); `TerminalsPanel` (bottom drawer container, switches between "Terminals" and "Scripts" tabs); `TerminalSearchOverlay`.

Backend: `FrontendPty` class (renderer) talks to a `PtySession`/`PtySessionOptions` on the main/runtime side via a `FrontendPtyConnector`; the actual process is a `PtyProcess` created by `NodePtySpawner` (`packages/core/src/services/pty/api/node/node-pty-spawner.ts`) wrapping `node-pty`. Terminal identity is a deterministic **PTY session ID**: `makePtySessionId(projectId, scopeId, leafId)`.

States: `PtySessionStatus = 'disconnected' | 'connecting' | 'ready'` (renderer session store); PTY exit carries `{ exitCode, signal }` (`PtyExitInfo`), classified `isUnexpectedPtyExit` when `exitCode !== 0 || signal !== null`.

### Terminal grid sizing (multi-pane resize)

What it is: when several terminal sessions share one physical pane (e.g. split panes or multiple sessions resized together), a single "per-pane resize controller" measures real glyph cell metrics from the mounted xterm DOM and broadcasts one `cols`/`rows` target to every session in that pane, so they all stay grid-aligned. Implemented via a MobX-observable `controllerDims` box; a `reaction` calls `term.resize()` only when the box changes. Retries up to 5 times (100ms apart) if the terminal is measured before it's laid out in the DOM (cold path — terminal is opened off-DOM in a hidden host div first).

Backend: PTY resize is fanned out over the wire so the actual PTY (`node-pty` process) matches, not just the frontend xterm buffer.

### Off-screen terminal host / instant tab switching

What it is: an off-screen `<div data-terminal-host>` (`ensureXtermHost()`) that owns every xterm DOM node that isn't currently visible. Switching tabs/panes reparents the container between the off-screen host and the visible mount point instead of destroying/recreating the terminal — so scrollback, cursor position, and running processes survive navigating away and back, and xterm's render loop pauses itself (an `IntersectionObserver` sees zero intersection while parked, per the code comment) so it costs nothing while hidden.

### Terminal persistence via tmux

What it is: local/remote terminal sessions can be backed by a **tmux session on the host**, so the shell (and whatever's running in it) survives the desktop app restarting or losing the connection. Each session is addressed by a stable **identity** rather than a raw tmux name; `resolveTmuxSession()` (`packages/core/src/services/pty/api/tmux.ts`) looks up existing sessions by identity metadata, falls back to a legacy naming scheme, and only creates a new name if nothing matches. `findTmuxSessionNamesByIdentity`, `listTmuxSessionActivity` (last-activity timestamps, for showing which sessions have recent output) round out the API.

States: not supported on Windows PTY spawn (`LocalPtySpawnWarning = 'tmux_unsupported_on_windows'`, logged, not fatal). "Enable tmux by default" is a per-host default the user can toggle in Host Settings (see below), overridable per project.

### Terminal exit / kill semantics

What it is: closing a terminal or its owning task kills the process **tree**, not just the direct child, using platform-appropriate mechanics:
- POSIX: `PosixPtyTerminator` — SIGTERM to the tracked process group/session, a **2-second grace period** (`KILL_GRACE_MS`), then SIGKILL if still alive. It explicitly does **not** kill a descendant that has "escaped" (different session id or process group id than the root) — e.g. something intentionally detached/daemonized is left running.
- Windows: `ProcessTreeTerminator` walks the process tree and shells out to `taskkill` (injectable `TaskkillRunner` for tests).
- Resize failures caused by an already-dead PTY (`EBADF`/`ENOTTY`/`ioctl(2) failed`/`Napi::Error`) are swallowed rather than logged as errors.

### Shell resolution & selection

What it is: the shell a new terminal spawns is resolved per-host, not hard-coded, with an explicit **shell picker**.

User-facing shell choices (`TERMINAL_SHELL_IDS`): `system` (default), `bash`, `zsh`, `fish`, `cmd`, `powershell`, `pwsh`, `wsl`. Internally resolved shells (`RUNTIME_TERMINAL_SHELL_IDS`) additionally include `csh`, `dash`, `ksh`, `sh`, `tcsh`. Each resolves to a `TerminalShellFamily`: `posix | csh | windows-cmd | powershell | wsl`, which drives argument conventions (`-il` interactive args, `-c`/`-lc` command args, `/d /s /c` for cmd, `-NoProfile -Command` for PowerShell, `--exec sh -lc` for WSL).

What the user can do: pick a **default terminal shell** in Settings (dropdown, disabled entries show an unavailable reason via tooltip/title), or pick a shell **per new terminal** via the drawer's split "new terminal" button (`+` opens default shell, chevron opens a shell-availability dropdown). Availability is queried live (`useTerminalShellAvailability`) and only fetched lazily when the dropdown opens or on retry.

Backend: `TerminalShellResolver.resolveWithSystemFallback()` / `.getAvailability()` (host-local, so a remote host resolves its own remote shells); Node implementation probes the filesystem/PATH; `resolveLocalPtySpawn()` (`packages/core/src/services/pty/api/local-spawn.ts`) turns a `PtySpawnIntent` (`interactive-shell` or `run-command`, each optionally carrying `shellSetup` text and/or a `tmux` name/identity) into a concrete `NativeInvocation` per-platform.

### Terminal appearance & behavior settings

UI: `TerminalSettingsCard` (Settings page). Fields, each with immediate or on-blur commit:

| Setting | Control | Detail |
|---|---|---|
| Default terminal shell | `Select` | options from live shell availability; disabled options show unavailable reason |
| Terminal font | searchable `Combobox`, grouped "Popular" / "Installed" | popular list: Menlo, SF Mono, JetBrains Mono, Fira Code, Cascadia Code, Iosevka, Source Code Pro, MesloLGS NF — filtered to only those actually installed (`useInstalledFonts`); can also type an arbitrary font name and press Enter |
| Terminal font size | stepper (`-`/`+` buttons) | 8–32px, default 13 |
| Auto-copy selected text | `Switch` | copies selection to clipboard automatically (150ms debounce) |
| Use Option as Meta key | `Switch`, **macOS only** | |

Font/size changes are also broadcast live to every open terminal via `window.dispatchEvent(new CustomEvent('terminal-font-changed', ...))` / `'terminal-auto-copy-changed'` / `'terminal-mac-option-is-meta-changed'`, so changing the setting updates already-open terminals without remount. Remote terminals note: "Remote terminals use the remote system shell" — the shell picker only applies to local terminals.

### Terminal environment (theme signaling & agent-usable env vars)

- `COLORFGBG` env var is injected into every spawned terminal reflecting the *effective* app theme (`getTerminalColorEnv()`, `apps/emdash-desktop/src/main/core/terminal-shell/color-env.ts`): `'0;15'` for light, `'15;0'` for dark, resolved from `nativeTheme.shouldUseDarkColors` when the app theme setting is `'system'`. This lets shell tools/TUIs that respect `COLORFGBG` (many `ls` colorschemes, some prompts) auto-adjust to the app's light/dark state even though xterm.js's own ANSI palette isn't retheme'd.
- A GUI-launched app doesn't inherit the user's interactive shell `PATH`/env, so **`captureShellEnv()`** (`packages/core/src/services/shell-env/node/capture.ts`) spawns `$SHELL -ilc env` (login+interactive flags) to capture it, guarded against recursive capture via `SHELL_ENV_CAPTURE_GUARD`, 5s timeout, 1MB max buffer; Windows short-circuits to `process.env` unchanged (`source: 'windows'`). Exposed to the rest of the app as `userShellEnvContract.get()`.
- Only an **allowlist** of captured/host env vars is actually forwarded into spawned terminal/agent processes: `packages/core/src/primitives/agent-env/api/index.ts` — `AGENT_ENV_VARS` (~130 entries: every major coding-agent CLI's own env vars — `ANTHROPIC_*`, `OPENAI_*`, `GEMINI_API_KEY`, `AWS_*`, `GH_TOKEN`/`GITHUB_TOKEN`, proxy vars, etc.), plus `WINDOWS_AGENT_ENV_VARS` (`TEMP`, `TMP`, `SystemRoot`, `ComSpec`, …, Windows only), plus `GLOBAL_AGENT_ENV_VARS` (`EDITOR`, `VISUAL`, `GIT_EDITOR`, `HOSTNAME`, `LANG`, `TZ`, always). **Notably absent from the allowlist:** `CLAUDE_CODE_OAUTH_TOKEN` — confirms the exact gap this repo's own CLAUDE.md documents about Emdash sessions on the Keychain-auth path (this is evidence *about the fork Kirubel already noted*, included here because it's directly relevant to anyone rebuilding this exact allowlist).

---

## Preview servers (dev server detection, direct + SSH-forwarded)

### Automatic dev-server URL detection

What it is: every terminal's PTY output stream is watched for `http(s)://localhost|127.0.0.1|0.0.0.0[:port][/path]` URLs (regex `URL_PATTERN`) as a lightweight heuristic for "a dev server just started here" (e.g. Vite/webpack/Next printing "Local: http://localhost:5173").

What the user can do: nothing directly — it's passive; the detected server surfaces as a **preview pill** (below). No UI is needed to trigger detection.

Mechanics (`packages/core/src/services/preview-detection/node/url-detector.ts`, `wireTerminalUrlDetector`):
- Buffers up to 4096 chars of raw PTY output, strips ANSI CSI/OSC control sequences and `\r` before matching, so URLs split across paint frames still match.
- Once a URL is seen, dedupes by `protocol:port` and does **not** re-detect it.
- If `probeLocalPorts` is on (default), opens a raw TCP probe (`net.createConnection`, 500ms timeout) on an **adaptive cadence**: every 1s while unconfirmed or just failed, backing off to every 15s once confirmed open (`PROBE_FAST_INTERVAL_MS` / `PROBE_STEADY_INTERVAL_MS`) — cuts probe volume from ~60/min to ~4/min per URL once steady.
- Closes/removes the detected server after **2 consecutive** failed probes (`PROBE_FAILURES_TO_CLOSE`), or immediately when the owning PTY exits (`reason: 'pty-exit'` vs `'local-probe-failed'`).

Backend bridge: `createDevServerBridge()` (`apps/emdash-desktop/src/main/core/preview-servers/dev-server-bridge.ts`) subscribes to the runtime's live `devServers` list (both interactive terminals and lifecycle-script terminals, unified under one shape) and diffs it against the previous snapshot to call `registerDetectedTarget()` / `handleTerminalSourceClosed()` on the preview-servers feature. "Stop" from the UI routes back through here: for a lifecycle-script-owned dev server it calls the scripts runtime's cancel; for an interactive terminal it sends `Ctrl-C` (`\x03`).

### Manual port forwarding (SSH workspaces)

What it is: for a workspace running on a remote SSH machine, the user can manually open a tunnel from a **remote port** to a local one, independent of auto-detection (useful when the dev server's URL never gets printed, or listens on a port the terminal didn't show).

What the user can do: "Forward Port" dialog (`ManualForwardDialog`) — pick protocol (HTTP/HTTPS dropdown), enter a **remote port** (required, 1–65535) and an optional **local port** (blank = auto-assigned); submits via `previews.forwardManual()`. Errors surfaced inline: not-an-SSH-workspace, host-unavailable, not-configured, project-unavailable, open-failed, cancelled.

Backend: `PortForwardService` (`apps/emdash-desktop/src/core/features/preview-servers/node/port-forward-service.ts`) opens an `openPortForwardTunnel()` over an `SshClientProxy`'s TCP channel (`openTcpChannel`), tracked per request id with cancellation scopes; emits `onConnectionError`, `onProbeResult`, `onConnectionEstablished` events; `stopForWorkspace`/`stopForProject` bulk-tear-down tunnels.

### Preview server pill (task titlebar)

What it is: a chip per detected/forwarded preview server shown in the task titlebar, the primary way a user reaches a running dev server from inside the app.

What the user can do (dropdown menu on the pill): see the resolved URL (or "No local URL" if a forwarded tunnel hasn't picked a local port yet); for forwarded servers, see "Remote {port} to local {port}"; **Open in Emdash Browser** (opens the in-app `webview` browser pane, focuses main region), **Open in System Browser** (`openExternal`), **Copy URL**, **Restart Forward** (forwarded servers only), **Stop**. The trigger button itself shows a spinner while `starting`/`reconnecting`, otherwise a globe icon, plus the formatted label.

States (`PreviewServerStatus`): `starting | ready | not-listening | reconnecting | failed`. `not-listening` is explicitly "advisory" — the SSH tunnel is open but nothing answered a probe yet; opening the URL is still offered as a legitimate retry since a successful dial flips it back to `ready`. `failed` carries a message.

Data shape (`apps/emdash-desktop/src/core/primitives/preview-servers/api/types.ts`): a `PreviewServer` is either `DirectPreviewServer` (`host: 'localhost' | '127.0.0.1'`, `port`) or `ForwardedPreviewServer` (`connectionId`, `remotePort`, optional `localPort` until the tunnel picks one); `previewServerUrl()` composes the final URL from either shape.

For SSH workspaces with zero detected/forwarded servers, the pill row still renders a **"Forward Port"** manual-add affordance instead of disappearing. If the whole preview-servers observation is `unavailable`, an inline "Preview unavailable" note explains why (live-action-disabled reason).

### In-app browser (Emdash Browser)

What it is: an Electron `<webview>`-backed browser pane (`BrowserPane`, `apps/emdash-desktop/src/core/features/browser/browser/browser-pane.tsx`) that can open a preview URL without leaving the app. Has its own toolbar, start page, load-error presentation (`describeBrowserLoadError`), zoom control (`normalizeBrowserZoomFactor`), forward/back, "open externally" fallback, and tab-cycling commands. This is adjacent to the "terminals/preview" brief rather than core to it — flagged here because it's the direct target of "Open in Emdash Browser" from the preview pill, but a full catalog of the browser feature belongs to whichever area owns `features/browser`.

---

## Remote & local machines (SSH)

### Add / edit / connect a machine

What it is: the "Machines" settings area lets the user register a **remote SSH host** as a place to run workspaces (as an alternative to the local machine), including full lifecycle management of the connection and of a workspace-server daemon running on that host.

What the user can do (`machine-form.tsx` + `machineFormSchema`, Zod-validated):
- Name, host (validated as hostname/IP unless an SSH-config alias is used), port (1–65535), username.
- **Auth type**: `password`, `key` (private key path), or `agent` (SSH agent forwarding). Password required only when creating (not editing, so an existing saved password isn't forced to be re-entered); key path required for `key` auth unless an SSH-config alias is set.
- Optional **SSH config alias** (validated against a restrictive pattern, can't start with `-`) — when set, host validation is skipped in favor of trusting the alias, and `use-ssh-config-hosts.ts` can enumerate `~/.ssh/config` entries to autofill.
- Optional **ProxyJump** and **ProxyCommand**.
- **Forward agent** toggle.
- All text fields reject leading/trailing whitespace with a specific validation message per field.
- Connect / Disconnect / Retry / Edit actions on a connection row (`MachineConnectionRow`), each gated by `ProjectAvailabilityUi.LiveActionGuard`.
- Rename, delete a saved machine.
- **"Sync local settings"** toggle per machine — mirrors this desktop's local settings (currently: watcher exclusions) to that remote host; deliberately a separate RPC (`setSyncLocalSettings`) from the general save, "so toggling never drops the pinned host connection."

Backend contract (`machinesContract`, `apps/emdash-desktop/src/core/features/machines/api/contract.ts`): `getMachines`, `getMachineUsage` (which projects use a machine), `getMachineMetrics` (live resource sample), `systemDependencies`/`installSystemDependencies` (live model + live job), `hostSettings`/`updateHostSettings` (live model), `saveMachine`, `setSyncLocalSettings`, `deleteMachine`, `renameMachine`.

Data shape (`SshConfig`, `apps/emdash-desktop/src/core/primitives/ssh/api/ssh.ts`): `id, name, host, port, username, sshConfigAlias?, authType: 'password'|'key'|'agent', privateKeyPath?, useAgent?, forwardAgent?, proxyJump?, syncLocalSettings?`. Connection state machine: `ConnectionState = 'connecting'|'connected'|'reconnecting'|'disconnected'|'error'`.

UI: `MachineBadge` (connection-state pill), `MachineConnectionRow`, `machine-form.tsx`/`add-machine-modal.tsx`, `machines-settings-page.tsx`, `machine-details-page.tsx`, `use-ssh-config-hosts.ts`.

### Machine status indicator (design-system component)

`MachineStatus` (`packages/ui/src/react/components/machine-status/machine-status.tsx`) — a small SVG glyph (two stacked "rack" bars with dots + a corner status dot) used to represent a machine's live state.

Kinds (`MachineStatusKind`): `idle | successful | error | initializing`, labeled "Idle" / "Connected" / "Error" / "Initializing" for the `aria-label`. Size is a single `size` prop (px or CSS length) driving a `--machine-status-size` CSS var — so it scales as one unit rather than independent icon/dot sizing. Mapped from richer availability state via `deriveMachineStatusKind()`: `suspended`/no availability → idle; `preparing` → initializing; `ready` → successful; anything else with an `issue` → error.

### Host settings (per-machine defaults)

What it is: machine-level defaults applied to every workspace hosted on that machine (local machine has its own instance too — `machineId` optional), editable live, and reflecting external edits to the host's on-disk settings file in near real time (live model).

What the user can do (`HostSettingsCard`):
- **Shell setup** — arbitrary shell commands (e.g. `nvm use`, `source .envrc`) prepended to *every* lifecycle script and terminal session on that host; a workspace's own `.emdash.json` `shellSetup` overrides it. Multi-line textarea, commits on blur.
- **Worktree root** — default directory new git worktrees are created under on that host (e.g. `~/emdash/worktrees`); per-project settings can override.
- **Enable tmux by default** — switch; disabled with an explanatory note on Windows sessions ("tmux is unavailable for Windows sessions. Your stored preference is preserved" — the preference itself is still stored, just inert).
- **Sync local settings** (remote machines only) — see above.
- **Watcher exclusions** — newline-separated glob patterns the file watcher skips (editor, git status, workspace tracking) on that host; becomes read-only and shows synced values when "Sync local settings" is on; explains the cost of not excluding: "watching dependency or build folders can use tens of thousands of native watches"; changes apply on next workspace-server restart, not live.
- A parse-error banner if the host's settings file itself is malformed ("defaults are in effect until it is fixed").

Text fields are careful about focus-vs-external-update races: local edit state only resyncs from the live model while the field isn't focused (`editing` ref), so an out-of-band file edit doesn't clobber what the user is mid-typing.

### Workspace server (remote runtime daemon)

What it is: a background daemon (**"workspace server"**) that must be running on a remote host for that host's workspaces to work — install it, start/stop/restart it, check its health, and update it, all from the Machines UI (`WorkspaceRuntimeRow`, `apps/emdash-desktop/src/core/features/machines/browser/components/workspace-server-card.tsx`).

What the user can do: **Install** (if not present, shown as a download/play `SplitButton`), **Start/Stop/Restart**, and — reusing the exact same `UpdateCard` component as the app's own self-update UI (see below) — **Check for updates / Update / Restart to apply**, with its own progress and error surface. A status badge (`WorkspaceServerBadge`) shows `healthy`/other statuses; a `Reconnecting` pill covers the transitional "trying to restore workspace access" state, during which the last-known runtime details are still shown rather than blanked.

### Machine resource monitoring

What it is: live CPU / Memory / Disk utilization for a machine (local or remote), shown as three stat cards (`ResourceUtilizationRow` / `ResourceCard`, `machine-resources.tsx`) — percent used plus a formatted "`used` / `total`" byte string for memory and disk (`formatBytes`: B/KB/MB/GB/TB, 0 decimal places above 10 units, else 1). Backed by `getMachineMetrics` → `ResourceUsageSample` (cpu/memory/disk each with `usedPercent`, and memory/disk additionally `usedBytes`/`totalBytes`).

### Host system dependencies

What it is: per-host required/recommended CLI tool checks with one-click install, surfaced per machine (and for the local host) — e.g. does this host have Git, ripgrep, Node.js, npm, tmux, curl.

Concrete dependency catalog (`packages/core/src/services/host-dependencies/api/core-dependencies.ts`), each with per-OS install commands:

| Dependency | macOS | Linux | Windows |
|---|---|---|---|
| Git | `brew install git` | `apt install git` | `winget install --id Git.Git` |
| Ripgrep | `brew install ripgrep` | `apt install ripgrep` | `winget install --id BurntSushi.ripgrep.MSVC` |
| Node.js | `brew install node` | `apt install nodejs npm` | `winget install --id OpenJS.NodeJS.LTS` |
| npm | `brew install node` | `apt install npm` | `winget install --id OpenJS.NodeJS.LTS` |
| tmux, curl | (present, not excerpted above) | | |

Each descriptor carries `installDocs` (a URL), a `binaryNames` list to probe for, and per-platform `installCommands[]` marked `recommended`/`elevation: 'always'|'never'`.

What the user can do (`InstallMachineSystemDependenciesInput`/batch install): install one or several dependencies at once, per host, optionally forcing a specific `InstallMethod` and/or `elevate` (sudo/admin) — surfaced via a `liveJob` (`installSystemDependencies`) so the UI gets streaming progress (`hostDependencyOperationProgressSchema`) rather than a single blocking call, and a per-dependency success/error result map at the end.

UI: `machine-system-dependencies.tsx`, `system-settings-page.tsx` (local host's own dependency panel).

### Machine's conversations / workspaces lists

What it is: per-machine drill-down pages listing the conversations (agent sessions) and workspaces that live on that machine — `machine-conversations-list.tsx`, `machine-conversations-list-model.ts`, `workspaces-list-view.tsx`, `workspaces-list-model.ts`, `workspace-detail-page.tsx`. Not detailed further here as it's primarily a conversations/workspaces-feature concern reusing machine identity, not a terminal/runtime concern per se.

### Workspace disk usage

What it is: a per-workspace disk-footprint measurement, split into total exclusive bytes and **reclaimable "artifact" bytes** (git-ignored build output — resolved via `git clean -ndX`), shown in the workspace header (`repository-header.tsx`: "`{total}` · `{artifacts}` artifacts").

Backend: `measureAbsolutePathUsage()` (`packages/core/src/services/fs-usage/node/index.ts`) recursively `lstat`s a directory tree, correctly de-duplicates **hardlinked** files (relevant because git worktrees hardlink objects — so two worktrees sharing files don't double-count disk usage), and reports `apparentBytes` (logical size) vs `diskBytes` (actual blocks×512) vs `exclusiveDiskBytes` (post-hardlink-dedup) vs `artifactBytes`. Wrapped for workspaces specifically by `measureWorkspaceUsage()` (`packages/core/src/runtimes/workspace-registry/node/measure-usage.ts`).

---

## Process execution primitives (backend infrastructure, indirectly user-facing)

### Bound exec

What it is: the general-purpose "run a program and get its output" primitive (`BoundExec`, `packages/core/src/services/exec/api/bound-exec.ts`) used throughout the app for git operations, dependency installs, lifecycle scripts, etc. — not itself a UI feature, but the thing that makes "run a script and watch its output stream" and "install this dependency" possible.

Capabilities: `.exec()` (buffered text), `.execStreaming()` (line callback, can early-terminate by returning `false`), `.execBuffer()` (raw `Buffer` stdout, for binary output), `.spawn()` (raw child process handle), `.withCwd()` (rebind to a new working directory). Every variant supports `timeoutMs` (kills and reports `ExecError` with a "Timed out after Nms" message), `signal` (AbortSignal cancellation), `maxBuffer` (default 10MB, kills and errors past it, tracked separately for stdout/stderr), and `onStderr` streaming callback regardless of which stdout mode is used. Uses `detached: true` + a process-tree terminator (same tree-kill approach as PTY termination above) rather than killing just the direct child.

### Execution planning / shell quoting

`planExecutableLaunch()` (referenced from `#primitives/exec/node`) decides, per-platform, whether to invoke a program directly (`argv` invocation) or wrap it through a shell/command-line string (Windows), and `formatCommandLine()`/`quoteArg()` (`#primitives/exec/api`) handle POSIX vs csh quoting rules. This is the same machinery `local-spawn.ts` uses for PTY spawns, so shell-quoting behavior is consistent between "run a command in a real terminal" and "run a command headlessly for a script/dependency install."

---

## Update card (design-system component, reused for both app self-update and workspace-server update)

`UpdateCard` (`packages/ui/src/react/components/update-card/update-card.tsx`) — a status card with one primary action button, driven entirely by a `UpdateStatus` union so the same component serves the desktop app's own "Check for Updates" panel and the workspace-server's update panel:

- `{ type: 'up-to-date' }` → "Check for updates" button, success icon, "You're up to date".
- `{ type: 'update-available'; version; onUpdate }` → "Update" button, warning icon.
- `{ type: 'update-download-available'; version; size; onDownload(onProgress, cancel?) }` → "Download" button that becomes an inline progress bar (`DownloadButton`) while downloading, resettable progress state per status change.
- `{ type: 'update-install-available'; onInstall }` → "Restart" button ("Update ready to install").

Accepts an optional `error: { message }` shown as an error `Pill` next to the status title (tooltip = full message).

---

## Script status indicator (design-system component)

`ScriptStatus` (`packages/ui/src/react/components/script-status/script-status.tsx`) — small SVG glyph used for lifecycle-script tabs (setup/run/teardown scripts) in the terminal drawer's "Scripts" mode.

Kinds (`ScriptStatusKind`): `success` (checkmark), `error` (X), `in-progress` (four dots pulsing clockwise 1→2→4→3→1, `DOT_POINTS` laid out as a 2×2 matrix), `waiting` (single filled dot), `cancelled` (horizontal dash). Same `size` prop → CSS-var scaling pattern as `MachineStatus`. Mapped from the lifecycle script store's own status enum (`idle→waiting, running→in-progress, succeeded→success, failed→error, cancelled→cancelled`) in `terminal-drawer-tab-bar.tsx`'s `SCRIPT_STATUS_MAP`.

---

## Stepped loader (design-system component)

`SteppedLoader` (`packages/ui/src/react/components/stepped-loader/stepped-loader.tsx`) — a single-row "step N of M" progress indicator used for multi-stage async flows (workspace provisioning, dependency install batches, etc. — INFERRED usage sites not directly traced in this pass, but the shape fits those flows exactly).

What it shows: current step's icon (`pending` = empty circle, `loading` = `SegmentedSpinnerIcon`, `error` = alert-circle) + step name, animated slide-out/slide-in transition when the active step changes (220ms exit, 180ms enter, via internal presentation-phase state machine so a fast step-to-step transition doesn't visually stutter), optional per-step children (e.g. a progress bar), a footer showing `current/total` and optional `actions` (e.g. retry/cancel buttons). `SteppedLoaderProgress` is a companion sub-component: a labeled percent bar (`role="progressbar"`, clamped 0–100, rounded) for use inside a step's children slot.

---

## Runtime broker & host runtime contract (architecture, not directly a UI feature)

What it is: the mechanism by which every host-scoped feature (terminals, git, file search, scripts, host dependencies, resource usage, workspace registry, ACP/TUI agent protocols, automations, conversations, agent config, host settings) is served as one unified RPC surface (`hostRuntimesContract`, `packages/core/src/services/runtime-broker/api/contract.ts`) that's transport-agnostic — the same contract is satisfied by a **local** in-process runtime or a **remote** `workspace-server` process reached over SSH.

`RuntimeBroker` (`runtime-broker.ts`) manages per-host client bindings keyed by a formatted `HostRef`, with two independent epoch counters: a **rebind epoch** (transport recovered/reconnected — existing binding is kept if still valid) and an **identity epoch** (the host itself changed identity — forces full invalidation, `runtimeHostIdentityLost` error). `forget(host)` bumps identity epoch and disposes the binding outright (used when a machine is deleted/replaced, not just disconnected).

Why this matters for a rebuild: it's the seam that makes "this workspace happens to be on a remote machine" nearly invisible to every other feature — terminals, preview servers, and dependency installs above are all written once against `hostRuntimesContract` and Just Work whether `HostRef` resolves to `local` or `ssh:<connectionId>`.
