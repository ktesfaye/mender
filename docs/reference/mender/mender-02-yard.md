# The yard and the line

The yard is the screen you land on inside a project: a gatepost of what you asked, a fire of what the agent is thinking, a cart of what it made, a patch of ground for subagents, and a rail of lanterns for sessions, all drawn as absolutely-positioned DOM written over the dimmed Pixi canvas (`apps/mender/src/renderer/yard/yard.ts`, `frame.ts`). One line at the bottom is the only input surface in the app; a slash or an `@` opens a small solid menu that stands on it. Source: `apps/mender/src/renderer/yard/*.ts`, `apps/mender/src/renderer/yard-look.ts`, and the wiring in `apps/mender/src/renderer/main.ts`.

## Layout and layer

### The writing layer
- A fixed, full-window `div.yard`, `z-index:10`, `pointer-events:none` by default so island clicks pass through; only pressable things take the pointer back. `frame.ts:78-101`.
- Positions are measured against a design canvas of 1440×1104 (`DRAWN_WIDE`/`DRAWN_TALL`), 40px margin on all sides (`MARGIN`), columns cap at 1560px wide (`WIDEST`) and centre past that. `frame.ts:22-38`.
- Three columns keep their proportions (base widths asked 360 / thinking 500 / made 380, gutter computed) as the window resizes; the middle column gets any surplus width past 1560px. `frame.ts:44,109-128`.
- "Cramped": window shorter than 760px triggers a shorter layout, not a smaller one — gatepost collapses to its newest note only, rail hides names/text and shows bare lanterns. `frame.ts:136-138`; used in `yard.ts:300,320,689-690,745-761` (`asked()`), `1508` (`rail()` bare mode).
- Village dimming behind the layer, eased over 520ms `cubic-bezier(.2,.8,.2,1)`, four states: `island` (none), `yard` (`brightness(.22) saturate(.5)`), `reading` (`brightness(.12) saturate(.4)`), `stale` (`brightness(.14) saturate(.3)`, for a session untouched a long time). `frame.ts:167-182`. `stale` is chosen only when `session.cold` is set and nothing is laid over the yard (`main.ts:738`); `session.cold` is otherwise never shown as text anywhere in the yard (computed in `from.ts:387-394`, only consumed as a boolean at `main.ts:738`).

## The head (project name, checkout line, room, wound state)

### Project title
- Project name at top-left (`HEAD.title` = y22), Josefin Sans 22px, uppercase, letter-spacing .24em, colour `#f4e3c0`, 2px hard shadow. Pressable — opens project settings (`does.press('tend')`). `yard.ts:542-553,659-668`.

### The meta line
- Under the title (`HEAD.meta` = y56): `agent · going · N turn(s) · N agent(s) spawned`, pressable as a whole line opening the checkout board (`does.press('checkout')`). Joined with ` · `, empty pieces filtered. `yard.ts:557-578`.
- `going` comes from `told.began` formatted with `longFor` (e.g. "3h 12m"). `from.ts:121`.
- `turns`/`spawned` are `counted()`: `"1 turn"` vs `"N turns"`, `"1 agent spawned"` vs `"N agents spawned"`. `yard.ts:644-647`.
- Beside it, where the checkout is on disk (last path segment only), pressable, opens the folder view (`does.press('inside')`). `yard.ts:579-586`.

### Permission flag
- Top-right (`HEAD.aside` = y70): the session's own answer to "what does it ask permission for", shown verbatim (`yard.session.permissions`, e.g. lowercase mode name from `kit.modes`), Josefin Sans 11px, uppercase, letter-spacing .18em, colour `#ff9a6a`. Only when present. `yard.ts:589-593,670-677`; source text from `from.ts:154-155`.

### Context room and model
- Top-right under the flag (`HEAD.under` = y92): `context {round(room*100)}%` (Courier Prime 12px), colour `#ff9a6a` (orange) when `room < 0.15` (`TIGHT`), otherwise default gold-ish ink; then a `·` and the model name if present. Row omitted entirely if neither is present. `yard.ts:598-613,656-657`.
- No literal "context limit reached" string anywhere in the yard — only this percentage, which turns orange under 15% remaining. Never turns red, never reaches 0% with a distinct state, no pulsing/blinking.

### The wound (project health)
- If `project.health` is anything but `ok`, a line appears at `HEAD.under`, width 600, Josefin Sans 14px, colour `#e0735a`, text-shadow, drawn *before* anything else on the header is trusted to mean something:
  - `path-moved` → "this checkout is not where it was."
  - `not-git` → "there is no repository here any more."
  - `host-unreachable` → "the machine this is on is not answering."
  - `abandoned` → "the village has forgotten this one."
  - `ok` → nothing shown. `yard.ts:618-634`.
- Health is computed in `live.ts:141-159`: `path-moved` if the checkout path doesn't parse as a native absolute path; `not-git` if the git head model comes back null; otherwise `ok`. `host-unreachable` and `abandoned` are declared in the `Health` type (`what.ts:21`) but not produced anywhere found in this scope's code — likely set elsewhere (main process/board) or unreachable from here. **Unverified**: whether `host-unreachable`/`abandoned` are ever actually set.

### Header rule
- A strong horizontal rule at `HEAD.rule` (y112) spans the header width. `yard.ts:625`.

## The gatepost ("what you asked")

### Label
- `label('what you asked', ...)` at `HEAD.label` (y132): Josefin Sans 11px uppercase, colour `#a89272` (stone, not gold — labels are never pressable). `yard.ts:691`, `write.ts:45-63`.

### The post itself
- A vertical wood-gradient bar (`#54391e` → `#3a2712`), 12px wide, height computed to fit whatever is nailed on it plus margin, or a fixed 120px stub if there are no notes at all. `yard.ts:696-712`.

### The newest note (pinned, parchment)
- Card keyed `note:{id}` so it slides/arrives across rewrites. `yard.ts:714-717`.
- Visual: `#fff4d4` background, `#2c2013` text, 12px/14px padding, `box-shadow:5px 5px 0 rgba(0,0,0,.5)`, `rotate(-.7deg)` (crooked, "pinned by hand"), Caveat cursive 19px/1.25. A small orange (`#d8863a`) 10×10 "tack" square sits at the top-left corner, offset -6px above the card, with its own hard shadow. `yard.ts:769-801`.
- Meta line above the body: `newest · {when} · answered` or `newest · {when} · unanswered`, colour `#b3651f`. `yard.ts:776-782`.
- Body text is the note verbatim (`note.said`), plain textContent (not markdown-parsed).
- Clipping: capped to 7 lines (`NOTE_LINES`) at a computed line height (`19*1.25px`, `NOTE_LINE`); if the note is longer, the body is height-clamped, overflow hidden, and a line is appended: `"{N} more lines on this note"` in `#b3651f`, 9px. `yard.ts:719-737`. Cut lands on a whole line only.
- Post height adjusts to `min(room, card height + 60)`. `yard.ts:738`.

### Older notes ("weathered")
- Shown only when there are older notes *and* the layout is not cramped. `yard.ts:740`.
- Each older note: a meta line (`{when} · standing` / `· answered` / `· unanswered`, default stone colour) then the note body in Caveat cursive 17px, colour `#cbb491` (dimmer than the pinned one). `yard.ts:804-815`.
- The very first (oldest) note in the full list is marked `standing: true` and reads "standing" instead of answered/unanswered — it's "the thing that was true at the start and has not been taken down since." `from.ts:172-185`.
- List is trimmed from the top (`trim()`) to fit remaining room; a trailing line reports `"{many} older notes further down the post"` where `many` = dropped-in-DOM count + `session.olderNotes` (notes beyond the 3 the wire already sent). `yard.ts:744-760`; `from.ts:160-161` caps `notes` to 3 and reports the remainder as `olderNotes`.

### "Elsewhere in {project}" (glance at other sessions)
- Only drawn when there is at least one *other* session in the project (`yard.rail` minus `here`), capped to 3, and never in cramped mode paired with the gatepost's own list (still computed, but room is given to it first). `yard.ts:695,824-856`.
- A rule, then label `"elsewhere in {project name, lowercased}"`, then up to 3 rows: an 8×8 coloured square (posture tint from `TONE`) plus `"{name} · {saying}"`, Josefin Sans 14px; text colour `#ff9a6a` if posture is `wants-you`, else `#dcc8a0`. `yard.ts:836-853`.
- `TONE` posture colours: working `#e8d3a6`, wants-you `#ff9a6a`, done `#a8c469`, broken `#d98a5a`, resting `#bfa476`. `yard.ts:70-77`.

### The gate (a question waiting, overrides "what it is thinking")
- When `yard.asking` is set, the *middle* column becomes entirely the question: label `"it is asking"`, the question text verbatim in Cormorant Garamond 21px/1.35, colour `#ffdca4`, heavy text-shadow. `yard.ts:876-877,1060-1064,1084-1090`.
- Answers listed below (starting 90px under the question), each a row: a boxed number key (`KEY` style: Courier Prime 12px, `#482510` on `#a89272` background, padding 1px 6px) then the answer text (Josefin Sans 16px), pressable — `does.answer(answer.id)`. `yard.ts:1066-1081`.
- Keys 1–9 answer directly (`answerFor` in `board/work.ts:4-9`: `ANSWERS = ['1'..'9']`, indexes into `ask.options`). Only active while nothing else has focus/overlay (main.ts:2586-2592: "a question at the gate takes the number keys and nothing else, so that answering it cannot be done by accident while typing").
- A question also banks the fire (see Fire states below) and — per `MENDER.md` — is meant to only appear when the session is set to ask first; **Unverified** from this scope whether that "ask-first" gating is enforced here or elsewhere (main-process/ACP concern).

## What it is thinking (the fire / thought stream)

### Label and rule
- Vertical rule at the gutter left of the column; label `"what it is thinking"` at `HEAD.label`. Only drawn when there's no active `asking` (the gate replaces this whole area). `yard.ts:873-881`.

### The posted plan ("what it means to do")
- Only shown once the agent has actually posted a plan (`session.plan.length`); the very first thing an agent says is never treated as a plan. `yard.ts:891,109 (what.ts)`.
- Stays pinned at the top of the column ("measured against"); everything else scrolls beneath it.
- Each step: a mark column (14px) + text, coloured by state via `STEP`: `done` → `rgba(244,227,192,.42)` with mark `·`; `doing` → `#ffdca4` with mark `›`; `ahead` → `#a89272` with blank mark. `yard.ts:892-909,1045-1049`.

### The thought stream
- Only drawn if there are thoughts or a live edge. Scrollable box (`overflow-y:auto`), Cormorant Garamond serif. `yard.ts:913-919`.
- "Older" indicator at top if `session.olderThoughts`: `"▸ {N} more before these"`, 12px, colour `#8a7452`. `yard.ts:921-922`.
- Thoughts render oldest→newest, dimmer/smaller further back: the last 3 are `rgba(244,227,192,.62)` at 16px; anything further than 3-from-live is `rgba(244,227,192,.46)` at 15px. `yard.ts:950-961`.
- The live thought (last, marked `live: true`) is rendered specially:
  - Header word: `"thinking"` (italic, quiet reasoning) or `"now"` (colour `#ffc98a`). `yard.ts:936`.
  - Body size: 21px normally, dropped to 19px if the text is longer than 700 characters ("a whole report at the size of one sentence is read a word at a time"). `yard.ts:941`.
  - Quiet/reasoning styling: 18px italic `rgba(255,220,164,.78)`; non-quiet ("now"): heavier, `#ffdca4`, `text-shadow:0 2px 10px rgba(0,0,0,.9)`. `yard.ts:942-944`.
  - Markdown-rendered via `prose()` (see below), not plain text.
- Thoughts already on screen when you walk in do not "ink" (fresh=false); thoughts that arrive live while you're watching do fade/ink in per-character-run.
- "Earlier" thoughts (answers to something said *before* the newest note) are treated as history rather than "now", regardless of recency — see `thoughtsOf()` in `from.ts:202-227`.
- Auto-scroll: follows the live edge unless you've scrolled up, remembered per-session (`followed` map keyed by session id); resumes following once you scroll back within 24px of the bottom. `yard.ts:971-977,980-981`.
- Code blocks inside a thought are pressable to copy (see "Copying a code block" below), wired via `keepCode(does)` → `does.press('keep:' + code)`. `yard.ts:945,957,1101-1104`.

### The live edge (the fire/ember row)
- Not a spinner — an actual small fire sprite with sparks, present-tense verb, and an elapsed counter. `yard.ts:983-1042`.
- Fire sprite: `KIT_NAMES.fire`, `yard-flicker 480ms steps(2,end) infinite alternate`. A radial glow pool (46×32 hearth area, glow box 84×84) animates `yard-glow 2.4s ease-in-out infinite`. `yard.ts:994-1007`.
- 6 sparks, each with a staggered duration (`1400+i*230`ms) and delay (`i*310`ms), alternating colours `#ffc98a`/`#ff8a4a`, animation `yard-spark`. `yard.ts:1009-1015`.
- "Doing" text: present-tense phrase from `doingOf()` (`from.ts:270-296`), Josefin Sans 13px uppercase, colour `#ffc98a`, `yard-breathe 2.4s` opacity pulse, single-line ellipsis. Examples: `"running a command"`, `"running {cmd}"`, `"reading {path}"`, `"writing {path}"`, `"changing {path}"`, `"removing {path}"`, `"looking for {q}"`, `"sending somebody out"`, `"making a plan"`, `"waking up"` (mood `arriving`), `"thinking"`, `"writing back"`. `from.ts:249-296`.
- Elapsed counter: only shown if `since` is known (`data-since` attribute, ticked every 1s by a `setInterval` in `yard.ts:365-369` using `longFor()`), colour `#bfa476` 12px. `since` is only set if the newest note was said less than 1 hour ago by this village's own clock (`from.ts:264`) — otherwise the counter simply doesn't appear (agent resuming an old session with no fresh "you said this" timestamp).
- `longFor()` format: `<60s → "Ns"`; `<60m → "Nm Ss"`; `<100h → "Nh Nm"`; else `"Nd"`. `from.ts:461-469`.
- `agoOf()` format (used for note/thought "when" text, not the live counter): `<1m → "just now"`; `<60m → "Nm ago"`; `<24h → "Nh ago"`; `<7d → "Nd ago"`; `<9w → "Nw ago"`; `<12mo → "Nmo ago"`; else `"Ny ago"`. `from.ts:446-457`.

## What it made / what it did ("the cart")

### Visibility rule
- The whole column (rule, cart, step list, ground) is omitted entirely if there is no output, no steps, and no agents sent out — "nothing is written over nothing." `yard.ts:1145`.

### The cart / billboard
- `KIT_NAMES.billboard` sprite at 2×, `filter:brightness(1.35)`. Beside it: item name in Caveat cursive 22px `#f4e3c0` with shadow; a `when` line in `said()` style (10px uppercase) coloured `#a8c469`; and, if present, a warning line 13px `#ff9a6a`. `yard.ts:1200-1220`.
- If the beside-block overflows 104px tall, the least important line (warning, then when) is dropped first — "name, then when, then what's wrong with it, in that order of importance." `yard.ts:1225`.
- Under the board: a list of content lines (`output.lines`) verbatim, Josefin Sans 14px `#dcc8a0`.
- `made` is derived from `told.wrote`: newest file is the headline (`shortOf(path)`, `"written {ago}"` or `"written before this"`); the rest (up to 6) become lines `"{path} · +{added} −{gone}"`. `from.ts:324-336`.

### What it did (step list)
- Each step: a fixed 44px-wide slot on the left holding either a prop sprite (from `PROPS` map keyed by tool-call type) or, if running, a pulsing orange dot (`yard-blink 700ms steps(1,end) infinite`, `11px` circle `#ff8a4a` with a soft halo) — "nothing spins; something happening now is a light that goes on and off." `yard.ts:1240-1258`.
- Prop mapping (`from.ts:40-51`): read→sign, search→road-sign, create-file→crate, modify-file→anvil, delete-file→barrel, execute→washtub ("pot", "something on the boil"), web-fetch→road-sign, mcp→bucket, create-plan→weapon-rack ("rack"), tool-group→table; unknown tools fall back to barrel.
- Step text: `deed.why` if present, else `deed.did`; clamped to 2 lines via `-webkit-line-clamp:2`, colour `#ffc98a` while running else `#f4e3c0`; a trailing `" · {note}"` when the deed carries one. `yard.ts:1259-1267`, `from.ts:298-315`.
- A step "went wrong" (`deed.wrong`) is tagged `tone: 'broken'` in the model but — checked — the `did()` renderer does not currently apply a distinct colour for `tone: 'broken'` steps beyond the running/not-running split. **Unverified/likely gap**: `Step.tone` is set but not consumed by `did()` in `yard.ts` (only `one.running` and `one.note` are read there).
- Older-steps trailer: `"▸ {many} earlier steps · {over}"` where `many` = DOM-trimmed count + `session.olderSteps.many`, `over` = `session.olderSteps.over` (a span of time, e.g. "over 20 minutes" — exact phrasing produced upstream of this scope). `yard.ts:1178-1190`.

## The ground (subagents / "hands")

### Visibility and framing
- Only drawn once at least one agent has been sent out (`hands.length`). A window onto the actual land: `overflow:hidden`, transparent background, `2px solid #3a2712` border — "a hole in the writing with a frame round it," not a filled box. `yard.ts:1192-1196,1311-1344`.
- Header row: label `"the yard"` (stone) plus, only when a session is present, `"{N} hands · {N} back · {N} out"` in Courier Prime 11px `#bfa476`. No count shown for an empty yard — "a count of nobody is not information." `yard.ts:1321-1333`.
- Fixed box size 380×214 (`YARD_BOX`), bottom-anchored above the writing line.

### The fire in the ground patch
- Positioned at roughly centre (`fireX = wide/2 - 23`, `fireY = 117`); firelight pool sized 340×240, strength from `FIRELIGHT` by fire state: `lit` 0.34, `banked` 0.2, `embers` 0.12, `out` 0.04. `yard.ts:1346-1357,1395`.
- Sprite: `KIT_NAMES.fireOut` when `out`, else `KIT_NAMES.fire`; only `lit` animates (`yard-flicker`); `banked` is `brightness(.62)`, `embers` is `brightness(.45) saturate(.8)` — "only a lit fire breathes; a banked one is still." `yard.ts:1361-1368`.
- Under the fire, the current agent name plus (if a live thought carries an `.at` elapsed string) `" · {at}"`, 11px `#dcc8a0`. `yard.ts:1372-1382`.
- `fireOf()` mapping (`from.ts:375-381`): asking or mood `asking` → `banked`; mood `working`/`arriving` → `lit`; mood `hurt` → `out`; mood `resting` → `embers`; anything else → `out`.

### Standing figures (subagent "hands")
- In-light hands cluster near the fire at 3 fixed near-positions (with the first one flipped horizontally); anything past index 3 cycles the same 3 slots. Out hands stand to the right side, stacked in a 2-column / 3-row modulo grid. `yard.ts:1398-1410`.
- Sprite: `folk('front')` in light (facing you), `folk('back')` when out (facing away), `28×54` box. In-light: `brightness(.95)`; out: `brightness(.5) saturate(.6)` and steps (`yard-step 800ms steps(2,end) infinite`, a little bob). `yard.ts:1411-1419`.
- An out figure also gets a small pulsing orange dot (`yard-blink`) at its shoulder and a name label: `"{errand} · out {gone}"`, 11px `#ffc98a`. In-light figures are not individually named — "only the ones that need you get named; everybody else is a body." `yard.ts:1421-1431`, doc comment `what.ts:200-211`.
- `errand` text is `shortOf(errand.errand)` (last path-like segment); `gone` is `agoOf()` formatted elapsed time since sent out. `from.ts:345-352`.
- Tint (`Hand.tint`) is a deterministic hash of the errand text into a fixed 6-colour palette (`TINTS`), used as *identity* not status — "the same errand is the same colour every time you look" — but the current `standing()` renderer does not appear to actually apply `hand.tint` to the figure's colour (it only toggles brightness/saturation by in-light/out). **Unverified/likely gap**: `Hand.tint` is computed (`from.ts:345-352`) but not visibly consumed in `yard.ts`'s `standing()`.

## Empty states

### A project nobody has worked in
- When `yard.session` is absent, the whole three-column body is replaced by: `"nobody has worked in here yet."` (Josefin Sans 14px, `#a89272`), then a hint line `"say what you want built, or hang a lantern on the rail."` (12px `#8a7a5e`), then the "elsewhere in..." glance (same as above) if other sessions exist. `yard.ts:1280-1300`.
- The line at the bottom asks `'start'` (`"› say what you want built"`) in this state.

### Carried images
- What's in your hands is drawn as small pressable chips beside the writing line (not on the line itself): `"▣ {name}"`, Courier Prime 12px. Pressing one puts it down (`does.press('putdown:' + id)`). `yard.ts:1443-1453`.

### "Still to say" (queued messages)
- If there are queued messages (said while the agent was busy), a box appears just above the writing line: label `"still to say, press to take one back"`, then each message in Caveat cursive 18px, pressable (`does.press('unsay:' + id)`) to take it back. Background `rgba(72,37,16,.72)`. `yard.ts:1465-1482`.
- This area sits above the line and stays visible even while something else is laid over the yard reading ("a thing you might want back does not go behind a wash" — `yard.ts:178-183`).

## The rail (sessions as lanterns)

### Layout
- A horizontal beam at the bottom, height `RAIL_TALL=118` normally or `RAIL_BARE=76` cramped. A 3px dark strip across the top of the beam. `yard.ts:61-65,1492-1499`.
- Lantern spacing: `min(LANTERN_STEP=232, floor(room / (count+1)))` — one more slot than lanterns, reserved for the "new session" hook at the end. Falls to "bare" mode (icon only, no names) if cramped *or* the computed step is under 140px. `yard.ts:1504-1508`.
- Each lantern's cord length is longer for the one you're standing in (`cordHere=30` vs `cord=16`), so it visually "hangs lowest." `yard.ts:65,1512-1513`.

### Lit / posture states
- Sprite: `lanternOn` if `lit`, `lanternOff` otherwise. New lanterns (ids not seen before, tracked in module-level `onTheBeam` set) animate in with `yard-hang 240ms steps(3,end)` (drops onto the hook). `yard.ts:1525-1533`.
- `lit` = mood is defined and not `empty`/`hurt` (`from.ts:414`).
- Dimmed (`brightness(.75)`) unless it's the current session. The one wanting you flickers: `yard-flicker 480ms steps(2,end) infinite alternate`. `yard.ts:1534-1538`.
- Firelight glow behind a lit lantern: strength 0.3 if it's the current one, 0.16 if posture is `wants-you`, else none. `yard.ts:1516-1523`.
- Name colour: current session `#ffdca4` at 13px; others use `TONE[posture]` at 12px (working `#e8d3a6`, wants-you `#ff9a6a`, done `#a8c469`, broken `#d98a5a`, resting `#bfa476`). `yard.ts:1558`.
- Under the name: `saying` text (the status word/branch), 11px, `#dcc8a0` for current / `#a89272` for others. `yard.ts:1565-1567`.
- `saying` text per posture (`from.ts:421-432`): `wants-you` → "wants you"; `working` → "working"; `broken` → "it broke"; anything else → the task's branch name; the current session's own lantern always says `"you are here"` regardless of posture (`from.ts:411`).
- **Deliberate exception to the gold-only rule**: lantern names keep their posture tint colours rather than turning gold, "because the rail's whole job is telling you, from across the room and without reading, which session wants you." `yard.ts:1541-1546`.
- Pressing a lantern (not the current one) opens that session (`does.open(id)`); hover brightens the lamp to `brightness(1.15)`. Keyboard-walkable via `data-walk="rail:{id}"` on the name (or the lamp itself in bare mode). `yard.ts:1547-1577`.
- The current session's lantern is not clickable (`pointer-events:none`, `mousedown` not wired).

### The empty hook (starting a session)
- Drawn identically to a lantern but always off/dim (`brightness(.7)`), with a distinct hook cord style (`HOOK` = `background:#3a2712`). Label: `"a new session"` (pressable, gold, Courier Prime 13px) over `"the hook is empty"` (11px `#a89272`). Hover brightens to `brightness(1.1)`. Bare mode: whole lamp is the press target (`rail:new`). `yard.ts:1580-1618`.
- Pressing it (or the lantern-off icon in bare mode) calls `does.press('new')`.

## The writing line

### Mechanics
- A single `contenteditable="plaintext-only"` span (deliberate choice over reimplementing input — gets native selection, undo, drag, IME for free). Real browser caret is hidden (`caret-color:transparent`); a drawn 2px `#f4e3c0` cursor with `yard-blink 900ms steps(1,end) infinite` follows the real caret's position via `Range.getClientRects()`. `line.ts:1-21,91-144,323-330`.
- Handwritten look: Caveat cursive 22px throughout (both the ghost prompt and what you've written).
- The whole line's width is clickable, not just the text — clicking anywhere on the row takes the keyboard (`line.ts:146-153`).

### Empty-state prompts (`Asking` type, `PROMPTS` map — verbatim text)
- `say` → `"› say the next thing"`
- `start` / `built` → `"› say what you want built"`
- `branch` → `"› call it something"`
- `commit` → `"› say what this does"`
- `look` → `"› what are you looking for"`
- `name` → `"› call it something else"`
- `file` → `"› say something about this file"`
- `changes` → `"› say something about these changes"`
- `answer` → `"› answer it"`
- `line.ts:36-47`. (`built` and `start` map to identical text — likely `built` is unused/legacy; not referenced from `main.ts` prompting logic, which only ever asks `'file' | 'changes' | undefined`, plus the yard itself sets `'answer' | 'say' | 'start'`.)

### Return / Escape / paste behaviour
- Return sends (`onSay`), unless a slash/@ menu has a line already picked out, in which case Return is handed to that instead (`onInstead`) — this is checked before the line's own Return handler acts, and once it takes it, `stopPropagation()` is called so nothing else sees the same Return twice. `line.ts:172-189`.
- Shift+Return inserts a literal newline (native contenteditable behaviour, not special-cased).
- Escape: if there's text, clears the line first (and reports `typed('')`); a second Escape (line now empty) calls `onEmpty()` which is the app's "back out" signal (`does.leave()`), and the event is stopped either way so it never double-fires as a second Escape-level back-out. `line.ts:190-209`.
- Paste: plain text only; multi-line paste is flattened to one line (newlines collapsed to spaces) before insertion — "almost always one thing somebody copied with a line break in it." `line.ts:221-228`.
- A dropped/pasted *picture* is handled separately at the `main.ts` level and never touches the line's own paste handler for text (see "Pictures and files" below) — but that handler intercepts `paste` on the window and calls `event.preventDefault()` before the line ever sees it if there are files in the clipboard (`main.ts:2244-2249`).
- A stray printable keystroke anywhere else in the app (nothing else has focus) is caught and redirected to take the line's keyboard (`Line.catches`, `line.ts:269-276`), wired at `main.ts:2464` (`strayed: (event) => void yard.line.catches(event)`).

## The slash and `@` menu

### Presentation
- Own small dark slab (`rgba(20,14,8,.97)`), not the wash — "the one solid surface in the yard, because a list of names read over a transcript was two things to read at once." Positioned with its left edge on the slash/@ character, above the line. `menu.ts:1-17,33-93`; CSS `tokens.css:523-624`.
- Arrives with `yard-arrive` (clip-path wipe, `steps(3,end)`, 140ms). Scrollable list, max height clamped between 120–330px depending on available room. `menu.ts:84-93`.
- Column width for names auto-sized to the longest name present, clamped 8–30 characters (`--menu-name`). `menu.ts:55-58`.
- Sectioned by heading (e.g. "this session", "commands", "kept") with a count per section; sections stay grouped and ordered by the best-scoring item within each (see `rank()` below). `menu.ts:60-82`, `offer.ts:36-77`.
- Each row: an optional `●` mark (the currently-set choice, for `/model` etc.), the name (gold, Courier Prime 15px, with a lighter-gold highlighted substring where your typed text matched), an optional grey `takes` hint after the name, and a dimmer "about" description trimmed to one line. A row marked `sore` (e.g. `/forget` armed) shows its about text in the broken/red colour. `menu.ts:95-138`, CSS.
- The picked (keyboard-highlighted) row gets a lifted look: soft gold background wash, gold left border, brighter name/about text — not the flat gold fill used everywhere else (`.picked`), because a filled row the width of the menu would be a slab of gold. `tokens.css:610-624`.

### Opening conditions (`Palette` in `board/palette.ts`)
- Slash at the very start of the line with nothing after a space opens the full set: village's own settings + agent's own commands/skills + everything you've kept. `palette.ts:274-276,184-217`.
- Slash later in a sentence (regex `LATER = /(^|\s)(\/\S*)$/`) opens only the agent's own commands and your kept prompts — never the village's own settings — "a setting is not something you say halfway through a thought." `palette.ts:283-288`.
- Typing `/model`, `/mode`, `/effort`, or `/collaboration` followed by a space (and no further space yet) narrows to that setting's own choice list. `palette.ts:279-281`.
- Typing `/keep ` narrows to a single confirmation line reflecting exactly what you typed after it. `palette.ts:279`.

### The village's own commands (`OURS`, never sent to the agent)
- `/model` — "what it thinks with" — choices from `kit.models`, current marked with `●`.
- `/mode` — "how it works, and what it asks first" — choices from `kit.modes`.
- `/effort` — "how hard it thinks" — choices from `kit.efforts`.
- `/collaboration` — "whether it plans first or just gets on with it" — choices from `kit.collabs`.
- `/agent` — "everything this session works with" — turns the board over to the card (`does: 'card'`), no choices.
- `/keep` — "keep what you write after it, to say again" — takes free text (`takes: 'what to keep'`).
- `/forget` — "stop keeping something you kept" — only offered when you have something kept (`when: kept.length > 0`); picking one arms it (turns its about text to "press again to forget it for good", tone `sore`), a second press actually forgets it.
- `palette.ts:53-90`. Each of the choice-bearing four is only listed in the "all" menu if it actually has choices (`ours.choices(kit).length`), i.e. a kit with only one model hides `/model` etc.
- Picking a choice (`/model` etc.) calls `client.agents.choose()` directly — "picking a model is a setting on a running session, not a sentence" — and afterward the line shows `"{choice name}."` for 3s (`HOLD_MS`) as the press-result convention. Failure shows the refusal reason, held indefinitely. `main.ts:2010-2019`, `press.ts:118-137`.

### The agent's own ("theirs")
- Every order the connected kit reports (`kit.orders`), each `slashed()` to ensure a leading `/`, deduplicated against the village's own names. Shows the order's own `about` text and `takes` hint if it declares one. `palette.ts:196-207`.
- Selecting a command already fully typed (matches exactly, no `takes`) sends it immediately rather than re-writing it — mirrors "the same two presses as Emdash's own chip." `palette.ts:262-269`.

### Kept prompts (`/keep`, `/forget`)
- Every kept prompt (from `client.prompts`, synced globally via `keptNow()`) appears under section "kept" in both the full and "later" menus, titled by its saved title, with its stored text as the description (unless title==prompt). Picking one writes it onto the line at the slash's position (does not send). `palette.ts:208-215,241-244`.
- `/forget` list shows each kept prompt by title with its prompt text as description; the armed one shows "press again to forget it for good" and is tagged `sore` (renders red). `palette.ts:158-169`.

### Matching and ranking (`rank()` in `board/offer.ts`)
- Scored 0 (exact name match) → 1 (name starts with query) → 2 (a `/`,`-`,`_`,`:`,`.`,` `-delimited word starts with query) → 3 (query anywhere in name) → 4 (query only in the description) → excluded if none match.
- Sections are ordered by their best-scoring member, then by first-seen order; within a section, items sort by score then original order. Headings never interleave.
- The matched substring is captured (`hit`) so the menu can render it in a lighter gold.
- `keepOrder: true` (used for choice-lists and file names) keeps the original order when nothing has been typed yet, rather than the insertion order of scoring ties.

### The `@` file menu (`board/naming.ts`)
- Regex `AT = /(?:^|\s)@(\S*)$/` — an `@` must be at the start of the line or after whitespace.
- Debounced live lookup via `client.tasks.files({ id, like })`; a stale in-flight answer is dropped if the query has moved on by the time it resolves. `naming.ts:31-46`.
- Only opens (`open`) once the lookup has actually returned at least one match — an `@` with no matches yet shows nothing.
- Each offer: filename first (what's typed against), the containing folder as the "about" text (nothing if the file is at the checkout root). `naming.ts:64-78`.
- Picking one writes the *whole path* in place of `@{partial}`, followed by a trailing space, and keeps typing from there. `naming.ts:80-91`.
- Precedence: `@` and `/` are mutually exclusive by construction — the yard's `narrowing()` checks `watching.names.open` first, then `watching.slash.open` (`main.ts:173-178`) — so if both patterns could theoretically match, the `@` menu wins.

### Keys (shared by both menus, `line.ts:201-215`, `yard.ts:201-233`)
- Arrow Down/Up: step the highlighted row (`walk.step`).
- Tab (no shift): pick the highlighted row (`walk.press`), same as Return via `onInstead`.
- Return: picks whatever line is highlighted under the keyboard (first row by default) rather than "send" — decided by `Line.onInstead`, which checks whether the keyboard's mark (`walk.on`) is inside the currently-open menu.
- Escape: closes the menu and keeps whatever text is on the line; the menu stays dismissed until the text changes again (tracked via `dismissedAt`), matching "list you dismissed stays dismissed" convention elsewhere. `yard.ts:195-213,481-484`.
- The highlighted row resets to the first item whenever the *set* of offers changes (every keystroke that changes the ranked list), but is preserved across a rewrite that doesn't change the set — explicitly to avoid the bug where typing the whole of `/mode` left the mark sitting on `/model` from three letters earlier. `yard.ts:491-505`.

## Pictures, dropped files, and the `@`/paste boundary

### Pictures
- Accepted MIME types: `image/png`, `image/jpeg`, `image/gif`, `image/webp` (`CARRIED`, `main.ts:56`).
- Drag/drop and paste are both routed through one `carry()` function (`main.ts:2213-2236`). Dropping/pasting *outside* an open session ("open a building first, and somebody can take it," 4s hold) does nothing; a paste of bytes with no backing file ("that is not a picture and it is nowhere," 4s) is likewise rejected.
- A picture is uploaded via `saying.pickUp(picture)` (`live.ts:176-198`, wired to `client.agents.carry(...)`); failure surfaces its reason (or a generic "that would not go.") for 6s on the notice line (not the writing line itself — `say()` is the global toast-equivalent, separate from `pressing()`'s line-rewrite convention). It's unclear from this scope whether `say()` uses the same line-rewrite mechanic or a separate transient notice; **cross-reference**: `village/notice.ts` is out of this scope's file list but is imported as `say` in `main.ts:45` — likely an island-level notice, not a yard board convention. **Unverified** exact visual of `say()`.
- Once picked up, it appears as a chip beside the line (`"▣ {name}"`) until you say something (goes with it) or you press it to put it back down (`does.press('putdown:' + id)` → `client.agents.putDown`).

### Non-picture dropped files
- Anything not an image is resolved to its filesystem path (`window.mender.pathOf(file)`) and written onto the end of the line, quoted if it contains a space, space-joined if several, via `alongside()`. `main.ts:2700-2704`. This happens even while the menu/naming state is otherwise idle — it calls `said()` directly.

### Code blocks
- A fenced code block inside agent prose is rendered as a `<pre>` with class `prose-block press` (only when a `keep` callback is supplied, i.e. always in the thought stream). Hovering brightens its left border to gold and its text to a lighter blue-grey; clicking calls `window.mender.keep(code)` → `clipboard.writeText(code)` — and the line that was pressed (its containing thought's implicit "press" target is the block itself, not a labelled line) reports `"copied."` for 2s via the notice mechanism (`main.ts:2156-2159`), not the `pressing()` line-rewrite convention (there is no dedicated gold line for a code block — the whole block is the press target). `prose.ts:213-224`, CSS `tokens.css:679-697`.

## Reading something (the flat wash overlay + breadcrumb trail)

### The scrim
- Comes down over the middle and right columns only — the gatepost's own column and the rail stay visible and unaffected. `scrim.ts:1-17,46-67`.
- Flat brown wash `rgba(72,37,16,.72)`, no blur ("nothing in this art is blurred, and a frosted panel over a pixel village reads as a screenshot of a different program"). `scrim.ts:140-149`.
- Height is exactly what the content needs, capped to the available room, then scrolls internally — never forces two-thirds-of-window flat brown under a short answer.
- First open: steps in from 10px above with a fade (300ms `cubic-bezier(.2,.8,.2,1)`). A subsequent change of *what's* on it (e.g. folder → file) is a soft cross-fade of the body only (220ms) while the trail updates — "a cut," not a re-wipe. `scrim.ts:94-109`.
- Everything under the scrim (`covered`) becomes `visibility:hidden` (not display:none, keeps layout) while it's up. `yard.ts:437-443`.
- While the scrim is up, the writing line asks whatever the opened thing wants (`what.asks`), defaulting to `'say'`.

### The breadcrumb trail
- Rendered via `trail()` in `press.ts:174-194`: each step gold and pressable except the last (current) step, which is plain ink (`--yard-ink-bright`) and unpressable; steps separated by a `›` in `#6b5a40`.
- Built live from current app state in `wayHome()` (`main.ts:307-326`): always starts with `"yard"`; then, in order, whichever of "looking for something" / "a new session" / "its name" / "the checkout" / "files" / "looking" / "history" / "a commit" / the shell's own name / "what is open" / "who works here" / the change's path / the opened file's path is currently true. Every step but the last calls `hand.escaped()` (the same function Escape itself calls) — pressing a crumb is exactly one Escape-worth of stepping back, repeated to that depth.

### Escape stepping (the ladder)
- One thing at a time, in a fixed precedence (`main.ts:2276-2451`): half-written search text → the finder itself → half-written commit → leaving commit mode → an asked-confirmation on the `/agent` card → the card's own "showing extra" state → the card itself (back to the transcript) → half-written "open PR" note → leaving that → half-typed shell input → leaving the shell → half-typed hunt/search → leaving hunt → a file-tree rename-in-progress → blame view (back to the file) → a rename-in-progress on a file → an asked-confirmation on a file → a half-edited line on a file → the opened file itself (back to its folder/hunt/walk) → walking up one folder level or out of the checkout entirely → an asked-confirmation on a change → a file read from inside a commit (back to that commit) → closing the change reader → closing history → half-written new-session-name / re-title text → leaving that naming mode entirely → clearing whatever's on the writing line → closing the checkout board (back to the yard) → finally, walking out of the district to the island.
- A generic `Ladder` class (`press.ts:204-229`) is also available as reusable infrastructure (push/pop named rungs, `back()` pops the top and runs it) but the actual yard-level Escape chain in `main.ts` is hand-written as a big if/else rather than using `Ladder` directly. **Unverified** whether `Ladder` is used elsewhere in the app (out of this scope's file list) or is currently unused scaffolding.

### Click-outside closing
- Clicking anywhere the yard doesn't cover (`yard.covers(x,y)` false) is treated as "aside," which calls `hand.aside()` → if the scrim is open, dismiss it (one specific rung, not the full ladder) — `main.ts:2251-2255`, `watchPointer(...)` wiring at `main.ts:2604`.
- `yard.covers()` logic: on the island (no yard open), only the projects rack and the writing line itself count as "covered" (clicking the village navigates it as usual); once a yard is open, the *entire* screen area the yard's stage occupies is covered — "the land is not a list of buttons any more... a missed click on the middle of a session threw you back out to the island." `yard.ts:449-468`.

### Keyboard scroll passthrough
- Arrow/Page/Home/End keys not claimed by the menu or the walk cursor scroll the open scrim by fixed amounts: Up/Down 60px, PageUp/PageDown a page minus 40px, Home/End to the very top/bottom. `scrim.ts:115-135`, wired at `yard.ts:448` and `main.ts:2463,2482,2493,2506,2524,2534,2543,2554,2584`.

## Pressing things (gold rule and outcomes)

### The four rules (verbatim intent from `press.ts:1-30`)
1. **Gold is pressable and pressable is gold.** No underline, no arrow, no box anywhere else. CSS: `.press { color: var(--yard-gold) }`, hover → `--yard-gold-hover` (`#f0cf8a`), active → `--yard-gold-down` (`#b08f52`) with a `translate(2px,2px)` sink. `tokens.css:107-131`.
2. **The result lands on the line you pressed**, not a toast/banner. It rewrites its own text, then settles back to the original label after `HOLD_MS = 3000ms` — unless it's a failure, which stays indefinitely (with an optional second line explaining "because", styled dim). `press.ts:32-138`.
3. **Anything irreversible takes two presses** (`twice()`, `press.ts:149-166`): first press rewrites the line to `"press again — {cost}"`, still gold, and auto-withdraws after `STANDS_MS = 4000ms` if you walk away; second press (while armed) actually runs it.
4. **Nothing spins.** A slow action (over `NOTICE_MS = 300ms`) shows its present-participle label (`doing.while`); past `COUNT_MS = 1000ms` it appends a live `· Ns` counter. A wait under 300ms shows nothing at all.
- A busy press stops being gold/pressable: `color: var(--yard-ink-bright)`, `pointer-events:none` while `data-busy` is set. `tokens.css:122-126`.
- A press never steals the keyboard from the writing line — its `mousedown` is preempted so focus never leaves the line. `press.ts:67-72`.
- Space or Enter also activates a focused pressable line (keyboard access without the walk cursor). `press.ts:73-78`.

### Two-press examples actually wired
- Project removal in Settings ("Remove from Mender" → "Click again to remove · {cost}"). `settings.ts:268-291`.
- Ending a session (`pick === 'end!'`), throwing away a change (`bin!`), undoing (`undo!`) — all board-side, referenced from `press(pick)` (`main.ts:2073-2143`), implementation lives in `board/*` (out of this scope's file list) but the two-press *pattern itself* is this shared `twice()` helper.

## Project settings (the window over everything)

### Presentation
- Not laid over the yard on the wash — a true modal window (`role="dialog" aria-modal="true"`) centred over the whole app, "the rack's own timber" styling, closes on: the `×` button, Escape, or a click that both starts and ends outside the panel (drag-out-of-field doesn't count). `settings.ts:58-79,304-311`.
- Opens with a 160ms fade on the backdrop and a 200ms slide+fade on the panel (`translateY(8px)→0`). `settings.ts:122-130`.
- Keyboard focus moves into the window on open (`shut.focus()`), so typing lands there, not in the session underneath. `settings.ts:316`.
- Opened via pressing the project name in the yard header (`does.press('tend')`, `main.ts:2025-2029`) or automatically right after founding a new project (`fresh: true`, `main.ts:658`).

### Head: face, name, location
- Face: the current icon/tool slot at 64px (same `slot()` component the rack uses). `settings.ts:132-146`.
- Name: an actual `<input>` (not the writing line) — Enter blurs it, blur commits a rename if changed and non-empty, otherwise reverts. `settings.ts:97-111`.
- Location: path with the home directory collapsed to `~`, full path in the title tooltip, plus a "Show in Finder" link (`window.mender.showIt`... via `does.show()`).

### Welcome banner (fresh projects only)
- Shown only when `fresh`: `"{name} has moved in. Pick the icon it wears on the rack, or keep the default."` `settings.ts:295-298`.

### Icon picker
- A grid of choices at 52px each: "The default" (the numbered tool sprite) is always first; then, if the project already wears an icon not found among the checkout's own pictures, that current one is shown too (so the chosen option is never missing); then every picture found in the checkout (path + dimensions as hover caption, e.g. `"assets/logo.png · 512×512"`). `settings.ts:148-210`.
- Hint text cycles through three states depending on `pictures`: `null` → `"Looking through the project for images…"`; `[]` → `"There are no images in this project."`; non-empty → `"Found in the project, likeliest first."` `settings.ts:205-210`.
- "Choose a file…" opens an OS file picker (`does.face({kind:'own'})`); a "Show {N} more" button appears when more are available beyond the initial 11 (`FACES = 11`), loading 24 more each press. `settings.ts:214-226`.
- A failed pick shows its reason under the grid (`settings-trouble`, red `--yard-broken`): unreadable-as-image gives `"{filename} would not open as an image."`; a project that's vanished gives `"That project is not here any more."`; a cancelled OS picker shows nothing. `settings.ts:876-887`.
- A picture rendered smaller than its slot is upscaled with `image-rendering:pixelated` at a whole-number multiple, rather than blurred. `face.ts:56-66`.

### New-session carry list ("what every new session carries into its worktree")
- Hint: `"Each session gets a fresh worktree {cut from X / of this project}. Files git ignores are left behind unless they are ticked here."` `settings.ts:244-246`.
- Loading state: `"Reading the project…"`; empty state: `"Nothing in this project is ignored by git."` `settings.ts:239-251`.
- Each ignored path is a checkbox row; folders show a trailing `/`. Toggling calls `client.projects.carry(...)` immediately (no separate save step). `settings.ts:252-266`.

### Removal (danger zone)
- Cost line computed before offering: no sessions → `"the folder stays where it is"`; one session → `"its one session is taken down, the folder stays"`; N → `"its {N} sessions are taken down, the folder stays"`. `settings.ts:269-273`.
- Two-press button: `"Remove from Mender"` → armed `"Click again to remove · {cost}"` (auto-disarms after `STANDS_MS = 4000ms`), styled in `--yard-broken` red, armed state gets a solid red fill. `settings.ts:274-291`, CSS `.settings-remove.armed`.
- Escape while armed disarms rather than closing the window outright. `settings.ts:329-334`.

## The projects rack (shelf, top-right)

### Presentation and the one deliberate gold exception
- Sits over everything (island and yard alike), fixed top-right, drawn in "rack timber" (`#54391e` background, `#482510` border, drop shadow). `shelf.ts:43-46,101-112`.
- Each project is a box slot (44px, `face.ts:31`), not a line of gold writing — the one other deliberate exception to the gold rule besides the rail's posture tints, because it's explicitly "an inventory rack out of a game, not a piece of the board." `shelf.ts:15-19`.
- Slot fill colour: `#a48961` normally, `#e0b56a` (the same thatch gold as the keyboard mark) for the project you're currently in — "the one that is yours is the filled slot... because they mean the same thing: this one." `face.ts:97-101`.
- No names shown by default; hovering a slot swaps the fold-label text to that project's name (colour brightens to `#f4e3c0`) and reverts on leave. `shelf.ts:76-83`.
- A project's own picture (its app icon/logo) takes priority over its assigned tool sprite once it has one (`icon` field). `face.ts:39,48-69`.
- The tool sprite assigned to a project with no picture is deterministic by its position in the island's own order (`toolFor(at) = TOOLS[at % TOOLS.length]`), cycling through: anvil, sign, barrel, sack, bucket, crate, pot, rack, road-sign, table, lit-lantern, cart. `face.ts:16-36`.

### Folding
- The label doubles as the fold handle; clicking it toggles folded state. Folded: label reads `"projects · {N}"` and no slots are drawn; unfolded: label reads `"projects"` and every slot is shown. `shelf.ts:59-67,89-92`.

## Motion and "ink" (how things move without teleporting)

### Keyed slide/arrive/leave
- Everything that persists across a rewrite carries a `data-key`; before a rewrite, positions of all keyed elements are measured (`measure()`); after, each surviving key is slid from its old rect to its new one over `MOVE_MS = 380ms` with `SETTLE = cubic-bezier(.2,.8,.2,1)` (an ease that "leaves quickly and settles"); a key not seen before "arrives" (rises 8–10px while fading in over `ARRIVE_MS = 460ms`, staggered up to 420ms total when the whole yard is entering at once rather than one thing changing). `motion.ts:22-93,117-122`.
- Respects `prefers-reduced-motion: reduce` — all animation functions become no-ops. `motion.ts:162-164`.
- A message you just sent visually "flies" from where it was written up to its place on the gatepost as the newest pinned note, handled specially in `yard.ts:fly()` (620ms `cubic-bezier(.3,.7,.2,1)`, starts as translucent Caveat text at the line's own position, ends as the pinned parchment card's exact position/rotation/shadow) rather than the generic keyed-slide, because the note doesn't exist as a DOM element with that key until the agent's own record of it arrives. If the agent's echo never arrives within 8000ms, the flying note fades out and is discarded rather than sitting there forever. `yard.ts:371-434`.

### Text "inking"
- Answer text arrives progressively: each new increment of text (as it streams in) gets its own fade-in span (`yard-ink` keyframe: opacity 0→1 plus a warm glow that fades, 520ms `INK_MS`, per-run using negative `animation-delay` to resume mid-fade for chunks that arrived slightly before the current render). Text that was already fully present when you *walked in* to the session does not ink at all (`fresh=false`). `motion.ts:166-267`, wired at `yard.ts:945,1121`.
- Table cells, headings, list items, and quotes each ink independently but share one timeline per block, keyed `{thoughtId}#{blockIndex}`.

## What an agent says, rendered as markdown (`prose.ts`)

### Parsed block types
- Fenced code blocks (```` ``` ```` or `~~~`), verbatim, no syntax highlighting.
- Headings (`#`–`######`) rendered as small uppercase "prose-heading" labels, not sized by level (h1..h6 all render the same way — level is discarded).
- Horizontal rules (`---`, `***`, `___`, 3+ chars) render as a short 6em line.
- Tables: divider row (`|---|---|`) is dropped; a column right-aligns if the divider marks it with a trailing colon, *or* if every value in that column looks numeric (`~≈<>` prefix, digits, `%kKmMbB` suffix) — numbers align right even without an explicit colon.
- Blockquotes (`>`), consecutive lines merged into one paragraph, marks stripped.
- Bulleted (`-`/`*`/`+`) and numbered (`1.`/`1)`) lists, nesting depth from leading-whitespace count (`floor(indent/2)`, capped at 4 levels), continuation lines (indented further than the marker) folded into the same item.
- Plain paragraphs: consecutive non-blank, non-special lines are joined with a space (ignores the writer's own line-wrap points and re-wraps to the column's width instead).
- Inline emphasis: `` `code` `` → `prose-code` (monospace, `#9ab7c0`); `**bold**`/`__bold__` → `prose-heavy` (font-weight 600); `*italic*` → `prose-lean` (only matched at word edges so `mcp__server__tool`-style names with underscores are never mistaken for emphasis); `[text](url)` → the link text only, marks stripped, URL discarded entirely (never shown, never clickable).
- `prose.ts:1-269`; edge cases pinned by `prose.test.ts`: underscore-heavy tool names stay intact, and a two-column table correctly right-aligns a numeric column with no explicit divider colon.

## Faces (fonts) used throughout the yard
- Josefin Sans — labels, UI chrome, step text, settings body.
- Caveat (cursive) — handwritten notes, "what you asked," "still to say," the line you write on.
- Cormorant Garamond (serif) — "what it is thinking" (thought stream and live edge body).
- Courier Prime (monospace) — names, paths, statuses, exact quoted values, code, menu names.
- `tokens.css:66-69`.

## Differences from MENDER.md

1. **No literal "context limit reached" warning.** MENDER.md's own framing example ("Nothing warns an agent that it is running out of room; it simply starts losing the beginning of the conversation, so the village says it instead") is realized only as a small `"context {N}%"` figure that turns orange under 15% remaining (`TIGHT = 0.15`, `yard.ts:598-613,656-657`). There is no distinct "almost gone" or "gone" visual state, no red colour, no pulsing, and no separate warning line — just the same percentage figure, always in the header's top-right, one colour swap at one threshold.

2. **`Step.tone: 'broken'` and `Hand.tint` are computed but not visibly consumed.** `from.ts` tags a failed tool-call step with `tone: 'broken'` (`stepOf()`, `from.ts:313`) and assigns each spawned subagent a deterministic identity colour (`handOf()`, `from.ts:345-352`), but the renderers in `yard.ts` (`did()` for steps, `standing()` for ground figures) do not currently read either field — steps only distinguish running vs. not-running, and figures only distinguish in-light vs. out. MENDER.md doesn't explicitly promise either of these are drawn, but the presence of unused fields suggests intended-but-unfinished behaviour, worth flagging since it's exactly the "looks the same whether working hard or broken" kind of gap the owner has called out before.

3. **`Lantern.ground` and `Lantern.unread` are dead fields.** `what.ts` declares a `Ground` type (`'cutting' | 'ready' | 'missing' | 'locked'`) and an `unread: boolean` on every lantern, and `from.ts`'s `lanternOf()` always fills them (`ground: 'ready'`, `unread: false`), but nothing in `yard.ts`'s `rail()` reads either — there is no "cutting a worktree" lantern state and no unread-dot on a lantern, despite MENDER.md's general framing implying sessions could plausibly be "still being cut" as a rail state ("dark is resting, still being cut, or broken"). The rail currently only distinguishes lit/dark and posture tint; a session mid-cut would show as an ordinary dark lantern indistinguishable from "resting."

4. **Health states `host-unreachable` and `abandoned` are unproduced from this scope.** MENDER.md and `what.ts`'s `Health` type both name four failure states (`path-moved`, `not-git`, `host-unreachable`, `abandoned`), each with its own wound-line text (`WRONG` map, `yard.ts:629-634`), but `live.ts` (the only place in this scope that sets `health`) only ever produces `path-moved`, `not-git`, or `ok`. The other two are presumably set elsewhere (main-process/board layer, out of scope) — flagged as unverified below rather than a confirmed gap.

## Unverified / unclear

- Whether `host-unreachable` and `abandoned` project-health states are ever actually reached (not producible from files in this scope).
- The exact visual/duration of the global `say()` notice used for upload failures, "copied.", command-result confirmations, etc. — `village/notice.ts` is imported but out of this scope's file list, so its presentation (position, styling, whether it reuses the gold press-line convention or is a separate toast) could not be confirmed from the yard files alone.
- Whether `Ladder` (`press.ts:204-229`) is actually used anywhere, given the yard's own Escape chain in `main.ts` is hand-written rather than built on it.
- The `built` entry in `line.ts`'s `PROMPTS` map is identical to `start` and no caller in this scope's `main.ts` ever asks for `'built'` — likely dead/legacy.
- Whether session "ask-first" permission gating (mentioned in MENDER.md: "it takes setting the session to ask first, because otherwise the Claude on this machine answers its own") is enforced anywhere in this scope, or lives entirely in the agent runtime/main process.
- `sample.ts` (dev-only fixture data for `yard-look.ts`'s harness) was located but not read in detail — it is not shipped in the app and only feeds the standalone preview page, so it was treated as out of scope for a user-facing catalogue.

## Coverage note

Every file listed in scope was read in full: `apps/mender/src/renderer/yard/{yard,line,menu,what,from,live,motion,press,prose,prose.test,rows,scrim,settings,shelf,sprite,walk,write,face,frame}.ts`, `apps/mender/src/renderer/yard-look.ts`, and `apps/mender/src/renderer/yard/tokens.css`. `sample.ts` was located but not read in depth (dev-only fixture, noted above). The relevant slices of `apps/mender/src/renderer/main.ts` were read in full for: boot/yard construction, `showYard`/`openDistrict`/`settle`, the `press()` dispatcher, `tell`/`answered`/`answer`/`obey` (slash outcomes), `configure` (project settings wiring), the drag/drop/paste `carry()` handler, the full Escape ladder, the keyboard dispatcher (arrows/Enter/number-keys), `wayHome`, `paintRail`, and the small text-producing helpers (`alongside`, `asking`, `retitling`). Two adjacent files outside the literal scope list were also read because the yard imports them directly for slash/@ behaviour: `apps/mender/src/renderer/board/palette.ts`, `board/naming.ts`, `board/offer.ts`, and `board/work.ts` (just the number-key mapping). Deeper board/checkout features (changes, commits, file tree, shell, PR, the `/agent` card's own contents) were only touched at the handoff boundary, per the scope note that another agent covers them.
