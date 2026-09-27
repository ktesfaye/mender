import { describe, expect, it } from 'vitest';
import { claudeProjectDirName, parseClaudeSessionLines } from './claude-cli-history';

describe('claudeProjectDirName', () => {
  it('folds every path separator to a dash, matching a real checkout on disk', () => {
    expect(claudeProjectDirName('/Users/kirubel/Documents/dev/a-cozy-agents-village')).toBe(
      '-Users-kirubel-Documents-dev-a-cozy-agents-village'
    );
  });

  it('leaves an already-hyphenated segment alone rather than collapsing it', () => {
    expect(claudeProjectDirName('/a/b-c/d')).toBe('-a-b-c-d');
  });

  it('folds other non-alphanumeric characters too, not only slashes', () => {
    expect(claudeProjectDirName('/a/b.c/d_e')).toBe('-a-b-c-d-e');
  });
});

describe('parseClaudeSessionLines', () => {
  it('reads sessionId, gitBranch, and the first real user message', () => {
    const lines = [
      JSON.stringify({ type: 'mode', mode: 'normal', sessionId: 'abc-123' }),
      JSON.stringify({
        type: 'attachment',
        sessionId: 'abc-123',
        gitBranch: 'main',
        cwd: '/x',
      }),
      JSON.stringify({
        parentUuid: null,
        isSidechain: false,
        type: 'user',
        message: { role: 'user', content: 'fix the thing that is broken' },
      }),
    ];
    expect(parseClaudeSessionLines(lines)).toEqual({
      sessionId: 'abc-123',
      gitBranch: 'main',
      title: 'fix the thing that is broken',
    });
  });

  it('skips a tool-result "user" turn whose content is an array, not a string', () => {
    const lines = [
      JSON.stringify({
        type: 'user',
        isSidechain: false,
        message: { role: 'user', content: [{ type: 'tool_result', content: 'ls output' }] },
      }),
      JSON.stringify({
        type: 'user',
        isSidechain: false,
        message: { role: 'user', content: 'the real first thing typed' },
      }),
    ];
    expect(parseClaudeSessionLines(lines).title).toBe('the real first thing typed');
  });

  it('skips a synthetic wrapper message that opens with a tag', () => {
    const lines = [
      JSON.stringify({
        type: 'user',
        isSidechain: false,
        message: { role: 'user', content: '<system-reminder>hidden context</system-reminder>' },
      }),
      JSON.stringify({
        type: 'user',
        isSidechain: false,
        message: { role: 'user', content: 'what a person actually typed' },
      }),
    ];
    expect(parseClaudeSessionLines(lines).title).toBe('what a person actually typed');
  });

  it('skips a sidechain (subagent) turn even if it has plain string content', () => {
    const lines = [
      JSON.stringify({
        type: 'user',
        isSidechain: true,
        message: { role: 'user', content: 'a subagent instruction, not the human' },
      }),
      JSON.stringify({
        type: 'user',
        isSidechain: false,
        message: { role: 'user', content: 'the actual human turn' },
      }),
    ];
    expect(parseClaudeSessionLines(lines).title).toBe('the actual human turn');
  });

  it('truncates a long message and never throws on a malformed line', () => {
    const long = 'x'.repeat(200);
    const lines = [
      'not json at all',
      JSON.stringify({
        type: 'user',
        isSidechain: false,
        message: { role: 'user', content: long },
      }),
    ];
    const result = parseClaudeSessionLines(lines);
    expect(result.title?.length).toBeLessThanOrEqual(81);
    expect(result.title?.endsWith('…')).toBe(true);
  });

  it('returns all-null on an empty or fully-unparseable file', () => {
    expect(parseClaudeSessionLines([])).toEqual({ sessionId: null, gitBranch: null, title: null });
    expect(parseClaudeSessionLines(['not json', '{broken'])).toEqual({
      sessionId: null,
      gitBranch: null,
      title: null,
    });
  });
});
