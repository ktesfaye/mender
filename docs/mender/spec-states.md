# Every Other State — full transcription

Source: `Every Other State.dc.html`, companion to `District States.dc.html`, ids b1–y6, 129 crops. Each crop is a mid-fidelity photo of one board state, showing only what changes, with a one-line rule printed under it in stone (`var(--c-stone-warm)`). Group A (the ages of a district) is drawn in full on `Every Age.dc.html` and is not part of this file. Every crop sits over the same darkened, desaturated market-scene photo (`brightness(.13) saturate(.4)`, `background-size:1200px 800px`) at a different `background-position`, which is the crop's frame, not part of its data, and is not repeated below except where a crop's own rule refers to depth or lighting.

Colour legend for the hex values that recur (given so repetition below is legible, not as a substitute for the literal hex quoted on every line): `#e0b56a`/`#ffdca4`/`#f0cf8a` are the gold family (pressable), `#f4e3c0` bright cream (current/selected label), `#dcc8a0` warm parchment (plain static text), `#a89272`/`#8a7a5e` stone (secondary/muted), `#6b5a40` dark brown (separators, arrows), `#482510` near-black brown (text sitting on a filled-gold background), `#ff9a6a` orange (wants-you / caution), `#e0735a` red (error/destructive), `#a8c469` green (success/added), `#ab9470`/`#2c2013` the handwriting ink on the line.


## B · Arrival and escape

*6 crops.* From the island into a district and back out.


### B1 — Camera pulling in

**Rule (verbatim):** Linear, 240ms, whole-pixel steps. Pressing anything half-way lands the camera at once.

**Belongs:** the whole frame (camera move from island to district)

**Literal text, in order:**

- “0ms · island” — color `#a89272`, label, 10px, letter-spacing .24em, uppercase
- “the whole island, New Orleans lit” — color `#dcc8a0`, monospace, 13px
- “→” — color `#6b5a40`, monospace, 13px
- “120ms” — color `#a89272`, label, 10px, letter-spacing .24em, uppercase
- “district fills half the frame” — color `#dcc8a0`, monospace, 13px
- “→” — color `#6b5a40`, monospace, 13px
- “240ms · in” — color `#a89272`, label, 10px, letter-spacing .24em, uppercase
- “yard at 1×, board settles” — color `#dcc8a0`, monospace, 13px
- “any key during the move finishes it” — color `#a89272`, monospace, 13px


### B2 — The rest of the island

**Rule (verbatim):** Neighbouring districts stay in frame, dimmed to the same silhouettes as a sub-board. Their lanterns keep their light, so someone wanting you elsewhere still shows.

**Belongs:** the whole frame (neighbouring districts at the frame edges)

**Literal text, in order:**

- IMAGE: `assets/p-lantern-off.png`, 22×38px, filter `brightness(.75)`
- “Bayou Dev · resting” — color `#a89272`, monospace, 13px
- IMAGE: `assets/p-lantern-on.png`, 22×38px, animation `cv-flicker 480ms steps(2,end) infinite alternate`
- “Harbor · wants you” — color `#ff9a6a`, monospace, 13px
- IMAGE: `assets/p-lantern-off.png`, 22×38px, filter `brightness(.75)`
- “Old Mill · resting” — color `#a89272`, monospace, 13px
- “edges of the frame, brightness .12” — color `#a89272`, monospace, 13px


### B3 — The board settling

**Rule (verbatim):** The board does not fly in. The gatepost, fire and cart are part of the ground and are there when the camera arrives; only the text steps in, top to bottom, 4 frames.

**Belongs:** the whole frame (order the board's own pieces settle in: ground, header, gatepost+thinking column, made/did cart + lantern rail)

**Literal text, in order:**

- “ground only” — color `#6b5a40`, monospace, 13px
- “→” — color `#6b5a40`, monospace, 13px
- “header” — color `#dcc8a0`, monospace, 13px
- “→” — color `#6b5a40`, monospace, 13px
- “gatepost + thinking” — color `#dcc8a0`, monospace, 13px
- “→” — color `#6b5a40`, monospace, 13px
- “cart + rail” — color `#dcc8a0`, monospace, 13px


### B4 — Re-opening where you left

**Rule (verbatim):** You come back to the exact session, sub-board and scroll position. The trail says where you are before anything else draws.

**Belongs:** the whole frame / trail (which session, sub-board and scroll position it reopens on)

**Literal text, in order:**

- “yard” — color `#e0b56a`, monospace, 13px
- “›” — color `#6b5a40`, monospace, 13px
- “changes” — color `#e0b56a`, monospace, 13px
- “›” — color `#6b5a40`, monospace, 13px
- “nola.md” — color `#f4e3c0`, monospace, 13px
- “scrolled to Sunday · as you left it 3h ago” — color `#a89272`, monospace, 13px


### B5 — Two districts in quick succession

**Rule (verbatim):** Going from one district straight to another does not pull out to the island. It cuts across, 160ms, and the trail resets.

**Belongs:** the whole frame (district-to-district cut)

**Literal text, in order:**

- “New Orleans” — color `#f4e3c0`, monospace, 13px
- “→” — color `#6b5a40`, monospace, 13px
- “Harbor” — color `#f4e3c0`, monospace, 13px
- “no island shown in between” — color `#a89272`, monospace, 13px


### B6 — Backing out

**Rule (verbatim):** Esc steps back one level at a time. The last step, from the yard, pulls the camera out to the island.

**Belongs:** the whole frame / trail (Escape ladder across input line, sub-board, session, district)

**Literal text, in order:**

- “line text” — color `#f4e3c0`, monospace, 13px
- “→” — color `#6b5a40`, monospace, 13px
- “cleared” — color `#a89272`, monospace, 13px
- “sub-board” — color `#f4e3c0`, monospace, 13px
- “→” — color `#6b5a40`, monospace, 13px
- “yard” — color `#a89272`, monospace, 13px
- “session” — color `#f4e3c0`, monospace, 13px
- “→” — color `#6b5a40`, monospace, 13px
- “district, no session selected” — color `#a89272`, monospace, 13px
- “district” — color `#f4e3c0`, monospace, 13px
- “→” — color `#6b5a40`, monospace, 13px
- “the island” — color `#a89272`, monospace, 13px


## C · The head of the board

*8 crops.* The two lines above the gatepost.


### C1 — Name, path, host

**Rule (verbatim):** Each part of the header is pressable where it leads somewhere.

**Belongs:** header

**Literal text, in order:**

- “New Orleans” — color `#f4e3c0`, label, 20px, letter-spacing .24em, uppercase, weight 600
- “slideshow/nola” — color `#e0b56a`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “~/code/nola” — color `#e0b56a`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “this machine” — color `#e0b56a`, monospace, 13px
- “name renames · path opens the folder · host lists hosts” — color `#a89272`, monospace, 13px


### C2 — Remote and account

**Rule (verbatim):** Which remote and which account this project pushes as. Shown only when there is more than one of either.

**Belongs:** header

**Literal text, in order:**

- “origin” — color `#a89272`, monospace, 13px
- “github.com/sanjay/nola” — color `#e0b56a`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “as” — color `#a89272`, monospace, 13px
- “sanjay-work” — color `#e0b56a`, monospace, 13px


### C3 — Out to the real world

**Rule (verbatim):** Two pressable words at the right end of the header. Nothing else there.

**Belongs:** header

**Literal text, in order:**

- “open in editor” — color `#e0b56a`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “show in Finder” — color `#e0b56a`, monospace, 13px


### C4 — Still being created

**Rule (verbatim):** The header is present from the first frame; the parts that are not ready say so in stone.

**Belongs:** header

**Literal text, in order:**

- “New Orleans” — color `#f4e3c0`, label, 20px, letter-spacing .24em, uppercase, weight 600
- “cloning · 64%” — color `#a89272`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “host ready” — color `#a89272`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “no remote yet” — color `#a89272`, monospace, 13px


### C5 — Host unreachable

**Rule (verbatim):** Most of the board can do nothing, so most of it goes to stone. What still works stays gold.

**Belongs:** header

**Literal text, in order:**

- “host unreachable” — color `#e0735a`, monospace, 13px
- “last seen 6m ago · dev-box-2” — color `#a89272`, monospace, 13px
- “try again” — color `#e0b56a`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “switch host” — color `#e0b56a`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “push” — color `#a89272`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “shell” — color `#a89272`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “new session” — color `#a89272`, monospace, 13px


### C6 — Path moved

**Rule (verbatim):** The folder is not where the project remembers it.

**Belongs:** header

**Literal text, in order:**

- “folder missing” — color `#e0735a`, monospace, 13px
- “~/code/nola” — color `#a89272`, monospace, 13px
- “find it” — color `#e0b56a`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “point at a new folder” — color `#e0b56a`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “remove from the island” — color `#e0b56a`, monospace, 13px


### C7 — Not a git repo any more

**Rule (verbatim):** .git is gone or broken. The sessions and history are still readable from the last known state.

**Belongs:** header

**Literal text, in order:**

- “not a git repository” — color `#e0735a`, monospace, 13px
- “~/code/nola/.git missing” — color `#a89272`, monospace, 13px
- “run git init” — color `#e0b56a`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “point at a new folder” — color `#e0b56a`, monospace, 13px


### C8 — Abandoning the project

**Rule (verbatim):** Two presses. The first names everything that will be lost.

**Belongs:** header (with its confirm sitting on the input line)

**Literal text, in order:**

- “abandon New Orleans” — color `#e0b56a`, monospace, 13px
- “press again — 3 worktrees, 6 unpushed commits, 2 shells” — color `#e0b56a`, monospace, 13px
- “reverts in 4s · the repo on disk is left alone” — color `#a89272`, monospace, 13px


## D · The roster

*10 crops.* The lantern rail, one lantern at a time.


### D1 — A row at rest

**Rule (verbatim):** Name, then status and time. The branch is not shown unless it differs from the name.

**Belongs:** lantern rail

**Literal text, in order:**

- IMAGE: `assets/p-lantern-off.png`, 22×38px, filter `brightness(.75)`
- “grid-toolbar” — color `#dcc8a0`, monospace, 13px
- “idle · 26m” — color `#a89272`, monospace, 11px


### D2 — Five postures, one shape

**Rule (verbatim):** The lantern and the tone carry the posture; the shape never changes.

**Belongs:** lantern rail

**Literal text, in order:**

- IMAGE: `assets/p-lantern-on.png`, 22×38px
- “grid-toolbar” — color `#f4e3c0`, monospace, 13px
- “working · 17m” — color `#dcc8a0`, monospace, 11px
- IMAGE: `assets/p-lantern-on.png`, 22×38px, animation `cv-flicker 480ms steps(2,end) infinite alternate`
- “new-source” — color `#ff9a6a`, monospace, 13px
- “wants you · 4m” — color `#a89272`, monospace, 11px
- IMAGE: `assets/p-lantern-off.png`, 22×38px, filter `brightness(.75)`
- “history-merge” — color `#a8c469`, monospace, 13px
- “merged · 2h” — color `#a89272`, monospace, 11px
- IMAGE: `assets/p-lantern-off.png`, 22×38px, filter `brightness(.75)`
- “auth-fix” — color `#e0735a`, monospace, 13px
- “git refused” — color `#a89272`, monospace, 11px
- IMAGE: `assets/p-lantern-off.png`, 22×38px, filter `brightness(.75)`
- “csv-import” — color `#a89272`, monospace, 13px
- “resting · 3d” — color `#a89272`, monospace, 11px


### D3 — Unread

**Rule (verbatim):** It said something you have not read. The name brightens one step until you open it; no badge, no dot.

**Belongs:** lantern rail

**Literal text, in order:**

- IMAGE: `assets/p-lantern-on.png`, 22×38px
- “grid-toolbar” — color `#f4e3c0`, monospace, 13px
- “working · said something 2m ago” — color `#dcc8a0`, monospace, 11px


### D4 — Ahead of its branch

**Rule (verbatim):** One number, the one that matters: what has not left.

**Belongs:** lantern rail

**Literal text, in order:**

- IMAGE: `assets/p-lantern-on.png`, 22×38px
- “nola-photos” — color `#ffdca4`, monospace, 13px
- “6 not pushed · 20m” — color `#dcc8a0`, monospace, 11px


### D5 — Order and pinning

**Rule (verbatim):** Wants-you first, then working, then the rest by last move. A pinned lantern hangs from a doubled cord and never moves.

**Belongs:** lantern rail

**Literal text, in order:**

- “nola-photos · pinned” — color `#ffdca4`, monospace, 13px


### D6 — Walked by arrow keys

**Rule (verbatim):** Selected is thatch-gold fill with the outline kept — the only fill on the rail.

**Belongs:** lantern rail

**Literal text, in order:**

- IMAGE: `assets/p-lantern-on.png`, 22×38px
- “grid-toolbar” — color `#482510`, monospace, 13px
- “← → walks · return goes in · no highlight bar” — color `#a89272`, monospace, 13px


### D7 — Being provisioned

**Rule (verbatim):** Lantern unlit, cord shorter, status counts the steps.

**Belongs:** lantern rail

**Literal text, in order:**

- IMAGE: `assets/p-lantern-off.png`, 22×38px, filter `brightness(.75)`
- “csv-import” — color `#a89272`, monospace, 13px
- “being cut · 3 of 8” — color `#a89272`, monospace, 11px


### D8 — Worktree gone or stuck

**Rule (verbatim):** The session survives its worktree. The lantern is dark and the fix is on the line.

**Belongs:** lantern rail

**Literal text, in order:**

- IMAGE: `assets/p-lantern-off.png`, 22×38px, filter `brightness(.75)`
- “auth-fix” — color `#e0735a`, monospace, 13px
- “worktree missing” — color `#a89272`, monospace, 11px
- “recreate” — color `#e0b56a`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “take it down” — color `#e0b56a`, monospace, 13px


### D9 — Taking one down

**Rule (verbatim):** Two presses. Uncommitted and unpushed work is named before anything happens.

**Belongs:** lantern rail (with its confirm on the input line)

**Literal text, in order:**

- “take down grid-toolbar” — color `#e0b56a`, monospace, 13px
- “press again — 12 uncommitted lines, 2 commits not pushed” — color `#e0b56a`, monospace, 13px
- “reverts in 4s” — color `#a89272`, monospace, 13px


### D10 — Archived sessions

**Rule (verbatim):** Off the rail. One count at the far end of the beam opens them as a list on a sub-board.

**Belongs:** lantern rail (count) opening a sub-board list

**Literal text, in order:**

- “14 archived” — color `#e0b56a`, monospace, 13px
- “at the end of the beam” — color `#a89272`, monospace, 13px
- “yard” — color `#e0b56a`, monospace, 13px
- “›” — color `#6b5a40`, monospace, 13px
- “archived” — color `#f4e3c0`, monospace, 13px
- “bring back” — color `#e0b56a`, monospace, 13px
- “csv-import-old · 21 days” — color `#a89272`, monospace, 13px


## E · Starting a session

*3 crops.* The rest of E is drawn in full on thenew-session board.


### E5 — Branch already checked out

**Rule (verbatim):** The branch you typed lives in another worktree. Say so, and offer the one thing that works.

**Belongs:** input line (with the picked branch on the trail)

**Literal text, in order:**

- “branch” (padded with literal spaces for column alignment, `white-space:pre`) — color `#a89272`, monospace, 12px
- “claude/nola-photos” (padded with literal spaces for column alignment, `white-space:pre`) — color `#e0b56a`, monospace, 13px
- “already checked out in nola-photos” — color `#ff9a6a`, monospace, 13px
- “reuse that worktree” — color `#e0b56a`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “name it something else” — color `#e0b56a`, monospace, 13px


### E7 — The first thing you say

**Rule (verbatim):** What is on the line when you press return is its first message, nailed to its gatepost before the worktree is even ready.

**Belongs:** gatepost (the typed first message is nailed there before the worktree exists)

**Literal text, in order:**

- “add one photo per dish, from the restaurant’s own site” — color `#2c2013`, handwriting, 18px


### E9 — Being built, and failing to build

**Rule (verbatim):** Each command ticks through in place. A failure stops on the line that failed and keeps its output.

**Belongs:** gatepost / thinking column (setup commands ticking through before the session is ready)

**Literal text, in order:**

- “✓ git fetch origin main” (padded with literal spaces for column alignment, `white-space:pre`) — color `#a8c469`, monospace, 13px
- “✓ git worktree add …” (padded with literal spaces for column alignment, `white-space:pre`) — color `#a8c469`, monospace, 13px
- “✗ npm install” (padded with literal spaces for column alignment, `white-space:pre`) — color `#e0735a`, monospace, 13px
- “ERR! peer dep conflict: vite@5 vs vite@4” (padded with literal spaces for column alignment, `white-space:pre`) — color `#a89272`, monospace, 13px
- “try again” — color `#e0b56a`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “skip setup” — color `#e0b56a`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “take it down” — color `#e0b56a`, monospace, 13px


## F · The checkout

*6 crops.* Where the branch stands and how it leaves.


### F1 — Where the branch stands

**Rule (verbatim):** One line under the trail on every sub-board. Detached and empty are words, not symbols.

**Belongs:** a sub-board (the checkout board, one line under its trail)

**Literal text, in order:**

- “claude/nola-photos” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “6 ahead · 0 behind origin” — color `#a89272`, monospace, 13px
- “HEAD” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “detached at 3f2a91c” — color `#ff9a6a`, monospace, 13px
- “claude/new” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “nothing committed yet” — color `#a89272`, monospace, 13px


### F2 — Publish, push, pull

**Rule (verbatim):** Three words, only the ones that apply. Publish appears once, then becomes push.

**Belongs:** a sub-board (the checkout board, one line under its trail)

**Literal text, in order:**

- “publish branch” — color `#e0b56a`, monospace, 13px
- “never pushed” — color `#a89272`, monospace, 13px
- “push 6” — color `#e0b56a`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “pull 2” — color `#e0b56a`, monospace, 13px


### F3 — Every way they fail

**Rule (verbatim):** The reason stays on the line until you act. The fix is always the next gold word.

**Belongs:** a sub-board (the checkout board, one line under its trail)

**Literal text, in order:**

- “auth failed” — color `#e0735a`, monospace, 13px
- “sign in again” — color `#e0b56a`, monospace, 13px
- “offline” — color `#e0735a`, monospace, 13px
- “try again” — color `#e0b56a`, monospace, 13px
- “conflict in nola.md” — color `#e0735a`, monospace, 13px
- “open it” — color `#e0b56a`, monospace, 13px
- “diverged · 6 ahead, 4 behind” — color `#e0735a`, monospace, 13px
- “rebase” — color `#e0b56a`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “merge” — color `#e0b56a`, monospace, 13px
- “LFS object missing” — color `#e0735a`, monospace, 13px
- “fetch LFS” — color `#e0b56a`, monospace, 13px
- “rejected · protected branch” — color `#e0735a`, monospace, 13px
- “open a PR instead” — color `#e0b56a`, monospace, 13px


### F4 — Switching branches

**Rule (verbatim):** Pressing the branch name opens a picker on the line itself: type to narrow, return to switch.

**Belongs:** input line (branch picker overlay grown from the line)

**Literal text, in order:**

- “› nola” — color `#ab9470`, handwriting, 20px
- “claude/nola-photos” — color `#482510`, monospace, 13px
- “main” — color `#e0b56a`, monospace, 13px
- “claude/nola-hours” — color `#e0b56a`, monospace, 13px
- “+ 11 more” — color `#a89272`, monospace, 13px


### F5 — Remotes

**Rule (verbatim):** Base and push remote shown only when they differ.

**Belongs:** a sub-board (the checkout board)

**Literal text, in order:**

- “base” — color `#a89272`, monospace, 13px
- “upstream/main” — color `#e0b56a`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “push” — color `#a89272`, monospace, 13px
- “origin” — color `#e0b56a`, monospace, 13px
- “add a remote” — color `#e0b56a`, monospace, 13px


### F6 — Fetch as a deliberate act

**Rule (verbatim):** Fetch is never automatic. The time since the last fetch is the reminder.

**Belongs:** a sub-board (the checkout board)

**Literal text, in order:**

- “fetch” — color `#e0b56a`, monospace, 13px
- “last fetched 3h ago” — color `#a89272`, monospace, 13px


## G · Uncommitted work

*7 crops.* Reading a change and a commit are drawn on thesub-board.


### G1 — The list

**Rule (verbatim):** What happened to each file, in one letter and its tone.

**Belongs:** a sub-board (the changes board)

**Literal text, in order:**

- “yard” — color `#e0b56a`, monospace, 13px
- “›” — color `#6b5a40`, monospace, 13px
- “changes” — color `#f4e3c0`, monospace, 13px
- “M” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “nola.md” — color `#e0b56a`, monospace, 13px
- “+41 −12” — color `#a89272`, monospace, 13px
- “A” (padded with literal spaces for column alignment, `white-space:pre`) — color `#a8c469`, monospace, 13px
- “photos/boudin.jpg” — color `#e0b56a`, monospace, 13px
- “new” — color `#a89272`, monospace, 13px
- “D” (padded with literal spaces for column alignment, `white-space:pre`) — color `#e0735a`, monospace, 13px
- “old-plan.md” — color `#e0b56a`, monospace, 13px
- “removed” — color `#a89272`, monospace, 13px
- “R” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “plan.md → nola-plan.md” — color `#e0b56a`, monospace, 13px
- “renamed” — color `#a89272`, monospace, 13px


### G2 — Too many to hold

**Rule (verbatim):** Past 12 files, folders collapse to counts. Past 200, nothing is drawn per file.

**Belongs:** a sub-board (the changes board)

**Literal text, in order:**

- “M” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “nola.md” — color `#e0b56a`, monospace, 13px
- “+41 −12” — color `#a89272`, monospace, 13px
- “photos/” — color `#e0b56a`, monospace, 13px
- “38 new” — color `#a89272`, monospace, 13px
- “node_modules/” — color `#e0b56a`, monospace, 13px
- “4,120 changed · probably should be ignored” — color `#e0735a`, monospace, 13px


### G4 — Throwing one away

**Rule (verbatim):** Two presses, named first.

**Belongs:** a sub-board (the changes board, with its confirm on the input line)

**Literal text, in order:**

- “throw away changes to nola.md” — color `#e0b56a`, monospace, 13px
- “press again — 41 lines, gone for good” — color `#e0b56a`, monospace, 13px
- “thrown away · 41 lines” — color `#a89272`, monospace, 13px


### G5 — Writing a commit

**Rule (verbatim):** The message is written on the line. Unticked files are held back. Return commits.

**Belongs:** a sub-board (the changes board) with the message on the input line

**Literal text, in order:**

- “› cut places with an hour wait” — color `#ab9470`, handwriting, 20px
- “nola.md” — color `#482510`, monospace, 13px
- “photos/” — color `#e0b56a`, monospace, 13px
- “held back” — color `#a89272`, monospace, 13px
- “return commits 1 file · 41 lines” — color `#a89272`, monospace, 13px


### G7 — History under it

**Rule (verbatim):** Twelve commits, then a count. Each is pressable into its board.

**Belongs:** a sub-board (the changes board, commit history beneath the file list)

**Literal text, in order:**

- “e02b77f” — color `#e0b56a`, monospace, 13px
- “publish nola.html” — color `#dcc8a0`, monospace, 13px
- “11m” — color `#a89272`, monospace, 13px
- “3f2a91c” — color `#e0b56a`, monospace, 13px
- “cut places with a wait” — color `#dcc8a0`, monospace, 13px
- “2h” — color `#a89272`, monospace, 13px
- “a81c0de” — color `#e0b56a`, monospace, 13px
- “add Monday” — color `#dcc8a0`, monospace, 13px
- “6h” — color `#a89272`, monospace, 13px
- “▸ 48 older” — color `#a89272`, monospace, 13px


### G8 — A conflicted file

**Rule (verbatim):** Both sides shown in their own tones, with the three ways out.

**Belongs:** a sub-board (a single conflicted file, opened from the changes board)

**Literal text, in order:**

- “conflict” — color `#e0735a`, monospace, 13px
- “nola.md · line 14” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “ours    - Zasu — dinner in Mid-City” (padded with literal spaces for column alignment, `white-space:pre`) — color `#a8c469`, monospace, 13px
- “theirs  - Herbsaint — dinner downtown” (padded with literal spaces for column alignment, `white-space:pre`) — color `#ff9a6a`, monospace, 13px
- “keep ours” — color `#e0b56a`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “keep theirs” — color `#e0b56a`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “keep both” — color `#e0b56a`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “ask claude” — color `#e0b56a`, monospace, 13px


### G9 — Binary, image, too big

**Rule (verbatim):** Images show as images. Everything else says what it is and how big.

**Belongs:** a sub-board (a single file's change board)

**Literal text, in order:**

- “photos/boudin.jpg” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “image · 412 KB · 1200×800” — color `#a89272`, monospace, 13px
- “data.sqlite” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “binary · 18 MB · not drawn” — color `#a89272`, monospace, 13px
- “dump.json” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “4.2 MB · too large to draw” — color `#a89272`, monospace, 13px
- “open in editor” — color `#e0b56a`, monospace, 13px


## H · Walking into the checkout

*6 crops.* Reading a file is drawn on thesub-board.


### H1 — The folder

**Rule (verbatim):** Folders first, one level at a time. Pressing a folder walks into it; the trail grows.

**Belongs:** a sub-board (the files board)

**Literal text, in order:**

- “yard” — color `#e0b56a`, monospace, 13px
- “›” — color `#6b5a40`, monospace, 13px
- “files” — color `#e0b56a`, monospace, 13px
- “›” — color `#6b5a40`, monospace, 13px
- “photos” — color `#f4e3c0`, monospace, 13px
- “dishes/” — color `#e0b56a`, monospace, 13px
- “restaurants/” — color `#e0b56a`, monospace, 13px
- “boudin.jpg” — color `#e0b56a`, monospace, 13px
- “412 KB” — color `#a89272`, monospace, 13px
- “po-boy.jpg” — color `#e0b56a`, monospace, 13px
- “388 KB” — color `#a89272`, monospace, 13px


### H3 — Editing a line

**Rule (verbatim):** Press a line to edit it on the line. If the file changes underneath, the edit waits and says so.

**Belongs:** input line (editing a line of a file, opened from a sub-board)

**Literal text, in order:**

- “› - Zasu — dinner in Mid-City. Book two weeks ahead.” — color `#ab9470`, handwriting, 20px
- “claude changed this file 4s ago” — color `#ff9a6a`, monospace, 13px
- “keep mine” — color `#e0b56a`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “take theirs” — color `#e0b56a`, monospace, 13px


### H4 — Make, rename, throw away

**Rule (verbatim):** All three happen on the line, with the folder you are in as the prefix.

**Belongs:** input line (make/rename, from a sub-board)

**Literal text, in order:**

- “new in photos/” — color `#a89272`, monospace, 13px
- “› shrimp-remoulade.jpg” — color `#ab9470`, handwriting, 20px


### H5 — Who last touched these lines

**Rule (verbatim):** Blame in the margin: who, when, and the commit, all in stone except the commit.

**Belongs:** a sub-board (a file's reading board, blame in its margin)

**Literal text, in order:**

- “7” (padded with literal spaces for column alignment, `white-space:pre`) — color `#8a7a5e`, monospace, 13px
- “3f2a91c” — color `#e0b56a`, monospace, 13px
- “claude · 2h” — color `#a89272`, monospace, 13px
- “- Molly’s Rise and Shine” — color `#dcc8a0`, monospace, 13px
- “8” (padded with literal spaces for column alignment, `white-space:pre`) — color `#8a7a5e`, monospace, 13px
- “a81c0de” — color `#e0b56a`, monospace, 13px
- “you · 6h” — color `#a89272`, monospace, 13px
- “- Turkey and the Wolf” — color `#dcc8a0`, monospace, 13px


### H6 — Finding by name, finding by writing

**Rule (verbatim):** One line. A leading slash searches inside files.

**Belongs:** input line (the file/find overlay) and a sub-board (results)

**Literal text, in order:**

- “› boudin” — color `#ab9470`, handwriting, 20px
- “photos/boudin.jpg” — color `#e0b56a`, monospace, 13px
- “› /po’boy” — color `#ab9470`, handwriting, 20px
- “nola.md:18” — color `#e0b56a`, monospace, 13px
- “Parkway Bakery — the roast beef po’boy” — color `#dcc8a0`, monospace, 13px


### H7 — A file dropped from outside

**Rule (verbatim):** It lands in the folder you are looking at. The name is on the line, ready to change.

**Belongs:** input line (the dropped file's name, ready to change)

**Literal text, in order:**

- “into photos/” — color `#a89272`, monospace, 13px
- “› IMG_4471.heic” — color `#ab9470`, handwriting, 20px
- “return keeps it · esc throws it back” — color `#a89272`, monospace, 13px


## J · The shell

*1 crop.* Opening, persisting and several shells are drawn on thesub-board.


### J4 — A full-screen program

**Rule (verbatim):** vim, htop, less: the program owns the whole reading area. The trail stays; Esc goes to the program, so leaving is the trail.

**Belongs:** a sub-board (a shell board) with the trail on it

**Literal text, in order:**

- “yard” — color `#e0b56a`, monospace, 13px
- “›” — color `#6b5a40`, monospace, 13px
- “shell 1 · vim” — color `#f4e3c0`, monospace, 13px
- “~” (padded with literal spaces for column alignment, `white-space:pre`) — color `#a89272`, monospace, 13px
- “~” (padded with literal spaces for column alignment, `white-space:pre`) — color `#a89272`, monospace, 13px
- “"nola.md" 64L, 2210B” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “press yard in the trail to leave” — color `#a89272`, monospace, 13px


## K · How work leaves

*7 crops.* Pull requests, checks, review and merging.


### K1 — What is open for this branch

**Rule (verbatim):** One line under the trail when a PR exists.

**Belongs:** a sub-board (the checkout board, one line under its trail)

**Literal text, in order:**

- “#142” — color `#e0b56a`, monospace, 13px
- “Three days of food” — color `#dcc8a0`, monospace, 13px
- “into main” — color `#a89272`, monospace, 13px
- “5 checks passed” — color `#a8c469`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “1 review asked for changes” — color `#ff9a6a`, monospace, 13px


### K2 — Opening one

**Rule (verbatim):** Title from the last commit, body from the session’s plan. Draft is a word you can press.

**Belongs:** input line (the PR title) opening onto a sub-board

**Literal text, in order:**

- “› Three days of food, New Orleans” — color `#ab9470`, handwriting, 20px
- “into” — color `#a89272`, monospace, 13px
- “main” — color `#e0b56a`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “draft” — color `#e0b56a`, monospace, 13px
- “return opens #143” — color `#a89272`, monospace, 13px


### K3 — The checks

**Rule (verbatim):** A count, except the failures, which are named.

**Belongs:** a sub-board (the PR board)

**Literal text, in order:**

- “4 passed” — color `#a8c469`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “1 running · 2m” — color `#f4e3c0`, monospace, 13px
- “lint failed” — color `#e0735a`, monospace, 13px
- “read the log” — color `#e0b56a`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “ask claude to fix” — color `#e0b56a`, monospace, 13px


### K4 — Review comments

**Rule (verbatim):** Each comment pinned to its line in the change. Feeding one to the agent nails it to the gatepost.

**Belongs:** a sub-board (the PR board, comments pinned to the change)

**Literal text, in order:**

- “nola.md:14” (padded with literal spaces for column alignment, `white-space:pre`) — color `#8a7a5e`, monospace, 13px
- “reviewer · 20m” — color `#a89272`, monospace, 13px
- “Zasu closes Mondays in October — check.” — color `#dcc8a0`, serif thinking, 16px
- “hand to claude” — color `#e0b56a`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “reply” — color `#e0b56a`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “resolve” — color `#e0b56a`, monospace, 13px


### K5 — Merging, three ways

**Rule (verbatim):** Three words. The default is the repo’s own setting.

**Belongs:** input line / a sub-board (the PR board's merge line)

**Literal text, in order:**

- “squash” — color `#482510`, monospace, 13px
- “merge commit” — color `#e0b56a`, monospace, 13px
- “rebase” — color `#e0b56a`, monospace, 13px
- “return merges #142 into main” — color `#a89272`, monospace, 13px


### K6 — Every PR in the project

**Rule (verbatim):** A sub-board list; mine first.

**Belongs:** a sub-board (a project-wide PR list)

**Literal text, in order:**

- “yard” — color `#e0b56a`, monospace, 13px
- “›” — color `#6b5a40`, monospace, 13px
- “pull requests” — color `#f4e3c0`, monospace, 13px
- “#142” — color `#e0b56a`, monospace, 13px
- “Three days of food” — color `#dcc8a0`, monospace, 13px
- “yours · open” — color `#a89272`, monospace, 13px
- “#139” — color `#e0b56a`, monospace, 13px
- “Grid toolbar” — color `#dcc8a0`, monospace, 13px
- “merged” — color `#a8c469`, monospace, 13px


### K7 — Issues

**Rule (verbatim):** Browsing, and starting a session from one: the issue title fills the line.

**Belongs:** a sub-board (a project-wide issues list), with the line filled from an issue

**Literal text, in order:**

- “yard” — color `#e0b56a`, monospace, 13px
- “›” — color `#6b5a40`, monospace, 13px
- “issues” — color `#f4e3c0`, monospace, 13px
- “#88” — color `#e0b56a`, monospace, 13px
- “Photos for every dish” — color `#dcc8a0`, monospace, 13px
- “opened 2d ago” — color `#a89272`, monospace, 13px
- “start a session from #88” — color `#e0b56a`, monospace, 13px


## L · Configuration

*8 crops.* One sub-board, read like a file: key on the left, value in gold.


### L1 — Worktrees, branch, remotes

**Rule (verbatim):** *(no rule text printed under this crop)*

**Belongs:** a sub-board (the settings board)

**Literal text, in order:**

- “yard” — color `#e0b56a`, monospace, 13px
- “›” — color `#6b5a40`, monospace, 13px
- “settings” — color `#f4e3c0`, monospace, 13px
- “worktrees in” (padded with literal spaces for column alignment, `white-space:pre`) — color `#a89272`, monospace, 12px
- “~/code/.worktrees” — color `#e0b56a`, monospace, 13px
- “default branch” (padded with literal spaces for column alignment, `white-space:pre`) — color `#a89272`, monospace, 12px
- “main” — color `#e0b56a`, monospace, 13px
- “base remote” (padded with literal spaces for column alignment, `white-space:pre`) — color `#a89272`, monospace, 12px
- “origin” — color `#e0b56a`, monospace, 13px


### L2 — Account and credentials

**Rule (verbatim):** *(no rule text printed under this crop)*

**Belongs:** a sub-board (the settings board)

**Literal text, in order:**

- “account” (padded with literal spaces for column alignment, `white-space:pre`) — color `#a89272`, monospace, 12px
- “sanjay-work” — color `#e0b56a`, monospace, 13px
- “credentials” (padded with literal spaces for column alignment, `white-space:pre`) — color `#a89272`, monospace, 12px
- “system keychain” — color `#e0b56a`, monospace, 13px


### L3 — Environment variables

**Rule (verbatim):** Values hidden until pressed.

**Belongs:** a sub-board (the settings board)

**Literal text, in order:**

- “OPENAI_KEY” (padded with literal spaces for column alignment, `white-space:pre`) — color `#a89272`, monospace, 12px
- “••••••••” — color `#e0b56a`, monospace, 13px
- “PORT” (padded with literal spaces for column alignment, `white-space:pre`) — color `#a89272`, monospace, 12px
- “5173” — color `#e0b56a`, monospace, 13px
- “add a variable” — color `#e0b56a`, monospace, 13px


### L4 — Lifecycle scripts

**Rule (verbatim):** *(no rule text printed under this crop)*

**Belongs:** a sub-board (the settings board)

**Literal text, in order:**

- “prepare” (padded with literal spaces for column alignment, `white-space:pre`) — color `#a89272`, monospace, 12px
- “npm ci” — color `#e0b56a`, monospace, 13px
- “setup” (padded with literal spaces for column alignment, `white-space:pre`) — color `#a89272`, monospace, 12px
- “cp .env.example .env” — color `#e0b56a`, monospace, 13px
- “run” (padded with literal spaces for column alignment, `white-space:pre`) — color `#a89272`, monospace, 12px
- “npm run dev” — color `#e0b56a`, monospace, 13px
- “teardown” (padded with literal spaces for column alignment, `white-space:pre`) — color `#a89272`, monospace, 12px
- “none” — color `#a89272`, monospace, 13px


### L5 — Preserved into new worktrees

**Rule (verbatim):** *(no rule text printed under this crop)*

**Belongs:** a sub-board (the settings board)

**Literal text, in order:**

- “copy” (padded with literal spaces for column alignment, `white-space:pre`) — color `#a89272`, monospace, 12px
- “.env.local, .vscode/” — color `#e0b56a`, monospace, 13px


### L6 — Exclusions

**Rule (verbatim):** *(no rule text printed under this crop)*

**Belongs:** a sub-board (the settings board)

**Literal text, in order:**

- “tree” (padded with literal spaces for column alignment, `white-space:pre`) — color `#a89272`, monospace, 12px
- “node_modules, dist” — color `#e0b56a`, monospace, 13px
- “search” (padded with literal spaces for column alignment, `white-space:pre`) — color `#a89272`, monospace, 12px
- “*.min.js” — color `#e0b56a`, monospace, 13px
- “watcher” (padded with literal spaces for column alignment, `white-space:pre`) — color `#a89272`, monospace, 12px
- “.git” — color `#e0b56a`, monospace, 13px


### L7 — Set, inherited, broken

**Rule (verbatim):** Inherited values are stone and say where from. Broken values say why and how to put them back.

**Belongs:** a sub-board (the settings board)

**Literal text, in order:**

- “default branch” (padded with literal spaces for column alignment, `white-space:pre`) — color `#a89272`, monospace, 12px
- “main” — color `#e0b56a`, monospace, 13px
- “worktrees in” (padded with literal spaces for column alignment, `white-space:pre`) — color `#a89272`, monospace, 12px
- “~/code/.worktrees · from the island” — color `#a89272`, monospace, 13px
- “run” (padded with literal spaces for column alignment, `white-space:pre`) — color `#a89272`, monospace, 12px
- “npm run dev · script not found” — color `#e0735a`, monospace, 13px
- “put back the default” — color `#e0b56a`, monospace, 13px


### L8 — Sharing, importing

**Rule (verbatim):** *(no rule text printed under this crop)*

**Belongs:** a sub-board (the settings board)

**Literal text, in order:**

- “export settings as .village.json” — color `#e0b56a`, monospace, 13px
- “import from a file” — color `#e0b56a`, monospace, 13px
- “migrate from .emdash” — color `#e0b56a`, monospace, 13px


## M · Housekeeping

*7 crops.* Worktrees, disk, servers and runs that happen alone.


### M1 — Every worktree

**Rule (verbatim):** Including the ones no session owns.

**Belongs:** a sub-board (the worktrees board)

**Literal text, in order:**

- “yard” — color `#e0b56a`, monospace, 13px
- “›” — color `#6b5a40`, monospace, 13px
- “worktrees” — color `#f4e3c0`, monospace, 13px
- “nola-photos” — color `#e0b56a`, monospace, 13px
- “session · 212 MB” — color `#a89272`, monospace, 13px
- “nola-old” — color `#e0b56a`, monospace, 13px
- “no session · 540 MB” — color `#ff9a6a`, monospace, 13px


### M2 — Disk

**Rule (verbatim):** One figure for what can be taken back.

**Belongs:** a sub-board (the worktrees board)

**Literal text, in order:**

- “1.9 GB in 6 worktrees” — color `#dcc8a0`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “1.2 GB reclaimable” — color `#e0b56a`, monospace, 13px


### M3 — Cleaning, one or many

**Rule (verbatim):** Selecting is the thatch fill; the action names the total.

**Belongs:** a sub-board (the worktrees board, with its confirm on the input line)

**Literal text, in order:**

- “nola-old” — color `#482510`, monospace, 13px
- “csv-import-old” — color `#482510`, monospace, 13px
- “nola-photos” — color `#e0b56a`, monospace, 13px
- “remove 2 · 780 MB” — color `#e0b56a`, monospace, 13px
- “press again — 2 worktrees, nothing unpushed” — color `#e0b56a`, monospace, 13px


### M4 — Moved or stuck

**Rule (verbatim):** *(no rule text printed under this crop)*

**Belongs:** a sub-board (the worktrees board)

**Literal text, in order:**

- “nola-old · locked” — color `#e0735a`, monospace, 13px
- “unlock” — color `#e0b56a`, monospace, 13px
- “csv-import · path moved” — color `#e0735a`, monospace, 13px
- “prune” — color `#e0b56a`, monospace, 13px


### M5 — Live, last-known, offline

**Rule (verbatim):** Everything on a board is live unless it says otherwise.

**Belongs:** a sub-board (any board reading a host that is not live)

**Literal text, in order:**

- “as of 6m ago · host offline” — color `#a89272`, monospace, 13px
- “try again” — color `#e0b56a`, monospace, 13px


### M6 — Dev servers

**Rule (verbatim):** URLs are gold and open the browser.

**Belongs:** a sub-board (the dev servers board)

**Literal text, in order:**

- “running” — color `#a8c469`, monospace, 13px
- “localhost:5173” — color `#e0b56a`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “stop” — color `#e0b56a`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “restart” — color `#e0b56a`, monospace, 13px
- “stopped” — color `#a89272`, monospace, 13px
- “storybook” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “start” — color `#e0b56a`, monospace, 13px
- “forward a port” — color `#e0b56a`, monospace, 13px


### M7 — Scheduled runs

**Rule (verbatim):** A run that happens while nobody watches leaves a note on the gatepost when it finishes.

**Belongs:** a sub-board (the scheduled runs board) / gatepost note when it finishes unwatched

**Literal text, in order:**

- “nightly-check” — color `#e0b56a`, monospace, 13px
- “every day 02:00” — color `#a89272`, monospace, 13px
- “last run passed” — color `#a8c469`, monospace, 13px
- “6h ago” — color `#a89272`, monospace, 13px
- “running now · 2m” — color `#f4e3c0`, monospace, 13px
- “unwatched” — color `#a89272`, monospace, 13px


## N · Getting around

*5 crops.*


### N1 — The rail, by number

**Rule (verbatim):** ⌘1–9 jump to the lanterns in rail order. The number shows beside the name only while ⌘ is held.

**Belongs:** lantern rail

**Literal text, in order:**

- IMAGE: `assets/p-lantern-on.png`, 22×38px
- “1 nola-photos” (padded with literal spaces for column alignment, `white-space:pre`) — color `#ffdca4`, monospace, 13px
- IMAGE: `assets/p-lantern-on.png`, 22×38px, animation `cv-flicker 480ms steps(2,end) infinite alternate`
- “2 new-source” (padded with literal spaces for column alignment, `white-space:pre`) — color `#ff9a6a`, monospace, 13px


### N2 — The finder

**Rule (verbatim):** ⌘K. Narrows to this project by default; one press widens to the island.

**Belongs:** input line (the ⌘K finder overlay)

**Literal text, in order:**

- “› photos” — color `#ab9470`, handwriting, 20px
- “nola-photos” — color `#e0b56a`, monospace, 13px
- “session” — color `#a89272`, monospace, 13px
- “photos/” — color `#e0b56a`, monospace, 13px
- “folder” — color `#a89272`, monospace, 13px
- “search the whole island” — color `#e0b56a`, monospace, 13px


### N3 — Back and forward

**Rule (verbatim):** ⌘[ and ⌘]. Same ladder as the trail, but through time.

**Belongs:** header / trail

**Literal text, in order:**

- “‹ nola.md” — color `#e0b56a`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “3f2a91c ›” — color `#e0b56a`, monospace, 13px


### N4 — Reopening onto the last district

**Rule (verbatim):** The app starts where it stopped. No splash, no home.

**Belongs:** the whole frame (app launch)

**Literal text, in order:**

- “opens New Orleans · nola-photos · nola.md” — color `#a89272`, monospace, 13px


### N5 — Something finishing elsewhere

**Rule (verbatim):** Another district: its lantern on the island edge flickers. Another app: the dock icon and one system notification, nothing more.

**Belongs:** lantern rail (another district) or the OS chrome (another app)

**Literal text, in order:**

- IMAGE: `assets/p-lantern-on.png`, 22×38px, animation `cv-flicker 480ms steps(2,end) infinite alternate`
- “Harbor · wants you” — color `#ff9a6a`, monospace, 13px
- “one notification · no sound” — color `#a89272`, monospace, 13px


## P · The line you write on

*10 crops.* One place to write in the whole app.


### P2 — Six empty prompts

**Rule (verbatim):** The placeholder always says what return will do.

**Belongs:** input line

**Literal text, in order:**

- “› start something new” — color `#ab9470`, handwriting, 20px
- “› say the next thing” — color `#ab9470`, handwriting, 20px
- “› name the branch” — color `#ab9470`, handwriting, 20px
- “› write the commit message” — color `#ab9470`, handwriting, 20px
- “› find a file” — color `#ab9470`, handwriting, 20px
- “› rename nola.md” — color `#ab9470`, handwriting, 20px


### P3 — Typing

**Rule (verbatim):** Nothing above the line moves while you type.

**Belongs:** input line

**Literal text, in order:**

- “› pull the dish photos off each restaurant’s” — color `#ab9470`, handwriting, 20px
- “board above: unchanged” — color `#a89272`, monospace, 13px


### P4 — Past one line

**Rule (verbatim):** The line wraps upward to four lines, then scrolls inside itself. The board does not move.

**Belongs:** input line

**Literal text, in order:**

- “› pull the dish photos off each restaurant’s own site rather than stock, and if a place has none, say so on the page instead of guessing” — color `#ab9470`, handwriting, 20px


### P5 — Return sends

**Rule (verbatim):** *(no rule text printed under this crop)*

**Belongs:** input line

**Literal text, in order:**

- “return” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “sends” — color `#a89272`, monospace, 13px
- “shift return” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “breaks the line” — color `#a89272`, monospace, 13px


### P6 — Deleting and moving

**Rule (verbatim):** Standard text keys. Selection exists and is thatch fill.

**Belongs:** input line

**Literal text, in order:**

- “⌥⌫” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “word” — color `#a89272`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “⌘⌫” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “line” — color `#a89272`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “⌘← →” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “ends” — color `#a89272`, monospace, 13px
- “dish photos” — color `#482510`, handwriting, 20px


### P7 — Paste

**Rule (verbatim):** A path becomes gold and pressable. An image waits beside the line as a small print.

**Belongs:** input line

**Literal text, in order:**

- “› look at” — color `#ab9470`, handwriting, 20px
- “~/Desktop/menu.pdf” — color `#e0b56a`, handwriting, 20px
- IMAGE: `assets/p-billboard.png`, 32×26px, filter `brightness(1)`
- “screenshot.png · 1 image with this message” — color `#a89272`, monospace, 13px


### P8 — Escape twice

**Rule (verbatim):** First clears the line. Second backs out one level.

**Belongs:** input line

**Literal text, in order:**

- “text on the line” — color `#dcc8a0`, monospace, 13px
- “→” — color `#6b5a40`, monospace, 13px
- “empty line” — color `#a89272`, monospace, 13px
- “→” — color `#6b5a40`, monospace, 13px
- “back to the yard” — color `#a89272`, monospace, 13px


### P9 — Undo

**Rule (verbatim):** ⌘Z on the line restores what you cleared, including after Esc.

**Belongs:** input line

**Literal text, in order:**

- “⌘Z” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “restores “pull the dish photos…”” — color `#a89272`, monospace, 13px


### P10 — Focus lost and regained

**Rule (verbatim):** The cursor stops blinking and dims when the window is not focused. That is the only signal.

**Belongs:** input line

**Literal text, in order:**

- “› say the next thing” — color `#ab9470`, handwriting, 20px
- “unfocused: cursor solid, stone” — color `#a89272`, monospace, 13px


### P11 — The board rewriting underneath

**Rule (verbatim):** Whatever changes above, the line keeps every character and the cursor stays put.

**Belongs:** input line

**Literal text, in order:**

- “12 new lines arrived above” — color `#a89272`, monospace, 13px
- “› pull the dish ph” — color `#ab9470`, handwriting, 20px


## Q · The two overlays

*6 crops.* Slash for commands, @ for the checkout. Both grow upward from the line.


### Q1 — Slash, narrowing

**Rule (verbatim):** *(no rule text printed under this crop)*

**Belongs:** input line (slash overlay)

**Literal text, in order:**

- “/commit” — color `#482510`, monospace, 13px
- “/compact” — color `#e0b56a`, monospace, 13px
- “/clear” — color `#e0b56a`, monospace, 13px
- “› /co” — color `#ab9470`, handwriting, 20px


### Q2 — @ over the checkout

**Rule (verbatim):** *(no rule text printed under this crop)*

**Belongs:** input line (@ overlay)

**Literal text, in order:**

- “nola.md” — color `#482510`, monospace, 13px
- “nola-plan.md” — color `#e0b56a`, monospace, 13px
- “photos/” — color `#e0b56a`, monospace, 13px
- “› check @no” — color `#ab9470`, handwriting, 20px


### Q3 — Grows from the line

**Rule (verbatim):** Upward, never covering the line itself or the gatepost.

**Belongs:** input line (overlay growth direction)

**Literal text, in order:**

- “overlay grows up · max 8 rows · then scrolls” — color `#a89272`, monospace, 13px


### Q4 — No match, still loading

**Rule (verbatim):** *(no rule text printed under this crop)*

**Belongs:** input line (overlay)

**Literal text, in order:**

- “nothing called /deploy” — color `#a89272`, monospace, 13px
- “reading the checkout · 1,204 files” — color `#f4e3c0`, monospace, 13px


### Q5 — Mouse and keys

**Rule (verbatim):** Hover lightens one step, same as any gold. Arrows move the fill.

**Belongs:** input line (overlay)

**Literal text, in order:**

- “/commit” — color `#482510`, monospace, 13px
- “/compact” — color `#f0cf8a`, monospace, 13px
- “/clear” — color `#e0b56a`, monospace, 13px


### Q6 — Village commands vs. the agent’s

**Rule (verbatim):** Village commands first, in gold. The agent’s own come after a rule, in gold with its name.

**Belongs:** input line (overlay)

**Literal text, in order:**

- “/commit” — color `#e0b56a`, monospace, 13px
- “/push” — color `#e0b56a`, monospace, 13px
- “/review” — color `#e0b56a`, monospace, 13px
- “claude” — color `#a89272`, monospace, 13px
- “/init” — color `#e0b56a`, monospace, 13px
- “claude” — color `#a89272`, monospace, 13px


## R · Pressing things

*2 crops.* The rules sheet covers R1–R3 and R5 on thesub-board page.


### R4 — Looks pressable, is not

**Rule (verbatim):** Gold is withheld from anything that does nothing. A path in a thought is stone unless it leads somewhere.

**Belongs:** thinking column (a path named in a thought) vs. made/did column (a path in the cart)

**Literal text, in order:**

- “nola.md” — color `#a89272`, monospace, 13px
- “in a thought: not pressable” — color `#a89272`, monospace, 13px
- “nola.md” — color `#e0b56a`, monospace, 13px
- “in the cart: opens it” — color `#a89272`, monospace, 13px


### R6 — Right-click

**Rule (verbatim):** Same actions as the gold words on that line, in the same order, as a small list on the wood. Nothing extra is hidden there.

**Belongs:** wherever a gold word already sits (context menu mirrors the line it is pressed on)

**Literal text, in order:**

- “open” — color `#e0b56a`, monospace, 13px
- “show changes” — color `#e0b56a`, monospace, 13px
- “copy path” — color `#e0b56a`, monospace, 13px
- “throw away changes” — color `#e0b56a`, monospace, 13px


## S · The keyboard

*8 crops.*


### S1 — Walking the pressable lines

**Rule (verbatim):** Tab walks gold words in reading order. Focus is a 2px outline-brown square, offset 2px.

**Belongs:** whole frame (Tab focus ring, shown here on the checkout sub-board)

**Literal text, in order:**

- “push 6” — color `#e0b56a`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “pull 2” — color `#e0b56a`, monospace, 13px


### S2 — Escape’s order

**Rule (verbatim):** Always the same ladder.

**Belongs:** whole frame (Escape ladder)

**Literal text, in order:**

- “overlay → line text → sub-board → session → district → island” — color `#a89272`, monospace, 13px


### S3 — Tab

**Rule (verbatim):** Walks gold. Shift-tab walks back. Nothing else.

**Belongs:** whole frame (Tab/Shift-Tab)

**Literal text, in order:**

- “tab” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “next gold word” — color `#a89272`, monospace, 13px
- “⇧tab” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “previous” — color `#a89272`, monospace, 13px


### S4 — Page, home, end

**Rule (verbatim):** *(no rule text printed under this crop)*

**Belongs:** thinking column (Page/Home/End)

**Literal text, in order:**

- “page ↑ ↓” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “a screen of thinking” — color `#a89272`, monospace, 13px
- “home end” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “first and live edge” — color `#a89272`, monospace, 13px


### S5 — The chords

**Rule (verbatim):** *(no rule text printed under this crop)*

**Belongs:** whole frame (global chords)

**Literal text, in order:**

- “⌘N” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “start” — color `#a89272`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “⌘K” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “find” — color `#a89272`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “⌘R” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “rename” — color `#a89272`, monospace, 13px
- “⌘.” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “stop it” — color `#a89272`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “⌘[ ⌘]” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “back, forward” — color `#a89272`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “⌘1–9” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “rail” — color `#a89272`, monospace, 13px


### S6 — A chord fired mid-word

**Rule (verbatim):** Chords never type. The half-word on the line is kept.

**Belongs:** input line (chord fired while typing)

**Literal text, in order:**

- “› pull the dis” — color `#ab9470`, handwriting, 20px
- “⌘K opened the finder · line untouched” — color `#a89272`, monospace, 13px


### S7 — Rebinding

**Rule (verbatim):** In settings, read like the rest of the file.

**Belongs:** a sub-board (the settings board, key rebinding)

**Literal text, in order:**

- “start a session” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “⌘N” — color `#e0b56a`, monospace, 13px
- “find” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “⌘K” — color `#e0b56a`, monospace, 13px


### S8 — Discoverability

**Rule (verbatim):** Holding ⌘ for half a second writes each chord beside what it does, in stone. Nothing announces itself otherwise.

**Belongs:** whole frame (⌘ held down annotates gold words everywhere)

**Literal text, in order:**

- “push 6” — color `#e0b56a`, monospace, 13px
- “⌘P” — color `#a89272`, monospace, 13px
- “new session” — color `#e0b56a`, monospace, 13px
- “⌘N” — color `#a89272`, monospace, 13px


## T · Scrolling

*6 crops.*


### T1 — How it scrolls

**Rule (verbatim):** Whole-pixel steps, no scrollbar. Position is a single stone line at the right edge while moving.

**Belongs:** thinking column

**Literal text, in order:**

- “thinking column · 38 notes · you are at 12” — color `#a89272`, monospace, 13px


### T2 — Hard stop

**Rule (verbatim):** No momentum, no rubber-band. The list stops at its end.

**Belongs:** thinking column

**Literal text, in order:**

- “stops dead at the first note” — color `#a89272`, monospace, 13px


### T3 — Pinned to the live edge

**Rule (verbatim):** Reading history lets go of the edge. Scrolling back to the bottom takes it again.

**Belongs:** thinking column

**Literal text, in order:**

- “pinned” — color `#a89272`, monospace, 13px
- “→” — color `#6b5a40`, monospace, 13px
- “reading 2h ago” — color `#a89272`, monospace, 13px
- “→” — color `#6b5a40`, monospace, 13px
- “pinned” — color `#a89272`, monospace, 13px


### T4 — Arrives while you read

**Rule (verbatim):** New thoughts do not pull you down. A count sits at the bottom of the column.

**Belongs:** thinking column

**Literal text, in order:**

- “3 new below” — color `#e0b56a`, monospace, 13px


### T5 — Jump to the bottom

**Rule (verbatim):** The count is the jump.

**Belongs:** thinking column

**Literal text, in order:**

- “3 new below” — color `#e0b56a`, monospace, 13px
- “or End” — color `#a89272`, monospace, 13px


### T6 — Back from a sub-board

**Rule (verbatim):** The yard is where you left it, scroll and all.

**Belongs:** the yard patch (sub-board scroll position on return)

**Literal text, in order:**

- “returns to note 12 of 38” — color `#a89272`, monospace, 13px


## U · Motion and time

*8 crops.* Stepped, 80–240ms, whole pixels. No springs, no fades, no spinner.


### U1 — Board arriving and leaving

**Rule (verbatim):** The yard dims in 2 steps, 120ms. The reading steps in top to bottom. Leaving is the reverse.

**Belongs:** the whole frame (yard dimming, board reading stepping in)

**Literal text, in order:**

- “yard lit” — color `#a89272`, monospace, 13px
- “→” — color `#6b5a40`, monospace, 13px
- “yard .5” — color `#a89272`, monospace, 13px
- “→” — color `#6b5a40`, monospace, 13px
- “silhouettes + reading” — color `#a89272`, monospace, 13px


### U2 — Board changing what it shows

**Rule (verbatim):** A cut. Only the trail steps.

**Belongs:** the whole frame (trail cut between boards)

**Literal text, in order:**

- “yard” — color `#e0b56a`, monospace, 13px
- “›” — color `#6b5a40`, monospace, 13px
- “nola.md” — color `#f4e3c0`, monospace, 13px
- “→” — color `#6b5a40`, monospace, 13px
- “yard” — color `#e0b56a`, monospace, 13px
- “›” — color `#6b5a40`, monospace, 13px
- “changes” — color `#f4e3c0`, monospace, 13px


### U3 — Rows appearing and reordering

**Rule (verbatim):** New lanterns drop onto the beam 4px at a time. A reorder is two cuts, not a slide.

**Belongs:** lantern rail

**Literal text, in order:**

- “cord” — color `#6b5a40`, monospace, 13px
- “→” — color `#6b5a40`, monospace, 13px
- IMAGE: `assets/p-lantern-off.png`, 22×38px, filter `brightness(.75)`
- “→” — color `#6b5a40`, monospace, 13px
- IMAGE: `assets/p-lantern-on.png`, 22×38px


### U4 — Agent text streaming

**Rule (verbatim):** A word at a time, never a character. The live thought grows downward; nothing above moves.

**Belongs:** thinking column

**Literal text, in order:**

- “Pulling each dish photo off the” — color `#ffdca4`, serif thinking, 19px


### U5 — Anything that spins

**Rule (verbatim):** There is no spinner. Waiting is a counter in seconds, or a fire.

**Belongs:** gatepost / the yard patch (fire) — no spinner anywhere

**Literal text, in order:**

- “pushing · 12s” — color `#f4e3c0`, monospace, 13px
- IMAGE: `assets/p-campfire.png`, 46×32px, filter `brightness(1)`
- “the fire is the only thing that moves while it thinks” — color `#a89272`, monospace, 13px


### U6 — Measurable progress

**Rule (verbatim):** Discrete blocks, never a smooth bar.

**Belongs:** gatepost (context meter)

**Literal text, in order:**

- “context 68%” — color `#a89272`, monospace, 13px


### U7 — Everything that pulses

**Rule (verbatim):** Only three things ever move on their own: the fire, a lantern that wants you, and the cursor.

**Belongs:** the yard patch (fire) and lantern rail (wants-you lantern) and input line (cursor)

**Content:** no literal text — image(s) only:

- IMAGE: `assets/p-campfire.png`, 46×32px, filter `brightness(1)`
- IMAGE: `assets/p-lantern-on.png`, 22×38px, animation `cv-flicker 480ms steps(2,end) infinite alternate`


### U8 — Frame budget

**Rule (verbatim):** The world draws at 8 fps behind everything. The board redraws only on change.

**Belongs:** the whole frame (world vs. board redraw budgets)

**Literal text, in order:**

- “world” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “8 fps · stepped” — color `#a89272`, monospace, 13px
- “board” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “on change only” — color `#a89272`, monospace, 13px


## V · Feedback

*2 crops.* V1–V3 and V6 are on therules sheet.


### V4 — Finished in another district

**Rule (verbatim):** Its lantern on the island edge flickers. The board you are on does not change.

**Belongs:** lantern rail (seen from elsewhere)

**Literal text, in order:**

- IMAGE: `assets/p-lantern-on.png`, 22×38px, animation `cv-flicker 480ms steps(2,end) infinite alternate`
- “Harbor · finished · wants you” — color `#ff9a6a`, monospace, 13px


### V5 — Finished while unfocused

**Rule (verbatim):** One system notification with the first line of what it said. The dock icon holds a count.

**Belongs:** the whole frame / OS notification

**Literal text, in order:**

- “New Orleans · “Published. Three need booking.”” — color `#a89272`, monospace, 13px


## W · Getting things out

*4 crops.* No selection outside the line, so copying is a press.


### W1 — Copying a block

**Rule (verbatim):** Hovering a thought or a code block shows copy in gold at its top right.

**Belongs:** thinking column (a thought) or made/did column (a code block)

**Literal text, in order:**

- “Pulling each dish photo…” — color `#dcc8a0`, serif thinking, 16px
- “copy” — color `#e0b56a`, monospace, 13px


### W2 — Copying a path, hash, URL

**Rule (verbatim):** Right-click any gold identifier; copy is always first.

**Belongs:** made/did column or gatepost (any gold identifier, e.g. a commit hash)

**Literal text, in order:**

- “3f2a91c” — color `#e0b56a`, monospace, 13px
- “copied” — color `#a89272`, monospace, 13px


### W3 — Links out

**Rule (verbatim):** URLs are gold and open the browser. The feedback is the word itself, once.

**Belongs:** made/did column (a dev-server URL)

**Literal text, in order:**

- “localhost:5173” — color `#e0b56a`, monospace, 13px
- “opened” — color `#a89272`, monospace, 13px


### W4 — Dragging a file off

**Rule (verbatim):** Any gold file can be dragged out. What you hold is its sprite.

**Belongs:** made/did column (a file dragged out by its sprite)

**Literal text, in order:**

- IMAGE: `assets/p-crate.png`, 32×46px, filter `brightness(1)`
- “candidates.json” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px


## X · Drag and drop onto it

*4 crops.*


### X1 — A picture on a session

**Rule (verbatim):** It waits beside the line as a print and goes with the next message.

**Belongs:** input line

**Literal text, in order:**

- IMAGE: `assets/p-billboard.png`, 32×26px, filter `brightness(1)`
- “menu.jpg · goes with your next message” — color `#a89272`, monospace, 13px
- “› what is this dish?” — color `#ab9470`, handwriting, 20px


### X2 — Any other file

**Rule (verbatim):** Its path is written onto the line.

**Belongs:** input line

**Literal text, in order:**

- “› look at” — color `#ab9470`, handwriting, 20px
- “~/Downloads/hours.csv” — color `#e0b56a`, handwriting, 20px


### X3 — A folder on the island

**Rule (verbatim):** Founds a project on cleared ground where you drop it.

**Belongs:** the yard/island (founding a project on dropped ground)

**Literal text, in order:**

- IMAGE: `assets/p-sign.png`, 30×41px, filter `brightness(1)`
- “Plot surveyed. Nothing built yet.” — color `#a89272`, monospace, 13px


### X4 — While something is over it

**Rule (verbatim):** The place it will land lightens one step. Nothing else changes.

**Belongs:** input line

**Literal text, in order:**

- “the line brightens · the rest stays” — color `#a89272`, monospace, 13px


## Y · Density and sound

*5 crops.* Y1 is on therules sheet.


### Y2 — The gutter marks

**Rule (verbatim):** The whole vocabulary. Nothing else sits in a gutter.

**Belongs:** made/did column (the diff gutter)

**Literal text, in order:**

- “+” (padded with literal spaces for column alignment, `white-space:pre`) — color `#a8c469`, monospace, 13px
- “added” — color `#a89272`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “−” (padded with literal spaces for column alignment, `white-space:pre`) — color `#e0735a`, monospace, 13px
- “removed” — color `#a89272`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “M” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “changed” — color `#a89272`, monospace, 13px
- “·” — color `#6b5a40`, monospace, 13px
- “▸” (padded with literal spaces for column alignment, `white-space:pre`) — color `#a89272`, monospace, 13px
- “more, collapsed” — color `#a89272`, monospace, 13px


### Y3 — Line height, gap, indent

**Rule (verbatim):** 4px grid throughout.

**Belongs:** the whole frame (type and spacing grid)

**Literal text, in order:**

- “body” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “14 / 1.45” — color `#a89272`, monospace, 13px
- “mono” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “13 / 1.5” — color `#a89272`, monospace, 13px
- “gap” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “8 · 12 · 24” — color `#a89272`, monospace, 13px
- “margin” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “40 from the frame edge” — color `#a89272`, monospace, 13px


### Y4 — Very wide, very short

**Rule (verbatim):** Wide: columns keep their widths and the yard gets the extra. Short, under 760px: the gatepost collapses to its newest note and the rail to lanterns only.

**Belongs:** the whole frame (responsive layout)

**Literal text, in order:**

- “≥ 1800” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “yard widens” — color `#a89272`, monospace, 13px
- “< 760 tall” (padded with literal spaces for column alignment, `white-space:pre`) — color `#dcc8a0`, monospace, 13px
- “gatepost → newest note · rail → lanterns” — color `#a89272`, monospace, 13px


### Y5 — Pixel alignment

**Rule (verbatim):** Every position lands on a whole pixel; sprites at 1× or 2× only. Anything else looks broken.

**Belongs:** the whole frame (pixel grid)

**Literal text, in order:**

- “✓ 1× 2×” (padded with literal spaces for column alignment, `white-space:pre`) — color `#a8c469`, monospace, 13px
- “✗ 1.5×” (padded with literal spaces for column alignment, `white-space:pre`) — color `#e0735a`, monospace, 13px


### Y6 — Sound

**Rule (verbatim):** Decided later. Until then every signal must work in silence, which this set does.

**Belongs:** the whole frame (sound, decided later)

**Literal text, in order:**

- “open” — color `#a89272`, monospace, 13px
