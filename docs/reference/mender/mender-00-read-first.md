# Read this first

Mender is this repo's own app: Emdash's back end with its whole front end replaced by a pixel-art village. The island is the home screen and each project is a district on it. Inside a project you stand in the yard of a session: what you asked on the gatepost, what it is thinking over the fire, what it made on the cart, the sessions as lanterns on a rail, and everything else laid over the yard on a wooden board. This catalogue is of `main` at `4fbfa1270`, as of 24 September 2026.

## How it was made

Four readers took the island, the yard, the board and the main process, and wrote down every feature, state and line of text the code has, quoting it word for word. A fifth went through the history and checked every row of `STATE.md` against the code. A sixth drove a separate dev copy of the app through a throwaway test project, clicking through everything `MENDER.md` says the app does and photographing what happened. It never touched the installed app or any real project. The things it left undriven, and the two verdicts it got wrong, were then driven again by hand. Last, every string in the source was checked against all of that, and whatever was still missing is listed at the end.

Each entry ends with the file it came from. The driven section says for each thing whether it works, and shows the screenshot.

## Where it stands

Nearly everything `MENDER.md` describes is there and works when driven: the island and the districts, walking into a project, sessions cut as their own worktrees, the yard, the rail, the rack, the settings window, the slash menu and its village commands, @ files, reading and throwing away a change, committing, reading commits, pushing and pulling, the pull request board, walking the folder and both kinds of search, renaming, the shell, the /agent card, and taking a session down or forgetting a project in two presses.

What does not hold up:

- **Walking into the folder a second time** sticks on "reading it…" for good. The first time after the app starts is fine.
- **Editing a file one line at a time** works, but gives no sign that it has: the taken line gets no cursor while the line at the bottom keeps blinking, so it looks as if the press did nothing.
- **A session's commits** are not listed on its board when the repo's remote has no home-branch pointer, which is the case for a repo created with `git init` and pushed up rather than cloned. Your own projects (mender, aurio, extensions) all have that pointer, so they are not affected.
- **Things worked out but never drawn**: a failed step looks the same as a running one, each helper's own colour is computed but not used, and a lantern never shows that its worktree is still being cut.
- **Skills on the /agent card** are always read from Claude's folders, whichever agent is in the session.
- **Pressing a checkout's title** is wired to do something but never given anything to do.
- **Two-press confirmations** don't all behave alike: forgetting a project disarms itself after a few seconds, and the board's others wait as long as you like.
- **Empty land looks pressable** and does nothing, and blank lines in a file are not drawn.

## On the red "context limit reached"

Mender never says it. The yard's header carries "context" and a percentage of room left, which turns orange when it gets low, with no red and no separate state for having run out.

## On usage and session limits

The red "You've hit your session limit · resets 5pm", and "continuing automatically at 5pm", are drawn by Claude Code's own terminal. Mender talks to Claude over its chat protocol instead, and it has no handling for limits. Claude's adapter can report a usage limit, a rate limit, an overload or an empty quota as a typed failure with a title and a suggested action, but only to a client that asks for those reports, and Mender doesn't. So a limit arrives as an ordinary answer on the board, in plain prose, with no reset time pulled out, no countdown and nothing that carries on by itself. The only limit Mender puts into its own words is GitHub's: "github has had enough questions for now. try again shortly." (From the source; not seen live.)
