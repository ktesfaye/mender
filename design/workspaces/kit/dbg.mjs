import { chromium } from '/Users/kirubel/Documents/dev/mender/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const p = await b.newPage();
p.on('pageerror', (e) => console.log('ERR', e.stack.slice(0,400)));
await p.goto('file://' + process.cwd() + '/' + process.argv[2] + '.html'); await p.waitForTimeout(1500); await b.close();
