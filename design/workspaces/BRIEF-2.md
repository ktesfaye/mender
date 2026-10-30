# Workspaces, round two: quiet, in place, with GitLab

Read BRIEF.md in this folder first: the kit, the data, the answer sheet, the ban list all still
hold. Then read this, which overrides it where they differ.

## What happened in round one
Three concepts (kit/01f-windows.png, kit/02b-hand.png, kit/03b-sky.png) were all rejected. His
words: "these look a bit too out of place... way too busy and way too out of place". Look at them
so you know what NOT to do: a loud glowing band of panes, a fan of glass cards, a sky of flaring
stars. Each one shouted over the yard and spoke a different visual language from it.

## What "in place" means here
Look hard at kit/bg-busy.png and kit/today-yard.png: that is the yard he likes. It is quiet. The
head is two lines of type on the dark (spaced Josefin caps project name, a Courier session name,
a small mono meta line), a hairline rule, then three columns. The lantern rail at the bottom is
the loudest thing on screen and even it is just small lanterns with two lines of mono under
each, a soft glow round the lit ones. Popups (kit/ref-checkout.png) are the only glass, and they
only appear when asked for.

So:
- The resting screen must look like today's yard with the workspaces quietly added, not a new
  object bolted on. Use the yard's own typefaces at the yard's own sizes (Josefin Sans caps for
  labels, Courier Prime for names and status lines, as in today-yard.png). No new display type in
  the head, no big Fraunces titles at rest.
- No glass slab, card, band or panel in the resting head. Glass is only for what opens on a
  press or a point, and then it follows ref-checkout.png's style exactly.
- Light the way the rail already does it, at the rail's own strength: a small soft glow, never a
  flare, a flood, a beam or a coloured block. Posture can also be said in words in its tone the
  way the rail does ("wants you · 4m").
- Fewer things, said once. At rest show only what he needs to choose where to go and see what's
  wrong. Everything else (full title, description, every MR detail, who's in there) lives in the
  one popover that opens on point/press.
- Squint test: blur your render; the head must still read as calm type on dark, nothing jumping.

## New: GitLab
Workspaces launched from Jira end up with a GitLab merge request. For each workspace he must be
able to see, without opening anything: did CI fail, does it have the approvals it needs, does it
have unresolved comments. Failure and "needs you" should be what catches the eye; all-good should
be nearly silent. In the popover/open state: the MR number and title, pipeline (which job failed),
approvals (who approved, how many needed), unresolved threads count, and a gold "open in gitlab".
Data (made up, add to BRIEF.md's):
- INV-71924 (you're here): MR !482, pipeline failed (job "lint"), 0 of 2 approvals, 3 unresolved
  comments.
- INV-71880: MR !477, pipeline passed, 2 of 2 approved, 1 unresolved comment.
- INV-71990: MR !485 draft, pipeline running (2m), 1 of 2 approvals, no comments.
- INV-71702: no MR yet.
- INV-72011: no MR yet.
- chart spike, home: no MR.
Use plain village words, not GitLab jargon: "ci failed", "needs 2 approvals", "3 comments to
answer". A tiny 9x9 pixel sign per fact is fine (px.js), sized like the rail's text.

## Deliverables
Same as BRIEF.md, but prefix with your concept id given to you. Final at rest + -hover (pointing at
INV-71880) + -open (the popover for the workspace you're in, showing ticket + MR in full). Look at
each at full size, then blur/squint it and check it's calm, before reporting. Never overwrite.
