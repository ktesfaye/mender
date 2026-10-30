import { chromium } from '/Users/kirubel/Documents/dev/mender/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1480, height: 400 }, deviceScaleFactor: 1 });
await p.goto('file:///Users/kirubel/Documents/dev/mender/design/workspaces/kit/13h-crossroads.html'); await p.waitForSelector('body[data-ready]');
console.log(await p.evaluate(()=>{const e=[...document.images].find(i=>i.src.includes('ground-h'));const r=e.getBoundingClientRect();return [e.complete,e.naturalWidth,r.x,r.y,r.width,r.height,getComputedStyle(e).webkitMaskImage.slice(0,40)]}));
await b.close();
