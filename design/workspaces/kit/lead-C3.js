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
  const names = ['house_09', 'house_03', 'props_props_campfire_01', 'props_props_cart_01_e', 'props_props_lantern_01_on', 'props_props_hay_pile_01', 'props_props_crate_01_a', 'props_props_barrel_01', 'plants_plant_bush_03_a', 'plants_plant_bush_07_a', 'props_props_bench_02_h', 'props_props_sign_icon_01'];
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
  const COLS = { dev: 314, test: 400, mr: 492, review: 572 };
  const lights = [];
  const L = (x, y, r, c, k, fl) => lights.push({ x, y, r, c, k, fl: fl || 0 });
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
  // town beyond: kit houses in darkness
  a.fillStyle = '#4a423c'; FX(a, WALLX, 124, W - WALLX, 358, 1);
  for (let y = 124; y < 482; y += 3) for (let x = WALLX; x < W; x += 3) { if (bay(x, y) < 0.4) { a.fillStyle = '#5a504a'; FX(a, x, y, 2, 2); } }
  spr(a, 'house_09', 748, 292, {}); spr(a, 'house_03', 752, 480, {});
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
  T.forEach((t) => road(t, hubX - 4, WALLX + 6));
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
    if (onRoad(x, y) || nearLabel(x, y) || (T.some((t) => Math.abs(yc(t, x) - y) < 13))) continue;
    if (x < 110 && y > 120 && y < 410) continue;
    obstacles.push([x, y, 'plants_plant_bush_03_a', scat() < 0.5]);
  }
  // small tufts / flowers
  for (let i = 0; i < 260; i++) { const x = scat() * 610, y = 124 + scat() * 360; if (T.some((t) => Math.abs(yc(t, x) - y) < 6)) continue; a.fillStyle = ['#3d5a30', '#6c8c4c', '#8a7a5a'][scat() * 3 | 0]; FX(a, x, y, 1, 2); if (scat() < 0.1) { a.fillStyle = ['#c9b36a', '#c58a7a', '#b8c8e0'][scat() * 3 | 0]; FX(a, x + 1, y - 1, 1, 1); } }

  // ---------- hills: lighter moon-struck mounds (baked as extra highlight)
  // (done in grass noise)

  // ---------- gate wall
  const WB = 24; // wall band width
  function wall() {
    for (let y = 122; y < 484; y++) for (let x = WALLX; x < WALLX + WB; x++) {
      const row = (y - 122) >> 2, off = (row % 2) * 4;
      const mortar = (y - 122) % 4 === 0 || (x - WALLX + off) % 8 === 0;
      let col = mortar ? '#7e7560' : ((x * 3 + y * 5) % 7 === 0 ? '#a39a80' : '#948b72');
      if (x < WALLX + 1) col = '#6a6250'; if (x >= WALLX + WB - 2) col = '#6a6250';
      a.fillStyle = col; FX(a, x, y, 1, 1);
    }
    // tiled cap top and bottom
    [[122, 12], [472, 12]].forEach(([y0, h]) => { for (let y = y0; y < y0 + h; y++) for (let x = WALLX - 2; x < WALLX + WB + 2; x++) { const row = (y - y0) >> 2; const edge = (y - y0) % 4 === 0 || (x - WALLX + (row % 2) * 6) % 12 === 0; a.fillStyle = edge ? '#7a6a58' : (row % 2 ? '#9a8e7c' : '#aa9e8a'); FX(a, x, y, 1, 1); } a.fillStyle = '#7a5a48'; FX(a, WALLX - 2, y0 + h, WB + 4, 1); });
    // shadow where the wall meets the grass
    a.fillStyle = '#1e1a14'; for (let y = 134; y < 472; y += 1) if (bay(1, y) < 0.7) FX(a, WALLX - 1, y, 1, 1);
  }
  wall();
  function gateOf(t, open) {
    const y = Math.round(yc(t, WALLX)); const dh = Math.max(14, Math.min(26, sp * 0.62 | 0)) , dw = 12; const x0 = WALLX + 6; const top = y - (dh >> 1);
    // arch ring (light voussoirs), rounded top at the north end
    const rows = dh + 2;
    for (let r = 0; r < rows; r++) { const yy = top - 1 + r; const trim = r < 3 ? 3 - r : 0; a.fillStyle = '#c4bda6'; FX(a, x0 - 1 + trim, yy, dw + 2 - trim * 2, 1); }
    a.fillStyle = '#7a725c'; FX(a, x0 - 1 + 3, top - 1, dw + 2 - 6, 1); FX(a, x0 + dw / 2 - 1, top - 2, 2, 2); a.fillStyle = '#d8d0b6'; FX(a, x0 + dw / 2 - 1, top - 2, 2, 1);
    for (let r = 0; r < dh; r++) { const yy = top + r; const trim = r < 3 ? 3 - r : 0; const w = dw - trim * 2;
      if (open) { a.fillStyle = r % 2 ? '#2a2018' : '#33261a'; FX(a, x0 + trim, yy, w, 1); }
      else { a.fillStyle = '#7a4e28'; FX(a, x0 + trim, yy, w, 1); for (let q = trim; q < dw - trim; q += 3) { a.fillStyle = '#9a6a38'; FX(a, x0 + q, yy, 1, 1); } a.fillStyle = '#4a2c14'; FX(a, x0 + dw / 2, yy, 1, 1); }
    }
    if (!open) { a.fillStyle = '#2e2e36'; FX(a, x0, top + 4, dw, 1); FX(a, x0, top + dh - 4, dw, 1); a.fillStyle = '#d8b060'; FX(a, x0 + dw / 2 - 2, y, 1, 2); FX(a, x0 + dw / 2 + 1, y, 1, 2); }
    else { a.fillStyle = '#7a4e28'; FX(a, x0, top + 4, 2, dh - 8); FX(a, x0 + dw - 2, top + 4, 2, dh - 8); a.fillStyle = '#9a6a38'; FX(a, x0, top + 4, 1, dh - 8); }
    t.gate = { x0, y, dh, dw, top };
  }
  T.forEach((t) => gateOf(t, t.mode === 'done'));

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
    if (mode !== 'sit') { c.fillStyle = 'rgba(8,12,6,.55)'; FX(c, x - 5, y - 1, 10, 2); FX(c, x - 3, y - 2, 6, 1); FX(c, x - 3, y + 1, 6, 1); }
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
  // camp sparse extras + small life
  post.push({ z: 300, f: (c) => { spr(c, 'dog-sit', 96, 330, {}); } });
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
  T.forEach((t) => { if (t.mode === 'ask') beacons.push({ t, x: COLS.dev + 22, y: Math.round(yc(t, COLS.dev + 22)) + 9, c: 'ember' }); });
  function beaconPole(c, b) {
    const x = b.x, y = b.y;
    for (let r = 0; r < 4; r++) { c.fillStyle = r % 2 ? '#4c6a3a' : '#5a7a48'; FX(c, x - 7 + r, y - 2 + r, 14 - r * 2, 1); }
    c.fillStyle = '#2a1c12'; FX(c, x - 1, y - 11, 3, 12); c.fillStyle = '#7a5a36'; FX(c, x, y - 11, 1, 11);
    c.fillStyle = '#2a1c12'; FX(c, x - 5, y - 15, 11, 5); c.fillStyle = '#6a6a76'; FX(c, x - 4, y - 14, 9, 2); c.fillStyle = '#2a1c12'; FX(c, x - 5, y - 11, 1, 3); FX(c, x + 5, y - 11, 1, 3);
  }
  [[WALLX + 31, 160], [WALLX + 31, 290], [WALLX + 31, 410]].forEach(([x, y]) => { post.push({ z: y, f: (c) => { c.fillStyle = '#1c1812'; FX(c, x, y - 12, 2, 13); FX(c, x - 2, y - 15, 6, 4); } }); });
  // ---------- paint scenery in depth order
  post.push({ z: TW.y, f: tower });
  beacons.forEach((b) => post.push({ z: b.y, f: (c) => beaconPole(c, b) }));
  post.sort((p, q) => p.z - q.z).forEach((p) => p.f(a));
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
  beacons.forEach((b) => { const col = [1, 0.66, 0.26]; L(b.x, b.y - 14, 62, col, 1.15, 1); b.col = col; });
  T.forEach((t) => L(WALLX + 1, t.gate.top - 3, 15, [1, 0.72, 0.4], t.mode === 'done' ? 0.85 : 0.4, 0));
  [[WALLX + 31, 160], [WALLX + 31, 290], [WALLX + 31, 410]].forEach(([x, y]) => L(x, y - 12, 24, [1, 0.74, 0.44], 0.6, 0));

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
  window.draw = (time) => { window.TT = time; compose(time); emissive(time); };

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
    [[COLS.dev, nm.dev], [COLS.test + 4, nm.test], [COLS.mr + 2, nm.mr], [COLS.review, nm.review], [WALLX + 26, nm.merged]].forEach(([x, s]) => dom(`<span>${s}</span>`, x, fy, 'stg', 'transform:translateX(-50%)')); }
  dom(`<span class="gold hand2">hand it more tickets</span>`, hubX + 68, stubY + 1, 'stubl', 'transform:translateY(-50%)');
  window.__T = T; window.__S = { yc, XS, WALLX, TW, hubX, hubY, sp, stubY, beacons, COLS, S };
  window.draw(1200);
  { let last = 0; const loop = (t) => { if (!window.FREEZE && t - last > 120) { last = t; window.draw(t + 1200); } requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  if (window.afterInit) window.afterInit(T, window.__S);
  document.body.dataset.ready = '1';
})().catch((e) => { document.body.dataset.err = String(e && e.stack || e); document.body.dataset.ready = 'err'; });
