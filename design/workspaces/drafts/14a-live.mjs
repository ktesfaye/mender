import { chromium } from '/Users/kirubel/Documents/dev/mender/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1480, height: 1020 }, deviceScaleFactor: 2 });
p.on('pageerror', e => console.log('err', e.message));
await p.goto('file://' + process.cwd() + '/../kit/14a-top.html');
await p.waitForSelector('body[data-ready]'); await p.waitForTimeout(500);
await p.mouse.move(500,60); await p.mouse.move(520,76);
await p.waitForTimeout(500);
await p.screenshot({ path: '14a-live-hover.png', clip:{x:150,y:0,width:1150,height:260} });
await p.mouse.click(520,76);
for (const t of [250,250,250,700]) { await p.waitForTimeout(t); await p.screenshot({ path: `14a-live-${t}-${Math.random().toString(36).slice(2,5)}.png`, clip:{x:150,y:0,width:1150,height:260} }); }
console.log(await p.evaluate(()=>document.body.dataset.picked));
await b.close();
