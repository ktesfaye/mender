#!/usr/bin/env python3
"""Cut the board out of the kit's own timber.

The kit has no UI surfaces at all — no panel, no parchment, no frame — and the
one wooden thing in it big enough to read as a board is the dock: a stack of
thirteen horizontal planks, each about ten pixels tall, with real jagged ends
and the artist's own grain. It is sixty-eight pixels wide, and the board wants
three hundred and forty, so this widens it.

    python3 tools/make-board.py [--kit DIR] [--out DIR] [--width 340]

Widening is not stretching. Each plank is rebuilt from the single cleanest
column of that same plank, repeated, so the board's body is flat and seamless
at any width; a few windows of the plank's own grain are laid back over it so
it is not a painted panel; and the real left and right ends are kept, which is
where the charm lives. The result tiles vertically: its top row is a plank
boundary and its last row is the one before the next, so a board of any height
is this image repeated.

Nothing here happens at runtime. This writes `board/planks.png`, the app loads
it like any other texture, and the wood is the artist's throughout.
"""
from __future__ import annotations

import argparse
import json
import os
import random
import statistics
import sys

from PIL import Image

DOCK = "building-parts/TX Village Building - Dock 01 N 01.png"

# The rows the dock's planks meet on: each is the dark line one plank casts on
# the next. The first and last chosen bound the tiling unit.
BOUNDS = [11, 21, 30, 39, 48, 57, 66, 75, 85, 95, 105]
# The real plank ends, kept at both edges of the widened plank.
CAP = 12
# Columns safely inside those ends, which is the only part it is safe to sample.
INNER = (10, 54)
SEED = 11


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


def plank(src: Image.Image, y0: int, y1: int, width: int, rng: random.Random) -> Image.Image:
    """One plank of the board, widened out of one plank of the dock."""
    px = src.load()
    height = y1 - y0
    # What this plank looks like where nothing has happened to it.
    typical = [
        tuple(
            statistics.median(px[x, y][c] for x in range(*INNER)) for c in range(4)
        )
        for y in range(y0, y1)
    ]
    ranked = sorted(
        (
            sum(
                abs(px[x, y0 + i][c] - typical[i][c]) for i in range(height) for c in range(3)
            ),
            x,
        )
        for x in range(*INNER)
    )
    clean = ranked[0][1]
    grainy = [x for _, x in ranked[-14:]]

    band = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    column = src.crop((clean, y0, clean + 1, y1))
    for x in range(width):
        band.paste(column, (x, 0))
    for _ in range(rng.randint(1, 3)):
        mark = rng.randint(6, 16)
        at = max(INNER[0], min(rng.choice(grainy) - mark // 2, INNER[1] - mark))
        band.paste(
            src.crop((at, y0, at + mark, y1)),
            (rng.randint(CAP + 4, width - CAP - mark - 4), 0),
        )
    band.paste(src.crop((0, y0, CAP, y1)), (0, 0))
    band.paste(src.crop((src.width - CAP, y0, src.width, y1)), (width - CAP, 0))
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

    src = Image.open(os.path.join(kit, DOCK)).convert("RGBA")
    rng = random.Random(SEED)
    planks = Image.new("RGBA", (args.width, BOUNDS[-1] - BOUNDS[0]), (0, 0, 0, 0))
    y = 0
    for top, bottom in zip(BOUNDS, BOUNDS[1:]):
        band = plank(src, top, bottom, args.width, rng)
        planks.paste(band, (0, y))
        y += band.height
    planks.save(os.path.join(out, "planks.png"))

    # The rail runs the whole width of the window, so it is the board's timber
    # with the plank ends cut off: an end in the middle of a run reads as two
    # boards butted together, and there is only one rail.
    rail = planks.crop((CAP, 0, planks.width - CAP, planks.height))
    rail.save(os.path.join(out, "rail.png"))

    with open(os.path.join(out, "board.json"), "w") as fh:
        json.dump(
            {
                "planks": "planks.png",
                "width": planks.width,
                "height": planks.height,
                "cap": CAP,
                "rail": "rail.png",
                "railWidth": planks.width - CAP * 2,
                # Where the planks meet, measured from the top of the tile. A
                # board of any height ends on one of these, so it never ends
                # halfway down a plank.
                "seams": [b - BOUNDS[0] for b in BOUNDS[:-1]],
                "source": DOCK,
            },
            fh,
            indent=2,
        )
    print(f"board/planks.png  {planks.width}x{planks.height}")


if __name__ == "__main__":
    main()
