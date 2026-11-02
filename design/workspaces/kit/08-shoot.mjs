import { chromium } from '/Users/kirubel/Documents/dev/mender/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ args: ['--allow-file-access-from-files', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1480, height: 1020 }, deviceScaleFactor: 2 });
p.on('console', (m) => console.log('console:', m.text()));
p.on('pageerror', (e) => console.log('pageerror', e.message));
const suffix = process.argv[2] || '';
async function shot(q, out) {
  await p.goto('file://' + process.cwd() + '/08-head.html?' + q);
  await p.waitForSelector('body[data-ready]', { timeout: 60000 });
  const err = await p.evaluate(() => document.body.dataset.err); if (err) console.log('ERR', err.slice(0, 300));
  await p.waitForTimeout(400);
  await p.screenshot({ path: out });
  console.log('shot', out);
}
await shot('s=rest&m=plain', `08-head${suffix}.png`);
for (const s of ['hover', 'open']) {
  await shot(`s=${s}&m=scene`, `08-head-${s}-scene.png`);
  await shot(`s=${s}&m=glass`, `08-head-${s}${suffix}.png`);
}
await b.close();
