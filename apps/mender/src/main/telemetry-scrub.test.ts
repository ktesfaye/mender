import { userInfo } from 'node:os';
import { expect, it } from 'vitest';
import { scrub } from './telemetry-scrub';

it('ships nothing of the work from lines that carry it', () => {
  const me = userInfo().username;
  const secrets = [
    '/Users/someone/Documents/dev/acme-billing/src/pay.ts',
    'acme-billing',
    'feature/ACME-4412-refund-bug',
    'ACME-4412',
    'jo@acme.example',
    'please rewrite the refund handler',
    'acme.atlassian.net',
    'deadbeefcafe1234',
    '10.2.3.4',
    me,
  ];
  const lines: Record<string, unknown>[] = [
    {
      level: 'warn',
      time: 't',
      proc: 'main',
      area: 'tasks',
      msg: `op end for branch feature/ACME-4412-refund-bug in /Users/someone/Documents/dev/acme-billing failed, "please rewrite the refund handler" jo@acme.example https://acme.atlassian.net/browse/ACME-4412 ${me} at 10.2.3.4 deadbeefcafe1234`,
      op: 'workspace cut',
      opId: 'mkq1x3a5abc',
      durationMs: 1234,
      errorMessage:
        'fatal: could not read from git@github.com:acme/acme-billing.git branch feature/ACME-4412-refund-bug',
      branch: 'feature/ACME-4412-refund-bug',
      path: '/Users/someone/Documents/dev/acme-billing',
      text: 'please rewrite the refund handler',
      project: 'acme-billing',
      outputTail: 'please rewrite the refund handler',
      stage: 'acme-billing/src/pay.ts',
      procedure: 'tasks.begin',
    },
    {
      level: 'info',
      time: 't',
      area: 'agents',
      msg: 'createAcpAgentConnection: agent stderr',
      text: 'please rewrite the refund handler',
    },
    {
      level: 'info',
      time: 't',
      area: 'renderer',
      msg:
        'mender:' +
        JSON.stringify({ msg: 'board switch', surface: 'yard', waitMs: 40, text: 'acme-billing' }),
    },
    {
      level: 'warn',
      time: 't',
      area: 'renderer',
      msg: 'Error in /Users/someone/acme-billing/pay.ts please rewrite the refund handler',
    },
  ];
  const shipped = lines.map((line) => scrub(line));
  const text = JSON.stringify(shipped);
  for (const secret of secrets) expect(text).not.toContain(secret);
  expect(shipped[1]).toEqual({ drop: 'content' });
  expect(shipped[0]).toMatchObject({
    ship: { op: 'workspace cut', durationMs: 1234, procedure: 'tasks.begin' },
  });
  expect(shipped[2]).toMatchObject({ ship: { surface: 'yard', waitMs: 40, msg: 'board switch' } });
});
