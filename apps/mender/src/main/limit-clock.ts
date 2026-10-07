/**
 * When a limit lifts, read off what Claude itself said about it.
 *
 * Claude's typed failure only carries a reset time when the adapter puts one
 * in its details, and the usage limit never does: the time is in the headline
 * instead, "You've hit your session limit · resets 11:20am
 * (America/Los_Angeles)". So this reads the headline, in the zone it names,
 * and as the next such time after the moment the limit was hit rather than
 * after now, or a limit read back the following morning would claim to lift
 * the day after.
 *
 * Also understood: a date before the time ("resets Oct 9, 5pm", "resets Oct 9
 * at 5pm") and a duration ("resets in 45 minutes", "resets in 2h").
 */
export function resetFrom(text: string, hitAt: number): number | undefined {
  const zone = /\(([A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)+|UTC)\)/.exec(text)?.[1];
  const tz = zone && validZone(zone) ? zone : undefined;

  const clock =
    /reset[a-z]*\s+(?:on\s+)?(?:([A-Z][a-z]{2,8})\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(?:at\s+)?)?(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*([ap]m)\b/i.exec(
      text
    );
  if (clock) {
    const hour = (Number(clock[3]) % 12) + (clock[5]!.toLowerCase() === 'pm' ? 12 : 0);
    const minute = Number(clock[4] ?? '0');
    const month = clock[1] ? monthOf(clock[1]) : undefined;
    const wall = wallOf(hitAt, tz);
    if (month !== undefined) {
      let at = zoned(wall.year, month, Number(clock[2]), hour, minute, tz);
      if (at < hitAt - 86_400_000) at = zoned(wall.year + 1, month, Number(clock[2]), hour, minute, tz);
      return at;
    }
    let at = zoned(wall.year, wall.month, wall.day, hour, minute, tz);
    /* Claude names the minute, not the second, so a limit hit again a moment
       after the time it named is still that one lifting, not tomorrow's. */
    if (at <= hitAt - GRACE) at = zoned(wall.year, wall.month, wall.day + 1, hour, minute, tz);
    return at;
  }

  const span = /reset[a-z]*\s+in\s+(\d+)\s*(m|min|minute|h|hr|hour|d|day)s?\b/i.exec(text);
  if (span) {
    const unit = span[2]!.toLowerCase()[0] as 'm' | 'h' | 'd';
    return hitAt + Number(span[1]) * { m: 60_000, h: 3_600_000, d: 86_400_000 }[unit];
  }
  return undefined;
}

const GRACE = 5 * 60_000;

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function monthOf(name: string): number | undefined {
  const at = MONTHS.indexOf(name.slice(0, 3).toLowerCase());
  return at < 0 ? undefined : at;
}

function validZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** The calendar date at `at`, in the zone, or on this machine without one. */
function wallOf(at: number, tz: string | undefined): { year: number; month: number; day: number } {
  if (!tz) {
    const here = new Date(at);
    return { year: here.getFullYear(), month: here.getMonth(), day: here.getDate() };
  }
  const parts = partsOf(at, tz);
  return { year: parts.year, month: parts.month - 1, day: parts.day };
}

/** The instant a wall-clock time falls on, in the zone. */
function zoned(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  tz: string | undefined
): number {
  if (!tz) return new Date(year, month, day, hour, minute, 0, 0).getTime();
  const guess = Date.UTC(year, month, day, hour, minute);
  const first = guess - offsetOf(guess, tz);
  return guess - offsetOf(first, tz);
}

function offsetOf(at: number, tz: string): number {
  const p = partsOf(at, tz);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(at / 1000) * 1000;
}

function partsOf(at: number, tz: string): Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number> {
  const out = { year: 0, month: 0, day: 0, hour: 0, minute: 0, second: 0 };
  const format = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  });
  for (const part of format.formatToParts(at)) {
    if (part.type in out) out[part.type as keyof typeof out] = Number(part.value);
  }
  return out;
}
