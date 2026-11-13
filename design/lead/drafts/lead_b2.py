from lead_b import *
import lead_b

BLOCK = (100, 74, 46)


def hull_img2(self, L, H0, n, total, complete=False, crack=False, new_lit=True, ribs_frac=1.0, stripe=False):
    sh = max(2, round(H0 / total))
    D = 6 if H0 >= 24 else 4
    h = H0 + 22 + D
    oy = H0 + 17 + D
    def lift(x):
        t = x / (L - 1)
        return round((H0 + 4) * max(0, (t - 0.58) / 0.42) ** 2.2) + round(13 * max(0, (0.2 - t) / 0.2) ** 1.5)
    def topH(x):
        t = x / (L - 1)
        return H0 + round(5 * (1 - t) ** 3 + 11 * t ** 4)
    arr = np.zeros((h, L + 2, 4), np.uint8)
    lf = [lift(x) for x in range(L)]
    tp = [topH(x) for x in range(L)]
    step = 6 if L > 100 else 5
    ribs = [x for x in range(3, L - 2, step) if x < 3 + (L - 6) * ribs_frac]
    ribset = {}
    for r in ribs:
        ribset[r] = 0; ribset[r + 1] = 1
    def put(x, k, c):
        y = oy - 1 - k
        if 0 <= y < h and 0 <= x + 1 < L + 2:
            arr[y, x + 1] = (*c, 255)
    nfull = total if complete else n
    for x in range(L):
        kp = min(tp[x], lf[x] + nfull * sh)
        if complete: kp = tp[x]
        # far side inner wall
        for k in range(kp, tp[x] + D + 1):
            if k > kp + D and not complete: break
            if complete or k <= kp + D:
                if k <= tp[x] + D:
                    c = (66, 47, 30) if ((k - kp) // 2) % 2 == 0 else (58, 41, 27)
                    if k == kp + D and not complete: c = (120, 92, 58)
                    if complete and k == tp[x] + D: c = (150, 118, 76)
                    put(x, k, c)
        # far ribs above the far planking
        if not complete and (x - 2) in ribset or (not complete and (x - 3) in ribset):
            for k in range(kp + D + 1, tp[x] + D):
                put(x, k, (74, 54, 34))
        # near planks
        for k in range(lf[x], kp):
            s_i = (k - lf[x]) // sh
            c = [min(255, v + 2) for v in WOOD[s_i % 3]]
            inrow = (k - lf[x]) % sh
            if inrow == 0 and s_i > 0: c = [v - 34 for v in c]
            elif inrow == sh - 1: c = [min(255, v + 12) for v in c]
            if (x + s_i * 9) % (15 + (s_i % 3) * 3) == 0 and inrow not in (0,): c = [v - 22 for v in c]
            if new_lit and s_i == nfull - 1 and not complete: c = [min(255, v + 22) for v in c]
            put(x, k, c)
        # exposed ribs
        for k in range(kp, tp[x]):
            if x in ribset:
                put(x, k, (136, 104, 66) if ribset[x] == 0 else (92, 68, 44))
        # ribbands
        gap = tp[x] - kp
        if not complete and gap > 8 and 4 < x < L - 6:
            for frac in (0.35, 0.72):
                kk = kp + int(gap * frac)
                put(x, kk, (176, 146, 100)); put(x, kk - 1, (110, 84, 54))
        # keel timber, following the slope
        top_k = max(lf[x] + 1, lf[min(L - 1, x + 1)] if x + 1 < L else lf[x] + 1)
        for k in range(lf[x], top_k + 1):
            put(x, k, (88, 62, 38))
        # stern post
        if x <= 2:
            for k in range(lf[x], tp[x] + 1): put(x, k, (118, 88, 56) if x else (86, 60, 38))
    if complete:
        for x in range(L):
            for k in range(tp[x] - 1, tp[x] + 1): put(x, k, WOOD_HI)
            if stripe:
                for k in range(tp[x] - 8, tp[x] - 5): put(x, k, (160, 54, 44))
        for x in range(8, L - 14, 16):
            for k in range(tp[x] + 1, tp[x] + D):
                for xx in range(x, x + 3): put(xx, k, (170, 140, 96))
    solid = arr[..., 3] > 0
    pad = np.pad(solid, 1)
    ol = ~solid & (pad[:-2, 1:-1] | pad[2:, 1:-1] | pad[1:-1, :-2] | pad[1:-1, 2:])
    arr[ol] = (*OUTLINE, 255)
    im = Image.fromarray(arr, 'RGBA')
    if crack:
        cx = L // 2
        dr = ImageDraw.Draw(im)
        pts = [(cx + 2, oy - 1 - lf[cx]), (cx, oy - 4 - lf[cx]), (cx + 3, oy - 7 - lf[cx]), (cx + 1, oy - 10 - lf[cx]), (cx + 4, oy - 13 - lf[cx])]
        dr.line(pts, fill=(14, 8, 5, 255))
        dr.rectangle((cx + 1, oy - 9 - lf[cx], cx + 2, oy - 4 - lf[cx]), fill=(14, 8, 5, 255))
    return im, oy, tp


def hull2(self, x0, kb, L, H0, n, total, **kw):
    """kb = ground line. hull sits on blocks 5px above it."""
    base = kb - 5
    blocks = kw.pop('blocks', True)
    im, oy, tp = hull_img2(self, L, H0, n, total, **kw)
    for x in (range(int(L * .14), int(L * .6), 14) if blocks else []):
        bx = x0 + x
        self.rect(bx, base + 1, bx + 5, kb - 1, BLOCK)
        self.rect(bx, base + 1, bx + 5, base + 1, (130, 100, 64))
        for xx in range(bx - 1, bx + 7): self.px(xx, kb, OUTLINE)
        self.px(bx - 1, base + 1, OUTLINE); self.px(bx + 6, base + 1, OUTLINE)
        for yy in range(base + 1, kb): self.px(bx - 1, yy, OUTLINE); self.px(bx + 6, yy, OUTLINE)
    self.paste(im, x0 - 1, base - oy)
    return tp


def shores(self, x0, kb, L, H0, kind=2):
    for i in range(kind):
        gx = x0 + int(L * (0.30 + 0.30 * i)) - 12
        hx = gx + 12
        self.line(gx, kb, hx, kb - 5 - int(H0 * .7), (96, 70, 44))
        self.line(gx + 1, kb, hx + 1, kb - 5 - int(H0 * .7), (70, 50, 32))
        self.rect(gx - 2, kb - 1, gx + 3, kb, WOOD_LO)


def flare2(self, x, ytop):
    """a proper beacon: iron basket on the mast head with a tall hand-drawn flame."""
    for xx in range(x - 7, x + 9): self.px(xx, ytop, OUTLINE); self.px(xx, ytop + 1, (54, 42, 34))
    for i in range(6):
        self.px(x - 7 + i, ytop - 1 - i // 2, (60, 46, 36)); self.px(x + 8 - i, ytop - 1 - i // 2, (60, 46, 36))
        self.px(x - 8 + i, ytop - i // 2 - 1, OUTLINE); self.px(x + 9 - i, ytop - i // 2 - 1, OUTLINE)
    # halo
    for r in range(34, 0, -1):
        a = int(150 * (1 - r / 34.0) ** 1.8)
        for yy in range(-r, r + 1):
            for xx in range(-r, r + 1):
                if xx * xx + yy * yy <= r * r and ((xx + yy) % 2 == 0 or r < 12):
                    px_, py_ = x + xx, ytop - 14 + yy
                    if 0 <= px_ < W and 0 <= py_ < H:
                        cur = self.emit.getpixel((px_, py_))
                        if cur[3] < a: self.emit.putpixel((px_, py_), (255, 206, 130, a))
    # flame: layered tongues
    def tongue(cx, h, w, c):
        for k in range(h):
            ww = max(1, round(w * math.sin(math.pi * (0.12 + 0.88 * (k / max(1, h - 1))) ** 0.8 * 0.5 * 2 / 2 + 0.0) ** 0.9)) if False else max(1, round(w * (1 - (k / h) ** 1.6)))
            ww = max(1, round(w * (1 - (k / h)) ** 0.7 * (1 if k > 2 else .7 + k * .1)))
            for xx in range(cx - ww // 2, cx - ww // 2 + ww):
                self.px(xx, ytop - 2 - k, c, self.emit)
    tongue(x - 6, 14, 5, (230, 90, 36)); tongue(x + 6, 12, 5, (230, 90, 36)); tongue(x, 26, 12, (255, 134, 44))
    tongue(x - 3, 17, 6, (255, 170, 62)); tongue(x + 3, 15, 6, (255, 170, 62))
    tongue(x, 18, 8, (255, 206, 96)); tongue(x, 10, 4, (255, 244, 196))
    for _ in range(46):
        sx = x + self.rnd.randint(-9, 9); sy = ytop - self.rnd.randint(22, 58)
        c = self.rnd.choice([(255, 220, 140), (255, 190, 100), (255, 240, 200)])
        self.px(sx, sy, c, self.over)
        if self.rnd.random() < .35: self.px(sx, sy - 1, c, self.over)


Scene.hull = hull2
Scene.shores = shores
Scene.flare2 = flare2
Scene.hull_img = hull_img2


def finish2(self, amb=(0.27, 0.33, 0.50), amb_w=(0.38, 0.52, 0.72)):
    base = np.array(self.img).astype(float)[..., :3]
    yy, xx = np.mgrid[0:H, 0:W]
    L = np.zeros((H, W, 3)); LA = np.zeros((H, W, 3))
    for t in self.lights:
        (x, y, r, col, i, sx, sy) = t[:7]
        add = t[7] if len(t) > 7 else 0
        x0, x1 = int(max(0, x - r * sx - 2)), int(min(W, x + r * sx + 3))
        y0, y1 = int(max(0, y - r * sy - 2)), int(min(H, y + r * sy + 3))
        if x1 <= x0 or y1 <= y0: continue
        gx, gy = xx[y0:y1, x0:x1], yy[y0:y1, x0:x1]
        d = np.sqrt(((gx - x) / sx) ** 2 + ((gy - y) / sy) ** 2)
        f = np.clip(1 - d / r, 0, 1) ** 1.7 * i
        for c in range(3):
            L[y0:y1, x0:x1, c] += f * col[c] / 255.0
            LA[y0:y1, x0:x1, c] += f * add * col[c] / 255.0
    bay = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0
    B = np.tile(bay, (H // 4 + 1, W // 4 + 1))[:H, :W][..., None]
    lv = 7.0
    Lq = np.floor(L * lv + B) / lv
    LAq = np.floor(LA * lv + B) / lv
    amb_arr = np.where(self.water[..., None], np.array(amb_w), np.array(amb))
    out = base * np.clip(amb_arr + Lq * 1.05, 0, 1.4) + LAq * 95
    out = np.clip(out, 0, 255)
    res = Image.fromarray(out.astype(np.uint8), 'RGB').convert('RGBA')
    res.alpha_composite(self.emit)
    res.alpha_composite(self.over)
    return res


Scene.finish = finish2


def light2(self, x, y, r, col, i=1.0, sx=1.0, sy=1.0, add=0):
    self.lights.append((x, y, r, col, i, sx, sy, add))


Scene.light = light2
