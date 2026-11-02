import { chromium } from '/Users/kirubel/Documents/dev/mender/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1480, height: 1020 }});
p.on('pageerror', e => console.log('err', e.message));
await p.goto('file://' + process.cwd() + '/../kit/14c-top.html?v=8&state=picked');
await p.waitForSelector('body[data-ready]');
console.log(await p.evaluate(()=>[...document.querySelectorAll('.rider')].map(r=>[r.parentElement.dataset.id,r.style.opacity,r.parentElement.style.transform])));
console.log(await p.evaluate(()=>[...document.querySelectorAll('img[src*="sit-0"]')].map(r=>[r.parentElement.className,r.parentElement.style.cssText.slice(0,80)])));
await b.close();
