(async function () {
  const MODE = window.MODE || 'rest';
  const MANY = MODE === 'many';
  const S = 2, W = 740, H = 510;
  const GOLD = '#f2c66d', EMBER = '#ff9a4a', MOSS = '#9bd28a', SORE = '#f08a72';

  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const R = rng(42);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
  const bay = (x, y) => BAY[(y & 3) * 4 + (x & 3)];

  // ---------- assets
  const names = ['props_props_campfire_01', 'props_props_cart_01_e', 'props_props_lantern_01_on', 'props_props_hay_pile_01', 'props_props_crate_01_a', 'props_props_barrel_01', 'plants_plant_bush_03_a', 'plants_plant_bush_07_a', 'props_props_bench_02_h', 'props_props_sign_icon_01'];
  const folk = ['front-0', 'back-0', 'side-0', 'sit-0', 'carry-scroll', 'carry-crate', 'carry-hammer', 'carry-letter', 'carry-basket', 'cart-0', 'cart-1', 'horse-graze', 'dog-sit', 'sheep-graze', 'firefly', 'ember', 'crow-hop-0', 'dog-walk-0', 'dog-walk-1'];
  for (const k of 'abcdefgh') { folk.push(`town-${k}-front-0`, `town-${k}-back-0`, `town-${k}-side-0`); for (let i = 0; i < 4; i++) folk.push(`town-${k}-walk-side-${i}`); }
  for (let i = 0; i < 4; i++) folk.push(`flame-${i}`, `smoke-${i}`);
  for (let i = 0; i < 4; i++) folk.push(`walk-side-${i}`);
  const IMG = {};
  await Promise.all([...names.map((n) => [n, `lc/${n}.png`]), ...folk.map((n) => [n, `lc/folk_${n}.png`])].map(([n, p]) => new Promise((res) => { const i = new Image(); i.onload = () => { IMG[n] = i; res(); }; i.onerror = () => { console.log('missing ' + p); res(); }; i.src = p; })));
  await document.fonts.ready;

  // ---------- canvases
  const A = document.getElementById('scene'); A.width = W; A.height = H;
  const a = A.getContext('2d'); a.imageSmoothingEnabled = false;
  const lightC = document.createElement('canvas'); lightC.width = W; lightC.height = H;
  const out = document.getElementById('out'); out.width = W; out.height = H;
  const o = out.getContext('2d');
  const emi = document.createElement('canvas'); emi.width = W; emi.height = H; const e = emi.getContext('2d'); e.imageSmoothingEnabled = false;
  const FX = (c, x, y, w, h) => { c.fillRect(Math.round(x), Math.round(y), w, h); };

  function spr(c, n, x, y, opt = {}) { // bottom-centre anchor
    const im = IMG[n]; if (!im) return;
    c.save(); c.translate(Math.round(x), Math.round(y));
    if (opt.rot) c.rotate(opt.rot * Math.PI / 2);
    if (opt.flip) c.scale(-1, 1);
    if (opt.alpha != null) c.globalAlpha = opt.alpha;
    c.drawImage(im, -Math.round(im.width / 2), -im.height + (opt.rot ? 0 : 0));
    c.restore();
  }
  function tinted(n, col, amt) {
    const key = n + col + amt; tinted.c = tinted.c || {};
    if (tinted.c[key]) return tinted.c[key];
    const im = IMG[n]; const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d');
    x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = amt; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
    return tinted.c[key] = c;
  }
  function sprT(c, n, col, amt, x, y, opt = {}) {
    const t = tinted(n, col, amt); c.save(); c.translate(Math.round(x), Math.round(y)); if (opt.flip) c.scale(-1, 1); if (opt.rot) c.rotate(opt.rot * Math.PI / 2);
    c.drawImage(t, -Math.round(t.width / 2), -t.height); c.restore();
  }

  // ---------- data
  const T = [
    { key: 'INV-71924', title: 'Wash sale info under each loss', st: 'working', p: 3.5 / 6, phrase: 'writing the reason line under each loss', time: '22m', step: 4, out: 'a' },
    { key: 'INV-71880', title: 'Cost basis export drops split-day lots', st: 'kirubel', p: 0.40, phrase: 'waiting for your word on split-day lots', time: '18m', step: 3, out: 'b' },
    { key: 'INV-72011', title: 'Q4 tax doc banner copy', st: 'done', p: 1, phrase: 'merge request open', time: '', step: 6, out: 'h', mr: { ci: 'ok', appr: [1, 2], comments: 2 } },
    { key: 'INV-71990', title: 'Dividend reinvest toggle', st: 'stuck', p: 0.50, phrase: 'running the same test again', time: '41m', step: 3, out: 'd' },
    { key: 'INV-71702', title: 'Flaky e2e on statements download', st: 'broken', p: 0.33, phrase: 'fell over twice on the same setup error', time: '', step: 2, out: 'e' },
    { key: 'INV-72033', title: 'Holdings CSV column order', st: 'limit', p: 0.42, phrase: 'out of usage, back at 2:40pm', time: '', step: 3, out: 'f' },
    { key: 'INV-72040', title: 'Gift lot holding period', st: 'setup', p: 0, phrase: 'cutting the workspace', time: '14s', step: 0, out: 'g' },
    { key: 'INV-71650', title: 'Rename Realized tab', st: 'landed', p: 1, phrase: 'merged an hour ago', time: '', step: 6, out: 'g' },
  ];
  if (MANY) T.push(
    { key: 'INV-71955', title: 'Statement PDF footer year', st: 'asking', p: 0.36, phrase: 'asked you which year to print', time: '9m', step: 3, out: 'a' },
    { key: 'INV-72003', title: 'Lot picker keyboard navigation', st: 'working', p: 0.27, phrase: 'wiring arrow keys into the picker', time: '14m', step: 2, out: 'f' },
    { key: 'INV-71844', title: 'Rounding in wash sale totals', st: 'working', p: 0.80, phrase: 'running the totals test', time: '33m', step: 5, out: 'b' },
    { key: 'INV-72050', title: 'Add 1099-DA preview', st: 'setup', p: 0, phrase: 'cutting the workspace', time: '6s', step: 0, out: 'e' },
    { key: 'INV-71910', title: 'Empty state on Holdings', st: 'done', p: 1, phrase: 'merge request open', time: '', step: 6, out: 'a', mr: { ci: 'fail', appr: [0, 2], comments: 0 } },
    { key: 'INV-71601', title: 'Remove dead export flag', st: 'landed', p: 1, phrase: 'merged 3h ago', time: '', step: 6, out: 'b' },
  );
  const N = T.length;
  const laneTop = MANY ? 147 : 150, laneBot = MANY ? 444 : 432;
  const sp = (laneBot - laneTop) / (N - 1);
  const stubY = MANY ? 474 : 466;
  const XS = 150, XE = 606, WALLX = 616;
  const hubX = 52, hubY = 298;
  T.forEach((t, i) => { t.i = i; t.y0 = laneTop + i * sp; t.ph = i * 1.7 + 0.6; });
  const AMP = Math.min(9, sp * 0.27);
  const yc = (t, x) => { const q = smooth((x - hubX) / (XS - 20 - hubX)); return lerp(hubY, t.y0, q) + AMP * Math.sin(x * 0.0125 + t.ph) * q; };
  const fx = (t) => XS + t.p * (XE - XS);
  const lights = []; // {x,y,r,c:[r,g,b],k, flick}
  const L = (x, y, r, c, k, fl) => lights.push({ x, y, r, c, k, fl: fl || 0 });
  const ems = []; // post-light draw callbacks
  const FR = (ms, n) => Math.floor((window.TT || 0) / ms) % n;

  // ---------- sky + ground (pre-light colours)
  const RIDGE = 120;
  function vnoise(x, y, seed) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const h = (a, b) => { let n = (a * 374761393 + b * 668265263 + seed * 1274126177) | 0; n = (n ^ (n >>> 13)) * 1274126177 | 0; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
    const u = smooth(xf), v = smooth(yf);
    return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
  }
  const img = a.createImageData(W, H); const d = img.data;
  const grass = [[58, 82, 44], [68, 96, 50], [80, 112, 58], [96, 128, 66]];
  const rightEdge = (x, y) => x > WALLX + 20;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let c;
    const ridge = RIDGE + 7 * Math.sin(x * 0.02) + 5 * Math.sin(x * 0.047 + 1) + (x < 120 ? -22 * smooth((120 - x) / 100) * 0 : 0);
    if (y < ridge) {
      const g = y / ridge;
      const far = 78 + 14 * Math.sin(x * 0.012 + 2) + 9 * Math.sin(x * 0.03);
      const far2 = 96 + 10 * Math.sin(x * 0.02 + 4) + 6 * Math.sin(x * 0.05 + 1);
      if (y > far2 && bay(x, y) < 0.75) c = [26, 34, 62];
      else if (y > far && bay(x, y) < 0.55) c = [32, 44, 80];
      else c = [lerp(32, 80, g * g) | 0, lerp(44, 92, g * g) | 0, lerp(88, 134, g * g) | 0];
      if (y > ridge - 4) c = [34, 52, 40];
    } else {
      const n = vnoise(x / 30, y / 22, 1) * 0.6 + vnoise(x / 9, y / 7, 2) * 0.28 + vnoise(x / 3.3, y / 2.8, 3) * 0.12;
      const hill = vnoise(x / 70 + 3, y / 46, 7) - 0.5;
      let v = clamp(n * 0.7 + hill * 1.15 + 0.08, 0, 0.999);
      const b = bay(x, y);
      let idx = Math.floor(v * 3.6 + (b - 0.5) * 0.9); idx = clamp(idx, 0, 3);
      c = grass[idx].slice();
      if (x > WALLX + 8) { const dk = 0.8 + 0.16 * vnoise(x / 4, y / 4, 11); c = (y < 486) ? [124 * dk, 112 * dk, 96 * dk] : [60, 86, 46]; if ((x + y * 3) % 11 === 0) c = [88, 78, 68]; }
    }
    const k = (y * W + x) * 4; d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
  }
  a.putImageData(img, 0, 0);

  // distant pines along ridge
  function pine(c, x, y, h, col, col2) {
    c.fillStyle = col; for (let r = 0; r < h; r++) { const w = Math.round(1 + r * 0.42); FX(c, x - w / 2 | 0, y - h + r, w, 1); }
    c.fillStyle = col2; FX(c, x, y, 1, 2);
  }
  { const r = rng(5); for (let x = -4; x < W; x += 3 + r() * 5) { const ridge = RIDGE + 7 * Math.sin(x * 0.02) + 5 * Math.sin(x * 0.047 + 1); const h = 11 + r() * 12; pine(a, x, ridge + 6 + r() * 5, h, r() < 0.5 ? '#233b2a' : '#1e3326', '#2a1e14'); } }

  // ---------- town (right)
  function roof(c, x, y, w, h, col, hi, lo) {
    c.fillStyle = lo; FX(c, x, y + 3, w, h);
    c.fillStyle = col; FX(c, x, y, w, h);
    c.fillStyle = hi; FX(c, x, y, w, 2);
    c.fillStyle = lo; for (let i = 6; i < h; i += 5) FX(c, x, y + i, w, 1);
    c.fillStyle = '#20160f'; FX(c, x + w - 6, y - 4, 3, 5);
  }
  roof(a, 676, 130, 52, 36, '#b06a52', '#cc8466', '#7a4636');
  roof(a, 690, 196, 44, 42, '#76708a', '#948ea8', '#4e4860');
  roof(a, 674, 270, 56, 40, '#b8745a', '#d48e6c', '#7e4a3a');
  roof(a, 688, 346, 46, 38, '#76708a', '#948ea8', '#4e4860');
  roof(a, 674, 418, 56, 44, '#b06a52', '#cc8466', '#7a4636');
  // street
  a.fillStyle = '#6e6a68'; FX(a, WALLX + 18, 124, 22, 356, 1);
  a.fillStyle = '#5f5b5a'; for (let y = 126; y < 480; y += 4) for (let x = WALLX + 18; x < WALLX + 40; x += 4) if (((x >> 2) + (y >> 2)) % 2) FX(a, x, y, 3, 3);

  // ---------- roads
  const DIRT = ['#b58a4e', '#a37a46', '#8a6538', '#c49c5c'];
  function road(t, x0, x1, w) {
    const rr = rng(100 + t.i);
    for (let x = x0; x <= x1; x++) {
      const y = Math.round(yc(t, x)); const hw = (w || 4);
      for (let k = -hw - 1; k <= hw + 1; k++) {
        const edge = Math.abs(k) >= hw;
        let col;
        if (edge) { if (bay(x, y + k) < 0.5) continue; col = '#4c4430'; }
        else { const q = (x * 7 + (y + k) * 13) % 9; col = k === 0 && x % 6 === 0 ? DIRT[2] : (q === 0 ? DIRT[3] : q < 3 ? DIRT[1] : DIRT[0]); if ((k === -2 || k === 2) && x % 3) col = DIRT[1]; }
        a.fillStyle = col; FX(a, x, y + k, 1, 1);
      }
      if (rr() < 0.05) { a.fillStyle = '#a89a80'; FX(a, x, y + (rr() * 7 - 3 | 0), 1, 1); }
    }
  }
  T.forEach((t) => road(t, hubX - 4, WALLX));
  // hub spread
  a.fillStyle = DIRT[1]; for (let i = 0; i < 260; i++) { const x = hubX - 22 + R() * 36, y = hubY - 24 + R() * 48; const dx = (x - hubX) / 20, dy = (y - hubY) / 24; if (dx * dx + dy * dy < 1 && bay(x | 0, y | 0) < 0.6) FX(a, x, y, 2, 1); }

  // new-ticket stub
  { const y = stubY; for (let x = hubX; x < hubX + 64; x++) { const yy = Math.round(lerp(hubY + 20, y, smooth((x - hubX) / 40))); for (let k = -3; k <= 3; k++) { if (Math.abs(k) === 3 && bay(x, yy + k) < 0.5) continue; if (bay(x, yy + k) > 0.8 && x > hubX + 40) continue; a.fillStyle = Math.abs(k) >= 3 ? '#4c4430' : '#5e4b30'; FX(a, x, yy + k, 1, 1); } } }

  // ---------- helpers: scenery
  function bush(c, n, x, y, flip) { spr(c, n, x, y, { flip }); }
  const scat = rng(9);
  const obstacles = []; // keep scenery off roads
  const onRoad = (x, y) => T.some((t) => Math.abs(yc(t, x) - y) < 9) || (x > hubX - 26 && x < hubX + 36 && Math.abs(y - hubY) < 62);
  const nearLabel = (x, y) => x > XS - 70 && x < XS + 140 && T.some((t) => y < yc(t, x) + 4 && y > yc(t, x) - 34);
  for (let i = 0; i < 60; i++) {
    const x = 10 + scat() * 590, y = 128 + scat() * 350;
    if (obstacles.length >= (MANY ? 6 : 8)) break;
    if (T.some((t) => yc(t, x) > y - 36 && yc(t, x) < y + 8)) continue;
    if (T.some((t) => t.p > 0 && t.p < 1 && Math.abs(x - fx(t) - 14) < 60 && Math.abs(y - yc(t, fx(t))) < 36) || onRoad(x, y) || nearLabel(x, y) || (T.some((t) => Math.abs(yc(t, x) - y) < 13))) continue;
    if (x < 110 && y > 120 && y < 410) continue;
    obstacles.push([x, y, 'plants_plant_bush_03_a', scat() < 0.5]);
  }
  // small tufts / flowers
  for (let i = 0; i < 260; i++) { const x = scat() * 610, y = 124 + scat() * 360; if (T.some((t) => Math.abs(yc(t, x) - y) < 6)) continue; a.fillStyle = ['#3d5a30', '#6c8c4c', '#8a7a5a'][scat() * 3 | 0]; FX(a, x, y, 1, 2); if (scat() < 0.1) { a.fillStyle = ['#c9b36a', '#c58a7a', '#b8c8e0'][scat() * 3 | 0]; FX(a, x + 1, y - 1, 1, 1); } }

  // ---------- hills: lighter moon-struck mounds (baked as extra highlight)
  // (done in grass noise)

  // ---------- gate wall
  function wall() {
    for (let y = 124; y < 482; y++) for (let x = WALLX; x < WALLX + 14; x++) {
      const brick = ((y >> 2) % 2 ? x + 3 : x) % 7 === 0 || y % 4 === 0;
      let col = brick ? '#76705f' : '#9a9382';
      if (x < WALLX + 2) col = '#b8b09a'; if (x >= WALLX + 12) col = '#5a564a';
      a.fillStyle = col; FX(a, x, y, 1, 1);
    }
    for (let y = 124; y < 480; y += 8) { a.fillStyle = '#b8b09a'; FX(a, WALLX - 1, y, 3, 5); a.fillStyle = '#4a463a'; FX(a, WALLX + 12, y, 3, 5); }
  }
  wall();
  function gateOf(t, open) {
    const y = Math.round(yc(t, WALLX)); const gh = Math.min(10, sp * 0.4 | 0) + 1;
    a.fillStyle = '#2a2620'; FX(a, WALLX - 2, y - gh - 2, 18, gh * 2 + 5);
    a.fillStyle = '#c9c1aa'; FX(a, WALLX - 2, y - gh - 2, 18, 2); FX(a, WALLX - 2, y + gh + 1, 18, 2);
    a.fillStyle = '#12100d'; FX(a, WALLX, y - gh, 14, gh * 2 + 1);
    a.fillStyle = '#7a6040'; FX(a, WALLX - 2, y - 3, 18, 7);
    if (!open) {
      a.fillStyle = '#8a6438'; FX(a, WALLX + 3, y - gh, 8, gh * 2 + 1);
      a.fillStyle = '#b08850'; for (let q = 0; q < 4; q++) FX(a, WALLX + 3 + q * 2, y - gh, 1, gh * 2 + 1);
      a.fillStyle = '#2b1d12'; FX(a, WALLX + 7, y - gh, 1, gh * 2 + 1);
      a.fillStyle = '#3a3a42'; FX(a, WALLX + 3, y - gh + 2, 8, 1); FX(a, WALLX + 3, y + gh - 2, 8, 1);
      a.fillStyle = '#d8b060'; FX(a, WALLX + 6, y - 1, 1, 3); FX(a, WALLX + 8, y - 1, 1, 3);
    } else {
      a.fillStyle = '#6a4a2a'; FX(a, WALLX + 1, y - gh - 1, 1, 1); FX(a, WALLX + 8, y - gh - 3, 6, 3); FX(a, WALLX + 8, y + gh + 1, 6, 3);
      a.fillStyle = '#8a6a40'; FX(a, WALLX + 8, y - gh - 3, 6, 1); FX(a, WALLX + 8, y + gh + 1, 6, 1);
    }
  }
  T.forEach((t) => gateOf(t, t.st === 'landed'));

  // ---------- camp
  function tentH(x, y) { // my own small canvas tent (kit tents too big)
    const c = a;
    c.fillStyle = '#2a1c12'; FX(c, x - 14, y - 2, 28, 3);
    for (let r = 0; r < 14; r++) { const w = 4 + r * 2; c.fillStyle = r % 4 < 2 ? '#e6d8b6' : '#cdbd98'; FX(c, x - w / 2, y - 16 + r, w, 1); }
    c.fillStyle = '#2a1c12'; FX(c, x - 1, y - 18, 2, 16); FX(c, x - 14, y - 2, 1, 1);
    c.fillStyle = '#1b1109'; FX(c, x - 3, y - 7, 6, 6);
    c.fillStyle = '#7c6d54'; FX(c, x - 15, y - 3, 1, 3); FX(c, x + 14, y - 3, 1, 3);
  }
  tentH(22, 262); tentH(86, 236); tentH(30, 350);
 
  // log seats round the fire
  [[hubX - 22, hubY + 10], [hubX + 30, hubY + 12]].forEach(([x, y]) => { a.fillStyle = '#2a1c12'; FX(a, x - 8, y - 1, 16, 5); a.fillStyle = '#7a5836'; FX(a, x - 7, y, 14, 3); a.fillStyle = '#a07a4a'; FX(a, x - 7, y, 14, 1); });
  spr(a, 'props_props_campfire_01', hubX + 4, hubY + 6, {});

  // ---------- sprites that depend on state
  const figs = [];
  const OUT = {}; for (const k of 'abcdefgh') OUT[k] = k;
  function walkFrame(t) { return FR(180, 4); }
  function person(c, t, x, y, mode, opt = {}) {
    const k = t.out;
    if (mode === 'walk') spr(c, `town-${k}-walk-side-${opt.f != null ? opt.f : 0}`, x, y, { flip: opt.flip });
    else if (mode === 'side') spr(c, `town-${k}-side-0`, x, y, { flip: opt.flip });
    else if (mode === 'sit') spr(c, 'sit-0', x, y, { flip: opt.flip });
    else if (mode === 'back') spr(c, `town-${k}-back-0`, x, y, {});
    else if (mode === 'front') spr(c, `town-${k}-front-0`, x, y, {});
  }
  function lampMark(c, x, y, lit) { // waymarker
    c.fillStyle = '#26211b'; FX(c, x - 2, y - 7, 5, 8);
    c.fillStyle = lit ? '#8a8576' : '#6c675c'; FX(c, x - 1, y - 6, 3, 6);
    c.fillStyle = lit ? '#a8a290' : '#837e70'; FX(c, x - 1, y - 6, 3, 1);
    c.fillStyle = '#26211b'; FX(c, x - 1, y - 8, 3, 1);
  }
  // ---------- per-ticket scene objects (drawn pre-light)
  const post = []; // draw in depth order
  T.forEach((t) => {
    const y = (x) => yc(t, x);
    // milestones
    const lit = t.st === 'landed' || t.st === 'done' ? 6 : (t.st === 'setup' ? 0 : Math.floor(t.p * 6 + 0.001));
    for (let k = 1; k <= 5; k++) {
      const mx = XS + (k / 6) * (XE - XS); const my = Math.round(y(mx)) - 6;
      post.push({ z: my + 1, f: (c) => lampMark(c, mx, my, k <= lit) });
      t['m' + k] = [mx, my, k <= lit];
    }
    t.lit = lit;
    const gx = XE + 2;
    if (t.st === 'working' || t.st === 'asking' || t.st === 'kirubel') {
      const x = fx(t), yy = Math.round(y(x)) + 2;
      t.fig = [x, yy];
      post.push({ z: yy, f: (c) => {
        if (t.st === 'working') { person(c, t, x, yy, 'walk', { f: FR(160, 4) }); }
        else if (t.st === 'asking') { person(c, t, x, yy, 'side', { flip: true }); }
        else { person(c, t, x, yy, 'side', { flip: true }); }
      } });
    }
    if (t.st === 'stuck') {
      const mx = t.m3[0], my = t.m3[1] + 6; const cx = mx, cy = Math.round(y(mx)) + 1;
      const rx = 20, ry = Math.min(11, sp * 0.3 | 0);
      // worn circle (pre-light)
      for (let a2 = 0; a2 < 720; a2++) { const th = a2 / 720 * Math.PI * 2; const px = Math.round(cx + Math.cos(th) * rx), py = Math.round(cy + Math.sin(th) * ry); if (bay(px, py) < 0.95) { a.fillStyle = '#c9a868'; FX(a, px, py, 1, 2); a.fillStyle = '#5a4630'; FX(a, px, py + 2, 1, 1); if (bay(px + 1, py) < 0.5) { a.fillStyle = '#a88652'; FX(a, px, py - 1, 1, 1); } } }
      t.loop = [cx, cy, rx, ry];
      const th = (window.TT || 0) / 1400 * 1 + 4.1; const px = cx + Math.cos(th) * rx, py = cy + Math.sin(th) * ry;
      t.fig = [px, py + 1];
      post.push({ z: py + 1, f: (c) => person(c, t, px, py + 1, 'walk', { f: FR(160, 4), flip: Math.sin(th) < 0 === false ? false : true }) });
      // chalk tally on a stone
      const sx = cx + 16, sy = cy - ry - 5;
      post.push({ z: sy + 3, f: (c) => { c.fillStyle = '#4a4842'; FX(c, sx - 6, sy - 6, 13, 9); c.fillStyle = '#8c8878'; FX(c, sx - 5, sy - 6, 11, 1); c.fillStyle = '#6e6a5e'; FX(c, sx - 6, sy - 5, 1, 7); c.fillStyle = '#e8e2d0'; for (let q = 0; q < 5; q++) FX(c, sx - 4 + q * 2, sy - 4, 1, 5); c.fillRect(sx - 5, sy - 2, 10, 1); c.fillStyle = '#e8e2d0'; FX(c, sx + 5, sy - 4, 1, 5); } });
    }
    if (t.st === 'broken') {
      const x = fx(t), yy = Math.round(y(x)) + 2; t.fig = [x, yy];
      post.push({ z: yy, f: (c) => {
        // overturned cart: rotated 180, wheel off
        spr(c, 'cart-0', x + 15, yy + 1, { rot: 2 });
        c.fillStyle = '#3a2a1a'; FX(c, x + 24, yy - 3, 4, 4); c.fillStyle = '#7a5a36'; FX(c, x + 25, yy - 2, 2, 2);
        c.fillStyle = '#6b5030'; FX(c, x + 6, yy - 1, 3, 2); FX(c, x + 33, yy + 2, 4, 3);
        // fallen figure
        spr(c, `town-${t.out}-side-0`, x - 3, yy - 3, { rot: 1 });
      } });
    }
    if (t.st === 'limit') {
      const x = fx(t), yy = Math.round(y(x)) + 3; t.fig = [x, yy];
      post.push({ z: yy, f: (c) => {
        spr(c, 'sit-0', x - 11, yy, {});
        // log seat
        c.fillStyle = '#2a1c12'; FX(c, x - 18, yy - 1, 12, 4); c.fillStyle = '#6f5030'; FX(c, x - 17, yy, 10, 2);
        // fire stones
        c.fillStyle = '#4c4a46'; for (let q = -1; q <= 1; q++) FX(c, x + 2 + q * 3, yy + 1, 3, 2); c.fillStyle = '#2a1c12'; FX(c, x + 1, yy - 1, 8, 1);
        // stake
        c.fillStyle = '#2a1c12'; FX(c, x + 20, yy - 20, 2, 22); c.fillStyle = '#7a5a36'; FX(c, x + 20, yy - 19, 1, 20);
        c.fillStyle = '#2a1c12'; FX(c, x + 17, yy - 21, 8, 1); FX(c, x + 13, yy - 22, 16, 1);
      } });
    }
    if (t.st === 'setup') {
      const x = 104, yy = Math.round(y(x)) + 10; t.fig = [x, yy];
      post.push({ z: yy, f: (c) => {
        spr(c, 'cart-1', x + 17, yy, {});
        person(c, t, x, yy, 'side', {}); spr(c, 'carry-crate', x + 6, yy - 12, {});
        c.fillStyle = '#2a1c12'; FX(c, x - 14, yy - 18, 2, 20); c.fillStyle = '#7a5a36'; FX(c, x - 14, yy - 17, 1, 19);
      } });
    }
    if (t.st === 'done') {
      const x = WALLX - 12, yy = Math.round(y(WALLX)) + 4; t.fig = [x, yy];
      post.push({ z: yy, f: (c) => { person(c, t, x, yy, 'side', {}); spr(c, 'carry-letter', x + 7, yy - 11, {}); } });
    }
    if (t.st === 'landed') {
      const x = WALLX + 27, yy = Math.round(y(WALLX)) + 5; t.fig = [x, yy];
      post.push({ z: yy, f: (c) => person(c, t, x, yy, 'side', {}) });
    }
  });
  // camp sparse extras + small life
  post.push({ z: 300, f: (c) => { spr(c, 'dog-sit', 96, 330, {}); spr(c, 'sheep-graze', 590, 470, {}); } });
  obstacles.forEach(([x, y, n, fl]) => post.push({ z: y, f: (c) => bush(c, n, x, y, fl) }));
  // lead tower (pre-light)
  const TW = { x: 62, y: 186 };
  function tower(c) {
    const x = TW.x, y = TW.y;
    // mound
    for (let r = 0; r < 14; r++) { c.fillStyle = r % 3 ? '#4a6c3a' : '#5a7e4a'; FX(c, x - 12 - r * 2, y - 12 + r, 24 + r * 4, 1); }
    // legs
    c.fillStyle = '#2a1c12'; FX(c, x - 13, y - 44, 3, 44); FX(c, x + 10, y - 44, 3, 44);
    c.fillStyle = '#7a5a36'; FX(c, x - 12, y - 44, 1, 44); FX(c, x + 11, y - 44, 1, 44);
    for (let i = 0; i < 18; i++) { c.fillStyle = '#4a3622'; FX(c, x - 11 + i, y - 8 - i * 2, 1, 2); FX(c, x + 10 - i, y - 8 - i * 2, 1, 2); }
    // deck
    c.fillStyle = '#2a1c12'; FX(c, x - 17, y - 48, 35, 5); c.fillStyle = '#8a6440'; FX(c, x - 16, y - 47, 33, 2); c.fillStyle = '#5a4026'; FX(c, x - 16, y - 45, 33, 1);
    // rail
    c.fillStyle = '#2a1c12'; FX(c, x - 16, y - 56, 2, 9); FX(c, x + 15, y - 56, 2, 9); FX(c, x - 16, y - 56, 33, 1); c.fillStyle = '#7a5a36'; FX(c, x - 15, y - 56, 1, 8); FX(c, x + 16, y - 56, 1, 8);
    // roof
    for (let r = 0; r < 16; r++) { const w = 4 + r * 2.4 | 0; c.fillStyle = r % 4 < 2 ? '#7a4a3a' : '#643c30'; FX(c, x - w / 2 | 0, y - 90 + r, w, 1); } c.fillStyle = '#2a1c12'; FX(c, x - 21, y - 74, 42, 2); FX(c, x, y - 94, 1, 5); c.fillStyle = '#ff9a4a'; FX(c, x + 1, y - 94, 4, 2);
    c.fillStyle = '#2a1c12'; FX(c, x - 18, y - 73, 38, 1); FX(c, x - 15, y - 72, 2, 16); FX(c, x + 15, y - 72, 2, 16);
    // lead
    spr(c, 'town-c-front-0', x, y - 47, {});
    // scroll at foot
    c.fillStyle = '#2a1c12'; FX(c, x + 20, y - 4, 13, 5); c.fillStyle = '#d8c89a'; FX(c, x + 21, y - 3, 11, 3); c.fillStyle = '#b09a68'; FX(c, x + 21, y - 1, 11, 1); c.fillStyle = '#8a7048'; FX(c, x + 20, y - 4, 2, 5); FX(c, x + 31, y - 4, 2, 5);
  }
  // beacons (pre-light: poles)
  const beacons = [];
  T.forEach((t) => { if (t.st === 'kirubel' || t.st === 'broken') { const x = t.fig[0] + (t.st === 'broken' ? 44 : 20), y = Math.round(yc(t, x)) + 18; beacons.push({ t, x, y, c: t.st === 'broken' ? 'sore' : 'ember' }); } });
  function beaconPole(c, b) {
    const x = b.x, y = b.y;
    // mound
    for (let r = 0; r < 6; r++) { c.fillStyle = r % 2 ? '#4c6a3a' : '#5a7a48'; FX(c, x - 9 + r, y - 4 + r, 18 - r * 2, 1); }
    c.fillStyle = '#2a1c12'; FX(c, x - 1, y - 24, 3, 25); c.fillStyle = '#7a5a36'; FX(c, x, y - 24, 1, 24);
    c.fillStyle = '#2a1c12'; FX(c, x - 6, y - 29, 13, 5); c.fillStyle = '#6a6a76'; FX(c, x - 5, y - 28, 11, 2); c.fillStyle = '#2a1c12'; FX(c, x - 6, y - 25, 1, 4); FX(c, x + 6, y - 25, 1, 4); FX(c, x - 4, y - 22, 9, 1);
  }
  [[WALLX + 25, 160], [WALLX + 25, 290], [WALLX + 25, 410]].forEach(([x, y]) => { post.push({ z: y, f: (c) => { c.fillStyle = '#1c1812'; FX(c, x, y - 12, 2, 13); FX(c, x - 2, y - 15, 6, 4); } }); });
  // ---------- paint scenery in depth order
  post.push({ z: TW.y, f: tower });
  beacons.forEach((b) => post.push({ z: b.y, f: (c) => beaconPole(c, b) }));
  post.sort((p, q) => p.z - q.z).forEach((p) => p.f(a));
  // done-door chalk + papers at wall (pre-light)
  T.forEach((t) => {
    if (t.st !== 'done' || !t.mr) return;
    const y = Math.round(yc(t, WALLX)); const gh = Math.min(9, sp * 0.38 | 0) + 1;
    const mr = t.mr;
    if (mr.ci === 'fail') { a.fillStyle = '#e07a62'; for (let q = -4; q <= 4; q++) { FX(a, WALLX + 4 + (q + 4) * 0.8 | 0, y + q * 1 - 1, 1, 1); FX(a, WALLX + 12 - ((q + 4) * 0.8 | 0), y + q - 1, 1, 1); } }
    t.mrPos = [WALLX, y, gh];
  });

  // ---------- lights
  const AMB = [0.34, 0.41, 0.62];
  lights.length = 0;
  L(TW.x, TW.y - 62, 52, [1.0, 0.7, 0.32], 0.95, 1);
  L(hubX + 4, hubY - 6, 70, [1.0, 0.62, 0.26], 1.05, 1);
  T.forEach((t) => {
    for (let k = 1; k <= 5; k++) if (t['m' + k] && t['m' + k][2]) L(t['m' + k][0], t['m' + k][1] - 3, 10, [1.0, 0.66, 0.3], t.st === 'landed' ? 0.38 : 0.55, 0);
    if (t.st === 'working') L(t.fig[0] + 6, t.fig[1] - 14, 22, [1, 0.62, 0.28], 0.8, 1);
    if (t.st === 'asking') L(t.fig[0] - 6, t.fig[1] - 14, 22, [1, 0.62, 0.28], 0.8, 1);
    if (t.st === 'kirubel') L(t.fig[0] - 6, t.fig[1] - 14, 16, [1, 0.62, 0.28], 0.6, 1);
    if (t.st === 'stuck') L(t.fig[0], t.fig[1] - 14, 20, [1, 0.6, 0.3], 0.55, 1);
    if (t.st === 'limit') L(t.fig[0] + 5, t.fig[1] - 2, 24, [1, 0.3, 0.16], 0.7, 1);
    if (t.st === 'broken') { L(t.fig[0] + 16, t.fig[1] - 3, 22, [1, 0.3, 0.2], 0.4, 1); }
    if (t.st === 'setup') { L(t.fig[0] + 8, t.fig[1] - 14, 24, [1, 0.66, 0.34], 0.7, 1); }
    if (t.st === 'done') L(WALLX - 6, t.fig[1] - 6, 28, [1, 0.7, 0.4], 0.5, 0);
    if (t.st === 'landed') { L(WALLX + 6, yc(t, WALLX), 26, [1, 0.72, 0.4], 0.75, 0); L(t.fig[0], t.fig[1] - 12, 12, [1, 0.7, 0.4], 0.5, 0); }
    if (t.st === 'setup') { }
  });
  beacons.forEach((b) => { const col = b.c === 'sore' ? [0.9, 0.3, 0.22] : [1, 0.66, 0.26]; L(b.x, b.y - 26, b.c === 'sore' ? 46 : 62, col, b.c === 'sore' ? 0.7 : 1.0, 1); b.col = col; });
  T.forEach((t) => L(WALLX - 3, yc(t, WALLX) - 12, 15, [1, 0.72, 0.4], t.st === 'landed' || t.st === 'done' ? 0.8 : 0.45, 0));
  // gate street lamps
  [[WALLX + 25, 160], [WALLX + 25, 290], [WALLX + 25, 410]].forEach(([x, y]) => L(x, y - 12, 24, [1, 0.74, 0.44], 0.6, 0));

  function renderLights(time) {
    const lc = lightC.getContext('2d'); const id = lc.createImageData(W, H); const L4 = new Float32Array(W * H * 3);
    for (let i = 0; i < W * H; i++) { L4[i * 3] = AMB[0]; L4[i * 3 + 1] = AMB[1]; L4[i * 3 + 2] = AMB[2]; }
    lights.forEach((l, li) => {
      const fl = l.fl ? 1 + 0.12 * Math.sin(time / 130 + li * 3) + 0.07 * Math.sin(time / 53 + li) : 1;
      const r = l.r * (l.fl ? (0.96 + 0.04 * fl) : 1);
      const x0 = Math.max(0, Math.floor(l.x - r)), x1 = Math.min(W - 1, Math.ceil(l.x + r)), y0 = Math.max(0, Math.floor(l.y - r * 0.8)), y1 = Math.min(H - 1, Math.ceil(l.y + r * 0.8));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const dx = (x - l.x) / r, dy = (y - l.y) / (r * 0.8); const q = dx * dx + dy * dy; if (q >= 1) continue;
        let f = (1 - q); f = f * f * (3 - 2 * f) * l.k * fl;
        f = Math.floor(f * 6 + bay(x, y)) / 6; if (f <= 0) continue;
        const k = (y * W + x) * 3; L4[k] += l.c[0] * f * 1.1; L4[k + 1] += l.c[1] * f * 1.1; L4[k + 2] += l.c[2] * f * 1.0;
      }
    });
    // beacon shafts
    beacons.forEach((b, bi) => {
      const top = 100; const col = b.col; const pulse = 0.85 + 0.15 * Math.sin(time / 300 + bi);
      for (let y = top; y < b.y - 33; y++) { const g = Math.pow(1 - (b.y - 33 - y) / (b.y - 33 - top), 1.3); for (let x = b.x - 4; x <= b.x + 4; x++) { const w = 1 - Math.abs(x - b.x) / 4.5; let f = g * w * (b.c === 'sore' ? 0.8 : 0.95) * pulse; f = Math.floor(f * 6 + bay(x, y)) / 6; if (f <= 0) continue; const k = (y * W + x) * 3; L4[k] += col[0] * f; L4[k + 1] += col[1] * f; L4[k + 2] += col[2] * f; } }
    });
    window._L4 = L4;
  }
  function compose(time) {
    renderLights(time);
    const src = a.getImageData(0, 0, W, H); const sd = src.data; const L4 = window._L4;
    const dm = window.dimFn;
    for (let i = 0; i < W * H; i++) {
      if (dm) { const k = dm(i % W, (i / W) | 0); L4[i * 3] *= k; L4[i * 3 + 1] *= k; L4[i * 3 + 2] *= k; }
      sd[i * 4] = Math.min(255, sd[i * 4] * L4[i * 3]); sd[i * 4 + 1] = Math.min(255, sd[i * 4 + 1] * L4[i * 3 + 1]); sd[i * 4 + 2] = Math.min(255, sd[i * 4 + 2] * L4[i * 3 + 2]);
    }
    o.putImageData(src, 0, 0);
  }

  // ---------- emissive layer (post-light)
  function flame(c, x, y, f, tintCol) { const n = 'flame-' + (f & 3); if (tintCol) sprT(c, n, tintCol, 0.0, x, y); else spr(c, n, x, y); }
  function redFlame(c, x, y, f) { sprT(c, 'flame-' + (f & 3), '#c0201a', 0.6, x, y); }
  function emissive(time) {
    e.clearRect(0, 0, W, H);
    const f = Math.floor(time / 140);
    flame(e, hubX + 4, hubY - 2, f); flame(e, hubX + 1, hubY - 1, f + 1); flame(e, hubX + 8, hubY - 1, f + 2);
    // tower lantern
    e.fillStyle = '#ffd08a'; FX(e, TW.x + 7, TW.y - 53, 3, 3); e.fillStyle = '#fff2c8'; FX(e, TW.x + 8, TW.y - 52, 1, 1);
    e.fillStyle = '#ffb560'; FX(e, TW.x - 2, TW.y - 71, 3, 3);
    // lit waymarkers
    T.forEach((t) => {
      for (let k = 1; k <= 5; k++) { const m = t['m' + k]; if (!m || !m[2]) continue; e.fillStyle = t.st === 'landed' ? '#d89a58' : '#ffb868'; FX(e, m[0], m[1] - 6, 1, 2); e.fillStyle = '#fff0c0'; FX(e, m[0], m[1] - 6, 1, 1); }
    });
    T.forEach((t) => {
      if (t.st === 'working' || t.st === 'asking' || t.st === 'kirubel' || t.st === 'stuck') {
        const dir = (t.st === 'asking' || t.st === 'kirubel') ? -1 : 1;
        const x = t.fig[0] + dir * 7, y = t.fig[1] - 13;
        e.fillStyle = '#2a1c12'; FX(e, x - 1, y - 2, 3, 1); FX(e, x - 1, y + 3, 3, 1);
        e.fillStyle = t.st === 'stuck' ? '#e6a05a' : '#ffc070'; FX(e, x - 1, y - 1, 3, 4); e.fillStyle = '#fff2c8'; FX(e, x, y, 1, 2);
      }
      if (t.st === 'asking' || t.st === 'kirubel') { // waving arm + small ?
        const x = t.fig[0], y = t.fig[1];
        const up = Math.floor(time / 260) % 2;
        e.fillStyle = '#2a1c12'; FX(e, x + 4, y - 25 - up * 2, 3, 6); e.fillStyle = '#e6b88c'; FX(e, x + 5, y - 26 - up * 2, 1, 3);
        e.fillStyle = '#ffa35a'; const qx = x + 1, qy = y - 36; FX(e, qx, qy, 3, 1); FX(e, qx + 2, qy + 1, 1, 2); FX(e, qx + 1, qy + 2, 1, 1); FX(e, qx + 1, qy + 4, 1, 1);
      }
      if (t.st === 'limit') { redFlame(e, t.fig[0] + 5, t.fig[1], f); redFlame(e, t.fig[0] + 2, t.fig[1] + 1, f + 2); e.fillStyle = '#e8d8c0'; /* stake nothing */ }
      if (t.st === 'broken') { sprT(e, 'flame-' + (f & 3), '#a01810', 0.7, t.fig[0] + 16, t.fig[1] - 1); }
      if (t.st === 'done' && t.mr) {
        const [wx, wy, gh] = t.mrPos;
        // seals
        const mr = t.mr;
        if (mr.appr && mr.appr[0] > 0) { e.fillStyle = '#9bd28a'; FX(e, wx + 1, wy - gh - 6, 4, 4); e.fillStyle = '#1b2a16'; FX(e, wx + 2, wy - gh - 4, 1, 1); FX(e, wx + 3, wy - gh - 5, 1, 1); }
        if (mr.appr && mr.appr[0] < mr.appr[1]) { e.fillStyle = '#7a8a70'; FX(e, wx + 6, wy - gh - 6, 4, 1); FX(e, wx + 6, wy - gh - 3, 4, 1); FX(e, wx + 6, wy - gh - 6, 1, 4); FX(e, wx + 9, wy - gh - 6, 1, 4); }
        for (let q = 0; q < (mr.comments || 0); q++) { e.fillStyle = '#efe3cc'; FX(e, wx + 1 + q * 5, wy + gh + 3, 4, 5); e.fillStyle = '#9a8a6a'; FX(e, wx + 2 + q * 5, wy + gh + 4, 2, 1); FX(e, wx + 2 + q * 5, wy + gh + 6, 2, 1); }
      }
    });
    // beacons: flames
    beacons.forEach((b, bi) => {
      const fn = b.c === 'sore' ? redFlame : flame;
      fn(e, b.x - 3, b.y - 28, f + bi); fn(e, b.x + 4, b.y - 28, f + bi + 2); fn(e, b.x, b.y - 28, f + bi + 1); fn(e, b.x, b.y - 34, f + bi + 3);
      for (let q = 0; q < 7; q++) { const ph = ((time / 40 + q * 37 + bi * 11) % 90); const yy = b.y - 38 - ph * 0.9; const xx = b.x + Math.sin(ph / 9 + q * 2) * 3 + (q - 3); const al = 1 - ph / 90; e.fillStyle = b.c === 'sore' ? `rgba(255,120,90,${al})` : `rgba(255,200,120,${al})`; FX(e, xx, yy, 1, 1); }
    });
    // camp sparks
    for (let q = 0; q < 6; q++) { const ph = ((time / 50 + q * 41) % 60); e.fillStyle = `rgba(255,190,110,${1 - ph / 60})`; FX(e, hubX + 4 + Math.sin(ph / 7 + q) * 4, hubY - 14 - ph * 0.5, 1, 1); }
    // landed: through the gate, warm door light
    T.forEach((t) => { if (t.st === 'landed') { const y = Math.round(yc(t, WALLX)); e.fillStyle = 'rgba(255,196,110,.9)'; FX(e, WALLX + 1, y - 2, 2, 5); } });
    [[WALLX + 25, 160], [WALLX + 25, 290], [WALLX + 25, 410]].forEach(([x, y]) => { e.fillStyle = '#ffd890'; FX(e, x - 1, y - 14, 4, 2); e.fillStyle = '#fff4d0'; FX(e, x, y - 14, 2, 1); });
    T.forEach((t) => { const gy = Math.round(yc(t, WALLX)) - 12; e.fillStyle = '#ffd890'; FX(e, WALLX - 4, gy, 3, 3); e.fillStyle = '#fff4d0'; FX(e, WALLX - 3, gy + 1, 1, 1); });
    // fireflies
    const fr = rng(77); for (let q = 0; q < 12; q++) { const bx = 120 + fr() * 460, by = 130 + fr() * 340; const al = 0.5 + 0.5 * Math.sin(time / 600 + q * 2); e.fillStyle = `rgba(255,230,140,${al})`; FX(e, bx + Math.sin(time / 1400 + q) * 6, by + Math.cos(time / 1700 + q) * 4, 1, 1); }
    // smoke over broken
    T.forEach((t) => { if (t.st !== 'broken') return; for (let q = 0; q < 6; q++) { const ph = ((time / 90 + q * 25) % 150) / 150; const x = t.fig[0] + 14 + ph * 22 + Math.sin(ph * 6 + q) * 3, y = t.fig[1] - 6 - ph * 56; const n = 'smoke-' + Math.min(3, Math.floor(ph * 4)); const im = IMG[n]; if (!im) continue; e.save(); e.globalAlpha = 0.9 * (1 - ph * 0.8); const tt = tinted(n, '#20202a', 0.5); e.drawImage(tt, Math.round(x - im.width / 2), Math.round(y - im.height)); e.restore(); } });
    beacons.forEach((b, bi) => { for (let y = 98; y < b.y - 36; y++) { const g = Math.pow(1 - (b.y - 36 - y) / (b.y - 36 - 98), 1.5); for (let x = b.x - 2; x <= b.x + 2; x++) { const w = 1 - Math.abs(x - b.x) / 2.6; if (g * w * 0.5 + (bay(x, y) - 0.5) * 0.25 > 0.12) { e.fillStyle = b.c === 'sore' ? `rgba(255,110,90,${0.35 * g + 0.08})` : `rgba(255,190,110,${0.38 * g + 0.08})`; FX(e, x, y, 1, 1); } } } });
    if (window.extraEm) window.extraEm(e, time, T);
    // limit: little embers rising
    o.drawImage(emi, 0, 0);
  }
  window.draw = (time) => { window.TT = time; compose(time); emissive(time); };

  // ---------- DOM overlays
  const stage = document.getElementById('stage');
  const css = (x) => x * S;
  function dom(html, x, y, cls, style) { const d = document.createElement('div'); d.className = 'ov ' + (cls || ''); d.innerHTML = html; d.style.left = css(x) + 'px'; d.style.top = css(y) + 'px'; if (style) d.style.cssText += style; stage.appendChild(d); return d; }

  // labels at road start
  T.forEach((t) => {
    const x = 140, yb = yc(t, 140) - 5;
    const dim = t.st === 'landed' ? 'dim' : '';
    const lab = dom(`<div class="l1"><span class="k">${t.key}</span><span class="tt">${t.title}</span></div>${MANY ? '' : `<div class="l2">${t.phrase}${t.time ? ' · ' + t.time : ''}${t.step ? ' · step ' + t.step + ' of 6' : ''}</div>`}`, x, yb, 'lab ' + dim);
    lab.style.transform = 'translateY(-100%)'; if (t.st === 'kirubel') lab.classList.add('needs'); if (t.st === 'broken') lab.classList.add('hurt'); t.lab = lab; lab.dataset.key = t.key;
    // sign post
    const px = 138, py = yb;
  });
  // limit stake text, setup counter, tally
  T.forEach((t) => {
    if (t.st === 'limit') dom(`<span class="hand">back at 2:40pm</span>`, t.fig[0] + 20, t.fig[1] - 26, 'stake', 'transform:translate(-4px,-50%)');
    
    if (t.st === 'stuck' && MODE === 'point') { /* handled below */ }
  });
  // stub: hand it more
  dom(`<span class="gold hand2">hand it more tickets</span>`, hubX + 68, stubY + 1, 'stubl', 'transform:translateY(-50%)');
  // lead voice
  const lead = document.getElementById('lead');
  window.__T = T; window.__S = { yc, XS, XE, WALLX, TW, hubX, hubY, sp, stubY, beacons };
  // initial draw
  window.draw(1200);
  if (MODE !== 'static') { let last = 0; const loop = (t) => { if (!window.FREEZE && t - last > 120) { last = t; window.draw(t + 1200); } requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  if (window.afterInit) window.afterInit(T, window.__S);
  document.body.dataset.ready = '1';
})().catch((e) => { document.body.dataset.err = String(e && e.stack || e); document.body.dataset.ready = 'err'; });
