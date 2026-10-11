import { basename } from 'node:path';
import type { RateLimit } from '@emdash/core/runtimes/acp/api';
import type { ShellEnvManager } from '@emdash/core/services/shell-env/node';
import { log } from '@emdash/shared/logger';
import {
  FIVE_HOURS_MS,
  type FiveHours,
  type SessionShare,
  type WindowReading,
} from '../shared/five-hours';
import { RECENT_MS, type ClaudeUsage } from './claude-usage';

type EnvSource = Pick<ShellEnvManager, 'current'>;

/**
 * The subscription's five-hour window, and who is spending it.
 *
 * The meter itself comes two ways. Every answer a bridged session gets back
 * carries it in its headers, and Claude's bridge hands it on with the next
 * usage update, so a village with anybody working in it hears it for free
 * after every turn. Between turns, and at startup before anybody has said
 * anything, it is asked for directly: one call for one token to the cheapest
 * model, with the same sign-in a session uses, which comes back with the
 * same headers. That costs about as much as a word and is never made more
 * than once in a few minutes.
 *
 * Who spent it is read off Claude's own transcripts, every session on the
 * machine, the village's and terminal ones alike, since the window is one
 * meter for the whole account.
 */
export interface FiveHoursReader {
  /** A session heard the meter in its own answer. */
  report(limit: RateLimit, from: string): void;
  read(): Promise<FiveHours>;
}

/** A reading older than this is asked for again before it is handed over. */
const FRESH_MS = 4 * 60_000;
/** And never asked for more often than this, whatever is asked of it. */
const PROBE_EVERY_MS = 3 * 60_000;
const PROBE_URL = 'https://api.anthropic.com/v1/messages';
const PROBE_MODEL = 'claude-haiku-4-5-20251001';

export function createFiveHours(
  env: EnvSource,
  usage: ClaudeUsage,
  /** The village's own sessions, by Claude's id for each. */
  mine: () => { task: string; title: string; session: string }[]
): FiveHoursReader {
  let latest: WindowReading | null = null;
  let probedAt = 0;
  let probing: Promise<void> | null = null;

  function report(limit: RateLimit, from: string): void {
    if (!limit.fiveHour && !limit.sevenDay) return;
    latest = { fiveHour: limit.fiveHour, sevenDay: limit.sevenDay, at: Date.now() };
    log.info('five hours: read', {
      area: 'five-hours',
      from,
      fiveHour: limit.fiveHour?.utilization,
      fiveHourResets: limit.fiveHour ? new Date(limit.fiveHour.resetsAt).toISOString() : null,
      sevenDay: limit.sevenDay?.utilization,
    });
  }

  async function probe(): Promise<void> {
    const now = Date.now();
    if (now - probedAt < PROBE_EVERY_MS) return;
    probedAt = now;
    const vars = await env.current();
    const token = vars.CLAUDE_CODE_OAUTH_TOKEN ?? process.env.CLAUDE_CODE_OAUTH_TOKEN;
    if (!token) {
      log.info('five hours: nothing to ask with', { area: 'five-hours' });
      return;
    }
    try {
      const response = await fetch(PROBE_URL, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'oauth-2025-04-20',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: PROBE_MODEL,
          max_tokens: 1,
          system: "You are Claude Code, Anthropic's official CLI for Claude.",
          messages: [{ role: 'user', content: 'hi' }],
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const read = (name: string): { utilization: number; resetsAt: number } | null => {
        const used = Number(response.headers.get(`anthropic-ratelimit-unified-${name}-utilization`));
        const resets = Number(response.headers.get(`anthropic-ratelimit-unified-${name}-reset`));
        if (!Number.isFinite(used) || !Number.isFinite(resets) || resets <= 0) return null;
        return { utilization: used, resetsAt: resets * 1000 };
      };
      const fiveHour = read('5h');
      const sevenDay = read('7d');
      if (!fiveHour && !sevenDay) {
        log.warn('five hours: asked, no meter came back', {
          area: 'five-hours',
          status: response.status,
        });
        return;
      }
      report({ fiveHour, sevenDay }, 'probe');
    } catch (error) {
      log.warn('five hours: ask failed', { area: 'five-hours', error: String(error) });
    }
  }

  async function read(): Promise<FiveHours> {
    const now = Date.now();
    if (!latest || now - latest.at > FRESH_MS) {
      probing ??= probe().finally(() => {
        probing = null;
      });
      await probing;
    }
    const since = latest?.fiveHour ? latest.fiveHour.resetsAt - FIVE_HOURS_MS : now - FIVE_HOURS_MS;
    const spends = await usage.since(since, now);
    const own = new Map(mine().map((one) => [one.session, one]));
    const total = spends.reduce((sum, one) => sum + one.weighted, 0);
    const sessions: SessionShare[] = spends
      .filter((one) => one.calls > 0)
      .map((one) => {
        const here = own.get(one.session);
        return {
          id: one.session,
          title: here?.title ?? one.title ?? 'a session with nothing said',
          task: here?.task ?? null,
          where: one.cwd ? basename(one.cwd) : folderOf(one.dir),
          share: total > 0 ? one.weighted / total : 0,
          calls: one.calls,
          context: Math.round((one.input + one.cacheRead + one.cacheWrite) / one.calls),
          screenshots: one.images,
          lastAt: one.lastAt,
        };
      });
    const elapsed = now - since;
    const recent = spends.reduce((sum, one) => sum + one.recent, 0);
    const lately =
      elapsed > RECENT_MS * 2 && total > 0
        ? recent / RECENT_MS / (total / elapsed)
        : null;
    return { reading: latest, since, sessions, lately };
  }

  return { report, read };
}

/** Claude folds a checkout's path into a directory name, `/` to `-`; the
    last piece is the folder, near enough to say. */
function folderOf(dir: string): string | null {
  const last = dir.split('-').filter(Boolean).at(-1);
  return last ?? null;
}
