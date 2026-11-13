import json, sys, random
from lead_b2 import *
from compose_b import T, draw_tower, LEAD_WARM, REST as _R, MANY as _M

OUT = '/Users/kirubel/Documents/dev/mender/design/workspaces/kit/'
REST = [71924, 71880, 72011, 71990, 72033, 72040, 71702, 71650]
MANY = [71924, 71880, 72011, 71990, 71955, 72002, 71866,
        72050, 72033, 71702, 72040, 71650, 71611, 71977]
CONF = {
 'rest': dict(per=4, pitch=175, L=140, H0=30, total=6, rad=70, hp=52),
 'many': dict(per=7, pitch=100, L=76, H0=18, total=6, rad=46, hp=40),
}
K1, K2 = 208, 316
SEAY = 372
FLARE = (255, 200, 120)


def build(mode, point=None, seed=5):
    C = CONF[mode]
    ids = REST if mode == 'rest' else MANY
    s = Scene(seed)
    s.ground(0, H)
    s.earth(K1 + 1, 30)
    s.earth(K2 + 1, 30)
    s.sea(SEAY, H, deep=1.0, wavy=(2, 0))
    s.foam_edge(SEAY)
    for i, (bx, by, nm) in enumerate([(300, 150, 'Birch 02 A'), (372, 146, 'Birch 04 A'), (452, 152, 'Birch 01 A'), (520, 148, 'Birch 03 A'), (590, 150, 'Birch 05 A'), (668, 146, 'Birch 02 A'), (712, 152, 'Birch 04 B')]):
        im = kit('plants/TX Village Plant - Tree %s.png' % nm)
        s.paste(im, bx, by - im.height)
    tx, ty = 24, 66
    lamp, win, door = draw_tower(s, tx, ty)
    s.light(lamp[0], lamp[1], 70, LEAD_WARM, 1.0)
    s.light(win[0], win[1] + 4, 56, (255, 200, 110), 1.1)
    s.light(door[0] + 2, door[1] - 6, 44, LEAD_WARM, .9)
    s.person('town-d-front-0', door[0] + 18, door[1] + 4)
    s.lantern(door[0] + 31, door[1] - 16)
    s.light(door[0] + 31, door[1] - 12, 34, LEAD_WARM, .8)
    labels = []
    for idx, tid in enumerate(ids):
        t = T[tid]
        row, col = divmod(idx, C['per'])
        kb = K1 if row == 0 else K2
        cl = 20 + col * C['pitch']
        L, H0, total, rad, hp = C['L'], C['H0'], C['total'], C['rad'], C['hp']
        x0 = cl + 24
        pxx = cl + 10
        st = t['st']
        n = int(t.get('f', 0) * total + 1e-6)
        wave = idx * 0.9
        pt = (point == tid)
        base = kb - 5
        lx = pxx + 13
        ly = kb - hp + 3
        vil = ['town-a', 'town-b', 'town-c', 'town-d'][idx % 4]
        fl = st in ('you', 'broken')
        ph = hp + (22 if fl else 0)
        if pt:
            s.light(x0 + L // 2, kb - H0, int(L * .95), (255, 190, 110), .9, sx=1, sy=.7)
        sx_v = x0 + int(L * .62)
        vy = base - H0 + 3
        lab_x, lab_y = (cl + 4) * 2, (kb + 12) * 2
        def lantern(col='warm', dim=1.0, i=1.0, r=None):
            s.lantern(lx, ly, col=col, dim=dim)
            s.rect(pxx + 1, ly - 1, lx + 3, ly - 1, OUTLINE); s.rect(pxx + 1, ly, lx + 3, ly, WOOD[0])
            c = {'warm': (255, 168, 80), 'red': (210, 66, 44)}[col]
            s.light(lx, ly + 8, (r or rad) , c, i)
        if st in ('done', 'landed'):
            for x in range(int(L * .14), int(L * .6), 14):
                bx = x0 + x
                s.rect(bx, base + 1, bx + 5, kb - 1, BLOCK); s.rect(bx, base + 1, bx + 5, base + 1, (130, 100, 64))
                for xx in range(bx - 1, bx + 7): s.px(xx, kb, OUTLINE)
                for yy in range(base + 1, kb): s.px(bx - 1, yy, OUTLINE); s.px(bx + 6, yy, OUTLINE)
            s.post(pxx, kb, hp)
            wl = 424
            labx2 = lab_x
            if st == 'done':
                s.hull(x0, wl + 5, L, H0, total, total, complete=True, stripe=True, blocks=False)
                mh = 52 if mode == 'rest' else 38
                mxx = x0 + int(L * .84)
                tpm = base  # placeholder
                s.mast_furled(mxx, wl - H0 + 2, mh, mr=t['mr'])
                s.lantern(x0 + L - 8, wl - H0 - 20, col='green')
                s.light(x0 + L - 6, wl - H0 - 12, rad * .9, (150, 215, 130), .9)
                s.light(x0 + L // 2, wl - H0, int(L * .9), (255, 226, 170), .7, sx=1, sy=.7)
                s.light(mxx - 10, wl - H0 - mh + 14, 38, (255, 232, 190), .9)
                # reflection
                refl = s.img.crop((x0 - 4, wl - H0 - 34, x0 + L + 6, wl + 2)).transpose(Image.FLIP_TOP_BOTTOM)
                a = np.array(refl)
                for y in range(a.shape[0]):
                    for x in range(a.shape[1]):
                        wy_, wx_ = wl + 6 + y, x0 - 4 + x
                        if (x + y) % 2 == 0 or a[y, x, 3] == 0 or y > 26 or wy_ >= H:
                            a[y, x, 3] = 0
                        else:
                            a[y, x, :3] = (a[y, x, :3] * .5).astype(np.uint8)
                s.paste(Image.fromarray(a, 'RGBA'), x0 - 4, wl + 6)
                for i in range(L + 4):
                    s.px(x0 - 2 + i, wl + 4, (150, 190, 200) if i % 3 else (96, 150, 168)); s.px(x0 - 2 + i, wl + 5, (58, 112, 138))
                lab_y = (wl + 12) * 2
            else:
                b = kit('boat-0')
                bx = x0 + int(L * .5)
                wy = 396 if row == 0 else 404
                for i in range(14):
                    s.px(bx - 4 - i * 2 - 2, wy + 17 + (i % 2), (120, 160, 170))
                s.paste(b, bx, wy)
                s.light(bx + 10, wy + 18, 24, (170, 200, 215), .5, sx=1.3, sy=.8)
                lab_y = (wl + 12) * 2
            full = True
        else:
            full = True
            tp = None
            if st == 'work' or st == 'asks' or st == 'you':
                s.person(vil + '-front-%d' % (idx % 2 if st == 'work' else 1), sx_v, vy)
            if st == 'broken':
                s.person(vil + '-front-0', sx_v, vy, gray=True)
            if st == 'limit':
                s.person('helper-sit-0', sx_v, vy + 3, gray=True)
            tp = s.hull(x0, kb, L, H0, n, total, crack=(st == 'broken'), new_lit=(st not in ('limit', 'broken')))
            s.shores(x0, kb, L, H0, 2 if n >= 1 else 1)
            s.post(pxx, kb, ph, flag=((236, 140, 60), 15) if st in ('asks', 'you') else None, wave=wave)
            if st in ('work', 'asks', 'you', 'stuck'):
                lantern(i=1.0 if st != 'you' else .8)
            if st == 'broken':
                lantern(col='red', dim=.55, i=.6, r=rad * .5)
            if st == 'limit':
                lantern(col='red', dim=.8, i=.85, r=rad * .75)
            if st == 'setup':
                lantern(i=.9)
            if st == 'stuck':
                s.plank_pile(x0 + L + 8 if mode == 'rest' else x0 + L - 12, kb + 4, 6 if mode == 'rest' else 3, 14, fresh=True, same=True)
                pv = x0 + int(L * .70)
                s.person(vil + '-walk-side-%d' % (idx % 4), pv, kb + 8)
                s.rect(pv - 15, kb - 14, pv + 12, kb - 13, (222, 196, 146)); s.rect(pv - 15, kb - 12, pv + 12, kb - 12, OUTLINE); s.rect(pv - 15, kb - 15, pv + 12, kb - 15, OUTLINE)
                s.light(pv, kb - 6, rad * .6, (255, 190, 110), .5)
                if pt:
                    for i in range(6):
                        gx = x0 + 10 + i * (L - 22) // 5
                        on = i < 3
                        s.rect(gx, kb + 8, gx + 2, kb + 13, OUTLINE)
                        s.rect(gx + 1, kb + 9, gx + 1, kb + 12, (255, 170, 80) if on else (70, 56, 44))
                        if on: s.light(gx + 1, kb + 10, 12, (255, 170, 80), .6)
            if st == 'setup':
                s.plank_pile(x0 + int(L * .55), kb + 4, 4, 22 if mode == 'rest' else 16, fresh=True)
                pv = x0 + int(L * .35)
                s.person(vil + '-walk-side-%d' % (idx % 4), pv, kb + 8)
                s.rect(pv - 15, kb - 14, pv + 12, kb - 13, (222, 196, 146)); s.rect(pv - 15, kb - 12, pv + 12, kb - 12, OUTLINE); s.rect(pv - 15, kb - 15, pv + 12, kb - 15, OUTLINE)
                s.shavings(x0 + 14, kb + 8, 14)
            if st == 'broken':
                s.smoke(x0 + L // 2 + 2, kb - 12, 6)
                s.light(x0 + L // 2 + 2, kb - 6, 34, (240, 80, 60), 1.0)
                for yy in range(kb - hp + 8, kb - hp + 17): s.px(pxx - 2, yy, (160, 70, 58)); s.px(pxx - 3, yy, (120, 40, 30))
            if st in ('work', 'asks', 'you', 'stuck', 'setup'):
                s.light(x0 + L // 2, kb - H0 // 2, int(L * .7), (255, 176, 96), .5, sx=1.0, sy=.6)
            if fl:
                fy = kb - ph - 4
                s.flare2(pxx, fy)
                s.light(pxx + 1, fy - 6, rad * 1.15, FLARE, 1.3, 1, 1, .9)
                s.light(pxx + 1, fy - 2, 40, (255, 240, 210), 1.0, 1, 1, .8)
                # warm pool on the slip, the yard and the water below
                s.light(x0 + L // 2, kb - 6, int(L * .8), FLARE, 1.0, 1, .5, .55)
                s.light(pxx + 30, kb + 4, 70, FLARE, .8, 1.4, .5, .8)
                s.light(pxx + 10, SEAY + 14, 80, FLARE, .9, 1.3, .4, .9)
                s.light(pxx + 6, SEAY + 24, 70, FLARE, .8, .3, 2.2, .9)
        labels.append(dict(id=tid, key=t['key'], title=t['title'], st=st, x=lab_x, y=lab_y if st in ('done', 'landed') else lab_y,
                           kind=t['kind'], row=row, col=col, hx=x0 * 2, hl=L * 2, slipx=(cl + 4) * 2, slipy=(kb + 12) * 2))
    return s, labels


if __name__ == '__main__':
    mode = sys.argv[1]
    point = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2] != '0' else None
    name = sys.argv[3] if len(sys.argv) > 3 else 'lead-B2-scene-%s' % mode
    s, labels = build(mode, point)
    res = s.finish()
    res.resize((W * 4, H * 4), Image.NEAREST).save(OUT + name + '.png')
    json.dump(labels, open(OUT + name + '.json', 'w'))
    print('ok', name)
