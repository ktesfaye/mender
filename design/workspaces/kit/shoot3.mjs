import { chromium } from '/Users/kirubel/Documents/dev/mender/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1480, height: 1020 }, deviceScaleFactor: 2 });
p.on('requestfailed', (r) => console.log('FAIL', r.url().slice(-80)));
p.on('pageerror', (e) => console.log('ERR', e.message));
for (const n of process.argv.slice(2)) {
  await p.goto('file://' + process.cwd() + '/' + n + '.html');
  await p.waitForSelector('body[data-ready]', { timeout: 60000 });
  await p.waitForTimeout(300);
  await p.screenshot({ path: n + '.png' });
  console.log('shot', n);
}
await b.close();
