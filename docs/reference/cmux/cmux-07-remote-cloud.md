# SSH, cloud, machines and system tools

cmux's remote/cloud layer covers three things that share a lot of plumbing: `cmux ssh` (a workspace against any machine you can already reach with OpenSSH, including a mirrored `remote tmux` mode and a roaming Mosh transport), Cloud Machines (Freestyle-backed VMs cmux itself provisions, of which "Base" is the always-on default one), and a set of machine-local system tools — the Computer Use Mac-automation helper, the iOS/iPadOS Simulator pane, the sudo-approval broker, Vault (agent session search/resume/fork), and Task Manager/`cmux top`/`cmux memory`. All of it is layered under one macOS MDM policy system that can disable each piece independently.

## SSH workspaces

### `cmux ssh` — creating a remote workspace

Typing `cmux ssh user@remote` (in a terminal, or via the CLI relay from inside another session) opens a new cmux workspace backed by that machine. It reads `~/.ssh/config` for host aliases, identity files and proxy settings, so all flags mirror plain `ssh`'s. No `--name` is required — remote-tagged workspaces default to a name derived from the destination.

Flags (`docs/ssh/page.tsx` + `web/messages/en.json` `docs.ssh.*`):
- `--name <text>` — sets the workspace title.
- `--command <text>` — runs that text once in the initial remote terminal, after shell startup; staged without local evaluation and tracked in the workspace's remote shell-state directory so it never reruns on reconnect/reattach.
- `-p, --port <n>` — SSH port, default 22.
- `-i, --identity <path>` — identity file.
- `-o, --ssh-option <opt>` — arbitrary SSH option, e.g. `-o StrictHostKeyChecking=no`.
- `--transport ssh|mosh` — interactive terminal transport (default `ssh`).
- `--no-focus` — creates the workspace without switching to it.
- `-A, --forward-agent` / `-a, --no-forward-agent` — SSH agent forwarding is opt-in; cmux preserves its live `SSH_AUTH_SOCK` so `ForwardAgent yes` in `ssh_config` still works.

Mixed short-option clusters after the destination are rejected with `ssh: mixed short-option cluster '%@' is not supported after the destination; use --ssh-option for SSH flags or -- for remote command arguments` (`cli.ssh.error.mixedTTYOptionCluster`).

### SSH authentication and connection failures

- `cli.ssh.authenticationFailed` — "SSH authentication did not open the connection. Check your SSH credentials and retry."
- `cli.ssh.authenticationNeedsTerminal` — "SSH authentication requires a terminal. Run this command from an interactive shell."
- `cli.ssh.authenticationForegroundFailed` — "Could not hand the terminal to SSH for %@. Authentication was cancelled to avoid a hang (%@)."
- `cli.ssh.authenticationLaunchFailed` / `authenticationSystemExecutableRequired` / `authenticationExitFailed` (exit code interpolated).
- Interactive auth (password, host-key confirmation, MFA) is handed to the system `ssh` inline in the terminal so the user can answer prompts; non-interactive hosts (ssh-agent, key on disk) attach silently.

### Reconnect

- On drop, cmux reconnects with exponential backoff: **3s, 6s, 12s, up to 60s** (`docs.ssh.reconnectDesc`).
- Default SSH keepalive is injected unless the user's own config already sets it: `ServerAliveInterval=20`, `ServerAliveCountMax=2`.
- The remote session persists; cmux reattaches and resizes with **smallest-screen-wins** semantics (`remote-daemon-spec.md` §5): effective PTY size is `min(cols)` × `min(rows)` across all attached clients, recomputed on attach/detach/resize/reattach, and a session with zero attachments keeps its last-known size rather than resetting to 80×24.
- Auto-reconnect status lines printed into the terminal: `[cmux] ssh exited with status %s; reconnecting (attempt %s/%s).`, then `[cmux] SSH reconnected (attempt %s/%s).`, with a standing hint `[cmux] close this pane or press Ctrl-C to stop reconnecting.`
- A manual-reconnect prompt variant exists too: `[cmux] the SSH connection ended; the remote session may still be running.` / `[cmux] press Enter to close this pane. Press r then Enter to reconnect.`
- **Parking**: a session that cannot become ready parks — its single terminal transition — rather than retrying forever. A session that bootstraps over SSH parks if no proxy endpoint is published within **60 seconds** of its first daemon `hello`. Parking releases any `ssh-pty-attach --wait` callers with the same detail text the sidebar shows. Managed Cloud VM sessions are never deadlined this way.
- Context-menu actions on remote workspaces: **Reconnect Workspace(s)**, **Disconnect Workspace(s)**.

### Mosh transport

- `cmux ssh user@remote --transport mosh`, or the alias `cmux mosh user@remote`. Requires **Mosh 1.4+** locally (needs `--experimental-remote-ip` support) and probes for `mosh-server` on the remote over a plain `/bin/sh` lane; cmux never installs Mosh itself.
- Mosh carries only the interactive PTY. SSH remains the management lane for `cmuxd-remote` upload/bootstrap, daemon RPC, the reverse CLI relay, browser proxy/egress, uploads and reconnect controls — i.e. Mosh never replaces SSH, it's added alongside it.
- Fallback messages, each falling back to plain SSH: `[cmux] Remote SSH advertised an unusable address; resolving the Mosh address through the SSH connection.`, `[cmux] Remote bootstrap install failed; continuing over SSH.`, `[cmux] Mosh is not installed locally; continuing over SSH.`, `[cmux] The local Mosh client lacks required SSH integration; continuing over SSH.`, `[cmux] Could not verify remote Mosh support; continuing over SSH.`, `[cmux] mosh-server is not installed on the remote host; continuing over SSH.`
- When `SSH_CONNECTION` is empty/unusable, cmux switches Mosh to its SSH-proxy address-resolution mode and explains the fallback rather than failing.
- `cmux mosh-tmux user@remote [--session <name>]` — creates/attaches a **named tmux session** (default `main`) over Mosh. This is a "roaming terminal attach," explicitly *not* the same as the native pane-mirroring `cmux ssh-tmux` (tmux control mode needs a lossless byte stream; Mosh only synchronizes terminal screen state, so native mirroring over Mosh is architecturally deferred). The tmux profile persists across reconnect and app session restore. Without Mosh installed, the same named-session profile still runs, just over plain SSH.
- Native `ssh-tmux`-style mirroring over Mosh, running the daemon/control lane over Mosh, and automatic recovery from blocked UDP after a successful capability probe are all explicitly `DEFERRED` (not built).

### Remote tmux (`cmux ssh-tmux`) — separate from Mosh, a Beta Features flag

This mirrors a *real* tmux session running on the remote into cmux's native UI (workspaces/tabs/splits), driving tmux control mode (`tmux -CC`) — distinct from `mosh-tmux`'s roaming-terminal profile.

- **Off by default**; enabled in Settings → Beta Features → "Remote tmux". Local terminals are unaffected until opted in.
- Requires tmux **3.2+** on the remote (control mode is standard tmux, no special build); cmux checks the version before attaching and fails clearly on older servers.
- Mapping: a tmux **session** → a dedicated workspace in the sidebar; a tmux **window** → a tab in that workspace; a tmux **pane** → a native cmux split *inside* that tab. This is new: a cmux tab used to be exactly one terminal, but a multi-pane tmux window is now a real in-tab split. The bridge is two-way — splitting/closing a pane in that tab runs `split-window`; reordering tabs runs `swap-window`.
- Run `cmux ssh-tmux <destination>` (an `~/.ssh/config` alias or `user@host`); `--new-window` opens it in a dedicated new window instead of the current one. `--port`, `--identity`, `--no-focus` supported. Non-interactive hosts attach silently; interactive-auth hosts get `ssh` run inline first.
- "Permission denied" troubleshooting: the destination is handed to `ssh` as-is, so the alias must carry `User` and `IdentityFile` itself (cmux does not fall back to the local username), or pass the user explicitly: `cmux ssh-tmux dev@my-ssh-alias`.
- Behavior: remote client resized to the rendered grid (`refresh-client -C`, so TUIs aren't stuck at 80×24); programmatic splits (`cmux new-split` / `surface.split`) report *accepted with no surface id* — the pane arrives asynchronously once tmux confirms; requests carrying options the routed split can't honor (startup command, working directory, divider position, left/up placement) are rejected up front; working directory is tracked live and shown on the tab; paste/drop of text and images goes through `paste-buffer -p` so an agent receives real bracketed paste (an image arrives as `[Image #N]`, not a local path); mouse clicks/scroll/drag reach the remote app when it has mouse mode on, Shift+drag forces a native cmux selection/copy instead; multi-byte Unicode split across tmux updates is reassembled correctly.
- Socket commands (also gated on the Beta flag): `remote.tmux.sessions`, `.attach`, `.mirror` (returns the `ssh` command to run when interactive auth is needed), `.detach`, `.state`. A dash-prefixed host or identity file is rejected at the trust boundary as SSH-option-injection defense.
- **Limitations**: transient SSH drops auto-reconnect with capped exponential backoff (mirror freezes, then re-seeds panes on resume); the mirror only closes for good when the remote tmux session itself ends or the user closes the window/quits cmux, and it is **not restored on app relaunch** (must re-run `cmux ssh-tmux`). Only single-line paste/drop (a file/image path) is delivered as real bracketed paste; multi-line text is sent as plain keystrokes. Primary-screen scrollback is **not re-wrapped on resize** — cmux defers reflow to tmux entirely, so older lines can stay at the old width until the app repaints (full-screen TUIs that redraw on resize are unaffected).

### SSH deep links

`cmux://ssh?...` (stable), `cmux-nightly://ssh?...`, `cmux-dev://ssh?...` (Debug/tagged dev builds), with a web fallback `https://cmux.com/deeplink/ssh?...` that opens the native link or shows the download page if cmux isn't installed. Opening a link shows a **confirmation prompt** with the command preview before connecting — required trust step, per `deepLinksSecurityDesc`.

Parameters: `host` (required, SSH host or config alias), `user` (optional, combined as `user@host`), `port` (1–65535), `title`/`name` (workspace title, only one of the two), `connect-timeout` (seconds, 1–600), `server-alive-interval` (seconds, 1–3600), `server-alive-count-max` (1–100), `host-key-policy` (`accept-new` | `ask` | `strict` | `yes`), `no-focus` (boolean).

External links **cannot** pass identity files, raw SSH options, commands, `ProxyCommand`, or forwarding rules — those must live in `~/.ssh/config`. Also: `https://cmux.com/deeplink/prompt?text=...` and `.../deeplink/rules?name=...&text=...` for prompt/rules buttons (commas, colons, literal `+` preserved when URL-encoded); `https://cmux.com/cmux-icon.svg` / `logo.png` for dashboard buttons.

### Browser panes over SSH

A browser pane opened inside a remote SSH workspace routes **all** HTTP and WebSocket traffic through the remote machine's network — typing `localhost:3000` shows the dev server running on the remote box, no `-L` flags or manual forwarding. Each remote workspace gets an isolated cookie store, so sessions are scoped per-connection.

### Drag-and-drop / image upload via scp

Dragging an image or file into a remote terminal uploads it via `scp` through the existing SSH connection. cmux detects the *foreground* SSH process by TTY and routes the upload through **ControlMaster multiplexing** (no new connection).

### Notifications over SSH

A remote coding agent calling `cmux notify` on the remote box surfaces the notification in the *local* sidebar: the blue ring lights up on the workspace tab, and **Cmd+Shift+U** jumps to it. Notification spam from a flaky connection is suppressed with a **per-host cooldown**.

### Coding agents over SSH

`cmux claude-teams` and `cmux omo` both work inside SSH sessions. The remote host runs a Go relay daemon that performs the same tmux-compat translation the local Swift CLI does; teammate agents spawn as **native cmux splits on the local machine** while computation runs on the remote box.

### Relay daemon (`cmuxd-remote`)

On first connect, cmux probes the remote host (`uname -s`, `uname -m`) and uploads a versioned `cmuxd-remote` binary (verified against a SHA-256 manifest embedded in the app's `Info.plist`), stored at `~/.cmux/bin/cmuxd-remote/<version>/<os>-<arch>/cmuxd-remote`. It speaks JSON-RPC over stdio and handles: (1) **browser traffic proxying** — SOCKS5 and HTTP CONNECT over the daemon's stdio channel; (2) **CLI relay** — a reverse TCP tunnel with HMAC-SHA256 auth so remote processes can call local `cmux` commands; (3) **session management** — persists sessions across reconnects, coordinates PTY resize across multiple attachments.

Implementation detail from `remote-daemon-spec.md` (not surfaced in the product doc but user-observable via `cmux remote-daemon-status`):
- Normal `cmux ssh` launches `cmuxd-remote serve --stdio --persistent --slot <slot> --persistent-lease-port <port>`; the stdio process proxies to a long-lived authenticated daemon under `~/.cmux/daemon/<version>/<slot>/`.
- The reverse relay uses `ssh -N -R 127.0.0.1:PORT:127.0.0.1:LOCAL_RELAY_PORT` (TCP, not Unix-socket forwarding — many servers disable `AllowStreamLocalForwarding`), with `-S none`/standalone transport and `ExitOnForwardFailure=yes` so dead binds fail fast.
- Relay auth: `~/.cmux/relay/<relay_port>.auth` holds a relay ID + token; the local relay requires HMAC-SHA256 challenge-response before forwarding any command. Sessions have a **16-connection cap**, **10-second handshake deadline**, **30-second lifetime**, bounded responses, and cancellation of outstanding local-socket I/O. Deny-by-default method allowlist and closed parameter schemas (GHSA-9vmv-3hjw-j28c).
- `~/.cmux/bin/cmux` wrapper is installed (also tried at `/usr/local/bin/cmux`) so remote processes can just run `cmux`; busybox-style argv[0] detection auto-dispatches to the CLI relay when invoked that way.
- Ephemeral port range 49152–65535 is filtered from port-probe results to exclude other workspaces' relay ports; multi-workspace port conflicts are detected via a TCP connect check and silently skipped rather than flagged.
- `cmux remote-daemon-status` exposes the manifest entry, local cache verification state, release download command, and GitHub attestation verification command.

### `remote.*` MDM policy (`DisableRemoteConnections`)

Disables SSH, Mosh and remote-tmux creation from every entry point (palette, menus, CLI, socket automation, session restore). Socket refuses with `remote_connections_disabled`; `ssh://` links are refused up front. Activating mid-session disconnects every live cmux-created remote workspace and remote-tmux mirror (no reconnect redial; wake-from-sleep re-arm is skipped). This key **also blocks Cloud Machine attach** (it's the same connection mechanism) even when `DisableCloud` is off — `DisableCloud` disables Cloud as a *product*, this one disables the transport. A user's own `ssh` typed into a shell is explicitly out of scope. Related: `DisableFileTransfer` separately blocks drag/paste uploads, remote-file previews, phone↔Mac transfers, and `cmux vm push`/`pull` (RPC code `file_transfer_disabled`); `DisableIrohNetworking` disables the separate peer-to-peer transport used for Mac↔Mac/iOS pairing, unrelated to SSH.

## Cloud

### Base — the default persistent cloud workspace

"Base" is the product name for cmux's default, always-on cloud VM; **one per personal or team account scope**. (`docs.base`; note the doc's own caveat: "Preview naming. Some CLI output and lower-level menus still say Cloud VM while the product name moves to Base" — `cli.vm.help.baseCreate` still literally says "the devbox with a VNC screen.")

- **Open Base** is idempotent: creates the scoped VM only if it doesn't exist, otherwise resumes + attaches. Command palette entry: **"Open Base"** (`command.cloudVM.title`); `machines.agent.menuLabel` / `machines.new.title.base` = "Set Up Base".
- **Reset Base**: creates a new Base *generation* for the same account scope; the previous generation is retained (recoverable), not deleted outright.
- **Create VM**: makes an additional, separate machine.
- **Fork VM**: copies the current VM into a new branch of work.
- Personal Base and a Team Base are **different VMs**, even from the same Mac; switching accounts/teams changes which Base opens.
- Persistent: files, installed tools, shell history and agent state stay until an explicit reset.
- Reachable from Mac and iOS independently — the Mac that created the workspace does not need to stay online; iOS lists and attaches through the cloud control plane while signed in.
- Each terminal pane has its own remote PTY session; split/new-tab creates a new session; scrollback survives app relaunch; reconnects are meant to be quiet in the terminal (state shown in UI, not scrollback retry spam); a stale terminal endpoint gets an **in-place repair attempt** before the user is asked to reset anything.
- Security model: auth via cmux account; terminal attach endpoints are short-lived and scoped to account+device+VM+session; provider credentials/bootstrap secrets stay server-side; Team Base access is checked server-side on every list/open/attach/fork/checkpoint/reset call.
- CLI: `cmux vm base open`; error-recovery hint: `command.cloudVM.failed.action.exit` = "Open a terminal and run `cmux auth status`, `cmux vm ls`, then `cmux vm base open`. If you hit the active VM limit, delete one with `cmux vm rm <id>` and retry." `cli.vm.help.legacyBaseKindFlags` — Base always has a screen; `--base` on `vm new` creates a shell-only machine with no desktop (`cli.vm.desktop.unavailable`).

### Machines panel — creating and managing VMs

- Empty state: "No machines yet" / "A machine is a persistent cloud computer. It keeps your files forever and costs nothing while it sleeps." with a **New Machine** button.
- Plan gating strings: "Your plan includes 1 machine" vs "Your plan includes unlimited machines"; "Subscribe to cmux Pro to create Cloud machines"; "Upgrade to use more than 1 machine". A meter shows `%d of %d` (or `%d of 1 machine`) with help text "Machines on your plan. Sleeping machines cost nothing." Requires **cmux Pro** ("Cloud machines need cmux Pro" / requiresPro.title). Larger machine sizes require **cmux Max** (or Pro, phrased separately: `cloudVM.error.memoryRequiresPlan.proAction`).
- **New Machine** dialog: Name (optional label), Machine size (RAM/disk profile — "Memory. CPU scales with it."), Image. Sizes can be plan-locked: `machines.new.size.locked.row` = "%@ · Requires %@", with an "Upgrade to %@" affordance and a checkout continuation (`machines.new.max.checkout` = "Continue to checkout"). Creating shows "Creating…" then continues in the background if the dialog is dismissed ("Creation continues in the Machines panel.").
- Free trial: a countdown-gated **free cloud access** window shows "Free cloud access · expires in %@" / "...expires today, %@ left" / "Free cloud access expired · Upgrade to Pro", counted down in `Xd Xh` / `Xh Xm` granularity.
- Context menu per machine: **Checkpoint**, **Copy IP Address**, **Fork**, **Delete…**, **Open Desktop**, **Open Shell**, **Rename…**, **Status**, **Pin/Unpin Machine**, **Increase CPU** / **Increase Memory** (resize submenu offering specific GiB/vCPU targets), **Upgrade to Reconnect…** (when the plan no longer covers reconnecting).
- Delete confirmation: "Delete machine '%@'?" / "This permanently deletes the machine and everything stored on it. This cannot be undone." Rename is **display-only** — "The machine keeps its name as its address."
- Live stats per machine: CPU %, Disk used/total GB, Mem used/total GB; sleeping machines show "Asleep · free while it sleeps"; a usage line shows token consumption: `%@ · %@ tokens · %@` (period).
- Notifications: "%@ is ready" / "It's open in its own workspace. Click to go there." (or "Find it in the Machines list." if not auto-opened); "%@ was created, but opening it failed" with a retry hint.
- Sign-out/session-rejection: "Sign-in needs a refresh — The Cloud service no longer accepts this Mac's saved session. Sign out and sign back in to reconnect." with a **Sign Out & Sign In Again** button. Team switch / managed-policy disconnects use distinct detail strings ("Cloud VM access moved to another team.", "...ended because your organization disabled cmux Cloud.", "...ended because cmux signed out.").
- Unreachable state: "Cloud is unreachable — showing last known" / "Your machines are still there. cmux couldn't reach the Cloud service just now; it retries on its own." with **Retry**.

### Cloud tree (right sidebar)

Groups: **Workspaces, Terminals, Browsers, Ports, Displays, Resources**. Rows for a machine show live **CPU %d%%**, **Disk %@/%@ GB**, **Mem %@/%@ GB**. Age-of-last-seen for offline devices in `%lldd/h/m ago` granularity.

- Workspace/terminal lifecycle: **New Workspace**, **New Terminal**, **New Terminal Here**, **Close Terminal**, **Close Workspace…** ("Its terminal is killed with it" for single, pluralized for multiple), **Kill Terminal…** ("The process ends on the machine, everywhere it is shown. Panes keep their scrollback."), **Delete Workspace and Terminals…** ("The workspace closes on the machine." for empty, "Its terminal is killed with it. To keep it, use 'Close Workspace' instead — it moves to the Terminals pool." otherwise), **Rename…** (workspace or terminal, plus "Rename all views…" for a terminal open in several tabs).
- Terminal states: `detached` badge ("Still running on the machine, but no tab shows it. Click to open it in a pane; right-click to kill it."), a **×N** badge for multiple open views, **+N** badge for hidden tabs, an unread-notification dot with help text "This terminal has a notification you have not read on this Mac".
- Placeholders: "Asleep — open to wake", "Connecting…", "Link failed", "No terminals open" / "No terminals yet" / "No workspaces yet", "Sessions unavailable on this machine".
- Attach failure reasons surfaced in the UI: "the connection is unavailable", "the machine returned an unusable response", "the machine could not attach the terminal", "the terminal is not ready to attach". Timeout: "Could not attach %@ in time (%@). The terminal may still be running on the machine; try opening it again." A terminal that already exited: "%@ already exited on the machine."
- Older `cmux-tui` protocol machines: "%@ uses an older cmux-tui protocol. Refresh it to enable live sync and rename operations."
- Ports group: **Forward Port** / **Stop Forwarding**, states `needsVPN` ("VPN not connected"), `connecting`/`stopping` (ellipsis), `direct` ("Private VPN"), `forwarded` ("Forwarding"), `closed`. Explanation copy: "Connect Cloud VPN, or choose Forward Port. Forwarding stays off until you start it. This table shows the address and lets you stop it." A provider that can't open port previews shows: "This provider cannot open machine ports as previews; reach the service from inside the machine with `cmux vm exec %@ -- …`." (i.e. **not** all Cloud providers support port previews). A machine with no private network address yet: "refresh the machine list and retry."
- Displays group: **New Display**, per-display "Desktop %d" numbering, detail `%@ · %@` (resolution etc.), noVNC-based detail label; creating a new display: "Creating a display on %@…"; failures: "The new display could not start. Refresh Displays, then retry. Existing displays are unchanged." / "Additional displays are unavailable on this machine. Use a desktop image with display creation support, then refresh Displays."; connection: "Connecting to Cloud display…", timeout at **45 seconds** ("The Cloud display did not connect within 45 seconds. Retry to reconnect."), cancellation.
- Resources group: "Loading" / "Stale" / "—" (missing) / "Asleep" / "Unavailable" / "Sampled %@"; shows RAM, provisioned CPU (`%@ vCPU · %@`) and provisioned capacity (`%@ GB total · %@`).

### Cloud VPN / private network access ("cmux Cloud Tunnel")

Two independent WireGuard-based roles exist on one physical Mac (`cloud-userspace-wireguard.md`):

| Role | Traffic | Implementation | User action needed |
|---|---|---|---|
| **terminal** | cmux-tui terminal + in-app HTTP browser/Desktop | user-space WireGuard hub (`cmux-wg`: BoringTun + smoltcp) | none — created automatically on first terminal use via `POST /api/vm/tunnel`, saved 0600, reused on later launches |
| **browser** | system-wide route for *other* Mac apps | Apple Network Extension, `cmux vpn up` | user must allow the extension in System Settings › General › Login Items & Extensions |

- Stable and Nightly builds get **separate WireGuard peers** (can run concurrently); all peers belong to one access grant shown on cmux.com as "the single Mac."
- **In-app** browser/Desktop pages work over the userspace hub with the system VPN **off** — they never offer VPN setup, only inline errors + Reload. Only *other* apps (system browser, plain `ssh`, `.internal` hostnames via `cmux vpn hosts`) need the system-wide route.
- Private-IP browsing: command-clicking `http://0.0.0.0:8000/` or `http://localhost:3000/` in a Cloud terminal opens that terminal's actual machine address (e.g. `http://10.16.0.7:8000/`); different VMs on the same port get distinct addresses/origins. Loopback-only dev servers work via the daemon dialing `127.0.0.1:<port>` inside the VM.
- CLI: `cmux vpn up` / `vpn down` / `vpn status` / `vpn hosts`. Status strings: `Tunnel: down (enrolled; run 'cmux vpn up')`, `Tunnel: not set up (run 'cmux vpn up')`, `Tunnel: up, but for a different enrollment (run 'cmux vpn up' to switch it)`, `Tunnel: up`. `cli.vpn.bringingUp` = "Bringing the tunnel up (sudo will prompt for your password)…" (`vpn up` requires **sudo**, unlike terminal-role traffic). Switching enrollment: "The tunnel that is up was brought up for another enrollment (a different account, or older keys). Replacing it with this one (sudo will prompt for your password)…"
- `wg-quick` missing: "wg-quick is not installed. Install with: brew install wireguard-tools".
- `cloudTree.tunnel.connectedPinned` — "cmux Cloud Tunnel is on: every app on this Mac can reach your Cloud VM network. `cmux vpn down` turns it off." and a variant that "stops on its own when idle." A help popover explains: "cmux itself does not need it: terminals, Ports, and Desktop use the built-in user-space tunnel."
- Errors (`cloudTunnel.error.*`): backend unavailable (build lacks the signed Network Extension), not signed in, reboot required to finish installing the extension, app not in `/Applications` (macOS only loads system extensions from there), tunnel start failed with detail, deadline exceeded, link dropped ("macOS reported the VPN as disconnected before it came up"), link status updates stopped, generic failure, VPN configuration rejected (with a macOS error code), activation canceled/not-allowed/failed, start cancelled, configuration not saved before start, "Cloud Machines is turned off. Turn it on in Settings › Beta Features, then retry.", "Create a Cloud machine first. The cmux Cloud Tunnel runs only for an account with at least one machine."
- **Activation gate**: nothing on the browser path runs until a single `CloudActivationPolicy`, built once from local state, admits it. A start is only admitted when Settings → Beta Features → Cloud Machines is on (`cloud.beta.machines.enabled` — **on by default in dev builds, off by default in release builds**, and never forced on by a managed `DisableCloud` profile) **and** the account has at least one machine (cached via `cloud.machines.cachedHasAny`, cleared on sign-out, reset to unknown on machine delete). cmux never triggers this at launch, on machine-list refresh, on terminal use, or when opening a Ports/Desktop row — only an explicit `vpn up` or Cloud browser open can.
- Private-network-required errors: `cloud.portAccess.privateNetworkRequired` = "This HTTPS service requires a private network connection. Run `cmux vpn up`, then reload." `cloudTree.link.tunnelDown` / `tunnelStale` / `tunnelStarting` / `tunnelAwaitingApproval` / `tunnelFailed` / `tunnelOffAppManaged` cover each phase.

### Cloud domains / publications (custom domains for VM ports)

CLI: `cmux cloud domains verify <domain>`, listing (`cli.cloud.domains.custom.empty` = "No custom Cloud VM domains. Start one with `cmux cloud domains verify <domain>`."). Access levels: `personal`, `team`, `public` (`--team <id>` required for team access; public access requires interactive confirmation: `Public access lets anyone open %@ (VM %@, port %@). Continue? [y/N]`). DNS instructions surfaced per domain: certificate, ownership, and routing records, with a note "Routing: the apex record serves %@ itself; the * record serves every subdomain." and an ALIAS/ANAME fallback hint ("Publish www.%@ and redirect the apex to it."). `cmux cloud domains verify %@` re-checks after DNS is updated.

### Cloud operation diagnostics

Every cloud action (create/open/refresh/rename/delete/pause/resume/snapshot/fork/restore/resize/exec/port/publication/base/workspace/terminal/file-transfer/environment/connect/notification/agent-start) is tracked through a shared **operation phase pipeline** surfaced in a "Cloud Diagnostics" panel (`cloud.diagnostics.title`, "Copy Diagnostics" action). Phases, in order roughly matching a create/connect flow: Starting Cloud operation → Checking your session → Waiting for Cloud service → (Waiting to retry) → Preparing machine → Saving machine state → Starting private connection → Finding machine connection → Starting connection process → Connecting to machine → Loading machine state → Opening workspace → Waiting for terminal → Restoring connection → Transferring files → Preparing environment → Opening port → Updating notifications → Cleaning up → Sending diagnostics.
- Failure categories with distinct copy: auth ("Cloud could not verify your session. Sign in again."), permission (denied), plan ("Your plan does not allow this Cloud operation."), rate limit, network, conflict ("Another operation changed this machine. Refresh its state."), not found ("The Cloud resource is no longer available. Refresh the machine list."), unsupported ("Check for an update."), cancelled, other (generic, offers "Copy diagnostic reference").
- Privacy note surfaced in the diagnostics UI: "Cloud sends connection timing and error codes while you are signed in. Terminal content and credentials are excluded."

### Clipboard image paste into Cloud terminals

Cmd+V in a managed Cloud terminal uploads the prepared image to that terminal's `cmux-tui` daemon and pastes its **remote filename** (never the Mac's local filename) — Codex/Claude receive the path via the daemon's bracketed-paste operation. Uses the same `TerminalImageTransferPreparationService` and clipboard-materialization worker as local paste; the daemon must advertise `terminal-image-paste-v1` (additive to mux protocol 12 — protocol 12 alone is insufficient, and an older daemon without the capability shows an update/reconnect error rather than silently falling back to a Mac path). Supported on Linux, Android and Apple daemons.

Limits and behavior (`docs/cloud-image-paste.md`):
- PNG/JPEG/GIF/WebP only, verified by content signature on both ends; **20 MiB per image**.
- One acknowledged **48 KiB chunk** at a time, **120-second transfer deadline**; existing progress indicator + Cancel button.
- **At most 8 images per connection**, **32 retained uploads**, **128 MiB reserved per daemon**; pending uploads reserve their full declared size up front.
- Daemon stores images in a random `cmux-image-…` directory, mode 0700, file mode 0600; no path is ever sent by the client or returned in acknowledgements.
- Uncommitted uploads expire after **2 minutes** or on disconnect/cancel; committed images survive reconnect for **10 minutes** then are removed on terminal exit or daemon shutdown. Full expiry ceiling is **12 minutes** from creation, reconciled by a sweep every **30 seconds** in 64-entry batches, surviving daemon crash via an ownership receipt (extended-attribute-backed, so cleanup can't claim an inode-reused replacement file).
- Cancellation before commit means no path is pasted; once commit starts, a lost acknowledgement means delivery is **uncertain** — cmux does not auto-retry or delete a possibly-delivered attachment, and tells the user to check the agent before retrying. Multiple images in one clipboard selection are separate transactions (an earlier one can already be attached if a later one fails).
- The command-buffer (the input line before submit) **refuses** Cloud image attachments — "Paste this image directly into the Cloud terminal. Image attachments in the command buffer are not supported yet." OSC 52 (terminal-initiated clipboard queries) cannot trigger an upload.
- Errors: `cloud.imagePaste.busy` (transfer already in progress), `tooManyImages` ("Select up to eight images at a time."), `unavailable` (reconnect terminal), `unsupported` (old cmux-tui build), `sizeLimit` (20 MiB), `unsupportedType`, `capacity` ("wait ten minutes for previous images to expire"), `storage` (disk space), `timedOut`, `deliveryUncertain`.

### Cloud SCP transfers (`cmux vm push` / `vm pull`)

`vm push` copies files with real OpenSSH/SFTP over the app's userspace WireGuard hub (not the JSON-RPC exec channel). `--watch`, `vm dev`, and `vm run --sync` reuse the same push path; `vm pull` still uses exec. `--secret` uses the separate `cmux file receive` path (see below).

- The CLI generates an ephemeral **Ed25519** key in an owner-only temp directory; only the public key goes to the signed-in `/api/vm/[id]/scp-endpoint` route, which checks account access and wake limits. The provider installs it for the guest `cmux` user with `restrict` and a **UTC expiry 15 minutes ahead**; a file lock guards concurrent updates and old expired keys are pruned on each transfer. The private key never leaves the CLI.
- OpenSSH pins the exact host key read from the provider's exec API, and disables user SSH config and connection sharing for this transfer — no public SSH gateway, no TOFU, no password, no Freestyle identity token involved.
- Data integrity: local snapshot hashed in **1 MiB blocks**, SHA-256 must match before a file is renamed into place or a directory extracted. Directory pushes **merge** with the destination (no atomic tree replace guarantee). **256 MiB transfer limit.** Interrupted transfers can leave a private staging directory if cleanup can't reconnect (reported as a failure). Key expiry blocks *new* auth but doesn't kill an in-progress session.
- `vm push --secret <machine> <file> <remote-path> [--mode]` for secret-bearing files (deploy keys, kubeconfigs, tokened `.npmrc`) — goes over the machine's link into `cmux file receive`, landing at mode 0600 via atomic rename, never touching the exec/command-argument channel.
- Failure telemetry (`vm.file_transfer_failure`) reports a bounded phase, failure category and optional exit code — never file paths, contents, keys, commands or stderr.

### Cloud project environments — `cmux vm dev` (status: **design**, partially shipped)

Doc explicitly flags itself as design-stage: "manifest replay and automatic machine selection remain proposed," built only on already-shipped primitives (route/push/exec/workspace/terminal, snapshots, VPC+tunnel, in-VM `cmux`).

- `cmux vm dev <machine> [--command "..."]` — turns the current directory into a running cloud environment named after the project: route (sticky per-directory machine binding), sync (push working tree to `work/<name>`), set up environment, create/reuse a named workspace, run manifest `checks`, print the workspace address and open it (unless `--detach`).
- **P1 (shipped in this design)**: route + sync + lockfile-based tooling detection (bun/pnpm/npm/uv/pip/cargo/go) + named workspace + `-- <cmd>` passthrough; detection prints what it ran and suggests committing a generated `.cmux/cloud.json`.
- **P2 (proposed)**: manifest replay from `.cmux/cloud.json` (`name`, `size`, `setup`, `checks`, `env` (secret *names* only — values set via `cmux vm env set <machine> KEY=VALUE`, stored machine-locally at `~/.config/cmux/env`, 0600), `ports`) with lockfile-hash gating, `--watch` incremental sync.
- **P3 (proposed)**: devcontainer.json compatibility, per-project size, fork-aware setup (skip setup when lockfile hash matches), edge-resident secrets (the long-term plan is secret values living at the TLS edge, never touching the guest — see `vm-identity-edge-auth.md`, itself explicitly **not implemented** beyond an initial "machine identity + reflection" primitive shipped 2026-09-06).

### Cloud `vm` CLI surface (beyond `dev`/`push`/`pull`/`base`)

From `cli.vm.*` strings — a large surface not covered by the public docs pages:
- `cmux vm tree [<machine>|local] [--refresh] [--json]` — a filesystem-like listing: `workspaces/`, `terminals/`, `browsers/`, `ports/`, `Displays/`, each machine annotated `%.0f GB disk`, `link <state>` (asleep/connecting/error with retry hint), detached-terminal markers, agent tags `[agent %@]`.
- `cmux vm rename <id> <new-label>`; clearing a label reports "%@ label cleared".
- `cmux vm resize` — CPU **1–32**, memory **4–64 GiB** (whole GiB), disk **4–256 GiB** in **4 GiB steps**; success line `OK %@ cpu=%@ memory=%@ GiB disk=%@ GiB`.
- `cmux vm env ls|set|rm` — env vars are machine-local (not yet control-plane per docs above); `set` accepts `KEY=VALUE` args, `--from-file <.env>`, or stdin (`-`); names must match `[A-Za-z_][A-Za-z0-9_]*`.
- `cmux vm layout apply|export` — applies a `CmuxLayoutNode` JSON document (terminal/browser/project surfaces, horizontal/vertical splits with a 0.1–0.9 share) to a machine's workspace; `--from-saved <name>` reuses a saved layout (see `cmux layout list`). A layout applied to a workspace not yet open locally reports where and how to open it.
- `cmux vm tui <machine>` — attaches via the bundled `cmux-tui` client; if missing, install with `curl -fsSL https://cmux.com/tui/install-static.sh | sh` or point `CMUX_TUI_CLIENT` at a binary. Protocol-version mismatch between client and daemon is reported explicitly, telling the user which side is stale.
- `cmux vm agent` — starts an agent on a machine, detached (survives the pane closing); "Reattach: `cmux vm open %1$@/%2$@/%3$@`"; `cmux vm agent --sync` variant referenced in the project-environments design.
- `cmux vm route` — the sticky per-directory machine binding used by `vm dev`; `--json` reports `would_provision`.
- `cmux vm sidebar` — pin/unpin/reorder machine tree nodes in the sidebar (`up|down|before|after`).
- Route-not-found errors for workspace/terminal open are specific: ambiguous name (multiple workspaces/terminals share it — pass an exact ID), not found, or state temporarily unavailable ("Reconnect and retry.").

### Displays — desktop / VNC access

Each machine can host multiple virtual displays ("Desktop 1", "Desktop 2", …), rendered via **noVNC** (`cloudTree.node.desktop.detail` = "noVNC"). Not every image supports creating additional displays ("Use a desktop image with display creation support"). Connect timeout is a hard **45 seconds**.

### Agent launch shortcuts

`machines.agent.claude` / `.codex` / `.opencode` — quick-launch entries for starting these three specific coding agents directly on a Cloud machine (**Open Cloud Agent** menu item); "Copy Cloud Prompt" copies a starter prompt; error if the build is missing the bundled cmux Cloud skill file.

## Machines / devices policy and MDM

Administrator-forced policy, delivered as a macOS configuration profile (`com.apple.ManagedClient.preferences`) targeting `com.cmuxterm.app` (release bundle ID; channel builds honor it too, with a channel-specific domain like `com.cmuxterm.app.nightly` able to override it). Forced values are **tier 0**: win over env vars, user Settings, `cmux.json` imports and built-in defaults; cannot be changed in-app (Settings shows "Managed by your organization", the command palette hides the matching commands, the CLI refuses with a managed-policy error). Re-checked roughly **every 60 seconds** while running, plus at launch, on preference-change notification, and on app-becomes-active; `DisableTelemetry`/`DisableAutoUpdate` are launch-time-only reads.

Policy keys relevant to this scope (full table in `docs/managed-device-policies.md`; Boolean, default `false` unless noted):

| Key | What it does |
|---|---|
| `DisableCloud` | Disables Cloud Machines entirely: UI (sidebar Cloud tab, Settings, palette, title-bar/new-workspace entries), session restore of Cloud workspaces, all Cloud VM service calls, the Cloud surface registry, Cloud socket/CLI ops — fails closed with socket code `cloud_disabled`. Also blocks the shared-backend verbs `remotes.*`, `aiAccounts.*` (incl. credential upload), `coderouter.*`, `workspace.cloud_vm_*`, `cmux vm-pty-connect`, the surface-tab-bar Cloud button, and the `cmux.cloudvm` `cmux.json` action. Does **not** enroll/start/reconnect the private-network tunnel (`vpn up` fails closed; `vpn status`/`down`/`revoke` remain available for cleanup). Mid-session activation tears down live Cloud workspaces, providers, private-network links, and removes the managed VPN configuration. |
| `DisableRemoteConnections` | See SSH section above — also blocks Cloud Machine attach since it shares the transport. |
| `DisableFileTransfer` | Blocks drag/paste uploads into remote terminals, SSH file-explorer previews, iOS↔Mac transfers, and `cmux vm push`/`pull`. Local-terminal drops still work; a user's own `scp`/`rsync` is out of scope. |
| `DisableIrohNetworking` | Disables the separate Iroh P2P transport entirely (no endpoint, no relay traffic, no route publication) — broader than `DisableRemoteControl` (which only disables the Mac's *host* role). |
| `DisableComputerUse` | Disables Computer Use: new agent launches get no computer-use tools, the bundled helper stops (even mid-session), Settings → Computer Use locks. |
| `DisableAICredentialUpload` | Blocks `cmux ai-accounts upload` / `cmux coderouter claude add|update` (socket code `ai_credential_upload_disabled`) — separate from `DisableCloud`, which blocks these families entirely regardless. |
| `SocketControlMode` | String enum `cmuxOnly` (default) or `off` — forces the local automation Unix socket's mode, overriding Settings/`cmux.json`/`CMUX_SOCKET_MODE`/`CMUX_SOCKET_PASSWORD`. A malformed or broader forced value (e.g. `allowAll`) still counts as managed but **fails closed to `off`**. A mode change revokes all existing clients (including idle and event-stream connections) before admitting new ones under the new value. |

Compliance/verification commands: `cmux socket-status --json` (works even while quit / socket off; reports `configured_mode`, `effective_mode`, `forced_value_status`, `managed_source`, `live_enforcement: not_observed` — deliberately not inferred from a side-channel read), `cmux browser status --json` (reports allowlist state), `defaults read com.cmuxterm.app <Key>`.

`BrowserURLAllowlist` / `BrowserAllowLocalhost` (default `true`) / `BrowserAllowLocalFiles` (default `true`) restrict the embedded browser but are a Browser-scope feature, not Cloud/Remote — noted here only because `DisableEmbeddedBrowser` takes precedence over it.

## Device presence (My Devices / team roster)

Realtime online/offline for every device on a team (Macs, iPhones, tagged app instances), backed by a Cloudflare Durable Object per team (`workers/presence`).
- **Heartbeat cadence**: hosts beat every **15s**; a device is declared offline **45s** after its last heartbeat (3× the interval — a single lost packet never flaps a healthy host; a genuinely dead host is confirmed offline within 45–60s). The interval is returned in every heartbeat response, so cadence is server-controlled without a new host build.
- Offline is either a **clean goodbye** (`stopping: true` on quit) or a **timeout** (DO alarm after missed heartbeats) — surfaced to clients as `reason: "timeout" | "goodbye"`.
- Subscription is WebSocket (primary, DO hibernation — idle teams cost nothing) or SSE (fallback); delivers a `snapshot` then `online`/`offline`/`seen` events. Streams are capped at **15 minutes** by token expiry — a revoked token or removed team member can't keep an old stream alive.
- Ownership: within a team, the *first* authenticated user to announce a `deviceId` owns it; another member's heartbeat for that device id is rejected `403 device_owner_mismatch` — presence can't be spoofed or force-cleared by a co-member. Owner pins are durable and never pruned by the 24h presence tail.
- Mac sender: Debug builds default **on** against a dev instance; Release builds default **off** until the production worker ships in Settings. Both independently overridable.
- iOS: subscribes on sign-in, overlays live online/offline onto the device tree, writes pushed routes to the paired-Mac store, and reconnects when the active Mac comes back online while the phone was disconnected.

## Vault (agent session search, resume, checkpoint, fork)

A right-sidebar pane (and full CLI surface) for finding and resuming **old** AI coding agent sessions by transcript content rather than terminal scrollback/shell history. `sessionIndex.empty.title` = "Vault is empty"; loading = "Loading Vault…"; search placeholder "Search Vault".

- **Indexes**: Codex, Claude Code, OpenCode and Pi sessions out of the box, reading each agent's local session-record format. Plus **custom agent registrations** via `cmux.json`'s `vault.agents` array (`docs/vault.md`) — Pi, OMP and Campfire ship as the default custom registrations, each defining `detect` (by `processName`/`argvContains`), `sessionIdSource` (`piSessionFile` type or `argvOption`), `resumeCommand`/`forkCommand` templates (placeholders `{{sessionId}}`, `{{sessionPath}}`, `{{executable}}`, `{{cwd}}`, `{{sessionDir}}`), `cwd: "preserve"`, and `sessionDirectory`. Pi's `resumeCommand` deliberately uses `pi --session <id>` rather than `pi --continue` so Vault reopens the *exact* saved session (not just "most recent"). `forkCommand` is optional — when omitted, the right-click **Fork Conversation** item is hidden for that agent, though resume still works. Campfire is special: only the **driver's** host session is restorable (joiners are ephemeral views), and resuming restores the conversation into a **fresh collaborative session with a new invite link**, not the original one.
- **Workflow** (product doc): open Vault from the right sidebar → search by file, branch, issue title, error message, or phrase → drag a matching session into the current workspace → resume from recovered context beside the code/browser pane in use.
- **Limits**: Vault only indexes formats it knows how to read *locally* — it does not search private remote hosts unless those sessions are already available to the local install.
- **CLI** (`cli.vault.*`, full grammar in `cmux vault --help`):
  - `cmux vault sessions|ls [--agent <id>] [--folder <path>] [--limit <n>]` — newest first, tab-separated `agent id status modified title cwd`.
  - `cmux vault search <query> [--limit <n>]` — supports `agent:`, `repo:`, `ws:`, `before:`/`after:` operators and quoted phrases, ranked by recency.
  - `cmux vault checkpoints --agent <id> --session <id>` — a session's checkpoint timeline (derived turns + manual checkpoints); if `supports_fork` is false: "note: this agent's checkpoints are view-only (fork not supported yet)".
  - `cmux vault checkpoint --agent <id> --session <id> [--name <text>]` — creates a **manual named checkpoint** at the session's current tip.
  - `cmux vault fork --agent <id> --session <id> (--checkpoint <id> | --turn <n>) [--open]` — forks a new session from a checkpoint or turn number; prints the new session id and its resume command, `--open` also opens it in a new workspace.
  - All subcommands support `--json`. Every unrecognized flag/positional fails closed with a specific "Unexpected argument" error rather than being silently ignored.
- **Command palette**: "Open Vault as Pane"; keyboard: "Show Sidebar Vault" shortcut switches the right sidebar to Vault mode; `cmux right-sidebar set vault [--no-focus]` via socket/CLI.
- Icon: registered custom agents without an explicit `iconAssetName` get a **neutral system icon**, not another agent's brand mark.

## Computer Use (Mac automation for agents)

Lets Claude Code and Codex sessions **launched inside cmux** control native Mac apps — read UI via screenshots + accessibility trees, click, type, scroll, drag, use keyboard shortcuts.

- **Setup**: Settings → Computer Use → enable, then grant **Accessibility** and **Screen Recording** to the separate "cmux Computer Use" helper app in System Settings (drag its tile into each permission list if it's missing). On **macOS Tahoe**, an additional screen-capture confirmation alert must be approved. Permissions belong to the helper, not the main app — the helper can be quit/restarted without closing cmux or any terminal session. A 3-step onboarding wizard (`computerUse.onboarding.step` = "Step %lld of 3") walks Accessibility → Screen Recording → Done, with per-step "Check Again"/"Not Now" and a final "cmux Computer Use Is Ready" screen.
- **Automatic tool attach**: no manual MCP config — starting a fresh Claude Code or Codex session inside cmux automatically wires the tools in. Existing/already-running sessions keep their original tool configuration (don't get tools retroactively). Opt out per-launch with `CMUX_COMPUTER_USE_MCP_DISABLED=1`.
- **Tool sets differ by agent** (`cmux-cua` bundled MCP server):
  - **Codex**: `get_app_state` (app name or bundle ID → screenshot + accessibility tree), acts on a current `element_index` or screenshot coordinates, then calls `get_app_state` again to verify.
  - **Claude Code**: `list_apps` / `list_windows` to find a target, `get_window_state` with pid+window_id; prefers element tokens or fresh indexes; also supports `perform_actions` for a batch of actions that doesn't invalidate later targets (native profile only).
  - Element indexes belong to the *current* snapshot — must be refreshed after navigation/layout changes; a successful click acknowledgement alone doesn't prove task completion (agents are told to verify by re-inspecting).
- **Follow/stop controls**: a menu-bar item shows the active driving agent; **Focus Computer Use** follows the app being driven, **Focus Calling Terminal** returns to the originating terminal (returning does **not** stop automation); the menu's **Stop Using %@** action is the actual stop control. "No live agent sessions" / "No computer-use activity yet" when idle.
- **Skill**: an optional `cmux-cua` skill documents the inspect-then-act workflow; it grants no macOS permissions itself and is not installed globally by default — agents install it through their own skill installer.
- Distinct from browser-pane automation: native app control uses accessibility element indexes; browser panes use separate "cmux browser" DOM/selector commands — "A browser surface reference is different from a native app element index."
- **Troubleshooting** copy covers three failure modes verbatim: "The agent has no Computer Use tools" (enable in Settings + start a fresh session), "Setup is incomplete, clicks fail, or screenshots are blank" (finish both permission steps, retry after setup, helper restart doesn't require closing terminals), "The wrong window is targeted or a click is blocked" (re-inspect from current state; reveal the covering window first; never reuse stale coordinates/indexes).
- `DisableComputerUse` MDM policy stops the helper and locks the Settings toggle even mid-session (see Machines/devices section).

## Simulator pane (iOS/iPadOS — no Android, no watchOS/tvOS)

A **native pane** hosting one booted iPhone or iPad Simulator (via Xcode's private CoreSimulator/SimulatorKit APIs — explicitly scoped to iPhone/iPad; the doc calls out that Apple Watch and "attach-all fleet controls" are **outside the pane's scope**). This is purely local macOS/Xcode tooling — no relation to Android emulators.

- Create via File → New Simulator Pane, command palette, or `cmux new-surface --type simulator --pane pane:1 --focus true`. Device selection is remembered by identifier; if that identifier disappears, restoration requires an **explicit re-selection** — saved runtime/device-type fields are descriptive only, not enough to auto-recreate a device.
- **Input**: click/drag for taps/swipes/drags; **Option**+drag = two-finger pinch; **Option+Shift**+drag = parallel two-finger pan; mouse wheel/trackpad = paced touch scroll; physical keyboard forwards mapped keys/modifier chords; rendered device buttons or Tools panel for Home/App Switcher/Lock/Siri/side-button. CLI uses **normalized 0–1 coordinates**: `cmux simulator tap 0.5 0.5 --surface surface:1`, `swipe x1 y1 x2 y2 <duration>`, `button home`, `rotate landscape_left`, `type 'text'`.
- **Tools panel** sections (`simulator.tools.*`): Apps/media (list, install, launch, terminate, open URL, add photos/videos, read/write pasteboard), Device state (rotate, memory warning, software keyboard, status-bar override, appearance/accessibility), Core Animation diagnostics (color-blended layers, copied images, misaligned images, offscreen rendering, slow animations), Location (set coordinate or replay 5 built-in routes — **Apple Park Loop**, **Reservoir Loop** (Central Park, 2.5 km), **Golden Gate Crossing**, **Mt. Tam Ridge**, **Pacific Coast Hwy** — at walk/run/cycle/drive speed with pause/loop/restore), Permissions (grant/revoke/reset public + supported private permissions incl. push), Capture (screenshot, video recording, recent-logs dump, bounded live log streaming — output truncates at **2 MiB**), Camera (inject animated placeholder / static image / looping video / host Mac camera into an app; explicitly labeled **"Camera (Experimental)"** — "uses private Simulator interfaces and may stop working after an Xcode update"), Inspection (foreground-app readout, native accessibility tree browse + highlight, raw Web Inspector JSON commands to Safari/WKWebView targets), Activity (bounded recent-event history per device).
- **Status bar overrides**: time, battery level/state (charging/charged/discharging), cellular (searching/active/failed/not supported) with bars and mode (LTE/LTE+/LTE-A/3G/4G/5G/5G+/5G UC/5G UWB/Wi-Fi/hidden), Wi-Fi bars.
- **Text size**: XS through XXXL plus 5 Accessibility sizes (Medium through XXXL).
- **Appearance**: Light/Dark/Tinted, Liquid Glass, Increase Contrast, Reduce Transparency, Reduce Motion, Invert Colors, Differentiate Without Color, VoiceOver, Button Shapes, and a Color Filter (Grayscale, Red-Green, Green-Red, Blue-Yellow).
- **Clipboard**: 1 MiB size cap each direction ("Clipboard text must be 1 MiB or smaller." / "The Simulator clipboard is larger than 1 MiB.").
- **Crash containment**: all private-API work (CoreSimulator, SimulatorKit, Indigo/HID input, accessibility, camera, Web Inspector) runs in a **supervised child worker process**, writing frames into a permission-restricted shared-memory ring; the app copies stable slots off-main into immutable images and never gives the Core Animation worker direct ownership of app-side storage. **First worker crash** silently restarts the device session; a **second consecutive crash trips a fuse** — cmux stays responsive showing the last safe frame, and the user must press **Recover** in the pane (or call `cmux rpc simulator.recover '{"surface_id":"surface:1"}'`) to start a fresh session. Closing the pane joins pending cleanup, releases held input, stops capture helpers, and removes shared-memory names.
- Many `simulator.failure.*` and `simulator.control.*` strings describe specific capability-negotiation failures (e.g. "The active Xcode worker did not negotiate accessibility inspection.", "Reset All needs the active Xcode worker's isolated extended-permissions adapter.") — these vary by installed Xcode version, since some capabilities are only exposed by newer `simctl`/Xcode builds.
- `simulator.featureDisabled.title` = "Simulator is temporarily unavailable" / `.message` = "This feature has been disabled remotely" — i.e. the whole pane can be killed via a remote feature flag, independent of MDM policy.

## Sudo approval broker

`cmux sudo run [-r reason] [-t timeout] (-c 'command' | script.sh | -)` — runs a script as root through a **Touch ID-gated approval flow in the cmux GUI**, rather than a terminal password prompt.

- Timeout: **1–86400 seconds** ("sudo: timeout must not exceed 86400 seconds"); reason is optional (`(no reason given)` if omitted); script input via `-c`, a file, or stdin (`-`), must be **valid UTF-8**, **≤ 256 KiB**.
- Flow: CLI computes the **requester's process identity** (PID + start-time from `proc_pidinfo`, guarding against PID reuse) and its **parent process's command name**, ships the script to the GUI as an approval request, then waits: `sudo: request %@ queued; waiting up to %d seconds for approval in cmux…`.
- The **approval dialog** (own window, title "Administrator request %@") shows: heading "Administrator access requested", warning "Review the entire script before approving. It will run with administrator privileges.", the Request ID, Reason, Requester (`%@ (PID %d)`), Working directory, and the full script text — with **Approve with Touch ID** / **Deny** buttons. Status line cycles: "Waiting for approval" → "Applying decision…" → "Approved — starting the secure runner…" → "Running with administrator privileges…".
- Denial/failure/timeout are distinct CLI outcomes: `sudo: request denied`, `sudo: request failed`, `sudo: timed out waiting for approval (request %@ was not approved)`, or (if approved but execution didn't finish in time) "was approved, but execution did not complete before the timeout".
- Errors cover the full lifecycle: Touch ID not configured for sudo (`sudo.error.pam_tid_unavailable` → run `cmux sudo setup-touch-id`), approval expired, requester process exited before approval, execution interrupted, execution timed out (process tree terminated), Touch ID cancelled/unavailable, script staging failed, the independent secure runner failed to launch, cleanup couldn't finish (some processes survived).
- `sudo pending` lists outstanding requests (`(none)` when empty); `sudo setup-touch-id` configures Touch ID for the feature.
- Architecture implication from the code: the requester's **process start time**, not just PID, is checked twice around the parent-command lookup — an explicit defense against PID-reuse spoofing the "who is asking" attribution shown in the approval dialog.

## Task Manager, `cmux top`, `cmux memory`, and the (orphaned) memory guardrail

### Task Manager

Shows resource usage for cmux windows, workspaces, panes, terminal processes, coding agent processes, and browser webviews — a cmux-scoped alternative to Activity Monitor that can attribute load back to *which workspace/agent/pane* caused it.

- **Open**: run `cmux top` (or `cmux memory`) from any terminal, or **Cmd+Shift+P → Task Manager** from the command palette.
- **Shows**: windows/workspaces/panes/surfaces; workspace ownership for terminal/browser activity; known agent processes (`taskManager.agent.*` lists **Amp, Claude Code, CodeBuddy, Codex, Copilot, Cursor, Factory, Gemini, Grok, Hermes Agent, OpenCode, Pi, Qoder, Rovo Dev** — i.e. broader agent recognition than just Claude/Codex/OpenCode); browser webviews and their helper processes.
- **Columns**: CPU, Memory, Name, Proc(ess count). Sections: Hierarchy, Program Totals, Child Process RSS, Coding Agents.
- **Row states**: Focused, Hidden, Key window, Pinned, Selected, `Shared x%lld` (a process shared across rows), surface types Browser/Terminal/WebView/Unknown.
- **Context menu**: **Kill Process...**, **View Terminal**, **View Workspace**. Kill confirmation: "Kill process?" (or plural) / "Ask %@ (PID %lld) to terminate gracefully. cmux will force-kill it if it is still running after a short grace period." — i.e. **SIGTERM then SIGKILL after a grace period**, matching the pane-memory-guardrail's own kill semantics below.
- **Troubleshooting workflow** (product doc): open when cmux feels slow/fans spin/an agent seems stuck → sort/scan for the top CPU or memory row → jump to the owning workspace/surface → stop/restart/split the overloaded process with context visible. Positioned as the tool to use when Activity Monitor shows cmux load but doesn't say *which* workspace/agent/pane.
- Empty state: "No resource usage — Open a workspace, terminal, or browser surface to see it here."; refresh via a **Refresh** button; a refresh failure shows "Unable to refresh Task Manager data."

### `cmux top` / `cmux memory` CLI

- `cmux top` — process diagnostics; errors if the running build doesn't support process diagnostics, or an invalid `--workspace` handle is given.
- `cmux memory [--all] [--workspace <id|ref|index>] [--groups <count>] [--json]` — `--groups` **1–100**; prints app footprint, app RSS, child process groups (with per-group RSS, process count, command, and attribution to a pane/surface/workspace or "unattributed"), and a "TOP CHILD GROUPS" table. Both commands strip ANSI/OSC escape sequences from process labels before printing (tabs/newlines/CR become a single space) — defensive against processes that put control codes in their own title.

### Pane memory guardrail — Settings toggle promises UI that source says was removed

Settings → Terminal → **"Runaway Memory Guardrail"** toggle (**off by default**) with a **"Memory Warning Threshold (GB)"** field, range **1–256 GB**, default **8 GB**. Poll interval **4 seconds**; a separate "scoped scan" runs every **15 seconds**. Hysteresis: a warned pane clears only once it drops below **0.8× the threshold** (`clearFraction = 0.8`), so a pane hovering right at the line doesn't flap the badge every tick.

The Settings copy for this toggle (`settings.terminal.memoryGuardrail.subtitleOn`) says: *"cmux warns you with a badge and a banner when one pane's process tree uses too much memory, so a single leak can't crash the whole app."* — and full banner/kill-confirmation localized strings exist (`paneMemoryGuardrail.banner.title` = "A pane is using a lot of memory", detail `%@ — %@ (running %@)`, **Dismiss** / **Kill Pane Process** actions, kill-confirmation "Kill this pane's runaway process? This sends SIGTERM then SIGKILL to high-memory process groups in the pane. Other process groups are left alone." / **Kill Process** / **Cancel**). However, **the source's own doc comment says otherwise**: `Sources/PaneMemoryGuardrail.swift` states *"The user-facing warning badge and dismissible banner were removed in issue #6614, so the scan now only maintains the engine's monitoring state (surfaced in DEBUG logs)."* — and indeed, **none of the `paneMemoryGuardrail.banner.*` or `paneMemoryGuardrail.confirm.*` localization keys are referenced anywhere in the Swift source** (`grep` across `Sources/` and `Packages/` for their usage returns nothing). The toggle and threshold slider are live in Settings and the polling engine genuinely runs and tracks warned/dismissed pane state, but as of this checkout there is no visible badge or banner surfacing it to the user — the Settings subtitle describing what turning it on does is stale relative to the actual UI. This is exactly the kind of silently-broken promise the grain of this catalog is meant to catch.

## Unverified / unclear

- **`cmux vm dev` P2/P3** (manifest replay, `.cmux/cloud.json` checks/ports/layout auto-apply, devcontainer.json compatibility, fork-aware setup skipping) is explicitly marked "design" / "proposed" in `docs/cloud-project-environments.md` — unclear how much beyond P1 (route+sync+lockfile-detect+named-workspace) is actually reachable from the shipped UI/CLI in this build versus only through hand-written `.cmux/cloud.json` files that nothing yet writes automatically.
- **`docs/vm-identity-edge-auth.md`** states the identity table and peer-grant broker are "NOT implemented," with only "machine identity + reflection" shipped as of 2026-09-06 on `freestyle-vm-agent-primitives`. Could not confirm from this pass exactly what user-visible behavior that partial shipment produces (if any) versus being purely internal plumbing for future edge-resident secrets.
- **Dev-fleet warm build slots** (`docs/dev-fleet-warm-slots.md`) and **fleet enrollment** (`docs/fleet-enrollment.md`) / **workload profiles** (`docs/workload-profiles.md`) are cmux's own CI/build infrastructure for building *cmux itself* on a Mac-mini fleet — not a feature of the shipped app. Excluded from the feature catalog above as out-of-scope, but flagged here in case another pass intended them as in-scope "machine" features; they are not.
- The **`paneMemoryGuardrail` banner** discrepancy above (Settings promises a badge+banner; source claims removal, no UI code references the strings) is flagged in its own section rather than here because it is itself a confirmed, load-bearing finding — but I could not find *any* live call site for the banner strings to rule out a code path I simply didn't locate (e.g. a SwiftUI view file not matched by my greps for the literal key names). Worth a second grep pass by anyone acting on this before assuming the toggle is fully inert.
- Exact behavior of **`cloudVM.error.requiresPro` vs `memoryRequiresPlan`** plan gating thresholds (which specific machine sizes require Pro vs Max) was not traced to a source-of-truth pricing table in this pass — only the string templates were confirmed.
- Whether the **Computer Use** "native profile" (`perform_actions`) is Claude-only or also available to Codex was not fully disambiguated beyond the doc's own phrasing ("The native profile also supports perform_actions").

## Coverage note

This pass read: `AGENTS.md`, the SSH/remote-tmux/vault/computer-use/task-manager/base docs pages (`web/app/.../docs/{ssh,remote-tmux,vault,computer-use,task-manager,base}/page.tsx`) together with their English copy in `web/messages/en.json`; `docs/remote-daemon-spec.md` (full), `docs/vault.md` (full), `docs/cloud-image-paste.md` (full), `docs/cloud-scp-transfers.md` (full), `docs/cloud-project-environments.md` (full), `docs/cloud-userspace-wireguard.md` (partial — read through the activation-gate section), `docs/presence-service.md` (full), `docs/managed-device-policies.md` (full), `docs/simulator-pane.md` (full); skimmed `docs/dev-fleet-warm-slots.md`, `docs/fleet-enrollment.md`, `docs/workload-profiles.md`, `docs/vm-identity-edge-auth.md` (determined out-of-scope/design-stage, not deep-read); the full localized-string dump filtered by every prefix in the brief (`remote`, `remoteDaemon`, `cloud`, `cloudTree`, `cloudPane`, `cloudTunnel`, `cloudVM`, `machines`, `computerUse`, `simulator`, `sudo`, `vault`, `taskManager`, `paneMemoryGuardrail`, `vpn`, plus `cli.vm.*`, `cli.cloud.*`, `cli.ssh.*`, `cli.vault.*`, `cli.memory.*`, `cli.top.*`); and source for `CLI/CMUXCLI+Vault.swift` (full), `CLI/CMUXCLI+Sudo.swift` (full), `CLI/CMUXCLI+TopRendering.swift` (full), `Sources/PaneMemoryGuardrail.swift` and `Sources/PaneMemoryGuardrailEngine.swift` (threshold/hysteresis logic), and the Settings-catalog + Settings-UI source for the memory guardrail default values.

**Not read in this pass** (named in the brief but not opened): the full `Sources/Devices` and `Sources/Cloud` directory trees beyond targeted greps (320 and 39 files respectively — this catalog relies on the localized strings and docs as the source of truth for their behavior rather than reading each Swift file); `docs/cloud-vm-backend-rollout-todo.md`, `docs/connectivity-v2-implementation-notes.md`, `docs/relay-tls-enterprise.md`, `docs/relay-cleanup-cancellation.md`, `docs/transport-sentry-diagnostics.md`, `docs/iroh-*` (Iroh transport internals — only its user-visible policy surface via `DisableIrohNetworking` is covered here per the brief's "only as user-visible" instruction); `docs/ios-*` (iOS-side implementation, out of this macOS-app-scoped pass except where a doc explicitly described Mac↔iOS behavior); the `CMUXCLI+VPN.swift` / `CMUXCLI+VPNAppManaged.swift` / `CMUXCLI+MemoryAttribution.swift` / `CMUXCLI+Memory.swift` source bodies (relied on their exhaustive string tables instead); the `simulator-pane` Swift implementation itself (relied on the doc + 408-line string table, which between them describe every action and failure mode); `docs/computer-use.md` (the internal doc, separate from the public docs page — the public page appeared to be the authoritative, current user-facing description and the internal doc was not cross-checked for drift).
