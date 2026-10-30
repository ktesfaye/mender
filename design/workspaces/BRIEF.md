# Workspaces reimagined: shared brief

Mender is a pixel-art village coding app (read /Users/kirubel/Documents/dev/mender/MENDER.md, the
"A copy of its own is a workspace" paragraph, and skim the rest for voice). A project has
workspaces: git worktrees on their own branch, each holding one or more agent sessions. Today they
hang under the yard's head as brown timber boards on cords off a beam (kit/today-beam.png,
kit/today-yard.png). Kirubel finds that "way too simple" visually, especially now that every popup
moved from brown boxes to liquid glass. He wants the whole workspaces visual reimagined, AND tied
far better to Jira tickets: most workspaces are launched from a Jira ticket and today their name is
a slug like "inv-71924-fe-g-l-wash-sale-info-explaining", so he keeps opening Jira to find the
ticket. That must end.

## Kit (in /Users/kirubel/Documents/dev/mender/design/workspaces/kit/)
- d-checkout.html + ref-checkout.png: an approved liquid-glass popup. Copy its <head>, theme.css,
  liquid.js, px.js usage EXACTLY: that is the house style. Read kit's theme.css. DESIGN.md rules
  are in /Users/kirubel/mender-scratch/popups/mock/DESIGN.md: read it, it's law (Fraunces titles,
  Figtree body, Silkscreen only tiny labels, gold = pressable only, ember = working, moss = done,
  sore = broken, blue #7aaaff = git, smoky grey glass never brown, no usage tips/key legends).
- bg-yard.png (2960x2040 = the 1480x1020 window @2x): an empty yard to draw over. Its header text
  (DEMO / claude) and rail lantern are part of the screen you are redesigning: cover the header
  band with your own head and draw the rail yourself so it matches your data. bg-busy.png is a
  full busy yard for reference of the columns (gatepost left, what it said middle, right column,
  write line, lantern rail along the bottom).
- shoot2.mjs: `cd kit && node shoot2.mjs <name-without-.html>` renders kit/<name>.html at
  1480x1020@2x to kit/<name>.png once body[data-ready] is set (liquid() sets it). Put your HTML
  in kit/ so relative paths work, named with your concept prefix.

## Data (made up, use exactly this volume)
Project "invest-web" (Jira project INV). Workspaces:
1. the project's own folder, home (branch main). 1 session idle.
2. INV-71924 "FE: G/L wash sale info, explaining why a loss was disallowed", story, In Progress,
   high. Branch inv-71924-wash-sale-info. YOU ARE STANDING IN THIS ONE. 2 sessions: "Reason line
   under each loss" working 12m, "Lot link API" wants you (asking).
3. INV-71880 "BE: Cost basis export drops lots bought on a split day", bug, In Review. 1 session
   wants you.
4. INV-72011 "Tax doc banner copy for Q4", task, To Do. 1 session done (unseen, green).
5. INV-71990 "Dividend reinvest toggle on account page", story, In Progress. 1 working, 1 idle.
6. INV-71702 "Flaky e2e on statements download", bug, In Progress. 1 session broken.
7. "chart spike", hand-made workspace, no ticket, branch mender/chart-spike, 1 idle.
8. "INV-72040 Gift lot holding period" being set up right now (worktree being cut, 14s).
Each workspace also: commits ahead, uncommitted count (invent small numbers).

## Answer sheet: every row must be filled, your concept's own way
- All eight visible at once at this window size, without scrolling, and it still works at 15.
- Which one you're standing in, unmistakable.
- Home (the project's own folder) never reads as one more copy.
- Each one's light: the loudest session's posture (working breathes ember, wants-you orange,
  done-unseen moss, broken sore, waiting-out-limit red ember, idle = no light). Readable from
  across the room.
- Jira: the ticket's key, a PLAIN short title (not the slug), its Jira status, its type. One press
  opens that ticket in Mender's Jira window. The ticket's full title and first line of description
  are readable for the one you're in WITHOUT going anywhere.
- Hand-made workspaces with no ticket look complete, not like a ticket with a hole in it.
- Branch name is findable (not shouted).
- Pointing at one shows who's in there and what each is up to.
- Press to walk into one; it can be renamed, dragged to reorder, deleted (right-click). Show where
  these live in your concept, don't label them with tips.
- A new workspace: the "+" and the one being set up (counting up, never a spinner).
- The lantern rail along the bottom carries only the current workspace's sessions; your design
  should make it obvious that the rail belongs to the workspace you're in.
- The rest of the yard (gatepost, what it said, right column) still has its room.

## Banned (his words / ban list)
- brown boards hanging off a beam on cords; brown framed boxes or slabs of any kind; brown wash
- the slug as the visible name
- white all-round glass borders; dimming the yard behind glass
- usage tips, key legends, "press X to Y", keycaps
- spinners, badges with counts as decoration, coloured dots as the only signal (the village says
  posture with light, not dots)
- a plain browser tab strip

## Deliverables
1. Drafts in /Users/kirubel/Documents/dev/mender/design/workspaces/drafts/ (4-6 at most).
2. Final: kit/<NN>-<name>.html and kit/<NN>-<name>.png (standing in INV-71924, nothing hovered).
3. A second state: kit/<NN>-<name>-hover.png showing pointing at INV-71880 (who's in there), and
   if your concept has an expanded/open state, that too as -open.png.
4. Look at every render at full size and crop in on the workspaces part before you call it done:
   no clipped text, no overlaps, nothing under the rack in the top right, everything legible.
Never overwrite a final once written; a fix is a new letter (01b).
Report: final paths, and three short lines: what it shows, how Jira is tied in, what's rough.
