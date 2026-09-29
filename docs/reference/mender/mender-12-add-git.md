# Git, review, pull requests and issues: what to add

Mender already has a real git surface on the checkout board — stage-free commit, push/pull/publish,
diff reading, commit history, blame, and a PR board with merge/create — all landed in W3–W4. What's
missing clusters into four shapes: things the back end already does that never got a village form
(issues, automations, multi-account, line comments, lifecycle scripts); the actual *end* of a
session's work (landing it in main and cleaning up after), which nothing in either inherited back end
does cleanly; things cmux does that Emdash's back end doesn't have at all (a proper diff viewer,
stash); and things that are probably wrong for Mender's "one thing at a time" design regardless of
who has them.

Every row below was checked directly against `apps/mender/src` (grep + read) and, where useful,
against the actual Emdash source now sitting in this checkout at `apps/emdash-desktop/src` (not just
the catalogue prose) — file/line citations are given where I read code rather than a catalogue entry.

## NEED

### GitHub / issue-provider connection surface · M
Has it: Emdash (OAuth, device flow, CLI-import, 12 form-based providers, multi-account with an
"act as" strip). cmux: GitHub-adjacent only (its `review`/`comments` CLI reads local git-metadata
receipts, no OAuth or tracker connections). Mender: no — confirmed by grep, no
`github`/`account`/`integration` files under `apps/mender/src`; WS-10, WS-54 blank in the ledger.
Why it matters: nothing else in this list works without it — no PR creation beyond bare system git
credentials, no issue linking, no CI-check reading tied to an identity. This is the one truly
load-bearing gap: every other row here either depends on it directly or degrades without it.
Back end: ready. `github/browser/github-integration-auth.tsx`'s three connect methods and the
`integrations/` provider registry are all inherited, untouched.
In the village: a "place," not a flow — belongs in the project's settings window (MENDER.md:
"settings are about the place, not the work"), one more line: "who works here," opening a small
stack of provider rows (GitHub, Linear, Jira, GitLab, …), each pressable to connect. GitHub gets the
device-flow treatment already used elsewhere for machine-pairing — a monospace code, a countdown,
done.
Effort: M — three auth flows plus a settings page section; no new interaction vocabulary needed.

### Landing a session's work in main, end to end, and cleaning up after · L
Has it: Emdash, partly — the PR path exists (create → checks → merge, `pr-entry.tsx`) but there is
**no branch/worktree cleanup wired to it**: the Delete Task modal's "Delete branch(es)" checkbox
(`useTaskSettings.ts` `deleteBranchByDefault`) is offered on every task deletion regardless of
whether the branch ever merged, not as a "this landed, clean up" action. There is also **no local
merge path at all** — I grepped `apps/emdash-desktop/src/core/features/source-control` and
`tasks/` for a base-branch merge/integrate action and found none; merging is only ever done through
GitHub's merge API on an open PR (`pr-entry.tsx` `MergeMode`). A local-only project (no GitHub
remote) has no way to land a session's branch into its base at all. cmux: n/a (it doesn't manage
worktree lifecycle end-to-end the way Emdash/Mender do). Mender: no — `main.ts` `ending()` calls
`client.tasks.abandon(...)` unconditionally; taking a session down never offers to delete its branch,
never checks whether the branch was merged, and there is no "merge this session's branch into
`<base>`" action anywhere in `apps/mender/src` for a project with no GitHub remote.
Why it matters: this is the actual point of using the app — a session exists to produce something
that ends up in the trunk. Right now Mender can create the branch and the PR and merge the PR, but
taking a session down afterward is disconnected from any of that: nothing tells you the branch went
in, and nothing offers to remove it. For a project with no GitHub remote, there is no way to finish
at all short of a manual `git merge` outside the app.
Back end: partly ready. The PR-merge half is inherited. The local-merge half and the
merge-aware-cleanup half need new work on both sides — a Wire mutate for "merge this checkout's
branch into `<base>`" doesn't exist upstream, and cleanup has to be plumbed off *actual* merge state
(checked against the base ref), not a static default checkbox.
In the village: taking a session down (the two-press "send everybody home and take this down" on the
card) is where this belongs, not a separate flow. Before the second press, if the branch has landed
(GitHub says merged, or — for a local project — its tip is now an ancestor of the base), the offer
changes from a bare cost-preflight to "it went in — take the branch with it?" with the branch's
history line still visible. For a local project with no PR, add the one thing genuinely missing on
the checkout board itself: a line next to "send it up" that reads "bring it into `<base>` here,"
doing a local merge and reporting the git-error vocabulary (`board/trouble.ts`) already wired for
every other git action.
Effort: L — a new backend mutate, new merged-state detection, and a rewrite of the take-down flow's
copy and branching logic.

### Setup, run and teardown lifecycle scripts · L
Has it: Emdash (Prepare/Setup/Run/Teardown, four project-level shell-command fields
run at each worktree lifecycle stage, with a live per-task activity badge showing which step is
running — `emdash-04-projects-remote.md` lines 245–257; `emdash-03-tasks-workbench.md` lines
391–426). cmux: n/a (no per-project lifecycle-script concept; its "recipes" are cmux.json layout
templates, not repo-owned scripts). Mender: **no** — confirmed by grep across `apps/mender/src` for
`scripts.prepare|setup|run|teardown`: zero hits. `main/projects.ts` reads and writes
`preservePatterns` only (line 164, 318); AGENTS.md itself documents `scripts.prepare/setup/run/
teardown` as real `.emdash.json` fields the back end already understands, and Mender's settings
window (`yard/settings.ts`) never surfaces them.
Why it matters: preserve-patterns alone only carries *files* into a fresh worktree (`.env`, etc.); it
never *runs* anything. Any project that needs `npm install`, a docker service, or a build step before
an agent can do useful work in a new worktree is currently unusable in Mender — the session starts,
the agent tries to run the app, and there is nothing there. This is arguably as load-bearing as the
GitHub connection: without it, whole categories of real projects don't function in a fresh session.
Back end: ready. The lifecycle runner, its step vocabulary (`LIFECYCLE_STEP_TITLES`: Adopt worktree,
Fetch branch, Fetch refs, Prepare, Setup, Run, Teardown), and the `.emdash.json`/DB-backed script
storage are all inherited and already wired to worktree creation.
In the village: the project settings window is where `.emdash.json`-owned things belong (it already
lists what a new session "carries into its worktree that git would leave behind" — preserve
patterns). Add the four scripts as one more thing in that same list: four short lines of shell,
typed the way a commit message is typed. What it does *while running* is not a settings concern —
that's the fire: a session whose worktree is still being prepared shows the small sparks-fire "doing"
line already used for live tool calls, just captioned with the script's own name ("running setup…")
until it hands off to the agent.
Effort: L — four new settings fields plus wiring the existing lifecycle-step events into the yard's
live "what it's doing now" line, which doesn't yet know about pre-session steps at all.

### Conflicts — detecting, showing, and handing to the agent · M
Has it: Emdash, partly. Conflict *detection* exists (`checkout-changes-state.ts` line 77:
`entry.isConflicted`; `merge-ui-state.ts`'s `'conflicts'` PR status), and a conflicted file gets its
own icon and color (`changes-list-item.tsx` line 142, `SquareX`/`text-foreground-conflict`). But I
found **no conflict-resolution flow anywhere** in `apps/emdash-desktop/src/core/features/
source-control` — a conflict is reported ("Resolve conflicts before merging," "Pull has merge
conflicts") and then it's the user's job outside the app. cmux: no conflict-specific UI found either.
Mender: the same shape, at a smaller scale — `board/trouble.ts` lines 39–40, 110 render "it stopped
on a conflict; the files it could not settle are in the tree" and a `merge_conflict` vocabulary
entry, and `board/sent.ts` line 146–148 shows "it and the other end have both moved" for a
`CONFLICTING` PR — but nothing past the message. No conflicted-file content is shown, and there is no
way to ask the agent to resolve it from the board.
Why it matters: in an agent-first tool, a conflict is exactly the kind of thing you'd want to hand
back to whoever is standing in the yard rather than go fix by hand in a terminal. Right now Mender
tells you a conflict happened and stops — the one moment the app most needs an escape hatch, it
doesn't have one.
Back end: needs work. Neither Emdash nor Mender's inherited git runtime exposes a structured
"conflicted file, with both sides' content and the conflict markers" read — only a boolean/status
flag. Getting real content for a conflicted file (as opposed to a status) is new plumbing.
In the village: a conflicted file reads on the board exactly like a change does today
(`board/changed.ts` `readOut()`), except the "throw it away" offer at the bottom is replaced with one
line: "hand this to it" — which puts the conflicted file (both sides, unresolved) into the next thing
said on the gatepost, the same mechanism line comments (WANT, below) already use to fold context into
a prompt. No new UI surface, one new offer on an existing board.
Effort: M once the back end can read a conflicted file's two sides; S for the village form on top of
that.

### Automations (scheduled agent runs) · L
Has it: Emdash (cron + manual, per-project, full run history, self-healing scheduler,
`packages/core/src/runtimes/automations/`). cmux: no direct equivalent (its
`~/.cmuxterm/automations.json` is an OS-event rule engine — flash a pane, send a notification — not
scheduled *agent* runs). Mender: no — absent from `apps/mender/src`; STATE.md doesn't list it.
Why it matters: "watch this repo and fix high-severity bugs nightly" is a real, standing use of an
agent that a one-window village otherwise has no way to represent, because nobody is standing in the
yard when it fires.
Back end: ready, untouched.
In the village: an automation is a session nobody is standing over, so it looks like one — a lantern
on the rail that lights on its own at the scheduled time, runs, and goes back to embers, with no one
in the yard to answer a question (so it should fail closed rather than block on one). Setting one up
is a line on the project settings page: a cron-ish picker (a short list of common cadences plus
"custom") and the same write-line used everywhere else for the prompt.
Effort: L — real scheduling UI plus a new self-lighting rail-lantern state nothing else needs yet.

### Issue linking at session creation · M
Has it: Emdash (issue picker in New Task modal, 12 providers). cmux: no. Mender: no — WS-56/WS-57
blank, no issue-selector code found.
Why it matters: MENDER.md's founding metaphor is "what you asked for is nailed to a gatepost." For
teams that manage work in a tracker rather than freehand prompts, starting a session *from* a ticket
is the normal way work starts. Depends on the connection surface above existing first.
Back end: ready, untouched — the issue-context-into-prompt machinery is inherited whole.
In the village: the empty hook that starts a session already asks what's going to happen in it — one
more thing it can be told. A small "from a ticket" line under the write-line opens the same
slash-style slab already used for files and commands (search box, provider logos, status dots). The
ticket's identifier goes on the gatepost as the first line, exactly the way a typed ask does.
Effort: M — wiring an existing slab pattern to a new Wire client.

### Whole-branch diff and a full PR entry (Files + Commits tabs) · M
Has it: Emdash (PR entry's Files tab — the branch's full base→head diff, flat/tree — and Commits tab
— virtualized, expandable per-commit file lists, `pr-entry.tsx`/`commits-list.tsx`). cmux: yes, as a
first-class diff source ("Branch diff," with a branch/ref picker, `cmux-08` line 170). Mender: **no**
— read `board/sent.ts` directly: the PR board renders only a title, description, a checks summary
(`machines()`), and a merge footer (`landing()`). There is no Files tab and no Commits tab anywhere
in it — the only per-commit browsing in Mender is the district board's own "since" commit list
(`board/district.ts` `Place.since`), which is commits-only, not diffable as one whole-branch change.
Why it matters: right now the only way to see everything a session actually changed, in one diff, is
to open the PR on github.com — the app can create the PR and merge it, but can't show you what's in
it. For a local-only project (no PR at all) there's no way to see the whole-branch diff in Mender
whatsoever.
Back end: ready for the PR case (`api/browser/stores/pr-store.ts` already computes base→head diffs
with a local-merge-base fallback); needs a small addition for the no-PR case (diffing the checkout's
current HEAD against its recorded base, which `Place.since` already knows).
In the village: this is a second thing pressable from the checkout board next to "what was done in
it" — "everything, since it started" — opening the same diff-reading board a single file's change
opens today (`board/changed.ts`), just showing every changed file with the file list as a spine
rather than one file.
Effort: M — mostly reusing the existing diff-reading board and PR-store diff computation.

## WANT

### Bringing main into a session (merge/rebase with base) · M
Has it: Emdash, only as a side effect of PR sync — the checkout-drift "Update now" button
(`checkout-drift-line.tsx`) fast-forwards a worktree to its *own PR's* head; there is no general
"merge/rebase this branch onto the latest `<base>`" action outside of that, confirmed by grep (no
base-branch-merge action found in `source-control/` or `tasks/`). cmux: no. Mender: no — the district
board's "bring commits down" (`board/district.ts` lines 281–330) is the branch's *own* remote
tracking (ahead/behind its upstream), not a sync against the base branch it forked from; there is no
"main has moved, bring it in" action anywhere.
Why it matters: real, but narrower than it first looks — most sessions are short enough that base
drift never bites, and Emdash itself doesn't have a clean general version of this either (only the
PR-specific fast-forward). Worth having; not a blocker.
Back end: needs work on both sides — no base-branch-merge/rebase mutate exists upstream.
In the village: a line on the checkout board next to the branch status, appearing only when the
board can tell the base has moved: "bring `<base>` in" — a merge (not rebase, to avoid rewriting a
worktree an agent may be mid-turn in) that reports through the existing git-error vocabulary,
including a conflict outcome that hands off to the conflict flow above.
Effort: M, once the merge mutate exists.

### Draft line comments on a diff ("notes for the agent") · S
Has it: Emdash (hover a diff line, pin a note, folds into the agent's next prompt; 200/task cap).
cmux: yes, differently shaped (content-addressed in git metadata, readable even with the app closed).
Mender: no — WS-44 explicitly cut; confirmed absent from `board/changed.ts`.
Why it matters: the single most direct way to steer an agent from inside a diff rather than switching
to prose on the gatepost. Nice, not essential — the gatepost already says the same thing in words.
Back end: ready. `primitives/line-comments/api/line-comments.ts` is untouched.
In the village: a pressed diff line offers one more thing besides "copy" — a small mark that turns
into a pinned line of writing, gold like everything pressable, gone with a second press. It rides
into the next thing said on the gatepost, same as Emdash folds it into the prompt.
Effort: S — the store and fold-into-prompt logic already exist.

### Reading PR review comments on the board · S
Has it: Emdash (`comments-list.tsx`: full rendered Markdown body, author, avatar, `path:line`
location, resolved marker, per conversation comment). cmux: n/a in this shape (its review system is
local receipts, not GitHub PR comments). Mender: partly — `board/sent.ts` `review()` shows only an
aggregate one-line summary of the review *decision* ("somebody has looked at it and wants something
changed"), never the actual comment text, and never a failed check's own output.
Why it matters: the aggregate line tells you *that* something needs changing but not *what* — the
agent (or you) still has to open GitHub to read it. For a tool whose whole point is handing things to
an agent, the comment bodies are the useful part.
Back end: ready — `pull-requests/` already fetches full conversation items; Mender's `sent` type just
doesn't carry or render them yet.
In the village: under the checks summary, the same "the ones that failed get a line each, the rest
get a count" pattern `machines()` already uses — each review comment becomes a line with its author
and a short quote, pressable to read in full and to hand to the agent the way a diff-line comment
does above.
Effort: S — the data is already fetched; this is a rendering + hand-off addition to an existing file.

### AI-drafted commit messages and PR title/body · M
Has it: **neither**, as best I can verify — I want to flag this directly since the brief states
Emdash has it. `commit-card.tsx` and `create-pr-modal.tsx` in the actual Emdash source checked into
this repo (`apps/emdash-desktop/src/core/features/source-control/...`) have no generate/sparkle
affordance (grepped for `generat|sparkle|ai.*draft|wand`: zero hits in either file), and the
catalogue's own "Unverified" note independently says the same thing. There *is* an upstream branch
named `jan/eng-985-add-commit-message-generator` (visible via `git log --oneline
upstream/jan/eng-985-add-commit-message-generator`), but it has zero commits ahead of the point this
fork branched from — it looks like planned-but-unlanded work, not a shipped feature. Treating this as
"neither app has it today" rather than "Mender is missing an Emdash feature."
Why it matters: still worth having regardless of provenance — writing a commit message or a PR
description is exactly the kind of small, mechanical writing an agent already sitting in the session
could do for free.
Back end: needs work — no generator function exists anywhere in the inherited code; this would be
new.
In the village: not a separate AI button (nothing else in the app has one — MENDER.md's whole
vocabulary is the agent doing things, not a UI assist). If built, it should be the *agent itself*
doing it as a normal turn — "write the commit" is already an errand a session can be asked to run;
the commit composer's message field could simply prefill from whatever the agent last said about the
change, with no dedicated generation button.
Effort: M, and only worth it after the session-completion flow (NEED, above) exists to hang it off.

### Amend / undo last commit / revert a commit · S
Has it: **neither** — checked directly. Emdash's `commit-card.tsx` has no amend action; I found no
revert-a-commit or soft-reset action in `source-control/`. Mender's own "undo" (`main.ts` line 994,
`board/changed.ts` `undo()`) is confirmed to be **working-tree discard**, not commit undo — its own
doc comment says so explicitly ("A committed change is history and there is nothing to undo about
it... the only thing in the village that can be thrown away").
Why it matters: minor, and arguably intentional — Mender's own code comment already states the
design position (committed history isn't undone). A genuine "I committed a typo, fix the message"
case exists but is narrow.
Back end: needs work — no amend/revert mutate found upstream.
In the village: if ever added, it belongs on the commit-read board (`board/made.ts`) as one more
offer next to a commit's files, worded the same way as everything else here ("say it differently" for
amend, two-press for revert) — not a new concept.
Effort: S, low priority given neither app has treated it as missing before now.

### PR draft-at-creation toggle · S
Has it: Emdash (split "Create PR"/"Create draft PR" button, `pr-section.tsx`). Mender: no —
`main.ts` line 1503 hardcodes `draft: false` on every PR Mender opens; "mark ready" exists
(`board/sent.ts` `landing()` "say it is ready", `ready-pull` pick) but there's no way to open one as a
draft in the first place.
Why it matters: small but real — someone who wants early CI feedback without asking for a review has
no way to say so.
Back end: ready — the PR-create mutate already accepts a draft flag; Mender just never sets it.
In the village: one more line next to "open one" in `board/sent.ts` `opening()` — "open it as a
draft" alongside the existing open action, not a modal.
Effort: S.

### Branch naming controls (prefix, no-random-suffix) · S
Has it: Emdash (`RepositorySettingsCard`: "Append random branch suffix" toggle, a configurable
branch prefix, `emdash-11-gaps-b.md`). Mender: no — confirmed absent from `yard/settings.ts`; a new
session's branch always self-names with no user control (`main.ts` line 2718: "it gets its own
branch, and it will name itself").
Why it matters: minor — matters to teams with branch-naming conventions enforced by CI or tooling
(`feature/`, ticket-ID prefixes); everyone else is fine with auto-naming.
Back end: ready — the `nbranch` generator Emdash uses is inherited; it just isn't given a prefix
setting to read.
In the village: one field in the project settings window, next to preserve patterns — what a new
session's branch starts with.
Effort: S.

### Multi-GitHub-account "act as" picker · S
Has it: Emdash (colored provenance dot, "Act as" popover, per-project/per-action persistence).
Mender: no (depends on the connection surface NEED existing first).
Why it matters: only matters once more than one connected account exists. Real but narrow.
Back end: ready, same provider-identity-strip code.
In the village: a second line under "who works here" in settings — a place-level decision, set once
per project rather than asked at every push.
Effort: S, once the base connection surface exists.

## SKIP

- **Auto-merge (merge automatically once checks pass)** — checked both catalogues and both actual
  source trees directly; **neither Emdash nor cmux has this feature at all.** Nothing to add; not a
  Mender gap, a feature neither upstream app built.
- **Reviewers on PR creation** — also checked directly: Emdash's `create-pr-modal.tsx` has no
  reviewer field of any kind (confirmed by grep, zero hits for "reviewer"). Not a Mender gap either;
  correcting the assumption that Emdash has this.
- **Switching branches in a project's own shared checkout** — doesn't fit either app's model. Both
  Emdash and Mender are worktree-isolated: a branch is something a *session* is cut on, never
  something you switch underneath a shared checkout while other work might be going on in it.
  Emdash's own "branch already checked out in task X" warning (`emdash-03` lines 138–140) exists
  specifically to *prevent* two things sharing one branch. The real, missing piece here is already
  covered above ("starting a session from an existing branch, not just the default" — folded into
  the whole-branch-diff/base-tracking NEED items rather than a standalone branch-switcher).
- **GitLab/Forgejo as PR-hosting providers (not just issue trackers)** — checked directly: Emdash's
  own PR section says "Pull requests are currently available only for configured GitHub remotes"
  (`emdash-05` line 274), and both providers appear only in the issue-tracker table, never the git
  host list. Emdash's own back end doesn't do this, so it isn't a Mender-specific gap — connecting
  them as *issue trackers* is already covered by the connection-surface NEED above.
- **PR list/filter at the project level (WS-46)** — cut on purpose. A project in Mender has no
  "all PRs across every session" screen; MENDER.md's whole design is that you stand in one session's
  yard.
- **Floating multi-select action card on file selection (WS-37) and per-hunk stage/unstage** —
  Emdash doesn't even have hunk-level staging, and Mender has no staging area at all ("there is no
  staging area here and no word for one" — MENDER.md).
- **Preview-vs-pinned diff tabs, prefetch-on-hover (WS-38/39)** — tab strips are explicitly the kind
  of app chrome MENDER.md rules out ("no tab strip"). One board shows one diff.
- **Best-of-N / multi-agent comparison runs** — neither catalogue shows a genuine side-by-side
  "run N agents, compare" feature. Nothing to add.
- **Stash** — Emdash confirmed absent; cmux's diff-source list implies one but no catalogued
  create/pop UI was found either. Mender's existing "throw it away" / "commit" pair already covers
  what stash is usually reached for.
- **Diff word-diff / find-in-diff / collapse-unchanged toggles** — a reading aid for long diffs;
  Mender's board already reads a whole file in context, and MENDER.md's "a little of what is around
  it" suggests unchanged context is deliberately trimmed already.
- **cmux's rule-based OS-automation engine and Custom Sidebars** — out of category (pane-flash,
  notifications, user-authored panels) for a one-screen village with none of those surfaces.

## Already have

- Stage-free commit composer (message + description, commit/commit & push/commit & PR) —
  `board/made.ts`, `board/committing.ts`.
- Diff reading (unified, whole-file-in-context) — `board/changed.ts` `readOut()`.
- Commit history and blame-by-run — `board/made.ts`, `board/reading.ts` `whose()`.
- Branch status, fetch/pull/push/publish with git error vocabulary — `board/district.ts`,
  `board/trouble.ts`.
- PR creation, checks summary, review-decision line, merge with 3 strategies — `board/sent.ts`.
- Throw-away-a-change and two-press destructive confirms — `board/changed.ts`, `board/district.ts`.
- Real shell in the checkout — `board/talking.ts` `openShell()`.
