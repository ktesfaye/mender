# The island and the village

The island is composed once per app state in the Electron main process (`his.ts` + `shore.ts`), sent to the renderer as a plain tilemap/object layout, and drawn as a Pixi scene (`scene.ts`, `ground.ts`, `folk.ts`, `camera.ts`, `kit.ts`). `main.ts` wires pointer/keyboard input to district picks, founding, forgetting, and camera moves. Below is every user-observable state, number and trigger in that pipeline.

## Composition: which districts exist, and in what order they appear

### The thirteen districts and the two commons
His original village has thirteen partitioned districts (`packages/village/src/his.ts:27-42`), read from `apps/mender/assets/village/districts.json`. Verified names/sizes:

| id | name | cell runs | objects |
|---|---|---|---|
| CAMP | Camp | 10 | 26 |
| A | Crop farm | 77 | 602 |
| B | Hay farm | 67 | 334 |
| C | Fishing hamlet | 25 | 107 |
| D | South houses | 46 | 288 |
| E | Centre houses | 40 | 201 |
| F | Watchtower | 32 | 105 |
| G | Chapel | 29 | 73 |
| H | Forge | 21 | 95 |
| I | Market | 29 | 124 |
| ISLAND | Island (the islet) | 20 | 52 |
| J | Port | 31 | 168 |
| K | Fortified quarter | 30 | 152 |

`CAMP` and `ISLAND` are "common ground" (`COMMON`, his.ts:50) — always present, never switched off, never assignable to a project. The other eleven are what a founded project can stand on.

### Empty-island state
With zero projects, `standingIn()` (projects.ts:188-191) returns just `[CAMP, ISLAND]`. The composed map is CAMP's own land, the islet, and open sea everywhere else — "a small island with a campground and a fire" as MENDER.md says, confirmed by code: the campfire prefab (`PF Village Props - Campfire 01`) is the only interactive thing on it (see "The fire" below), and no other object or district tile is drawn.

### District arrival order — verified computed values
`Plan.order()` (his.ts:350-386) is a memoized best-first search: from `{CAMP, ISLAND}`, at each step it tries every currently-`reachable` district (touches something already on) and keeps the sequence whose running total "sprawl" (mean cell-distance from centroid, divided by √count — a shape-roundness score, `sprawl()`, his.ts:314-348) is lowest, summed over every state from there to the end. This is deterministic and was run against the actual asset files in this checkout:

```
CAMP -> ISLAND -> A (Crop farm) -> E (Centre houses) -> D (South houses) -> F (Watchtower)
 -> I (Market) -> K (Fortified quarter) -> G (Chapel) -> H (Forge) -> J (Port)
 -> B (Hay farm) -> C (Fishing hamlet)
```
A perfect disc scores 0.376 on the sprawl metric, his whole village 0.44 (his.ts:321).

A newly founded project is assigned the first district in this order that (a) isn't `CAMP`/`ISLAND`, (b) nobody already stands on, and (c) is `reachable` from whatever is currently standing (`projects.ts:205-212`). So districts always fill from the fire outward, in the fixed order above, regardless of founding order otherwise — the 12th project (after 11 fill every non-common district) gets `island-full`.

### The shore/coastline pass (backend, not directly interactive)
`shorePass()` (`packages/village/src/shore.ts`, ~900 lines) takes the composed set of "on" cells and: erases everything outside them to open water, snaps the outline to 2-cell "treads" so it doesn't look like a rectangle cut out of the map, erodes long (>4-cell, `HIS_RUN`) straight coastal runs back by a deterministic hash of `(x*7+y*13) mod 3` (`wobble()`, his.ts:412-557) so cut coastline reads like his own (his coast's own median run length is 3, longest 12), removes one-wide spits/notches, and redresses the exposed tile fringe with the original village editor's autotile passes (`redress`, `verge`, `relegalise`, `resurface` from `brush/redress.ts`) confined to a 6-cell margin (`MARGIN`) around the cut. Composition is cached per distinct state key in the main process (`village.ts:34-52`) and costs "about a second" per the file's own comment — during which `say('drawing the island…')` is shown (see Notice below).

### The islet's mooring
`ISLAND` (the islet) is never anchored at its drawn coordinates; it and its one bridge move together as a unit (`moor()`, his.ts:559-741) until the bridge's west end lands on whichever shore is actually standing — ranked by how many of the bridge's three landing rows come ashore, then by shortest travel distance, and validated so the strait under the arch stays open water and the mooring doesn't overlap existing land. With the whole village standing it moors at zero offset (his own drawn position).

## The camp and the fire

### What the camp is for
The camp (`CAMP`) owns a stretch of ground like any district, but pointing anywhere within `FIRE_REACH = CELL * 2.2` (70.4px) of the one `PF Village Props - Campfire 01` prefab counts as pointing at the camp — a district-shaped highlight over an empty stretch of grass "says nothing about what clicking it would do" (`ground.ts:16-29,122-127`). `campfireOf()` (districts.ts:156-173) locates that prefab in the composed layout.

### Firelight (always on)
Drawn as 18 stacked, alpha-0.1, `0xffb763`-tinted circles radiating out from the fire to `FIRE_GLOW = CELL * 3.4` (108.8px), fading linearly with ring index (`drawFirelight()`, ground.ts:212-222). Its overall alpha breathes: `0.13 + 0.5*(1+sin(now/900ms))*0.04`, eased toward at `min(1, deltaTime*0.12)` per tick, plus `+0.2` while the pointer is over the camp (`Ground.tick()`, ground.ts:203-210). This is explicitly "the only thing alive" on an empty island and "how you can tell the app is running before anything else has happened."

### Founding ("the one thing the campfire is for")
Clicking the camp calls `settle()` (main.ts:643-659), which opens the native OS folder picker (`projects.ts:216-221`): title `"Found a project"`, message `"Which checkout is moving in?"`, button `"Found"`. Outcomes:
- Cancelled: silently does nothing (`kind: 'cancelled'`).
- Chosen folder is not a git repository/worktree/submodule/bare repo (checked via `git.inspectPath`, not by looking for `.git`): notice `"That folder is not a checkout, so nothing can be built on it."` for 5000ms.
- That path is already a project: `"There is already a district on that checkout."` for 5000ms.
- All eleven non-common districts are taken: `"Every plot on the island is taken."` for 5000ms.
- Success: notice `"{name} has moved in."` for 4000ms, the island is redrawn (`draw()` re-run), the camera re-frames on the whole island (`frame()`), and the app immediately flies into that district's yard (`openDistrict`) and opens that project's settings window once (`configure(project, true)` — "a project that has just moved in opens it first," per MENDER.md).

### Forgetting
`forget(id)` (main.ts:1543-1559): calls `projects.abandon`, closes whatever board is open, redraws the island from scratch, re-frames on it. Result notice: `"forgotten. the folder is still where it was."` The district goes back to open sea in the very next composition (its cells simply aren't in the "on" set any more) — nothing marks it as "abandoned," it is drawn exactly like a district that was never founded.

## What is pickable, and hit-testing

### Districts, not sprites
Pointing is a cell lookup against a per-cell owner map built from `district.cells` (`Ground.owner`, ground.ts:66,87-93), not a scene-graph hit test — "a tree on the crop farm's edge is the farm, the ground under it is the farm, and the gap between two of its buildings is still the farm." `Ground.at(worldX, worldY)` (ground.ts:122-138) checks fire-reach first, then falls back to the district-owning cell.

### Houses are deliberately not separately pickable
Buildings are drawn and glow with light and grow a villager, but clicking anywhere on a district — house, yard, tree — opens that whole district. There is no house-level pick; `main.ts:1913-1923` explicitly documents this was tried and reverted ("Picking one used to open the session standing in that slot... The rail is the sessions. A house is the way in.").

### Click vs. drag
`pointerdown`/`pointerup` in `watchPointer()` (main.ts:2862-2933) only fires `picked()` if the up-event is within 4px of the down-event (`Math.hypot(...) > 4` aborts it as a pan/drag instead, main.ts:2899).

### Clicking through written content
Anything currently written over the village (the yard, a modal, etc.) is real DOM and intercepts the pointer itself; only the "wash" (dimming layer) is checked via `over(x,y)` (`behind()`, main.ts:2881). A press-and-release that both land on that wash (not on anything pressable) counts as "a click away from whatever is open" and calls `pointing.aside()`.

### Hover highlight
Hovering a non-camp district draws an 18-ring falloff glow (`RINGS=18`) centered on the district's bounding box, scaled ×1.35 past its edges, colour `0xffdf9e`, alpha 0.015 per ring, additive blend (`Ground.hover()`/`glow()`, ground.ts:172-194). It is masked to actual land tiles (`onlyLand`/`alsoLand` Graphics masks, ground.ts:70-118) so light never spills onto open water. The camp itself is excluded from this highlight (its own firelight already brightens on hover, described above).

### Cursor
CSS cursor is `pointer` over any aim, `default` otherwise (main.ts:2886).

## Villagers ("folk")

### What they are
Two sprites (body + shadow-pool) per villager, standing at the doorstep of the building their task occupies; no walk cycle, nobody moves location. One `Person` per running task with a mood other than `empty` (`Folk.set()`, folk.ts:185-207), created/destroyed as the live task list changes.

### The art itself
`tools/make-folk.py` hand-draws 14×27px pixel art (not the kit's unused four "character" template files, which are 48px tall and never used in the artist's own demo): a front pose, a back pose, and a breathing second frame of each (`breathing()` drops the topmost 16 rows by one and re-pads, so only the head/shoulders settle — "not a bob of the whole body, that reads as a hop"), plus one shared 14×6px soft shadow ellipse. Palette is fixed: outline `#482510` (measured off the kit's own building/prop outline colour), skin `#E2AE84`/`#C28B60`, hair `#5A391D`/`#734C28`, tunic `#647C8C`/`#7B94A3`/`#4A5E6C` ("dusty blue on purpose... a person has to be findable on it at a glance"), trousers/boots browns. Output: `assets/folk/folk.png` + `folk.json` (a manual TexturePacker-format sheet), loaded via `loadFolk()` (folk.ts:40-46), nearest-neighbour filtered.

### Placement
A villager stands at `(building.doorX, building.y + building.height + DOORSTEP)`, `DOORSTEP = 9px` out from the building's south face so they clear planters/barrels artists placed against walls (scene.ts:31-37,108-114). Draw order (front-to-back within the standing container) is claimed once when the map is built, from the building's own doorstep insertion point in the depth-sorted scene (`buildingsOf()`/`placeFor()`, scene.ts:167-213) — it never re-sorts.

### Mood → posture/light (verified, `folk.ts:60-67`, `shared/agents.ts:20`)
| mood | facing | light colour | light alpha (base) | beat (pulsing amplitude) |
|---|---|---|---|---|
| `empty` | (nobody drawn — sprite hidden) | — | 0 | 0 |
| `arriving` | front (towards you) | `#FFDF9E` warm amber | 0.018 | 0 |
| `working` | **back** (turned away) | `#FFDF9E` | 0.042 | 0.008 |
| `asking` | front | `#FFC46A` deeper amber | 0.055 | 0.022 (pulses — "the one that wants you should be the only thing on the island that moves") |
| `resting` | front | `#FFDF9E` | 0.03 | 0 |
| `hurt` | front | `#FF7A52` red-orange | 0.048 | 0 |

Facing rule (`Person.turn()`, folk.ts:164-172): only `working` faces back; every other non-empty mood faces front. `mood!=='empty'` controls sprite visibility for both body and shadow.

### Breathing
Frame alternates every `BREATH=900ms` normally, every `BREATH*0.55=495ms` while `working` (folk.ts:49,134-140) — "somebody working breathes faster than somebody standing about." Frame index is `floor(now/pace)%2`, so it is wall-clock-synchronized across all villagers rather than per-instance offset.

### Window light spilling on the ground
Each lit villager also washes an ellipse of light onto the ground behind them: centre `(doorX, y+height*0.78)`, radii `(width*0.72, height*0.5)`, 20 stacked rings (`RINGS=20`, folk.ts:72,238-248), same colour/alpha as the mood table above (the per-ring alpha is the *whole* table value, so total visible brightness is well over the number on the page since rings stack). The light itself eases toward its target every tick at `min(1, deltaTime*0.08)` (folk.ts:151-155,221) and re-cuts the geometry only when the eased value moves more than `STEP=0.0004` from what was last drawn, or when someone arrives/leaves (`recut` flag) — this was a deliberate perf fix; previously the geometry was rebuilt every frame even with nobody working.

### No other status indicator
`folk.ts:19-27` states outright: "There is no badge, no spinner and no coloured dot anywhere... you see which houses have their lights on, and whether the person outside one is turned away and busy or turned towards you and waiting." Confirmed nowhere else in the renderer draws a status glyph on a building.

## The camera

All constants verified in `apps/mender/src/renderer/village/camera.ts`.

- **Zoom rungs**: `[1/4, 1/3, 1/2, 1, 2, 3, 4, 6, 8]` (`RUNGS`). Min/max clamp is the first/last rung. The camera settles only on these ratios because the pixel-art kit is nearest-filtered and any non-integer (or non-reciprocal-integer) scale causes uneven row heights and coastline crawl.
- **Settle-to-rung**: after a `zoomed` event, if nothing else arrives for `SETTLE_MS = 220ms`, the viewport snap-zooms to the nearest rung (measured on a log scale so "nearest" is a true ratio midpoint, e.g. 1.41 not 1.5 between rungs 1 and 2) over 140ms (`snapZoom({time:140, noMove:true})`).
- **Flight time**: every animated camera move (`flyTo`, `flyOut`, `flyToYard`) takes `FLIGHT_MS = 520ms`, eased `easeInOutSine`, interruptible (`removeOnInterrupt: true`).
- **Fit scale rule**: above 1:1 the fit is snapped to the nearest whole rung, taking a little shore-overrun rather than a fractional scale; below 1:1 it fits exactly (uneven pixels accepted) because there's no whole ratio between 1/2 and 1 — "the alternative to a slightly uneven island is an island you cannot see all of" (`fitScale()`, camera.ts:105-111).
- **`frame()`** (opening shot / re-frame after founding/forgetting/resize-while-idle): sets zoom and centre instantly (no animation) to fit the whole island extent with 48px padding, on the nearest rung.
- **`flyTo()`** (picking a district, generic): does not centre the district — pins it to the window's top-left, leaving the right side (`inset` px) free for the board that's about to arrive. Never scales below 1:1 (`Math.max(1, fitScale(...))`) — "a district you have walked up to and still cannot see the detail of is not open, it is just selected."
- **`flyOut()`**: returns to the whole-island fit, same 520ms flight.
- **`flyToYard()` / `standInYard()`** (opening a district's yard specifically — this is what `openDistrict` actually calls, not plain `flyTo`): finds the densest sub-window of the district's own land at whichever of `YARD_RUNGS = [1,2,3]` first covers `ENOUGH_LAND = 0.9` (90%) of the window with real land, using a summed-area table over the district's bounding box (`densest()`, camera.ts:259-298) so the standing point is never mostly open sea. Falls back to whichever rung scored highest land-share if none reaches 90%. A small district ends up close in (this is deliberate: "a yard is somewhere you are standing, not a region you are surveying").
- **World size**: `Viewport` is created with `worldWidth: 6000, worldHeight: 4000` (arbitrary large bounds, not tied to the actual island extent).
- **Input**: drag, pinch, wheel (`smooth: 3`), momentum decelerate at `friction: 0.9`.
- **Resize**: only re-frames automatically (`frame()`) while nothing is open (`open === null`); once a district/session is open the camera is considered "yours" and resize does not move it (main.ts:343-345).

## Day/night dimming (`apps/mender/src/renderer/yard/frame.ts:167-182`)

CSS `filter` on the Pixi `<canvas>`, eased over `520ms cubic-bezier(.2,.8,.2,1)`:

| state | filter |
|---|---|
| `island` | `none` (full brightness) |
| `yard` | `brightness(.22) saturate(.5)` |
| `reading` | `brightness(.12) saturate(.4)` (something laid over the yard, e.g. a file/change/commit) |
| `stale` | `brightness(.14) saturate(.3)` (a session nobody has touched for days — even darker than an actively-open yard) |

`showYard()` (main.ts:696-755) picks `stale` vs `yard` based on `now.session?.cold` reported by the yard's own live state; the dimming is deliberately eased rather than a hard cut ("walking into a place and having the whole world behind it cut to black was one of the things that made the app feel like it was flicking between screens").

## The notice line (`village/notice.ts`)

The single line of literal text allowed outside the board: a `div.notice` appended to `document.body`, shown via `say(message, forMs?)`. If `forMs` is given it auto-clears (`say(null)`) after that many ms; otherwise it persists until explicitly cleared or replaced. Used for: `"waking the village…"` (boot), `"drawing the island…"` then cleared (composition), plus every transient result/error notice enumerated above (founding, forgetting, git actions, etc. — most of those are outside this file's strict scope but route through this same mechanism). Opacity toggles 1/0 with the message; no separate fade timing is set on the notice element itself beyond whatever `.notice` CSS provides (not read in this pass).

## Loading the sprite kit (`village/kit.ts`)

`tools/pack-kit.py` packs ~1000 loose kit PNGs into spritesheets (`assets/kit/kit.json` index + `kit-0.png`/`kit-0.json` etc.), keyed by the same kit-relative path strings the layout's `file` fields use. `loadKit()` loads the index then every listed sheet, forcing `scaleMode = 'nearest'` on every sheet — "a single filtered sprite reads as pasted in from another game." `texture(file)` is a flat lookup; a miss is silently possible and surfaces as `scene.missing` (logged to console, not shown to the user: `main.ts:2764-2766`, "Always expect zero").

## Scene assembly / draw order (`village/scene.ts`, `packages/village/src/doc/document.ts`, `scene/resolve.ts`)

- World units are pixels 1:1 at `CELL = 32` px/cell (`scene/resolve.ts:29`).
- Draw order is a stable sort on `(sorting_order, -(y+z), insertion order)` (`compareItems`, document.ts:169-172) — depth is y+z (not z alone), matching the Unity URP custom transparency axis the original scene was authored under; sorting_order keeps terrain (−8..−1) under all objects (0+).
- Shadows are rendered as `blendMode: multiply` tinted `0xd4baa7` rather than alpha-composited, because the kit's shadow sprites are pure white masks whose RGB carries no information (`scene.ts:18-28`).
- A villager-standing "slot" per building is an empty `Container` inserted at the exact child index where the building's doorstep sits in draw order (binary search via `placeFor()`, scene.ts:167-177), computed once at scene-build time and never resorted.
- `Document.items()` (document.ts:339-350) is the sole entry point the renderer uses from the shared editable-document class; the full undo/redo, `place`/`remove`/`nudge`/tile-edit API in that same file is infrastructure shared with the separate village-editor tool (`../a-cozy-agents-village`) and is **not reachable from Mender's own UI** — there is no in-app terrain/object editing surface.

## The icon (`tools/make-icon.py`)

Not drawn separately — it is a screenshot of the running island (`build/icon-source.png`, currently a house/fence/trees/coast corner), composited onto a `1024×1024` canvas with `AIR = 88px` margin on every side (room = 848×848, macOS dock convention), then exported to the full `.iconset` set (16/32/128/256/512, @1x and @2x) and packed to `.icns` via `iconutil`.

## Differences from MENDER.md

1. **The island-growth pipeline MENDER.md describes negatively is fully absent, confirming its own claim** — MENDER.md says "the five-stage pipeline that used to draw them is gone." Verified: `his.ts` has no stage/growth model at all; every district is binary (his exact tile-for-tile shape, or open sea), and the only algorithmic step is the *order* districts unlock in. This is not a contradiction, just confirmed-true.
2. **"Settings is an island with a windmill on it" is not built.** There is no app-level settings surface anywhere in `apps/mender/src/renderer` (grep for "windmill" returns nothing); only per-project settings exist (`yard/settings.ts`, opened via a project's name — matches MENDER.md's separate "a project's name opens its settings" claim). MENDER.md's own STATE-adjacent prose already flags "there is still no windmill," so this is a known, self-documented gap, not a silent one.
3. **The literal campfire on the island is only the founding trigger, not a per-session status indicator.** MENDER.md's "the fire is the session... lit/banked/embers/out" describes a *different* fire, rendered inside a session's own yard (out of this file's scope, likely `apps/mender/src/renderer/yard/`), not the one physical `PF Village Props - Campfire 01` object this catalogue covers, which only ever breathes gently and brightens on hover/founding. Readers of MENDER.md could reasonably conflate the two; the code keeps them as two unrelated things reusing the word "fire."
4. **Houses are explicitly *not* independently pickable, and MENDER.md is faithful to this**, but it is worth flagging because it was apparently a real, reverted design change (`main.ts:1913-1923` narrates the reversal in-line) — earlier behaviour opened the specific session standing in a clicked house or asked for a new one, making session count a property of district architecture. Current code and MENDER.md agree the whole district is one pick target.
5. **No discrepancy found in the villager mood→posture description.** MENDER.md's "turned away while working... turned towards you when they have stopped... red when they have broken" matches code almost exactly, including that `hurt` (code's word) renders as `#FF7A52` (a visibly red-orange), consistent with "red."

## Unverified / unclear

- **Byte-identical claim.** MENDER.md asserts the TS port of `his.py`/shore pass "produce[s] a map byte-identical to the one the village repo's own pipeline produces." I did not have access to `../a-cozy-agents-village/world/his.py` to diff output, so this is **unverified** (plausible given the density of comments in `his.ts`/`shore.ts` citing exact figures measured against that reference, e.g. "62%," "7,127 tiles," "116 of his ids").
- **`.notice` CSS** (fade timing, position, font) was not read in this pass — only the JS-driven opacity/text toggle in `notice.ts` is confirmed.
- **The project rack/shelf** (`apps/mender/src/renderer/yard/shelf.ts`) — MENDER.md describes it folding into the top-right corner over both the island and the yard, with project faces and hover-only names. This file is technically outside the listed scope (not under `village/`) and was not read in this pass; flagging its existence since it visually sits over the island.
- Whether `scene.missing` (sprites the kit lacks) has ever been non-zero in practice — code treats it as an always-zero invariant with only a `console.warn`, no user-facing surface.
- Exact wording/behaviour of `.notice`'s CSS transition (opacity is set inline via JS but no transition duration was located for it specifically, unlike the canvas `dim()` filter which explicitly sets `520ms`).

## Coverage note

Every file listed in scope was read in full except: `packages/village/src/brush/{meadow,redress,shape,terrainBrush,wear,weave}.ts` and `packages/village/src/doc/json.ts` and `packages/village/src/scene/terrain.ts`, which were referenced (imports, called functions, cited constants like `HIS_RUN`, `redress`/`verge`/`relegalise`/`resurface`) but not read line-by-line — they are the original village-editor's autotiling brush engine, invoked by the shore pass as a black box with no separate user-facing surface in Mender itself (no in-app drawing/editing UI exists, confirmed via `document.ts`'s note that Mender only calls `.items()`). `apps/mender/tools/take-village.py` and `apps/mender/tools/make-scroll.py` were enumerated but not read (their names suggest a village-state snapshot tool and a parchment/scroll graphic generator respectively; `make-scroll.py`'s output was not confirmed as currently wired into any rendered UI in this pass). `apps/mender/src/main/village.ts` and the relevant slice of `apps/mender/src/main/projects.ts` were read outside strict scope to verify founding/composition behaviour, since MENDER.md's island claims depend on them.
