"""Where each district's pennant stands.

    python3 apps/mender/tools/place-pennants.py        # -> assets/village/pennants.json

A pennant is a post, and a post in this village goes where the artist would
have put one: on grass at the side of a path, out in front of the district's
main house, with nothing he drew standing in the way of the pole or the cloth.
Not the middle of the district's box, which on half of them is a roof, a field
or a pond.

So every foot position is tried on a small grid, and one survives only if:

  - the ground under the foot is solid grass and the path is right beside it,
  - no cliff, coast or other district is within a cell of it,
  - the pole and the flag, at the size the app draws them, overlap no sprite of
    his except the grass tufts at its foot.

Of those, the one nearest the front door of the district's biggest building
wins, pulled a little toward the middle of the district so a farm's flag is not
out at the end of a lane. What comes out is fixed, because his districts are
fixed: a district that is on is exactly the shape he drew it, at every state.
"""
from __future__ import annotations

import json
import math
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
VILLAGE = os.path.join(HERE, "..", "assets", "village")
CELL = 32

# The pennant in its own pixels from the foot of the pole, screen y down. Keep
# in step with `src/renderer/village/pennants.ts`.
POLE_H = 30
CLOTH_W = 26 + 7
CLOTH_H = 22

# The app draws the flag a fixed size on screen, so the further out the camera
# is the more of the map it covers. Measured at the largest it gets at the
# whole-island view first, and only if a district has nowhere that clear, at
# the next size down.
SIZES = (3, 2)


def shapes(size: int):
    """The pole, the cloth and the foot, as boxes, at `size` world pixels a pixel.

    The pole and the cloth are checked apart: the ground under the flag is
    open air, and a bush standing under a flag is exactly what a flag looks
    like. The foot needs clear of everything but grass tufts."""
    pole = (-4 * size, -(POLE_H + 2) * size, 4 * size, 3 * size)
    cloth = (0, -(POLE_H + 2) * size, (4 + CLOTH_W) * size, (-POLE_H + CLOTH_H + 4) * size)
    foot = (-5 * size, -6 * size, 5 * size, 3 * size)
    return pole, cloth, foot

STEP = 4
ROOM = 8
# Air kept between two flags, so neither reads as the other's second cloth.
FLAG_ROOM = 64

OPAQUE_GRASS = {
    12, 13, 14, 15, 17, 20, 28, 29, 30, 31, 44, 45, 46, 47, 60, 61, 62, 63, 92, 93, 94, 95,
    108, 109, 110, 111, 124, 125, 126, 127, 140, 141, 142, 143,
}


def number(file: str) -> int:
    m = re.search(r"_(\d+)\.png$", file)
    return int(m.group(1)) if m else -1


def main() -> None:
    layout = json.load(open(os.path.join(VILLAGE, "base-layout.json")))
    districts = json.load(open(os.path.join(VILLAGE, "districts.json")))["districts"]

    # A piece a big district gives up once all eleven are taken stands its
    # own pennant, measured the same way, as if it were a district of its own.
    pieces = json.load(open(os.path.join(VILLAGE, "subdistricts.json")))["pieces"]
    for piece in pieces:
        piece["land"] = {(x, y) for x, y0, y1 in piece["cells"] for y in range(y0, y1 + 1)}

    owner: dict[tuple[int, int], str] = {}
    for d in districts:
        for x, y0, y1 in d["cells"]:
            for y in range(y0, y1 + 1):
                owner[(x, y)] = d["id"]

    dirt: set[tuple[int, int]] = set()
    grass: set[tuple[int, int]] = set()
    rim: set[tuple[int, int]] = set()
    for t in layout["tiles"]:
        if not t.get("file"):
            continue
        c = (t["cell"][0], t["cell"][1])
        f = t["file"]
        if f.startswith("terrain-dirt/"):
            dirt.add(c)
        elif f.startswith("terrain-grass/") and number(f) in OPAQUE_GRASS:
            grass.add(c)
        elif f.startswith("terrain-tiles/"):
            rim.add(c)
    path = dirt - grass

    # Every sprite of his, as a box in world pixels with y down.
    solid: list[tuple[float, float, float, float]] = []
    low: list[tuple[float, float, float, float]] = []
    roomy: list[tuple[float, float, float, float]] = []
    buildings: dict[str, list[tuple[float, float, float, float, float]]] = {}
    index = {i: o for i, o in enumerate(layout["objects"])}
    object_district: dict[int, str] = {}
    for d in districts:
        for oi in d["objects"]:
            object_district[oi] = d["id"]
    for oi, o in index.items():
        if o["group"] == "SCENE":
            continue
        ox, oy, _ = o["pos"]
        box = None
        for s in o["sprites"]:
            if not s.get("active", True) or not s.get("file") or s.get("blend") == "multiply":
                continue
            w, h = s["size_px"]
            sx, sy = abs(s.get("scale", [1, 1, 1])[0]), abs(s.get("scale", [1, 1, 1])[1])
            w, h = w * sx, h * sy
            px, py = s.get("pivot", [0.5, 0.0])
            x = (ox + s["offset"][0]) * CELL
            y = -(oy + s["offset"][1]) * CELL
            b = (x - px * w, y + py * h - h, x - px * w + w, y + py * h)
            # A house gets room round it: a flag pressed flat against a wall
            # reads as stuck to it rather than standing in front of it.
            # Wanted, not required: the centre houses have nowhere that clear. A
            # post jammed in among barrels and crates reads as stacked with them.
            if o["group"] != "Grass":
                roomy.append((b[0] - ROOM, b[1] - ROOM, b[2] + ROOM, b[3] + ROOM))
            (low if o["group"] == "Grass" else solid).append(b)
            box = b if box is None else (
                min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3])
            )
        if o["group"] == "Building" and box and oi in object_district:
            area = (box[2] - box[0]) * (box[3] - box[1])
            buildings.setdefault(object_district[oi], []).append((*box, area))
            foot = (math.floor(ox), math.floor(oy))
            for piece in pieces:
                if foot in piece["land"]:
                    buildings.setdefault(piece["id"], []).append((*box, area))

    def clear(boxes, fx, fy, reach) -> bool:
        l, t, r, b = fx + reach[0], fy + reach[1], fx + reach[2], fy + reach[3]
        return not any(l < B[2] and r > B[0] and t < B[3] and b > B[1] for B in boxes)

    out: dict[str, list[int]] = {}
    flags: list[tuple[float, float, float, float]] = []
    places = [(d, owner) for d in districts]
    for piece in pieces:
        places.append((piece, {**owner, **{c: piece["id"] for c in piece["land"]}}))
    for d, owner in places:
        if d["id"] in ("CAMP", "ISLAND"):
            continue
        cells = [c for c, who in owner.items() if who == d["id"]]
        cx = sum(c[0] for c in cells) / len(cells) * CELL + CELL / 2
        cy = -sum(c[1] for c in cells) / len(cells) * CELL - CELL / 2
        # A piece's own houses were counted under its district too.
        houses = sorted(buildings.get(d["id"], []), key=lambda b: -b[4])
        door = ((houses[0][0] + houses[0][2]) / 2, houses[0][3]) if houses else (cx, cy)

        best = None
        # Beside a path with the cloth in clear air if anywhere is. The centre
        # houses' east house has nowhere like that at all, so as a last resort
        # a place may stand back from the path and fly its cloth over a tree.
        # A district takes the largest clear size it has anywhere. A piece is
        # small enough that that sends its flag off to the far end of it, so it
        # weighs both sizes together and stays by its own house.
        piece = "of" in d
        tries = [(0 if piece else size, size, True, True) for size in SIZES] + [
            (-1, SIZES[-1], False, False)
        ]
        tier = None
        for rank, size, pathed, airy in tries:
            POLE, CLOTH, FOOT = shapes(size)
            if best is not None and rank != tier:
                break
            tier = rank
            for (gx, gy) in cells:
                if (gx, gy) in rim or (gx, gy) not in (grass | dirt):
                    continue
                on_path = (gx, gy) in path
                near = [(gx + dx, gy + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1)]
                if any(owner.get(n) != d["id"] or n in rim or n not in (grass | dirt) for n in near):
                    continue
                if pathed and not on_path and not any(n in path for n in near if n != (gx, gy)):
                    continue
                for ix in range(STEP, CELL, STEP * 2):
                    for iy in range(STEP, CELL, STEP * 2):
                        fx = gx * CELL + ix
                        fy = -(gy + 1) * CELL + iy
                        if (
                            not clear(solid, fx, fy, POLE)
                            or (airy and not clear(solid, fx, fy, CLOTH))
                            or not clear(low, fx, fy, FOOT)
                        ):
                            continue
                        if not clear(flags, fx, fy, POLE) or not clear(flags, fx, fy, CLOTH):
                            continue
                        cramped = not clear(roomy, fx, fy, POLE) or not clear(roomy, fx, fy, CLOTH)
                        score = (CELL if on_path else 0) + (2 * CELL if cramped else 0) + math.hypot(fx - door[0], fy - door[1]) + 0.35 * math.hypot(
                            fx - cx, fy - cy
                        )
                        if best is None or score < best[0]:
                            best = (score, fx, fy, size)
        if best is None:
            raise SystemExit(f"{d['id']}: nowhere clear to stand a pennant")
        out[d["id"]] = [best[1], best[2]]
        # Every flag already standing is in the way of the next one, at the
        # largest the app draws it: two pieces side by side fly two flags.
        pole, cloth, _ = shapes(max(SIZES))
        for reach in (pole, cloth):
            flags.append(
                (
                    best[1] + reach[0] - FLAG_ROOM,
                    best[2] + reach[1] - FLAG_ROOM,
                    best[1] + reach[2] + FLAG_ROOM,
                    best[2] + reach[3] + FLAG_ROOM,
                )
            )
        print(f"{d['id']:>2} {d['name']:<18} {best[1]:>6} {best[2]:>6}  clear at {best[3]}x")

    json.dump(
        {
            "$comment": "Where each district's pennant stands: the foot of the pole, world pixels, "
            "y down. Written by tools/place-pennants.py. Do not hand-edit.",
            "feet": out,
        },
        open(os.path.join(VILLAGE, "pennants.json"), "w"),
        indent=1,
    )


if __name__ == "__main__":
    main()
