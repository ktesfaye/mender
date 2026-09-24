# Sub-boards spec — literal transcription

Source: `/Users/kirubel/Documents/dev/design_handoff_village_session/designs/Sub-boards.dc.html`
(absolutely-positioned, inline-styled HTML inside a `1440px`-wide frame; `s1` frame is
auto-height, `s2`–`s6` frames are `1440×1124`).

**Discrepancy to flag up front:** the brief calls `s4` "writing a commit," but the file's
own `S4` label is **"Reading a commit"** and its board content is a commit's detail view
(message, author, files moved, adjacent commits on either side) — a read view, not a
compose-a-commit-message view. There is no separate "writing a commit" board in this file.
The transcription below documents what is actually there, verbatim, under the heading `s4 —
reading a commit`.

Fonts used throughout: `'Josefin Sans', sans-serif` (UI/labels), `'Courier Prime', monospace`
(all trail/meta/code/list text), `'Cormorant Garamond', serif` (prose titles/body on s2–s4),
`'Caveat', cursive` (sticky notes and the input line).

---

## Shared chrome present on every board (s2–s6)

Each of these frames is `position:relative;width:1440px;height:1124px;overflow:hidden;
background:#1d1811;font-family:'Josefin Sans',sans-serif;color:#f4e3c0;border:2px solid
var(--c-outline);box-shadow:6px 6px 0 rgba(72,37,16,.55)`.

**World background**, filtered dark, sits behind everything:
`position:absolute;inset:0;background-image:url(assets/crop-market.png);
background-size:1620px 1134px;background-position:center 62%;image-rendering:pixelated;
filter:brightness(.12) saturate(.4)`.

**Firelight glow** (radial, over the campfire): `position:absolute;left:300px;top:560px;
width:800px;height:420px;background:radial-gradient(ellipse at 48% 60%,rgba(255,168,60,.14),
rgba(0,0,0,0) 64%)`.

**Campfire sprite**: `assets/p-campfire.png`, `92×64`, at `left:596px;top:752px;
filter:brightness(.55);animation:cv-flicker 480ms steps(2,end) infinite alternate`.

**Five yard-figure silhouettes** (`assets/player-f.png`, `42×96` each), all filtered to
`filter:brightness(.16) saturate(.3)` — i.e. near-black, desaturated silhouettes, static (no
walk/idle animation), at:
`left:688px;top:704px` / `left:478px;top:782px` / `left:556px;top:746px` /
`left:868px;top:728px` / `left:776px;top:788px`.

**The scrim**: `position:absolute;left:420px;top:92px;width:1000px;height:824px;
background:rgba(72,37,16,.72)` — solid flat brown wash, `72%` opacity, no blur/backdrop-filter.
It covers everything from `x=420` to `x=1420`, `y=92` to `y=916`. Left of `x=420` (the gatepost
column) is **not** covered by the scrim and stays visible, darkened only by the shared
world-background filter and sprite filters above.

### What stays visible behind the scrim (the gatepost, left of x=420)

- **Project title** "New Orleans" — `left:40px;top:22px;font-size:22px;letter-spacing:.24em;
  text-transform:uppercase;font-weight:600;text-shadow:2px 2px 0 #120d07`.
- **Session subline** — `left:42px;top:58px;font-family:'Courier Prime',monospace;
  font-size:12px;color:#bfa476;text-shadow:1px 1px 0 #120d07`, text:
  `slideshow/nola · 64h 15m · 51 turns`.
- **"nailed to the gatepost" label** — `left:86px;top:206px;font-size:10px;letter-spacing:
  .24em;text-transform:uppercase;color:#a89272;text-shadow:1px 1px 0 #120d07`.
- **Nail/post bar** — `left:60px;top:232px;width:14px;height:470px;
  background:linear-gradient(90deg,#54391e,#3a2712)`.
- **Sticky note (newest, unanswered)** — `left:86px;top:232px;width:288px;
  background:#fff4d4;color:#2c2013;padding:11px 13px;box-shadow:5px 5px 0 rgba(0,0,0,.5);
  transform:rotate(-.8deg);font-family:'Caveat',cursive;font-size:18px;line-height:1.25`,
  with a pin dot (`left:13px;top:-6px;width:10px;height:10px;background:#d8863a;
  box-shadow:1px 1px 0 #120d07`) and a label line `newest · 4m ago · unanswered`
  (`font-family:'Josefin Sans',sans-serif;font-size:10px;letter-spacing:.18em;
  text-transform:uppercase;color:#b3651f;margin-bottom:4px`), body text:
  "Wait — you need to show me pictures. The foods they're best known for."
- **Two answered notes**, narrower strips, `width:270px;background:rgba(214,196,158,.13);
  border-left:3px solid #6b4d2a;padding:8px 11px;font-family:'Caveat',cursive;font-size:16px;
  line-height:1.25;color:#cbb491`:
  - `top:364px`: "Cut anything where the wait is over an hour." label `2h ago · answered`.
  - `top:454px`: "Oct 3–5, three of us, food-focused. Not a big fan of seafood. Money's not a
    problem. Don't book anything." label `day one · standing`.
  (Label span on both: `font-family:'Josefin Sans',sans-serif;font-size:10px;
  letter-spacing:.16em;text-transform:uppercase;color:#a89272;margin-top:4px;display:block`.)

None of the gatepost content differs between s2–s6 — same notes, same positions, on every board.

### The trail line

Position: `left:452px;top:112px;display:flex;align-items:baseline;gap:8px;
font-family:'Courier Prime',monospace;font-size:13px;white-space:nowrap`.

- Every segment before the last is **gold**, `color:#e0b56a` (pressable — it's how you back
  out one level at a time; `Esc` does the same, one level per press).
- The separator glyph is `›`, `color:#6b5a40` (stone/dim brown), one between each pair of
  segments.
- The **last** segment (current location) is `color:#f4e3c0` (sand/cream) — not gold, not
  pressable.

Trails per board:
- s2: `yard › nola.md`
- s3: `yard › changes › nola.md`
- s4: `yard › history › 3f2a91c`
- s5: `yard › shell 1`
- s6: `yard › new session`

### The right-aligned meta line

Position: `right:52px;top:112px;font-family:'Courier Prime',monospace;font-size:12px;
color:#a89272;white-space:nowrap` (same baseline as the trail).

- s2: `markdown · 64 lines · last written by claude 11m ago`
- s3: `why: cut anything over an hour's wait, and the seafood`
- s4: `commit · 3 files · pushed`
- s5: `zsh · running since 12:02 · survives closing the window`
- s6: `nothing has run yet`

### Divider under the trail

`left:452px;top:140px;width:936px;height:2px;background:#5e4326` — on every board.

### Content column

`left:452px;top:164px;width:936px;display:flex;flex-direction:column;gap:14px` (s2 base gap;
s3–s6 use the same 14px column gap with extra inline spacer `div`s / `margin-top` between
specific rows — noted per-board below).

### The input line (bottom)

Position: `left:40px;top:944px;display:flex;align-items:center;gap:10px`. Prompt text span:
`font-family:'Caveat',cursive;font-size:22px;color:#ab9470`. Caret: a solid block,
`width:2px;height:20px;background:#f4e3c0;animation:cv-blink 900ms steps(1,end) infinite`
(`cv-blink`: opaque 0–49%, `opacity:.25` 50–100%).

Exact prompt text per board:
- s2: `› say something about this file`
- s3: `› say something about these changes`
- s4: `› say something about this commit`
- s5: `› typing goes to the shell · esc to return to the line` (this **replaces** the normal
  "say something" prompt — while the shell is focused, the line is not a chat input)
- s6: `› add one photo per dish, from the restaurant's own site` (this is the actual line the
  person is typing — it doubles as both the branch-name source and the session's first
  message; see s6 below)

Below the input line, a bottom vignette: `left:0;right:0;bottom:0;height:160px;
background:linear-gradient(0deg,rgba(18,13,7,.92),rgba(18,13,7,0))`.

### The lantern rail (bottom edge, identical on every board s2–s6)

Horizontal rail bar: `left:40px;right:40px;top:1006px;height:3px;background:#3a2712`.

Six posts, each a `3px`-wide vertical stub down from the rail (`background:#3a2712`), a
lantern icon (`assets/p-lantern-on.png` or `p-lantern-off.png`, `22×38`), and two text lines
(name, `font-size:13–12px`, and status, `font-size:11px`, both `font-family:'Courier Prime',
monospace`, `text-shadow:1px 1px 0 #120d07`). The first (current) post's stub is taller
(`height:30px` vs `16px`) and has a warm radial glow behind it.

| post | stub x | lantern | name (x,y / color) | status (x,y / color) |
|---|---|---|---|---|
| nola-photos (current) | 50 (stub), lantern 40,1039 | on, no flicker, glow `rgba(255,168,60,.3)` | `74,1041` `#ffdca4` "nola-photos" | `74,1059` `#dcc8a0` "you are here · 20m 45s" |
| new-source | 282, lantern 272,1025 | on, flickering (`cv-flicker`), glow `rgba(255,168,60,.16)` | `306,1027` `#ff9a6a` "new-source" | `306,1045` `#a89272` "wants you · 4m" |
| grid-toolbar | 514, lantern 504,1025 | on, `brightness(.75)`, glow `rgba(255,168,60,.16)` | `538,1027` `#f4e3c0` "grid-toolbar" | `538,1045` `#a89272` "working · 17m" |
| csv-import | 746, lantern 736,1025 | off, `brightness(.75)`, no glow | `770,1027` `#a89272` "csv-import" | `770,1045` `#a89272` "being cut" |
| history-merge | 978, lantern 968,1025 | off, `brightness(.75)`, no glow | `1002,1027` `#a8c469` "history-merge" | `1002,1045` `#a89272` "merged · 2h" |
| auth-fix | 1210, lantern 1200,1025 | off, `brightness(.75)`, no glow | `1234,1027` `#e0735a` "auth-fix" | `1234,1045` `#a89272` "git refused" |

Note the tone system in use here: name/status colours map straight onto the s1 five-tone
palette (resting `#a89272`, working `#f4e3c0`, wants-you `#ff9a6a`, done `#a8c469`, broken
`#e0735a`), independent of the lantern on/off/flicker state.

---

## s1 — the rules sheet

Not a scrim-over-session board — a standalone panel, `width:1440px`, auto height,
`background:#1d1811`, world image behind at `background-size:1620px 1300px;
background-position:center 62%;filter:brightness(.14) saturate(.4)` (note: different
crop/brightness than s2–s6's `1134px`/`.12`). Inner padding `36px 48px 24px`, `font-family:
'Josefin Sans',sans-serif;color:#f4e3c0`.

Six rule rows, each `display:grid;grid-template-columns:300px 1fr;gap:32px;padding:22px 0;
border-top:2px solid #4a3520` (every row, including the first, has the top rule).

Left column of each row: a heading (`font-family:'Josefin Sans',sans-serif;font-size:15px;
letter-spacing:.14em;text-transform:uppercase;font-weight:600;color:#f4e3c0`) and a body
paragraph (`font-size:13px;line-height:1.5;color:#dcc8a0;max-width:420px`).

Right column: a row of labelled example states. Each example cell: a tiny caption
(`font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:#a89272`) over the
example itself (`font-family:'Courier Prime',monospace;font-size:13px;white-space:nowrap`
unless noted).

### Row 1 — "Pressable is gold"
Body: "Gold text is the only thing that can be pressed, and nothing else on the wood is
gold. No ▸ marks, no underlines, no boxes. Section labels moved to stone to give gold up."

4-column grid of states, all showing the line `push to origin`:
- **at rest**: `color:#e0b56a`.
- **hover · one step lighter**: `color:#f0cf8a`.
- **pressed · sinks 2px down-right**: `color:#b08f52;position:relative;left:2px;top:2px`.
- **busy · no longer pressable**: text becomes `pushing · 4s`, `color:#f4e3c0`.

### Row 2 — "Feedback lands on the line"
Body: "No toasts. The line you pressed rewrites itself with the result, holds for 3s, then
settles back. A failure keeps its reason on the line until you press it or do something else."

4-column grid:
- **worked**: `pushed · 6 commits`, `color:#a8c469`.
- **failed**: two stacked lines — `push refused` (`color:#e0735a`, `13px`) over
  `behind origin by 4 · pull first` (`color:#a89272`, `12px`), gap `3px`.
- **slow · over 1s, a counter appears**: `pushing · 12s`, `color:#f4e3c0`.
- **quick · under 300ms, nothing**: `push to origin`, `color:#e0b56a` (unchanged from rest —
  i.e. nothing visibly happens).

### Row 3 — "Irreversible: press twice"
Body: "The first press rewrites the line to say exactly what will be lost, still gold. It
reverts on its own after 4s. The second press does it."

3-column grid:
- **at rest**: `throw these changes away`, `color:#e0b56a`.
- **first press**: two stacked lines — `press again — 41 lines, gone for good`
  (`color:#e0b56a`, `13px`, still gold) over `reverts in 4s` (`color:#a89272`, `11px`), gap `3px`.
- **second press**: `thrown away · 41 lines`, `color:#a89272` (drops to the resting/dim tone —
  it is done, no longer actionable).

Timings: first press holds 4s before auto-reverting to "at rest" if not pressed again; a
successful action's feedback (row 2) holds 3s before settling back.

### Row 4 — "Five tones, and gold is not one"
Body: "Status colours are words as much as colours: every tone is always paired with the
word that says it. Wants-you and broken sit close in hue, so broken is pushed toward clay and
always names the failure."

5-column grid, each a swatch (`width:64px;height:24px;border:2px solid #482510`) + the word
(`font-family:'Courier Prime',monospace;font-size:13px`, same colour as the swatch) + a
descriptor (`font-size:12px;color:#a89272`):

| hex | word | descriptor |
|---|---|---|
| `#a89272` | resting | idle, merged, archived |
| `#f4e3c0` | working | running now |
| `#ff9a6a` | wants you | asked and stopped |
| `#a8c469` | done | pushed, published, passed |
| `#e0735a` | broken | refused, missing, failed |

Gold (`#e0b56a`) is explicitly **not** one of the five tones — it is reserved for
pressability only.

### Row 5 — "Agents are tinted"
Body: "One sprite, tinted by multiply from the palette so each agent keeps a colour for the
life of the session. Tint is identity, never status — status stays in position and light."

5-column grid, each: `assets/player-f.png` (`42×96`) with a colour layer
(`position:absolute;inset:0;background:<hex>;mix-blend-mode:multiply`, masked to the sprite's
own alpha via `-webkit-mask-image`/`mask-image` on the same PNG), then a name
(`font-family:'Courier Prime',monospace;font-size:12px;color:#dcc8a0`):

| tint hex | name | orientation |
|---|---|---|
| `#e0b56a` | claude | normal |
| `#9aa04a` | hours | flipped (`transform:scaleX(-1)`) |
| `#6f9a9a` | walking | normal |
| `#c07a4a` | photos | flipped |
| `#b0a890` | candidates | normal |

### Row 6 — "Backing out"
Body: "Esc steps back one level. The trail at the top of every sub-board names the way home
in gold — each step is pressable."

2-column grid, each showing a trail example (same styling rules as the shared trail line
above — gold segments pressable, `›` separator in `#6b5a40`, current segment `#f4e3c0`):
- **one level**: `yard › nola.md`
- **three levels**: `yard › history › 3f2a91c`

### Footer caption (outside the panel)
`font-size:14px;line-height:1.5;color:var(--c-stone-warm);max-width:1080px`: "Pressable,
feedback, irreversible, tones, agent tints and the trail. Every board below follows these."

---

## s2 — reading a file

Trail: `yard › nola.md`. Meta: `markdown · 64 lines · last written by claude 11m ago`.

Content column (`left:452,top:164,width:936`, gap `14px`), in reading order:

1. **Actions row**: `commit this`-style gold action list, all `font-family:'Courier Prime',
   monospace;font-size:13px`, gold `#e0b56a` actions separated by ` · ` in `#6b5a40`:
   `show changes · history · who wrote these lines · open in editor`.
2. Spacer, `height:6px`.
3. **Title**: `font-family:'Cormorant Garamond',serif;font-size:30px;line-height:1.4;
   color:#f4e3c0`: "Three days of food, New Orleans".
4. **Subtitle**: `font-family:'Courier Prime',monospace;font-size:14px;line-height:1.4;
   color:#a89272`: "Oct 3–5 · three people · no seafood-forward kitchens · nothing booked".
5. **Day header** "Saturday": `font-family:'Josefin Sans',sans-serif;font-size:11px;
   line-height:1.4;color:#a89272;letter-spacing:.24em;text-transform:uppercase;
   margin-top:10px`.
6. Three entries, each `font-family:'Cormorant Garamond',serif;font-size:17px;
   line-height:1.4;color:#dcc8a0`, venue name in `<b>`:
   - **Molly's Rise and Shine** — breakfast on Magazine St. Opens 8.
   - **Turkey and the Wolf** — lunch. The fried bologna is the reason to go.
   - **Zasu** — dinner in Mid-City. Book ahead; this is one of three.
7. **Day header** "Sunday" (same style, `margin-top:10px`).
8. Three entries (same prose style):
   - **Toups' Meatery** — lunch. Cracklins, lamb neck.
   - **Parkway Bakery** — the roast beef po'boy, dressed.
   - **Saint-Germain** — dinner, tasting menu. Book ahead.
9. **Day header** "Monday" (same style, `margin-top:10px`).
10. Two entries:
    - **Ayu Bakehouse** — breakfast, the Frenchmen St. location.
    - **Herbsaint** — last dinner. Book ahead.
11. **Elision line**: `font-family:'Courier Prime',monospace;font-size:13px;line-height:1.4;
    color:#a89272;margin-top:6px`: "▸ 38 more lines · sources and hours".

Input line: `› say something about this file`.

Gold/pressable text on this board: the four actions (`show changes`, `history`,
`who wrote these lines`, `open in editor`), plus the trail's `yard`.

Caption: "Markdown rendered on the wood. The actions for the file sit in gold directly under
the trail, and the tail of a long file collapses into a count."

---

## s3 — reading a change

Trail: `yard › changes › nola.md`. Meta: `why: cut anything over an hour's wait, and the
seafood`.

Content column, in reading order:

1. **Summary line** (`display:flex;align-items:baseline;gap:12px`, all
   `font-family:'Courier Prime',monospace;font-size:13px;white-space:pre`):
   `+41` (`color:#a8c469`, the "done" tone) `−12` (`color:#e0735a`, the "broken" tone)
   `in 3 places · not committed` (`color:#a89272`).
2. **Actions row**: gold `commit this` · `throw these changes away` · `open the file`
   (gold `#e0b56a`, separator ` · ` `#6b5a40`, `13px`).
3. Spacer, `height:4px`.
4. **Hunk label 1**: `font-family:'Courier Prime',monospace;font-size:11px;color:#a89272;
   white-space:pre`: "Saturday · lines 7–14" — hunks are grouped and labelled by **place in
   the file** (the day-section heading + its line range), not by a `@@ -a,b +c,d @@` diff
   hunk header.
5. **Hunk 1 lines** — each row `display:grid;grid-template-columns:44px 18px 1fr;gap:8px;
   padding:2px 8px;font-family:'Courier Prime',monospace;font-size:13px;line-height:1.5`.
   Column 1 (line number): `color:#8a7a5e;text-align:right`. Column 2 (gutter marker):
   ` ` / `−` / `+`. Column 3 (text): `white-space:pre-wrap`.

   | # | bg (row) | num | marker (colour) | text (colour) | text |
   |---|---|---|---|---|---|
   | 7 | transparent | 7 | ` ` `#a89272` | `#a89272` | `## Saturday` |
   | 8 (removed) | `rgba(224,115,90,.10)` | 8 | `−` `#e0735a` | `#dcc8a0` | `- Café du Monde — beignets, expect a queue` |
   | 8 (added) | `rgba(168,196,105,.10)` | 8 | `+` `#a8c469` | `#dcc8a0` | `- Molly's Rise and Shine — breakfast on Magazine St. Opens 8.` |
   | 9 | transparent | 9 | ` ` `#a89272` | `#a89272` | `- Turkey and the Wolf — lunch. The fried bologna is the reason to go.` |
   | 10 (removed) | `rgba(224,115,90,.10)` | 10 | `−` `#e0735a` | `#dcc8a0` | `- Commander's Palace — dinner, jacket required` |
   | 10 (added) | `rgba(168,196,105,.10)` | 10 | `+` `#a8c469` | `#dcc8a0` | `- Zasu — dinner in Mid-City. Book ahead; this is one of three.` |

   Note: removed and added lines that replace each other keep the **same line number** (both
   "8", both "10") — numbering is by position-in-context, not diff-side. Context lines have
   `background:transparent` and both the marker and the text in the dim `#a89272` tone; changed
   lines get a faint background tint (10% alpha of the done/broken tone) and the text itself
   stays the neutral `#dcc8a0` (only the marker glyph carries the added/removed colour).
6. **Hunk label 2** (`margin-top:6px`): "Sunday · lines 16–22".
7. **Hunk 2 lines**:

   | # | bg | num | marker | text |
   |---|---|---|---|---|
   | 16 | transparent | 16 | ` ` `#a89272` | `## Sunday` (`#a89272`) |
   | 17 (removed) | `rgba(224,115,90,.10)` | 17 | `−` `#e0735a` | `- Acme Oyster House — lunch` (`#dcc8a0`) |
   | 17 (added) | `rgba(168,196,105,.10)` | 17 | `+` `#a8c469` | `- Toups' Meatery — lunch. Cracklins, lamb neck.` (`#dcc8a0`) |
   | 18 (added) | `rgba(168,196,105,.10)` | 18 | `+` `#a8c469` | `- Parkway Bakery — the roast beef po'boy, dressed.` (`#dcc8a0`) |

8. **Elision line** (`margin-top:4px`): `font-size:12px;color:#a89272;white-space:pre`:
   "▸ 1 more place · 29 lines" (third hunk, the Monday section, is collapsed rather than shown).

Input line: `› say something about these changes`.

Gold/pressable text: `commit this`, `throw these changes away`, `open the file`, plus trail
segments `yard` and `changes`.

Caption: "Grouped by place in the file, not by hunk header. Additions and removals keep the
done and broken tones; line numbers and context stay in stone. The why comes from the commit
message it is heading for."

---

## s4 — reading a commit (file's own label; brief called it "writing a commit" — see note at top)

Trail: `yard › history › 3f2a91c`. Meta: `commit · 3 files · pushed`.

Content column, in reading order:

1. **Title**: `font-family:'Cormorant Garamond',serif;font-size:26px;line-height:1.4;
   color:#f4e3c0`: "Cut the places with a wait over an hour".
2. **Byline row**: `font-family:'Courier Prime',monospace;font-size:13px;white-space:pre`:
   `3f2a91c` (`color:#e0b56a`, gold) then `claude · 2h ago · on claude/nola-photos`
   (`color:#a89272`).
3. **Body**: `font-family:'Cormorant Garamond',serif;font-size:17px;line-height:1.4;
   color:#dcc8a0;max-width:760px`: "Café du Monde and Acme both run past an hour on a
   Saturday. Commander's Palace is jacket-only, which does not match the brief. Replaced each
   with somewhere open the same day within a fifteen-minute walk."
4. **"3 files moved"** label (`margin-top:6px`): `font-size:11px;color:#a89272`.
5. **File rows** (each `13px`, `white-space:pre`, path padded with trailing spaces to align
   the stat column): path in gold `#e0b56a`, stat in `#dcc8a0`:
   - `nola.md         ` → `+8  −11`
   - `candidates.json ` → `+0  −4`
   - `nola-plan.md    ` → `+2  −0`
   (Each file name is pressable — "each file pressable into its own change," per the
   caption — i.e. it opens that file's own s3-style change view.)
6. **"around it"** label (`margin-top:10px`): `font-size:11px;color:#a89272`.
7. **Adjacent commits** (three rows, `13px`, `white-space:pre`):
   - `a81c0de` (gold `#e0b56a`) — `before · add Monday` (`#a89272`)
   - `3f2a91c` (`color:#f4e3c0`, **not** gold — this is the commit currently open) —
     `this one` (`#a89272`)
   - `e02b77f` (gold `#e0b56a`) — `after · publish nola.html` (`#a89272`)

Input line: `› say something about this commit`.

Gold/pressable text: the three file names, the two neighbour-commit hashes (`a81c0de`,
`e02b77f`), and trail segments `yard`/`history`. The commit's own hash `3f2a91c` appears twice
— gold in the byline row (top, presumably pressable to copy/re-anchor) and plain sand
`#f4e3c0` in the neighbours list (marking "this one," not pressable there).

Caption: "What for, who, when, and the files it moved — each file pressable into its own
change. The two commits on either side are there to walk the history without leaving."

---

## s5 — the shell

Trail: `yard › shell 1` (single current segment, no intermediate "shell" node). Meta:
`zsh · running since 12:02 · survives closing the window`.

Content column:

1. **Shell tabs row**: `font-family:'Courier Prime',monospace;font-size:13px`: `shell 1`
   (`color:#f4e3c0`, current, not gold) ` · ` (`#6b5a40`) `shell 2` (gold `#e0b56a`,
   pressable — switches tab) ` · ` `new shell` (gold `#e0b56a`, pressable — opens another).
2. Spacer, `height:4px`.
3. **Terminal output**, one `div` per line, all `font-family:'Courier Prime',monospace;
   font-size:13px;line-height:1.55;white-space:pre`. Default text colour `#dcc8a0` unless a
   line is entirely secondary output, which uses `#a89272`; the prompt's path and branch
   segments and timestamps are individually spanned in `#a89272` even inside an otherwise
   `#dcc8a0` line; the one URL is spanned in gold `#e0b56a`. Line-by-line:
   1. `~/code/nola-photos` (`#a89272`) ` ` `(claude/nola-photos)` (`#a89272`) ` $ npm run dev`
   2. *(blank)*
   3. `  VITE v5.2.0  ready in 412 ms` — whole line `#a89272`
   4. *(blank)*
   5. `  ➜  Local:   http://localhost:5173/` — line `#dcc8a0`, URL span `#e0b56a`
   6. `  ➜  Network: use --host to expose` — whole line `#a89272`
   7. *(blank)*
   8. `3:14:02 pm` (`#a89272`) ` [vite] page reload nola.html` (`#dcc8a0`)
   9. `3:21:47 pm` (`#a89272`) ` [vite] hmr update /nola.css` (`#dcc8a0`)
   10. `3:40:11 pm` (`#a89272`) ` [vite] page reload nola.html` (`#dcc8a0`)
   11. *(blank)*
   12. `~/code/nola-photos` (`#a89272`) ` (claude/nola-photos)` (`#a89272`) ` $ git status --short`
   13. ` M` (`#a8c469`, the "done" tone repurposed as git's modified marker) ` nola.md` (`#dcc8a0`)
   14. `??` (`#a8c469`) ` photos/` (`#dcc8a0`)
   15. `~/code/nola-photos` (`#a89272`) ` (claude/nola-photos)` (`#a89272`) ` $ ` (`#dcc8a0`)
       followed by an inline blinking block caret: `display:inline-block;width:8px;height:15px;
       background:#f4e3c0;vertical-align:-2px;animation:cv-blink 900ms steps(1,end) infinite`.

Input line **text differs from every other board**: `› typing goes to the shell · esc to
return to the line` — this is not a chat prompt, it's a mode notice; the board's usual input
line is disabled/repurposed while the shell has focus (the real cursor lives at the end of
the terminal output, item 15 above, not on the bottom line).

Caption: "Sits in the same place as any other reading. It outlives the window, and several
can be open at once — named along the top in gold. While it is focused, typing goes to the
shell rather than the line."

Gold/pressable text: `shell 2`, `new shell`, trail's `yard`.

---

## s6 — starting a session

Trail: `yard › new session`. Meta: `nothing has run yet`.

Content column, in reading order:

1. **Section header**: `font-family:'Josefin Sans',sans-serif;font-size:11px;line-height:1.4;
   color:#a89272;letter-spacing:.24em;text-transform:uppercase`: "A new session, from what
   you are typing".
2. **branch row**: label `branch` (`font-size:12px;color:#a89272;white-space:pre`), value
   `claude/one-photo-per-dish` (`font-size:14px;color:#e0b56a`, gold), hint
   `from the line · press to rename` (`font-size:11px;color:#a89272`).
3. **agent row**: label `agent ` (trailing space, aligns with "branch"/"from "), value
   `claude · sonnet 4.5` (gold, `14px`), hint `default for slideshow` (`11px`, `#a89272`).
4. **from row**: label `from  ` (two trailing spaces), value `main @ e02b77f` (gold, `14px`),
   no hint.
5. **"workspace"** label (`margin-top:8px`): `font-size:11px;color:#a89272;white-space:pre`.
6. **Five workspace options**, column, `gap:6px`, each row `display:flex;align-items:baseline;
   gap:12px`, `font-family:'Courier Prime',monospace;font-size:13px` for the option name and
   `font-size:13px` plain (no monospace) for its description:
   - **`fresh worktree`** — **selected**, rendered as a filled pill/badge:
     `color:#482510;background:#e0b56a;border:2px solid #482510;padding:1px 8px`
     (dark ink on solid gold, framed) — description "a new checkout of main, nothing carried
     over" (`color:#dcc8a0`, brighter than the other four descriptions — the selected row's
     description is also lit up).
   - `work in the root` — unselected: plain gold text, `color:#e0b56a;padding:1px 10px` (no
     background/border) — description "no worktree — shares ~/code/nola with you"
     (`color:#a89272`, dim).
   - `reuse nola-photos` — unselected, same style — description "the worktree of the session
     you are in" (`#a89272`).
   - `check out a PR` — unselected — description "pick an open pull request" (`#a89272`).
   - `branch off a PR` — unselected — description "start from a pull request's head"
     (`#a89272`).

   So the **selection marker** is: filled gold badge with dark text and a `2px` dark border
   (vs. bare gold text for the rest), *and* the paired description brightens from `#a89272` to
   `#dcc8a0` only for the selected row. Padding also differs slightly: selected badge `1px
   8px`, unselected options `1px 10px`.
7. **"link"** label (`margin-top:8px`): `11px`, `#a89272`.
8. **link row**: `nothing linked` in gold `#e0b56a` (nested inside an outer `#a89272` span —
   i.e. structurally "linked-to: nothing linked", where the gold part is pressable to open the
   picker), hint `search issues and PRs` (`11px`, `#a89272`).
9. **"what will run"** label (`margin-top:8px`): `11px`, `#a89272`.
10. **Command list**, one `div` per line, `font-family:'Courier Prime',monospace;
    font-size:13px;line-height:1.55;color:#dcc8a0;white-space:pre`:
    1. `git fetch origin main`
    2. `git worktree add -b claude/one-photo-per-dish ../nola-one-photo-per-dish origin/main`
    3. `cp .env.local ../nola-one-photo-per-dish/` followed by right-padding spaces then an
       inline annotation `preserved file` in `color:#a89272`
    4. `npm install` followed by right-padding spaces then annotation `setup script`
       (`color:#a89272`)
11. **Footer hint** (`margin-top:6px`): `font-size:12px;color:#a89272;white-space:pre`:
    "return starts it · the line becomes its first message".

Input line: `› add one photo per dish, from the restaurant's own site` — this is the literal
line the person is typing; it is simultaneously the source of the branch name
(`claude/one-photo-per-dish`, item 2 above — the branch is a slugified form of it) and, per
the footer hint, becomes the session's first message once `return` is pressed.

Gold/pressable text: `claude/one-photo-per-dish` (rename), `claude · sonnet 4.5` (change
agent), `main @ e02b77f` (change base), the selected `fresh worktree` badge and all four other
workspace options (switch selection), `nothing linked` (open link picker), trail's `yard`.

Caption: "What you type on the line becomes the branch name as you type it. Everything that
will happen is named before return: branch, agent, base, the five ways to set up the
workspace, and the exact commands that will run."

---

## Cross-board notes

- **Grid alignment**: s2–s6 all use the same trail (`y=112`), divider (`y=140`), content
  start (`y=164`), input line (`y=944`), and rail (`y=1006` on) coordinates — only the
  content between `y=164` and the input line differs.
- **Diff colour vocabulary (s3)**: added = `#a8c469` (the "done" tone), removed = `#e0735a`
  (the "broken" tone), both also used as 10%-alpha row backgrounds (`rgba(168,196,105,.10)` /
  `rgba(224,115,90,.10)`); context stays entirely in the dim `#a89272`/stone family; line
  numbers are always the darkest, `#8a7a5e`, regardless of add/remove/context.
- **"Gold vs. sand" rule holds everywhere**: `#e0b56a` = pressable, `#f4e3c0` = current/fixed
  text, `#a89272` = secondary/stone, `#6b5a40` = separator/dim, `#dcc8a0` = readable prose
  body that is not itself an action.
