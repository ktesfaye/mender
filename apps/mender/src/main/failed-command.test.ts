import { describe, expect, it } from 'vitest';
import { howItFailed } from './failed-command';

describe('howItFailed', () => {
  it('a refused command never ran', () => {
    expect(
      howItFailed(
        'rm -rf x',
        'Permission for this action was denied by the Claude Code auto mode classifier.'
      )
    ).toBe('held');
  });

  it('a search that found nothing is an answer', () => {
    expect(howItFailed('cd src && grep -n foo a.ts', '```\nExit code 1\n```')).toBe('fine');
  });

  it('a command that printed its trouble went wrong', () => {
    expect(howItFailed('node x.mjs', 'Exit code 1\nTypeError: boom')).toBe('wrong');
  });
});
