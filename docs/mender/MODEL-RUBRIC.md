# Which model, when

Draft rubric for adaptive models. Nothing implements it yet.

## Where it comes from

Three sources, 2026-10-28:

- Anthropic's own Opus 5.5 and Sonnet 5.5 announcements, the models overview
  and "choosing a model" pages, the Claude Code model and subagent docs, and
  Artificial Analysis' independent run (whose numbers came from a pre-release
  build and are due a re-run).
- Every Claude transcript on this Mac: each time Kirubel switched a session's
  model by hand and what he had just said.
- Every human turn in those transcripts read and labelled: was it a
  correction, and what kind of work was it. Thin: a few hundred turns, since
  most work runs unattended. Read it as direction, not measurement.

## What the evidence says

**On paper the two are close.** Opus 5.5 leads Sonnet 5.5 by a few points on
most coding, reasoning, computer-use and chart-reading evals, is level on
knowledge work, and is *behind* on terminal work (Terminal-Bench). Opus
costs twice as much per token. Anthropic's one plain claim is that Opus
"remains clearly stronger at complex, open-ended work requiring sustained
judgment", and its own matrix puts multi-hour autonomous agents, large
refactors, complex systems engineering and vision-heavy work under Opus.
Independent testing also finds Opus noticeably better at getting facts right.

**Sonnet at its highest effort is a false economy.** It then spends far more
tokens than Opus to finish the same task, and cost per task ends up higher.
If a piece of work needs Sonnet pushed to max, it needs Opus.

**Effort is often the better lever.** Anthropic says tuning effort usually
beats switching model, and an effort change can keep the cached conversation
where a model change throws it away.

**In his sessions, Sonnet's misses have a shape.** Overall it was corrected a
little more often than Opus, not dramatically, but the misses cluster:

1. *It can't judge what it sees.* Called its own render "done and looks
   great" when it was low-poly; said the splash was fixed with a gap still in
   the corner; shipped a clipped splash; answered "mostly no" about a design
   without opening the design.
2. *It doesn't find the real cause of a visible bug.* Spent a whole session
   trying to reproduce a flicker he had already screenshotted and marked;
   chased the wrong cause of a GIF problem for hours; blamed the host, then
   his VPN, then fixed one endpoint at a time. Visible bug fixes were its
   worst category by far.
3. *It misreads what he meant and defends the first reading.* Built the wrong
   reading of the slash list and told him his screenshot was an old build;
   started building when he asked how something would work.
4. *It says done without running it.* Anthropic names the same weakness,
   mostly at low effort.

**Where Sonnet was fine:** chores (commits, pushes, publishing, dock and
system tidying), questions and explanations, travel and money Q&A, small
well-specified features and tweaks, and coordinating other sessions with
clear steps. No corrections across whole sessions of that.

**Opus is not a cure-all.** Performance investigations frustrated him on Opus
too. Opus's corrections on design were mostly him choosing between options,
which is the point of design, not it getting things wrong.

## The rule

Sonnet is the default. A piece of work goes to Opus when it needs something
Sonnet is shown not to do well:

1. **Judging anything visual.** Design, concepts, mockups, motion, matching a
   picture or a design exactly, deciding whether a render or screenshot looks
   right, reading a screenshot he sent. He: "you should never design on
   Sonnet."
2. **A cause nobody knows yet.** A bug he can see that isn't obvious from the
   code, flicker, jank, slowness, something that happens "randomly". A located
   bug with an obvious cause stays on Sonnet.
3. **An ask that's open or ambiguous.** An ambition rather than a defect
   ("give it a lot of love", "make it feel..."), a redesign, a plan or
   architecture, anything where what he means has to be worked out.
4. **Long work he won't be watching.** A Jira ticket to done, a brief to
   follow, running other sessions or helpers through to the end.
5. **Facts that have to be right.** Research where sources are weighed and an
   answer recommended, anything about money, dates, eligibility.

And it goes to Opus for the rest of a piece of work the moment:

- he corrects it on the same thing twice, or says "look again", "that's not
  what I meant", "you didn't look";
- it has said "fixed" or "done" and he says it isn't;
- it finds itself wanting max effort on Sonnet.

It comes back to Sonnet when what's left is plain doing: the plan or design
is settled and agreed, and the rest is edits, builds, runs, tests, commits,
or a question that just needs answering. Terminal and command-line work is
genuinely Sonnet's strength.

Fable is for his personal, reflective conversations and nothing else; a
session can suggest it, never move itself onto it. Haiku is for throwaway test
sessions and helpers that only fetch.

## Switching well

- Change model only when the *kind* of work changes, never back and forth
  inside one piece. A switch re-reads the whole conversation from scratch.
- Before switching up, ask whether raising effort on the current model would
  do; it usually keeps the cached conversation.
- Say every switch in one plain line on the board, with why.
- On Sonnet, never call something done without running it and looking.

## Helpers and background work

A helper's model is fixed when it is sent out; it cannot change itself
mid-run (Claude Code docs). So the lead picks it every time, by what the
helper is for, never by inheriting its own model, which is what nearly every
helper so far has done (almost all ran on Opus, even ones only searching):

- Search, read, grep, gather, check a fact: Haiku or Sonnet.
- Carry out a settled step, run builds and tests, apply edits: Sonnet.
- Design a variant, investigate an unknown cause, review or try to disprove a
  conclusion, write something he will read: Opus.

A helper that hits something on the Opus list comes back and says so rather
than guessing, and the lead decides it or sends it out again on Opus.

The lead's own model can't change mid-turn either, so a long turn on Opus
hands its plain steps to Sonnet helpers instead of doing them itself. Claude
Code's own `opusplan` (Opus while planning, Sonnet while carrying it out) is
the same idea for one session.

## His word wins

A model he picks by hand pins that session until he unpins it or the session
ends. Adaptive switching never overrides him, and the usage watcher's "carry
on with a cheaper model" still applies on top.
