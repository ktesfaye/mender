  // ---------- lights
  const AMB = [0.34, 0.41, 0.62];
  lights.length = 0;
  L(TW.x, TW.y - 62, 52, [1.0, 0.7, 0.32], 0.95, 1);
  L(hubX + 4, hubY - 6, 70, [1.0, 0.62, 0.26], 1.05, 1);
  T.forEach((t) => {
    ['dev', 'test', 'mr', 'review'].forEach((k) => {
      const p = t.pl[k]; const o = p.o;
      const act = (k === 'dev' && o.active) || (k === 'mr' && o.active) || (k === 'test' && o.lit);
      if (o.lit || o.visited || (k === 'review' && o.ci)) L(p.x, p.y - 12, act ? 20 : 12, [1, 0.66, 0.3], act ? 0.7 : 0.3, act ? 1 : 0);
      if (k === 'test' && o.lit) L(p.x, p.y - 18, 16, [0.5, 0.72, 1], 0.55, 0);
      if (k === 'review' && o.ci === 'fail') L(p.x - 8, p.y - 13, 18, [1, 0.28, 0.2], 0.7, 1);
      if (k === 'review' && o.ci === 'ok') L(p.x - 8, p.y - 13, 12, [0.6, 0.9, 0.5], 0.3, 0);
    });
    if (!t.fig) return;
    if (t.mode === 'work' || t.mode === 'stuck' || t.mode === 'wait') L(t.fig[0] + 6, t.fig[1] - 14, 20, [1, 0.62, 0.28], 0.7, 1);
    if (t.mode === 'ask') L(t.fig[0] - 6, t.fig[1] - 14, 22, [1, 0.62, 0.28], 0.8, 1);
    if (t.mode === 'fix') L(t.fig[0] - 6, t.fig[1] - 14, 20, [1, 0.62, 0.28], 0.7, 1);
    if (t.mode === 'setup') L(t.fig[0] + 8, t.fig[1] - 14, 24, [1, 0.66, 0.34], 0.7, 1);
    if (t.mode === 'done') { L(WALLX + 6, yc(t, WALLX), 26, [1, 0.72, 0.4], 0.75, 0); L(t.fig[0], t.fig[1] - 12, 12, [1, 0.7, 0.4], 0.5, 0); }
  });
  beacons.forEach((b) => { const col = [1, 0.66, 0.26]; L(b.x, b.y - 14, 44, col, 1.0, 1); b.col = col; });
  T.forEach((t) => L(WALLX + 1, t.gate.top - 3, 15, [1, 0.72, 0.4], t.mode === 'done' ? 0.85 : 0.4, 0));
  [[WALLX + 31, 160], [WALLX + 31, 290], [WALLX + 31, 410]].forEach(([x, y]) => L(x, y - 12, 24, [1, 0.74, 0.44], 0.6, 0));

