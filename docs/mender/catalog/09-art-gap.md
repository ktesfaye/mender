# The art gap: what the Cainos kit gives an agentic-coding app, and what it doesn't

Scope of this survey: `assets/village-kit/` (1,031 source files: 302 terrain, 708
object sprites, 21 non-art) as catalogued in `assets/village-base/atlas.json`
and `assets/village-kit/design-kit.json`, plus a direct look at every prop,
building, character and scene file. Everything below was checked against the
actual files, not the filenames alone — sizes and pixel content were opened
where a name was ambiguous.

## 1. Usable interface furniture in the kit today

Everything here is a top-down farming/medieval-village prop kit. Nothing in it
was drawn to be UI. But a number of families are shaped right for repurposing
as world-is-the-interface furniture:

**Signage / wayfinding**
- `Sign 01`, `Sign 01 L`, `Sign 01 R` — a wooden double-arm signpost with two
  pointing arrow-boards ("EAST"/"WEST" style). Good as-is for a fork/menu
  object — two destinations off one post.
- `Road Sign 01/02/03` — single post + plank signs, one taller variant with a
  symbol slot at the top.
- `Sign Icon 01–08` — small (12–16px) glyphs meant to sit on a shop sign:
  wrench/hammer, coin, potion bottle, heart, crossed tools, a balance/scale,
  a leaf, a horseshoe. Usable as trade-shop icon dressing, not as icons for
  software concepts (see §6).
- `Billboard 01` — a 64×52px corkboard-style noticeboard on two posts, with a
  visible grid of squares on its face. The single largest "post something
  here" surface in the kit. Still small: at 32px/unit that is a ~2×1.6-unit
  object, nowhere near large enough to carry a text panel without being
  scaled up, and this kit is nearest-neighbour/integer-scale only per the
  compositing rules in CLAUDE.md — no soft upscaling.
- `Billboard Notice 01–06` — 10×14px torn-paper scraps meant to be pinned to
  the billboard. Decorative flavour, not readable content at this scale.

**Doors / gates / thresholds (and the kit's only animation)**
- `Fence 02 Door` and `Gate 01`, each as a 7-frame open/close sequence
  (`props-animated/`, `design-kit.json → animations`, 8 fps suggested). These
  are the *only* animated assets in the entire kit. Genuinely useful literally
  as-is for "opening a project/panel" — a gate swinging open reads instantly
  as "this is now accessible."
- Static gate/door pieces in `building-parts/` (`Wall 01 H Gate`, house doors
  baked into building sprites) for closed-state framing.

**Containers / storage (candidate icon shapes, not text-bearing)**
- Barrels (6 variants + a pile), crates (`Crate 01/02/03`, `Pallet Crate
  01–07`, each H/V), sacks (4), pots (5 families), planter boxes. No lockable
  chest exists anywhere in the kit (checked — nothing named "chest" or
  visually resembling one).

**Landmark / status objects**
- `Well 01` (building-parts) — a proper stone-and-shingle-roof well. Reads
  well as a "central hub / settings" landmark object.
- `Shrine 01` / `Shrine 01 Lit` — small shrine with a lit-state variant. The
  only prop in the kit that already ships an explicit on/off visual state,
  which makes it a natural template for "running vs idle."
- `Statue 01`, `Gravestone 01–06`, `Tomb 01/02` — decorative landmarks, not
  obviously interface-shaped.
- Market stalls `Stall 01–06` — six awning colours/goods already varied
  (fruit, bread, produce, striped canvas). Good stock for "one stall = one
  project" if a market-square metaphor is wanted alongside districts.
- `Lantern 01/02`, each Off/On — another prop with a built-in binary state,
  usable for status lights.
- `Cart 01 E/W` (multi-part, with wheel pieces) — could plausibly carry a
  "queued/in-progress" connotation (a cart being loaded) but this is a stretch
  read, not a natural fit.

**What is conspicuously absent from this list**: no scroll, no book, no
chest, no parchment/paper texture, no frame or border graphic, no button, no
cursor, no icon sheet for anything abstract. Confirmed by directly searching
every filename in the kit for `flag|banner|scroll|book|chest|frame|border|
button|cursor|icon|panel|board|chalk|note|paper|parchment` — the only hits
are the sign/billboard family listed above. There is nothing resembling a
wooden chalkboard, a hanging parchment scroll, or a picture-frame border
anywhere in the kit.

## 2. Is there a windmill?

**No. Definitively not.** Checked four independent ways, all negative:
- `find assets/village-kit -iname "*mill*"` — zero results, across every
  directory including `scenes/`.
- `grep -ril "mill"` over every `.json` in the kit (design-kit.json,
  terrain-classes.json, grass-edges.json, all `scenes/*.json` design
  iterations) — zero results.
- The full `buildings-assembled/` and `building-parts/` listing (20 whole
  buildings, 93 parts) was read and visually inspected via
  `_index_buildings.png`: Barn, Blacksmith, Chapel, Dock, 15 House variants,
  Shed, Shrine, 6 Stalls, Teepee, Tent, Tower, Wall run + corners + gate,
  Warehouse, Well. No mill, no windmill, no watermill, no waterwheel.
- Nothing in any of the nine `scenes/*.json` design-iteration files
  (`hub_v1`…`v5`, `village_final`, `village_v2`, `settlement*`, `closeup`,
  `terrace`, `plateau_test`) references one either.

If "settings island with a big windmill" is load-bearing for the concept, the
windmill is 100% new art — there is nothing in this kit to derive it from,
not even a rotating-blade mechanism to reference (the kit's only animation
precedent is the gate/door swing, which is a hinge, not a rotor).

## 3. UI-ish assets: frames, panels, borders, buttons, cursors, icons

None exist. Checked `design-kit.json` (the kit's own manifest — keys are
`pixels_per_unit, grid_unit_px, filter_mode, pivot_convention, depth_sort,
counts, animations, shadows_paired, palette, sprites`; no `ui`, `icon`,
`panel`, `frame`, or `cursor` key or category anywhere in it), the
`terrain-classes.json` and `grass-edges.json` (tile classification only), and
the `scenes/` directory (nine hand-built layouts and their PNG renders — all
world composition, no HUD/overlay art in any of them, confirmed by
inspecting the scene JSON structures — they're the same object/tile shape as
`base-layout.json`, nothing chrome-shaped).

`design-kit.json → counts` is exhaustive and confirms the whole kit's content
by category: `building_part 93, building_whole 20, character 4, plant 71,
prop 226, prop_animated 14, shadow 324, terrain_tile 258`. There is no `ui`
or `icon` bucket because there is no such content.

## 4. Character / villager sprites — and this is the load-bearing finding

The kit ships exactly **four files** under `character/`:

```
TX Player B.png   21×48px   (back view)
TX Player F.png   21×48px   (front view)
TX Player S.png   21×48px   (side view)
TX Shadow Player.png  27×28px  (one shared shadow)
```

`design-kit.json → animations` lists only two entries in the whole kit —
`Fence 02 Door` and `Gate 01`, both 7-frame hinge swings. **There is no
animation entry for the character at all.** `atlas.json`'s own per-sprite
record confirms it structurally: every one of the four character sprites has
`animation: null, frames: null, frame: null` — the schema has fields for
animation and none of them are populated for this family.

These four sprites back exactly one prefab, `PF Player`, and `atlas.json`
records it used **zero times** in the artist's actual `base-layout.json` — it
exists in the kit as a single marker object, not a placed, walking character.

I opened the front-view sprite at 8× to check it wasn't a cropped
spritesheet frame. It isn't — it's the whole asset, and what it depicts is
**not a legible humanoid**: a plain vertical robe/capsule silhouette with two
small pointed cat-ear-like tabs at the top and two blue-dot eyes painted on
partway down. No visible arms, no visible legs, no walk pose, no distinct
left/right facing beyond the S (side) sprite presumably mirroring. It reads
as a rough placeholder marker for "where the camera/player is standing" in
the original demo scene, not as finished character art.

**Bottom line: there is zero walk-cycle, zero directional animation set (4/8
direction), zero idle animation, and the one static character that does
exist is not good enough to ship as a villager even standing still.**
"Agents will be represented as walking villagers" is a feature this kit
cannot support in any form — not a stretch, not a recolour job. It needs a
full character sprite set built from scratch: idle + walk cycles in however
many directions the top-down camera needs (the world uses 8-directional
placement logic elsewhere, but 4-direction with flip_x, matching how the kit
mirrors other asymmetric props, would be the cheapest viable scope), at
minimum, before any per-agent visual variation (idle-at-desk, sleeping,
error) is even considered.

## 5. Palette

`palette.txt` lists the 63 most-frequent colours in the kit by raw pixel
count (not the full colour set — the kit has thousands of near-duplicate
anti-aliased shades; this is the dominant-colour summary). All 63 are warm
neutral browns and greys — wood, dirt, stone, and outline tones. The
top three by far are `#5C4B40` (37,948px), `#5E4C42` (37,584px), and
`#482510` (28,040px) — the last of which matches CLAUDE.md's documented
"universal outline" colour exactly, which is a good cross-check that this
file and the project's existing palette guidance agree.

No blue, green, or red/orange appears in this top-63 list at all — those
colours exist in the kit (grass greens, water blues, roof reds/oranges,
produce colours on stalls) but occupy far less total pixel area than
wood/dirt/stone, so they don't surface in a frequency-sorted top list. The
practical constraint for new art, stated concretely:

- **Outlines**: use `#482510` (or immediate neighbours in that top-10
  cluster) — this is the one colour every sprite in the kit agrees on, and a
  new asset with a different outline colour will look pasted-in instantly.
- **Base tones**: pull from the warm brown/tan/grey cluster that dominates
  the top 63 for anything wood, stone, dirt, or "furniture" (panels, signs,
  frames).
- **Accent colours** (green/blue/red) must be sampled from the actual grass,
  water and roof sprites rather than invented, since they aren't represented
  in `palette.txt`'s top slice — `palette.png` (a 384×384 swatch sheet) and
  the terrain/plant sprite files themselves are the source for those, not
  this file.
- Nothing in the kit is saturated or neon. Any UI colour coding this app
  needs (error red, running/green status, etc.) has to be desaturated and
  earth-toned to sit in this world without reading as a modern app overlay
  pasted onto pixel art — this is a real constraint, not just house style,
  because CLAUDE.md already treats palette mismatch as a shipping-quality
  bug ("must draw from `village-kit/palette.txt` ... or it reads as pasted
  in from another game").

## 6. Everything that has to be made or sourced

Grouped as asked. "Derivable" means existing sprites/parts can be
recombined, recoloured, or lightly edited by someone who is not a pixel
artist and get a passable result. "New art" means it needs an actual pixel
artist pass matching this kit's linework and shading style, or licensing
equivalent art from elsewhere in the same visual language.

### World furniture

| Asset | Verdict |
|---|---|
| Settings island windmill (rotating blades, base structure) | **New art.** No mill of any kind in the kit (§2). The building shell (walls, roof, base) could lean on House/Barn/Tower parts for the non-rotating structure, but the blade mechanism and its rotation has no precedent asset or animation pattern to derive from — the kit's only rotating/moving-part precedent is the door/gate hinge swing, which is a different kind of motion entirely. |
| Per-project district markers (the "this plot is a project" visual) | **Derivable.** The existing per-district building/land vocabulary already documented in this repo (stages 0–5, `world/stages/*.json`) is built from kit parts; a project marker riding on top of that (a stall, a signpost, a billboard) is assemblable from existing pieces. |
| Stage-growth props (what appears as a district "grows") | **Mostly derivable** for early stages (tents → sheds → houses is exactly the kit's own building range), but the kit tops out at its biggest House/Warehouse/Tower — a "fully mature, impressive" stage-5 district that needs to visibly exceed anything the artist built (per CLAUDE.md's "the artist is not the ceiling" directive) will need new large-scale structures, since the kit has no bigger landmark buildings than what's listed in §1. |
| A visible "growing island" edge / new-land dressing | **Derivable**, already solved — this is exactly what `editor/HISTORY.md`'s shore/coast pass does today (`Ground.erase`/`redress`). |

### Panel / board surfaces (the actual UI substrate)

| Asset | Verdict |
|---|---|
| A wooden-plank panel large enough to host a settings menu or file list | **New art.** `Billboard 01` (64×52px) is the closest existing thing and is far too small and not built to be 9-sliced/tiled to arbitrary panel sizes. Nothing in the kit is designed to scale to UI-sized surfaces. |
| A parchment/scroll surface for text content (chat, notes, diffs) | **New art.** No paper/parchment texture exists anywhere in the kit — confirmed by direct filename search (§1). |
| A chalkboard surface (explicitly named in the brief) | **New art.** No chalkboard, no slate texture, nothing dark-surfaced-for-writing-on in the kit at all. |
| A sliding-panel mechanism / frame border for any of the above | **New art**, though the door/gate open-animation (§1) is a usable *behavioural* precedent (an object animating from closed to open reads correctly in this world) even though its *visual* form (a swinging gate) isn't reusable for a panel that slides in. |
| Icon glyphs to sit on signs (small badges for menu items) | **Partially derivable.** `Sign Icon 01–08` exist and are stylistically on-model, but their subjects (wrench, coin, potion, heart, crossed tools, scale, leaf, horseshoe) don't map to software concepts — usable as a *template* for new icons in the same 12–16px glyph-on-a-sign format, not as the icons themselves. |

### Iconography for concepts with no village equivalent

None of these exist in any form and all need new art, though several have a
plausible in-world metaphor to design toward (noted where one exists):

- **Git branch / merge** — no equivalent object or motif in the kit (fences
  fork but don't rejoin; no natural "two paths become one" prop exists).
- **Diff (added/removed/changed)** — nothing comparable; would need a
  from-scratch visual language (e.g., colour-coded planks or ribbons), and
  must stay inside the earth-tone palette constraint from §5 rather than
  using stock red/green diff colours.
- **Pull request** — no equivalent; a gate/threshold motif (leaning on the
  existing 7-frame gate animation) is a plausible starting metaphor but the
  actual icon is new art.
- **Terminal / running command output** — nothing in the kit resembles a
  console or scrolling text surface; ties back to the chalkboard/parchment
  gap above.
- **Model picker** — no equivalent; could plausibly be built from the
  Sign-with-icon format (§ above) if each model gets its own small glyph, but
  the glyphs themselves are new.
- **Error state** — the kit's closest thing to an emphatic state marker is
  `Lantern 01/02 On/Off` or `Shrine 01 Lit`, i.e. an on/off light, not an
  alarm/error read. New art, though the on/off precedent is a reasonable
  template to build from.
- **Running / stopped / idle status** — same as error: `Lantern`/`Shrine Lit`
  are the only built-in binary-state props in the whole kit and are the best
  starting template, but a three-or-more-state status system (idle/running/
  error/done) needs new art beyond what a simple lit/unlit swap gives.

### Character work

- **Idle** — **new art.** The one existing character sprite per facing isn't
  usable as-is (§4); even a "just stand there" pose needs to be redrawn to a
  legible villager.
- **Walk cycle, all needed directions** — **new art, entirely.** Zero frames
  exist (§4). This is the single biggest gap in the whole survey given how
  central "agent sessions are villagers walking around" is to the concept.
- **Working-at-a-desk** — **new art.** No seated/working pose of any kind
  exists for the player character; nothing to derive from.
- **Sleeping** — **new art.** No precedent pose.
- **Error / distressed state** — **new art.** No precedent pose or expression
  variant; the four existing sprites don't even establish a consistent face
  to build an expression system on top of.
- **Multiple distinct agents on screen at once (recolours/variants)** — once
  a base character is made new, palette-swapping it per agent is
  straightforward and genuinely derivable *from the new base art*, not from
  anything currently in the kit.

## Summary of scale

The kit is deep and well-made for what it is — a static top-down village
diorama (302 terrain tiles, 708 object sprites, 325 assembled prefabs, all
already fully catalogued and rule-checked by this project's existing
pipeline). It has real, usable raw material for signage, thresholds/gates
(including the kit's only animation), landmark objects with built-in
on/off states, and a well-defined, internally consistent earth-tone
palette to build new art inside of.

But **none of the actual interface layer exists**: no windmill, no panel or
parchment or chalkboard surface of any kind, no frame/border/button/cursor
vocabulary, and — most consequentially — the "character" is four static,
barely-legible placeholder sprites with no animation and zero use in the
artist's own scene. Every piece of the "agents are walking villagers"
premise, and every piece of the panel-based UI premise, is new art. What the
kit buys the project is a matched palette, a proven prop vocabulary for
dressing the *world* around those UI panels, and one directly reusable
open/close animation — not the interface itself.
