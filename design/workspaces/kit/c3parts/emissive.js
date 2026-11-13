  // ---------- emissive layer (post-light)
  function flame(c, x, y, f) { spr(c, 'flame-' + (f & 3), x, y); }
  function emissive(time) {
    e.clearRect(0, 0, W, H);
    const f = Math.floor(time / 140);
    flame(e, hubX + 4, hubY - 2, f); flame(e, hubX + 1, hubY - 1, f + 1); flame(e, hubX + 8, hubY - 1, f + 2);
    e.fillStyle = '#ffd08a'; FX(e, TW.x + 7, TW.y - 53, 3, 3); e.fillStyle = '#fff2c8'; FX(e, TW.x + 8, TW.y - 52, 1, 1);
    e.fillStyle = '#ffb560'; FX(e, TW.x - 2, TW.y - 71, 3, 3);
    T.forEach((t) => {
      const P = t.pl;
      PL.workshopGlow(e, P.dev.x, P.dev.y, P.dev.o, time);
      PL.provingGlow(e, P.test.x, P.test.y, P.test.o, time);
      PL.postGlow(e, P.mr.x, P.mr.y, P.mr.o, time);
      PL.reviewGlow(e, P.review.x, P.review.y, P.review.o, time);
      if (!t.fig) return;
      if (['work', 'stuck', 'wait', 'ask', 'fix'].includes(t.mode)) {
        const dir = (t.mode === 'ask' || t.mode === 'fix') ? -1 : 1;
        const x = t.fig[0] + dir * 7, y = t.fig[1] - 13;
        e.fillStyle = '#2a1c12'; FX(e, x - 1, y - 2, 3, 1); FX(e, x - 1, y + 3, 3, 1);
        e.fillStyle = t.mode === 'stuck' ? '#e6a05a' : '#ffc070'; FX(e, x - 1, y - 1, 3, 4); e.fillStyle = '#fff2c8'; FX(e, x, y, 1, 2);
      }
      if (t.mode === 'ask') {
        const x = t.fig[0], y = t.fig[1]; const up = Math.floor(time / 260) % 2;
        e.fillStyle = '#2a1c12'; FX(e, x + 4, y - 25 - up * 2, 3, 6); e.fillStyle = '#e6b88c'; FX(e, x + 5, y - 26 - up * 2, 1, 3);
        e.fillStyle = '#ffa35a'; const qx = x + 1, qy = y - 36; FX(e, qx, qy, 3, 1); FX(e, qx + 2, qy + 1, 1, 2); FX(e, qx + 1, qy + 2, 1, 1); FX(e, qx + 1, qy + 4, 1, 1);
      }
    });
    beacons.forEach((b, bi) => {
      flame(e, b.x - 3, b.y - 14, f + bi); flame(e, b.x + 4, b.y - 14, f + bi + 2); flame(e, b.x, b.y - 15, f + bi + 1);
      for (let q = 0; q < 7; q++) { const ph = ((time / 40 + q * 37 + bi * 11) % 70); const yy = b.y - 28 - ph * 0.32; const xx = b.x + Math.sin(ph / 9 + q * 2) * 3 + (q - 3); e.fillStyle = `rgba(255,200,120,${1 - ph / 70})`; FX(e, xx, yy, 1, 1); }
    });
    for (let q = 0; q < 6; q++) { const ph = ((time / 50 + q * 41) % 60); e.fillStyle = `rgba(255,190,110,${1 - ph / 60})`; FX(e, hubX + 4 + Math.sin(ph / 7 + q) * 4, hubY - 14 - ph * 0.5, 1, 1); }
    T.forEach((t) => { if (t.mode === 'done') { const g = t.gate; for (let yy = g.top + 1; yy < g.top + g.dh; yy++) for (let xx = g.x0; xx < g.x0 + g.dw; xx++) { const tr = yy < g.top + 3 ? 3 - (yy - g.top) : 0; if (xx >= g.x0 + tr + 1 && xx < g.x0 + g.dw - tr - 1) { e.fillStyle = `rgba(255,${200 - (yy - g.top) * 2},120,.9)`; FX(e, xx, yy, 1, 1); } } } });
    [[WALLX + 31, 160], [WALLX + 31, 290], [WALLX + 31, 410]].forEach(([x, y]) => { e.fillStyle = '#ffd890'; FX(e, x - 1, y - 14, 4, 2); e.fillStyle = '#fff4d0'; FX(e, x, y - 14, 2, 1); });
    T.forEach((t) => { const gy = t.gate.top - 4; e.fillStyle = '#ffd890'; FX(e, WALLX + 1, gy, 3, 3); e.fillStyle = '#fff4d0'; FX(e, WALLX + 2, gy + 1, 1, 1); });
    const fr = rng(77); for (let q = 0; q < 12; q++) { const bx = 120 + fr() * 460, by = 130 + fr() * 340; const al = 0.5 + 0.5 * Math.sin(time / 600 + q * 2); e.fillStyle = `rgba(255,230,140,${al})`; FX(e, bx + Math.sin(time / 1400 + q) * 6, by + Math.cos(time / 1700 + q) * 4, 1, 1); }
    if (window.extraEm) window.extraEm(e, time, T);
    o.drawImage(emi, 0, 0);
  }
