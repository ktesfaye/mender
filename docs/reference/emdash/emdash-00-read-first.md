# Read this first

Emdash is an Electron desktop app for running many AI coding agents side by side. Every task gets its own git worktree, so agents never share a working tree, and each task can run on this machine or on a remote one over SSH. This catalogue was written from the source of upstream `main` at v1.2.6 (commit `95838289f`, pulled 24 September 2026), not from memory and not from the Mender fork.

## How it was made

Nine readers each took one part of the app and wrote down every feature, state and message they found in it, quoting the text on screen word for word. Three more then pulled every string out of the source, checked each one against what had been written, and wrote up whatever was missing, including the behaviour that lives below the interface (limits, timeouts, retries, what happens on restart). The last section lists every remaining string that could reach the screen and is not quoted anywhere else, so nothing is silently left out.

Each entry ends with the file it came from. Where a reader could not confirm something, it sits under "Unverified" in that section rather than being stated as fact.

## The sections

- **Chat and conversations**: the chat view, the composer, slash commands and @ mentions, permission prompts, the transcript and every kind of card in it, and the older terminal-based conversations.
- **Agents and providers**: every supported agent CLI, how each is detected, installed, signed in and configured, and how Emdash works out whether an agent is working, waiting or done.
- **Tasks, workspaces and the workbench**: creating a task, worktrees and setup scripts, the task list, tabs and panes.
- **Projects, machines and remote development**: adding projects, project settings and `.emdash.json`, SSH machines and the remote workspace server.
- **Source control, pull requests and issues**: changes, diffs, commits, branches, pull requests, checks, and the issue trackers.
- **Terminals, editor, files, search and browser**: everything you read or type into that isn't the chat.
- **Settings, MCP, skills, automations and updates**: every setting with its default, and the configuration features.
- **App shell, commands, shortcuts, notifications and themes**: menus, every command and shortcut, every toast and system notification.
- **Emdash as documented publicly**: what the website and release notes claim, checked against the source, and a release timeline.
- **Gaps, parts one and two**, and **Behaviour under the hood**: what the string check and the runtime pass added.
- **Every other string, and the MCP catalogue**: the leftovers, verbatim.

## On the red "context limit reached"

Emdash's own chat never says that. Its context meter is a small ring in the composer that stays neutral until the conversation has used nine tenths of the window, then turns amber, and the popover behind it shows the percentage, the token counts and, where the agent reports it, the cost so far. When a turn stops at a limit, a red banner sits just above the input: "Response truncated" with "The response was cut off after reaching the maximum token limit." when the agent ran out of output room, and "Turn limit reached" with "The agent hit the maximum number of turn requests. Send a new message to continue." when it ran out of turns. A refusal gets the same red banner as "Request refused". A normal finish or a cancel says nothing. The exact words "context limit reached" in red come from the agent's own CLI, printed inside its terminal, which Emdash shows as it is.


## On usage and session limits

The screenshot this came from is Claude Code's own terminal: a red "You've hit your session limit · resets 5pm (America/Los_Angeles)", a grey "Continuing automatically at 5pm · esc to cancel", and a status line "Usage limit reached · continuing automatically at 5pm · esc or type to cancel". All of that is drawn by the Claude CLI itself. In an Emdash terminal conversation you see exactly that, because Emdash shows the CLI as it is.

In an Emdash chat conversation there is no handling for it at all. Claude's chat adapter can report a usage limit, a rate limit, an overload or an exhausted quota as a typed failure with a title and the actions that make sense ("retry", "new session", "sign in"), but only to a client that says it understands those reports, and Emdash doesn't. So the limit reaches the chat as an ordinary reply from the agent, set as plain prose: no red, no reset time pulled out, no countdown and no carrying on by itself. The only rate limits Emdash reads for itself are GitHub's, for its pull request polling. (From the source of both; not seen live.)
