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

**Sessions are real, and they share the project's own folder.** Emdash's
whole runtime chain is up underneath: conversations, ACP, the TUI agent
runtime, terminals, scripts, host settings, and the workspace registry that
cuts worktrees. A new session works right in the project's checkout, on
whatever branch it is on, beside every other session there, the way several
Claude Code terminals opened in one folder do; the agents are left to stay
out of each other's way. Opening a project nobody has worked in says so, and
what you write on its line starts somebody on it right there. A copy of its
own, a worktree on a fresh branch, is one line on the new-session board,
"in its own copy, on its own branch," taken on purpose; starting from an
existing branch implies it. Taking a shared session down leaves every file
where it is, since the folder was never its to take. Nothing about any of it
is a stand-in.

**An agent runs in a task, and it is a villager.** Hanging a lantern on the
empty hook at the end of the rail moves somebody in: the ACP runtime spawns
that agent's own CLI in the task's worktree, and from then on the yard is what
is happening in there — what was said, what was read, what was run. Not a
building: houses are scenery and picking one walks you into the project, never
into a session, because a project has as many sessions as it has work and a
district has as many houses as the artist drew. Agents write in markdown whether or not anybody asked, so it is
read rather than shown: there is no second weight here to set anything bold in,
and the gutter, the indent, the gap and the tone carry headings, lists, quotes,
rules, tables and code without one. A fenced mermaid block is the one mark that
was never going to read as prose, so it is drawn instead, in the same warm and
sore tones everything else on the board already is, and opens in a window you
can pan with a drag and zoom with the wheel rather than one that shrinks it to
fit. The last line of the board is where you write back; there is no
text field anywhere in this app. An empty line while somebody is working calls
them off.

**The bottom of the board is what is coming.** Under everything that has
happened, and above the line you write on, is what the session says it means to
do next, then how much room it has left to think in, and what it has cost so
far when the agent says, in plain words rather than a currency badge, then
anything you said
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
running. An anvil's own step carries a few marked lines of what it actually
changed right under it, capped, in the same warm and sore tones a change is
read in anywhere else in the village; pressing the cap opens the whole change
on the checkout's own board. Under all of that is the ground itself, with
whoever it sent out standing in the firelight with an answer or off in the
dark still working.

**Any note of your own on the gatepost is where a new session starts.** Under
what you said is "carry on from here in a new session," gold and pressable
like everything else that is. Pressing it cuts a new worktree from the branch
as it stands — the tip, said honestly as that, since nothing here keeps the
exact commit a line was said against — and hangs a new lantern with a
conversation that opens by telling itself everything said up to that line: not
a real fork of the session, since the agent's own protocol has no way to
hand a second session the first one's history, so this is the honest
approximation of one. The session you pressed it on is never touched.

The fire is the session. Lit is somebody working, banked is somebody who has
stopped and is standing at the gate, embers is finished, out is nobody home,
and the light in the whole yard follows it. A place nobody has touched for days
is darker than one somebody is standing in, because age is carried by the light
here and never by a date.

**A limit banks the fire; it does not put it out.** Claude knows the difference
between hitting a usage limit, an overloaded service, a lost connection and a
question it flatly refuses, and says so as what it is instead of an ordinary
answer. The first three bank the fire, because there is a real next move: what
it is waiting on is said plainly, with the reset time in your own clock when
Claude names one, and three gold lines sit under it — try again now, where an
immediate retry is worth it; carry on when it lifts, which is Claude Code's own
"continuing automatically at five" said the same way, arming a real wait that
sends the same thing again on its own once the time comes, cancelled by
pressing that same line again or by Escape, which reaches for an armed wait
before it reaches for anything else; and starting over, two presses, the first
naming that the conversation is what it costs. A refusal or a turn that ran out
of room stays sore, because there is nothing to wait out.

**The rail is the sessions, and the projects are a rack on the wall.** A plank
along the bottom hangs one lantern per session in the project you are in: lit
means somebody is awake in there, the one you are standing in hangs lowest and
brightest, and the one that wants you flickers. At the end of the beam is one
empty hook, which is how a new session is started — and, for the rest of that
sitting, remembers the last one taken down here: it offers to put it straight
back up, on the very same branch, before it ever offers to start something
new. The projects moved to a rack
in the top right, over both the island and the yard, one slot each with the
project's own face in it, its app icon or its logo, and a prop from the kit
until it has one, and no names until you hover. It folds away.

A slot on the rack carries the same warm or red wash a lit house gets, the
moment somebody in that project is asking or hurt, easing in and out the same
way — the rack is visible even standing deep in another project's yard, so it
is the one place that answers "does anywhere else want me" without leaving
where you are. Folded shut, that same light plays across the "projects"
handle itself. And a chord reaches whoever it is without walking there first:
held with command, `U` stands you in the yard of whichever session wants you
most, island-wide, asking or hurt outranking merely working and the oldest
first; pressed again it goes to the next. A clicked notification lands on
that same door.

**A checkout arrives one of three ways, and the campfire is where you say
which.** Command-N or the campfire itself opens a small board over the
island with one question and three lines to answer it: pick a folder
already on disk, clone one from somewhere else, or start one that does not
exist anywhere yet. The first is the plain folder picker it always was.
Clone asks for an address on the same line the question opened on. Start
asks for a name and lets you flip it between private and public, then makes
it for real, on whatever GitHub this machine is signed in to, and clones it
straight back down. Whichever way it arrived, it lands the same place a
folder pick always did: a fresh district, its settings open, asking what it
looks like standing in its own yard.

**Or a folder lands there straight off the Finder.** Dragging one out of the
Finder and letting go anywhere on the water is the fourth way in, with
nothing to answer first: the campfire's own folder pick, minus the picker,
because the folder is already in your hand. Dropped somewhere a board is
already open it means what a drop always means there instead — a picture
carried to whoever is working, a path written on the line — since only the
water itself is asking what checkout is moving in.

**A file leaves the board the way it came in.** Grabbing one out of a listing
— the folder walked into, a search result — and dragging it out to the
Finder, to another app, to a mail compose window, hands over the real file at
its real path, the same door a dropped-in file already opened, the other way.

**A project's name opens its settings, in a window of their own.** Settings
are about the place, not the work, so they are the one thing that is not laid
over the yard: a window pops up over everything with a close mark, and it goes
on a click outside it or Escape, leaving the session under it untouched. In it
is the icon it wears on the rack, picked from the images already in its
checkout or chosen from anywhere, its name, typed straight into the window,
what every new session carries into its worktree that git would leave behind,
what runs when a worktree is cut — prepare before a session starts, setup and
run alongside it, teardown when it comes down, each just a line of shell —
what every session here carries into its own spawn beyond that, `NAME=value`
a line, reaching the agent's own CLI and a real shell alike — what looking for
a file by name or by what's written in it leaves out here, a glob a line, on
top of what emdash's own default policy already leaves out rather than in
place of it — who its commits go out as when that should be someone other than whatever git
would already say, whether this machine is signed in to GitHub and as whom —
there is no per-project account here, the village is to GitHub whoever `gh`
on this machine already signs in as, and signing in from a settings window
that isn't signed in opens the same one-time code `gh` itself would give you
in a terminal — where it is, and removing it. A project that has just moved
in opens it first.

**Taking a session down does not throw away what was said in it.** Settings
also carries the ledger of every session this project has taken down, newest
first, each saying how long ago in words. Pressing one reads its whole
conversation back, plainly, right there in the window — nothing woken, no
worktree needed, since taking a session down was always only ever the
worktree going. Escape steps back out to settings.

**A session can cut itself, on a timetable.** The same window offers sessions
on their own schedule: what it's for — the first thing said, exactly as if
you'd written it on the gatepost yourself — which agent, and when: every
morning at a time, every few hours, or on every push to the base branch,
watched rather than hooked. Only while the village is open; there is no cron
entry and no hook on the checkout, so a schedule due while Mender is closed
simply waits for the next moment it is. When one comes due it cuts its own
worktree exactly like the empty hook does and hangs its lantern on the rail
like any other session, its work already left there for you to find.
Schedules on the list come off with the same two presses everything
irreversible here takes.

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
A whole answer is pressed the same way, anywhere in it that isn't a block of
its own or a link, and a link an agent wrote is gold and pressable too,
opening in whatever the machine reads the web with rather than pulling the
village itself away to it.

**A file that changed is read on the board.** Every checkout board, a project's
and a session's alike, lists what is uncommitted in it, and pressing one of
those files turns the board into what changed: what went in, what came out, a
little of what is around it, and a line saying how much unchanged writing went
by. Escape steps back out. Nothing is staged or committed from there yet.

**A marked line of that change is where you tell the agent what is wrong
with it.** Pressing one — not the whole file, the one line — turns it into a
line of writing: say what is wrong, return pins it. A pinned note leaves a
small mark under that line and waits by the write line the same way a dropped
picture does, gold and pressable either place, gone with a second press. It
rides into the next thing you say to that session as `file:line — the note`,
because a path and a number are the one thing about a line you cannot get
across by describing it.

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

**A project whose folder is gone says so, plainly, in place of the yard.**
Walking into a district whose checkout was moved or deleted outside the
village does not open onto an empty yard or a silent failure: it says where
the folder used to be and offers the one way out, "relink it" — the same
native folder picker founding a project already uses, pointed at an existing
project instead of a new one. Picking a real git repository stands the yard
back up exactly where you left it; nothing about the project's sessions,
history or settings is touched.

**A worktree's own setup step that never came back clean says so on its
checkout board, not just once in a toast that is gone by the time you look
up.** `its <script> step failed: <what it said>` sits under the branch's own
standing, with the two ways through it: run it again, or say it is fine as
it is and stop being asked — an agent working in a checkout that never ran
its setup script is still a working session, never a broken one.

**A session's own board offers to catch it up, or land it, without a remote
in the way.** When the branch it was cut from has moved, a line offers to
bring that base in, merging it straight into the session's worktree; unless
it has already gone in, another always offers to bring the session's own
branch into the base's checkout right there on disk, which is a real local
landing for a project with nowhere else to send a pull request. A merge
that cannot settle on its own lays a conflict over the checkout instead of
finishing it: the files it stopped on, one line each, a way to hand the
whole thing to whoever is working in the session as the next thing said to
them, and a two-press way to give up and put the checkout back exactly how
it stood before the merge was tried.

**And a session's board reads its own whole branch, not only what changed
today.** Next to those two, whenever there is anything to show, "everything
this session changed" opens the branch's whole diff against the commit it
and its base still share — every file it has touched since, listed once,
each pressable into the very same wood a working change or a commit's own
file is already read on. Escape backs off a file onto that list, and off
the list onto the checkout, the same one press at a time as everywhere else.

**The checkout is a place you walk into.** Under a project's or a session's
name is where it is, and pressing that walks into the folder: what is in it,
folders first, each one walked into the same way a district is. Escape walks
back up. Pressing a file reads the whole thing on the wood.

**Or looked in rather than walked.** A line at the top of the folder turns the
board into one question with one line to write it on: where is the file called
this. Another line switches to the other question, where is this written, and
carries what you typed across. Both answer with files you press, the matching
lines under each.

**Finding a file does not need walking to it first.** The checkout board
itself offers the same look-by-name-or-by-what's-written board the folder
does, and answers to a key from anywhere in a project's or a session's yard,
the same way every other doing held with command does.

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

**A file you are reading keeps reading while it is written.** Opening one
holds the checkout's own writing open rather than taking one look at it, so a
line an agent puts in while you are standing in the file arrives on the board
the way a commit already does, without you closing it and opening it again.

**A file that is a picture shows the picture.** A png, a jpeg, a gif, a webp
or an svg draws itself in place of the numbered lines, sized to the board and
kept crisp rather than smoothed when it is small, with its size in words
underneath. Blame, renaming and throwing it away all still work, since none of
those are about the writing.

**A `.md` file reads as writing, not as marks.** The same reading the agents'
own words already get — headings, lists, quotes, rules, fenced code, a fenced
mermaid block drawn rather than read — applies to a markdown file walked to in
the folder, with one line to drop back to the raw text when a line of it is
what you actually came to change.

**A CSV file reads as a table, not as a line of commas.** The same padding
that lines up a markdown table's columns does this one's, in the board's own
type rather than the hand, because a column is only a column once every
character in it is one. One line drops back to the raw text, the same as a
markdown file's.

**A file the board cannot show properly offers to be opened properly.** In
whatever the machine opens it with, one gold line, the same door a checkout's
own "show in Finder" already uses.

**And any of it opens in your own editor too, next to "show in Finder."** A
project's settings and any file you can read on its own board both offer it:
`$VISUAL` or `$EDITOR` when it names one you'd actually get a window from,
otherwise whichever of Cursor, VS Code or Zed this machine has.

**The last file or folder you stepped all the way out of is one key away.**
Escaping a board on purpose used to mean walking back to it by hand; now the
same key that holds every other doing brings back whichever of the two you
left last.

**There is a real shell in the checkout.** A line under where the checkout
stands opens one, and it is a real terminal on the board rather than a line
of it: the keyboard is the shell's own while it is what is open, so vim,
`htop`, `less`, tmux, an agent's own CLI all draw and answer exactly as they
would anywhere else. `ctrl+]` is the one chord this board keeps for itself,
and it steps back out to wherever you were; Escape is the program's. It lives
outside the window, so closing the app leaves it running and coming back
walks into it with everything it said still there. A file or a picture
dropped or pasted on it lands as its own path, shell-escaped and unsent, on
the input line — a shell has no way to be shown a picture, only told where it
is.

**A checkout says when this machine can't do what it needs.** Git, `gh`,
ripgrep, tmux and node are the five things Mender itself leans on, past
whatever an agent's own CLI separately needs, and a checkout board opened on
a machine missing one says so above "open a shell in here" — sore-toned,
plain, naming what's gone. Pressing it opens that same real shell and writes
the line that would fetch it onto the prompt, unsent, the same way a
dropped file or an agent's own sign-in line already lands there: his own key
in his own shell is what actually runs it.

**A checkout can hold two shells at once.** A second line offers "open a
second shell in here," its own tmux beside the first's, alive whether or not
either one is what the board is showing right now — stepping out of one and
back into the other finds it exactly where it was left. Either shell, and a
session's own terminal too, ends from the board in the app's usual two
presses: the armed line names what it would actually lose, asked of the
machine fresh rather than guessed, so ending one that is only sitting at its
own prompt says so plainly instead of pretending there is something to weigh.

**A session can be its own terminal instead of a conversation.** Naming a new
one on the empty hook offers a second line beside its name: in its own
terminal. Taken, the worktree is cut exactly as always and the agent's own
CLI is run raw in it, over the runtime that already knows how to keep a
provider's own process and resume it, rather than spoken to over the
protocol — so that CLI's own screen, its own trust prompt, its own usage-limit
banner and its own permission prompts are what is actually on the board, not
a village re-telling of them. It is still a villager like any other: the same
fire, the same gatepost, the same cart-frame stand it up, and only the middle,
where the transcript would draw, is its terminal instead — the rail still
hangs its lantern, the rack, `Cmd+U` and a system notification still all read
its mood, because a mood is a mood whichever runtime is behind it. `ctrl+]`
steps back out to the yard behind it, the same as the plain shell.

**Naming a session can start from a ticket instead of a blank line.** Beside
"say what you want doing" is "start from an open issue," and pressing it turns
the naming board over to the project's own open issues, read out of `gh`
read-only. Picking one writes `#<number> <title>` on the line, the same as if
you had typed it: it becomes the session's name and the first thing said to
whoever moves in.

**Or it can start on a branch that is already there**, beside the issue line:
"start from an existing branch" turns the same board over to the project's
own branches, and picking one stands the session on it instead of cutting a
fresh one — a worktree `git worktree add` reuses, not a new `refs/heads/`
entry. The board says which one it is standing on, right where "allow
everything" sits.

**A session can start already allowing everything.** A third line on that
same naming board, offered for a conversation rather than a terminal: allow
everything, from the start. Taken, the worktree is cut and the first thing
you said is sent exactly as always, and the moment the agent is awake enough
to say what its own modes are called, the village sets it to whichever one
that agent itself calls bypassing permission or accepting all of them —
never a village-side approximation, always the live name that agent just
advertised. Nothing is asked twice: the modes list on the card still shows
the same choice, live, for a session started the plain way to reach for
later.

**Something the shell starts listening on is noticed, not hunted for.**
Whatever a checkout's own shell prints an address in — `npm run dev`, a test
server, anything — turns into a line on the checkout board, most recent
first, and it comes back off the moment the port stops answering: nothing
here asks the shell whether it is still running, so the board asks the port
itself, the way a real browser tab would. A session with something live in
its checkout carries a small second mark beside its lantern on the rail, so
"something's running here" reads from across the room without opening it.
Pressing the line lays a browser board over the yard the way a file or the
shell does: an address line at the top, written the way you write anywhere
else in this app, and the page itself underneath, in the village's own
`<webview>` rather than this window navigating anywhere. Only a page already
running on this machine opens here — there is no history, no profiles, no
DevTools, and nothing here goes and fetches a stranger's page. Escape closes
it the same way everything else does.

**And a piece of work ends here rather than in a browser.** A line under the
checkout asks what is open for this branch: what it is for, which branch is
going where, what the machines think, whether anybody has looked, and the ways
it can go in. Nothing open yet offers to open one — or, beside it, "link an
existing one," for a pull request that is already open under a different
branch: picked from the repository's own open list, read-only, it is the
session's from then on, remembered rather than re-matched by branch name
every time the board opens. The checks are a count, not a list, except the
ones that failed, which are what you came to read. Who the village is to
GitHub is whoever `gh` on this machine is already signed in as.
What got said is read here too, under its own heading: a failed check and an
open review comment are both gold, and pressing either hands it straight to
the gatepost, unsent — the same way a comment on a diff line does.

**A session is a real agent, configured.** The card is who is working in there
and who else on this machine could, what they are thinking with, how they work,
how hard they think, what they can reach out in the world, and what they have
been taught. Every line on it is pressable and pressing one does the thing.
None of it is a list anyone here keeps: the models and the modes are whatever
that agent says it offers over the protocol when it starts, the servers are
read out of the agent's own config file, and the skills are read from where the
agent actually looks for them. Changing who works in a building sends the one
who was there home, because a different agent is a different villager. At the
bottom of the card is the one thing the card does to the conversation rather
than to who is having it: writing the whole of it out as a markdown file. Never
into the checkout — a file dropped into a working tree unasked is exactly the
kind of thing that rides along into a commit — so it lands in Downloads
instead, the same place anything else on this machine does. One line, pressed
once, and the line itself says where it went, standing afterwards as the way
to show it in Finder.

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
Several things asking at once are not several turns of that: a key marks
which answer each one gets instead of sending it, and a last line, "that's
everything," always there on that kind of question, is what actually sends
them, together.

An agent that needs signing in to work at all says so on its own `/agent`
card, plainly, for whichever hand is not signed in. The one actually working
here, when it needs it, offers the way in as a gold line: pressing it opens
the checkout's own real shell with the agent's own sign-in line already on
the input, unsent, so it is looked at and run rather than run for you.

An agent who is not on this machine is brought here from the same card. The
line saying how many more speak the protocol opens all of them, and pressing
one runs what that agent itself says installs it. Nothing is chosen for you
afterwards.

Every hand already here carries two lines of its own under it in "who works
here": one that brings it up to date, running the plugin's own way of doing
that — its own CLI updating itself where it has one, the platform's line
where it doesn't — and one, two presses like a taught skill or a server, that
takes it back off the machine entirely, the second press naming which agent
is about to go.

A session nobody has spoken to yet can still turn into its own terminal from
the same card — there is nothing to lose, since a chat has not started —
offering the naming board's own choice a second time, after the fact: "start
one like this in its own terminal." Pressing it is the whole change; the
board it opens was already only ever decided by what kind of session it is.

A server is added from the same card: one line opens the catalogue of the ones
worth suggesting, pressing one adds it as it stands, and another takes a
name and the command that starts it on the one line every board writes on.
Thrown away the same way everything irreversible is, two presses, the first
naming which one.

A skill is read, taught and thrown away from the same card too. Pressing one
already on the shelf opens what it actually says, right there under its own
line; pressed again it closes. Teaching it one from Emdash's own catalogue
folds that catalogue open the same way the server one does, and pressing an
entry fetches what it actually teaches and writes it down. Teaching it one of
your own is a name on the one line every board writes on, which writes a
plain started skill under that name. Thrown away the same two presses as
everything else here that cannot be undone.

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

**It reaches him even when he has looked away.** A villager who asks him
something, finishes what it was doing, or breaks, while the window is not the
frontmost thing on his screen, gets him a plain macOS notification in the
same voice the fire already speaks in: the session's name and the present-tense
line it is showing right now. No settings and no toggle — this either happens
or it doesn't — and nothing while the window is already in front of him,
because a banner would only double a lantern he is already looking at.
Clicking it brings the village forward and stands him in that session's yard,
the same door a chord or a rail press already opens.

**And what he missed is said once, when he comes back.** A banner answers the
moment somebody starts wanting him, but only if he is looking right then — if
he was gone a while, whoever asked, finished, or broke while he was away used
to just sit there for him to find lantern by lantern. Now the moment the
window has his eyes on it again, one line stands over the top of the island
and says it: who asked, who finished, who broke, a few named and the rest
folded into one count. Not a toast — no box, nothing to press, not gold,
since it isn't pressable — it reads for a few seconds and fades on its own,
the same way a result on the wood settles back once it has had time to be
read.

**Quitting on a lit fire says what it costs.** `Cmd+Q`, or the window's own
close box, with nobody working closes the village the way it always has. With
a villager still lit it does not: the window goes dark and one line stands up
in it — "`<n>` villagers are still working. quit anyway?" — the same shape
every other thing here that cannot be undone already takes. Pressing it
again, or the chord again before it withdraws, is the only way through;
anything else, including just waiting, is no.

**The dock carries a mark, not a count.** The moment anything anywhere is
asking or hurt, the app's own icon gets a small dot; the moment nothing is,
it is gone. No number on it, because a count is a convention this app does
not otherwise keep anywhere.

**And the Mac stays awake for exactly as long as it has to.** A working
turn holds the machine's own lid open, however long it takes; the moment
the last lit fire on the whole island stops, it lets go. Nothing to look
at, nothing to press.

**The window stays where it was put.** It sits parked beside whatever he is
really working in, and its size and position are chosen once and stay
chosen: it opens next time at exactly the spot and size he last left it
rather than being shoved back to the middle of the main display. Nothing to
look at and nothing to press, the same way a session's own board comes back
exactly as he left it — and if that spot no longer lands on any display that
still exists, it falls back to how it always opened rather than showing up
somewhere unreachable.

**The menu bar is Mender's own, not the shell it was built on top of.** Just
what macOS actually needs and nothing it doesn't: About Mender, Settings on
⌘, — the one door in from outside the wood — Hide and Quit, plain Edit roles
for the write line's cut and copy and paste, and Window. No Reload sitting
where a stray press could drop him out of whatever board was open, no raw
developer tools, no File or View or Help standing over nothing.

The board's timber is the dock, widened by `tools/make-board.py` out of the
artist's own planks, and the writing is Departure Mono under the SIL OFL.
There is still no parchment, no frame, no icon.

**The windmill is the app's own settings, and it is real now, if small.**
There is no sprite for it yet, so it is reached the way any other doing is:
⌘, or "settings" in the finder, over everything, closing the same three ways
a project's settings do. One page so far, General, and one real switch on
it — who a fresh session starts with, the same "who works here" names the
card already knows. Picking one is remembered and a fresh session actually
starts that agent, not always Claude Code. A second page, Checkouts, says
how a fresh checkout gets made from here on: the prefix a session's branch
carries — `mender` absent anywhere else — whether a short random tail rides
along so two sessions named the same thing never collide, and where a new
project or a new worktree lands, absent anywhere better. A third page,
"what is on disk,"
lists every worktree Mender has ever cut on this machine, whichever project
cut it: its branch, how much room it takes and whether it is stale — its
branch already sitting upstream, or nothing left pointing at it — and clears
it in two presses, the first press saying what that would actually cost:
whatever is uncommitted in there is gone regardless, but a branch with
commits nowhere else has, or one that has simply never been sent anywhere,
is kept — only the worktree goes, not the history. A fourth page, Terminal,
says how a shell looks and what it starts as: a font size in pixels, and a
default shell's own path, absent whatever the host's own `$SHELL` already
said. Both reach every real shell the board opens next, in this project or
any other — the size is what the grid actually draws at, and the shell is
what `ps` on the spawned process actually shows. A fifth page, Keys, lists
every command-chord doing the app answers to, its letter beside it: pressing
a line waits for whatever is pressed next, and that becomes its chord, unless
another doing this session can still reach is already answering to it, in
which case the row says so plainly, right where the new key would have gone,
and nothing is saved. A rebound line carries a `default` of its own, which
puts it back. What is pressed anywhere in the village from then on reads this
same table, so a rebind takes hold the moment it is made, not on the next
launch. A sixth page, Agents,
is what this machine hands each installed agent's own CLI beyond its
ordinary command: extra arguments on one line, environment variables added
and thrown away by name, and — where the host actually found more than one
install of that agent's CLI on this machine — which one it runs, a plain
list of the paths it found with the one in use marked, a press away from
changing. All three reach the same runtime a terminal session's CLI is
actually spawned with, so what is set here is what `ps` on that process
shows, not a village-side promise about it. A seventh page says what this
machine is spending right now, cpu, memory and disk in plain words, counting
back up every few seconds rather than sitting still, and underneath it,
every open session's own share of that: its agent process where this
machine actually keeps a pid for one, its plain shells, and how many dev
servers its checkout has listening — a session running as its own terminal
names cpu and memory for real; an ordinary conversation, whose agent
process the protocol does not hand this machine a pid for, cannot yet.
Everything else the windmill will eventually hold — updating and
authenticating agents, MCP, skills, accounts, task defaults — still has
nowhere to live.

**A session remembers what it was last thinking with.** Change an agent's
model or mode on one session and every fresh session with that same agent
starts on it too, not on whatever it happens to open with. And the line does
not forget what you were in the middle of saying: a half-written line is kept
against its own session as you type, put back the moment you stand in that
yard again, restart of the app included, and let go the moment it is actually
said.

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

**Sending somebody home is not taking anything down.** One line above that,
one press: whoever is working stops, the lantern goes dark, and the worktree,
the branch and everything said all stay exactly where they were. Opening that
session again, or just saying something to it, wakes the very same one back
up, the same as any session does after the app itself restarts. Left standing
at the gate with nothing more to say long enough, a villager goes home on
their own the same way — the rail still says a branch's name for a dark
lantern, but a truly empty one now says `asleep` instead of `resting`, because
`resting` is a fire still lit with nobody feeding it and `asleep` is a fire
that has actually gone out.

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
