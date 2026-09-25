import { describe, expect, it } from 'vitest';
import { parseEnvLines } from './env-lines';

describe('parseEnvLines', () => {
  it('reads NAME=value lines, skipping blanks, comments and bad names', () => {
    expect(
      parseEnvLines(['FOO=bar', '', '# a note', 'BAD NAME=x', 'ONLY_NAME', 'BAZ=a=b'].join('\n'))
    ).toEqual({ FOO: 'bar', BAZ: 'a=b' });
  });
});
