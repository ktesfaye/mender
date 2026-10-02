#!/usr/bin/env python3
"""Draw the projects rack: a beam along the top, signboards hung off it.

The rack used to be a flat brown bar with tan boxes in it, the one thing on
the island drawn by a stylesheet rather than by hand. The kit already says
what a hanging sign looks like (its own "Sign 01 L": a beam, two chains, a
board of three upright planks with its bottom corners worn round), so this
draws ours in that same hand: the kit's outline, the kit's wood, the chain
links drawn the way the kit draws them.

Projects hang as boards. The rack's own doings, the sky, the windmill and the
way home, hang as small round tokens off one chain each, so a glance tells a
place apart from a button.

    python3 tools/make-rack.py

Writes assets/rack/rack.png, assets/rack/rack.json and assets/rack/beam.png.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "assets" / "rack"

TRANS = (0, 0, 0, 0)


def rgb(hex_: str) -> tuple[int, int, int, int]:
    return (int(hex_[1:3], 16), int(hex_[3:5], 16), int(hex_[5:7], 16), 255)


# Counted off the kit's own Sign 01 L and Wood Log 02 H.
INK = rgb("#482510")
WOOD = {
    "hi": rgb("#947e5c"),
    "lt": rgb("#7b6141"),
    "md": rgb("#74593a"),
    "sh": rgb("#6c4f32"),
    "dk": rgb("#56351d"),
    "dp": rgb("#523019"),
}
# The beam is a log, a shade warmer and lighter than the boards hung off it.
LOG = {
    "hi": rgb("#9a815c"),
    "lt": rgb("#8c714b"),
    "md": rgb("#7c5f3f"),
    "sh": rgb("#6c4e2f"),
    "dk": rgb("#593519"),
    "dp": rgb("#4c2811"),
}
# Where you are is painted thatch gold, the same gold the yard's own
# workspace signs and keyboard mark use.
GOLD = {
    "hi": rgb("#f6d996"),
    "lt": rgb("#ebc47c"),
    "md": rgb("#e0b56a"),
    "sh": rgb("#c99a52"),
    "dk": rgb("#a8743a"),
    "dp": rgb("#8a5a2a"),
}
IRON = rgb("#3a2a22")
IRON_HI = rgb("#8a7a6a")

FRAMES: dict[str, Image.Image] = {}


def canvas(w: int, h: int) -> tuple[Image.Image, object]:
    img = Image.new("RGBA", (w, h), TRANS)
    return img, img.load()


def beam() -> Image.Image:
    """A length of log that tiles end to end. 32 across, 10 down."""
    w, h = 32, 10
    img, px = canvas(w, h)
    rows = ["ink", "hi", "lt", "md", "md", "md", "sh", "dk", "dp", "ink"]
    for y, tone in enumerate(rows):
        for x in range(w):
            px[x, y] = INK if tone == "ink" else LOG[tone]
    # Grain: a few long streaks, broken, never lined up with the tile seam.
    for x0, x1, y, tone in [(2, 11, 3, "lt"), (14, 27, 5, "sh"), (20, 30, 2, "md"),
                            (5, 9, 6, "dk"), (24, 29, 7, "dp"), (0, 3, 4, "sh")]:
        for x in range(x0, x1):
            px[x, y] = LOG[tone]
    # One knot.
    px[17, 4] = LOG["dk"]
    px[18, 4] = LOG["dp"]
    px[17, 5] = LOG["sh"]
    return img


def beam_end() -> Image.Image:
    """The sawn end of the log, rings and all, where the rack starts."""
    w, h = 9, 10
    img, px = canvas(w, h)
    cx, cy = 5.0, 4.5
    for y in range(h):
        for x in range(w):
            if x >= 6:
                # Overlaps the first length of beam so the join never shows.
                px[x, y] = INK if y in (0, h - 1) else LOG[["hi", "hi", "lt", "md", "md", "md", "sh", "dk", "dp", "dp"][y]]
                continue
            d = math.hypot((x - cx) * 1.0, (y - cy) * 1.05)
            if d > 5.0:
                continue
            if d > 4.1:
                px[x, y] = INK
            elif d > 3.2:
                px[x, y] = LOG["dk"]
            elif d > 2.1:
                px[x, y] = LOG["hi"]
            elif d > 1.2:
                px[x, y] = LOG["lt"]
            else:
                px[x, y] = LOG["sh"]
    return img


def chain(n: int) -> Image.Image:
    """Links, the way the kit draws them: a dot, then a pair, down."""
    w = 3
    img, px = canvas(w, n)
    for y in range(n):
        if y % 2 == 0:
            px[1, y] = INK
        else:
            px[0, y] = INK
            px[2, y] = INK
    return img


def bracket() -> Image.Image:
    """An iron band round the beam, where projects stop and doings start."""
    w, h = 5, 12
    img, px = canvas(w, h)
    for y in range(h):
        for x in range(w):
            edge = x in (0, w - 1) or y in (0, h - 1)
            px[x, y] = INK if edge else IRON
    for y in (3, 8):
        px[2, y] = IRON_HI
    return img


def board(tones: dict[str, tuple[int, int, int, int]]) -> Image.Image:
    """Three upright planks, eyelets at the top, bottom corners worn round."""
    w, h = 24, 24
    img, px = canvas(w, h)
    seams = (8, 15)
    for y in range(h):
        for x in range(w):
            # The two bottom corners, worn round; the top two just clipped.
            if (x, y) in {(0, 0), (w - 1, 0)}:
                continue
            if y == h - 1 and (x < 3 or x > w - 4):
                continue
            if y == h - 2 and (x < 1 or x > w - 2):
                continue
            outline = (
                x == 0 or x == w - 1 or y == 0 or y == h - 1
                or (y == h - 2 and (x in (1, 2) or x in (w - 3, w - 2)))
                or (y == 1 and x in (0, w - 1))
            )
            if outline:
                px[x, y] = INK
                continue
            if x in seams:
                px[x, y] = tones["dp"]
                continue
            # Each plank lit from the top left: a bright first row, a lit
            # left edge, a shaded right edge, and darker toward the foot.
            left = x in (1, seams[0] + 1, seams[1] + 1)
            right = x in (seams[0] - 1, seams[1] - 1, w - 2)
            if y == 1:
                tone = "hi"
            elif y >= h - 3:
                tone = "dk"
            elif y >= h - 5:
                tone = "sh"
            elif left:
                tone = "lt"
            elif right:
                tone = "sh"
            else:
                tone = "md"
            px[x, y] = tones[tone]
    # A little grain on each plank, not repeated plank to plank.
    for x, y0, y1 in [(4, 4, 9), (11, 12, 18), (19, 3, 7), (5, 14, 19), (20, 13, 17)]:
        for y in range(y0, y1):
            px[x, y] = tones["sh"]
    # A square carved into the planks for the face to sit down in: the lip
    # above and to the left throws its shadow in, the lip below and to the
    # right catches the light, and the seams run on across its floor.
    for y in range(3, 21):
        for x in range(3, 21):
            if y == 3 or x == 3:
                tone = "dp"
            elif y == 20 or x == 20:
                tone = "hi"
            elif x in seams:
                tone = "dp"
            elif y == 4 or x == 4:
                tone = "dk"
            else:
                tone = "sh"
            px[x, y] = tones[tone]
    # The eyelets the chains go through.
    for x in (4, w - 5):
        px[x, 1] = INK
        px[x, 2] = tones["dp"]
    return img


def token(tones: dict[str, tuple[int, int, int, int]]) -> Image.Image:
    """A round of wood off one chain, for the rack's own doings."""
    n = 15
    img, px = canvas(n, n)
    c = (n - 1) / 2
    for y in range(n):
        for x in range(n):
            d = math.hypot(x - c, y - c)
            if d > 7.3:
                continue
            if d > 6.4:
                px[x, y] = INK
                continue
            lit = (x - c) + (y - c) < -2
            dim = (x - c) + (y - c) > 3
            if d > 5.4:
                px[x, y] = tones["hi"] if lit else tones["dk"] if dim else tones["lt"]
            else:
                px[x, y] = tones["sh"] if dim else tones["md"]
    px[int(c), 1] = INK
    return img


# Glyphs for the tokens, nine across like the sky's own pictures.
GLYPH_PALETTE = {
    "k": INK,
    "w": rgb("#d9c49a"),
    "W": rgb("#f4e3c0"),
    "y": rgb("#ffd36a"),
    "o": rgb("#ff9a3a"),
    "r": rgb("#e0603a"),
    "l": LOG["lt"],
    "d": LOG["dk"],
}
GLYPHS = {
    # The windmill: a cart wheel front on, the same one make-wheel.py draws, small.
    "glyph-wheel": [
        "..WWWWW..",
        ".WW.W.WW.",
        "WW..W..WW",
        "W...W...W",
        "WWWWkWWWW",
        "W...W...W",
        "WW..W..WW",
        ".WW.W.WW.",
        "..WWWWW..",
    ],
    # The way home: the fire the island grows from.
    "glyph-fire": [
        "....y....",
        "...yo....",
        "...yoy...",
        "..yoroy..",
        "..orrro..",
        ".yorrroy.",
        "kdlkdkldk",
        ".kdlkldk.",
        ".........",
    ],
}


def glyph(rows: list[str]) -> Image.Image:
    img, px = canvas(len(rows[0]), len(rows))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != ".":
                px[x, y] = GLYPH_PALETTE[ch]
    return img


def main() -> None:
    FRAMES["beam"] = beam()
    FRAMES["beam-end"] = beam_end()
    FRAMES["chain"] = chain(6)
    FRAMES["chain-long"] = chain(10)
    FRAMES["bracket"] = bracket()
    FRAMES["board"] = board(WOOD)
    FRAMES["board-here"] = board(GOLD)
    FRAMES["token"] = token(WOOD)
    for name, rows in GLYPHS.items():
        FRAMES[name] = glyph(rows)

    pad = 1
    width = sum(img.width + pad for img in FRAMES.values())
    height = max(img.height for img in FRAMES.values())
    sheet = Image.new("RGBA", (width, height), TRANS)
    index = {}
    x = 0
    for name, img in FRAMES.items():
        sheet.paste(img, (x, 0))
        index[name] = {"frame": {"x": x, "y": 0, "w": img.width, "h": img.height}}
        x += img.width + pad

    OUT.mkdir(parents=True, exist_ok=True)
    sheet.save(OUT / "rack.png")
    # The beam again on its own, because a length of it is repeated along
    # the whole rack and only a picture of its own can be tiled.
    FRAMES["beam"].save(OUT / "beam.png")
    (OUT / "rack.json").write_text(
        json.dumps(
            {"frames": index, "meta": {"image": "rack.png", "size": {"w": width, "h": height}}},
            indent=2,
        )
        + "\n"
    )


if __name__ == "__main__":
    main()
