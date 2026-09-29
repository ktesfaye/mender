#!/usr/bin/env python3
"""Where a district is cut in two once all eleven of his are taken.

    python3 apps/mender/tools/split-districts.py   # -> assets/village/subdistricts.json

His partition has eleven places a project can stand, and a twelfth project
used to be told the island was full. Now the big ones give up a piece: the
hay farm first, then the crop farm, the south houses, the port and the centre
houses, in that order, each along the lines Kirubel drew over the art. A piece
is only its own place once a project is standing on it; until then its land is
still the whole district's.

The district keeps the part its own pennant stands on and goes on being called
what it was. Every other part is a piece with its own id and its own cells; an
object of his belongs to whichever piece its foot is on, which the village
works out as it composes rather than being told here.
"""
from __future__ import annotations

import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
VILLAGE = os.path.join(HERE, "..", "assets", "village")

# Handed out in this order, and only once his eleven are all taken. Each rule
# takes a cell of the district, world x and y, y up, and says whether the piece
# has it. A cell no piece has stays with the district.
PIECES = [
    ("B2", "B", "Hay farm, east", lambda x, y: x >= -41),
    ("A2", "A", "Crop farm, barn", lambda x, y: y >= 12),
    ("D2", "D", "South houses, long house", lambda x, y: x <= -4 and not (y >= -16 and x >= -11)),
    ("D3", "D", "South houses, tall house", lambda x, y: x >= -3 and y < -16),
    ("J2", "J", "Port, dock", lambda x, y: x >= 47 and y <= -13),
    ("E2", "E", "Centre houses, east house", lambda x, y: x >= 7 and y >= -1),
    ("E3", "E", "Centre houses, west shed", lambda x, y: x <= -4 and y >= -2),
]


def runs(cells: set[tuple[int, int]]) -> list[list[int]]:
    out: list[list[int]] = []
    for x in sorted({c[0] for c in cells}):
        ys = sorted(y for cx, y in cells if cx == x)
        start = prev = ys[0]
        for y in ys[1:]:
            if y != prev + 1:
                out.append([x, start, prev])
                start = y
            prev = y
        out.append([x, start, prev])
    return out


def main() -> None:
    districts = {d["id"]: d for d in json.load(open(os.path.join(VILLAGE, "districts.json")))["districts"]}
    feet = json.load(open(os.path.join(VILLAGE, "pennants.json")))["feet"]

    taken: dict[str, set[tuple[int, int]]] = {}
    out = []
    for pid, of, name, has in PIECES:
        parent = districts[of]
        land = {(x, y) for x, y0, y1 in parent["cells"] for y in range(y0, y1 + 1)}
        cells = {c for c in land if has(*c)} - taken.setdefault(of, set())
        taken[of] |= cells
        if not cells:
            raise SystemExit(f"{pid}: no land")
        out.append({"id": pid, "of": of, "name": name, "cells": runs(cells)})
        print(f"{pid:>3} of {of}  {len(cells):>4} cells  {name}")

    for of, cells in taken.items():
        fx, fy = feet[of]
        foot = (int(fx // 32), int(-fy // 32))
        if foot in cells:
            raise SystemExit(f"{of}: its own pennant stands on a piece it gives away")

    json.dump(
        {
            "$comment": "Pieces of his districts, handed out in this order once all eleven are "
            "taken. Written by tools/split-districts.py. Do not hand-edit.",
            "pieces": out,
        },
        open(os.path.join(VILLAGE, "subdistricts.json"), "w"),
        indent=1,
    )


if __name__ == "__main__":
    main()
