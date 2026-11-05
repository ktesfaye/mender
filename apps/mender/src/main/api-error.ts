import type { SessionFailure } from '@emdash/core/runtimes/acp/api';

/** Claude Code saying it could not get to the API at all, which is this
 *  machine's line out and not anybody's servers. */
const UNREACHABLE =
  /can'?t reach|cannot reach|unable to connect|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ENETUNREACH|EHOSTUNREACH|ENETDOWN|ETIMEDOUT|socket hang up|fetch failed|check your internet|connection error/i;

export function unreachable(text: string): boolean {
  return UNREACHABLE.test(text);
}

/**
 * The failure as the village reads it.
 *
 * Claude's adapter files "can't reach the API server, check your internet"
 * under the service having a rough patch, which sent him off blaming the
 * other end for a Wi-Fi drop. It is the line out, so it is a connection.
 */
export function reread<T extends SessionFailure>(failure: T): T {
  if (failure.category !== 'service' && failure.category !== 'unknown') return failure;
  return unreachable(`${failure.title} ${failure.details ?? ''}`)
    ? { ...failure, category: 'connection' }
    : failure;
}

/**
 * Claude Code's "API Error: ..." line in plain words, or undefined when the
 * text is not one. It arrives as an ordinary message, so left alone it reads
 * as the agent's answer, raw error codes and all.
 */
export function apiError(text: string): string | undefined {
  const trimmed = text.trim();
  if (trimmed.length > 600 || !/^API Error\b/.test(trimmed)) return undefined;
  if (unreachable(trimmed)) return "Couldn't reach Claude. The internet looks to be down.";
  if (/overloaded|\b529\b/i.test(trimmed)) return 'Claude is overloaded right now.';
  if (/\b5\d\d\b|internal server error|api_error/i.test(trimmed))
    return "Claude's servers threw an error.";
  if (/\b429\b|rate.?limit/i.test(trimmed)) return 'Claude is asking for a breather.';
  const rest = trimmed.replace(/^API Error:?\s*/, '');
  return rest ? `Claude sent back an error: ${rest}` : 'Claude sent back an error.';
}

/** How a plan's own usage limit begins, folded to lower case. */
const PLAN_LIMIT =
  /^you(?:'ve| have) (?:hit|reached) your|^you're out of (?:usage|extra usage)|usage limit|quota|billing/;

/**
 * A request cap rather than an empty plan: the other end, or a gateway in
 * front of it, turning requests away for coming too often.
 *
 * Claude's adapter files a 429 under the same "limit" as having used the
 * plan up, telling them apart only by offering a retry on the first, so
 * a company proxy capped at so many requests a minute read as out of usage
 * for hours when it lifted at the top of the next minute.
 */
export function throttled(failure: SessionFailure): boolean {
  if (failure.category !== 'limit') return false;
  const said = `${failure.title} ${failure.details ?? ''}`.trim().toLowerCase();
  if (PLAN_LIMIT.test(said)) return false;
  return (
    failure.actions.includes('retry') ||
    /\b429\b|rate.?limit|too many requests|requests? per (?:minute|second)|throttl/.test(said)
  );
}

/**
 * When a request cap lets requests through again: what the refusal itself
 * says when it names a wait, otherwise the top of the minute after it was
 * hit, which is when a per-minute cap starts counting afresh.
 */
export function throttleLifts(failure: SessionFailure, hitAt: number): number {
  const said = `${failure.title} ${failure.details ?? ''}`;
  const after = /retry[- ]after\D{0,4}(\d+)\s*(s|sec|seconds?|m|min|minutes?)?\b/i.exec(said);
  if (after) {
    const minutes = after[2]?.toLowerCase().startsWith('m');
    return hitAt + Number(after[1]) * (minutes ? 60_000 : 1000);
  }
  return Math.floor(hitAt / 60_000) * 60_000 + 60_000;
}
