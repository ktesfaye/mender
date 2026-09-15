"""Turns the icon's source picture into the icns macOS wants.

The icon is a picture of the village, because that is what the app is. It is
not drawn here: `build/icon-source.png` is a square cut out of the island as
the app's own renderer draws it, a house with its fence and its trees and the
coast meeting the water in one corner. Drawing an icon a second way, out of
the same kit but by different rules, would give you something that looks
almost like the app and not quite, which is worse than no icon.

To make a new one: open the village, take a screenshot of the island at a
district you like, cut a square out of it, and save it over icon-source.png.
Three hundred pixels or so is the size that still reads in a dock.

Run from apps/mender: python3 tools/make-icon.py
"""

import pathlib
import subprocess

from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent.parent
OUT = HERE / 'build'
SOURCE = OUT / 'icon-source.png'

# macOS draws an icon inside a rounded square and every other app in the dock
# leaves air around itself; a tenth on each side is what that looks like.
SIDE = 1024
AIR = 88


def main() -> None:
    village = Image.open(SOURCE).convert('RGBA')
    room = SIDE - AIR * 2
    art = village.resize((room, room), Image.LANCZOS)

    icon = Image.new('RGBA', (SIDE, SIDE), (0, 0, 0, 0))
    icon.alpha_composite(art, (AIR, AIR))
    icon.save(OUT / 'icon.png')

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
