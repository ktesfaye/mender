import { chromium } from '/Users/kirubel/Documents/dev/mender/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1480, height: 1020 }, deviceScaleFactor: 2 });
p.on('pageerror', e => console.log('err', e.message)); p.on('console', m => { if (m.type()==='error') console.log('c:', m.text()) });
const only = process.argv[2];
const shots = [['rest','?v=8'],['many','?v=15'],['point','?v=8&state=point'],['mid','?v=8&state=mid&t=' + (process.argv[3]||360)],['picked','?v=8&state=picked'],['open','?v=8&state=open'],['many-point','?v=15&state=point']];
for (const [n,q] of shots) {
  if (only && only!=='all' && only!==n) continue;
  await p.goto('file://' + process.cwd() + '/../kit/14c-top.html' + q);
  await p.waitForSelector('body[data-ready]', { timeout: 20000 }); await p.waitForTimeout(500);
  await p.screenshot({ path: `../kit/14c-${n}.png` });
  await p.screenshot({ path: `../kit/14c-${n}-crop.png`, clip: { x: 0, y: 0, width: 1480, height: 300 } });
}
await b.close(); console.log('ok');
