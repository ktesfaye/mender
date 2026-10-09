"""The boats, modelled once and drawn from every heading.

A boat seen side on and flipped is a cut-out, and on a sea seen from above it
reads as one the moment it turns towards you. So each boat here is a small solid
model, a hull, a mast, sails, people, and it is drawn the way the kit draws
everything: from above and in front, a step of height lifting a pixel up the
screen, lit from the north-west, in the kit's own wood and ringed in its ink.
Sixteen headings each, so a boat coming about turns rather than flips.

Coordinates are the boat's own: `u` along the keel towards the bow, `v` across
it to starboard, `w` up from the waterline, one unit a pixel. Nothing under the
waterline is drawn; the sea covers it.

    from boats import fleet_frames
"""

from __future__ import annotations

import math

import numpy as np
from PIL import Image

HEADINGS = 16
INK = (0x48, 0x25, 0x10)
LIGHT = np.array([-0.45, -0.4, 1.0]) / np.linalg.norm([-0.45, -0.4, 1.0])


def hx(v: int) -> tuple[int, int, int]:
    return ((v >> 16) & 255, (v >> 8) & 255, v & 255)


# Light to dark. The wood is counted off the kit's own carts and docks.
RAMPS: dict[str, list[tuple[int, int, int]]] = {
    "wood": [hx(0xA28A63), hx(0x947C58), hx(0x7C6141), hx(0x63482D), hx(0x523A24)],
    "plank": [hx(0x9A8260), hx(0x8B7353), hx(0x76603F), hx(0x5F4A30)],
    "inner": [hx(0x6E5236), hx(0x5E452C), hx(0x503A24), hx(0x432F1C)],
    "rail": [hx(0xB39C74), hx(0xA28A63), hx(0x8A7150), hx(0x6E5638)],
    "mast": [hx(0x8E6E46), hx(0x775A38), hx(0x5F4429), hx(0x4C3520)],
    "red": [hx(0xC0573F), hx(0xA54734), hx(0x84372A), hx(0x652A21)],
    "blue": [hx(0x7E97A6), hx(0x66808F), hx(0x526A79), hx(0x3F5462)],
    "green": [hx(0x7E9A6A), hx(0x667F55), hx(0x526844), hx(0x3F5134)],
    "cream": [hx(0xF4EEDC), hx(0xE6DCC2), hx(0xD2C4A2), hx(0xB4A482), hx(0x968766)],
    "canvas": [hx(0xE8D9B4), hx(0xD6C49A), hx(0xBFAA7E), hx(0xA08B62)],
    "patch": [hx(0xB89466), hx(0xA07E52), hx(0x856641), hx(0x6A5034)],
    "flag": [hx(0xD84A3A), hx(0xB83C30), hx(0x942F27)],
    "log": [hx(0x9C7A50), hx(0x85663F), hx(0x6E5232), hx(0x584027)],
    "logend": [hx(0xC9A877), hx(0xB59464), hx(0x9C7C50)],
    "dark": [hx(0x3A2A1E), hx(0x2E2118), hx(0x241A13)],
    "iron": [hx(0x8C8880), hx(0x6E6A64), hx(0x55524D)],
    "rope": [hx(0x8A7A5C), hx(0x6E6048)],
    "gold": [hx(0xF2C86A), hx(0xD9A84A), hx(0xB88A36)],
}
SAILS = {"cream", "canvas", "patch", "flag"}
FOAM = (0xEA, 0xF6, 0xF2)
FOAM_SOFT = (0xBF, 0xE2, 0xE0)


class Part:
    """One solid: `fn(U, V, W)` gives where it is, and what it is made of there,
    and which way its surface faces, in the boat's own frame."""

    def __init__(self, fn, group: int, low: float = -1e9, high: float = 1e9):
        self.fn = fn
        self.group = group
        self.low = low
        self.high = high


def _norm(nu, nv, nw):
    length = np.sqrt(nu * nu + nv * nv + nw * nw) + 1e-9
    return nu / length, nv / length, nw / length


def full(shape, value):
    return np.full(shape, value, dtype=float)


# --------------------------------------------------------------------------
# Hulls
# --------------------------------------------------------------------------


class Hull:
    """A hull: pointed at the bow, a transom at the stern, flared to the
    gunwale, sheered up at either end, and hollow inside down to a floor, or
    decked over at `deck`."""

    def __init__(self, length, beam, height, *, bow=3.0, stern=1.5, transom=0.55,
                 paint="wood", stripe="red", floor=1.5, deck=None, wall=1.3):
        self.L = length
        self.B = beam
        self.H = height
        self.bow = bow
        self.stern = stern
        self.transom = transom
        self.paint = paint
        self.stripe = stripe
        self.floor = floor
        self.deck = deck
        self.wall = wall

    def half(self, t):
        fore = (self.B / 2) * np.clip(1 - np.clip(t, 0, 1) ** 2.1, 0, 1) ** 0.6
        aft = (self.B / 2) * (self.transom + (1 - self.transom)
                              * np.clip(1 - np.clip(-t, 0, 1) ** 3, 0, 1) ** 0.5)
        return np.where(t >= 0, fore, aft)

    def gunwale(self, t):
        return self.H + self.bow * np.clip(t, 0, 1) ** 2 + self.stern * np.clip(-t, 0, 1) ** 2

    def width_at(self, t, W, g):
        return self.half(t) * (0.7 + 0.3 * np.clip(W / np.maximum(g, 1), 0, 1))

    def parts(self) -> list[Part]:
        L2 = self.L / 2

        def shell(U, V, W):
            t = U / L2
            g = self.gunwale(t)
            hw = self.width_at(t, W, g)
            inside = (np.abs(t) <= 1) & (np.abs(V) <= hw) & (W <= g)
            hollow = (np.abs(V) <= hw - self.wall) & (t > -1 + 1.6 / L2)
            top = self.deck if self.deck is not None else self.floor
            hollow &= W > top
            solid = inside & ~hollow
            shape = U.shape
            mat = np.full(shape, "", dtype=object)
            nu, nv, nw = full(shape, 0.0), full(shape, 0.0), full(shape, 1.0)
            rim = solid & (W > g - 1.1)
            floor = solid & ~rim & (np.abs(V) <= hw - self.wall + 0.2) & (W <= top) & (W > top - 1.1)
            transom = solid & ~rim & (t <= -1 + 1.6 / L2) & ~floor
            side = solid & ~rim & ~floor & ~transom
            outer = side & (np.abs(V) > hw - 0.9)
            inner_wall = side & ~outer
            mat[rim] = "rail"
            mat[floor] = "plank" if self.deck is not None else "inner"
            mat[inner_wall] = "inner"
            band = outer & (W > g - 3.3) & (W <= g - 1.1)
            mat[outer] = self.paint
            if self.stripe:
                mat[band] = self.stripe
            mat[transom] = self.paint
            mat[solid & ~(rim | floor | transom | side)] = self.paint
            e = 0.02
            db = (self.half(t + e) - self.half(t - e)) / (2 * e) / L2
            sgn = np.sign(V) + (V == 0)
            ou, ov, ow = _norm(-db * sgn * sgn, sgn, full(shape, -0.3))
            nu = np.where(outer, ou, nu)
            nv = np.where(outer, ov, nv)
            nw = np.where(outer, ow, nw)
            nu = np.where(inner_wall, 0.0, nu)
            nv = np.where(inner_wall, -sgn, nv)
            nw = np.where(inner_wall, 0.0, nw)
            nu = np.where(transom, -1.0, nu)
            nv = np.where(transom, 0.0, nv)
            nw = np.where(transom, 0.0, nw)
            # Planks run along the hull; their seams are lines of shade.
            seam = (outer & ~band & (np.mod(W, 3.0) < 0.75)) | (floor & (np.mod(V + 50, 3.0) < 0.6))
            return solid, mat, (nu, nv, nw), seam

        return [Part(shell, 0, -1, self.H + max(self.bow, self.stern) + 1)]

    def waterline(self, U, V):
        t = U / (self.L / 2)
        return (np.abs(t) <= 1) & (np.abs(V) <= self.half(t) * 0.7)


def thwart(hull: Hull, u0: float, depth: float = 2.0, below: float = 1.8) -> Part:
    def fn(U, V, W):
        t = U / (hull.L / 2)
        g = hull.gunwale(t)
        hw = hull.width_at(t, W, g)
        hit = (np.abs(U - u0) <= depth / 2) & (np.abs(V) <= hw - 0.3) & (W <= g - below) & (W > g - below - 1.2)
        shape = U.shape
        return hit, np.full(shape, "rail", dtype=object), (full(shape, 0), full(shape, 0), full(shape, 1)), None

    return Part(fn, 0, -1, hull.H + hull.bow + 1)


# --------------------------------------------------------------------------
# Spars, sails and the rest
# --------------------------------------------------------------------------


def spar(p0, p1, r: float, mat: str, group: int = 1) -> Part:
    """A round pole from one point to another: a mast, a boom, a yard, an oar."""
    a = np.array(p0, dtype=float)
    b = np.array(p1, dtype=float)
    d = b - a
    dd = float(d @ d) or 1.0

    def fn(U, V, W):
        pu, pv, pw = U - a[0], V - a[1], W - a[2]
        s = np.clip((pu * d[0] + pv * d[1] + pw * d[2]) / dd, 0, 1)
        qu, qv, qw = pu - s * d[0], pv - s * d[1], pw - s * d[2]
        dist2 = qu * qu + qv * qv + qw * qw
        hit = dist2 <= r * r
        shape = U.shape
        return hit, np.full(shape, mat, dtype=object), _norm(qu, qv, qw + 0.15), None

    return Part(fn, group, min(a[2], b[2]) - r - 1, max(a[2], b[2]) + r + 1)


def blade(at, along, across, size, mat="plank", group=1) -> Part:
    """The flat of an oar: a small board centred on `at`."""
    c = np.array(at, dtype=float)
    a = np.array(along, dtype=float)
    a /= np.linalg.norm(a)
    n = np.array(across, dtype=float)
    n /= np.linalg.norm(n)
    b = np.cross(a, n)

    def fn(U, V, W):
        pu, pv, pw = U - c[0], V - c[1], W - c[2]
        da = pu * a[0] + pv * a[1] + pw * a[2]
        dn = pu * n[0] + pv * n[1] + pw * n[2]
        db = pu * b[0] + pv * b[1] + pw * b[2]
        hit = (np.abs(da) <= size[0]) & (np.abs(db) <= size[1]) & (np.abs(dn) <= 0.7)
        shape = U.shape
        return hit, np.full(shape, mat, dtype=object), (full(shape, n[0]), full(shape, n[1]), full(shape, n[2])), None

    return Part(fn, group)


def box(lo, hi, mat: str, group: int = 0, seams: bool = False) -> Part:
    lo = np.array(lo, dtype=float)
    hi = np.array(hi, dtype=float)
    mid = (lo + hi) / 2
    half = (hi - lo) / 2

    def fn(U, V, W):
        du, dv, dw = (U - mid[0]) / half[0], (V - mid[1]) / half[1], (W - mid[2]) / half[2]
        hit = (np.abs(du) <= 1) & (np.abs(dv) <= 1) & (np.abs(dw) <= 1)
        ax = np.argmax(np.stack([(np.abs(du) - 1) * half[0], (np.abs(dv) - 1) * half[1],
                                 (np.abs(dw) - 1) * half[2]]), axis=0)
        shape = U.shape
        nu = np.where(ax == 0, np.sign(du), 0.0)
        nv = np.where(ax == 1, np.sign(dv), 0.0)
        nw = np.where(ax == 2, np.sign(dw), 0.0)
        seam = (np.mod(W, 3.0) < 0.7) & (ax != 2) if seams else None
        return hit, np.full(shape, mat, dtype=object), (nu, nv, nw), seam

    return Part(fn, group, lo[2] - 1, hi[2] + 1)


def swung(fn, pivot: float, angle: float):
    """The same solid turned about an upright line through (pivot, 0), the way
    a boom swings out over the side, so a sail is never seen only edge on."""
    if not angle:
        return fn
    c, s = math.cos(angle), math.sin(angle)

    def turned(U, V, W):
        du = U - pivot
        hit, mat, (nu, nv, nw), seam = fn(pivot + du * c + V * s, -du * s + V * c, W)
        return hit, mat, (nu * c - nv * s, nu * s + nv * c, nw), seam

    return turned


def sail3(p0, p1, p2, belly: float, mat: str, group: int = 2, side: float = 1.0,
          panels: float = 7.0, pivot: float = 0.0, swing: float = 0.0) -> Part:
    """A three-cornered sail in the boat's centre plane, filled out to `side` by
    `belly` pixels at its fullest, swung out about `pivot` by `swing`. Points
    are (u, w)."""
    A = np.array(p0, dtype=float)
    B = np.array(p1, dtype=float)
    C = np.array(p2, dtype=float)
    det = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1])

    def fn(U, V, W):
        l1 = ((B[1] - C[1]) * (U - C[0]) + (C[0] - B[0]) * (W - C[1])) / det
        l2 = ((C[1] - A[1]) * (U - C[0]) + (A[0] - C[0]) * (W - C[1])) / det
        l3 = 1 - l1 - l2
        inside = (l1 >= 0) & (l2 >= 0) & (l3 >= 0)
        fill = 27 * np.clip(l1 * l2 * l3, 0, None)
        off = side * belly * fill ** 0.6
        hit = inside & (np.abs(V - off) <= 0.75)
        shape = U.shape
        # The cloth's slope across the belly is what shades it.
        e = 0.5
        f2 = lambda uu: side * belly * (27 * np.clip(
            (((B[1] - C[1]) * (uu - C[0]) + (C[0] - B[0]) * (W - C[1])) / det)
            * (((C[1] - A[1]) * (uu - C[0]) + (A[0] - C[0]) * (W - C[1])) / det)
            * (1 - ((B[1] - C[1]) * (uu - C[0]) + (C[0] - B[0]) * (W - C[1])) / det
               - ((C[1] - A[1]) * (uu - C[0]) + (A[0] - C[0]) * (W - C[1])) / det), 0, None)) ** 0.6
        slope = (f2(U + e) - f2(U - e)) / (2 * e)
        n = _norm(-slope, full(shape, side), full(shape, 0.15))
        seam = np.mod(W, panels) < 0.8
        return hit, np.full(shape, mat, dtype=object), n, seam

    return Part(swung(fn, pivot, swing), group, min(A[1], B[1], C[1]) - 1, max(A[1], B[1], C[1]) + 1)


def square(u0: float, w0: float, w1: float, top: float, bottom: float, belly: float,
           mat: str, group: int = 2, band: str | None = None, patches=(),
           brace: float = 0.0, mast: float | None = None) -> Part:
    """A square sail hung across the boat from a yard at `w1`, `top` and
    `bottom` its half-widths, blown forward by `belly`."""

    def fn(U, V, W):
        s = np.clip((W - w0) / (w1 - w0), 0, 1)
        half = bottom + (top - bottom) * s
        x = np.clip((V + half) / (2 * half), 0, 1)
        off = belly * np.sin(math.pi * x) * np.sin(math.pi * (0.15 + 0.85 * (1 - s))) ** 0.7
        hit = (W >= w0) & (W <= w1) & (np.abs(V) <= half) & (np.abs(U - (u0 + off)) <= 0.8)
        shape = U.shape
        mat_arr = np.full(shape, mat, dtype=object)
        if band:
            mat_arr[np.abs(s - 0.5) < 0.12] = band
        for (pv, pw, r) in patches:
            mat_arr[(np.abs(V - pv) <= r) & (np.abs(W - pw) <= r)] = "patch"
        dv = belly * math.pi * np.cos(math.pi * x) / (2 * half) * np.sin(math.pi * (0.15 + 0.85 * (1 - s))) ** 0.7
        n = _norm(full(shape, 1.0), -dv, full(shape, 0.2))
        seam = np.mod(V + 40, 6.0) < 0.8
        return hit, mat_arr, n, seam

    return Part(swung(fn, u0 if mast is None else mast, brace), group, w0 - 1, w1 + 1)


def pennant(u0: float, w0: float, length: float, phase: int, group: int = 3) -> Part:
    """A small flag at the masthead, streaming aft."""

    def fn(U, V, W):
        s = (u0 - U) / length
        wave = 0.8 * np.sin(s * 5 + phase * 2.4)
        hit = (s >= 0) & (s <= 1) & (np.abs(W - w0 - wave) <= 1.6 * (1 - s) + 0.4) & (np.abs(V) <= 0.8)
        shape = U.shape
        return hit, np.full(shape, "flag", dtype=object), (full(shape, 0), full(shape, 1), full(shape, 0.3)), None

    return Part(fn, group, w0 - 4, w0 + 4)


def logs(length: float, count: int, r: float, gap: float = 0.0) -> Part:
    pitch = 2 * r + gap
    offs = [(i - (count - 1) / 2) * pitch for i in range(count)]
    stagger = [((i * 7) % 5) - 2 for i in range(count)]

    def fn(U, V, W):
        shape = U.shape
        hit = np.zeros(shape, dtype=bool)
        nv = full(shape, 0.0)
        nw = full(shape, 1.0)
        nu = full(shape, 0.0)
        mat = np.full(shape, "log", dtype=object)
        for v0, st in zip(offs, stagger):
            end = length / 2 + st
            dv = V - v0
            dw = W - r * 0.6
            h = (dv * dv + dw * dw <= r * r) & (np.abs(U) <= end)
            new = h & ~hit
            nv = np.where(new, dv, nv)
            nw = np.where(new, dw + 0.2, nw)
            cap = new & (np.abs(U) > end - 1)
            mat[cap] = "logend"
            nu = np.where(cap, np.sign(U), nu)
            hit |= h
        return hit, mat, _norm(nu, nv, nw), None

    return Part(fn, 0, -1, 2 * r + 1)


# --------------------------------------------------------------------------
# The models
# --------------------------------------------------------------------------


class Model:
    def __init__(self, parts: list[Part], people, foot, bounds):
        self.parts = parts
        # (image, u, v, w of its lowest row, facing +1 bow or -1 stern)
        self.people = people
        self.foot = foot
        self.bounds = bounds  # umin, umax, vmax, wmax


# How far a boom is carried out over the side, and a ship's yards braced round:
# the wind is off the quarter, so a sail always shows some of its face.
SWING = 0.5
BRACE = 0.42


def sloop(frame: int, crew) -> Model:
    hull = Hull(58, 20, 7, bow=4, stern=1.5, transom=0.55, paint="wood", stripe="red")
    mast_u = 7
    top = 60
    belly = 3.4 + frame * 0.8
    parts = [
        *hull.parts(),
        thwart(hull, -18),
        thwart(hull, 2),
        spar((mast_u, 0, 1), (mast_u, 0, top), 1.15, "mast"),
        spar((mast_u, 0, 12), (mast_u - 34 * math.cos(SWING), 34 * math.sin(SWING), 12), 0.9, "mast"),
        spar((29, 0, 10), (36, 0, 9), 0.8, "mast"),
        sail3((mast_u - 1, 13), (mast_u - 1, top - 2), (mast_u - 33, 13), belly, "cream", side=1.0,
              pivot=mast_u, swing=-SWING),
        sail3((30, 11), (mast_u + 2, top - 6), (mast_u + 3, 12), belly * 0.8, "cream", group=4,
              side=1.0, pivot=30, swing=-SWING * 0.7),
        pennant(mast_u, top - 1, 9, frame),
        spar((-29, 0, 3), (-29, 0, 10), 0.8, "mast"),
        box((-30.4, -1.4, 10), (-27.6, 1.4, 13.5), "gold", group=1),
    ]
    people = [(crew[0], -21, 0, 2.5, 1)]
    return Model(parts, people, hull.waterline, (-31, 37, 14, top + 3))


def rowboat(frame: int, crew) -> Model:
    hull = Hull(32, 13, 5, bow=2.5, stern=1.0, transom=0.6, paint="wood", stripe="green")
    angle = [-0.75, -0.25, 0.75, 0.25][frame]
    lift = [0.0, 3.5, 3.5, 0.0][frame]
    parts = [*hull.parts(), thwart(hull, 1), thwart(hull, -9)]
    for side in (-1, 1):
        lock = (1, side * 5.6, 5.5)
        reach = 15
        tip = (1 + reach * math.sin(angle), side * (5.6 + reach * math.cos(angle) * 0.9), -1 + lift)
        parts.append(spar(lock, tip, 0.65, "mast", group=1))
        along = np.subtract(tip, lock)
        parts.append(blade(tip, along, (0, 0, 1), (3, 1.4), "plank", group=1))
    people = [(crew[0], 1, 0, 2.0, -1)]
    return Model(parts, people, hull.waterline, (-18, 26, 22, 30))


def fisher(frame: int, crew) -> Model:
    hull = Hull(34, 13, 5, bow=2.8, stern=1.2, transom=0.6, paint="blue", stripe="cream")
    tip = (12, 16, 32) if frame == 0 else (13, 16, 28)
    parts = [
        *hull.parts(),
        thwart(hull, -6),
        box((5, -3, 1.5), (10, 3, 5.5), "wood", seams=True),
        spar((-4, 3, 8), tip, 0.6, "mast", group=1),
        spar(tip, (tip[0] + 1, tip[1] + 3, -1), 0.5, "cream", group=3),
    ]
    people = [(crew[0], -6, 0, 2.5, 1)]
    return Model(parts, people, hull.waterline, (-19, 22, 28, 30))


def raft(frame: int, crew) -> Model:
    belly = 2.5 + frame * 0.7
    parts = [
        logs(40, 6, 2.2),
        box((-4, -10, 3), (4, -4, 6), "wood", seams=True),
        spar((4, 0, 2), (4, 0, 40), 1.0, "mast"),
        spar((4.5 + 14 * math.sin(BRACE), -14 * math.cos(BRACE), 38),
             (4.5 - 14 * math.sin(BRACE), 14 * math.cos(BRACE), 38), 0.8, "mast"),
        square(4.5, 14, 37, 13, 11, belly, "canvas", patches=((-5, 30, 2.5), (6, 21, 2)),
               brace=BRACE, mast=4),
    ]
    lean = 0.6 if frame else -0.6
    parts.append(spar((-16, 7, 18), (-16 + 8 * lean, 12, -2), 0.6, "mast", group=1))
    people = [(crew[0], -15, 3, 4.4, 1)]
    return Model(parts, people, lambda U, V: (np.abs(U) <= 21) & (np.abs(V) <= 13.5),
                 (-24, 24, 16, 42))


def ship(frame: int, crew) -> Model:
    hull = Hull(118, 34, 14, bow=7, stern=3, transom=0.6, paint="wood", stripe="cream",
                deck=10.5, wall=1.6)
    belly = 4.2 + frame * 1.0
    fore, main = 26, -14
    parts = [*hull.parts()]
    # The castle at the stern, raised over the deck, with its windows.
    parts.append(box((-60, -14, 10), (-38, 14, 21), "wood", seams=True))
    parts.append(box((-61, -15.5, 21), (-37, 15.5, 22.5), "rail"))
    parts.append(box((40, -8, 10), (50, -0.5, 15), "wood", seams=True))
    for mu, top in ((fore, 104), (main, 112)):
        parts.append(spar((mu, 0, 10), (mu, 0, top), 1.6, "mast"))
        tiers = [(top - 30, top - 6, 13, 16), (top - 66, top - 33, 19, 22)]
        for i, (w0, w1, t_half, b_half) in enumerate(tiers):
            reach = (b_half if i else t_half) + 3
            cb, sb = math.cos(BRACE), math.sin(BRACE)
            parts.append(spar((mu + 1.5 * cb + reach * sb, -reach * cb + 1.5 * sb, w1 + 1),
                              (mu + 1.5 * cb - reach * sb, reach * cb + 1.5 * sb, w1 + 1), 1.0, "mast"))
            parts.append(square(mu + 1.5, w0, w1, t_half if i == 0 else b_half, b_half if i == 0 else b_half + 2,
                                belly, "cream", band="red" if i == 1 else None, brace=BRACE, mast=mu))
        parts.append(pennant(mu, top + 1, 14, frame))
    parts.append(spar((58, 0, 19), (84, 0, 30), 1.1, "mast"))
    parts.append(sail3((82, 28), (fore + 2, 98), (fore + 6, 30), belly * 0.7, "cream", side=1.0, group=4))
    for k in range(-30, 40, 10):
        parts.append(box((k - 1.5, 16.3, 5.5), (k + 1.5, 16.9, 8), "dark", group=0))
        parts.append(box((k - 1.5, -16.9, 5.5), (k + 1.5, -16.3, 8), "dark", group=0))
    parts.append(spar((-62, 0, 14), (-62, 0, 26), 0.8, "mast"))
    parts.append(box((-63.6, -1.6, 26), (-60.4, 1.6, 30), "gold", group=1))
    people = [(crew[0], -48, -6, 22.0, 1), (crew[1], 8, 6, 10.5, -1)]
    return Model(parts, people, hull.waterline, (-66, 86, 26, 120))


# --------------------------------------------------------------------------
# Drawing
# --------------------------------------------------------------------------


def _person_view(person: dict[str, Image.Image], facing: float, seated: bool) -> Image.Image:
    """Whoever is aboard, turned the way they face on screen, from the waist
    up when they sit, since the gunwale hides the rest."""
    sx, sy = math.cos(facing), math.sin(facing)
    if sy > 0.55:
        img = person["front"]
    elif sy < -0.55:
        img = person["back"]
    else:
        img = person["side"]
        if sx < 0:
            img = img.transpose(Image.FLIP_LEFT_RIGHT)
    if seated:
        img = img.crop((0, 0, img.width, 20))
    return img


def render(model: Model, heading: float, wave: int) -> tuple[Image.Image, tuple[float, float]]:
    """Draw a model at a heading. Returns the picture and where in it the
    point on the water under the middle of the boat is."""
    c, s = math.cos(heading), math.sin(heading)
    umin, umax, vmax, wmax = model.bounds
    corners = [(u * c - v * s, u * s + v * c) for u in (umin, umax) for v in (-vmax, vmax)]
    x0 = math.floor(min(p[0] for p in corners)) - 4
    x1 = math.ceil(max(p[0] for p in corners)) + 4
    y0 = math.floor(min(p[1] for p in corners) - wmax) - 4
    y1 = math.ceil(max(p[1] for p in corners)) + 4
    width, height = x1 - x0, y1 - y0
    SX, SY = np.meshgrid(np.arange(x0, x1) + 0.5, np.arange(y0, y1) + 0.5)
    SX, SY = SX.ravel(), SY.ravel()
    n = SX.size
    depth = np.full(n, -np.inf)
    mat = np.full(n, "", dtype=object)
    normal = np.zeros((n, 3))
    group = np.full(n, -1)
    seam = np.zeros(n, dtype=bool)
    open_ = np.ones(n, dtype=bool)
    t = wmax + 1.0
    while t >= 0:
        idx = np.nonzero(open_)[0]
        if idx.size == 0:
            break
        X, Y = SX[idx], SY[idx] + t
        U = X * c + Y * s
        V = -X * s + Y * c
        W = np.full(idx.size, t)
        taken = np.zeros(idx.size, dtype=bool)
        for part in model.parts:
            if t < part.low or t > part.high:
                continue
            hit, m, (nu, nv, nw), sm = part.fn(U, V, W)
            hit = hit & ~taken
            if not hit.any():
                continue
            k = idx[hit]
            depth[k] = t
            mat[k] = m[hit] if isinstance(m, np.ndarray) else m
            nu, nv, nw = (np.broadcast_to(a, U.shape) for a in (nu, nv, nw))
            normal[k, 0] = nu[hit] * c - nv[hit] * s
            normal[k, 1] = nu[hit] * s + nv[hit] * c
            normal[k, 2] = nw[hit]
            group[k] = part.group
            if sm is not None:
                seam[k] = np.broadcast_to(sm, U.shape)[hit]
            taken |= hit
        open_[idx[taken]] = False
        t -= 0.5

    rgba = np.zeros((n, 4), dtype=np.uint8)
    filled = depth > -np.inf
    lam = normal @ LIGHT
    for name, ramp in RAMPS.items():
        sel = filled & (mat == name)
        if not sel.any():
            continue
        l = lam[sel]
        if name in SAILS:
            l = np.where(l < 0, -l * 0.55, l)
        k = len(ramp)
        tone = np.clip(((1 - (l * 0.5 + 0.5)) * 1.9 * k - 0.6).astype(int), 0, k - 1)
        tone = np.minimum(tone + seam[sel].astype(int), k - 1)
        cols = np.array(ramp, dtype=np.uint8)[tone]
        rgba[sel, :3] = cols
        rgba[sel, 3] = 255

    img = rgba.reshape(height, width, 4)
    dep = np.where(depth > -np.inf, depth, -1e6).reshape(height, width)
    grp = group.reshape(height, width)
    solid = img[:, :, 3] > 0

    # Where one part stands well in front of another, the one behind is ringed.
    edge = np.zeros_like(solid)
    for dy, dx in ((0, 1), (1, 0), (0, -1), (-1, 0)):
        nd = np.roll(np.roll(dep, dy, 0), dx, 1)
        ng = np.roll(np.roll(grp, dy, 0), dx, 1)
        edge |= solid & (ng >= 0) & (ng != grp) & (nd - dep > 2.5)
    img[edge, :3] = INK

    # Whoever is aboard, behind what is in front of them and over what is not.
    for person, u, v, w, facing in model.people:
        face = heading if facing > 0 else heading + math.pi
        sprite = _person_view(person, face, seated=not person.get("stand"))
        px = np.array(sprite.convert("RGBA"))
        wx, wy = u * c - v * s, u * s + v * c
        left = round(wx - x0 - px.shape[1] / 2)
        bottom = round(wy - w - y0)
        top = bottom - px.shape[0]
        for ry in range(px.shape[0]):
            for rx in range(px.shape[1]):
                if px[ry, rx, 3] < 128:
                    continue
                X, Yp = left + rx, top + ry
                if not (0 <= X < width and 0 <= Yp < height):
                    continue
                sy = Yp + y0 + 0.5
                tp = wy - sy
                if dep[Yp, X] <= tp + 0.75 or edge[Yp, X]:
                    if dep[Yp, X] > tp + 0.75 and grp[Yp, X] == 0:
                        continue
                    img[Yp, X] = px[ry, rx]
                    dep[Yp, X] = tp
                    grp[Yp, X] = 9

    # The kit's ink round the whole of it.
    solid = img[:, :, 3] > 0
    ring = np.zeros_like(solid)
    for dy, dx in ((0, 1), (1, 0), (0, -1), (-1, 0)):
        ring |= np.roll(np.roll(solid, dy, 0), dx, 1)
    ring &= ~solid
    img[ring] = (*INK, 255)

    # The water at the hull: foam round the waterline, broken and walking.
    X, Y = SX.reshape(height, width), SY.reshape(height, width)
    U = X * c + Y * s
    V = -X * s + Y * c
    foot = model.foot(U, V)
    grown = foot.copy()
    for dy, dx in ((0, 1), (1, 0), (0, -1), (-1, 0)):
        grown |= np.roll(np.roll(foot, dy, 0), dx, 1)
    foam = grown & (img[:, :, 3] == 0)
    jy, jx = np.indices(foam.shape)
    phase = (jx * 3 + jy * 5 + wave * 4) % 9
    img[foam & (phase < 4)] = (*FOAM, 220)
    img[foam & (phase >= 4) & (phase < 6)] = (*FOAM_SOFT, 140)

    image = Image.fromarray(img, "RGBA")
    box_ = image.getbbox()
    image = image.crop(box_)
    ax = (-x0 - box_[0]) / image.width
    ay = (-y0 - box_[1]) / image.height
    return image, (ax, ay)


BUILD = {"sloop": (sloop, 2), "row": (rowboat, 4), "raft": (raft, 2),
         "fisher": (fisher, 2), "ship": (ship, 2)}
CREW = {"sloop": ["a"], "row": ["c"], "raft": ["g"], "fisher": ["d"], "ship": ["e", "f"]}


def fleet_frames(townsfolk) -> dict[str, tuple[Image.Image, tuple[float, float]]]:
    """Every boat at every heading: `<kind>-<heading>-<frame>`, heading 0 east
    and on round clockwise, a sixteenth of a turn a step."""
    out = {}
    for kind, (build, frames) in BUILD.items():
        crew = []
        for look in CREW[kind]:
            folk = townsfolk[look]()
            person = {"front": folk["front-0"], "back": folk["back-0"], "side": folk["side-0"]}
            crew.append(person)
        if kind == "raft":
            crew[0]["stand"] = True
        for f in range(frames):
            model = build(f, crew)
            for h in range(HEADINGS):
                out[f"{kind}-{h}-{f}"] = render(model, h * 2 * math.pi / HEADINGS, f)
    return out
