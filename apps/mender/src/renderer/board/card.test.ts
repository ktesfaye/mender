import { describe, expect, it } from 'vitest';
import type { Told } from '@shared/agents';
import type { Task } from '@shared/tasks';
import { transcriptMarkdown } from './card';

const task: Task = {
  id: 't1',
  title: 'add a thing',
  branch: 'mender/add-a-thing',
  base: 'main',
  path: '/tmp/repo',
} as Task;

const told: Told = {
  notes: [
    { id: 'n2', said: 'and now this', at: 2, answered: true, turn: 2 },
    { id: 'n1', said: 'do the thing', at: 1, answered: true, turn: 1 },
  ],
  thoughts: [
    { id: 'm1', said: 'doing the thing', at: 1, turn: 1 },
    { id: 'm2', said: 'done with that too', at: 2, turn: 2 },
  ],
  deeds: [],
  errands: [],
  wrote: [],
  turns: 2,
  began: 1,
} as Told;

describe('transcriptMarkdown', () => {
  it('pairs each note with what answered it, oldest turn first', () => {
    expect(transcriptMarkdown(task, told)).toBe(
      [
        '# add a thing',
        '',
        '_mender/add-a-thing_',
        '',
        '## you',
        '',
        'do the thing',
        '',
        '## agent',
        '',
        'doing the thing',
        '',
        '## you',
        '',
        'and now this',
        '',
        '## agent',
        '',
        'done with that too',
        '',
      ].join('\n')
    );
  });
});
