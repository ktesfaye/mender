#!/usr/bin/env python3
"""Draw the villagers, the townsfolk, the animals and the boat.

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

Eight townsfolk (`town-a-` .. `town-h-`: farmer, woman in red, elder, child,
blacksmith, merchant, fisher, woman in a headscarf) carry exactly the villager's
frame set. They are not redrawn: each takes the villager's own rows, swaps the
palette, stamps its hat, hair, apron or skirt on top, and runs the same walk
pipeline, so the legs alternate exactly as the villager's do. `carry-*` are the
small things a walker holds out in front; `chicken`, `hen`, `sheep`, `pig`, `cow`,
`duck`, `crow`, `cat-walk`, `dog-sit` are farm and yard animals (walks face right,
the renderer flips them; each also has a peck/graze/idle or hop/fly frame); then
`cart-0/1` (a handcart, wheel turning) and `boat-0/1` (a sailboat bobbing);
`wagon-*` and `rider-*` (a covered wagon behind a horse, and a horse with a rider
on it) in `side`, `down` and `up` views four frames each, and `horse-walk-*` and
`horse-graze`, which are what still read from high over the island. The
animals are drawn without an outline and ringed in the kit's ink automatically.
The sheet wraps to a new row at 2048px.

The rest of the sheet is the life round them: gulls, butterflies, fireflies,
fish and the splash they leave, a falling leaf, a cat, a dog, smoke, and the
campfire's flames and ember. Every frame is anchored bottom-centre (the feet,
or the base of the thing), so frames of different heights stand on one point.

    python3 tools/make-folk.py

Writes assets/folk/folk.png and assets/folk/folk.json.
"""

from __future__ import annotations

import json
import math
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


def walk_side(side: list[str] | None = None) -> list[list[str]]:
    side = side or SIDE
    a = side_arm(with_legs(side, SIDE_CONTACT), -2)
    b = side_arm(with_legs(side, SIDE_PASS), 0)
    c = side_arm(with_legs(side, swap_legs(SIDE_CONTACT)), 2)
    d = side_arm(with_legs(side, SIDE_PASS), 0)
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


# ---------------------------------------------------------------------------
# Townsfolk: the villager's body, dressed eight other ways
# ---------------------------------------------------------------------------


def hx(value: int) -> tuple[int, int, int]:
    return (value >> 16 & 255, value >> 8 & 255, value & 255)


# Keys the villager does not use, for the accessories the townsfolk add.
EXTRA = {
    "W": 0xF4F1E8, "w": 0xD6D0BE,  # linen, apron, headscarf
    "R": 0xD63A32, "r": 0x9C2420,  # red
    "Y": 0xE2BE5C, "y": 0xC49A3A,  # straw, gold
    "L": 0x9A622E, "l": 0x6E4220,  # leather, belt
    "N": 0x24523A, "n": 0x38785A,  # dark green felt
    "Q": 0x2E58A8, "q": 0x1E3C78,  # blue cap
    "V": 0x7A4FA0, "v": 0x5A3A7C,  # purple
    "Z": 0xEEEEE8, "z": 0xC8C6C0,  # white beard
}
VPAL = {**PALETTE, **{key: hx(value) for key, value in EXTRA.items()}}


def stamp(rows: list[str], y: int, x: int, text: str) -> None:
    """Write text into a row; a '.' in it leaves what is there alone."""
    row = list(rows[y])
    for i, ch in enumerate(text):
        if ch != "." and 0 <= x + i < len(row):
            row[x + i] = ch
    rows[y] = "".join(row)


def colour(**kw: int) -> dict:
    return {key: hx(value) for key, value in kw.items()}


def skirt(rows: list[str], kind: str, sway: int, top: str, mid: str, hem: str,
          apron: str | None = None, trim: str | None = None) -> None:
    if kind == "side":
        shape = ["...KTTTTTTK...", "..KTTTTTTTTK..", "..KTTTTTTTTK..", "..KttttttttK.."]
    else:
        shape = ["..KTTTTTTTTK..", "..KTuTTTTTTK..", ".KTTTTTTTTTTK.", ".KttttttttttK."]
    for i, row in enumerate(shape):
        row = row.replace("T", mid).replace("t", hem).replace("u", top)
        if i >= 2 and sway:
            row = (row[-sway:] + row[:-sway]) if sway > 0 else (row[-sway:] + row[:-sway])
        rows[20 + i] = row
        if apron and kind != "side" and i < 4:
            stamp(rows, 20 + i, 5 + (sway if i >= 2 else 0), apron[i] * 4)
        if trim and i == 3:
            stamp(rows, 20 + i, 2, "".join(trim if c in "tT" else c for c in row[2:12]))


def sway_of(name: str) -> int:
    return {"walk-down-0": -1, "walk-down-2": 1, "walk-up-0": -1, "walk-up-2": 1}.get(name, 0)


def cut(rows: list[str], drop: tuple[int, ...]) -> list[str]:
    return [row for y, row in enumerate(rows) if y not in drop]


def dress_up(front, back, side, pal, post=None, drop=()) -> dict[str, Image.Image]:
    frames: dict[str, list[str]] = {
        "front-0": front, "front-1": breathing(front),
        "back-0": back, "back-1": breathing(back),
        "side-0": side, "side-1": breathing(side),
    }
    for i, rows in enumerate(walk_vertical(front)):
        frames[f"walk-down-{i}"] = rows
    for i, rows in enumerate(walk_vertical(back)):
        frames[f"walk-up-{i}"] = rows
    for i, rows in enumerate(walk_side(side)):
        frames[f"walk-side-{i}"] = rows
    out = {}
    for name, rows in frames.items():
        rows = list(rows)
        if post:
            post(name, rows)
        out[name] = draw(cut(rows, drop), {**VPAL, **pal})
    return out


def copy3():
    return list(FRONT), list(BACK), list(SIDE)


def fill(rows, ys, xs, ch):
    for y in ys:
        for x in xs:
            stamp(rows, y, x, ch)


def town_a():
    f, b, s = copy3()
    hat = ["....KKKKKK....", "...KYYYYYYK...", "...KLLLLLLK...", "KKYYYYYYYYYYKK",
           ".KKyyyyyyyyKK."]
    for rows in (f, b, s):
        for y, text in enumerate(hat):
            rows[y] = text
    for rows, xs in ((f, (5, 8)), (b, (5, 8)), (s, (5,))):
        fill(rows, range(14, 19), xs, "P")
    pal = colour(S=0xD9A06C, s=0xB97F4E, H=0x5A391D, h=0x734C28, T=0xE8DFC8, u=0xF6F0E0,
                 t=0xC4B89C, P=0x4F6A9A, p=0x3B527C)
    return dress_up(f, b, s, pal)


def town_b():
    f, b, s = copy3()
    stamp(f, 9, 3, "H"); stamp(f, 9, 10, "H")
    stamp(f, 10, 3, "H"); stamp(f, 10, 10, "H")
    f[11] = "..KHKKKKKKHK.."
    f[12] = "..KHKTTTTKHK.."
    for y in range(15, 19):
        stamp(f, y, 5, "WWWW")
    stamp(f, 19, 5, "wwww")
    fill(b, range(12, 15), range(4, 10), "H")
    stamp(b, 16, 6, "WW"); stamp(b, 17, 5, "WWWW")
    fill(s, range(12, 15), (4, 5), "H")
    fill(s, range(15, 19), (8, 9), "W")
    pal = colour(S=0xF0C8A2, s=0xD0A07C, H=0x8A3C1E, h=0xA6522A, T=0xB8322C, u=0xD24E44,
                 t=0x8C2420)

    def post(name, rows):
        kind = kind_of(name)
        skirt(rows, kind, sway_of(name), "u", "T", "t", apron="WWWw" if kind == "front" else None)
        if kind == "back":
            stamp(rows, 20, 6, "WW")

    return dress_up(f, b, s, pal, post)


def town_c():
    f, b, s = copy3()
    stamp(f, 8, 4, "ZZZZZZ"); stamp(f, 9, 3, "ZZZZZZZZ"); stamp(f, 10, 3, "zZZZZZZz")
    stamp(s, 8, 8, "ZZZZ"); stamp(s, 9, 8, "ZZZ"); stamp(s, 10, 8, "ZZ")
    for y in range(12):
        s[y] = "." + s[y][:-1]
    pal = colour(S=0xE2BC9C, s=0xC29C80, H=0xD8D6D2, h=0xEEECE8, T=0x9A6A6E, u=0xB4868A,
                 t=0x764A50, P=0x6E6258, p=0x584E46)

    def post(name, rows):
        fill(rows, (17,), range(4, 10), "L") if kind_of(name) != "side" else None

    return dress_up(f, b, s, pal, post, drop=(15, 16))


def town_d():
    f, b, s = copy3()
    pal = colour(S=0xF4CFAF, s=0xD8A98A, H=0xD9822E, h=0xEE9A44, T=0xF0C23A, u=0xFAD866,
                 t=0xC89A22, P=0x4A6CA8, p=0x3A5A94)
    return dress_up(f, b, s, pal, drop=(15, 16, 21, 22))


def town_e():
    f, b, s = copy3()
    stamp(f, 8, 4, "HHHHHH"); stamp(f, 9, 3, "HHHHHHHH"); stamp(f, 10, 4, "HHHHHH")
    stamp(s, 8, 8, "HHHH"); stamp(s, 9, 8, "HHH"); stamp(s, 10, 8, "HH")
    for rows in (f, b):
        for y in (14, 15, 16):
            rows[y] = "KSSK" + rows[y][4:10] + "KSSK"
        rows[17] = "KsSK" + rows[17][4:10] + "KSsK"
    stamp(f, 13, 5, "l..l"); stamp(f, 14, 4, "lLLLLl")
    for y in (15, 16, 17, 18):
        stamp(f, y, 4, "LLLLLL")
    stamp(f, 19, 4, "llllll")
    stamp(b, 15, 6, "ll"); stamp(b, 17, 5, "llll")
    for y in range(14, 19):
        stamp(s, y, 7, "LL")
    stamp(s, 19, 7, "ll")
    pal = colour(S=0xAC784E, s=0x8C5C38, H=0x4A3A32, h=0x5E4A40, T=0x6A6668, u=0x82787A,
                 t=0x4C484A, P=0x4A4440, p=0x38322E, B=0x2A2220)

    def post(name, rows):
        kind = kind_of(name)
        if kind == "front":
            fill(rows, (20, 21), range(4, 10), "L")
            fill(rows, (22,), range(4, 10), "l")
        if kind == "side":
            for y in (14, 15, 16):
                rows[y] = rows[y].replace("t", "s")

    return dress_up(f, b, s, pal, post)


def town_f():
    f, b, s = copy3()
    hat = ["....KKKKKKRR..", "...KnNNNNNKR..", "...KYYYYYYK...", ".KKNNNNNNNNKK."]
    for rows in (f, b, s):
        for y, text in enumerate(hat):
            rows[y] = text
    stamp(f, 13, 5, "WWWW"); fill(f, (14, 15, 16), (6,), "Y")
    for rows, x in ((f, 4), (b, 4), (s, 4)):
        stamp(rows, 18, x, "LLLLLL")
    stamp(f, 18, 6, "YY")
    stamp(f, 17, 9, "L"); stamp(f, 18, 9, "L")
    pal = colour(S=0xF1CDAA, s=0xD4A886, H=0x7A6A5A, h=0x948472, T=0x2E7D5B, u=0x44A07A,
                 t=0x1F5C42, P=0x3A3440, p=0x2C2630, B=0x2A1E18)
    return dress_up(f, b, s, pal)


def town_g():
    f, b, s = copy3()
    cap = ["....KKKKKK....", "..KKQQQQQQKK..", ".KQQQQQQQQQQK.", ".KqqqqqqqqqqK."]
    for rows in (f, b):
        for y, text in enumerate(cap):
            rows[y] = text
    for y, text in enumerate(cap):
        s[y] = text
    s[3] = ".KqqqqqqqqqqqK"
    for rows in (f, b):
        fill(rows, (15, 17), (6,), "t")
    pal = colour(S=0xC98A62, s=0xA86E4A, H=0x8C8C8C, h=0xA4A4A4, T=0xE4B82C, u=0xF6D24A,
                 t=0xB88C1A, P=0x2C3E6A, p=0x22305A, B=0x1E2A4A, Q=0x2E58A8, q=0x1E3C78)

    def post(name, rows):
        kind = kind_of(name)
        if kind == "side":
            rows[20] = "...KTTTTTTK..."
            rows[21] = "...KttttttK..."
        else:
            rows[20] = "..KTTTTTTTTK.."
            rows[21] = "..KttttttttK.."

    return dress_up(f, b, s, pal, post)


def town_h():
    f, b, s = copy3()
    scarf = ["....KKKKKK....", "..KKWWWWWWKK..", ".KWWWWWWWWWWK.", ".KWwWWWWWWwWK."]
    for rows in (f, b, s):
        for y, text in enumerate(scarf):
            rows[y] = text
    for y in range(4, 9):
        stamp(f, y, 2, "W"); stamp(f, y, 11, "W")
    for y in range(4, 11):
        b[y] = b[y].replace("H", "W").replace("h", "w")
        s[y] = s[y].replace("H", "W").replace("h", "w")
    fill(b, range(8, 12), (6, 7), "w")
    for rows in (f, b):
        for y in (14, 15, 16):
            stamp(rows, y, 2, "V"); stamp(rows, y, 11, "V")
    fill(f, (17,), range(4, 10), "Y")
    fill(b, (17,), range(4, 10), "Y")
    fill(s, (17,), range(4, 10), "Y")
    pal = colour(S=0x96623E, s=0x784A2C, H=0x3A2A22, h=0x4C382C, T=0x7A4FA0, u=0x9468BC,
                 t=0x5A3A7C)

    def post(name, rows):
        skirt(rows, kind_of(name), sway_of(name), "u", "T", "t", trim="Y")

    return dress_up(f, b, s, pal, post)


TOWNSFOLK = {"a": town_a, "b": town_b, "c": town_c, "d": town_d, "e": town_e,
             "f": town_f, "g": town_g, "h": town_h}


# ---------------------------------------------------------------------------
# Animals, carried things, the handcart and the boat
# ---------------------------------------------------------------------------

ANI = {
    ".": None, "K": INK,
    "W": hx(0xF4F1E8), "w": hx(0xD8D4CA), "R": hx(0xD63A32), "Y": hx(0xE8A02C),
    "O": hx(0xE8822E), "M": hx(0xB0682F), "m": hx(0x864A24), "e": hx(0x1E1614),
    "E": hx(0xF6F2E0),
    "C": hx(0xF2EAD2), "c": hx(0xD2C6A8), "D": hx(0x6A5A52), "d": hx(0x3E3230),
    "P": hx(0xF2AEA6), "p": hx(0xD4827C), "n": hx(0xF8C8BE),
    "N": hx(0x2E282C), "h": hx(0xD0A860),
    "G": hx(0x2E865A), "b": hx(0xA0866A), "B": hx(0x7A644C),
    "S": hx(0x6272A0), "s": hx(0x52586E), "l": hx(0x6A5C60), "k": hx(0x9A8E78),
    "C2": None,
    "T": hx(0xC98A4A), "t": hx(0x9A622E), "f": hx(0xB8864E), "g": hx(0x8A5E33),
    "u": hx(0xE8B898), "x": hx(0x2A1C18),
    "L": hx(0xB07A3E), "j": hx(0x7A4E26), "a": hx(0xD8C49A),
    "q": hx(0xA9D4E8), "r": hx(0xD6407A), "I": hx(0xA4A09A), "i": hx(0x7C7872),
}


def outlined(rows: list[str]) -> list[str]:
    """Pad by one and ring the silhouette in the kit's ink, as every sprite here is."""
    w = len(rows[0])
    grid = ["." * (w + 2)] + ["." + r + "." for r in rows] + ["." * (w + 2)]
    out = []
    for y, row in enumerate(grid):
        line = ""
        for x, ch in enumerate(row):
            if ch != ".":
                line += ch
                continue
            near = any(
                0 <= y + dy < len(grid) and 0 <= x + dx < len(row) and grid[y + dy][x + dx] != "."
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
            )
            line += "K" if near else "."
        out.append(line)
    return out


def group(frames: dict[str, list[str]], rings: bool = True) -> dict[str, Image.Image]:
    """Outline every frame of one animal and crop them all to the same box, so the
    foot point stays put from frame to frame."""
    w = max(len(r) for rows in frames.values() for r in rows)
    h = max(len(rows) for rows in frames.values())
    padded = {}
    for name, rows in frames.items():
        rows = [r.ljust(w, ".") for r in rows]
        rows = ["." * w] * (h - len(rows)) + rows
        padded[name] = outlined(rows) if rings else rows
    boxes = [
        (x, y)
        for rows in padded.values()
        for y, r in enumerate(rows)
        for x, ch in enumerate(r)
        if ch != "."
    ]
    x0, x1 = min(b[0] for b in boxes), max(b[0] for b in boxes)
    y0, y1 = min(b[1] for b in boxes), max(b[1] for b in boxes)
    return {
        name: draw([r[x0 : x1 + 1] for r in rows[y0 : y1 + 1]], ANI)
        for name, rows in padded.items()
    }


def recolour(rows: list[str], **swap: str) -> list[str]:
    table = str.maketrans(swap)
    return [r.translate(table) for r in rows]


CHICKEN = {
    "walk-0": ["...RR.", "W..WeY", "WWWWWR", ".WwWW.", ".O.O.."],
    "walk-1": ["...RR.", "W..WeY", "WWWWWR", ".WwWW.", "..O.O."],
    "peck": ["W...R.", "WWWWW.", ".WwWeY", ".O.O.."],
}
SHEEP = {
    "walk-0": [
        ".CCCCCC.....", "CCCcCCCCdD..", "CCCCCCCDDDDd", "CcCCCcCCDEDD", ".CCCcCCC.DDD",
        ".d.d..d.d...", ".d.d..d.d...",
    ],
    "walk-1": [
        ".CCCCCC.....", "CCCcCCCCdD..", "CCCCCCCDDDDd", "CcCCCcCCDEDD", ".CCCcCCC.DDD",
        "..d.d..d.d..", "..d.d..d.d..",
    ],
    "graze": [
        ".CCCCCC.....", "CCCcCCCC....", "CCCCCCCCDd..", "CcCCCcCCCDDD", ".CCCcCCC.DED",
        ".d.d..d.d.DD", ".d.d..d.d...",
    ],
}
PIG = {
    "walk-0": ["p.PPPPp...", ".PPPPPPPP.", ".PPpPPPPeNn", ".PPPPPPPnnn", ".pp.pp.pp.", ".p.p..p.p."],
    "walk-1": ["p.PPPPp...", ".PPPPPPPP.", ".PPpPPPPeNn", ".PPPPPPPnnn", "..pp.pp.pp", "..p.p..p.p"],
    "idle": ["p.PPPPp...", ".PPPPPPPP.", ".PPpPPPPeNn", ".PPPPPPPnnn", ".pp.pp.pp.", ".pp.pp.pp."],
}
COW = {
    "walk-0": [
        ".WWWWWWWWW.h..h", "WWWNNWWWWWWWWWW", "WWNNNNWWWWWNWeW", "WWWNNWWWNNWWWWW",
        "WWWWWWWNNNWWnnn", "WWWWWWWWWWWWnnn", ".WWWWWWWWWW.nn.", ".W.W..nn..W.W..",
        ".W.W......W.W..", ".N.N......N.N..",
    ],
    "walk-1": [
        ".WWWWWWWWW.h..h", "WWWNNWWWWWWWWWW", "WWNNNNWWWWWNWeW", "WWWNNWWWNNWWWWW",
        "WWWWWWWNNNWWnnn", "WWWWWWWWWWWWnnn", ".WWWWWWWWWW.nn.", "..W.W.nn.W.W...",
        "..W.W.....W.W..", "..N.N.....N.N..",
    ],
    "graze": [
        ".WWWWWWWWW.....", "WWWNNWWWWWWW...", "WWNNNNWWWWWWWh.", "WWWNNWWWNNWWWWh",
        "WWWWWWWNNNWNWeW", "WWWWWWWWWWWWWWW", ".WWWWWWWWWW.WnW", ".W.W..nn..W.Wnn",
        ".W.W......W.W..", ".N.N......N.N..",
    ],
}
DUCK = {
    "walk-0": ["...GG.", "...GeY", "bbbbW.", "BbbbB.", ".O.O.."],
    "walk-1": ["...GG.", "...GeY", "bbbbW.", "BbbbB.", "..OO.."],
    "idle": ["......", "...GG.", "BbbGeY", "bbbbB.", ".O.O.."],
}
CROW = {
    "hop-0": ["...NN.", "..NNEk", "NSSNN.", "NNNNN.", ".l.l.."],
    "hop-1": ["...NN.", "..NNEk", "NSSNN.", "NNNNN.", "......"],
    "fly-0": ["N.....N.", "NN...NN.", ".NSSNNEk", "..NNNN..", "........"],
    "fly-1": ["........", "..NNNNEk", ".NSSSNN.", "NN....NN", "........"],
}
CAT_W = {
    "walk-0": ["t....T.T", "tTTTTTeT", ".TTTTTTu", ".t.t..t."],
    "walk-1": ["t....T.T", "tTTTTTeT", ".TTTTTTu", "..tt.tt."],
}
DOG_SIT = [
    "...gg...", "...ffff.", "...fefxx", "...ffff.", "..ffff..", ".fffff..",
    ".ffffg..", "fffffg..", "gfffgfg.",
]


def animals() -> dict[str, Image.Image]:
    out: dict[str, Image.Image] = {}

    def add(prefix, frames, rings=True):
        for name, image in group(frames, rings).items():
            out[f"{prefix}-{name}"] = image

    add("chicken", CHICKEN)
    add("hen", {k: recolour(v, W="M", w="m") for k, v in CHICKEN.items()})
    add("sheep", SHEEP)
    add("pig", PIG)
    add("cow", {k: v for k, v in COW.items() if v})
    add("duck", DUCK)
    add("crow", {k: v for k, v in CROW.items() if k.startswith("hop")})
    add("crow", {k: v for k, v in CROW.items() if k.startswith("fly")})
    add("cat", CAT_W)
    add("dog", {"sit": DOG_SIT})
    return out


def sprite(rows: list[str]) -> Image.Image:
    return draw(rows, ANI)


CARRIED = {
    "carry-scroll": [".KKKK.", "KWWWRK", "KwWWwK", ".KKKK."],
    "carry-crate": ["KKKKKKK", "KLLLLLK", "KLLLLLK", "KjjjjjK", "KLLLLLK", "KKKKKKK"],
    "carry-hammer": ["KKKKKK", "KIIIiK", "KIIIiK", "KKLLKK", ".KLjK.", ".KLjK.", ".KKKK."],
    "carry-flask": [".KKK.", ".KLK.", ".KqK.", "KqRRK", "KRRrK", ".KKK."],
    "carry-letter": ["KKKKK", "KwWwK", "KWRWK", "KKKKK"],
    "carry-basket": [".KRYK..", "KRYRRK.", "KLjLjLK"[:7], "KjLjLjK", ".KKKKK."],
}


class Cv:
    def __init__(self, w: int, h: int):
        self.w, self.h = w, h
        self.g = [["."] * w for _ in range(h)]

    def px(self, x, y, ch):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.g[y][x] = ch

    def rect(self, x0, y0, x1, y1, ch):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.px(x, y, ch)

    def rows(self):
        return ["".join(r) for r in self.g]


def crate(c: Cv, x0, y0, x1, y1):
    c.rect(x0, y0, x1, y1, "L")
    c.rect(x0 + 1, y0 + 1, x1 - 1, y1 - 1, "a")
    for dx, dy in ((1, 1), (4, 1), (2, 2), (3, 2)):
        c.px(x0 + dx, y0 + dy, "L")


def cart(phase: int) -> Image.Image:
    c = Cv(20, 13)
    c.rect(1, 4, 14, 4, "L")
    c.rect(1, 5, 14, 5, "j")
    crate(c, 2, 0, 7, 3)
    crate(c, 8, 0, 13, 3)
    c.rect(15, 4, 19, 4, "j")
    c.rect(15, 5, 17, 5, "j")
    c.rect(2, 6, 2, 12, "j")
    c.rect(1, 12, 3, 12, "j")
    cx, cy = 7.5, 8.5
    for y in range(13):
        for x in range(20):
            d2 = (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2
            if d2 <= 16.5:
                c.px(x, y, "B" if d2 > 9.5 else "a")
    if phase == 0:
        for k in range(6, 12):
            c.px(7, k, "B")
        for k in range(5, 11):
            c.px(k, 8, "B")
    else:
        for k in range(1, 6):
            c.px(4 + k, 5 + k, "B"); c.px(11 - k, 5 + k, "B")
    c.px(7, 8, "K")
    return draw(outlined(c.rows()), ANI)


def boat(bob: int) -> Image.Image:
    c = Cv(20, 17)
    top = 1 + bob
    for x in range(1, 20):
        t = (x - 1) / 18
        half = 3.2 * (1 - t ** 3) ** 0.55 * (0.45 + 0.55 * min(1, t * 3.2))
        cy = 12.0 + bob
        for y in range(int(cy - half + 0.5), int(cy + half + 0.5) + 1):
            edge = y <= cy - half + 0.6
            c.px(x, y, "j" if edge else ("L" if y < cy + 1 else "j"))
    for y in range(top, 11 + bob):
        t = (y - top) / (10 + bob - top)
        for x in range(round(9 - 6 * t), 9):
            c.px(x, y, "W" if x < 8 else "w")
        if y >= top + 2:
            for x in range(10, round(10 + 7 * (y - top - 2) / 8) + 1):
                c.px(x, y, "W" if x < round(10 + 7 * (y - top - 2) / 8) else "w")
    for y in range(top - 1, 12 + bob):
        c.px(9, y, "j")
    return draw(outlined(c.rows()), ANI)



# ---------------------------------------------------------------------------
# Horses, riders and wagons: what reads from high up
# ---------------------------------------------------------------------------
#
# A villager is a dozen pixels across and vanishes once the camera pulls back
# over the whole island. A horse is twice that and a covered wagon four times,
# and a white canvas moving along a brown road is the one thing you can still
# pick out from the water. Each comes three ways, side (drawn facing right and
# flipped), front (coming down the screen) and back (going up), four frames a
# walk.

def paint(c: Cv, x0: int, y0: int, rows: list[str]) -> None:
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch != ".":
                c.px(x0 + x, y0 + y, ch)


HORSE_SIDE = [
    "...................m.m....",
    "..................NMMMm...",
    ".................NMMMeMm..",
    "................NNMMMMMMM.",
    "...............NNMMMmMMMMh",
    "..............NNMMMm..mMMd",
    ".............NNMMMm...mmd.",
    ".....hhhhhhhNMMMMm........",
    "...MMMMMMMMMMMMMMMm.......",
    "..NMMMMMMMMMMMMMMMm.......",
    ".NNMMMMMMMMMMMMMMMm.......",
    ".NNmMMMMMMMMMMMMMmm.......",
    ".NNmmMMMMMMMMMMMmm........",
    ".NN.mmmmmmmmmmmmm.........",
    "..N.......................",
    "..N.......................",
]
HORSE_GRAZE_HEAD = [
    "NNMm.......",
    ".NNMMm.....",
    "..NMMMm....",
    "...mMMMm...",
    "....mMMMm..",
    ".....MeMMm.",
    "......MMMm.",
    ".......mdd.",
]
HORSE_FRONT = [
    "...M....M...",
    "...MMNNMM...",
    "...eMNNMe...",
    "...mMhhMm...",
    "..MmMhhMmM..",
    ".MMmMMhMmMM.",
    "MMMmMMMMmMMM",
    "MMMmMMMMmMMM",
    "MMMMmddmMMMM",
    "mMMMmddmMMMm",
    ".mMMMmmMMMm.",
    "..mmmmmmmm..",
]
HORSE_BACK = [
    "...m....m...",
    "...mMNNMm...",
    "....NNNN....",
    "...MNNNNM...",
    "...MMNNMM...",
    "...mMMMMm...",
]
HORSE_RUMP = [
    ".MMMMMMMMMM.",
    "MMMMMMMMMMMM",
    "MMMMMMMMMMMM",
    "mMMMMMMMMMMm",
    "mMMMMNNMMMMm",
    ".mMMMNNMMMm.",
    "..mmmNNmmm..",
    ".....NN.....",
]
# Each hoof's swing through a side walk, and which front leg is lifted head on.
SWING = [(1, -1, -1, 1), (0, 0, 0, 0), (-1, 1, 1, -1), (0, 0, 0, 0)]
LIFT = [(0, 2), (0, 0), (2, 0), (0, 0)]
CARTER_SIDE = [".ggg.", "ggggg", ".uux.", ".uuu.", "SSSS.", "SSSSu", "SSSS.", "BBBB."]
CARTER_FRONT = [".ggggg.", "ggggggg", ".uuuuu.", ".uxuxu.", ".uuuuu.", "SSSSSSS", "SSSSSSS",
                "SSSSSSS", "SSSSSSS"]
RIDER_SIDE = [".ggg.", "ggggg", ".uux.", ".uuu.", "RRRR.", "RRRRu", "RRRR."]
RIDER_FRONT = [".gggggg.", "gggggggg", ".uuuuuu.", ".uxuuxu.", ".uuuuuu.", "RRRRRRRR",
               "RRRRRRRR"]
RIDER_BACK = [".gggggg.", "gggggggg", ".gggggg.", ".uuuuuu.", "RRRRRRRR", "RRRRRRRR",
              "RRRRRRRR", "BRRRRRRB", "B......B", "B......B"]


def horse_side(frame: int, graze: bool = False) -> list[str]:
    c = Cv(26, 20)
    bob = frame % 2
    for y, row in enumerate(HORSE_SIDE):
        for x, ch in enumerate(row):
            if ch != "." and not (graze and x >= 15 and y <= 7):
                c.px(x, y + bob, ch)
    if graze:
        paint(c, 15, 7 + bob, HORSE_GRAZE_HEAD)
    for (x, front), s in zip(((4, 0), (7, 0), (13, 1), (16, 1)), SWING[frame]):
        top = 13 + bob
        for y in range(top, 19):
            dx = round(s * (y - top) / (18 - top))
            c.px(x + dx, y, "M" if front else "m")
            c.px(x + 1 + dx, y, "m")
        c.px(x + s, 19, "d")
        c.px(x + s + 1, 19, "d")
    return c.rows()


def front_legs(c: Cv, frame: int, top: int, foot: int) -> None:
    for x, lift in zip((2, 8), LIFT[frame]):
        for y in range(top, foot - lift):
            c.px(x, y, "M")
            c.px(x + 1, y, "m")
        c.px(x, foot - lift, "d")
        c.px(x + 1, foot - lift, "d")


def horse_front(frame: int) -> list[str]:
    c = Cv(12, 20)
    paint(c, 0, 0, HORSE_FRONT)
    front_legs(c, frame, 12, 19)
    return c.rows()


def big_wheel(c: Cv, cx: float, cy: float, r: float, phase: int) -> None:
    for y in range(int(cy - r - 1), int(cy + r + 2)):
        for x in range(int(cx - r - 1), int(cx + r + 2)):
            d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
            if d <= r:
                c.px(x, y, "j" if d > r - 1.2 else "g")
    for k in range(4):
        a = (phase % 2) * math.pi / 4 + k * math.pi / 2
        for i in range(1, int(r)):
            c.px(int(cx + math.cos(a) * i), int(cy + math.sin(a) * i), "f")
    c.px(int(cx), int(cy), "K")


def wheel_edge(c: Cv, x: int, y0: int, y1: int, frame: int) -> None:
    """A wheel seen end on, its spokes ticking past as it turns."""
    for y in range(y0, y1 + 1):
        c.px(x, y, "j")
        c.px(x + 1, y, "g")
    c.px(x, y0 + (frame % 2) * 2 + 2, "f")
    c.px(x + 1, y0 + ((frame + 1) % 2) * 2 + 5, "f")


def arch(c: Cv, x0: int, x1: int, top: int, bottom: int, ch: str = "C") -> None:
    for x in range(x0, x1 + 1):
        t = (x - x0) / (x1 - x0)
        lift = round(4 * (1 - (2 * t - 1) ** 2) ** 0.5)
        for y in range(top + 4 - lift, bottom + 1):
            c.px(x, y, ch)


def lamp(c: Cv, x: int, y: int) -> None:
    """A carriage lantern: a cap, two panes of glass and a foot, hung at a corner."""
    paint(c, x, y, ["KK", "YO", "OY", "KK"])


def wagon_side(frame: int) -> list[str]:
    c = Cv(54, 34)
    x0, x1, top, bottom = 2, 24, 8, 19
    for x in range(x0, x1 + 1):
        t = (x - x0) / (x1 - x0)
        lift = round(2.5 * (1 - (2 * t - 1) ** 2) ** 0.5)
        for y in range(top - lift, bottom + 1):
            c.px(x, y, "C")
        c.px(x, bottom, "c")
    for hoop in range(x0 + 4, x1 - 1, 6):
        for y in range(top - 3, bottom + 1):
            if c.g[y][hoop] == "C":
                c.px(hoop, y, "c")
    for y in range(top - 1, bottom + 1):
        c.px(x0, y, "c")
        c.px(x1, y, "c")
    paint(c, 23, 11, CARTER_SIDE)
    c.rect(1, 20, 27, 22, "L")
    c.rect(1, 23, 27, 23, "j")
    for x in range(3, 27, 5):
        c.px(x, 21, "j")
    c.rect(26, 21, 34, 21, "j")
    paint(c, 28, 14, horse_side(frame))
    lamp(c, 25, 15)
    lamp(c, 0, 15)
    big_wheel(c, 7, 27.5, 6, frame)
    big_wheel(c, 21.5, 28.5, 5, frame)
    return c.rows()


def wagon_front(frame: int) -> list[str]:
    c = Cv(26, 41)
    arch(c, 2, 23, 1, 17)
    arch(c, 6, 19, 5, 17, "d")
    paint(c, 10, 9, CARTER_FRONT)
    c.rect(1, 18, 24, 21, "L")
    c.rect(1, 21, 24, 21, "j")
    wheel_edge(c, 0, 17, 27, frame)
    wheel_edge(c, 24, 17, 27, frame)
    c.rect(7, 22, 7, 25, "j")
    c.rect(18, 22, 18, 25, "j")
    lamp(c, 2, 14)
    lamp(c, 22, 14)
    paint(c, 7, 20, horse_front(frame))
    return c.rows()


def wagon_back(frame: int) -> list[str]:
    c = Cv(26, 34)
    paint(c, 7, 0, HORSE_BACK)
    arch(c, 2, 23, 3, 21)
    arch(c, 7, 18, 9, 21, "d")
    for x in range(7, 19, 2):
        c.px(x, 9 + round(4 - 4 * (1 - ((x - 7) / 5.5 - 1) ** 2) ** 0.5), "c")
    c.rect(9, 17, 16, 21, "L")
    c.rect(9, 17, 16, 17, "j")
    c.rect(1, 22, 24, 25, "L")
    c.rect(1, 25, 24, 25, "j")
    for x in range(4, 23, 5):
        c.px(x, 23, "j")
    wheel_edge(c, 0, 21, 32, frame)
    wheel_edge(c, 24, 21, 32, frame)
    lamp(c, 3, 18)
    lamp(c, 21, 18)
    return c.rows()


def rider_side(frame: int) -> list[str]:
    c = Cv(26, 29)
    bob = frame % 2
    paint(c, 0, 9, horse_side(frame))
    paint(c, 8, 4 + bob, RIDER_SIDE)
    for y in range(11 + bob, 17 + bob):
        c.px(9, y, "B")
        c.px(10, y, "B")
    c.px(10, 17 + bob, "x")
    c.px(11, 17 + bob, "x")
    return c.rows()


def rider_front(frame: int) -> list[str]:
    c = Cv(12, 30)
    paint(c, 2, 1 + frame % 2, RIDER_FRONT)
    paint(c, 0, 10, horse_front(frame))
    for y in (15, 16):
        c.px(0, y, "B")
        c.px(11, y, "B")
    return c.rows()


def rider_back(frame: int) -> list[str]:
    c = Cv(12, 30)
    paint(c, 0, 10, HORSE_RUMP)
    front_legs(c, frame, 18, 25)
    paint(c, 2, 2 + frame % 2, RIDER_BACK)
    return c.rows()


def steeds() -> dict[str, Image.Image]:
    out: dict[str, Image.Image] = {}
    walks = {
        "wagon": (wagon_side, wagon_front, wagon_back),
        "rider": (rider_side, rider_front, rider_back),
    }
    for name, (side, front, back) in walks.items():
        frames = {}
        for i in range(4):
            frames[f"side-{i}"] = side(i)
            frames[f"down-{i}"] = front(i)
            frames[f"up-{i}"] = back(i)
        # Each view cropped on its own, so a turn never jumps the wheels off the road.
        for view in ("side", "down", "up"):
            for key, image in group({k: v for k, v in frames.items() if k.startswith(view)}).items():
                out[f"{name}-{key}"] = image
    horse = {f"walk-{i}": horse_side(i) for i in range(4)}
    horse["graze"] = horse_side(1, graze=True)
    for key, image in group(horse).items():
        out[f"horse-{key}"] = image
    return out


def extra_frames() -> dict[str, Image.Image]:
    out: dict[str, Image.Image] = {}
    for v, make in TOWNSFOLK.items():
        for name, image in make().items():
            out[f"town-{v}-{name}"] = image
    out.update(animals())
    for name, rows in CARRIED.items():
        out[name] = sprite(rows)
    out["cart-0"], out["cart-1"] = cart(0), cart(1)
    out["boat-0"], out["boat-1"] = boat(0), boat(1)
    out.update(steeds())
    out.update(seafarers())
    return out


# ---------------------------------------------------------------------------
# The sea's own traffic
# ---------------------------------------------------------------------------
#
# What sails past the island on its own, nobody's errand: a sloop with a
# sailor at the tiller, a rowing boat, a log raft poled along under a patched
# square sail, a fisher at anchor with a rod, and far out a two-masted ship.
# Then what floats: a buoy, a barrel, a log, a duck swimming, and the lap of
# water at a hull and the rings a wake leaves. All side on and facing right,
# the renderer flips them, and anchored bottom-centre like everything else,
# the bottom being the water.

SEA = {**ANI, "F": hx(0xEAF6F2), "Q": hx(0xBFE2E0), "v": hx(0x8FC4C6)}


def sea(rows: list[str]) -> Image.Image:
    return draw(rows, SEA)


def line(c: Cv, x0: int, y0: int, x1: int, y1: int, ch: str, every: int = 1) -> None:
    steps = max(abs(x1 - x0), abs(y1 - y0), 1)
    for i in range(0, steps + 1, every):
        c.px(round(x0 + (x1 - x0) * i / steps), round(y0 + (y1 - y0) * i / steps), ch)


def hull(c: Cv, x0: int, x1: int, top: int, bands: str, stern: float, bow: float,
         seams: str = "j") -> None:
    """A hull side on, stern at x0 and bow at x1, its rows coloured by `bands`
    top down; the bow sweeps up a little, and planks show as dark seams."""
    depth = len(bands)
    for r in range(depth):
        a = x0 + round(r * stern)
        b = x1 - round(r * bow)
        ch = bands[r]
        for x in range(a, b + 1):
            c.px(x, top + r, ch)
        if ch in "L" and r % 3 == 2:
            for x in range(a + 2, b - 1, 11):
                c.px(x, top + r, seams)
    for k in range(1, 4):
        for x in range(x1 - 2 * (4 - k), x1 + 1):
            c.px(x, top - k, bands[0] if k == 1 else bands[1])


def sea_frame(width: int, height: int, layers: list) -> Image.Image:
    """Stack a boat's layers, each ringed in the kit's ink on its own so a sail
    reads in front of a mast and a hull in front of whoever sits in it."""
    out = Image.new("RGBA", (width + 2, height + 2), (0, 0, 0, 0))
    for layer in layers:
        if isinstance(layer, Cv):
            out.alpha_composite(draw(outlined(layer.rows()), ANI))
        else:
            image, x, y = layer
            out.alpha_composite(image, (x + 1, y + 1))
    return out


def cropped(frames: dict[str, Image.Image]) -> dict[str, Image.Image]:
    """Every frame of one boat cut to the same box, so the waterline stays put."""
    boxes = [f.getbbox() for f in frames.values() if f.getbbox()]
    x0 = min(b[0] for b in boxes)
    y0 = min(b[1] for b in boxes)
    x1 = max(b[2] for b in boxes)
    y1 = max(b[3] for b in boxes)
    return {k: f.crop((x0, y0, x1, y1)) for k, f in frames.items()}


def seated(rows: list[str]) -> Image.Image:
    return draw(rows)


def rowboat(frame: int) -> Image.Image:
    w, h = 66, 36
    body = Cv(w, h)
    hull(body, 2, 63, 24, "aLLLjLLjB", 0.6, 1.6)
    oars = Cv(w, h)
    bx, by = [(4, 33), (15, 34), (54, 32), (42, 27)][frame]
    line(oars, 34, 22, bx, by, "a")
    line(oars, 35, 22, bx + 1, by, "f")
    oars.rect(bx - 2, by, bx + 2, by + 1, "L")
    return sea_frame(w, h, [(seated(SIT), 27, 3), body, oars])


def sloop(bob: int) -> Image.Image:
    w, h = 100, 112
    d = bob
    rig = Cv(w, h)
    line(rig, 47, 2 + d, 4, 92 + d, "j", 1)
    for y in range(2 + d, 95 + d):
        rig.px(47, y, "j")
        rig.px(48, y, "B")
    rig.rect(49, 2 + d, 60, 4 + d, "R")
    rig.rect(49, 5 + d, 55, 6 + d, "R")
    sail = Cv(w, h)
    for y in range(8 + d, 85 + d):
        t = (y - 8 - d) / 76
        left = round(46 - 38 * t - 3 * (1 - (2 * t - 1) ** 2))
        for x in range(left, 47):
            seam = (y - 8 - d) % 10 == 9
            edge = x <= left + 1
            sail.px(x, y, "c" if seam or edge or x == 46 else "C")
    sail.rect(5, 85 + d, 48, 86 + d, "j")
    for y in range(12 + d, 87 + d):
        right = 49 + round((y - 12 - d) * 41 / 80)
        for x in range(50, right + 1):
            sail.px(x, y, "w" if x >= right - 1 or (y - d) % 10 == 0 else "W")
    body = Cv(w, h)
    hull(body, 2, 96, 93 + d, "aLRRLLjLLjBB", 0.5, 2.6)
    return sea_frame(w, h, [rig, sail, (seated(SIT), 12, 73 + d), body])


def raft(frame: int) -> Image.Image:
    w, h = 76, 70
    lean = frame
    rig = Cv(w, h)
    for y in range(8, 56):
        rig.px(29, y, "L")
        rig.px(30, y, "j")
    rig.rect(9, 9, 50, 10, "j")
    for y in range(11, 42):
        for x in range(10 + (y > 30) * lean, 50 - (y < 18) * lean):
            rig.px(x, y, "C" if (x * 3 + y) % 13 else "c")
    rig.rect(13, 15, 20, 22, "b")
    rig.rect(36, 27, 44, 33, "a")
    for x in range(10, 50, 3):
        rig.px(x, 41, "c")
    pole = Cv(w, h)
    line(pole, 66 - lean, 14, 72 + lean, 69, "j")
    deck = Cv(w, h)
    deck.rect(3, 47, 13, 55, "L")
    deck.rect(3, 50, 13, 51, "j")
    deck.rect(1, 56, 72, 57, "L")
    deck.rect(1, 58, 72, 62, "j")
    for x in range(3, 72, 6):
        deck.rect(x, 58, x + 3, 61, "B")
        deck.rect(x + 1, 59, x + 2, 60, "a")
    deck.rect(12, 56, 13, 62, "t")
    deck.rect(56, 56, 57, 62, "t")
    poler = TOWNSFOLK["g"]()["front-0"]
    return sea_frame(w, h, [rig, (poler, 52, 29), pole, deck])


def fisher(frame: int) -> Image.Image:
    w, h = 74, 52
    rod = Cv(w, h)
    tip = (58, 3) if frame == 0 else (59, 9)
    line(rod, 30, 30, tip[0], tip[1], "j")
    end = (72, 50) if frame == 0 else (68, 50)
    line(rod, tip[0], tip[1], end[0], end[1], "w", 2 - frame)
    body = Cv(w, h)
    body.rect(36, 34, 41, 39, "I")
    body.rect(36, 34, 41, 35, "i")
    hull(body, 2, 60, 40, "aSSsSsB", 0.6, 1.6, "s")
    return sea_frame(w, h, [rod, (seated(SIT), 16, 18), body])


def ship(bob: int) -> Image.Image:
    w, h = 184, 170
    d = bob
    shrouds = Cv(w, h)
    for m, top in ((70, 6), (116, 16)):
        for foot in (m - 26, m + 26):
            line(shrouds, m, top + d, foot, 126 + d, "j", 2)
    line(shrouds, 70, 6 + d, 12, 112 + d, "j")
    masts = Cv(w, h)
    for m, top in ((70, 4), (116, 14)):
        for y in range(top + d, 128 + d):
            masts.px(m, y, "j")
            masts.px(m + 1, y, "B")
    masts.rect(72, 2 + d, 86, 6 + d, "R")
    masts.rect(118, 12 + d, 130, 16 + d, "R")
    sails = Cv(w, h)
    tiers = [
        (70, 12, 40, 20), (70, 46, 96, 30),
        (116, 22, 48, 17), (116, 54, 98, 26),
    ]
    for i, (m, y0, y1, half) in enumerate(tiers):
        sails.rect(m - half - 2, y0 + d - 2, m + half + 2, y0 + d - 1, "j")
        for y in range(y0 + d, y1 + d):
            t = (y - y0 - d) / max(1, y1 - y0)
            belly = round(3 * (1 - (2 * t - 1) ** 2))
            lo, hi = m - half - belly, m + half + belly
            for x in range(lo, hi + 1):
                band = i % 2 == 1 and abs(y - d - (y0 + y1) / 2) < 4
                edge = x in (lo, hi) or (y - y0 - d) % 9 == 8
                sails.px(x, y, "R" if band else ("c" if edge else "C"))
    for y in range(24 + d, 104 + d):
        right = 118 + round((y - 24 - d) * 0.62)
        for x in range(146, min(right, 176) + 1):
            sails.px(x, y, "w" if x >= right - 1 else "W")
    crew = [(TOWNSFOLK["e"]()["front-0"], 18, 86 + d), (TOWNSFOLK["f"]()["back-0"], 132, 92 + d)]
    body = Cv(w, h)
    line(body, 158, 118 + d, 182, 100 + d, "j")
    line(body, 158, 119 + d, 182, 101 + d, "B")
    body.rect(4, 106 + d, 44, 124 + d, "L")
    body.rect(4, 106 + d, 44, 107 + d, "a")
    for x in range(8, 42, 7):
        body.rect(x, 112 + d, x + 2, 114 + d, "x")
    body.rect(126, 112 + d, 156, 124 + d, "L")
    body.rect(126, 112 + d, 156, 113 + d, "a")
    hull(body, 2, 166, 124 + d, "aaLLjLLCCCLLjLLjBBBjj", 0.3, 1.9)
    for x in range(10, 150, 13):
        body.rect(x, 132 + d, x + 3, 134 + d, "x")
    return sea_frame(w, h, [shrouds, masts, sails, *crew, body])


def buoy(tilt: int) -> list[str]:
    c = Cv(16, 28)
    c.px(7 + tilt, 0, "i")
    line(c, 5 + tilt, 1, 5 + tilt, 6, "i")
    line(c, 9 + tilt, 1, 9 + tilt, 6, "i")
    c.rect(6 + tilt, 2, 8 + tilt, 5, "Y")
    for y in range(7, 25):
        half = 2 + (y - 7) * 5 // 17
        cx = 7 + (tilt if y < 15 else 0)
        for x in range(cx - half, cx + half + 1):
            c.px(x, y, "R" if ((y - 7) // 5) % 2 == 0 else "W")
    c.rect(1, 25, 13, 27, "j")
    return c.rows()


BARREL = [
    ["..LLjLLLLLLLjLL..", ".LLLjLLLLLLLjLLL.", "LLLLjLLLLLLLjLLLL", "LaaajaaaaaaajaaaL", "jjjjjjjjjjjjjjjjj"],
    [".LLLjLLLLLLLjLLL.", "LLLLjLLLLLLLjLLLL", "LLLLjLLLLLLLjLLLL", "LaaajaaaaaaajaaaL", "jjjjjjjjjjjjjjjjj"],
]
DRIFT = [
    ["....B...........................", "...BB.....................b.....",
     "..BbBBBBBBBBBBBBBBBBBBBBBBBBBB..", ".BBBBbBBBBBBBBBbBBBBBBBBBBBBBBB.", "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"],
    [".....B..........................", "....BB....................b.....",
     "..BbBBBBBBBBBBBBBBBBBBBBBBBBBB..", ".BBBBBBBBbBBBBBBBBBBBBbBBBBBBBB.", "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"],
]
DUCK_SWIM = [["...GG.", "...GeY", "bbbbW.", "BbbbB."], ["......", "...GG.", "bbbGeY", "BbbbB."]]


def lap(width: int, frame: int) -> list[str]:
    """The water lapping at a hull: a row of foam with gaps that walk."""
    row1 = "".join("F" if (x + frame * 2) % 5 else "." for x in range(width))
    row2 = "".join("Q" if (x + frame * 3) % 4 == 0 else "." for x in range(width + 4))
    return ["." * 2 + row1 + "." * 2, row2]


def ring(radius: int) -> list[str]:
    """One ring of a wake, squashed because the sea is seen from above and south."""
    w, h = radius * 2 + 1, max(3, radius + 1)
    rows = []
    for y in range(h):
        line = ""
        for x in range(w):
            dx = (x - radius) / radius
            dy = (y - (h - 1) / 2) / ((h - 1) / 2)
            r = (dx * dx + dy * dy) ** 0.5
            line += "F" if abs(r - 1) < 0.28 and (x + y) % 3 else "."
        rows.append(line)
    return rows


def seafarers() -> dict[str, Image.Image]:
    out: dict[str, Image.Image] = {}

    def add(prefix, frames):
        for name, image in group(frames).items():
            out[f"{prefix}-{name}"] = image

    def boat(prefix, frames):
        for name, image in cropped(frames).items():
            out[f"{prefix}-{name}"] = image

    boat("sloop", {str(i): sloop(i) for i in range(2)})
    boat("row", {str(i): rowboat(i) for i in range(4)})
    boat("raft", {str(i): raft(i) for i in range(2)})
    boat("fisher", {str(i): fisher(i) for i in range(2)})
    boat("ship", {str(i): ship(i) for i in range(2)})
    add("buoy", {str(i): buoy(i) for i in range(2)})
    add("barrel", {str(i): rows for i, rows in enumerate(BARREL)})
    add("drift", {str(i): rows for i, rows in enumerate(DRIFT)})
    add("duck-swim", {str(i): rows for i, rows in enumerate(DUCK_SWIM)})
    for kind in ("sloop", "row", "raft", "fisher", "ship"):
        width = out[f"{kind}-0"].width - 4
        for i in range(2):
            out[f"lap-{kind}-{i}"] = sea(lap(width, i))
    for i, radius in enumerate((3, 5, 7, 9)):
        out[f"ring-{i}"] = sea(ring(radius))
    return out


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
    frames.update(extra_frames())

    pad = 1
    limit = 2048
    placed: list[tuple[str, Image.Image, int, int]] = []
    x = y = pad
    row_h = 0
    for name, image in frames.items():
        if x + image.width + pad > limit:
            x, y, row_h = pad, y + row_h + pad, 0
        placed.append((name, image, x, y))
        x += image.width + pad
        row_h = max(row_h, image.height)
    width = max(px + image.width for _, image, px, _ in placed) + pad
    height = y + row_h + pad
    sheet = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    meta: dict[str, dict] = {}
    for name, image, px, py in placed:
        sheet.alpha_composite(image, (px, py))
        meta[name] = {
            "frame": {"x": px, "y": py, "w": image.width, "h": image.height},
            "sourceSize": {"w": image.width, "h": image.height},
            "spriteSourceSize": {"x": 0, "y": 0, "w": image.width, "h": image.height},
            "rotated": False,
            "trimmed": False,
        }

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
