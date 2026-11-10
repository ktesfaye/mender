import { describe, expect, it } from 'vitest';
import { stuckOf, type Pulse } from './stuck';

const run = (id: string, did: string, wrong = true) => ({
  id,
  did,
  tool: 'execute-tool-call',
  wrong,
  running: false,
});
const edit = (id: string) => ({
  id,
  did: 'changed a.ts',
  tool: 'modify-file-tool-call',
  running: false,
});

const pulse = (deeds: Pulse['deeds'], over: Partial<Pulse> = {}): Pulse => ({
  deeds,
  startedAt: () => undefined,
  planDone: 0,
  movedAt: 1_000_000,
  progressAt: 1_000_000,
  since: 1_000_000,
  outStanding: 0,
  now: 1_000_000,
  ...over,
});

describe('stuckOf', () => {
  it('calls the same failing command with nothing changed between a loop', () => {
    const deeds = [1, 2, 3].map((n) => run(`r${n}`, `pnpm test (in ${n}ms)`));
    expect(stuckOf(pulse(deeds))).toMatchObject({ kind: 'circling', times: 3 });
  });

  it('does not call a rerun after an edit a loop', () => {
    const deeds = [
      run('a', 'pnpm test'),
      edit('e'),
      run('b', 'pnpm test'),
      edit('f'),
      run('c', 'pnpm test'),
    ];
    expect(stuckOf(pulse(deeds))).toBeNull();
  });

  it('does not call a step that is still running quiet', () => {
    const deeds = [{ ...run('a', 'pnpm build', false), running: true }];
    expect(stuckOf(pulse(deeds, { now: 1_000_000 + 12 * 60_000 }))).toBeNull();
  });

  it('calls a foreground step that never came back stuck', () => {
    const deeds = [{ ...run('a', 'pnpm build', false), running: true }];
    expect(
      stuckOf(pulse(deeds, { startedAt: () => 1_000_000, now: 1_000_000 + 21 * 60_000 }))
    ).toMatchObject({ kind: 'silent' });
  });

  it('calls a long busy stretch with no edit or tick idle hands', () => {
    const deeds = Array.from({ length: 12 }, (_, n) => run(`r${n}`, `grep ${n}`, false));
    expect(
      stuckOf(pulse(deeds, { movedAt: 1_000_000 + 26 * 60_000, now: 1_000_000 + 26 * 60_000 }))
    ).toMatchObject({ kind: 'idle-hands' });
  });
});
