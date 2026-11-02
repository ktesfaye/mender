import { chromium } from '/Users/kirubel/Documents/dev/mender/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1480, height: 1020 }, deviceScaleFactor: 2 });
p.on('pageerror', e => console.log('err', e.message));
p.on('console', m => { if (m.type()==='error') console.log('console', m.text()) });
const shots = [['14a2-rest','?state=rest&static=1'],['14a2-many','?state=rest&v=many&static=1'],['14a2-point','?state=point&static=1'],['14a2-many-point','?state=point&v=many&static=1'],
 ['14a2-mid','?state=mid&t=.56&static=1'],['14a2-picked','?state=picked&static=1'],['14a2-open','?state=open&static=1'],['14a2-ticket','?state=pointticket&static=1'],['14a2-gate','?state=pointgate&static=1'],['14a2-arm','?state=pointarm&static=1'],['14a2-home','?state=rest&v=none&static=1']];
for (const [out,q] of shots) {
  await p.goto('file://' + process.cwd() + '/../kit/14a2-top.html' + q);
  await p.waitForSelector('body[data-ready]', { timeout: 20000 }); await p.waitForTimeout(1100);
  await p.screenshot({ path: out + '.png' });
  await p.screenshot({ path: out + '-crop.png', clip: { x: 150, y: 0, width: 1150, height: 260 } });
}
await b.close(); console.log('ok');
