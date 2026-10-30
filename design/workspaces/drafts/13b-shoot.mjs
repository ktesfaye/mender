import { chromium } from '/Users/kirubel/Documents/dev/mender/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1480, height: 1020 }, deviceScaleFactor: 2 });
p.on('console', m => console.log('c:', m.text())); p.on('pageerror', e => console.log('err', e.message));
const pre = '13b-crossroads';
for (const [s, out] of [['', pre], ['point', pre + '-point'], ['open', pre + '-open']]) {
  await p.goto('file://' + process.cwd() + '/13b-crossroads.html' + (s ? '?s=' + s : ''));
  await p.waitForSelector('body[data-ready]'); await p.waitForTimeout(400);
  await p.screenshot({ path: out + '.png' });
  await p.screenshot({ path: out + '-crop.png', clip: { x: 0, y: 0, width: 760, height: 270 } });
  console.log('shot', out);
}
await b.close();
