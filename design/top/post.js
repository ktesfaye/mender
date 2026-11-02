// His signpost, drawn in the kit's wood. MODE: 'rest' | 'open'
const WS = [
  { key: null, name: 'invest-web', home: true, right: 'Reason line under each loss', state: 'here', ci: 'ok' },
  { key: '71702', name: 'Flaky e2e', right: '14s', state: 'working', ci: 'fail' },
  { key: '71880', name: 'Cost basis, split day', right: '', selRight: '2 sessions', state: 'idle', ci: 'ok', note: 3 },
  { key: '72011', name: 'Q4 tax banner', right: 'done', state: 'done', ci: 'ok' },
  { key: '71655', name: 'Rebalance preview', right: '', state: 'idle' },
];

function drawPost(top, MODE, opt = {}) {
  const t = document.createElement('div');
  t.style.cssText = `position:absolute;left:0;top:0;width:${W * S}px;height:${(MODE === 'open' ? 130 : 47) * S}px`;
  top.appendChild(t);
  const PX = 297;
  const deep = MODE === 'open' ? 130 : 47; // how far down the post may draw before it is cut off
  const g = makeCanvas(t, 3);
  g.canvas.height = deep; g.canvas.style.height = deep * S + 'px';
  if (MODE === 'rest') {
    const m = `linear-gradient(to bottom, #000 0, #000 ${37 * S}px, transparent ${46 * S}px)`;
    t.style.webkitMaskImage = m; t.style.maskImage = m;
  } else {
    const m = `linear-gradient(to bottom, #000 0, #000 ${118 * S}px, transparent ${130 * S}px)`;
    g.canvas.style.webkitMaskImage = m; g.canvas.style.maskImage = m;
  }
  g.imageSmoothingEnabled = false;
  kitPost(g, PX, 1, deep + 4);

  // crown: the project, and what it thinks with
  const cw = 96, cx = PX + 3 - cw / 2;
  const cb = look(doubleBoard(cw), 'crown');
  shadowUnder(g, cx, 21, cw);
  g.drawImage(cb, cx, 2);
  txt(t, cx, 2.6, 'INVEST-WEB', 'caps', `width:${cw * S}px;text-align:center;height:${10 * S}px;line-height:${10 * S}px;font-size:15px;letter-spacing:6px;padding-left:6px;color:#f3c75e;text-shadow:0 1px 0 rgba(40,20,0,.6)`);
  txt(t, cx, 11.7, 'opus 5.5 · medium · auto', 'meta', `width:${cw * S}px;text-align:center;height:${9 * S}px;line-height:${9 * S}px;font-size:11px;color:#d9c39a`);

  // his lantern, off the crown's left end
  const lx = cx - 13;
  px(g, lx + 5, 4, 9, 1, '#2a2a30'); px(g, lx + 5, 5, 1, 2, '#2a2a30');
  g.drawImage(KIT['lantern-01-on'], lx, 6);
  glow(t, lx + 5.5, 15, 26, '#ffb347', .5);

  const pitch = 13;
  const rows = MODE === 'open' ? WS : WS.slice(0, 2);
  let gap = 0;
  rows.forEach((w, i) => {
    const y = 24 + i * pitch + gap;
    if (opt.sel === i - 1) gap += 0;
    const lw = 110, rw = w.state === 'here' ? 112 : w.right ? 60 : opt.sel === i ? 62 : 44;
    const lTone = w.state === 'here' ? 'pale' : w.state === 'working' ? 'pale' : 'dim';
    const rTone = w.state === 'here' || w.state === 'working' ? 'pale' : w.state === 'done' ? 'dim' : 'empty';
    const sel = opt.sel === i;
    row(g, PX, y, lw, rw, sel ? 'pale' : lTone, sel ? 'pale' : rTone);
    const ink = (tone) => (tone === 'pale' ? '#2a1708' : '#e7d3ad');
    const lt = sel ? 'pale' : lTone, rt = sel ? 'pale' : rTone;
    const ty = y + 1.2;
    const H = `height:${11 * S}px;line-height:${11 * S}px`;
    // left: the place (and its ticket)
    if (w.home) {
      house(g, PX - 60, y + 2, ink(lt));
    } else {
      txt(t, PX - 102, ty, `<span style="font-family:Cour;font-size:10.5px;opacity:.7;margin-right:7px">${w.key}</span>${w.name}`, 'sign', `${H};font-size:16px;color:${ink(lt)};width:${98 * S}px;text-align:right`);
    }
    // right: what is going on in there
    if (sel && w.selRight) txt(t, PX + 8, ty, w.selRight, 'sign', `${H};font-size:16px;color:#2a1708`);
    if (w.right) {
      const col = w.state === 'done' ? '#9fd18a' : w.state === 'working' && !sel ? '#7a3606' : ink(rt);
      txt(t, PX + 8, ty, w.right, 'sign', `${H};font-size:16px;color:${col}`);
    }
    // the one thing GitLab would want you to know, as a small seal on the tip
    if (w.ci === 'fail') seal(g, PX + 2 + rw - 13, y + 3, '#d0473a');
    if (w.note) seal(g, PX + 2 + rw - 13, y + 3, '#f3c75e');
    if (w.state === 'working') glow(t, PX + 30, y + 6, 22, '#ffb04a', .35);
    if (w.state === 'here') glow(t, PX + 50, y + 6, 40, '#ffd27a', .18);
    if (sel && opt.detail) { opt.detail(t, g, PX, y, rw); gap += opt.room || 0; }
  });
  return { PX, g };
}
// a small round wax seal, 5x5
function seal(g, x, y, col) {
  const o = 'rgba(30,14,6,.9)';
  px(g, x + 1, y, 3, 1, o); px(g, x, y + 1, 1, 3, o); px(g, x + 4, y + 1, 1, 3, o); px(g, x + 1, y + 4, 3, 1, o);
  px(g, x + 1, y + 1, 3, 3, col); px(g, x + 1, y + 1, 1, 1, 'rgba(255,255,255,.5)');
}
