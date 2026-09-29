#!/usr/bin/env python3
"""Draw the wheel that stands for the windmill on the projects rack.

The kit has no windmill sprite at all, and the nearest thing it does have — a
cart wheel — is drawn on the cart's own side, at the angle a wheel sits on a
road, not the angle a wheel reads as a wheel from a UI slot. So this draws one
front-on: a rim, eight spokes, a hub, in the kit's own outline and the same
wood tones its carts and crates already use.

    python3 tools/make-wheel.py

Writes assets/wheel/wheel.png and assets/wheel/wheel.json.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "assets" / "wheel"

# The kit's own outline, the same one make-folk.py counted off its buildings
# and props with.
INK = (0x48, 0x25, 0x10, 255)
WOOD_LIGHT = (0x80, 0x64, 0x42, 255)
WOOD_MID = (0x69, 0x4D, 0x2F, 255)
WOOD_DARK = (0x5D, 0x39, 0x1F, 255)
TRANS = (0, 0, 0, 0)

N = 28
CENTER = (N - 1) / 2
R_OUT = 13.0
R_RIM_IN = 10.5
R_HUB_OUT = 4.0
R_HUB_IN = 2.0
SPOKES = 8
SPOKE_HALF_ANGLE = 0.11


def draw() -> Image.Image:
    img = Image.new("RGBA", (N, N), TRANS)
    px = img.load()

    def dist(x: float, y: float) -> float:
        return math.hypot(x - CENTER, y - CENTER)

    def on_a_spoke(x: float, y: float) -> bool:
        a = math.atan2(y - CENTER, x - CENTER)
        for i in range(SPOKES):
            target = -math.pi / 2 + i * (2 * math.pi / SPOKES)
            diff = (a - target + math.pi) % (2 * math.pi) - math.pi
            if abs(diff) < SPOKE_HALF_ANGLE:
                return True
        return False

    for y in range(N):
        for x in range(N):
            d = dist(x + 0.5, y + 0.5)
            color = TRANS

            if R_RIM_IN <= d <= R_OUT:
                # The rim: a dark ring at its outer and inner edge, wood between.
                color = INK if (d >= R_OUT - 1.1 or d <= R_RIM_IN + 1.1) else WOOD_MID
            elif R_HUB_OUT <= d < R_RIM_IN:
                if on_a_spoke(x + 0.5, y + 0.5):
                    color = INK if d >= R_RIM_IN - 1.0 else WOOD_DARK
            elif R_HUB_IN <= d < R_HUB_OUT:
                color = INK if d >= R_HUB_OUT - 1.0 else WOOD_LIGHT
            elif d < R_HUB_IN:
                color = WOOD_LIGHT

            px[x, y] = color

    return img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    img = draw()
    img.save(OUT / "wheel.png")

    sheet = {
        "frames": {
            "wheel": {
                "frame": {"x": 0, "y": 0, "w": N, "h": N},
                "sourceSize": {"w": N, "h": N},
                "spriteSourceSize": {"x": 0, "y": 0, "w": N, "h": N},
                "rotated": False,
                "trimmed": False,
            }
        },
        "meta": {
            "image": "wheel.png",
            "format": "RGBA8888",
            "size": {"w": N, "h": N},
            "scale": "1",
        },
    }
    (OUT / "wheel.json").write_text(json.dumps(sheet, indent=2) + "\n")
    print(f"wrote {OUT / 'wheel.png'} and wheel.json, {N}x{N}")


if __name__ == "__main__":
    main()
