# MENDER — what this repo is

**Mender** (Amharic *መንደር*, a village; and in English, one who mends) is an
agentic coding environment whose entire interface is a pixel-art village.

You open it and you see the village. Each project is a district on an island.
Each task inside a project is a building in that district. Each running agent
session is a villager, and what the villager is doing tells you whether it is
working, waiting on you, finished, or broken. The island physically grows as
projects are founded and grow. With nothing on it, it is a small island with a
campground and a fire.

Nothing in this app is conventional app chrome. Settings is an island with a
windmill on it. Opening a district pulls the camera in on it and dims the
village to a place at night, and the writing goes straight onto it: no board
slides in, no panel comes down, no page turns. There is no title bar full of
buttons, no sidebar tree, no tab strip. The village keeps living behind
whatever is open; it is never a screen change.

## This is a fork of Emdash, and only the back end is inherited

Upstream is `generalaction/emdash` (Apache-2.0, Copyright 2026 General Action,
Inc.), tracked here as the `upstream` remote. Its licence and notices stay.

**We keep its entire back end.** The wire runtime, the agent runtimes, git and
worktrees, terminals, file services, search, host dependencies, the domain
contracts. That layer imports neither Electron nor React and is built to be
spoken to by a different client. We pull upstream and keep taking improvements
to it.

**We delete its entire front end** and write our own. That means we never merge
their UI changes, which is what makes this fork sustainable: the merge pain in
a fork like this all lives in the front end, and we do not have theirs.

## The rule that outranks the feature list

`docs/mender/BUILD-CATALOG.md` lists every capability Emdash has today, with a
column for how each one appears in the village. It exists so nothing vanishes
unnoticed. **It is an inventory, not a target.**

Mender is deliberately simpler and cleaner than Emdash. "Upstream does it this
way" is never on its own a reason for us to. Where something can be reached
through fewer, calmer, more physical moves, that is the better answer even
though it scores lower on parity. Where a feature is genuinely not wanted, it
is cut on purpose and recorded as cut, not smuggled back in as a panel because
upstream had one.

One screen. One thing being read at a time, laid over the village rather than
instead of it. Not several boards, not propped panels, not split panes, not a
tab strip.

## Where things are

| | |
|---|---|
| `docs/mender/STATE.md` | how far along this actually is: every ledger row's state and the wave it belongs to. The only thing allowed to answer "how much is left" |
| `docs/mender/BUILD-CATALOG.md` | the feature ledger, the open design questions, the build list, the art list, the risks |
| `docs/mender/catalog/` | the nine source audits that document was built from |
| `AGENTS.md` | upstream's own instructions for working in this codebase. Still true for back-end work |
| `packages/village/` | the world: what a state of the village is, and the shore pass that cuts a coast round it. Draws nothing, knows nothing about Electron |
| `apps/mender/` | the app: the Electron shell, the wire to emdash's runtimes, and the Pixi renderer |
| `apps/mender/assets/` | the world files, the packed sprite kit, the board's timber, the villagers and the one typeface. `tools/pack-kit.py` and `tools/make-board.py` rebuild the first two from the Cainos art, which is purchased and lives outside both repos; `tools/make-folk.py` draws the villagers, which are ours |
| `../a-cozy-agents-village/` | the artist's map, his partition of it, and `world/his.py`, which is what this app's composer is gated against. The editor and the brush live there |

## What is known and what is not

The island draws, it grows, and it opens. The state rules and the shore pass
are ported out of Python and produce a map byte-identical to the one the
village repo's own pipeline produces; the kit is packed into one texture; the
camera pans and zooms and comes to rest on whole pixels; founding a project
cuts a new district into the coast; and picking a district pulls the camera in
on it and brings the board in beside it, with that checkout's branch, its
uncommitted files and its last commits written on the wood, changing as the
tree changes.

**Sessions are real, and each one is a checkout of its own.** Emdash's whole
runtime chain is up underneath: conversations, ACP, the TUI agent runtime,
terminals, scripts, host settings, and the workspace registry that cuts
worktrees. Starting a session asks what is going to happen in it; what you type
on the wood becomes a branch and a worktree, and that session is then its own
checkout with its own board. Two agents are never loose in one working tree.
Nothing about any of it is a stand-in.

**An agent runs in a task, and it is a villager.** Hanging a lantern on the
empty hook at the end of the rail moves somebody in: the ACP runtime spawns
that agent's own CLI in the task's worktree, and from then on the yard is what
is happening in there — what was said, what was read, what was run. Not a
building: houses are scenery and picking one walks you into the project, never
into a session, because a project has as many sessions as it has work and a
district has as many houses as the artist drew. Agents write in markdown whether or not anybody asked, so it is
read rather than shown: there is no second weight here to set anything bold in,
and the gutter, the indent, the gap and the tone carry headings, lists, quotes,
rules, tables and code without one. The last line of the board is where you write back; there is no
text field anywhere in this app. An empty line while somebody is working calls
them off.

**The bottom of the board is what is coming.** Under everything that has
happened, and above the line you write on, is what the session says it means to
do next, then how much room it has left to think in, then anything you said
while it was busy and it has not heard yet, which you can take back by pressing
it. Nothing warns an agent that it is running out of room; it simply starts
losing the beginning of the conversation, so the village says it instead.

**Opening a project is walking into the work.** Not a list you press into: you
land in the session you were last in, standing in its yard at night. What you
asked for is nailed to a gatepost on the left, newest on parchment and the ones
under it weathered into the post. What it is thinking rises off the fire in the
middle, oldest first and brightening as it comes down to what is happening now,
which is the one thing on this screen set large. What it made is loaded on a
cart to the right, with everything it did listed under it, a prop from the kit
standing for each: a signpost for something read, a crate for something
written, an anvil for something changed, a tub over the fire for something set
running. Under all of that is the ground itself, with whoever it sent out
standing in the firelight with an answer or off in the dark still working.

The fire is the session. Lit is somebody working, banked is somebody who has
stopped and is standing at the gate, embers is finished, out is nobody home,
and the light in the whole yard follows it. A place nobody has touched for days
is darker than one somebody is standing in, because age is carried by the light
here and never by a date.

**The rail is the sessions, and the projects are a rack on the wall.** A plank
along the bottom hangs one lantern per session in the project you are in: lit
means somebody is awake in there, the one you are standing in hangs lowest and
brightest, and the one that wants you flickers. At the end of the beam is one
empty hook, which is how a new session is started. The projects moved to a rack
in the top right, over both the island and the yard, one slot each with the
project's own face in it, its app icon or its logo, and a prop from the kit
until it has one, and no names until you hover. It folds away.

**A project's name opens its settings, in a window of their own.** Settings
are about the place, not the work, so they are the one thing that is not laid
over the yard: a window pops up over everything with a close mark, and it goes
on a click outside it or Escape, leaving the session under it untouched. In it
is the icon it wears on the rack, picked from the images already in its
checkout or chosen from anywhere, its name, typed straight into the window,
what every new session carries into its worktree that git would leave behind,
where it is, and removing it. A project that has just moved in opens it first.

**Everything else is laid over the yard, never instead of it.** A file, a
change, a commit, a folder, a search, a shell, a pull request, the card behind
`/agent`: opening any of them drops the world to silhouettes and brings a flat
brown wash down over the middle and the right, with what you asked for written
on it. The gatepost keeps its column and the rail keeps its strip, so while you
read you can still see what you asked for and who else is working. The way home
is written across the top, one gold step per level, and Escape walks the same
steps one at a time. A click anywhere outside what is open closes it.

**Gold is pressable and pressable is gold.** Nothing else anywhere is gold, and
a pressable thing carries no underline, no arrow and no box. The result of
pressing lands on the line you pressed: it rewrites itself with what happened,
sits long enough to be read and settles back, except a failure, which stays.
Anything that cannot be taken back needs two presses and the first press is
what names the cost. Nothing spins: a wait is a number counting up, and a wait
too short to notice says nothing at all. There are two exceptions to the gold
rule in the whole app and they are both deliberate: the rack of projects, which
is an inventory rack out of a game rather than a piece of the board, and the
names on the rail, which keep their posture tints because the rail's whole job
is telling you from across the room which session wants you.

**Nothing teleports.** Anything that is the same thing a moment later slides
to where it is now, anything new arrives, and what you say lifts off the line
and pins itself to the gatepost. While a session works, the bottom of the middle
column is a small fire throwing sparks, with what it is doing in the present
tense and how long it has been at it, and the answer inks in as it comes. Words
ease; the sprites still step, because they are pixel art and writing is not.

**A slash on the line is how a session is worked.** Writing one opens
everything you could mean right where you are writing it: a small dark slab
standing on the line with its left edge on the slash, the names in the type and
what each is for after them, the best match first and the whole list there to
scroll. It is the one solid surface in the yard, because a list read over a
transcript is two things to read at once. Most of it is the agent's own:
whatever its CLI advertises when it starts, which on Claude is its commands and
every skill it has been taught. Some are the village's and never reach the
agent as words, because picking a model is a setting on a running session and
not a sentence: `/model`, `/mode`, `/effort` and, where the agent has one,
`/collaboration` list what that agent itself says it offers and set it there and
then, and `/agent` turns the board over. And under them is what you have kept:
`/keep` and whatever you write after it keeps it to say again, picking a kept
one writes it on the line, and `/forget` lets one go in two presses. It matches
anywhere in a name or in what it says about itself, the way Emdash's does, and a
slash later in a sentence opens the agent's and yours but never a setting.
Arrows walk it, return or tab picks, escape closes it and keeps what you wrote.

**A picture dropped on the wood is carried.** Drop or paste one on a session's
board and it waits by the line you are writing on until you say something, then
goes with what you say; pressing it puts it down again. It is never drawn on the
board, because the board is writing, so what the board says is that you have it
and afterwards that you handed it over.

Anything else dropped on it is written on the line as where it is: a picture is
the only thing an agent can be shown, but any file has a path, and that is the
one thing about it you cannot get across by describing it.

**An @ names a file in that checkout.** A path is the one thing you cannot get
across by describing it, so writing an @ turns the lines under it into what is
actually in there, narrowing as you type, and picking one writes the whole path
where the @ was. The same slab and the same keys as the slash.

**A block of code is pressed and it is yours.** Writing on the wood is read, not
selected, so the one thing you cannot retype comes off it by being pressed: the
whole block lights up and it is on the clipboard. By key as much as by hand.

**A file that changed is read on the board.** Every checkout board, a project's
and a session's alike, lists what is uncommitted in it, and pressing one of
those files turns the board into what changed: what went in, what came out, a
little of what is around it, and a line saying how much unchanged writing went
by. Escape steps back out. Nothing is staged or committed from there yet.

**A change is thrown away with two presses.** At the bottom of a change is the
one thing you can do about it: put the file back the way it was, or throw it
away entirely when git has never seen it. Pressing it does not do it; it turns
the line into what is about to stop existing, and the second press does. Escape
is no. It is the only thing in the village that asks, because it is the only
thing that cannot be pressed again, and there is no line anywhere that throws
everything away at once.

**A commit is written on the board too.** Under what is uncommitted, a line
that says write a commit turns the board into what is about to go in. Everything
that changed goes in to begin with; pressing a file holds it back and pressing
it again puts it in, and nothing happens to the checkout until you press return.
There is no staging area here and no word for one.

**A commit is read the same way.** The commits at the bottom of a checkout
board are pressed too, and pressing one turns the board into that commit: what
it was for, what else was written under it, who did it and when, and the files
it moved. Pressing one of those reads the change that commit made to it, on the
same wood a working change is read on. What is filing rather than writing comes
off on the way: the trailers at the bottom of a message, and the `feat(scope):`
at the front of its first line.

**A branch goes up and comes down from there too.** Under the line that says
where the checkout stands are the things you can do about it: publish a branch
nobody has seen, send up what has run ahead, bring down whatever is new. Nothing
here goes and asks the other end what it has, so bringing it down is also how
you find out.

**The checkout is a place you walk into.** Under a project's or a session's
name is where it is, and pressing that walks into the folder: what is in it,
folders first, each one walked into the same way a district is. Escape walks
back up. Pressing a file reads the whole thing on the wood.

**Or looked in rather than walked.** A line at the top of the folder turns the
board into one question with one line to write it on: where is the file called
this. Another line switches to the other question, where is this written, and
carries what you typed across. Both answer with files you press, the matching
lines under each.

**Who last touched it is on the same board.** Not a name beside every line:
writing happens in runs, so it says it once over each run, with who, how long
ago and what they were doing.

**A file is made, renamed and thrown away there too.** The folder offers to put
something new in it and you name it on the line, a slash at the end making a
folder instead. At the bottom of a file are the two things you can do to the
file rather than to its writing. Renaming does not ask twice; throwing away
does.

**And a file is edited one line at a time.** There is one place you write in
this app, so changing a line means taking that line into the writing: press it,
it turns to full ink with the cursor after it, rewrite it where it sits, and
return writes the file. Escape puts it back. Nothing is written if the file
changed underneath you while you had a line of it down.

**There is a real shell in the checkout.** A line under where the checkout
stands opens one, and it is the same board: you type at the bottom, return
hands it the line, what it says comes back above. It lives outside the window,
so closing the app leaves it running and coming back walks into it with
everything it said still there. Full-screen programs draw but are only legible,
not usable, because the board has no cursor of its own.

**And a piece of work ends here rather than in a browser.** A line under the
checkout asks what is open for this branch: what it is for, which branch is
going where, what the machines think, whether anybody has looked, and the ways
it can go in. Nothing open yet offers to open one. The checks are a count, not
a list, except the ones that failed, which are what you came to read. Who the
village is to GitHub is whoever `gh` on this machine is already signed in as.

**A session is a real agent, configured.** The card is who is working in there
and who else on this machine could, what they are thinking with, how they work,
how hard they think, what they can reach out in the world, and what they have
been taught. Every line on it is pressable and pressing one does the thing.
None of it is a list anyone here keeps: the models and the modes are whatever
that agent says it offers over the protocol when it starts, the servers are
read out of the agent's own config file, and the skills are read from where the
agent actually looks for them. Changing who works in a building sends the one
who was there home, because a different agent is a different villager.

**Opening a session starts it.** A session keeps its branch, its worktree and
its transcript across a restart, but the agent itself is not running, and a
sleeping agent cannot say what models it has or what it answers to. So opening
the board wakes it rather than the first thing you say, and everything on the
card and behind the slash is true the moment you are looking at it.

That card is also the answer to the question this file has been asking. One
board still shows one thing, and what changes which thing is the rail, the
roster and the slash, all of them writing on the same wood.

A session is not a building and a building is not a thing you point at. Houses
light up for the first few sessions in a district so the island still says
something from the water, but they are scenery: a project can easily have more
sessions than its district has houses, and which house a session stands in
means nothing. Nothing on the island is picked but a district, whole: the land,
the houses on it and the trees between them answer as one place, and picking
any of it walks into that project. From out on the water it is
light and posture and nothing else. A building with
somebody in it is lit, warmer and pulsing when they want you, red when they have
broken; the villager at its door is turned away while they are working and
turned towards you when they have stopped. There is no badge, no spinner and no
coloured dot anywhere.

The agent runs under its own settings on this machine, the same ones a terminal
session gets, so what it asks permission for is what it would ask there. When
it does ask, the question lands on the board and a number key answers it.

An agent who is not on this machine is brought here from the same card. The
line saying how many more speak the protocol opens all of them, and pressing
one runs what that agent itself says installs it. Nothing is chosen for you
afterwards.

Nothing yet adds a server or teaches a skill: the card shows what is there and
turns a server on or off, and the rest is still done in the agent's own files.

**A district is the artist's, or it is sea. Nothing grows.** The map is his
`base-layout.json`, untouched, and his own partition of it into thirteen
places. A project takes one whole and it appears exactly as he drew it, tile
for tile; a district with nobody on it is open water, and the coastline that
exposes between the two is dressed by the editor's own brush. There is no stage,
no half-built district and no growth model anywhere in this app: the five-stage
pipeline that used to draw them is gone, and what replaced it is measured
against `world/his.py` in the village repo, tile for tile, at every state.

**The order they come on in is measured, not chosen.** Every state has to be one
piece of land walkable from the fire, and from there the district that comes next
is the one leaving the island roundest, over every walk the geography allows.
Shape is the whole of what the island says from out on the water: a village that
grows along one arm reads as a sandbar, and the camera has to pull back to hold
it, so everything on it gets smaller. The camp and the islet are common ground
and are never off; the islet is moored rather than anchored and sails its bridge
to whatever coast there is.

**It is an app you install.** `pnpm run package` makes a Mender.app and a dmg;
what comes out of the Applications folder is the whole village with everything
running behind it. The icon is a square cut out of the island as the app itself
draws it, because that is what the app is. No publishing, no update channel and
no notarisation: there is nobody to release to yet.

The board's timber is the dock, widened by `tools/make-board.py` out of the
artist's own planks, and the writing is Departure Mono under the SIL OFL. There
is still no windmill, no parchment, no frame, no icon.

The villagers are ours and drawn from nothing. The kit's four "character" files
are an unfinished template — a featureless slab with cat ears, taller than the
doors of the houses it would stand at, never used in the artist's own demo — so
`tools/make-folk.py` draws a front, a back and two frames of breath each, in the
kit's own outline colour and at a height that fits its doorways. Nobody walks
anywhere: there is no walk cycle and the path network that says where a villager
could walk is still only in Python.

A session is taken down from the bottom of its card, in two presses, with what
it would cost written above the offer: what is uncommitted in there and how far
the branch has run ahead. The branch outlives the building. A project is
forgotten from the bottom of its own page the same way, and nothing removes an
agent from a session. A permission question does land on the
board, and a number key answers it; it takes setting the session to ask first,
because otherwise the Claude on this machine answers its own.

## House rules

- Work on `main`. Never create branches.
- `docs/mender/STATE.md` is updated in the same commit as any change to what the
  app can do, and nothing but that file answers "how far along are we". A row
  becomes `done` after it has been driven in the running app, never because it
  compiles. Reporting progress from a list that lives only in a conversation is
  how a week of small asks got mistaken for the build.
- Render and look at it. This project's whole history says a model-side check
  passes while the screen is visibly broken.
- Look at it without taking his screen. `MENDER_DEBUG_PORT=9222 pnpm run dev`
  opens the window's debug port; clicks, keys, wheels and screenshots go
  through it while the window sits in the background and he carries on working.
- A change is not delivered until the app Kirubel opens is running it.
