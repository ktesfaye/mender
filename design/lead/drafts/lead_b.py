import json, math, random, sys
import numpy as np
from PIL import Image, ImageDraw

A = '/Users/kirubel/Documents/dev/mender/apps/mender/assets/'
W, H = 740, 510          # art px; 1 art px = 2 css px = 4 device px

OUTLINE = (72, 37, 16)
WOOD = [(119, 90, 56), (142, 110, 70), (131, 100, 63)]
WOOD_HI = (178, 150, 104)
WOOD_LO = (82, 58, 36)
SAIL = (210, 196, 162)
SAIL_SH = (180, 164, 130)
MOSS = (155, 210, 138)
SORE = (240, 138, 114)
EMBER = (255, 154, 74)

_fr = {}
for j, p in [('kit/kit-0.json', 'kit/kit-0.png'), ('folk/folk.json', 'folk/folk.png')]:
    d = json.load(open(A + j)); f = d.get('frames', d)
    for k, v in (f.items() if isinstance(f, dict) else [(x['filename'], x) for x in f]):
        _fr[k] = (v['frame'], p)
_sheets = {}


def kit(name):
    r, p = _fr[name]
    if p not in _sheets:
        _sheets[p] = Image.open(A + p).convert('RGBA')
    return _sheets[p].crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h']))


def tint(im, fn):
    a = np.array(im).astype(float)
    a[..., :3] = np.clip(fn(a[..., :3]), 0, 255)
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def grey(im, k=0.55):
    return tint(im, lambda c: (c.mean(axis=2, keepdims=True) * 0.9 + c * 0.1) * k)


LANT = 'props/TX Village Props - Lantern 01 On.png'


class Scene:
    def __init__(self, seed=3):
        self.rnd = random.Random(seed)
        self.img = Image.new('RGBA', (W, H), (0, 0, 0, 255))
        self.lights = []
        self.water = np.zeros((H, W), bool)
        self.emit = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        self.over = Image.new('RGBA', (W, H), (0, 0, 0, 0))

    def light(self, x, y, r, col, i=1.0, sx=1.0, sy=1.0):
        self.lights.append((x, y, r, col, i, sx, sy))

    def paste(self, im, x, y, layer=None):
        tgt = layer or self.img
        x, y = int(x), int(y)
        cx0, cy0 = max(0, -x), max(0, -y)
        cx1, cy1 = min(im.width, W - x), min(im.height, H - y)
        if cx1 <= cx0 or cy1 <= cy0:
            return
        tgt.alpha_composite(im.crop((cx0, cy0, cx1, cy1)), (x + cx0, y + cy0))

    def px(self, x, y, c, layer=None):
        x, y = int(x), int(y)
        if 0 <= x < W and 0 <= y < H:
            (layer or self.img).putpixel((x, y), tuple(c) + (255,) if len(c) == 3 else tuple(c))

    def line(self, x0, y0, x1, y1, c, layer=None):
        n = max(abs(x1 - x0), abs(y1 - y0), 1)
        for i in range(n + 1):
            self.px(round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n), c, layer)

    def rect(self, x0, y0, x1, y1, c, layer=None):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.px(x, y, c, layer)

    # ------------------------------------------------------------ terrain
    def ground(self, y0, y1, base=(62, 70, 44)):
        rnd = self.rnd
        a = np.array(self.img)
        n = np.random.RandomState(y0).rand(y1 - y0, W)
        reg = a[y0:y1, :, :3].astype(int)
        reg[:] = base
        reg[n < .10] = (base[0] - 8, base[1] - 8, base[2] - 6)
        reg[(n >= .10) & (n < .16)] = (base[0] + 8, base[1] + 10, base[2] + 4)
        a[y0:y1, :, :3] = reg
        self.img = Image.fromarray(a, 'RGBA')
        for _ in range((y1 - y0) * W // 90):
            x, y = rnd.randrange(W), rnd.randrange(y0 + 2, y1)
            c = rnd.choice([(80, 92, 52), (72, 84, 48), (54, 62, 40)])
            self.px(x, y, c); self.px(x, y - 1, c)
            if rnd.random() < .5: self.px(x + 1, y - 2, c)

    def sea(self, y0, y1, x0=0, x1=W, deep=1.0, wavy=(2, 2)):
        rnd = self.rnd
        a = np.array(self.img)
        for x in range(x0, x1):
            t0 = y0 + round(wavy[0] * math.sin(x / 21.0) + 1.3 * math.sin(x / 6.1 + y0))
            t1 = y1 + round(wavy[1] * math.sin(x / 17.0 + 2) + 1.2 * math.sin(x / 5.3))
            if y1 >= H: t1 = H
            for y in range(t0, t1):
                t = (y - t0) / max(1, t1 - t0)
                a[y, x, :3] = (30 - int(8 * t * deep), 62 - int(20 * t * deep), 82 - int(18 * t * deep))
                self.water[y, x] = True
            self.edge_top = getattr(self, 'edge_top', {}); self.edge_top[(y0, x)] = t0
            self.edge_top[(y1, x)] = t1
        self.img = Image.fromarray(a, 'RGBA')
        for _ in range((y1 - y0) * (x1 - x0) // 110):
            x, y = rnd.randrange(x0, x1 - 6), rnd.randrange(y0 + 4, y1 - 3)
            c = rnd.choice([(52, 98, 120), (44, 86, 108), (66, 114, 134)])
            for i in range(rnd.choice([3, 4, 5, 6])): self.px(x + i, y, c)

    def foam_edge(self, key):
        for x in range(W):
            y = self.edge_top[(key, x)]
            h = 1 + (1 if (x // 3) % 4 == 0 else 0)
            for k in range(h):
                self.px(x, y + k - 1 + (0 if h == 1 else 0), (190, 208, 208) if k == 0 else (120, 160, 168))

    def earth(self, yc, hh, x0=0, x1=W):
        a = np.array(self.img)
        rs = np.random.RandomState(yc)
        for x in range(x0, x1):
            e0 = yc - hh + round(2 * math.sin(x / 13.0) + 1.5 * math.sin(x / 4.1))
            e1 = yc + hh + round(2 * math.sin(x / 11.0 + 1) + 1.5 * math.sin(x / 3.7))
            for y in range(e0, e1):
                n = rs.rand()
                c = (86, 70, 48) if n > .2 else (74, 60, 42)
                if n > .93: c = (104, 86, 60)
                a[y, x, :3] = c
        self.img = Image.fromarray(a, 'RGBA')

    def foam(self, y, x0=0, x1=W):
        for x in range(x0, x1):
            h = 1 + int(1.4 * (1 + math.sin(x * 0.55 + y * 0.3)) / 2 + (1 if (x // 3) % 5 == 0 else 0))
            for k in range(h):
                self.px(x, y + k, (196, 214, 214) if k == 0 else (130, 170, 176))
                self.water[y + k, x] = True

    def quay(self, y, x0=0, x1=W):
        for x in range(x0, x1):
            self.px(x, y - 3, (126, 112, 90)); self.px(x, y - 2, (104, 92, 72)); self.px(x, y - 1, (88, 76, 60)); self.px(x, y, OUTLINE)
            if x % 9 == 4:
                self.px(x, y - 2, (80, 70, 54)); self.px(x, y - 3, (96, 84, 66))

    # ------------------------------------------------------------ hull
    def hull_shape(self, L, Hh):
        bot, top = [], []
        for x in range(L):
            t = x / (L - 1)
            b = 0
            if t < 0.06: b = round((0.06 - t) / 0.06 * 2)
            if t > 0.70: b = round(((t - 0.70) / 0.30) ** 1.5 * (Hh * 0.5))
            bot.append(b)
            top.append(Hh + round(Hh * .3 * t ** 3 + 3 * (1 - t) ** 4))
        return bot, top

    def hull_img(self, L, Hh, n, total, complete=False, crack=False, new_lit=True, ribs_frac=1.0):
        bot, top = self.hull_shape(L, Hh)
        D = 10 if Hh >= 24 else 6
        h = Hh + 16 + D + 10
        oy = Hh + 16 + D
        sh = max(2, round(Hh / max(total, 1)))
        Wd = L + 2
        arr = np.zeros((h, Wd, 4), np.uint8)
        ribs = [x for x in range(4, L - 3, 9 if L > 100 else 7) if x < 4 + (L - 8) * ribs_frac]
        ribset = {}
        for r in ribs:
            ribset[r] = 0; ribset[r + 1] = 1
        nt = [oy - top[x] for x in range(L)]                      # near rim y
        tap = [min(1, max(.3, (x / (L - 1)) / .08)) * min(1, max(0, (1 - x / (L - 1)) / .38)) ** 0.8 for x in range(L)]
        fr = [nt[x] - round(D * tap[x]) for x in range(L)]       # far rim y
        npt = [oy - (bot[x] + (top[x] if complete else n * sh)) for x in range(L)]   # near planked top y
        npt = [min(max(v, nt[x]), oy) for x, v in enumerate(npt)]
        fpt = [npt[x] - round(D * tap[x]) for x in range(L)]     # far planks' top y
        # far side: inner face
        for x in range(L):
            for y in range(fr[x], npt[x]):
                if y >= fpt[x]:
                    k = (y - fpt[x]) // sh
                    c = (70, 50, 32) if k % 2 == 0 else (62, 44, 28)
                    if (y - fpt[x]) % sh == sh - 1: c = (46, 32, 22)
                    if (x + k * 5) % 14 == 0: c = (44, 30, 20)
                    arr[y, x + 1] = (*c, 255)
                elif x in ribset:
                    arr[y, x + 1] = (*(78, 56, 36), 255)
        # floor / thwarts when complete
        if complete:
            for x in range(6, L - 8, 14):
                for y in range(nt[x] - 1, nt[x] + 2):
                    for xx in range(x, x + 3): arr[y, xx + 1] = (*WOOD_HI, 255)
        # near side planking
        for x in range(L):
            for k in range(bot[x], top[x]):
                y = oy - 1 - k
                s_i = (k - bot[x]) // sh
                if complete or s_i < n:
                    c = [min(255, v + 18) for v in WOOD[s_i % 3]]
                    inrow = (k - bot[x]) % sh
                    if inrow == 0 and s_i > 0: c = [v + 16 for v in c]
                    if inrow == sh - 1: c = [v - 24 for v in c]
                    if (x + s_i * 7) % (13 + (s_i % 3) * 2) == 0 and inrow < sh - 1: c = [v - 26 for v in c]
                    if new_lit and s_i == n - 1 and not complete: c = [min(255, v + 40) for v in c]
                    arr[y, x + 1] = (*c, 255)
                elif (x in ribset):
                    arr[y, x + 1] = (*((128, 98, 62) if ribset[x] == 0 else (92, 68, 44)), 255)
        # keel, sternpost, stem
        for x in range(L):
            y = oy - 1 - bot[x]
            for dy in (0, 1): arr[y - dy, x + 1] = (*WOOD_LO, 255)
        for k in range(0, top[0] + 1):
            y = oy - 1 - k
            for dx in (1, 2): arr[y, dx] = (*(110, 82, 52), 255)
        for k in range(bot[L - 1], top[L - 1] + 1):
            y = oy - 1 - k
            for dx in (L - 1, L): arr[y, dx] = (*(110, 82, 52), 255)
        # rims
        for x in range(L):
            arr[fr[x], x + 1] = (*(150, 118, 76), 255)
            if complete: arr[nt[x], x + 1] = (*WOOD_HI, 255)
        solid = arr[..., 3] > 0
        pad = np.pad(solid, 1)
        ol = ~solid & (pad[:-2, 1:-1] | pad[2:, 1:-1] | pad[1:-1, :-2] | pad[1:-1, 2:])
        arr[ol] = (*OUTLINE, 255)
        im = Image.fromarray(arr, 'RGBA')
        if crack:
            cx = L // 2
            dr = ImageDraw.Draw(im)
            pts = [(cx + 2, oy - 1), (cx, oy - 3), (cx + 3, oy - 5), (cx + 1, oy - 7), (cx + 4, oy - 9)]
            dr.line(pts, fill=(20, 12, 8, 255))
            dr.rectangle((cx + 1, oy - 6, cx + 2, oy - 3), fill=(20, 12, 8, 255))
        return im, oy, top

    def hull(self, x0, kb, L, Hh, n, total, **kw):
        im, oy, top = self.hull_img(L, Hh, n, total, **kw)
        self.paste(im, x0 - 1, kb - oy)
        return top

    def mast_furled(self, x, y_deck, h, mr=None):
        for yy in range(y_deck - h, y_deck + 4):
            self.px(x, yy, WOOD[1]); self.px(x + 1, yy, WOOD_LO); self.px(x - 1, yy, OUTLINE); self.px(x + 2, yy, OUTLINE)
        by = y_deck - 14
        L0 = 44
        for xx in range(x - L0, x - 1):
            self.px(xx, by + 1, OUTLINE); self.px(xx, by, (150, 118, 78))
            for k in range(1, 7):
                c = SAIL if k in (2, 3, 4) else SAIL_SH
                if k == 4 and xx % 6 == 0: c = (150, 136, 108)
                self.px(xx, by - k, c)
            self.px(xx, by - 7, OUTLINE)
        for yy in range(by - 6, by): self.px(x - L0 - 1, yy, OUTLINE)
        for xx in (x - 36, x - 24, x - 12, x - 5):
            for yy in range(by - 6, by + 1): self.px(xx, yy, (112, 84, 54))
        # stay to the stern
        self.line(x, y_deck - h + 2, x - L0 - 6, y_deck - 2, (96, 78, 56))
        if mr:
            ty = y_deck - h
            self.rect(x - 1, ty - 1, x + 2, ty, OUTLINE)
            self.pennant(x - 1, ty + 2, 22, MOSS if mr['ci'] == 'ok' else SORE, 6)
            yy = ty + 11
            for i in range(mr['need']):
                for yy2 in range(yy - 1, yy + 1): self.px(x - 1, yy2, (72, 58, 44))
                if i < mr['have']:
                    self.pennant(x - 1, yy, 13, (232, 223, 200), 4)
                else:
                    for dx in range(1, 7): self.px(x - dx, yy, (110, 96, 76))
                    self.rect(x - 8, yy - 1, x - 7, yy + 2, (150, 140, 120))
                yy += 7
            for i in range(mr['talk']):
                self.pennant(x - 1, yy, 8, (122, 170, 255), 3)
                yy += 6

    def pennant(self, x, y, ln, col, hgt, layer=None, wave=0.0):
        dark = tuple(max(0, int(v * .6)) for v in col)
        for i in range(ln):
            h = max(1, round(hgt * (1 - i / ln)))
            yy = y + round(math.sin(i * 0.55 + wave) * 0.9)
            self.px(x - 1 - i, yy - 1, OUTLINE, layer)
            for k in range(h):
                self.px(x - 1 - i, yy + k, col if k == 0 else dark, layer)
            self.px(x - 1 - i, yy + h, OUTLINE, layer)

    def post(self, x, kb, h=34, flag=None, wave=0.0):
        for yy in range(kb - h, kb):
            self.px(x, yy, WOOD[1]); self.px(x + 1, yy, WOOD_LO); self.px(x - 1, yy, OUTLINE); self.px(x + 2, yy, OUTLINE)
        for xx in range(x - 4, x + 6):
            self.px(xx, kb - h + 5, OUTLINE); self.px(xx, kb - h + 6, WOOD[0]); self.px(xx, kb - h + 7, OUTLINE)
        self.rect(x - 1, kb - h - 1, x + 2, kb - h - 1, OUTLINE)
        self.rect(x - 4, kb - 2, x + 5, kb - 1, WOOD_LO); self.rect(x - 5, kb, x + 6, kb, OUTLINE)
        if flag:
            col, ln = flag
            self.pennant(x - 1, kb - h + 9, ln, col, 5, wave=wave)
            return (x - 1, kb - h + 9)

    def flare(self, x, ytop, sparks=True):
        for xx in range(x - 5, x + 7): self.px(xx, ytop, OUTLINE)
        for i in range(4):
            self.px(x - 4 + i, ytop - 1 - i // 2, (36, 28, 22)); self.px(x + 5 - i, ytop - 1 - i // 2, (36, 28, 22))
        self.rect(x - 3, ytop - 1, x + 4, ytop - 1, (60, 46, 36))
        for r in range(18, 0, -1):
            a = int(120 * (1 - r / 18.0) ** 1.6)
            for yy in range(-r, r + 1):
                for xx in range(-r, r + 1):
                    if xx * xx + yy * yy <= r * r and ((xx + yy) % 2 == 0 or r < 8):
                        px_, py_ = x + xx, ytop - 8 + yy
                        if 0 <= px_ < W and 0 <= py_ < H:
                            cur = self.emit.getpixel((px_, py_))
                            if cur[3] < a: self.emit.putpixel((px_, py_), (255, 214, 140, a))
        for dx, fr in [(-2, 'flame-1'), (3, 'flame-3'), (0, 'flame-0')]:
            f = kit(fr)
            self.paste(f, x + dx - f.width // 2 + 1, ytop - 2 - f.height, self.emit)
        for _ in range(30 if sparks else 0):
            sx = x + self.rnd.randint(-6, 6); sy = ytop - self.rnd.randint(14, 44)
            c = self.rnd.choice([(255, 220, 140), (255, 190, 100), (255, 240, 200)])
            self.px(sx, sy, c, self.over)
            if self.rnd.random() < .3: self.px(sx, sy - 1, c, self.over)

    def lantern(self, x, y, col='warm', dim=1.0):
        im = kit(LANT)
        if col == 'red':
            im = tint(im, lambda c: np.stack([c[..., 0] * .95, c[..., 1] * .3, c[..., 2] * .22], -1) * dim)
        elif col == 'green':
            im = tint(im, lambda c: np.stack([c[..., 0] * .55, c[..., 1] * 1.0, c[..., 2] * .5], -1))
        self.paste(im, x - im.width // 2, y)

    def person(self, name, x, y, flip=False, gray=False, layer=None):
        im = kit(name)
        if flip: im = im.transpose(Image.FLIP_LEFT_RIGHT)
        if gray: im = grey(im, .75)
        self.paste(im, x - im.width // 2, y - im.height, layer)

    def skids(self, x0, kb, L):
        for x in range(x0 - 8, x0 + L + 14):
            self.px(x, kb, OUTLINE); self.px(x, kb + 1, WOOD_LO); self.px(x, kb + 2, (96, 70, 44)); self.px(x, kb + 3, OUTLINE)
        for x in range(x0 - 4, x0 + L + 10, 11):
            self.rect(x, kb + 4, x + 3, kb + 5, WOOD_LO)
            for i in range(4): self.px(x + i, kb + 6, OUTLINE)

    def plank_pile(self, x, y, n=3, w=18, fresh=True, same=False):
        for i in range(n):
            yy = y - i * 3
            xo = 0 if same else (1 if i % 2 else -1)
            self.rect(x + xo, yy, x + xo + w - 1, yy + 1, WOOD_HI if fresh else WOOD[1])
            self.rect(x + xo, yy + 2, x + xo + w - 1, yy + 2, OUTLINE)
            self.rect(x + xo, yy - 1, x + xo + w - 1, yy - 1, OUTLINE)
            self.px(x + xo - 1, yy, OUTLINE); self.px(x + xo - 1, yy + 1, OUTLINE); self.px(x + xo + w, yy, OUTLINE); self.px(x + xo + w, yy + 1, OUTLINE)

    def shavings(self, x, y, n=10):
        for _ in range(n):
            self.px(x + self.rnd.randint(-9, 9), y + self.rnd.randint(0, 5), self.rnd.choice([(190, 160, 110), (160, 130, 90)]))

    def smoke(self, x, y, n=5):
        for i in range(n):
            im = tint(kit('smoke-%d' % (i % 4)), lambda c: c * .4)
            self.paste(im, x + int(3 * math.sin(i * 1.3)) - i, y - i * 7 - 4, self.over)

    # ------------------------------------------------------------ lighting
    def finish(self, amb=(0.27, 0.33, 0.50), amb_w=(0.38, 0.52, 0.72)):
        base = np.array(self.img).astype(float)[..., :3]
        yy, xx = np.mgrid[0:H, 0:W]
        L = np.zeros((H, W, 3))
        for (x, y, r, col, i, sx, sy) in self.lights:
            x0, x1 = int(max(0, x - r * sx - 2)), int(min(W, x + r * sx + 3))
            y0, y1 = int(max(0, y - r * sy - 2)), int(min(H, y + r * sy + 3))
            if x1 <= x0 or y1 <= y0: continue
            gx, gy = xx[y0:y1, x0:x1], yy[y0:y1, x0:x1]
            d = np.sqrt(((gx - x) / sx) ** 2 + ((gy - y) / sy) ** 2)
            f = np.clip(1 - d / r, 0, 1) ** 1.7 * i
            for c in range(3):
                L[y0:y1, x0:x1, c] += f * col[c] / 255.0
        bay = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0
        B = np.tile(bay, (H // 4 + 1, W // 4 + 1))[:H, :W][..., None]
        lv = 7.0
        Lq = np.floor(L * lv + B) / lv
        amb_arr = np.where(self.water[..., None], np.array(amb_w), np.array(amb))
        out = np.clip(base * np.clip(amb_arr + Lq * 1.05, 0, 1.4), 0, 255)
        res = Image.fromarray(out.astype(np.uint8), 'RGB').convert('RGBA')
        res.alpha_composite(self.emit)
        res.alpha_composite(self.over)
        return res
