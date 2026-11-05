import { describe, expect, it } from 'vitest';
import { apiError, reread, throttled, throttleLifts } from './api-error';

const dns = "API Error: Can't reach the API server — check your internet or DNS (ENOTFOUND)";

describe('api errors', () => {
  it('reads an unreachable API as a connection, not the service', () => {
    const failure = {
      id: 'x',
      category: 'service' as const,
      severity: 'error' as const,
      title: dns,
      actions: [],
    };
    expect(reread(failure).category).toBe('connection');
  });

  it('says an API Error line in plain words and leaves answers alone', () => {
    expect(apiError(dns)).toBe("Couldn't reach Claude. The internet looks to be down.");
    expect(apiError('The API Error was in the handler.')).toBeUndefined();
  });

  it('tells a request cap apart from a plan run out', () => {
    const limit = (title: string, actions: ('retry' | 'login' | 'new_session')[]) => ({
      id: 'x',
      category: 'limit' as const,
      severity: 'error' as const,
      title,
      actions,
    });
    expect(throttled(limit('API Error: 429 Too Many Requests', ['retry']))).toBe(true);
    expect(throttled(limit("You've hit your session limit · resets 11:20am", []))).toBe(false);
  });

  it('opens a request cap at the top of the next minute', () => {
    const hit = Date.UTC(2026, 10, 5, 14, 14, 23);
    const failure = {
      id: 'x',
      category: 'limit' as const,
      severity: 'error' as const,
      title: '429',
      actions: [],
    };
    expect(throttleLifts(failure, hit)).toBe(Date.UTC(2026, 10, 5, 14, 15, 0));
  });
});
