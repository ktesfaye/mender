# Gaps found, and every key

Extracted 1050 string-literal candidates from `apps/mender/src/**/*.ts` and `packages/village/src/**/*.ts` (non-test); `packages/village/src` is map/geometry generation with no user-visible text, so it was dropped, leaving 770 app-side candidates (665 unique). A naive substring check against the five existing catalog files flagged 222 as possibly uncovered; manually opening each source file behind those hits found the great majority were false positives (the catalog already paraphrases or quotes the same text under a different heading, or the string was a design-harness fixture, an internal code comment, or a raw enum discriminant never shown verbatim). Genuinely uncovered: one whole feature (the command finder / `Cmd`+`K` palette), the entire "new session" naming/renaming board and its error vocabulary, the slash-action result-feedback lines, one dead field, and a full end-to-end keyboard table that no existing section assembles in one place. Coverage estimate: roughly 97% of real user-visible strings were already in mender-01..05; the gaps below are the real remainder.

## Every key

One listener owns the keyboard app-wide (`main.ts:2913`, `window.addEventListener('keydown', …)`), and it tries claimants in this fixed order, first match wins, nothing double-handles a key:

1. `pointing.held(event)` — true only while the **project settings window** is open (see below).
2. `Escape` → `pointing.escaped()` (the cascade below).
3. `metaKey || ctrlKey` → `pointing.ordered(event)`, i.e. `chordFor()` (the command table below). `altKey` alone is ignored outright.
4. `pointing.typed(event) || pointing.scrolled(event.key)` — the modal-input cascade below, then scroll passthrough.
5. Anything left over (a plain printable key with no modifier and no claimant) falls through unprevented to the line itself, which is how ordinary typing reaches the write line.

Source: `main.ts:2911-2934`.

### Global chords (`Cmd`/`Ctrl` + key), `board/finder.ts` `chordFor()` / `DOINGS`

One table, checked in this order: the finder chord first, then a bare digit, then the `DOINGS` list, each entry gated by which "standing" (`island`/`district`/`session`/`card`) it is offered in.

| Chord | Does | Verbatim name/about (shown in the finder) | Where offered |
|---|---|---|---|
| `Cmd/Ctrl+K` | `do:find` — opens the finder board | ("held with command" heading; entries below) | everywhere |
| `Cmd/Ctrl+1`…`9` | jumps to the *n*th lantern on the rail (sessions in a project, or projects on the island with nothing hanging) — `rail:${n-1}` | only if `n <= hanging` count | everywhere |
| `Cmd/Ctrl+T` | `new` — **"start a session"** / **"cut a worktree and put somebody in it"** | district, session, card |
| `Cmd/Ctrl+R` | `do:rename` — **"call this session something else"** / **"your name for it outranks the agent"** | session, card |
| `Cmd/Ctrl+I` | `card` — **"what this session works with"** / **"who is in there, what it thinks with, what it can reach"** | session, card |
| `Cmd/Ctrl+N` | `do:found` — **"found a project"** / **"put a checkout on the island"** | island, district, session, card |
| `Cmd/Ctrl+W` | `do:out` — **"back out to the island"** / **"let go of what is open"** | district, session, card |
| `Cmd/Ctrl+[` | `do:back` — **"back"** / **"where you were before this"** | everywhere |
| `Cmd/Ctrl+]` | `do:forward` — **"forward"** / **"where you were before you went back"** | everywhere |

Source: `board/finder.ts:36-109`.

### The Escape cascade (`main.ts:2270-2410`, `escaped()`)

Escape lets go of exactly one half-finished thing at a time, checked in this order — a half-typed line before the board it's on, a board before the one under it:

1. Finder open + text typed → clears the typed text. Finder open, empty → closes the finder.
2. Writing a commit message, text present → clears the typed text. Empty → closes the commit board, goes home.
3. `/agent` card mid-question → un-asks it. Card showing a sub-panel → hides it. Card open at all → steps back to the plain transcript (not all the way to the island).
4. Sending a PR title, text present → clears it. Empty → closes the PR board, home.
5. Shell, text present → clears the typed line. Empty → stops talking to the shell, home.
6. Folder search (`hunt`), text present → clears it. Empty → closes the search, back to the folder or home.
7. Naming a new file/folder in the walked folder → cancels the name.
8. Reading a file's blame → back to reading the file (not out of it).
9. Renaming a file → cancels the rename.
10. File asking "throw it away?" → answers no.
11. Editing a line of a file, half-written → cancels that edit. Otherwise closes the file, back to the search/folder/home.
12. Walking a folder → up one level; from the top, closes the folder view, home.
13. Reading a change: asked "throw it away?" → no. Read from inside a commit → back to that commit. Otherwise closes, home.
14. (Falls through further to district/session-level closes not enumerated here — see `mender-02-yard.md` "Escape stepping (the ladder)" for the outer steps once nothing on the board itself claims it.)

Separately, `line.ts:190-208` (the write line itself) and `yard.ts:201-213` (the slash/`@` menu) each intercept Escape *before* it reaches the window listener, and explicitly `stopPropagation()` so it cannot double-fire: a half-written line clears first, then a second Escape (only once the line is empty) reaches `empty()` → `does.leave()`. The slash/`@` menu's own Escape (only while the menu is open) just closes the menu and remembers `dismissedAt` so it stays shut until the text changes.

### Modal-input cascade (`main.ts:2464-2591`, `typed()`)

Whichever one of these is active claims `Enter`/`ArrowUp`/`ArrowDown`/`Backspace`/any single printable character; anything else (function keys, arrows when nothing applies) falls to `yard.scrolled(key)`. Checked in this order:

| State | Enter | Arrow Up/Down | Backspace/typed char | Notes |
|---|---|---|---|---|
| Finder (`looking`) | picks the highlighted row, or closes the finder if none | steps the highlighted row | edits the typed text | letters narrow the list live |
| PR title (`sending.written !== undefined`) | opens the PR | — | edits the title | rewrites the PR board each keystroke |
| Shell (`talking`) | sends the line + `\n` to the PTY | — | edits the pending line | Return hands the whole line, nothing per-keystroke |
| Folder search (`hunt`, no file open) | opens the highlighted result | steps the highlighted row | edits the search text, re-searches | same mechanics as the finder |
| Naming a new file/folder (`walking`, naming active) | creates it | — | edits the name | trailing `/` makes a folder |
| Renaming a file (`opened.renaming`) | commits the rename | — | edits the new name | |
| Editing a file line (`opened.fixing`) | writes the line to disk | — | edits the line | the one place typing reaches disk |
| Writing a commit (`writing`) | — | steps which file is highlighted (to toggle it in/out) | — (no text field) | |
| Naming/retitling a session (`titling`/`naming`) | — | — | — | keyboard falls through to the write line itself, which owns naming |
| A question at the gate (`saying.asked()`) | — | — | only digits `1`-`9` are claimed | answers that option; every other key is ignored so answering can't happen by accident while typing |
| Plain yard, nothing above active, `yard.showing` false | opens the walked-to row | walks the board's own keyboard cursor | — | |
| Plain yard otherwise | sends the highlighted line if one is walked | walks the cursor | — | everything else is writing, handled by the line |

### Slash / `@` menu keys (already in `mender-02-yard.md`, restated for completeness)
Arrow Up/Down steps the row; Tab (no shift) picks it; Return picks the highlighted row instead of sending, when the keyboard's mark is inside the open menu; Escape closes the menu and remembers the dismissal. `yard.ts:201-213`, `line.ts:180-208`.

### Scroll passthrough (`scrim.ts:115-135`, already in `mender-02-yard.md`)
Any Arrow/Page/Home/End key not claimed above scrolls the open reading overlay: Up/Down 60px, PageUp/PageDown a page minus 40px, Home/End to the very top/bottom.

### Project settings window (`yard/settings.ts`, `main.ts:2255-2268`)
This is the one place the global listener defers first (`pointing.held`). While the settings window is open: `Escape` calls `up.ui.escaped()` (closes the window, same as clicking outside or the close mark); every other key is prevented from reaching the session underneath *unless* it lands inside the window's own DOM (`up.ui.holds(event)`) or is `Tab` (left to the browser's native focus order). The project-name field additionally intercepts `Enter` to blur itself (which commits the rename) rather than inserting a newline. `settings.ts:105-111`, `main.ts:2258-2267`.

## Command finder / `Cmd`+`K` palette

**What it is, from the user's side.** A second way into anything besides clicking the island: press `Cmd/Ctrl+K` anywhere and a board opens listing every running session, every project, and everything the village itself can do — narrowing as you type, walked with arrows, opened with Return. It exists because the island stops being the fastest way to reach a session once there are many of them ("eleven sessions across four projects is a lot of water to cross to reach the one you were just in" — `finder.ts:9-11`).

**Where/how reached.** `Cmd/Ctrl+K` from anywhere (`island`, `district`, `session`, `card`); the same key also closes it (re-opens finder state each time). Not a floating field — it is drawn as a board, same wood as everything else.

**Layout, top to bottom (`finding()`, `finder.ts:129-188`):**
- Title: **"what are you after"**
- A blank gap, then the typed text as a `typed` row, then another gap.
- Matching sessions first (title, or `title · project name` when a project name is known), each with a mood mark in the left margin: `…` working, `?` asking, `✗` hurt, `·` otherwise (`markOf()`, `finder.ts:190-195`).
- Then matching projects, marked `#`, faded tone.
- If nothing at all matched: **"nothing by that name."** (faded), and the list stops there.
- Up to 12 sessions/projects are shown (`SHOWN = 12`); beyond that, a faded line **"and `<n>` more."**
- Then, only if the typed text also matches a village "doing" by name or description, a gap, a heading **"held with command"**, and one entry per matching doing — margin shows its chord letter, text is `"<name> · <about>"` (the same name/about text as the chord table above), faded tone.

**Matching.** Case-insensitive substring match against the session/project name, or (for doings) against either the name or the about text. Sessions list before projects; the village's own doings always come last, "because you know where those are — they are on this list to be discovered once."

**Keys.** Same mechanics as every other typed-and-walked board on this app: letters narrow it, Arrow Up/Down walks it, Return opens whatever is highlighted (or closes the finder if nothing is). See the "Modal-input cascade" table above.

Source: `board/finder.ts` (whole file, 195 lines), wired into `main.ts` via the `looking` state referenced throughout the keyboard cascade. Cited only in passing in `mender-05-history-ledger.md` rows ST-33 and UI-26 ("board/finder.ts chordFor()/DOINGS table") — never written up as a feature in 01-05.

## Starting and renaming a session

**What it is, from the user's side.** Pressing the empty hook on the rail (or `Cmd/Ctrl+T`, or the finder's "start a session") opens a small board asking what the session is for; typing a sentence and pressing Return cuts a worktree and hands that first sentence straight to the new agent. Renaming an existing session (`Cmd/Ctrl+R`) opens a similarly small board with the branch name shown for reference and a line to type the new title.

**New-session board (`asking()`, `main.ts:2699-2712`):**
- Title: **"a new session"**
- Faded line: **"on the `<district name, lowercased>`"**
- Gap, then faded prose: **"say what you want doing. it gets its own branch, and it will name itself."**
- Gap, then the typed text as a `typed` row.

Pressing Return (`begin()`, `main.ts:1851-1875`) rewrites the board to title = what was typed, gap, faded line **"cutting a worktree…"**, and calls the backend with no timeout ("a worktree on a big repository is minutes of copying"). On failure: `say(whyNot(error), 6000)`, the naming board is torn down, and the camera flies back out to the island.

**Rename-session board (`retitling()`, `main.ts:2725-2740`):**
- Title: the task's current title
- Faded line (kept to its tail if long): the branch name
- Gap, plain line: **"call it what?"**
- The typed text as a `typed` row.
- Gap, faded line: **"return to keep it. escape clears it, again to leave it alone."**

**Error vocabulary, `whyNot()` (`main.ts:2743-2748`)** — used for this flow, for bringing a not-here agent onto the machine, and for a failed file-diff read (three call sites: `main.ts:972`, `1240`, `1869`). This closes an "unverified/not read in full" note left in `mender-03-board.md`'s Unverified section:
- `kind: 'refused'` → the server's own `because`, or **"the worktree was refused."** if none given.
- `kind: 'taken'` → **"something is already standing in that building."**
- `kind: 'already-here'` → **"`<name>` is already standing here."**
- `kind: 'nameless'` → **"a task needs a name."**
- anything else (default) → **"that district has no project on it."**

Not previously documented at all: the entire `asking()`/`retitling()` board layout and copy — only the empty-hook rail label ("a new session") and the breadcrumb step name were in the catalog; the board itself, shown after pressing it, was not.

Source: `main.ts:2699-2758`, `board/finder.ts` (chord that opens it), `board/row.ts` (`Row` shape).

## Slash-action result feedback (`obey()`, `main.ts:1970-2013`)

The village's own slash commands (`/keep`, `/forget`, `/model` etc., `/agent`) are executed by `obey()`, which wipes the line and then shows a `say()` notice reporting what happened. `mender-03-board.md` documents the palette entries and mechanism that route into this function but not its own feedback text:
- `/keep <text>` → **"kept as "`<title>`". a slash brings it back."** (4000ms)
- `/forget` (second press, actually forgetting a kept prompt) → **""`<title>`" is forgotten."** (3000ms)
- `/model`/`/mode`/`/effort`/`/collaboration` (any `does:'set'` choice) → on success, **"`<meant.name>`."** (3000ms — i.e. just the chosen option's own name, restated as confirmation); on failure, the server's own `because` if it refused, else **"that would not take."** (6000ms)
- `/agent` (`does:'card'`) → no notice text; opens the card directly.
- Plain send (`does:'send'`) → if the agent didn't hear it (`!heard.success`), the server's own refusal reason, or **"nobody heard that."** (6000ms) as fallback.

Source: `main.ts:1930-1949` (`tell()`), `main.ts:1970-2013` (`obey()`).

## Corrections to other sections

- **`mender-03-board.md`'s Unverified section can be closed.** It flags `whyNot()` (`main.ts:2743-2758`) as "not read in full … a small local vocabulary of file-read failures." Having now read it: it is not file-read-specific — the same function backs the new-session/worktree-cut failure, the "bring an agent here" failure (already correctly cited at line 168 of that file), *and* the change-diff-read failure. Its five cases are the exact list given above under "Starting and renaming a session."

- **Dead field, not previously noted: `Yard.project.costs`.** `yard/from.ts:120` computes `costs: costOf(tasks.length)` on every `yardOf()` call, and `costOf()` (`from.ts:362-366`) produces its own, differently-worded cost text — **"the folder stays exactly where it is"** / **"the one session in here go, the folder stays"** / **"all `<n>` sessions in here go, the folder stays"** — but nothing in `yard.ts` or anywhere else in the renderer ever reads `project.costs`. It is dead: the actual "Remove from Mender" cost line the user sees is a separate, independently-worded computation inline in `yard/settings.ts:269-273` (**"the folder stays where it is"** / **"its one session is taken down, the folder stays"** / **"its `<n>` sessions are taken down, the folder stays"**), which is the one `mender-02-yard.md` already documents correctly. `mender-02-yard.md`'s existing "dead fields" note (§404, `Lantern.ground`/`Lantern.unread`) is the right place for this one to join, not a bug in that section, just an omission — `project.costs` and `costOf()` were not mentioned there.

## Coverage note

Everything else the naive substring scan flagged (roughly 190 of the 222 candidates) was verified by hand to already be in mender-01..05, usually paraphrased or quoted under a different heading than the literal grep hit suggested (e.g. `trouble.ts`'s whole git/filesystem/GitHub error vocabulary, the pull-request board's review/check states, the checkout board's ahead/behind push-pull lines, the settings window's danger-zone cost line, `agents.ts`'s mood/doing-text vocabulary) — or were not user-visible at all (design-harness fixture data in `yard/sample.ts`, sprite asset filenames in `yard/sprite.ts`, internal doc-comment prose in `agents.ts` that happened to start with a capital letter or contain a space). `packages/village/src` was excluded up front as pure map-geometry code with no strings a user reads. No other contradictions between the existing five sections and the code were found beyond the two above.
