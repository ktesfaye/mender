# STATE — how far along Mender actually is

One file, one answer. When the question is "how much is left", this is what gets
read, and nothing else is allowed to answer it from memory.

`BUILD-CATALOG.md` is the inventory: every capability emdash has, 253 numbered
rows, plus the phases and the art list. It says what could exist. **This file
says what does.** Every ledger row carries a state and, if it isn't finished, the
wave it belongs to.

**The rule that keeps this honest: any commit that changes what the app can do
updates this file in the same commit.** A row moves to `done` only after the
change has been driven in the running app and looked at, never because the code
compiles. If that feels like friction, it is the friction that this document
exists to buy: without it, progress gets reported from whatever list happened to
be in the last conversation, which is how a week's worth of small asks got
mistaken for the build.

## Where it is, in one paragraph

The village is real and so is the back end. The island draws, grows, pans and
opens; a project is a district; a session is its own worktree with a real Claude
agent in it that resumes across restarts; a project's board lists its sessions
and starts new ones; a slash on the line reaches Claude's own commands and skills
and sets the model, mode and effort of the running session; and the card behind
`/agent` shows what that session works with. That is roughly the first three
phases of the catalog, which is all plumbing, camera and board.

It answers to the keyboard now: a chord for everything you do often, a finder
over every session and project, arrows that walk any board, and it reopens where
you left it. A session reads like a conversation: what a command printed, what an
edit changed, what it means to do next, what you said while it was busy, and how
much room it has left to think in are all on the wood, the markdown an agent
writes in is read rather than shown, and when it comes to the door to ask
something a number key answers it.

And a whole day's work can now be done without leaving it. A change is read on
the wood and thrown away from there, a commit is written and read, a branch goes
up and comes down, and a pull request is opened, watched and put in. The
checkout is a place you walk into: its folders, its files read and edited a line
at a time, who last touched them, and both kinds of looking for something.
There is a real shell in it that outlives the window. A session is taken down
from its card and a project forgotten from its board, each saying what it costs
first. An agent who is not on this machine is brought here. And it packages: a
Mender.app that runs out of the Applications folder with the whole village
behind it.

And the island is the artist's own. The growth model is gone: the five-stage
pipeline, the per-stage footprints, the world file it baked and the three
thousand lines of composer behind it are all deleted, and what draws now is his
`base-layout.json` untouched plus his own partition of it into thirteen places,
switched on one at a time. The order they come on in is measured off that
partition rather than chosen, so every state is one piece of land walked to from
the fire and as round as the geography allows; the camp and the islet are always
there, and the islet sails its bridge to whatever coast exists. Every state the
app can reach was composed in both this app and `world/his.py` and compared tile
for tile: identical, mooring and all.

Of the 253 ledger rows: 54 done, 22 partly done, 34 inherited working from
emdash's back end and needing no village surface, 43 deliberately cut, and
**100 not started**.

What is still genuinely missing: the settings island and everything that would
live on it, other machines over SSH, work that runs itself, and the wave that
makes the island say from the water who is working and who is stuck.

## What "not started" actually means

Every one of those 160 rows already works underneath. Emdash's back end is kept
whole and it is the engine: staging, unstaging, reverting and committing are
mutations on a live checkout model; push, pull, publish, fetch, the log, a
commit's files and blame are all procedures we can call today; so are the
terminal, the file tree, both searches, pull requests, issues, MCP, skills,
machines over SSH, settings and the updater. Forty-odd domain contracts, none of
which import Electron or React, all of them registered and running in Mender
right now.

So "not started" almost never means the capability doesn't exist. It means
there is no way to reach it in a village: nothing to press, nowhere for it to
appear on the wood, and in most cases no decision yet about what pressing it
should look like. That is the work. It is real work, and it is a different
shape from writing a git client.

The exceptions, where we genuinely are building the thing itself and not just
its surface: the board and everything drawn on it, the island and its rules, the
villagers, and the transcript renderer, because emdash's is React and we deleted
it. Those are ours from nothing.

## How to read the states

| | |
|---|---|
| `done` | You can do it in the running app. Verified by driving it, not by reading the code. |
| `part` | Some of it works and the rest is named in the wave. |
| `kept` | Emdash's back end already does it and it needs no village surface. Not work. |
| `cut` | Deliberately not built, because the village answers it another way. Recorded so it doesn't creep back. |
| blank | Not started. |

## Built, and broken

Found by auditing every line of the app against what it claims to do. These are
not missing features, they are things that exist and are wrong, which makes them
worse. Struck-through ones are fixed.

- ~~**Renaming a session cannot be reached.**~~ Fixed in W1: it is a doing with
  its own key rather than a condition that could never be true.
- **Nothing abandons anything.** Abandoning a project and abandoning a session
  are both implemented end to end, worktree deletion included, and neither is
  called from anywhere in the front end. (W7.)
- ~~**Arrow keys do two things at once.**~~ Fixed in W1: there is now exactly
  one key listener in the app and everything reads keys through it, in an order.
- ~~**Escape throws away what you are writing.**~~ Fixed in W1: it clears a
  half-written name or search first, and only backs out on the second press.
- **Clicking empty land looks pressable and isn't.** Bare plots glow under the
  pointer exactly like a founded district, then do nothing at all when clicked.
  No message, no reason. (W7.)
- ~~**The card is mouse-only.**~~ Fixed in W1, and more generally: every board
  is a list of pressable lines, the arrows walk any of them and return picks.
- ~~**The permission question has never been seen.**~~ Fixed in W2: it fires,
  it lands on the wood, and a number key answers it. It had never been seen
  because this machine's Claude answers its own permission questions; setting a
  session to ask first, through `/mode`, is what forced it. What it is asking
  about is now said the way somebody standing in that checkout would say it,
  rather than as the whole path from the root of the disk.

## The waves

Ordered by what you can open and judge at the end of each one, not by
architectural layer. Art is never a gate: anything blocked on a commission gets
a plain stand-in and ships anyway.

### W1 — it answers to the keyboard · mostly done

Command and a letter now means something: T starts a session, K opens the
finder, I turns a session's board over, R renames it, N founds a project, W
backs out, the brackets go back and forward, and a number goes to that project
on the rail. The finder lists every session, project and doing, narrowing as you
type. The arrows walk any board's pressable lines and return picks one. There is
one key listener in the whole app. The app reopens on whatever you last had
open.

Left in it: rebinding, and the conflict model that goes with it, which needs
somewhere to live and so waits for the settings island in W8. Filename search
(FS-15) waits for files in W5, since there is nothing to search yet. Shift and
return for a newline (AG-53) still needs the line to hold more than one.

Closed UI-17, UI-18, UI-21, UI-22, UI-23, UI-25, WS-21, and four of the seven
broken things above: the arrow collision, Escape eating a draft, the rename
nobody could reach and the mouse-only card. Still open in it: UI-26 and ST-33
(the chord table exists, rebinding and conflicts do not), ST-08 and FS-15 and
AG-53 as above, and the driven harness over the real feature set (B6-03), which
is the next thing in this wave.

### W2 — a session reads like a real conversation · started

The transcript no longer throws things away. What a command printed, what an
edit actually changed, and work done inside other work all come across and are
written on the wood: a line with something under it wears an arrow, pressing it
opens it, and a file change reads as the lines that changed and nothing else.
Paths are said the way somebody standing in that checkout would say them.

One thing built and unverified: thinking. The line is written and the runtime
maps it, but Claude's own CLI has never once sent a thought over the protocol
here, at any effort setting, so nothing has ever rendered. It stays `part` until
a real thought lands on the board.

The board now says what is coming as well as what happened. What it means to do
next is written under the transcript and above the line you write on, marked for
behind them, under their hands, and still ahead. How much room it has left to
think in is a bar under that, because nothing warns an agent when it is running
out and the conversation just quietly starts losing its own beginning. Anything
said while somebody is busy waits in the open where you can see it and take it
back before it is heard. And a reply broken into pieces by the protocol is drawn
as one thing said, rather than with a hole in the middle of the sentence.

The permission question fires. It had never been seen because this machine's
Claude answers its own; setting a session to ask first is what forced it, and the
question, the three answers and the number keys all work on the wood.

Two things are built and unverified, for the same reason both times: Claude never
sends them. Thinking has never crossed the protocol here at any effort. The plan
only ever comes from the agent's own task tools, and this Claude has neither a
todo tool nor the task tools in an ACP session, so it has never published one.
Both were driven with real data of the right shape and looked at before being
written down as `part`; neither is claimed as working.

Waking every session at boot was dropped on purpose. Opening a session starts it,
which is what `MENDER.md` says, and spawning a CLI for every session the moment
the app opens costs a process each for nothing: a session that was working when
you quit does not survive the quit anyway. A session comes back resting, lit, and
wakes when you walk in.

Markdown is read rather than shown. Agents write in it whether or not anybody
asked, and the board was drawing the asterisks and backticks and hashes instead
of the shape they were meant to make. There is one typeface at one size here and
no second weight, so nothing is set in bold; what the board has instead is the
gutter, the indent, the gap and the tone, and those carry headings, lists,
quotes, rules and code perfectly well. A heading is set in capitals with air
above it, which is what a heading was before anybody had two weights to choose
from. Something quoted exactly — a name, a path, a flag — is written cool against
the wood so it reads as a thing rather than a word, and it keeps that across a
line break. A table is measured and padded into real columns, because markdown
tables are written by hand and almost never line up in the source. Emphasis loses
its marks and keeps its words, which is the right way round.

Diagrams moved to W9. A mermaid diagram is the one thing here with no answer
yet: a pan-and-zoom viewer is a second surface, which this app does not have, and
the village answer is to draw it on the wood in the same lines everything else is
drawn in. That is drawing, not wiring, so it goes with the rest of the drawing.

A file can be named on the line you write on. An @ turns the lines under it into
what is actually in that checkout, narrowing as you type, and picking one writes
the whole path where the @ was — name first and the folder after it, because a
checkout is full of files with the same name in different folders and written
whole they all truncate to the same middle of the same path. The index behind it
is emdash's file-search runtime, wired in here for the first time; asking is what
builds it, and the root is held open from the first question so the answer to the
second keystroke arrives before the third.

A picture dropped on the wood or pasted onto it is carried. It cannot be drawn
on the board, so what the board says is that you have it: it waits by the line
you are writing on, it goes with whatever you say next, and pressing it puts it
down. Handing one over with no words at all counts as something said, which is
the one place the empty-line rule bends. Afterwards the transcript says you
handed it over, because otherwise a picture leaves no trace of having gone.
Anything that is not a picture is refused out loud rather than silently, and
dropping one on the island says so too, since nothing out there has hands.

Anything else dropped on the wood is written on the line as where it is. A
picture is the only thing an agent can be shown, but a file has a path, and a
path is the one thing about a file you cannot say any other way: it lands on
the line you are writing on, quoted if it has a space in it, and goes with
whatever you say about it. Dragged from anywhere on this machine, not only from
the checkout.

A block of code comes off the board. It is the one thing written on the wood
that you want out of it and cannot retype, so pressing it puts it on the
clipboard and the village says it did; the whole block lights as one thing
rather than the row your hand landed on. It is reached by key as well as by
hand, because a line you can press and cannot walk to is only half there, and
fixing that turned out to fix the same hole under the carried pictures and the
session card, which the keyboard had never been able to press at all.

Somebody sent off to do something says what they were sent to do. The name on a
subagent is the tool's and it is the same word every time, so the board says the
errand instead, which the agent writes out itself, and the work done out there
is folded under it and opens. A command is said from inside the checkout it ran
in, like every other path on the board: an agent writes out the whole absolute
path because that is what it was handed, and forty characters of it are the same
forty characters every time, pushing the part you wanted off the end of the
line. One thing about it is not fixed: a restart loses the fold, because the
replay the agent sends back does not carry what happened inside a subagent.

Two things are cut on purpose. A resource link never arrives: neither CLI ever
sends one back, both of them turn a file reference into ordinary writing on the
way out, and the one place a link does appear is inside a tool call that already
says which file it read. And pinning what you asked to the top of the board
while you scroll is a panel floating over the wood, which is the thing this app
does not do; the question is directly above the answer, and scrolling back to it
is the honest way to see it again.

Nothing is left in W2 that this machine can reach. A thought and a plan are
built and have never rendered, because Claude has never sent either one over the
protocol at any setting, and naming an issue on the line waits for the trackers
in W4.

Closes AG-02, AG-13, AG-14, AG-20, AG-22 through AG-37, AG-39, AG-40, AG-43,
AG-45 through AG-51, UI-31, UI-43.

Done when: a full turn with tool calls, a diff, a thought and a plan reads
properly on the wood; nested subagents fold and unfold; you can stop a turn
mid-flight and queue the next thing behind it; an image dropped on the board
goes in as context; and a file or an issue can be named inline.

### W3 — you can finish a piece of work without a terminal · done

Today a session ends by leaving Mender. That is the single biggest hole.

A change is read on the wood. Pressing an uncommitted file on any checkout
board, a project's or a session's, turns the board into what changed in that
file: what went in reads warm, what came out reads sore, a few lines either
side are there to say where you are, and a long stretch nobody touched says how
many lines went by rather than making you scroll through them. Escape steps back
out onto the board you pressed it from, at the top, where you were.

The diff is ours and it is Myers', the same shortest-edit-script git itself
uses, so a moved line reads as a moved line rather than dragging the rest of the
function with it. It was checked against git's own output on real files in a
real checkout and comes out line for line the same, hunk boundaries and counts
included. A file that is not writing at all says so instead of drawing its
bytes.

A commit is written on the same wood. Under what is uncommitted there is a line
that says write a commit, and pressing it turns the board into what is about to
go in: every changed file, and a line at the bottom to say what it does. There
is no staging area here and no word for one. Everything goes in to begin with,
pressing a file holds it back, pressing it again puts it in, and nothing at all
happens to the checkout until return. Then what is held back leaves git's index,
the rest goes into it, and it is a commit; the board it came from says so a
moment later, because what was done in here is read again when the head moves.

Git's failures have their own words now, one sentence each, and where git's own
message is the useful part — a hook's complaint, a server's refusal — it is kept
inside the sentence rather than replaced.

And a branch goes up and comes down. Under the line saying where the checkout
stands are the things you can actually do about it right now: send a branch
nobody has seen anywhere yet, send the commits that have run ahead, and bring
down whatever is new. The last of those is always offered rather than only when
the board knows it is behind, because nothing here goes and asks the other end
what it has, so behind is only ever as true as the last time somebody looked and
bringing it down is what looking is.

All three were driven against a local bare repository rather than his own
remotes: a commit made on the board, sent up, a commit pushed in from elsewhere
and brought down, and a branch with no upstream published. Nothing was sent
anywhere outside this machine.

And a commit is read the same way a change is. The commits already listed at
the bottom of every checkout board are pressable now, and pressing one turns
the board into that commit: what it was for, whatever else was written under
it, who did it and when, whether anybody else has it yet, and the files it
moved with what went in and out of each. Pressing one of those files reads the
change that commit made to it, on the same board a working change is read on,
because a change is a change wherever you meet it and the only difference is
which two versions are being held up against each other. Escape steps back one
at a time, from the file onto the commit and from the commit onto the checkout.

Two things are taken off a commit message on the way to the wood, and the same
two everywhere a commit is written. The trailers at the bottom are filing, not
writing, and so is the `feat(scope):` at the front of a subject: what is left
is the sentence somebody wrote about what they did, which is both what you came
to read and what fits. Git's own hard wrapping inside a paragraph is undone
too, because wrapping writing that is already wrapped leaves every other line
half empty.

Blame is not in this: who last touched a line is a thing you ask of a file you
are reading, and there is still no way to read a file. It waits for W5.

A change can also be thrown away, and it is the only thing in the village that
asks twice. Reading an uncommitted file ends in a line that offers to put it
back the way it was, or to throw it away entirely when git has never seen it;
pressing that turns the line into what is about to stop existing, and only the
second press does it. Escape is the answer no. Nothing else here asks, because
nothing else here cannot be pressed again, and this one is off the machine
afterwards. There is deliberately no line that throws everything away at once:
each file is its own decision and the one-press version of that is the most
dangerous thing in git.

Both were driven: a line added to a tracked file, read on the board, put back,
and git agreeing the file was clean again; and an untracked file thrown away
and gone off the disk.

The counts on a commit were checked against git's own numbers on real commits
in this checkout, file by file and in total. A file a commit deleted comes back
from git as missing, the same as a file deleted in the working tree, so it
reads as gone; that is the one branch here confirmed at git rather than on the
board, since nothing in the village reaches back far enough to press one.

What is cut from this wave, and why. Every one of them is a shape emdash's
front end has and this one does not, so building them would be importing the
thing the fork exists to avoid.

A floating action card on a selection (WS-37) has nothing to float over: the
board is read, not selected, and what you can do about a change is a line at
the bottom of it. Preview against pinned diff tabs (WS-38) and a stacked
multi-file diff (FS-26) are both several diffs at once, and one board shows one
thing; you step into a file and escape back out, and the stack is the list you
came from. Prefetching diffs on hover (WS-39) presumes a pointer resting on a
row it has not pressed, and the board is walked as much by key as by hand.
A setting for whether changes list flat or as a tree (ST-15) is a layout
preference, and there are none here. A titlebar breadcrumb with a git popover
(UI-09) needs a titlebar. Diff stats and PR badges on sidebar rows (UI-39)
needs a sidebar; the counts live on the change and on the commit, which is
where you are when you want them.

Image diff (FS-27) is cut for the reason the board already gives: a picture is
never drawn on the wood, because the wood is writing. A changed image says it
changed and by how many bytes, and looking at it is a thing you do where images
are looked at.

Inline review comments on diff lines (FS-25, WS-44) are cut as a shape and not
as a capability. Telling an agent about a particular line is real and wanted;
doing it by threading notes into a diff gutter is a code-review tool's answer,
and the village already has a better one, which is that you write to the agent
on the line at the bottom of its board and an @ names the file. If pointing at
a specific line turns out to need more than that, it comes back as a way of
writing rather than a layer over the diff.

WS-35, the branch selector, moves to W8 with the rest of rebinding a session to
a different branch: which branch a checkout is on is a thing you change about a
session, not a thing you do while reading its changes.

Closes WS-29 through WS-31, WS-36, WS-40 through WS-42, FS-24, FS-28, UI-35.

Done when: you can read any diff on the board, throw a change away, write a
commit, push it, pull, publish a branch, read any commit and what it touched,
and every distinct git failure says its own distinct thing rather than
collapsing into one apology. All of that is true. Blame is the one thing named
in this wave that is not here, and it waits for a file being readable at all.

### W5 — you can read and edit the code · started

The checkout is a place you can walk into. The path under a project's or a
session's name is pressable, and pressing it puts what is actually in that
folder on the wood: its folders first with an arrow each, then its files. A
folder is walked into the same way a district is, escape walks back up one and
out of the checkout from the top. It is live, so a file an agent writes while
you are standing in the folder appears in it.

Pressing a file reads it: the whole thing on the wood in the writing everything
else is read in, with a line at the top saying how long it is. A file that is
not writing says how big it is instead of drawing its bytes, and one too large
for a board says so rather than half-drawing.

And a file is edited a line at a time, which is the village's answer to having
exactly one place you write. Pressing a line takes it into the writing: the
line turns to full ink with the cursor after it, you rewrite it where it sits
rather than at the bottom, and return writes the whole file back. Escape puts
it back the way it was. The write is pinned to what was read, so if anything
else changed the file in between nothing is written and the board says so
rather than quietly overwriting somebody.

The runtime under all of this is emdash's files runtime, which Mender was not
starting: it is now a worker like git and the search index, and it brings the
live folder, the live file and the etag-pinned write with it.

A checkout is also looked in rather than walked. At the top of the folder is a
line that says so, and pressing it turns the board into one question with one
line to write it on: where is the file called this. A line at the top switches
to the other question, where is this written, and takes what you have already
typed with it, because you rarely know which question you had until the first
one has come back empty. The answer to both is a list of files you press, with
the lines that matched under each when there are any, and pressing one reads
the file. Escape clears what you typed, then steps back to the folder.

Two things had to be true for that to be honest. An index that has not read the
checkout yet answers nothing, which is indistinguishable from nothing matching
and is a lie, so the question waits for the index instead and says it is still
reading. And nothing on this machine had a real ripgrep — only a shell function
of the same name — so searching inside files silently found nothing; ripgrep is
installed now and that is a host dependency, not a code change.

Walking into a checkout used to hang for half a minute on a repository with
node_modules in it, because the tree watches recursively and a checkout is
mostly things nobody put there. It now carries the same exclusions emdash's own
watcher uses.

A file is also made, renamed and thrown away. The folder you are standing in
offers to put something new in it and you name it on the line; a name ending in
a slash makes a folder, which is the only way to say which of the two you meant
without being asked twice. At the bottom of a file, under everything it says
because that is what you came for, are the two things you can do to the file
rather than to its writing: call it something else, and throw it away. Renaming
does not ask twice, because a name is put back by typing the old one. Throwing
away does.

All of it was driven end to end: a file made from the board and found on the
disk, appearing in the folder live; opened, renamed, and the folder showing the
new name without a reload; then found by name, opened again and thrown away,
gone from the disk.

Who last touched it is on the same board, under the same line that offers to
rename it. It is not a name in the margin of every line: writing is done in
runs, twelve lines somebody put in on a Tuesday and then four somebody else
changed since, so it says it once over the run with who, how long ago and what
they were doing. Escape goes back to reading the file rather than out of it.

Not here yet: reading an image or a table as anything other than the bytes it
is.

### W4 — you can ship it · started

A piece of work ends in the village now. Under where the checkout stands is a
line asking what is open for this branch, and pressing it goes and finds out:
what the pull request is for, which branch is going where, what has been
written about it, what the machines think of it, whether anybody has looked,
and the ways it can go in. Nothing is open yet says so and offers to open one,
and what you write on the line is what it is called.

What the checks say is a count rather than a list. Twenty green checks is one
fact and takes one line; the ones that failed are what you came to read and get
a line each, and anything still running says so. The same rule as the checkout
board applies to the actions: squashing, merging and rebasing only appear when
they are actually possible, and a draft offers to say it is ready instead.

Who the village is to GitHub is answered by asking the `gh` on this machine for
the token it already holds. Emdash keeps its own account store, its own
device-code flow and its own keychain entries, and the village wants none of
it: a second place to be signed in is a second place to be signed out of, and
anybody working here is already signed in to `gh`. Nothing is stored or written
down; the token is fetched when a request needs it.

The service underneath is emdash's and it is real: its own worker, its own
cache, its own sync. It lives in emdash's app rather than in a package, which
is only where it happens to sit — it imports neither Electron nor React and is
back end by every rule this fork has — so Mender reaches it through an
`@upstream` alias that says exactly which parts of that app are back end.

Driven in the running app as far as it honestly can be: the board asked GitHub
about this checkout's branch, authenticated through `gh`, and came back with
the right answer. Opening, merging and marking ready are wired and typed but
have not been driven, because driving them means opening a real pull request on
his GitHub and there is no branch here to open one from.

Not here yet: the pull request's own files and comments on the board, issues
and linking a session to one, and noticing a pull request somebody else opened
for a session's branch.

### W4 — the rest of shipping

Closes WS-43, WS-46 through WS-49, WS-54, WS-56, WS-57.

Done when: a session opens its own pull request, shows its checks, and merges,
and a session can be linked to an issue from at least the trackers you actually
use.

### W5 — you can read and edit the code

Closes FS-01, FS-03 through FS-14, FS-16, FS-17, FS-20 through FS-23, FS-30.

Done when: the board can show the tree, open a file, edit and save it, search by
name and by content, and render an image, a table or a drawing without handing
you a path to open somewhere else.

### W6 — there is a terminal in the village · started

There is a real shell on the wood. Under where the checkout stands is a line
that opens one, and what comes up is a zsh running in that checkout: you type
at the bottom of the board the way you type at anything else here, return hands
it the line, and what it says back is written above. It is the same board,
because a board already is a column of writing with one line at the bottom you
type into, which is what a terminal is.

It survives the app being killed. The shell lives in emdash's terminals runtime
in its own process, wrapped in tmux, so closing the window leaves it running
and opening the board again walks back into it with everything it had said
still there. That was driven: a command run, the app killed outright, the app
started again, the same scrollback.

Between the shell and the wood is a terminal screen, and it had to be written.
A terminal is not a stream of lines; it is a grid somebody writes on with a
cursor they move anywhere, and nearly everything worth running uses that — a
progress bar rewrites one line forty times, a pager paints a page, tmux
repaints whatever it thinks changed. Reading those bytes in order gave a board
that was completely blank, which is how this was found. So there is a grid now,
with a cursor, a scrolling region, erasures, insertions and an alternate screen
that a pager paints on and does not leave behind. Colour and weight are dropped
on purpose: the board has one typeface and two tones and is not going to grow
more. What is kept is everything that decides which character ends up where.

That means a full-screen program does draw — a pager, a picker — and it is
legible, but it is legible rather than usable, because there is no cursor on
the board to tell you where you are in it. A board is a board.

tmux was not on this machine either. Like ripgrep, that is a host dependency
rather than a code change, and it is installed.

Not here yet: more than one shell per checkout, a dev server's port being
noticed and offered, killing a shell from the board, and the shell knowing the
board's actual width.

Closes TR-01 through TR-04, TR-06, TR-09 through TR-12, UI-12, UI-40.

Done when: a real shell runs on the board, survives the app closing, and a dev
server it starts is reachable without you hunting for the port.

### W7 — a project is fully yours · started

A session can be taken down, which is the first thing in this app that removes
anything. It is at the bottom of the card, because the card is what that
session is and ending it is the last thing about it, and it takes two presses
like everything else here that cannot be pressed again.

Above the offer is what it would cost, worked out from the same live checkout
the board reads rather than computed once and left to go stale: how many files
in there nobody committed, and how far the branch has run ahead of whatever it
is following. A branch following nothing says that instead of a number, because
how much is on it cannot be counted from here and a guess printed as a fact is
the worst thing a preflight can do.

The branch outlives the building. What goes is the worktree the work happened
in; what was committed in it is still on the branch afterwards. That was
driven: a session started, its card read, taken down in two presses, the
worktree gone from git's list and the branch still there.

A project can be forgotten too, at the very bottom of its board under
everything it is, because forgetting a place is not something you should meet
on the way to the work in it. Two presses again, and the line in between says
what it costs: the folder stays exactly where it is, and every session cut from
it is taken down, because a project forgotten with its worktrees still on the
disk leaves them somewhere nothing in the village can reach.

The offer, the question and escaping out of it were driven. The second press
was not: founding a project to throw away needs the native folder picker, which
needs his hands, and forgetting his real one to prove it works is not a test.

Not here yet: cloning or creating a repository rather than pointing at one,
relinking, choosing how a worktree is cut, project settings, and a checkout's
trouble showing on the district.

### W7 — the rest of it

The largest wave, and the least glamorous. Everything about founding, naming,
configuring and disposing of projects and sessions.

Closes WS-02 through WS-11, WS-13 through WS-15, WS-19, WS-20, WS-22 through
WS-28, WS-52, ST-23 through ST-27, TR-24, TR-25, FS-34, AG-21, UI-06, UI-08,
UI-10, UI-14, UI-30, UI-36, UI-38.

Done when: you can create or clone a repository as well as point at one; rename,
relink and abandon both projects and sessions, with an honest preflight before
anything is destroyed; choose how a session's worktree is cut rather than always
getting a fresh branch; set a project's worktree root, default branch, remotes,
account, scripts and environment; and every kind of trouble a checkout can be in
shows as a state on the district instead of silence.

### W8 — the settings island · started, and not where it will live

There is no settings island and this wave still needs one. What has landed is
one of its capabilities on a board that already exists, because it belongs to a
session as much as to the app: who could work in a building.

The card used to say "21 more speak the protocol but are not installed here",
which is a fact you can only read. Pressing that line now opens all of them,
each offering to be brought here, and pressing one runs what that agent itself
says installs it. Nothing is chosen for you afterwards: who works in a building
is still a press, and this only makes the press possible.

Driven in the running app, and the proof is the card rather than a notice: two
agents were brought here and moved out of "not here yet" into who works here
with the count dropping, and when they were uninstalled again from a terminal
the card put them back without being touched. Both were removed afterwards, so
the machine is as it was.

One thing was wrong and is fixed: a session nobody had spoken to yet had no way
to be taken down, because the card stopped drawing at the line explaining why
it could not say what the agent thinks with. A session nobody has spoken to is
exactly the one you are most likely to want rid of.

Still needed here, and needing the island: everything app-wide, updating and
authenticating agents rather than only installing them, adding and editing MCP
servers rather than switching them on and off, installing and writing skills,
and connecting accounts.

### W8 — the island itself

There is no settings island. No windmill, no workshop, nowhere for any of it.

Closes ST-01, ST-04 through ST-07, ST-10 through ST-14, ST-17 through ST-21,
ST-28 through ST-31, AG-07, AG-09, AG-10, AG-11, TR-07, FS-32, UI-16.

Done when: the island exists and holds every app-wide setting; agent CLIs can be
installed, updated, authenticated and pinned from it; MCP servers can be added
and edited rather than only switched on and off; skills can be installed and
written; and accounts connect.

### W9 — the village is alive

Mostly art and behaviour rather than ledger rows, and the one wave whose payoff
is purely how it feels.

Closes AG-18, AG-38, AG-40, FS-29, and the unnumbered work: a diagram drawn on
the wood in the same lines everything else is drawn in, villagers that walk and
carry a session's identity, what happens when a project has more sessions than
its district has houses or the island has more projects than districts, and land
that retracts when a project is abandoned.

Done when: you can tell from the water who is working, who is stuck and who is
waiting for you, without opening anything.

### W10 — other machines, and work that runs itself

Closes WS-04, TR-13 through TR-20, ST-22, ST-32, UI-15, UI-41.

Done when: a remote host can be added and a session run on it end to end, and a
session can be scheduled to start without you.

### W11 — it is an app you install · started

It is one. `pnpm run package` from `apps/mender` makes a signed Mender.app and
a dmg you drag into Applications, and the thing that comes out of Applications
is the whole village: the island draws, a district opens, its board reads git,
and everything behind it is running.

Three things had to be fixed to get there, and each of them was invisible until
the packaged app was actually opened.

The renderer asked for its art from the root of the disk. `/kit/kit.json` is
the right answer when a dev server is serving the page and completely wrong
when the page is a file, so every asset path is relative to the page now and
the build emits its own urls the same way. The world's own files also had to
be put in the package at all; only the built code was.

And nothing behind the village started, because the file watcher had been
pulled out of the archive and the things it imports had not. Electron reads its
own archive perfectly well, so the fix was to stop taking packages out of it:
only the compiled binaries are unpacked now, because an operating system will
not load one out of an archive, and everything that is javascript stays in.
A package half in and half out resolves to half of itself, which looks exactly
like a village with nothing behind it.

There is an icon now, and it is a picture of the village, because that is what
the app is. It is a square cut out of the island as the app's own renderer
draws it, and `tools/make-icon.py` turns that into what macOS wants. Drawing it
a second way out of the same kit but by different rules would give something
that looks almost like the app and not quite, which is worse than no icon.

Deliberately not here: publishing, an update channel, notarisation. This is his
own village on his own machine, and a release pipeline is for when there is
somebody to release to.

Not here yet: recovering from a bad boot, and telling him something wants him
while he is looking at something else.

Closes UI-01 through UI-04, UI-27 through UI-29, UI-34, UI-42, ST-09, ST-34,
ST-35, TR-23.

Done when: it launches from the Applications folder, recovers from a bad boot,
tells you when something wants you while you are elsewhere, and updates itself.

## What was cut on purpose

Kept here so none of it quietly returns as a panel.
- Everything in the file tree that is a tree widget rather than a way to reach a
  file: multi-select (FS-05), a context menu (FS-08), dragging things around
  inside it (FS-09), a flat-mode toggle (FS-12), icons by extension (FS-14) and
  preview-versus-pinned opening (FS-06). You stand in one folder and press a
  thing; there is nothing to select, nothing to right-click and no second way to
  list it.
- Opening a file in another application (FS-01, FS-03). Twenty-nine apps in a
  dropdown is somebody else's idea of what you meant.
- Monaco (FS-21), because the board has one typeface and no cursor. Reading a
  file and rewriting a line of it is done; a code editor inside the wood is not
  what the wood is.
- The image viewer (FS-30), for the reason the board already gives.
- Everything in the terminal that is a pane manager: resizing a grid of them
  (TR-02), keeping them warm off-screen for instant tab switching (TR-03), and
  the drawer they would live in (UI-12). One board shows one thing, and the
  shell is on it.
- The preview-server pill and the titlebar it sits in (TR-11, UI-40), and the
  in-app browser (TR-12). There is no titlebar, and a browser is a browser.
- Pull requests as a list to filter (WS-46) and as a panel inside the changes
  view (WS-47). A pull request belongs to the branch you are on, and that is
  where the village asks about it.


- The split-pane workbench, its tab strips and its terminal drawer (UI-11,
  UI-12's drawer form, UI-13, UI-20, UI-32, UI-33). One board shows one thing.
- The persistent project and task sidebar (UI-19) and its status dots (UI-37).
  The rail and the roster do this.
- The project view's section tabs (UI-07). A project's board opens on its
  sessions and the checkout is a footnote.
- The composer as a separate placed object (AG-24) and its imperative text API
  (AG-54). The last line of the board is where you write, always.
- An OS deep-link scheme (UI-24), which emdash does not have either.
- The workspace-server artifact URL (ST-16), which stays build configuration.
- The whole diff-review apparatus: a floating action card on a selection
  (WS-37), preview against pinned diff tabs (WS-38), prefetched diffs on hover
  (WS-39), a stacked multi-file diff (FS-26), a flat-or-tree setting for the
  changes list (ST-15), a titlebar breadcrumb and git popover (UI-09), and diff
  stats on sidebar rows (UI-39). Each needs a selection, a tab strip, a pointer
  that rests, a settings surface, a titlebar or a sidebar, and there are none.
- Image diff (FS-27). A picture is never drawn on the wood; a changed image
  says that it changed.
- Inline review comments on diff lines (FS-25, WS-44), as a shape rather than
  as a capability. Telling an agent about a line is wanted and the village's
  answer is writing to it with an @, not threading notes into a gutter.

## The work that has no ledger number

The ledger only covers capability inherited from emdash. These are ours, from the
catalog's build list, art list and open questions.

Done: the fork and the deleted front end, the wire client without React, the
transport, the ported state rules, the shore pass client-side, district
composition, hit testing, the camera moves, the board itself, the plot and
building mapping, the rail and the roster (B0-01 through B0-04, B1-01 through
B1-05, B2-01 through B2-05, B2-08, B2-09, B3-02).

Not started, and each one is real work:

| | Wave |
|---|---|
| Sprite atlas packing and scoped loading — 1,031 loose files today (B2-06, B2-07) | W9 |
| Villagers that walk: per-session identity, spawn and despawn, directable goals (B1-06, B5-01 through B5-03, B5-05) | W9 |
| Status legible from the water, whatever Q-STATUS lands on (B5-04) | W9 |
| Overflow: more projects than districts, more sessions than houses (Q-PLOT-CAPACITY, Q-TASK-DENSITY) | W9 |
| Land retraction when a project is abandoned (Q-RETRACT) | W9 |
| The character sprite set — idle, walk, working, sleeping, distressed. A full commission, not a recolour (art batch 1) | W9 |
| Status overlays (art batch 2) | W9 |
| The windmill, blades and all (art batch 3) | W8 |
| Parchment and chalkboard surfaces — the board is plain timber today (art batch 4) | W5 |
| An icon vocabulary for branch, diff, PR, terminal, error (art batch 5) | W3 |
| Stage-5 landmarks that exceed the artist's own ceiling (art batch 6) | W9 |
| The written palette and style guide any commissioned artist needs (art batch 8) | W9 |
| Perf under load: camera moving, villagers ticking, a board open (B2-10, B6-05) | W9 |
| A driven harness over the real feature set (B6-03) | W1 |
| A parity checklist harness generated from this file (B6-04) | W1 |
| Visual checks on every restyled surface before it counts as done (B6-06) | W5 |

### Open design questions

The catalog asks twenty. Exactly one is decided: Q-WORKBENCH, one board. The
other nineteen carry a recommendation nobody has ruled on, which is fine while
they are far off and a problem the moment their wave starts.

Three have been answered in practice by what got built, and the catalog should
be updated to say so: Q-SIDEBAR (the rail and the roster, no list panel),
Q-PALETTE's underlying tension (the slash on the line already breaks the "no
conventional control" purity and reads fine), and Q-STAGE-METRIC (manual, stage
four on founding).

The ones that block a wave and need a call before it starts: Q-KEYBOARD and
Q-PALETTE for W1, Q-ERRORS and Q-MOTIF for W3, Q-EDITOR for W5, Q-TERMFONT for
W6, Q-SETTINGS, Q-MCP and Q-THEME for W8, Q-STATUS, Q-PLOT-CAPACITY,
Q-TASK-DENSITY and Q-RETRACT for W9, Q-MACHINES for W10, and Q-NOTIFY,
Q-ONBOARD and Q-MULTIWINDOW for W11.

## The ledger

Every row from `BUILD-CATALOG.md` section 2, with its state and its wave.

| # | Feature | State | Wave |
|---|---|---|---|
| AG-01 | Supported-agent catalog (37 providers) | done |  |
| AG-02 | Per-agent capability declarations (11 typed capabilities) | part | W2 |
| AG-03 | ACP session transport | kept |  |
| AG-04 | Vendor event-field enrichment | kept |  |
| AG-05 | Session resumability & provider session-id tracking | done |  |
| AG-06 | Hook-driven status & session signals | kept |  |
| AG-07 | MCP server management, scoped per agent | part | W8 |
| AG-08 | Workspace trust pre-authorization | kept |  |
| AG-09 | Per-agent auth status detection |  | W8 |
| AG-10 | Multi-account registry (issue trackers etc.) |  | W8 |
| AG-11 | CLI dependency install/update/uninstall |  | W8 |
| AG-12 | Agent-process environment sanitization | kept |  |
| AG-13 | Session idle policy & automatic teardown | part | W2 |
| AG-14 | Session intents — persisted resume state | part | W2 |
| AG-15 | ACP session launch / TUI session start contracts | kept |  |
| AG-16 | Conversation index | kept |  |
| AG-17 | Conversation lifecycle reporting | kept |  |
| AG-18 | Agent status derivation & unread badge | part | W9 |
| AG-19 | Live conversation auto-titling from the agent | done |  |
| AG-20 | Normalized transcript event vocabulary | part | W2 |
| AG-21 | Host/runtime availability states |  | W7 |
| AG-22 | Transcript row kinds (message, tool, subagent, thinking, file-op, execute, diff, resource-link, plan, working, turn-outcome) | part | W2 |
| AG-23 | Virtualized, auto-growing transcript scroll | part | W2 |
| AG-24 | Composer placement (centered vs docked) | cut |  |
| AG-25 | Pin the active user message while scrolling | cut | W2 |
| AG-26 | User message card | done | W2 |
| AG-27 | Generic tool call row | done | W2 |
| AG-28 | Hierarchical tool grouping (subagents) | done | W2 |
| AG-29 | Subagent card | done | W2 |
| AG-30 | Diff card (file edit preview) | done | W2 |
| AG-31 | Execute card (shell command + live output) | done | W2 |
| AG-32 | File operation card (read/edit/delete/move) | done | W2 |
| AG-33 | Thinking/reasoning card | part | W2 |
| AG-34 | Plan/todo-list card | part | W2 |
| AG-35 | Resource link card | cut | W2 |
| AG-36 | Turn outcome / filler rows | part | W2 |
| AG-37 | Markdown rendering (headings, tables, code, Mermaid, GFM, math) | part | W2 |
| AG-38 | Mermaid diagram pan/zoom viewer |  | W9 |
| AG-39 | Copy-to-clipboard affordance | done | W2 |
| AG-40 | Agent status glyph (inline indicator) | cut | W9 |
| AG-41 | Agent selector | done |  |
| AG-42 | Model selector with hover-detail card | done |  |
| AG-43 | Permission mode & collaboration mode selectors | part | W2 |
| AG-44 | Session MCP servers indicator | done |  |
| AG-45 | Context-window usage indicator | done | W2 |
| AG-46 | Attachments (image drag/drop/paste) | done | W2 |
| AG-47 | Send/stop/queue button | done | W2 |
| AG-48 | Notice band (session-state banners) | part | W2 |
| AG-49 | Permission request band | done | W2 |
| AG-50 | Queued prompts band | done | W2 |
| AG-51 | @ mentions (files/issues/symbols/custom) | done | W2 |
| AG-52 | / slash commands | done |  |
| AG-53 | Submit keybindings & multiline editing | part | W1 |
| AG-54 | Prompt editor imperative API | cut |  |
| WS-01 | Add Project modal — Pick Directory | done |  |
| WS-02 | Add Project modal — Create Repository |  | W7 |
| WS-03 | Add Project modal — Clone Repository |  | W7 |
| WS-04 | Project host — local vs SSH ("Machine") |  | W10 |
| WS-05 | Repository inspection / creation errors | part | W7 |
| WS-06 | Rename / delete / relink a project |  | W7 |
| WS-07 | Project availability banner / disabled-action guard |  | W7 |
| WS-08 | Project settings & config sharing |  | W7 |
| WS-09 | Worktree directory setting |  | W7 |
| WS-10 | GitHub account per project |  | W7 |
| WS-11 | Project directory/file tree browsing (for pickers) |  | W7 |
| WS-12 | Create Task modal | done |  |
| WS-13 | Workspace presets (5 kinds) | part | W7 |
| WS-14 | Branch conflict detection & reuse offer |  | W7 |
| WS-15 | Setup step preview |  | W7 |
| WS-16 | Git plan compiler (branch/PR provisioning) | kept |  |
| WS-17 | Task/workspace creation execution | done |  |
| WS-18 | Worktree path derivation | kept |  |
| WS-19 | Worktree creation/removal execution (git ops) | part | W7 |
| WS-20 | Task lifecycle actions | part | W7 |
| WS-21 | Task palette | done | W1 |
| WS-22 | Activity badge (workspace lifecycle) |  | W7 |
| WS-23 | Delete Task modal — informed preflight |  | W7 |
| WS-24 | Workspaces tab (per project or per machine) |  | W7 |
| WS-25 | Workspace row actions (Open in Task / Clean Artifacts / Delete) |  | W7 |
| WS-26 | Bulk "Delete workspaces" |  | W7 |
| WS-27 | Workspace removal / path-issue / script-issue states |  | W7 |
| WS-28 | Observation freshness (fresh/stale/offline) |  | W7 |
| WS-29 | Checkout store (stage/unstage/discard/commit/push/pull/publish) | done | W3 |
| WS-30 | Git action toasts | done | W3 |
| WS-31 | Git error vocabulary | done | W3 |
| WS-32 | Repository store (branches/remotes/provider identity) | kept |  |
| WS-33 | Repository-level wire contract (worktrees/refs/remotes/fetch) | kept |  |
| WS-34 | Branch reference model | kept |  |
| WS-35 | Branch selector components |  | W8 |
| WS-36 | Staged/Unstaged sections | done | W3 |
| WS-37 | Floating action card on selection | cut | W3 |
| WS-38 | Preview vs pinned diff tabs | cut | W3 |
| WS-39 | Prefetched diff models on hover | cut | W3 |
| WS-40 | Commit card | done | W3 |
| WS-41 | Diff main panel | done | W3 |
| WS-42 | Commit history / blame | done | W3 |
| WS-43 | CI check runs | done | W4 |
| WS-44 | Draft line comments (agent-directed notes) | cut | W3 |
| WS-45 | PR data model | kept |  |
| WS-46 | PR list/filtering (project level) | cut | W4 |
| WS-47 | PR entry (inside a task's Changes panel) | cut | W4 |
| WS-48 | Merge footer (3 strategies + bypass) | done | W4 |
| WS-49 | Create PR modal | done | W4 |
| WS-50 | PR-checkout association / drift / sync coordination | kept |  |
| WS-51 | Credential-helper loopback channel | kept |  |
| WS-52 | Three session credential modes |  | W7 |
| WS-53 | Operation-scoped credential injection | kept |  |
| WS-54 | Integration plugin architecture (account-level) |  | W4 |
| WS-55 | Issues plugin architecture | kept |  |
| WS-56 | Issue linking UI |  | W4 |
| WS-57 | PR selector (linking a PR to a task) |  | W4 |
| WS-58 | Shared exclusion-policy engine | kept |  |
| TR-01 | Interactive terminal panes | done | W6 |
| TR-02 | Terminal grid sizing (multi-pane resize) | cut | W6 |
| TR-03 | Off-screen terminal host / instant tab switching | cut | W6 |
| TR-04 | Terminal persistence via tmux | done | W6 |
| TR-05 | Terminal exit/kill semantics | kept |  |
| TR-06 | Shell resolution & selection |  | W6 |
| TR-07 | Terminal appearance & behavior settings |  | W8 |
| TR-08 | Terminal environment (theme signaling, agent env) | kept |  |
| TR-09 | Automatic dev-server URL detection |  | W6 |
| TR-10 | Manual port forwarding (SSH workspaces) |  | W6 |
| TR-11 | Preview server pill (task titlebar) | cut | W6 |
| TR-12 | In-app browser (Emdash Browser) | cut | W6 |
| TR-13 | Add/edit/connect a machine |  | W10 |
| TR-14 | Machine status indicator |  | W10 |
| TR-15 | Host settings (per-machine defaults) |  | W10 |
| TR-16 | Workspace server (remote runtime daemon) |  | W10 |
| TR-17 | Machine resource monitoring |  | W10 |
| TR-18 | Host system dependencies |  | W10 |
| TR-19 | Machine's conversations/workspaces lists |  | W10 |
| TR-20 | Workspace disk usage |  | W10 |
| TR-21 | Bound exec primitive | kept |  |
| TR-22 | Execution planning / shell quoting | kept |  |
| TR-23 | Update card (shared component) |  | W11 |
| TR-24 | Script status indicator |  | W7 |
| TR-25 | Stepped loader |  | W7 |
| TR-26 | Runtime broker & host runtime contract | kept |  |
| FS-01 | "Open In ▾" catalog (29 apps) | cut | W5 |
| FS-02 | Per-app detection & launch strategy | kept |  |
| FS-03 | "Open path with OS default" | cut | W5 |
| FS-04 | Virtualized file/folder tree | done | W5 |
| FS-05 | Multi-select (click/Cmd/Shift) | cut | W5 |
| FS-06 | Preview vs pinned file open | cut | W5 |
| FS-07 | Create/rename inline draft rows | done | W5 |
| FS-08 | File tree context menu | cut | W5 |
| FS-09 | Internal drag & drop (move) | cut | W5 |
| FS-10 | External drag-in (import) |  | W5 |
| FS-11 | Drag-out to compose/elsewhere |  | W5 |
| FS-12 | Flat-mode listing | cut | W5 |
| FS-13 | Row decoration (git-status badges, tone) |  | W5 |
| FS-14 | File icons by extension | cut | W5 |
| FS-15 | Filename / quick-open search | done | W1 |
| FS-16 | Content ("find in files") search | done | W5 |
| FS-17 | Search-results tree | done | W5 |
| FS-18 | Files RPC contract (fs.*, tree, content) | kept |  |
| FS-19 | Open-file store (editor tab lifecycle) | kept |  |
| FS-20 | File-kind renderer routing (text/csv/markdown/html/svg/image/too-large/binary) |  | W5 |
| FS-21 | Monaco text editor | cut | W5 |
| FS-22 | CSV renderer |  | W5 |
| FS-23 | Markdown/HTML/SVG/image renderers |  | W5 |
| FS-24 | Text diff (Monaco diff editor) | done | W3 |
| FS-25 | Inline review comments on diff lines | cut | W3 |
| FS-26 | Stacked multi-file diff view | cut | W3 |
| FS-27 | Image diff view | cut | W3 |
| FS-28 | Binary diff fallback | done | W3 |
| FS-29 | Mermaid inline + standalone viewer |  | W9 |
| FS-30 | Image viewer (contained/expandable/standalone/zoom-pan chassis) | cut | W5 |
| FS-31 | Shared file-watching service | kept |  |
| FS-32 | Exclusion policy settings UI |  | W8 |
| FS-33 | Disk usage measurement | kept |  |
| FS-34 | Directory selector (in-app column browser) |  | W7 |
| FS-35 | Workspace path containment (security) | kept |  |
| ST-01 | 13 settings pages (General, Integrations, Interface, Browser, Repository, Prompts, System, Workspaces, Conversations, Agents/CLIs, MCP, Skills, Machines) |  | W8 |
| ST-02 | Settings storage model (SQLite override + safeStorage secrets) | kept |  |
| ST-03 | Provider/integration accounts registry | kept |  |
| ST-04 | `tasks` settings (7 fields: auto-name, auto-approve, auto-trust, create-branch, delete-branch, capitalization, issue-context) |  | W8 |
| ST-05 | `project` settings (push-on-create, branch prefix, random suffix, tmux-by-default) |  | W8 |
| ST-06 | `localProject` settings (default projects dir, default worktree dir) |  | W8 |
| ST-07 | `defaultAgent` setting |  | W8 |
| ST-08 | `keyboard` overrides |  | W1 |
| ST-09 | `notifications` settings (enabled, sound, custom sound path, OS notifications, sound-focus-mode) |  | W11 |
| ST-10 | `theme` setting |  | W8 |
| ST-11 | `openIn` settings (default + hidden apps) |  | W8 |
| ST-12 | `interface` settings (task-hover action, auto-right-sidebar, 3× show-left-sidebar-metadata switches, hide-context-bar) |  | W8 |
| ST-13 | `terminal` settings (font family/size, auto-copy, mac-option-as-meta, default shell) |  | W8 |
| ST-14 | `browserPreview` / `browser` settings (profiles, CORS relax, clear-data) |  | W8 |
| ST-15 | `changesViewMode` setting (flat/tree per section) | cut | W3 |
| ST-16 | `remoteMachine` install-source setting | cut |  |
| ST-17 | Per-agent-provider config (extra CLI args, env vars) |  | W8 |
| ST-18 | Per-agent executable override |  | W8 |
| ST-19 | MCP server management (catalog + custom) |  | W8 |
| ST-20 | MCP "sync to agents" |  | W8 |
| ST-21 | Skills catalog |  | W8 |
| ST-22 | Automations (scheduled/cron agent runs) |  | W10 |
| ST-23 | Per-project settings — provenance model |  | W7 |
| ST-24 | Per-project "base" settings (GitHub account, worktree root, default branch, base/push remote, git-credential mode, tmux) |  | W7 |
| ST-25 | Per-project "shareable" settings written to `.emdash.json` |  | W7 |
| ST-26 | Config import ("migrate from Conductor/Superset/Paseo/Codex") |  | W7 |
| ST-27 | Per-project environment variables |  | W7 |
| ST-28 | Emdash account (sign-in/out, session states) |  | W8 |
| ST-29 | GitHub accounts (multi-account) |  | W8 |
| ST-30 | Three ways to connect GitHub |  | W8 |
| ST-31 | Other issue-tracker integrations (12 providers) |  | W8 |
| ST-32 | SSH machine connections (form + validation) |  | W10 |
| ST-33 | Full keybinding catalog & conflict model | part | W1 |
| ST-34 | App self-update flow |  | W11 |
| ST-35 | Telemetry consent |  | W11 |
| ST-36 | `.emdash.json` (the one per-repo config file) | kept |  |
| UI-01 | Boot splash |  | W11 |
| UI-02 | Recovery window |  | W11 |
| UI-03 | Onboarding (sign-in + legacy-data import) |  | W11 |
| UI-04 | Welcome screen |  | W11 |
| UI-05 | Home view | done |  |
| UI-06 | Project view — header & actions menu |  | W7 |
| UI-07 | Project view — section tabs (Tasks/PRs/Workspaces/Settings) | cut |  |
| UI-08 | Project view — non-ready states (creating/hydrating/context-error) |  | W7 |
| UI-09 | Task titlebar — breadcrumb + git popover | cut | W3 |
| UI-10 | Task titlebar — activity/preview/open-in/drawer-toggle/sidebar-toggle |  | W7 |
| UI-11 | Task main column — split-pane tab workbench | cut |  |
| UI-12 | Task main column — bottom terminal drawer | cut | W6 |
| UI-13 | Task sidebar — 3-way toggle (Conversations/Changes/Files) | cut |  |
| UI-14 | Task view — non-ready states (creating/provisioning/missing/teardown) |  | W7 |
| UI-15 | Automations view |  | W10 |
| UI-16 | Settings view |  | W8 |
| UI-17 | Typed view router (5 views) | done | W1 |
| UI-18 | Back/forward history | done | W1 |
| UI-19 | Sidebar tree for projects/tasks | cut |  |
| UI-20 | Tabs for multi-session work inside a task | cut |  |
| UI-21 | Command palette as navigation shortcut | done | W1 |
| UI-22 | In-app deep linking (tab-scoped location) | done | W1 |
| UI-23 | Redirects on missing id | done | W1 |
| UI-24 | No OS deep-link scheme (confirmed absent) | cut |  |
| UI-25 | Command palette (`cmdk`-based) | done | W1 |
| UI-26 | Keyboard shortcuts (full default set) | part | W1 |
| UI-27 | Native application menu |  | W11 |
| UI-28 | System tray |  | W11 |
| UI-29 | Window management (per-platform titlebar/frame) | part | W11 |
| UI-30 | Drag and drop — OS folder → sidebar |  | W7 |
| UI-31 | Drag and drop — workspace file → composer/tree | done | W2 |
| UI-32 | Drag and drop — tabs | cut |  |
| UI-33 | Drag and drop — terminal tabs | cut |  |
| UI-34 | System notifications |  | W11 |
| UI-35 | Toasts | done | W3 |
| UI-36 | The full modal catalog (30 modals) |  | W7 |
| UI-37 | Agent status dots (sidebar) | cut |  |
| UI-38 | Activity badge (workspace lifecycle) |  | W7 |
| UI-39 | Diff stats and PR badges (sidebar rows) | cut | W3 |
| UI-40 | Preview-server pills (titlebar) | cut | W6 |
| UI-41 | Connection status dot |  | W10 |
| UI-42 | Update indicator (sidebar footer) |  | W11 |
| UI-43 | Context-usage indicator (composer) | done | W2 |
| UI-44 | Boot/crash telemetry (not user-facing) | kept |  |
