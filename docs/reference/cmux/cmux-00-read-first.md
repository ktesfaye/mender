# Read this first

cmux is a native macOS terminal, written in Swift and AppKit on top of libghostty, built for running AI coding agents. Its workspaces sit in a vertical sidebar that shows each one's branch, pull request, folder, open ports and latest message. A pane that wants you gets a blue ring. A browser can be split in beside the terminals and driven from scripts. Around that sit a large CLI and socket API, SSH and cloud machines, a companion iPhone app, and a lot of agent-specific plumbing. It is open source under the GPL, with paid cloud plans. This catalogue was written from the source of `main` at v0.64.25 (commit `f6b3f4a8`, pulled 24 September 2026).

## How it was made

Nine readers each took one part of the app and wrote down every feature, state and message they found, quoting the text on screen word for word. cmux keeps nearly every string it shows in one table, so six more took that table apart, key by key, checked each string against what had been written, and wrote up whatever was missing. The last section lists every string still not quoted anywhere, with the file that uses it, and marks the ones the app ships but never shows.

Each entry ends with the file it came from. Where a reader could not confirm something, it sits under "Unverified" in that section rather than being stated as fact.

## The sections

- **Terminal, windows, workspaces, tabs and splits**: the terminal itself, copy and paste, find, the text box input, splits, the canvas layout, closing and reopening, and what comes back after a restart.
- **Sidebar, attention and notifications**: what each sidebar row shows, the right sidebar, custom sidebars, the notification rings and panel, sounds, badges and workspace groups.
- **The in-app browser**: browser panes, profiles, downloads, design mode, the automation commands and importing from other browsers.
- **AI agents in cmux**: every supported agent and how its hooks work, the agent chat panel, the Feed, restoring and forking sessions, hibernation and the Vault.
- **CLI, socket API and automation**: every `cmux` command and flag, the socket API and its events, `cmux.json` custom commands, automations, the command palette, AppleScript and tmux.
- **Settings, shortcuts, menus, account and updates**: every setting with its default, every shortcut, the menus, managed policies, feature flags, plans and updates.
- **SSH, cloud, machines and system tools**: SSH and Mosh workspaces, cloud machines and VPN, Computer Use, the simulator pane, the sudo broker and the task manager.
- **Mobile, dock, diff viewer and everything else**: the iPhone app, the Dock, the diff viewer, file explorer, markdown viewer, the debug menu and the website.
- **cmux as documented publicly**: the docs and changelog, checked against the source, and a release timeline.
- **Gaps found** (six parts): what the string-by-string check added.
- **Every other string**: the leftovers, verbatim.

## On the red "context limit reached"

cmux has nothing like it. There is no context meter, no percentage and no limit warning anywhere in the app. Its agent chat panel has copy prepared for a context toggle and for rate limits, but the renderer never reads it and the rate-limit rows it is sent are always empty. When an agent runs out of room in a cmux terminal, what you see is whatever that agent's own CLI prints.


## On usage and session limits

The screenshot this came from is Claude Code's own terminal: a red "You've hit your session limit · resets 5pm (America/Los_Angeles)", a grey "Continuing automatically at 5pm · esc to cancel", and a status line "Usage limit reached · continuing automatically at 5pm · esc or type to cancel". All of that is drawn by the Claude CLI itself. In a cmux terminal you see exactly that, since cmux is a terminal.

cmux reads limits for itself in one place only: when Codex's hooks report a failure whose text mentions a usage limit, a rate limit or credits, cmux labels it "Codex rate limit" (subtitle "Rate limit") in its status and notification. A Claude limit is not picked out that way. The agent chat panel has a prepared "Rate limits" block (primary, secondary, weekly, monthly, "Usage remaining", "resets"), but it is always sent empty, so it never shows.
