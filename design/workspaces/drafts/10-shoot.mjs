import { chromium } from '/Users/kirubel/Documents/dev/mender/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ args: ['--allow-file-access-from-files', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1480, height: 1020 }, deviceScaleFactor: 2 });
p.on('console', (m) => console.log('console:', m.text())); p.on('pageerror', (e) => console.log('pageerror', e.message));
const sfx = process.argv[2] || '';
async function shot(q, out) {
  await p.goto('file://' + process.cwd() + '/10-bar.html?' + q);
  await p.waitForSelector('body[data-ready]', { timeout: 60000 });
  const err = await p.evaluate(() => document.body.dataset.err); if (err) console.log('ERR', err.slice(0, 300));
  await p.waitForTimeout(400); await p.screenshot({ path: out }); console.log('shot', out);
}
await shot('m=scene', '10-bar-scene.png');
await shot('m=glass&s=rest', `10-bar${sfx}.png`);
await shot('m=glass&s=hover', `10-bar-hover${sfx}.png`);
await shot('m=glass&s=open', `10-bar-open${sfx}.png`);
await b.close();
