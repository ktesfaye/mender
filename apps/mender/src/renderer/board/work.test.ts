import { describe, expect, it } from 'vitest';
import type { Ask } from '@shared/agents';
import { answerFor, answersFor, SEND_ALL } from './work';

describe('answersFor', () => {
  it('leaves a plain question as its own options, with no send line', () => {
    const ask: Ask = {
      requestId: 'r1',
      text: 'run it?',
      options: [
        { optionId: 'allow', name: 'allow once' },
        { optionId: 'reject', name: 'reject once' },
      ],
    };
    expect(answersFor(ask).map((one) => one.optionId)).toEqual(['allow', 'reject']);
  });

  it('appends "that\'s everything" only on a multi-select question', () => {
    const ask: Ask = {
      requestId: 'r1',
      text: '2 things are asking.',
      multi: true,
      options: [{ optionId: 'a', name: 'yes', requestId: 'r1' }],
    };
    const last = answersFor(ask).at(-1);
    expect(last?.optionId).toBe(SEND_ALL);
  });

  it('marks a picked option in its own name', () => {
    const ask: Ask = {
      requestId: 'r1',
      text: 'asking',
      multi: true,
      options: [{ optionId: 'a', name: 'yes', requestId: 'r1', picked: true }],
    };
    expect(answersFor(ask)[0].name).toContain('yes');
    expect(answersFor(ask)[0].name).not.toBe('yes');
  });

  it('carries which pending question each multi-select option answers', () => {
    const ask: Ask = {
      requestId: 'r1',
      text: 'asking',
      multi: true,
      options: [
        { optionId: 'a', name: 'yes', requestId: 'r1' },
        { optionId: 'b', name: 'yes', requestId: 'r2' },
      ],
    };
    expect(answerFor(ask, '1')?.requestId).toBe('r1');
    expect(answerFor(ask, '2')?.requestId).toBe('r2');
  });
});
