# Slash commands and settings: which have a village surface, which don't

Audit of 2026-10-20. Command list is **verified**: dumped from the live bridge
(`check:bridge`, claude 2.1.288, bridge 0.73.0), 88 commands. What each one
does when sent as text is **inferred** (no real turns were run, to spare the
subscription); confirm with a fake-agent replay before building.

The rule: anything that is a setting or a thing you do should be a pressable
surface in the village. A command that only comes back as prose is a gap.
Only the village's own ten (`OURS` in `board/palette.ts`) are intercepted; every
other command is written to the agent as a sentence and answered as markdown.

## Covered (a real surface does it)

| Command | Surface |
|---|---|
| /model, /default-model | slash choice list, Fable marked |
| /effort, /default-effort | slash choice list |
| /mode, /collaboration | slash choice list |
| /agent | the card: who works, servers, skills, sign-in, update, export |
| /mcp | card, servers line (add, catalogue, remove) |
| /resume | past terminal sessions board |
| /keep, /forget | the village's own kept prompts |
| /compact | the compaction strip draws it, but nothing *starts* it (see gaps) |
| /context | fill line at the foot of the board (no breakdown) |
| /usage | hover on the fill line, windmill "this machine" page |
| /rename | double-press the name at the top of the yard |
| skills (the ~60 taught ones) | card shelf, and the slash list as text commands |
| /fast | bridge turns it into a two-way choice the card draws (unchecked in the running app) |

## Gaps: setting-like, prints prose or nothing

| Command | What it should be | Where it lives |
|---|---|---|
| **/config** | A windmill page of real switches. Today a wall of text. | `~/.claude.json`, `~/.claude/settings.json` |
| **/autocompact** | A switch plus the threshold, on the context line and on the config page | `autoCompactWindowsCache` / settings |
| **/output-style** | A choice list like /model | `settings.json` `outputStyle` |
| **/auto-mode-setup** | A small guided board for auto mode | `settings.json` `autoMode` |
| permissions (allow/deny rules) | Editable list per project and global. Not in the slash list at all | `settings.json` `permissions` |
| hooks | List, add, remove. Not reachable at all | `settings.json` `hooks` |
| plugins and marketplaces | Installed list, on/off, add marketplace. Not reachable | `enabledPlugins`, `extraKnownMarketplaces` |
| theme, editor mode, voice | Probably cut on purpose (the village has one look); record the cut | `theme`, `editorMode`, `voice` |
| cleanup period (`cleanupPeriodDays`) | One number; sits beside "when a session ends" | `settings.json` |
| env | Per-project env exists; the global one has no page | `settings.json` `env` |
| notifications the CLI sends (`inputNeededNotifEnabled`, `agentPushNotifEnabled`) | Probably cut, the village has its own | `settings.json` |
| model switching on flag (`switchModelsOnFlag`) | One switch | `settings.json` |

## Gaps: things you do, prose only

| Command | What it should be |
|---|---|
| **/compact** | A gold line on the context readout: "make room now", optional focus line. The strip already exists to draw it |
| **/context** | Breakdown of what fills the head (system, tools, files, chat) as a bar on the readout |
| **/usage** | Fine as the existing hover, but the command itself still answers in prose; point it there |
| **/init** | One press on a project with no CLAUDE.md, in the checkout board |
| **/goal** | A goal line beside "what it is after" on the story column |
| **/recap** | Already automatic; the command should just refresh the recap |
| **/insights** | Opens its report as a document the way a made page does |
| **/agents, /list-agents** | Clash with the yard's helpers; probably map to the helper table |
| **/security-review, /code-review, /simplify, /debug, /batch, /loop, /run** | Skill-shaped; fine as text, but each wants a one-line "what this does" in the slash list (it is there) and a result that lands as a made thing |
| **/reload-skills** | Automatic after the card teaches one; the command can be a no-op that says so |
| **/team-onboarding** | Probably cut |
| **/heapdump** | Cut, developer only |
| **/release-notes, /cost, /todos, /login, /logout, /clear, /doctor, /color, /focus, /reload-plugins** | Already dropped by the bridge on purpose |

## Not in the slash list at all (the terminal has them, the bridge hides them)

Permissions editor, hooks, plugins, memory files, status line, vim mode, add-dir,
review, bug report. Unverified which of these the terminal's `/` really lists;
`check:bridge` only reports 93 vs 88 and the five dropped above.

## Suggested order

1. **A /config page in the windmill** (output style, auto compact, cleanup, env,
   model switching, permissions, plugins, hooks). One page, answers the most
   complaints, and /config, /autocompact, /output-style and /auto-mode-setup all open it.
2. **Make room now** and the context breakdown on the fill line (/compact, /context).
3. **/init** on a bare checkout, **/goal** on the story column.
4. Record the cuts (theme, vim, voice, heapdump, team-onboarding) in BUILD-CATALOG.

## Built 2026-10-20

Designs: `~/mender-scratch/popups/mock/` (m-claude, m-perms, m-plugins, m-hooks, q-context, s-goal-init).
Built: Claude Code, Permissions, Plugins, Hooks pages in the windmill; the head popover for
/compact and /context; the init tile on a session's checkout board; the slash routes for
/config /autocompact /output-style /auto-mode-setup /permissions /plugin /hooks.
Verified keys: `autoCompactEnabled` in `~/.claude.json`, `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` env in `settings.json`.
Not built, and why: context breakdown (no source for it), /goal row (the goal's state is not exposed).
Cut on purpose: theme, vim mode, voice, heapdump, team-onboarding.
