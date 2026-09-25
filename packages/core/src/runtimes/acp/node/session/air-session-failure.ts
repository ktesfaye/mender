import type { SessionFailure } from '#runtimes/acp/api';

/**
 * Decodes the AIR extension's typed session-failure payload out of an ACP
 * `_meta`, when the peer (today, Claude's own ACP adapter) has published one.
 * Both channels the adapter uses carry it the same way — a `session_info_update`
 * notification for an advisory still in flight, and a `session/prompt`
 * response for one that settled the turn — so this one decoder covers both.
 *
 * Mirrors the wire shape in
 * `@agentclientprotocol/claude-agent-acp`'s `session-failure-extension.js` /
 * `air-extension.js`: `_meta.jetbrains.air.sessionFailure`, gated on
 * `_meta.jetbrains.air.version`.
 */
export function decodeAirSessionFailure(meta: unknown): SessionFailure | null {
  const air = record(record(record(meta).jetbrains).air);
  if (typeof air.version !== 'number') return null;
  const payload = record(air.sessionFailure);
  if (typeof payload.id !== 'string' || typeof payload.title !== 'string') return null;

  const category = CATEGORIES.has(payload.category as string)
    ? (payload.category as SessionFailure['category'])
    : 'unknown';
  const severity = payload.severity === 'warning' ? 'warning' : 'error';
  const actions = Array.isArray(payload.actions)
    ? payload.actions.filter(
        (a): a is SessionFailure['actions'][number] => typeof a === 'string' && ACTIONS.has(a)
      )
    : [];
  const details = typeof payload.details === 'string' ? payload.details : undefined;
  const resetAt = details ? resetAtFrom(details) : undefined;

  return {
    id: payload.id,
    category,
    severity,
    title: payload.title,
    ...(details !== undefined ? { details } : {}),
    actions,
    ...(resetAt !== undefined ? { resetAt } : {}),
  };
}

const CATEGORIES = new Set(['connection', 'access', 'limit', 'request', 'service', 'unknown']);
const ACTIONS = new Set(['retry', 'login', 'new_session']);

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Pulls a reset time out of Claude's own limit prose, when it names one.
 *
 * Claude says either a clock time ("resets 9pm", "resets at 9:30 PM") or a
 * duration ("resets in 45 minutes", "resets in 2 hours"). A clock time with no
 * date is read as the next occurrence of that time — today if it hasn't
 * passed yet, tomorrow if it has, since a usage window never resets in the
 * past.
 */
export function resetAtFrom(text: string, now: number = Date.now()): number | undefined {
  const clock = /reset[a-z]*\s*(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*([ap]m)\b/i.exec(text);
  if (clock) {
    const hour12 = Number(clock[1]);
    const minute = Number(clock[2] ?? '0');
    const pm = clock[3]!.toLowerCase() === 'pm';
    let hour = hour12 % 12;
    if (pm) hour += 12;
    const at = new Date(now);
    at.setHours(hour, minute, 0, 0);
    if (at.getTime() <= now) at.setDate(at.getDate() + 1);
    return at.getTime();
  }

  const duration = /reset[a-z]*\s*in\s+(\d+)\s*(minute|hour|day)s?\b/i.exec(text);
  if (duration) {
    const amount = Number(duration[1]);
    const unitMs = { minute: 60_000, hour: 3_600_000, day: 86_400_000 }[
      duration[2]!.toLowerCase() as 'minute' | 'hour' | 'day'
    ];
    return now + amount * unitMs;
  }

  return undefined;
}
