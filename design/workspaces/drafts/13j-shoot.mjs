import { chromium } from '/Users/kirubel/Documents/dev/mender/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1480, height: 1020 }, deviceScaleFactor: 2 });
p.on('console', m => console.log('c:', m.text())); p.on('pageerror', e => console.log('err', e.message));
const jobs = [['13j-crossroads',''],['13j-crossroads-point','?s=point'],['13j-crossroads-open','?s=open'],['13j-crossroads-yard','?bg=yard'],['13j-none','?v=none'],['13j-one','?v=one']];
for (const [out,q] of jobs) {
  await p.goto('file://' + process.cwd() + '/13j-crossroads.html' + q);
  await p.waitForSelector('body[data-ready]', { timeout: 20000 }); await p.waitForTimeout(500);
  await p.screenshot({ path: out + '.png' });
  if (!out.endsWith('yard')) await p.screenshot({ path: out + '-crop.png', clip: { x: 0, y: 0, width: 1480, height: 175 } });
  console.log('shot', out);
}
await b.close();
