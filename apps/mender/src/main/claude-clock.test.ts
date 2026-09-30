import { describe, expect, it } from 'vitest';
import { clockOf, datedOf } from './claude-clock';

const line = (type: string, at: string, content: unknown, extra = {}): string =>
  JSON.stringify({ type, timestamp: at, message: { content }, ...extra });

describe('clockOf', () => {
  it('dates repeated words in the order they were said and skips tool results and subagents', () => {
    const dated = datedOf([
      line('user', '2026-09-01T10:00:00Z', 'go on'),
      line('assistant', '2026-09-01T10:01:00Z', [{ type: 'text', text: 'Done  the\nfirst.' }]),
      line('user', '2026-09-01T10:02:00Z', [{ type: 'tool_result', content: 'go on' }]),
      line('user', '2026-09-01T10:03:00Z', 'go on', { isSidechain: true }),
      line('user', '2026-09-01T11:00:00Z', 'go on'),
    ]);
    const when = clockOf(dated);
    expect(when('you', 'go on')).toBe(Date.parse('2026-09-01T10:00:00Z'));
    expect(when('it', 'Done the first. And then some more.')).toBe(
      Date.parse('2026-09-01T10:01:00Z')
    );
    expect(when('you', 'never said')).toBe(0);
    expect(when('you', 'go on')).toBe(Date.parse('2026-09-01T11:00:00Z'));
  });
});
