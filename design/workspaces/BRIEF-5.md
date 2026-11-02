# The top of the yard, round five: his signpost, carried further

Read BRIEF.md and BRIEF-2.md for the DATA only (project invest-web, the eight workspaces, their
sessions, Jira tickets, GitLab merge-request facts). Read BRIEF-4.md for the craft rules, the kit,
the fonts and the yard's way of saying things. This brief overrides all of them where they differ.

## The base you build on (look at these first, at full size)
- kit/13r-post.html (+ kit/13x-lib.js, kit/13q-lib.js, kit/13-parts/): yesterday's design. He
  LIKES it as an idea: the signpost standing in the hills at the top of the yard, the crown board
  with INVEST-WEB and "opus 5.5 · medium · auto", his lantern, arms that are workspaces, lanterns
  hanging off the arms of the ones that want you (orange asking, green done, red broken), the
  right arm being the session you're in, a Jira notice nailed under it. Renders: kit/13r-inv.png,
  kit/13r-point.png, kit/13r-many.png, kit/13r-many-point.png, kit/13r-flaky.png, kit/13r-none.png.
- The style of the post, the arms, the lanterns and the hills stays. Reuse the renderer, the
  parts, the sprites. Do not redraw the planks in some other style.

## What he said about it (his words)
"this is a really good concept as an idea on the left... everything is on the left side, and it's
also kind of trying to do a lot." "you can take this and expand upon it to the other things we
need to improve and add... figure out exactly what nicer ways are there to include the other
information." "There are a whole bunch of them over here, right? You select it. Maybe when you
select one, it goes to the right. We animate strongly up to the right, or when you select one,
everything else gets pushed to the other side... we can make it exciting." "why are you limiting
yourself to everything that exists right now? you can change it." Earlier: "make it clean. Do not
overcrowd it. I do not want the top side to get busy." "tasteful and still pretty."

## What failed in this session (do none of it)
- A giant signpost dead centre over the columns, faded out at the bottom so it bled into the
  yard: "so massive... bleeding into the background... why is everything in there together...
  why is it in the center like that".
- Shrinking everything into a thin bar of small signs along a rule: "why are you limiting
  yourself to everything that exists right now".
- Several posts spread across the top: "do not just add a whole bunch of posts at the top".
- Flat home-made planks with dashed grain: "the style you chose for the signpost itself is weird".
- Everything piled on the left (yesterday's flaw), or everything piled on one side of anything.

## The job
Keep his post and its look. Fix "everything on the left" and "trying to do a lot": the top
section uses its whole width with intent, and at rest it is calm. Make picking a workspace an
event: it travels, strongly, to the right (or everything else is pushed away), animated. Find
nicer, more in-world places for the rest of what the top must say:
- the session you're in (its name, renamed by double press) and the workspace you're standing in
- the session's model, effort, permission mode, and how full its context is
- the other workspaces: the loud ones noticeable from across the room (lantern light), the quiet
  ones resting; it must work at 8 and at 15 workspaces; home (the project folder) is home, not a
  copy; a new workspace; the one being cut (14s counting)
- Jira: key, plain title, status; one press opens it in Mender's Jira window; the full title and
  first line of the description reachable without leaving the yard
- GitLab: ci failed, approvals missing, comments to answer: noticeable when true, silent when fine;
  details (which job, who approved, the threads) on going to it
- the sessions inside a workspace, bundled under it when it is picked
The projects rack top right stays exactly as it is. The three columns below keep their room (the
top may be a little taller than today's, as tall as 13r's hills at most).

## Your concept
You are given one concept direction below. Follow it, in your own best taste.

## Deliverables (prefix = your concept id, e.g. 14a)
Put HTML in kit/ so relative paths work; drafts in ../drafts/.
1. kit/<id>-top.html: a LIVE page. Clicking an arm (or the folded bundle) plays the selection for
   real: the travel to the right, the push, whatever your concept does, with CSS/JS animation,
   smooth on the pixel art (whole-pixel steps where it reads better). Hovering shows what pointing
   shows. ?state= query params put it straight into each still state for screenshots, and
   body[data-ready] is set once drawn.
2. Stills at 1480x1020 @2x (pattern of drafts/13r-shoot.mjs; your own shoot script in ../drafts/):
   <id>-rest.png (standing in INV-71924, 8 workspaces), <id>-many.png (15), <id>-point.png
   (pointing at whatever reveals more), <id>-mid.png (a frame mid-animation after clicking
   INV-71880), <id>-picked.png (after: standing in INV-71880), <id>-open.png (the ticket + merge
   request gone to), and a -crop.png of the top band for each.
3. Look at every still at full size, then crop in. Fix anything clipped, overlapping, muddy or
   loud before you report. Squint test at rest: calm, nothing jumping. Would it sit beside the
   rack and the lantern rail as if the same artist made it? Never overwrite a file starting 13;
   a fix of yours is a new letter (14a2...).
Report: the file paths, and three short lines: what it shows at rest, what picking does, what's
rough.
