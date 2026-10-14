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
| `~/Library/Application Support/Mender/logs/` | what the app, every worker, every agent's CLI and the window said, one JSON-lines file a day, a month kept. Not for him: read it first when something went wrong. Mood changes, what was said to a session and whether it queued, every failure the agent reported and when it cleared |
| `docs/mender/STATE.md` | how far along this actually is: every ledger row's state and the wave it belongs to. The only thing allowed to answer "how much is left" |
| `docs/mender/BUILD-CATALOG.md` | the feature ledger, the open design questions, the build list, the art list, the risks |
| `docs/mender/catalog/` | the nine source audits that document was built from |
| `pnpm --filter @emdash/mender check:bridge` | run after every upgrade of Claude Code or its ACP bridge. It starts a real terminal Claude and a bridged one against a fake local API and fails if a session here gets fewer tools than a terminal would, or if the bridge checks a capability nobody has decided about. That is how AskUserQuestion went missing unnoticed |
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
out of each other's way. A new session is just a session: the empty hook,
or walking into a project nobody has worked in yet, starts a real one on the
spot, called claude until it has a name, and stands you in it with the
agent waking and its columns up. The name is worked out, not taken from the
first line: a small model reads what was asked, what came back, what it ran
and what was touched, names it within seconds of the first thing said, again
once it has got going on something, every few minutes for as long as a turn
keeps working, as the first few turns settle and then every third, so a
session that has wandered onto something else is called what it is now. A
first line that is no clue to the work, a "huh??" or a picture, is named for
what the agent turns out to be doing, never for being confused. A name you gave it yourself, by
pressing twice on it at the top of the yard and writing over it there, is
never touched, and a restart is no reason to name it again either. Pressing the hook or command-T always starts another plain one;
only right-clicking the hook, or command-N, turns over the board of other ways
to start one, and if nothing has been said in the one you are standing in yet,
whichever is taken replaces it. A copy of its
own, a worktree on a fresh branch, is one line on that board,
"in its own copy, on its own branch," taken on purpose; starting from an
existing branch implies it. Taking a shared session down leaves every file
where it is, since the folder was never its to take. Nothing about any of it
is a stand-in.

**A copy of its own is a workspace, and workspaces hang from a beam.** That
worktree on its own branch is not one session's but a place several can work
in, or nobody, and it stands until it is taken down on purpose. Once a project
has one, the rule under its name becomes a timber beam and each workspace hangs
from it on two cords as a signboard, the project's own folder first, painted moss green with a
little house before its name so it never reads as one more copy, the one
you are standing in painted gold, and double-pressed it is written over
where it hangs, a new name for the board and never for its branch. Any but the folder can be held and slid along the beam to another place on it, the others stepping aside, and it stays there. Pressing another, or control and its number along the beam, walks into it, back into
whichever session you were last in there or into a fresh one if it is empty,
and the rail along the bottom carries that workspace's sessions and nobody
else's. Closing the last session in one leaves you standing in it on a fresh
one rather than carrying you off to another. Command-N in a project hangs the new-session sign with its own
isolated workspace already on, and whatever is written in the box names the
workspace and nothing more, the session in it opening with nothing said, and so does the dashed board at the end of the beam; out on the island it still founds a project, since there is nothing
there to copy. The moment it is asked for you are standing in it, the fire
in the middle saying it is making its own copy and counting, because cutting
a copy and running its setup is long enough that a sign which simply went
away read as nothing having happened. A new session starts in whichever
workspace you are standing in. Right-clicking a board offers to delete it, and deleting means all of it:
its folder, its branch and every session in it. The first press only looks
inside and says, in the sore ink, what would go, anybody still working in
there, files nobody committed, commits never pushed anywhere, and only the
second press does it.

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
them off, and so does Escape, the way it does in Claude Code; only once nobody
is working does Escape walk you out.

**The bottom of the board is what is coming.** Under everything that has
happened, and above the line you write on, is how much of its room to think in it has used up, and what it has cost so
far when the agent says, in plain words rather than a currency badge. Nothing warns an agent that it is running out of room; it simply starts
losing the beginning of the conversation, so the village says it instead.

**A session eating the five hours is stopped and put to him.** Claude's
subscription is one meter for the whole account, and the meter alone never
says who to stop, so the village watches the sessions instead. Every half
minute, while anybody is working, each working Claude session's last
quarter hour is read off its own transcript and put against the window: how
much of the five hours that stretch took, worked out from how full the meter
is against everything spent in it, and how many times what a session here
normally takes in a quarter hour, read off the last week. One well out of
the ordinary, several times normal and a real piece of the window, or a
fifth of it whatever is normal, is stopped where it is without its note
coming off the post, and a window comes up over everything wherever he is
standing, with a banner if he is looking elsewhere: what it took and how
that compares, the window as a strip with its part in the sore red, when it
alone would run the window out, what it is thinking with, and the ways on.
Carry on picks it up exactly where it was; carry on with a cheaper model
switches it, Fable to Opus to Sonnet to Haiku, one of each family the agent
offers, and picks it up the same; leave it stopped leaves it; walk in and
look first stands him in it with the question still waiting. Once answered
it is only asked about again after taking another tenth of the window. Pointing at
the line that says what a session thinks with and how full its head is
brings up, under it, its own part of the five hours against how full the
window is and when it resets, and takes it away again; the windmill's "this machine"
page still draws the window, the week, and every Claude session on the
machine, terminal ones included, as a bar against the hungriest.

**Fable is plain on sight.** It spends a window several times faster than
anything else, so a session thinking with it wears a violet tag with a pixel
gem and the word "fable" beside its name at the top of the board, its model
is written in violet with the gem, its lantern on the rail says "fable"
under its name in the same violet, and in `/model` every Fable is violet and
marked "dearest" before it is picked. Violet is used for nothing else in the
village.

**Making room is drawn, not stammered.** When Claude packs a long conversation
down to make room, the middle column shows it happening rather than the
adapter's "Compacting..." said twice over: a strip of cells that is everything
it was holding, a hot front crossing it and pressing each cell flat behind it
with sparks going up, how far along as a percentage, and how long it has been
at it against how long one usually takes, read off Claude Code's own record of
the last ones. Claude says nothing while it packs, so the percentage is that
clock and says so. Once it has, what is left stands back up green for a
moment and then the strip goes, leaving one quiet line under the words with
how full it was before and after and how long it took. The
summary Claude carries across is never put on the gatepost as though you had
said it.

**Opening a project is walking into the work.** Not a list you press into: you
land in the session you were last in, standing in its yard at night. What you
asked for is nailed to a gatepost on the left, newest on parchment and the ones
under it weathered into the post, any of them written back on the line by
pressing it, and up on an empty line walks back through them, after
first taking back off the post anything still waiting its turn and putting
it on the line, the way Claude Code's own up arrow does. Calling it off,
by Escape or an empty line, before anything at all has come of what it was
asked takes that note down too and puts it back on the line to be said
again, and so does up on an empty line while it is still only thinking,
since that is the same "not yet". A small
gold loop in the parchment's corner has it go again at that note without
saying it a second time: one it cut short carries on from where it stopped,
and one it finished gets another go, and nothing new goes up on the post,
because the agent still has the note. The parchment
is what it is working on, and says so in the fire's orange; whatever you say
while it works goes up above the parchment in the post's own weathered ink,
"not read yet", and only takes the parchment once the agent has actually
picked it up, so the note it is answering is never pushed down by one it has
not seen. It is handed over the next time the agent pauses between one thing
it does and the next, which is when Claude Code folds one in too, and until
then it says "waiting its turn" and is still yours to take back. However many
are waiting, they go together as one, at that pause or once the turn ends,
so three things said on the way are read and answered as one. And at the foot of that column is the
project's changelog, in the same small squares and cream lines the glance at
the other sessions used to be written in: each version on its own line and
what went into it bulleted and indented under it, newest first and scrolling, read straight off whichever commits moved
the version in the project's own manifest rather than kept anywhere, or off
its release tags where the manifest never moves on that branch, `1.4.0-android`
and `1.4.0-ios` one version between them. Only the newest few lines of each
are written out and the rest is a count, since a shared repository can put
hundreds into one release. What it
said is in the middle, read top to bottom the way a conversation is: the answers
before dimmed at the top and the newest set large under them, the column
starting under its heading and only scrolling to keep the newest in view once
there is more than fits, following the answer down as it inks in unless you
scroll up to read, and going back down to the foot the moment it is done
wherever you had got to. While it is still going, every line it says to you
on the way stays out above the newest, a little dimmer, so a long turn reads
as the steps it is taking, even across something you said to it on the way or the village closing on it and picking back up; the moment it is done they fold away under the
last word with everything it thought, out of sight. Once an answer has finished
something, the foot of that column, right over the line you write on, however
short the answer above it, is the recap, a sentence or two in a quieter italic saying what the
whole session is for, what just got done and what is next, for whoever is
coming back to it. Claude Code writes one of these itself when you return to a
terminal, but never when it is spoken to the way the village speaks to it, so
the village asks a small model the same question once the turn is done, keeps
it across a restart, and lets it go the moment anything newer is said. The word over the answer says where
it stands: "so far" in the fire's own orange while it is still going, "done"
in the green of a finished lantern once it has, and "you stopped it" in a
muted tan when you called it off, over whatever it had got out by then or
on its own when that was nothing; a stop Claude's own transcript wrote down
as if you had said it reads back the same way after a restart, except one
the village closing caused, which Claude writes down exactly the same and
which says "the village closed" instead, several in a row folding into one,
and pressing
Escape turns the fire's line to "stopping" until it has. Pressing that word,
or the
column's own heading, opens the trail upward out of it and pressing either
again folds it, the trail rising up out of the answer and sinking back
into it rather than snapping, and it stays however you left it. They look no different for
being pressable, the one place the gold rule gives way, because a gold word
over every answer was one more thing to read. The right column is the
session told as a story rather than as a log, so a session can be picked up
without rereading what you asked it. At the top is what it is after, a
sentence in the answer's own italic, worked out by the same small model that
names it from everything said rather than the first line, and under it where
it stands in a word or two: working on it, waiting on you, done. Under that
is what it made, nailed to a billboard: not the source it changed on the way,
but what you'd go and look at afterwards — a page it published, a document or
a picture it wrote, an app or a package it built. The newest is on the board
and everything before it is a line underneath, each pressed to go to it: the
board reads what the board reads well, a page opens where the web is read,
and a build is shown where it landed. The village keeps that list itself,
per session, so closing and resuming a session never loses it, even when
the conversation it comes back with has forgotten some of its own history;
only a file that's actually gone from disk drops off. Under that is how it
went: each piece of work it has been through, oldest first, named for what
came of it rather than for what was asked, a "huh" or a nudge folded into the
piece it was about, with a tick when it landed, a half ring when only part
did, a dash when it was put down, and how it came out in a quieter line with
"committed", "pushed" or "built" read off what it actually did. When a piece
began with you putting it right, what you said stands between the two in the
post's own ink. The piece it is on carries the fire's ember, the plan it is
working through with done steps inked out and the one it is on lit, and the
last few things it did since you last spoke, "just now"; a finished piece
folds what it did away under a count that opens it. And at the foot, only
once there are any, the loose ends: what it said it left unfinished, could
not check, or is waiting on you for. The column scrolls as one, following
the piece it is on while it works and opening on what it is after once it
has stopped. What it did, under each piece, is said in plain words
worked out from the command itself rather than the command: what changed
something gets its own line, built, installed, tested and whether it passed,
committed with its message, pushed, a file written or changed, and every run
of reading and grepping and checking between them folds into one quiet line
that says how much looking it was and opens to show it. The steps hang on
one thread down the column, and each carries a small sign drawn in whole
pixels in the colour of what it is: an eye for looking around, a page for
something read, a page with a plus in green for something written, a pencil
for something changed, a flame for something run, a flask for the tests, a
box for a build, an arrow into a tray for an install, a ring in the exact
blue for a commit and an arrow up for a push, and the sore cross in place of
any of them when it failed. A check that failed is said as what it was for,
never as its raw command. A written or changed file's own step carries the lines it actually wrote
right under it, with a couple of the lines it left alone either side so the
change reads in place, in the same warm and sore tones a change is read in
anywhere else in the village; a long one is capped, "show all" opens the rest
right there and folds it again, and past what was kept the cap opens the whole
change on the checkout's own board. And opening the trail over an answer lays
the same steps in it, each one between the thoughts it came between, every
edit open in full, so what it thought and what it did read as one story. Under all of that, while anybody it
sent out is still out, is the ground itself, with them standing in the
firelight with an answer or off in the dark still working; once they are all
home the ground goes and the piece of work that sent them says so.

**What happens to a turn is drawn, and what is said in it is set.** The
answers stay on the wood with no box round them. What happened to a turn,
rather than anything said in it, is a marked line across the column with a
small pixel sign of its own: a stop for "you stopped it", a warning for
"it stopped short", a cross in the sore red for "it stopped" with why in a
quieter line under it, a tick in green over a finished answer and a
breathing ember over one still going, each with a rule running off it to
the column's edge so it reads as a break in the conversation, not one more
line of it. Inside an answer the markdown is drawn: headings in the
answer's own face with an ember diamond and a rule off them, bullets as
ember squares, numbers on small timber tiles, code on a slate with its
language over it, a name quoted exactly on a slate of its own, tables
framed with a timber head and banded rows, quotes on a wash with a bar down
them.

**A command left running in the background stays running on the board.**
When the agent starts something and doesn't wait for it, a dev server, a
long build, a slow test run, its step under "what it did" keeps the fire's
blinking ember and says it is still going in the background, well after the
answer that started it is done, and only settles once the command really
finishes, sore if it failed. Until then the answer is not called done: the
word over it says "still running in the background" with the same ember, and
its lantern on the rail stays lit saying "running in the background" rather
than idle, and only goes to done once the last of them has. The lantern you
are standing in says what it is doing, the same as every other, since the
light round it already says it is the one you are in. A village closed on one names it in the note
the session gets when it opens again, so exactly that command is started
again.
And it stands in the yard as well, beside whoever was sent out: a pot of
its own on its own little fire, lit and throwing sparks while the command is
going and cold once it has finished. Pressing it lays its board over the
yard the way a helper's does, what it was for, the command itself, and the
last of what it has printed, following as it prints more, and "stop it"
stops that command and nothing else in the same two presses.

**Whoever it sent out can be walked up to, and called back.** Pressing one
on the ground lays their own board over the yard: what they were sent for,
whether they are still out, and every step they have taken out there,
following as they take more. While they are out, "call them back" stops that
one and nobody else, in the same two presses anything irreversible takes: the
session that sent them keeps going, and so does anybody else it sent, and it
hears that this one came back without an answer. They come home at once,
whether they were sent to be waited for or sent off on their own. And while
their board is open the line is theirs: what is written there goes to them,
carried by the session that sent them, and what they say back is written on
their board as it comes. Two presses on that board send them away for good,
stopping them first if they are still out. None of that needs their board
open either. The yard is "so many hands at the fire", standing wherever they
happen to all round it, each always in the same spot, the ones still working
given first pick so they are the ones by the fire. Somebody working bobs in
the light with an ember pulsing over their head; somebody who has stopped
stands still and grey. However many went out, the ground widens to hold them
and scrolls sideways under the wheel once it is wider than the column. Under
it is the same people as a table, each line led by the same ember, lit or an
empty square: what they were sent for, how long they have been at it or were
out, and their tokens as a bar against the hungriest of them. Pointing at a
line, or at its figure, lights both and puts a cross at the end of the line; the first
press says what it would stop and the second sends them away. The foot of
it is how many tokens they have spent between them, and a button that sends
everybody who is back home.

**Everything but the middle can be put away, and every rule can be moved.**
Right-clicking what you asked, the changelog, what it made, the plan or what it did offers
to put it away; right-clicking anywhere in the yard offers back whatever has
been, and puts the rules back where they started. A column with nothing left
in it goes entirely and the answer has its width. Every rule between two
parts can be taken hold of, the columns sideways and the changelog's and the
plan's up and down, and whatever is on either side takes the room. Nothing
shows it until the pointer is on one: the rule warms, and the cursor says
which way it goes. Where the rules sit is one arrangement for the whole
village, kept on this machine; what is put away is put away in that session
only, for this sitting, and a new one shows everything again. Nothing shows
before it is in use: a column heading only goes up once there is something
under it, and a side with nothing on it gives the answer its width.

The fire is the session. Lit is somebody working, banked is somebody who has
stopped and is standing at the gate, embers is finished, out is nobody home,
and the light in the whole yard follows it. A place nobody has touched for days
is darker than one somebody is standing in, because age is carried by the light
here and never by a date.

**Out of usage is a wait you can see, and it ends on its own.** When a
limit cuts a turn off, the session carries on by itself a little after the
time Claude names, read off its own words in its own zone, without anybody
asking. Until then the board draws the wait rather than saying it: the
hearth banked low and red, a strip of cells from when it was hit to when it
lifts with the one glowing cell where now is, and how long is left set large
beside it. Its lantern hangs dark with ember rising in its glass as the
wait runs out, so one nearly full is nearly back, its name left in the idle
tan so it never reads as one that wants you and "limit · back" and the time
in red under it, even the one you are standing in, its house glows red and slow, and
its project's board on the rack carries a low red wash, so a session that
stopped for a limit never reads as one that is simply idle.

**A limit banks the fire; it does not put it out.** Claude knows the difference
between hitting a usage limit, an overloaded service, a lost connection and a
question it flatly refuses, and says so as what it is instead of an ordinary
answer. The first three bank the fire, because there is a real next move: what
it is waiting on is said plainly, with the reset time in your own clock when
Claude names one, and three gold lines sit under it — try again now, where an
immediate retry is worth it; carry on when it lifts, which is Claude Code's own
"continuing automatically at five" said the same way, arming a real wait that
tells it to carry on, on its own, once the time comes, cancelled by
pressing that same line again or by Escape, which reaches for an armed wait
before it reaches for anything else; and starting over, two presses, the first
naming that the conversation is what it costs. A refusal or a turn that ran out
of room stays sore, because there is nothing to wait out.

**The rail is the sessions, and the projects are a rack on the wall.** A plank
along the bottom hangs one lantern per session in the project you are in, all
of them on the same cord, and a lantern is lit only when there is a reason to
look: somebody working, whose light breathes and whose line says what kind of
work and for how long; somebody asking, who flickers orange; or something
finished while you were elsewhere, green in its glass and round it, saying how long ago
until you have stood in it. Everything else is dark and says which: idle,
waiting out a limit with ember filling its glass and when it lifts, broken, or still
being set up. A shared session's branch is never named, since every one of
them is on it; one in its own copy names its branch after "idle". The one you
are standing in burns brightest. At the end of the beam is one
empty hook, an unlit lantern with a small plus in its glass, which is how a
new session is started, and right-clicking it opens the other ways to start one — and, for the rest of that
sitting, remembers the last one taken down here: it offers to put it straight
back up, on the very same branch, before it ever offers to start something
new. Command-shift-T does the same without the hook, the way a browser brings
back a closed tab: the last session closed in the project you are in, its
conversation and all, and pressed again the one closed before that; out on
the island it reaches into whichever project you last closed one in. What was
said in one is only let go once it falls off the end of that pile, or the next
time the app starts. The projects moved to a rack
in the top right, over both the island and the yard, drawn rather than boxed:
a log along the top of the window, sawn off at its left end, and each project
a board of three planks hung off it on two chains, the way the kit's own shop
signs hang, with the project's own face painted into a square carved in its
planks, its app icon or its logo warmed toward the wood with the grain showing
through, and a prop from the kit until it has one. The one you are standing in
is painted gold. Past a lashing of rope round the beam the rack's own doings hang
as small round tokens off one chain each, the sky, the windmill's wheel and
the fire home, so none of them is ever taken for a project. No names until
you hover, and then the board drops a pixel as if tugged and the name comes
down under it on a small board of its own on two chains, sliding along under
the next one as you go. It folds away, and it
folds itself: walking into a project shuts it, walking back out to the island
opens it, and the whole beam is the handle, a press anywhere along the wood
the boards hang from, unless the press carried the window off instead. Folding
draws the boards up behind the beam one after another from the far end and
then rolls the beam in; unfolding plays it back, the beam running out and the
boards dropping in one by one. A slot held
and dragged along it moves there, the others stepping aside, and stays.

A slot on the rack carries the same warm or red wash a lit house gets, the
moment somebody in that project is asking or hurt, easing in and out the same
way — the rack is visible even standing deep in another project's yard, so it
is the one place that answers "does anywhere else want me" without leaving
where you are. The board of the project you are standing in never carries
it, since its own lanterns are right there on the rail. Folded shut, that same light plays along the beam itself,
which carries no word: the beam is the handle and says nothing. And a chord reaches whoever it is without walking there first:
held with command, `U` stands you in the yard of whichever session wants you
most, island-wide, asking or hurt outranking merely working and the oldest
first; pressed again it goes to the next. A clicked notification lands on
that same door.

**A project can be put away without being forgotten.** The rack holds any
number of projects and the island does not have to: right-clicking a board on
the rack puts it away, which sends its district back to sea and leaves the
board hanging there weathered grey, every session in it kept, still walked
into with a press, its yard stood over the campfire. Right-clicked again it
goes back on the island at the next free place, or it is pulled down off
the rack and carried out over the island, which shows its empty places, and
let go where it is to stand: on an empty place it moves in, on somebody's the
two trade and they are the one put away. Letting a district go on the
water in edit districts asks which, put away or removed. A project founded
when every place is taken moves in put away rather than being refused.

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
on a click outside it or Escape, leaving the session under it untouched. It is
pages down a rail on its left, General, Sessions, Own copies, Timetable and
Git, each saying under its name what is set there, and whatever is written
says "saved" beside its heading once it is. In it
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

**Taking a session down takes what was said in it too.** Unless a project
says otherwise, a session coming down, by its own card, with its workspace,
with its project, by starting over or by changing who works in it, takes its
whole conversation off the machine: the agent's own transcript wherever it
was had, its helpers' transcripts beside it, the copies of files it kept for
undoing, its shell's environment, the pictures handed to it, its recap, what
it made, its half-written line and anything Mender had worked out about it.
The CLI writes a last few lines on its way out, so the transcript is looked
for again a little after, until nothing comes back. A project's settings
turn that round under their own heading near the top, "when a session
ends", which says which it does and offers the other: kept, the ledger of every session taken down there fills, newest first, each
saying how long ago in words, and pressing one reads its whole conversation
back, plainly, right there in the window, nothing woken and no worktree
needed. Escape steps back out to settings. A session opened as its own
terminal is a plain shell running whatever was typed in it, so what a
Claude started by hand in there writes is not the village's to find.

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
Shift-Escape skips every step and goes straight out to the island, from
anywhere, calling nobody off on the way. Out on the island with nothing open,
Escape goes back in to wherever you were last, however you got out to the
water and even across a restart, so it swings between the water and the work.

**Gold is pressable and pressable is gold.** Nothing else anywhere is gold, and
a pressable thing carries no underline, no arrow and no box. The result of
pressing lands on the line you pressed: it rewrites itself with what happened,
sits long enough to be read and settles back, except a failure, which stays.
Anything that cannot be taken back needs two presses and the first press is
what names the cost. Nothing spins: a wait is a number counting up, and a wait
too short to notice says nothing at all. There are two exceptions to the gold
rule in the whole app and they are both deliberate: the rack of projects, which
is signs hung off a beam out of the kit rather than a piece of the board, and the
names on the rail, which keep their posture tints because the rail's whole job
is telling you from across the room which session wants you.

**Nothing teleports.** Anything that is the same thing a moment later slides
to where it is now, anything new arrives, and what you say lifts off the line
and pins itself to the gatepost. While a session works, the bottom of the middle
column is a small fire throwing sparks, with what it is doing in the present
tense and how long it has been at it, and the answer inks in as it comes. Words
ease; the sprites still step, because they are pixel art and writing is not.
Going along the rail to another session is a step sideways and moves like one:
what was there steps off the way you came from the moment you press, what is
there now sweeps in from the side its lantern hangs on, the column nearest
that side first, and everything that is the project's rather than the
session's, the headings, the rules, the changelog and the rail itself, stands
still under it. The light round the lantern you left goes back into it, and
the one you took catches and its light swells up round it. Going over to another workspace
on the beam is the same step, taken along the beam instead: the gold goes to
the board the moment it is pressed, and the lanterns go with the session,
since they are that workspace's and not the project's. Nothing is drawn
until the session gone to has answered, so a switch never lands on a board
half filled in. One that had gone home for the night reads exactly as it was
the moment you step in, its conversation kept while it slept, and wakes
underneath without a fire saying so; only one with nothing kept, the first
time it is opened after the app starts, is drawn waking, and once it is up
it only comes up where it stands rather than stepping in a second time. A session still waking keeps
the place standing round it and only the middle waits.

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

**A picture the agent puts in what it says is drawn, where it put it.**
Markdown writes one as a caption and an address, on the web or a path on
this machine, and an answer about where to eat, a pair of headphones or a
bird says far more with a look at the thing than with a description of it.
A picture written into a paragraph or a list entry, or on a line of its own
right under one, stands beside that writing, the way a listing puts the
photo next to what it is a photo of; more than two together, or anywhere
else, stand where they were written, several in a row, each with its
caption under it, and one that will not load is simply not there.
Pressing one holds it up over the whole window, as big as it fits, and the
wheel goes in closer on it; Escape or a press puts it down. Every
session is told only that pictures show here, to be visual wherever seeing
a thing would help, and that a picture has to be one it actually found:
where and how is left to it.

**A picture dropped on the wood is carried.** Drop or paste one on a session's
board and it stands on the line you are writing on, among the words, as
`[picture 1]`, the way Claude Code writes `[Image #1]` into its prompt; it goes
with what you say, and backspacing over it puts it down again, the same as a
word. Pointing at it holds the picture itself up over the line. It is never
drawn on the board, because the board is writing, so what the board says is
that you have it and afterwards that you handed it over.
A long link pasted on the line stands there the same way, as `[expedia.com]`,
and the whole address is still what gets said.

Anything else dropped on it is written on the line as where it is: a picture is
the only thing an agent can be shown, but any file has a path, and that is the
one thing about it you cannot get across by describing it.

**An @ names a file in that checkout.** A path is the one thing you cannot get
across by describing it, so writing an @ turns the lines under it into what is
actually in there, narrowing as you type, and picking one writes the whole path
where the @ was. The same slab and the same keys as the slash.

**What is written is taken by dragging across it.** Nothing on the wood
copies itself for being pressed. Drag over any of what was said, a word, a
sentence, a block of code, a line on a board nobody presses, and the moment
the pointer comes up it is on the clipboard, the way a terminal does it, with
nothing to press after. The write line is left out, since selecting there is
how a word gets written over. A link an agent wrote is gold and pressable,
written as a link or just as a bare address, opening in whatever the machine
reads the web with rather than pulling the village itself away to it.

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

**A new session is asked for on a signboard.** Right-clicking the empty hook
hangs a timber board over the village on two cords, the one place in the app
with a box you write in rather than the line: what it is for, and under it
three tiles that are each on or off and go together in any mix. In its own
isolated workspace cuts a worktree on its own branch instead of the project's
folder. Start from a past session turns the sign over to a wider board
of the Claude Code conversations already had in that folder: a line to find
one by, the list down the left, each called what Claude Code itself called
it with a line under it saying what it did, and the one under the arrow read
out on the right, what it did, the first thing said in it, its branch, when
it was last worked in and how many turns it ran. What it did is not in the
transcript: a small model reads each one once, the first time the board is
opened on it, and it is kept, so after that it is there straight away. The
list is only ever that folder's own, but what is written on the find line
looks through every folder on this machine as well, since a conversation is
remembered by what it was about and not by where it happened to be started;
those come after this folder's, under "in other folders", each saying where
it was had, and resuming one brings a copy of it over into this folder
first, since Claude only looks for a session under the folder it is run in.
Resume picks the chosen one back up with whatever the tiles said, and back
turns the sign over again. Open in a terminal makes
the session nothing but a real login shell in the checkout, drawn the way
Terminal.app draws it, SF Mono on its Basic dark ink, with whatever was
written run as its first command, or `claude --resume` when a past session was
picked. It lives in its own tmux, so it is still there after the app closes,
and taking the session down ends it. Return starts it and Escape or a click
off the board puts it away. Issues, existing branches and allowing everything
from the start are gone from here on purpose. A session made the older way,
the agent's own CLI raw in its own terminal, still opens as it always did.

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
light and posture and nothing else, and a house says what its lantern on the
rail says: warm lamplight breathing slowly while somebody works in it, orange
and pulsing quickly when they want you, a steady green when they have finished
something you have not been in to see, a faint red ember while a limit is
waited out and a strong red throb when it has broken. A house whose somebody
has simply stopped is dark, because a light is a reason to go and look; the villager at its door is turned away while they are working and
turned towards you when they have stopped. There is no badge, no spinner and no
coloured dot anywhere.

The agent runs under its own settings on this machine, the same ones a terminal
session gets, so what it asks permission for is what it would ask there. When
it does ask, the question lands on the board and a number key answers it.
Several things asking at once are not several turns of that: a key marks
which answer each one gets instead of sending it, and a last line, "that's
everything," always there on that kind of question, is what actually sends
them, together.

**And when it wants to ask you something, it asks.** Claude's own way of
putting a choice to you, the one a terminal draws as a list with an "Other"
box, is pinned to the foot of what it said, right over the line it is
answered on, the same place a permission question is, ruled off above and
below so it never reads as more of the answer, which scrolls in the room
left over it. It is put to you the way a game puts a choice: what it calls
it and which of how many in pixel capitals, the question in the same pixel
type a little larger, never a big display face, each answer's name in pixel type with a number beside it and what
it would mean written quietly under it, and the one the agent favours
marked "recommended" after its name rather than inside it. The answers are rows, each with
a ring, or a box when several can be ticked, and the keyboard works it
wherever it happens to be while nothing is written on the line: the arrows
walk a light over the rows, return or space picks or ticks the one it is on, a number
picks that one outright, and tab sends whatever is ticked. The last row is
"something else", for writing your own answer on the line, and writing there
does the same without pressing it. What you can do with the answers is never
a row: "that's my answer" and "talk it over instead", which answers every
question with wanting to talk first so the agent comes back to discuss it
rather than being stopped, sit on a line of their own under a rule, with the
keys said once in the quiet ink beside them. When there was more than one
question, the last one leads to a check before it goes: each question with
what you said, any of them pressed to go back and change it, and "send it",
or return. Nothing goes back until that is
answered, and then all of them go together.

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

**The sea is water, not the colour behind the picture.** Shallow and green
against the land, deepening to blue out in the open, with slow swells of light
across it; a scalloped line of foam at the foot of every cliff and a net of it
washing up the rock and back, never all along the coast at once; and out on the
open water small waves in whole pixels rising, stretching and sinking back,
glints of sun, and the shadows of clouds passing slowly over, the blue
deepening all the way to the edge of the view. The artist's own water is a
Unity shader that works nowhere else, so this one is ours, and the coast it
foams against is measured off the ground the island actually draws.

**A district is the artist's, or it is sea. Nothing grows.** The map is his
`base-layout.json`, untouched, and his own partition of it into thirteen
places. A project takes one whole and it appears exactly as he drew it, tile
for tile — until all eleven and the islet are taken, when the hay farm, the crop farm, the
south houses, the port and the centre houses give up a piece each, in that
order, along lines cut against his art, each piece a place of its own with its
own flag, and only for as long as a project stands on it; a district with nobody on it is open water, and the coastline that
exposes between the two is dressed by the editor's own brush. There is no stage,
no half-built district and no growth model anywhere in this app: the five-stage
pipeline that used to draw them is gone, and what replaced it is measured
against `world/his.py` in the village repo, tile for tile, at every state.

**The camera stays on the island.** Zooming out stops once the whole island and
a little sea round it fit the window, and panning stops before the land can
leave it. A two-finger double tap on the trackpad, the Mac's own smart zoom, goes
in close wherever the fingers were and, tapped again, back out to the whole
island. While districts are being edited it lets go further, out
to the whole of his map, so every empty place is in view to carry one to.

**A right-click on a district brings it into focus.** The camera flies in to
frame that one district, as close as keeps all of it on screen, and nothing
opens: it is looking, not walking in. Only the main button ever walks in.

**But who lives where is his to rearrange.** A right-click on the water
offers "edit districts", and while it is on a district is something you pick
up: its land lifts off, houses and trees and all, and follows the pointer.
Let go on somebody else's place and the two swap; on an empty place and it
moves in; out on the water, the land or only its flag, and a window comes up
over the island asking whether to take it out of the village, saying what
that costs, and whoever it was the only way to the fire for moves in closer
rather than being left out at sea. His districts
never move, only who stands in them, and nothing may be let go anywhere that
would leave a project out of reach of the fire: that place lights red, says
who would be stranded, and the district goes back where it was. A
flag is picked up the same way, by its pole or its cloth, and stands wherever
on its own district it is let go, from then on; carried off its own land it
goes red and goes back, unless it is let go on the open water.

**The order they come on in is measured, not chosen.** Every state has to be one
piece of land walkable from the fire, and from there the district that comes next
is the one leaving the island roundest, over every walk the geography allows.
Shape is the whole of what the island says from out on the water: a village that
grows along one arm reads as a sandbar, and the camera has to pull back to hold
it, so everything on it gets smaller. The camp and the islet are never off; the
islet is moored rather than anchored and sails its bridge to whatever coast
there is. So is the camp, once nothing he drew beside it is standing: a lone
project carried off to the chapel or the port takes the fire with it, the camp
berthing on the biggest piece of land there is with the side he drew running
on into a district put ashore, so one project can live in any of his places
and the view follows the island wherever it goes. The camp is nobody's, but the islet is a district like any other once
somebody lives on it: it is the last of his to be handed out, after the eleven
and before any of them gives up a piece, and a project can be carried onto it
in "edit districts" at any time. Its flag sails with it. Empty, it is scenery
and answers nothing.

**Every district flies its project's flag.** A small pixel pennant in the
district's own colour, the project's face on the cloth, or its first letter
until it has one, so the island says whose place is whose from out on the
water. It stands where somebody would have put one: on the grass beside a
path, out in front of the district's main house, never on a roof or in a
field. Pointing at the district unfurls the name off the flag's tail; moving
off it rolls it back up.

**It is an app you install.** `pnpm run package` makes a Mender.app and a dmg;
what comes out of the Applications folder is the whole village with everything
running behind it. The icon is a square cut out of the island as the app itself
draws it, because that is what the app is. No notarisation, and no update
channel anybody else could follow.

**And it keeps itself up to date, from releases he calls.** A version is only
ever published because he said so, by `apps/mender/tools/publish.sh`, never on
a commit. Every installed Mender asks GitHub, through the `gh` already signed
in on that machine, whether there is one newer than itself, when it opens and
every few hours after, fetches it quietly and swaps it in the next time it is
quit. The foot of the windmill's rail says which Mender this is and "check for
updates"; once a newer one is waiting it says "restart into" it instead.

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

**And whatever it cut off goes back to work.** Anybody still working when
the village closed, or standing at the gate with a question, is told to carry
on from where they were the moment it opens again, on the gatepost like
anything else said to them, with the helpers they had out and the commands
they had left running named in a note only they read, so those go out again
too. A continue armed to wait out a limit stays armed across the close.

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

**And it is held by its top, like any other window.** There is no title bar
to hold, so the top edge is one: pressing anywhere along it that isn't
pressable and dragging moves the window, and a double-click there does
whatever this Mac does to a title bar.

**The menu bar is Mender's own, not the shell it was built on top of.** Just
what macOS actually needs and nothing it doesn't: About Mender, Settings on
⌘, — the one door in from outside the wood — Hide and Quit, plain Edit roles
for the write line's cut and copy and paste, and Window. No Reload sitting
where a stray press could drop him out of whatever board was open, no raw
developer tools, no File or Help standing over nothing. View holds the one
thing it should: ⌘+ and ⌘− make everything written bigger and smaller the
way a browser does, ⌘0 puts it back, and it is kept across a restart. The
island does not grow with it, since its art only reads at the scale it was
drawn; the writing over it grows and rewraps to the window.

The board's timber is the dock, widened by `tools/make-board.py` out of the
artist's own planks, and the writing is a handful of faces, all vendored in
`apps/mender/assets/fonts/`. What the agent says is Grunell, a rounded sans
whose free cut is for personal use only, and it is the one face meant to be
swapped: the `Mender Said` blocks
in `fonts.css` are the whole switch.
There is still no parchment, no frame, no icon.

**The windmill is the app's own settings, and it is real now, if small.**
There is no sprite for it yet, so it is reached the way any other doing is:
⌘, or "settings" in the finder, over everything, closing the same three ways
a project's settings do, and laid out the same way: pages down a rail on its
left, each saying under its name what is set there. The first, General, has
one real switch on it — who a fresh session starts with, the same "who works here" names the
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
`tools/make-folk.py` draws ours, in the kit's own outline colour and at a height
that fits its doorways: standing, walking four ways, sitting, and the same again
in a hood for a helper, plus the island's small life.

**Every open session is somebody walking about, and every helper it sends out
is somebody else.** Nobody lives on the island but the sessions: with none open
there is nobody on it but the fire. A new session walks up from the fire to its
house. What it is doing is said with a body: working, it is busy about its own
patch at a working pace, back and forth to the door; asking for you or holding
something finished you have not seen, it goes and stands at its door facing you;
broken, it stands there grey and still; idle, it ambles, and after dark it wanders
up to the fire and sits round it if it can get there. A helper steps out of its
session's door in a hood and ranges further and quicker, and when it comes back
it walks home and is gone. Where anybody can walk is read off the ground itself:
grass and path, never a cliff face, a field, a fence or a wall, only on the level
they are on, preferring the artist's own roads. After dark every one of them
carries a lantern.

**And a district is as lively as its project.** How busy a project has been is
read off git and off the sessions open in it, and how long since anybody
committed or any of its sessions last said anything thins it out again, on
the moss's own clock, so a scratch folder worked in all day and never
committed to is as lived in as one that ships every hour. A project being worked
hard is full of townsfolk of every sort, a farmer in a straw hat, a woman in a
red dress, an elder, a child, a smith, a merchant, a fisher, with chickens,
sheep, pigs, cows, a dog and a cat about the farms and yards. Every single thing
an agent does sends a runner out of its session's door carrying it: a scroll to
the signpost for something read, a crate to the storehouse for something
written, a hammer to the forge for something run, and back. A commit wheels a
handcart down the road; a push loads a sloop at the district's pier and townsfolk walk out to board it
before it sails. The sea has its own traffic besides, nobody's errand: sloops
round the island, a ship well out, a raft, fishers at anchor, a rowing boat,
buoys, driftwood and ducks, leaving rings behind them and lit after dark.
Every boat is a small solid thing modelled once and drawn from all round, in
the kit's own wood and ink, so it comes about towards where it is going rather
than flipping, its boom carried out over the side so a sail is never seen only
edge on; and the coast it keeps off is the one the foam is measured against,
cliff faces and all. A boat ties up only at a pier the artist drew that still
reaches water, along its side with room for the whole hull, and whoever came
on it walks up into the village. Two
busy districts send people along the road between them, and the roads carry
covered wagons with a carter on the box and riders on horseback between any
lived-in districts, more the busier the island is, drawn a little larger as
the camera rises so they still read from the top, each wagon with a lantern
at either corner that lights the road round it after dark, with horses grazing
on the farms. A quiet one has
somebody about, and that is all; a forgotten one empties and gets crows. After
dark most go indoors and the rest carry lanterns, and with a board open over the
village the whole crowd holds still.

**The sky is his, unless he takes it in hand.** The hour on the island is the
hour where he is, sunrise and sunset and all, and the weather is his weather,
asked of Open-Meteo from wherever his address on the internet says he is, now
and then and kept in between. Night is not a dark sheet over the picture: every
pixel is relit, taken back toward deep blue moonlight with most of its colour
gone, warm and low at either end of the day, flat and grey under cloud, and then
whatever gives off light of its own adds its colour back only where it reaches,
which is why the grass by the fire at midnight is still green. The lamps along
the roads come on one by one as it gets dark, the fire flickers and throws sparks
and smoke, every house's windows light up one by one, the panes themselves glowing
and a little light falling out of each onto the ground, a plain warm hearth in an
empty one and that session's own colour in one somebody is in, chimneys smoke over houses with somebody working in them and over every
hearth on a cold evening, and black smoke sputters out of one that has broken.
Clouds pass over land and water alike. Rain comes down slanted by the wind, rings
the sea and leaves the ground dark and shining for a good while after; a storm
throws lightning; snow falls, lies on the grass and the roofs and leaves the
trodden paths open, and melts slowly once it stops; mist lies in drifts. (Clear ice
blocks drifting in the open sea under lying snow are drawn but switched off
for now, in `sky.ts`.) Stars
show in a still sea on a clear night. Gulls cross the island by day with their
shadows under them, butterflies work the bushes on a bright one, a fish jumps off
the shore now and then, fireflies come out over the bushes after dark, and in
autumn the leaves come down. A right-click on the water offers "the sky" beside
"edit districts", and it is a panel, not a list of words: the hour is a slider
whose track is the island's own light across the day, from a low sun coming up at
one end to the moon at the other, and dragging it moves the light on the island
as you go; the weather is a row of pixel pictures, each on or off and any of them together, sun with snow a bright snowy day, rain with fog a wet mist, every one in force framed, and the last one taken off handing it back to outside;
how much of whatever is falling is a second slider, a few drops to a downpour.
"Outside" by either puts it back to the real one, and whatever is picked is kept
on this machine. The same panel opens off a slot at the head of the projects rack
out on the island, just left of the settings wheel, which wears a picture of what the sky is doing right now.

Lamplight is light, not a disc. Each light is worked out per pixel on the
ground under it and marched back to its source through a map of what stands on
the island, how tall each thing is and how high the light burns: a wall throws a
long shadow, a fence a short one, the face of a house turned to a lamp is lit and
its roof is not. The fall-off is dithered on the art's own pixel grid rather than
stepped into rings, and the lamp glass, the flame and every lit pane carry a
small glow of their own drawn over the night, which grows in mist and rain. The
flags fly over the night rather than in it, darkened by only half as much, so a
project's face reads from the water at any hour.

**And a district nobody has worked in grows over.** How long since a
project's last commit on any of its own branches, or the last word any of its
sessions wrote into Claude's own transcript if that is later: for a few days
it is as he drew it; then it goes fast, plain to see from the water after a week, its grass drying toward straw,
its colours fading, moss creeping over roofs and paths in clumps and the kit's
own weeds and brush coming up through it, and four weeks on it is as overgrown
as it gets.

**None of it is allowed to cost the battery.** All of it moves only on frames the
screen is actually going to show and only near the view. The moment another
window has his attention the whole village freezes, the same as when it is
minimised, waking for a moment only to repaint a house whose session changed
state, so a glance at it is still true; and with a board open over the village
the air and the crowd hold still. At noon on a clear day the grade comes
off entirely and the art costs exactly what it did. Measured against the island
with all of it switched off, in front of everything it is inside the noise, and
behind another window it adds a small slice on top.

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
their own the same way — from across the room it reads the
same as any other idle lantern, since whether the process is still hanging
about is not something anybody looks at a rail to learn.

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
  Driven that way the window counts as the one he is looking at, so the
  island keeps moving; otherwise it freezes as it would behind another window
  and every screenshot is of a stopped village.
- A change is not delivered until the app Kirubel opens is running it.
