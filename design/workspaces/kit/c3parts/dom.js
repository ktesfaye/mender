  // ---------- DOM overlays
  const stage = document.getElementById('stage');
  const css = (x) => x * S;
  function dom(html, x, y, cls, style) { const d = document.createElement('div'); d.className = 'ov ' + (cls || ''); d.innerHTML = html; d.style.left = css(x) + 'px'; d.style.top = css(y) + 'px'; if (style) d.style.cssText += style; stage.appendChild(d); return d; }
  T.forEach((t) => {
    const x = 140; let ymin = 1e9; for (let xx = 140; xx <= 400; xx += 6) ymin = Math.min(ymin, yc(t, xx)); const yb = ymin - 7;
    const dim = t.mode === 'done' ? 'dim' : '';
    const lab = dom(`<div class="l1"><span class="k">${t.key}</span><span class="tt">${t.title}</span></div><div class="l2">${t.phrase}${t.time ? ' · ' + t.time : ''}</div>`, x, yb, 'lab ' + dim);
    lab.style.transform = 'translateY(-100%)'; if (t.mode === 'ask') lab.classList.add('needs'); t.lab = lab; lab.dataset.key = t.key;
  });
  { const fy = Math.min(462, laneBot + 40); const nm = PL.names;
    [[COLS.dev, nm.dev], [COLS.test + 8, nm.test], [COLS.mr + 2, nm.mr], [COLS.review, nm.review], [WALLX + 26, nm.merged]].forEach(([x, s]) => dom(`<span>${s}</span>`, x, fy, 'stg', 'transform:translateX(-50%)')); }
  dom(`<span class="gold hand2">hand it more tickets</span>`, hubX + 68, stubY + 1, 'stubl', 'transform:translateY(-50%)');
  window.__T = T; window.__S = { yc, XS, WALLX, TW, hubX, hubY, sp, stubY, beacons, COLS, S };
  window.draw(1200);
  { let last = 0; const loop = (t) => { if (!window.FREEZE && t - last > 120) { last = t; window.draw(t + 1200); } requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  if (window.afterInit) window.afterInit(T, window.__S);
  document.body.dataset.ready = '1';
})().catch((e) => { document.body.dataset.err = String(e && e.stack || e); document.body.dataset.ready = 'err'; });
