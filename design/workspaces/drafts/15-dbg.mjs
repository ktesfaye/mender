import { chromium } from '/Users/kirubel/Documents/dev/mender/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1480, height: 1020 }});
await p.goto('file://' + process.cwd() + '/15-board.html?s=point');
await p.waitForSelector('body[data-ready]');
console.log(await p.evaluate(() => [...document.querySelectorAll('.n')].slice(0,2).map(n => n.outerHTML.slice(0,400) + ' ' + JSON.stringify([...n.children].map(c => [c.className, c.getBoundingClientRect().top, c.getBoundingClientRect().height])))));
await b.close();
