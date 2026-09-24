# Opening a district — everything that has to be designed

What exists today when you press a district: the camera pulls in, the board
arrives, and the wood carries the project name, its path, the sessions in it, a
line that starts another, where the checkout stands, publish/push/pull, a shell,
what's open for this branch, the uncommitted files, and the last few commits.
Everything below is the full surface that a district board should be designed
for, whether or not it's on the first screen.

## 1. The arrival itself
- The camera move: how far it pulls in, what it centres on, how long it takes.
- What happens to the rest of the island while a district is open (still living,
  dimmed, out of frame?).
- Where the board comes from and how it settles.
- Escape: the ladder out, one thing at a time.
- Re-opening the same district you just left — does it remember where you were
  on it (scroll, which session, which sub-board)?
- More than one district in quick succession: does the board swap or re-arrive?

## 2. The head of the board
- Project name. Pressing it renames it.
- Where the checkout is on disk. Pressing it walks into the folder.
- Which machine it lives on, and whether that machine is reachable right now.
- Its remote, its provider identity (which GitHub account this project is),
  and the way out to the real world: open in an editor, open in Finder.
- Non-ready states: still being created, still hydrating, host unreachable,
  path moved and needs relinking, not a git repo any more.
- Abandoning the project, with what that costs said first.

## 3. The roster — the actual reason you opened it
- Every session in the project, under the name it gave itself or the one you
  gave it.
- What each one is doing: working, waiting on you, finished, broken, resting.
- Whether it has said something you haven't read.
- How long since it last did anything.
- What branch each one is on, and how far ahead.
- How it's ordered, and whether any are pinned to the top.
- More sessions than fit on the wood: overflow, paging, or narrowing.
- Pressing one opens it. Pressing the one you're in renames it.
- Arrow keys walk the roster; return picks.
- A session being provisioned (worktree still being cut) before it's usable.
- A session whose worktree is gone, stuck, or half-removed.
- Taking a session down from here as well as from its card, with the cost
  (uncommitted work, unpushed commits) said first.
- Archived sessions: are they on this board at all, and how do they come back.

## 4. Starting a session
- The line at the end that starts one, and what you write on it.
- That text becoming a branch name and a worktree.
- Which agent works in it (and the default, and what happens when that agent
  isn't installed on this machine).
- Where the worktree goes, and the branch prefix.
- The five ways a workspace can be set up: a fresh worktree, the repo root
  itself, reusing one that exists, checking out an existing PR, a new branch
  off a PR.
- A branch that's already checked out somewhere else — the warning and the
  offer to reuse.
- Linking an issue or a PR to it as it's created, and searching the trackers
  for one.
- The first thing you say to it, said at creation time.
- A preview of exactly which git operations are about to run.
- What it looks like while it's being built, and when that fails.

## 5. The checkout under it
- Where the branch stands: name, ahead, behind, detached, nothing committed yet.
- Publish a branch nobody has seen, send up what's ahead, bring down what's new.
- The full vocabulary of ways those fail: auth, network, conflict, diverged,
  LFS, rejected. Each has to read differently on wood.
- Switching branches at all, and the branch picker if there is one.
- Remotes: which one is the base, which one you push to, adding one.
- Fetch as a deliberate act vs. as a side effect of pulling.

## 6. What's uncommitted
- The list, with what happened to each file.
- Too many to hold; too many to even read.
- Pressing a file to read the change: what went in, what came out, context, how
  much unchanged writing went by.
- Throwing a change away, in two presses, with what's about to stop existing
  named.
- Writing a commit: the message, holding files back, nothing happening until
  return.
- Reading a commit: what it was for, who, when, and the files it moved.
- The history under all of it, and how much of it a project's board shows.
- A conflicted file, and what you can do about it here.
- A binary or image change, and a change too big to draw.

## 7. Walking into the checkout
- The folder: what's in it, folders first, walked into one at a time.
- Reading a whole file on the wood, of any kind: text, markdown, csv, image,
  svg, something binary, something too large.
- Editing one line at a time, and what happens if the file changed underneath.
- Making a file or a folder, renaming one, throwing one away.
- Who last touched each run of lines, how long ago, and what they were doing.
- Looking for a file by name; looking for writing inside the files. Both with
  their results pressable.
- Dropping a file or folder from outside onto the district.

## 8. The shell
- Opening one in the checkout.
- That it outlives the window, and walking back into it.
- More than one at a time, or deliberately only one.
- What a full-screen program looks like on wood.

## 9. How work leaves
- What's open for this branch: what it's for, which branch is going where, the
  checks, whether anyone looked, the ways it can go in.
- Opening one when there isn't one: title, body, base branch, draft or not.
- The checks: a count, except the ones that failed.
- Review comments, and notes pinned to a line of a diff that feed back into
  what the agent is told next.
- Merging, and the three ways.
- Every PR in the project, not just this branch's — is that a thing this board
  has?
- Issues for this project: browsing them, and starting a session from one.

## 10. How the project is configured
- Where worktrees for it go.
- Its default branch, its base remote, its push remote.
- Which GitHub account it is, and in what mode it hands credentials to agents.
- Environment variables for this project's terminals, scripts and agents.
- The lifecycle scripts: prepare, setup, run, teardown, and whether they run
  automatically.
- What files get preserved into a new worktree.
- The shell setup snippet.
- What's excluded from the tree, the search and the file watcher.
- For every one of those: whether it's set here, inherited, or broken, and how
  you put it back.
- Sharing that config with the team, importing it, and migrating it in from
  another tool when a project is first founded.

## 11. Housekeeping
- Every worktree the project has, including ones with no session on them.
- Disk each one takes, and how much of that is build output you could reclaim.
- Cleaning artifacts out of one; removing several at once.
- A worktree whose path moved, or whose removal got stuck.
- How fresh any of this is: live, last-known-good, or offline.

## 12. Things that run on their own
- Dev servers the project started: detected URLs, opening them, stopping them,
  restarting, forwarding a remote port by hand.
- Scheduled runs: sessions that start themselves on a clock, their history,
  and what it looks like when one is running while you're not watching.

## 13. When something is wrong
- The host is unreachable and most of the board can't do anything.
- Git refused, and specifically why.
- The agent CLI isn't installed, or isn't signed in.
- The project record points at a folder that isn't there.
- None of these should be a toast. All of them need a place on the wood or a
  posture on the district.

## 14. What the district itself says, without the board
- Lit buildings for the first few sessions; what light, posture and colour mean.
- More sessions than the district has houses.
- A project where somebody is waiting on you, seen from out on the water.
- A project that's broken.
- A project nobody has touched in a long time.
- A project that was abandoned: gone, or derelict in place.

## 15. Getting around
- The rail tag for this project, and going straight to it by number.
- The finder, and whether it narrows to this project while you're in it.
- Back and forward.
- Reopening the app onto the district you last had open.
- Every chord that does any of the above.
- Something finishing while you're looking at a different district, or at
  another app entirely.

---

# Part two — how it behaves, not just what's on it

Everything above is content. This half is the thing that actually has to be
designed, because the board has no widgets to inherit behaviour from. There is
one typeface, one size, no bold, no boxes, no scrollbars, no buttons, no text
fields. Every interaction below is drawn from nothing and needs a decision.

## The line you write on
- There is exactly one place you write in this whole app, and it's the last line
  of the board. Everything that takes input has to arrive on that line.
- The cursor. It blinks, and that blink is the only thing on the board that says
  the app is alive. Shape, rhythm, whether it changes when you're mid-word.
- What the line says when it's empty, and how that prompt differs between
  starting a session, saying something to an agent, naming a branch, writing a
  commit message, searching, and renaming.
- Typing: does every keystroke land the same frame, does the board shift, does
  anything below it move.
- The line growing past one line of wood. Wrapping, where the cursor goes, what
  happens to everything above it, whether the board scrolls to keep up.
- Shift-return for a newline, return to send.
- Backspace, word-delete, line-delete, beginning and end of line, and whether
  there's selection at all (there is no mouse selection on this wood today).
- Paste: plain text, multi-line text, a path, an image.
- A half-written thing and Escape. First press clears it, second press backs out
  of the board. That ladder has to be consistent everywhere.
- Undo on the line.
- Losing focus, and getting it back. Does the cursor keep blinking when the
  window isn't focused.
- Writing while the board is rewriting itself underneath you, because git or the
  agent moved. The line must never lose a character to that.

## The two overlays that grow out of the line
- A slash turns the lines above into what you could mean, narrowing as you type,
  arrows walk it, return picks, Escape closes it without eating the line.
- An @ does the same over the files in the checkout.
- How those appear: do they push the board, cover it, or grow up from the line.
- What no-match looks like. What still-loading looks like.
- Picking with the mouse as well as the keys.
- The four village commands that never reach the agent, drawn differently from
  the agent's own.

## Pressing things
- Every pressable line has to say it's pressable before you press it, and there
  is no button shape to do that with. Hover tone, a mark in the gutter, a shift
  in the ink.
- What a press looks like at the moment it lands. There's no depress animation
  for something that isn't a button.
- Pressing something that's about to do something irreversible: the line turns
  into the confirmation in place, second press does it, Escape is no.
- Something that isn't pressable and looks like it might be. This has already
  bitten once with empty land on the island.
- Something pressable that's busy, or that just failed.
- Right-click, if it exists at all.

## The keyboard as the primary way through
- Arrows walk the pressable lines of any board. What's "selected" has to be
  visible without a highlight bar, or with one that belongs on wood.
- Return picks. Escape backs out, one step at a time, in a defined order:
  what you're writing, then the sub-board, then the session, then the district.
- Tab, if it means anything.
- Page-up/down, home/end, and how a long board is walked quickly.
- The chords: start a session, open the finder, rename, turn the board over,
  found a project, back out, go forward and back, jump to a project by number.
- What happens when a chord fires while you're mid-word on the line.
- Whether any of it is rebindable, and where that would live.
- Discoverability. Nothing on this board announces its own shortcut yet.

## Scrolling and long boards
- The board is longer than the wood almost always. How it scrolls: wheel,
  trackpad, keys, and whether there's any visible position indicator.
- Momentum, rubber-banding at the ends, or a hard stop.
- Pinning to the live edge when an agent is talking, and letting go of that pin
  the moment you scroll up, and getting it back.
- Something new arriving while you're reading history. Does the board move.
- Jumping to the bottom.
- Where the board puts you when you open a sub-board and come back.

## Motion and time
- The camera pulling into a district: distance, easing, how long, and whether
  it's interruptible half-way.
- The board arriving, and leaving.
- The board changing what it shows (roster to a file, a file to a diff, a diff
  to a commit). Is that a page turn, a slide, a cut, a fade.
- Rows appearing, disappearing and reordering while you look at them, because
  everything here is live.
- Text streaming in from an agent. Per-character, per-word, per-chunk.
- Anything that spins. There's no spinner in this art language yet and several
  things need one: fetching, cutting a worktree, an agent thinking.
- Progress that's actually measurable, like a download or a context window.
- Everything that pulses: a villager wanting you, a lit building.
- Frame budget. The village is drawing behind all of this.

## Feedback, and where things go wrong
- There are no toasts. Something succeeded, something failed, something is
  taking a while, all have to land on the wood or on the district.
- Optimism: does a line change the moment you press it, or when the back end
  says it did, and what it looks like in between.
- Something that fails after you pressed it. Where the reason goes, how long it
  stays, and how you get rid of it.
- Something that finished while you were looking at a different district.
- Something that finished while the app wasn't focused at all.
- Waiting states that are quick enough not to need anything, and the threshold.

## Reading and getting things out
- There's no text selection, so copying a block of code is a press. That has to
  be visible: what lights up, what confirms it went.
- Copying a path, a branch name, a commit hash, a URL.
- Links. Opening something in a browser from the wood.
- Dragging a file off the board.

## Drag and drop onto it
- A picture dropped or pasted onto a session board: where it waits, what says
  you're carrying it, how you put it down.
- Any other file: it writes its path on the line.
- A folder dropped on the island founds a project.
- What the board or the island does while something is being dragged over it.

## The density decisions that affect all of the above
- One size, one weight, one typeface. Everything that needs emphasis has to come
  from the gutter, the indent, the gap, and the tone.
- The tones, and what each one means. Faded, keen, sore, and whether there are
  more.
- The gutter marks, and the whole vocabulary of them.
- Line height, paragraph gap, indent step, margin.
- The width of the board and what happens on a very wide or very short window.
- Pixel alignment, because the village is pixel art and the text is a pixel
  font, and half a pixel anywhere looks broken.

## Sound
- Does anything make a noise. Pressing, sending, an agent finishing, something
  breaking, the village's own ambience.
- If yes, it needs designing now, because it changes what the visual feedback
  has to carry.
