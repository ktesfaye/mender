#!/usr/bin/env python3
"""Draw the villagers.

The kit ships four "character" files and they are a template, not a character:
a featureless slab with cat ears and two eyes, forty-eight pixels tall, taller
than the doors of the houses it would stand at. The artist never used them in
their own demo and it is obvious why.

So this draws ours. Pixel by pixel, in the kit's own outline colour and at a
height that fits its doorways. There is a front, a back and a side, each with
two frames of breath and a four-frame walk, and one seated frame pair for
gathering round the fire. One villager walks per open session; the subagents a
session sends out are `helper-` copies of all of it, in an ochre tunic and a
green hood with a satchel, two pixels shorter so they read as a different kind
of person at a glance. The side frames face right and the renderer flips them.

The rest of the sheet is the life round them: gulls, butterflies, fireflies,
fish and the splash they leave, a falling leaf, a cat, a dog, smoke, and the
campfire's flames and ember. Every frame is anchored bottom-centre (the feet,
or the base of the thing), so frames of different heights stand on one point.

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


def draw(rows: list[str], palette: dict | None = None) -> Image.Image:
    palette = palette or PALETTE
    width = len(rows[0])
    image = Image.new("RGBA", (width, len(rows)), (0, 0, 0, 0))
    pixels = image.load()
    for y, row in enumerate(rows):
        if len(row) != width:
            raise SystemExit(f"row {y} is {len(row)} wide, wanted {width}: {row!r}")
        for x, key in enumerate(row):
            colour = palette[key]
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


# ---------------------------------------------------------------------------
# Walking, sitting, and the helpers
# ---------------------------------------------------------------------------

LEG_ROWS = slice(20, 27)


def mirror(rows: list[str]) -> list[str]:
    return [row[::-1] for row in rows]


def put(rows: list[str], y: int, x: int, text: str) -> None:
    row = rows[y]
    rows[y] = row[:x] + text + row[x + len(text) :]


def with_legs(rows: list[str], legs: list[str]) -> list[str]:
    return rows[:20] + legs


# Contact: the left leg reaches forward and the right one is lifted off the
# ground behind it. Passing: legs together, the right one just clear.
LEGS_CONTACT = [
    "...KPPPPPPK...",
    "...KPPKKPPK...",
    "...KppKKBBK...",
    "...KppKKKKK...",
    "...KBBK.......",
    "...KBBK.......",
    "...KKKK.......",
]
LEGS_PASS = [
    "...KPPPPPPK...",
    "...KPPKKPPK...",
    "...KPPKKPPK...",
    "...KppKKppK...",
    "...KBBKKBBK...",
    "...KKKKKBBK...",
    ".......KKKK...",
]


def swing_arms(rows: list[str]) -> list[str]:
    """Left hand reaches a pixel lower, the right one tucks a pixel up."""
    rows = list(rows)
    put(rows, 18, 1, "KsK")
    put(rows, 19, 1, "KKK")
    put(rows, 17, 10, "KKK")
    put(rows, 18, 11, ".")
    return rows


def walk_vertical(base: list[str]) -> list[list[str]]:
    drop = breathing(base)
    contact = swing_arms(with_legs(drop, LEGS_CONTACT))
    passing = with_legs(base, LEGS_PASS)
    return [contact, passing, mirror(contact), mirror(passing)]


SIDE = [
    "....KKKKKK....",
    "..KKhhhhhhKK..",
    ".KhhhhhhhhhhK.",
    ".KhHHHHHHHHhK.",
    ".KHHHHHHHSSSK.",
    ".KHHHHHHHSSSK.",
    ".KHHHHHHHSeSK.",
    ".KHHHHHHHSSSK.",
    ".KHHHHHHSSssK.",
    "..KHHHHHSSSK..",
    "..KHHHHHSsK...",
    "...KKKKKKKK...",
    "....KTTTTK....",
    "...KTTTTTTK...",
    "...KTTTTTTK...",
    "...KTTTTTTK...",
    "...KTTTTTTK...",
    "...KTTTTTTK...",
    "...KTTTTTTK...",
    "...KttttttK...",
    "....KPPPPK....",
    "....KPPPPK....",
    "....KPPPPK....",
    "....KppppK....",
    "....KBBBBK....",
    "....KBBBBBK...",
    "....KKKKKKK...",
]

SIDE_STAND = SIDE[20:]

# Near leg is P, far leg is p; the near one is drawn in front.
SIDE_CONTACT = [
    "....KPPPPK....",
    "...KppKKPPK...",
    "..KppK..KPPK..",
    "..KppK..KPPK..",
    ".KBBK....KBBK.",
    ".KBBK....KBBBK",
    ".KKKK....KKKKK",
]
SIDE_PASS = [
    "....KPPPPK....",
    "....KPPPPK....",
    "....KppPPPK...",
    "....KppKPPK...",
    "....KBBKBBBK..",
    "....KKKKKKKK..",
    "." * 14,
]


def swap_legs(legs: list[str]) -> list[str]:
    return [row.translate(str.maketrans("Pp", "pP")) for row in legs]


def side_arm(rows: list[str], dx: int) -> list[str]:
    """The near arm, hanging from the shoulder and swinging dx pixels."""
    rows = list(rows)
    for y in range(14, 19):
        c = 6 + round(dx * (y - 14) / 4)
        put(rows, y, c, "tt" if y < 17 else "Ss")
    return rows


def walk_side() -> list[list[str]]:
    a = side_arm(with_legs(SIDE, SIDE_CONTACT), -2)
    b = side_arm(with_legs(SIDE, SIDE_PASS), 0)
    c = side_arm(with_legs(SIDE, swap_legs(SIDE_CONTACT)), 2)
    d = side_arm(with_legs(SIDE, SIDE_PASS), 0)
    # Contact frames sit a pixel lower than the passing ones.
    return [lower(a), b, lower(c), d]


def lower(rows: list[str]) -> list[str]:
    return ["." * WIDTH] + rows[:16] + rows[17:]


SIT = [
    *FRONT[:12],
    "....KTTTTK....",
    "..KKTTTTTTKK..",
    ".KSKuuuuuuKSK.",
    ".KSKTTTTTTKSK.",
    ".KsKTTTTTTKsK.",
    "..KKTTTTTTKK..",
    ".KKPPttttPPKK.",
    "KPPPPPPPPPPPPK",
    "KPpPPPPPPPpPPK",
    "KBBKPPPPPPKBBK",
    ".KKKKKKKKKKKK.",
]
SIT_BREATH = ["." * WIDTH] + SIT[:15] + SIT[16:]

PALETTE.update(
    {
        # Helpers: a green hood and an ochre tunic, a leather satchel.
        "G": (0x4A, 0x6B, 0x3A),
        "g": (0x62, 0x84, 0x4A),
        "O": (0xC9, 0x9A, 0x2E),
        "o": (0xDE, 0xB4, 0x4A),
        "a": (0xA0, 0x74, 0x1E),
        "b": (0x8A, 0x5A, 0x2B),
    }
)
# u is the lit shoulder, t the shaded hem.
FOLK_MAP = str.maketrans("HhTut", "GgOoa")

STRAP = {
    "front": [(13, 5), (14, 5), (15, 6), (16, 7), (17, 8), (17, 9), (18, 9)],
    "back": [(13, 8), (14, 8), (15, 7), (16, 6), (17, 5), (17, 4), (18, 4)],
    "side": [(13, 6), (14, 6), (15, 6), (16, 5), (17, 4), (18, 4), (17, 3)],
    "sit": [(13, 5), (14, 5), (15, 6), (16, 7)],
}


def helperise(rows: list[str], kind: str) -> list[str]:
    """Same person in another life: shorter by two rows, hooded, with a satchel."""
    height = len(rows)
    if height == HEIGHT:
        rows = rows[:16] + rows[17:21] + rows[22:]
    elif height > 20:
        rows = rows[:16] + rows[17:]
    rows = [row.translate(FOLK_MAP) for row in rows]
    # The first row of a bobbing frame is blank, so find the head by content.
    for y, x in STRAP[kind]:
        if y < len(rows) and rows[y][x] in "Ooa":
            rows[y] = rows[y][:x] + "b" + rows[y][x + 1 :]
    return rows


def folk_frames() -> dict[str, list[str]]:
    frames: dict[str, list[str]] = {
        "front-0": FRONT,
        "front-1": breathing(FRONT),
        "back-0": BACK,
        "back-1": breathing(BACK),
        "side-0": SIDE,
        "side-1": breathing(SIDE),
        "sit-0": SIT,
        "sit-1": SIT_BREATH,
    }
    for i, rows in enumerate(walk_vertical(FRONT)):
        frames[f"walk-down-{i}"] = rows
    for i, rows in enumerate(walk_vertical(BACK)):
        frames[f"walk-up-{i}"] = rows
    for i, rows in enumerate(walk_side()):
        frames[f"walk-side-{i}"] = rows
    return frames


def kind_of(name: str) -> str:
    for key, kind in (("down", "front"), ("front", "front"), ("up", "back"),
                      ("back", "back"), ("side", "side"), ("sit", "sit")):
        if key in name:
            return kind
    raise SystemExit(name)


# ---------------------------------------------------------------------------
# Ambient life: critters, smoke, flames
# ---------------------------------------------------------------------------

CRITTER = {
    ".": None,
    "K": INK,
    "W": (0xF4, 0xF1, 0xE8),
    "G": (0xB6, 0xBB, 0xC2),
    "D": (0x4E, 0x3F, 0x3F),
    "Y": (0xE2, 0xA0, 0x2C),
    "O": (0xE8, 0x8A, 0x2E),
    "B": (0x48, 0x25, 0x10),
    "P": (0xA9, 0xCB, 0xEC),
    "q": (0x5E, 0x8F, 0xC8),
    "L": (0xE4, 0xF0, 0x7A),
    # Fish.
    "b": (0x3E, 0x6A, 0x8C),
    "f": (0x8F, 0xB6, 0xD2),
    "w": (0xDC, 0xEA, 0xF0),
    # Foam.
    "F": (0xE9, 0xF5, 0xF6),
        # Leaves.
    "l": (0xD9, 0x73, 0x24),
    "d": (0xA8, 0x4E, 0x1A),
    # Cat and dog fur.
    "C": (0xC9, 0x8A, 0x4A),
    "c": (0x9A, 0x62, 0x2E),
    "e": (0x3B, 0x2A, 0x22),
    "n": (0xE8, 0xB8, 0x98),
    "N": (0x2A, 0x1C, 0x18),
    "T": (0xB8, 0x86, 0x4E),
    "t": (0x8A, 0x5E, 0x33),
    # Flames.
    "R": (0xD9, 0x4E, 0x1C),
    "r": (0xF2, 0x8C, 0x25),
    "y": (0xFF, 0xD2, 0x4A),
    "h": (0xFF, 0xF3, 0xB0),
    "E": (0xFF, 0x9A, 0x2A),
}

GULLS = [
    ["....W....", "DGGWWWGGD", ".GWWWWWG.", "....W....", "....G...."],
    ["D...W...D", ".GG.W.GG.", "..GWWWG..", "....W....", "....G...."],
    ["....W....", "..DGWGD..", "..GWWWG..", "....W....", "....G...."],
    ["....W....", "..GGWGG..", ".GGWWWGG.", "D...W...D", "....G...."],
]
BUTTERFLY = [
    [["O.O", "OBO", ".B."], [".O.", ".B.", ".O."]],
    [["P.P", "PBP", ".B."], [".P.", ".B.", ".P."]],
]
FISH = [
    ["....fb", "..bffw", ".bffw.", "bb.w.."],
    ["..bbb.", "bbfffb", "b.www.", "......"],
    ["bb.w..", ".bffw.", "..bffw", "....fb"],
]
SPLASH = [
    ["...F...", "..F.F..", "...F..."],
    ["..FFF..", ".F...F.", "..FFF.."],
    [".F...F.", "F.....F", ".F...F."],
]
LEAF = [["lld", ".dd"], ["dll", "dd."]]
CAT = [
    [".K...K.", ".KCCCK.", ".KeCeK.", ".KCnCK.", "KCCCCCK", "KKKKKKK"],
    [".......", ".K...K.", ".KCCCK.", ".KeCeK.", "KCCnCCK", "KKKKKKK"],
]
DOG_BODY = [
    "......K.K.",
    "K...KKTTTK",
    ".K.KTTTTeT",
    ".KTTTTTTTN",
    ".KTTTTTTK.",
]
DOG_LEGS = [
    (2, 4, 6, 8),
    (3, 4, 6, 7),
    (4, 2, 8, 6),
    (3, 4, 6, 7),
]
DOG_DOWN = [(1, 0, 0, 1), (0, 0, 0, 0), (0, 1, 1, 0), (0, 0, 0, 0)]


def dog_frame(i: int) -> list[str]:
    xs, down = DOG_LEGS[i], DOG_DOWN[i]
    top, foot = ["." * 10] * 2, ["." * 10] * 2
    r5 = list("." * 10)
    r6 = list("." * 10)
    for x, d in zip(xs, down):
        r5[x] = "t"
        if d:
            r6[x] = "K"
    return DOG_BODY + ["".join(r5), "".join(r6)]


def puff(width: int, height: int, circles: list[tuple[float, float, float]]) -> Image.Image:
    """Opaque, three-tone smoke: light on top, a darker underside."""
    mask = [
        [any((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r for cx, cy, r in circles)
         for x in range(width)]
        for y in range(height)
    ]
    image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    pixels = image.load()
    for y in range(height):
        for x in range(width):
            if not mask[y][x]:
                continue
            below = y + 1 >= height or not mask[y + 1][x]
            above = y == 0 or not mask[y - 1][x]
            left = x == 0 or not mask[y][x - 1]
            if below and y >= height * 0.4:
                colour = (0xA8, 0xA6, 0xA6)
            elif y >= height * 0.6:
                colour = (0xC2, 0xC0, 0xBF)
            elif above and left:
                colour = (0xEE, 0xEC, 0xE8)
            else:
                colour = (0xDA, 0xD8, 0xD4)
            pixels[x, y] = (*colour, 255)
    return image


FLAMES = [
    [
        "..........",
        "....R.....",
        "....Rr....",
        "...RrE....",
        "...RErR...",
        "..RErEr...",
        "..ErEyEr..",
        ".RrEyyEr..",
        ".ErEyhyEr.",
        ".ErEyhyEr.",
        ".RErEyErR.",
        "..RRRRRR..",
    ],
    [
        "..........",
        ".....R....",
        "....rR....",
        "....ErR...",
        "...RErr...",
        "...ErEyr..",
        "..ErEyyEr.",
        "..ErEyhyEr",
        ".RrEyhhyEr",
        ".ErEyhhyEr",
        ".RErEyyErR",
        "..RRRRRR..",
    ],
    [
        "....R.....",
        "....Rr....",
        "...RrR....",
        "...ErE....",
        "..RErEr...",
        "..ErEyEr..",
        ".RrEyyEr..",
        ".ErEyhyEr.",
        ".ErEyhyEr.",
        ".RrEyhyErR",
        ".RErEyErR.",
        "..RRRRRR..",
    ],
    [
        "..........",
        "..........",
        "....R.R...",
        "....rRr...",
        "...ErEr...",
        "..RErEyr..",
        "..ErEyyEr.",
        ".RrEyhyEr.",
        ".ErEyhhyEr",
        ".ErEyhyEr.",
        ".RErEyErR.",
        "..RRRRRR..",
    ],
]


def critter_frames() -> dict[str, Image.Image]:
    frames: dict[str, Image.Image] = {}
    for i, rows in enumerate(GULLS):
        frames[f"gull-{i}"] = draw(rows, CRITTER)
    for variant, name in zip(BUTTERFLY, ("butterfly", "butterfly-b")):
        for i, rows in enumerate(variant):
            frames[f"{name}-{i}"] = draw(rows, CRITTER)
    frames["firefly"] = draw(["LL", "LL"], CRITTER)
    for i, rows in enumerate(FISH):
        frames[f"fish-{i}"] = draw(rows, CRITTER)
    for i, rows in enumerate(SPLASH):
        frames[f"splash-{i}"] = draw(rows, CRITTER)
    for i, rows in enumerate(LEAF):
        frames[f"leaf-{i}"] = draw(rows, CRITTER)
    for i, rows in enumerate(CAT):
        frames[f"cat-{i}"] = draw(rows, CRITTER)
    for i in range(4):
        frames[f"dog-walk-{i}"] = draw(dog_frame(i), CRITTER)
    frames["smoke-0"] = puff(3, 3, [(1.5, 1.5, 1.45)])
    frames["smoke-1"] = puff(5, 5, [(2.5, 2.5, 2.4)])
    frames["smoke-2"] = puff(7, 6, [(2.5, 3.5, 2.5), (4.5, 3.2, 2.8), (3.5, 2.2, 2.2)])
    frames["smoke-3"] = puff(
        9, 8, [(3.0, 4.8, 3.0), (5.8, 4.8, 3.2), (4.5, 3.0, 3.0), (4.5, 5.5, 3.3)]
    )
    for i, rows in enumerate(FLAMES):
        frames[f"flame-{i}"] = draw(rows, CRITTER)
    frames["ember"] = draw(["E"], CRITTER)
    return frames


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
    for name, rows in folk_frames().items():
        if name not in frames:
            frames[name] = draw(rows)
        frames[f"helper-{name}"] = draw(helperise(rows, kind_of(name)))
    frames.update(critter_frames())

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
