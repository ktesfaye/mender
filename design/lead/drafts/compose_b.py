import json, math, random, sys
import numpy as np
from PIL import Image
from lead_b import *

OUT = '/Users/kirubel/Documents/dev/mender/design/workspaces/kit/'

T = {
 71924: dict(key='INV-71924', title='Wash sale info under each loss', kind='story', st='work', f=4/6, step='writing the reason line under each loss', mins=22, plan='4 of 6', commits=3),
 71880: dict(key='INV-71880', title='Cost basis export drops split-day lots', kind='bug', st='you', f=3/6, step='waiting on a price rule', mins=18),
 72011: dict(key='INV-72011', title='Q4 tax doc banner copy', kind='task', st='done', mr=dict(ci='ok', have=1, need=2, talk=2), ago='', mins=0),
 71990: dict(key='INV-71990', title='Dividend reinvest toggle', kind='story', st='stuck', f=3/6, step='the same failing test, six times', mins=41, plan='3 of 6'),
 71702: dict(key='INV-71702', title='Flaky e2e on statements download', kind='bug', st='broken', f=2/6, step='fell over twice on a setup error', mins=0),
 72033: dict(key='INV-72033', title='Holdings CSV column order', kind='task', st='limit', f=4/6, step='back at 2:40pm', mins=0),
 72040: dict(key='INV-72040', title='Gift lot holding period', kind='story', st='setup', f=0, step='cutting its workspace', mins=0, secs=14),
 71650: dict(key='INV-71650', title='Rename Realized tab', kind='task', st='landed', ago='an hour ago'),
 # six more for the long shore
 71955: dict(key='INV-71955', title='Unify tax lot sort order', kind='story', st='work', f=2/5, step='sorting by acquired date', mins=9, plan='2 of 5'),
 72002: dict(key='INV-72002', title='Currency label on realized total', kind='task', st='asks', f=1/3, step='asked the lead about rounding', mins=3),
 71866: dict(key='INV-71866', title='Statements PDF footer year', kind='bug', st='done', mr=dict(ci='fail', have=0, need=2, talk=0)),
 72050: dict(key='INV-72050', title='Import mapping for Schwab lots', kind='story', st='work', f=1/7, step='reading the sample file', mins=4, plan='1 of 7'),
 71611: dict(key='INV-71611', title='Remove legacy export flag', kind='task', st='landed', ago='3h ago'),
 71977: dict(key='INV-71977', title='Short-term gain tooltip', kind='task', st='limit', f=5/6, step='back at 3:15pm'),
}

REST = [71924, 71880, 72011, 71990, 71702, 72033, 72040, 71650]
MANY = [71924, 71880, 72011, 71990, 71955, 72002, 71866,
        72050, 71702, 72033, 72040, 71977, 71650, 71611]

CONF = {
 'rest': dict(per=4, pitch=175, L=140, Hh=28, total=14, rad=70, post=46),
 'many': dict(per=7, pitch=100, L=76, Hh=16, total=8, rad=46, post=36),
}
K1, K2 = 232, 402
LAG = (282, 336)
SEAY = 446
LEAD_WARM = (255, 176, 92)


def draw_tower(s, x, y):
    """the lead's watch-house: stone shaft, timber room, tiled roof, a lamp on the ridge."""
    st = [(112, 106, 92), (100, 94, 80), (90, 84, 72)]
    w = 46
    for yy in range(y + 40, y + 98):
        for xx in range(x, x + w):
            c = st[((xx // 6) + (yy // 4)) % 3]
            if (yy // 4) % 2 == 0 and xx % 6 == 0 or (yy // 4) % 2 == 1 and xx % 6 == 3: c = (70, 64, 54)
            s.px(xx, yy, c)
    for yy in range(y + 40, y + 98): s.px(x - 1, yy, OUTLINE); s.px(x + w, yy, OUTLINE)
    for xx in range(x - 1, x + w + 1): s.px(xx, y + 98, OUTLINE)
    # door
    s.rect(x + 17, y + 76, x + 28, y + 97, OUTLINE); s.rect(x + 18, y + 77, x + 27, y + 97, (58, 38, 22))
    for yy in range(y + 77, y + 98): s.px(x + 22, yy, (46, 30, 18))
    # timber room (overhangs)
    s.rect(x - 4, y + 18, x + w + 3, y + 40, OUTLINE)
    s.rect(x - 3, y + 19, x + w + 2, y + 39, (112, 82, 50))
    for xx in range(x - 3, x + w + 3, 6): s.rect(xx, y + 19, xx, y + 39, (84, 60, 36))
    s.rect(x - 4, y + 40, x + w + 3, y + 42, OUTLINE); s.rect(x - 3, y + 40, x + w + 2, y + 41, (150, 118, 78))
    # lit window
    s.rect(x + 10, y + 23, x + w - 11, y + 35, OUTLINE)
    s.rect(x + 11, y + 24, x + w - 12, y + 34, (255, 206, 120))
    for xx in (x + 22, x + 23): s.rect(xx, y + 24, xx, y + 34, (150, 100, 50))
    s.rect(x + 11, y + 29, x + w - 12, y + 29, (150, 100, 50))
    # roof
    for r in range(18):
        inset = 2 + r // 2 if r < 14 else 9
        x0, x1 = x - 6 + inset, x + w + 5 - inset
        for xx in range(x0, x1 + 1):
            c = [(120, 98, 78), (102, 82, 66), (92, 74, 58)][((xx // 5) + r) % 3]
            if r % 3 == 2: c = tuple(v - 14 for v in c)
            s.px(xx, y + 18 - r + 1, c)
        s.px(x0 - 1, y + 18 - r + 1, OUTLINE); s.px(x1 + 1, y + 18 - r + 1, OUTLINE)
    for xx in range(x - 6, x + w + 6): s.px(xx, y + 19, OUTLINE)
    # lamp on the ridge
    for yy in range(y - 12, y + 2): s.px(x + w // 2, yy, OUTLINE); s.px(x + w // 2 + 1, yy, WOOD_LO)
    s.lantern(x + w // 2 + 1, y - 22)
    return (x + w // 2 + 1, y - 14), (x + w // 2, y + 29), (x + 22, y + 98)


def build(mode, point=None, seed=5):
    C = CONF[mode]
    ids = REST if mode == 'rest' else MANY
    s = Scene(seed)
    s.ground(0, H)
    s.earth(K1 + 2, 38)
    s.earth(K2 + 2, 38)
    s.sea(LAG[0], LAG[1])
    s.sea(SEAY, H, deep=1.0, wavy=(2, 0))
    s.foam_edge(LAG[0]); s.foam_edge(LAG[1]); s.foam_edge(SEAY)
    labels = []
    rnd = random.Random(9)
    for i, (bx, by, nm) in enumerate([(300, 150, 'Birch 02 A'), (372, 146, 'Birch 04 A'), (452, 152, 'Birch 01 A'), (520, 148, 'Birch 03 A'), (590, 150, 'Birch 05 A'), (668, 146, 'Birch 02 A'), (712, 152, 'Birch 04 B')]):
        s.paste(kit('plants/TX Village Plant - Tree %s.png' % nm), bx, by - 123 if False else by - kit('plants/TX Village Plant - Tree %s.png' % nm).height)
    # the lead
    tx, ty = 24, 66
    lamp, win, door = draw_tower(s, tx, ty)
    s.light(lamp[0], lamp[1], 70, LEAD_WARM, 1.0)
    s.light(win[0], win[1] + 4, 56, (255, 200, 110), 1.1)
    s.light(door[0] + 2, door[1] - 6, 44, LEAD_WARM, .9)
    # steps / path in front of the watch house and the lead standing at the door with a lantern
    s.person('town-d-front-0', door[0] + 18, door[1] + 4)
    s.lantern(door[0] + 31, door[1] - 16)
    s.light(door[0] + 31, door[1] - 12, 34, LEAD_WARM, .8)

    for idx, tid in enumerate(ids):
        t = T[tid]
        row, col = divmod(idx, C['per'])
        kb = K1 if row == 0 else K2
        cl = 20 + col * C['pitch']
        L, Hh, total = C['L'], C['Hh'], C['total']
        x0 = cl + 24
        pxx = cl + 10
        t['pos'] = (x0, kb, row, col)
        st = t['st']
        n = round(t.get('f', 0) * total)
        lab_x = (cl + 4) * 2
        lab_y = (kb + 12) * 2
        pt = (point == tid)
        if pt:
            s.light(x0 + L // 2, kb - Hh, int(L * .95), (255, 190, 110), .9, sx=1, sy=.7)
        wave = idx * 0.9
        rad = C['rad']
        hp = C['post']
        if st not in ('done', 'landed'):
            s.skids(x0, kb, L)
        # ---- shipwright first (behind the hull)
        vil = ['town-a', 'town-b', 'town-c', 'town-d'][idx % 4]
        flag = None
        flarecol = None
        lan_x = x0 + int(L * .30)
        if st == 'work':
            s.person(vil + '-front-%d' % (idx % 2), x0 + int(L * .55), kb - Hh + 3)
            top = s.hull(x0, kb, L, Hh, n, total)
            s.post(pxx, kb, hp)
            s.lantern(lan_x, kb - Hh - 30)
            for yy in range(kb - Hh - 30 - 3, kb - Hh - 11): pass
            s.light(lan_x, kb - Hh - 20, rad, (255, 168, 80), 1.0)
            s.light(x0 + int(L * .55), kb - Hh, rad * .5, (255, 190, 110), .4)
        elif st == 'asks':
            s.person(vil + '-front-1', x0 + int(L * .55), kb - Hh + 3)
            s.hull(x0, kb, L, Hh, n, total)
            s.post(pxx, kb, hp, flag=((236, 140, 60), 15), wave=wave)
            s.lantern(lan_x, kb - Hh - 30)
            s.light(lan_x, kb - Hh - 20, rad, (255, 168, 80), 1.0)
        elif st == 'you':
            s.person(vil + '-front-1', x0 + int(L * .55), kb - Hh + 3)
            s.hull(x0, kb, L, Hh, n, total)
            s.post(pxx, kb, hp, flag=((236, 140, 60), 16), wave=wave)
            s.lantern(lan_x, kb - Hh - 30)
            s.light(lan_x, kb - Hh - 20, rad * .8, (255, 168, 80), .8)
            s.post(pxx, kb, hp + 20)
            fy = kb - hp - 23
            s.flare(pxx, fy)
            s.light(pxx + 1, fy - 8, rad * 1.9, (255, 205, 128), 1.4)
            s.light(pxx + 1, fy - 30, 80, (255, 205, 128), .8, sx=.45, sy=1.7)
            s.light(pxx + 1, fy - 8, 40, (255, 240, 210), 1.0)
        elif st == 'stuck':
            top = s.hull(x0, kb, L, Hh, n, total)
            s.post(pxx, kb, hp)
            s.lantern(lan_x, kb - Hh - 30)
            s.light(lan_x, kb - Hh - 20, rad * .9, (255, 150, 70), .8)
            # the same short plank, six times cut and left, and the seventh in his hands
            if mode == 'rest':
                s.plank_pile(x0 + L + 8, kb + 6, 6, 14, fresh=True, same=True)
            else:
                s.plank_pile(x0 + L - 12, kb + 9, 3, 14, fresh=True, same=True)
            s.person(vil + '-walk-side-%d' % (idx % 4), x0 + int(L * .70), kb + 6, flip=False)
            px_ = x0 + int(L * .70)
            s.rect(px_ - 15, kb - 14, px_ + 12, kb - 13, (222, 196, 146)); s.rect(px_ - 15, kb - 12, px_ + 12, kb - 12, OUTLINE); s.rect(px_ - 15, kb - 15, px_ + 12, kb - 15, OUTLINE)
            # his worn track: scuffs on the ground
            for i in range(6):
                s.px(x0 + int(L * .30) + i * 7, kb + 10, (50, 56, 36)); s.px(x0 + int(L * .30) + i * 7 + 1, kb + 10, (50, 56, 36))
            s.light(px_, kb - 6, rad * .6, (255, 190, 110), .5)
            if pt:
                for i in range(6):
                    gx = x0 + 10 + i * (L - 22) // 5
                    on = i < 3
                    s.rect(gx, kb + 9, gx + 2, kb + 14, OUTLINE)
                    s.rect(gx + 1, kb + 10, gx + 1, kb + 13, (255, 170, 80) if on else (70, 56, 44))
                    if on:
                        s.light(gx + 1, kb + 11, 12, (255, 170, 80), .6)
        elif st == 'broken':
            s.hull(x0, kb, L, Hh, n, total, crack=True, new_lit=False)
            s.post(pxx, kb, hp)
            s.person(vil + '-front-0', x0 + int(L * .62), kb - Hh + 3, gray=True)
            s.smoke(x0 + L // 2 + 2, kb - 10, 6)
            s.lantern(lan_x, kb - Hh - 30, col='red', dim=.55)
            s.light(lan_x, kb - Hh - 20, rad * .5, (200, 70, 50), .6)
            s.light(x0 + L // 2 + 2, kb - 4, 30, (240, 80, 60), 1.0)
            s.post(pxx, kb, hp + 20)
            fy = kb - hp - 23
            s.flare(pxx, fy)
            s.light(pxx + 1, fy - 8, rad * 1.9, (255, 205, 128), 1.4)
            s.light(pxx + 1, fy - 30, 80, (255, 205, 128), .8, sx=.45, sy=1.7)
            s.light(pxx + 1, fy - 8, 40, (255, 240, 210), 1.0)
            # pennant hangs slack, sore red
            for yy in range(kb - hp + 8, kb - hp + 17): s.px(pxx - 2, yy, (160, 70, 58)); s.px(pxx - 3, yy, (120, 40, 30))
        elif st == 'limit':
            s.person('helper-sit-0', x0 + int(L * .62), kb - Hh + 5, gray=True)
            s.hull(x0, kb, L, Hh, n, total, new_lit=False)
            s.post(pxx, kb, hp)
            s.lantern(lan_x, kb - Hh - 30, col='red', dim=.8)
            s.light(lan_x, kb - Hh - 20, rad * .75, (210, 66, 44), .85)
        elif st == 'setup':
            hull_n = 0
            s.hull(x0, kb, L, Hh, 0, total, new_lit=False)
            s.post(pxx, kb, hp)
            s.plank_pile(x0 + int(L * .5), kb + 3, 4, 22 if mode == 'rest' else 16, fresh=True)
            s.person(vil + '-walk-side-%d' % (idx % 4), x0 + int(L * .35), kb + 4)
            px_ = x0 + int(L * .35)
            s.rect(px_ - 15, kb - 14, px_ + 12, kb - 13, (222, 196, 146)); s.rect(px_ - 15, kb - 12, px_ + 12, kb - 12, OUTLINE); s.rect(px_ - 15, kb - 15, px_ + 12, kb - 15, OUTLINE)
            s.lantern(lan_x + 8, kb - Hh - 28)
            s.light(lan_x + 8, kb - Hh - 20, rad * .9, (255, 214, 150), .9)
            s.shavings(x0 + 14, kb + 6, 14)
        elif st == 'done':
            # slip stands empty; boat sits afloat just off it
            for x in range(x0 - 8, x0 + L + 14):
                s.px(x, kb, OUTLINE); s.px(x, kb + 1, WOOD_LO); s.px(x, kb + 2, (96, 70, 44)); s.px(x, kb + 3, OUTLINE)
            s.post(pxx, kb, hp)
            wl = LAG[1] - 10 if row == 0 else H - 30
            top = s.hull(x0, wl, L, Hh, total, total, complete=True)
            deck = wl - Hh - 4
            mh = 46 if mode == 'rest' else 36
            mxx = x0 + int(L * .84)
            s.mast_furled(mxx, wl - Hh, mh, mr=t['mr'])
            s.light(mxx - 6, wl - Hh - mh + 12, 36, (255, 232, 190), .8)
            s.light(mxx - 22, wl - Hh - 12, 30, (255, 232, 190), .7)
            s.light(x0 + L // 2, wl - Hh, int(L * .8), (200, 210, 190), .55, sx=1, sy=.6)
            s.lantern(x0 + L - 4, wl - Hh - 14, col='green')
            s.light(x0 + L - 4, wl - Hh - 6, rad * .85, (150, 215, 130), .8)
            s.light(x0 + int(L * .5), wl - 4, rad * .6, (140, 190, 130), .4)
            s.light(x0 + L - 4, wl + 8, 30, (150, 215, 130), .6, sx=.5, sy=2.2)
            t['wl'] = wl
            s.afloat(x0, wl, L, Hh) if hasattr(s, 'afloat') else None
        elif st == 'landed':
            for x in range(x0 - 8, x0 + L + 14):
                s.px(x, kb, OUTLINE); s.px(x, kb + 1, WOOD_LO); s.px(x, kb + 2, (96, 70, 44)); s.px(x, kb + 3, OUTLINE)
            s.post(pxx, kb, hp)
            wy = (LAG[0] + LAG[1]) // 2 + 4 if row == 0 else H - 62
            bx = x0 + int(L * .45)
            b = kit('boat-0')
            for i in range(14):    # wake
                s.px(bx - 4 - i * 2 - 2, wy + 17 + (i % 2), (120, 160, 170));
            s.paste(b, bx, wy)
            s.light(bx + 10, wy + 18, 20, (150, 190, 205), .35, sx=1.3, sy=.8)
        if st in ('work','asks','you','stuck','setup'):
            s.light(x0 + L // 2, kb - Hh // 2, int(L * .7), (255, 176, 96), .55, sx=1.0, sy=.6)
        # label anchors
        labels.append(dict(id=tid, key=t['key'], title=t['title'], st=st, x=lab_x, y=lab_y, kind=t['kind'], row=row, col=col,
                           step=t.get('step', ''), mins=t.get('mins', 0), plan=t.get('plan', ''), secs=t.get('secs', 0),
                           mr=t.get('mr'), ago=t.get('ago', ''), px=pxx * 2, kb=kb * 2, hx=x0 * 2, hl=L * 2, wl=(t.get('wl', kb) * 2)))
    return s, labels


def afloat(self, x0, wl, L, Hh):
    # waterline: ripples over the hull foot, and a faint reflection under
    for i in range(L + 4):
        xx = x0 - 2 + i
        self.px(xx, wl, (150, 190, 200) if i % 3 else (96, 150, 168))
        self.px(xx, wl + 1, (58, 112, 138))
    img = self.img.crop((x0 - 4, wl - Hh - 40, x0 + L + 6, wl - 1)).transpose(Image.FLIP_TOP_BOTTOM)
    a = np.array(img)
    for y in range(a.shape[0]):
        for x in range(a.shape[1]):
            wy_, wx_ = wl + 3 + y, x0 - 4 + x
            if (x + y) % 2 == 0 or a[y, x, 3] == 0 or y > 30 or wy_ >= H or not self.water[wy_, wx_]:
                a[y, x, 3] = 0
            else:
                a[y, x, :3] = (a[y, x, :3] * 0.55).astype(np.uint8)
    self.paste(Image.fromarray(a, 'RGBA'), x0 - 4, wl + 3)


Scene.afloat = afloat

if __name__ == '__main__':
    mode = sys.argv[1]
    point = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2] != '0' else None
    s, labels = build(mode, point)
    res = s.finish()
    out = res.resize((W * 4, H * 4), Image.NEAREST)
    name = sys.argv[3] if len(sys.argv) > 3 else 'lead-B-scene-%s' % mode
    out.save(OUT + name + '.png')
    json.dump(labels, open(OUT + name + '.json', 'w'))
    print('ok', name)
