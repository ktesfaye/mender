# usage: python3 cut.py "<frame name or substring>" [scale]   -> writes sprites/<slug>.png (nearest-neighbour)
# lists matches with: python3 cut.py --list <substring>
import json, sys, re
from PIL import Image
A = '/Users/kirubel/Documents/dev/mender/apps/mender/assets/'
sheets = [('kit/kit-0.json', 'kit/kit-0.png'), ('folk/folk.json', 'folk/folk.png'), ('wheel/wheel.json', 'wheel/wheel.png')]
def frames():
    for j, p in sheets:
        d = json.load(open(A + j)); f = d.get('frames', d)
        items = f.items() if isinstance(f, dict) else [(x['filename'], x) for x in f]
        for k, v in items: yield k, v, p
if sys.argv[1] == '--list':
    for k, v, p in frames():
        if sys.argv[2].lower() in k.lower(): print(k)
    sys.exit()
q = sys.argv[1]; s = int(sys.argv[2]) if len(sys.argv) > 2 else 1
for k, v, p in frames():
    if k == q or q.lower() in k.lower():
        r = v['frame']; im = Image.open(A + p).crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h']))
        im = im.resize((r['w'] * s, r['h'] * s), Image.NEAREST)
        out = 'sprites/' + re.sub(r'[^a-z0-9]+', '-', k.lower()).strip('-') + f'-x{s}.png'
        im.save(out); print(out, im.size); break
else: print('no match')
