import { describe, expect, it } from 'vitest';
import { plainCommand } from './deeds';

describe('plainCommand', () => {
  it('reads past setup to what the command did', () => {
    expect(
      plainCommand('S=/private/tmp/x/scratchpad; cd /repo && git add a.ts && git commit -q -m "fix(yard): the rail breathes"')
    ).toEqual({ kind: 'act', said: 'committed “the rail breathes”' });
    expect(
      plainCommand(`git commit -m "$(cat <<'EOF'\nfeat(mender): a new session\n\nbody\nEOF\n)"`)
    ).toEqual({ kind: 'act', said: 'committed “a new session”' });
  });
});
