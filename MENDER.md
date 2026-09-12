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
| `../a-cozy-agents-village/` | the village art pipeline: the sprite kit, the atlas, the critic, the editor's renderer and brushes. Source of truth for the world until we decide what moves here |

## What is known and what is not

The renderer is not a rebuild. The village editor in the other repo already
draws the whole world live at speed, with a scene graph, accurate picking and
villagers that path around obstacles. What does not exist is the camera: smooth
zoom, the slide, the transition. And the sprites load as a thousand loose files,
which needs packing before we fly between districts.

The art is the blocking problem, not the code. There is no windmill in the kit.
There are no UI surfaces at all: no panels, no parchment, no chalkboard, no
frames, no icons. And the character art is four static placeholder sprites the
original artist never used, with no walk cycle and no animation, which means
"agents are villagers" is a from-scratch character commission. Most of the
build list waits on it.

The open question nobody has answered yet is how you change what the board is
showing without a tab strip and without a second board.

## House rules

- Work on `main`. Never create branches.
- Render and look at it. This project's whole history says a model-side check
  passes while the screen is visibly broken.
- A change is not delivered until the app Kirubel opens is running it.
