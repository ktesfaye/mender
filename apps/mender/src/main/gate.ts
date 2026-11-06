import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { noteCaught } from './ops';

/**
 * The gateway Claude is sent through on this machine, by its host, or
 * undefined when it goes straight to Anthropic.
 *
 * A work laptop routes Claude through the company's own proxy, set as
 * `ANTHROPIC_BASE_URL` in the environment or in Claude Code's settings, and
 * that proxy keeps limits of its own. Naming it is what tells a cap there
 * apart from anything Anthropic did.
 */
export function gateHost(): string | undefined {
  const now = Date.now();
  if (cache && now - cache.at < 60_000) return cache.host;
  const url = process.env.ANTHROPIC_BASE_URL?.trim() || fromSettings();
  let host: string | undefined;
  try {
    host = url ? new URL(url).hostname : undefined;
  } catch (caught) {
    noteCaught('gate.ts:21', caught);
    host = undefined;
  }
  if (host && /(^|\.)anthropic\.com$/i.test(host)) host = undefined;
  cache = { at: now, host };
  return host;
}

let cache: { at: number; host: string | undefined } | undefined;

function fromSettings(): string | undefined {
  try {
    const settings = JSON.parse(readFileSync(join(homedir(), '.claude', 'settings.json'), 'utf8'));
    const url = settings?.env?.ANTHROPIC_BASE_URL;
    return typeof url === 'string' && url.trim() ? url.trim() : undefined;
  } catch (caught) {
    noteCaught('gate.ts:36', caught);
    return undefined;
  }
}
