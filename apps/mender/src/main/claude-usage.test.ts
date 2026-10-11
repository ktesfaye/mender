import { describe, expect, it } from 'vitest';
import { spendOf, tallyLines } from './claude-usage';

const line = (one: Record<string, unknown>): string => JSON.stringify(one);

describe('tallyLines', () => {
  it('counts a message once however many lines carry its id, and rolls pictures in', () => {
    const usage = {
      input_tokens: 10,
      output_tokens: 100,
      cache_creation_input_tokens: 1000,
      cache_read_input_tokens: 10000,
    };
    const lines = [
      line({ type: 'user', timestamp: '2026-10-11T20:30:00Z', cwd: '/x/y', message: { content: 'hi' } }),
      line({
        type: 'assistant',
        timestamp: '2026-10-11T20:30:01Z',
        message: { id: 'm1', model: 'claude-opus-5-5', usage },
      }),
      line({
        type: 'assistant',
        timestamp: '2026-10-11T20:30:02Z',
        message: { id: 'm1', model: 'claude-opus-5-5', usage },
      }),
      line({
        type: 'user',
        timestamp: '2026-10-11T20:31:00Z',
        message: {
          content: [{ type: 'tool_result', content: [{ type: 'image' }, { type: 'text' }] }],
        },
      }),
      line({ type: 'ai-title', aiTitle: 'Fixing the roof' }),
    ];
    const seen = new Set<string>();
    const got = tallyLines(lines, 's1', 'd1', seen);
    expect(got.title).toBe('Fixing the roof');
    expect(got.said).toBe('hi');
    expect(got.cwd).toBe('/x/y');
    const spends = spendOf(
      got.events,
      new Map([['s1', { title: got.title, said: got.said, cwd: got.cwd }]]),
      Date.parse('2026-10-11T20:00:00Z'),
      Date.parse('2026-10-11T21:00:00Z')
    );
    expect(spends).toHaveLength(1);
    expect(spends[0]).toMatchObject({ calls: 1, output: 100, cacheRead: 10000, images: 1 });
    expect(spends[0]!.weighted).toBe(10 + 1250 + 1000 + 500);
  });

  it('leaves out what falls outside the window', () => {
    const lines = [
      line({
        type: 'assistant',
        timestamp: '2026-10-11T10:00:00Z',
        message: { id: 'old', usage: { output_tokens: 5 } },
      }),
    ];
    const got = tallyLines(lines, 's1', 'd1', new Set());
    expect(
      spendOf(got.events, new Map(), Date.parse('2026-10-11T20:00:00Z'), Date.parse('2026-10-11T21:00:00Z'))
    ).toEqual([]);
  });
});
