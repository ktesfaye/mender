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
windmill on it. Opening a building zooms the camera in, slides the district
aside, and brings in ONE wooden board. There is no title bar full of buttons,
no sidebar tree, no tab strip. The village keeps living behind whatever is
open; it is never a screen change.

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

One board. One thing on it at a time. Not several boards, not propped panels,
not split panes, not a tab strip.

## Where things are

| | |
|---|---|
| `docs/mender/BUILD-CATALOG.md` | the feature ledger, the open design questions, the build list, the art list, the risks |
| `docs/mender/catalog/` | the nine source audits that document was built from |
| `AGENTS.md` | upstream's own instructions for working in this codebase. Still true for back-end work |
| `packages/village/` | the world: what a state of the village is, and the shore pass that cuts a coast round it. Draws nothing, knows nothing about Electron |
| `apps/mender/` | the app: the Electron shell, the wire to emdash's runtimes, and the Pixi renderer |
| `apps/mender/assets/` | the world files, the packed sprite kit, the board's timber and the one typeface. `tools/pack-kit.py` and `tools/make-board.py` rebuild the first two from the Cainos art, which is purchased and lives outside both repos |
| `../a-cozy-agents-village/` | where all of that grew, and still the place the growth stages are authored. The generator, the composer and the editor stay there |

## What is known and what is not

The island draws, it grows, and it opens. The state rules and the shore pass
are ported out of Python and produce a map byte-identical to the one the
village repo's own pipeline produces; the kit is packed into one texture; the
camera pans and zooms and comes to rest on whole pixels; founding a project
cuts a new district into the coast; and picking a district pulls the camera in
on it and brings the board in beside it, with that checkout's branch, its
uncommitted files and its last commits written on the wood, changing as the
tree changes.

**Tasks are buildings, and they are real.** Emdash's whole runtime chain is up
underneath: conversations, ACP, the TUI agent runtime, terminals, scripts,
host settings, and the workspace registry that cuts worktrees. Clicking an
empty building on a district asks what is going to happen in there; what you
type on the wood becomes a branch and a worktree, and that building is then
that task's own checkout, with its own board. Nothing about it is a stand-in.

**Only stages 0 and 4 are used.** A founded project goes straight to a built
district. The stages below four are sketches that do not stand up beside it,
and five is so full it leaves the district no room, so nothing grows through
any of them and nothing should be built on them until they are drawn.

The board's timber is the dock, widened by `tools/make-board.py` out of the
artist's own planks, and the writing is Departure Mono under the SIL OFL. That
is the whole of the UI art, and it is two things: a plank and an alphabet.
There is still no windmill, no parchment, no frame, no icon. And the character
art is four static placeholder sprites the original artist never used, with no
walk cycle and no animation, which means "agents are villagers" is a
from-scratch character commission. Most of the build list waits on it.

No agent runs in a task yet: the building is cut and standing, and nothing
has moved into it. The path network that says where a villager may walk is
still only in Python. Nothing in the UI abandons a project or a task, though
the wire does both.

The open question nobody has answered yet is how you change what the board is
showing without a tab strip and without a second board.

## House rules

- Work on `main`. Never create branches.
- Render and look at it. This project's whole history says a model-side check
  passes while the screen is visibly broken.
- Look at it without taking his screen. `MENDER_DEBUG_PORT=9222 pnpm run dev`
  opens the window's debug port; clicks, keys, wheels and screenshots go
  through it while the window sits in the background and he carries on working.
- A change is not delivered until the app Kirubel opens is running it.
