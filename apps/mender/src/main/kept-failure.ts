import type { SessionFailure, SessionState } from '@emdash/core/runtimes/acp/api';

/** The failure a session still stands on once its state has moved: the one
 *  it reports, or, asleep and reporting nothing, the one it had. */
export function keptFailure(
  had: SessionFailure | null,
  now: SessionState | undefined
): SessionFailure | null {
  if (now?.failure) return now.failure;
  return now?.suspended || now?.lifecycle === 'closed' ? had : null;
}
