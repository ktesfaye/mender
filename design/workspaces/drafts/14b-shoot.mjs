import { chromium } from '/Users/kirubel/Documents/dev/mender/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1480, height: 1020 }, deviceScaleFactor: 2 });
p.on('pageerror', e => console.log('err', e.message));
p.on('console', m => console.log('log', m.text()));
const only = process.argv[2];
for (const [out,q] of [['14b-rest','?state=rest'],['14b-many','?state=many&v=many'],['14b-point','?state=point'],['14b-mid','?state=mid'],['14b-picked','?state=picked'],['14b-open','?state=open'],['14b-ticket','?state=ticket'],['14b-mid2','?state=mid&t=.2'],['14b-mid3','?state=mid&t=.7']]) {
  if (only && !out.includes(only)) continue;
  await p.goto('file://' + process.cwd() + '/kit/14b-top.html' + q);
  await p.waitForSelector('body[data-ready]', { timeout: 20000 }); await p.waitForTimeout(400);
  await p.screenshot({ path: 'kit/' + out + '.png' });
  await p.screenshot({ path: 'kit/' + out + '-crop.png', clip: { x: 0, y: 0, width: 1480, height: 260 } });
}
await b.close(); console.log('ok');
