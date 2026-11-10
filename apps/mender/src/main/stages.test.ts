import { describe, expect, it } from 'vitest';
import { evidenceOf, patternsFrom, stageOf } from './stages';

const patterns = patternsFrom();
const run = (did: string, wrong = false) => ({ tool: 'execute-tool-call', did, wrong });

describe('stages', () => {
  it('reads device, commit and merge-request commands off what was run, and looking around as nothing', () => {
    expect(evidenceOf(run('adb shell am start -n app/.Main'), patterns)).toBe('device');
    expect(evidenceOf(run('git commit -m "x"'), patterns)).toBe('commit');
    expect(evidenceOf(run('glab mr create --fill'), patterns)).toBe('mr-command');
    expect(evidenceOf(run('glab mr create --fill', true), patterns)).toBeNull();
    expect(evidenceOf(run('ls -la'), patterns)).toBeNull();
    expect(evidenceOf({ ...run('adb devices'), held: true }, patterns)).toBeNull();
  });

  it("puts a session back to developing when it edits after testing, and takes the host's word on the merge request", () => {
    expect(stageOf({ last: 'edit' }).stage).toBe('developing');
    expect(stageOf({ last: 'device' }).stage).toBe('testing');
    expect(stageOf({ last: 'mr-command' }).stage).toBe('opening-mr');
    expect(stageOf({ last: 'device', mr: { state: 'open' } }).stage).toBe('in-review');
    expect(stageOf({ last: 'edit', mr: { state: 'merged' } }).stage).toBe('merged');
    expect(
      stageOf({
        last: 'mr-command',
        openedByItsOwnWord: true,
        mr: { state: 'none', unknown: 'no token' },
      })
    ).toEqual({
      stage: 'in-review',
      onItsWord: true,
    });
    expect(stageOf({ last: 'mr-command', openedByItsOwnWord: true }).stage).toBe('opening-mr');
    expect(stageOf({ last: null }).stage).toBe('picked-up');
  });
});
