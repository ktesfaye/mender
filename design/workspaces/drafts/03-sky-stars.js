const C = { work: '#ff9a4a', ask: '#ff6a24', done: '#9bd28a', broke: '#f2685e', idle: '#8ea2c4', moon: '#cfe3c6' };
const mix = (h, w, t) => { const p = (x) => parseInt(h.slice(x, x + 2), 16); const q = (a, b) => Math.round(a + (b - a) * t);
  return `rgb(${q(p(1), w[0])},${q(p(3), w[1])},${q(p(5), w[2])})`; };
const hex = (h, a) => { const p = (x) => parseInt(h.slice(x, x + 2), 16); return `rgba(${p(1)},${p(3)},${p(5)},${a})`; };

const WS = [
  { id: 'home', moon: true, x: 455, y: 64, k: 'home', t: 'invest-web' },
  { id: '72011', x: 560, y: 40, k: 'INV-72011', t: 'Tax doc banner', p: 'done', n: 1 },
  { id: '72040', forming: true, x: 665, y: 74, k: 'INV-72040 <span style="text-transform:none;letter-spacing:.02em;color:rgba(190,205,235,.6)">· 14s</span>', t: 'Gift lot holding period' },
  { id: '71990', x: 800, y: 40, k: 'INV-71990', t: 'Dividend reinvest toggle', p: 'work', n: 2 },
  { id: '71924', cur: true, x: 905, y: 60, k: 'INV-71924', t: 'Wash sale info', p: 'ask', n: 2 },
  { id: '71702', x: 1010, y: 40, k: 'INV-71702', t: 'Flaky statements e2e', p: 'broke', n: 1 },
  { id: '71880', x: 1110, y: 72, k: 'INV-71880', t: 'Cost basis export', p: 'ask', n: 1 },
  { id: 'spike', wander: true, x: 1190, y: 38, k: '', t: 'chart spike', p: 'idle', n: 1 },
];
const LINES = [['72011', '72040'], ['71990', '71924'], ['71924', '71702']];
const by = (id) => WS.find((w) => w.id === id);

function sprite(w) {
  const col = C[w.p] || C.idle;
  let R, cr, s = 3;
  if (w.cur) { R = 12; cr = 3; } else if (w.p === 'idle') { R = 4; cr = 0; s = 3; } else if (w.n >= 2) { R = 9; cr = 2; } else { R = 6; cr = 1; }
  const N = 2 * R + 1, cv = document.createElement('canvas'); cv.width = cv.height = N * s; cv.style.width = cv.style.height = N * s + 'px';
  const g = cv.getContext('2d');
  const px = (dx, dy, c, a = 1) => { g.globalAlpha = a; g.fillStyle = c; g.fillRect((R + dx) * s, (R + dy) * s, s, s); };
  const hot = mix(col.length === 7 ? col : '#ffffff', [255, 250, 235], 0.78);
  if (w.p === 'idle') {
    px(0, 0, mix(col, [255, 255, 255], .35), .9);
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) px(a, b, col, .45);
    px(2, 0, col, .2); px(-2, 0, col, .2); px(0, 2, col, .2); px(0, -2, col, .2);
    return cv;
  }
  for (let i = 1; i <= R; i++) {
    const a = Math.pow(1 - i / (R + 1), 1.15) * 0.95 + .05;
    let dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    if (w.p === 'broke') { dirs = dirs.filter((d, j) => !(j === 1 && i > 2)); }
    for (const [a1, b1] of dirs) {
      let L = R; if (w.p === 'broke' && a1 === 1) L = Math.round(R * .55);
      if (i <= L) px(a1 * i, b1 * i, col, a * (w.p === 'broke' && i % 3 === 0 ? .4 : 1));
    }
    if ((w.cur || w.p === 'ask') && i <= Math.round(R * .55)) for (const [a1, b1] of [[1, 1], [-1, -1], [1, -1], [-1, 1]]) px(a1 * i, b1 * i, col, a * .6);
  }
  for (let dx = -cr; dx <= cr; dx++) for (let dy = -cr; dy <= cr; dy++) if (Math.abs(dx) + Math.abs(dy) <= cr) px(dx, dy, hot, 1);
  if (cr >= 2) px(0, 0, '#fffdf4', 1);
  if (cr === 1) px(0, 0, '#fffdf4', 1);
  if (cr === 0) px(0, 0, '#fffdf4', 1);
  return cv;
}
function moon() {
  const r = 9, s = 3, N = 2 * r + 3, cv = document.createElement('canvas'); cv.width = cv.height = N * s; cv.style.width = cv.style.height = N * s + 'px';
  const g = cv.getContext('2d');
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    if (x * x + y * y > r * r + 1) continue;
    const lit = (x * -0.6 + y * -0.5) / r; const t = 0.5 + lit * 0.5;
    g.fillStyle = mix('#7a8fa0', [240, 247, 240], Math.max(0, Math.min(1, t)));
    g.fillRect((x + r + 1) * s, (y + r + 1) * s, s, s);
  }
  g.fillStyle = 'rgba(70,95,78,.55)';
  for (const [x, y, w] of [[-3, -2, 2], [2, 1, 3], [-2, 4, 2], [4, -4, 1]]) g.fillRect((x + r + 1) * s, (y + r + 1) * s, w * s, Math.max(1, w - 1) * s);
  return cv;
}
function formingStar(x, y) {
  const el = document.createElement('div'); el.className = 'star'; el.style.left = x + 'px'; el.style.top = y + 'px';
  const h = document.createElement('div'); h.className = 'halo'; h.style.cssText = 'width:84px;height:84px;background:radial-gradient(circle,rgba(190,205,235,.26),rgba(190,205,235,.07) 50%,transparent 72%)'; el.appendChild(h);
  const cv = document.createElement('canvas'); cv.width = cv.height = 120; cv.style.width = cv.style.height = '60px'; const g = cv.getContext('2d'); g.scale(2, 2);
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 26; i++) {
    const a = rnd() * 6.283, d = 6 + rnd() * 22, fx = 30 + Math.cos(a) * d, fy = 30 + Math.sin(a) * d;
    const al = .25 + (1 - d / 28) * .7;
    g.fillStyle = `rgba(214,226,248,${al})`; const sz = d < 14 ? 2 : 1.5; g.fillRect(Math.round(fx), Math.round(fy), sz, sz);
    if (d > 12 && i % 3 === 0) { g.fillStyle = `rgba(214,226,248,${al * .35})`; g.fillRect(Math.round(30 + Math.cos(a) * (d + 3)), Math.round(30 + Math.sin(a) * (d + 3)), 1, 1); }
  }
  g.fillStyle = 'rgba(255,250,235,.85)'; g.fillRect(29, 29, 2, 2); g.fillStyle = 'rgba(255,250,235,.45)'; g.fillRect(28, 29, 1, 2); g.fillRect(31, 29, 1, 2); g.fillRect(29, 28, 2, 1); g.fillRect(29, 31, 2, 1);
  cv.style.imageRendering = 'pixelated'; el.appendChild(cv); return el;
}

const host = document.getElementById('stars');
for (const w of WS) {
  let el;
  if (w.forming) el = formingStar(w.x, w.y);
  else {
    el = document.createElement('div'); el.className = 'star'; el.style.left = w.x + 'px'; el.style.top = w.y + 'px';
    const col = w.moon ? C.moon : C[w.p];
    const hov = window.HOVER && w.id === '71880';
    const size = w.moon ? 130 : w.cur ? 230 : w.p === 'idle' ? 36 : (w.n >= 2 ? 110 : 76) * (hov ? 1.5 : 1);
    const a = w.moon ? .22 : w.cur ? .55 : w.p === 'idle' ? .14 : hov ? .5 : .38;
    const h = document.createElement('div'); h.className = 'halo';
    h.style.cssText = `width:${size}px;height:${size}px;background:radial-gradient(circle,${hex(col, a)},${hex(col, a * .32)} 45%,transparent 70%)`;
    el.appendChild(h);
    if (w.cur) { const h2 = document.createElement('div'); h2.className = 'halo'; h2.style.cssText = `width:60px;height:60px;background:radial-gradient(circle,rgba(255,235,205,.5),transparent 70%)`; el.appendChild(h2); }
    el.appendChild(w.moon ? moon() : sprite(w));
  }
  host.appendChild(el);
  const L = document.createElement('div'); L.className = 'lbl' + (w.cur ? ' cur' : '') + (w.wander ? ' wd' : '') + (window.HOVER && w.id === '71880' ? ' hov' : '');
  const off = w.moon ? 34 : w.cur ? 42 : w.forming ? 34 : 24;
  L.style.left = w.x + 'px'; L.style.top = (w.y + off) + 'px';
  L.innerHTML = (w.k ? `<div class="k">${w.k}</div>` : '') + `<div class="t">${w.t}</div>`;
  host.appendChild(L);
}
// plus: a faint empty point
{ const d = document.createElement('div'); d.style.cssText = 'position:absolute;left:1236px;top:100px;width:22px;height:22px;transform:translate(-50%,-50%);display:grid;place-items:center;opacity:.5'; d.innerHTML = '<i data-px="plus" data-s="18" data-c="#f2c66d"></i>'; host.appendChild(d);
  const g = document.createElement('div'); g.style.cssText = 'position:absolute;left:1236px;top:100px;width:44px;height:44px;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,rgba(242,198,109,.12),transparent 70%)'; host.appendChild(g);
  document.querySelectorAll('#stars i[data-px]').forEach((el) => { el.innerHTML = pxIcon(el.dataset.px, el.dataset.c, +el.dataset.s); }); }
// groups
for (const [x, t, n] of [[612, 'to do'], [905, 'in progress'], [1108, 'in review'], [1205, 'wandering', 1]]) {
  const g = document.createElement('div'); g.className = 'grp' + (n ? ' n' : ''); g.style.left = x + 'px'; g.innerHTML = `<span class="pix" style="font-family:Silkscreen;font-size:9px;letter-spacing:.14em;text-transform:uppercase">${t}</span>`; host.appendChild(g); }
// constellation lines
{ const svg = document.getElementById('lines'); let s = '';
  for (const [a, b] of LINES) { const A = by(a), B = by(b); const forming = a === '72040' || b === '72040';
    s += `<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" stroke="rgba(190,208,240,${forming ? .2 : .3})" stroke-width="1" ${forming ? 'stroke-dasharray="2 4"' : ''}/>`; }
  // wanderer's drifting trail
  s += `<path d="M1262 112 C1250 80 1215 54 1190 38" fill="none" stroke="rgba(190,208,240,.18)" stroke-width="1" stroke-dasharray="1 5"/>`;
  svg.innerHTML = s; }
// dust
{ const cv = document.getElementById('dust'); const g = cv.getContext('2d'); let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 150; i++) { const x = Math.floor(rnd() * 1262) * 2, y = Math.floor(rnd() * 150) * 2; const a = .06 + rnd() * .3;
    g.fillStyle = rnd() > .85 ? `rgba(255,236,210,${a})` : `rgba(200,215,245,${a})`; const z = rnd() > .93 ? 4 : 2; g.fillRect(x, y, z, z); } }
