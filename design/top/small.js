// Small-scale signs (S=2) for round three. Needs lib2.js + kit.js loaded.
function board(g, t, x, y, w, dir, tone, html, o = {}) {
  const b = look(arrowBoard(w, dir), tone);
  shadowUnder(g, x, y + 12, w);
  g.drawImage(b, x, y);
  const ink = tone === 'pale' ? '#2a1708' : '#ead8b4';
  const pad = dir === 'r' ? 4 : 9;
  if (html) txt(t, x + pad, y + 0.2, html, 'sign', `height:${11 * S}px;line-height:${11 * S}px;font-size:${o.size || 13}px;color:${o.ink || ink};${o.style || ''}`);
  return b;
}
function sealS(g, x, y, col) {
  const o = 'rgba(30,14,6,.9)';
  px(g, x + 1, y, 2, 1, o); px(g, x, y + 1, 1, 2, o); px(g, x + 3, y + 1, 1, 2, o); px(g, x + 1, y + 3, 2, 1, o);
  px(g, x + 1, y + 1, 2, 2, col);
}
const NUM = (n) => `<span style="font-family:Cour;font-size:9.5px;opacity:.65;margin-right:5px">${n}</span>`;
function title(t, x, y, o = {}) {
  txt(t, x, y, 'INVEST-WEB', 'caps', `font-size:11px;letter-spacing:4px;color:#e9b84f;opacity:.9`);
  txt(t, x, y + 7, 'Reason line under each loss', 'said', `font-size:${o.size || 22}px`);
  if (o.meta !== false) txt(t, x + 0.3, y + 22, 'reason-line<span class="s">·</span>Claude Code<span class="s">·</span>14s<span class="s">·</span>3 turns', 'meta', 'font-size:11.5px');
}
function model(t, xRight, y) {
  txt(t, xRight - 140, y, 'AUTO', 'pix', `width:${140 * S}px;text-align:right;color:#e98a3a;letter-spacing:3px`);
  txt(t, xRight - 140, y + 9, 'opus 5.5 · medium<span class="s">·</span><span style="color:#9c8462">45% full</span>', 'meta', `width:${140 * S}px;text-align:right;font-size:11.5px;color:#d9c39a`);
}
function ruleLine(t, x0, x1, y, a = .2) { const d = document.createElement('div'); d.style.cssText = `position:absolute;left:${x0 * S}px;width:${(x1 - x0) * S}px;top:${y * S}px;height:1px;background:rgba(201,162,106,${a})`; t.appendChild(d); }
function miniLantern(g, x, y, lit) {
  px(g, x + 1, y, 3, 1, '#2a2a30');
  px(g, x, y + 1, 5, 6, '#1c120b'); px(g, x + 1, y + 2, 3, 4, lit); px(g, x + 2, y + 2, 1, 4, '#1c120b');
  px(g, x, y + 7, 5, 1, '#2a2a30');
}
