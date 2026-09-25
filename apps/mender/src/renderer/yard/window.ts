/**
 * How much of a long list is drawn, and how much stays a number instead.
 *
 * Pure arithmetic, kept apart from the DOM it feeds. A long transcript is
 * hundreds of turns, and an off-by-one in what slice of it gets drawn is
 * invisible on the short one anybody actually looks at while writing it —
 * exactly the kind of bug this file exists to pin down before a real one
 * ever shows up on a real session.
 */

/** Where the drawn slice of `total` items starts, showing at most `shown`
    of the most recent ones. */
export function windowStart(total: number, shown: number): number {
  const clamped = Math.min(Math.max(shown, 0), total);
  return total - clamped;
}

/** How many are open to reveal but not drawn: the ones this window is
    hiding, plus however many the server already left off the end. */
export function hiddenCount(total: number, shown: number, fromServer: number): number {
  return fromServer + windowStart(total, shown);
}

/** One more chunk revealed, capped at the whole list. */
export function revealMore(total: number, shown: number, chunk: number): number {
  return Math.min(total, shown + chunk);
}
