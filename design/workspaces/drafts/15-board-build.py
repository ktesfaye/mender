# builds kit/s15/*.png (1x art pixels; the page scales them 2x, nearest) and kit/15-board-bg.png
import os, math, random
from PIL import Image
import numpy as np, cv2
K = '/Users/kirubel/Documents/dev/mender/design/workspaces/kit/'
O = K + 's15/'
B = Image.open(K + 'sprites/props-tx-village-props-billboard-01-png-x1.png').convert('RGBA')
def px(im, x, y): return im.getpixel((x, y))
OUT = (99, 71, 48); OUTD = (90, 58, 34); DK = (89, 57, 33); SH = (117, 89, 59)
random.seed(15)

def mul(c, f): return tuple(max(0, min(255, int(v * f))) for v in c[:3]) + ((c[3],) if len(c) > 3 else ())

def board():
    W = 406; FW = 390; fx = 8
    rows = {'roof': 5, 'name': 9, 'face': 51, 'post': 7}
    H = sum(rows.values()) - 0
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    # posts first
    py = 5 + 9 + 51 - 1
    for ax in (44, 372):
        for i in range(8):
            for dx in range(6):
                c = px(B, 6 + dx, 36 + (i % 7))
                if i == 0: c = mul(c, .6)
                im.putpixel((ax + dx, py + i), c)
    def plank_row(y, sy, x0, w, mulf=1.0, off=0, flip=False):
        for x in range(w):
            if x < 6: c = px(B, x, sy)
            elif x >= w - 6: c = px(B, 58 + (x - (w - 6)), sy)
            else:
                t = (x - 6 + off) % 104
                sx = 6 + (t if t < 52 else 103 - t)
                if flip: sx = 6 + 51 - (sx - 6)
                c = px(B, sx, sy)
            if c[3] == 0: continue
            im.putpixel((x0 + x, y), mul(c, mulf) if mulf != 1 else c)
    y = 5 + 9
    seq = list(range(4, 13)) + list(range(13, 23)) + list(range(13, 23)) + list(range(13, 22)) + list(range(23, 35))
    offs = [0] * 9 + [11] * 10 + [37] * 10 + [23] * 9 + [5] * 12
    for i, sy in enumerate(seq):
        plank_row(y + i, sy, fx, FW, 1.0, offs[i], flip=(offs[i] in (11, 23)))
    # name board, darker, wider than the face by 4 each side
    for i, sy in enumerate(range(4, 13)):
        plank_row(5 + i, sy, 4, 398, .66, 17)
    # roof
    c0 = (45, 26, 14); c2 = (84, 56, 38); c3 = (122, 90, 62); c4 = (34, 19, 10); c1 = (66, 42, 28)
    for yy in range(5):
        inset = [8, 5, 3, 1, 0][yy]
        for x in range(inset, W - inset):
            if yy == 0: c = c0
            elif yy == 1: c = c3 if (x % 6) else c2
            elif yy == 2: c = c0 if (x + 3) % 6 == 0 else (c2 if (x + 3) % 6 < 4 else c1)
            elif yy == 3: c = c0 if x % 6 == 0 else (c2 if x % 6 < 4 else c1)
            else: c = c4
            im.putpixel((x, yy), c)
    im.save(O + 'board.png'); print('board', im.size)

PAPER = (148, 136, 118); LOW = (144, 130, 111); HI = (131, 109, 85); FIB = (119, 97, 75)
def paper(name, w, h, tone=1.0, tear=0, curl=None, plain=False, parch=False, ragged=False):
    paperc, lowc, hic, fib, out, outd, dk, sh = PAPER, LOW, HI, FIB, OUT, OUTD, DK, SH
    if plain:
        paperc, lowc, hic, fib = (172, 166, 152), (160, 153, 138), (190, 184, 170), (140, 132, 116)
        out, outd, dk, sh = (131, 109, 85), (117, 89, 59), (110, 86, 62), (117, 89, 59)
    if parch:
        paperc, lowc, hic, fib = (232, 214, 172), (224, 204, 160), (244, 230, 194), (205, 180, 134)
        out, outd, dk, sh = (110, 78, 50), (96, 64, 38), (96, 64, 38), (125, 92, 60)
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for y in range(h):
        for x in range(w):
            if (x in (0, w - 1)) and (y in (0, h - 1)): continue
            if y == h - 1: c = sh
            elif y == h - 2: c = dk
            elif y == 0: c = out
            elif x == 0 or x == w - 1: c = out if y < h * .6 else outd
            elif y == 1: c = hic if x == 1 else paperc
            else:
                c = lowc if y > h * .62 else paperc
                if random.random() < .016: c = fib
            im.putpixel((x, y), c + (255,) if len(c) == 3 else c)
    if ragged:   # top torn edge
        for x in range(1, w - 1):
            n = random.choice([0, 0, 1, 1, 2])
            for y in range(n + 1): im.putpixel((x, y), (0, 0, 0, 0))
            im.putpixel((x, n + 1), out + (255,))
    if tear:
        t = tear
        for y in range(h):
            for x in range(w):
                d = (x - (w - 1 - t)) + (y - (h - 1 - t))
                if d > t: im.putpixel((x, y), (0, 0, 0, 0))
                elif d == t: im.putpixel((x, y), dk + (255,))
        if curl:
            hi, lo = curl
            for k in range(t - 1):          # folded-back flap, in ink
                for j in range(t - 1 - k):
                    xx = w - 1 - t + 1 + k; yy = h - 1 - t + 1 + j - 0
                    xx = w - 1 - (t - 1) + k - 0; yy = h - 1 - (t - 1) + j
                    xx = (w - 1 - t) + (k + 1); yy = (h - 1 - t) + (j + 1)
                    if (xx - (w - 1 - t)) + (yy - (h - 1 - t)) <= t - 1:
                        im.putpixel((xx, yy), lo + (255,) if (k + j) % 3 else hi + (255,))
    im.save(O + name + '.png')

def circle(name, kind):
    s = 9; im = Image.new('RGBA', (s, s), (0, 0, 0, 0)); c = 4
    for y in range(s):
        for x in range(s):
            d = math.hypot(x - c, y - c)
            if kind == 'full':
                if d < 4.3: im.putpixel((x, y), (176, 56, 46, 255) if d > 3 else (160, 44, 38, 255))
                if d >= 3.2 and d < 4.3: im.putpixel((x, y), (120, 30, 26, 255))
                if d < 2.4: im.putpixel((x, y), (200, 78, 62, 255))
                if (x, y) in ((3, 3), (4, 3)): im.putpixel((x, y), (232, 128, 104, 255))
            else:
                if 3.1 <= d < 4.3 and (x + y) % 2 == 0 or (3.1 <= d < 4.3 and d > 3.9):
                    im.putpixel((x, y), (176, 64, 52, 255))
    im.save(O + name + '.png')

def ribbon():
    im = Image.new('RGBA', (9, 15), (0, 0, 0, 0))
    g, g2, g3 = (96, 168, 92), (62, 120, 64), (160, 214, 140)
    for y in range(3, 15):                       # two tails
        for x in range(1, 4): im.putpixel((x, y), g if x != 1 else g2)
        for x in range(5, 8):
            if y < 13: im.putpixel((x, y), g if x != 7 else g2)
    for x in range(1, 4): im.putpixel((x, 14), (0, 0, 0, 0)) if x == 2 else None
    for x in range(5, 8):
        if 13 - 1 < 14: im.putpixel((x, 12), (0, 0, 0, 0)) if x == 6 else None
    for y in range(0, 4):                         # knot
        for x in range(2, 7): im.putpixel((x, y), g3 if y == 0 else g)
    for x in range(2, 7): im.putpixel((x, 3), g2)
    im.save(O + 'ribbon.png')

def pins():
    def mk(name, hi, mid, lo, glow=None):
        im = Image.new('RGBA', (5, 5), (0, 0, 0, 0))
        for (x, y, c) in [(1, 0, mid), (2, 0, hi), (3, 0, mid), (0, 1, mid), (1, 1, hi), (2, 1, hi), (3, 1, mid), (4, 1, lo),
                          (0, 2, mid), (1, 2, mid), (2, 2, mid), (3, 2, lo), (4, 2, lo), (1, 3, lo), (2, 3, lo), (3, 3, lo), (2, 4, (0, 0, 0, 90))]:
            im.putpixel((x, y), c if len(c) == 4 else c + (255,))
        im.save(O + name + '.png')
    mk('pin', (178, 172, 162), (118, 110, 104), (58, 52, 50))
    mk('pin-ember', (255, 214, 140), (255, 154, 74), (170, 80, 36))
    mk('pin-sore', (230, 150, 130), (176, 70, 56), (110, 36, 30))
    im = Image.new('RGBA', (5, 12), (0, 0, 0, 0))      # bare nail
    for x in range(5):
        im.putpixel((x, 0), (150, 142, 132, 255)); im.putpixel((x, 1), (96, 88, 84, 255))
    im.putpixel((0, 1), (60, 52, 48, 255)); im.putpixel((4, 1), (60, 52, 48, 255))
    for y in range(2, 11):
        im.putpixel((2, y), (112, 104, 98, 255)); im.putpixel((3, y), (58, 52, 48, 255))
    im.putpixel((2, 11), (58, 52, 48, 255))
    im.save(O + 'nail.png')

def slate():
    w, h = 90, 17; im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for y in range(h):
        for x in range(w):
            if (x in (0, w - 1)) and (y in (0, h - 1)): continue
            edge = min(x, y, w - 1 - x, h - 1 - y)
            if edge == 0: c = (60, 40, 24)
            elif edge == 1: c = (122, 92, 62)
            elif edge == 2: c = (92, 64, 42)
            elif edge == 3: c = (24, 28, 28)
            else:
                c = (44, 50, 50) if (x * 7 + y * 3) % 23 else (52, 58, 56)
                if y > h - 6: c = (40, 46, 46)
            im.putpixel((x, y), c + (255,))
    im.save(O + 'slate.png')

def bg():
    im = cv2.imread(K + 'bg-yard.png'); g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    mask = np.zeros(g.shape, np.uint8)
    for x0, y0, x1, y1 in [(70, 80, 620, 230), (2560, 180, 2900, 290)]:
        sub = g[y0:y1, x0:x1]; med = cv2.medianBlur(sub, 41)
        m = ((sub.astype(int) - med.astype(int)) > 7).astype(np.uint8) * 255
        mask[y0:y1, x0:x1] = cv2.dilate(m, np.ones((9, 9), np.uint8))
    cv2.imwrite(K + '15-board-bg.png', cv2.inpaint(im, mask, 7, cv2.INPAINT_TELEA))

board(); circle('seal-full', 'full'); circle('seal-empty', 'empty'); ribbon(); pins(); slate(); bg()
# notices: small 46x37, hero 134x49, scrap, fresh, curled, parchment, slips
paper('n-small', 46, 37)
paper('n-torn', 46, 37, tear=10)
paper('n-broken', 46, 37, tear=13, curl=((214, 120, 100), (160, 64, 52)))
paper('n-fresh', 46, 37)
paper('n-scrap', 44, 33, plain=True, ragged=True)
paper('n-hero', 134, 49)
paper('slip', 15, 9, plain=True)
for i in range(3): paper('slip%d' % i, 15, 9, plain=True)
paper('parch', 350, 326, parch=True)
im = Image.open(O + 'parch.png'); w, h = im.size
d = 2
for x in range(1, w - 1):
    d = max(0, min(5, d + random.choice([-1, 0, 0, 1])))
    for y in range(h - 1 - d, h): im.putpixel((x, y), (0, 0, 0, 0))
    im.putpixel((x, h - 2 - d), (140, 104, 66, 255))
im.save(O + 'parch.png')
# slips with ink
for i in range(3):
    sl = Image.new('RGBA', (15, 9), (0, 0, 0, 0))
    for y in range(9):
        for x in range(15):
            if x in (0, 14) and y in (0, 8): continue
            edge = y in (0, 8) or x in (0, 14)
            sl.putpixel((x, y), (120, 92, 62, 255) if edge else (206, 192, 150, 255))
    for y, l in ((3, 9 - i), (5, 6 + i)):
        for x in range(2, 2 + l): sl.putpixel((x, y), (70, 48, 30, 255))
    sl.save(O + 'slip%d.png' % i)
