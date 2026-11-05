import { describe, expect, it } from 'vitest';
import { elapsed, strays, type Proc } from './strays';

const HOUR = 3600 * 1000;
const p = (pid: number, ppid: number, over: Partial<Proc> = {}): Proc => ({
  pid,
  ppid,
  uid: 501,
  ageMs: 2 * HOUR,
  command: 'node vite',
  fromClaude: true,
  ...over,
});

describe('strays', () => {
  it('takes down an old orphan from Claude with everything under it, and nothing else', () => {
    const procs = [
      p(10, 1),
      p(11, 10),
      p(12, 11),
      p(20, 1, { fromClaude: false }),
      p(30, 1, { ageMs: HOUR / 2 }),
      p(40, 1, { command: '/Applications/Mender.app/Contents/MacOS/Mender' }),
      p(50, 1, { command: 'tmux new-session -d' }),
      p(60, 1, { command: '/Users/k/.local/bin/claude --resume x' }),
      p(70, 1, { uid: 0 }),
      p(80, 99),
      p(90, 1, { command: '/Users/k/Applications/Juice.app/Contents/MacOS/Juice' }),
      p(100, 1, { command: 'adb -L tcp:5037 fork-server' }),
      p(110, 1, { fromClaude: false, command: 'npm exec vite' }),
      p(111, 110),
      p(120, 1, {
        command: '/x/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron .',
      }),
      p(130, 1, {
        command: '/x/Python.framework/Resources/Python.app/Contents/MacOS/Python -m http.server',
      }),
    ];
    expect(strays(procs, 501, 999).sort((a, b) => a - b)).toEqual([10, 11, 12, 110, 111, 120, 130]);
  });

  it('reads ps elapsed time', () => {
    expect(elapsed('05-09:51:58')).toBe((5 * 86400 + 9 * 3600 + 51 * 60 + 58) * 1000);
    expect(elapsed('03:25')).toBe(205 * 1000);
  });
});
