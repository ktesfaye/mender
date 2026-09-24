# Spec transcription — `#13a` ("The yard, with the roster along the bottom")

Source: `/Users/kirubel/Documents/dev/design_handoff_village_session/designs/Session View.dc.html`, lines 36–173.
This is Turn 13 in the deck: "9a with the lantern rail" — `#9a` copied unchanged, plus six
lanterns hung along the bottom under the input line.

All values below are copied verbatim from the inline `style` attributes. Nothing is rounded
or inferred unless explicitly marked `(derived)`.

---

## 0. Outer wrapper and label row (outside the visible frame)

```html
<div id="13a" style="display:flex;flex-direction:column;gap:12px;width:1440px">
```

This is a layout wrapper for the deck page, not part of the rendered screen. It contains:

1. **Label row** — `display:flex;align-items:baseline;gap:10px`
   - Badge `<span>`: `font-family:var(--font-display);font-size:12px;letter-spacing:.12em;background:var(--c-thatch-light);color:var(--c-outline);border:2px solid var(--c-outline);padding:4px 8px` — text `13A`
   - Title `<span>`: `font-family:var(--font-display);font-size:14px;letter-spacing:.06em;text-transform:uppercase;color:var(--c-sand)` — text `The yard, with the roster along the bottom`
2. **The frame itself** (section 1 below).

---

## 1. The frame

```html
<div style="position:relative;width:1440px;height:1124px;overflow:hidden;background:#1d1811;font-family:'Josefin Sans',sans-serif;color:#f4e3c0;border:2px solid var(--c-outline);box-shadow:6px 6px 0 rgba(72,37,16,.55)">
```

- `position: relative`
- `width: 1440px`
- `height: 1124px`
- `overflow: hidden`
- `background: #1d1811`
- `font-family: 'Josefin Sans', sans-serif` (frame default; overridden per-element where noted)
- `color: #f4e3c0` (frame default text color; overridden per-element where noted)
- `border: 2px solid var(--c-outline)`
- `box-shadow: 6px 6px 0 rgba(72,37,16,.55)`
- No inner padding; all children are `position:absolute` against this frame, or `position:absolute;inset:0` full-bleed layers.
- Ambient page background (outside the frame): `html,body{margin:0;padding:0;background:#325862;}`. The deck section wrapping this frame has `padding:48px` and `border-bottom:2px solid var(--c-outline)`.
- Global stylesheet rules in effect inside the frame:
  - `img{image-rendering:pixelated;}`
  - `@keyframes cv-blink{0%,49%{opacity:1}50%,100%{opacity:.25}}`
  - `@keyframes cv-step{0%{transform:translateY(0)}50%{transform:translateY(-2px)}100%{transform:translateY(0)}}`
  - `@keyframes cv-flicker{0%,100%{opacity:.88}50%{opacity:1}}`

---

## 2. World layer

### 2.1 Background image layer

```html
<div style="position:absolute;inset:0;background-image:url(assets/crop-market.png);background-size:1580px 990px;background-position:center 58%;image-rendering:pixelated;filter:brightness(.2) saturate(.5)"></div>
```

- `position: absolute; inset: 0` (fills the 1440×1124 frame)
- `background-image: url(assets/crop-market.png)`
- `background-size: 1580px 990px`
- `background-position: center 58%`
- `image-rendering: pixelated`
- `filter: brightness(.2) saturate(.5)`

### 2.2 Bottom scrim gradient (over the world image, under the content)

```html
<div style="position:absolute;left:0;right:0;bottom:0;height:260px;background:linear-gradient(180deg,rgba(0,0,0,0),rgba(18,13,7,.55))"></div>
```

- `position: absolute; left:0; right:0; bottom:0`
- `height: 260px`
- `background: linear-gradient(180deg, rgba(0,0,0,0), rgba(18,13,7,.55))` — transparent at top, dark brown-black (`rgba(18,13,7,.55)`) at bottom.

(Note: there is a second, stronger bottom scrim further down, at the very bottom of the frame — see §6.2 "Input line" — height 160px, `linear-gradient(0deg, rgba(18,13,7,.92), rgba(18,13,7,0))`, i.e. opaque at the true bottom edge fading up.)

---

## 3. Header (top band, y ≈ 22–92px)

Reading order, left to right:

1. **Title** — `<span>`
   - Position: `left:40px; top:22px`
   - `font-size:22px`
   - `letter-spacing:.24em`
   - `text-transform:uppercase`
   - `font-weight:600`
   - `text-shadow:2px 2px 0 #120d07`
   - `white-space:nowrap`
   - Color: inherited frame color `#f4e3c0`
   - Font: inherited frame font `'Josefin Sans', sans-serif`
   - Text: `New Orleans`

2. **Subtitle / meta line** — `<span>`
   - Position: `left:42px; top:56px`
   - `font-family:'Courier Prime', monospace`
   - `font-size:12px`
   - `color:#bfa476`
   - `white-space:nowrap`
   - Text: `slideshow/nola · claude · 64h 15m · 51 turns · 3 agents spawned`

3. **Bypass-permissions flag** — `<span>`
   - Position: `right:40px; top:26px`
   - `font-size:11px`
   - `letter-spacing:.18em`
   - `text-transform:uppercase`
   - `color:#ff9a6a`
   - `white-space:nowrap`
   - Text: `bypass permissions on`

4. **Context/model line** — `<span>`
   - Position: `right:40px; top:50px`
   - `font-family:'Courier Prime', monospace`
   - `font-size:12px`
   - `color:#bfa476`
   - `white-space:nowrap`
   - Text: `context 68% · sonnet 4.5`

5. **Header divider rule**
   - `<div>` — `position:absolute; left:40px; right:40px; top:92px; height:1px; background:rgba(244,227,192,.18)`
   - Full-width rule (1440 − 40 − 40 = 1360px effective width, derived from left/right insets), 1px thick, translucent sand (`rgba(244,227,192,.18)`).

---

## 4. Left column — "what you asked" (x anchor 40px)

### 4.1 Section label
`<span>` — `position:absolute; left:40px; top:112px; font-size:11px; letter-spacing:.24em; text-transform:uppercase; color:#e0b56a; text-shadow:1px 1px 0 #120d07; white-space:nowrap`
Text: `what you asked`

### 4.2 Vertical accent bar
`<div>` — `position:absolute; left:40px; top:140px; width:12px; height:396px; background:linear-gradient(90deg,#54391e,#3a2712)`
A 12px-wide, 396px-tall vertical bar with a horizontal gradient from `#54391e` (left) to `#3a2712` (right), positioned like a spine/binding to the left of the note card.

### 4.3 Sticky-note card (newest, unanswered)
Container `<div>`:
- `position:absolute; left:62px; top:142px; width:300px`
- `background:#fff4d4`
- `color:#2c2013`
- `padding:12px 14px`
- `box-shadow:5px 5px 0 rgba(0,0,0,.5)`
- `transform:rotate(-.7deg)`
- `font-family:'Caveat', cursive`
- `font-size:19px`
- `line-height:1.25`
- (width is explicit 300px; height auto-sized to content)

Children:
- **Pin/tack** `<span>` — `position:absolute; left:14px; top:-6px; width:10px; height:10px; background:#d8863a; box-shadow:1px 1px 0 #120d07` (a small square "pin" sitting above the note's top-left corner, offset relative to the note, not the frame)
- **Meta label** `<span>` (block) — `display:block; font-family:'Josefin Sans', sans-serif; font-size:10px; letter-spacing:.18em; text-transform:uppercase; color:#b3651f; margin-bottom:5px`
  Text: `newest · 4m ago · unanswered`
- **Body text** (plain text node inside the card, inherits card's `Caveat` 19px/1.25/`#2c2013`):
  `Wait — you need to show me pictures. The foods they're best known for.`

### 4.4 Older-notes list
Container `<div>` — `position:absolute; left:62px; top:262px; width:300px; display:flex; flex-direction:column; gap:14px`

Row 1 — `<div style="display:flex;flex-direction:column;gap:3px">`
- Meta `<span>` — `font-size:10px; letter-spacing:.18em; text-transform:uppercase; color:#9c8a68` — text: `2h ago · answered`
- Body `<span>` — `font-family:'Caveat', cursive; font-size:17px; line-height:1.25; color:#cbb491` — text: `Cut anything where the wait is over an hour. We're not standing in line.`

Row 2 — `<div style="display:flex;flex-direction:column;gap:3px">`
- Meta `<span>` — same style as above — text: `day one · standing`
- Body `<span>` — same style as above (`Caveat`, 17px, 1.25, `#cbb491`) — text: `Oct 3–5, three of us, food-focused. Not a big fan of seafood. Money's not a problem. Don't book anything — I'll do that myself.`

Trailing note — `<span>` — `font-size:10px; letter-spacing:.18em; text-transform:uppercase; color:#a89272` — text: `nine older notes further down the post`

### 4.5 Divider under the "what you asked" column
`<div>` — `position:absolute; left:40px; top:568px; width:340px; height:1px; background:rgba(244,227,192,.14)`

### 4.6 "elsewhere in slideshow" block
Section label `<span>` — `position:absolute; left:40px; top:588px; font-size:11px; letter-spacing:.24em; text-transform:uppercase; color:#e0b56a; text-shadow:1px 1px 0 #120d07; white-space:nowrap`
Text: `elsewhere in slideshow`

List container `<div>` — `position:absolute; left:40px; top:618px; width:360px; display:flex; flex-direction:column; gap:9px; font-size:14px`

Row 1 — `<div style="display:flex;align-items:center;gap:10px;white-space:nowrap">`
- Dot `<span>` — `width:8px; height:8px; background:#ff8a4a` (solid square dot, no border-radius specified)
- Text `<span>` — `color:#ff9a6a` — text: `new source · waiting on your answer`

Row 2 — same row style
- Dot `<span>` — `width:8px; height:8px; background:#e0b56a`
- Text `<span>` — `color:#dcc8a0` — text: `grid view toolbar · working · 17m`

Row 3 — same row style
- Dot `<span>` — `width:8px; height:8px; background:#8a9c85`
- Text `<span>` — `color:#bfa476` — text: `history merged · csv import setting up`

---

## 5. Middle column — "what it is thinking" (x anchor 444px)

### 5.1 Column divider (left edge of middle column)
`<div>` — `position:absolute; left:412px; top:104px; width:1px; height:790px; background:rgba(244,227,192,.14)`

### 5.2 Section label
`<span>` — `position:absolute; left:444px; top:112px; font-size:11px; letter-spacing:.24em; text-transform:uppercase; color:#e0b56a; text-shadow:1px 1px 0 #120d07; white-space:nowrap`
Text: `what it is thinking`

### 5.3 Thought stream container
`<div>` — `position:absolute; left:444px; top:142px; width:504px; display:flex; flex-direction:column; gap:20px; font-family:'Cormorant Garamond', serif`

Five entries, each `<div style="display:flex;flex-direction:column;gap:5px">` unless noted:

1. **"the plan it posted"**
   - Meta `<span>` — `font-family:'Josefin Sans', sans-serif; font-size:10px; letter-spacing:.18em; text-transform:uppercase; color:#9c8a68` — text: `the plan it posted · 64h ago`
   - Body `<span>` — `font-size:15px; line-height:1.4; color:rgba(244,227,192,.46)` — text: `Pull twenty-odd candidates out of the local press, verify Sat/Sun/Mon service on each one, cut anything seafood-forward, cluster what survives by neighbourhood, then hand you one page per day. No bookings.`

2. **Notes-count marker** (not wrapped in the gap:5px div — a direct sibling)
   - `<span>` — `font-family:'Courier Prime', monospace; font-size:12px; color:#8a7452` — text: `▸ 38 notes between then and now`

3. **"yesterday, 6pm"**
   - Meta `<span>` — same meta style as #1 — text: `yesterday, 6pm`
   - Body `<span>` — `font-size:15px; line-height:1.4; color:rgba(244,227,192,.55)` — text: `Three of the twenty-one have closed for good — the food press is a year behind. Every place goes in the file only after I've read it off the restaurant's own site.`

4. **"6h ago"**
   - Meta `<span>` — same meta style — text: `6h ago`
   - Body `<span>` — `font-size:16px; line-height:1.4; color:rgba(244,227,192,.62)` — text: `You said no seafood, and this city's whole canon is seafood. So I'm keeping the kitchens good enough that the one thing on the menu without a shell is still the reason to go.`

5. **"22m ago"**
   - Meta `<span>` — same meta style — text: `22m ago`
   - Body `<span>` — `font-size:16px; line-height:1.4; color:rgba(244,227,192,.62)` — text: `Saturday, Sunday and Monday are the worst three nights for closures — half this job turned out to be knowing what is actually open.`

6. **"now" (current/live thought, visually emphasized)**
   - Meta `<span>` — `font-family:'Josefin Sans', sans-serif; font-size:10px; letter-spacing:.18em; text-transform:uppercase; color:#ffc98a` (brighter than the other meta lines' `#9c8a68`) — text: `now · 20m 45s at this`
   - Body `<span>` — `font-size:21px; line-height:1.35; color:#ffdca4; text-shadow:0 2px 10px rgba(0,0,0,.9)` — text: `"Boudin boy" means nothing if you've never seen one. Pulling each dish photo off the restaurant's own site rather than stock, which is slower but at least it's the food they actually serve.` (quote marks in source are curly `“` `”`)

---

## 6. Right column — "what it made" / "what it did" / "the yard" (x anchor 1020px)

### 6.1 Column divider (left edge of right column)
`<div>` — `position:absolute; left:988px; top:104px; width:1px; height:790px; background:rgba(244,227,192,.14)`

### 6.2 "what it made"

Section label `<span>` — `position:absolute; left:1020px; top:112px; font-size:11px; letter-spacing:.24em; text-transform:uppercase; color:#e0b56a; text-shadow:1px 1px 0 #120d07; white-space:nowrap`
Text: `what it made`

**Sprite: billboard image**
```html
<img src="assets/p-billboard.png" width="128" height="104" style="position:absolute;left:1020px;top:138px;filter:brightness(1.35)" alt="">
```
- Asset: `assets/p-billboard.png`
- Position: `left:1020px; top:138px`
- Rendered size: `128 × 104`
- Filter: `brightness(1.35)`

**Text block beside billboard**
`<div>` — `position:absolute; left:1168px; top:146px; width:232px; display:flex; flex-direction:column; gap:4px`
- `<span>` — `font-family:'Caveat', cursive; font-size:22px; color:#f4e3c0; text-shadow:1px 2px 0 #120d07` — text: `nola.html`
- `<span>` — `font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:#a8c469` — text: `published 11m ago`
- `<span>` — `font-size:13px; color:#ff9a6a; margin-top:4px` — text: `three need booking · no photos yet`

**Itinerary lines**
`<div>` — `position:absolute; left:1020px; top:262px; width:380px; display:flex; flex-direction:column; gap:6px`
- `<span>` — `font-size:14px; line-height:1.45; color:#dcc8a0` — text: `Sat · Molly's Rise and Shine, Turkey and the Wolf, Zasu`
- `<span>` — same style — text: `Sun · Toups' Meatery, Parkway, Saint-Germain`
- `<span>` — same style — text: `Mon · Ayu Bakehouse, Herbsaint`

**Divider**
`<div>` — `position:absolute; left:1020px; top:372px; width:380px; height:1px; background:rgba(244,227,192,.14)`

### 6.3 "what it did"

Section label `<span>` — `position:absolute; left:1020px; top:392px; font-size:11px; letter-spacing:.24em; text-transform:uppercase; color:#e0b56a; text-shadow:1px 1px 0 #120d07; white-space:nowrap`
Text: `what it did`

Container `<div>` — `position:absolute; left:1020px; top:422px; width:380px; display:flex; flex-direction:column; gap:10px; font-size:14px; line-height:1.3`

1. Notes-count marker `<span>` — `font-family:'Courier Prime', monospace; font-size:12px; color:#8a7452` — text: `▸ 44 earlier steps · first 62 hours`

2. Row — `<div style="display:flex;align-items:center;gap:10px;white-space:nowrap">`
   - Icon slot `<span style="width:44px;display:flex;justify-content:center;flex:none">` containing `<img src="assets/p-sign.png" width="30" height="41" alt="">`
   - Text `<span>` (inherits row's 14px/1.3, color inherited `#f4e3c0`): `read the <b>homework</b> skill · 3 questions` (the word "homework" is `<b>`-bolded)

3. Row — same wrapper style
   - Icon: `<img src="assets/p-roadsign.png" width="27" height="32" alt="">` in the same 44px centered slot
   - Text: `searched <b>21 places</b>, kept 15 · 3m 40s`

4. Row — same wrapper style
   - Icon: `<img src="assets/p-crate.png" width="32" height="46" alt="">`
   - Text: `wrote <b>candidates.json</b> · 15 entries`

5. Row — same wrapper style
   - Icon: `<img src="assets/prop-anvil.png" width="40" height="25" alt="">`
   - Text: `changed <b>nola.md</b> twice · ` then `<span style="color:#a8c469">+41</span>` then a space then `<span style="color:#d98a5a">−12</span>`

6. Row — same wrapper style (live/animated status row)
   - Icon slot contains, instead of an `<img>`, a pulsing dot: `<span style="width:11px;height:11px;border-radius:50%;background:#ff8a4a;box-shadow:0 0 0 5px rgba(255,138,74,.22);animation:cv-blink 700ms steps(1,end) infinite"></span>`
     - Dot: 11×11px circle, `background:#ff8a4a`, halo `box-shadow:0 0 0 5px rgba(255,138,74,.22)`, blinking via `cv-blink` 700ms step animation.
   - Text `<span style="color:#ffc98a">`: `running ` then `<span style="font-family:'Courier Prime', monospace; font-size:13px">curl -sI</span>` then ` on 6 pages`

---

## 7. The yard patch

### 7.1 Divider above "the yard" label
`<div>` — `position:absolute; left:1020px; top:684px; width:380px; height:1px; background:rgba(244,227,192,.14)`

### 7.2 "the yard" header row
`<div>` — `position:absolute; left:1020px; top:698px; width:380px; display:flex; align-items:baseline; justify-content:space-between; white-space:nowrap`
- Left `<span>` — `font-size:11px; letter-spacing:.24em; text-transform:uppercase; color:#e0b56a; text-shadow:1px 1px 0 #120d07` — text: `the yard`
- Right `<span>` — `font-family:'Courier Prime', monospace; font-size:11px; color:#bfa476` — text: `3 hands · 2 back · 1 out`

### 7.3 Yard box
Outer positioning wrapper: `<div style="position:absolute;left:1020px;top:720px">` containing the yard box:

```html
<div style="position:relative;width:380px;height:214px;overflow:hidden;background:#181410;border:2px solid #3a2712">
```
- `position: relative` (local coordinate origin for everything inside; effective frame position is `left:1020px; top:720px` from the outer wrapper)
- `width: 380px; height: 214px`
- `overflow: hidden`
- `background: #181410`
- `border: 2px solid #3a2712`

All coordinates in §7.3.1–7.3.7 below are relative to this yard box's own `1020,720` origin.

#### 7.3.1 Yard background image
`<div>` — `position:absolute; inset:0; background-image:url(assets/crop-square.png); background-size:608px 342px; background-position:center; image-rendering:pixelated; filter:brightness(.26) saturate(.5)`

#### 7.3.2 Fire glow (radial gradient)
`<div>` — `position:absolute; left:20px; top:13px; width:340px; height:240px; background:radial-gradient(ellipse at 50% 50%, rgba(255,168,60,.34), rgba(0,0,0,0) 62%)`
- Ellipse radial gradient, centered in its own 340×240 box, from `rgba(255,168,60,.34)` at center fading to fully transparent by 62% radius.

#### 7.3.3 Campfire sprite
```html
<img src="assets/p-campfire.png" width="46" height="32" style="position:absolute;left:167px;top:117px;animation:cv-flicker 480ms steps(2,end) infinite alternate" alt="">
```
- Asset: `assets/p-campfire.png`
- Position: `left:167px; top:117px` (within yard box)
- Size: `46 × 32`
- Animation: `cv-flicker 480ms steps(2,end) infinite alternate` (opacity flicker between `.88` and `1`)
- No filter/tint.

#### 7.3.4 Agent figure — "out" (top-right, walking, blinking marker) — corresponds to "photos" task
Wrapper `<div>` — `position:absolute; left:342px; top:30px; width:21px; height:48px`
- Sprite `<img src="assets/player-b.png" width="21" height="48" style="position:absolute;left:0;top:0;filter:brightness(.5) saturate(.6);animation:cv-step 800ms steps(2,end) infinite" alt="">`
  - Asset: `assets/player-b.png` (back-facing sprite)
  - Filter: `brightness(.5) saturate(.6)` (dimmed/desaturated — reads as "away"/out)
  - Animation: `cv-step 800ms steps(2,end) infinite` (bobbing walk cycle)
- Blink marker `<span>` — `position:absolute; left:-6px; top:-8px; width:8px; height:8px; border-radius:50%; background:#ff8a4a; animation:cv-blink 700ms steps(1,end) infinite` — an 8×8 circular orange dot offset above-left of the figure, blinking (same `cv-blink` animation as §6.3 row 6's live-status dot).

Label beside it: `<span>` — `position:absolute; left:274px; top:82px; font-family:'Courier Prime', monospace; font-size:11px; color:#ffc98a; text-shadow:1px 1px 0 #120d07; white-space:nowrap` — text: `photos · out 3m`

A lit lantern is placed near this figure:
```html
<img src="assets/p-lantern-on.png" width="11" height="19" style="position:absolute;left:366px;top:59px" alt="">
```
- Asset: `assets/p-lantern-on.png`, size `11 × 19`, position `left:366px; top:59px`, no filter (full brightness/lit).

#### 7.3.5 Agent figure — mirrored ("f" facing), leftmost of the three standing figures
Wrapper `<div>` — `position:absolute; left:140px; top:70px; width:21px; height:48px`
- Sprite `<img src="assets/player-f.png" width="21" height="48" style="position:absolute;left:0;top:0;filter:brightness(.95);transform:scaleX(-1)" alt="">`
  - Filter: `brightness(.95)`
  - Transform: `scaleX(-1)` (horizontally mirrored — facing left)

#### 7.3.6 Agent figure — center standing figure (claude, "you are here")
Wrapper `<div>` — `position:absolute; left:222px; top:72px; width:21px; height:48px`
- Sprite `<img src="assets/player-f.png" width="21" height="48" style="position:absolute;left:0;top:0;filter:brightness(.95)" alt="">`
  - Filter: `brightness(.95)`, no transform (facing forward/right, un-mirrored).

#### 7.3.7 Agent figure — third standing figure
Wrapper `<div>` — `position:absolute; left:180px; top:102px; width:21px; height:48px`
- Sprite `<img src="assets/player-f.png" width="21" height="48" style="position:absolute;left:0;top:0;filter:brightness(.95)" alt="">`
  - Same as §7.3.6: `filter:brightness(.95)`, no transform.

Label under the standing cluster: `<span>` — `position:absolute; left:150px; top:154px; font-family:'Courier Prime', monospace; font-size:11px; color:#dcc8a0; text-shadow:1px 1px 0 #120d07; white-space:nowrap` — text: `claude · 20m 45s`

**Summary of yard figures** (all sprites are 21×48 unless noted):
| Figure | Position (in yard box) | Asset | Filter | Transform | Animation |
|---|---|---|---|---|---|
| Out/walking (top-right) | left:342px top:30px | player-b.png | brightness(.5) saturate(.6) | — | cv-step 800ms steps(2,end) infinite |
| Mirrored standing (left) | left:140px top:70px | player-f.png | brightness(.95) | scaleX(-1) | — |
| Center standing ("claude") | left:222px top:72px | player-f.png | brightness(.95) | — | — |
| Third standing | left:180px top:102px | player-f.png | brightness(.95) | — | — |
| Campfire | left:167px top:117px | p-campfire.png (46×32) | none | — | cv-flicker 480ms steps(2,end) infinite alternate |
| Lantern near "out" figure | left:366px top:59px | p-lantern-on.png (11×19) | none | — | — |

---

## 8. Input line (bottom band, above the lantern rail)

### 8.1 Divider above the input line
`<div>` — `position:absolute; left:40px; right:40px; bottom:186px; height:1px; background:rgba(244,227,192,.18)`

### 8.2 Input prompt row
`<div>` — `position:absolute; left:40px; right:40px; bottom:146px; display:flex; align-items:center; justify-content:space-between`
- `<span style="display:flex;align-items:center;gap:10px">` containing:
  - Prompt text `<span>` — `font-family:'Caveat', cursive; font-size:22px; color:#ab9470` — text: `› say the next thing`
  - Blinking caret `<span>` — `width:2px; height:20px; background:#f4e3c0; animation:cv-blink 900ms steps(1,end) infinite`

### 8.3 Bottom-edge scrim (stronger than §2.2)
`<div>` — `position:absolute; left:0; right:0; bottom:0; height:160px; background:linear-gradient(0deg, rgba(18,13,7,.92), rgba(18,13,7,0))`
- `linear-gradient(0deg, …)`: first stop (`rgba(18,13,7,.92)`, near-opaque dark brown) is at the **bottom** edge (0deg goes bottom→top), second stop (fully transparent) at the top of this 160px band — i.e. darkest right at the frame's bottom edge, fading upward.

---

## 9. Lantern rail (bottom, y ≈ 1006–1069px)

### 9.1 The beam
`<div>` — `position:absolute; left:40px; right:40px; top:1006px; height:3px; background:#3a2712`
- A horizontal beam, 3px thick, full width (inset 40px each side), solid `#3a2712`, running along y=1006px.

### 9.2 Per-lantern structure

Each lantern (except the current session, "nola-photos") is built from up to four pieces:
1. A short vertical **cord/hanger** `<div>` dropping from the beam: `width:3px; background:#3a2712`, positioned at some `top` (1009px for most) with a `height`.
2. Optionally a **glow** `<div>` behind the lantern: a radial gradient box.
3. The **lantern sprite** `<img>` (`p-lantern-on.png` or `p-lantern-off.png`), `22 × 38`.
4. A **name label** and a **status label**, both `<span>`, `font-family:'Courier Prime', monospace`, `text-shadow:1px 1px 0 #120d07`, `white-space:nowrap`.

The current session ("nola-photos") differs from the rest:
- It hangs **lowest**: its cord is taller (30px vs 16px for the others) and its lantern sits lower (`top:1039px` vs `top:1025px` for the others), and its cord starts higher up (`top:1009px`, same start point, so the extra length pushes the lantern down).
- Its cord (`left:50px`) is offset from the others' cord/lantern-left pattern: for the current session the cord is at `left:50px` (not aligned with the lantern's own left edge at `left:40px`); for the other five lanterns the cord's `left` sits 10px right of the lantern's `left` (e.g. lantern at `left:272px`, cord at `left:282px`).
- It has a **much stronger, larger glow**: `left:6px;top:1015px;width:90px;height:90px;background:radial-gradient(circle at 50% 50%,rgba(255,168,60,0.3),rgba(0,0,0,0) 62%)` (alpha `.3`) vs. the "new-source" lantern's glow of alpha `.16` (the only other lantern with a glow at all); the remaining four lanterns have no glow div at all.
- It is not driven by `p-lantern-on.png`'s default styling — no filter and no animation — i.e. steady, full brightness (brightest of the six, per the deck caption "yours hangs lowest and brightest" from the 12a description, though 13a's own copy is "yours hangs lowest and the one that wants you flickers").
- Its labels use warmer/brighter colors (`#ffdca4` name, `#dcc8a0` status) than the resting/off lanterns.
- Only one other lantern animates: "new-source" uses `animation:cv-flicker 480ms steps(2,end) infinite alternate` (the "wants you" flicker).

### 9.3 Lantern-by-lantern transcription (left to right)

**1. Current session — "nola-photos" (you are here)**
- Cord: `<div style="position:absolute;left:50px;top:1009px;width:3px;height:30px;background:#3a2712"></div>`
- Glow: `<div style="position:absolute;left:6px;top:1015px;width:90px;height:90px;background:radial-gradient(circle at 50% 50%,rgba(255,168,60,0.3),rgba(0,0,0,0) 62%)"></div>`
- Lantern: `<img src="assets/p-lantern-on.png" width="22" height="38" style="position:absolute;left:40px;top:1039px;" alt="">` — no filter, no animation.
- Name label: `<span style="position:absolute;left:74px;top:1041px;font-family:'Courier Prime',monospace;font-size:13px;color:#ffdca4;text-shadow:1px 1px 0 #120d07;white-space:nowrap">nola-photos</span>` (note: font-size 13px, one point larger than the other lanterns' 12px name labels)
- Status label: `<span style="position:absolute;left:74px;top:1059px;font-family:'Courier Prime',monospace;font-size:11px;color:#dcc8a0;text-shadow:1px 1px 0 #120d07;white-space:nowrap">you are here · 20m 45s</span>`

**2. "new-source" (wants you, flickering)**
- Cord: `<div style="position:absolute;left:282px;top:1009px;width:3px;height:16px;background:#3a2712"></div>`
- Glow: `<div style="position:absolute;left:238px;top:1001px;width:90px;height:90px;background:radial-gradient(circle at 50% 50%,rgba(255,168,60,0.16),rgba(0,0,0,0) 62%)"></div>`
- Lantern: `<img src="assets/p-lantern-on.png" width="22" height="38" style="position:absolute;left:272px;top:1025px;animation:cv-flicker 480ms steps(2,end) infinite alternate" alt="">` — no filter; flicker animation.
- Name label: `<span style="position:absolute;left:306px;top:1027px;font-family:'Courier Prime',monospace;font-size:12px;color:#ff9a6a;text-shadow:1px 1px 0 #120d07;white-space:nowrap">new-source</span>`
- Status label: `<span style="position:absolute;left:306px;top:1045px;font-family:'Courier Prime',monospace;font-size:11px;color:#a89272;text-shadow:1px 1px 0 #120d07;white-space:nowrap">wants you · 4m</span>`

**3. "grid-toolbar" (working)**
- Cord: `<div style="position:absolute;left:514px;top:1009px;width:3px;height:16px;background:#3a2712"></div>`
- Glow: `<div style="position:absolute;left:470px;top:1001px;width:90px;height:90px;background:radial-gradient(circle at 50% 50%,rgba(255,168,60,0.16),rgba(0,0,0,0) 62%)"></div>`

  (Note: this glow div is present here too — see caveat below.)
- Lantern: `<img src="assets/p-lantern-on.png" width="22" height="38" style="position:absolute;left:504px;top:1025px;filter:brightness(.75)" alt="">` — dimmed (`brightness(.75)`), lit sprite, no animation.
- Name label: `<span style="position:absolute;left:538px;top:1027px;font-family:'Courier Prime',monospace;font-size:12px;color:#e8d3a6;text-shadow:1px 1px 0 #120d07;white-space:nowrap">grid-toolbar</span>`
- Status label: `<span style="position:absolute;left:538px;top:1045px;font-family:'Courier Prime',monospace;font-size:11px;color:#a89272;text-shadow:1px 1px 0 #120d07;white-space:nowrap">working · 17m</span>`

**4. "csv-import" (worktree being cut)**
- Cord: `<div style="position:absolute;left:746px;top:1009px;width:3px;height:16px;background:#3a2712"></div>`
- No glow div for this lantern.
- Lantern: `<img src="assets/p-lantern-off.png" width="22" height="38" style="position:absolute;left:736px;top:1025px;filter:brightness(.75)" alt="">` — off/unlit sprite, dimmed further with `brightness(.75)`.
- Name label: `<span style="position:absolute;left:770px;top:1027px;font-family:'Courier Prime',monospace;font-size:12px;color:#bfa476;text-shadow:1px 1px 0 #120d07;white-space:nowrap">csv-import</span>`
- Status label: `<span style="position:absolute;left:770px;top:1045px;font-family:'Courier Prime',monospace;font-size:11px;color:#a89272;text-shadow:1px 1px 0 #120d07;white-space:nowrap">worktree being cut</span>`

**5. "history-merge" (merged)**
- Cord: `<div style="position:absolute;left:978px;top:1009px;width:3px;height:16px;background:#3a2712"></div>`
- No glow div.
- Lantern: `<img src="assets/p-lantern-off.png" width="22" height="38" style="position:absolute;left:968px;top:1025px;filter:brightness(.75)" alt="">`
- Name label: `<span style="position:absolute;left:1002px;top:1027px;font-family:'Courier Prime',monospace;font-size:12px;color:#a8c469;text-shadow:1px 1px 0 #120d07;white-space:nowrap">history-merge</span>`
- Status label: `<span style="position:absolute;left:1002px;top:1045px;font-family:'Courier Prime',monospace;font-size:11px;color:#a89272;text-shadow:1px 1px 0 #120d07;white-space:nowrap">merged · 2h</span>`

**6. "auth-fix" (git refused / broken)**
- Cord: `<div style="position:absolute;left:1210px;top:1009px;width:3px;height:16px;background:#3a2712"></div>`
- No glow div.
- Lantern: `<img src="assets/p-lantern-off.png" width="22" height="38" style="position:absolute;left:1200px;top:1025px;filter:brightness(.75)" alt="">`
- Name label: `<span style="position:absolute;left:1234px;top:1027px;font-family:'Courier Prime',monospace;font-size:12px;color:#d98a5a;text-shadow:1px 1px 0 #120d07;white-space:nowrap">auth-fix</span>`
- Status label: `<span style="position:absolute;left:1234px;top:1045px;font-family:'Courier Prime',monospace;font-size:11px;color:#a89272;text-shadow:1px 1px 0 #120d07;white-space:nowrap">git refused</span>`

### 9.4 Lantern rail — geometry table

| # | Session | Cord left | Cord top | Cord height | Glow (left,top,w,h,alpha) | Lantern src | Lantern left | Lantern top | Lantern filter | Lantern animation | Name color | Name font-size | Status color |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | nola-photos (current) | 50 | 1009 | 30 | 6,1015,90,90, α.3 | p-lantern-on.png | 40 | 1039 | none | none | #ffdca4 | 13px | #dcc8a0 |
| 2 | new-source | 282 | 1009 | 16 | 238,1001,90,90, α.16 | p-lantern-on.png | 272 | 1025 | none | cv-flicker 480ms steps(2,end) infinite alternate | #ff9a6a | 12px | #a89272 |
| 3 | grid-toolbar | 514 | 1009 | 16 | 470,1001,90,90, α.16 | p-lantern-on.png | 504 | 1025 | brightness(.75) | none | #e8d3a6 | 12px | #a89272 |
| 4 | csv-import | 746 | 1009 | 16 | — (none) | p-lantern-off.png | 736 | 1025 | brightness(.75) | none | #bfa476 | 12px | #a89272 |
| 5 | history-merge | 978 | 1009 | 16 | — (none) | p-lantern-off.png | 968 | 1025 | brightness(.75) | none | #a8c469 | 12px | #a89272 |
| 6 | auth-fix | 1210 | 1009 | 16 | — (none) | p-lantern-off.png | 1200 | 1025 | brightness(.75) | none | #d98a5a | 12px | #a89272 |

All name/status labels: `font-family:'Courier Prime', monospace`, `text-shadow:1px 1px 0 #120d07`, `white-space:nowrap`. Name label `top` = lantern `top` + 2 (e.g. 1041 vs 1039, 1027 vs 1025). Status label `top` = lantern `top` + 20 (e.g. 1059 vs 1039, 1045 vs 1025). Name/status label `left` = lantern `left` + 34.

Cord horizontal offset from its lantern: for lanterns 2–6, cord `left` = lantern `left` + 10. Lantern 1 (current session) breaks this pattern: cord `left` = 50, lantern `left` = 40 (offset +10, same rule) — so the rule actually holds for all six; what differs for #1 is only cord height (30 vs 16) and the resulting lower lantern `top` (1039 vs 1025).

Horizontal spacing between lantern anchors (by lantern `left`): 40 → 272 → 504 → 736 → 968 → 1200, i.e. a constant step of 232px between consecutive lanterns.

---

## 10. Notable literal text (verbatim, for copy fidelity)

- `New Orleans`
- `slideshow/nola · claude · 64h 15m · 51 turns · 3 agents spawned`
- `bypass permissions on`
- `context 68% · sonnet 4.5`
- `what you asked`
- `newest · 4m ago · unanswered`
- `Wait — you need to show me pictures. The foods they're best known for.`
- `2h ago · answered`
- `Cut anything where the wait is over an hour. We're not standing in line.`
- `day one · standing`
- `Oct 3–5, three of us, food-focused. Not a big fan of seafood. Money's not a problem. Don't book anything — I'll do that myself.`
- `nine older notes further down the post`
- `elsewhere in slideshow`
- `new source · waiting on your answer`
- `grid view toolbar · working · 17m`
- `history merged · csv import setting up`
- `what it is thinking`
- `the plan it posted · 64h ago`
- `Pull twenty-odd candidates out of the local press, verify Sat/Sun/Mon service on each one, cut anything seafood-forward, cluster what survives by neighbourhood, then hand you one page per day. No bookings.`
- `▸ 38 notes between then and now`
- `yesterday, 6pm`
- `Three of the twenty-one have closed for good — the food press is a year behind. Every place goes in the file only after I've read it off the restaurant's own site.`
- `6h ago`
- `You said no seafood, and this city's whole canon is seafood. So I'm keeping the kitchens good enough that the one thing on the menu without a shell is still the reason to go.`
- `22m ago`
- `Saturday, Sunday and Monday are the worst three nights for closures — half this job turned out to be knowing what is actually open.`
- `now · 20m 45s at this`
- `"Boudin boy" means nothing if you've never seen one. Pulling each dish photo off the restaurant's own site rather than stock, which is slower but at least it's the food they actually serve.` (curly quotes `“…”` around "Boudin boy" in source)
- `what it made`
- `nola.html`
- `published 11m ago`
- `three need booking · no photos yet`
- `Sat · Molly's Rise and Shine, Turkey and the Wolf, Zasu`
- `Sun · Toups' Meatery, Parkway, Saint-Germain`
- `Mon · Ayu Bakehouse, Herbsaint`
- `what it did`
- `▸ 44 earlier steps · first 62 hours`
- `read the ` + bold `homework` + ` skill · 3 questions`
- `searched ` + bold `21 places` + `, kept 15 · 3m 40s`
- `wrote ` + bold `candidates.json` + ` · 15 entries`
- `changed ` + bold `nola.md` + ` twice · ` + `+41` (green `#a8c469`) + ` ` + `−12` (orange `#d98a5a`)
- `running ` + `curl -sI` (Courier Prime, 13px) + ` on 6 pages`
- `the yard`
- `3 hands · 2 back · 1 out`
- `photos · out 3m`
- `claude · 20m 45s`
- `› say the next thing`
- `nola-photos`
- `you are here · 20m 45s`
- `new-source`
- `wants you · 4m`
- `grid-toolbar`
- `working · 17m`
- `csv-import`
- `worktree being cut`
- `history-merge`
- `merged · 2h`
- `auth-fix`
- `git refused`

---

## 11. Asset inventory used in `#13a`

| Asset | Used at | Size(s) |
|---|---|---|
| `assets/crop-market.png` | frame background | scaled to 1580×990 |
| `assets/p-billboard.png` | "what it made" | 128×104 |
| `assets/p-sign.png` | "what it did" row 1 icon | 30×41 |
| `assets/p-roadsign.png` | "what it did" row 2 icon | 27×32 |
| `assets/p-crate.png` | "what it did" row 3 icon | 32×46 |
| `assets/prop-anvil.png` | "what it did" row 4 icon | 40×25 |
| `assets/crop-square.png` | yard background | scaled to 608×342 |
| `assets/p-campfire.png` | yard fire sprite | 46×32 |
| `assets/player-b.png` | yard "out" figure (back-facing) | 21×48 |
| `assets/player-f.png` | yard standing figures (×3) | 21×48 |
| `assets/p-lantern-on.png` | yard lantern; lantern rail lanterns 1–3 | 11×19 (yard), 22×38 (rail) |
| `assets/p-lantern-off.png` | lantern rail lanterns 4–6 | 22×38 |

---

## 12. Things likely awkward to reproduce outside a browser

- **CSS `inset` shorthand** (`inset:0`) for the full-bleed background/scrim layers — trivial in CSS but has no direct equivalent in most native/UI-toolkit layout systems; must be expanded to explicit left/top/right/bottom or width/height:100%.
- **Radial gradients with `at 50% 50%` / ellipse shape and a hard-stop percentage** (e.g. `radial-gradient(circle at 50% 50%, rgba(255,168,60,0.3), rgba(0,0,0,0) 62%)`) — the "62%" second stop is a soft falloff that most non-CSS renderers (Canvas, SVG, native graphics) need to reconstruct manually as a gradient stop list, and getting the exact falloff curve to match will take care.
- **`box-shadow` used as a hard offset outline** (e.g. `5px 5px 0 rgba(0,0,0,.5)` on the sticky note, `6px 6px 0 rgba(72,37,16,.55)` on the frame) — this is a flat "drop shadow with zero blur" pixel-art convention, not a native shadow; must be drawn as a literal offset duplicate rectangle in engines whose shadow primitive always blurs.
- **`transform:rotate(-.7deg)` on the sticky note** — a sub-degree rotation; fine in CSS/Skia but easy to lose precision on if a rebuild snaps to integer degrees.
- **Keyframe animations with `steps()` timing** (`cv-blink`, `cv-step`, `cv-flicker`, all using `steps(1,end)` or `steps(2,end)`) — these are stepped/discrete animations (for a retro/pixel feel), not eased; a naive port to a tweening library will interpolate smoothly and look wrong unless step interpolation is explicitly configured.
- **CSS `filter` stacking** (`brightness(.2) saturate(.5)`, `brightness(.5) saturate(.6)`, `brightness(1.35)`, `brightness(.75)`, `brightness(.95)`) applied per-image — many UI/game frameworks don't support compositing multiple filter functions on a raster image cheaply; may need pre-baked tinted sprite variants instead.
- **`image-rendering:pixelated`** on scaled-up background images — needed to keep the pixel art crisp when `background-size` is larger than native resolution; must be matched with nearest-neighbor/point sampling in the target renderer, not the default bilinear.
- **Overlapping absolutely-positioned text with no reserved layout box** — many strings (e.g. long body text in the "what it is thinking" column) have an explicit `width` but no `height`/`max-height`, relying on natural line-wrap and visual non-overlap that was hand-tuned by the designer; a rebuild must either hardcode the same wrap widths or risk different wrapping (and therefore overlap with the next block) if the font metrics differ even slightly from `Cormorant Garamond`/`Josefin Sans`/`Caveat`/`Courier Prime` as rendered by the target platform.
- **Web font fidelity** — `Caveat`, `Cormorant Garamond`, `Courier Prime`, `Josefin Sans` are all loaded from Google Fonts; exact glyph metrics (and therefore the hand-tuned absolute positions above) depend on using these exact families/weights, not close system substitutes.
- **The two nested coordinate systems** — the lantern rail and header/columns are positioned directly against the 1440×1124 frame, but the yard box (§7.3) is a `position:relative` island whose own children are positioned relative to *it*, not the frame. A rebuild needs to preserve this nesting (yard box at `left:1020,top:720`, its own contents relative to `0,0` within that box) rather than flattening all coordinates into one frame-relative system.
