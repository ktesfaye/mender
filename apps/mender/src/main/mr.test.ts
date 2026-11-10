import { describe, expect, it } from 'vitest';
import { gitlabPlace, mapGitlab } from './mr';

describe('gitlab merge requests', () => {
  it('adds up the separate answers into one state, and reads a remote either way round', () => {
    const mr = {
      iid: 12,
      web_url: 'https://gitlab.acme.io/a/b/-/merge_requests/12',
      title: 'INV-1',
      state: 'opened',
      head_pipeline: { id: 9, status: 'failed' },
    };
    expect(
      mapGitlab({
        mr,
        failedJobs: ['unit'],
        approvals: { approvals_required: 2, approvals_left: 1 },
        unresolved: 2,
      })
    ).toMatchObject({
      state: 'open',
      ci: 'failed',
      failedChecks: ['unit'],
      approvals: { have: 1, need: 2 },
      unresolved: 2,
    });
    expect(gitlabPlace('git@gitlab.acme.io:a/b.git')).toEqual({
      host: 'gitlab.acme.io',
      path: 'a/b',
    });
    expect(gitlabPlace('https://gitlab.acme.io/a/sub/b.git')).toEqual({
      host: 'gitlab.acme.io',
      path: 'a/sub/b',
    });
  });
});
