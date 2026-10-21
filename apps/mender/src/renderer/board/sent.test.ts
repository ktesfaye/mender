import type { PullRequest, PullRequestComment } from '@upstream/services/pull-requests/api/schemas';
import { describe, expect, it } from 'vitest';
import { toHand, toHandCheck } from './sent';

const pull = {
  url: 'https://github.com/o/r/pull/9',
  headRefName: 'feature',
  baseRefName: 'main',
  status: 'open',
  isDraft: false,
  additions: 1,
  deletions: 1,
  title: 'a change',
  description: '',
  reviewDecision: null,
  mergeableStatus: 'MEERGEABLE',
  checks: [
    { id: 'c1', name: 'build', status: 'completed', conclusion: 'failure' },
    { id: 'c2', name: 'lint', status: 'completed', conclusion: 'success' },
  ],
} as unknown as PullRequest;

const comments: PullRequestComment[] = [
  {
    id: 'r1',
    body: 'this leaks a handle',
    path: 'src/a.ts',
    line: 12,
    isResolved: false,
    author: { userName: 'ada' },
  } as unknown as PullRequestComment,
  {
    id: 'r2',
    body: 'already fixed',
    path: 'src/b.ts',
    line: 3,
    isResolved: true,
    author: { userName: 'ada' },
  } as unknown as PullRequestComment,
];

describe('toHand', () => {
  it('carries the file and line the comment was left on', () => {
    expect(toHand(comments[0] as PullRequestComment)).toBe('src/a.ts:12 — this leaks a handle');
  });
});

describe('toHandCheck', () => {
  it('names the check and how it failed', () => {
    const failed = (pull.checks as PullRequest['checks'])[0] as PullRequest['checks'][number];
    expect(toHandCheck(failed)).toBe('the "build" check failed, failure.');
  });
});
