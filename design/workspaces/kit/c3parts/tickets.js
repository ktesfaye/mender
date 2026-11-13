  const post = [];
  const PL = window.PLACES;
  T.forEach((t) => {
    const yy0 = (x) => Math.round(yc(t, x));
    t.pl = {};
    const mkp = (k, fn, o) => { const x = COLS[k], y = yy0(x) - 6; t.pl[k] = { x, y, o }; post.push({ z: y, f: (c) => PL[fn](c, x, y, o) }); };
    mkp('dev', 'workshop', { lit: t.stage >= 1, active: t.stage === 1 });
    mkp('test', 'proving', { lit: t.stage === 2, visited: t.stage >= 2, shots: t.shots || 0 });
    mkp('mr', 'post', { lit: t.stage >= 3, active: t.stage === 3 });
    mkp('review', 'review', t.stage === 4 ? { ci: t.ci, appr: t.appr, comments: t.comments, lit: true } : { lit: t.stage >= 4 });
    const fxs = { 1: COLS.dev - 16, 2: COLS.test - 16, 3: COLS.mr - 16, 4: COLS.review - 17 };
    const mode = t.mode;
    if (mode === 'work' || mode === 'wait' || mode === 'ask') {
      const x = fxs[t.stage], yy = yy0(x) + 2; t.fig = [x, yy];
      post.push({ z: yy, f: (c) => {
        person(c, t, x, yy, 'side', { flip: mode === 'ask' });
        if (mode === 'work' && t.stage === 1) spr(c, 'carry-hammer', x + 8, yy - 12, {});
        if (mode === 'work' && t.stage === 3) spr(c, 'carry-letter', x + 8, yy - 12, {});
      } });
    }
    if (mode === 'fix') {
      const x = COLS.review - 46, yy = yy0(x) + 2; t.fig = [x, yy];
      post.push({ z: yy, f: (c) => { person(c, t, x, yy, 'walk', { f: 2, flip: true }); spr(c, 'carry-hammer', x - 8, yy - 12, {}); } });
    }
    if (mode === 'stuck') {
      const cx = COLS.dev - 8, cy = yy0(cx) + 1, rx = 21, ry = 9;
      for (let a2 = 0; a2 < 720; a2++) { const th = a2 / 720 * Math.PI * 2; const px = Math.round(cx + Math.cos(th) * rx), py = Math.round(cy + Math.sin(th) * ry); if (bay(px, py) < 0.95) { a.fillStyle = '#c9a868'; FX(a, px, py, 1, 2); a.fillStyle = '#5a4630'; FX(a, px, py + 2, 1, 1); if (bay(px + 1, py) < 0.5) { a.fillStyle = '#a88652'; FX(a, px, py - 1, 1, 1); } } }
      t.loop = [cx, cy, rx, ry];
      const th = 2.2; const px = cx + Math.cos(th) * rx, py = cy + Math.sin(th) * ry; t.fig = [px, py + 1];
      post.push({ z: py + 1, f: (c) => person(c, t, px, py + 1, 'walk', { f: 1, flip: true }) });
      const sx = cx + 29, sy = cy + 3;
      post.push({ z: sy + 3, f: (c) => { c.fillStyle = '#4a4842'; FX(c, sx - 6, sy - 6, 13, 9); c.fillStyle = '#8c8878'; FX(c, sx - 5, sy - 6, 11, 1); c.fillStyle = '#6e6a5e'; FX(c, sx - 6, sy - 5, 1, 7); c.fillStyle = '#e8e2d0'; for (let q = 0; q < 5; q++) FX(c, sx - 4 + q * 2, sy - 4, 1, 5); c.fillRect(sx - 5, sy - 2, 10, 1); FX(c, sx + 5, sy - 4, 1, 5); } });
    }
    if (mode === 'setup') {
      const x = 100, yy = yy0(x) + 9; t.fig = [x, yy];
      post.push({ z: yy, f: (c) => { spr(c, 'cart-1', x + 17, yy, {}); person(c, t, x, yy, 'side', {}); spr(c, 'carry-crate', x + 6, yy - 12, {}); c.fillStyle = '#2a1c12'; FX(c, x - 14, yy - 18, 2, 20); c.fillStyle = '#7a5a36'; FX(c, x - 14, yy - 17, 1, 19); } });
    }
    if (mode === 'done') {
      const x = WALLX + WB + 12, yy = yy0(WALLX) + 5; t.fig = [x, yy];
      post.push({ z: yy, f: (c) => person(c, t, x, yy, 'side', {}) });
    }
  });
