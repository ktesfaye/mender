import { describe, expect, it } from 'vitest';
import { doingNow, plainCommand } from './deeds';

describe('plainCommand', () => {
  it('reads past setup to what the command did', () => {
    expect(
      plainCommand(
        'S=/private/tmp/x/scratchpad; cd /repo && git add a.ts && git commit -qm "fix(yard): the rail breathes"'
      )
    ).toEqual({ kind: 'act', said: 'committed “the rail breathes”' });
    expect(
      plainCommand(`git commit -m "$(cat <<'EOF'\nfeat(mender): a new session\n\nbody\nEOF\n)"`)
    ).toEqual({ kind: 'act', said: 'committed “a new session”' });
  });

  it('takes the message from the commit, not from a heredoc written before it', () => {
    expect(
      plainCommand(
        `python3 - <<'EOF'\nimport os\nEOF\ngit add a && git commit -qm "fix(yard): steps"`
      )
    ).toEqual({ kind: 'act', said: 'committed “steps”' });
  });
});

describe('doingNow', () => {
  it('says the step in the present tense with the thing it is about', () => {
    expect(doingNow({ tool: 'execute-tool-call', did: 'pnpm test', why: 'run the yard tests' })).toBe(
      'running the yard tests'
    );
    expect(doingNow({ tool: 'execute-tool-call', did: 'git commit -m "x"', why: 'commit the fix' })).toBe(
      'committing the fix'
    );
    expect(doingNow({ tool: 'execute-tool-call', did: 'pnpm run build' })).toBe('building the app');
    expect(doingNow({ tool: 'modify-file-tool-call', did: 'changed src/yard/from.ts' })).toBe(
      'changing from.ts'
    );
    expect(doingNow({ tool: 'web-fetch-tool-call', did: 'read https://www.github.com/a' })).toBe(
      'reading a page on github.com'
    );
  });
});
