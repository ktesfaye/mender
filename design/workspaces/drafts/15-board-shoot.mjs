import { chromium } from '/Users/kirubel/Documents/dev/mender/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1480, height: 1020 }, deviceScaleFactor: 2 });
p.on('console', (m) => console.log('console:', m.text()));
p.on('pageerror', (e) => console.log('pageerror', e.message));
const pre = process.argv[2] || '15-board'; const page = process.argv[3] || '15-board';
for (const [s, out] of [['', pre], ['point', pre + '-point'], ['open', pre + '-open']]) {
  await p.goto('file://' + process.cwd() + '/' + page + '.html' + (s ? '?s=' + s : ''));
  await p.waitForSelector('body[data-ready]', { timeout: 60000 });
  await p.waitForTimeout(300);
  await p.screenshot({ path: out + '.png' });
  await p.screenshot({ path: out + '-crop.png', clip: { x: 0, y: 0, width: 1000, height: 230 } });
  console.log('shot', out);
}
await b.close();
