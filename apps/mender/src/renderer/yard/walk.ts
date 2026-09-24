/**
 * Walking the board without a hand on it.
 *
 * Everything pressable here is a line of writing, which is lovely to look at
 * and gives the keyboard nothing to hold on to: there is no list, no rows, no
 * tab order anybody wrote down. So this walks what is actually on the wood, in
 * the order it is written, and marks where it is standing.
 *
 * What it stands on is remembered by what that line *is* rather than by where
 * it was. This board rewrites itself constantly — a commit lands, an agent says
 * something, a file changes on disk — and a cursor that remembers "the fourth
 * line" ends up somewhere else every time the fourth line stops being the same
 * line. Remembering the thing means the cursor stays where you left it even
 * when the board moves under it, which is the only version of this that is not
 * infuriating.
 */

/** The one fill in the whole interface, and it means "the keyboard is here". */
const PICKED = 'picked';

export interface Walking {
  /** Step to the next pressable line, or the one before. True if it moved. */
  step(way: 1 | -1): boolean;
  /** Press whatever it is standing on. */
  press(): boolean;
  /** Stand on a particular thing, by the name it was given, or on nothing. */
  stand(what: string | null): void;
  /** What it is standing on. */
  readonly on: string | null;
  /** Put the mark back after the board was rewritten under it. */
  again(): void;
}

/**
 * Walk the pressable lines under one root.
 *
 * A line joins the walk by carrying a name in `data-walk`. Lines without one
 * are still pressable by hand and simply are not stops, which is right for
 * anything that is a shortcut rather than a destination.
 */
export function walking(root: HTMLElement): Walking {
  let on: string | null = null;

  /* While something is laid over the yard, the keyboard belongs to that and
     not to the yard underneath: walking from a file you are reading onto the
     project's own header is not a step anybody meant to take. What a slash or
     an @ has opened is nearer still, because it is what the line itself is
     doing and the line is where your hands already are. */
  const within = (): HTMLElement => {
    const near = root.querySelector<HTMLElement>('[data-narrowing]');
    if (near && near.offsetParent !== null) return near;
    const sheet = root.querySelector<HTMLElement>('[data-sheet]');
    return sheet && sheet.offsetParent !== null ? sheet : root;
  };

  const stops = (): HTMLElement[] =>
    [...within().querySelectorAll<HTMLElement>('[data-walk]')].filter(
      (one) => one.offsetParent !== null
    );

  function mark(): void {
    for (const one of root.querySelectorAll<HTMLElement>('.' + PICKED)) {
      one.classList.remove(PICKED);
    }
    if (!on) return;
    const here = within().querySelector<HTMLElement>(`[data-walk="${CSS.escape(on)}"]`);
    if (!here) return;
    here.classList.add(PICKED);
    /* Only when it is actually out of sight. Scrolling a board a pixel every
       time a cursor moves within it is the kind of thing that reads as the app
       fidgeting. */
    here.scrollIntoView({ block: 'nearest' });
  }

  return {
    get on() {
      return on;
    },
    step(way) {
      const all = stops();
      if (!all.length) return false;
      const at = all.findIndex((one) => one.dataset.walk === on);
      /* Stepping from nowhere lands on the first line going down and the last
         going up, which is what a cursor arriving from off the board means. */
      const next = at < 0 ? (way > 0 ? 0 : all.length - 1) : at + way;
      const landed = all[Math.max(0, Math.min(all.length - 1, next))];
      on = landed?.dataset.walk ?? null;
      mark();
      return true;
    },
    press() {
      if (!on) return false;
      const here = within().querySelector<HTMLElement>(`[data-walk="${CSS.escape(on)}"]`);
      if (!here) return false;
      here.click();
      return true;
    },
    stand(what) {
      on = what;
      mark();
    },
    again: mark,
  };
}

/** Make a line one of the walk's stops, under a name that outlives a rewrite. */
export function astop<T extends HTMLElement>(line: T, name: string): T {
  line.dataset.walk = name;
  return line;
}
