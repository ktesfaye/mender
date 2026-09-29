# Agent sessions and the chat: what to add

Mender already carries Emdash's whole ACP runtime and reproduces most of the chat surface in village form: thinking, plans, subagents, tool steps, permission asks, @-mentions, slash commands, queued messages, kept prompts. The real gaps cluster around three things the owner already flagged or that a live session can get stuck on with no way out: limits, sign-in, and multi-choice questions.

## NEED

### Typed session failures (usage/rate limits, overload, empty quota) and stop-reason notices · M
Has it: Emdash (adapter support, unused), cmux (rate-limits panel, per-status Feed banners). Mender: no — confirmed by the owner's own audit (`mender-00-read-first.md`): a limit "arrives as an ordinary answer on the board, in plain prose, with no reset time pulled out, no countdown." A cancelled/errored turn renders as a flat note (`"it broke off."`) with no distinction between "hit a token limit," "hit a turn limit," "rate-limited," "quota empty," or "the agent refused." Why it matters: an agent that goes quiet because it's rate-limited looks identical to one that's broken or just resting — you have no way to tell "wait" from "fix this" without leaving the village to read Claude's own terminal. Back end: ready but opt-in — Claude's ACP adapter already produces a typed `sessionFailure` (title + suggested action) and ACP itself carries a `stopReason` enum (`max_tokens`, `max_turn_requests`, `refusal`, …); Mender's `runtimes.acp` client just needs to ask for the report and `agents.ts`'s turn-error path needs to keep the distinction instead of collapsing everything to one string. In the village: the fire/gate vocabulary already has a slot for this — a rate-limit reads as the fire banking itself with a doing-text of "waiting out a limit · resets in {time}" instead of "it broke off," ticking down the same way the live elapsed counter already ticks up; a hard refusal or truncation stays sore/red like today's broken note, but with its own line instead of the generic one.

### Sign-in / auth for agents that need it · M
Has it: Emdash (`AgentSignInModal`, an embedded terminal with a Sign-in button on the auth-required error state), cmux (per-agent CLI wrapper + doctor checks). Mender: no — `board/card.ts` and `agents.ts` never surface an auth status; nothing in the `/agent` card offers "sign in." Why it matters: an agent that needs `claude auth login` or an API key just sits broke with no path back except opening the real shell and typing the command by hand — which works, but nothing on the card tells you that's what's wrong, or that it's even possible. Back end: ready — every plugin's `auth` capability (`cli-login`/`api-key`, `checkStatus`) is already wired into Emdash's runtime; Mender only reads `hands`/models/modes off the kit today and never asks for auth status. In the village: a line on the `/agent` card, only when the connected agent reports `unauthenticated` — `"{agent} needs you to sign in"` — pressing it opens the same real shell Mender already has (`board/`'s shell board), pre-filled with the agent's own sign-in command rather than a blank prompt.

### Answering a multi-select question · S
Has it: cmux (AskUserQuestion "Submit" / "Submit All Answers"), Emdash (the same ACP tool). Mender: no — `askOf()` (`agents.ts:838-848`) maps only the *first* pending request into one `text` + a flat `options` list, and `answer()` sends exactly one `optionId`; the gate's keys 1-9 each answer immediately on press. A question that legitimately wants several picks (checkbox-style `AskUserQuestion`) can't be answered as intended — at best you get to send one of several needed answers. Why it matters: this isn't a nice-to-have, it's an existing ACP question shape Mender can't correctly answer at all today. Back end: needs work — `askOf`/`answer` need to carry the question's multi-select flag and accumulate picks before calling `resolvePermission`. In the village: keys still pick options, but a multi-select question toggles a mark next to each chosen answer instead of answering on the first press, with a last, always-present option — "that's everything" — that actually sends; a single-select question behaves exactly as it does today, unchanged.

## WANT

### Diff preview inline in the transcript · M
Has it: Emdash (unified-diff card, 8 lines of context, clickable to open the file). Mender: partly — the cart shows only `"{path} · +{added} −{gone}"`, no lines. You can get the real diff by leaving the yard and reading the change on the checkout board, but not from the fire/cart itself. In the village: a step for a changed file could carry its first few marked lines the same way the checkout board already renders a diff, shown as a couple of lines under the step when you walk to it, without turning the cart into a full diff viewer.

### Cost / spend line · S
Has it: Emdash (a `Cost: $x.xx` line in the context popover, when the session reports one). Mender: no — the header shows only `context {N}%` and the model name, no dollar figure even when the underlying usage carries a cost. In the village: append it to the same header line only when the session actually reports a cost — `context 62% · sonnet · $0.84` — nothing shown for agents that don't report cost.

### Copy a whole message, not just a code block · S
Has it: Emdash (hover-revealed Copy button on every message). Mender: partly — only fenced code blocks are pressable-to-copy; a whole thought or plan has no copy affordance. In the village: the existing "press a code block, it's on the clipboard" convention extended to press-to-copy a whole thought/note the same way, no new visual language needed.

### Export a transcript · S
Has it: Emdash (Export transcript / Export raw ACP log from the conversation's context menu). Mender: no. Why it matters: nice for debugging or handing a transcript to someone else, not blocking. In the village: a line on the `/agent` card — "save this conversation" — writes a JSON file next to the worktree via the OS save dialog Mender already uses for project pictures.

### Mermaid diagrams · S
Has it: Emdash (lazy-rendered, clickable to a full-size viewer). Mender: no — `prose.ts` parses headings/tables/lists/code but has no Mermaid block type; a fenced ` ```mermaid ` block renders as plain code today. In the village: rendered inline the same size as a code block, pressable to open larger the same way an image would be — no dedicated viewer chrome needed given the board already has a read-scrim.

### Permission-queue depth · S
Has it: Emdash ("(1 of 3)" on the permission band). Mender: no — the gate always shows the single, first pending ask with nothing to say more are queued. In the village: append `"· 2 more waiting"` to the "it is asking" label when `askOf` has more behind the head of the queue.

### Auto-approve toggle at session start · S
Has it: Emdash (a switch in the create-conversation modal, seeded from the task's own default). Mender: no explicit control found — the permission flag on the header is read-only display, and whatever mode a session starts in comes from host/trust defaults with no lever in the "a new session" board itself. In the village: a second line on the new-session board, only for agents that support it — "ask first" / "just go" as a pressable pair, defaulting to whatever the last session used.

### Kill (keep history) vs. take down (delete worktree) · M
Has it: Emdash (Kill session stops the process but keeps the conversation resumable; Delete is the separate, permanent action). Mender: no — `does.press('end!')` always deletes the worktree, and `agents.evict` deletes the conversation alongside it in the same two-press action; there's no way to reclaim the worktree's disk space while keeping the transcript to read or resume later. Back end: needs work — `tasks.abandon` and `agents.evict` would need to be callable independently, and a resting-but-worktree-gone task needs somewhere to live (currently a task record *is* a worktree). In the village: probably a second, lighter option next to "take it down" rather than a new board — worth a real design pass before building, since it changes what a task record means.

### Fork a conversation / rewind to an earlier turn · L
Has it: cmux (Vault checkpoints, fork-from-turn into a new session that shares no state with the original). Mender: no. Why it matters: nice for trying two different next steps from the same point without losing either, not something a session is unusable without. Back end: needs work — ACP as Mender uses it has no per-turn anchor/checkpoint concept; this would mean teaching the runtime to snapshot a session's history at a point and start a second ACP session seeded from it. In the village: a pressable line on an old note on the gatepost — "start again from here" — cuts a new session (new hook, new worktree, same base branch) whose gatepost begins with everything up to that note.

### A history of ended sessions (Vault-lite) · L
Has it: cmux (Vault: every past and live session, grouped/sorted/filtered, transcript preview, resume). Mender: no — taking a session down (`end!`) deletes both the worktree and the conversation (`agents.evict` → `runtimes.conversations.delete`) in the same two presses, so once a session is gone there is nothing left to look back at, not even read-only. Why it matters: a week from now, "what did I actually ask Claude to do on the pricing branch" has no answer. Back end: needs work — this only becomes possible once "kill (keep history)" above exists as a real state, since right now nothing outlives the worktree. In the village: not a separate browser page (that would be the panel MENDER.md rules out) — a project's own checkout board already lists its git log; a closed session's transcript could hang there the same way an old commit does, pressed open the same way a commit is read.

### Remember the last model/mode per agent, and a default agent · S
Has it: Emdash (`provider-preferences.ts` persists model/effort/permission-mode/collaboration-mode per host+provider; a settable "Default agent" in Settings). Mender: partly — `tasks.remodel()` remembers a *model* per task for its own next launch, but nothing remembers "the last model I picked when using Claude" across different tasks, and the default agent for a brand-new session is hardcoded to `'claude'` (`agents.ts:85`, not a setting). In the village: store the last `/model`/`/mode`/`/effort`/`/collaboration` choice per agent id (not per task) and seed a new session with it; "who works here by default" becomes a line in the windmill (village settings), not per-project.

### An agent's update / uninstall, not just install · S
Has it: Emdash (Settings: Update / Check for updates / Uninstall per agent, with version badges). Mender: partly — the `/agent` card can `fetch()` (install) an agent that isn't here yet, but nothing on the card offers to update or uninstall one that is. Why it matters: an out-of-date CLI silently misses new models/flags with no signal anywhere in the village. In the village: when the host dependency snapshot reports an update available, the hand's own line on the card gains a second pressable state — its name, then "· update available" — same press-and-settle convention as everything else.

### Whatever's half-written on the line survives closing the app · S
Has it: Emdash (drafts, including pending image attachments, persist per conversation across restarts, capped at 65,536 characters). Mender: no evidence found — the write line is plain `contenteditable` DOM state with no memento/persistence layer in scope. In the village: same convention as a note already pinned to the gatepost, just held in a small per-task store until it's actually sent, so a restart doesn't erase a half-typed thought.

### A quiet, backgrounded window still tells you someone wants you · S
Has it: cmux (native macOS notification with inline action buttons when the app isn't focused). Mender: no — the main process already tracks window focus (`Watching`: `front`/`behind`/`gone`) but only uses it to throttle the animation loop, never to raise a notification. Why it matters: a session that starts asking while you're in another app just sits there flickering to nobody. In the village: a native OS notification only on the transition into "wants you" while the window isn't front — title the session's name, body its question or the doing-text — pressing it brings Mender forward and opens that session directly, the same as pressing its lantern.

### A pressable link an agent gives you · S
Has it: Emdash (renders `[text](url)` as a real, clickable link). Mender: partly/no — `prose.ts` currently keeps the link's text but discards the URL entirely, so a link an agent cites (a doc, an issue, a deploy preview) can't be opened at all, only read as plain words. Why it matters: this loses real information, not just polish. In the village: no underline and no visible URL either — this stays exactly gold like everything else pressable, and pressing the sentence opens the link externally, which is the same "gold is pressable" rule the rest of the board already follows; it does not need a hover state or a URL ever printed on the wood.

### Put an agent back to sleep when you've left it a while · M
Has it: cmux (hibernation — kills idle background agent processes past a live-terminal cap, resuming on return). Mender: no — `wake()` only launches a process when its board opens, but nothing currently kills it again once you leave; a village user who opens ten sessions over a day genuinely accumulates ten live CLI processes with no way back, the same problem hibernation solves in cmux. Back end: needs work — nothing today terminates a woken ACP process short of taking the whole session down; this needs a "stop the process, keep the conversation and worktree" primitive, the same one "kill (keep history)" above needs. In the village: cmux's own form (a live-terminal cap, a settle window) doesn't fit a one-screen app with no terminal count to watch, so this isn't cmux's UI ported over — it's the natural extension of "resting" once that primitive exists: a session left resting long enough with nobody watching goes properly dark (`session.cold` already dims the yard for this), except the process behind it is actually gone; opening its lantern wakes it exactly the way opening any suspended session already does today.

## SKIP

- **Claude Code Teams / oh-my-\* multi-agent orchestration wrappers** (cmux) — a tmux-shim trick that makes one CLI's own teammate sub-panes appear as more terminal panes, because cmux's terminals are otherwise one process each. Mender doesn't have that constraint to work around: every session already gets its own real worktree and its own villager, so running several coordinated agents on related work is already native (start several sessions on related branches) rather than something bolted onto one shared worktree. The thing underneath — several agents working the same problem at once — is already there in a form that fits the village; the tmux-hack delivery mechanism specifically is what's cut, and MENDER.md rules out two agents in one working tree regardless.
- **CodeRouter shared upstream credentials for cloud machines** (cmux) — team billing/routing across a fleet of cloud VMs sharing pooled API accounts. Genuinely pointless for Mender: there are no cloud machines here to route, and Mender is explicitly local-first, single-user.
- **Multiple conversations per task** (Emdash allows several conversations, ACP or PTY, under one task). Mender's model — "an agent runs in a task, and it is a villager" — is one agent per session by design; a second conversation in the same worktree would put two agents in one working tree, which MENDER.md explicitly rules out. The underlying want (try two approaches from the same point) is the **Fork a conversation** item above, which does it with two worktrees instead of one — a real want, just not in upstream's shape.

## Already have

- @ file mentions, narrowing live against the checkout's file index.
- / slash commands: the agent's own advertised commands, the village's own settings (`/model`, `/mode`, `/effort`, `/collaboration`, `/agent`), and kept prompts (`/keep`, `/forget`).
- Queued messages sent while the agent is busy, listed and individually retractable ("still to say").
- Model / mode / effort / collaboration-mode selection, each only offered when the connected agent actually reports choices.
- MCP server on/off toggling from the `/agent` card.
- Skills listing from the `/agent` card (though it's hardcoded to `.claude/skills` regardless of which agent is selected — a separate, already-tracked bug, not a missing feature).
- Picture attachments: drag/drop/paste, a carried-chip UI, put-down-before-sending.
- Non-picture dropped/@ referenced files, written onto the line as a path.
- Thinking/reasoning stream, posted plans, subagents ("hands" standing in the ground), and a step list with a prop icon per tool kind.
- Permission prompts with an arbitrary agent-supplied option set, answered by number key.
- Context-usage percentage, turning orange under 15% remaining.
- Session rename (locks out agent auto-retitling), auto-retitling from the agent's own reported title until then.
- Cancelling the current turn (hush) and retracting an unheard queued message (unsay).
- Copying a code block to the clipboard by pressing it.
- 33 ACP-capable providers, agent switching (with the old session torn down first), and an install flow from the card.
- Markdown rendering: headings, lists (nested), tables (with numeric right-align), blockquotes, code fences, bold/italic/inline-code.
- A cross-project view of who wants you: the island's own lit/pulsing buildings from the water, and Cmd+K's finder, which lists every session in every project with a mood mark (`?` asking, `✗` broken) — together already cover what cmux's Feed sidebar is for, without a dedicated inbox board.
