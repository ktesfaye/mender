(function () {
  const FX = (c, x, y, w, h) => { c.fillRect(Math.round(x), Math.round(y), w, h); };
  const f = (c, col, x, y, w, h) => { c.fillStyle = col; FX(c, x, y, w, h); };
  const P = {};
  P.names = { dev: 'developing', test: 'testing on the device', mr: 'opening the merge request', review: 'in review', merged: 'merged' };

  // x,y = bottom centre of the place, standing on the grass just north of the road
  P.workshop = (c, x, y, o = {}) => {
    f(c, '#6e5434', x - 12, y - 3, 24, 4); f(c, '#7e6040', x - 10, y - 4, 20, 2);
    f(c, '#3a2814', x - 8, y - 6, 2, 6); f(c, '#3a2814', x + 6, y - 6, 2, 6);
    f(c, '#2a1c12', x - 10, y - 10, 21, 5); f(c, '#8a6440', x - 9, y - 9, 19, 3); f(c, '#a8825a', x - 9, y - 9, 19, 1);
    f(c, '#3a3e48', x - 7, y - 13, 7, 3); f(c, '#565c68', x - 7, y - 13, 7, 1); f(c, '#3a3e48', x - 9, y - 13, 2, 1); f(c, '#2a2c34', x - 5, y - 10, 3, 1);
    f(c, '#a8825a', x + 2, y - 11, 5, 1); f(c, '#565c68', x + 6, y - 12, 2, 3);
    f(c, '#e6d8b6', x + 3, y - 9, 3, 1);
    f(c, '#2a1c12', x - 11, y - 20, 2, 12); f(c, '#2a1c12', x + 10, y - 20, 2, 12);
    f(c, '#2a1c12', x - 13, y - 22, 27, 3); f(c, '#74503e', x - 12, y - 22, 25, 1); f(c, '#5a3c2e', x - 12, y - 21, 25, 1);
    f(c, '#7a5846', x - 12, y - 23, 25, 1);
    f(c, '#26211b', x + 7, y - 19, 3, 4); f(c, '#2a1c12', x + 8, y - 21, 1, 2);
  };
  P.workshopGlow = (e, x, y, o = {}, t = 0) => {
    if (!o.lit) return;
    const fl = 0.8 + 0.2 * Math.sin(t / 130 + x);
    f(e, `rgba(255,${190 + 30 * fl | 0},110,1)`, x + 8, y - 18, 1, 2); e.fillStyle = '#fff2c8'; FX(e, x + 8, y - 18, 1, 1);
    if (o.active) { for (let q = 0; q < 3; q++) { const ph = (t / 70 + q * 17) % 24; e.fillStyle = `rgba(255,210,140,${1 - ph / 24})`; FX(e, x - 4 + q * 2 + (ph % 3), y - 14 - ph * 0.35, 1, 1); } }
  };

  P.proving = (c, x, y, o = {}) => {
    f(c, '#4a4c54', x - 12, y - 2, 25, 4); f(c, '#6c6e76', x - 12, y - 3, 24, 2); f(c, '#8a8c94', x - 12, y - 3, 24, 1);
    f(c, '#585a62', x - 6, y - 3, 1, 3); f(c, '#585a62', x + 3, y - 3, 1, 3);
    f(c, '#2a2018', x - 1, y - 14, 2, 12); f(c, '#2a2018', x - 3, y - 4, 6, 2);
    f(c, '#12141a', x - 4, y - 24, 8, 11); f(c, '#2e3a58', x - 3, y - 23, 6, 8); f(c, '#3a4a70', x - 3, y - 23, 6, 1); f(c, '#2a2c34', x - 1, y - 15, 2, 1);
    f(c, '#6a6a76', x - 4, y - 24, 8, 1);
    if (o.shots) {
      f(c, '#2a1c12', x + 16, y - 24, 1, 24); f(c, '#2a1c12', x + 16 + o.shots * 10 + 4, y - 24, 1, 24);
      f(c, '#d9cdb0', x + 16, y - 22, o.shots * 10 + 5, 1);
      const imgs = [['#3a5a8a', '#e6e0cc', '#c9a050'], ['#e6e0cc', '#9bd28a', '#3a5a8a'], ['#c9a050', '#e6e0cc', '#8a4a4a'], ['#3a5a8a', '#e6e0cc', '#9bd28a']];
      for (let q = 0; q < o.shots; q++) {
        const px = x + 19 + q * 10, py = y - 21;
        f(c, '#f2c66d', px - 1, py - 1, 10, 15); f(c, '#efe6cf', px, py, 8, 13);
        f(c, '#16181e', px + 1, py + 1, 6, 9);
        const im = imgs[q % 4]; f(c, im[0], px + 1, py + 1, 6, 2); f(c, im[1], px + 1, py + 3, 6, 1); f(c, im[2], px + 1, py + 4, 3, 1); f(c, im[1], px + 1, py + 6, 6, 1); f(c, im[2], px + 1, py + 7, 4, 1);
        f(c, '#a07a4a', px + 3, py - 3, 2, 3);
      }
    }
  };
  P.provingGlow = (e, x, y, o = {}, t = 0) => {
    if (o.shots) {
      const sh = [['#8cc4ff', '#ffffff', '#f2c66d'], ['#ffffff', '#9bd28a', '#8cc4ff'], ['#f2c66d', '#ffffff', '#f08a72']];
      for (let q = 0; q < o.shots; q++) {
        const px = x + 19 + q * 10, py = y - 21;
        e.fillStyle = '#f2c66d'; FX(e, px - 1, py - 1, 10, 15);
        e.fillStyle = '#1c2434'; FX(e, px, py, 8, 13);
        const im = sh[q % 3];
        e.fillStyle = im[0]; FX(e, px + 1, py + 1, 6, 3); e.fillStyle = im[1]; FX(e, px + 1, py + 5, 6, 1); FX(e, px + 1, py + 7, 5, 1); e.fillStyle = im[2]; FX(e, px + 1, py + 9, 4, 2); e.fillStyle = im[1]; FX(e, px + 1, py + 11, 6, 1);
      }
    }
    if (!o.lit) return;
    const fl = 0.85 + 0.15 * Math.sin(t / 220 + x);
    for (let r = 0; r < 8; r++) { e.fillStyle = r === 0 ? `rgba(190,225,255,${fl})` : `rgba(150,200,250,${0.9 * fl})`; FX(e, x - 3, y - 23 + r, 6, 1); }
    e.fillStyle = `rgba(255,255,255,${0.7 * fl})`; FX(e, x - 2, y - 22, 3, 1); FX(e, x - 2, y - 19, 4, 1); FX(e, x - 2, y - 17, 2, 1);
  };

  P.post = (c, x, y, o = {}) => {
    f(c, '#6e5434', x - 13, y - 3, 30, 4); f(c, '#7e6040', x - 11, y - 4, 26, 2);
    f(c, '#2a1c12', x - 10, y - 12, 1, 7); f(c, '#2a1c12', x + 9, y - 12, 1, 7);
    f(c, '#2a1c12', x - 10, y - 8, 20, 8); f(c, '#8a6440', x - 9, y - 7, 18, 6); f(c, '#a8825a', x - 9, y - 7, 18, 1); f(c, '#6a4a2a', x - 9, y - 3, 18, 2);
    for (let q = 0; q < 8; q++) { f(c, q % 2 ? '#e6d8b6' : '#b04a3a', x - 12 + q * 3, y - 19, 3, 5); f(c, q % 2 ? '#cdbd98' : '#8a3a2e', x - 12 + q * 3, y - 15, 3, 1); }
    f(c, '#2a1c12', x - 13, y - 20, 26, 1);
    f(c, '#efe6cf', x - 6, y - 9, 6, 2); f(c, '#d9cdb0', x - 5, y - 10, 5, 1); f(c, '#c0412e', x - 2, y - 9, 1, 1);
    f(c, '#2a1c12', x + 14, y - 9, 2, 9); f(c, '#2a1c12', x + 11, y - 16, 8, 8); f(c, '#3a5a9a', x + 12, y - 15, 6, 6); f(c, '#5a7ab8', x + 12, y - 15, 6, 1); f(c, '#12141a', x + 13, y - 12, 4, 1);
    f(c, '#c0412e', x + 19, y - 15, 1, 4);
  };
  P.postGlow = (e, x, y, o = {}, t = 0) => {
    if (!o.lit) return;
    e.fillStyle = '#ffd890'; FX(e, x - 9, y - 12, 2, 2); FX(e, x + 8, y - 12, 2, 2);
  };

  P.review = (c, x, y, o = {}) => {
    f(c, '#6e5434', x - 12, y - 2, 25, 3);
    f(c, '#5a564a', x - 12, y - 19, 5, 19); f(c, '#948b72', x - 11, y - 18, 3, 18); f(c, '#aa9e8a', x - 12, y - 20, 6, 2);
    f(c, '#5a564a', x + 8, y - 19, 5, 19); f(c, '#948b72', x + 9, y - 18, 3, 18); f(c, '#aa9e8a', x + 8, y - 20, 6, 2);
    f(c, '#2a1c12', x - 12, y - 22, 26, 3); f(c, '#74503e', x - 11, y - 22, 24, 1);
    f(c, '#2a1c12', x - 8, y - 19, 1, 3);
    f(c, '#26211b', x - 10, y - 16, 5, 6); f(c, '#3a342a', x - 9, y - 15, 3, 4);
    const [ap, am] = o.appr || [0, 2];
    for (let q = 0; q < am; q++) {
      const sx = x - 2 + q * 5; f(c, '#2a1c12', sx, y - 19, 1, 3);
      if (q < ap) { f(c, '#3a5a30', sx - 2, y - 16, 5, 5); f(c, '#9bd28a', sx - 1, y - 15, 3, 3); f(c, '#1b2a16', sx, y - 14, 1, 1); }
      else { f(c, '#4a4c46', sx - 2, y - 16, 5, 1); f(c, '#4a4c46', sx - 2, y - 12, 5, 1); f(c, '#4a4c46', sx - 2, y - 15, 1, 3); f(c, '#4a4c46', sx + 2, y - 15, 1, 3); }
    }
    for (let q = 0; q < (o.comments || 0); q++) { const nx = x + 9, ny = y - 16 + q * 5; f(c, '#9a8a6a', nx - 1, ny - 1, 5, 6); f(c, '#efe6cf', nx, ny, 3, 4); f(c, '#9a8a6a', nx, ny + 1, 2, 1); f(c, '#9a8a6a', nx, ny + 3, 2, 1); }
  };
  P.reviewGlow = (e, x, y, o = {}, t = 0) => {
    if (!o.ci) return;
    const fl = 0.8 + 0.2 * Math.sin(t / 110 + x);
    if (o.ci === 'fail') { e.fillStyle = `rgba(255,${90 + 20 * fl | 0},70,1)`; FX(e, x - 9, y - 15, 3, 4); e.fillStyle = '#ffc8b8'; FX(e, x - 8, y - 14, 1, 2); }
    else if (o.ci === 'ok') { e.fillStyle = 'rgba(150,205,130,.95)'; FX(e, x - 9, y - 15, 3, 4); e.fillStyle = '#e6f6d8'; FX(e, x - 8, y - 14, 1, 2); }
    else { e.fillStyle = 'rgba(255,200,110,.95)'; FX(e, x - 9, y - 15, 3, 4); }
  };
  window.PLACES = P;
})();
