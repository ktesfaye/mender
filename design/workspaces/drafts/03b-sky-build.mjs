import fs from 'fs';
const d = '/Users/kirubel/Documents/dev/mender/design/workspaces';
const t = fs.readFileSync(d + '/drafts/03b-sky-template.html', 'utf8');
const pop = fs.readFileSync(d + '/drafts/03b-sky-pop.html', 'utf8');
const out = (name, hover) => fs.writeFileSync(`${d}/kit/${name}.html`, t.replace('%%HOVER%%', `<script>window.HOVER=${hover ? 1 : 0}</script>` + (hover ? pop : '')));
const sfx = process.argv[2] || '';
out('03b-sky' + sfx, false); out('03b-sky-hover' + sfx, true);
fs.copyFileSync(d + '/drafts/03b-sky-stars.js', d + '/kit/03b-sky-stars.js');
