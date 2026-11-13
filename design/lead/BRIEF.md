# The lead's yard: a whole new screen for a tech-lead session

Mender is a pixel-art village coding app. Read /Users/kirubel/Documents/dev/mender/MENDER.md (all
of it, for how the village thinks and speaks). Read
/Users/kirubel/Documents/dev/mender/design/workspaces/BRIEF-4.md for the craft rules, the kit
(cut.py, sprites, fonts), and the village's way of saying things. Read
/Users/kirubel/mender-scratch/popups/mock/DESIGN.md for the house type and colour rules (Fraunces
titles, Figtree body, Silkscreen only tiny labels, Mender Hand for anything handwritten, gold
#f2c66d = pressable only, ember = working, moss = done, sore red = broken, blue = git).

## What this is
A new kind of session: the LEAD. Kirubel hands it a batch of Jira tickets. It launches each one
into its own workspace with its own agent session (the crew), then supervises them. It never
touches code: no files, no diffs, no shell. It only talks to the crew and watches them. The
village wakes it whenever a crew session asks something, breaks, hits a usage limit, finishes, or
has been working a long time with no real progress (stuck, going in circles). It answers what the
ticket already answers, nudges stuck ones, and brings Kirubel only what it can't decide.

When you stand in a lead session the yard becomes a DIFFERENT SCREEN. Today's yard (look at
/Users/kirubel/Documents/dev/mender/design/workspaces/kit/today-yard.png and bg-busy.png: gatepost
of what you asked on the left, what it said in the middle, the story column on the right, the
write line, the lantern rail along the bottom) does not have to survive here. His words: "we can
change like most of the screen... the sides what we have doesn't need to be like this... this
becomes a special scenario. So let's make it exciting." And: "I want to be able to tell at a
glance what's going on with the sessions just by looking at it."

Only these stay: the projects rack top right (exactly as is, see kit/today-top.png), the one write
line (there is no text field anywhere else in the app; here it talks to the lead), and it is the
1480x1020 window of the night village.

## Data (made up; use exactly this)
Project invest-web (Jira INV). Lead session "Sprint 42 lead", thinking with Sonnet 5.5 · low,
started 1h 12m ago. Crew all on Opus 5.5.
1. INV-71924 "Wash sale info under each loss" (story). Working 22m. On step 4 of 6, "writing the
   reason line under each loss". 3 commits.
2. INV-71880 "Cost basis export drops split-day lots" (bug). Asked the lead: "should lots bought
   on a split day use the pre-split or post-split price?" The ticket doesn't say, so the LEAD HAS
   ESCALATED IT TO KIRUBEL (the most important thing on screen right now).
3. INV-72011 "Q4 tax doc banner copy" (task). Done. Merge request open: CI passed, 1 of 2
   approvals, 2 comments to answer.
4. INV-71990 "Dividend reinvest toggle" (story). STUCK: working 41m, ran the same failing test six
   times. The lead nudged it 3m ago ("read the failure, stop rerunning it"), still watching.
5. INV-71702 "Flaky e2e on statements download" (bug). Broken: the agent errored out. Lead
   restarted it once already; second failure, so it's Kirubel's.
6. INV-72033 "Holdings CSV column order" (task). Waiting out a usage limit, back at 2:40pm.
7. INV-72040 "Gift lot holding period" (story). Being set up right now: workspace being cut, 14s.
8. INV-71650 "Rename Realized tab" (task). Landed: merged an hour ago.
The lead's own last words (what it says to Kirubel, in a calm human voice):
"Two need you. 71880 wants to know which price split-day lots take, the ticket doesn't say.
71702 has fallen over twice on the same setup error; I've stopped retrying it. Everything else is
moving. I told 71990 to stop rerunning its test and read the failure."
The lead's log of what it's done (reachable, not shouting): launched 7 tickets; answered 71924's
question about rounding from the ticket; nudged 71990; restarted 71702; moved 71650 to Done.

## The answer sheet (every row answered your concept's own way; not all visible at rest)
- At a glance, from across the room: which crew need KIRUBEL (escalated question, broken twice),
  which the lead is handling (stuck/nudged, asking the lead), which are fine (working, waiting a
  limit, being set up), which are finished (done/MR, landed). Said the village's way: light,
  posture, fire, weather, wear, never a dashboard of chips and dots.
- Each crew: ticket key + plain title, what it's on right now in a short phrase, how long, how far
  through its plan, and its merge-request state when it has one (CI failed / approvals / comments
  to answer, silent when fine).
- The lead's escalation: the question, which ticket, answered right there (the write line, or
  picking an option the lead offers).
- The lead's own voice: its latest words to Kirubel readable, its log reachable.
- One press walks into any crew session; and the way back to the lead is obvious from there (show
  how, briefly: what marks a crew session as "under the lead").
- Hand it more tickets; one being set up counting up (never a spinner).
- The lead never codes: nothing about files, diffs, or what it ran.
- Works at 8 tickets AND at 14 (render both).
- It must feel like a special, exciting mode, and still unmistakably the same village, the same
  artist, at night.

## Banned (his words over many rounds)
brown boards hanging off a beam on cords; brown framed boxes, slabs or wash of any kind; busy loud
glowing metaphor objects that don't belong to the yard (lit-window grids, card fans, glowing star
sky); UI chrome dressed up (bars, chip rows, tiles, icon rows, dashboards with a theme painted on);
plain text lists with nothing designed about them; usage tips, key legends, keycaps; spinners;
coloured dots as the only signal; white all-round glass borders; everything piled on one side;
one object crammed in a corner with the rest empty. "be smart and artistic and pretty and creative
with it." "not everything needs to be visible at once."

## Craft
Pixel art from the artist's kit at whole-pixel integer scale (image-rendering: pixelated), lit
like the village at night: dark, warm light only where a lantern or fire actually reaches. Cut
sprites with `python3 kit/cut.py --list <word>` / `python3 kit/cut.py "<name>" <scale>` (run from
/Users/kirubel/Documents/dev/mender/design/workspaces). You may draw new pixel art with PIL in the
kit's palette and outline colour at the kit's pixel size, never smoothed. Fonts in kit/fonts.
Render with kit/shoot2.mjs pattern (1480x1020 @2x, set body[data-ready]). Put your HTML in
/Users/kirubel/Documents/dev/mender/design/workspaces/kit/ named lead-<letter>-*.html so relative
paths work; drafts to /Users/kirubel/Documents/dev/mender/design/lead/drafts/.

## Deliverables (prefix = your letter)
- kit/lead-<L>-rest.png: 8 tickets, nothing pointed at.
- kit/lead-<L>-point.png: pointing at INV-71990 (the stuck one): what's revealed.
- kit/lead-<L>-many.png: 14 tickets (invent six more, mixed states).
- kit/lead-<L>-crew.png: standing inside a crew session (INV-71924), showing what tells you it is
  under the lead and the way back. The ordinary yard with only what changes, keep it light.
Look at every render at full size and crop in on the part your concept hinges on before calling
it done: no clipped text, no overlaps, nothing under the rack, everything legible, calm enough to
live with all day yet exciting. Never overwrite a render; a fix is a new letter (lead-A2-...).
Report: the paths, and three short lines: the idea, how "needs you" reads from across the room,
what's rough.
