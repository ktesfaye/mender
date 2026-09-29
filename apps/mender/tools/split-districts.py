#!/usr/bin/env python3
"""Where a district is cut in two once all eleven of his are taken.

    python3 apps/mender/tools/split-districts.py   # -> assets/village/subdistricts.json

His partition has eleven places a project can stand, and a twelfth project
used to be told the island was full. Now the big ones give up a piece: the
hay farm first, then the crop farm, the south houses, the port and the centre
houses, in that order, each round the house and yard Kirubel pointed at. A piece
is only its own place once a project is standing on it; until then its land is
still the whole district's.

The district keeps the part its own pennant stands on and goes on being called
what it was. Every other part is a piece with its own id and its own cells; an
object of his belongs to whichever piece its foot is on, which the village
works out as it composes rather than being told here.
"""
from __future__ import annotations

import heapq
import json
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
VILLAGE = os.path.join(HERE, "..", "assets", "village")

# Handed out in this order, and only once his eleven are all taken. Each piece
# is grown out from a few cells of its own, its house and its yard, and so is
# the part the district keeps (`None`); every cell of the district goes to
# whichever of them reaches it first. Fences and cliffs are slow to cross, so
# the line between two pieces settles along them the way his own district
# lines do, rather than running straight through a yard. A field is seeded
# from inside it, so it goes whole to one side.
SPLITS = {
    "B": [
        (None, None, [(-48, 25), (-53, 37), (-62, 22), (-72, 16)]),
        ("B2", "Hay farm, east", [(-24, 35), (-33, 33), (-22, 30), (-18, 27)]),
    ],
    "A": [
        (None, None, [(-35, 5), (-23, -3), (-50, -8), (-45, 1), (-15, 2), (-39, 10), (-30, 10)]),
        ("A2", "Crop farm, barn", [(-26, 17), (-45, 17), (-33, 22), (-58, 14), (-17, 17), (-40, 16), (-31, 16)]),
    ],
    "D": [
        (None, None, [(-5, -11), (3, -12)]),
        ("D2", "South houses, long house", [(-17, -22), (-21, -30), (-10, -25)]),
        ("D3", "South houses, tall house", [(1, -28), (0, -40), (7, -32)]),
    ],
    "J": [
        (None, None, [(38, -12), (43, -6), (36, -25), (41, -19), (45, -11), (45, -18), (47, -9)]),
        ("J2", "Port, dock", [(53, -20), (55, -27), (50, -22), (48, -15), (48, -19)]),
    ],
    "E": [
        (None, None, [(2, 3), (0, -5), (5, -3), (-6, -3), (-10, -4)]),
        ("E2", "Centre houses, east house", [(11, 6), (14, 9)]),
        ("E3", "Centre houses, west shed", [(-7, 8), (-10, 12)]),
    ],
}
ORDER = ["B2", "A2", "D2", "D3", "J2", "E2", "E3"]

STEP = 1
FENCE = 12
CLIFF = 12


def barriers(layout: dict) -> tuple[set, set]:
    """Where a fence stands, and where the ground steps down a cliff."""
    fence: set[tuple[int, int]] = set()
    for o in layout["objects"]:
        name = o["prefab"]
        x, y = o["pos"][0], o["pos"][1]
        if "Fence 01 H" in name or "Fence 02" in name:
            for cx in range(math.floor(x), math.floor(x + 1.2) + 1):
                fence.add((cx, math.floor(y)))
        elif "Fence 01 V" in name:
            for cy in range(math.floor(y), math.floor(y + 1.8) + 1):
                fence.add((math.floor(x), cy))
    cliff = {
        (t["cell"][0], t["cell"][1])
        for t in layout["tiles"]
        if (t.get("file") or "").startswith("terrain-tiles/")
    }
    return fence, cliff


def grow(land: set, seeds: list, fence: set, cliff: set) -> dict:
    """Every cell of `land` to whichever seed list reaches it cheapest."""
    best: dict[tuple[int, int], float] = {}
    owner: dict[tuple[int, int], int] = {}
    queue: list[tuple[float, int, tuple[int, int]]] = []
    for i, cells in enumerate(seeds):
        for c in cells:
            if c not in land:
                raise SystemExit(f"seed {c} is not on its district")
            best[c] = 0
            owner[c] = i
            heapq.heappush(queue, (0, i, c))
    while queue:
        d, i, c = heapq.heappop(queue)
        if d > best.get(c, math.inf) or owner[c] != i:
            continue
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (c[0] + dx, c[1] + dy)
            if n not in land:
                continue
            cost = STEP + FENCE * (n in fence) + CLIFF * (n in cliff)
            if d + cost < best.get(n, math.inf):
                best[n] = d + cost
                owner[n] = i
                heapq.heappush(queue, (d + cost, i, n))
    return owner


def tidy(land: set, owner: dict) -> dict:
    """A scrap of one piece cut off inside another goes to what surrounds it."""
    for _ in range(4):
        changed = False
        for c in land:
            around = [owner[n] for n in ((c[0] + 1, c[1]), (c[0] - 1, c[1]), (c[0], c[1] + 1), (c[0], c[1] - 1)) if n in owner]
            if around and around.count(owner[c]) <= 1 and len(around) >= 3:
                most = max(set(around), key=around.count)
                if around.count(most) >= 3:
                    owner[c] = most
                    changed = True
        if not changed:
            break
    return owner


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
    layout = json.load(open(os.path.join(VILLAGE, "base-layout.json")))
    districts = {d["id"]: d for d in json.load(open(os.path.join(VILLAGE, "districts.json")))["districts"]}
    feet = json.load(open(os.path.join(VILLAGE, "pennants.json")))["feet"]
    fence, cliff = barriers(layout)

    made: dict[str, dict] = {}
    for of, parts in SPLITS.items():
        land = {(x, y) for x, y0, y1 in districts[of]["cells"] for y in range(y0, y1 + 1)}
        owner = tidy(land, grow(land, [seeds for _, _, seeds in parts], fence, cliff))
        fx, fy = feet[of]
        if owner.get((math.floor(fx / 32), math.floor(-fy / 32))) not in (0, None):
            raise SystemExit(f"{of}: its own pennant stands on a piece it gives away")
        for i, (pid, name, _) in enumerate(parts):
            if pid is None:
                continue
            cells = {c for c, who in owner.items() if who == i}
            made[pid] = {"id": pid, "of": of, "name": name, "cells": runs(cells)}
            print(f"{pid:>3} of {of}  {len(cells):>4} cells  {name}")

    json.dump(
        {
            "$comment": "Pieces of his districts, handed out in this order once all eleven are "
            "taken. Written by tools/split-districts.py. Do not hand-edit.",
            "pieces": [made[pid] for pid in ORDER],
        },
        open(os.path.join(VILLAGE, "subdistricts.json"), "w"),
        indent=1,
    )


if __name__ == "__main__":
    main()
