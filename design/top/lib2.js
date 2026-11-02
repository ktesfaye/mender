// Pixel-art helpers for the top-band concepts. All coordinates are art pixels; S css px each.
const S = 2;
const W = 900, H = 90;
const C = {
  ink: '#1c120b', dark: '#3e2716', mid: '#6b4427', wood: '#8f5f36', light: '#b5844f', hi: '#d4a86c',
  pale: '#c8a272', paleHi: '#e0bf8a', paleDk: '#9c7548',
  gold: '#e9b84f', goldHi: '#ffd982', goldDk: '#a8742a',
  iron: '#2a2a30', ironHi: '#55555e', grass: '#3d5a2a', grassHi: '#5f8236', dirt: '#4a3420', dirtHi: '#6a4b2d',
  stone: '#5b5650', stoneHi: '#857e74', stoneDk: '#36322e',
};
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function makeCanvas(parent, z = 1) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  c.style.cssText = `position:absolute;left:0;top:0;width:${W * S}px;height:${H * S}px;image-rendering:pixelated;z-index:${z}`;
  parent.appendChild(c);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return g;
}
function px(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(x | 0, y | 0, w | 0, h | 0); }

// A plank, optionally pointed at one end ('l' or 'r'), in a tone: 'wood' | 'pale' | 'gold' | 'grey'
function tones(t) {
  if (t === 'pale') return [C.paleDk, C.pale, C.paleHi];
  if (t === 'gold') return [C.goldDk, C.gold, C.goldHi];
  if (t === 'grey') return ['#4a4440', '#6a625a', '#837a70'];
  return [C.mid, C.wood, C.light];
}
function plank(g, x, y, w, h, opt = {}) {
  const [dk, md, hi] = tones(opt.tone || 'wood');
  const point = opt.point || null, r = rng(opt.seed || (x * 31 + y * 7 + w));
  const tip = point ? Math.ceil(h / 2) : 0;
  const rowSpan = (j) => {
    // horizontal extent of row j (0..h-1)
    const d = Math.abs(j - (h - 1) / 2);
    const cut = point ? tip - Math.round(d) : 0;
    let x0 = x, x1 = x + w;
    if (point === 'r') x1 = x + w - tip + cut;
    if (point === 'l') x0 = x + tip - cut;
    return [x0, x1];
  };
  // shadow
  for (let j = 0; j < h; j++) { const [a, b] = rowSpan(j); px(g, a + 1, y + j + 2, b - a, 1, 'rgba(0,0,0,.35)'); }
  for (let j = 0; j < h; j++) {
    const [a, b] = rowSpan(j);
    px(g, a - 1, y + j, b - a + 2, 1, C.ink);
    px(g, a, y + j, b - a, 1, md);
  }
  px(g, rowSpan(0)[0], y - 1, rowSpan(0)[1] - rowSpan(0)[0], 1, C.ink);
  px(g, rowSpan(h - 1)[0], y + h, rowSpan(h - 1)[1] - rowSpan(h - 1)[0], 1, C.ink);
  // top light, bottom dark
  { const [a, b] = rowSpan(0); px(g, a, y, b - a, 1, hi); }
  { const [a, b] = rowSpan(h - 1); px(g, a, y + h - 1, b - a, 1, dk); }
  // grain
  for (let j = 2; j < h - 2; j += 3 + (r() * 3 | 0)) {
    const [a, b] = rowSpan(j);
    let xx = a + 2 + (r() * 6 | 0);
    while (xx < b - 3) {
      const len = 4 + (r() * 14 | 0);
      g.globalAlpha = 0.55; px(g, xx, y + j, Math.min(len, b - 2 - xx), 1, dk); g.globalAlpha = 1;
      xx += len + 3 + (r() * 10 | 0);
    }
  }
  // knot
  if (w > 30) { const kx = x + 8 + (r() * (w - 20) | 0), ky = y + 2 + (r() * (h - 5) | 0); px(g, kx, ky, 2, 1, dk); px(g, kx, ky + 1, 1, 1, dk); }
  // nails
  if (opt.nails !== false) {
    const ny = y + Math.floor(h / 2) - 1;
    const nx = point === 'r' ? x + 2 : point === 'l' ? x + w - 4 : null;
    const list = nx !== null ? [nx] : [x + 2, x + w - 4];
    for (const n of list) { px(g, n, ny, 2, 2, C.ink); px(g, n, ny, 1, 1, C.ironHi); }
  }
}
function post(g, x, y, h, w = 5) {
  px(g, x - 1, y - 1, w + 2, h + 1, C.ink);
  px(g, x, y, w, h, C.wood);
  px(g, x, y, 1, h, C.light);
  px(g, x + w - 1, y, 1, h, C.mid);
  const r = rng(x * 13 + h);
  for (let j = y + 3; j < y + h - 2; j += 3 + (r() * 5 | 0)) px(g, x + 2, j, 1, 2 + (r() * 3 | 0), C.mid);
  // cap
  px(g, x - 1, y - 2, w + 2, 2, C.ink); px(g, x, y - 1, w, 1, C.hi);
}
function chain(g, x, y, len) { for (let j = 0; j < len; j++) px(g, x, y + j, 1, 1, j % 2 ? C.ironHi : C.iron); }
function rope(g, x, y, len) { for (let j = 0; j < len; j++) px(g, x + (j % 3 === 2 ? 1 : 0), y + j, 1, 1, j % 2 ? '#a08060' : '#6b5038'); }
function lantern(g, x, y, lit = '#ffb347') {
  // 7 wide, 10 tall incl. hook
  px(g, x + 3, y, 1, 1, C.iron);
  px(g, x + 2, y + 1, 3, 1, C.iron);
  px(g, x + 1, y + 2, 5, 1, C.ink);
  px(g, x, y + 3, 7, 6, C.ink);
  px(g, x + 1, y + 3, 5, 5, lit);
  px(g, x + 2, y + 4, 3, 3, '#fff2c0');
  px(g, x + 3, y + 3, 1, 5, C.ink);
  px(g, x + 1, y + 9, 5, 1, C.ink);
}
function lanternDark(g, x, y) { lantern(g, x, y, '#3a3028'); px(g, x + 2, y + 4, 3, 3, '#4a3e32'); px(g, x + 3, y + 3, 1, 5, C.ink); }
function house(g, x, y, col = C.ink) {
  // 11x8 outline: a pitched roof over walls, a door
  const m = ['....#....', '...#.#...', '..#...#..', '.#.....#.', '#########', '.#.....#.', '.#.##..#.', '.#.##..#.', '.#######.'];
  m.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === '#') px(g, x + i, y + j - 1, 1, 1, col); }));
  return;
  // 7x6 little house
  px(g, x + 3, y, 1, 1, col); px(g, x + 2, y + 1, 3, 1, col); px(g, x + 1, y + 2, 5, 1, col); px(g, x, y + 3, 7, 1, col);
  px(g, x + 1, y + 4, 5, 2, col); px(g, x + 3, y + 5, 1, 1, 'rgba(0,0,0,0)');
}
function tuft(g, x, y) { px(g, x, y - 1, 1, 1, C.grassHi); px(g, x + 1, y - 2, 1, 2, C.grass); px(g, x + 2, y - 1, 1, 1, C.grassHi); px(g, x + 3, y - 2, 1, 1, C.grass); }
function stone(g, x, y, w = 5, h = 3) {
  px(g, x, y - h, w, h, C.stone); px(g, x + 1, y - h - 1, w - 2, 1, C.stone);
  px(g, x + 1, y - h, w - 2, 1, C.stoneHi); px(g, x, y - 1, w, 1, C.stoneDk);
  px(g, x - 1, y - h, 1, h, C.ink); px(g, x + w, y - h, 1, h, C.ink); px(g, x, y - h - 1, 1, 1, C.ink); px(g, x + w - 1, y - h - 1, 1, 1, C.ink); px(g, x + 1, y - h - 2, w - 2, 1, C.ink);
}

// A soft light pooled on the scene (css, not pixel art)
function glow(parent, cx, cy, r, col, a = 0.5) {
  const d = document.createElement('div');
  d.style.cssText = `position:absolute;left:${(cx - r) * S}px;top:${(cy - r) * S}px;width:${2 * r * S}px;height:${2 * r * S}px;border-radius:50%;background:radial-gradient(circle, ${col} 0%, transparent 70%);opacity:${a};mix-blend-mode:screen;pointer-events:none;z-index:2`;
  parent.appendChild(d);
}
// Text placed in art coordinates
function txt(parent, x, y, s, cls, style = '') {
  const d = document.createElement('div');
  d.className = cls;
  d.style.cssText = `position:absolute;left:${x * S}px;top:${y * S}px;white-space:nowrap;z-index:5;${style}`;
  d.innerHTML = s;
  parent.appendChild(d);
  return d;
}

// Text centred vertically on a plank of height h
function label(parent, x, y, h, s, cls, style = '') {
  return txt(parent, x, y, s, cls, `height:${h * S}px;line-height:${h * S}px;${style}`);
}
function bracket(g, x, y, len, dir = 1) {
  // iron arm sticking out from a post, with a little curl
  for (let i = 0; i < len; i++) px(g, x + i * dir, y, 1, 1, C.iron);
  px(g, x + (len - 1) * dir, y + 1, 1, 1, C.iron);
  px(g, x + 1 * dir, y + 1, 1, 2, C.iron); px(g, x + 2 * dir, y + 3, 1, 1, C.iron);
  for (let i = 2; i < len - 1; i++) if (i % 3 === 0) px(g, x + i * dir, y - 1, 1, 1, C.ironHi);
}
