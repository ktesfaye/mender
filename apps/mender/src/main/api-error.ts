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
