# What to add

Everything Emdash and cmux do that Mender doesn't yet, sorted into what Mender needs before it is fully usable, what would make it better or just be good to have, and what to leave out on purpose. Each area was checked against Mender's own source, not only its catalogue, so nothing here is something Mender already does. Where Emdash's back end already does the work, Mender only needs the village side of it, and that is said. The full reasoning for every entry, with the proposed village form in detail, is in the five "what to add" sections further down this list.

Effort is rough: S is an afternoon, M a day or two, L most of a week.

## Fix first

These are Mender's own, found by driving it. They come before anything new.

- **Walking into the folder a second time sticks on "reading it…".** Likely the old folder view never finishes letting go. S.
- **Taking a line to edit shows no cursor**, so it looks as if nothing happened. The line should be in full ink with the cursor after it, and the bottom line should stop blinking while it is. S.
- **A session's commits go missing on its board** when the remote has no home-branch pointer. Fall back to asking git for the branch the project is on when the session is cut. S.
- **Skills on the /agent card are always Claude's.** Read them from where the session's own agent looks. S.
- **States that are worked out and never drawn**: a failed step looks like a running one, helpers all share a colour, and a lantern never shows its worktree still being cut. S.
- **Smaller ones**: pressing a checkout's title does nothing though it's wired to, forgetting a project disarms itself when nothing else does, empty land looks pressable, and blank lines in a file aren't drawn. S.

## Need

Without these, Mender isn't a tool you can do all your work in. Roughly in the order to build them, since some lean on others.

### Talking to agents
- **Limits and failures said properly.** Ask Claude's adapter for its typed failure reports, so a usage limit, a rate limit, an overload or an empty quota arrives as what it is, with its reset time, instead of as an ordinary reply. Said on the board in the village's voice, the fire banked, the lantern marked, and "carry on at 5pm" offered as a line you press. Also tell a cut-off answer and a turn limit apart from a plain "it broke off". Back end ready. M.
- **Signing an agent in.** Show on the card whether each agent is signed in, and when it isn't, say so and offer the way in (its own login in a real terminal, or a key) instead of failing silently. Back end ready. M.
- **Answering a question with several answers.** The gate can only send one option. When an agent asks you to pick several, let number keys toggle and return send. S.

### Knowing when you're wanted
- **A macOS notification when somebody wants you or finishes**, while Mender isn't in front, in the village's voice, and pressing it lands you in that session's yard. Back end ready. M.
- **Saying what quitting costs** when villagers are still working, in two presses like everything else that can't be taken back. S.

### A real terminal
- **A shell that full-screen programs actually work in.** Today the board shell is legible but vim, htop or an agent's own CLI can't be used in it. A real terminal drawn on the board, still in the board's type and colours. M.
- **An agent running in its own terminal, as a kind of session.** Emdash does this and it's the only way to get an agent's own interface, including Claude Code's own limit handling and carrying on by itself. Hangs on the rail like any other lantern. L.

### Projects and the work around them
- **Cloning a repo, or making a new one, when founding a project.** Today it has to already be on disk. S.
- **Setup, run and teardown scripts per project**, so a fresh worktree gets its install step, its `.env` and its dev server, shown as steps on the board while a session is cut. Back end ready. M to L.
- **Which name commits go out under**, per project. S.
- **Connecting GitHub**: which account is signed in, and which one a project uses. Back end ready. M.

### Getting the work in
- **Landing a session's work in main, end to end**: merging the branch or landing its pull request, then offering to take the session down and delete the branch, with what that costs said first. L.
- **Conflicts**: saying when main and the session have both touched the same lines, showing them, and handing them to the agent as the next thing to do. M.
- **Everything this session changed**, against the branch it came off, not only what's uncommitted, and the same for a pull request's files and commits. M.

### Reading what's there
- **A file that is a picture shows the picture.** S.
- **A file you're reading updates while the agent writes it.** S.
- **Dev servers noticed**: when something in a checkout starts listening on a port, say so on the board and the rail. Back end ready. M.
- **A browser to open them in**, laid over the yard like everything else, with just an address line and the page. L.

## Want

Good to have, and several of these are the cool ones. Grouped by area.

### Sessions
- **Inline diffs in the transcript**, so what the agent changed reads where it says it changed it. M.
- **What it has cost so far**, on the line with the context figure. S.
- **Forking a session from an earlier turn**, as a new lantern, leaving the original alone. L.
- **A history of ended sessions** you can open and read again. L.
- **Putting an agent back to sleep** when it's been left a long while, and waking it on opening. M.
- **Ending an agent but keeping its worktree**, as distinct from taking the session down. M.
- Smaller: copy a whole answer, export a transcript, mermaid diagrams drawn, how many questions are waiting, allow-everything chosen at the start, the last model and mode remembered, a default agent, updating and removing agents, a half-written line surviving a restart, pressable links in answers. S each.

### Attention and getting around
- **The rack marking which project has somebody waiting**, and the island's light saying it from the water. S.
- **Jumping straight to whoever is waiting**, across every project, by key or from the notification. S.
- **A dock mark when somebody wants you.** S.
- **What you missed while you were away**, said once when you come back. M.
- **Keeping the Mac awake while somebody works.** S.
- Smaller: reopening a session you just took down, rebinding keys, the window remembering where it was, a trimmed menu bar, a way back in after a crash. S to M.

### Git and review
- **Notes on a diff for the agent**: press a line in a change, write what's wrong, and it goes with your next message. S.
- **Review comments and failed checks read on the pull request board**, and handed to the agent as the next thing to do. S.
- **Bringing main into a session** when the session has fallen behind. M.
- **Amend, undo the last commit, revert one.** S.
- **Issues**: starting a session from a GitHub issue, and later the other trackers Emdash supports. M, then L.
- **Scheduled sessions**: an agent that runs on a timetable (every morning, every push) and leaves its work on the rail. L.
- Smaller: drafts when opening a pull request, branch-naming rules, choosing which GitHub account acts. S each.

### Files, terminal and browser
- **Rendered markdown and mermaid** when reading a file. M.
- **Find a file or a phrase from anywhere in the yard**, without walking into the folder first. S.
- **Opening something in your own editor or in Finder.** S.
- **Pasting pictures and files into the shell.** S.
- **Picking an element on a page and handing it to the agent**, and handing it a screenshot of the page. L, and S for the screenshot.
- Reopening the last board you closed. S.

### Settings and machines
- **The windmill**: an island of its own for the app's settings, which is where most of this section would live. M.
- **Adding, editing and removing MCP servers**, starting from Emdash's catalogue of suggested ones. M.
- **Browsing, installing and writing skills.** M.
- **Session defaults** (allow everything, trust the folder, name it for me, branch prefix), **per-agent settings** (extra arguments, environment, which install), whether an agent's hooks are set up, the terminal's font and shell, what's left out of search and file watching. S to M.
- **Every worktree on the machine**, with how much disk each takes and which are stale. M.
- **What's running and how much it's using**, cmux's task manager in village form. S.
- **SSH machines**, so a project can live on another computer. L.
- **Agents driving other Mac apps** (cmux's Computer Use). L.
- **The rail on your phone**, as an Android companion. L.
- Smaller: installing what the machine is missing with an approval step, importing settings from other tools, the app updating itself. S to M.

## Leave out

Cut on purpose, each for a reason.

- **Multiple windows, split panes, canvases and saved layouts.** One screen, one thing read at a time.
- **A sidebar row of metadata for every session at once.** The rail and the yard carry it one session at a time.
- **A welcome screen.** The empty island with its campground is the welcome.
- **Themes, fonts, zoom.** The village is one look.
- **Telemetry.** Mender sends nothing anywhere.
- **Cloud machines, device management, pricing and plans.** cmux's paid product, with nothing local to copy.
- **iOS simulators and an iOS companion.** Android and macOS only.
- **cmux's whole browser automation interface and importing cookies from other browsers.** A different product's job.
- **Terminal configuration in Ghostty's style.** The board has one type and one set of colours.
