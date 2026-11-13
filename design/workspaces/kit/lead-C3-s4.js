window.afterInit = (T, S) => {
  const t = T.find((q) => q.key === 'INV-72011');
  const x0 = S.TW.x + 8, y0 = S.TW.y - 52, x1 = t.fig[0], y1 = t.fig[1] - 28;
  const sm = (u) => Math.max(0, Math.min(1, u)) ** 2 * (3 - 2 * Math.max(0, Math.min(1, u)));
  window.dimFn = (x, y) => {
    const vx = x1 - x0, vy = y1 - y0; const u = Math.max(0, Math.min(1, ((x - x0) * vx + (y - y0) * vy) / (vx * vx + vy * vy)));
    const bd = Math.hypot(x - (x0 + vx * u), y - (y0 + vy * u)) / 10;
    const d = Math.min(bd, Math.hypot((x - 420) / 170, (y - t.fig[1]) / 30), Math.hypot(x - S.TW.x, y - (S.TW.y - 30)) / 46);
    return 0.6 + 0.4 * (1 - sm((d - 0.8) / 0.9));
  };
  window.extraEm = (e, time) => {
    for (let i = 0; i < 56; i++) { const u = i / 56; const x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u; if ((i + Math.floor(time / 90)) % 3) continue; e.fillStyle = `rgba(255,214,150,${0.2 + 0.5 * u})`; e.fillRect(Math.round(x), Math.round(y), 1, 1); }
  };
};
