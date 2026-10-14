"""Draws the app's icon and turns it into the icns macOS wants.

The icon is the campfire, lit, at night: the one thing on the island before
anything else is, and the shape that still reads at dock size. The stones and
logs are the kit's own "Campfire 01 Lit", out of the packed kit, so it is the
same fire the village draws; only the flame, the sparks and the light it
throws are drawn here, because the kit leaves those to the renderer. It used
to be a square cut out of the island, which was true to the app and turned to
brown mush beside every other icon in the dock.

Everything is drawn at the kit's own pixel size and blown up whole, then cut
into the smooth rounded square every other icon sits in. `icon-source.png`
is the same picture small, for the thumbnail a file dragged out carries.

Run from apps/mender: python3 tools/make-icon.py
"""

import json
import math
import pathlib
import subprocess

from PIL import Image, ImageDraw

HERE = pathlib.Path(__file__).resolve().parent.parent
OUT = HERE / 'build'
KIT = HERE / 'assets' / 'kit'
FIRE = 'props/TX Village Props - Campfire 01 Lit.png'

SIDE = 1024
TILE = 824
CORNER = 185
SCALE = 9

BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]

FLAME = [
    '......o.......',
    '.....oo.......',
    '.....oyo...o..',
    '....oyyo..oo..',
    '...oyyyoo.o...',
    '...oyyyyoo....',
    '..ooyyhyyo..o.',
    '..oyyhhhyoooo.',
    '.ooyhhhhhyyo..',
    '.oyyhhwhhhyo..',
    'ooyhhwwwhhyoo.',
    'oyyhhwwwhhyyo.',
    'oyyhhwwwhhyo..',
    '.oyyhhwhhyyo..',
    '..oyyyhyyyo...',
    '...ooyyyoo....',
]


def hx(h):
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4)) + (255,)


FLAME_INK = {'o': hx('d9542a'), 'y': hx('f08a2e'), 'h': hx('f8c24e'), 'w': hx('fff0b0')}
SPARK = hx('ffcf6a')


def kit_sprite(name):
    sheet = json.loads((KIT / 'kit-0.json').read_text())
    f = sheet['frames'][name]['frame']
    art = Image.open(KIT / 'kit-0.png').convert('RGBA')
    return art.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h']))


def draw():
    w = TILE // SCALE + 1
    im = Image.new('RGBA', (w, w))
    d = ImageDraw.Draw(im)
    top, bot = hx('101a20'), hx('1a2a22')
    for y in range(w):
        t = y / (w - 1)
        d.line([(0, y), (w, y)], fill=tuple(int(top[i] * (1 - t) + bot[i] * t) for i in range(3)))

    fire = kit_sprite(FIRE)
    fx, fy = (w - fire.width) // 2, w // 2 + 2

    # The light it throws, dithered on the art's own grid rather than smoothed.
    light, px = hx('f2a540'), im.load()
    cx, cy, r = w // 2, fy + 6, w * 0.62
    for y in range(w):
        for x in range(w):
            dist = math.hypot(x - cx, y - cy) / r
            if dist < 1:
                a = (1 - dist) ** 1.5 * 0.55
                if a < BAYER[y % 4][x % 4] / 16 * 0.3:
                    a *= 0.35
                o = px[x, y]
                px[x, y] = tuple(int(o[i] * (1 - a) + light[i] * a) for i in range(3)) + (255,)

    im.alpha_composite(fire, (fx, fy))
    for j, row in enumerate(FLAME):
        for i, ch in enumerate(row):
            if ch in FLAME_INK:
                im.putpixel((w // 2 - 7 + i, fy - 9 + j), FLAME_INK[ch])
    for x, y in [(5, -16), (-4, -22), (2, -28), (-8, -14)]:
        im.putpixel((w // 2 + x, fy + y), SPARK)

    return im.resize((w * SCALE, w * SCALE), Image.NEAREST).crop((0, 0, TILE, TILE))


def main() -> None:
    art = draw()

    # The rounded square, drawn big and brought down so its edge is smooth.
    big = Image.new('L', (TILE * 4, TILE * 4), 0)
    ImageDraw.Draw(big).rounded_rectangle(
        (0, 0, TILE * 4 - 1, TILE * 4 - 1), radius=CORNER * 4, fill=255
    )
    art.putalpha(big.resize((TILE, TILE), Image.LANCZOS))

    icon = Image.new('RGBA', (SIDE, SIDE), (0, 0, 0, 0))
    edge = (SIDE - TILE) // 2
    icon.alpha_composite(art, (edge, edge))
    icon.save(OUT / 'icon.png')
    icon.resize((256, 256), Image.LANCZOS).save(OUT / 'icon-source.png')

    iconset = OUT / 'icon.iconset'
    iconset.mkdir(parents=True, exist_ok=True)
    for size in (16, 32, 128, 256, 512):
        icon.resize((size, size), Image.LANCZOS).save(iconset / f'icon_{size}x{size}.png')
        icon.resize((size * 2, size * 2), Image.LANCZOS).save(
            iconset / f'icon_{size}x{size}@2x.png'
        )
    subprocess.run(
        ['iconutil', '-c', 'icns', str(iconset), '-o', str(OUT / 'icon.icns')], check=True
    )
    print('wrote', OUT / 'icon.icns')


if __name__ == '__main__':
    main()
