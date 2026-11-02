// Signs built out of the kit's own Road Sign / Sign / Lantern sprites, stretched without their carved words.
const KIT = {};
function loadKit() {
  const names = ['road-sign-01', 'sign-01', 'lantern-01-on', 'lantern-01-off', 'sign-01-l'];
  return Promise.all(names.map((n) => new Promise((ok) => { const i = new Image(); i.onload = () => { KIT[n] = i; ok(); }; i.src = `kit/${n}.png`; })));
}
function off(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; }
function tint(c, col) { const g = c.getContext('2d'); g.globalCompositeOperation = 'source-atop'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = 'source-over'; return c; }

// An arrow board of width w (art px), pointing 'r' or 'l'. 12 tall.
function arrowBoard(w, dir = 'r') {
  const src = KIT['road-sign-01'];
  const [c, g] = off(w, 12);
  g.drawImage(src, 0, 3, 2, 12, 0, 0, 2, 12);
  for (let x = 2; x < w - 7; x++) g.drawImage(src, 2, 3, 1, 12, x, 0, 1, 12);
  g.drawImage(src, 20, 3, 7, 12, w - 7, 0, 7, 12);
  // a little grain, since stretching one column leaves it flat
  const r = rng(w * 7 + 3);
  for (let yy = 3; yy < 10; yy += 2) {
    let xx = 3 + (r() * 8 | 0);
    while (xx < w - 12) { const len = 3 + (r() * 9 | 0); g.fillStyle = r() < .5 ? 'rgba(60,35,15,.16)' : 'rgba(255,240,210,.10)'; g.fillRect(xx, yy, len, 1); xx += len + 6 + (r() * 16 | 0); }
  }
  if (dir === 'l') { const [c2, g2] = off(w, 12); g2.translate(w, 0); g2.scale(-1, 1); g2.drawImage(c, 0, 0); return c2; }
  return c;
}
// The plain double board of Sign 01, stretched to w. 20 tall.
function doubleBoard(w) {
  const src = KIT['sign-01'];
  const [c, g] = off(w, 20);
  g.drawImage(src, 0, 4, 2, 20, 0, 0, 2, 20);
  for (let x = 2; x < w - 2; x++) g.drawImage(src, 2, 4, 1, 20, x, 0, 1, 20);
  g.drawImage(src, 28, 4, 2, 20, w - 2, 0, 2, 20);
  return c;
}
// A post of height h with the kit's cap, 6 wide.
function kitPost(g, x, top, bottom) {
  const src = KIT['road-sign-01'];
  g.drawImage(src, 9, 0, 6, 3, x, top, 6, 3);
  for (let y = top + 3; y < bottom - 1; y++) g.drawImage(src, 9, 20, 6, 1, x, y, 6, 1);
  g.drawImage(src, 9, 31, 6, 1, x, bottom - 1, 6, 1);
}
function shade(c, how) {
  if (how === 'night') return tint(c, 'rgba(18,10,28,.14)');
  if (how === 'lit') { tint(c, 'rgba(255,186,80,.38)'); return c; }
  if (how === 'warm') return tint(c, 'rgba(255,160,70,.12)');
  if (how === 'bare') return tint(c, 'rgba(30,26,34,.35)');
  return c;
}
function shadowUnder(g, x, y, w) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 1, y, w - 2, 1); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + 3, y + 1, w - 6, 1); }

function look(c, how) {
  const g = c.getContext('2d');
  const wash = { pale: 'rgba(238,204,146,.50)', dim: 'rgba(14,9,20,.42)', empty: 'rgba(14,9,20,.62)', crown: 'rgba(30,16,8,.30)', ember: 'rgba(255,190,110,.30)' }[how];
  if (wash) tint(c, wash);
  return c;
}
// A row of his signpost: a board out to each side of the post, meeting at it.
function row(g, px, y, lw, rw, lTone, rTone) {
  if (lw) { const b = look(arrowBoard(lw, 'l'), lTone); shadowUnder(g, px - lw + 4, y + 12, lw); g.drawImage(b, px - lw + 4, y); }
  if (rw) { const b = look(arrowBoard(rw, 'r'), rTone); shadowUnder(g, px + 2, y + 12, rw); g.drawImage(b, px + 2, y); }
  // two nails where they meet the post
  g.fillStyle = 'rgba(30,18,10,.85)'; g.fillRect(px + 4, y + 3, 1, 1); g.fillRect(px + 4, y + 8, 1, 1);
  g.fillStyle = 'rgba(255,240,210,.35)'; g.fillRect(px + 4, y + 2, 1, 1); g.fillRect(px + 4, y + 7, 1, 1);
}
