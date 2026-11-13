
window.afterInit = (T, S) => {
  const t = T.find((q) => q.key === 'INV-71990');
  const [cx, cy, rx, ry] = t.loop;
  const x0 = S.TW.x + 8, y0 = S.TW.y - 52, x1 = t.fig[0], y1 = t.fig[1] - 28;
  const sm = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
  window.dimFn = (x, y) => {
    let d = Math.hypot((x - cx) / 150, (y - cy) / 56);
    const vx = x1 - x0, vy = y1 - y0; const u = Math.max(0, Math.min(1, ((x - x0) * vx + (y - y0) * vy) / (vx * vx + vy * vy)));
    const bd = Math.hypot(x - (x0 + vx * u), y - (y0 + vy * u)) / 9;
    d = Math.min(d, bd, Math.hypot(x - S.TW.x, y - (S.TW.y - 30)) / 46);
    return 0.4 + 0.6 * (1 - sm((d - 0.7) / 0.8));
  };
  T.forEach((q) => { if (q !== t) q.lab.style.opacity = 0.42; });
  t.lab.classList.add('pt');
  const card = document.createElement('div'); card.className = 'card ov';
  card.style.left = '1010px'; card.style.top = '500px'; card.style.width = '330px';
  card.innerHTML = `<div class="k">INV-71990 · STORY</div><h4>Dividend reinvest toggle</h4>
  <p>It has run the same failing test <span class="em">six times</span> in the last half hour, and is still on step 3 of 6.</p>
  <div class="nudge">“read the failure, stop rerunning it”</div>
  <p style="margin-top:4px;font-size:12.5px;color:rgba(239,227,204,.5)">the lead said so 3m ago, and is watching</p>`;
  document.getElementById('stage').appendChild(card);
  const tl = document.createElement('div'); tl.className = 'ov hand'; tl.style.left = ((cx + 25) * 2) + 'px'; tl.style.top = ((cy - ry - 10) * 2 - 4) + 'px'; tl.style.fontSize = '15px'; tl.style.color = '#e8e2d0'; tl.textContent = '× 6'; tl.style.zIndex = 4;
  document.getElementById('stage').appendChild(tl);
  window.extraEm = (e, time) => {
    for (let i = 0; i < 52; i++) { const u = i / 52; const x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u; if ((i + Math.floor(time / 90)) % 3) continue; e.fillStyle = `rgba(255,214,150,${0.25 + 0.6 * u})`; e.fillRect(Math.round(x), Math.round(y), 1, 1); }
  };
};
