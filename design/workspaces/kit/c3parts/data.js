  // ---------- data (scenario)
  const SC = window.SCN || '3';
  const LIB = {
    a: { key: 'INV-71924', title: 'Wash sale info under each loss', out: 'a' },
    b: { key: 'INV-71880', title: 'Cost basis export drops split-day lots', out: 'b' },
    f: { key: 'INV-72011', title: 'Q4 tax doc banner copy', out: 'h' },
    c: { key: 'INV-71990', title: 'Dividend reinvest toggle', out: 'd' },
    g: { key: 'INV-71702', title: 'Flaky e2e on statements download', out: 'e' },
    d: { key: 'INV-72033', title: 'Holdings CSV column order', out: 'f' },
    e: { key: 'INV-72040', title: 'Gift lot holding period', out: 'g' },
    h: { key: 'INV-71650', title: 'Rename Realized tab', out: 'b' },
  };
  const mk = (id, o) => Object.assign({ id }, LIB[id], o);
  const flight = (ov = {}) => [
    mk('a', Object.assign({ stage: 1, mode: 'work', phrase: 'writing the reason line under each loss', time: '22m' }, ov.a)),
    mk('b', Object.assign({ stage: 1, mode: 'work', phrase: 'reading how splits are stored', time: '18m' }, ov.b)),
    mk('f', Object.assign({ stage: 4, mode: 'wait', ci: 'fail', appr: [1, 2], comments: 0, phrase: 'the pipeline failed on a lint rule', time: '' }, ov.f)),
    mk('c', Object.assign({ stage: 1, mode: 'stuck', phrase: 'the same failing test, six times', time: '41m' }, ov.c)),
    mk('g', Object.assign({ stage: 4, mode: 'wait', ci: 'ok', appr: [1, 2], comments: 2, phrase: 'one approval, two comments to answer', time: '' }, ov.g)),
    mk('d', Object.assign({ stage: 2, mode: 'work', phrase: 'running it on the Pixel 9', time: '6m' }, ov.d)),
    mk('e', Object.assign({ stage: 3, mode: 'work', phrase: 'opening the merge request', time: '2m' }, ov.e)),
    mk('h', Object.assign({ stage: 5, mode: 'done', phrase: 'merged an hour ago', time: '' }, ov.h)),
  ];
  let T;
  if (SC === '2') T = [
    mk('a', { stage: 1, mode: 'work', phrase: 'just set off, reading the loss rows', time: '1m' }),
    mk('b', { stage: 1, mode: 'work', phrase: 'just set off', time: '40s' }),
    mk('c', { stage: 0, mode: 'setup', phrase: 'cutting the workspace', time: '11s' }),
    mk('d', { stage: 0, mode: 'setup', phrase: 'cutting the workspace', time: '6s' }),
    mk('e', { stage: 0, mode: 'setup', phrase: 'cutting the workspace', time: '2s' }),
  ];
  else if (SC === '4') T = flight({ f: { mode: 'fix', phrase: 'fixing the lint rule, then pushing again' } });
  else if (SC === '5') T = flight({ f: { ci: 'run', phrase: 'waiting on the pipeline' }, b: { mode: 'ask', phrase: 'asked which price split-day lots take', time: '18m' } });
  else if (SC === '6') T = flight({ f: { ci: 'ok', phrase: 'pipeline passed, one approval' }, d: { shots: 3, phrase: 'three screens checked on the Pixel 9', time: '11m' } });
  else T = flight();
  const N = T.length;
  const sp = 39.4, hubX = 52, hubY = 298;
  const laneTop = hubY - (N - 1) * sp / 2, laneBot = laneTop + (N - 1) * sp;
  const stubY = Math.min(470, laneBot + 36);
  const XS = 236, XE = 606, WALLX = 616;
  T.forEach((t, i) => { t.i = i; t.y0 = laneTop + i * sp; t.ph = i * 0.42 + 0.6; });
  const AMP = Math.min(8, sp * 0.2);
  const yc = (t, x) => { const q = smooth((x - hubX) / (130 - hubX)); return lerp(hubY, t.y0, q) + AMP * Math.sin(x * 0.0125 + t.ph) * q * smooth((x - 250) / 160); };
  const COLS = { dev: 300, test: 392, mr: 478, review: 548 };
  const lights = [];
  const L = (x, y, r, c, k, fl) => lights.push({ x, y, r, c, k, fl: fl || 0 });
  const FR = (ms, n) => Math.floor((window.TT || 0) / ms) % n;

