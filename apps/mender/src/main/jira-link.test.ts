import { describe, expect, it } from 'vitest';
import { boardLinkOf } from './jira-link';

describe('boardLinkOf', () => {
  it('finds the site, board and project in every form of board link', () => {
    expect(
      boardLinkOf('https://Acme.atlassian.net/jira/software/c/projects/PAY/boards/412?selectedIssue=PAY-9')
    ).toEqual({ site: 'acme.atlassian.net', board: 412, key: 'PAY' });
    expect(boardLinkOf('https://acme.atlassian.net/secure/RapidBoard.jspa?rapidView=88')).toEqual({
      site: 'acme.atlassian.net',
      board: 88,
    });
    expect(boardLinkOf('https://acme.atlassian.net/jira/core/projects/ops/board')).toEqual({
      site: 'acme.atlassian.net',
      key: 'OPS',
    });
    expect(boardLinkOf('payments')).toBeNull();
  });
});
