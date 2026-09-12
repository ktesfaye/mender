#!/usr/bin/env python3
"""Pack the village sprite kit into Pixi spritesheets.

The kit ships as ~1,000 loose PNGs. Loaded that way the village is a thousand
HTTP requests at startup and, worse, a thousand separate GPU textures: the scene
is depth-sorted, so neighbouring sprites come from different files and Pixi has
to flush its batch between almost every draw. Packed, the whole island is a
handful of textures and a handful of draw calls.

    python3 tools/pack-kit.py [--kit DIR] [--out DIR] [--size 4096]

Writes `kit-0.png`, `kit-0.json`, ... in Pixi's spritesheet format, keyed by the
sprite's kit-relative path, which is exactly what the layout's `file` fields say.

SHADOW MASKS ARE WHITENED HERE. The kit's shadows are a flat colour (#482510)
at a uniform alpha; the renderer multiplies them by a material tint, so the RGB
in the file must be discarded or the scene darkens by the outline colour instead
of the tint. The editor did this per texture at load, on a canvas. Baking it into
the sheet means the app never touches pixel data at all.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys

from PIL import Image

SHADOW = re.compile(r"(^|/)shadows?-|shadow", re.I)
PAD = 2


def find_kit(explicit: str | None) -> str:
    if explicit:
        return os.path.abspath(explicit)
    here = os.path.dirname(os.path.abspath(__file__))
    for base in (here, os.path.dirname(here)):
        node = base
        for _ in range(8):
            cand = os.path.join(node, "assets", "village-kit")
            if os.path.isdir(cand):
                return cand
            cand = os.path.join(node, "village-kit")
            if os.path.isdir(cand):
                return cand
            nxt = os.path.dirname(node)
            if nxt == node:
                break
            node = nxt
    # The kit lives with the village pipeline it came out of.
    sibling = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(
            os.path.abspath(__file__))))),
        "a-cozy-agents-village", "assets", "village-kit")
    if os.path.isdir(sibling):
        return sibling
    sys.exit("cannot find village-kit; pass --kit")


def sprites(kit: str) -> list[str]:
    """Every sprite the layouts can name, kit-relative, sorted for a stable
    packing. The `_index_*` contact sheets and the palette are documentation."""
    out = []
    for root, _dirs, files in os.walk(kit):
        for f in sorted(files):
            if not f.endswith(".png") or f.startswith("_index") or f == "palette.png":
                continue
            out.append(os.path.relpath(os.path.join(root, f), kit).replace(os.sep, "/"))
    return sorted(out)


def pack(kit: str, out_dir: str, size: int) -> None:
    names = sprites(kit)
    images: dict[str, Image.Image] = {}
    for n in names:
        im = Image.open(os.path.join(kit, n)).convert("RGBA")
        if SHADOW.search(n):
            # White, alpha preserved. See the note at the top.
            px = im.load()
            for y in range(im.height):
                for x in range(im.width):
                    px[x, y] = (255, 255, 255, px[x, y][3])
        images[n] = im

    # Shelf packing, tallest first. The kit is mostly 32px tiles with a few
    # large buildings, which is the case shelves handle without waste.
    order = sorted(names, key=lambda n: (-images[n].height, -images[n].width, n))
    sheets: list[tuple[Image.Image, dict]] = []
    cur = None
    x = y = row_h = 0

    def new_sheet():
        nonlocal cur, x, y, row_h
        cur = (Image.new("RGBA", (size, size), (0, 0, 0, 0)), {})
        sheets.append(cur)
        x = y = row_h = 0

    new_sheet()
    for n in order:
        im = images[n]
        w, h = im.width + PAD, im.height + PAD
        if w > size or h > size:
            sys.exit(f"{n} is {im.width}x{im.height}, larger than the sheet")
        if x + w > size:
            x, y, row_h = 0, y + row_h, 0
        if y + h > size:
            new_sheet()
        cur[0].paste(im, (x, y))
        cur[1][n] = {
            "frame": {"x": x, "y": y, "w": im.width, "h": im.height},
            "sourceSize": {"w": im.width, "h": im.height},
            "spriteSourceSize": {"x": 0, "y": 0, "w": im.width, "h": im.height},
        }
        x += w
        row_h = max(row_h, h)

    os.makedirs(out_dir, exist_ok=True)
    for i, (img, frames) in enumerate(sheets):
        png = f"kit-{i}.png"
        # Trim the unused tail so the last sheet is not a blank 4k square.
        used = img.getbbox() or (0, 0, 1, 1)
        img = img.crop((0, 0, size, used[3]))
        img.save(os.path.join(out_dir, png), optimize=True)
        json.dump(
            {
                "frames": frames,
                "meta": {"image": png, "format": "RGBA8888", "size": {"w": img.width, "h": img.height}, "scale": "1"},
            },
            open(os.path.join(out_dir, f"kit-{i}.json"), "w"),
            separators=(",", ":"),
        )
        print(f"{png}  {img.width}x{img.height}  {len(frames)} sprites  "
              f"{os.path.getsize(os.path.join(out_dir, png)) // 1024}kb")
    json.dump({"sheets": [f"kit-{i}.json" for i in range(len(sheets))], "count": len(names)},
              open(os.path.join(out_dir, "kit.json"), "w"), separators=(",", ":"))
    print(f"{len(names)} sprites in {len(sheets)} sheets")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--kit")
    ap.add_argument("--out", default=os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "kit"))
    ap.add_argument("--size", type=int, default=4096)
    a = ap.parse_args()
    pack(find_kit(a.kit), a.out, a.size)
    return 0


if __name__ == "__main__":
    sys.exit(main())
