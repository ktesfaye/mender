# Live browser renderer — audit and build list

Evidence gathered by reading `editor/src/scene/*`, `editor/src/app/sceneGraph.ts`,
`editor/src/app/npc.ts`, `editor/src/app/nav.ts`, `editor/src/app/editor.ts`,
`editor/src/main.ts`, `app/index.html`, `app/serve.py`, `app/app.js`,
`world/scene.py`, `world/state.py`, `world/network.py`, `world/build.py`, and
`world/shore/`. Line/byte counts below are measured, not estimated.

## Headline finding

**A live Pixi.js renderer already exists and is not the thing `app/` uses.**
`app/` (what the task description calls "today's app") is a completely separate,
much dumber thing: a stdlib Python HTTP server (`app/serve.py`) that bakes a PNG
per state with Pillow and an `<img>` tag panned with CSS transforms
(`app/app.js`, 195 lines). It has nothing to do with Pixi, WebGL, or a scene
graph — it is correctly diagnosed in the task brief as unable to zoom smoothly,
animate, or hold moving characters.

But `editor/` is a full WebGL scene: Pixi.js 8 + `pixi-viewport` 6, a real scene
graph kept in sorted draw order, a working NPC walker system with A* replanning,
alpha-accurate picking, and a live per-frame ticker. It renders `base-layout.json`
(the whole 16,793-sprite demo village) at 60fps today, in a browser, via
`npm run dev` at `:5273`. This is the actual starting point for a live client,
not the PNG pipeline — the two share no code.

## 1. Reusable as-is vs. Python-only / build-time-only

**Reusable as-is (already TypeScript, already runs in a browser):**

- `editor/src/scene/render.ts` — texture loader (`loadSprites`), shadow-mask
  whitening, `build()` (draw-list → Pixi `Container`), nearest-neighbour pixel
  filter setup. Kit-agnostic, no editor dependency.
- `editor/src/scene/baseLayout.ts` / `resolve.ts` — `base-layout.json` →
  sorted `DrawItem[]`, and the composed-scene equivalent. Pure functions.
- `editor/src/scene/types.ts` — the `DrawItem`/`Scene` shapes everything else
  is built on.
- `editor/src/app/sceneGraph.ts` — `SceneGraph` class: keeps `items[i]` and
  `container.children[i]` in lockstep via binary-search insert (`compareItems`
  from `editor/src/doc/document.ts`), incremental `insert`/`removeObject`, and
  alpha-mask **picking** (`pick(wx, wy)` → object index). This is the hit-test
  engine, already built and already handles the "click the tree, not its empty
  bounding-box corner" problem.
- `editor/src/app/npc.ts` — `Villagers` class: spawns walkers on `nav`, A*
  interpolated movement (`SPEED = 2.4` cells/s), 4-direction sprite facing,
  per-frame depth-sort against the same scene-graph order (`sort()`), a
  `remap()` path that re-plans when the map changes under a walker without
  deleting anyone, palette-based tinting per walker so many identical "player"
  standees read as a crowd. This is very close to "characters representing
  live agent sessions" already — see §4 for the gap.
- `editor/src/app/nav.ts` — router/pathfinding (`router()`), `surfaceAt()`
  ground classification, obstruction rules (buildings block by whole sprite
  box, gates pass, plants don't). Consumed by `npc.ts`.
- `world/shore/shore.mjs` (4,621 lines, esbuild-bundled) — **the coast/erase/
  dress pass is already pure portable JS**, not Python. `world/state.py`'s
  `scene.py` shells out to it via `node` as a subprocess for the baked-PNG
  path, but the bundle itself (`world/shore/entry.ts` + the editor's own
  `Ground.erase`/`weave.ts`/`redress.ts` brush code) has no Node-specific I/O
  in its core logic — only `entry.ts`'s CLI wrapper reads/writes files. It is
  built with `--platform=node`; re-bundling the same entry with
  `--platform=browser` (or a thin browser entry point) is plausible reuse
  rather than a port. This matters because it means **shore dressing for a
  live "grow a district" animation does not have to be re-derived** — the
  actual brush algorithm that legalizes an outline and dresses it can run
  client-side.

**Python-only / becomes build-time-only:**

- `world/build.py` (902 lines) — composes `world.json`/`plots.json` from
  `world/stages/*.json` + the base layout: meadow pass, stage objects, trail
  digging, footprint claiming. This is authoring-time tooling (agents hand-draw
  stage growth once), not something a live client runs. Stays Python, run when
  a district's stage art changes, output committed as `world.json`/`plots.json`.
- `world/state.py` — `parse_state`, `effective` (ancestor-lane resolution),
  `land_of`/`new_of`/`filter_layout`. This is small, pure, and state-shaped
  logic with **no Python dependency** other than being written in Python — it
  is the natural thing to port to TypeScript so the client can compute "what's
  visible in state X" itself instead of asking a server for a whole new PNG.
- `world/scene.py` `compose()` — orchestrates `state.py` + the `shore.mjs`
  subprocess + `network.py`. The orchestration itself (filter → erase → dress →
  annotate nav) is the shape a client-side "grow a district" routine needs;
  today it's Python gluing a subprocess call, which has to become a JS/TS
  module calling the same shore-pass logic in-process (in a Worker, most
  likely — see Build List).
- `world/network.py` — pathfinding/annotation over the *baked-PNG pipeline's*
  layout shape. Produces `{roads, pieces, piece_rows, spots}`, which is **not**
  the same shape as the `NavBlock` (`{walkable, roads, settlements[...]}`)
  `editor/src/app/npc.ts` already consumes. These are two different nav
  schemas grown by two different halves of this codebase and will need to be
  reconciled (see Build List item on nav-schema unification) — this is exactly
  the "one question, one implementation" trap the project's own CLAUDE.md
  warns about, already halfway tripped.
- `world/render.py`, `app/serve.py`'s PNG caching, `app/app.js`'s
  pan/zoom-via-CSS-transform/DOM-image-load — all become dead code once a live
  renderer exists; nothing here is reusable at runtime, though `render.py`
  stays useful as an offline reference/regression tool (it's what `map-verdict`
  and the critic render from today).

## 2. Sprite loading — no packed atlas exists

- The kit is **1,031 individual PNG files, ~18MB total**
  (`assets/village-kit/`), confirmed by direct count.
- `render.ts`'s `loadSprites()` fetches each one individually through Pixi's
  `Assets.load`, 20 concurrent lanes, with retry passes — this is a
  request-per-sprite model, not a spritesheet. It's proven to work (it's what
  the editor loads today to render the whole 16,793-item demo), but it is
  optimized for a one-time editor session load, not for "hot-swap to a new
  district's sprite set on every camera transition" at app-navigation speed.
- **No `.json`+`.png` texture atlas (Pixi spritesheet) exists anywhere in the
  repo.** For "fast enough to redraw every frame at a decent size," per-frame
  cost is not the sprite-loading problem — Pixi already batches draw calls from
  a `Container` of `Sprite`s reasonably well, and the scene graph is built once
  and only patched (see §6). The real risk is **load latency**: each district
  view needs its used-sprite subset fetched before first paint, and 1,031
  separate HTTP requests (even 20-wide) is the wrong shape for a per-navigation
  transition that's supposed to feel instant. Packing a real spritesheet (or
  at minimum a handful of per-family atlases: terrain, buildings, plants,
  props, character) is real, unstarted work — `spritesOf()`/`spritesUsed()`
  already say precisely which files a given scene needs, which is the input
  a packer would consume.

## 3. Camera / zoom / pan — exists, but not animated

- `pixi-viewport` (`viewport.drag().pinch().wheel({smooth:3}).decelerate(...)`,
  `clampZoom`) gives working pan/zoom/inertia today (`editor/src/main.ts`).
- **No animated/tweened transitions exist anywhere in this codebase.**
  Grepped for `.animate(`/`.snap(`/tween-style calls on the viewport: the only
  camera moves found are instant — `fit()` in `main.ts` calls
  `viewport.setZoom(...)` then `viewport.moveCenter(...)` with no
  interpolation, and `app/app.js`'s separate CSS-transform camera in `app/` is
  also instant/direct-manipulation only (drag, wheel, dblclick-to-fit). `pixi-
  viewport` does ship an `animate()` plugin (part of the library, just unused
  here), so "zoom in and slide a wooden board in beside it" is buildable on top
  of the existing viewport rather than needing a new camera system — but the
  smooth-transition behavior itself is 100% unbuilt.

## 4. NPC walking — real, but built for a fixed test-harness map, not live agent sessions

What it does today (`npc.ts`, confirmed by reading the whole file):

- Spawns a fixed `count` of walkers at editor-launch, evenly distributed
  across settlement door-to-door pairs, walks a computed A* route at constant
  speed, reverses at the end ("there and back"), re-plans (`remap`) when the
  underlying `nav` block changes identity, rescues walkers whose ground
  disappeared, tints each with one of 8 fixed palette colours, sorts each
  frame into the scene graph's own depth order so a walker is correctly
  occluded by buildings/trees.
- It is explicitly a **test harness for whether `nav` is true** ("Villagers
  walking the map, as the test of whether nav is true" — its own file header),
  not a live-agent visualization. Its walkers are anonymous, cycle forever
  between two fixed points, and have no concept of "this one is agent session
  #4, currently running `npm test`."

Gap to "drive characters representing live agent sessions":

- No per-NPC identity/metadata (name, avatar variant, current task/status) —
  today's `Walker` interface carries only `from`/`to`/`path`/`trips`/`stuck`.
  Tinting is index-based, not identity-based.
  Needs a stable id → walker mapping, additive rather than a rewrite.
- No API to spawn/despawn a walker on demand, or to redirect one to a
  specific destination (a building door tied to a project) outside the
  fixed "cycle between two settlements forever" loop — `spawn()` and
  `remap()` are both whole-population operations.
- No idle/state animation beyond walk-cycle facing sprites (`TX Player
  B/F/S`, one frame each per direction — no actual walk-cycle animation
  frames exist in the kit at all, confirmed by `BODY` map having exactly one
  file per facing). "Agent is thinking" / "agent errored" visual states don't
  exist and the kit has no sprite for them — would need new art or a
  procedural indicator (speech bubble, icon overlay), not a kit asset.
- The core motion/occlusion/pathing machinery, though, is sound and directly
  reusable: `router()`, `posOf`/`cellOf` interpolation, the depth-sort trick.

## 5. Hit-testing — exists for objects; districts/plots need a second layer

- `SceneGraph.pick(wx, wy)` (§1 above) is real, alpha-accurate, topmost-first
  object picking, already used by the editor's Select tool. This directly
  answers "click a building/object."
- **Nothing today hit-tests a district/plot as a region** the way the app
  concept needs ("click a district to open its project"). The closest analog
  is `app/app.js`'s `plotAt([x,y])` / `inRows()` — but that's the *dead* PNG-
  panning app, working off `plots.json`'s per-plot cell-row footprints
  (`world/plots.json`, `rows_of()`/`bbox()` shape from `world/build.py`), not
  the Pixi scene. That footprint data (which cells belong to which plot, per
  stage) is exactly the right shape to reuse for district-level hit-testing in
  the live renderer — it just needs to be read into the browser and tested
  against `viewport.toWorld()` the way `editor.ts`'s `toWorld()`/`cellAt()`
  already do for brush-cell hit-testing. This is new wiring, not new logic.
- Also worth noting: `editor.ts`'s own `toWorld`/`cellAt`/`snapUnits`
  coordinate-conversion helpers are the exact utilities an app click-handler
  would need and are currently private to the `Editor` class — trivial
  extraction, not a rebuild.

## 6. Per-frame cost — what's already proven vs. what's new risk

Proven today (this is the editor rendering the *entire* 16,793-sprite base
village, not a cropped district view):

- `render.ts`'s `build()` is a one-shot Container build; `SceneGraph` patches
  incrementally (`insert`/`removeObject`/`moveObject`) rather than rebuilding
  per frame — the file's own comment states a full rebuild costs ~16ms and is
  "fine once" but "the entire frame budget during a drag," which is why
  terrain strokes are coalesced to one rebuild per `requestAnimationFrame`
  (`editor.ts` `rebuildTerrain()`).
  → **Bake once per state, redraw only on state change**, exactly as the
  editor already does. A live app that's mostly "camera moves over a static
  composed scene" should be cheap: Pixi's batcher handles thousands of static
  sprites fine at 60fps (this is the exact workload the editor already runs
  live), and the app's district-growth events are rare (project stage
  changes), not per-frame.
- `npc.ts`'s per-frame cost is real but small and already measured in intent:
  binary-search insertion of each walker into scene order "a few dozen
  searches over 16,000 items, once a frame" (file's own comment) — this scales
  with walker count × log(scene size), not scene size alone. Should hold for
  a reasonable number of concurrent agent-session NPCs (tens), but has not
  been measured beyond the harness's ~24 test walkers — this is a real
  unknown for "many concurrent agent sessions," not a proven number.

New risk, not yet exercised by anything in the repo:

- **Sprite-set churn on navigation.** Every existing perf story is "one scene
  loaded once, then edited in place." An app where the user pans between
  districts/zooms into a project needs either (a) the whole village's sprites
  loaded up front (18MB of individual requests — see §2), or (b) dynamic
  load/unload of a district's sprite subset on approach, which is unbuilt and
  has real risk of pop-in/stalls without the atlas packing from §2.
  - Note: given the app's actual product shape (one small growing island,
    not the full 27-district demo), the realistic sprite working-set per
    view is much smaller than "the whole kit" — this risk is real but likely
    bounded, not open-ended.
- **The board/panel slide-in and camera zoom happening together** — untested
  combination; nothing in the editor does simultaneous viewport animation +
  DOM/UI transition.
- **Continuous ticker cost with the "wooden board" UI open** — nothing today
  exercises "camera parked, NPCs walking, a document panel open" as a steady
  state; the editor's ticker only ever runs against the map view.

## Build List

Each entry: what exists today (or doesn't) → what "done" looks like.

1. **Bootstrap a live client app shell on the Pixi stack.** Replace `app/`'s
   `<img>`-panning page with a page that boots Pixi + `pixi-viewport` the way
   `editor/src/main.ts` does (minus the editor's tool/brush UI). Done: the app
   loads in a browser and renders the current island state via Pixi instead of
   a baked PNG, at the same visual fidelity as today's `map.png`.

2. **Port `world/state.py`'s state resolution to TypeScript.** `parse_state`,
   `effective` (ancestor-lane rule), `land_of`/`new_of`/`filter_layout`/
   `visible` are small and pure. Done: given a state string and `world.json`,
   the client computes the same visible tile/object set Python does, with a
   golden-output test against `state.py` for a handful of states.

3. **Bring the shore/dress pass client-side.** Re-bundle `world/shore/
   entry.ts`'s underlying logic (already the editor's own `Ground.erase`/
   `weave.ts`/`redress.ts`) for the browser — likely behind a Web Worker so
   erasing/dressing a growing district doesn't block the main thread/ticker.
   Done: given a land-cell set, the client produces the same dressed tile
   output as `shore.mjs` does today (byte-for-byte or cell-for-cell parity
   test against the Node bundle's output for a sample state).

4. **Unify the two `nav` schemas.** `world/network.py` emits `{roads, pieces,
   piece_rows, spots}`; `editor`'s composer/`npc.ts` expects `{walkable,
   roads, settlements[{gate, buildings[{door}]}]}`. Decide which shape the
   live client's NPC system actually consumes and make one producer for it
   (per this project's own "one question, one implementation" rule). Done:
   a single nav-builder function, called from the client-side compose path,
   whose output `npc.ts`'s `Villagers.spawn()` accepts unmodified.

5. **Client-side district composition ("grow a plot").** Combine 2–4 into one
   client-side `compose(state) → DrawItem[]` path mirroring `world/scene.py`'s
   orchestration, replacing "ask the server for a new PNG" with "recompute
   and patch the scene graph in place" via `SceneGraph.insert`/`removeObject`.
   Done: changing a project's stage updates the live scene without a page
   reload or a server round-trip for pixels.

6. **Sprite atlas packing.** Build a packing step (offline, e.g. a script using
   an existing packer against `spritesOf()`'s file lists) that emits one or a
   few Pixi spritesheets (terrain, buildings/props, plants, character) instead
   of shipping 1,031 loose PNGs to the client. Done: the client's initial
   district view loads via a handful of atlas requests, not 100+ individual
   sprite fetches, and `render.ts`'s texture lookup (`texture(file)`) is
   satisfied from the packed atlas transparently to every caller.

7. **Progressive/scoped sprite loading.** Extend `loadSprites()`'s model so a
   view loads only the sprite set the *visible* districts need (via
   `spritesUsed()`/`spritesOf()` scoped to a state), with background
   prefetch for districts about to come into view. Done: opening the app cold
   does not fetch every sprite in the kit; approaching an unloaded district
   has no visible pop-in under normal camera speed.

8. **Animated camera transitions.** Add tweened `viewport` moves for "zoom
   into a district" and "return to the island" (pixi-viewport ships an
   `animate()` plugin, currently unused) with an easing curve and duration
   tuned by eye. Done: clicking a district animates the camera to it instead
   of jump-cutting, and clicking away animates back.

9. **The wooden-board side panel, wired to camera state.** New UI component
   (DOM or Pixi) that slides in alongside the zoomed camera position and
   tracks it (or locks once settled). Done: opening a project shows the board
   in sync with the camera's arrival, closing it reverses cleanly, and the
   combination doesn't visibly stutter the ticker (measure fps during the
   transition).

10. **District/plot hit-testing in the live scene.** Port `app/app.js`'s
    `plotAt`/`inRows`/`bboxOf` logic (or the `world/plots.json` footprint data
    it reads) to test against `viewport.toWorld()` coordinates, using the
    `Editor`'s private `toWorld`/`cellAt` helpers as a template (extract them
    to a shared module rather than duplicating). Done: clicking empty island
    ground (a present district, not an object) opens the right project;
    clicking open sea does nothing; clicking the object picking layer
    (`SceneGraph.pick`) still resolves individual objects/buildings first.

11. **Live agent-session NPCs.** Extend `npc.ts`'s `Walker` (or a new type
    built beside it) with a stable identity (agent/session id), on-demand
    spawn/despawn tied to session lifecycle (not the fixed evenly-distributed
    `count` loop), and directable goals (walk to *this* project's door) rather
    than the fixed "cycle between two settlements forever." Done: starting an
    agent session spawns a walker that heads toward that project's building
    and stays near it while the session is active; ending the session
    despawns or parks it, without touching unrelated walkers.

12. **Agent status visualization.** Since the kit has no run/idle/error
    sprite frames (confirmed: one static sprite per facing direction, no
    walk-cycle or state variants), decide and build a visual language for
    "running / idle / errored / done" — likely a lightweight overlay
    (icon/speech-bubble/tint) rather than new character art, keeping the
    palette-tint precedent `npc.ts` already uses. Done: an agent's live status
    is visible on its NPC at a glance, using only assets that exist or a small
    deliberately-added set that matches the kit's palette
    (`village-kit/palette.txt`).

13. **Island growth as a live event, not a reload.** Wire "a project grows a
    stage" (today: re-running `world/build.py`'s authored stage art, offline)
    to trigger the client-side compose path (item 5) and animate the new land/
    buildings appearing, rather than requiring an app reload. Done: growing a
    district in the running app shows new land/buildings appear without a
    page refresh, using the same dressed-shore output the offline pipeline
    would have produced.

14. **Settings/windmill island interaction.** Currently undesigned in code
    (not found in any file read). Needs its own plot/footprint entry and
    click target the same way a project district does. Done: clicking the
    windmill island opens settings the same way a project district opens its
    board, sharing the hit-testing and camera-transition code from items 8
    and 10 rather than a bespoke path.

15. **Perf validation under the real workload.** Nothing in the repo exercises
    "camera animating + NPCs ticking + side panel open" together, or NPC count
    beyond the ~24-walker test harness. Done: a driven test (Playwright, as
    `editor/tools/*.mjs` already does for the editor) that opens a project,
    lets several NPCs walk, and asserts fps stays above a floor — the same
    "measure the picture/the frame, don't trust a clean model" discipline this
    project's CLAUDE.md insists on elsewhere.

16. **Decommission or clearly demote the PNG pipeline.** Once the live
    renderer covers what `app/serve.py`/`app/app.js`/`world/render.py` did,
    decide their fate explicitly — `render.py` should likely stay as the
    offline tool `map-verdict`/`critic.py` render from, but `app/serve.py`'s
    PNG-serving endpoints and `app/app.js`'s pan/zoom become dead code. Done:
    CLAUDE.md's app section is rewritten to point at the live client as "the
    app," and it's explicit which of the old `app/`/`world/` pieces are now
    build-time-only tooling vs. fully retired.
