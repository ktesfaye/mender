import { chromium } from '/Users/kirubel/Documents/dev/mender/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ args: ['--allow-file-access-from-files', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1480, height: 1020 }, deviceScaleFactor: 2 });
p.on('console', (m) => console.log('console:', m.text()));
p.on('pageerror', (e) => console.log('pageerror', e.message));
const pre = process.argv[2] || '09-column';
for (const [s, out] of [['', pre], ['hover', pre + '-hover'], ['open', pre + '-open']]) {
  await p.goto('file://' + process.cwd() + '/09-column.html' + (s ? '?s=' + s : ''));
  await p.waitForSelector('body[data-ready]', { timeout: 60000 });
  const err = await p.evaluate(() => document.body.dataset.err);
  if (err) console.log(out, 'ERR', err.slice(0, 500));
  await p.waitForTimeout(400);
  await p.screenshot({ path: out + '.png' });
  console.log('shot', out);
}
await b.close();
