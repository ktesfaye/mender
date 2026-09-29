# Attention, navigation and the shell: what to add

Mender already has a real command palette (the finder, `Cmd/Ctrl+K`), quick session-switching (the rail, `Cmd+1…9`), and focus history (`Cmd+[`/`Cmd+]`) — the navigation half of this scope is in good shape. What is missing is almost entirely on the attention side: nothing reaches you once the window itself is out of sight, and the app shell (quit, crash, updates, shortcuts) is close to unbuilt because nothing has needed it yet.

## NEED

### System notification (banner + sound) when an agent needs you or finishes · M
Has it: Emdash (`agent-complete`/`agent-attention` OS banners, `system-notification-sink.ts`, gated by Notifications/Sound/OS-notifications/Sound-timing settings, default all on), cmux (full delivery pipeline: banner, sound, dock/menu-bar badge, phone forwarding, with focus-aware suppression). Mender: no. Grepped `apps/mender/src` for `Notification`, `dockTile`, `badgeLabel`, `Tray` — none exist; the only signal that a villager wants you is the lantern's own light and posture, which only works while you are looking at the window.

Why it matters: MENDER.md's own case for the app is that it sits "beside the thing he is really working in... glanceable." That only holds if a glance is still possible — the window can be behind another app, on another Space, or simply not glanced at for a while, and right now there is nothing outside the glass at all: no banner, no sound, no dock mark. A session that starts flickering for you gets no attention until you happen to look. This is the single biggest hole in "how you find out something needs you."

Back end: needs work, but not much — Emdash's own producer/gate/delivery pipeline (`src/core/services/notifications/node/producers/`, `system-notification-sink.ts`) is inherited wholesale; it is currently unwired from anywhere in `apps/mender`. Electron's `Notification` API is a few lines.

In the village: no settings panel, no toggle — this either always happens or it doesn't, in keeping with "nothing teleports" and no chrome. When a session's fire needs you (asks a question, finishes a turn, breaks) and the window is not the frontmost app, macOS gets a plain banner in the village's own voice: the session's name and what it's doing now (the same present-tense line the fire already shows), click focuses Mender and stands you in that yard. Pairs with a short sound, off while the window is frontmost (so a banner never doubles a lit lantern you're already looking at) — same `focusedInline` suppression rule cmux already uses.

### A cost line before quitting with sessions running · S
Has it: Emdash (a full two-stage confirm: "Quit Emdash? {n} running agent sessions and {n} terminals may be stopped" / "Background services and automations will stop.", with a flush/cleanup handshake before the process actually exits). cmux (Confirm Quit setting: Always/Dirty-Only/Never, same phrasing pattern). Mender: no — `app.on('before-quit')` just disposes the scope silently; `Cmd+Q` or the window close box ends every running agent turn with no warning at all.

Why it matters: this is exactly the shape of action MENDER.md already has a rule for — "Anything that cannot be taken back needs two presses and the first press is what names the cost." Stopping a mid-turn agent without saying so is the one place in the whole app where an irreversible-feeling thing currently has zero presses and no cost line. (The worktree and transcript survive on disk either way — nothing is lost for good — but the villager stops mid-thought with no notice.)

Back end: ready — the runtime already knows which sessions are live (`agents.dispose()`/`tasks.dispose()` in `apps/mender/src/main/index.ts` already enumerate what's about to stop).

In the village: only appears when something is actually running. `Cmd+Q` (or the red close button) with a lit fire anywhere on the island turns the window itself into one line, dock-style over the whole village going dark: **"`<n>` villagers are still working. quit anyway?"** (singular phrasing for one). Pressing it again within the window quits; anything else, including just waiting, cancels it — same shape as the board's other two-press costs, not a modal dialog stacked on top of the world.

## WANT

### The rack marking which project has someone waiting · S
Has it: Emdash (sidebar task-status glyph, inferred `needsAttention`/`working` per task, visible without opening it) and cmux (unread badge + manual status lane, both per-row in the always-visible sidebar). Mender: checked `apps/mender/src/renderer/yard/shelf.ts` directly — `OnShelf` (the type the rack draws from) carries only `{ id, name, at, icon, here }`. No mood, no attention flag reaches the rack at all; the project faces are always neutral wood-brown, whichever project the asking session is in.
Why it matters: the rack is explicitly "always within reach" (its own doc comment) and folds shut by default — it is the one piece of chrome meant to answer "where else is there" without leaving the yard you're standing in. Right now it can't answer "does anywhere else want me," which is exactly the question it's positioned to answer. (The island itself already answers this correctly when it's on screen — see Already-have — but the rack is visible even when the island isn't, e.g. while deep in a session's yard.)
Back end: ready — the same per-task mood map (`seen[task.id]`) that already drives every lantern and every house light on the island just needs folding into one worst-mood-per-project value before it reaches `Shelf.show()`.
Village form: no badge, no dot, no count — the rack is explicitly "an inventory rack out of a game," the one place already exempted from the gold-only-pressable rule, so it shouldn't gain a second exception. Instead the slot's own light does it: a project with somebody asking or hurt gets the same warm/red wash a lit house gets, applied to its slot on the rack, easing in and out exactly the way a house's window light does. Folded shut, that same light plays across the "projects" handle label itself, so even the collapsed rack still says whether anything anywhere wants you.

### Jumping straight to whoever is waiting, across every project · S
Has it: cmux (`Cmd+Shift+U` jumps to the latest unread notification from anywhere; `Ctrl+Cmd+U` marks-seen-and-advances to the next one). Emdash: no equivalent found. Mender: no — `Cmd+1…9` only jump to the *n*th lantern on the rail you're currently standing at (or the *n*th project, from the island); reaching a session in a *different* project that wants you today means opening the finder and typing its name, or noticing its house from the island and walking over.
Why it matters: this is the direct move the notification banner (NEED, above) should hand you, and the natural next step once the rack itself can say "something in project B wants you" (WANT, above) — knowing costs nothing if getting there still takes several presses.
Back end: ready — it's the same mood map every other piece of this reads (`seen[task.id]`), just walked in one fixed order (oldest-asking-first, matching how the fire itself reads oldest-first) instead of matched by name.
Village form: a new entry in the finder's own "held with command" table, offered from anywhere (`island`, `district`, `session`, `card`) — the same chord table the rest of navigation already lives in, not a separate shortcut system. Pressing it stands you in the yard of whichever session most wants you island-wide (asking longest, or hurt, ranked above merely working); pressing it again from there goes to the next one, cycling, so a bad morning with three sessions asking things is three presses apart. This is also exactly what clicking the OS notification banner does — the banner's click handler and this chord land on the same code path, not two different ones that could disagree.

### Dock badge / menu-bar mark for unread attention · S
Has it: cmux (dock badge = exact unread count capped "99+"; menu-bar icon badge capped "9+", both on by default). Emdash: no dock badge (checked, grepped for `setBadgeCount`, none). Mender: no.
Why: nice once the OS banner above exists — a persistent count you can see without a banner having been open at the time, e.g. after waking the laptop.
Back end: ready (`app.dock.setBadgeLabel` on macOS, `BrowserWindow.setOverlayIcon` on Windows).
Village form: the dock icon (the square cut from the island, per MENDER.md) gets a small warm dot when any lantern anywhere wants you — no number, because a count is a UI convention this app otherwise avoids everywhere else (no badges, no dots, gold-only-pressable). A single dot answering "does anything want me" fits the app's own vocabulary better than an exact count would.

### A record of what you missed while you were away · M
Has it: cmux (a full notification panel: history, "Jump to Latest Unread", per-row open/dismiss, menu-bar popover variant). Emdash: no persistent history, toasts only. Mender: no — a banner (once built) fires once and is gone; if you miss it, there is no way to see what happened.
Why: matters more for Mender than for cmux, because Mender has no sidebar row text either (see Already-have/Skip below) — once a lantern's flicker has been walked past, "what did it want" is gone until you open that session and read the fire.
Back end: needs light work — sessions already keep their own transcript; this is just remembering which sessions raised attention since last look.
Village form: not a separate panel — the rail itself is the log. A lantern that wanted you and was missed keeps its flicker (rather than settling once "seen") until you actually stand in that yard, so walking the rail after being away is itself the catch-up. No inbox, no list, no unread count anywhere else.

### Reopening a session you just took down · S
Has it: cmux ("Reopen Closed Workspace" menu item + shortcut, keeps a stack of recently-closed). Emdash: no equivalent found. Mender: no — taking a session down (two presses, per MENDER.md) removes its lantern for good; the branch and worktree survive on disk but there is no path back to it from the rail.
Why: a slip on the second press of a two-press confirm currently has no undo, which cuts slightly against the app's own care about that gesture.
Back end: ready — the branch/worktree the session pointed at is untouched; "reopening" is just re-attaching a task to it, which the tasks controller already supports for any existing branch.
Village form: the empty hook at the end of the rail remembers the last session taken down in this project (one, not a list) for the rest of that sitting: holding it briefly shows "put `<name>` back up?" instead of "start a session," and letting go without pressing just starts a new one as normal.

### Keyboard shortcuts you can rebind · M
Has it: cmux (full recorder UI, `cmux.json` JSON escape hatch, conflict detection). Emdash (same shape: `Settings → Keyboard Shortcuts`, toast on conflict/reset/remove). Mender: no — `board/finder.ts`'s `DOINGS` table is a fixed, hardcoded chord list; nothing in `apps/mender/src` reads a user override.
Why: nice-to-have, not blocking — the chord set is small (nine entries) and already surfaced in the finder itself as "held with command" rows, so discovery isn't the problem; only remapping is missing. Given MENDER.md's stance that settings are "about the place, not the work" and app-level settings otherwise don't have a home in the village's vocabulary at all, this is the kind of feature that's easy to want but has nowhere designed to live yet.
Back end: ready in spirit — Emdash's whole shortcut-catalog/conflict-checking machinery is inherited, just never wired to Mender's own much smaller command table.
Village form: cut for now, or — if ever built — lives in `cmux.json`-style plain JSON a person can hand-edit, not a settings board; the village has no page for "settings about me" the way it has one for "settings about this project," and inventing one only for this would be the kind of panel-for-panel's-sake MENDER.md is written against.

### Keeping the Mac awake while a villager works · S
Has it: cmux ("Keep Mac Awake" toggle in the status menu, caffeinate-backed). Emdash: not found. Mender: no — grepped for `powerSaveBlocker`, none.
Why: a long agent turn that runs through the Mac going to sleep just stops (the spawned process is suspended, not merely the window). Real but probably rare in practice, since most turns are short.
Back end: needs a few lines (`electron.powerSaveBlocker`).
Village form: no toggle — the village keeps the block active for exactly as long as any fire is lit anywhere on the island, and releases it the moment the last one banks or goes to embers. Nothing to look at, nothing to press; it just stops being possible for the Mac to sleep out from under working agents.

### Remembering where the window was · S
Has it: cmux (per-window bounds persisted; also a `windowTitleTemplate` for tiling window managers). Emdash: no (also fixed 1400×900 every launch — this is a gap the whole family shares, not something Mender fell behind on). Mender: fixed 1480×1020 every launch (`apps/mender/src/main/index.ts`); confirmed the renderer itself already refits cleanly to any size (`camera.ts`'s `fitScale`/resize listener), so this is purely about where the OS puts the window, not a rendering limitation.
Why it matters: MENDER.md's own case for the app is that it sits parked beside whatever you're really working in. If that's true, its size and screen position are chosen once and should stay chosen — relaunching and getting shoved back to a fixed size/position at the primary display's default spot works against exactly that "beside the editor" use.
Back end: needs a few lines — `BrowserWindow`'s bounds on `close`, restored on the next `openVillageWindow()`, clamped to the current display like Electron's own `windowStateKeeper` pattern does.
Village form: invisible — no setting, no indicator. The window simply reopens exactly where and at whatever size you last left it, the same way a session's own board comes back exactly as you left it.

### A trimmed native app menu, not the untouched default one · S
Has it: Emdash (a real menu: About, Settings, Check for Updates, Docs, Changelog, Troubleshooting, Give Feedback). cmux: larger still. Mender: nothing sets `Menu.setApplicationMenu` at all (grepped, no hits), so it runs Electron's stock default menu — which includes "Reload" and "Toggle Developer Tools" in a finished app, and an About panel that says "Electron," not "Mender."
Why it matters: small, but real — this is the one place a person could stumble into dev-only chrome (a reload that would drop them out of whatever board they had open, a raw DevTools panel) in an app that otherwise has none of that anywhere. Worth doing even though it's minor, because the fix is a subtraction, not an addition: not growing toward Emdash's seven-item menu, just making the two-or-three items macOS actually requires (About, Settings, Quit, standard Edit roles for copy/paste in the write line) match what the app actually is.
Back end: ready — this is a handful of lines in the main process, no dependency on anything Emdash-specific.
Village form: not village-voiced prose — a menu bar is OS chrome, not the wood. **Mender** (About Mender · Quit Mender ⌘Q) and standard Edit (Cut/Copy/Paste, needed for the write line) are the only two menus; no File/View/Window/Help, no visible "Reload," no visible DevTools entry in a packaged build.

### A door back in after a hard crash or a boot that never finishes · M
Has it: Emdash (a whole separate recovery window: "Something went wrong," Check for updates / Restart / Open logs / Quit, plus a boot-watchdog escape hatch on the splash screen if boot hangs). cmux: relies on ordinary crash reporting + relaunch. Mender: the only handling anywhere is a native `dialog.showErrorBox` with the raw stack trace on a boot failure (`src/entry/main.ts`) — no restart button, no log access, no watchdog if boot just hangs forever with no error thrown at all.
Why: today, if this breaks, Kirubel's own recourse is to know to open a terminal and read `process.stdout` — fine for him specifically, but there's no way to open the log file from the failure itself, and a silent hang (rather than a thrown error) currently shows nothing at all.
Back end: needs work — Emdash's recovery window and boot watchdog are real code to port, not just a config flip.
Village form: keep it plain, not village-voiced — a crash is exactly the moment illustration and metaphor stop being useful. A small native dialog, same as today's, but with a "Restart" button next to "Quit," and a "Show log" button that reveals the log file in Finder. A boot that hasn't shown the island within a few seconds gets the same dialog rather than staying blank.

## SKIP

### Multiple windows · cut, deliberately
cmux allows many windows; Emdash and Mender are both single-window by design. MENDER.md: "One screen. One thing being read at a time." Adding a second window contradicts the whole premise; not reconsidering this.

### Rich per-row sidebar metadata (branch, PR chip, ports, latest-message line, checklist) on every session at once · cut, deliberately
cmux's sidebar shows all of that for every workspace simultaneously, always. Mender's rail is explicitly the opposite choice — MENDER.md: "no badge, no spinner and no coloured dot anywhere," a lantern is only "lit, warmer and pulsing... or red." Porting cmux's row density would be adding back the badges-and-dots UI this app is written against.

### A welcome/onboarding screen with an import step · cut, deliberately
Emdash has a first-run "Welcome." overlay plus a legacy-data-import flow (moving from an old Emdash install). Mender has neither a predecessor install to import from nor a use case that needs a welcome screen: MENDER.md already designed the empty first-run state on purpose — "With nothing on it, it is a small island with a campground and a fire" — and a project "that has just moved in opens its settings first." That is the onboarding.

### Telemetry opt-out setting · not applicable
Emdash ships a full Privacy & Telemetry settings row (PostHog). Mender has no telemetry code at all (grepped for `telemetry`/`posthog`/`sentry`, no hits) — nothing to opt out of, and nothing recommends adding it.

### Auto-update · cut, for now
Emdash and cmux both ship full updater UIs (electron-updater / Sparkle) with toasts, download progress, and release channels. MENDER.md says this outright: "No publishing, no update channel and no notarisation: there is nobody to release to yet." Revisit only if Mender is ever installed on a machine that isn't this one.

### App-wide zoom, and a choice of theme or font · genuinely not applicable
Emdash offers Light/Dark/System theme, terminal font family/size, sidebar font size, and app-wide font magnification; cmux adds a "Global Font Magnification" setting on top of native Reset/In/Out zoom. Mender has none of this, and it isn't a gap — it's a constraint the app states about itself. `apps/mender/src/main/index.ts`'s own comment: the window is sized for "one screen pixel per world pixel, which is the only scale this art is drawn for" — the island is hand-drawn pixel art, and any zoom that isn't an exact integer multiple (which the camera's own `fitScale` already handles for resizing/fullscreen, see Already-have) would blur it. MENDER.md separately commits to one typeface app-wide ("the writing is Departure Mono under the SIL OFL"), the same way it commits to gold being the only pressable color. A theme picker or a font picker would be solving a problem Mender doesn't have — it isn't a terminal emulator rendering arbitrary text at arbitrary sizes, it's one piece of fixed art with one typeface laid over it.

## Already have (one line each)
- Command palette — the finder, `Cmd/Ctrl+K`, matching sessions/projects/village commands live as you type.
- Quick session switching — the rail plus `Cmd/Ctrl+1…9` jumps straight to the *n*th lantern.
- Focus history (back/forward) — `Cmd+[` / `Cmd+]` walk where you were before.
- In-window attention signal — a lantern's light and posture (lit/pulsing/red/dark), no separate notification needed while you're looking at the app.
- **The island already knows which project needs you, zoomed all the way out.** Checked `main.ts`'s `people()`: the villager/window-light layer (`village/folk.ts`) is built from *every* task in *every* project each tick, not just the currently open one, so a district you haven't walked into yet already shows its house lit warm/pulsing/red from out on the water, exactly as MENDER.md describes. The one gap this doesn't cover: a project with more running sessions than its district has houses only lights the ones that got a visible slot (`task.slot !== null`) — an "extra" asking session beyond the house count is invisible from the island (not called out as a separate item above; folding it into the rack fix, since the rack has no such ceiling).
- **The `Cmd/Ctrl+K` finder already searches every project's sessions, not just the open one.** Confirmed in `board/finder.ts`/`main.ts`: the `tasks` array it's built from is the whole app's task list, filtered per-view elsewhere but not here — typing a session's name from anywhere already crosses project boundaries.
- **Mender restores where you were, but only down to project/session/card — not what board was open on top of it.** Confirmed in `main.ts` (`arrived()`/`lastly()`, `localStorage['mender.where']`): relaunching puts you back on the island, or in the right project, or standing in the right session (and whether its `/agent` card was up) — matching MENDER.md's "you land in the session you were last in." But a file being read, a folder walked into, a diff or commit or PR board open, a shell mid-command — none of that is remembered; it all resets to the plain yard. Not written up as its own gap item above since MENDER.md never promises board-level restore and reopening any of those is one or two presses away once you're back in the right yard — but worth having on record since the coordinator asked directly.
- Empty first-run state — an island with nothing on it, by design, not a placeholder.
- Escape as a universal "step back one thing" — closes whatever half-finished board or typed text is topmost, one layer at a time.
- Project-level settings surface — its own popup window, closable by outside-click or Escape (the one place app config *does* have a home, scoped to a project rather than the whole app).
- Fullscreen and arbitrary resizing — the camera's own `fitScale` refits the whole island/district cleanly to any window size (`village/camera.ts`), so going fullscreen or dragging the window to a new size already works correctly; no separate build needed.
- Hovering a lantern already brightens it and shows its name (outside cramped "bare" rail mode) — a lightweight version of "what is this" without opening the session.
