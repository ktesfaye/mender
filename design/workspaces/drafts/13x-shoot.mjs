import { chromium } from '/Users/kirubel/Documents/dev/mender/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1480, height: 1020 }, deviceScaleFactor: 2 });
p.on('console', m => console.log('c:', m.text())); p.on('pageerror', e => console.log('err', e.message));
const pre = process.argv[2];
const jobs = [['', pre], ['point', pre + '-point'], ['open', pre + '-open'], ['yard', pre + '-yard']];
for (const [s, out] of jobs) {
  const q = s === 'yard' ? '?bg=yard' : (s ? '?s=' + s : '');
  await p.goto('file://' + process.cwd() + '/' + pre + '.html' + q);
  await p.waitForSelector('body[data-ready]', { timeout: 20000 }); await p.waitForTimeout(500);
  await p.screenshot({ path: out + '.png' });
  if (s !== 'yard') await p.screenshot({ path: out + '-crop.png', clip: { x: 0, y: 0, width: 1480, height: 175 } });
  console.log('shot', out);
}
await b.close();
