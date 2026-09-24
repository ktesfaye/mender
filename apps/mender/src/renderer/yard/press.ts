/**
 * Pressing things, and what happens after.
 *
 * There is no button anywhere in this app and there is no toast either, so both
 * halves of every interaction have to be carried by the same line of writing:
 * the line says what it will do, and then the line says what happened. That is
 * the whole of the rules sheet, and it is in here because every board after
 * this one depends on it and none of them should be inventing their own.
 *
 * Four rules, and they are not negotiable anywhere they apply.
 *
 * **Gold is pressable and pressable is gold.** Nothing else on the wood is
 * gold, and a pressable thing carries no underline, no arrow, no box. Hover is
 * one step lighter, a press sinks it down and to the right, and a line that is
 * busy stops being gold and stops being pressable.
 *
 * **The result lands on the line you pressed.** Not above it, not in a corner,
 * not in a banner that slides in from somewhere. The line rewrites itself with
 * what happened, sits there long enough to be read, and settles back. A failure
 * does not settle back: it keeps its reason until you deal with it.
 *
 * **Anything that cannot be undone takes two presses**, and the first press is
 * what tells you the cost. Not a dialog, not a checkbox, not "are you sure":
 * the line itself becomes the question, in the same place your hand already is,
 * and it gives up on its own after a moment if you walk away.
 *
 * **Nothing spins.** A wait is a number counting up, which is honest about not
 * knowing how long it will be in the way a spinner never is, and a wait short
 * enough not to notice says nothing at all.
 */

/** How long a thing has to take before it is worth saying it is happening. */
const NOTICE_MS = 300;
/** And before it is worth counting. */
const COUNT_MS = 1000;
/** How long a result sits on the line before the line goes back to itself. */
const HOLD_MS = 3000;
/** How long an offer to do something irreversible stands before it withdraws. */
const STANDS_MS = 4000;

/** What a doing comes back with: what to say, or what went wrong and why. */
export type Outcome = { said: string } | { wrong: string; because?: string };

export interface Doing {
  /** What the line reads while it is happening: `pushing`, `throwing away`. */
  while: string;
  run(): Promise<Outcome>;
}

/**
 * A line you can press.
 *
 * Give it what it says and what pressing it does, and it handles the rest: the
 * gold, the hover, the sink under the hand, the counter if it turns out to be
 * slow, the result, and the settling back.
 */
export function pressing(said: string, does: () => void | Doing): HTMLSpanElement {
  const line = document.createElement('span');
  line.className = 'press';
  line.textContent = said;
  line.tabIndex = 0;

  const go = (): void => {
    const doing = does();
    if (doing) void carry(line, said, doing);
  };
  /* A press never takes the keyboard off the line. There is one place you
     write in this app and pressing something is not a reason to stop writing
     in it, so the mousedown that would move focus is refused and the click
     goes through on its own. */
  line.addEventListener('mousedown', (event) => event.preventDefault());
  line.addEventListener('click', go);
  line.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      go();
    }
  });
  return line;
}

/**
 * Run a doing and write what happened on the line it was pressed from.
 *
 * Nothing is said for the first moment, because most things are quick and a
 * line that flickers on every press is worse than a line that does not move.
 * After that it says what it is doing, and after that it counts.
 */
async function carry(line: HTMLSpanElement, said: string, doing: Doing): Promise<void> {
  const from = performance.now();
  let counting: number | undefined;

  const busy = window.setTimeout(() => {
    line.dataset.busy = 'yes';
    line.textContent = doing.while;
    counting = window.setInterval(() => {
      const gone = Math.round((performance.now() - from) / 1000);
      line.textContent = `${doing.while} · ${gone}s`;
    }, 1000);
    /* The counter starts a second after the word, not with it: a thing that
       takes under a second never shows a number at all. */
    window.setTimeout(() => {
      if (counting) line.textContent = `${doing.while} · 1s`;
    }, COUNT_MS - NOTICE_MS);
  }, NOTICE_MS);

  let outcome: Outcome;
  try {
    outcome = await doing.run();
  } catch (trouble) {
    outcome = { wrong: 'it would not', because: String(trouble) };
  }

  window.clearTimeout(busy);
  if (counting) window.clearInterval(counting);
  delete line.dataset.busy;

  if ('said' in outcome) {
    line.textContent = outcome.said;
    /* It settles back on its own, because the line's job is to be the thing
       you press next time, not a record of the last time. */
    window.setTimeout(() => {
      if (line.isConnected) line.textContent = said;
    }, HOLD_MS);
    return;
  }

  /* A failure stays. Putting it back after three seconds would mean the one
     message worth reading is the one most likely to be missed. */
  line.textContent = outcome.wrong;
  line.style.color = 'var(--yard-broken)';
  if (outcome.because) {
    const why = document.createElement('div');
    why.style.cssText = 'color:var(--yard-ink-dim);font-size:13px';
    why.textContent = outcome.because;
    line.after(why);
  }
}

/**
 * A line that does something it cannot take back.
 *
 * The first press does not do it. It rewrites the line into exactly what is
 * about to stop existing, still gold, still in the same place, and waits. The
 * second press does it. Walking away withdraws the offer, because an
 * irreversible thing left armed on a board somebody has stopped looking at is
 * a trap.
 */
export function twice(said: string, cost: string, does: Doing): HTMLSpanElement {
  let armed: number | undefined;
  const line = pressing(said, () => {
    if (armed !== undefined) {
      window.clearTimeout(armed);
      armed = undefined;
      line.textContent = said;
      return does;
    }
    line.textContent = `press again — ${cost}`;
    armed = window.setTimeout(() => {
      armed = undefined;
      if (line.isConnected) line.textContent = said;
    }, STANDS_MS);
    return undefined;
  });
  return line;
}

/**
 * The way home, written across the top of whatever you opened.
 *
 * Each step back is gold because each step back is pressable, and the thing you
 * are actually looking at is not, because you are already there.
 */
export function trail(steps: { said: string; go?: () => void }[]): HTMLDivElement {
  const line = document.createElement('div');
  line.style.cssText = "font-family:'Courier Prime',monospace;font-size:13px";
  for (const [i, step] of steps.entries()) {
    if (i) {
      const tick = document.createElement('span');
      tick.style.cssText = 'color:#6b5a40;padding:0 8px';
      tick.textContent = '›';
      line.appendChild(tick);
    }
    if (step.go) {
      line.appendChild(pressing(step.said, step.go));
      continue;
    }
    const here = document.createElement('span');
    here.style.color = 'var(--yard-ink-bright)';
    here.textContent = step.said;
    line.appendChild(here);
  }
  return line;
}

/**
 * Backing out, one thing at a time.
 *
 * Escape never throws away more than one thing per press, and the order is
 * always the same: what you are half-way through writing, then whatever you
 * opened to read, then the session, then the district, then the island. A stack
 * rather than a switch, so nothing has to know what is above it.
 */
export class Ladder {
  private readonly rungs: { name: string; down: () => void }[] = [];

  /** Step onto a rung. Returns the way to take it off again. */
  onto(name: string, down: () => void): () => void {
    const rung = { name, down };
    this.rungs.push(rung);
    return () => {
      const at = this.rungs.indexOf(rung);
      if (at >= 0) this.rungs.splice(at, 1);
    };
  }

  /** What Escape means right now. True if it meant anything at all. */
  back(): boolean {
    const rung = this.rungs.pop();
    if (!rung) return false;
    rung.down();
    return true;
  }

  /** What you would back out of next, for anything that wants to say so. */
  get top(): string | undefined {
    return this.rungs.at(-1)?.name;
  }
}
