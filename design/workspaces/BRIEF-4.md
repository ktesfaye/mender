# The top of the yard, reimagined (round four)

Read BRIEF.md and BRIEF-2.md for the data (project invest-web, the eight workspaces, their
sessions, their Jira tickets and their GitLab merge-request facts). Everything else in those
briefs about layout and style is SUPERSEDED by this one.

## What he asked, in his words
"all these just look so ugly. not everything needs to be visible right there, you can be
artistic and creative about it. find nice solutions. stop reusing and following similar design
ideas. do better, like how we designed and thought out our village." Then: "feel free to
redesign the whole top section, minus the projects rack. you have full creative freedom."

## What has been rejected (look at all of them, do none of it)
- kit/01f-windows.png, 02b-hand.png, 03b-sky.png: loud glowing metaphor objects, "busy, out of place"
- kit/07-rail.png, 08-head.png, 09-column.png: bare lines of text, "basic and simple"
- kit/10b-bar.png, 11b-head.png, 12b-rail.png: UI chrome dressed in glass (bars, chips, tiles,
  rows of status icons), "ugly"
The pattern he hates: an app dashboard with a theme painted on. Bars, chip rows, tiles, lists,
counters, icon rows. Every fact visible at once.

## How the village thinks (read /Users/kirubel/Documents/dev/mender/MENDER.md, all of it)
Nothing is chrome. A session is a villager; whether it wants you is said by the light of its
lantern and the way it stands. Projects are carved boards hung off a log beam with chains
(the rack, top right: keep it exactly as is, look at kit/today-top.png and
apps/mender/assets/rack/). The fire is the session's state. A push loads a sloop at the pier. A
forgotten district grows moss and gets crows. A limit banks the fire red. What you asked is
nailed to a gatepost. Information lives in a real object as a property of that object, said
with light, posture, weather, wear, and the object is pixel art from the artist's kit at whole-
pixel scale. Detail is there when you go to it (point, press), not all laid out.

## Today's top section (kit/today-top.png, the first ~150px of the 1480x1020 window)
Left: project name in spaced gold caps / the session's own name (renamed by double press there),
and a meta line (branch · ahead · Claude Code · time · turns · helpers spawned). Right, under the
rack: the permission mode (AUTO), and "context 35% used · Opus 5.5 · medium" (pointing at it shows
the five-hour usage). The projects rack (top right) stays exactly as it is. Everything else in
the top section is yours to redesign, together with the workspaces, the Jira tie-in and GitLab.

## The answer sheet (every row answered your concept's own way; not all visible at rest)
- the project (pressing it opens its settings) and the session's own name (double press renames)
- the session's agent, model and effort, its permission mode, how full its context is
- the workspaces: which one you are in; which others want you (asking, broken, done-unseen) must
  be noticeable from across the room the village's way (light, posture), the rest can rest
- going to another workspace in one press; a new workspace; the one being cut (14s counting)
- the ticket: key, plain title, Jira status; one press opens it in Mender's Jira window; the full
  title and first line of description reachable without leaving the yard
- GitLab: ci failed, approvals missing, comments to answer must be noticeable when they are true
  and silent when all is well; the details (which job, who approved, the threads) on going to it
- hand-made workspaces (no ticket) and home (the project's own folder) are complete in their own
  right
- the yard's three columns below keep their room (the top may take a little more height)

## Craft
- Use the artist's kit sprites. `python3 kit/cut.py --list <word>` lists frames;
  `python3 kit/cut.py "<name>" 4` cuts one to kit/sprites/ at integer scale (nearest neighbour).
  Useful: Road Sign 01-03, Sign 01/L/R, Sign Icon 01-08, Billboard 01 + Billboard Notice 01-06,
  Lantern 01/02 On/Off, Road Lamp, Gate 01, Fence Gate, Cart 01, Campfire, Bench, Crate, Barrel,
  Dock parts (--list Dock), Scarecrow; and from folk: crow-hop-0/1, crow-fly-0/1, gull-0..3,
  firefly, ember, smoke-0..3, flame-0..3, villagers (front/back/side, helper-*).
  You may draw new pixel art yourself (PIL), in the kit's palette and outline colour, at the
  kit's pixel size, never smoothed.
- Pixel art at whole-pixel scale with image-rendering: pixelated, lit like the village at night:
  dark, with warm light where a lantern or fire actually reaches, never a flat glow box.
- Type: the yard's own faces (fonts in /Users/kirubel/Documents/dev/mender/apps/mender/assets/fonts/
  and kit/fonts): Josefin caps, Courier Prime, Mender Hand (pretty-neat) for anything handwritten
  on parchment, Silkscreen for tiny pixel labels. Gold #f2c66d only for what is pressable.
- Render over kit/bg-yard.png or kit/bg-busy.png (1480x1020 @2x via shoot2.mjs pattern; set
  body[data-ready] when done). You may paint out their header text.
- States: rest (standing in INV-71924), -point (pointing at whatever reveals the workspaces or the
  ticket), -open (the ticket and its merge request gone to, in your concept's own medium). A short
  crop of the top section at full size too (-crop.png).
- Look at every render at full size, crop in on the top, and ask: would this sit beside the rack
  and the lantern rail as if the same artist made it? Is it calm at rest? Is it beautiful? If it
  looks like a web app, it has failed.
Never overwrite a render; a fix is a new letter. Report the paths and three short lines.
