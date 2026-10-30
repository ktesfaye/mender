import { chromium } from '/Users/kirubel/Documents/dev/mender/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1480, height: 1020 }, deviceScaleFactor: 2 });
p.on('pageerror', e => console.log('err', e.message));
for (const c of ['line']) for (const i of ['inv','flaky']) {
  await p.goto('file://' + process.cwd() + `/13q-here.html?in=${i}`);
  await p.waitForSelector('body[data-ready]', { timeout: 20000 }); await p.waitForTimeout(400);
  const out = `13q-${i}`;
  await p.screenshot({ path: out + '.png' });
  await p.screenshot({ path: out + '-crop.png', clip: { x: 0, y: 0, width: 1480, height: 175 } });
  await p.screenshot({ path: out + '-corner.png', clip: { x: 1100, y: 0, width: 380, height: 175 } });
}
await b.close(); console.log('ok');
