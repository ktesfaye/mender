import { describe, expect, it } from 'vitest';
import { apiError, reread } from './api-error';

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
});
