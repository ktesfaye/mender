# The board and the checkout

This covers `apps/mender/src/renderer/board/` (21 files) and the parts of `apps/mender/src/renderer/main.ts` that build, wire and drive them: the checkout board for a project and a session, reading/undoing a change, committing, reading a commit, sending/publishing/pulling, the folder, the finder-inside-a-checkout (looking.ts), who-touched-it (blame), file make/rename/delete, line editing, the real shell, the pull-request board, the `/agent` card, taking a session down, and markdown rendering. Row rendering itself (gold, pressable, settle-back, failures-stay) lives in `apps/mender/src/renderer/yard/` and is **not** re-described here except where a board feature's own text depends on it (noted as out-of-scope pointers).

## Checkout board (district.ts, drives both a project's and a session's board)

### Opening / place resolution
- `openCheckout(client, place, changed)` in `board/district.ts:99-175` opens a live board for one `Place` (a project or a task). It subscribes to two live replicas off `client.git.checkout.model`: `head` and `status`. Any change to either triggers a full rebuild and the `changed` callback (`district.ts:124-137`).
- On a head change it also re-reads the commit log (`readLog`, `district.ts:145-166`), because a new commit moves HEAD.
- `place.since` controls history scope: `undefined` (a project/district) reads the last `BRIEF = 5` commits under the heading **"lately"**; a defined string (a session's base branch) reads the last `LATELY = 24` commits since that base under the heading **"committed here"**; `null` (a session with no recorded base) reads no history at all (`district.ts:52-54,145-166,228-231`).
- If the checkout path can't be parsed as a native absolute path, the board reads only: title, path (faded, kept to tail), gap, and the line **"this checkout is not where it was."** (sore tone) — no further rows, no live subscription (`district.ts:104-116`).
- Wired from `main.ts:228-254` (`openCheckoutBoard`): shows `{ kind:'line', text:'reading the checkout…' }` first, closes any previous live board, then opens. `plainCheckout()` (`main.ts:263-275`) is the negative-space guard: the checkout board is only rewritten in place while nothing else (a file, a commit, the folder, the shell, sent, hunt, naming, titling, looking, card) is laid over it.
- `Place.turn`, `Place.lines`, `Place.tail` are supported by `district.ts` (`turn` makes the title pressable; `lines()`/`tail()` inject extra rows before/after the git section) but **the one call site never sets them** (`main.ts:237-247`) — currently dead/unused hooks.

### Layout, top to bottom
1. Title = place name (or project name for the district itself), pressable via `place.turn` if set (`district.ts:184`).
2. Path line, faded, kept to tail, pressable → `pick:'inside'` (walks into the folder) (`district.ts:186`).
3. `place.lines?.()` (currently always empty).
4. Gap, then the standing line (`standing(head)`), then `sending(head)` rows.
5. Gap, `→ open a shell in here` (`pick:'shell'`, faded).
6. `→ what is open for this branch` (`pick:'sent'`, faded).
7. Gap, heading **"uncommitted"**, then the file list or one of: `status.message` (sore) on `kind:'error'`; **"more than this board can hold."** (faded) on `kind:'too-many-files'`; **"nothing. the tree is clean."** (faded) if no entries.
8. Each changed file: `entry` with git's two-letter mark (`district.ts:20-31`), path (kept tail), tone by `toneOf` (added/untracked → keen; deleted/unmerged → sore; else faded), `pick:'change:<path>'`. Capped at `CHANGES = 40`; overflow says **"and N more."** (faded). Then `+ write a commit` (`pick:'commit'`).
9. If `lately.length`: gap, heading **"lately"** or **"committed here"** (per above), then each commit as an `entry` whose mark is the relative-age string from `since()` and text is `saying(commit.subject)` (feat(scope): stripped), `pick:'made:<hash>'`.
10. `place.tail?.()` (currently always empty).

### The standing line (`district.ts:317-329`)
- No head yet: **"reading the checkout…"**
- Detached HEAD: **"adrift at `<shortHash>`"**
- Unborn branch: **"on `<branch>`, nothing committed yet"**
- No upstream or unresolved tracking: **"on `<branch>`"**
- Tracking resolved: **"on `<branch>`, N ahead and/or M behind"** (only the nonzero side(s) shown, joined with "and").

### Age mark (`since()`, `district.ts:261-272`)
Two-character-plus-space margin mark: `now` (<60 min), `Nh` (<24h), `Nd` (<7d), `Nw` (<9 weeks), `Nmo` (<12 months, using 30.4-day months), else `Ny`. All `Math.floor`.

### Send/publish/pull offers (`sending()`, `district.ts:282-309`)
Lines come and go rather than a button graying out, matching MENDER.md's stated rule:
- No head / detached / unborn: nothing offered.
- Upstream `kind:'none'`: `+ send this branch up` (`pick:'publish'`).
- Tracking unresolved: nothing offered.
- `ahead > 0`: `+ send {the one commit|all N commits} up` (`pick:'push'`) — `counted()` says "the one commit" for 1, "all N commits" for N (`district.ts:312-314`).
- Always (if tracking resolved): `+ bring N commits down` if `behind`, else `+ bring down anything new` (`pick:'pull'`) — always offered because nothing here asks the remote first; pulling is how you find out.
- Errand execution in `main.ts:1720-1758` (`errand`): says **"bringing it down…"** (60000ms), **"sending it up…"** (60000ms), or **"sending it up to `<remote>`…"** (60000ms) while waiting, then **"brought down."** / **"sent up."** or `trouble(error)` (6000ms). Publish resolves the remote from `client.git.repository...remotes`, preferring one named `origin`, else the first; if there is none: **"this checkout has nowhere to push to."** (6000ms).

## Reading a change (changed.ts, driven from main.ts openChange/undo)

### Opening
- `pick:'change:<path>'` → `main.ts:962-977` (`openChange`): sets `reading`, shows `opening(path)` rows (title, folder line, gap, **"reading it…"** faded), calls `client.changes.file`. A stale response (reading identity changed) is dropped. On failure shows `unreadable(path, whyNot(error))` (sore).
- `at` (a specific `{ sha, from }` pair) is set when a change is opened from inside a commit's file list (`pick:'in:<path>'`, `main.ts:2149-2154`); in that case the "undo" offer is never shown (`rowsForChange`, `main.ts:982-986`) — only a working-tree change can be undone.

### Layout (`changed.ts:12-45`)
Title = file basename; folder line (faded, kept front) if the path has a directory, else just a gap; then one status line (faded): via `what()`:
- new: **"new, N in and M out"** or **"new and empty"** if no lines.
- gone: **"gone, N lines with it"**.
- binary: **"not writing, so there is nothing to read here"**.
- same: **"nothing in it changed"**.
- else: **"N in and M out"** (only nonzero counted sides joined).
- Diff lines: each `line` row, tone `+`→keen, `-`→sore, else faded; kept front, face `type` (monospace, so the added/removed columns line up). A line starting with `…` is "how much unchanged went by": rendered as its own paragraph, gap-line-gap, faded — not scrolled through as ordinary diff context.
- If `change.more` is set: gap + **"and N more lines."** (faded).

### Undo (two presses, `changed.ts:56-74`, driven by `main.ts:994-1015`)
- First press (`pick:'undo'`): offered row `✗ throw this file away` (new file) or `✗ put this file back the way it was` (faded), sets `read.asked = true` and rewrites — this is the "first press names the cost" line the app rule describes.
- Second press (`pick:'undo!'`): `✗ press again and this file is gone` (new) or `✗ press again and {that one line is|those N lines are} gone` (existing, `counted()` sums `added+taken`), sore tone.
- Actual undo calls `client.git.checkout.model.mutate('revert', ...)`. Failure → `say(trouble(error), 6000)`. Success → `stopReading()` (back to the board it was opened from) and `say('thrown away.'|'put back.', 3000)` depending on `change.kind === 'new'`.

### Opening/error states
- `opening(path)` (`changed.ts:82-88`): title, folder line, **"reading it…"** (faded).
- `unreadable(path, because)` (`changed.ts:91-97`): title, folder line, `because` in sore tone — `because` comes from `whyNot(error)` in `main.ts:2743-2758` (not read in full here; a small local vocabulary of file-read failures, main-process boundary).

## Committing (committing.ts, driven by main.ts openCommit/holding/commit)

- Opened via `pick:'commit'` → `openCommit()` (`main.ts:1631-1649`): everything that changed goes in to start; `writing.held` starts as an empty `Set`.
- Layout (`committing.ts:19-61`): title = checkout name; gap; heading **"going in, press to hold one back"** listing each going file as an entry (mark = git status letters, tone via `toneOf`, kept tail, `pick:'hold:<path>'`) — or, if none going, the line **"nothing is going in."** (sore); if any held back: gap, heading **"held back, press to put one in"**, each as `pick:'putin:<path>'` (faded); then gap, **"say what this does. return commits it."** (faded), and the typed line.
- Holding/putting-in toggles the `held` Set and rewrites (`main.ts:1662-1667`) — no server call until commit.
- `commit()` (`main.ts:1670-1712`): trims the message; empty → `say('a commit with nothing written on it is not a commit.', 4000)`. No files going → `say('nothing is going in.', 4000)`. Otherwise: unstages held-back paths first (if any), stages the going paths, and if staging fails → `say(trouble(error), 6000)`; commits, and on failure the same. On success: `writing = null`, `home()`, `say('committed.', 3000)`.
- There is no separate "staging area" concept surfaced anywhere; MENDER.md's "nothing happens to the checkout until you press return" is accurate — stage+commit both happen atomically inside `commit()`.

## Reading a commit (made.ts, driven by main.ts openMade)

- `pick:'made:<hash>'` → `openMade()` (`main.ts:1026-1055`): sets `looked` with `commit:null, files:undefined`, shows `unread()` (**"reading it…"**, faded) while it fetches the commit and its files in parallel. Stale reads dropped by identity check. If commit fetch fails: `unmade(trouble(error))` (sore). If the commit isn't found in this checkout any more: `unmade('that commit is not in this checkout any more.')`.
- Layout (`made.ts:13-47`):
  - `saying(commit.subject)` as prose (title-sized, since a sentence can't be a heading cut to width) — subject already run through `saying()` which strips a leading `type(scope)!: ` prefix (`FILED` regex, `made.ts:63,72-75`).
  - Body paragraphs via `why(commit.body)` (`made.ts:87-111`): drops trailing trailer lines (`^[A-Za-z][A-Za-z-]*:\s`) and trailing blank lines; unwraps git's ~70-column hard-wrapping inside a paragraph back into one line, but leaves indented/bulleted/numbered lines alone. Each paragraph is its own gap+prose row, faded.
  - Gap, `by(commit)`: **"`<author>`, `<when>`"** plus, if not yet pushed, **"still only here"**, plus any tags, joined with " · " (`made.ts:119-124`).
  - `when()` (`made.ts:127-135`): time-of-day (e.g. "3:45 pm") if <1 day old, weekday name if <7 days, `"<day> <month>"` if <300 days, else with year appended.
  - Gap, then file list: while `files` is `undefined`, **"reading what it touched…"** (faded); if `files.length === 0`, **"it touched nothing."**; else heading = `counted(files)` — **"N file(s), A in and D out"** (only nonzero sides) — then each file as an entry (mark A/D/R/U/M via `mark()`, tone sore/keen/faded for deleted/added/other, kept tail, `pick:'in:<path>'`).
- Pressing a file in the commit (`pick:'in:<path>'`) opens the same change-reading board pinned to that commit's diff (`at: { sha: commit.hash, from: commit.parents[0] ?? null }`) — "the same wood a working change is read on."
- `showMade()` (`main.ts:1619-1622`) steps back from a file-in-a-commit view onto the commit view.

## Publishing/pushing/pulling
Covered above under "Send/publish/pull offers"; the entry points on the checkout board are `pick:'publish'|'push'|'pull'`, all routed to `errand()` in `main.ts`.

## Walking the folder (inside.ts, driven by main.ts walkIn/openFile/makeIt/renamed/binned)

- `openTree()` (`inside.ts:37-178`) opens a live `FileTreeModel` keyed on `{ root, sessionId: 'village:<checkout>', exclusions: DEFAULT_WATCHER_EXCLUDE }` — the same exclusions the file watcher uses.
- Entered via `pick:'inside'` → `walkIn()` (`main.ts:1064-1104`). If the same checkout's tree is already held open (`kept.path === place.path`), it's walked back to the top instantly with nothing to await — this is the "walking back in is instant" behavior noted in the file's own comment. Otherwise the old tree is released (`letGoOfTree`) and a new one opened, showing **"reading it…"** meanwhile.
- Layout (`inside.ts:75-149`): title = current folder name (or the place name at the top); path line (checkout root or current relative path, faded, kept tail); gap; `→ look for something in here` (`pick:'hunt'`, faded); then either `+ put something new in here` (`pick:'make'`) or, while naming, **"name it. a slash at the end makes a folder."** + typed line. Then, if the folder entry isn't loaded yet, **"reading it…"**; if loaded but empty, **"nothing in here."**; else folders first (mark `→`, kept tail, `pick:'into:<path>'`) sorted by `localeCompare`, then files (mark `·` for a symlink else blank, kept tail, `pick:'open:<path>'`) sorted the same way. Each list is capped at `MANY = 300`; if folders+files together exceed `MANY*2`, a trailing **"and N more."** line appears (a quirk: the overflow math compares against `MANY*2`, i.e. up to 300 folders *and* 300 files can show before it fires).
- Walking: `pick:'into:<path>'` → `walking.walk(path)`; up/escape walks back one level; both reset any in-progress naming.
- Making (`makeIt()`, `main.ts:1180-1198`): a trailing `/` makes a folder (`client.files.fs.createDirectory`) else a file (`createFile`). Failure → `say(unwritten(error), 6000)`. Success → naming cleared, `say('made.', 3000)` for a folder or `say('made. press it to write in it.', 3000)` for a file.

## Reading a file (reading.ts, driven by main.ts openFile/fixLine/wroteLine/blamed/binned/renamed)

- `openFile()` (`main.ts:1107-1119`) shows `unopened(path)` (**"opening it…"**, faded) then the live file content via `client.files.content.state(...)`.
- Content-kind branches (`reading.ts:38-52`): `binary` → **"`<size>` of something that is not writing, so there is nothing to read here"**; `too-large` → **"`<size>`, which is more than a board will hold."**; `unavailable` → one of **"there is no such file."** / **"this machine will not let anybody read it."** / **"it could not be read."** (sore), by `missing(code)`.
- Text: trailing empty line from a final newline is trimmed. Line count line: **"N line(s). press one to rewrite it"** if writable, or **"N line(s), and nothing here can change it"** if readonly (`how()`, `reading.ts:195-198`).
- Lines are shown in the type face, front-kept (indentation preserved), each pressable as `pick:'line:<index>'` unless readonly. Capped at `LINES = 2000`; overflow says **"and N more lines."**.
- Sizing (`sized()`, `reading.ts:215-219`): bytes under 1024 as `"N bytes"`, under 1MB as `"Nk"` (rounded), else `"N.Nmb"`.

### Line editing (one line at a time)
- `pick:'line:<n>'` → `fixLine()` (`main.ts:1122-1128`): guarded on `content.kind==='text'` and not readonly; sets `fixing = { at, written: <current line text> }`; that row becomes a `typed` row in place (face `type`) while every other line stays a plain row.
- Return commits it (`wroteLine()`, `main.ts:1131-1163`): if unchanged, just clears `fixing` and redraws (no write call). Otherwise writes the whole file with the one line replaced, using `precondition:{ kind:'etag', etag: content.etag }` — **the changed-underneath guard**: if the file moved since it was read, the write fails with `etag-mismatch` and nothing is written; the message is **"the file changed underneath you, so nothing was written. open it again."** (`trouble.ts:66`, surfaced via `say(unwritten(error), 6000)`). On success the file is re-read fresh and `say('written.', 2000)`.

### Blame ("who last touched it")
- `pick:'blame'` → `blamed()` (`main.ts:1252-1268`): calls `client.git.checkout.blame`; failure → `say(trouble(error), 6000)`; success sets `file.blame` and redraws through `read()`.
- Rendered by `whose()` (`reading.ts:141-160`): top line **"who last touched it. escape goes back to reading it."** (faded); if no hunks, **"nobody: it is not committed."**; else per run-of-lines: heading = `by(hunk)` = **"`<author>`, `<ago>`"** plus the commit summary if present, joined " · "; then the actual lines of that run (faded, kept front, no `pick`/line-editing while in blame view).
- `ago()` (`reading.ts:169-177`): "today" / "yesterday" / "`N` days ago" (<14d) / "`N` weeks ago" (<60d) / "`N` months ago" (<730d) / "`N` years ago" — a different phrasing scheme from the commit-list's `since()`/`when()` (three distinct relative-time vocabularies exist across district.ts, made.ts and reading.ts).

### Rename / throw away (`reading.ts:88-131`, driven by main.ts renamed/binned)
- Only offered when not readonly and not in blame view: `→ who last touched it` (`pick:'blame'`), `→ call it something else` (`pick:'rename'`), and `✗ throw this file away` / `✗ press again and this file is gone` (two-press, same pattern as undo).
- Rename does **not** ask twice — "a name is put back by typing the old one." First press (`pick:'rename'` in `main.ts:2116-2123`) turns the line into a typed field pre-filled with the current basename, with the line **"call it something else. return does it."** above it. `renamed()` (`main.ts:1201-1218`) moves the file on disk via `client.files.fs.rename`; failure → `say(unwritten(error), 6000)`; success closes the file view and redraws the folder, `say('renamed.', 3000)`.
- Delete (`binned()`, `main.ts:1271-1289`): first press sets `asked=true` and rewrites; second press (`pick:'bin!'`) calls `client.files.fs.delete`; failure → `say(unwritten(error), 6000)`; success closes the file view, redraws the folder, `say('thrown away.', 3000)`.

## The finder-in-a-checkout / looking.ts ("find a file by name" / "where is this written")

- `Hunt` state and `hunting()` render (`looking.ts`): one line at top switches mode: **"looking inside them. press to look for names"** or **"looking for names. press to look inside them"** (`pick:'flip'`), carrying whatever was already typed across (`hunted()`, `main.ts:1299-1315`, preserves `hunt?.written`).
- Empty query: **"say what is written in it."** or **"say what it is called."** depending on mode.
- While asking and nothing found yet: **"looking…"**. If the index hasn't finished reading the checkout: **"still reading the checkout…"** (distinguished from a genuine empty result — `hunt.unread`). If asked and truly nothing: **"nothing in here is."**
- Results: each file as an entry (`pick:'open:<path>'`), plus up to `SHOWN = 4` matching lines under it (indented 4 spaces, faded, type face, each also `pick:'open:<path>'`), with **"and N more in it"** if a file has more than 4 matching lines.
- Driven by `lookFor()` (`main.ts:1318-1342`): debounced by an incrementing `asked` counter so a stale answer for an earlier keystroke is dropped; calls `client.finding.written` (inside) or `client.finding.named` (names); on a `no-way-to-look` error, `say(error.because, 5000)`.

## Naming.ts (@ file-mention) — note

This file lives in `board/` but is wired from `yard/live.ts`, not from the board-driving parts of `main.ts` scoped here (it opens the same slash-style popup keyed off `@` while writing to an agent, not a board view). Documented briefly for completeness: typing `@partial` after a space (regex `AT = /(?:^|\s)@(\S*)$/`) debounce-queries `look(written)`, drops stale answers the same way the finder's line-lookup does, and offers matches ranked by `rank()` (basename first, directory as `about`). Picking one writes the whole path where the `@` was, followed by a space.

## The real shell (screen.ts + shell.ts + talking.ts)

- One shell per checkout, keyed by `{ workspace:{host:LOCAL_HOST_REF, path}, id:'village' }` — pressing shell twice on the same checkout reattaches to the same session (`talking.ts:42-47`).
- Started with `tmux: true` at a fixed grid of `COLS=120, ROWS=40` (`talking.ts:31-32,49-61`); without tmux installed the runtime falls back to a plain shell that dies with the app ("it is simply not there next time" — per the file's own comment). If start fails, `running:false` state with `stopped:'no shell would start here.'` is shown (`main.ts:1374-1384`).
- `Screen` (`screen.ts`) is a from-scratch VT100-ish grid emulator: tracks cursor row/col, a scrolling region (`top`/`bottom`, set by CSI `r`), saved cursor (`ESC 7`/`8`, CSI `s`/`u`), the alternate screen (CSI `?1049h/l`, `?47h/l`, `?1047h/l` — used by pagers/full-screen editors; nothing painted there enters scrollback), insert/delete line/char (`L`,`M`,`P`,`@`,`X`), scroll up/down (`S`,`T`), erase-in-display/line (`J`,`K`), cursor motion (`A-H`,`` ` ``,`d`,`f`), and a full reset on `ESC c`. Colour/bold/mouse-reporting/cursor-shape are explicitly parsed-and-ignored ("nothing the board draws"). Up to `KEPT = 4000` scrolled-off lines are kept as history (only for the primary screen, never the alternate one).
- `talking.ts`'s `catchUp()` re-reads the whole current snapshot (`handle.snapshot()`) rather than stitching deltas, re-synced against a `baseOffset`; if the requested window has slid past what's cached (long silence / huge build), the screen is reset and rebuilt from what's left rather than painting a stale grid.
- `shell()` render (`shell.ts`): title = checkout name; **"a shell, in this checkout"** (faded); then either `stopped` text (sore) if set, **"starting it…"** (faded) if not yet running, or up to `LINES = 1200` of the trailing scrollback (faded, kept front, type face) plus the typed input line.
- Persistence: because it's a tmux-wrapped terminal session in emdash's terminals runtime, it survives an app restart — the comment at `talking.ts:8-14` states this is the entire reason it's a shell "in the village" and not "in a window."
- Return in the shell sends `written + '\n'` via `shell.say()` and clears the typed buffer (`main.ts:126-136`) — intercepted specially because the board's line otherwise owns Return itself.
- Full-screen programs (per MENDER.md) draw correctly (cursor-addressed writes land in the right cell) but are "only legible, not usable" — confirmed structurally: `Screen` has no notion of sending input to a specific cell/cursor position beyond the one line at the foot of the board, i.e. there's no way to move a text cursor around mid-screen from the keyboard.

## The pull-request board (sent.ts, driven by main.ts openSent/openIt/doneWith)

- `openSent()` (`main.ts:1414-1467`): shows **"asking the other end…"** (waiting state) while it resolves the current branch, finds `origin` (or the first remote), registers/syncs the repository with `client.pulls`, and looks up any PR for that head branch. If the checkout isn't on a branch: `say('this checkout is not on a branch.', 5000)` then `home()`. If there's no remote: `say('this checkout has nowhere to send anything.', 5000)` then `home()`.
- No PR yet (`opening()`, `sent.ts:60-74`): title, **"nothing is open for `<branch>`."** (faded), gap, then either `+ open one` (`pick:'open-pull'`) or, once opened (`written !== undefined`), **"say what this is for. return opens it."** + typed line.
- `pick:'open-pull'` (`main.ts:2081-2087`) just starts the typed field (`written:''`); `openIt()` (`main.ts:1476-1513`) validates a non-empty title (else **"a pull request with nothing written on it is not one."**, 4000ms), resolves the repo's actual default branch (falling back to `'main'` if unknown) as the base, shows **"opening it…"** while creating it via `client.pulls.createPullRequest` (never draft), and on failure shows `refused(error)` (6000ms) while preserving what was typed; on success `say('opened.', 3000)` and reloads the PR board.
- With a PR (`sent.ts:36-56`): prose = PR title; faded `where(pull)` line = **"`<head>` into `<base>`"** plus, in order, `merged` / `closed without merging` / `still a draft` (only one of these three), plus **"N in and M out"** if additions/deletions are known — joined " · "; then, if present, the description split into paragraphs/blank gaps (capped at 40 lines); heading **"the machines"** + `machines(pull)`; gap + `landing(pull)`.
- Checks (`machines()`, `sent.ts:94-118`): **"nothing ran."** if none. Otherwise every failed check gets its own sore entry (`✗`, kept tail); every still-running check gets its own faded entry (`· <name>, still going`); everything else collapses to one keen entry **"one is happy"** / **"N are happy"** (`✓`). `failed()` treats `failure`/`timed_out`/`action_required` conclusions as failed.
- Landing (`sent.ts:133-156`): merged → **"it went in."** (faded). Closed → **"it was closed without going in."** (faded). Draft → **"nobody is being asked to look at it yet."** + `+ say it is ready` (`pick:'ready-pull'`). Otherwise: a `review(pull)` line (**"somebody has looked at it and is happy."** / **"...wants something changed."** / **"it needs somebody to look at it."** / **"nobody has said anything about it."**, by `reviewDecision`), then, if `mergeableStatus === 'CONFLICTING'`, **"it and the other end have both moved."** (sore) and stop; else three offers: `+ squash it in` / `+ merge it in` / `+ rebase it in` (`pick:'merge-pull:squash'|'merge'|'rebase'`).
- `doneWith()` (`main.ts:1516-1534`): waiting text **"saying so…"** for ready-for-review, else **"putting it in…"**; failure → `refused(error)` (6000ms), state restored; success → `say('said.', 3000)` (ready) or `say('it went in.', 3000)` (merge), then reloads the PR board.

## The `/agent` card (card.ts, driven by main.ts showCard / card press handling)

- `openCard()` (`card.ts:40-106`) subscribes to the agent `Kit` live model plus, if the checkout path parses, `status` (for uncommitted-file count) and `head` (for unsent-commit count) — all three keep `ending` current live, independent of whether "when it is over" is actually being shown.
- Entered via `pick:'card'` from the slash (`does:'card'`) or the finder/chord `i`, or by turning the board over from a session view. `showCard()` (`main.ts:797-824`) tears down any other open board first.
- While `kit` hasn't arrived yet: title, branch (faded, kept tail), gap, **"looking…"** (faded), then the "when it is over" section (see below) still appended — a sleeping/unread session still shows what taking it down would cost.
- **Who works here**: heading, then each installed-or-current hand as an entry — mark `●` (ink) if it's the current one, `·` (faded) otherwise, `pick:'hand:<id>'`. Only hands that are `here` (installed) or the current one are listed by default. If `showing` (folded open via `pick:'elsewhere'`), every not-here hand is also listed, mark `+`, text **"`<name>`, not here yet"**, `pick:'bring:<id>'`. If not showing and there are any away hands: one summary entry **"N more speak the protocol. press to bring one here"** (`pick:'elsewhere'`). Then a fixed faded prose line: **"changing who works here sends the one who was here home. what you say next starts the new one, in the same checkout."**
- If `!kit.awake` (nobody has spoken to the session yet): gap + faded prose **"what they think with, how they work and how hard they think are theirs to offer, not ours to guess, so they are not here until somebody has spoken to them."** — and the card stops there (no model/mode/effort/collab/tools/knacks sections), going straight to "when it is over."
- Otherwise, four `choices()` sections in order — **"thinking with"**/model, **"how it works"**/mode, **"how hard it thinks"**/effort, **"how it goes about it"**/collab — each skipped entirely if the agent offers no choices for it (`choices()` returns early on empty `all`). Each choice: mark `●`/`·` for selected/not, text = name (+ " · about" if present), `pick:'<what>:<id>'`.
- **What it can reach**: heading; **"nothing beyond this machine."** if no tools; else each tool as an entry, mark `●`/`·`, text = name (+ " · trouble" if the tool has a problem, in which case tone is sore instead of ink/faded), `pick:'tool:<name>'`. If any tools exist, a trailing faded prose: **"a server turned on or off here is on or off for this agent everywhere, and it takes hold next time a session starts."**
- **What it has been taught**: heading; **"nothing yet."** if no knacks; else each as an entry, mark `■` if `from==='here'` else `·`, tone always ink, not pressable (no `pick`).
- Toggling a tool or choosing model/mode/effort/collab calls `client.agents.tool` or `client.agents.choose`; on a `refused` error, `say(error.because, 6000)` (`main.ts:2190-2202`).
- Bringing a not-here agent onto the machine (`bring()`, `main.ts:1228-1249`): `say('bringing them here…', 600000)` while it runs whatever installs that agent's CLI; on failure (including a thrown exception, caught) `say(whyNot(error), 8000)`; on success either **"they are here now."** or **"it ran and they are still not here. `<reason>`"** (10000ms) if the install completed but didn't produce a working agent.

### When it is over (`card.ts:274-326`, shown at the bottom of every card state)
- Heading **"when it is over"**, then a `losing` line built from: **"N file(s) in there nobody has committed"** if `ending.uncommitted`, and either **"a branch nowhere else has ever seen"** (unsent is `null`, meaning no upstream at all — deliberately not guessed as a number) or **"N commit(s) nowhere else has"** (unsent is a positive number). If nothing is lost: **"everything in there is committed and sent."** (faded). If something is: **"there `is/are` `<a>` and `<b>`."** (sore), joining whichever of the two clauses apply with "and".
- First press: `✗ send everybody home and take this down` (faded, `pick:'end'`).
- Second press (`ending.asked`): `✗ press again and all of that is gone` (if anything is lost) or `✗ press again and it is gone` (sore, `pick:'end!'`).
- `ending()` in `main.ts:1569-1584`: first press sets `asked=true` and rewrites. Second press: `say('sending everybody home…', 30000)`, calls `client.tasks.abandon`, `say('taken down.', 3000)`, then returns to the district board.
- `unsentIn()` (`card.ts:336-341`): detached/unborn HEAD → `0`; no upstream → `null` (the "nobody has ever seen this branch" case); upstream tracking unresolved → `0`; resolved → the actual `ahead` count.

## Markdown rendering on the board (writing.ts)

Used by the yard's transcript, not by `main.ts`'s board-driving code directly (no import from `main.ts`), but documented here since it's the file in `board/` that implements MENDER.md's "agents write in markdown... read rather than shown":
- Explicitly not a full renderer: "nothing to make bold with." Headings (`#`-`######`) become uppercase ink lines with a blank line above (collapsing any existing gap first) — weight is faked with capitals + air, no size/weight distinction between heading levels.
- Horizontal rules (`---`/`***`/`___` alone on a line) become a 24-character `─` rule (`RULE = 24`), deliberately short of the board width "so it reads as a pause."
- Fenced code blocks (```` ``` ```` or `~~~`): each line prefixed with `│ ` (`EDGE`), faded, kept front, type face; the **entire block shares one `pick:'keep:<block>'`** so pressing anywhere in it copies the whole block to the clipboard and lights up as one unit (implements "a block of code is pressed and it is yours").
- Blockquotes (`> `): rendered as `prose` with mark `│`.
- Bullets (`-`/`*`/`+`): mark `·`; numbered lists (`1.`/`1)`): mark is the number + `.`. Indentation depth is clamped to 3 levels, each level = `IN = 2` chars via the row's `in` field.
- Tables: measured and padded into real columns (`tabled()`, `writing.ts:171-211`) rather than left as raw pipes, because hand-written markdown tables rarely align in source; the separator row of dashes is replaced by a `─` rule the width of the header row; set in type face since alignment only means something in a monospace column.
- Ordinary paragraphs: consecutive plain lines are gathered into one paragraph and re-wrapped by the board's own width rather than kept at markdown's hard-wrapped width.
- Inline: `` `code` `` becomes a `quoted`-tone run (reads "cool," i.e. visually distinct — the one thing that survives markdown emphasis); `[text](url)`/`![alt](url)` collapse to just the text/alt; `**bold**` and single `*italic*` (but not `_italic_`, deliberately, "a word with one in the middle is a name, not somebody leaning on a word") both lose their marks and keep their words with no visual distinction at all — true emphasis is unrepresentable on this board.

## Errors, vocabularies and timings (trouble.ts)

Three closed vocabularies, each mapping a `type` discriminant to an exact, hand-written sentence, falling back to the server's own (lowercased-first-letter) message when nothing matches or when the message itself is the useful part:
- `trouble()` — git operations: `nothing_to_commit`, `empty_message`, `hook_failed` (keeps hook output), `no_remote`, `no_upstream`, `remote_not_found`, `auth_required`, `auth_failed`, `network_error`, `rejected` (keeps remote's reason), `hook_rejected` (keeps remote hook's reason), `diverged`, `conflict`, `resolution_failed`, `git_error`, default.
- `unwritten()` — filesystem writes: `etag-mismatch` (the changed-underneath guard, quoted above), `not-found`, `permission-denied`, `is-a-directory`, `not-a-directory`, `already-exists`, `invalid-path`, default (uses the raw message if present).
- `refused()` — GitHub/pull-request operations: `invalid_repository`, `remote_not_ready`, `cross_host_pr`, `host_unreachable`, `auth_required` (tells the user to run `gh auth login`), `forbidden`, `not_found`, `rate_limited`, `merge_conflict`, `not_mergeable` (keeps GitHub's reason), default.
- `lowered()` (`trouble.ts:51-54`) takes only git's first output line and lowercases its first letter if it looks like a shouted capitalized word, so a spliced-in git message reads as part of the sentence rather than a shout.
- Feedback timings observed across `main.ts` (the number of ms a `say()` notice stays up before settling back, or forever if it's a failure per the app's stated "failures stay" rule — not independently re-verified here since `say()`'s rendering lives outside board/): 2000ms (copied/written), 3000ms (committed/thrown away/put back/made/renamed/opened/said/it went in/taken down), 4000ms (nothing is going in/empty commit/empty PR title/kept/forgotten/forget-result), 5000ms (no-way-to-look/not on a branch/nowhere to send), 6000ms (most `trouble`/`refused`/`unwritten` failures, tool-choice refusals), 8000ms (agent-fetch failure), 10000ms (agent installed but still not here), 30000ms (sending everybody home…), 60000ms (push/pull/publish waiting), 600000ms (bringing an agent here…).

## Slash/offer plumbing used by the card and checkout (palette.ts, offer.ts) — brief, mostly yard-scope

- `palette.ts`'s `/agent`, `/model`, `/mode`, `/effort`, `/collaboration` entries are how the card is reached and how its settings are changed without the agent ever seeing the words — `does:'card'` opens the card; the other four map straight to `card.ts`'s own `choose` mechanism once a specific choice is picked (`meant.does:'set'`). `/keep`/`/forget` (kept prompts) and everything else in `palette.ts` is yard/slash territory, out of this file's scope, documented here only insofar as it's the mechanism that opens the card.
- `offer.ts`'s `rank()` — whole-name match, then prefix, then a word-boundary prefix, then substring, then description-substring, `null` (excluded) otherwise — is shared ranking logic used by the slash palette, the `@` file-naming, and (indirectly) nowhere in the checkout/board views themselves.

## Taking a session down / forgetting a project — summary (cost lines)
- Taking a session down: covered fully under "/agent card → when it is over" above; entirely on-board.
- Forgetting a project happens from the **project settings window** (`apps/mender/src/renderer/yard/settings.ts`), which is a DOM overlay, not a board — out of this file's directory scope, but since the brief named it: the button reads **"Remove from Mender"**, and its cost line is computed live as **"the folder stays where it is"** (no sessions) / **"its one session is taken down, the folder stays"** / **"its N sessions are taken down, the folder stays"** (`settings.ts:268-273`). First click arms it and the button relabels to **"Click again to remove · `<cost>`"**, adding an `armed` CSS class; unlike every two-press pattern on the board itself, this arm **auto-disarms after `STANDS_MS = 4000`** ms if not pressed again (`settings.ts:56,274-289`) — the board's own two-press flows (undo, bin, end) have no such timeout and stay armed until pressed or navigated away from. The actual removal (`forget()`, `main.ts:1543-1559`) tells the backend to abandon the project, redraws the island/district composition, and reports back via `say('said' in went ? went.said : went.wrong, 4000)` — success text **"forgotten. the folder is still where it was."**

## Differences from MENDER.md

1. **Two different two-press timing models coexist, undocumented as a difference.** MENDER.md describes "two presses" uniformly for anything irreversible. On the board itself (undo a change, throw away a file, take a session down) the first press stays armed indefinitely. The project-forget flow (which MENDER.md also describes as two presses, "in two presses") auto-disarms after 4 seconds — a meaningfully different, unstated behavior for what reads as the same interaction pattern.
2. **`Place.turn`/`lines`/`tail` hooks in `district.ts` are unused.** The file is written to support a pressable title and extra injected rows before/after the git section on a checkout board, but the sole call site (`openCheckoutBoard` in `main.ts`) never supplies them. MENDER.md doesn't describe this capability at all, so it's not a contradiction, but it's dead/aspirational code worth flagging as it directly affects grain-level truth ("what is pressable") — currently the checkout title is *not* pressable on either a project's or a session's board.
3. **MENDER.md says nothing about the shell's fixed grid size or the alternate-screen/scrollback split**, but the code is very specific: 120×40, only the primary screen accumulates history (4000 lines), and full-screen programs are explicitly stated in code comments to leave nothing behind once closed — consistent with, and a good deal more precise than, MENDER.md's "full-screen programs draw but are only legible, not usable."
4. **MENDER.md's blame description ("who last touched it is on the same board... it says it once over each run") matches the code exactly** (`reading.ts:whose()`), but MENDER.md doesn't mention that blame view disables line-editing and the rename/delete offers (`reading.ts:96`: `if (readonly || state.blame) return [];`) — a real, undocumented state difference from ordinary file reading.
5. **The pull-request board's "checks... a count, not a list, except the ones that failed"** matches MENDER.md precisely, including that still-running checks also get individual lines (MENDER.md doesn't mention the running-checks case explicitly, but it's a natural reading of "the ones that failed... are what you came to read").
6. **MENDER.md doesn't mention `unsent === null` vs `0` as a distinguished "never published" state** ("a branch nowhere else has ever seen") — this is a real, deliberate distinction in code (`card.ts:328-341`) worth surfacing since it's exactly the kind of "every state a thing can be in" nuance the requested grain calls for.
7. **Markdown rendering matches MENDER.md closely**, including the deliberate choice to leave `_underscore_` emphasis alone because "a word with one in the middle is a name." One addition not mentioned in MENDER.md: markdown tables are actually column-measured and padded, not just passed through — MENDER.md only says headings/lists/quotes/rules/tables/code are carried "without" bold, not how tables specifically are laid out.

## Unverified / unclear

- `whyNot()` (`main.ts:2743-2758`) — the vocabulary behind `unreadable(path, whyNot(error))` for a failed file-diff read — was not read in full; it's short but sits right at the renderer/main-process error boundary and I did not want to over-claim its exact text set without re-reading it. (Noted, not re-verified line by line, since it's a small local helper clearly in scope of the change-reading feature but adjacent to main-process error shapes that other agents are covering.)
- I could not independently verify the "failures stay" rule (no auto-settle timeout) from `say()`'s own implementation, since `say()`/the notice surface lives in `village/notice` and the row-rendering "gold, pressable, settles back" mechanics live in `yard/` — both explicitly out of this file's directory scope per the brief. The *durations* reported above (2000-600000ms) are the ms arguments the board-driving code in `main.ts` actually passes, taken as read from source; whether a duration of e.g. `Infinity`-equivalent or omission is how a "failure stays" was not confirmed here.
- Did not confirm whether `card.ts`'s live `status`/`head` replicas ever throw/degrade when a task's checkout path fails `parseNativeAbsolute` beyond the `checkout ? ... : null` guard already shown (i.e., what the card looks like for a session whose path is unparseable) — the district board has an explicit "this checkout is not where it was." fallback (`district.ts:104-116`) but the card has no analogous branch; it simply omits the two replicas and `ending.uncommitted`/`unsent` stay at their initial `0`/`0`, which could silently understate what taking the session down would lose. Flagging as a possible edge case rather than a confirmed bug, since I did not exercise it live.

## Coverage note

Every file in `apps/mender/src/renderer/board/` was read in full (21 files, ~3435 lines): card.ts, changed.ts, committing.ts, district.ts, finder.ts, inside.ts, looking.ts, made.ts, naming.ts, offer.ts, offer.test.ts, palette.ts, reading.ts, row.ts, screen.ts, sent.ts, shell.ts, talking.ts, trouble.ts, work.ts, writing.ts. From `main.ts` (2935 lines), every function that imports from or drives `board/` was read: `wood`/`rewrite`/`home`/`wayHome`/`plainCheckout`, `openCheckoutBoard`, `openChange`/`rowsForChange`/`undo`, `openMade`/`showMade`, `openCommit`/`rowsForCommit`/`holding`/`commit`, `errand`, `walkIn`/`openFile`/`fixLine`/`wroteLine`/`makeIt`/`renamed`/`binned`/`onDisk`, `hunted`/`lookFor`/`onPlace`, `talk`/`rowsForShell`/`stopTalking`, `openSent`/`numberOf`/`openIt`/`doneWith`, `showCard` and its `press()`/`obey()` routing, `bring`, `forget` (call site; the settings-window UI itself was read only for the two-press cost line since it lives outside `board/`), `ending`, `stopWalking`/`letGoOfTree`/`stopReading`, and the full `press()` dispatch table. Sections of `main.ts` not touching `board/` (the island, the rail, the yard's own line/slash/transcript rendering, drag-and-drop, settings beyond the one cost line, project founding, camera/composition) were deliberately not read in depth, per scope.
