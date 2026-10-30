import { chromium } from '/Users/kirubel/Documents/dev/mender/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1480, height: 1020 }, deviceScaleFactor: 2 });
p.on('pageerror', e => console.log('err', e.message));
for (const [out,q] of [['13r-inv','?v=inv'],['13r-flaky','?v=flaky'],['13r-point','?v=inv&s=point'],['13r-many','?v=many'],['13r-many-point','?v=many&s=point'],['13r-none','?v=none']]) {
  await p.goto('file://' + process.cwd() + '/13r-post.html' + q);
  await p.waitForSelector('body[data-ready]', { timeout: 20000 }); await p.waitForTimeout(400);
  await p.screenshot({ path: out + '.png' });
  await p.screenshot({ path: out + '-crop.png', clip: { x: 150, y: 0, width: 1000, height: 260 } });
}
await b.close(); console.log('ok');
