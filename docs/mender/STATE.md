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
opens; a project is a district; a session works in the project's own folder (or, asked for, a worktree of
its own) with a real Claude agent in it that resumes across restarts; a project's board lists its sessions
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

Of the 255 ledger rows, as of 2026-09-29: 101 done, 34 partly done, 34
inherited working from emdash's back end and needing no village surface, 86
deliberately cut, and **none left blank**. Every row that was ever
genuinely open has now been built, found to already work under a name that
didn't say so, or cut on purpose with the reason written down next to it.

What is still genuinely missing, past what's marked `part` above: an actual
Finder drag driving the file-import code that's otherwise proven; a bare
subdivided plot, past eleven founded projects, actually pressed; and a real
session with hundreds of turns actually driving the transcript's own
windowing rather than a synthetic one. Several things this file used to
list here turned out, on a closer look on 2026-09-29, to already be built
and just never checked off: mermaid you can pan and zoom, a CSV file
reading as a table, linking an existing pull request, and starting a
session from a branch you already have are all live in the app today. The
thinner transcript cards — thinking, the plan, how a turn ended — are built
and wired to real data too; what's missing for them is not code, it's a
real Claude turn that actually sends one, so they stay `part` on that
alone. And what was still genuinely missing here — an agent actually
driving another Mac app, not just one whitelisted browser MCP — is built
now too: see "A session can control the whole Mac, not just a browser"
below.

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
- ~~**Nothing abandons anything.**~~ Fixed, quietly, sometime in W7 without
  this line coming back to say so: driven 2026-09-29 against a scratch
  project — "Remove from Mender" on the project's own settings arms, confirms,
  and removes it in one press-arm-press-confirm cycle; a session's own card
  takes it down the same way, "taken down." lands on the write line and the
  worktree is gone.
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

Rebinding, and the conflict model that goes with it, landed on the windmill's
own Keys page once there was a settings island for it to live on: every chord
in the table is pressable there, a pressed row waits for the next key, a key
already spoken for by another doing is said plainly right on that row rather
than saved over it, and a `default` line beside anything rebound puts it back.
Filename search (FS-15) waits for files in W5, since there is nothing to
search yet. Shift and return for a newline (AG-53) still needs the line to
hold more than one.

Closed UI-17, UI-18, UI-21, UI-22, UI-23, UI-25, WS-21, and four of the seven
broken things above: the arrow collision, Escape eating a draft, the rename
nobody could reach and the mouse-only card. Also closed: ST-08 and ST-33
(rebinding and its conflict model). Still open in it: FS-15 and AG-53 as
above, and the driven harness over the real feature set (B6-03), which is the
next thing in this wave.

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
said while somebody is busy goes straight into the turn they are in, the way
Claude Code's own terminal slips it in between tool calls, rather than waiting
until the whole turn is over and reading as ignored; for an agent that can't take
it mid-turn it waits in the open where you can see it and take it back before it
is heard. The line you write on grows a row at a time as it wraps and pushes the
board up above it, and a paste landing on nothing in a session goes onto the
line, so dictation needs no press on it first. And a reply broken into pieces by the protocol is drawn
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

A picture in an answer is now drawn too. Markdown's `![caption](url)` is
lifted out of the line it sits in and hung under it, several in a row as
same-shaped cards with their captions, one on its own shown whole; one that
will not load is simply not there. Every session is started with a line
appended to Claude's own system prompt, through ACP's `_meta`, saying that
pictures show here and that only an image address it actually saw counts, so
asking for somewhere to eat comes back with a look at each place. Fetching
pictures off the linked pages ourselves was tried and dropped: most restaurant
sites name no preview, and the review sites refuse to answer. Driven: asked a
fresh session for three New Orleans restaurants, and it came back with a
real photo of each, in a row, captioned.

The first wording only let it add a picture when it happened to have one, and
asked for restaurants near him it searched once and had none. It is now told
to go and get them for anything worth seeing, not only places: a real page
about each thing from a search, never a guessed domain, its preview picture or
failing that a photo out of the page itself, and a second pass for what the
first found nothing for. Driven: "what do the AirPods Max look like" and "find
best restaurants near me" both came back with real photos.

That wording was then too prescriptive the other way: told exactly where to
put them, it saved every picture for one row at the end, away from what each
one showed. The instruction is now just to be visual where seeing a thing
helps, with real pictures only, and the board does the placing: a picture in
a paragraph or list entry, or on its own line right under one, stands beside
that writing, and pictures can be files on this machine too. Driven: "the top
5 brunch spots near me and their top foods" came back with each place's dish
beside its own entry.

The same note now also says the session is running on his own Mac and can see
and work every app on it itself, by screenshot, AppleScript, System Events and
clicks, his real signed-in Chrome for anything on the web, so it does a step
rather than handing him a list of clicks, and only asks for his hands for a
password, a fingerprint or a device. Until then nothing told it, and every
session acted as if it could not. Driven: asked what Finder's View menu says
about the path bar, Haiku went and read the menu and answered right.

The same note now says what else the board draws, tables, fenced blocks and
mermaid, and that anything with a shape gets its shape rather than a paragraph,
a tree, a table, a diagram, numbered steps, with a wall of text named as the
one thing never wanted; and that a lot to take in is better built as a file, an
HTML page, a document or a picture outside the checkout, which the board already
lists as something made. His own Hoid style carries the same rule, so a village
session hears it from both sides. Driven: asked a fresh session in the installed
app how the renderer is put together, and it answered with a fenced tree and
one line rather than four paragraphs. That tree folded on the slate, every
comment past the column's edge dropping onto its own line, so a code block now
keeps its lines whole and slides sideways under the wheel when one is wider
than the slate, the way a table already does. Driven: the same question again,
the tree stood as drawn.

The first answer under that note threw the content away: asked what state the
app was in, the session built a page and left three lines, a decorative
picture and a table of four bare counts on the board. The note now says the
shape carries the answer and never replaces it, the same content arranged with
nothing dropped, and a built file is on top of a full answer, never instead.

A table on the board then ran off its right edge: every cell was held to one
line, so a row of real sentences pushed the whole table out to be scrolled to.
Cells now wrap inside their own column and the table fits the column it is in;
only a right-leaning figure holds to one line.

And the note overshot: every answer came back as a table. It now says plain
sentences are the default, a tree, numbered steps or a diagram only when the
thing really has that shape, and a table rarely, for several things compared on
a few short points, never a column of sentences.

All of that wording was then taken back out, at his word: the note to every
session is the pictures note it was this morning, nothing about trees, tables
or diagrams. Code slates keeping their lines and tables wrapping in the column
stay, since those are the board drawing what it is given properly.

Left that loose, it was skipped: asked to rank New Orleans swamp tours, a
session looked once for an img tag on a script-built site, found none and
answered in plain text. Recommending or comparing real things is now a rule,
every one named gets its picture, and the page's own share image is named as
the first place to look, with Commons and Wikipedia after it, so one dry page
is no longer the end of it. Driven: the same question came back with a real,
loading photo beside each of five tours.

Pressing a picture in an answer holds it up over the whole window at the
largest size that fits, caption under it; the wheel goes in closer where the
pointer is, a drag moves it, and Escape or a press puts it down. One on this
machine is read again larger for it. Driven in a dev window: opened, zoomed,
put down by Escape and by a press.

A fenced ` ```mermaid ` block is now drawn — colored to the wood rather than
left in whatever the diagram's own default is, via `beautiful-mermaid` (already
in the lockfile, no DOM dependency of its own) — and panned and zoomed rather
than shrunk to fit: it opens in a clipped window at whatever size reads best,
and the wheel and a drag move it, the same view shared by an answer's own
fenced block and a `.md` file's. Driven on a `.md` file's diagram: the wheel
zoomed toward the pointer and a drag panned it. The answer path shares the
same view and the same code but was not separately driven with a live answer
that draws one.

A file can be named on the line you write on. An @ turns the lines under it into
what is actually in that checkout, narrowing as you type, and picking one writes
the whole path where the @ was — name first and the folder after it, because a
checkout is full of files with the same name in different folders and written
whole they all truncate to the same middle of the same path. The index behind it
is emdash's file-search runtime, wired in here for the first time; asking is what
builds it, and the root is held open from the first question so the answer to the
second keystroke arrives before the third.

A picture dropped on the wood or pasted onto it is carried. It cannot be drawn
on the board, so what the board says is that you have it: it stands on the line
among the words as `[picture 1]`, the way Claude Code writes `[Image #1]`, holds
the picture itself up when pointed at, goes with whatever you say next, and
backspacing over it puts it down, and undo picks the same one straight back
up. Handing one over with no words at all counts as something said, which is
the one place the empty-line rule bends. Afterwards the transcript says you
handed it over, because otherwise a picture leaves no trace of having gone, and
so does its note on the gatepost, under what you said with it, including one
handed over mid-turn and one read back out of a session reopened later; and
pointing at that line holds the pictures up there too, the same as on the line,
reopened or not.

A long link pasted onto the line stands there as where it goes, `[expedia.com]`,
the same way, so a mile of query string no longer buries the sentence it was
pasted into. The whole address is still what gets said, pointing at it shows it,
and backspace takes it off whole.
Anything that is not a picture is refused out loud rather than silently, and
dropping one on the island says so too, since nothing out there has hands.

Anything else dropped on the wood is written on the line as where it is. A
picture is the only thing an agent can be shown, but a file has a path, and a
path is the one thing about a file you cannot say any other way: it lands on
the line you are writing on, quoted if it has a space in it, and goes with
whatever you say about it. Dragged from anywhere on this machine, not only from
the checkout.

A block of code comes off the board by being dragged across, like everything
else written there: nothing copies itself for being pressed any more, which
used to swallow a press meant for a link and copy the whole answer instead.
Whatever is selected is on the clipboard the moment the pointer comes up, and
a bare address an agent writes is a link now too. Driven in a dev copy: a drag
over half a sentence and over a code block each put exactly that on the
clipboard, a plain click on either put nothing there.

Somebody sent off to do something says what they were sent to do. The name on a
subagent is the tool's and it is the same word every time, so the board says the
errand instead, which the agent writes out itself, and the work done out there
is folded under it and opens. A command is said from inside the checkout it ran
in, like every other path on the board: an agent writes out the whole absolute
path because that is what it was handed, and forty characters of it are the same
forty characters every time, pushing the part you wanted off the end of the
line. One thing about it is not fixed: a restart loses the fold, because the
replay the agent sends back does not carry what happened inside a subagent.

When the yard took over from the board, somebody sent off went back to being a
figure standing on the ground with nothing behind it: no way to see what they
were doing and no way to stop one without stopping everything. Pressing one
now walks up to them, on a board laid over the yard like anything else: what
they were sent for, whether they are still out, and every step they have taken
out there, live. While they are out, "call them back" stops that one alone, in
two presses, whether it was sent to wait for or sent off on its own; the
session and anybody else it sent carry on, and the session hears that this one
came back without an answer. Claude's adapter stops a background shell that
way but refused to stop a subagent, so it is patched to, and to say so at once
rather than on the session's next turn. A helper stopped from anywhere used to
stand out in the dark forever, because a stopped or killed one was read as
still working; it comes home now. Driven in the running app, both kinds. A finished
helper's board after a restart used to say nothing came back, because the
protocol never replays what a helper did; it is read off Claude's own record of
them now, steps and the answer they came back with.
And a helper can be talked to. With their board open, what is written on the
line goes to them: the session carries it there with Claude's own SendMessage,
told so in a note only the agent sees, and what comes back is written on the
helper's board as it arrives. Every board laid over the yard also says "close"
in gold at its top right now, because Escape and a click off it were the only
ways out and neither could be seen. Driven in the running app.
A helper can be sent away: two presses on their board stop them if they are
still working and take them off the yard for good, kept across a restart. And
while one is out, how many tokens they are working with is written over their
head in the yard and on their board, counted the way Claude Code counts a
helper's and read off Claude's own record of them, so it climbs as they work.
Sending one away no longer means opening their board first: pointing at a
figure in the yard puts a gold cross over them, and a gold line in the corner
of the yard sends everybody who has finished home at once, each in two
presses.
The yard's helpers were redrawn after his mockup: numbered figures round the
fire under "so many hands at the fire", working to the left and back dimmed to
the right, one line that scrolls sideways however many go out, and under it a
table of each one's errand, clock and tokens as a bar, a total, and a button to
send the finished home. Pointing at a line or a figure lights both and puts a
cross at the line's end, two presses. How long a finished helper was out is read
off Claude's own record of them. Driven in the running app with twelve out.
Then scattered rather than lined up, unnumbered, the working ones by the fire
with a pulsing ember over their heads and on their lines, the stopped ones grey
with an empty square. Driven in the running app with fourteen out, three working.

Two things are cut on purpose. A resource link never arrives: neither CLI ever
sends one back, both of them turn a file reference into ordinary writing on the
way out, and the one place a link does appear is inside a tool call that already
says which file it read. And pinning what you asked to the top of the board
while you scroll is a panel floating over the wood, which is the thing this app
does not do; the question is directly above the answer, and scrolling back to it
is the honest way to see it again.

The column of what it is thinking only draws the most recent stretch of a
session's thoughts, not its whole history: the rest sits behind a "N more
before these" line that reveals another stretch a click at a time, the
scroll held steady across it. What was already true stays true — a session's
own record is capped at 400 thoughts before this column ever sees it — this
adds the same shrink on top of that, on the DOM rather than the data, so a
long session's cost is whatever is actually drawn. Verified with the window
math itself (`window.test.ts`) and smoke-tested in the running app.

The column of what it did carried a stub for the same idea — an "N earlier
steps" line — that nothing ever actually fed, so every step a session ever
took was drawn into the DOM on every redraw regardless (2026-09-29, found
while closing out the ledger). It now uses the same reveal-a-chunk-at-a-time
windowing the thoughts column already had, sharing the arithmetic in
`window.ts`. Driven in the yard's own design-preview harness against ninety
synthetic steps: only the most recent stretch drew, the "N earlier steps"
line read the right count, and pressing it revealed the next stretch with
the right count remaining and the props still drawing cleanly. Not yet
driven against a real session with hundreds of real turns in the installed
app, on either column, so AG-23 stays `part` until one has actually run
that long.

Nothing else is left in W2 that this machine can reach. A thought and a plan are
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

Inline review comments on diff lines (FS-25, WS-44) came back. The earlier cut
reasoned that the gatepost and an @ already say the same thing in words; the
gap that reasoning missed is that neither one can point at a specific line
without you typing the path and counting the line number yourself, which is
exactly the one thing about a file you cannot get across by describing it. So
a marked diff line is pressable now, the same gold as everything else: it
turns into one line of writing right there on the wood — "say what is wrong
with it. return pins it." — and pinning one leaves a small `✎` mark under
that line and a matching `✎ file:line` chip waiting by the write line, the
same way a dropped picture waits. It rides into the next thing said to this
session as `file:line — the note`, and pressing the chip or the pinned mark
takes it back. Driven for real: opened a real uncommitted change in a real
session's own worktree, pinned a note on one added line, watched the chip and
the pinned mark both appear, backed out to the yard with the chip still
showing, sent nothing but the note with Return, and watched it land on the
gatepost as `README.md:3 — why is this line here` and the agent actually act
on it — then confirmed the chip was gone afterwards.

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

A picture is drawn now rather than read as bytes: a png, a jpeg, a gif, a webp
or an svg shows the picture itself with its size in words underneath, pixel art
kept crisp rather than smoothed. The reading uses the same decoder a project's
own face already went through, reached for a file's own path instead of a
checkout's likeliest icon.

A file you are reading updates while it is written, the same way a checkout's
own status already did: opening one now holds the live model open rather than
a single snapshot, so a line an agent puts in while you are looking at the
file appears without you closing and reopening it. Taking a line down to fix
it is still pinned to what was actually on the disk when you took it, so
nothing is silently overwritten by what just arrived.

A `.md` file reads as writing rather than as marks now, the same renderer the
transcript already uses for an agent's own words: headings, lists, quotes,
rules and fenced code, with one line at the top to drop back to the raw text
when editing a line is actually what you came for. A fenced ` ```mermaid `
block draws as a picture row, the same diagram the transcript draws inline,
capped to the board's own width.

A file can be found from anywhere in a project or a session's yard now, not
only after walking into the folder first: `find a file` is a line on the
checkout board and answers to the same key the finder's own doings do, and it
opens straight onto the same look-by-name-or-by-what's-written board the
folder already offered.

A file that cannot be read here — too large, not writing, or simply a kind
better handed to a real editor — offers to be opened properly, using the same
bridge a project's own "show in Finder" already used. The last file or folder
you stepped all the way out of is one key away from being back, without
walking to it again.

A project's settings window, and any file you can actually read on its own
board, now offer opening it in your own editor too, next to "show in Finder":
`$VISUAL`/`$EDITOR` when it names a GUI editor's own CLI, otherwise the first
of Cursor, VS Code or Zed this machine actually has installed.

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

A failed check and an unresolved review comment are both pressable now, under
a heading of what got said: each writes its own text onto the write line,
unsent, exactly the way any other pressable line hands something to the
gatepost. A comment writes `path:line — what was said`; a failed check writes
`the "name" check failed, conclusion.`. Resolved comments are left off the
same way a happy check is folded into a count rather than read out. Driven
against a fixture rather than a real PR (never one of those in a dev copy): a
vitest fixture with one open and one resolved comment and one failed and one
green check confirms the resolved comment and the green check carry no pick
at all, the open comment and the failed check do, and confirms the exact text
each one hands over.

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
that opens one, and what comes up is a zsh running in that checkout, on a real
terminal grid mounted on the board: while it is what is open, the keyboard is
its own, not the board's write line.

It survives the app being killed. The shell lives in emdash's terminals runtime
in its own process, wrapped in tmux, so closing the window leaves it running
and opening the board again walks back into it with everything it had said
still there. That was driven: a command run, the app killed outright, the app
started again, the same scrollback.

Between the shell and the wood used to be a hand-rolled terminal screen, and
it drew correctly and could not be driven: it read the bytes down to lines,
so a full-screen program — a pager, a picker, vim, an agent's own CLI — drew
but there was nowhere to move a keyboard's own cursor to but the one line at
the foot of the board. That screen is gone. The grid is a real terminal now
(xterm.js, the same one Emdash already carries), mounted on the board rather
than written as rows of it, in the board's own type and ink. While it is what
is open, every key is its own — vim's Escape leaves insert mode, arrows walk
a picker, an agent's own TUI draws and answers exactly as it would at a real
terminal. `ctrl+]` is the one chord this board keeps for itself, written on
it, and it steps back out to wherever you were. Command and a number is the one
thing that gets past it the other way: it means nothing to a program in a
pty, so it still walks the rail to that session, shell or not. Driven: typed
into an open shell, pressed command-4, stood in the fourth session. Scrollback, copy and paste
are xterm's own.

A file dropped or pasted on the shell lands as its own path, shell-escaped,
sitting on the input line unsent — a picture included, since a shell has no
way to be shown one, only told where it is. It goes in as one bracketed
paste, the same mechanism a real paste already is, with the trailing space
kept inside the paste markers: Claude Code's own CLI (run as a shell command
today, its own kind of session later) drops the whole paste otherwise.

tmux was not on this machine either. Like ripgrep, that is a host dependency
rather than a code change, and it is installed.

(A dev server's port being noticed and offered is done — see below. More
than one shell per checkout, and ending a shell or a terminal session's
agent from the board, followed on 2026-09-25 — see further down.)

Closes TR-01 through TR-04, TR-06, TR-09 through TR-12, UI-12, UI-40.

Done when: a real shell runs on the board, is usable rather than only legible
for a full-screen program, survives the app closing, and a dev server it
starts is reachable without you hunting for the port.

TR-09 and TR-12, cut above, were brought back afterwards: a checkout's own
shell is watched for a `localhost`/`127.0.0.1` address in what it prints, the
same pattern Emdash's own terminal-output sniffing used, and the port itself
is polled (fast while it might just be starting, steady once it has answered,
two misses before it is called gone) so the checkout board's own `listening
on :<port>` line comes and goes with the server rather than only ever
growing. A session with something live in its checkout gets a small second
mark beside its lantern on the rail, the way a tool in trouble gets `✗` on
the `/agent` card. Pressing the line lays a browser board over the yard —
title, an address line, the page itself in the app's own `<webview>` — thin
on purpose, no history, no profiles, no DevTools. Driven: `python3 -m
http.server` started in a checkout's shell, the line appeared on the checkout
board, the page opened and rendered (a real directory listing) on the board,
and killing the server took the line back off within a couple of seconds.
Not here yet: the element-picker/screenshot handoff to the agent, and the
cart's own line for "set something running."

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

**A project's own copies are workspaces, and they hang from the beam.** A
worktree cut on purpose is no longer one session's: it is a workspace, holding
as many sessions as are working in it and none at all, and it stays standing
when its last one comes down. Once a project has one, the rule under its name
turns into a beam with a signboard hanging on two cords for each, the
project's own folder first, the one you are standing in painted gold; pressing
another walks into whichever session you were last in there, or starts a fresh
one if nobody is, and the rail carries only that workspace's lanterns. Command-N
inside a project asks its name and then cuts it and stands you in it, on a
session with nothing said to it yet (the name is the workspace's, never sent),
and closing the last session in a workspace starts a fresh one there instead
of walking you to another; both driven in a dev copy on a scratch repository. And so
does the dashed board at the end; on the island it still founds a project.
Command-T, and the naming board, start the next session in whichever workspace
you are in. Right-clicking a board offers to delete it outright, worktree,
branch and sessions; the first press looks inside and names what would be
lost, agents still working, uncommitted files and unpushed commits, and only
the second deletes. Driven on a scratch repository with a stray file and an
unpushed commit in the workspace: the warning named both, and the second press
left no folder, no branch and no board. Every session that used to have a worktree of its own becomes
a workspace of its own the first time the app opens. Driven in a dev copy on a
scratch repository: an old isolated session came up as its own board, a press
switched the rail across, command-N cut a real worktree and woke a session in
it, a second session joined it, everything came back after a restart, and two
right-clicks took the worktree down. The one you are standing in is renamed by double-pressing it
and writing over it on the board itself, return keeping it and Escape putting
it back; only the signboard changes, the branch keeps its name. Driven in a dev
copy on a scratch repository: renamed, kept across the store, and Escape left it. Any
workspace's board can be taken hold of and slid along the beam: it comes with
the pointer, swinging a little on its cords, the boards it passes step aside,
and let go everything eases into place and the order is kept on this machine;
the project's own folder stays first and the dashed board last, and a press
that never moved still walks in. Driven in a dev copy with four workspaces:
dragged right and left, kept across a reload, a plain press still walked in,
and a redraw mid-drag left the board in hand. Control and a number walks into
the nth board along the beam, in the order it hangs, the way command and a
number walks the rail. Driven in a dev copy with five boards: control-4 stood
in the fourth, control-1 went back to the folder, command-1 still took the
first lantern.

**A workspace says how it is from the beam.** Light spills out under each
board the way it does under a door, in the colour of its loudest session's
lantern: asking over broken over working over done over waiting out a limit,
breathing while somebody works and flickering while somebody asks, a red strip
filling as a limit runs out, and nothing at all while everybody in there is
idle. Done goes once you have stood in it. Driven in a dev copy: a fresh
workspace given a slow command lit warm under its board while home was
stood in, went green when it finished, and went dark after walking in.

**And says who is in there when it is pointed at.** Resting the pointer on a
board a moment brings a slab down under it: the workspace's name and branch,
then everybody in there, the ones wanting a look first, each in their
lantern's tone saying what their lantern says. Any board is renamed by a
double press, the one you are not in too, or from its right-click, which now
offers rename above delete. Rename had stopped saving altogether: its handler
had ended up inside delete's, so the board repainted and nothing was kept.
Driven in a dev copy: a slow double press on another workspace walked in and
kept the name, the right-click rename kept it without walking in, and the
slab listed both sessions with their states.

A project can be forgotten too, from the bottom of its own page, which is
what pressing its name opens, because forgetting a place is not something you
should meet on the way to the work in it. Two presses again, and the line in between says
what it costs: the folder stays exactly where it is, and every session cut from
it is taken down, because a project forgotten with its worktrees still on the
disk leaves them somewhere nothing in the village can reach.

All of it was driven, the second press included, against a copy of his
projects in a data folder of its own: the district went back to sea and its
slot came off the rack there and then. It used to stay drawn on both until the
app was restarted.

**The rack ends with the campfire while you are in a yard.** Standing in any
project, the last slot on the rack is the camp's own fire, pinned to the right
end however the projects are dragged around, "the island" when
hovered, and pressing it flies straight back out to the whole island from
wherever you are, boards and all, in one press rather than walking Escape all
the way down. Out on the water there is nowhere to come back from, so it folds
away to nothing. Driven: into a project off the rack, the fire slid in, hover
said the island, one press and the camera was out over the whole map with the
slot gone again.
Folding the rack away keeps both: the project you are standing in and the
fire out of it stay up beside the handle while every other slot closes up
into them. Driven: folded inside a project, only those two stood beside the
count; the fire still flew out, and folded on the water it was the handle
alone, unfolding to the whole rack again.
It folds itself as well: walking into a project shuts it and walking back
out to the island opens it, however it was left in between, and the whole
block of wood the handle's word sits on takes the press rather than only the
letters. Driven: in off the rack it arrived folded, a press on the bare
corner of the wood opened and shut it, and the fire out left it open.

**The rack is drawn, not boxed.** The flat brown bar of tan boxes is gone: a
log runs along the top of the window, each project hangs off it as a board of
three planks on two chains with its face nailed on, gold where you are
standing, and past an iron band the sky, the windmill and the fire home hang
as small round tokens so they no longer read as projects. All of it is drawn
by `tools/make-rack.py` in the kit's own outline and wood, at two whole pixels
a pixel. Driven: out on the island and folded inside a yard, hovering burned
the name into the beam, the asking glow followed the board's own outline, and
a board dragged along the beam landed where it was let go.

**Rope, not iron, marks where the doings start.** The dark band that hung
under the beam is a lashing of rope bound round it now, sitting on the log.
Driven: looked at on the island in the running app.

**The beam carries no word.** "projects" is gone off the log; folded, the beam
itself takes the warm or red light when anywhere wants him. Driven: open and
folded on the island, and the beam lit warm while folded.

**The rack folds like something hung, and names what you point at.** A press
anywhere on the beam folds it, a drag on the beam still carries the window;
the boards go up behind the beam in turn and come back down in turn, where
they used to blink, because every repaint was taking each board off the rack
and hanging it straight back. Pointing at a board drops its name under it on a
small chained board that slides along to the next, and a face sits in a square
carved into its planks. Driven: filmed both ways frame by frame, the beam
pressed to fold and unfold, a drag on it moved the window and left the rack
as it was, and the tag slid from board to board.

**The rack is in whatever order he drags it into.** Holding a slot and
dragging it along the rack lifts it out, the slots between step aside to open
its gap, and letting go hangs it there for good; a press that never really
moved still just opens the project. Each keeps its own stand-in prop wherever
it hangs, and the number keys out on the island follow the new order. Driven:
dragged left and right across the rack in the running app, landing where it
was let go, still there after the list was read back off disk, and a plain
click still walked into the project.

**A project has settings, in a window of their own.** Pressing its name, top
left of its yard, pops a window up over everything: settings are about the
place and not the work, so this is the one thing not laid over the yard, and
it closes on its mark, on Escape, or on a click anywhere outside it, with the
session underneath exactly as it was. The icon comes first: every image in the
checkout is looked through and the ones named like a face (an icon, a logo, a
launcher) are laid out in the rack's own slots, one of each however many sizes
and copies the repository keeps, with the kit's default beside them, a button
to show the rest and one to choose a file from anywhere. Picking one copies it
in, so it outlives wherever it came from, and the rack wears it at once. Its
name is typed straight into the window (the folder keeps its name, and so do
its worktrees). Every new session can be sent into its worktree with whatever
git ignores that it would otherwise be missing (the `.env`, the local keys,
`node_modules`), ticked off a list. It can be shown in the Finder and removed,
the second of which takes two clicks. A project that has just moved in opens it
first.

That window grew one heading at a time until it was eleven of them in one long
scroll, so it is pages now, down a rail on its left, each with a line under its
name saying what is set there: General (the icon, what search leaves out,
removing it), Sessions (what happens to a conversation when one ends, the ones
that have, and the environment every session carries), Own copies (the files
and the four scripts that only matter to a session in its own worktree, and
it says so), Timetable and Git. Whatever is written saves on leaving the field
and says "saved" beside its heading. The timetable is a form now rather than a
row of words that cycled when pressed, and offers only the agents actually
installed here, the default first. And an "every few hours" schedule counts
from when it was made, rather than cutting a session the moment it was added.
Driven on a scratch project: every page, a schedule added and kept on disk
without firing, a script saved, keeping and deleting what was said flipped,
Escape out.

And anything laid over the yard now closes on a click outside it. It used to
swallow every click that was not on something gold, so Escape was the only way
out and nothing said so.

Driven on a copy of his projects: aurio's window found its launcher icon
first, picking it put it on the rack, renaming it from the window rewrote the
yard's header and the rack, ticking `.claude/` was written into the registry's
own config for that repository, and the window and the checkout board both
closed on a click outside them. Not driven: choosing a file from elsewhere and
founding itself, which both need the native dialog, and a session actually cut
with something sent along.

Not here yet: cloning or creating a repository rather than pointing at one,
relinking, choosing what a worktree is cut from, and a checkout's trouble
showing on the district.

**A project can say who its commits go out as.** A new section on the same
window, "commits go out as," holds two plain lines, name and email; blank
means whatever git would already use. Setting either writes it into the
project's own record, and every worktree cut for that project afterwards gets
it as a local `git config user.name` / `user.email` in that worktree alone —
never the machine's global config, and never a project without an override.
Driven: typed both fields on a scratch project, watched the record hold them
after a close and reopen, and confirmed the same write function sets a real
checkout's local git config correctly.

**A checkout can arrive three ways now, not just already on disk.** Command-N
or the campfire opens a small board over the island — "found a project" —
with three lines: pick a folder (the old dialog, unchanged), clone a
repository, or start a new one. Cloning asks for an address and hands it to
the same git runtime a worktree is cut with; starting a new one asks for a
name and toggles private/public, then runs whatever `gh` this machine has
signed in. Both land the checkout under `~/mender/projects`, inspect it the
same way a picked folder is inspected, and open straight into its settings
the way a fresh folder-pick already did. Driven: cloned a local bare
repository end to end — the district appeared, its settings opened with
"has moved in", and a bad address came back on the same banner a folder pick's
own errors use ("That would not clone: fatal: repository '…' does not
exist"). Not driven: starting a new one, on purpose — the only backend for it
is the real `gh` on this machine, signed in to a real account, and creating a
real repository to test with is exactly what this job is not allowed to do.
That path was read closely instead of run, and it is the one place in this
feature to look first if it turns out to be wrong.

**A project can say what runs when a worktree is cut.** A fourth section on
the settings window, "what runs when a worktree is cut," holds four plain
lines — prepare, setup, run, teardown — each just a line of shell, blank
meaning nothing runs. No separate on/off switch: setting one is what turns it
on, the same way ticking a carried file already worked. Prepare gates a
session's start; setup and run keep going after, through Emdash's own
workspace registry, unchanged. A session that fails to start over an
unreachable registry still starts — a script that never got to run is a
worse morning than a session with a plain checkout, never a reason to refuse
one. Driven: set a project's prepare to `touch prepared.marker`, cut a real
session, and watched `prepared.marker` land inside the fresh worktree before
the agent's own first turn began. Not yet here: showing the script's own
progress on the board while it runs (today "cutting a worktree…" covers the
whole wait, prepare included, rather than naming the step), and a way to
re-run setup, run or teardown by hand from the checkout board — both are
sized right for a follow-up pass, not this one.

**A fifth section says whether this machine is signed in to GitHub, and as
whom.** Mender keeps no per-project account of its own — MENDER.md is
explicit that the village is to GitHub whoever `gh` on this machine already
signs in as — so this is a machine fact living on the one settings surface
that exists today, not a per-project picker Emdash has and Mender doesn't
want. Signed in shows "connected to `<host>` as `<login>`" and nothing to
press, quiet being the default here same as an agent's own auth line. Signed
out shows why and a "Sign in…" line: pressing it starts `gh`'s own device
flow, opens the browser to it, and the line itself becomes the one-time code
the moment `gh` prints it — the flow keeps running in the background after,
so finishing it in the browser and reopening settings is what shows
"connected" next. No `gh` on the machine at all says that plainly instead.
Driven: real signed-in state read correctly against this machine's own `gh`;
the signed-out and sign-in-started states were driven against an isolated
`GH_CONFIG_DIR` pointed at an empty scratch folder, never against a real
account, and the device-flow subprocess it started was killed before
anyone could finish it in a browser. Not done: nothing pushes an update to
an open settings window when the browser flow finishes on its own; reopening
it is what asks again.

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

This section went stale: the windmill itself was built in the wave after this
was last written, and nothing here was ever come back to update it. It is real
now, reached by ⌘, or "settings" in the finder — General (who a fresh session
starts with), Checkouts (branch prefix, random tail, where new projects and
worktrees land), Terminal (font size, default shell), Keys (every chord,
rebindable), Agents (extra args and env per agent, which install runs), what is
on disk, and this machine's live cpu/memory/disk — one page, scrolling, not yet
an island of its own on the water. Driven 2026-09-29: opens on General at the
top every time (it could land mid-scroll on the disk section before, which
read as no settings page at all — fixed the same day it was caught).

What follows below was written before the windmill existed and describes an
earlier, narrower state — treat it as history of how this wave got here, not
as the current truth. What has landed is one of its capabilities on a board
that already exists, because it belongs to a session as much as to the app:
who could work in a building.

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

The windmill exists now, reached by ⌘, or "settings" in the finder, over
everything, closing on click-outside or Escape like a project's own settings
do. Its General page is one real thing so far: who a fresh session starts
with, a row of the same "who works here" names the card already knows, driven
end to end — picking one is saved, survives a restart, and a fresh session
now actually launches that agent rather than always Claude Code (it silently
never had before this: the launch call was reading a hardcoded name and never
consulted the setting at all, so nothing past the display line worked until
now). Everything else the windmill wants to hold — updating and
authenticating agents, MCP, skills, accounts, task defaults — is still not
here.

**done (driven, 0.65.1):** the windmill is laid out like a project's own
settings now rather than one long scroll: pages down a rail on the left
(General, Checkouts, Terminal, Keys, Agents, On disk, This machine), each
saying under its name what is set there, choices as chips, fields with labels
in a column, and "saved" beside a heading once something took. General only
offers agents actually installed, with a line saying how many more could be;
Agents picks one agent at a time instead of stacking every one; chords are
key caps; the machine's cpu, memory and disk are bars. Clicked through every
page in a dev instance, toggled notifications both ways and rebound a chord
and put it back.

Riding alongside it, two more session defaults, both driven: an agent's model
and mode are now remembered against the agent itself the moment you change
either on a live session, and a fresh session with that same agent starts on
whichever was last picked rather than on nothing. And the line is no longer
silent about what you were in the middle of saying — a half-written line is
kept against its session as you type and put back the moment you return to
it, restart included, and cleared the moment it is actually said. It stays
with its own session: stepping to another along the rail or the rack leaves
it behind rather than carrying it onto someone else's line. "Allow
everything chosen at the start" — a switch on starting a fresh session itself
— is not done: modes are only known once an agent is awake, so setting one
before it has even spoken needs a real design pass, not a guess.

Closes ST-01 (part), ST-04 through ST-06, ST-10 through ST-14, ST-17 through
ST-21, ST-28 through ST-31, AG-07, AG-09, AG-10, AG-11, TR-07, FS-32, UI-16.
ST-07 is done.

Done when: the island exists and holds every app-wide setting; agent CLIs can be
installed, updated, authenticated and pinned from it; MCP servers can be added
and edited rather than only switched on and off; skills can be installed and
written; and accounts connect.

### W9 — the village is alive · started

Mostly art and behaviour rather than ledger rows, and the one wave whose payoff
is purely how it feels.

Done, driven in a scratch dev instance against his real project folders
(2026-10-01): the sky follows his real clock and real weather (an overcast
morning came through as overcast), and can be held at any hour or weather from a
right-click on the water, on a panel with an hour slider coloured by the
island's own light and the weather as pixel pictures. Night relights every pixel
rather than darkening it: lamps come on one by one, their light cast per pixel
with shadows from walls, trees and fences and dithered rather than ringed, each
with a glow at the glass, flags staying readable over the night, and the sky
panel also opening off a slot on the projects rack,
the fire lights the ground round it, every house's window panes glow, warm in an
empty one and in the session's colour where there is one, and people carry
lanterns.
Clouds, rain (slanted, ringing the sea, ground left wet), storms with lightning,
snow that settles on grass and roofs and leaves the paths, (clear ice blocks in the
open sea under lying snow are built and driven but switched off for now,
2026-10-09), fog, stars in a
still sea. Chimney and fire smoke, sparks, fireflies, gulls, butterflies,
jumping fish, autumn leaves. Every open session is a villager walking its own
patch by what it is doing, every helper it has out is a hooded one walking from
its door, and nobody else is on the island. A district whose project has gone
weeks without a commit or a word from any of its sessions dries out and grows
moss and weeds. Measured:
in front of everything the island costs what it did before within noise; behind
another window it adds a small slice.

Not yet: real sessions and real helpers walking were driven only with stand-ins
in the scratch instance (the island's own session data drives them in the
installed app); nobody walks between districts or carries anything that says
what tool is running; the dog and the cat drawn for it are not out yet.

Closes AG-18, AG-38, AG-40, FS-29, and the unnumbered work: a diagram drawn on
the wood in the same lines everything else is drawn in, villagers that walk and
carry a session's identity, what happens when a project has more sessions than
its district has houses or the island has more projects than districts, and land
that retracts when a project is abandoned.

Done when: you can tell from the water who is working, who is stuck and who is
waiting for you, without opening anything.

### W10 — work that runs itself

Other machines were cut on 2026-09-25: Kirubel does not want a project living
on another computer, so SSH hosts, the remote workspace server, port forwarding
and everything that says which machine a thing is on are gone from the list
(WS-04, TR-10, TR-13, TR-14, TR-16, TR-19, ST-32). The back end for them stays,
unused, because it is upstream's. What is left here is TR-15, TR-17, TR-18,
TR-20, ST-22, UI-15 and UI-41.

Done when: a session can be scheduled to start without you.

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

And now it does tell him. A villager who asks a question, finishes a turn, or
breaks, while the window is not the frontmost thing on his screen, gets him a
plain macOS notification in the village's own voice — the session's name and
the same present-tense line the fire already shows — and clicking it brings
the window forward and stands him in that yard. Nothing when the window is
already in front, so a banner never doubles a lantern he is already looking
at. No settings, no toggle: it either happens or it doesn't. Driven with a
real Claude session left running in the background: the main process read the
mood the island already reads, constructed the notification with the fire's
own line as its body, and the click hands off to the same `go()` a rail press
or a finder pick already uses. `apps/mender/src/main/attend.ts`.

And an answer that ends by asking him something now counts as asking, not as
finished. The asking mood only ever came from a permission prompt or Claude's
own pick-a-choice form, so a session whose last line was "that ok to build?"
settled to finished, and standing in it, finished reads as idle: he closed one
on exactly that (2026-10-11). Now a finished turn whose last line asks for his
word is the asking mood, and everything that already reads that mood reads
it: the lantern says "asked you something" in the orange, the house glows
orange with the villager turned to the door, the rack's stud, the dock dot,
the banner, the missed line and ⌘U all pick it up, and it holds until he
says something back, across a restart too. A question mid-answer does not
count, only the foot of it, and a turn he stopped or that broke never does.
The recap still writes over it, it still goes home on its own, and closing
the village on one does not tell it to carry on, since nothing was cut off.
Driven in a dev instance with a real Claude turn: asked, the rail went orange
and the house lit; answered, it went back to idle.
Only the last sentence of that last line counts, and never one hanging off
an "if": the check read the whole closing paragraph, so "if that bugged you,
say so. I left it alone." lit the lantern orange over nothing to answer
(2026-10-11).
`apps/mender/src/main/asked-you.ts`.

And quitting on top of a lit fire says so before it happens, rather than
cutting every running turn with no notice. `Cmd+Q`, the app menu's own Quit,
and the window's close box all fall through one gate in the main process
(`apps/mender/src/main/quit.ts`, its timing rule pinned down in
`quit-gate.ts`): with nobody working it is the one press it always was, and
with a villager lit it turns the window dark and puts one line up —
"`<n>` villagers are still working. quit anyway?" — the same shape as every
other two-press cost on the wood. A second press of that line, or the chord
again before it withdraws, is the only way through; anything else, including
just waiting four seconds, is no. Driven live: called the renderer's own
`showQuitCost` over the debug port and watched it darken the island and put
the line up, pressed it and watched it call back through the exposed
`confirmQuit` bridge into the real `ipcMain` listener, and clicking elsewhere
on the darkened window withdrew it. Could not script the actual `Cmd+Q`
accelerator itself over CDP — a native menu shortcut is caught by macOS
before it ever reaches the page — so the gate's own timing (first press asks,
second within four seconds allows, a stale press or one after the window
closes just says no) is instead pinned down with `quit-gate.test.ts`.

And the dock icon carries a small mark whenever anything anywhere is asking
or hurt, gone the moment nothing is — not a count, which is a UI convention
this app otherwise avoids everywhere else, just the one dot answering "does
anything want me" (`apps/mender/src/main/badge.ts`, watching the same mood
map `attend.ts` and the rack already read). Verified the module loads and
runs without error in the real dev app and pinned the one rule worth a test
(`badge.test.ts`: nobody working is false, merely working or resting is
false, anybody asking or hurt is true) — but could not see the mark itself:
the debug-port window is deliberately an accessory app with no dock tile at
all (see `openVillageWindow`'s own comment on why), so there was nothing on
screen for a badge to sit on.

And the Mac cannot sleep out from under a working agent any more: for exactly
as long as any lantern anywhere is lit — actually generating, not merely
asking or resting — a `powerSaveBlocker` holds the lid open
(`apps/mender/src/main/awake.ts`, watching the same mood map as the rest of
this wave), and it lets go the instant the last one stops. Nothing to look at
and nothing to press. Verified for real, not just read: sent a real Claude
session a shell command with a few seconds of work in it and watched
`pmset -g assertions` show a `NoIdleSleepAssertion` against the app's own
process while it ran, then confirmed the assertion was gone once the turn
was cancelled — the actual macOS power state, not a mocked call.

And the window reopens exactly where and at whatever size he last left it,
rather than the fixed 1480×1020 it always opened at before. A moment after it
stops being moved or resized it is written down
(`apps/mender/src/main/window-state.ts`); the next launch reads it back and
opens there, but only if that rectangle still lands on a display that still
exists — a window remembered from a bigger monitor since unplugged would
otherwise be gone off the edge of the world, not restored, so `fitsSomeDisplay`
checks it against whatever `screen.getAllDisplays()` says right now. That rule
is the one part worth pinning down with a test (`window-state.test.ts`), since
the bug it guards against looks like nothing at all — the app would seem to
hang or open invisibly. Driven for real: moved and resized the actual (if
invisible, over the debug port) window with `window.moveTo`/`resizeTo`, read
`window-state.json` back to confirm it settled 400ms later, killed the whole
process tree, relaunched from the same data dir, and read `window.screenX` /
`screenY` / `outerWidth` / `outerHeight` back — the exact rectangle came back.

And the menu bar is Mender's own now, not Electron's stock one — which
carried a live "Reload" that would have dropped him out of whatever board he
had open, a raw DevTools entry, and an About panel that said "Electron."
`apps/mender/src/main/menu.ts` replaces it with just what macOS needs: an
app menu (About Mender, Settings… on ⌘,, Hide/Hide Others/Unhide, Quit), a
standard Edit menu (Undo/Redo/Cut/Copy/Paste/Select All, for the write line),
and Window (minimize/zoom/close). No File, View, or Help menu, because there
is nothing under any of them. Settings is the one item the menu cannot do
itself — only the page can raise the windmill — so it asks over
`MENDER_MENU_CHANNEL`, landing on the identical `go('do:windmill')` the ⌘,
chord already calls. Driven: confirmed the app boots clean with the menu
installed (a bad role name would throw before the window ever opens) and
drove the ⌘, chord itself over the debug port to confirm it raises the
windmill — the same code path the menu item's click handler hands off to.

And the top of the window holds like a title bar again. The frame hides its
own, so a drag up there used to pan the island and a double-click did
nothing. `apps/mender/src/renderer/grip.ts` takes a press in the top strip
that lands on nothing pressable (the canvas, or the rack's bare wood marked
`data-grip`) and the main process (`src/main/grip.ts`) moves the window after
the real cursor; a double-click does whatever the Mac's own title-bar setting
says. Driven over the debug port: the top strip reads as holdable on the island
and in a yard, the rack's slots do not, and a double-click there zoomed the
window to fill and back.

And what happened while he was away is said once when he comes back, rather
than left for him to piece together lantern by lantern. `attend.ts`'s own
rule for who just started wanting him — asked, broke, or a turn finished — is
reused verbatim (`apps/mender/src/main/missed.ts`); while the window is not
the frontmost thing, whatever that rule catches is held rather than
forgotten, and the moment he actually comes back after being gone 30 seconds
or more, one line says it, capped at four named and the rest folded into "n
more". It stands over the top of the island itself — no box, no dismiss, not
gold, since it isn't pressable — reads for a few seconds, and fades on its
own, the same way a result on the wood settles back once it has had time to
be read. Pulled the one part of this worth pinning down —
which sessions actually get named, capped, with a title that has gone missing
dropped rather than mis-counted into the overflow — into its own pure
function and caught a real off-by-one with it before it ever ran
(`describeMissed`, `missed.test.ts`): a title-less entry was being folded into
"1 more" instead of just left out. Driven for real: confirmed the line
renders and reads correctly over the debug port (`showMissed` imported
straight off the dev server and called with real lines) and watched it fade
and remove itself after its own stand time, without touching anything to
close it.

And the empty hook at the end of the rail remembers the one session just
taken down in a project, for the rest of that sitting. `tasks.ts` stashes it
in memory the moment `abandon` runs — never written to disk, the same way the
agent itself is not woken back up by a restart — and clears it again the
moment it is either put back up or something else is taken down in its
place. Pressing the empty hook now asks the registry whether one is on
offer and, if the name is still empty, writes one extra line above the usual
"say what you want doing": `put <name> back up?`. Pressing it cuts a fresh
worktree straight from that same branch — `createWorktree` already reuses an
existing `refs/heads/<branch>` rather than cutting from a base ref, so this
is the very same branch, not a new one under the old one's name — and opens
it exactly as a freshly begun session would. Typing a name instead makes the
offer stand aside; nothing is lost either way, since the offer is only
consumed by actually pressing it. Driven for real, end to end, through the
live wire client rather than the canvas (clicking a district's exact hotspot
over CDP did not land reliably in the time available): began a real task,
abandoned it, confirmed `revivable` answered with its title, called `revive`
and got back a task on the identical branch, and confirmed on disk that the
new worktree really did check out that branch rather than a fresh one off
`master`. Confirmed `revivable` answers `null` again immediately after. Did
not confirm the board's own line and press over the canvas — the renderer
wiring (`askName`, `asking()`, `press('revive')`) follows the exact pattern
every other pressable board line already uses and was typechecked and linted
clean, but only the back end was driven live.

The naming board also offers "start from an open issue" now, under the usual
"say what you want doing" line. Pressing it turns the board over to the
project's own open issues — `gh issue list --state open --json number,title`,
run in the project's own folder so `gh` works out which repository that is
the same way it already does everywhere else in the village, read-only.
Picking one writes `#<number> <title>` onto the line, exactly as if it had
been typed, so it becomes the session's name and the first thing said to the
agent the same way anything else typed there does. Driven for real: the line
appears, pressing it shows "asking github…" and then resolves — against a
throwaway local repository with no GitHub remote it correctly falls back to
"nothing open, or nothing to ask." rather than hanging or throwing. The happy
path (a real repository with open issues) is typechecked and reviewed but not
driven against real data, since the throwaway test repo has no remote.

Also confirmed, without writing any new code for it: a session that was
mid-turn genuinely is not silently lost when the app dies rather than quits
cleanly. Began a real task, `kill -9`'d the whole Electron process tree
rather than quitting it, relaunched against the same data dir, and the task
was still there — same id, same branch, worktree untouched on disk. This was
already true before this wave: tasks live in `tasks.json` and the worktree
and branch are git's, neither is app state that a crash can drop, and
`MENDER.md`'s own "waking every session at boot was dropped on purpose"
note already covers what happens next — nothing is auto-woken, the lantern
comes back `resting`, and opening it wakes the agent same as any other
restart. Not a new build; called out because the brief asked for it
explicitly and it is worth having confirmed rather than assumed.

Not here yet: recovering from a bad boot.

Closes UI-01 through UI-04, UI-27 through UI-29, UI-42, ST-09, ST-34,
ST-35, TR-23.

Done when: it launches from the Applications folder, recovers from a bad boot,
and updates itself.

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
- The preview-server pill and the titlebar it sits in (TR-11, UI-40). There is
  no titlebar. (The in-app browser itself, TR-12, was cut here and later
  brought back in its own village shape — see W6.)
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
- Everything emdash needs because it is a conventional app (cut 2026-09-25): a
  boot splash, a recovery window, onboarding and a welcome screen (UI-01..04),
  its project header menu and task titlebar (UI-06, UI-10), a settings view
  (UI-16, the windmill is it), a system tray (UI-28), the modal catalogue
  (UI-36), activity badges, a connection dot and an update indicator (UI-38,
  UI-41, UI-42, WS-22), the update card and stepped loader (TR-23, TR-25), a
  theme (ST-10), the interface and browser-profile settings (ST-12, ST-14),
  importing other tools' config (ST-26), an emdash account (ST-28), several
  GitHub accounts or one per project (ST-29, WS-10; the village is whoever
  `gh` signs in as), self-update (ST-34) and telemetry (ST-35).
- Other machines (WS-04, TR-10, TR-13, TR-14, TR-16, TR-19, ST-32). Every
  project lives on this Mac. The same goes for the rail on a phone, which was
  only ever a cmux idea and is not a row.
- The whole diff-review apparatus: a floating action card on a selection
  (WS-37), preview against pinned diff tabs (WS-38), prefetched diffs on hover
  (WS-39), a stacked multi-file diff (FS-26), a flat-or-tree setting for the
  changes list (ST-15), a titlebar breadcrumb and git popover (UI-09), and diff
  stats on sidebar rows (UI-39). Each needs a selection, a tab strip, a pointer
  that rests, a settings surface, a titlebar or a sidebar, and there are none.
- Image diff (FS-27). A picture is never drawn on the wood; a changed image
  says that it changed.
- Typed reasons a host or a remote runtime can fail to resolve (AG-21), an
  in-app remote-aware file tree for pickers (WS-11, FS-34), and other
  issue-tracker integrations, several GitHub accounts and the plugin
  architecture that would host them (WS-54, ST-31 — AG-10, ST-30 already
  covered honestly enough by the one account `gh` signs into). All of it is
  for machines and services this install does not have (cut 2026-09-29).
- Three session credential modes (WS-52). The village is already to GitHub
  whoever `gh` on this machine signs in as, said plainly a page up; a second
  switch offering `system` or `none` on top of that one fact is a knob for a
  choice that was already made (cut 2026-09-29).
- A live preview of the git commands founding is about to run (WS-15) and a
  glyph for a lifecycle script's own progress while it runs (TR-24). Both
  are true today and neither has cost him a moment yet: a setup script that
  fails already says so plainly, on its own board, which is the one state
  that matters (cut 2026-09-29).
- Seven more `tasks` defaults (ST-04), MCP servers explicitly synced across
  every agent CLI at once (ST-20), and per-project settings written out
  shareable for a team (ST-25). A session can already start allowing
  everything or on its own branch from the naming board itself, which is
  where those choices actually get made turn by turn; nobody else is on this
  install to share a settings file with (cut 2026-09-29).
- Which external app opens a file, and which are hidden from the list
  (ST-11). `$VISUAL`, `$EDITOR` and whichever of Cursor, VS Code or Zed is on
  this machine already resolve it without being asked (cut 2026-09-29).
- Multiple accounts per issue tracker, other issue trackers themselves, and
  a second way into GitHub on top of the one that already works (AG-10,
  ST-30, ST-31). Asked for directly: he does not use them (cut 2026-09-29).
- Auto-copy on selection and treating option as meta, the two `terminal`
  settings left over once font size and the default shell already had a
  real page. Asked for directly: not wanted (cut 2026-09-29).

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
| AG-07 | MCP server management, scoped per agent | done |  |
| AG-08 | Workspace trust pre-authorization | kept |  |
| AG-09 | Per-agent auth status detection | done | W8 |
| AG-10 | Multi-account registry (issue trackers etc.) | cut |  |
| AG-11 | CLI dependency install/update/uninstall | done |  |
| AG-12 | Agent-process environment sanitization | kept |  |
| AG-13 | Session idle policy & automatic teardown | done |  |
| AG-14 | Session intents — persisted resume state | done |  |
| AG-15 | ACP session launch / TUI session start contracts | kept |  |
| AG-16 | Conversation index | kept |  |
| AG-17 | Conversation lifecycle reporting | kept |  |
| AG-18 | Agent status derivation & unread badge | part | W9 |
| AG-19 | Live conversation auto-titling from the agent | done |  |
| AG-20 | Normalized transcript event vocabulary | part | W2 |
| AG-21 | Host/runtime availability states | cut |  |
| AG-22 | Transcript row kinds (message, tool, subagent, thinking, file-op, execute, diff, resource-link, plan, working, turn-outcome) | part | W2 |
| AG-23 | Virtualized, auto-growing transcript scroll (draws the most recent stretch only, older revealed a chunk at a time; not driven at hundreds of real turns) | part | W2 |
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
| AG-38 | Mermaid diagram, drawn in an answer (colored to the wood, via `beautiful-mermaid`, panned and zoomed with the wheel and a drag) | done | W9 |
| AG-39 | Copy-to-clipboard affordance — anything written, dragged across and copied on release | done | W2 |
| AG-39a | Links in an answer, pressable and gold, opening in the system browser | done | W2 |
| AG-39c | Pictures in an answer: a markdown image is drawn where it was written, several side by side with their captions, and every session is told they show so a place it suggests comes with a look at it | done | W2 |
| AG-39b | Export the transcript as markdown, from the session card | done | W2 |
| AG-40 | Agent status glyph (inline indicator) | cut | W9 |
| AG-41 | Agent selector | done |  |
| AG-42 | Model selector with hover-detail card | done |  |
| AG-43 | Permission mode & collaboration mode selectors | part | W2 |
| AG-44 | Session MCP servers indicator | done |  |
| AG-45 | Context-window usage indicator, with what it has cost so far on the same line | done | W2 |
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
| WS-02 | Add Project modal — Create Repository | done | W7 |
| WS-03 | Add Project modal — Clone Repository | done | W7 |
| WS-04 | Project host — local vs SSH ("Machine") | cut |  |
| WS-05 | Repository inspection / creation errors | part | W7 |
| WS-06 | Rename / delete / relink a project | done |  |
| WS-07 | Project availability banner / disabled-action guard | part | W7 |
| WS-08 | Project settings & config sharing | part | W7 |
| WS-09 | Worktree directory setting | done |  |
| WS-10 | GitHub account per project | cut |  |
| WS-11 | Project directory/file tree browsing (for pickers) | cut |  |
| WS-12 | Create Task modal | done |  |
| WS-13 | Workspace presets (5 kinds) | part | W7 |
| WS-14 | Branch conflict detection & reuse offer | done |  |
| WS-15 | Setup step preview | cut |  |
| WS-16 | Git plan compiler (branch/PR provisioning) | kept |  |
| WS-17 | Task/workspace creation execution | done |  |
| WS-18 | Worktree path derivation | kept |  |
| WS-19 | Worktree creation/removal execution (git ops) | part | W7 |
| WS-20 | Task lifecycle actions | part | W7 |
| WS-21 | Task palette | done | W1 |
| WS-22 | Activity badge (workspace lifecycle) | cut |  |
| WS-23 | Delete Task modal — informed preflight | done |  |
| WS-24 | Workspaces tab (per project or per machine) | done |  |
| WS-25 | Workspace row actions (Open in Task / Clean Artifacts / Delete) | part |  |
| WS-26 | Bulk "Delete workspaces" | part | W7 |
| WS-27 | Workspace removal / path-issue / script-issue states | part | W7 |
| WS-28 | Observation freshness (fresh/stale/offline) | done |  |
| WS-29 | Checkout store (stage/unstage/discard/commit/push/pull/publish) | done | W3 |
| WS-30 | Git action toasts | done | W3 |
| WS-31 | Git error vocabulary | done | W3 |
| WS-32 | Repository store (branches/remotes/provider identity) | kept |  |
| WS-33 | Repository-level wire contract (worktrees/refs/remotes/fetch) | kept |  |
| WS-34 | Branch reference model | kept |  |
| WS-35 | Branch selector components | part | W8 |
| WS-36 | Staged/Unstaged sections | done | W3 |
| WS-37 | Floating action card on selection | cut | W3 |
| WS-38 | Preview vs pinned diff tabs | cut | W3 |
| WS-39 | Prefetched diff models on hover | cut | W3 |
| WS-40 | Commit card | done | W3 |
| WS-41 | Diff main panel | done | W3 |
| WS-42 | Commit history / blame | done | W3 |
| WS-43 | CI check runs | done | W4 |
| WS-44 | Draft line comments (agent-directed notes) | done | W3 |
| WS-45 | PR data model | kept |  |
| WS-46 | PR list/filtering (project level) | cut | W4 |
| WS-47 | PR entry (inside a task's Changes panel) | cut | W4 |
| WS-48 | Merge footer (3 strategies + bypass) | done | W4 |
| WS-49 | Create PR modal | done | W4 |
| WS-50 | PR-checkout association / drift / sync coordination | kept |  |
| WS-51 | Credential-helper loopback channel | kept |  |
| WS-52 | Three session credential modes | cut |  |
| WS-53 | Operation-scoped credential injection | kept |  |
| WS-54 | Integration plugin architecture (account-level) | cut |  |
| WS-55 | Issues plugin architecture | kept |  |
| WS-56 | Issue linking UI | done | W4 |
| FS-31 | Open a checkout or a file in the owner's own external editor | done | W5 |
| WS-57 | PR selector (linking a PR to a task) | done |  |
| WS-58 | Shared exclusion-policy engine | kept |  |
| WS-59 | PR review comments + failed checks, handed to the agent | done | W4 |
| TR-01 | Interactive terminal panes | done | W6 |
| TR-02 | Terminal grid sizing (multi-pane resize) | cut | W6 |
| TR-03 | Off-screen terminal host / instant tab switching | cut | W6 |
| TR-04 | Terminal persistence via tmux | done | W6 |
| TR-05 | Terminal exit/kill semantics | kept |  |
| TR-06 | Shell resolution & selection | done | W6 |
| TR-07 | Terminal appearance & behavior settings | done | W8 |
| TR-08 | Terminal environment (theme signaling, agent env) | kept |  |
| TR-09 | Automatic dev-server URL detection | done | W6 |
| TR-10 | Manual port forwarding (SSH workspaces) | cut |  |
| TR-11 | Preview server pill (task titlebar) | cut | W6 |
| TR-12 | In-app browser (Emdash Browser) | done | W6 |
| TR-13 | Add/edit/connect a machine | cut |  |
| TR-14 | Machine status indicator | cut |  |
| TR-15 | Host settings (per-machine defaults) | part | W10 |
| TR-16 | Workspace server (remote runtime daemon) | cut |  |
| TR-17 | Machine resource monitoring | done | W10 |
| TR-18 | Host system dependencies | part | W10 |
| TR-19 | Machine's conversations/workspaces lists | cut |  |
| TR-20 | Workspace disk usage | done | W10 |
| TR-21 | Bound exec primitive | kept |  |
| TR-22 | Execution planning / shell quoting | kept |  |
| TR-23 | Update card (shared component) | cut |  |
| TR-24 | Script status indicator | cut |  |
| TR-25 | Stepped loader | cut |  |
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
| FS-10 | External drag-in (import) | part | W5 |
| FS-11 | Drag-out to compose/elsewhere | done | W5 |
| FS-12 | Flat-mode listing | cut | W5 |
| FS-13 | Row decoration (git-status badges, tone) | done | W5 |
| FS-14 | File icons by extension | cut | W5 |
| FS-15 | Filename / quick-open search | done | W1 |
| FS-16 | Content ("find in files") search | done | W5 |
| FS-17 | Search-results tree | done | W5 |
| FS-18 | Files RPC contract (fs.*, tree, content) | kept |  |
| FS-19 | Open-file store (editor tab lifecycle) | kept |  |
| FS-20 | File-kind renderer routing (text/csv/markdown/html/svg/image/too-large/binary) | part | W5 |
| FS-21 | Monaco text editor | cut | W5 |
| FS-22 | CSV renderer, read as a padded table in the board's own type | done | W5 |
| FS-23 | Markdown/HTML/SVG/image renderers (html and svg still route as plain text) | part | W5 |
| FS-24 | Text diff (Monaco diff editor) | done | W3 |
| FS-25 | Inline review comments on diff lines | done | W3 |
| FS-26 | Stacked multi-file diff view | cut | W3 |
| FS-27 | Image diff view | cut | W3 |
| FS-28 | Binary diff fallback | done | W3 |
| FS-29 | Mermaid diagram, drawn from a `.md` file's fenced block, panned and zoomed the same as an answer's | done | W9 |
| FS-30 | Image viewer (contained/expandable/standalone/zoom-pan chassis) | cut | W5 |
| FS-31 | Shared file-watching service | kept |  |
| FS-32 | Exclusion policy settings UI | done | W8 |
| FS-33 | Disk usage measurement | kept |  |
| FS-34 | Directory selector (in-app column browser) | cut |  |
| FS-35 | Workspace path containment (security) | kept |  |
| ST-01 | 13 settings pages (General, Integrations, Interface, Browser, Repository, Prompts, System, Workspaces, Conversations, Agents/CLIs, MCP, Skills, Machines) | part | W8 |
| ST-02 | Settings storage model (SQLite override + safeStorage secrets) | kept |  |
| ST-03 | Provider/integration accounts registry | kept |  |
| ST-04 | `tasks` settings (7 fields: auto-name, auto-approve, auto-trust, create-branch, delete-branch, capitalization, issue-context) | cut |  |
| ST-05 | `project` settings (push-on-create, branch prefix, random suffix, tmux-by-default) | part | W8 |
| ST-06 | `localProject` settings (default projects dir, default worktree dir) | done |  |
| ST-07 | `defaultAgent` setting | done | W8 |
| ST-08 | `keyboard` overrides | done | W1 |
| ST-09 | `notifications` settings (enabled, sound, custom sound path, OS notifications, sound-focus-mode) | part | W11 |
| ST-10 | `theme` setting | cut |  |
| ST-11 | `openIn` settings (default + hidden apps) | cut |  |
| ST-12 | `interface` settings (task-hover action, auto-right-sidebar, 3× show-left-sidebar-metadata switches, hide-context-bar) | cut |  |
| ST-13 | `terminal` settings (font family/size, auto-copy, mac-option-as-meta, default shell) | part | W8 |
| ST-14 | `browserPreview` / `browser` settings (profiles, CORS relax, clear-data) | cut |  |
| ST-15 | `changesViewMode` setting (flat/tree per section) | cut | W3 |
| ST-16 | `remoteMachine` install-source setting | cut |  |
| ST-17 | Per-agent-provider config (extra CLI args, env vars) | done |  |
| ST-18 | Per-agent executable override | done |  |
| ST-19 | MCP server management (catalog + custom) | done |  |
| ST-20 | MCP "sync to agents" | cut |  |
| ST-21 | Skills catalog | done |  |
| ST-22 | Automations (scheduled/cron agent runs) | done |  |
| ST-23 | Per-project settings — provenance model | cut |  |
| ST-24 | Per-project "base" settings (GitHub account, worktree root, default branch, base/push remote, git-credential mode, tmux) | part | W7 |
| ST-25 | Per-project "shareable" settings written to `.emdash.json` | cut |  |
| ST-26 | Config import ("migrate from Conductor/Superset/Paseo/Codex") | cut |  |
| ST-27 | Per-project environment variables | done | W7 |
| ST-28 | Emdash account (sign-in/out, session states) | cut |  |
| ST-29 | GitHub accounts (multi-account) | cut |  |
| ST-30 | Three ways to connect GitHub | cut |  |
| ST-31 | Other issue-tracker integrations (12 providers) | cut |  |
| ST-32 | SSH machine connections (form + validation) | cut |  |
| ST-33 | Full keybinding catalog & conflict model | done | W1 |
| ST-34 | App self-update flow: published by hand, fetched and swapped in on its own, "check for updates" at the foot of the windmill's rail | done | W10 |
| ST-35 | Telemetry consent | cut |  |
| ST-36 | `.emdash.json` (the one per-repo config file) | kept |  |
| UI-01 | Boot splash | cut |  |
| UI-02 | Recovery window | cut |  |
| UI-03 | Onboarding (sign-in + legacy-data import) | cut |  |
| UI-04 | Welcome screen | cut |  |
| UI-05 | Home view | done |  |
| UI-06 | Project view — header & actions menu | cut |  |
| UI-07 | Project view — section tabs (Tasks/PRs/Workspaces/Settings) | cut |  |
| UI-08 | Project view — non-ready states (creating/hydrating/context-error) | part | W7 |
| UI-09 | Task titlebar — breadcrumb + git popover | cut | W3 |
| UI-10 | Task titlebar — activity/preview/open-in/drawer-toggle/sidebar-toggle | cut |  |
| UI-11 | Task main column — split-pane tab workbench | cut |  |
| UI-12 | Task main column — bottom terminal drawer | cut | W6 |
| UI-13 | Task sidebar — 3-way toggle (Conversations/Changes/Files) | cut |  |
| UI-14 | Task view — non-ready states (creating/provisioning/missing/teardown) | done |  |
| UI-15 | Automations view | done | W10 |
| UI-16 | Settings view | cut |  |
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
| UI-27 | Native application menu | done | W11 |
| UI-28 | System tray | cut |  |
| UI-29 | Window management (per-platform titlebar/frame) | done | W11 |
| UI-30 | Drag and drop — OS folder → sidebar | done | W7 |
| UI-31 | Drag and drop — workspace file → composer/tree | done | W2 |
| UI-32 | Drag and drop — tabs | cut |  |
| UI-33 | Drag and drop — terminal tabs | cut |  |
| UI-34 | System notifications | done | W11 |
| UI-35 | Toasts | done | W3 |
| UI-36 | The full modal catalog (30 modals) | cut |  |
| UI-37 | Agent status dots (sidebar) | cut |  |
| UI-38 | Activity badge (workspace lifecycle) | cut |  |
| UI-39 | Diff stats and PR badges (sidebar rows) | cut | W3 |
| UI-40 | Preview-server pills (titlebar) | cut | W6 |
| UI-41 | Connection status dot | cut |  |
| UI-42 | Update indicator (sidebar footer) | cut |  |
| UI-43 | Context-usage indicator (composer), plain-words cost alongside it | done | W2 |
| UI-44 | Boot/crash telemetry (not user-facing) | kept |  |

---

## The yard — where the district surface is now

The district board and the session board are both being replaced by the yard,
designed whole in `design_handoff_village_session/` and planned in
`YARD-PLAN.md`. `District States.dc.html` in that handoff is the checklist:
162 states, and the ones below are the only ones that exist so far.

### W-A — the seam · done

The writing came off the canvas. The village stays in Pixi and every word now
sits on a layer over it, which is what the designs are and is a great deal less
code than laying out a bitmap face by hand was.

The four faces are carried in the app rather than fetched, all four under the
open font licence. The design's colours, tones, motion and thresholds are one
token file taken verbatim off the handoff, with the two places the handoff
contradicts itself settled in the file: section labels are stone because gold
means pressable and nothing else, and the faces are the four the designs
actually drew with rather than the design system's pixel placeholders.

The sprites in among the writing come off the same packed sheets the village
draws from, so there is still one copy of the art. The villagers in the yard are
ours rather than the kit's: the designs used the kit's own character because it
was what came in the box, and it is an unfinished template that stands taller
than the doors it would be standing at.

13a is drawn, over the real island composed out of the real world files and
dimmed to exactly what the handoff specifies. It was looked at at four window
sizes and fixed at each: the columns keep their proportions rather than their
widths, every one of them growing with the window and the writing in each
rewrapping to fill it, the middle taking whatever a put-away side gives up,
every column gives up its beginning rather than running over the one
below it and says how much it gave up, and a short window drops the older notes
off the gatepost and the words off the rail.

`pnpm run yard` is the harness: the yard on its own over the real village, fed
the designs' own session, with no wire and no agent.

Also in it, because nothing could be looked at until it was: the board was
broken at HEAD, half-migrated from a plank to a paper scroll, so the app did not
build at all. It builds again.

### W-B — gold is pressable · done

The rules sheet, as the primitives every board uses rather than as something
each of them reinvents. Gold is pressable and pressable is gold; the result of
pressing lands on the line you pressed and settles back, except a failure, which
stays; anything that cannot be taken back needs two presses and the first press
names the cost; nothing spins, and a wait too short to notice says nothing.

The arrows walk the pressable lines in the order they are written, and what they
stand on is remembered by what that line is rather than where it was. The mark
they leave is the one fill in the whole interface, and it hugs the words rather
than the row.

And the line. It is a contenteditable on purpose: selecting a word, undo,
pasting from another program and composing in a language that needs somewhere
real to do it are all things people already know how to do. The one thing the
browser gets wrong for us is the caret, so the real one is made invisible and a
drawn one follows it, blinking in steps like everything else here.

One exception to the gold rule and it is the only one on the board: the names on
the rail keep their posture tints, because the rail's whole job is telling you
from across the room which session wants you.

### W-C — the yard on a real session · done

Pressing a district walks you into the session you were last in. The
conversation is projected in the main process as four lists rather than one
column, because notes, thoughts, deeds and errands are four different things
about the same conversation. The protocol carries no clock, so items are stamped
as they arrive and nothing is said at all about ones only ever seen replayed.
Each tool call says which kind of tool it was, because a signpost, a crate, an
anvil and a tub over the fire are what you read down that column.

The projects moved to a rack in the top right, over both the island and the
yard, one slot each with the project's own picture standing in it, or a prop
from the kit until it has one, and the name on hover. That is
the only pressable box in the app.

Driven against a real Claude in a real worktree, twice: said something, watched
the note go up on the post in handwriting, the answer come back in the serif,
and the command it ran appear in the margin with its prop beside it.

A board on the rack carries a stud that says what the loudest session in
its project is doing, even while he is standing somewhere else entirely: an
iron plate nailed into the board's top-right corner, just under the right-hand chain, with a diamond of light
in it, drawn in whole pixels with a ring of half-lit pixels for its glow
rather than a blur, in the same colours and to the same rhythm the house
windows and the rail's lanterns keep. Lamplight breathing slowly for somebody
working, the fire's orange pulsing quick for somebody asking, a steady green
for something finished he has not been in to see, a dull slow ember for a
limit being waited out, red throbbing for broken, and no stud at all for
idle, because a light is a reason to look. It took over from the warm or red
wash the whole board used to get, which only ever knew asking and hurt and
smeared round the planks; the folded beam still carries that wash, since it
has no corner for a stud. The fold is `wantsOf` in `main.ts`, the same
`seen` and `unseen` the island's own house lights read, worst first; the
drawing is `studOn` and `paintStud` in `yard/shelf.ts`. Driven over the debug
port against a real Claude in a scratch data folder: said something slow,
stepped out to the island, the stud lit lamplight and read `working` off the
board; the answer landed while out on the water and it went steady green,
`done`; the breathing was confirmed running on the lit pixels, paused by the
same `html.still` rule that freezes everything else while the window is not
his. Asking, limited and hurt were not driven, since none of them can be made
to happen on purpose from outside; they share the one code path and differ
only in the colour and the beat read off a table.

The rack reads as alive now, not a row of the same grey sign. The board you
are standing in is let down on its chains, hanging lower than the row as
well as painted gold, so where you are is said by where it is. A board with
somebody at work, asking, finished, waiting out a limit or broken behind it
is painted in full; one with nobody home goes dull, its wood a shade darker
and its face gone grey, so the live projects read from across the room
before any stud is made out. News knocks the sign: a project where somebody
has just started asking, finished or broken jumps on its chains and settles,
twice, the moment it happens; working and waiting are not news and do not.
And folding the rack no longer puts the live ones away: whatever has
somebody at work, asking, finished or broken stays pinned up beside the one
you are standing in, and only the quiet boards go behind the beam, which is
why the beam's own wash went, since what it used to stand in for is hanging
right there. `pinned`, `paintBoard` and `paintStud` in `yard/shelf.ts`,
`rack-knock` in `yard/tokens.css`. Driven over the debug port against two
projects in a scratch data folder: walking in dropped the gold board on
longer chains and the other boards went dull; a session started in the
second project and the first walked back into, the second stayed up on the
folded rack, lamplight, in full colour, while the quiet one would have gone;
the scratch account then hit a real usage limit, which read as the dull
ember and stayed pinned too; and once it lifted and the turn finished the
board went green and was caught mid-knock, several frames of its own swing
rising and settling.

And a chord goes straight to whoever wants him, island-wide: `Cmd/Ctrl+U`
("go to whoever wants you," in the finder's own "held with command" list from
anywhere) stands him in the yard of whichever session is asking or hurt,
worst and oldest first, and pressed again from inside one cycles to the next
— a bad morning with three sessions asking things is three presses apart. A
clicked notification (see below) lands on the identical `go('task:…')`, not a
second way in that could disagree with this one. Driven live: opened the
finder and confirmed the new row reads correctly, and pressed the chord with
nobody waiting and confirmed it does nothing rather than going somewhere
wrong.

### W-E — everything else is laid over it · done

Opening a file, a change, a commit, a folder, a shell, a pull request, the
finder, the card or a new session lays it over the yard: the world drops to
silhouettes, a flat brown wash comes down over the middle and the right, and
what you asked for is written on that. The gatepost and the rail stay. The way
home is written across the top, one gold step per level.

Every board in this app was already a list of rows computed by files that know
nothing about how any of it is drawn, so the whole of the port is one function
that turns a row into an element, and not one of those files changed.

**The wooden board is gone.** The plank, the paper scroll it was half-way
through becoming, the bitmap lettering that measured it and the harness that
drew it are deleted, along with their art. Out on the island only the line and
the wash come up, because there is no yard out there to lay anything over.

### W-F — the ages · part

The fire says what the session is doing: lit is somebody working, banked is
somebody at the gate, embers is finished, out is nobody home, and the light in
the yard follows it. A place nobody has touched for days is darker than one
somebody is standing in. What it means to do has its own place above the
thinking and is only there when the agent has actually posted one.

Left in it: a worktree being cut has no state on the wire to draw from, because
starting a session is one atomic call that does not return until the worktree
is there; a project with twenty sessions and a project with twenty-three agents
have never been seen because nothing here has had that many; and abandoned is
not reachable, since a project the village has forgotten is gone.

### Built, and broken, found by driving the installed app

The app you install could not start an agent. An agent that speaks the protocol
is not a library this app calls, it is a program it starts, and the thing it
starts has to be a real file on the disk that a plain node can read. The plugins
package already builds each adapter into one self-contained file and upstream
carries them beside its main bundle; Mender never copied them, so the installed
build went looking through node_modules, found nothing, and every session failed
to initialise. They are carried now, and left out of the archive.

The first attempt at this was wrong in an instructive way: making them
dependencies of the app got the files into the archive, which is exactly where
a spawned process cannot read them.

It could only have shown up by opening the thing in the Applications folder,
which is the whole reason that is the last step of every change.

And once it could hold a conversation, a week-old one said it happened this
minute. The protocol carries no clock, so the only time anything has is when
the village noticed it, and an agent picking up where it left off sends its
whole transcript back the moment you walk in, on turns it never marks finished.
Two guesses at telling that from something happening both failed; instrumenting
it was what settled it.

What tells them apart is you. Nothing is dated until you have said something to
that session. A note you just wrote says how long ago; one the agent handed
back on its way in says "before this", which is all anybody knows about it. The
thinking column stops claiming times altogether, except where reasoning carries
its own clock and for the one happening now, because it never needed them: that
column is placed by order and brightness, and that is what recency is made of
here. A board that gets time wrong is a board you stop reading times off.

Then he held up the design, where every answer has its "22m ago" over it the
same as every note, and asked for it. The village's own noticing still only
knows what it watched, and forgets it on restart. But Claude writes every turn
to its own transcript with a real time on it, so a Claude session now reads
that file and dates both columns off it, walking it in step with the board so
the same words said twice each get their own time. Driven in the running app:
two lines said, both columns dated, the app shut and reopened a minute later,
and both columns came back at "1m ago" and "2m ago" rather than blank. Other
agents still only get the times the village saw while it watched.

### And then he opened it, and it was black

Five things, and the first one is the whole complaint. **The yard was framed on
a district's bounding box, and a district is a shape of land rather than a
rectangle.** The harbour reaches one arm along a coast; its box is nine parts
sea. Framing that box put the whole screen on open water, and open water dimmed
to a yard's light is a black screen with writing on it. It now stands on the
densest window of that district's own cells, pulling a rung closer until the
ground actually fills the picture, which is what the designs' own crop is: a
tight piece of market, all land, no coast.

**The ground the agents stand on was a painted rectangle** with a campfire on
it. It is a hole in the writing now, with the frame kept and the firelight over
it, so what they are standing on is the district you are standing in.

**Anything laid over the yard was full height whatever was on it.** A question
with four lines in it got two thirds of the window of flat brown underneath,
which reads as a panel that failed to load, and that is the piece he pointed at.
The wash is as tall as its writing now and scrolls when there is more.

**A project nobody has worked in yet** drew three column headings over three
empty columns, which says the board is broken rather than that the work has not
started. It says the one true thing instead and lets the district behind it do
the rest.

**A session's lantern never lit.** The rail is handed who was awake when the
yard opened and nothing ever told it again, so a session cut while you watched
stayed dark on the beam for its whole life, including the one you were standing
in.

### Four more that only turned up by driving it

**Walking into the same checkout twice hung on "reading it…" for good.** The
file tree is keyed on the checkout and watches it, so the second visit
subscribed to the session the first was still closing, and the close took the
shared session with it. The tree is held open for as long as you are in the
project and let go of when you leave, so walking back in is instant and never
races itself.

**A git refresh wrote the checkout over whatever you had opened from it.** The
checkout board stays live underneath a file, a commit, the folder, the shell and
what is open for the branch, and the question it was answering was "is there a
live checkout" rather than "is the checkout on the screen". The trail said what
you opened and the writing said something else.

**`/agent` reached Claude as a sentence.** The overlay a slash opens had nothing
picked out, so Return meant send. The designs draw its first line filled, which
is what Return means, and it does now; arrows move the fill and the keyboard
belongs to the overlay while it is up.

**That overlay also covered the gatepost**, which the rule under its own crop
says it never does. It takes the same ground a sub-board takes and no more.

### A building is not a session, and four other things he had to point at

**Picking a house opened the session standing in it, or asked for a new one
when the house was empty.** That was the old district board's idea and it
should have gone when the rail arrived: it makes the number of sessions a
project can hold a property of how many houses the artist drew there, which is
nonsense, and it is the opposite of what this file and `MENDER.md` both say.
Houses are scenery. A villager still stands at the door of one somebody is
working in, and picking any of them walks you into the project. The rail is the
sessions.

**There was no obvious way to start one.** The end of the rail was three words
of small monospace floating under a bare cord. It is hung the way the lanterns
beside it are hung now: an unlit lamp on the hook with a small banked-gold plus
in its glass that comes up to full gold under the pointer, and no words beside
it. Pressing it starts a session; right-clicking it opens the board of other
ways to start one.

**Nothing behind a slash worked.** Two listeners both claimed Return, the
line's own and the one listener that presses things, so one press completed the
command *and* pressed the first line of what the command opened, which on
`/model` meant silently setting the model to whichever was first. The line now
hands Return over when the overlay has a line picked and takes it outright when
it does not, and nothing else looks at it.

Two more came out of the same pull. A command that was already whole rewrote
itself forever instead of being sent, so `/compact` could never leave the line.
And the mark stayed on whatever matched three letters ago, so typing the whole
of `/mode` left it sitting on `/model`, which is the same bug wearing the
costume of a prefix. The list's first line is the pick, it moves every time the
list changes, and a name written in full beats a name it is a prefix of.

**Nothing is written over nothing.** A heading with an empty column under it
does not say the work has not started, it says the screen failed to load. No
cart until something has come off one, no list of what it did until it has done
something, no framed patch of ground until it has sent somebody out, and no
column rule down an empty third of the screen. A project nobody has worked in
says that once and lets the district behind it do the rest.

And the other half of the same rule: the parchment on the gatepost is a few
lines of the newest note and a count of what it is holding back, not however
much was written. A resumed session hands back whatever was said to start it,
so the first thing a restarted board showed was a system instruction filling
the whole left column in handwriting. The cut lands on a whole line.

### A house is not a thing you point at either

Buildings were hit first and hit as a shape, so a district was one place with a
handful of smaller places cut out of it and the grass between two roofs
answered differently from the roofs. There is one thing on the island you can
pick and it is a district, whole, and picking any part of it walks into that
project. Houses still light with somebody in them and still have a villager at
the door, which is all they were ever for.

### The land behind the writing was a screen full of buttons

Standing in a yard, every gap between two columns was a district you could
hover, light up and walk into: the whole screen was targets nobody put there,
and a missed click on the middle of a session threw you out to the island.
While a yard is up it now has the screen, and out on the island the layer
covers exactly what it draws, which is the rack of projects and the line you
write on, and nothing else.

That turned up something worse behind it. Escape from a session stepped back
onto "the district with no session picked", and there is no such screen: the
yard IS the district, and walking into one lands you in the work, so escape put
you straight back in the session you had just left. Nobody noticed because
clicking the sea still got you out. Take that away and a project was a room
with no door. The ladder is the line, then whatever you opened to read, then
the yard, then the island.

### The yard moves now, and it says what it is doing

The yard was rewritten whole on every word an agent said, so nothing on it could
move: a note you sent was simply at the top of the post, the thought it pushed
down was simply lower, and the last answer stayed set large as "now" long after
you had asked the next thing. Whether the agent was hard at work or had never
heard you, the screen looked the same.

Everything on it that is the same thing from one rewrite to the next now carries
a key, and is slid from where it was to where it is; something new arrives
rather than appearing, and walking into a session brings it up in order. What
you say lifts off the line as parchment and pins itself to the post while the
notes under it slide down. The answer inks in a piece at a time as it arrives.
The last reply turns to history the moment you say the next thing, and the live
edge of the middle column is a small fire throwing sparks with what it is doing
in the present tense and a count of how long it has been at it. It names the
thing as well as the verb: the file being read or changed, the page being read,
what a command is for in the agent's own words ("running the yard tests",
"committing the fix"), and "deciding what next" between one step and the next
rather than the "writing back" it used to claim while nothing was being written.
Driven on a real session: each step read out on the fire as it ran. Anything laid over the
yard comes up rather than cutting in, and the world behind dims smoothly.

Words move smoothly and sprites still step, which is a deliberate break from the
handoff's "no easing anywhere": writing that jumps is what made it feel broken.
Driven in the running app on a real session: sending, a tool call, and a
streamed answer, frame by frame.

The line you write on also keeps the keyboard now. It only had it when handed it
on opening, so one click anywhere, the line included, left every letter landing
on nothing.

### What the designs do not cover, and neither does this

Three whole groups of the 162 states are about things this app has never had a
back end for, and they did not arrive with the yard because there was nothing
to arrive: a project's own settings, worktree housekeeping and disk, and the
dev servers and scheduled runs that go with them. Emdash has all of it and
Mender has never projected any of it, so those are a wave of their own and not
part of the district's surface.

Three smaller things have no source rather than no surface. A lantern cannot
say it has something you have not read, because no read state exists anywhere.
A session cannot say its worktree is still being cut, because starting one is a
single call that does not return until the worktree is there. And a new session
is started with a name and nothing else: the five ways emdash can set up a
workspace are not offered because the call does not take them.

### A full audit, driven against a scratch checkout

Every board and every doing driven end to end against a throwaway repo with a
remote and dirty state, on a real Claude session, over the window's debug port.
The spine holds: the island draws and opens, the finder walks, a change reads,
a commit is written and lands in git, a branch offers to publish, a session
cuts its own worktree and starts a real agent that answers and commits on its
own branch, the slash reaches the agent's own skills, the card reads its live
model, mode, effort and servers, a file is read and blamed, and a session is
taken down with its worktree gone and its branch kept. Six things were wrong
underneath it, all found only by driving it.

The shell took no keys at all. Its input lands in the shell's own buffer
through the one window listener, but the line at the foot of the board owns
Return and handed an empty one to the agent instead, so every command sat in
the buffer forever and nothing ever ran. Return reaches the shell now.

The escape ladder skipped whole rungs. The line handles Escape when it has the
keyboard and let the same press bubble on to the window listener, so a file
backed out twice and landed on the island in one keystroke. And the ladder had
no rung for a live checkout or for the card, so even a clean step went from a
change, or from the card, straight to open water rather than back to the
checkout or the transcript it belonged to. It steps one level at a time now.

The finder could not be walked. Its empty narrowing box was drawn transparent
rather than hidden, which trapped the keyboard inside an empty list; and
reopening it inherited the mark from wherever it was last left, landing two or
three rows down a list it had just drawn fresh. It hides the box until it has
something to show and stands on the first row every time.

The time gutter wrapped: a three-letter age like `now` broke over two lines
because the mark margin was a single character wide.

### The slash, rebuilt, and the answers set as what they are (2026-09-24)

He called the slash terrible and he was right. It opened a brown wash the width
of the screen with the transcript showing through it, capped itself at eight
lines and an "and 91 more" nothing could reach, matched only on the front of a
name, and filled the picked line gold so it read as a stripe. It is a small
solid slab standing on the line now, its edge on the slash, names in the type
and what they are for after them in one cut line, ranked the way a person would
rank them, grouped under headings with counts, and scrolled rather than
truncated. Escape closes it without eating what you wrote; tab picks as well as
return; the mouse moves the mark. The @ uses the same slab.

It offers what Emdash's does. Emdash's slash is the agent's commands and the
prompt library; the prompt library is here as what you keep (`/keep`, picked
back from the slash, `/forget` in two presses, seeded with Emdash's own review
prompt). A slash mid-sentence opens the agent's commands and your kept ones, as
Emdash's does anywhere in the editor. Codex's collaboration mode is on the kit,
the card and the slash as `/collaboration`; that part is wired but has not been
driven, because only Codex offers it and no Codex session was on hand.

**What an agent said was one run of text.** The column that shows it set every
answer with its line breaks thrown away, so `/context` came out as a paragraph
of pipes and hashes. It reads the markdown now: headings as labels, lists,
quotes, code set in the type and pressed to keep, and tables as tables with
their numbers leaning right. Driven with a real `/context` in the running app.

### Things say what they are in colour (2026-09-24)

He hit his session limit and the board said so in the same cream as an answer,
set large under "now". Every state was cream or gold. There is a palette under
the gold now, and none of it is pressable: red is wrong, orange wants you or
ran short, green went well, blue is exact, violet is what the agent stressed.

A limit, a refusal, an agent that died or a turn that broke off without a word
comes through from the main process marked as trouble, and the thinking column
heads it "it stopped" in red instead of "now"; it stays red, dimmed, once it is
history. The limit is recognised by the exact words the Claude Agent SDK uses,
because without the session-failure capability the ACP adapter hands it over as
ordinary talk. A step that failed is red on the right; what a change cost is
green in and red out. The context meter goes orange under forty and red under
fifteen. A line that did what it was pressed for says so in green before it goes
back to gold. On a checkout board the mark beside each file is its colour
(changed blue, new green, gone red, renamed violet, conflicted orange), since
the file itself is gold. In an answer, bold is violet, code blue, headings and
quotes carry the violet too. Driven on his real session that hit the limit.

### Typed session failures, with what there is to do about one (2026-09-24)

Claude's ACP adapter can report a limit, an overload, an empty quota, a lost
connection or a sign-in requirement as a typed report — its "AIR" `sessionFailure`
extension — instead of the plain prose the previous entry above still leans on.
Emdash's connection now asks for it (`clientCapabilities._meta`), and both the
ways the adapter delivers one are decoded: an advisory still in flight, off a
`session_info_update`'s `_meta`, and one that settled the turn, off the
`session/prompt` response's `_meta` (Claude reports that one as an ordinary
`end_turn` alongside it, so without this it would read as a normal, silent
finish). It surfaces on the session's own state, cleared the moment a fresh
prompt goes out — that new prompt reads as this session's own "retry".

The board reads it: the fire banks (mood `resting`, not `hurt`) for a limit, an
overloaded service, or a lost connection, since there is a real next move —
wait, retry, start again — and says which kind of wait it is, with the reset
time pulled out of Claude's own prose and said in local time when it names one.
Sign-in and anything else stays sore. A turn that stopped for the turn limit
(`max_turn_requests`) now gets its own sentence instead of reading as a plain,
silent success.

And now three gold lines under it, offered by what the failure actually allows
rather than by copying the AIR extension's own action list (a plain usage limit
carries none at all): "try again" when an immediate retry is worth it (an
overloaded service, a lost connection), "carry on when it lifts" when a reset
time is known — Claude Code's own "continuing automatically at 5pm", said the
same way, with the same esc-to-cancel — and "start over", two presses, naming
what it costs. Carrying on arms a real timer in the main process that resends
the session's own last message once the reset time comes, and disarms the
moment anything else is said, cancelled, or answered by the timer itself firing.
Escape reaches for an armed wait before anything else on the board, the same
priority as a half-written line.

Verified: a new integration test drives the actual decode path (`cell.test.ts`)
by faking an ACP peer whose prompt response carries the AIR `_meta`, confirming
the failure lands on `sessionState.failure` and clears on retry — not just the
decoder in isolation. The full rendering chain (wire → yard → board) was driven
in the running app by temporarily forcing `House.read()`'s failure through an
env flag (`MENDER_FAKE_FAILURE`, added and removed in the same session, never
committed) against a real Claude session: watched "waiting out a limit · resets
6:10pm" render in the warn colour, armed "carry on when it lifts" and watched it
become "continuing automatically at 6:12pm · esc to cancel", cancelled it by
pressing the line again and separately by Escape (confirmed it falls back to
"carry on when it lifts" and stays on the session board rather than leaving),
and armed "start over" far enough to see its cost line before backing off
without actually discarding the transcript. Not driven: an actual live rate
limit (none was hit this session) and the "try again"/service-overload path
specifically, since the only failure category exercised was a plain usage limit.
Sign-in's own way in (item 2 of this workstream) is still not built.

### Sign-in's own way in, and a multi-select question · done (2026-09-24)

Item 2 of this workstream, built. Each hand on the `/agent` card now says
whether it is signed in — read back from emdash's own `agent-config` runtime
(`AgentAuthManager`, already wired into Mender's runtimes but unused until
now), not anything kept here — and the one actually working here, when it
needs to sign in, offers a gold line for it: "{agent} needs you to sign in."
Pressing it opens the same real shell the checkout board already has,
pre-filled with the agent's own sign-in line — its `cli-login` method's own
args when it has one, an `export {ENVVAR}=` ready for a pasted key otherwise —
on the input, unsent, so it is reviewed and run rather than run for you.

And a multi-select question. `askOf()` used to take only the first pending
permission request; several can legitimately be outstanding at once, and now
all of them are: a plain question still answers on the first press exactly as
before, but several at once mark which pending question each answer belongs
to and nothing goes out until a last, always-present line — "that's
everything" — sends every mark together. The marks themselves live on the
session (`House`), one pick per pending request, cleared the moment a marked
question is answered elsewhere or moves on.

Verified: the sign-in line was driven against this machine's own real Claude
Code, which is signed in — confirmed the negative is correctly negative: no
"not signed in" suffix on its row and no gold sign-in line while a real
session with it was open and working. Not driven: the positive case (an agent
actually reporting `unauthenticated`) and the shell hand-off, because nothing
on this machine is currently signed out and forcing that state would mean
touching a real agent's real credentials, which this workstream's brief rules
out. The multi-select logic was verified with a unit test
(`board/work.test.ts`) covering the flattening, the marks, and the trailing
send line, because no real agent asked a genuine multi-select question in the
time available to drive one live.

### A commit is said differently, taken back, or undone with a new one (2026-09-24)

Neither Emdash nor Mender had these before (`mender-12-add-git.md`'s own audit
confirmed it), so this is new front and back alike. Reading a commit that is
still HEAD now offers two more lines beside what was already there: "say it
differently," which opens the write-line prefilled with its subject and
`--amend`s it on return, and "take it back, keep what it wrote," a one-press
soft reset that leaves its changes sitting uncommitted (nothing is lost, so
it does not ask twice). Any commit, HEAD or not, offers "undo it with a new
commit" — a real `git revert`, two presses like everything else here that
cannot be pressed again. New checkout mutations: `merge`, `mergeAbort`,
`uncommit`, `revertCommit`, plus a `compareRef` read used by later rows.
Driven on a scratch repo over CDP: amended a commit's message and watched the
hash change, took one back and watched it land uncommitted with its diff
intact, and reverted one and watched a new commit come in with the working
tree back to what it was.

### A session's board offers to bring the base in, and to land itself · done

Two more lines on a session's own checkout board, both new front and back:
when the base has moved, "bring `<base>` in" merges it into the session's own
worktree; always, unless it has already gone in, "bring it into `<base>` here"
merges the session's branch into the *project's* own checkout — a real local
landing for a project with no GitHub remote, run from the session's board but
against the project's own working tree, matching `mender-12-add-git.md`'s own
proposed shape for this. A stopped merge lays a conflict board over the
checkout: the files it could not settle, one line each, "hand this to it"
(folds them into the next thing said on the session's gatepost) and a
two-press "give up" that runs `git merge --abort`. Built on the `compareRef`
read from the prior entry.

Driven live against a throwaway repo with a local bare remote (a scratch
session started fine over CDP once the write-line was clicked into focus
before `Input.insertText`, rather than only `.focus()`ed): watched "bring
main in" appear once the project's checkout moved ahead, pressed it and
watched the session's worktree fast-forward; committed in the session's
worktree, watched "bring it into main here" appear, pressed it and watched
the project's own checkout gain that commit and "it has gone into main."
replace the line; then edited the same README line on both sides and pressed
"bring main in" again to get a real conflict — the board listed `README.md`,
"hand this to it" queued the conflict onto the session's gatepost as its next
thing said, and a first press of "give up" turned into "press again and the
merge is undone", with the second press running `git merge --abort` for
real and landing back on the session's yard.

Found and fixed while driving: the two new lines never actually drew. The
`Place` object `main.ts` builds for a session's board was given a `tail`
field carrying `landingLines`, but `district.ts`'s `Place` interface never
declared one and `build()` never read it, so the rows silently never joined
the board. Added `tail?: () => Row[]` to `Place` and spliced it in right
after the existing `sending(head)` push/pull lines, which is the only change
beyond driving.

### Everything a session's branch changed, read against its base · done

One more line on a session's board, next to "bring it into `<base>` here":
"everything this session changed", offered whenever the session is ahead.
Presses into a new board — `board/branch.ts`'s `branchMade` — that lists
every file the branch touched since the commit it and its base still share,
each one pressable into the same `readOut` diff a working change or a
commit's own file already opens on, so a file is a file wherever you meet
it. Escape steps off a file onto this list, and off this list onto the
checkout, exactly the way a commit's own file list already does.

The list comes from `getChangedFiles` with a `merge-base` target, which the
wire contract already carried — unused until now. Reading each file's own
diff needed one small new backend read: `getMergeBase`, alongside
`compareRef` in the same file, since `changes.file`'s `at.from` wants an
actual commit and the base branch's *tip* is the wrong one to diff against
once it has moved — that would show the base's own new commits as if the
session had undone them. `getMergeBase` runs `git merge-base <base> HEAD`
once and the board holds the sha for every file it opens from that list.

Driven live in the same throwaway repo as the row above it, on a session
ahead of a main that had also moved on its own: "everything this session
changed" listed exactly the one file the session actually touched, one
line, `1 in and 1 out`; pressing it read only the session's own edit to
that line, with neither main's unrelated added line nor main's own
conflicting edit to the same line anywhere in it — confirming the
merge-base read rather than a straight two-tip diff. Escape backed off the
file onto the list and off the list onto the checkout, each one press.

Note for whoever drives Mender next against a backend change: this session
lost time to `Unknown procedure 'checkout.getMergeBase'` after editing
`packages/core` while the dev copy was already running — the renderer
hot-reloads but the Electron main process does not pick up workspace-package
changes without a full kill and restart of `pnpm run dev`.

### A session in its own terminal, and the rail reads its mood too (2026-09-24)

`mender-13-add-files-terminal.md`'s own audit called this "the one place a
genuinely different board layout is warranted" — not a second board type
bolted beside the chat one, a different way to hang the lantern. Built: the
empty-hook naming board now offers a second, pressable line, "in its own
terminal," beside the name; picking it cuts the worktree exactly as before
and then runs the agent's own CLI raw, over emdash's TUI-agent runtime
(`@emdash/core/runtimes/tui-agents`, already brought up by `runtimes.ts` and
already forwarded to Mender's wire, previously unused — `mender-13`'s own
audit flagged it "possibly-vestigial"), instead of starting an ACP
conversation. The session still stands up through the same `showYard` every
chat session does — the fire, the gatepost's column, the rail with every
lantern in the project on it — and only the middle, where the transcript
would draw, is taken over by a real terminal (the same xterm.js board the
plain shell already mounts), the same way a plain shell already takes a
checkout board over. `ctrl+]` steps back to the yard behind it.

The rail reads it too. A TUI session's mood (idle/working/awaiting-input/
error, read off the TUI runtime's own `sessions` and `agentStates` live
models) is folded into the same island mood map every chat session's lantern
already reads from (`main/tui-sessions.ts`'s `mergedMoods`, merged once in
`index.ts` and handed to the agents controller, the dock badge, the
stay-awake blocker and the missed-while-away summary alike), so a session
running this way lights its lantern, reaches the rack, answers `Cmd+U` and
rings a notification exactly like any other villager — none of that
machinery had to learn a second mood source.

Not done: a signed-in `/agent`-card gold line to start one (only the naming
board offers it so far); a written prose line for "it broke" beyond the CLI's
own trust prompt and exit codes; killing a TUI session's process the way the
plain shell still cannot be killed from the board either.

Driven: a throwaway repo, the naming board's toggle switched on, a real
`claude` spawned in its own worktree and its own terminal — the CLI's own
trust prompt, then its own interface, both drawn correctly on the board. Sent
a one-word prompt and watched it think and settle. Stepped out with `ctrl+]`
and back to the yard behind it (the "no checkout board of its own" fallback
was wrong on the first pass — it left the middle column showing the
terminal's own stale title after the terminal was gone; fixed to call the
same `home()` every other "nothing laid over the yard" case already calls).
Started a second session the same way and watched the first read `asleep`
then `resting` on the rail from the second one's own yard, live.

### MCP servers, every worktree on the machine, and what it is costing (2026-09-25)

Three small builds, none of them a new pattern. MCP (AG-07, ST-19): the
`/agent` card's "what it can reach" gets a `+` — a gold word now, not a
marked line — for the catalogue (Emdash's own `catalog.ts`, read straight off
it rather than kept twice) and one for a custom server, named and started on
the board's own writing line the same way a session is renamed; each server
throws away with the app's usual two presses, scoped to the one agent whose
card it was pressed on (`removeMcpForAgent`, not the blanket `removeMcpServer`
every provider shares). Reuses Emdash's agent-config runtime wholesale —
`saveMcpServer`/`removeMcpForAgent`/`listMcpForAgent` were already there,
already wired into `kit.ts`'s per-agent tool list.

Worktrees (WS-24, part of WS-25): the windmill's "what is on disk" lists
every worktree the workspace registry knows of, any project, with a measured
size and a stale mark (branch already merged upstream, or nothing in the
app's own task list still points at its path) — needed forwarding the
workspace-registry contract straight through to the renderer for the first
time, the same way git/files/terminals already are. Two presses clears one;
the first press now says exactly what it costs, reusing the session
takedown's own preflight (`unsentIn`/`counted`, exported from `card.ts`):
uncommitted files are always lost, but a branch with commits nowhere else has
— or one that has simply never been pushed — is kept, only the worktree and
its registration go. Only a branch that is already fully upstream is deleted
with it.

Resource usage: no ledger number (cmux's idea, not Emdash's) — a "this
machine" line on the windmill, cpu/memory/disk in plain words, resampled
every few seconds while it is open (`packages/core/src/runtimes/resource-usage`,
wired in-process rather than as its own subprocess worker, since a sample is
a few syscalls). Since asked for again explicitly, it now also lists each
open session's own share underneath: the pid the tui-agents runtime already
tracks for its agent process and each plain shell's own pid, `ps`'d for cpu
and memory (`main/session-usage.ts`), plus how many dev servers that
checkout has listening, counted rather than measured — a port is noticed by
asking it, not owned by one pid this machine can always name. Ordinary chat
sessions (ACP, not a terminal one) do not show an agent-process line yet:
the ACP runtime does not put a pid on its own contract the way the terminal
one does, so there is nothing here to `ps`.

Driven: added a custom server and one from the catalogue, then threw the
custom one away, verifying against a throwaway `HOME`'s own `.claude.json`
after each press rather than trusting the board alone. Cut a zero-cost
worktree (a terminal-kind session, no agent call), made a real unpushed
commit on it with plain git, cleared it from the windmill and confirmed on
disk: the worktree gone, the branch and its commit still there. Watched the
machine line read real numbers and count back up a few seconds later. Set
Claude Code's extra arguments to `--verbose` and an environment variable on
the windmill's new Agents page, started a real terminal session, and read
both off the actual spawned process with `ps eww` — the flag was on its
command line, the variable in its tmux wrapper's own environment. Opened
that same session's usage line and watched it name its agent process with a
real cpu and memory number.

### A history of ended sessions, read back without waking anything (2026-09-25)

Taking a session down (`tasks.abandon`) was already only ever cutting the
worktree — its conversation was never touched, just orphaned with nothing to
find it by. `tasks.ts` now writes a small ledger entry (id, project, title,
branch, when) to its own `history.json` on the way down, capped at 200, and a
new `tasks.history(project)` reads it back newest first. The project's
settings window gets a "sessions that have ended" list off it; pressing one
calls `agents.work` for that same task id — still there in `agents.ts`'s own
conversation store, since nothing ever evicted it — and reads the turns back
as plain "you"/"agent" lines, oldest first, on the settings window itself
rather than a second board. No process is woken to read it.

Driven: started a real Claude session, said one thing, took it down with the
existing two-press "send everybody home and take this down", then opened the
project's settings and pressed the entry that appeared under "sessions that
have ended" — the transcript read back exactly, title and branch included,
with `history.json` on disk holding the entry after restart.

### Carrying on from an earlier line, in a new session (2026-09-25)

Every note on the gatepost — every line you've said in a session — now
carries "carry on from here in a new session" under it, gold and pressable.
Pressing it calls a new `tasks.fork(id)`: a new worktree, cut from the
branch as it stands (not the commit that line was actually said against —
nothing here keeps a per-turn commit to cut from instead, so it is the tip,
named honestly as such rather than pretending to a precision this app
doesn't have). The ACP runtime has no way to fork a session's history at the
protocol level either, so what is carried in is not a real fork of the
conversation: it's a compact telling of everything said up to that line —
built client-side from the same `Told` the board already reads, via
`turnsOf(told, uptoTurn)` — sent as the first thing said to the new session.
The original session is never touched: its own worktree, branch and
conversation are exactly as they were, confirmed live by saying something to
each and checking neither saw the other's line.

Driven: started a session, said two things back to back (two turns), pressed
"carry on from here" on the *older* of the two notes. A new lantern
(`fork-test-one-carry-on`) appeared on the rail with its own worktree, its
first line was the telling built from turn one only — turn two never
appeared in it — and Claude in the new session confirmed it was on a clean,
separate branch. Went back to the original session and confirmed its second
turn, and Claude's reply to it, were both still there untouched.

Taken back off the gatepost (2026-09-27): he didn't want the line under
every note, so the offer is gone from the yard. `tasks.fork` is still in the
main process, just with nothing in the village pressing it.

### An orphaned lantern is no longer woken (2026-09-25)

`agents.ts` was waking `houseOf` for every entry in its own conversation
store on boot, `lodgers` included, and nothing ever took an entry back out of
that store when the building it named came down — `tasks.abandon` and
`tasks.sweep` only ever cut the worktree. A village reopened after enough
takedowns would spend a moment standing up villagers for houses that no
longer exist. `tasks.ts` now carries a small `onGone` hook, called with a
task's id the moment its building actually comes down (one session or a
whole project's worth), and `index.ts` wires it straight to `agents.evict`
— the same call a real takedown already used elsewhere. Boot itself now
checks every lodger against the tasks that are actually still standing
before waking any of them, and prunes the rest from the store rather than
calling `houseOf` on them at all.

Driven: seeded `agents.json` with a lodger for a task id that has no entry
in `tasks.json`, started the app against that data directory, and read the
file back once it had settled — the orphan was gone and the boot log carried
nothing about it.

### Updating and removing an agent's CLI, from the same card that installs one (2026-09-25)

`fetch` already put an agent on the machine; the card had no way to bring
one up to date or take it back off. `runInstallCommand`'s `commandKind` grew
a third value, `'uninstall'`, in `packages/core`'s host-dependencies runtime
— it resolves to the plugin's own `uninstallCommand` and refuses with
`no-uninstall-command` rather than quietly re-running the install line when
a plugin doesn't have one. `agents.update` tries the plugin's own self-update
command first (`runSelfUpdateCommand` — running the CLI itself, `claude
install latest` for Claude) and only falls back to the platform's per-method
update line when a plugin has no self-update of its own; `agents.remove`
runs the new uninstall command kind. Every hand already on the machine, in
the card's own "who works here" list, now carries two more lines under it:
"bring it up to date" and "take it off this machine", the second a two-press
throw-away in the same shape a taught skill or an MCP server already is.

Driven: started a real session, opened `/agent`, and read both lines under
Claude Code and Codex. Pressed "take it off this machine" once and read the
armed line back — "press again and Claude Code is off this machine" — and
stopped there rather than firing the second press, since that would really
run `claude uninstall` on this machine. Did not press either for real; the
command each would run was confirmed by reading the plugin's own descriptor
(`claude uninstall`, `claude install latest`) rather than by running it.

### A checkout says what this machine doesn't have (2026-09-25)

Of everything Mender itself leans on — not an agent's own CLI, which is
`AG-11`'s concern — git, GitHub's `gh`, ripgrep, tmux and node are now
checked against the same host-dependency snapshot the windmill already
reads. `gh` joined `CORE_DEPENDENCIES` (it had no descriptor at all before
this). A checkout board that opens onto a machine missing one of the five
says so in a plain line, sore-toned, above "open a shell in here" — 'ripgrep
is missing here. press to put `brew install ripgrep` on the shell, and
return runs it.' Pressing it opens the real shell for that checkout, the
same one "open a shell in here" opens, and writes the install line onto its
prompt without sending return — the approval is his own key in his own
shell, not this app deciding a real command should run.

Driven: confirmed the checkout board carries no such line on a machine that
already has all five. Rather than launching the whole app with a
homebrew-less `PATH` (pnpm's own dev pipeline needs node and several other
tools on `PATH` before Electron is even up, which made that too fragile to
drive end to end), called the same `resolveCommandPath` the host-dependency
runtime resolves through directly, once with a real `PATH` and once
restricted to `/usr/bin:/bin:/usr/sbin:/sbin` — `gh`, `rg`, `tmux` and the
homebrew `node` all resolved to nothing under the restricted one while
`git` still resolved, via Xcode's own `/usr/bin/git`, exactly the mixed
result a real machine missing gh/ripgrep/tmux/node but not git would give
the resolver the checkout board reads from. This one is `part`, not `done`:
it is the plain-line notice, not the fuller one-click "workshop" surface
TR-18 in the catalog also describes.
### A session on a timetable, cut on its own (2026-09-25)

ST-22. A new section on a project's settings window, "sessions on a
timetable" — what it's for (the first thing said), which agent, and when:
every morning at a fixed clock time, every n hours, or on every push to the
base branch. Backed by its own small domain (`main/schedules.ts`, a JSON
store beside `projects.json`) and a 15-second tick, running only while the
app is: the settings window offers no way to reach a cron entry or a git
hook, and neither exists on disk. When one comes due it cuts a session
exactly the way the empty hook does — `tasks.begin` with the same name/kind
the naming board already sends, `tasks.rehand` for the chosen agent, then
`agents.tell` with what it's for as the first thing said (skipped for a
terminal-kind one, the same exception the naming board already makes) — and
it lands on the rail like any other lantern, with its work left there.
"Every push" watches the base branch's own ref with a plain `git rev-parse`
in the project's own checkout, no fetch and no hook: it only ever notices
what has already arrived, and its baseline is captured the moment the
schedule is made so it never fires on whatever the branch already was.
Listed schedules remove with the app's usual two presses.

Driven: opened a throwaway project's settings, picked Claude Code, wrote
"say the word pineapple", set "every morning" a minute out, added it to the
timetable. A minute later, with nobody touching anything, a real session
appeared on the rail on its own — a fresh worktree, a real `claude` spawned,
greeted with the prompt, and renamed itself "Pineapple" the way an agent's
own naming already works. Not independently driven this sitting: the
"every n hours" and "on every push" branches (same `due()`/`fire()` path,
exercised by the daily one) — an hours-scale or a push-triggered fire is
consistent with the code but wasn't sat through or manufactured with a real
commit.

### The `/agent` card offers a session's own terminal too (2026-09-25)

Part of TR-09's own follow-up ("not done: a signed-in `/agent`-card gold
line to start one — only the naming board offers it so far"). A session
nobody has spoken to yet — `kit.awake` false, so there is nothing to lose —
now gets a line on its own card, "start one like this in its own terminal",
beside the agent choice. Backed by `tasks.retool`, which flips a task's
`kind` to `terminal` only while it is still unspoken-to (a no-op otherwise):
which board opens was already decided purely off that field at open time
(`openTask`), so flipping it and reopening is the whole change — no new
worktree, no second session.

Not done: "more than one shell per checkout" and "killing a shell (or a
terminal session's agent) from the board" — both still open, see the shell
section above.

### A second shell, and ending one, or a terminal session's agent (2026-09-25)

TR-09/TR-12's own follow-up, closed. A checkout's board now offers "open a
second shell in here" beside the first: a second tmux, its own place,
alive independently of the first's whether or not either is what the board
is showing right now — pressing "open a shell in here" always reattaches to
the first, the second entry always reattaches to (or cuts) the second.
Only two, addressed as such, rather than an open-ended list: reaching a
third or naming them is left for whenever more than two is a real ask
rather than a guess.

Both a plain shell and a session's own terminal now offer to end what they
are running, in the app's usual two presses. The armed line names what the
second press would actually lose — read fresh each time from the machine
itself (`main/board.ts`'s new `runningIn`), never guessed: for a plain
shell it walks from the terminal runtime's own tracked pid to the real
pane (tmux tracks the *attaching client's* pid, not the pane, so this reads
the client's own command line for which session it names and asks tmux for
that pane directly — two shells sharing one checkout's working directory
would otherwise be indistinguishable by path alone) and then to that pane's
own most recent child, naming it unless it is only another shell. For a
session's own terminal the second press is `tuiAgents.stop`, the same
"send home" the rest of the app already uses elsewhere. Ending either steps
the board back the same way `ctrl+]` already does.

Caught along the way: the first version of `runningIn` compared a parsed
absolute path with `===`, which is never true of two separate reads of the
same checkout — a parsed path is a structured value, not a string. Fixed by
formatting both sides before comparing.

Driven, in a throwaway checkout: opened its shell, ran `sleep 400` in it,
pressed "end this shell" — armed to "ends sleep. click again to end it."
— and the second press ended both the process and its tmux session,
confirmed gone from `ps`/`tmux list-sessions`, and the board stepped back
to the checkout. Opened a second shell beside the first, wrote a marker in
each (`echo IN_SHELL_ONE` / `IN_SHELL_TWO`), stepped out and back into the
first by name and read its own marker back, with `tmux list-sessions`
showing both alive at once the whole time. On an existing terminal-kind
session, pressed "end this session" — armed to "ends the agent's process.
click again to end it." — and confirmed the `claude` process and its tmux
session were gone afterward.

### Sessions share the project's folder by default — done

A new session no longer cuts a worktree. It runs in the project's own
checkout, on whatever branch that is on, beside every other session there;
the empty project says "write below and somebody starts on it, right here in
this folder." The new-session board carries "in its own copy, on its own
branch" for the isolated kind, and picking an existing branch implies it.
A shared session's take-down leaves the folder alone, and reviving or
carrying one on makes another shared one. Schedules start shared too.

Driven, in a throwaway repo under a separate data folder: typed on the
empty project's line, got an answer, and git showed no new worktree or
branch with the task recorded against the repo's own path. Turned the
isolated line on, started one, and a worktree and `mender/…` branch
appeared. Took the shared session down from its card and the repo's files
were all still there.

### Cmd+W closes a session like a tab — done

Cmd+W in a session takes it off the rail altogether, the same as taking it
down from its card, and stands you in the next one along; once none are
left it flies out to the island. One press, since the branch outlives it
and the conversation stays in the ledger. The one exception is a session in
its own worktree with uncommitted files: the first press says how many and
only a second press inside a few seconds closes it anyway. The window menu's
Close moved to Cmd+Shift+W so Cmd+W can never reach the window.

Driven over the debug port on a scratch project with two shared sessions
and one dirty worktree: the first two presses each took a lantern off and
landed in the next; the third warned about one uncommitted file, the fourth
closed it and flew out to the island.

### The yard's columns say what is useful (2026-09-27) — done

The right column is no longer a cart of the newest file plus a clipped log.
On top is whatever the session is in the middle of: the question it is
asking, moved over from the middle, or the plan it posted, done steps inked
out. Under it, what it did scrolls and follows the live end, with the lines
every write and edit actually changed under its crate or anvil; paths outside
the checkout read as a file name or `~/…` instead of a run of temp folders.
The middle is "what it said": the answer, with everything before it folded
away; pressing "now" or the heading opens and closes it and remembers which. The
gatepost's foot is the project's changelog, versions read off the commits that
moved the version in `pubspec.yaml`, `package.json`, a gradle `versionName` or
`Cargo.toml`, the commits since the last bump under "not in a version yet".
"Elsewhere in" is gone; the rail already says it.

Opening and folding the trail moves rather than snaps (2026-10-07): opening
holds the answer and lets what it thought and did rise in out of it, nearest
first; folding lets the trail go, farthest first, and the answers glide up
over the gap. Only what is on screen animates. Driven over the debug port on
a scratch session: the step faded up blurred as the answer slid down, and on
folding the answer held still while the step went and then glided up.

Driven over the debug port on the Aurio sessions: the scrubbing session's
edits showed their written lines under the crates, the fold opened the whole
trail above the answer and folded it back, the changelog listed Aurio's
commits (none versioned yet, which is true), and a plan and a question
injected into the yard for one look drew in the right column.

### Waking a session is one wait, not a flicker (2026-09-27) — done

Walking into a sleeping session used to draw every piece of its history as
the agent read it back in, so a long one blinked through every half-loaded
state of itself. Now the yard holds just the fire and "waking up" with a
count, coming up only if the wait is long enough to notice, and the whole
board comes in at once when the agent is up. An agent already awake shows
nothing extra; a wake that has not finished in twenty seconds is shown
anyway.

Driven over the debug port on a copy of the real data folder: the Aurio
audiobook session, which has a long history, showed the fire for about a
second and then its whole board in one fade, with nothing moving after.

### Parts put away, rules moved (2026-09-27) — done

Right-click any part of a session's board but the middle to put it away,
right-click anywhere to bring it back or reset the rules; a side column with
nothing left in it goes and the middle takes its width. The two column rules
drag sideways and the changelog's and plan's rules drag up and down. Kept in
the renderer's own storage, one arrangement for the village.

Driven over the debug port on the Aurio scrubbing session: dragged both
column rules and the changelog's, put away what it did, the changelog and
what you asked one by one until the answer ran the full width, then brought
all three back and reset the rules from the same right-click slab.

### A new session is a real session, straight away (2026-09-27) — done

The empty hook, and walking into a project nobody has worked in, cut a real
session on the spot, named claude until the agent titles it, and stand you in
it: agent waking, header, the what-you-asked and what-it-said columns up even
before anything is said. No board, no placeholder yard. Pressing the hook
again while that session is untouched turns over the board of other ways to
start one (own copy, own terminal, issue, branch, past session, allow
everything), and whichever is taken there replaces the untouched one; Escape
from it goes back into that session. The hook's click no longer lands twice.

Driven over the debug port on mender: hook from inside a session cut and stood
in a new "claude" session with its columns; pressed again for the board and
Escape came back to it; typed a line, it answered and retitled itself; walking
into an empty project landed in a new session the same way.

### A session is named for what it is about (2026-09-28) — done

Sessions used to take the adapter's title, which is the first line said,
tidied, and never changed. Now a small model (Haiku, through the `claude` CLI
already signed in here, with hooks, tools, MCP and history off) reads what was
asked, the last few answers and the files changed, and names it: a few seconds
after the first thing is said, again as each of the first three turns settles,
then every third. Only sessions seen working since launch are named, so waking
old ones leaves their names alone; a name given by hand still wins. The top of
the yard follows the rename rather than keeping the name it walked in with.

A restart used to rename everything anyway: where each session was last
named lived only in memory, so the "carry on" every cut-off session gets on
reopening counted as its first turn and the namer, which seldom says the same
thing twice, called it something new. Now where it was last named is kept
across a restart, and a session from before that was kept is taken to have
been named wherever it stands when it next works. (2026-10-12)

The name at the top of the yard is also written over by a double press: it
turns into a line in place, return keeps it, Escape puts the old one back,
and a name given that way is never touched by the namer. Driven over the debug
port: double press, typed, return, the header and the rail both took it and
it was saved as his; Escape left it alone. (2026-10-12)

Driven over the debug port: a fresh session read "claude", then "Yard
staleness logic" seconds after the question, then "How yards become cold"
once it had answered; the header changed with it.

A session picked up with `/resume` from a conversation started elsewhere used
to keep that conversation's first line, cut off with an ellipsis, since
nothing new had been said to prompt a name. Now it is named off the history it
already holds as soon as that is read in, and one already sitting there under
a cut-off first line is named the next time it is opened. Driven on a copy of
the real data: walking into the old "Okay, so right now what I want you to…"
session renamed it "Organizing what's left" within seconds.

### Switching sessions moves sideways (2026-09-28) — done

Pressing another lantern used to blank the whole yard, rail and all, show a
lone fire in the dark, blank again and fade up. Now the old session slides off
away from the lantern pressed and the new one sweeps in from its side, column
by column, while the headings, rules, changelog and rail hold still and the
old lantern's glow shrinks back into it while the new one's swells up. A session still waking keeps the place
standing and waits only in the middle, and the changelog stays up rather than
dropping out while it is read again. Driven over the debug port and filmed at a
fifth of the speed, left and right, into an awake session and into one asleep
after a restart: no blank frame, no doubled writing.

### Saying something again (2026-09-28) — done

Up on an empty write line brings back the last thing said in that session, and
keeps going back; down comes forward again, and past the newest gives back
whatever was half-written. It only takes the arrows while the line is empty or
still holding one it recalled, so a sentence being written keeps its caret.
Pressing any note on the gatepost writes it on the line the same way. Driven
over the debug port: up three times walked all three notes and stopped at the
oldest, down walked back to an empty line, and pressing the oldest note put it
on the line whole.

### The sea is water (2026-09-28) — done

The sea was the colour behind the picture. It is water now, drawn by a shader of
our own because the artist's is Unity's and ships nowhere else: shallow and green
against the land deepening to blue in the open, slow swells of light moving across
it, a scalloped line of foam at the foot of every cliff with a net of it washing
up the rock and pulling back, not all along the coast at once, and short flecks
of light blinking on the open water. The coast is measured off the ground the
scene actually draws, so the foam sits where the cliffs stand, pixel for pixel,
and everything on it lands on the art's own pixel grid. Zoomed out, the fine
marks fade rather than crawl. Driven over the debug port against his real
island: whole-island, close on the camp's cliffs, and a strip of the cliff foot
photographed eight times across three seconds to see the wash come and go.

### The sea reads as water from out on it too (2026-09-28) — done

The whole-island view, which is where the village is looked at most, had the
water's detail fade out and left a smooth glow round the coast. Every mark is
now sized so it never gets thinner than a pixel of the screen: waves follow the
coast in towards it a few at a time, broken along their length, long streaks of
lighter water drift across the open sea, the flecks stay, and the foam line at
the rock stays. Close in it is unchanged. Driven over the debug port at the
opening view and close on the camp, and filmed across a few seconds to see the
waves roll in.

### The open sea is drawn as carefully as the coast (2026-09-28) — done

Out past the shore the water was soft smudges of noise, nothing like the
crisp coast beside it. Now it is small pixel waves, a light crest with a row
of shade under it, each rising out of the flat, stretching, sinking back and
coming up somewhere else, drifting with the wind; single glints of sun that
flash and go; the water deepening all the way to the edge of the view rather
than stopping a little way out; and the slow shadows of clouds passing over.
Driven over the debug port at the opening view and close in, and filmed
across a few seconds to see the waves rise and sink.

### Every district flies its project's flag (2026-09-28) — done

From out on the water the island said who was working but never whose place
was whose; you had to hover the rack to find out. Now every district with a
project on it flies a small pixel pennant in its own colour with the project's
face on the cloth, or its first letter until it has one, and pointing at the
district unfurls the name off the flag's tail in two steps. The post stands
where `tools/place-pennants.py` measured one would go: on grass beside a path,
in front of the district's main house, clear of everything the artist drew,
and it sits in the draw order like any barrel so a tree in front of it still
covers it. The spots are in `assets/village/pennants.json`, fixed, because his
districts are. Driven over the debug port at the opening view, zoomed right in
on the crop farm, and on a flag carrying a real logo; the name unfurls on the
land, rides the tail at every zoom and goes on the water.

The flag then read as a speck beside a name tag twice its size, because it
shrank with the map and the tag did not. It holds its size on screen now as
the camera pulls back, one of its pixels to one of the screen's, with a
shorter pole and a bigger cloth so the logo is most of it, and the tag is the
cloth's own height at every zoom. The spots were measured again at the size
that makes it at the whole-island view. Driven the same way, out and close in.

A project with a logo now flies the logo itself rather than a coloured cloth
with a small picture on it: the cloth is the logo's own shape, edge to edge,
its see-through margin cut away, and the tail carries on in the colour round
its own edge. Checked on all eight logos on his island and on the tag beside
one.

The logo is drawn at its own resolution now, smoothed, rather than squeezed
through the flag's pixel grid and blown up into blocks, and the flag keeps
growing with the map however far in the camera goes instead of stopping and
shrinking against the houses; only the name tag stops growing. Driven out at
the whole island and all the way in on one flag.

Every flag is one size now, a letter's and a logo's alike, and a logo that is
mostly a plain tile with a small mark in it is cut down to the mark, the tile
carrying on as the cloth, so the mark fills the flag the way a letter does.
Checked side by side on all eleven.

A logo flies edge to edge now, over the whole cloth and on into the
swallowtail, the notch cutting into it rather than a strip of flag colour
showing round it. The tile under the mark is read from a little way in, past
an icon's thin bright rim and its rounded corners, so an app icon with a
coloured border no longer puts a band of that colour round its own logo.
Looked at close in on the play icon, the >< one, the dice and the rest.

### A twelfth project takes a piece of a big district (2026-09-28) — done

With all eleven of his districts taken, founding another project used to say
the island was full. Now the big ones give up a piece, in the order Kirubel
chose: the east half of the hay farm, the crop farm's barn, the south houses'
long house and then its tall house, the port's dock, and the centre houses'
east house and then their west shed. A piece is only its own place once a
project stands on it; until then it is still its district's land, and it goes
back to it when that project is forgotten. The district keeps the part its own
flag stands on and its own name. Each piece has its own flag, measured the
same way a district's is and kept clear of the flags beside it, its own glow
when pointed at, and its own houses and windows. The lines are in
`tools/split-districts.py`, cut against the art. Driven in a scratch data
folder: eleven projects, a twelfth folder dropped on the water landed on the
hay farm's east half, then every piece filled and the island looked at whole,
a piece pointed at and walked into.

The first cuts were ruler lines through the middle of yards and fields, nothing
like his own. Each piece is now grown out from its own house and yard, and so
is the part the district keeps, with fences and cliffs slow to cross, so the
lines settle along the lanes and fence runs and every field goes whole to one
side. Looked at over the art for all five and pointed at in the running app.

### Districts are rearranged by hand (2026-09-28) — done

A right-click out on the island offers "edit districts". While it is on, a
district is picked up rather than walked into: pressing one lifts its land off
the island, houses and all, and it goes where the pointer goes. Let go on
somebody else's place and the two projects swap; on an empty place, pale
ground on the water or a free piece of a lived-in district, and it moves in.
Let go out on the water and the line at the bottom offers to forget it, two
presses, naming that its sessions come down and the folder stays. Anything
that would leave a project unable to reach the fire, or a piece with nobody on
the rest of its district, lights red, says who would be stranded, and goes
back. The land never moves; who lives in which place does. Escape or "done"
ends it. Driven in a scratch data folder over the debug port: the centre
houses swapped with the hay farm's east half and both flags traded places, the
crop farm refused off the map because everything hangs off it, and the crop
farm's barn forgotten off the water.

While it is on, the camera zooms out past the land to the whole of his map,
every empty place in view, and "done" flies it back in to the island (2026-10-09,
driven in a scratch data folder: one project on the hay farm, zoomed all the
way out to every place, then back).

### A flag is moved by hand (2026-09-28) — done

While editing districts a flag is picked up by its pole or its cloth, before
the district under it, and carried over everything; let go anywhere on its own
district it stands there, in the right place in the draw order, and keeps
standing there across restarts, kept on this machine. Carried off its own land
it turns red, the line says why, and letting go puts it back. Driven in the dev
window over the debug port: mender's flag dragged off its lane onto the grass
by the barn, red while its foot was over the neighbouring place, and still
where it was left after a reload.

### Next

The long tail of the 162 states that do have a source, and the behaviour
groups. A good deal of both came across with the boards that carried them.

### A lantern's name is never cut short (2026-09-27)

Each lantern on the rail now takes as much beam as its whole name needs, and
the ones after it, the empty hook included, are pushed along to make room,
rather than every lantern getting the same slot and a long name ending in an
ellipsis. Past the window the beam scrolls sideways and keeps where it was
scrolled across redraws. Driven in the dev window: a session named "Where did
we leave things off" reads whole with the hook sliding along after it.

### Escape stops whoever is working (2026-09-29) — done

Standing in a session's yard while its agent is thinking or writing, Escape
calls it off, the same as Claude Code's own "esc to interrupt" and the same as
an empty line already did, rather than walking you out past it. Anything laid
over the yard and anything half-written still goes first, and once nobody is
working Escape leaves as it always has. Driven in the dev window: a long story
asked for in a fresh Aurio session stopped mid-word on Escape, the fire went
out and the yard stayed open.

### The rack carries its own way to the windmill (2026-09-29) — done

The windmill had no door of its own on the island, only ⌘, and the finder, so
a wheel — drawn ours, front-on, in the kit's own outline and wood, since the
kit's own wheel is drawn the angle it sits on a cart rather than the angle
that reads as a wheel — stands on the rack now, pinned beside the campfire,
on the island or standing deep in a project alike, and pressing it opens the
windmill on General. Driven against the packaged app: pressed from the bare
island with no project founded, opened cleanly on General every time,
including the one relaunch where it had landed mid-scroll on the disk page
before this and read as no settings page at all — fixed the same day.

### Notifications can be turned off (2026-09-29) — part, closes half of ST-09

A real switch on the windmill now: "a villager who wants you, while you are
looking elsewhere — on/off." Off, the macOS notification a session asking or
finishing or breaking would have sent while the window is out of sight never
fires; the on-window banner and the dock mark are untouched, since neither is
the noisy one. Driven against a scratch data folder over the debug port:
toggled off, the setting round-tripped through the wire and landed in
`app-settings.json` as `false`. Sound, a custom sound path and a
focus-mode window are still unbuilt — not needed for one person on one
machine, and left off on purpose rather than half-built.

### A file dragged in from the Finder is copied in (2026-09-29) — part

Standing in a folder you've walked into, dropping a real file off the Finder
onto the window copies it in beside whatever is already there, reusing the
same copy the disk-cleanup page already trusted and the same board refresh
"make a file" already used. Honestly verified, not fully driven: the copy
itself is proven, both by its own existing test suite and by confirming the
board redraws to show a new name the moment one lands; a synthetic drop with
no real file behind it was thrown at the live board and correctly did
nothing rather than throwing. What was not done, and cannot be from here: an
actual Finder drag, since the real path a dropped file carries only exists
once Electron has seen a genuine OS drag happen, and nothing scriptable can
manufacture that. Marked `part` rather than `done` for exactly that reason —
this is the one piece of tonight's work that wants a real hand on a real
trackpad before it earns the other word.

### Two things on the "built, and broken" list were already fixed

Abandoning a project and abandoning a session — struck through above — and
the windmill actually existing, corrected in W8 above: both were fixed at
some point in the last few days of W7/W8/W9 work and this file was never
brought back to say so, which is exactly the drift this file exists to
prevent. Caught by driving the real app after being told, correctly, that it
looked broken. What's left unconfirmed: whether a bare, subdivided plot
still glows and does nothing when clicked — that state only exists once all
eleven whole districts are taken, too expensive to force just to check
tonight.

### Bare land answers a press now (2026-09-29) — part

Found the actual cause of the line above: opening a district with no project
on it silently returned, because the ground itself cannot tell a claimed
cell from a bare one, only the project registry can, and nothing asked it
before giving up. It now opens the same three ways in the campfire always
has, since founding never targets a particular spot anyway. Every other
caller of that same function was checked and each one already had a real
project in hand, so nothing else changes. Marked `part`: the fix is sound
and every other path into it stayed safe, but reaching a genuinely bare
subdivided plot to press it for real costs eleven founded projects, which
this pass didn't spend.

### Every worktree that's gone stale can go at once (2026-09-29) — part

The windmill's disk page clears one worktree at a time; standing above the
list now, once two or more are stale, is a line to clear all of them
together, the same two presses as one, each row still going through the
exact clear this one press already used. Not fully driven: forcing two
worktrees to actually read `stale` needed more than the scratch session
this pass had room for — taking a session down normally clears its own
worktree outright, `stale` is only for one left behind some other way — so
the bulk line itself was never pressed for real. Marked `part` rather than
`done` for exactly that reason.

### The rest of tonight's pass, decided rather than built

A handful of ledger rows turned out to already be true and were only ever
missing the word: informed cost-before-delete for a task (WS-23) is the
same "what it would cost" line a session's own card already shows before
taking it down; a dev server's own liveness (WS-28) is already read off the
port itself, live; and a task that's being provisioned, missing its folder,
or coming down already has its own state on the board (UI-14), just never
in emdash's original shape. All three moved to `done`. Everything else left
on the original 24-row list was looked at and either already covered by
something built under a different name, or cut outright with the reason
recorded above it — nothing was left blank because it ran out of time.

### What it made is a short list, not a billboard (2026-10-13) — done

The billboard prop is gone from the top of the right column. Each thing a
session made is one line: a small pixel sign for a build, a published page
or a written file, its name to press, and how long ago. The newest is on top
and a little larger. Looked at in the yard harness with a build, a page and
a file on it.

### What it made is back, and it outlives a resume (2026-09-29) — done

The top of the right column is a billboard again with what the session made
on it: pages it published, documents and pictures it wrote, apps and
packages it built — never the source it only changed on the way, which is
still what it did. Each is pressed to go to it. The list is kept by the
village per session and only ever grows, so a resumed conversation that
forgot part of its history still shows everything; a file deleted from disk
drops off. It can be put away and brought back like every other column.
Driven in a dev instance on a scratch project: a real Claude session wrote a
markdown file and an html page and linked a page, all three appeared, the
app was restarted and the session walked back into with all three still
there, the markdown file opened on the board as writing, and the column
was put away and brought back.

### A session can control the whole Mac, not just a browser (2026-09-29) — done

"What it can reach" now offers a server that isn't scoped to one app: a
screenshot of the whole screen, switching to any app by name, and a real
click, drag, type, key press or scroll wherever the pointer is — plus raw
AppleScript as the one genuinely powerful way in, since most native Mac
apps (System Settings included) answer to it by name rather than by pixel.
It is a plain MCP server the app spawns for itself
(`assets/tools/screen-control-mcp.mjs`, no dependency of its own, driving
`cliclick` and `osascript`), offered in the catalogue like any other server
rather than switched on for every session unasked. Needs Accessibility and
Screen Recording granted to Mender in System Settings the one time macOS
asks a human rather than a script for that; a call that fails for that
reason says exactly which permission is missing.

Driven for real: the standalone server answered `initialize`, listed its
tools, read back the actual running apps on this machine, switched Finder
to the front, and returned a real screenshot. Added to a real session
through the card's own catalogue in a running dev build, confirmed it
lands in Claude Code's own MCP config with the packaged script's real path
resolved (not a placeholder), toggled on. One thing to know: that write
landed in the real, shared `~/.claude.json` rather than anything scoped to
the test, since Claude Code's own config isn't touched by Mender's own data
isolation — it was found and removed immediately after, and nothing further
was left behind.

Driven a second time on the actual task it's for: asked to open a browser,
go to Gmail and find a flight for the weekend, it opened Arc, searched
Gmail's own AI search, opened the right email and read back a real
itinerary correctly. That run found a real bug: every click was landing at
roughly double where the screenshot showed it, because the tool took
screenshot pixels as if they were the screen's own points, and this
machine's Retina display means those are not the same thing. Fixed by
converting every coordinate through the display's own scale factor before
it reaches `cliclick`, so a point read off a screenshot is now the point
that actually gets clicked.

### The lanterns say one clear thing each (2026-09-29) — done

A lantern is lit only when there is a reason to look. Working breathes and
says what kind of work and for how long ("changing things · 4m"); asking
flickers orange; something finished while you were in another session glows
green, "done · 2m ago", until you have stood in it, and then it is idle.
Dark is idle, waiting out a limit (faint red glow, "usage limit · back at
5pm"), broken ("it broke", or "needs signing in"), or setting up. The
branch is gone off shared sessions, which were all saying "main"; one in its
own copy still says "idle · its-branch". The back end now publishes a small
per-session glance beside the mood (the tool it is in the middle of, when
the turn began, what kind of wait), only when it changes; done-not-seen is
kept by the window, so a restart forgets it and shows idle.

Driven in a dev instance on a scratch project: a session left mid-turn read
"thinking · just now" with its glow, finished while another was stood in and
went green "done · just now", was walked into and out of and went idle.
Waiting, broken and asking were not provoked live; they are the same switch
on moods that already arrive.

### The houses say what their lanterns say (2026-09-29) — done

The light out of a house on the island follows the same states as its lantern:
working is lamplight breathing slowly, wanting you is orange and the only
quick pulse, done-but-unseen is a steady green, a limit a faint red ember,
broken a strong red throb, and idle is dark. An idle house used to glow as if
something needed you. Walking into a finished session puts its house out at
once. Driven in a packaged build on a scratch project: a session left working
lit its barn warm with the villager turned away, finished while another was
stood in and went green, and went dark after being walked into and out of.
Limit, broken and asking were not provoked live.

### The islet is somewhere a project can live (2026-09-29) — done

The islet was always on the map and answered nothing. It is now the twelfth
place a project can stand: the next one founded once his eleven are taken
lands there before any big district gives up a piece, and "edit districts"
carries a project onto it at any time. Empty, it is still scenery that ignores
the pointer. Its pennant is measured like every other and sails with the islet
to wherever it is moored; measuring it also taught the pennant tool never to
fly a cloth over a roof, which moved one unused piece's spot off one. Driven
in a dev instance on scratch projects: a project on the islet flew its flag in
clear air, unfurled its name on hover and walked into its yard on a click; an
empty islet did nothing on hover; dragging the fishing hamlet's project onto
it in edit districts moved it there, flag and all. Founding onto it through
the folder picker was not driven.

### A new session is asked for on a signboard (2026-09-29) — done

The right-click board of other ways to start a session is now design 1b: a
timber signboard hung over the village with a box to write in and three tiles,
its own isolated workspace, from a past session, and in a terminal. Issues,
existing branches and allow-everything are cut from it. "In a terminal" is a
new kind of session, a plain login shell in the checkout in Terminal.app's
own look, in its own tmux, running what was written first or `claude
--resume` for a picked past session; taking the session down kills it.
Along the way every board terminal now fills the board (the wash had lost its
flex layout), tmux's status line is hidden, and reopening a shell no longer
types the grid's answers to old escape queries onto the prompt. Driven in a
dev instance on a scratch repo: the sign opened on right-click and toggled
its tiles; a terminal session ran its first command in the project folder;
walking back into the project reopened it; isolated plus past plus terminal
cut a worktree and resumed the real Claude session in it. A plain
conversation started from the sign was not driven.

### A past session says what it did (2026-09-29) — done

Starting from a past session is now design 3a: its own wider signboard with a
search line, the sessions down the left and the chosen one read out on the
right. Each is called by the name Claude Code itself gives it rather than the
first line typed, and carries a sentence or two on what it did, written once
per session by a small model over the whole transcript and kept on this
machine, then worked out again only once the session has moved on. Search
covers the name, the first thing said, the branch and what it did. Driven in
a dev instance on a scratch repo with nine real transcripts copied in: the
board opened from the tile, every row filled in with what it did, arrows and
search moved the preview, back returned to the sign, and resume picked a
conversation back up with its history on the board.


### Command-N and the beam's dashed board open the new-session sign (2026-09-29) — done

Naming a new workspace used to happen on the one write line. Command-N in a
project and the dashed board at the end of the beam now hang the same sign
the empty hook does, with its own isolated workspace already on; what is
written names the workspace and the session. In a terminal in its own
workspace the box is only the name and nothing is run. Driven in a dev
instance: Command-N and the dashed board both opened the sign with the tile
on, and a name typed there came out as that workspace on the beam with a
terminal session in it. A conversation named this way was not driven, and
Command-N out on the island, which still founds a project, was not changed.

### Finding a past session had in some other folder (2026-09-29) — done

The past-session board's list stays this folder's own, but its search line
now also looks through every other folder Claude Code has kept sessions for,
scratch folders left out, and shows what it finds under "in other folders"
with where each was had. Resuming one copies its transcript into this
folder's own first, leaving the original where it was, since the CLI only
finds a session under the folder it runs in. What-it-did lines no longer
assume a conversation was about code, and lines written under the old
wording are written again. Driven in a dev instance: searched "orleans" from
a scratch project with no sessions of its own, found the New Orleans
itinerary had in slideshow, resumed it, and the whole conversation came back
on the board.


### The village behind a session holds still (2026-09-29) — done

Standing in a yard, a scroll or a drag that slipped into a gap between two
columns used to pan and zoom the island off under the writing. The camera's
drag, pinch, wheel and drift are now paused whenever a yard or a board is up
and come back the moment you walk out; the camera still flies when you switch
projects. Driven in a dev instance: scrolling and dragging on the land behind
an open session left it where it was, and after Escape the same moves panned
and zoomed the island again.

### Put away is per session, and nothing shows before it is used (2026-09-29) — done

What is put away used to be one list for the whole village, saved to disk, so
hiding what it did in one session hid it in every one after. Now it is kept per
session for the sitting, and the rules alone stay village-wide. "What you
asked" no longer stands as a bare heading before anything is said, and a left
column with nothing in it gives the middle its width like the right already
did. Driven in a dev instance: the changelog put away in one session, a second
session started showed it, and the first still had it put away on walking back;
"what you asked" appeared the moment the first thing was said.

### What it said reads bottom up, with a recap under it (2026-09-29) — done

The middle column ran newest at the top and history down. It now runs like a
conversation: the newest answer at the foot, sat on the fire and the write
line, the older ones dimmed above, following the live end as it inks in and
holding still once you scroll up. Under a finished answer is a recap, the
sentence Claude Code writes on its own when you come back to a terminal but
never over the protocol, so the village asks a small model for it with Claude
Code's own brief once a turn that did something is done, and keeps it until
something newer is said. Driven in a dev instance: three turns stacked
oldest to newest down to the write line, a short question got no recap, and a
turn that wrote and tested code got one under its answer.

### The recap sits at the foot of the column (2026-09-29) — done

A short answer left the recap floating straight under it, halfway up the
column. It now always stands at the foot, right over the write line, and a
long conversation still scrolls it up with everything else. Driven in a dev
instance: a one-word answer at the top, its recap at the bottom.

### Making room is drawn, not stammered (2026-09-29) — done

Claude's adapter announced a compaction by writing "Compacting..." into the
answer, twice for an automatic one, then "Compacting completed.", and after a
restart the summary it carried across landed on the gatepost as if you had
said it. Both are lifted out into one packing event: a strip the front crosses
while it works, with a percentage and the time against how long this session's
last ones took (or the machine's usual, scaled to size), then what is left
standing green with the sizes before and after. Driven in a dev instance: a
real `/compact` counted up to 89% at 18s against a usual 16s with the fire
saying "packing it down", then settled at 35k to 30k, took 22s; after a restart
the carried summary was gone from the post.

### A finished packing is said, not left drawn (2026-09-30) — done

The finished strip stayed on the board for good, and when the village had no
sizes for it, it was one green cell over a dashed line that read as broken.
Now it stands up green for a moment once it finishes and goes, leaving the
sentence and a single line of before, after and how long. Driven in a dev
instance with a fresh one with sizes, one without, and an old one: the first
two stood up and went, the third was only the sentence.

### Shift-Escape goes straight to the island (2026-09-30) — done

Escape walks out one step at a time and, in a yard where somebody is working,
calls them off first. Shift-Escape skips the whole ladder: whatever board or
window is open closes and the camera goes out to the island, and whoever was
working keeps working. It reaches through a shell too. Driven in a dev
instance: shift-Escape mid-turn landed on the island, and walking back in the
turn had finished on its own, "done" rather than "you stopped it".

### The newest note says itself again (2026-09-30) — done

A small gold loop in the corner of the parchment sends the newest note again,
exactly as it was said, without writing it on the line first. Pressing the
rest of the parchment still writes it back on the line to change. Driven in a
dev instance: pressing the loop after "pong" sent it again, the agent answered
a second time and the line stayed empty.

### Going again never puts the note up twice (2026-10-01) — done

The loop, "try again now" and a continue armed on a limit no longer send what
was said a second time, which stacked a copy on the post, dropped its pictures
and made a job cut off halfway start over. Claude keeps the note even when the
turn dies, so each sends a word only the agent reads: carry on from where you
stopped when the last turn was cut short, have another go when it finished.
The loop is gone while it is already at it. Driven in a dev instance: the loop
on an answered note put the parchment back to "working on it" and it answered
again, and after Escape stopped a story halfway, the loop had it finish
writing it; the post held one note each time.

### A project is let go on the water, flag or land, and asked about (2026-09-30) — done

In edit districts, a district or just its flag let go out on the open sea
brings up a window over the island, "Remove alpha?", saying its sessions come
down, the folder stays, and who else moves; "remove alpha" does it, and
"keep it", Escape or a click off it leave everything as it was. Removal no
longer refuses when the project was somebody else's only way to the fire:
whoever it stranded moves into the gap it left, or the nearest place in his
order, so removing from settings can no longer leave a project undrawn out at
sea either. Driven in a dev instance: alpha's flag dropped on the water asked,
Escape kept it; alpha's land dropped on the water asked, naming that beta
moves in closer, and removing it left beta standing on alpha's district with
the fire in reach.

### Shift-Tab turns the mode (2026-09-30) — superseded 2026-10-11

Shift-Tab on the line stepped the session to its next mode, going round the
same list `/mode` offers, the way it does in Claude Code. Taken back on
2026-10-11: Tab and shift-Tab walk the rail instead, and the mode is set from
`/mode` alone.

### A lone project can live anywhere, and the camp goes with it (2026-09-30) — done

The fire only touches the crop farm, so one project could only ever stand
there. Now, with none of the camp's own neighbours standing, the camp sails
to the biggest piece of land there is, the way the islet already did, and a
project on its own may be carried to any of his districts in edit districts.
When a move reshapes the island, the view flies out to hold it. Driven in a
dev instance: one project on the hay farm moved to the centre houses and then
the chapel, each time with the camp berthed on its shore and the island
framed; the port, fishing hamlet, forge and south houses each drawn alone
with the camp beside them.

### Closing the village does not lose the work (2026-09-30) — done

Whatever was going when the app closed goes back to work when it opens. The
village writes down, as it changes, which sessions are mid-turn or waiting on
a question, which helpers they have out, and anything said to them they had
not read yet; the shutdown itself is kept out of that record, and a crash
leaves it just as a quit does. On the next start each of those sessions is
told, on the gatepost, to carry on from where it was, and in a note only the
agent reads exactly what was cut off: the helpers to send out again, the
background commands to start again, the unread messages. A "carry on when it
lifts" armed against a limit is armed again too. It waits until the app knows
which of Claude's conversations each session is, or the pick-up would start
one with none of its history. Along the way: a helper sent off in the
background never told the village it was home, so its session stayed lit as
working forever; Claude's adapter is patched to say so. Driven in a dev
instance: quit twice past the guard with a background helper out and a
background command running, reopened, and the session came back with its
history, restarted both, wrote the file, settled to resting, and the record
cleared.

### It can ask you a question with answers (2026-09-30) — done

Claude's AskUserQuestion works in the village. Claude's adapter withholds that
tool from the model entirely unless the client says it can draw a form, and
Mender never said so, so every session answered "I can't". The runtime now
advertises forms, holds a form the agent sends in the same queue a permission
waits in (so the lantern, the dock mark and the notification all see it), and
answers it whole. The board asks one question at a time: header and "1 of 2"
over it, numbered answers with their descriptions under them, several-answer
questions marked with a tick until "that's everything", and anything written on
the line taken as that question's own answer. The app runs a newer ACP SDK than
core is typed against, where the method lost its `unstable_` prefix, so the
client answers to both. Driven in a dev instance: a two-question form, one of
them several-answer, answered by keys (Claude read back SQLite, Auth and
Billing), and a one-question form answered by writing on the line (read back
exactly as written).

### A background command stays running until it finishes (2026-09-30) — done

Checked what else Claude's bridge withholds, with a new `check:bridge` that
drives a real terminal Claude and the bridge against a fake local API. Tools
now match a terminal's exactly. Of the switches still off, only background
command lifecycle was worth having: live command output doesn't exist over the
bridge either way, browser sign-in only fires for MCP servers the client hands
over (Mender hands over none), and the changed-files report costs a hidden
extra model turn for what git already knows. Background lifecycle comes as
`async_task_*` updates the ACP SDK rejects, so the Claude plugin rewrites them
off the wire into updates on the Bash step that started the command, marked
background so the transcript keeps it running past its turn. The step reads
"still going in the background" with the running ember, settles when the
command ends, and the cut-off record names the commands still out so a reopen
restarts exactly those. Driven in a dev instance: a backgrounded `sleep 45`
stayed running after the answer, settled on its own when it finished, and a
second one sat in the cut-off record by its command.

### Background work keeps the answer and the lantern lit (2026-10-08) — done

A turn that answered with a command still going in the background used to say
"done" over the answer and "idle" on its lantern, so a glance read finished
when it wasn't. The answer now says "still running in the background" in the
fire's orange with its ember, and the lantern stays lit as working, saying
"running in the background", until the last background command ends, then
settles to done and idle by itself. The lantern you are standing in no longer
says "you are here"; it says what it is doing like any other. Driven in a dev
instance with a backgrounded `sleep 150`: both read running while it ran and
flipped to done and idle on their own when it finished.

### A question stands at the foot of what it said (2026-09-30) — done

A question, a permission or a form, used to take the top of the right column,
where it got lost beside the answer everybody was actually reading. It now
stands at the foot of the middle column, right over the line it is answered
on, and the column scrolls down to it when it arrives. Driven in a dev
instance: a two-question form showed at the foot of the answer, was answered
by keys through both questions, and Claude read the picks back.

### A question is pinned and set apart (2026-09-30) — done

The question is pinned to the foot of the middle column rather than flowing
after the answer, ruled above and below on a darker wash, with the answer
scrolling in the room over it. It has its own type now: Silkscreen for the
header and the answers' names, Fraunces italic with its wonky letters for the
question, Josefin kept for what each answer means. An agent's "(Recommended)"
comes out of the name into a quiet tag. Driven in a dev instance: a
two-question form pinned at the foot, answered by keys, and the column took
its room back once it was answered.

### A question can be sent, answered your own way, checked, or talked over (2026-09-30) — done

Under the agent's own answers the board now adds, set apart: "something else"
(takes the line for your own answer; the line's prompt says so), "that's my
answer" on a question that takes several (return on an empty line too),
and "talk it over instead", which answers each question with wanting to talk
first so the agent comes back to discuss rather than being stopped. A form of
more than one question ends on a check before it goes, each answer pressable
to go back and change, then "send it" or return. A written answer no longer
flies up to the gatepost as though it were something new said. Driven in a
dev instance: multi-pick sent by return, the check step, going back to rewrite
one answer on the line, sending; and talking it over, which got Claude asking
questions instead of picking.

### A question is worked from the keyboard, and answers look like answers (2026-09-30) — done

The keys only reached the question when the keyboard was not on the write
line, and numbered rows mixed the agent's answers with the board's own
actions, so neither arrows nor return did anything visible and nothing said
which rows were choices. Now the write line hands the question its keys while
it is empty: arrows walk a lit row, return presses it, numbers pick, tab sends
what is ticked. Answers carry a ring or a box; the actions sit on their own
line under a rule with the keys spelled out. Driven in a dev instance with
keys only: a single pick by arrow and return, a multi-pick ticked by return
and sent with tab, the check sent with return, Claude reading back the picks.

### Out of usage is drawn, and carries on by itself (2026-10-07) — done

A limit used to be one line of capitals and "start over": Claude's typed
report carries its reset time only in its headline ("resets 11:20am
(America/Los_Angeles)"), which nothing read, so "carry on when it lifts" was
never offered and the lantern read like any idle one. Now the headline is
read in the zone it names, counted from when the limit was hit (kept across
a restart), and a limit that cuts a live turn off arms its own carry-on,
a little past the minute Claude named. The board draws it: a banked red
hearth, a strip from hit to lift with the front glowing where now is, how
long is left set large, and "don't carry on by itself" / "start over" (or
"carry on now" once it has lifted). The lantern burns low red in its glass
and says "limit · back 12:14pm", even the one you stand in; the house glows
red-amber and slowly; the project's board on the rack carries a low red wash.
Driven in a dev instance against a local fake API answering as a real
subscription limit (Claude printed the exact real line): the board, rail,
house and auto carry-on all seen, and the turn went again unprompted once
the reset passed. Not driven: a weekly (dated) limit, read only by test.

### A limit's lantern fills with ember as the wait runs out (2026-10-07) — done

The limit lantern was lit and tinted red with its name in the warn orange,
which across the room read the same as one asking for you, though a limit
needs nobody. Now it hangs dark with ember rising from the bottom of its
glass by how much of the wait is behind it, a little and no more when no end
was named; its glow sits low and only grows in the last stretch, its name is
the idle tan, and only the line under it is red. The one you stand in gets
the same lantern rather than the bright standing-here one. Looked at in the
yard harness, an early and a late limit side by side on the real rail; not
provoked as a live limit in the app.

### What was said goes with a session (2026-10-07) — done

Taking a session down used to leave every word of it on the machine: Claude's
own transcript, its helpers' transcripts, the copies of files it kept for
undoing, and on Mender's side its recap, what it made, its draft, and every
picture ever dropped on it (those were never cleaned up at all). Now all of
it goes, by default in every project, whichever way the session comes down;
a project's settings can keep it instead, which brings back the readable
ledger, under its own heading near the top of the settings, "when a
session ends", with a button for the other way (it first went in as a line
at the very bottom, where it was not found). Driven in a dev instance: a session spoken to, taken down from its
card, its transcript gone and still gone after Claude's own exit writes,
which on the first try had put the last prompt back. The keep switch
flipped both ways in the settings window. Not driven: the keep path end to
end, and a terminal-only session, whose hand-started Claude this cannot see.

### A limit read back is dated by the transcript, and the wait moves (2026-10-07) — done

A limit hit before the village was watching was dated "now" when read back,
so a session that ran out at 8:41 and lifted at 11:20 said it would lift at
11:20 tomorrow. It is now dated by its own line in Claude's transcript,
matched on its words since a session read back can surface an older limit
than its latest, a wrong date already kept is corrected, and one from the
last twelve hours carries on by itself too, straight away if it has already
lifted. The board moves: the count ticks in seconds to the moment it goes
again, the front cell fills as the minutes pass and throws embers, the cells
still to wait shimmer toward it, a gold post stands where it picks back up,
and once it lifts the strip stands up green and the fire catches. Driven in
a dev instance against the fake limit: ticking frames, a corrupted stored
date corrected on restart, and the session carrying on unprompted after it.

### A message can be taken back before it is read (2026-10-07) — done

Up on an empty line used to skip straight to what was said before, and
anything said while the agent worked was handed to it at once, cutting off
whatever it was saying and leaving nothing to take back. Now a message said
mid-turn waits in the queue until the agent next pauses between steps, as
Claude Code does, and up on an empty line takes everything still waiting back
off the post and onto the line. Calling a turn off before any word or step
has come of it takes its note down and puts it back on the line, and it stays
off the post after a restart. Driven in a dev instance with a real Claude:
a note stopped a second after sending came back on the line with the post
empty; a queued note came back on up; a queued note left alone reached the
agent between two shell steps and the turn finished clean.

In his own app the first cut failed twice: a second stop in a row put nothing
back, because Claude writes the first stop down at the head of the next turn,
and every stop left an empty "you stopped it" line on the board; a picture
sent on its own was never taken back at all. Now the stop it wrote down is
read past, the ghost lines go with the note, and pictures come back on the
line as `[picture 1]`. Driven in a dev instance: three stops in a row each put
the words back with no lines left over, a pasted picture came back alone, and
the send after them was answered.

Up on an empty line while it was still only thinking used to walk back through
what was said and leave it thinking about a note that was now back on the
line. Now up there calls the turn off the same way Escape would, when nothing
has come of it yet, and only walks back through what was said once it has.
Driven in a dev instance: sent, pressed up while it was thinking, and the
words came back to the line with the fire out and the post clean.

### Wagons and riders on the roads, read from high up (2026-10-07) — done

Pulled back over the whole island a villager is a fleck, so the roads now
carry what still reads from there: covered wagons with a carter on the box and
riders on horseback, each drawn side on, coming and going, going from one
lived-in district to another along the artist's paths, more of them the busier
the island is, and horses grazing on the farms. They grow a little as the
camera rises, one waits behind another rather than driving through it, and
after dark each carries a lantern.

Underneath it was a fault older than any of this: every road counted as the
lowest ground on the island, because the paths are one layer drawn under all
the grass, so nobody could step off a road onto the grass beside it and most
of the village was dozens of sealed pens. Each stretch of road now takes the
height of the grass it runs through, and the main plateau is one place.
Driven in a dev instance with his projects, from the top at noon and at night:
wagons and riders set off, kept moving, turned without flicker, finished their
trips and went, and none of them stacked or stalled.

### A stop the village caused is not blamed on him (2026-10-07) — done

Closing the app kills every Claude that is mid-answer, and Claude writes that
down exactly as if he had stopped it, so every reinstall left a "you stopped
it" line in every busy session, stacking up where several came in a row. Now a
stop followed by the note the village sends on opening again says "the
village closed", and stops one straight after another with nothing between
them fold into one. Driven in a dev instance: a long answer under way, the app
killed, reopened, and the board said the village closed where it used to say
you stopped it, and the session picked back up and finished.

Then turned well up: every lived-in district keeps a couple of wagons and a
couple of riders on the road, more on top for how busy the island is, sent
out a second or two apart and mixed rather than all the wagons first. Driven
in a dev instance at noon from the top: wagons and riders on most roads at
once, none stacked.

### Command-shift-T brings back a closed session (2026-10-07) — done

The way a browser reopens a closed tab: the last session closed in the
project you are in comes back on the same branch with its whole conversation,
and pressed again the one before it. From the island it reaches into the
project you last closed one in. Putting one back used to start a blank
conversation in its place; now the agent picks up the very session it was in,
and a project that forgets what was said holds that back until the session
falls off the pile or the app restarts. Driven in a dev instance: told a
session a word, closed it, pressed the chord from the island, and it came back
with the conversation on the board and named the word when asked; pressed
again it said there was nothing closed to bring back.

### A project can be put away: on the rack, off the island (2026-10-08) — done

The rack holds any number of projects, the island does not, and most of them
are rarely worked in. Right-clicking a board on the rack offers "put it away":
its district goes back to sea and the island lays itself out with only the
ones kept on it, while the board stays on the rack, weathered grey, every
session in it untouched. Pressing a put-away board still walks straight into
its yard, stood over the campfire. Right-clicking it again offers "put it back
on the island", which takes the next free place the way founding hands them
out. Letting a district go on the water in edit districts now asks "off the
island?" with "put it away" first and "remove" second. And founding a project
when every place is taken no longer refuses: it moves in put away. Driven in a
dev instance: five projects, two put away from the rack and one by dragging it
onto the water, the island down to three districts, one put back onto the
castle it had left, a put-away one walked into from the rack and out again.

After dark a wagon hangs a lantern at either corner of its box, drawn on the
wagon by day and lit at night, each throwing a pool of warm light on the road
bigger than a walker's lantern, and they are lit before anybody else's so a
wagon is never left dark by the cap on lights. Driven in a dev instance at
midnight from the top: every wagon on screen lit at both corners, side on,
coming and going.

### A put-away board is dragged back onto the island (2026-10-08) — done

Pulling a weathered board down off the rack, rather than along it, lifts it
off its chains and carries it out over the island, which turns to edit
districts so the empty places show pale. The place under it lights and the
line says what letting go would do; let go on an empty place and it moves in
there, on somebody's and the two trade, that one put away instead, and
anywhere else it stays on the rack. A pull that starts sideways still turns
into one once it heads well down. Driven in a dev instance: delta dragged
onto the empty watchtower and stood there, echo dragged onto charlie's south
houses, echo took them and charlie went back to the rack.

### There is traffic on the sea, and it lands at the piers (2026-10-08) — done

The water is no longer empty round the island. Sloops come in past the coast
and go out the other side, a two-masted ship goes by well out, a log raft is
poled along under a patched sail, fishers row out and sit at anchor with a rod
over the side, and a rowing boat pulls in to a pier. Buoys bob off the piers,
a barrel or a log drifts past, ducks paddle along the shore, and everything
that moves leaves rings and has the water lapping at its hull. After dark the
boats carry a lantern and the buoys blink. A boat only ever ties up at a pier
the artist drew, and only one whose end is still over water and can be sailed
to; tied up, whoever came on it walks up the pier into the village and
townsfolk come down from their doors and walk out to board before it casts
off. A push now loads a sloop at that district's pier rather than a boat
setting off from a beach. Driven in a dev instance: a rowing boat berthed
beside the south pier, one passenger walked up into the village while a local
came down the pier to it; from the top at noon sloops, the ship, two fishers
and the ducks all on the water at once; at midnight the fishers' lanterns lit.

### The boats are the villagers' size (2026-10-08) — done

The boats were drawn smaller than the people who walked out to board them, so
from the water nobody could tell what they were. Every one is redrawn at the
villagers' own scale with a real seated villager aboard: a sloop with a
sailor at the tiller, a rowing boat with its rower, a raft with a fisher
poling it, a fisher's dinghy with a rod out, and a ship twice that with two
masts, square sails, a crew on deck and gunports; the buoys, barrels and
driftwood grew with them. A boat ties up against the side of a pier rather
than in it. Driven in a dev instance: a sloop tied up beside the islet's pier
with townsfolk walking down to it, a raft and buoys plain to read close in,
and the sloop, raft and ship each recognisable from the top of the island.

### The map is back as it was (2026-10-08) — done

The two changes to where the camp pitches and which piers stand are undone; the
composer is exactly what it was before the boats came. The boats never needed
it: a pier whose end is on grass is simply never called at.

### Where the camp comes alongside, the land joins (2026-10-08) — done

With the crop farm put away the camp sails over and berths against the
north-west houses, and the join between them showed a line of sea and a square
tab of meadow with no edge: both sides were his drawing, but never drawn
against each other, so nothing redressed them. Now the cells either side of
that join, where meadow meets meadow, and the camp's old cut side where it now
faces the water, are handed back to the shore pass as ground to lay and dressed
with the brush like any coast it makes. Nothing changes while the camp is at
home. Driven in a dev instance on his own set of districts: one piece of land
from the fire to the houses, a proper coast along the camp's north side, no
stray terrace below it.

### A pier left on dry land goes (2026-10-08) — done

When the camp sails over and berths against the north-west houses it lands
right where that district's pier met the water, and the pier was left standing
in the middle of the grass. A pier whose every cell is now land is taken off
the map; every pier that still reaches the sea stays exactly where he put it,
all four with the whole village standing. Checked by composing his own set of
districts, where only the islet's pier is left, and the full island, where all
four are.

### The boats are boats from every side, and keep off the cliffs (2026-10-09) — done

The boats were cut-outs drawn side on and flipped, so anything heading up or
down the screen read as a plank, and they steered by the map's idea of land, so
one could tie up on a cliff face standing out over what the map called sea.
Now each boat is a small model, hull, mast, sails, crew, drawn by
`tools/boats.py` at sixteen headings in the kit's own lighting, wood and ink,
the sloop's boom and the ship's yards carried round so a sail always shows its
face; a boat comes about at its own pace towards where it is going. The water
it keeps to is read off the same picture of the ground the foam uses, and a
pier is only called at if a whole hull fits along its side on that water.
Driven in a dev instance on his own set of districts at noon: a rowing boat and
a sloop tied up along the islet's pier, sloops coming about and leaving wakes,
the ship, the raft and the fishers out on open water, nothing on a cliff.


### Claude's own sign-in reaches a bridged session (2026-10-11) — done

A session here is Claude Code spawned by the village with an environment cut
down to a list, and the list was upstream's: it carried an API key, Bedrock and
Vertex switches and the uppercase proxy variables, and nothing else. On a
machine that signs in any other way, a long-lived token exported from a shell
profile, a named Anthropic profile, Foundry, a company gateway, a company
certificate bundle, mTLS, or the lowercase proxy spellings git and curl read,
a terminal Claude worked and a session in the village could not sign in. Every
sign-in and network variable Claude Code's own documentation names now
passes through, on top of upstream's list rather than in place of it, and a
secret that is not one of them still does not. Checked by test on the
allowlist; not yet driven on a machine that signs in one of those ways, which
is what his work machine is for.

### Tab walks the rail (2026-10-11) — done

Tab stands you in the next session along the rail and shift-Tab in the one
before, going round at either end, from anywhere in a project: the line with
something half written on it, which stays with the session it was written
in, the yard with the line not holding the keyboard, or the project's own
yard before any session is stood in, where forward is the first lantern and
back the last. A slash list open under the line keeps Tab for picking, and a
question at the gate keeps it for sending, as they did. Out on the island
Tab does nothing. Shift-Tab no longer turns the mode. Driven in a dev
instance on three sessions: Tab from the third wrapped to the first,
shift-Tab twice went back to the third and then the second, "hi" written on
the second stayed there across a step away and back, Tab after a click off
the line still stepped, and Tab on an open `/` list picked `/model` without
moving.

### The five hours is said over the board, and who spent it is in the windmill (2026-10-11) — done

Claude's subscription is one meter for the whole account, and nothing warned
anybody it was running low: a turn was simply cut off and the village waited
it out. Now every session's board carries one quiet line under its context
line with how full the window is, how far in it is, and where its pace lands
against the reset, orange when it falls short and red when it is nearly
spent. The meter comes off the headers every answer comes back with, which
Claude's bridge was already handing on under `_meta` and the shared runtime
was dropping; the core usage model carries it now, and between turns and at
startup the village asks for it itself with one one-token call to the
cheapest model, at most once in a few minutes. The windmill's "this machine"
page draws the window as the limit wait's own strip of cells with the
run-out cell in red, the week under it, and then who spent it, every Claude
session on the machine, read incrementally off Claude's own transcripts
since the window began, as a bar against the hungriest with its share, its
calls, what each call re-reads and how many pictures it carries. Driven in a
dev instance on an isolated data dir: the board's line read the real meter
off the probe before anybody had said anything, and the windmill named this
afternoon's sessions in the order the transcripts put them.

### A session eating the five hours is stopped and put to him (2026-10-11) — done

The meter alone said nothing about who to stop. Now a watchdog reads each
working Claude session's last quarter hour off its transcript, prices it
against the window from the meter, and compares it with what a session here
normally takes in one, from the last week. One well out of the ordinary is
stopped where it stands, note kept on the post, and a window over
everything says what it took, how that compares, when it alone would run
the window out and what it is thinking with, offering carry on, carry on
with a cheaper model, leave it stopped, or walk in first. The board's top
line now says the session's own share. Driven in a dev instance with the
threshold forced tiny: a session running a minute-long command was stopped
mid-command, the window came up with Sonnet 5.5 and Haiku 4.5 offered under
Opus 5.5, and picking Sonnet switched the session and it carried straight on
with the same command. Against today's real transcripts the same rule
would have stopped the Fable session taking a fifth of the window every
quarter hour, about five times normal. Still says "you stopped it" over the
cut turn rather than naming the watchdog.

### Fable is plain on sight, and the five hours waits under a hover (2026-10-11) — done

A session thinking with Fable wears a violet "fable" tag with a gem by its
name, its model is violet with the gem, its rail lantern says "fable" in
violet, and `/model` marks every Fable violet and "dearest". The lantern's
mark follows a change of model as it happens. The five-hours line no longer
stands at the top of the board: it comes up under the model line while the
pointer is on it. Driven in a dev instance: switched a session from Sonnet
to Fable 5.1 through `/model` and the tag, the violet model, the rail mark
and the list marking all showed; hovering the model line showed the session's
share of the window and leaving it hid it.

### ⌘+ and ⌘− size the writing (2026-10-12) — done

A View menu with Bigger (⌘+), Smaller (⌘−) and Actual Size (⌘0) zooms the
page a tenth a press, kept in `text-size.json` across a restart. The island's
canvas is counted in screen pixels rather than the page's, so the art stays
at the scale it was drawn and only the writing grows; everything that carries
a point between the page and the island goes through `page-zoom.ts`. Driven
in a dev instance: three presses and the island stayed pixel for pixel the
same while the rack, the yard and its columns grew and rewrapped, a hover lit
the right district and a flag's name still came off its own flag.

### A long turn says its steps as it goes (2026-10-12) — done

While a turn is going, every line the agent says to you in it stays out in
"what it said" above the newest, a little dimmer, so a long turn reads as its
steps; once the turn is done they fold under the final answer as before. The
folded column also counts its window in what it shows, so a turn with a lot
of reasoning no longer pushes earlier answers out of it. Driven in a dev
instance: a turn with four steps showed each line as it came with the newest
large under them, and on finishing folded to the one answer under the last
turn's, dimmed. Something said to it mid-turn, or the village closing on it
and picking back up, opens a new turn underneath, and those no longer fold
away what it had told you before them: driven by sending a message halfway
through a three-step job, every step line stayed up across it.

### The right column tells the session as a story (2026-10-12) — done

The right of a session's board is no longer the plan stacked on a flat log of
every tool call. From the top: what it is after, a sentence worked out by the
small model from everything said rather than the first line, with where it
stands under it; what it made, as before; how it went, each piece of work it
has been through named for what came of it, with a tick, a half ring, a dash
or the ember for the one it is on, "committed", "pushed" or "built" read off
what it actually did, and his putting it right standing between two pieces in
the post's ink; and loose ends, what it said it left undone or could not
check. The piece it is on carries the plan and "just now", what it did since
the newest note; a finished piece folds its steps under a count that opens
them. The yard's ground only stands while a helper is still out. The story is
told again a moment after each new note and once each turn comes to rest, and
kept per session in `agents.json`. Driven in a dev instance across five asks
on a scratch repo: the goal followed the newest ask, a correction showed as
"you said", the live piece lit with only that ask's steps under "just now",
and an unrelated ask opened its own chapter.

### A lantern that has answered says done, not idle (2026-10-13) — done

Once the green "done" has been seen, a session's lantern used to fall back to
"idle", which read as if nothing had ever been asked of it. It now keeps
saying how its last turn came to rest and how long ago, "done" or "stopped",
dark like any other resting lantern; "idle" is only for one nobody has asked
anything yet. Driven in a dev instance: a fresh session read "idle", after one
answer it read "done · just now", ticked to "1m ago", and read "done · 3m ago"
after the app was restarted.
How each one came to rest is kept, so a session nobody has opened since the
app started says it too rather than "idle" until pressed; driven with one
answered session left asleep across a restart beside a fresh one, which read
"done · 26m ago" and "idle".

### A dropped internet is said as one, and carries on by itself (2026-10-14) — done

A lost Wi-Fi used to read as "the other end is having a rough patch", under a
green "done", and sat there until pressed; once Claude Code gave up retrying,
its raw "API Error: ... (ENOTFOUND)" line was also shown as the answer. Now it
reads "can't reach Claude, the internet looks to be down", the turn says "cut
off", the raw line goes, and the session goes again by itself once the API
answers. A real service error tries again at 2, 5, 10, 20 and 30 minutes and
then stops. Driven in a dev instance with Claude pointed at a host that does
not exist: Claude's own ten retries ran out, the board drew the new wait with
"don't carry on by itself", the rail said "offline · back when it is", and it
carried on by itself ten seconds later. Not driven: a real service outage.

### A project's Jira board hangs on the rack, and a ticket is taken on from it (2026-10-14) — done

A blue diamond token on the rack, between the sky and the wheel, lays the
project's Jira board over the yard: its own columns in its own order, every
ticket a parchment note, yours pinned brighter than the team's, done ones
weathered and folded into a count, and the one a session here is working on
carrying that session's lantern light and mood. The windmill's Jira page
connects any number of sites with an email and an API token (kept with the
machine's own safe storage) and holds the recipe a session taking a ticket on is
told first. A project picks its board once from every connected site. A note is
pressed to read the ticket, dragged to another column to move it in Jira, and
"take this on" cuts an isolated workspace named after it, hands it the recipe
and moves the ticket out of to-do. "Pin a new one" is written on the line.
Scrum boards read the running sprint; kanban reads the open work plus the last
two weeks done; a project with no board at all (a service desk) gets one column
per status. Driven in a dev instance against a real personal site: connect,
link, read, move both ways, pin and take on (on Haiku). Not driven: the work
site and its on-call board, which need his work token on that laptop.

### A Jira board is found on a big site, by search or by its link (2026-10-14) — done

A work site has hundreds of boards, and a big project has one per team, so a
project is now tied to a board rather than to a Jira project. Picking one opens
on the boards your own tickets are on, the one holding most of yours first;
writing on the line searches every board by name, project or key, and pasting
a board's link from the address bar (new or old form) goes straight to it. The
board's header names it, and "tie it to a different board" swaps it. The
windmill's Jira page shows each connected site filled in, site, email, token
saved and who it signed in as, rather than clearing the form as though nothing
had been kept, and folds the empty form behind "connect another site". Driven
in a dev instance on the personal site: the opening list, a typed link, a real
paste, return linking it, and the windmill page. Not driven: a site with
hundreds of boards.

### The board can always be swapped, by pressing or by pasting its link (2026-10-14) — done

A board tied by mistake had no way off it while it was still loading, and a
slow one could hang there for good. "Tie it to a different board" now shows
the whole time, a load that takes too long says so instead of hanging, and a
board's link pasted on the line with the board open, whatever it is showing,
swaps straight to that board. Driven in a dev instance: a pasted link with a
board open swapped it.

### Each project's board is a link pasted in the windmill (2026-10-14) — done

The windmill's Jira page has a field per project for its board: open the board
in a browser, paste the address bar, return. It saves, names the board under
the field, and replaces whatever was picked before, by accident or not;
clearing it lets the project pick again off the rack. Driven in a dev
instance: a pasted link saved, the board named, and the link stored.

### Jira is drawn as Jira, every field and all, not as notes on the wood (2026-10-15) — done

The quest board on the brown wash is gone. The blue token opens the project's
board over the whole window in Jira's own dark theme: its columns, sprint,
quick filters, people, epic and type filters and search; cards with epic tag,
type, key, flag, points, priority and the assignee's face; drag to move through
the workflow and to rank. A card opens Jira's issue view: editable summary,
rendered description edited as markdown, children, subtasks, links,
attachments, comments (add, edit, delete) and history, with status
transitions and every editmeta field down the right edited with Jira's own
pickers. Create, site-wide search and "open in Jira" are in the top bar.
Sessions' lights and "take it on" sit on top. Boards with no board behind them
get a column per status. Driven in a dev instance on the personal site: a
label added and removed, a comment written with bold and deleted, status moved
there and back, a card dragged to another column, a ticket created into a
column, a session's light on its card, and a board-less project. "Take it on"
was not driven end to end, since it starts a real agent turn; only its ticket
read changed.

