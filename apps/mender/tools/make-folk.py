#!/usr/bin/env python3
"""Draw the villagers.

The kit ships four "character" files and they are a template, not a character:
a featureless slab with cat ears and two eyes, forty-eight pixels tall, taller
than the doors of the houses it would stand at. The artist never used them in
their own demo and it is obvious why.

So this draws ours. Pixel by pixel, in the kit's own outline colour and at a
height that fits its doorways, with a front and a back and two frames of breath
each. Nobody walks anywhere yet, so there is no walk cycle here: a villager
stands at the door of the building they are working in, and turns round when
they want you.

    python3 tools/make-folk.py

Writes assets/folk/folk.png and assets/folk/folk.json.
"""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "assets" / "folk"

# The kit's own outline, counted off its buildings and props. Every line in the
# village is this colour, so a villager drawn in anything else is pasted on.
INK = (0x48, 0x25, 0x10)

PALETTE = {
    "K": INK,
    # Skin, lit from the north-west like everything else in the kit.
    "S": (0xE2, 0xAE, 0x84),
    "s": (0xC2, 0x8B, 0x60),
    "e": (0x3B, 0x2A, 0x22),
    # Hair.
    "H": (0x5A, 0x39, 0x1D),
    "h": (0x73, 0x4C, 0x28),
    # The tunic. Dusty blue on purpose: the whole village is warm brown timber
    # and green grass, and a person has to be findable on it at a glance.
    "T": (0x64, 0x7C, 0x8C),
    "u": (0x7B, 0x94, 0xA3),
    "t": (0x4A, 0x5E, 0x6C),
    # Trousers and boots.
    "P": (0x6B, 0x50, 0x35),
    "p": (0x54, 0x3D, 0x27),
    "B": (0x3F, 0x2C, 0x1B),
    ".": None,
}

FRONT = [
    "....KKKKKK....",
    "..KKhhhhhhKK..",
    ".KhhhhhhhhhhK.",
    ".KhHHHHHHHHhK.",
    ".KHSSSSSSSSHK.",
    ".KHSSSSSSSSHK.",
    ".KHSeSSSSeSHK.",
    ".KHSSSSSSSSHK.",
    ".KHSSSssSSSHK.",
    "..KSSSSSSSSK..",
    "..KsSSSSSSsK..",
    "...KKKKKKKK...",
    "....KTTTTK....",
    "..KKTTTTTTKK..",
    ".KSKuuuuuuKSK.",
    ".KSKTTTTTTKSK.",
    ".KSKTTTTTTKSK.",
    ".KsKTTTTTTKsK.",
    "..KKTTTTTTKK..",
    "...KttttttK...",
    "...KPPPPPPK...",
    "...KPPKKPPK...",
    "...KPPKKPPK...",
    "...KppKKppK...",
    "...KBBKKBBK...",
    "...KBBKKBBK...",
    "...KKKKKKKK...",
]

BACK = [
    "....KKKKKK....",
    "..KKhhhhhhKK..",
    ".KhhhhhhhhhhK.",
    ".KhHHHHHHHHhK.",
    ".KHHHHHHHHHHK.",
    ".KHHHHHHHHHHK.",
    ".KHHHHHHHHHHK.",
    ".KHHHHHHHHHHK.",
    ".KHHHHHHHHHHK.",
    "..KHHHHHHHHK..",
    "..KHHHHHHHHK..",
    "...KKKKKKKK...",
    "....KTTTTK....",
    "..KKTTTTTTKK..",
    ".KSKTTTTTTKSK.",
    ".KSKTTTTTTKSK.",
    ".KSKTTTTTTKSK.",
    ".KsKTTTTTTKsK.",
    "..KKTTTTTTKK..",
    "...KttttttK...",
    "...KPPPPPPK...",
    "...KPPKKPPK...",
    "...KPPKKPPK...",
    "...KppKKppK...",
    "...KBBKKBBK...",
    "...KBBKKBBK...",
    "...KKKKKKKK...",
]

WIDTH = 14
HEIGHT = len(FRONT)


def draw(rows: list[str]) -> Image.Image:
    image = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    pixels = image.load()
    for y, row in enumerate(rows):
        if len(row) != WIDTH:
            raise SystemExit(f"row {y} is {len(row)} wide, wanted {WIDTH}: {row!r}")
        for x, key in enumerate(row):
            colour = PALETTE[key]
            if colour:
                pixels[x, y] = (*colour, 255)
    return image


def breathing(rows: list[str]) -> list[str]:
    """The second frame: everything above the waist settles a pixel.

    Not a bob of the whole body — that reads as a hop. The head and shoulders
    drop and the legs stay put, which is what standing still actually looks
    like.
    """
    # One row out of the middle of the torso, where nothing is happening, so
    # the hem and the legs stay exactly where they were.
    spare = 16
    return ["." * WIDTH] + rows[:spare] + rows[spare + 1 :]


def shadow() -> Image.Image:
    """The pool under them.

    White at a flat alpha, like every shadow in the kit: the renderer multiplies
    it by the kit's shadow tint, so any colour in here would darken by its own
    hue instead of by the material underneath.
    """
    image = Image.new("RGBA", (WIDTH, 6), (0, 0, 0, 0))
    pixels = image.load()
    cx, cy, rx, ry = (WIDTH - 1) / 2, 2.5, 5.0, 2.4
    for y in range(6):
        for x in range(WIDTH):
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1:
                pixels[x, y] = (255, 255, 255, 115)
    return image


def main() -> None:
    frames = {
        "front-0": draw(FRONT),
        "front-1": draw(breathing(FRONT)),
        "back-0": draw(BACK),
        "back-1": draw(breathing(BACK)),
        "shadow": shadow(),
    }

    pad = 1
    width = sum(image.width + pad for image in frames.values()) + pad
    height = max(image.height for image in frames.values()) + pad * 2
    sheet = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    meta: dict[str, dict] = {}
    x = pad
    for name, image in frames.items():
        sheet.alpha_composite(image, (x, pad))
        meta[name] = {
            "frame": {"x": x, "y": pad, "w": image.width, "h": image.height},
            "sourceSize": {"w": image.width, "h": image.height},
            "spriteSourceSize": {"x": 0, "y": 0, "w": image.width, "h": image.height},
            "rotated": False,
            "trimmed": False,
        }
        x += image.width + pad

    OUT.mkdir(parents=True, exist_ok=True)
    sheet.save(OUT / "folk.png")
    (OUT / "folk.json").write_text(
        json.dumps(
            {
                "frames": meta,
                "meta": {
                    "image": "folk.png",
                    "format": "RGBA8888",
                    "size": {"w": width, "h": height},
                    "scale": "1",
                },
            },
            indent=1,
        )
        + "\n"
    )
    print(f"{OUT / 'folk.png'}  {width}x{height}  {len(frames)} frames")


if __name__ == "__main__":
    main()
