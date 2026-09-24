# The yard — plan for building the new district surface

The handoff at `design_handoff_village_session/` replaces everything that
happens after you press a district. The island, the coastline, the districts
themselves and the camera are untouched and stay exactly as they are.

This file is the plan for getting from what is drawn today to what is designed.
`STATE.md` stays the only file that answers "how far along are we"; this one says
what the work is and in what order.

## What the design actually changes

Three things, and each is bigger than a restyle.

**The board is gone and a yard replaces it.** Today a project's board is a list
of pressable lines on a plank of timber, and a session opens as a second board of
the same kind. The design has one screen: you open a project and you are standing
in its current session's yard at night. Your notes are nailed to a gatepost on the
left, the agent's thinking rises off the fire in the middle, what it produced is
loaded on a cart to the right, the agents it spawned stand in or out of the
firelight, and every other session in the project hangs as a lantern on a rail
along the bottom. There is no roster board and no second board. `MENDER.md`'s
description of a project's board and a session's board as two separate things is
now wrong and has to be rewritten against this.

**Text moves off the canvas.** The board today is drawn in Pixi with one bitmap
font, one size and no second weight. The design uses four proportional faces at a
dozen sizes, rotated parchment cards, CSS brightness filters over the world,
radial firelight pools and hard text shadows. None of that is reasonable to draw
in Pixi. The renderer becomes a Pixi canvas for the world with a DOM layer over
it for every piece of text, which is both closer to the design and far less code
than what exists.

**The bottom rail changes owner, and projects move to a shelf.** Today the plank
along the bottom carries one tag per project. In the design the rail carries one
lantern per session in the project you are in, so projects need somewhere else to
live.

They get a shelf in the top right, over everything: a timber rack of square slots
with one prop from the kit standing in each, an anvil, a board, a barrel, a sack,
a bucket, a hoe, a pot. No names on it. Hovering a slot says which project it is,
pressing one goes there, and the one you are in is the filled slot. It collapses
out of the way and comes back, and it sits above both the island and the yard, so
it is the one thing in the app that is always reachable.

Two notes so nobody undoes them later. The shelf is boxes and icons, and the rules
sheet says gold text is the only pressable thing and there are no boxes anywhere.
This is a deliberate exception, and it is the only one: it is an inventory rack out
of a game, not a piece of the board. And the prop a project gets is assigned from
the pool rather than chosen, at least to begin with, so founding a project never
stops to ask you what it looks like.

## What survives

Everything under the wood. The wire clients, the live git and checkout models,
the ACP runtime and its transcript mapping, the session and worktree plumbing,
the file and search runtimes, the shell. None of it is touched.

Above the wood it splits cleanly. Roughly half of `apps/mender/src/renderer/board/`
is composition — working out what the board should say from live data, turning
markdown into lines, turning a diff into hunks, assembling a commit. That survives
almost intact and is the reason this is a months-shorter job than it looks. The
other half is drawing — the Pixi board, the bitmap lettering, the timber, the
palette, the row layout — and that is deleted.

## The waves

Grouped into three phases by what you can open and judge at the end.

### Phase one — the yard stands up

**W-A · the seam.** A DOM text layer over the Pixi world, sized off a 1440-wide
frame scaled to the real window with whole-pixel snapping. Design tokens generated
from the handoff's own values: the colours, the type roles and sizes, the five
tones, the motion durations. The four faces bundled locally rather than fetched
from Google. The district crop behind, dimmed and drawing at its own slow rate
while the text layer redraws only on change. Ends with 13a rendered as static
markup inside the real app at his real window size, and looked at.

This is the gate. If text-on-dimmed-world does not hold up at the sizes his
window actually is, everything downstream changes, and it is cheap to find out
here and expensive to find out later.

**W-B · the rules.** All of the rules sheet, as primitives every later wave uses:
gold is the only pressable thing, and its hover, press and busy states; feedback
rewrites the line it was pressed on and settles back; irreversible things take two
presses with the cost named in between and a self-reverting timer; the five tones
always paired with their word; the one filled selection style; the focus outline;
the trail and the escape ladder; stepped motion with no springs, no fades and
nothing that spins. Cross-cutting, so every wave after this is cheap and without
it every wave after this is expensive.

**W-C · the yard, live.** 13a wired to a real project and a real session. The
header and its meta line, the gatepost with your notes newest-first, the thinking
column with the posted plan and the live thought growing downward, what it made,
what it did with its step icons and the running step, the yard patch with agents
placed by state and tinted for identity, the digest of other sessions, the input
line, and the lantern rail with its overflow. The projects shelf in the top right
lands here too, since it wants the real list. Nothing else pressable yet beyond
what W-B gives for free.

End of phase one is the thing worth judging: does opening a project in Mender
look and feel like the design.

### Phase two — you can work in it

**W-D · the line.** Every state in the P and Q groups. The cursor and its blink,
the six different empty prompts, typing with nothing above it shifting, growing
past one line, return and shift-return, word and line deletion, whether selection
exists at all, paste of text and paths and images, escape clearing before backing
out, undo, focus lost and regained, and the board rewriting underneath you without
losing a character. Then the two overlays that grow out of the line, the slash and
the @, with the village's own commands drawn apart from the agent's.

**W-E · the sub-boards.** The scrim, the world dropping to silhouettes with the
fire still lit, the gatepost and the rail staying exactly where they are, the
trail at the top, and the prompt changing with what you are reading. Then the five
boards themselves: a file, a change, a commit, a shell, and starting a session.
Most of what already works underneath gets its new surface here.

**W-F · the ages.** A1 through A11. Cleared ground, a worktree being cut with its
named git steps and block progress, the first session, the ordinary day, fourteen
sessions, twenty-three agents, waiting on you, all finished, untouched for weeks,
git refused, abandoned. These are mostly composition rather than new drawing once
W-C exists, and they are what makes the screen honest about every real state a
project is in.

### Phase three — the long tail

**W-G · the rest of what is on it.** The content groups the first two phases do
not reach: the checkout and its failures, uncommitted work past the point where it
can all be drawn, walking into the folder and reading and editing files, the
shell's own states, pull requests and checks and review notes, the whole of
configuration, housekeeping and worktree hygiene, dev servers and scheduled runs,
and getting around.

**W-H · how it behaves under pressure.** Scrolling with no scrollbar and no
momentum, and what happens when something arrives while you are reading history.
The motion group. Feedback for things that finish in another district or while the
app is not focused. The keyboard: walking, the escape order, the chords, a chord
fired mid-word, holding the modifier to see what each one does, rebinding. Drag
and drop onto the yard. Density, the tone and gutter vocabularies, pixel
alignment, and what happens in a very short or very wide window.

## The checklist

`District States.dc.html` is the checklist, not `BUILD-CATALOG.md`. The catalog
stays what it has always been, an inventory of capabilities so nothing vanishes
unnoticed. The 162 state ids are what says whether the surface is drawn. Every one
of them gets a row in `STATE.md` alongside the catalog rows, and a state is only
done after it has been opened in the running app and looked at against its design.

## Decisions

**The typefaces.** Josefin Sans, Caveat, Cormorant Garamond and Courier Prime,
all four OFL and bundled locally. Departure Mono goes. The design system's pixel
faces were placeholders and the designs never used them. This is the one thing the
handoff explicitly asks to be confirmed before building.

**Section labels** are stone, not gold, everywhere. Gold means pressable and
nothing else. 13a still shows them gold; the rules sheet is right and 13a is the
older turn.

**Only 13a is the design.** The earlier turns on that page are reference.

## Open, from the handoff itself

Sound is undecided and every signal is designed to work without it. Agent tints
are a CSS multiply in the mocks and need pre-tinted sprites for native rendering.
The kit has one character sprite, so a real cast of agents needs art from the same
family. None of these block phase one.
