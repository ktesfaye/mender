#!/usr/bin/env python3
"""Cut the scroll out of the kit's own paper and timber.

The board was a stack of dock planks, and writing on timber is writing on the
one surface in the kit with the least contrast against ink. A page is what you
read. So the board is a scroll: one rod of wood at the top, one at the bottom,
and the artist's own paper hanging between them with the rods' ends jutting
out past it.

    python3 tools/make-scroll.py [--kit DIR] [--out DIR] [--width 340]

**The paper is his, held up to the light.** The kit has no parchment, but it
has six billboard notices — ten pixels by fourteen, pinned to a board, and the
only paper the artist ever drew. Their ramp is lifted here by one multiplier in
linear light, which keeps every ratio between his rungs exactly as he set them
and only changes how much light is falling on the sheet. The multiplier is
whatever puts his lightest rung at a contrast of seven against the ink every
line in this village is drawn with, because the whole reason for a page is that
you can read it.

**The rods are `Wood Log 01 H`**, widened the way `make-board.py` widened a
plank: one clean inner column repeated so the body is seamless at any width,
the real ends kept because that is where the charm lives, and a few windows of
the log's own grain laid back over the middle so it is not a painted bar.

**And the sheet is flat, because his is.** See `sheet` for the version that
was not and what killed it.

Nothing here happens at runtime. This writes `board/paper.png`, `board/rod.png`
and `board/board.json`; the app loads them like any other texture.
"""
from __future__ import annotations

import argparse
import json
import os
import random
import statistics
import sys

from PIL import Image

LOG = "props/TX Village Props - Wood Log 01 H.png"
NOTICES = [f"props/TX Village Props - Billboard Notice 0{n}.png" for n in range(1, 7)]
DOCK = "building-parts/TX Village Building - Dock 01 N 01.png"

# The rows the dock's planks meet on: each is the dark line one plank casts on
# the next. The first and last chosen bound the tiling unit.
PLANKS = [11, 21, 30, 39, 48, 57, 66, 75, 85, 95, 105]
# Columns safely inside the dock's real plank ends.
DOCK_INNER = (10, 54)
# How wide the rail's tile is. It repeats across whatever window there is.
DOCK_WIDE = 316

# The ink every line in the village is drawn with, and what the page owes it.
INK = (0x3A, 0x1D, 0x0C)
CONTRAST = 7.0

# The rod's real ends, kept at both edges of the widened log.
CAP = 6
# Columns safely inside those ends: the only part it is safe to sample.
INNER = (8, 35)
# How far each rod juts out past the paper, each side.
OVERHANG = 7
# How thick the rod is. His log is firewood at ten; a scroll's rod is a rod.
THICK = 14
# How far two rows' medians may sit apart and still be one band of the log.
BAND = 30
# One fleck every this many pixels of sheet, and how many pixels the sheet
# turns through at each side before it is facing you.
FLECK = 700
CURL = 3
# How tall the paper's tiling unit is. Tall enough that its grain does not
# read as a repeat, short enough that a board of any height lands on a row.
TILE = 48
SEED = 7


def find_kit(explicit: str | None) -> str:
    if explicit:
        return os.path.abspath(explicit)
    here = os.path.dirname(os.path.abspath(__file__))
    node = os.path.dirname(here)
    for _ in range(8):
        for name in ("assets/village-kit", "village-kit"):
            cand = os.path.join(node, name)
            if os.path.isdir(cand):
                return cand
        nxt = os.path.dirname(node)
        if nxt == node:
            break
        node = nxt
    sibling = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(
            os.path.abspath(__file__))))),
        "a-cozy-agents-village", "assets", "village-kit")
    if os.path.isdir(sibling):
        return sibling
    sys.exit("cannot find village-kit; pass --kit")


# ---------------------------------------------------------------- the light

def linear(channel: int) -> float:
    c = channel / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def gamma(value: float) -> int:
    value = max(0.0, min(1.0, value))
    c = 12.92 * value if value <= 0.0031308 else 1.055 * value ** (1 / 2.4) - 0.055
    return max(0, min(255, round(c * 255)))


def luminance(colour: tuple[int, int, int]) -> float:
    r, g, b = (linear(c) for c in colour[:3])
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def lifted(colour: tuple[int, int, int], by: float) -> tuple[int, int, int]:
    """His colour with `by` times as much light falling on it."""
    return tuple(gamma(linear(c) * by) for c in colour[:3])


def lift_for(lightest: tuple[int, int, int]) -> float:
    """How much light his paper needs before ink reads seven against it."""
    want = CONTRAST * (luminance(INK) + 0.05) - 0.05
    return want / luminance(lightest)


# ---------------------------------------------------------------- his paper

def paper_ramp(kit: str) -> list[tuple[int, int, int]]:
    """His notice paper, lightest first.

    The notices are tiny and half of each one is the writing on it, so what is
    taken is the ramp itself — every colour that covers more than a couple of
    pixels — sorted by how much light it has, with the outline dropped: an
    outline is not a surface and lifting it would grey the page's edge.
    """
    seen: dict[tuple[int, int, int], int] = {}
    for name in NOTICES:
        im = Image.open(os.path.join(kit, name)).convert("RGBA")
        for pixel in im.get_flattened_data():
            if pixel[3] > 200:
                seen[pixel[:3]] = seen.get(pixel[:3], 0) + 1
    ramp = sorted(
        (c for c, many in seen.items() if many >= 15),
        key=luminance,
        reverse=True,
    )
    # The two lightest are the sheet; below those is its shading and its
    # outline, and only the sheet is what a whole page is made of.
    return ramp[:4]


# ---------------------------------------------------------------- the sheet

def sheet(width: int, height: int, ramp: list, rng: random.Random) -> Image.Image:
    """One tile of paper: his ramp, flat, and the curl at both sides.

    **It is flat because his is.** The obvious thing to do to a big empty
    surface is texture it, and the first version of this laid fibre and flecks
    over every tile at a density derived from his own notices. That number is
    not derivable: a notice is ten pixels by fourteen and half of it is the
    writing on it, so what came back was the WRITING's variance dressed up as
    paper grain, and the sheet came out as sandpaper. What his paper actually
    is, looked at, is a flat fill, one rung of shading at the edge, and an
    outline. So that is what this is, plus a handful of flecks a whole board so
    it is a sheet rather than a fill.

    A sheet hanging off two rods turns away from you at each side, which is
    steps down his own ramp rather than a gradient — a gradient is not
    something this artist ever draws, and eight blended greys against his four
    read as a photograph of paper next to a drawing of wood.
    """
    face, near, far, edge = ramp[0], ramp[1], ramp[2], ramp[3]
    im = Image.new("RGBA", (width, height), (*face, 255))
    px = im.load()

    for _ in range(round(width * height / FLECK)):
        px[rng.randint(CURL + 2, width - CURL - 3), rng.randrange(height)] = (*near, 255)

    # The curl at each side, laid last so no fleck sits on it.
    for y in range(height):
        for x in range(width):
            into = min(x, width - 1 - x)
            if into == 0:
                px[x, y] = (*edge, 255)
            elif into == 1:
                px[x, y] = (*far, 255)
            elif into <= CURL:
                px[x, y] = (*near, 255)
    return im


def curl(width: int, rungs: list, rows: list[int]) -> Image.Image:
    """The paper where a rod is holding it: darker as it turns under.

    `rows` is one colour index per row from the rod outwards, so the shadow is
    steps of his ramp rather than an alpha wash over it.
    """
    im = Image.new("RGBA", (width, len(rows)), (0, 0, 0, 0))
    px = im.load()
    for y, rung in enumerate(rows):
        for x in range(width):
            # The same profile the sheet turns through at its sides, or the
            # strip under the rod steps in a pixel and draws a bright line
            # down the edge of the page.
            into = min(x, width - 1 - x)
            step = 3 if into == 0 else 2 if into == 1 else 1 if into <= CURL else 0
            px[x, y] = (*rungs[min(len(rungs) - 1, max(rung, step))], 255)
    return im


# ----------------------------------------------------------------- the rod

def apart(one: tuple[int, int, int], two: tuple[int, int, int]) -> int:
    return sum(abs(a - b) for a, b in zip(one, two))


def thickened(src: Image.Image, want: int) -> Image.Image:
    """His log, made a rod: its widest band repeated until it is `want` tall.

    A scroll's rod is thicker than a stick of firewood, and a log stretched is
    a log with its highlight smeared. What is safe to repeat is a row from a
    band he drew more than once, so rows are grouped into bands and every band
    grows in proportion to how wide he drew it.

    Two things decide whether that works, and both were got wrong first. A band
    is not a run of IDENTICAL rows — his log has grain in it, so the only
    identical rows are the outlines, and the rod came out with a four-pixel
    black line along the top. And it is not a run of rows with the same median
    either: adjacent rows of one band are a shade apart, so that found one band
    of two and put every spare row into it, which is a plank with a highlight.
    Rows belong to the same band when their medians are CLOSE.
    """
    if want <= src.height:
        return src
    px = src.load()
    bands: list[tuple[int, int, int]] = []
    for y in range(src.height):
        lit = [px[x, y][:3] for x in range(src.width) if px[x, y][3] > 200]
        bands.append(tuple(round(statistics.median(c[i] for c in lit)) for i in range(3)))

    runs: list[tuple[int, int]] = []
    at = 0
    while at < src.height:
        to = at
        while to + 1 < src.height and apart(bands[to + 1], bands[at]) <= BAND:
            to += 1
        runs.append((at, to - at + 1))
        at = to + 1
    # Only a band he drew twice. One row repeated four times is a stretch.
    runs = sorted((r for r in runs if r[1] > 1), key=lambda r: -r[1])
    if not runs:
        return src

    # Every band grows in proportion to how wide he drew it, so the rod gets
    # thicker without its highlight sliding or its shadow thinning out.
    order = list(range(src.height))
    spare = want - src.height
    across = sum(length for _, length in runs)
    share = [min(spare, round(spare * length / across)) for _, length in runs]
    for at in range(spare - sum(share)):
        share[at % len(share)] += 1
    for (start, _), many in zip(runs, share):
        for _ in range(many):
            order.insert(order.index(start), start)
    out = Image.new("RGBA", (src.width, len(order)), (0, 0, 0, 0))
    for y, from_y in enumerate(order):
        out.paste(src.crop((0, from_y, src.width, from_y + 1)), (0, y))
    return out


def rod(src: Image.Image, width: int, rng: random.Random) -> Image.Image:
    """The log, widened. Its ends are its ends; its middle is one column of it."""
    px = src.load()
    height = src.height
    typical = [
        tuple(statistics.median(px[x, y][c] for x in range(*INNER)) for c in range(4))
        for y in range(height)
    ]
    ranked = sorted(
        (
            sum(abs(px[x, y][c] - typical[y][c]) for y in range(height) for c in range(3)),
            x,
        )
        for x in range(*INNER)
    )
    clean = ranked[0][1]
    grainy = [x for _, x in ranked[-8:]]

    bar = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    column = src.crop((clean, 0, clean + 1, height))
    for x in range(width):
        bar.paste(column, (x, 0))
    for _ in range(rng.randint(3, 5)):
        mark = rng.randint(5, 12)
        at = max(INNER[0], min(rng.choice(grainy) - mark // 2, INNER[1] - mark))
        bar.paste(src.crop((at, 0, at + mark, height)), (rng.randint(CAP + 3, width - CAP - mark - 3), 0))
    bar.paste(src.crop((0, 0, CAP, height)), (0, 0))
    bar.paste(src.crop((src.width - CAP, 0, src.width, height)), (width - CAP, 0))

    # A window of his grain can carry a hole: the log's own outline rows have a
    # transparent pixel or two where its end rounds off, and pasted into the
    # middle of a rod that is the sea showing through a piece of wood. Five of
    # them, one pixel each, which at a distance read as nicks in the paint
    # rather than as a fault — exactly the kind of thing only counting finds.
    mended = bar.load()
    for y in range(height):
        for x in range(CAP, width - CAP):
            if mended[x, y][3] < 200:
                mended[x, y] = mended[x - 1, y]
    return bar


# ----------------------------------------------------------------- the rail

def rail(src: Image.Image, rng: random.Random) -> Image.Image:
    """The plank along the bottom of the window, off the dock.

    The rail is not part of the scroll and never was: it is a shelf the village
    hangs its projects on, it runs the whole width of whatever window you have,
    and the one thing it must not have is an end — a plank end in the middle of
    a run reads as two boards butted together, and there is only one rail. So
    it is the dock's own timber with the ends cut off, which is what
    `make-board.py` did for the whole board before the board became a page.
    """
    out = Image.new("RGBA", (DOCK_WIDE, PLANKS[-1] - PLANKS[0]), (0, 0, 0, 0))
    y = 0
    for top, bottom in zip(PLANKS, PLANKS[1:]):
        band = plank(src, top, bottom, DOCK_WIDE, rng)
        out.paste(band, (0, y))
        y += band.height
    return out


def plank(src: Image.Image, top: int, bottom: int, width: int, rng: random.Random) -> Image.Image:
    """One plank of the dock, widened out of its own cleanest column."""
    px = src.load()
    height = bottom - top
    typical = [
        tuple(statistics.median(px[x, y][c] for x in range(*DOCK_INNER)) for c in range(4))
        for y in range(top, bottom)
    ]
    ranked = sorted(
        (
            sum(abs(px[x, top + i][c] - typical[i][c]) for i in range(height) for c in range(3)),
            x,
        )
        for x in range(*DOCK_INNER)
    )
    clean = ranked[0][1]
    grainy = [x for _, x in ranked[-14:]]

    band = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    column = src.crop((clean, top, clean + 1, bottom))
    for x in range(width):
        band.paste(column, (x, 0))
    for _ in range(rng.randint(1, 3)):
        mark = rng.randint(6, 16)
        at = max(DOCK_INNER[0], min(rng.choice(grainy) - mark // 2, DOCK_INNER[1] - mark))
        band.paste(src.crop((at, top, at + mark, bottom)), (rng.randint(4, width - mark - 4), 0))
    return band


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--kit")
    ap.add_argument("--out", default=None)
    ap.add_argument("--width", type=int, default=340)
    args = ap.parse_args()

    kit = find_kit(args.kit)
    out = args.out or os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "board"
    )
    os.makedirs(out, exist_ok=True)
    rng = random.Random(SEED)

    his = paper_ramp(kit)
    by = lift_for(his[0])
    ramp = [lifted(c, by) for c in his]

    paper = sheet(args.width, TILE, ramp, rng)
    paper.save(os.path.join(out, "paper.png"))

    # Under the top rod the sheet comes off the roll, and above the bottom one
    # it goes back on: three rows of it are turning away from you either way.
    top = curl(args.width, ramp, [2, 1, 1, 0])
    top.save(os.path.join(out, "under.png"))
    bottom = curl(args.width, ramp, [0, 1, 1, 2])
    bottom.save(os.path.join(out, "over.png"))

    log = thickened(Image.open(os.path.join(kit, LOG)).convert("RGBA"), THICK)
    bar = rod(log, args.width + OVERHANG * 2, rng)
    bar.save(os.path.join(out, "rod.png"))

    plank = rail(Image.open(os.path.join(kit, DOCK)).convert("RGBA"), rng)
    plank.save(os.path.join(out, "rail.png"))

    with open(os.path.join(out, "board.json"), "w") as fh:
        json.dump(
            {
                "paper": "paper.png",
                "under": "under.png",
                "over": "over.png",
                "rod": "rod.png",
                "rail": "rail.png",
                "width": args.width,
                "tile": TILE,
                "curl": top.height,
                "rodHeight": bar.height,
                "railHeight": plank.height,
                "overhang": OVERHANG,
                "ink": "#%02X%02X%02X" % INK,
                "ramp": ["#%02X%02X%02X" % c for c in ramp],
                "lift": round(by, 3),
                "sources": [LOG, DOCK, NOTICES[0]],
            },
            fh,
            indent=2,
        )
    print(f"board/paper.png  {paper.width}x{paper.height}  ramp "
          + " ".join("#%02X%02X%02X" % c for c in ramp)
          + f"  lift x{by:.2f}")
    print(f"board/rod.png    {bar.width}x{bar.height}")
    print(f"board/rail.png   {plank.width}x{plank.height}")


if __name__ == "__main__":
    main()
