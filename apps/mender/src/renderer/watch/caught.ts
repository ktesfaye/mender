import { emit } from './emit';
import { tally } from './tally';

const seen = new Map<string, number>();

/**
 * Something that failed and was carried past on purpose. Said once per place
 * for the first few times and then every hundredth, with the count, so a
 * fallback that fires on every frame cannot flood the log but is never silent.
 */
export function swallowed(site: string, error?: unknown): void {
  const n = (seen.get(site) ?? 0) + 1;
  seen.set(site, n);
  tally.swallowed++;
  if (n > 3 && n % 100 !== 0) return;
  emit('warn', {
    msg: 'caught',
    kind: site,
    count: n,
    errorName:
      error instanceof Error && /^[A-Za-z0-9_.:-]{1,64}$/.test(error.name) ? error.name : undefined,
    errorMessage: error instanceof Error ? error.message.slice(0, 100) : undefined,
  });
}

/** For `.catch(soft('place', fallback))`: the same fallback, but said. */
export function soft<T>(site: string, fallback: T): (error: unknown) => T {
  return (error) => {
    swallowed(site, error);
    return fallback;
  };
}

/** A deliberate fallback or timeout that is not an error: said the same way, by name. */
export function fellBack(site: string, stage?: string): void {
  emit('info', { msg: 'fallback', kind: site, stage });
}
