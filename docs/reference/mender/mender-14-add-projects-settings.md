# Projects, settings and machines: what to add

Emdash's back end already carries almost everything below — the gap is nearly always a
missing village surface, not missing plumbing. Even cmux's cloud/enterprise/iOS-only pieces
get a hard look below for a local, single-user, Android/macOS form before being cut.

## NEED

### Clone Repository & Create Repository (Add Project) · S
Has it: Emdash (three modes: Pick Directory, Create Repository, Clone Repository). Mender:
partly — only Pick Directory exists (`main.ts` `found()` → `client.projects.found()`; ledger
WS-01 done, WS-02/WS-03 blank). Why it matters: you cannot start work on a repo that only
exists on GitHub without leaving the app to `git clone` it first — for a tool whose whole
pitch is "you open it and you see the village," that's a real hole in the one flow everyone
hits on day one. Back end: ready (`@emdash/core` clone/create-repo already used by Emdash).
In the village: the campfire's found-a-project flow gets two more embers next to "pick a
folder" — "clone a repository" (a URL line) and "start a new one" (owner/name + private/
public, reusing whatever GitHub identity the project settings window resolves). Same
one-question, one-line-to-answer shape the rest of the app already uses; no modal, no tabs.
The creation-progress steps Emdash shows (cloning → registering) become the same "small fire
throwing sparks" present-tense line the yard already uses while a session works.

### Lifecycle scripts (Setup / Run / Teardown) · M
Has it: Emdash (`project` shareable settings: prepare/setup/run/teardown). Mender: no —
`yard/settings.ts` has icon, name, rename, remove, and the carrying/.gitignore checklist (a
good, already-shipped equivalent to Emdash's "preserve patterns"), but nothing runs a command
when a worktree is cut. Why it matters: on any real project that needs `npm install` or a
`.env` copied before an agent can do anything, every new session opens broken until you run
setup by hand in the shell tab — the difference between a session actually starting work and
one staring at a repo it can't build. Back end: ready. In the village: a line on the
project's settings window, under the carrying checklist — "what runs when a worktree is
cut," one small box each for prepare/setup/run/teardown, each just a line of shell to type.
No separate auto-run toggle: "gold is pressable" already means things run when asked, so
setup/run simply always run on a fresh worktree, matching what nearly every project wants.
Add Emdash's script-status indicator (running/failed) as the small fire's present-tense line
while a fresh session's worktree is still being prepared — the ledger already flags that a
lantern currently gives no sign its worktree is still being cut; this closes that gap too.

### Project git identity overrides · S
Has it: Emdash (worktree root, default branch, base remote, push remote, each with a
provenance badge and reset-to-inferred). Mender: no — the project settings window has no
field for any of these, so Mender always takes whatever the backend infers (origin, first
remote, remote HEAD). Why it matters: inference is usually right, but when it's wrong
(multiple remotes, no remote HEAD, a worktree pool you want somewhere specific) there is
currently no way to fix it from inside the app — you'd have to hand-edit `.emdash.json`,
which defeats the point of a settings window that already exists. Back end: ready. In the
village: three more lines on the settings window, each showing the inferred value greyed
until pressed, then becoming an editable line with a small "reset" mark once overridden —
the same visual language the carrying checklist already uses.

### Agent auth status, and a sign-in flow · M
Has it: Emdash (per-agent `checkStatus`, an `AgentSignInModal` with a live embedded terminal
running the CLI's own login flow, auto-closing on success). Mender: no — the card lists
models/modes/tools/skills but never says whether the chosen agent is actually signed in
(no `auth` field anywhere in `card.ts` or the shared `Kit` type). Why it matters: a signed-out
Claude Code or Codex simply fails silently the moment a session starts, and with no auth
line on the card that reads as Mender being broken rather than "you're not signed in" — for
a session that MENDER.md calls "a real agent, configured," this is the one configuration
state that can't just be inferred from the protocol at connect time. Back end: ready
(`AgentAuthStatus`, `checkStatus`). In the village: one more line on the agent card, next to
"thinking with" — signed in shows nothing (quiet is the default here), signed out or unknown
shows a line you can press, which opens the same kind of board a shell tab already is,
running the CLI's own login inline rather than a modal with an embedded terminal widget.

### GitHub account (connect, and per-project pick) · M
Has it: Emdash (device-flow connect modal, multi-account registry, per-project account
picker with provenance, plus a per-project "agent git credentials" choice of effective
account / system / none). Mender: no — PR create/merge/list already work (`board/sent.ts`,
ledger WS-48/49 done) but purely off whatever `gh`/git credentials the machine already has;
there is no in-app way to connect an account, see which one is active, or pick a different
one per project. Why it matters: the pull-request board is one of MENDER.md's named, load-
bearing surfaces ("a piece of work ends here rather than in a browser") — it silently uses
whatever identity happens to be ambient, with no way to fix it if that's wrong or if you work
across two GitHub accounts. Back end: ready (`ProviderAccountRegistry`, GitHub OAuth device
flow). In the village: the project settings window's danger-adjacent area gets one more
line — "connected as `<login>`" or "connect a GitHub account," pressing it opens the device
code the same way Emdash does (a code to paste, a browser tab), because that flow has no
village-native replacement worth inventing.

## WANT

### MCP server add / edit / remove · M
Has it: Emdash (catalog + custom server drawer, sync-to-agents). Mender: partly — the agent
card already lists and toggles existing MCP servers (`card.ts` `tool:${name}` pick,
AG-07/AG-44 done); there is no way to add a new one or edit an existing one's command/URL/env
from inside Mender. Back end: ready. In the village: MENDER.md itself already names this as
deliberately deferred ("Nothing yet adds a server or teaches a skill... the rest is still
done in the agent's own files"), so this is the next increment — a `+` line under "what it
can reach" opening a small board (name, command/URL, env) using the same board-is-writing
pattern as everything else, not Emdash's drawer.

### Skills catalog (browse, install, create) · M
Has it: Emdash (catalog with OpenAI/Anthropic/skills.sh sources, install/uninstall, a
"New Skill" author flow). Mender: no — the card reads whatever skills an agent already has
(read-only) with no way to add one. Back end: ready. In the village: a line under "what it
has been taught" opening a small catalog board; writing a new skill reuses the board's own
"you write, it saves" pattern instead of Emdash's three-field form.

### Hooks status on the card · S
Has it: Emdash (`AgentHooksSection` — "Configured · `<path>`" or "Configured on first
session"). Mender: no — nothing on the card says whether Mender's own status hooks (the
thing that makes the fire and the lantern actually track what an agent is doing) are wired
for the agent in this session. Why it matters even though small: when a lantern doesn't
flicker right, this is the one line that tells you why. In the village: a quiet line under
"what it can reach," same tone as the auth line above — silent when configured, a small note
when it's only "on first session."

### Task/session defaults (auto-approve, auto-trust, auto-name, branch defaults) · M
Has it: Emdash (`tasks` settings: auto-generate names, auto-approve by default, auto-trust
worktree directories, create-branch-by-default, delete-branch-by-default, capitalization,
issue-context). Mender: no — every new session currently gets whatever Mender's own
hardcoded defaults are, with no way to change them (tmux is the one exception, and Mender
already made the right call hardcoding that on — see Already Have). Why WANT not NEED:
nothing breaks without this, it just means friction (re-approving prompts every session,
say) can't be turned down once for good. In the village: a short list on the windmill
island's General page, each a switch — not Emdash's seven separate rows, several of these
collapse into fewer switches once "gold is pressable" removes the need for some of Emdash's
own confirm-dialog toggles.

### Agent CLI update / uninstall, and picking among several installs · S
Has it: Emdash (change-source submenu, update/uninstall actions, sudo-retry). Mender: partly
— install (`bring()`) is real and driven; update, uninstall, and choosing among several
discovered installs are not. Back end: ready. In the village: two more marks next to an
already-installed agent's line on the roster — "update" appears only when one exists,
"remove" is the usual two-press.

### Default agent · S
Has it: Emdash (`DefaultAgentSelector`). Mender: no. Not blocking — the agent card lets you
pick who works a given session — but every new session starts from whatever the picker
defaults to rather than a chosen one. In the village: one line on the windmill island's
General page, the same "who works here" list the card already renders.

### Per-agent config: extra CLI args, env vars, executable override · M
Has it: Emdash (Advanced settings on the agent detail sheet). Mender: no. Matters mainly for
people running an agent from a non-standard install or wanting extra flags. Back end: ready.
In the village: a collapsed "advanced" tail at the bottom of the agent card, off by default
so it doesn't clutter the card's normal reading.

### A settings surface for the app itself (the windmill island) · M
Has it: Emdash (13 settings pages). Mender: no — there is no window that isn't a project's
own settings, so app-wide things (default agent, notifications, terminal, keyboard) have
nowhere to live. This is the prerequisite for most of the rest of this list, and MENDER.md
already promises it a place ("Settings is an island with a windmill on it"). Back end: ready
(the app-settings store Emdash already uses for all of this). In the village: the windmill
island, reached the same way a project's settings are (a name/mark you press), opening the
same kind of window a project's settings already use — pop up over everything, close on
click-outside or Escape — just with the village's own short list of pages instead of
Emdash's thirteen: General (default agent, task defaults, notifications), Interface
(terminal, files/watch exclusions), and Machines.

### Notifications (sound, OS banner when unfocused) · S
Has it: Emdash (enabled/sound/custom sound/timing/OS notifications). Mender: no — a session
that wants you only flickers its lantern and turns its villager around, both invisible if the
window isn't focused. Matters because MENDER.md's own design leans on you noticing the rail;
without an OS-level nudge, a backgrounded Mender goes quiet exactly when you need to know.
Back end: ready. In the village: one switch on the windmill island — "tell me outside the
window too" — no sound-file picker or focus-mode nuance; one honest on/off, not Emdash's
five-field card.

### Terminal appearance (shell, font, size) · S
Has it: Emdash (font/size/shell/auto-copy/option-as-meta). Mender: no — the shell tab
(`board/talking.ts`) inherits whatever the terminal component defaults to. In the village: a
small "shell" section on the windmill island, three lines (default shell, font size,
auto-copy) — font family and option-as-meta are Emdash chrome Mender's own timber-and-
Departure-Mono identity doesn't need to match.

### File / search / watcher exclusion patterns · S
Has it: Emdash (`FilesSettingsCard`: file-tree, search, and watcher exclusion lists). Mender:
no. Matters most on large repos (node_modules-style folders) where an unfiltered watcher or
search can be slow or noisy. Back end: ready. In the village: one more section on the
windmill island's Interface page, three small text areas, same shape as the carrying
checklist elsewhere in the app.

### Keyboard shortcut rebinding · M
Has it: Emdash (full capture/conflict UI); cmux (an even larger chord/context system).
Mender: partly — a fixed chord table exists (`board/finder.ts` `chordFor()`/DOINGS) with no
way to change it. Lower priority: MENDER.md's interaction model is built around a small,
memorable set of presses rather than a large rebindable surface. If built: one page on the
windmill island listing the fixed table with a "press keys to change" per row, Emdash's
shape, not cmux's chord/context system.

### Host system dependencies, with elevated-install approval · M
Has it: Emdash (System Dependencies card: required/recommended host tools, one-click
"Install all," a `SudoRetryPanel` for elevated installs). cmux (a full Touch ID-gated `sudo
run` approval broker, generalized beyond just dependency installs). Mender: no — nothing
detects or installs missing host tools (git, ripgrep, tmux) at all. Why it's worth having:
several of Mender's own features quietly depend on host tools being present (tmux for the
shell tab, ripgrep for search) with no diagnosis when they're missing. Back end: ready for
the Emdash-shaped version; cmux's broader Touch-ID broker is real but scoped much wider than
Mender needs. In the village: a short "what this machine needs" list on the windmill
island's Machines page, one line per tool with a press-to-install; a failed install that
needs `sudo` shows the password prompt macOS already gives it — no need to build cmux's own
GUI approval theater for a single-user tool where you're both requester and approver.

### Workspaces (worktree list, disk usage, stale cleanup) · M
Has it: Emdash (Workspaces tab per project and per machine: worktree count, linked-task
count, last activity, disk usage, row actions to open/clean/delete). Mender: no — a
project's worktrees are invisible except through whichever session currently has one open;
there's no way to see or clean up an orphaned worktree from a session you already took down.
Back end: ready. In the village: a line on the project settings window — "what's on disk for
this project" — opening a small board listing each worktree (branch, size, last touched)
with a two-press "clear this one" per row, the same pattern the board's own file-throw-away
flow already uses.

### Conversation history across a machine (cmux's "Vault," Emdash's Conversations tab) · L
Has it: cmux (Vault: search past agent sessions by transcript content across every agent it
knows how to read locally, resume or fork from any checkpoint). Emdash (a plainer version:
a per-machine Conversations tab listing every cached ACP/TUI record, including ones no
longer linked to a task, with a "link to a task" action). Mender: no — once a session is
taken down, whatever it said is only still reachable if you remember which project it was
under; there's no way to search across every session on this machine by what it actually
said. This is a genuinely cool feature on its own merits, not just parity: "I know I asked
an agent about X last week, which session was that" is a real, recurring need. Back end:
partly ready — Emdash's conversation index/registry is `kept` (AG-16), but Vault-style
full-text search over transcript content is new work either way. In the village: reachable
from the campfire (search feels like a village-level thing, not a per-project one) — a
small board, one search line, results as a list you can press to relink into a session's
gatepost. Cron-triggered automations (below) could use the same store as their run log.

### Automations (scheduled agent runs) · L
Has it: Emdash (cron-triggered agent runs, template gallery, run history). cmux (a related
but different idea: an event-rule engine — `when` a status/category event fires, `run` an
action or call an RPC — kept in a plain JSON file precisely so it's diffable and hand-
editable). Mender: no. Genuinely useful, but big — a scheduled run needs somewhere to report
back that isn't a live session's yard. Back end: ready for the cron form. In the village:
reads as another kind of lantern on the rail — one that lights on its own at its scheduled
hour rather than only when you hang it — rather than inventing a separate calendar surface.
cmux's event-triggered form (react to a status change rather than only a clock) is worth
keeping in mind as a second trigger kind once the cron version exists, since Mender's own
fire/posture states are exactly the kind of event such a rule would key off.

### Computer Use — letting an agent drive other Mac apps · L
Has it: cmux (a bundled "cmux Computer Use" helper app, granted Accessibility/Screen
Recording, giving Claude Code/Codex sessions screenshot+accessibility-tree tools to click,
type and read native Mac UI). Mender: no, and no Emdash-backend equivalent exists yet. This
is a genuinely cool capability — an agent that can drive a native app beyond the terminal and
the repo — and worth having eventually rather than dismissing as cmux-only chrome. It's real
new work, though: a separate signed helper binary, its own permission flow, and a new MCP
tool surface Emdash's plugin framework doesn't currently expose. In the village: this is a
capability, so it belongs exactly where MCP servers and skills already live on the agent
card — "what it can reach" gets an entry for the machine's own UI once the helper and
permissions exist, toggled the same on/off way any other tool is. Worth scoping as its own
project once the NEED list above is done, not a first pass.

### Resource usage overview (cmux's Task Manager / `cmux top`) · S
Has it: cmux (a cmux-scoped Activity Monitor attributing CPU/memory to a specific workspace,
pane or agent process). Emdash (a plainer per-machine Resource Utilization row: CPU/memory/
disk cards). Mender: no — nothing shows what a session is actually costing this machine.
Lower priority than cmux's full Task Manager (Mender's one-session-per-yard shape doesn't
accumulate cmux's many-pane attribution confusion), but the Emdash-shaped version is small
and the runtime already exists (`packages/core/src/runtimes/resource-usage/`, kept). In the
village: a quiet line on the windmill island's Machines page — CPU/memory/disk for this
machine — not a whole process tree.

### A phone view of the rail (Android companion, not iOS) · L
Has it: cmux (an iOS companion app: pairing/QR flow, live online/offline device presence,
lists and attaches to machines and Cloud VMs from the phone). Mender: no, and there's no
Emdash backend for a mobile client at all. This is genuinely a cool idea worth keeping —
checking whether a session finished, or answering a permission question, from your phone —
but the form has to change: this machine's own house rules are Android and macOS only, so
the shipped version, if built, is an Android companion, not cmux's iOS one. It's real new
work (a whole second app, plus whatever pairing/transport layer replaces cmux's own), so it
belongs well past the NEED list — flagging it here so it isn't mistaken for "not wanted,"
just "not close."

### SSH machines (add/edit/connect, host settings, resource monitoring) · L
Has it: Emdash (Machines settings page, Add/Edit SSH modal, per-machine System/Workspaces/
Conversations tabs, host defaults, dependency install, port forwarding, directory browsing
for remote paths). cmux (`cmux ssh`, Mosh, remote-tmux mirroring — all cmux-specific
transports with no Emdash-backend equivalent). Mender: no — a project can only be local.
Why WANT and not NEED: Mender's whole loop (open the island, walk into a project, work a
session) is already fully usable local-only, and nothing in MENDER.md promises remote work
yet. Back end: ready for the Emdash-shaped version (SSH connection lifecycle, workspace-
server distribution, host settings); none of cmux's own transports (Mosh, tmux mirroring)
exist in this back end and would be new work, not a surface. In the village: a machine is
the same kind of thing a project is — reached from a rack, not a settings list — so the
natural form is a second small rack next to the project rack, one slot per machine with a
connection-state dot; pressing an empty slot opens the Add SSH Connection board (name, host,
auth) as a "you write, it saves" wooden board, not Emdash's multi-mode form. Per-machine
host defaults (shell setup, worktree root, tmux) become extra lines on the windmill island
once a machine is picked, not a whole extra tabbed page. Remote directory browsing for Add
Project's Clone/Create modes reuses whatever the project's own folder-walk board already
draws.

### Config import ("migrate from Conductor/Superset/Codex/etc.") · S
Has it: Emdash (auto-detects a recognized external tool's config on project creation, offers
to import). Mender: no. Minor — only matters to someone switching tools, but the person
building Mender is exactly that someone. In the village: the same "detected config, import
it?" line Emdash shows, on the found-a-project flow, once the backend detector is wired in —
no separate UI needed.

### Multi-account issue-tracker integrations beyond GitHub · L
Has it: Emdash (Linear, Jira, and ten more, each an OAuth-connected account with its own
issue-linking UI). Mender: no. Real, but each provider is its own OAuth dance and its own
issue-picker UI — worth adding one at a time, starting from whichever tracker actually gets
used, once the GitHub account flow above exists as the template.

### App self-update · M
Has it: Emdash (`electron-updater`-backed check/download/install cycle, stable + canary
channels); cmux (the same shape over Sparkle). Mender: no. Not pointless, just premature:
MENDER.md is explicit that "there is nobody to release to yet," so there's no channel to
check against. Worth building the moment Mender is shared with even one other person or
installed on a second machine of Kirubel's own — at that point "reinstall by hand every
time" stops being fine. In the village: Emdash's own `UpdateCard` shape (checking → available
→ downloading → ready to restart) fits the windmill island's General page as-is; no
village-native reinvention needed here, since this is infrastructure, not an experience.

## SKIP

- **Cloud Machines / VMs, Cloud VPN, cloud domains, "Base"** (cmux) — cmux's own paid,
  provisioned-VM product. Neither Emdash's nor Mender's back end has any cloud-provisioning
  capability to build this on; doing it for real means standing up and paying for
  infrastructure Mender has no reason to run. Genuinely pointless to chase here — if remote
  compute is ever wanted, SSH machines (above) already reach any box you can already pay for
  or already own.
- **Managed Device Policies / MDM** (cmux) — fleet policy enforcement for an IT admin
  managing other people's Macs. Mender has one user who is also its own admin; there is no
  "other people" for a policy to bind.
- **Device presence / My Devices team roster** (cmux) — realtime online/offline across a
  team's devices. No team exists in Mender's model to have a roster.
- **Pricing / plans / Pro badge, billing** (cmux) — Mender isn't a subscription product and
  has nothing to check out for.
- **Telemetry consent** (Emdash) — the setting exists to turn off product analytics Mender
  never turns on; there's no PostHog project on the other end to opt out of.
- **iOS/iPadOS Simulator pane** (cmux) — blocked outright by this machine's own house rules
  (Android and macOS only, no iOS simulator tooling), not by MENDER.md.
- **Theme (light/dark app chrome)** (Emdash) — the village's night palette when a district is
  opened is the app's identity, not a preference; a light-mode toggle would be undoing a
  deliberate visual choice, not adding a setting.
- **Left-sidebar list metadata toggles** (line-change counts, PR-status icons, timestamps —
  Emdash) — these configure Emdash's own task-list rows; Mender has no such list (the rail
  and the gatepost carry this information differently already), so there's nothing here to
  toggle.
- **Browser profile / CORS / clear-data settings** (Emdash) — downstream of Emdash's in-app
  browser, which Mender's own catalogue already lists as cut on purpose (no in-app browser
  pane exists to have profiles or cookies).

## Already have (one line each)

- Add a project by picking a local folder (`main.ts` `found()`).
- Rename and remove a project, in two presses for remove (`yard/settings.ts`).
- Per-project icon picker and "what carries into a worktree" checklist — Mender's own,
  simpler take on Emdash's preserve-patterns (`yard/settings.ts drawSessions()`).
- Tmux-backed terminal persistence, hardcoded on rather than a setting — a deliberate,
  correct simplification of Emdash's configurable tmux-by-default (`board/talking.ts`).
- Agent selector, model/mode/effort/collaboration choices, all live off whatever the running
  agent's own protocol advertises (`board/card.ts`).
- MCP servers: list and toggle whichever ones an agent already has configured (`card.ts`).
- Skills: read-only listing of whatever an agent has been taught (`card.ts`).
- Agent CLI install for a not-yet-installed agent (`main.ts bring()`).
- Pull requests: create, list, merge (three strategies + bypass) (`board/sent.ts`).
- A real shell per checkout, tmux-backed (`board/talking.ts`).
